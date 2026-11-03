# Changelog

All notable changes to SF Cards. Versions follow [semantic versioning](https://semver.org/).

## [Unreleased]
### Changed
- The library is now written as modules in `src/` and built into the single `dist/sf-cards.js` (byte-for-byte concatenation); `./test/run.sh` also checks 440 render snapshots (every card, language and theme) so that behaviour-preserving refactorings can be proven.
### Added
- **Friendly card names**: `sf-energy-flow-card` (was `sf-reactor-card`), `sf-vehicles-card` (`sf-hangar-card`), `sf-home-banner-card` (`sf-bridge-card`), `sf-controls-card` (`sf-console-card`), `sf-presence-card` (`sf-radar-card`). The original names keep working (same card, options and editor); the card picker lists the friendly names.

## [1.12.0]
### Added
- `sf-trend-card`: **forecast against reality**. `window: today` (local midnight to midnight, with a "now" marker and a "Today" range button), per-series `attribute` (draws, dashed, a time-indexed attribute of the entity's current state, e.g. the `watts` forecast of a solar-forecast sensor) and per-series `factor` (e.g. 1000 to compare a kW sensor with a forecast in W). The attribute read is bounded (5,000 entries).
- `sf-machines-card`: **mini-curves** in `value` / `percent` tiles (`spark: true` = 24 h, or a number of hours, 1 to 168). Grouped requests (one per distinct duration), refreshed every 5 minutes, at most one retry per minute after an error.
- `sf-launcher-card`: **health tile** (`summary: health`): verdict of a health card's checks on the tile, red and pulsing when a critical check fails.

## [1.11.1]
### Fixed
- `sf-trend-card`: a series that did not change during the window (only its start state is returned) is now drawn as a flat line up to now instead of nothing ("No data").
### Added
- `sf-trend-card`: per-series `axis: right` — a second scale on the right so that, e.g., the outdoor temperature no longer flattens the indoor curves.
- `sf-timeline-card`: per-entity `states` (only show these states) and `min_gap` (minutes between two events of the entity) to tame flickering detectors.

## [1.11.0]
### Added
- `sf-assistant-card`: **state of an assistant**, read-only — phase (idle / listening / thinking / running / replying / error), last request, current action, result, last reply, optional action buttons. Works out of the box with Assist satellites; `phases` maps any other entity. Text capped, ages refreshed every minute, visual editor and 11 languages included.
- `sf-launcher-card`: **adaptive mode** — `mode_entity` + per-tile `modes`: tiles matching the current mode (Morning / Day / Evening / Night…) move first and are highlighted. No effect without `mode_entity` (existing dashboards are unchanged).
- `sf-health-card`: **overview of your own checks**. You list entities and what is normal for each (`ok` / `bad` states, `min` / `max`, `stale` minutes); the card gives one verdict (all good / warning / critical) and the anomalies, critical first, grouped by subsystem. Decides nothing (applies your rules to existing states, no request), age checks re-evaluated every minute. Visual editor and 11 languages included.
- `sf-timeline-card`: **timeline** of the latest state changes of the chosen entities (logbook), grouped by day, in plain words per entity type (door open / closed, motion, leak, alarm armed / triggered, lock, presence…), alerts coloured, identical consecutive events merged. Read-only, failure-safe (one retry per minute at most), visual editor and 11 languages included.
- `sf-trend-card`: **history curves** (read-only). Several series on one chart (same unit) or one line each, range buttons (default 6 h / 24 h / 7 d), hover / touch readout, long-term statistics beyond 48 h with fallback to the history. Failure-safe: at most one retry per minute, bounded point count, entity ids validated. Visual editor and 11 languages included.
### Fixed
- Card editor: cards nested in a panel (launcher) now get `hass` updates in their own editor.
- Every card now calls the base `disconnectedCallback`, so timers never stack or outlive a card when HA moves it in edit mode.

## [1.10.1]
### Fixed
- Card editor: choosing an entity could freeze the page (browser tab or iOS app). The red "required field" marking re-triggered its own observer in an endless loop because `:scope > style` never matches inside a shadow root. Regression test added.
- `sf-ns-card`: a failing hourly-forecast subscription (weather entity without hourly forecast, unavailable…) was retried on every `hass` update, i.e. several times per second. It is now retried at most once a minute.

## [1.10.0]
### Added
- `sf-setpoints-card`: **setpoint editor**. Tap a value to open an editor with a slider and large − / + buttons (range and step read from the `input_number`), then *Apply*. Choose the scope: this value only, the whole program (column) or the whole room (row). Works on phones, where the inline − / + buttons are hidden. 6 new translated strings (11 languages).

## [1.9.1]
### Fixed
- Seasonal theme: the welcome banner (`sf-bridge-card`) now gets the decoration too.

## [1.9.0]
### Added
- **Seasonal themes**, automatic by date, on every card: Halloween (20 Oct – 1 Nov: orange accents, cobweb and pumpkin) and Christmas (1 – 26 Dec: red accents, tree and snow). The wall-panel card gets a full theme (pumpkin, flying bat, falling snow; never at night). Turn off with `events: false` on a card or `window.SF_EVENTS = false`; preview with `?event=halloween|noel`. Respects *reduce motion*; red alerts keep their red.

## [1.8.1]
### Added
- Continuous validation (HACS action + render tests), live demo page, contributing guide and issue templates. No change to the cards.

## [1.8.0]
### Added
- **`sf-ns-card` — full-screen panel** (16th card) for a wall tablet or a **Sonoff NSPanel Pro** (480 × 480): one screen that changes with the time of day — **Morning** (weather with a 12-hour rain strip and a "rain in 40 min" / "dry for 12 h" message, vehicles, room temperatures, shortcuts), **Day** (solar core, rich Home / Charger / Grid tiles with the two biggest consumers, charger current and solar share, peak / off-peak price and cost per hour, fridge and freezer), **Evening** (ambience tiles, daily summary: kWh, estimated cost, solar share, comparison with yesterday, vehicle levels) and **Night** (standby sentinel: leaks and locks, "good night" with confirmation). A red alert line (leak, unlocked car, low battery, cold room, warm fridge) slides in at any time; a dock keeps *turn off / shutters / dimmed / vacuum / mode* within reach, and the vacuum popup has your shortcuts, *return to base* and *stop*.
  - Sized in `vmin`, so it stays proportional (tested at 480 × 480 in 11 languages × 4 modes); `--sf-ns-height` overrides the available height; `hide_header: true` hides the Home Assistant top bar (kiosk) and `?header=1` brings it back; `?mode=Evening` previews a mode; the mode follows an optional `input_select` (Morning / Day / Evening / Night, French names accepted too) or the clock; long press opens an entity's details.
  - No default entity, nothing personal: everything comes from the card configuration. Visual editor, 11 languages, light / auto theme, reduce-motion, keyboard access.
  - The daily summary reads hourly long-term statistics of your cumulative energy counters (`energy.day`: `import`, optional `export` and `solar`, optional `hp` / `hc` prices and `hc_hours`).

## [1.7.0]
### Added
- **Light theme**: `theme: dark | light | auto` on every card (editor field included), or once for all cards via the `--sf-theme` CSS variable of your HA theme (re-read when the HA theme changes). `auto` follows the HA theme. In a launcher popup the sheet gets a real light look, SF cards switch to light themselves (no double inversion, snapshots keep their colours) and standard HA cards keep their own look.
- **Accessibility**: clickable elements are real buttons (role, focus ring, Enter / Space, accessible names with spaces between blocks, `aria-pressed`), popups are dialogs (focus in / back, Esc), alert levels spelled out ("critical" / "warning"), `prefers-reduced-motion` respected, larger touch targets on touch screens.
- **Locale-aware numbers and dates**: the decimal separator follows the HA profile language (`20,5` in French), Latin digits for numbers *and* dates (even with `ar-SA`), no thousands separator, plain `-` for negatives. The timestamp tile no longer forces French.
- **Editor — fill from a device**: vehicle, charger and battery editors can pick a HA device and fill the empty fields from its entities (by `device_class`, unit and name). Cautious: ambiguous fields stay empty; hidden entities, 12 V batteries, odometers, connectivity sensors and pause / lock / schedule switches are skipped; it never overwrites a filled field; a notification says how many fields were filled. Needs the entity registry in the frontend (Home Assistant 2023.3+).
- **Vehicles card — wider compatibility**: "plugged in" and "charging" accept `on` / `off` *and* the status words chargers publish (`Charging`, `Connected`, `Plugged in`, `Awaiting start`, `SuspendedEV`, `Charge done`…; case, spaces and dashes ignored), from any entity type. `connected_states` / `charging_states` override the built-in lists (per charger and per car). Without a charging entity, charger power above 50 W counts as charging, and charging implies plugged in.
- **Vehicles card — several chargers**: `chargers: [{ name, connected, charging, power, current, decision, mode }]` (up to 4), each with its own state, power and optional mode selector. Header: *charging* if any charger charges; the launcher tile sums the power. The single `charger:` syntax is unchanged.
- **Vehicles card — up to 3 cars** (was 2), laid out in a row above the chargers.
- **Vehicles card — distance unit**: `distance_unit: auto | km | mi` (`auto` shows the range sensor's own unit; `km` / `mi` converts).
- **Vehicles card — `select` mode entities**: the charge-mode selector works with `select` entities as well as `input_select`.
- **Charger controls (optional)**: `controls: true` shows Start / Stop (`switch`, two taps to stop; `switch_invert` for pause-type switches) and current − / + (`number`, bounded by its min / max or by `current_min` / `current_max`, `current_step`). Nothing changes without `controls: true`.
- **Mandatory fields**: required fields of the visual editors are marked with a red bar and a red asterisk; an amber banner lists what is missing, and a card with nothing useful to show displays "Card to complete" instead of an empty frame.
- **Duplicate resource guard**: if the file is loaded twice (HACS + manual), the first copy stays active and a console warning explains it.

### Changed
- **Behaviour changes to know about**: the vehicles card's info line, mode selector and figure boxes, the energy card's footer boxes and the battery card's blocks are now **centered** (they were left-aligned or spread); a charger counts as *plugged in* when it is charging, and more status words are recognised (`full`, `finished`, `waiting`…), so a status sensor that used those words may now read as plugged in.
- Visual editor: the charger entity pickers are no longer limited to binary sensors; two YAML fields for custom status words; all new fields translated in 11 languages.
- Render tests now also cover the editors, locale numbers, accessibility, themes, charger controls, the device guess, injection attempts (attributes, CSS, texts), hostile states and every fix below. README screenshots refreshed.

### Fixed
- An invalid Home Assistant language (`en_US`, empty…) no longer breaks rendering: it is normalised and falls back to English, for numbers and dates alike.
- Climate card: no more `NaN°` when the room probe is missing and the climate entity has no current temperature.
- The two-tap confirmation (*Stop?*) survives a card refresh (a moving power value redraws the card every few seconds); an armed button announces the confirmation.
- Launcher popups: closing one opened by a direct link no longer navigates back out of the dashboard; closing then opening another tile at once no longer closes it; a popup can no longer reappear (or stay) after its card is removed from the page.
- Vehicles card: a charger power in kW or MW is read correctly (it showed `7 W` for 7.2 kW and ignored the charging state); the English info line no longer has a French space before the colon.
- Battery card: the estimated time can no longer read `1h60`.
- Accessibility: tiles and elements with no target entity are no longer announced as buttons; current − / + only appear when the value is a number.
- Camera card: `refresh` is bounded (1 – 3600 s, 0 or invalid falls back to 5 s) and re-read on every config change.
- Launcher: the tile summaries read the card configuration through the same normalisation as the card itself, so a mistyped card inside a tile no longer empties the whole launcher; a tile `hash` with accents or spaces (`énergie`) now works for the URL, the history and direct links; a launcher with an explicit `theme: dark` keeps its popup cards dark even when the HA theme is light; a card rendered before being attached re-reads its theme once it is.
- Accessibility: icon-only buttons (cover arrows, plug…) get an accessible name; only one confirmation button can be armed at a time.
- Numbers: a tiny negative value no longer reads `-0.00`; `kw()` handles missing values and rounds `999.6 W` up; a power in `mW` (milliwatt) is no longer read as megawatts.
- Layout: German, Dutch and Russian labels no longer overflow the summary and footer boxes on narrow screens (columns can shrink, long words wrap).
- Visual editor: going back to a configuration that was already emitted is no longer ignored, and the emitted YAML no longer gets empty `charger: {}` / `flows: {}` / `chargers: []` entries.
- Regular expressions: a group repeated a fixed number of times (`(a|b){2}`) is accepted; a refused pattern is reported once in the browser console instead of being ignored silently.
- Mistyped configurations (a string where a list is expected, empty entries) no longer crash a card; a Home Assistant object without `states` no longer throws; states such as `constructor` or `__proto__` no longer break the climate, bridge, console or radiators cards.

### Security
- Everything coming from entities (names, states, units, options) and **everything interpolated into an HTML attribute** (ids, services, SVG attributes…) is escaped, as are the vehicle, presence-radar and room labels coming from the configuration. A fuzz test poisons every text field of every card, one at a time.
- **CSS values from the configuration** (`color`, `accent`, `span`) only accept safe forms (hex, colour name, `rgb()` / `hsl()`, `var(--x)`, 1–4 columns); anything else is dropped, so a shared YAML cannot inject styles, tags or URLs. The climate dial range is bounded.
- Image URLs from entities (`entity_picture`) must start with `/`, `http://`, `https://` or be a base64 `data:image/` (PNG, JPEG, GIF, WebP) — never `javascript:`.
- Regular expressions from the configuration (`include_pattern` / `exclude_pattern`) are length-limited, compiled once, and ignored when invalid or when they nest quantifiers (ReDoS freeze). Very long entity names no longer freeze the cards.
- Keyboard activation ignores key repeat (a held key cannot get past the *Stop* confirmation) and no longer triggers a parent through a nested button.
- A service called by a card must look like `domain.service`; popups only create directly custom elements with a valid name (everything else goes through Home Assistant's own card helpers).
- Services reachable from a card are still chosen by the configuration, like Home Assistant's own `call-service` tap action: **read any YAML you copy from the internet before pasting it** (mentioned in the README).

## [1.6.0]
### Added
- **Several batteries**: `sf-battery-card` and the energy card accept `batteries: [{ name, soc, power, capacity_kwh, invert }]`. Overall level weighted by capacity (simple average if a capacity is missing), summed power, total capacity for the time estimate, one row per battery under the ring. An unavailable battery is left out of the average. The energy card still shows a single battery node.
- Visual editor: a "Batteries" list on both cards, translated in all 11 languages.

### Changed
- **Energy card on phones**: solar now sits above the core (like on wide screens) instead of beside it; the grid stays on the side. Without solar, the core moves up.
- Fixed a first-frame glitch: before it knew its width, the energy card briefly drew the wide-screen layout on phones.
- The single-battery fields (`soc`, `power`, `capacity_kwh`, `battery_soc`, `battery_power`) are unchanged and keep working.
- Render tests check that solar is above the core at both widths, and cover the multi-battery maths (weighted level, summed power, fallback, unavailable battery) and the launcher summary.

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
