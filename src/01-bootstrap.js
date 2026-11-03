(function () {
if (window.SF_CARDS_VERSION) {   // resource declared twice (HACS + manual file): the first loaded version stays active, and we say so clearly
  console.warn(`SF Cards ${window.SF_CARDS_VERSION} is already loaded: this copy (v1.14.0) is ignored. Remove the duplicate resource (Settings → Dashboards → Resources).`);
  return;
}
window.SF_CARDS_VERSION = "1.14.0";

