// 2D dev tool: render stills and a contact sheet of an illustrated-kit or classic spec without TTS (text-timed words),
// with the real plan (layout, word moments of drawings and fx), so an agent can look at its drawings and effects and
// iterate. Mirrors lib/pixel-stills.mjs.
// Usage:
//   node lib/illustrated-stills.mjs <spec.json> <outDir> [--at=0.35,0.8] [--times=0:1.2,3:2.4] [--scenes=0,2] [--scale=0.5] [--look=watercolor] [--sheet]
// Writes <outDir>/scene-XX-YY.jpg (scene XX at fraction YY of the scene), time-XX-S.jpg for --times (scene:seconds,
// handy to check an effect on a word moment; the moments are printed), and sheet.png with --sheet. --look renders an
// illustrated-kit spec in another look (theme.look) without editing the file.
import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderStill, selectComposition } from "@remotion/renderer";
import { ENGINE_ROOT, setupEnv } from "./env.mjs";
import { run } from "./media.mjs";
import { CHROMIUM_OPTIONS, bundleProject } from "./render.mjs";
import { planIllustration, usesIllustratedKit } from "./illustrated.mjs";
import { planDrawings } from "./drawing.mjs";
import { collectIconNames, loadIcons } from "./icons.mjs";

export async function renderIllustratedStills(specPath, outDir, { at = [0.35, 0.8], times = [], scenes = null, scale = 0.5, sheet = false, look = null } = {}) {
  setupEnv();
  const { validateSpec, resolveSpec, usesClassicLayout } = await import("./spec.mjs");
  const { getTemplate } = await import("./templates.mjs");
  const { computeTimeline, paginateCaptions, syntheticCaptions } = await import("./timeline.mjs");
  const raw = JSON.parse(readFileSync(specPath, "utf8"));
  if (look) raw.theme = { ...(raw.theme ?? {}), look };
  const v = validateSpec(raw);
  if (!v.ok) throw new Error(`Invalid spec: ${v.errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`);
  const kit = usesIllustratedKit(v.spec.template);
  if (!kit && !usesClassicLayout(v.spec.template)) throw new Error(`"${v.spec.template}" is not an illustrated-kit or classic template`);
  const spec = resolveSpec(v.spec, getTemplate(v.spec.template));
  const fps = spec.format.fps;
  const timeline = computeTimeline(spec.scenes, { fps });
  const words = syntheticCaptions(spec.scenes, timeline);
  const illustration = kit ? planIllustration(spec, timeline, words) : planDrawings(spec, timeline, words);
  const { icons } = kit ? loadIcons(collectIconNames(spec)) : { icons: {} };
  const out = resolve(outDir);
  const pub = join(out, ".public");
  mkdirSync(pub, { recursive: true });
  cpSync(join(ENGINE_ROOT, "public", "fonts"), join(pub, "fonts"), { recursive: true });
  const serveUrl = await bundleProject({ publicDir: pub, outDir: join(out, ".bundle") });
  const inputProps = { spec, timeline, captionPages: paginateCaptions(words, spec.captions.wordsPerPage), assets: { narration: null, music: null, visuals: spec.scenes.map(() => null) }, illustration, icons };
  const composition = await selectComposition({ serveUrl, id: spec.template, inputProps, chromiumOptions: CHROMIUM_OPTIONS });
  const files = [];
  const shoot = async (frame, name) => {
    const file = join(out, name);
    await renderStill({ composition, serveUrl, output: file, frame, inputProps, imageFormat: "jpeg", jpegQuality: 88, scale, chromiumOptions: CHROMIUM_OPTIONS });
    files.push(file);
    console.log(file);
  };
  const pad = (n) => String(n).padStart(2, "0");
  for (const [k, sc] of timeline.scenes.entries()) {
    if (scenes && !scenes.includes(k)) continue;
    for (const f of at) await shoot(sc.from + Math.min(sc.durationInFrames - 1, Math.round(f * sc.durationInFrames)), `scene-${pad(k + 1)}-${pad(Math.round(f * 100))}.jpg`);
  }
  for (const [k, sec] of times) {
    const sc = timeline.scenes[k];
    if (sc) await shoot(sc.from + Math.min(sc.durationInFrames - 1, Math.round(sec * fps)), `time-${pad(k + 1)}-${sec}.jpg`);
  }
  console.log(`moments (seconds into each scene): ${JSON.stringify((illustration ?? []).map((p) => p?.moments ?? null))}`);
  for (const [k, p] of (illustration ?? []).entries()) for (const w of p?.warnings ?? []) console.log(`scene ${k + 1}: ${w}`);
  if (sheet && files.length) {
    const dir = join(out, ".sheet");
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    files.forEach((f, i) => cpSync(f, join(dir, `t-${String(i).padStart(3, "0")}.jpg`)));
    const cols = Math.min(6, files.length);
    await run("ffmpeg", ["-y", "-v", "error", "-framerate", "1", "-i", join(dir, "t-%03d.jpg"), "-vf", `scale=360:-2,tile=${cols}x${Math.ceil(files.length / cols)}:padding=6:color=0x161616`, "-frames:v", "1", join(out, "sheet.png")]);
    console.log(join(out, "sheet.png"));
  }
  return files;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [specPath, outDir, ...rest] = process.argv.slice(2);
  if (!specPath || !outDir) {
    console.error("Usage: node lib/illustrated-stills.mjs <spec.json> <outDir> [--at=0.35,0.8] [--times=0:1.2,3:2.4] [--scenes=0,2] [--scale=0.5] [--look=<look>] [--sheet]");
    process.exit(1);
  }
  const opt = Object.fromEntries(rest.map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? ""]));
  const nums = (s) => s.split(",").filter(Boolean).map(Number);
  await renderIllustratedStills(specPath, outDir, {
    at: opt.at ? nums(opt.at) : undefined,
    times: opt.times ? opt.times.split(",").map((p) => p.split(":").map(Number)) : [],
    scenes: opt.scenes ? nums(opt.scenes) : null,
    scale: opt.scale ? Number(opt.scale) : 0.5,
    look: opt.look || null,
    sheet: "sheet" in opt,
  });
}
