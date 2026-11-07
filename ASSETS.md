# AnatoMark — asset provenance

| Asset | Where | Origin | Licence / note |
|---|---|---|---|
| Logo (`assets/logo/*`) | site-wide | AI-generated. Tool: _(fill in)_ | Created for this project |
| Homepage and card images (`assets/images/*`) | Home, Library | AI-generated. Tool: _(fill in)_ | Created for this project |
| Hiro marker (`assets/marker/hiro.png`, `anatomark-marker.pdf`) | Download Marker | Standard Hiro pattern from AR.js / ARToolKit | AR.js MIT, ARToolKit LGPL |
| A-Frame 1.5.0 | AR + detail viewer | aframe.io | MIT |
| three.js (bundled in A-Frame) | AR + detail viewer | threejs.org | MIT |
| AR.js 3.4.5 | AR view | AR-js-org/AR.js | MIT (ARToolKit: LGPL) |
| 3D models (`models/*.glb`) | AR + detail viewer | Sketchfab, see `credit:` in `js/structures-data.js` | Per model; shown on the Credits page |

Humerus (Eric Bauer) is CC BY-NC-ND 4.0: non-commercial, no derivatives. Replace it before any commercial use.
To add a model: add one row (with its `credit(...)`) to `BONES` in `js/structures-data.js`; the Credits page updates itself.

Card thumbnails (`assets/icons/*.webp`): rendered from the 3D models by `tools/thumbnails/make-thumbnails.py` (hologram style); they inherit each model's licence (see the Credits page).
