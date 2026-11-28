export interface WeekInfoLocale {
	getWeekInfo?: () => { firstDay: number };
	weekInfo?: { firstDay: number };
}

/** Intl.Locale week info, preferring the current method over the legacy accessor. */
export function resolveWeekStart(locale: WeekInfoLocale): number {
	return locale.getWeekInfo?.().firstDay ?? locale.weekInfo?.firstDay ?? 1;
}

export function getLocaleWeekStart(locale: string): number {
	return resolveWeekStart(new Intl.Locale(locale));
}

const gregorianFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * Create localized date text with the same Gregorian calendar and Latin digits
 * used by the ISO-backed calendar grid.
 *
 * Formatters are immutable, so one instance per locale and option set is
 * shared: the sidebar calendar asks for the same few on every rendered page.
 */
export function createGregorianDateFormatter(
	locale: string,
	options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
	const cacheKey = `${locale}|${JSON.stringify(options)}`;
	let formatter = gregorianFormatters.get(cacheKey);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat(locale, {
			...options,
			calendar: "gregory",
			numberingSystem: "latn",
		});
		gregorianFormatters.set(cacheKey, formatter);
	}
	return formatter;
}
