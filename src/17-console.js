/* ================================================================= CONSOLE */
/*
 * Generic command console, by groups.
 *
 * type: custom:sf-console-card
 * title: "Console"
 * groups:
 *   - title: Lights
 *     items:
 *       - { kind: toggle, entity: light.x, label: Salon, icon: mdi:lightbulb }
 *       - { kind: action, label: Dimmed, icon: mdi:..., service: scene.turn_on, data: {...}, confirm: "Sure?" }
 *       - { kind: cover, entity: cover.x, label: Volets }
 *       - { kind: vacuum, entity: vacuum.x, battery: sensor.x, label: Robot }
 *       - { kind: select, entity: input_select.x, label: ... }
 *       - { kind: dimmer, entity: light.x, label: Living room }     # toggle + brightness ±10 %
 *       - { kind: sensor, entity: sensor.x, label: ..., icon: ..., digits: 0 }
 */
class SfConsoleCard extends SfBase {
  defaults() { return { groups: [] }; }
  css() {
    return `
      .groups { display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:14px; }
      .grp h4 { margin:0 0 8px; font-family:Orbitron,sans-serif; font-weight:500; font-size:10px; letter-spacing:.2em;
        color:${SF_C.cyan}; display:flex; align-items:center; gap:6px; }
      .grp h4::after { content:""; flex:1; height:1px; background:linear-gradient(90deg, rgba(0,229,255,.35), transparent); }
      .items { display:grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap:8px; }
      .it { position:relative; display:flex; flex-direction:column; align-items:flex-start; gap:6px; padding:10px;
        border-radius:10px; border:1px solid rgba(0,229,255,.16); background:rgba(0,229,255,.035); min-height:62px; }
      .it .nm { font-size:11px; color:${SF_C.text}; line-height:1.2; }
      .it .sv { font-size:10px; color:${SF_C.dim}; }
      .it.on { border-color:var(--ac, ${SF_C.amber}); background: linear-gradient(160deg, color-mix(in srgb, var(--ac, ${SF_C.amber}) 22%, transparent), transparent);
        box-shadow: 0 0 14px -4px var(--ac, ${SF_C.amber}); }
      .it.on ha-icon { color:var(--ac, ${SF_C.amber}); filter: drop-shadow(0 0 4px var(--ac, ${SF_C.amber})); }
      .it.dead { opacity:.35; }
      .wide { grid-column: 1 / -1; min-height:0; }
      .row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      .row .grow { flex:1; min-width:90px; }
      .big { font-family:Orbitron,sans-serif; font-size:18px; color:#fff; }`;
  }
  _item(x) {
    const s = this.st(x.entity), dead = x.entity && !this.ok(x.entity);
    const ic = (n) => this.icon(x.icon || n, 20);
    switch (x.kind) {
      case "toggle": {
        const on = this.isOn(x.entity);
        return `<div class="it ${this.esc(on ? "on" : "")} ${this.esc(dead ? "dead" : "")}" style="${this.esc(x.color ? `--ac:${x.color}` : "")}" ${this.toggleCall(x.entity)}>
          ${ic("mdi:toggle-switch")}<span class="nm">${this.esc(x.label)}</span><span class="sv">${dead ? this.t("common.no_data") : on ? this.t("console.on") : this.t("console.off")}</span></div>`;
      }
      case "action":
        return `<div class="it ${this.esc(dead ? "dead" : "")}" style="${this.esc(x.color ? `--ac:${x.color}` : "")}" ${this.call(x.service, x.data, x.confirm)}>
          ${ic("mdi:play")}<span class="nm">${this.esc(x.label)}</span>${x.sub ? `<span class="sv">${this.esc(x.sub)}</span>` : ""}</div>`;
      case "sensor": {
        const v = this.num(x.entity);
        return `<div class="it click ${this.esc(dead ? "dead" : "")}" data-e="${this.esc(x.entity)}">${ic("mdi:gauge")}<span class="nm">${this.esc(x.label)}</span>
          <span class="big" style="font-size:14px">${v === null ? (s && this.ok(x.entity) ? this.esc(s.state) : "—") : this.nf(v, x.digits ?? 0)}<span class="sv"> ${this.esc(x.unit ?? this.unit(x.entity))}</span></span></div>`;
      }
      case "cover": {
        const pos = s && s.attributes.current_position;
        const txt = !s ? "—" : Object.assign(Object.create(null), { open: this.t("common.open"), closed: this.t("common.closed"), opening: this.t("console.opening"), closing: this.t("console.closing") })[s.state] || this.esc(s.state);
        return `<div class="it wide"><div class="row"><span class="click" data-e="${this.esc(x.entity)}">${ic("mdi:window-shutter")}</span>
          <div class="grow"><div class="nm">${this.esc(x.label)}</div><div class="sv">${txt}${pos !== undefined && pos !== null ? ` · ${pos} %` : ""}</div></div>
          <span class="btn" ${this.call("cover.open_cover", { entity_id: x.entity })}>${this.icon("mdi:arrow-up", 16)}</span>
          <span class="btn" ${this.call("cover.stop_cover", { entity_id: x.entity })}>${this.icon("mdi:stop", 16)}</span>
          <span class="btn" ${this.call("cover.close_cover", { entity_id: x.entity })}>${this.icon("mdi:arrow-down", 16)}</span></div></div>`;
      }
      case "vacuum": {
        const st = s ? s.state : "unavailable";
        const txt = { docked: this.t("console.docked"), cleaning: this.t("console.cleaning"), returning: this.t("console.returning"), paused: this.t("console.paused"), idle: this.t("common.waiting"), error: this.t("console.error") }[st] || this.esc(st);
        const bat = this.num(x.battery);
        return `<div class="it wide ${this.esc(st === "cleaning" ? "on" : "")}" style="--ac:${SF_C.green}"><div class="row">
          <span class="click" data-e="${this.esc(x.entity)}">${ic("mdi:robot-vacuum")}</span>
          <div class="grow"><div class="nm">${this.esc(x.label || "Aspirateur")}</div><div class="sv" style="${this.esc(st === "error" ? `color:${SF_C.red}` : "")}">${txt}${bat !== null ? ` · ${Math.round(bat)} %` : ""}</div></div>
          ${st === "cleaning" ? `<span class="btn" ${this.call("vacuum.pause", { entity_id: x.entity })}>${this.icon("mdi:pause", 16)}</span>`
            : `<span class="btn" ${this.call("vacuum.start", { entity_id: x.entity })}>${this.icon("mdi:play", 16)}</span>`}
          <span class="btn" ${this.call("vacuum.return_to_base", { entity_id: x.entity })}>${this.icon("mdi:home-import-outline", 16)}</span></div>
          ${(x.shortcuts || []).length ? `<div class="row" style="margin-top:6px">${x.shortcuts.filter((b) => this.st(b.entity) && this.st(b.entity).state !== "unavailable").map((b) =>
            `<span class="btn" ${this.call("button.press", { entity_id: b.entity })}>${this.icon(b.icon || "mdi:map-marker-path", 14)}${this.esc(b.label)}</span>`).join("")}</div>` : ""}</div>`;
      }
      case "dimmer": {
        // Bulb: toggle + brightness change in 10 % steps (colour / temperature: the entity's page).
        const on = this.isOn(x.entity), b = s && s.attributes.brightness;
        const pct = on && typeof b === "number" ? Math.round(b / 2.55) : null;
        const step = (d) => this.call("light.turn_on", { entity_id: x.entity, brightness_step_pct: d });
        return `<div class="it wide ${this.esc(on ? "on" : "")} ${this.esc(dead ? "dead" : "")}" style="${this.esc(x.color ? `--ac:${x.color}` : "")}"><div class="row">
          <span ${this.toggleCall(x.entity)}>${ic("mdi:lightbulb")}</span>
          <div class="grow click" data-e="${this.esc(x.entity)}"><div class="nm">${this.esc(x.label)}</div><div class="sv">${dead ? this.t("common.no_data") : on ? (pct === null ? this.t("console.on") : pct + " %") : this.t("console.off")}</div></div>
          <span class="btn" ${dead ? "" : step(-10)}>−</span><span class="btn" ${dead ? "" : step(10)}>+</span></div></div>`;
      }
      case "stepper": {
        // input_number: increment/decrement; number: set_value bounded to the declared step.
        const v = this.num(x.entity), a = (s && s.attributes) || {}, step = a.step || 1;
        const dom = (x.entity || "").split(".")[0];
        const go = (dir) => dom === "input_number"
          ? this.call(`input_number.${dir > 0 ? "increment" : "decrement"}`, { entity_id: x.entity })
          : this.call("number.set_value", { entity_id: x.entity, value: Math.max(a.min ?? -Infinity, Math.min(a.max ?? Infinity, (v ?? 0) + dir * step)) });
        return `<div class="it wide ${this.esc(dead ? "dead" : "")}"><div class="row"><span class="click" data-e="${this.esc(x.entity)}">${ic("mdi:tune-vertical")}</span>
          <div class="grow"><div class="nm">${this.esc(x.label)}</div></div>
          <span class="btn" ${v === null ? "" : go(-1)}>−</span>
          <span class="big click" data-e="${this.esc(x.entity)}" style="min-width:64px;text-align:center;font-size:15px">${v === null ? "—" : this.nf(v, x.digits ?? (step < 1 ? 1 : 0))}<span class="sv"> ${this.esc(x.unit ?? this.unit(x.entity))}</span></span>
          <span class="btn" ${v === null ? "" : go(1)}>+</span></div></div>`;
      }
      case "select": {
        const opts = (s && s.attributes.options) || [];
        return `<div class="it wide"><div class="nm">${this.esc(x.label)}</div><div class="seg">${opts.map((o) =>
          `<span class="btn ${this.esc(s.state === o ? "on" : "")}" ${this.call(`${x.entity.split(".")[0]}.select_option`, { entity_id: x.entity, option: o })}>${this.esc((x.labels && Object.prototype.hasOwnProperty.call(x.labels, o) && x.labels[o]) || o)}</span>`).join("")}</div></div>`;
      }
      default: return "";
    }
  }
  render() {
    const c = this._config;
    const body = c.groups.map((g) => `<div class="grp" style="${this.esc(g.span ? `grid-column:span ${g.span}` : "")}"><h4>${g.icon ? this.icon(g.icon, 14) : ""}${this.esc(g.title)}</h4>
      <div class="items">${(g.items || []).map((x) => this._item(x)).join("")}</div></div>`).join("");
    return this.frame(this.esc(c.title || this.t("console.controls")), c.subtitle ? this.esc(c.subtitle) : "", `<div class="groups">${body}</div>`);
  }
  getCardSize() { return 6; }
}

