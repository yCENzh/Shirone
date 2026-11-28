/**
 * The site-default color scheme as static CSS. Server only.
 *
 * Lives apart from `theme-utils.ts` because it needs the color engine at
 * module scope, and `theme-utils.ts` is client code that must not import it
 * statically (see `loadSchemeEngine` there).
 */
import type { McSpec, McStyle } from "@utils/mc-types";
import { resolveScheme } from "@utils/mc-utils";
import { ROLE_TO_CSS } from "@utils/theme-utils";
import { siteConfig } from "@/config";

/**
 * The layout asks for this on every page while the inputs are site-wide
 * constants, so the two scheme resolutions run once per build.
 */
let defaultSchemeStyleCache: { key: string; css: string } | null = null;

/**
 * Serialize the site-default light and dark schemes as static CSS so the first
 * paint already carries them and visitors on the defaults never run the engine.
 */
export function createDefaultSchemeStyle(): string {
	const { hue, style, spec } = siteConfig.themeColor;
	const cacheKey = `${hue}|${style}|${spec}`;
	if (defaultSchemeStyleCache?.key === cacheKey) {
		return defaultSchemeStyleCache.css;
	}
	const block = (isDark: boolean) => {
		const scheme = resolveScheme(hue, isDark, style as McStyle, spec as McSpec);
		return Object.entries(ROLE_TO_CSS)
			.filter(([role]) => scheme[role])
			.map(([role, cssVar]) => `${cssVar}:${scheme[role]}`)
			.join(";");
	};
	const css = `:root{${block(false)}}:root.dark{${block(true)}}`;
	defaultSchemeStyleCache = { key: cacheKey, css };
	return css;
}
