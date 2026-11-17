# 09 — Corrections (phase 9)

All changes are **local and uncommitted** (31 files tracked + 12 new; 862 insertions, 801 deletions of which 660+660 are the regenerated snapshot hashes). Each correction below has its proof; "red before / green after" means the new test page failed on the unfixed code and passes now. Full suite: `./test/run.sh`, 1 min 10 s, green.

## Corrections made
| ID (report) | Problem | Change | Files | Proof |
|---|---|---|---|---|
| R-1 (03) | orphan 20 s interval on a detached card | `timerInfo` starts its interval only if connected | `07-base` | `lifecycle.html` red → green |
| R-2 (03) | forecast subscription left open if the card leaves during setup (air, ns) | keep the subscription only if still connected and on the same entity, otherwise close it; ns also checks `isConnected` | `29c-air`, `25-wallpanel` | `lifecycle.html` red (5) → green |
| P-1 (04) | each `setConfig` (editor, dashboard) refetched all history; 151 requests per edit with 150 automations | `_cfgSame` in `SfBase.setConfig`; 8 data cards reset their cache only when the configuration changed; the per-automation scan is keyed and kept 15 min | `07-base`, `13 26 27 29b 29d 29e 29f 29i 29j` | bench 755 → 5 requests; `requests.html` red (8, 260 requests) → green; stale-data checks green |
| H-1/H-2/H-3 (05) | wrong-typed unit / options lists / console items threw and blanked the card | `unit()` always a string, `arr()` helper at 8 sites, console filters non-objects | `07-base`, `11 16 17 20 23 24` | `robustness.html` red (26) → green |
| U-1 (06) | raw `unavailable` shown as weather condition / climate mode | shows "no data" | `14-bridge`, `16-climate` | `robustness.html` (new check) red → green |
| (06) | hidden tab, list normalisation, config normalisation unguarded | tests only | `robustness.html` | mutations 6 and 11 now caught |
| X-1 (07) | palette contrast below AA for small text | 7 hex values (≈3 %) | `05-styles` | lint rule 7; mutation caught; snapshots CSS-only (660), text 0 |
| S-1 (02) | radiators `accent` written into `<style>` relying on one upstream filter | same colour filter applied at the sink | `24-radiators` | `robustness.html` red → green |
| S-4 (02) | camera cache-buster corrupts a `data:` URL | not appended to `data:` | `18-camera` | `robustness.html` red → green |
| S-5/X-7 | hard-coded French "Erreur :" in popups | `common.error_2` (11 languages) | `22-launcher` | build + render tests |
| D-1…D-6 (08) | doc drift, no contributor guide, no security policy, no version guard | CONTRIBUTING, README, SECURITY.md, lint rule 8 | docs, `test/lint.js` | rule 8 mutation caught |
| CI-1…3 (06) | floating action tags, no token permissions on e2e, no dependency updates | SHA pins, `permissions: contents: read`, `dependabot.yml` | `.github/` | YAML parses; **not run on GitHub yet** |
| (changelog) | — | `## [Unreleased]` section, user-facing wording | `CHANGELOG.md` | lint rule 8 still reads 1.21.0 as the shipped version |

## New test assets
`test/security.html`, `lifecycle.html`, `requests.html`, `robustness.html`, `a11y.html` (all wired into `run.sh`), `test/bench.html` + `scripts/bench.mjs` (manual), lint rules 7–8. Existing tests were not weakened: no rule disabled, no case removed; the only existing artefact modified is `test/snapshots.json` (660 hashes, palette change, reviewed: 0 text differences) and `run.sh` (the render-test block became a helper function used for six pages).

## Decided not to do (with reason)
| Item | Reason |
|---|---|
| A-1 shared forecast-subscription helper | the three copies now behave identically and are covered by `lifecycle.html`; a refactor adds risk on code that cannot be exercised against a live forecast here. Revisit when a fourth card needs it. |
| A-2…A-6, H1/H2 (perf), esbuild `charset` | measured or reasoned as not worth it (reports 03, 04, 08) |
| S-3 (arbitrary services from YAML) | design choice, keep; documented in SECURITY.md |
| X-2 dark grey text, X-3 24 px targets for mice, X-4, X-6 | design decision or hypothesis needing a real device |
| C-1 HA version matrix, min version in `hacs.json` | needs a runnable environment; shipping untested workflow code is worse than not shipping |

## Remaining risks after corrections

> **Update 2026-11-17:** risks 1 and 2 are closed (HA matrix of five versions, workflows run green on GitHub). Risks 3 and 4 remain.
1. Only Home Assistant 2026.11 is exercised (e2e on `stable`, the owner's instance).
2. The workflow edits have never run on GitHub.
3. No real tablet, screen reader or non-Chrome browser was used.
4. Bundle size (844 KB) and 30 cards are unchanged; nothing in the audit suggests a problem, nothing guarantees growth stays benign.
