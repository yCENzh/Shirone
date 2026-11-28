/**
 * Narrow `src/i18n/active-locale.ts` to the configured language in builds.
 *
 * The theme ships ten dictionaries and a site uses one. Left alone, all ten
 * end up in the client chunk every page loads first (about 155 KB before
 * compression, against roughly 15 KB for one language), because the lookup by
 * `siteConfig.lang` is a runtime expression a bundler cannot see through.
 *
 * Build only: the dev server keeps the general module, so editing
 * `siteConfig.lang` there does not need a restart.
 */

import { join } from "node:path";
import type { Plugin } from "vite";
import { resolveLocaleName } from "../../i18n/locale-aliases.ts";
import { normalisePath } from "../resolve/paths.ts";
import type { ResolvedShironesPaths } from "../types.ts";

export function shironesActiveLocale(
	paths: ResolvedShironesPaths,
	/** `siteConfig.lang` as the integration loaded it. */
	lang: string | undefined,
): Plugin {
	const target = normalisePath(
		join(paths.packageSrc, "i18n", "active-locale.ts"),
	);
	const locale = resolveLocaleName(lang);

	return {
		name: "shirones:active-locale",
		enforce: "pre",
		apply: "build",
		load(id) {
			const queryStart = id.indexOf("?");
			const path = queryStart === -1 ? id : id.slice(0, queryStart);
			if (normalisePath(path) !== target) return null;
			// A relative specifier, so it resolves from the replaced file and
			// passes through the override system like any other theme import.
			return (
				`import { ${locale} } from "./languages/${locale}.ts";\n` +
				`export function getActiveTranslation() {\n\treturn ${locale};\n}\n`
			);
		},
	};
}
