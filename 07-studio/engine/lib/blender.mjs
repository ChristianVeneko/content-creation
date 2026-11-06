// The Blender route of a 3D build: write the job (lib/blender-job.mjs), run Blender headless on
// scripts/blender/scene.py (Eevee, PNG frames), then encode with ffmpeg together with the narration / audio bed and the
// ASS layer (lib/blender-captions.mjs). Every Blender problem (missing binary, crash, timeout, missing frames) throws a
// BlenderError; lib/build.mjs then falls back to the Remotion renderer with a warning.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CC_ROOT, ENGINE_ROOT } from "./env.mjs";
import { run } from "./media.mjs";
import { blenderJob } from "./blender-job.mjs";
import { buildAss } from "./blender-captions.mjs";

export const SCENE_PY = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "blender", "scene.py");
export class BlenderError extends Error {}

/** The Blender executable: an explicit path, else $BLENDER_BIN, else 05-tools/bin/blender or 05-tools/apps/Blender.app on this disk. */
export function findBlender(explicit) {
  const candidates = explicit !== undefined ? [explicit] : [process.env.BLENDER_BIN, join(CC_ROOT, "05-tools", "bin", "blender"), join(CC_ROOT, "05-tools", "apps", "Blender.app", "Contents", "MacOS", "Blender")];
  return candidates.find((p) => p && existsSync(p)) ?? null;
}

/** Number of PNG frames in a folder. */
export const countFrames = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")).length : 0);

/** Escape a path for an ffmpeg filter argument. */
export const filterPath = (p) => p.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/:/g, "\\:");

/**
 * Run Blender over a job file. Resolves {seconds, perFrame, warnings}.
 * @param {{jobFile: string, framesDir: string, totalFrames: number, blender?: string, timeoutSec?: number, log?: (msg: string, progress: number) => void}} a
 */
export async function runBlender({ jobFile, framesDir, totalFrames, blender, timeoutSec, log = () => {} }) {
  const bin = findBlender(blender);
  if (!bin) throw new BlenderError(`Blender not found${blender ? ` at ${blender}` : " (set BLENDER_BIN, or install it in 05-tools/apps/Blender.app)"}`);
  mkdirSync(framesDir, { recursive: true });
  const limit = timeoutSec ?? 300 + totalFrames * 12;
  const cache = process.env.CC_CACHE || join(CC_ROOT, "05-tools", "cache");
  const env = { ...process.env, BLENDER_USER_RESOURCES: process.env.BLENDER_USER_RESOURCES || join(cache, "blender") };
  mkdirSync(env.BLENDER_USER_RESOURCES, { recursive: true });
  const t0 = Date.now();
  const warnings = [];
  const tail = [];
  await new Promise((res, rej) => {
    let child;
    try {
      child = spawn(bin, ["-b", "--factory-startup", "-noaudio", "-P", SCENE_PY, "--", jobFile, framesDir], { env, stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      rej(new BlenderError(`cannot start Blender: ${e.message}`));
      return;
    }
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      rej(new BlenderError(`Blender timed out after ${limit}s`));
    }, limit * 1000);
    let done = 0;
    let buf = "";
    const onData = (d) => {
      buf += d.toString();
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        tail.push(line);
        if (tail.length > 30) tail.shift();
        if (/^BLENDER_FRAME /.test(line)) {
          done++;
          if (done % 15 === 0 || done === totalFrames) log(`Blender ${done}/${totalFrames} frames`, done / totalFrames);
        } else if (line.startsWith("BLENDER_WARN ")) warnings.push(line.slice(13));
        else if (line.startsWith("BLENDER_SCENE ")) log(line.replace("BLENDER_SCENE ", "Blender scene "), done / totalFrames);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", (e) => {
      clearTimeout(timer);
      rej(new BlenderError(`cannot start Blender: ${e.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) res();
      else rej(new BlenderError(`Blender exited with code ${code}: ${tail.filter((l) => /Error|Traceback/.test(l)).slice(-3).join(" | ") || tail.slice(-3).join(" | ")}`));
    });
  });
  const seconds = (Date.now() - t0) / 1000;
  const have = countFrames(framesDir);
  if (have < totalFrames) throw new BlenderError(`incomplete render: ${have}/${totalFrames} frames`);
  return { seconds, perFrame: seconds / Math.max(1, totalFrames), warnings };
}

let libassCache = null;
/** Whether the ffmpeg on PATH can burn ASS subtitles (libass). */
export async function ffmpegHasLibass() {
  if (libassCache === null) {
    try {
      const { stdout } = await run("ffmpeg", ["-hide_banner", "-filters"]);
      libassCache = /\sass\s/.test(stdout);
    } catch {
      libassCache = false;
    }
  }
  return libassCache;
}

/**
 * Encode the frames with the audio and the ASS layer into `out` (H.264 yuv420p, AAC).
 * @param {{framesDir: string, fps: number, totalSec: number, ass?: string | null, audio: {narration?: string, bed?: string, music?: string, musicVolume?: number}, out: string}} a
 */
export async function encodeFrames({ framesDir, fps, totalSec, ass, audio, out }) {
  const args = ["-y", "-v", "error", "-framerate", String(fps), "-i", join(framesDir, "%05d.png")];
  const labels = [];
  const chain = [];
  const addAudio = (file, vol, loop) => {
    if (loop) args.push("-stream_loop", "-1");
    args.push("-i", file);
    const idx = labels.length + 1;
    chain.push(`[${idx}:a]volume=${vol}[a${idx}]`);
    labels.push(`[a${idx}]`);
  };
  if (audio.narration) addAudio(audio.narration, 1, false);
  if (audio.bed) addAudio(audio.bed, 1, false);
  if (audio.music && !audio.bed) addAudio(audio.music, audio.musicVolume ?? 0.12, true);
  const vf = ass ? `ass=filename='${filterPath(ass)}':fontsdir='${filterPath(join(ENGINE_ROOT, "public", "fonts"))}'` : "null";
  const norm = "loudnorm=I=-14:TP=-1.5:LRA=11";
  const mixed = labels.length > 1 ? `${labels.join("")}amix=inputs=${labels.length}:normalize=0:duration=longest,${norm}[am]` : labels.length ? `${labels[0]}${norm}[am]` : null;
  const filters = [`[0:v]${vf}[v]`, ...chain, ...(mixed ? [mixed] : [])];
  args.push("-filter_complex", filters.join(";"), "-map", "[v]");
  if (labels.length) args.push("-map", "[am]", "-ar", "48000", "-c:a", "aac", "-b:a", "320k");
  args.push("-t", totalSec.toFixed(3), "-r", String(fps), "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out);
  await run("ffmpeg", args);
}

/**
 * Whole Blender route: job -> frames -> ASS layer -> encoded video.
 * @param {{spec: object, timeline: object, plans: object[], captionPages: object[], models?: Record<string, string>, pubDir: string, work: string, audio: object, out: string, log?: (msg: string, progress: number) => void}} a
 * @returns {Promise<{seconds: number, perFrame: number, frames: number, warnings: string[], captionsBurned: boolean}>}
 */
export async function renderBlenderVideo({ spec, timeline, plans, captionPages, models = {}, pubDir, work, audio, out, log = () => {} }) {
  const scale = Number(process.env.BLENDER_SCALE) > 0 ? Number(process.env.BLENDER_SCALE) : 100;
  const job = blenderJob({ spec, timeline, plans, models, pubDir, fontPath: join(ENGINE_ROOT, "public", "fonts", "PressStart2P-Regular.ttf"), scale });
  const dir = join(work, "blender");
  mkdirSync(dir, { recursive: true });
  const jobFile = join(dir, "job.json");
  writeFileSync(jobFile, JSON.stringify(job));
  for (const w of job.warnings) log(`Blender: ${w}`, 0);
  const framesDir = join(dir, "frames");
  const r = await runBlender({ jobFile, framesDir, totalFrames: timeline.totalFrames, log });
  for (const w of r.warnings) log(`Blender: ${w}`, 1);
  const wantAss = spec.captions.enabled || spec.scenes.some((s) => s.title?.main || s.onScreenText || (s.visual?.objects ?? []).some((o) => o.label));
  const libass = wantAss ? await ffmpegHasLibass() : false;
  if (wantAss && !libass) log("Blender: this ffmpeg lacks libass, so captions, headlines and labels are not burned in (put an ffmpeg with libass in 05-tools/bin)", 1);
  let ass = null;
  if (libass) {
    ass = join(dir, "layer.ass");
    writeFileSync(ass, buildAss({ spec, timeline, captionPages, job }));
  }
  await encodeFrames({ framesDir, fps: spec.format.fps, totalSec: timeline.totalFrames / spec.format.fps, ass, audio, out });
  return { ...r, frames: timeline.totalFrames, warnings: [...job.warnings, ...r.warnings], captionsBurned: Boolean(ass) };
}
