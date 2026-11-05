// Layout test runner: opens test/layout.html in headless Chrome in REAL time (ResizeObserver needs real frames, so the virtual-time
// mode of the other tests would not exercise the resize behaviour) and prints the verdict. Exit code 1 on any failure.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const chrome = ["google-chrome", "chromium", "chromium-browser"].find((b) => (process.env.PATH || "").split(":").some((d) => { try { fs.accessSync(path.join(d, b), fs.constants.X_OK); return true; } catch { return false; } }));
if (!chrome) { console.error("ERROR: google-chrome/chromium not found"); process.exit(2); }
const port = 9400 + Math.floor(Math.random() * 400), prof = fs.mkdtempSync(path.join(os.tmpdir(), "sf-layout-"));
const proc = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--allow-file-access-from-files", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "--window-size=1600,1200", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const done = (code, msg) => { if (msg) console.log(msg); try { proc.kill("SIGKILL"); } catch { /* gone */ } try { fs.rmSync(prof, { recursive: true, force: true }); } catch { /* ignore */ } process.exit(code); };
setTimeout(() => done(1, "FAIL: the layout test did not finish in 90 s"), 90000).unref();
let page; for (let i = 0; i < 40 && !page; i++) { await sleep(250); try { page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch { /* not up yet */ } }
if (!page) done(1, "FAIL: could not reach Chrome");
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let n = 0; const pend = {}; ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d.result); delete pend[d.id]; } };
const cmd = (method, params = {}) => new Promise((r) => { const id = ++n; pend[id] = r; ws.send(JSON.stringify({ id, method, params })); });
await cmd("Page.enable");
await cmd("Page.navigate", { url: "file://" + path.join(here, "layout.html") });
for (let i = 0; i < 360; i++) {
  await sleep(250);
  const r = await cmd("Runtime.evaluate", { expression: "(document.getElementById('result')||{}).textContent||''", returnByValue: true });
  const v = r && r.result && r.result.value;
  if (v) {
    const res = JSON.parse(v);
    if (res.ok) done(0, "OK: layout tests pass (columns, equal heights, no overflow, no render loop)");
    done(1, `FAIL: ${res.failures.length} layout problem(s)\n` + res.failures.map((f) => " - " + f).join("\n"));
  }
}
done(1, "FAIL: no verdict from the layout test");
