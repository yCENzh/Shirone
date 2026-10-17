<script lang="ts">
import OfflineIcon from "@shirone/iconify-offline";
import { addCollection } from "@shirone/iconify-offline-functions";
import { localIconCollections } from "@/generated/local-icon-collections";

import type { IconProps } from "./Icon.svelte";

/**
 * Icon names already warned about, at module scope.
 *
 * A component rendered a hundred times would otherwise log a hundred lines
 * for one line of authoring, which is how a deprecation warning gets muted.
 */
const warnedNames = new Set<string>();

for (const collection of localIconCollections) addCollection(collection);

// Runs during component setup rather than in an `$effect`, so a copied-in
// override file is reported during `astro build` and `astro dev` itself, not
// only after a browser hydrates.
function warnAboutLegacyName(raw: unknown): void {
	if (typeof raw !== "string" || !import.meta.env.DEV) return;
	if (warnedNames.has(raw)) return;
	warnedNames.add(raw);
	console.warn(
		`[shirones] <Icon name="${raw}"> is the removed astro-icon API; rename it to icon="${raw}" or the icon renders as an empty node.`,
	);
}

// Typed from this package's own `IconProps` rather than inferred from
// `OfflineIcon`: see the note in `Icon.svelte.d.ts`.
let { icon, name, ...props }: IconProps & Record<string, unknown> = $props();

// `name` is the prop the removed `astro-icon` integration spelled this. It is
// accepted only so an override file copied in from that era still renders an
// icon: `OfflineIcon` reads `icon`, so a surviving `name=` call site emits an
// empty node with nothing in the build to point at it — which is how four call
// sites silently lost their arrows during the migration.
warnAboutLegacyName(name);

// A name with no `prefix:` refers to the project's own `src/icons/*.svg`, which
// `collections.ts` emits under the `local` prefix. Resolved here rather than
// in the caller so every call site keeps writing the bare name.
const requested = icon ?? name;
const resolved = $derived(
	typeof requested === "string" &&
		requested.length > 0 &&
		!requested.includes(":")
		? `local:${requested}`
		: requested,
);
</script>

<OfflineIcon icon={resolved} {...props} />
