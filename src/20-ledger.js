/* ================================================================== BILAN */
/*
 * Consumption summary per device over a chosen period (input_select).
 *
 * type: custom:sf-ledger-card
 * period: input_select.x    total_cost: sensor.x   solar_fraction: sensor.x   avg_price: sensor.x
 * devices: [{ name, icon, total, edf, solar, cost }]
 */
class SfLedgerCard extends SfBase {
  defaults() { return { devices: [] }; }
  css() {
    return `
      .kpis { display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin:12px 0 16px; }
      .kpi { padding:10px 12px; border-radius:10px; background:rgba(0,229,255,.04); border:1px solid rgba(0,229,255,.14); }
      .kpi .v { font-family:Orbitron,sans-serif; font-size:22px; color:#fff; margin-top:4px; }
      .dev { display:grid; grid-template-columns: 150px 1fr 90px; gap:12px; align-items:center; padding:8px 0;
        border-bottom:1px solid rgba(0,229,255,.08); }
      @media (max-width: 560px) { .dev { grid-template-columns: 1fr; gap:6px; } }
      .bar { height:12px; border-radius:6px; background:rgba(255,255,255,.06); overflow:hidden; display:flex; }
      .bar i { display:block; height:100%; transition: width 1s; }
      .legend { display:flex; gap:14px; font-size:10px; color:${SF_C.dim}; margin-top:10px; }
      .legend i { display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:5px; vertical-align:-1px; }`;
  }
  render() {
    const c = this._config, p = this.st(c.period);
    const seg = p ? (p.attributes.options || []).map((o) => `<span class="btn ${this.esc(p.state === o ? "on" : "")}" ${this.call("input_select.select_option", { entity_id: c.period, option: o })}>${this.esc(o)}</span>`).join("") : "";
    const max = Math.max(1, ...c.devices.map((d) => this.num(d.total) || 0));
    const devs = c.devices.map((d) => {
      const tot = this.num(d.total), e = this.num(d.edf) || 0, s = this.num(d.solar) || 0, cost = this.num(d.cost);
      return `<div class="dev click" data-e="${this.esc(d.total)}"><div>${this.icon(d.icon || "mdi:flash", 16, SF_C.cyan)} ${this.esc(d.name)}
          <div class="lbl" style="margin-top:2px;text-transform:none">${tot === null ? "—" : this.nf(tot, 1) + " kWh"}</div></div>
        <div class="bar"><i style="width:${this.esc((s / max) * 100)}%;background:${SF_C.amber};box-shadow:0 0 8px ${SF_C.amber}"></i><i style="width:${this.esc((e / max) * 100)}%;background:#ff7a45"></i></div>
        <div class="val" style="text-align:right">${cost === null ? "—" : this.nf(cost, 2) + " €"}</div></div>`;
    }).join("");
    const fr = this.num(c.solar_fraction), tc = this.num(c.total_cost), ap = this.num(c.avg_price);
    const hasSolar = !!c.solar_fraction || c.devices.some((d) => d.solar);
    const kp = [[c.total_cost, "Coût réseau", tc === null ? "—" : this.nf(tc, 2) + " €", ""], [c.solar_fraction, "Part solaire", fr === null ? "—" : Math.round(fr) + " %", `color:${SF_C.amber}`],
      [c.avg_price, "Prix moyen", ap === null ? "—" : this.nf(ap, 3) + " €", ""]].filter((k) => k[0]);
    return this.frame(this.t("Bilan énergétique"), p ? this.esc(p.state) : "", `
      <div class="seg">${seg}</div>
      <div class="kpis" style="grid-template-columns:repeat(${this.esc(Math.max(1, kp.length))},minmax(0,1fr))">${kp.map((k) => `<div class="kpi click" data-e="${this.esc(k[0])}"><div class="lbl">${this.t(k[1])}</div><div class="v" style="${this.esc(k[3])}">${k[2]}</div></div>`).join("")}
      </div>${devs}
      <div class="legend">${hasSolar ? `<span><i style="background:${SF_C.amber}"></i>${this.t("solaire")}</span>` : ""}<span><i style="background:#ff7a45"></i>${this.t("Réseau")}</span><span>${this.t("estimations")}</span></div>`);
  }
  getCardSize() { return 6; }
}

