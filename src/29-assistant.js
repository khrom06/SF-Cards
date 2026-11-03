/* =============================================================== ASSISTANT */
/*
 * Read-only state of an assistant (voice or chat): its current phase (idle / listening / thinking / running / replying /
 * error), the last request, the current action, its result and the last reply, + optional action buttons. Works right away with
 * Home Assistant Assist satellites (`assist_satellite.*`: idle / listening / processing / responding) and with any entity whose
 * states you map (`phases`). The card interprets nothing: it shows what the entities contain.
 *
 * type: custom:sf-assistant-card
 * name: Assistant
 * state: assist_satellite.kitchen          # phase (entity whose state describes the activity)
 * phases: { idle: idle, busy: thinking }   # entity state -> phase (idle | listening | thinking | acting | speaking | error), optional
 * request: sensor.assistant_last_request   # optional text entities (their state is displayed)
 * action: sensor.assistant_current_action
 * result: sensor.assistant_last_result
 * reply: sensor.assistant_last_reply
 * actions: [{ name: Stop, icon: "mdi:stop", service: script.assistant_stop, confirm: "Stop?" }]
 */
const SF_AS_PH = { idle: ["Au repos", "mdi:sleep", "grey"], listening: ["À l'écoute", "mdi:ear-hearing", "cyan"], thinking: ["Réfléchit", "mdi:brain", "amber"],
  acting: ["Exécute", "mdi:cog-play", "amber"], speaking: ["Répond", "mdi:message-text", "green"], error: ["Erreur", "mdi:alert-circle", "red"] };
const SF_AS_MAP = { idle: "idle", off: "idle", standby: "idle", unavailable: "idle", unknown: "idle", listening: "listening", recording: "listening", wake_word: "listening",
  processing: "thinking", thinking: "thinking", responding: "speaking", speaking: "speaking", playing: "speaking", acting: "acting", running: "acting", executing: "acting",
  working: "acting", on: "acting", error: "error", failed: "error", problem: "error" };
class SfAssistantCard extends SfBase {
  defaults() { return { phases: {}, actions: [] }; }
  _phase() {
    const st = this.st(this._config.state), c = this._config;
    if (!st) return "idle";
    const s = String(st.state).toLowerCase(), own = c.phases && typeof c.phases === "object" && !Array.isArray(c.phases) ? c.phases : {};
    const p = Object.prototype.hasOwnProperty.call(own, st.state) ? own[st.state] : Object.prototype.hasOwnProperty.call(own, s) ? own[s] : SF_AS_MAP[s];
    return SF_AS_PH[p] ? p : "idle";
  }
  _ago(st) {
    const lc = st && Date.parse(st.last_changed || st.last_updated || ""); if (!isFinite(lc)) return "";
    const m = Math.max(0, Math.round((Date.now() - lc) / 60000));
    return m < 1 ? this.t("à l'instant") : m < 60 ? this.t("il y a {n} min", { n: m }) : m < 2880 ? this.t("il y a {n} h", { n: Math.round(m / 60) }) : "";
  }
  connectedCallback() { super.connectedCallback(); clearInterval(this._tk); this._tk = setInterval(() => this._schedule(), 60000); }   // the displayed age advances even without a hass update
  disconnectedCallback() { super.disconnectedCallback(); clearInterval(this._tk); this._tk = null; }
  css() {
    return `
      .as { display:flex; align-items:center; gap:14px; padding:2px 2px 12px; }
      .orb { width:46px; height:46px; border-radius:50%; display:grid; place-items:center; flex:none; color:var(--pc); border:1.5px solid var(--pc);
        background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.14), rgba(0,0,0,.4)); box-shadow:0 0 14px -2px var(--pc), inset 0 0 12px -4px var(--pc); }
      .orb.live { animation: orbp 1.6s ease-in-out infinite; }
      @keyframes orbp { 50% { box-shadow:0 0 24px 0 var(--pc), inset 0 0 14px -2px var(--pc); } }
      .ph { font-family:Orbitron,sans-serif; font-size:15px; letter-spacing:.06em; color:var(--pc); }
      .ph small { display:block; font-family:'B612 Mono',monospace; font-size:10px; letter-spacing:0; color:${SF_C.dim}; margin-top:2px; }
      .ln { display:grid; grid-template-columns: 74px 1fr; gap:8px; padding:6px 4px; border-top:1px solid rgba(0,229,255,.08); cursor:pointer; }
      .ln .k { font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:${SF_C.dim}; padding-top:2px; }
      .ln .v { min-width:0; font-size:12px; overflow-wrap:anywhere; color:${SF_C.text}; }
      .ln .v small { display:block; font-size:9.5px; color:${SF_C.dim}; margin-top:2px; }
      .acts { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
      .acts .btn { display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border-radius:8px; cursor:pointer; font-size:11px; color:${SF_C.cyan};
        border:1px solid rgba(0,229,255,.3); background:rgba(0,229,255,.05); }
      .acts .btn.armed { color:${SF_C.red}; border-color:${SF_C.red}; }`;
  }
  render() {
    const c = this._config, ph = this._phase(), P = SF_AS_PH[ph], col = SF_C[P[2]] || SF_C.cyan, stE = this.st(c.state);
    const rows = [["request", "Demande"], ["action", "Action"], ["result", "Résultat"], ["reply", "Réponse"]].filter(([k]) => typeof c[k] === "string" && c[k]).map(([k, lbl]) => {
      const s = this.st(c[k]), v = s && !["unavailable", "unknown", ""].includes(s.state) ? String(s.state).slice(0, 300) : "—";
      return `<div class="ln" data-e="${this.esc(c[k])}"><span class="k">${this.esc(this.t(lbl))}</span><span class="v">${this.esc(v)}${s && v !== "—" ? `<small>${this.esc(this._ago(s))}</small>` : ""}</span></div>`; }).join("");
    const acts = (Array.isArray(c.actions) ? c.actions : []).filter((a) => a && typeof a.service === "string").slice(0, 6).map((a) => {
      const call = this.call(a.service, a.data && typeof a.data === "object" ? a.data : {}, a.confirm ? String(a.confirm) : "");
      return call ? `<span class="btn" role="button" ${call}>${a.icon ? this.icon(a.icon, 14) : ""}${this.esc(a.name || a.service)}</span>` : ""; }).join("");
    return this.frame(this.esc(c.name || this.t("Assistant")), "", `<div class="as" style="--pc:${col}"><span class="orb ${ph === "thinking" || ph === "acting" || ph === "listening" ? "live" : ""}">${this.icon(P[1], 24, col)}</span>
      <span class="ph">${this.esc(this.t(P[0]))}<small>${this.esc(stE ? this._ago(stE) : "")}</small></span></div>${rows}${acts ? `<div class="acts">${acts}</div>` : ""}`);
  }
  getCardSize() { return 3; }
}

