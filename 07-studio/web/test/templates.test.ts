import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeTemplates } from "../server/engine.ts";

test("normalizeTemplates passes the preview style through (illustrated cards draw vectors, not emoji)", () => {
  const [t] = normalizeTemplates([
    { id: "illustrated", name: "Illustrated Explainer", preview: { style: "illustrated", gradient: ["#0b1020", "#111a33"], sample_text: "SDD vs ODD" } },
  ]);
  assert.equal(t.style, "illustrated");
  assert.equal(t.sampleText, "SDD vs ODD");
});

test("templates without a preview style keep style undefined (old emoji cards unchanged)", () => {
  const [t] = normalizeTemplates([{ id: "countdown", preview: { emoji: "🔢", gradient: ["#000", "#111"] } }]);
  assert.equal(t.style, undefined);
  assert.equal(t.emoji, "🔢");
});
