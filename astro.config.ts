import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import robotsTxt from "astro-robots-txt";
import remarkDishCount from "./src/lib/remark-dish-count";
import { siteConfig } from "./src/site.config";

// Drafts (`visibility: draft`) get a built page so the URL is shareable, but
// must be excluded from sitemap.xml so they aren't advertised to crawlers.
const DRAFT_FRONTMATTER = /^visibility:\s*['"]?draft['"]?\s*$/m;
function findDraftSitemapUrls(): Set<string> {
	const urls = new Set<string>();
	const baseUrl = siteConfig.url.replace(/\/$/, "");
	const scan = (collection: string) => {
		const root = `src/content/${collection}`;
		const walk = (dir: string) => {
			let entries: string[];
			try {
				entries = readdirSync(dir);
			} catch {
				return;
			}
			for (const entry of entries) {
				const full = join(dir, entry);
				if (statSync(full).isDirectory()) {
					walk(full);
					continue;
				}
				if (!/\.(md|mdx)$/.test(entry)) continue;
				const fm = readFileSync(full, "utf8").match(/^---\n([\s\S]*?)\n---/);
				if (!fm || !DRAFT_FRONTMATTER.test(fm[1] ?? "")) continue;
				const slug = full
					.slice(root.length + 1)
					.replace(/\.(md|mdx)$/, "")
					.replace(/\/index$/, "");
				urls.add(`${baseUrl}/${collection}/${slug}/`);
			}
		};
		walk(root);
	};
	scan("posts");
	scan("forage");
	return urls;
}
const normalizeUrl = (u: string) => u.replace(/\/$/, "");
const draftSitemapPaths = new Set([...findDraftSitemapUrls()].map(normalizeUrl));

export default defineConfig({
	site: siteConfig.url,
	devToolbar: { enabled: false },
	integrations: [
		mdx(),
		sitemap({ filter: (page) => !draftSitemapPaths.has(normalizeUrl(page)) }),
		robotsTxt(),
	],
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
