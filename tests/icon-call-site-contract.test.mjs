import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "src");

function sourceFiles(dir) {
	const found = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) found.push(...sourceFiles(full));
		else if (/\.(astro|svelte)$/.test(entry.name)) found.push(full);
	}
	return found;
}

/**
 * Blanks out comments and string bodies so the tag scan only ever looks at
 * markup. Without this, `Icon.svelte`'s own deprecation warning string and
 * JSDoc examples such as `<Icon … />` read as real call sites.
 */
function stripCommentsAndStrings(source) {
	return source
		.replace(/\/\*[\s\S]*?\*\//gs, " ")
		.replace(/<!--[\s\S]*?-->/gs, " ")
		.replace(/`[^`]*`/gs, '""')
		.replace(/"[^"\n]*"/gs, '""')
		.replace(/'[^'\n]*'/gs, '""');
}

/** Attribute text of every `<Icon …>`/`<Icon …/>` tag, matched across lines. */
function iconTags(source) {
	return [...source.matchAll(/<Icon\b([^>]*?)\/?>/gs)].map((match) => match[1]);
}

const files = sourceFiles(SRC);

test("the repository sources were scanned", () => {
	// A silent zero here would make every assertion below vacuous, and the
	// catch for this whole test file was a migration slip no one saw coming.
	assert.ok(
		files.length > 100,
		`expected to scan the whole component tree, got ${files.length}`,
	);
});

for (const file of files) {
	const relative = file.slice(ROOT.length);
	const tags = iconTags(stripCommentsAndStrings(readFileSync(file, "utf8")));
	if (tags.length === 0) continue;

	test(`${relative}: every <Icon> reads an icon`, () => {
		for (const tag of tags) {
			// `icon="…"`, `icon={…}` and the Svelte shorthand `{icon}` all carry it.
			assert.match(
				tag,
				/(^|\s)icon=|(^|\s)\{icon\}/,
				`${relative} has an <Icon> that passes no icon — ${tag.trim().slice(0, 80)}`,
			);
		}
	});

	test(`${relative}: no <Icon> uses the removed name= prop`, () => {
		for (const tag of tags) {
			assert.doesNotMatch(
				tag,
				/(^|\s)name=/,
				`${relative} still spells the icon name= ... astro-icon removed; rename it to icon= so the icon renders`,
			);
		}
	});
}
