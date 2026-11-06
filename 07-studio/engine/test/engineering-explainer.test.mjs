import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { listTemplates, getTemplate } from "../lib/templates.mjs";
import { canonicalTemplateId, migrateLegacyIds, resolveSpec, validateSpec } from "../lib/spec.mjs";
import { computeTimeline } from "../lib/timeline.mjs";
import { CAMERA_MOVES, LOOK3D, RENDER3D, THREE_D_TEMPLATE_IDS, cameraAt, look3dOf, planThree } from "../lib/scene3d.mjs";
import { MOTION_PRESETS, nodeDelta } from "../lib/scene3d-motion.mjs";
import { BLENDER_LOOKS, blenderLook } from "../lib/blender-looks.mjs";

const ID = "engineering-explainer";
const read = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));

test("engineering-explainer is registered as a 3D master template with format slug", () => {
  assert.ok(THREE_D_TEMPLATE_IDS.includes(ID));
  const t = listTemplates().find((x) => x.id === ID);
  assert.equal(t.category, "3d");
  assert.equal(t.format, "engineering-explainer");
  assert.equal(RENDER3D[ID].set, "none");
  assert.equal(look3dOf({ template: ID }), ID);
  assert.ok(LOOK3D[ID].moves.includes("pullout"));
});

test("the 5 engineering archetypes route cleanly to the engineering master template", () => {
  const archetypes = ["como-funciona", "paso-a-paso", "que-paso", "para-que-sirve", "fuerzas-ingenieria"];
  for (const arch of archetypes) {
    assert.equal(canonicalTemplateId(arch), ID, `canonical for ${arch}`);
    const migrated = migrateLegacyIds({ template: arch, scenes: [] });
    assert.equal(migrated.template, ID, `migrated for ${arch}`);
  }
});

test("the 7 engineering motion presets are registered and compute physical state-transitions", () => {
  const presets = ["dig", "pour", "fill", "drain", "collapse", "buoyancy", "insert"];
  for (const p of presets) {
    assert.ok(MOTION_PRESETS.includes(p), `preset ${p} is in MOTION_PRESETS`);
  }

  const p = { id: "test", shape: "box", size: [1, 1, 1], pos: [0, 0, 0] };
  const ctx = { sec: (v) => Number(v) || 0, enter: 0, seed: 1 };

  // buoyancy lifts and sways
  const dBuoy = nodeDelta(p, 1.5, ctx, [{ type: "buoyancy", amp: 1.0, at: 0 }], "test", { root: true });
  assert.ok(dBuoy.pos[1] > 0.5, "buoyancy lifts in y");

  // drain lowers scale y
  const dDrain = nodeDelta(p, 2.0, ctx, [{ type: "drain", at: 0, speed: 1.0 }], "test", { root: true });
  assert.ok(dDrain.scale[1] < 0.5, "drain scales down in y");

  // insert settles from above
  const dInsertStart = nodeDelta(p, -0.1, ctx, [{ type: "insert", at: 0, amp: 1.2 }], "test", { root: true });
  assert.equal(dInsertStart.opacity, 0, "insert hidden before start");
  const dInsertEnd = nodeDelta(p, 1.0, ctx, [{ type: "insert", at: 0, amp: 1.2 }], "test", { root: true });
  assert.ok(dInsertEnd.opacity > 0.9, "insert visible after settling");
});

test("the engineering-explainer example spec (alberca) validates and plans all 7 scenes", () => {
  const raw = read("../examples/engineering-explainer.spec.json");
  const r = validateSpec(raw);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(raw.template, ID);
  assert.equal(raw.language, "es");
  assert.equal(raw.scenes.length, 7);

  const resolved = resolveSpec(r.spec, getTemplate(ID));
  const plan = planThree(resolved, computeTimeline(resolved.scenes, { fps: resolved.format.fps }));
  assert.equal(plan.length, 7);

  // Checks key narrative scenes
  assert.equal(raw.scenes[0].id, "c1", "c1: excavation");
  assert.equal(raw.scenes[1].id, "c2", "c2: soil collapse");
  assert.equal(raw.scenes[2].id, "c3", "c3: rebar grid");
  assert.equal(raw.scenes[3].id, "c4", "c4: concrete + PVC pipes");
  assert.equal(raw.scenes[4].id, "c5", "c5: filled pool");
  assert.equal(raw.scenes[5].id, "c6", "c6: empty pool floats like a boat");
  assert.equal(raw.scenes[6].id, "c7", "c7: hydrostatic relief valve");
});

test("blender look matches three.js look for engineering-explainer", () => {
  assert.ok(BLENDER_LOOKS[ID], "blender look registered");
  const b = blenderLook(ID);
  assert.equal(b.material, "toon");
  assert.equal(b.fallback, undefined);
});
