/**
 * Which locale module a `siteConfig.lang` value selects.
 *
 * Kept free of imports on purpose: the integration reads it in plain Node to
 * learn the site's locale before Vite exists (see
 * `src/integration/vite/active-locale.ts`), and the locale modules themselves
 * are too large to load just for that.
 */
export const LOCALE_NAMES = [
	"en",
	"es",
	"id",
	"ja",
	"ko",
	"th",
	"tr",
	"vi",
	"zh_CN",
	"zh_TW",
] as const;

/** A module under `src/i18n/languages/`; also the name of its export. */
export type LocaleName = (typeof LOCALE_NAMES)[number];

/** Lower-cased `siteConfig.lang` values, including regional aliases. */
const LOCALE_ALIASES: Record<string, LocaleName> = {
	es: "es",
	en: "en",
	en_us: "en",
	en_gb: "en",
	en_au: "en",
	zh_cn: "zh_CN",
	zh_tw: "zh_TW",
	ja: "ja",
	ja_jp: "ja",
	ko: "ko",
	ko_kr: "ko",
	th: "th",
	th_th: "th",
	vi: "vi",
	vi_vn: "vi",
	id: "id",
	tr: "tr",
	tr_tr: "tr",
};

export const DEFAULT_LOCALE_NAME: LocaleName = "en";

/** An unknown or missing language falls back to English. */
export function resolveLocaleName(lang: string | undefined): LocaleName {
	return LOCALE_ALIASES[(lang || "en").toLowerCase()] ?? DEFAULT_LOCALE_NAME;
}
