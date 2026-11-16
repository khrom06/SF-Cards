#!/usr/bin/env node
// Taint check of every ${...} interpolation of every card template (about 2 000 sites), in headless Chrome. Run by CI (validate workflow), ≈1 min.
//   node scripts/taint.mjs [--list-unreached] [--update-baseline]
// 1. builds an instrumented, unminified copy of src/ in a temp folder where each ${expr} is wrapped in __tc(id, expr);
// 2. runs test/taint.html on it: all 30 cards get hostile values in states, attributes, every configuration string, entity ids, and ~20 entity states;
// 3. fails if a raw hostile value reaches any HTML interpolation (except the few that are known not to be HTML, listed below);
// 4. a site that no hostile scenario reaches is only allowed if it is listed in test/taint-reviewed.json, i.e. someone read it. The list says, for each site, whether the
//    normal render suite (benign data) runs it or nobody does. A new or changed unreached site fails the check until it is exercised or reviewed and added with
//    --update-baseline. Hostile texts: HTML + attribute break-outs, encoded entities, a literal unicode escape, <style> / <script> break-outs, expression syntax.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "src");
const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".js")).sort();
const sites = []; let all = "";
function scan(src, file) {
  const edits = []; let i = 0;
  const skipStr = (q) => { i++; while (i < src.length && src[i] !== q) { if (src[i] === "\\") i++; i++; } i++; };
  function template(ie, st) {
    while (i < src.length) {
      const c = src[i];
      if (c === "\\") { i += 2; continue; }
      if (c === "`") { i++; return; }
      if (c === "$" && src[i + 1] === "{") {
        i += 2; const s = i; let depth = 1; const startsEsc = src.startsWith("this.esc(", s);
        while (i < src.length && depth) {
          const d = src[i];
          if (d === "'" || d === '"') { skipStr(d); continue; }
          if (d === "`") { i++; template(ie || startsEsc, i); continue; }   // a template inside this.esc(...) is escaped as a whole
          if (d === "{") depth++; else if (d === "}") depth--;
          i++;
        }
        const e = i - 1, id = sites.length;
        const before = src.slice(st, s - 2), lt = before.lastIndexOf("<"), gt = before.lastIndexOf(">"), tagText = lt > gt ? before.slice(lt) : "";
        const ctx = before.lastIndexOf("<style") > before.lastIndexOf("</style") ? "style-text" : lt > gt ? (/(src|href)\s*=\s*["']?[^"']*$/.test(tagText) ? "url-attr" : /style\s*=\s*"[^"]*$/.test(tagText) ? "style-attr" : (tagText.match(/"/g) || []).length % 2 ? "attr" : "tag") : "text";
        sites.push({ id, file, line: src.slice(0, s).split("\n").length, expr: src.slice(s, e).replace(/\s+/g, " ").trim(), ie, ctx });
        edits.push([s, `__tc(${id},(`], [e, "))"]);
        continue;
      }
      i++;
    }
  }
  while (i < src.length) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2) + 2; continue; }
    if (c === "'" || c === '"') { skipStr(c); continue; }
    if (c === "`") { i++; template(false, i); continue; }
    i++;
  }
  edits.sort((a, b) => b[0] - a[0]);
  let out = src; for (const [p, t] of edits) out = out.slice(0, p) + t + out.slice(p);
  return out;
}
for (const f of files) { const s = fs.readFileSync(path.join(SRC, f), "utf8"); all += /^0[23]/.test(f) ? s : scan(s, f); }   // fonts and translations hold no interpolation of data
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sftaint-"));
process.on("exit", () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {} });
const bundle = path.join(tmp, "bundle.js");
fs.writeFileSync(bundle, all);
// every shape of hostile text that carries a recognisable marker; a raw (unescaped) copy of one of them in an interpolation is a failure
const prelude = `<script>
window.__cov = new Set(); window.__raw = new Set(); window.__rawVal = {}; window.__esc = new Set();
const RAWM = ['onerror="window.__x++"', '</style><script>window.__x++', '" autofocus onfocus="', "'><svg/onload=window.__x++>"], ESCM = 'onerror=&quot;window.__x++&quot;';
window.__tc = (id, v) => { window.__cov.add(id); try { const s = Array.isArray(v) ? v.join("") : typeof v === "string" ? v : ""; if (s) { if (s.includes(ESCM)) window.__esc.add(id); if (RAWM.some((m) => s.includes(m)) && !window.__raw.has(id)) { window.__raw.add(id); window.__rawVal[id] = s.slice(0, 160); } } } catch (e) {} return v; };
window.__dumpCov = () => { if (document.getElementById("cov")) return; const p = document.createElement("pre"); p.id = "cov"; p.textContent = JSON.stringify({ cov: [...window.__cov], raw: [...window.__raw], esc: [...window.__esc], rawVal: window.__rawVal }); document.body.appendChild(p); };
</script>`;
const bundleTag = `<script src="file://${bundle}"></script>`;
// page 1: the hostile scenarios
let page = fs.readFileSync(path.join(root, "test", "taint.html"), "utf8");
page = page.replace(/<script>\s*window\.__cov[\s\S]*?<\/script>/, "").replace(/<script>\s*window\.__dumpCov[\s\S]*?<\/script>/, "");   // this script owns the prelude
page = page.replace("{{BUNDLE}}", "file://" + bundle).replace("{{FIXTURES}}", "file://" + path.join(root, "test", "fixtures.js")).replace(`<script src="file://${bundle}"></script>`, prelude + bundleTag);
fs.writeFileSync(path.join(tmp, "page.html"), page);
// page 2: the ordinary render suite (benign data, many special configurations) on the same instrumented bundle, only to tell "run with benign data" from "never run"
let rpage = fs.readFileSync(path.join(root, "test", "render.html"), "utf8");
rpage = rpage.replace('<script src="../dist/sf-cards.js"></script>', prelude + bundleTag).replace('<script src="fixtures.js"></script>', `<script src="file://${path.join(root, "test", "fixtures.js")}"></script>`)
  .replace("</body>", "") + '\n<script>const __w = setInterval(() => { if (document.getElementById("result")) { clearInterval(__w); window.__dumpCov(); } }, 300);</script>\n';
fs.writeFileSync(path.join(tmp, "render.html"), rpage);
const chromeBin = ["google-chrome", "chromium", "chromium-browser"].find((b) => (process.env.PATH || "").split(":").some((d) => fs.existsSync(path.join(d, b))));
if (!chromeBin) { console.error("taint: no Chrome found"); process.exit(2); }
const run = (file) => spawnSync(chromeBin, ["--headless=new", "--no-sandbox", "--disable-gpu", "--allow-file-access-from-files", "--virtual-time-budget=500000", "--dump-dom", "file://" + path.join(tmp, file)], { encoding: "utf8", maxBuffer: 1 << 28, timeout: 590000 });
const grab = (out, id) => { const m = new RegExp(`<pre id="${id}">([^<]*)`).exec(out || ""); return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")) : null; };
// A few branches depend on the measured width of a card, so which sites a run reaches varies a little. Sites are therefore judged over several runs:
// "reached" = reached in at least one run; the reviewed list is the union of the unreached sets of 3 runs when it is written, and when it is checked a
// fresh unreached site only fails if it stays unreached in every one of up to 3 runs.
const RUNS = [];
const once = () => { const r1 = run("page.html"), r2 = run("render.html"); const o = { verdict: grab(r1.stdout, "result"), cov: grab(r1.stdout, "cov"), cov2: grab(r2.stdout, "cov") };
  if (!o.verdict || !o.cov || !o.cov2) { console.error(`taint: a page produced no verdict (hostile page: result ${!!o.verdict}, coverage ${!!o.cov}; render page coverage ${!!o.cov2}; stderr: ${String(r1.stderr || r2.stderr).slice(0, 200)})`); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(1); }
  RUNS.push(o); return o; };
const first = once();
const verdict = first.verdict, cov = first.cov;
// Interpolations that are not HTML: console messages / textContent of the editors, a URL assigned to a DOM property (never parsed as markup)
const notHtml = (s) => /^46-validate\.js$/.test(s.file) || (s.file === "18-camera.js" && /^base$/.test(s.expr));
const bad = RUNS.flatMap((o) => o.cov.raw).map((id) => sites[id]).filter((s) => !s.ie && !notHtml(s));
const ran = new Set(RUNS.flatMap((o) => o.cov.cov)), ranBenign = new Set(RUNS.flatMap((o) => o.cov2.cov)), live = sites.filter((s) => !s.ie);
const recompute = () => { RUNS.forEach((o) => o.cov.cov.forEach((id) => ran.add(id))); RUNS.forEach((o) => o.cov2.cov.forEach((id) => ranBenign.add(id))); };
const unreachedNow = () => live.filter((s) => !ran.has(s.id));
let unreached = unreachedNow();
const byCtx = {}; live.forEach((s) => { byCtx[s.ctx] = (byCtx[s.ctx] || 0) + 1; });
console.log(`interpolations: ${sites.length} (${live.length} outside this.esc(...); by context: ${Object.entries(byCtx).map(([k, v]) => `${k} ${v}`).join(", ")})`);
console.log(`ran with hostile data: ${live.length - unreached.length} | never reached by a hostile scenario: ${unreached.length} (run with benign data by the render suite: ${unreached.filter((s) => ranBenign.has(s.id)).length}, run by nobody: ${unreached.filter((s) => !ranBenign.has(s.id)).length}) | seen escaped hostile data: ${cov.esc.length}`);
// key = file + expression + occurrence index (line numbers move, the expression and its rank in the file do not)
const seen = {}, key = (s) => { const k = `${s.file}|${s.expr}`; seen[k] = (seen[k] || 0) + 1; return `${k}#${seen[k]}`; };
sites.forEach((s) => { s.key = key(s); });
const BASE = process.env.TAINT_BASELINE || path.join(root, "test", "taint-reviewed.json");   // TAINT_BASELINE: used by test/tools.mjs to check that a missing review fails
const entries = unreached.map((s) => ({ key: s.key, ctx: s.ctx, benignSuite: ranBenign.has(s.id) }));
if (process.argv.includes("--list-unreached")) unreached.forEach((s) => console.log(` unreached ${s.file}:${s.line} [${s.ctx}${ranBenign.has(s.id) ? ", benign suite" : ", nobody"}] {${s.expr.slice(0, 90)}}`));
if (!verdict.ok) { console.log("FAIL taint: active content found in a card"); verdict.failures.forEach((f) => console.log(" - " + f)); process.exit(1); }
if (bad.length) { console.log(`FAIL taint: ${bad.length} interpolation(s) received a raw hostile value`); bad.forEach((s) => console.log(` - ${s.file}:${s.line} {${s.expr.slice(0, 90)}} => ${cov.rawVal[s.id]}`)); process.exit(1); }
if (process.argv.includes("--update-baseline")) {
  while (RUNS.length < 3) { const o = once(); if (!o.verdict.ok) break; recompute(); }
  unreached = unreachedNow(); entries.length = 0; unreached.forEach((s) => entries.push({ key: s.key, ctx: s.ctx, benignSuite: ranBenign.has(s.id) }));
  fs.writeFileSync(BASE, JSON.stringify({ note: "Interpolation sites that no hostile scenario of test/taint.html reaches. Each one was read by a person (see docs/audit/02-security-audit.md and 11-followup.md) and found to carry no user text, or only text escaped by this.esc() / a number / a constant. benignSuite = run by the ordinary render suite with benign data. Regenerate with `node scripts/taint.mjs --update-baseline` ONLY after reading every new entry.", unreached: entries }, null, 1) + "\n");
  console.log(`baseline written: ${entries.length} reviewed unreached sites`); process.exit(0);
}
if (!fs.existsSync(BASE)) { console.log("FAIL taint: test/taint-reviewed.json is missing (create it with --update-baseline after reading the unreached sites)"); process.exit(1); }
const known = new Set(JSON.parse(fs.readFileSync(BASE, "utf8")).unreached.map((e) => e.key)), now = new Set(unreached.map((x) => x.key));
let fresh = unreached.filter((s) => !known.has(s.key));
while (fresh.length && RUNS.length < 3) { const o = once(); if (!o.verdict.ok) break; recompute(); unreached = unreachedNow(); fresh = unreached.filter((s) => !known.has(s.key)); }
const stale = [...known].filter((k) => !now.has(k));
if (fresh.length) { console.log(`FAIL taint: ${fresh.length} interpolation(s) are not reached by any hostile scenario and have not been reviewed:`); fresh.slice(0, 25).forEach((s) => console.log(` - ${s.file}:${s.line} [${s.ctx}] {${s.expr.slice(0, 90)}}`)); console.log("Exercise them in test/taint.html, or read them and run: node scripts/taint.mjs --update-baseline"); process.exit(1); }
fs.rmSync(tmp, { recursive: true, force: true });
if (stale.length) console.log(`note: ${stale.length} reviewed entr${stale.length === 1 ? "y is" : "ies are"} no longer unreached (code now exercised or removed); refresh with --update-baseline`);
console.log(`OK: no raw hostile value reached any HTML interpolation, no active content in any card, every unreached site (${unreached.length}) is on the reviewed list`);
