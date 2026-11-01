// Generative pixel kit: agent-authored sprites, custom sets, motion and fx (lib/pixel-gen.mjs + lib/pixel.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate } from "../lib/templates.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { computeTimeline, syntheticCaptions } from "../lib/timeline.mjs";
import { computeBeats } from "../lib/illustrated.mjs";
import { planPixel, usesPixelKit } from "../lib/pixel.mjs";
import {
  FX_TYPES,
  LAYER_TYPES,
  MOTION_PRESETS,
  burstAt,
  boltPath,
  ease,
  forestTrees,
  h01,
  interpolateKeys,
  motionState,
  parseSprite,
  particlesAt,
  ridgeProfile,
  skylineBlocks,
  spriteLibrary,
} from "../lib/pixel-gen.mjs";

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const errorsOf = (spec) => {
  const r = validateSpec(spec);
  return r.ok ? [] : r.errors;
};

const BOT = {
  id: "bot",
  palette: ["ink", "metal1", "glow2", "accent", "#F2C29B"],
  mirror: true,
  glow: "2",
  frames: [
    ["...00", "..011", ".0111", ".0122", ".0111", "..011", "...03", "..033"],
    ["...00", "..011", ".0111", ".0111", ".0111", "..011", "...03", "...33"],
  ],
};
const genScene = {
  set: {
    sky: { gradient: ["sky0", "sky1", "#FF8A5B"], stars: 40, moon: { x: 0.8, y: 0.12 } },
    floor: 0.62,
    layers: [
      { type: "mountains", seed: 77, color: "far0", color2: "paper" },
      { type: "skyline", seed: 12, color: "far1", lit: 0.5, variant: "towers" },
      { type: "forest", seed: 9, depth: "near", variant: "pine" },
      { type: "ground", variant: "stone", color: "floor0", color2: "floor1" },
      { type: "sprite", sprite: "bot", count: 3, depth: "far", scale: 1 },
      { type: "circle", x: 0.2, y: 0.2, r: 0.05, color: "glow", glow: true, motion: "pulse" },
    ],
  },
  sprites: [BOT],
  actors: [
    { sprite: "bot", x: 0.3, scale: 3, motion: ["bob", "blink"] },
    { sprite: "bot", x: 0.7, at: "mundo", motion: { keys: [{ at: 0, x: 0.7, y: 0.5 }, { at: "mundo+6", y: 0.3, scale: 2, ease: "back" }], presets: [{ type: "spin", at: 1, duration: 0.5 }] } },
  ],
  props: [{ kind: "coin", motion: "float" }],
  banner: { text: "Hola mundo", accent: "mundo", motion: "slide-in-left" },
  fx: [
    { type: "embers", intensity: 0.8 },
    { type: "burst", at: "mundo", x: 0.7, y: 0.4, color: "glow" },
    { type: "lightning", at: 1.2, x: 0.5, y: 0.55 },
    { type: "crt" },
    { type: "pixelate-in", duration: 0.5 },
  ],
};
const mini = (pixel, extra = {}) => ({
  version: 1,
  title: "gen",
  template: "pixel-night",
  scenes: [{ id: "a", narration: "Hola mundo, esto es pixel.", visual: { type: "pixel", pixel } }],
  ...extra,
});

test("the schema accepts a fully generative scene (custom set, sprites, actors, motion, fx) on every pixel look", () => {
  for (const id of ["pixel-dusk", "pixel-night", "pixel-arcade", "pixel-mono"]) assert.deepEqual(errorsOf({ ...mini(genScene), template: id }), [], id);
});

test("the schema rejects bad sprites, sets, motion and fx with a path and a clear reason", () => {
  const withSprite = (sp, more = {}) => ({ set: "room", sprites: [sp], ...more });
  const cases = [
    [withSprite({ id: "a", frames: [["0000", "000"]] }), "visual.pixel.sprites.0.frames.0.1", /row 1 has 3 pixels.*same length/],
    [withSprite({ id: "a", frames: [["00X0"]] }), "visual.pixel.sprites.0.frames.0.0", /unknown pixel character "X"/],
    [withSprite({ id: "a", palette: ["ink", "paper"], frames: [["0120"]] }), "visual.pixel.sprites.0.frames.0.0", /palette index 2 but the palette has 2 colors/],
    [withSprite({ id: "a", mirror: true, frames: [["0".repeat(40)]] }), "visual.pixel.sprites.0.frames", /80 pixels wide after mirroring; the maximum is 64/],
    [withSprite({ id: "a", frames: [["00"], ["00", "00"]] }), "visual.pixel.sprites.0.frames.1", /frame 1 has 2 rows, frame 0 has 1/],
    [withSprite({ id: "a", palette: ["blue"], frames: [["0"]] }), "visual.pixel.sprites.0.palette.0", /color role .* or a hex color/],
    [{ set: "room", sprites: [{ id: "a", frames: [["0"]] }, { id: "a", frames: [["1"]] }] }, "visual.pixel.sprites.1.id", /sprite "a" is defined twice/],
    [{ set: "room", actors: [{ sprite: "ghost" }] }, "visual.pixel.actors.0.sprite", /unknown sprite "ghost"/],
    [{ set: { layers: [{ type: "volcano" }] } }, "visual.pixel.set", /^layers\.0\.type: unknown set layer type "volcano"/],
    [{ set: { layers: [{ type: "sprite" }] } }, "visual.pixel.set.layers.0.sprite", /sprite layer needs `sprite`/],
    [{ set: { layers: [{ type: "forest", variant: "checker" }] } }, "visual.pixel.set.layers.0.variant", /forest variants: pine, round/],
    [{ set: "room", fx: [{ type: "nuke" }] }, "visual.pixel.fx.0.type", /unknown pixel fx "nuke"/],
    [{ set: "room", props: [{ kind: "coin", motion: "moonwalk" }] }, "visual.pixel.props.0.motion", /unknown motion preset "moonwalk"/],
    [{ set: "room", props: [{ kind: "coin", motion: { keys: [{ at: 0, x: 9 }] } }] }, "visual.pixel.props.0.motion.keys.0.x", /expected number to be <=2/],
    [{ set: "room", fx: [{ type: "burst", at: "adios" }] }, "visual.pixel.fx.0.at", /"adios" is not in this scene's narration/],
    [{ set: "room", fx: Array.from({ length: 11 }, () => ({ type: "dust" })) }, "visual.pixel.fx", /.+/],
  ];
  for (const [pixel, path, re] of cases) {
    const errs = errorsOf(mini(pixel));
    const hit = errs.find((e) => e.path === `scenes.0.${path}` || e.path.startsWith(`scenes.0.${path}.`));
    assert.ok(hit, `${JSON.stringify(pixel)} -> ${JSON.stringify(errs)}`);
    assert.match(hit.message, re);
  }
});

test("sprites are shared across scenes: defined once, placed anywhere; unknown ids are caught in every scene", () => {
  const spec = {
    ...mini(genScene),
    scenes: [
      { id: "a", narration: "Hola mundo.", visual: { type: "pixel", pixel: { set: "room", sprites: [BOT] } } },
      { id: "b", narration: "Otra escena.", visual: { type: "pixel", pixel: { set: { layers: [{ type: "sprite", sprite: "bot" }] }, actors: [{ sprite: "bot" }] } } },
    ],
  };
  assert.deepEqual(errorsOf(spec), []);
  spec.scenes[1].visual.pixel.actors = [{ sprite: "nope" }];
  assert.ok(errorsOf(spec).some((e) => e.path === "scenes.1.visual.pixel.actors.0.sprite"));
  assert.equal(spriteLibrary(validateSpec(spec.scenes[0] && { ...spec, scenes: [spec.scenes[0]] }).spec).get("bot").w, 10);
});

test("parseSprite mirrors half rows and maps chars to palette indexes (transparent = -1)", () => {
  const s = parseSprite(BOT);
  assert.equal(s.w, 10);
  assert.equal(s.h, 8);
  assert.equal(s.frames.length, 2);
  assert.deepEqual(s.frames[0][0], [-1, -1, -1, 0, 0, 0, 0, -1, -1, -1]);
  assert.deepEqual(s.frames[0][3], [-1, 0, 1, 2, 2, 2, 2, 1, 0, -1]);
  assert.ok(s.glow.has(2));
  const odd = parseSprite({ id: "o", mirror: "odd", frames: [["012"]] });
  assert.deepEqual(odd.frames[0][0], [0, 1, 2, 1, 0]);
  const az = parseSprite({ id: "z", palette: Array.from({ length: 12 }, () => "ink"), frames: [["9ab."]] });
  assert.deepEqual(az.frames[0][0], [9, 10, 11, -1]);
});

test("procedural layers are deterministic per seed, differ across seeds and stay in bounds", () => {
  for (const type of ["mountains", "hills", "dunes"]) {
    const a = ridgeProfile(type, 77, 300, 90);
    assert.deepEqual(ridgeProfile(type, 77, 300, 90), a, `${type} deterministic`);
    assert.notDeepEqual(ridgeProfile(type, 78, 300, 90), a, `${type} seed changes it`);
    assert.equal(a.length, 300);
    assert.ok(a.every((h) => Number.isInteger(h) && h >= 0 && h <= 90), type);
  }
  const b = skylineBlocks(5, -24, 294, 120);
  assert.deepEqual(skylineBlocks(5, -24, 294, 120), b);
  assert.notDeepEqual(skylineBlocks(6, -24, 294, 120), b);
  assert.ok(b[0].x === -24 && b[b.length - 1].x + b[b.length - 1].w >= 294 && b.every((k) => k.h <= 120));
  const t = forestTrees(3, 0, 270, 80, 0.8);
  assert.deepEqual(forestTrees(3, 0, 270, 80, 0.8), t);
  assert.ok(t.length > forestTrees(3, 0, 270, 80, 0.1).length, "density adds trees");
  assert.equal(h01("a", 1), h01("a", 1));
  assert.notEqual(h01("a", 1), h01("a", 2));
});

test("keyframes interpolate per channel with easing; frames step; ends clamp", () => {
  const keys = [{ at: 0, x: 0, opacity: 1, frame: 0 }, { at: 1, x: 1, ease: "linear", frame: 2 }, { at: 2, x: 0.5, opacity: 0 }];
  assert.deepEqual(interpolateKeys(keys, -1), { x: 0, opacity: 1, frame: 0 });
  assert.equal(interpolateKeys(keys, 0.5).x, 0.5, "linear");
  assert.equal(interpolateKeys(keys, 0.5).frame, 0, "frame holds until the next key");
  assert.equal(interpolateKeys(keys, 1.2).frame, 2);
  assert.equal(interpolateKeys(keys, 1).opacity, 0.5, "opacity spans its own keys (0 -> 2) with in-out");
  assert.equal(interpolateKeys(keys, 5).x, 0.5);
  assert.equal(interpolateKeys(keys, 1.5).y, undefined, "unkeyed channels stay undefined");
  assert.equal(ease("in-out", 0.5), 0.5);
  assert.ok(ease("back", 0.7) > 1, "back overshoots");
  assert.equal(ease("bounce", 1), 1);
  assert.equal(ease("step", 0.99), 0);
  // word moments resolve through the scene's moment table
  const r = interpolateKeys([{ at: 0, y: 0 }, { at: "mundo", y: 1, ease: "linear" }], 0.5, "in-out", (a) => (a === "mundo" ? 1 : a));
  assert.equal(r.y, 0.5);
});

test("motion presets: pop-in hides before its moment, walk-across crosses the view and cycles frames, blink shows the last frame", () => {
  const pop = (t) => motionState({ presets: [{ type: "pop-in", at: 1 }] }, t);
  assert.equal(pop(0.5).visible, false);
  assert.ok(pop(1.1).scale > 0 && pop(1.1).scale < 1.2);
  assert.equal(pop(2).scale, 1);
  const walk = (t) => motionState("walk-across", t, { sceneSec: 4, frames: 2, fps: 6 });
  assert.ok(walk(0).x < 0 && walk(4).x > 1 && walk(1).x < walk(2).x);
  assert.notEqual(walk(0).frame, walk(1 / 6).frame, "walking cycles frames");
  assert.equal(motionState({ presets: [{ type: "walk-across", amount: -1 }] }, 0, { sceneSec: 4 }).flip, true);
  const blink = motionState(["blink"], 3.15, { frames: 3 });
  assert.equal(blink.frame, 2);
  assert.equal(motionState(["blink"], 1, { frames: 3 }).frame, 0);
  assert.ok(MOTION_PRESETS.length >= 13);
  for (const p of MOTION_PRESETS) for (const t of [0, 0.3, 1.7]) {
    const s = motionState(p, t, { frames: 2, sceneSec: 3 });
    assert.ok(Number.isFinite(s.dx) && Number.isFinite(s.dy) && Number.isFinite(s.scale) && Number.isFinite(s.rotate), p);
    assert.deepEqual(motionState(p, t, { frames: 2, sceneSec: 3 }), s, `${p} deterministic`);
  }
});

test("fx particles, bursts and bolts are deterministic and stay near their area", () => {
  const area = { x: 20, y: 40, w: 200, h: 300 };
  for (const type of ["rain", "snow", "confetti", "embers", "smoke", "bubbles", "leaves", "dust", "stars", "fireflies", "sparks"]) {
    const a = particlesAt(type, { seed: "s", t: 1.3, area });
    assert.deepEqual(particlesAt(type, { seed: "s", t: 1.3, area }), a, type);
    assert.ok(a.length >= 3, type);
    assert.ok(a.every((p) => p.x >= area.x - 70 && p.x <= area.x + area.w + 70 && p.y >= area.y - 70 && p.y <= area.y + area.h + 70), type);
    assert.ok(particlesAt(type, { seed: "s", t: 1.3, area, intensity: 1 }).length > particlesAt(type, { seed: "s", t: 1.3, area, intensity: 0.1 }).length, `${type} intensity`);
  }
  assert.ok(burstAt(0.2, { seed: "x" }).length > 10);
  assert.equal(burstAt(5, { seed: "x" }).length, 0, "debris dies");
  assert.deepEqual(boltPath("q", 100, 0, 120, 300), boltPath("q", 100, 0, 120, 300));
  assert.deepEqual(boltPath("q", 100, 0, 120, 300)[0].at(-1), [120, 300]);
  assert.ok(FX_TYPES.length >= 20 && LAYER_TYPES.length >= 12);
});

test("planPixel resolves word moments (reels `en` rules) to seconds and adds actor / fx beats", () => {
  const raw = {
    ...mini(genScene),
    scenes: [
      { id: "a", narration: "Hola mundo, esto es pixel.", visual: { type: "pixel", pixel: genScene } },
      { id: "b", narration: "Y ahora explota todo.", visual: { type: "pixel", pixel: { set: "lab", fx: [{ type: "burst", at: "explota" }] } } },
    ],
  };
  const spec = resolveSpec(validateSpec(raw).spec, getTemplate("pixel-night"));
  const timeline = computeTimeline(spec.scenes, { fps: 30 });
  const captions = syntheticCaptions(spec.scenes, timeline);
  const plan = planPixel(spec, timeline, captions);
  assert.equal(plan[0].set, "custom");
  const mundo = captions.find((c) => c.text.trim().startsWith("mundo"));
  const expected = Math.round(((Math.round((mundo.startMs / 1000) * 30) - 4 - timeline.scenes[0].from) / 30) * 1000) / 1000;
  assert.equal(plan[0].moments.mundo, expected);
  assert.equal(plan[0].moments["mundo+6"], Math.round((expected + 6 / 30) * 1000) / 1000);
  const explota = captions.find((c) => c.text.trim().startsWith("explota"));
  assert.ok(Math.abs(plan[1].moments.explota - (explota.startMs / 1000 - timeline.scenes[1].from / 30 - 4 / 30)) < 0.05);
  assert.deepEqual(planPixel(spec, timeline, captions), plan, "deterministic");
  assert.deepEqual(planPixel(spec, timeline).map((p) => p.moments), plan.map((p) => p.moments), "synthetic captions by default");
  const beats = computeBeats(plan, timeline, 30);
  assert.ok(beats.some((b) => b.kind === "stamp" && b.scene === 1), "a burst is a stamp beat");
});

test("every pixel example (presets and generative) still validates", () => {
  const dir = fileURLToPath(new URL("../examples/", import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith(".spec.json"));
  const pixel = files.map((f) => [f, JSON.parse(read(`../examples/${f}`))]).filter(([, s]) => usesPixelKit(s.template));
  assert.ok(pixel.some(([f]) => f === "pixel-generative.spec.json"), "the generative demo exists");
  for (const [f, s] of pixel) assert.deepEqual(errorsOf(s), [], f);
  const gen = JSON.parse(read("../examples/pixel-generative.spec.json"));
  const scenes = gen.scenes.map((s) => s.visual.pixel);
  assert.ok(scenes.every((p) => typeof p.set === "object"), "the demo uses custom sets only");
  assert.ok(scenes.every((p) => (p.fx ?? []).length >= 1), "every scene has an effect");
  assert.ok((gen.scenes[0].visual.pixel.sprites ?? []).length >= 1, "the demo draws its own sprite");
});
