/* ------------------------------------------------------------------ FULL-SCREEN PANEL (NSPanel, wall tablet) */
/*
 * type: custom:sf-ns-card
 * A screen that changes face depending on the moment (Morning / Day / Evening / Night), designed for a small square screen (NSPanel Pro 480 x 480)
 * but proportional: everything is in "vmin". To be placed alone in a "panel" view. All the configuration comes from the dashboard:
 * no default entity.
 */
const SF_NS_MODES = {
  Matin: { label: "Matin", greet: "Bonjour", a: "#ffb347", bg: "radial-gradient(ellipse at 50% -10%, #3a2347 0%, #14203a 48%, #050b16 100%)" },
  Jour:  { label: "Jour",  greet: "Énergie", a: "var(--sf-cyan)", bg: "radial-gradient(ellipse at 50% -10%, #0e2f52 0%, #07182c 52%, #03080f 100%)" },
  Soir:  { label: "Soir",  greet: "Bonsoir", a: "#b388ff", bg: "radial-gradient(ellipse at 50% -10%, #2b1650 0%, #120a2a 52%, #050310 100%)" },
  Nuit:  { label: "Nuit",  greet: "Veille",  a: "#d9573f", bg: "radial-gradient(ellipse at 50% -10%, #130a0c 0%, #070508 52%, #020204 100%)" },
};
const SF_NS_WX = {
  "clear-night": ["mdi:weather-night", "Nuit claire"], cloudy: ["mdi:weather-cloudy", "Nuageux"], exceptional: ["mdi:alert-circle-outline", "Exceptionnel"],
  fog: ["mdi:weather-fog", "Brouillard"], hail: ["mdi:weather-hail", "Grêle"], lightning: ["mdi:weather-lightning", "Orage"],
  "lightning-rainy": ["mdi:weather-lightning-rainy", "Orage et pluie"], partlycloudy: ["mdi:weather-partly-cloudy", "Éclaircies"],
  pouring: ["mdi:weather-pouring", "Averses"], rainy: ["mdi:weather-rainy", "Pluie"], snowy: ["mdi:weather-snowy", "Neige"],
  "snowy-rainy": ["mdi:weather-snowy-rainy", "Pluie et neige"], sunny: ["mdi:weather-sunny", "Ensoleillé"], windy: ["mdi:weather-windy", "Venteux"],
  "windy-variant": ["mdi:weather-windy-variant", "Venteux"],
};
const SF_NS_ALIAS = { matin: "Matin", morning: "Matin", jour: "Jour", day: "Jour", soir: "Soir", evening: "Soir", nuit: "Nuit", night: "Nuit" };

const SF_NS_CSS = `
  :host { display:block; height:100%; ${SF_VARS_DARK} }
  * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  .ns { direction:ltr; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; } }
  :host([theme="light"]) { filter: invert(1) hue-rotate(180deg); }
  [role="button"]:focus-visible { outline:2px solid var(--sf-cyan); outline-offset:2px; }
  /* Everything is sized in "u" = 1 vmin (4.8 px on the NSPanel Pro 480 x 480): the layout stays proportional. */
  /* available height: that of --sf-ns-height if defined; otherwise the whole screen in kiosk mode, or the screen minus the HA bar (56 px) */
  .ns { --H:var(--sf-ns-height, calc(100vh - 56px)); --u:min(1vw, calc(var(--H) / 100)); --a:var(--sf-cyan); position:relative; display:flex; flex-direction:column; gap:calc(var(--u)*1.7);
    height:var(--H); padding:calc(var(--u)*2) calc(var(--u)*2.2); overflow:hidden; color:var(--sf-text);
    font-family:'B612 Mono', ui-monospace, monospace; font-size:calc(var(--u)*2.6); background:var(--bg); transition:background .8s; }
  .ns.full { --H:var(--sf-ns-height, 100vh); }
  .ns::after { content:""; position:absolute; inset:0; pointer-events:none; background:repeating-linear-gradient(0deg, rgb(var(--sf-fg-rgb) / .02) 0 1px, transparent 1px 3px); }
  .ns.nuit { color:#b9a39e; }
  .ns.nuit .panel { background:rgb(var(--sf-fg-rgb) / .02); border-color:rgba(217,87,63,.22); box-shadow:none; }
  .hm, .big, .num, .nm { font-family:Orbitron, sans-serif; }
  ha-icon { display:inline-block; line-height:0; }

  /* header */
  .hero { flex:0 0 auto; }
  .hrow { display:flex; align-items:flex-start; justify-content:space-between; gap:calc(var(--u)*2); }
  .hm { font-size:calc(var(--u)*12); font-weight:700; line-height:1; letter-spacing:.02em; color:#fff; text-shadow:0 0 calc(var(--u)*3) var(--a); }
  .ns.nuit .hm { color:#e8c9c1; text-shadow:0 0 calc(var(--u)*2.4) rgba(217,87,63,.6); }
  .date { margin-top:calc(var(--u)*.9); font-size:calc(var(--u)*2.5); letter-spacing:.12em; text-transform:uppercase; color:var(--a); white-space:nowrap; }
  .wx { display:flex; align-items:center; gap:calc(var(--u)*1.6); cursor:pointer; text-align:right; }
  .wx ha-icon { --mdc-icon-size:calc(var(--u)*9); color:var(--a); }
  .wx .t { font-family:Orbitron, sans-serif; font-size:calc(var(--u)*7.2); font-weight:600; color:#fff; line-height:1; }
  .wx .c { font-size:calc(var(--u)*2.3); color:var(--sf-dim); margin-top:calc(var(--u)*.6); }
  .railWrap { position:relative; margin-top:calc(var(--u)*1.2); }
  .rail { display:flex; height:calc(var(--u)*.9); border-radius:99px; overflow:hidden; gap:2px; }
  .rail i { flex:1 1 0; background:rgb(var(--sf-fg-rgb) / .09); } .rail i.on { background:var(--a); box-shadow:0 0 calc(var(--u)*1.6) var(--a); }
  .rail b { position:absolute; top:50%; width:calc(var(--u)*2.4); height:calc(var(--u)*2.4); margin:calc(var(--u)*-1.2) 0 0 calc(var(--u)*-1.2);
    border-radius:50%; background:#fff; box-shadow:0 0 calc(var(--u)*2) #fff, 0 0 calc(var(--u)*4) var(--a); }
  .modeTxt { position:absolute; right:0; top:calc(var(--u)*-3.4); font-size:calc(var(--u)*2.3); letter-spacing:.12em; text-transform:uppercase; color:var(--sf-dim); }
  .modeTxt b { color:var(--a); font-weight:400; }

  /* alerts (2 lines at most) */
  .alerts { flex:0 0 auto; display:flex; flex-direction:column; gap:calc(var(--u)*1); }
  .alert { display:flex; align-items:center; gap:calc(var(--u)*1.6); height:calc(var(--u)*7.2); padding:0 calc(var(--u)*2); border-radius:calc(var(--u)*1.8);
    border:1px solid var(--sf-red); background:rgb(var(--sf-red-rgb) / .18); color:#ffd9df; font-size:calc(var(--u)*2.8); font-weight:700; letter-spacing:.05em; animation:pulse 1.4s infinite; overflow:hidden; }
  .alert em { margin-left:auto; flex:0 0 auto; font-style:normal; font-size:calc(var(--u)*2.6); padding:calc(var(--u)*.4) calc(var(--u)*1.4); border-radius:99px; background:rgb(var(--sf-fg-rgb) / .18); }
  .alert span { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .alert ha-icon { --mdc-icon-size:calc(var(--u)*4.4); color:var(--sf-red); flex:0 0 auto; }
  .alert.warn { border-color:var(--sf-amber); background:rgb(var(--sf-amber-rgb) / .13); color:#ffe9b0; animation:none; } .alert.warn ha-icon { color:var(--sf-amber); }
  @keyframes pulse { 50% { box-shadow:0 0 calc(var(--u)*4) rgb(var(--sf-red-rgb) / .85); } }

  /* an alert is displayed: header and figures compacted to keep the main area readable */
  .ns.tight .hm { font-size:calc(var(--u)*9); } .ns.tight .date { margin-top:calc(var(--u)*.4); } .ns.tight .wx .t { font-size:calc(var(--u)*5.6); } .ns.tight .wx ha-icon { --mdc-icon-size:calc(var(--u)*7); }
  .ns.tight .orbC .big { font-size:calc(var(--u)*6.4); } .ns.tight .orbC .lbl + .big + .lbl { display:none; } .ns.tight .stat .v { font-size:calc(var(--u)*3.8); } .ns.tight .stat { gap:calc(var(--u)*.4); }
  .ns.tight .car svg { width:calc(var(--u)*13); height:calc(var(--u)*13); }
  /* main area: grid that fills exactly the remaining space */
  .main { flex:1 1 0; min-height:0; display:grid; gap:calc(var(--u)*1.7); }
  .panel { position:relative; min-width:0; min-height:0; overflow:hidden; border-radius:calc(var(--u)*2.2); padding:calc(var(--u)*1.7) calc(var(--u)*2);
    border:1px solid rgb(var(--sf-cyan-rgb) / .2); background:rgba(6,16,29,.62); box-shadow:inset 0 0 calc(var(--u)*6) rgb(var(--sf-cyan-rgb) / .05); }
  .ns:not(.nuit) .panel { border-color:color-mix(in srgb, var(--a) 28%, transparent); }
  .col { display:flex; flex-direction:column; justify-content:center; }
  .lbl { font-size:calc(var(--u)*2.2); letter-spacing:.12em; text-transform:uppercase; color:var(--sf-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .tap { cursor:pointer; user-select:none; -webkit-user-select:none; transition:transform .12s, box-shadow .2s, background .2s; }
  .tap:active { transform:scale(.96); }
  .sent { box-shadow:0 0 0 2px var(--a), 0 0 calc(var(--u)*4) var(--a) !important; }
  .armed { border-color:var(--sf-amber) !important; background:rgb(var(--sf-amber-rgb) / .22) !important; color:#fff !important; animation:blink .5s infinite; }
  @keyframes blink { 50% { opacity:.35; } }

  /* weather */
  .wxP { display:flex; flex-direction:column; justify-content:space-between; }
  .wxTop { display:flex; align-items:center; gap:calc(var(--u)*2); }
  .wxTop ha-icon { --mdc-icon-size:calc(var(--u)*10); color:var(--a); filter:drop-shadow(0 0 calc(var(--u)*2) var(--a)); flex:0 0 auto; }
  .wxTop .big { font-size:calc(var(--u)*7.2); font-weight:600; color:#fff; line-height:1; }
  .wxTop .sub { color:#9fc3d9; font-size:calc(var(--u)*2.3); line-height:1.35; margin-top:calc(var(--u)*.4); }
  .rain { display:flex; align-items:flex-end; gap:calc(var(--u)*.7); height:calc(var(--u)*9); margin-bottom:calc(var(--u)*2.6); }
  .rb { flex:1; height:100%; position:relative; display:flex; align-items:flex-end; } .rb i { display:block; width:100%; border-radius:calc(var(--u)*.6); background:rgba(159,195,217,.28); }
  .rb.wet i { background:#4fc3f7; box-shadow:0 0 calc(var(--u)*1.2) #4fc3f7; }
  .rb span { position:absolute; left:0; bottom:calc(var(--u)*-3); font-size:calc(var(--u)*1.9); color:var(--sf-dim); white-space:nowrap; }
  .wxTop .sub b.rain { color:#4fc3f7; font-weight:600; } .wxTop .sub b.dry { color:var(--sf-green); font-weight:600; }
  .dayB { display:flex; align-items:center; gap:calc(var(--u)*2); height:100%; } .dayB .dv { display:flex; flex-direction:column; flex:0 0 auto; }
  .dayB .big { font-family:Orbitron, sans-serif; font-size:calc(var(--u)*5.2); font-weight:600; color:#fff; line-height:1; } .dayB .big small { font-size:calc(var(--u)*2.4); color:var(--sf-dim); }
  .dayB .dc { display:flex; flex-wrap:wrap; gap:calc(var(--u)*1); margin-left:auto; justify-content:flex-end; }
  .chip.up { color:#ffb347; background:rgba(255,179,71,.12); }
  .fc { display:flex; justify-content:space-between; }
  .fc > div { flex:1; text-align:center; } .fc ha-icon { --mdc-icon-size:calc(var(--u)*4.6); color:var(--a); }
  .fc .h { font-size:calc(var(--u)*2.1); color:var(--sf-dim); } .fc .n { font-family:Orbitron, sans-serif; font-size:calc(var(--u)*3); color:#fff; }

  /* voitures (anneaux) */
  .cars { display:flex; gap:calc(var(--u)*1.4); height:100%; align-items:center; }
  .car { flex:1 1 0; min-width:0; text-align:center; cursor:pointer; display:flex; flex-direction:column; align-items:center; }
  .car svg { width:calc(var(--u)*17); height:calc(var(--u)*17); display:block; }
  .car .nm { margin-top:calc(var(--u)*.6); font-weight:700; font-size:calc(var(--u)*2.4); letter-spacing:.1em; text-transform:uppercase; }
  .car .rg { font-size:calc(var(--u)*2.3); color:#9fc3d9; margin-top:calc(var(--u)*.3); white-space:nowrap; }
  .car .rg ha-icon { --mdc-icon-size:calc(var(--u)*3); vertical-align:-3px; margin-left:calc(var(--u)*.8); }
  .okc { color:var(--sf-green); } .badc { color:var(--sf-red); } .ambc { color:var(--sf-amber); }

  /* temperature pills */
  .pills { display:flex; gap:calc(var(--u)*1.2); height:100%; }
  .pill { flex:1 1 0; min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:calc(var(--u)*2);
    border:1px solid rgb(var(--sf-fg-rgb) / .1); background:rgb(var(--sf-fg-rgb) / .04); padding:calc(var(--u)*.8) 0; }
  .pill ha-icon { --mdc-icon-size:calc(var(--u)*4.4); color:var(--a); }
  .pill .num { font-size:calc(var(--u)*3.6); font-weight:600; color:#fff; margin-top:calc(var(--u)*.4); white-space:nowrap; }
  .pill .num small { font-size:calc(var(--u)*2.2); color:var(--sf-dim); font-weight:400; }
  .pill .lbl { margin-top:calc(var(--u)*.2); max-width:100%; letter-spacing:.08em; }
  .pill.bad { border-color:var(--sf-red); background:rgb(var(--sf-red-rgb) / .15); } .pill.bad .num { color:#ff8095; }
  .pill.ok ha-icon { color:var(--sf-green); }

  .pills.compact .pill { padding:0; } .pills.compact .pill ha-icon { display:none; } .pills.compact .pill .num { margin-top:0; line-height:1.05; } .pills.compact .pill .lbl { margin-top:calc(var(--u)*.3); font-size:calc(var(--u)*2); }
  .nrow .pill { border:0; background:none; }
  /* boutons */
  .btns { display:flex; gap:calc(var(--u)*1.4); height:100%; }
  .btn { flex:1 1 0; min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:calc(var(--u)*.5); border-radius:calc(var(--u)*2.2);
    border:1px solid rgb(var(--sf-fg-rgb) / .13); background:rgb(var(--sf-fg-rgb) / .05); color:var(--sf-text); font-size:calc(var(--u)*2.2); letter-spacing:.05em; text-align:center; padding:0 calc(var(--u)*.6); }
  .btn span { max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .btn ha-icon { --mdc-icon-size:calc(var(--u)*5.6); color:var(--a); }
  .dock { flex:0 0 calc(var(--u)*11.5); }

  /* energy */
  .orbP { display:flex; align-items:center; justify-content:center; padding:calc(var(--u)*1); }
  .orbWrap { position:relative; width:100%; height:100%; }
  .orbWrap svg { position:absolute; inset:0; width:100%; height:100%; }
  .orbC { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; pointer-events:none; }
  .orbC .big { font-size:calc(var(--u)*8.4); font-weight:700; color:#fff; line-height:1; text-shadow:0 0 calc(var(--u)*3) var(--a); }
  .orbC .big small { font-size:calc(var(--u)*3.2); color:var(--a); font-weight:500; }
  .stats { display:flex; flex-direction:column; gap:calc(var(--u)*1.2); min-height:0; }
  .stat { flex:1 1 0; min-height:0; display:flex; flex-direction:column; justify-content:center; gap:calc(var(--u)*.7); padding:0 calc(var(--u)*1.8); border-radius:calc(var(--u)*2); border:1px solid rgb(var(--sf-fg-rgb) / .1); background:rgb(var(--sf-fg-rgb) / .04); overflow:hidden; }
  .srow { display:flex; align-items:center; gap:calc(var(--u)*1.2); } .srow ha-icon { --mdc-icon-size:calc(var(--u)*4.2); flex:0 0 auto; }
  .srow .lbl { flex:1 1 auto; min-width:0; }
  .stat .v { font-family:Orbitron, sans-serif; font-size:calc(var(--u)*4.4); font-weight:600; color:#fff; line-height:1; white-space:nowrap; margin-left:auto; }
  .stat .v small { font-size:calc(var(--u)*2.3); color:var(--sf-dim); font-weight:400; }
  .sbar { height:calc(var(--u)*1); border-radius:99px; background:rgb(var(--sf-fg-rgb) / .09); overflow:hidden; } .sbar i { display:block; height:100%; border-radius:99px; transition:width .8s; }
  .ssub { display:flex; align-items:center; gap:calc(var(--u)*1.2); min-height:calc(var(--u)*3.4); overflow:hidden; white-space:nowrap; }
  .chip { display:inline-flex; align-items:center; gap:calc(var(--u)*.6); font-size:calc(var(--u)*2.2); color:var(--sf-text); padding:calc(var(--u)*.2) calc(var(--u)*1.2); border-radius:99px; background:rgb(var(--sf-fg-rgb) / .07); }
  .chip ha-icon { --mdc-icon-size:calc(var(--u)*3); color:var(--a); } .chip small { font-size:calc(var(--u)*1.8); color:var(--sf-dim); }
  .chip.hc { color:var(--sf-green); background:rgb(var(--sf-green-rgb) / .12); }
  .sub1 { font-size:calc(var(--u)*2.1); color:var(--sf-dim); }
  .dec { display:flex; align-items:center; gap:calc(var(--u)*1.6); font-size:calc(var(--u)*2.7); color:var(--sf-text); height:100%; }
  .dec ha-icon { --mdc-icon-size:calc(var(--u)*5); color:var(--sf-green); flex:0 0 auto; }
  .dec span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .dec .r { margin-left:auto; color:var(--sf-dim); font-size:calc(var(--u)*2.2); flex:0 0 auto; }

  /* evening tiles */
  .tiles { display:grid; grid-template-columns:repeat(3, 1fr); grid-auto-rows:1fr; gap:calc(var(--u)*1.7); min-height:0; }
  .tile { position:relative; min-width:0; min-height:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:calc(var(--u)*.6);
    border-radius:calc(var(--u)*2.6); border:1px solid rgb(var(--sf-fg-rgb) / .12); background:rgb(var(--sf-fg-rgb) / .04); color:#9fc3d9; text-align:center; padding:calc(var(--u)*1); }
  .tile ha-icon { --mdc-icon-size:calc(var(--u)*7.4); flex:0 0 auto; }
  .tile .nm { flex:0 0 auto; line-height:1.35; font-weight:600; font-size:calc(var(--u)*2.6); letter-spacing:.08em; text-transform:uppercase; max-width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .tile .st { flex:0 0 auto; font-size:calc(var(--u)*2.1); opacity:.8; }
  .tile.on { color:#fff; border-color:var(--tc); background:color-mix(in srgb, var(--tc) 20%, transparent); box-shadow:inset 0 0 calc(var(--u)*5) color-mix(in srgb, var(--tc) 30%, transparent), 0 0 calc(var(--u)*3.5) color-mix(in srgb, var(--tc) 40%, transparent); }
  .tile.on ha-icon { color:var(--tc); filter:drop-shadow(0 0 calc(var(--u)*2) var(--tc)); }
  .cars > .mini { flex:1 1 0; min-width:0; }
  .mini { display:flex; align-items:center; gap:calc(var(--u)*1.6); height:100%; cursor:pointer; }
  .mini .nm { font-weight:700; font-size:calc(var(--u)*2.4); letter-spacing:.08em; text-transform:uppercase; }
  .bar { flex:1 1 auto; height:calc(var(--u)*1.6); border-radius:99px; background:rgb(var(--sf-fg-rgb) / .1); overflow:hidden; } .bar i { display:block; height:100%; border-radius:99px; }
  .mini .v { font-family:Orbitron, sans-serif; font-size:calc(var(--u)*3.4); font-weight:600; color:#fff; white-space:nowrap; }
  .mini ha-icon { --mdc-icon-size:calc(var(--u)*3.6); }

  /* nuit */
  .sentP { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:calc(var(--u)*1.6); }
  .sentRow { display:flex; align-items:center; gap:calc(var(--u)*3); }
  .sentRow ha-icon { --mdc-icon-size:calc(var(--u)*17); color:var(--sf-green); filter:drop-shadow(0 0 calc(var(--u)*2.4) rgb(var(--sf-green-rgb) / .7)); animation:breathe 4s infinite ease-in-out; }
  .sentRow.bad ha-icon { color:var(--sf-red); filter:drop-shadow(0 0 calc(var(--u)*2.4) rgb(var(--sf-red-rgb) / .8)); }
  .sentRow .big { font-size:calc(var(--u)*7); font-weight:700; letter-spacing:.18em; color:#e8d8d3; } .sentRow .sub { color:#8a7873; font-size:calc(var(--u)*2.4); margin-top:calc(var(--u)*.6); }
  @keyframes breathe { 50% { opacity:.55; transform:scale(.96); } }
  .dots { display:flex; flex-wrap:wrap; justify-content:center; gap:calc(var(--u)*1.2) calc(var(--u)*2.4); }
  .dt { display:flex; align-items:center; gap:calc(var(--u)*.9); font-size:calc(var(--u)*2.2); color:#9a8883; }
  .dt i { width:calc(var(--u)*1.8); height:calc(var(--u)*1.8); border-radius:50%; background:var(--sf-green); box-shadow:0 0 calc(var(--u)*1.6) var(--sf-green); } .dt.bad i { background:var(--sf-red); box-shadow:0 0 calc(var(--u)*2) var(--sf-red); }
  .goodnight { display:flex; align-items:center; justify-content:center; text-align:center; font-family:Orbitron, sans-serif; font-weight:700; font-size:calc(var(--u)*3); letter-spacing:.1em; padding:0 calc(var(--u)*1);
    text-transform:uppercase; color:#ffd9cf; border-color:rgba(217,87,63,.55) !important; background:rgba(217,87,63,.14) !important; }
`;


class SfNsCard extends SfBase {
  defaults() { return { rooms: [], fridge: [], cars: [], leaks: [], tiles: [], shortcuts: [], lights_off: [], energy: {}, vacuum: null }; }
  getCardSize() { return 12; }
  set hass(h) { this._hass = h; this._subFc(); this._loadDay(); this._schedule(); }
  connectedCallback() {
    super.connectedCallback();
    this._key = null; clearInterval(this._tk); this._tk = setInterval(() => this._tick(), 15000);
    this._subFc();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._tk); this._tk = null;
    if (this._kiosk) { try { this._kiosk.remove(); } catch (e) { /* already removed */ } this._kiosk = null; }
    if (this._fcUnsub) { try { this._fcUnsub(); } catch (e) { /* already closed */ } this._fcUnsub = null; }
  }
  // Rewrite the DOM only if the render changed (the clock minute is excluded from the comparison: long presses and animations are not cut).
  _schedule() {
    if (this._raf || !this._config || !this._hass) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this._render(); });
  }

  // ---------------------------------------------------------------- outils
  ic(name) { return `<ha-icon icon="${this.esc(name || "mdi:circle-small")}"></ha-icon>`; }
  pw(w) { return w === null || w === undefined || !isFinite(w) ? "—" : Math.abs(w) >= 1000 ? `${this.nf(Math.abs(w) / 1000, 1)}<small> kW</small>` : `${Math.round(Math.abs(w))}<small> W</small>`; }
  f1(n) { return n === null || n === undefined || !isFinite(n) ? "—" : this.nf(n, 1); }
  own(o, k) { return o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined; }
  now() { return new Date(); }
  cur() { const E = this._config.energy || {}, u = String(E.currency || (this.st(E.price) && this.st(E.price).attributes.unit_of_measurement) || "").split("/")[0].trim(); return u && u.length <= 4 ? u : "€"; }

  get leaks() { const l = this._config.leaks; return Array.isArray(l) ? l.filter((x) => x && typeof x === "object") : []; }
  get vac() { const v = this._config.vacuum; return v && typeof v === "object" && v.entity ? v : null; }
  dateTxt(d) { try { return d.toLocaleDateString(this.locLatn, { weekday: "long", day: "numeric", month: "long" }); } catch (e) { return d.toDateString(); } }

  mode() {
    const norm = (v) => this.own(SF_NS_ALIAS, String(v || "").trim().toLowerCase());
    const q = norm(new URLSearchParams(location.search).get("mode"));
    if (q) return q;
    const s = this.st(this._config.mode_entity);   // st() accepts a missing identifier
    if (s && norm(s.state)) return norm(s.state);
    const h = this.now().getHours();
    return h < 6 || h >= 22 ? "Nuit" : h < 9 ? "Matin" : h < 18 ? "Jour" : "Soir";
  }

  async _subFc() {
    if (this._fcUnsub || this._fcBusy || !this._hass || !this._hass.connection || !this._config || !this._config.weather) return;
    // Failure (weather entity without hourly forecast, unavailable…): HA calls `hass` several times per second, so we only retry once a minute.
    if (this._fcFail && Date.now() - this._fcFail < 60000) return;
    this._fcBusy = true;
    try {
      this._fcUnsub = await this._hass.connection.subscribeMessage((ev) => { this._fc = (ev && ev.forecast) || []; this._schedule(); },
        { type: "weather/subscribe_forecast", forecast_type: "hourly", entity_id: this._config.weather });
    } catch (e) { this._fc = null; this._fcFail = Date.now(); }
    this._fcBusy = false;
  }

  // Day summary: hourly statistics (recorder) of the cumulative import / export / production meters.
  async _loadDay() {
    const D = this._config && this._config.energy && this._config.energy.day;
    if (!D || typeof D !== "object" || typeof D.import !== "string" || !D.import || this._dayBusy || !this._hass || !this._hass.callWS) return;
    if (this._dayAt && Date.now() - this._dayAt < 600000) return;
    this._dayBusy = true; this._dayAt = Date.now();
    try {
      const n = this.now(), t0 = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1, 0, 0, 0);
      const r = await this._hass.callWS({ type: "recorder/statistics_during_period", start_time: t0.toISOString(),
        statistic_ids: [D.import, D.export, D.solar].filter((x) => typeof x === "string" && x), period: "hour", types: ["change"] });
      this._day = { r }; this._schedule();
    } catch (e) { this._day = null; }
    this._dayBusy = false;
  }
  dayCalc() {
    const D = (this._config.energy || {}).day, s = this._day; if (!D || typeof D !== "object" || !s || !s.r || typeof s.r !== "object") return null;
    const n = this.now(), mid = new Date(n); mid.setHours(0, 0, 0, 0);
    const m0 = mid.getTime(), el = n.getTime() - m0, hrs = {};
    const put = (id, k) => (Array.isArray(s.r[id]) ? s.r[id] : []).forEach((q) => { if (!q || typeof q !== "object") return; const t = typeof q.start === "number" ? q.start : Date.parse(q.start); (hrs[t] = hrs[t] || { i: 0, e: 0, s: 0 })[k] += Number(q.change) || 0; });
    put(D.import, "i"); if (D.export) put(D.export, "e"); if (D.solar) put(D.solar, "s");
    const hcH = (Array.isArray(D.hc_hours) ? D.hc_hours : []).filter((w) => Array.isArray(w) && isFinite(Number(w[0])) && isFinite(Number(w[1]))), hasP = typeof D.hp === "number" && typeof D.hc === "number";
    const price = (h) => { let f = 0; hcH.forEach(([a, b]) => { f += Math.max(0, Math.min(h + 1, Number(b)) - Math.max(h, Number(a))); }); f = Math.min(1, f); return D.hc * f + D.hp * (1 - f); };
    let c = 0, i = 0, cost = 0, y = 0;
    Object.keys(hrs).forEach((k) => { const t = +k, q = hrs[k], cons = Math.max(0, q.i + q.s - q.e);
      if (t >= m0) { c += cons; i += q.i; if (hasP) cost += q.i * price(new Date(t).getHours()); }
      else if (t >= m0 - 86400000 && t < m0 - 86400000 + el) y += cons; });   // yesterday, up to the same hour as now
    if (c <= 0 && i <= 0) return null;
    return { c, i, cost: hasP ? cost : null, share: c > 0 ? Math.max(0, Math.min(1, (c - i) / c)) : null, y, delta: y > 0.5 ? (c - y) / y : null };
  }
  dayBlock() {
    const d = this.dayCalc(); if (!d) return "";
    const f = (x) => this.nf(x, 1);
    const chips = (d.cost !== null ? `<span class="chip">≈ ${this.nf(d.cost, 2)} ${this.esc(this.cur())}</span>` : "")
      + (d.share !== null ? `<span class="chip">${this.ic("mdi:white-balance-sunny")}${Math.round(d.share * 100)} %</span>` : "")
      + (d.delta !== null ? `<span class="chip ${d.delta > 0.05 ? "up" : d.delta < -0.05 ? "hc" : ""}">${this.esc(this.t("wallpanel.p_vs_yesterday", { p: (d.delta > 0 ? "+" : "") + Math.round(d.delta * 100) }))}</span>` : "");
    return this.panel(`<div class="dayB"><div class="dv"><span class="lbl">${this.esc(this.t("wallpanel.today"))}</span><span class="big">${f(d.c)}<small> kWh</small></span></div><div class="dc">${chips}</div></div>`, "", `data-info="${this.esc(this._config.energy.day.import)}"`);
  }
  // ---------------------------------------------------------------- actions
  _schedule() {
    if (this._raf || !this._config || !this._hass) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this._render(); });
  }
  _tick() { const d = this.now(), p = (n) => String(n).padStart(2, "0"), el = this.shadowRoot && this.shadowRoot.querySelector(".hm");
    if (el) el.textContent = `${p(d.getHours())}:${p(d.getMinutes())}`;
    if (this._mode !== this.mode()) this._schedule(); }
  _call(el, domain, service, data) {
    el.classList.add("sent"); setTimeout(() => el.classList.remove("sent"), 600);
    this._hass.callService(domain, service, data).catch(() => { el.style.boxShadow = "0 0 0 2px var(--sf-red)"; setTimeout(() => (el.style.boxShadow = ""), 2000); });
  }
  _moreInfo(id) { const ev = new Event("hass-more-info", { bubbles: true, composed: true }); ev.detail = { entityId: id }; this.dispatchEvent(ev); }
  _bind() {
    const root = this.shadowRoot;
    root.querySelectorAll("[data-act]").forEach((el) => {
      let t = null, long = false;
      const id = el.dataset.e;
      el.addEventListener("pointerdown", () => { long = false; if (el.dataset.act === "popup" || el.dataset.act === "close") return; t = setTimeout(() => { long = true; if (id) this._moreInfo(id); }, 550); });
      const end = () => clearTimeout(t);
      el.addEventListener("pointerleave", end); el.addEventListener("pointercancel", end);
      el.addEventListener("pointerup", end);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation(); if (long) return;
        const a = el.dataset.act;
        if (a === "close" && ev.target.closest && ev.target.closest(".sheet") && !ev.target.closest(".x")) return;
        if (el.dataset.confirm && !el.classList.contains("armed")) {
          el.classList.add("armed"); el.dataset.keep = el.innerHTML; el.innerHTML = `<div class="nm">${this.esc(el.dataset.confirm)}</div>`;
          setTimeout(() => { if (el.isConnected && el.classList.contains("armed")) { el.classList.remove("armed"); el.innerHTML = el.dataset.keep; } }, 4000);
          return;
        }
        if (el.classList.contains("armed")) { el.classList.remove("armed"); el.innerHTML = el.dataset.keep; }
        this._do(el, a, id);
      });
    });
    root.querySelectorAll("[data-info]").forEach((el) => el.addEventListener("click", () => this._moreInfo(el.dataset.info)));
  }
  _do(el, a, id) {
    const c = this._config, dom = (id || "").split(".")[0];
    if (a === "toggle") {
      if (dom === "scene") return this._call(el, "scene", "turn_on", { entity_id: id });
      if (dom === "button") return this._call(el, "button", "press", { entity_id: id });
      if (dom === "cover") return this._call(el, "cover", this.st(id) && this.st(id).state === "closed" ? "open_cover" : "close_cover", { entity_id: id });
      if (dom === "media_player") return this._call(el, "media_player", this.isOn(id) ? "turn_off" : "turn_on", { entity_id: id });
      return this._call(el, "homeassistant", "toggle", { entity_id: id });
    }
    if (a === "lights_off") return this._call(el, "light", "turn_off", { entity_id: c.lights_off });
    if (a === "goodnight") {
      this._call(el, "light", "turn_off", { entity_id: c.lights_off });
      if (c.cover && this.st(c.cover) && this.st(c.cover).state !== "closed") this._hass.callService("cover", "close_cover", { entity_id: c.cover });
      return;
    }
    if (a === "info") return this._moreInfo(id);
    if (a === "popup") { this._pop = id; this._key = null; return this._render(); }
    if (a === "close") { this._pop = null; this._key = null; return this._render(); }
    if (a === "vac_home") return this._call(el, "vacuum", "return_to_base", { entity_id: id });
    if (a === "vac_stop") return this._call(el, "vacuum", "stop", { entity_id: id });
  }

  // ---------------------------------------------------------------- blocs
  alerts() {
    const c = this._config, out = [];
    for (const l of this.leaks) if (this.st(l.entity) && this.st(l.entity).state === "on") out.push({ i: "mdi:water-alert", t: `${this.t("common.water_leak")} · ${l.name}`, e: l.entity });
    for (const car of c.cars) {
      if (car.lock && this.st(car.lock) && this.st(car.lock).state === "unlocked") out.push({ i: "mdi:car-door-lock-open", t: this.t("wallpanel.n_unlocked", { n: car.name }), e: car.lock, warn: true });
      const s = this.num(car.soc); if (s !== null && s < (car.low || 0)) out.push({ i: "mdi:battery-alert", t: this.t("wallpanel.n_battery_p", { n: car.name, p: Math.round(s) }), e: car.soc, warn: true });
    }
    for (const r of c.rooms) { const v = this.num(r.entity); if (r.min && v !== null && v < r.min) out.push({ i: "mdi:thermometer-alert", t: this.t("wallpanel.n_cold_v", { n: r.name, v: this.f1(v) }), e: r.entity, warn: true }); }
    for (const f of c.fridge) { const v = this.num(f.entity); if (f.max !== undefined && v !== null && v > f.max) out.push({ i: "mdi:fridge-alert", t: this.t("wallpanel.n_too_warm_v", { n: f.name, v: this.f1(v) }), e: f.entity }); }
    return out;
  }
  hero(mode) {
    const d = this.now(), p = (n) => String(n).padStart(2, "0"), c = this._config;
    const w = this.st(c.weather), wx = w ? this.own(SF_NS_WX, w.state) || ["mdi:weather-cloudy", w.state] : null;
    const t = this.num(c.outdoor) ?? (w && w.attributes.temperature !== undefined ? parseFloat(w.attributes.temperature) : null);
    const frac = (d.getHours() * 60 + d.getMinutes()) / 1440;
    const seg = [[0, 6, "Nuit"], [6, 9, "Matin"], [9, 18, "Jour"], [18, 22, "Soir"], [22, 24, "Nuit"]];
    const rail = seg.map(([x, y, m]) => `<i style="flex:${y - x}" class="${m === mode ? "on" : ""}"></i>`).join("");
    const wxh = (t !== null && !isNaN(t)) || wx ? `<div class="wx" data-info="${this.esc(c.weather || c.outdoor)}">${wx ? this.ic(wx[0]) : ""}<div><div class="t">${t === null || isNaN(t) ? "—" : this.f1(t)}°</div></div></div>` : "";
    return `<div class="hero"><div class="hrow"><div><div class="hm">${p(d.getHours())}:${p(d.getMinutes())}</div><div class="date">${this.esc(this.dateTxt(d))}</div></div>${wxh}</div>
      <div class="railWrap"><div class="modeTxt"><b>${this.esc(this.t(SF_NS_MODES[mode].greet))}</b> · ${this.esc(this.t(SF_NS_MODES[mode].label))}</div><div class="rail">${rail}</div><b style="position:absolute;top:50%;left:${(frac * 100).toFixed(2)}%;width:calc(var(--u)*2.4);height:calc(var(--u)*2.4);margin:calc(var(--u)*-1.2) 0 0 calc(var(--u)*-1.2);border-radius:50%;background:#fff;box-shadow:0 0 calc(var(--u)*2) #fff,0 0 calc(var(--u)*4) var(--a)"></b></div></div>`;
  }
  panel(inner, cls, attrs) { return `<div class="panel ${cls || ""}" ${attrs || ""}>${inner}</div>`; }

  weatherBlock() {
    const c = this._config, w = this.st(c.weather); if (!w) return "";
    const wx = this.own(SF_NS_WX, w.state) || ["mdi:weather-cloudy", w.state], a = w.attributes || {};
    const nowT = this.now().getTime(), fc = Array.isArray(this._fc) ? this._fc.filter((f) => f && isFinite(new Date(f.datetime).getTime()) && new Date(f.datetime).getTime() + 3600000 > nowT).slice(0, 12) : [];
    const fin = (n) => (isFinite(Number(n)) ? Number(n) : 0);
    const pv = (f) => f.precipitation_probability !== undefined && f.precipitation_probability !== null ? fin(f.precipitation_probability) : (fin(f.precipitation) > 0 ? Math.min(100, 40 + fin(f.precipitation) * 30) : 0);
    const wet = (f) => pv(f) >= 50 || fin(f.precipitation) >= 0.3;
    let head = "", dry = false;
    if (fc.length >= 6) {
      const k = fc.findIndex(wet);
      if (k < 0) { head = this.t("wallpanel.dry_for_n_h", { n: fc.length }); dry = true; }
      else { const t = new Date(fc[k].datetime).getTime(), mn = Math.round((t - nowT) / 60000);
        head = k === 0 || mn <= 0 ? this.t("wallpanel.raining_now") : mn < 90 ? this.t("wallpanel.rain_in_n_min", { n: mn }) : this.t("wallpanel.rain_around_h_00", { h: new Date(t).getHours() }); }
    }
    const bars = fc.map((f, j) => { const v = pv(f), h = Math.max(7, Math.min(100, v)); const hh = new Date(f.datetime).getHours();
      return `<div class="rb ${wet(f) ? "wet" : ""}"><i style="height:${h}%"></i>${j % 4 === 0 ? `<span>${hh}h</span>` : ""}</div>`; }).join("");
    return this.panel(`<div class="wxTop">${this.ic(wx[0])}<div><div class="big">${a.temperature !== undefined ? this.f1(parseFloat(a.temperature)) : "—"}°</div>
      <div class="sub">${this.esc(this.t(wx[1]))}${head ? `<br><b class="${dry ? "dry" : "rain"}">${this.esc(head)}</b>` : ""}</div></div></div>${bars ? `<div class="rain">${bars}</div>` : ""}`, "wxP", `data-info="${this.esc(c.weather)}"`);
  }
  carsBlock() {
    const c = this._config, R = 42, C = 2 * Math.PI * R; if (!c.cars.length) return "";
    const cars = c.cars.map((car) => {
      const s = this.num(car.soc), rg = this.num(car.range), low = s !== null && s < (car.low || 0), col = low ? "var(--sf-red)" : (car.color || "var(--sf-cyan)");
      const off = s === null ? C : C * (1 - Math.max(0, Math.min(100, s)) / 100);
      let st = "";
      if (car.charging && this.isOn(car.charging)) st += this.ic("mdi:flash").replace("<ha-icon", '<ha-icon class="ambc"');
      if (car.lock && this.st(car.lock)) st += this.st(car.lock).state === "locked" ? this.ic("mdi:lock").replace("<ha-icon", '<ha-icon class="okc"') : this.ic("mdi:lock-open-alert").replace("<ha-icon", '<ha-icon class="badc"');
      return `<div class="car" data-info="${this.esc(car.soc)}"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${R}" fill="none" stroke="rgb(var(--sf-fg-rgb) / .09)" stroke-width="9"/>
        <circle cx="50" cy="50" r="${R}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
          transform="rotate(-90 50 50)" style="filter:drop-shadow(0 0 3px ${col})"/>
        <text x="50" y="58" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="700" font-size="27" fill="#fff">${s === null ? "—" : Math.round(s)}<tspan font-size="12" fill="#9fc3d9">%</tspan></text></svg>
        <div class="nm" style="color:${this.esc(car.color || "var(--sf-cyan)")}">${this.esc(car.name)}</div><div class="rg">${rg === null ? "—" : Math.round(rg)} km${st}</div></div>`;
    }).join("");
    return this.panel(`<div class="cars">${cars}</div>`);
  }
  pills(list, compact) {
    if (!list.length) return "";
    return this.panel(`<div class="pills${compact ? " compact" : ""}">${list.map((r) => { const v = this.num(r.entity), bad = (r.min !== undefined && v !== null && v < r.min) || (r.max !== undefined && v !== null && v > r.max);
      return `<div class="pill tap ${bad ? "bad" : "ok"}" data-info="${this.esc(r.entity)}">${this.ic(r.icon)}<div class="num">${this.f1(v)}<small>°</small></div><div class="lbl">${this.esc(r.name)}</div></div>`; }).join("")}</div>`);
  }
  shortcuts() {
    if (!this._config.shortcuts.length) return "";
    return this.panel(`<div class="btns">${this._config.shortcuts.map((s) => `<div class="btn tap" data-act="toggle" data-e="${this.esc(s.entity)}">${this.ic(s.icon)}<span>${this.esc(s.name)}</span></div>`).join("")}</div>`);
  }
  energyBlocks() {
    const e = this._config.energy || {}; if (!e.solar) return "";
    const sol = Math.max(0, this.watts(e.solar) ?? 0), home = Math.max(0, this.watts(e.home) ?? 0), ev = Math.max(0, this.watts(e.ev) ?? 0);
    const grid = this.watts(e.grid); // + = import, − = export
    const R = 44, C = 2 * Math.PI * R, gap = 3;
    const h = Math.min(home, sol), v = Math.min(ev, Math.max(0, sol - h)), x = Math.max(0, sol - h - v);
    const parts = sol > 30 ? [[h, "var(--sf-cyan)"], [v, "var(--sf-green)"], [x, "var(--sf-amber)"]] : [[1, "rgb(var(--sf-fg-rgb) / .12)"]];
    const tot = parts.reduce((t, q) => t + q[0], 0) || 1; let acc = 0;
    const arcs = parts.filter((q) => q[0] > 0).map(([val, col]) => { const len = Math.max(0, (val / tot) * C - gap), o = -acc; acc += (val / tot) * C;
      return `<circle cx="50" cy="50" r="${R}" fill="none" stroke="${col}" stroke-width="8" stroke-dasharray="${len.toFixed(1)} ${(C - len).toFixed(1)}" stroke-dashoffset="${o.toFixed(1)}" transform="rotate(-90 50 50)" style="filter:drop-shadow(0 0 2px ${col})"/>`; }).join("");
    const ratio = sol > 30 && grid !== null ? Math.round(Math.min(100, ((sol - Math.max(0, -grid)) / sol) * 100)) : null;
    const imp = grid !== null && grid > 20, dec = this.st(e.decision), evc = this.isOn(e.ev_connected);
    const orb = this.panel(`<div class="orbWrap" data-info="${this.esc(e.solar)}"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${R}" fill="none" stroke="rgb(var(--sf-fg-rgb) / .06)" stroke-width="8"/>${arcs}</svg>
      <div class="orbC"><div class="lbl">${this.esc(this.t(sol > 30 ? "solaire" : "nuit"))}</div><div class="big">${this.pw(sol)}</div>${ratio !== null ? `<div class="lbl" style="margin-top:4px">${this.esc(this.t("wallpanel.self_use_n", { n: ratio }))}</div>` : ""}</div></div>`, "orbP");
    // --- three information tiles: each has an icon, a value, a proportional bar and a context line
    const E = e, scale = Math.max(sol, home + ev, Math.abs(grid || 0), 500);
    const ico = (n, col) => this.ic(n).replace("<ha-icon", `<ha-icon style="color:${col}"`);
    // house: the devices that draw the most (2 at most, > 30 W)
    const devs = (Array.isArray(E.devices) ? E.devices : []).filter((d) => d && typeof d === "object").map((d) => ({ ...d, w: this.watts(d.entity) })).filter((d) => d.w !== null && d.w > 30).sort((x, y) => y.w - x.w).slice(0, 2);
    const chipsHome = devs.length ? devs.map((d) => `<span class="chip" data-info="${this.esc(d.entity)}">${this.ic(d.icon || "mdi:flash")}${this.pw(d.w)}</span>`).join("") : `<span class="sub1">${this.esc(this.t("wallpanel.base_load"))}</span>`;
    // charger: current + solar share of the charge
    const evS = this.watts(E.ev_solar), evG = this.watts(E.ev_grid), evPct = evS !== null && evG !== null && evS + evG > 20 ? Math.round(evS / (evS + evG) * 100) : null;
    const amps = this.num(E.ev_current);
    const subEv = ev > 20 ? `${amps !== null ? `<span class="chip">${this.ic("mdi:current-ac")}${Math.round(amps)} A</span>` : ""}${evPct !== null ? `<span class="chip">${this.ic("mdi:white-balance-sunny")}${evPct} %</span>` : ""}`
      : `<span class="sub1">${this.esc(this.t(evc ? "branchée, en attente" : "libre"))}</span>`;
    // grid: direction, current tariff (peak/off-peak), hourly cost of the draw
    const price = this.num(E.price), hc = price !== null && E.hc_below !== undefined && price < E.hc_below;
    const costH = imp && price !== null ? (grid / 1000 * price) : null;
    const subGrid = `${price !== null ? `<span class="chip ${hc ? "hc" : ""}">${this.esc(this.t(hc ? "HC" : "HP"))} ${this.nf(price, 3)} ${this.esc(this.cur())}</span>` : ""}${costH !== null ? `<span class="chip">≈ ${this.nf(costH, 2)} ${this.esc(this.cur())}/h</span>` : ""}${!imp && grid !== null ? `<span class="chip">${this.ic("mdi:transmission-tower-export")}${this.esc(this.t("wallpanel.exporting"))}</span>` : ""}`;
    const tile = (lbl, icon, col, val, frac, sub, info) => `<div class="stat tap" data-info="${this.esc(info)}"><div class="srow">${ico(icon, col)}<span class="lbl">${lbl}</span><span class="v">${val}</span></div>
      <div class="sbar"><i style="width:${Math.max(0, Math.min(100, frac * 100)).toFixed(0)}%;background:${col};box-shadow:0 0 6px ${col}"></i></div><div class="ssub">${sub}</div></div>`;
    const stats = `<div class="stats">${tile(this.t("wallpanel.home"), "mdi:home-lightning-bolt-outline", "var(--sf-cyan)", this.pw(home), home / scale, chipsHome, e.home)}
      ${tile(this.t("wallpanel.charger"), ev > 20 ? "mdi:ev-plug-type2" : "mdi:ev-station", "var(--sf-green)", this.pw(ev), ev / scale, subEv, e.ev)}
      ${tile(this.t(imp ? "réseau" : "export"), imp ? "mdi:transmission-tower-import" : "mdi:transmission-tower-export", imp ? "#ff7043" : "var(--sf-amber)", this.pw(grid), Math.abs(grid || 0) / scale, subGrid, e.grid)}</div>`;
    const decP = e.ev ? this.panel(`<div class="dec">${this.ic(evc ? "mdi:ev-plug-type2" : "mdi:ev-station")}<span>${dec && dec.state !== "unknown" ? this.esc(dec.state) : this.esc(this.t(evc ? "branchée" : "libre"))}</span>
      <span class="r">${this.num(e.ev_day) !== null ? this.f1(this.num(e.ev_day)) + " kWh" : ""}</span></div>`) : "<div></div>";
    return [orb, stats, decP];
  }
  tilesBlock() {
    const list = this._config.tiles;
    if (!list.length) return this.panel(`<div class="lbl">${this.esc(this.t("wallpanel.no_tile_configured"))}</div>`);
    return `<div class="tiles">${list.slice(0, 6).map((x) => { const eid = String(x.entity || ""), on = this.isOn(eid) && !eid.startsWith("scene."), cv = eid.startsWith("cover."), s = this.st(eid);
      const CV = { open: "ouverts", closed: "fermés", opening: "ouverture…", closing: "fermeture…" };
      const txt = this.t(cv ? this.own(CV, s && s.state) || "" : eid.startsWith("scene.") ? "scène" : on ? "allumé" : "éteint");
      return `<div class="tile tap ${on ? "on" : ""}" style="--tc:${this.esc(x.color || "var(--sf-cyan)")}" data-act="toggle" data-e="${this.esc(eid)}">${this.ic(x.icon)}<div class="nm">${this.esc(x.name)}</div><div class="st">${this.esc(txt)}</div></div>`; }).join("")}</div>`;
  }
  carsMini() {
    const c = this._config; if (!c.cars.length) return "";
    return this.panel(`<div class="cars" style="gap:calc(var(--u)*3)">${c.cars.map((car) => { const s = this.num(car.soc), low = s !== null && s < (car.low || 0), col = low ? "var(--sf-red)" : (car.color || "var(--sf-cyan)");
      const lk = car.lock && this.st(car.lock) ? (this.st(car.lock).state === "locked" ? this.ic("mdi:lock").replace("<ha-icon", '<ha-icon class="okc"') : this.ic("mdi:lock-open-alert").replace("<ha-icon", '<ha-icon class="badc"')) : "";
      return `<div class="mini" data-info="${this.esc(car.soc)}"><span class="nm" style="color:${col}">${this.esc(car.name)}</span><div class="bar"><i style="width:${s === null ? 0 : Math.max(2, Math.min(100, s))}%;background:${col};box-shadow:0 0 8px ${col}"></i></div><span class="v">${s === null ? "—" : Math.round(s)}<small>%</small></span>${lk}</div>`; }).join("")}</div>`);
  }
  sentinel() {
    const c = this._config, bad = this.alerts().filter((a) => !a.warn);
    const dots = this.leaks.map((l) => `<span class="dt ${this.st(l.entity) && this.st(l.entity).state === "on" ? "bad" : ""}"><i></i>${this.esc(l.name)}</span>`).join("")
      + c.cars.filter((x) => x.lock).map((x) => `<span class="dt ${this.st(x.lock) && this.st(x.lock).state === "unlocked" ? "bad" : ""}"><i></i>${this.esc(x.name)}</span>`).join("");
    const r0 = c.rooms[0];
    const main = this.panel(`<div class="sentRow ${bad.length ? "bad" : ""}">${this.ic(bad.length ? "mdi:shield-alert" : "mdi:shield-check")}<div><div class="big">${this.esc(this.t(bad.length ? "ALERTE" : "R.A.S."))}</div><div class="sub">${this.esc(this.t(bad.length ? "voir la bande rouge" : "la maison veille"))}</div></div></div><div class="dots">${dots}</div>`, "sentP");
    const pl = [];
    if (r0) pl.push(this.panel(`<div class="pills"><div class="pill tap" data-info="${this.esc(r0.entity)}">${this.ic(r0.icon || "mdi:home")}<div class="num">${this.f1(this.num(r0.entity))}<small>°</small></div><div class="lbl">${this.esc(r0.name)}</div></div></div>`));
    if (c.outdoor) pl.push(this.panel(`<div class="pills"><div class="pill tap" data-info="${this.esc(c.outdoor)}">${this.ic("mdi:thermometer")}<div class="num">${this.f1(this.num(c.outdoor))}<small>°</small></div><div class="lbl">${this.esc(this.t("wallpanel.outside"))}</div></div></div>`));
    const gn = c.lights_off.length || c.cover ? `<div class="panel goodnight tap" data-act="goodnight" data-confirm="${this.esc(this.t("wallpanel.turn_off_close"))}">${this.esc(this.t("wallpanel.good_night"))}</div>` : "";
    return [main, pl.join("") + gn];
  }
  dock() {
    const c = this._config, cv = this.st(c.cover), b = [];
    if (c.lights_off.length) b.push(`<div class="btn tap" data-act="lights_off" data-confirm="${this.esc(this.t("wallpanel.turn_everything_off"))}">${this.ic("mdi:lightbulb-off-outline")}<span>${this.esc(this.t("wallpanel.turn_off"))}</span></div>`);
    if (c.cover) b.push(`<div class="btn tap" data-act="toggle" data-e="${this.esc(c.cover)}">${this.ic(cv && cv.state === "closed" ? "mdi:window-shutter" : "mdi:window-shutter-open")}<span>${this.esc(this.t("wallpanel.shutters"))}</span></div>`);
    if (c.scene_dim) b.push(`<div class="btn tap" data-act="toggle" data-e="${this.esc(c.scene_dim)}">${this.ic("mdi:weather-night")}<span>${this.esc(this.t("wallpanel.dimmed"))}</span></div>`);
    if (c.shortcuts.length || this.vac) b.push(`<div class="btn tap" data-act="popup" data-e="vac">${this.ic("mdi:robot-vacuum")}<span>${this.esc((this.vac && this.vac.name) || this.t("wallpanel.vacuum"))}</span></div>`);
    if (c.mode_entity) b.push(`<div class="btn tap" data-act="info" data-e="${this.esc(c.mode_entity)}">${this.ic("mdi:home-clock")}<span>${this.esc(this.t("common.mode"))}</span></div>`);
    return b.length ? `<div class="dock"><div class="btns">${b.join("")}</div></div>` : "";
  }
  // Vacuum popup: same shortcuts as the morning screen, available at any hour + vacuum state and battery.
  popup() {
    if (this._pop !== "vac") return "";
    const c = this._config, V = this.vac, v = V && this.st(V.entity), bat = V && this.num(V.battery);
    const FR = { docked: "à la base", cleaning: "nettoie", returning: "retourne à la base", idle: "en attente", paused: "en pause", error: "erreur" };
    const sh = c.shortcuts.map((x) => `<div class="btn tap big" data-act="toggle" data-e="${this.esc(x.entity)}">${this.ic(x.icon)}<span>${this.esc(x.name)}</span></div>`).join("");
    const ctl = V ? `<div class="btn tap" data-act="vac_home" data-e="${this.esc(V.entity)}">${this.ic("mdi:home-import-outline")}<span>${this.esc(this.t("wallpanel.return_to_base"))}</span></div>
      <div class="btn tap" data-act="vac_stop" data-e="${this.esc(V.entity)}">${this.ic("mdi:stop")}<span>${this.esc(this.t("wallpanel.stop"))}</span></div>` : "";
    return `<div class="pop" data-act="close"><div class="sheet" data-stop="1"><div class="shead"><span>${this.ic("mdi:robot-vacuum")} ${this.esc((V && V.name) || this.t("wallpanel.vacuum"))}</span><span class="r">${v ? this.esc(this.own(FR, v.state) ? this.t(this.own(FR, v.state)) : v.state) : ""}${bat !== null && bat !== undefined ? ` · ${Math.round(bat)} %` : ""}</span>
      <span class="x tap" data-act="close">${this.ic("mdi:close")}</span></div><div class="btns" style="flex:1 1 auto">${sh}</div><div class="btns" style="flex:0 0 calc(var(--u)*13)">${ctl}</div></div></div>`;
  }

  // ---------------------------------------------------------------- rendu
  _hideHeader() {
    if (!this._config.hide_header || new URLSearchParams(location.search).get("header") === "1" || this._kiosk) return;
    try {
      const r = document.querySelector("home-assistant").shadowRoot.querySelector("home-assistant-main").shadowRoot.querySelector("ha-panel-lovelace").shadowRoot.querySelector("hui-root").shadowRoot;
      const st = document.createElement("style"); st.id = "sf-ns-kiosk";
      st.textContent = ".header, .toolbar { display:none !important } #view { min-height:100vh !important; height:100vh !important; padding-top:0 !important; margin-top:0 !important } hui-view-container { padding-top:0 !important }";
      r.appendChild(st); this._kiosk = st;
    } catch (e) { /* different HA structure: we leave the bar visible */ }
  }
  _render() {
    const c = this._config, miss = SF_REQ["sf-ns-card"](c);
    this.dir = this.lang === "ar" ? "rtl" : "ltr";
    const th = this._theme(); if (this.getAttribute("theme") !== th) this.setAttribute("theme", th);
    if (miss.length) {   // nothing useful to display: same "Card to be completed" message as the other cards
      const h0 = `<style>${SF_CSS}</style>` + this.frame(this.esc(this.t("common.card_to_complete")), "", `<div style="color:${SF_C.amber};line-height:1.6">${miss.map((m) => `• ${this.esc(this.t(m))}`).join("<br>")}</div>`);
      if (h0 !== this._key) { this._key = h0; this.shadowRoot.innerHTML = h0; }
      return;
    }
    const mode = this.mode(), M = SF_NS_MODES[mode];
    this._mode = mode; this._hideHeader();
    // a single alert line (the most serious first) so the screen is never crowded; "+N" if there are others
    const al = this.alerts().sort((x, y) => (x.warn ? 1 : 0) - (y.warn ? 1 : 0)), a0 = al[0], more = al.length - 1;
    const alerts = a0 ? `<div class="alerts"><div class="alert tap ${a0.warn ? "warn" : ""}" data-info="${this.esc(a0.e)}">${this.ic(a0.i)}<span>${this.esc(a0.t)}</span>${more > 0 ? `<em>+${more}</em>` : ""}</div></div>` : "";
    const H = (n) => `calc(var(--u)*${n})`; let main = "", grid = "";
    if (mode === "Matin") { main = this.weatherBlock() + this.carsBlock() + this.pills(c.rooms) + this.shortcuts(); grid = "grid-template-columns:1fr 1fr;grid-template-rows:1.15fr 1fr"; }
    else if (mode === "Jour") { const e = this.energyBlocks(); main = (e ? e.join("") : "") + this.pills(c.fridge, true); grid = `grid-template-columns:1.2fr 1fr;grid-template-rows:1fr ${H(12.5)}`;
      if (!e) { main = this.pills(c.fridge); grid = "grid-template-columns:1fr"; } else if (!c.fridge.length) { grid = `grid-template-columns:1.2fr 1fr;grid-template-rows:1fr ${H(12.5)}`; } }
    else if (mode === "Soir") { const dy = this.dayBlock(); main = this.tilesBlock() + dy + this.carsMini(); grid = `grid-template-columns:1fr;grid-template-rows:1fr ${dy ? H(11) + " " : ""}${H(10.5)}`; }
    else { const n = this.sentinel(); main = n[0] + `<div class="nrow">${n[1]}</div>`; grid = `grid-template-columns:1fr;grid-template-rows:1fr ${H(15)}`; }
    const html = `<style>${SF_NS_CSS}.pop{position:absolute;inset:0;z-index:5;background:rgba(2,6,12,.82);display:flex;align-items:center;justify-content:center;padding:calc(var(--u)*3)}
      .sheet{width:100%;height:100%;display:flex;flex-direction:column;gap:calc(var(--u)*2);padding:calc(var(--u)*2.4);border-radius:calc(var(--u)*3);border:1px solid var(--a);background:#06101d;box-shadow:0 0 calc(var(--u)*6) rgb(var(--sf-cyan-rgb) / .25)}
      .shead{display:flex;align-items:center;gap:calc(var(--u)*2);font-family:Orbitron,sans-serif;font-weight:700;font-size:calc(var(--u)*3.4);letter-spacing:.14em;text-transform:uppercase;color:var(--a)}
      .shead ha-icon{--mdc-icon-size:calc(var(--u)*5)} .shead .r{margin-left:auto;font-family:'B612 Mono',monospace;font-weight:400;font-size:calc(var(--u)*2.6);letter-spacing:.04em;text-transform:none;color:#9fc3d9}
      .shead .x{width:calc(var(--u)*8);height:calc(var(--u)*8);display:flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid rgb(var(--sf-fg-rgb) / .2);color:#fff}
      .btn.big ha-icon{--mdc-icon-size:calc(var(--u)*11)} .btn.big{font-size:calc(var(--u)*2.8)} .nrow{display:grid;grid-template-columns:1fr 1fr 1.3fr;gap:calc(var(--u)*1.7);min-height:0} .nrow>.panel{min-height:0}</style>
      <div class="ns ${mode.toLowerCase()}${this._kiosk ? " full" : ""}${a0 ? " tight" : ""}" style="--a:${M.a};--bg:${M.bg}">${this.hero(mode)}${alerts}<div class="main" style="${grid}">${main}</div>${mode === "Nuit" ? "" : this.dock()}${this.popup()}</div>`;
    // no rewrite if nothing changed (otherwise animations and long presses would be cut); the time is excluded from the comparison
    const key = html.replace(/<div class="hm">[^<]*<\/div>/, "").replace(/left:[\d.]+%/, "");
    if (key === this._key) { this._tick(); return; }
    this._key = key;
    this.shadowRoot.innerHTML = html;
    this._bind();
    this._a11yNs(this.shadowRoot);
  }
  // Clickable elements: real buttons for the keyboard and screen readers (role, focus, name, Enter / Space).
  _a11yNs(root) {
    root.querySelectorAll("[data-act], [data-info]").forEach((el) => {
      if (el.dataset.act === "close" && el.classList.contains("pop")) return;   // the popup background is not a button
      el.setAttribute("role", "button"); el.setAttribute("tabindex", "0");
      if (!el.getAttribute("aria-label")) {
        const lab = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 90) || (el.dataset.e || el.dataset.info || "").slice(0, 90);
        if (lab) el.setAttribute("aria-label", lab);
      }
      el.addEventListener("keydown", (ev) => { if (ev.target !== el) return; if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); if (!ev.repeat) el.click(); } });
    });
  }
}

