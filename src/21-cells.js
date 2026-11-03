/* ================================================================ CELLULES */
/*
 * Batteries of all sensors (device_class battery), discovered automatically,
 * weakest first.
 *
 * type: custom:sf-cells-card
 * warn: 30   crit: 15   limit: 16   exclude: [sensor.x, ...]
 * include_pattern: "" / exclude_pattern: ""   (optional regexes on the id; ignored if too long, invalid or with nested quantifiers)
 */
class SfCellsCard extends SfBase {
  defaults() { return { warn: 30, crit: 15, limit: 16, exclude: [] }; }
  css() {
    return `
      .cells { display:grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap:8px; }
      .cell { display:grid; grid-template-columns: 26px 1fr; gap:8px; align-items:center; padding:7px 9px; border-radius:8px;
        background:rgb(var(--sf-cyan-rgb) / .03); border:1px solid rgb(var(--sf-cyan-rgb) / .1); }
      .bat { position:relative; width:14px; height:24px; border:1.5px solid currentColor; border-radius:3px; margin:0 auto; }
      .bat::before { content:""; position:absolute; top:-4px; left:3px; width:5px; height:3px; background:currentColor; border-radius:1px 1px 0 0; }
      .bat i { position:absolute; left:1.5px; right:1.5px; bottom:1.5px; border-radius:1px; background:currentColor; box-shadow:0 0 6px currentColor; }
      .cell > div:last-child { min-width:0; }
      .cell .nm { font-size:10.5px; line-height:1.2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .cell .pc { font-family:Orbitron,sans-serif; font-size:13px; }`;
  }
  render() {
    const c = this._config, re = sfRegex(c.include_pattern), ex = sfRegex(c.exclude_pattern);
    const list = Object.values(this._hass.states || {}).filter((s) => s.entity_id.startsWith("sensor.")
      && s.attributes.device_class === "battery" && !c.exclude.includes(s.entity_id) && (!re || re.test(s.entity_id)) && (!ex || !ex.test(s.entity_id))
      && !isNaN(parseFloat(s.state))).map((s) => [s, parseFloat(s.state)]).sort((a, b) => a[1] - b[1]);
    const low = list.filter(([, v]) => v <= c.warn).length;
    const cells = list.slice(0, c.limit).map(([s, v]) => {
      const col = v <= c.crit ? SF_C.red : v <= c.warn ? SF_C.amber : SF_C.green;
      const nm = String(s.attributes.friendly_name || s.entity_id).slice(0, 120).replace(/\s*(Batterie|Battery( level)?|Battery Level)$/i, "");
      return `<div class="cell click" data-e="${this.esc(s.entity_id)}" style="color:${this.esc(col)}"><div class="bat"><i style="height:calc(${this.esc(Math.max(4, Math.min(100, v)))}% - 3px)"></i></div>
        <div><div class="nm" style="color:${SF_C.text}" title="${this.esc(nm)}">${this.esc(nm)}</div><div class="pc">${Math.round(v)} %</div></div></div>`;
    }).join("");
    return this.frame(this.t("cells.sensor_batteries"), this.t("cells.n_sensors_m_to_replace_soon", { n: list.length, m: low }), `<div class="cells">${cells}</div>`);
  }
  getCardSize() { return 5; }
}

