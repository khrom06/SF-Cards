# Changelog

All notable changes to SF Cards. Versions follow [semantic versioning](https://semver.org/).

## [1.7.0]
### Added
- **Light theme**: `theme: dark | light | auto` on every card (editor field included), or once for all cards via the `--sf-theme` CSS variable of your HA theme. `auto` follows the HA theme. In a launcher popup the sheet gets a real light look, SF cards switch to light themselves (no double inversion, snapshots keep their colours) and standard HA cards keep their own look; `--sf-theme` is re-read when the HA theme changes.
- **Accessibility**: clickable elements are real buttons (role, focus ring, Enter / Space, accessible names, `aria-pressed`), popups are dialogs (focus in / back, Esc), alert levels spelled out ("critical" / "warning"), `prefers-reduced-motion` respected, larger touch targets on touch screens.
- **Locale-aware numbers**: the decimal separator follows the HA profile language (`20,5` in French), Latin digits, no thousands separator. The timestamp tile no longer forces French.
- **Editor — fill from a device**: vehicle, charger and battery editors can pick a HA device and fill the empty fields from its entities (by `device_class`, unit and name). Never overwrites a filled field; needs the entity registry in the frontend (Home Assistant 2023.3+).
- **Charger controls (optional)**: `controls: true` shows Start / Stop (`switch`, two taps to stop) and current − / + (`number`, bounded). Options: `switch`, `switch_invert`, `current`, `current_step`, `current_min`, `current_max`. Nothing changes without `controls: true`. Per-car `charging_states` accepts the same status words as the charger.
- **Vehicles card — several chargers**: `chargers: [{ name, connected, charging, power, current, decision, mode }]` (up to 4) coexist in one card, each with its own state, power and optional mode selector. Header: *charging* if any charger charges. The launcher tile sums the power. The single `charger:` syntax is unchanged.
- **Vehicles card — up to 3 cars** (was 2), laid out in a row above the chargers.
- **Vehicles card — distance unit**: `distance_unit: auto | km | mi`. `auto` shows the range sensor's own unit; `km` / `mi` converts.
- **Vehicles card — `select` mode entities**: the charge-mode selector now works with `select` entities as well as `input_select`.

### Security
- All text coming from entities (names, states, units) and all entity ids placed in attributes are escaped; the vehicle, presence-radar and room labels coming from the configuration are escaped too; an `entity_picture` URL is only used when it is relative, `http(s)` or `data:image/…` (never `javascript:`); the camera refresh URL handles pictures that carry no query string.
- Keyboard activation ignores key repeat (a held key can no longer get past the *Stop* confirmation) and no longer triggers a parent through a nested button.
- Tests now include a stored-text injection check on several cards.

### Security (second review round)
- **Every value interpolated into an HTML attribute is escaped** (colours, services, spans, ids, SVG attributes…), so a *shared YAML* can no longer break out of an attribute to run code; radar and room labels are escaped too. A fuzz test poisons every text field of every card, one at a time.
- Regular expressions from the configuration (`include_pattern` / `exclude_pattern`) are length-limited, compiled once, and ignored when invalid or when they nest quantifiers (ReDoS freeze). Very long entity names no longer freeze the cards.
- Home Assistant services reachable from a card are still chosen by the configuration (like Home Assistant's own `call-service` tap action): **read any YAML you copy from the internet before pasting it** (mentioned in the README).

### Fixed (second review round)
- Climate card: no more `NaN°` when the room probe is missing and the climate entity has no current temperature.
- The two-tap confirmation (*Stop?*) now survives a card refresh (a moving power value redraws the card every few seconds).
- Launcher popups: closing one that was opened by a direct link no longer navigates back out of the dashboard; closing then opening another tile at once no longer closes it.
- Vehicles card: a charger power in kW or MW is read correctly (it showed `7 W` for 7.2 kW and ignored the charging state).
- Battery card: estimated time can no longer read `1h60`.
- Accessibility: names read by screen readers keep spaces between blocks; tiles without an entity are no longer announced as buttons; current − / + only appear when the value is a number.
- Camera card: `refresh` is bounded (0 no longer loops) and re-read on every config change.
- Mistyped configurations (a string where a list is expected, empty entries) no longer crash a card; a Home Assistant object without `states` no longer throws.

### Fixed
- An invalid Home Assistant language (`en_US`, empty…) no longer breaks rendering: it is normalised and falls back to English; the same safety covers date formatting.
- Negative numbers use a plain `-` and no direction marks (copy-paste and templates).
- Elements with no target entity are no longer announced as buttons; an armed (*Stop?*) button announces the confirmation.
- A launcher popup could reappear (or stay) after its card was removed from the page, e.g. when leaving the view right after a tap.

### Changed
- Render tests now also cover the editors, locale numbers, accessibility, themes, charger controls, the device guess, injection attempts and the hardening below. README screenshots refreshed.
- **Behaviour changes to know about**: the vehicles card's info line, mode selector and figure boxes, the energy card's footer boxes and the battery card's blocks are now **centered** (they were left-aligned or spread); a charger counts as *plugged in* when it is charging, and more status words are recognised (`full`, `finished`, `waiting`…), so a status sensor that used those words may now read as plugged in.
- **Vehicles card — much wider compatibility**: "plugged in" and "charging" now accept `on`/`off` *and* the status words chargers publish (`Charging`, `Connected`, `Plugged in`, `Awaiting start`, `SuspendedEV`, `Charge done`…; case, spaces and dashes ignored), from any entity type (binary sensor, sensor, switch). `connected_states` / `charging_states` override the built-in lists. Without a charging entity, charger power above 50 W counts as charging, and charging implies plugged in. The launcher summary follows the same rules.
- Charger controls: `switch_invert` for pause-type switches, `current_min` / `current_max` bounds.
- Device fill is cautious: ambiguous fields are left empty; hidden entities, 12 V batteries, odometers, connectivity sensors and pause/lock/schedule switches are skipped; a notification reports how many fields were filled.
- Visual editor: the charger entity pickers are no longer limited to binary sensors; two new YAML fields for custom status words (translated in all 11 languages).

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
