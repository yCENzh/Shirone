/**
 * Song titles and artist names from a Meting playlist, for font subsetting.
 *
 * In `meting` / `mixed` mode that text exists only on the remote API, so the
 * subset needs one request per build. The API is a third party: when it is
 * slow or down the request used to yield nothing, and the build went on to
 * ship fonts without the glyphs of the song list. The last successful answer
 * is therefore kept on disk and used whenever a request fails.
 *
 * A successful request always replaces what is stored. There is no "fresh
 * enough, skip the request" rule on purpose: a playlist edited a minute ago
 * should be in the very next build.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const METING_USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Shirone/1.0";

/** The playlist API usually answers in about a second. */
const REQUEST_TIMEOUT_MS = 8000;

export interface MetingTextOptions {
	/** Request URL. It may carry a cache-busting parameter. */
	url: string;
	/**
	 * What identifies the playlist, without anything that changes per request.
	 * A stored answer is only reused for the same source.
	 */
	source: string;
	/** File that keeps the last successful answer. */
	cachePath: string;
	logger: { info: (message: string) => void; warn: (message: string) => void };
	/** Replaceable for tests. */
	fetch?: typeof globalThis.fetch;
}

interface StoredMetingText {
	source: string;
	text: string;
}

function readStored(cachePath: string, source: string): string | null {
	try {
		const stored = JSON.parse(
			readFileSync(cachePath, "utf8"),
		) as Partial<StoredMetingText>;
		return stored.source === source && typeof stored.text === "string"
			? stored.text
			: null;
	} catch {
		return null;
	}
}

function store(cachePath: string, entry: StoredMetingText): void {
	try {
		mkdirSync(dirname(cachePath), { recursive: true });
		writeFileSync(cachePath, `${JSON.stringify(entry)}\n`, "utf8");
	} catch {
		// A read-only cache directory costs the fallback, not the build.
	}
}

/** The distinct printable characters of every song's title and artist. */
function songCharacters(songs: unknown[]): { text: string; count: number } {
	let count = 0;
	const characters = new Set<string>();
	for (const song of songs) {
		const record = song as {
			name?: string;
			title?: string;
			artist?: string;
			author?: string;
		};
		const line = `${record.name ?? record.title ?? ""} ${record.artist ?? record.author ?? ""}`;
		if (!line.trim()) continue;
		count += 1;
		for (const character of line) {
			if (character.charCodeAt(0) > 31) characters.add(character);
		}
	}
	return { text: Array.from(characters).sort().join(""), count };
}

/**
 * Fetch the playlist text. Never throws: remote text is an enhancement, not
 * a build blocker. On any failure the last successful answer for the same
 * playlist is returned, or an empty string when there is none.
 */
export async function collectMetingSongText({
	url,
	source,
	cachePath,
	logger,
	fetch: fetchImpl = globalThis.fetch,
}: MetingTextOptions): Promise<string> {
	let failure: string;
	try {
		const response = await fetchImpl(url, {
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			headers: { "User-Agent": METING_USER_AGENT },
		});
		if (response.ok) {
			const data = (await response.json()) as unknown;
			if (Array.isArray(data)) {
				const { text, count } = songCharacters(data);
				logger.info(`collected text from ${count} Meting remote songs`);
				store(cachePath, { source, text });
				return text;
			}
			failure = "the Meting API did not return a song list";
		} else {
			failure = `the Meting API returned HTTP ${response.status}`;
		}
	} catch (error) {
		failure = `failed to fetch Meting playlist text (${(error as Error).message})`;
	}

	const stored = readStored(cachePath, source);
	if (stored !== null) {
		logger.warn(
			`${failure}; using the song text of the last successful request`,
		);
		return stored;
	}
	logger.warn(`${failure}; continuing with the local charset`);
	return "";
}
