import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { normalizeSpeech, probeDuration, run } from "../lib/media.mjs";

// tone 1 s, silence 1 s, tone 1 s
async function fixture(dir) {
  const f = join(dir, "in.wav");
  await run("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=300:duration=1", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono:d=1", "-f", "lavfi", "-i", "sine=frequency=300:duration=1", "-filter_complex", "[0:a][1:a][2:a]concat=n=3:v=0:a=1[o]", "-map", "[o]", "-ar", "48000", f]);
  return f;
}

test("tighten shrinks a long pause to about 0.12 s and leaves the speech alone", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tighten-"));
  try {
    const input = await fixture(dir);
    const plain = await normalizeSpeech(input, join(dir, "plain.wav"));
    const tight = await normalizeSpeech(input, join(dir, "tight.wav"), { tighten: true });
    assert.ok(plain > 2.9, `without tighten the pause stays (${plain})`);
    assert.ok(tight > 2.05 && tight < 2.4, `with tighten the 1 s pause becomes ~0.12 s (${tight})`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
