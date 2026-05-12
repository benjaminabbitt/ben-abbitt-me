export function tagSlug(tag: string): string {
	return tag
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "");
}

// Per-blog root URLs for tag-query links. Keep these in sync with the
// listing pages (/index.astro and /forage-atlas.astro).
export const BLOG_ROOT = {
	main: "/",
	forage: "/forage-atlas/",
} as const;

export type BlogId = keyof typeof BLOG_ROOT;

export function tagHrefFor(blog: BlogId, tag: string): string {
	return `${BLOG_ROOT[blog]}?p=${tagSlug(tag)}`;
}

// Convenience exports — one per blog. Use these when the call site
// already knows which blog it's rendering for.
export function tagHref(tag: string): string {
	return tagHrefFor("main", tag);
}

export function tagHrefForage(tag: string): string {
	return tagHrefFor("forage", tag);
}
