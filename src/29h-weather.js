/* ================================================================= WEATHER */
/*
 * The weather with the time: a large clock and the date, the current conditions, then the next hours and the next days (the forecasts
 * Home Assistant already has for the weather entity; nothing is fetched from outside).
 * Winter line: "Frost expected -2°" when the next 14 hours go down to `frost_below` (°C, default 0), "Risk of black ice" when it is 1 °C or less now and raining or sleeting.
 *
 * type: custom:sf-weather-card
 * title: Weather
 * weather: weather.home
 * temperature: sensor.outdoor_temperature   # optional: your own outdoor sensor instead of the weather entity's temperature
 * clock: true                                # large clock and date
 * forecast: both                             # both | hourly | daily | none
 * hours: 8        days: 5
 */
class SfWeatherCard extends SfBase {
  defaults() { return { clock: true, forecast: "both", hours: 8, days: 5 }; }
  static getStubConfig() { return {}; }
  setConfig(config) { super.setConfig(config); this._unsubFc(); this._subFc(); }
  set hass(h) { this._hass = h; this._subFc(); this._schedule(); }
  get hass() { return this._hass; }
  connectedCallback() { super.connectedCallback(); this._subFc(); if (!this._ck) this._ck = setInterval(() => this._schedule(), 15000); }
  disconnectedCallback() { super.disconnectedCallback(); this._unsubFc(); if (this._ck) { clearInterval(this._ck); this._ck = null; } }
  _wid() { const w = this._config && this._config.weather; return typeof w === "string" && SF_EID.test(w) ? w : ""; }
  _types() { const f = String((this._config && this._config.forecast) || "both"); return f === "none" ? [] : f === "hourly" || f === "daily" ? [f] : ["hourly", "daily"]; }
  _n(k, d, max) { const n = Number(this._config[k]); return isFinite(n) && n >= 1 ? Math.min(max, Math.round(n)) : d; }
  _unsubFc() { for (const s of Object.values(this._fs || {})) if (s && s.unsub) { try { s.unsub(); } catch (e) { /* connection already closed */ } } this._fs = {}; }
  _subFc() {
    const id = this._wid(); if (!id || !this._hass || !this._hass.connection || !this.isConnected) return;
    for (const type of this._types()) this._subOne(id, type);
  }
  // One subscription per forecast type. A failure (entity without that forecast, unavailable…) is retried once a minute at most: HA calls
  // `hass` several times per second (the `fail` time is this card's _fcFail guard).
  async _subOne(id, type) {
    const S = this._fs || (this._fs = {}), key = `${type}|${id}`, cur = S[type];
    if (cur && cur.key === key && (cur.unsub || cur.busy || (cur.fail && Date.now() - cur.fail < 60000))) return;
    if (cur && cur.unsub) { try { cur.unsub(); } catch (e) { /* already closed */ } }
    const slot = (S[type] = { key, busy: true, data: null, fail: 0, unsub: null });
    try {
      const un = await this._hass.connection.subscribeMessage((ev) => { slot.data = (ev && Array.isArray(ev.forecast) ? ev.forecast : []); this._schedule(); }, { type: "weather/subscribe_forecast", forecast_type: type, entity_id: id });
      if (this._fs[type] === slot && this.isConnected) slot.unsub = un; else { try { un(); } catch (e) { /* already closed */ } }
    } catch (e) { slot.fail = Date.now(); }
    slot.busy = false;
  }
  _fc(type) { const s = (this._fs || {})[type]; return s && Array.isArray(s.data) ? s.data.filter((x) => x && typeof x === "object" && isFinite(Date.parse(x.datetime))) : []; }
  _cols(w) { return Math.max(3, Math.floor((w - 36 + 6) / 58)); }
  layoutKey(w) { return `${this._cols(w)}${w < 280 ? "n" : ""}`; }
  _wx(cond) { const e = SF_WEATHER[String(cond)]; return e ? { label: this.t(e[0]), icon: e[1] } : { label: cond ? String(cond) : "", icon: "mdi:weather-cloudy" }; }
  _fmt(d, o) { try { return new Intl.DateTimeFormat(this.locLatn, o).format(d); } catch (e) { return ""; } }
  // Steadman apparent temperature: AT = T + 0.33 e - 0.70 v - 4.00 (T in °C, v in m/s, e = water vapour pressure in hPa). Null when an input is missing.
  _steadman(t, tu, hum, wind, wu) {
    if (t === null || hum === null || hum === undefined || wind === null || wind === undefined || !isFinite(Number(t)) || !isFinite(Number(hum)) || !isFinite(Number(wind))) return null;
    const f = /f/i.test(String(tu)), T = f ? (Number(t) - 32) / 1.8 : Number(t), u = String(wu || "km/h").toLowerCase();
    const k = u.includes("m/s") ? 1 : u.includes("mph") || u.includes("mi") ? 0.44704 : u.includes("kn") ? 0.514444 : u.includes("ft") ? 0.3048 : 1 / 3.6;   // to m/s (default km/h, Home Assistant's unit)
    const e = (Math.min(100, Math.max(0, Number(hum))) / 100) * 6.105 * Math.exp((17.27 * T) / (237.7 + T)), at = T + 0.33 * e - 0.7 * Number(wind) * k - 4;
    return f ? at * 1.8 + 32 : at;
  }
  // Frost: the lowest forecast temperature of the next 14 hours (else today's low) is at or under `frost_below` (°C, default 0); "ice" when it is
  // freezing now and it is raining or sleeting. Null when nothing freezes. Values are read in the entity's unit and compared in °C.
  _frost(tv, tu, cond, hourly, daily) {
    const f = /f/i.test(String(tu)), c = (v) => (f ? (Number(v) - 32) / 1.8 : Number(v)), lim = sfAirNum(this._config.frost_below, 0);
    const vals = hourly.map((x) => x.temperature).concat(hourly.length ? [] : [daily[0] && daily[0].templow]).filter((v) => v !== null && v !== undefined && v !== "" && isFinite(Number(v)));
    if (tv !== null && isFinite(Number(tv))) vals.push(tv);
    if (!vals.length) return null;
    const min = Math.min(...vals.map(c));
    if (min > lim) return null;
    const now = tv !== null && isFinite(Number(tv)) ? c(tv) : null, low = f ? min * 1.8 + 32 : min;
    return { min: Math.abs(low) < 0.5 ? 0 : low, ice: now !== null && now <= 1 && ["rainy", "pouring", "snowy-rainy", "hail", "lightning-rainy"].includes(String(cond)) };
  }
  _deg(v) { const n = Number(v); return v === null || v === undefined || !isFinite(n) ? "—" : `${this.nf(n, 0)}°`; }
  css() {
    return `
      .wx { display:flex; flex-wrap:wrap; align-items:center; gap:12px 22px; }
      .ck { flex:1 0 auto; max-width:100%; }
      .ck .tm { font-family:Orbitron,sans-serif; font-weight:500; font-size:44px; line-height:1; color:var(--sf-strong); text-shadow:0 0 14px rgb(var(--sf-cyan-rgb) / .45); white-space:nowrap; }
      .ck .dt { margin-top:6px; color:${SF_C.dim}; font-size:12px; }
      .ck .dt::first-letter { text-transform:uppercase; }
      .now { flex:0 1 auto; min-width:0; display:flex; align-items:center; gap:12px; color:${SF_C.cyan}; }
      .now .t { font-family:Orbitron,sans-serif; font-size:30px; line-height:1; color:var(--sf-strong); white-space:nowrap; }
      .now .t i { font-style:normal; font-size:13px; color:${SF_C.dim}; margin-left:4px; }
      .now .cd { margin-top:5px; color:${SF_C.text}; font-size:12px; }
      .kp { display:flex; flex-wrap:wrap; gap:6px 18px; margin-top:12px; font-size:11px; color:${SF_C.dim}; }
      .kp b { font-weight:400; color:${SF_C.text}; }
      .kp .fr, .kp .fr b { color:${SF_C.amber}; }
      .st { display:grid; grid-template-columns:repeat(var(--n,6),minmax(0,1fr)); gap:6px; margin-top:14px; }
      .st > div { min-width:0; display:flex; flex-direction:column; align-items:center; gap:5px; padding:8px 2px; border-radius:8px; border:1px solid rgb(var(--sf-cyan-rgb) / .14); background:rgb(var(--sf-cyan-rgb) / .04); }
      .st .h { font-size:10px; color:${SF_C.dim}; white-space:nowrap; text-transform:capitalize; }
      .st .v { font-family:Orbitron,sans-serif; font-size:13px; color:var(--sf-strong); white-space:nowrap; }
      .st .lo { font-size:11px; color:${SF_C.dim}; }
      .st .r { font-size:10px; color:var(--sf-cool); min-height:12px; }
      .st ha-icon { color:${SF_C.cyan}; }
      .st .sun ha-icon { color:${SF_C.amber}; }
      .nr .ck { flex:1 1 100%; } .nr .ck .tm { font-size:30px; white-space:normal; } .nr .now .t { font-size:24px; } .nr.wx { gap:10px 14px; }
      .nf { margin-top:12px; font-size:11px; color:${SF_C.dim}; }`;
  }
  render() {
    const c = this._config, id = this._wid(), s = this.st(id), ok = this.ok(id), a = (s && s.attributes) || {}, now = new Date();
    const own = typeof c.temperature === "string" && SF_EID.test(c.temperature) ? this.num(c.temperature) : null, tv = own !== null ? own : ok && a.temperature !== null && isFinite(Number(a.temperature)) ? Number(a.temperature) : null;
    const tu = String((own !== null && this.unit(c.temperature)) || a.temperature_unit || "°C"), wx = this._wx(ok ? s.state : ""), n = this._cols(this.width || 600), narrow = this.width > 0 && this.width < 280;
    const hourly = this._fc("hourly").filter((x) => Date.parse(x.datetime) > now.getTime() - 1800000).slice(0, Math.min(n, this._n("hours", 8, 24))), daily = this._fc("daily").slice(0, Math.min(n, this._n("days", 5, 10)));
    const hourly14 = this._fc("hourly").filter((x) => { const d = Date.parse(x.datetime); return d > now.getTime() - 1800000 && d < now.getTime() + 14 * 3600000; });
    const sunny = (k) => (k === "sunny" || k === "partlycloudy" ? "sun" : "");
    const kp = [];
    if (ok && a.humidity !== null && isFinite(Number(a.humidity))) kp.push(`${this.esc(this.t("room.humidity"))} <b>${this.nf(a.humidity, 0)} %</b>`);
    if (ok && a.wind_speed !== null && isFinite(Number(a.wind_speed))) kp.push(`${this.esc(this.t("weather.wind"))} <b>${this.nf(a.wind_speed, 0)} ${this.esc(a.wind_speed_unit || "km/h")}</b>`);
    // "Feels like": the value the weather entity gives, else computed here (Steadman apparent temperature) from the temperature, humidity and wind
    const feels = ok && a.apparent_temperature !== null && a.apparent_temperature !== undefined && isFinite(Number(a.apparent_temperature)) ? Number(a.apparent_temperature) : ok ? this._steadman(tv, tu, a.humidity, a.wind_speed, a.wind_speed_unit) : null;
    if (feels !== null) kp.push(`${this.esc(this.t("weather.feels"))} <b>${this._deg(feels)}</b>`);
    const frost = ok ? this._frost(tv, tu, s.state, hourly14, daily) : null;
    if (frost) kp.push(frost.ice ? `<span class="fr">${this.esc(this.t("weather.ice"))}</span>` : `<span class="fr">${this.esc(this.t("weather.frost"))} <b>${this._deg(frost.min)}</b></span>`);
    if (daily[0]) kp.push(`<b>↑ ${this._deg(daily[0].temperature)}</b> <b>↓ ${this._deg(daily[0].templow)}</b>`);
    const cell = (x, top, low) => { const w = this._wx(x.condition), r = Number(x.precipitation_probability);
      return `<div class="${sunny(x.condition)}" title="${this.esc(w.label)}"><span class="h">${this.esc(top)}</span>${this.icon(w.icon, 20)}<span class="v">${this._deg(x.temperature)}</span>${low ? `<span class="lo">${this._deg(x.templow)}</span>` : `<span class="r">${isFinite(r) && r >= 10 ? `${this.nf(r, 0)} %` : ""}</span>`}</div>`; };
    const failed = this._types().length && this._types().every((t) => { const x = (this._fs || {})[t]; return x && x.fail; });
    return this.frame(this.esc(c.title || this.t("weather.title")), this.esc(wx.label), `<div class="wx ${narrow ? "nr" : ""}">
      ${c.clock === false ? "" : `<div class="ck"><div class="tm">${this.esc(this._fmt(now, { hour: "2-digit", minute: "2-digit" }))}</div><div class="dt">${this.esc(this._fmt(now, { weekday: "long", day: "numeric", month: "long" }))}</div></div>`}
      <div class="now click ${sunny(ok ? s.state : "")}" data-e="${this.esc(id)}">${this.icon(wx.icon, narrow ? 30 : 44)}<div><div class="t">${tv === null ? "—" : this.nf(tv, 1)}<i>${this.esc(tu)}</i></div><div class="cd">${this.esc(wx.label || this.t("common.unavailable"))}</div></div></div></div>
      ${kp.length ? `<div class="kp">${kp.map((x) => `<span>${x}</span>`).join("")}</div>` : ""}
      ${hourly.length ? `<div class="st" style="--n:${hourly.length}">${hourly.map((x) => cell(x, this._fmt(new Date(x.datetime), { hour: "2-digit" }), false)).join("")}</div>` : ""}
      ${daily.length ? `<div class="st" style="--n:${daily.length}">${daily.map((x) => cell(x, this._fmt(new Date(x.datetime), { weekday: "short" }), true)).join("")}</div>` : ""}
      ${failed ? `<div class="nf">${this.esc(this.t("weather.no_forecast"))}</div>` : ""}`);
  }
  getCardSize() { return 5; }
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 6 }; }
}
