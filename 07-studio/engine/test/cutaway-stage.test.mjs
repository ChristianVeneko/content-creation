// Cutaway stage kit: the `appliance` builder, the richer cutaway `house` (rooms, stairs, back windows), the expressive `person`,
// the cable style of `pipe-run`, and the staged cutaway-stage example (one house, one character, flow / limit overlays).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate } from "../lib/templates.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { computeTimeline } from "../lib/timeline.mjs";
import { planThree } from "../lib/scene3d.mjs";
import { BUILDER_NAMES, describeBuilders, runBuilder } from "../lib/scene3d-builders.mjs";
import { MAX_PARTS, partSchema } from "../lib/scene3d-motion.mjs";

const read = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const ids = (res) => res.parts.map((p) => p.id);

const KINDS = ["sofa", "tv", "lamp", "kettle", "microwave", "fridge", "bed", "washer", "heater", "table"];

test("appliance: every kind builds valid parts, deterministic, with the ids beats address", () => {
  assert.ok(BUILDER_NAMES.includes("appliance"));
  const def = describeBuilders().find((d) => d.name === "appliance");
  assert.deepEqual(def.params.kind.values, KINDS);
  for (const kind of KINDS) {
    const a = runBuilder("appliance", { kind }, { seed: 2 });
    assert.deepEqual(a, runBuilder("appliance", { kind }, { seed: 2 }), `${kind} not deterministic`);
    assert.ok(a.parts.length >= 6 && a.parts.length <= 60, `${kind}: ${a.parts.length} parts`);
    assert.equal(new Set(ids(a)).size, a.parts.length, `${kind} duplicate ids`);
    for (const p of a.parts) {
      assert.ok(partSchema.safeParse(p).success, `${kind}/${p.id}`);
      assert.ok((p.pos ?? []).every((v) => Math.abs(v) <= 5));
    }
  }
  assert.ok(ids(runBuilder("appliance", { kind: "tv" })).includes("screen"));
  assert.ok(ids(runBuilder("appliance", { kind: "lamp" })).includes("bulb"));
  assert.ok(ids(runBuilder("appliance", { kind: "kettle" })).includes("led"));
  assert.ok(ids(runBuilder("appliance", { kind: "heater" })).includes("glow"));
});

test("appliance: `on` starts the lit parts lit; off keeps them dark", () => {
  const color = (res, id) => res.parts.find((p) => p.id === id).color;
  assert.notEqual(color(runBuilder("appliance", { kind: "tv", on: true }), "screen"), color(runBuilder("appliance", { kind: "tv", on: false }), "screen"));
  assert.notEqual(color(runBuilder("appliance", { kind: "lamp", on: true }), "bulb"), color(runBuilder("appliance", { kind: "lamp", on: false }), "bulb"));
});

test("house cutaway: the default cutaway keeps its furniture; rooms, stairs, back windows and lights are opt-in", () => {
  const base = runBuilder("house", { cutaway: true }, { seed: 1 });
  for (const id of ["sofa", "table", "bed", "lamp-0", "lamp-1", "shelf-0"]) assert.ok(ids(base).includes(id), `default cutaway lost ${id}`);
  for (const id of ["stairs", "partition", "bwin-0-0", "step-0"]) assert.ok(!ids(base).includes(id), `${id} must be opt-in`);
  const rich = runBuilder("house", { cutaway: true, furnish: false, stairs: true, partition: true, backWindows: true }, { seed: 1 });
  for (const id of ["partition", "bwin-0-0", "bwin-glass-0-0", "step-0", "rail", "door-gap"]) assert.ok(ids(rich).includes(id), `rich cutaway lacks ${id}`);
  assert.ok(!ids(rich).includes("sofa"), "furnish:false removes the built-in furniture");
  assert.ok(rich.parts.length <= MAX_PARTS);
  assert.ok(!ids(runBuilder("house", {}, { seed: 1 })).some((i) => /^(step-|partition|bwin)/.test(i)), "the closed house is unchanged");
});

test("person: neutral stays as it was (52 parts); expressions change the face and keep every rig group", () => {
  const neutral = runBuilder("person", {}, { seed: 1 });
  assert.equal(neutral.parts.length, 52);
  for (const e of ["smile", "surprised", "worried"]) {
    const r = runBuilder("person", { expression: e }, { seed: 1 });
    assert.notDeepEqual(r.parts.find((p) => p.id === "mouth"), neutral.parts.find((p) => p.id === "mouth"), `${e} mouth`);
    for (const g of ["head", "arm-l", "arm-r", "leg-l", "leg-r", "mouth", "brow"]) assert.ok(ids(r).includes(g), `${e} lacks ${g}`);
  }
  const g = runBuilder("person", { glasses: true, beard: true }, { seed: 1 });
  assert.ok(ids(g).includes("glasses") && ids(g).includes("beard"));
});

test("pipe-run cable style: thin conduit without couplings, still carries the dots", () => {
  const pipe = runBuilder("pipe-run", {}, { seed: 1 });
  const cable = runBuilder("pipe-run", { style: "cable" }, { seed: 1 });
  assert.ok(cable.parts.length < pipe.parts.length);
  assert.ok(!ids(cable).some((i) => i.startsWith("coupling")));
  assert.ok(ids(cable).includes("dot"));
  assert.ok(ids(pipe).includes("coupling"), "pipe default unchanged");
});

// ---- the example ----
const planOf = (raw) => {
  const r = validateSpec(raw);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const res = resolveSpec(r.spec, getTemplate(raw.template));
  return { plans: planThree(res, computeTimeline(res.scenes, { fps: res.format.fps })), spec: r.spec };
};

test("cutaway-stage example: one persistent house and character, 14+ scenes, 8+ builders, beats, flow and limit overlays", () => {
  const raw = read("../examples/cutaway-stage.spec.json");
  const { plans, spec } = planOf(raw);
  assert.ok(raw.scenes.length >= 14 && raw.scenes.length <= 20, `${raw.scenes.length} scenes`);
  assert.ok(plans.every((p) => p.stage === plans[0].stage), "one shared stage");
  assert.ok(spec.stage.actors.every((a) => a.parts.length <= MAX_PARTS));
  const used = new Set();
  const scan = (o) => {
    if (Array.isArray(o)) o.forEach(scan);
    else if (o && typeof o === "object") {
      if (typeof o.build === "string") used.add(o.build);
      Object.values(o).forEach(scan);
    }
  };
  scan(raw.stage);
  assert.ok(used.size >= 8, `only ${used.size} builders: ${[...used].join(", ")}`);
  const hero = raw.stage.actors.find((a) => a.build === "person").id;
  const beats = raw.scenes.flatMap((s) => s.visual.beats ?? []);
  assert.ok(beats.filter((b) => b.target === hero || b.target.startsWith(`${hero}/`)).length >= 6, "6+ beats on the character");
  const overlays = raw.scenes.flatMap((s) => s.visual.overlay ?? []).map((o) => o.type);
  for (const t of ["flow", "limit", "concept", "versus"]) assert.ok(overlays.includes(t), `no ${t} overlay`);
  assert.ok(beats.some((b) => b.set?.color || b.to?.color), "a color change (lights, night, red alert)");
});
