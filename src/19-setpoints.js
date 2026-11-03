/* =============================================================== CONSIGNES */
/*
 * Setpoint matrix: one row per room, one column per program.
 *
 * type: custom:sf-setpoints-card
 * columns: [{ label, color }]
 * rows: [{ name, icon, entities: [input_number.x, ...] }]   # in column order
 * Touching a value opens an editor (slider, − / +, bounds and step of the input_number) with a scope: this value, the whole program (column) or the whole room (row).
 */
class SfSetpointsCard extends SfBase {
  defaults() { return { columns: [], rows: [] }; }
  css() {
    return `
      table { width:100%; border-collapse:separate; border-spacing:0 6px; }
      th { font-family:Orbitron,sans-serif; font-weight:500; font-size:10px; letter-spacing:.16em; text-align:center; padding:4px; }
      td { padding:6px 4px; background:rgb(var(--sf-cyan-rgb) / .03); border-top:1px solid rgb(var(--sf-cyan-rgb) / .1); border-bottom:1px solid rgb(var(--sf-cyan-rgb) / .1); }
      td:first-child { border-left:1px solid rgb(var(--sf-cyan-rgb) / .1); border-radius:8px 0 0 8px; padding-left:10px; white-space:nowrap; }
      td:last-child { border-right:1px solid rgb(var(--sf-cyan-rgb) / .1); border-radius:0 8px 8px 0; }
      .st { display:flex; align-items:center; justify-content:center; gap:4px; }
      .st .btn { padding:3px 8px; }
      .st b { font-family:Orbitron,sans-serif; font-size:14px; min-width:44px; text-align:center; color:var(--sf-strong); }
      .st b.edit { cursor:pointer; padding:6px 4px; border-radius:6px; }
      .st b.edit:hover, .st b.edit:focus-visible { background:rgb(var(--sf-cyan-rgb) / .12); outline:none; }
      @media (max-width: 640px) { .st .btn { display:none; } .st b { min-width:56px; padding:10px 6px; } }
      .ed { display:flex; flex-direction:column; align-items:center; gap:14px; padding:6px 0 2px; }
      .ed .who { font-size:13px; color:${SF_C.dim}; text-align:center; }
      .ed .who b { font-weight:600; }
      .ed .big { display:flex; align-items:center; justify-content:center; gap:18px; }
      .ed .big output { font-family:Orbitron,sans-serif; font-size:38px; color:var(--sf-strong); min-width:130px; text-align:center; }
      .ed .big button.btn { font-size:26px; line-height:1; min-width:56px; min-height:56px; padding:0; }
      .ed input[type=range] { width:100%; max-width:420px; height:36px; accent-color:var(--ed-col, ${SF_C.cyan}); }
      .ed .seg { flex-wrap:wrap; justify-content:center; }
      .ed .acts { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; }
      .ed button.btn { font:inherit; cursor:pointer; }
      .ed .acts button.btn { min-height:44px; padding:0 18px; }
      .ed .err { color:${SF_C.red}; font-size:12px; min-height:1em; }`;
  }
  _lim(id) {
    const a = (this.st(id) || {}).attributes || {}, mn = parseFloat(a.min), mx = parseFloat(a.max), sp = parseFloat(a.step);
    return { min: isFinite(mn) ? mn : 5, max: isFinite(mx) && mx > (isFinite(mn) ? mn : 5) ? mx : 30, step: isFinite(sp) && sp > 0 ? sp : 0.5 };
  }
  _fit(id, v) {   // value brought back within the bounds and onto the entity's step
    const l = this._lim(id), dec = (String(l.step).split(".")[1] || "").length;
    return Math.min(l.max, Math.max(l.min, parseFloat((Math.round((v - l.min) / l.step) * l.step + l.min).toFixed(dec))));
  }
  _targets(scope) {
    const c = this._config, e = this._ed, row = c.rows[e.r];
    if (scope === "col") return c.rows.map((r) => r.entities[e.i]).filter((id) => id && this.ok(id));
    if (scope === "row") return row.entities.filter((id) => id && this.ok(id));
    return [row.entities[e.i]];
  }
  _editor() {
    const c = this._config, e = this._ed, row = c.rows[e.r], col = c.columns[e.i] || {}, id = row.entities[e.i], l = this._lim(id);
    const colr = col.color || SF_C.cyan, scopes = [["cell", "Cette valeur"]];
    if (c.rows.length > 1) scopes.push(["col", "Tout le programme"]);
    if (row.entities.length > 1) scopes.push(["row", "Toute la pièce"]);
    return this.frame(this.esc(c.title || this.t("setpoints.setpoints")), "", `<div class="ed" style="--ed-col:${this.esc(colr)}">
      <div class="who">${this.icon(row.icon || "mdi:home", 16, SF_C.dim)} ${this.esc(row.name)} · <b style="color:${this.esc(colr)}">${this.esc(col.label || "")}</b></div>
      <div class="big"><button type="button" class="btn" data-ed="dec" aria-label="−">−</button><output data-ed-out aria-live="polite" style="text-shadow:0 0 10px ${this.esc(colr)}"></output><button type="button" class="btn" data-ed="inc" aria-label="+">+</button></div>
      <input type="range" data-ed-range min="${this.esc(l.min)}" max="${this.esc(l.max)}" step="${this.esc(l.step)}" aria-label="${this.esc(row.name)}">
      ${scopes.length > 1 ? `<div class="seg" role="group">${scopes.map(([k, lab]) => `<button type="button" class="btn" data-ed-scope="${k}">${this.esc(this.t(lab))}</button>`).join("")}</div>` : ""}
      <div class="err" data-ed-err role="alert"></div>
      <div class="acts"><button type="button" class="btn on" data-ed="ok">${this.esc(this.t("setpoints.apply"))}</button><button type="button" class="btn" data-ed="cancel">${this.esc(this.t("setpoints.cancel"))}</button><button type="button" class="btn" data-ed="info">${this.esc(this.t("setpoints.details"))}</button></div>
    </div>`);
  }
  render() {
    const c = this._config;
    if (this._ed && !(c.rows[this._ed.r] && c.rows[this._ed.r].entities[this._ed.i])) this._ed = null;
    if (this._ed) return this._editor();
    const head = `<tr><th></th>${c.columns.map((k) => `<th style="color:${this.esc(k.color || SF_C.cyan)}">${this.esc(k.label)}</th>`).join("")}</tr>`;
    const rows = c.rows.map((r, ri) => `<tr><td>${this.icon(r.icon || "mdi:home", 15, SF_C.dim)} ${this.esc(r.name)}</td>${r.entities.map((id, i) => {
      const v = this.num(id), col = (c.columns[i] || {}).color || SF_C.cyan, sh = `text-shadow:0 0 8px ${this.esc(col)}`;
      return `<td><div class="st"><span class="btn" ${this.call("input_number.decrement", { entity_id: id })}>−</span>
        ${v === null ? `<b style="${sh}">—</b>` : `<b class="edit" role="button" tabindex="0" data-ed-open="${ri},${i}" aria-label="${this.esc(r.name)} ${this.esc((c.columns[i] || {}).label || "")} ${this.esc(this.nf(v, 1))}°" style="${sh}">${this.nf(v, 1)}°</b>`}
        <span class="btn" ${this.call("input_number.increment", { entity_id: id })}>+</span></div></td>`;
    }).join("")}</tr>`).join("");
    return this.frame(this.esc(c.title || this.t("setpoints.setpoints")), this.esc(c.subtitle || ""), `<table>${head}${rows}</table>`);
  }
  afterRender() {
    const root = this.shadowRoot;
    root.querySelectorAll("[data-ed-open]").forEach((el) => {
      const open = (ev) => {
        ev.stopPropagation();
        const [r, i] = el.dataset.edOpen.split(",").map(Number), id = this._config.rows[r].entities[i], v = this.num(id);
        if (v === null) return;
        this._ed = { r, i, v: this._fit(id, v), scope: "cell" }; this._lastHtml = null; this._schedule();
      };
      el.addEventListener("click", open);
      el.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); open(ev); } });
    });
    const e = this._ed; if (!e) return;
    const out = root.querySelector("[data-ed-out]"), rng = root.querySelector("[data-ed-range]"), id = this._config.rows[e.r].entities[e.i];
    const show = () => { out.textContent = `${this.nf(e.v, 1)}°`; rng.value = e.v; };
    const scopes = () => root.querySelectorAll("[data-ed-scope]").forEach((b) => { const on = b.dataset.edScope === e.scope; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    const set = (v) => { e.v = this._fit(id, v); show(); };
    show(); scopes();
    rng.addEventListener("input", () => set(parseFloat(rng.value)));
    root.querySelectorAll("[data-ed-scope]").forEach((b) => b.addEventListener("click", () => { e.scope = b.dataset.edScope; scopes(); }));
    const close = () => { this._ed = null; this._lastHtml = null; this._schedule(); };
    root.querySelectorAll("[data-ed]").forEach((b) => b.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const act = b.dataset.ed, st = this._lim(id).step;
      if (act === "dec") set(e.v - st);
      else if (act === "inc") set(e.v + st);
      else if (act === "cancel") close();
      else if (act === "info") { const keep = id; close(); this._moreInfo(keep); }
      else if (act === "ok") {
        const err = root.querySelector("[data-ed-err]"); b.disabled = true;
        Promise.all(this._targets(e.scope).map((t) => this._hass.callService("input_number", "set_value", { entity_id: t, value: this._fit(t, e.v) })))
          .then(close, (x) => { b.disabled = false; err.textContent = String((x && x.message) || x); });
      }
    }));
  }
  getCardSize() { return 6; }
}

