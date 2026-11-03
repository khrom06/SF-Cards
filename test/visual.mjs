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
const tags = fs.readFileSync(path.join(here, "fixtures.js"), "utf8").match(/^  "(sf-[a-z-]+-card)":/gm).map((m) => m.match(/"(.*?)"/)[1]).filter((t, i, a) => a.indexOf(t) === i).filter((t) => !only || t === only);
const outDir = process.env.VISUAL_OUT || "/tmp/sf-visual"; fs.mkdirSync(outDir, { recursive: true });
const res = {};
for (const tag of tags) for (const theme of themes) {
  const png = path.join(outDir, `${tag}.${theme}.png`);
  execFileSync("google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-prefers-reduced-motion", "--allow-file-access-from-files", "--virtual-time-budget=4000",
    "--window-size=600,1400", `--screenshot=${png}`, `file://${path.join(here, "visual.html")}?tag=${tag}&theme=${theme}`], { env: { ...process.env, TZ: "UTC" }, stdio: "ignore", timeout: 60000 });
  res[`${tag}|${theme}`] = crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex").slice(0, 16);
}
// Migration mode: --baseline=DIR compares each PNG with DIR/<tag>.<theme>.png using scripts/pngdiff.mjs and tolerates rounding noise (--tolerance=N, default 3
// levels out of 255 per channel) — for refactorings that must stay visually identical but may round translucent colours differently.
if (arg("baseline")) {
  const { diff } = await import("../scripts/pngdiff.mjs"), tol = Number(arg("tolerance") || 3), bad = [];
  for (const tag of tags) for (const theme of themes) { const a = path.join(arg("baseline"), `${tag}.${theme}.png`), b = path.join(outDir, `${tag}.${theme}.png`);
    if (!fs.existsSync(a)) { bad.push(`${tag}|${theme} (no baseline)`); continue; }
    const d = diff(a, b); if (d.size || d.maxDelta > tol) bad.push(`${tag}|${theme} ${JSON.stringify(d)}`); }
  if (bad.length) { console.error(`FAIL: ${bad.length} screenshot(s) differ from the baseline by more than ${tol}/255:\n  ${bad.join("\n  ")}`); process.exit(1); }
  console.log(`OK: ${tags.length * themes.length} screenshots within ${tol}/255 of the baseline`); process.exit(0);
}
if (process.argv.includes("--update")) { const old = fs.existsSync(ref) ? JSON.parse(fs.readFileSync(ref, "utf8")) : {}; fs.writeFileSync(ref, JSON.stringify({ ...old, ...res }, null, 1) + "\n"); console.log(`visual reference updated: ${Object.keys(res).length} screenshots (PNGs in ${outDir})`); process.exit(0); }
const want = JSON.parse(fs.readFileSync(ref, "utf8")), diff = Object.keys(res).filter((k) => want[k] !== res[k]);
if (diff.length) { console.error(`FAIL: ${diff.length} screenshot(s) differ from test/visual.json: ${diff.join(", ")} (PNGs in ${outDir})`); process.exit(1); }
console.log(`OK: ${Object.keys(res).length} screenshots identical to the reference`);
