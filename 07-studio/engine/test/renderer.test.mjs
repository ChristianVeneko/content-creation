// theme.renderer: the render-engine choice (remotion default, blender for 3D templates only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { getTemplate } from "../lib/templates.mjs";
import { setupEnv } from "../lib/env.mjs";
import { RENDERERS, allowedRenderers, chooseRenderer, rendererIssue, rendererOf } from "../lib/blender-options.mjs";

setupEnv();
const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const scene = { id: "a", narration: "Hola mundo, esto es una prueba larga.", title: { main: "Hola" }, visual: { type: "scene3d", objects: [{ kind: "custom", id: "b", parts: [{ id: "body", shape: "box", size: [1, 2, 1], pos: [0, 1, 0] }] }] } };
const spec3d = (renderer) => ({ version: 1, title: "x", template: "clay-mascot", scenes: [scene], ...(renderer ? { theme: { renderer } } : {}) });
const spec2d = (renderer) => ({ version: 1, title: "x", template: "countdown", scenes: [{ id: "a", narration: "Uno dos tres.", onScreenText: "3", visual: { type: "emoji", emoji: "x" } }], ...(renderer ? { theme: { renderer } } : {}) });

test("renderers are remotion and blender; 2D templates only allow remotion", () => {
  assert.deepEqual(RENDERERS, ["remotion", "blender"]);
  assert.deepEqual(allowedRenderers("clay-mascot"), ["remotion", "blender"]);
  assert.deepEqual(allowedRenderers("countdown"), ["remotion"]);
});

test("theme.renderer blender is valid on a 3D template and remotion on any template", () => {
  assert.equal(validateSpec(spec3d("blender")).ok, true);
  assert.equal(validateSpec(spec3d("remotion")).ok, true);
  assert.equal(validateSpec(spec2d("remotion")).ok, true);
});

test("theme.renderer blender on a 2D template is a validation error that names the allowed renderers", () => {
  const r = validateSpec(spec2d("blender"));
  assert.equal(r.ok, false);
  const e = r.errors.find((x) => x.path === "theme.renderer");
  assert.ok(e, JSON.stringify(r.errors));
  assert.match(e.message, /only for 3D templates/);
  assert.match(e.message, /supports: remotion/);
});

test("an unknown renderer lists the allowed renderers", () => {
  const r = validateSpec(spec3d("cycles"));
  assert.equal(r.ok, false);
  assert.match(r.errors.find((x) => x.path === "theme.renderer").message, /allowed renderers: remotion, blender/);
});

test("default unchanged: an omitted renderer stays omitted after resolveSpec and means remotion", () => {
  for (const s of [spec3d(), spec2d()]) {
    const v = validateSpec(s);
    assert.equal(v.ok, true);
    assert.equal("renderer" in (v.spec.theme ?? {}), false);
    const resolved = resolveSpec(v.spec, getTemplate(s.template));
    assert.equal("renderer" in resolved.theme, false);
    assert.equal(rendererOf(resolved), "remotion");
  }
});

test("--renderer override wins over theme.renderer and is validated against the template", () => {
  const blender = validateSpec(spec3d("blender")).spec;
  assert.deepEqual(chooseRenderer(blender, undefined), { renderer: "blender", error: null });
  assert.deepEqual(chooseRenderer(blender, "remotion"), { renderer: "remotion", error: null });
  const plain = validateSpec(spec3d()).spec;
  assert.deepEqual(chooseRenderer(plain, "blender"), { renderer: "blender", error: null });
  const flat = validateSpec(spec2d()).spec;
  assert.match(chooseRenderer(flat, "blender").error, /only for 3D templates/);
  assert.match(rendererIssue("clay-mascot", "cycles"), /allowed renderers/);
  assert.equal(rendererIssue("clay-mascot", undefined), null);
});

test("build --renderer blender on a 2D spec fails at validate with the renderer message (exit 1)", () => {
  const dir = mkdtempSync(join(tmpdir(), "engine-test-"));
  const file = join(dir, "flat.json");
  writeFileSync(file, JSON.stringify(spec2d()));
  const r = spawnSync(process.execPath, [cli, "build", file, "--out", join(dir, "out"), "--renderer", "blender", "--json-logs"], { encoding: "utf8" });
  assert.equal(r.status, 1);
  const last = r.stdout.trim().split("\n").map((l) => JSON.parse(l)).at(-1);
  assert.equal(last.step, "validate");
  assert.equal(last.status, "error");
  assert.match(last.message, /only for 3D templates/);
  rmSync(dir, { recursive: true, force: true });
});

test("build --renderer with an unknown value exits 2 and prints the allowed renderers", () => {
  const r = spawnSync(process.execPath, [cli, "build", "x.json", "--out", "/tmp/never", "--renderer", "cycles"], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /allowed renderers: remotion, blender/);
});
