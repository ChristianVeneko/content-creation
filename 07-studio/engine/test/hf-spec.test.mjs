// Spec fields `hf` and `mode`, lenient authoring and the CLI surface for HyperFrames formats.
process.env.CC_HF_INTERNAL = "1";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setupEnv } from "../lib/env.mjs";

setupEnv();
await import("../hf/registry.mjs");
const { validateSpec, resolveSpec, TEMPLATE_IDS } = await import("../lib/spec.mjs");
const { getTemplate, listTemplates } = await import("../lib/templates.mjs");
const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const env = { ...process.env, CC_HF_INTERNAL: "1" };
const base = (over = {}) => ({ version: 1, title: "T", template: "_stub", scenes: [{ id: "a", narration: "Hola mundo", visual: { type: "gradient" } }], ...over });

test("HF templates validate with hf and mode; the module's parsed payload (defaults filled) replaces spec.hf", () => {
  const r = validateSpec(base({ mode: "single", hf: { style: "gradient" } }));
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.deepEqual(r.spec.hf, { style: "gradient", textScale: 1 });
  assert.equal(r.spec.mode, "single");
  assert.deepEqual(validateSpec(base()).spec.hf, { style: "solid", textScale: 1 }); // missing hf: defaults
});

test("a bad payload fails with hf-prefixed paths from the module's schema", () => {
  const r = validateSpec(base({ hf: { style: "neon", textScale: 9, extra: 1 } }));
  assert.equal(r.ok, false);
  const paths = r.errors.map((e) => e.path);
  assert.ok(paths.includes("hf.style"), JSON.stringify(r.errors));
  assert.ok(paths.includes("hf.textScale"));
  assert.ok(r.errors.some((e) => e.path === "hf" && /extra/i.test(e.message)));
});

test("mode must be single or multi and one the format supports", () => {
  const r = validateSpec(base({ mode: "triple" }));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.path === "mode"));
});

test("`hf` on a non-HyperFrames template is an error; those templates behave as before", () => {
  const r = validateSpec({ version: 1, title: "T", template: "countdown", hf: { x: 1 }, scenes: [{ id: "a", narration: "x", visual: { type: "gradient" } }] });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.path === "hf" && /only for HyperFrames formats/.test(e.message)));
  assert.equal(validateSpec({ version: 1, title: "T", template: "countdown", scenes: [{ id: "a", narration: "x", visual: { type: "gradient" } }] }).ok, true);
});

test("a listed HyperFrames id whose module is missing fails with a clear message", () => {
  const r = validateSpec(base({ template: "flat-2d" }));
  if (r.ok) return; // flat-2d landed: nothing to assert here
  assert.ok(r.errors.some((e) => e.path === "template" || e.path.startsWith("hf")), JSON.stringify(r.errors));
});

test("lenient authoring: generic fixes (scene id, visual, mode alias) and the module's normalize (payload slips); nothing is dropped", () => {
  const r = validateSpec({ version: 1, title: "T", template: "_stub", mode: "Single-Scene", hf: { style: " Gradient ", textScale: "0.8" }, scenes: [{ narration: "uno" }, { id: "b", narration: "dos", onScreenText: "DOS" }] });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.spec.mode, "single");
  assert.deepEqual(r.spec.hf, { style: "gradient", textScale: 0.8 });
  assert.equal(r.spec.scenes[0].id, "s1");
  assert.equal(r.spec.scenes[0].visual.type, "gradient");
  assert.equal(r.spec.scenes[1].onScreenText, "DOS");
});

test("resolveSpec of an HF template takes the format defaults (captions on, sfx on, library music) and keeps hf and mode", () => {
  const v = validateSpec(base({ mode: "multi" }));
  const s = resolveSpec(v.spec, getTemplate("_stub"));
  assert.equal(s.captions.enabled, true);
  assert.equal(s.sfx.enabled, true);
  assert.equal(s.music.provider, "library");
  assert.equal(s.mode, "multi");
  assert.equal(s.hf.style, "solid");
});

test("templates --brief lists the HF format with the others; template <id> and prompt <id> work; the stub is hidden without the flag", () => {
  const brief = execFileSync(process.execPath, [cli, "templates", "--brief"], { encoding: "utf8", env });
  const line = brief.split("\n").find((l) => l.startsWith("_stub\t"));
  assert.ok(line, "stub listed with the flag");
  assert.equal(line.split("\t")[1], "hyperframes");
  assert.ok(brief.split("\n").some((l) => l.startsWith("illustrated\t")));
  const t = JSON.parse(execFileSync(process.execPath, [cli, "template", "_stub"], { encoding: "utf8", env }));
  assert.equal(t.ownsCaptions, true);
  const prompt = execFileSync(process.execPath, [cli, "prompt", "_stub"], { encoding: "utf8", env });
  assert.ok(prompt.includes("## Output contract"), "common rules");
  assert.ok(prompt.includes("Format `_stub` (internal reference)"), "module section");
  const hidden = execFileSync(process.execPath, [cli, "templates", "--brief"], { encoding: "utf8", env: { ...process.env, CC_HF_INTERNAL: "" } });
  assert.ok(!hidden.split("\n").some((l) => l.startsWith("_stub\t")));
  assert.ok(listTemplates().some((x) => x.id === "_stub"));
});

test("cli validate accepts an HF spec and reports payload errors with exit 1", () => {
  const dir = mkdtempSync(join(tmpdir(), "hf-cli-"));
  const f = join(dir, "s.json");
  writeFileSync(f, JSON.stringify(base({ hf: { style: "gradient" } })));
  assert.equal(JSON.parse(execFileSync(process.execPath, [cli, "validate", f], { encoding: "utf8", env })).ok, true);
  writeFileSync(f, JSON.stringify(base({ hf: { style: "nope" } })));
  const r = spawnSync(process.execPath, [cli, "validate", f], { encoding: "utf8", env });
  assert.equal(r.status, 1);
  assert.ok(JSON.parse(r.stdout).errors.some((e) => e.path === "hf.style"));
  rmSync(dir, { recursive: true, force: true });
});

test("spec.schema.json declares mode and hf and stays in sync with the schema (the stub id is not in it)", async () => {
  const { buildJsonSchema } = await import("../scripts/gen-schema.mjs");
  const onDisk = JSON.parse(readFileSync(new URL("../spec.schema.json", import.meta.url), "utf8"));
  assert.ok(onDisk.properties.mode && onDisk.properties.hf);
  assert.deepEqual(onDisk.properties.mode.enum, ["single", "multi"]);
  assert.ok(!JSON.stringify(onDisk.properties.template).includes("_stub"));
  // with the flag on (this file) the generated schema additionally lists the stub only
  const gen = buildJsonSchema();
  assert.deepEqual(gen.properties.template.enum.filter((x) => x !== "_stub"), onDisk.properties.template.enum);
  assert.ok(TEMPLATE_IDS.includes("_stub"));
});
