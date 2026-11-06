#!/usr/bin/env node
// Music bed for an opuscar film, mixed with the 07-studio engine's own audio bed (same as the web client):
// a vetted library track (03-assets/music/library.json), unducked 13 dB under the voice at volume 0.12,
// dipping 9 dB more while words are spoken (smooth attack/release from ElevenLabs word timings).
//
// Usage (from the repo root, after `source ./env.sh`):
//   node 05-tools/opuscar/core/post/engine_bed.mjs --narration voice.wav --words voices/words.json \
//     --timeline timeline.json --total 38.5 --out music_bed.wav [--music score.wav | --mood tech-lofi | --track <id>] [--volume 0.12] [--seed <text>]
//
// --music takes any music file (e.g. the film's own synthesized score, rendered WITHOUT ducking or level tweaks):
// the engine sets its level and ducking. Without --music a library track is picked.
//
// --words is the words.json written by core/tts/tts_eleven.py ({lineId: [[word, start, end], ...]}, times relative to each line).
// --timeline maps each line id to its start (s) in the film: {"l01": 0.4, "l02": 3.9, ...}. Without it the words are
// taken as absolute times. The bed WAV holds only the music: mix it with the voice and the film's SFX, then normalize
// the master to -14 LUFS. Prints the chosen track (put its credit in brief.md) and the levels as JSON.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildBed } from "../../../../07-studio/engine/lib/audio-bed.mjs";
import { loadLibrary, pickLibraryTrack, MUSIC_REF, DUCK, musicLevelDb, musicDuckedLevelDb } from "../../../../07-studio/engine/lib/music.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]?.startsWith("--") ? true : all[i + 1]]] : acc), []),
);
const need = (k) => {
  if (!args[k] || args[k] === true) {
    console.error(`engine_bed: missing --${k}`);
    process.exit(2);
  }
  return args[k];
};

const narration = resolve(need("narration"));
const totalSec = Number(need("total"));
const out = resolve(need("out"));
const volume = args.volume ? Number(args.volume) : MUSIC_REF.volume;
const words = JSON.parse(readFileSync(resolve(need("words")), "utf8"));
const timeline = args.timeline ? JSON.parse(readFileSync(resolve(args.timeline), "utf8")) : null;

const captions = [];
for (const [line, list] of Object.entries(words)) {
  const off = timeline ? Number(timeline[line] ?? NaN) : 0;
  if (!Number.isFinite(off)) continue;
  for (const [, s, e] of list) captions.push({ startMs: (off + s) * 1000, endMs: (off + e) * 1000 });
}
captions.sort((a, b) => a.startMs - b.startMs);

const own = args.music && args.music !== true ? resolve(args.music) : null;
const { tracks } = own ? { tracks: [] } : loadLibrary();
const track = own
  ? { id: "own-score", title: "Original score (made in code)", artist: "-", license: "own", credit: null, path: own, firstBeat: 0 }
  : pickLibraryTrack({ tracks, track: args.track, mood: args.mood ?? "tech-lofi", totalSec, seed: args.seed ?? out });
if (!track) {
  console.error("engine_bed: no library track available (03-assets/music/library.json)");
  process.exit(1);
}

const stats = await buildBed({
  events: [],
  samples: {},
  sfxVolume: 0,
  music: { file: track.path, firstBeat: track.firstBeat },
  musicVolume: volume,
  duck: true,
  captions,
  narration,
  totalSec,
  out,
});

console.log(
  JSON.stringify(
    {
      out,
      track: { id: track.id, title: track.title, artist: track.artist, license: track.license, credit: track.credit, sourceUrl: track.sourceUrl ?? null },
      levels: { underVoiceDb: musicLevelDb(volume), underVoiceWhileSpeakingDb: musicDuckedLevelDb(volume), duck: DUCK },
      speechWords: captions.length,
      ...stats,
    },
    null,
    2,
  ),
);
