import {
	MC_SPECS,
	MC_STYLES,
	type McScheme,
	type McSpec,
	type McStyle,
} from "@utils/mc-types";
import { getDefaultSpec, getDefaultStyle, siteConfig } from "@/config";

export const STYLE_KEY = "mc-style";
export const SPEC_KEY = "mc-spec";
/**
 * Where the last computed non-default scheme is kept (see `SchemeCache`).
 * The inline script in `Layout.astro` reads the same key before first paint.
 */
export const SCHEME_CACHE_KEY = "mc-scheme-cache";
/** Bump when a change makes stored schemes wrong, e.g. an engine upgrade. */
export const SCHEME_CACHE_VERSION = 1;

/** CSS custom-property names emitted for each M3/M3E role. */
export const ROLE_TO_CSS: Record<string, string> = {
	primary: "--mc-primary",
	onPrimary: "--mc-on-primary",
	primaryContainer: "--mc-primary-container",
	onPrimaryContainer: "--mc-on-primary-container",
	inversePrimary: "--mc-inverse-primary",
	primaryFixed: "--mc-primary-fixed",
	primaryFixedDim: "--mc-primary-fixed-dim",
	onPrimaryFixed: "--mc-on-primary-fixed",
	onPrimaryFixedVariant: "--mc-on-primary-fixed-variant",
	secondary: "--mc-secondary",
	onSecondary: "--mc-on-secondary",
	secondaryContainer: "--mc-secondary-container",
	onSecondaryContainer: "--mc-on-secondary-container",
	secondaryFixed: "--mc-secondary-fixed",
	secondaryFixedDim: "--mc-secondary-fixed-dim",
	onSecondaryFixed: "--mc-on-secondary-fixed",
	onSecondaryFixedVariant: "--mc-on-secondary-fixed-variant",
	tertiary: "--mc-tertiary",
	onTertiary: "--mc-on-tertiary",
	tertiaryContainer: "--mc-tertiary-container",
	onTertiaryContainer: "--mc-on-tertiary-container",
	tertiaryFixed: "--mc-tertiary-fixed",
	tertiaryFixedDim: "--mc-tertiary-fixed-dim",
	onTertiaryFixed: "--mc-on-tertiary-fixed",
	onTertiaryFixedVariant: "--mc-on-tertiary-fixed-variant",
	error: "--mc-error",
	onError: "--mc-on-error",
	errorContainer: "--mc-error-container",
	onErrorContainer: "--mc-on-error-container",
	surface: "--mc-surface",
	surfaceDim: "--mc-surface-dim",
	surfaceBright: "--mc-surface-bright",
	surfaceContainerLowest: "--mc-surface-container-lowest",
	surfaceContainerLow: "--mc-surface-container-low",
	surfaceContainer: "--mc-surface-container",
	surfaceContainerHigh: "--mc-surface-container-high",
	surfaceContainerHighest: "--mc-surface-container-highest",
	onSurface: "--mc-on-surface",
	surfaceVariant: "--mc-surface-variant",
	onSurfaceVariant: "--mc-on-surface-variant",
	outline: "--mc-outline",
	outlineVariant: "--mc-outline-variant",
	inverseSurface: "--mc-inverse-surface",
	inverseOnSurface: "--mc-inverse-on-surface",
	shadow: "--mc-shadow",
	scrim: "--mc-scrim",
	surfaceTint: "--mc-surface-tint",
	primaryDim: "--mc-primary-dim",
	secondaryDim: "--mc-secondary-dim",
	tertiaryDim: "--mc-tertiary-dim",
	errorDim: "--mc-error-dim",
};

export function isMcStyle(v: string): v is McStyle {
	return (MC_STYLES as readonly string[]).includes(v);
}

export function isMcSpec(v: string): v is McSpec {
	return (MC_SPECS as readonly string[]).includes(v);
}

export function getStyle(): McStyle {
	const stored = localStorage.getItem(STYLE_KEY);
	return stored && isMcStyle(stored) ? stored : (getDefaultStyle() as McStyle);
}

export function getSpec(): McSpec {
	const stored = localStorage.getItem(SPEC_KEY);
	return stored && isMcSpec(stored) ? stored : (getDefaultSpec() as McSpec);
}

export function setStyle(style: McStyle): void {
	localStorage.setItem(STYLE_KEY, style);
	applyCurrentScheme();
}

export function setSpec(spec: McSpec): void {
	localStorage.setItem(SPEC_KEY, spec);
	applyCurrentScheme();
}

/** The engine module, loaded on first use: see `loadSchemeEngine`. */
type SchemeEngine = typeof import("@utils/mc-utils");

let schemeEngine: SchemeEngine | null = null;
let schemeEngineLoading: Promise<SchemeEngine> | null = null;

/**
 * Load the color engine (`mc-utils`, which wraps
 * `@material/material-color-utilities`).
 *
 * The site-default scheme is static CSS and a visitor's own scheme is restored
 * from `SCHEME_CACHE_KEY`, so most page loads never need the engine. Importing
 * it statically put about 80 KB into every first load; it is now fetched when
 * a visitor opens the display settings or picks a scheme that is not stored.
 */
export function loadSchemeEngine(): Promise<SchemeEngine> {
	schemeEngineLoading ??= import("@utils/mc-utils").then((engine) => {
		schemeEngine = engine;
		return engine;
	});
	return schemeEngineLoading;
}

/** CSS custom properties of one resolved scheme, e.g. `--mc-primary`. */
type SchemeVars = Record<string, string>;

/**
 * The visitor's last non-default scheme, as stored in `localStorage`.
 *
 * `key` is `hue|style|spec`. The two modes are filled in as each is first
 * shown, because resolving a scheme costs a few milliseconds and the hue
 * slider applies one on every step.
 */
interface SchemeCache {
	v: number;
	key: string;
	light?: SchemeVars;
	dark?: SchemeVars;
}

function readSchemeCache(key: string): SchemeCache {
	try {
		const stored = JSON.parse(
			localStorage.getItem(SCHEME_CACHE_KEY) ?? "null",
		) as SchemeCache | null;
		if (stored?.v === SCHEME_CACHE_VERSION && stored.key === key) return stored;
	} catch {
		// Unreadable storage or a malformed entry: treat as empty.
	}
	return { v: SCHEME_CACHE_VERSION, key };
}

function writeSchemeCache(cache: SchemeCache): void {
	try {
		localStorage.setItem(SCHEME_CACHE_KEY, JSON.stringify(cache));
	} catch {
		// Storage full or blocked: the scheme is recomputed on the next load.
	}
}

function toSchemeVars(scheme: McScheme): SchemeVars {
	const vars: SchemeVars = {};
	for (const [role, cssVar] of Object.entries(ROLE_TO_CSS)) {
		const value = scheme[role];
		if (value) vars[cssVar] = value;
	}
	return vars;
}

/** Write a scheme onto `:root`; an empty one clears every override. */
function writeSchemeVars(root: HTMLElement, vars: SchemeVars): void {
	for (const cssVar of Object.values(ROLE_TO_CSS)) {
		const value = vars[cssVar];
		if (value) root.style.setProperty(cssVar, value);
		else root.style.removeProperty(cssVar);
	}
}

let appliedSchemeKey = "";

/**
 * Apply the dynamic M3/M3E scheme for the current hue, style, spec and
 * light/dark mode, writing concrete hex values onto CSS custom properties on
 * `:root`. Unchanged inputs are skipped to avoid redundant style recalcs.
 *
 * - The site-default scheme is shipped as static CSS (see
 *   `default-scheme-style.ts`), so for it the inline overrides are cleared.
 * - A scheme already in the cache is applied from there.
 * - Anything else needs the engine. Once it is loaded this is synchronous;
 *   the first time, the scheme is applied when the engine arrives, unless the
 *   inputs have changed again by then.
 */
export function applyCurrentScheme(): void {
	const root = document.querySelector(":root") as HTMLElement | null;
	if (!root) return;

	const hue = Number.parseInt(
		root.style.getPropertyValue("--hue") || "250",
		10,
	);
	const isDark = root.classList.contains("dark");
	const style = getStyle();
	const spec = getSpec();
	const key = `${hue}|${isDark}|${style}|${spec}`;
	if (key === appliedSchemeKey) return;
	appliedSchemeKey = key;

	const isDefault =
		hue === siteConfig.themeColor.hue &&
		style === getDefaultStyle() &&
		spec === getDefaultSpec();
	if (isDefault) {
		writeSchemeVars(root, {});
		return;
	}

	const mode = isDark ? "dark" : "light";
	const cache = readSchemeCache(`${hue}|${style}|${spec}`);
	const cached = cache[mode];
	if (cached) {
		writeSchemeVars(root, cached);
		return;
	}

	const resolveAndApply = (engine: SchemeEngine) => {
		const vars = toSchemeVars(engine.resolveScheme(hue, isDark, style, spec));
		writeSchemeCache({ ...cache, [mode]: vars });
		// The inputs may have moved on while the engine was loading.
		if (appliedSchemeKey === key) writeSchemeVars(root, vars);
	};
	if (schemeEngine) resolveAndApply(schemeEngine);
	else void loadSchemeEngine().then(resolveAndApply);
}
