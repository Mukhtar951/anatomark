/* =========================================================
   ANATOMARK — STRUCTURES DATA
   Single source of truth. structure-detail.js, picker.js,
   library.js, ar-view.js and the homepage all read from this.

   Add a bone: add one row to BONES below and drop its .glb
   file in /models. Wording lives in js/descriptions.js.

   Image paths are relative to the PROJECT ROOT — callers prefix
   the correct "../" depth for their page. A structure without an
   `image` gets a generic bone icon until a thumbnail is added
   (put thumbnails in assets/icons/<id>.webp and set `image`).
   ========================================================= */

/* Order = order of the sections in the Library. */
window.ANATOMARK_REGIONS = [
  { id: "head",  label: "Whole skeleton & skull" },
  { id: "trunk", label: "Vertebral column & thorax" },
  { id: "upper", label: "Upper limb" },
  { id: "lower", label: "Pelvis & lower limb" },
];

/* Generic icon used when a structure has no thumbnail yet. */
window.ANATOMARK_PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#00e5c7" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">' +
      '<path d="M18 46a6 6 0 1 1-4-10l6-3 22-22a6 6 0 1 1 8 8L28 41l-3 6a6 6 0 0 1-7-1z"/>' +
      '<path d="M46 18l4 4" opacity="0.5"/></svg>'
  );

/* Licences used by the credits. A model's credit only needs a licence KEY from this table. */
window.ANATOMARK_LICENSES = {
  "cc-by-4.0": {
    name: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
    changes: "Resized, centred and prepared for web display; a soft bone tint may be applied to untextured parts.",
  },
  "cc-by-nc-nd-4.0": {
    name: "CC BY-NC-ND 4.0",
    url: "https://creativecommons.org/licenses/by-nc-nd/4.0/",
    changes: "Shown as supplied, without alteration. Non-commercial use only.",
    note: "Non-commercial, no derivatives.",
  },
};

/* credit(title, author, sourceUrl, extra) — one per model; lives in the model's own row below.
   Remove a model's row and its credit disappears from the Credits page with it. */
const credit = (title, author, url, extra) => Object.assign({ title, author, url, license: "cc-by-4.0" }, extra || {});

/* id, name, tag, region, credit, model file, image, fitSize?, spec */
const BONES = [
  { id: "skeleton", name: "Full Skeleton", tag: "BONE GROUP", region: "head",
    credit: credit("Skeleton (collection of thunthu)", "thunthu", "https://skfb.ly/CyES"),
    model: "models/skeleton_collection_of_thunthu.glb",
    spec: { classification: "Skeleton", count: "206 bones (adult)", function: "Support, Protection, Movement", region: "Whole body" } },

  { id: "skull", name: "Human Skull", tag: "BONE", region: "head",
    credit: credit("Skull downloadable", "martinjario", "https://sketchfab.com/3d-models/skull-downloadable-1a9db900738d44298b0bc59f68123393", { authorUrl: "https://sketchfab.com/martinjario" }),
    legacyImage: "assets/images/skull.webp", model: "models/skull_downloadable.glb",
    spec: { classification: "Bone", count: "22 bones", function: "Protection, Support, Muscle attachment", region: "Head (Cranial & Facial)" } },

  { id: "vertebral-column", name: "Vertebral Column", tag: "BONE", region: "trunk",
    credit: credit("Spine (collection of thunthu)", "thunthu", "https://skfb.ly/CyHw"),
    legacyImage: "assets/images/vertebral-column.jpeg", model: "models/spine_collection_of_thunthu.glb",
    spec: { classification: "Bone", count: "33 vertebrae", function: "Protection, Support, Posture", region: "Neck & Trunk" } },
  { id: "thorax", name: "Thorax", tag: "BONE GROUP", region: "trunk",
    credit: credit("Human Thorax", "Medulla", "https://skfb.ly/6xRPL"),
    solidify: "#a9bdd6",   // the file's cartilage is half see-through; this makes it solid (cleaner and faster). Remove to keep it see-through.
    model: "models/human_thorax.glb",
    spec: { classification: "Bone group", count: "—", function: "Protection, Breathing mechanics", region: "Chest" } },

  { id: "clavicle", name: "Clavicle", tag: "BONE", region: "upper",
    credit: credit("Human clavicle", "Eric Bauer", "https://skfb.ly/69pKL"),
    model: "models/human_clavicle.glb",
    spec: { classification: "Long bone", count: "2 (one each side)", function: "Strut between trunk and arm", region: "Shoulder girdle" } },
  { id: "scapula", name: "Scapula", tag: "BONE", region: "upper",
    credit: credit("Human scapula", "Eric Bauer", "https://skfb.ly/6tAJV"),
    model: "models/human_scapula.glb",
    spec: { classification: "Flat bone", count: "2 (one each side)", function: "Shoulder movement, Muscle attachment", region: "Shoulder girdle" } },
  { id: "humerus", name: "Humerus", tag: "BONE", region: "upper",
    credit: credit("Human Humerus", "Eric Bauer", "https://skfb.ly/6r77O", { license: "cc-by-nc-nd-4.0" }),
    tint: false,
    texture: "bone",   // no UV map in this model: gets the procedural bone surface (js/bone-texture.js). Remove this line to show it plain.
    model: "models/human_humerus.glb",
    spec: { classification: "Long bone", count: "2 (one each side)", function: "Movement, Load-bearing", region: "Arm" } },
  { id: "radius", name: "Radius", tag: "BONE", region: "upper",
    credit: credit("Human radius", "Eric Bauer", "https://skfb.ly/69rHP"),
    model: "models/human_radius.glb",
    spec: { classification: "Long bone", count: "2 (one each side)", function: "Forearm rotation, Wrist movement", region: "Forearm (lateral)" } },
  { id: "ulna", name: "Ulna", tag: "BONE", region: "upper",
    credit: credit("Human Ulna", "Eric Bauer", "https://skfb.ly/69rHL"),
    model: "models/human_ulna.glb",
    spec: { classification: "Long bone", count: "2 (one each side)", function: "Elbow hinge, Forearm support", region: "Forearm (medial)" } },
  { id: "hand", name: "Hand", tag: "BONE GROUP", region: "upper",
    credit: credit("Hand", "Team Skeleton Wars", "https://skfb.ly/6RsIX"),
    model: "models/hand.glb",
    spec: { classification: "Bone group", count: "27 bones", function: "Grasping, Fine movement", region: "Hand" } },

  { id: "pelvis", name: "Pelvis", tag: "BONE GROUP", region: "lower",
    credit: credit("Pelvic bone (collection of thunthu)", "thunthu", "https://skfb.ly/CyRu"),
    model: "models/pelvic_bone_collection_of_thunthu.glb",
    spec: { classification: "Bone group", count: "—", function: "Weight transfer, Protection of pelvic organs", region: "Pelvic girdle" } },
  { id: "femur", name: "Femur", tag: "BONE", region: "lower",
    credit: credit("Human Femur", "Eric Bauer", "https://skfb.ly/6ursH"),
    model: "models/human_femur.glb",
    spec: { classification: "Long bone", count: "2 (one each side)", function: "Weight-bearing, Movement", region: "Thigh" } },
  { id: "tibia", name: "Tibia", tag: "BONE", region: "lower",
    credit: credit("Human Tibia", "Eric Bauer", "https://skfb.ly/6ursI"),
    model: "models/human_tibia.glb",
    spec: { classification: "Long bone", count: "2 (one each side)", function: "Weight-bearing", region: "Leg (medial)" } },
  { id: "fibula", name: "Fibula", tag: "BONE", region: "lower",
    credit: credit("Human Fibula", "Eric Bauer", "https://skfb.ly/6ursG"),
    model: "models/human_fibula.glb",
    spec: { classification: "Long bone", count: "2 (one each side)", function: "Muscle attachment, Ankle stability", region: "Leg (lateral)" } },
  { id: "foot", name: "Foot (right)", tag: "BONE GROUP", region: "lower",
    credit: credit("Right Foot Bones", "IRevans", "https://skfb.ly/6wWTx"),
    model: "models/right_foot_bones.glb",
    spec: { classification: "Bone group", count: "26 bones", function: "Support, Balance, Walking", region: "Foot" } },
];

(function () {
  const desc = window.ANATOMARK_DESCRIPTIONS || {};
  const regionLabel = {};
  window.ANATOMARK_REGIONS.forEach((r) => (regionLabel[r.id] = r.label));

  const structures = BONES.map((b) => {
    const d = desc[b.id] || {};
    const s = Object.assign({}, b);
    s.regionLabel = regionLabel[b.region] || "";
    // Thumbnail = assets/icons/<id>.webp (made by tools/thumbnails). If that file is missing the page falls back
    // to `legacyImage` (if set), then to the generic bone icon.
    s.image = b.image || "assets/icons/" + b.id + ".webp";
    s.summary = d.summary || (b.spec && b.spec.region) || s.regionLabel;
    s.about = d.about || "A full description of this structure is coming soon. Use the 3D view to explore its shape.";
    s.hasDescription = !!d.about;
    s.modelPosition = [0, 0, 0];
    s.modelRotation = [0, 0, 0];
    return s;
  });

  window.ANATOMARK_SYSTEMS = [
    {
      id: "skeletal",
      name: "Skeletal System",
      tagline: structures.length + " structures. One marker.",
      status: "active",
      structures,
    },
    { id: "muscular", name: "Muscular System", tagline: "Coming soon", status: "locked", structures: [] },
    { id: "circulatory", name: "Circulatory System", tagline: "Coming soon", status: "locked", structures: [] },
  ];
})();

/** Find a structure by id across all systems. Returns { system, structure } or null. */
function anatomarkFindStructure(structureId) {
  for (const system of window.ANATOMARK_SYSTEMS) {
    const structure = system.structures.find((s) => s.id === structureId);
    if (structure) return { system, structure };
  }
  return null;
}

/** All structures belonging to the (first) active system. */
function anatomarkActiveStructures() {
  const active = window.ANATOMARK_SYSTEMS.find((s) => s.status === "active");
  return active ? active.structures : [];
}

/** Thumbnail path for a structure (assets/icons/<id>.webp). `prefix` is "../" or "". */
function anatomarkImage(structure, prefix) {
  return structure && structure.image ? (prefix || "") + structure.image : window.ANATOMARK_PLACEHOLDER_IMG;
}

/** Attributes for an <img> showing a structure thumbnail: use as `<img ${anatomarkImgAttrs(s, "../")} ...>`.
 *  If the thumbnail file doesn't exist yet, the image falls back to legacyImage, then to the generic icon. */
function anatomarkImgAttrs(structure, prefix) {
  const esc = (v) => String(v).replace(/"/g, "&quot;");
  const fb = structure && structure.legacyImage ? (prefix || "") + structure.legacyImage : "";
  return `src="${esc(anatomarkImage(structure, prefix))}"` + (fb ? ` data-fallback="${esc(fb)}"` : "") + ' onerror="anatomarkImgError(this)"';
}

/** onerror handler for thumbnails (see anatomarkImgAttrs). */
function anatomarkImgError(img) {
  const fb = img.getAttribute("data-fallback");
  if (fb && !img.getAttribute("data-tried")) { img.setAttribute("data-tried", "1"); img.src = fb; return; }
  img.onerror = null;
  img.src = window.ANATOMARK_PLACEHOLDER_IMG;
}

/** Structures in library order (region by region) — used by Next / Previous in the AR view. */
function anatomarkOrderedStructures() {
  const list = anatomarkActiveStructures();
  const out = [];
  window.ANATOMARK_REGIONS.forEach((r) => list.forEach((s) => { if (s.region === r.id) out.push(s); }));
  list.forEach((s) => { if (out.indexOf(s) < 0) out.push(s); });
  return out;
}
