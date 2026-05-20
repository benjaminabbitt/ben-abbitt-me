import { siteConfig } from "@/site.config";

const sha = import.meta.env.BUILD_SHA || "dev";

export async function GET() {
	const manifest = {
		spec: {
			name: "deployment-version",
			version: "0.1.0",
			url: `${siteConfig.url}/.well-known/spec/deployment-version/v0.1.0.json`,
		},
		elements: [
			{
				path: "/",
				name: siteConfig.title,
				version: {
					text: sha,
					scheme: "git-sha",
				},
			},
		],
	};
	return new Response(JSON.stringify(manifest, null, 2) + "\n", {
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-cache",
		},
	});
}
