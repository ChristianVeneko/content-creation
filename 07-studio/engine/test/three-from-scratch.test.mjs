// 3D templates supply only STYLE: models and worlds are built from scratch for every video (custom parts + `world`),
// the catalog (stock kinds, sets, models) is opt-in through `stock: true`, scenes may carry 2-4 camera shots, and the
// new format looks (data-stage, monolith-story, clay-mascot) are registered with a `format` slug.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { listTemplates, getTemplate } from "../lib/templates.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { computeTimeline } from "../lib/timeline.mjs";
import {
  CAR_MODELS,
  LOOK3D,
  RENDER3D,
  SETS_3D,
  THREE_D_TEMPLATE_IDS,
  cameraAt,
  collectModelIds,
  cornerPlacement,
  frameContent,
  layoutObjects,
  planThree,
  projectPoint,
  setOf,
} from "../lib/scene3d.mjs";
import { SHOT_NAMES, expandWorldParts, shotsToKeys } from "../lib/scene3d-motion.mjs";

const read = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const BLOCK = { kind: "custom", id: "b", parts: [{ id: "body", shape: "box", size: [1, 2, 1], pos: [0, 1, 0] }] };
const WORLD = { concept: "paper boats on a moonlit pond", ground: { kind: "disc" }, backdrop: "accent2", parts: [{ id: "rock", shape: "sphere", size: [0.4], pos: [3, 0.4, -2] }] };
const spec = (visual, template = "moody-night", more = {}) => ({ version: 1, title: "x", template, scenes: [{ id: "a", narration: "Hola mundo, esto es una prueba larga.", title: { main: "Hola" }, visual: { type: "scene3d", ...visual } }], ...more });
const errs = (s) => validateSpec(s).errors ?? [];
const has = (s, path, re) => errs(s).some((e) => e.path === path && re.test(e.message));
const planOf = (s) => {
  const r = validateSpec(s);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const resolved = resolveSpec(r.spec, getTemplate(s.template));
  return planThree(resolved, computeTimeline(resolved.scenes, { fps: resolved.format.fps }));
};

test("every 3D template carries a kebab `format` slug; the new formats are registered", () => {
  const three = listTemplates().filter((t) => t.category === "3d");
  assert.equal(three.length, THREE_D_TEMPLATE_IDS.length);
  for (const t of three) assert.match(t.format ?? "", /^[a-z0-9]+(-[a-z0-9]+)*$/, `${t.id} format`);
  const want = { "clay-diorama": "diorama", "iso-toon": "isometric", "neon-glass": "glass-ui", pedestal: "product-showcase", "paper-world": "papercraft", "toy-blocks": "toybox", "holo-studio": "hologram", "neon-grid": "synthwave", "soft-studio": "soft-product", "moody-night": "night-cinematic", "voxel-world": "voxel", "data-stage": "data-stage", "monolith-story": "story-monolith", "clay-mascot": "mascot-checklist", "cutaway-explainer": "cutaway-explainer", "engineering-explainer": "engineering-explainer" };
  for (const [id, f] of Object.entries(want)) assert.equal(three.find((t) => t.id === id).format, f, id);
});

test("the retuned styles no longer name scenery in their gallery text", () => {
  for (const id of ["moody-night", "soft-studio", "neon-grid", "voxel-world"]) {
    const t = getTemplate(id);
    const text = `${t.description} ${t.prompt_hint} ${t.best_for.join(" ")}`;
    assert.match(text, /from scratch|from custom parts/i, `${id} says the agent builds the scene`);
    assert.doesNotMatch(text, /highway|wooden desk|street lamps|drive into|model car-sedan|set "city"/i, `${id} must not imply scenery`);
  }
});

test("defaults: no look has a default stock set and nothing stock is staged without an explicit request", () => {
  for (const id of THREE_D_TEMPLATE_IDS) {
    assert.equal(RENDER3D[id].set, "none", `${id} default set`);
    assert.equal(setOf({}, id), "none");
    assert.equal(setOf({ set: "auto" }, id), "none");
  }
  for (const id of ["moody-night", "soft-studio", "neon-grid", "voxel-world"]) {
    const s = spec({ objects: [BLOCK], world: WORLD }, id);
    const r = validateSpec(s);
    assert.equal(r.ok, true, JSON.stringify(r.errors));
    const resolved = resolveSpec(r.spec, getTemplate(id));
    assert.deepEqual(collectModelIds(resolved), [], `${id} stages no models`);
    assert.equal(planOf(s)[0].set, "none");
  }
});

test("stock content is opt-in: stock kinds, stock sets and scenes without custom parts or a world are errors", () => {
  assert.ok(has(spec({ objects: [{ kind: "laptop" }] }), "scenes.0.visual.objects", /built from scratch/), "no custom object or world");
  assert.ok(has(spec({ objects: [BLOCK, { kind: "car" }] }), "scenes.0.visual.objects.1.kind", /stock catalog model/));
  assert.ok(has(spec({ objects: [BLOCK, { kind: "character" }] }), "scenes.0.visual.objects.1.kind", /stock/));
  assert.ok(has(spec({ objects: [BLOCK, { kind: "model", model: "food-apple-01" }] }), "scenes.0.visual.objects.1.kind", /stock/));
  assert.ok(has(spec({ objects: [BLOCK], set: "road" }), "scenes.0.visual.set", /stock: true/));
  // an object-level flag allows that one object; a scene-level flag allows the whole scene
  assert.equal(errs(spec({ objects: [BLOCK, { kind: "car", stock: true }] })).length, 0);
  assert.equal(errs(spec({ stock: true, objects: [{ kind: "laptop" }], set: "desk" })).length, 0);
  // custom objects or a custom world satisfy the rule without any flag
  assert.equal(errs(spec({ objects: [BLOCK] })).length, 0);
  assert.equal(errs(spec({ objects: [{ kind: "laptop" }], world: WORLD })).length, 0);
});

test("previous behavior still holds through the explicit flag: set road + car validates and plans identically to before", () => {
  const s = spec({ stock: true, set: "road", objects: [{ kind: "car", model: "car-suv" }] });
  const r = validateSpec(s);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const resolved = resolveSpec(r.spec, getTemplate("moody-night"));
  const plan = planOf(s)[0];
  assert.equal(plan.set, "road");
  assert.equal(plan.world, null);
  assert.deepEqual(plan.objects[0].pos, [0, 0, 0]);
  assert.equal(plan.objects[0].scale, 1.6);
  assert.equal(plan.move, "rise");
  const ids = collectModelIds(resolved);
  for (const m of ["sign-highway", "car-sedan", "car-suv", "car-taxi", "city-low-detail-building-a", "car-suv"]) assert.ok(ids.includes(m), m);
  assert.ok(CAR_MODELS.includes("car-suv") && SETS_3D.includes("road"));
});

test("world schema: accepts concept, ground, backdrop, parts (wide pos, repeat), crowd; rejects bad worlds", () => {
  const big = { ...WORLD, parts: [{ id: "row", shape: "cylinder", size: [0.5, 0.2], pos: [-9, 0.1, -20], repeat: { count: 6, step: [0, 0, -1.5] } }, { id: "sg", shape: "sign", size: [2, 0.5], text: "ROUND 1" }], crowd: { count: 40, area: [10, 4] } };
  assert.equal(errs(spec({ objects: [BLOCK], world: big })).length, 0, JSON.stringify(errs(spec({ objects: [BLOCK], world: big }))));
  const { concept, ...noConcept } = WORLD;
  assert.ok(errs(spec({ objects: [BLOCK], world: noConcept })).length > 0, "concept is required");
  assert.ok(has(spec({ objects: [BLOCK], world: { ...WORLD, parts: [{ id: "a", shape: "box" }, { id: "a", shape: "box" }] } }), "scenes.0.visual.world.parts.1.id", /duplicate/));
  assert.ok(has(spec({ objects: [BLOCK], world: { ...WORLD, parts: [{ id: "s", shape: "sign", size: [1, 1] }] } }), "scenes.0.visual.world.parts.0.text", /text/));
  assert.ok(has(spec({ objects: [BLOCK], world: { ...WORLD, parts: [{ id: "b", shape: "box", size: [60, 1, 1] }] } }), "scenes.0.visual.world.parts.0.size.0", /at most 40/));
  assert.ok(has(spec({ objects: [BLOCK], world: { ...WORLD, parts: Array.from({ length: 40 }, (_, i) => ({ id: `r${i}`, shape: "box", repeat: { count: 40, step: [0, 0, -1] } })) } }), "scenes.0.visual.world.parts", /more than 1500/));
  assert.ok(errs(spec({ objects: [BLOCK], world: { ...WORLD, ground: { kind: "lava" } } })).length > 0, "unknown ground kind");
  assert.ok(errs(spec({ objects: [BLOCK], world: { ...WORLD, parts: Array.from({ length: 401 }, (_, i) => ({ id: `p${i}`, shape: "box" })) } })).length > 0, "at most 400 world parts");
  assert.ok(has(spec({ objects: [BLOCK], world: { concept: "empty" } }), "scenes.0.visual.world", /empty world/));
});

test("expandWorldParts repeats a root part and the parts hanging from it with suffixed ids", () => {
  const out = expandWorldParts([
    { id: "tower", shape: "box", pos: [0, 1, 0], repeat: { count: 3, step: [2, 0, -1], scaleStep: 0.5 } },
    { id: "lamp", shape: "sphere", parent: "tower", pos: [0, 1, 0] },
    { id: "lone", shape: "box" },
  ]);
  assert.deepEqual(out.map((p) => p.id), ["tower", "lamp", "tower#1", "lamp#1", "tower#2", "lamp#2", "lone"]);
  assert.deepEqual(out[2].pos, [2, 1, -1]);
  assert.deepEqual(out[4].pos, [4, 1, -2]);
  assert.equal(out[3].parent, "tower#1");
  assert.deepEqual(out[2].scale, [0.5, 0.5, 0.5]);
  assert.equal(out.every((p) => p.repeat === undefined), true);
});

test("shots: 2-4 camera shots expand to camera keys; bad shots are rejected", () => {
  const s = spec({ objects: [{ ...BLOCK, id: "hero" }], camera: "static", shots: [{ shot: "wide" }, { shot: "close", focus: "hero" }, { shot: "low", at: 3 }] });
  assert.equal(errs(s).length, 0, JSON.stringify(errs(s)));
  const plan = planOf(s)[0];
  assert.equal(plan.cameraKeys.length, 3);
  assert.deepEqual(plan.cameraKeys.map((k) => k.t), [...plan.cameraKeys.map((k) => k.t)].sort((a, b) => a - b));
  assert.ok(plan.cameraKeys[1].shift, "focus becomes a shift of the look-at point");
  // every channel is set on every key, so a shot never inherits the previous pitch / yaw / zoom
  for (const k of plan.cameraKeys) for (const f of ["yaw", "pitch", "zoom"]) assert.equal(typeof k[f], "number", f);
  const frame = plan.frame;
  const a = cameraAt({ t: 0.1, sceneSec: 6, look: "moody-night", move: "static", frame, keys: plan.cameraKeys });
  const b = cameraAt({ t: 5.9, sceneSec: 6, look: "moody-night", move: "static", frame, keys: plan.cameraKeys });
  assert.notDeepEqual(a.position, b.position, "the camera moves between shots");
  assert.ok(has(spec({ objects: [BLOCK], shots: [{ shot: "wide" }] }), "scenes.0.visual.shots", /.*/), "at least 2 shots");
  assert.ok(errs(spec({ objects: [BLOCK], shots: Array.from({ length: 5 }, () => ({ shot: "wide" })) })).length > 0, "at most 4 shots");
  assert.ok(errs(spec({ objects: [BLOCK], shots: [{ shot: "wide" }, { shot: "zoomy" }] })).some((e) => /unknown shot/.test(e.message)));
  assert.ok(has(spec({ objects: [BLOCK], shots: [{ shot: "wide" }, { shot: "low" }], cameraKeys: [{ at: 0, zoom: 1 }] }), "scenes.0.visual.shots", /either/));
  assert.ok(has(spec({ objects: [BLOCK], shots: [{ shot: "wide" }, { shot: "close", focus: "nobody" }] }), "scenes.0.visual.shots.1.focus", /no object/));
  assert.deepEqual(SHOT_NAMES.length >= 6, true);
  // evenly spaced when `at` is missing
  assert.deepEqual(shotsToKeys([{ shot: "wide" }, { shot: "low" }], 6, () => 0).map((k) => k.at), [0, 3]);
});

test("novelty guard: three or more scenes that all show the same subject and world are rejected", () => {
  const scene = (id, extra = {}) => ({ id, narration: "Hola mundo, esto es una prueba larga.", title: { main: "Hola" }, visual: { type: "scene3d", objects: [BLOCK], world: WORLD, ...extra } });
  const same = { version: 1, title: "x", template: "moody-night", scenes: [scene("a"), scene("b"), scene("c")] };
  assert.ok(errs(same).some((e) => /same subject and world/.test(e.message)), JSON.stringify(errs(same)));
  const varied = { ...same, scenes: [scene("a"), scene("b", { world: { ...WORLD, backdrop: "accent" } }), scene("c", { world: { ...WORLD, backdrop: "accent3" } })] };
  assert.equal(errs(varied).length, 0, JSON.stringify(errs(varied)));
  assert.equal(errs({ ...same, scenes: [scene("a"), scene("b")] }).length, 0, "two scenes may match");
});

test("the spec-writer 3D prompt states the from-scratch and novelty rules and documents the new templates and fields", () => {
  const md = readFileSync(fileURLToPath(new URL("../prompts/spec-writer.md", import.meta.url)), "utf8");
  for (const needle of ["from scratch", "world.concept", "never reuse", "stock: true", "shots", "### `data-stage`", "### `monolith-story`", "### `clay-mascot`", "corner", "spotlight", "repeat", "sign"]) assert.ok(md.toLowerCase().includes(needle.toLowerCase()), `prompt mentions ${needle}`);
});

test("camera language: only iso-toon is isometric; every other look keeps a low or moderate angle and varied moves", () => {
  for (const id of THREE_D_TEMPLATE_IDS) {
    const L = LOOK3D[id];
    if (id === "iso-toon") {
      assert.equal(L.ortho, true);
      continue;
    }
    assert.equal(L.ortho, false, `${id} is not orthographic`);
    assert.ok(L.pitch <= 26, `${id} pitch ${L.pitch} must not be an isometric-like high angle`);
    assert.ok(L.moves.length >= 4 && new Set(L.moves).size >= 3, `${id} varies its moves`);
  }
  assert.ok(LOOK3D["iso-toon"].pitch > 30 && LOOK3D["iso-toon"].yaw === 45);
  // across the looks the moves cover more than one language (low hero, orbit, dolly, top-down, handheld)
  const all = new Set(THREE_D_TEMPLATE_IDS.flatMap((id) => LOOK3D[id].moves));
  for (const m of ["orbit", "dolly", "handheld", "rise", "glide", "push"]) assert.ok(all.has(m), m);
});

test("handheld camera is a pure function of time that drifts slightly around the framing", () => {
  const frame = { target: [0, 0.5, 0], dist: 10, viewH: 0 };
  const at = (t) => cameraAt({ t, sceneSec: 6, look: "moody-night", move: "handheld", frame });
  assert.deepEqual(at(1.7), at(1.7));
  assert.notDeepEqual(at(0.5).position, at(2.5).position);
  const base = cameraAt({ t: 2.5, sceneSec: 6, look: "moody-night", move: "static", frame }).position;
  assert.ok(Math.hypot(...at(2.5).position.map((x, i) => x - base[i])) < 2, "a drift, not a swing");
});

test("corner mascot: pinned objects leave the ground layout, frame ignores them and the corner placement is pure", () => {
  const mascot = { ...BLOCK, id: "m", corner: "br" };
  const v = { objects: [{ ...BLOCK, id: "hero" }, mascot] };
  const placed = layoutObjects(v);
  assert.equal(placed[1].corner, "br");
  assert.deepEqual(placed[0].pos, [0, 0, 0], "the other object is laid out alone");
  assert.deepEqual(frameContent(placed, "clay-mascot"), frameContent([placed[0]], "clay-mascot"));
  const cam = cameraAt({ t: 1, sceneSec: 5, look: "clay-mascot", move: "orbit", frame: frameContent(placed, "clay-mascot") });
  const a = cornerPlacement(cam, "br", 2, 1);
  assert.deepEqual(a, cornerPlacement(cam, "br", 2, 1));
  assert.notDeepEqual(a.pos, cornerPlacement(cam, "bl", 2, 1).pos);
  // the pinned mascot's base stays above the caption band (y 1130+) and its top below the headline
  for (const corner of ["bl", "br", "tl", "tr"]) {
    const cp = cornerPlacement(cam, corner, 2, 1);
    const px = projectPoint(cam, cp.pos);
    assert.ok(px.y < 1130, `${corner} base y ${px.y} must clear the captions`);
    assert.ok(px.x > 150 && px.x < 930, `${corner} x ${px.x} inside the frame`);
  }
  assert.ok(has(spec({ objects: [{ kind: "laptop", corner: "bl", stock: true }, BLOCK] }), "scenes.0.visual.objects.0.corner", /custom/));
  assert.ok(has(spec({ objects: [{ ...BLOCK, corner: "bl" }, { ...BLOCK, id: "c2", corner: "bl" }, BLOCK] }), "scenes.0.visual.objects", /one object per screen corner/));
});

test("every new format has an example that validates, builds a world or custom subjects and avoids stock content", () => {
  for (const id of ["data-stage", "monolith-story", "clay-mascot"]) {
    const raw = read(`../examples/${id}.spec.json`);
    const r = validateSpec(raw);
    assert.equal(r.ok, true, `${id}: ${JSON.stringify(r.errors)}`);
    assert.equal(raw.template, id);
    assert.ok(raw.scenes.length >= 5, `${id}: scenes`);
    for (const s of raw.scenes) {
      assert.equal(s.visual.type, "scene3d");
      assert.ok(!s.visual.stock, `${id}: no stock scenes`);
      assert.ok(s.visual.objects.some((o) => o.kind === "custom") || s.visual.world?.parts?.length, `${id}: built from scratch`);
      assert.ok(s.visual.world?.concept, `${id}: concept`);
    }
  }
});
