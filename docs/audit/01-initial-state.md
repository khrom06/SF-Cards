# 01 — Initial state (audit phase 1)

Baseline: commit `5212cf9` (v1.21.0), branch `main`, working tree clean. No code was modified in this phase.
Method: reading the sources, `./test/run.sh`, two throw-away probes (lifecycle, hostile-state XSS) kept outside the repo.

## 1. Repository
- Runtime: one file, `dist/sf-cards.js` (844 000 B minified, 257 393 B gzip). No runtime dependency. `hacs.json` = `{name, render_readme, filename}`.
- Source: 49 modules in `src/` (7 300 lines, 866 KB; lines are long), concatenated in file-name order then minified by esbuild (`scripts/build.mjs`; `--check` fails if `dist/` or `docs/sf-cards.js` differ from `src/`).
- Only dev dependency: esbuild. `npm audit` (with and without dev): 0 vulnerabilities.
- Biggest modules: `03-i18n-data` 279 KB (11 languages), `25-wallpanel` 58 KB, `02-fonts` 42 KB, `41-editor-specs` 38 KB.

## 2. The 30 cards (`src/30-registry.js`, `SF_DEFS`)
All extend `SfBase` (`src/07-base.js`, 284 lines: setConfig / hass setter / rAF-batched render with HTML-string comparison / `data-call` + `data-confirm` / `data-e` more-info / a11y pass / theme / size observer).
alert 10 · hangar 11 · radar 12 · machines 13 · bridge 14 · reactor 15 · climate 16 · console 17 · camera 18 · setpoints 19 · ledger 20 · cells 21 · launcher 22 · battery 23 · radiators 24 · ns (wallpanel) 25 · trend 26 · timeline 27 · health 28 · assistant 29 · host 29a · upkeep 29b · air 29c · automations 29d · cycles 29e · room 29f · media 29g · weather 29h · agenda 29i · report 29j.
Plus `SfStrategy` (31), aliases (`SF_ALIAS`), a visual editor per card (`40–46`, built on `ha-form`).
Exception to the base render path: `sf-ns-card` (wallpanel) has its own `_schedule` / `_render` and a kiosk mode.

## 3. Tests and CI (measured, `./test/run.sh`, 1 min 03 s)
| Step | Result |
|---|---|
| `build --check` (src ↔ dist ↔ docs) | OK, 49 files |
| `node --check dist` | OK |
| render snapshots | OK, 660 renders identical |
| `test/lint.js` (6 reliability rules) | OK |
| `test/layout.mjs` (columns, heights, overflow, no render loop) | OK |
| `test/render.html` (headless Chrome) | OK |
- sha256 of `dist/sf-cards.js` = `docs/sf-cards.js` = `69f915d2…07de3b` (identical).
- CI: `validate.yml` (HACS action + `npm ci` + `run.sh`, weekly cron) and `ha-e2e.yml` (real HA container + Playwright, `stable` image by default, only on changes in `dist/`, `test/`).
- Not run in this phase: `ha-e2e` (needs Docker + HA image), `test/visual.mjs`.

## 4. Public behaviour that must not regress
YAML options of the 30 cards and their aliases; `data-confirm` two-press protection on heavy actions; automatic "card to complete" message; 11 languages with English fallback; dark/light/auto theme; HACS install of one file; strategy `ll-strategy-dashboard-sf-home`.

## 5. Probes run (not committed)
**P-life** — all 30 cards, `FULL` fixtures, live `setInterval` counted: mount → remove → quick remove → 5 re-insertions.
- 10 cards own a timer; all go back to 0 after removal and do not accumulate over 5 re-insertions. Good.
- Special case (`timerInfo`, used by machines and climate): set `hass`, remove the card before the animation frame fires, with an active `timer.*` → **1 interval leaks** (see R-1).

**P-xss** — all 30 cards, every string state / attribute / friendly_name / icon replaced by an HTML+attribute payload, `entity_picture` = `javascript:`:
- 30/30 render, 0 injected nodes (`img[onerror]`, `svg[onload]`, `[onmouseover]`, `script`), 0 `javascript:`/`data:` URLs in `src`/`href`, 0 handler fired.
- Limit: states/attributes only. Config-supplied values (colours, URLs, services) were not fuzzed (the dashboard author is trusted; see risk 3).

## 6. Static findings (grep, to be confirmed in phase 2)
- `innerHTML`: 13 uses, all on `shadowRoot` / buttons with `esc()`-ed content. `outerHTML`, `insertAdjacentHTML`, `document.write`: 0. `eval` / `new Function`: 0 (matches were `_eval` methods). `localStorage`: 0. `fetch`/`WebSocket`: 0 direct (HA `callWS` only, 10 files).
- `esc()` escapes `& < > " '` — correct for HTML text and quoted attributes. It is also used inside `style="…"` (e.g. `--ac:${x.color}`): HTML-safe but not CSS-safe (author-controlled config only).
- `<img src>` takes `entity_picture` / config `snapshot` through `esc()`: no script execution possible in `img`, but an external URL can be fetched (tracking only).
- Global listeners: only `sf-launcher-card` (`popstate`, `hashchange`, `keydown`), all removed.
- HA subscriptions (`weather/subscribe_forecast`) are unsubscribed on disconnect and on config change (air, weather, ns).
- Private / unstable frontend elements used: `hui-root`, `hui-view-container` (wallpanel), `ha-form`, `ha-entity-picker`, `loadCardHelpers` (editors, launcher).
- `service` of `data-call` is validated by regex `domain.service` only; any service is callable from YAML (by design).
- Doc drift: `CONTRIBUTING.md` says "no minification", `build.mjs` minifies.

## 7. Top 5 risks (ranked)
1. **R-HA — Home Assistant compatibility is asserted, not verified.** README: "developed and tested on 2026.11, older versions may work". No minimum version, e2e runs only on `stable`. Wallpanel depends on private `hui-root` / `hui-view-container`; editors on `ha-form` / `ha-entity-picker`. A frontend change breaks users before CI notices. Hypothesis to verify: e2e on N-1 and `beta`.
2. **R-TEST — the safety nets check shape, not behaviour.** Lint rule 2 only requires a `clearInterval` to exist; it missed R-1. There is no XSS regression test (the probe passes today, nothing keeps it so), no service-call test, no lifecycle test. 660 identical snapshots prove the HTML did not change, not that it is correct.
3. **R-ACT — service calls and confirmation are UI-only.** `data-confirm` is a 4 s two-press button state; no in-flight guard, and any YAML can call any service without confirmation. Probably acceptable by design (the author is trusted); needs a decision, not a patch. Exploitation scenario for a non-admin viewer: not demonstrated.
4. **R-CI — supply chain of the pipeline.** `hacs/action@main` and actions pinned to tags, not SHAs; `ha-e2e.yml` declares no `permissions`; no audit / bundle-size / translation gate in CI (audit is clean today).
5. **R-PERF — unmeasured.** Every `hass` update recomputes the whole card HTML string for each card, then compares strings (cheap DOM, expensive CPU on a tablet with many cards). 279 KB of translations and 58 KB of wallpanel are parsed by every user. No benchmark exists. Hypothesis only.

## 8. Confirmed defect
**R-1 (P3)** — orphan 20 s interval after a quick remove. `_schedule()` has no `isConnected` guard, so a frame queued before `disconnectedCallback` renders a detached card, `timerInfo()` starts `_ti`, and nothing ever clears it. The interval then re-renders a detached card forever. Reproduced (probe P-life, machines card). Fix idea: guard in `_schedule` (or in `timerInfo`), plus a lifecycle test that fails without it.

## 9. Other measured facts
- esbuild `charset: ascii` (default) inflates the file by 131 KB raw (844 000 vs 712 925) but only 6 KB gzipped (257 393 vs 251 130). Low value (P3).

## Status of each item
- Corrected and tested: none (no code touched).
- Identified, not corrected: R-1, doc drift, charset, CI pinning.
- Not verified for lack of environment: other HA versions, Docker e2e, screen readers.
