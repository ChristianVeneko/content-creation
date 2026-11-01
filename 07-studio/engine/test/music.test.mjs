import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setupEnv } from "../lib/env.mjs";
import {
  DUCK,
  MOODS,
  autoMood,
  isAllowedLicense,
  loadLibrary,
  musicDuckedLevelDb,
  musicLengthMs,
  musicLevelDb,
  pickLibraryTrack,
  resolveMusic,
  sfxLevelDb,
} from "../lib/music.mjs";
import { musicGainDb, speechIntervals } from "../lib/audio-bed.mjs";
import { validateSpec } from "../lib/spec.mjs";

setupEnv(); // keeps os.tmpdir() inside the repo
const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const base = { version: 1, title: "t", template: "countdown", scenes: [{ id: "a", narration: "hola", visual: { type: "gradient" } }] };

/** A throwaway music root with a library.json and tiny audio files. */
function fakeRoot(entries) {
  // Nest the library one level down so a path-escape fixture ("../x") stays inside the temp dir.
  const root = join(mkdtempSync(join(tmpdir(), "music-test-")), "lib");
  mkdirSync(root);
  for (const e of entries) {
    if (!e.file) continue;
    mkdirSync(join(root, e.file, ".."), { recursive: true });
    writeFileSync(join(root, e.file), "x");
  }
  writeFileSync(join(root, "library.json"), JSON.stringify(entries));
  return root;
}
const entry = (id, mood, license = "CC BY 4.0", extra = {}) => ({ id, mood, title: id, artist: "a", file: `${mood}/${id}.mp3`, durationSec: 120, license, credit: `credit ${id}`, ...extra });

test("bundled library.json: every entry is commercial-safe, credited, on disk, and every mood has 4+ tracks", () => {
  const { tracks, rejected } = loadLibrary();
  assert.deepEqual(rejected, [], "no entry of the real library is rejected");
  for (const t of tracks) {
    assert.ok(isAllowedLicense(t.license), `${t.id} license ${t.license}`);
    assert.ok(t.credit && t.credit.length > 10, `${t.id} credit`);
    assert.ok(existsSync(t.path), `${t.id} file`);
    assert.ok(t.durationSec >= 60, `${t.id} is at least 60 s`);
    for (const k of ["title", "artist", "licenseUrl", "sourceUrl"]) assert.ok(t[k], `${t.id} ${k}`);
  }
  for (const mood of MOODS) assert.ok(tracks.filter((t) => t.mood === mood).length >= 4, `mood ${mood} has at least 4 tracks`);
});

test("library loader rejects NC, ND and SA licenses, missing credits, unknown moods and path escapes", () => {
  const root = fakeRoot([
    entry("ok-by", "tech-lofi"),
    entry("ok-cc0", "tech-lofi", "CC0 1.0"),
    entry("nc", "tech-lofi", "CC BY-NC 4.0"),
    entry("nd", "tech-lofi", "CC BY-ND 4.0"),
    entry("sa", "tech-lofi", "CC BY-SA 4.0"),
    entry("nocredit", "tech-lofi", "CC BY 4.0", { credit: "" }),
    entry("badmood", "polka"),
    { ...entry("escape", "tech-lofi"), file: "../outside.mp3" },
  ]);
  const { tracks, rejected } = loadLibrary(root);
  assert.deepEqual(tracks.map((t) => t.id), ["ok-by", "ok-cc0"]);
  assert.deepEqual(rejected.map((r) => r.id).sort(), ["badmood", "escape", "nc", "nd", "nocredit", "sa"]);
  assert.equal(isAllowedLicense("CC BY-NC-SA 3.0"), false);
  rmSync(join(root, ".."), { recursive: true, force: true });
});

test("autoMood is deterministic and every mood is reachable", () => {
  const cases = {
    "tech-lofi": { title: "Cómo programar con IA: SDD vs ODD", template: "illustrated" },
    "cinematic-epic": { title: "La historia épica del imperio romano", template: "kinetic-type" },
    "tense-mystery": { title: "El misterio del hack que nadie vio", template: "illustrated" },
    "inspiring-uplifting": { title: "3 hábitos para el éxito en el gimnasio", template: "captions-voice" },
    "minimal-ambient": { title: "Una frase para meditación y calma", template: "letterbox" },
    "upbeat-fun": { title: "Datos curiosos y divertidos de la comida", template: "countdown" },
    "corporate-happy": { title: "Marketing para tu negocio y ventas", template: "glass-cards" },
  };
  for (const [mood, spec] of Object.entries(cases)) {
    assert.equal(autoMood(spec), mood, spec.title);
    assert.equal(autoMood(spec), autoMood(structuredClone(spec)), "same input, same mood");
  }
  // tone wins over keywords; no signal falls back to the template
  assert.equal(autoMood({ title: "Cómo programar con IA", music: { tone: "dramático" } }), "cinematic-epic");
  assert.equal(autoMood({ title: "zzz", template: "broadcast" }), "tense-mystery");
  assert.equal(autoMood({ title: "zzz", template: "editor-window" }), "tech-lofi");
});

test("pickLibraryTrack: explicit id, mood pool, deterministic seed, and no repeat of the previous render", () => {
  const tracks = ["a", "b", "c"].map((id) => ({ ...entry(id, "tech-lofi"), firstBeat: 0 })).concat([{ ...entry("z", "upbeat-fun"), firstBeat: 0 }]);
  assert.equal(pickLibraryTrack({ tracks, track: "z", mood: "tech-lofi" }).id, "z");
  const first = pickLibraryTrack({ tracks, mood: "tech-lofi", seed: "same title" });
  assert.equal(first.mood, "tech-lofi");
  assert.equal(pickLibraryTrack({ tracks, mood: "tech-lofi", seed: "same title" }).id, first.id, "deterministic");
  const next = pickLibraryTrack({ tracks, mood: "tech-lofi", seed: "same title", recent: [first.id] });
  assert.notEqual(next.id, first.id, "the previous render's track is avoided");
  assert.equal(pickLibraryTrack({ tracks, mood: "upbeat-fun", seed: "x", recent: ["z"] }).id, "z", "repeats when it is the only option");
});

test("levels: 0.12 is 13 dB under the voice, ducking dips 9 dB more, SFX 1 is 12 dB under", () => {
  assert.equal(musicLevelDb(0.12), -13);
  assert.equal(musicLevelDb(0.24), -7);
  assert.equal(musicLevelDb(0.06), -19);
  assert.equal(musicDuckedLevelDb(0.12), -22);
  assert.equal(musicDuckedLevelDb(0.12, false), -13);
  assert.equal(sfxLevelDb(1), -12);
  assert.equal(sfxLevelDb(0.5), -18);
  assert.equal(musicLevelDb(0), -Infinity);
});

test("ducking gain: speech is lowered by the duck depth, pauses are not, ramps are smooth", () => {
  const intervals = speechIntervals([{ startMs: 2000, endMs: 4000 }, { startMs: 8000, endMs: 9000 }]);
  const g = (t) => musicGainDb(t, intervals, 20, DUCK.depthDb);
  assert.ok(DUCK.depthDb >= 8 && DUCK.depthDb <= 10);
  assert.equal(g(3), -DUCK.depthDb, "during speech");
  assert.equal(g(6), 0, "in a pause");
  const before = g(2 - DUCK.attackSec / 2);
  assert.ok(before < 0 && before > -DUCK.depthDb, "attack ramps before the word");
  const after = g(4 + DUCK.releaseSec / 2);
  assert.ok(after < 0 && after > -DUCK.depthDb, "release ramps after the word");
  assert.ok(g(4 + DUCK.releaseSec * 0.25) < g(4 + DUCK.releaseSec * 0.75), "release rises monotonically");
});

test("provider elevenlabs falls back to the library on an API error and logs it", async () => {
  const root = fakeRoot([entry("lofi-1", "tech-lofi"), entry("lofi-2", "tech-lofi")]);
  const logs = [];
  const fetchImpl = async () => new Response("quota exceeded", { status: 401 });
  const spec = { ...base, title: "Cómo programar con IA", music: { provider: "elevenlabs", mood: "auto" } };
  const prevKey = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "test-key";
  try {
    const r = await resolveMusic(spec, { totalSec: 20, root, fetchImpl, log: (m) => logs.push(m), history: false });
    assert.equal(r.mood, "tech-lofi");
    assert.match(r.track.id, /^lofi-/);
    assert.equal(r.track.credit, `credit ${r.track.id}`);
    assert.ok(logs.some((l) => /ElevenLabs Music failed \(401\).*falling back/.test(l)), logs.join("\n"));
  } finally {
    if (prevKey === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = prevKey;
    rmSync(join(root, ".."), { recursive: true, force: true });
  }
});

test("provider elevenlabs: instrumental request sized to the video, cached under generated/ with credit", async () => {
  const root = fakeRoot([entry("lofi-1", "tech-lofi")]);
  let calls = 0;
  let body;
  const fetchImpl = async (url, init) => {
    calls++;
    body = JSON.parse(init.body);
    assert.match(url, /\/v1\/music\?/);
    return new Response(new Uint8Array(4000), { status: 200, headers: { "song-id": "abc" } });
  };
  const spec = { ...base, music: { provider: "elevenlabs", mood: "upbeat-fun", prompt: "funky bass" } };
  const opts = { totalSec: 20.2, root, fetchImpl, history: false, log: () => {} };
  const prevKey = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "test-key";
  try {
    const r = await resolveMusic(spec, opts);
    assert.equal(body.music_length_ms, 21000, "rounded up to whole seconds");
    assert.equal(body.force_instrumental, true);
    assert.match(body.prompt, /^funky bass/);
    assert.ok(r.track.file.startsWith(join(root, "generated")));
    assert.equal(r.track.credit, "Music: generated with ElevenLabs Music");
    const again = await resolveMusic(spec, opts);
    assert.equal(calls, 1, "second render reuses the cache");
    assert.equal(again.track.file, r.track.file);
    assert.equal(JSON.parse(readFileSync(r.track.file.replace(/\.mp3$/, ".json"), "utf8")).response["song-id"], "abc");
  } finally {
    if (prevKey === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = prevKey;
    rmSync(join(root, ".."), { recursive: true, force: true });
  }
  assert.equal(musicLengthMs(1), 3000, "API minimum");
});

test("provider none: no music at all", async () => {
  const r = await resolveMusic({ ...base, music: { provider: "none", file: "x.mp3" } }, { totalSec: 10, history: false });
  assert.equal(r.track, null);
});

test("spec validation: new music fields", () => {
  assert.equal(validateSpec({ ...base, music: { provider: "library", mood: "auto", volume: 0.2, duck: true } }).ok, true);
  assert.equal(validateSpec({ ...base, music: { provider: "elevenlabs", prompt: "lofi", tone: "chill" } }).ok, true);
  assert.equal(validateSpec({ ...base, music: { track: "happy-beats-business-moves-vol-1-by-ende-dot-app", volume: 0.12 } }).ok, true, "old specs still validate");
  const bad = (music) => validateSpec({ ...base, music }).errors.map((e) => e.path);
  assert.deepEqual(bad({ provider: "spotify" }), ["music.provider"]);
  assert.deepEqual(bad({ mood: "polka" }), ["music.mood"]);
  assert.deepEqual(bad({ volume: 1.5 }), ["music.volume"]);
  assert.deepEqual(bad({ provider: "library", prompt: "x" }), ["music.prompt"]);
});

test("cli music prints moods with labels, tracks with credits and the level references", () => {
  const r = spawnSync(process.execPath, [cli, "music"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(out.moods.map((m) => m.id), MOODS);
  assert.ok(out.moods.every((m) => m.label && m.count >= 4));
  assert.ok(out.tracks.length >= MOODS.length * 4);
  for (const t of out.tracks) {
    assert.ok(t.credit && t.license && t.file && t.mood);
    assert.equal(t.path, undefined, "no absolute paths");
  }
  assert.equal(out.levels.music.volume, 0.12);
});
