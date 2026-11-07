/* =========================================================
   ANATOMARK — LIVE 3D VIEWER (Structure Detail page)
   Uses the three.js that ships inside A-Frame (A-Frame is loaded
   only to provide THREE) and the same ViewState as the AR page
   (js/ar-gestures.js), so rotating feels identical in both places.

   AnatoViewer3D.start({ panel, structure, onFail, onReady }) → controller
   ========================================================= */
(function (root) {
  const BIG_MB = 40;           // above this, ask before downloading
  const AUTO_DEG_PER_SEC = 12;
  const DRACO_CDN = "https://www.gstatic.com/draco/versioned/decoders/1.5.6/";

  function start(cfg) {
    const panel = cfg.panel, structure = cfg.structure;
    const T = root.AFRAME && root.AFRAME.THREE;
    if (!T || !T.WebGLRenderer || !T.GLTFLoader) { if (cfg.onFail) cfg.onFail("three.js not available"); return null; }

    const ui = buildUi(panel);
    let renderer, scene, camera, pivot, view, raf = 0, dirty = true, disposed = false;
    let autoRotate = !(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let ready = false, lastT = 0;
    const url = "../" + structure.model;

    function fail(msg) {
      if (cfg.onFail) cfg.onFail(msg);
      ui.destroy && ui.destroy();
      return null;
    }

    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) { return fail("WebGL unavailable"); }
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    if (T.SRGBColorSpace) renderer.outputColorSpace = T.SRGBColorSpace;
    ui.stage.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    scene = new T.Scene();
    camera = new T.PerspectiveCamera(35, 1, 0.01, 100);
    camera.position.set(0, 0, 4);
    scene.add(new T.AmbientLight(0xffffff, 1.1));
    const key = new T.DirectionalLight(0xffffff, 2.2); key.position.set(1, 3, 2); scene.add(key);
    const fill = new T.DirectionalLight(0xbfe9e2, 0.8); fill.position.set(-2, -1, -1.5); scene.add(fill);
    pivot = new T.Group(); scene.add(pivot);

    function size() {
      const w = ui.stage.clientWidth || 300, h = ui.stage.clientHeight || 300;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      dirty = true;
    }
    size();
    if (root.ResizeObserver) new ResizeObserver(size).observe(ui.stage);
    else root.addEventListener("resize", size);

    /* ---- gestures: reuse the AR ViewState; the screen axes are the world axes here ---- */
    const G = root.AnatoGestures;
    view = G.ViewState({ spin: 0.5 });
    const pointers = new Map(); let pinchDist = 0;
    function apply() {
      const g = view.get();
      pivot.quaternion.set(g.q[0], g.q[1], g.q[2], g.q[3]);
      pivot.scale.setScalar(g.zoom);
      ui.reset.classList.toggle("is-active", !view.isDefault());
      dirty = true;
    }
    const stage = ui.stage;
    stage.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) pinchDist = pdist();
      autoRotate = false; ui.hideHint();
    });
    stage.addEventListener("pointermove", (e) => {
      const p = pointers.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pointers.size === 1) { view.drag(dx, dy); apply(); }
      else if (pointers.size === 2) { const d = pdist(); if (pinchDist > 0) { view.pinch(d / pinchDist); apply(); } pinchDist = d; }
    });
    const up = (e) => { pointers.delete(e.pointerId); pinchDist = 0; };
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((t) => stage.addEventListener(t, up));
    function pdist() { const a = Array.from(pointers.values()); return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
    stage.addEventListener("wheel", (e) => {
      e.preventDefault(); autoRotate = false;
      view.pinch(Math.exp(-e.deltaY * 0.0015)); apply();
    }, { passive: false });
    stage.addEventListener("dblclick", doReset);
    stage.addEventListener("keydown", (e) => {
      const k = e.key, s = 12 / 0.5; // 12 degrees
      if (k === "ArrowLeft") view.drag(-s, 0); else if (k === "ArrowRight") view.drag(s, 0);
      else if (k === "ArrowUp") view.drag(0, -s); else if (k === "ArrowDown") view.drag(0, s);
      else if (k === "+" || k === "=") view.pinch(1.15); else if (k === "-") view.pinch(1 / 1.15);
      else if (k === "0") return doReset();
      else return;
      e.preventDefault(); autoRotate = false; apply();
    });
    function doReset() { view.reset(); autoRotate = !!G && !(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); apply(); }
    ui.reset.addEventListener("click", doReset);

    /* ---- loading ---- */
    const loader = new T.GLTFLoader();
    if (T.DRACOLoader) {
      const d = new T.DRACOLoader();
      d.setDecoderPath(DRACO_CDN); // js/draco-path.js swaps in /libs/draco/ when it exists
      loader.setDRACOLoader(d);
    }

    function load() {
      ui.showProgress(0);
      const slow = setTimeout(() => ui.note("Still loading… large models can take a while on a slow connection."), 15000);
      loader.load(url, (gltf) => {
        clearTimeout(slow);
        if (disposed) return;
        const model = gltf.scene;
        tint(model);
        const box = new T.Box3().setFromObject(model);
        const c = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3());
        const r = Math.max(sz.length() / 2, 1e-6);
        model.position.sub(c);
        const holder = new T.Group(); holder.add(model);
        holder.scale.setScalar(1 / r);         // bounding sphere radius = 1
        pivot.add(holder);
        const fov = camera.fov * Math.PI / 180;
        camera.position.z = (1 / Math.sin(fov / 2)) * 1.05;
        camera.updateProjectionMatrix();
        ready = true; ui.done(); apply();
        if (cfg.onReady) cfg.onReady();
      }, (ev) => {
        if (ev && ev.lengthComputable) ui.showProgress(ev.loaded / ev.total);
      }, (err) => {
        clearTimeout(slow);
        console.error("[AnatoMark] 3D viewer could not load", url, err);
        fail((err && (err.message || err.type)) || "model failed to load");
      });
    }

    function tint(obj) {
      if (structure.solidify && root.BoneTexture) root.BoneTexture.solidify(obj, structure.solidify);
      if (structure.texture === "bone" && root.BoneTexture) { root.BoneTexture.apply(obj, T); return; }
      if (structure.tint === false) return;
      obj.traverse((o) => {
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

    function frame(t) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const dt = lastT ? Math.min((t - lastT) / 1000, 0.1) : 0; lastT = t;
      if (ready && autoRotate && !pointers.size) { view.drag(AUTO_DEG_PER_SEC / 0.5 * dt, 0); apply(); }
      if (dirty) { dirty = false; renderer.render(scene, camera); }
    }
    raf = requestAnimationFrame(frame);

    // Size check first: very large files wait for a tap so nobody burns mobile data by accident.
    let started = false;
    const go = () => { if (started) return; started = true; ui.clearGate(); load(); };
    ui.onLoadAnyway(go);
    try {
      fetch(url, { method: "HEAD" }).then((r) => {
        const mb = (parseInt(r.headers.get("content-length"), 10) || 0) / 1048576;
        // A host that rejects HEAD (405/403…) must not stop the load: the real GET decides.
        const mb2 = r.ok ? mb : 0;
        if (mb2 > BIG_MB) ui.gate(mb2); else go();
      }).catch(() => go());
    } catch (e) { go(); }

    return {
      reset: doReset,
      dispose() { disposed = true; cancelAnimationFrame(raf); renderer.dispose(); },
    };
  }

  function buildUi(panel) {
    const stage = document.createElement("div");
    stage.className = "viewer3d"; stage.tabIndex = 0;
    stage.setAttribute("role", "group");
    stage.setAttribute("aria-label", "Interactive 3D model. Drag to rotate, pinch or scroll to zoom, arrow keys also work.");
    const overlay = document.createElement("div");
    overlay.className = "viewer3d-status";
    overlay.innerHTML = '<div class="viewer3d-bar" hidden><i></i></div><p class="viewer3d-note"></p><button type="button" class="viewer3d-gate" hidden>Load anyway</button>';
    const hint = panel.querySelector(".viewer-hint");
    const reset = panel.querySelector("#viewerReset");
    panel.insertBefore(stage, panel.firstChild);
    panel.appendChild(overlay);
    panel.classList.add("is-3d", "is-loading");
    const bar = overlay.querySelector(".viewer3d-bar"), fillEl = bar.firstChild;
    const noteEl = overlay.querySelector(".viewer3d-note"), gateBtn = overlay.querySelector(".viewer3d-gate");
    return {
      stage, reset,
      showProgress(f) { bar.hidden = false; fillEl.style.width = Math.round(Math.max(0.03, f) * 100) + "%"; noteEl.textContent = "Loading 3D model…"; },
      note(t) { noteEl.textContent = t; },
      gate(mb) { noteEl.textContent = "This model is large (" + Math.round(mb) + " MB)."; gateBtn.hidden = false; },
      clearGate() { gateBtn.hidden = true; },
      onLoadAnyway(fn) { gateBtn.addEventListener("click", fn); },
      done() { panel.classList.remove("is-loading"); overlay.remove(); if (hint) hint.querySelector("span.t") && (hint.querySelector("span.t").textContent = "DRAG TO ROTATE · PINCH TO ZOOM"); },
      hideHint() { if (hint) hint.classList.add("is-hidden"); },
      destroy() { stage.remove(); overlay.remove(); panel.classList.remove("is-3d", "is-loading"); },
    };
  }

  root.AnatoViewer3D = { start };
})(window);
