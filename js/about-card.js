/* Draws the About page project card from ANATOMARK_PROJECT (js/site-config.js). */
(function () {
  const box = document.getElementById("aboutRows");
  if (!box) return;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rows = (window.ANATOMARK_PROJECT || []).filter((r) => r && r.label && String(r.value || "").trim());
  box.innerHTML = rows.map((r) => `<div class="about-row"><span class="k">${esc(r.label)}</span><span class="v">${esc(r.value)}</span></div>`).join("");
  if (!rows.length) box.closest(".about-side").hidden = true;
})();
