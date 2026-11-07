/* =========================================================
   ANATOMARK — STRUCTURE PICKER
   Shared component. Call openStructurePicker() from any page
   that includes this script + structures-data.js + picker.css.
   Reused by the homepage's "Scan Marker" button; can be wired
   up from Library or anywhere else later without duplication.
   ========================================================= */

(function () {
  /* Site root, worked out from where THIS script was loaded from
     (…/js/picker.js → …/). That stays correct no matter how the site
     is hosted: a sub-folder, GitHub Pages /repo-name/, ngrok, etc.
     The old approach guessed from "/pages/" appearing in the URL. */
  const siteRoot = (function () {
    try {
      const src = document.currentScript && document.currentScript.src;
      if (src) return new URL("../", src).href;
    } catch (e) {}
    return window.location.pathname.includes("/pages/") ? "../" : "./";
  })();

  let scrimEl, sheetEl, closeBtn, built = false, lastFocus = null;

  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function build() {
    if (built) return;
    built = true;

    const structures =
      typeof anatomarkOrderedStructures === "function" ? anatomarkOrderedStructures() : [];

    scrimEl = document.createElement("div");
    scrimEl.className = "picker-scrim";

    sheetEl = document.createElement("div");
    sheetEl.className = "picker-sheet";
    sheetEl.setAttribute("role", "dialog");
    sheetEl.setAttribute("aria-modal", "true");
    sheetEl.setAttribute("aria-label", "Choose a structure to scan");

    const rows = structures.length
      ? structures
          .map(
            (s) => `
          <a class="picker-row" href="${siteRoot}pages/ar-view.html?id=${encodeURIComponent(s.id)}">
            <span class="picker-row-thumb"><img ${anatomarkImgAttrs(s, siteRoot)} alt="" loading="lazy" decoding="async" /></span>
            <span class="picker-row-body">
              <span class="tag">${esc(s.tag)}</span>
              <h4>${esc(s.name)}</h4>
            </span>
            <span class="picker-row-arrow" aria-hidden="true">›</span>
          </a>`
          )
          .join("")
      : `<p class="picker-note">No structures are available yet.</p>`;

    sheetEl.innerHTML = `
      <div class="picker-handle"></div>
      <div class="picker-header">
        <h3>Which structure would you like to scan?</h3>
        <button type="button" class="picker-close" aria-label="Close">✕</button>
      </div>
      <div class="picker-list">${rows}</div>
      <p class="picker-note">ⓘ Make sure your marker is printed and ready.</p>
    `;

    document.body.appendChild(scrimEl);
    document.body.appendChild(sheetEl);

    closeBtn = sheetEl.querySelector(".picker-close");
    scrimEl.addEventListener("click", closeStructurePicker);
    closeBtn.addEventListener("click", closeStructurePicker);

    document.addEventListener("keydown", (e) => {
      if (!sheetEl.classList.contains("open")) return;
      if (e.key === "Escape") { closeStructurePicker(); return; }
      // Keep Tab inside the dialog while it's open
      if (e.key === "Tab") {
        const focusables = sheetEl.querySelectorAll("a[href], button");
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    /* Coming back with the browser Back button can restore this page
       from the back/forward cache with the picker still open. */
    window.addEventListener("pageshow", (e) => { if (e.persisted) closeStructurePicker(); });
  }

  window.openStructurePicker = function () {
    build();
    lastFocus = document.activeElement;
    document.body.style.overflow = "hidden"; // stop the page scrolling behind it
    requestAnimationFrame(() => {
      scrimEl.classList.add("open");
      sheetEl.classList.add("open");
      closeBtn.focus({ preventScroll: true });
    });
  };

  window.closeStructurePicker = function closeStructurePicker() {
    if (!built) return;
    scrimEl.classList.remove("open");
    sheetEl.classList.remove("open");
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus({ preventScroll: true });
  };
})();
