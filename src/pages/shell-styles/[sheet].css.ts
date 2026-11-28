import { getShellStylesheets } from "@utils/shell-stylesheets";
import type { APIRoute, GetStaticPaths } from "astro";

/**
 * Emits the persistent shell's stylesheets as content-hashed files. See
 * `src/utils/shell-stylesheets.ts` for why they do not go through Astro's CSS
 * pipeline; a stylesheet whose feature is off has no path here, so no file.
 */
export const getStaticPaths: GetStaticPaths = async () =>
	(await getShellStylesheets()).map((sheet) => ({
		params: { sheet: sheet.fileName },
	}));

export const GET: APIRoute = async ({ params }) => {
	const sheet = (await getShellStylesheets()).find(
		(candidate) => candidate.fileName === params.sheet,
	);
	if (!sheet) return new Response("Not Found", { status: 404 });
	return new Response(sheet.css, {
		headers: { "Content-Type": "text/css; charset=utf-8" },
	});
};
