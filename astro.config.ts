import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import robotsTxt from "astro-robots-txt";
import { siteConfig } from "./src/site.config";

export default defineConfig({
	site: siteConfig.url,
	integrations: [mdx(), sitemap(), robotsTxt()],
	redirects: {
		// Old single-post URLs for the Modern Forage geographic survey.
		// Now split into MSA/CBSA-level posts; readers land on the modern-forage tag page.
		"/posts/modern-forage-great-lakes": "/posts/q/modern-forage",
		"/posts/modern-forage-northeast": "/posts/q/modern-forage",
		"/posts/modern-forage-plains-heartland": "/posts/q/modern-forage",
		"/posts/modern-forage-south": "/posts/q/modern-forage",
		"/posts/modern-forage-texas-southwest": "/posts/q/modern-forage",
		"/posts/modern-forage-west-mountain": "/posts/q/modern-forage",
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
