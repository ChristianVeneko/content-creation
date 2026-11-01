// Dev tool: render preview stills of every template from the demo spec (no TTS, synthetic captions).
// Usage: node scripts/preview-stills.mjs <outDir> [templateId...]
import { cpSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderStill, selectComposition } from "@remotion/renderer";
import { ENGINE_ROOT, setupEnv } from "../lib/env.mjs";
import { CHROMIUM_OPTIONS, bundleProject } from "../lib/render.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { getTemplate, listTemplates } from "../lib/templates.mjs";
import { computeTimeline, paginateCaptions, syntheticCaptions } from "../lib/timeline.mjs";

setupEnv();
const out = resolve(process.argv[2] || join(process.env.TMPDIR, "engine-stills"));
const ids = process.argv.slice(3).length ? process.argv.slice(3) : listTemplates().map((t) => t.id);
const demo = JSON.parse(readFileSync(join(ENGINE_ROOT, "examples", "demo.spec.json"), "utf8"));
const pub = join(out, ".public");
mkdirSync(pub, { recursive: true });
cpSync(join(ENGINE_ROOT, "public", "fonts"), join(pub, "fonts"), { recursive: true });
const serveUrl = await bundleProject({ publicDir: pub, outDir: join(out, ".bundle") });

for (const id of ids) {
  const raw = { ...demo, template: id };
  delete raw.theme;
  delete raw.captions;
  const spec = resolveSpec(validateSpec(raw).spec, getTemplate(id));
  spec.scenes = spec.scenes.map((s) => ({ ...s, animation: getTemplate(id).defaults.animation }));
  const timeline = computeTimeline(spec.scenes, { fps: spec.format.fps });
  const captionPages = paginateCaptions(syntheticCaptions(spec.scenes, timeline), spec.captions.wordsPerPage);
  const inputProps = { spec, timeline, captionPages, assets: { narration: null, music: null, visuals: spec.scenes.map(() => null) } };
  const composition = await selectComposition({ serveUrl, id, inputProps, chromiumOptions: CHROMIUM_OPTIONS });
  for (const k of [0, 2]) {
    const sc = timeline.scenes[k];
    const frame = sc.from + Math.min(sc.durationInFrames - 1, 45);
    const file = join(out, `${id}-scene${k + 1}.jpg`);
    await renderStill({ composition, serveUrl, output: file, frame, inputProps, imageFormat: "jpeg", jpegQuality: 85, scale: 0.5, chromiumOptions: CHROMIUM_OPTIONS });
    console.log(file);
  }
}
