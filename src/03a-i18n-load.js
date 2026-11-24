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
// Every URL of a stack (Chrome "at https://…/x.js?q:1:2", Firefox / Safari "…@https://…/x.js:1:2") that ends in ".js" followed by a query,
// a ":line" or the end — a ".js" inside a folder or host name ("/my.jsdir/", "home.jsmith.net") does not end it; a file named sf-cards*.js wins.
function sfI18nUrlFromStack(stack) {
  const urls = String(stack || "").match(/(?:https?|file):\/\/[^\s()'"@]+?\.js(?=[?#:\s)]|$)(?:\?[^\s()'":#]*)?/g) || [];
  return urls.find((u) => /\/sf-cards[^/?#]*\.js(?:[?#]|$)/.test(u)) || urls[0] || "";
}
const SF_SELF_URL = (() => {
  try { if (document.currentScript && document.currentScript.src) return document.currentScript.src; } catch (e) { /* none */ }
  try { const own = sfI18nUrlFromStack(new Error().stack); if (own) return own; } catch (e) { /* no stack */ }
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
const SF_LANG_FAILED_AT = Object.create(null), SF_LANG_TRIES = Object.create(null), SF_LANG_WARNED = new Set();
// A failed language is tried again later (a tablet that booted without Wi-Fi), after 1 min, then 2, 4… up to 1 h; the console says it once.
const sfI18nRetryMs = (lang) => Math.min(3600000, 60000 * 2 ** Math.max(0, (SF_LANG_TRIES[lang] || 1) - 1));
function sfI18nLoad(lang) {
  if (sfI18nHas(lang) || !Object.prototype.hasOwnProperty.call(SF_LANGS, lang)) return Promise.resolve(sfI18nHas(lang));
  if (SF_LANG_STATE[lang] === "failed" && Date.now() - (SF_LANG_FAILED_AT[lang] || 0) > sfI18nRetryMs(lang)) { delete SF_LANG_STATE[lang]; delete SF_LANG_P[lang]; }
  if (SF_LANG_P[lang]) return SF_LANG_P[lang];
  SF_LANG_TRIES[lang] = (SF_LANG_TRIES[lang] || 0) + 1;
  const fail = (why) => {
    if (sfI18nHas(lang)) return true;
    SF_LANG_STATE[lang] = "failed"; SF_LANG_FAILED_AT[lang] = Date.now();
    if (SF_LANG_WARNED.has(lang)) { sfI18nRefresh(lang); return false; }
    SF_LANG_WARNED.add(lang);
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
    // a request that hangs (proxy, captive portal) must never keep a card or the automatic dashboard waiting: English after 10 s
    setTimeout(() => { if (!sfI18nHas(lang)) resolve(fail("no answer within 10 s")); }, 10000);
    document.head.appendChild(s);
  });
  return SF_LANG_P[lang];
}
// Called when a card or an editor draws a text: if its language is not there yet, remember to redraw it, and start the load.
function sfI18nNeed(lang, el) {
  if (sfI18nHas(lang) || !Object.prototype.hasOwnProperty.call(SF_LANGS, lang)) return;
  if (SF_LANG_STATE[lang] === "failed" && Date.now() - (SF_LANG_FAILED_AT[lang] || 0) <= sfI18nRetryMs(lang)) return;
  if (el) (SF_LANG_WAIT[lang] || (SF_LANG_WAIT[lang] = new Set())).add(el);
  sfI18nLoad(lang);
}
// Start loading as soon as the bundle runs, from the language Home Assistant gave the page (<html lang>, or the language it remembers),
// instead of waiting for the first card: the English flash before the user's language is then as short as possible.
try {
  const pre = String((document.documentElement && document.documentElement.lang) || (() => { try { return JSON.parse(localStorage.getItem("selectedLanguage") || "null"); } catch (e) { return ""; } })() || "").slice(0, 2).toLowerCase();
  if (pre && !sfI18nHas(pre) && Object.prototype.hasOwnProperty.call(SF_LANGS, pre)) sfI18nLoad(pre);
} catch (e) { /* the cards will ask themselves */ }
