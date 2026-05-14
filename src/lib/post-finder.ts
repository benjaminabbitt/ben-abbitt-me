// Client-side find-it logic for the PostFinder component.
//
// Reads the inline manifest + allTags JSON, parses the input grammar
// (#tag / -#tag / #a|#b / plain text), syncs to URL ?p= + ?s= params,
// and shows/hides post rows in [data-q-feed] based on the result.
//
// Runs once per page; uses data-q-* selectors scoped to a single
// PostFinder instance.

import { evaluate, parse } from "@/lib/tagfs";

type ManifestItem = {
	id: string;
	tags: string[];
	publishedAt: number;
	text: string;
};

type ParsedInput = {
	segments: string[];
	search: string;
	activeTokens: { kind: "tag" | "not" | "or" | "text"; value: string }[];
};

// Parse the smart-input string into URL state + a token list for display.
// Grammar:
//   #tag           → AND tag
//   -#tag, !#tag   → AND NOT tag
//   -tag,  !tag    → AND NOT tag (bare form)
//   #a|#b          → tag OR group (any number of |-joined tags)
//   plain word     → text search (multi-word: AND substring)
function parseInput(input: string): ParsedInput {
	const tokens = input.trim().split(/\s+/).filter(Boolean);
	const segments: string[] = [];
	const searchWords: string[] = [];
	const activeTokens: ParsedInput["activeTokens"] = [];

	for (const tok of tokens) {
		if (tok.startsWith("-#") || tok.startsWith("!#")) {
			const tag = tok.slice(2).toLowerCase();
			if (tag) {
				segments.push(tag, "not");
				activeTokens.push({ kind: "not", value: tag });
			}
		} else if (
			(tok.startsWith("-") || tok.startsWith("!")) &&
			tok.length > 1 &&
			!tok.includes("#")
		) {
			const tag = tok.slice(1).toLowerCase();
			if (tag) {
				segments.push(tag, "not");
				activeTokens.push({ kind: "not", value: tag });
			}
		} else if (tok.startsWith("#")) {
			const orParts = tok
				.split("|")
				.map((p) => p.replace(/^#/, "").toLowerCase())
				.filter(Boolean);
			if (orParts.length === 1) {
				const first = orParts[0] as string;
				segments.push(first);
				activeTokens.push({ kind: "tag", value: first });
			} else if (orParts.length > 1) {
				const first = orParts[0] as string;
				segments.push(first);
				for (let i = 1; i < orParts.length; i++) {
					segments.push(orParts[i] as string, "or");
				}
				activeTokens.push({ kind: "or", value: orParts.join("|") });
			}
		} else {
			searchWords.push(tok);
		}
	}

	const search = searchWords.join(" ");
	if (search) activeTokens.push({ kind: "text", value: search });
	return { segments, search, activeTokens };
}

// Format URL state back into a smart-input string. Walks postfix-RPN
// segments to reconstruct fragments; falls back to space-joining any
// remaining stack as implicit AND.
function formatInput(segments: string[], search: string): string {
	const stack: string[] = [];
	for (const seg of segments) {
		const lower = seg.toLowerCase();
		if (lower === "and") {
			if (stack.length >= 2) {
				const b = stack.pop() as string;
				const a = stack.pop() as string;
				stack.push(`${a} ${b}`);
			}
		} else if (lower === "or") {
			if (stack.length >= 2) {
				const b = stack.pop() as string;
				const a = stack.pop() as string;
				stack.push(`${a}|${b}`);
			}
		} else if (lower === "not") {
			if (stack.length >= 1) {
				const a = stack.pop() as string;
				stack.push(a.startsWith("#") ? `-${a}` : `-(${a})`);
			}
		} else {
			stack.push(`#${seg}`);
		}
	}
	const tagPart = stack.join(" ");
	return [tagPart, search].filter(Boolean).join(" ");
}

function readURLState(): { segments: string[]; search: string } {
	const url = new URL(window.location.href);
	const pParam = url.searchParams.get("p") ?? "";
	const sParam = url.searchParams.get("s") ?? "";
	const segments = decodeURIComponent(pParam)
		.replace(/^\/+/, "")
		.replace(/\/+$/, "")
		.split("/")
		.filter(Boolean);
	return { segments, search: sParam.trim().toLowerCase() };
}

function writeURLState(segments: string[], search: string): void {
	const url = new URL(window.location.href);
	const trimmed = search.trim();
	if (segments.length > 0) url.searchParams.set("p", segments.join("/"));
	else url.searchParams.delete("p");
	if (trimmed) url.searchParams.set("s", trimmed);
	else url.searchParams.delete("s");
	window.history.replaceState(null, "", url.toString());
}

function renderActive(tokens: ParsedInput["activeTokens"], listEl: HTMLElement): void {
	listEl.textContent = "";
	const parts: string[] = [];
	for (const tok of tokens) {
		if (tok.kind === "tag") parts.push(`#${tok.value}`);
		else if (tok.kind === "not") parts.push(`-#${tok.value}`);
		else if (tok.kind === "or") parts.push(tok.value);
		else if (tok.kind === "text") parts.push(`"${tok.value}"`);
	}
	listEl.textContent = `${tokens.length} active: ${parts.join(" · ")}`;
}

export function initPostFinder(): void {
	const manifestEl = document.querySelector<HTMLScriptElement>("[data-q-manifest]");
	const tagsEl = document.querySelector<HTMLScriptElement>("[data-q-tags]");
	if (!manifestEl || !tagsEl) {
		throw new Error("PostFinder is missing its manifest");
	}
	const manifest: ManifestItem[] = JSON.parse(manifestEl.textContent ?? "[]");
	const allTags: string[] = JSON.parse(tagsEl.textContent ?? "[]");
	const allTagSet = new Set(allTags);

	// Default header copy from server-rendered fields, used when filter resets.
	const titleEl = document.querySelector<HTMLElement>("[data-q-title]");
	const kickerEl = document.querySelector<HTMLElement>("[data-q-kicker]");
	const defaultTitle = titleEl?.textContent ?? "All posts";
	const defaultKicker = kickerEl?.textContent ?? "Posts";
	const defaultDocTitle = document.title;

	function applyQuery(): void {
		const { segments, search } = readURLState();
		const isEmpty = segments.length === 0;
		const filtered = !isEmpty || !!search;

		let matchedIds: Set<string>;
		let description = defaultTitle;
		let kicker = defaultKicker;

		if (isEmpty) {
			matchedIds = new Set(manifest.map((m) => m.id));
		} else {
			kicker = "Tag query";
			const tokens = parse(segments);
			const result = evaluate(tokens, manifest, (m) => m.tags);
			if (!result.ok) {
				description = "Invalid query";
				matchedIds = new Set();
			} else {
				description = result.description || defaultTitle;
				matchedIds = new Set(result.items.map((m) => m.id));
			}
		}

		if (search) {
			const filteredIds = new Set<string>();
			for (const m of manifest) {
				if (matchedIds.has(m.id) && m.text.includes(search)) {
					filteredIds.add(m.id);
				}
			}
			matchedIds = filteredIds;
			if (isEmpty) {
				kicker = "Search";
				description = `Search: "${search}"`;
			} else {
				description = `${description} · "${search}"`;
			}
		}

		// Drop entries whose publishDate is still in the future per the client
		// clock. `scheduled` posts ship in the manifest so they can flip in
		// without a rebuild; the build doesn't know the visitor's current time.
		const now = Date.now();
		for (const m of manifest) {
			if (m.publishedAt > now) matchedIds.delete(m.id);
		}

		let visibleCount = 0;
		const rows = document.querySelectorAll<HTMLElement>("[data-q-feed] [data-post-id]");
		for (const row of rows) {
			const id = row.dataset.postId ?? "";
			if (matchedIds.has(id)) {
				row.removeAttribute("hidden");
				visibleCount++;
			} else {
				row.setAttribute("hidden", "");
			}
		}

		const heroEl = document.querySelector<HTMLElement>("[data-q-hero]");
		const headerEl = document.querySelector<HTMLElement>("[data-q-header]");
		const countEl = document.querySelector<HTMLElement>("[data-q-count]");
		const nounEl = document.querySelector<HTMLElement>("[data-q-noun]");
		const emptyEl = document.querySelector<HTMLElement>("[data-q-empty]");
		const feedLabel = document.querySelector<HTMLElement>("[data-q-feed-label]");
		const clearBtn = document.querySelector<HTMLElement>("[data-q-clear]");
		const activeWrap = document.querySelector<HTMLElement>("[data-q-active]");
		const activeList = document.querySelector<HTMLElement>("[data-q-active-list]");

		if (heroEl) {
			if (filtered) heroEl.setAttribute("hidden", "");
			else heroEl.removeAttribute("hidden");
		}
		if (headerEl) {
			if (filtered) headerEl.removeAttribute("hidden");
			else headerEl.setAttribute("hidden", "");
		}
		if (feedLabel) {
			if (filtered) feedLabel.setAttribute("hidden", "");
			else feedLabel.removeAttribute("hidden");
		}
		if (titleEl) titleEl.textContent = description;
		if (kickerEl) kickerEl.textContent = kicker;
		if (countEl) countEl.textContent = String(visibleCount);
		if (nounEl) nounEl.textContent = visibleCount === 1 ? "post" : "posts";
		if (emptyEl) {
			if (visibleCount === 0 && filtered) emptyEl.removeAttribute("hidden");
			else emptyEl.setAttribute("hidden", "");
		}
		if (clearBtn) {
			if (filtered) clearBtn.removeAttribute("hidden");
			else clearBtn.setAttribute("hidden", "");
		}

		// Active-tokens summary line, derived from current input
		const inputEl = document.querySelector<HTMLInputElement>("[data-q-input]");
		const inputVal = inputEl?.value ?? "";
		const parsed = parseInput(inputVal);
		if (activeWrap && activeList) {
			if (parsed.activeTokens.length > 0) {
				renderActive(parsed.activeTokens, activeList);
				activeWrap.removeAttribute("hidden");
			} else {
				activeList.textContent = "";
				activeWrap.setAttribute("hidden", "");
			}
		}

		// Tag chips: highlight active tags
		const activeTagSet = new Set(
			segments.filter((s) => allTagSet.has(s.toLowerCase())).map((s) => s.toLowerCase()),
		);
		for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-q-tag]")) {
			const t = btn.dataset.qTag ?? "";
			if (activeTagSet.has(t)) {
				btn.classList.add("text-accent");
				btn.classList.remove("text-fg-dim");
			} else {
				btn.classList.add("text-fg-dim");
				btn.classList.remove("text-accent");
			}
		}

		document.title = filtered ? `${description} · Reduction` : defaultDocTitle;
	}

	function syncFromInput(value: string): void {
		const { segments, search } = parseInput(value);
		writeURLState(segments, search);
		applyQuery();
	}

	function syncToInput(): void {
		const { segments, search } = readURLState();
		const inputEl = document.querySelector<HTMLInputElement>("[data-q-input]");
		if (inputEl) inputEl.value = formatInput(segments, search);
	}

	// Initialize input from URL, then wire events
	syncToInput();

	const inputEl = document.querySelector<HTMLInputElement>("[data-q-input]");
	if (inputEl) {
		inputEl.addEventListener("input", () => {
			syncFromInput(inputEl.value);
		});
	}

	const clearBtn = document.querySelector<HTMLElement>("[data-q-clear]");
	if (clearBtn) {
		clearBtn.addEventListener("click", () => {
			if (inputEl) inputEl.value = "";
			writeURLState([], "");
			applyQuery();
			inputEl?.focus();
		});
	}

	// Click a tag chip → append (or remove if already present) #tag in the input
	for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-q-tag]")) {
		btn.addEventListener("click", () => {
			if (!inputEl) return;
			const tag = btn.dataset.qTag ?? "";
			if (!tag) return;
			const current = inputEl.value;
			const tokens = current.trim().split(/\s+/).filter(Boolean);
			const presentIdx = tokens.findIndex((t) => t.toLowerCase() === `#${tag}`);
			if (presentIdx >= 0) {
				tokens.splice(presentIdx, 1);
			} else {
				tokens.push(`#${tag}`);
			}
			inputEl.value = tokens.join(" ");
			syncFromInput(inputEl.value);
			inputEl.focus();
		});
	}

	applyQuery();
}
