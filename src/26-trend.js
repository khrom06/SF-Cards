/* ================================================================ TENDANCE */
/*
 * Read-only history curves (no computation: we draw what Home Assistant recorded). Several series on one chart
 * (same unit) or one curve per row; range buttons; hover / touch = value at the targeted instant. Up to 48 h: full history;
 * beyond: long-term statistics (hourly mean), falling back to the history for an entity that has none.
 *
 * type: custom:sf-trend-card
 * title: Temperatures
 * hours: 24                 # range shown initially
 * ranges: [6, 24, 168]      # boutons de plage, en heures ([] = aucun bouton)
 * layout: auto              # auto (overlaid if same unit) | combined | separate
 * height: 150
 * series: [{ entity: sensor.x, name: Salon, color: "#00e5ff", unit: "°C", digits: 1 }]
 */
const SF_TREND_COLORS = [SF_C.cyan, SF_C.amber, SF_C.green, "#b388ff", "#ff7043", "#4fc3f7", "#ff4fd8", "#ffd54f"];
const SF_TREND_MAX_SERIES = 8, SF_TREND_POINTS = 240;
// Reduces a series [[t, v], …] to at most n points (mean per time slice); empty slices are simply absent from the curve.
function sfTrendReduce(pts, t0, t1, n = SF_TREND_POINTS) {
  const span = t1 - t0; if (!(span > 0) || !pts.length) return [];
  const sum = new Float64Array(n), cnt = new Uint32Array(n);
  for (const [t, v] of pts) { if (t < t0 || t > t1) continue; const i = Math.min(n - 1, Math.floor(((t - t0) / span) * n)); sum[i] += v; cnt[i]++; }
  const out = [];
  for (let i = 0; i < n; i++) if (cnt[i]) out.push([t0 + ((i + 0.5) / n) * span, sum[i] / cnt[i]]);
  return out;
}
class SfTrendCard extends SfBase {
  defaults() { return { hours: 24, ranges: [6, 24, 168], layout: "auto", height: 150, series: [] }; }
  _series() { return (Array.isArray(this._config.series) ? this._config.series : []).filter((s) => s && typeof s.entity === "string" && /^[a-z0-9_]+\.[a-z0-9_]+$/i.test(s.entity)).slice(0, SF_TREND_MAX_SERIES); }
  // A series with `attribute` is not read from the history but from a time-indexed attribute of the entity's CURRENT state (e.g. the `watts`
  // forecast of a solar-forecast sensor: { "2026-11-03T10:00:00+01:00": 1200, … }); it is drawn dashed.
  _attr(s) { return typeof s.attribute === "string" && /^[a-z0-9_]{1,40}$/i.test(s.attribute) ? s.attribute : ""; }
  // Range: a number of hours (rolling window) or "today" (local midnight to midnight, so that a forecast can extend into the future).
  _range() { const v = this._h ?? (this._config.window === "today" ? "today" : this._config.hours); if (v === "today") return "today"; const h = Number(v); return isFinite(h) && h >= 1 ? Math.min(720, Math.round(h)) : 24; }
  _hours() { const r = this._range(); return r === "today" ? 24 : r; }
  _ranges() { return (Array.isArray(this._config.ranges) ? this._config.ranges : []).map((v) => (v === "today" ? "today" : Math.round(Number(v)))).filter((n) => n === "today" || (isFinite(n) && n >= 1 && n <= 720)).slice(0, 5); }
  _keyNow() { return `${this._range()}|${this._series().map((s) => s.entity + (this._attr(s) ? "@" + this._attr(s) : "")).join(",")}`; }
  _win(now) {
    if (this._range() === "today") { const d0 = new Date(now); d0.setHours(0, 0, 0, 0); const d1 = new Date(d0); d1.setDate(d1.getDate() + 1); return { t0: d0.getTime(), t1: d1.getTime(), tEnd: Math.min(now, d1.getTime()), today: true }; }
    const h = this._hours(); return { t0: now - h * 3600000, t1: now, tEnd: now, today: false };
  }
  // Points of series i: history data, or the entity's current time-indexed attribute (bounded read: 5,000 entries at most).
  _pts(i, d) {
    const s = this._series()[i]; if (!s) return [];
    const f = this._factor(s), raw = this._pts0(s, d);
    return f === 1 ? raw : raw.map(([t, v]) => [t, v * f]);
  }
  // `factor` multiplies the values (e.g. 1000 to compare a kW sensor with a forecast in W); ignored if not a finite non-zero number.
  _factor(s) { const f = Number(s.factor); return isFinite(f) && f !== 0 ? f : 1; }
  _pts0(s, d) {
    const a = this._attr(s); if (!a) return d.pts[s.entity] || [];
    const st = this.st(s.entity), m = st && st.attributes && st.attributes[a]; if (!m || typeof m !== "object") return [];
    const out = []; let n = 0;
    for (const k in m) { if (!Object.prototype.hasOwnProperty.call(m, k)) continue; if (++n > 5000) break; const t = Date.parse(k), v = Number(m[k]); if (isFinite(t) && isFinite(v) && t >= d.t0 && t <= d.t1) out.push([t, v]); }
    return sfTrendReduce(out.sort((x, y) => x[0] - y[0]), d.t0, d.t1);
  }
  setConfig(config) { super.setConfig(config); this._h = null; this._data = null; this._at = 0; this._failAt = 0; this._lastHtml = null; this._load(); }
  set hass(h) { this._hass = h; this._load(); this._schedule(); }
  get hass() { return this._hass; }
  connectedCallback() { super.connectedCallback(); this._load(); }
  // Loading: never two at a time, refreshed only after a validity period, and after a failure we only retry once a minute
  // (HA calls `hass` several times per second: without these guards, an error would trigger a request on every call).
  async _load(force) {
    if (!this._config) return;   // attached / given `hass` before setConfig: nothing to load yet
    const ser = this._series();
    if (!ser.length || !this._hass || !this._hass.callWS || this._busy) return;
    const key = this._keyNow(), hrs = this._hours(), now = Date.now(), W = this._win(now);
    if (!force && this._data && !this._data.error && this._data.key === key && now - this._at < (hrs > 48 ? 600000 : 120000)) return;
    if (this._failAt && this._failKey === key && now - this._failAt < 60000) return;
    this._busy = true;
    try {
      const { t0, t1, tEnd } = W, ids = [...new Set(ser.filter((s) => !this._attr(s)).map((s) => s.entity))], out = {}, stat = {};
      const ISO = (t) => new Date(t).toISOString();
      if (hrs > 48 && !W.today && ids.length) {
        try {
          const r = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: ISO(t0), end_time: ISO(tEnd), statistic_ids: ids, period: hrs > 336 ? "day" : "hour", types: ["mean"] });
          for (const id of ids) { out[id] = (r && Array.isArray(r[id]) ? r[id] : []).map((q) => [typeof q.start === "number" ? q.start : Date.parse(q.start), Number(q.mean)]).filter((p) => isFinite(p[0]) && isFinite(p[1])); stat[id] = out[id].length > 0; }
        } catch (e) { /* fall back to the history below */ }
      }
      const missing = ids.filter((id) => !out[id] || !out[id].length);
      if (missing.length) {
        const r = await this._hass.callWS({ type: "history/history_during_period", start_time: ISO(t0), end_time: ISO(tEnd), entity_ids: missing,
          include_start_time_state: true, significant_changes_only: false, minimal_response: true, no_attributes: true });
        for (const id of missing) out[id] = (r && Array.isArray(r[id]) ? r[id] : []).map((x) => {
          const t = typeof x.lu === "number" ? x.lu * 1000 : typeof x.lc === "number" ? x.lc * 1000 : Date.parse(x.last_updated || x.last_changed || "");
          return [t, parseFloat(x.s ?? x.state)];
        }).filter((p) => isFinite(p[0]) && isFinite(p[1]));
      }
      // A stable series has only one point (its state at the start of the window): its last value is extended up to now to draw a line
      // (valid for the history, where the state persists; not for hourly statistics). A point before the start is brought back to the start.
      const pts = {}; for (const id of ids) {
        const raw = (out[id] || []).sort((a, b) => a[0] - b[0]).map(([t, v]) => [Math.max(t, t0), v]);
        if (raw.length && !stat[id] && raw[raw.length - 1][0] < tEnd) raw.push([tEnd, raw[raw.length - 1][1]]);
        pts[id] = sfTrendReduce(raw, t0, t1);
      }
      this._data = { key, t0, t1, pts }; this._at = Date.now(); this._failAt = 0;
    } catch (e) { this._failAt = Date.now(); this._failKey = key; this._data = { key, t0: W.t0, t1: W.t1, pts: {}, error: true }; this._at = Date.now(); }
    this._busy = false; this._lastHtml = null; this._schedule();
    if (this._keyNow() !== key) this._load();   // the range changed while loading
  }
  // Colour of each series: the one from the config, otherwise the first palette hue not already taken by a series (no duplicates).
  _cols(ser) {
    const used = new Set(ser.filter((x) => x.color).map((x) => String(x.color).toLowerCase())), free = SF_TREND_COLORS.filter((x) => !used.has(x.toLowerCase())); let k = 0;
    return ser.map((x) => x.color || free[k++ % free.length] || SF_C.cyan);
  }
  _rangeLabel(h) { return h === "today" ? this.t("common.today") : h >= 48 && h % 24 === 0 ? this.t("trend.n_d", { n: h / 24 }) : this.t("common.n_h", { n: h }); }
  _fmtT(t, long) {
    try { return new Intl.DateTimeFormat(this.locLatn, long ? { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" } : { hour: "2-digit", minute: "2-digit" }).format(new Date(t)); } catch (e) { return ""; }
  }
  css() {
    return `
      .rgs { display:flex; gap:6px; margin:0 0 10px; flex-wrap:wrap; }
      .rg { font:inherit; font-size:11px; padding:4px 10px; border-radius:12px; cursor:pointer; color:${SF_C.dim}; background:rgba(0,229,255,.04); border:1px solid rgba(0,229,255,.18); }
      .rg.on { color:${SF_C.cyan}; border-color:${SF_C.cyan}; background:rgba(0,229,255,.12); }
      .plot { position:relative; margin-bottom:6px; touch-action:pan-y; }
      .plot svg { width:100%; display:block; border-radius:6px; background:rgba(0,229,255,.025); }
      .gl { stroke:rgba(0,229,255,.12); stroke-width:1; vector-effect:non-scaling-stroke; }
      .gl.nowl { stroke:rgba(255,179,0,.55); stroke-dasharray:3 4; }
      .ln2 { fill:none; stroke-width:2; stroke-linejoin:round; stroke-linecap:round; vector-effect:non-scaling-stroke; }
      .ar { stroke:none; opacity:.14; }
      .yl { position:absolute; left:6px; font-size:9.5px; color:${SF_C.dim}; pointer-events:none; text-shadow:0 0 4px #000; }
      .yl.hi { top:3px; } .yl.lo { bottom:3px; } .yl.r { left:auto; right:6px; }
      .cur { position:absolute; top:0; bottom:0; width:1px; background:${SF_C.cyan}; opacity:0; pointer-events:none; }
      .ro { position:absolute; top:4px; right:6px; font-size:10.5px; padding:3px 7px; border-radius:6px; background:rgba(3,8,15,.88); border:1px solid rgba(0,229,255,.3); opacity:0; pointer-events:none; white-space:pre; }
      .plot.hov .cur, .plot.hov .ro { opacity:1; }
      .xl { display:flex; justify-content:space-between; font-size:9.5px; color:${SF_C.dim}; margin:0 0 8px; }
      .lg { display:flex; flex-wrap:wrap; gap:6px 16px; }
      .lg .it { display:flex; align-items:center; gap:6px; min-width:0; cursor:pointer; }
      .lg .dt { width:9px; height:9px; border-radius:50%; flex:none; box-shadow:0 0 6px currentColor; }
      .lg .nm { font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .lg .vl { font-family:Orbitron,sans-serif; font-size:12px; }
      .lg .mm { font-size:9.5px; color:${SF_C.dim}; }
      .empty { color:${SF_C.dim}; text-align:center; padding:26px 0; }`;
  }
  render() {
    const c = this._config, ser = this._series(), d = this._data && this._data.key === this._keyNow() ? this._data : null;
    const H = Math.max(80, Math.min(400, Number(c.height) || 150)), hrs = this._hours();
    const cols = this._cols(ser), units = ser.map((s) => s.unit || (this._attr(s) ? "" : this.unit(s.entity))), same = units.every((u) => u === units[0]);
    const comb = c.layout === "combined" || (c.layout !== "separate" && (same || ser.some((s) => s.axis === "right")));
    const btn = this._ranges().map((r) => `<button class="rg ${r === this._range() ? "on" : ""}" data-rg="${this.esc(r)}">${this.esc(this._rangeLabel(r))}</button>`).join("");
    const any = d && ser.some((s, i) => this._pts(i, d).length);
    let body;
    if (!d || !any) body = `<div class="empty">${this.esc(this.t(d && !this._busy ? "Aucune donnée" : "Chargement…"))}</div>`;
    else {
      this._plots = [];
      const groups = comb ? [ser.map((s, i) => i)] : ser.map((s, i) => [i]);
      const W = 600, X = (t) => ((t - d.t0) / (d.t1 - d.t0)) * W;
      const html = groups.map((idx) => {
        const all = idx.flatMap((i) => this._pts(i, d).map((p) => p[1]));
        if (!all.length) return "";
        // Two scales only if some series are marked `axis: right` AND others are not (otherwise a single one, on the left).
        const R = idx.filter((i) => ser[i].axis === "right"), L = idx.filter((i) => ser[i].axis !== "right"), two = R.length > 0 && L.length > 0;
        const scale = (ids) => { const v = ids.flatMap((i) => this._pts(i, d).map((p) => p[1])); if (!v.length) return null;
          let lo = Math.min(...v), hi = Math.max(...v); if (hi - lo < 1e-9) { lo -= 1; hi += 1; } const pad = (hi - lo) * 0.08; return { lo: lo - pad, hi: hi + pad, pad }; };
        const sc = two ? { L: scale(L), R: scale(R) } : { L: scale(idx), R: null };
        const dgOf = (ids) => (ids.length === 1 && Number.isFinite(Number(ser[ids[0]].digits)) ? Number(ser[ids[0]].digits) : 1);
        const lines = idx.map((i) => {
          const col = cols[i], pts = this._pts(i, d), S = two && ser[i].axis === "right" ? sc.R : sc.L;
          if (!pts.length || !S) return "";
          const Y = (v) => H - ((v - S.lo) / (S.hi - S.lo)) * H;
          const path = pts.map(([t, v], k) => `${k ? "L" : "M"}${X(t).toFixed(1)} ${Y(v).toFixed(1)}`).join("");
          const area = idx.length === 1 && pts.length > 1 && !this._attr(ser[i]) ? `<path class="ar" d="${path}L${X(pts[pts.length - 1][0]).toFixed(1)} ${H}L${X(pts[0][0]).toFixed(1)} ${H}Z" fill="${this.esc(col)}"/>` : "";
          return `${area}<path class="ln2" d="${path}" stroke="${this.esc(col)}"${this._attr(ser[i]) ? ' stroke-dasharray="7 5" opacity=".85"' : ""}/>`;
        }).join("");
        this._plots.push({ idx, d });
        let grid = [0.25, 0.5, 0.75].map((f) => `<line class="gl" x1="0" x2="${W}" y1="${(H * f).toFixed(1)}" y2="${(H * f).toFixed(1)}"/>`).join("");
        // "today" window: a marker at the current time separates what happened from what is forecast
        if (this._range() === "today" && Date.now() > d.t0 && Date.now() < d.t1) grid += `<line class="gl nowl" x1="${X(Date.now()).toFixed(1)}" x2="${X(Date.now()).toFixed(1)}" y1="0" y2="${H}"/>`;
        const uOf = (ids) => (ids.length === 1 ? units[ids[0]] : (ids.every((i) => units[i] === units[ids[0]]) ? units[ids[0]] : ""));
        const lab = (S, ids, cls, colr) => S ? `<span class="yl ${cls} hi" ${colr ? `style="color:${this.esc(colr)}"` : ""}>${this.esc(this.nf(S.hi - S.pad, dgOf(ids)))}${uOf(ids) ? " " + this.esc(uOf(ids)) : ""}</span><span class="yl ${cls} lo" ${colr ? `style="color:${this.esc(colr)}"` : ""}>${this.esc(this.nf(S.lo + S.pad, dgOf(ids)))}${uOf(ids) ? " " + this.esc(uOf(ids)) : ""}</span>` : "";
        return `<div class="plot" data-p="${this._plots.length - 1}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${this.esc(idx.map((i) => ser[i].name || (this.st(ser[i].entity) || { attributes: {} }).attributes.friendly_name || ser[i].entity).join(", "))}">${grid}${lines}</svg>
          ${lab(sc.L, two ? L : idx, "l")}${two ? lab(sc.R, R, "r", cols[R[0]]) : ""}
          <i class="cur"></i><span class="ro"></span></div>`;
      }).join("");
      const long = hrs > 48;
      body = `${html}<div class="xl"><span>${this.esc(this._fmtT(d.t0, long))}</span><span>${this.esc(this._fmtT((d.t0 + d.t1) / 2, long))}</span><span>${this.esc(this._fmtT(d.t1, long))}</span></div>`;
    }
    const lg = ser.map((s, i) => {
      const col = cols[i], st = this.st(s.entity), nm = s.name || (st && st.attributes.friendly_name) || s.entity;
      const pts = d ? this._pts(i, d) : [], vs = pts.map((p) => p[1]), dg = Number.isFinite(Number(s.digits)) ? Number(s.digits) : 1, u = units[i];
      // value now: the entity's state, or for an attribute series the point nearest to now
      let cur = this._attr(s) ? null : this.num(s.entity); if (cur !== null) cur *= this._factor(s);
      if (this._attr(s) && pts.length) { const nw = Date.now(); let b = pts[0]; for (const p of pts) if (Math.abs(p[0] - nw) < Math.abs(b[0] - nw)) b = p; cur = Math.abs(b[0] - nw) <= 3600000 ? b[1] : null; }
      const mm = vs.length ? `${this.t("trend.min")} ${this.nf(Math.min(...vs), dg)} · ${this.t("trend.max")} ${this.nf(Math.max(...vs), dg)}` : "";
      return `<div class="it" data-e="${this.esc(s.entity)}" style="color:${this.esc(col)}"><span class="dt" style="background:${this.esc(col)}"></span><span class="nm" style="color:${SF_C.text}" title="${this.esc(nm)}">${this.esc(nm)}</span>
        <span class="vl">${cur === null ? "—" : this.esc(this.nf(cur, dg)) + (u ? " " + this.esc(u) : "")}</span><span class="mm">${this.esc(mm)}</span></div>`;
    }).join("");
    return this.frame(this.esc(c.title || this.t("trend.trend")), "", `${btn ? `<div class="rgs">${btn}</div>` : ""}${body}<div class="lg">${lg}</div>`);
  }
  afterRender() {
    const root = this.shadowRoot;
    root.querySelectorAll("[data-rg]").forEach((b) => b.addEventListener("click", () => {
      const h = b.dataset.rg === "today" ? "today" : Number(b.dataset.rg); if (h !== "today" && !(h >= 1)) return; if (h === this._range()) return;
      this._h = h; this._data = null; this._failAt = 0; this._lastHtml = null; this._schedule(); this._load(true);
    }));
    root.querySelectorAll(".plot").forEach((el) => {
      const P = this._plots && this._plots[Number(el.dataset.p)]; if (!P) return;
      const cur = el.querySelector(".cur"), ro = el.querySelector(".ro"), ser = this._series();
      const show = (ev) => {
        const r = el.getBoundingClientRect(); if (!r.width) return;
        const f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), t = P.d.t0 + f * (P.d.t1 - P.d.t0), lines = [this._fmtT(t, this._hours() > 48)];
        for (const i of P.idx) {
          const pts = this._pts(i, P.d); if (!pts.length) continue;
          let best = pts[0]; for (const p of pts) if (Math.abs(p[0] - t) < Math.abs(best[0] - t)) best = p;
          const dg = Number.isFinite(Number(ser[i].digits)) ? Number(ser[i].digits) : 1;
          lines.push(`${P.idx.length > 1 ? (ser[i].name || ser[i].entity) + " : " : ""}${this.nf(best[1], dg)}`);
        }
        cur.style.left = `${f * 100}%`; ro.textContent = lines.join("\n"); el.classList.add("hov");
      };
      el.addEventListener("pointermove", show); el.addEventListener("pointerdown", show);
      el.addEventListener("pointerleave", () => el.classList.remove("hov")); el.addEventListener("pointercancel", () => el.classList.remove("hov"));
    });
  }
  getCardSize() { return Math.ceil((Number(this._config && this._config.height) || 150) / 50) + 3; }
}

