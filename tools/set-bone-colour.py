#!/usr/bin/env python3
"""AnatoMark - bake a bone colour into plain-white .glb models.

  python tools/set-bone-colour.py in.glb [out.glb]      (no extra packages needed)
  python tools/set-bone-colour.py models/*.glb           (writes <name>.bone.glb next to each)

Only materials that have NO texture and are near-white are changed; textured models are
left alone. Only the small JSON header of the file is edited, so Draco/WebP data stays
byte-for-byte identical and the file size barely changes.
Edit COLOUR to taste (sRGB hex)."""
import json, struct, sys, os

COLOUR = "#d8ccb2"
ROUGHNESS = 0.85

def lin(c):  # sRGB 0-255 -> linear 0-1 (glTF colour factors are linear)
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def recolour(src, dst):
    d = open(src, "rb").read()
    magic, ver, _ = struct.unpack("<4sII", d[:12])
    assert magic == b"glTF" and ver == 2, "not a .glb file"
    jl, jt = struct.unpack("<II", d[12:20])
    assert jt == 0x4E4F534A, "JSON chunk missing"
    j = json.loads(d[20:20 + jl])
    rest = d[20 + jl:]
    rgb = [lin(int(COLOUR[i:i + 2], 16)) for i in (1, 3, 5)]
    n = 0
    for m in j.get("materials", []):
        p = m.setdefault("pbrMetallicRoughness", {})
        if "baseColorTexture" in p:
            continue
        f = p.get("baseColorFactor", [1, 1, 1, 1])
        if min(f[:3]) > 0.85:
            p["baseColorFactor"] = rgb + [f[3]]
            p["roughnessFactor"] = ROUGHNESS
            p["metallicFactor"] = 0
            n += 1
    body = json.dumps(j, separators=(",", ":")).encode()
    body += b" " * (-len(body) % 4)
    out = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(body) + len(rest)) + struct.pack("<II", len(body), jt) + body + rest
    open(dst, "wb").write(out)
    print(f"{os.path.basename(src)}: {n} material(s) recoloured -> {dst}")

args = sys.argv[1:]
if not args:
    sys.exit(__doc__)
if len(args) == 2 and not args[0].endswith("*") and args[1].lower().endswith(".glb") and not os.path.isdir(args[1]):
    recolour(args[0], args[1])
else:
    for a in args:
        recolour(a, a[:-4] + ".bone.glb")
