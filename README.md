# Reduction

Ben Abbitt's personal site. Software architecture, AI wrangling, cocktails, food, and the things in between, reduced to what's worth keeping.

Live at <https://ben.abbitt.me>.

## Stack

- Astro 6 with MDX
- Tailwind v4
- Biome (lint and format), Prettier (formatting fallback)
- Static output with sitemap and `robots.txt`

## Develop

```bash
npm install
npm run dev      # dev server
npm run check    # astro check + biome check
npm run lint     # biome check --write
npm run format   # prettier -w .
npm run build    # production build to ./dist
npm run preview  # preview the build locally
```

## Layout

- `src/pages/`: routes (index, posts, projects, resume, 404)
- `src/pages/posts/q/`: tag-query routes, e.g. `/posts/q/software-architecture/`
- `src/content/posts/<slug>/index.{md,mdx}`: post bundles
- `src/content/projects/<slug>.json`: project entries
- `src/content/resume/resume.json`: resume data
- `src/theme/`: layouts, shared components, styles
- `src/lib/tagfs/`: tag-query parser used by `/posts/q/*`
- `src/site.config.ts`: site title, URL, author, description

## Subprojects

`subprojects/` holds research notes and working materials that feed posts (e.g. `modern_forage/`). These aren't part of the build.

## License

MIT (see `LICENSE`).
