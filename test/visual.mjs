// Visual regression: node test/visual.mjs [--update] [--only=sf-xxx-card] [--themes=dark,light]
// Screenshots every card (frozen clock, no animation, stand-in icons) and compares the PNG hash with test/visual.json. Local developer check:
// pixel output can differ between Chrome versions and machines, so it is not part of run.sh / CI. --update rewrites the reference.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), ref = path.join(here, "visual.json");
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").split("=")[1];
const themes = (arg("themes") || "dark,light").split(","), only = arg("only");
const tags = fs.readFileSync(path.join(here, "fixtures.js"), "utf8").match(/^  "(sf-[a-z-]+-card)":/gm).map((m) => m.match(/"(.*?)"/)[1]).filter((t) => !only || t === only);
const outDir = process.env.VISUAL_OUT || "/tmp/sf-visual"; fs.mkdirSync(outDir, { recursive: true });
const res = {};
for (const tag of tags) for (const theme of themes) {
  const png = path.join(outDir, `${tag}.${theme}.png`);
  execFileSync("google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-prefers-reduced-motion", "--allow-file-access-from-files", "--virtual-time-budget=4000",
    "--window-size=600,1400", `--screenshot=${png}`, `file://${path.join(here, "visual.html")}?tag=${tag}&theme=${theme}`], { env: { ...process.env, TZ: "UTC" }, stdio: "ignore", timeout: 60000 });
  res[`${tag}|${theme}`] = crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex").slice(0, 16);
}
if (process.argv.includes("--update")) { const old = fs.existsSync(ref) ? JSON.parse(fs.readFileSync(ref, "utf8")) : {}; fs.writeFileSync(ref, JSON.stringify({ ...old, ...res }, null, 1) + "\n"); console.log(`visual reference updated: ${Object.keys(res).length} screenshots (PNGs in ${outDir})`); process.exit(0); }
const want = JSON.parse(fs.readFileSync(ref, "utf8")), diff = Object.keys(res).filter((k) => want[k] !== res[k]);
if (diff.length) { console.error(`FAIL: ${diff.length} screenshot(s) differ from test/visual.json: ${diff.join(", ")} (PNGs in ${outDir})`); process.exit(1); }
console.log(`OK: ${Object.keys(res).length} screenshots identical to the reference`);
