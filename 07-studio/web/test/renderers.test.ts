// Render-engine choice in the studio: the chip data, the 3D-only rule, the spec writer and the API validation.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { RENDERERS, RENDERER_CHOICES, is3dTemplate, isRenderer, rendererForSpec } from "../shared/renderers.ts";

test("two renderers, in order, with one-line hints that state time and quality", () => {
  assert.deepEqual(RENDERERS, ["remotion", "blender"]);
  assert.deepEqual(RENDERER_CHOICES.map((c) => c.value), ["remotion", "blender"]);
  for (const c of RENDERER_CHOICES) {
    assert.ok(c.label.length > 0 && !c.hint.includes("\n"), c.value);
    assert.match(c.hint, /minutos|s por fotograma/);
  }
  assert.match(RENDERER_CHOICES[1].hint, /0,3 s por fotograma/);
});

test("isRenderer accepts only the two engines", () => {
  assert.equal(isRenderer("blender"), true);
  assert.equal(isRenderer("remotion"), true);
  assert.equal(isRenderer("cycles"), false);
  assert.equal(isRenderer(undefined), false);
});

test("only 3D formats get the renderer choice", () => {
  assert.equal(is3dTemplate({ style: "three" }), true);
  assert.equal(is3dTemplate({ category: "3d" }), true);
  assert.equal(is3dTemplate({ category: "illustrated-2d", style: "illustrated" }), false);
  assert.equal(is3dTemplate(undefined), false);
  assert.equal(rendererForSpec("blender", { style: "three" }), "blender");
  assert.equal(rendererForSpec("blender", { category: "illustrated-2d" }), undefined);
  assert.equal(rendererForSpec("remotion", { style: "three" }), undefined, "remotion is the default and stays omitted");
});

test("the wizard shows the Motor de render chips only behind the 3D check and sends the choice only for 3D", () => {
  const src = readFileSync(fileURLToPath(new URL("../src/views/Create.tsx", import.meta.url)), "utf8");
  const at = src.indexOf('label="Motor de render"');
  assert.ok(at > 0, "the chip group exists");
  assert.match(src.slice(Math.max(0, at - 200), at), /\{is3d && \(/);
  assert.match(src, /RENDERER_CHOICES\.map/);
  assert.match(src, /\.\.\.\(is3d && renderer \? \{ renderer \} : \{\}\)/);
});
