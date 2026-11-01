// Reels dev tool and `cover` command: render stills, a contact sheet and the cover without TTS (text-timed words).
// Usage:
//   node lib/reels-stills.mjs <spec.json> <outDir> [--template=reels-pizarra] [--at=0.5,0.97] [--scale=0.5]
//                             [--scenes=0,2] [--frames=12,90] [--sheet] [--cover] [--no-stills]
// Writes <outDir>/scene-XX-YY.jpg (one per scene and fraction of the scene), frame-NNNN.jpg with --frames,
// sheet.png with --sheet (middle, each moment, each word-timed fx hit and the end of every scene), cover.jpg +
// cover-check.png with --cover. Prints planner warnings and each scene's resolved drawing / fx moments.
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderStill, selectComposition } from "@remotion/renderer";
import { setupEnv } from "./env.mjs";
import { run } from "./media.mjs";
import { CHROMIUM_OPTIONS, bundleProject } from "./render.mjs";
import { computeReelsTimeline, usesReelsKit } from "./reels.mjs";
import { prepareReels, renderReelsCover } from "./reels-build.mjs";

/** Validate + resolve a reels spec and build the silent input props (no TTS, text-timed words). */
export async function silentReelsProps(specPath, { template, pub }) {
  const { validateSpec, resolveSpec } = await import("./spec.mjs");
  const { getTemplate } = await import("./templates.mjs");
  const { resolveAssetPath } = await import("./build.mjs");
  const raw = JSON.parse(readFileSync(specPath, "utf8"));
  if (template) {
    raw.template = template;
    delete raw.theme;
  }
  const v = validateSpec(raw);
  if (!v.ok) throw new Error(`Invalid spec: ${v.errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`);
  if (!usesReelsKit(v.spec.template)) throw new Error(`"${v.spec.template}" is not a reels template (reels-nube, reels-noche, reels-menta, reels-limon, reels-pizarra)`);
  const spec = resolveSpec(v.spec, getTemplate(v.spec.template));
  const timeline = computeReelsTimeline(spec.scenes, { fps: spec.format.fps });
  const specDir = dirname(resolve(specPath));
  const prep = prepareReels({ spec, timeline, captions: [], pub, job: "job", resolveAsset: (p) => resolveAssetPath(p, specDir) });
  const inputProps = { spec, timeline, captionPages: [], assets: { narration: null, music: null, visuals: spec.scenes.map(() => null) }, illustration: null, icons: prep.icons, reels: prep.reels };
  return { spec, inputProps, prep };
}

/** `node cli.mjs cover <spec.json> --out <dir>`: cover.jpg + cover-check.png only. */
export async function coverOnly({ specPath, outDir, log = () => {} }) {
  setupEnv();
  outDir = resolve(outDir);
  const work = join(outDir, ".work-cover");
  const pub = join(work, "public");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(pub, { recursive: true });
  const { inputProps, prep } = await silentReelsProps(specPath, { pub });
  for (const m of [...prep.missingImages, ...prep.missingIcons]) log(`not found: ${m}`);
  const serveUrl = await bundleProject({ publicDir: pub, outDir: join(work, "bundle") });
  const out = await renderReelsCover({ serveUrl, inputProps, outDir });
  rmSync(work, { recursive: true, force: true });
  return out;
}

async function main() {
  setupEnv();
  const [specPath, outArg, ...rest] = process.argv.slice(2);
  if (!specPath || !outArg) {
    console.error("Usage: node lib/reels-stills.mjs <spec.json> <outDir> [--template=reels-x] [--at=0.5,0.97] [--scale=0.5] [--scenes=0,2] [--frames=12,90] [--sheet] [--cover] [--no-stills]");
    process.exit(2);
  }
  const opt = Object.fromEntries(rest.map((a) => a.replace(/^--/, "").split("=")));
  const out = resolve(outArg);
  const pub = join(out, ".public");
  mkdirSync(pub, { recursive: true });
  const { spec, inputProps, prep } = await silentReelsProps(specPath, { template: opt.template, pub });
  for (const w of prep.reels.warnings) console.log(`warning: ${w}`);
  prep.reels.scenes.forEach((s, i) => {
    if (s.momentos) console.log(`scene ${i + 1} (${s.type}) moments: ${Object.entries(s.momentos).map(([m, sec]) => `${m}=${sec}s`).join(", ")}`);
  });
  for (const m of [...prep.missingImages, ...prep.missingIcons]) console.log(`not found: ${m}`);
  const serveUrl = await bundleProject({ publicDir: pub, outDir: join(out, ".bundle") });
  const composition = await selectComposition({ serveUrl, id: spec.template, inputProps, chromiumOptions: CHROMIUM_OPTIONS, logLevel: "error" });
  const scale = Number(opt.scale ?? 0.5);
  const still = async (frame, file, s = scale) => {
    await renderStill({ composition, serveUrl, output: file, frame: Math.max(0, Math.min(composition.durationInFrames - 1, frame)), inputProps, imageFormat: file.endsWith(".png") ? "png" : "jpeg", jpegQuality: 85, scale: s, chromiumOptions: CHROMIUM_OPTIONS, logLevel: "error" });
    console.log(file);
  };
  const scenes = prep.reels.scenes;
  if (opt.frames) {
    for (const f of opt.frames.split(",").map(Number)) await still(f, join(out, `frame-${String(f).padStart(4, "0")}.jpg`));
  } else if (!("no-stills" in opt)) {
    const only = opt.scenes ? opt.scenes.split(",").map(Number) : scenes.map((_, i) => i);
    const fractions = (opt.at ?? "0.5,0.97").split(",").map(Number);
    for (const i of only) {
      const s = scenes[i];
      // sample the scene's own window (its cut to 6 frames before the next cut), outside any crossfade
      const end = i + 1 < scenes.length ? scenes[i + 1].cut - 6 : s.fin - 2;
      for (const f of fractions) await still(s.cut + Math.round((end - s.cut) * f), join(out, `scene-${String(i + 1).padStart(2, "0")}-${String(Math.round(f * 100)).padStart(2, "0")}.jpg`));
    }
  }
  if ("sheet" in opt) {
    // contact sheet: middle, each moment (+8 frames), each fx hit on a word (+6 frames) and the end of every scene, 6 per row
    const dir = join(out, ".sheet");
    mkdirSync(dir, { recursive: true });
    let k = 0;
    for (const s of scenes) {
      const hits = (s.fx ?? []).filter((f) => typeof f.at === "string" && s.momentos?.[f.at] !== undefined).map((f) => s.ini + Math.round(s.momentos[f.at] * 30) + 6).filter((f) => f < s.ini + s.dur - 2);
      const frames = [s.ini + Math.round(s.dur / 2), ...s.b.map((b) => s.ini + b + 8), ...hits, s.ini + s.dur - 2].filter((f, j, a) => a.indexOf(f) === j).sort((a, b) => a - b);
      for (const f of frames) await still(f, join(dir, `t-${String(k++).padStart(3, "0")}.jpg`), 0.25);
    }
    const rows = Math.ceil(k / 6);
    await run("ffmpeg", ["-y", "-v", "error", "-framerate", "1", "-i", join(dir, "t-%03d.jpg"), "-vf", `tile=6x${rows}:padding=6:color=0x161616`, "-frames:v", "1", join(out, "sheet.png")]);
    rmSync(dir, { recursive: true, force: true });
    console.log(join(out, "sheet.png"));
  }
  if ("cover" in opt) {
    const r = await renderReelsCover({ serveUrl, inputProps, outDir: out });
    console.log(r.cover);
    console.log(r.check);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
