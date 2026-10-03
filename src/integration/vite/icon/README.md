# `vite/icon/`

`Icon.svelte` imports `@/generated/local-icon-collections`, a tree-shaken subset
of the installed `@iconify-json/*` sets. Tree-shaking is the reason this exists:

| | icons | size |
|---|---|---|
| full sets | 30407 | 14.4 MB |
| what a theme uses | ~200 | ~107 KB |

The alternatives do not work here. Loading the Iconify API at runtime puts a
network request on first paint, which `AGENTS.md` forbids; one chunk per icon
means one request per glyph. A single generated module keeps the icons offline
and in one request.

## Files

- `collections.ts` — scans the sources, resolves each referenced glyph through
  its alias chain, writes the collection module.
- `regeneration.ts` — the Vite plugin that keeps it current.

## Where it runs

`regeneration.ts` regenerates in two places:

- `astro:config:setup` — the collection must exist before Vite resolves
  `Icon.svelte`. This hook runs for `astro dev`, `astro build` *and*
  `astro sync`, so all three get a fresh collection with no separate build step.
- `handleHotUpdate` — an icon added while the dev server is up regenerates
  without a restart. This is the reason the plugin exists at all; generation used
  to happen only in the script chain, which ran once before the server started.

There is deliberately no CLI wrapper. An earlier version exposed
`pnpm icons:generate`; with the hook in place it had no callers left except the
`dev`/`build` chains it duplicated.

## What gets scanned

`packageSrc` (the theme's own components) and `contentDir` (a user's posts,
absent in source mode). Together those cover both modes without a mode check:
in source mode the theme *is* the project, so `packageSrc` already contains
`src/content`.

`ICON_PREFIXES` in `collections.ts` is the allow-list of usable sets, and it
duplicates `iconInclude` in `src/config/integrationsConfig.ts`. Both need a new
set; keep them in step.

## Gotcha: Vite resolves aliases before plugins

`Icon.svelte` writes the specifier `@/generated/local-icon-collections`, but by
the time a plugin's `resolveId` runs, Vite has already rewritten it — to
`projectRoot/src/...` in source mode (via tsconfig paths) and to `packageSrc/...`
in package mode. `enforce: "pre"` does not change this.

So `regeneration.ts` is not a virtual module; it writes a real file and the
plugin only matches the path to skip regenerating on its own output. Matching
the bare specifier alone would never fire.

## Errors are swallowed on purpose

`regeneration.ts` catches failures. A typo in one post should cost one icon,
not take the dev server down or fail a deploy. The CLI path is gone, so nothing
reports the problem loudly — if an icon silently does not appear, check that the
name exists in the installed set.