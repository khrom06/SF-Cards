# 05 — Home Assistant compatibility and robustness (phase 5)

Baseline `5212cf9` + earlier fixes. Real environment available: the owner's HA **2026.11.1** (read-only checks) and the GitHub `ha-e2e` workflow. **Not available here:** Docker, any other HA version.

## Result in one line
The cards cope with missing, odd and failing Home Assistant data (one new test, 660 card×scenario runs, 26 failures found on the first run, 0 after the fix). Compatibility with versions **other than 2026.11 is unverified** and no minimum version is declared.

## 1. Environment evidence
| Check | Result |
|---|---|
| HA of the owner | `2026.11.1` (latest), SF Cards 1.21.0 deployed there on 2026-11-16 |
| `ha-e2e` (real HA container + Playwright, image `stable`) | green on the last 6 pushes, including `5212cf9` (v1.21.0), 2026-11-16 |
| `validate` (HACS action + `run.sh`) | green on `5212cf9`, push and weekly schedule |
| Older / beta HA | **not run** (no Docker locally; the workflow takes an `ha_version` input but only `stable` is ever used) |

## 2. Inventory of what the cards use from Home Assistant
**Core, documented and stable:** `hass.states`, `callService`, `callWS`, `connection.subscribeMessage`, `locale.language` / `language`, `themes`, `user.id`, `config.unit_system`, the `hass-more-info` event, `window.customCards`, `getStubConfig`, `getConfigElement`, `getCardSize`, `getGridOptions`, strategies (`customStrategies`, `generate`).
**Frontend-internal but used by most custom cards (stable in practice, no contract):** `hass.entities` / `devices` / `areas` (registry display data: editor auto-fill, automatic dashboard), `hass.formatEntityState` (guarded, falls back to empty), `window.loadCardHelpers`, `ha-form`, `ha-entity-picker` (editors; guarded by `customElements.get(...)`, otherwise the editor falls back), `callApi`.
**Private DOM (one place):** `home-assistant → home-assistant-main → ha-panel-lovelace → hui-root` to hide the header in the kiosk wall panel (`25-wallpanel.js:528`). **Wrapped in `try/catch`**: if the structure changes the bar simply stays visible. This is the right design.
**WebSocket types (all fixed, none from configuration):** `history/history_during_period`, `recorder/statistics_during_period`, `logbook/get_events`, `trace/list` and `search/related` (admin-only: failure handled by the loader's fallback), `energy/get_prefs`, `weather/subscribe_forecast`.
Deprecated API in use: none identified. From my knowledge (not verified here), `getGridOptions` needs a sections-capable HA (2024.11+ for the full set), `weather/subscribe_forecast` HA ≥ 2023.12, `formatEntityState` a 2023-era frontend. So the practical floor is probably 2024.11, but nothing in the repo or CI says so.

## 3. Robustness test (new): `test/robustness.html`
All 30 cards × these scenarios, asserting no exception, no unhandled rejection, no empty render:
- entities: none at all, all `unavailable`, all `unknown`, non-numeric states, empty/odd states, `null` attributes, wrong-typed attributes;
- WebSocket: reject, never answers, `null`, junk object, array of junk, a number; forecast subscription refused;
- minimal `hass` (`{states:{}}`, `{}`);
- wrong configuration: empty, title only, strings where lists are expected, numbers everywhere, nulls, nested garbage;
- life cycle: five language changes (incl. `ar`, `zh-Hans`, `pt_BR`, an invalid code), theme change, all entities removed then restored, config change.
**First run on the unfixed code: 26 failures.** Not one of them was a missing/unavailable entity or a WebSocket problem (those were already clean); all were **a wrong *type* in an attribute or in a nested config**:
| ID | Cause | Cards hit | Realism |
|---|---|---|---|
| H-1 | `unit_of_measurement` that is not a string made `watts()` / `.split()` throw | room, report, cycles, host, hangar, reactor, ns, radiators, battery, launcher | low (HA validates units) but a one-line central fix |
| H-2 | `options` / `preset_modes` that is not a list (`(x \|\| []).map`) | climate, console, hangar, battery, radiators, ledger | low (custom integrations) |
| H-3 | console `groups[].items` that is a string or contains `null` (YAML typo) | console | **plausible** (a typo in YAML) |
Fix (7 files, minimal): `unit()` always returns a string; new `arr()` helper in `SfBase` used at the 8 option-list sites; console filters non-object items. **After: 0 failures.** Snapshots unchanged (no markup change). The new test is wired into `run.sh` (+3 s).

## 4. Recommendations (not done: need an environment or a decision)
| ID | Proposal | Value | Cost | Risk |
|---|---|---|---|---|
| C-1 | Declare a minimum HA version only after testing it. Add a CI matrix to `ha-e2e.yml`: `stable`, previous month (e.g. `2026.10`), `beta` with `continue-on-error: true`. | high: catches a frontend break before users do | ½ h, runs on GitHub (needs the owner's go to push a workflow) | none for users |
| C-2 | After C-1, set `"homeassistant": "<tested floor>"` in `hacs.json` and write it in the README ("tested on X, Y"). | medium | 5 min | none |
| C-3 | A nightly `ha-e2e` against `beta` (non-blocking, issue on failure). | medium | 15 min | none |
| C-4 | Keep `hass.entities` use guarded as it is; no abstraction layer. | — | — | — |

## 5. Tests run
`./test/run.sh` green, 1 min 07 s: build check, 660 snapshots, lint, layout, render, security, lifecycle, requests, **robustness (new)**. The robustness page was red (26) before the fix and green after.

## 6. Limits
- Simulated `hass`: shapes follow the HA docs and what real integrations send, not a recording of a live instance.
- Real HA frontend only through the CI e2e (stable) and the owner's instance (not driven by me in this phase).
- Not verified: older HA, beta, mobile apps, other browsers.

## 7. Status
- **Corrected and tested:** H-1, H-2, H-3.
- **Identified, not done:** C-1…C-3 (CI changes and a README claim).
- **Not verified for lack of environment:** any HA other than 2026.11.1.

## TODO phase 6 (tests and CI)
Review what the whole suite really guards (mutation checks per area), list uncovered scenarios (wallpanel confirmation, editors, strategy), CI hygiene (action pinning, permissions, audit, size gate, translation check), then propose the CI changes together with C-1.

## Update — compatibility matrix run (2026-11-16, evening)
Docker is not available here, so real Home Assistant releases were installed with `uv` / `pip` (isolated virtual environments, the project's own `package_constraints.txt` applied), started on a fresh configuration, and the repository's end-to-end test (`test/e2e/run.mjs`: onboarding, 25 cards registered and rendered, 15 editors opened with the real `ha-form` / `ha-entity-picker`, an entity chosen, the automatic dashboard) was run against each with Chrome.
| Home Assistant | Python | Result |
|---|---|---|
| 2026.11.1 (stable) | 3.14 | **pass** |
| 2026.10.4 | 3.14 | **pass** (one cold-start frontend error in the very first attempt, not reproduced) |
| 2026.1.3 | 3.13 | **pass** |
| 2025.6.3 | 3.13 | **pass** |
| 2024.11.3 | 3.12 | **pass** |
Positive control: the same run with a bundle that throws an error on purpose **fails**, so the test still detects a defect of ours.
What had to change in the test, and why: (1) the entity picker's search ordering and value differ between versions (the older picker keeps the typed text), so the check now accepts any entity of the test house; (2) the "Edit" button gets one retry (the view can still be loading); (3) JavaScript errors are classified by origin: those with SF-Cards code in the stack fail the run, the frontend's own errors (an aborted view transition, an unparsable rejection) are listed as notes. Freezes are still detected separately, whatever the source.
Honest limits: these are pip installs, not the official container images the CI uses; the local setup needed dependency pins and a few extra packages that have nothing to do with SF-Cards (documented in the session, not committed); versions older than 2024.11, the mobile apps and other browsers are untested; the CI matrix in `ha-e2e.yml` (stable, 2026.1.3, 2025.6.3, 2024.11.3, beta non-blocking) has **not yet run on GitHub**.
Consequence for the score (see 10): "Home Assistant compatibility" moves from 7.0 to 8.3. `hacs.json` was **not** given a minimum version: forcing it would block users on older versions that may work; the tested range is stated in the README instead.
