const sha = import.meta.env.BUILD_SHA || "dev";
const ref = import.meta.env.BUILD_REF || "local";
const builtAt = new Date().toISOString();

export async function GET() {
	const body = JSON.stringify(
		{
			sha,
			shortSha: sha === "dev" ? "dev" : sha.slice(0, 7),
			ref,
			builtAt,
		},
		null,
		2,
	);
	return new Response(body, {
		headers: { "Content-Type": "application/json" },
	});
}
