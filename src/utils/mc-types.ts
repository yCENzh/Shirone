/**
 * Names and types of the dynamic color system, without the engine.
 *
 * `mc-utils.ts` imports `@material/material-color-utilities`, about 80 KB of
 * client JavaScript. Code that only needs to name a style or a spec imports
 * from here, so it does not pull the engine into the first load.
 */

/** Palette style — mirrors `com.materialkolor.PaletteStyle`. */
export const MC_STYLES = [
	"tonalSpot",
	"vibrant",
	"content",
	"expressive",
	"rainbow",
	"fruitSalad",
	"monochrome",
	"neutral",
	"fidelity",
] as const;
export type McStyle = (typeof MC_STYLES)[number];

/** Design spec version — mirrors `ColorSpec.SpecVersion`. */
export const MC_SPECS = ["2021", "2025"] as const;
export type McSpec = (typeof MC_SPECS)[number];

/** Every M3/M3E role resolved to a hex color, or `null` when it has none. */
export type McScheme = Record<string, string | null>;
