/* ------------------------------------------------------------------ ALERTE */
/*
 * type: custom:sf-alert-card
 * alarm: alarm_control_panel.x
 * ring: binary_sensor.x            # sonnette
 * snapshot: camera.x               # photo shown when the doorbell rings
 * leaks: [binary_sensor.x, ...]    # fuites
 * doors: [binary_sensor.x, ...]    # ouvertures (informatif)
 * power: sensor.x                 # UPS input voltage; alert if < power_below (200 V)
 * hide_sim: true                  # hides the simulation button
 */
class SfAlertCard extends SfBase {
  defaults() { return { leaks: [], doors: [] }; }
  css() {
    return `
      .alert .hud, .hud.alert { border-color:rgb(var(--sf-red-rgb) / .7);
        background: radial-gradient(ellipse at 50% 0%, #4a0714 0%, #1a0308 65%, #0a0104 100%);
        animation: pulse 1.1s infinite; }
      .hud.alert .c { border-color:${SF_C.red}; }
      .hud.alert .head { color:${SF_C.red}; text-shadow:0 0 10px rgb(var(--sf-red-rgb) / .8); }
      .hud.alert .dot { background:${SF_C.red}; box-shadow:0 0 10px ${SF_C.red}; animation-duration:.6s; }
      @keyframes pulse { 50% { box-shadow: inset 0 0 60px rgb(var(--sf-red-rgb) / .35), 0 0 30px rgb(var(--sf-red-rgb) / .45); } }
      .big { font-family:Orbitron,sans-serif; font-weight:700; font-size:26px; letter-spacing:.08em;
        color:var(--sf-strong); text-shadow:0 0 14px rgb(var(--sf-red-rgb) / .9); margin:4px 0 10px; }
      .snap { width:100%; border-radius:10px; border:1px solid rgb(var(--sf-red-rgb) / .6); display:block; margin-top:6px; }
      .calm { display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
      .calm .state { font-family:Orbitron,sans-serif; font-size:18px; color:${SF_C.green};
        text-shadow:0 0 10px rgb(var(--sf-green-rgb) / .6); letter-spacing:.1em; }
      .chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; }
      .chip::before { content:""; display:inline-block; width:6px; height:6px; border-radius:50%; background:currentColor; margin-right:6px; vertical-align:1px; }
      .chip.leak::before { border-radius:50% 50% 50% 0; transform:rotate(-45deg); }
      .chip { padding:4px 9px; border-radius:20px; font-size:10px; letter-spacing:.08em;
        border:1px solid rgb(var(--sf-cyan-rgb) / .25); background:rgb(var(--sf-cyan-rgb) / .05); }
      .chip.on { border-color:${SF_C.red}; color:${SF_C.red}; background:rgb(var(--sf-red-rgb) / .1); }
      .chip.mute { border-color:${SF_C.amber}; color:${SF_C.amber}; background:rgb(var(--sf-amber-rgb) / .08); }
      .chip.ok { color:${SF_C.green}; border-color:rgb(var(--sf-green-rgb) / .35); }
      .sim { margin-left:auto; background:none; border:1px solid rgb(var(--sf-cyan-rgb) / .35); color:${SF_C.dim};
        font-family:'B612 Mono',monospace; font-size:10px; letter-spacing:.1em; padding:5px 10px;
        border-radius:6px; cursor:pointer; }
      .sim:hover { color:${SF_C.cyan}; border-color:${SF_C.cyan}; }`;
  }
  _name(id) { const s = this.st(id); return this.esc(String((s && s.attributes.friendly_name) || id).slice(0, 120)); }
  render() {
    const c = this._config;
    const sim = this._simUntil && Date.now() < this._simUntil;
    const ring = sim || (this.st(c.ring) && this.st(c.ring).state === "on");
    const alarmS = this.st(c.alarm);
    const alarmTriggered = alarmS && alarmS.state === "triggered";
    const leaksOn = c.leaks.filter((id) => this.st(id) && this.st(id).state === "on");
    const pw = c.power ? this.st(c.power) : null;
    const pwv = c.power ? this.num(c.power) : null;
    const powerCut = pwv !== null && pwv < (c.power_below ?? 200);
    const mute = [...c.leaks, c.ring, c.alarm].filter((id) => id && !this.ok(id));

    if (ring || alarmTriggered || leaksOn.length || powerCut) {
      let title = this.t("alert.alert"), what = "";
      if (powerCut) { title = this.t("alert.power_cut"); what = this.t("alert.no_mains_voltage_at_the_ups_input"); }
      if (leaksOn.length) { title = this.t("common.water_leak"); what = leaksOn.map((i) => this._name(i)).join(" · "); }
      if (alarmTriggered) { title = this.t("alert.intrusion"); what = this.t("alert.alarm_triggered"); }
      if (ring) { title = this.t("alert.doorbell"); what = sim ? this.t("alert.local_simulation_nothing_is_sent")
        : this.t("alert.at_t", { t: new Date(this.st(c.ring).last_changed).toLocaleTimeString(this.locLatn, { hour: "2-digit", minute: "2-digit" }) }); }
      const snapState = this.st(c.snapshot);
      const snapUrl = snapState ? sfSafeUrl(snapState.attributes.entity_picture) : "";
      const img = ring && snapUrl ? `<img class="snap click" data-e="${this.esc(c.snapshot)}" src="${this.esc(snapUrl)}">` : "";
      return this.frame(this.t("alert.alert_2"), new Date().toLocaleTimeString(this.locLatn),
        `<div class="big">${title}</div><div>${what}</div>${img}`, "alert");
    }

    const alarmTxt = !alarmS ? "—" : ({ disarmed: this.t("alert.disarmed"), armed_away: this.t("alert.armed_away"),
      armed_home: this.t("alert.armed_home"), armed_night: this.t("alert.armed_night"), arming: this.t("alert.arming") }[alarmS.state] || this.esc(alarmS.state));
    const chip = (id, label, kind) => {
      if (!this.ok(id)) return `<span class="chip ${this.esc(kind)} mute click" data-e="${this.esc(id)}">${label} · ${this.t("common.no_data")}</span>`;
      const on = this.st(id).state === "on";
      return `<span class="chip ${this.esc(kind)} click ${this.esc(on ? "on" : "ok")}" data-e="${this.esc(id)}">${label}${on && kind === "door" ? ` · ${this.t("alert.open")}` : ""}</span>`;
    };
    const short = (id) => this._name(id).replace(/^(Fuite|Ouverture|Leak|Opening)\s*/i, "")
      .replace(/\s*(Humidité|Contact|Porte|Door|Humidity)$/i, "").replace(/\bEntree\b/, "entrée");
    return this.frame(this.t("alert.security"), mute.length ? this.t("alert.n_sensor_s_with_no_data", { n: mute.length }) : this.t("alert.standby"),
      `<div class="calm">
         <div><div class="lbl">${this.t("alert.state")}</div><div class="state">${this.t("alert.normal")}</div></div>
         <div class="click" data-e="${this.esc(c.alarm)}"><div class="lbl">${this.t("alert.alarm")}</div><div class="val">${alarmTxt}</div></div>
         ${c.hide_sim ? "" : `<button class="sim">▶ ${this.t("alert.simulate_a_doorbell")}</button>`}
       </div>
       <div class="chips"><span class="lbl" style="align-self:center">${this.t("alert.leaks")}</span>${c.leaks.map((id) => chip(id, short(id), "leak")).join("")}</div>
       <div class="chips" style="margin-top:6px"><span class="lbl" style="align-self:center">${this.t("alert.openings")}</span>${c.doors.map((id) => chip(id, short(id), "door")).join("")}</div>`);
  }
  afterRender() {
    const b = this.shadowRoot.querySelector(".sim");
    if (b) b.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this._simUntil = Date.now() + 8000;
      this._schedule();
      setTimeout(() => this._schedule(), 8100);
    });
  }
}

