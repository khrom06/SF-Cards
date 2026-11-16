# 04 — Performance audit (phase 4)

Baseline `5212cf9` + phases 2–3 fixes. Method: **benchmark first** (`scripts/bench.mjs` + `test/bench.html`, real time in headless Chrome 157 through the DevTools protocol, fake data, 4-core PC; CPU throttled ×4 and ×6 to approximate a wall tablet). Raw results: `docs/audit/bench/*.json`. Absolute numbers depend on the machine; only same-machine, back-to-back comparisons are meaningful. Reproduce: `node scripts/bench.mjs --throttle 4`.

## Result in one line
**Rendering performance is good and no render optimisation is justified by the measurements.** One real inefficiency was found in Home Assistant requests (editing a card re-fetched everything) and fixed: 755 → 5 requests.

## 1. Baseline (before any change)
| Metric | PC (×1) | Tablet-like (×4) | Slow tablet (×6) |
|---|---|---|---|
| Load + evaluation of `sf-cards.js` (844 KB) | 33–38 ms | 104 ms | 159 ms |
| First render of a 30-card page | 29–37 ms | 147 ms | 238 ms |
| One `hass` update, 30 cards, median / p95 | 5.2 / 8.7 ms | 26.9 / 42.2 ms | 43.9 / 61.2 ms |
| Same, house with 3 000 extra entities | 6.2–6.6 / 9.8 ms | 32.3 / 45.3 ms | 53.7 / 68.3 ms |
| DOM nodes of 30 cards | 1 386 | 1 389 | 1 389 |
| Heaviest single card, initial render | upkeep 1.0 ms | upkeep 5.1 ms | upkeep 7.2 ms |
| Heaviest single card, idle update | report 0.5 ms | report 2.4 ms | report 4.1 ms |
| Most listeners / nodes | ns 46 / upkeep 192 | | |
| Heap growth after 40 mount-unmount cycles of 30 cards (1 200 cards) | +66–79 KB (≈60 B per card) | | |
| Intervals alive after removal | 0 | | |
- A "30 cards on one page" worst case costs ≈27 ms per `hass` update at ×4. A realistic page (5–10 cards, the wall panel being one card at ≈0.9 ms) costs a few ms, and `requestAnimationFrame` coalesces updates to at most one per frame. Entity count barely matters (+1 ms with 3 000 extra entities): cards do not scan `hass.states`, except the automations card which filters `automation.*` (0.4 ms).
- Memory: no leak signal; the tiny growth is allocator noise. No listener accumulation after removal (events are on elements that are destroyed with the shadow root).

## 2. Hypotheses tested
| Hypothesis | Verdict |
|---|---|
| H1 "Rebuilding every card's HTML string on every `hass` update is costly on a tablet." | **Rejected for typical use** (5 ms for 30 cards on PC, ≈1 ms/card at ×4). A skip-render-if-no-entity-changed cache would save ≤ 25 ms at ×4 on an unrealistic 30-card page and needs entity dependency tracking: stale-display risk > gain. **Not recommended.** |
| H2 "279 KB of translations + 58 KB wallpanel parsed by everyone hurt start-up." | **Rejected as a problem**, 35 ms on PC / 104 ms at ×4, once per page load, not blocking rendering of other things beyond that. Lazy loading would need several files and break the one-file HACS model. **Not recommended.** |
| H3 "Cards ask HA for the same data several times." | **Partly confirmed, and fixed** (see 3). At mount the 30 cards make 14 requests; the one repeated request is a fixture artefact (the launcher opens 5 popups, each with an automations card whose fake data has no ids). During 100 updates: **0 requests**. |
| H4 "Animations (CSS) are costly on a small device." | **Not measured** (needs a frame-timing trace on real hardware). Cards honour `prefers-reduced-motion` per phase-7 checklist (to be verified there). |

## 3. Defect found and fixed — request storm on configuration edits (P2)
| | |
|---|---|
| Where | `setConfig` of 9 cards reset their loader (`this._ld.reset()`); `29d-automations.js:23` also reset the per-automation scan |
| Scenario | The dashboard editor and the card editor call `setConfig` on every change, mostly with an unchanged or cosmetically changed configuration. Each call threw away the cached history and fetched it again. With 150 automations, the automations card scans them with **151 sequential `search/related` WebSocket requests**; one title keystroke = another 151. |
| Measured before | 150 automations: 151 requests at mount, **755 more after 5 edits**. Re-applying the *same* config 5×: report +5, upkeep +10, automations +30, cycles +5, timeline +5, trend +5, machines +5. |
| Fix | `SfBase.setConfig` computes `_cfgSame` (JSON of the normalised config unchanged); the 8 data cards reset their cache only when the configuration really changed. The automations related-entities scan is keyed by the list of automations and kept 15 min, so no configuration edit resets it (a change of `include` / `exclude` changes the key and rescans). |
| Measured after | 755 → **5** requests (one cheap `trace/list` per title edit); same-config re-apply: **0** for all cards. |
| Test | new `test/requests.html` (wired into `run.sh`): same-config re-apply = 0 requests for every card; changing a trend series / timeline entity / machines sparkline **still reloads** (no stale data); automations: 60-automation scan, 4 title edits = 0 extra scan, changing `include` rescans. **Red on the unfixed code** (8 failures, 260 extra requests), green on the fixed code. |
| Not changed on purpose | `_h`, `_per`, `_off` (selected range/period) are still reset by `setConfig`: that is a behaviour, not a request cost. |

## 4. Other observations (not changed)
- The wallpanel (ns, 598 lines) has the highest listener count (46) and 4.6 ms initial render at ×4: acceptable for the one card on a kiosk.
- `sf-report-card` is the most expensive idle update (0.5 ms PC / 2.4 ms ×4): it recomputes aggregates on every tick. Worth a look only if it ever shows in a real profile.
- WebSocket requests are already sequential for the 150-automation scan ("never a burst"), cached 15 min, and capped (150).
- Sharing identical history requests between two cards on the same page (same entities, same range) is possible but no real duplicate was observed; **not recommended** without a demonstrated duplicate.

## 5. Tests run
`./test/run.sh` green, 1 min 05 s: build check, 660 snapshots (unchanged), lint, layout, render, security, lifecycle, **requests (new)**. Benchmarks before/after saved in `docs/audit/bench/`.

## 6. Limits
- Headless Chrome on one PC with CPU throttling is an approximation of a tablet, not a measurement on one. Real devices (iOS Safari, Android WebView, Fully Kiosk) not measured.
- Fake data; the states are simpler than a real house. The 3 000-entity scenario covers breadth, not attribute weight.
- Animations, paint and layout cost not measured (only JS work); long-session heap (hours) not measured.

## 7. Status
- **Corrected and tested:** request storm (8 cards + automations scan).
- **Identified, not corrected (deliberately):** H1, H2, shared history requests, report-card aggregates.
- **Not verified for lack of environment:** real tablets, animation frame cost.

## TODO phase 5 (Home Assistant compatibility)
List frontend APIs, private elements and WebSocket types used; check each against what is documented/stable; decide a minimum supported version; review what the E2E covers; run the E2E locally only if Docker is available.
