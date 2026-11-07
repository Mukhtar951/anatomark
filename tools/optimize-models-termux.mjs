/* AnatoMark - model optimiser for TERMUX (Android) and any machine without "sharp".
   Draco geometry compression + WebP textures resized with Python Pillow.

   Setup (once, in Termux):
     pkg update && pkg install -y nodejs python python-pillow
     mkdir -p ~/anato-tools && cd ~/anato-tools
     npm init -y
     npm install @gltf-transform/core @gltf-transform/extensions draco3dgltf
     (copy this file here)

   Run:
     node optimize-models-termux.mjs <folder-with-glb> <output-folder> [textureSize]
     e.g. node optimize-models-termux.mjs ~/storage/downloads/models ~/storage/downloads/models-opt 2048

   Big files need memory:  NODE_OPTIONS=--max-old-space-size=3072 node optimize-models-termux.mjs ...
   Originals are never touched. One file at a time, a failure on one file does not stop the rest. */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRDracoMeshCompression, EXTTextureWebP } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { readdirSync, mkdirSync, statSync, existsSync, writeFileSync, readFileSync, rmSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [inDir, outDir, sizeArg] = process.argv.slice(2);
if (!inDir || !outDir) { console.error("Usage: node optimize-models-termux.mjs <input-folder> <output-folder> [textureSize=2048]"); process.exit(1); }
const MAX = parseInt(sizeArg, 10) || 2048;
mkdirSync(outDir, { recursive: true });
const mb = (f) => (statSync(f).size / 1048576).toFixed(1);

// Is Pillow available? (textures are skipped, with a warning, if not)
let pillow = true;
try { execFileSync("python3", ["-c", "import PIL"], { stdio: "ignore" }); } catch { pillow = false; console.warn("! Pillow not found: textures will be left as they are. Run: pkg install python-pillow"); }

const PY = `
import sys
from PIL import Image
src, dst, mx = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src)
im.load()
if max(im.size) > mx:
    im.thumbnail((mx, mx), Image.LANCZOS)
if im.mode not in ("RGB", "RGBA"):
    im = im.convert("RGBA" if "A" in im.getbands() or im.mode == "P" else "RGB")
im.save(dst, "WEBP", quality=85, method=4)
`;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "draco3d.decoder": await draco3d.createDecoderModule(),
  "draco3d.encoder": await draco3d.createEncoderModule(),
});

function recompressTextures(doc) {
  if (!pillow) return 0;
  const textures = doc.getRoot().listTextures();
  if (!textures.length) return 0;
  const tmp = mkdtempSync(join(tmpdir(), "anato-"));
  let n = 0;
  try {
    writeFileSync(join(tmp, "c.py"), PY);
    textures.forEach((t, i) => {
      const img = t.getImage();
      if (!img) return;
      const a = join(tmp, `in${i}`), b = join(tmp, `out${i}.webp`);
      writeFileSync(a, img);
      execFileSync("python3", [join(tmp, "c.py"), a, b, String(MAX)], { stdio: "inherit" });
      const out = readFileSync(b);
      if (out.length < img.length) { t.setImage(new Uint8Array(out)).setMimeType("image/webp"); n++; }
    });
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  if (n) doc.createExtension(EXTTextureWebP).setRequired(true);
  return n;
}

const files = readdirSync(inDir).filter((f) => f.toLowerCase().endsWith(".glb"));
if (!files.length) { console.error("No .glb files in", inDir); process.exit(1); }

const rows = [];
for (const f of files) {
  const src = join(inDir, f), dst = join(outDir, f);
  process.stdout.write(`${f} (${mb(src)} MB) ... `);
  try {
    const doc = await io.read(src);
    const tex = recompressTextures(doc);
    const existing = doc.getRoot().listExtensionsUsed().find((e) => e.extensionName === "KHR_draco_mesh_compression");
    const ext = existing || doc.createExtension(KHRDracoMeshCompression);
    ext.setRequired(true).setEncoderOptions({
      method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
      encodeSpeed: 5, decodeSpeed: 5,
      quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeColor: 8, quantizeGeneric: 12,
    });
    await io.write(dst, doc);
    rows.push([f, mb(src), mb(dst), tex]);
    console.log(`done -> ${mb(dst)} MB (${tex} texture(s) recompressed)`);
  } catch (e) {
    rows.push([f, mb(src), "FAILED", 0]);
    console.log("FAILED:", e.message);
  }
}
console.log("\n" + "File".padEnd(44) + "Before MB".padStart(11) + "After MB".padStart(11));
for (const [f, a, b] of rows) console.log(f.padEnd(44) + String(a).padStart(11) + String(b).padStart(11));
