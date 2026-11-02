import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSpec } from "../lib/spec.mjs";

const base = () => JSON.parse(readFileSync(new URL("../examples/process-tech-tutorial.spec.json", import.meta.url), "utf8"));
const problems = (spec) => {
  const r = validateSpec(spec);
  return r.ok ? [] : r.errors.map((e) => `${e.path}: ${e.message}`);
};

test("the untouched example still validates", () => assert.deepEqual(problems(base()), []));

test("flow chips written as plain strings become chip objects", () => {
  const spec = base();
  let changed = 0;
  for (const s of spec.scenes) for (const o of s.visual.overlay ?? []) if (o.type === "flow") { o.chips = o.chips.map((c) => c.label); o.active = undefined; o.steps = undefined; changed++; }
  assert.ok(changed > 0);
  assert.deepEqual(problems(spec), []);
});

test("duplicate or long chip labels still get unique ids and fit the label limit", () => {
  const spec = base();
  const flow = spec.scenes.flatMap((s) => s.visual.overlay ?? []).find((o) => o.type === "flow");
  flow.chips = ["Navegador web", "Navegador web", "Servidor de aplicaciones"];
  flow.active = undefined;
  flow.steps = undefined;
  assert.deepEqual(problems(spec), []);
});

test("particles without a kind default to dust instead of failing", () => {
  const spec = base();
  spec.scenes[0].visual.fx = [{ type: "particles" }];
  assert.deepEqual(problems(spec), []);
});

test("a stage world of 300 parts (builders expand into it) is accepted, 401 is not", () => {
  const spec = base();
  const part = (i) => ({ id: `extra${i}`, shape: "box", pos: [(i % 20) * 0.2 - 2, 0.05, Math.floor(i / 20) * 0.2 - 2], size: [0.1, 0.1, 0.1], role: "body" });
  const withParts = (n) => {
    const s = base();
    s.stage.world.parts = [...(s.stage.world.parts ?? []), ...Array.from({ length: n }, (_, i) => part(i))];
    return s;
  };
  const ok = problems(withParts(300 - (spec.stage.world.parts ?? []).length));
  assert.deepEqual(ok.filter((p) => p.includes("world parts")), []);
  assert.ok(problems(withParts(430)).some((p) => p.includes("at most 400 world parts")));
});
