/* ---------------------------------------------------------------- MACHINES */
/*
 * type: custom:sf-machines-card
 * tiles:
 *   - label: CPU host
 *     entity: sensor.x
 *     kind: percent | value | binary | duration | timestamp | text
 *     warn: 70          # thresholds (percent/value); invert: true if "low = bad"
 *     crit: 90
 *     invert: false
 *     ok_state: "on"    # binary: state considered OK
 *     unit: "°C"        # force the unit
 */
class SfMachinesCard extends SfBase {
  defaults() { return { tiles: [] }; }
  set hass(h) { this._hass = h; this._loadSpark(); this._schedule(); }
  get hass() { return this._hass; }
  get _ld() { return this.__ld || (this.__ld = new SfLoader(this)); }
  get _sp() { const d = this._ld.data; return d ? { key: d.key, error: d.error, pts: d.value || {} } : null; }
  setConfig(config) { super.setConfig(config); this._ld.reset(); this._loadSpark(); }
  // Mini-curve of a tile (`spark: true` = 24 h, or a number of hours, 1 to 168): history of the entities loaded together (one request per distinct duration,
  // 3 at most), refreshed at most every 5 minutes; after a failure, at most one retry per minute (hass is called several times per second).
  _sparkTiles() {
    const out = [];
    for (const t of Array.isArray(this._config.tiles) ? this._config.tiles : []) {
      if (!t || typeof t.entity !== "string" || !/^[a-z0-9_]+\.[a-z0-9_]+$/i.test(t.entity) || !["value", "percent", undefined].includes(t.kind)) continue;
      const h = t.spark === true ? 24 : Number(t.spark); if (!(isFinite(h) && h >= 1)) continue;
      out.push({ id: t.entity, h: Math.min(168, Math.round(h)) });
    }
    return out.slice(0, 40);
  }
  async _loadSpark() {
    if (!this._config) return;   // attached / given `hass` before setConfig: nothing to load yet
    const st = this._sparkTiles();
    if (!st.length || !this._hass || !this._hass.callWS) return;
    await this._ld.run(st.map((x) => `${x.id}@${x.h}`).join(","), async () => {
      const now = Date.now();
      const groups = new Map(); for (const x of st) { if (!groups.has(x.h)) groups.set(x.h, new Set()); groups.get(x.h).add(x.id); }
      const pts = {};
      for (const [h, ids] of [...groups].slice(0, 3)) {
        const t0 = now - h * 3600000, r = await this._hass.callWS({ type: "history/history_during_period", start_time: new Date(t0).toISOString(), end_time: new Date(now).toISOString(),
          entity_ids: [...ids], include_start_time_state: true, significant_changes_only: false, minimal_response: true, no_attributes: true });
        for (const id of ids) {
          const raw = (r && Array.isArray(r[id]) ? r[id] : []).map((x) => [typeof x.lu === "number" ? x.lu * 1000 : typeof x.lc === "number" ? x.lc * 1000 : Date.parse(x.last_updated || x.last_changed || ""), parseFloat(x.s ?? x.state)])
            .filter((q) => isFinite(q[0]) && isFinite(q[1])).sort((a, b) => a[0] - b[0]).map(([t, v]) => [Math.max(t, t0), v]);
          if (raw.length && raw[raw.length - 1][0] < now) raw.push([now, raw[raw.length - 1][1]]);   // a stable entity gets a flat line up to now
          pts[`${id}@${h}`] = { t0, t1: now, p: sfTrendReduce(raw, t0, now, 48) };
        }
      }
      return pts;
    }, { ttl: 300000, fallback: () => ({}) });
  }
  _spark(t, col) {
    const h = t.spark === true ? 24 : Math.min(168, Math.round(Number(t.spark))), d = this._sp && this._sp.pts[`${t.entity}@${h}`];
    if (!d || !d.p.length) return `<div class="spk"></div>`;
    const v = d.p.map((q) => q[1]); let lo = Math.min(...v), hi = Math.max(...v); if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const X = (tm) => (((tm - d.t0) / (d.t1 - d.t0)) * 100).toFixed(1), Y = (val) => (21 - ((val - lo) / (hi - lo)) * 20).toFixed(1);
    const path = d.p.map(([tm, val], k) => `${k ? "L" : "M"}${X(tm)} ${Y(val)}`).join("");
    return `<svg class="spk" viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true"><path class="sa" d="${path}L${X(d.p[d.p.length - 1][0])} 22L${X(d.p[0][0])} 22Z" fill="${this.esc(col)}"/><path d="${path}" stroke="${this.esc(col)}"/></svg>`;
  }
  css() {
    return `
      .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap:10px; }
      .tile { position:relative; padding:10px 11px 12px; border-radius:10px;
        background: linear-gradient(160deg, rgb(var(--sf-cyan-rgb) / .07), rgb(var(--sf-cyan-rgb) / .015));
        border:1px solid rgb(var(--sf-cyan-rgb) / .16); }
      .tile .v { font-family:Orbitron,sans-serif; font-size:19px; margin-top:6px; }
      .tile .u { font-size:10px; color:${SF_C.dim}; margin-left:3px; }
      .bar { height:3px; margin-top:8px; border-radius:2px; background:rgb(var(--sf-fg-rgb) / .07); overflow:hidden; }
      .bar i { display:block; height:100%; border-radius:2px; transition: width 1s; }
      .led { position:absolute; top:10px; right:10px; width:7px; height:7px; border-radius:50%; }
      .spk { display:block; width:100%; height:22px; margin-top:8px; }
      .spk path { fill:none; stroke-width:1.6; stroke-linejoin:round; stroke-linecap:round; vector-effect:non-scaling-stroke; }
      .spk .sa { stroke:none; opacity:.14; }
      .pulse { height:26px; margin-top:12px; opacity:.75; }
      .pulse path { fill:none; stroke:${SF_C.cyan}; stroke-width:1.4; stroke-dasharray:40 220;
        animation: beat 2.4s linear infinite; filter:drop-shadow(0 0 3px ${SF_C.cyan}); }
      @keyframes beat { from { stroke-dashoffset:260; } to { stroke-dashoffset:0; } }`;
  }
  _dur(sec) {
    const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    return h ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
  }
  _tile(t) {
    const id = t.entity, kind = t.kind || "value";
    if (kind === "toggle") {
      // `timer` + `stop`: while the timer runs, the tile shows the remaining time and a press stops it (2 presses).
      const tm = this.timerInfo(t.timer), dead = !this.ok(id);
      const on = tm.actif || this.isOn(id), col = dead ? SF_C.grey : on ? (t.color || SF_C.cyan) : SF_C.grey;
      const act = tm.actif && t.stop ? this.call("homeassistant.turn_off", { entity_id: t.stop }, this.t("common.stop")) : this.toggleCall(id);
      const txt = dead ? "—" : tm.actif ? (tm.reste === null ? "ON" : `${tm.reste} min`) : on ? "ON" : "OFF";
      return `<div class="tile" ${act} style="cursor:pointer">
        <span class="led" style="background:${this.esc(col)};box-shadow:0 0 6px ${this.esc(col)}"></span>
        <div class="lbl">${this.esc(t.label)}</div><div class="v" style="color:${this.esc(dead ? SF_C.grey : "var(--sf-strong)")}">${txt}</div></div>`;
    }
    let v = "—", u = "", col = SF_C.grey, pct = null;
    if (this.ok(id)) {
      const s = this.st(id), n = this.num(id);
      col = SF_C.green;
      if (kind === "binary") {
        const good = s.state === (t.ok_state || "on");
        v = good ? "OK" : (t.bad_text || "KO"); col = good ? SF_C.green : SF_C.red;
      } else if (kind === "duration" && n !== null) {
        v = this._dur(n); pct = t.max ? Math.min(100, (n / t.max) * 100) : null;
        if (t.warn !== undefined && n < t.warn) col = SF_C.amber;
      } else if (kind === "timestamp") {
        const d = new Date(s.state);
        v = isNaN(d) ? s.state : d.toLocaleString(this.locLatn, { weekday: "short", hour: "2-digit", minute: "2-digit" });
        col = SF_C.cyan;
      } else if (kind === "text" || n === null) {
        v = t.map && Object.prototype.hasOwnProperty.call(t.map, s.state) && t.map[s.state] ? t.map[s.state] : s.state;
        col = t.ok_values && !t.ok_values.includes(s.state) ? SF_C.amber : SF_C.cyan;
      } else {
        v = this.nf(n, t.digits ?? (Math.abs(n) < 10 ? 1 : 0)); u = t.unit ?? this.unit(id);
        if (kind === "percent") pct = Math.max(0, Math.min(100, n));
        else if (t.max) pct = Math.max(0, Math.min(100, (n / t.max) * 100));
        const bad = (lim) => (t.invert ? n <= lim : n >= lim);
        if (t.crit !== undefined && bad(t.crit)) col = SF_C.red;
        else if (t.warn !== undefined && bad(t.warn)) col = SF_C.amber;
        else if (t.low !== undefined && n < t.low) col = SF_C.amber;   // low threshold (e.g. water of a tank that is too cold)
      }
    }
    const lvl = col === SF_C.red ? this.t("machines.critical") : col === SF_C.amber ? this.t("machines.warning") : "";
    return `<div class="tile click" data-e="${this.esc(id)}" aria-label="${this.esc(`${t.label}: ${v}${u}${lvl ? ` (${lvl})` : ""}`)}">
      <span class="led" style="background:${this.esc(col)};box-shadow:0 0 6px ${this.esc(col)}"></span>
      <div class="lbl">${this.esc(t.label)}</div><div class="v" style="color:${this.esc(col === SF_C.grey ? SF_C.grey : "var(--sf-strong)")}">${this.esc(v)}<span class="u">${this.esc(u)}</span></div>
      ${pct !== null ? `<div class="bar"><i style="width:${pct}%;background:${this.esc(col)};box-shadow:0 0 6px ${this.esc(col)}"></i></div>` : ""}${t.spark && col !== SF_C.grey && this._sparkTiles().some((x) => x.id === id) ? this._spark(t, col) : ""}</div>`;
  }
  render() {
    const tiles = this._config.tiles;
    const bad = tiles.filter((t) => !this.ok(t.entity)).length;
    return this.frame(this.esc(this._config.title || this.t("machines.equipment")), bad ? this.t("machines.n_sensor_s_not_responding", { n: bad }) : this.t("machines.all_good"),
      `<div class="grid">${tiles.map((t) => this._tile(t)).join("")}</div>
       <svg class="pulse" viewBox="0 0 200 26" preserveAspectRatio="none" width="100%"><path d="M0 13 H70 L78 4 L86 22 L94 13 H200"/></svg>`);
  }
  getCardSize() { return 5; }
}

