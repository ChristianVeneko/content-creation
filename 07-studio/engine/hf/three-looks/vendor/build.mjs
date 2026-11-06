// Bundles three.js (version pinned by the engine's package.json) + post passes into one classic script (global `T`), twice:
// three-bundle.js (default, no loaders) and three-stock.js (adds GLTFLoader, used only with `stock: true`).
// The bundle is made lint-clean for HyperFrames: three's UUID generator uses Math.random (replaced by a fixed-seed LCG, UUIDs never
// reach a pixel) and its animation-loop helper names requestAnimationFrame (renamed; the composition never starts an animation loop).
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
for (const [entry, name] of [["entry.js", "three-bundle.js"], ["entry-stock.js", "three-stock.js"]]) {
  const out = join(here, name);
  await build({ entryPoints: [join(here, entry)], bundle: true, minify: true, format: "iife", globalName: "T", outfile: out, legalComments: "none", target: "chrome120", absWorkingDir: join(here, "..", "..", "..") });
  let js = readFileSync(out, "utf8");
  const before = { rnd: (js.match(/Math\.random\(\)/g) ?? []).length, raf: (js.match(/requestAnimationFrame/g) ?? []).length };
  js = js.replace(/Math\.random\(\)/g, "__tlRnd()").replace(/requestAnimationFrame/g, "requestFrameDisabled").replace(/cancelAnimationFrame/g, "cancelFrameDisabled").replace(/performance\.now\(\)/g, "0");
  js = `var __tlSeed=20260101;function __tlRnd(){__tlSeed=(Math.imul(__tlSeed,1664525)+1013904223)>>>0;return __tlSeed/4294967296}\n${js}`;
  writeFileSync(out, js);
  console.log("ok", name, before);
}
