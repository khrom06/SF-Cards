/* ------------------------------------------------------------------- RADAR */
/*
 * Trois anneaux, trois sources, AUCUNE fusion (principe de conception) :
 *   outer ring   : person.*            -> at home or not (network/GPS), without room
 *   middle ring  : Frigate (face)      -> last camera where the person was recognised
 *   inner ring   : room sensors        -> occupancy, WITHOUT identity
 * The same person appears on two distinct rings: the card never deduces
 * "Alice is in the living room" by crossing two sources.
 *
 * type: custom:sf-radar-card
 * people: [{ name, person, face, color }]   # face = sensor.<x>_last_camera
 * rooms:  [{ label, entity }]               # binary_sensor occupation
 */
class SfRadarCard extends SfBase {
  defaults() { return { people: [], rooms: [] }; }
  css() {
    return `
      .wrap { display:grid; grid-template-columns: minmax(200px, 300px) 1fr; gap:14px; align-items:center; }
      @media (max-width: 520px) { .wrap { grid-template-columns: 1fr; } }
      .radar { position:relative; width:100%; aspect-ratio:1; }
      .radar svg { position:absolute; inset:0; width:100%; height:100%; }
      .sweep { position:absolute; inset:4%; border-radius:50%;
        background: conic-gradient(from 0deg, rgb(var(--sf-cyan-rgb) / .32), rgb(var(--sf-cyan-rgb) / 0) 22%, transparent 100%);
        animation: spin 4.5s linear infinite; mask: radial-gradient(circle, #000 69%, transparent 70%); }
      @keyframes spin { to { transform: rotate(360deg); } }
      .ringl { fill:none; stroke:rgb(var(--sf-cyan-rgb) / .22); stroke-dasharray:3 4; }
      .cross { stroke:rgb(var(--sf-cyan-rgb) / .12); }
      .rl { font-size:2.6px; fill:${SF_C.dim}; letter-spacing:.18em; }
      .blip { transition: opacity .5s; }
      .legend .row { display:flex; justify-content:space-between; gap:10px; padding:5px 0;
        border-bottom:1px solid rgb(var(--sf-cyan-rgb) / .08); font-size:12px; }
      .legend h4 { margin:10px 0 4px; font-family:Orbitron,sans-serif; font-weight:500; font-size:10px;
        letter-spacing:.18em; color:${SF_C.cyan}; }
      .legend h4:first-child { margin-top:0; }
      .rule { margin-top:10px; font-size:10px; color:${SF_C.dim}; }`;
  }
  render() {
    const c = this._config;
    const R = { outer: 46, mid: 32, inner: 18 };
    const pos = (radius, i, n, offset) => {
      const a = (offset + (i / Math.max(n, 1)) * 360) * Math.PI / 180;
      return [50 + radius * Math.cos(a), 50 + radius * Math.sin(a)];
    };
    const blip = (x, y, col, on, label) => `<g class="blip" opacity="${this.esc(on ? 1 : 0.28)}">
        <circle cx="${this.esc(x)}" cy="${this.esc(y)}" r="${this.esc(on ? 2.6 : 1.8)}" fill="${this.esc(col)}" style="filter:drop-shadow(0 0 2px ${this.esc(col)})"/>
        ${on ? `<circle cx="${this.esc(x)}" cy="${this.esc(y)}" r="2.6" fill="none" stroke="${this.esc(col)}" stroke-width=".6"><animate attributeName="r" from="2.6" to="7" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" from=".8" to="0" dur="1.8s" repeatCount="indefinite"/></circle>` : ""}
        <text x="${this.esc(x)}" y="${this.esc(y - 3.8)}" text-anchor="middle" font-size="3.2" fill="${this.esc(on ? "#fff" : SF_C.grey)}">${this.esc(label)}</text></g>`;
    const np = c.people.length, nr = c.rooms.length;
    let svg = `<circle class="ringl" cx="50" cy="50" r="${this.esc(R.outer)}"/><circle class="ringl" cx="50" cy="50" r="${this.esc(R.mid)}"/>
      <circle class="ringl" cx="50" cy="50" r="${this.esc(R.inner)}"/>
      <line class="cross" x1="50" y1="2" x2="50" y2="98"/><line class="cross" x1="2" y1="50" x2="98" y2="50"/>
      <text class="rl" x="50" y="${this.esc(50 - R.outer - 1.2)}" text-anchor="middle">${this.t("radar.network")}</text>
      <text class="rl" x="50" y="${this.esc(50 - R.mid - 1.2)}" text-anchor="middle">${this.t("radar.face")}</text>
      <text class="rl" x="50" y="${this.esc(50 - R.inner - 1.2)}" text-anchor="middle">${this.t("radar.rooms")}</text>
      <circle cx="50" cy="50" r="2" fill="${SF_C.cyan}"/>`;
    const peopleRows = [], faceRows = [], roomRows = [];
    c.people.forEach((p, i) => {
      const col = p.color || SF_C.cyan;
      if (p.person) {  // no person entity (e.g. a person without a phone): absent from this ring
        const home = this.st(p.person) && this.st(p.person).state === "home";
        const [x1, y1] = pos(R.outer, i, np, -60);
        svg += blip(x1, y1, col, home, p.name);
        peopleRows.push(`<div class="row click" data-e="${this.esc(p.person)}"><span style="color:${this.esc(col)}">${this.esc(p.name)}</span><span>${!this.ok(p.person) ? "—" : home ? this.t("common.home") : this.t("common.away")}</span></div>`);
      }
      if (p.face) {
        const cam = this.ok(p.face) ? this.st(p.face).state : null;
        const seen = cam && cam.toLowerCase() !== "unknown";
        const [x2, y2] = pos(R.mid, i, np, 20);
        svg += blip(x2, y2, col, seen, p.name);
        faceRows.push(`<div class="row click" data-e="${this.esc(p.face)}"><span style="color:${this.esc(col)}">${this.esc(p.name)}</span><span>${seen ? `${this.esc(cam)} · ${this.ago(p.face)}` : this.t("radar.never_seen")}</span></div>`);
      }
    });
    c.rooms.forEach((r, i) => {
      const on = this.st(r.entity) && this.st(r.entity).state === "on";
      const [x, y] = pos(R.inner, i, nr, 90);
      svg += blip(x, y, SF_C.amber, on, r.label);
      roomRows.push(`<div class="row click" data-e="${this.esc(r.entity)}"><span>${this.esc(r.label)}</span><span>${!this.ok(r.entity) ? "—" : on ? this.t("radar.occupied") : this.t("radar.empty")}</span></div>`);
    });
    return this.frame(this.t("radar.presence_radar"), this.t("radar.3_independent_sources"),
      `<div class="wrap"><div class="radar"><div class="sweep"></div><svg viewBox="0 0 100 100">${svg}</svg></div>
        <div class="legend"><h4>${this.t("radar.network_gps")}</h4>${peopleRows.join("")}
          <h4>${this.t("radar.frigate_face_last_seen")}</h4>${faceRows.join("") || '<div class="row muted">—</div>'}
          <h4>${this.t("radar.room_sensors_no_identity")}</h4>${roomRows.join("") || '<div class="row muted">—</div>'}
          <div class="rule">${this.t("radar.rings_are_never_cross_referenced_no_posi")}</div></div></div>`);
  }
  getCardSize() { return 6; }
}

