/* ================================================================== CLIMAT */
/*
 * Controlled rooms: the target is an input_number,
 * the room switch calls `switch_script` if defined (regulation + A/C), otherwise climate.turn_on / turn_off.
 *
 * type: custom:sf-climate-card
 * mode: input_select.house_mode
 * min: 15   max: 30                      # dial range (°C)
 * switch_script: script.my_room_toggle   # optional; without it, the on/off button calls climate.turn_on / turn_off
 * rooms: [{ name, icon, climate, temp, hum, target, regul, window }]
 * extras: [{ label, entity, icon, timer?, stop? }]   # switches/scripts under the rooms; timer = displayed timer, stop = entities turned off by a press
 */
const SF_HVAC = Object.assign(Object.create(null), {
  heat: ["Chauffe", "#ff7043", "mdi:fire"], cool: ["Refroidit", "#4fc3f7", "mdi:snowflake"],
  dry: ["Déshumidifie", "#ffca28", "mdi:water-percent"], fan_only: ["Ventile", "#66bb6a", "mdi:fan"],
  heat_cool: ["Auto", "#b388ff", "mdi:autorenew"], off: ["Éteint", SF_C.grey, "mdi:power"],
});
class SfClimateCard extends SfBase {
  defaults() { return { rooms: [], extras: [], switch_script: "", min: 15, max: 30 }; }
  css() {
    return `
      .modes { margin-bottom:14px; }
      .rooms { display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:12px; }
      .room { position:relative; padding:12px 12px 10px; border-radius:12px; overflow:hidden;
        background: linear-gradient(165deg, color-mix(in srgb, var(--hc) 16%, transparent), rgba(3,8,15,.6));
        border:1px solid color-mix(in srgb, var(--hc) 45%, transparent); }
      .room.active { animation: glow 2.4s ease-in-out infinite; }
      @keyframes glow { 50% { box-shadow: 0 0 22px -4px var(--hc), inset 0 0 18px -8px var(--hc); } }
      .rh { display:flex; align-items:center; gap:6px; min-height:28px; font-family:Orbitron,sans-serif; font-size:11px; letter-spacing:.12em; text-transform:uppercase; }
      .rh .fl { margin-left:auto; display:flex; gap:6px; align-items:center; }
      .rh .pw { padding:4px 6px; border-radius:50%; }
      .rh ha-icon, .rh .fl { flex-shrink:0; }
      .dial { position:relative; width:100%; max-width:190px; margin:4px auto 0; }
      .dial svg { width:100%; display:block; }
      .dial .t { position:absolute; left:0; right:0; top:38%; text-align:center; }
      .dial .t b { font-family:Orbitron,sans-serif; font-size:30px; color:#fff; text-shadow:0 0 10px var(--hc); }
      .dial .t small { display:block; font-size:10px; color:${SF_C.dim}; margin-top:2px; letter-spacing:.08em; }
      .ctl { display:grid; grid-template-columns: 36px 1fr 36px; gap:6px; margin-top:4px; align-items:center; }
      .ctl .btn { padding:6px 0; }
      .ctl .tg { text-align:center; font-family:Orbitron,sans-serif; font-size:15px; color:#fff; }
      .ctl .tg small { display:block; font-family:'B612 Mono',monospace; font-size:8px; letter-spacing:.2em; color:${SF_C.dim}; }
      .pw.on { color:var(--hc); border-color:var(--hc); box-shadow:0 0 10px -2px var(--hc); }
      .extras { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; padding-top:12px; border-top:1px dashed rgb(var(--sf-cyan-rgb) / .18); }`;
  }
  _arc(cx, cy, r, a0, a1) {
    const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  _room(r) {
    const c = this._config, cl = this.st(r.climate);
    const mode = cl ? cl.state : "off";
    const [mTxt0, hc, mIco] = SF_HVAC[mode] || [this.esc(mode), SF_C.cyan, "mdi:thermostat"];
    const mTxt = SF_HVAC[mode] ? this.t(mTxt0) : mTxt0;
    const action = cl && cl.attributes.hvac_action;
    const active = ["heating", "cooling", "drying", "fan"].includes(action);
    const t = this.num(r.temp) ?? (cl && cl.attributes.current_temperature != null && isFinite(Number(cl.attributes.current_temperature)) ? Number(cl.attributes.current_temperature) : null);
    const tgt = this.num(r.target);
    const hum = this.num(r.hum);
    const A0 = 135, A1 = 405, span = A1 - A0;
    const ang = (v) => A0 + (Math.max(c.min, Math.min(c.max, v)) - c.min) / (c.max - c.min) * span;
    const p = (a, rad) => [60 + rad * Math.cos((a * Math.PI) / 180), 60 + rad * Math.sin((a * Math.PI) / 180)];
    let marks = "";
    for (let v = c.min; v <= c.max; v += 1) {
      const a = ang(v), [x0, y0] = p(a, 47), [x1, y1] = p(a, v % 5 === 0 ? 41 : 44);
      marks += `<line x1="${this.esc(x0)}" y1="${this.esc(y0)}" x2="${this.esc(x1)}" y2="${this.esc(y1)}" stroke="rgba(255,255,255,${this.esc(v % 5 === 0 ? .35 : .12)})" stroke-width="1"/>`;
    }
    let tg = "";
    if (tgt !== null) { const a = ang(tgt), [x, y] = p(a, 53); tg = `<circle cx="${this.esc(x)}" cy="${this.esc(y)}" r="3.2" fill="${SF_C.cyan}" style="filter:drop-shadow(0 0 3px ${SF_C.cyan})"/>`; }
    const win = r.window && this.st(r.window) && this.st(r.window).state === "on";
    const auto = r.regul && this.isOn(r.regul);
    const on = mode !== "off";
    return `<div class="room ${this.esc(active ? "active" : "")}" style="--hc:${this.esc(hc)}">
      <div class="rh">${this.icon(r.icon || "mdi:home", 16, hc)}<span>${this.esc(r.name)}</span>
        <span class="fl">${win ? `<span class="click" data-e="${this.esc(r.window)}" title="${this.esc(this.t("climate.window_open"))}">${this.icon("mdi:window-open-variant", 16, SF_C.amber)}</span>` : ""}
        ${r.regul ? `<span class="click" data-e="${this.esc(r.regul)}" title="${this.esc(this.t("climate.auto_regulation"))}">${this.icon(auto ? "mdi:robot" : "mdi:robot-off", 16, auto ? SF_C.green : SF_C.grey)}</span>` : ""}
        <span class="btn pw ${this.esc(on ? "on" : "")}" title="${this.esc(this.t("climate.turn_the_room_on_off"))}" ${c.switch_script ? this.call(c.switch_script, { regulation: r.regul, climat: r.climate }) : this.call(on ? "climate.turn_off" : "climate.turn_on", { entity_id: r.climate })}>${this.icon("mdi:power", 15)}</span></span></div>
      <div class="dial click" data-e="${this.esc(r.climate)}">
        <svg viewBox="0 0 120 112">${marks}
          <path d="${this.esc(this._arc(60, 60, 50, A0, A1))}" fill="none" stroke="rgb(var(--sf-fg-rgb) / .07)" stroke-width="6" stroke-linecap="round"/>
          ${t !== null ? `<path d="${this.esc(this._arc(60, 60, 50, A0, Math.max(A0 + 1, ang(t))))}" fill="none" stroke="${this.esc(hc)}" stroke-width="6" stroke-linecap="round" style="filter:drop-shadow(0 0 4px ${this.esc(hc)})"/>` : ""}
          ${tg}</svg>
        <div class="t"><b>${t === null ? "—" : this.nf(Number(t), 1)}°</b>
          <small>${this.icon(mIco, 11, hc)} ${mode === "off" ? mTxt : active ? mTxt : this.t("common.idle_2")}${hum !== null ? ` · ${Math.round(hum)} %` : ""}</small></div>
      </div>
      <div class="ctl">
        <span class="btn" ${this.call("input_number.decrement", { entity_id: r.target })}>−</span>
        <div class="tg click" data-e="${this.esc(r.target)}"><small>${this.t("common.target")}</small>${tgt === null ? "—" : this.nf(tgt, 1) + "°"}</div>
        <span class="btn" ${this.call("input_number.increment", { entity_id: r.target })}>+</span>
      </div></div>`;
  }
  render() {
    const c = this._config, m = this.st(c.mode);
    const ICO = [[/^(clim|cool|fr[ií]o|k[üu]hl)/i, "mdi:snowflake"], [/^(d[ée]shu|dry|des|entf)/i, "mdi:water-percent"], [/^(ventil|fan|l[üu]ft)/i, "mdi:fan"], [/^(chauff|heat|calef|calor|heiz)/i, "mdi:fire"], [/^(libre|free|manual|frei)/i, "mdi:hand-back-right"], [/^(absent|away|ausente|abwesend)/i, "mdi:home-export-outline"]];
    const modes = m ? (m.attributes.options || []).map((o) => {
      const txt = o.replace(/^[^\p{L}]+/u, "");
      const ic = (ICO.find(([k]) => k.test(txt)) || [0, "mdi:circle-small"])[1];
      return `<span class="btn ${this.esc(m.state === o ? "on" : "")}" ${this.call("input_select.select_option", { entity_id: c.mode, option: o })}>${this.icon(ic, 15)}${this.esc(txt)}</span>`;
    }).join("") : "";
    const temps = c.rooms.map((r) => this.num(r.temp)).filter((x) => x !== null);
    const avg = temps.length ? this.nf(temps.reduce((a, b) => a + b, 0) / temps.length, 1) : null;
    const extras = c.extras.map((x) => {
      const tm = this.timerInfo(x.timer), act = tm.actif && x.stop ? this.call("homeassistant.turn_off", { entity_id: x.stop }, this.t("common.stop")) : this.toggleCall(x.entity);
      return `<span class="btn ${this.esc(tm.actif || this.isOn(x.entity) ? "on" : "")}" ${act}>${this.icon(x.icon || "mdi:toggle-switch", 15)}${this.esc(x.label)}${tm.actif && tm.reste ? ` · ${tm.reste} min` : ""}</span>`;
    }).join("");
    return this.frame(this.t("climate.climate"), avg === null ? "" : this.t("climate.t_average", { t: avg }), `
      ${modes ? `<div class="seg modes"><span class="lbl" style="align-self:center;margin-right:4px">${this.t("common.house_mode")}</span>${modes}</div>` : ""}
      <div class="rooms">${c.rooms.map((r) => this._room(r)).join("")}</div>
      ${extras ? `<div class="extras">${extras}</div>` : ""}`);
  }
  getCardSize() { return 8; }
}

