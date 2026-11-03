// Reliability rules on dist/sf-cards.js (patterns that have already frozen a browser or leaked in production). Non-zero exit code if a rule fails.
const fs = require("fs");
const src = fs.readFileSync(__dirname + "/../dist/sf-cards.js", "utf8"), lines = src.split("\n"), bad = [];
const at = (i) => `dist/sf-cards.js:${i + 1}`;
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
if (bad.length) { console.log("FAIL lint: " + bad.length + " problem(s)"); bad.forEach((b) => console.log(" - " + b)); process.exit(1); }
console.log("OK: reliability rules respected");
