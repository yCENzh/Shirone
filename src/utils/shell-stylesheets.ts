/**
 * Stylesheets of the persistent shell that are the same on every page but
 * must not pass through Astro's CSS pipeline.
 *
 * `docs/on-demand-loading.md` §L3 explains the constraint: a stylesheet Astro
 * can see is hoisted into shared CSS and loaded by every page, including when
 * its feature is switched off. The first answer was to inline the compiled
 * CSS with `<style is:inline>`. That fits a feature rendered on a few pages;
 * for one rendered on every page it repeats the same bytes in every HTML file.
 *
 * These sheets are instead emitted once by `src/pages/shell-styles/` and
 * linked from the component that needs them. The file name carries a content
 * hash, so it can be cached for as long as the host allows. A sheet whose
 * feature is off is not listed here, so it is neither emitted nor linked.
 */
import { createHash } from "node:crypto";
import { musicConfig, resolveMusicOptions } from "@/config/musicConfig";
import { sidebarConfig } from "@/config/sidebarConfig";
import { resolveTextureOptions } from "@/config/siteConfig";
import { url } from "./url-utils.ts";

export type ShellStylesheetName = "music-sidebar" | "textures";

export interface ShellStylesheet {
	name: ShellStylesheetName;
	/** `<name>.<hash>`: the `[sheet]` parameter of the endpoint route. */
	fileName: string;
	css: string;
}

function isMusicSidebarRendered(): boolean {
	return (
		resolveMusicOptions(musicConfig) !== null &&
		sidebarConfig.enable &&
		sidebarConfig.components.some(
			(widget) => widget.type === "music" && widget.enable,
		)
	);
}

async function compileMusicSidebarCss(): Promise<string> {
	// Imported on demand so a site without the player never loads Stylus or
	// the player's style source here.
	const [{ default: stylus }, { musicSidebarStylus }] = await Promise.all([
		import("stylus"),
		import("../components/organisms/music/musicSidebarStyles.ts"),
	]);
	return new Promise<string>((resolve, reject) => {
		stylus.render(musicSidebarStylus, (error, css) => {
			if (error) reject(error);
			else resolve(css);
		});
	});
}

async function loadTextureCss(): Promise<string> {
	return (await import("../styles/textures.css?raw")).default;
}

function toStylesheet(name: ShellStylesheetName, css: string): ShellStylesheet {
	const hash = createHash("sha256").update(css).digest("hex").slice(0, 8);
	return { name, fileName: `${name}.${hash}`, css };
}

let cache: Promise<ShellStylesheet[]> | null = null;

/** Every shell stylesheet the current configuration needs, compiled once. */
export function getShellStylesheets(): Promise<ShellStylesheet[]> {
	cache ??= (async () => {
		const sheets: ShellStylesheet[] = [];
		if (isMusicSidebarRendered()) {
			sheets.push(
				toStylesheet("music-sidebar", await compileMusicSidebarCss()),
			);
		}
		if (resolveTextureOptions().enable) {
			sheets.push(toStylesheet("textures", await loadTextureCss()));
		}
		return sheets;
	})();
	return cache;
}

/** Site-relative address of a shell stylesheet, or `null` when it is off. */
export async function getShellStylesheetHref(
	name: ShellStylesheetName,
): Promise<string | null> {
	const sheet = (await getShellStylesheets()).find(
		(candidate) => candidate.name === name,
	);
	return sheet ? url(`/shell-styles/${sheet.fileName}.css`) : null;
}
