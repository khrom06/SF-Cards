# Contributing

Thanks for your interest! Issues and pull requests are welcome.

- **Before anything else:** never put personal data (names, addresses, IPs, tokens, real entity ids you would not share) in code, tests, screenshots or issues. Use fake data (`sensor.solar`, "Living room", "Car A").
- **Sources and build:** the library is written as modules in `src/` (one file per card, plus core, i18n, editors; numbered so that file-name order is load order) and built by `node scripts/build.mjs` into the single file HACS ships, `dist/sf-cards.js` (a byte-for-byte concatenation, no minification, no dependencies). **Edit `src/`, never `dist/`**, then run the build and commit `src/`, `dist/` and `docs/sf-cards.js` together; `./test/run.sh` fails if `dist/` is out of date.
- **Translations:** every UI text has a neutral id like `health.all_good`, listed with its translations in `src/03-i18n-data.js` (order: fr, en, es, de, nl, it, pt, pl, ru, zh, ar; English is the fallback). Call `this.t("health.all_good")`. The French text still works as a legacy key. Tests fail on an unknown id or an incomplete entry.
- **Tests:** `./test/run.sh` (needs `node` and Chrome/Chromium). All tests must pass. It also checks **render snapshots** (`test/snapshots.json`: a hash of the rendered HTML of every card in every language, dark and light, with a frozen clock): a change that must not alter what is displayed has to leave every hash identical; if a visual change is intended, review it, then run `node test/snapshots.mjs --update` and commit the new file.
- **Languages:** every user-visible text goes through the translation table (11 languages). A missing translation falls back to English.
- **Screenshots:** 480×480 for the wall-panel card, fake data only; see the demo page (`docs/index.html`) for a ready-made mock Home Assistant.
- **Demo page:** `node scripts/build.mjs` also refreshes `docs/sf-cards.js`.
