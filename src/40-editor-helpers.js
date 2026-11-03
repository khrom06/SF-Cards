/* ============================================================ VISUAL EDITORS */
/*
 * Every SF card is edited in the interface ("Edit card") without writing YAML:
 * an HA form (ha-form: entity selectors, icons, switches…) for the simple
 * settings, and "+ Add / ↑ ↓ / Delete" lists for rooms, groups, items, tiles.
 * Rare or nested fields (service data, a panel's card…) remain editable
 * through a YAML field embedded in the form. A field unknown to the form is never lost:
 * the editor modifies the config in place and only removes the values emptied by the user.
 */
const SF_ED_CSS = `
  .req { margin:0 0 12px; padding:8px 12px; border-radius:8px; border:1px solid #ffb300; background:rgba(255,179,0,.12); color:#ffb300; font-size:12px; line-height:1.5; }
  .req[hidden] { display:none; }
  :host { display:block; }
  h3 { margin:18px 0 6px; font-size:14px; font-weight:600; color:var(--primary-text-color); }
  h3:first-child { margin-top:4px; }
  .hint { font-size:12px; color:var(--secondary-text-color); margin:0 0 8px; }
  details { border:1px solid var(--divider-color); border-radius:10px; margin:0 0 8px; background:var(--card-background-color); }
  details > summary { display:flex; align-items:center; gap:6px; padding:8px 10px; cursor:pointer; list-style:none; font-weight:500; }
  details > summary::-webkit-details-marker { display:none; }
  details > summary::before { content:"▸"; color:var(--secondary-text-color); }
  details[open] > summary::before { content:"▾"; }
  summary .t { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .body { padding:4px 10px 10px; }
  .sub { margin-left:4px; padding-left:8px; border-left:2px solid var(--divider-color); }
  button { font:inherit; cursor:pointer; border:1px solid var(--divider-color); background:transparent;
    color:var(--primary-text-color); border-radius:8px; padding:3px 9px; }
  button:hover { border-color:var(--primary-color); }
  button.del.armed { background:var(--error-color); color:#fff; border-color:var(--error-color); }
  button.add { width:100%; padding:8px; border-style:dashed; color:var(--primary-color); }
`;

// Loads HA's form components (loaded on demand by the frontend).
let _sfFormReady;
function sfLoadHaForm() {
  if (!_sfFormReady) _sfFormReady = (async () => {
    try {
      if (customElements.get("ha-form") && customElements.get("ha-entity-picker")) return;
      const h = await window.loadCardHelpers();
      const c = await h.createCardElement({ type: "entities", entities: [] });
      await c.constructor.getConfigElement();
    } catch (e) { /* the form will show as soon as HA has loaded its components */ }
  })();
  return _sfFormReady;
}

const sfE = (name, domain, extra) => ({ name, selector: { entity: { ...(domain ? { domain } : {}), ...(extra || {}) } } });
const sfEs = (name, domain) => sfE(name, domain, { multiple: true });
const sfT = (name) => ({ name, selector: { text: {} } });
const sfI = (name) => ({ name, selector: { icon: {} } });
const sfN = (name, min, max, step) => ({ name, selector: { number: { min, max, step: step ?? 1, mode: "box" } } });
const sfB = (name) => ({ name, selector: { boolean: {} } });
const sfS = (name, opts) => ({ name, selector: { select: { mode: "dropdown", options: opts.map(([value, label]) => ({ value, label })) } } });
const sfO = (name) => ({ name, selector: { object: {} } });
const sfG = (...schema) => ({ type: "grid", name: "", schema });

const SF_LABELS = {
  _device: "Remplir depuis un appareil (complète les champs vides)", theme: "Thème", name: "Nom", label: "Libellé", icon: "Icône", color: "Couleur (ex. #00e5ff)", title: "Titre", subtitle: "Sous-titre",
  entity: "Entité", sub: "Texte sous le titre", unit: "Unité", digits: "Décimales", warn: "Seuil d'alerte (orange)",
  crit: "Seuil critique (rouge)", max: "Valeur maximale", min: "Minimum", timer: "Minuteur (affiche le temps restant)",
  stop: "Entités coupées par un appui pendant le minuteur", hash: "Lien du panneau (#…)", columns: "Colonnes",
};

