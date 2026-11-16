#!/usr/bin/env node
// Reproducible benchmark of the cards in headless Chrome (real time, via the DevTools protocol; needs Node >= 22 and google-chrome / chromium).
//   node scripts/bench.mjs [--throttle 4] [--out file.json]
// Measures: script load, per-card initial render / update cost / DOM nodes / listeners, a 30-card dashboard under 300 unrelated `hass` updates,
// Home Assistant requests, and JS heap before / after 40 mount-unmount cycles of the whole set. Fake data only; results vary with the machine:
// compare runs made on the same machine, back to back.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const throttle = Number(arg("--throttle", 1)), outFile = arg("--out", "");
const chromeBin = ["google-chrome", "chromium", "chromium-browser"].find((b) => { try { return !!fs.accessSync && require_which(b); } catch { return false; } });
function require_which(b) { for (const d of process.env.PATH.split(":")) if (fs.existsSync(path.join(d, b))) return true; return false; }
if (!chromeBin) { console.error("bench: no Chrome found"); process.exit(2); }
const port = 9300 + Math.floor(Math.random() * 500), prof = fs.mkdtempSync("/tmp/sfbench-");
const ch = spawn(chromeBin, ["--headless=new", "--no-sandbox", "--disable-gpu", "--allow-file-access-from-files", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
try {
  let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.length) break; } catch {} await sleep(200); }
  ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { const p = pend.get(d.id); pend.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); } };
  await send("Page.enable"); await send("Runtime.enable"); await send("HeapProfiler.enable");
  if (throttle > 1) await send("Emulation.setCPUThrottlingRate", { rate: throttle });
  await send("Page.navigate", { url: `file://${root}/test/bench.html` });
  for (let i = 0; i < 100; i++) { const r = await send("Runtime.evaluate", { expression: "typeof runBench", returnByValue: true }); if (r.result.value === "function") break; await sleep(200); }
  const ev = async (expression) => { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, timeout: 600000 }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const res = await ev("runBench()");
  const heap = async () => { await send("HeapProfiler.collectGarbage"); await send("HeapProfiler.collectGarbage"); const h = await send("Runtime.getHeapUsage"); return h.usedSize; };
  await ev("cycle(3)"); const h0 = await heap(); const iv = await ev("cycle(40)"); const h1 = await heap();
  res.dupDetail = res.dupDetail || []; res.memory = { heap_before_kb: Math.round(h0 / 1024), heap_after_40_cycles_kb: Math.round(h1 / 1024), growth_kb: Math.round((h1 - h0) / 1024), intervals_live_after: iv };
  res.meta = { throttle, chrome: (await send("Browser.getVersion")).product, date: new Date().toISOString().slice(0, 10), cpus: (await import("node:os")).cpus().length };
  const txt = JSON.stringify(res, null, 1);
  if (outFile) fs.writeFileSync(outFile, txt);
  const c = Object.entries(res.cards);
  console.log(`load+eval ${res.load_ms} ms | dashboard of ${res.dashboard.cards}: first render ${res.dashboard.first_render_ms} ms, update median ${res.dashboard.update_median_ms} ms (p95 ${res.dashboard.update_p95_ms}) | nodes ${res.dashboard.total_nodes}`);
  console.log(`WS: ${res.ws.requests_at_mount} at mount, ${res.ws.requests_after_100_updates} during 100 updates, ${res.ws.identical_requests_repeated} identical requests repeated | heap growth ${res.memory.growth_kb} KB over 40 cycles, intervals left ${res.memory.intervals_live_after}`);
  console.log("slowest initial render:", c.sort((a, b) => b[1].init_ms - a[1].init_ms).slice(0, 4).map(([k, v]) => `${k} ${v.init_ms}ms`).join(", "));
  console.log("slowest idle update :", c.sort((a, b) => b[1].update_same_ms - a[1].update_same_ms).slice(0, 4).map(([k, v]) => `${k} ${v.update_same_ms}ms`).join(", "));
  console.log(`150 automations: ${res.automations150.requests_at_mount} requests at mount, ${res.automations150.requests_after_5_config_edits} more after 5 config edits`);
  console.log("requests after re-applying the same config 5x (mount / extra):", Object.entries(res.reapply).map(([k, v]) => `${k.replace('sf-', '').replace('-card', '')} ${v.at_mount}/${v.after_5_same_config}`).join(", "));
  const pc = Object.entries(res.dashboard_3000_entities.per_card_ms).sort((a, b) => b[1] - a[1]);
  console.log(`house of 3000 extra entities: update median ${res.dashboard_3000_entities.update_median_ms} ms (p95 ${res.dashboard_3000_entities.update_p95_ms}); heaviest: ${pc.slice(0, 4).map(([k, v]) => `${k} ${v}ms`).join(", ")}`);
  if (!outFile) console.log(txt);
} finally { try { ws && ws.close(); } catch {} ch.kill("SIGKILL"); await sleep(400); try { fs.rmSync(prof, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} }
process.exit(0);   // reached only when every step above succeeded: an exception in the try block leaves the program (exit code 1) after the finally block
