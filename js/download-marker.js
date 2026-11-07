/* Download Marker page
   - Uses the local copy first (assets/marker/hiro.png), falls back to the
     jsDelivr copy if the local file is missing.
   - Downloads via fetch + blob: browsers ignore the <a download> attribute for
     links to another website and would just open the image in a tab. */
(function () {
  const LOCAL = "../assets/marker/hiro.png";
  const CDN = "https://cdn.jsdelivr.net/gh/AR-js-org/AR.js/data/images/hiro.png";
  const img = document.getElementById("markerImg");
  const dl = document.getElementById("markerDownload");
  const pdf = document.getElementById("markerPdf");
  const printBtn = document.getElementById("printMarkerBtn");
  const errBox = document.getElementById("markerError");
  let source = LOCAL;

  function fail() {
    // Nothing to download or print: replace the buttons with the message + retry.
    errBox.hidden = false;
    [dl, pdf, printBtn].forEach((el) => { el.hidden = true; });
  }
  document.getElementById("markerRetry")?.addEventListener("click", () => window.location.reload());

  function onImageFailed() {
    if (source === LOCAL) { source = CDN; dl.href = CDN; img.src = CDN; }
    else fail();
  }
  img.addEventListener("error", onImageFailed);
  // A local 404 can come back BEFORE this script runs, so the "error" event
  // above would be missed — check whether the image has already failed.
  if (img.complete && img.naturalWidth === 0) onImageFailed();

  async function fetchMarker() {
    for (const src of [source, source === LOCAL ? CDN : LOCAL]) {
      try {
        const res = await fetch(src);
        if (res.ok) return await res.blob();
      } catch (e) { /* try the next source */ }
    }
    throw new Error("marker unavailable");
  }

  dl.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      const blob = await fetchMarker();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "anatomark-marker.png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      window.open(source, "_blank", "noopener"); // last resort: open it so it can be saved manually
    }
  });

  // If the bundled PDF is missing, hide that button rather than offer a dead download.
  fetch(pdf.href, { method: "HEAD" }).then((r) => { if (!r.ok) throw 0; }).catch(() => {
    pdf.hidden = true; dl.classList.replace("secondary", "primary");
  });

  printBtn.addEventListener("click", () => window.print());

})();
