/* ================================================================== REPORT */
/*
 * The energy report of the week, the month or the year, in plain words: consumption, solar used, autonomy and cost compared with the
 * period before, one bar per day (solar / grid), who consumes, three facts worth knowing, and an image to share. It reads the long-term
 * statistics Home Assistant already keeps for your energy counters; nothing else is needed.
 *
 * type: custom:sf-report-card
 * title: Energy report
 * period: week                            # week (7 days) | month (30 days) | year (12 months); buttons switch
 * grid: sensor.grid_import_energy         # kWh counter: energy taken from the grid
 * solar: sensor.solar_self_consumed       # kWh counter: solar energy used by the home (optional)…
 * export: sensor.grid_export_energy       # …or give the solar PRODUCTION above and the grid export here (solar used = production − export)
 * cost: sensor.grid_cost                  # money counter (optional)…
 * price: 0.21                             # …or a price per kWh (number or entity), used when there is no cost counter
 * currency: "€"
 * devices: [{ name: Car, entity: sensor.car_energy, icon: mdi:car-electric }]   # kWh counters
 */
class SfReportCard extends SfBase {
  defaults() { return { period: "week", devices: [] }; }
  static getStubConfig() { return {}; }
  get _ld() { return this.__ld || (this.__ld = new SfLoader(this, { ttl: 900000, retry: 300000 })); }
  setConfig(config) { super.setConfig(config); this._per = null; this._off = 0; this._ld.reset(); this._lastHtml = null; this._load(); }
  set hass(h) { this._hass = h; this._load(); this._schedule(); }
  get hass() { return this._hass; }
  connectedCallback() { super.connectedCallback(); this._load(); }
  _id(k) { const v = this._config[k]; return typeof v === "string" && SF_EID.test(v) ? v : ""; }
  _devs() { return (Array.isArray(this._config.devices) ? this._config.devices : []).filter((x) => x && typeof x.entity === "string" && SF_EID.test(x.entity)).slice(0, 12); }
  _period() { const p = this._per || String(this._config.period || "week"); return p === "month" || p === "year" ? p : "week"; }
  // Bucket boundaries in local time: the period before, then the period shown (2n buckets, 2n + 1 boundaries).
  _starts() {
    const per = this._period(), n = per === "week" ? 7 : per === "month" ? 30 : 12, off = this._off || 0, t = [];
    for (let i = 2 * n - 1; i >= -1; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); const k = i + off * n;
      if (per === "year") { d.setDate(1); d.setMonth(d.getMonth() - k); } else d.setDate(d.getDate() - k);
      t.push(d.getTime());
    }
    return { per, n, off, t };
  }
  async _load() {
    if (!this._config || !this._hass || !this._hass.callWS || !this.isConnected) return;
    const ids = [...new Set([this._id("grid"), this._id("solar"), this._id("export"), this._id("cost"), ...this._devs().map((d) => d.entity)].filter(Boolean))]; if (!ids.length) return;
    const R = this._starts();
    await this._ld.run(`${ids.join(",")}|${R.per}|${R.t[0]}`, async () => {
      const r = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: new Date(R.t[0]).toISOString(), end_time: new Date(R.t[R.t.length - 1]).toISOString(),
        statistic_ids: ids, period: R.per === "year" ? "month" : "day", types: ["change"], units: { energy: "kWh" } });
      const series = {};
      for (const id of ids) {
        const a = new Array(2 * R.n).fill(0);
        for (const row of (r && Array.isArray(r[id]) ? r[id].slice(0, 800) : [])) {
          const s = typeof row.start === "number" ? row.start : Date.parse(row.start), e = typeof row.end === "number" ? row.end : Date.parse(row.end), v = Number(row.change);
          if (!isFinite(s) || !isFinite(v) || row.change === null) continue;
          const mid = isFinite(e) && e > s ? (s + e) / 2 : s + 1;   // the middle of the statistic's period decides its bucket (HA and browser time zones may differ)
          for (let i = 0; i < 2 * R.n; i++) if (mid >= R.t[i] && mid < R.t[i + 1]) { a[i] += Math.max(0, v); break; }
        }
        series[id] = a;
      }
      return { ...R, series };
    }, { fallback: () => null });
  }
  _price() {
    const p = this._config.price;
    if (typeof p === "number" || (typeof p === "string" && /^\d+([.,]\d+)?$/.test(p))) return parseFloat(String(p).replace(",", "."));
    return typeof p === "string" && SF_EID.test(p) ? this.num(p) : null;
  }
  _cur() {
    const c = this._config, u = this._id("cost") ? this.unit(this._id("cost")).split("/")[0].trim() : "";
    return String(c.currency || { EUR: "€", USD: "$", GBP: "£", CHF: "CHF", PLN: "zł" }[u.toUpperCase()] || (u && u.length <= 4 ? u : "€"));
  }
  _fmt(t, o) { try { return new Intl.DateTimeFormat(this.locLatn, o).format(new Date(t)); } catch (e) { return ""; } }
  // Everything the card and the exported image show, computed once from the statistics.
  _model() {
    const d = this._ld.data, v = d && !d.error ? d.value : null; if (!v || v.per !== this._period() || v.off !== (this._off || 0)) return null;
    const n = v.n, z = new Array(2 * n).fill(0), g = v.series[this._id("grid")] || z, ex = v.series[this._id("export")] || z, s = (v.series[this._id("solar")] || z).map((x, i) => Math.max(0, x - ex[i])), c = v.series[this._id("cost")] || null;
    const sum = (a, from) => a.slice(from, from + n).reduce((p, q) => p + q, 0), price = this._price(), hasSolar = !!this._id("solar");
    const tot = (from) => { const G = sum(g, from), S = sum(s, from), C = G + S; return { cons: C, solar: S, grid: G, auto: C > 0 ? (S / C) * 100 : null, cost: c ? sum(c, from) : price !== null ? G * price : null }; };
    const cur = tot(n), prev = tot(0), grid = g.slice(n), solar = s.slice(n), cons = grid.map((x, i) => x + solar[i]), t = v.t.slice(n, 2 * n);
    const lab = (x) => this._fmt(x, v.per === "week" ? { weekday: "short" } : v.per === "month" ? { day: "numeric" } : { month: "short" });
    const long = (x) => this._fmt(x, v.per === "year" ? { month: "long" } : { weekday: "long", day: "numeric", month: "short" });
    const all = this._devs().map((x) => { const st = this.st(x.entity); return { name: String(x.name || (st && st.attributes.friendly_name) || x.entity), icon: x.icon ? String(x.icon) : "", v: sum(v.series[x.entity] || z, n) }; })
      .filter((x) => x.v > 0.005).sort((p, q) => q.v - p.v), devs = all.slice(0, 5), rest = cur.cons - devs.reduce((p, q) => p + q.v, 0);
    const hl = [], iMax = cons.reduce((b, x, i) => (x > cons[b] ? i : b), 0);
    if (cons[iMax] > 0) hl.push(this.t(hasSolar ? "report.hl_peak" : "report.hl_peak_grid", { d: long(t[iMax]), v: this.nf(cons[iMax], 0), g: this.nf(grid[iMax], 0) }));
    if (hasSolar) { let b = -1, bp = 0; cons.forEach((x, i) => { const p = x > 0.2 ? solar[i] / x : 0; if (p > bp) { bp = p; b = i; } }); if (b >= 0 && bp >= 0.05) hl.push(this.t("report.hl_solar", { d: long(t[b]), p: this.nf(bp * 100, 0) })); }
    if (devs[0] && cur.cons > 0) hl.push(this.t("report.hl_top", { n: devs[0].name, p: this.nf(Math.min(100, (devs[0].v / cur.cons) * 100), 0) }));
    let range = "";
    try { const f = new Intl.DateTimeFormat(this.locLatn, v.per === "year" ? { month: "short", year: "numeric" } : { day: "numeric", month: "short" }); range = f.formatRange ? f.formatRange(new Date(t[0]), new Date(v.t[2 * n] - 1)) : `${f.format(new Date(t[0]))} – ${f.format(new Date(v.t[2 * n] - 1))}`; } catch (e) { range = ""; }
    return { per: v.per, n, labels: t.map(lab), grid, solar, cons, iMax, cur, prev, devs, rest: rest > 0.05 && devs.length ? rest : 0, hl, hasSolar, money: this._cur(), range };
  }
  // KPI tiles: [label, value, delta text, tone] — tone "good" / "bad" / "" (less energy or cost is good, more solar is good).
  _kpis(M) {
    // energy totals: kWh, or MWh from 10 000 kWh (a year of a whole house) so the value fits its tile
    const kwh = (v) => (v >= 9999.5 ? `${this.nf(v / 1000, 1)} MWh` : `${this.nf(v, 0)} kWh`);
    const pct = (a, b) => (b > 0.05 ? ((a - b) / b) * 100 : null), sg = (x, d = 0) => `${Math.abs(x) < 0.5 * Math.pow(10, -d) ? "" : x > 0 ? "+" : "−"}${this.nf(Math.abs(x), d)}`, k = [];
    const dC = pct(M.cur.cons, M.prev.cons); k.push([this.t("report.consumption"), kwh(M.cur.cons), dC === null ? "" : `${sg(dC)} %`, dC === null || Math.abs(dC) < 0.5 ? "" : dC < 0 ? "good" : "bad"]);
    if (M.hasSolar) {
      const dS = pct(M.cur.solar, M.prev.solar); k.push([this.t("report.solar_used"), kwh(M.cur.solar), dS === null ? "" : `${sg(dS)} %`, dS === null || Math.abs(dS) < 0.5 ? "" : dS > 0 ? "good" : "bad"]);
      const dA = M.cur.auto !== null && M.prev.auto !== null ? M.cur.auto - M.prev.auto : null;
      k.push([this.t("report.autonomy"), M.cur.auto === null ? "—" : `${this.nf(M.cur.auto, 0)} %`, dA === null ? "" : this.t("report.points", { n: sg(dA) }), dA === null || Math.abs(dA) < 0.5 ? "" : dA > 0 ? "good" : "bad"]);
    }
    if (M.cur.cost !== null) { const dM = M.prev.cost !== null && M.prev.cons > 0.05 ? M.cur.cost - M.prev.cost : null; k.push([this.t("report.grid_cost"), `${this.nf(M.cur.cost, 2)} ${M.money}`, dM === null ? "" : `${sg(dM, 2)} ${M.money}`, dM === null || Math.abs(dM) < 0.005 ? "" : dM < 0 ? "good" : "bad"]); }
    return k;
  }
  _title() { return String(this._config.title || this.t(`report.title_${this._period()}`)); }
  css() {
    return `
      .rb { display:flex; align-items:center; gap:8px; margin-bottom:14px; }
      .rb .seg { flex:1; min-width:0; flex-wrap:nowrap; gap:0; }
      .rb .seg .btn { flex:1 1 0; min-width:0; min-height:40px; border-radius:0; padding:6px 4px; white-space:nowrap; overflow:hidden; cursor:pointer; }
      .rb .seg .btn:first-child { border-radius:8px 0 0 8px; } .rb .seg .btn:last-child { border-radius:0 8px 8px 0; }
      .rb .seg .btn.on { background:${SF_C.cyan}; color:var(--sf-on-accent); box-shadow:none; }
      .rb .nav { flex:none; width:40px; min-height:40px; padding:0; cursor:pointer; }
      .rb .nav.off { opacity:.35; pointer-events:none; }
      .kps { display:grid; grid-template-columns:repeat(var(--n,4),minmax(0,1fr)); gap:10px; margin-bottom:16px; }
      .kpi { min-width:0; display:flex; flex-direction:column; gap:5px; padding:10px 12px; border:1px solid rgb(var(--sf-cyan-rgb) / .16); border-radius:10px; background:rgb(var(--sf-cyan-rgb) / .04); }
      .kpi .val { font-size:19px; color:var(--sf-strong); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .kpi .dl { font-size:11px; color:${SF_C.dim}; min-height:14px; } .kpi .dl.good { color:${SF_C.green}; } .kpi .dl.bad { color:${SF_C.amber}; }
      .lgd { display:flex; align-items:center; gap:14px; margin-bottom:8px; font-size:11px; color:${SF_C.dim}; }
      .lgd .lbl { margin-right:auto; }
      .lgd i { display:inline-block; width:10px; height:10px; margin-right:6px; vertical-align:-1px; background:var(--sf-cool); } .lgd i.s { background:${SF_C.green}; }
      .bars { height:170px; display:flex; align-items:stretch; gap:var(--bg,8px); padding:0 4px; border-bottom:1px solid rgb(var(--sf-cyan-rgb) / .3); }
      .bars .col { flex:1 1 0; min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:4px; }
      .bars .n { font-family:Orbitron,sans-serif; font-size:10px; color:var(--sf-strong); white-space:nowrap; }
      .bars .bar { width:min(38px,100%); display:flex; flex-direction:column; justify-content:flex-end; background:var(--sf-cool); border-radius:4px 4px 0 0; overflow:hidden; }
      .bars .bar b { display:block; background:${SF_C.green}; }
      .bars .mx .bar { outline:1px solid ${SF_C.amber}; } .bars .mx .n { color:${SF_C.amber}; }
      .xl { display:flex; gap:var(--bg,8px); padding:4px 4px 0; margin-bottom:16px; font-size:10px; color:${SF_C.dim}; }
      .xl span { flex:1 1 0; min-width:0; display:flex; justify-content:center; white-space:nowrap; } .xl .mx { color:${SF_C.amber}; }
      .who { display:flex; align-items:center; gap:10px; min-height:30px; }
      .who .nm { flex:0 0 34%; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .who .tr { flex:1; min-width:20px; height:10px; border-radius:5px; background:rgb(var(--sf-cyan-rgb) / .1); overflow:hidden; }
      .who .tr i { display:block; height:100%; border-radius:5px; background:${SF_C.cyan}; }
      .who.rest .nm { color:${SF_C.dim}; } .who.rest .tr i { background:${SF_C.grey}; }
      .who .val { flex:none; min-width:66px; text-align:end; color:var(--sf-strong); white-space:nowrap; }
      .hl { margin-top:14px; padding:12px 14px; border:1px solid rgb(var(--sf-amber-rgb) / .35); border-radius:10px; background:rgb(var(--sf-amber-rgb) / .05); display:flex; flex-direction:column; gap:7px; line-height:1.45; }
      .hl .lbl { color:${SF_C.amber}; }
      .ft { margin-top:14px; display:flex; justify-content:flex-end; }
      .ft .btn { min-height:40px; cursor:pointer; }
      .none { color:${SF_C.dim}; font-size:12px; padding:20px 0; }`;
  }
  render() {
    const per = this._period(), M = this._model(), off = this._off || 0;
    const seg = `<div class="rb"><div class="seg">${["week", "month", "year"].map((p, i) => `<span class="btn tile ${p === per ? "on" : ""}" data-i="${i}" data-per="${p}">${this.esc(this.t(`report.${p}`))}</span>`).join("")}</div>
      <span class="btn tile nav" data-i="3" data-nav="1" title="${this.esc(this.t("report.prev"))}">${this.icon("mdi:chevron-left", 20)}</span><span class="btn tile nav ${off ? "" : "off"}" data-i="4" data-nav="-1" title="${this.esc(this.t("report.next"))}">${this.icon("mdi:chevron-right", 20)}</span></div>`;
    if (!M || !(M.cur.cons > 0 || M.prev.cons > 0)) return this.frame(this.esc(this._title()), "", `${seg}<div class="none grow">${this.esc(this._ld.data ? this.t("report.no_data") : "…")}</div>`);
    const k = this._kpis(M), max = Math.max(0.001, ...M.cons), dense = M.n > 12;
    const bars = M.cons.map((x, i) => `<div class="col ${i === M.iMax ? "mx" : ""}" title="${this.esc(`${M.labels[i]} · ${this.nf(x, 1)} kWh`)}">${dense ? "" : `<span class="n">${this.nf(x, 0)}</span>`}<div class="bar" style="height:${Math.round((x / max) * 140)}px"><b style="height:${x > 0 ? ((M.solar[i] / x) * 100).toFixed(1) : 0}%"></b></div></div>`).join("");
    const xl = M.labels.map((l, i) => `<span class="${i === M.iMax ? "mx" : ""}">${dense && i % 5 !== 0 && i !== M.n - 1 ? "" : this.esc(l)}</span>`).join("");
    const top = Math.max(0.001, ...M.devs.map((x) => x.v), M.rest);
    const who = M.devs.map((x) => `<div class="who"><span class="nm">${this.esc(x.name)}</span><div class="tr"><i style="width:${((x.v / top) * 100).toFixed(1)}%"></i></div><span class="val">${this.nf(x.v, 0)} kWh</span></div>`).join("")
      + (M.rest ? `<div class="who rest"><span class="nm">${this.esc(this.t("report.rest"))}</span><div class="tr"><i style="width:${((M.rest / top) * 100).toFixed(1)}%"></i></div><span class="val">${this.nf(M.rest, 0)} kWh</span></div>` : "");
    return this.frame(this.esc(this._title()), this.esc(M.range), `${seg}
      <div class="kps" style="--n:${this.width && this.width < 600 ? Math.min(2, k.length) : k.length}">${k.map(([l, v, d, tone]) => `<div class="kpi"><span class="lbl">${this.esc(l)}</span><span class="val">${this.esc(v)}</span><span class="dl ${tone}">${this.esc(d)}</span></div>`).join("")}</div>
      <div class="lgd"><span class="lbl">${this.esc(this.t(per === "year" ? "report.per_month" : "report.per_day"))}</span>${M.hasSolar ? `<span><i class="s"></i>${this.esc(this.t("report.solar"))}</span>` : ""}<span><i></i>${this.esc(this.t("report.grid"))}</span></div>
      <div class="bars" style="--bg:${dense ? 2 : 8}px">${bars}</div><div class="xl" style="--bg:${dense ? 2 : 8}px">${xl}</div>
      ${who ? `<div class="lbl" style="margin-bottom:6px">${this.esc(this.t("report.who"))}</div>${who}` : ""}
      ${M.hl.length ? `<div class="hl"><span class="lbl">${this.esc(this.t("report.hl_title"))}</span>${M.hl.map((x) => `<span>${this.esc(x)}</span>`).join("")}</div>` : ""}
      <div class="ft grow"><span class="btn tile" data-i="5" data-export="1">${this.icon("mdi:image-outline", 16)}${this.esc(this.t("report.export"))}</span></div>`);
  }
  layoutKey(w) { return w < 600 ? 2 : 4; }
  afterRender() {
    const r = this.shadowRoot, again = () => { this._lastHtml = null; this._load(); this._schedule(); };
    r.querySelectorAll("[data-per]").forEach((el) => el.addEventListener("click", () => { if (this._period() === el.dataset.per) return; this._per = el.dataset.per; this._off = 0; again(); }));
    r.querySelectorAll("[data-nav]").forEach((el) => el.addEventListener("click", () => { this._off = Math.max(0, Math.min(24, (this._off || 0) + Number(el.dataset.nav))); again(); }));
    const ex = r.querySelector("[data-export]"); if (ex) ex.addEventListener("click", () => this._export());
  }
  // The report as an image (1080 x 1350, drawn on a canvas with the colours of the card's current theme and accent).
  _draw() {
    const M = this._model(); if (!M) return null;
    const W = 1080, H = 1350, P = 64, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const x = cv.getContext("2d"), cs = getComputedStyle(this), col = (n) => cs.getPropertyValue(`--sf-${n}`).trim() || "gray";
    const mono = (px) => `${px}px 'B612 Mono', ui-monospace, monospace`, orb = (px, wt = 500) => `${wt} ${px}px Orbitron, sans-serif`;
    const text = (s, px, py, font, fill, align = "left") => { x.font = font; x.fillStyle = fill; x.textAlign = align; x.fillText(String(s), px, py); };
    const fit = (s, font, w) => { x.font = font; s = String(s); if (x.measureText(s).width <= w) return s; while (s.length > 1 && x.measureText(`${s}…`).width > w) s = s.slice(0, -1); return `${s}…`; };
    const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, col("bg0")); bg.addColorStop(0.6, col("bg1")); bg.addColorStop(1, col("bg2")); x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.globalAlpha = 0.35; x.strokeStyle = col("cyan"); x.lineWidth = 2; x.strokeRect(20, 20, W - 40, H - 40); x.globalAlpha = 1;
    text(this._title().toUpperCase(), P, 104, orb(34, 700), col("cyan")); text(M.range, P, 148, mono(22), col("dim"));
    const k = this._kpis(M), kw = (W - 2 * P - (k.length - 1) * 18) / Math.max(1, k.length);
    k.forEach(([l, v, d, tone], i) => {
      const kx = P + i * (kw + 18); x.globalAlpha = 0.2; x.strokeStyle = col("cyan"); x.strokeRect(kx, 190, kw, 150); x.globalAlpha = 1;
      text(fit(l.toUpperCase(), mono(16), kw - 28), kx + 14, 226, mono(16), col("dim")); text(fit(v, orb(k.length > 3 ? 30 : 36), kw - 28), kx + 14, 278, orb(k.length > 3 ? 30 : 36), col("strong"));
      text(d, kx + 14, 318, mono(18), tone === "good" ? col("green") : tone === "bad" ? col("amber") : col("dim"));
    });
    const top = 420, bh = 300, max = Math.max(0.001, ...M.cons), gap = M.n > 12 ? 6 : 22, bw = (W - 2 * P - (M.n - 1) * gap) / M.n;
    text(this.t(M.per === "year" ? "report.per_month" : "report.per_day").toUpperCase(), P, top - 22, mono(16), col("dim"));
    M.cons.forEach((v, i) => {
      const bx = P + i * (bw + gap), h = (v / max) * bh, hs = v > 0 ? (M.solar[i] / v) * h : 0;
      x.fillStyle = col("cool"); x.fillRect(bx, top + bh - h, bw, h - hs); x.fillStyle = col("green"); x.fillRect(bx, top + bh - hs, bw, hs);
      if (M.n <= 12) text(this.nf(v, 0), bx + bw / 2, top + bh - h - 10, orb(18), i === M.iMax ? col("amber") : col("strong"), "center");
      if (M.n <= 12 || i % 5 === 0 || i === M.n - 1) text(M.labels[i], bx + bw / 2, top + bh + 30, mono(16), i === M.iMax ? col("amber") : col("dim"), "center");
    });
    x.globalAlpha = 0.4; x.fillStyle = col("cyan"); x.fillRect(P, top + bh, W - 2 * P, 2); x.globalAlpha = 1;
    let y = top + bh + 92; const rows = [...M.devs, ...(M.rest ? [{ name: this.t("report.rest"), v: M.rest, rest: true }] : [])], tv = Math.max(0.001, ...rows.map((r) => r.v));
    if (rows.length) { text(this.t("report.who").toUpperCase(), P, y, mono(16), col("dim")); y += 40; }
    for (const r of rows) {
      text(fit(r.name, mono(22), 300), P, y, mono(22), r.rest ? col("dim") : col("text")); x.globalAlpha = 0.12; x.fillStyle = col("cyan"); x.fillRect(P + 320, y - 16, 460, 14); x.globalAlpha = 1;
      x.fillStyle = r.rest ? col("grey") : col("cyan"); x.fillRect(P + 320, y - 16, 460 * (r.v / tv), 14); text(`${this.nf(r.v, 0)} kWh`, W - P, y, orb(20), col("strong"), "right"); y += 44;
    }
    y += 24;
    for (const line of M.hl) {   // simple word wrap
      let cur = ""; x.font = mono(22);
      for (const w of `• ${line}`.split(/\s+/)) { if (cur && x.measureText(`${cur} ${w}`).width > W - 2 * P) { if (y < H - 90) text(cur, P, y, mono(22), col("text")); y += 32; cur = `  ${w}`; } else cur = cur ? `${cur} ${w}` : w; }
      if (cur && y < H - 90) text(cur, P, y, mono(22), col("text")); y += 40;
    }
    text("SF Cards · Home Assistant", W - P, H - 48, mono(16), col("dim"), "right");
    return cv;
  }
  _export() {
    try {
      const cv = this._draw(); if (!cv) return;
      cv.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = `sf-report-${this._period()}-${new Date().toISOString().slice(0, 10)}.png`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }, "image/png");
    } catch (e) { /* drawing is a convenience: a failure must never break the card */ }
  }
  getCardSize() { return 9; }
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 6 }; }
}
