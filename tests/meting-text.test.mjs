import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { collectMetingSongText } from "../src/integration/meting-text.ts";

const songs = [
	{ name: "夜曲", artist: "周杰伦" },
	{ title: "Hello", author: "Adele" },
	{ name: "", artist: "" },
];

function recorder() {
	const messages = { info: [], warn: [] };
	return {
		messages,
		logger: {
			info: (message) => messages.info.push(message),
			warn: (message) => messages.warn.push(message),
		},
	};
}

const respond =
	(body, status = 200) =>
	async () =>
		new Response(JSON.stringify(body), { status });
const fail = async () => {
	throw new Error("network down");
};

describe("collectMetingSongText", () => {
	let directory;
	let cachePath;

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), "meting-text-"));
		// A nested path: the cache directory may not exist yet.
		cachePath = join(directory, "fonts", "meting-text.cache");
	});
	afterEach(() => rmSync(directory, { recursive: true, force: true }));

	const collect = (fetch, logger, source = "playlist-a") =>
		collectMetingSongText({
			url: "https://meting.invalid/?r=1",
			source,
			cachePath,
			logger,
			fetch,
		});

	it("returns the distinct characters and stores them", async () => {
		const { logger, messages } = recorder();
		const text = await collect(respond(songs), logger);

		assert.equal(
			text,
			Array.from(new Set("夜曲 周杰伦Hello Adele")).sort().join(""),
		);
		assert.deepEqual(JSON.parse(readFileSync(cachePath, "utf8")), {
			source: "playlist-a",
			text,
		});
		assert.deepEqual(messages.warn, []);
		assert.match(messages.info[0], /2 Meting remote songs/);
	});

	it("falls back to the last successful answer when the request fails", async () => {
		const first = await collect(respond(songs), recorder().logger);

		for (const broken of [fail, respond({ error: "x" }), respond([], 503)]) {
			const { logger, messages } = recorder();
			assert.equal(await collect(broken, logger), first);
			assert.equal(messages.warn.length, 1);
			assert.match(messages.warn[0], /last successful request/);
		}
	});

	it("does not reuse the answer of a different playlist", async () => {
		await collect(respond(songs), recorder().logger);

		const { logger, messages } = recorder();
		assert.equal(await collect(fail, logger, "playlist-b"), "");
		assert.match(messages.warn[0], /network down.*local charset/);
	});

	it("returns nothing, without throwing, when there is no stored answer", async () => {
		const { logger, messages } = recorder();
		assert.equal(await collect(respond([], 500), logger), "");
		assert.match(messages.warn[0], /HTTP 500.*local charset/);
	});

	it("replaces the stored answer on every successful request", async () => {
		await collect(respond(songs), recorder().logger);
		const next = await collect(
			respond([{ name: "abc", artist: "" }]),
			recorder().logger,
		);

		assert.equal(next, " abc");
		assert.equal(await collect(fail, recorder().logger), " abc");
	});
});
