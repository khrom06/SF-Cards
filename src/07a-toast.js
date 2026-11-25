/* ================================================================ TOAST */
/*
 * A short message over the dashboard, for the one thing that must not stay silent: a press whose command did not reach Home Assistant
 * (refused, or no answer because the phone's connection fell asleep). One at a time, closes itself, a tap closes it at once. Text only
 * (textContent): the detail comes from an error message and is never read as HTML.
 */
let SF_CALL_TIMEOUT = 10000;   // ms without an answer before a press is reported (not for direct script calls, which answer when the script ends)
function sfToast(card, title, detail) {
  try {
    const old = document.getElementById("sf-toast"); if (old) old.remove();
    const host = document.createElement("div"); host.id = "sf-toast"; host.dir = card && card.lang === "ar" ? "rtl" : "ltr";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = "<style>:host{" + SF_VARS_DARK + "}.t{position:fixed;z-index:2147483000;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);max-width:min(92vw,420px);box-sizing:border-box;" +
      "padding:12px 16px;border-radius:12px;background:var(--sf-alert0);color:var(--sf-strong);border:1px solid var(--sf-red);box-shadow:0 8px 28px rgb(var(--sf-shade-rgb) / .55),0 0 18px rgb(var(--sf-red-rgb) / .35);" +
      "font:600 14px/1.35 system-ui,sans-serif;cursor:pointer}.d{font-weight:400;font-size:12.5px;opacity:.85;margin-top:3px;word-break:break-word}</style><div class=\"t\" role=\"alert\"><div class=\"h\"></div></div>";
    const box = root.querySelector(".t"); root.querySelector(".h").textContent = String(title || "");
    if (detail) { const d = document.createElement("div"); d.className = "d"; d.textContent = String(detail).slice(0, 160); box.appendChild(d); }
    const close = () => host.remove(); box.addEventListener("click", close); setTimeout(close, 7000);
    document.body.appendChild(host);
    return host;
  } catch (e) { return { remove() {} }; }
}
