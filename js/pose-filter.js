/* =========================================================
   ANATOMARK — MARKER POSE FILTER
   The AR library measures the marker's pose again on every camera frame. Each measurement has
   a little noise (and now and then one frame is simply wrong), which shows up as the model
   shaking, growing or shrinking for a moment even when the phone is held still.

   This filter smooths that out without making the model feel slow:
   - a "1€ filter": very steady when the phone is still, follows quickly when it really moves
   - a spike guard: a single frame whose size or rotation suddenly jumps is held back for a
     few frames, and only accepted if the new value stays
   The maths has no DOM in it, so it is unit-tested in Node.

   PoseFilter.create(opts) -> { filter(elements16, timeMs) -> elements16 (new array), reset() }
   `elements16` is a column-major 4x4 matrix (the same layout three.js uses).
   ========================================================= */
(function (root) {
  const TAU = Math.PI * 2;

  function decompose(e) {
    const sx = Math.hypot(e[0], e[1], e[2]), sy = Math.hypot(e[4], e[5], e[6]), sz = Math.hypot(e[8], e[9], e[10]);
    const m = [e[0] / sx, e[1] / sx, e[2] / sx, e[4] / sy, e[5] / sy, e[6] / sy, e[8] / sz, e[9] / sz, e[10] / sz];
    // rotation matrix (column-major m) -> quaternion [x,y,z,w]
    const m11 = m[0], m21 = m[1], m31 = m[2], m12 = m[3], m22 = m[4], m32 = m[5], m13 = m[6], m23 = m[7], m33 = m[8];
    const tr = m11 + m22 + m33; let q;
    if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); q = [(m32 - m23) * s, (m13 - m31) * s, (m21 - m12) * s, 0.25 / s]; }
    else if (m11 > m22 && m11 > m33) { const s = 2 * Math.sqrt(1 + m11 - m22 - m33); q = [0.25 * s, (m12 + m21) / s, (m13 + m31) / s, (m32 - m23) / s]; }
    else if (m22 > m33) { const s = 2 * Math.sqrt(1 + m22 - m11 - m33); q = [(m12 + m21) / s, 0.25 * s, (m23 + m32) / s, (m13 - m31) / s]; }
    else { const s = 2 * Math.sqrt(1 + m33 - m11 - m22); q = [(m13 + m31) / s, (m23 + m32) / s, 0.25 * s, (m21 - m12) / s]; }
    return { p: [e[12], e[13], e[14]], q: norm(q), s: [sx, sy, sz] };
  }

  function compose(p, q, s) {
    const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    return [
      (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
      (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
      (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
      p[0], p[1], p[2], 1,
    ];
  }

  const norm = (q) => { const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / n, q[1] / n, q[2] / n, q[3] / n]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const alpha = (cutoff, dt) => { const tau = 1 / (TAU * cutoff); return 1 / (1 + tau / dt); };
  const lerp = (a, b, t) => a + (b - a) * t;

  function slerp(a, b, t) {
    let d = dot(a, b), bb = b;
    if (d < 0) { d = -d; bb = [-b[0], -b[1], -b[2], -b[3]]; }
    if (d > 0.9995) return norm([lerp(a[0], bb[0], t), lerp(a[1], bb[1], t), lerp(a[2], bb[2], t), lerp(a[3], bb[3], t)]);
    const th = Math.acos(d), s = Math.sin(th), w1 = Math.sin((1 - t) * th) / s, w2 = Math.sin(t * th) / s;
    return [a[0] * w1 + bb[0] * w2, a[1] * w1 + bb[1] * w2, a[2] * w1 + bb[2] * w2, a[3] * w1 + bb[3] * w2];
  }
  const angle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(dot(a, b))));

  function create(opts) {
    const o = Object.assign({
      posMin: 1.0, posBeta: 1.5,    // sideways/up-down: Hz at rest; extra Hz per (marker widths / second) of movement
      depMin: 0.45, depBeta: 0.6,   // distance from the camera is the noisiest channel (it makes the model "grow"), so it is held steadiest
      rotMin: 1.2, rotBeta: 0.3,    // Hz at rest; extra Hz per (radian / second)
      sclMin: 0.6, sclBeta: 0.3,
      gapMs: 400,                   // longer gap = the marker was lost: start fresh
      spikeScale: 0.12,             // a single-frame size jump bigger than this (12%) is suspect
      spikeRot: 0.7,                // ...or a rotation jump bigger than this (about 40 degrees)
      spikeFrames: 3,               // ...and is held back this many frames unless it persists
    }, opts || {});
    let st = null, spike = 0;

    function reset() { st = null; spike = 0; }

    function filter(elements, tMs) {
      const raw = decompose(elements);
      if (!st || tMs - st.t > o.gapMs || !(raw.s[0] > 0)) {
        st = { t: tMs, p: raw.p, q: raw.q, s: raw.s, vp: 0, vd: 0, vq: 0, vs: 0 };
        spike = 0;
        return elements.slice();
      }
      const dt = Math.max((tMs - st.t) / 1000, 1 / 240);
      const sMag = st.s[0] || 1;

      // ---- spike guard: size or rotation suddenly different from what we have been showing
      const scaleJump = Math.abs(raw.s[0] / st.s[0] - 1);
      const rotJump = angle(raw.q, st.q);
      if ((scaleJump > o.spikeScale || rotJump > o.spikeRot) && spike < o.spikeFrames) {
        spike++;
        st.t = tMs;
        return compose(st.p, st.q, st.s);          // keep showing the last good pose
      }
      if (spike >= o.spikeFrames) { st = { t: tMs, p: raw.p, q: raw.q, s: raw.s, vp: 0, vd: 0, vq: 0, vs: 0 }; spike = 0; return elements.slice(); }
      spike = 0;

      // ---- 1€ filter on position. x/y and depth (z) are filtered separately; speeds in marker widths per second
      const dxy = Math.hypot(raw.p[0] - st.p[0], raw.p[1] - st.p[1]) / sMag / dt;
      const dz = Math.abs(raw.p[2] - st.p[2]) / sMag / dt;
      st.vp = lerp(st.vp, dxy, alpha(1, dt));
      st.vd = lerp(st.vd, dz, alpha(1, dt));
      const axy = alpha(o.posMin + o.posBeta * st.vp, dt), az = alpha(o.depMin + o.depBeta * st.vd, dt);
      const p = [lerp(st.p[0], raw.p[0], axy), lerp(st.p[1], raw.p[1], axy), lerp(st.p[2], raw.p[2], az)];

      // ---- rotation (speed in radians per second)
      st.vq = lerp(st.vq, rotJump / dt, alpha(1, dt));
      const q = slerp(st.q, raw.q, alpha(o.rotMin + o.rotBeta * st.vq, dt));

      // ---- size (one uniform value; the three axes are filtered together)
      const ds = Math.abs(raw.s[0] - st.s[0]) / st.s[0] / dt;
      st.vs = lerp(st.vs, ds, alpha(1, dt));
      const as = alpha(o.sclMin + o.sclBeta * st.vs, dt);
      const s = [lerp(st.s[0], raw.s[0], as), lerp(st.s[1], raw.s[1], as), lerp(st.s[2], raw.s[2], as)];

      st.t = tMs; st.p = p; st.q = q; st.s = s;
      return compose(p, q, s);
    }
    return { filter, reset };
  }

  const api = { create, decompose, compose };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PoseFilter = api;
})(typeof window !== "undefined" ? window : this);
