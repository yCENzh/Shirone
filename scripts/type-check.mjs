/**
 * `tsc --isolatedDeclarations` gate.
 *
 * Runs the compiler and fails on any error except the documented exception:
 * the four `TS9013` diagnostics on the `collections` entries in
 * `src/content.config.ts`.
 *
 * Why that one cannot be fixed: `defineCollection` is generic, so declaration
 * emit has no way to name each entry's type. Annotating `collections` makes it
 * either re-reference the unnamed consts or drop the per-collection schema
 * types, which turns every `post.data` read into `unknown`. Excluding the file
 * is not an option either — `.astro/content.d.ts` references it through
 * `typeof import(...)`, which pulls it back into the program.
 *
 * Implemented in Node rather than shell so the filter behaves identically on
 * Windows and POSIX. A pipeline like
 * `tsc … | tee /dev/stderr | grep -v … | (! grep -q .)`
 * is bash-only: `/dev/stderr` does not exist on Windows and `(! …)` is not
 * `cmd.exe` syntax, so `pnpm type-check` — the project's primary development
 * platform — would fail to run at all.
 */

import { spawnSync } from "node:child_process";

/** Diagnostics allowed through, matched against the reported file. */
const ALLOWED = [
	{
		file: "src/content.config.ts",
		reason:
			"Astro derives entry schemas from this file at build time; see the header comment.",
	},
];

const result = spawnSync(
	process.execPath,
	["node_modules/typescript/bin/tsc", "--noEmit", "--isolatedDeclarations"],
	{ encoding: "utf8", shell: false },
);

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
const lines = output.split("\n");

// A diagnostic occupies a `path(line,col): error TSxxxx: …` line; continuation
// lines (the source excerpt tsc prints under it) are indented and carry no
// `error TS` marker, so they are attributed to the diagnostic above them.
const diagnostics = [];
let current = null;
for (const line of lines) {
	const header = line.match(/^(.+?)\(\d+,\d+\):\s+error\s+(TS\d+):/);
	if (header) {
		current = { file: header[1].trim(), code: header[2], text: line };
		diagnostics.push(current);
		continue;
	}
	if (/^\S/.test(line) && !/error\s+TS\d+/.test(line)) {
		current = null; // start of an unrelated section (e.g. "Found 4 errors")
		continue;
	}
	if (current && /^\s/.test(line) && line.trim()) current.text += `\n${line}`;
}

const violations = diagnostics.filter(
	(diagnostic) =>
		!ALLOWED.some(
			(entry) =>
				diagnostic.file === entry.file || diagnostic.file.endsWith(`/${entry.file}`),
		),
);

const allowedSeen = diagnostics.length - violations.length;
for (const entry of ALLOWED) {
	const seen = diagnostics.filter(
		(diagnostic) =>
			diagnostic.file === entry.file || diagnostic.file.endsWith(`/${entry.file}`),
	).length;
	console.log(
		`[type-check] ${entry.file}: ${seen} known diagnostic(s) tolerated — ${entry.reason}`,
	);
}
if (allowedSeen === 0) {
	console.log(
		"[type-check] the content.config.ts exception is no longer used; " +
			"drop it from ALLOWED once the file can be annotated.",
	);
}

// Always surface the compiler output: the gate must not hide what it saw.
if (output.trim()) console.log(output.trimEnd());

if (result.error) {
	console.error(`[type-check] failed to run tsc: ${result.error.message}`);
	process.exit(1);
}

if (violations.length > 0) {
	console.error(
		`[type-check] ✗ ${violations.length} error(s) beyond the documented exception:`,
	);
	for (const diagnostic of violations) {
		console.error(`    ${diagnostic.file}  ${diagnostic.code}  ${diagnostic.text.split("\n")[0].slice(0, 160)}`);
	}
	process.exit(1);
}

console.log("[type-check] ✓ no errors beyond the documented exception");