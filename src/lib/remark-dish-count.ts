import type { Heading, Root, Text } from "mdast";
import type { Plugin } from "unified";
import type { VFile } from "vfile";

/**
 * Remark plugin that processes `{.dish}` class-suffix markers on headings:
 *
 *  1. Strips the `{.dish ...}` suffix from the rendered heading text
 *     (including any attribute payload like `{.dish cbsa="32580"}`)
 *  2. Adds `class="dish"` to the heading element (via hProperties)
 *  3. Counts marked headings and writes the total to
 *     `vfile.data.astro.frontmatter.dishCount`
 *
 * The class makes the dish entries selectable for CSS and the count is
 * consumed by `<DishCount />`. The attr payload (cbsa, zone, county, etc.)
 * is parsed downstream by the atlas (`src/pages/forage-atlas.astro`) and
 * the migration script directly off the raw MDX body, because Astro
 * content collections don't propagate remark-mutated frontmatter fields
 * other than the ones each consumer also reads off the body. See
 * `countDishesInBody` in `src/lib/dish-count.ts` for the same pattern.
 *
 * Headings of any depth are eligible. Most city posts use H3 for dish
 * entries; pattern posts (Chinese-American, Greek Diner Empire) use H2 to
 * distinguish themselves from per-city posts.
 *
 * Marker grammar:
 *   `{.dish}`                          minimal form
 *   `{.dish cbsa="32580"}`             per-dish CBSA override (pattern posts)
 *   `{.dish cbsa="..." zone="..."}`    multiple attrs space-separated
 */
const MARKER = /\s*\{\.dish(?:\s+[a-z_]+="[^"]*")*\s*\}\s*$/;

const remarkDishCount: Plugin<[], Root> = () => {
	return (tree: Root, file: VFile) => {
		let count = 0;

		const headings = collectHeadings(tree);
		for (const node of headings) {
			const lastText = lastTextChild(node);
			if (!lastText) continue;
			if (!MARKER.test(lastText.value)) continue;

			lastText.value = lastText.value.replace(MARKER, "");
			addClass(node, "dish");
			count++;
		}

		// Astro's documented hook for remark plugins to extend frontmatter.
		// See https://docs.astro.build/en/guides/markdown-content/#modifying-frontmatter
		const data = (file.data ?? {}) as Record<string, unknown>;
		const astroData = (data.astro ?? {}) as { frontmatter?: Record<string, unknown> };
		astroData.frontmatter = { ...(astroData.frontmatter ?? {}), dishCount: count };
		data.astro = astroData;
		file.data = data;
	};
};

function collectHeadings(tree: Root): Heading[] {
	const out: Heading[] = [];
	function walk(node: { type: string; children?: unknown[] }) {
		if (node.type === "heading") out.push(node as Heading);
		const children = node.children;
		if (Array.isArray(children)) {
			for (const c of children) walk(c as { type: string; children?: unknown[] });
		}
	}
	walk(tree as unknown as { type: string; children?: unknown[] });
	return out;
}

function lastTextChild(heading: Heading): Text | null {
	for (let i = heading.children.length - 1; i >= 0; i--) {
		const child = heading.children[i];
		if (child && (child as { type?: string }).type === "text") {
			return child as Text;
		}
	}
	return null;
}

function addClass(node: Heading, className: string) {
	const data = (node.data ?? {}) as {
		hProperties?: { className?: string[] };
	};
	const hProperties = data.hProperties ?? {};
	const existing = Array.isArray(hProperties.className) ? hProperties.className : [];
	if (!existing.includes(className)) existing.push(className);
	hProperties.className = existing;
	data.hProperties = hProperties;
	node.data = data;
}

export default remarkDishCount;
