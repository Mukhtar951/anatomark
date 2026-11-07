/* Credits page: built from the structure data, so adding or removing a model
   (one row in js/structures-data.js) updates this page with it. */
(function () {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lic = window.ANATOMARK_LICENSES || {};
  const link = (u, t) => (u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>` : esc(t));
  const list = anatomarkActiveStructures().filter((s) => s.credit);
  const used = {};

  document.getElementById("creditList").innerHTML = list.map((s) => {
    const c = s.credit, l = lic[c.license]; used[c.license] = true;
    return `<li><strong>${esc(s.name)}</strong>: ${link(c.url, c.title)} by ${link(c.authorUrl, c.author)}, ${l ? link(l.url, l.name) : esc(c.license)}${l && l.note ? ` <span class="credit-flag">${esc(l.note)}</span>` : ""}</li>`;
  }).join("") || "<li>No models listed yet.</li>";

  document.querySelector("#licenceTable tbody").innerHTML = Object.keys(used).map((k) => {
    const l = lic[k]; if (!l) return "";
    return `<tr><td>${link(l.url, l.name)}</td><td>${esc(l.changes)}</td></tr>`;
  }).join("");
})();
