import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listTemplates, validateTemplate } from "../lib/templates.mjs";
import { validateSpec } from "../lib/spec.mjs";

const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));

test("cli templates prints every template as JSON: the illustrated-kit looks first, then the 3D looks, the 5 classic templates last", () => {
  const out = execFileSync(process.execPath, [cli, "templates"], { encoding: "utf8" });
  const ids = JSON.parse(out).map((t) => t.id);
  assert.deepEqual(ids, listTemplates().map((t) => t.id));
  assert.deepEqual(ids.slice(0, 6), ["illustrated", "whiteboard", "broadcast", "editorial-chart", "editor-window", "rank-numbers"]);
  const at = ids.indexOf("clay-diorama");
  assert.deepEqual(ids.slice(at, at + 4), ["clay-diorama", "iso-toon", "neon-glass", "pedestal"]);
  assert.deepEqual(ids.slice(-5), ["captions-voice", "kinetic-type", "countdown", "glass-cards", "letterbox"]);
});

test("every template has gallery metadata and valid defaults", () => {
  for (const t of listTemplates()) {
    for (const k of ["id", "name", "description", "prompt_hint", "best_for", "preview", "defaults"]) assert.ok(t[k], `${t.id} missing ${k}`);
    assert.ok((t.preview.emoji || t.preview.style) && t.preview.gradient.length >= 2, `${t.id} preview`);
    const visual = t.category === "reels-2d" ? { type: "reel", reel: { type: "headline", texto: "x" } } : { type: "gradient" };
    const probe = { version: 1, title: "x", template: t.id, ...t.defaults, scenes: [{ id: "s", narration: "x", visual }] };
    delete probe.animation;
    const r = validateSpec(probe);
    assert.equal(r.ok, true, `${t.id}: ${JSON.stringify(r.errors)}`);
  }
});

test("cli validate exits 0 for the example and 1 with errors for a bad spec", () => {
  const ex = fileURLToPath(new URL("../examples/demo.spec.json", import.meta.url));
  const ok = JSON.parse(execFileSync(process.execPath, [cli, "validate", ex], { encoding: "utf8" }));
  assert.equal(ok.ok, true);
  let code = 0, out = "";
  try {
    execFileSync(process.execPath, [cli, "validate", "-"], { input: '{"version":1}', encoding: "utf8" });
  } catch (e) {
    code = e.status;
    out = e.stdout;
  }
  assert.equal(code, 1);
  const bad = JSON.parse(out);
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => e.path === "title"));
});

test("template format: optional kebab slug, validated; templates without one default to their id", () => {
  assert.doesNotThrow(() => validateTemplate({ id: "x", format: "host-tutorial" }));
  assert.doesNotThrow(() => validateTemplate({ id: "x" }));
  for (const bad of ["Host", "a_b", "a--b", "-a", "", 3]) {
    assert.throws(() => validateTemplate({ id: "x", format: bad }), /format/, String(bad));
  }
  const dir = mkdtempSync(join(tmpdir(), "tpl-"));
  writeFileSync(join(dir, "illustrated.json"), JSON.stringify({ id: "illustrated" }));
  writeFileSync(join(dir, "whiteboard.json"), JSON.stringify({ id: "whiteboard", format: "sketch-board" }));
  const byId = Object.fromEntries(listTemplates(dir).map((t) => [t.id, t.format]));
  assert.deepEqual(byId, { illustrated: "illustrated", whiteboard: "sketch-board" });
  for (const t of listTemplates()) assert.match(t.format, /^[a-z0-9]+(-[a-z0-9]+)*$/, t.id);
});

test("durations: a 180 s video is valid (many scenes of 3-6 s), a single scene stays capped at 60 s", () => {
  const scene = (i, d) => ({ id: `s${i}`, narration: "x", durationSec: d, visual: { type: "gradient" } });
  const ok = validateSpec({ version: 1, title: "x", template: "illustrated", scenes: Array.from({ length: 36 }, (_, i) => scene(i, 5)) });
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));
  const bad = validateSpec({ version: 1, title: "x", template: "illustrated", scenes: [scene(0, 61)] });
  assert.equal(bad.ok, false);
});
