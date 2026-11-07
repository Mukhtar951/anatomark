#!/usr/bin/env python3
"""AnatoMark thumbnail helper for Termux (and any computer). Standard library only.

  python3 tools/thumbnails/serve.py          # then open  http://localhost:8765/tools/thumbnails/generate.html

Serves the project folder and lets generate.html save each finished thumbnail straight into
assets/icons/<id>.webp. After every save it rewrites js/thumbs.js (the list of thumbnails that exist),
which is how the site knows to use them - you never edit the data file by hand."""
import http.server, socketserver, os, re, sys, json
from urllib.parse import urlparse, parse_qs

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ICONS = os.path.join(ROOT, "assets", "icons")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765

def write_manifest():
    ids = sorted(f[:-5] for f in os.listdir(ICONS) if f.endswith(".webp"))
    with open(os.path.join(ROOT, "js", "thumbs.js"), "w") as f:
        f.write("/* Written by tools/thumbnails/serve.py - the thumbnails that exist in assets/icons/ */\n")
        f.write("window.ANATOMARK_THUMBS = " + json.dumps(ids) + ";\n")
    return ids

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def reply(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code); self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)

    def do_POST(self):
        u = urlparse(self.path)
        if u.path != "/save": return self.reply(404, {"error": "not found"})
        id_ = parse_qs(u.query).get("id", [""])[0]
        if not re.fullmatch(r"[a-z0-9-]{1,40}", id_): return self.reply(400, {"error": "bad id"})
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > 2_000_000: return self.reply(400, {"error": "bad size"})
        data = self.rfile.read(n)
        if data[:4] != b"RIFF" or data[8:12] != b"WEBP": return self.reply(415, {"error": "not a webp image"})
        os.makedirs(ICONS, exist_ok=True)
        with open(os.path.join(ICONS, id_ + ".webp"), "wb") as f: f.write(data)
        self.reply(200, {"saved": id_, "kb": round(n / 1024, 1), "all": write_manifest()})

    def log_message(self, fmt, *args):
        if "/save" in (args[0] if args else ""): sys.stderr.write("saved: " + args[0] + "\n")

socketserver.TCPServer.allow_reuse_address = True
os.makedirs(ICONS, exist_ok=True); write_manifest()
with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), Handler) as srv:
    print(f"\nServing {ROOT}\nOpen in Chrome:  http://localhost:{PORT}/tools/thumbnails/generate.html\nStop with Ctrl+C\n")
    try: srv.serve_forever()
    except KeyboardInterrupt: print("\nbye")
