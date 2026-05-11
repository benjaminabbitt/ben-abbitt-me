/**
 * Shared helpers for the dish-count infrastructure. Used by both the
 * `<DishCount />` Astro component (body prose) and the `renderExcerpt`
 * helper (frontmatter-templated listing excerpts).
 */

const WORDS = [
	"zero", "one", "two", "three", "four", "five",
	"six", "seven", "eight", "nine", "ten",
	"eleven", "twelve", "thirteen", "fourteen", "fifteen",
	"sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];

/**
 * Render a count as a spelled-out word for 0-20, otherwise as digits.
 * Capitalize the first letter when `capitalize` is true (sentence start).
 */
export function spellCount(n: number, capitalize = false): string {
	const valid = typeof n === "number" && Number.isFinite(n) && n >= 0;
	const word = valid && n <= 20 ? (WORDS[n] ?? String(n)) : String(n);
	if (!capitalize) return word;
	return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Count `\{.dish\}` markers in a raw MDX body. Matches what the
 * remark-dish-count plugin marks for class injection but operates on the
 * literal source rather than the parsed AST. Useful for listings that
 * need the count without rendering the post (where Astro content
 * collections don't propagate remark-mutated frontmatter to `.data`).
 *
 * Matches headings of any depth (`# ` through `###### `). Pattern posts
 * use H2 for dish entries; per-city posts use H3.
 */
const MARKER_RE = /^\s{0,3}#{1,6} .+? \\\{\.dish\\\}\s*$/;
export function countDishesInBody(body: string | undefined | null): number {
	if (!body) return 0;
	let n = 0;
	for (const line of body.split("\n")) {
		if (MARKER_RE.test(line)) n++;
	}
	return n;
}

/**
 * Excerpt resolver. Resolution order:
 *   1. If the post has `excerptTemplate`, substitute `{count}` / `{Count}`
 *      using the dish count. Count comes from `data.dishCount` if present,
 *      otherwise from scanning `body` for the dish-marker pattern.
 *   2. Else return the literal `excerpt` if set.
 *   3. Else fall back to `description`.
 */
export function renderExcerpt(
	data: {
		excerpt?: string;
		excerptTemplate?: string;
		description?: string;
		dishCount?: number;
	},
	body?: string | null,
): string | undefined {
	if (data.excerptTemplate) {
		const count =
			typeof data.dishCount === "number" ? data.dishCount : countDishesInBody(body);
		return data.excerptTemplate
			.replace(/\{count\}/g, spellCount(count))
			.replace(/\{Count\}/g, spellCount(count, true));
	}
	return data.excerpt ?? data.description;
}
