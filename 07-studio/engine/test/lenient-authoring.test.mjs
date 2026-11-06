import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSpec } from "../lib/spec.mjs";
import { normalizeStageAuthoring } from "../lib/scene3d-lenient.mjs";

const base = () => JSON.parse(readFileSync(new URL("../examples/process-tech-tutorial.spec.json", import.meta.url), "utf8"));
const problems = (spec) => {
  const r = validateSpec(spec);
  return r.ok ? [] : r.errors.map((e) => `${e.path}: ${e.message}`);
};

test("the untouched example still validates", () => assert.deepEqual(problems(base()), []));

test("flow chips written as plain strings become chip objects", () => {
  const spec = base();
  let changed = 0;
  for (const s of spec.scenes) for (const o of s.visual.overlay ?? []) if (o.type === "flow") { o.chips = o.chips.map((c) => c.label); o.active = undefined; o.steps = undefined; changed++; }
  assert.ok(changed > 0);
  assert.deepEqual(problems(spec), []);
});

test("duplicate or long chip labels still get unique ids and fit the label limit", () => {
  const spec = base();
  const flow = spec.scenes.flatMap((s) => s.visual.overlay ?? []).find((o) => o.type === "flow");
  flow.chips = ["Navegador web", "Navegador web", "Servidor de aplicaciones"];
  flow.active = undefined;
  flow.steps = undefined;
  assert.deepEqual(problems(spec), []);
});

test("particles without a kind default to dust instead of failing", () => {
  const spec = base();
  spec.scenes[0].visual.fx = [{ type: "particles" }];
  assert.deepEqual(problems(spec), []);
});

test("a stage world of 300 parts (builders expand into it) is accepted, 401 is not", () => {
  const spec = base();
  const part = (i) => ({ id: `extra${i}`, shape: "box", pos: [(i % 20) * 0.2 - 2, 0.05, Math.floor(i / 20) * 0.2 - 2], size: [0.1, 0.1, 0.1], role: "body" });
  const withParts = (n) => {
    const s = base();
    s.stage.world.parts = [...(s.stage.world.parts ?? []), ...Array.from({ length: n }, (_, i) => part(i))];
    return s;
  };
  const ok = problems(withParts(300 - (spec.stage.world.parts ?? []).length));
  assert.deepEqual(ok.filter((p) => p.includes("world parts")), []);
  assert.ok(problems(withParts(430)).some((p) => p.includes("at most 400 world parts")));
});

test("the active chip and step references may use the label (any case, with or without accents) instead of the id", () => {
  const spec = base();
  const flow = spec.scenes.flatMap((s) => s.visual.overlay ?? []).find((o) => o.type === "flow");
  flow.chips = ["Tú", "Tokens", "Internet", "Modelo"];
  flow.active = "Tú";
  flow.steps = [{ at: 1, active: "Tokens", values: { Tokens: "3" } }, { at: 2, active: "MODELO" }];
  assert.deepEqual(problems(spec), []);
  const out = validateSpec(spec).spec;
  const f = out.scenes.flatMap((s) => s.visual.overlay ?? []).find((o) => o.type === "flow" && o.chips.length === 4);
  assert.equal(f.active, "tu");
  assert.equal(f.steps[0].active, "tokens");
  assert.deepEqual(Object.keys(f.steps[0].values), ["tokens"]);
  assert.equal(f.steps[1].active, "modelo");
});

test("labels also resolve when the chips are already objects, and a truly unknown chip is still an error", () => {
  const spec = base();
  const flow = spec.scenes.flatMap((s) => s.visual.overlay ?? []).find((o) => o.type === "flow");
  flow.chips = [{ id: "a", icon: "circle", label: "Origen" }, { id: "b", icon: "circle", label: "Destino" }];
  flow.active = "Destino";
  flow.steps = undefined;
  assert.deepEqual(problems(spec), []);
  flow.active = "Nada";
  assert.ok(problems(spec).some((p) => /no chip with id "Nada"/.test(p)));
});

test("an unknown part role is repaired instead of rejecting the spec", () => {
  const part = (id, role) => ({ id, shape: "box", size: [1, 1, 1], role });
  const spec = { scenes: [{ visual: { type: "scene3d", world: { parts: [part("a", "wood"), part("b", "#AA5500"), part("c", "banana"), part("d", "metal")] } } }] };
  const [a, b, c, d] = normalizeStageAuthoring(spec).scenes[0].visual.world.parts;
  assert.equal(a.role, "body");
  assert.equal(b.role, undefined);
  assert.equal(b.color, "#AA5500");
  assert.equal(c.role, "body");
  assert.equal(d.role, "metal");
  assert.equal(spec.scenes[0].visual.world.parts[0].role, "wood", "input is not mutated");
});

test("keyframe position offsets beyond +-6 are clamped, in parts and in objects", () => {
  const spec = { scenes: [{ visual: { type: "scene3d", objects: [{ id: "o", keys: [{ at: 0, pos: [0, 0, -9] }] }, { id: "p", parts: [{ id: "x", shape: "box", keys: [{ at: 0, pos: [0, 0, 0] }, { at: 1, pos: [2, 3, -12] }] }] }] } }] };
  const out = normalizeStageAuthoring(spec).scenes[0].visual.objects;
  assert.deepEqual(out[0].keys[0].pos, [0, 0, -6]);
  assert.deepEqual(out[1].parts[0].keys[1].pos, [2, 3, -6]);
  assert.deepEqual(spec.scenes[0].visual.objects[1].parts[0].keys[1].pos, [2, 3, -12], "input is not mutated");
});

test("easing names written in other styles map to the valid ones; unknown names fall back to the default", () => {
  const ease = (e) => ({ at: 0, ease: e });
  const spec = { scenes: [{ visual: { type: "scene3d", objects: [{ id: "o", keys: ["easeInOut", "ease-out", "easeIn", "ease", "cubic-bezier", "spring", "bounce", "linear", "in-out-back"].map(ease) }] } }] };
  const got = normalizeStageAuthoring(spec).scenes[0].visual.objects[0].keys.map((k) => k.ease);
  assert.deepEqual(got, ["in-out", "out", "in", "in-out", undefined, "elastic", "bounce", "linear", "back"]);
});
