// The HyperFrames build route (formats in hf/<id>/index.mjs): validate -> tts -> word timings -> compose -> render
// -> audio mix (voice + music + SFX, -14 LUFS) -> cover. Same steps and --json-logs events as the Remotion route.
//
// CAPTION OWNERSHIP: a HyperFrames composition draws its OWN captions (variable `captions`). This route never imports
// or calls lib/captions.mjs, the Remotion renderer, the Blender caption layer or any ffmpeg filter on the video:
// the final mux copies the video stream. `captions.enabled=false` renders the composition with captions off.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { isAbsolute, join, relative, resolve } from "node:path";
import { getHfFormat, parseHfPayload } from "../hf/registry.mjs";
import { CC_ROOT, PYTHON, TRANSCRIBE_PY } from "./env.mjs";
import { SFX_KIT, SR, analyzeSound, activeLoudness, buildBed, decode, loadKit, mixInto, musicGainDb, speechIntervals, windowRms, writeWav } from "./audio-bed.mjs";
import { scheduleSfx } from "./illustrated.mjs";
import { mixAtOffsets, normalizeSpeech, run } from "./media.mjs";
import { musicDuckedLevelDb, musicLevelDb, resolveMusic } from "./music.mjs";
import { FORMAT_MOODS as FORMAT_MOOD_IDS } from "./spec.mjs";
import { alignToScript, computeTimeline, syntheticCaptions } from "./timeline.mjs";
import { effectiveProvider, synthesize } from "./tts.mjs";
import { pickVoice, trendingVoices } from "./voices.mjs";

/** Build-log lines for the warnings a format's compose() returned (de-duplicated, at most 10 shown). */
export function composeWarningLines(warnings) {
  const list = [...new Set((Array.isArray(warnings) ? warnings : []).map(String))];
  const lines = list.slice(0, 10).map((w) => `Compose warning: ${w}`);
  if (list.length > 10) lines.push(`Compose warning: ${list.length - 10} more not shown`);
  return lines;
}

/** The composition entry as a path relative to outDir (a module may return it relative or absolute); null when it is missing or outside outDir. */
export function resolveHfEntry(outDir, entry) {
  if (typeof entry !== "string" || !entry) return null;
  const rel = isAbsolute(entry) ? relative(outDir, entry) : entry;
  const abs = resolve(outDir, rel);
  const inside = relative(outDir, abs);
  if (!inside || inside.startsWith("..") || isAbsolute(inside)) return null;
  return existsSync(abs) ? inside : null;
}

/** The one place the HyperFrames CLI version is pinned. */
export const HYPERFRAMES_VERSION = "0.9.6";
export const HF_QUALITIES = ["draft", "looks", "delivery"];
export const DEFAULT_HF_QUALITY = "looks";
/** Engine property: HyperFrames formats own their captions; the engine's caption overlay is never applied. */
export const HF_OWNS_CAPTIONS = true;
export const LOUDNESS = { I: -14, TP: -1.5, LRA: 11 };

/** Module SFX kinds -> engine SFX kit kinds (03-assets/sfx). A kind that is a path under 03-assets/sfx is used as a file. */
export const HF_SFX_ALIASES = {
  whoosh: "cut", swoosh: "cut", slide: "cut", wipe: "cut", transition: "cut", cut: "cut",
  pop: "pop", blip: "pop", bubble: "pop", appear: "pop",
  tick: "tick", click: "tick", beep: "tick",
  type: "type", key: "type", keyboard: "type",
  hit: "stamp", thud: "stamp", slam: "stamp", impact: "stamp", stamp: "stamp", crack: "stamp", slash: "stamp", burst: "stamp", buzz: "stamp",
  ding: "ding", ping: "ding", coin: "ding", bell: "ding", success: "ding",
  page: "page", flip: "page",
  draw: "draw", whip: "draw", title: "title",
};

const r3 = (n) => Math.round(n * 1000) / 1000;

/** Arguments of `npx hyperframes render` for one pass (captions on or off through the `captions` variable). */
export function hyperframesRenderArgs({ dir, output, quality = DEFAULT_HF_QUALITY, captions, entry = "index.html" }) {
  const args = ["-y", `hyperframes@${HYPERFRAMES_VERSION}`, "render", "--quality", quality, "--variables", JSON.stringify({ captions: Boolean(captions) }), "-o", output];
  if (entry && entry !== "index.html") args.push("-c", entry);
  args.push(dir);
  return args;
}

/** Final mux: the rendered video stream is copied untouched (no caption burn-in, no filters) next to the mixed audio. */
export function muxArgs({ video, audio, out }) {
  return ["-y", "-v", "error", "-i", video, "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", "-shortest", "-movflags", "+faststart", out];
}

/** Environment of the HyperFrames child: every cache stays inside the repo. */
export function hfEnv(base = process.env) {
  const cache = base.CC_CACHE || join(CC_ROOT, "05-tools", "cache");
  return { ...base, HYPERFRAMES_CACHE_DIR: base.HYPERFRAMES_CACHE_DIR || join(cache, "hyperframes"), HYPERFRAMES_FONT_CACHE_DIR: base.HYPERFRAMES_FONT_CACHE_DIR || join(cache, "hyperframes", "fonts") };
}

/** Run `npx hyperframes render`; progress (0-1) is parsed from the CLI's percentage lines. */
export function renderHyperframes({ dir, output, quality, captions, entry, onProgress = () => {} }) {
  return new Promise((resolvePromise, reject) => {
    const p = spawn("npx", hyperframesRenderArgs({ dir, output, quality, captions, entry }), { env: hfEnv(), cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
    let tail = "";
    const onData = (d) => {
      const text = String(d);
      tail = (tail + text).slice(-2000);
      const m = [...text.matchAll(/(\d{1,3})\s?%/g)].pop();
      if (m) onProgress(Math.min(1, Number(m[1]) / 100));
    };
    p.stdout.on("data", onData);
    p.stderr.on("data", onData);
    p.on("error", (e) => reject(new Error(`npx hyperframes could not start: ${e.message}`)));
    p.on("close", (code) => (code === 0 && existsSync(output) ? resolvePromise() : reject(new Error(`hyperframes render failed (exit ${code}): ${tail.trim().split("\n").slice(-6).join(" | ")}`))));
  });
}

/** Word timings of the narration with the engine's existing path: mlx-whisper (large-v3-turbo) through 02-scripts/transcribe.py. */
export async function transcribeNarration(file, language) {
  await run(PYTHON(), [TRANSCRIBE_PY(), file, "--lang", language.slice(0, 2)]);
  const captions = JSON.parse(readFileSync(file.replace(/\.wav$/, ".json"), "utf8"));
  if (!captions.length) throw new Error("no words recognized");
  return captions;
}

/** Caption[] (ms) -> [{text, start, end}] seconds, monotonic. */
export function toWords(captions) {
  let last = 0;
  return captions.map((c) => {
    const start = Math.max(last, c.startMs / 1000);
    const end = Math.max(start, c.endMs / 1000);
    last = start;
    return { text: c.text.trim(), start: r3(start), end: r3(end) };
  });
}

/** Normalize the module's sfx cues onto engine beats ({t, kind}); returns the beats, custom file kinds and warnings. */
export function sfxBeats(cues, root) {
  const beats = [];
  const custom = {};
  const warnings = [];
  for (const [i, c] of (cues ?? []).entries()) {
    if (!c || typeof c.at !== "number" || !Number.isFinite(c.at) || c.at < 0 || typeof c.kind !== "string") {
      warnings.push(`sfx cue ${i} ignored (needs {at: seconds >= 0, kind: string})`);
      continue;
    }
    const kind = HF_SFX_ALIASES[c.kind] ?? (SFX_KIT[c.kind] ? c.kind : null);
    if (kind) beats.push({ t: c.at, kind });
    else if (c.kind.includes("/") && existsSync(join(root, c.kind))) {
      custom[c.kind] = { level: 0, files: [c.kind] };
      beats.push({ t: c.at, kind: c.kind });
    } else warnings.push(`sfx kind "${c.kind}" is unknown; cue at ${c.at}s skipped`);
  }
  return { beats, custom, warnings };
}

/** Where a format's own SFX sit: the loudest 50 ms of each sound lands this far under the voice's loud windows (dB). */
export const FORMAT_SFX_UNDER_PEAK_DB = 8;
const lin = (d) => 10 ** (d / 20);
const dbOf = (x) => 20 * Math.log10(Math.max(1e-9, x));

/** Decode a module-provided sound ({path} or {wavBuffer|buffer}) to 48 kHz stereo float; buffers are staged as files in `dir`. */
async function decodeProvided(item, dir) {
  if (item.path) return decode(item.path);
  const buf = item.wavBuffer ?? item.buffer;
  if (!Buffer.isBuffer(buf)) throw new Error("module audio needs a path or a WAV buffer");
  const file = join(dir, `fmt-${createHash("sha1").update(buf).digest("hex").slice(0, 12)}.wav`);
  if (!existsSync(file)) writeFileSync(file, buf);
  return decode(file);
}

/**
 * Mix the audio a format module returned from compose(): `{ music?: {path|wavBuffer, gainDb, duck}, sfx?: {events:
 * [{at, path|buffer, gainDb}]} }`. Music `gainDb` is its level against the voice's loudness (negative = under) and
 * `duck` the dip in dB while words are spoken (0/false = none, true = 3.5); SFX `gainDb` is a trim around the
 * "FORMAT_SFX_UNDER_PEAK_DB under the voice peaks" reference scaled by `sfxVolume`. Returns the stats of the bed.
 * @param {{audio: object, sfxVolume: number, narration: string|null, captions: object[], totalSec: number, out: string, dir: string}} o
 */
export async function mixFormatBed({ audio, sfxVolume = 1, narration, captions = [], totalSec, out, dir }) {
  mkdirSync(dir, { recursive: true });
  const total = Math.ceil(totalSec * SR) * 2;
  const bed = new Float32Array(total);
  const voice = narration ? await decode(narration) : null;
  const voiceDb = (voice && activeLoudness(voice)) ?? -20;
  const loud = voice ? windowRms(voice, 0.05).filter((v) => v > -45).sort((x, y) => x - y) : [];
  const voicePeakDb = loud.length ? loud[Math.min(loud.length - 1, Math.floor(0.95 * loud.length))] : voiceDb + 4;
  let events = 0;
  let musicDb = null;
  if (audio.sfx?.events?.length && sfxVolume > 0) {
    const analyzed = new Map();
    for (const e of audio.sfx.events) {
      const key = e.path ?? e.buffer;
      if (!analyzed.has(key)) { const x = await decodeProvided(e, dir); analyzed.set(key, { x, ...analyzeSound(x) }); }
      const s = analyzed.get(key);
      mixInto(bed, s.x, e.at, lin(voicePeakDb - FORMAT_SFX_UNDER_PEAK_DB + dbOf(sfxVolume) + (e.gainDb ?? 0) - s.activeDb), 1);
      events++;
    }
  }
  if (audio.music) {
    const mx = await decodeProvided(audio.music, dir);
    musicDb = activeLoudness(mx, -60) ?? -20;
    const base = voiceDb + (audio.music.gainDb ?? -17) - musicDb;
    const duckDb = audio.music.duck === true ? 3.5 : Number(audio.music.duck) || 0;
    const intervals = duckDb > 0 ? speechIntervals(captions, 0.45) : [];
    const frames = Math.min(total / 2, mx.length / 2);
    const step = 480;
    for (let f = 0; f < frames; f += step) {
      const g = lin(base + musicGainDb(f / SR, intervals, totalSec, duckDb, { fadeIn: 0.25, fadeOut: 1.2 }));
      for (let k = f; k < Math.min(frames, f + step); k++) { bed[k * 2] += g * mx[k * 2]; bed[k * 2 + 1] += g * mx[k * 2 + 1]; }
    }
  }
  writeWav(out, bed);
  return { events, voiceDb: Math.round(voiceDb * 10) / 10, musicDb: musicDb === null ? null : Math.round(musicDb * 10) / 10 };
}

const SCAFFOLD = {
  "hyperframes.json": JSON.stringify(
    { $schema: "https://hyperframes.heygen.com/schema/hyperframes.json", registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry", paths: { blocks: "compositions", components: "compositions/components", assets: "assets" }, media: { autoProxy: true } },
    null,
    2,
  ) + "\n",
  "meta.json": JSON.stringify({ id: "engine-hf", name: "engine-hf" }, null, 2) + "\n",
  "package.json": JSON.stringify({ name: "engine-hf", private: true, type: "module" }, null, 2) + "\n",
};

/** Two-pass loudnorm to -14 LUFS (measure, then apply linearly) of `input` into `output` (AAC, 48 kHz). */
async function normalizeLoudness(input, output) {
  const base = `loudnorm=I=${LOUDNESS.I}:TP=${LOUDNESS.TP}:LRA=${LOUDNESS.LRA}`;
  let filter = base;
  try {
    const { stderr } = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", input, "-af", `${base}:print_format=json`, "-f", "null", "-"]);
    const m = JSON.parse(stderr.slice(stderr.lastIndexOf("{"), stderr.lastIndexOf("}") + 1));
    if ([m.input_i, m.input_tp, m.input_lra, m.input_thresh, m.target_offset].every((v) => Number.isFinite(Number(v)))) {
      filter = `${base}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
    }
  } catch {
    /* single-pass fallback */
  }
  await run("ffmpeg", ["-y", "-v", "error", "-i", input, "-af", filter, "-ar", "48000", "-c:a", "aac", "-b:a", "320k", output]);
}

/**
 * Build a video of a HyperFrames format. `spec` is the validated and resolved spec (build.mjs does that).
 * @param {{spec: object, specDir: string, outDir: string, log: Function, keepWork?: boolean, quality?: string,
 *   helpers: {StepError: Function, resolveAssetPath: Function, needsAutoVoice: Function, postMarkdown: Function},
 *   deps?: {synthesize?: Function, transcribe?: Function, render?: Function, resolveMusic?: Function, loadKit?: Function}}} o
 */
export async function buildHf({ spec, specDir, outDir, log, keepWork = false, quality = DEFAULT_HF_QUALITY, helpers, deps = {} }) {
  const { StepError, resolveAssetPath, needsAutoVoice, postMarkdown } = helpers;
  const d = { synthesize, transcribe: transcribeNarration, render: renderHyperframes, resolveMusic, loadKit, ...deps };
  let step = "validate";
  const fail = (message) => {
    throw new StepError(step, message);
  };
  if (!HF_QUALITIES.includes(quality)) fail(`Unknown quality "${quality}"; allowed: ${HF_QUALITIES.join(", ")}`);
  let mod;
  try {
    mod = getHfFormat(spec.template);
  } catch (e) {
    fail(e.message);
  }
  const payload = parseHfPayload(spec);
  if (!payload.ok) fail(`Invalid hf payload for "${spec.template}": ${payload.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")}`);
  spec = { ...spec, hf: payload.data };
  if (spec.mode && !mod.meta.modes.includes(spec.mode)) fail(`Format "${spec.template}" supports mode ${mod.meta.modes.join(" or ")}, not "${spec.mode}"`);

  outDir = resolve(outDir);
  const work = join(outDir, ".work");
  const hfDir = join(work, "hf");
  const assetsDir = join(hfDir, "assets");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(join(work, "audio"), { recursive: true });
  mkdirSync(assetsDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  log(step, "done", `Spec OK: "${spec.title}" · ${spec.template} · ${spec.mode ?? "multi"} · ${spec.scenes.length} scenes`, 0.05);

  // ---------- tts (lib/tts.mjs: ElevenLabs or Kokoro; pre-recorded scene audio when every scene has it) ----------
  step = "tts";
  const fps = spec.format.fps;
  let audioSecs = spec.scenes.map(() => null);
  let speechFiles = [];
  if (spec.scenes.every((s) => s.audio)) {
    log(step, "running", `Using pre-recorded voice audio for ${spec.scenes.length} scenes`, 0.06);
    const raw = spec.scenes.map((s, i) => resolveAssetPath(s.audio, specDir) ?? fail(`Cannot find scene ${i} audio file: "${s.audio}"`));
    speechFiles = raw.map((_, i) => join(work, "audio", `speech-${i}.wav`));
    audioSecs = await Promise.all(raw.map((f, i) => normalizeSpeech(f, speechFiles[i])));
    log(step, "done", `Voice ready (pre-recorded): ${audioSecs.reduce((a, b) => a + b, 0).toFixed(1)}s of narration`, 0.35);
  } else {
    let { provider, fallback } = effectiveProvider(spec.voice);
    if (fallback) log(step, "running", fallback, 0.06);
    if (provider === "none") {
      log(step, "done", "Voice disabled (provider none): timing from durationSec / reading time", 0.35);
    } else {
      if (provider === "elevenlabs" && needsAutoVoice(spec)) {
        const auto = pickVoice(await trendingVoices({ gender: "male" }), spec.title);
        if (auto) {
          spec.voice = { ...spec.voice, voiceId: auto.voiceId };
          log(step, "running", `Auto voice: ${auto.name} (${auto.accent}, trending on ElevenLabs)`, 0.06);
        }
      }
      const texts = spec.scenes.map((s) => s.narration);
      log(step, "running", `Synthesizing ${texts.length} scenes with ${provider}`, 0.06);
      const onItem = (done, total) => log(step, "running", `Voice ${done}/${total}`, 0.06 + 0.25 * (done / total));
      let rawFiles;
      try {
        rawFiles = await d.synthesize({ provider, texts, language: spec.language, voiceId: spec.voice.voiceId, speed: spec.voice.speed ?? 1, dir: join(work, "audio"), onItem });
      } catch (e) {
        if (provider !== "elevenlabs") throw e;
        log(step, "running", `${e.message} — falling back to local Kokoro`, 0.1);
        provider = "kokoro";
        rawFiles = await d.synthesize({ provider, texts, language: spec.language, voiceId: undefined, speed: spec.voice.speed ?? 1, dir: join(work, "audio"), onItem });
      }
      speechFiles = rawFiles.map((_, i) => join(work, "audio", `speech-${i}.wav`));
      audioSecs = await Promise.all(rawFiles.map((f, i) => normalizeSpeech(f, speechFiles[i])));
      log(step, "done", `Voice ready (${provider}): ${audioSecs.reduce((a, b) => a + b, 0).toFixed(1)}s of narration`, 0.35);
    }
  }
  // hard cuts only: no transition overlap between scenes
  const timeline = computeTimeline(
    spec.scenes.map((s, i) => ({ audioSec: audioSecs[i], durationSec: s.durationSec, narration: s.narration })),
    { fps, transitionFrames: 0 },
  );
  let totalSec = timeline.totalFrames / fps;

  // ---------- word timings: transcription of the narration (mlx-whisper), aligned to the script ----------
  step = "captions";
  let narrationFile = null;
  let caps = null;
  if (speechFiles.length) {
    narrationFile = join(work, "audio", "narration.wav");
    await mixAtOffsets(speechFiles.map((file, i) => ({ file, offsetMs: timeline.scenes[i].speechStartMs })), totalSec, narrationFile);
    log(step, "running", "Transcribing narration for word timings", 0.37);
    try {
      caps = alignToScript(await d.transcribe(narrationFile, spec.language), spec.scenes.map((s) => s.narration));
    } catch (e) {
      log(step, "running", `Transcription failed (${String(e.message).slice(0, 160)}); using text-timed words (spread over each scene's speech window)`, 0.4);
    }
  }
  caps ??= syntheticCaptions(spec.scenes, timeline);
  const words = toWords(caps);
  log(step, "done", `${words.length} words timed (captions are drawn by the format: ${spec.captions.enabled ? "on" : "off"})`, 0.45);

  // ---------- compose ----------
  step = "render";
  log(step, "running", `Composing ${spec.template}`, 0.455);
  let composed;
  try {
    composed = await mod.compose({
      spec,
      words,
      durationSec: r3(totalSec),
      outDir: hfDir,
      assetsDir,
      captions: { enabled: Boolean(spec.captions.enabled) },
      quality,
      voicePath: narrationFile ?? undefined,
      scenes: spec.scenes.map((s, i) => ({ id: s.id, startSec: r3(timeline.scenes[i].from / fps), endSec: r3((timeline.scenes[i].from + timeline.scenes[i].durationInFrames) / fps), speechStartSec: r3(timeline.scenes[i].speechStartMs / 1000), speechSec: r3(timeline.scenes[i].speechSec) })),
    });
  } catch (e) {
    fail(`Format "${spec.template}" failed to compose: ${e.message}`);
  }
  const entryRel = composed ? resolveHfEntry(hfDir, composed.entry) : null;
  if (!entryRel) fail(`Format "${spec.template}" compose() must return { entry } naming a file it wrote in outDir`);
  for (const line of composeWarningLines(composed.warnings)) log(step, "running", line, 0.456);
  if (!Number.isFinite(composed.durationSec) || composed.durationSec <= 0) fail(`Format "${spec.template}" compose() must return a positive durationSec`);
  if (Math.abs(composed.durationSec - totalSec) > 0.25) log(step, "running", `Composition lasts ${composed.durationSec}s but the narration timeline ${r3(totalSec)}s; audio follows the composition`, 0.456);
  totalSec = composed.durationSec;
  for (const [name, text] of Object.entries(SCAFFOLD)) if (!existsSync(join(hfDir, name))) writeFileSync(join(hfDir, name), text);

  // ---------- audio: SFX cues (module) + music (library / ElevenLabs / file) + voice, one -14 LUFS mix ----------
  const specFiles = (p) => resolveAssetPath(p, specDir);
  const fmtAudio = composed.audio && typeof composed.audio === "object" ? composed.audio : null;
  let m = spec.music;
  // provider "format": the format's own chiptune. When the module returned none, fall back to the library (never fails).
  const formatMusic = m.provider === "format" && fmtAudio?.music ? fmtAudio.music : null;
  if (m.provider === "format" && !formatMusic) {
    log(step, "running", `Format "${spec.template}" returned no music; using the library instead`, 0.457);
    m = { ...m, provider: "library", mood: FORMAT_MOOD_IDS.includes(m.mood) ? "auto" : m.mood };
    delete m.seed;
    spec = { ...spec, music: m };
  }
  const wantsMusic = m.provider === "none" ? false : Boolean(m.provider || m.mood || m.track || (m.file && (m.duck || spec.sfx.enabled)));
  let track = null;
  if (wantsMusic && !formatMusic && !(m.file && /^https?:\/\//i.test(m.file))) {
    const r = await d.resolveMusic(spec, { totalSec, resolveFile: specFiles, log: (msg) => log(step, "running", msg, 0.458) });
    track = r.track;
    if (track?.credit) spec.credits = [...(spec.credits ?? []), track.credit];
    log(step, "running", r.note ?? "No music", 0.459);
  }
  if (formatMusic) log(step, "running", `Music: format chiptune (${formatMusic.note ?? formatMusic.id ?? "generated in code"}), ${formatMusic.gainDb} dB under the voice, duck ${formatMusic.duck === false || !formatMusic.duck ? "off" : `${formatMusic.duck === true ? 3.5 : formatMusic.duck} dB`}; no credit needed`, 0.459);
  const fmtSfx = spec.sfx.enabled && fmtAudio?.sfx?.events?.length ? fmtAudio.sfx : null;
  let events = [];
  let samples = {};
  if (spec.sfx.enabled && !fmtSfx && composed.sfx?.length) {
    const { beats, custom, warnings } = sfxBeats(composed.sfx, join(CC_ROOT, "03-assets", "sfx"));
    for (const w of warnings) log(step, "running", w, 0.46);
    const kit = await d.loadKit({ ...SFX_KIT, ...custom });
    samples = kit.samples;
    events = scheduleSfx(beats, kit.pools, { maxOverlap: 3, jitter: 0.06 });
  }
  const mixInputs = [];
  if (narrationFile) mixInputs.push(narrationFile);
  const speechCaps = () => (caps.length ? caps : syntheticCaptions(spec.scenes, timeline));
  if (events.length || track) {
    const bedFile = join(work, "audio", "bed.wav");
    const stats = await buildBed({
      events,
      samples,
      sfxVolume: spec.sfx.enabled ? spec.sfx.volume : 0,
      music: track,
      musicVolume: m.volume,
      duck: m.duck !== false && Boolean(track),
      captions: speechCaps(),
      narration: narrationFile,
      totalSec,
      out: bedFile,
    });
    mixInputs.push(bedFile);
    const levels = track ? `, music ${track.id} at ${musicLevelDb(m.volume)} dB (${musicDuckedLevelDb(m.volume)} dB under speech)` : "";
    log(step, "running", `Audio bed: ${stats.events} SFX${levels}`, 0.465);
  }
  if (formatMusic || fmtSfx) {
    const fmtBed = join(work, "audio", "format-bed.wav");
    const stats = await mixFormatBed({ audio: { music: formatMusic, sfx: fmtSfx }, sfxVolume: spec.sfx.volume, narration: narrationFile, captions: speechCaps(), totalSec, out: fmtBed, dir: join(work, "audio", "format") });
    mixInputs.push(fmtBed);
    log(step, "running", `Format audio bed: ${stats.events} pixel SFX${formatMusic ? " + chiptune music" : ""} (voice ${stats.voiceDb} dB)`, 0.466);
  }
  const rawMix = join(work, "audio", "mix.wav");
  const dur = totalSec.toFixed(3);
  if (mixInputs.length) {
    const ins = mixInputs.flatMap((f) => ["-i", f]);
    const chain = mixInputs.length > 1 ? `${mixInputs.map((_, i) => `[${i}:a]`).join("")}amix=inputs=${mixInputs.length}:normalize=0:dropout_transition=0,apad,atrim=0:${dur}` : `[0:a]apad,atrim=0:${dur}`;
    await run("ffmpeg", ["-y", "-v", "error", ...ins, "-filter_complex", `${chain}[a]`, "-map", "[a]", "-ar", "48000", "-ac", "2", rawMix]);
  } else {
    await run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", dur, rawMix]);
  }
  const finalAudio = join(work, "audio", "final.m4a");
  if (mixInputs.length) await normalizeLoudness(rawMix, finalAudio);
  else await run("ffmpeg", ["-y", "-v", "error", "-i", rawMix, "-c:a", "aac", "-b:a", "128k", finalAudio]);

  // ---------- render with HyperFrames: captions on (default deliverable) and off ----------
  const wantCaps = Boolean(spec.captions.enabled);
  const passes = wantCaps ? [{ captions: true, file: join(work, "render-captions.mp4") }, { captions: false, file: join(work, "render-plain.mp4") }] : [{ captions: false, file: join(work, "render-plain.mp4") }];
  for (const [i, pass] of passes.entries()) {
    const lo = 0.47 + (0.43 * i) / passes.length;
    const span = 0.43 / passes.length;
    let last = -1;
    log(step, "running", `Rendering with HyperFrames ${HYPERFRAMES_VERSION} (${pass.captions ? "with" : "without"} captions, quality ${quality})`, lo);
    await d.render({
      dir: hfDir,
      output: pass.file,
      quality,
      captions: pass.captions,
      entry: entryRel,
      onProgress: (p) => {
        const pct = Math.floor(p * 20);
        if (pct !== last) {
          last = pct;
          log(step, "running", `Rendering ${Math.round(p * 100)}%`, lo + span * p);
        }
      },
    });
  }
  const videoPath = join(outDir, "video.mp4");
  const plainPath = join(outDir, "video-sin-subtitulos.mp4");
  await run("ffmpeg", muxArgs({ video: passes[0].file, audio: finalAudio, out: videoPath }));
  await run("ffmpeg", muxArgs({ video: passes.at(-1).file, audio: finalAudio, out: plainPath }));
  log(step, "done", `Rendered ${totalSec.toFixed(1)}s · ${spec.format.width}x${spec.format.height}@${fps}`, 0.92);

  // ---------- cover ----------
  step = "cover";
  const coverAt = Number.isFinite(composed.coverAtSec) ? composed.coverAtSec : Math.max(0.3, (timeline.scenes[0].durationInFrames / fps) - 0.25);
  const coverPath = join(outDir, "cover.jpg");
  await run("ffmpeg", ["-y", "-v", "error", "-ss", Math.min(totalSec - 0.1, coverAt).toFixed(3), "-i", videoPath, "-frames:v", "1", "-q:v", "2", coverPath]);
  writeFileSync(join(outDir, "post.md"), postMarkdown(spec));
  const { post, ...rest } = spec;
  writeFileSync(join(outDir, "spec.json"), JSON.stringify({ ...rest, post }, null, 2) + "\n");
  writeFileSync(join(outDir, "words.json"), JSON.stringify(words) + "\n");
  log(step, "done", `Cover at ${Math.min(totalSec - 0.1, coverAt).toFixed(1)}s`, 0.97);

  if (!keepWork) rmSync(work, { recursive: true, force: true });
  const outputs = { video: videoPath, videoNoCaptions: plainPath, cover: coverPath, post: join(outDir, "post.md"), spec: join(outDir, "spec.json") };
  log("done", "done", `Video ready: ${videoPath}`, 1, { outputs, durationSec: Number(totalSec.toFixed(2)) });
  return outputs;
}
