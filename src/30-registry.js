const SF_DEFS = [
  ["sf-alert-card", SfAlertCard, "SF · Alert", "Big warning card: green when all is well, red on a water leak, doorbell, alarm or power cut."],
  ["sf-hangar-card", SfHangarCard, "SF · Vehicles (EV charging)", "Your electric car(s) and their charger: charge level, range and charging mode."],
  ["sf-machines-card", SfMachinesCard, "SF · Device tiles", "Small tiles for any device: a value that turns orange, then red, past the limits you set, or an on/off switch with a timer."],
  ["sf-bridge-card", SfBridgeCard, "SF · Welcome banner", "Top banner: clock, weather, who is home and alerts. For a whole dashboard: Settings > Dashboards > Add dashboard > SF · Home (automatic)."],
  ["sf-reactor-card", SfReactorCard, "SF · Energy flow", "Live power of solar, grid, battery and devices. Set up the Energy dashboard first."],
  ["sf-climate-card", SfClimateCard, "SF · Climate", "One dial per room for thermostats and air conditioners. To set a target here, create one Number helper per room first."],
  ["sf-console-card", SfConsoleCard, "SF · Controls", "Buttons you group yourself: lights, shutters, scripts, vacuum. For lights room by room, use SF · Room."],
  ["sf-camera-card", SfCameraCard, "SF · Cameras", "Several cameras side by side, with optional motion / person markers."],
  ["sf-setpoints-card", SfSetpointsCard, "SF · Target temperatures table", "Advanced. Table of day / night target temperatures. Needs one Number helper per temperature."],
  ["sf-ledger-card", SfLedgerCard, "SF · Energy by device", "Energy and cost per device. Needs an energy sensor and a cost sensor for each device."],
  ["sf-launcher-card", SfLauncherCard, "SF · Popup tiles", "Small tiles that each open a card in a popup. Made for phones."],
  ["sf-cells-card", SfCellsCard, "SF · Device batteries", "Batteries of your sensors and remotes, weakest first."],
  ["sf-battery-card", SfBatteryCard, "SF · Home battery", "Your solar storage battery: level, flow, time left and daily energy."],
  ["sf-radiators-card", SfRadiatorsCard, "SF · Radiators", "Heaters with presets (eco, comfort…). Not sure? Try SF · Climate."],
  ["sf-ns-card", SfNsCard, "SF · Wall tablet screen", "A ready-made screen for a wall tablet (e.g. Sonoff NSPanel Pro) that changes with the time of day."],
  ["sf-trend-card", SfTrendCard, "SF · Trend graph", "Line graph of temperature, power or any sensor over the last hours or days, with range buttons (read-only)."],
  ["sf-assistant-card", SfAssistantCard, "SF · Assistant status", "What a voice assistant is doing: last request, action, result and reply (read-only, works with Assist satellites)."],
  ["sf-health-card", SfHealthCard, "SF · Health checks", "One green / orange / red verdict from the checks you define, with the problems listed by importance."],
  ["sf-host-card", SfHostCard, "SF · Server monitor", "CPU, GPU, memory, disk and network of a computer or server (read-only)."],
  ["sf-upkeep-card", SfUpkeepCard, "SF · Upkeep", "When filters and other things to maintain are due. Needs an entity with a level, a time left or a last service date."],
  ["sf-air-card", SfAirCard, "SF · Fresh air", "Should I open the windows? One verdict per room from indoor and outdoor air."],
  ["sf-automations-card", SfAutomationsCard, "SF · Automations", "Which of your automations are broken, silent or disabled, with a 24 h activity chart."],
  ["sf-cycles-card", SfCyclesCard, "SF · Appliance cycles", "Washing machine style cycle (running, finished, cost) from a smart plug that measures power."],
  ["sf-room-card", SfRoomCard, "SF · Room", "One room: temperature, air, presence, lights, shutters and scenes, found from its Home Assistant area (Settings > Areas)."],
  ["sf-media-card", SfMediaCard, "SF · Media", "What is playing and the remote: cover art, progress, previous / play / next, volume."],
  ["sf-weather-card", SfWeatherCard, "SF · Weather and clock", "Large clock and date, current conditions, the next hours and the next days."],
  ["sf-agenda-card", SfAgendaCard, "SF · Agenda", "Running timers, pinned reminders (waste collection…) and the next calendar events, grouped by day."],
  ["sf-report-card", SfReportCard, "SF · Energy report", "The week, month or year in review: consumption, solar, cost, who consumes, and an image to share."],
  ["sf-timeline-card", SfTimelineCard, "SF · Timeline", "Latest state changes of the chosen entities, grouped by day, in plain words (read-only)."],
];
// Cards cheap enough to draw a live preview in the card picker: they read hass.states only (no history, logbook or statistics request;
// the room card is left out: its large size reads the temperature history).
const SF_PREVIEW = new Set(["sf-bridge-card", "sf-climate-card", "sf-console-card", "sf-media-card", "sf-alert-card", "sf-cells-card", "sf-radiators-card"]);
// The picker's texts follow the language of the Home Assistant profile. The language files load on demand, so the first read may still be English.
function sfPickerText(key, english) {
  try {
    const ha = document.querySelector("home-assistant"), lang = sfLang(ha && ha.hass);
    if (!Object.prototype.hasOwnProperty.call(SF_T, key)) return english;
    if (!sfI18nHas(lang)) sfI18nLoad(lang).catch(() => {});
    return sfTr(lang, key);
  } catch (e) { return english; }
}
window.customCards = window.customCards || [];
for (const [tag, cls, name, description] of SF_DEFS) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  // the card picker lists the friendly name instead of the original themed one (which keeps working in YAML)
  const shown = SF_ALIAS_REV[tag] || tag;
  // preview: the card picker draws the card live (filled by getStubConfig) for the cards that only read states; documentationURL: the "?" link of the editor.
  if (!window.customCards.some((c) => c.type === shown)) {
    const entry = { type: shown, preview: SF_PREVIEW.has(tag), documentationURL: `https://github.com/khrom06/SF-Cards#${shown}` }, key = "picker." + tag.replace(/^sf-|-card$/g, "").replace(/-/g, "_");
    // name and description are read when the picker opens: in the language of the user's profile once its texts are loaded (the English text below until then)
    Object.defineProperty(entry, "name", { enumerable: true, get: () => sfPickerText(key + "_name", name) });
    Object.defineProperty(entry, "description", { enumerable: true, get: () => sfPickerText(key + "_desc", description) });
    window.customCards.push(entry);
  }
}
// `phone: tile` (src/22a-phone-tile.js): while a card is a tile, it asks the sections grid for a tile's size (two per row on a phone).
// Without the option, or on a wide screen, the card's own sizes are returned untouched.
const SF_SIZE_ORIG = {};   // the sizes before the phone wrappers (tests compare against them)
for (const [tag, cls] of SF_DEFS) {
  if (SF_PHONE_NO.has(tag)) continue;
  const gg = cls.prototype.getGridOptions, gs = cls.prototype.getCardSize;
  SF_SIZE_ORIG[tag] = { gg, gs };
  if (typeof gg === "function") cls.prototype.getGridOptions = function () { return this._config && this._config.phone === "tile" && sfPhoneOn(this) ? { columns: 6, rows: "auto", min_columns: 3 } : gg.call(this); };
  if (typeof gs === "function") cls.prototype.getCardSize = function () { return this._config && this._config.phone === "tile" && sfPhoneOn(this) ? 2 : gs.call(this); };
}
for (const [alias, canon] of Object.entries(SF_ALIAS)) {
  const def = SF_DEFS.find((d) => d[0] === canon);
  if (def && !customElements.get(alias)) customElements.define(alias, class extends def[1] {});
}

