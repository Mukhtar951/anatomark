# /models

Drop your `.glb` files here **with their original file names**. `js/structures-data.js`
is already wired to look for these:

| Structure | File |
|---|---|
| Full Skeleton | `skeleton_collection_of_thunthu.glb` |
| Human Skull | `skull_downloadable.glb` |
| Vertebral Column | `spine_collection_of_thunthu.glb` |
| Thorax | `human_thorax.glb` |
| Clavicle / Scapula | `human_clavicle.glb` / `human_scapula.glb` |
| Humerus / Radius / Ulna | `human_humerus.glb` / `human_radius.glb` / `human_ulna.glb` |
| Hand | `hand.glb` |
| Pelvis | `pelvic_bone_collection_of_thunthu.glb` |
| Femur / Tibia / Fibula | `human_femur.glb` / `human_tibia.glb` / `human_fibula.glb` |
| Foot (right) | `right_foot_bones.glb` |

Not used yet: `heart_anatomy.glb` (waiting for the Circulatory system),
`overview-colored-skull.glb`, `male_human_skeleton_-_zbrush_-_anatomy_study.glb`.

## File size matters

Phones struggle above roughly **5–10 MB per model**. Several of the current files are far
larger (the scapula is about 273 MB) and will not load on a phone until they are compressed.
Compression (Draco geometry, resized WebP textures) is a planned separate step; originals
should always be kept. A missing or failed file shows a clear "3D model unavailable" message.

## Adding a bone

1. Put the `.glb` in this folder.
2. Add one row to the `BONES` list in `js/structures-data.js` (id, name, region, model path, spec).
3. Optionally write its wording in `js/descriptions.js` (until then a neutral line is shown).

## Sizing and placement are automatic

Each model is measured when it loads, centred on the marker and scaled to fit (the Hiro marker
is 1 unit wide). Open the browser console on the AR page to see `[AnatoMark] auto-fit …`.

Optional per-structure settings in `js/structures-data.js`:

| Setting | Meaning |
|---|---|
| `fitSize` | Largest side of the model in marker units. Default `0.9`. |
| `tint: false` | Switch off the bone-coloured tint that is applied to untextured (flat white) models. |
| `parts`, `assemble` | Advanced: build one structure from several files (kept for later; not used now). |

If a model lies on its side, its file uses a different "up" axis. The fix is one rotation value
(`modelRotation`) in `structures-data.js`.

## AR controls

One finger rotates, two fingers pinch to zoom (0.4x to 3x), double-tap or the Reset button returns
to the default view. The camera button saves a picture of the camera and model. The arrow buttons
move to the next or previous structure.
