import { getEntry } from "astro:content";

export async function GET() {
	const entry = await getEntry("posts", "well-known-spec");
	if (!entry) {
		return new Response("Not Found", { status: 404 });
	}
	return new Response(entry.body ?? "", {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}
