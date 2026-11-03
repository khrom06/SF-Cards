/* ================================================================== POPUPS */
/*
 * Popup launcher (designed for the phone): a grid of summary tiles; a
 * press opens the full card in a panel that rises from the bottom of the screen.
 * The panel is attached to <body> (outside the HA grid, whose CSS containment
 * would break a position:fixed) and receives `hass` on every update.
 * The phone's back button closes the panel (a #hash history entry
 * is added on opening); a link to #hash opens the panel directly.
 *
 * type: custom:sf-launcher-card
 * columns: 2
 * tiles:
 *   - name: Climat
 *     icon: mdi:thermostat
 *     color: "#ff7043"
 *     hash: climat
 *     summary: climate | room | vehicles | commands | cameras | energy | battery | machines | text   (computed from `card`; text = `sub`)
 *     sub: "free text"         # shown under the title when summary: text
 *     users: [id, ...]          # optional: tile visible only to these users
 *     card: { type: custom:sf-climate-card, ... }   # any card: SF, standard HA (vertical-stack, history-graph…) or another custom card
 */
const SF_POP_CSS = `
  :host { ${SF_VARS_DARK} }
  :host([theme="light"]) { ${SF_VARS_LIGHT} }
  @media (prefers-reduced-motion: reduce) { .back, .sheet { transition:none !important; } }
  :host([theme="light"]) .sheet { background: linear-gradient(180deg, #f3f8fc 0%, #e3edf5 100%); border-color:rgba(0,110,150,.45); box-shadow:0 -10px 40px rgba(0,90,130,.22); }
  :host([theme="light"]) .back { background:rgba(180,200,215,.55); }
  :host([theme="light"]) .grab { background:rgba(0,110,150,.45); }
  :host([theme="light"]) .bar { color:#0a5d7a; }
  :host([theme="light"]) .bar button { border-color:rgba(0,110,150,.4); background:rgba(0,110,150,.08); color:#0b3a4d; }
  .back { position:fixed; inset:0; z-index:9998; background:rgb(var(--sf-scrim-rgb) / .66); backdrop-filter:blur(6px);
    -webkit-backdrop-filter:blur(6px); opacity:0; transition:opacity .25s; }
  .sheet { position:fixed; z-index:9999; left:0; right:0; bottom:0; max-height:92vh; display:flex; flex-direction:column;
    background: linear-gradient(180deg, var(--sf-sheet0) 0%, var(--sf-bg2) 100%); border-top:1px solid rgb(var(--sf-cyan-rgb) / .45);
    border-radius:22px 22px 0 0; box-shadow:0 -10px 40px rgb(var(--sf-cyan-rgb) / .18);
    transform:translateY(105%); transition:transform .32s cubic-bezier(.2,.9,.25,1);
    padding-bottom: env(safe-area-inset-bottom); }
  @media (min-width: 900px) { .sheet { left:50%; right:auto; width:860px; margin-left:-430px; bottom:4vh; border-radius:22px;
    border:1px solid rgb(var(--sf-cyan-rgb) / .45); max-height:88vh; } }
  .open .back { opacity:1; } .open .sheet { transform:none; }
  .grab { width:44px; height:5px; border-radius:3px; background:rgb(var(--sf-cyan-rgb) / .45); margin:9px auto 2px; }
  .bar { display:flex; align-items:center; gap:10px; padding:0 14px 6px; color:${SF_C.cyan};
    font:700 12px Orbitron, sans-serif; letter-spacing:.2em; text-transform:uppercase; }
  .bar button { margin-left:auto; width:36px; height:36px; border-radius:50%; border:1px solid rgb(var(--sf-cyan-rgb) / .35);
    background:rgb(var(--sf-cyan-rgb) / .08); color:${SF_C.text}; font-size:18px; cursor:pointer; }
  .body { overflow-y:auto; -webkit-overflow-scrolling:touch; padding:0 10px 14px; overscroll-behavior:contain; }
`;
class SfLauncherCard extends SfBase {
  defaults() { return { tiles: [], columns: 2 }; }
  connectedCallback() {
    super.connectedCallback();
    this._onPop = () => {
      if (!this.isConnected) return;   // card removed in the meantime: never reopen a popup
      if (Date.now() < (this._ignoreUntil || 0)) return;   // echo of our own "back" after a closing
      const h = sfHash();
      if (this._pop && h !== this._pop.hash) this._close(false);
      else if (!this._pop && h && this._hass) { const t = this._tiles().find((x) => x.hash === h); if (t) this._open(t, false); }
    };
    window.addEventListener("popstate", this._onPop);
    window.addEventListener("hashchange", this._onPop);
    this._deep = setTimeout(this._onPop, 400);  // lien direct …/accueil#climat
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this._onPop);
    window.removeEventListener("hashchange", this._onPop);
    clearTimeout(this._deep);
    this._close(false);
  }
  set hass(hass) {
    super.hass = hass;
    if (this._pop) this._pop.card.hass = hass;
  }
  get hass() { return this._hass; }
  _tiles() {
    const uid = this._hass && this._hass.user && this._hass.user.id;
    const tiles = this._config.tiles.filter((t) => !t.users || !uid || t.users.includes(uid));
    const prio = this._prio(); return prio ? [...tiles.filter(prio), ...tiles.filter((t) => !prio(t))] : tiles;
  }
  // Adaptive mode: with `mode_entity` (e.g. Morning / Day / Evening / Night) the tiles whose `modes` contain the current mode move first and are highlighted.
  _prio() {
    const me = this._config.mode_entity && this.st(this._config.mode_entity), m = me && !["unavailable", "unknown", ""].includes(me.state) ? String(me.state).trim().toLowerCase() : "";
    if (!m) return null;
    const lst = (t) => (Array.isArray(t.modes) ? t.modes : t.modes ? [t.modes] : []).map((x) => String(x).trim().toLowerCase());
    return (t) => lst(t).includes(m);
  }
  css() {
    return `
      .tiles { display:grid; grid-template-columns: repeat(var(--cols), 1fr); gap:10px; font-family:'B612 Mono', ui-monospace, monospace; }
      .tile { position:relative; padding:12px 12px 11px; border-radius:14px; cursor:pointer; overflow:hidden;
        background: linear-gradient(155deg, color-mix(in srgb, var(--tc) 18%, transparent), rgb(var(--sf-bg-rgb) / .8));
        border:1px solid color-mix(in srgb, var(--tc) 45%, transparent); -webkit-tap-highlight-color:transparent;
        transition: transform .12s; }
      .tile:active { transform:scale(.97); }
      .tile .top { display:flex; align-items:center; gap:7px; font:700 10.5px Orbitron,sans-serif; letter-spacing:.14em;
        text-transform:uppercase; color:var(--tc); }
      .tile .top .go { margin-left:auto; opacity:.6; }
      .tile .main { font:500 21px Orbitron,sans-serif; color:var(--sf-strong); margin-top:8px; text-shadow:0 0 10px var(--tc); }
      .tile .sub { font-size:10.5px; color:${SF_C.dim}; margin-top:4px; line-height:1.35; }
      .tile.hot { animation: tglow 2.2s ease-in-out infinite; }
      .tile.prio { border-color:var(--tc); box-shadow:0 0 16px -6px var(--tc), inset 0 0 14px -8px var(--tc); }
      @keyframes tglow { 50% { box-shadow:0 0 18px -4px var(--tc); } }`;
  }
  // Summary of a tile, computed from the config of the card it opens.
  _sum(t) {
    const tag = String((t.card && t.card.type) || "").replace(/^custom:/, "");
    const c = sfNormConfig(tag, { ...(t.card || {}) }), n = (id) => this.num(id);
    switch (t.summary) {
      case "climate": {
        const temps = (c.rooms || []).map((r) => n(r.temp)).filter((x) => x !== null);
        const act = (c.rooms || []).filter((r) => { const s = this.st(r.climate); return s && ["heating", "cooling", "drying"].includes(s.attributes.hvac_action); }).length;
        const m = this.st(c.mode);
        return { main: temps.length ? this.t("launcher.t_avg", { t: this.nf(temps.reduce((a, b) => a + b, 0) / temps.length, 1) }) : "—",
          sub: `${m ? this.esc(m.state.replace(/^[^\p{L}]+/u, "")) : ""} · ${act ? this.t("launcher.n_room_s_heating_or_cooling", { n: act }) : this.t("common.idle")}`, hot: act > 0 };
      }
      case "room": {
        const r = (c.rooms || [])[0] || {}, t = n(r.temp), h = n(r.hum), cl = this.st(r.climate);
        const act = cl && ["heating", "cooling", "drying", "fan"].includes(cl.attributes.hvac_action);
        const lbl = cl && SF_HVAC[cl.state] ? this.t(SF_HVAC[cl.state][0]) : "";
        return { main: t === null ? "—" : this.nf(t, 1) + "°",
          sub: `${h === null ? "" : Math.round(h) + " % · "}${act ? lbl : cl && cl.state !== "off" ? this.t("common.idle_2") : this.t("common.off")}`, hot: !!act };
      }
      case "vehicles": {
        const cars = (c.cars || []).map((x) => `${this.esc(x.name)} ${n(x.soc) === null ? "—" : Math.round(n(x.soc)) + " %"}`).join(" · ");
        const chs = (c.chargers && c.chargers.length ? c.chargers : [c.charger || {}]).slice(0, 4);
        const sts = chs.map((ch) => { const pw = this.watts(ch.power), chg = ch.charging ? sfEvOn(this, ch.charging, "charging", ch.charging_states) : (pw !== null && pw > 50);
          return { pw, chg, con: sfEvOn(this, ch.connected, "connected", ch.connected_states) || chg }; });
        const charging = sts.some((x) => x.chg), con = sts.some((x) => x.con), total = sts.reduce((a, x) => a + (x.chg ? x.pw || 0 : 0), 0);
        const m = this.st(c.mode);
        return { main: charging ? this.kw(total) : con ? this.t("launcher.plugged_in") : this.t("launcher.free"),
          sub: `${cars}${m ? `<br>${this.t("launcher.mode_m", { m: this.esc(m.state) })}` : ""}`, hot: charging };
      }
      case "commands": {
        const items = (c.groups || []).flatMap((g) => g.items || []);
        const lights = items.filter((x) => x.kind === "toggle" && /^(light|switch)\./.test(x.entity || ""));
        const on = lights.filter((x) => this.isOn(x.entity)).length;
        const cov = items.find((x) => x.kind === "cover"), cs = cov && this.st(cov.entity);
        return { main: `${on} / ${lights.length}`, sub: `${this.t("launcher.lights_on")}${cs ? `<br>${this.t("launcher.shutters_s", { s: (Object.assign(Object.create(null), { open: this.t("common.open"), closed: this.t("common.closed") }))[cs.state] || this.esc(cs.state) })}` : ""}`, hot: false };
      }
      case "cameras": {
        const cams = c.cameras || [];
        const mv = cams.filter((k) => this.isOn(k.motion)).length;
        return { main: mv ? this.t("launcher.n_motion_s", { n: mv }) : this.t("launcher.calm"), sub: this.t("launcher.n_cameras_tap_images", { n: cams.length }), hot: mv > 0 };
      }
      case "energy": {
        const solar = Math.max(0, this.watts(c.solar) ?? 0), grid = this.watts(c.grid);
        return { main: this.kw(grid === null ? null : solar + grid), sub: `${this.t("launcher.home_consumption")}${c.solar ? `<br>${this.t("launcher.solar_w", { w: this.kw(solar) })}` : ""}`, hot: false };
      }
      case "battery": {
        const a = sfBatAgg(this, c), soc = a.soc, bw = a.power;
        return { main: soc === null ? "—" : `${Math.round(soc)} %`, sub: bw === null ? "" : Math.abs(bw) < 20 ? this.t("common.idle_2") : bw > 0 ? `${this.t("common.discharging")} · ${this.kw(bw)}` : `${this.t("common.charging")} · ${this.kw(-bw)}`, hot: bw !== null && Math.abs(bw) >= 20 };
      }
      case "machines": {
        const tiles = c.tiles || [];
        const bad = tiles.filter((x) => !this.ok(x.entity)).length;
        const first = tiles[0], v = first ? n(first.entity) : null;
        return { main: v === null ? "—" : `${this.nf(v, first.digits ?? 1)}${this.esc(first.unit ?? this.unit(first.entity))}`,
          sub: `${first ? this.esc(first.label) : ""}${bad ? ` · ${this.t("launcher.n_not_responding", { n: bad })}` : ""}`, hot: false };
      }
      case "health": {
        // Same verdict as the health card, from the checks of the card the tile opens (counted here, nothing is decided).
        const h = this._hc || (this._hc = document.createElement("sf-health-card")); h._hass = this._hass;
        const checks = (Array.isArray(c.checks) ? c.checks : []).filter((x) => x && typeof x.entity === "string" && /^[a-z0-9_]+\.[a-z0-9_]+$/i.test(x.entity)).slice(0, SF_HEALTH_MAX);
        const ev = checks.map((x) => h._eval(x)), bad = checks.filter((x, i) => ev[i].lvl !== "ok"), crit = ev.some((x) => x.lvl === "critical");
        return { main: bad.length ? this.t(bad.length > 1 ? "{n} anomalies" : "{n} anomalie", { n: bad.length }) : this.t("common.all_good"),
          sub: bad.length ? this.esc(bad.slice(0, 2).map((x) => x.name || x.entity).join(" · ")) : this.t("launcher.n_checks_normal", { n: checks.length }), hot: bad.length > 0, crit };
      }
      default: return { main: "", sub: this.esc(t.sub || ""), hot: false };
    }
  }
  render() {
    const prio = this._prio();
    const tiles = this._tiles().map((t, i) => {
      const s = this._sum(t);
      return `<div class="tile ${this.esc(s.hot ? "hot" : "")}${prio && prio(t) ? " prio" : ""}" data-i="${this.esc(i)}" style="--tc:${this.esc(s.crit ? SF_C.red : t.color || SF_C.cyan)}">
        <div class="top">${this.icon(t.icon || "mdi:open-in-new", 16)}${this.esc(t.name)}<span class="go">${this.icon("mdi:chevron-up", 16)}</span></div>
        <div class="main">${s.main}</div><div class="sub">${s.sub}</div></div>`;
    }).join("");
    return `<div class="tiles" style="--cols:${this.esc(Number(this._config.columns) || 2)}">${tiles}</div>`;
  }
  afterRender() {
    this.shadowRoot.querySelectorAll(".tile").forEach((el) => el.addEventListener("click", () => {
      const t = this._tiles()[Number(el.dataset.i)]; if (t) this._open(t, true);
    }));
  }
  _open(t, push) {
    if (this._pop) this._close(false);
    const host = document.createElement("div");
    host.dir = this.lang === "ar" ? "rtl" : "ltr";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${SF_POP_CSS}</style><div class="wrap"><div class="back"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${this.esc(t.name || "")}">
      <div class="grab"></div><div class="bar"><button aria-label="${this.esc(this.t("launcher.close"))}">✕</button></div><div class="body"></div></div></div>`;
    // Card already known to the browser (SF or another loaded custom card): direct creation. Otherwise (standard HA card:
    // vertical-stack, weather-forecast, history-graph…): we go through HA's "card helpers", which create any card.
    // Light theme: the panel takes a light look; each SF card switches to the light theme by itself (no double inversion,
    // images and cameras included); non-SF cards keep their own rendering.
    const th = this._theme(); host.setAttribute("theme", th);
    const type = String(t.card && t.card.type || ""), isSf = /^custom:sf-/.test(type);
    const cfg = isSf ? { ...t.card, theme: t.card.theme || th } : t.card;
    let card;
    if (/^custom:[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(type) && customElements.get(type.slice(7))) {
      card = document.createElement(type.slice(7));
      try { card.setConfig(cfg); } catch (e) { card.textContent = `Erreur : ${e.message}`; }
      card.hass = this._hass;
    } else {
      const ph = card = document.createElement("div");
      ph.className = "loading"; ph.textContent = "…";
      (window.loadCardHelpers ? window.loadCardHelpers() : Promise.reject(new Error("HA card helpers unavailable")))
        .then((h) => {
          const el = h.createCardElement(cfg);
          el.hass = this._hass;
          ph.replaceWith(el);
          if (this._pop && this._pop.card === ph) this._pop.card = el;
        })
        .catch((e) => { ph.textContent = `Erreur : ${e && e.message || e}`; });
    }
    root.querySelector(".body").appendChild(card);
    const close = () => this._close(true);
    root.querySelector(".back").addEventListener("click", close);
    root.querySelector(".bar button").addEventListener("click", close);
    this._esc = (ev) => { if (ev.key === "Escape") close(); };
    document.addEventListener("keydown", this._esc);
    document.body.appendChild(host);
    this._pop = { host, card, hash: t.hash || "" };
    this._opener = this.shadowRoot && this.shadowRoot.activeElement;   // to give focus back on closing
    requestAnimationFrame(() => requestAnimationFrame(() => { root.querySelector(".wrap").classList.add("open"); const b = root.querySelector(".bar button"); if (b) b.focus(); }));
    if (push && t.hash && sfHash() !== t.hash) history.pushState({ sfPopup: t.hash }, "", `${location.pathname}${location.search}#${encodeURIComponent(t.hash)}`);
  }
  _close(viaUi) {
    const p = this._pop; if (!p) return;
    this._pop = null;
    document.removeEventListener("keydown", this._esc);
    p.host.shadowRoot.querySelector(".wrap").classList.remove("open");
    setTimeout(() => p.host.remove(), 330);
    if (this._opener && this._opener.isConnected && this._opener.focus) this._opener.focus();
    // Closed by hand: we remove the #hash entry added on opening.
    if (viaUi && p.hash && sfHash() === p.hash) {
      if (history.state && history.state.sfPopup === p.hash) { this._ignoreUntil = Date.now() + 500; history.back(); }   // entry pushed on opening
      else history.replaceState(history.state, "", `${location.pathname}${location.search}`);   // direct link: we only remove the #hash, we do not leave the page
    }
  }
  getCardSize() { return 4; }
}

