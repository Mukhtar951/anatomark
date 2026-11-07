#!/usr/bin/env python3
"""Render hologram-style card thumbnails from the .glb models.

  python3 tools/thumbnails/make-thumbnails.py            # every model in the list below that exists
  python3 tools/thumbnails/make-thumbnails.py skull femur   # only these ids

Needs: Python 3, `pip install playwright pillow`, and `playwright install chromium`.
Draco-compressed models need internet the first time (the decoder comes from gstatic) or /libs/draco/.
Writes assets/icons/<id>.webp (320x320, transparent). The data file js/structures-data.js picks up
`image: "assets/icons/<id>.webp"` for each id listed in the "image" section of that row.

VIEW = per-bone camera angle (degrees). Long bones are rolled so they run diagonally and fill the square."""
import sys, os, io, subprocess, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "assets", "icons")
SIZE = 320
# id: (model file, yaw, pitch, roll)
VIEW = {
    "skull":            ("models/skull_downloadable.glb", 30, 0, 0),
    "skeleton":         ("models/skeleton_collection_of_thunthu.glb", 0, 0, 0),
    "vertebral-column": ("models/spine_collection_of_thunthu.glb", 0, 0, 0),
    "thorax":           ("models/human_thorax.glb", 20, 0, 0),
    "clavicle":         ("models/human_clavicle.glb", 0, 0, -20),
    "scapula":          ("models/human_scapula.glb", 0, 0, 0),
    "humerus":          ("models/human_humerus.glb", 0, 0, 35),
    "radius":           ("models/human_radius.glb", 0, 0, 35),
    "ulna":             ("models/human_ulna.glb", 0, 0, 35),
    "hand":             ("models/hand.glb", 0, 0, 20),
    "pelvis":           ("models/pelvic_bone_collection_of_thunthu.glb", 0, 0, 0),
    "femur":            ("models/human_femur.glb", 0, 0, 35),
    "tibia":            ("models/human_tibia.glb", 0, 0, 35),
    "fibula":           ("models/human_fibula.glb", 0, 0, 35),
    "foot":             ("models/right_foot_bones.glb", 0, 0, 0),
}

def serve():
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    class Q(h.func):
        def log_message(self, *a): pass
    srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Q, directory=ROOT)); 
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def tidy(png):
    im = Image.open(io.BytesIO(png)).convert("RGBA")
    box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if not box: raise SystemExit("empty render")
    im = im.crop(box)
    s = max(im.size); pad = int(s * 0.09)
    sq = Image.new("RGBA", (s + 2 * pad, s + 2 * pad), (0, 0, 0, 0))
    sq.paste(im, ((s + 2 * pad - im.width) // 2, (s + 2 * pad - im.height) // 2))
    return sq.resize((SIZE, SIZE), Image.LANCZOS)

def main():
    want = sys.argv[1:] or list(VIEW)
    os.makedirs(OUT, exist_ok=True)
    srv = serve(); port = srv.server_address[1]
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        for id in want:
            f, yaw, pitch, roll = VIEW[id]
            if not os.path.exists(os.path.join(ROOT, f)):
                print(f"skip {id}: {f} not found"); continue
            pg = b.new_page(viewport={"width": 768, "height": 768})
            pg.goto(f"http://127.0.0.1:{port}/tools/thumbnails/thumb.html?model=/{f}&yaw={yaw}&pitch={pitch}&roll={roll}")
            try: pg.wait_for_function("document.title==='done' || document.title.startsWith('error')", timeout=120000)
            except Exception: print(f"FAILED {id}: timed out"); pg.close(); continue
            if pg.title().startswith("error"): print(f"FAILED {id}: {pg.title()}"); pg.close(); continue
            png = pg.screenshot(omit_background=True, clip={"x": 0, "y": 0, "width": 768, "height": 768})
            out = os.path.join(OUT, id + ".webp")
            tidy(png).save(out, "WEBP", quality=88, method=6)
            print(f"{id}: {os.path.getsize(out)//1024} KB -> {out}")
            pg.close()
        b.close()
main()
