/* =========================================================
   ANATOMARK — PROCEDURAL BONE SURFACE
   For models that have no UV map / texture (e.g. the Draco humerus), a texture image
   can't be painted on. This gives them a bone-like surface computed on the GPU from the
   model's own coordinates: warm mottling and fine pores.
   Used by the Structure Detail viewer and the AR page for rows with  texture: "bone".
   BoneTexture.apply(rootObject3D, THREE)
   ========================================================= */
(function (root) {
  const NOISE = `
    precision highp float; /* the AR scene asks for mediump, which makes noise blocky */
    float bh(vec3 p){ vec3 q = fract(p * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float bn(vec3 x){
      vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
      return mix(mix(mix(bh(i), bh(i+vec3(1,0,0)), f.x), mix(bh(i+vec3(0,1,0)), bh(i+vec3(1,1,0)), f.x), f.y),
                 mix(mix(bh(i+vec3(0,0,1)), bh(i+vec3(1,0,1)), f.x), mix(bh(i+vec3(0,1,1)), bh(i+vec3(1,1,1)), f.x), f.y), f.z);
    }
    float bfbm(vec3 p){ float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a*bn(p); p = p*2.03 + 7.1; a *= 0.5; } return s; }
  `;

  function patch(mat, freq) {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uBoneFreq = { value: freq };
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vBoneP;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBoneP = position;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vBoneP;\nuniform float uBoneFreq;\n" + NOISE)
        .replace("#include <color_fragment>", `#include <color_fragment>
          {
            vec3 q = vBoneP * uBoneFreq;
            float big = bfbm(q * 0.6);
            float mid = bfbm(q * 2.5);
            float pore = smoothstep(0.66, 0.82, bn(q * 7.0));
            vec3 dark = vec3(0.56, 0.47, 0.34), light = vec3(0.76, 0.68, 0.53);
            vec3 c = mix(dark, light, smoothstep(0.2, 0.8, big * 0.7 + mid * 0.3));
            c *= 1.0 - 0.10 * pore;
            diffuseColor.rgb = c;
          }`);
    };
    mat.customProgramCacheKey = () => "anatomark-bone-v1";
    if ("roughness" in mat) mat.roughness = 0.9;
    if ("metalness" in mat) mat.metalness = 0;
    mat.needsUpdate = true;
  }

  function apply(obj, THREE) {
    obj.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const g = o.geometry; let freq = 0.1;
      if (g) {
        if (!g.boundingBox) g.computeBoundingBox();
        const s = g.boundingBox.getSize(new THREE.Vector3());
        freq = 12 / Math.max(s.x, s.y, s.z, 1e-6); // same look whatever the model's units
      }
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m && !m.map) patch(m, freq); });
    });
  }
  /* Turn see-through materials solid (e.g. the thorax's costal cartilage, which is half transparent in
     the file). Half-transparent double-sided parts flicker and speckle where they overlap, and cost the
     phone more work; a solid pale colour is cleaner and still tells cartilage from bone. */
  function solidify(obj, colour) {
    obj.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (!m || !(m.transparent || m.opacity < 1)) return;
        m.transparent = false; m.opacity = 1; m.depthWrite = true; m.alphaTest = 0;
        if (m.color && colour) m.color.set(colour);
        if ("roughness" in m) m.roughness = 0.8;
        if ("metalness" in m) m.metalness = 0;
        m.needsUpdate = true;
      });
    });
  }
  root.BoneTexture = { apply, solidify };
})(window);
