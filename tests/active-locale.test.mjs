import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { LOCALE_NAMES, resolveLocaleName } from "../src/i18n/locale-aliases.ts";
import { shironesActiveLocale } from "../src/integration/vite/active-locale.ts";

const src = fileURLToPath(new URL("../src", import.meta.url));

describe("resolveLocaleName", () => {
	it("maps configured languages and regional aliases, ignoring case", () => {
		assert.equal(resolveLocaleName("zh_CN"), "zh_CN");
		assert.equal(resolveLocaleName("zh_cn"), "zh_CN");
		assert.equal(resolveLocaleName("ZH_TW"), "zh_TW");
		assert.equal(resolveLocaleName("en_GB"), "en");
		assert.equal(resolveLocaleName("ja_JP"), "ja");
	});

	it("falls back to English for an unknown or missing language", () => {
		assert.equal(resolveLocaleName("fr"), "en");
		assert.equal(resolveLocaleName(""), "en");
		assert.equal(resolveLocaleName(undefined), "en");
	});
});

describe("locale modules", () => {
	// The build imports `./languages/<name>.ts` and its export `<name>`.
	it("exist under the name the build imports them by", () => {
		for (const name of LOCALE_NAMES) {
			const file = join(src, "i18n", "languages", `${name}.ts`);
			assert.ok(existsSync(file), `${name}.ts is missing`);
			assert.match(
				readFileSync(file, "utf8"),
				new RegExp(`^export const ${name}: Translation = \\{`, "m"),
			);
		}
	});
});

describe("shironesActiveLocale", () => {
	const plugin = shironesActiveLocale({ packageSrc: src }, "zh_cn");
	const target = join(src, "i18n", "active-locale.ts");

	it("only applies to builds", () => {
		assert.equal(plugin.apply, "build");
	});

	it("replaces active-locale.ts with the configured language alone", () => {
		const code = plugin.load(target);
		assert.match(code, /import \{ zh_CN \} from "\.\/languages\/zh_CN\.ts";/);
		assert.match(code, /export function getActiveTranslation\(\)/);
		assert.doesNotMatch(code, /languages\/en\.ts/);
		// Windows ids use backslashes; Vite may append a query.
		assert.equal(plugin.load(`${target.replaceAll("/", "\\")}?v=1`), code);
	});

	it("leaves every other module alone", () => {
		assert.equal(plugin.load(join(src, "i18n", "translation.ts")), null);
		assert.equal(plugin.load(join(src, "i18n", "locales.ts")), null);
	});

	it("falls back to English for an unknown language", () => {
		const code = shironesActiveLocale({ packageSrc: src }, "fr").load(target);
		assert.match(code, /import \{ en \} from "\.\/languages\/en\.ts";/);
	});
});
