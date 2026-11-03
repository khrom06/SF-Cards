// Colour tokens. `SF_C.*` are CSS references (var(--sf-*)) usable in any style / CSS template; the palettes themselves (dark, light) are the
// custom properties set on :host below, so that a card re-colours itself by changing `theme`, without any filter. `*-rgb` tokens are
// space-separated channels for translucent variants: rgb(var(--sf-cyan-rgb) / .25).
const SF_C = {
  cyan: "var(--sf-cyan)", amber: "var(--sf-amber)", red: "var(--sf-red)", green: "var(--sf-green)",
  grey: "var(--sf-grey)", text: "var(--sf-text)", dim: "var(--sf-dim)",
};
const SF_VARS_DARK = `--sf-cyan:#00e5ff; --sf-amber:#ffb300; --sf-red:#ff3355; --sf-green:#2bff88; --sf-grey:#5b6b7d; --sf-text:#cfefff; --sf-dim:#7fa3bd;
    --sf-cyan-rgb:0 229 255; --sf-amber-rgb:255 179 0; --sf-red-rgb:255 51 85; --sf-green-rgb:43 255 136; --sf-fg-rgb:255 255 255; --sf-strong:#fff; --sf-white:#fff;`;

const SF_CSS = `
  :host { display:block; ${SF_VARS_DARK} }
  .lbl, .kpi, .foot > div, .stats > div, .fl3 > div, .tile { min-width:0; overflow-wrap:anywhere; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; scroll-behavior:auto !important; } }
  [role="button"]:focus-visible, .tile:focus-visible { outline:2px solid ${SF_C.cyan}; outline-offset:2px; border-radius:6px; }
  @media (pointer: coarse) { .btn { min-height:40px; } }
  /* Light theme: the same card with inverted luminosity (hues are kept); images get their real colours back. */
  :host([theme="light"]) { filter: invert(1) hue-rotate(180deg); }
  :host([theme="light"]) img, :host([theme="light"]) video, :host([theme="light"]) canvas { filter: invert(1) hue-rotate(180deg); }
  :host([dir="rtl"]) svg, :host([dir="rtl"]) .stage, :host([dir="rtl"]) .core, :host([dir="rtl"]) .dial, :host([dir="rtl"]) .ring, :host([dir="rtl"]) .gauge .ring { direction:ltr; }
  .hud { position:relative; overflow:hidden; border-radius:14px; padding:16px 18px 18px;
    background: radial-gradient(ellipse at 50% -20%, #0d2440 0%, #06101d 60%, #03080f 100%);
    border:1px solid rgb(var(--sf-cyan-rgb) / .22); color:${SF_C.text};
    font-family:'B612 Mono', ui-monospace, monospace; font-size:13px;
    box-shadow: inset 0 0 40px rgb(var(--sf-cyan-rgb) / .06), 0 0 22px rgb(var(--sf-cyan-rgb) / .07); }
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
