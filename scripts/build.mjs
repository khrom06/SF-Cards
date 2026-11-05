#!/usr/bin/env node
// Builds dist/sf-cards.js (the single file HACS ships) by concatenating src/*.js in file-name order, then minifying with esbuild
// (whitespace + identifiers; the "/*!" license banner at the top of src/00-header.js is kept as-is). The same file is copied to docs/
// for the demo page. The tests (test/lint.js) scan the readable src/*.js concatenation, not this minified output.
//   node scripts/build.mjs          write dist/sf-cards.js and docs/sf-cards.js
//   node scripts/build.mjs --check  fail (exit 1) if the committed dist/ or docs/ copy differs from what src/ builds
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = fs.readdirSync(path.join(root, "src")).filter((f) => f.endsWith(".js")).sort();
if (!files.length) { console.error("build: src/ is empty"); process.exit(2); }
const srcConcat = Buffer.concat(files.map((f) => fs.readFileSync(path.join(root, "src", f)))).toString("utf8");

const result = esbuild.transformSync(srcConcat, {
  minify: true,
  target: "es2020",
  legalComments: "inline", // keeps the "/*!" MIT license banner from src/00-header.js
  loader: "js",
});
const out = Buffer.from(result.code, "utf8");
const targets = ["dist/sf-cards.js", "docs/sf-cards.js"];

if (process.argv.includes("--check")) {
  const stale = targets.filter((t) => { try { return !fs.readFileSync(path.join(root, t)).equals(out); } catch { return true; } });
  if (stale.length) { console.error(`build: ${stale.join(", ")} differ(s) from src/ — run "node scripts/build.mjs" and commit the result`); process.exit(1); }
  console.log(`OK: dist/ and docs/ are up to date with src/ (${files.length} files, ${srcConcat.length} -> ${out.length} bytes minified)`);
} else {
  for (const t of targets) fs.writeFileSync(path.join(root, t), out);
  console.log(`built ${targets.join(" + ")} from ${files.length} files (${srcConcat.length} -> ${out.length} bytes minified)`);
}
