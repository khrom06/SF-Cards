/* ===================================================================== HOST */
/*
 * Monitoring of a computer / server: processor, graphics card and memory as three animated gauges, then video memory, disk and swap bars,
 * network traffic with a live curve, and a footer (containers, Wi-Fi signal, load). It only displays states already in Home Assistant
 * (any exporter works: MQTT discovery script, System Monitor, Glances, Proxmox…); nothing is computed behind your back.
 *
 * type: custom:sf-host-card
 * title: Workstation
 * online: binary_sensor.pc_online      # optional; without it the host is "offline" when no measurement is available
 * cpu: sensor.pc_cpu                   cpu_temp: sensor.pc_cpu_temp
 * gpu: sensor.pc_gpu                   gpu_temp: sensor.pc_gpu_temp     gpu_power: sensor.pc_gpu_power
 * gpu_vram: sensor.pc_vram_percent     ram: sensor.pc_ram_percent       ram_used: sensor.pc_ram_gb
 * swap: sensor.pc_swap                 disk: sensor.pc_disk             disk_free: sensor.pc_disk_free
 * net_rx: sensor.pc_rx                 net_tx: sensor.pc_tx             # kB/s (B/s, MB/s and Mbit/s units are converted)
 * wifi: sensor.pc_wifi                 containers: sensor.pc_containers   load: sensor.pc_load   uptime: sensor.pc_uptime  # uptime in hours
 * power: sensor.pc_power           energy_total: sensor.pc_energy    power_estimate: true   # total draw (W) and energy counter (kWh); "≈" marks an estimate
 * warn: 75   crit: 90                  temp_warn: 75   temp_crit: 88     # colour thresholds (percent / °C)
 */
const SF_HOST_ON = ["on", "online", "home", "connected", "true", "up"];
class SfHostCard extends SfBase {
  defaults() { return { warn: 75, crit: 90, temp_warn: 75, temp_crit: 88 }; }
  _gauges() {
    const c = this._config;
    return [
      c.cpu && { id: "cpu", lbl: "CPU", e: c.cpu, sub: [[c.cpu_temp, "°C"]], col: SF_C.cyan, ic: "mdi:cpu-64-bit" },
      c.gpu && { id: "gpu", lbl: "GPU", e: c.gpu, sub: [[c.gpu_temp, "°C"], [c.gpu_power, "W"]], col: "var(--sf-auto)", ic: "mdi:expansion-card" },
      c.ram && { id: "ram", lbl: this.t("host.memory"), e: c.ram, sub: [[c.ram_used, "GB"]], col: SF_C.green, ic: "mdi:memory" },
    ].filter(Boolean);
  }
  layoutKey(w) { return this.balance(this._gauges().length, 118, 10, w); }
  connectedCallback() { super.connectedCallback(); }
  // Level colour: normal accent, amber from `warn`, red from `crit` (temperatures use their own thresholds).
  _tone(v, accent, temp) {
    const c = this._config, w = Number(temp ? c.temp_warn : c.warn), k = Number(temp ? c.temp_crit : c.crit);
    return v === null ? SF_C.grey : isFinite(k) && v >= k ? SF_C.red : isFinite(w) && v >= w ? SF_C.amber : accent;
  }
  _isOnline() {
    const c = this._config;
    if (c.online) { const s = this.st(c.online); return !!s && SF_HOST_ON.includes(String(s.state).toLowerCase()); }
    return ["cpu", "gpu", "ram", "disk"].some((k) => c[k] && this.num(c[k]) !== null);
  }
  // Rate in kB/s whatever the declared unit.
  _kbps(id) {
    const n = this.num(id); if (n === null) return null;
    const u = this.unit(id).toLowerCase().replace(/\s/g, "");
    const f = { "b/s": 1 / 1024, "kb/s": 1, "mb/s": 1024, "gb/s": 1048576, "kbit/s": 1 / 8, "mbit/s": 128, "gbit/s": 131072 }[u];
    return n * (f === undefined ? 1 : f);
  }
  _rate(k) { return k === null ? "—" : k >= 1024 ? `${this.nf(k / 1024, k >= 10240 ? 0 : 1)} MB/s` : `${this.nf(k, k >= 100 ? 0 : 1)} kB/s`; }
  _uptime(h) { if (h === null) return ""; const d = Math.floor(h / 24), r = Math.floor(h % 24); return d > 0 ? `${d} d ${r} h` : `${r} h`; }
  // Short in-memory history of the traffic (the card only keeps what it saw since the page was opened).
  _track(rx, tx) {
    const now = Date.now(), h = this._hist || (this._hist = { t: 0, rx: [], tx: [] });
    if (rx === null && tx === null) return h;
    if (now - h.t >= 4000) { h.t = now; h.rx.push(rx ?? 0); h.tx.push(tx ?? 0); if (h.rx.length > 90) { h.rx.shift(); h.tx.shift(); } }
    return h;
  }
  css() {
    return `
      .state > span:not(.pill) { text-transform:none; letter-spacing:.06em; }
      .state { display:flex; align-items:center; gap:8px; margin:-4px 0 10px; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:${SF_C.dim}; }
      .state .pill { padding:2px 9px; border-radius:10px; border:1px solid currentColor; font-family:Orbitron,sans-serif; letter-spacing:.14em; }
      .gauges { display:grid; gap:10px; }
      .g { position:relative; text-align:center; padding:8px 4px 6px; border-radius:12px; background:rgb(var(--sf-cyan-rgb) / .035); border:1px solid rgb(var(--sf-cyan-rgb) / .1); }
      .g .dial { position:relative; width:100%; max-width:150px; aspect-ratio:1; margin:0 auto; }
      .g svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
      .g .trk { fill:none; stroke:rgb(var(--sf-fg-rgb) / .08); stroke-width:6; stroke-linecap:round; }
      .g .val { fill:none; stroke-width:6; stroke-linecap:round; transition:stroke-dasharray .8s ease, stroke .4s; filter:drop-shadow(0 0 4px currentColor); }
      .g .tick { fill:none; stroke:rgb(var(--sf-fg-rgb) / .22); stroke-width:1.2; stroke-dasharray:.6 2.9; }
      .g .halo { fill:none; stroke:currentColor; stroke-width:.7; stroke-dasharray:1.5 4; opacity:.35; transform-origin:50% 50%; animation:spin 24s linear infinite; }
      @keyframes spin { to { transform:rotate(360deg); } }
      .g .mid { position:absolute; inset:0; display:grid; place-content:center; text-align:center; pointer-events:none; }
      .g .mid b { font-family:Orbitron,sans-serif; font-weight:700; font-size:clamp(18px, 3.4vw, 26px); color:var(--sf-strong); text-shadow:0 0 10px var(--sf-halo); }
      .g .mid b i { font-style:normal; font-size:.5em; opacity:.7; margin-left:1px; }
      .g .mid span { font-size:9px; letter-spacing:.22em; color:${SF_C.dim}; text-transform:uppercase; margin-top:2px; }
      .g .chips { display:flex; justify-content:center; flex-wrap:wrap; gap:4px; margin-top:4px; min-height:18px; }
      .chip { font-size:10px; padding:1px 8px; border-radius:10px; border:1px solid currentColor; background:rgb(var(--sf-fg-rgb) / .03); }
      .bars { display:grid; gap:9px; margin-top:12px; }
      .bar .top { display:flex; justify-content:space-between; align-items:baseline; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:${SF_C.dim}; margin-bottom:4px; }
      .bar .top b { font-family:Orbitron,sans-serif; font-weight:500; letter-spacing:.04em; font-size:12px; color:var(--sf-strong); text-transform:none; }
      .bar .top small { letter-spacing:.04em; text-transform:none; margin-left:6px; color:${SF_C.dim}; }
      .bar .tr { height:7px; border-radius:4px; background:rgb(var(--sf-fg-rgb) / .08); overflow:hidden; }
      .bar .fi { height:100%; border-radius:4px; background:linear-gradient(90deg, rgb(from currentColor r g b / .35), currentColor); box-shadow:0 0 8px currentColor; transition:width .8s ease; }
      .net { margin-top:12px; padding:8px 10px 6px; border-radius:10px; background:rgb(var(--sf-cyan-rgb) / .035); border:1px solid rgb(var(--sf-cyan-rgb) / .1); }
      .net .rw { display:flex; justify-content:space-between; gap:10px; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:${SF_C.dim}; }
      .net .rw b { font-family:Orbitron,sans-serif; font-weight:500; letter-spacing:.02em; font-size:12px; text-transform:none; white-space:nowrap; }
      .net .rw > span { min-width:0; }
      .net svg { display:block; width:100%; height:40px; margin-top:4px; }
      .net .ln { fill:none; stroke-width:1.6; stroke-linejoin:round; stroke-linecap:round; vector-effect:non-scaling-stroke; }
      .net .ar { stroke:none; opacity:.14; }
      .foot3 { display:grid; gap:8px; margin-top:12px; }
      .foot3 > div { padding:7px 8px; border-radius:8px; text-align:center; background:rgb(var(--sf-cyan-rgb) / .04); border:1px solid rgb(var(--sf-cyan-rgb) / .12); }
      .foot3 .v { font-family:Orbitron,sans-serif; font-size:15px; color:var(--sf-strong); margin-top:3px; }
      .off .g, .off .bars, .off .net, .off .foot3 { filter:grayscale(1); opacity:.45; }
      .off .g .halo { animation:none; }`;
  }
  _gauge(g, w, off) {
    const v = off ? null : this.num(g.e), tone = this._tone(v, g.col), pct = v === null ? 0 : Math.max(0, Math.min(100, v));
    const chips = g.sub.map(([id, u]) => {
      if (!id) return "";
      const n = off ? null : this.num(id), temp = u === "°C", col = temp ? this._tone(n, SF_C.dim, true) : SF_C.dim;
      return `<span class="chip click" data-e="${this.esc(id)}" style="color:${col}">${n === null ? "—" : `${this.nf(n, u === "GB" ? 1 : 0)} ${u}`}</span>`;
    }).join("");
    const arc = `cx="50" cy="50" r="40" pathLength="100" transform="rotate(135 50 50)"`;
    return `<div class="g click" data-e="${this.esc(g.e)}" style="color:${tone}">
      <div class="dial"><svg viewBox="0 0 100 100"><circle class="halo" cx="50" cy="50" r="47"/><circle class="tick" ${arc} r="46" stroke-dasharray=".6 2.9"/>
        <circle class="trk" ${arc} stroke-dasharray="75 100"/><circle class="val" ${arc} stroke="${this.esc(tone)}" stroke-dasharray="${this.esc((pct * 0.75).toFixed(2))} 100"/></svg>
        <div class="mid"><div><b>${v === null ? "—" : this.nf(v, 0)}<i>%</i></b><br><span>${this.esc(g.lbl)}</span></div></div></div>
      <div class="chips">${chips}</div></div>`;
  }
  _bar(label, id, accent, extra, off) {
    const v = off ? null : this.num(id), tone = this._tone(v, accent), pct = v === null ? 0 : Math.max(0, Math.min(100, v));
    return `<div class="bar click" data-e="${this.esc(id)}" style="color:${tone}"><div class="top"><span>${this.esc(label)}</span><span><b>${v === null ? "—" : `${this.nf(v, 0)} %`}</b>${extra ? `<small>${this.esc(extra)}</small>` : ""}</span></div>
      <div class="tr"><div class="fi" style="width:${this.esc(pct.toFixed(1))}%"></div></div></div>`;
  }
  _spark(arr, max, color, area) {
    if (arr.length < 2) return "";
    const W = 200, H = 40, pts = arr.map((v, i) => [(i / (arr.length - 1)) * W, H - 3 - (Math.min(v, max) / max) * (H - 8)]);
    const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    return (area ? `<path class="ar" d="${this.esc(d)} L${W} ${H} L0 ${H} Z" fill="${color}"/>` : "") + `<path class="ln" d="${this.esc(d)}" stroke="${color}"/>`;
  }
  render() {
    const c = this._config, off = !this._isOnline(), gs = this._gauges();
    const w = this.width, cols = this.balance(gs.length, 118, 10, w);
    const up = this.num(c.uptime), rx = off ? null : this._kbps(c.net_rx), tx = off ? null : this._kbps(c.net_tx);
    const bars = [
      c.gpu_vram && this._bar("VRAM", c.gpu_vram, "var(--sf-auto)", "", off),
      c.disk && this._bar(this.t("host.disk"), c.disk, SF_C.cyan, c.disk_free && this.num(c.disk_free) !== null ? this.t("host.free", { v: `${this.nf(this.num(c.disk_free), 0)} ${this.unit(c.disk_free) || "GB"}` }) : "", off),
      c.swap && this._bar("Swap", c.swap, SF_C.amber, "", off),
    ].filter(Boolean);
    let net = "";
    if (c.net_rx || c.net_tx) {
      const h = this._track(rx, tx), mx = Math.max(64, ...h.rx, ...h.tx) * 1.15;
      net = `<div class="net"><div class="rw"><span class="click" data-e="${this.esc(c.net_rx || c.net_tx)}">↓ ${this.esc(this.t("host.down"))} <b style="color:${SF_C.cyan}">${this._rate(rx)}</b></span>
        <span class="click" data-e="${this.esc(c.net_tx || c.net_rx)}">↑ ${this.esc(this.t("host.up_rate"))} <b style="color:${SF_C.amber}">${this._rate(tx)}</b></span></div>
        <svg viewBox="0 0 200 40" preserveAspectRatio="none">${off ? "" : this._spark(h.rx, mx, SF_C.cyan, true) + this._spark(h.tx, mx, SF_C.amber, false)}</svg></div>`;
    }
    const chip = (lbl, id, val) => id ? `<div class="click" data-e="${this.esc(id)}"><div class="lbl">${this.esc(lbl)}</div><div class="v">${off ? "—" : val}</div></div>` : "";
    const wifi = c.wifi ? this.num(c.wifi) : null, ct = c.containers ? this.num(c.containers) : null, ld = c.load ? this.num(c.load) : null;
    const pw = c.power ? this.num(c.power) : null, en = c.energy_total ? this.num(c.energy_total) : null, est = c.power_estimate ? "≈ " : "";
    const foot = [chip(this.t("host.power"), c.power, pw === null ? "—" : `${est}${this.nf(pw, 0)} W`), chip(this.t("host.energy"), c.energy_total, en === null ? "—" : `${est}${this.nf(en, en >= 100 ? 0 : 2)} kWh`), chip(this.t("host.containers"), c.containers, ct === null ? "—" : this.nf(ct, 0)), chip("Wi-Fi", c.wifi, wifi === null ? "—" : `${this.nf(wifi, 0)} dBm`), chip(this.t("host.load"), c.load, ld === null ? "—" : this.nf(ld, 2))].filter(Boolean).join("");
    const nFoot = [c.power, c.energy_total, c.containers, c.wifi, c.load].filter(Boolean).length;
    const pill = `<span class="pill" style="color:${off ? SF_C.grey : SF_C.green}">${this.esc(this.t(off ? "host.offline" : "host.online"))}</span>`;
    const state = `<div class="state">${pill}${!off && up !== null ? `<span>${this.esc(this.t("host.up", { t: this._uptime(up) }))}</span>` : ""}</div>`;
    const body = `${state}<div class="${off ? "off" : ""}">${gs.length ? `<div class="gauges" style="grid-template-columns:repeat(${this.esc(cols)},minmax(0,1fr))">${gs.map((g) => this._gauge(g, w, off)).join("")}</div>` : ""}
      ${bars.length ? `<div class="bars">${bars.join("")}</div>` : ""}${net}${foot ? `<div class="foot3" style="grid-template-columns:repeat(${this.esc(this.balance(nFoot, 130, 8, w))},minmax(0,1fr))">${foot}</div>` : ""}</div>`;
    return this.frame(this.esc(c.title || this.t("host.host")), "", body);
  }
  getCardSize() { return 7; }
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 4, min_rows: 5 }; }
}

