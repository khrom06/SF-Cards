/* ============================================================= AUTOMATIONS */
/*
 * Health of your automations, without opening the traces one by one: which are broken (invalid configuration, error on the last run),
 * which point at an entity that no longer answers, which have been silent for too long, which are disabled, and which are running now.
 * Reads the automation states, their latest traces (trace/list) and the entities each one uses (search/related, admin only: without it the
 * card still works from the states alone). Read-only.
 *
 * type: custom:sf-automations-card
 * title: Automations
 * stale_days: 30          # enabled but not triggered for N days = silent (0 = never flag)
 * include: [automation.heating_*]   # optional globs; exclude: [automation.test_*]
 * show_disabled: true     # list the disabled ones (otherwise only counted)
 * max_items: 8
 * check_entities: true    # look for entities that are unavailable / gone (one request per automation, every 15 min)
 */
const SF_AU_MAX = 400;
const sfGlob = (g) => new RegExp(`^${String(g).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
class SfAutomationsCard extends SfBase {
  defaults() { return { stale_days: 30, show_disabled: true, max_items: 8, check_entities: true }; }
  static getStubConfig() { return {}; }
  get _ldT() { return this.__ldT || (this.__ldT = new SfLoader(this, { ttl: 120000, retry: 300000 })); }
  get _ldR() { return this.__ldR || (this.__ldR = new SfLoader(this, { ttl: 900000, retry: 900000 })); }
  setConfig(config) { super.setConfig(config); this._ldT.reset(); this._ldR.reset(); this._lastHtml = null; this._load(); }
  set hass(h) { this._hass = h; this._load(); this._schedule(); }
  get hass() { return this._hass; }
  connectedCallback() { super.connectedCallback(); this._load(); if (!this._tick) this._tick = setInterval(() => { this._lastHtml = null; this._load(); this._schedule(); }, 60000); }
  disconnectedCallback() { super.disconnectedCallback(); if (this._tick) { clearInterval(this._tick); this._tick = null; } }
  _list() {
    const c = this._config, st = (this._hass && this._hass.states) || {};
    const inc = (Array.isArray(c.include) ? c.include : c.include ? [c.include] : []).slice(0, 30).map(sfGlob), exc = (Array.isArray(c.exclude) ? c.exclude : c.exclude ? [c.exclude] : []).slice(0, 30).map(sfGlob);
    return Object.keys(st).filter((id) => id.startsWith("automation.") && (!inc.length || inc.some((r) => r.test(id))) && !exc.some((r) => r.test(id))).sort().slice(0, SF_AU_MAX);
  }
  async _load() {
    if (!this._config || !this._hass || !this._hass.callWS) return;
    const ids = this._list(); if (!ids.length) return;
    await this._ldT.run("t", async () => {
      const r = await this._hass.callWS({ type: "trace/list", domain: "automation" });
      return (Array.isArray(r) ? r : []).slice(-2000).map((x) => x && { item: String(x.item_id || ""), t: Date.parse(x.timestamp && x.timestamp.start), exec: String(x.script_execution || ""), err: typeof x.error === "string" ? x.error : "", state: String(x.state || "") })
        .filter((x) => x && isFinite(x.t));
    }, { fallback: () => [] });
    if (this._config.check_entities === false) return;
    await this._ldR.run(ids.join(","), async () => {
      const out = {};
      for (const id of ids.slice(0, 150)) {   // sequential on purpose: never a burst of 150 parallel requests
        try { const r = await this._hass.callWS({ type: "search/related", item_type: "automation", item_id: id }); out[id] = (r && Array.isArray(r.entity) ? r.entity : []).filter((e) => typeof e === "string").slice(0, 60); }
        catch (e) { if (!Object.keys(out).length) throw e; }   // first call refused (not admin): give up quietly for this round
      }
      return out;
    }, { fallback: () => ({}) });
  }
  _ago(t) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return this.t("common.just_now"); if (m < 60) return this.t("common.n_min_ago", { n: m });
    const h = Math.round(m / 60); return h < 48 ? this.t("common.n_h_ago", { n: h }) : this.t("common.n_d_ago", { n: Math.round(h / 24) });
  }
  _analyse() {
    const c = this._config, ids = this._list(), now = Date.now(), staleD = Number(c.stale_days) >= 0 ? Number(c.stale_days) : 30;
    const tr = (this._ldT.data && Array.isArray(this._ldT.data.value)) ? this._ldT.data.value : [], rel = (this._ldR.data && this._ldR.data.value) || {};
    const byItem = {}; for (const x of tr) (byItem[x.item] = byItem[x.item] || []).push(x);
    const rows = [], count = { ok: 0, warn: 0, bad: 0, off: 0, run: 0 };
    for (const id of ids) {
      const s = this.st(id), a = (s && s.attributes) || {}, name = a.friendly_name || id;
      // Last run that really did something (finished or failed); runs stopped by their conditions say nothing about health.
      const runs = (byItem[String(a.id)] || []).sort((p, q) => q.t - p.t), lastRun = runs.find((x) => x.exec === "finished" || x.exec === "error" || x.err);
      const lt = Date.parse(a.last_triggered || ""), running = Number(a.current) > 0;
      let sev = "ok", why = "", when = isFinite(lt) ? lt : null;
      if (!s || s.state === "unavailable") { sev = "bad"; why = this.t("auto.invalid"); }
      else if (lastRun && (lastRun.exec === "error" || lastRun.err)) { sev = "bad"; why = this.t("auto.error", { e: (lastRun.err || "").slice(0, 80) }).replace(/[\s:—-]+$/, ""); when = lastRun.t; }
      else if (s.state === "off") { sev = "off"; why = this.t("auto.disabled"); }
      else {
        const dead = (rel[id] || []).filter((e) => !e.startsWith("automation.") && (!this.st(e) || this.st(e).state === "unavailable"));
        if (dead.length) { sev = "warn"; why = this.t("auto.dead", { n: dead.length, e: dead.slice(0, 2).map((e) => (this.st(e) && this.st(e).attributes.friendly_name) || e).join(", ") }); }
        else if (staleD > 0 && (!isFinite(lt) || now - lt > staleD * 86400000)) { sev = "warn"; why = isFinite(lt) ? this.t("auto.silent", { n: Math.round((now - lt) / 86400000) }) : this.t("auto.never"); }
      }
      if (running) count.run++;
      count[sev]++;
      rows.push({ id, name, sev, why, when, running, runs });
    }
    return { rows, count, n: ids.length, tr };
  }
  css() {
    return `
      .top { display:grid; grid-template-columns:auto minmax(0,1fr); gap:16px; align-items:center; }
      .dn { position:relative; width:118px; height:118px; }
      .dn svg { width:100%; height:100%; transform:rotate(-90deg); overflow:visible; }
      .dn .sg { fill:none; stroke-width:9; transition:stroke-dasharray .9s ease; }
      .dn .gl { filter:drop-shadow(0 0 5px currentColor); }
      .dn .rot { fill:none; stroke:${SF_C.cyan}; stroke-width:.8; stroke-dasharray:2 6; opacity:.5; transform-origin:50% 50%; animation:spin 20s linear infinite; }
      @keyframes spin { to { transform:rotate(360deg); } }
      .dn .mid { position:absolute; inset:0; display:grid; place-content:center; text-align:center; }
      .dn .mid b { font-family:Orbitron,sans-serif; font-size:26px; font-weight:700; color:var(--sf-strong); text-shadow:0 0 12px currentColor; }
      .dn .mid span { font-size:9px; letter-spacing:.2em; text-transform:uppercase; color:${SF_C.dim}; }
      .kp { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px; }
      .kp > div { padding:7px 10px; border-radius:9px; border:1px solid rgb(from currentColor r g b / .3); background:rgb(from currentColor r g b / .07); }
      .kp b { display:block; font-family:Orbitron,sans-serif; font-size:18px; color:currentColor; text-shadow:0 0 8px currentColor; }
      .kp span { font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:${SF_C.dim}; }
      .kp .live b::after { content:""; display:inline-block; width:7px; height:7px; margin-left:6px; border-radius:50%; background:currentColor; vertical-align:middle; animation:blink 1s ease-in-out infinite; }
      @keyframes blink { 50% { opacity:.2; } }
      .pl { margin-top:14px; }
      .pl .rw { display:flex; justify-content:space-between; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:${SF_C.dim}; margin-bottom:5px; }
      .pl svg { display:block; width:100%; height:34px; }
      .pl .base { stroke:rgb(var(--sf-fg-rgb) / .12); stroke-width:1; }
      .pl .r { stroke-width:1.6; stroke-linecap:round; }
      .pl .scan { fill:url(#sfAuScan); animation:scan 6s linear infinite; }
      @keyframes scan { from { transform:translateX(-60px); } to { transform:translateX(1000px); } }
      .ls { display:grid; gap:7px; margin-top:14px; }
      .ls .it { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:10px; align-items:center; padding:8px 10px; border-radius:10px; border:1px solid rgb(from currentColor r g b / .25);
        background:linear-gradient(100deg, rgb(from currentColor r g b / .1), transparent 70%); }
      .ls .nm { font-size:12px; color:var(--sf-strong); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .ls .wy { font-size:10px; color:${SF_C.dim}; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .ls .ag { font-size:10px; color:${SF_C.dim}; white-space:nowrap; font-family:'B612 Mono',monospace; }
      .ls .tg { font-size:9px; letter-spacing:.14em; text-transform:uppercase; padding:2px 7px; border-radius:8px; border:1px solid currentColor; font-family:Orbitron,sans-serif; }
      .allok { margin-top:14px; text-align:center; color:${SF_C.green}; font-size:12px; letter-spacing:.1em; }
      .more { margin-top:6px; font-size:10px; color:${SF_C.dim}; text-align:right; }
      .empty { color:${SF_C.dim}; font-size:12px; }`;
  }
  render() {
    const c = this._config, A = this._analyse();
    if (!A.n) return this.frame(this.esc(c.title || this.t("auto.autos")), "", `<div class="empty">${this.esc(this.t("auto.none"))}</div>`);
    const k = A.count, C = 2 * Math.PI * 46, segs = [[k.ok, SF_C.green], [k.warn, SF_C.amber], [k.bad, SF_C.red], [k.off, SF_C.grey]];
    let off = 0;
    const arcs = segs.map(([n, col]) => { const len = (n / A.n) * C, gap = n && n < A.n ? 2 : 0, s = `<circle class="sg ${col === SF_C.grey ? "" : "gl"}" cx="60" cy="60" r="46" stroke="${col}" style="color:${col}" stroke-dasharray="${Math.max(0, len - gap).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`; off += len; return n ? s : ""; }).join("");
    const tone = k.bad ? SF_C.red : k.warn ? SF_C.amber : SF_C.green;
    const dn = `<div class="dn" style="color:${tone}"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="46" fill="none" stroke="rgb(var(--sf-fg-rgb) / .07)" stroke-width="9"/>${arcs}<circle class="rot" cx="60" cy="60" r="57"/></svg>
      <div class="mid"><div><b>${k.ok}<span style="font-size:13px;letter-spacing:0">/${A.n - k.off}</span></b><br><span>${this.esc(this.t("auto.healthy"))}</span></div></div></div>`;
    const kp = `<div class="kp"><div style="color:${SF_C.red}"><b>${k.bad}</b><span>${this.esc(this.t("auto.broken"))}</span></div><div style="color:${SF_C.amber}"><b>${k.warn}</b><span>${this.esc(this.t("auto.to_check"))}</span></div>
      <div style="color:${SF_C.grey}"><b>${k.off}</b><span>${this.esc(this.t("auto.disabled_n"))}</span></div><div class="${k.run ? "live" : ""}" style="color:${SF_C.cyan}"><b>${k.run}</b><span>${this.esc(this.t("auto.running"))}</span></div></div>`;
    // 24 h pulse: one stroke per traced run (HA keeps the latest traces of each automation), coloured by its outcome.
    const now = Date.now(), t0 = now - 86400000, W = 1000;
    const runs = A.tr.filter((x) => x.t >= t0), col = (x) => x.exec === "error" || x.err ? SF_C.red : x.exec === "failed_conditions" || x.exec === "failed_single" ? SF_C.grey : x.exec === "aborted" || x.exec === "cancelled" ? SF_C.amber : SF_C.cyan;
    const strokes = runs.slice(-600).map((x) => { const X = (((x.t - t0) / 86400000) * W).toFixed(1), tall = x.exec === "finished" || x.exec === "error" || x.err; return `<line class="r" x1="${X}" x2="${X}" y1="${tall ? 4 : 12}" y2="30" stroke="${col(x)}"/>`; }).join("");
    const pl = A.tr.length ? `<div class="pl"><div class="rw"><span>${this.esc(this.t("auto.last_24h"))}</span><span>${this.esc(this.t("auto.n_runs", { n: runs.filter((x) => x.exec === "finished").length }))}</span></div>
      <svg viewBox="0 0 ${W} 34" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sfAuScan"><stop offset="0" stop-color="${SF_C.cyan}" stop-opacity="0"/><stop offset="1" stop-color="${SF_C.cyan}" stop-opacity=".25"/></linearGradient></defs>
      <line class="base" x1="0" x2="${W}" y1="30" y2="30"/>${strokes}<rect class="scan" x="0" y="0" width="60" height="34"/></svg></div>` : "";
    const order = { bad: 0, warn: 1, off: 2 }, max = Number(c.max_items) >= 1 ? Math.min(50, Math.round(Number(c.max_items))) : 8;
    const issues = A.rows.filter((r) => r.sev !== "ok" && (r.sev !== "off" || c.show_disabled !== false)).sort((p, q) => order[p.sev] - order[q.sev] || (q.when || 0) - (p.when || 0));
    const tag = { bad: ["auto.t_broken", SF_C.red], warn: ["auto.t_check", SF_C.amber], off: ["auto.t_off", SF_C.grey] };
    const list = issues.slice(0, max).map((r) => `<div class="it click" data-e="${this.esc(r.id)}" style="color:${tag[r.sev][1]}"><span class="tg">${this.esc(this.t(tag[r.sev][0]))}</span>
      <div style="min-width:0"><div class="nm">${this.esc(r.name)}</div><div class="wy">${this.esc(r.why)}</div></div><span class="ag">${r.when ? this.esc(this._ago(r.when)) : ""}</span></div>`).join("");
    const body = `<div class="top">${dn}${kp}</div>${pl}${issues.length ? `<div class="ls">${list}</div>${issues.length > max ? `<div class="more">${this.esc(this.t("auto.more", { n: issues.length - max }))}</div>` : ""}` : `<div class="allok">✓ ${this.esc(this.t("auto.all_ok"))}</div>`}`;
    return this.frame(this.esc(c.title || this.t("auto.autos")), this.esc(this.t("auto.n_total", { n: A.n })), body);
  }
  getCardSize() { return 7; }
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 6, min_rows: 5 }; }
}

