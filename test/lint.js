// Reliability rules on the readable src/*.js concatenation (patterns that have already frozen a browser or leaked in production). Scans src/, not
// dist/sf-cards.js: since dist/ is minified (scripts/build.mjs), line numbers and identifier names there no longer mean anything for these checks.
// Non-zero exit code if a rule fails.
const fs = require("fs");
const path = require("path");
const srcDir = path.join(__dirname, "..", "src");
const srcFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith(".js")).sort();
// lines[] / fileOfLine[] / lineOfLine[]: built file by file (not by splitting a joined string) so the file:line of each concatenation line is exact,
// with one blank separator line kept between files (its position is never matched by the rules below, which all look for real code).
const lines = [], fileOfLine = [], lineOfLine = [];
srcFiles.forEach((f, fi) => {
  const fileLines = fs.readFileSync(path.join(srcDir, f), "utf8").split("\n");
  fileLines.forEach((l, j) => { lines.push(l); fileOfLine.push(f); lineOfLine.push(j + 1); });
  if (fi < srcFiles.length - 1) { lines.push(""); fileOfLine.push(f); lineOfLine.push(fileLines.length + 1); }
});
const src = lines.join("\n"), bad = [];
const at = (i) => `src/${fileOfLine[i] || "?"}:${lineOfLine[i] ?? i + 1}`;
// 1. `:scope` matches nothing in a ShadowRoot (Chrome / WebKit): an existence test that uses it always answers "absent" (endless loop observed on 2026-11-03).
lines.forEach((l, i) => { if (/(shadowRoot|\broot|\bsr)\.querySelector(All)?\(\s*["'`]:scope/.test(l)) bad.push(`${at(i)} : ":scope" on a shadow root (never matches)`); });
// 2. Every setInterval stored in this.X must have its clearInterval(this.X).
for (const m of src.matchAll(/this\.(_\w+)\s*=\s*setInterval\(/g)) if (!new RegExp(`clearInterval\\(this\\.${m[1]}\\b`).test(src)) bad.push(`setInterval stored in this.${m[1]} without a matching clearInterval`);
for (const m of src.matchAll(/(^|[^.\w=])setInterval\(/gm)) { const i = src.slice(0, m.index).split("\n").length - 1; if (!/=\s*setInterval\(/.test(lines[i])) bad.push(`${at(i)} : setInterval whose id is not kept (cannot be stopped)`); }
// 3. Global listeners (window / document): each one must be removed somewhere with the same event name.
for (const m of src.matchAll(/(window|document)\.addEventListener\(\s*"([\w-]+)"/g)) if (!new RegExp(`${m[1]}\\.removeEventListener\\(\\s*"${m[2]}"`).test(src)) bad.push(`${m[1]}.addEventListener("${m[2]}") never removed`);
// 4. MutationObserver: a single known use (sfRedReq). Any new observer must be reviewed (risk of looping on its own mutation) then added here.
const mo = (src.match(/new MutationObserver\(/g) || []).length;
if (mo !== 1) bad.push(`${mo} MutationObserver (1 expected: sfRedReq) — review the new one, then update this rule`);
// 5. HA bus subscriptions: every subscribeMessage / subscribeEvents must be called behind a failure guard (no reconnection on every hass update).
lines.forEach((l, i) => { if (/subscribe(Message|Events)\(/.test(l) && !/_fcFail|await this\._hass/.test(lines.slice(Math.max(0, i - 12), i + 1).join("\n"))) bad.push(`${at(i)} : subscription without a visible failure guard`); });
// 6. Colours go through the theme tokens (var(--sf-*)): a hard-coded colour in a card module would stay dark-themed in the light theme.
// Allowed: the token definitions (05-styles), the dark-only wall-panel card, editor chrome, i18n/fonts, black used for masks / image overlays / shadows,
// colour examples in comments, and the few values listed below.
{
  const fs2 = require("fs"), path2 = require("path"), dir = path2.join(__dirname, "..", "src");
  const skip = /^(05-styles|25-wallpanel|40-editor-helpers|44-editor-required|45-editor-register|46-validate|02-fonts|03-i18n-data|06-config-normalise)\.js$/;
  const allowed = new Set(["#000", "rgba(0,0,0,.18)", "rgba(0,0,0,.55)", "rgba(0,0,0,.0)", "#03080f", "#e07a4f"]);
  for (const f of fs2.readdirSync(dir).filter((x) => x.endsWith(".js") && !skip.test(x))) {
    fs2.readFileSync(path2.join(dir, f), "utf8").split("\n").forEach((l, i) => {
      const t = l.trim(); if (t.startsWith("*") || t.startsWith("//") || t.startsWith("/*")) return;
      for (const m of l.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d[^)]*\)/g)) if (!allowed.has(m[0].replace(/\s/g, ""))) bad.push(`src/${f}:${i + 1}: hard-coded colour ${m[0]} (use a var(--sf-*) token)`);
    });
  }
}
// 7. Contrast (WCAG 2.2 AA, 4.5:1 for text): every palette colour that is used for text must reach it on the three backgrounds of the card gradient,
// in both themes. `grey` (disabled / inactive state, dark palette) is a known, documented exception: see docs/audit/07-accessibility-and-ux.md.
{
  const fs3 = require("fs"), path3 = require("path"), css = fs3.readFileSync(path3.join(__dirname, "..", "src", "05-styles.js"), "utf8");
  const pal = (name) => { const m = css.match(new RegExp("const " + name + " = `([^`]*)`")); const o = {}; if (m) for (const [, k, v] of m[1].matchAll(/--sf-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)) o[k] = v; return o; };
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const text = ["text", "dim", "strong", "cyan", "amber", "red", "green", "grey", "orange", "heat", "cool", "dry", "fan", "auto", "pink", "yellow"];
  for (const [theme, name, skip] of [["dark", "SF_VARS_DARK", ["grey"]], ["light", "SF_VARS_LIGHT", []]]) {
    const P = pal(name); if (!P.bg0) { bad.push(`05-styles: palette ${name} not found (contrast rule cannot run)`); continue; }
    for (const k of text) if (P[k] && !skip.includes(k)) { const worst = Math.min(...["bg0", "bg1", "bg2"].map((b) => cr(P[k], P[b]))); if (worst < 4.5) bad.push(`05-styles: --sf-${k} (${P[k]}) has contrast ${worst.toFixed(2)}:1 in the ${theme} theme (< 4.5:1 for text)`); }
  }
}
// 8. Versions: the version announced by the code (bootstrap, console banner) is the one at the top of the changelog (the release script tags the same one).
{
  const fs4 = require("fs"), path4 = require("path"), root = path4.join(__dirname, "..");
  const top = (fs4.readFileSync(path4.join(root, "CHANGELOG.md"), "utf8").match(/^## \[(\d+\.\d+\.\d+)\]/m) || [])[1];
  if (!top) bad.push("CHANGELOG.md: no `## [x.y.z]` heading found");
  else {
    const seen = [];
    for (const f of ["01-bootstrap.js", "45-editor-register.js"]) for (const m of fs4.readFileSync(path4.join(root, "src", f), "utf8").matchAll(/SF_CARDS_VERSION = "(\d+\.\d+\.\d+)"|\(v(\d+\.\d+\.\d+)\)|%c v(\d+\.\d+\.\d+) /g)) seen.push([f, m[1] || m[2] || m[3]]);
    if (seen.length < 3) bad.push(`version strings: expected at least 3 in 01-bootstrap / 45-editor-register, found ${seen.length}`);
    for (const [f, v] of seen) if (v !== top) bad.push(`src/${f}: version ${v} differs from the top of CHANGELOG.md (${top})`);
  }
}
// 9. The card contract: a card is not finished until it has what every other card has. The registry (src/30-registry.js) is the list of cards; for each one:
// a full fixture (test/fixtures.js `FULL`, which puts it in every generic test: render, security, editors, lifecycle, robustness, accessibility, taint),
// an editor specification, a "required configuration" rule (or an entry in the list of cards that work with no configuration below), and a mention in the
// README and in the live demo (under its themed name when it has one). Adding a card without one of these fails here, not in review.
{
  const fs5 = require("fs"), path5 = require("path"), rd = (f) => fs5.readFileSync(path5.join(__dirname, "..", f), "utf8");
  const reg = rd("src/30-registry.js"), rules = rd("src/04-config-rules.js"), fx = rd("test/fixtures.js"), specs = rd("src/41-editor-specs.js"), readme = rd("README.md"), demo = rd("docs/index.html");
  const tags = [...reg.matchAll(/\["(sf-[a-z0-9-]+-card)", Sf/g)].map((m) => m[1]);
  const alias = {}; for (const m of (rules.match(/const SF_ALIAS = \{([^}]*)\}/) || ["", ""])[1].matchAll(/"([a-z0-9-]+)": "([a-z0-9-]+)"/g)) alias[m[2]] = m[1];
  const noConfigNeeded = ["sf-bridge-card", "sf-cells-card", "sf-automations-card"];   // they show something useful with an empty configuration
  if (tags.length < 30) bad.push(`registry: expected at least 30 cards, found ${tags.length}`);
  for (const t of tags) {
    const names = [t, alias[t]].filter(Boolean);
    if (!new RegExp(`"${t}"\\s*:`).test(fx)) bad.push(`${t}: no full fixture in test/fixtures.js (FULL)`);
    if (!new RegExp(`"${t}"\\s*:\\s*\\{`).test(specs)) bad.push(`${t}: no editor specification in src/41-editor-specs.js`);
    if (!noConfigNeeded.includes(t) && !new RegExp(`"${t}"\\s*:\\s*\\(`).test(rules)) bad.push(`${t}: no required-configuration rule in src/04-config-rules.js (or add it to the no-configuration list in test/lint.js, with a reason)`);
    if (!names.some((n) => readme.includes(n))) bad.push(`${t}: not mentioned in README.md`);
    if (!names.some((n) => demo.includes(n))) bad.push(`${t}: not shown in the live demo docs/index.html`);
  }
}
if (bad.length) { console.log("FAIL lint: " + bad.length + " problem(s)"); bad.forEach((b) => console.log(" - " + b)); process.exit(1); }
console.log("OK: reliability rules respected");
