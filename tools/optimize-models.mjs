/* AnatoMark — model optimiser (balanced preset).
   Run from the project folder, with Node.js 18+ installed:

     node tools/optimize-models.mjs

   Reads every .glb in ./models, writes the optimised copy to ./models-optimized
   (originals are never touched), and prints a before/after table.
   Per file: removes unused data, merges duplicates, resizes textures to 2048 px,
   converts them to WebP, and compresses the geometry with Draco.
   To go smaller for weak phones, run:  node tools/optimize-models.mjs 1024
   Needs internet the first time (npx downloads @gltf-transform/cli). */
import { readdirSync, mkdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const size = String(parseInt(process.argv[2], 10) || 2048);
const src = "models", out = "models-optimized";
if (!existsSync(src)) { console.error("Run this from the project folder (the one that contains /models)."); process.exit(1); }
mkdirSync(out, { recursive: true });
const mb = (f) => (statSync(f).size / 1048576).toFixed(1);
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const files = readdirSync(src).filter((f) => f.toLowerCase().endsWith(".glb"));
if (!files.length) { console.error("No .glb files found in /models."); process.exit(1); }

const rows = [];
for (const f of files) {
  const a = join(src, f), b = join(out, f);
  process.stdout.write(`Optimising ${f} … `);
  try {
    execFileSync(npx, ["--yes", "@gltf-transform/cli", "optimize", a, b,
      "--compress", "draco", "--texture-compress", "webp", "--texture-size", size],
      { stdio: ["ignore", "ignore", "inherit"], shell: process.platform === "win32" });
    rows.push([f, mb(a), mb(b)]);
    console.log("done");
  } catch (e) {
    rows.push([f, mb(a), "FAILED"]);
    console.log("FAILED");
  }
}
console.log("\nFile".padEnd(46) + "Before MB".padStart(11) + "After MB".padStart(11));
for (const [f, x, y] of rows) console.log(f.padEnd(45) + x.padStart(11) + String(y).padStart(11));
console.log("\nCheck a few in the site, then replace the files in /models with the ones in /models-optimized.");
