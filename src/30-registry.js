const SF_DEFS = [
  ["sf-alert-card", SfAlertCard, "SF · Alert", "Full-frame red alert: leaks, doorbell, alarm, power cut."],
  ["sf-hangar-card", SfHangarCard, "SF · Vehicles", "EV(s) and shared charger with charge-mode selector."],
  ["sf-radar-card", SfRadarCard, "SF · Presence radar", "Presence from three never-merged sources."],
  ["sf-machines-card", SfMachinesCard, "SF · Equipment", "Status tiles: values with thresholds, toggles with timers."],
  ["sf-bridge-card", SfBridgeCard, "SF · Welcome banner", "Clock, weather, tariff, anomalies, presence."],
  ["sf-reactor-card", SfReactorCard, "SF · Energy", "Energy flow around an animated core."],
  ["sf-climate-card", SfClimateCard, "SF · Climate", "Rooms, setpoints, house mode."],
  ["sf-console-card", SfConsoleCard, "SF · Controls", "Grouped controls: lights, covers, scripts, vacuum."],
  ["sf-camera-card", SfCameraCard, "SF · Cameras", "Camera mosaic with reticle."],
  ["sf-setpoints-card", SfSetpointsCard, "SF · Setpoints", "Setpoint matrix per room."],
  ["sf-ledger-card", SfLedgerCard, "SF · Summary", "Consumption per device and period."],
  ["sf-launcher-card", SfLauncherCard, "SF · Popups", "Summary tiles that open each panel in a popup (phones)."],
  ["sf-cells-card", SfCellsCard, "SF · Batteries", "Weakest sensor batteries first."],
  ["sf-battery-card", SfBatteryCard, "SF · Battery", "Home battery: level, flow, estimated time, daily energy, mode."],
  ["sf-radiators-card", SfRadiatorsCard, "SF · Radiators", "Radiators with presets, setpoint and daily energy."],
  ["sf-ns-card", SfNsCard, "SF · Full-screen panel", "Full-screen panel for a wall tablet / NSPanel Pro that changes with the time of day."],
  ["sf-trend-card", SfTrendCard, "SF · Trend", "History curves (read-only) with range buttons, several series or one line per series."],
  ["sf-assistant-card", SfAssistantCard, "SF · Assistant", "State of an assistant: phase, last request, action, result, reply (read-only, works with Assist satellites)."],
  ["sf-health-card", SfHealthCard, "SF · Health", "Overview of your checks: overall verdict and anomalies by severity (rules defined by you)."],
  ["sf-timeline-card", SfTimelineCard, "SF · Timeline", "Latest state changes of the chosen entities, grouped by day, in plain words (read-only)."],
];
window.customCards = window.customCards || [];
for (const [tag, cls, name, description] of SF_DEFS) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  if (!window.customCards.some((c) => c.type === tag)) window.customCards.push({ type: tag, name, description });
}

