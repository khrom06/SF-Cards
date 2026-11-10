// One "<card>-editor" element per card, wired to the card's class.
for (const [tag, spec] of Object.entries(SF_SPECS)) {
  const edTag = `${tag}-editor`;
  if (!customElements.get(edTag)) customElements.define(edTag, class extends SfEditorBase { get spec() { return spec; } });
  const cls = customElements.get(tag);
  if (cls) {
    cls.getConfigElement = () => document.createElement(edTag);
    cls.getStubConfig = () => JSON.parse(JSON.stringify(spec.stub));
  }
}

console.info("%c SF-CARDS %c v1.19.0 ", "color:#03080f;background:#00e5ff;font-weight:700", "color:#00e5ff;background:#03080f");

