/*!
 * SF Cards — sci-fi "HUD" cards for Home Assistant (Lovelace).
 * https://github.com/khrom06/SF-Cards  ·  MIT License
 *
 * Written by Claude (Anthropic) from ideas, requests and feedback by khrom06 (and Claude's own).
 *
 * Cards (all with a visual editor):
 *   custom:sf-bridge-card    — welcome banner: clock, weather, tariff (peak / off-peak), anomalies
 *   custom:sf-reactor-card   — energy flow around an animated core (solar, grid, devices)
 *   custom:sf-climate-card   — rooms with dial, target temperature, house mode, extra buttons
 *   custom:sf-console-card   — grouped controls: lights, dimmers, covers, vacuum, scripts, sensors
 *   custom:sf-launcher-card  — summary tiles that open any card (SF, standard HA or custom) in a popup (made for phones)
 *   custom:sf-alert-card     — full-frame red alert: leaks, doorbell, alarm, power cut
 *   custom:sf-hangar-card    — EV(s) + shared charger, charge-mode selector, energy flows
 *   custom:sf-machines-card  — status tiles (values with thresholds, on/off, toggles with timers)
 *   custom:sf-cells-card     — weakest sensor batteries first
 *   custom:sf-battery-card   — home battery: level, flow, estimated time, daily energy, mode
 *   custom:sf-radiators-card — radiators: presets, setpoint, daily energy
 *   custom:sf-camera-card    — camera mosaic with motion / person overlay
 *   custom:sf-setpoints-card — setpoint matrix per room (+ / −)
 *   custom:sf-ledger-card    — consumption per device and period
 *   custom:sf-radar-card     — presence from three never-merged sources (advanced)
 *   custom:sf-ns-card        — full-screen panel for a wall tablet / NSPanel Pro (480 x 480) that changes with the time of day
 *
 * Fonts (Orbitron, B612 Mono — SIL Open Font License 1.1) are embedded below: no network access needed.
 * Note: the French text of each label is also its translation key (see the i18n tables); code comments are in English.
 *       This file is built from src/ (node scripts/build.mjs) — edit the modules in src/, not this file.
 */

