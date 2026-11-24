/* ================================================================ PHONE TILE */
/*
 * One configuration for the desktop and the phone. With `phone: tile`, a card shows itself in full on a wide screen and, on a phone
 * (screen narrower than 768 px, Home Assistant's own "mobile" size), becomes a summary tile that opens the same card in a popup: no copy
 * of the card to keep in sync in a launcher.
 *
 *   phone: tile              # absent (default) or "card": the card is shown in full everywhere, exactly as before
 *   phone_name: Climate      # optional: the tile's title (default: the card's title, or its kind)
 *   phone_icon: mdi:thermostat
 *
 * The tile and its popup are an sf-launcher-card with a single tile, so they behave exactly like a launcher tile (summary, bottom sheet,
 * Back button, #hash link). The popup gets the card's own configuration without the phone_* keys. Not offered on the cards where a tile
 * would hide what must be seen at once (the full-frame alert) or which are already a launcher / a full screen.
 */
const SF_PHONE_NO = new Set(["sf-launcher-card", "sf-ns-card", "sf-alert-card"]);
const SF_PHONE_KEYS = ["phone", "phone_name", "phone_icon"];
const SF_PHONE_MQ = "(max-width: 767px)";
// Card -> the launcher summary that reads its configuration, and the tile's icon.
const SF_PHONE_SUM = { "sf-climate-card": "climate", "sf-hangar-card": "vehicles", "sf-console-card": "commands", "sf-camera-card": "cameras", "sf-reactor-card": "energy", "sf-battery-card": "battery", "sf-machines-card": "machines", "sf-health-card": "health" };
const SF_PHONE_ICON = { "sf-climate-card": "mdi:thermostat", "sf-hangar-card": "mdi:car-electric", "sf-console-card": "mdi:gesture-tap-button", "sf-camera-card": "mdi:cctv", "sf-reactor-card": "mdi:lightning-bolt", "sf-battery-card": "mdi:home-battery",
  "sf-machines-card": "mdi:chip", "sf-health-card": "mdi:heart-pulse", "sf-bridge-card": "mdi:home-variant", "sf-room-card": "mdi:sofa", "sf-media-card": "mdi:music", "sf-weather-card": "mdi:weather-partly-cloudy", "sf-agenda-card": "mdi:calendar",
  "sf-report-card": "mdi:chart-bar", "sf-trend-card": "mdi:chart-line", "sf-timeline-card": "mdi:timeline-clock", "sf-radiators-card": "mdi:radiator", "sf-cells-card": "mdi:battery-alert", "sf-host-card": "mdi:server", "sf-air-card": "mdi:window-open-variant",
  "sf-upkeep-card": "mdi:wrench-clock", "sf-automations-card": "mdi:robot", "sf-cycles-card": "mdi:washing-machine", "sf-ledger-card": "mdi:cash", "sf-setpoints-card": "mdi:thermometer-lines", "sf-assistant-card": "mdi:account-voice" };
// Is this card shown as a tile right now? Only with `phone: tile`, on a card that allows it, on a narrow screen.
function sfPhoneOn(card) {
  const c = card && card._config;
  if (!c || c.phone !== "tile" || SF_PHONE_NO.has(sfCanon(card.localName))) return false;
  let mq = card._sfMq;
  if (!mq) {
    try { mq = card._sfMq = window.matchMedia(SF_PHONE_MQ); } catch (e) { return false; }
    // turning the phone, resizing the window: switch between the tile and the full card
    // HA reads a card's grid size when it creates it: ask it to rebuild the card so the tile / full card gets the right size too
    card._sfMqH = () => { card._lastHtml = null; card._schedule(); try { card.dispatchEvent(new Event("ll-rebuild", { bubbles: true, composed: true })); } catch (e) { /* outside HA */ } };
    try { mq.addEventListener("change", card._sfMqH); } catch (e) { /* very old browsers: decided at load */ }
  }
  return !!mq.matches;
}
function sfPhoneStop(card) {
  if (card._sfMq && card._sfMqH) { try { card._sfMq.removeEventListener("change", card._sfMqH); } catch (e) { /* nothing to remove */ } }
  card._sfMq = null; card._sfMqH = null;
}
// The card's configuration as the user wrote it, without the phone_* keys: what the popup shows.
function sfPhoneInner(card) {
  const raw = card._sfRaw && typeof card._sfRaw === "object" ? card._sfRaw : card._config, out = {};
  for (const k of Object.keys(raw)) if (!SF_PHONE_KEYS.includes(k)) out[k] = raw[k];
  out.type = "custom:" + card.localName;
  return out;
}
function sfPhoneTile(card) {
  const c = card._config, tag = sfCanon(card.localName), inner = sfPhoneInner(card);
  const kind = SF_CARD_NAMES[SF_ALIAS_REV[tag] || tag] || SF_CARD_NAMES[tag];
  const name = [c.phone_name, c.title, c.name].find((x) => typeof x === "string" && x.trim()) || (kind ? card.t(kind) : "SF");
  const js = tag + "|" + name;   // a #hash that stays the same while the card is edited (from its kind and its name only)
  let h = 0; for (let i = 0; i < js.length; i++) h = (h * 31 + js.charCodeAt(i)) | 0;
  const tile = { name, icon: typeof c.phone_icon === "string" && c.phone_icon ? c.phone_icon : SF_PHONE_ICON[tag] || "mdi:open-in-new", summary: SF_PHONE_SUM[tag] || "text",
    hash: "sf-" + tag.replace(/^sf-|-card$/g, "") + "-" + (h >>> 0).toString(36).slice(0, 5), card: inner };
  const L = { tiles: [tile], columns: 1 };
  for (const k of ["theme", "look", "accent"]) if (typeof c[k] === "string" && c[k]) L[k] = c[k];
  return L;
}
// Draws the tile in place of the card (called by SfBase._schedule when sfPhoneOn is true).
function sfPhoneRender(card) {
  const L = sfPhoneTile(card), key = JSON.stringify(L);
  let el = card._sfPhoneEl;
  if (!el || !el.isConnected) {
    card.shadowRoot.innerHTML = "<style>:host{display:block}</style>";
    el = card._sfPhoneEl = document.createElement("sf-launcher-card");
    card.shadowRoot.appendChild(el); card._sfPhoneKey = "";
  }
  if (card._sfPhoneKey !== key) { card._sfPhoneKey = key; el.setConfig(L); }
  el.hass = card._hass;
  card._lastHtml = null;   // back on a wide screen, the full card is written again
}
