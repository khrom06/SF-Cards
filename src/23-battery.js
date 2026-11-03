/* Batteries: a single one (soc / power / capacity_kwh at the root) or several (`batteries: [{ name, soc, power, capacity_kwh, invert }]`).
 * Overall level = capacity-weighted average (simple average if a capacity is missing); power = sum (positive = discharging);
 * capacity = sum (only if known for all). An unavailable battery does not enter the average. */
function sfBatAgg(el, c) {
  const own = (c.batteries || []).filter((b) => b && (b.soc || b.power || b.entity));   // empty entries ("+ Add a battery" not filled in) ignored
  const raw = own.length ? own : ((c.soc || c.power || c.entity) ? [{ soc: c.soc, power: c.power, entity: c.entity, capacity_kwh: c.capacity_kwh }] : []);
  const items = raw.map((b) => {
    const inv = b.invert ?? c.invert, w = b.power ? el.watts(b.power) : null;
    const sid = b.soc || b.entity; return { name: b.name, soc: sid ? el.num(sid) : null, power: w === null ? null : (inv ? -w : w), cap: Number(b.capacity_kwh) || 0, id: sid || b.power };
  });
  const ws = items.filter((i) => i.soc !== null), allCap = ws.length > 0 && ws.every((i) => i.cap > 0);
  const soc = !ws.length ? null : allCap ? ws.reduce((a, i) => a + i.soc * i.cap, 0) / ws.reduce((a, i) => a + i.cap, 0) : ws.reduce((a, i) => a + i.soc, 0) / ws.length;
  const ps = items.filter((i) => i.power !== null);
  return { n: items.length, items, soc, power: ps.length ? ps.reduce((a, i) => a + i.power, 0) : null,
    cap: items.length && items.every((i) => i.cap > 0) ? items.reduce((a, i) => a + i.cap, 0) : 0, firstId: items.length ? items[0].id : "" };
}

/* ============================================================== BATTERIE */
/*
 * Home battery: level, flow direction and power, estimated autonomy, daily energy, mode.
 * Everything is optional: only what is configured is shown, and without `soc` or `power` the card disappears.
 *
 * type: custom:sf-battery-card
 * soc: sensor.x (%)     power: sensor.x (W, positive = discharging; `invert: true` if it is the opposite)
 * batteries: [{ name, soc, power, capacity_kwh }]   # several batteries: weighted level, summed power, per-battery detail
 * capacity_kwh: 10      charged_today: sensor.x (kWh)   discharged_today: sensor.x (kWh)
 * mode: select.x | input_select.x     temperature: sensor.x     health: sensor.x (%)     cycles: sensor.x
 */
class SfBatteryCard extends SfBase {
  defaults() { return { invert: false }; }
  _has() { return sfBatAgg(this, this._config).n > 0; }
  css() {
    const none = this._has() ? "" : ":host{display:none}";
    return `${none}
      .gauge { display:grid; grid-template-columns: 132px auto; gap:14px; align-items:center; justify-content:center; }
      @media (max-width: 380px) { .gauge { grid-template-columns: 1fr; justify-items:center; text-align:center; } }
      .ring { position:relative; width:132px; height:132px; }
      .ring svg { width:100%; height:100%; transform:rotate(-90deg); }
      .ring .t { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
      .ring .t b { font-family:Orbitron,sans-serif; font-size:28px; color:var(--sf-strong); }
      .ring .t small { font-size:9px; letter-spacing:.14em; color:${SF_C.dim}; }
      .st { font-family:Orbitron,sans-serif; font-size:15px; letter-spacing:.1em; }
      .sub { margin-top:4px; font-size:11px; color:${SF_C.dim}; line-height:1.5; }
      .bats { margin-top:14px; display:grid; gap:6px; }
      .bats .b { display:grid; grid-template-columns: 1fr auto; gap:2px 10px; align-items:center; padding:7px 10px; border-radius:8px; background:rgb(var(--sf-cyan-rgb) / .04); border:1px solid rgb(var(--sf-cyan-rgb) / .12); }
      .bats .n { font-size:12px; color:var(--sf-strong); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .bats .p { font-size:11px; text-align:end; }
      .bats .lv { height:5px; border-radius:3px; background:rgb(var(--sf-fg-rgb) / .08); overflow:hidden; display:block; }
      .bats .lv i { display:block; height:100%; border-radius:3px; }
      .bats .pc { font-family:Orbitron,sans-serif; font-size:12px; text-align:end; color:var(--sf-strong); }
      .stats { display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap:8px; margin-top:14px; }
      .stats > div { padding:8px 10px; border-radius:8px; background:rgb(var(--sf-cyan-rgb) / .04); border:1px solid rgb(var(--sf-cyan-rgb) / .12); text-align:center; }
      .stats .v { font-family:Orbitron,sans-serif; font-size:15px; color:var(--sf-strong); margin-top:3px; }
      .modes { margin-top:14px; text-align:center; } .modes .lbl { margin-bottom:6px; } .modes .seg { justify-content:center; }`;
  }
  render() {
    if (!this._has()) return "";
    const c = this._config, agg = sfBatAgg(this, c), soc = agg.soc, bw = agg.power;   // bw > 0 = discharging
    const idle = bw === null || Math.abs(bw) < 20;
    const col = soc === null ? SF_C.grey : soc <= 15 ? SF_C.red : soc <= 30 ? SF_C.amber : SF_C.green;
    const state = idle ? this.t("common.idle_2") : bw > 0 ? this.t("common.discharging") : this.t("common.charging");
    const R = 56, C = 2 * Math.PI * R, pct = soc === null ? 0 : Math.max(0, Math.min(100, soc));
    // Estimated autonomy: only if the capacity is known and something is flowing.
    let eta = "";
    const cap = agg.cap;
    if (cap > 0 && soc !== null && !idle) {
      const kwhLeft = bw > 0 ? (cap * pct) / 100 : (cap * (100 - pct)) / 100, h = kwhLeft / (Math.abs(bw) / 1000);
      if (isFinite(h) && h < 100) eta = this.t(bw > 0 ? "vide dans {h}h{m}" : "pleine dans {h}h{m}", { h: Math.floor(Math.round(h * 60) / 60), m: String(Math.round(h * 60) % 60).padStart(2, "0") });
    }
    const stat = (id, label, unit, digits) => { if (!id) return ""; const n = this.num(id); return `<div class="click" data-e="${this.esc(id)}"><div class="lbl">${this.t(label)}</div><div class="v">${n === null ? "—" : this.nf(n, digits) + unit}</div></div>`; };
    const stats = [stat(c.charged_today, "Chargé aujourd'hui", " kWh", 1), stat(c.discharged_today, "Déchargé aujourd'hui", " kWh", 1),
      stat(c.temperature, "Température", " °C", 0), stat(c.health, "Santé", " %", 0), stat(c.cycles, "Cycles", "", 0)].filter(Boolean).join("");
    // Per-battery detail when there are several.
    const bats = agg.items.length > 1 ? `<div class="bats">${agg.items.map((b, i) => {
      const lv = b.soc === null ? null : Math.max(0, Math.min(100, b.soc)), bc = lv === null ? SF_C.grey : lv <= 15 ? SF_C.red : lv <= 30 ? SF_C.amber : SF_C.green;
      const pw = b.power === null ? "—" : Math.abs(b.power) < 20 ? this.t("common.idle_2") : `${this.icon(b.power > 0 ? "mdi:arrow-down-bold" : "mdi:arrow-up-bold", 12)} ${this.kw(Math.abs(b.power))}`;
      return `<div class="b click" data-e="${this.esc(b.id)}"><span class="n">${b.name ? this.esc(b.name) : `${this.t("common.battery_2")} ${i + 1}`}</span><span class="p" style="color:${this.esc(b.power === null || Math.abs(b.power) < 20 ? SF_C.dim : b.power > 0 ? SF_C.amber : SF_C.green)}">${pw}</span>
        <span class="lv"><i style="width:${this.esc(lv ?? 0)}%;background:${this.esc(bc)};box-shadow:0 0 6px ${this.esc(bc)}"></i></span><span class="pc">${lv === null ? "—" : Math.round(lv) + " %"}</span></div>`;
    }).join("")}</div>` : "";
    const m = c.mode && this.st(c.mode);
    const modes = m && (m.attributes.options || []).length ? `<div class="modes"><div class="lbl">${this.t("common.mode")}</div><div class="seg">${m.attributes.options.map((o) =>
      `<span class="btn ${this.esc(m.state === o ? "on" : "")}" ${this.call(`${c.mode.split(".")[0]}.select_option`, { entity_id: c.mode, option: o })}>${this.esc(o)}</span>`).join("")}</div></div>` : "";
    return this.frame(this.esc(c.title || this.t("common.battery_2")), soc === null ? "" : `${Math.round(soc)} %`, `
      <div class="gauge"><div class="ring click" data-e="${this.esc(agg.firstId)}"><svg viewBox="0 0 132 132"><circle cx="66" cy="66" r="${this.esc(R)}" fill="none" stroke="rgb(var(--sf-fg-rgb) / .08)" stroke-width="9"/>
          <circle cx="66" cy="66" r="${this.esc(R)}" fill="none" stroke="${this.esc(col)}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${this.esc((C * pct) / 100)} ${this.esc(C)}" style="filter:drop-shadow(0 0 5px ${this.esc(col)})"/></svg>
          <div class="t"><b>${soc === null ? "—" : Math.round(soc)}<span style="font-size:14px">%</span></b><small>${this.t("battery.level")}</small></div></div>
        <div><div class="st" style="color:${this.esc(idle ? SF_C.dim : bw > 0 ? SF_C.amber : SF_C.green)}">${this.icon(idle ? "mdi:battery-heart-variant" : bw > 0 ? "mdi:battery-arrow-down" : "mdi:battery-arrow-up", 20)} ${state}</div>
          <div class="sub">${bw === null ? "" : this.kw(Math.abs(bw))}${eta ? `<br>${eta}` : ""}</div></div></div>
      ${bats}${stats ? `<div class="stats">${stats}</div>` : ""}${modes}`);
  }
  getCardSize() { return 4; }
}

