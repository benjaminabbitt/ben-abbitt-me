import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import robotsTxt from "astro-robots-txt";
import { siteConfig } from "./src/site.config";

export default defineConfig({
	site: siteConfig.url,
	integrations: [mdx(), sitemap(), robotsTxt()],
	vite: { plugins: [tailwind()] },
});
