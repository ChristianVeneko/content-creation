// Small ffmpeg/ffprobe/child-process helpers.
import { spawn } from "node:child_process";

/** Run a command; resolves {stdout, stderr}; rejects with the stderr tail on non-zero exit. */
export function run(cmd, args, { input, env } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { env: env ?? process.env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("error", (e) => reject(new Error(`${cmd}: ${e.message}`)));
    p.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited with ${code}: ${(stderr || stdout).trim().split("\n").slice(-6).join(" | ")}`));
    });
    if (input !== undefined) p.stdin.end(input);
    else p.stdin.end();
  });
}

export async function probeDuration(file) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]);
  const d = parseFloat(stdout.trim());
  if (!Number.isFinite(d)) throw new Error(`Could not read duration of ${file}`);
  return d;
}

/** Normalize any audio file to 48 kHz mono WAV and trim leading/trailing silence. */
export const SPEECH_TIGHTEN = { maxPauseSec: 0.2, keepPauseSec: 0.12, compressor: "acompressor=threshold=-18dB:ratio=2:attack=10:release=120:makeup=2" };
/**
 * `tighten` (PIXEL guide voice chain, off by default): pauses longer than 0.2 s inside the narration shrink to 0.12 s and a real
 * 2:1 compressor evens the level. The compressor is a smooth envelope follower, never a per-sample process (that sounds robotic).
 */
export async function normalizeSpeech(input, output, { tighten = false } = {}) {
  const trim = "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05";
  const mid = tighten ? `,silenceremove=stop_periods=-1:stop_duration=${SPEECH_TIGHTEN.maxPauseSec}:stop_threshold=-45dB:stop_silence=${SPEECH_TIGHTEN.keepPauseSec},${SPEECH_TIGHTEN.compressor}` : "";
  await run("ffmpeg", ["-y", "-v", "error", "-i", input, "-af", `${trim},areverse,${trim},areverse${mid}`, "-ar", "48000", "-ac", "1", output]);
  return probeDuration(output);
}

/** Place each clip at its offset (ms) on a silent track of `totalSec`, loudness-normalized to -14 LUFS. */
export async function mixAtOffsets(clips, totalSec, output) {
  const args = ["-y", "-v", "error"];
  clips.forEach((c) => args.push("-i", c.file));
  const parts = clips.map((c, i) => `[${i}:a]adelay=${Math.max(0, Math.round(c.offsetMs))}:all=1[a${i}]`);
  const mix = `${clips.map((_, i) => `[a${i}]`).join("")}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad,atrim=0:${totalSec.toFixed(3)},loudnorm=I=-14:TP=-1.5:LRA=11[out]`;
  args.push("-filter_complex", [...parts, mix].join(";"), "-map", "[out]", "-ar", "48000", "-ac", "2", output);
  await run("ffmpeg", args);
}
