class SfEditorBase extends HTMLElement {
  setConfig(config) {
    const j = JSON.stringify(config);
    // Echo of our own modification: we keep the current config (the forms are bound to it)
    // and we do not rebuild, to keep the focus.
    if (j === this._emitted) return;
    this._config = JSON.parse(j);
    if (this.spec && this.spec.norm) this.spec.norm(this._config);   // e.g. entities given as text -> objects (the editor list expects objects)
    this._emitted = null;   // an accepted config resets the echo (otherwise going back to an already emitted value would be ignored)
    this._build();
  }
  set hass(h) {
    this._hass = h;
    if (this.shadowRoot) {
      this.shadowRoot.querySelectorAll("ha-form").forEach((f) => { f.hass = h; });
      // editors of nested cards (a panel's content): they must also follow `hass`, otherwise their selectors keep the original state
      this.shadowRoot.querySelectorAll("*").forEach((e) => { if (e !== this && e.localName.endsWith("-editor")) e.hass = h; });
    }
  }
  _t(key) { return sfTr(sfLang(this._hass), key); }
  // Translates the labels of the drop-down lists of an ha-form schema.
  _trSchema(schema) {
    return (schema || []).map((f) => {
      const o = f.selector && f.selector.select && f.selector.select.options;
      const g = f.schema ? { ...f, schema: this._trSchema(f.schema) } : f;
      return o ? { ...g, selector: { select: { ...f.selector.select, options: o.map((x) => ({ ...x, label: this._t(x.label) })) } } } : g;
    });
  }
  connectedCallback() { sfLoadHaForm(); this._build(); }
  // "Missing required fields" banner: updated on every change.
  _banner() {
    const root = this.shadowRoot; if (!root) return;
    const rq = SF_REQ[this.localName.replace(/-editor$/, "")], miss = rq ? rq(this._config || {}) : [];
    let b = root.querySelector(".req");
    if (!b) { b = document.createElement("div"); b.className = "req"; const w = root.querySelector("div"); if (w) w.prepend(b); }
    b.hidden = !miss.length;
    b.textContent = miss.length ? `${this._t("Champs obligatoires manquants")} : ${miss.map((m) => this._t(m)).join(" · ")}` : "";
  }
  _emit() {
    this._banner();
    this._emitted = JSON.stringify(sfClean(this._config));
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: JSON.parse(this._emitted) }, bubbles: true, composed: true }));
  }
  _build() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._open = this._open || new Set();
    const spec = this.spec, labels = { ...SF_LABELS, ...(spec.labels || {}) };
    this._lang = sfLang(this._hass);
    const root = this.shadowRoot;
    root.innerHTML = `<style>${SF_ED_CSS}</style>`;
    const wrap = document.createElement("div");
    root.appendChild(wrap);
    this._banner();
    const emit = () => this._emit(), rebuild = () => this._build();
    const themeField = sfS("theme", [["dark", "Sombre"], ["light", "Clair"], ["auto", "Automatique (selon le thème de HA)"]]);
    wrap.appendChild(this._form(this._config, (d) => [...(spec.fields ? spec.fields(d) : []), themeField], labels, emit));
    for (const o of spec.objects || []) {
      const h = document.createElement("h3"); h.textContent = this._t(o.title); wrap.appendChild(h);
      if (!this._config[o.key] || typeof this._config[o.key] !== "object") this._config[o.key] = {};
      wrap.appendChild(this._form(this._config[o.key], o.schema, labels, emit));
    }
    for (const l of spec.lists || []) wrap.appendChild(this._list(this._config, l, labels, emit, rebuild, l.key));
  }
  _form(data, schemaFn, labels, onChange) {
    const f = document.createElement("ha-form");
    f.hass = this._hass;
    f.data = data;
    f.schema = this._trSchema(schemaFn(data));
    f.computeLabel = (s) => this._t(labels[s.name] ?? s.name);
    sfRedReq(f);
    f.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const v = ev.detail.value || {};
      for (const k of Object.keys(data)) if (!(k in v)) delete data[k];
      Object.assign(data, v);
      if (data._device) {   // "Fill from a device" field: we fill the empty fields, then forget the choice
        const dv = data._device, fld = (schemaFn(data) || []).find((x) => x && x.sfFill);
        delete data._device;
        if (fld) {
          const had = Object.keys(data).length, hasInv = !!(this._hass && this._hass.entities);
          sfAutofill(this._hass, data, dv, fld.sfFill); f.data = { ...data };
          const n = Object.keys(data).length - had;
          const msg = !hasInv ? this._t("Remplissage indisponible : inventaire des entités absent (Home Assistant trop ancien ?)")
            : n > 0 ? this._t("Remplissage : {n} champ(s) rempli(s) — à vérifier").replace("{n}", n) : this._t("Aucune entité reconnue (ou champs déjà remplis) pour cet appareil");
          this.dispatchEvent(new CustomEvent("hass-notification", { detail: { message: msg }, bubbles: true, composed: true }));
        }
      }
      const ns = this._trSchema(schemaFn(data));
      if (JSON.stringify(ns) !== JSON.stringify(f.schema)) f.schema = ns;   // e.g. the item type changes the fields
      onChange();
    });
    return f;
  }
  // Nested card (e.g. a panel's content): choice of the type then the editor of that card.
  _embed(item, key, onChange) {
    const box = document.createElement("div");
    const h = document.createElement("h3"); h.textContent = this._t("Contenu du panneau"); box.appendChild(h);
    const tag = sfCardTag(item[key]);
    const sel = document.createElement("ha-form");
    // "Other card" is only offered if the panel is not already an SF card: choosing it would erase its content.
    const opts = [...(tag ? [] : [["", this._t("Autre carte (YAML ci-dessus)")]]), ...Object.entries(SF_CARD_NAMES).map(([k, v]) => [k, this._t(v)])];
    const schema = [{ name: "type", selector: { select: { mode: "dropdown", options: opts.map(([value, label]) => ({ value, label })) } } }];
    sel.hass = this._hass; sel.schema = schema; sel.data = { type: tag };
    sel.computeLabel = () => this._t("Type de carte du panneau");
    sel.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const nt = ev.detail.value && ev.detail.value.type;
      if (nt === tag) return;
      if (nt) item[key] = { ...JSON.parse(JSON.stringify(SF_SPECS[nt].stub)), type: `custom:${nt}` };
      onChange(); this._build();
    });
    box.appendChild(sel);
    if (tag) {
      const sub = document.createElement(`${tag}-editor`);
      sub.hass = this._hass;
      sub.setConfig(item[key]);
      sub.addEventListener("config-changed", (ev) => {   // do not let it bubble up: HA would see the config of the whole card
        ev.stopPropagation();
        item[key] = ev.detail.config;
        onChange();
      });
      box.appendChild(sub);
    }
    return box;
  }
  _list(parent, ls, labels, onChange, rebuild, path) {
    if (!Array.isArray(parent[ls.key])) parent[ls.key] = [];
    const arr = parent[ls.key], box = document.createElement("div");
    const h = document.createElement("h3"); h.textContent = this._t(ls.title); box.appendChild(h);
    arr.forEach((item, i) => {
      const p = `${path}.${i}`, d = document.createElement("details");
      d.open = this._open.has(p);
      d.addEventListener("toggle", () => { if (d.open) this._open.add(p); else this._open.delete(p); });
      const sm = document.createElement("summary");
      const t = document.createElement("span"); t.className = "t";
      const upd = () => { t.textContent = (ls.itemTitle && ls.itemTitle(item)) || `${this._t(ls.item)} ${i + 1}`; };
      upd(); sm.appendChild(t);
      const btn = (txt, cls, fn, title) => {
        const b = document.createElement("button"); b.textContent = txt; b.className = cls || ""; if (title) b.title = title;
        b.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); fn(b); });
        sm.appendChild(b); return b;
      };
      const move = (to) => () => { const [x] = arr.splice(i, 1); arr.splice(to, 0, x); this._open.clear(); onChange(); rebuild(); };
      if (i > 0) btn("↑", "", move(i - 1), this._t("Monter"));
      if (i < arr.length - 1) btn("↓", "", move(i + 1), this._t("Descendre"));
      btn(this._t("Supprimer"), "del", (b) => {
        if (!b.classList.contains("armed")) {   // two presses: avoids deleting by mistake
          b.classList.add("armed"); b.textContent = this._t("Confirmer ?");
          setTimeout(() => { if (b.isConnected) { b.classList.remove("armed"); b.textContent = this._t("Supprimer"); } }, 3000);
          return;
        }
        arr.splice(i, 1); this._open.clear(); onChange(); rebuild();
      });
      d.appendChild(sm);
      const body = document.createElement("div"); body.className = "body";
      const form = this._form(item, ls.schema, labels, () => { upd(); onChange(); });
      body.appendChild(form);
      for (const nl of ls.lists || []) {
        const sub = this._list(item, nl, labels, onChange, rebuild, `${p}.${nl.key}`);
        sub.className = "sub"; body.appendChild(sub);
      }
      if (ls.embed) body.appendChild(this._embed(item, ls.embed, onChange));
      d.appendChild(body);
      box.appendChild(d);
    });
    if (!ls.max || arr.length < ls.max) {
      const add = document.createElement("button"); add.className = "add"; add.textContent = `+ ${this._t(ls.add)}`;
      add.addEventListener("click", () => { arr.push(ls.new ? ls.new() : {}); this._open.add(`${path}.${arr.length - 1}`); onChange(); rebuild(); });
      box.appendChild(add);
    }
    return box;
  }
}

