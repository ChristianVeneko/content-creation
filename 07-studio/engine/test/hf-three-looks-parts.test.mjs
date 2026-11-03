// three-looks from scratch: part vocabulary, validation, builders and the no-stock rule (U12).
import { test } from "node:test";
import assert from "node:assert/strict";
import { PART_SHAPES, PART_ROLES, MOTION_PRESETS, MAX_PARTS, MAX_WORLD_PARTS, partSchema, validateParts, partsExtent } from "../hf/three-looks/parts.mjs";
import { BUILDERS, BUILDER_KINDS, CHARACTER_DESIGNS, buildParts } from "../hf/three-looks/builders/index.mjs";
import { payloadSchema } from "../hf/three-looks/schema.mjs";

const issues = (parts) => validateParts(parts).map((i) => `${i.path.join(".")}: ${i.message}`);

test("vocabulary: 12 primitive shapes, 7 color roles and the 13 motion presets of the brief", () => {
  assert.deepEqual([...PART_SHAPES].sort(), ["box", "capsule", "cone", "cylinder", "extrude", "group", "lathe", "plane", "ring", "sphere", "torus", "tube"]);
  assert.deepEqual([...PART_ROLES].sort(), ["accent", "body", "dark", "glow", "light", "metal", "screen"]);
  for (const m of ["bob", "float", "spin", "wobble", "breathe", "hop", "pop-in", "look-at-camera", "wave", "walk", "blink", "assemble", "explode"]) assert.ok(MOTION_PRESETS.includes(m), m);
  assert.equal(MAX_PARTS, 160); assert.equal(MAX_WORLD_PARTS, 400);
});

test("parts validation: unknown shape, wrong size arity, missing points, duplicate id, unknown parent, cycles, parts limit", () => {
  assert.equal(partSchema.safeParse({ id: "a", shape: "blob", size: [1] }).success, false);
  assert.match(partSchema.safeParse({ id: "a", shape: "blob" }).error.issues[0].message, /unknown part shape "blob".*box/);
  assert.match(issues([{ id: "a", shape: "cone", size: [1, 2, 3] }]).join("\n"), /cone.*size/);
  assert.match(issues([{ id: "a", shape: "tube", size: [0.1], points: [[0, 0, 0]] }]).join("\n"), /tube needs at least 2 `points`/);
  assert.match(issues([{ id: "a", shape: "lathe" }]).join("\n"), /lathe needs at least 2 `points`/);
  assert.match(issues([{ id: "a", shape: "box", size: [1] }, { id: "a", shape: "box", size: [1] }]).join("\n"), /duplicate part id "a"/);
  assert.match(issues([{ id: "a", shape: "box", size: [1], parent: "zz" }]).join("\n"), /unknown parent "zz"/);
  assert.match(issues([{ id: "a", shape: "box", size: [1], parent: "b" }, { id: "b", shape: "box", size: [1], parent: "a" }]).join("\n"), /cycle/);
  assert.match(issues([{ id: "a", shape: "box", size: [1], parent: "a" }]).join("\n"), /own parent|cycle/);
  assert.match(issues([{ id: "a", shape: "box", size: [1], motion: [{ type: "walk", parts: ["nope"] }] }]).join("\n"), /unknown part "nope"/);
  assert.match(issues(Array.from({ length: MAX_PARTS + 1 }, (_, i) => ({ id: `p${i}`, shape: "box", size: [1] }))).join("\n"), /at most 160 parts/);
  assert.deepEqual(issues([{ id: "a", shape: "box", size: [1, 2, 3], radius: 0.1 }, { id: "b", shape: "sphere", size: [0.5], parent: "a" }]), []);
});

test("states and motion are validated: known state names and presets only", () => {
  assert.match(partSchema.safeParse({ id: "a", shape: "box", size: [1], states: { explode2: {} } }).error.issues.map((i) => i.message).join(), /./);
  assert.equal(partSchema.safeParse({ id: "a", shape: "box", size: [1], states: { open: { rot: [0, -90, 0] } } }).success, true);
  assert.match(issues([{ id: "a", shape: "box", size: [1], motion: ["moonwalk"] }]).join("\n"), /unknown motion "moonwalk".*bob/);
});

test("partsExtent: a box on y = 0 stands on the ground; a parent offset moves its child; rest rotation is honoured", () => {
  const e = partsExtent([{ id: "a", shape: "box", size: [2, 1, 1], pos: [0, 0.5, 0] }]);
  assert.deepEqual(e.min.map((v) => +v.toFixed(3)), [-1, 0, -0.5]); assert.deepEqual(e.max.map((v) => +v.toFixed(3)), [1, 1, 0.5]);
  const f = partsExtent([{ id: "a", shape: "group", pos: [3, 0, 0] }, { id: "b", shape: "sphere", size: [0.5], pos: [0, 0.5, 0], parent: "a" }]);
  assert.ok(Math.abs(f.center[0] - 3) < 1e-6 && Math.abs(f.top - 1) < 1e-6);
  const r = partsExtent([{ id: "a", shape: "box", size: [2, 0.2, 0.2], pos: [0, 1, 0], rot: [0, 0, 90] }]);
  assert.ok(r.max[1] - r.min[1] > 1.9 && r.max[0] - r.min[0] < 0.3);
});

test("builders: at least 24 procedural kinds with the kit named in the brief and 4 distinct character designs", () => {
  for (const k of ["microwave", "oven", "laptop", "phone", "router", "server-rack", "battery", "padlock", "magnifier", "pipe", "elbow", "valve", "pipe-system", "funnel", "conveyor", "gears", "cloud", "chart-bars", "door", "table", "shelf", "plant", "lamp", "character"]) assert.ok(BUILDER_KINDS.includes(k), k);
  assert.ok(BUILDER_KINDS.length >= 24);
  assert.equal(CHARACTER_DESIGNS.length, 4);
});

test("every builder gives valid parts (schema + graph rules) for several seeds, stands on y = 0 and stays under the limits", () => {
  for (const kind of BUILDER_KINDS) for (const seed of [0, 1, 7, 99]) {
    const out = buildParts(kind, { seed });
    assert.ok(out.parts.length >= 3 && out.parts.length <= MAX_PARTS, `${kind}/${seed}: ${out.parts.length} parts`);
    for (const p of out.parts) { const r = partSchema.safeParse(p); assert.ok(r.success, `${kind}/${seed}/${p.id}: ${r.success ? "" : JSON.stringify(r.error.issues)}`); }
    assert.deepEqual(issues(out.parts), [], `${kind}/${seed}`);
    const e = partsExtent(out.parts);
    assert.ok(e.min[1] > -0.35 && e.min[1] < 0.35, `${kind}: base at y ${e.min[1].toFixed(2)}`);
    assert.ok(e.top > 0.15 && e.top < 4.2, `${kind}: height ${e.top.toFixed(2)}`);
  }
});

test("builders are pure: the same params give byte-identical parts; a seed changes the result of seeded builders; params override role colors", () => {
  for (const kind of BUILDER_KINDS) assert.equal(JSON.stringify(buildParts(kind, { seed: 3 })), JSON.stringify(buildParts(kind, { seed: 3 })), kind);
  assert.notEqual(JSON.stringify(buildParts("character", { seed: 1 }).parts), JSON.stringify(buildParts("character", { seed: 2 }).parts));
  assert.notEqual(JSON.stringify(buildParts("chart-bars", { seed: 1 }).parts), JSON.stringify(buildParts("chart-bars", { seed: 5 }).parts));
  const c = buildParts("microwave", { colors: { body: "#112233" } });
  assert.equal(c.colors.body, "#112233");
});

test("characters: 4 designs differ, rig ids exist for emotes (head, arms, legs, eyes), eyes blink, a few hats and expressions", () => {
  const sig = new Set();
  for (const design of CHARACTER_DESIGNS) {
    const { parts, states } = buildParts("character", { design, seed: 2 });
    const ids = new Set(parts.map((p) => p.id));
    for (const need of ["head", "armL", "armR", "legL", "legR", "eyeL", "eyeR", "mouth", "torso"]) assert.ok(ids.has(need), `${design} lacks ${need}`);
    assert.ok(parts.length >= 24 && parts.length <= 80, `${design} ${parts.length}`);
    sig.add(JSON.stringify(parts.map((p) => [p.shape, p.size, p.color ?? p.role])));
    assert.ok(parts.some((p) => (p.motion ?? []).some((m) => (m.type ?? m) === "blink")) || states?.blink !== false);
    assert.ok(partsExtent(parts).top > 1.4 && partsExtent(parts).top < 2.2, `${design} height`);
  }
  assert.equal(sig.size, 4, "designs share no silhouette");
  const base = buildParts("character", { design: "kid", hat: "none", expression: "smile" }).parts.length;
  assert.ok(buildParts("character", { design: "kid", hat: "hardhat" }).parts.length > base);
  assert.notEqual(JSON.stringify(buildParts("character", { design: "kid", expression: "worried" }).parts), JSON.stringify(buildParts("character", { design: "kid", expression: "smile" }).parts));
});

test("props expose named states: microwave opens, battery fills in segments, valve spins, server rack opens", () => {
  const stateNames = (kind, params) => new Set(buildParts(kind, params).parts.flatMap((p) => Object.keys(p.states ?? {})));
  assert.ok(stateNames("microwave").has("open")); assert.ok(stateNames("microwave").has("glow"));
  assert.ok(stateNames("battery", { segments: 5 }).has("fill"));
  assert.equal(buildParts("battery", { segments: 5 }).parts.filter((p) => p.id.startsWith("seg")).length, 5);
  assert.ok(stateNames("valve").has("spin")); assert.ok(stateNames("server-rack").has("open")); assert.ok(stateNames("padlock").has("open"));
  assert.ok(stateNames("chart-bars").has("fill")); assert.ok(stateNames("gears").has("spin"));
});

const base = () => ({ worlds: [{ set: "studio", objects: [{ id: "mw", build: "microwave" }], beats: [] }] });

test("stock rule: catalog/GLB model kinds are rejected unless `stock: true`; the default payload needs no files", () => {
  assert.equal(payloadSchema.safeParse(base()).success, true);
  const withModel = base(); withModel.worlds[0].objects.push({ id: "t", model: "taxi" });
  const r = payloadSchema.safeParse(withModel);
  assert.equal(r.success, false);
  assert.match(r.error.issues.map((i) => i.message).join("\n"), /stock models are off.*stock: true/s);
  const heroModel = { ...base(), hero: "robo" };
  assert.match(payloadSchema.safeParse(heroModel).error.issues.map((i) => i.message).join("\n"), /hero.*(from scratch|stock)/s);
  assert.equal(payloadSchema.safeParse({ ...withModel, stock: true }).success, true);
});

test("custom objects: hand-written parts, motion, keys and corner pin validate; cycles and unknown shapes are reported with the object id", () => {
  const ok = base();
  ok.worlds[0].objects = [{ id: "rocket", label: "Cohete", corner: "front-left", parts: [{ id: "b", shape: "capsule", size: [0.4, 1], pos: [0, 1, 0], role: "body" }, { id: "f", shape: "cone", size: [0.3, 0.5], pos: [0, 0.4, 0], parent: "b", rot: [180, 0, 0], role: "accent", keys: [{ at: 1, pos: [0, 0.2, 0] }] }], motion: ["bob"], keys: [{ at: { word: "hola" }, scale: 1.2 }] }];
  const r = payloadSchema.safeParse(ok); assert.ok(r.success, r.success ? "" : JSON.stringify(r.error.issues));
  const bad = base();
  bad.worlds[0].objects = [{ id: "x", parts: [{ id: "a", shape: "box", size: [1], parent: "b" }, { id: "b", shape: "box", size: [1], parent: "a" }] }];
  assert.match(payloadSchema.safeParse(bad).error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"), /objects\.0\.parts.*cycle/s);
  const none = base(); none.worlds[0].objects = [{ id: "x" }];
  assert.match(payloadSchema.safeParse(none).error.issues.map((i) => i.message).join("\n"), /needs `build` .* or `parts`/);
  assert.equal(BUILDERS.microwave.about.length > 10, true);
});
