// The HyperFrames build route with a fake renderer: pipeline order, caption ownership and the outputs.
process.env.CC_HF_INTERNAL = "1";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../lib/media.mjs";
import { setupEnv } from "../lib/env.mjs";

setupEnv();
await import("../hf/registry.mjs");
const { build } = await import("../lib/build.mjs");
const hfb = await import("../lib/build-hf.mjs");
const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));

const specObj = (over = {}) => ({
  version: 1,
  title: "HF test",
  template: "_stub",
  mode: "multi",
  voice: { provider: "none" },
  music: { provider: "none" },
  hf: { style: "solid" },
  scenes: [
    { id: "a", narration: "Hola mundo bonito.", onScreenText: "HOLA" },
    { id: "b", narration: "Segunda escena aqui.", onScreenText: "DOS" },
  ],
  ...over,
});

/** Fake renderer: records every pass and writes a small black video of the composition's duration. */
function fakeDeps() {
  const calls = [];
  return {
    calls,
    deps: {
      render: async ({ dir, output, quality, captions, entry }) => {
        const html = readFileSync(join(dir, entry), "utf8");
        const dur = html.match(/data-duration="([\d.]+)"/)[1];
        calls.push({ output, quality, captions, entry, hasCaptionVar: /"id":"captions"/.test(html) });
        await run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `color=c=black:s=108x192:r=30:d=${dur}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", output]);
      },
    },
  };
}

async function buildWith(spec, { quality, deps } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "hf-build-"));
  const specPath = join(dir, "spec.json");
  writeFileSync(specPath, JSON.stringify(spec));
  const logs = [];
  const f = fakeDeps();
  const outputs = await build({ specPath, outDir: join(dir, "out"), log: (step, status, message, progress, extra) => logs.push({ step, status, message, progress, ...extra }), quality, hfDeps: { ...f.deps, ...deps } });
  return { dir, out: join(dir, "out"), outputs, logs, calls: f.calls };
}

test("the route renders captions-on then captions-off, muxes both with the audio and writes the standard outputs", async () => {
  const { dir, out, outputs, logs, calls } = await buildWith(specObj(), { quality: "draft" });
  assert.deepEqual(calls.map((c) => c.captions), [true, false]);
  assert.ok(calls.every((c) => c.quality === "draft" && c.hasCaptionVar && c.entry === "index.html"));
  for (const f of ["video.mp4", "video-sin-subtitulos.mp4", "cover.jpg", "post.md", "spec.json", "words.json"]) assert.ok(existsSync(join(out, f)), f);
  assert.equal(outputs.video, join(out, "video.mp4"));
  assert.equal(outputs.videoNoCaptions, join(out, "video-sin-subtitulos.mp4"));
  const probe = (f) => spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", join(out, f)], { encoding: "utf8" }).stdout.split("\n").filter(Boolean);
  assert.deepEqual(probe("video.mp4").sort(), ["audio", "video"]);
  assert.deepEqual(probe("video-sin-subtitulos.mp4").sort(), ["audio", "video"]);
  // the standard --json-logs steps keep the dashboard working
  const steps = [...new Set(logs.map((l) => l.step))];
  assert.deepEqual(steps, ["validate", "tts", "captions", "render", "cover", "done"]);
  assert.equal(logs.at(-1).progress, 1);
  assert.ok(logs.every((l, i) => i === 0 || l.progress >= logs[i - 1].progress - 1e-9));
  assert.ok(!existsSync(join(out, ".work")));
  assert.ok(!existsSync(join(out, "captions.json")), "no engine caption data is written for HF formats");
  const words = JSON.parse(readFileSync(join(out, "words.json"), "utf8"));
  assert.equal(words.length, 6);
  rmSync(dir, { recursive: true, force: true });
});

test("captions.enabled=false produces only the no-captions render, used for both deliverables", async () => {
  const { dir, out, calls } = await buildWith(specObj({ captions: { enabled: false } }));
  assert.deepEqual(calls.map((c) => c.captions), [false]);
  assert.ok(existsSync(join(out, "video.mp4")) && existsSync(join(out, "video-sin-subtitulos.mp4")));
  assert.match(readFileSync(join(out, "spec.json"), "utf8"), /"enabled": false/);
  rmSync(dir, { recursive: true, force: true });
});

test("CAPTION OWNERSHIP: the HF route never touches the engine's caption layer or the Remotion/Blender renderers, and the mux never filters video", () => {
  const src = readFileSync(new URL("../lib/build-hf.mjs", import.meta.url), "utf8");
  const imports = [...src.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
  for (const forbidden of ["./captions.mjs", "./blender-captions.mjs", "./render.mjs", "./blender.mjs", "./reels-build.mjs"]) assert.ok(!imports.includes(forbidden), `build-hf.mjs must not import ${forbidden}`);
  assert.ok(!imports.some((i) => i.includes("remotion")));
  assert.ok(!/paginateCaptions/.test(src), "no engine caption pagination");
  assert.equal(hfb.HF_OWNS_CAPTIONS, true);
  const mux = hfb.muxArgs({ video: "v.mp4", audio: "a.m4a", out: "o.mp4" });
  for (const bad of ["-vf", "-filter_complex", "-af", "-filter:v", "ass", "subtitles"]) assert.ok(!mux.includes(bad), `mux must not use ${bad}`);
  assert.ok(mux.join(" ").includes("-c copy"));
  // the render flag is the only caption switch
  assert.deepEqual(hfb.hyperframesRenderArgs({ dir: "d", output: "o.mp4", quality: "draft", captions: true }).slice(0, 8), ["-y", `hyperframes@${hfb.HYPERFRAMES_VERSION}`, "render", "--quality", "draft", "--variables", '{"captions":true}', "-o"]);
  assert.match(hfb.hyperframesRenderArgs({ dir: "d", output: "o.mp4", captions: false }).join(" "), /--variables \{"captions":false\}/);
});

test("the HyperFrames CLI version is pinned in one constant", () => {
  assert.equal(hfb.HYPERFRAMES_VERSION, "0.9.6");
  const src = readFileSync(new URL("../lib/build-hf.mjs", import.meta.url), "utf8");
  assert.equal([...src.matchAll(/0\.9\.6/g)].length, 1);
});

test("an invalid hf payload is rejected at the validate step with the module's path, before any work", async () => {
  const dir = mkdtempSync(join(tmpdir(), "hf-build-"));
  const specPath = join(dir, "s.json");
  writeFileSync(specPath, JSON.stringify(specObj({ hf: { textScale: 7 } })));
  await assert.rejects(() => build({ specPath, outDir: join(dir, "o"), log: () => {}, hfDeps: fakeDeps().deps }), (e) => e.step === "validate" && /hf\.textScale/.test(e.message));
  assert.ok(!existsSync(join(dir, "o")));
  rmSync(dir, { recursive: true, force: true });
});

test("options that do not apply fail instead of being ignored: --quality on Remotion templates, --renderer and bad quality on HF formats", async () => {
  const dir = mkdtempSync(join(tmpdir(), "hf-build-"));
  const specPath = join(dir, "s.json");
  writeFileSync(specPath, JSON.stringify({ version: 1, title: "x", template: "countdown", scenes: [{ id: "a", narration: "uno", visual: { type: "gradient" } }] }));
  await assert.rejects(() => build({ specPath, outDir: join(dir, "o"), log: () => {}, quality: "draft" }), (e) => e.step === "validate" && /--quality is only for HyperFrames formats/.test(e.message));
  writeFileSync(specPath, JSON.stringify(specObj()));
  await assert.rejects(() => build({ specPath, outDir: join(dir, "o"), log: () => {}, renderer: "remotion", hfDeps: fakeDeps().deps }), (e) => /--renderer does not apply/.test(e.message));
  await assert.rejects(() => build({ specPath, outDir: join(dir, "o"), log: () => {}, quality: "ultra", hfDeps: fakeDeps().deps }), /Unknown quality "ultra"/);
  const r = spawnSync(process.execPath, [cli, "build", specPath, "--out", join(dir, "o"), "--quality", "ultra"], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Unknown quality "ultra"; allowed qualities: draft, looks, delivery/);
  rmSync(dir, { recursive: true, force: true });
});

test("sfxBeats maps module kinds onto the engine kit, accepts sfx file paths and warns on unknown kinds", () => {
  const { beats, warnings, custom } = hfb.sfxBeats([{ at: 1, kind: "whoosh" }, { at: 2, kind: "coin" }, { at: 3, kind: "pop" }, { at: 4, kind: "zzz" }, { at: -1, kind: "pop" }, { at: 5, kind: "generated/pop-1.wav" }], join(fileURLToPath(new URL("../../../03-assets/sfx", import.meta.url))));
  assert.deepEqual(beats.map((b) => b.kind), ["cut", "ding", "pop", "generated/pop-1.wav"]);
  assert.equal(warnings.length, 2);
  assert.deepEqual(Object.keys(custom), ["generated/pop-1.wav"]);
});

test("toWords converts Caption[] (ms) to monotonic seconds", () => {
  const w = hfb.toWords([{ text: " a", startMs: 500, endMs: 900 }, { text: " b", startMs: 400, endMs: 450 }]);
  assert.deepEqual(w, [{ text: "a", start: 0.5, end: 0.9 }, { text: "b", start: 0.5, end: 0.5 }]);
});

test("compose() may return the entry as a relative or an absolute path, but it must live inside outDir", async () => {
  const { resolveHfEntry } = await import("../lib/build-hf.mjs");
  const dir = mkdtempSync(join(tmpdir(), "hf-entry-"));
  try {
    writeFileSync(join(dir, "index.html"), "<html></html>");
    assert.equal(resolveHfEntry(dir, "index.html"), "index.html");
    assert.equal(resolveHfEntry(dir, join(dir, "index.html")), "index.html");
    assert.equal(resolveHfEntry(dir, "missing.html"), null);
    assert.equal(resolveHfEntry(dir, "/etc/hosts"), null);
    assert.equal(resolveHfEntry(dir, "../outside.html"), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("compose warnings are formatted for the build log, capped and de-duplicated", async () => {
  const { composeWarningLines } = await import("../lib/build-hf.mjs");
  assert.deepEqual(composeWarningLines(undefined), []);
  assert.deepEqual(composeWarningLines(["a", "a", "b"]), ["Compose warning: a", "Compose warning: b"]);
  const many = Array.from({ length: 30 }, (_, i) => `w${i}`);
  const lines = composeWarningLines(many);
  assert.equal(lines.length, 11);
  assert.equal(lines[10], "Compose warning: 20 more not shown");
});

// ---------- module-provided audio (compose() -> { audio }): chiptune music + pixel SFX instead of the library ----------
const { encodeWav } = await import("../hf/pixel-world/audio-dsp.mjs");
const { decode, activeLoudness, windowRms } = await import("../lib/audio-bed.mjs");

/** Speech-like fake voice: a 150 Hz buzz in 4 Hz syllables, `sec` seconds, written by the fake synthesizer. */
function fakeVoiceDeps(sec = 6) {
  return {
    synthesize: async ({ texts, dir }) => texts.map((_, i) => {
      const file = join(dir, `raw-${i}.wav`);
      const n = Math.floor(sec * 16000), x = new Float32Array(n);
      for (let k = 0; k < n; k++) { const t = k / 16000; x[k] = 0.3 * Math.sin(2 * Math.PI * 150 * t) * Math.max(0, Math.sin(2 * Math.PI * 4 * t)); }
      writeFileSync(file, encodeWav([x], 16000));
      return file;
    }),
    transcribe: async (_file, _lang) => {
      const text = "Un commit guarda en tu equipo. Despues push lo envia a la nube. Asi nadie pierde nada nunca mas.".split(" ");
      return text.map((t, i) => ({ text: t, startMs: 300 + i * 450, endMs: 650 + i * 450 }));
    },
  };
}
const pixelSpec = (over = {}) => ({
  version: 1,
  title: "Chip audio",
  template: "pixel-world",
  mode: "multi",
  voice: { provider: "kokoro" },
  sfx: { enabled: true, volume: 1 },
  hf: { style: "pixel-snes-16bit", hero: "hoodie", worlds: [
    { scenario: "factory", beats: [{ on: { word: "commit" }, do: "emote", symbol: "heart" }, { on: { word: "guarda" }, do: "hero-stamp", text: "SAVE" }] },
    { scenario: "factory", beats: [{ on: { word: "nube" }, do: "light", target: "belt" }] },
  ] },
  scenes: [
    { id: "a", narration: "Un commit guarda en tu equipo.", onScreenText: "COMMIT" },
    { id: "b", narration: "Despues push lo envia a la nube.", onScreenText: "PUSH" },
    { id: "c", narration: "Asi nadie pierde nada nunca mas.", onScreenText: "LISTO" },
  ],
  ...over,
});
const spies = () => { const seen = { music: [], kit: 0 }; return { seen, deps: { ...fakeVoiceDeps(), resolveMusic: async (spec) => { seen.music.push({ ...spec.music }); return { track: null, note: "spy" }; }, loadKit: async () => { seen.kit++; return { pools: {}, samples: {} }; } } }; };
const loudnessOf = (file) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }); const m = [...r.stderr.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop(); return Number(m[1]); };
const messages = (logs) => logs.map((l) => l.message);

test("provider format (pixel-world default): the route uses the module's chiptune + pixel SFX and never the library or the SFX kit; -14 LUFS", async () => {
  const s = spies();
  const { dir, out, logs } = await buildWith(pixelSpec({ music: { provider: "format", mood: "adventure", seed: 4 } }), { quality: "draft", deps: s.deps });
  assert.deepEqual(s.seen.music, [], "resolveMusic is not called");
  assert.equal(s.seen.kit, 0, "loadKit is not called");
  const msgs = messages(logs);
  assert.ok(msgs.some((m) => /^Music: format chiptune \(Aventura · C major · 118 BPM · seed 4\), -17 dB under the voice, duck 3\.5 dB; no credit needed/.test(m)), msgs.join("\n"));
  assert.ok(msgs.some((m) => /^Format audio bed: \d+ pixel SFX \+ chiptune music/.test(m)));
  const lufs = loudnessOf(join(out, "video.mp4"));
  assert.ok(Math.abs(lufs + 14) <= 1, `loudness ${lufs}`);
  assert.ok(!JSON.parse(readFileSync(join(out, "spec.json"), "utf8")).credits, "generated in code: no CC BY credit");
  rmSync(dir, { recursive: true, force: true });
});

test("the default of pixel-world (no music in the spec) is the format chiptune; auto mood follows the style", async () => {
  const s = spies();
  const { dir, logs } = await buildWith(pixelSpec(), { quality: "draft", deps: s.deps });
  assert.deepEqual(s.seen.music, []);
  assert.ok(messages(logs).some((m) => /Music: format chiptune \(Aventura/.test(m)), "snes style -> adventure");
  rmSync(dir, { recursive: true, force: true });
});

test("the user's choice is respected: library and none skip the chiptune (pixel SFX stay), library goes through resolveMusic", async () => {
  const lib = spies();
  const a = await buildWith(pixelSpec({ music: { provider: "library", mood: "tech-lofi" } }), { quality: "draft", deps: lib.deps });
  assert.equal(lib.seen.music.length, 1);
  assert.equal(lib.seen.music[0].provider, "library");
  assert.equal(lib.seen.kit, 0, "the module's pixel SFX replace the SFX kit");
  assert.ok(!messages(a.logs).some((m) => /format chiptune/.test(m)));
  assert.ok(messages(a.logs).some((m) => /^Format audio bed: \d+ pixel SFX \(voice/.test(m)));
  const none = spies();
  const b = await buildWith(pixelSpec({ music: { provider: "none" } }), { quality: "draft", deps: none.deps });
  assert.deepEqual(none.seen.music, []);
  assert.ok(!messages(b.logs).some((m) => /format chiptune/.test(m)));
  const off = spies();
  const c = await buildWith(pixelSpec({ music: { provider: "none" }, sfx: { enabled: false, volume: 1 } }), { quality: "draft", deps: off.deps });
  assert.ok(!messages(c.logs).some((m) => /Format audio bed/.test(m)), "sfx disabled: nothing from the module");
  for (const r of [a, b, c]) rmSync(r.dir, { recursive: true, force: true });
});

test("fallback: a format that returns no audio and asks for provider format gets the library (mood auto), never an error", async () => {
  const s = spies();
  const { dir, logs } = await buildWith(specObj({ voice: { provider: "kokoro" }, music: { provider: "format", mood: "adventure", seed: 2 } }), { quality: "draft", deps: s.deps });
  assert.equal(s.seen.music.length, 1);
  assert.equal(s.seen.music[0].provider, "library");
  assert.equal(s.seen.music[0].mood, "auto");
  assert.equal(s.seen.music[0].seed, undefined);
  assert.ok(messages(logs).some((m) => /returned no music; using the library instead/.test(m)));
  rmSync(dir, { recursive: true, force: true });
});

test("mixFormatBed: music sits 17 dB under the voice with a shallow duck (<= 4 dB), SFX land at their times, no inaudible bed", async () => {
  const { mixFormatBed } = await import("../lib/build-hf.mjs");
  const { renderMusic } = await import("../hf/pixel-world/audio-music.mjs");
  const { sfxWav } = await import("../hf/pixel-world/audio-sfx.mjs");
  const dir = mkdtempSync(join(tmpdir(), "hf-fmtbed-"));
  try {
    // voice: speaking for the first 4 s, silent for the last 4 s
    const n = 8 * 16000, x = new Float32Array(n);
    for (let k = 0; k < 4 * 16000; k++) { const t = k / 16000; x[k] = 0.3 * Math.sin(2 * Math.PI * 150 * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 3 * t)); }
    const voice = join(dir, "voice.wav");
    writeFileSync(voice, encodeWav([x], 16000));
    const caps = [{ text: "x", startMs: 0, endMs: 4000 }];
    const music = { wavBuffer: renderMusic({ mood: "calm", style: "pixel-dusk-lowres", seed: 1, durationSec: 8 }).wav, gainDb: -17, duck: 3.5 };
    const sfx = { events: [{ at: 6, buffer: sfxWav("coin"), gainDb: 0 }] };
    const out = join(dir, "bed.wav");
    const stats = await mixFormatBed({ audio: { music }, sfxVolume: 1, narration: voice, captions: caps, totalSec: 8, out, dir: join(dir, "w") });
    assert.equal(stats.events, 0);
    const flat = join(dir, "flat.wav");
    await mixFormatBed({ audio: { music: { ...music, duck: 0 } }, sfxVolume: 1, narration: voice, captions: caps, totalSec: 8, out: flat, dir: join(dir, "w") });
    const bed = await decode(out), noDuck = await decode(flat), v = await decode(voice);
    const voiceDb = activeLoudness(v);
    const win = (a, from, to) => { const w = windowRms(a.subarray(Math.floor(from * 48000) * 2, Math.floor(to * 48000) * 2), 0.05); return 10 * Math.log10(w.reduce((s, d) => s + 10 ** (d / 10), 0) / w.length); };
    const level = win(noDuck, 1, 3.5) - voiceDb;
    assert.ok(level < -14 && level > -20, `music ${level.toFixed(1)} dB vs the voice (target -17)`);
    const dip = win(noDuck, 1, 3.5) - win(bed, 1, 3.5);
    assert.ok(dip > 3 && dip <= 4, `duck dip while speaking ${dip.toFixed(2)} dB (shallow: 3.5)`);
    assert.ok(Math.abs(win(noDuck, 5.2, 6.5) - win(bed, 5.2, 6.5)) < 0.3, "no dip in the pauses");
    // sfx: the coin at 6 s is audible and nothing else is added at 6 s without it
    const withSfx = join(dir, "bed2.wav");
    const st2 = await mixFormatBed({ audio: { music, sfx }, sfxVolume: 1, narration: voice, captions: caps, totalSec: 8, out: withSfx, dir: join(dir, "w") });
    assert.equal(st2.events, 1);
    const bed2 = await decode(withSfx);
    const peak = (a, f, t) => Math.max(...a.subarray(Math.floor(f * 48000) * 2, Math.floor(t * 48000) * 2).map(Math.abs));
    assert.ok(peak(bed2, 6, 6.25) > peak(bed, 6, 6.25) * 1.15, "the SFX stands out of the music");
    assert.equal(peak(bed2, 2, 3), peak(bed, 2, 3), "elsewhere identical");
    // a sound passed as a file path works too, and a bad item is a clear error
    const wav = join(dir, "s.wav");
    writeFileSync(wav, sfxWav("ping"));
    assert.equal((await mixFormatBed({ audio: { sfx: { events: [{ at: 1, path: wav }] } }, sfxVolume: 1, narration: voice, captions: caps, totalSec: 8, out: join(dir, "p.wav"), dir: join(dir, "w") })).events, 1);
    await assert.rejects(mixFormatBed({ audio: { sfx: { events: [{ at: 1 }] } }, sfxVolume: 1, narration: voice, captions: caps, totalSec: 8, out: join(dir, "q.wav"), dir: join(dir, "w") }), /path or a WAV buffer/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
