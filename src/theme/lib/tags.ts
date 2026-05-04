export function tagSlug(tag: string): string {
	return tag
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "");
}

export function tagHref(tag: string): string {
	return `/posts/q/${tagSlug(tag)}/`;
}

export const TAG_QUERY_PREFIX = "/posts/q";
