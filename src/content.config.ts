import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

function removeDupsAndLowerCase(array: string[]) {
	return [...new Set(array.map((str) => str.toLowerCase()))];
}

const titleSchema = z.string().max(60);

const posts = defineCollection({
	loader: glob({
		base: "./src/content/posts",
		pattern: "**/*.{md,mdx}",
		generateId: ({ entry }) =>
			entry.replace(/\.(md|mdx)$/, "").replace(/\/index$/, ""),
	}),
	schema: ({ image }) =>
		z.object({
			title: titleSchema,
			description: z.string(),
			coverImage: z
				.object({
					alt: z.string(),
					src: image(),
				})
				.optional(),
			draft: z.boolean().default(false),
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
			unlisted: z.boolean().default(false),
			marginalia: z.string().optional(),
			excerpt: z.string().optional(),
		}),
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
		extras: z
			.array(z.object({ label: z.string(), href: z.string() }))
			.default([]),
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
		skillGroups: z.array(
			z.object({ label: z.string(), items: z.array(z.string()) }),
		),
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

export const collections = { posts, projects, resume };
