// Gallery thumbnails for the web studio: for every template in the registry, render one still
// (<id>.jpg, 360x640) and a short muted loop (<id>.mp4, 360x640, ~3.5 s) from that template's example
// spec in examples/ (matched by the spec's `template` field). No TTS: timing is synthetic, like the
// preview-stills tools. Templates without an example spec are skipped with a warning.
//
// Usage: node scripts/make-thumbs.mjs [--only <id>[,<id>...]] [--force] [--out <dir>] [--seconds <n>]
//   (npm run thumbs wraps it in `caffeinate -dimsu` so a long run is not interrupted by sleep)
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { ENGINE_ROOT, setupEnv } from "../lib/env.mjs";
import { CHROMIUM_OPTIONS, bundleProject } from "../lib/render.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { listTemplates } from "../lib/templates.mjs";
import { computeTimeline, paginateCaptions, syntheticCaptions } from "../lib/timeline.mjs";
import { planIllustration, sceneVisibleSec, usesIllustratedKit } from "../lib/illustrated.mjs";
import { collectIconNames, loadIcons } from "../lib/icons.mjs";
import { planThree, usesThreeKit } from "../lib/scene3d.mjs";
import { loadThreeIcons, stageThreeAssets } from "../lib/three-assets.mjs";
import { usesReelsKit } from "../lib/reels.mjs";
import { planPixel, usesPixelKit } from "../lib/pixel.mjs";
import { silentReelsProps } from "../lib/reels-stills.mjs";

const THUMB_W = 360;

export function parseArgs(argv) {
  const opts = { only: null, force: false, out: resolve(ENGINE_ROOT, "..", "web", "public", "thumbs"), seconds: 3.5 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const [flag, inline] = a.split("=");
    const value = () => inline ?? argv[++i];
    if (flag === "--only") opts.only = value().split(",").map((s) => s.trim()).filter(Boolean);
    else if (flag === "--force") opts.force = true;
    else if (flag === "--out") opts.out = resolve(value());
    else if (flag === "--seconds") opts.seconds = Math.min(6, Math.max(1, Number(value()) || 3.5));
    else throw new Error(`Unknown argument ${a}. Usage: make-thumbs.mjs [--only <id>[,<id>]] [--force] [--out <dir>] [--seconds <n>]`);
  }
  return opts;
}

/** template id -> example spec path. A file named <id>.spec.json wins over other examples of that template. */
export function examplesByTemplate(dir = join(ENGINE_ROOT, "examples")) {
  const map = new Map();
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    let template;
    try {
      template = JSON.parse(readFileSync(join(dir, f), "utf8")).template;
    } catch {
      continue;
    }
    if (typeof template !== "string") continue;
    if (!map.has(template) || f === `${template}.spec.json`) map.set(template, join(dir, f));
  }
  return map;
}

/** Input props for a no-audio render of a spec (same planning the build uses, synthetic timing). */
function prepare(specPath, template, pub) {
  const v = validateSpec(JSON.parse(readFileSync(specPath, "utf8")));
  if (!v.ok) throw new Error(`invalid example ${specPath}: ${v.errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`);
  const spec = resolveSpec(v.spec, template);
  const timeline = computeTimeline(spec.scenes.map((s) => ({ audioSec: null, durationSec: s.durationSec, narration: s.narration })), { fps: spec.format.fps });
  const captionPages = spec.captions.enabled || usesPixelKit(spec.template) ? paginateCaptions(syntheticCaptions(spec.scenes, timeline), spec.captions.wordsPerPage) : [];
  let illustration = null;
  let icons = {};
  let three = null;
  if (usesIllustratedKit(spec.template)) {
    illustration = planIllustration(spec, timeline);
    icons = loadIcons(collectIconNames(spec)).icons;
  } else if (usesThreeKit(spec.template)) {
    illustration = planThree(spec, timeline);
    icons = loadThreeIcons(spec).icons;
    three = stageThreeAssets(spec, pub).three;
  } else if (usesPixelKit(spec.template)) {
    illustration = planPixel(spec, timeline);
  }
  const inputProps = { spec, timeline, captionPages, assets: { narration: null, music: null, visuals: spec.scenes.map(() => null), bed: null, avatar: null, three }, illustration, icons };
  return { spec, timeline, inputProps };
}

async function main() {
  setupEnv();
  const opts = parseArgs(process.argv.slice(2));
  const templates = listTemplates();
  const known = new Set(templates.map((t) => t.id));
  for (const id of opts.only ?? []) if (!known.has(id)) throw new Error(`Unknown template "${id}". Available: ${[...known].join(", ")}`);
  const examples = examplesByTemplate();
  mkdirSync(opts.out, { recursive: true });
  const work = join(process.env.TMPDIR, `make-thumbs-${process.pid}`);
  const pub = join(work, "public");
  mkdirSync(pub, { recursive: true });
  cpSync(join(ENGINE_ROOT, "public", "fonts"), join(pub, "fonts"), { recursive: true });

  const jobs = [];
  for (const t of templates) {
    if (opts.only && !opts.only.includes(t.id)) continue;
    const jpg = join(opts.out, `${t.id}.jpg`);
    const mp4 = join(opts.out, `${t.id}.mp4`);
    if (!opts.force && existsSync(jpg) && existsSync(mp4)) {
      console.log(`skip ${t.id}: thumbnails exist (use --force to redo)`);
      continue;
    }
    const example = examples.get(t.id);
    if (!example) {
      console.warn(`warn ${t.id}: no example spec in examples/ for this template; skipped`);
      continue;
    }
    try {
      // Reels plan their scenes from words and stage their own fonts/sounds/textures into the public dir.
      const prepared = usesReelsKit(t.id) ? await silentReelsProps(example, { template: t.id, pub }) : prepare(example, t, pub);
      jobs.push({ id: t.id, jpg, mp4, timeline: prepared.inputProps.timeline, ...prepared });
    } catch (e) {
      console.warn(`warn ${t.id}: ${e.message}; skipped`);
    }
  }
  if (!jobs.length) {
    rmSync(work, { recursive: true, force: true });
    console.log("nothing to render");
    return 0;
  }

  // One bundle for every template (3D assets are staged into the shared public dir first).
  const serveUrl = await bundleProject({ publicDir: pub, outDir: join(work, "bundle") });
  let failed = 0;
  for (const j of jobs) {
    try {
      const fps = j.spec.format.fps;
      const scale = THUMB_W / j.spec.format.width;
      const composition = await selectComposition({ serveUrl, id: j.spec.template, inputProps: j.inputProps, chromiumOptions: CHROMIUM_OPTIONS, logLevel: "error" });
      // Reels share one example, so each style shows a different scene (its hook frames look alike otherwise).
      const REELS_STILL_SCENE = { "reels-nube": 1, "reels-noche": 2, "reels-menta": 3, "reels-limon": 4, "reels-pizarra": 5 };
      const si = Math.min(REELS_STILL_SCENE[j.spec.template] ?? 0, j.timeline.scenes.length - 1);
      const s0 = j.timeline.scenes[si];
      // Still: the chosen scene once its elements have entered (most of its visible time).
      const visible = (usesIllustratedKit(j.spec.template) || usesThreeKit(j.spec.template)) ? sceneVisibleSec(j.timeline, si, fps) * fps : s0.durationInFrames - (j.timeline.transitionFrames ?? 0);
      const stillFrame = Math.max(0, Math.min(j.timeline.totalFrames - 1, s0.from + Math.round(visible * 0.85) - 1));
      const tmpJpg = `${j.jpg}.tmp.jpg`;
      await renderStill({ composition, serveUrl, output: tmpJpg, frame: stillFrame, inputProps: j.inputProps, imageFormat: "jpeg", jpegQuality: 82, scale, chromiumOptions: CHROMIUM_OPTIONS, logLevel: "error" });
      renameSync(tmpJpg, j.jpg);
      // Loop: the opening seconds (hook + first scene), muted.
      const last = Math.min(j.timeline.totalFrames - 1, Math.round(opts.seconds * fps) - 1);
      const tmpMp4 = `${j.mp4}.tmp.mp4`;
      await renderMedia({
        composition,
        serveUrl,
        codec: "h264",
        pixelFormat: "yuv420p",
        crf: 30,
        x264Preset: "slow",
        muted: true,
        frameRange: [0, last],
        scale,
        imageFormat: "jpeg",
        jpegQuality: 80,
        outputLocation: tmpMp4,
        inputProps: j.inputProps,
        chromiumOptions: CHROMIUM_OPTIONS,
        logLevel: "error",
      });
      renameSync(tmpMp4, j.mp4);
      console.log(`ok ${j.id}: ${j.jpg} · ${j.mp4}`);
    } catch (e) {
      failed++;
      console.error(`fail ${j.id}: ${e.message}`);
    }
  }
  rmSync(work, { recursive: true, force: true });
  return failed ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(e.message);
      process.exit(2);
    },
  );
}
