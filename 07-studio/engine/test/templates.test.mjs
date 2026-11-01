import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { listTemplates } from "../lib/templates.mjs";
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
