import type { Component } from "svelte";

/**
 * Props the theme's Icon accepts.
 *
 * Declared explicitly rather than inferred from `OfflineIcon`: the upstream
 * `@iconify/svelte` signature is deprecated and narrower than what this
 * component actually forwards, so inferring it turned every
 * `<Icon icon="…">` in an `.astro` file into a type error.
 *
 * `Icon` is declared as Svelte 5's `Component<IconProps>` and not the older
 * `SvelteComponent<IconProps>` class type. The class form is incompatible with
 * `Component`, so every `<Icon>` inside a `.svelte` file failed with
 * "not assignable to parameter of type 'Component<any, any, any>'".
 *
 * `icon` takes a `<prefix>:<name>` string from a generated collection, or a
 * bare `<name>` for the project's own `src/icons/*.svg` (see `Icon.svelte`).
 */
export interface IconProps {
	icon: string;
	/**
	 * The prop the removed `astro-icon` integration spelled this. Accepted for
	 * compatibility only and warned about in dev; use `icon`.
	 *
	 * @deprecated
	 */
	name?: string;
	/** Rendered width. Either dimension may be given alone; the other scales. */
	width?: number | string;
	/** Rendered height. */
	height?: number | string;
	/** Passed through to the rendered `<svg>`. */
	class?: string;
	/** Passed through to the rendered `<svg>`. */
	style?: string;
	/** Renders the icon inline instead of as a replaced block. */
	inline?: boolean;
	/** Stroke colour, when the icon's own artwork uses `currentColor`. */
	color?: string;
	/** Mirrors the artwork horizontally, vertically, or both. */
	flip?: string;
	/** Rotation in degrees, clockwise. */
	rotate?: number;
	/** Marks the icon decorative for assistive technology. */
	"aria-hidden"?: boolean | "true" | "false";
}

declare const Icon: Component<IconProps>;

export default Icon;
