/* States of a charger / a car: not every integration publishes a plain on/off. Many give a text status
 * ("Charging", "Plugged in", "Awaiting start", "SuspendedEV"…). Comparison is insensitive to case, spaces and hyphens.
 * `charging_states` / `connected_states` (lists) replace the defaults if a brand has an unusual status. */
const SF_EV_CHARGING = ["on", "true", "yes", "1", "charging", "charge", "in_charge", "charging_started", "started", "in_progress", "active",
  "fast_charging", "slow_charging", "ac_charging", "dc_charging", "supercharging", "rapid_charging"];
const SF_EV_CONNECTED = [...SF_EV_CHARGING, "connected", "plugged", "plugged_in", "pluggedin", "cable_connected", "cable_plugged_in", "vehicle_connected",
  "preparing", "ready_to_charge", "awaiting_start", "waiting", "waiting_for_car", "waiting_for_vehicle", "connected_waiting_for_car", "suspended", "suspended_ev",
  "suspendedev", "suspended_evse", "suspendedevse", "paused", "finishing", "finished", "completed", "charging_completed", "charge_done", "charge_complete", "complete", "full"];
const sfEvNorm = (v) => String(v).trim().toLowerCase().replace(/[\s\-]+/g, "_");
function sfEvOn(el, id, kind, custom) {
  const st = el.st(id); if (!st) return false;
  const cl = Array.isArray(custom) ? custom : custom ? [custom] : [], list = cl.length ? cl.map(sfEvNorm) : (kind === "charging" ? SF_EV_CHARGING : SF_EV_CONNECTED);
  return list.includes(sfEvNorm(st.state));
}

/* ------------------------------------------------------------------ HANGAR */
/*
 * type: custom:sf-hangar-card
 * cars:                       # 3 voitures maximum
 *   - name: Car A
 *     soc: sensor.x            # %
 *     range: sensor.x          # km or mi (see distance_unit)
 *     target: sensor.x         # charge cible (%), facultatif
 *     charging: binary_sensor.x | sensor.x   # optional; same statuses as the charger (charging_states: optional list)
 *     color: "var(--sf-cyan)"
 * distance_unit: auto          # auto (sensor unit) | km | mi (converts if needed)
 * charger:
 *   name: Garage               # facultatif
 *   connected: binary_sensor.x | sensor.x   # on, Connected, Plugged in… (connected_states: optional list that replaces the default)
 *   charging: binary_sensor.x | sensor.x | switch.x   # on, charging, Charging… (charging_states); absent: power > 50 W
 *   power: sensor.x            # W (kW and MW accepted)
 *   current: number.x          # A
 *   decision: sensor.x         # charge controller decision (optional)
 *   mode: select.x | input_select.x   # mode selector of this charger (optional)
 *   controls: true             # optional controls; nothing is shown or can be triggered without this option:
 *   switch: switch.x           #   start / stop (stop needs 2 presses); switch_invert: true if ON = charge PAUSED
 *   current_step: 1            #   current − / + (number entity); current_min / current_max if the entity does not expose its bounds
 * chargers:                    # OR several chargers (4 max): [{ name, connected, charging, power, current, decision, mode, controls… }, …]
 * mode: select.x | input_select.x      # global mode selector (optional); warn_mode / warn_text: evening warning
 * flows: { solar, home, surplus }       # optional: only the configured flows are shown
 */
class SfHangarCard extends SfBase {
  defaults() { return { cars: [], charger: {}, distance_unit: "auto" }; }
  css() {
    return `
      .bay { display:grid; grid-template-columns: 1fr auto 1fr; align-items:center; gap:8px; }
      .ctl { display:flex; justify-content:center; align-items:center; gap:8px; margin-top:8px; flex-wrap:wrap; }
      .ctlrow { display:inline-flex; gap:6px; }
      .bay.stack { display:block; }
      .bay.stack .cars { display:grid; gap:8px; }
      .bay.stack svg { width:100%; max-width:108px; height:auto; }
      .bay.stack .bornes { display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin-top:12px; }
      .bay.stack .borne { padding:8px 6px; border-radius:10px; background:rgb(var(--sf-cyan-rgb) / .04); border:1px solid rgb(var(--sf-cyan-rgb) / .12); }
      .bay.stack .flow { width:70px; }
      .car { text-align:center; }
      .car .name { font-family:Orbitron,sans-serif; letter-spacing:.14em; font-size:12px; margin-top:4px; }
      .car .km { font-size:11px; color:${SF_C.dim}; margin-top:2px; }
      .ring-bg { fill:none; stroke:rgb(var(--sf-fg-rgb) / .07); stroke-width:7; }
      .ring { fill:none; stroke-width:7; stroke-linecap:round; transform:rotate(-90deg); transform-origin:50% 50%;
        transition: stroke-dashoffset 1s ease; }
      .soc { font-family:Orbitron,sans-serif; font-size:20px; fill:#fff; }
      .tick { stroke:rgb(var(--sf-cyan-rgb) / .25); stroke-width:1; }
      .borne { text-align:center; min-width:92px; }
      .borne .plug { font-size:26px; display:flex; justify-content:center; }
      .flow { width:90px; height:4px; margin:8px auto; border-radius:2px; background:rgb(var(--sf-fg-rgb) / .08); overflow:hidden; }
      .flow.on::before { content:""; display:block; width:40%; height:100%;
        background: linear-gradient(90deg, transparent, ${SF_C.green}, transparent); animation: run 1.1s linear infinite; }
      @keyframes run { from { transform:translateX(-100%); } to { transform:translateX(250%); } }
      .note { margin-top:14px; padding-top:10px; border-top:1px dashed rgb(var(--sf-cyan-rgb) / .18);
        display:flex; justify-content:center; align-items:center; text-align:center; gap:4px 16px; flex-wrap:wrap; font-size:11px; }
      .modes { margin-top:12px; text-align:center; }
      .modes .lbl { margin-bottom:6px; }
      .modes .seg { justify-content:center; }
      .badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; margin-top:6px;
        border:1px solid rgb(var(--sf-green-rgb) / .45); color:${SF_C.green}; }
      .warnbox { margin-top:10px; padding:9px 12px; border-radius:8px; font-size:11.5px; line-height:1.4; text-align:center;
        color:${SF_C.amber}; border:1px solid rgb(var(--sf-amber-rgb) / .55); background:rgb(var(--sf-amber-rgb) / .09); animation: blink 2s infinite; }
      .fl3 { display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-top:12px; }
      .fl3 > div { padding:7px 9px; border-radius:8px; background:rgb(var(--sf-cyan-rgb) / .04); border:1px solid rgb(var(--sf-cyan-rgb) / .12); text-align:center; }
      .tgt { stroke:#fff; stroke-width:2; }`;
  }
  _ring(car) {
    const soc = this.num(car.soc);
    const r = 42, L = 2 * Math.PI * r;
    const pct = soc === null ? 0 : Math.max(0, Math.min(100, soc));
    const col = soc === null ? SF_C.grey : pct < 20 ? SF_C.red : pct < 40 ? SF_C.amber : (car.color || SF_C.cyan);
    const ticks = Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * 2 * Math.PI;
      return `<line class="tick" x1="${this.esc(55 + 50 * Math.cos(a))}" y1="${this.esc(55 + 50 * Math.sin(a))}" x2="${this.esc(55 + 53 * Math.cos(a))}" y2="${this.esc(55 + 53 * Math.sin(a))}"/>`;
    }).join("");
    return `<svg viewBox="0 0 110 110" width="118" height="118" class="click" data-e="${this.esc(car.soc)}">
      ${ticks}<circle class="ring-bg" cx="55" cy="55" r="${this.esc(r)}"/>
      <circle class="ring" cx="55" cy="55" r="${this.esc(r)}" stroke="${this.esc(col)}" stroke-dasharray="${this.esc(L)}"
        stroke-dashoffset="${this.esc(L * (1 - pct / 100))}" style="filter:drop-shadow(0 0 5px ${this.esc(col)})"/>
      ${this._target(car)}
      <text class="soc" x="55" y="62" text-anchor="middle">${soc === null ? "—" : Math.round(soc) + "%"}</text></svg>`;
  }
  // White marker at the target charge (e.g. 80 %), if the car publishes it.
  _target(car) {
    const t = this.num(car.target); if (t === null) return "";
    const a = (t / 100) * 2 * Math.PI - Math.PI / 2;
    return `<line class="tgt" x1="${this.esc(55 + 36 * Math.cos(a))}" y1="${this.esc(55 + 36 * Math.sin(a))}" x2="${this.esc(55 + 48 * Math.cos(a))}" y2="${this.esc(55 + 48 * Math.sin(a))}"><title>${this.esc(this.t("common.target"))} ${Math.round(t)} %</title></line>`;
  }
  // Range: `distance_unit: auto` (default) shows the sensor's value and unit (km or mi); `km` / `mi` converts if needed.
  _range(car) {
    const want = String(this._config.distance_unit || "auto").toLowerCase(), raw = this.num(car.range);
    const su = String(this.unit(car.range) || "").toLowerCase(), src = su.startsWith("mi") ? "mi" : "km";
    if (raw === null) return this.t("hangar.n_u_range", { n: this.fmt(car.range), u: this.esc(src) });
    const u = want === "km" || want === "mi" ? want : (su.startsWith("mi") ? "mi" : su === "km" || !su ? "km" : su);
    const v = (want === "km" || want === "mi") && want !== src ? (want === "mi" ? raw * 0.621371 : raw / 0.621371) : raw;
    return this.t("hangar.n_u_range", { n: Math.round(v), u: this.esc(u) });
  }
  _car(car) {
    const charging = sfEvOn(this, car.charging, "charging", car.charging_states);
    return `<div class="car">${this._ring(car)}
      <div class="name">${this.esc(car.name)}</div>
      <div class="km click" data-e="${this.esc(car.range)}">${this._range(car)}</div>
      ${charging ? `<span class="badge">${this.t("hangar.charging_2")}</span>` : ""}</div>`;
  }
  // One or more chargers: `chargers: [{ name, connected, charging, power, current, decision, mode }]`; `charger: {…}` remains valid (a single one).
  _chargers() {
    const c = this._config;
    const list = c.chargers && c.chargers.length ? c.chargers : [c.charger || {}];
    return list.slice(0, 4);
  }
  // State of a charger: "charging" = configured status, otherwise power > 50 W; "plugged in" = status, or the mere fact of charging.
  _chState(ch) {
    const p = this.watts(ch.power);
    const charging = ch.charging ? sfEvOn(this, ch.charging, "charging", ch.charging_states) : (p !== null && p > 50);
    const connected = sfEvOn(this, ch.connected, "connected", ch.connected_states) || charging;
    return { p, charging, connected };
  }
  _borne(ch, st, label) {
    return `<div class="borne">
        <div class="lbl">${this.esc(label)}</div>
        <div class="plug click" data-e="${this.esc(ch.connected || ch.power || "")}" style="color:${this.esc(st.connected ? SF_C.green : SF_C.grey)};filter:drop-shadow(0 0 6px currentColor)"><ha-icon icon="mdi:ev-station" style="--mdc-icon-size:30px"></ha-icon></div>
        <div class="flow ${this.esc(st.charging ? "on" : "")}"></div>
        <div class="val click" data-e="${this.esc(ch.power)}">${st.p === null ? "—" : Math.round(st.p) + " W"}</div>
        <div class="lbl click" data-e="${this.esc(ch.current)}">${this.fmt(ch.current)} A</div>${this._controls(ch, st)}</div>`;
  }
  // Optional controls (`controls: true` on the charger): start / stop charging (`switch`) and set the current (`current`
  // = `number` entity, `step`). Nothing is shown without `controls: true`: an existing configuration does not change.
  _controls(ch, st) {
    if (!ch.controls) return "";
    const out = [];
    if (ch.switch && this.st(ch.switch)) {
      // `switch_invert: true`: the switch is active when charging is PAUSED (e.g. "pause the session").
      const raw = this.isOn(ch.switch), on = ch.switch_invert ? !raw : raw, dead = !this.ok(ch.switch);
      out.push(`<span class="btn ${this.esc(on ? "on" : "")}" title="${this.esc(this.t(on ? "Arrêter la charge" : "Démarrer la charge"))}" ${dead ? "" : this.call(`${ch.switch.split(".")[0]}.turn_${raw ? "off" : "on"}`, { entity_id: ch.switch }, on ? this.t("common.stop") : "")}>${this.icon(on ? "mdi:stop" : "mdi:play", 16)} ${this.t(on ? "Arrêter" : "Démarrer")}</span>`);
    }
    const cur = ch.current && this.st(ch.current), dom = (ch.current || "").split(".")[0];
    if (cur && (dom === "number" || dom === "input_number") && this.ok(ch.current) && isFinite(Number(cur.state))) {
      const a = cur.attributes, step = Number(ch.current_step) || a.step || 1, v = Number(cur.state);
      const go = (d) => this.call(`${dom}.set_value`, { entity_id: ch.current, value: Math.max(Number(ch.current_min ?? a.min ?? 0), Math.min(Number(ch.current_max ?? a.max ?? Infinity), Math.round((v + d * step) * 100) / 100)) });
      out.push(`<span class="ctlrow"><span class="btn" aria-label="${this.esc(this.t("hangar.decrease_current"))}" ${go(-1)}>−</span><span class="btn" aria-label="${this.esc(this.t("hangar.increase_current"))}" ${go(1)}>+</span></span>`);
    }
    return out.length ? `<div class="ctl">${out.join("")}</div>` : "";
  }
  render() {
    const c = this._config, chs = this._chargers(), sts = chs.map((ch) => this._chState(ch)), multi = chs.length > 1;
    const charging = sts.some((x) => x.charging), connected = sts.some((x) => x.connected);
    const cars = c.cars.slice(0, 3);
    const label = (ch, k) => ch.name || (multi ? `${this.t("hangar.charger")} ${k + 1}` : this.t("hangar.charger"));
    const bornes = chs.map((ch, k) => this._borne(ch, sts[k], label(ch, k)));
    // Layout: one charger and ≤ 2 cars = car | charger | car; otherwise the cars in a row, the chargers below.
    const carsHtml = cars.map((k) => this._car(k)).join("");
    const bay = !multi && cars.length <= 2
      ? `<div class="bay">${cars[0] ? this._car(cars[0]) : "<div></div>"}${bornes[0]}${cars[1] ? this._car(cars[1]) : "<div></div>"}</div>`
      : `<div class="bay stack">${cars.length ? `<div class="cars" style="grid-template-columns:repeat(${this.esc(cars.length)},minmax(0,1fr))">${carsHtml}</div>` : ""}<div class="bornes">${bornes.join("")}</div></div>`;
    // Information line: one charger = usual message; several = one line per charger.
    const decOf = (ch) => ch.decision ? `<span class="click" data-e="${this.esc(ch.decision)}">${this.t("hangar.controller")}${this.lang === "fr" ? " " : ""}: <b style="color:${SF_C.cyan}">${this.fmt(ch.decision)}</b></span>` : "";
    const note = !multi
      ? `<span>${sts[0].connected ? `${this.t("hangar.cable_plugged_in")} · <span style="color:${SF_C.amber}">${this.t("hangar.car_not_identified_by_ha")}</span>` : `<span class="muted">${this.t("hangar.no_vehicle_plugged_in")}</span>`}</span>${decOf(chs[0])}`
      : chs.map((ch, k) => `<span style="flex:1 1 100%"><b style="color:${this.esc(sts[k].charging ? SF_C.green : sts[k].connected ? SF_C.amber : SF_C.dim)}">${this.esc(label(ch, k))}</b> · ${sts[k].charging ? this.t("hangar.charging") : sts[k].connected ? this.t("common.waiting") : this.t("common.idle")}${ch.decision ? ` · ${decOf(ch)}` : ""}</span>`).join("");
    // Mode selectors: the global mode, then that of each charger that has one.
    const modes = [this._modes(c.mode, connected, multi ? "" : null), ...chs.map((ch, k) => ch.mode ? this._modes(ch.mode, sts[k].connected, label(ch, k)) : "")].join("");
    return this.frame(this.t("hangar.vehicles"), charging ? this.t("hangar.charging") : connected ? this.t("common.waiting") : this.t("common.idle"),
      `${bay}<div class="note">${note}</div>${modes}${this._flows()}`);
  }
  // Charge-mode selector (input_select or select) + safeguard: car plugged in in the evening
  // in "Surplus" only = no night charging. `who`: name of the charger when there are several.
  _modes(entity, connected, who) {
    const c = this._config, m = this.st(entity);
    if (!entity || !m) return "";
    const h = new Date().getHours();
    const warn = c.warn_mode && connected && m.state === c.warn_mode && (h >= 17 || h < 6);
    const opts = (m.attributes.options || []).map((o) =>
      `<span class="btn ${this.esc(m.state === o ? "on" : "")}" ${this.call(`${entity.split(".")[0]}.select_option`, { entity_id: entity, option: o })}>${this.esc(o)}</span>`).join("");
    return `<div class="modes"><div class="lbl">${this.t("hangar.charge_mode")}${who ? ` · ${this.esc(who)}` : ""}</div><div class="seg">${opts}</div>
      ${warn ? `<div class="warnbox">${this.esc(c.warn_text || "")}</div>` : ""}</div>`;
  }
  _flows() {
    const f = this._config.flows; if (!f) return "";
    const cell = (lbl, id, col) => { const w = this.watts(id); return `<div class="click" data-e="${this.esc(id)}"><div class="lbl">${lbl}</div><div class="val" style="color:${this.esc(col)}">${this.kw(w)}</div></div>`; };
    const cells = [f.solar && cell(this.t("common.solar"), f.solar, SF_C.amber), f.home && cell(this.t("hangar.home_excl_ev"), f.home, SF_C.cyan),
      f.surplus && cell(this.t("hangar.surplus"), f.surplus, (this.watts(f.surplus) ?? 0) >= 0 ? SF_C.green : "#ff7a45")].filter(Boolean);
    return cells.length ? `<div class="fl3" style="grid-template-columns:repeat(${this.esc(cells.length)},minmax(0,1fr))">${cells.join("")}</div>` : "";
  }
}

