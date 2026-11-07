document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const from = params.get("from") === "library" ? "library" : "home";
  const found = id ? anatomarkFindStructure(id) : null;

  const backLink = document.getElementById("detailBackLink");
  backLink.href = from === "library" ? "library.html" : "../index.html";

  if (!found) {
    document.title = "Structure not found — AnatoMark";
    document.querySelector(".detail-grid").innerHTML = `
      <div class="detail-missing">
        <p class="detail-missing-eyebrow">STRUCTURE NOT FOUND</p>
        <h1>We couldn&rsquo;t find that structure</h1>
        <p>The link may be wrong or out of date. Pick a structure from the library instead.</p>
        <a class="ar-launch-btn" href="library.html">Browse the library</a>
        <p class="ar-caption"><a href="../index.html">Go to the homepage</a></p>
      </div>`;
    return;
  }

  const { structure } = found;
  document.title = `${structure.name} — AnatoMark`;

  document.getElementById("detailName").textContent = structure.name;
  document.getElementById("detailTag").textContent = structure.tag;
  const detailImg = document.getElementById("detailImage");
  detailImg.addEventListener("error", () => { detailImg.style.visibility = "hidden"; });
  if (structure.legacyImage) detailImg.setAttribute("data-fallback", "../" + structure.legacyImage);
  detailImg.onerror = () => anatomarkImgError(detailImg);
  detailImg.src = anatomarkImage(structure, "../");
  detailImg.alt = structure.name;
  document.getElementById("detailAbout").textContent = structure.about;
  if (structure.regionLabel) document.getElementById("detailTag").title = structure.regionLabel;

  const specTable = document.getElementById("specTable");
  const ICONS = {
    classification: '<path d="M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2.59 12.58a2 2 0 010-2.83l7.17-7.17A2 2 0 0111.17 2H18a2 2 0 012 2v6.83a2 2 0 01-.41 1.58z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    count: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
    function: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6"/>',
    region: '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15 15 0 010 18a15 15 0 010-18z"/>',
  };
  const spec = structure.spec || {};
  const rows = [
    ["classification", "CLASSIFICATION", spec.classification || "—"],
    ["count", "COUNT", spec.count || "—"],
    ["function", "FUNCTION", spec.function || "—"],
    ["region", "REGION", spec.region || "—"],
  ];
  specTable.innerHTML = rows
    .map(
      ([icon, label, value]) => `
    <div class="spec-row">
      <span class="spec-key">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</svg>
        ${label}
      </span>
      <span class="spec-value">${value}</span>
    </div>`
    )
    .join("");

  document.getElementById("arLaunchBtn").href = `ar-view.html?id=${encodeURIComponent(structure.id)}`;

  /* ----- Live 3D viewer; the photo + tilt below is the fallback if 3D can't start ----- */
  const panel = document.querySelector(".viewer-panel");
  const hintText = panel.querySelector(".viewer-hint .t");
  function startTiltFallback(reason) {
    panel.classList.remove("is-3d", "is-loading");
    panel.classList.add("is-photo");
    if (hintText) hintText.textContent = "DRAG TO TILT";
    if (reason) { const n = document.getElementById("viewerNote"); if (n) { n.textContent = "Live 3D isn't available here, so a photo is shown instead." + (typeof reason === "string" ? " (" + reason + ")" : ""); n.hidden = false; } }
    initTilt();
  }
  function initTilt() {
  /* -----------------------------------------------------
     Tilt-to-interact viewer. No 3D model yet (see README —
     AR integration intentionally out of scope this pass), so
     this gives a real interactive feel on the reference photo:
     pointer/touch drag (or arrow keys) tilts it on X/Y.
     ----------------------------------------------------- */
  const wrap = document.getElementById("viewerImageWrap");
  const img = document.getElementById("detailImage");
  const resetBtn = document.getElementById("viewerReset");
  let rotX = 0, rotY = 8, dragging = false, lastX = 0, lastY = 0;

  function applyRotation() {
    img.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }
  applyRotation();

  const clamp = (v) => Math.max(-25, Math.min(25, v));
  function start(x, y) { dragging = true; lastX = x; lastY = y; img.style.transition = "none"; }
  function move(x, y) {
    if (!dragging) return;
    rotY += (x - lastX) * 0.35;
    rotX = clamp(rotX - (y - lastY) * 0.35);
    lastX = x; lastY = y;
    applyRotation();
  }
  function end() {
    if (!dragging) return;
    dragging = false;
    img.style.transition = "transform 500ms ease";
  }

  /* Pointer Events cover mouse, touch and pen in one path (no double-firing from
     emulated mouse events) and pointer capture keeps the drag alive if the finger
     leaves the box. "cancel" covers the system interrupting a touch. */
  wrap.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    wrap.setPointerCapture(e.pointerId);
    start(e.clientX, e.clientY);
  });
  wrap.addEventListener("pointermove", (e) => move(e.clientX, e.clientY));
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((t) => wrap.addEventListener(t, end));

  // Keyboard: arrow keys tilt the model
  wrap.tabIndex = 0;
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", `${structure.name} preview. Use the arrow keys to tilt.`);
  wrap.addEventListener("keydown", (e) => {
    const step = 8;
    if (e.key === "ArrowLeft") rotY -= step;
    else if (e.key === "ArrowRight") rotY += step;
    else if (e.key === "ArrowUp") rotX = clamp(rotX + step);
    else if (e.key === "ArrowDown") rotX = clamp(rotX - step);
    else return;
    e.preventDefault();
    img.style.transition = "transform 200ms ease";
    applyRotation();
  });

  resetBtn.addEventListener("click", () => {
    rotX = 0; rotY = 8;
    img.style.transition = "transform 500ms ease";
    applyRotation();
  });
  }

  // credit line
  const cr = structure.credit, lic = cr && (window.ANATOMARK_LICENSES || {})[cr.license];
  const credEl = document.getElementById("modelCredit");
  if (cr && credEl) {
    const a = (u, t) => u ? `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>` : t;
    credEl.innerHTML = `3D model: ${a(cr.url, cr.title)} by ${a(cr.authorUrl, cr.author)} on Sketchfab, ` +
      (lic ? a(lic.url, lic.name) : "") + (lic && lic.note ? ` &middot; ${lic.note}` : "");
    credEl.hidden = false;
  }

  if (structure.model && window.AnatoViewer3D && window.AFRAME && window.AnatoGestures) {
    document.querySelector(".viewer-image-wrap").hidden = true;
    const ctl = AnatoViewer3D.start({ panel, structure,
      onFail: (why) => { document.querySelector(".viewer-image-wrap").hidden = false; startTiltFallback(why || true); } });
    if (!ctl) { document.querySelector(".viewer-image-wrap").hidden = false; startTiltFallback(true); }
  } else {
    startTiltFallback(!!structure.model);
  }
});
