# 03 — Architecture and lifecycle audit (phase 3)

Baseline `5212cf9` (v1.21.0). **Code changed in this phase** (3 source files, 1 test). Everything uncommitted, nothing published.

## Result in one line
The architecture is sound and consistent; the lifecycle had **2 real leaks** (one timer, one Home Assistant subscription pattern in 2 cards). Both are fixed and covered by a new test that failed before the fix.

## 1. Architecture as found
- One base class `SfBase` (`07-base.js`, 284 lines) carries everything shared: config normalisation (`sfNormConfig`), rAF-batched render with HTML-string comparison, `data-call` / `data-confirm`, a11y pass, theme, language, number formatting, size observer. 30 cards extend it; each overrides only `render()`, `css()`, sometimes `set hass` / `setConfig` / `connectedCallback`.
- Data cards share one guarded loader, `SfLoader` (`08-loader.js`: never two runs, `ttl`, `retry`, re-render on completion). Used by 8 cards (machines, trend, timeline, upkeep, automations ×2, cycles, room, report). It already solves the "HA calls `hass` several times per second" problem once.
- Measured on 255 class methods: **1 above 80 lines** (`15-reactor.js:71 render`, 106 lines), 6 above 50. No runaway function.
- `catch`: 52 blocks, 17 empty-with-a-comment, 1 empty without. Not a pattern of swallowed errors; the failure paths of loaders and subscriptions record a retry timestamp.
- No circular dependency is possible by construction (concatenation in file-name order, one scope; `lint.js` and the 660 snapshots pin the rest).
- The one structural exception is `sf-ns-card` (wallpanel, 598 lines): own `_schedule` / `_render`, own `_a11yNs`, own two-press confirmation (`25-wallpanel.js:305-315`), own loader (7 `busy` / `At` fields). Justified by its kiosk behaviour (the clock minute is excluded from the diff, long-press), but it is the divergence hot spot.

## 2. Lifecycle review (what was checked)
| Item | Finding |
|---|---|
| `setInterval` | 11 sites. All cleared in `disconnectedCallback` (and re-armed in `connectedCallback`). Confirmed by running all 30 cards: mount → remove → quick remove → 5 re-insertions leave 0 interval. |
| `setTimeout` | 16 sites, all one-shot (theme re-read 300 ms, confirm 4 s, flash 600 ms), guarded by `isConnected` where they touch the DOM. |
| `ResizeObserver` | base `_sfRo` and reactor `_ro`: created on connect, `disconnect()` + nulled on removal, recreated on re-insertion. |
| `MutationObserver` | none in cards (lint rule 4 forbids new ones). |
| `window` / `document` listeners | launcher only; removed. |
| HA subscriptions | `weather/subscribe_forecast` in air, weather, ns. **Leak found in air and ns (below).** |
| `connectedCallback` / re-insertion | resets `_lastHtml`, theme cache, restarts timers and size observer. No duplicated subscription after 4 cycles (new test). |
| `setConfig` while attached | air and weather unsubscribe when the weather entity changes; ns did not need to. |

## 3. Defects found, fixed, tested
| ID | File:line | Sev. | Scenario | Fix | Test |
|---|---|---|---|---|---|
| R-1 | `07-base.js:271` `timerInfo` | P3 | A card with a running timer is removed between `hass` and the next frame (typical when switching dashboard views quickly). The queued render starts a 20 s interval on a detached card; nothing clears it; it re-renders the detached card forever. | start the refresh interval only if `isConnected`; `connectedCallback` re-renders and starts it when the card is attached later (also verified for a card rendered detached then attached). | `lifecycle.html` 1 and 1b |
| R-2 | `29c-air.js:43`, `25-wallpanel.js:240` | P2 | The card is removed (or its weather entity changed) while `subscribeMessage` is still being answered. On resolution the unsubscribe function is stored on a card that is no longer in the page: the WebSocket subscription stays open and keeps pushing forecasts to a dead card, and a reconnection cannot close it. `weather` card already had the right guard; `air` and `ns` did not. `ns` also subscribed while detached. | after the `await`, keep the subscription only if the card is still connected and still points at the same entity, otherwise close it at once; `ns` also checks `isConnected` before subscribing. Same pattern as `29h-weather.js:39`. | `lifecycle.html` 2 (with a 40 ms simulated round trip) |

Proof that the test is real: **before the fix** the new page failed with 5 assertions (air and ns subscription left open, machines interval on a detached card, machines countdown test); **after**, all pass. The 660 render snapshots are unchanged (no markup change).

## 4. Architecture findings (not changed)
| ID | Observation | Evidence | Proposal | Value / cost / risk |
|---|---|---|---|---|
| A-1 | The forecast subscription is written three times (air, weather, ns), and R-2 shows the copies already diverged: one correct, two buggy. | `29c-air.js:37`, `29h-weather.js:26`, `25-wallpanel.js:234` | One shared helper (e.g. `sfForecast(owner, entity, type)` next to `SfLoader`) with the connected/entity guard in a single place. | **Real value** (a bug class removed, proven by this very leak), ≈½ day, moderate regression risk (3 cards; the new lifecycle test + snapshots cover it). Recommended for phase 9 if you agree. |
| A-2 | Two confirmation implementations (`07-base._arm/_onCall`, `25-wallpanel` bind). | the `armed` markup/logic appears 12× / 5× | Leave. The wallpanel renders only when its key changes, so it does not need the re-arm after re-render that the base has; unifying means touching the kiosk. | Low value, medium risk: **do not do**. Both are covered by tests (base by `security.html`; the wallpanel one by the existing render tests — **verified in phase 6 by mutation: bypassing it fails the suite**; the first draft of this report wrongly said it was uncovered). |
| A-3 | 13 cards override `set hass` with the same 3 lines (store, optional load, `_schedule`) and, being setter-only, hide any `hass` getter. | grep `set hass` | Leave. Each override differs by one call; a template-method hook would add indirection for no bug. | Not worth it. |
| A-4 | `15-reactor.js render` is 106 lines. | measured | Split only when next modified (the battery feature of 1.21.0 added to it). | Cosmetic; no change now. |
| A-5 | `sf-ns-card` has its own loader fields (`_dayBusy`, `_dayAt`, …) while 8 cards use `SfLoader`. | `25-wallpanel.js:_loadDay` | Move `_loadDay` onto `SfLoader` when the wallpanel is next touched. | Small value, low risk. |
| A-6 | No central error reporter, no shared `unavailable` helper beyond `ok()` / `num()`. | — | **Not recommended**: errors are handled locally and surfaced as the "card to complete" frame or a dash; a central layer would add code without a demonstrated need. | — |

## 5. Tests run
- Full `./test/run.sh` green after the changes (1 min 04 s): build check, 660 snapshots (unchanged), lint, layout, render, security, **lifecycle (new)**.
- New: `test/lifecycle.html` (≈70 lines), wired into `test/run.sh`.
- Before/after proof: lifecycle page red (5 failures) on the unfixed code, green on the fixed code.

## 6. Limits
- The leak tests use a simulated connection and simulated frame timing (`requestAnimationFrame` = `setTimeout(0)`), so timing in a real browser/WebSocket is approximated, not measured. The real-HA e2e (`ha-e2e.yml`) was not run.
- Subscriptions for `callWS` (one-shot) cannot leak; only `subscribeMessage` was audited.
- Memory (heap growth over hours) was not measured: phase 4.

## 7. Status
- **Corrected and tested:** R-1, R-2.
- **Identified, not corrected:** A-1 (recommended), A-2…A-5 (leave or later).
- **Not verified for lack of environment:** real browsers other than headless Chrome, real HA.

## TODO phase 4 (performance, benchmark first)
1. Build a reproducible benchmark (headless Chrome): initial render of each card, cost of one `hass` update with N cards, DOM node count, listener count, interval count, heap after N cycles.
2. Only then look at optimisations (candidate hypotheses: HTML string rebuild per `hass` tick, 279 KB of translations parsed up front, history requests duplicated between cards).
