# Contributing

Thanks for your interest! Issues and pull requests are welcome.

- **Before anything else:** never put personal data (names, addresses, IPs, tokens, real entity ids you would not share) in code, tests, screenshots or issues. Use fake data (`sensor.solar`, "Living room", "Car A").
- **Sources and build:** the library is written as modules in `src/` (one file per card, plus core, i18n, editors; numbered so that file-name order is load order) and built by `node scripts/build.mjs` into the single file HACS ships, `dist/sf-cards.js` (a byte-for-byte concatenation, no minification, no dependencies). **Edit `src/`, never `dist/`**, then run the build and commit `src/`, `dist/` and `docs/sf-cards.js` together; `./test/run.sh` fails if `dist/` is out of date.
- **Tests:** `./test/run.sh` (needs `node` and Chrome/Chromium). All tests must pass.
- **Languages:** every user-visible text goes through the translation table (11 languages). A missing translation falls back to English.
- **Screenshots:** 480×480 for the wall-panel card, fake data only; see the demo page (`docs/index.html`) for a ready-made mock Home Assistant.
- **Demo page:** `node scripts/build.mjs` also refreshes `docs/sf-cards.js`.
