// Dev tool: render stills of an illustrated-kit or 3D spec without TTS (synthetic timing), to iterate on the look quickly.
// Usage: node scripts/illustrated-stills.mjs <spec.json> <outDir> [--at=0.5,0.95] [--scale=0.5] [--scenes=0,2] [--frames=12,90] [--png] [--verbose]
// Writes <outDir>/scene-XX-YY.jpg: one still per scene and requested fraction of the scene
// (or <outDir>/frame-NNNN.(jpg|png) with --frames). 3D templates render with gl=angle and their local CC0 assets.
import { cpSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderStill, selectComposition } from "@remotion/renderer";
import { ENGINE_ROOT, setupEnv } from "../lib/env.mjs";
import { CHROMIUM_OPTIONS, bundleProject } from "../lib/render.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { getTemplate } from "../lib/templates.mjs";
import { computeTimeline, paginateCaptions, syntheticCaptions } from "../lib/timeline.mjs";
import { planIllustration, sceneVisibleSec } from "../lib/illustrated.mjs";
import { collectIconNames, loadIcons } from "../lib/icons.mjs";
import { planThree, usesThreeKit } from "../lib/scene3d.mjs";
import { loadThreeIcons, stageThreeAssets } from "../lib/three-assets.mjs";

setupEnv();
const [specPath, outArg, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map((a) => a.replace(/^--/, "").split("=")));
const fractions = (opt.at ?? "0.45,0.97").split(",").map(Number);
const scale = Number(opt.scale ?? 0.5);
const fmt = "png" in opt ? "png" : "jpeg";
const ext = fmt === "png" ? "png" : "jpg";
const out = resolve(outArg);
const v = validateSpec(JSON.parse(readFileSync(specPath, "utf8")));
if (!v.ok) throw new Error(JSON.stringify(v.errors));
const spec = resolveSpec(v.spec, getTemplate(v.spec.template));
const timeline = computeTimeline(spec.scenes, { fps: spec.format.fps });
const captionPages = paginateCaptions(syntheticCaptions(spec.scenes, timeline), spec.captions.wordsPerPage);
const pub = join(out, ".public");
mkdirSync(pub, { recursive: true });
cpSync(join(ENGINE_ROOT, "public", "fonts"), join(pub, "fonts"), { recursive: true });
const is3d = usesThreeKit(spec.template);
const { icons } = is3d ? loadThreeIcons(spec) : loadIcons(collectIconNames(spec));
const three = is3d ? stageThreeAssets(spec, pub).three : null;
const illustration = is3d ? planThree(spec, timeline) : planIllustration(spec, timeline);
const inputProps = { spec, timeline, captionPages, assets: { narration: null, music: null, visuals: spec.scenes.map(() => null), three }, illustration, icons };
const serveUrl = await bundleProject({ publicDir: pub, outDir: join(out, ".bundle") });
const composition = await selectComposition({ serveUrl, id: spec.template, inputProps, chromiumOptions: CHROMIUM_OPTIONS });
const still = async (frame, file) => {
  await renderStill({ composition, serveUrl, output: file, frame, inputProps, imageFormat: fmt, jpegQuality: 85, scale, chromiumOptions: CHROMIUM_OPTIONS, logLevel: "verbose" in opt ? "verbose" : "info" });
  console.log(file);
};
if (opt.frames) {
  for (const f of opt.frames.split(",").map(Number)) await still(Math.min(timeline.totalFrames - 1, f), join(out, `frame-${String(f).padStart(4, "0")}.${ext}`));
} else {
  const only = opt.scenes ? opt.scenes.split(",").map(Number) : spec.scenes.map((_, i) => i);
  for (const i of only) {
    const sc = timeline.scenes[i];
    const vis = sceneVisibleSec(timeline, i, spec.format.fps) * spec.format.fps;
    for (const f of fractions) {
      const frame = Math.min(timeline.totalFrames - 1, sc.from + Math.round(vis * f) - 1);
      await still(frame, join(out, `scene-${String(i + 1).padStart(2, "0")}-${String(Math.round(f * 100)).padStart(2, "0")}.${ext}`));
    }
  }
}
