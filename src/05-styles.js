// Colour tokens. `SF_C.*` are CSS references (var(--sf-*)) usable in any style / CSS template; the palettes themselves (dark, light) are the
// custom properties set on :host below, so that a card re-colours itself by changing `theme`, without any filter. `*-rgb` tokens are
// space-separated channels for translucent variants: rgb(var(--sf-cyan-rgb) / .25).
const SF_C = {
  cyan: "var(--sf-cyan)", amber: "var(--sf-amber)", red: "var(--sf-red)", green: "var(--sf-green)",
  grey: "var(--sf-grey)", text: "var(--sf-text)", dim: "var(--sf-dim)",
};
const SF_VARS_DARK = `--sf-cyan:#00e5ff; --sf-amber:#ffb300; --sf-red:#ff3355; --sf-green:#2bff88; --sf-grey:#5b6b7d; --sf-text:#cfefff; --sf-dim:#7fa3bd;
    --sf-cyan-rgb:0 229 255; --sf-amber-rgb:255 179 0; --sf-red-rgb:255 51 85; --sf-green-rgb:43 255 136; --sf-fg-rgb:255 255 255; --sf-strong:#fff; --sf-white:#fff;
    --sf-bg0:#0d2440; --sf-bg1:#06101d; --sf-bg2:#03080f; --sf-bg-rgb:3 8 15; --sf-scrim-rgb:1 4 9; --sf-sheet0:#071426; --sf-shade-rgb:0 0 0; --sf-on-accent:#03080f;
    --sf-alert0:#4a0714; --sf-alert1:#1a0308; --sf-alert2:#0a0104;
    --sf-orange:#ff7a45; --sf-heat:#ff7043; --sf-cool:#4fc3f7; --sf-dry:#ffca28; --sf-fan:#66bb6a; --sf-auto:#b388ff; --sf-pink:#ff4fd8; --sf-yellow:#ffd54f; --sf-halo:#000;`;
// Light palette: accents re-tuned for contrast on a light surface (>= 4.5:1 against white for text), neutral overlays darken instead of lighten.
const SF_VARS_LIGHT = `--sf-cyan:#00798f; --sf-amber:#a85f00; --sf-red:#c8173d; --sf-green:#08783f; --sf-grey:#52687a; --sf-text:#1c3a4e; --sf-dim:#37536a;
    --sf-cyan-rgb:0 121 143; --sf-amber-rgb:168 95 0; --sf-red-rgb:200 23 61; --sf-green-rgb:8 120 63; --sf-fg-rgb:4 40 62; --sf-strong:#04141f; --sf-white:#fff;
    --sf-bg0:#fbfdff; --sf-bg1:#eef5fb; --sf-bg2:#e2edf6; --sf-bg-rgb:255 255 255; --sf-scrim-rgb:206 220 232; --sf-sheet0:#f6fafd; --sf-shade-rgb:40 90 125; --sf-on-accent:#fff;
    --sf-alert0:#ffe1e7; --sf-alert1:#ffd0d9; --sf-alert2:#ffc2ce;
    --sf-orange:#b8430f; --sf-heat:#bf3f16; --sf-cool:#0a6f9c; --sf-dry:#8a6600; --sf-fan:#2a7a2e; --sf-auto:#6a3bc4; --sf-pink:#a80f78; --sf-yellow:#7d6200; --sf-halo:rgb(255 255 255 / .85);`;

const SF_CSS = `
  :host { display:block; height:100%; ${SF_VARS_DARK} }
  :host([theme="light"]) { ${SF_VARS_LIGHT} }
  .lbl, .kpi, .foot > div, .stats > div, .fl3 > div, .tile { min-width:0; overflow-wrap:anywhere; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; scroll-behavior:auto !important; } }
  [role="button"]:focus-visible, .tile:focus-visible { outline:2px solid ${SF_C.cyan}; outline-offset:2px; border-radius:6px; }
  @media (pointer: coarse) { .btn { min-height:40px; } }
  /* Light theme: the same card re-coloured by its custom properties (see SF_VARS_LIGHT). */
  :host([dir="rtl"]) svg, :host([dir="rtl"]) .stage, :host([dir="rtl"]) .core, :host([dir="rtl"]) .dial, :host([dir="rtl"]) .ring, :host([dir="rtl"]) .gauge .ring { direction:ltr; }
  .hud { position:relative; overflow:hidden; border-radius:14px; padding:16px 18px 18px;
    background: radial-gradient(ellipse at 50% -20%, var(--sf-bg0) 0%, var(--sf-bg1) 60%, var(--sf-bg2) 100%);
    border:1px solid rgb(var(--sf-cyan-rgb) / .22); color:${SF_C.text};
    font-family:'B612 Mono', ui-monospace, monospace; font-size:13px;
    box-shadow: inset 0 0 40px rgb(var(--sf-cyan-rgb) / .06), 0 0 22px rgb(var(--sf-cyan-rgb) / .07); }
  /* "fill": the card stretches to the height its cell gives it (cards side by side in a dashboard keep equal heights); only the zone
     marked .grow takes the extra space. Without a taller cell nothing changes; in a cell SHORTER than the content the card scrolls
     instead of cutting controls off. */
  .hud.fill { display:flex; flex-direction:column; height:100%; box-sizing:border-box; overflow-x:hidden; overflow-y:auto; scrollbar-width:thin; }
  .hud.fill > .head { flex:none; }
  .hud.fill > * { min-width:0; }   /* flex items must be able to shrink below their content, like the block children they replace */
  .hud.fill > .grow { flex:1 1 auto; }
  .hud::after { content:""; position:absolute; inset:0; pointer-events:none;
    background: repeating-linear-gradient(0deg, rgb(var(--sf-fg-rgb) / .022) 0 1px, transparent 1px 3px); }
  .c { position:absolute; width:14px; height:14px; border-color:${SF_C.cyan}; border-style:solid; opacity:.8; }
  .c.tl { top:6px; left:6px; border-width:2px 0 0 2px; } .c.tr { top:6px; right:6px; border-width:2px 2px 0 0; }
  .c.bl { bottom:6px; left:6px; border-width:0 0 2px 2px; } .c.br { bottom:6px; right:6px; border-width:0 2px 2px 0; }
  .head { display:flex; align-items:center; gap:10px; margin-bottom:14px;
    font-family:Orbitron, sans-serif; font-weight:700; font-size:12px; letter-spacing:.22em;
    text-transform:uppercase; color:${SF_C.cyan}; text-shadow:0 0 8px rgb(var(--sf-cyan-rgb) / .6); }
  .head .sub { margin-left:auto; font-family:'B612 Mono',monospace; font-weight:400;
    letter-spacing:.08em; font-size:10px; color:${SF_C.dim}; text-shadow:none; }
  .dot { width:8px; height:8px; border-radius:50%; background:${SF_C.cyan};
    box-shadow:0 0 8px ${SF_C.cyan}; animation: blink 1.6s infinite; }
  @keyframes blink { 50% { opacity:.25; } }
  .click { cursor:pointer; }
  .click:hover { filter:brightness(1.25); }
  .muted { color:${SF_C.grey}; }
  .lbl { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:${SF_C.dim}; }
  .val { font-family:Orbitron, sans-serif; font-weight:500; }
  [data-call] { cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent;
    transition: transform .12s, box-shadow .2s, background .2s, border-color .2s, color .2s; }
  [data-call]:active { transform:scale(.95); }
  [data-call].sent { box-shadow:0 0 0 2px ${SF_C.cyan}, 0 0 18px rgb(var(--sf-cyan-rgb) / .7) !important; }
  [data-call].fail { box-shadow:0 0 0 2px ${SF_C.red}, 0 0 18px rgb(var(--sf-red-rgb) / .7) !important; }
  [data-call].armed { border-color:${SF_C.amber} !important; color:${SF_C.amber} !important;
    background:rgb(var(--sf-amber-rgb) / .14) !important; animation: blink .5s infinite; }
  .btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:7px 11px;
    border-radius:8px; border:1px solid rgb(var(--sf-cyan-rgb) / .25); background:rgb(var(--sf-cyan-rgb) / .05);
    color:${SF_C.text}; font-family:'B612 Mono',monospace; font-size:11px; letter-spacing:.06em; }
  .btn:hover { border-color:${SF_C.cyan}; color:var(--sf-strong); }
  .btn.on { border-color:${SF_C.cyan}; background:rgb(var(--sf-cyan-rgb) / .18); color:var(--sf-strong);
    box-shadow: inset 0 0 12px rgb(var(--sf-cyan-rgb) / .25), 0 0 10px rgb(var(--sf-cyan-rgb) / .25); }
  .seg { display:flex; flex-wrap:wrap; gap:6px; }
`;

// A badly typed configuration (a string instead of a list, an empty entry…) must never crash the card: the expected lists
// are normalised (string -> one-element list, empty / null -> empty list, empty items removed). The original configuration is not modified.
