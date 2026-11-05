/* =============================================================== REACTOR */
/*
 * Energy flows around a 3D core. Powers are converted to W whatever
 * the unit (some meters publish in kW).
 *
 * type: custom:sf-reactor-card
 * solar: sensor.x (optional)    grid: sensor.x (positive = drawing from the grid)
 * battery_power: sensor.x (W, positive = discharging)   battery_soc: sensor.x (%)   battery_invert: false   # optional battery
 * batteries: [{ soc, power, capacity_kwh }]   # or several batteries (a single node: weighted level, summed power)
 * devices: [{ name, entity, icon, color }]
 * hide_idle: true   idle_w: 20   # hides devices below 20 W (the layout only counts the visible ones)
 * max_devices: 8                 # beyond that, only the most power-hungry are shown ("+N others")
 * fossil: sensor.x (% fossil share of the grid)   price: sensor.x
 */
class SfReactorCard extends SfBase {
  defaults() { return { devices: [], hide_idle: true, idle_w: 20, max_devices: 8 }; }
  // The layout depends on the available width: we re-render when it changes (rotation, resizing).
  connectedCallback() {
    super.connectedCallback();
    if (typeof ResizeObserver === "undefined") return;
    if (this._ro) this._ro.disconnect();
    this._ro = new ResizeObserver(() => this._schedule());
    this._ro.observe(this);
  }
  disconnectedCallback() { super.disconnectedCallback(); if (this._ro) { this._ro.disconnect(); this._ro = null; } }
  css() {
    return `
      .stage { position:relative; width:100%; aspect-ratio: 16 / 9; min-height:260px; }
      .hud.fill .stage { flex:1 0 auto; }
      .stage svg { position:absolute; inset:0; width:100%; height:100%; }
      .ln { fill:none; stroke-width:2; stroke-linecap:round; }
      .ln.bg { stroke:rgb(var(--sf-fg-rgb) / .06); stroke-width:6; }
      .ln.fx { stroke-dasharray: 2 14; animation: flow var(--d, 2s) linear infinite; }
      .ln.rev { animation-direction: reverse; }
      @keyframes flow { to { stroke-dashoffset: -32; } }
      .node { position:absolute; transform:translate(-50%,-50%); text-align:center; width:88px; }
      .node .ic { width:46px; height:46px; margin:0 auto 4px; border-radius:50%; display:grid; place-items:center;
        background: radial-gradient(circle at 35% 30%, rgb(var(--sf-fg-rgb) / .12), rgb(var(--sf-shade-rgb) / .4));
        border:1px solid currentColor; box-shadow: 0 0 12px -2px currentColor, inset 0 0 10px -4px currentColor; }
      .node .n { font-size:9px; letter-spacing:.14em; text-transform:uppercase; color:${SF_C.dim}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .node .w { font-family:Orbitron,sans-serif; font-size:13px; color:var(--sf-strong); }
      .node.idle { opacity:.4; }
      :host([theme="light"]) .node.idle { opacity:.65; }
      .core { position:absolute; left:50%; top:50%; width:min(30%, 190px); aspect-ratio:1; transform:translate(-50%,-50%);
        perspective: 600px; }
      .core .r { position:absolute; inset:0; border-radius:50%; border:2px solid var(--cc);
        box-shadow: 0 0 14px var(--cc), inset 0 0 14px var(--cc); opacity:.75; transform-style:preserve-3d; }
      .core .r1 { animation: o1 7s linear infinite; }
      .core .r2 { inset:8%; animation: o2 9s linear infinite; border-style:dashed; }
      .core .r3 { inset:16%; animation: o3 5s linear infinite; opacity:.5; }
      @keyframes o1 { from { transform: rotateX(70deg) rotateZ(0); } to { transform: rotateX(70deg) rotateZ(360deg); } }
      @keyframes o2 { from { transform: rotateY(65deg) rotateZ(0); } to { transform: rotateY(65deg) rotateZ(-360deg); } }
      @keyframes o3 { from { transform: rotateX(-40deg) rotateY(30deg) rotateZ(0); } to { transform: rotateX(-40deg) rotateY(30deg) rotateZ(360deg); } }
      .core .orb { position:absolute; inset:28%; border-radius:50%;
        background: radial-gradient(circle at 40% 35%, var(--sf-white) 0%, var(--cc) 30%, rgba(0,0,0,.0) 72%);
        box-shadow: 0 0 40px var(--cc); animation: breathe 2.6s ease-in-out infinite; }
      @keyframes breathe { 50% { transform: scale(1.08); filter: brightness(1.25); } }
      .core .txt { position:absolute; inset:0; display:grid; place-items:center; text-align:center; pointer-events:none; }
      .core .txt b { display:block; font-family:Orbitron,sans-serif; font-size:clamp(14px, 2.2vw, 22px); color:var(--sf-strong);
        text-shadow:0 0 10px var(--sf-halo), 0 0 6px var(--cc); }
      .core .txt span { font-size:9px; letter-spacing:.2em; color:var(--sf-strong); text-shadow:0 0 6px var(--sf-halo); }
      .foot { display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-top:6px; }
      .foot > div { padding:8px 10px; border-radius:8px; background:rgb(var(--sf-cyan-rgb) / .04); border:1px solid rgb(var(--sf-cyan-rgb) / .12); text-align:center; }
      .foot .v { font-family:Orbitron,sans-serif; font-size:16px; color:var(--sf-strong); margin-top:3px; }`;
  }
  _dur(w) { // the more powerful, the faster the flow
    const a = Math.abs(w || 0);
    return Math.max(0.35, 2.6 - Math.log10(Math.max(a, 10)) * 0.6).toFixed(2) + "s";
  }
  render() {
    const c = this._config;
    const hasSolar = !!c.solar;
    const solar = Math.max(0, this.watts(c.solar) ?? 0);
    const grid = this.watts(c.grid);
    // Optional battery: `battery_power` (W, positive = discharging, `battery_invert: true` for the opposite), `battery_soc` (%).
    // Several batteries: `batteries: [{ soc, power, capacity_kwh }]` → a single node (weighted level, summed power).
    const bat = sfBatAgg(this, { batteries: c.batteries, soc: c.battery_soc, power: c.battery_power, invert: c.battery_invert });
    const hasBat = bat.n > 0, bsoc = bat.soc, bw = bat.power;
    const home = grid === null ? null : solar + grid + (bw || 0);
    const exporting = grid !== null && grid < -20;
    const autonomy = (hasSolar || hasBat) && home && home > 0 ? Math.min(100, ((hasSolar ? Math.min(solar, home) : 0) + Math.max(bw || 0, 0)) / home * 100) : null;
    const cc = exporting || (autonomy !== null && autonomy > 90) ? SF_C.green : grid !== null && grid > 3000 ? SF_C.amber : SF_C.cyan;

    // Dynamic layout, according to the number of devices AND the available width (the frame grows to keep
    // ~90 px per row: no overlap, whatever the number of entities).
    //  - wide screen  : devices in 1 to 3 columns to the right of the core;
    //  - narrow screen (phone): solar above the core, grid beside it, devices in a 3-column grid below.
    // A stopped device (below `idle_w`, 20 W by default) is hidden (`hide_idle: false` to keep them all);
    // an unavailable measurement stays visible ("—"), it is information. The layout only counts the visible ones.
    const visibles = c.hide_idle === false ? c.devices : c.devices.filter((d) => { const w = this.watts(d.entity); return w === null || Math.abs(w) >= (c.idle_w ?? 20); });
    const hidden = c.devices.length - visibles.length;
    // Display cap: beyond `max_devices` (8), the most power-hungry are kept, in config order.
    let devs = visibles, extra = 0;
    const max = Math.max(1, c.max_devices ?? 8);
    if (visibles.length > max) {
      const top = new Set([...visibles].sort((a, b) => Math.abs(this.watts(b.entity) ?? 0) - Math.abs(this.watts(a.entity) ?? 0)).slice(0, max));
      devs = visibles.filter((d) => top.has(d)); extra = visibles.length - max;
    }
    // The battery is an always-visible "device", placed first, whose flow goes from the core to it (charging) or the other way round.
    if (hasBat) {
      const lvl = bsoc === null ? "mdi:battery" : bsoc >= 95 ? "mdi:battery" : `mdi:battery-${Math.max(10, Math.round(bsoc / 10) * 10)}`;
      devs = [{ __bat: true, name: bsoc === null ? this.t("common.battery_2") : `${this.t("common.battery_2")} ${Math.round(bsoc)} %`, icon: lvl, entity: bat.firstId,
        color: SF_C.green, w: bw === null ? null : Math.abs(bw), rev: bw !== null && bw > 0 }, ...devs];
    }
    // On the very first render the element does not have its width yet (its styles are not applied): we draw with 600 px then
    // redraw once, otherwise a phone would first see the "wide screen" layout.
    const W = this.getBoundingClientRect().width || 600, NODE = 92;
    if (!this.getBoundingClientRect().width && !this._retry) { this._retry = true; requestAnimationFrame(() => { this._lastHtml = null; this._schedule(); }); }
    const narrow = W < 520;
    let H, pts;
    if (narrow) {
      // Solar stays above the core (as on wide screens); the grid is beside it. Without solar, the core moves up.
      const cols = devs.length <= 2 ? devs.length || 1 : 3, rows = Math.ceil(devs.length / cols), cy = hasSolar ? 165 : 100, top = cy + 105;
      H = top + (devs.length ? rows * 92 + 10 : 0) + 10;
      const py = (px) => (px / H) * 100;
      pts = { solar: [50, py(45)], grid: [83, py(cy)], core: [50, py(cy)] };
      devs.forEach((d, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        pts[`d${i}`] = [cols === 1 ? 50 : cols === 2 ? 30 + col * 40 : 17 + col * 33, py(top + 40 + row * 92)];
      });
    } else {
      const PAD_PX = 44, maxCols = Math.max(1, Math.min(3, Math.floor((W * 0.4) / NODE)));
      const cols = Math.max(1, Math.min(maxCols, Math.ceil(devs.length / 4)));
      const perCol = Array.from({ length: cols }, (_, k) => devs.filter((_, i) => i % cols === k).length);
      H = Math.max(260, Math.max(1, ...perCol) * NODE + PAD_PX * 2 - 20);
      const pad = (PAD_PX / H) * 100, XS = { 1: [88], 2: [72, 91], 3: [63, 78, 93] }[cols];
      // The more device columns, the more the core (with solar and grid) shifts left and gets closer
      // to the injection: [x of the core, x of the grid] — the freed space goes to the devices.
      const [cx, gx] = { 1: [50, 16], 2: [42, 14], 3: [35, 12] }[cols];
      pts = { solar: [cx, Math.max(pad, 11)], grid: [gx, 50], core: [cx, 50] };
      devs.forEach((d, i) => {
        const col = i % cols, row = Math.floor(i / cols), m = perCol[col];
        pts[`d${i}`] = [XS[col], m === 1 ? 50 : pad + (row * (100 - 2 * pad)) / (m - 1)];
      });
    }

    // Coordinates are in % of the frame; the SVG uses a 100x56.25 viewBox (16/9).
    const Y = (y) => (y * 56.25) / 100;
    const line = (a, b, w, color, rev) => {
      const [x1, y1] = pts[a], [x2, y2] = pts[b];
      const mx = (x1 + x2) / 2, my = (Y(y1) + Y(y2)) / 2;
      const d = narrow && /^d/.test(b) ? `M${x1} ${Y(y1)} C${x1} ${my} ${x2} ${my} ${x2} ${Y(y2)}`
        : `M${x1} ${Y(y1)} C${mx} ${Y(y1)} ${mx} ${Y(y2)} ${x2} ${Y(y2)}`;
      const on = w !== null && Math.abs(w) > 20;
      return `<path class="ln bg" d="${this.esc(d)}" vector-effect="non-scaling-stroke"/>` +
        (on ? `<path class="ln fx ${this.esc(rev ? "rev" : "")}" d="${this.esc(d)}" stroke="${this.esc(color)}" style="--d:${this.esc(this._dur(w))};filter:drop-shadow(0 0 2px ${this.esc(color)})" vector-effect="non-scaling-stroke"/>` : "");
    };
    let svg = (hasSolar ? line("solar", "core", solar, SF_C.amber) : "") + line("grid", "core", grid, exporting ? SF_C.green : "var(--sf-orange)", exporting);
    const nodes = [];
    devs.forEach((d, i) => {
      const w = d.__bat ? d.w : this.watts(d.entity);
      svg += line("core", `d${i}`, w, d.color || SF_C.cyan, !!d.rev);
      nodes.push(this._node(pts[`d${i}`], d.name, d.icon, w, d.color || SF_C.cyan, d.entity));
    });
    if (hasSolar) nodes.push(this._node(pts.solar, this.t("common.solar"), "mdi:solar-power-variant", solar, SF_C.amber, c.solar));
    nodes.push(this._node(pts.grid, exporting ? this.t("reactor.export") : this.t("common.grid"), "mdi:transmission-tower", grid === null ? null : Math.abs(grid), exporting ? SF_C.green : "var(--sf-orange)", c.grid));

    const fossil = this.num(c.fossil), price = this.num(c.price);
    // Footer: only the indicators whose entities are configured.
    const foot = [
      (hasSolar || hasBat) && `<div><div class="lbl">${this.t(hasSolar ? "Autonomie solaire" : "Autonomie")}</div><div class="v" style="color:${this.esc(cc)}">${autonomy === null ? "—" : Math.round(autonomy) + " %"}</div></div>`,
      c.fossil && `<div class="click" data-e="${this.esc(c.fossil)}"><div class="lbl">${this.t("reactor.fossil_grid_share")}</div><div class="v">${fossil === null ? "—" : this.nf(fossil, 0) + " %"}</div></div>`,
      c.price && `<div class="click" data-e="${this.esc(c.price)}"><div class="lbl">${this.t("reactor.live_cost")}</div><div class="v">${price === null || grid === null ? "—" : this.nf((Math.max(grid, 0) / 1000) * price, 2) + " €/h"}</div></div>`,
    ].filter(Boolean);
    return this.frame(this.t("reactor.energy"), `${exporting ? this.t("reactor.exporting_surplus") : hasSolar && solar > 50 ? this.t("reactor.solar_active") : this.t("reactor.grid")}${hidden ? ` · ${this.t("reactor.n_idle", { n: hidden })}` : ""}${extra ? ` · ${this.t("reactor.n_more", { n: extra })}` : ""}`, `
      <div class="stage" style="${this.esc(narrow ? `aspect-ratio:auto;height:${H}px` : `min-height:${H}px`)}">
        <svg viewBox="0 0 100 56.25" preserveAspectRatio="none">${svg}</svg>
        <div class="core" style="--cc:${this.esc(cc)};left:${this.esc(pts.core[0])}%;top:${this.esc(pts.core[1])}%"><div class="r r1"></div><div class="r r2"></div><div class="r r3"></div><div class="orb"></div>
          <div class="txt"><div><b>${this.kw(home)}</b><span>${this.t("reactor.home")}</span></div></div></div>
        ${nodes.join("")}
      </div>
      ${foot.length ? `<div class="foot" style="grid-template-columns:repeat(${this.esc(foot.length)},minmax(0,1fr))">${foot.join("")}</div>` : ""}`);
  }
  _node([x, y], name, icon, w, color, id) {
    const idle = w === null || Math.abs(w) < 20;
    return `<div class="node click ${this.esc(idle ? "idle" : "")}" data-e="${this.esc(id)}" style="left:${this.esc(x)}%;top:${this.esc(y)}%;color:${this.esc(color)}">
      <div class="ic">${this.icon(icon, 22)}</div><div class="n">${this.esc(name)}</div><div class="w">${this.kw(w)}</div></div>`;
  }
  getCardSize() { return 7; }
  // Sections view: this card may take half a section or more, and fills the height of its cell.
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 8, min_rows: 6 }; }
}

