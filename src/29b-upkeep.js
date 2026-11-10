/* ================================================================== UPKEEP */
/*
 * Upkeep and consumables: filters, brushes, salt, batteries, anything that wears out. Each item shows its level and, better, WHEN it will
 * need attention: the card learns the wear rate from the entity's own history (least squares since the last reset) and projects the date.
 * Read-only, except the optional reset button (button.press / input_datetime, two presses within 4 s).
 *
 * type: custom:sf-upkeep-card
 * title: Upkeep
 * horizon: 30            # days shown on the timeline; items due within it are "to plan"
 * soon: 14               # amber below this many days
 * learn_days: 180        # history used to learn the wear rate (long-term statistics fill in beyond the recorder's raw history)
 * items:
 *   - name: HEPA filter
 *     entity: sensor.purifier_hepa_filter   # % left, time left (h / min / d), a date (timestamp, input_datetime) or a problem binary_sensor
 *     reset: button.purifier_reset_filter   # optional
 *     icon: mdi:air-filter
 *     warn: 20  crit: 10                    # % thresholds (percent items)
 *     replace_at: 0                         # level at which the item is due (percent / time items)
 *     every_days: 180                       # date items: the date is the LAST service, the next one is due N days later
 *     life: 150                             # time items: full life in the entity's unit (otherwise the highest value seen)
 */
const SF_UK_UNITS = { s: 1 / 3600, sec: 1 / 3600, min: 1 / 60, h: 1, hr: 1, hrs: 1, hours: 1, d: 24, day: 24, days: 24, j: 24, w: 168, wk: 168 };
const SF_UK_MAX_ITEMS = 24, SF_UK_DAY = 86400000;
// Wear rate (unit per day, negative = wearing) by least squares on the points since the last reset (a rise of more than `jump`).
function sfUpkeepRate(pts0, jump) {
  // Glitches first: some devices briefly report "100 %" when they reconnect, then the real value again. A rise that falls back within a
  // day is not a reset (it would otherwise restart the learning every time).
  const pts = pts0.filter((q, i) => {
    if (i === 0 || q[1] - pts0[i - 1][1] <= jump) return true;
    for (let j = i + 1; j < pts0.length && pts0[j][0] - q[0] < SF_UK_DAY; j++) if (pts0[j][1] <= pts0[i - 1][1] + jump) return false;
    return true;
  });
  let k = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i][1] - pts[i - 1][1] > jump) k = i;
  const p = pts.slice(k);
  if (p.length < 2 || p[p.length - 1][0] - p[0][0] < SF_UK_DAY / 2) return null;
  const n = p.length, t0 = p[0][0];
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [t, v] of p) { const x = (t - t0) / SF_UK_DAY; sx += x; sy += v; sxx += x * x; sxy += x * v; }
  const den = n * sxx - sx * sx;
  return Math.abs(den) < 1e-9 ? null : (n * sxy - sx * sy) / den;
}
class SfUpkeepCard extends SfBase {
  defaults() { return { horizon: 30, soon: 14, learn_days: 180, items: [] }; }
  static getStubConfig() { return { items: [] }; }
  _items() {
    return (Array.isArray(this._config.items) ? this._config.items : [])
      .filter((x) => x && typeof x.entity === "string" && /^[a-z0-9_]+\.[a-z0-9_]+$/i.test(x.entity)).slice(0, SF_UK_MAX_ITEMS);
  }
  layoutKey(w) { return this.balance(this._items().length, 300, 12, w); }
  get _ld() { return this.__ld || (this.__ld = new SfLoader(this, { ttl: 1800000, retry: 300000 })); }
  setConfig(config) { super.setConfig(config); this._ld.reset(); this._lastHtml = null; this._load(); }
  set hass(h) { this._hass = h; this._load(); this._schedule(); }
  get hass() { return this._hass; }
  connectedCallback() { super.connectedCallback(); this._load(); }
  _days() { const d = Number(this._config.learn_days); return isFinite(d) && d >= 2 ? Math.min(730, Math.round(d)) : 180; }
  // History of the numeric items (percent / time left): one request for all, refreshed every 30 min.
  async _load() {
    if (!this._config || !this._hass || !this._hass.callWS) return;
    const ids = this._items().filter((x) => this.num(x.entity) !== null).map((x) => x.entity);
    if (!ids.length) return;
    await this._ld.run(`${this._days()}|${ids.join(",")}`, async () => {
      const now = Date.now(), t0 = now - this._days() * SF_UK_DAY;
      const r = await this._hass.callWS({ type: "history/history_during_period", start_time: new Date(t0).toISOString(), end_time: new Date(now).toISOString(),
        entity_ids: ids, include_start_time_state: true, significant_changes_only: false, minimal_response: true, no_attributes: true });
      // Raw history only covers the recorder's purge window (often 10-30 days): the daily long-term statistics, when the entity has them,
      // reach further back and let a slow wear (1 % a month) be learnt. Optional: a refusal or an entity without statistics changes nothing.
      let stats = {};
      try { stats = (await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: new Date(t0).toISOString(), end_time: new Date(now).toISOString(), statistic_ids: ids, period: "day", types: ["mean", "state"] })) || {}; } catch (e) { stats = {}; }
      const out = {};
      for (const id of ids) {
        const raw = (r && Array.isArray(r[id]) ? r[id] : []).slice(-5000).map((x) => [typeof x.lu === "number" ? x.lu * 1000 : typeof x.lc === "number" ? x.lc * 1000 : Date.parse(x.last_updated || x.last_changed || ""), parseFloat(x.s ?? x.state)])
          .filter((q) => isFinite(q[0]) && isFinite(q[1])).sort((a, b) => a[0] - b[0]);
        const first = raw.length ? raw[0][0] : now;
        const old = (Array.isArray(stats[id]) ? stats[id] : []).slice(-800).map((x) => [typeof x.start === "number" ? x.start : Date.parse(x.start), parseFloat(x.mean ?? x.state)])
          .filter((q) => isFinite(q[0]) && isFinite(q[1]) && q[0] < first - 3600000);
        out[id] = old.concat(raw);
      }
      return out;
    }, { fallback: () => ({}) });
  }
  // What an item says now: level (0-100 or null), days until due (null = unknown), wear rate text, tone.
  _eval(it) {
    const c = this._config, id = it.entity, s = this.st(id), dom = id.split(".")[0], now = Date.now();
    const soon = Number(c.soon) > 0 ? Number(c.soon) : 14, warn = isFinite(Number(it.warn)) ? Number(it.warn) : 20, crit = isFinite(Number(it.crit)) ? Number(it.crit) : 10;
    const r = { level: null, days: null, rate: "", kind: "unknown", value: "—" };
    if (!s || ["unknown", "unavailable"].includes(s.state)) { r.tone = SF_C.grey; r.kind = "missing"; return r; }
    const a = s.attributes || {}, unit = String(a.unit_of_measurement || "").toLowerCase().trim(), n = this.num(id);
    const hist0 = (this._ld.data && this._ld.data.value && this._ld.data.value[id]) || [], nNow = this.num(id);
    const hist = hist0.length && nNow !== null ? hist0.concat([[now, nNow]]) : hist0;
    const isDate = a.device_class === "timestamp" || a.device_class === "date" || dom === "input_datetime" || /^\d{4}-\d{2}-\d{2}/.test(String(s.state));
    if (isDate) {
      const t = Date.parse(s.state), ts = isFinite(t) ? t : isFinite(Number(a.timestamp)) ? Number(a.timestamp) * 1000 : NaN;
      if (isFinite(ts)) {
        const every = Number(it.every_days) > 0 ? Number(it.every_days) : 0, due = every ? ts + every * SF_UK_DAY : ts;
        r.kind = "date"; r.days = Math.max(0, (due - now) / SF_UK_DAY); r.over = due < now ? (now - due) / SF_UK_DAY : 0;
        r.level = every ? Math.max(0, Math.min(100, (r.days / every) * 100)) : null;
        r.value = this.t(every ? "upkeep.done_on" : "upkeep.due_on", { d: this._date(every ? ts : due) });
        if (every) r.rate = this.t("upkeep.every", { n: this.nf(every, 0) });
      } else r.value = String(s.state);
    } else if (dom === "binary_sensor" || ["on", "off", "problem", "ok"].includes(String(s.state).toLowerCase())) {
      const bad = ["on", "problem"].includes(String(s.state).toLowerCase());
      r.kind = "flag"; r.level = bad ? 0 : 100; r.days = bad ? 0 : null; r.value = this.t(bad ? "upkeep.to_do" : "upkeep.ok");
    } else if (n !== null && (unit === "%" || !unit)) {
      r.kind = "pct"; r.level = Math.max(0, Math.min(100, n)); r.value = `${this.nf(n, 0)} %`;
      const at = Number(it.replace_at) || 0, rate = sfUpkeepRate(hist, 3);
      if (rate !== null && rate < -0.005) { r.days = Math.max(0, (n - at) / -rate); r.rate = this.t("upkeep.per_day", { v: `${this.nf(-rate, -rate < 1 ? 1 : 0)} %` }); }
      else if (rate !== null) r.rate = this.t("upkeep.stable");
      if (n <= at) r.days = 0;
      r.warnLvl = r.level <= crit ? 2 : r.level <= warn ? 1 : 0;
    } else if (n !== null && SF_UK_UNITS[unit] !== undefined) {
      const f = SF_UK_UNITS[unit], hLeft = n * f, life = Number(it.life) > 0 ? Number(it.life) * f : Math.max(hLeft, ...hist.map((p) => p[1] * f));
      r.kind = "time"; r.level = life > 0 ? Math.max(0, Math.min(100, (hLeft / life) * 100)) : null; r.value = hLeft >= 48 ? `${this.nf(hLeft / 24, 0)} ${this.t("upkeep.d")}` : `${this.nf(hLeft, 0)} h`;
      const at = (Number(it.replace_at) || 0) * f, rate = sfUpkeepRate(hist.map(([t, v]) => [t, v * f]), Math.max(1, life * 0.05));
      if (rate !== null && rate < -0.01) { r.days = Math.max(0, (hLeft - at) / -rate); r.rate = this.t("upkeep.use_per_day", { v: `${this.nf(-rate, -rate < 10 ? 1 : 0)} h` }); }
      else if (rate !== null) r.rate = this.t("upkeep.stable");
      if (hLeft <= at) r.days = 0;
      r.warnLvl = r.level !== null && r.level <= crit ? 2 : r.level !== null && r.level <= warn ? 1 : 0;
    } else r.value = String(s.state);
    const d = r.days;
    r.tone = r.kind === "missing" ? SF_C.grey : (d !== null && d < 1) || r.warnLvl === 2 ? SF_C.red : (d !== null && d <= soon) || r.warnLvl === 1 ? SF_C.amber : r.kind === "flag" ? SF_C.green : SF_C.cyan;
    r.sev = r.tone === SF_C.red ? 2 : r.tone === SF_C.amber ? 1 : 0;
    return r;
  }
  _date(t) {
    try { return new Intl.DateTimeFormat(this.locLatn, { day: "numeric", month: "short" }).format(new Date(t)); } catch (e) { return new Date(t).toISOString().slice(5, 10); }
  }
  _eta(r) {
    if (r.kind === "missing") return { big: "—", small: this.t("common.no_data") };
    if (r.days === null) return { big: "∞", small: r.kind === "flag" ? this.t("upkeep.ok") : r.rate ? this.t("upkeep.no_wear") : this._ld.data ? this.t("upkeep.learning") : "…" };
    if (r.days < 1) return { big: this.t("upkeep.now"), small: r.over >= 1 ? this.t("upkeep.late", { n: this.nf(r.over, 0) }) : this.t("upkeep.due") };
    const d = Math.round(r.days);
    return { big: d >= 365 ? `${this.nf(d / 365, 1)} ${this.t("upkeep.y")}` : `${d} ${this.t("upkeep.d")}`, small: `${r.kind === "date" ? "" : "≈ "}${this._date(Date.now() + r.days * SF_UK_DAY)}` };
  }
  css() {
    return `
      .verdict { display:flex; align-items:center; gap:14px; margin:-2px 0 12px; }
      .verdict .big { font-family:Orbitron,sans-serif; font-size:34px; font-weight:700; line-height:1; color:var(--sf-strong); text-shadow:0 0 14px currentColor; }
      .verdict .txt { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:${SF_C.dim}; line-height:1.5; }
      .verdict .txt b { color:var(--sf-strong); letter-spacing:.04em; text-transform:none; font-size:12px; }
      .utl { position:relative; height:46px; margin:18px 4px 22px; }
      .utl .axis { position:absolute; left:0; right:0; top:26px; height:2px; border-radius:1px; background:linear-gradient(90deg, rgb(var(--sf-red-rgb) / .7), rgb(var(--sf-amber-rgb) / .55) var(--soon), rgb(var(--sf-cyan-rgb) / .35)); }
      .utl .now { position:absolute; left:0; top:16px; width:2px; height:22px; background:${SF_C.cyan}; box-shadow:0 0 8px ${SF_C.cyan}; }
      .utl .scan { position:absolute; top:22px; left:0; width:30%; height:10px; background:linear-gradient(90deg, transparent, rgb(var(--sf-cyan-rgb) / .22), transparent); animation:sweep 5s linear infinite; pointer-events:none; }
      @keyframes sweep { from { transform:translateX(-40%); } to { transform:translateX(340%); } }
      .utl .tick { position:absolute; top:-14px; white-space:nowrap; font-size:9px; color:${SF_C.dim}; transform:translateX(-50%); font-family:'B612 Mono',monospace; }
      .utl .mk { position:absolute; top:19px; width:14px; height:14px; margin-left:-7px; border-radius:50%; background:var(--sf-bg2); border:2px solid currentColor; box-shadow:0 0 10px currentColor; display:grid; place-items:center; }
      .utl .mk ha-icon { --mdc-icon-size:8px; }
      .utl .mk.hot { animation:pulse 1.4s ease-in-out infinite; }
      .utl .mk .lab { position:absolute; bottom:17px; left:50%; transform:translateX(-50%); max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:9px; letter-spacing:.06em; padding:1px 5px; border-radius:6px; background:rgb(var(--sf-bg-rgb) / .8); border:1px solid rgb(from currentColor r g b / .4); }
      .utl .mk .lab.dn { bottom:auto; top:17px; }
      .utl .mk .lab.l { left:-4px; transform:none; }
      .utl .mk .lab.r { left:auto; right:-4px; transform:none; }
      .utl .more { position:absolute; right:-4px; top:18px; font-size:12px; color:${SF_C.dim}; }
      @keyframes pulse { 50% { box-shadow:0 0 2px currentColor; transform:scale(.86); } }
      .list { display:grid; gap:10px; }
      .it { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:12px; padding:10px 12px; border-radius:12px;
        background:linear-gradient(100deg, rgb(from currentColor r g b / .09), rgb(var(--sf-cyan-rgb) / .015) 60%); border:1px solid rgb(from currentColor r g b / .22); }
      .it .ring { position:relative; width:46px; height:46px; }
      .it .ring svg { position:absolute; inset:0; width:100%; height:100%; transform:rotate(-90deg); }
      .it .ring .tr { fill:none; stroke:rgb(var(--sf-fg-rgb) / .08); stroke-width:4; }
      .it .ring .vl { fill:none; stroke:currentColor; stroke-width:4; stroke-linecap:round; filter:drop-shadow(0 0 3px currentColor); transition:stroke-dasharray .9s ease; }
      .it .ring ha-icon { position:absolute; inset:0; display:grid; place-items:center; --mdc-icon-size:20px; }
      .it .nm { font-size:13px; color:var(--sf-strong); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .it .sb { font-size:10px; letter-spacing:.08em; color:${SF_C.dim}; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .it .seg { display:grid; grid-template-columns:repeat(20, 1fr); gap:2px; margin-top:6px; height:6px; }
      .it .seg i { border-radius:1px; background:rgb(var(--sf-fg-rgb) / .07); }
      .it .seg i.on { background:currentColor; box-shadow:0 0 5px currentColor; }
      .it .eta { text-align:right; min-width:62px; }
      .it .eta b { display:block; font-family:Orbitron,sans-serif; font-size:17px; font-weight:700; color:currentColor; text-shadow:0 0 10px currentColor; white-space:nowrap; }
      .it .eta span { font-size:10px; color:${SF_C.dim}; letter-spacing:.06em; white-space:nowrap; }
      .it .rs { margin-left:8px; padding:4px; border-radius:8px; border:1px solid rgb(from currentColor r g b / .35); color:${SF_C.dim}; display:inline-grid; place-items:center; vertical-align:middle; }
      .it .rs.armed { color:${SF_C.amber}; font-size:10px; padding:4px 8px; }
      .it .rs.sent { color:${SF_C.green}; }
      .it .rs.fail { color:${SF_C.red}; }
      .it.sev2 .ring { animation:pulse 1.6s ease-in-out infinite; border-radius:50%; }
      .empty { color:${SF_C.dim}; font-size:12px; }`;
  }
  render() {
    const c = this._config, items = this._items(), w = this.width;
    const horizon = Number(c.horizon) >= 3 ? Math.min(730, Number(c.horizon)) : 30, soon = Number(c.soon) > 0 ? Number(c.soon) : 14;
    const ev = items.map((it, i) => ({ it, i, r: this._eval(it) }))
      .sort((a, b) => (a.r.days ?? 1e9) - (b.r.days ?? 1e9) || b.r.sev - a.r.sev || (a.r.level ?? 101) - (b.r.level ?? 101) || a.i - b.i);
    const name = (it) => it.name || (this.st(it.entity) && this.st(it.entity).attributes.friendly_name) || it.entity;
    const due = ev.filter((e) => e.r.days !== null && e.r.days <= horizon), now = ev.filter((e) => e.r.days !== null && e.r.days < 1);
    const top = ev.find((e) => e.r.days !== null);
    const tone = now.length ? SF_C.red : due.some((e) => e.r.days <= soon) ? SF_C.amber : SF_C.green;
    const verdict = `<div class="verdict" style="color:${tone}"><div class="big">${due.length}</div><div class="txt">${this.esc(this.t("upkeep.to_plan", { n: this.nf(horizon, 0) }))}<br>${top ? `<b>${this.esc(this.t("upkeep.next", { name: name(top.it), eta: this._eta(top.r).big }))}</b>` : ""}</div></div>`;
    // Timeline: today on the left, the horizon on the right; markers that would overlap are nudged up and down alternately.
    const ticks = [0, Math.round(horizon / 3), Math.round((2 * horizon) / 3), horizon].map((d, k) => `<span class="tick" style="left:${(k === 0 ? 1.5 : k === 3 ? 97 : (d / horizon) * 100).toFixed(1)}%">${k === 0 ? this.esc(this.t("upkeep.today")) : `${d} ${this.esc(this.t("upkeep.d"))}`}</span>`).join("");
    // Labels: above the axis, or below it when the previous label above is too close; a third close one keeps only its marker.
    let lastUp = -99, lastDn = -99;
    const mks = ev.filter((e) => e.r.days !== null && e.r.days <= horizon).map((e) => {
      const x = Math.max(1, Math.min(99, (e.r.days / horizon) * 100)), nm = name(e.it), room = Math.min(30, 4 + nm.length * 1.1);
      let pos = "";
      if (x - lastUp >= room) { pos = "up"; lastUp = x; } else if (x - lastDn >= room) { pos = "dn"; lastDn = x; }
      const lab = pos ? `<span class="lab ${pos} ${x < 14 ? "l" : x > 86 ? "r" : ""}">${this.esc(nm)}</span>` : "";
      return `<span class="mk click ${e.r.days < 1 ? "hot" : ""}" data-e="${this.esc(e.it.entity)}" style="left:${x.toFixed(1)}%;color:${e.r.tone}" title="${this.esc(nm)}">${lab}</span>`;
    }).join("");
    const beyond = ev.some((e) => e.r.days !== null && e.r.days > horizon);
    const tl = ev.length ? `<div class="utl" style="--soon:${((soon / horizon) * 100).toFixed(0)}%"><div class="axis"></div><div class="scan"></div><div class="now"></div>${ticks}${mks}${beyond ? `<span class="more">›</span>` : ""}</div>` : "";
    const rows = ev.map(({ it, r }) => {
      const lv = r.level, segs = Array.from({ length: 20 }, (_, k) => `<i class="${lv !== null && k < Math.ceil(lv / 5) ? "on" : ""}"></i>`).join("");
      const eta = this._eta(r), rs = typeof it.reset === "string" && /^(button|input_button|script|input_datetime)\.[a-z0-9_]+$/i.test(it.reset) ? it.reset : "";
      const call = !rs ? "" : rs.startsWith("input_datetime.") ? this.call("input_datetime.set_datetime", { entity_id: rs, timestamp: Math.floor(Date.now() / 1000) }, this.t("upkeep.confirm_reset"))
        : this.call(rs.startsWith("script.") ? "script.turn_on" : rs.startsWith("input_button.") ? "input_button.press" : "button.press", { entity_id: rs }, this.t("upkeep.confirm_reset"));
      const dash = lv === null ? 0 : (lv / 100) * 119.4;
      const ico = it.icon || (this.st(it.entity) && this.st(it.entity).attributes.icon) || "mdi:wrench-clock";
      return `<div class="it sev${r.sev}" style="color:${r.tone}">
        <div class="ring click" data-e="${this.esc(it.entity)}"><svg viewBox="0 0 46 46"><circle class="tr" cx="23" cy="23" r="19"/><circle class="vl" cx="23" cy="23" r="19" stroke-dasharray="${dash.toFixed(1)} 119.4"/></svg>${this.icon(ico, 20)}</div>
        <div class="click" data-e="${this.esc(it.entity)}" style="min-width:0"><div class="nm">${this.esc(name(it))}</div><div class="sb">${this.esc([r.value, r.rate].filter(Boolean).join(" · "))}</div><div class="seg">${segs}</div></div>
        <div class="eta"><b>${this.esc(eta.big)}</b><span>${this.esc(eta.small)}</span>${call ? `<span class="rs click" ${call} title="${this.esc(this.t("upkeep.reset"))}">${this.icon("mdi:restore", 14)}</span>` : ""}</div></div>`;
    }).join("");
    const cols = this.balance(ev.length, 300, 12, w);
    const body = ev.length ? `${verdict}${tl}<div class="list" style="grid-template-columns:repeat(${this.esc(cols)},minmax(0,1fr))">${rows}</div>` : `<div class="empty">${this.esc(this.t("upkeep.empty"))}</div>`;
    return this.frame(this.esc(c.title || this.t("upkeep.upkeep")), this.esc(this.t("upkeep.horizon", { n: this.nf(horizon, 0) })), body);
  }
  getCardSize() { return 2 + this._items().length; }
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 4, min_rows: 3 }; }
}

