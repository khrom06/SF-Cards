/* =================================================================== MEDIA */
/*
 * What is playing, and the remote: artwork, title, artist, progress, previous / play / next, volume and mute. With several players, the one
 * that plays is shown and the others are one tap away. Only the buttons the player supports are drawn.
 *
 * type: custom:sf-media-card
 * title: Music
 * entity: media_player.living_room            # one player…
 * entities: [media_player.a, media_player.b]  # …or several (chips to switch)
 * artwork: true        volume: true
 */
const SF_MEDIA_F = { pause: 1, seek: 2, vol: 4, mute: 8, prev: 16, next: 32, on: 128, off: 256, step: 1024, play: 16384 };
class SfMediaCard extends SfBase {
  defaults() { return { artwork: true, volume: true }; }
  static getStubConfig() { return {}; }
  connectedCallback() { super.connectedCallback(); if (!this._mt) this._mt = setInterval(() => this._tickProg(), 1000); }
  disconnectedCallback() { super.disconnectedCallback(); if (this._mt) { clearInterval(this._mt); this._mt = null; } }
  layoutKey(w) { return w < 340 ? "s" : "m"; }
  _players() {
    const c = this._config, all = [c.entity, ...(Array.isArray(c.entities) ? c.entities : c.entities ? [c.entities] : [])];
    return [...new Set(all.filter((x) => typeof x === "string" && SF_EID.test(x)))].slice(0, 8);
  }
  _cur() {
    const p = this._players(), state = (x) => (this.st(x) || {}).state;
    if (this._sel && p.includes(this._sel)) return this._sel;
    return p.find((x) => state(x) === "playing") || p.find((x) => ["paused", "buffering", "on"].includes(state(x))) || p[0] || "";
  }
  _pos(s) {
    const a = s.attributes, d = Number(a.media_duration);
    if (!(d > 0) || a.media_position === null || a.media_position === undefined || !isFinite(Number(a.media_position))) return null;
    let p = Number(a.media_position); const at = Date.parse(a.media_position_updated_at || "");
    if (s.state === "playing" && isFinite(at)) p += (Date.now() - at) / 1000;
    return { p: Math.max(0, Math.min(d, p)), d };
  }
  _clock(sec) {
    sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(s).padStart(2, "0")}`;
  }
  // The progress bar moves every second without rewriting the card (the artwork and the animations are left alone).
  _tickProg() {
    const r = this.shadowRoot, s = r && this.st(this._cur()); if (!s || s.state !== "playing") return;
    const q = this._pos(s), bar = r.querySelector(".pg i"), t0 = r.querySelector(".t0"); if (!q || !bar || !t0) return;
    bar.style.width = `${((q.p / q.d) * 100).toFixed(1)}%`; t0.textContent = this._clock(q.p);
  }
  css() {
    return `
      .np { display:flex; align-items:center; gap:14px; }
      .art { position:relative; flex:none; width:96px; height:96px; border-radius:10px; overflow:hidden; display:grid; place-items:center; color:${SF_C.dim};
        background:rgb(var(--sf-cyan-rgb) / .06); border:1px solid rgb(var(--sf-cyan-rgb) / .25); }
      .s .art { width:64px; height:64px; }
      .art img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
      .play .art { box-shadow:0 0 16px rgb(var(--sf-cyan-rgb) / .25); }
      .inf { flex:1; min-width:0; }
      .inf > div { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .ti { font-size:15px; color:var(--sf-strong); }
      .ar { margin-top:4px; color:${SF_C.text}; }
      .al { margin-top:4px; font-size:11px; color:${SF_C.dim}; }
      .pr { display:flex; align-items:center; gap:10px; margin-top:14px; font-size:11px; color:${SF_C.dim}; }
      .pg { flex:1; height:6px; border-radius:3px; background:rgb(var(--sf-cyan-rgb) / .12); overflow:hidden; }
      .pg i { display:block; height:100%; background:${SF_C.cyan}; box-shadow:0 0 8px rgb(var(--sf-cyan-rgb) / .6); transition:width 1s linear; }
      .ctl { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px 16px; margin-top:14px; }
      .ctl > div { display:flex; align-items:center; gap:8px; min-width:0; }
      .ctl .vg { flex:0 1 auto; }
      .ctl .btn { flex:none; width:44px; min-height:44px; padding:0; }
      .ctl .btn.main { width:56px; border-color:${SF_C.cyan}; background:rgb(var(--sf-cyan-rgb) / .16); color:var(--sf-strong); }
      .s .ctl .btn { width:40px; } .s .ctl .btn.main { width:48px; }
      .s .vol, .s .vv { display:none; }
      .vol { flex:0 1 110px; width:110px; min-width:30px; height:6px; border-radius:3px; background:rgb(var(--sf-cyan-rgb) / .12); overflow:hidden; }
      .vol i { display:block; height:100%; background:${SF_C.dim}; }
      .vv { flex:none; min-width:36px; text-align:end; font-size:11px; color:${SF_C.dim}; }
      .chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:14px; }
      .chips .btn { min-height:36px; cursor:pointer; }
      .chips .btn i { width:7px; height:7px; border-radius:50%; background:${SF_C.grey}; }
      .chips .btn.pl i { background:${SF_C.green}; box-shadow:0 0 6px ${SF_C.green}; }`;
  }
  render() {
    const c = this._config, ps = this._players(), id = this._cur(), s = this.st(id), ok = this.ok(id), a = (s && s.attributes) || {};
    const name = (p) => { const x = this.st(p); return String((x && x.attributes.friendly_name) || p.split(".")[1].replace(/_/g, " ")); };
    const active = ok && ["playing", "paused", "buffering"].includes(s.state), playing = ok && s.state === "playing", f = Number(a.supported_features) || 0, has = (k) => (f & SF_MEDIA_F[k]) !== 0;
    const stateTxt = !ok ? this.t("common.unavailable") : s.state === "off" || s.state === "standby" ? this.t("common.off") : this.t("common.idle_2");
    const ti = active || a.media_title ? String(a.media_title || a.app_name || a.source || name(id)) : this.t("media.nothing");
    const ar = active || a.media_title ? String(a.media_artist || a.media_series_title || "") : stateTxt, al = String((active && (a.media_album_name || a.app_name || a.source)) || "");
    const pic = c.artwork !== false && active ? sfSafeUrl(a.entity_picture) : "", q = active ? this._pos(s) : null;
    const b = (svc, ic, key, data, cls = "") => `<span class="btn ${cls}" title="${this.esc(this.t(key))}" ${this.call(`media_player.${svc}`, { entity_id: id, ...(data || {}) })}>${this.icon(ic, cls ? 26 : 20)}</span>`;
    const ctl = [], vg = [];
    if (ok) {
      if (has("prev")) ctl.push(b("media_previous_track", "mdi:skip-previous", "media.prev"));
      if (has("play") || has("pause")) ctl.push(b("media_play_pause", playing ? "mdi:pause" : "mdi:play", playing ? "media.pause" : "media.play", null, "main"));
      else if (!active && has("on")) ctl.push(b("turn_on", "mdi:power", "media.power", null, "main"));
      if (has("next")) ctl.push(b("media_next_track", "mdi:skip-next", "media.next"));
      if (c.volume !== false && (has("vol") || has("step"))) {
        const v = Number(a.volume_level), muted = a.is_volume_muted === true;
        vg.push(b("volume_down", "mdi:volume-minus", "media.vol_down"));
        if (isFinite(v) && a.volume_level !== null && a.volume_level !== undefined) vg.push(`<div class="vol"><i style="width:${Math.round(Math.max(0, Math.min(1, v)) * 100)}%"></i></div><span class="vv">${muted ? "—" : `${Math.round(v * 100)} %`}</span>`);
        vg.push(b("volume_up", "mdi:volume-plus", "media.vol_up"));
        if (has("mute")) vg.push(b("volume_mute", muted ? "mdi:volume-off" : "mdi:volume-high", muted ? "media.unmute" : "media.mute", { is_volume_muted: !muted }));
      }
    }
    const chips = ps.length > 1 ? `<div class="chips">${ps.map((p, i) => `<span data-i="${i}" class="btn tile ${p === id ? "on" : ""} ${(this.st(p) || {}).state === "playing" ? "pl" : ""}" data-p="${this.esc(p)}"><i></i>${this.esc(name(p))}</span>`).join("")}</div>` : "";
    return this.frame(this.esc(c.title || this.t("media.title")), id ? this.esc(name(id)) : "", `<div class="${this.layoutKey(this.width || 400)} ${playing ? "play" : ""}">
      <div class="np"><div class="art click" data-e="${this.esc(id)}">${pic ? `<img src="${this.esc(pic)}" alt="">` : this.icon(a.icon || (a.device_class === "tv" ? "mdi:television" : "mdi:music"), 34)}</div>
        <div class="inf"><div class="ti">${this.esc(ti)}</div><div class="ar">${this.esc(ar)}</div>${al && al !== ti ? `<div class="al">${this.esc(al)}</div>` : ""}</div></div>
      ${q ? `<div class="pr"><span class="t0">${this._clock(q.p)}</span><div class="pg"><i style="width:${((q.p / q.d) * 100).toFixed(1)}%"></i></div><span>${this._clock(q.d)}</span></div>` : ""}
      ${ctl.length || vg.length ? `<div class="ctl">${ctl.length ? `<div>${ctl.join("")}</div>` : ""}${vg.length ? `<div class="vg">${vg.join("")}</div>` : ""}</div>` : ""}${chips}</div>`);
  }
  afterRender() {
    this.shadowRoot.querySelectorAll("[data-p]").forEach((el) => el.addEventListener("click", () => { this._sel = el.dataset.p; this._lastHtml = null; this._schedule(); }));
  }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 12, rows: "auto", min_columns: 6 }; }
}
