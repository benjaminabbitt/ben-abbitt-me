import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import robotsTxt from "astro-robots-txt";
import remarkDishCount from "./src/lib/remark-dish-count";
import { siteConfig } from "./src/site.config";

export default defineConfig({
	site: siteConfig.url,
	integrations: [mdx(), sitemap(), robotsTxt()],
	markdown: {
		remarkPlugins: [remarkDishCount],
	},
	redirects: {
		// Old single-post URLs for the original regional Modern Forage posts.
		// Those got split into per-MSA posts that now live under the `forage`
		// content collection at /forage/{slug}/. Readers land on the atlas.
		"/posts/modern-forage-great-lakes": "/forage-atlas/",
		"/posts/modern-forage-northeast": "/forage-atlas/",
		"/posts/modern-forage-plains-heartland": "/forage-atlas/",
		"/posts/modern-forage-south": "/forage-atlas/",
		"/posts/modern-forage-texas-southwest": "/forage-atlas/",
		"/posts/modern-forage-west-mountain": "/forage-atlas/",
	},
	vite: {
		plugins: [tailwind()],
		server: {
			watch: {
				ignored: ["**/.ctxloom/**", "**/.claude/**", "**/.gemini/**"],
			},
		},
	},
});
