// The measuring and checking tools must fail visibly (non-zero exit code), never report success after an error.
//   - scripts/bench.mjs: an exception raised while the benchmark runs must end the process with a non-zero code;
//   - scripts/taint.mjs: an interpolation that nobody reviewed must end the process with a non-zero code.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const fails = [];
// 1. bench: the same script with the measuring call replaced by one that throws
const src = fs.readFileSync(path.join(root, "scripts", "bench.mjs"), "utf8");
const needle = 'const res = await ev("runBench()");';
if (!src.includes(needle)) fails.push("bench.mjs: the call this test replaces was not found (update test/tools.mjs)");
else {
  const copy = path.join(root, "scripts", "_bench_selftest.mjs");
  fs.writeFileSync(copy, src.replace(needle, 'const res = await ev("(() => { throw new Error(\\"simulated benchmark failure\\") })()");'));
  const r = spawnSync(process.execPath, [copy], { encoding: "utf8", timeout: 120000 });
  fs.rmSync(copy, { force: true });
  if (r.status === 0 || r.status === null) fails.push(`bench.mjs: exit code ${r.status} after a failure inside the benchmark (a non-zero code is required)`);
}
// 2. taint: a baseline that lacks some reviewed sites must fail
const base = JSON.parse(fs.readFileSync(path.join(root, "test", "taint-reviewed.json"), "utf8"));
base.unreached = base.unreached.slice(5);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sftools-")), bf = path.join(tmp, "base.json");
fs.writeFileSync(bf, JSON.stringify(base));
const t = spawnSync(process.execPath, [path.join(root, "scripts", "taint.mjs")], { encoding: "utf8", env: { ...process.env, TAINT_BASELINE: bf }, timeout: 300000 });
fs.rmSync(tmp, { recursive: true, force: true });
if (t.status === 0 || t.status === null) fails.push("taint.mjs: exit code 0 although 5 unreached interpolations were not on the reviewed list");
else if (!/not reached by any hostile scenario and have not been reviewed/.test(t.stdout)) fails.push("taint.mjs: failed, but not for the expected reason: " + String(t.stdout).slice(-200));
if (fails.length) { console.log("FAIL tools: " + fails.length + " problem(s)"); fails.forEach((f) => console.log(" - " + f)); process.exit(1); }
console.log("OK: the benchmark and taint tools fail visibly (non-zero exit code)");
