/* ================================================================= CAMERAS */
/*
 * Camera mosaic with a reticle. Still image refreshed every `refresh`
 * seconds (light); a press opens the camera's HA page, with the live stream.
 *
 * type: custom:sf-camera-card
 * refresh: 5
 * cameras: [{ entity, name, motion, persons, review }]
 */
class SfCameraCard extends SfBase {
  defaults() { return { cameras: [], refresh: 5 }; }
  _every() { const n = Number(this._config && this._config.refresh); return isFinite(n) && n > 0 ? Math.min(3600, Math.max(1, n)) : 5; }
  _restart() { clearInterval(this._timer); this._timer = setInterval(() => this._refresh(), this._every() * 1000); }
  setConfig(config) { super.setConfig(config); if (this.isConnected) this._restart(); }
  connectedCallback() { super.connectedCallback(); this._restart(); }
  disconnectedCallback() { super.disconnectedCallback(); clearInterval(this._timer); this._timer = null; }
  afterRender() { this._refresh(); }
  _refresh() {
    if (!this.shadowRoot || document.hidden) return;
    this.shadowRoot.querySelectorAll("img[data-cam]").forEach((img) => {
      const s = this.st(img.dataset.cam);
      const base = s && sfSafeUrl(s.attributes.entity_picture);
      if (!base) return;
      const url = `${base}${base.includes("?") ? "&" : "?"}_t=${Date.now()}`;
      const pre = new Image();
      pre.onload = () => { img.src = url; img.classList.add("ok"); };
      pre.src = url;
    });
  }
  css() {
    return `
      .cams { display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:12px; }
      .cam { position:relative; aspect-ratio:16/9; border-radius:10px; overflow:hidden; background:#000;
        border:1px solid rgb(var(--sf-cyan-rgb) / .25); }
      .cam img { width:100%; height:100%; object-fit:cover; display:block; opacity:0; transition:opacity .4s; filter:saturate(.85) contrast(1.05); }
      .cam img.ok { opacity:1; }
      .cam::before { content:""; position:absolute; inset:0; z-index:1; pointer-events:none;
        background: repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 1px, transparent 1px 3px),
                    radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,.55)); }
      .ov { position:absolute; inset:0; z-index:2; pointer-events:none; padding:10px 12px; display:flex; flex-direction:column; justify-content:space-between; }
      .ov .t, .ov .b { display:flex; justify-content:space-between; align-items:center; gap:8px; }
      .tag { font-family:Orbitron,sans-serif; font-size:11px; letter-spacing:.18em; color:var(--sf-strong); text-shadow:0 0 6px #000, 0 0 8px ${SF_C.cyan}; }
      .rec { font-size:10px; color:${SF_C.red}; letter-spacing:.14em; display:flex; align-items:center; gap:5px; text-shadow:0 0 4px #000; }
      .rec::before { content:""; width:8px; height:8px; border-radius:50%; background:${SF_C.red}; box-shadow:0 0 8px ${SF_C.red}; animation: blink 1s infinite; }
      .pill { font-size:10px; padding:3px 8px; border-radius:10px; background:rgba(0,0,0,.55); border:1px solid rgb(var(--sf-cyan-rgb) / .35); color:${SF_C.text}; }
      .pill.hot { border-color:${SF_C.amber}; color:${SF_C.amber}; }
      .pill.red { border-color:${SF_C.red}; color:${SF_C.red}; }
      .ret { position:absolute; left:50%; top:50%; width:46px; height:46px; transform:translate(-50%,-50%); z-index:2; pointer-events:none; opacity:.55; }
      .ret::before, .ret::after { content:""; position:absolute; background:${SF_C.cyan}; }
      .ret::before { left:50%; top:0; bottom:0; width:1px; } .ret::after { top:50%; left:0; right:0; height:1px; }
      .cam .c { z-index:3; }
      .nofeed { position:absolute; inset:0; display:grid; place-items:center; color:${SF_C.grey}; font-size:11px; letter-spacing:.2em; }`;
  }
  render() {
    const cams = this._config.cameras.map((k) => {
      const s = this.st(k.entity);
      const motion = k.motion && this.st(k.motion) && this.st(k.motion).state === "on";
      const pc = this.num(k.persons);
      const rv = k.review && this.ok(k.review) ? this.st(k.review).state : null;
      return `<div class="cam click" data-e="${this.esc(k.entity)}">
        <div class="nofeed">${s ? this.t("camera.loading") : this.t("camera.camera_unavailable")}</div>
        ${s ? `<img data-cam="${this.esc(k.entity)}" alt="">` : ""}
        <i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i><div class="ret"></div>
        <div class="ov"><div class="t"><span class="tag">${this.esc(k.name)}</span>${s && s.state === "recording" ? `<span class="rec">REC</span>` : `<span class="pill">${s ? this.esc(s.state) : "—"}</span>`}</div>
          <div class="b"><span class="pill ${this.esc(motion ? "hot" : "")}">${motion ? this.t("camera.motion") : this.t("camera.calm")}</span>
            ${pc !== null ? `<span class="pill ${this.esc(pc > 0 ? "hot" : "")}">${this.t("camera.n_person_s", { n: pc })}</span>` : ""}
            ${rv && rv !== "NONE" ? `<span class="pill ${this.esc(rv === "ALERT" ? "red" : "hot")}">${rv === "ALERT" ? this.t("camera.frigate_alert") : this.t("camera.detection")}</span>` : ""}</div></div></div>`;
    }).join("");
    return this.frame(this.t("camera.cameras"), this.t("camera.refreshed_every_n_s_tap_live", { n: this._every() }), `<div class="cams">${cams}</div>`);
  }
  getCardSize() { return 6; }
}

