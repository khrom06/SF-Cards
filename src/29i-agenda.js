/* ================================================================== AGENDA */
/*
 * What is coming: running timers with a live countdown, pinned reminders (waste collection, school…) and the next events of your
 * calendars, grouped by day. Read-only; the events are the ones Home Assistant already has for the calendar entities.
 *
 * type: custom:sf-agenda-card
 * title: Agenda
 * days: 7            max: 8                       # days ahead, number of events listed
 * timers: [timer.oven, timer.laundry]
 * calendars:
 *   - calendar.family
 *   - { entity: calendar.waste, name: Bins, icon: mdi:trash-can, color: var(--sf-green), pin: true }   # pin: next event as a chip on top
 */
const SF_AG_COLORS = [SF_C.cyan, SF_C.amber, SF_C.green, "var(--sf-pink)", "var(--sf-auto)", "var(--sf-cool)", "var(--sf-orange)", "var(--sf-yellow)"];
class SfAgendaCard extends SfBase {
  defaults() { return { days: 7, max: 8 }; }
  static getStubConfig() { return {}; }
  get _ld() { return this.__ld || (this.__ld = new SfLoader(this, { ttl: 300000, retry: 120000 })); }
  setConfig(config) { super.setConfig(config); if (!this._cfgSame) this._ld.reset(); this._lastHtml = null; this._load(); }
  set hass(h) { this._hass = h; this._load(); this._schedule(); }
  get hass() { return this._hass; }
  connectedCallback() { super.connectedCallback(); this._load(); if (!this._at) this._at = setInterval(() => this._tickTimers(), 1000); }
  disconnectedCallback() { super.disconnectedCallback(); if (this._at) { clearInterval(this._at); this._at = null; } }
  _cals() {
    const c = this._config.calendars;
    return (Array.isArray(c) ? c : c ? [c] : []).map((x) => (typeof x === "string" ? { entity: x } : x)).filter((x) => x && typeof x === "object" && typeof x.entity === "string" && SF_EID.test(x.entity)).slice(0, 8);
  }
  _timers() { const t = this._config.timers; return (Array.isArray(t) ? t : t ? [t] : []).filter((x) => typeof x === "string" && SF_EID.test(x)).slice(0, 8); }
  _days() { const n = Number(this._config.days); return isFinite(n) && n >= 1 ? Math.min(60, Math.round(n)) : 7; }
  _max() { const n = Number(this._config.max); return isFinite(n) && n >= 1 ? Math.min(40, Math.round(n)) : 8; }
  _day0(t) { const d = t === undefined ? new Date() : new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  async _load() {
    if (!this._config || !this._hass || !this._hass.callApi || !this.isConnected) return;
    const cals = this._cals(); if (!cals.length) return;
    const d0 = this._day0(), days = this._days();
    await this._ld.run(`${cals.map((x) => x.entity).join(",")}|${days}|${d0}`, async () => {
      const q = `start=${encodeURIComponent(new Date(d0).toISOString())}&end=${encodeURIComponent(new Date(d0 + days * 86400000).toISOString())}`, out = [];
      const when = (x) => {
        if (x && typeof x.dateTime === "string") return { t: Date.parse(x.dateTime), all: false };
        const m = x && typeof x.date === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(x.date) : null;   // all-day: a local date, not UTC midnight
        return m ? { t: new Date(+m[1], +m[2] - 1, +m[3]).getTime(), all: true } : null;
      };
      let failed = 0;
      await Promise.all(cals.map(async (cal, i) => {
        try {
          const r = await this._hass.callApi("GET", `calendars/${cal.entity}?${q}`);
          for (const ev of Array.isArray(r) ? r.slice(0, 200) : []) {
            const s = when(ev && ev.start), e = when(ev && ev.end);
            if (s && isFinite(s.t)) out.push({ s: s.t, e: e && isFinite(e.t) ? e.t : s.t, all: s.all, title: String((ev && ev.summary) || "").slice(0, 120), i });
          }
        } catch (err) { failed++; }
      }));
      if (failed === cals.length) throw new Error("calendars unavailable");
      return out.sort((a, b) => a.s - b.s || a.i - b.i);
    }, { fallback: () => [] });
  }
  _hms(str) { const m = /^(\d+):(\d{1,2}):(\d{1,2})/.exec(String(str || "")); return m ? (+m[1] * 3600 + +m[2] * 60 + +m[3]) * 1000 : NaN; }
  _cd(ms) { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(s % 60).padStart(2, "0")}`; }
  // Countdowns move every second without rewriting the card.
  _tickTimers() {
    const r = this.shadowRoot; if (!r) return;
    r.querySelectorAll(".tmr[data-f]").forEach((el) => {
      const left = Number(el.dataset.f) - Date.now(), dur = Number(el.dataset.d), cd = el.querySelector(".cd"), bar = el.querySelector(".pg i");
      if (cd) cd.textContent = this._cd(left);
      if (bar && dur > 0) bar.style.width = `${Math.max(0, Math.min(100, (left / dur) * 100)).toFixed(1)}%`;
    });
  }
  _fmt(t, o) { try { return new Intl.DateTimeFormat(this.locLatn, o).format(new Date(t)); } catch (e) { return ""; } }
  _rel(t) {
    const n = Math.round((this._day0(t) - this._day0()) / 86400000);
    return n <= 0 ? this.t("common.today") : n === 1 ? this.t("agenda.tomorrow") : n < 7 ? this._fmt(t, { weekday: "long" }) : this._fmt(t, { weekday: "short", day: "numeric", month: "short" });
  }
  css() {
    return `
      .tmr { display:flex; align-items:center; gap:10px; min-height:44px; padding:0 10px; margin-bottom:8px; border-radius:8px; border:1px solid rgb(var(--sf-amber-rgb) / .45); background:rgb(var(--sf-amber-rgb) / .08); color:${SF_C.amber}; }
      .tmr .nm { flex:0 1 auto; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:${SF_C.text}; }
      .tmr .pg { flex:1; min-width:20px; height:6px; border-radius:3px; background:rgb(var(--sf-amber-rgb) / .16); overflow:hidden; }
      .tmr .pg i { display:block; height:100%; background:${SF_C.amber}; transition:width 1s linear; }
      .tmr .cd { flex:none; font-family:Orbitron,sans-serif; font-size:16px; color:var(--sf-strong); }
      .tmr.paused { opacity:.7; }
      .chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
      .chip { display:inline-flex; align-items:center; gap:6px; min-height:32px; padding:0 10px; border-radius:16px; border:1px solid currentColor; background:rgb(from currentColor r g b / .1); font-size:11px; max-width:100%; }
      .chip span { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:${SF_C.text}; }
      .chip b { font-weight:400; white-space:nowrap; }
      .chip.soon { box-shadow:0 0 10px rgb(from currentColor r g b / .35); }
      .day { margin:12px 0 2px; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:${SF_C.dim}; }
      .day:first-child { margin-top:0; }
      .day.today { color:${SF_C.cyan}; }
      .ev { display:flex; align-items:center; gap:10px; min-height:36px; border-top:1px solid rgb(var(--sf-cyan-rgb) / .12); }
      .ev i { flex:none; width:4px; align-self:stretch; margin:7px 0; border-radius:2px; background:currentColor; }
      .ev .tm { flex:none; min-width:98px; font-size:11px; color:${SF_C.dim}; white-space:nowrap; }
      .ev .ti { flex:1; min-width:0; color:${SF_C.text}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .ev.now .tm { color:${SF_C.green}; }
      .none { color:${SF_C.dim}; font-size:12px; }`;
  }
  render() {
    const c = this._config, cals = this._cals(), now = Date.now(), color = (i) => cals[i] && cals[i].color ? cals[i].color : SF_AG_COLORS[i % SF_AG_COLORS.length];
    const data = this._ld.data, all = (data && Array.isArray(data.value) ? data.value : []).filter((e) => e.e > now || (e.all && e.e > this._day0()));
    const timers = this._timers().map((id) => {
      const s = this.st(id); if (!s || !["active", "paused"].includes(s.state)) return "";
      const name = String(s.attributes.friendly_name || id.split(".")[1].replace(/_/g, " ")), dur = this._hms(s.attributes.duration), fin = Date.parse(s.attributes.finishes_at || "");
      const left = s.state === "active" && isFinite(fin) ? fin - now : this._hms(s.attributes.remaining);
      const pct = isFinite(left) && dur > 0 ? Math.max(0, Math.min(100, (left / dur) * 100)) : 0;
      return `<div class="tmr click ${s.state === "paused" ? "paused" : ""}" data-e="${this.esc(id)}"${s.state === "active" && isFinite(fin) ? ` data-f="${fin}" data-d="${isFinite(dur) ? dur : 0}"` : ""}>${this.icon(s.state === "paused" ? "mdi:timer-pause-outline" : "mdi:timer-outline", 18)}
        <span class="nm">${this.esc(name)}</span><div class="pg"><i style="width:${pct.toFixed(1)}%"></i></div><span class="cd">${isFinite(left) ? this._cd(left) : "—"}</span></div>`;
    }).join("");
    const chips = cals.map((cal, i) => {
      if (!cal.pin) return "";
      const ev = all.find((e) => e.i === i); if (!ev) return "";
      const n = Math.round((this._day0(Math.max(ev.s, now)) - this._day0()) / 86400000);
      return `<span class="chip ${n <= 1 ? "soon" : ""}" style="color:${this.esc(color(i))}">${this.icon(String(cal.icon || "mdi:calendar-star"), 16)}<span>${this.esc(ev.title || cal.name || "")}</span><b>${this.esc(this._rel(Math.max(ev.s, now)))}</b></span>`;
    }).join("");
    const list = all.filter((e) => !(cals[e.i] && cals[e.i].pin)).slice(0, this._max());
    let last = null, rows = "";
    for (const e of list) {
      const d = this._day0(Math.max(e.s, now));
      if (d !== last) { last = d; rows += `<div class="day ${d === this._day0() ? "today" : ""}">${this.esc(this._rel(d))}${d - this._day0() >= 2 * 86400000 && d - this._day0() < 7 * 86400000 ? ` · ${this.esc(this._fmt(d, { day: "numeric", month: "short" }))}` : ""}</div>`; }
      const on = !e.all && e.s <= now, hm = { hour: "2-digit", minute: "2-digit" };
      const tm = e.all ? this.t("agenda.all_day") : on ? this.t("agenda.until", { t: this._fmt(e.e, hm) }) : `${this._fmt(e.s, hm)}${e.e > e.s && this._day0(e.e) === this._day0(e.s) ? ` – ${this._fmt(e.e, hm)}` : ""}`;
      rows += `<div class="ev ${on ? "now" : ""}" style="color:${this.esc(color(e.i))}"><i></i><span class="tm">${this.esc(tm)}</span><span class="ti">${this.esc(e.title || (cals[e.i] && cals[e.i].name) || "—")}</span></div>`;
    }
    const empty = !timers && !chips && !rows ? `<div class="none">${this.esc(!cals.length || data ? this.t("agenda.nothing", { n: this._days() }) : "…")}</div>` : "";
    return this.frame(this.esc(c.title || this.t("agenda.title")), cals.length ? this.esc(this.t("agenda.next_days", { n: this._days() })) : "", `${timers}${chips ? `<div class="chips">${chips}</div>` : ""}<div class="grow">${rows}${empty}</div>`);
  }
  afterRender() { this._tickTimers(); }
  getCardSize() { return 5; }
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 6 }; }
}
