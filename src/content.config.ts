import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

function removeDupsAndLowerCase(array: string[]) {
	return [...new Set(array.map((str) => str.toLowerCase()))];
}

const titleSchema = z.string().max(100);

// Shared schema between the `posts` and `forage` collections. Both are
// long-form MDX with the same frontmatter shape; the only difference is
// where they live and which blog index renders them.
const postLikeSchema = ({ image }: { image: () => z.ZodType }) =>
	z.object({
		title: titleSchema,
		description: z.string(),
		coverImage: z
			.object({
				alt: z.string(),
				src: image(),
			})
			.optional(),
		visibility: z.enum(["published", "draft", "hide"]).default("published"),
		ogImage: z.string().optional(),
		tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
		publishDate: z
			.string()
			.or(z.date())
			.transform((val) => new Date(val)),
		updatedDate: z
			.string()
			.optional()
			.transform((str) => (str ? new Date(str) : undefined)),
		pinned: z.boolean().default(false),
		marginalia: z.string().optional(),
		excerpt: z.string().optional(),
		/**
		 * Excerpt template with `{count}` placeholder, substituted from
		 * `dishCount` (populated by the remark-dish-count plugin). If set,
		 * this takes precedence over the literal `excerpt` field in
		 * listings. Lets the per-MSA Modern Forage excerpts auto-update
		 * when a new dish is added to the post.
		 */
		excerptTemplate: z.string().optional(),
		/**
		 * Auto-populated by `src/lib/remark-dish-count.ts` from H3 markers
		 * (`### Heading \{.dish\}`). Don't set manually; the plugin
		 * overwrites this field on every build.
		 */
		dishCount: z.number().optional(),
		/**
		 * Post-level geographic defaults applied to every dish in the post.
		 * Pattern posts set `pattern: true` and are not pinned to the atlas;
		 * their dishes appear as part of the pattern, not as individual map
		 * entries. Native Obsidian Properties; queryable via Obsidian Bases.
		 */
		geo: z
			.object({
				cbsa: z.string().optional(),
				primary_county: z.string().optional(),
				zones: z.array(z.string()).default([]),
				division: z.string().optional(),
				states: z.array(z.string()).default([]),
				scope: z
					.enum(["city_wide", "regional", "statewide", "hyperlocal"])
					.optional(),
				pattern: z.boolean().default(false),
			})
			.optional(),
		/**
		 * Per-dish overrides keyed by dish name (the heading text before the
		 * em-dash separator on the H3/H2 `{.dish}` heading). Only list the
		 * dishes whose geography diverges from the post-level `geo:` block;
		 * dishes that inherit cleanly need no entry here. Native Obsidian
		 * Properties; queryable via Obsidian Bases. Replaces the older
		 * `{.dish cbsa="..."}` heading-attribute syntax for overrides.
		 */
		dishes: z
			.array(
				z.object({
					name: z.string(),
					cbsa: z.string().optional(),
					primary_county: z.string().optional(),
					zones: z.array(z.string()).optional(),
					division: z.string().optional(),
					states: z.array(z.string()).optional(),
					scope: z
						.enum(["city_wide", "regional", "statewide", "hyperlocal"])
						.optional(),
					pattern: z.boolean().optional(),
				}),
			)
			.optional(),
	});

const posts = defineCollection({
	loader: glob({
		base: "./src/content/posts",
		pattern: "**/*.{md,mdx}",
		generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, "").replace(/\/index$/, ""),
	}),
	schema: postLikeSchema,
});

const forage = defineCollection({
	loader: glob({
		base: "./src/content/forage",
		pattern: "**/*.{md,mdx}",
		generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, "").replace(/\/index$/, ""),
	}),
	schema: postLikeSchema,
});

const projects = defineCollection({
	loader: glob({ base: "./src/content/projects", pattern: "**/*.json" }),
	schema: z.object({
		id: z.string(),
		name: z.string(),
		createdAt: z.string(),
		status: z.string().optional(),
		tagline: z.string(),
		blurb: z.string().optional(),
		stack: z.array(z.string()).default([]),
		site: z.string().nullable().optional(),
		github: z.string().nullable().optional(),
		extras: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
		note: z.string().nullable().optional(),
		order: z.number().optional(),
	}),
});

const resume = defineCollection({
	loader: glob({ base: "./src/content/resume", pattern: "*.json" }),
	schema: z.object({
		intro: z.string(),
		contact: z.object({
			email: z.string().optional(),
			linkedin: z.string().optional(),
			github: z.string().optional(),
			location: z.string().optional(),
		}),
		interests: z.array(z.string()).default([]),
		roles: z.array(
			z.object({
				id: z.string(),
				years: z.string(),
				company: z.string(),
				title: z.string(),
				domain: z.string().optional(),
				bullets: z.array(z.string()).optional(),
				engagements: z
					.array(
						z.object({
							id: z.string(),
							title: z.string(),
							domain: z.string().optional(),
							bullets: z.array(z.string()),
						}),
					)
					.optional(),
				note: z.string().optional(),
			}),
		),
		skillGroups: z.array(z.object({ label: z.string(), items: z.array(z.string()) })),
		certs: z.array(z.string()),
		education: z
			.array(
				z.object({
					school: z.string(),
					degree: z.string(),
					years: z.string().optional(),
				}),
			)
			.default([]),
	}),
});

export const collections = { posts, forage, projects, resume };
