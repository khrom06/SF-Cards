
/* ================================================================ STRATEGY */
/*
 * Automatic dashboard: Home Assistant asks this strategy for the whole dashboard and gets views made of SF cards, built from the areas,
 * entities and energy settings it already knows. Nothing is stored: the dashboard follows the house (a new room or lamp appears by itself).
 *
 * In a new dashboard, "Edit dashboard" → raw configuration editor:
 *   strategy:
 *     type: custom:sf-home
 *     # everything below is optional
 *     areas: [living_room, kitchen]        # only these areas, in this order (default: every area with something to show)
 *     exclude_areas: [garage]               exclude: [light.all_lights]      # areas / entities to leave out
 *     views: [home, rooms, climate, energy, security, system]                # which views, in which order; "lights" and "covers" can be added (not in the default list)
 *     weather: weather.home                 # default: the first weather entity
 *     theme: dark | light | auto            look: calm            accent: amber
 *     energy: { grid: sensor.grid_power, solar: sensor.solar_power }        # live powers (W) for the energy flow card
 *     report: { grid: sensor.grid_kwh, solar: sensor.solar_kwh, export: sensor.export_kwh, cost: sensor.cost }   # default: the Energy dashboard settings
 *     home_cards: [ … ]                     extra_views: [ … ]              # your own cards on the home view / your own views after the generated ones
 * Floors (Home Assistant "floors") order the rooms, and title them in the rooms view, when they are defined (and `areas` is not used).
 */
const SF_HOME_MAXITEMS = 150, SF_HOME_COVER_LIST = ["shutter", "blind", "curtain", "shade", "awning", "window"], SF_HOME_COVER_BULK = ["shutter", "blind", "curtain", "shade", "awning"];
const SF_HOME_COVER_RISKY = /garage|portail|portillon|portal|barri(?:er|[eè]re)|gates?(?!way)|(?:^|[^a-z]|front|back|side|main|garden|entry|entrance|house)doors?|porte(?![-_ ]?f[eê]n)/i;   // not "outdoor", "indoor" nor a French "porte-fenêtre" blind
// A garage door or a gate is a security matter. The covers view lists the covers whose device class is a shutter, blind, curtain, shade, awning or window, and the covers with no device class
// (Shelly, ESPHome, MQTT…) unless their id or name looks like a garage, gate or door. The bulk buttons only ever act on the classes SF_HOME_COVER_BULK (a window is listed, never opened in bulk),
// and Open all / Close all only name the covers that support that service (a cover that only tilts would make Home Assistant refuse the whole call).
const sfHomeCoverList = (id, dc, name) => dc ? SF_HOME_COVER_LIST.includes(dc) : !SF_HOME_COVER_RISKY.test(id + " " + name);
function sfHomeList(v) { return (Array.isArray(v) ? v : v ? [v] : []).filter((x) => typeof x === "string" && x); }
// What the house has, read from hass only (no request): global entities (G), lights and covers by area (LC) and the rooms worth showing (areas).
// Shared by the automatic dashboard and by the cards' stub configs (src/32-stubs.js).
function sfHomeScan(c, hass) {
  const states = (hass && hass.states) || {}, ents = (hass && hass.entities) || {}, devs = (hass && hass.devices) || {};
  const ex = new Set(sfHomeList(c.exclude)), exA = new Set(sfHomeList(c.exclude_areas)), per = {}, G = { weather: "", people: [], cameras: [], calendars: [], media: [], leaks: [], openings: [], locks: [], alarm: "" };
  const LC = { light: Object.create(null), cover: Object.create(null) };   // lights and covers by area ("" = no area), for the "lights" and "covers" views
  for (const id of Object.keys(states).sort()) {
    const reg = ents[id]; if (!SF_EID.test(id) || ex.has(id) || (reg && (reg.hidden || reg.entity_category))) continue;
    const s = states[id], d = id.split(".")[0], dc = s && s.attributes && s.attributes.device_class, dev = reg && reg.device_id ? devs[reg.device_id] : null, area = (reg && reg.area_id) || (dev && dev.area_id) || "";
    if (d === "weather") { if (!G.weather) G.weather = id; }
    else if (d === "person") G.people.push(id);
    else if (d === "camera") G.cameras.push(id);
    else if (d === "calendar") G.calendars.push(id);
    else if (d === "media_player") G.media.push(id);
    else if (d === "lock") G.locks.push(id);
    else if (d === "alarm_control_panel") { if (!G.alarm) G.alarm = id; }
    else if (d === "binary_sensor" && dc === "moisture") G.leaks.push(id);
    else if (d === "binary_sensor" && SF_ROOM_OPEN.includes(dc)) G.openings.push(id);
    const ad = s && s.attributes || {}, kind = d === "light" && !Array.isArray(ad.entity_id) ? "light" : d === "cover" && sfHomeCoverList(id, dc, String(ad.friendly_name || "")) ? "cover" : "";   // a light group (it lists entity_id) would double its members
    if (kind && !exA.has(area)) (LC[kind][area] || (LC[kind][area] = [])).push({ id, dim: kind === "light" && Array.isArray(ad.supported_color_modes) && ad.supported_color_modes.some((m) => m !== "onoff" && m !== "unknown"), bulk: kind === "light" || SF_HOME_COVER_BULK.includes(dc), sf: Number.isFinite(ad.supported_features) ? ad.supported_features : null });
    if (!area || exA.has(area)) continue;
    const A = per[area] || (per[area] = { n: 0, climate: "", temp: "", hum: "", hums: [] }), tv = d === "sensor" && dc === "temperature" ? parseFloat(s.state) : NaN;
    if (["light", "cover", "climate", "media_player"].includes(d) || (d === "sensor" && dc === "temperature")) A.n++;
    if (d === "climate" && !A.climate) A.climate = id;
    if (d === "sensor" && dc === "temperature" && (!A.temp || (!A.tempOk && tv >= 5 && tv <= 40))) { A.temp = id; A.tempOk = tv >= 5 && tv <= 40; }   // a freezer probe is not the room temperature
    if (d === "sensor" && dc === "humidity") A.hums.push(id);
  }
  const reg = (hass && hass.areas) || {}, want = sfHomeList(c.areas);
  const byName = (x) => Object.values(reg).find((a) => a && (a.area_id === x || String(a.name || "").toLowerCase() === x.toLowerCase()));
  const areas = (want.length ? want.map(byName).filter((a, i, all) => a && all.findIndex((b) => b === a) === i) : Object.values(reg).filter((a) => a && !exA.has(a.area_id) && ((per[a.area_id] && per[a.area_id].n > 0) || a.temperature_entity_id)))
    .map((a) => {
      const P = per[a.area_id] || {}, temp = (SF_EID.test(String(a.temperature_entity_id || "")) && a.temperature_entity_id) || P.temp || "", td = temp && ents[temp] ? ents[temp].device_id : "";
      const hum = (SF_EID.test(String(a.humidity_entity_id || "")) && a.humidity_entity_id) || (P.hums || []).find((x) => td && ents[x] && ents[x].device_id === td) || (P.hums || [])[0] || "";   // the hygrometer of the thermometer's device first
      const FL = hass && hass.floors && typeof hass.floors === "object" ? hass.floors : {}, fid = typeof a.floor_id === "string" && a.floor_id ? a.floor_id : "", fl = fid && Object.prototype.hasOwnProperty.call(FL, fid) ? FL[fid] : null;
      return { id: a.area_id, name: String(a.name || a.area_id), climate: P.climate || "", temp, hum, fl: fl && typeof fl === "object" ? { id: fid, ix: Object.keys(FL).indexOf(fid), name: String(fl.name || fid), level: Number.isFinite(fl.level) ? fl.level : 999, icon: typeof fl.icon === "string" && /^[a-z0-9-]+:[a-z0-9-]+$/i.test(fl.icon) ? fl.icon : "mdi:layers-outline" } : null };
    });
  // Floors order the rooms (lowest level first, rooms without a floor last) unless the user chose the order with `areas`; the sort is stable.
  if (!want.length && areas.some((a) => a.fl)) areas.sort((x, y) => (x.fl ? x.fl.level : 1e6) - (y.fl ? y.fl.level : 1e6) || (x.fl && y.fl ? x.fl.ix - y.fl.ix : 0));   // same level: the order chosen in Home Assistant
  const name = (id) => String((states[id] && states[id].attributes && states[id].attributes.friendly_name) || id.split(".")[1].replace(/_/g, " "));
  return { states, ents, ex, G, LC, reg, want, areas, name };
}
// The energy counters of the Energy dashboard settings, in the sf-report-card shape (null when the Energy dashboard is not configured).
async function sfHomeEnergyReport(hass, states, name) {
  if (!hass || !hass.callWS) return null;
  try {
    const p = await hass.callWS({ type: "energy/get_prefs" }), src = (p && Array.isArray(p.energy_sources) ? p.energy_sources : []), grid = src.find((x) => x && x.type === "grid") || {}, sol = src.find((x) => x && x.type === "solar");
    const from = (grid.flow_from || [])[0] || {}, to = (grid.flow_to || [])[0] || {};
    const rep = {};
    if (from.stat_energy_from) rep.grid = from.stat_energy_from;
    if (sol && sol.stat_energy_from) { rep.solar = sol.stat_energy_from; if (to.stat_energy_to) rep.export = to.stat_energy_to; }
    // with a price entity, Home Assistant keeps the cost in a counter named after the energy sensor
    if (from.stat_cost) rep.cost = from.stat_cost; else if (from.stat_energy_from && states[`${from.stat_energy_from}_cost`]) rep.cost = `${from.stat_energy_from}_cost`; else if (from.entity_energy_price) rep.price = from.entity_energy_price; else if (typeof from.number_energy_price === "number") rep.price = from.number_energy_price;
    const dv = (p && Array.isArray(p.device_consumption) ? p.device_consumption : []).filter((x) => x && SF_EID.test(String(x.stat_consumption || ""))).slice(0, 12);
    if (dv.length) rep.devices = dv.map((x) => ({ entity: x.stat_consumption, name: String(x.name || name(x.stat_consumption)) }));
    return rep;
  } catch (err) { return null; }   // Energy dashboard not configured
}
async function sfHomeBuild(c, hass) {
  const tr = (k) => sfTr(sfLang(hass), k), { states, ents, ex, G, LC, reg, want, areas, name } = sfHomeScan(c, hass);
  const common = {}; for (const k of ["theme", "look", "accent"]) if (typeof c[k] === "string" && c[k]) common[k] = c[k];
  const sf = (tag, cfg, grid) => ({ type: `custom:${tag}`, ...common, ...cfg, ...(grid ? { grid_options: grid } : {}) });
  // The cards of the other SF repositories (SF Heartbeat, Trace, Horizon, Controls, Copilot) are added where they fit, only when they are
  // installed: their tag is looked up, nothing is imported or requested. `family: false` leaves them out.
  const fam = (tag, cfg) => (c.family !== false && typeof customElements !== "undefined" && customElements.get(tag) ? { type: "custom:" + tag, ...(common.theme ? { theme: common.theme } : {}), ...cfg } : null);
  const shown = (dom) => Object.keys(states).filter((id) => id.startsWith(dom + ".") && SF_EID.test(id) && !ex.has(id) && !(ents[id] && (ents[id].hidden || ents[id].entity_category))).sort();
  const head = (text, icon) => ({ type: "heading", heading: text, heading_style: "title", icon });
  const full = { columns: "full" }, roomEx = ex.size ? { exclude: [...ex].filter((x) => SF_EID.test(x)) } : {};
  const sec = (cards, span) => ({ type: "grid", ...(span ? { column_span: span } : {}), cards: cards.filter(Boolean) });
  const weather = typeof c.weather === "string" && SF_EID.test(c.weather) ? c.weather : G.weather;
  const V = {};
  // --- Home: banner, one tile per room (tap = the room in a popup), weather, media, agenda, leaks.
  {
    const s = [];
    s.push(sec([sf("sf-bridge-card", { ...(weather ? { weather } : {}), people: G.people.slice(0, 8).map((p) => ({ name: name(p), entity: p })), ...(G.leaks.length ? { leaks: G.leaks.slice(0, 20) } : {}) }, full)], 4));
    if (areas.length) s.push(sec([head(tr("home.rooms"), "mdi:floor-plan"), ...areas.map((a) => sf("sf-room-card", { area: a.id, size: "compact", ...roomEx }, { columns: 6, rows: "auto" }))], 2));
    const daily = [weather ? sf("sf-weather-card", { weather }) : null, G.calendars.length ? sf("sf-agenda-card", { calendars: G.calendars.slice(0, 8) }) : null];
    if (daily.some(Boolean)) s.push(sec([head(tr("home.daily"), "mdi:calendar-today"), ...daily]));
    const todo = shown("todo")[0];
    const more = [G.media.length ? sf("sf-media-card", { entities: G.media.slice(0, 8) }) : null, todo ? fam("sf-todo-card", { entity: todo }) : null, G.leaks.length ? sf("sf-alert-card", { leaks: G.leaks.slice(0, 20), hide_sim: true }) : null, ...(Array.isArray(c.home_cards) ? c.home_cards.filter((x) => x && typeof x === "object") : [])];
    if (more.some(Boolean)) s.push(sec(more));
    V.home = { title: tr("home.home"), path: "home", icon: "mdi:home-variant", sections: s };
  }
  // --- Rooms: each room in full.
  if (areas.length) {   // with floors (and no `areas` option), a title section per floor, and "Other rooms" for the rooms without a floor
    const secs = [], byFloor = !want.length && areas.some((a) => a.fl);
    areas.forEach((a, k) => {
      const prev = areas[k - 1], key = (x) => (x && x.fl ? x.fl.id : "");
      if (byFloor && (!k || key(prev) !== key(a))) secs.push(sec([a.fl ? head(a.fl.name, a.fl.icon) : head(tr("home.other_rooms"), "mdi:floor-plan")], 4));
      secs.push(sec([sf("sf-room-card", { area: a.id, ...roomEx })]));
    });
    V.rooms = { title: tr("home.rooms"), path: "rooms", icon: "mdi:floor-plan", sections: secs };
  }
  // --- Lights / Covers (optional views, not in the default list): every light or shutter by room, and a bulk action. Garage doors and gates are left out on purpose.
  const byRoom = (kind) => {   // { groups: the rooms with their devices (at most SF_HOME_MAXITEMS devices shown), bulk: every device of the selected rooms that a bulk button may act on, shown or not }
    const groups = [], bulk = []; let n = 0;
    const add = (title, list) => { list = list || []; list.forEach((i) => { if (i.bulk && !bulk.some((b) => b.id === i.id)) bulk.push(i); }); const items = list.slice(0, Math.max(0, SF_HOME_MAXITEMS - n)); if (items.length) { n += items.length; groups.push({ title, list: items }); } };
    for (const a of areas) add(a.fl ? `${a.fl.name} · ${a.name}` : a.name, LC[kind][a.id]);
    if (!want.length) add(tr("home.no_area"), Object.keys(LC[kind]).filter((k) => k === "" || !Object.prototype.hasOwnProperty.call(reg, k)).flatMap((k) => LC[kind][k]));   // no area, or an area that no longer exists
    return { groups, bulk };
  };
  {
    const { groups: g, bulk } = byRoom("light");
    if (g.length) V.lights = { title: tr("home.lights"), path: "lights", icon: "mdi:lightbulb-group", sections: [sec([sf("sf-controls-card", { title: tr("home.lights"), groups: [
      ...(bulk.length ? [{ title: tr("home.lights"), icon: "mdi:lightbulb-group", items: [{ kind: "action", label: tr("room.all_off_btn"), icon: "mdi:lightbulb-group-off", service: "light.turn_off", data: { entity_id: bulk.map((i) => i.id) }, confirm: tr("editor.confirm") }] }] : []),
      ...g.map((x) => ({ title: x.title, icon: "mdi:floor-plan", items: x.list.map((i) => ({ kind: i.dim ? "dimmer" : "toggle", entity: i.id, label: name(i.id) })) }))] }, full)], 4)] };
  }
  {
    const { groups: g, bulk } = byRoom("cover"), can = (bit) => bulk.filter((i) => i.sf === null || (i.sf & bit)).map((i) => i.id), up = can(1), down = can(2), acts = [];
    if (up.length) acts.push({ kind: "action", label: tr("home.open_all"), icon: "mdi:arrow-up", service: "cover.open_cover", data: { entity_id: up }, confirm: tr("editor.confirm") });
    if (down.length) acts.push({ kind: "action", label: tr("home.close_all"), icon: "mdi:arrow-down", service: "cover.close_cover", data: { entity_id: down }, confirm: tr("editor.confirm") });
    if (g.length) V.covers = { title: tr("home.shutters"), path: "covers", icon: "mdi:window-shutter", sections: [sec([sf("sf-controls-card", { title: tr("home.shutters"), groups: [
      ...(acts.length ? [{ title: tr("home.shutters"), icon: "mdi:window-shutter", items: acts }] : []),
      ...g.map((x) => ({ title: x.title, icon: "mdi:floor-plan", items: x.list.map((i) => ({ kind: "cover", entity: i.id, label: name(i.id) })) }))] }, full)], 4)] };
  }
  // --- Climate: thermostats, and the "should I open the windows?" verdict when rooms have temperature + humidity.
  {
    const th = areas.filter((a) => a.climate), air = areas.filter((a) => a.temp && a.hum).slice(0, 8), s = [];
    if (th.length) s.push(sec([sf("sf-climate-card", { rooms: th.map((a) => ({ name: a.name, climate: a.climate, ...(a.temp ? { temp: a.temp } : {}), ...(a.hum ? { hum: a.hum } : {}) })) }, full)], 2));
    if (air.length && weather) s.push(sec([sf("sf-air-card", { weather, rooms: air.map((a) => ({ name: a.name, temperature: a.temp, humidity: a.hum })) })]));
    const fans = shown("fan").slice(0, 4).map((id) => fam("sf-fan-card", { entity: id })).filter(Boolean);
    if (fans.length) s.push(sec(fans));
    if (s.length) V.climate = { title: tr("home.climate"), path: "climate", icon: "mdi:thermometer", sections: s };
  }
  // --- Energy: live flow when the powers are given, and the report from the Energy dashboard settings (or `report:`).
  {
    const s = [], e = c.energy && typeof c.energy === "object" ? c.energy : {}, flow = {};
    for (const k of ["grid", "solar", "battery_soc", "battery_power"]) if (typeof e[k] === "string" && SF_EID.test(e[k])) flow[k] = e[k];
    if (Object.keys(flow).length) s.push(sec([sf("sf-reactor-card", flow)]));
    let rep = c.report && typeof c.report === "object" ? { ...c.report } : null;
    if (!rep) rep = await sfHomeEnergyReport(hass, states, name);
    if (rep && (SF_EID.test(String(rep.grid || "")) || SF_EID.test(String(rep.solar || "")))) s.push(sec([sf("sf-report-card", rep, full)], 2));
    // a solar forecast sensor (Forecast.Solar, Open-Meteo Solar Forecast…) carries its curve in a `watts` attribute
    const fc = (re) => shown("sensor").find((id) => re.test(id) && !/remaining/.test(id) && states[id].attributes && states[id].attributes.watts && typeof states[id].attributes.watts === "object");
    const today = fc(/today/), hz = today ? fam("sf-horizon-card", { forecast: today, ...(fc(/tomorrow/) ? { forecast_tomorrow: fc(/tomorrow/) } : {}) }) : null;
    if (hz) s.push(sec([hz]));
    if (s.length) V.energy = { title: tr("home.energy"), path: "energy", icon: "mdi:lightning-bolt", sections: s };
  }
  // --- Security: cameras, what opened and when.
  {
    const s = [], watch = [...(G.alarm ? [G.alarm] : []), ...G.locks, ...G.openings].slice(0, 16);
    if (G.cameras.length) s.push(sec([sf("sf-camera-card", { cameras: G.cameras.slice(0, 6).map((x) => ({ entity: x, name: name(x) })) }, full)], 2));
    if (watch.length) s.push(sec([sf("sf-timeline-card", { hours: 24, entities: watch })]));
    const tr2 = watch.length ? fam("sf-trace-card", { hours: 24, entities: watch }) : null;   // who opened, locked or armed it
    if (tr2) s.push(sec([tr2]));
    if (s.length) V.security = { title: tr("home.security"), path: "security", icon: "mdi:shield-home", sections: s };
  }
  // --- System: sensor batteries and automations.
  V.system = { title: tr("home.system"), path: "system", icon: "mdi:cog-outline", sections: [sec([sf("sf-cells-card", {}), fam("sf-heartbeat-card", { scan_unavailable: true })]), sec([sf("sf-automations-card", {}), fam("sf-copilot-card", {})])] };
  const order = sfHomeList(c.views).length ? sfHomeList(c.views) : ["home", "rooms", "climate", "energy", "security", "system"];
  const views = order.map((k) => V[k]).filter(Boolean).map((v) => ({ type: "sections", max_columns: 4, ...v }));
  if (Array.isArray(c.extra_views)) views.push(...c.extra_views.filter((x) => x && typeof x === "object"));
  return { ...(typeof c.title === "string" && c.title ? { title: c.title } : {}), views: views.length ? views : [{ title: "SF", cards: [] }] };
}
class SfHomeStrategy extends HTMLElement {
  static async generate(config, hass) {
    try { return await sfHomeBuild(config && typeof config === "object" ? config : {}, hass); }
    catch (e) { return { views: [{ title: "SF", cards: [{ type: "markdown", content: `SF Cards, automatic dashboard: ${String((e && e.message) || e).replace(/[<>]/g, "")}` }] }] }; }
  }
}
if (!customElements.get("ll-strategy-dashboard-sf-home")) customElements.define("ll-strategy-dashboard-sf-home", SfHomeStrategy);
window.customStrategies = window.customStrategies || [];
if (!window.customStrategies.some((x) => x.type === "sf-home")) window.customStrategies.push({ type: "sf-home", strategyType: "dashboard", name: "SF · Home (automatic)", description: "A whole dashboard of SF cards built from your areas: rooms, climate, energy, security, system.", documentationURL: "https://github.com/khrom06/SF-Cards#automatic-dashboard" });
