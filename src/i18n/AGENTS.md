# Internationalization Scope

- Every new `I18nKey` must have a non-empty value in all ten locale modules under `src/i18n/languages/`. Keep locale object keys synchronized with `src/i18n/i18nKey.ts`; the type check catches missing keys but does not prove that values are meaningful.
- Parameterized copy must preserve the exact placeholder-name set across locales, such as `{date}` or `{days}`. Replace placeholders in the consuming component or page; do not add a second ad-hoc translation system.
- When adding a supported language or alias, update `src/i18n/locale-aliases.ts` (the alias table and `LOCALE_NAMES`) and `src/i18n/locales.ts`, and verify fallback behavior. Keep the existing locale module naming and exported object shape: a build imports `./languages/<name>.ts` and its export `<name>` by that name.
- `i18n()` must reach the dictionaries only through `src/i18n/active-locale.ts`. A production build replaces that module with one that imports the configured language alone; a direct import of `locales.ts` or of several `languages/*.ts` modules from client code puts all ten dictionaries (about 155 KB) back into the first load.
- Do not put route-specific data, counts, dates, or user names into locale files. Pass those values into an existing localized template at the consumer and test the replacement path when it is user-visible.
- For i18n changes, run `npx.cmd astro check` and the focused page/component test that renders the new key. Check at least one non-default locale when the change affects layout-sensitive copy.
