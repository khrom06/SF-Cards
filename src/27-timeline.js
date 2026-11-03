/* ============================================================ LIGNE DE TEMPS */
/*
 * Read-only chronological feed: the latest state changes of the chosen entities (Home Assistant logbook), grouped by day,
 * with a readable sentence according to the entity type (door open, motion detected, alarm armed…). No computation or decision: we show the
 * log. Loaded once, refreshed at most every 60 s; after an error, at most one new attempt per minute.
 *
 * type: custom:sf-timeline-card
 * title: Journal
 * hours: 24            # window shown
 * limit: 30            # maximum number of events
 * group: true          # merges identical consecutive repeats ("× 3")
 * hide_unavailable: true
 * entities: [binary_sensor.door, { entity: alarm_control_panel.home, name: Alarme, icon: "mdi:shield-home", color: "#ffb300" }]
 */
const SF_TL_MAX_ENTITIES = 40, SF_TL_RAW_MAX = 2000;
const SF_TL_BIN = {   // binary_sensor by device_class: ["on" sentence, "off" sentence, "on" icon, "off" icon, "on" tone (warn / bad / ok)]
  door: ["ouvert", "fermé", "mdi:door-open", "mdi:door-closed", "warn"], window: ["ouvert", "fermé", "mdi:window-open", "mdi:window-closed", "warn"],
  opening: ["ouvert", "fermé", "mdi:square-outline", "mdi:square", "warn"], garage_door: ["ouvert", "fermé", "mdi:garage-open", "mdi:garage", "warn"],
  motion: ["mouvement détecté", "plus de mouvement", "mdi:motion-sensor", "mdi:motion-sensor-off", "ok"], occupancy: ["présence détectée", "plus de présence", "mdi:account", "mdi:account-off", "ok"],
  presence: ["présent", "absent", "mdi:account", "mdi:account-off", "ok"], moisture: ["fuite détectée", "sec", "mdi:water-alert", "mdi:water-off", "bad"],
  smoke: ["fumée détectée", "plus de fumée", "mdi:smoke", "mdi:smoke-detector", "bad"], connectivity: ["connecté", "déconnecté", "mdi:lan-connect", "mdi:lan-disconnect", "ok"],
  plug: ["branché", "débranché", "mdi:power-plug", "mdi:power-plug-off", "ok"], battery_charging: ["en charge", "charge terminée", "mdi:battery-charging", "mdi:battery", "ok"],
  lock: ["déverrouillé", "verrouillé", "mdi:lock-open", "mdi:lock", "warn"], problem: ["problème", "résolu", "mdi:alert", "mdi:check-circle", "bad"],
};
const SF_TL_ALARM = { disarmed: ["désarmée", "mdi:shield-off", "ok"], armed_home: ["armée (présence)", "mdi:shield-home", "ok"], armed_away: ["armée (absence)", "mdi:shield-lock", "ok"],
  armed_night: ["armée (nuit)", "mdi:shield-moon", "ok"], armed_vacation: ["armée (vacances)", "mdi:shield-airplane", "ok"], triggered: ["déclenchée", "mdi:bell-ring", "bad"],
  arming: ["armement…", "mdi:shield-sync", "ok"], pending: ["en attente", "mdi:shield-sync", "warn"] };
class SfTimelineCard extends SfBase {
  defaults() { return { hours: 24, limit: 30, group: true, hide_unavailable: true, entities: [] }; }
  // Entries: "sensor.x" or { entity, name, icon, color }; valid identifier, 40 at most.
  _ents() {
    const out = [];
    for (const e of Array.isArray(this._config.entities) ? this._config.entities : []) {
      const o = typeof e === "string" ? { entity: e } : e; if (!o || typeof o.entity !== "string" || !/^[a-z0-9_]+\.[a-z0-9_]+$/i.test(o.entity)) continue;
      if (!out.some((x) => x.entity === o.entity)) out.push(o); if (out.length >= SF_TL_MAX_ENTITIES) break;
    }
    return out;
  }
  _hours() { const h = Number(this._config.hours); return isFinite(h) && h >= 1 ? Math.min(720, Math.round(h)) : 24; }
  _keyNow() { return `${this._hours()}|${this._ents().map((e) => e.entity).join(",")}`; }
  get _ld() { return this.__ld || (this.__ld = new SfLoader(this)); }
  get _data() { const d = this._ld.data; return d ? { key: d.key, error: d.error, ev: d.value || [] } : null; }
  setConfig(config) { super.setConfig(config); this._ld.reset(); this._lastHtml = null; this._load(); }
  set hass(h) { this._hass = h; this._load(); this._schedule(); }
  get hass() { return this._hass; }
  connectedCallback() { super.connectedCallback(); this._load(); }
  async _load() {
    if (!this._config) return;   // attached / given `hass` before setConfig: nothing to load yet
    const ents = this._ents();
    if (!ents.length || !this._hass || !this._hass.callWS) return;
    await this._ld.run(this._keyNow(), async () => {
      const now = Date.now();
      const r = await this._hass.callWS({ type: "logbook/get_events", start_time: new Date(now - this._hours() * 3600000).toISOString(), end_time: new Date(now).toISOString(), entity_ids: ents.map((e) => e.entity) });
      const ev = (Array.isArray(r) ? r : []).slice(-SF_TL_RAW_MAX).map((x) => {
        const w = x && x.when, t = typeof w === "number" ? (w > 1e12 ? w : w * 1000) : Date.parse(w || "");
        return x && typeof x.entity_id === "string" && isFinite(t) ? { t, id: x.entity_id, state: x.state === undefined || x.state === null ? "" : String(x.state), msg: typeof x.message === "string" ? x.message : "" } : null;
      }).filter(Boolean).sort((a, b) => b.t - a.t);
      return ev;
    }, { ttl: 60000, fallback: () => [] });
  }
  // Sentence, icon and tone of an event according to the entity (domain, device_class); the tone colours the row: bad (red), warn (amber), ok (cyan), dim.
  _what(ev, cfg) {
    const id = ev.id, dom = id.split(".")[0], st = this.st(id), a = (st && st.attributes) || {}, dc = a.device_class, s = ev.state, sl = s.toLowerCase();
    let txt = "", ico = cfg.icon || a.icon || "mdi:circle-medium", tone = "ok";
    if (["unavailable", "unknown"].includes(sl)) { txt = "indisponible"; tone = "dim"; ico = cfg.icon || "mdi:help-circle-outline"; }
    else if (dom === "binary_sensor" && SF_TL_BIN[dc]) { const b = SF_TL_BIN[dc], on = sl === "on"; txt = on ? b[0] : b[1]; ico = cfg.icon || (on ? b[2] : b[3]); tone = on ? b[4] : "dim"; }
    else if (dom === "alarm_control_panel" && SF_TL_ALARM[sl]) { const b = SF_TL_ALARM[sl]; txt = b[0]; ico = cfg.icon || b[1]; tone = b[2]; }
    else if (dom === "lock") { const un = sl === "unlocked"; txt = un ? "déverrouillé" : sl === "locked" ? "verrouillé" : s; ico = cfg.icon || (un ? "mdi:lock-open" : "mdi:lock"); tone = un ? "warn" : "ok"; }
    else if (dom === "person" || dom === "device_tracker") { txt = sl === "home" ? "présent" : sl === "not_home" ? "absent" : s; ico = cfg.icon || "mdi:account"; }
    else if (["on", "off"].includes(sl)) { txt = sl === "on" ? "activé" : "désactivé"; tone = sl === "on" ? "ok" : "dim"; if (!cfg.icon && dom === "light") ico = sl === "on" ? "mdi:lightbulb-on" : "mdi:lightbulb-off"; }
    else txt = s;
    return { txt, ico, tone };
  }
  css() {
    return `
      .tl { display:flex; flex-direction:column; }
      .day { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:${SF_C.dim}; margin:10px 0 4px; }
      .day:first-child { margin-top:0; }
      .row { display:grid; grid-template-columns: 44px 22px 1fr; gap:8px; align-items:center; padding:5px 4px; border-radius:6px; cursor:pointer; }
      .row:hover { background:rgba(0,229,255,.05); }
      .row .tm { font-size:11px; color:${SF_C.dim}; font-variant-numeric:tabular-nums; }
      .row .ic { display:grid; place-items:center; }
      .row .tx { min-width:0; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .row .tx b { font-weight:400; color:${SF_C.text}; }
      .row .n { font-size:10px; color:${SF_C.dim}; margin-left:6px; }
      .empty { color:${SF_C.dim}; text-align:center; padding:22px 0; }`;
  }
  render() {
    const c = this._config, ents = this._ents(), cfgOf = Object.fromEntries(ents.map((e) => [e.entity, e]));
    const d = this._data && this._data.key === this._keyNow() ? this._data : null, limit = Math.max(1, Math.min(200, Math.round(Number(c.limit)) || 30));
    let rows = d ? d.ev.filter((e) => cfgOf[e.id] && !(c.hide_unavailable !== false && ["unavailable", "unknown"].includes(e.state.toLowerCase()))) : [];
    // same entity, same state as the previous event: not a change; identical consecutive repeats merged if group
    const last = {}, kept = [];
    for (const e of rows.slice().reverse()) { if (last[e.id] === e.state) continue; last[e.id] = e.state; kept.push(e); }
    rows = kept.reverse();
    // per-entity filters: `states` (only these states are shown) and `min_gap` (minimum minutes between two displayed events: cuts a detector's flicker)
    const gapKept = {}, flt = [], lstOf = (v) => (Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v]).map((x) => String(x).trim().toLowerCase());
    for (const e of rows.slice().reverse()) {
      const cf = cfgOf[e.id] || {}, sts = lstOf(cf.states), gap = Number(cf.min_gap) > 0 ? Number(cf.min_gap) * 60000 : 0;
      if (sts.length && !sts.includes(e.state.toLowerCase())) continue;
      if (gap && gapKept[e.id] !== undefined && e.t - gapKept[e.id] < gap) continue;
      gapKept[e.id] = e.t; flt.push(e);
    }
    rows = flt.reverse();
    if (c.group !== false) { const g = []; for (const e of rows) { const p = g[g.length - 1]; if (p && p.id === e.id && p.state === e.state) p.n++; else g.push({ ...e, n: 1 }); } rows = g; }
    rows = rows.slice(0, limit);
    let body;
    if (!d || !rows.length) body = `<div class="empty">${this.esc(this.t(d && !this._ld.busy ? "Aucun événement" : "Chargement…"))}</div>`;
    else {
      const today = new Date().toDateString(), yest = new Date(Date.now() - 86400000).toDateString(); let curDay = "", html = "";
      for (const e of rows) {
        const dt = new Date(e.t), dk = dt.toDateString();
        if (dk !== curDay) { curDay = dk; let lbl; try { lbl = dk === today ? this.t("common.today") : dk === yest ? this.t("timeline.yesterday") : new Intl.DateTimeFormat(this.locLatn, { weekday: "short", day: "numeric", month: "short" }).format(dt); } catch (er) { lbl = dk; } html += `<div class="day">${this.esc(lbl)}</div>`; }
        const cfg = cfgOf[e.id] || {}, w = this._what(e, cfg), st = this.st(e.id), nm = cfg.name || (st && st.attributes.friendly_name) || e.id;
        const col = cfg.color || (w.tone === "bad" ? SF_C.red : w.tone === "warn" ? SF_C.amber : w.tone === "dim" ? SF_C.grey : SF_C.cyan);
        let tm = ""; try { tm = new Intl.DateTimeFormat(this.locLatn, { hour: "2-digit", minute: "2-digit" }).format(dt); } catch (er) { tm = ""; }
        html += `<div class="row" data-e="${this.esc(e.id)}" style="color:${this.esc(col)}"><span class="tm">${this.esc(tm)}</span><span class="ic">${this.icon(w.ico, 16, col)}</span>
          <span class="tx"><b title="${this.esc(nm)}">${this.esc(nm)}</b> · ${this.esc(this.t(w.txt))}${e.n > 1 ? `<span class="n">× ${this.esc(e.n)}</span>` : ""}</span></div>`;
      }
      body = `<div class="tl">${html}</div>`;
    }
    return this.frame(this.esc(c.title || this.t("timeline.timeline")), this.esc(this.t("common.n_h", { n: this._hours() })), body);
  }
  getCardSize() { return 6; }
}

