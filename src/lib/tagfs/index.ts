// Tagfs postfix query language evaluator.
// Standalone module: no project imports, no framework dependencies.
// Compatible with the URL grammar of github.com/benjaminabbitt/tagfs.

export type Token =
	| { readonly kind: "tag"; readonly tag: string }
	| { readonly kind: "op"; readonly op: "and" | "or" | "not" };

export const OPERATORS = ["and", "or", "not"] as const;
export type Operator = (typeof OPERATORS)[number];

const OP_SET: ReadonlySet<string> = new Set(OPERATORS);

export function isOperator(s: string): s is Operator {
	return OP_SET.has(s.toLowerCase());
}

export function parse(segments: readonly string[]): Token[] {
	const out: Token[] = [];
	for (const seg of segments) {
		if (!seg) continue;
		const lower = seg.toLowerCase();
		if (isOperator(lower)) out.push({ kind: "op", op: lower });
		else out.push({ kind: "tag", tag: seg });
	}
	return out;
}

export function pathToTokens(path: string): Token[] {
	return parse(path.split("/").filter(Boolean));
}

export function tokensToPath(tokens: readonly Token[]): string {
	return tokens.map((t) => (t.kind === "tag" ? t.tag : t.op)).join("/");
}

export type EvalSuccess<T> = {
	readonly ok: true;
	readonly items: readonly T[];
	readonly description: string;
};

export type EvalFailure = {
	readonly ok: false;
	readonly error: string;
};

export type EvalResult<T> = EvalSuccess<T> | EvalFailure;

type Frame = { readonly ids: ReadonlySet<number>; readonly desc: string };

function intersection(a: ReadonlySet<number>, b: ReadonlySet<number>): Set<number> {
	const out = new Set<number>();
	for (const x of a) if (b.has(x)) out.add(x);
	return out;
}

function union(a: ReadonlySet<number>, b: ReadonlySet<number>): Set<number> {
	const out = new Set<number>(a);
	for (const x of b) out.add(x);
	return out;
}

function complement(universe: ReadonlySet<number>, a: ReadonlySet<number>): Set<number> {
	const out = new Set<number>();
	for (const x of universe) if (!a.has(x)) out.add(x);
	return out;
}

export function evaluate<T>(
	tokens: readonly Token[],
	items: readonly T[],
	getTagsFor: (item: T) => readonly string[],
): EvalResult<T> {
	const byTag = new Map<string, Set<number>>();
	for (const [i, item] of items.entries()) {
		for (const tag of getTagsFor(item)) {
			let set = byTag.get(tag);
			if (!set) {
				set = new Set();
				byTag.set(tag, set);
			}
			set.add(i);
		}
	}
	const universe: ReadonlySet<number> = new Set(items.map((_, i) => i));
	const stack: Frame[] = [];

	for (const tok of tokens) {
		if (tok.kind === "tag") {
			stack.push({
				ids: byTag.get(tok.tag) ?? new Set(),
				desc: `#${tok.tag}`,
			});
			continue;
		}
		if (tok.op === "and") {
			const b = stack.pop();
			const a = stack.pop();
			if (!a || !b) return { ok: false, error: "AND needs 2 operands" };
			stack.push({
				ids: intersection(a.ids, b.ids),
				desc: `(${a.desc} AND ${b.desc})`,
			});
		} else if (tok.op === "or") {
			const b = stack.pop();
			const a = stack.pop();
			if (!a || !b) return { ok: false, error: "OR needs 2 operands" };
			stack.push({
				ids: union(a.ids, b.ids),
				desc: `(${a.desc} OR ${b.desc})`,
			});
		} else if (tok.op === "not") {
			const a = stack.pop();
			if (!a) return { ok: false, error: "NOT needs 1 operand" };
			stack.push({
				ids: complement(universe, a.ids),
				desc: `NOT ${a.desc}`,
			});
		}
	}

	while (stack.length > 1) {
		const b = stack.pop();
		const a = stack.pop();
		if (!a || !b) break;
		stack.push({
			ids: intersection(a.ids, b.ids),
			desc: `${a.desc} AND ${b.desc}`,
		});
	}

	const final = stack.pop();
	if (!final) {
		return { ok: true, items: [], description: "" };
	}

	return {
		ok: true,
		items: items.filter((_, i) => final.ids.has(i)),
		description: final.desc.replace(/^\((.*)\)$/, "$1"),
	};
}
