#!/usr/bin/env python3
"""AnatoMark thumbnail helper for Termux (or any computer): serves the project AND lets the
generator page save the finished images straight into assets/icons/. Needs only Python 3.

  cd <project folder>
  python3 tools/thumbnails/save-server.py          # then open  http://localhost:8000/tools/thumbnails/generate.html
"""
import http.server, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "assets", "icons")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
NAME = re.compile(r"^[a-z0-9-]+\.(webp|png)$")

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")   # always fresh while generating
        super().end_headers()
    def do_POST(self):
        name = self.path.rsplit("/", 1)[-1]
        if not self.path.startswith("/save/") or not NAME.match(name):
            self.send_error(400, "bad name"); return
        n = int(self.headers.get("Content-Length", 0))
        if n <= 0 or n > 5_000_000: self.send_error(400, "bad size"); return
        data = self.rfile.read(n)
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, name), "wb") as f: f.write(data)
        print("saved", name, len(data) // 1024, "KB")
        self.send_response(200); self.end_headers(); self.wfile.write(b"ok")

print(f"Open http://localhost:{PORT}/tools/thumbnails/generate.html   (Ctrl+C to stop)")
http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
