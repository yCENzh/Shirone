/**
 * The dictionary of the configured site language.
 *
 * This file is the general implementation: it can answer for any language, at
 * the cost of importing all of them. It is what runs in `astro dev` (so a
 * change to `siteConfig.lang` takes effect without a restart) and wherever
 * the theme's modules are loaded outside Vite.
 *
 * In `astro build` the integration replaces this module with one that imports
 * only the configured language (`src/integration/vite/active-locale.ts`). The
 * site language is fixed at build time, so the other nine dictionaries would
 * otherwise be dead weight in every visitor's first load.
 *
 * `siteConfig.lang` is read inside the function rather than at module scope:
 * configuration modules call `i18n()` while they are still being evaluated.
 */
import { siteConfig } from "../config/siteConfig.ts";
import { getTranslation } from "./locales.ts";
import type { Translation } from "./translation.ts";

export function getActiveTranslation(): Translation {
	return getTranslation(siteConfig.lang || "en");
}
