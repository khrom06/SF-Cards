/* ===================================================================== AIR */
/*
 * "Should I open the windows?": one verdict computed from indoor and outdoor air, with its reasons and the best moment of the next hours.
 * Moisture is compared in ABSOLUTE humidity (g/m³): 80 % outside at 5 °C is drier than 55 % inside at 21 °C, so airing does dry the house.
 * Read-only; every entity is optional except an indoor and an outdoor temperature (or a weather entity for the outside).
 * One room (indoor_* keys) or several (rooms:): each room gets its own verdict, the outside is shared, the most urgent room leads.
 *
 * type: custom:sf-air-card
 * title: Fresh air
 * rooms:                                       # or, for a single room: indoor_temperature / indoor_humidity / co2 / indoor_pm25
 *   - { name: Living room, temperature: sensor.living_temp, humidity: sensor.living_hum, co2: sensor.living_co2, pm25: sensor.purifier_pm25 }
 *   - { name: Bathroom, temperature: sensor.bath_temp, humidity: sensor.bath_hum, humidity_max: 70 }   # thresholds can be set per room
 *   - { name: Open space, areas: [Kitchen, Dining room], temperature: ..., openings: [binary_sensor.kitchen_window, binary_sensor.patio_door] }
 *     areas: the spaces one sensor covers (open-plan rooms), shown under the name.
 *     openings: window / door contacts; an open one is checked against the verdict ("airing", "enough, close it", "close it").
 * outdoor_temperature: sensor.out_temp        outdoor_humidity: sensor.out_hum        outdoor_pm25: sensor.out_pm25
 * wind: sensor.wind_speed                     rain_chance: sensor.rain_chance         weather: weather.home   # weather: fallbacks + hourly forecast
 * comfort_min: 19   comfort_max: 24   humidity_max: 60   co2_max: 1000   pm25_max: 25   pm25_in_max: 15   wind_max: 40   # km/h
 */
const sfAirList = (v) => (Array.isArray(v) ? v : [v]).filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim());
const SF_AIR_RANK = { open: 0, short: 1, none: 2, free: 3, closed: 4 };
const SF_AIR_WET = ["rainy", "pouring", "lightning-rainy", "snowy", "snowy-rainy", "hail", "lightning"];
// Absolute humidity in g/m³ (Magnus formula).
function sfAbsHum(t, rh) {
  if (t === null || rh === null || !isFinite(t) || !isFinite(rh)) return null;
  return (6.112 * Math.exp((17.67 * t) / (t + 243.5)) * rh * 2.1674) / (273.15 + t);
}
class SfAirCard extends SfBase {
  defaults() { return { comfort_min: 19, comfort_max: 24, humidity_max: 60, co2_max: 1000, pm25_max: 25, pm25_in_max: 15, wind_max: 40 }; }
  static getStubConfig() { return {}; }
  set hass(h) { this._hass = h; this._subFc(); this._schedule(); }
  get hass() { return this._hass; }
  setConfig(config) { const w = this._config && this._config.weather; super.setConfig(config); if (w !== this._config.weather) this._unsubFc(); this._subFc(); }
  connectedCallback() { super.connectedCallback(); this._subFc(); }
  disconnectedCallback() { super.disconnectedCallback(); this._unsubFc(); }
  _unsubFc() { if (this._fcUnsub) { try { this._fcUnsub(); } catch (e) { /* already closed */ } this._fcUnsub = null; } this._fc = null; this._fcFail = 0; }
  async _subFc() {
    const wx = this._config && this._config.weather;
    if (this._fcUnsub || this._fcBusy || !this.isConnected || !this._hass || !this._hass.connection || typeof wx !== "string" || !/^weather\.[a-z0-9_]+$/i.test(wx)) return;
    if (this._fcFail && Date.now() - this._fcFail < 60000) return;
    this._fcBusy = true;
    try {
      this._fcUnsub = await this._hass.connection.subscribeMessage((ev) => { this._fc = (ev && Array.isArray(ev.forecast) ? ev.forecast : []).slice(0, 48); this._schedule(); },
        { type: "weather/subscribe_forecast", forecast_type: "hourly", entity_id: wx });
    } catch (e) { this._fc = null; this._fcFail = Date.now(); }
    this._fcBusy = false;
  }
  _wx() { const s = this.st(this._config.weather); return s ? s.attributes || {} : {}; }
  _windKmh(v, unit) {
    if (v === null || !isFinite(v)) return null;
    const u = String(unit || "km/h").toLowerCase().replace(/\s/g, "");
    return u === "m/s" ? v * 3.6 : u === "mph" ? v * 1.609 : u === "kn" || u === "kt" ? v * 1.852 : v;
  }
  _multi() { return Array.isArray(this._config.rooms) && this._config.rooms.some((r) => r && typeof r === "object"); }
  // Rooms as { name, temperature, humidity, co2, pm25, thresholds }; the indoor_* keys are the single-room shorthand.
  _rooms() {
    const c = this._config;
    if (this._multi()) return c.rooms.filter((r) => r && typeof r === "object");
    return [{ name: c.room || "", temperature: c.indoor_temperature, humidity: c.indoor_humidity, co2: c.co2, pm25: c.indoor_pm25, openings: c.openings }];
  }
  _readRoom(r) { const n = (id) => (typeof id === "string" && id ? this.num(id) : null); return { Ti: n(r.temperature), RHi: n(r.humidity), co2: n(r.co2), pmi: n(r.pm25) }; }
  _read() {
    const c = this._config, wx = this._wx(), ws = this.st(c.weather), n = (id) => (id ? this.num(id) : null);
    const To = n(c.outdoor_temperature) ?? (isFinite(Number(wx.temperature)) ? Number(wx.temperature) : null);
    const RHo = n(c.outdoor_humidity) ?? (isFinite(Number(wx.humidity)) ? Number(wx.humidity) : null);
    const wind = c.wind ? this._windKmh(n(c.wind), this.unit(c.wind)) : this._windKmh(isFinite(Number(wx.wind_speed)) ? Number(wx.wind_speed) : null, wx.wind_speed_unit);
    const fc0 = Array.isArray(this._fc) && this._fc[0] ? this._fc[0] : null;
    const rain = n(c.rain_chance) ?? (fc0 && isFinite(Number(fc0.precipitation_probability)) ? Number(fc0.precipitation_probability) : null);
    return { To, RHo, pm: n(c.outdoor_pm25 || c.pm25), wind, rain, cond: ws ? String(ws.state) : "" };
  }
  // Verdict: closed (something outside forbids it), open (clear gain), short (gain, but it would chill the house), none (no need), free (nothing at stake).
  // Reasons are [tone, key, vars, shared]: shared = about the outside, the same for every room.
  _decide(m, room) {
    const c = this._config, r = room || {}, num = (k, d) => (r[k] !== undefined && r[k] !== "" && isFinite(Number(r[k])) ? Number(r[k]) : isFinite(Number(c[k])) ? Number(c[k]) : d);
    const cMin = num("comfort_min", 19), cMax = num("comfort_max", 24), hMax = num("humidity_max", 60), co2Max = num("co2_max", 1000), pmMax = num("pm25_max", 25), pmInMax = num("pm25_in_max", 15), wMax = num("wind_max", 40);
    const AHi = sfAbsHum(m.Ti, m.RHi), AHo = sfAbsHum(m.To, m.RHo), why = [];
    let block = false, gain = 0, chill = false, heat = false;
    if (SF_AIR_WET.includes(m.cond) || (m.rain !== null && m.rain >= 70)) { block = true; why.push(["bad", "air.why_rain", { v: m.rain !== null ? `${this.nf(m.rain, 0)} %` : "" }, 1]); }
    if (m.pm !== null && m.pm > pmMax) { block = true; why.push(["bad", "air.why_pm", { v: this.nf(m.pm, 0) }, 1]); }
    if (m.wind !== null && m.wind > wMax) { block = true; why.push(["bad", "air.why_wind", { v: `${this.nf(m.wind, 0)} km/h` }, 1]); }
    if (m.co2 !== null && m.co2 > co2Max) { gain += 2; why.push(["ok", "air.why_co2", { v: `${this.nf(m.co2, 0)} ppm` }]); }
    // Fine particles inside (cooking, candles, dust): airing helps only if the outside air is cleaner.
    if (m.pmi !== null && m.pmi > pmInMax) {
      if (m.pm !== null && m.pm >= m.pmi) why.push(["warn", "air.why_pm_in_out", { v: this.nf(m.pmi, 0) }]);
      else { gain += 2; why.push(["ok", "air.why_pm_in", { v: this.nf(m.pmi, 0) }]); }
    }
    if (AHi !== null && AHo !== null) {
      const d = AHi - AHo;
      if (d >= 1 && m.RHi !== null && m.RHi > hMax - 5) { gain += m.RHi > hMax ? 2 : 1; why.push(["ok", "air.why_dry", { v: `${this.nf(d, 1)} g/m³` }]); }
      else if (d <= -1.5) { why.push(["warn", "air.why_wet", { v: `${this.nf(-d, 1)} g/m³` }]); if (m.RHi !== null && m.RHi > hMax - 10) gain -= 1; }
    }
    if (m.Ti !== null && m.To !== null) {
      if (m.Ti > cMax && m.To < m.Ti - 1) { gain += 2; why.push(["ok", "air.why_cool", { v: `${this.nf(m.Ti - m.To, 1)} °C` }]); }
      else if (m.Ti < cMin && m.To > m.Ti + 1) { gain += 1; why.push(["ok", "air.why_warm", { v: `${this.nf(m.To - m.Ti, 1)} °C` }]); }
      if (m.To < m.Ti - 6 && m.Ti <= cMax) { chill = true; why.push(["warn", "air.why_chill", { v: `${this.nf(m.Ti - m.To, 0)} °C` }]); }
      if (m.To > m.Ti + 1 && m.Ti >= cMax - 1) { heat = true; why.push(["warn", "air.why_heat", { v: `${this.nf(m.To - m.Ti, 1)} °C` }]); }
    }
    const v = block ? "closed" : gain >= 2 && !chill && !heat ? "open" : gain >= 1 ? "short" : chill || heat ? "none" : "free";
    return { v, why, AHi, AHo, gain, cool: m.Ti !== null && m.Ti > cMax };
  }
  // Best hour of the next 12 from the forecast: dry, calm, and the coolest (cooling) or mildest (otherwise).
  _best(cool) {
    const c = this._config, wMax = isFinite(Number(c.wind_max)) ? Number(c.wind_max) : 40, wx = this._wx(), now = Date.now();
    const hrs = (Array.isArray(this._fc) ? this._fc : []).map((f) => ({ t: Date.parse(f && f.datetime), temp: Number(f && f.temperature), p: Number(f && f.precipitation_probability), cond: String((f && f.condition) || ""), w: this._windKmh(Number(f && f.wind_speed), wx.wind_speed_unit) }))
      .filter((f) => isFinite(f.t) && isFinite(f.temp) && f.t > now - 3600000).slice(0, 12);
    if (!hrs.length) return null;
    const ok = (f) => !SF_AIR_WET.includes(f.cond) && !(isFinite(f.p) && f.p >= 50) && !(f.w !== null && isFinite(f.w) && f.w > wMax);
    let best = null;
    for (const f of hrs) if (ok(f) && (!best || (cool ? f.temp < best.temp : f.temp > best.temp))) best = f;
    return { hrs, best, ok };
  }
  _hm(t) { try { return new Intl.DateTimeFormat(this.locLatn, { hour: "2-digit", minute: "2-digit" }).format(new Date(t)); } catch (e) { return new Date(t).toISOString().slice(11, 16); } }
  css() {
    return `
      .top { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(0,1fr); align-items:center; gap:10px; }
      .side { min-width:0; }
      .side.r { text-align:right; }
      .side .lbl { margin-bottom:4px; }
      .side .t { font-family:Orbitron,sans-serif; font-size:24px; font-weight:700; color:var(--sf-strong); white-space:nowrap; }
      .side .t i { font-style:normal; font-size:.5em; opacity:.7; }
      .side .m { font-size:11px; color:${SF_C.dim}; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .top.narrow { grid-template-columns:repeat(2, minmax(0,1fr)); }
      .top.narrow > .wc { grid-column:1 / -1; grid-row:1; justify-self:center; }
      .top.narrow .win { width:112px; height:112px; }
      .side .m b { color:var(--sf-text); font-weight:500; }
      .win { position:relative; width:132px; height:132px; color:currentColor; }
      .win svg { width:100%; height:100%; overflow:visible; }
      .win .fr { fill:rgb(from currentColor r g b / .05); stroke:currentColor; stroke-width:2; filter:drop-shadow(0 0 6px currentColor); }
      .win .sky { fill:rgb(from currentColor r g b / .08); }
      .win .pn { fill:rgb(from currentColor r g b / .14); stroke:currentColor; stroke-width:1.6; transition:all .9s ease; }
      .win .fl { fill:none; stroke:currentColor; stroke-width:1.4; stroke-linecap:round; stroke-dasharray:6 14; opacity:.85; animation:flow var(--spd, 2.4s) linear infinite; }
      .win .fl.b { animation-delay:-.8s; opacity:.55; } .win .fl.c { animation-delay:-1.6s; opacity:.4; }
      @keyframes flow { to { stroke-dashoffset:-40; } }
      .win .drop { fill:${SF_C.cyan}; opacity:.75; animation:fall 1.1s linear infinite; }
      @keyframes fall { from { transform:translateY(-14px); opacity:0; } 30% { opacity:.8; } to { transform:translateY(22px); opacity:0; } }
      .win .halo { fill:none; stroke:currentColor; stroke-width:.6; stroke-dasharray:2 5; opacity:.4; transform-origin:50% 50%; animation:spin 30s linear infinite; }
      @keyframes spin { to { transform:rotate(360deg); } }
      .vd { text-align:center; margin-top:12px; }
      .vd b { display:inline-block; font-family:Orbitron,sans-serif; font-size:17px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; padding:5px 16px; border-radius:20px;
        border:1px solid currentColor; background:rgb(from currentColor r g b / .1); text-shadow:0 0 10px currentColor; box-shadow:0 0 16px rgb(from currentColor r g b / .25), inset 0 0 12px rgb(from currentColor r g b / .12); }
      .vd span { display:block; font-size:11px; color:${SF_C.dim}; margin-top:6px; letter-spacing:.06em; }
      .ah { margin-top:14px; }
      .ah .rw { display:flex; justify-content:space-between; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:${SF_C.dim}; margin-bottom:4px; }
      .ah .bars { position:relative; height:16px; border-radius:8px; background:rgb(var(--sf-fg-rgb) / .06); overflow:hidden; }
      .ah .bi, .ah .bo { position:absolute; top:0; bottom:0; border-radius:8px; transition:width .9s ease; }
      .ah .bi { left:0; background:linear-gradient(90deg, rgb(var(--sf-cyan-rgb) / .15), rgb(var(--sf-cyan-rgb) / .55)); box-shadow:0 0 8px rgb(var(--sf-cyan-rgb) / .5); }
      .ah .bo { left:0; height:6px; top:5px; background:${SF_C.amber}; box-shadow:0 0 8px ${SF_C.amber}; }
      .ah .lg { display:flex; gap:12px; font-size:10px; color:${SF_C.dim}; margin-top:4px; }
      .ah .lg i { display:inline-block; width:10px; height:4px; border-radius:2px; margin-right:4px; vertical-align:middle; }
      .why { display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; }
      .why span { font-size:11px; padding:3px 9px; border-radius:12px; border:1px solid rgb(from currentColor r g b / .45); background:rgb(from currentColor r g b / .08); }
      .fc { margin-top:14px; }
      .fc .rw { display:flex; justify-content:space-between; align-items:baseline; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:${SF_C.dim}; margin-bottom:6px; }
      .fc .rw b { font-family:Orbitron,sans-serif; letter-spacing:.04em; text-transform:none; font-size:12px; color:${SF_C.green}; }
      .fc .hs { display:grid; grid-template-columns:repeat(var(--n), minmax(0,1fr)); gap:3px; align-items:end; height:46px; }
      .fc .h { position:relative; border-radius:3px 3px 1px 1px; background:rgb(var(--sf-cyan-rgb) / .22); min-height:3px; }
      .fc .h.no { background:repeating-linear-gradient(135deg, rgb(var(--sf-red-rgb) / .35) 0 3px, transparent 3px 6px); }
      .fc .h.best { background:${SF_C.green}; box-shadow:0 0 10px ${SF_C.green}; }
      .fc .xs { display:grid; grid-template-columns:repeat(var(--n), minmax(0,1fr)); gap:3px; font-size:9px; color:${SF_C.dim}; text-align:center; margin-top:3px; font-family:'B612 Mono',monospace; }
      .need { color:${SF_C.amber}; font-size:12px; }
      .side .t.n { font-size:30px; } .side .t.n i { font-size:.45em; }
      .side .m.names { white-space:normal; line-height:1.35; }
      .rooms { margin-top:14px; display:flex; flex-direction:column; gap:6px; }
      .rooms .hd { display:flex; flex-wrap:wrap; justify-content:space-between; gap:2px 10px; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:${SF_C.dim}; }
      .rooms .hd i { display:inline-block; width:10px; height:4px; border-radius:2px; margin:0 4px 0 10px; vertical-align:middle; }
      .rm { position:relative; display:grid; grid-template-columns:minmax(0,1fr) auto 74px auto; align-items:center; gap:10px; padding:7px 10px 7px 13px; border-radius:8px;
        background:linear-gradient(90deg, rgb(from currentColor r g b / .1), rgb(from currentColor r g b / .02) 60%); border:1px solid rgb(from currentColor r g b / .2); }
      .rm::before { content:""; position:absolute; left:0; top:6px; bottom:6px; width:3px; border-radius:2px; background:currentColor; box-shadow:0 0 8px currentColor; }
      .rm.lead { border-color:rgb(from currentColor r g b / .5); box-shadow:0 0 14px rgb(from currentColor r g b / .18); }
      .rm .nm { min-width:0; }
      .rm .nm b { display:block; color:var(--sf-strong); font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .rm .nm i.ar { display:block; font-style:normal; font-size:10.5px; color:rgb(from currentColor r g b / .85); letter-spacing:.04em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .rm .pl .ow { display:inline-block; width:7px; height:7px; border-radius:50%; background:currentColor; margin-right:6px; vertical-align:1px; box-shadow:0 0 6px currentColor; animation:owp 1.6s ease-in-out infinite; }
      @keyframes owp { 50% { opacity:.3; } }
      .rm.st-close { animation:rmw 2.4s ease-in-out infinite; }
      @keyframes rmw { 50% { box-shadow:0 0 18px rgb(from currentColor r g b / .35); } }
      .rm .nm span { display:block; font-size:10.5px; color:${SF_C.dim}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px; }
      .rm .vl { font-family:'B612 Mono',monospace; font-size:11px; color:var(--sf-text); white-space:nowrap; text-align:right; }
      .rm .vl b { font-family:Orbitron,sans-serif; font-size:14px; color:var(--sf-strong); font-weight:700; }
      .rm .vl small { display:block; color:${SF_C.dim}; font-size:10px; }
      .rm .mb { position:relative; height:8px; border-radius:4px; background:rgb(var(--sf-fg-rgb) / .07); overflow:visible; }
      .rm .mb .bi { position:absolute; left:0; top:0; bottom:0; border-radius:4px; background:linear-gradient(90deg, rgb(var(--sf-cyan-rgb) / .2), rgb(var(--sf-cyan-rgb) / .65)); }
      .rm .mb .bo { position:absolute; top:-3px; bottom:-3px; width:2px; margin-left:-1px; background:${SF_C.amber}; box-shadow:0 0 6px ${SF_C.amber}; border-radius:1px; }
      .rm .pl { font-family:Orbitron,sans-serif; font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; padding:3px 9px; border-radius:12px; border:1px solid currentColor;
        background:rgb(from currentColor r g b / .12); text-shadow:0 0 8px currentColor; white-space:nowrap; }
      .rooms.narrow .hd .ml { display:none; }
      .rooms.narrow .rm { grid-template-columns:minmax(0,1fr) auto; row-gap:6px; }
      .rooms.narrow .rm .mb { grid-column:1 / -1; grid-row:3; }
      .rooms.narrow .rm .vl { grid-column:1; grid-row:2; text-align:left; } .rooms.narrow .rm .vl small { display:inline; margin-left:6px; }
      .rooms.narrow .rm .pl { grid-column:2; grid-row:1 / span 2; }`;
  }
  _window(v, m) {
    const open = v === "open" || v === "short", wet = SF_AIR_WET.includes(m.cond) || (m.rain !== null && m.rain >= 70);
    const spd = m.wind !== null ? Math.max(0.8, 3.2 - m.wind / 15) : 2.4;
    // Panes: closed = flat rectangles; open = trapezoids swung inwards (the inner edge grows, the outer one shrinks).
    const L = open ? (v === "open" ? "24,26 46,34 46,98 24,106" : "24,26 52,30 52,102 24,106") : "24,26 66,26 66,106 24,106";
    const R = open ? (v === "open" ? "108,26 86,34 86,98 108,106" : "108,26 80,30 80,102 108,106") : "66,26 108,26 108,106 66,106";
    const flows = open ? [36, 66, 96].map((y, k) => `<path class="fl ${["", "b", "c"][k]}" d="M-8 ${y} C 30 ${y - 10}, 60 ${y + 10}, 140 ${y - 4}"/>`).join("") : "";
    const drops = wet ? [30, 50, 70, 90, 110].map((x, k) => `<ellipse class="drop" cx="${x}" cy="${12 + (k % 2) * 6}" rx="1.4" ry="3" style="animation-delay:${(k * 0.23).toFixed(2)}s"/>`).join("") : "";
    return `<div class="win" style="--spd:${spd.toFixed(2)}s"><svg viewBox="0 0 132 132" aria-hidden="true"><circle class="halo" cx="66" cy="66" r="64"/>
      <rect class="sky" x="24" y="26" width="84" height="80" rx="3"/>${drops}<polygon class="pn" points="${L}"/><polygon class="pn" points="${R}"/>
      <rect class="fr" x="20" y="22" width="92" height="88" rx="5" fill="none"/>${flows}</svg></div>`;
  }
  // Window / door contacts of a room: the one open the longest, or null when all are closed (or none is configured).
  _opened(r) {
    let first = null;
    for (const id of sfAirList(r.openings)) {
      const s = this.st(id); if (!s || s.state !== "on") continue;
      const t = new Date(s.last_changed).getTime();
      if (!first || t < first.t) first = { id, t: isFinite(t) ? t : Date.now() };
    }
    return first && { id: first.id, min: Math.max(0, (Date.now() - first.t) / 60000) };
  }
  // What an open window means for the verdict: airing (good), enough (aired long enough, close it), close (it should not be open).
  _status(r, d) {
    const o = this._opened(r); if (!o) return null;
    const v = { v: this.ago(o.id) };
    if (d.v === "closed" || d.v === "none") return { k: "close", tone: SF_C.red, why: ["bad", "air.why_open_bad", v] };
    const max = d.v === "short" ? 10 : d.v === "open" && !d.cool ? 20 : Infinity;
    if (o.min > max) return { k: "enough", tone: SF_C.amber, why: ["warn", "air.why_open_long", v] };
    return { k: "airing", tone: SF_C.green, why: ["ok", "air.why_open_ok", v] };
  }
  _tone(v) { return { closed: SF_C.red, open: SF_C.green, short: SF_C.cyan, none: SF_C.amber, free: SF_C.cyan }[v]; }
  _sub(d) { return { closed: "air.sub_closed", open: d.cool ? "air.sub_open_cool" : "air.sub_open", short: "air.sub_short", none: "air.sub_none", free: "air.sub_free" }[d.v]; }
  _chips(why) {
    const tc = { ok: SF_C.green, warn: SF_C.amber, bad: SF_C.red };
    return why.length ? `<div class="why">${why.map(([k, key, vars]) => `<span style="color:${tc[k]}">${k === "ok" ? "✓" : k === "bad" ? "✕" : "!"} ${this.esc(this.t(key, vars))}</span>`).join("")}</div>` : "";
  }
  _forecast(cool) {
    const b = this._best(cool);
    if (!b) return "";
    const lo = Math.min(...b.hrs.map((f) => f.temp)), hi = Math.max(...b.hrs.map((f) => f.temp)), span = Math.max(1, hi - lo);
    const bars = b.hrs.map((f) => `<div class="h ${f === b.best ? "best" : !b.ok(f) ? "no" : ""}" title="${this.esc(`${this._hm(f.t)} · ${this.nf(f.temp, 0)} °C`)}" style="height:${(20 + ((f.temp - lo) / span) * 80).toFixed(0)}%"></div>`).join("");
    const xs = b.hrs.map((f, k) => `<span>${k % 3 === 0 ? this.esc(this._hm(f.t).slice(0, 2)) : ""}</span>`).join("");
    return `<div class="fc"><div class="rw"><span>${this.esc(this.t("air.next_hours"))}</span>${b.best ? `<b>${this.esc(this.t("air.best", { t: this._hm(b.best.t), v: `${this.nf(b.best.temp, 0)} °C` }))}</b>` : `<b style="color:${SF_C.red}">${this.esc(this.t("air.no_slot"))}</b>`}</div>
      <div class="hs" style="--n:${b.hrs.length}">${bars}</div><div class="xs" style="--n:${b.hrs.length}">${xs}</div></div>`;
  }
  _side(label, t, rh, ah, extra, right, ent) {
    return `<div class="side ${right ? "r" : ""}"><div class="lbl">${this.esc(label)}</div>
      <div class="t click" data-e="${this.esc(ent || "")}">${t === null ? "—" : this.nf(t, 1)}<i>°C</i></div>
      <div class="m">${rh === null ? "" : `<b>${this.nf(rh, 0)} %</b>`}${ah === null ? "" : ` · ${this.nf(ah, 1)} g/m³`}</div>${extra ? `<div class="m">${extra}</div>` : ""}</div>`;
  }
  render() {
    const c = this._config, out = this._read(), rooms = this._rooms(), multi = this._multi();
    const rs = rooms.map((r, k) => { const m = { ...out, ...this._readRoom(r) }; return { r, k, m, d: this._decide(m, r) }; });
    const has = rs.filter((x) => x.m.Ti !== null || x.m.RHi !== null || x.m.co2 !== null || x.m.pmi !== null);
    if (!has.length && out.To === null) return this.frame(this.esc(c.title || this.t("air.air")), "", `<div class="need">${this.esc(this.t("air.need"))}</div>`);
    const AHo = sfAbsHum(out.To, out.RHo), narrow = this.width > 0 && this.width < 440;
    const outX = [out.pm !== null ? `PM2.5 <b>${this.nf(out.pm, 0)}</b>` : "", out.wind !== null ? `${this.esc(this.t("air.wind"))} <b>${this.nf(out.wind, 0)}</b> km/h` : ""].filter(Boolean).join(" · ");
    const outSide = this._side(this.t("air.outside"), out.To, out.RHo, AHo, outX, true, c.outdoor_temperature || c.weather);
    if (!multi) {
      const { r, m, d } = rs[0], tone = this._tone(d.v), os = this._status(r, d), areas = sfAirList(r.areas).join(" · ");
      const inX = [m.co2 !== null ? `CO₂ <b>${this.nf(m.co2, 0)}</b> ppm` : "", m.pmi !== null ? `PM2.5 <b>${this.nf(m.pmi, 0)}</b>` : ""].filter(Boolean).join(" · ");
      const top = `<div class="top ${narrow ? "narrow" : ""}">${this._side([r.name || this.t("air.inside"), areas].filter(Boolean).join(" · "), m.Ti, m.RHi, d.AHi, inX, false, r.temperature)}<div class="wc" style="color:${tone}">${this._window(d.v, m)}</div>${outSide}</div>`;
      const vd = `<div class="vd" style="color:${tone}"><b>${this.esc(this.t(`air.v_${d.v}`))}</b><span>${this.esc(this.t(this._sub(d)))}</span></div>`;
      let ah = "";
      if (d.AHi !== null && d.AHo !== null) {
        const mx = Math.max(d.AHi, d.AHo, 1) * 1.15;
        ah = `<div class="ah"><div class="rw"><span>${this.esc(this.t("air.moisture"))}</span><span style="text-transform:none;letter-spacing:.04em">${this.esc(Math.abs(d.AHi - d.AHo) < 0.05 ? this.t("air.same") : this.t(d.AHi > d.AHo ? "air.drier_out" : "air.wetter_out", { v: `${this.nf(Math.abs(d.AHi - d.AHo), 1)} g/m³` }))}</span></div>
        <div class="bars"><div class="bi" style="width:${((d.AHi / mx) * 100).toFixed(1)}%"></div><div class="bo" style="width:${((d.AHo / mx) * 100).toFixed(1)}%"></div></div>
        <div class="lg"><span><i style="background:${SF_C.cyan}"></i>${this.esc(this.t("air.inside"))}</span><span><i style="background:${SF_C.amber}"></i>${this.esc(this.t("air.outside"))}</span></div></div>`;
      }
      return this.frame(this.esc(c.title || this.t("air.air")), "", `${top}${vd}${ah}${this._chips(os ? [os.why, ...d.why] : d.why)}${this._forecast(d.cool)}`);
    }
    // Several rooms: the most urgent one leads the window and the verdict; every room gets its own line.
    const list = (has.length ? has : rs).slice().sort((a, b) => SF_AIR_RANK[a.d.v] - SF_AIR_RANK[b.d.v] || b.d.gain - a.d.gain || a.k - b.k);
    const lead = list[0], tone = this._tone(lead.d.v), act = list.filter((x) => x.d.v === "open" || x.d.v === "short");
    const nm = (x) => x.r.name || this.t("air.inside");
    const left = `<div class="side"><div class="lbl">${this.esc(this.t("air.to_air"))}</div><div class="t n" style="color:${act.length ? tone : "var(--sf-strong)"}">${act.length}<i>/${list.length}</i></div>
      <div class="m names">${act.length ? act.map((x) => `<b>${this.esc(nm(x))}</b>`).join(" · ") : this.esc(this.t("air.rooms_none"))}</div></div>`;
    const top = `<div class="top ${narrow ? "narrow" : ""}">${left}<div class="wc" style="color:${tone}">${this._window(lead.d.v, lead.m)}</div>${outSide}</div>`;
    const vd = `<div class="vd" style="color:${tone}"><b>${this.esc(this.t(`air.v_${lead.d.v}`))}</b><span>${this.esc(this.t(this._sub(lead.d)))}</span></div>`;
    const shared = lead.d.why.filter((w) => w[3]);
    const mx = Math.max(AHo || 0, ...list.map((x) => x.d.AHi || 0), 1) * 1.15;
    const rows = list.map((x, i) => {
      const { m, d } = x, os = this._status(x.r, d), own = (os ? [os.why] : []).concat(d.why.filter((w) => !w[3])), why = own.slice(0, 2).map(([, key, vars]) => this.t(key, vars)).join(" · ");
      const areas = sfAirList(x.r.areas).join(" · ");
      const extra = [m.co2 !== null ? `CO₂ ${this.nf(m.co2, 0)}` : "", m.pmi !== null ? `PM2.5 ${this.nf(m.pmi, 0)}` : ""].filter(Boolean).join(" · ");
      const val = `<div class="vl">${m.Ti === null ? "—" : `<b>${this.nf(m.Ti, 1)}</b> °C`}<small>${[m.RHi !== null ? `${this.nf(m.RHi, 0)} %` : "", d.AHi !== null ? `${this.nf(d.AHi, 1)} g/m³` : ""].filter(Boolean).join(" · ")}</small>${extra ? `<small>${extra}</small>` : ""}</div>`;
      const bar = d.AHi !== null ? `<div class="mb" title="${this.esc(this.t("air.moisture"))}"><div class="bi" style="width:${((d.AHi / mx) * 100).toFixed(1)}%"></div>${AHo !== null ? `<div class="bo" style="left:${((AHo / mx) * 100).toFixed(1)}%"></div>` : ""}</div>` : `<div></div>`;
      return `<div class="rm ${i === 0 && act.length ? "lead" : ""} ${os ? `st-${os.k}` : ""}" style="color:${os ? os.tone : this._tone(d.v)}"><div class="nm click" data-e="${this.esc(x.r.temperature || x.r.humidity || "")}"><b>${this.esc(nm(x))}</b>${areas ? `<i class="ar">${this.esc(areas)}</i>` : ""}<span>${this.esc(why || this.t(this._sub(d)))}</span></div>
        ${val}${bar}<span class="pl">${os ? `<i class="ow"></i>` : ""}${this.esc(this.t(os ? `air.r_${os.k}` : `air.r_${d.v}`))}</span></div>`;
    }).join("");
    const hd = `<div class="hd"><span>${this.esc(this.t("air.rooms"))}</span><span><span class="ml">${this.esc(this.t("air.moisture"))}</span><i style="background:${SF_C.cyan}"></i>${this.esc(this.t("air.inside"))}<i style="background:${SF_C.amber};width:3px"></i>${this.esc(this.t("air.outside"))}</span></div>`;
    const cool = act.some((x) => x.d.cool);
    return this.frame(this.esc(c.title || this.t("air.air")), "", `${top}${vd}${this._chips(shared)}<div class="rooms ${narrow ? "narrow" : ""}">${hd}${rows}</div>${this._forecast(cool)}`);
  }
  layoutKey(w) { return w > 0 && w < 440 ? "narrow" : "wide"; }
  getCardSize() { return this._multi() ? 6 + Math.ceil(this._rooms().length * 0.7) : 6; }
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 6, min_rows: 5 }; }
}

