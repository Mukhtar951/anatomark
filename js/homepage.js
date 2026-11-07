/* =========================================================
   ANATOMARK HOMEPAGE
   =========================================================
   NOTE: mobile menu toggling is handled by js/nav.js — it
   already targets the real ids in index.html (mobileMenuButton,
   mobileNav) and works correctly. This file previously also
   tried to wire up a mobile menu using ids that don't exist
   anywhere in index.html (menuToggle, navOverlay, navClose),
   which threw immediately on page load:
     Uncaught TypeError: Cannot read properties of null
     (reading 'addEventListener')
   That duplicate/broken block has been removed — nav.js is the
   single source of truth for menu behavior now.
   ========================================================= */

/* ---------------------------------------------------------
   Scan Marker button
   ---------------------------------------------------------
   Opens the shared structure picker (js/picker.js) so the user
   can choose which structure to scan before heading to AR View.
   --------------------------------------------------------- */
const scanMarkerButton = document.getElementById("scanMarkerButton");

scanMarkerButton?.addEventListener("click", () => {
  if (typeof openStructurePicker === "function") {
    openStructurePicker();
  } else {
    // picker.js failed to load — fall back to scrolling to the grid
    document.querySelector(".structures-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

/* Keep the "Browse all N structures" count in step with the data. */
(function () {
  const el = document.getElementById("homeCount");
  if (el && typeof anatomarkActiveStructures === "function") {
    const n = anatomarkActiveStructures().length;
    if (n) el.textContent = String(n);
  }
})();
