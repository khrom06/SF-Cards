#!/usr/bin/env node
// Exhaustive taint check of every ${...} interpolation of every card template (about 2 000 sites), in headless Chrome. Not part of run.sh (≈2 min).
//   node scripts/taint.mjs [--list-unreached]
// 1. builds an instrumented, unminified copy of src/ in a temp folder where each ${expr} is wrapped in __tc(id, expr);
// 2. runs test/taint.html on it: all 30 cards get hostile values in states, attributes, every configuration string, entity ids, and ~20 entity states;
// 3. fails if a raw hostile value reaches any HTML interpolation (except the few that are known not to be HTML, listed below), and prints the coverage:
//    how many sites ran with hostile data. The sites that never ran are listed with --list-unreached, to be read by hand.
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
  function template(ie) {
    while (i < src.length) {
      const c = src[i];
      if (c === "\\") { i += 2; continue; }
      if (c === "`") { i++; return; }
      if (c === "$" && src[i + 1] === "{") {
        i += 2; const s = i; let depth = 1; const startsEsc = src.startsWith("this.esc(", s);
        while (i < src.length && depth) {
          const d = src[i];
          if (d === "'" || d === '"') { skipStr(d); continue; }
          if (d === "`") { i++; template(ie || startsEsc); continue; }   // a template inside this.esc(...) is escaped as a whole
          if (d === "{") depth++; else if (d === "}") depth--;
          i++;
        }
        const e = i - 1, id = sites.length;
        sites.push({ id, file, line: src.slice(0, s).split("\n").length, expr: src.slice(s, e).replace(/\s+/g, " ").trim(), ie });
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
    if (c === "`") { i++; template(false); continue; }
    i++;
  }
  edits.sort((a, b) => b[0] - a[0]);
  let out = src; for (const [p, t] of edits) out = out.slice(0, p) + t + out.slice(p);
  return out;
}
for (const f of files) { const s = fs.readFileSync(path.join(SRC, f), "utf8"); all += /^0[23]/.test(f) ? s : scan(s, f); }   // fonts and translations hold no interpolation of data
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sftaint-"));
fs.writeFileSync(path.join(tmp, "bundle.js"), all);
const prelude = `<script>
window.__cov = new Set(); window.__raw = new Set(); window.__rawVal = {}; window.__esc = new Set();
const RAWM = 'onerror="window.__x++"', ESCM = 'onerror=&quot;window.__x++&quot;';
window.__tc = (id, v) => { window.__cov.add(id); try { const s = Array.isArray(v) ? v.join("") : typeof v === "string" ? v : ""; if (s && s.includes(ESCM)) window.__esc.add(id); if (s && s.includes(RAWM) && !window.__raw.has(id)) { window.__raw.add(id); window.__rawVal[id] = s.slice(0, 160); } } catch (e) {} return v; };
window.__dumpCov = () => { if (document.getElementById("cov")) return; const p = document.createElement("pre"); p.id = "cov"; p.textContent = JSON.stringify({ cov: [...window.__cov], raw: [...window.__raw], esc: [...window.__esc], rawVal: window.__rawVal }); document.body.appendChild(p); };
</script>`;
let page = fs.readFileSync(path.join(root, "test", "taint.html"), "utf8");
page = page.replace(/<script>\s*window\.__cov[\s\S]*?<\/script>/, "").replace(/<script>\s*window\.__dumpCov[\s\S]*?<\/script>/, "");   // the template carries no prelude: scripts/taint.mjs owns it
page = page.replace("{{BUNDLE}}", "file://" + path.join(tmp, "bundle.js")).replace("{{FIXTURES}}", "file://" + path.join(root, "test", "fixtures.js"));
page = page.replace('<script src="file://' + path.join(tmp, "bundle.js") + '"></script>', prelude + '<script src="file://' + path.join(tmp, "bundle.js") + '"></script>');
fs.writeFileSync(path.join(tmp, "page.html"), page);
const chromeBin = ["google-chrome", "chromium", "chromium-browser"].find((b) => (process.env.PATH || "").split(":").some((d) => fs.existsSync(path.join(d, b))));
if (!chromeBin) { console.error("taint: no Chrome found"); process.exit(2); }
const r = spawnSync(chromeBin, ["--headless=new", "--no-sandbox", "--disable-gpu", "--allow-file-access-from-files", "--virtual-time-budget=500000", "--dump-dom", "file://" + path.join(tmp, "page.html")], { encoding: "utf8", maxBuffer: 1 << 28, timeout: 590000 });
fs.rmSync(tmp, { recursive: true, force: true });
const grab = (id) => { const m = new RegExp(`<pre id="${id}">([^<]*)`).exec(r.stdout || ""); return m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")) : null; };
const verdict = grab("result"), cov = grab("cov");
if (!verdict || !cov) { console.error("taint: the page produced no verdict"); process.exit(1); }
// Interpolations that are not HTML: console messages / textContent of the editors, a URL assigned to a DOM property (never parsed as markup)
const notHtml = (s) => /^46-validate\.js$/.test(s.file) || (s.file === "18-camera.js" && /^base$/.test(s.expr));
const bad = cov.raw.map((id) => sites[id]).filter((s) => !s.ie && !notHtml(s));
const ran = new Set(cov.cov), live = sites.filter((s) => !s.ie);
const unreached = live.filter((s) => !ran.has(s.id));
console.log(`interpolations: ${sites.length} (${live.length} outside this.esc(...)) | ran: ${live.length - unreached.length} | never ran: ${unreached.length} | seen escaped hostile data: ${cov.esc.length}`);
if (process.argv.includes("--list-unreached")) unreached.forEach((s) => console.log(` unreached ${s.file}:${s.line} {${s.expr.slice(0, 90)}}`));
if (!verdict.ok) { console.log("FAIL taint: active content found in a card"); verdict.failures.forEach((f) => console.log(" - " + f)); process.exit(1); }
if (bad.length) { console.log(`FAIL taint: ${bad.length} interpolation(s) received a raw hostile value`); bad.forEach((s) => console.log(` - ${s.file}:${s.line} {${s.expr.slice(0, 90)}} => ${cov.rawVal[s.id]}`)); process.exit(1); }
console.log("OK: no raw hostile value reached any HTML interpolation, no active content in any card");
