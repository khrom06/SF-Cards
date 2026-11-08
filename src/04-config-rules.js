// HA language (user profile); unsupported language -> English.
/* Required fields: per card, a function that returns the texts (translation keys) of what is missing. Deliberately lenient rules:
 * only a card that would show nothing useful is flagged. The editor shows a banner, the card a "to be completed" message. */
// Friendly tag names (1.13): the original themed names stay valid forever; each friendly tag is a subclass registered under its own name
// (see 30-registry.js) and shares the spec / required-field rules of its original tag.
const SF_ALIAS = { "sf-energy-flow-card": "sf-reactor-card", "sf-vehicles-card": "sf-hangar-card", "sf-home-banner-card": "sf-bridge-card",
  "sf-controls-card": "sf-console-card", "sf-presence-card": "sf-radar-card" };
const SF_ALIAS_REV = Object.fromEntries(Object.entries(SF_ALIAS).map(([a, c]) => [c, a]));
const sfCanon = (tag) => SF_ALIAS[tag] || tag;
const sfHas = (v) => Array.isArray(v) ? v.length > 0 : !!v;
const sfBatUsable = (c) => !!(c.soc || c.power || c.entity || (c.batteries || []).some((b) => b && (b.soc || b.power || b.entity)));
const SF_REQ = {
  "sf-reactor-card": (c) => (c.grid || c.solar || c.battery_soc || c.battery_power || sfHas(c.batteries) || sfHas(c.devices)) ? [] : ["Au moins une source : réseau, solaire, batterie ou appareil"],
  "sf-battery-card": (c) => sfBatUsable(c) ? [] : ["Niveau de charge (%) ou puissance (W) d'au moins une batterie"],
  "sf-climate-card": (c) => (c.rooms || []).some((r) => r && r.climate) ? [] : ["Au moins une pièce avec son thermostat (entité climate)"],
  "sf-hangar-card": (c) => (sfHas(c.cars) || [c.charger, ...(c.chargers || [])].some((x) => x && ["power", "connected", "charging", "current", "switch", "decision", "mode"].some((k) => sfHas(x[k]))) || sfHas(c.mode)) ? [] : ["Au moins une voiture ou une borne (puissance, branché, en charge)"],
  "sf-console-card": (c) => (c.groups || []).some((g) => g && sfHas(g.items)) ? [] : ["Au moins un groupe avec un élément"],
  "sf-machines-card": (c) => sfHas(c.tiles) ? [] : ["Au moins une tuile"],
  "sf-launcher-card": (c) => sfHas(c.tiles) ? [] : ["Au moins une tuile"],
  "sf-radiators-card": (c) => (c.radiators || []).some((r) => r && r.climate) ? [] : ["Au moins un radiateur (entité climate)"],
  "sf-camera-card": (c) => sfHas(c.cameras) ? [] : ["Au moins une caméra"],
  "sf-setpoints-card": (c) => sfHas(c.rows) ? [] : ["Au moins une pièce"],
  "sf-ledger-card": (c) => sfHas(c.devices) ? [] : ["Au moins un appareil"],
  "sf-alert-card": (c) => (sfHas(c.leaks) || sfHas(c.doors) || c.alarm || c.ring || c.power || c.snapshot) ? [] : ["Au moins un capteur : fuite, ouvrant, alarme, sonnette ou tension"],
  "sf-trend-card": (c) => (Array.isArray(c.series) ? c.series : []).some((x) => x && x.entity) ? [] : ["Au moins une série"],
  "sf-timeline-card": (c) => (Array.isArray(c.entities) ? c.entities : []).some((x) => x && (typeof x === "string" ? x : x.entity)) ? [] : ["Au moins une entité"],
  "sf-health-card": (c) => (Array.isArray(c.checks) ? c.checks : []).some((x) => x && x.entity) ? [] : ["Au moins un contrôle"],
  "sf-host-card": (c) => ["cpu", "gpu", "ram", "disk", "gpu_vram"].some((k) => c[k]) ? [] : ["host.need"],
  "sf-assistant-card": (c) => ["state", "request", "action", "result", "reply"].some((k) => c[k]) ? [] : ["Au moins une entité : état, demande, action, résultat ou réponse"],
  "sf-radar-card": (c) => (sfHas(c.people) || sfHas(c.rooms)) ? [] : ["Au moins une personne ou une pièce"],
  "sf-ns-card": (c) => { const e = c.energy || {}; return (c.weather || c.outdoor || e.solar || e.grid || e.home || ["rooms", "fridge", "cars", "tiles", "shortcuts", "leaks"].some((k) => sfHas(c[k]))) ? [] : ["Au moins un élément : météo, énergie, pièce, voiture, tuile ou raccourci"]; },
};
const SF_HOOK = {};   // test hook: called for every translation requested
function sfLang(hass) {
  const l = String((hass && ((hass.locale && hass.locale.language) || hass.language)) || "en").slice(0, 2).toLowerCase();
  return l === "fr" || l in SF_LANGS ? l : "en";
}
function sfTr(lang, key, vars) {
  if (SF_HOOK.tr) SF_HOOK.tr(lang, key);
  // `key` is a neutral id; a French text is still accepted as a legacy key (SF_FR2ID). An unknown key is shown as is (and flagged by the tests).
  const own = Object.prototype.hasOwnProperty, id = own.call(SF_T, key) ? key : own.call(SF_FR2ID, key) ? SF_FR2ID[key] : null;
  let s = key;
  if (id) { const e = SF_T[id]; s = e[SF_LANGS[lang] ?? 1] || e[1] || e[0]; }   // fallback chain: the language, then English, then French
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? "")) : s;
}

