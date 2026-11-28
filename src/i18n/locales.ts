/**
 * Every built-in locale, by name.
 *
 * Importing this module pulls in all ten dictionaries (about 155 KB of
 * client JavaScript), so nothing on the path to `i18n()` may import it
 * directly: that path goes through `active-locale.ts`, which a production
 * build narrows to the one configured language.
 */
import { en } from "./languages/en.ts";
import { es } from "./languages/es.ts";
import { id } from "./languages/id.ts";
import { ja } from "./languages/ja.ts";
import { ko } from "./languages/ko.ts";
import { th } from "./languages/th.ts";
import { tr } from "./languages/tr.ts";
import { vi } from "./languages/vi.ts";
import { zh_CN } from "./languages/zh_CN.ts";
import { zh_TW } from "./languages/zh_TW.ts";
import { type LocaleName, resolveLocaleName } from "./locale-aliases.ts";
import type { Translation } from "./translation.ts";

const locales: Record<LocaleName, Translation> = {
	en,
	es,
	id,
	ja,
	ko,
	th,
	tr,
	vi,
	zh_CN,
	zh_TW,
};

export function getTranslation(lang: string): Translation {
	return locales[resolveLocaleName(lang)];
}
