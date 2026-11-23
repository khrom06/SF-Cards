# SF Cards

**Sci‑fi "HUD" cards for Home Assistant** — a set of 30 Lovelace cards with a glowing, cinematic look (or a calm one, your choice): an animated energy core, room dials, a welcome bridge, a full‑frame red alert, popup tiles made for phones… a **dashboard that builds itself from your rooms**, and a **visual editor for every card**, so nobody has to write YAML.

[![Marketplace](https://img.shields.io/badge/Marketplace%20%2F%20HACS-default-41BDF5.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=khrom06&repository=SF-Cards&category=dashboard)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Languages](https://img.shields.io/badge/languages-11-00e5ff)
[![Live demo](https://img.shields.io/badge/live-demo-2bff88)](https://khrom06.github.io/SF-Cards/)
[![Ideas and feedback](https://img.shields.io/badge/ideas%20%26%20feedback-share%20yours-ffb300)](https://github.com/khrom06/SF-Cards/discussions/categories/ideas)
[![Add to HACS](https://img.shields.io/badge/HACS-open%20in%20HACS-00e5ff)](https://my.home-assistant.io/redirect/hacs_repository/?owner=khrom06&repository=SF-Cards&category=dashboard)

<p align="center">
  <img src="assets/anim/reactor.webp" alt="Energy flow card, animated" width="780">
</p>

> **▶ [Try every card live, with fake data](https://khrom06.github.io/SF-Cards/)** — no install, 11 languages, light / dark.
>
> **💬 [Share your ideas, wishes and criticism](https://github.com/khrom06/SF-Cards/discussions/categories/ideas)** — propose a card or an option, vote (👍) for the ideas you want most, or just tell us what is confusing or missing. What you post here decides what comes next.

> **🪄 New companion: [SF Copilot](https://github.com/khrom06/SF-Copilot)** — finds what you keep doing by hand and proposes the automation, with a dry run first. Local, no cloud, no AI. [Install it with HACS](https://github.com/khrom06/SF-Copilot#installation) · animated preview inside.

### New in 1.21: where the battery's power comes from, and how much of the house it covers

The battery card and the energy card now tell **whether a charging battery is fed by the sun or by the grid**, and **how much of the house a discharging battery covers** — see [sf-battery-card](#sf-battery-card).

### 1.20: a dashboard that builds itself, rooms, daily life and a calm look

<p align="center">
  <img src="assets/anim/room.webp" alt="Room card: presence detected, lights turning on one by one, shutters opening" width="330"> <img src="assets/anim/report.webp" alt="Energy report card: this week, the week before, the month and the year" width="460">
</p>
<p align="center">
  <img src="assets/anim/media.webp" alt="Media card: track playing, pause, next track, volume" width="260"> <img src="assets/anim/weather.webp" alt="Weather card: clock, current weather, next hours and days" width="260"> <img src="assets/anim/agenda.webp" alt="Agenda card: timers counting down, waste collection chip, next events" width="260">
</p>

- **[Automatic dashboard](#automatic-dashboard)** — two lines of YAML and Home Assistant builds a whole dashboard of SF cards from your areas: rooms, climate, energy, security, system. A new lamp or room shows up by itself.
- **[Room](#sf-room-card)** — *"What is going on in the living room?"* Give it a Home Assistant area: it finds the temperature, presence, lights, covers and devices itself. Three sizes, from a tile to a full panel; the tile opens the room in a popup.
- **[Media](#sf-media-card)**, **[Weather and clock](#sf-weather-card)**, **[Agenda](#sf-agenda-card)** — the everyday cards: what is playing and the remote, the forecast hour by hour and day by day, timers, waste collection and the next events.
- **[Energy report](#sf-report-card)** — *"How was the week?"* Consumption, solar, autonomy and cost against the week before, who consumes, three facts worth knowing, and an image to share.
- **[Calm look and accent colours](#look-and-accent)** — `look: calm` removes the glow, brackets and scan lines; `accent: amber` (or any colour) recolours a card. For one card or the whole dashboard.

### From 1.19: four cards that answer everyday questions

<p align="center">
  <img src="assets/anim/upkeep.webp" alt="Upkeep card: when each filter, brush or consumable will be due" width="390"> <img src="assets/anim/air.webp" alt="Fresh air card: should I open the windows, room by room" width="390">
</p>
<p align="center">
  <img src="assets/anim/automations.webp" alt="Automations card: which automations are broken, silent or running" width="390"> <img src="assets/anim/cycles.webp" alt="Appliance cycles card: washing machine and dishwasher cycles, time left and cost" width="390">
</p>

- **[Upkeep](#sf-upkeep-card)** — *"When do I change that filter?"* Learns how fast each filter, brush or consumable wears from its own history and predicts the date.
- **[Fresh air](#sf-air-card)** — *"Should I open the windows?"* One verdict per room from indoor / outdoor absolute humidity, CO₂, PM2.5, rain and wind, plus the best hour; window sensors confirm you are airing, or tell you to close.
- **[Automations](#sf-automations-card)** — *"Is everything still working?"* Broken, failing, silent and disabled automations at a glance, with a 24 h pulse of runs.
- **[Appliance cycles](#sf-cycles-card)** — *"When will the washing machine be done?"* Detects cycles from a power plug, estimates the time left from past cycles and shows the cost.

### A dashboard for wall panels (square, landscape or portrait: NSPanel 480×320, NSPanel Pro 480×480, 120‑type 1334×750, wall tablets)

`sf-ns-card` fills a whole panel — **square, landscape or portrait** — and **changes with the time of day**:

<p align="center">
  <img src="assets/ns-morning.png" alt="Morning" width="230"> <img src="assets/ns-day.png" alt="Day" width="230"> <img src="assets/ns-evening.png" alt="Evening" width="230"> <img src="assets/ns-night.png" alt="Night" width="230">
</p>

Shown here on the square 480×480 NSPanel Pro; it is sized in `vmin`, so it also fills rectangular and larger screens (tested sizes in the [card's section](#sf-ns-card)). The other cards re‑flow from phone to wide desktop dashboards.

[Jump to the card](#sf-ns-card)

> **Made by Claude.** This whole project — the cards, the visual editors, the translations, the documentation and this README — was designed and written by **Claude** (Anthropic's AI, working through Claude Code) from the ideas, requests and feedback of **khrom06**, plus a few ideas of Claude's own. khrom06 steered every design decision, tested everything on a real Home Assistant installation and kept asking for "one more thing" until it looked right. See [Credits](#credits).

---

## Contents

- [Features](#features)
- [Installation](#installation) (Marketplace / HACS or manual)
- [The cards](#the-cards) · [Automatic dashboard](#automatic-dashboard)
- [Visual editor](#visual-editor)
- [Languages](#languages) · [Light theme](#light-theme) · [Look and accent](#look-and-accent) · [Layout](#layout) · [Accessibility](#accessibility) · [Numbers](#numbers)
- [Optional theme](#optional-theme) · [Requirements](#requirements) · [Security](#security) · [Development](#development)
- [About HACS and Marketplace](#about-hacs-and-marketplace)
- [Limitations](#limitations)
- [Ideas and feedback](#ideas-and-feedback)
- [Credits](#credits) · [License](#license)

## Features

- **30 cards, one look** (neon, or `look: calm`) — cyan / amber / red / green neon on a deep‑blue background, Orbitron + B612 Mono fonts, corner brackets, scan lines, glow.
- **Visual editor for every card** — pick entities from drop‑downs, add / reorder / delete rooms, groups, tiles and devices with buttons. Advanced fields (service data, popup card…) stay editable as embedded YAML, and nothing you typed in YAML is ever lost by the editor.
- **Made for phones** — `sf-launcher-card` turns any card into a summary tile that opens in a bottom‑sheet popup (the phone's Back button closes it, `#hash` deep links work) — [see it on a phone](#on-a-phone).
- **Dynamic layouts** — the energy card re‑flows by itself for 2 or 12 devices, on a phone, a wall tablet or a wide desktop dashboard; idle devices can be hidden automatically and the number of displayed devices is capped.
- **Eleven languages** — English, French, Spanish, German, Dutch, Italian, Portuguese, Polish, Russian, Chinese and Arabic (right-to-left), picked automatically from each user's Home Assistant profile (English for any other language).
- **Light or dark** — dark neon by default; `theme: light` or `auto` (follows the Home Assistant theme) per card, or once for all cards with a CSS variable.
- **Accessible** — keyboard and screen-reader friendly (real buttons, focus ring, Enter / Space), respects *reduce motion*, alert levels are spelled out, popups are proper dialogs.
- **No dependencies, no external resources** — a single JavaScript file; the two fonts are embedded (SIL OFL).
- **Safe by design** — a missing, `unknown` or `unavailable` entity shows a grey "—" / "no data", never a fake "OK".

## Installation

### Option A — Marketplace (Home Assistant 2026.11 and later) or HACS

SF Cards is in the default catalogue, so there is nothing to add by hand:

1. Open **Marketplace** (or **HACS** on older versions).
2. Search for **SF Cards** and click **Download** (or **Install**).
3. **Reload your browser** (hard refresh, or restart the companion app). The dashboard resource is registered for you.

[![Open in Home Assistant](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=khrom06&repository=SF-Cards&category=dashboard)

Updates then show up like any other update in **Settings**.

If your dashboards are in YAML mode, add the resource yourself (the exact URL is shown in **Settings → Dashboards → ⋮ → Resources** once installed):

```yaml
resources:
  - url: /hacsfiles/SF-Cards/sf-cards.js
    type: module
```

### Option B — manual

1. Download [`dist/sf-cards.js`](dist/sf-cards.js) and copy it to `/config/www/sf-cards.js`.
2. **Settings → Dashboards → ⋮ → Resources → Add resource**: URL `/local/sf-cards.js`, type **JavaScript module**.
3. Reload your browser.

Then edit a dashboard → **Add card** → search for **"SF ·"**.

## The cards

Every card can be configured in the visual editor; the YAML below is just for reference. Optional entities that you leave out are simply not displayed. Entity ids are placeholders.

| Card | What it is |
|---|---|
| [`sf-home-banner-card`](#sf-home-banner-card) | Welcome banner: clock, weather, tariff (peak / off‑peak + countdown), house mode, solar left, anomalies, presence |
| [`sf-energy-flow-card`](#sf-energy-flow-card) | Energy flow around an animated core: solar, grid, devices |
| [`sf-climate-card`](#sf-climate-card) | Room dials with target temperature, house mode, extra buttons |
| [`sf-controls-card`](#sf-controls-card) | Grouped controls: lights, dimmers, covers, vacuum, scripts, sensors |
| [`sf-launcher-card`](#sf-launcher-card) | Summary tiles that open any card (SF, standard Home Assistant or custom) in a popup — made for phones |
| [`sf-alert-card`](#sf-alert-card) | Full‑frame red alert: water leaks, doorbell, alarm, power cut |
| [`sf-vehicles-card`](#sf-vehicles-card) | EV(s) + shared charger, charge‑mode selector, energy flows |
| [`sf-machines-card`](#sf-machines-card) | Status tiles: values with thresholds, on/off, toggles with timers |
| [`sf-cells-card`](#sf-cells-card) | Weakest sensor batteries first, discovered automatically |
| [`sf-assistant-card`](#sf-assistant-card) | State of an assistant: phase, last request, action, result, reply — works out of the box with Assist satellites (read-only) |
| [`sf-health-card`](#sf-health-card) | Overview of your own checks: overall verdict and anomalies by severity, grouped by subsystem |
| [`sf-host-card`](#sf-host-card) | Monitoring of a computer or server: CPU / GPU / memory gauges, VRAM, disk and swap bars, live network curve, power draw (read-only) |
| [`sf-timeline-card`](#sf-timeline-card) | Latest state changes of the chosen entities, grouped by day, in plain words (read-only) |
| [`sf-trend-card`](#sf-trend-card) | History curves (read-only): range buttons, several series on one chart or one line each, hover / touch readout |
| [`sf-battery-card`](#sf-battery-card) | Home battery: level, flow, estimated time, daily energy, mode — only shows what you configure |
| [`sf-radiators-card`](#sf-radiators-card) | Radiators: preset, setpoint, heating state and daily energy — works without a temperature probe |
| [`sf-camera-card`](#sf-camera-card) | Camera mosaic with motion / person overlay |
| [`sf-setpoints-card`](#sf-setpoints-card) | Setpoint matrix per room; tap a value to edit (slider, scope: value / program / room) |
| [`sf-ledger-card`](#sf-ledger-card) | Consumption per device and period |
| [`sf-presence-card`](#sf-presence-card) | Presence from three never‑merged sources (advanced) |
| [`sf-room-card`](#sf-room-card) | **New** · one room from its Home Assistant area: temperature, presence, lights, covers, scenes, devices — tile, standard or large |
| [`sf-media-card`](#sf-media-card) | **New** · what is playing and the remote: artwork, progress, transport, volume, several players |
| [`sf-weather-card`](#sf-weather-card) | **New** · large clock, current weather, the next hours and days |
| [`sf-agenda-card`](#sf-agenda-card) | **New** · running timers, pinned reminders (waste collection…), next calendar events by day |
| [`sf-report-card`](#sf-report-card) | **New** · energy report of the week / month / year: consumption, solar, autonomy, cost, who consumes, exportable image |
| [`sf-upkeep-card`](#sf-upkeep-card) | maintenance forecast: filters, brushes, consumables, service dates — learns the wear rate, one-tap reset |
| [`sf-air-card`](#sf-air-card) | "should I open the windows?" — one verdict per room, window sensors, best hour of the next 12 |
| [`sf-automations-card`](#sf-automations-card) | health of your automations: broken, failing, silent, disabled, running, 24 h pulse (read-only) |
| [`sf-cycles-card`](#sf-cycles-card) | appliance cycles from a power plug: live progress, time left, cost, last 7 days |
| [`sf-ns-card`](#sf-ns-card) | **Full‑screen dashboard for wall panels and tablets** (square, landscape or portrait — NSPanel 480×320, Pro 480×480, 1334×750…): morning / day / evening / night modes, kiosk mode |

> **Friendly names (1.13).** Five cards were renamed with plainer names: `sf-reactor-card` → `sf-energy-flow-card`, `sf-hangar-card` → `sf-vehicles-card`, `sf-bridge-card` → `sf-home-banner-card`, `sf-console-card` → `sf-controls-card`, `sf-radar-card` → `sf-presence-card`. **The original names keep working forever** (same card, same options, same editor); the card picker and this documentation just use the new ones.

### Automatic dashboard

**A whole dashboard without placing a single card.** Create a dashboard (Settings → Dashboards → Add dashboard → *New dashboard from scratch*), open it, then **Edit → ⋮ → Raw configuration editor** and replace everything with:

```yaml
strategy:
  type: custom:sf-home
```

Home Assistant then asks SF Cards for the dashboard every time it is opened, so it always matches the house:

| View | What it shows | Built from |
|---|---|---|
| **Home** | Welcome banner, one tile per room (tap = the room in a popup), weather and clock, agenda, media, water leaks | areas, `person`, `weather`, `calendar`, `media_player`, moisture sensors |
| **Rooms** | Every room in full: temperature, presence, lights, covers, scenes | each area |
| **Climate** | Thermostats and the "should I open the windows?" verdict | `climate` entities, rooms with temperature + humidity |
| **Energy** | The energy report (and the live flow if you give the powers) | your **Energy dashboard** settings |
| **Security** | Cameras and the log of doors, windows, locks and alarm | `camera`, opening sensors, `lock`, `alarm_control_panel` |
| **System** | Sensor batteries and the health of your automations | found automatically |

Two more views are **available on request** (they are not in the default list, so an existing dashboard does not change): add them to `views`.

| View | What it shows | Built from |
|---|---|---|
| **Lights** | Every light by room (a dimmer for the dimmable ones, a switch for the others) and an "All off" button that asks for confirmation | `light` entities (light groups are left out, they would double their members) |
| **Covers** | Every shutter, blind, curtain, shade, awning and window by room, with "Open all" and "Close all" (both ask for confirmation) | `cover` entities. A cover with no device class is listed unless its id or name says garage, gate or door (and a garage door, gate or door class is never listed). **The bulk buttons only act on shutters, blinds, curtains, shades and awnings that support the service**: never on a window, never on a cover with no device class, never on a garage door or a gate |

<img src="assets/anim/auto-lights.gif" alt="The Lights view: press All off, the tile asks to confirm, press again and every light goes off" width="440"> <img src="assets/anim/auto-covers.gif" alt="The Covers view: press Close all, confirm, and every shutter closes (the garage door is not listed)" width="440">

Press a bulk button once and it asks for confirmation; press it again to run it. You can try both views in the [live demo](https://khrom06.github.io/SF-Cards/) (section "automatic dashboard").

If your Home Assistant has **floors** (and you do not use `areas`), the rooms are ordered by floor (lowest level first, then the order Home Assistant gives), the Rooms view gets a full-width title per floor ("Other rooms" for rooms without a floor) and the Lights and Covers groups are named "Floor · Room". Rooms you list in `areas` keep the order you chose, without floor titles. The Lights and Covers views list at most 150 devices; the "All off", "Open all" and "Close all" buttons act on every eligible device of the selected rooms, including any beyond the 150 listed. Without `areas`, a device with no area (or whose area was deleted) is listed under "No area"; with `areas`, only the rooms you chose are used.

A view with nothing to show is left out. Hidden, diagnostic and configuration entities are ignored. Everything is optional:

```yaml
strategy:
  type: custom:sf-home
  areas: [living_room, kitchen, bedroom]     # only these areas, in this order (ids or names)
  exclude_areas: [garage]                    # …or everything except these
  exclude: [light.all_lights]                # entities to leave out everywhere
  views: [home, rooms, lights, covers, climate, energy]   # which views, in which order (lights and covers are opt-in)
  weather: weather.home                      # default: the first weather entity
  theme: auto                                # dark | light | auto — passed to every card
  look: calm                                 # see "Look and accent"
  accent: amber
  energy: { grid: sensor.grid_power, solar: sensor.solar_power }     # live powers (W) → adds the energy flow card
  report: { grid: sensor.grid_kwh, solar: sensor.solar_kwh, export: sensor.export_kwh, cost: sensor.grid_cost }   # default: Energy dashboard settings
  home_cards:                                # your own cards, added to the home view
    - type: custom:sf-vehicles-card
      cars: [{ name: Car, soc: sensor.car_battery }]
  extra_views:                               # your own views, after the generated ones
    - title: Garden
      cards: []
```

To go further than the options allow, use **⋮ → Take control**: Home Assistant turns the generated dashboard into a normal, editable one (it then stops following the house).

### sf-room-card

<img src="assets/anim/room.webp" alt="Room card, animated" width="390">

<img src="assets/room.png" alt="Room card: compact, standard and large sizes" width="780">

**One room at a glance and under the finger.** Give it a Home Assistant **area** and it finds everything itself — the temperature and humidity sensors (the ones set on the area first), CO₂, presence, thermostat, lights, covers, window sensors, media player — skipping hidden and diagnostic entities. Whatever you set by hand wins; `exclude` removes an entity; an empty list (`lights: []`) hides a block.

Three sizes, chosen from the width the dashboard gives the card (or forced with `size`):

- **compact** — a tile: temperature, humidity, presence, and what is on ("2 lights · media on · 1 open"). Tapping it opens the standard card in a popup (made for phones), or goes to a page with `navigate`.
- **standard** — a dial with the target temperature, humidity / CO₂ / heating / power, one button per light, covers with open / stop / close, your scenes and an "all off" button for the lights of the room.
- **large** — adds the temperature curve (24 h by default, min / max and target) and the devices of the room, each one opening its Home Assistant dialog.

```yaml
type: custom:sf-room-card
area: living_room               # fills everything below that is not set
# name: Living room             icon: mdi:sofa
# size: auto                    # auto | compact | standard | large
# temperature: sensor.living_temperature      humidity: sensor.living_humidity
# co2: sensor.living_co2        power: sensor.living_power
# occupancy: binary_sensor.living_presence    climate: climate.living     media: media_player.living
# lights: [light.ceiling, light.floor_lamp]   covers: [cover.shutters]    windows: [binary_sensor.window]
# exclude: [light.all_lights]
# all_off: true                 # "all off" button (false to hide it)
# history: 24                   # hours of the temperature curve, large size (0 = none)
# tap: popup                    # compact tile: popup | none          navigate: /lovelace/living
actions:
  - { name: Movie, icon: mdi:movie-open, entity: scene.movie }
  - { name: Vacuum, icon: mdi:robot-vacuum, service: vacuum.start, data: { entity_id: vacuum.robot }, confirm: "Start?" }
# devices:                      # rows of the large size (default: found in the area)
#   - { entity: switch.tv, name: Television, icon: mdi:television }
```

Without an area the card works with the entities you list. In a sections view, `grid_options: { columns: 6 }` puts two tiles side by side.

### sf-media-card

<img src="assets/anim/media.webp" alt="Media card, animated" width="460">

**What is playing, and the remote.** Artwork, title, artist and album, a progress bar that moves on its own, previous / play-pause / next, volume and mute. Only the buttons your player supports are drawn. With several players, the one that plays is shown and the others are one tap away.

```yaml
type: custom:sf-media-card
title: Music
entity: media_player.living_room                 # one player…
entities: [media_player.kitchen, media_player.tv]   # …or several (chips to switch)
# artwork: true      volume: true
```

Artwork is only loaded from Home Assistant itself or an `http(s)` address; tapping it opens the player's dialog (sources, grouping…).

### sf-weather-card

<img src="assets/anim/weather.webp" alt="Weather and clock card, animated" width="460">

**The weather with the time.** A large clock and the date, the current conditions (temperature, humidity, wind, feels-like, today's high and low), then the next hours with the rain risk and the next days. It uses the forecasts Home Assistant already has for your weather entity; the number of hours and days follows the width of the card.

```yaml
type: custom:sf-weather-card
weather: weather.home
# temperature: sensor.outdoor_temperature   # your own outdoor sensor instead of the weather entity's value
# clock: true
# forecast: both        # both | hourly | daily | none
# hours: 8              days: 5
```

### sf-agenda-card

<img src="assets/anim/agenda.webp" alt="Agenda card, animated" width="420">

**What is coming.** Running timers with a live countdown, pinned reminders, and the next events of your calendars grouped by day (today, tomorrow, then the weekday), with the one in progress highlighted.

```yaml
type: custom:sf-agenda-card
title: Agenda
days: 7                   # days ahead
max: 8                    # events listed
timers: [timer.oven, timer.laundry]
calendars:
  - calendar.family
  - calendar.work
  - entity: calendar.waste_collection
    name: Bins
    icon: mdi:trash-can
    color: var(--sf-green)
    pin: true             # its next event becomes a chip on top: "Yellow bin · Tomorrow"
```

`pin: true` is made for waste-collection and school calendars: the next event is always visible and glows the day before. Read-only.

### sf-report-card

<img src="assets/anim/report.webp" alt="Energy report card, animated: week, previous week, month, year" width="560">

**"How was the week?"** The energy report in plain words: consumption, solar used, autonomy and cost, each **compared with the period before**; one bar per day split into solar and grid, the heaviest day highlighted; who consumes; three facts worth knowing; and **Export as an image** (1080 × 1350, in the colours of your theme) to share or keep. Week (7 days), month (30 days) or year (12 months), with a button to go back in time.

It reads the **long-term statistics** Home Assistant already keeps for energy counters (the same sensors as the Energy dashboard): nothing to install, and years of history are available at once.

```yaml
type: custom:sf-report-card
grid: sensor.grid_import_energy          # kWh counter: energy taken from the grid
solar: sensor.solar_production_energy    # kWh counter: solar production…
export: sensor.grid_export_energy        # …minus what went back to the grid = solar used by the home
# (if you have a "self-consumed solar" counter, give it as `solar` and leave `export` out)
cost: sensor.grid_import_cost            # money counter (optional)…
# price: 0.21                            # …or a price per kWh (number or entity; an estimate: one price for the whole period)
# currency: "€"
# period: week                           # week | month | year (the buttons switch)
devices:
  - { name: Car, entity: sensor.car_charger_energy }
  - { name: Heating, entity: sensor.heat_pump_energy }
```

Without solar the card shows consumption and cost only. The automatic dashboard fills this card from your Energy dashboard settings.

### sf-home-banner-card

<img src="assets/anim/bridge.webp" alt="Home banner card" width="780">

```yaml
type: custom:sf-home-banner-card
weather: weather.home
outdoor: sensor.outdoor_temperature
price: sensor.electricity_price_now        # €/kWh — decides peak vs off-peak
hc_price: input_number.offpeak_price       # only used when no hc_windows are set: price == hc_price means off-peak
hc_windows:                                # off-peak hours — as many ranges as your contract has (2, 3…); they decide peak / off-peak and the countdown
  - { start: "00:56", end: "06:56" }
  - { start: "14:26", end: "16:26" }
mode: input_select.house_mode
solar_left: sensor.solar_energy_remaining_today
internet: binary_sensor.internet
power_in: sensor.ups_input_voltage         # alert below 200 V
leaks: [binary_sensor.leak_kitchen, binary_sensor.leak_bathroom]
doors: [binary_sensor.door_front, binary_sensor.door_garage]
people:                                    # optional presence row
  - { name: Alice, entity: person.alice, color: "#00e5ff" }
footer: "text"                             # optional text on the right of the presence row
# legacy off-peak syntax, only read when hc_windows is empty: hc_start: "22:00" / hc_end: "06:00"
home_states: [home]                        # states counted as "home" — add your custom zone name if it is smaller than the Home zone
```

### sf-energy-flow-card

<img src="assets/anim/reactor.webp" alt="Energy flow card" width="780">

```yaml
type: custom:sf-energy-flow-card
solar: sensor.solar_power
grid: sensor.grid_power            # positive = import, negative = export
battery_power: sensor.battery_power  # optional, W — positive = discharging (battery_invert: true to flip)
battery_soc: sensor.battery_level    # optional, %
battery_from_grid: sensor.battery_grid_power  # optional, W taken from the grid to charge the battery (otherwise estimated)
# several batteries: batteries: [{ soc: sensor.a_level, power: sensor.a_power, capacity_kwh: 10 }, { … }]
fossil: sensor.grid_fossil_percent # optional
price: sensor.electricity_price_now
hide_idle: true                    # hide devices below idle_w (default 20 W)
max_devices: 8                     # keep the biggest consumers beyond this
devices:
  - { name: EV charger, entity: sensor.ev_power,   icon: "mdi:car-electric",   color: "#2bff88" }
  - { name: Heat pump,  entity: sensor.hp_power,   icon: "mdi:heat-pump",      color: "#4fc3f7" }
  - { name: Boiler,     entity: sensor.boiler_pwr, icon: "mdi:water-boiler",   color: "#ff7043" }
```

No solar panels? Leave `solar` out: the solar node, the flow and the "solar autonomy" figure disappear. The same goes for the footer figures (`fossil`, `price`), the bridge's "solar left" / house mode, the hangar's flows and the ledger's solar share: **anything you don't configure is not displayed**.

The layout adapts to the number of visible devices and to the width: up to three columns on a wide card, a grid under the core on a phone.

### sf-climate-card

<img src="assets/anim/climate.webp" alt="Climate card" width="640">

```yaml
type: custom:sf-climate-card
mode: input_select.house_mode              # optional house-mode selector
min: 15                                    # dial range (defaults 15 – 30 °C)
max: 30
rooms:
  - name: Living room
    icon: mdi:sofa
    climate: climate.living_room
    temp: sensor.living_room_temperature   # optional (falls back to the climate entity)
    hum: sensor.living_room_humidity
    target: input_number.living_room_target # the ± buttons change this input_number
    regul: input_boolean.living_room_auto   # optional "auto regulation" flag
    window: binary_sensor.living_room_window
extras:
  - { label: Solar boost, entity: input_boolean.solar_boost, icon: "mdi:solar-power" }
  - label: Towel dryer
    entity: script.towel_dryer_45
    timer: timer.towel_dryer       # shows the remaining time, a tap stops it
    stop: [script.towel_dryer_45, switch.towel_dryer]
# switch_script: script.my_room_toggle   # optional; default = climate.turn_on / turn_off
```

### sf-controls-card

<img src="assets/anim/console.webp" alt="Controls card" width="640">

```yaml
type: custom:sf-controls-card
title: Controls
groups:
  - title: Lighting
    icon: mdi:lightbulb-group
    items:
      - { kind: dimmer, entity: light.living_room, label: Living room }   # toggle + brightness ±10 %
      - { kind: toggle, entity: switch.desk_lamp, label: Desk, icon: "mdi:desk-lamp" }
      - { kind: christmas, entity: switch.tree, label: Lights }   # a toggle that blinks like fairy lights while it is on (visual only)
      - { kind: action, label: Cosy, icon: "mdi:weather-night", service: scene.turn_on, data: { entity_id: scene.cosy } }
  - title: Home
    items:
      - { kind: cover, entity: cover.shutters, label: Shutters }
      - { kind: vacuum, entity: vacuum.robot, battery: sensor.robot_battery, label: Robot,
          shortcuts: [{ label: Kitchen, entity: button.robot_kitchen, icon: "mdi:countertop" }] }
      - { kind: sensor, entity: sensor.pm25, label: PM2.5, unit: "µg/m³" }
```

Item kinds: `toggle`, `christmas`, `dimmer`, `action`, `sensor`, `cover`, `vacuum`, `stepper`, `select`.

Press options, like Home Assistant's own tiles:

- `hold_action: more-info` (on `toggle`, `christmas` and `dimmer`): a long press (about half a second), a right click or the keyboard's context-menu key opens the entity's own page (brightness, colour, history…). A normal tap still does what it did, and the click that ends a long press does not. On a `dimmer` the long press goes on the bulb icon; the name still opens the page and the − / + buttons keep working.
- `hold_action: navigate` with `navigation_path: /lovelace/0`: the long press opens that dashboard page instead.
- `tap_action: more-info` or `navigate` (on `toggle` and `christmas`): a normal tap opens the entity's page, or the dashboard page, instead of switching it.
- `navigation_path` must start with a single `/` (same site only, no address, no `//`); anything else is ignored and the tile behaves as usual.

Without these options nothing changes.

```yaml
      - { kind: toggle, entity: light.living_room, label: Living room, hold_action: more-info }
      - { kind: dimmer, entity: light.hall, label: Hall, hold_action: navigate, navigation_path: /lovelace/lights }
```

On a `dimmer`, the long press goes on the bulb icon, so the name and the − / + buttons keep working:

<img src="assets/anim/hold-dimmer.gif" alt="Controls card with two dimmers: a tap on the bulb switches the Living room light, a long press on the bulb opens its page and leaves the light as it was" width="440">

On a `toggle`, a tap switches the light; a long press opens its page without switching it:

<img src="assets/anim/hold-action.gif" alt="Controls card: a tap switches the Living room light, a long press opens its page with brightness and colour and leaves the light as it was" width="440">

The `christmas` kind (left) next to a plain `toggle` that is on (middle) and one that is off (right):

<img src="assets/anim/fairy-lights.gif" alt="Controls card: an animated fairy-lights button next to a plain toggle that is on and one that is off" width="420">

Other options: card `subtitle`; group `span` (1–4 columns); item `color`, `digits`, `unit`; for `action`: `sub` and `confirm: "text"` (asks for a second tap); for `select`: `labels: { option: Label }`.

### sf-launcher-card

<img src="assets/anim/launcher.webp" alt="Launcher card" width="420">

Each tile shows a live summary and opens a card in a popup — an SF card, a standard Home Assistant card (`vertical-stack`, `history-graph`…) or any other custom card:

```yaml
type: custom:sf-launcher-card
columns: 2
mode_entity: input_select.day_mode   # optional: adaptive mode (see below)
tiles:
  - name: Climate
    icon: mdi:thermostat
    color: "#ff7043"
    modes: [Morning, Evening]   # optional: highlighted (and moved first) while the mode entity is in one of these states
    hash: climate            # deep link: …/dashboard/home#climate
    summary: climate         # climate | room | vehicles | commands | cameras | energy | battery | machines | text
    # sub: "free text"      # shown under the title when summary: text
    # users: [<user id>]     # optional: tile visible only to these users
    card:                    # any card: SF, standard Home Assistant (vertical-stack, history-graph…) or custom
      type: custom:sf-climate-card
      rooms: [ … ]
```

`summary: health` shows the verdict of a health card's checks on the tile ("All good" / "2 anomalies" + the first names; red and pulsing when a critical check fails): put the `sf-health-card` config in the tile's `card`.

With `mode_entity` (any `input_select` / `select` / `sensor`, e.g. Morning / Day / Evening / Night) the tiles whose `modes` list the current state move to the front and get a brighter outline; the order changes back when the mode changes. Without `mode_entity`, or when the entity is unavailable or matches no tile, nothing changes.

#### On a phone

<img src="assets/phone.webp" alt="A phone dashboard: a banner and six summary tiles, and the Climate card open in a bottom sheet" width="560"> <img src="assets/anim/phone.webp" alt="Tapping a tile: the card rises from the bottom, then slides back down" width="270">

A phone dashboard is a banner and a launcher card: the page stays short, each tile gives the number you glance at, and one tap opens the full card in a sheet that rises from the bottom. Close it with the ✕, a tap outside, or the phone's Back button (when the tile has a `hash`). Both pictures use fake data on a 402 × 874 screen (iPhone 17 Pro size); the banner and the tiles are simplified in the recipe below, replace the `…` placeholders with your own entities.

```yaml
type: vertical-stack
cards:
  - type: custom:sf-home-banner-card
    weather: weather.home
  - type: custom:sf-launcher-card
    columns: 2
    tiles:
      - { name: Climate, summary: climate, hash: climate, card: { type: custom:sf-climate-card, rooms: [ … ] } }
      - { name: Energy, summary: energy, hash: energy, card: { type: custom:sf-energy-flow-card, grid: sensor.grid_power, solar: sensor.solar_power } }
      - { name: Vehicles, summary: vehicles, hash: vehicles, card: { type: custom:sf-vehicles-card, cars: [ … ] } }
```

The [automatic dashboard](#automatic-dashboard) does not build this phone page for you: it generates the same views on every screen, and only its **Home** view uses popups (one compact tile per room). For a phone-first page, put the card above in a view of your own, for example `extra_views: [{ title: Phone, path: phone, cards: [ <the vertical-stack above> ] }]`.

### sf-alert-card

<img src="assets/anim/alert.webp" alt="Alert card: a water leak turns the whole frame red" width="520">

Calm and discreet when everything is fine (or hide it with a `conditional` card), full red and pulsing when something happens.

```yaml
type: custom:sf-alert-card
leaks: [binary_sensor.leak_kitchen, binary_sensor.leak_bathroom]
doors: [binary_sensor.door_front]        # informational
alarm: alarm_control_panel.home          # optional
ring: binary_sensor.doorbell             # optional
snapshot: camera.front_door              # optional photo shown on a ring
power: sensor.ups_input_voltage          # optional, alert below power_below (200 V)
hide_sim: true                           # hides the "simulate a doorbell" test button
```

### sf-vehicles-card

<img src="assets/anim/hangar.webp" alt="Vehicles card" width="640">

```yaml
type: custom:sf-vehicles-card
cars:                                          # up to 3 cars
  - { name: Car A, soc: sensor.car_a_battery, range: sensor.car_a_range, target: sensor.car_a_target, charging: binary_sensor.car_a_charging, color: "#00e5ff" }
distance_unit: auto                            # auto (the range sensor's own unit) | km | mi — converts if needed
charger:
  name: Garage                                 # optional
  connected: binary_sensor.charger_connected   # or a status sensor: "Connected", "Plugged in", "Awaiting start"…
  charging: binary_sensor.charger_charging     # or a status sensor: "Charging"… (optional: without it, power > 50 W means charging)
  # connected_states: [my_status]   # optional: replace the built-in list if your charger uses unusual status words
  # charging_states: [my_status]
  power: sensor.charger_power
  current: number.charger_current
  decision: sensor.charge_controller_decision   # optional
  mode: select.charger_mode                     # optional mode selector for this charger only
mode: input_select.charge_mode                  # optional selector — an input_select or a select entity
flows: { solar: sensor.solar_power, home: sensor.house_power, surplus: sensor.solar_surplus }
warn_mode: Solar                                # optional: warn when this mode is selected in the evening…
warn_text: "No sun tonight — the car will not charge in this mode."
```

**Control the charger from the card (optional).** Add `controls: true` to a charger and the card shows what it can drive, only if the entities are set:

```yaml
charger:
  switch: switch.charger_charging        # shows Start / Stop (stopping asks for a second tap)
  switch_invert: false                   # true if the switch is ON when charging is PAUSED (e.g. "pause session")
  current: number.charger_current        # a number entity: shows − / + (bounded by its min / max)
  current_step: 1                        # optional (defaults to the entity's own step)
  current_min: 6                         # optional bounds, used when the entity does not expose min / max
  current_max: 16                        # (the current never goes below 0 without bounds)
  controls: true                         # nothing is shown, and nothing can be triggered, without this
```

Without `controls: true` the card stays a display, exactly as before. A held-down key never counts as several presses, so it cannot get past the *Stop* confirmation.

**Two chargers (or more)?** Replace `charger:` with a `chargers:` list (up to 4). Each one has its own name, status, power, current, controller decision, its own `mode` selector and its own `controls`. The cars are shown in a row above, one block per charger below; the header says *charging* as soon as one charger charges, and the launcher tile adds up the power. The single `charger:` syntax keeps working.

<img src="assets/hangar-multi.png" alt="Vehicles card with three cars and two chargers" width="420">

```yaml
chargers:
  - { name: Garage,   connected: sensor.garage_status,   charging: sensor.garage_status,   power: sensor.garage_power,   current: number.garage_current }
  - { name: Driveway, connected: sensor.driveway_status, charging: sensor.driveway_status, power: sensor.driveway_power, mode: select.driveway_mode }
```

**Works with any charger and car integration.** "Plugged in" and "charging" accept `on` / `off` but also the status words most chargers publish — `Charging`, `Connected`, `Plugged in`, `Awaiting start`, `SuspendedEV`, `Charge done`… (case, spaces and dashes are ignored). If your brand uses something unusual, list the words in `connected_states` / `charging_states`. No status sensor at all? The card falls back on the charger power (above 50 W = charging). The car's own `charging` entity accepts the same words (`charging_states` per car).

### sf-machines-card

<img src="assets/anim/machines.webp" alt="Machines card" width="640">

```yaml
type: custom:sf-machines-card
title: Equipment
tiles:
  - { label: NAS,    entity: sensor.nas_temperature, kind: value, digits: 0, warn: 55, crit: 65, max: 80 }
  - { label: Fridge, entity: sensor.fridge, kind: value, digits: 1, warn: 6, crit: 8 }
  - { label: Water,  entity: sensor.aquarium_temperature, kind: value, low: 24, warn: 26.5 }   # amber outside 24–26.5
  - { label: Pump,   entity: switch.pump, kind: toggle, color: "#4fc3f7" }
```

Tile kinds: `value`, `percent`, `binary`, `text`, `duration`, `timestamp`, `toggle`.

Mini-curve: `spark: true` (24 h) or `spark: <hours>` (1 to 168) on a `value` / `percent` tile draws its recent history under the figure (one request per distinct duration, refreshed every 5 minutes; nothing is drawn if the entity is unavailable).

Other tile options: `unit` (force the unit), `invert: true` (alert when the value is LOW), `ok_state` / `bad_text` (kind `binary`), `map` / `ok_values` (kind `text`: translate states / list the normal ones), `timer` / `stop` (kind `toggle`: remaining-time timer, and the entities switched off by a tap while it runs).

### sf-cells-card

<img src="assets/anim/cells.webp" alt="Sensor batteries card" width="640">

```yaml
type: custom:sf-cells-card
warn: 30
crit: 15
limit: 12                # default 16
exclude: [sensor.some_battery]
include_pattern: ""      # optional regex on the entity id (a group with alternatives repeated with + or * is refused, see the console)
exclude_pattern: ""      # optional regex: ignore matching entity ids
```

### sf-assistant-card

<img src="assets/anim/assistant.webp" alt="Assistant card" width="520">

State of an assistant (voice or chat), read-only: its current phase (idle / listening / thinking / running / replying / error), the last request, the current action, its result and the last reply, plus optional action buttons. It works out of the box with Home Assistant **Assist satellites** (`assist_satellite.*`: idle / listening / processing / responding); for anything else, map the entity's states to phases with `phases`. The card interprets nothing — it shows what the entities contain (text capped at 300 characters, ages refreshed every minute).

```yaml
type: custom:sf-assistant-card
name: Assistant                              # optional
state: assist_satellite.kitchen              # entity whose state describes the activity
phases: { busy: acting, done: idle }         # optional: entity state -> idle | listening | thinking | acting | speaking | error
request: sensor.assistant_last_request       # optional text entities (their state is displayed)
action: sensor.assistant_current_action
result: sensor.assistant_last_result
reply: sensor.assistant_last_reply
actions:                                     # optional buttons (up to 6)
  - name: Stop
    icon: mdi:stop
    service: script.assistant_stop           # domain.service
    confirm: "Stop?"                         # optional: asks to press twice
```

### sf-host-card

<img src="assets/anim/host.webp" alt="Host card, dark theme" width="420"> <img src="assets/host-light.png" alt="Host card, light theme" width="420">

Monitoring of a computer or server from sensors you already have in Home Assistant (an MQTT discovery script, System Monitor, Glances, Proxmox…): three animated gauges (CPU, GPU, memory) with temperatures and power, bars for video memory, disk and swap, a live network curve, and a footer with power draw, energy, containers, Wi-Fi signal and load. Colours turn amber then red past your thresholds, and the whole card greys out when the host is offline. Every entity is optional; read-only.

```yaml
type: custom:sf-host-card
title: Workstation             # optional
online: binary_sensor.pc_online  # optional; without it the host is offline when no measurement is available
cpu: sensor.pc_cpu             # percent
cpu_temp: sensor.pc_cpu_temp
gpu: sensor.pc_gpu
gpu_temp: sensor.pc_gpu_temp
gpu_power: sensor.pc_gpu_power
gpu_vram: sensor.pc_vram_percent
ram: sensor.pc_ram_percent
ram_used: sensor.pc_ram_gb
swap: sensor.pc_swap
disk: sensor.pc_disk
disk_free: sensor.pc_disk_free
net_rx: sensor.pc_rx           # kB/s (B/s, MB/s, GB/s and Mbit/s units are converted)
net_tx: sensor.pc_tx
wifi: sensor.pc_wifi           # dBm
containers: sensor.pc_containers
load: sensor.pc_load
uptime: sensor.pc_uptime       # hours
power: sensor.pc_power         # total draw in W
energy_total: sensor.pc_energy # energy counter in kWh
power_estimate: true           # shows "≈" when power / energy are estimated rather than metered
warn: 75                       # amber from (percent), default 75
crit: 90                       # red from (percent), default 90
temp_warn: 75                  # amber from (°C), default 75
temp_crit: 88                  # red from (°C), default 88
```

The traffic curve is built from what the card sees while the page is open (no history request).

### sf-upkeep-card

<img src="assets/anim/upkeep.webp" alt="Upkeep card" width="560">

**"When do I change that filter?"** Filters, brushes, salt, descaling, detectors at end of life — anything that wears out. Instead of a bare percentage, each item shows **when** it will need attention: the card learns the wear rate from the entity's own history (since the last reset, glitches ignored, long-term statistics used beyond the recorder's raw history) and projects the date. A timeline shows what is due in the coming weeks; the item due first leads the header. An optional reset button (press twice) restarts an item after a replacement. Works with a percentage left, a time left (h / min / d), a date (timestamp, `input_datetime`) or a "problem" binary sensor.

```yaml
type: custom:sf-upkeep-card
title: Upkeep
horizon: 30              # days shown on the timeline; items due within it are "to plan"
soon: 14                 # amber below this many days
learn_days: 180          # history used to learn the wear rate
items:
  - name: Purifier HEPA filter
    entity: sensor.purifier_filter_life      # % left
    reset: button.purifier_reset_filter      # optional (button, input_button, script or input_datetime)
    icon: mdi:air-filter
  - name: Robot vacuum brush
    entity: sensor.robot_main_brush_left     # time left in hours
    life: 300                                # full life in the entity's unit (otherwise the highest value seen)
  - name: Coffee machine descaling
    entity: input_datetime.last_descaling    # a date = the LAST service…
    every_days: 30                           # …the next one is due 30 days later
  - name: CO detector
    entity: binary_sensor.co_detector_end_of_life   # "on" = due now
```

### sf-air-card

<img src="assets/anim/air.webp" alt="Fresh air card" width="560">

**"Should I open the windows?"** One clear verdict — *open wide*, *quick airing*, *not needed*, *keep closed* — with its reasons and the best hour of the next 12. Moisture is compared in **absolute humidity** (g/m³): 80 % outside at 5 °C is drier than 55 % inside at 21 °C, so airing really does dry the house. It also weighs CO₂, indoor and outdoor fine particles (PM2.5), rain, wind, and whether opening would chill (or heat) the house.

- **One room or several.** With `rooms:` every room gets its own line and verdict, the outside is shared, and the most urgent room leads the window animation.
- **Open-plan spaces.** One sensor often covers several rooms (living room + kitchen + dining): list them in `areas` and they are shown under the room name.
- **Window sensors.** Add the room's window / door contacts in `openings`: the card confirms *airing* when it is the right time, says *close it* once a quick airing has lasted long enough, and *close it!* when the window should not be open at all.
- Thresholds can be set for the whole card or per room (a bathroom can tolerate more humidity).

```yaml
type: custom:sf-air-card
title: Fresh air
outdoor_temperature: sensor.outdoor_temperature   # or a weather entity alone
outdoor_humidity: sensor.outdoor_humidity
outdoor_pm25: sensor.outdoor_pm25                 # optional: polluted outside air blocks the verdict
wind: sensor.wind_speed                           # optional (km/h, m/s, mph and knots converted)
rain_chance: sensor.rain_chance                   # optional
weather: weather.home                             # optional: fallbacks + hourly forecast (best hour)
rooms:
  - name: Living area
    areas: [Living room, Kitchen, Dining]         # optional: open-plan spaces covered by the same sensors
    temperature: sensor.living_temperature
    humidity: sensor.living_humidity
    co2: sensor.living_co2                        # optional
    pm25: sensor.air_purifier_pm25                # optional: indoor fine particles
    openings: [binary_sensor.living_window, binary_sensor.patio_door]   # optional
  - name: Bathroom
    temperature: sensor.bathroom_temperature
    humidity: sensor.bathroom_humidity
    humidity_max: 70                              # per-room threshold (also comfort_min / comfort_max)
    openings: binary_sensor.bathroom_window
comfort_min: 19          # °C
comfort_max: 24
humidity_max: 60         # %
co2_max: 1000            # ppm
pm25_max: 25             # µg/m³ outside
pm25_in_max: 15          # µg/m³ inside
wind_max: 40             # km/h
```

For a single room you can skip `rooms:` and use `indoor_temperature`, `indoor_humidity`, `co2`, `indoor_pm25` and `openings` at the top level.

### sf-automations-card

<img src="assets/anim/automations.webp" alt="Automations card" width="560">

**"Is everything still working?"** The health of your automations without opening the traces one by one: a health ring, counters, a 24-hour pulse of every run, and the list of what needs a look — **broken** (invalid configuration, error on the last run), pointing at an entity that is **unavailable or gone**, **silent** for too long, **disabled**, or **running** right now. Tap a line to open the automation. Reads the automation states, their latest traces and (for administrators) the entities each one uses; read-only.

```yaml
type: custom:sf-automations-card
title: Automations
stale_days: 30                 # enabled but not triggered for 30 days = silent (0 = never flag)
include: [automation.heating_*]   # optional patterns; exclude: [automation.test_*]
show_disabled: true            # list the disabled ones (otherwise only counted)
max_items: 8
check_entities: true           # look for unavailable / missing entities (admin only, every 15 min)
```

### sf-cycles-card

<img src="assets/anim/cycles.webp" alt="Appliance cycles card" width="560">

**"When will the washing machine be done?"** All you need is a smart plug that measures power. The card finds the cycles in the power history, then shows the one running — an animated drum, elapsed time, **expected end** learnt from the previous cycles, energy and cost so far — or the last one (finished X min ago, duration, kWh, cost), with the power curve and the week's count. Works for washing machines, dryers, dishwashers, ovens, towel heaters…

```yaml
type: custom:sf-cycles-card
title: Appliances
price: sensor.electricity_price      # €/kWh: an entity or a number (optional)
days: 7                              # history used (cycles, typical duration)
appliances:
  - name: Washing machine
    power: sensor.washing_machine_power   # W (kW converted)
    icon: mdi:washing-machine
  - name: Dishwasher
    power: sensor.dishwasher_power
    start: 8          # a cycle starts above 8 W…
    stop: 3           # …and ends below 3 W…
    stop_delay: 5     # …for 5 minutes (pauses in the middle are not mistaken for an end)
    min_minutes: 3    # shorter bursts are ignored
    done_hold: 120    # "finished" stays highlighted for 2 hours
```

### sf-health-card

<img src="assets/anim/health.webp" alt="Health card" width="520">

An overview of **your own checks**: you list entities and what is normal for each; the card gives one verdict (all good / warning / critical) and lists the anomalies, critical ones first, grouped so that ten alerts from one subsystem read as one. It decides nothing — it applies your rules to states Home Assistant already has (no request, no hidden calculation). An age check (`stale`) is re-evaluated every minute.

```yaml
type: custom:sf-health-card
title: Health                # optional
show_ok: false               # also list the normal checks
checks:                      # up to 60
  - name: Internet
    entity: binary_sensor.internet
    ok: ["on"]               # normal states; any other state is an anomaly
    severity: critical       # warning (default) | critical
    group: Network           # anomalies of one group are shown together
  - name: UPS
    entity: sensor.ups_battery
    min: 30                  # below = anomaly (max: above = anomaly)
  - name: Kitchen sensor
    entity: sensor.kitchen_temperature
    stale: 60                # no update for 60 min = anomaly
  - name: Leak
    entity: binary_sensor.leak
    bad: ["on"]              # abnormal states
    severity: critical
```

Rules of a check: unavailable / unknown is always an anomaly; then `ok`, `bad`, `min` / `max`, `stale`.

### sf-timeline-card

<img src="assets/anim/timeline.webp" alt="Timeline card" width="520">

Read-only timeline of the latest state changes of the entities you choose (Home Assistant's logbook), grouped by day, with a plain sentence per entity type: door open / closed, motion detected, leak detected, alarm armed (home / away / night) or triggered, lock, presence… Alerts are coloured (red: leak, smoke, alarm triggered; amber: opening, unlocked). Nothing is computed or decided — it only shows the log. Loaded once, refreshed at most every 60 s; after an error, at most one retry per minute.

```yaml
type: custom:sf-timeline-card
title: Timeline            # optional
hours: 24                  # window shown
limit: 30                  # maximum number of events
group: true                # merge identical consecutive events ("× 3")
hide_unavailable: true
entities:                  # up to 40: an entity id, or an object
  - binary_sensor.front_door
  - entity: alarm_control_panel.home
    name: Alarm            # optional
    icon: mdi:shield-home  # optional
    color: "#ffb300"       # optional
  - entity: binary_sensor.hall_motion
    states: ["on"]         # optional: only show these states (here: motion detected, not "cleared")
    min_gap: 15            # optional: at least 15 minutes between two events of this entity (tames a flickering detector)
```

### sf-trend-card

<img src="assets/anim/trend.webp" alt="Trend card" width="520">

Read-only history curves in the HUD style — nothing is computed, the card draws what Home Assistant recorded. Series that share a unit are overlaid on one chart; series with different units get one line each (`layout` forces either). Range buttons switch the window; hover or touch a chart to read the value at that moment. Up to 48 h the full history is used; beyond that the long-term statistics (hourly mean), falling back to the history for an entity without statistics. Data is fetched once per range and refreshed at most every 2 minutes (10 minutes beyond 48 h); after an error it retries at most once a minute.

```yaml
type: custom:sf-trend-card
title: Temperatures
hours: 24                  # initial range
ranges: [6, 24, 168]       # range buttons, in hours ([] = no buttons)
layout: auto               # auto | combined | separate
height: 150                # px, 80 to 400
series:                    # up to 8
  - entity: sensor.living_room_temperature
    name: Living room      # optional
    color: "#00e5ff"       # optional, otherwise the first free colour of the palette
    unit: "°C"             # optional, otherwise the entity's unit
    digits: 1
    axis: left             # optional: right = second scale on the right (e.g. outdoor temperature next to indoor ones)
    factor: 1              # optional: multiplies the values (e.g. 1000 to compare a kW sensor with a forecast in W)
    attribute: watts       # optional: draw (dashed) a time-indexed attribute of the entity's CURRENT state instead of its history
```

**Forecast against reality.** `window: today` shows local midnight to midnight, so a forecast can extend into the future (a dashed marker shows "now"); `ranges: [today, 24, 168]` adds a "Today" button. With `attribute`, a series reads a time-indexed attribute such as the `watts` of a solar-forecast sensor (`{ "2026-11-03T10:00:00+01:00": 1200, … }`), drawn dashed, next to the real production read from the history:

```yaml
type: custom:sf-trend-card
title: Solar: forecast and real
window: today
ranges: [today, 24, 168]
series:
  - { entity: sensor.solar_power, name: Real, unit: W, factor: 1000 }   # a kW sensor, brought to W
  - { entity: sensor.energy_production_today, attribute: watts, name: Forecast, unit: W }
```

A series that did not change during the window (a parked car, a stable setpoint) is drawn as a flat line up to now. With `axis: right` on some series (and not on others) both scales are shown, left and right, on one chart.

### sf-battery-card

<img src="assets/anim/battery.webp" alt="Battery card" width="420">

Home battery. Everything is optional — only configured entities are shown, and without `soc` or `power` the card hides itself.

```yaml
type: custom:sf-battery-card
title: Battery                             # optional
soc: sensor.battery_level                  # %
power: sensor.battery_power                # W, positive = discharging (invert: true to flip)
capacity_kwh: 10                           # enables "full in 3h10 / empty in …"
charged_today: sensor.battery_charged_today        # kWh
discharged_today: sensor.battery_discharged_today  # kWh
mode: select.battery_mode                  # optional mode selector (select or input_select)
temperature: sensor.battery_temperature
health: sensor.battery_health
cycles: sensor.battery_cycles
```

**Several batteries?** List them under `batteries`. The ring shows the overall level (weighted by each battery's capacity — a simple average if a capacity is missing), the power is the sum, the estimated time uses the total capacity, and one compact row per battery appears under the ring. A battery that is unavailable is simply left out of the average.

<img src="assets/batteries.png" alt="Battery card with two batteries" width="420">

```yaml
type: custom:sf-battery-card
batteries:
  - { name: Garage, soc: sensor.garage_battery_level, power: sensor.garage_battery_power, capacity_kwh: 10 }
  - { name: Cellar, soc: sensor.cellar_battery_level, power: sensor.cellar_battery_power, capacity_kwh: 5 }
  # invert: true on a battery flips its power sign (positive = discharging by default)
charged_today: sensor.total_battery_charged_today      # optional totals, as above
```

**Where does the charge come from?** Add the entities you have, all optional:

```yaml
solar: sensor.solar_power        # W
grid: sensor.grid_power          # W, positive = import
from_grid: sensor.battery_grid_charge_power   # W, measured by your inverter (exact; skips the estimate)
home: sensor.house_power         # W, to show how much of the house the battery covers
```

While charging, the card shows *"Charging from ☀ 0.7 kW Solar · ⚡ 0.3 kW Grid"*; while discharging with `home` set, *"Covers 50 % of the home"*. Without `from_grid` the split is an **estimate**: the grid import covers the charge first (a battery does not charge from the grid while the house exports), the rest is solar — if only `solar` is given, the solar production covers it first. Nothing is shown when none of these entities is set. The energy card does the same with `battery_from_grid`: the flow to the battery turns orange when it is mostly fed by the grid, and a "Battery charge from solar" figure appears in its footer.

**Measured, calculated, estimated.** A value read from a sensor is shown as is. A value computed from sensors by a rule that always holds (a sum, a difference, a share of two readings, such as *"Covers 50 % of the home"*) is also shown as is. A value that rests on an assumption is marked **≈** and carries a tooltip that says so: here, the solar / grid split of the charge when `from_grid` (or `battery_from_grid` on the energy card) is not set. With a measured `from_grid` the ≈ disappears.

The single-battery fields (`soc`, `power`, `capacity_kwh`) keep working. The card also works as a launcher popup, with `summary: battery`.

The **energy card** shows the battery as one node: `battery_power` / `battery_soc` for one battery, or the same `batteries:` list for several (overall level, summed power) — a node per battery would make the diagram unreadable.

### sf-radiators-card

<img src="assets/anim/radiators.webp" alt="Radiators card" width="420">

For radiators driven by presets (Voltalis, Netatmo, Tado…), which often have no room probe. One column and large touch targets, built for phones. Presets come from the device itself (`preset_modes`, or the options of a `select` entity); the setpoint buttons call `climate.set_temperature` and can be turned off for pilot-wire (fil pilote) heaters, which only know modes.

```yaml
type: custom:sf-radiators-card
title: Radiators
accent: "#e0875a"        # optional accent colour
step: 0.5                # setpoint step
max_kwh: 3               # daily energy that fills the bar
setpoint: true           # set false for pilot-wire heaters (no numeric setpoint): hides the ± control
preset_labels: { away: Frost protection }   # optional: rename presets
radiators:
  - name: Kitchen
    icon: mdi:countertop
    climate: climate.kitchen
    preset: select.kitchen_preset          # optional: use a select entity's options (may include "auto")
    presets: [auto, comfort, eco, away]    # optional: order / filter
    kwh: sensor.kitchen_energy_today       # optional (kWh or Wh)
    connection: sensor.kitchen_connection  # optional, warns when not ok/on/connected
```

### sf-camera-card

<img src="assets/anim/camera.webp" alt="Camera card" width="520">

```yaml
type: custom:sf-camera-card
refresh: 5
cameras:
  - { entity: camera.front, name: Front, motion: binary_sensor.front_motion, persons: sensor.front_person_count, review: sensor.front_review_status }
```

### sf-setpoints-card

<img src="assets/anim/setpoints.webp" alt="Setpoints card" width="520">

```yaml
type: custom:sf-setpoints-card
title: Setpoints
subtitle: Heating                  # optional
columns: [{ label: Day, color: "#ffb300" }, { label: Night, color: "#4fc3f7" }]
rows:
  - { name: Living room, icon: "mdi:sofa", entities: [input_number.living_day, input_number.living_night] }
```

### sf-ledger-card

<img src="assets/anim/ledger.webp" alt="Energy summary card" width="520">

```yaml
type: custom:sf-ledger-card
period: input_select.energy_period
total_cost: sensor.energy_cost
solar_fraction: sensor.solar_fraction
avg_price: sensor.average_price
devices:
  - name: EV charger
    icon: mdi:car-electric
    total: sensor.ev_kwh          # period total
    edf: sensor.ev_kwh_grid       # part bought from the grid ("edf" is the historical key name)
    solar: sensor.ev_kwh_solar    # part supplied by solar
    cost: sensor.ev_cost
```

### sf-presence-card

> **Deprecated.** This card (also `sf-radar-card`) will be removed in a future release, not before 2026-11-27. It keeps working until it is removed, and the console and the editor say so. If you use it, please [tell us](https://github.com/khrom06/SF-Cards/issues) so that it can be kept. `sf-setpoints-card` is not affected.

<img src="assets/anim/radar.webp" alt="Presence card" width="520">

Advanced and opinionated: three rings, three sources that are **never merged** (home/away from `person.*`, last camera that recognised a face, anonymous room occupancy).

```yaml
type: custom:sf-presence-card
people: [{ name: Alice, person: person.alice, face: sensor.alice_last_camera, color: "#00e5ff" }]
rooms:  [{ label: Living room, entity: binary_sensor.living_room_occupancy }]
```

### sf-ns-card

A full‑screen card for wall panels and tablets, tuned for the **Sonoff NSPanel Pro (480 × 480, square)** but sized in `vmin`, so it adapts to any screen shape — square, landscape or portrait. Tested (real screenshots, every mode) on every current Sonoff NSPanel screen size:

| Screen | Resolution | Result |
|---|---|---|
| NSPanel (original) | 480 × 320 | works, no overflow |
| NSPanel Pro / Pro Gen2 (86‑type, square) | 480 × 480 | works — the size it is designed around |
| NSPanel Pro 120‑type, landscape | 1334 × 750 | works, balanced |
| NSPanel Pro 120‑type, portrait | 750 × 1334 | works, but panels have more empty space than on the other sizes — this extreme a screen is not yet tuned for density |

(The 120‑type's exact resolution comes from a Sonoff test subdomain, not its final public spec sheet — treat it as indicative rather than a guarantee for that specific model.) It shows different things depending on the time of day:

| Mode | When (default) | What it shows |
|---|---|---|
| Morning | 06 – 09 | weather, **12‑hour rain chart** ("rain in 40 min" / "dry for 12 h"), vehicles (charge, range, lock), room temperatures, shortcuts |
| Day | 09 – 18 | solar orb with self‑use, three rich tiles (home, charger, grid with peak / off‑peak price and cost per hour), charger decision, fridge / freezer pills |
| Evening | 18 – 22 | big ambience tiles (lights, shutters, TV, scenes), **today's consumption, cost, solar share and comparison with yesterday**, vehicles |
| Night | 22 – 06 | "all clear" sentinel (leaks, locks), indoor / outdoor temperature, a "Good night" button that switches everything off |

Also: one alert line when something is wrong (leak, open lock, fridge too warm), a popup for a robot vacuum (shortcuts, return to base, stop), long‑press on any tile for the entity's history, confirmation on "turn everything off".

**Which mode?** Give it an `input_select` with the options `Morning / Day / Evening / Night` (or the French `Matin / Jour / Soir / Nuit`) and an automation of your choice — or leave `mode_entity` out and the mode simply follows the clock. Add `?mode=Evening` to the URL to preview a mode without changing anything.

**Kiosk mode.** Set `hide_header: true` to hide the Home Assistant header on that dashboard (add `?header=1` to the URL to bring it back). Use a dashboard view of type **panel** with this card alone.

```yaml
type: custom:sf-ns-card
mode_entity: input_select.panel_mode      # optional
weather: weather.home
outdoor: sensor.outdoor_temperature
hide_header: true
rooms:
  - { name: Living, icon: mdi:sofa, entity: sensor.living_temperature, min: 17 }
fridge:
  - { name: Fridge, icon: mdi:fridge, entity: sensor.fridge_temperature, max: 6 }
cars:
  - { name: Car A, color: "#00e5ff", soc: sensor.car_a_soc, range: sensor.car_a_range, lock: lock.car_a, charging: binary_sensor.car_a_charging, low: 20 }
tiles:                                    # up to 6, evening mode
  - { name: Living room, icon: mdi:sofa, color: "#ffb300", entity: light.living }
shortcuts:                                # buttons (morning mode + vacuum popup)
  - { name: Kitchen, icon: mdi:silverware-fork-knife, entity: button.vacuum_kitchen }
vacuum: { entity: vacuum.robot, battery: sensor.robot_battery, name: Vacuum }
lights_off: [light.living, light.bedroom]
cover: cover.shutters
scene_dim: scene.dimmed
energy:
  solar: sensor.solar_power
  home: sensor.home_power
  grid: sensor.grid_power                 # + = import, − = export
  ev: sensor.charger_power
  price: sensor.electricity_price
  hc_below: 0.15                          # a price below this is shown as off‑peak
  devices:                                # the two biggest are shown on the "home" tile
    - { name: Heat pump, entity: sensor.heat_pump_power, icon: mdi:heat-pump }
  day:                                    # "today" summary in the evening (long‑term statistics)
    import: sensor.grid_energy_import     # cumulative kWh counters
    export: sensor.grid_energy_export
    solar: sensor.solar_energy_total
    hp: 0.18                              # peak price per kWh
    hc: 0.14                              # off‑peak price per kWh
    hc_hours: [[0.9, 6.9], [14.4, 16.4]]  # off‑peak windows, decimal hours
```

Every entity is optional: a block without its entities is simply not displayed. The cost shown in the evening is an estimate (hourly statistics weighted by your off‑peak windows). Entity ids above are placeholders; the visual editor offers drop‑downs for everything except the free‑form `energy.devices` and `energy.day` objects, which are set in YAML.

**Rearranging a screen.** Each mode is built from a fixed set of named blocks. By default they appear in the order described in the table above, but you can reorder them with `layout` — for example to put the energy wheel on the right instead of the left:

```yaml
layout:
  jour: [energy_stats, energy_dec, energy_orb, fridge]   # was: energy_orb, energy_stats, energy_dec, fridge
```

Block names: `matin: [weather, cars, rooms, shortcuts]` · `jour: [energy_orb, energy_stats, energy_dec, fridge]` (only with `energy.solar` set) · `soir: [tiles, day, cars]` · `nuit: [sentinel, rooms]`. You only need to list the ones you want to move — anything you leave out keeps its place, nothing can disappear by a typo or an outdated list. Morning and Day keep a fixed 2×2 grid (reordering changes which of the 4 cells a block lands in — a block moved out of its usual, bigger cell gets the smaller one instead, the same way a real dashboard would resize it); Evening and Night size each row to what is actually in it, in the order you chose, so an unused block never leaves an empty gap.

**One combination to avoid:** on the Day screen, `energy_stats` (the three stacked Home / Charger / Grid tiles) is designed for the tall cell. Move `energy_orb` or `fridge` into the small cell instead — both were checked there and stay readable; `energy_stats` wasn't, and its text can run into itself if forced into the small cell.

The evening tiles (`tiles:`, up to 6) and this `layout` option were both verified with real screenshots at 2, 4 and 6 tiles and several custom orders, not just read from the code.

<p align="center"><img src="assets/ns-evening.png" alt="Evening mode" width="300"></p>

## Visual editor

Edit a dashboard, open any SF card and switch to the **visual editor**:

- fields are real Home Assistant pickers (entities filtered by domain, icons, numbers, toggles);
- lists (rooms, groups, items, tiles, devices, cameras…) have **+ Add**, **↑ / ↓** and a **two‑tap Delete** (the first tap arms it, so you can't delete by accident);
- in the launcher, each tile's popup content is chosen from a menu and edited with the *editor of that card*, nested;
- rarely used fields (service data, shortcuts…) are YAML boxes inside the form;
- the editor changes the configuration in place and never drops a field it doesn't know;
- **Fill from a device** — in the vehicle, charger and battery editors, pick a Home Assistant *device* and the empty fields are filled with its entities, found from their type (`device_class`, unit, name): battery level, range, power, plug, current… It is a **cautious** best guess: a field is only filled when exactly one entity matches or one matches the expected name (several candidates and no clear winner = left empty); it skips hidden entities, 12 V batteries, odometers, connectivity sensors and *pause / lock / schedule* switches; the sign of a battery's power is not guessed (check `invert`). It **never overwrites** a field you already filled, and a Home Assistant notification tells you how many fields were filled — always check the result. Needs Home Assistant's entity registry (`hass.entities`, Home Assistant 2023.3 or newer);
- every card has a **Theme** field (dark / light / auto).
- **Mandatory fields** are marked with a red bar and a red asterisk (for example the thermostat of a room, the camera of a camera entry). An amber banner at the top of the editor lists what is still missing, and a card with nothing useful to show displays **Card to complete** with the same list instead of an empty frame. The rules are lenient: only a card that would display nothing is flagged.

## Languages

The cards speak **English, French, Spanish, German, Dutch, Italian, Portuguese, Polish, Russian, Chinese (simplified) and Arabic**. The language follows the **Home Assistant profile of the person looking at the dashboard** (*Profile → Language*), so two users of the same dashboard can see two languages. If HA is set to any other language, the cards fall back to **English**. Date and time formats follow the same locale.

Regional variants (`pt-BR`, `zh-Hans`…) use the language of the same family. Arabic switches the cards to right-to-left; diagrams and dials keep their natural orientation.

Texts coming from your own configuration (titles, labels, names) are of course shown as you typed them.

> The languages were chosen from available proxies (Home Assistant publishes no usage statistics per language): the countries behind most downloads and website traffic, and the languages of the HA frontend. The translations were written by Claude; **native speakers are very welcome to review and correct them**.

Want another language? Translations live in one table (`SF_T`, near the top of `dist/sf-cards.js`: *key = French text → `[English, Spanish, German, Dutch, Italian, Portuguese, Polish, Russian, Chinese, Arabic]`*). Pull requests are welcome.

## Light theme

The cards are dark neon by default. For a light dashboard:

```yaml
type: custom:sf-energy-flow-card   # any SF card
theme: light                  # dark (default) | light | auto
```

- `auto` follows the Home Assistant theme: light when HA is in light mode, dark otherwise.
- **Set it once for every card**: add `sf-theme: light` (or `auto`) to your Home Assistant theme — HA turns every theme key into a CSS variable, here `--sf-theme` — then leave `theme` out of the cards (a `theme` set on a card always wins).
- The light variant is a **real palette** (not a colour inversion): every colour is a CSS custom property (`--sf-*`) defined for dark on `:host` and overridden for light, so text contrast, tints and glows are tuned for a light background and images/camera snapshots are never touched.
- In a launcher popup, the sheet gets a light look and SF cards switch to light themselves; other cards (standard Home Assistant cards) keep their own look.
- The wall-panel card (`sf-ns-card`) is dark-only by design (always-on screen).
- No filter is involved any more, so animations cost the same in both themes.

## Look and accent

<p align="center"><img src="assets/looks.png" alt="The same room card: neon, calm dark, calm light, amber accent, pink accent on light" width="820"></p>

Two options work on **every** card, without changing its layout:

```yaml
type: custom:sf-room-card     # any SF card
look: calm                    # neon (default) | calm
accent: amber                 # amber | green | pink | red | any #rrggbb colour
```

- **`look: calm`** keeps the layout, fonts and colours but removes the glow, the corner brackets, the scan lines and the blinking dot. It reads better on a wall screen at night and sits well next to standard Home Assistant or Mushroom cards. Combine it with `theme: light` for a plain light card.
- **`accent`** replaces the main cyan. The four presets follow the dark and light palettes (readable in both); a custom `#rrggbb` is used as is.
- **Set them once for every card**: add `sf-look: calm` and / or `sf-accent: amber` to your Home Assistant theme (like `sf-theme`), then leave the options out of the cards. An option set on a card always wins.
- Both are in the visual editor of every card ("Style" and "Accent colour").
- `sf-radiators-card` already had an `accent` option (the colour of the radiators): it keeps that meaning there; use the theme variable to recolour its frame.

## Layout

The cards **adapt their arrangement to the room you give them** (their own width, not the screen's), and fill the height of their cell — something Home Assistant does not do for custom cards on its own. The energy flow and climate cards reorganise themselves; the tile cards (equipment, sensor batteries, radiators, cameras) use balanced columns; every card stretches to a taller cell.

<p align="center"><img src="assets/layout.png" alt="Energy flow and climate cards side by side, same height, in a Home Assistant sections view" width="820"></p>

- **Even rows**: house modes in as many columns as fit, evened out (6 modes → 3 + 3), rooms and tiles on balanced columns (5 → 3 + 2); icon-only modes when very narrow; long labels end with "…".
- **Equal heights** (sections view): drag the card's resize handle taller, or set `grid_options: { rows: 13 }`: the content takes the extra height (the energy flow spreads out, the rooms grow). Give the cards side by side the same number of rows and they line up (any SF card). In a cell shorter than the content the card scrolls instead of cutting controls off.
- Equal heights work in a **sections** view and in a **panel** view (the card fills the screen). Home Assistant does not stretch custom cards inside a `horizontal-stack`; use a sections view there.
- **Width in a section**: set `grid_options: { columns: full }` to use the whole width of a section of 2 or more columns (the Home Assistant default is half a section).
- It is safe: only a change in the number of columns triggers a redraw, never every pixel, so resizing cannot loop or restart the animations. `./test/run.sh` checks columns, overflow, equal heights and the absence of render loops.

## Accessibility

Everything clickable is a real button for keyboards and screen readers (role, focus ring, **Enter / Space**, a name read aloud, `aria-pressed` on selectors). Popups are dialogs: the focus moves in and comes back, **Esc** closes. Alert levels are spelled out ("critical", "warning") instead of relying on colour alone. With *reduce motion* enabled in your system, animations are switched off, and touch screens get larger tap targets.

## Numbers

Decimals follow the language of your Home Assistant profile (`20,5 °C` in French, `20.5 °C` in English), with Latin digits everywhere and no thousands separator.

## Optional theme

[`themes/sf_hud.yaml`](themes/sf_hud.yaml) dresses the **native** Home Assistant cards (history graphs, logbook, entities lists…) in the same colours. Copy it to `/config/themes/` (with `frontend: themes: !include_dir_merge_named themes` in `configuration.yaml`), reload themes, then set `theme: SF HUD` on a view.

## Requirements

- **Home Assistant** — three different things:
  - **Supported (declared minimum): 2024.11 and later.** This is the oldest release the automated end-to-end test is run against; a bug on 2024.11 or later is a bug to report.
  - **Tested end to end** (a real Home Assistant, all cards rendered, every editor opened, the automatic dashboard): 2024.11, 2025.6, 2026.1, 2026.10 and 2026.11. The continuous integration runs the latest stable, 2026.1, 2025.6 and 2024.11 on every change, and the beta for information only.
  - **Not verified:** anything older than 2024.11 (it may work, nothing checks it; the *Fill from a device* editor feature needs the entity registry in the frontend, about 2023.3 and newer), and the iOS / Android companion apps beyond the web view they use (they follow the browser line below).
- **Browser**: Chrome / Edge 111+, Safari 16.2+, Firefox 113+ (the cards use `color-mix`; the Home Assistant mobile apps follow their system web view).
- No extra resources: the cards and their fonts are one file; they only load what your Home Assistant provides (for instance camera pictures).

## Security

Text that comes from entities (names, states, units, picture URLs) is always escaped before it is displayed and never interpreted as HTML; image URLs must start with `/`, `http://`, `https://` or be a base64 `data:image/` (PNG, JPEG, GIF, WebP) — never `javascript:`. All values from the configuration that end up in HTML attributes are escaped too, CSS values (`color`, `accent`, `span`) only accept safe forms (hex, colour name, `rgb()` / `hsl()`, `var(--x)`), and regular expressions (`include_pattern` / `exclude_pattern`) are limited and refused when they could freeze the browser. The charger controls are off unless you set `controls: true`. The cards only call the Home Assistant services you configured (`switch`, `number`, `select`, `scene`, `script`, `climate`, `light`, `cover`…) with the entities you configured. **Treat shared YAML like shared code:** like Home Assistant's own `call-service` tap action, an `action` item or a `switch_script` calls whatever service its configuration says, under whatever label it shows — read a configuration you copied from the internet before pasting it. Please report a vulnerability privately through GitHub's *Security → Report a vulnerability*.

## Development

```bash
./test/run.sh    # build check, 660 render snapshots, lint, layout, and in headless Chrome: render, security, lifecycle, requests, robustness, accessibility
node scripts/bench.mjs --throttle 4    # optional: benchmark (render cost, requests, memory) with a CPU slowed down like a tablet
```

See the [changelog](CHANGELOG.md) for what changed in each version.

## About HACS and Marketplace

Since **Home Assistant 2026.11**, HACS ships inside Core as **Marketplace**. Existing HACS installations (repositories, update entities, dashboard resources) are migrated automatically, and SF Cards is listed in the default catalogue there. Custom cards are still community content: Home Assistant does not test or support them.

SF Cards is a plain JavaScript dashboard resource, so it works the same way with Marketplace, with HACS on older versions, or installed manually.

Sources: [Matter Alpha — "Home Assistant embraces HACS into core as the marketplace"](https://www.matteralpha.com/news/home-assistant-embraces-hacs-into-core-as-the-marketplace) · [Home Assistant community thread on integrating popular HACS custom cards into standard cards](https://community.home-assistant.io/t/integrating-popular-frontend-custom-cards-on-hacs-to-standard-ha-cards/741706).

## Limitations

- Home Assistant versions: see [Requirements](#requirements) for what is supported, tested and not verified. Developed on 2026.11 with Chrome and the iOS / Android companion apps.
- Some code comments in `src/` are still in French (the UI itself is translated).
- Screenshots use fictional demo data.
- Not validated on real hardware yet: a physical battery (the solar / grid split of the battery origin was tested with simulated values, and is shown with "≈" because it is estimated), low-power tablets, Safari / iOS beyond the companion app's web view, and real screen readers (accessibility is checked by automated tests only). Reports from these setups are very welcome.
- Automated render tests (`./test/run.sh`, headless Chrome) cover every card, the visual editors (with a mock `ha-form`) and the 11 languages; everything was also tried on real installations. A real Home Assistant is driven by the end-to-end workflow on the versions listed under [Requirements](#requirements).
- `sf-presence-card` and the Frigate‑related options are tied to a specific setup and are documented as advanced.

## Ideas and feedback

SF Cards is shaped by the people who use it. In [Discussions](https://github.com/khrom06/SF-Cards/discussions):

- 💡 **[Ideas](https://github.com/khrom06/SF-Cards/discussions/categories/ideas)** — a new card, an option, a layout, a language. Add a 👍 to the ideas you want most: the most voted ones are looked at first.
- 🖼️ **[Show and tell](https://github.com/khrom06/SF-Cards/discussions/categories/show-and-tell)** — share a screenshot of your dashboard.
- ❓ **[Q&A](https://github.com/khrom06/SF-Cards/discussions/categories/q-a)** — help with a setup.
- 🗣️ **[Remarks and criticism](https://github.com/khrom06/SF-Cards/discussions/1)** — what is confusing, ugly, slow or missing.

Found a bug? Open an [issue](https://github.com/khrom06/SF-Cards/issues/new/choose) with your versions and the card's YAML.

## Credits

- **Written by Claude** (Anthropic — Claude Sonnet 5.5, through Claude Code): the cards, the visual editors, the translations, the screenshots pipeline, this README.
- **Ideas, direction, testing and feedback: [khrom06](https://github.com/khrom06)** — the sci‑fi look, the phone popups, the dynamic energy layout, the "hide what consumes nothing" idea, the languages, and a long list of *"what if we…?"* that shaped every card. Many of the best details here are theirs.
- Fonts: **Orbitron** (© The Orbitron Project Authors) and **B612 Mono** (© The B612 Project Authors), both under the SIL Open Font License 1.1 — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- Icons: Home Assistant's Material Design Icons.

## Companion: SF Copilot

[**SF Copilot**](https://github.com/khrom06/SF-Copilot) is a separate card of the SF family. It reads Home Assistant's history, finds what you keep doing by hand and proposes the matching automation, with a dry run first. Local only: no cloud, no AI model. It is installed on its own and does not change SF Cards.

## License

[MIT](LICENSE) © khrom06. Embedded fonts are under the [SIL OFL 1.1](THIRD_PARTY_NOTICES.md).
