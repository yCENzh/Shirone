// 循环依赖规避：navBarConfig 等配置消费 i18n，本模块只允许从具体文件导入 siteConfig 与 i18nConfig，
// 禁止走 @/config barrel（见 src/config/README.md）
import { i18nConfig } from "../config/i18nConfig.ts";
import { siteConfig } from "../config/siteConfig.ts";
import { getActiveTranslation } from "./active-locale.ts";
import type I18nKey from "./i18nKey.ts";

export type Translation = {
	[K in I18nKey]: string;
};

export function i18n(key: I18nKey): string {
	const lang = (siteConfig.lang || "en").toLowerCase();

	// 1. 查找用户自定义 i18n 覆盖域（支持原大小写及小写匹配，如 zh_CN / zh_cn）
	if (i18nConfig && typeof i18nConfig === "object") {
		const langOverrides =
			i18nConfig[lang] ??
			Object.entries(i18nConfig).find(([k]) => k.toLowerCase() === lang)?.[1];

		if (langOverrides && typeof langOverrides === "object") {
			const customVal = langOverrides[key];
			if (typeof customVal === "string") {
				return customVal;
			}
		}
	}

	// 2. 回退到内置词典（构建时只打包站点语言那一份，见 active-locale.ts）
	return getActiveTranslation()[key];
}
