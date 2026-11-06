// Richer 2D (T6): new 2D formats (ui-cards, flat-depth, soft-gradient), their elements and the opt-in depth pass.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate, listTemplates } from "../lib/templates.mjs";
import { TEMPLATE_IDS, resolveSpec, validateSpec } from "../lib/spec.mjs";
import { FORMAT_2D_LOOKS, ILLUSTRATED_TEMPLATE_IDS, LOOKS, LOOK_DEPTH, LOOK_UPSCALE, REGIONS, depthOf, lookOf, measure, planScene, usesIllustratedKit } from "../lib/illustrated.mjs";
import { ELEMENT_TYPES, elementSchema } from "../lib/illustration-schema.mjs";
import { autoMood } from "../lib/music.mjs";

const NEW = ["ui-cards", "flat-depth", "soft-gradient"];
const NEW_TYPES = ["post", "chart", "meter", "hourglass", "tags", "stat", "timer", "panels", "object", "character"];
const HAND_DRAWN = ["whiteboard", "chalkboard", "watercolor", "paper-collage", "risograph", "ukiyo-e", "pop-comic"];
const example = (id) => JSON.parse(readFileSync(fileURLToPath(new URL(`../examples/${id}.spec.json`, import.meta.url)), "utf8"));
const schemaJson = () => readFileSync(fileURLToPath(new URL("../spec.schema.json", import.meta.url)), "utf8");

test("the new 2D formats are registered as illustrated-kit looks and template ids, after the art looks", () => {
  assert.deepEqual(FORMAT_2D_LOOKS.slice(0, NEW.length), NEW, "later formats are appended after these three");
  for (const id of NEW) {
    assert.ok(LOOKS.includes(id), `look ${id}`);
    assert.ok(ILLUSTRATED_TEMPLATE_IDS.includes(id), `illustrated ${id}`);
    assert.ok(TEMPLATE_IDS.includes(id), `template id ${id}`);
    assert.ok(usesIllustratedKit(id));
    assert.ok(LOOK_UPSCALE[id] >= 1);
  }
  const ids = listTemplates().map((t) => t.id);
  assert.ok(ids.indexOf("pop-comic") < ids.indexOf("ui-cards"), "new formats come after the art looks");
  assert.ok(ids.indexOf("soft-gradient") < ids.indexOf("clay-diorama"), "and before the 3D looks");
});

test("each new format has a template in the illustrated-2d gallery and resolves to its own look", () => {
  for (const id of NEW) {
    const t = getTemplate(id);
    for (const k of ["id", "name", "description", "prompt_hint", "best_for", "preview", "defaults"]) assert.ok(t[k], `${id} missing ${k}`);
    assert.equal(t.category, "illustrated-2d");
    assert.equal(t.preview.style, "illustrated");
    assert.equal(t.defaults.theme.look, id);
    assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(JSON.stringify(t)), `${id} has emoji`);
    const spec = resolveSpec({ version: 1, title: "x", template: id, scenes: [{ id: "a", narration: "x", visual: { type: "gradient" } }] }, t);
    assert.equal(lookOf(spec), id);
  }
});

test("each new example spec validates, is all illustration and shows off its format's elements", () => {
  const uses = { "ui-cards": ["post", "chart", "meter", "hourglass", "tags", "stat", "timer", "panels"], "flat-depth": ["object", "character", "stat"], "soft-gradient": ["stat", "panels"] };
  for (const id of NEW) {
    const raw = example(id);
    assert.equal(raw.template, id);
    const r = validateSpec(raw);
    assert.equal(r.ok, true, `${id}: ${JSON.stringify(r.errors)}`);
    assert.ok(r.spec.scenes.length >= 8 && r.spec.scenes.length <= 14, `${id}: 8-14 scenes`);
    assert.ok(r.spec.scenes.every((s) => s.visual.type === "illustration"), `${id}: all scenes illustrated`);
    const types = new Set();
    const walk = (els) => els.forEach((e) => (types.add(e.type), e.left && walk(e.left), e.right && walk(e.right)));
    r.spec.scenes.forEach((s) => walk(s.visual.elements));
    for (const t of uses[id]) assert.ok(types.has(t), `${id} example uses ${t}`);
    // every scene fits the stage at the look's upscale
    for (const s of r.spec.scenes) {
      const p = planScene(s.visual.elements, 5, { maxUpscale: LOOK_UPSCALE[id] });
      assert.ok(p.offsetY + p.stackH * p.scale <= REGIONS.stage.h + 0.5, `${id}/${s.id}: too tall`);
      assert.ok(p.w * p.scale <= REGIONS.stage.w + 0.5, `${id}/${s.id}: too wide`);
    }
  }
});

const VALID = {
  post: { type: "post", name: "Estudio", handle: "@estudio", verified: true, lines: ["Cambiamos los planes", "Max 5x pasa a Max"], highlight: [1], magnify: true },
  chart: { type: "chart", title: "En la semana", unit: "h", items: [{ label: "Max", value: 5 }, { label: "Ultra", value: 6, expected: 20 }] },
  meter: { type: "meter", label: "Semana", value: 70, shape: "jar", caption: "El límite no cambia" },
  hourglass: { type: "hourglass", label: "Espera" },
  tags: { type: "tags", items: [{ label: "Max", price: "100 $", sub: "al mes" }, { label: "Ultra", price: "200 $" }] },
  stat: { type: "stat", value: "+50 %", label: "más ventas" },
  timer: { type: "timer", text: "4:59:59", label: "Vuelve en", countdown: true, clock: false },
  panels: { type: "panels", items: [{ title: "¿Te corta?", tag: "Ultra", icon: "clock" }, { title: "¿Nunca gastas?", tag: "Max" }], winner: 0 },
  object: { type: "object", kind: "laptop", count: 3, label: "Mesa de la tienda" },
  character: { type: "character", mood: "happy", label: "Cliente", shirt: "accent" },
};

test("every new element type is accepted with its fields", () => {
  for (const t of NEW_TYPES) {
    assert.ok(ELEMENT_TYPES.includes(t), `type ${t} registered`);
    const r = elementSchema.safeParse(VALID[t]);
    assert.equal(r.success, true, `${t}: ${JSON.stringify(r.error?.issues)}`);
  }
  // optional fields and defaults
  assert.equal(elementSchema.parse({ type: "meter", value: 0.4 }).shape, "jar");
  assert.equal(elementSchema.parse({ type: "character" }).mood, "neutral");
  assert.equal(elementSchema.parse({ type: "character" }).style, "round");
  assert.equal(elementSchema.parse({ type: "character", style: "blocky" }).style, "blocky");
  assert.equal(elementSchema.parse({ type: "object", kind: "coins" }).count, 1);
});

test("malformed new elements are rejected", () => {
  const bad = [
    { type: "post", name: "x", lines: [] },
    { type: "post", name: "x", lines: ["a"], highlight: [-1] },
    { type: "chart", items: [] },
    { type: "chart", items: [{ label: "a", value: -1 }] },
    { type: "meter", value: 150 },
    { type: "meter", value: 50, shape: "bottle" },
    { type: "tags", items: [1, 2, 3, 4].map((i) => ({ label: `a${i}`, price: "1" })) },
    { type: "tags", items: [{ label: "a" }] },
    { type: "stat" },
    { type: "stat", value: "a very long stat value" },
    { type: "timer", text: "" },
    { type: "timer", text: "12:00:00:00:00" },
    { type: "panels", items: [{ title: "solo" }] },
    { type: "panels", items: [{ title: "a" }, { title: "b" }], winner: 5 },
    { type: "object", kind: "spaceship" },
    { type: "object", kind: "laptop", count: 9 },
    { type: "character", mood: "furious-ish" },
    { type: "character", style: "pixel" },
    { type: "stat", value: "50 \u{1F680}" },
  ];
  for (const b of bad) {
    const ok = elementSchema.safeParse(b).success;
    const viaSpec = validateSpec({ version: 1, title: "x", template: "ui-cards", scenes: [{ id: "a", narration: "x", visual: { type: "illustration", elements: [b] } }] }).ok;
    assert.ok(!(ok && viaSpec), `should reject ${JSON.stringify(b)}`);
  }
});

test("every new element has a natural height and fits inside a split column", () => {
  for (const t of NEW_TYPES) {
    const h = measure(VALID[t], 900);
    assert.ok(h > 80 && h <= REGIONS.stage.h, `${t}: ${h}`);
    const p = planScene([{ type: "split", left: [VALID[t]], right: [VALID.stat] }], 5);
    assert.ok(p.offsetY + p.stackH * p.scale <= REGIONS.stage.h + 0.5, `${t} in split`);
  }
});

test("the depth pass is opt-in per look: hand-drawn looks keep their identity", () => {
  for (const l of ["blueprint", "broadcast", "editorial-chart", "rank-numbers", ...NEW]) {
    const d = depthOf(l);
    assert.ok(d, `${l} has depth`);
    for (const k of ["shadow", "fill", "ground", "parallax", "vignette"]) assert.ok(k in d, `${l}.${k}`);
  }
  for (const l of HAND_DRAWN) {
    assert.equal(depthOf(l), null, `${l} has no depth pass`);
    assert.ok(!(l in LOOK_DEPTH));
  }
  assert.equal(depthOf("editor-window"), null);
  assert.equal(depthOf("nope"), null);
});

test("looks without the depth pass resolve exactly as before", () => {
  // upscale table of the pre-existing looks is unchanged
  const before = { blueprint: 1, whiteboard: 1.2, broadcast: 1.15, "editorial-chart": 1.3, "editor-window": 1.3, "rank-numbers": 1.25, watercolor: 1.25, "paper-collage": 1.2, chalkboard: 1.2, risograph: 1.25, "ukiyo-e": 1.2, "pop-comic": 1.2 };
  for (const [k, v] of Object.entries(before)) assert.equal(LOOK_UPSCALE[k], v, k);
  for (const id of HAND_DRAWN) {
    const t = getTemplate(id);
    assert.equal(lookOf(resolveSpec({ version: 1, title: "x", template: id, scenes: [{ id: "a", narration: "x", visual: { type: "gradient" } }] }, t)), id);
  }
});

test("music: the new formats get a template mood", () => {
  assert.equal(autoMood({ template: "ui-cards", title: "x" }), "tech-lofi");
  assert.equal(autoMood({ template: "flat-depth", title: "x" }), "corporate-happy");
  assert.equal(autoMood({ template: "soft-gradient", title: "x" }), "minimal-ambient");
});

test("spec.schema.json lists the new templates, looks and element types", () => {
  const s = schemaJson();
  for (const id of NEW) assert.ok(s.includes(`"${id}"`), id);
  for (const t of NEW_TYPES) assert.ok(s.includes(`"const": "${t}"`) || s.includes(`"${t}"`), t);
});
