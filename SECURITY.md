# Security policy

SF Cards is a front-end resource for Home Assistant: it has no server, no account and no network access of its own (all data comes from your Home Assistant, nothing is sent anywhere).

## Reporting a vulnerability
Please **do not open a public issue** for a security problem. Use GitHub's private reporting: **Security → Report a vulnerability** on this repository. Include the card, the configuration or entity state that triggers it, and what you observed. SF Cards is maintained by one person: expect an answer as soon as possible, not a guaranteed delay. A confirmed problem is fixed in a new release.

## What is protected
- Text from entities (names, states, units, attributes) is always escaped before display; configuration colours and URLs are filtered (`src/06-config-normalise.js`); the test suite (`test/security.html`) injects hostile values into all 30 cards on every run.
- Service calls come only from your own dashboard configuration; heavy actions can require a second press (`confirm`).

## Out of scope
Anyone who can edit your dashboard can already call any service and display anything; this is how Home Assistant dashboards work, not a vulnerability of SF Cards.
