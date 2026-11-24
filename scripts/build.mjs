#!/usr/bin/env node
// Builds dist/sf-cards.js (the main file the Marketplace / HACS ships, with one sf-cards-i18n-<lang>.js per extra language) by concatenating src/*.js in file-name order, then minifying with esbuild
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
// Translations: src/03-i18n-data.js lists the 11 languages side by side. sf-cards.js keeps French (also the legacy key) and English (the
// fallback); every other language goes to its own file, dist/sf-cards-i18n-<lang>.js, loaded on demand (src/03a-i18n-load.js).
const I18N_FILE = "03-i18n-data.js", KEEP = 2;
const i18nSrc = fs.readFileSync(path.join(root, "src", I18N_FILE), "utf8");
const tMatch = /const SF_T = (\{[\s\S]*?\n\});/.exec(i18nSrc), lMatch = /const SF_LANGS = (\{[^}]*\});/.exec(i18nSrc);
if (!tMatch || !lMatch) { console.error(`build: SF_T or SF_LANGS not found in src/${I18N_FILE}`); process.exit(2); }
const SF_T = new Function(`return ${tMatch[1]}`)(), SF_LANGS = new Function(`return ${lMatch[1]}`)();
const langs = Object.entries(SF_LANGS).filter(([, ix]) => ix >= KEEP);
const kept = Object.fromEntries(Object.entries(SF_T).map(([id, v]) => [id, v.slice(0, KEEP)]));
const embedded = Object.entries(SF_LANGS).filter(([, ix]) => ix < KEEP).map(([l]) => l);
const i18nOut = i18nSrc.replace(tMatch[0], `const SF_T = ${JSON.stringify(kept)};`).replace("const SF_I18N_EMBEDDED = Object.keys(SF_LANGS);", `const SF_I18N_EMBEDDED = ${JSON.stringify(embedded)};`);
if (!i18nOut.includes(`const SF_I18N_EMBEDDED = ${JSON.stringify(embedded)};`)) { console.error("build: SF_I18N_EMBEDDED marker not found"); process.exit(2); }
const langFiles = langs.map(([l, ix]) => {
  const table = {}; for (const [id, v] of Object.entries(SF_T)) if (typeof v[ix] === "string" && v[ix]) table[id] = v[ix];
  return [`sf-cards-i18n-${l}.js`, Buffer.from(`/*! SF Cards - ${l} texts (MIT). Loaded by sf-cards.js from the same folder. */\n(window.__sfI18n = window.__sfI18n || []).push(${JSON.stringify([l, table]).replace(/[\u007f-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))});\n`, "utf8")];
});
const srcConcat = files.map((f) => (f === I18N_FILE ? i18nOut : fs.readFileSync(path.join(root, "src", f), "utf8"))).join("");

const result = esbuild.transformSync(srcConcat, {
  minify: true,
  target: "es2020",
  legalComments: "inline", // keeps the "/*!" MIT license banner from src/00-header.js
  loader: "js",
});
const out = Buffer.from(result.code, "utf8");
// every output: the bundle and the language files, in dist/ (release assets) and in docs/ (the demo page)
const outputs = [["sf-cards.js", out], ...langFiles].flatMap(([name, buf]) => ["dist", "docs"].map((d) => [`${d}/${name}`, buf]));
const targets = outputs.map(([t]) => t);
// The test pages load all the languages up front (one file, not shipped): test/i18n-all.js. Written in both modes, it is not committed.
fs.writeFileSync(path.join(root, "test", "i18n-all.js"), Buffer.concat(langFiles.map(([, b]) => b)));

if (process.argv.includes("--check")) {
  const stale = outputs.filter(([t, buf]) => { try { return !fs.readFileSync(path.join(root, t)).equals(buf); } catch { return true; } }).map(([t]) => t);
  if (stale.length) { console.error(`build: ${stale.join(", ")} differ(s) from src/ — run "node scripts/build.mjs" and commit the result`); process.exit(1); }
  console.log(`OK: dist/ and docs/ are up to date with src/ (${files.length} files, ${srcConcat.length} -> ${out.length} bytes minified)`);
} else {
  for (const [t, buf] of outputs) fs.writeFileSync(path.join(root, t), buf);
  console.log(`built dist/ + docs/: sf-cards.js (${files.length} files, ${srcConcat.length} -> ${out.length} bytes minified) and ${langFiles.length} language files (${langFiles.map(([n, b]) => `${n.slice(14, -3)} ${b.length}`).join(", ")})`);
}
