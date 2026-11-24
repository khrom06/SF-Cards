#!/bin/bash
# SF-Cards tests: syntax, reliability rules, rendering of every card (languages, scenarios without solar / without entity), translations.
# Requirements: node and google-chrome (or chromium). Usage: ./test/run.sh   — non-zero exit code if a test fails.
set -uo pipefail
cd "$(dirname "$0")/.."
CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
[ -n "$CHROME" ] || { echo "ERROR: google-chrome/chromium not found"; exit 2; }
[ -d node_modules/esbuild ] || npm install --no-audit --no-fund || exit 1   # scripts/build.mjs needs esbuild (minification)
node scripts/build.mjs --check || exit 1
node --check dist/sf-cards.js || { echo "FAIL: syntax of dist/sf-cards.js"; exit 1; }
node test/snapshots.mjs || exit 1
node test/lint.js || exit 1
node test/layout.mjs || exit 1   # cards that adapt to the room they get: columns, equal heights, no overflow, no render loop (real time)
# Headless-Chrome pages that write their verdict (JSON) into <pre id="result">: render test, then security test.
page() {   # page <file> <label>
  local OUT RES
  OUT="$(timeout 150 "$CHROME" --headless=new --no-sandbox --disable-gpu --allow-file-access-from-files --virtual-time-budget=120000 --dump-dom "file://$PWD/test/$1" 2>/dev/null)"
  RES="$(printf '%s' "$OUT" | grep -o '<pre id="result">[^<]*' | sed 's/<pre id="result">//' | sed 's/&quot;/"/g;s/&amp;/\&/g;s/&lt;/</g;s/&gt;/>/g')"
  [ -n "$RES" ] || { echo "FAIL: the $2 produced no verdict (loading error?)"; exit 1; }
  printf '%s' "$RES" | node -e '
    const r = JSON.parse(require("fs").readFileSync(0, "utf8"));
    if (r.ok) { console.log("OK: all " + process.argv[1] + " pass"); process.exit(0); }
    console.log("FAIL: " + r.failures.length + " problem(s) in the " + process.argv[1]); r.failures.forEach((f) => console.log(" - " + f)); process.exit(1);' "$2" || exit 1
}
node scripts/taint.mjs || exit 1   # every ${...} of every template: hostile values must never reach the HTML unescaped; unreached sites must be on the reviewed list
node test/tools.mjs || exit 1   # the benchmark and taint tools must fail visibly
page render.html "render tests"
page security.html "security tests (hostile states and config, confirmation)"
page lifecycle.html "lifecycle tests (timers and subscriptions after removal)"
page requests.html "request tests (no repeated Home Assistant requests)"
page robustness.html "robustness tests (missing, odd or failing Home Assistant data)"
page a11y.html "accessibility tests (names, keyboard, RTL)"
page editors.html "editor tests (hostile values everywhere)"
page i18n-lazy.html "language file tests (loaded on demand, missing file)"
