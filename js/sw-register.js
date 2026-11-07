/* Registers the service worker (HTTPS or localhost only). Failing is harmless: the site still works. */
(function () {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
})();
