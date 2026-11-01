import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTimeline, syntheticCaptions, paginateCaptions, TIMING } from "../lib/timeline.mjs";

const fps = 30;

test("scene duration follows audio length plus padding and transition overlap", () => {
  const tl = computeTimeline([{ audioSec: 2, narration: "a" }, { audioSec: 3, narration: "b" }], { fps, transitionFrames: 12 });
  const first = Math.ceil((TIMING.leadSec + 2 + TIMING.tailSec) * fps) + 12;
  const last = Math.ceil((TIMING.leadSec + 3 + TIMING.tailSec + TIMING.endTailSec) * fps);
  assert.equal(tl.scenes[0].durationInFrames, first);
  assert.equal(tl.scenes[1].durationInFrames, last);
  assert.equal(tl.scenes[1].from, first - 12);
  assert.equal(tl.totalFrames, first - 12 + last);
});

test("durationSec wins when longer than speech; reading time used without audio", () => {
  const tl = computeTimeline([{ narration: "uno dos tres cuatro", durationSec: 6 }, { narration: "uno dos tres cuatro cinco seis siete ocho nueve diez" }], { fps, transitionFrames: 0 });
  assert.equal(tl.scenes[0].durationInFrames, 6 * fps);
  assert.equal(tl.scenes[1].speechSec, 10 * TIMING.secPerWord);
});

test("narration of each scene starts after the previous scene's speech ended", () => {
  const tl = computeTimeline([{ audioSec: 1.2, narration: "a" }, { audioSec: 2, narration: "b" }, { audioSec: 1, narration: "c" }], { fps });
  for (let i = 1; i < tl.scenes.length; i++) {
    const prevEnd = tl.scenes[i - 1].speechStartMs + tl.scenes[i - 1].speechSec * 1000;
    assert.ok(tl.scenes[i].speechStartMs > prevEnd, `scene ${i}`);
  }
  const lastEndMs = tl.scenes[2].speechStartMs + 1000;
  assert.ok(lastEndMs < (tl.totalFrames / fps) * 1000);
});

test("synthetic captions cover every word and paginate by wordsPerPage and punctuation", () => {
  const scenes = [{ narration: "Hola mundo. Esto es una prueba" }];
  const tl = computeTimeline([{ audioSec: 2, narration: scenes[0].narration }], { fps });
  const caps = syntheticCaptions(scenes, tl);
  assert.equal(caps.length, 6);
  assert.equal(caps[0].text, "Hola");
  assert.equal(caps[1].text, " mundo.");
  const pages = paginateCaptions(caps, 3);
  assert.deepEqual(pages.map((p) => p.words.length), [2, 3, 1]);
});

test("alignToScript keeps whisper timings but restores the script's words", async () => {
  const { alignToScript } = await import("../lib/timeline.mjs");
  const w = (text, s) => ({ text, startMs: s, endMs: s + 200, timestampMs: s + 100, confidence: null });
  const heard = [w("CDD", 0), w(" y", 250), w(" o", 500), w(" de", 600), w(" de", 700), w(" suenan", 900), w(" parecido.", 1200)];
  const out = alignToScript(heard, ["SDD y ODD suenan parecido."]);
  assert.deepEqual(out.map((c) => c.text), ["SDD", " y", " ODD", " suenan", " parecido."]);
  assert.equal(out[0].startMs, 0);
  assert.equal(out[3].startMs, 900);
  assert.ok(out[2].startMs >= 250 && out[2].endMs <= 900);
});
