// Determine each post's "effective update date" for sorting:
//   1. explicit `updatedDate` frontmatter (if present)
//   2. git last-commit timestamp of the post file (computed at build time)
//   3. `publishDate` frontmatter (final fallback)
//
// Git is the load-bearing source of truth here. Frontmatter `updatedDate` exists as
// an override for the case where you want to surface a content edit that wasn't a
// fresh git commit, or you want to manually pin an "updated" date independent of
// file modification history.

import { execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const postsBase = path.join(repoRoot, "src", "content", "posts");

function lastCommitTimeMs(absPath: string): number | null {
	try {
		const out = execSync(
			`git -C ${JSON.stringify(repoRoot)} log -1 --format=%ct -- ${JSON.stringify(absPath)}`,
			{ encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
		).trim();
		if (!out) return null;
		const epochSec = Number.parseInt(out, 10);
		if (!Number.isFinite(epochSec)) return null;
		return epochSec * 1000;
	} catch {
		return null;
	}
}

function fileMtimeMs(absPath: string): number | null {
	try {
		return statSync(absPath).mtimeMs;
	} catch {
		return null;
	}
}

const cache = new Map<string, number | null>();

function mtimeForId(id: string): number | null {
	const cached = cache.get(id);
	if (cached !== undefined) return cached;
	// Astro content collection ids are the path under the collection root with the
	// extension stripped and `/index` removed. So `modern-forage-great-lakes` ↔
	// `src/content/posts/modern-forage-great-lakes/index.mdx` or `.md`, and
	// `my-post` ↔ `src/content/posts/my-post.mdx` etc.
	const candidates = [
		path.join(postsBase, `${id}.mdx`),
		path.join(postsBase, `${id}.md`),
		path.join(postsBase, id, "index.mdx"),
		path.join(postsBase, id, "index.md"),
	];
	for (const candidate of candidates) {
		if (!existsSync(candidate)) continue;
		// Use the more recent of {git last-commit, file mtime}. That way an
		// edited-but-not-yet-committed file surfaces its working-copy mtime
		// (helpful for dev iteration), and a committed-and-unchanged file uses
		// the git timestamp (stable across re-clones).
		const git = lastCommitTimeMs(candidate);
		const fs = fileMtimeMs(candidate);
		const candidates_ts: number[] = [];
		if (git !== null) candidates_ts.push(git);
		if (fs !== null) candidates_ts.push(fs);
		const ts = candidates_ts.length ? Math.max(...candidates_ts) : null;
		cache.set(id, ts);
		return ts;
	}
	cache.set(id, null);
	return null;
}

export type PostLike = {
	id: string;
	data: {
		publishDate: Date;
		updatedDate: Date | undefined;
	};
};

export function effectiveUpdateDate(post: PostLike): Date {
	if (post.data.updatedDate) return post.data.updatedDate;
	const m = mtimeForId(post.id);
	if (m !== null) return new Date(m);
	return post.data.publishDate;
}
