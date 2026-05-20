import spec from "@/lib/specs/well-known-spec-v0.1.0.json";

export async function GET() {
	return new Response(JSON.stringify(spec, null, 2) + "\n", {
		headers: {
			"Content-Type": "application/schema+json",
			"Cache-Control": "no-cache",
		},
	});
}
