/* ==================================================================== ROOM */
/*
 * One room at a glance and under the finger: temperature, humidity, air, presence, lights, covers, scenes and the devices of the room.
 * Give it a Home Assistant area and it finds the entities itself (every one can be set or replaced by hand); three sizes that follow
 * the width the dashboard gives the card.
 *
 * type: custom:sf-room-card
 * area: living_room                  # HA area id: fills everything below that is not set
 * name: Living room    icon: mdi:sofa
 * size: auto                          # auto (from the width) | compact (tile) | standard (controls) | large (history + devices)
 * temperature: sensor.x   humidity: sensor.x   co2: sensor.x   power: sensor.x
 * occupancy: binary_sensor.x          climate: climate.x      media: media_player.x
 * lights: [light.a, light.b]          covers: [cover.a]        windows: [binary_sensor.w]
 * exclude: [light.group_all]          # entities of the area to leave out
 * all_off: true                       # "all off" button for the lights of the room (false to hide)
 * history: 24                         # hours of the temperature curve (large size; 0 = none)
 * tap: popup                          # compact tile: popup (opens the standard card) | none      navigate: /dashboard/room
 * actions: [{ name: Movie, icon: mdi:movie, entity: scene.movie }, { name: Reset, service: script.turn_on, data: {…}, confirm: "Sure?" }]
 * devices: [{ entity: switch.tv, name: TV, icon: mdi:television }]    # rows of the large size (default: found in the area)
 */
const SF_ROOM_OPEN = ["window", "door", "opening", "garage_door"], SF_ROOM_OCC = ["occupancy", "motion", "presence"], SF_EID = /^[a-z0-9_]+\.[a-z0-9_]+$/i;
const SF_ROOM_ACT = { heating: "heat", cooling: "cool", drying: "dry", fan: "fan_only" };
class SfRoomCard extends SfBase {
  defaults() { return { size: "auto" }; }
  static getStubConfig() { return {}; }
  get _ld() { return this.__ld || (this.__ld = new SfLoader(this, { ttl: 600000, retry: 300000 })); }
  setConfig(config) { super.setConfig(config); this._ae = null; if (!this._cfgSame) this._ld.reset(); this._lastHtml = null; }
  set hass(h) { this._hass = h; if (this._lp && this._lp._pop) { this._lp._hass = h; this._lp._pop.card.hass = h; } this._load(); this._schedule(); }
  get hass() { return this._hass; }
  connectedCallback() { super.connectedCallback(); this._load(); }
  disconnectedCallback() { super.disconnectedCallback(); if (this._lp) this._lp._close(false); }
  _ids(v) { return (Array.isArray(v) ? v : v ? [v] : []).filter((x) => typeof x === "string" && SF_EID.test(x)); }
  // Entities of the area (entity registry, or the area of their device), hidden / diagnostic / configuration ones left out. Recomputed only
  // when Home Assistant publishes a new registry.
  _auto() {
    const h = this._hass, c = this._config, area = typeof c.area === "string" ? c.area : "";
    if (!area || !h || !h.entities || !h.states) return {};
    if (this._ae === h.entities && this._ad === h.devices && this._aa === h.areas && this._av) return this._av;
    const ex = new Set(this._ids(c.exclude)), by = {}, a = (h.areas && h.areas[area]) || {};
    for (const id of Object.keys(h.entities).sort()) {
      const e = h.entities[id]; if (!e || e.hidden || e.entity_category || ex.has(id) || !SF_EID.test(id)) continue;
      const dev = e.device_id && h.devices ? h.devices[e.device_id] : null;
      if ((e.area_id || (dev && dev.area_id)) !== area) continue;
      const s = h.states[id]; if (!s) continue;
      const d = id.split(".")[0], dc = s.attributes && s.attributes.device_class;
      const k = d === "sensor" ? (["temperature", "humidity", "carbon_dioxide", "power"].includes(dc) ? dc : "")
        : d === "binary_sensor" ? (SF_ROOM_OCC.includes(dc) ? "occupancy" : SF_ROOM_OPEN.includes(dc) ? "windows" : "")
        : ["light", "cover", "climate", "media_player", "switch", "fan"].includes(d) ? d : "";
      if (k) (by[k] || (by[k] = [])).push(id);
    }
    const roomLike = (id) => { const s = h.states[id], v = s ? parseFloat(s.state) : NaN, f = /F/.test(String((s && s.attributes.unit_of_measurement) || "")); return isFinite(v) && v >= (f ? 41 : 5) && v <= (f ? 104 : 40); };
    if (by.temperature && by.temperature.length > 1) by.temperature.sort((p, q) => Number(roomLike(q)) - Number(roomLike(p)));
    const one = (k) => (by[k] || [])[0] || "", reg = (id) => (typeof id === "string" && SF_EID.test(id) && !ex.has(id) ? id : "");
    this._ae = h.entities; this._ad = h.devices; this._aa = h.areas;
    const temp = reg(a.temperature_entity_id) || one("temperature"), td = temp && h.entities[temp] ? h.entities[temp].device_id : "";
    // several hygrometers (a freezer probe…): the one on the same device as the thermometer is the room's
    if (td && by.humidity && by.humidity.length > 1) by.humidity.sort((p, q) => Number((h.entities[q] || {}).device_id === td) - Number((h.entities[p] || {}).device_id === td));
    return (this._av = { name: a.name || "", icon: a.icon || "", temperature: temp, humidity: reg(a.humidity_entity_id) || one("humidity"),
      co2: one("carbon_dioxide"), power: (by.power || []).length === 1 ? one("power") : "", occupancy: one("occupancy"), climate: one("climate"), media: one("media_player"),
      lights: by.light || [], covers: by.cover || [], windows: by.windows || [], switches: [...(by.switch || []), ...(by.fan || [])] });
  }
  // What the card shows: each value set in the configuration wins over the one found in the area.
  _m() {
    const c = this._config, a = this._auto();
    const pick = (k) => (typeof c[k] === "string" && SF_EID.test(c[k]) ? c[k] : a[k] || "");
    const list = (k, n) => (c[k] !== undefined && c[k] !== null ? this._ids(c[k]) : a[k] || []).slice(0, n);
    return { name: String(c.name || a.name || ""), icon: String(c.icon || a.icon || ""), temperature: pick("temperature"), humidity: pick("humidity"), co2: pick("co2"), power: pick("power"),
      occupancy: pick("occupancy"), climate: pick("climate"), media: pick("media"), lights: list("lights", 12), covers: list("covers", 4), windows: list("windows", 12), switches: (a.switches || []).slice(0, 4) };
  }
  _size() {
    const s = String(this._config.size || "auto");
    if (s === "compact" || s === "standard" || s === "large") return s;
    const w = this.width;
    return !w ? "standard" : w < 280 ? "compact" : w < 620 ? "standard" : "large";
  }
  layoutKey() { return this._size(); }
  _hours() { const n = Number(this._config.history ?? 24); return isFinite(n) && n > 0 ? Math.min(168, n) : 0; }
  async _load() {
    if (!this._config || !this._hass || !this._hass.callWS || !this.isConnected || this._size() !== "large") return;
    const id = this._m().temperature, hrs = this._hours(); if (!id || !hrs) return;
    await this._ld.run(`${id}|${hrs}`, async () => {
      const now = Date.now();
      const r = await this._hass.callWS({ type: "history/history_during_period", start_time: new Date(now - hrs * 3600000).toISOString(), end_time: new Date(now).toISOString(),
        entity_ids: [id], include_start_time_state: true, significant_changes_only: false, minimal_response: true, no_attributes: true });
      const pts = (r && Array.isArray(r[id]) ? r[id] : []).slice(-20000)
        .map((x) => [typeof x.lu === "number" ? x.lu * 1000 : typeof x.lc === "number" ? x.lc * 1000 : Date.parse(x.last_updated || x.last_changed || ""), parseFloat(x.s ?? x.state)])
        .filter((q) => isFinite(q[0]) && isFinite(q[1])).sort((p, q) => p[0] - q[0]);
      const step = Math.max(1, Math.ceil(pts.length / 160));   // at most ~160 points drawn
      return pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
    }, { fallback: () => [] });
  }
  _hm(t) { try { return new Intl.DateTimeFormat(this.locLatn, { hour: "2-digit", minute: "2-digit" }).format(new Date(t)); } catch (e) { return new Date(t).toISOString().slice(11, 16); } }
  _fname(id, room) {
    const s = this.st(id); let n = String((s && s.attributes && s.attributes.friendly_name) || id.split(".")[1].replace(/_/g, " "));
    if (room && n.length > room.length + 1 && n.toLowerCase().startsWith(room.toLowerCase() + " ")) n = n.slice(room.length + 1);   // "Living room lamp" -> "lamp"
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  _svc(id) {
    const d = id.split(".")[0];
    return d === "script" ? "script.turn_on" : d === "scene" ? "scene.turn_on" : d === "button" ? "button.press" : d === "input_button" ? "input_button.press"
      : ["light", "switch", "fan", "input_boolean", "automation"].includes(d) ? `${d}.toggle` : "homeassistant.toggle";
  }
  // Climate of the room: { label, color, target, active }.
  _clim(id) {
    const s = id && this.st(id); if (!s || !this.ok(id)) return null;
    const k = SF_ROOM_ACT[s.attributes.hvac_action], tg = Number(s.attributes.temperature);
    return { label: k ? this.t(SF_HVAC[k][0]) : s.state === "off" ? this.t("common.off") : this.t("common.idle_2"), color: k ? SF_HVAC[k][1] : SF_C.dim, target: isFinite(tg) && s.attributes.temperature !== null ? tg : null, active: !!k };
  }
  // What is on in the room, in a few words (compact tile and header).
  _summary(m) {
    const on = m.lights.filter((x) => this.isOn(x)).length, open = m.windows.filter((x) => this.isOn(x)).length, parts = [];
    if (on) parts.push(this.t(on > 1 ? "room.n_lights" : "room.one_light", { n: on }));
    if (m.media && ["playing", "on", "buffering"].includes((this.st(m.media) || {}).state)) parts.push(this.t("room.media_on"));
    if (open) parts.push(this.t(open > 1 ? "room.n_open" : "room.one_open", { n: open }));
    return { text: parts.length ? parts.join(" · ") : m.lights.length ? this.t("room.all_off") : "", hot: parts.length > 0, alert: open > 0 };
  }
  _occ(m) {
    if (!m.occupancy || !this.ok(m.occupancy)) return null;
    const on = this.isOn(m.occupancy);
    return { on, text: this.t(on ? "room.occupied" : "room.empty") };
  }
  _state(id) {
    const s = this.st(id); if (!s || !this.ok(id)) return { text: this.t("common.unavailable"), color: SF_C.grey };
    const d = id.split(".")[0], dc = s.attributes.device_class, on = this.isOn(id);
    if (d === "binary_sensor" && SF_ROOM_OPEN.includes(dc)) return { text: this.t(on ? "room.open" : "room.closed"), color: on ? SF_C.amber : SF_C.dim };
    if (d === "binary_sensor" && SF_ROOM_OCC.includes(dc)) return { text: on ? this.t("room.motion") : `${this.t("room.clear")} · ${this.ago(id)}`, color: on ? SF_C.green : SF_C.dim };
    if (d === "climate") { const c = this._clim(id); return { text: `${c.label}${c.target === null ? "" : ` · ${this.nf(c.target, 1)}°`}`, color: c.color }; }
    const w = d === "sensor" && s.attributes.device_class === "power" ? this.watts(id) : null;
    if (w !== null) return { text: this.kw(w), color: w > 5 ? SF_C.amber : SF_C.dim };
    if (s.state === "on" || s.state === "off") return { text: this.t(on ? "common.on" : "common.off"), color: on ? SF_C.amber : SF_C.dim };
    let txt = "";
    try { txt = this._hass.formatEntityState ? String(this._hass.formatEntityState(s)) : ""; } catch (e) { txt = ""; }
    return { text: txt || `${s.state}${this.unit(id) ? ` ${this.unit(id)}` : ""}`, color: on ? SF_C.amber : SF_C.dim };
  }
  css() {
    return `
      .rm.empty > .head .dot { background:${SF_C.grey}; box-shadow:none; animation:none; }
      .rm.cp { cursor:pointer; padding:12px 14px 14px; }
      .rm.cp > .head { margin-bottom:8px; }
      .big { display:flex; align-items:baseline; gap:6px; white-space:nowrap; }
      .big .val { font-size:34px; line-height:1; color:var(--sf-strong); text-shadow:0 0 14px rgb(var(--sf-cyan-rgb) / .45); }
      .lg .big .val { font-size:44px; }
      .big .u { color:${SF_C.dim}; font-size:13px; }
      .ln { margin-top:6px; font-size:11px; color:${SF_C.dim}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .sm { margin-top:auto; padding-top:8px; font-size:11px; color:${SF_C.dim}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .sm.hot { color:${SF_C.amber}; }
      .top { display:flex; align-items:center; gap:16px; margin-bottom:14px; }
      .dl { flex:none; width:104px; height:104px; }
      .dl .dt { fill:none; stroke:rgb(var(--sf-cyan-rgb) / .16); stroke-width:6; stroke-linecap:round; }
      .dl .dv { fill:none; stroke-width:6; stroke-linecap:round; filter:drop-shadow(0 0 4px currentColor); transition:stroke-dasharray .8s ease; }
      .dl .dn { fill:var(--sf-strong); font-family:Orbitron,sans-serif; font-size:22px; text-anchor:middle; }
      .dl .ds { fill:${SF_C.amber}; font-family:'B612 Mono',monospace; font-size:10px; text-anchor:middle; }
      .kp { flex:1; min-width:0; display:grid; grid-template-columns:repeat(auto-fit,minmax(86px,1fr)); gap:12px 16px; }
      .kp > div { min-width:0; }
      .kp .lbl { display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; overflow-wrap:normal; }
      .kp .val { display:block; margin-top:3px; font-size:17px; color:var(--sf-strong); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .lts { display:grid; grid-template-columns:repeat(var(--lc,3),minmax(0,1fr)); gap:8px; margin-bottom:12px; }
      .lts .btn { min-height:44px; padding:6px; gap:5px; letter-spacing:0; overflow:hidden; }
      .lts .btn span { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .btn.lt.on { border-color:${SF_C.amber}; background:rgb(var(--sf-amber-rgb) / .14); color:${SF_C.amber}; box-shadow:0 0 10px rgb(var(--sf-amber-rgb) / .25); }
      .cv { display:flex; align-items:center; gap:6px; margin-bottom:10px; }
      .cv .nm { flex:0 1 auto; max-width:55%; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:${SF_C.dim}; }
      .cv .tr { flex:1 1 20px; min-width:12px; height:10px; border-radius:5px; background:rgb(var(--sf-cyan-rgb) / .12); overflow:hidden; }
      .cv .tr i { display:block; height:100%; border-radius:5px; background:${SF_C.cyan}; transition:width .6s ease; }
      .cv .val { flex:none; min-width:40px; margin-inline-end:4px; text-align:end; color:var(--sf-strong); white-space:nowrap; }
      .cv .btn { flex:none; width:36px; min-height:36px; padding:0; }
      .acts { margin-top:auto; padding-top:2px; display:grid; grid-template-columns:repeat(var(--ac,3),minmax(0,1fr)); gap:8px; }
      .acts .btn { min-height:44px; padding:6px 8px; text-align:center; }
      .hist { display:flex; align-items:flex-end; gap:16px; }
      .hist svg { flex:1; min-width:0; height:64px; }
      .hist .li { fill:none; stroke:${SF_C.cyan}; stroke-width:2; vector-effect:non-scaling-stroke; stroke-linejoin:round; }
      .hist .ar { fill:rgb(var(--sf-cyan-rgb) / .10); stroke:none; }
      .hist .tg { stroke:rgb(var(--sf-amber-rgb) / .6); stroke-dasharray:4 4; vector-effect:non-scaling-stroke; }
      .mm { display:flex; justify-content:space-between; gap:8px; margin:6px 0 12px; font-size:11px; color:${SF_C.dim}; }
      .mm .tgt { color:${SF_C.amber}; }
      .cols { display:grid; grid-template-columns:repeat(var(--cc,1),minmax(0,1fr)); gap:4px 22px; align-items:start; }
      .cols > div { min-width:0; display:flex; flex-direction:column; }
      .rw { display:flex; align-items:center; gap:10px; min-height:44px; border-top:1px solid rgb(var(--sf-cyan-rgb) / .14); }
      .rw .nm { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .rw .st { flex:none; max-width:60%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .none { color:${SF_C.dim}; font-size:12px; }`;
  }
  _temp(m) {
    const t = m.temperature ? this.num(m.temperature) : null, cl = this._clim(m.climate), cur = t === null && m.climate && this.st(m.climate) ? Number(this.st(m.climate).attributes.current_temperature) : t;
    const v = cur === null || !isFinite(cur) ? null : cur, unit = (m.temperature && this.unit(m.temperature)) || (this._hass.config && this._hass.config.unit_system && this._hass.config.unit_system.temperature) || "°C";
    return { v, unit: String(unit), cl, id: m.temperature || m.climate || "" };
  }
  _dial(T) {
    const f = /F/.test(T.unit), c = this._config, lo = isFinite(Number(c.min)) && c.min !== undefined && c.min !== null ? Number(c.min) : f ? 50 : 10, hi = isFinite(Number(c.max)) && Number(c.max) > lo ? Number(c.max) : f ? 86 : 30;
    const frac = T.v === null ? 0 : Math.max(0.02, Math.min(1, (T.v - lo) / (hi - lo))), col = T.cl && T.cl.active ? T.cl.color : SF_C.cyan;
    const sub = T.cl && T.cl.target !== null ? `→ ${this.nf(T.cl.target, 1)}°` : T.unit;
    return `<svg class="dl click" viewBox="0 0 104 104" data-e="${this.esc(T.id)}" aria-label="${this.esc(`${this.t("common.temperature")} ${T.v === null ? "—" : this.nf(T.v, 1)} ${T.unit}`)}" style="color:${this.esc(col)}">
      <circle class="dt" cx="52" cy="52" r="44" stroke-dasharray="207.3 276.5" transform="rotate(135 52 52)"/>
      <circle class="dv" cx="52" cy="52" r="44" stroke="${this.esc(col)}" stroke-dasharray="${(frac * 207.3).toFixed(1)} 276.5" transform="rotate(135 52 52)"/>
      <text class="dn" x="52" y="57">${T.v === null ? "—" : this.nf(T.v, 1)}</text><text class="ds" x="52" y="75">${this.esc(sub)}</text></svg>`;
  }
  _kpis(m, T, withTemp) {
    const k = [], add = (lbl, val, col, id) => k.push(`<div class="${id ? "click" : ""}"${id ? ` data-e="${this.esc(id)}"` : ""}><span class="lbl">${this.esc(lbl)}</span><span class="val"${col ? ` style="color:${this.esc(col)}"` : ""}>${val}</span></div>`);
    const h = m.humidity ? this.num(m.humidity) : null, co = m.co2 ? this.num(m.co2) : null, w = m.power ? this.watts(m.power) : null;
    if (withTemp && T.v !== null) add(this.t("common.temperature"), `${this.nf(T.v, 1)} ${this.esc(T.unit)}`, "", T.id);
    if (h !== null) add(this.t("room.humidity"), `${this.nf(h, 0)} %`, "", m.humidity);
    if (co !== null) add("CO₂", `${this.nf(co, 0)} ppm`, co < 800 ? SF_C.green : co < 1200 ? SF_C.amber : SF_C.red, m.co2);
    if (T.cl) add(this.t("room.heating"), this.esc(T.cl.label), T.cl.color, m.climate);
    if (w !== null) add(this.t("room.power"), this.kw(w), "", m.power);
    return k;
  }
  _lights(m, w) {
    if (!m.lights.length) return "";
    const cols = Math.min(m.lights.length, this.balance(m.lights.length, 104, 8, Math.max(0, w - 38)) || 3);
    return `<div class="lts" style="--lc:${cols}">${m.lights.map((id) => `<div class="btn lt ${this.isOn(id) ? "on" : ""}" ${this.toggleCall(id)}>${this.icon((this.st(id) && this.st(id).attributes.icon) || "mdi:lightbulb-outline", 16)}<span>${this.esc(this._fname(id, m.name))}</span></div>`).join("")}</div>`;
  }
  _covers(m) {
    return m.covers.map((id) => {
      const s = this.st(id), ok = this.ok(id), p = ok && isFinite(Number(s.attributes.current_position)) && s.attributes.current_position !== null ? Number(s.attributes.current_position) : ok ? (s.state === "closed" ? 0 : s.state === "open" ? 100 : null) : null;
      const b = (svc, ic, key) => `<span class="btn" title="${this.esc(this.t(key))}" ${this.call(`cover.${svc}`, { entity_id: id })}>${this.icon(ic, 16)}</span>`;
      return `<div class="cv"><span class="nm click" data-e="${this.esc(id)}">${this.esc(this._fname(id, m.name))}</span><div class="tr"><i style="width:${p === null ? 0 : Math.max(0, Math.min(100, p))}%"></i></div>
        <span class="val">${p === null ? "—" : `${this.nf(p, 0)} %`}</span>${b("open_cover", "mdi:arrow-up", "room.cover_open")}${b("stop_cover", "mdi:stop", "room.cover_stop")}${b("close_cover", "mdi:arrow-down", "room.cover_close")}</div>`;
    }).join("");
  }
  _actions(m) {
    const c = this._config, acts = (Array.isArray(c.actions) ? c.actions : []).filter((x) => x && typeof x === "object").slice(0, 6).map((x) => {
      const ent = typeof x.entity === "string" && SF_EID.test(x.entity) ? x.entity : "", conf = x.confirm ? String(x.confirm) : "";
      const call = typeof x.service === "string" && x.service ? this.call(x.service, x.data && typeof x.data === "object" ? x.data : ent ? { entity_id: ent } : {}, conf) : ent ? this.call(this._svc(ent), { entity_id: ent }, conf) : "";
      return call ? `<div class="btn" ${call}>${x.icon ? this.icon(String(x.icon), 16) : ""}${this.esc(x.name || (ent ? this._fname(ent, m.name) : x.service))}</div>` : "";
    }).filter(Boolean);
    if (c.all_off !== false && m.lights.length >= 2) acts.push(`<div class="btn" ${this.call("light.turn_off", { entity_id: m.lights })}>${this.icon("mdi:lightbulb-off-outline", 16)}${this.esc(this.t("room.all_off_btn"))}</div>`);
    return acts.length ? `<div class="acts" style="--ac:${Math.min(3, acts.length)}">${acts.join("")}</div>` : "";
  }
  _history(m, T) {
    const pts = (this._ld.data && Array.isArray(this._ld.data.value) && this._ld.data.key === `${m.temperature}|${this._hours()}` ? this._ld.data.value : []);
    const big = `<div class="big click" data-e="${this.esc(T.id)}"><span class="val">${T.v === null ? "—" : this.nf(T.v, 1)}</span><span class="u">${this.esc(T.unit)}</span></div>`;
    if (pts.length < 2) return `<div class="hist">${big}</div><div class="mm"></div>`;
    let lo = pts[0], hi = pts[0]; for (const p of pts) { if (p[1] < lo[1]) lo = p; if (p[1] > hi[1]) hi = p; }
    const tg = T.cl ? T.cl.target : null, a = Math.min(lo[1], tg ?? lo[1]) - 0.3, b = Math.max(hi[1], tg ?? hi[1]) + 0.3, t0 = pts[0][0], t1 = Math.max(pts[pts.length - 1][0], t0 + 60000);
    const X = (t) => (((t - t0) / (t1 - t0)) * 270).toFixed(1), Y = (v) => (60 - ((v - a) / (b - a)) * 54).toFixed(1), line = pts.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ");
    return `<div class="hist">${big}<svg viewBox="0 0 270 64" preserveAspectRatio="none" role="img" aria-label="${this.esc(this.t("room.curve", { h: this._hours(), a: this.nf(lo[1], 1), b: this.nf(hi[1], 1) }))}">
      ${tg === null ? "" : `<line class="tg" x1="0" x2="270" y1="${Y(tg)}" y2="${Y(tg)}"/>`}<polygon class="ar" points="${line} 270,64 0,64"/><polyline class="li" points="${line}"/></svg></div>
      <div class="mm"><span>${this.esc(this.t("room.min_at", { v: this.nf(lo[1], 1), t: this._hm(lo[0]) }))}</span>${tg === null ? "" : `<span class="tgt">${this.esc(this.t("room.target", { v: this.nf(tg, 1) }))}</span>`}<span>${this.esc(this.t("room.max_at", { v: this.nf(hi[1], 1), t: this._hm(hi[0]) }))}</span></div>`;
  }
  _rows(m) {
    const c = this._config, own = (Array.isArray(c.devices) ? c.devices : []).filter((x) => x && typeof x.entity === "string" && SF_EID.test(x.entity)).slice(0, 10);
    const list = own.length ? own : [m.climate, m.media, ...m.windows.slice(0, 4), m.occupancy, ...m.switches].filter(Boolean).map((entity) => ({ entity }));
    return list.map((x) => { const s = this._state(x.entity); return `<div class="rw click" data-e="${this.esc(x.entity)}">${x.icon ? this.icon(String(x.icon), 16) : ""}<span class="nm">${this.esc(x.name || this._fname(x.entity, m.name))}</span><span class="st" style="color:${this.esc(s.color)}">${this.esc(s.text)}</span></div>`; }).join("");
  }
  render() {
    const m = this._m(), size = this._size(), T = this._temp(m), occ = this._occ(m), sum = this._summary(m), w = this.width;
    const title = `${m.icon ? this.icon(m.icon, 16) : ""}${this.esc(m.name || this.t("room.title"))}`, cls = `rm ${occ && !occ.on ? "empty" : ""}`;
    if (size === "compact") {
      const h = m.humidity ? this.num(m.humidity) : null, line = [h === null ? "" : `${this.nf(h, 0)} %`, occ ? occ.text : "", T.cl && T.cl.active ? T.cl.label : ""].filter(Boolean).join(" · ");
      // a room without a thermometer shows its power draw instead (a utility room with a washing machine), or just what is on
      const pw = T.v === null && m.power ? this.watts(m.power) : null, big = T.v !== null ? `<div class="big"><span class="val">${this.nf(T.v, 1)}</span><span class="u">${this.esc(T.unit)}</span></div>` : pw !== null ? `<div class="big"><span class="val">${this.esc(this.kw(pw))}</span></div>` : "";
      return this.frame(title, "", `${big}
        <div class="ln">${this.esc(line)}</div><div class="sm ${sum.hot ? "hot" : ""}">${this.esc(sum.text)}</div>`, `${cls} cp tile`);
    }
    const sub = occ ? `${this.esc(occ.text)}${occ.on ? "" : ` · ${this.esc(this.ago(m.occupancy))}`}` : this.esc(sum.text);
    const controls = `${this._lights(m, size === "large" && w >= 640 ? w / 2 : w)}${this._covers(m)}${this._actions(m)}`;
    if (size === "large") {
      const k = this._kpis(m, T, false), rows = this._rows(m), two = w >= 640 && controls && rows;
      return this.frame(title, sub, `${this._history(m, T)}${k.length ? `<div class="kp" style="margin-bottom:14px">${k.join("")}</div>` : ""}
        <div class="cols grow" style="--cc:${two ? 2 : 1}">${controls ? `<div>${controls}</div>` : ""}${rows ? `<div>${rows}</div>` : ""}</div>${controls || rows || k.length ? "" : `<div class="none">${this.esc(this.t("room.nothing"))}</div>`}`, `${cls} lg`);
    }
    const k = this._kpis(m, T, false), hasTop = T.v !== null || k.length;
    return this.frame(title, sub, `${hasTop ? `<div class="top">${T.v !== null ? this._dial(T) : ""}${k.length ? `<div class="kp">${k.join("")}</div>` : ""}</div>` : ""}${controls}${hasTop || controls ? "" : `<div class="none">${this.esc(this.t("room.nothing"))}</div>`}`, `${cls} st`);
  }
  afterRender() {
    const tile = this.shadowRoot.querySelector(".hud.cp"); if (!tile) return;
    tile.setAttribute("data-i", "0");
    tile.addEventListener("click", () => this._tap());
  }
  _tap() {
    const c = this._config, nav = typeof c.navigate === "string" ? c.navigate.trim() : "";
    if (/^\/(?!\/)[\w\-/#?=&.%]*$/.test(nav)) { history.pushState(null, "", nav); window.dispatchEvent(new Event("location-changed")); return; }
    if (c.tap === "none" || !customElements.get("sf-launcher-card")) return;
    // The popup is the launcher's own (same sheet, same keyboard and history behaviour): it holds this room in its standard size.
    const l = this._lp || (this._lp = document.createElement("sf-launcher-card"));
    l._config = { tiles: [], theme: this._theme() }; l._hass = this._hass; l._moreInfo = (id) => this._moreInfo(id);
    const card = { ...c, type: "custom:sf-room-card", size: "standard", tap: "none" };
    for (const k of ["grid_options", "layout_options", "view_layout", "visibility", "navigate"]) delete card[k];
    l._open({ name: this._m().name, card }, false);
  }
  getCardSize() { const s = this._config ? this._size() : "standard"; return s === "compact" ? 2 : s === "large" ? 7 : 5; }
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 3 }; }
}
