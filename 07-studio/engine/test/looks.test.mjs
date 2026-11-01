import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate, listTemplates, validateTemplate } from "../lib/templates.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { LOOKS, lookOf, usesIllustratedKit } from "../lib/illustrated.mjs";
import { lookSchema } from "../lib/illustration-schema.mjs";
import { ART_LOOKS } from "../lib/illustrated.mjs";
import { THREE_D_TEMPLATE_IDS } from "../lib/scene3d.mjs";

const NEW = ["whiteboard", "broadcast", "editorial-chart", "editor-window", "rank-numbers"];
const OLD = ["illustrated", "captions-voice", "kinetic-type", "countdown", "glass-cards", "letterbox"];
const example = (id) => JSON.parse(readFileSync(fileURLToPath(new URL(`../examples/${id}.spec.json`, import.meta.url)), "utf8"));

test("the template list puts the illustrated-kit looks first, then the art looks, the 3D looks, and the classic templates last", () => {
  const ids = listTemplates().map((t) => t.id);
  for (const id of [...OLD, ...NEW, ...ART_LOOKS, ...THREE_D_TEMPLATE_IDS]) assert.ok(ids.includes(id), `missing ${id}`);
  assert.deepEqual(ids.slice(0, 6), ["illustrated", ...NEW]);
  assert.deepEqual(ids.slice(6, 6 + ART_LOOKS.length), ART_LOOKS);
  const at3d = ids.indexOf("clay-diorama");
  assert.deepEqual(ids.slice(at3d, at3d + THREE_D_TEMPLATE_IDS.length), THREE_D_TEMPLATE_IDS);
  assert.deepEqual(ids.slice(-5), OLD.filter((id) => id !== "illustrated"));
});

test("every new template is drawn with the illustrated kit and has gallery metadata", () => {
  for (const id of NEW) {
    const t = getTemplate(id);
    assert.ok(usesIllustratedKit(id), id);
    for (const k of ["id", "name", "description", "prompt_hint", "best_for", "preview", "defaults"]) assert.ok(t[k], `${id} missing ${k}`);
    assert.equal(t.preview.style, "illustrated", `${id} preview style`);
    assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(JSON.stringify(t)), `${id} has emoji`);
  }
});

test("each new example spec validates against its template", () => {
  for (const id of NEW) {
    const raw = example(id);
    assert.equal(raw.template, id);
    const r = validateSpec(raw);
    assert.equal(r.ok, true, `${id}: ${JSON.stringify(r.errors)}`);
    assert.ok(r.spec.scenes.length >= 8 && r.spec.scenes.length <= 14, `${id}: 8-14 scenes`);
    assert.ok(r.spec.scenes.every((s) => s.visual.type === "illustration"), `${id}: all scenes illustrated`);
  }
});

test("each illustrated-kit template resolves to its own distinct look", () => {
  const looks = ["illustrated", ...NEW].map((id) => {
    const t = getTemplate(id);
    return lookOf(resolveSpec({ version: 1, title: "x", template: id, scenes: [{ id: "a", narration: "x", visual: { type: "gradient" } }] }, t));
  });
  assert.deepEqual(looks, ["blueprint", ...NEW]);
  assert.equal(new Set(looks).size, looks.length);
  for (const l of looks) assert.ok(LOOKS.includes(l));
});

test("an unknown look value is rejected", () => {
  assert.equal(lookSchema.safeParse("neon").success, false);
  assert.equal(lookSchema.safeParse("whiteboard").success, true);
  assert.throws(() => validateTemplate({ id: "bad", defaults: { theme: { look: "neon" } } }), /unknown look/);
  assert.doesNotThrow(() => validateTemplate(getTemplate("whiteboard")));
});

test("lookOf falls back to blueprint for the original illustrated template and unknown values", () => {
  assert.equal(lookOf({ template: "illustrated", theme: {} }), "blueprint");
  assert.equal(lookOf({ template: "whiteboard", theme: { look: "nope" } }), "whiteboard");
  assert.equal(lookOf({ template: "countdown", theme: {} }), "blueprint");
});

test("planScene upscales sparse stages per look but stays inside the stage; blueprint never upscales", async () => {
  const { planScene, REGIONS, LOOK_UPSCALE } = await import("../lib/illustrated.mjs");
  const sparse = [{ type: "counter", value: 42, label: "x" }];
  const flat = planScene(sparse, 5);
  assert.equal(flat.scale, 1);
  assert.equal(flat.w, REGIONS.stage.w);
  for (const [look, up] of Object.entries(LOOK_UPSCALE)) {
    for (const els of [sparse, example(look === "blueprint" ? "whiteboard" : look).scenes[1].visual.elements]) {
      const p = planScene(els, 5, { maxUpscale: up });
      assert.ok(p.scale <= up + 1e-9, look);
      assert.ok(p.w * p.scale <= REGIONS.stage.w + 0.5, `${look}: too wide`);
      assert.ok(p.offsetY + p.stackH * p.scale <= REGIONS.stage.h + 0.5, `${look}: too tall`);
    }
  }
  assert.equal(LOOK_UPSCALE.blueprint, 1);
  assert.ok(planScene(sparse, 5, { maxUpscale: 1.3 }).scale > 1);
});
