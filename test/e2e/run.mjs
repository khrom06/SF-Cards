// End-to-end test on a REAL Home Assistant (container): the real frontend components (ha-form, ha-entity-picker, card editor)
// that the simulated tests cannot exercise. Mainly detects FREEZES (render / observer loops) and JavaScript errors.
// Run by .github/workflows/ha-e2e.yml. Variable: HA_URL (default http://localhost:8123).
import { chromium } from "playwright";
import fs from "node:fs";

const HA = process.env.HA_URL || "http://localhost:8123", CID = HA + "/", USER = "ci", PASS = "ci-" + Math.random().toString(36).slice(2, 12);
const FULL = JSON.parse(fs.readFileSync(new URL("./full-configs.json", import.meta.url), "utf8"));
const fails = [], log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, opt = {}) { const r = await fetch(HA + path, opt); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { ok: r.ok, status: r.status, j }; }

async function waitReady() { for (let i = 0; i < 120; i++) { try { const r = await fetch(HA + "/api/onboarding"); if (r.ok) return; } catch { /* starting up */ } await sleep(2000); } throw new Error("HA does not start"); }

async function onboard() {
  const u = await api("/api/onboarding/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_id: CID, name: "CI", username: USER, password: PASS, language: "en" }) });
  if (!u.ok) throw new Error("onboarding/users : " + u.status + " " + JSON.stringify(u.j).slice(0, 200));
  const t = await api("/auth/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code: u.j.auth_code, client_id: CID }) });
  if (!t.ok) throw new Error("auth/token : " + t.status);
  const H = { authorization: "Bearer " + t.j.access_token, "content-type": "application/json" };
  for (const step of ["core_config", "analytics"]) await api("/api/onboarding/" + step, { method: "POST", headers: H, body: "{}" });
  await api("/api/onboarding/integration", { method: "POST", headers: H, body: JSON.stringify({ client_id: CID, redirect_uri: CID + "?auth_callback=1" }) });
  return t.j;
}

function ws(token) {
  return new Promise((resolve, reject) => {
    const s = new WebSocket(HA.replace("http", "ws") + "/api/websocket"); let n = 0; const P = {};
    const call = (o) => new Promise((r) => { const id = ++n; P[id] = r; s.send(JSON.stringify({ id, ...o })); });
    s.onmessage = (m) => { const d = JSON.parse(m.data);
      if (d.type === "auth_required") s.send(JSON.stringify({ type: "auth", access_token: token }));
      else if (d.type === "auth_ok") resolve({ call, close: () => s.close() });
      else if (d.type === "result" && P[d.id]) P[d.id](d); };
    s.onerror = reject;
  });
}

const tags = Object.keys(FULL);
const EDIT_TAGS = ["sf-trend-card", "sf-timeline-card", "sf-health-card", "sf-assistant-card", "sf-launcher-card", "sf-machines-card"].filter((t) => FULL[t]);
const dashConfig = { views: [{ title: "e2e", path: "e2e", type: "masonry", cards: tags.map((t) => ({ type: "custom:" + t, ...FULL[t] })) },
  ...EDIT_TAGS.map((t) => ({ title: "ed " + t, path: "ed-" + t, type: "masonry", cards: [{ type: "custom:" + t, ...FULL[t] }] })),
  { title: "pick", path: "pick", type: "masonry", cards: [{ type: "custom:sf-machines-card", title: "Pick", tiles: [{ label: "A", entity: "sensor.e2e_temp_a", kind: "value", digits: 1 }] }] }] };

async function main() {
  await waitReady();
  const tok = await onboard(); log("onboarding OK");
  const W = await ws(tok.access_token);
  let r = await W.call({ type: "lovelace/resources/create", res_type: "module", url: "/local/sf-cards.js" }); if (!r.success) throw new Error("resource: " + JSON.stringify(r));
  r = await W.call({ type: "lovelace/dashboards/create", url_path: "e2e-test", title: "e2e", mode: "storage", require_admin: false, show_in_sidebar: false }); if (!r.success) throw new Error("dashboard : " + JSON.stringify(r));
  r = await W.call({ type: "lovelace/config/save", url_path: "e2e-test", config: dashConfig }); if (!r.success) throw new Error("config: " + JSON.stringify(r));
  W.close(); log("dashboard created (" + tags.length + " cards)");

  const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((t) => { localStorage.setItem("hassTokens", JSON.stringify({ access_token: t.access_token, token_type: "Bearer", expires_in: 1800, hassUrl: location.origin, clientId: location.origin + "/", expires: Date.now() + 1700000, refresh_token: t.refresh_token })); }, tok);
  const page = await ctx.newPage(), errs = [];
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|net::ERR|Failed to load resource/.test(m.text())) errs.push("console: " + m.text().slice(0, 200)); });
  // A freeze shows as an evaluation that never completes: we require a rAF to come back within 8 s.
  const alive = async (label) => { try { await Promise.race([page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(1)))), sleep(8000).then(() => { throw new Error("gel"); })]); } catch { fails.push(`FREEZE: the page no longer responds after '${label}'`); throw new Error("freeze"); } };

  // 1. Render every card on a real HA.
  await page.goto(HA + "/e2e-test/e2e", { waitUntil: "domcontentloaded" }); await sleep(6000); await alive("chargement du dashboard");
  // The cards file can arrive late on a slow CI server: wait (40 s at most) until the last card is defined before counting.
  await page.waitForFunction((t) => t.every((x) => customElements.get(x)), tags, { timeout: 40000 }).catch(() => {});
  const defined = await page.evaluate((t) => t.filter((x) => customElements.get(x)), tags);
  if (defined.length !== tags.length) fails.push(`cards not registered: ${tags.filter((x) => !defined.includes(x)).join(", ")}`);
  log("cards registered:", defined.length + "/" + tags.length);

  // 2. Editor: open the editor of the "Pick" card, choose another entity in the real picker, check that the page does not freeze.
  await page.goto(HA + "/e2e-test/pick?edit=1", { waitUntil: "domcontentloaded" }); await sleep(5000); await alive("edit mode");
  const editBtn = page.getByRole("button", { name: /^edit$/i }).first();
  try { await editBtn.click({ timeout: 8000 }); } catch { fails.push("editor: the card's 'Edit' button was not found (HA interface changed?)"); }
  await sleep(3000); await alive("opening the card editor");
  const ed = await page.evaluate(() => { const f = (root, p, acc = []) => { root.querySelectorAll("*").forEach((e) => { if (p(e)) acc.push(e); if (e.shadowRoot) f(e.shadowRoot, p, acc); }); return acc; }; return f(document, (e) => e.localName === "sf-machines-card-editor").length; });
  log("SF editors open:", ed);
  if (!ed) fails.push("editor: sf-machines-card-editor did not appear in the dialog");
  else {
    // open the first tile then the entity picker (real ha-entity-picker)
    await page.locator("sf-machines-card-editor details summary").first().click({ timeout: 5000 }).catch(() => {});
    await sleep(800);
    const picker = page.locator("sf-machines-card-editor ha-entity-picker").first();
    try { await picker.click({ timeout: 5000 }); await sleep(800); await page.keyboard.type("e2e temp b"); await sleep(800); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); }
    catch (e) { fails.push("editor: could not open the entity picker (" + String(e.message).split("\n")[0] + ")"); }
    await sleep(2500); await alive("choosing an entity in the editor");   // <- this is where the 2026-11-03 freeze used to happen
    const picked = await page.evaluate(() => { const f = (root, p, acc = []) => { root.querySelectorAll("*").forEach((e) => { if (p(e)) acc.push(e); if (e.shadowRoot) f(e.shadowRoot, p, acc); }); return acc; }; const e = f(document, (x) => x.localName === "ha-entity-picker")[0]; return e && (e.value || null); });
    log("entity chosen:", picked);
    if (picked !== "sensor.e2e_temp_b") fails.push(`editor: the chosen entity is not taken into account (value: ${picked})`);
  }
  // 3. Editor of each new card: opens, does not freeze, and an entity choice in its real picker breaks nothing.
  for (const tag of EDIT_TAGS) {
    try {
      await page.goto(HA + "/e2e-test/ed-" + tag + "?edit=1", { waitUntil: "domcontentloaded" }); await sleep(4000); await alive("edit mode " + tag);
      try { await page.getByRole("button", { name: /^edit$/i }).first().click({ timeout: 8000 }); } catch { fails.push(`${tag}: 'Edit' button not found`); continue; }
      await sleep(3000); await alive("opening the editor " + tag);
      const n = await page.evaluate((t) => { const f = (root, p, acc = []) => { root.querySelectorAll("*").forEach((e) => { if (p(e)) acc.push(e); if (e.shadowRoot) f(e.shadowRoot, p, acc); }); return acc; }; return f(document, (e) => e.localName === t + "-editor").length; }, tag);
      if (!n) { fails.push(`${tag}: editor missing from the dialog`); continue; }
      await page.locator(`${tag}-editor details summary`).first().click({ timeout: 4000 }).catch(() => {}); await sleep(600);
      const picker = page.locator(`${tag}-editor ha-entity-picker`).first();
      if (await picker.count()) { try { await picker.click({ timeout: 4000 }); await sleep(700); await page.keyboard.type("e2e temp"); await sleep(700); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); } catch (e) { /* non-interactive picker: harmless */ } }
      await sleep(2000); await alive("choosing an entity in the editor " + tag);
      log("editor OK:", tag);
      await page.keyboard.press("Escape"); await sleep(500);
    } catch (e) { if (e.message === "freeze") throw e; fails.push(`${tag} : ${String(e.message).split("\n")[0]}`); }
  }
  if (errs.length) fails.push(...[...new Set(errs)].slice(0, 8).map((e) => "erreur JS : " + e));
  await browser.close();
}

main().catch((e) => { if (e.message !== "freeze") fails.push("exception: " + (e.stack || e.message).split("\n").slice(0, 3).join(" | ")); }).finally(() => {
  if (fails.length) { console.log("FAIL e2e: " + fails.length + " problem(s)"); fails.forEach((f) => console.log(" - " + f)); process.exit(1); }
  console.log("OK: e2e on a real Home Assistant");
});
