// Rhythm check (port of the becario-reels ritmo.py): ">0.6 s without visual change" on a rendered clip.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setupEnv } from "../lib/env.mjs";

setupEnv(); // keeps os.tmpdir() inside the repo and puts 05-tools/bin first on PATH

const script = fileURLToPath(new URL("../../../02-scripts/rhythm-check.mjs", import.meta.url));
const { analyzeVideo, findGaps } = await import(script);

test("findGaps reports only still stretches longer than the limit", () => {
  // 30 fps: 10 moving, 25 still (0.83 s), 10 moving, 15 still (0.5 s), 5 moving
  const ev = [...Array(10).fill(true), ...Array(25).fill(false), ...Array(10).fill(true), ...Array(15).fill(false), ...Array(5).fill(true)];
  const gaps = findGaps(ev, 30, 0.6);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].start, Number((11 / 30).toFixed(2)));
  assert.equal(gaps[0].length, Number((25 / 30).toFixed(2)));
  assert.deepEqual(findGaps(ev, 30, 0.9), []);
});

test("rhythm check finds the frozen stretch of a synthetic clip and passes a moving one", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rhythm-test-"));
  try {
    const ff = (args) => assert.equal(spawnSync("ffmpeg", ["-v", "error", "-y", ...args]).status, 0);
    // 1 s moving test pattern, then 1.5 s frozen frame, then 1 s moving again
    const moving = join(dir, "moving.mp4");
    ff(["-f", "lavfi", "-i", "testsrc2=s=270x480:r=30:d=1", "-pix_fmt", "yuv420p", moving]);
    const clip = join(dir, "clip.mp4");
    ff(["-i", moving, "-filter_complex", "[0:v]split=3[a][b][c];[b]trim=start_frame=29:end_frame=30,setpts=PTS-STARTPTS,loop=44:1:0,setpts=N/30/TB[f];[a][f][c]concat=n=3:v=1:a=0[v]", "-map", "[v]", "-r", "30", "-pix_fmt", "yuv420p", clip]);

    const r = await analyzeVideo(clip, { gapSec: 0.6 });
    assert.equal(r.fps, 30);
    assert.ok(Math.abs(r.durationSec - 3.5) < 0.1, `duration ${r.durationSec}`);
    assert.equal(r.gaps.length, 1);
    assert.ok(r.gaps[0].length >= 1.3 && r.gaps[0].length <= 1.6, `gap ${JSON.stringify(r.gaps[0])}`);
    assert.ok(r.gaps[0].start >= 0.9 && r.gaps[0].start <= 1.2);

    // CLI: exit 1 with HUECOS-style report, JSON output; exit 0 for the moving clip
    const out = join(dir, "report.json");
    const bad = spawnSync(process.execPath, [script, clip, "--json", out], { encoding: "utf8" });
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /GAPS/);
    assert.equal(JSON.parse(readFileSync(out, "utf8")).gaps.length, 1);
    const ok = spawnSync(process.execPath, [script, moving], { encoding: "utf8" });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.match(ok.stdout, /OK/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
