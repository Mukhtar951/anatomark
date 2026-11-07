/* How To Use — step 3 opens the shared structure picker (js/picker.js). */
(function () {
  const btn = document.getElementById("openPickerBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (typeof openStructurePicker === "function") openStructurePicker();
    else window.location.href = "library.html"; // picker failed to load: fall back to the library
  });
})();
