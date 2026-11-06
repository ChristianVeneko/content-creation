// Agent-authored 3D: `custom` objects built from primitive parts, keyframed + procedural motion, word moments,
// camera keys and per-scene VFX (lib/scene3d.mjs + lib/scene3d-motion.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate } from "../lib/templates.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { computeTimeline } from "../lib/timeline.mjs";
import { computeBeats } from "../lib/illustrated.mjs";
import { cameraAt, planThree } from "../lib/scene3d.mjs";
import { MOTION_PRESETS, PART_SHAPES, FX_TYPES, customHeight, nodeDelta, sampleKeys } from "../lib/scene3d-motion.mjs";

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const ROBOT = {
  kind: "custom",
  id: "bot",
  parts: [
    { id: "body", shape: "capsule", size: [0.45, 0.5], pos: [0, 0.75, 0], color: "accent" },
    { id: "head", shape: "sphere", size: [0.42], pos: [0, 0.72, 0], parent: "body" },
    { id: "eye-l", shape: "sphere", size: [0.07], pos: [-0.14, 0.05, 0.38], parent: "head", material: "emissive", color: "#FFFFFF" },
    { id: "eye-r", shape: "sphere", size: [0.07], pos: [0.14, 0.05, 0.38], parent: "head", material: "emissive", color: "#FFFFFF" },
    { id: "arm-r", shape: "cylinder", size: [0.07, 0.5], pos: [0.55, 0.05, 0], pivot: [0, 0.25, 0], parent: "body", motion: [{ type: "wave", at: "hola", until: 3 }] },
    { id: "ring", shape: "torus", size: [0.3, 0.04], pos: [0, 0.5, 0], parent: "head", material: "metal", motion: ["spin"] },
  ],
  motion: ["bob", { type: "blink", parts: ["eye-l", "eye-r"] }, { type: "assemble", at: 0.3 }],
  keys: [
    { at: 0, pos: [0, 0, 0] },
    { at: "mundo", pos: [0, 0.5, 0], ease: "out" },
  ],
};

const mini = (objects, extra = {}, narration = "Hola mundo, esto es una prueba con un robot.") => ({
  version: 1,
  title: "x",
  template: "clay-diorama",
  scenes: [{ id: "a", narration, title: { main: "Hola" }, visual: { type: "scene3d", stock: true, objects, ...extra } }],
});
const errorsOf = (spec) => {
  const r = validateSpec(spec);
  assert.equal(r.ok, false, "expected the spec to be rejected");
  return r.errors;
};
const hasError = (errors, path, re) => assert.ok(errors.some((e) => e.path === path && re.test(e.message)), `${path} ${re}: ${JSON.stringify(errors)}`);

test("a custom model with parts, motion, keys, camera keys and fx validates", () => {
  const r = validateSpec(
    mini([ROBOT, { kind: "coin", id: "coin", motion: ["spin", { type: "hop", at: 1 }] }], {
      cameraKeys: [{ at: 0, yaw: -20, zoom: 1.2 }, { at: "robot", yaw: 10, zoom: 0.8, focus: "bot" }],
      fx: [
        { type: "particles", kind: "sparks", target: "bot", burst: true, at: "mundo" },
        { type: "trail", target: "coin" },
        { type: "shockwave", target: "bot", at: 1.2 },
        { type: "pulse", target: "bot/eye-l" },
        { type: "hologram", target: "coin" },
        { type: "sweep", at: 0.5 },
      ],
    }),
  );
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.spec.scenes[0].visual.objects[0].parts.length, 6);
});

test("vocabularies are exposed for the prompt and the schema", () => {
  for (const s of ["box", "sphere", "cylinder", "cone", "torus", "capsule", "plane", "ring", "tube", "extrude", "lathe"]) assert.ok(PART_SHAPES.includes(s), s);
  for (const m of ["bob", "float", "spin", "wobble", "breathe", "wave", "walk", "blink", "look-at-camera", "hop", "orbit", "pop-in", "assemble", "explode"]) assert.ok(MOTION_PRESETS.includes(m), m);
  for (const f of ["particles", "trail", "pulse", "shockwave", "glow", "sweep", "hologram"]) assert.ok(FX_TYPES.includes(f), f);
});

test("custom parts are rejected with clear messages: shape, parent cycle, unknown parent, duplicates, points, limits", () => {
  const withParts = (parts, extra = {}) => mini([{ kind: "custom", id: "m", parts, ...extra }]);
  hasError(errorsOf(withParts([{ id: "a", shape: "blob" }])), "scenes.0.visual.objects.0.parts.0.shape", /unknown part shape "blob".*box/);
  hasError(
    errorsOf(withParts([{ id: "a", shape: "box", parent: "b" }, { id: "b", shape: "box", parent: "c" }, { id: "c", shape: "box", parent: "a" }])),
    "scenes.0.visual.objects.0.parts.0.parent",
    /parent cycle: a -> b -> c -> a/,
  );
  hasError(errorsOf(withParts([{ id: "a", shape: "box", parent: "zz" }])), "scenes.0.visual.objects.0.parts.0.parent", /no part with id "zz"/);
  hasError(errorsOf(withParts([{ id: "a", shape: "box" }, { id: "a", shape: "sphere" }])), "scenes.0.visual.objects.0.parts.1.id", /duplicate part id "a"/);
  hasError(errorsOf(withParts([{ id: "a", shape: "tube" }])), "scenes.0.visual.objects.0.parts.0.points", /tube parts need `points`/);
  hasError(errorsOf(withParts([{ id: "a", shape: "extrude", points: [[0, 0], [1, 0]] }])), "scenes.0.visual.objects.0.parts.0.points", /at least 3/);
  hasError(errorsOf(withParts([{ id: "a", shape: "box", size: [1, 2] }])), "scenes.0.visual.objects.0.parts.0.size", /box `size`/);
  hasError(errorsOf(withParts(Array.from({ length: 161 }, (_, i) => ({ id: `p${i}`, shape: "box" })))), "scenes.0.visual.objects.0.parts", /160/);
  hasError(errorsOf(mini([{ kind: "custom", id: "m" }])), "scenes.0.visual.objects.0.parts", /custom objects need `parts`/);
  hasError(errorsOf(withParts([{ id: "a", shape: "box", colour: "red" }])), "scenes.0.visual.objects.0.parts.0", /colour/);
});

test("motion, fx and moments are validated against the scene's objects and parts", () => {
  const custom = { kind: "custom", id: "m", parts: [{ id: "a", shape: "box" }] };
  hasError(errorsOf(mini([{ ...custom, motion: [{ type: "blink", parts: ["eye"] }] }])), "scenes.0.visual.objects.0.motion.0.parts.0", /no part with id "eye"/);
  hasError(errorsOf(mini([{ ...custom, motion: [{ type: "walk" }] }])), "scenes.0.visual.objects.0.motion.0.parts", /walk needs `parts`/);
  hasError(errorsOf(mini([{ kind: "cube", motion: [{ type: "blink", parts: ["a"] }] }])), "scenes.0.visual.objects.0.motion.0.parts", /only custom objects have parts/);
  hasError(errorsOf(mini([{ ...custom, motion: ["dance"] }])), "scenes.0.visual.objects.0.motion.0", /unknown motion "dance".*bob/);
  hasError(errorsOf(mini([custom], { fx: [{ type: "trail", target: "nope" }] })), "scenes.0.visual.fx.0.target", /no object with id "nope"/);
  hasError(errorsOf(mini([custom], { fx: [{ type: "pulse", target: "m/zz" }] })), "scenes.0.visual.fx.0.target", /no part "zz" in object "m"/);
  // a particles fx without `kind` is completed with `dust` instead of rejected (see lenient-authoring.test.mjs)
  const dust = validateSpec(mini([custom], { fx: [{ type: "particles" }] }));
  assert.equal(dust.ok, true);
  assert.equal(dust.spec.scenes[0].visual.fx[0].kind, "dust");
  hasError(errorsOf(mini([custom], { fx: [{ type: "glow" }] })), "scenes.0.visual.fx.0.target", /glow needs `target`/);
  hasError(errorsOf(mini([custom], { cameraKeys: [{ at: 0, focus: "x" }] })), "scenes.0.visual.cameraKeys.0.focus", /no object with id "x"/);
  hasError(errorsOf(mini([{ ...custom, keys: [{ at: "#2", pos: [0, 1, 0] }] }])), "scenes.0.visual.objects.0.keys.0.at", /cannot read the moment/);
});

test("keyframes interpolate per channel with easing and hold outside the keys", () => {
  const keys = [
    { at: 1, pos: [0, 0, 0], opacity: 0 },
    { at: 2, pos: [2, 0, 0], ease: "linear" },
    { at: 3, opacity: 1, rot: [0, 90, 0], ease: "linear" },
  ];
  const sec = (a) => a;
  assert.deepEqual(sampleKeys(keys, 0, sec).pos, [0, 0, 0]);
  assert.deepEqual(sampleKeys(keys, 1.5, sec).pos, [1, 0, 0]);
  assert.deepEqual(sampleKeys(keys, 5, sec).pos, [2, 0, 0]);
  // opacity only exists on keys 1 and 3: halfway between them
  assert.equal(sampleKeys(keys, 2, sec).opacity, 0.5);
  // a channel with a single key holds it everywhere (degrees in, radians out)
  assert.ok(Math.abs(sampleKeys(keys, 0, sec).rot[1] - Math.PI / 2) < 1e-9);
  // eased segments differ from linear in the middle but meet at the ends
  const eased = [{ at: 0, pos: [0, 0, 0] }, { at: 1, pos: [1, 0, 0], ease: "in-out" }];
  assert.ok(Math.abs(sampleKeys(eased, 0.25, sec).pos[0] - 0.25) > 0.05);
  assert.equal(sampleKeys(eased, 1, sec).pos[0], 1);
  assert.equal(sampleKeys([], 1, sec), null);
});

test("procedural presets are pure, windowed and shaped (blink closes the eyes, pop-in starts hidden, spin turns)", () => {
  const sec = (a) => (typeof a === "number" ? a : 0);
  const ctx = { sec, enter: 0.5, seed: 1, index: 0, side: 1 };
  const blink = ROBOT.motion[1];
  // some frame within the first 6 s closes the eye below 30 % height, and the result is deterministic
  const ys = Array.from({ length: 180 }, (_, f) => nodeDelta({ motion: [] }, f / 30, ctx, [blink], "eye-l").scale[1]);
  assert.ok(Math.min(...ys) < 0.3, `min eye scale ${Math.min(...ys)}`);
  assert.deepEqual(ys, Array.from({ length: 180 }, (_, f) => nodeDelta({ motion: [] }, f / 30, ctx, [blink], "eye-l").scale[1]));
  // an object-level blink does not touch parts it does not list
  assert.equal(nodeDelta({ motion: [] }, 1, ctx, [blink], "head").scale[1], 1);
  const pop = nodeDelta({ motion: [{ type: "pop-in", at: 1 }] }, 0.5, ctx);
  assert.equal(pop.scale[0], 0);
  assert.ok(nodeDelta({ motion: [{ type: "pop-in", at: 1 }] }, 3, ctx).scale[0] > 0.99);
  const s0 = nodeDelta({ motion: ["spin"] }, 0, ctx).rot[1];
  const s1 = nodeDelta({ motion: ["spin"] }, 1, ctx).rot[1];
  assert.ok(s1 - s0 > 0.5, "spin turns");
  // assemble: far away before it lands, home after
  const as = { motion: [] };
  const far = nodeDelta(as, 0.35, ctx, [{ type: "assemble", at: 0.3 }], "body", { rest: [0, 0.75, 0], center: [0, 0.75, 0], order: 0 });
  const home = nodeDelta(as, 4, ctx, [{ type: "assemble", at: 0.3 }], "body", { rest: [0, 0.75, 0], center: [0, 0.75, 0], order: 0 });
  assert.ok(Math.hypot(...far.pos) > 1, JSON.stringify(far));
  assert.ok(Math.hypot(...home.pos) < 1e-6, JSON.stringify(home));
  // walk swings listed limbs in counter-phase
  const walk = { type: "walk", parts: ["leg-l", "leg-r"] };
  const l = nodeDelta({ motion: [] }, 0.2, ctx, [walk], "leg-l").rot[0];
  const r = nodeDelta({ motion: [] }, 0.2, ctx, [walk], "leg-r").rot[0];
  assert.ok(l * r < 0, `${l} ${r}`);
});

test("custom height comes from the parts, so layout, labels and framing fit the model", () => {
  const h = customHeight(ROBOT.parts);
  // body center 0.75 + head offset 0.72 + radius 0.42 + ring on top
  assert.ok(h > 1.8 && h < 2.6, String(h));
  const spec = resolveSpec(validateSpec(mini([ROBOT])).spec, getTemplate("clay-diorama"));
  const timeline = computeTimeline(spec.scenes, { fps: 30 });
  const [plan] = planThree(spec, timeline);
  assert.ok(Math.abs(plan.objects[0].h - h * plan.objects[0].scale) < 0.01);
});

test("word moments resolve through the narration timing (reels `en` syntax) and feed camera keys and beats", () => {
  const spec = resolveSpec(
    validateSpec(
      mini([{ ...ROBOT, at: "robot" }], { cameraKeys: [{ at: 0, zoom: 1.3 }, { at: "robot", zoom: 0.8, focus: "bot" }], fx: [{ type: "shockwave", target: "bot", at: "prueba" }] }),
    ).spec,
    getTemplate("clay-diorama"),
  );
  const timeline = computeTimeline(spec.scenes, { fps: 30 });
  const [plan] = planThree(spec, timeline);
  const words = spec.scenes[0].narration.split(/\s+/);
  const robotAt = plan.moments.robot;
  const pruebaAt = plan.moments.prueba;
  assert.ok(robotAt > pruebaAt && pruebaAt > plan.moments.mundo && plan.moments.mundo > 0, JSON.stringify(plan.moments));
  assert.ok(robotAt < timeline.scenes[0].durationInFrames / 30, "inside the scene");
  assert.equal(plan.objects[0].enter, robotAt);
  assert.ok(words.length > 5);
  // camera keys: zoomed out at the start, pushed in at the word
  const at = (t) => cameraAt({ t, sceneSec: 6, look: "clay-diorama", move: "static", frame: plan.frame, keys: plan.cameraKeys });
  const d = (c) => Math.hypot(...c.position.map((x, i) => x - c.target[i]));
  assert.ok(d(at(0)) > d(at(robotAt + 0.01)) * 1.4, `${d(at(0))} vs ${d(at(robotAt))}`);
  // with captions (real voice timing) the moments follow the captions instead
  const caps = words.map((w, k) => ({ text: w, startMs: 2000 + k * 100, endMs: 2080 + k * 100 }));
  const [withVoice] = planThree(spec, timeline, caps);
  assert.ok(Math.abs(withVoice.moments.robot - (2.0 + 0.1 * words.indexOf("robot.") - 4 / 30)) < 0.05, JSON.stringify(withVoice.moments));
  // a shockwave fx is an SFX beat
  const kinds = computeBeats([plan], timeline, 30).map((b) => b.kind);
  assert.ok(kinds.filter((k) => k === "pop").length >= 2, JSON.stringify(kinds));
});

test("camera keys without keys leave the camera unchanged (existing specs render the same)", () => {
  const frame = { target: [0, 0.5, 0], dist: 12, viewH: 9 };
  const a = cameraAt({ t: 1.2, sceneSec: 4, look: "clay-diorama", move: "orbit", frame });
  assert.deepEqual(a, cameraAt({ t: 1.2, sceneSec: 4, look: "clay-diorama", move: "orbit", frame, keys: [] }));
});

test("the generative 3D example validates: an original character, a hero object, motion and fx in every scene", () => {
  const raw = JSON.parse(read("../examples/3d-generative.spec.json"));
  const r = validateSpec(raw);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(raw.voice.provider, "none");
  const scenes = r.spec.scenes;
  assert.ok(scenes.length >= 4 && scenes.length <= 6);
  const customs = scenes.flatMap((s) => s.visual.objects.filter((o) => o.kind === "custom"));
  assert.ok(customs.length >= 2 && customs.some((o) => o.parts.length >= 10), "a character and a hero object");
  for (const s of scenes) {
    assert.ok((s.visual.fx ?? []).length >= 1, `${s.id}: fx`);
    assert.ok(s.visual.objects.some((o) => (o.motion ?? []).length || (o.keys ?? []).length || (o.parts ?? []).some((p) => p.motion || p.keys)), `${s.id}: motion`);
  }
});
