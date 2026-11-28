import {
	CALENDAR_DATA_NAME,
	getCalendarData,
	isCalendarWidgetEnabled,
} from "@utils/calendar-data";
import type { APIRoute, GetStaticPaths } from "astro";

/**
 * Site-wide data a persistent sidebar widget reads in the browser, emitted
 * once instead of being serialized into every page.
 *
 * A widget's file exists only while that widget is enabled, so a disabled
 * widget leaves nothing behind in `dist/`.
 */
export const getStaticPaths: GetStaticPaths = () =>
	isCalendarWidgetEnabled() ? [{ params: { name: CALENDAR_DATA_NAME } }] : [];

export const GET: APIRoute = async ({ params }) => {
	if (params.name !== CALENDAR_DATA_NAME || !isCalendarWidgetEnabled()) {
		return new Response("Not Found", { status: 404 });
	}
	return new Response(JSON.stringify(await getCalendarData()), {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
};
