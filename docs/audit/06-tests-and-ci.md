# 06 — Tests and CI/CD (phase 6)

Baseline `5212cf9` + earlier phases. Everything below measured; nothing pushed, so the CI changes are **untested on GitHub**.

> **Update 2026-11-17:** the workflows have since run on GitHub (validate and the HA matrix: stable, 2026.1.3, 2025.6.3, 2024.11.3 green, beta non-blocking). The text below is the state at the time of the phase.

## Result in one line
The pre-existing suite is strong on **rendering** (660 snapshots, layout, lint) and weak on **behaviour**; 4 of 12 deliberate bugs went unnoticed. Phases 2–6 added 4 behavioural test pages; the 4 gaps are closed and one real UX defect was found on the way.

## 1. What the suite is (final state)
| Step in `./test/run.sh` (1 min 07 s) | Guards |
|---|---|
| `build --check`, `node --check` | src ↔ dist ↔ docs identical; syntax |
| `snapshots.mjs` (660 renders) | markup + text of every card × 11 languages × dark/light, frozen clock |
| `lint.js` (6 rules) | `:scope` in shadow DOM, interval/listener clean-up *exists*, single MutationObserver, subscription guard, theme tokens |
| `layout.mjs` (real time) | columns, equal heights, overflow, no render loop |
| `render.html` | translations complete, per-card scenarios, confirmation, strategy, editors |
| **`security.html` (new, ph. 2)** | hostile states / config, CSS & URL contexts, prototype pollution, two-press confirm |
| **`lifecycle.html` (new, ph. 3)** | timers and HA subscriptions after any kind of removal, re-insertion |
| **`requests.html` (new, ph. 4)** | no repeated HA requests on config re-apply, no stale data |
| **`robustness.html` (new, ph. 5/6)** | missing / odd / failing data, wrong config, language / theme changes, no raw `unavailable`, config normalisation, hidden tab |
Not in `run.sh` (by design): `visual.mjs` (pixel hashes, machine-dependent), `bench.mjs` (timing), `ha-e2e` (needs Docker; runs on GitHub).

## 2. Do the tests fail when behaviour is wrong? (mutation checks)
12 deliberate defects, each applied to `src/`, rebuilt, full suite run, then restored (`src` restored byte-for-byte, `dist` identical):
| # | Defect injected | Original suite | After phase 6 |
|---|---|---|---|
| 0 | `unavailable` treated as a value (`ok()`) | **not caught** | caught (4 failures) |
| 1 | light theme ignored | caught (330 renders) | caught |
| 2 | number grouping turned on | caught (22) | caught |
| 3 | column balancing off | caught (layout) | caught |
| 4 | buttons lose role / keyboard | caught (616) | caught |
| 5 | wallpanel two-press bypassed | caught (render) | caught |
| 6 | config list normaliser keeps `null` | **not caught** | caught |
| 7 | automatic dashboard returns nothing | caught | caught |
| 8 | translation fallback removed | not caught | **equivalent mutant**: entries are verified complete, so the fallback is unreachable; no test needed |
| 9 | config warnings disabled | caught | caught |
| 10 | service-string validation removed | caught | caught |
| 11 | camera keeps polling in a hidden tab | **not caught** | caught |
Earlier phases: `esc()` disabled, colour filter bypassed, `data-confirm` ignored (security); 5 leak / request defects (lifecycle, requests) — all red before the fix, green after.
Honest reading: 8/12 were caught by the old suite, 11/12 meaningful ones now; the one left is an equivalent mutant.

## 3. Defect found by the new tests (fixed)
**U-1 (P3)** — `sf-bridge-card` showed the raw word `unavailable` as the weather condition and `sf-climate-card` showed it as the room mode when the entity was unavailable/unknown (visible, untranslated, in the user's language it reads as a bug). Both now show "No data" (`common.no_data`, already translated in 11 languages). 2 lines. Snapshots unchanged (no snapshot had an unavailable entity: that is exactly why nothing had noticed).

## 4. Coverage gaps still open (not tests I could close cheaply)
| Gap | Why it matters | Proposal |
|---|---|---|
| No test that a *visual editor* round-trips a config (`getConfigElement`) outside the real HA e2e | editors are ~900 lines of `41-editor-specs` | e2e already opens each editor; extend it only if an editor bug appears |
| `visual.mjs` not in CI (pixel hashes differ per machine) | pure CSS regressions (spacing, colour) pass the suite when markup is unchanged | accept; snapshots hash the CSS in `render` (reported as "CSS only" changes) |
| Animation / frame cost, real browsers other than Chrome, mobile apps | — | out of reach here |
| a11y: no automated check beyond the markup snapshot (roles, labels) | WCAG regressions invisible | phase 7 proposes a cheap axe-like contrast/label check |

## 5. CI/CD review and changes (local only, to be pushed with the owner's go)
| ID | Finding | Change made |
|---|---|---|
| CI-1 | actions pinned to the floating `v4` tag | `checkout` and `setup-node` pinned to commit SHAs (comments `# v4.4.0`) in both workflows |
| CI-2 | `ha-e2e.yml` had no `permissions` block (default token scope) | `permissions: contents: read` |
| CI-3 | no automated update of pins / esbuild | `.github/dependabot.yml` (actions + npm, weekly) |
| CI-4 | `hacs/action@main` unpinned | **left on purpose**, comment added: HACS rules evolve; a stale pinned copy would validate against old rules |
| CI-5 | E2E only against `stable` | **not changed**: a matrix with the previous month and `beta` (non-blocking) is recommended (C-1, phase 5) but I will not ship workflow code I cannot run locally |
| CI-6 | no bundle-size gate | not added: size is 844 KB raw / 257 KB gzip, stable; a threshold would be arbitrary. Reporting it in the job summary is a possible 5-line addition |
| CI-7 | `npm audit` | 0 vulnerabilities, dev-only dependency; dependabot covers it |
| CI-8 | translation / dist / version consistency | already enforced (`run.sh`: complete entries, `build --check`); version string in `01-bootstrap` vs `45-editor-register` vs CHANGELOG is **not** cross-checked (possible 10-line test) |
YAML of the three files parses; their behaviour on GitHub is **unverified** until pushed.

## 6. Tests run
`./test/run.sh` green after all changes, 1 min 07 s. Mutation harness: a throw-away script (not committed); the 12 mutations are listed above and reproducible by hand.

## 7. Status
- **Corrected and tested:** U-1, 4 coverage gaps (unavailable display, list normalisation, config normalisation unit checks, hidden-tab camera).
- **Corrected, not testable here:** CI-1…CI-3.
- **Identified, not done:** CI-5, CI-6, CI-8, the gaps in §4.
- **Not verified for lack of environment:** the workflows on GitHub, other browsers.

## TODO phase 7 (accessibility and UX)
Review markup for roles/labels/focus, keyboard path incl. popups, contrast of the theme tokens (computed, WCAG 2.2 AA), touch target sizes, `prefers-reduced-motion`, RTL, error messages; measure what can be measured in headless Chrome (target sizes, contrast ratios, missing names).
