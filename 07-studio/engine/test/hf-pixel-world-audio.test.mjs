// pixel-world own audio: deterministic chiptune, pixel SFX voices, beat -> cue mapping bound to word starts, the voice
// envelope for lip-sync and compose() returning `audio`. ffmpeg is only used to decode the library coin and test voice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setupEnv } from "../lib/env.mjs";
import { SR, decodeWav, encodeWav, prng, rmsOf } from "../hf/pixel-world/audio-dsp.mjs";
import { MUSIC_MOOD_IDS, STYLE_FLAVOUR, renderMusic, resolveMood } from "../hf/pixel-world/audio-music.mjs";
import { SFX_NAMES, renderSfx, sfxWav } from "../hf/pixel-world/audio-sfx.mjs";
import { cuesFromPlan } from "../hf/pixel-world/audio-cues.mjs";
import { buildFormatAudio, envelopeFromSamples, voiceEnvelope } from "../hf/pixel-world/audio.mjs";
import { compose } from "../hf/pixel-world/compose.mjs";
import { STYLE_IDS } from "../hf/pixel-world/styles.mjs";
import { FORMAT_MOODS } from "../lib/spec.mjs";
import { open, prepare } from "../hf/pixel-world/sandbox.mjs";

setupEnv();
const scratch = mkdtempSync(join(tmpdir(), "pw-audio-"));
process.on("exit", () => rmSync(scratch, { recursive: true, force: true }));

/** Fraction of the energy of x above `hz`, by a radix-2 FFT over the first 2^16 samples. */
function energyAbove(x, sr, hz) {
  const N = 1 << 16, re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < Math.min(N, x.length); i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; } }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < N; i += len) for (let k = 0; k < len / 2; k++) {
      const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
      const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi, vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
      re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
    }
  }
  let tot = 0, hi = 0;
  for (let k = 1; k < N / 2; k++) { const e = re[k] * re[k] + im[k] * im[k]; tot += e; if ((k * sr) / N >= hz) hi += e; }
  return hi / tot;
}

const words = "Un commit guarda en tu equipo. Despues push lo envia a la nube. Asi nadie pierde su trabajo nunca.".split(" ").map((text, i) => ({ text, start: 0.4 + i * 0.35, end: 0.7 + i * 0.35 }));
const planHf = { style: "pixel-snes-16bit", hero: "hoodie", worlds: [
  { scenario: "factory", beats: [{ on: { word: "commit" }, do: "emote", symbol: "heart" }, { on: { word: "guarda" }, do: "hero-stamp", text: "SAVE" }, { on: { word: "equipo" }, do: "jump" }] },
  { scenario: "factory", transition: "tiles", from: { word: "Despues" }, beats: [{ on: { word: "push" }, do: "push", target: "belt" }, { on: { word: "nube" }, do: "walk", to: "left" }] },
] };

test("the format moods of the spec mirror the generator's moods", () => {
  assert.deepEqual([...FORMAT_MOODS].sort(), [...MUSIC_MOOD_IDS].sort());
  assert.ok(MUSIC_MOOD_IDS.length >= 4);
  assert.equal(resolveMood("calm", "pixel-nes-8bit"), "calm");
  assert.equal(resolveMood("auto", "pixel-crt-arcade"), "tense", "auto = the style decides");
  assert.equal(resolveMood(undefined, "pixel-gameboy-dmg"), "calm");
});

test("music: the same seed is byte-identical, different seeds and moods differ", () => {
  const a = renderMusic({ mood: "adventure", style: "pixel-snes-16bit", seed: 11, durationSec: 12 });
  const b = renderMusic({ mood: "adventure", style: "pixel-snes-16bit", seed: 11, durationSec: 12 });
  const c = renderMusic({ mood: "adventure", style: "pixel-snes-16bit", seed: 12, durationSec: 12 });
  const d = renderMusic({ mood: "tense", style: "pixel-snes-16bit", seed: 11, durationSec: 12 });
  assert.ok(a.wav.equals(b.wav));
  assert.ok(!a.wav.equals(c.wav));
  assert.ok(!a.wav.equals(d.wav));
});

test("music: lasts exactly the video duration, stereo 44.1 kHz, clean intro and outro, low-passed at 2.6 kHz and audible", () => {
  for (const dur of [6, 13.37]) {
    const r = renderMusic({ mood: "calm", style: "pixel-dusk-lowres", seed: 3, durationSec: dur });
    const w = decodeWav(r.wav);
    assert.equal(w.sr, SR);
    assert.equal(w.channels.length, 2);
    assert.ok(Math.abs(w.channels[0].length / w.sr - dur) < 1 / SR + 1e-9, `duration ${dur}`);
    assert.ok(Math.abs(w.channels[0][3]) < 0.01 && Math.abs(w.channels[0].at(-1)) < 0.01, "starts and ends at silence (no click)");
    assert.ok(energyAbove(w.channels[0], w.sr, 5000) < 0.01, "2.6 kHz low-pass");
    assert.ok(rmsOf(w.channels[0].subarray(Math.floor(w.sr * 2), Math.floor(w.sr * 4))) > 0.03, "audible, not near-silent");
    // intro: the first bar has no drums, so it is quieter than the middle
    const peak = (a, b) => Math.max(...w.channels[0].subarray(Math.floor(a * w.sr), Math.floor(b * w.sr)).map(Math.abs));
    assert.ok(peak(dur - 0.05, dur) < 0.05, "outro fades out");
  }
});

test("music: every mood and every style flavour renders; moods differ in tempo and key", () => {
  const keys = new Set(), bpms = new Set();
  for (const id of MUSIC_MOOD_IDS) { const r = renderMusic({ mood: id, style: "pixel-pico8", seed: 1, durationSec: 5 }); keys.add(r.key); bpms.add(r.bpm); assert.ok(r.wav.length > 5 * SR * 4); }
  assert.ok(keys.size >= 4 && bpms.size >= 4);
  for (const s of STYLE_IDS) assert.ok(STYLE_FLAVOUR[s], `flavour for ${s}`);
  const gb = renderMusic({ mood: "adventure", style: "pixel-gameboy-dmg", seed: 1, durationSec: 8 });
  const sn = renderMusic({ mood: "adventure", style: "pixel-snes-16bit", seed: 1, durationSec: 8 });
  assert.ok(!gb.wav.equals(sn.wav), "gameboy (2 channels) vs snes (pad, echo, stereo)");
  assert.throws(() => renderMusic({ mood: "calm", durationSec: 0 }), /durationSec/);
});

test("sfx: 15+ synthesized voices, deterministic, short and bounded; chip sounds are brighter than the library coin", () => {
  assert.ok(SFX_NAMES.length >= 15);
  for (const need of ["pop", "blip", "coin", "burst", "slash", "stamp", "whooshUp", "whooshDown", "tick", "ping", "rise", "fall", "step", "jump", "powerup", "error", "transition"]) assert.ok(SFX_NAMES.includes(need), need);
  for (const n of SFX_NAMES) {
    const x = renderSfx(n), y = renderSfx(n);
    assert.deepEqual(x, y, `${n} deterministic`);
    assert.ok(x.length >= 0.02 * SR && x.length < 1 * SR, `${n} length`);
    assert.ok(Math.max(...x.map(Math.abs)) <= 0.9001 && rmsOf(x) > 0.02, `${n} level`);
    assert.ok(sfxWav(n).equals(sfxWav(n)));
  }
  assert.ok(!sfxWav("blip", 1).equals(sfxWav("blip", 1.5)), "pitch changes the sound");
  assert.throws(() => renderSfx("nope"), /unknown sfx voice/);
  // brightness against the soft library coin (bong_001)
  const f = fileURLToPath(new URL("../../../03-assets/sfx/interface/bong_001.ogg", import.meta.url));
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", f, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 26 });
  if (r.status === 0) {
    const lib = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4));
    for (const n of ["coin", "blip", "ping", "powerup", "tick"]) assert.ok(energyAbove(renderSfx(n), SR, 800) > energyAbove(lib, SR, 800), `${n} brighter than library coin`);
  }
});

test("cues: every beat kind maps to its pixel sound, bound to the word start of the beat", () => {
  const { data } = prepare({ hf: planHf, words, durationSec: 14 });
  const cues = cuesFromPlan(data);
  const at = (w) => words.find((x) => x.text.replace(/[.,]/g, "") === w).start;
  const of = (t, voice, tol = 0.12) => cues.filter((c) => Math.abs(c.at - t) < tol && (!voice || c.voice === voice));
  assert.deepEqual(of(at("commit")).map((c) => c.voice), ["ping"], "emote heart -> ping");
  assert.equal(of(at("commit"))[0].at, at("commit"), "the first cue of a beat starts on its word");
  assert.deepEqual(of(at("guarda")).map((c) => c.voice).sort(), ["coin", "stamp"], "hero-stamp -> stamp + coin");
  assert.deepEqual(of(at("equipo"), null, 0.4).map((c) => c.voice).filter((v) => v === "jump" || v === "fall").sort(), ["fall", "jump"], "jump -> jump + fall");
  assert.ok(of(at("push"), "whooshUp").length === 1, "push -> whoosh up");
  assert.ok(cues.filter((c) => c.voice === "step").length >= 3, "walk -> footsteps");
  assert.ok(cues.some((c) => c.voice === "transition"), "tiles transition has its sound");
  assert.ok(cues.every((c, i) => i === 0 || c.at >= cues[i - 1].at), "sorted");
  assert.ok(cues.every((c) => c.at >= 0 && c.at < data.dur));
  assert.ok(cues.length >= 12);
});

test("cues: fill is an upward blip run, coins follow count, flash and ambient beats are silent", () => {
  const plan = { dur: 10, hud: [], brand: null, worlds: [{ t0: 0, t1: 10, tr: "slide", beats: [
    { t: 1, do: "fill", target: "x" }, { t: 3, do: "coins", target: "x", count: 5 }, { t: 5, do: "flash" }, { t: 6, do: "jump", ambient: true }, { t: 7, do: "light", target: "x" }, { t: 8, do: "pulse", target: "x" },
  ] }] };
  const cues = cuesFromPlan(plan).filter((c) => c.voice !== "select");
  const fill = cues.filter((c) => c.at >= 1 && c.at < 2);
  assert.equal(fill.length, 3);
  assert.ok(fill[0].pitch < fill[1].pitch && fill[1].pitch < fill[2].pitch, "upward");
  assert.equal(cues.filter((c) => c.voice === "coin").length, 3, "coins capped at 3");
  assert.equal(cues.filter((c) => c.at >= 5 && c.at < 7).length, 0, "flash and ambient: nothing");
  assert.deepEqual(cues.filter((c) => c.at === 7).map((c) => c.voice), ["ping"]);
  assert.deepEqual(cues.filter((c) => c.at === 8).map((c) => c.voice), ["tick"]);
});

test("buildFormatAudio: music only for provider format, SFX unless disabled, levels per the contract", () => {
  const { data, style } = prepare({ hf: planHf, words, durationSec: 14 });
  const base = { data, style, durationSec: 14 };
  const fmt = buildFormatAudio({ ...base, spec: { title: "T", music: { provider: "format", mood: "tense", volume: 0.12, duck: true }, sfx: { enabled: true } } });
  assert.ok(Buffer.isBuffer(fmt.music.wavBuffer));
  assert.equal(fmt.music.gainDb, -17, "17 dB under the voice");
  assert.ok(fmt.music.duck > 0 && fmt.music.duck <= 4, "shallow duck");
  assert.equal(fmt.info.mood, "tense");
  assert.ok(fmt.sfx.events.length >= 10 && fmt.sfx.events.every((e) => Buffer.isBuffer(e.buffer) && e.at >= 0));
  const again = buildFormatAudio({ ...base, spec: { title: "T", music: { provider: "format", mood: "tense", volume: 0.12, duck: true }, sfx: { enabled: true } } });
  assert.ok(fmt.music.wavBuffer.equals(again.music.wavBuffer), "same spec, same bytes");
  const seeded = buildFormatAudio({ ...base, spec: { title: "T", music: { provider: "format", mood: "tense", seed: 99 }, sfx: { enabled: true } } });
  assert.ok(!seeded.music.wavBuffer.equals(fmt.music.wavBuffer));
  assert.equal(buildFormatAudio({ ...base, spec: { title: "T", music: { provider: "format", duck: false } } }).music.duck, 0);
  for (const provider of ["library", "none", "elevenlabs"]) assert.equal(buildFormatAudio({ ...base, spec: { title: "T", music: { provider } } }).music, undefined, `${provider} is respected`);
  assert.equal(buildFormatAudio({ ...base, spec: { title: "T", music: { provider: "none" }, sfx: { enabled: false } } }).sfx, undefined);
});

/** A speech-like test voice: 150 Hz buzz in 4 Hz syllables with a silent gap in the middle. */
function testVoice(file, dur = 4) {
  const n = Math.floor(dur * 16000), x = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / 16000; const on = t < 1.5 || t > 2.5; x[i] = on ? 0.3 * Math.sin(2 * Math.PI * 150 * t) * Math.max(0, Math.sin(2 * Math.PI * 4 * t)) : 0; }
  writeFileSync(file, encodeWav([x], 16000));
}

test("lip-sync envelope: one value per frame (duration * 30), normalized, follows the voice and is 0 in silence", async () => {
  const f = join(scratch, "voice.wav");
  testVoice(f, 4);
  const env = await voiceEnvelope(f, 4);
  assert.equal(env.length, 4 * 30);
  assert.ok(env.every((v) => v >= 0 && v <= 1));
  assert.ok(Math.max(...env.slice(0, 40)) >= 0.9, "loud while speaking");
  assert.ok(Math.max(...env.slice(Math.floor(1.7 * 30), Math.floor(2.4 * 30))) === 0, "silent gap");
  assert.equal(await voiceEnvelope(join(scratch, "missing.wav"), 4), null);
  assert.equal(envelopeFromSamples(new Float32Array(16000 * 2), 2).length, 60);
  assert.ok(envelopeFromSamples(new Float32Array(16000 * 2), 2).every((v) => v === 0));
});

test("lip-sync: the cast mouth follows SPEC.env when present and falls back to word spans without it", () => {
  const { data, style } = prepare({ hf: planHf, words, durationSec: 14 });
  const env = new Array(14 * 30).fill(0);
  env[30] = 1; env[40] = 0.3; // frame 30 loud; frame 40 half after silence
  const withEnv = open({ data: { ...data, env }, style });
  assert.equal(withEnv.run("talkLevel(1.01)"), 2);
  assert.equal(withEnv.run("talkLevel(1.34)"), 1);
  assert.equal(withEnv.run("talkLevel(5)"), 0, "no voice, closed mouth even inside a word span");
  const plain = open({ data, style });
  const w = words[3];
  assert.ok([0, 1, 2].includes(plain.run(`talkLevel(${w.start + 0.05})`)));
  assert.equal(plain.run("talkLevel(0.1)"), 0);
});

test("compose(): returns audio + envelope, writes env into the composition from voicePath, and stays deterministic", async () => {
  const f = join(scratch, "narr.wav");
  testVoice(f, 14);
  const spec = (over = {}) => ({ title: "Audio test", mode: "multi", hf: planHf, music: { provider: "format", mood: "adventure", seed: 5 }, sfx: { enabled: true }, ...over });
  const run = async (name, extra = {}, s = spec()) => { const dir = join(scratch, name); const r = await compose({ spec: s, words, durationSec: 14, outDir: dir, captions: { enabled: true }, ...extra }); return { r, html: readFileSync(join(dir, "index.html"), "utf8") }; };
  const a = await run("a", { voicePath: f });
  assert.equal(a.r.envelope.length, 14 * 30);
  assert.match(a.html, /"env":\[/);
  assert.ok(a.r.audio.music && a.r.audio.sfx.events.length > 10);
  assert.equal(a.r.audio.info.cues, a.r.audio.sfx.events.length);
  const b = await run("b", { voicePath: f });
  assert.equal(a.html, b.html, "deterministic composition");
  assert.ok(a.r.audio.music.wavBuffer.equals(b.r.audio.music.wavBuffer));
  const none = await run("c");
  assert.equal(none.r.envelope, null);
  assert.ok(!/"env":\[/.test(none.html), "no voice file: mouth falls back to word spans");
  const bad = await run("d", { voicePath: join(scratch, "nope.wav") });
  assert.equal(bad.r.envelope, null);
  assert.ok(bad.r.warnings.some((w) => /lip-sync/.test(w)));
  const lib = await run("e", {}, spec({ music: { provider: "library", mood: "auto" } }));
  assert.equal(lib.r.audio.music, undefined, "library music is the engine's job");
  assert.ok(Array.isArray(lib.r.sfx), "the legacy sfx cues are still returned");
  void prng;
});
