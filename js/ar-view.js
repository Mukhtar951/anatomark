document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const found = id ? anatomarkFindStructure(id) : null;

  const $ = (x) => document.getElementById(x);
  const structureTag = $("structureTag");
  const scanOverlay = $("scanOverlay");
  const hintBar = $("hintBar");
  const infoSheet = $("infoSheet");
  const sheetTitle = $("sheetTitle");
  const sheetTagEl = $("sheetTag");
  const sheetDesc = $("sheetDesc");
  const sheetClose = $("sheetClose");
  const backBtn = $("backBtn");
  const fatalError = $("fatalError");
  const fatalTitle = $("fatalTitle");
  const fatalMsg = $("fatalMsg");
  const fatalBackLink = $("fatalBackLink");
  const fatalRetry = $("fatalRetry");
  const marker = $("hiroMarker");
  const modelSlot = $("modelSlot");
  const sceneEl = $("arScene");
  const loadingPill = $("loadingPill");
  const loadingText = $("loadingText");
  const camBanner = $("camBanner");
  const arControls = $("arControls");
  const resetBtn = $("resetBtn");
  const captureBtn = $("captureBtn");
  const prevBtn = $("prevBtn");
  const nextBtn = $("nextBtn");
  const arToast = $("arToast");
  const arFlash = $("arFlash");

  // Facebook / Instagram / TikTok / Android WebView browsers commonly block the camera.
  const IN_APP = /FBAN|FBAV|Instagram|Snapchat|TikTok|MicroMessenger|Line\/|; wv\)/i.test(navigator.userAgent);
  const IN_APP_TIP = IN_APP
    ? "<br><br>This looks like a browser inside another app. Open this page in <strong>Chrome</strong> (Android) or <strong>Safari</strong> (iPhone) instead."
    : "";

  /* -----------------------------------------------------
     Navigation
     ----------------------------------------------------- */
  const cameFrom = params.get("from") === "library" ? "library" : "home";
  function detailHref() {
    return found
      ? `structure-detail.html?id=${encodeURIComponent(found.structure.id)}&from=${cameFrom}`
      : "../index.html";
  }
  // Go back to wherever the user really came from (Home picker, a structure page, the
  // library). With no history on this site (opened from a shared link), go to the structure page.
  function goBack() {
    releaseCamera();
    let sameSite = false;
    try { sameSite = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
    if (sameSite && history.length > 1) history.back();
    else window.location.href = detailHref();
  }

  function showFatal(title, msg, opts) {
    scanOverlay.classList.add("hidden");
    hintBar.style.display = "none";
    arControls.style.display = "none";
    loadingPill.classList.remove("show");
    camBanner.classList.remove("show");
    fatalTitle.textContent = title;
    fatalMsg.innerHTML = msg;
    fatalBackLink.href = detailHref();
    fatalRetry.hidden = !(opts && opts.retry);
    fatalError.classList.add("show");
  }
  fatalRetry.addEventListener("click", () => window.location.reload());

  function closeSheet() {
    infoSheet.classList.remove("open");
  }
  sheetClose.addEventListener("click", closeSheet);

  function showSheet(title, tag, desc) {
    sheetTitle.textContent = title;
    sheetTagEl.textContent = tag;
    sheetDesc.textContent = desc;
    infoSheet.classList.add("open");
  }

  /* -----------------------------------------------------
     Camera teardown. AR.js doesn't expose one clean "stop"
     call, so every video track is explicitly stopped before
     navigating away or when the tab is hidden/closed.
     ----------------------------------------------------- */
  function releaseCamera() {
    document.querySelectorAll("video").forEach((video) => {
      const stream = video.srcObject;
      if (stream && stream.getTracks) stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    });
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }
  backBtn.addEventListener("click", goBack);
  window.addEventListener("pagehide", releaseCamera);

  // Coming back with the browser Back/Forward buttons can restore this page from the
  // back/forward cache with a stopped camera. Reload so the camera starts cleanly.
  window.addEventListener("pageshow", (e) => { if (e.persisted) window.location.reload(); });

  /* -----------------------------------------------------
     Keep the screen awake while the AR view is open, and
     restart the camera feed if the phone was locked or the
     user switched apps and came back (Android freezes it).
     ----------------------------------------------------- */
  let wakeLock = null;
  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
      }
    } catch (e) { /* not supported or refused — harmless */ }
  }
  requestWakeLock();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    document.querySelectorAll("video").forEach((v) => { if (v.paused) v.play().catch(() => {}); });
    requestWakeLock();
  });

  /* -----------------------------------------------------
     Preflight: things that must be true before AR can work
     ----------------------------------------------------- */
  if (!found) {
    showFatal("Structure not found", "This link doesn't match a known structure.");
    fatalBackLink.textContent = "← Back to Home";
    return;
  }
  const { structure } = found;
  structureTag.textContent = structure.name;
  document.title = `AR — ${structure.name} — AnatoMark`;

  /* Next / Previous structure. The marker stays the same, so a student can move through the
     skeleton without going back to the library. A page reload is the simplest reliable way to
     swap the model (the camera permission is already granted, so it restarts quickly). */
  const ordered = typeof anatomarkOrderedStructures === "function" ? anatomarkOrderedStructures() : [];
  const at = ordered.findIndex((x) => x.id === structure.id);
  if (ordered.length > 1 && at >= 0) {
    const small = document.createElement("small");
    small.textContent = `${at + 1}/${ordered.length}`;
    structureTag.appendChild(small);
    const go = (step) => {
      const n = ordered[(at + step + ordered.length) % ordered.length];
      releaseCamera();
      window.location.replace(`ar-view.html?id=${encodeURIComponent(n.id)}&from=${cameFrom}`);
    };
    prevBtn.addEventListener("click", () => go(-1));
    nextBtn.addEventListener("click", () => go(1));
    prevBtn.setAttribute("aria-label", `Previous: ${ordered[(at - 1 + ordered.length) % ordered.length].name}`);
    nextBtn.setAttribute("aria-label", `Next: ${ordered[(at + 1) % ordered.length].name}`);
  } else {
    prevBtn.hidden = true;
    nextBtn.hidden = true;
  }
  fatalBackLink.textContent = `← Back to ${structure.name}`;

  if (window.__arLibFailed || typeof AFRAME === "undefined") {
    showFatal(
      "Couldn't load the AR engine",
      "The 3D/AR libraries didn't download. Check your internet connection, then try again." + IN_APP_TIP,
      { retry: true }
    );
    return;
  }
  if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showFatal(
      "Camera needs a secure connection",
      "Browsers only allow camera access on secure (<code>https://</code>) pages. Open the HTTPS address of this site and try again." + IN_APP_TIP
    );
    return;
  }

  /* -----------------------------------------------------
     Camera problems → a clear message and a Try again button.
     AR.js owns the camera request (a second getUserMedia call of our own
     would fight it and cause NotReadableError), so we only LISTEN here.
     ----------------------------------------------------- */
  let cameraErrorShown = false;
  function cameraFailed(name) {
    if (cameraErrorShown) return;
    cameraErrorShown = true;
    let title = "Camera couldn't start";
    let msg;
    switch (name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
      case "SecurityError":
        title = "Camera access is blocked";
        msg = "AnatoMark needs your camera to see the marker. Tap the lock or settings icon next to the web address, choose <strong>Permissions → Camera → Allow</strong>, then try again.";
        break;
      case "NotFoundError":
      case "DevicesNotFoundError":
        title = "No camera found";
        msg = "This device doesn't seem to have a camera that the browser can use.";
        break;
      case "NotReadableError":
      case "TrackStartError":
        title = "Camera is busy";
        msg = "Another app or browser tab is using the camera. Close video calls, camera apps and other tabs that used it, then try again.";
        break;
      case "OverconstrainedError":
        msg = "This camera doesn't support the settings AR needs. Try a different browser or device.";
        break;
      default:
        msg = "The camera didn't start" + (name ? ` (<code>${String(name).replace(/[<>&]/g, "")}</code>)` : "") + ". Close other apps that may be using it, then try again.";
    }
    showFatal(title, msg + IN_APP_TIP, { retry: true });
  }
  // AR.js reports webcam failures with a "camera-error" event
  const onCamErr = (e) => cameraFailed(e && e.detail && e.detail.error && e.detail.error.name);
  window.addEventListener("camera-error", onCamErr);
  sceneEl.addEventListener("camera-error", onCamErr);

  // If the user already blocked the camera for this site, say so straight away
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: "camera" }).then((st) => {
      if (st.state === "denied") cameraFailed("NotAllowedError");
      st.onchange = () => {
        if (st.state === "denied") cameraFailed("NotAllowedError");
        else if (st.state === "granted" && cameraErrorShown) window.location.reload();
      };
    }).catch(() => {});
  }

  /* Keep the 3D scene exactly the same shape as the camera picture.
     AR.js sizes <body> (which holds the scene) from the camera picture, but for a portrait phone it
     assumes the picture is 4:3. A camera that delivers a portrait picture would then get a 3D layer of
     the wrong shape and every model would look stretched. Copying the video's own size and offset
     (which AR.js works out correctly for any picture shape) removes that guess. AR.js re-applies its
     own size on every resize event, so ours runs just after it. */
  function syncSceneToVideo() {
    const v = document.querySelector("video");
    if (!v || !v.style.width || !v.style.height) return;
    const b = document.body.style;
    if (b.width !== v.style.width) b.width = v.style.width;
    if (b.height !== v.style.height) b.height = v.style.height;
    if (b.marginLeft !== v.style.marginLeft) b.marginLeft = v.style.marginLeft;
    if (b.marginTop !== v.style.marginTop) b.marginTop = v.style.marginTop;
  }
  window.addEventListener("resize", () => setTimeout(syncSceneToVideo, 0));

  // Safety net: if no live camera picture after 12 s and no error was reported, say what to check
  let cameraReady = false;
  const camTimer = setInterval(() => {
    const v = document.querySelector("video");
    if (v && v.readyState >= 2 && v.videoWidth > 0 && !v.paused) {
      cameraReady = true;
      camBanner.classList.remove("show");
      clearInterval(camTimer);
    }
  }, 1000);
  setTimeout(() => {
    if (!cameraReady && !cameraErrorShown) camBanner.classList.add("show");
  }, 12000);
  $("camBannerReload").addEventListener("click", () => window.location.reload());

  /* -----------------------------------------------------
     Model loading
     ----------------------------------------------------- */
  // Hint wording matches what tapping actually does for this structure
  const hintPill = hintBar.querySelector(".ar-hint-pill");
  if (hintPill) hintPill.textContent = "Drag to rotate · pinch to zoom · tap for details";

  let loadedCount = 0;
  let failedFiles = [];
  let totalEntities = 0;
  let finalized = false;
  const partEntities = []; // [{ entity, part }]
  let slowTimer = null;

  function setLoading(on, text) {
    loadingPill.classList.toggle("show", !!on);
    if (text) loadingText.textContent = text;
  }

  function onAnyLoaded() {
    loadedCount++;
    checkCompletion();
  }
  function onAnyError(fileLabel) {
    failedFiles.push(fileLabel);
    checkCompletion();
  }

  function checkCompletion() {
    const settled = loadedCount + failedFiles.length;
    if (settled < totalEntities || finalized) return; // still waiting on others
    finalized = true;
    clearTimeout(slowTimer);
    setLoading(false);

    if (loadedCount === 0) {
      // Nothing loaded at all — fatal.
      const fileList = failedFiles.map((f) => `<code>${f}</code>`).join(", ");
      showFatal(
        "3D model unavailable",
        `The model${failedFiles.length > 1 ? "s" : ""} for "${structure.name}" ${failedFiles.length > 1 ? "haven't" : "hasn't"} been added yet or couldn't be loaded (expected ${fileList}). Add the file to <code>/models</code> and reload, or check your connection.`,
        { retry: true }
      );
      return;
    }

    if (structure.parts) assembleParts();

    if (failedFiles.length > 0) {
      // Partial success (multi-part structures only) — show what loaded, note what's missing.
      hintBar.style.display = "flex";
      const note = document.createElement("div");
      note.className = "ar-hint-pill";
      note.style.position = "fixed";
      note.style.top = "70px";
      note.style.left = "50%";
      note.style.transform = "translateX(-50%)";
      note.style.zIndex = "25";
      note.textContent = `⚠ Missing: ${failedFiles.join(", ")} — showing available parts only`;
      document.body.appendChild(note);
    }
  }

  /* -----------------------------------------------------
     Auto-fit. Raw scans arrive in arbitrary units and often with
     their origin far from the geometry, so a fixed scale/position
     can leave a model off-screen or microscopic. After loading, each
     model is measured in its own file units, centred on the marker
     and scaled to a sensible size (the Hiro marker is 1 unit wide).
     The maths lives in js/fit-math.js (unit-tested).
     ----------------------------------------------------- */
  // Bounding box of a loaded model in its OWN file units (independent of where the marker is)
  function localBox(entity) {
    const T = AFRAME.THREE;
    const root = entity.getObject3D("mesh");
    if (!root) return null;
    const stop = entity.object3D;
    const box = new T.Box3();
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const rel = new T.Matrix4();
      for (let n = o; n && n !== stop; n = n.parent) { n.updateMatrix(); rel.premultiply(n.matrix); }
      box.union(o.geometry.boundingBox.clone().applyMatrix4(rel));
    });
    if (box.isEmpty()) return null;
    return { min: box.min.toArray(), max: box.max.toArray() };
  }

  // Put the model's `anchor` (a point in file units) at `position`, at uniform scale k
  function placeAt(entity, anchor, k, position) {
    const T = AFRAME.THREE;
    const shift = new T.Vector3(anchor[0], anchor[1], anchor[2]).multiplyScalar(k).applyQuaternion(entity.object3D.quaternion);
    entity.setAttribute("scale", `${k} ${k} ${k}`);
    entity.setAttribute("position", `${position[0] - shift.x} ${position[1] - shift.y} ${position[2] - shift.z}`);
  }

  /* Some scans have no colour or texture and render as flat white. Give those meshes a soft
     bone tone with a matte finish so the shape reads. Textured or coloured models are untouched.
     Set `tint: false` on a structure in structures-data.js to switch this off. */
  function tintUntextured(entity) {
    const root = entity.getObject3D("mesh");
    if (!root) return;
    if (structure.solidify && window.BoneTexture) window.BoneTexture.solidify(root, structure.solidify);
    if (structure.texture === "bone" && window.BoneTexture) { window.BoneTexture.apply(root, AFRAME.THREE); return; }
    if (structure.tint === false) return;
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (!m || m.map || m.vertexColors || !m.color) return;
        const c = m.color;
        if (c.r > 0.85 && c.g > 0.85 && c.b > 0.85) {
          c.set("#d8ccb2");
          if ("roughness" in m) m.roughness = 0.85;
          if ("metalness" in m) m.metalness = 0;
          m.needsUpdate = true;
        }
      });
    });
  }

  function reveal(entity) { entity.setAttribute("visible", "true"); }

  function fitSingle(entity, target, offset) {
    try {
      const plan = AnatoFit.single(localBox(entity), target);
      if (plan) {
        placeAt(entity, plan.anchor, plan.scale, offset);
        console.log("[AnatoMark] auto-fit", structure.id, { scale: plan.scale, anchor: plan.anchor });
      } else {
        console.warn("[AnatoMark] could not measure model; using the scale from structures-data.js");
      }
    } catch (err) {
      console.warn("[AnatoMark] auto-fit failed:", err);
    }
    reveal(entity);
  }

  // Multi-part structures (upper limb): fit all the bones together so their proportions stay true
  function assembleParts() {
    const mode = structure.assemble || "auto"; // "auto" | "shared" | "stacked" | "manual"
    try {
      if (mode !== "manual") {
        const plan = AnatoFit.assemble(
          partEntities.map(({ entity, part }) => ({ box: localBox(entity), dataPosition: part.position })),
          structure.fitSize || 0.9,
          mode
        );
        if (plan) {
          partEntities.forEach(({ entity }, i) => {
            const item = plan.items[i];
            if (!item) return;
            if (plan.mode === "shared") entity.setAttribute("rotation", "0 0 0"); // files already share one frame
            placeAt(entity, item.anchor, plan.scale, item.position || [0, 0, 0]);
          });
          console.log("[AnatoMark] assembled", structure.id, "mode:", plan.mode, "scale:", plan.scale);
        }
      }
    } catch (err) {
      console.warn("[AnatoMark] assembling parts failed:", err);
    }
    partEntities.forEach(({ entity }) => reveal(entity));
  }

  function addEntity({ file, scale, position, rotation, labelId, fit, part }) {
    totalEntities++;
    const entity = document.createElement("a-entity");
    entity.setAttribute("gltf-model", `url(${file})`);
    entity.setAttribute("scale", `${scale} ${scale} ${scale}`);
    entity.setAttribute("position", position.join(" "));
    entity.setAttribute("rotation", rotation.map((r) => (r * 180) / Math.PI).join(" "));
    entity.setAttribute("visible", "false"); // hidden until it has been sized and placed
    entity.classList.add("labelable");
    entity.dataset.labelId = labelId;
    entity.addEventListener("model-error", () => onAnyError(file));
    entity.addEventListener("model-loaded", () => {
      tintUntextured(entity);
      if (fit) fitSingle(entity, fit, position);
      else if (!part) reveal(entity);
      onAnyLoaded();
    });
    if (part) partEntities.push({ entity, part });
    modelSlot.appendChild(entity);
    return entity;
  }

  setLoading(true, "Loading 3D model…");
  slowTimer = setTimeout(() => {
    if (!finalized) setLoading(true, "Still loading… large models can take a while on a slow connection.");
  }, 20000);

  if (structure.parts) {
    structure.parts.forEach((part) => {
      addEntity({
        file: `../${part.file}`,
        scale: part.scale,
        position: part.position,
        rotation: part.rotation,
        labelId: part.id,
        part,
      });
    });
  } else if (structure.model) {
    addEntity({
      file: `../${structure.model}`,
      scale: structure.modelScale,
      position: structure.modelPosition,
      rotation: structure.modelRotation,
      labelId: structure.id,
      // Largest side in marker units (marker = 1). Optional per-structure `fitSize` overrides it.
      fit: structure.fitSize || 0.9,
    });
  } else {
    showFatal("No model configured", `No model path is set for "${structure.name}" in structures-data.js yet.`);
    return;
  }

  /* -----------------------------------------------------
     Tap-to-label. Parts resolve to their own label/desc;
     single-file structures (Skull, Vertebral Column) show
     whole-structure info since sub-meshes aren't segmented
     yet — see models/README.md.
     ----------------------------------------------------- */
  /* -----------------------------------------------------
     Gestures: drag = rotate, pinch = zoom, double-tap = reset.
     They act on the model slot (a wrapper), so the auto-fit inside it is untouched.
     ----------------------------------------------------- */
  const gestures = AnatoGestures.attach({
    target: modelSlot,
    ignore: (el) => !!(el && el.closest && el.closest("button, a, #infoSheet, .ar-topbar, #fatalError, .ar-cam-banner")),
    /* The screen's up / right directions, expressed in the marker's own space. Rotating about these
       makes a drag follow the finger however the marker or the phone is tilted. */
    getAxes: () => {
      try {
        const T = AFRAME.THREE;
        if (!T.Quaternion || !T.Vector3 || !sceneEl.camera) return null;
        const p = new T.Vector3(), sc = new T.Vector3();
        const mq = new T.Quaternion(), cq = new T.Quaternion();
        marker.object3D.updateWorldMatrix(true, false);
        marker.object3D.matrixWorld.decompose(p, mq, sc);
        sceneEl.camera.updateWorldMatrix(true, false);
        sceneEl.camera.matrixWorld.decompose(p, cq, sc);
        const inv = mq.clone().invert();
        const toMarker = (v) => v.applyQuaternion(cq).applyQuaternion(inv).toArray();
        return { up: toMarker(new T.Vector3(0, 1, 0)), right: toMarker(new T.Vector3(1, 0, 0)) };
      } catch (e) { return null; }
    },
    onChange: (g, isDefault) => { resetBtn.disabled = isDefault; },
    onDoubleTap: closeSheet,
  });
  resetBtn.addEventListener("click", () => { gestures.reset(); closeSheet(); });

  /* ---- Steady marker pose ----
     The AR library re-measures the marker every camera frame; the noise in those measurements makes
     the model shake and swell for a moment even when the phone is held still. js/pose-filter.js
     smooths it (and ignores one-frame glitches). We wrap the library's per-frame update on this
     marker only. window.__anatoNoSmooth = true turns it off (used by the tests). */
  (function installPoseFilter() {
    if (!window.PoseFilter || window.__anatoNoSmooth) return;
    const pf = window.PoseFilter.create();
    let tries = 0;
    const timer = setInterval(() => {
      const comp = marker.components && marker.components["arjs-anchor"];
      const controls = comp && comp._arAnchor && comp._arAnchor.controls;
      if (controls && typeof controls.updateWithModelViewMatrix === "function") {
        clearInterval(timer);
        const original = controls.updateWithModelViewMatrix;
        controls.updateWithModelViewMatrix = function (m) {
          try {
            const out = pf.filter(m.elements, performance.now());
            for (let i = 0; i < 16; i++) m.elements[i] = out[i];
          } catch (e) { /* never let the filter break tracking: use the raw pose */ }
          return original.call(this, m);
        };
      } else if (++tries > 150) clearInterval(timer);
    }, 200);
  })();

  /* ---- Contrast backdrop ----
     A soft dark halo drawn BEHIND the model so pale bones stand out against the white of the
     marker and the paper. It is a camera-facing sprite pushed back behind the model, so it
     works from every angle and never covers the model. Drawn by the 3D layer only, so it can
     not affect marker detection. The Contrast button turns it on or off (remembered). */
  const contrastBtn = $("contrastBtn");
  let contrastOn = true;
  try { contrastOn = localStorage.getItem("anatomarkContrast") !== "off"; } catch (e) {}
  function paintContrast() { contrastBtn.setAttribute("aria-pressed", contrastOn ? "true" : "false"); }
  paintContrast();
  contrastBtn.addEventListener("click", () => {
    contrastOn = !contrastOn; paintContrast();
    try { localStorage.setItem("anatomarkContrast", contrastOn ? "on" : "off"); } catch (e) {}
    toast(contrastOn ? "Contrast backdrop on" : "Contrast backdrop off");
  });

  let halo = null;
  function buildHalo() {
    const T = AFRAME.THREE;
    if (!T || !T.Sprite || !T.CanvasTexture || !T.SpriteMaterial) return;
    const cv = document.createElement("canvas"); cv.width = cv.height = 128;
    const g = cv.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(4,14,16,0.62)");
    grd.addColorStop(0.55, "rgba(4,14,16,0.42)");
    grd.addColorStop(1, "rgba(4,14,16,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    halo = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false }));
    halo.visible = false;
    halo.renderOrder = -1;
    sceneEl.object3D.add(halo);
  }
  const hv = {}; // reused vectors, so nothing is allocated every frame
  if (AFRAME.registerComponent) AFRAME.registerComponent("contrast-halo", {
    init() { buildHalo(); const T = AFRAME.THREE; hv.P = new T.Vector3(); hv.p = new T.Vector3(); hv.q = new T.Quaternion(); hv.s = new T.Vector3(); },
    tick() {
      if (!halo) return;
      const shown = contrastOn && marker.object3D.visible && modelSlot.object3D.children.some((c) => c.visible);
      halo.visible = shown;
      if (!shown) return;
      modelSlot.object3D.updateWorldMatrix(true, false);
      hv.P.setFromMatrixPosition(modelSlot.object3D.matrixWorld);
      marker.object3D.matrixWorld.decompose(hv.p, hv.q, hv.s);
      const s = hv.s.x || 1, dist = hv.P.length() || 1;
      // behind the model as seen from the camera, scaled up to cancel the extra distance
      halo.position.copy(hv.P).addScaledVector(hv.P, (0.55 * s) / dist);
      halo.scale.setScalar(2.1 * s * (halo.position.length() / dist));
    },
  });
  if (AFRAME.registerComponent) {
    const haloEl = document.createElement("a-entity");
    haloEl.setAttribute("contrast-halo", "");
    sceneEl.appendChild(haloEl);
  }

  /* -----------------------------------------------------
     Capture: camera picture + the 3D model, saved as a PNG.
     ----------------------------------------------------- */
  let toastTimer = null;
  function toast(msg) {
    arToast.textContent = msg;
    arToast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => arToast.classList.remove("show"), 2600);
  }

  function captureImage() {
    const video = document.querySelector("video");
    const glCanvas = sceneEl.canvas || document.querySelector("a-scene canvas");
    if (!video || !glCanvas || !(video.videoWidth > 0)) { toast("The camera isn't ready yet."); return; }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(window.innerWidth * dpr), H = Math.round(window.innerHeight * dpr);
    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const ctx = out.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    // draw the video exactly where the page shows it
    const r = video.getBoundingClientRect();
    ctx.drawImage(video, r.left * dpr, r.top * dpr, r.width * dpr, r.height * dpr);
    // render the 3D scene again right now so the canvas holds the current frame, then copy it
    try { sceneEl.renderer.render(sceneEl.object3D, sceneEl.camera); } catch (e) {}
    const gr = glCanvas.getBoundingClientRect();
    ctx.drawImage(glCanvas, gr.left * dpr, gr.top * dpr, gr.width * dpr, gr.height * dpr);
    // small credit line
    ctx.font = `${Math.round(13 * dpr)}px sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textAlign = "right";
    ctx.fillText(`AnatoMark · ${structure.name}`, W - 14 * dpr, H - 14 * dpr);
    out.toBlob((blob) => {
      if (!blob) { toast("Couldn't save the picture."); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `anatomark-${structure.id}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      arFlash.classList.remove("go"); void arFlash.offsetWidth; arFlash.classList.add("go");
      toast("Picture saved");
    }, "image/png");
  }
  captureBtn.addEventListener("click", () => {
    try { captureImage(); } catch (err) { console.warn("[AnatoMark] capture failed:", err); toast("Couldn't save the picture."); }
  });

  modelSlot.addEventListener("click", (evt) => {
    if (gestures.wasDrag()) return; // the end of a rotate / pinch is not a tap
    const hitEl = evt.target.closest(".labelable");
    if (!hitEl) return;
    const labelId = hitEl.dataset.labelId;

    if (structure.parts) {
      const part = structure.parts.find((p) => p.id === labelId);
      if (part) showSheet(part.label, structure.tag, part.desc);
    } else {
      showSheet(structure.name, structure.tag, structure.about);
    }
  });

  /* If the marker disappears only for a moment (tracking flicker) keep the student's view.
     After a real break (more than 3 s) start again from the default view. */
  let lostAt = 0;
  marker.addEventListener("markerFound", () => {
    scanOverlay.classList.add("hidden");
    hintBar.style.opacity = "1";
    if (lostAt && Date.now() - lostAt > 3000) gestures.reset();
    lostAt = 0;
  });
  marker.addEventListener("markerLost", () => {
    scanOverlay.classList.remove("hidden");
    hintBar.style.opacity = "0";
    lostAt = Date.now();
    closeSheet();
  });
});
