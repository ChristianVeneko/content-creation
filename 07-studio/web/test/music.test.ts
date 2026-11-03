// Music library API, preview hardening, and the music options → spec mapping.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createApp } from "../server/app.ts";
import { readConfig } from "../server/config.ts";
import { applyOptions } from "../server/specGen.ts";
import { DEFAULT_MUSIC, FORMAT_DUCK_DB, FORMAT_MOODS, applyMusicOptions, formatMusicAvailable, formatMusicLevelDb, musicDuckedDb, musicForTemplate, musicLevelDb, musicOptionsFromSpec, sfxLevelDb } from "../shared/music.ts";
import type { GenerateOptions, VideoSpec } from "../shared/types.ts";
type Json = any;

const fakeEngine = fileURLToPath(new URL("./fixtures/fake-engine.mjs", import.meta.url));
const scratch = mkdtempSync(path.join(process.env.TMPDIR ?? os.tmpdir(), "studio-music-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));
const musicDir = path.join(scratch, "music");
mkdirSync(path.join(musicDir, "tech-lofi"), { recursive: true });
writeFileSync(path.join(musicDir, "tech-lofi", "fake-lofi.mp3"), "ID3fakeaudio");
writeFileSync(path.join(scratch, "secret.mp3"), "secret");
mkdirSync(path.join(scratch, "projects"));

const config = { ...readConfig({}), engineCli: fakeEngine, engineDir: path.dirname(fakeEngine), projectsDir: path.join(scratch, "projects"), musicDir };
const { app } = createApp(config);

test("GET /api/music returns moods, tracks without file paths, and ElevenLabs availability without the key", async () => {
  const prev = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "sk-secret-value";
  try {
    const res = await app.request("/api/music");
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(!text.includes("sk-secret-value"), "never leaks the key");
    const body = JSON.parse(text) as Json;
    assert.deepEqual(body.moods.map((m: Json) => m.id), ["tech-lofi", "upbeat-fun"]);
    assert.equal(body.tracks[0].id, "fake-lofi");
    assert.equal(body.tracks[0].credit, "Fake Lofi by Tester (CC BY 4.0)");
    assert.equal(body.tracks[0].file, undefined, "no file paths in the API");
    assert.deepEqual(body.elevenlabs, { available: true });
  } finally {
    if (prev === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = prev;
  }
  const off = (await (await app.request("/api/music")).json()) as Json;
  if (!process.env.ELEVENLABS_API_KEY) assert.equal(off.elevenlabs.available, false);
});

test("GET /api/music/:id/preview streams a library track with range support", async () => {
  const full = await app.request("/api/music/fake-lofi/preview");
  assert.equal(full.status, 200);
  assert.equal(full.headers.get("content-type"), "audio/mpeg");
  assert.equal(await full.text(), "ID3fakeaudio");
  const part = await app.request("/api/music/fake-lofi/preview", { headers: { range: "bytes=0-2" } });
  assert.equal(part.status, 206);
  assert.equal(await part.text(), "ID3");
});

test("preview rejects ids that are not in the library and paths escaping the music folder", async () => {
  for (const id of ["nope", "..%2Fsecret", "escape", "%2e%2e", "fake-lofi%2F..%2F..%2Fsecret"]) {
    const res = await app.request(`/api/music/${id}/preview`);
    assert.equal(res.status, 404, id);
  }
});

test("level math matches the engine: 0.12 → −13 dB, ducked −22 dB, SFX 1 → −12 dB", () => {
  assert.equal(musicLevelDb(0.12), -13);
  assert.equal(musicDuckedDb(0.12), -22);
  assert.equal(musicLevelDb(0.24), -7);
  assert.equal(sfxLevelDb(1), -12);
  assert.equal(sfxLevelDb(0.5), -18);
});

const base = { version: 1, title: "Café", template: "illustrated", scenes: [{ id: "s1", narration: "Hola", visual: { type: "gradient" } }] };
const opts: GenerateOptions = { language: "es", durationSec: 30, tone: "Divertido", voiceProvider: "kokoro", captionStyle: "hormozi", platform: "all" };

test("music options flow into the generated spec (library mood + track, volumes, tone)", () => {
  const music = { ...DEFAULT_MUSIC, mood: "upbeat-fun", track: "fake-lofi", volume: 0.24, sfxVolume: 0.5 };
  const spec = applyOptions(structuredClone(base), "illustrated", { ...opts, music });
  assert.deepEqual(spec.music, { provider: "library", mood: "upbeat-fun", volume: 0.24, duck: true, track: "fake-lofi", tone: "Divertido" });
  assert.deepEqual(spec.sfx, { enabled: true, volume: 0.5 });
  assert.deepEqual(musicOptionsFromSpec(spec), { enabled: true, provider: "library", mood: "upbeat-fun", track: "fake-lofi", volume: 0.24, sfxVolume: 0.5, prompt: "" });
});

test("music options: ElevenLabs with prompt, music off, and SFX off", () => {
  const el = applyMusicOptions(structuredClone(base) as unknown as VideoSpec, { ...DEFAULT_MUSIC, provider: "elevenlabs", prompt: "  synthwave  ", track: "ignored" });
  assert.equal(el.music?.provider, "elevenlabs");
  assert.equal(el.music?.prompt, "synthwave");
  assert.equal(el.music?.track, undefined, "track only applies to the library");
  const off = applyMusicOptions(structuredClone(base) as unknown as VideoSpec, { ...DEFAULT_MUSIC, enabled: false, sfxVolume: 0 });
  assert.equal(off.music?.provider, "none");
  assert.deepEqual(off.sfx, { enabled: false, volume: 1 });
  assert.equal(musicOptionsFromSpec(off).enabled, false);
  assert.equal(musicOptionsFromSpec(off).sfxVolume, 0);
});

test("without music options the model's spec is left alone (older clients)", () => {
  const spec = applyOptions({ ...structuredClone(base), music: { volume: 0.1 } }, "illustrated", opts);
  assert.deepEqual(spec.music, { volume: 0.1 });
  assert.equal(spec.sfx, undefined);
});

test("format chiptune: only formats that make their own music get provider format; moods, levels and fallbacks", () => {
  const pixel = { template: "pixel-world", scenes: [] } as unknown as VideoSpec;
  const kinetic = { template: "kinetic-type", scenes: [] } as unknown as VideoSpec;
  assert.ok(formatMusicAvailable("pixel-world") && !formatMusicAvailable("kinetic-type") && !formatMusicAvailable(undefined));
  assert.deepEqual(FORMAT_MOODS.map((m) => m.id), ["adventure", "calm", "tense", "playful", "mystery"]);
  const fmt = { ...DEFAULT_MUSIC, provider: "format" as const, mood: "tense" };
  const m = applyMusicOptions(pixel, fmt).music;
  assert.deepEqual({ provider: m?.provider, mood: m?.mood, duck: m?.duck, track: m?.track, prompt: m?.prompt }, { provider: "format", mood: "tense", duck: true, track: undefined, prompt: undefined });
  assert.equal(applyMusicOptions(pixel, { ...fmt, mood: "tech-lofi", track: "x" }).music?.mood, "auto", "a library mood is not a format mood");
  const other = applyMusicOptions(kinetic, fmt).music;
  assert.equal(other?.provider, "library", "other templates never get provider format");
  assert.equal(other?.mood, "auto");
  assert.equal(applyMusicOptions(pixel, { ...DEFAULT_MUSIC, mood: "adventure" }).music?.mood, "auto", "switching back to the library clears a format mood");
  assert.equal(applyMusicOptions(pixel, { ...fmt, enabled: false }).music?.provider, "none", "none is respected");
  assert.equal(applyMusicOptions(pixel, { ...DEFAULT_MUSIC, mood: "upbeat-fun" }).music?.mood, "upbeat-fun", "library keeps working");
  assert.equal(musicOptionsFromSpec({ music: { provider: "format", mood: "calm", volume: 0.12 } } as unknown as VideoSpec).provider, "format");
  assert.equal(formatMusicLevelDb(0.12), -17);
  assert.equal(formatMusicLevelDb(0.24), -11);
  assert.ok(FORMAT_DUCK_DB <= 4);
});

test("musicForTemplate: the chiptune is the default of formats that make their own music, the user's other choices are kept", () => {
  assert.equal(musicForTemplate(DEFAULT_MUSIC, "pixel-world").provider, "format");
  assert.equal(musicForTemplate(DEFAULT_MUSIC, "kinetic-type").provider, "library");
  const picked = { ...DEFAULT_MUSIC, mood: "upbeat-fun" };
  assert.equal(musicForTemplate(picked, "pixel-world"), picked, "a library choice is respected");
  const el = { ...DEFAULT_MUSIC, provider: "elevenlabs" as const };
  assert.equal(musicForTemplate(el, "pixel-world"), el);
  const back = musicForTemplate({ ...DEFAULT_MUSIC, provider: "format", mood: "calm" }, "flat-2d");
  assert.deepEqual({ p: back.provider, m: back.mood }, { p: "library", m: "auto" });
});
