/* =========================================================
   ANATOMARK — MODEL FIT MATHS
   Pure functions (no THREE.js / DOM) so they can be unit-tested.
   A "box" is { min:[x,y,z], max:[x,y,z] } measured in the model
   file's own units. The Hiro marker is 1 unit wide in the scene.
   ========================================================= */
(function (root) {
  const sizeOf = (b) => [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
  const centerOf = (b) => [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
  const longestOf = (b) => Math.max.apply(null, sizeOf(b));
  const valid = (b) =>
    b && b.min && b.max && [].concat(b.min, b.max).every(Number.isFinite) && longestOf(b) > 0;

  function union(boxes) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    boxes.forEach((b) => { for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], b.min[i]); max[i] = Math.max(max[i], b.max[i]); } });
    return { min, max };
  }

  /* One model on its own: scale its longest side to `target`, centred. */
  function single(box, target) {
    if (!valid(box) || !(target > 0)) return null;
    return { scale: target / longestOf(box), anchor: centerOf(box) };
  }

  /* Several bones that make one structure (e.g. the upper limb).
     parts: [{ box, dataPosition:[x,y,z] }]  — in order: parts[0] is the
     proximal bone (humerus), the rest sit below the elbow.
     mode:
       "shared"  all files share one coordinate system (cut from the same
                 scan), so the bones are ALREADY assembled — keep their
                 relative placement and fit the whole group.
       "stacked" every file has its own origin, so bones are scaled by one
                 common factor (keeps true proportions) and placed end to
                 end: proximal bone above the elbow, the rest below it.
       "auto"    (default) picks "shared" when the bones sit close together
                 relative to their size, otherwise "stacked".
     Returns { mode, scale, items:[ {anchor, position|null} ] } or null.
     position === null means "put the anchor at the marker centre". */
  function assemble(parts, target, mode) {
    const usable = parts.filter((p) => valid(p.box));
    if (!usable.length || !(target > 0)) return null;
    const boxes = usable.map((p) => p.box);
    const U = union(boxes);
    const maxL = Math.max.apply(null, boxes.map(longestOf));
    const LU = longestOf(U);

    let m = mode && mode !== "auto" ? mode : LU <= 4 * maxL ? "shared" : "stacked";

    if (m === "shared") {
      const scale = target / LU;
      const anchor = centerOf(U);
      return { mode: m, scale, items: parts.map((p) => (valid(p.box) ? { anchor, position: null } : null)) };
    }

    const scale = target / (1.8 * maxL); // humerus + forearm is roughly 1.8x the longest bone
    return {
      mode: "stacked",
      scale,
      items: parts.map((p, i) => {
        if (!valid(p.box)) return null;
        const half = (longestOf(p.box) * scale) / 2;
        const dp = p.dataPosition || [0, 0, 0];
        return { anchor: centerOf(p.box), position: [dp[0], i === 0 ? half : -half, dp[2]] };
      }),
    };
  }

  const api = { single, assemble, union, centerOf, sizeOf, longestOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AnatoFit = api;
})(typeof window !== "undefined" ? window : this);
