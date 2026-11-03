// Guaranteed red on required fields: ha-form's native asterisk does not have the wanted colour (label text, inside nested shadow DOMs).
// We find the form's `required` elements (recursively) and give them a red bar + a red star.
const SF_RED = "#ff3b30";
function sfRedReq(form) {
  const css = `[sf-req]{position:relative;display:block;box-shadow:inset 3px 0 0 ${SF_RED};padding-left:6px}[sf-req]::after{content:"*";position:absolute;top:2px;right:8px;color:${SF_RED};font:700 20px/1 sans-serif;pointer-events:none}`;
  const scan = (root) => {
    if (!root) return;
    // NB: `:scope > style` NEVER matches anything in a ShadowRoot (Chrome/WebKit) -> one more <style> on every pass, the observer
    // re-triggered itself on its own mutation and froze the tab as soon as an entity was picked. So we test the children directly.
    if (![...root.children].some((c) => c.localName === "style" && c.hasAttribute("sf-red"))) { const st = document.createElement("style"); st.setAttribute("sf-red", ""); st.textContent = css; root.prepend(st); }
    for (const el of root.querySelectorAll("*")) {
      if (el.required === true || el.hasAttribute("required")) el.setAttribute("sf-req", "");
      else if (el.hasAttribute("sf-req")) el.removeAttribute("sf-req");
      if (el.shadowRoot && el.localName === "ha-form") scan(el.shadowRoot);
    }
  };
  const run = () => { try { scan(form.shadowRoot); } catch (e) { /* purement visuel */ } };
  const start = () => {
    run();
    if (form.shadowRoot && !form._sfObs) { form._sfObs = new MutationObserver(run); form._sfObs.observe(form.shadowRoot, { childList: true, subtree: true }); }
  };
  (form.updateComplete || Promise.resolve()).then(() => setTimeout(start, 50));
  form.addEventListener("value-changed", () => setTimeout(run, 100));
}
// Key fields of the list items marked `required` (ha-form's native asterisk).
const SF_REQ_FIELDS = { "sf-climate-card": { rooms: ["climate"] }, "sf-radiators-card": { radiators: ["climate"] }, "sf-camera-card": { cameras: ["entity"] }, "sf-hangar-card": { cars: ["soc"] },
  "sf-launcher-card": { tiles: ["name"] }, "sf-machines-card": { tiles: ["entity"] }, "sf-ledger-card": { devices: ["total"] }, "sf-reactor-card": { devices: ["entity"] }, "sf-setpoints-card": { rows: ["name"] },
  "sf-trend-card": { series: ["entity"] }, "sf-timeline-card": { entities: ["entity"] }, "sf-health-card": { checks: ["entity"] }, "sf-assistant-card": { actions: ["service"] }, "sf-ns-card": { rooms: ["entity"], fridge: ["entity"], cars: ["soc"], leaks: ["entity"], tiles: ["entity"], shortcuts: ["entity"] } };
const sfMarkReq = (fields, names) => (fields || []).map((f) => f.schema ? { ...f, schema: sfMarkReq(f.schema, names) } : names.includes(f.name) ? { ...f, required: true } : f);
for (const [tag, lists] of Object.entries(SF_REQ_FIELDS)) for (const [key, names] of Object.entries(lists)) {
  const l = (SF_SPECS[tag].lists || []).find((x) => x.key === key);
  if (l) { const orig = l.schema; l.schema = (x) => sfMarkReq(orig(x), names); }
}
for (const [alias, canon] of Object.entries(SF_ALIAS)) SF_SPECS[alias] = SF_SPECS[canon];   // the friendly tags share the spec of the original ones
for (const [tag, spec] of Object.entries(SF_SPECS)) if (tag !== "sf-launcher-card" && !SF_ALIAS_REV[tag]) SF_CARD_NAMES[tag] = spec.title;   // the editor offers the friendly names

