/* ================================================================ TOAST */
/*
 * A short message over the dashboard, for the one thing that must not stay silent: a press whose command did not reach Home Assistant
 * (refused, or no answer because the phone's connection fell asleep). One at a time, closes itself after 7 s, a tap or the close button
 * closes it at once. Text only (textContent): the detail comes from an error message and is never read as HTML.
 */
// ms without an answer before the connection is probed (not for direct script calls, which answer when the script ends); then up to
// SF_PING_TIMEOUT for the probe itself. Only when the probe fails too is the message shown: a merely slow service is not a failure.
let SF_CALL_TIMEOUT = 10000, SF_PING_TIMEOUT = 3000;
function sfToast(card, title, detail) {
  try {
    const old = document.getElementById("sf-toast"); if (old) old.remove();
    const host = document.createElement("div"); host.id = "sf-toast"; host.dir = card && card.lang === "ar" ? "rtl" : "ltr";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = "<style>:host{" + SF_VARS_DARK + "}.t{position:fixed;z-index:2147483000;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);max-width:min(92vw,420px);box-sizing:border-box;" +
      "padding:12px 44px 12px 16px;border-radius:12px;background:var(--sf-alert0);color:var(--sf-strong);border:1px solid var(--sf-red);box-shadow:0 8px 28px rgb(var(--sf-shade-rgb) / .55),0 0 18px rgb(var(--sf-red-rgb) / .35);" +
      "font:600 14px/1.35 system-ui,sans-serif;cursor:pointer}:host([dir=rtl]) .t{padding:12px 16px 12px 44px}.d{font-weight:400;font-size:12.5px;opacity:.85;margin-top:3px;word-break:break-word}" +
      ".x{position:absolute;top:6px;right:6px;width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer}:host([dir=rtl]) .x{right:auto;left:6px}.x::before{content:'\\2715'}</style>" +
      "<div class=\"t\" role=\"alert\"><div class=\"h\"></div><button type=\"button\" class=\"x\"></button></div>";
    const box = root.querySelector(".t"); root.querySelector(".h").textContent = String(title || "");
    root.querySelector(".x").setAttribute("aria-label", card && card.t ? card.t("launcher.close") : "Close");
    if (detail) { const d = document.createElement("div"); d.className = "d"; d.textContent = String(detail).slice(0, 160); box.insertBefore(d, root.querySelector(".x")); }
    const close = () => host.remove(); box.addEventListener("click", close); setTimeout(close, 7000);
    // popover: above Home Assistant's own modal dialogs (more-info, browser_mod popups), which no z-index can pass
    if (typeof host.showPopover === "function") host.setAttribute("popover", "manual");
    host.style.cssText = "position:fixed;inset:auto;margin:0;padding:0;border:0;background:transparent;overflow:visible;width:0;height:0";
    document.body.appendChild(host);
    if (host.hasAttribute("popover")) { try { host.showPopover(); } catch (e) { host.removeAttribute("popover"); } }
    return host;
  } catch (e) { return { remove() {} }; }
}
