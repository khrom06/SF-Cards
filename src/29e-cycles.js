/* ================================================================== CYCLES */
/*
 * Appliance cycles from a simple power plug: washing machine, dryer, dishwasher, oven… The card finds the cycles in the power history
 * (above `start` W, over once below `stop` W for `stop_delay` min), then shows the one running (elapsed, expected end learnt from the
 * previous cycles, energy and cost so far) or the last one (finished X min ago, duration, kWh, cost), and the week. Read-only.
 *
 * type: custom:sf-cycles-card
 * title: Appliances
 * price: sensor.electricity_price      # €/kWh: an entity or a number (optional)
 * days: 7                              # history used (cycles, average duration)
 * appliances:
 *   - name: Washing machine
 *     power: sensor.washer_power        # W (kW converted)
 *     icon: mdi:washing-machine
 *     start: 8   stop: 3   stop_delay: 5   min_minutes: 3   # W, W, minutes, minutes
 *     done_hold: 120                    # minutes the "finished" state stays highlighted
 */
const SF_CY_MAX = 8, SF_CY_PTS = 20000;
// Cycles in a step series [[t, W], …]: returns { done: [...], cur } (cur = cycle still running at `now`, or null).
function sfCycles(pts, now, start, stop, delayMs, minMs) {
  const done = []; let cur = null, below = null;
  for (let i = 0; i < pts.length; i++) {
    const [t, p] = pts[i], tn = i + 1 < pts.length ? pts[i + 1][0] : now;
    if (!cur && p >= start) { cur = { s: t, e: null, kwh: 0, peak: 0, pts: [] }; below = null; }
    if (!cur) continue;
    if (p < stop) { if (below === null) below = t; } else below = null;
    const segEnd = below !== null ? Math.min(tn, below + delayMs) : tn;
    cur.kwh += (Math.max(0, p) * Math.max(0, segEnd - t)) / 3.6e9; cur.peak = Math.max(cur.peak, p);
    if (cur.pts.length < 2000) cur.pts.push([t, p]);
    if (below !== null && tn - below >= delayMs) { cur.e = below; if (cur.e - cur.s >= minMs) done.push(cur); cur = null; below = null; }
  }
  return { done, cur };
}
class SfCyclesCard extends SfBase {
  defaults() { return { days: 7, appliances: [] }; }
  static getStubConfig() { return { appliances: [] }; }
  _apps() {
    return (Array.isArray(this._config.appliances) ? this._config.appliances : []).filter((a) => a && typeof a.power === "string" && /^[a-z0-9_]+\.[a-z0-9_]+$/i.test(a.power)).slice(0, SF_CY_MAX);
  }
  layoutKey(w) { return this.balance(this._apps().length, 340, 12, w); }
  get _ld() { return this.__ld || (this.__ld = new SfLoader(this, { ttl: 900000, retry: 300000 })); }
  setConfig(config) { super.setConfig(config); this._ld.reset(); this._live = {}; this._lastHtml = null; this._load(); }
  set hass(h) { this._hass = h; this._track(); this._load(); this._schedule(); }
  get hass() { return this._hass; }
  connectedCallback() { super.connectedCallback(); this._load(); if (!this._tick) this._tick = setInterval(() => { this._lastHtml = null; this._schedule(); }, 30000); }
  disconnectedCallback() { super.disconnectedCallback(); if (this._tick) { clearInterval(this._tick); this._tick = null; } }
  _days() { const d = Number(this._config.days); return isFinite(d) && d >= 1 ? Math.min(31, Math.round(d)) : 7; }
  // Power changes seen live since the history was loaded (the card does not wait for the next history request to follow a running cycle).
  _track() {
    if (!this._config) return;
    const now = Date.now(); this._live = this._live || {};
    for (const a of this._apps()) {
      const w = this.watts(a.power); if (w === null) continue;
      const L = this._live[a.power] || (this._live[a.power] = []);
      if (!L.length || L[L.length - 1][1] !== w) { L.push([now, w]); if (L.length > 3000) L.shift(); }
    }
  }
  async _load() {
    if (!this._config || !this._hass || !this._hass.callWS) return;
    const ids = this._apps().map((a) => a.power); if (!ids.length) return;
    await this._ld.run(`${this._days()}|${ids.join(",")}`, async () => {
      const now = Date.now(), t0 = now - this._days() * 86400000;
      const r = await this._hass.callWS({ type: "history/history_during_period", start_time: new Date(t0).toISOString(), end_time: new Date(now).toISOString(),
        entity_ids: ids, include_start_time_state: true, significant_changes_only: false, minimal_response: true, no_attributes: true });
      const out = {};
      for (const id of ids) {
        const k = this.unit(id).toLowerCase() === "kw" ? 1000 : 1;
        out[id] = (r && Array.isArray(r[id]) ? r[id] : []).slice(-SF_CY_PTS).map((x) => [typeof x.lu === "number" ? x.lu * 1000 : typeof x.lc === "number" ? x.lc * 1000 : Date.parse(x.last_updated || x.last_changed || ""), parseFloat(x.s ?? x.state) * k])
          .filter((q) => isFinite(q[0]) && isFinite(q[1])).sort((p, q) => p[0] - q[0]);
      }
      this._live = {};
      return out;
    }, { fallback: () => ({}) });
  }
  _price() {
    const p = this._config.price;
    if (typeof p === "number" || (typeof p === "string" && /^\d+([.,]\d+)?$/.test(p))) return { v: parseFloat(String(p).replace(",", ".")), cur: this._config.currency || "€" };
    const v = typeof p === "string" ? this.num(p) : null;
    if (v === null) return null;
    const u = this.unit(p).split("/")[0].trim(), sym = { EUR: "€", USD: "$", GBP: "£", JPY: "¥", CNY: "¥", CHF: "CHF", PLN: "zł", RUB: "₽" }[u.toUpperCase()];
    return { v, cur: this._config.currency || sym || (u && u.length <= 4 ? u : "€") };
  }
  _dur(ms) { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`; }
  _hm(t) { try { return new Intl.DateTimeFormat(this.locLatn, { hour: "2-digit", minute: "2-digit" }).format(new Date(t)); } catch (e) { return new Date(t).toISOString().slice(11, 16); } }
  _ago(t) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return this.t("common.just_now"); if (m < 60) return this.t("common.n_min_ago", { n: m });
    const h = Math.round(m / 60); return h < 48 ? this.t("common.n_h_ago", { n: h }) : this.t("common.n_d_ago", { n: Math.round(h / 24) });
  }
  _state(a) {
    const now = Date.now(), num = (v, d) => (isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);
    const start = num(a.start, 8), stop = Math.min(start, num(a.stop, 3)), delay = num(a.stop_delay, 5) * 60000, minMs = num(a.min_minutes, 3) * 60000;
    const hist = (this._ld.data && this._ld.data.value && this._ld.data.value[a.power]) || [], live = (this._live && this._live[a.power]) || [];
    const lastT = hist.length ? hist[hist.length - 1][0] : 0, pts = hist.concat(live.filter((q) => q[0] > lastT));
    const w = this.watts(a.power);
    if (!pts.length && w !== null) pts.push([now, w]);
    const { done, cur } = sfCycles(pts, now, start, stop, delay, minMs);
    const durs = done.slice(-10).map((x) => x.e - x.s).sort((p, q) => p - q), med = durs.length ? durs[Math.floor(durs.length / 2)] : null;
    const last = done[done.length - 1] || null, hold = num(a.done_hold, 120) * 60000;
    const st = cur ? "run" : last && now - last.e < hold ? "done" : "idle";
    const week = { n: done.length + (cur ? 1 : 0), kwh: done.reduce((s, x) => s + x.kwh, 0) + (cur ? cur.kwh : 0) };
    return { st, cur, last, med, w, week, ok: this.ok(a.power) };
  }
  _wave(c, col) {
    if (!c || c.pts.length < 2) return `<svg class="wv" viewBox="0 0 100 26" aria-hidden="true"></svg>`;
    const end = c.e || Date.now(), span = Math.max(60000, end - c.s), mx = Math.max(10, c.peak);
    let d = "", py = null;
    for (const [t, p] of c.pts) { const x = (((Math.max(t, c.s) - c.s) / span) * 100).toFixed(1), y = (24 - (Math.min(p, mx) / mx) * 21).toFixed(1); d += py === null ? `M${x} ${y}` : `H${x}V${y}`; py = y; }
    d += `H100`;
    return `<svg class="wv" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true"><path class="wa" d="${d}V26H0Z" fill="${this.esc(col)}"/><path class="wl" d="${d}" stroke="${this.esc(col)}"/></svg>`;
  }
  css() {
    return `
      .grid { display:grid; gap:12px; }
      .ap { position:relative; display:grid; grid-template-columns:auto minmax(0,1fr); gap:12px; align-items:center; padding:12px; border-radius:14px;
        background:radial-gradient(120% 90% at 0% 0%, rgb(from currentColor r g b / .12), transparent 60%), rgb(var(--sf-cyan-rgb) / .02); border:1px solid rgb(from currentColor r g b / .25); }
      .dr { position:relative; width:86px; height:86px; }
      .dr svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
      .dr .pt { fill:none; stroke:rgb(var(--sf-fg-rgb) / .08); stroke-width:5; }
      .dr .pv { fill:none; stroke:currentColor; stroke-width:5; stroke-linecap:round; filter:drop-shadow(0 0 4px currentColor); transition:stroke-dasharray 1s ease; }
      .dr .door { fill:rgb(from currentColor r g b / .07); stroke:rgb(from currentColor r g b / .5); stroke-width:1.2; }
      .dr .spin { transform-origin:43px 43px; }
      .run .dr .spin { animation:spin 1.6s linear infinite; }
      .run .dr .spin.s2 { animation-duration:2.9s; animation-direction:reverse; }
      @keyframes spin { to { transform:rotate(360deg); } }
      .dr .wave { fill:rgb(from currentColor r g b / .25); }
      .run .dr .wave { animation:slosh 2.2s ease-in-out infinite; transform-origin:43px 52px; }
      @keyframes slosh { 50% { transform:rotate(-9deg) translateY(-1px); } }
      .dr ha-icon { position:absolute; inset:0; display:grid; place-items:center; --mdc-icon-size:24px; filter:drop-shadow(0 0 6px currentColor); }
      .done .dr { animation:glow 1.8s ease-in-out infinite; border-radius:50%; }
      @keyframes glow { 50% { box-shadow:0 0 22px rgb(from currentColor r g b / .45); } }
      .done .ck { position:absolute; right:-2px; top:-2px; width:22px; height:22px; border-radius:50%; background:currentColor; display:grid; place-items:center; box-shadow:0 0 10px currentColor; }
      .done .ck ha-icon { position:static; --mdc-icon-size:14px; color:var(--sf-on-accent); filter:none; }
      .nm { font-size:13px; color:var(--sf-strong); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .tg { display:inline-block; margin-top:4px; font-family:Orbitron,sans-serif; font-size:10px; letter-spacing:.16em; text-transform:uppercase; padding:2px 8px; border-radius:9px; border:1px solid currentColor; background:rgb(from currentColor r g b / .1); }
      .ln { font-size:11px; color:${SF_C.dim}; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .ln b { color:var(--sf-text); font-weight:500; }
      .big { font-family:Orbitron,sans-serif; font-size:18px; font-weight:700; color:var(--sf-strong); margin-top:4px; white-space:nowrap; }
      .big i { font-style:normal; font-size:.55em; color:${SF_C.dim}; margin-left:2px; }
      .big i.sb { margin-left:10px; font-family:'B612 Mono',monospace; font-weight:400; font-size:11px; }
      .wv { display:block; width:100%; height:26px; margin-top:6px; }
      .wv .wl { fill:none; stroke-width:1.4; vector-effect:non-scaling-stroke; stroke-linejoin:round; }
      .wv .wa { stroke:none; opacity:.16; }
      .wk { grid-column:1 / -1; display:flex; justify-content:space-between; gap:8px; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:${SF_C.dim}; padding-top:8px; border-top:1px dashed rgb(from currentColor r g b / .2); }
      .wk b { font-family:Orbitron,sans-serif; letter-spacing:.02em; text-transform:none; color:var(--sf-text); font-weight:500; }
      .empty { color:${SF_C.dim}; font-size:12px; }`;
  }
  _tile(a, pr) {
    const S = this._state(a), now = Date.now(), name = a.name || (this.st(a.power) && this.st(a.power).attributes.friendly_name) || a.power;
    const col = !S.ok ? SF_C.grey : S.st === "run" ? SF_C.cyan : S.st === "done" ? SF_C.green : SF_C.dim;
    const c = S.cur || S.last, money = (kwh) => (pr ? ` · ${this.nf(kwh * pr.v, 2)} ${pr.cur}` : "");
    let tag = this.t("cycles.idle"), line = "", big = "", sub = "";
    if (S.st === "run") {
      const el = now - S.cur.s;
      tag = this.t("cycles.running");
      line = S.med ? this.t("cycles.end_eta", { d: this._dur(el), t: this._hm(S.cur.s + Math.max(S.med, el + 60000)) }) : this.t("cycles.elapsed", { d: this._dur(el) });
      big = `${this.kw(S.w)}`; sub = `${this.nf(S.cur.kwh, 2)} kWh${money(S.cur.kwh)}`;
    } else if (S.last) {
      tag = this.t(S.st === "done" ? "cycles.done" : "cycles.idle");
      line = this.t("cycles.last", { a: this._ago(S.last.e), d: this._dur(S.last.e - S.last.s) });
      big = `${this.nf(S.last.kwh, 2)}<i>kWh</i>`; sub = pr ? `${this.nf(S.last.kwh * pr.v, 2)} ${pr.cur}` : "";
    } else { line = this._ld.data ? this.t("cycles.no_cycle", { n: this._days() }) : "…"; big = this.kw(S.w); }
    const prog = S.st === "run" && S.med ? Math.min(0.97, (now - S.cur.s) / S.med) : S.st === "done" ? 1 : 0, C = 2 * Math.PI * 39;
    const drum = `<div class="dr click" data-e="${this.esc(a.power)}"><svg viewBox="0 0 86 86" aria-hidden="true">
      <circle class="pt" cx="43" cy="43" r="39"/><circle class="pv" cx="43" cy="43" r="39" stroke-dasharray="${(prog * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 43 43)"/>
      <circle class="door" cx="43" cy="43" r="29"/><path class="wave" d="M17 50 Q 30 44 43 50 T 69 50 A 26 26 0 0 1 17 50 Z"/>
      <g class="spin"><circle cx="43" cy="43" r="22" fill="none" stroke="currentColor" stroke-width=".8" stroke-dasharray="3 5" opacity=".7"/></g>
      <g class="spin s2"><circle cx="43" cy="43" r="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="10 8" opacity=".5"/></g></svg>
      ${this.icon(a.icon || "mdi:washing-machine", 24)}${S.st === "done" ? `<span class="ck">${this.icon("mdi:check-bold", 14)}</span>` : ""}</div>`;
    const wk = `<div class="wk"><span>${this.esc(this.t("cycles.n_days", { n: this._days() }))}</span><span><b>${S.week.n}</b> ${this.esc(this.t("cycles.cycles"))} · <b>${this.nf(S.week.kwh, 1)} kWh</b>${pr ? ` · <b>${this.nf(S.week.kwh * pr.v, 2)} ${this.esc(pr.cur)}</b>` : ""}</span></div>`;
    return `<div class="ap ${S.st}" style="color:${col}">${drum}<div style="min-width:0"><div class="nm click" data-e="${this.esc(a.power)}">${this.esc(name)}</div><span class="tg">${this.esc(tag)}</span>
      <div class="big">${big}${sub ? `<i class="sb">${this.esc(sub)}</i>` : ""}</div><div class="ln">${this.esc(line)}</div>${this._wave(c, col)}</div>${wk}</div>`;
  }
  render() {
    const c = this._config, apps = this._apps(), pr = this._price();
    if (!apps.length) return this.frame(this.esc(c.title || this.t("cycles.title")), "", `<div class="empty">${this.esc(this.t("cycles.need"))}</div>`);
    const cols = this.balance(apps.length, 340, 12, this.width);
    return this.frame(this.esc(c.title || this.t("cycles.title")), "", `<div class="grid" style="grid-template-columns:repeat(${this.esc(cols)},minmax(0,1fr))">${apps.map((a) => this._tile(a, pr)).join("")}</div>`);
  }
  getCardSize() { return 3 + 2 * this._apps().length; }
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 4, min_rows: 3 }; }
}

