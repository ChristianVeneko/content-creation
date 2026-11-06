import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSpec, resolveSpec } from "../lib/spec.mjs";
import { getTemplate } from "../lib/templates.mjs";

const example = JSON.parse(readFileSync(new URL("../examples/demo.spec.json", import.meta.url), "utf8"));
const clone = () => structuredClone(example);

test("example spec is valid", () => {
  const r = validateSpec(example);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
});

test("rejects unknown template with a clear path and message", () => {
  const s = clone();
  s.template = "nope";
  const r = validateSpec(s);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.path === "template" && /captions-voice/.test(e.message)), JSON.stringify(r.errors));
});

test("rejects empty scenes", () => {
  const s = clone();
  s.scenes = [];
  const r = validateSpec(s);
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors[0], { path: "scenes", message: "at least one scene is required" });
});

test("rejects image visual without src", () => {
  const s = clone();
  s.scenes[0].visual = { type: "image" };
  const r = validateSpec(s);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.path === "scenes.0.visual.src" && /requires visual.src/.test(e.message)));
});

test("rejects bad hex colors, bad caption style and duplicate scene ids", () => {
  const s = clone();
  s.theme.palette.accent = "yellow";
  s.theme.captionStyle = "comic";
  s.scenes[1].id = s.scenes[0].id;
  const r = validateSpec(s);
  assert.equal(r.ok, false);
  const paths = r.errors.map((e) => e.path);
  assert.ok(paths.includes("theme.palette.accent"));
  assert.ok(paths.includes("theme.captionStyle"));
  assert.ok(r.errors.some((e) => e.path === "scenes.1.id" && /duplicate scene id/.test(e.message)));
});

test("rejects wrong version and non-object input", () => {
  assert.equal(validateSpec({ ...clone(), version: 2 }).ok, false);
  assert.equal(validateSpec(null).ok, false);
});

test("resolveSpec fills template defaults while spec values win", () => {
  const minimal = { version: 1, title: "T", template: "kinetic-type", scenes: [{ id: "a", narration: "hola", visual: { type: "gradient" } }] };
  const r = validateSpec(minimal);
  assert.equal(r.ok, true);
  const t = getTemplate("kinetic-type");
  const full = resolveSpec(r.spec, t);
  assert.deepEqual(full.theme.palette, t.defaults.theme.palette);
  assert.equal(full.scenes[0].animation, t.defaults.animation);
  assert.equal(full.format.fps, 30);
  const over = resolveSpec({ ...r.spec, theme: { captionStyle: "boxed" } }, t);
  assert.equal(over.theme.captionStyle, "boxed");
  assert.equal(over.theme.font, t.defaults.theme.font);
});

test("spec.schema.json is up to date with the zod schema", async () => {
  const { buildJsonSchema } = await import("../scripts/gen-schema.mjs");
  const onDisk = JSON.parse(readFileSync(new URL("../spec.schema.json", import.meta.url), "utf8"));
  assert.deepEqual(onDisk, JSON.parse(JSON.stringify(buildJsonSchema())), "run: npm run schema");
});

test("legacy topic-named template ids still validate and map to the format-named id", async () => {
  const { readFileSync } = await import("node:fs");
  const pairs = { "breaking-news": "broadcast", "data-story": "editorial-chart", "code-tutorial": "editor-window", "top-list": "rank-numbers", listicle: "countdown", "explainer-cards": "glass-cards", "quote-story": "letterbox", "hero-product": "pedestal", "iso-explainer": "iso-toon" };
  for (const [old, now] of Object.entries(pairs)) {
    const raw = JSON.parse(readFileSync(new URL(`../examples/${now}.spec.json`, import.meta.url), "utf8"));
    raw.template = old;
    if (raw.theme?.look3d) raw.theme.look3d = old;
    const lookIsId = raw.theme?.look === now;
    if (lookIsId) raw.theme.look = old;
    const r = validateSpec(raw);
    assert.equal(r.ok, true, `${old}: ${JSON.stringify(r.errors)}`);
    assert.equal(r.spec.template, now);
    if (raw.theme?.look3d) assert.equal(r.spec.theme.look3d, now);
    if (lookIsId) assert.equal(r.spec.theme.look, now);
  }
  // an illustrated-kit spec whose template is current but whose look still has the old name
  const raw = JSON.parse(readFileSync(new URL("../examples/editorial-chart.spec.json", import.meta.url), "utf8"));
  raw.theme = { ...(raw.theme ?? {}), look: "breaking-news" };
  const r = validateSpec(raw);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.spec.theme.look, "broadcast");
  assert.equal(validateSpec({ template: "no-such-template" }).ok, false);
});

test("previous behavior kept: resolveSpec of a classic template adds no hf or mode, and an optional mode passes through unchecked", async () => {
  const { resolveSpec, validateSpec } = await import("../lib/spec.mjs");
  const v = validateSpec({ version: 1, title: "T", template: "countdown", scenes: [{ id: "a", narration: "x", visual: { type: "gradient" } }] });
  assert.equal(v.ok, true);
  const r = resolveSpec(v.spec, getTemplate("countdown"));
  assert.equal("hf" in r, false);
  assert.equal("mode" in r, false);
  assert.equal(validateSpec({ version: 1, title: "T", template: "countdown", mode: "single", scenes: [{ id: "a", narration: "x", visual: { type: "gradient" } }] }).ok, true);
});
