import { expect, test } from "@playwright/test";

/**
 * The site-default scheme ships as static CSS (Layout.astro), so a visitor on
 * the default hue/style/spec must never get inline `--mc-*` overrides — not even
 * transiently during init() (e.g. a theme pass that runs before `--hue` is set).
 */
for (const theme of ["light", "dark"]) {
	test(`default ${theme} load writes no inline --mc-* overrides`, async ({
		page,
	}) => {
		await page.addInitScript((theme) => {
			localStorage.setItem("theme", theme);
			const seen: string[] = [];
			(window as unknown as { __rootStyles: string[] }).__rootStyles = seen;
			new MutationObserver((records) => {
				for (const record of records) seen.push(record.oldValue ?? "");
			}).observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["style"],
				attributeOldValue: true,
			});
		}, theme);
		await page.goto("/", { waitUntil: "load" });

		const result = await page.evaluate(() => {
			const root = document.documentElement;
			return {
				dark: root.classList.contains("dark"),
				primary: getComputedStyle(root).getPropertyValue("--mc-primary").trim(),
				styles: [
					...(window as unknown as { __rootStyles: string[] }).__rootStyles,
					root.getAttribute("style") ?? "",
				],
			};
		});
		expect(result.dark).toBe(theme === "dark");
		expect(result.primary).toMatch(/^#/);
		expect(result.styles.filter((s) => s.includes("--mc-"))).toEqual([]);
	});
}

/**
 * The color engine (`mc-utils`, about 80 KB) is not part of the first load:
 * the default scheme is static CSS and a visitor's own scheme is restored from
 * the cache `theme-utils` keeps in localStorage.
 */
test.describe("color engine loading", () => {
	const isEngineRequest = (url: string) => /mc-utils/.test(url);

	test("a default visit does not download the engine until the display settings open", async ({
		page,
	}) => {
		const engineRequests: string[] = [];
		page.on("request", (request) => {
			if (isEngineRequest(request.url())) engineRequests.push(request.url());
		});
		await page.goto("/", { waitUntil: "networkidle" });
		expect(engineRequests).toEqual([]);

		await page.locator("#display-settings-switch").click();
		await expect(page.locator("#display-setting")).not.toHaveClass(
			/float-panel-closed/,
		);
		// The style swatches need the engine; they fill in once it has loaded.
		await expect(
			page.locator("#display-setting .m3-style-cell__dot").first(),
		).toHaveAttribute("style", /background:\s*(#|rgb)/);
		expect(engineRequests.length).toBeGreaterThan(0);
	});

	test("a visitor's own scheme is stored, then restored before load without the engine", async ({
		page,
	}) => {
		// First visit: pick a hue that is not the site default.
		await page.goto("/", { waitUntil: "networkidle" });
		const defaultPrimary = await page.evaluate(() =>
			getComputedStyle(document.documentElement)
				.getPropertyValue("--mc-primary")
				.trim(),
		);
		await page.evaluate(() => localStorage.setItem("hue", "120"));
		await page.reload({ waitUntil: "networkidle" });
		await expect
			.poll(() =>
				page.evaluate(() =>
					document.documentElement.style.getPropertyValue("--mc-primary"),
				),
			)
			.toMatch(/^#/);
		const stored = await page.evaluate(() => ({
			primary: document.documentElement.style.getPropertyValue("--mc-primary"),
			cache: JSON.parse(localStorage.getItem("mc-scheme-cache") ?? "null"),
		}));
		expect(stored.primary).not.toBe(defaultPrimary);
		expect(stored.cache.key).toBe("120|tonalSpot|2025");
		const mode = (await page.evaluate(() =>
			document.documentElement.classList.contains("dark"),
		))
			? "dark"
			: "light";
		expect(stored.cache[mode]["--mc-primary"]).toBe(stored.primary);

		// Second visit: the engine is unreachable and every script that could
		// apply the scheme later is held back, so only the inline script in
		// <head> can have set the colors.
		const engineRequests: string[] = [];
		await page.route(
			(url) => isEngineRequest(url.href),
			(route) => {
				engineRequests.push(route.request().url());
				return route.abort();
			},
		);
		await page.addInitScript(() => {
			document.addEventListener("DOMContentLoaded", () => {
				(window as unknown as { __primaryAtParse: string }).__primaryAtParse =
					document.documentElement.style.getPropertyValue("--mc-primary");
			});
		});
		await page.reload({ waitUntil: "networkidle" });
		const restored = await page.evaluate(() => ({
			atParse: (window as unknown as { __primaryAtParse: string })
				.__primaryAtParse,
			now: document.documentElement.style.getPropertyValue("--mc-primary"),
		}));
		expect(restored.atParse).toBe(stored.primary);
		expect(restored.now).toBe(stored.primary);
		expect(engineRequests).toEqual([]);
	});

	test("a stored scheme for other settings is ignored", async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem("hue", "200");
			localStorage.setItem(
				"mc-scheme-cache",
				JSON.stringify({
					v: 1,
					key: "120|tonalSpot|2025",
					light: { "--mc-primary": "#010203" },
					dark: { "--mc-primary": "#010203" },
				}),
			);
		});
		await page.goto("/", { waitUntil: "networkidle" });
		await expect
			.poll(() =>
				page.evaluate(() =>
					document.documentElement.style.getPropertyValue("--mc-primary"),
				),
			)
			.toMatch(/^#(?!010203)/);
		const cache = await page.evaluate(() =>
			JSON.parse(localStorage.getItem("mc-scheme-cache") ?? "null"),
		);
		expect(cache.key).toBe("200|tonalSpot|2025");
	});
});
