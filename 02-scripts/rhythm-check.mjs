#!/usr/bin/env node
// Rhythm check for a rendered reel: finds stretches where nothing changes on screen for more than 0.6 s.
// Node port of the becario-reels pack's ritmo.py ("nada quieto más de 0,6 s").
//
// Usage:
//   node 02-scripts/rhythm-check.mjs <video.mp4> [--gap 0.6] [--threshold 1.5] [--detail 6] [--json report.json]
//
// How it measures (same method as ritmo.py):
//   - The video is decoded with 05-tools/bin/ffmpeg to 540x960 grayscale.
//   - A frame "has an event" if the mean difference with the previous frame passes --threshold (0-255 scale) in any
//     of three screen zones (top, middle, bottom), or if any 90x80 px tile differs from two frames back by more than
//     --detail. The first catches cards, icons and big changes; the second small things like each subtitle word.
//     Slow camera pushes and drifting background lights stay under both.
//   - A gap is a run of frames without events longer than --gap seconds.
// Prints the share of still frames, motion starts per second and every gap; exits 1 when there is a gap.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const W = 540;
const H = 960;
const ZONES = [
  [0, 300],
  [300, 640],
  [640, 960],
];
const TW = 90;
const TH = 80;

const CC_ROOT = process.env.CC_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** The workspace ffmpeg (05-tools/bin, with libass), else the one on PATH. */
export const ffmpegBin = () => {
  const local = join(CC_ROOT, "05-tools", "bin", "ffmpeg");
  return existsSync(local) ? local : "ffmpeg";
};

/** Frame rate from ffmpeg's stream info. */
export function probeFps(video, ff = ffmpegBin()) {
  const out = spawnSync(ff, ["-hide_banner", "-i", video], { encoding: "utf8" }).stderr || "";
  const m = /(\d+(?:\.\d+)?) fps/.exec(out);
  return m ? Number(m[1]) : 30;
}

/**
 * Runs of event-free frames longer than `gapSec`. `events[k]` is the event flag of frame k + 1 (frame 0 has
 * nothing to compare with). Times are rounded to 0.01 s, like ritmo.py.
 */
export function findGaps(events, fps, gapSec = 0.6) {
  const gaps = [];
  const r = (x) => Number(x.toFixed(2));
  for (let i = 0; i < events.length; ) {
    if (events[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < events.length && !events[j]) j++;
    const length = (j - i) / fps;
    if (length > gapSec) gaps.push({ start: r((i + 1) / fps), end: r((j + 1) / fps), length: r(length) });
    i = j;
  }
  return gaps;
}

/**
 * Decode a video and measure its visual rhythm.
 * @returns {Promise<{fps: number, durationSec: number, stillPct: number, startsPerSec: number, gaps: {start: number, end: number, length: number}[]}>}
 */
export async function analyzeVideo(video, { gapSec = 0.6, threshold = 1.5, detail = 6, ff = ffmpegBin() } = {}) {
  const fps = probeFps(video, ff);
  const size = W * H;
  const events = [];
  let prev1 = null; // previous frame
  let prev2 = null; // two frames back
  let pending = Buffer.alloc(0);
  const tiles = new Float64Array((W / TW) * (H / TH));
  const onFrame = (fr) => {
    if (prev1) {
      let ev = false;
      for (const [y0, y1] of ZONES) {
        let sum = 0;
        for (let k = y0 * W; k < y1 * W; k++) sum += Math.abs(fr[k] - prev1[k]);
        if (sum / ((y1 - y0) * W) > threshold) ev = true;
      }
      if (!ev) {
        const ref = prev2 ?? prev1;
        tiles.fill(0);
        for (let y = 0; y < H; y++) {
          const row = y * W;
          const ty = Math.floor(y / TH) * (W / TW);
          for (let x = 0; x < W; x++) tiles[ty + Math.floor(x / TW)] += Math.abs(fr[row + x] - ref[row + x]);
        }
        let max = 0;
        for (const t of tiles) max = Math.max(max, t / (TW * TH));
        if (max > detail) ev = true;
      }
      events.push(ev);
    }
    prev2 = prev1;
    prev1 = fr;
  };
  await new Promise((res, rej) => {
    const p = spawn(ff, ["-hide_banner", "-loglevel", "error", "-i", video, "-vf", `scale=${W}:${H}`, "-f", "rawvideo", "-pix_fmt", "gray", "-"]);
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.stdout.on("data", (chunk) => {
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
      while (pending.length >= size) {
        onFrame(Uint8Array.from(pending.subarray(0, size)));
        pending = pending.subarray(size);
      }
    });
    p.on("error", rej);
    p.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}: ${err.trim().slice(0, 300)}`))));
  });
  if (!events.length) throw new Error(`could not read frames from ${video}`);
  const n = events.length + 1;
  const durationSec = n / fps;
  const still = events.filter((e) => !e).length;
  let starts = events[0] ? 1 : 0;
  for (let k = 1; k < events.length; k++) if (events[k] && !events[k - 1]) starts++;
  return { fps, durationSec: Number(durationSec.toFixed(2)), stillPct: Number(((100 * still) / events.length).toFixed(1)), startsPerSec: Number((starts / durationSec).toFixed(2)), gaps: findGaps(events, fps, gapSec) };
}

async function main() {
  const args = process.argv.slice(2);
  const opt = { gapSec: 0.6, threshold: 1.5, detail: 6 };
  let video = null;
  let json = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--gap") opt.gapSec = Number(args[++i]);
    else if (a === "--threshold") opt.threshold = Number(args[++i]);
    else if (a === "--detail") opt.detail = Number(args[++i]);
    else if (a === "--json") json = args[++i];
    else if (a === "-h" || a === "--help") video = null;
    else video = a;
  }
  if (!video) {
    console.error("Usage: node 02-scripts/rhythm-check.mjs <video.mp4> [--gap 0.6] [--threshold 1.5] [--detail 6] [--json report.json]");
    return 2;
  }
  const r = await analyzeVideo(video, opt);
  console.log(`duration ${r.durationSec.toFixed(2)} s · ${Math.round(r.fps)} fps · still frames ${r.stillPct}% · motion starts ${r.startsPerSec}/s`);
  if (r.gaps.length) {
    console.log(`GAPS longer than ${opt.gapSec} s with nothing new on screen: ${r.gaps.length}`);
    for (const g of r.gaps) console.log(`  ${g.start.toFixed(2).padStart(6)}-${g.end.toFixed(2)} s (${g.length.toFixed(2)} s)`);
    console.log("Fix: make something enter or change in that stretch (move an `en` moment to a later word, use a scene with more moments, or split the sentence).");
  } else console.log(`OK: no stretch longer than ${opt.gapSec} s without motion.`);
  if (json) writeFileSync(json, JSON.stringify(r, null, 1) + "\n");
  return r.gaps.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(e.message);
      process.exit(2);
    },
  );
}
