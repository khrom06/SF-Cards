# 02 — Security audit (phase 2)

Baseline `5212cf9` (v1.21.0). Scope: all 30 cards, the editors, the strategy, the build and the CI. Code of the cards was not modified; one test was added (`test/security.html`, wired into `test/run.sh`).

## Result in one line
**No exploitable vulnerability found.** 0 critical, 0 high, 0 medium. Seven hardening items (P2/P3), none with a demonstrated exploit.
Threat model used: the dashboard author (YAML) is trusted; entity states, attributes and friendly names are **not** (cloud integrations, device names, MQTT, a camera sensor can all carry attacker-chosen text).

## What was examined and how
| Area | Method | Outcome |
|---|---|---|
| HTML text / attribute injection | grep of every `innerHTML` (13, all on `shadowRoot` or a button, content passed through `esc()`); 0 `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, `localStorage`; static scan of 101 `${…}` in attribute/CSS position, ~25 read by hand, the rest classified as numbers, constants or `esc()`-ed | clean |
| Hostile **states / attributes** (probe, now a test) | every string state, attribute, `friendly_name`, `icon` = HTML + handler payload, `entity_picture` = `javascript:`; 30 cards | 30/30 render, 0 injected node, 0 handler, 0 `javascript:` URL |
| Hostile **configuration** (probe, now a test) | `color`/`accent`, text keys, URL keys replaced by payloads; 3 modes × 30 cards, plus `accent` on radiators | 0 injection, no `<style>` break-out |
| CSS context | `esc()` is HTML-safe, not CSS-safe. Real protection = `sfCleanCss()` (`06-config-normalise.js`): `color` / `accent` pass only hex, colour name, `rgb/hsl()`, `var(--x)`; `span` 1–4. Recursive, drops `__proto__`, uses `Object.create(null)` | effective (mutation M2 below) |
| URLs | `sfSafeUrl()`: only `/…`, `http(s)://`, `data:image/(png/jpeg/gif/webp);base64`. Used for alert snapshot, media artwork, camera | effective; `javascript:` never reaches `src` |
| Service calls | 4 direct `callService` (wallpanel ×2, base, setpoints) + `data-call`. Service string must match `^[a-z0-9_]+\.[a-z0-9_]+$` or no button is rendered | OK; any service is callable from YAML **by design** |
| WebSocket | all 13 `callWS` have a fixed `type` (history, statistics, logbook, trace, search, energy prefs) — read-only, no type or payload comes from the configuration | OK |
| `data-confirm` | probe: 1st press arms (no call) · a re-render keeps it armed · a held key does not confirm · 2nd press fires **once** · 3rd re-arms · 3 fast presses = 1 call | robust against accidents |
| Prototype pollution | config with `__proto__` and `constructor.prototype` | `Object.prototype` untouched |
| ReDoS | grep for nested quantifiers; the only user-supplied regex (health/upkeep rules) is length-capped and rejected if it nests quantifiers (`06-config-normalise.js:34`) | OK |
| Global listeners | only `sf-launcher-card` (`popstate`, `hashchange`, `keydown`), each removed in `disconnectedCallback` / close | OK |
| Network / privacy | no `fetch`, no `WebSocket`, no external script/CSS/font; the only URL in the source is the GitHub link; fonts embedded (OFL notices present) | OK |
| Persistence | no `localStorage` / `sessionStorage` / cookie | OK |
| Supply chain | runtime dependencies: 0. Dev: esbuild only, lockfile committed, `npm audit` 0 vulnerabilities | OK |

## Vulnerability / hardening table
| ID | File:line | Sev. | Exploitability | Impact | Correction | Validation test |
|---|---|---|---|---|---|---|
| S-1 | `24-radiators.js:21` (`--ac:${ac}` inside `<style>`) | P3 | none today: `sfCleanCss` strips any non-colour `accent` | would be HTML/CSS break-out if the filter were bypassed | defence in depth: pass `ac` through the same `SF_COLOR_OK` check at the sink, or `esc` it | `security.html` "accent broke out" (already present; fails when filter removed, mutation M2) |
| S-2 | `06-config-normalise.js:60` (`https?://` allowed) | P3 | only with a compromised integration setting `entity_picture` to an external host | tracking pixel / IP + time leak, no code execution | none required (needed for real camera URLs); document it | n/a |
| S-3 | `07-base.js:96-99`, `19-setpoints.js:109` | P2 (decision) | not demonstrated: requires write access to the dashboard, who can anyway use HA's own tap-actions | any service callable from YAML, confirmation optional | **decision, not patch**: keep (documented) or add an opt-in allow-list; I recommend keep | `security.html` confirmation block |
| S-4 | `18-camera.js:24` | P3, **hypothesis** | none | `?_t=` appended to a `data:image…;base64,` URL would corrupt it (cosmetic: broken image) | skip the cache-buster for `data:` URLs | probe with a `data:` entity_picture (to do in phase 9) |
| S-5 | `22-launcher.js:198,210` | P3 | none (`textContent`) | hard-coded French "Erreur :" breaks the 11-language rule | use `this.t(…)` | translations test |
| S-6 | `.github/workflows/validate.yml:14` | P2 | requires compromise of the `hacs/action` repo | CI code execution with repo read access (`permissions: {}` limits the token) | pin to a commit SHA (HACS' own docs recommend `@main`; trade-off with freshness) | CI run |
| S-7 | `.github/workflows/ha-e2e.yml` | P2 | PR from a fork | no `permissions:` block ⇒ default token scope | add `permissions: contents: read`; actions pinned by SHA | CI run |

## Mutation checks (the new test really fails)
Each protection was disabled in `src/`, rebuilt, the security page run, then restored (`git checkout`; dist rebuilt, tree clean).
| Mutation | Result |
|---|---|
| M1 `esc()` made a no-op | FAIL — "active content injected" on many cards |
| M2 colour filter (`SF_COLOR_OK`) bypassed | FAIL — radiators `accent` break-out, a payload executed |
| M3 `data-confirm` ignored | FAIL — 5 confirmation assertions |

## Tests run
- `./test/run.sh` complete, **green**, 1 min 04 s: build check, 660 snapshots, lint, layout, render tests, **security tests (new)**.
- Added: `test/security.html` (≈70 lines of assertions), call in `test/run.sh` (the render-test block became a small `page()` function, same behaviour). No snapshot, lint rule or existing test was touched.

## Limits of this audit (honest)
- Payloads are synthetic; this is evidence of no obvious injection, not a proof. The static scan flags attribute/CSS positions only; ~75 of the 101 hits were classified by pattern (numeric, constant, already `esc()`-ed), not each one read.
- Config fuzzing mutates the keys named `color/accent/name/title/label/…`; a text or colour option under another key name in a card's config was not necessarily reached. A grep for non-colour config values in `style=` found none.
- Not tested: Home Assistant itself (its own XSS surface), the editors with hostile entity lists, browsers other than Chrome.
- The threat model assumes a trusted dashboard author. If shared dashboards with untrusted editors matter, S-3 should be revisited.

## Status
- Corrected and tested: none of the cards (nothing needed); regression net added.
- Identified, not corrected: S-1…S-7 (all P2/P3).
- Not verified for lack of environment: other browsers, other HA versions.

## TODO phase 3 (architecture and lifecycle)
1. Fix R-1 (orphan interval) with a failing lifecycle test first.
2. Compare the two confirmation implementations (`07-base._arm` vs `25-wallpanel._bind`) and `_a11y` vs `_a11yNs`: duplication to reduce, or leave.
3. Inventory long functions, silent `catch (e) {}` blocks, divergences between cards.
