// Règles de fiabilité sur dist/sf-cards.js (motifs qui ont déjà figé un navigateur ou fuité en production). Code retour ≠ 0 si une règle échoue.
const fs = require("fs");
const src = fs.readFileSync(__dirname + "/../dist/sf-cards.js", "utf8"), lines = src.split("\n"), bad = [];
const at = (i) => `dist/sf-cards.js:${i + 1}`;
// 1. `:scope` ne trouve rien dans un ShadowRoot (Chrome / WebKit) : un test d'existence qui l'utilise renvoie toujours « absent » (boucle infinie constatée le 2026-11-03).
lines.forEach((l, i) => { if (/(shadowRoot|\broot|\bsr)\.querySelector(All)?\(\s*["'`]:scope/.test(l)) bad.push(`${at(i)} : « :scope » sur un shadow root (ne correspond jamais)`); });
// 2. Chaque setInterval stocké dans this.X doit avoir son clearInterval(this.X).
for (const m of src.matchAll(/this\.(_\w+)\s*=\s*setInterval\(/g)) if (!new RegExp(`clearInterval\\(this\\.${m[1]}\\b`).test(src)) bad.push(`setInterval stocké dans this.${m[1]} sans clearInterval correspondant`);
for (const m of src.matchAll(/(^|[^.\w=])setInterval\(/gm)) { const i = src.slice(0, m.index).split("\n").length - 1; if (!/=\s*setInterval\(/.test(lines[i])) bad.push(`${at(i)} : setInterval dont l'identifiant n'est pas conservé (impossible à arrêter)`); }
// 3. Écouteurs globaux (window / document) : chacun doit être retiré quelque part avec le même nom d'événement.
for (const m of src.matchAll(/(window|document)\.addEventListener\(\s*"([\w-]+)"/g)) if (!new RegExp(`${m[1]}\\.removeEventListener\\(\\s*"${m[2]}"`).test(src)) bad.push(`${m[1]}.addEventListener("${m[2]}") jamais retiré`);
// 4. MutationObserver : un seul usage connu (sfRedReq). Tout nouvel observateur doit être relu (risque de boucle sur sa propre mutation) puis ajouté ici.
const mo = (src.match(/new MutationObserver\(/g) || []).length;
if (mo !== 1) bad.push(`${mo} MutationObserver (1 attendu : sfRedReq) — relire le nouveau, puis mettre à jour cette règle`);
// 5. Abonnements au bus de HA : tout subscribeMessage / subscribeEvents doit être appelé derrière un garde d'échec (pas de reconnexion à chaque mise à jour de hass).
lines.forEach((l, i) => { if (/subscribe(Message|Events)\(/.test(l) && !/_fcFail|await this\._hass/.test(lines.slice(Math.max(0, i - 12), i + 1).join("\n"))) bad.push(`${at(i)} : abonnement sans garde d'échec visible`); });
if (bad.length) { console.log("ECHEC lint : " + bad.length + " problème(s)"); bad.forEach((b) => console.log(" - " + b)); process.exit(1); }
console.log("OK : règles de fiabilité respectées");
