/* ============================================================== VALIDATION */
/*
 * Non-blocking validation of a card configuration, derived from the editor specs (SF_SPECS), which already know every option's type, range
 * and allowed values. It never changes what a card does: it only reports (console warning when the card is configured, banner in the editor)
 * what is probably a mistake:
 *  - an option that is not known but looks like a typo of a known one (edit distance <= 2): "unknown option 'entites' — did you mean 'entities'?";
 *  - a known option with the wrong type, a number outside its range, an unlisted choice, or a malformed entity id.
 * Options the specs do not describe (YAML-only ones) are never flagged: no false alarm on a valid configuration.
 */
const SF_COMMON_KEYS = ["type", "theme", "grid_options", "layout_options", "view_layout", "visibility", "card_mod", "events", "name", "title", "id", "key"];
const SF_ENTITY_RE = /^[a-z0-9_]+\.[a-z0-9_]+$/i;
function sfFlatSchema(schema, out = {}) {
  for (const f of schema || []) { if (f && f.type === "grid") sfFlatSchema(f.schema, out); else if (f && typeof f.name === "string" && f.name && f.name[0] !== "_") out[f.name] = f; }
  return out;
}
function sfEditDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function sfNearKey(k, known) {
  if (k.length < 4) return "";
  let best = "", bd = k.length <= 5 ? 2 : 3;
  for (const c of known) { const dist = sfEditDistance(k.toLowerCase(), c.toLowerCase()); if (dist < bd) { bd = dist; best = c; } }
  return best;
}
function sfCheckValue(path, v, f, out) {
  if (v === undefined || v === null || v === "") return;
  const sel = f.selector || {}, bad = (msg) => out.push({ path, msg });
  if (sel.entity) {
    // Only the id format is checked: the domain filter of a selector is a hint for the picker, cards accept other domains (e.g. any numeric entity).
    for (const x of sel.entity.multiple ? (Array.isArray(v) ? v : [v]) : [v]) {
      if (typeof x !== "string" || !SF_ENTITY_RE.test(x)) bad(`'${String(x).slice(0, 40)}' is not an entity id (expected domain.object_id)`);
    }
  } else if (sel.number) {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    if (!isFinite(n)) bad(`expected a number, got ${typeof v}`);
    else if ((sel.number.min !== undefined && n < sel.number.min) || (sel.number.max !== undefined && n > sel.number.max)) bad(`${n} is outside ${sel.number.min ?? "−∞"}…${sel.number.max ?? "+∞"}`);
  } else if (sel.boolean) {
    if (typeof v !== "boolean" && v !== "true" && v !== "false") bad("expected true or false");
  } else if (sel.select) {
    const vals = (sel.select.options || []).map((o) => String(o.value));
    if (!vals.includes(String(v))) bad(`'${String(v).slice(0, 30)}' is not one of: ${vals.join(", ")}`);
  } else if (sel.text) {
    if (sel.text.multiple ? !(Array.isArray(v) ? v : [v]).every((x) => ["string", "number"].includes(typeof x)) : !["string", "number"].includes(typeof v)) bad("expected text");
  } else if (sel.icon) {
    if (typeof v !== "string") bad("expected an icon name such as mdi:thermostat");
  } else if (sel.object) {
    if (typeof v !== "object") bad("expected an object (YAML mapping)");
  }
}
function sfCheckObject(obj, schema, extraKeys, path, out) {
  const known = sfFlatSchema(schema), all = new Set([...Object.keys(known), ...extraKeys, ...SF_COMMON_KEYS]);
  for (const k of Object.keys(obj)) { if (all.has(k) || k[0] === "_") continue; const near = sfNearKey(k, [...all].filter((x) => !SF_COMMON_KEYS.includes(x) || x === "title")); if (near) out.push({ path: path + k, msg: `unknown option '${k}' — did you mean '${near}'?` }); }
  for (const [k, f] of Object.entries(known)) sfCheckValue(path + k, obj[k], f, out);
}
function sfCheckLists(spec, obj, path, out, depth = 0) {
  for (const l of spec.lists || []) {
    const arr = obj[l.key]; if (!Array.isArray(arr) || depth > 3) continue;
    arr.slice(0, 200).forEach((item, i) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return;   // strings etc. are tolerated by the card (normalised): never flagged
      let schema = []; try { schema = l.schema ? l.schema(item) : []; } catch (e) { return; }
      sfCheckObject(item, schema, (l.lists || []).map((x) => x.key).concat(["card", "entities", "users"]), `${path}${l.key}[${i}].`, out);
      sfCheckLists(l, item, `${path}${l.key}[${i}].`, out, depth + 1);
    });
  }
}
// Console warning, once per card type and distinct set of problems (a dashboard re-applies the same config many times).
const SF_WARNED = new Set();
function sfWarnConfig(tag, cfg) {
  try {
    const w = sfValidate(sfCanon(tag), cfg); if (!w.length) return;
    const key = tag + "|" + JSON.stringify(w); if (SF_WARNED.has(key)) return; SF_WARNED.add(key);
    console.warn(`SF Cards (${tag}): configuration warning(s) — the card still works as configured\n` + w.map((x) => ` - ${x.path}: ${x.msg}`).join("\n"));
  } catch (e) { /* never break a card for a warning */ }
}
function sfValidate(tag, cfg) {
  const spec = SF_SPECS[tag], out = [];
  if (!spec || !cfg || typeof cfg !== "object" || Array.isArray(cfg)) return out;
  try {
    let top = []; try { top = (spec.fields ? spec.fields(cfg) : []).slice(); } catch (e) { /* fields may depend on data */ }
    for (const o of spec.objects || []) { if (cfg[o.key] && typeof cfg[o.key] === "object") { try { sfCheckObject(cfg[o.key], o.schema(cfg[o.key]), [], o.key + ".", out); } catch (e) { /* skip */ } } }
    sfCheckObject(cfg, top, (spec.lists || []).map((l) => l.key).concat((spec.objects || []).map((o) => o.key), ["themes"]), "", out);
    sfCheckLists(spec, cfg, "", out);
  } catch (e) { /* validation must never break a card */ }
  return out.slice(0, 20);
}
