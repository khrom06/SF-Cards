# 07 — Accessibility and UX (phase 7)

Baseline `5212cf9` + earlier phases. Reference: WCAG 2.2 AA. Measured in headless Chrome (layout, computed colours, DOM) and by reading the code. **No screen reader, no real touch device** was used.

## Result in one line
Accessibility is already well above what custom cards usually reach (every interactive element has a name and is a keyboard button, reduced motion, RTL, focus return in popups). Two measurable gaps were found; the palette contrast one is fixed, the grey one needs a design decision.

## 1. What was measured
| Check | Method | Result |
|---|---|---|
| Accessible name on every interactive element | 28 cards × dark/light × en/ar, 314 elements in the probe, 200+ in the permanent test | **0 missing** |
| Keyboard: role + `tabindex=0`, Enter / Space, no repeat while held | permanent test on every clickable element; Enter / Space / held Enter on a service button | OK (one call per press, none on repeat) |
| Focus visibility | `:focus-visible` outline rule for `[role=button]`, `.tile` (`05-styles.js:31`), wallpanel, setpoints editable values | present |
| `prefers-reduced-motion` | base styles, launcher sheet, wallpanel | present (animations cut to 0.001 ms) |
| RTL | `dir="rtl"` set for Arabic on all 28 cards (test) | OK |
| Popup (launcher) | `role="dialog" aria-modal="true" aria-label`, Esc closes, focus returns to the opener (`22-launcher.js:186,223,233`) | OK by reading; focus *trap* inside the dialog not verified |
| Alert card | `role="alert" aria-live="assertive"` only for the full-frame alert | OK |
| Colour contrast of the palette tokens (text colours vs the 3 gradient stops, both themes) | computed (`test/lint.js` rule 7, new) | 14 of 16 tokens ≥ 4.5:1; 6 near-misses at 4.1–4.4 fixed (below); dark `grey` 2.9 documented |
| Contrast of rendered text (probe, not committed): 822 text nodes | computed colour × opacity over the mid background | few groups below threshold, all explained in §2 |
| Target size (WCAG 2.5.8 AA, 24 px) | bounding boxes in a 380 px column | 19 elements < 24 px in the dark pass; **only 2 are actions** (`setpoints .btn` 26×22, `console` stepper 20×23); the rest are text links that open "more info" (inline-text exception) |
| Touch | base CSS already sets `.btn { min-height:40px }` under `@media (pointer: coarse)` | OK on touch screens; 22 px only with a mouse |

## 2. Findings
| ID | Finding | Severity | Action |
|---|---|---|---|
| X-1 | Light palette: `amber` 4.11, `cyan` 4.28, `heat` 4.49, `dry` 4.44 (worst case on the darkest gradient stop); dark `red` 4.36. Small text (9–11 px) in these colours (room "Ceiling", upkeep "Descaling", etc.) was below AA. | P2 | **Fixed**: `#a85f00→#9e5900`, `#00798f→#00758b`, `#bf3f16→#b93d15`, `#8a6600→#866300`, dark `#ff3355→#ff3b60` (≈3 % luminance steps, visually indistinguishable). All 660 snapshots changed **CSS only, text unchanged in 0**; baseline regenerated knowingly. Guarded by lint rule 7. |
| X-2 | Dark `grey` `#5b6b7d` = 2.9–3.5:1 when used as *text* (e.g. "Idle", "off", counters, 5 occurrences in the fixtures, 3 `color:grey` sites in the code). Used for the "inactive / unavailable" look. | P3 | **Not changed**: WCAG exempts truly disabled components but not informational text such as "off". Raising it to `#7c90a7` (4.5:1) makes inactive items almost as bright as `dim` text and flattens the hierarchy of the design. A text-only token (`--sf-grey-text`) at 3 sites is the clean option. **Owner's design decision.** Lint rule 7 skips `grey` on purpose and says so. |
| X-3 | Two action targets under 24 px with a mouse (`setpoints .btn` 22 px high, console stepper 20 px wide). | P3 | not changed (touch screens already get 40 px; cosmetic for mouse). Fix = `min-height/width:24px` on two selectors; layout tests would show the effect. |
| X-4 | Radar labels are SVG text of about 3 px in user units (scaled): can look tiny on small cards. | P3, hypothesis | visual check on a real card needed. |
| X-5 | The ~330 "text-colour" probes flagged `on-accent` text (dark text on a cyan button) and user-chosen `color:` values as low contrast; they are false positives (background is the accent / the user's choice). | — | none |
| X-6 | Focus is returned to the opener when the popup closes, but nothing keeps Tab inside the open dialog. | P3, hypothesis | verify in a real browser; if confirmed, add `inert` on the page behind or a small trap. |
| X-7 | Error messages: card configuration problems show a plain-language "Card to complete" list (translated) and a console warning; the launcher's popup error is hard-coded French ("Erreur :", also noted in phase 2, S-5). | P3 | i18n fix is one line (do in phase 9). |

## 3. Tests run
`./test/run.sh` green (1 min 10 s) with the new `a11y.html` and lint rule 7. Mutation checks: palette amber reverted → lint fails (`4.11:1`); `aria-label` generation disabled → a11y test fails on media / upkeep / others. Snapshots regenerated after the palette change (660 CSS-only, 0 text).

## 4. Limits
- No screen-reader session (NVDA / VoiceOver / TalkBack): names and roles are verified structurally, not how they are announced.
- Contrast computed against the three gradient stops of the card; real HA backgrounds (user themes, images) can differ. `--sf-*` variables can be overridden by HA themes, which this test cannot cover.
- Target sizes in one 380 px layout; wall panel (touch kiosk) excluded: its controls are designed large.
- WCAG items needing a human (reading order, meaningful sequence, zoom to 400 %, consistent help) not assessed.

## 5. Status
- **Corrected and tested:** X-1 (palette contrast), plus permanent a11y and contrast tests.
- **Identified, not corrected:** X-2 (needs the owner), X-3, X-4, X-6, X-7.
- **Not verified for lack of environment:** screen readers, real touch devices, other browsers.

## TODO phase 8 (distribution and open source)
Check `hacs.json`, repo layout, releases / tags vs `dist`, CHANGELOG, README claims against reality (HA version, language count, card count), LICENSE and third-party notices, CONTRIBUTING accuracy (the "no minification" line), demo page, bundle size and single-file strategy.
