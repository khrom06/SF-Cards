#!/bin/bash
# SF-Cards tests: syntax, reliability rules, rendering of every card (languages, scenarios without solar / without entity), translations.
# Requirements: node and google-chrome (or chromium). Usage: ./test/run.sh   — non-zero exit code if a test fails.
set -uo pipefail
cd "$(dirname "$0")/.."
CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
[ -n "$CHROME" ] || { echo "ERROR: google-chrome/chromium not found"; exit 2; }
node scripts/build.mjs --check || exit 1
node --check dist/sf-cards.js || { echo "FAIL: syntax of dist/sf-cards.js"; exit 1; }
node test/snapshots.mjs || exit 1
node test/lint.js || exit 1
node test/layout.mjs || exit 1   # cards that adapt to the room they get: columns, equal heights, no overflow, no render loop (real time)
OUT="$(timeout 150 "$CHROME" --headless=new --no-sandbox --disable-gpu --allow-file-access-from-files --virtual-time-budget=120000 --dump-dom "file://$PWD/test/render.html" 2>/dev/null)"
RES="$(printf '%s' "$OUT" | grep -o '<pre id="result">[^<]*' | sed 's/<pre id="result">//' | sed 's/&quot;/"/g;s/&amp;/\&/g;s/&lt;/</g;s/&gt;/>/g')"
[ -n "$RES" ] || { echo "FAIL: the render test produced no verdict (loading error?)"; exit 1; }
printf '%s' "$RES" | node -e '
  const r = JSON.parse(require("fs").readFileSync(0, "utf8"));
  if (r.ok) { console.log("OK: all render tests pass"); process.exit(0); }
  console.log("FAIL: " + r.failures.length + " problem(s)"); r.failures.forEach((f) => console.log(" - " + f)); process.exit(1);'
