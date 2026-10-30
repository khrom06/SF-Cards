# Changelog

All notable changes to SF Cards. Versions follow [semantic versioning](https://semver.org/).

## [1.6.0]
### Added
- **Several batteries**: `sf-battery-card` and the energy card accept `batteries: [{ name, soc, power, capacity_kwh, invert }]`. Overall level weighted by capacity (simple average if a capacity is missing), summed power, total capacity for the time estimate, one row per battery under the ring. An unavailable battery is left out of the average. The energy card still shows a single battery node.
- Visual editor: a "Batteries" list on both cards, translated in all 11 languages.

### Changed
- The single-battery fields (`soc`, `power`, `capacity_kwh`, `battery_soc`, `battery_power`) are unchanged and keep working.
- Render tests cover the multi-battery maths (weighted level, summed power, fallback, unavailable battery) and the launcher summary.

## [1.5.0]
### Added
- **Seven new languages**: Dutch, Italian, Portuguese, Polish, Russian, Chinese (simplified) and Arabic — 11 languages in total. Regional variants (`pt-BR`, `zh-Hans`…) fall back to their family.
- **Right-to-left layout** for Arabic (diagrams and dials keep their natural orientation).
- Screenshot of the battery card in the README.

### Changed
- Render tests now cover all 11 languages, the right-to-left switch and regional variants.

## [1.4.0]
### Added
- **Launcher**: a popup can now open **any Home Assistant card** — standard ones (`vertical-stack`, `weather-forecast`, `history-graph`…) as well as other custom cards — not only SF cards.
- **Bridge**: off-peak hours are now a real setting. `hc_windows` takes as many ranges as your contract has (2, 3…); they decide peak / off-peak and the countdown. Without ranges, the card compares `price` with `hc_price`; without either, nothing is guessed and no HP/HC label is shown.
- Automatic render tests (`test/run.sh`): every card, 4 languages, "no solar" and "empty card" scenarios, missing translations, multi-range off-peak logic, popups. Run before each release.

### Changed
- The 22:00–06:00 default off-peak range is gone (it showed wrong tariffs for contracts with other hours).

## [1.3.0]
### Added
- **`sf-battery-card`**: home battery — level ring, charge / discharge, estimated time, daily energy, health, mode selector. Hides itself without `soc` / `power`.
- Energy card: optional battery node (`battery_power`, `battery_soc`, `battery_invert`).
- Launcher summary `battery`.

### Changed
- Anything that is not configured is no longer displayed: solar node and "solar autonomy", fossil share, instant cost, bridge "solar left" and "house mode", hangar flows, ledger solar share and legend.

## [1.2.1]
### Added
- Bridge: `home_states` option (a custom home zone smaller than "Home" was shown as away).

## [1.2.0]
### Added
- **`sf-radiators-card`**: radiators driven by presets, with optional setpoint (turn it off for pilot-wire heaters), presets from a `select` entity, preset labels, daily energy bar, connection warning.

## [1.0.0]
### Added
- First public release: 13 cards (bridge, energy, climate, console, launcher, alert, hangar, machines, cells, camera, setpoints, ledger, radar), visual editors, en / fr / es / de, embedded fonts, optional theme.
