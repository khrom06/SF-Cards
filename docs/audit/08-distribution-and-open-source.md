# 08 — Distribution and open-source quality (phase 8)

Baseline `5212cf9` + earlier phases. Checked against the repository, the GitHub API (read-only) and the latest release.

## Result in one line
Distribution is correct and simple (one file, HACS-valid, release asset identical to `dist/`). The weak points were **documentation drift** (3 claims no longer true), **no security policy** and **no guard against version mismatch**; all three are addressed locally.

## 1. Verified
| Item | Result |
|---|---|
| `hacs.json` | `{name, render_readme, filename}` — valid for a plugin; HACS action green on `5212cf9` |
| Release `v1.21.0` | published (not draft, not pre-release), one asset `sf-cards.js`, **844 000 B = `dist/sf-cards.js`** |
| Repository | MIT licence (SPDX detected), 13 topics, description, Issues + Discussions + Pages enabled, issue / discussion templates present |
| Third-party code | none at runtime; two OFL fonts embedded, notices + licence texts in `THIRD_PARTY_NOTICES.md` and `fonts/` |
| Single-file strategy | 844 KB raw / 257 KB gzip, evaluated in 35 ms on a PC (104 ms at CPU ×4). See §3 |
| Demo | `docs/index.html` + `docs/sf-cards.js` (Pages), built by the same script, checked by `build --check` |
| Changelog | Keep-a-Changelog style, semantic versions, top entry = shipped version |
| Reproducible build | yes: `node scripts/build.mjs` is deterministic; CI fails if `dist/` or `docs/` are stale |

## 2. Findings and actions
| ID | Finding | Severity | Action (local, uncommitted) |
|---|---|---|---|
| D-1 | `CONTRIBUTING.md` said the build is "no minification" — false since the esbuild build | P2 (misleads contributors) | rewritten |
| D-2 | `README.md` "Limitations": "code comments in `dist/sf-cards.js` are still in French" (dist has no comments; some remain in `src/`) and "Home Assistant itself is not part of the tests" (the e2e workflow runs a real HA) | P3 | corrected |
| D-3 | README "Development" section listed one command and an outdated description of the tests | P3 | updated to the real suite + benchmark command |
| D-4 | No contributor guide for **adding a card** (7 places to touch: module, registry, header, required-config rule, editor spec, i18n, fixtures/tests/demo) | P2 | "Adding a card" checklist in `CONTRIBUTING.md`, derived from the wiring of `sf-report-card` |
| D-5 | No `SECURITY.md`; GitHub **private vulnerability reporting is disabled** (`enabled:false` via the API) | P2 | `SECURITY.md` written. **Owner action needed**: enable it in *Settings → Code security → Private vulnerability reporting*, otherwise the policy points to a button that does not exist |
| D-6 | Version string appears in `01-bootstrap` (3×), `45-editor-register`, CHANGELOG, tag, nothing checked they agree | P3 | `test/lint.js` rule 8: all versions in `src/` must equal the top changelog heading; mutation checked (`1.21.9` ⇒ fail) |
| D-7 | No `CODE_OF_CONDUCT.md` | P3 | not added: one maintainer, Discussions moderated by GitHub; add only if the community grows |
| D-8 | Release notes are written by hand by script (`release_vX.sh`, outside the repo); no automation | — | out of scope: it works, the owner runs it |
| D-9 | README: 1 100+ lines | P3 | not touched: it is the project's shop window and well structured; splitting it is a taste decision |

## 3. Is "one JavaScript file" still the right choice? — yes
- HACS and Home Assistant's resource model load one file; users can also drop it manually. One file = one cache entry, one version, atomic update, nothing that can be half-updated.
- Splitting (e.g. lazy-loading the 279 KB of translations or the wall panel) saves about 35 ms once per page on a PC and ≈100 ms on a slow tablet but adds several URLs that must be cache-busted together, an async load order that breaks `customElements` availability at dashboard start, and a more fragile HACS install. **Not recommended** (measured in phase 4).
- The only cheap size win is esbuild `charset: "utf8"` (−131 KB raw, −6 KB gzip, same behaviour). Gain too small to justify touching the shipped bytes; left as an option.

## 4. Tests run
`./test/run.sh` green (1 min 10 s) including lint rule 8. `dist/` and `docs/sf-cards.js` rebuilt, identical.

## 5. Status
- **Corrected and tested:** D-6 (version consistency).
- **Corrected, documentation only:** D-1, D-2, D-3, D-4, D-5 (file) .
- **Needs the owner:** D-5 (enable private vulnerability reporting).
- **Identified, not done:** D-7, D-9, charset option.

## TODO phase 9 (corrections)
Close the small remaining items found in phases 2–7: S-1 (radiators `--ac` second barrier), S-4 (camera cache-buster on `data:` URLs), S-5 / X-7 (launcher hard-coded French error), then consolidate `09-corrections.md` with before/after proof for every change, and decide A-1 (shared forecast helper) with evidence.
