// Render snapshots: node test/snapshots.mjs [--update]
// Renders test/snapshot.html in headless Chrome (TZ=UTC) and compares the hashes with test/snapshots.json (or rewrites it with --update).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), file = path.join(here, "snapshots.json");
const chrome = ["google-chrome", "chromium", "chromium-browser"].find((c) => { try { execFileSync("which", [c], { stdio: "ignore" }); return true; } catch { return false; } });
if (!chrome) { console.error("ERROR: google-chrome/chromium not found"); process.exit(2); }
const dom = execFileSync(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--allow-file-access-from-files", "--virtual-time-budget=300000", "--dump-dom", "file://" + path.join(here, "snapshot.html")],
  { env: { ...process.env, TZ: "UTC" }, maxBuffer: 64 * 1024 * 1024, timeout: 280000, stdio: ["ignore", "pipe", "ignore"] }).toString();
const m = dom.match(/<pre id="result">([^<]*)/);
if (!m) { console.error("FAIL: the snapshot page produced no result (loading error?)"); process.exit(1); }
const res = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
if (res.errors.length) { console.error("FAIL: JavaScript errors while rendering: " + res.errors.slice(0, 3).join(" | ")); process.exit(1); }
if (process.argv.includes("--update")) { fs.writeFileSync(file, JSON.stringify(res.hashes, null, 1) + "\n"); console.log(`snapshots updated: ${Object.keys(res.hashes).length} renders`); process.exit(0); }
const want = JSON.parse(fs.readFileSync(file, "utf8")), diff = [];
let cssOnly = 0;
for (const k of new Set([...Object.keys(want), ...Object.keys(res.hashes)])) if (want[k] !== res.hashes[k]) { diff.push(k); if (want[k] && res.hashes[k] && want[k].split(".")[0] === res.hashes[k].split(".")[0]) cssOnly++; }
if (diff.length) { console.error(`FAIL: ${diff.length} render(s) differ from test/snapshots.json (${cssOnly} with the CSS only, ${diff.length - cssOnly} with the markup/text; e.g. ${diff.slice(0, 4).join(", ")}). If the change is intended: node test/snapshots.mjs --update`); process.exit(1); }
console.log(`OK: ${Object.keys(want).length} renders identical to the snapshots`);
