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

import { join } from "node:path";
import type { Plugin } from "vite";
import type { ResolvedShironesPaths } from "../../types.ts";
import { generateIconCollections } from "./collections.ts";

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
	const outputPath = join(
		paths.projectRoot,
		"src",
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
				outputPath,
			});
		} catch {
			// A typo in one post should cost that one icon, not take the dev
			// server down. The previous collection stays in place.
		}
	};

	return {
		name: "shirone:icon-regeneration",

		buildStart() {
			generate();
		},

		handleHotUpdate({ file }) {
			// Writing the output re-triggers this handler; regenerating again
			// would loop.
			if (file === outputPath) return;
			if (!SOURCE_EXTENSIONS.test(file)) return;

			clearTimeout(pending.get(paths.projectRoot));
			pending.set(paths.projectRoot, setTimeout(generate, DEBOUNCE_MS));
		},
	};
}
