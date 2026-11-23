class SfBase extends HTMLElement {
  setConfig(config) {
    if (!config) throw new Error(`${this.localName} : config required`);
    this._config = sfNormConfig(sfCanon(this.localName), this.defaults ? { ...this.defaults(), ...config } : { ...config });
    // The visual editor and the dashboard re-apply the configuration on every change, often unchanged: `_cfgSame` lets the cards that load data from
    // Home Assistant keep what they already fetched instead of asking again.
    let js = ""; try { js = JSON.stringify(this._config); } catch (e) { js = ""; }
    this._cfgSame = !!js && js === this._cfgJson; this._cfgJson = js;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._dirty = true;
    this._schedule();
    sfWarnDeprecated(this.localName);
    sfWarnConfig(this.localName, config);   // non-blocking: console warning about probable typos / wrong types
  }
  set hass(hass) {
    this._hass = hass;
    this._schedule();
  }
  _schedule() {
    if (this._raf || !this._hass || !this._config) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = null;
      // HA calls `hass` on every state change of the whole house: the DOM is only
      // rewritten if the render really changed, otherwise the animations
      // (3D rotations, flows) would restart from zero several times per second.
      const rq = SF_REQ[sfCanon(this.localName)], miss = rq && this.localName !== "sf-battery-card" ? rq(this._config) : [];
      const body = miss.length ? this.frame(this.esc(this.t("common.card_to_complete")), "", `<div style="color:${SF_C.amber};line-height:1.6">${miss.map((m) => `• ${this.esc(this.t(m))}`).join("<br>")}</div>`) : this.render();
      const html = `<style>${SF_CSS}${this.css ? this.css() : ""}</style>${body}`;
      this.dir = this.lang === "ar" ? "rtl" : "ltr";
      const th = this._theme(); if (this.getAttribute("theme") !== th) this.setAttribute("theme", th);
      this._applyLook();
      if (html === this._lastHtml) return;
      this._lastHtml = html;
      this.shadowRoot.innerHTML = html;
      this.shadowRoot.querySelectorAll("[data-e]").forEach((el) =>
        el.addEventListener("click", (ev) => { ev.stopPropagation(); this._moreInfo(el.dataset.e); }));
      this.shadowRoot.querySelectorAll("[data-call]").forEach((el) =>
        el.addEventListener("click", (ev) => { ev.stopPropagation(); this._onCall(el); }));
      this.shadowRoot.querySelectorAll("[data-nav]").forEach((el) =>
        el.addEventListener("click", (ev) => { ev.stopPropagation(); this._navigate(el.dataset.nav); }));
      this.shadowRoot.querySelectorAll("[data-hold], [data-hold-nav]").forEach((el) => this._wireHold(el));
      if (this.afterRender) this.afterRender();
      this._a11y(this.shadowRoot); sfSvgVars(this.shadowRoot);
      if (this._armed && Date.now() < this._armed.until) {   // the HTML was rewritten: re-arm the same button
        const el = [...this.shadowRoot.querySelectorAll("[data-confirm]")].find((e) => `${e.dataset.call}|${e.dataset.d || ""}` === this._armed.key);
        if (el && !el.classList.contains("armed")) this._arm(el, this._armed.until - Date.now());
      }
    });
  }
  // Every clickable element becomes a real button for the keyboard and screen readers: role, focus, accessible name, Enter / Space.
  _a11y(root) {
    root.querySelectorAll("[data-call], [data-e], [data-nav], .tile").forEach((el) => {
      if (el.matches("button, a, input")) return;
      const de = el.getAttribute("data-e");
      if (!el.hasAttribute("data-call") && !el.hasAttribute("data-i") && !el.hasAttribute("data-nav") && (!de || de === "undefined" || de === "null")) return;   // nothing to open: not a button
      el.setAttribute("role", "button"); el.setAttribute("tabindex", "0");
      if (!el.getAttribute("aria-label")) {
        // Block text separated by spaces (otherwise "Alarmdisarmed", "62%LEVEL" in a screen reader).
        const parts = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let tn;
        while ((tn = w.nextNode())) { const v = tn.nodeValue.trim(); if (v) parts.push(v); }
        let lab = (el.getAttribute("title") || parts.join(" ")).replace(/\s+/g, " ").trim().slice(0, 90);
        if (!lab) {   // icon-only button: the icon name ("arrow up", "stop") or, failing that, the label of its row
          const ic = el.querySelector("ha-icon[icon]"), row = el.closest(".it, .rad, .room, .borne");
          const nm = row && row.querySelector(".nm, .name, .lbl");
          lab = [nm && nm.textContent.trim(), ic && ic.getAttribute("icon").replace(/^[a-z]+:/, "").replace(/[-_]+/g, " ")].filter(Boolean).join(" ").slice(0, 90);
        }
        if (lab) el.setAttribute("aria-label", lab);
      }
      if (el.matches(".seg .btn")) el.setAttribute("aria-pressed", el.classList.contains("on") ? "true" : "false");
      if (!el._kb) { el._kb = true; el.addEventListener("keydown", (ev) => {
        // A held key (repeat) must never get through a confirmation; a nested button does not trigger its parent.
        if (ev.target !== el) return;
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); if (!ev.repeat) el.click(); }
      }); }
    });
  }
  /*
   * Control: an element `data-call="domain.service"` + `data-d='{json}'` calls the
   * service on click. With `data-confirm="text"`, two presses within 4 s are required
   * (the first arms the button and shows the text): reserved for heavy actions.
   */
  // "Armed" button (first press of a heavy action): the state survives card refreshes (a moving power value
  // redraws the HTML every few seconds) during the 4 s of the confirmation.
  _arm(el, ms) {
    el.classList.add("armed");
    el.dataset.label = el.innerHTML; el.dataset.aria = el.getAttribute("aria-label") || "";
    el.innerHTML = this.esc(el.dataset.confirm); el.setAttribute("aria-label", el.dataset.confirm);
    setTimeout(() => {
      if (el.isConnected && el.classList.contains("armed")) { el.classList.remove("armed"); el.innerHTML = el.dataset.label; el.setAttribute("aria-label", el.dataset.aria); }
      if (this._armed && this._armed.until <= Date.now()) this._armed = null;
    }, ms);
  }
  _onCall(el) {
    if (el.dataset.confirm && !el.classList.contains("armed")) {
      this.shadowRoot.querySelectorAll("[data-confirm].armed").forEach((o) => { o.classList.remove("armed"); o.innerHTML = o.dataset.label; o.setAttribute("aria-label", o.dataset.aria || ""); });
      this._armed = { key: `${el.dataset.call}|${el.dataset.d || ""}`, until: Date.now() + 4000 };
      this._arm(el, 4000);
      return;
    }
    this._armed = null;
    if (el.classList.contains("armed")) { el.classList.remove("armed"); el.innerHTML = el.dataset.label; el.setAttribute("aria-label", el.dataset.aria || ""); }
    const [domain, service] = el.dataset.call.split(".");
    let data = {};
    try { data = el.dataset.d ? JSON.parse(el.dataset.d) : {}; } catch (e) { return; }
    el.classList.add("sent");
    setTimeout(() => el.classList.remove("sent"), 600);
    this._hass.callService(domain, service, data).catch((err) => {
      el.classList.add("fail");
      el.title = String(err && err.message || err);
      setTimeout(() => el.classList.remove("fail"), 2500);
    });
  }
  // Attributes of a control button, to insert in a tag.
  call(service, data, confirm) {
    if (!/^[a-z0-9_]+\.[a-z0-9_]+$/i.test(String(service))) return "";   // malformed service (config): no active button
    return `data-call="${this.esc(service)}" data-d="${this.esc(JSON.stringify(data || {}))}"${confirm ? ` data-confirm="${this.esc(confirm)}"` : ""}`;
  }
  // Toggle an entity according to its domain (script: run).
  toggleCall(id) {
    const d = (id || "").split(".")[0];
    if (d === "script") return this.call("script.turn_on", { entity_id: id });
    if (d === "scene") return this.call("scene.turn_on", { entity_id: id });
    if (d === "button") return this.call("button.press", { entity_id: id });
    return this.call(["light", "switch", "fan", "input_boolean", "automation"].includes(d) ? `${d}.toggle` : "homeassistant.toggle", { entity_id: id });
  }
  isOn(id) { const s = this.st(id); return !!s && ["on", "open", "home", "playing", "cleaning", "heat", "cool", "dry", "fan_only", "heat_cool"].includes(s.state); }
  // Power in W whatever the declared unit (some meters publish in kW).
  watts(id) {
    const n = this.num(id); if (n === null) return null;
    const raw = this.unit(id), u = raw.toLowerCase();
    if (raw === "mW") return n / 1000;   // milliwatt
    return u === "kw" ? n * 1000 : u === "mw" ? n * 1e6 : n;
  }
  kw(w) { return w === null || w === undefined || !isFinite(w) ? "—" : Math.abs(w) >= 999.5 ? `${this.nf(w / 1000, 2)} kW` : `${Math.round(w)} W`; }
  icon(name, size = 20, color) { return `<ha-icon icon="${this.esc(name)}" style="--mdc-icon-size:${this.esc(size)}px${this.esc(color ? `;color:${color}` : "")}"></ha-icon>`; }
  // A dashboard path that is safe to open: same site only ("/lovelace/0"), never "//host", a scheme, a backslash or a space.
  navPath(x) {
    const p = x && x.navigation_path;
    return typeof p === "string" && p.length <= 200 && /^\/(?!\/)[A-Za-z0-9\-._~\/?=&%#:+@!$,;]*$/.test(p) ? p : "";
  }
  // Attribute of an item for a normal tap, when `tap_action` replaces the default one: the entity's page, or a dashboard page (`navigation_path`).
  tapAttr(x, dflt) {
    const a = x && x.tap_action;
    if (a === "more-info" && x.entity) return `data-e="${this.esc(x.entity)}"`;
    if (a === "navigate" && this.navPath(x)) return `data-nav="${this.esc(this.navPath(x))}"`;
    return dflt;
  }
  // Attribute of an item that reacts to a long press: `hold_action: more-info` opens the entity's page, `navigate` opens `navigation_path`.
  holdAttr(x) {
    const a = x && x.hold_action;
    if (a === "more-info" && x.entity) return `data-hold="${this.esc(x.entity)}"`;
    if (a === "navigate" && this.navPath(x)) return `data-hold-nav="${this.esc(this.navPath(x))}"`;
    return "";
  }
  _navigate(path) {
    try { history.pushState(null, "", path); window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } })); } catch (e) { /* no history: ignore */ }
  }
  // Long press (about half a second without moving), right click or the keyboard's context-menu key: open the entity's page, as Home Assistant's
  // own tiles do. The click that ends a long press must not also trigger the tile's normal action.
  _wireHold(el) {
    // Per-tile state (a re-render or another tile must not touch it); only the timer is card-wide so that disconnectedCallback can cancel it.
    const id = el.dataset.hold, nav = el.dataset.holdNav, stop = () => { clearTimeout(this._holdTimer); this._holdTimer = null; };
    let pressed = false, swallow = 0, held = 0, x0 = 0, y0 = 0;
    const open = () => { if (Date.now() - held < 800) return; held = Date.now(); if (nav) this._navigate(nav); else this._moreInfo(id); };
    el.addEventListener("pointerdown", (ev) => {
      if (ev.button > 0) return;   // primary button, finger or pen only
      stop(); swallow = 0; pressed = false; x0 = ev.clientX; y0 = ev.clientY;
      this._holdTimer = setTimeout(() => { this._holdTimer = null; pressed = true; open(); }, 500);
    });
    el.addEventListener("pointermove", (ev) => { if (this._holdTimer && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 10) stop(); });
    // The click that ends a long press arrives right after the release, however long the finger stayed down: arm the swallow at the release, not when the press fires.
    el.addEventListener("pointerup", () => { stop(); if (pressed) swallow = Date.now(); pressed = false; });
    el.addEventListener("pointercancel", () => { stop(); pressed = false; });
    el.addEventListener("pointerleave", stop);   // after the page opened (often under the pointer) a leave must not forget the long press
    el.addEventListener("click", (ev) => {   // only the click that ends this long press: a later keyboard Enter / Space must still toggle
      const fresh = swallow && Date.now() - swallow < 700; swallow = 0;
      if (fresh) { ev.stopImmediatePropagation(); ev.preventDefault(); } }, true);
    el.addEventListener("contextmenu", (ev) => { ev.preventDefault(); open(); });
  }
  _moreInfo(entityId) {
    if (!entityId || entityId === "undefined" || entityId === "null") return;
    const ev = new Event("hass-more-info", { bubbles: true, composed: true });
    ev.detail = { entityId };
    this.dispatchEvent(ev);
  }
  // States sometimes come from external APIs (car manufacturers' clouds, Frigate…): every dynamic text
  // goes through esc() before being injected into the HTML.
  esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }
  st(id) { return id && this._hass && this._hass.states ? this._hass.states[id] : undefined; }
  ok(id) { const s = this.st(id); return !!s && !["unknown", "unavailable"].includes(s.state); }
  num(id) { if (!this.ok(id)) return null; const n = parseFloat(this.st(id).state); return isNaN(n) ? null : n; }
  unit(id) { const s = this.st(id), u = s && s.attributes.unit_of_measurement; return typeof u === "string" ? u : ""; }   // always a string, whatever an integration publishes
  // A list attribute or option: always an array (an integration may publish a string, a number or nothing).
  arr(v) { return Array.isArray(v) ? v : []; }
  // Number displayed according to the HA profile language (comma or point decimal), Latin digits, no thousands separator.
  nf(v, d = 0) {
    let n = Number(v); if (!isFinite(n)) return String(v);
    if (Math.abs(n) < 0.5 * Math.pow(10, -(Math.min(20, Math.max(0, d | 0))))) n = 0;   // jamais « -0.00 »
    try {
      const cache = (SfBase._nf = SfBase._nf || {}), key = `${this.loc}|${d}`;
      const f = cache[key] || (cache[key] = new Intl.NumberFormat(this.locLatn, { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false }));
      return f.format(n).replace(/\u2212/g, "-").replace(/[\u200e\u200f\u061c]/g, "");
    } catch (e) { return n.toFixed(Math.max(0, Math.min(20, d | 0))); }   // unknown Intl language or invalid decimals: simple fallback
  }
  fmt(id, digits = 0) {
    const n = this.num(id);
    if (n === null) return this.ok(id) ? this.esc(this.st(id).state) : "—";
    return `${this.nf(n, digits)}`;
  }
  // Theme: `theme: dark | light | auto` on the card, otherwise the CSS variable `--sf-theme` of the HA theme (set once for all cards), otherwise dark.
  _theme() {
    let t = (this._config || {}).theme;
    if (!t) {
      const th = this._hass && this._hass.themes, key = th ? `${th.theme}|${th.darkMode}` : "";
      if (!this.isConnected) { try { t = getComputedStyle(this).getPropertyValue("--sf-theme").trim().replace(/['"]/g, ""); } catch (e) { t = ""; } }   // outside the DOM: read without cache
      else if (!this._cssRead || this._cssThemeKey !== key) {
        const first = !this._cssRead;
        this._cssRead = true; this._cssThemeKey = key;
        try { this._cssTheme = getComputedStyle(this).getPropertyValue("--sf-theme").trim().replace(/['"]/g, ""); } catch (e) { this._cssTheme = ""; }
        // HA applies the theme variables a moment after publishing the change: we read once more, a little later.
        if (!first) setTimeout(() => { this._cssRead = false; this._lastHtml = null; this._schedule(); }, 300);
      }
      if (this.isConnected) t = this._cssTheme;
    }
    if (t === "auto") t = this._hass && this._hass.themes && this._hass.themes.darkMode === false ? "light" : "dark";
    return t === "light" ? "light" : "dark";
  }
  // A text option read from the HA theme (CSS variable on the card), cached per HA theme like `--sf-theme`.
  _cssOpt(name) {
    const read = () => { try { return getComputedStyle(this).getPropertyValue(name).trim().replace(/['"]/g, "").toLowerCase(); } catch (e) { return ""; } };
    if (!this.isConnected) return read();
    const th = this._hass && this._hass.themes, key = th ? `${th.theme}|${th.darkMode}` : "";
    if (this._cssOK !== key) {
      const first = this._cssOK === undefined;
      this._cssOK = key; this._cssO = {};
      // HA applies the theme variables a moment after publishing the change: read once more, a little later.
      if (!first) setTimeout(() => { this._cssO = {}; this._lastHtml = null; this._schedule(); }, 300);
    }
    const o = this._cssO || (this._cssO = {});
    return name in o ? o[name] : (o[name] = read());
  }
  // Look and accent, as attributes / custom properties of the card itself (the markup does not change):
  //   look: calm            (or --sf-look in the HA theme)    no glow, brackets, scan lines
  //   accent: amber | green | pink | red | #rrggbb   (or --sf-accent)    main colour of the card
  // sf-radiators-card keeps its own historical `accent` option (colour of the radiators): only the theme variable applies to it.
  _applyLook() {
    const c = this._config || {}, own = this.localName === "sf-radiators-card" ? "" : c.accent;
    const lk = String(c.look || this._cssOpt("--sf-look") || "").toLowerCase() === "calm" ? "calm" : "";
    if ((this.getAttribute("look") || "") !== lk) { if (lk) this.setAttribute("look", lk); else this.removeAttribute("look"); }
    const a = String(own || this._cssOpt("--sf-accent") || "").trim().toLowerCase(), pre = ["amber", "green", "pink", "red"].includes(a) ? a : "";
    if ((this.getAttribute("accent") || "") !== pre) { if (pre) this.setAttribute("accent", pre); else this.removeAttribute("accent"); }
    const m = pre ? null : /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(a), hex = m ? (m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1]) : "";
    if (hex === (this._acHex || "")) return;
    this._acHex = hex;
    if (hex) { const n = parseInt(hex, 16); this.style.setProperty("--sf-cyan", `#${hex}`); this.style.setProperty("--sf-cyan-rgb", `${n >> 16} ${(n >> 8) & 255} ${n & 255}`); }
    else { this.style.removeProperty("--sf-cyan"); this.style.removeProperty("--sf-cyan-rgb"); }
  }
  // Language for numbers and dates: Latin digits everywhere, even with a language such as ar-SA.
  get locLatn() {
    if (this._ll !== this.loc) { this._ll = this.loc; try { this._llv = new Intl.Locale(this.loc, { numberingSystem: "latn" }).toString(); } catch (e) { this._llv = "en"; } }
    return this._llv;
  }
  // A card rendered before being attached re-reads its theme as soon as it is (CSS variables do not exist outside the DOM).
  connectedCallback() { this._cssRead = false; this._cssOK = undefined; this._lastHtml = null; this._schedule(); this._watchSize(); }
  /*
   * Size awareness (layout that follows the room the user gives the card, not the screen): the card measures its OWN width and a card
   * that declares `layoutKey(width)` is re-rendered only when that key changes (e.g. the number of columns), never on every pixel.
   * Safe by construction: only the width is read (the height changes when the content changes, so it is ignored), and the key is a
   * small value that depends on the width alone, so a re-render cannot trigger another one.
   */
  _watchSize() {
    if (typeof ResizeObserver === "undefined" || this._sfRo) return;
    this._sfRo = new ResizeObserver((entries) => {
      const w = Math.round(entries[entries.length - 1].contentRect.width);
      if (!w || w === this._w) return;   // 0 = not laid out / hidden (a hidden tab): keep the last known width
      this._w = w;
      if (this.layoutKey) { const k = this.layoutKey(w); if (k !== this._lk) { this._lk = k; this._schedule(); } }
    });
    this._sfRo.observe(this);
  }
  // Width of the card in px. Before its first render the element has no shadow styles yet (display:inline, width 0): its parent's width is
  // then the best estimate (a card fills its cell), and the observer corrects it as soon as the real width is known.
  get width() {
    if (this._w) return this._w;
    const own = Math.round(this.getBoundingClientRect().width), par = this.parentElement;
    return own || (par ? Math.round(par.clientWidth) : 0) || 0;
  }
  // Columns for `n` equal items of at least `minW` px: as many as fit, then evened out so that the last row is never nearly empty
  // (5 items in a row of 4 become 3 + 2, not 4 + 1). Without a measured width, everything on one row.
  balance(n, minW, gap, w) {
    if (n <= 1) return 1;
    if (!(w > 0)) return n;
    const fit = Math.max(1, Math.floor((w + gap) / (minW + gap)));
    return fit >= n ? n : Math.ceil(n / Math.ceil(n / fit));
  }
  get lang() { return sfLang(this._hass); }
  // HA profile language, normalised ("en_US" → "en-US") and validated: a value rejected by the Intl APIs falls back to "en", never an exception.
  get loc() {
    const h = this._hass, raw = (h && ((h.locale && h.locale.language) || h.language)) || "en";
    if (this._locRaw !== raw) { this._locRaw = raw; try { this._locVal = Intl.getCanonicalLocales(String(raw).replace(/_/g, "-"))[0] || "en"; } catch (e) { this._locVal = "en"; } }
    return this._locVal;
  }
  t(key, vars) { return sfTr(this.lang, key, vars); }
  ago(id) {
    const s = this.st(id); if (!s) return "";
    const m = Math.round((Date.now() - new Date(s.last_changed).getTime()) / 60000);
    if (m < 1) return this.t("common.just_now"); if (m < 60) return this.t("common.n_min_ago", { n: m });
    const h = Math.round(m / 60); return h < 48 ? this.t("common.n_h_ago", { n: h }) : this.t("common.n_d_ago", { n: Math.round(h / 24) });
  }
  frame(title, sub, body, extraClass = "") {
    // The "alert" variant (sf-alert-card's full-frame red state: leak, intrusion, power cut, doorbell) is announced immediately by a screen
    // reader, the same way a visible user cannot miss it.
    const live = extraClass === "alert" ? ` role="alert" aria-live="assertive"` : "";
    return `<div class="hud fill ${this.esc(extraClass)}"${live}><i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i>
      <div class="head"><span class="dot"></span>${title}<span class="sub">${sub || ""}</span></div>${body}</div>`;
  }
  // Timer of a button (e.g. towel dryer): { active, remaining (min) }. A refresh
  // every 20 s while a timer is running, otherwise the countdown would stay frozen between two state changes.
  timerInfo(id) {
    const t = id && this.st(id);
    if (!t || t.state !== "active") return { actif: false, reste: 0 };
    if (!this._ti && this.isConnected) this._ti = setInterval(() => this._schedule(), 20000);   // not for a detached card (nothing would ever clear it); connectedCallback re-renders and starts it
    const fin = Date.parse(t.attributes.finishes_at);
    return { actif: true, reste: isNaN(fin) ? null : Math.max(1, Math.ceil((fin - Date.now()) / 60000)) };
  }
  disconnectedCallback() {
    if (this._ti) { clearInterval(this._ti); this._ti = null; }
    if (this._sfRo) { this._sfRo.disconnect(); this._sfRo = null; }
    if (this._holdTimer) { clearTimeout(this._holdTimer); this._holdTimer = null; }
  }
  getCardSize() { return 4; }
  // Sections view: HA's own defaults (full width of one section column, height from the content) plus a minimum width so the card cannot
  // be dragged to an unusable size. Cards with their own needs override it.
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 4 }; }
}

