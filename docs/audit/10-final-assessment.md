# 10 — Final assessment (phase 10)

Baseline `5212cf9` (v1.21.0), working tree after the audit (uncommitted). Scores are the auditor's judgement on the evidence in reports 01–09; a 9 needs observable proof, a 9.5 is **not** awarded because several risks remain unverified.

## Scores
| Domain | Weight | Before | After | Evidence for the "after" |
|---|---|---|---|---|
| Security | 15 % | 8.0 | **9.2** | All ≈2 050 template interpolations instrumented (`scripts/taint.mjs`, now part of the test suite): ≈1 345 reached by hostile data with 0 raw value in any HTML interpolation, the other ≈680 (≈500 run only with benign data, 180 run by nothing) read by hand and recorded in `test/taint-reviewed.json`, which fails the check when a new unreviewed one appears (see 11); every visual editor tested with hostile values everywhere (`editors.html`); 30 cards × hostile states and configs, 0 injection (`security.html`); mutation checks red; colour / URL filters at the sinks; prototype pollution checked; confirmation verified; 0 runtime dependency, 0 `npm audit` finding. Not 9.5: S-3 is a design choice, CI hardening not yet run on GitHub. |
| Architecture | 15 % | 7.5 | **8.3** | One coherent base class, shared loader, 1 method > 80 lines of 255; two lifecycle leaks and one request pattern fixed with tests. Not higher: forecast subscription still written 3 times (A-1), the wall panel remains a parallel implementation. |
| Robustness | 15 % | 7.0 | **8.8** | 660 card × adverse-input runs green (missing, unavailable, odd types, failing / malformed WebSocket, bad config, language / theme change); leak tests; 26 + 5 defects found and fixed. Not higher: simulated HA only, real-world long sessions not measured. |
| Performance | 15 % | 7.5 | **8.5** | Benchmark exists and is reproducible; 5 ms per update for 30 cards (27 ms at CPU ×4), 0 requests during updates, +66 KB heap over 1 200 mounts; request storm fixed (755 → 5). Not higher: no real tablet, animations / paint not measured. |
| Tests and CI/CD | 15 % | 7.0 | **8.6** | 12 mutation checks: 11 meaningful ones now caught (was 8); 7 behavioural pages, 2 new lint rules, taint tool, real-HA e2e green on `stable` and, locally, on 4 older releases, with a positive control. Not higher: the CI matrix and the workflow edits have never run on GitHub, visual hashes not in CI. |
| Home Assistant compatibility | 10 % | 7.0 | **8.3** | The real end-to-end test passes on 2024.11, 2025.6, 2026.1, 2026.10 and 2026.11 (pip installs, positive control red); tested range stated in the README; private DOM use is guarded. Not higher: older than 2024.11, mobile apps and the official container images / CI matrix are unverified. |
| Accessibility and UX | 5 % | 8.0 | **8.5** | 0 interactive elements without a name, keyboard and RTL tested, reduced motion, contrast fixed (AA for 15 of 16 tokens). Not higher: dark grey text, no screen-reader test. |
| Maintainability and docs | 5 % | 7.0 | **8.5** | README / CONTRIBUTING corrected, "Adding a card" guide, version guard, audit reports, benchmark. |
| Distribution and open source | 5 % | 8.0 | **8.5** | Release asset identical to `dist/`, HACS valid, SECURITY.md written (reporting must be enabled by the owner), Dependabot. |
| **Weighted total** | | **7.4** | **8.6** | |

Classification of what the "after" rests on:
- **Corrected and tested (red before / green after):** R-1, R-2, P-1, H-1…H-3, U-1, S-1, S-4, X-1, D-6, and the four test gaps.
- **Corrected, documentation / config only (not testable here):** D-1…D-5, CI-1…CI-3, S-5 (text).
- **Identified, not corrected:** A-1, A-2…A-6, X-2…X-4, X-6, C-1…C-3, D-7, D-9, charset option.
- **Not verified for lack of environment:** other HA versions, real tablets, screen readers, Safari / Firefox, workflows on GitHub.
- **Out of scope:** Home Assistant core, third-party integrations.

## What would make it a 9
In order of gain per effort: (1) push and observe the hardened workflows and the new HA matrix on GitHub (the matrix itself passed locally); (3) one real-tablet and one screen-reader pass; (4) decide the dark-grey text token; (5) enable private vulnerability reporting. Nothing here needs new features.

## Improvement ideas (value / cost / risk / gain / priority)
| Area | Idea | Real value | Cost | Regression risk | Gain | Priority |
|---|---|---|---|---|---|---|
| Architecture | Shared forecast-subscription helper (A-1) | removes a bug class seen 2×; helps the next weather-like card | ½ day | medium (3 cards, live forecast not testable here) | small now | P3, when a 4th card needs it |
| Architecture | Move `sf-ns-card` data loading onto `SfLoader` (A-5) | one loader pattern everywhere | 2 h | low | small | P3 |
| Architecture | Do **not** add a central error layer, a DOM-helper layer or a config-schema layer | no demonstrated need across cards; each costs lines and indirection | — | — | — | rejected |
| Performance | Nothing in rendering; keep the benchmark in the release checklist | numbers are good; protects the future | 0 | none | guard | P3 |
| Security | Opt-in allow-list of services (S-3) | only if shared dashboards with untrusted editors become a use case | 1 day | medium (public YAML) | situational | P3, ask users first |
| Quality (dev) | `node scripts/bench.mjs` + the 6 test pages + "Adding a card" | faster, safer contributions | done | none | high | done |
| Quality (dev) | Release checklist script: lint rule 8 already checks versions; add "CHANGELOG has the date" | catches release slips | 1 h | none | small | P3 |
| UX | Consistent editors / small-screen behaviour | already covered by layout tests; no demonstrated problem | — | — | — | no action |
| UX | `--sf-grey-text` token (X-2) | AA for inactive text on dark | 1 h | low (3 sites + snapshots) | small | P2 after owner decision |
| Compatibility | HA matrix in CI (C-1): written in `ha-e2e.yml`, passes locally; observe it on GitHub; declare a minimum (C-2) only if wanted | catches frontend breakage before users | observation | none for users | **large** | **P1, written, to be observed** |

## Verdict
SF-Cards was already a careful project; the audit found no vulnerability, two small lifecycle leaks, one real request storm, a set of crash-on-odd-data paths, a few contrast misses and documentation drift, all now fixed with tests that fail without the fixes. The honest ceiling today is **8.6**: reaching 9 depends on verification the audit environment could not provide, not on more code.
