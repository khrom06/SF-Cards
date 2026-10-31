# Contributing

Thanks for your interest! Issues and pull requests are welcome.

- **Before anything else:** never put personal data (names, addresses, IPs, tokens, real entity ids you would not share) in code, tests, screenshots or issues. Use fake data (`sensor.solar`, "Living room", "Car A").
- **One file:** the whole library is `dist/sf-cards.js` (no build step, no dependencies).
- **Tests:** `./test/run.sh` (needs `node` and Chrome/Chromium). All tests must pass.
- **Languages:** every user-visible text goes through the translation table (11 languages). A missing translation falls back to English.
- **Screenshots:** 480×480 for the wall-panel card, fake data only; see the demo page (`docs/index.html`) for a ready-made mock Home Assistant.
- **Demo page:** after changing `dist/sf-cards.js`, run `cp dist/sf-cards.js docs/sf-cards.js`.
