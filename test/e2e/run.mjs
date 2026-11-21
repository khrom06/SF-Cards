// End-to-end test on a REAL Home Assistant (container): the real frontend components (ha-form, ha-entity-picker, card editor)
// that the simulated tests cannot exercise. Mainly detects FREEZES (render / observer loops) and JavaScript errors.
// Run by .github/workflows/ha-e2e.yml. Variable: HA_URL (default http://localhost:8123).
import { chromium } from "playwright";
import fs from "node:fs";

const HA = process.env.HA_URL || "http://localhost:8123", CID = HA + "/", USER = "ci", PASS = "ci-" + Math.random().toString(36).slice(2, 12);
const FULL = JSON.parse(fs.readFileSync(new URL("./full-configs.json", import.meta.url), "utf8"));
const fails = [], warns = [], log = (...a) => console.log(...a);
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
const EDIT_TAGS = ["sf-trend-card", "sf-timeline-card", "sf-health-card", "sf-assistant-card", "sf-launcher-card", "sf-machines-card", "sf-room-card", "sf-media-card", "sf-weather-card", "sf-agenda-card", "sf-report-card"].filter((t) => FULL[t]);
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
  // Automatic dashboard (v1.20): a dashboard whose whole configuration is the SF strategy.
  r = await W.call({ type: "lovelace/dashboards/create", url_path: "e2e-auto", title: "auto", mode: "storage", require_admin: false, show_in_sidebar: false }); if (!r.success) throw new Error("dashboard auto: " + JSON.stringify(r));
  r = await W.call({ type: "lovelace/config/save", url_path: "e2e-auto", config: { strategy: { type: "custom:sf-home" } } }); if (!r.success) throw new Error("config auto: " + JSON.stringify(r));
  // A second house (v1.24): the Home Assistant `demo` integration brings real lights, covers and thermostats; we give them floors and areas, and ask the strategy for all the views.
  const fl0 = await W.call({ type: "config/floor_registry/create", name: "Ground floor", level: 0 }), fl1 = await W.call({ type: "config/floor_registry/create", name: "First floor", level: 1 });
  const mk = async (name, fl) => { const x = await W.call({ type: "config/area_registry/create", name, ...(fl && fl.success ? { floor_id: fl.result.floor_id } : {}) }); return x.success ? x.result.area_id : null; };
  const ar = { kitchen: await mk("Kitchen", fl0), living: await mk("Living room", fl0), bedroom: await mk("Bedroom", fl1), garage: await mk("Garage", null) };
  // The demo integration loads after the onboarding: wait until its entities exist before giving them an area.
  for (let i = 0; i < 60; i++) { const g = await W.call({ type: "get_states" }); if (g.success && g.result.some((x) => x.entity_id === "light.bed_light") && g.result.some((x) => x.entity_id === "cover.garage_door")) break; await sleep(2000); }
  for (const [ent, area] of [["light.bed_light", "bedroom"], ["light.kitchen_lights", "kitchen"], ["light.ceiling_lights", "living"], ["cover.kitchen_window", "kitchen"], ["cover.living_room_window", "living"], ["cover.garage_door", "garage"], ["climate.hvac", "living"], ["climate.heatpump", "bedroom"]])
    if (ar[area]) {   // recent Home Assistant refuses an area on an entity that has no name of its own: the area then goes on its device
      let u = await W.call({ type: "config/entity_registry/update", entity_id: ent, area_id: ar[area] });
      if (!u.success) { const g = await W.call({ type: "config/entity_registry/get", entity_id: ent }), dev = g.success && g.result && g.result.device_id;
        u = dev ? await W.call({ type: "config/device_registry/update", device_id: dev, area_id: ar[area] }) : u; }
      if (!u.success) fails.push("e2e setup: could not put " + ent + " in an area (" + JSON.stringify(u.error || u).slice(0, 120) + ")"); }
  r = await W.call({ type: "lovelace/dashboards/create", url_path: "e2e-all", title: "all", mode: "storage", require_admin: false, show_in_sidebar: false }); if (!r.success) throw new Error("dashboard all: " + JSON.stringify(r));
  r = await W.call({ type: "lovelace/config/save", url_path: "e2e-all", config: { strategy: { type: "custom:sf-home", views: ["home", "rooms", "lights", "covers", "climate", "energy", "security", "system"] } } }); if (!r.success) throw new Error("config all: " + JSON.stringify(r));
  W.close(); log("dashboard created (" + tags.length + " cards)");

  const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((t) => { localStorage.setItem("hassTokens", JSON.stringify({ access_token: t.access_token, token_type: "Bearer", expires_in: 1800, hassUrl: location.origin, clientId: location.origin + "/", expires: Date.now() + 1700000, refresh_token: t.refresh_token })); }, tok);
  const page = await ctx.newPage(), errs = [];
  // An error counts as ours when SF-Cards code is in its stack or message; the frontend of Home Assistant has errors of its own (an aborted view transition, an
  // unparsable rejection...) that depend on its version. Those are listed as warnings. A freeze is detected separately (alive()), whatever the source.
  const ours = (t) => /sf-cards|sf-[a-z-]+-card|SF Cards|SF-CARDS/i.test(t);
  page.on("pageerror", (e) => { const t = e.message + " | " + String(e.stack || "").split("\n").slice(0, 4).join(" / "); (ours(t) ? errs : warns).push("pageerror: " + t.slice(0, 300)); });
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|net::ERR|Failed to load resource/.test(m.text())) (ours(m.text() + " " + (m.location().url || "")) ? errs : warns).push("console: " + m.text().slice(0, 200)); });
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
  try { await editBtn.click({ timeout: 8000 }); } catch { try { await sleep(3000); await editBtn.click({ timeout: 8000 }); } catch { fails.push("editor: the card's 'Edit' button was not found (HA interface changed?)"); } }   // one retry, as for the new cards below: the view may still be loading (flaky on slow CI runners)
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
    // The picker's search ordering differs between Home Assistant versions ("e2e temp b" may list temp A first): what matters is that a real entity of the
    // test house was taken into account (an older picker keeps the typed text as the value) and nothing froze.
    if (!/e2e[ _]temp/i.test(String(picked))) fails.push(`editor: the chosen entity is not taken into account (value: ${picked})`);
  }
  // 3. Editor of each new card: opens, does not freeze, and an entity choice in its real picker breaks nothing.
  for (const tag of EDIT_TAGS) {
    try {
      await page.goto(HA + "/e2e-test/ed-" + tag + "?edit=1", { waitUntil: "domcontentloaded" }); await sleep(4000); await alive("edit mode " + tag);
      const editBtn2 = page.getByRole("button", { name: /^edit$/i }).first();
      let clicked = false; for (let k = 0; k < 3 && !clicked; k++) { try { await editBtn2.click({ timeout: 8000 }); clicked = true; } catch { await sleep(3000); } }   // up to three tries: the view may still be loading (slower since the demo integration is on)
      if (!clicked) { fails.push(`${tag}: 'Edit' button not found`); continue; }
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
  // 4. Automatic dashboard: Home Assistant asks the strategy for the views; the home view must show the banner, and nothing freezes.
  try {
    await page.goto(HA + "/e2e-auto/home", { waitUntil: "domcontentloaded" }); await sleep(7000); await alive("automatic dashboard");
    const auto = await page.evaluate(() => { const f = (root, acc = []) => { root.querySelectorAll("*").forEach((e) => { if (/^sf-[a-z-]+-card$/.test(e.localName)) acc.push(e.localName); if (e.shadowRoot) f(e.shadowRoot, acc); }); return acc; }; return f(document); });
    log("automatic dashboard cards:", auto.join(", ") || "none");
    if (!auto.includes("sf-bridge-card")) fails.push("automatic dashboard: the home view did not render the banner (strategy not loaded?)");
    await page.goto(HA + "/e2e-auto/system", { waitUntil: "domcontentloaded" }); await sleep(5000); await alive("automatic dashboard, system view");
  } catch (e) { if (e.message === "freeze") throw e; fails.push("automatic dashboard: " + String(e.message).split("\n")[0]); }
  // 4b. The same strategy on the demo house, every view (lights and covers included, floors on the rooms view): renders, shows the right devices, nothing freezes.
  try {
    const deepText = (sel) => page.evaluate((q) => { const out = []; const f = (root) => root.querySelectorAll("*").forEach((e) => { if (e.matches && e.matches(q)) out.push(e.shadowRoot ? e.shadowRoot.textContent : e.textContent); if (e.shadowRoot) f(e.shadowRoot); }); f(document); return out.join(" ").replace(/\s+/g, " "); }, sel);
    for (const v of ["home", "rooms", "lights", "covers", "climate", "energy", "security", "system"]) { await page.goto(HA + "/e2e-all/" + v, { waitUntil: "domcontentloaded" }); await sleep(6000); await alive("automatic dashboard (demo house), view " + v); }
    await page.goto(HA + "/e2e-all/lights", { waitUntil: "domcontentloaded" }); await sleep(6000);
    const lt = await deepText("sf-controls-card"); log("lights view:", lt.slice(0, 160));
    if (!/Bed Light/i.test(lt) || !/Kitchen Lights/i.test(lt)) fails.push("lights view: the demo lights are not listed: " + lt.slice(0, 120));
    if (ar.bedroom && !/First floor . Bedroom/i.test(lt)) fails.push("lights view: groups are not titled with their floor: " + lt.slice(0, 160));
    await page.goto(HA + "/e2e-all/covers", { waitUntil: "domcontentloaded" }); await sleep(6000);
    const ct = await deepText("sf-controls-card"); log("covers view:", ct.slice(0, 160));
    if (!/Kitchen Window/i.test(ct)) fails.push("covers view: the demo shutters are not listed: " + ct.slice(0, 120));
    if (/Garage Door/i.test(ct)) fails.push("covers view: a garage door must never be in the covers view (bulk 'close all')");
    await page.goto(HA + "/e2e-all/rooms", { waitUntil: "domcontentloaded" }); await sleep(6000);
    const rt = await deepText("hui-heading-card"); if (ar.bedroom && !(/Ground floor/.test(rt) && /First floor/.test(rt))) fails.push("rooms view: one title per floor expected, got: " + rt.slice(0, 120));
  } catch (e) { if (e.message === "freeze") throw e; fails.push("automatic dashboard (demo house): " + String(e.message).split("\n")[0]); }
  if (errs.length) fails.push(...[...new Set(errs)].slice(0, 8).map((e) => "erreur JS : " + e));
  await browser.close();
}

main().catch((e) => { if (e.message !== "freeze") fails.push("exception: " + (e.stack || e.message).split("\n").slice(0, 3).join(" | ")); }).finally(() => {
  if (fails.length) { console.log("FAIL e2e: " + fails.length + " problem(s)"); fails.forEach((f) => console.log(" - " + f)); process.exit(1); }
  if (warns.length) console.log(`note: ${warns.length} error(s) from Home Assistant's own frontend, not from SF-Cards (first: ${warns[0].slice(0, 160)})`);
  console.log("OK: e2e on a real Home Assistant");
});
