/**
 * Keep `src/generated/local-icon-collections.ts` in step with its sources.
 *
 * Generation used to live only in the `dev` and `build` script chains, plus a
 * manual command. That made it easy to forget: an icon added to a
 * component or a post never reached the collection until the next chain ran.
 * `astro:config:setup` is the one hook every mode goes through — `astro dev`,
 * `astro build`, and `astro sync` — so generating there covers all three, and
 * `handleHotUpdate` covers edits made while the dev server is already up.
 *
 * Writing during `astro:config:setup` is safe: it happens before Vite resolves
 * any import, so `Icon.svelte` cannot observe a missing module.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import type { ResolvedShironesPaths } from "../../types.ts";
import {
	generateIconCollections,
	ICON_COLLECTIONS_SPECIFIER,
} from "./collections.ts";

/** Only these can change the collection; everything else is ignored. */
const SOURCE_EXTENSIONS = /\.(astro|md|mdx|svelte|ts|tsx)$/;

/** Coalesce the burst of events one save produces. */
const DEBOUNCE_MS = 150;

/**
 * Pending runs, keyed by project root at module scope.
 *
 * Module scope rather than a closure variable because the dev server rebuilds
 * this plugin whenever the config changes; a timer captured by a discarded
 * instance would still fire, against a stale path.
 */
const pending = new Map<string, ReturnType<typeof setTimeout>>();

export function shironesIconRegeneration(paths: ResolvedShironesPaths): Plugin {
	const userCopy = join(
		paths.projectRoot,
		"src",
		"generated",
		"local-icon-collections.ts",
	);
	const packageCopy = join(
		paths.packageSrc,
		"generated",
		"local-icon-collections.ts",
	);

	// `packageSrc` covers the theme's own components; `contentDir` covers a
	// user's posts in package mode and does not exist in source mode.
	const roots = [paths.packageSrc, paths.contentDir];

	const generate = () => {
		try {
			generateIconCollections({
				projectRoot: paths.projectRoot,
				roots,
				outputPath: userCopy,
			});
		} catch {
			// A typo in one post should cost one icon, not take the dev
			// server down. The previous collection stays in place.
		}
	};

	return {
		name: "shirone:icon-regeneration",

		// `Icon.svelte` imports `@/generated/local-icon-collections`, and in
		// package mode that alias points at `node_modules/shirones/src` — so the
		// file this plugin writes would never be read. Redirect to the user's copy
		// when it exists and fall back to the one shipped in the package.
		//
		// Vite resolves aliases before any plugin, so `source` arrives already
		// rewritten: to the package path in package mode, and to
		// `projectRoot/src/...` in source mode. Both forms are listed, along with
		// the bare specifier, because which one shows up depends on how the
		// theme is being consumed.
		resolveId(source) {
			if (
				source !== ICON_COLLECTIONS_SPECIFIER &&
				source !== withoutExtension(userCopy) &&
				source !== withoutExtension(packageCopy)
			) {
				return null;
			}
			return existsSync(userCopy) ? userCopy : packageCopy;
		},

		buildStart() {
			generate();
		},

		handleHotUpdate({ file }) {
			// Writing the output re-triggers this handler; regenerating again
			// would loop.
			if (file === userCopy) return;
			if (!SOURCE_EXTENSIONS.test(file)) return;

			clearTimeout(pending.get(paths.projectRoot));
			pending.set(paths.projectRoot, setTimeout(generate, DEBOUNCE_MS));
		},
	};
}

/** Vite hands plugins the specifier without its extension resolved. */
function withoutExtension(path: string): string {
	return path.replace(/\.ts$/, "");
}
