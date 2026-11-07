# AnatoMark

Marker-based web AR anatomy platform — Final year Human Anatomy project, Northwest University Kano (2025/2026).
Plain HTML/CSS/JS, no build step.

## Run it
Serve the folder with any static server (camera access needs `https://` or `localhost`):
`python -m http.server 7700` → open `http://localhost:7700`. For a phone, use an HTTPS tunnel (e.g. ngrok) or deploy to GitHub Pages / Netlify.

## Still to add
| What | Where |
|---|---|
| 3D models (the bone `.glb` files, compressed for phones) | `models/` — see `models/README.md` |
| Bone descriptions | `js/descriptions.js` (blank = neutral line) |
| Bone thumbnails (generated from the models) | `assets/icons/`, then set `image` in `js/structures-data.js` |
| Project email + WhatsApp number | `js/site-config.js` (blank = "Coming soon") |
| Offline AR libraries (optional) | `libs/` — see `libs/README.txt` |
| Project report link | `pages/about.html` (commented out until the project is complete) |

## Pages
Home · About · How To Use · Download Marker · Library · Structure Detail (live 3D viewer) · AR View · Credits & Privacy (linked from the footer).
Structure data lives in `js/structures-data.js`; the wording you write lives in `js/descriptions.js`.

## Editing things
- **Add / remove a model:** one row in `BONES` in `js/structures-data.js`, including its `credit(...)`. The Credits page and the credit line on Structure Detail follow automatically.
- **About card rows:** `ANATOMARK_PROJECT` in `js/site-config.js`; delete a line to remove a row.
- **Contact:** email / WhatsApp in `js/site-config.js`. The WhatsApp number is never shown as text.
- **Marker:** `assets/marker/anatomark-marker.pdf` (A4, 12 cm) and `hiro.png` are bundled.
- **Large models:** over about 40 MB the detail viewer asks before loading ("Load anyway"). For Draco-compressed files put the decoder in `libs/draco/`, otherwise it is fetched from gstatic.
- Provenance of every asset: `ASSETS.md`.

## Optimising models (when you're at your computer)
1. Install Node.js 18+ (nodejs.org), put the original `.glb` files in `models/`.
2. From the project folder run `node tools/optimize-models.mjs` (add `1024` for smaller textures).
3. Check the before/after table, test a few files on the site, then copy `models-optimized/*` over `models/`.
4. Optional offline use: put the Draco decoder files in `libs/draco/` (see `libs/README.txt`); otherwise they load from the internet.
- **Bone colour baked into a file:** `python tools/set-bone-colour.py models/human_fibula.glb` (edit `COLOUR` at the top to change it). Works on Draco files too.
- **AR contrast:** a dark halo is drawn behind the model so pale bones stand out against the marker; the Contrast button in AR turns it on/off (remembered). Colours/size: `buildHalo` in `js/ar-view.js`; lights: `pages/ar-view.html`.
- **Thumbnails:** render with `python3 tools/thumbnails/make-thumbnails.py` (hologram style, needs playwright + pillow); skull and scapula are done, the rest fall back to the generic icon / AI image until their models are rendered.

## AR quality notes
- `pages/ar-view.html` renderer: `antialias: true; precision: high`. (A-Frame adds the "p" itself: writing `highp` or `mediump` there silently drops the whole scene to low precision.)
- `js/pose-filter.js` steadies the marker pose (1€ filter + one-frame glitch guard). Tuning values are at the top of `create()`; `window.__anatoNoSmooth = true` turns it off for testing.
- `structure.solidify` (thorax) makes see-through materials solid; `structure.texture = "bone"` gives plain models a bone surface; `structure.tint = false` keeps a model's own colour.

## Making thumbnails on Termux (no computer needed)
1. Put the models in `models/` (Draco-compressed is fine; internet needed once for the decoder).
2. In Termux: `cd <project folder>` then `python3 tools/thumbnails/save-server.py`.
3. Open `http://localhost:8000/tools/thumbnails/generate.html` in Chrome on the same phone, tap **Generate all**, and keep the tab open. Each finished image is saved straight into `assets/icons/<id>.webp`; use **Redo** on any one that looks off.
4. Stop the server with Ctrl+C. The Library, picker, detail page and Home cards use the new images automatically (missing ones fall back to the old picture, then to the generic icon).

## Deploying to Netlify (anatomark.com)

1. The site is plain static files: no build command, publish directory is the project root (already set in `netlify.toml`).
2. `_headers` sets security and cache headers, `404.html` is the not-found page, `robots.txt` and `sitemap.xml` are for search engines.
3. Camera access (AR) needs HTTPS. Netlify provides it free for anatomark.com once the domain is verified.
4. After changing any JS or CSS, bump the `?v=` tag in the HTML files so phones fetch the new version.
