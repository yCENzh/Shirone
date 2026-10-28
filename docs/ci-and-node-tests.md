# CI and Node Test Contract

This project runs unit tests directly with Node. CI uses Node 22 and Node 24. Astro/Vite supplies TypeScript, aliases, and extension resolution during development, but `node --test` does not; code loaded by tests must work in both environments.

## Runtime boundaries

- Do not make a pure Node test path import a TypeScript module containing a runtime `enum`. Node's strip-only TypeScript loader does not support `enum`.
- When a Node test needs enum-shaped keys, expose string keys through an `.mjs` runtime bridge and keep the TypeScript declaration in a matching `.d.mts` file.
- TypeScript files loaded directly by Node must use explicit `.ts` extensions for relative imports. Do not rely on Vite aliases such as `@/`.
- User-facing copy must still go through `i18n()` and the `I18nKey` registry. A runtime bridge changes loading only; it must not duplicate translations or bypass the ten locale modules.
- The manual `Verify Shirone work branch` harness currently requests bare Node 22. Keep Astro toolchain engine floors at or below Node 22.22 until that harness pins a sufficiently recent 22.x release; Astro 7.4.1, `@astrojs/mdx` 8.1.0, and `@astrojs/svelte` 9.1.0 are pinned to stay compatible. Before adopting releases that require Node 22.23.4 or newer, update the harness runtime first.

## Browser regression path selection

The main `ci.yml` runs quality checks, diagnostics and Node unit tests, and Node 22/24 builds for every PR and push. Only the Playwright browser suites are path-gated.

- For a PR, changed paths are computed from the base SHA to the PR merge commit; for a push, from the event's `before` SHA to the current commit. Manual dispatches and new-branch pushes select both browser suites.
- `tests/fixtures/**` selects the comment suite. Source, site-browser tests, dependencies, runtime/build config, scripts, public assets, and workflow changes select both comment and style suites. Fast paths are limited to explicit documentation/Markdown patterns and the shallow Node-test globs (`tests/*.test.mjs`, `tests/*/*.test.mjs`); deeper or unrecognized paths fall back to both suites. Mixed changes take the most conservative selection.
- Unknown paths select both suites; a failed diff or invalid output must fail the stable regression checks rather than silently skip tests. The classifier reads NUL-delimited Git paths, so spaces, Unicode, and newlines are not split or quoted incorrectly.
- The workflow independently detects edits to `scripts/ci/classify-browser-suites.sh` and forces both suites before invoking that script. Keep this guard and the exact self-change case in `tests/ci-path-filter.test.mjs` in sync with the classifier.
- The classifier integration test runs Bash when `bash --version` is available; it is not unconditionally skipped on Windows. If native Windows/Git Bash path handling is unavailable in a local environment, run it under WSL or Linux. CI runs it on Ubuntu.

The Biome step in `ci.yml` currently has `continue-on-error: true`; a green required check does not itself make Biome blocking. Run `pnpm exec biome ci ./src` locally for source changes and review formatter edits rather than assuming CI status enforces them.

The Node 22/24 production builds exercise source mode. Style regressions include `tests/site/theme-scheme.spec.ts`, but this workflow does not build and install a `shirones` npm tarball. Changes under `src/integration/` or other package-mode wiring should also follow [npm package mode](./npm-package-mode.md) and the [packaging contract](./packaging-contract.md); do not treat a source-mode green run as package-mode evidence.

## Local validation order

After changing Markdown processing, i18n modules, or test loading paths, run:

```powershell
pnpm.cmd exec biome ci ./src
npx.cmd astro check
pnpm.cmd check:manifest
node --test "tests/**/*.test.mjs"
git diff --check
```

Do not run `astro check` in parallel with content-sync tests. Astro check triggers content synchronization, while `tests/content/*` uses temporary repository fixtures; concurrent runs can cause false failures such as empty stderr. Run the complete unit suite separately.

## GitHub Actions diagnosis

Inspect the run summary first, then the failed job logs:

```powershell
gh run view <run-id> --json status,conclusion,headSha,jobs,url
gh run view <run-id> --job <job-id> --log-failed
```

Reproduce the failed step locally with the same Node major version and command. Keep build, diagnostics, and unit-test failures separate; change implementation only when the failure reproduces in an isolated run.

## Before committing

- Review `git diff` and confirm locale files contain only required import or formatting changes.
- Stage paths explicitly. Never use `git add -A`, which can include `Shirone-Content/`, temporary fixtures, or build output.
- Use a conventional commit such as `fix(markdown): support direct Node markdown tests`.
