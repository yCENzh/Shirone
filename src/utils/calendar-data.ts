/**
 * 日历取数：聚合全部文章的发布日（dateKey → 当日文章）。
 * 全站只输出一份 `/widget-data/calendar.json`，日历水合后按需拉取；
 * 不再把全量文章列表序列化进每个页面（文章数 N 时每页多 O(N) 字节，
 * 且任一篇改标题/日期都会让全部页面变化）。
 * 模块级备忘化，端点渲染共享一次汇总。
 * 日期口径与文章卡片一致（formatDateToYYYYMMDD，UTC 字段直取）。
 */
import { sidebarConfig } from "@/config/sidebarConfig";
import { getSortedPosts } from "./content-utils";
import { formatDateToYYYYMMDD } from "./date-utils";
import { getPostUrl } from "./url-utils.ts";

/** `src/pages/widget-data/[name].json.ts` 的 `name` 参数。 */
export const CALENDAR_DATA_NAME = "calendar";
/** 日历数据文件的站内路径（未带 base，交给 `url()` 处理）。 */
export const CALENDAR_DATA_PATH: string = `/widget-data/${CALENDAR_DATA_NAME}.json`;

/** 侧栏里是否有启用的日历 widget；关闭时不输出数据文件。 */
export function isCalendarWidgetEnabled(): boolean {
	return (
		sidebarConfig.enable &&
		sidebarConfig.components.some(
			(widget) => widget.type === "calendar" && widget.enable,
		)
	);
}

export interface CalendarPost {
	id: string;
	title: string;
	/** 文章 URL（/posts/<slug>/） */
	url: string;
	/** 发布日 dateKey（YYYY-MM-DD，与 dateMap 键一致） */
	date: string;
}

export interface CalendarData {
	/** dateKey → 当日文章（按发布时间倒序，列表展开展示用） */
	postsByDate: Record<string, CalendarPost[]>;
	/** 有文章月份列表（升序 YYYY-MM），跳月导航用（跳过空月） */
	activeMonths: string[];
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

let cache: CalendarData | null = null;

export async function getCalendarData(): Promise<CalendarData> {
	if (cache) return cache;

	const posts = await getSortedPosts();
	const postsByDate: Record<string, CalendarPost[]> = {};
	const activeMonthSet = new Set<string>();

	for (const post of posts) {
		const date = formatDateToYYYYMMDD(post.data.published);
		if (!DAY_KEY.test(date)) continue;
		const item: CalendarPost = {
			id: post.id,
			title: post.data.title,
			url: getPostUrl(post),
			date,
		};
		const postsForDate = postsByDate[date] ?? [];
		postsForDate.push(item);
		postsByDate[date] = postsForDate;
		activeMonthSet.add(date.slice(0, 7));
	}

	const activeMonths = Array.from(activeMonthSet).sort();

	cache = { postsByDate, activeMonths };
	return cache;
}
