// One "<card>-editor" element per card, wired to the card's class.
for (const [tag, spec] of Object.entries(SF_SPECS)) {
  const edTag = `${tag}-editor`;
  if (!customElements.get(edTag)) customElements.define(edTag, class extends SfEditorBase { get spec() { return spec; } });
  const cls = customElements.get(tag);
  if (cls) {
    cls.getConfigElement = () => document.createElement(edTag);
    // Called with hass by Home Assistant's card picker: the card arrives filled with the user's own entities (src/32-stubs.js).
    // Called without hass, it returns the plain stub synchronously, as before.
    cls.getStubConfig = (hass) => {
      const base = JSON.parse(JSON.stringify(spec.stub));
      if (!hass) return base;
      return sfStubFor(tag, hass).then((o) => (o && typeof o === "object" ? { ...base, ...o } : base), () => base);
    };
  }
}

console.info("%c SF-CARDS %c v1.27.0 ", "color:#03080f;background:#00e5ff;font-weight:700", "color:#00e5ff;background:#03080f");

