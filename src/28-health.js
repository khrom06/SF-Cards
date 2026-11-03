/* ================================================================== HEALTH */
/*
 * Overview of the installation: a list of CHECKS that you define (entity + what is normal), an overall verdict (all good /
 * warning / critical) and the anomalies ranked by severity, grouped so as not to repeat ten alerts of one subsystem.
 * The card decides nothing: it applies your rules to the states already present in Home Assistant (no request, no hidden computation).
 *
 * type: custom:sf-health-card
 * title: Health
 * show_ok: false          # also lists the normal checks
 * checks:
 *   - { name: Internet, entity: binary_sensor.internet, ok: ["on"], severity: critical, group: Network }
 *   - { name: Onduleur, entity: sensor.ups_battery, min: 30 }
 *   - { name: Kitchen sensor, entity: sensor.kitchen_temp, stale: 60 }     # minutes without update
 *   - { name: Leak, entity: binary_sensor.leak, bad: ["on"], severity: critical }
 * Rules of a check: unavailable / unknown = anomaly; ok: normal states (any other = anomaly); bad: abnormal states;
 * min / max: numeric thresholds; stale: anomaly without update for N minutes; severity: warning (default) | critical.
 */
const SF_HEALTH_MAX = 60;
class SfHealthCard extends SfBase {
  defaults() { return { show_ok: false, checks: [] }; }
  _checks() { return (Array.isArray(this._config.checks) ? this._config.checks : []).filter((c) => c && typeof c.entity === "string" && /^[a-z0-9_]+\.[a-z0-9_]+$/i.test(c.entity)).slice(0, SF_HEALTH_MAX); }
  connectedCallback() {
    super.connectedCallback();
    clearInterval(this._tk); this._tk = setInterval(() => this._schedule(), 60000);   // the age of a sensor changes even without a hass update
  }
  disconnectedCallback() { super.disconnectedCallback(); clearInterval(this._tk); this._tk = null; }
  _lst(v) { return (Array.isArray(v) ? v : v === undefined || v === null || v === "" ? [] : [v]).map((x) => String(x).toLowerCase()); }
  // Verdict of a check: { lvl: "ok" | "warning" | "critical", why: [translation key, variables] | null }
  _eval(c) {
    const st = this.st(c.entity), crit = String(c.severity).toLowerCase() === "critical", bad = crit ? "critical" : "warning";
    if (!st || ["unavailable", "unknown"].includes(st.state)) return { lvl: bad, why: ["indisponible", {}] };
    const s = String(st.state).toLowerCase(), ok = this._lst(c.ok), no = this._lst(c.bad), n = parseFloat(st.state), u = st.attributes.unit_of_measurement || "";
    if (no.includes(s)) return { lvl: bad, why: ["état : {s}", { s: st.state }] };
    if (ok.length && !ok.includes(s)) return { lvl: bad, why: ["état : {s}", { s: st.state }] };
    if (c.min !== undefined && c.min !== null && c.min !== "" && isFinite(n) && n < Number(c.min)) return { lvl: bad, why: ["{v} sous le minimum ({m})", { v: `${this.nf(n, 1)} ${u}`.trim(), m: this.nf(Number(c.min), 1) }] };
    if (c.max !== undefined && c.max !== null && c.max !== "" && isFinite(n) && n > Number(c.max)) return { lvl: bad, why: ["{v} au-dessus du maximum ({m})", { v: `${this.nf(n, 1)} ${u}`.trim(), m: this.nf(Number(c.max), 1) }] };
    const sm = Number(c.stale), lu = Date.parse(st.last_updated || st.last_changed || "");
    if (isFinite(sm) && sm > 0 && isFinite(lu)) { const age = Math.round((Date.now() - lu) / 60000); if (age >= sm) return { lvl: bad, why: [age >= 120 ? "pas de mise à jour depuis {n} h" : "pas de mise à jour depuis {n} min", { n: age >= 120 ? Math.round(age / 60) : age }] }; }
    return { lvl: "ok", why: null };
  }
  css() {
    return `
      .sum { display:flex; align-items:center; gap:10px; padding:2px 2px 12px; }
      .sum .big { font-family:Orbitron,sans-serif; font-size:15px; letter-spacing:.06em; }
      .sum .cnt { margin-left:auto; display:flex; gap:6px; }
      .pill2 { font-size:10px; padding:2px 8px; border-radius:10px; border:1px solid currentColor; }
      .grp { font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:${SF_C.dim}; margin:10px 0 3px; }
      .hr { display:grid; grid-template-columns: 22px minmax(0,1fr) minmax(0,max-content); gap:8px; align-items:center; padding:6px 4px; border-radius:6px; cursor:pointer; }
      .hr:hover { background:rgba(0,229,255,.05); }
      .hr .nm { min-width:0; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:${SF_C.text}; }
      .hr .why { font-size:10.5px; color:${SF_C.dim}; text-align:right; max-width:62vw; overflow-wrap:anywhere; }
      .oks { display:flex; flex-wrap:wrap; gap:5px; margin-top:10px; }
      .okc { font-size:10px; padding:2px 8px; border-radius:10px; color:${SF_C.green}; border:1px solid rgba(43,255,136,.35); background:rgba(43,255,136,.05); cursor:pointer; }`;
  }
  render() {
    const c = this._config, all = this._checks().map((k) => ({ k, ...this._eval(k) }));
    const crit = all.filter((x) => x.lvl === "critical"), warn = all.filter((x) => x.lvl === "warning"), good = all.filter((x) => x.lvl === "ok"), probs = [...crit, ...warn];
    const tone = crit.length ? SF_C.red : warn.length ? SF_C.amber : SF_C.green;
    const head = !probs.length ? this.t("Tout va bien") : this.t(probs.length > 1 ? "{n} anomalies" : "{n} anomalie", { n: probs.length });
    const pill = (n, col, lbl) => n ? `<span class="pill2" style="color:${col}">${this.esc(n)} ${this.esc(this.t(lbl))}</span>` : "";
    const name = (x) => x.k.name || (this.st(x.k.entity) && this.st(x.k.entity).attributes.friendly_name) || x.k.entity;
    const row = (x) => { const col = x.lvl === "critical" ? SF_C.red : SF_C.amber, why = x.why ? this.t(x.why[0], x.why[1]) : "";
      return `<div class="hr" data-e="${this.esc(x.k.entity)}" style="color:${col}">${this.icon(x.lvl === "critical" ? "mdi:alert-octagon" : "mdi:alert", 16, col)}<span class="nm" title="${this.esc(name(x))}">${this.esc(name(x))}</span><span class="why">${this.esc(why)}</span></div>`; };
    // grouping: a subsystem with several anomalies shows a single header ("Network · 3 anomalies") then its rows
    // Display units: a group = one unit (placed at its first anomaly), an ungrouped anomaly = one unit; `probs` already puts the critical ones first, so they stay first.
    const units = [], byG = new Map();
    for (const x of probs) { const g = x.k.group ? String(x.k.group) : ""; if (!g) units.push({ g: "", xs: [x] }); else if (byG.has(g)) byG.get(g).xs.push(x); else { const u = { g, xs: [x] }; byG.set(g, u); units.push(u); } }
    let list = "";
    for (const u of units) { if (u.g && u.xs.length > 1) list += `<div class="grp">${this.esc(u.g)} · ${this.esc(this.t("{n} anomalies", { n: u.xs.length }))}</div>`; else if (u.g) list += `<div class="grp">${this.esc(u.g)}</div>`;
      list += u.xs.map(row).join(""); }
    const oks = c.show_ok ? `<div class="oks">${good.map((x) => `<span class="okc" data-e="${this.esc(x.k.entity)}">${this.esc(name(x))}</span>`).join("")}</div>` : "";
    const body = `<div class="sum" style="color:${tone}">${this.icon(!probs.length ? "mdi:check-circle" : crit.length ? "mdi:alert-octagon" : "mdi:alert", 24, tone)}<span class="big">${this.esc(head)}</span>
      <span class="cnt">${pill(crit.length, SF_C.red, "critique")}${pill(warn.length, SF_C.amber, "attention")}${!probs.length ? "" : pill(good.length, SF_C.green, "normal")}</span></div>${list}${oks}`;
    return this.frame(this.esc(c.title || this.t("Santé")), this.esc(`${good.length}/${all.length}`), all.length ? body : `<div class="empty" style="color:${SF_C.dim};text-align:center;padding:22px 0">${this.esc(this.t("Aucun contrôle"))}</div>`);
  }
  getCardSize() { return 4; }
}

