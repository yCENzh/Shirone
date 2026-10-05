import { expect, test } from "@playwright/test";

async function expectNotFoundShell(page: import("@playwright/test").Page) {
	await expect(page.locator("#swup-container")).toHaveAttribute(
		"data-current-page",
		"notFound",
	);
	await expect(page.locator("#swup-container h1")).toHaveText(
		"This page wandered off",
	);
	// Known flaky on the client-navigation half: the sidebar lives outside the
	// Swup container, so its `hidden` markers come from a pass that re-filters
	// after the route changes. Measured 2026-10-05, the marker appears ~700ms
	// after `visit:end` on some runs and never appears on others, with no
	// dependence on how long the assertion waits (checked to 12s). The
	// predicate itself is fine — `isWidgetVisibleOnPage(["home"], "notFound")`
	// returns false — and `data-current-page` is already "notFound" at
	// `visit:end`, so the loss happens inside that pass.
	//
	// Leading suspect: `fadeOutThenHide` in `utils/motion.ts` returns without
	// adding `hidden` when `await anim.finished` rejects, which is what
	// happens if anything cancels the animation mid-flight. Not yet proven on
	// this path — `resetPersistentSidebars` never appeared to run.
	//
	// Raising the timeout does not help, so this is left as a real failure
	// rather than papered over. Do not "fix" it by extending the budget.
	await expect(page.locator('[data-sidebar-pages="home"]').first()).toHaveClass(
		/hidden/,
	);
}

test.describe("404 route", () => {
	test("uses its own shell state on direct load and Swup navigation", async ({
		page,
	}) => {
		await page.goto("/404/", { waitUntil: "domcontentloaded" });
		await expectNotFoundShell(page);

		await page.goto("/", { waitUntil: "domcontentloaded" });
		await page.waitForFunction(() => Boolean(window.swup?.hooks));
		await page.evaluate(() => window.swup?.navigate("/404/"));
		await page.waitForURL("**/404/");
		await expectNotFoundShell(page);
	});
});
