// Polish of the staged 3D videos: portrait framing, shot frames, label layout, template caption defaults.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { layoutLabels, rectsOverlap } from "../src/three/label-layout.mjs";
import { SHOT_FRAMES, SHOT_PRESETS, shotsToKeys } from "../lib/scene3d-motion.mjs";
import { STAGE_FRAME, frameContent } from "../lib/scene3d.mjs";
import { STAGE_SAFE } from "../lib/scene3d-stage.mjs";
import { getTemplate } from "../lib/templates.mjs";
import { resolveCaptionLook } from "../lib/captions.mjs";

const read = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const rect = (l) => ({ x0: l.x - l.w / 2, y0: l.y - l.h / 2, x1: l.x + l.w / 2, y1: l.y + l.h / 2 });
const B = { x0: 40, y0: 360, x1: 1040, y1: 1640 };
const CAP = { x0: 90, y0: 850, x1: 990, y1: 1000 };
const item = (id, ax, ay, priority = 0, w = 200, h = 56) => ({ id, ax, ay, w, h, priority });

test("label layout: never overlapping, inside the bounds and clear of the reserved bands", () => {
  const items = [item("a", 500, 700, 0), item("b", 520, 710, 0), item("c", 480, 705, 0), item("d", 540, 690, 0), item("e", 510, 1200), item("f", 530, 1210)];
  const out = layoutLabels(items, { bounds: B, avoid: [CAP] });
  const vis = out.filter((l) => l.visible);
  assert.ok(vis.length >= 4, "most labels survive");
  for (let i = 0; i < vis.length; i++) {
    const r = rect(vis[i]);
    assert.ok(r.x0 >= B.x0 && r.x1 <= B.x1 && r.y0 >= B.y0 && r.y1 <= B.y1, `${vis[i].id} inside bounds`);
    assert.ok(!rectsOverlap(r, CAP), `${vis[i].id} clear of the caption line`);
    for (let j = i + 1; j < vis.length; j++) assert.ok(!rectsOverlap(r, rect(vis[j])), `${vis[i].id} / ${vis[j].id} overlap`);
  }
});

test("label layout: the highest priority label keeps its natural spot and the lowest is hidden first", () => {
  const items = [item("low", 500, 700, 0), item("focus", 500, 700, 10), item("mid", 500, 700, 5)];
  const out = layoutLabels(items, { bounds: B, avoid: [], maxSteps: 0 });
  const by = Object.fromEntries(out.map((l) => [l.id, l]));
  assert.equal(by.focus.visible, true);
  assert.equal(by.focus.y, 700 - 64);
  assert.equal(by.mid.visible, false);
  assert.equal(by.low.visible, false);
  assert.deepEqual(out.map((l) => l.id), ["low", "focus", "mid"], "input order is kept");
});

test("label layout: stagger vertically, deterministic, off-screen anchors hidden, a label never lands on the title band", () => {
  const items = [item("a", 500, 420, 1), item("b", 505, 425, 0)];
  const a = layoutLabels(items, { bounds: B, avoid: [CAP] });
  assert.deepEqual(a, layoutLabels(items, { bounds: B, avoid: [CAP] }));
  for (const l of a.filter((x) => x.visible)) assert.ok(rect(l).y0 >= B.y0, "below the title band");
  assert.notEqual(a[0].y, a[1].y);
  assert.equal(layoutLabels([item("x", 500, 3000)], { bounds: B })[0].visible, false);
  assert.equal(layoutLabels([item("y", -400, 800)], { bounds: B })[0].visible, false);
});

test("shot frames: wide, medium, close and cutaway exist, get closer in that order and are used by a stage shot", () => {
  assert.deepEqual(Object.keys(SHOT_FRAMES), ["wide", "medium", "close", "cutaway"]);
  const z = (f) => SHOT_FRAMES[f].zoom;
  assert.ok(z("wide") > z("medium") && z("medium") > z("close"));
  const sec = () => 0;
  const k = (opts, shots) => shotsToKeys(shots, 6, sec, opts);
  assert.equal(k({ stage: true }, [{ shot: "close" }])[0].zoom, SHOT_FRAMES.close.zoom);
  assert.equal(k({ stage: true }, [{ shot: "wide", frame: "cutaway" }])[0].zoom, SHOT_FRAMES.cutaway.zoom);
  assert.equal(k({ stage: true }, [{ shot: "wide", frame: "medium", zoom: 0.9 }])[0].zoom, 0.9, "own zoom wins");
  // without a stage the presets are unchanged
  assert.equal(k({}, [{ shot: "wide" }])[0].zoom, SHOT_PRESETS.wide.zoom);
  assert.equal(k(undefined, [{ shot: "close" }])[0].zoom, SHOT_PRESETS.close.zoom);
  assert.equal(k({}, [{ shot: "close", frame: "wide" }])[0].zoom, SHOT_FRAMES.wide.zoom, "an explicit frame works anywhere");
});

test("stage framing fills the portrait frame: closer than the old default, lower zoom floor, slim title band", () => {
  const placed = [{ pos: [-7, 0, 0], scale: 1, h: 2, half: 3 }, { pos: [7, 0, 0], scale: 1, h: 2, half: 3 }];
  const old = frameContent(placed, "process-explainer", { fill: 0.34 });
  const now = frameContent(placed, "process-explainer", STAGE_FRAME);
  assert.ok(now.dist < old.dist * 0.7, `${now.dist} vs ${old.dist}`);
  assert.ok(STAGE_FRAME.minDist < 6);
  assert.ok(STAGE_SAFE.title.h <= 160 && STAGE_SAFE.title.y + STAGE_SAFE.title.h <= STAGE_SAFE.top);
  assert.ok(STAGE_SAFE.bottom >= 1600, "the lower area is used");
  // the default look frames without a stage are unchanged
  assert.deepEqual(frameContent(placed, "clay-diorama"), frameContent(placed, "clay-diorama", {}));
});

test("process-explainer: small word-by-word white captions with a dark outline near the middle", () => {
  const t = getTemplate("process-explainer");
  const c = t.defaults.captions;
  assert.equal(c.size, "s");
  assert.equal(c.position, "center");
  assert.ok(c.wordsPerPage <= 2);
  assert.equal(c.style, "clean");
  const spec = { captions: c, theme: t.defaults.theme };
  const look = resolveCaptionLook(spec, { top: 1130, height: 260 });
  assert.equal(look.colors.text.toUpperCase(), "#FFFFFF");
  assert.ok(look.scale <= 0.8);
  const mid = look.band.top + look.band.height / 2;
  assert.ok(Math.abs(mid / 1920 - 0.48) < 0.04, `caption center at ${(mid / 1920).toFixed(2)} of the height`);
  assert.equal(look.halo, "strong", "the dark outline halo is on");
});

test("tree builder: at least two more faceted layers than before on every non-palm kind, within the part cap", async () => {
  const { runBuilder } = await import("../lib/scene3d-builders.mjs");
  const { MAX_PARTS } = await import("../lib/scene3d-motion.mjs");
  const before = { pine: 36, round: 41, lowpoly: 19, oak: 47, birch: 46 };
  for (const [kind, n] of Object.entries(before)) {
    const parts = runBuilder("tree", { kind }, { seed: 1 }).parts;
    assert.ok(parts.length >= n + 2, `${kind}: ${parts.length} parts vs ${n}`);
    assert.ok(parts.filter((q) => q.facets !== undefined).length >= 8, `${kind} stays faceted`);
    assert.ok(runBuilder("tree", { kind, density: 3, height: 5, crown: 2.5 }, { seed: 3 }).parts.length <= MAX_PARTS);
  }
});
