/* =========================================================
   ANATOMARK — AR TOUCH GESTURES
   One finger drag  → rotate (sideways = spin, up/down = tilt)
   Two finger pinch → zoom
   Double tap       → reset the view
   The view is applied to a WRAPPER entity (the model slot), so the
   auto-fit placement of the model inside it is never touched.

   The maths (ViewState) has no DOM in it so it can be unit-tested
   in Node; attach() is the thin touch/pointer glue around it.
   ========================================================= */
(function (root) {
  const DEG = Math.PI / 180;
  const LIMITS = { zoomMin: 0.4, zoomMax: 3 };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* ---- tiny quaternion helpers: q = [x, y, z, w] ---- */
  const qMul = (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
  const qNorm = (q) => { const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / n, q[1] / n, q[2] / n, q[3] / n]; };
  const qAxisAngle = (axis, rad) => {
    const n = Math.hypot(axis[0], axis[1], axis[2]) || 1, h = rad / 2, s = Math.sin(h) / n;
    return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(h)];
  };
  const qRotate = (q, v) => { // rotate vector v by q
    const p = qMul(qMul(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]]);
    return [p[0], p[1], p[2]];
  };

  /* ViewState keeps ONE orientation (a quaternion) and a zoom.
     A drag turns the model about the SCREEN's vertical and horizontal axes, like holding the bone
     in your hand: drag right = its front turns to the right, drag down = its top comes toward you.
     It never locks, so every side (including the underside) can be reached.
     `axes` are the screen's up / right directions expressed in the model's parent space; the AR
     page supplies them from the camera and the marker so the rotation follows the screen however
     the marker or phone is tilted. Without axes the screen axes are assumed. */
  function ViewState(opts) {
    const o = Object.assign({ spin: 0.5 }, LIMITS, opts || {}); // degrees per pixel
    let q = [0, 0, 0, 1];
    let zoom = 1;
    return {
      get: () => ({ q: q.slice(), zoom }),
      isDefault: () => Math.abs(q[3]) > 0.99999 && zoom === 1,
      drag(dx, dy, axes) {
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
        const up = (axes && axes.up) || [0, 1, 0];
        const right = (axes && axes.right) || [1, 0, 0];
        const dq = qMul(qAxisAngle(up, dx * o.spin * DEG), qAxisAngle(right, dy * o.spin * DEG));
        q = qNorm(qMul(dq, q));
      },
      // ratio = currentFingerDistance / previousFingerDistance
      pinch(ratio) {
        if (!Number.isFinite(ratio) || ratio <= 0) return;
        zoom = clamp(zoom * ratio, o.zoomMin, o.zoomMax);
      },
      reset() { q = [0, 0, 0, 1]; zoom = 1; },
    };
  }

  const TAP_MOVE = 10;      // px a finger may move and still count as a tap
  const DOUBLE_MS = 320;    // max time between two taps
  const DOUBLE_DIST = 36;   // max distance between two taps

  /* attach({ target, ignore, onChange, onDoubleTap }) → controller
       target   : A-Frame entity (has .object3D) that receives the view
       ignore   : function(el) → true for touches that belong to buttons / the info sheet
       getAxes  : optional, returns { up, right } screen axes in the target's parent space
       onChange : called after the view changes */
  function attach(cfg) {
    const view = ViewState();
    const pointers = new Map();
    let moved = false;          // did the current touch travel far enough to be a drag?
    let lastTap = null;         // { t, x, y }
    let pinchDist = 0;
    let dragSuppressUntil = 0;

    function apply() {
      const g = view.get();
      const o = cfg.target.object3D;
      if (o.quaternion.set) o.quaternion.set(g.q[0], g.q[1], g.q[2], g.q[3]);
      else { o.quaternion.x = g.q[0]; o.quaternion.y = g.q[1]; o.quaternion.z = g.q[2]; o.quaternion.w = g.q[3]; }
      o.scale.set(g.zoom, g.zoom, g.zoom);
      if (cfg.onChange) cfg.onChange(g, view.isDefault());
    }

    const dist = () => {
      const p = Array.from(pointers.values());
      return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    };

    function down(e) {
      if (cfg.ignore && cfg.ignore(e.target)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
      if (pointers.size === 1) moved = false;
      if (pointers.size === 2) { pinchDist = dist(); moved = true; }
    }

    function move(e) {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;

      if (pointers.size === 1) {
        if (!moved && Math.hypot(p.x - p.sx, p.y - p.sy) > TAP_MOVE) moved = true;
        if (moved) { view.drag(dx, dy, cfg.getAxes ? cfg.getAxes() : null); apply(); }
      } else if (pointers.size === 2) {
        const d = dist();
        if (pinchDist > 0) { view.pinch(d / pinchDist); apply(); }
        pinchDist = d;
      }
    }

    function up(e) {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const wasTap = pointers.size === 1 && !moved && e.type !== "pointercancel";
      pointers.delete(e.pointerId);
      if (moved) dragSuppressUntil = Date.now() + 350; // swallow the click a drag would otherwise end with
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 1) {
        // went from two fingers to one: continue from here without a jump
        const r = Array.from(pointers.values())[0];
        r.sx = r.x; r.sy = r.y; moved = true;
      }
      if (pointers.size === 0 && !wasTap) { moved = false; return; }
      if (wasTap) {
        const now = Date.now();
        if (lastTap && now - lastTap.t < DOUBLE_MS && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < DOUBLE_DIST) {
          lastTap = null;
          view.reset(); apply();
          if (cfg.onDoubleTap) cfg.onDoubleTap();
        } else {
          lastTap = { t: now, x: p.x, y: p.y };
        }
      }
    }

    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);

    return {
      reset() { view.reset(); apply(); },
      isDefault: () => view.isDefault(),
      /* true right after a drag / pinch: the tap-to-label click handler asks this so
         that letting go of a rotate doesn't also open the info sheet */
      wasDrag: () => Date.now() < dragSuppressUntil,
      view,
    };
  }

  const api = { ViewState, attach, LIMITS, qRotate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AnatoGestures = api;
})(typeof window !== "undefined" ? window : this);
