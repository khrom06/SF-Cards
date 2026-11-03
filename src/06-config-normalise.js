const SF_LIST_KEYS = ["leaks", "doors", "people", "rooms", "cars", "chargers", "devices", "tiles", "rows", "groups", "cameras", "extras", "batteries", "radiators",
  "exclude", "connected_states", "charging_states", "hc_windows", "home_states", "fridge", "shortcuts", "lights_off", "series", "checks"];
// CSS values coming from the configuration (`color`, `accent`, `span`): only safe forms pass (hex, colour name, rgb()/hsl(), var(--x),
// number of columns); otherwise the key is removed and the card falls back to its default (no style, tag or URL injection).
const SF_COLOR_OK = /^(#[0-9a-f]{3,8}|[a-z]{3,20}|(?:rgb|hsl)a?\([\d\s.,%\/-]{3,40}\)|var\(--[\w-]{1,40}\))$/i;
function sfCleanCss(o) {
  if (Array.isArray(o)) return o.map(sfCleanCss);
  if (o && typeof o === "object") {
    const r = Object.create(null);
    for (const [k, v] of Object.entries(o)) {
      if (k === "__proto__") continue;
      if ((k === "color" || k === "accent") && typeof v !== "object") { if (SF_COLOR_OK.test(String(v).trim())) r[k] = String(v).trim(); continue; }
      if (k === "span") { const n = Math.floor(Number(v)); if (n >= 1 && n <= 4) r[k] = n; continue; }
      r[k] = sfCleanCss(v);
    }
    return r;
  }
  return o;
}
function sfNormConfig(tag, c) {
  c = sfCleanCss(c);
  if (tag === "sf-climate-card") {   // dial range bounded (otherwise millions of SVG ticks would freeze the tab)
    const lo = Number(c.min), hi = Number(c.max);
    if (!isFinite(lo) || !isFinite(hi) || hi <= lo || hi - lo > 100 || Math.abs(lo) > 1000) { c.min = 15; c.max = 30; }
  }
  const keys = tag === "sf-setpoints-card" ? [...SF_LIST_KEYS, "columns"] : SF_LIST_KEYS;
  for (const k of keys) if (k in c) { const v = c[k]; c[k] = Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined && x !== "") : (v === null || v === undefined || v === "" ? [] : [v]); }
  for (const k of ["charger", "flows", "energy"]) if (k in c && (!c[k] || typeof c[k] !== "object" || Array.isArray(c[k]))) c[k] = {};
  for (const k of ["chargers", "cars", "batteries", "radiators", "people", "rooms", "devices", "tiles", "rows", "groups", "cameras", "extras", "hc_windows", "fridge", "shortcuts"]) if (Array.isArray(c[k])) c[k] = c[k].filter((x) => x && typeof x === "object");
  if (c.charger && typeof c.charger === "object") for (const k of ["connected_states", "charging_states"]) if (k in c.charger && !Array.isArray(c.charger[k])) c.charger = { ...c.charger, [k]: c.charger[k] ? [c.charger[k]] : [] };
  return c;
}
// An image URL coming from an entity (hence from a third party) is only used if it is safe: relative, http(s) or data:image — never javascript:.
// Regular expression coming from the configuration: ignored if too long, invalid or with nested quantifiers (e.g. `(a+)+`, `(.*)*`) that
// could freeze the browser (ReDoS). Compiled only once.
// decoded URL #hash ("#%C3%A9nergie" = "énergie"), to compare it with the tiles' `hash`.
// A CSS custom property inside an SVG presentation attribute (stroke="var(--sf-cyan)") is not honoured by every browser engine: the same value is
// copied into the inline style, which always accepts var(). Called after each render of a card.
function sfSvgVars(root) {
  if (!root) return;
  root.querySelectorAll('[stroke*="var("],[fill*="var("],[stop-color*="var("],[flood-color*="var("]').forEach((el) => {
    for (const a of ["stroke", "fill", "stop-color", "flood-color"]) { const v = el.getAttribute(a); if (v && v.includes("var(")) el.style.setProperty(a, v); }
  });
}
function sfHash() { const h = location.hash.slice(1); try { return decodeURIComponent(h); } catch (e) { return h; } }
const _sfRe = {};
function sfRegex(src) {
  if (!src) return null;
  src = String(src);
  if (!(src in _sfRe)) {
    let re = null;
    if (src.length <= 100 && !/\((?:[^()\\]|\\.)*[+*](?:[^()\\]|\\.)*\)(?:[+*]|\{\d+,)/.test(src) && !/\([^()]*\|[^()]*\)(?:[+*]|\{\d+,)/.test(src)) { try { re = new RegExp(src); } catch (e) { re = null; } }
    if (!re) try { console.warn(`SF Cards: pattern ignored (too long, invalid or risky): ${src.slice(0, 60)}`); } catch (e) {}
    _sfRe[src] = re;
  }
  return _sfRe[src];
}
function sfSafeUrl(u) {
  const x = String(u || "").trim();
  return /^(\/(?!\/)|https?:\/\/|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(x) ? x : "";
}
