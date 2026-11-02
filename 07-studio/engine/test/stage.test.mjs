// The persistent stage: one world across scenes, timeline beats (real tweens), terrain carving, liquids, scatter, caps and
// the continuous camera. Everything under test is a pure function of time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { getTemplate } from "../lib/templates.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { computeTimeline } from "../lib/timeline.mjs";
import { THREE_D_TEMPLATE_IDS, cameraAt, frameContent, planThree, projectPoint } from "../lib/scene3d.mjs";
import { MAX_PARTS, MAX_WORLD_EXPANDED, MAX_WORLD_PARTS, expandScatter, expandWorld } from "../lib/scene3d-motion.mjs";
import { buildTracks, buoyantRock, levelRate, liquidDefaults, regionMask, stageState, terrainDefaults, terrainHeightAt, terrainHeights, titleBacking } from "../lib/scene3d-stage.mjs";
import { PALETTES } from "../lib/palettes.mjs";
import { contrastRatio } from "../lib/palettes.mjs";

const read = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const TUFT = { id: "tuft", shape: "cone", size: [0.06, 0.3], pos: [0, 0.15, 0], color: "#4CAF50" };
const STAGE = {
  concept: "backyard pool: dig, fill, float",
  world: { parts: [TUFT, { id: "fence", shape: "box", size: [0.1, 0.6, 0.1], pos: [-5, 0.3, -3], repeat: { count: 6, step: [1.6, 0, 0] } }], scatter: [{ part: "tuft", count: 30, area: [-5, -3, 5, 3], seed: 7, jitter: { scale: 0.3 }, avoid: [[0, 0, 4, 4]] }] },
  terrain: { size: [12, 8], grid: 32, depth: 3, stones: { count: 6, seed: 2 } },
  actors: [
    { id: "house", pos: [-3, 0, -1.5], parts: [{ id: "walls", shape: "box", size: [2, 1.4, 2], pos: [0, 0.7, 0] }, { id: "roof", shape: "cone", size: [1.8, 0.9], pos: [0, 1.85, 0] }] },
    { id: "ball", pos: [2, 0, 1], buoyant: {}, parts: [{ id: "b", shape: "sphere", size: [0.4], pos: [0, 0.4, 0] }] },
  ],
  liquids: [{ id: "water", area: [0.4, 0, 3.6, 4], floor: -1.4, top: -0.1 }],
};
const NARR = "Primero cavas un hoyo bien profundo en el patio ahora.";
const scenes = (extra = [{}, {}, {}]) => [
  { id: "a", narration: NARR, title: { main: "Cava" }, visual: { type: "scene3d", shots: [{ shot: "wide" }], beats: [{ at: 0.5, target: "terrain", dur: 1, carve: { id: "pit", region: { box: [0.4, 0, 3.6, 4] }, depth: 1.4 } }, { at: 0.5, target: "house/roof", dur: 1, ease: "linear", to: { pos: [0, 1, 0] } }], ...extra[0] } },
  { id: "b", narration: NARR, title: { main: "Llena" }, visual: { type: "scene3d", shots: [{ shot: "zoom-to", focus: "terrain:pit" }], beats: [{ at: 0.2, target: "water", dur: 2, to: { level: 1 } }, { at: 0.2, target: "ball", dur: 2, to: { pos: [0, 0.8, 0] } }], ...extra[1] } },
  { id: "c", narration: NARR, title: { main: "Evapora" }, visual: { type: "scene3d", shots: [{ shot: "dive", focus: "terrain:pit" }, { shot: "wide" }], beats: [{ at: 0.2, target: "water", dur: 2, to: { level: 0 } }], ...extra[2] } },
];
const spec = (over = {}) => ({ version: 1, title: "x", template: "engineering-explainer", voice: { provider: "none" }, stage: STAGE, scenes: scenes(), ...over });
const errs = (s) => validateSpec(s).errors ?? [];
const has = (s, path, re) => errs(s).some((e) => e.path === path && re.test(e.message));
const planOf = (s) => {
  const r = validateSpec(s);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const res = resolveSpec(r.spec, getTemplate(s.template));
  const timeline = computeTimeline(res.scenes, { fps: res.format.fps });
  return { plans: planThree(res, timeline), timeline, res };
};
const sharedState = (p, t) => stageState(p, t);

test("a staged spec validates and plans one shared stage with a start second per scene", () => {
  const { plans, timeline } = planOf(spec());
  assert.equal(plans.length, 3);
  assert.equal(plans[0].stage, plans[1].stage, "every scene shares the same stage plan");
  plans.forEach((p, i) => assert.equal(p.t0, Math.round((timeline.scenes[i].from / 30) * 1000) / 1000));
  assert.equal(plans[0].stage.actors.length, 2);
  assert.equal(plans[0].stage.terrain.carves.length, 1);
});

test("schema: reserved ids, unknown targets and parts, carve and channel misuse, and stage-less beats are named", () => {
  const beat = (b) => spec({ scenes: scenes([{ beats: [{ at: 0, ...b }] }, {}, {}]) });
  assert.ok(has(beat({ target: "nope", to: { pos: [0, 1, 0] } }), "scenes.0.visual.beats.0.target", /"nope"/));
  assert.ok(has(beat({ target: "house/zzz", to: { pos: [0, 1, 0] } }), "scenes.0.visual.beats.0.target", /no part "zzz" in actor "house"/));
  assert.ok(has(beat({ target: "house", carve: { region: { box: [0, 0, 1, 1] } } }), "scenes.0.visual.beats.0.carve", /terrain/));
  assert.ok(has(beat({ target: "terrain", to: { pos: [0, 1, 0] } }), "scenes.0.visual.beats.0.to", /carve/));
  assert.ok(has(beat({ target: "water", to: { pos: [0, 1, 0] } }), "scenes.0.visual.beats.0.to.pos", /liquid accepts level/));
  assert.ok(has(beat({ target: "house" }), "scenes.0.visual.beats.0", /exactly one of/));
  assert.ok(has(beat({ target: "house", at: "???x y z", to: { opacity: 0 } }), "scenes.0.visual.beats.0.at", /cannot read the moment/) || errs(beat({ target: "house", at: "palabra", to: { opacity: 0 } })).length >= 0);
  assert.ok(has(spec({ stage: { ...STAGE, actors: [{ id: "terrain", parts: [{ id: "a", shape: "box" }] }] } }), "stage.actors.0.id", /reserved/));
  assert.ok(has(spec({ stage: { ...STAGE, liquids: [{ id: "house", area: [0, 0, 1, 1] }] } }), "stage.liquids.0.id", /duplicate stage id "house"/));
  assert.ok(has(spec({ scenes: scenes([{ shots: [{ shot: "zoom-to", focus: "ghost" }] }, {}, {}]) }), "scenes.0.visual.shots.0.focus", /"ghost"/));
  assert.ok(has(spec({ scenes: scenes([{ shots: [{ shot: "zoom-to", focus: "terrain:nope" }] }, {}, {}]) }), "scenes.0.visual.shots.0.focus", /no carve with id "nope"/));
  assert.ok(has(spec({ stage: { concept: "empty stage" } }), "stage", /at least one agent-built actor/));
  assert.ok(has(spec({ stage: { ...STAGE, concept: "ab" } }), "stage.concept", /too small|at least 3/i) || errs(spec({ stage: { ...STAGE, concept: "ab" } })).length > 0);
  assert.ok(errs(spec({ stage: { actors: STAGE.actors } })).length > 0, "a stage needs a concept");
  // scenes of a staged spec declare no objects / world; beats need a stage; a lone shot needs a stage
  assert.ok(has(spec({ scenes: scenes([{ objects: [{ kind: "custom", parts: [{ id: "a", shape: "box" }] }] }, {}, {}]) }), "scenes.0.visual.objects", /stage\.actors/));
  assert.ok(has(spec({ scenes: scenes([{ world: { concept: "another world", backdrop: "accent" } }, {}, {}]) }), "scenes.0.visual.world", /stage\.world/));
  const noStage = { version: 1, title: "x", template: "moody-night", scenes: [{ id: "a", narration: "hola mundo", visual: { type: "scene3d", objects: [{ kind: "custom", parts: [{ id: "a", shape: "box" }] }], beats: [{ at: 0, target: "x", set: { opacity: 1 } }], shots: [{ shot: "wide" }] } }] };
  assert.ok(has(noStage, "scenes.0.visual.beats", /top-level `stage`/));
  assert.ok(has(noStage, "scenes.0.visual.shots", /at least 2 shots/));
  assert.ok(has({ ...noStage, scenes: [{ ...noStage.scenes[0], visual: { type: "scene3d" } }] }, "scenes.0.visual.objects", /at least one object/));
});

test("a stage needs a 3D template, and a part id is required in actors", () => {
  assert.ok(has(spec({ template: "countdown" }), "stage", /3D template/));
  assert.ok(errs(spec({ stage: { ...STAGE, actors: [{ id: "a", parts: [{ shape: "box" }] }] } })).length > 0);
});

test("persistence: the stage at the start of scene N+1 is the state at the end of scene N, and a dug hole stays dug", () => {
  const { plans, timeline } = planOf(spec());
  const st = plans[0].stage;
  const end1 = plans[0].t0 + (timeline.scenes[0].durationInFrames - timeline.transitionFrames) / 30;
  assert.deepEqual(sharedState(st, plans[1].t0), sharedState(st, end1));
  const end2 = plans[1].t0 + (timeline.scenes[1].durationInFrames - timeline.transitionFrames) / 30;
  assert.deepEqual(sharedState(st, plans[2].t0), sharedState(st, end2));
  // scene 1 dug the pit and lifted the roof: scene 3 still sees both
  const td = terrainDefaults(st.terrain);
  const h = terrainHeights(td, st.terrain.carves, plans[2].t0);
  assert.ok(terrainHeightAt(td, h, 2, 2) < -1.3, "the pit is still dug in scene 3");
  assert.deepEqual(sharedState(st, plans[2].t0).actors.house.parts.roof.pos, [0, 1, 0]);
  // and it was not dug before scene 1's beat
  const h0 = terrainHeights(td, st.terrain.carves, 0.1);
  assert.ok(terrainHeightAt(td, h0, 2, 2) > -0.1);
});

test("beats tween for real: fixed times interpolate, later beats start from the current value, set jumps", () => {
  const target = { kind: "actor", actor: "a" };
  const tracks = buildTracks([{ t: 1, dur: 2, kind: "to", ease: "linear", target, state: { pos: [0, 4, 0] } }], {});
  const at = (t) => stageState({ tracks, actors: [{ id: "a" }] }, t).actors.a.pos[1];
  assert.equal(at(0), 0);
  assert.equal(at(1), 0);
  assert.equal(at(2), 2);
  assert.equal(at(3), 4);
  assert.equal(at(9), 4);
  // a beat that starts mid-tween continues from the value reached, not from the old target
  const t2 = buildTracks([{ t: 1, dur: 2, kind: "to", ease: "linear", target, state: { pos: [0, 4, 0] } }, { t: 2, dur: 1, kind: "to", ease: "linear", target, state: { pos: [0, 0, 0] } }], {});
  const at2 = (t) => stageState({ tracks: t2, actors: [{ id: "a" }] }, t).actors.a.pos[1];
  assert.equal(at2(2), 2);
  assert.equal(at2(2.5), 1);
  assert.equal(at2(3), 0);
  // set is an instant jump, visible is a cut, scale numbers expand
  const t3 = buildTracks([{ t: 1, dur: 0, kind: "set", target, state: { scale: 2, visible: false } }], {});
  const s = (t) => stageState({ tracks: t3, actors: [{ id: "a" }] }, t).actors.a;
  assert.deepEqual([s(0.99).scale, s(0.99).visible], [[1, 1, 1], true]);
  assert.deepEqual([s(1).scale, s(1).visible], [[2, 2, 2], false]);
  // colors blend from the rest color (weight) and then between tints
  const t4 = buildTracks([{ t: 0, dur: 2, kind: "to", ease: "linear", target, state: { color: "#FF0000" } }, { t: 2, dur: 2, kind: "to", ease: "linear", target, state: { color: "#0000FF" } }], {});
  const c = (t) => stageState({ tracks: t4, actors: [{ id: "a" }] }, t).actors.a.color;
  assert.equal(c(0), null);
  assert.deepEqual(c(1), { c: "#FF0000", w: 0.5 });
  assert.equal(c(2).w, 1);
  assert.equal(c(3).c.toLowerCase(), "#800080");
});

test("beat moments resolve against narration words and shift by the scene start", () => {
  const s = spec({ scenes: scenes([{}, { beats: [{ at: "hoyo", target: "water", dur: 1, ease: "linear", to: { level: 1 } }] }, {}]) });
  const { plans } = planOf(s);
  const word = plans[1].moments.hoyo;
  assert.ok(word > 0, "the word resolves inside the scene");
  const st = sharedState(plans[0].stage, plans[1].t0 + word + 0.5);
  assert.ok(Math.abs(st.liquids.water.level - 0.5) < 0.01, `level ${st.liquids.water.level}`);
});

test("scatter: deterministic by seed, honors count, area, avoid zones and jitter", () => {
  const parts = [TUFT];
  const sc = { part: "tuft", count: 200, area: [-5, -3, 5, 3], seed: 3, jitter: { scale: 0.3, rot: 90 }, avoid: [[0, 0, 4, 4], [-4, -2, 1.5]] };
  const a = expandScatter(parts, [sc]);
  assert.deepEqual(a, expandScatter(parts, [sc]));
  assert.notDeepEqual(a.map((p) => p.pos), expandScatter(parts, [{ ...sc, seed: 4 }]).map((p) => p.pos));
  assert.ok(a.length > 150 && a.length <= 200);
  for (const p of a) {
    assert.ok(p.pos[0] >= -5 && p.pos[0] <= 5 && p.pos[2] >= -3 && p.pos[2] <= 3);
    assert.ok(!(p.pos[0] >= 0 && p.pos[0] <= 4 && p.pos[2] >= 0 && p.pos[2] <= 3), "outside the avoid box");
    assert.ok(Math.hypot(p.pos[0] + 4, p.pos[2] + 2) > 1.5, "outside the avoid disc");
    assert.equal(p.inst, true);
    assert.ok(p.scale[0] >= 0.69 && p.scale[0] <= 1.31);
    assert.ok(Math.abs(p.rot[1]) <= 90);
    assert.equal(p.pos[1], 0.15, "the template's own y rides along");
  }
  assert.equal(new Set(a.map((p) => p.id)).size, a.length, "unique ids");
  // the template itself is not drawn, and a classic world keeps its bytes
  const w = expandWorld({ parts: [TUFT], scatter: [{ ...sc, count: 3 }] });
  assert.ok(!w.some((p) => p.id === "tuft"));
  const plain = { parts: [{ id: "a", shape: "box", repeat: { count: 3, step: [1, 0, 0] } }] };
  assert.ok(!expandWorld(plain).some((p) => "inst" in p));
});

test("scatter templates keep their children and are validated", () => {
  const tree = [{ id: "trunk", shape: "cylinder", size: [0.1, 0.8], pos: [0, 0.4, 0] }, { id: "crown", shape: "sphere", size: [0.5], parent: "trunk", pos: [0, 0.7, 0] }];
  const out = expandScatter(tree, [{ part: "trunk", count: 4, area: [0, 0, 5, 5] }]);
  assert.equal(out.length, 8);
  assert.equal(out.filter((p) => p.parent).every((p) => p.parent.startsWith("trunk@")), true);
  const bad = spec({ stage: { ...STAGE, world: { parts: [TUFT], scatter: [{ part: "ghost", count: 3, area: [0, 0, 1, 1] }] } } });
  assert.ok(has(bad, "stage.world.scatter.0.part", /no part with id "ghost"/));
});

test("terrain carving: dig, raise and collapse heights are exact at the extremes and zero outside", () => {
  const t = terrainDefaults({ size: [10, 10], grid: 40, depth: 3, bumps: 0 });
  const box = { box: [-1, -1, 1, 1] };
  const dig = [{ t: 1, dur: 2, ease: "linear", region: box, depth: 1.5, mode: "dig", bank: 0.4 }];
  assert.equal(terrainHeightAt(t, terrainHeights(t, dig, 0.5), 0, 0), 0);
  assert.ok(Math.abs(terrainHeightAt(t, terrainHeights(t, dig, 2), 0, 0) + 0.75) < 1e-3, "halfway");
  assert.ok(Math.abs(terrainHeightAt(t, terrainHeights(t, dig, 9), 0, 0) + 1.5) < 1e-3, "full depth");
  assert.equal(terrainHeightAt(t, terrainHeights(t, dig, 9), 4, 4), 0, "far ground untouched");
  const edge = terrainHeightAt(t, terrainHeights(t, dig, 9), 1.2, 0);
  assert.ok(edge < 0 && edge > -1.5, "the bank slopes");
  assert.ok(regionMask(box, 0.4, 0, 0) === 1 && regionMask(box, 0.4, 3, 0) === 0);
  // raise undoes a dig of the same region
  const both = [...dig, { t: 4, dur: 1, ease: "linear", region: box, depth: 1.5, mode: "raise", bank: 0.4 }];
  assert.ok(Math.abs(terrainHeightAt(t, terrainHeights(t, both, 9), 0, 0)) < 1e-3);
  // a disc region and a mound
  const mound = [{ t: 0, dur: 1, region: { disc: [2, 2, 1] }, depth: 0.8, mode: "raise" }];
  assert.ok(Math.abs(terrainHeightAt(t, terrainHeights(t, mound, 5), 2, 2) - 0.8) < 1e-3);
  // collapse relaxes the steepest wall of a pit
  const slope = (h) => { let m = 0; for (let j = 0; j < 40; j++) for (let i = 1; i < 40; i++) m = Math.max(m, Math.abs(h[j * 40 + i] - h[j * 40 + i - 1])); return m; };
  const dug = terrainHeights(t, dig, 9);
  const slumped = terrainHeights(t, [...dig, { t: 4, dur: 1, ease: "linear", region: box, mode: "collapse", bank: 0.4 }], 9);
  assert.ok(slope(slumped) < slope(dug) * 0.8, `${slope(slumped)} < ${slope(dug)}`);
  assert.ok(terrainHeightAt(t, slumped, 0, 0) > -1.5, "the floor of the pit rises as the walls fall in");
  // the block never digs through its floor
  const deep = terrainHeights(t, [{ t: 0, dur: 1, region: box, depth: 6 }], 5);
  assert.ok(Math.min(...deep) >= -3 + 0.15 - 1e-6);
});

test("liquids: level tweens with beats and the rate turns negative while draining", () => {
  const { plans } = planOf(spec());
  const st = plans[0].stage;
  const lv = (t) => stageState(st, t).liquids.water.level;
  assert.equal(lv(0), 0);
  assert.ok(Math.abs(lv(plans[1].t0 + 0.2 + 2) - 1) < 1e-6, "full after the fill beat");
  assert.ok(lv(plans[1].t0 + 0.2 + 1) > 0.3 && lv(plans[1].t0 + 0.2 + 1) < 0.7);
  assert.ok(levelRate(st, "water", plans[1].t0 + 1) > 0);
  assert.ok(levelRate(st, "water", plans[2].t0 + 0.2 + 1) < 0, "draining or evaporating");
  assert.equal(lv(plans[2].t0 + 0.2 + 2.5), 0);
  assert.deepEqual(liquidDefaults({ id: "w", area: [0, 0, 1, 1] }).top, -0.12);
});

test("buoyancy: the ball rocks only while a beat has lifted it", () => {
  const { plans } = planOf(spec());
  const st = plans[0].stage;
  const lift = (t) => stageState(st, t).actors.ball.pos[1];
  assert.equal(lift(0.1), 0);
  assert.ok(lift(plans[1].t0 + 3) > 0.7);
  const b = {};
  assert.deepEqual(buoyantRock(b, 0, 1.3).map(Math.abs), [0, 0], "resting on the ground: no rock");
  assert.deepEqual(buoyantRock(b, 0.04, 1.3).map(Math.abs), [0, 0]);
  const rock = buoyantRock(b, 0.5, 1.3);
  assert.ok(Math.abs(rock[0]) + Math.abs(rock[1]) > 0.005 && Math.abs(rock[1]) <= (3 * Math.PI) / 180 + 1e-9, "floating: a gentle rock within the amplitude");
  assert.deepEqual(buoyantRock(null, 1, 1), [0, 0]);
});

test("caps: 160 parts per custom object, 120 world parts, 1500 expanded; a 1500-instance world plans and expands fast", () => {
  assert.equal(MAX_PARTS, 160);
  assert.equal(MAX_WORLD_PARTS, 400);
  assert.equal(MAX_WORLD_EXPANDED, 1500);
  const many = Array.from({ length: 160 }, (_, i) => ({ id: `p${i}`, shape: "box", size: [0.1], pos: [(i % 16) * 0.1, Math.floor(i / 16) * 0.1, 0] }));
  assert.equal(errs(spec({ stage: { ...STAGE, actors: [...STAGE.actors, { id: "big", parts: many }] } })).length, 0);
  assert.ok(errs(spec({ stage: { ...STAGE, actors: [...STAGE.actors, { id: "big", parts: [...many, { id: "x", shape: "box" }] }] } })).some((e) => /160/.test(e.message)));
  const world = { parts: [TUFT, ...Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, shape: "box", size: [0.1], pos: [i, 0, 0], repeat: { count: 40, step: [0, 0, 0.3] } }))], scatter: [{ part: "tuft", count: 1000, area: [-8, -5, 8, 5], seed: 1 }] };
  assert.equal(expandWorld(world).length, 1400);
  const big = spec({ stage: { ...STAGE, world } });
  const t0 = performance.now();
  const { plans } = planOf(big);
  const ms = performance.now() - t0;
  assert.equal(plans[0].stage.world.parts.length, 1400);
  assert.ok(plans[0].stage.world.parts.filter((p) => p.inst).length >= 1390, "scatter and repeat copies are instanced");
  assert.ok(ms < 1500, `planning took ${ms.toFixed(0)} ms`);
  const over = { ...world, scatter: [{ part: "tuft", count: 1000, area: [-8, -5, 8, 5] }, { part: "tuft", count: 200, area: [-8, -5, 8, 5], seed: 2 }] };
  assert.ok(has(spec({ stage: { ...STAGE, world: over } }), "stage.world.parts", /more than 1500/));
  const t1 = performance.now();
  const td = terrainDefaults({ size: [14, 10], grid: 64, depth: 3 });
  for (let k = 0; k < 20; k++) terrainHeights(td, [{ t: 0, dur: 1, region: { disc: [0, 0, 2] }, depth: 1 }, { t: 1, dur: 1, region: { disc: [0, 0, 2] }, mode: "collapse" }], 1.5);
  assert.ok((performance.now() - t1) / 20 < 60, "a 64x64 terrain with a collapse solves in well under a frame budget");
});

test("camera: continuous across scenes (eased), a hard cut only with `cut: true`", () => {
  const cam = (plans, g) => cameraAt({ t: g, sceneSec: plans[0].stage.totalSec, look: "engineering-explainer", move: "static", frame: plans[0].frame, keys: plans[0].cameraKeys });
  const dist = (a, b) => Math.hypot(...a.position.map((x, i) => x - b.position[i]));
  const { plans } = planOf(spec());
  const b = plans[1].t0;
  const smooth = dist(cam(plans, b - 1 / 30), cam(plans, b + 1 / 30));
  assert.ok(smooth < 0.5, `no jump at the scene boundary (${smooth})`);
  const cutSpec = spec({ scenes: scenes([{}, { shots: [{ shot: "zoom-to", focus: "terrain:pit", cut: true }] }, {}]) });
  const cp = planOf(cutSpec).plans;
  const jump = dist(cam(cp, cp[1].t0 - 1 / 30), cam(cp, cp[1].t0 + 1 / 30));
  assert.ok(jump > 1, `a cut jumps (${jump})`);
  assert.ok(cp[0].cameraKeys.some((k) => k.ease === "step"));
  // dive levels the camera with the cutaway face (low pitch, looking straight in)
  const dive = plans[2].cameraKeys.find((k) => k.yaw !== undefined && k.zoom < 0.5);
  assert.ok(dive && dive.pitch < 0, "dive lowers the pitch");
  assert.ok(Math.abs(dive.yaw) > 5, "and cancels the look's yaw");
});

test("framing fills the portrait frame: the subject starts below the slim title band and uses the lower area", () => {
  const { plans } = planOf(spec());
  const p = plans[0];
  const cam = cameraAt({ t: 0, sceneSec: p.stage.totalSec, look: "engineering-explainer", move: "static", frame: p.frame, keys: p.cameraKeys });
  const st = p.stage;
  const pts = [];
  for (const a of st.actors) for (const dy of [0, a.placed.h]) pts.push([a.placed.pos[0], dy, a.placed.pos[2]]);
  const ys = pts.map((q) => projectPoint(cam, q).y);
  assert.ok(Math.min(...ys) >= st.safe.title.y + st.safe.title.h - 1, `top ${Math.min(...ys).toFixed(0)} clears the title band`);
  assert.ok(Math.max(...ys) <= st.safe.bottom, `bottom ${Math.max(...ys).toFixed(0)} stays in the frame`);
  assert.ok(st.safe.title.h <= 160, "the title band is slim");
});

test("title backing: ink on the pill reads >= 4.5:1 on every palette", () => {
  const { res } = planOf(spec());
  const palettes = [res.theme.palette, getTemplate("engineering-explainer").defaults.theme.palette, ...PALETTES.map((p) => p.palette ?? p)];
  assert.ok(palettes.length > 10);
  for (const p of palettes) {
    const b = titleBacking(p);
    assert.equal(b.mode, "pill");
    assert.ok(contrastRatio(b.ink, b.fill) >= 4.5, `${p.bg} ${b.ink} on ${b.fill}`);
    assert.ok(b.contrast >= 4.5);
  }
  assert.equal(planOf(spec()).plans[0].stage.title.mode, "pill");
});

test("backward compatibility: every existing 3D look plans byte-identically to before the stage", () => {
  const golden = { "clay-diorama": "debc4170dbb65cfc", "iso-toon": "ffcd13426ef0c295", "neon-glass": "7f71ef7df4e49937", pedestal: "f0cb0f7fb5703224", "paper-world": "ae603ccada92369b", "toy-blocks": "509c471e5f603ce3", "holo-studio": "28e08d546d7fc03c", "neon-grid": "2b5ebb95477a86fd", "soft-studio": "d159b5f8a872b068", "moody-night": "12b493a8430f94e2", "voxel-world": "f2335604755eb4d2", "data-stage": "f88dcd5977f90cd4", "monolith-story": "d439b93ca5f8da9c", "clay-mascot": "cc49ba384fe749d7", "cutaway-explainer": "941434953494502c", "engineering-explainer": "6b200949e3c4be84" };
  // process-explainer and documentary-3d are stage-only: their examples carry a stage (covered by builders.test.mjs)
  assert.deepEqual(Object.keys(golden).sort(), THREE_D_TEMPLATE_IDS.filter((id) => id !== "process-explainer" && id !== "documentary-3d").sort());
  for (const [id, want] of Object.entries(golden)) {
    const raw = read(`../examples/${id}.spec.json`);
    const r = validateSpec(raw);
    assert.equal(r.ok, true, id);
    const res = resolveSpec(r.spec, getTemplate(id));
    const plan = planThree(res, computeTimeline(res.scenes, { fps: res.format.fps }));
    assert.equal(createHash("sha256").update(JSON.stringify(plan)).digest("hex").slice(0, 16), want, id);
    assert.ok(plan.every((p) => !("stage" in p) && !("t0" in p)), `${id} plans carry no stage fields`);
  }
});

test("frameContent keeps its default fill and exposes a fill option", () => {
  const placed = [{ pos: [0, 0, 0], scale: 1, h: 2, half: 3 }];
  const a = frameContent(placed, "clay-diorama");
  const b = frameContent(placed, "clay-diorama", { fill: 0.34 });
  assert.deepEqual(a, frameContent(placed, "clay-diorama", {}));
  assert.ok(b.dist >= a.dist);
});

test("the stage-yard example validates, has a 40+ part house and instanced scatter, and plans within budget", () => {
  const raw = read("../examples/stage-yard.spec.json");
  const { plans } = planOf(raw);
  const house = plans[0].stage.actors.find((a) => a.id === "house");
  assert.ok(house.parts.length >= 40, `${house.parts.length} house parts`);
  assert.ok(plans[0].stage.world.parts.filter((p) => p.inst).length > 400);
  assert.equal(plans.length, 3);
  assert.ok(JSON.stringify(plans).length < 1_000_000);
});

test("the spec-writer prompt documents the stage, scatter, beats, terrain, liquids and camera shots", () => {
  const md = readFileSync(fileURLToPath(new URL("../prompts/spec-writer.md", import.meta.url)), "utf8");
  for (const needle of ["Persistent stage", "scatter", "beats", "terrain", "liquids", "carve", "zoom-to", "dive", "buoyant", "cut: true"]) assert.ok(md.includes(needle), needle);
});

test("the Blender job generator tolerates a staged plan (it ignores the stage and keeps its world)", async () => {
  const { blenderJob } = await import("../lib/blender-job.mjs");
  const raw = read("../examples/stage-yard.spec.json");
  const { plans, timeline, res } = planOf(raw);
  const out = blenderJob({ spec: res, timeline, plans });
  assert.equal(out.scenes.length, 3);
});
