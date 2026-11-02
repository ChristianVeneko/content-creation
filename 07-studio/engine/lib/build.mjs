// The build pipeline: validate → tts → captions → render → cover → done.
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { CC_ROOT, ENGINE_ROOT, PYTHON, TRANSCRIBE_PY } from "./env.mjs";
import { mixAtOffsets, normalizeSpeech, run } from "./media.mjs";
import { renderCover, bundleProject, renderVideo } from "./render.mjs";
import { resolveSpec, usesClassicLayout, validateSpec } from "./spec.mjs";
import { getTemplate } from "./templates.mjs";
import { alignToScript, computeTimeline, paginateCaptions, syntheticCaptions } from "./timeline.mjs";
import { effectiveProvider, synthesize } from "./tts.mjs";
import { pickVoice, trendingVoices } from "./voices.mjs";
import { computeBeats, planIllustration, scheduleSfx, usesIllustratedKit } from "./illustrated.mjs";
import { collectIconNames, loadIcons } from "./icons.mjs";
import { planThree, usesThreeKit } from "./scene3d.mjs";
import { planPixel, usesPixelKit } from "./pixel.mjs";
import { planDrawings } from "./drawing.mjs";
import { loadThreeIcons, stageThreeAssets } from "./three-assets.mjs";
import { buildBed, loadKit } from "./audio-bed.mjs";
import { musicDuckedLevelDb, musicLevelDb, resolveMusic } from "./music.mjs";
import { computeReelsTimeline, reelsTtsText, usesReelsKit } from "./reels.mjs";
import { prepareReels, renderReelsCover } from "./reels-build.mjs";
import { chooseRenderer } from "./blender-options.mjs";
import { renderBlenderVideo } from "./blender.mjs";

export class StepError extends Error {
  constructor(step, message) {
    super(message);
    this.step = step;
  }
}

const isRemote = (s) => /^https?:\/\//i.test(s);

/** Resolve a local asset path: absolute, relative to the spec file, or relative to the content-creation root. */
export function resolveAssetPath(p, specDir) {
  if (isAbsolute(p)) return existsSync(p) ? p : null;
  for (const base of [specDir, CC_ROOT, process.cwd()]) {
    const full = resolve(base, p);
    if (existsSync(full)) return full;
  }
  return null;
}

export function postMarkdown(spec) {
  const p = spec.post;
  const tags = (p.hashtags || []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  return [
    `# ${spec.title}`,
    "",
    "## TikTok",
    "",
    p.tiktok || "",
    "",
    "## Instagram Reels",
    "",
    p.instagram || "",
    "",
    "## YouTube Shorts",
    "",
    `**Title:** ${p.youtube?.title || spec.title}`,
    "",
    `**Description:** ${p.youtube?.description || ""}`,
    "",
    "## Hashtags",
    "",
    tags,
    "",
    ...(spec.credits?.length ? ["## Credits", "", ...spec.credits, ""] : []),
  ].join("\n");
}

/**
 * Build a video from a spec file.
 * @param {{specPath: string, outDir: string, log: (step: string, status: string, message: string, progress: number, extra?: object) => void, keepWork?: boolean, renderer?: "remotion" | "blender"}} opts
 *   renderer: overrides `theme.renderer` (the CLI's --renderer); blender is for the 3D templates
 */
export async function build({ specPath, outDir, log, keepWork = false, renderer: rendererOverride }) {
  let step = "validate";
  const fail = (message) => {
    throw new StepError(step, message);
  };
  try {
    // ---------- validate ----------
    log(step, "running", `Validating ${basename(specPath)}`, 0.01);
    let raw;
    try {
      raw = JSON.parse(readFileSync(specPath, "utf8"));
    } catch (e) {
      fail(`Cannot read spec JSON: ${e.message}`);
    }
    const v = validateSpec(raw);
    if (!v.ok) fail(`Invalid spec: ${v.errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`);
    const spec = resolveSpec(v.spec, getTemplate(v.spec.template));
    const choice = chooseRenderer(spec, rendererOverride);
    if (choice.error) fail(`Invalid renderer: ${choice.error}`);
    if (rendererOverride) spec.theme = { ...spec.theme, renderer: rendererOverride };
    const specDir = dirname(resolve(specPath));
    outDir = resolve(outDir);
    const work = join(outDir, ".work");
    const pub = join(work, "public");
    const job = "job";
    rmSync(work, { recursive: true, force: true });
    mkdirSync(join(pub, job), { recursive: true });
    mkdirSync(join(work, "audio"), { recursive: true });
    cpSync(join(ENGINE_ROOT, "public", "fonts"), join(pub, "fonts"), { recursive: true });
    log(step, "done", `Spec OK: "${spec.title}" · ${spec.template} · ${spec.scenes.length} scenes`, 0.05);

    // ---------- tts ----------
    step = "tts";
    const fps = spec.format.fps;
    // reels: *keywords* are stripped (or reel.voz is used) for the voice; word timings are always needed
    const reelsKit = usesReelsKit(spec.template);
    const ttsTexts = spec.scenes.map((s) => (reelsKit ? reelsTtsText(s) : s.narration));
    // pixel templates type the narration into their dialog box even when the caption overlay is off
    const pixelKit = usesPixelKit(spec.template);
    const wantWords = spec.captions.enabled || reelsKit || pixelKit;
    let audioSecs = spec.scenes.map(() => null);
    let speechFiles = [];
    let { provider, fallback } = effectiveProvider(spec.voice);
    if (fallback) log(step, "running", fallback, 0.06);
    if (provider === "none") {
      log(step, "done", "Voice disabled (provider none): timing from durationSec / reading time", 0.35);
    } else {
      if (provider === "elevenlabs" && needsAutoVoice(spec)) {
        // No voice chosen: take a trending Latin American Spanish voice (stable per title) and record it in spec.json.
        const auto = pickVoice(await trendingVoices({ gender: "male" }), spec.title);
        if (auto) {
          spec.voice.voiceId = auto.voiceId;
          log(step, "running", `Auto voice: ${auto.name} (${auto.accent}, trending on ElevenLabs)`, 0.06);
        }
      }
      log(step, "running", `Synthesizing ${spec.scenes.length} scenes with ${provider}`, 0.06);
      const onItem = (done, total) => log(step, "running", `Voice ${done}/${total}`, 0.06 + 0.25 * (done / total));
      let rawFiles;
      try {
        rawFiles = await synthesize({
          provider,
          texts: ttsTexts,
          language: spec.language,
          voiceId: spec.voice.voiceId,
          speed: spec.voice.speed ?? 1,
          dir: join(work, "audio"),
          onItem,
        });
      } catch (e) {
        if (provider !== "elevenlabs") throw e;
        log(step, "running", `${e.message} — falling back to local Kokoro`, 0.1);
        provider = "kokoro";
        rawFiles = await synthesize({ provider, texts: ttsTexts, language: spec.language, voiceId: undefined, speed: spec.voice.speed ?? 1, dir: join(work, "audio"), onItem });
      }
      speechFiles = rawFiles.map((_, i) => join(work, "audio", `speech-${i}.wav`));
      audioSecs = await Promise.all(rawFiles.map((f, i) => normalizeSpeech(f, speechFiles[i])));
      log(step, "done", `Voice ready (${provider}): ${audioSecs.reduce((a, b) => a + b, 0).toFixed(1)}s of narration`, 0.35);
    }
    const timeline = (reelsKit ? computeReelsTimeline : computeTimeline)(
      spec.scenes.map((s, i) => ({ audioSec: audioSecs[i], durationSec: s.durationSec, narration: s.narration })),
      { fps },
    );
    const totalSec = timeline.totalFrames / fps;

    // ---------- captions ----------
    step = "captions";
    let narration = null;
    let captions;
    if (speechFiles.length) {
      const narrationFile = join(pub, job, "narration.wav");
      await mixAtOffsets(
        speechFiles.map((file, i) => ({ file, offsetMs: timeline.scenes[i].speechStartMs })),
        totalSec,
        narrationFile,
      );
      narration = `${job}/narration.wav`;
      if (wantWords) {
        log(step, "running", "Transcribing narration for word-level captions", 0.37);
        try {
          await run(PYTHON(), [TRANSCRIBE_PY(), narrationFile, "--lang", spec.language.slice(0, 2)]);
          captions = JSON.parse(readFileSync(narrationFile.replace(/\.wav$/, ".json"), "utf8"));
          if (!captions.length) throw new Error("no words recognized");
          // illustrated: show the script's exact words (technical terms are often misheard) with whisper timings
          if (usesIllustratedKit(spec.template) || usesThreeKit(spec.template) || reelsKit || pixelKit) captions = alignToScript(captions, spec.scenes.map((s) => s.narration));
        } catch (e) {
          log(step, "running", `Transcription failed (${e.message.slice(0, 160)}); using text-timed captions`, 0.4);
          captions = syntheticCaptions(spec.scenes, timeline);
        }
      }
    }
    if (!captions) captions = wantWords ? syntheticCaptions(spec.scenes, timeline) : [];
    const captionPages = paginateCaptions(captions, spec.captions.wordsPerPage);
    log(step, "done", spec.captions.enabled || pixelKit ? `${captions.length} words in ${captionPages.length} caption pages` : "Captions disabled", 0.45);

    // ---------- assets ----------
    const visuals = spec.scenes.map((s, i) => {
      if (!s.visual.src || !["image", "video"].includes(s.visual.type)) return null;
      if (isRemote(s.visual.src)) return s.visual.src;
      const p = resolveAssetPath(s.visual.src, specDir);
      if (!p) {
        log("render", "running", `Scene ${s.id}: visual not found (${s.visual.src}); using gradient`, 0.45);
        return null;
      }
      const name = `${job}/visual-${i}${extname(p).toLowerCase()}`;
      copyFileSync(p, join(pub, name));
      return name;
    });
    let music = null;
    if (spec.music.file && spec.music.provider !== "none") {
      if (isRemote(spec.music.file)) music = spec.music.file;
      else {
        const p = resolveAssetPath(spec.music.file, specDir);
        if (p) {
          music = `${job}/music${extname(p).toLowerCase()}`;
          copyFileSync(p, join(pub, music));
        } else log("render", "running", `Music not found (${spec.music.file}); rendering without music`, 0.45);
      }
    }

    // ---------- illustrated: plan, icons, beats ----------
    let illustration = null;
    let icons = {};
    if (usesIllustratedKit(spec.template)) {
      illustration = planIllustration(spec, timeline, captions);
      for (const [i, p] of illustration.entries()) for (const w of p?.warnings ?? []) log("render", "running", `Scene ${spec.scenes[i].id}: ${w}`, 0.45);
      const loaded = loadIcons(collectIconNames(spec));
      icons = loaded.icons;
      if (loaded.missing.length) log("render", "running", `Unknown icon(s) ${loaded.missing.join(", ")}; drawn as a fallback icon`, 0.45);
    }
    // ---------- 3D templates: plan (layout, camera, timing), icons, local HDRI + models ----------
    let three = null;
    if (usesThreeKit(spec.template)) {
      illustration = planThree(spec, timeline, captions);
      const loaded = loadThreeIcons(spec);
      icons = loaded.icons;
      if (loaded.missing.length) log("render", "running", `Unknown icon(s) ${loaded.missing.join(", ")}; drawn as a fallback icon`, 0.45);
      const staged = stageThreeAssets(spec, pub);
      three = staged.three;
      if (staged.missing.length) log("render", "running", `3D asset(s) not found: ${staged.missing.join(", ")}; using procedural stand-ins`, 0.45);
    }
    // ---------- pixel templates: plan (sets, cameras, transitions, prop entrances) ----------
    if (pixelKit) illustration = planPixel(spec, timeline, captions);
    // ---------- classic templates: word moments of their drawings and 2D fx (null when nothing is drawn) ----------
    if (usesClassicLayout(spec.template)) {
      illustration = planDrawings(spec, timeline, captions);
      for (const [i, p] of (illustration ?? []).entries()) for (const w of p.warnings) log("render", "running", `Scene ${spec.scenes[i].id}: ${w}`, 0.45);
    }
    // ---------- reels: plan (cuts, word-synced moments, sounds), icons, fonts/sounds/images ----------
    let reels = null;
    if (reelsKit) {
      const prep = prepareReels({ spec, timeline, captions, pub, job, resolveAsset: (p) => resolveAssetPath(p, specDir) });
      reels = prep.reels;
      icons = prep.icons;
      if (prep.missingIcons.length) log("render", "running", `Unknown icon(s) ${prep.missingIcons.join(", ")}; drawn as a spark`, 0.45);
      if (prep.missingImages.length) log("render", "running", `Image(s) not found: ${prep.missingImages.join(", ")}`, 0.45);
      for (const w of reels.warnings) log("render", "running", `Reels: ${w}`, 0.45);
    }
    let avatar = null;
    if (spec.brand?.avatar) {
      const p = resolveAssetPath(spec.brand.avatar, specDir);
      if (p) {
        avatar = `${job}/avatar${extname(p).toLowerCase()}`;
        copyFileSync(p, join(pub, avatar));
      } else log("render", "running", `Avatar not found (${spec.brand.avatar}); footer without avatar`, 0.45);
    }

    // ---------- music: library (by mood) / ElevenLabs / file ----------
    // Library music is used when the spec or its template asks for it (provider, mood or track set); older
    // templates without music defaults keep the legacy behavior (only `music.file`, played by Remotion).
    const m = spec.music;
    const wantsMixedMusic = m.provider === "none" ? false : Boolean(m.provider || m.mood || m.track || (m.file && (m.duck || spec.sfx.enabled)));
    let track = null;
    if (wantsMixedMusic && !(m.file && isRemote(m.file))) {
      const r = await resolveMusic(spec, {
        totalSec,
        resolveFile: (f) => resolveAssetPath(f, specDir),
        log: (msg) => log("render", "running", msg, 0.452),
      });
      track = r.track;
      if (r.mood) spec.music = { ...spec.music, resolvedMood: r.mood };
      if (track) {
        spec.music = { ...spec.music, resolvedTrack: track.id };
        if (track.credit) spec.credits = [...(spec.credits ?? []), track.credit];
        music = null; // the bed carries the music
      }
      log("render", "running", r.note ?? "No music", 0.453);
    }

    // ---------- audio bed: SFX on the beat timeline + ducked music ----------
    let bed = null;
    if ((spec.sfx.enabled && !reelsKit) || track) {
      log("render", "running", "Mixing sound effects and music bed", 0.455);
      const beats = computeBeats(illustration ?? spec.scenes.map(() => null), timeline, fps);
      const { pools, samples } = await loadKit();
      // reels play the pack's own SFX on scene moments (src/reels/ReelsVideo.tsx), not the beat kit
      const events = spec.sfx.enabled && !reelsKit ? scheduleSfx(beats, pools, { maxOverlap: 3, jitter: 0.06 }) : [];
      const duck = m.duck !== false && Boolean(track);
      bed = `${job}/bed.wav`;
      const stats = await buildBed({
        events,
        samples,
        sfxVolume: spec.sfx.enabled ? spec.sfx.volume : 0,
        music: track,
        musicVolume: m.volume,
        duck,
        captions: captions?.length ? captions : syntheticCaptions(spec.scenes, timeline),
        narration: narration ? join(pub, narration) : null,
        totalSec,
        out: join(pub, bed),
      });
      const levels = track ? `, music ${basename(track.file)} at ${musicLevelDb(m.volume)} dB${duck ? ` (${musicDuckedLevelDb(m.volume)} dB under speech)` : ""}` : "";
      log("render", "running", `Audio bed: ${stats.events} SFX on ${beats.length} beats${levels}`, 0.458);
    }

    // ---------- render ----------
    step = "render";
    mkdirSync(outDir, { recursive: true });
    const inputProps = { spec, timeline, captionPages, assets: { narration, music, visuals, bed, avatar, three }, illustration, icons, reels };
    const videoPath = join(outDir, "video.mp4");
    let serveUrl = null;
    let composition = null;
    let blenderDone = false;
    if (choice.renderer === "blender") {
      // Eevee frames from Blender + ffmpeg (captions, headlines and labels as an ASS layer); any Blender problem falls back to Remotion
      try {
        log(step, "running", "Rendering with Blender (Eevee)", 0.46);
        const r = await renderBlenderVideo({
          spec,
          timeline,
          plans: illustration,
          captionPages,
          models: three?.models ?? {},
          pubDir: pub,
          work,
          audio: { narration: narration ? join(pub, narration) : null, bed: bed ? join(pub, bed) : null, music: music && !isRemote(music) ? join(pub, music) : null, musicVolume: spec.music.volume },
          out: videoPath,
          log: (msg, p) => log(step, "running", msg, 0.46 + 0.46 * Math.min(1, p)),
        });
        log(step, "done", `Blender rendered ${r.frames} frames in ${r.seconds.toFixed(0)}s (${r.perFrame.toFixed(2)} s/frame)${r.captionsBurned ? "" : "; no 2D layer"}`, 0.92);
        blenderDone = true;
      } catch (e) {
        log(step, "running", `Blender renderer failed (${String(e.message).slice(0, 300)}); falling back to the Remotion renderer for this video`, 0.46);
      }
    }
    if (!blenderDone) {
      log(step, "running", "Bundling Remotion project", 0.46);
      serveUrl = await bundleProject({ publicDir: pub, outDir: join(work, "bundle"), onProgress: (p) => log(step, "running", `Bundling ${Math.round(p * 100)}%`, 0.46 + 0.04 * p) });
      const videoTmp = join(work, "video.mp4");
      let last = -1;
      composition = await renderVideo({
        serveUrl,
        compositionId: spec.template,
        inputProps,
        output: videoTmp,
        onProgress: (p) => {
          const pct = Math.floor(p * 20);
          if (pct !== last) {
            last = pct;
            log(step, "running", `Rendering ${Math.round(p * 100)}%`, 0.5 + 0.42 * p);
          }
        },
      });
      // With a mixed bed (voice + SFX + music) re-normalize the final audio to -14 LUFS; otherwise copy as before.
      const audioArgs = bed ? ["-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "320k"] : ["-c", "copy"];
      await run("ffmpeg", ["-y", "-v", "error", "-i", videoTmp, ...audioArgs, "-movflags", "+faststart", join(work, "video.faststart.mp4")]);
      renameSync(join(work, "video.faststart.mp4"), videoPath);
      log(step, "done", `Rendered ${totalSec.toFixed(1)}s · ${spec.format.width}x${spec.format.height}@${fps}`, 0.92);
    }

    // ---------- cover ----------
    step = "cover";
    const s0 = timeline.scenes[0];
    const coverFrame = Math.max(0, Math.min(timeline.totalFrames - 1, s0.from + s0.durationInFrames - timeline.transitionFrames - 6));
    const coverPath = join(outDir, "cover.jpg");
    // reels: a designed cover (spec.reels.cover) plus cover-check.png with the 3:4 profile-grid crop
    if (blenderDone) await run("ffmpeg", ["-y", "-v", "error", "-ss", (coverFrame / fps).toFixed(3), "-i", videoPath, "-frames:v", "1", "-q:v", "2", coverPath]);
    else if (reelsKit) await renderReelsCover({ serveUrl, inputProps, outDir });
    else await renderCover({ serveUrl, composition, inputProps, frame: coverFrame, output: coverPath });
    writeFileSync(join(outDir, "post.md"), postMarkdown(spec));
    const { post, ...rest } = spec;
    writeFileSync(join(outDir, "spec.json"), JSON.stringify({ ...rest, post }, null, 2) + "\n");
    writeFileSync(join(outDir, "captions.json"), JSON.stringify(captions) + "\n");
    log(step, "done", reelsKit ? "Cover + 3:4 crop check (cover-check.png)" : `Cover at frame ${coverFrame}`, 0.97);

    if (!keepWork) rmSync(work, { recursive: true, force: true });
    const outputs = { video: videoPath, cover: coverPath, post: join(outDir, "post.md"), spec: join(outDir, "spec.json") };
    log("done", "done", `Video ready: ${videoPath}`, 1, { outputs, durationSec: Number(totalSec.toFixed(2)) });
    return outputs;
  } catch (e) {
    if (e instanceof StepError) throw e;
    throw new StepError(step, e?.message || String(e));
  }
}

/** ElevenLabs with no explicit library voice (missing, or a Kokoro id) and Spanish narration. */
export function needsAutoVoice(spec) {
  const id = spec.voice?.voiceId;
  const explicit = id && !/^[a-z][fm]_[a-z]+$/.test(id);
  return !explicit && String(spec.language || "es").startsWith("es");
}
