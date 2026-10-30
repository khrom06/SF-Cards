#!/bin/bash
# Tests de SF-Cards : syntaxe, rendu de toutes les cartes (4 langues, scénarios sans solaire / sans entité), traductions.
# Prérequis : node et google-chrome (ou chromium). Usage : ./test/run.sh   — code retour ≠ 0 si un test échoue.
set -uo pipefail
cd "$(dirname "$0")/.."
CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
[ -n "$CHROME" ] || { echo "ERREUR : google-chrome/chromium introuvable"; exit 2; }
node --check dist/sf-cards.js || { echo "ECHEC : syntaxe de dist/sf-cards.js"; exit 1; }
OUT="$(timeout 150 "$CHROME" --headless=new --no-sandbox --disable-gpu --allow-file-access-from-files --virtual-time-budget=20000 --dump-dom "file://$PWD/test/render.html" 2>/dev/null)"
RES="$(printf '%s' "$OUT" | grep -o '<pre id="result">[^<]*' | sed 's/<pre id="result">//' | sed 's/&quot;/"/g;s/&amp;/\&/g;s/&lt;/</g;s/&gt;/>/g')"
[ -n "$RES" ] || { echo "ECHEC : le test de rendu n'a pas rendu de verdict (erreur de chargement ?)"; exit 1; }
printf '%s' "$RES" | node -e '
  const r = JSON.parse(require("fs").readFileSync(0, "utf8"));
  if (r.ok) { console.log("OK : tous les tests de rendu passent"); process.exit(0); }
  console.log("ECHEC : " + r.failures.length + " problème(s)"); r.failures.forEach((f) => console.log(" - " + f)); process.exit(1);'
