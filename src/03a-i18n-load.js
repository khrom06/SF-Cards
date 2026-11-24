/* ================================================================ LANGUAGE FILES */
/*
 * French and English are inside sf-cards.js. Each other language is a small file next to it, sf-cards-i18n-<lang>.js (a release asset:
 * the Marketplace / HACS installs every asset of a release in the same folder), loaded the first time a card is drawn for someone who uses
 * that language. Until it arrives the card shows English, then it redraws itself. If the file cannot be loaded (a manual install that
 * copied only sf-cards.js), English stays and the console says which file is missing.
 * A language file is a plain script: (window.__sfI18n = window.__sfI18n || []).push(["de", { "<text id>": "<text>", … }]). Files that ran
 * before this bundle (the demo page, the tests) are waiting in that array; later ones call push() directly.
 */
const SF_LANG_STATE = Object.create(null);   // lang -> "ok" | "failed"
const SF_LANG_P = Object.create(null);       // lang -> Promise<boolean> of the load in progress or done
const SF_LANG_WAIT = Object.create(null);    // lang -> Set of the cards and editors drawn in English while their language loads
for (const l of SF_I18N_EMBEDDED) SF_LANG_STATE[l] = "ok";
// Where this file was loaded from, so the language files are looked for in the same folder. A module has no document.currentScript, so the
// URL is read from the stack of an error created while the bundle runs, then from the browser's list of loaded resources.
const SF_SELF_URL = (() => {
  try { if (document.currentScript && document.currentScript.src) return document.currentScript.src; } catch (e) { /* none */ }
  try { const m = String(new Error().stack || "").match(/(?:https?|file):\/\/[^\s()'"]+?\.js(?:\?[^\s()'":]*)?/); if (m) return m[0]; } catch (e) { /* no stack */ }
  try { const r = performance.getEntriesByType("resource").map((x) => x.name).filter((n) => /\/sf-cards\.js(?:[?#]|$)/.test(n)); if (r.length) return r[r.length - 1]; } catch (e) { /* none */ }
  return "";
})();
let sfI18nBaseOverride = "";   // tests only (see 99-footer.js): another folder to look for the language files in
function sfI18nMerge(lang, table) {
  const ix = SF_LANGS[lang];
  if (typeof lang !== "string" || ix === undefined || !table || typeof table !== "object") return;
  const own = Object.prototype.hasOwnProperty;
  for (const id in table) if (own.call(table, id) && own.call(SF_T, id) && typeof table[id] === "string" && table[id]) SF_T[id][ix] = table[id];
  SF_LANG_STATE[lang] = "ok";
}
function sfI18nRefresh(lang) {
  const set = SF_LANG_WAIT[lang]; delete SF_LANG_WAIT[lang];
  if (!set) return;
  for (const el of set) {
    if (!el || !el.isConnected) continue;
    try {
      if (typeof el._build === "function" && !el._schedule) el._build();   // an editor
      else { el._lastHtml = null; el._key = null; if (typeof el._schedule === "function") el._schedule(); }
    } catch (e) { /* a redraw must never throw out of the loader */ }
  }
}
(() => {
  const queued = Array.isArray(window.__sfI18n) ? window.__sfI18n : [];
  window.__sfI18n = { push: (e) => { if (Array.isArray(e)) { sfI18nMerge(e[0], e[1]); sfI18nRefresh(e[0]); } } };
  for (const e of queued) if (Array.isArray(e)) sfI18nMerge(e[0], e[1]);
})();
const sfI18nHas = (lang) => SF_LANG_STATE[lang] === "ok";
// Starts loading a language (once) and resolves to true when its texts are there, false when only English will be.
function sfI18nLoad(lang) {
  if (sfI18nHas(lang) || !Object.prototype.hasOwnProperty.call(SF_LANGS, lang)) return Promise.resolve(sfI18nHas(lang));
  if (SF_LANG_P[lang]) return SF_LANG_P[lang];
  const fail = (why) => {
    SF_LANG_STATE[lang] = "failed";
    console.warn(`SF Cards: the "${lang}" texts (sf-cards-i18n-${lang}.js) could not be loaded (${why}); English is used. Copy every sf-cards-i18n-*.js file of the release next to sf-cards.js.`);
    sfI18nRefresh(lang);
    return false;
  };
  SF_LANG_P[lang] = new Promise((resolve) => {
    let url = "";
    try { url = new URL("sf-cards-i18n-" + lang + ".js?v=" + encodeURIComponent(String(window.SF_CARDS_VERSION || "")), sfI18nBaseOverride || SF_SELF_URL || document.baseURI).href; } catch (e) { url = ""; }
    if (!url || typeof document === "undefined" || !document.head) { resolve(fail("no address")); return; }
    const s = document.createElement("script");
    s.src = url; s.async = true;
    s.onload = () => resolve(sfI18nHas(lang) ? true : fail("the file did not register its texts"));
    s.onerror = () => resolve(fail("not found"));
    document.head.appendChild(s);
  });
  return SF_LANG_P[lang];
}
// Called when a card or an editor draws a text: if its language is not there yet, remember to redraw it, and start the load.
function sfI18nNeed(lang, el) {
  if (sfI18nHas(lang) || SF_LANG_STATE[lang] === "failed" || !Object.prototype.hasOwnProperty.call(SF_LANGS, lang)) return;
  if (el) (SF_LANG_WAIT[lang] || (SF_LANG_WAIT[lang] = new Set())).add(el);
  sfI18nLoad(lang);
}
