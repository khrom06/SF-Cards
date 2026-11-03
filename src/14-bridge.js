/* ================================================================== PONT */
/*
 * Full-width command banner: time, weather, tariff, house mode, crew,
 * and the list of current anomalies (or "all systems nominal").
 *
 * type: custom:sf-bridge-card
 * weather: weather.x            outdoor: sensor.x (outdoor temperature)
 * price: sensor.x (€/kWh)        hc_price: input_number.x (off-peak price: used to tell peak/off-peak when no window is entered)
 * hc_windows: [{ start: "00:56", end: "06:56" }, { start: "14:26", end: "16:26" }]   # off-peak hours (as many windows as needed): authoritative for peak/off-peak and the countdown
 * mode: input_select.x           solar_left: sensor.x (kWh solaires restants aujourd'hui)
 * people: [{ name, entity, color }]    home_states: [home]   # states counted as "at home" (e.g. [home, "My zone"])
 * power_in: sensor.x (tension secteur, < 200 V = coupure)  internet: binary_sensor.x
 * leaks: [..]  doors: [..]
 */
const SF_WEATHER = Object.assign(Object.create(null), {
  "clear-night": ["Nuit claire", "mdi:weather-night"], sunny: ["Ensoleillé", "mdi:weather-sunny"],
  partlycloudy: ["Éclaircies", "mdi:weather-partly-cloudy"], cloudy: ["Nuageux", "mdi:weather-cloudy"],
  rainy: ["Pluie", "mdi:weather-rainy"], pouring: ["Averses", "mdi:weather-pouring"],
  fog: ["Brouillard", "mdi:weather-fog"], snowy: ["Neige", "mdi:weather-snowy"],
  "snowy-rainy": ["Neige fondue", "mdi:weather-snowy-rainy"], windy: ["Venteux", "mdi:weather-windy"],
  "windy-variant": ["Venteux", "mdi:weather-windy-variant"], lightning: ["Orage", "mdi:weather-lightning"],
  "lightning-rainy": ["Orage", "mdi:weather-lightning-rainy"], hail: ["Grêle", "mdi:weather-hail"],
  exceptional: ["Alerte météo", "mdi:alert"],
});
class SfBridgeCard extends SfBase {
  defaults() { return { people: [], leaks: [], doors: [], home_states: ["home"] }; }
  connectedCallback() {
    super.connectedCallback();
    clearInterval(this._tick);
    this._tick = setInterval(() => {
      const el = this.shadowRoot && this.shadowRoot.querySelector(".clock .s");
      if (el) el.textContent = String(new Date().getSeconds()).padStart(2, "0");
      if (new Date().getSeconds() === 0) this._schedule();
    }, 1000);
  }
  disconnectedCallback() { super.disconnectedCallback(); clearInterval(this._tick); this._tick = null; }
  css() {
    return `
      .hud.bridge { padding:22px 26px 20px; min-height:170px; }
      .floor { position:absolute; left:-50%; right:-50%; bottom:-40%; height:120%; pointer-events:none;
        transform: perspective(260px) rotateX(72deg); transform-origin:50% 100%; opacity:.55;
        background-image: linear-gradient(rgb(var(--sf-cyan-rgb) / .35) 1px, transparent 1px),
                          linear-gradient(90deg, rgb(var(--sf-cyan-rgb) / .35) 1px, transparent 1px);
        background-size: 46px 46px; animation: travel 3s linear infinite;
        mask-image: linear-gradient(to top, #000 0%, transparent 75%); -webkit-mask-image: linear-gradient(to top, #000 0%, transparent 75%); }
      @keyframes travel { to { background-position: 0 46px, 0 0; } }
      .horizon { position:absolute; left:0; right:0; top:58%; height:2px; pointer-events:none;
        background: linear-gradient(90deg, transparent, rgb(var(--sf-cyan-rgb) / .8), transparent); filter: blur(1px); }
      .top { position:relative; display:grid; grid-template-columns: auto 1fr auto; gap:28px; align-items:center; }
      @media (max-width: 900px) { .top { grid-template-columns: 1fr; gap:14px; } }
      .clock { font-family:Orbitron,sans-serif; font-weight:700; font-size:54px; line-height:1; color:var(--sf-strong);
        text-shadow: 0 0 18px rgb(var(--sf-cyan-rgb) / .75), 0 0 2px var(--sf-strong); letter-spacing:.04em; }
      .clock .s { font-size:22px; color:${SF_C.cyan}; margin-left:4px; }
      .date { margin-top:6px; letter-spacing:.24em; text-transform:uppercase; font-size:11px; color:${SF_C.dim}; }
      .status { text-align:center; }
      .status .big { font-family:Orbitron,sans-serif; font-weight:700; letter-spacing:.18em; font-size:17px; }
      .status .chips { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-top:10px; }
      .an { padding:5px 10px; border-radius:20px; font-size:11px; border:1px solid; }
      .an.red { color:${SF_C.red}; border-color:rgb(var(--sf-red-rgb) / .6); background:rgb(var(--sf-red-rgb) / .1); animation: blink 1.2s infinite; }
      .an.amber { color:${SF_C.amber}; border-color:rgb(var(--sf-amber-rgb) / .5); background:rgb(var(--sf-amber-rgb) / .08); }
      .meta { display:grid; grid-template-columns: repeat(2, minmax(120px, auto)); gap:10px 22px; }
      .meta .v { font-family:Orbitron,sans-serif; font-size:15px; color:var(--sf-strong); margin-top:2px; display:flex; align-items:center; gap:6px; }
      .crew { position:relative; display:flex; gap:10px; flex-wrap:wrap; margin-top:18px; padding-top:12px;
        border-top:1px solid rgb(var(--sf-cyan-rgb) / .14); align-items:center; }
      .member { display:flex; align-items:center; gap:7px; padding:4px 12px 4px 4px; border-radius:20px;
        background:rgb(var(--sf-fg-rgb) / .03); border:1px solid rgb(var(--sf-fg-rgb) / .08); font-size:12px; }
      .member .av { width:24px; height:24px; border-radius:50%; display:grid; place-items:center;
        font-family:Orbitron,sans-serif; font-size:11px; color:#03080f; }
      .member.away { opacity:.45; }
      .crew .right { margin-left:auto; font-size:11px; color:${SF_C.dim}; }`;
  }
  // Peak/off-peak: the `hc_windows` entered by the user are authoritative (as many as needed: 2, 3 periods a day…).
  // Without windows, the current price is compared with the off-peak price (`hc_price`). With neither, peak/off-peak is unknown: nothing is shown.
  _isHC(now) {
    const c = this._config, toMin = (x) => { const [h, m] = String(x).split(":").map(Number); return h * 60 + m; };
    const raw = c.hc_windows && c.hc_windows.length ? c.hc_windows : (c.hc_start && c.hc_end ? [{ start: c.hc_start, end: c.hc_end }] : []);
    const wins = raw.filter((w) => w && w.start && w.end).map((w) => [toMin(w.start), toMin(w.end)]).filter(([a, b]) => !isNaN(a) && !isNaN(b));
    const t = now.getHours() * 60 + now.getMinutes();
    const price = this.num(c.price), hcp = this.num(c.hc_price);
    let hc = null;
    if (wins.length) hc = wins.some(([a, b]) => (a > b ? (t >= a || t < b) : (t >= a && t < b)));
    else if (price !== null && hcp !== null) hc = Math.abs(price - hcp) < 0.0005;
    let left = null;
    if (hc !== null && wins.length) {
      const edges = wins.map((w) => w[hc ? 1 : 0]);
      left = Math.min(...edges.map((e) => { const d = (e - t + 1440) % 1440; return d === 0 ? 1440 : d; }));
    }
    return { hc, left };
  }
  render() {
    const c = this._config, now = new Date();
    const hh = String(now.getHours()).padStart(2, "0"), mm = String(now.getMinutes()).padStart(2, "0");
    const date = now.toLocaleDateString(this.locLatn, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const an = [];
    const v = this.num(c.power_in);
    if (c.power_in && (v === null || v < 200)) an.push(["red", v === null ? this.t("bridge.ups_not_responding") : this.t("bridge.power_cut_v_v", { v: Math.round(v) }), c.power_in]);
    c.leaks.forEach((id) => { if (this.st(id) && this.st(id).state === "on") an.push(["red", this.t("bridge.leak_n", { n: this._short(id) }), id]); });
    if (c.internet && this.st(c.internet) && this.st(c.internet).state === "off") an.push(["red", this.t("bridge.internet_down"), c.internet]);
    c.doors.forEach((id) => { if (this.st(id) && this.st(id).state === "on") an.push(["amber", this.t("bridge.n_open", { n: this._short(id) }), id]); });
    c.leaks.forEach((id) => { if (!this.ok(id)) an.push(["amber", this.t("bridge.leak_n_no_data", { n: this._short(id) }), id]); });
    const reds = an.filter((a) => a[0] === "red").length;
    const status = an.length
      ? `<div class="big" style="color:${this.esc(reds ? SF_C.red : SF_C.amber)}">${this.t("bridge.s_n_issue_s", { s: this.t(reds ? "ALERTE" : "VIGILANCE"), n: an.length })}</div>
         <div class="chips">${an.map(([k, t, id]) => `<span class="an ${this.esc(k)} click" data-e="${this.esc(id)}">${this.esc(t)}</span>`).join("")}</div>`
      : `<div class="big" style="color:${SF_C.green};text-shadow:0 0 12px rgb(var(--sf-green-rgb) / .6)">${this.t("bridge.all_normal")}</div>
         <div class="lbl" style="margin-top:8px">${this.t("bridge.doors_closed_no_leaks_mains_ok")}</div>`;

    const w = this.st(c.weather);
    const [wTxt0, wIco] = (w && SF_WEATHER[w.state]) || [w ? this.esc(w.state) : "—", "mdi:weather-cloudy-alert"];
    const wTxt = w && SF_WEATHER[w.state] ? this.t(wTxt0) : wTxt0;
    const out = this.num(c.outdoor);
    const { hc, left } = this._isHC(now);
    const price = this.num(c.price);
    const mode = this.st(c.mode);
    const modeTxt = mode ? this.esc(mode.state.replace(/^[^\p{L}]+/u, "")) : "—";
    const sol = this.num(c.solar_left);

    const crew = c.people.map((p) => {
      // "at home" = state `home`, or one of the `home_states` (custom home zone, smaller than "home").
      const hs = (c.home_states || ["home"]).map((x) => String(x).trim().toLowerCase());
      const home = this.st(p.entity) && hs.includes(String(this.st(p.entity).state).trim().toLowerCase());
      return `<span class="member click ${this.esc(home ? "" : "away")}" data-e="${this.esc(p.entity)}"><span class="av" style="background:${this.esc(p.color || SF_C.cyan)};box-shadow:0 0 8px ${this.esc(p.color || SF_C.cyan)}">${this.esc(String(p.name || "?")[0])}</span>${this.esc(p.name)} · ${home ? this.t("common.home") : this.t("common.away")}</span>`;
    }).join("");

    return `<div class="hud bridge"><div class="floor"></div><div class="horizon"></div>
      <i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>
      <div class="top">
        <div><div class="clock">${hh}:${mm}<span class="s">${String(now.getSeconds()).padStart(2, "0")}</span></div>
          <div class="date">${this.esc(date)}</div></div>
        <div class="status">${status}</div>
        <div class="meta">
          <div class="click" data-e="${this.esc(c.weather)}"><div class="lbl">${this.t("bridge.outside")}</div><div class="v">${this.icon(wIco, 18, SF_C.cyan)}${out === null ? "—" : this.nf(out, 1) + "°"}</div><div class="lbl" style="margin-top:2px">${wTxt}</div></div>
          ${c.price || hc !== null ? `<div class="click" data-e="${this.esc(c.price || "")}"><div class="lbl">${this.t("bridge.tariff")}</div><div class="v" style="color:${this.esc(hc === null ? SF_C.text : hc ? SF_C.green : SF_C.amber)}">${hc === null ? "" : this.t(hc ? "HC" : "HP") + " "}<span style="font-size:11px;color:${SF_C.text}">${price === null ? "" : this.nf(price, 3) + " €"}</span></div>${left === null ? "" : `<div class="lbl" style="margin-top:2px">${this.t("bridge.x_in_hhm", { x: this.t(hc ? "HP" : "HC"), h: Math.floor(left / 60), m: String(left % 60).padStart(2, "0") })}</div>`}</div>` : ""}
          ${c.mode ? `<div class="click" data-e="${this.esc(c.mode)}"><div class="lbl">${this.t("common.house_mode")}</div><div class="v">${modeTxt}</div></div>` : ""}
          ${c.solar_left ? `<div class="click" data-e="${this.esc(c.solar_left)}"><div class="lbl">${this.t("bridge.solar_remaining")}</div><div class="v">${this.icon("mdi:solar-power-variant", 16, SF_C.amber)}${sol === null ? "—" : this.nf(sol, 1) + " kWh"}</div></div>` : ""}
        </div>
      </div>
      ${c.people.length ? `<div class="crew"><span class="lbl">${this.t("bridge.presence")}</span>${crew}<span class="right">${this.esc(c.footer || "")}</span></div>` : ""}</div>`;
  }
  _short(id) {
    const s = this.st(id), n = String((s && s.attributes.friendly_name) || id).slice(0, 120);
    return this.esc(n.replace(/^(Fuite|Ouverture)\s*/i, "").replace(/\s*(Humidité|Contact|Porte|Water leak)$/i, ""));
  }
  getCardSize() { return 4; }
}

