# Audit progress

Baseline `5212cf9` (v1.21.0). Rule: no code change before the phase-1 report is approved.

| Phase | Status | Report |
|---|---|---|
| 1 Initial state | done 2026-11-16 | 01-initial-state.md |
| 2 Security | done 2026-11-16 | 02-security-audit.md |
| 3 Architecture / lifecycle | done 2026-11-16 | 03-architecture-audit.md |
| 4 Performance (benchmark first) | done 2026-11-16 | 04-performance-audit.md |
| 5 HA compatibility | done 2026-11-16 | 05-home-assistant-compatibility.md |
| 6 Tests and CI | done 2026-11-16 | 06-tests-and-ci.md |
| 7 Accessibility / UX | done 2026-11-16 | 07-accessibility-and-ux.md |
| 8 Distribution | done 2026-11-16 | 08-distribution-and-open-source.md |
| 9 Corrections | done 2026-11-16 | 09-corrections.md |
| 10 Final assessment | done 2026-11-16 | 10-final-assessment.md |

Files modified (all uncommitted, 30+ files): `docs/audit/*`; tests (new) `security` `lifecycle` `requests` `robustness` `bench` `.html`, `scripts/bench.mjs`, `test/run.sh`; `.github/workflows/*` (SHA pins, permissions), `.github/dependabot.yml` (new); src: `07-base`, `25-wallpanel`, `29c-air`, `29d` + 8 data cards, `11 14 16 17 20 23 24` ; rebuilt `dist/`, `docs/sf-cards.js`.
Tests run: `./test/run.sh` green (1 min 07 s); 12 mutation checks; each new test red on the unfixed code.
Phase 7 added: `test/a11y.html`, lint rule 7 (palette contrast), palette tweak in `src/05-styles.js` (light amber/cyan/heat/dry, dark red), `test/snapshots.json` regenerated (660 CSS-only, 0 text).
All 10 phases done on 2026-11-16. Weighted score 7.4 -> 8.4 (see 10-final-assessment.md).
State: everything is LOCAL and UNCOMMITTED in the working copy (31 modified, 12 new files). Suite green (`./test/run.sh`, ~1 min 10 s).
Next exact action (owner): review, then commit in logical groups (security tests / lifecycle+leaks / requests / robustness / palette+snapshots / docs+CI), push, and release v1.21.1 with the owner's go (version strings in src/01-bootstrap.js, src/45-editor-register.js and the CHANGELOG `[Unreleased]` heading must be bumped together; lint rule 8 checks it). Owner actions: enable GitHub private vulnerability reporting; decide X-2, S-3, C-1/C-2.
