/* ============================================================ RADIATEURS */
/*
 * Radiators controlled by preset (Voltalis, Tado, Netatmo…) that do not always have a
 * temperature probe: heating state, preset (one pill per mode offered by the device),
 * setpoint ± and daily consumption. Designed for the phone (one column, large targets).
 *
 * type: custom:sf-radiators-card
 * title: Radiateurs        accent: "#e07a4f"     step: 0.5     max_kwh: 5
 * setpoint: false          # pilot wire: no numeric setpoint, the ± setting is hidden
 * preset_labels: { away: "Frost protection" }   # renames a preset
 * radiators:
 *   - { name, icon, climate: climate.x, kwh: sensor.x (daily consumption), connection: sensor.x (optional),
 *       preset: select.x (optional: preset list of a select, e.g. with "auto"), presets: [auto, comfort, eco, away] (order / filter) }
 */
const SF_PRESETS = Object.assign(Object.create(null), { auto: "Programme", comfort: "Confort", eco: "Éco", away: "Absent", none: "Aucun", boost: "Boost", sleep: "Nuit", home: "Présent", activity: "Activité", frost_protection: "Hors-gel" });
class SfRadiatorsCard extends SfBase {
  defaults() { return { radiators: [], step: 0.5, max_kwh: 5, setpoint: true, preset_labels: {} }; }
  css() {
    const ac = this._config.accent || SF_C.amber;
    return `
      .hud { --ac:${ac}; }
      .head, .hud .c { color:var(--ac); border-color:var(--ac); text-shadow:0 0 8px color-mix(in srgb, var(--ac) 60%, transparent); }
      .dot { background:var(--ac); box-shadow:0 0 8px var(--ac); }
      .list { display:grid; grid-template-columns:repeat(var(--c, 1), minmax(0, 1fr)); grid-auto-rows:minmax(min-content, 1fr); gap:10px; }
      .rad { padding:11px 12px 12px; border-radius:12px; background:rgb(var(--sf-fg-rgb) / .03);
        border:1px solid color-mix(in srgb, var(--ac) 22%, transparent); }
      .rad.heat { border-color:color-mix(in srgb, var(--ac) 70%, transparent); background:color-mix(in srgb, var(--ac) 9%, transparent);
        box-shadow:0 0 16px -6px var(--ac); }
      .rad.off { opacity:.6; }
      .rh { display:flex; align-items:center; gap:8px; }
      .rh .nm { flex:1; min-width:0; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--sf-strong); }
      .rh .st { font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:${SF_C.dim}; }
      .rad.heat .rh .st { color:var(--ac); }
      .rad.heat .rh ha-icon { animation: rglow 2.2s ease-in-out infinite; }
      @keyframes rglow { 50% { filter:drop-shadow(0 0 5px var(--ac)); } }
      .pw { min-width:40px; min-height:36px; }
      .pw.on { border-color:var(--ac); background:color-mix(in srgb, var(--ac) 22%, transparent); box-shadow: inset 0 0 12px color-mix(in srgb, var(--ac) 30%, transparent); }
      .presets { display:grid; grid-template-columns: repeat(auto-fit, minmax(64px, 1fr)); gap:6px; margin-top:10px; }
      .presets .btn { min-height:38px; padding:6px 4px; }
      .presets .btn.on { border-color:var(--ac); background:color-mix(in srgb, var(--ac) 22%, transparent); box-shadow: inset 0 0 12px color-mix(in srgb, var(--ac) 30%, transparent); }
      .ctl { display:flex; align-items:center; justify-content:center; gap:10px; margin-top:10px; }
      .ctl .btn { min-width:44px; min-height:40px; font-size:16px; }
      .ctl .tg { text-align:center; min-width:96px; }
      .ctl .tg small { display:block; font-size:9px; letter-spacing:.14em; color:${SF_C.dim}; }
      .ctl .tg b { font-family:Orbitron,sans-serif; font-size:20px; color:var(--sf-strong); text-shadow:0 0 10px var(--ac); }
      .meta { display:flex; align-items:center; gap:8px; margin-top:10px; font-size:10px; color:${SF_C.dim}; }
      .meta .bar { flex:1; height:4px; border-radius:2px; background:rgb(var(--sf-fg-rgb) / .07); overflow:hidden; }
      .meta .bar i { display:block; height:100%; background:var(--ac); box-shadow:0 0 6px var(--ac); border-radius:2px; transition:width 1s; }
      .warn { color:${SF_C.amber}; }`;
  }
  _label(p) { const pl = this._config.preset_labels, l = pl && Object.prototype.hasOwnProperty.call(pl, p) ? pl[p] : null; return l ? this.esc(l) : SF_PRESETS[p] ? this.t(SF_PRESETS[p]) : this.esc(p); }
  _rad(r) {
    const c = this._config, cl = this.st(r.climate), dead = !cl || cl.state === "unavailable";
    const a = (cl && cl.attributes) || {};
    const mode = cl ? cl.state : "unavailable", off = mode === "off";
    const heat = !dead && !off && a.hvac_action === "heating";
    // Presets: those of a `select` if provided (it often offers "auto" in addition), otherwise those of the climate.
    const sel = r.preset && this.st(r.preset), viaSel = !!(sel && sel.state !== "unavailable");
    let presets = viaSel ? (sel.attributes.options || []) : (a.preset_modes || []);
    if (r.presets) presets = r.presets.filter((p) => presets.includes(p));
    else if (viaSel) presets = presets.filter((p) => p !== "temperature");
    const cur = viaSel ? sel.state : a.preset_mode;
    const tgt = typeof a.temperature === "number" ? a.temperature : null;
    const now = typeof a.current_temperature === "number" ? a.current_temperature : null;
    const step = Number(c.step) || 0.5, lo = a.min_temp ?? 5, hi = a.max_temp ?? 30;
    const setT = (d) => this.call("climate.set_temperature", { entity_id: r.climate, temperature: Math.round(Math.max(lo, Math.min(hi, tgt + d * step)) * 10) / 10 });
    const kwh = r.kwh ? this.num(r.kwh) : null;
    const u = r.kwh ? this.unit(r.kwh).toLowerCase() : "";
    const kv = kwh === null ? null : (u === "wh" ? kwh / 1000 : kwh);
    const lost = r.connection && this.st(r.connection) && !["ok", "on", "connected", "online", "home"].includes(String(this.st(r.connection).state).toLowerCase());
    const status = dead ? this.t("radiators.offline") : off ? this.t("common.off") : heat ? this.t("radiators.heating") : this.t("common.idle_2");
    return `<div class="rad ${this.esc(heat ? "heat" : "")} ${this.esc(off || dead ? "off" : "")}">
      <div class="rh">${this.icon(r.icon || "mdi:radiator", 20, heat ? "var(--ac)" : SF_C.dim)}
        <span class="nm click" data-e="${this.esc(r.climate)}">${this.esc(r.name)}</span>
        ${lost ? `<span class="warn click" data-e="${this.esc(r.connection)}" title="${this.esc(this.t("radiators.connection_lost"))}">${this.icon("mdi:wifi-alert", 16, SF_C.amber)}</span>` : ""}
        <span class="st">${status}${now !== null ? ` · ${this.nf(now, 1)}°` : ""}</span>
        ${dead ? "" : `<span class="btn pw ${this.esc(off ? "" : "on")}" title="${this.esc(this.t("radiators.turn_the_radiator_on_off"))}" ${this.call(off ? "climate.turn_on" : "climate.turn_off", { entity_id: r.climate })}>${this.icon("mdi:power", 16)}</span>`}</div>
      ${presets.length && !dead ? `<div class="presets">${presets.map((p) =>
        `<span class="btn ${this.esc(cur === p && !off ? "on" : "")}" ${viaSel ? this.call("select.select_option", { entity_id: r.preset, option: p }) : this.call("climate.set_preset_mode", { entity_id: r.climate, preset_mode: p })}>${this._label(p)}</span>`).join("")}</div>` : ""}
      ${c.setpoint !== false && tgt !== null && !dead ? `<div class="ctl"><span class="btn" ${setT(-1)}>−</span>
        <div class="tg click" data-e="${this.esc(r.climate)}"><small>${this.t("radiators.setpoint")}</small><b>${this.nf(tgt, 1)}°</b></div>
        <span class="btn" ${setT(1)}>+</span></div>` : ""}
      ${kv !== null ? `<div class="meta"><span>${this.icon("mdi:flash", 12)} ${this.t("radiators.k_kwh_today", { k: this.nf(kv, 2) })}</span>
        <span class="bar"><i style="width:${this.esc(Math.min(100, (kv / (Number(c.max_kwh) || 5)) * 100))}%"></i></span></div>` : ""}</div>`;
  }
  render() {
    const c = this._config, rs = c.radiators || [];
    this._n = rs.length;
    const n = rs.filter((r) => { const s = this.st(r.climate); return s && s.attributes.hvac_action === "heating" && s.state !== "off"; }).length;
    const tot = rs.reduce((t, r) => { const v = r.kwh ? this.num(r.kwh) : null; return t + (v === null ? 0 : (this.unit(r.kwh).toLowerCase() === "wh" ? v / 1000 : v)); }, 0);
    return this.frame(this.esc(c.title || this.t("radiators.radiators")),
      `${this.t("radiators.n_heating", { n })} · ${this.nf(tot, 1)} kWh`, `<div class="list grow" style="--c:${this.esc(this._cols())}">${rs.map((r) => this._rad(r)).join("")}</div>`);
  }
  _cols(w) { return this.balance(this._n || 0, 280, 10, (w || this.width) - 38); }
  layoutKey(w) { return this._cols(w); }
  getCardSize() { return 2 + (this._config.radiators || []).length * 2; }
}

