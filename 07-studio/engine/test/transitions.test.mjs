import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// @remotion/transitions pushCut() defaults incomingEndScale to 1.07 and the
// TransitionSeries keeps that scale after the transition, which left every
// scene after the first zoomed in (titles slid under the HUD).
test("every pushCut() call pins incomingEndScale to 1", () => {
  const src = readFileSync(new URL("../src/Video.tsx", import.meta.url), "utf8");
  const calls = src.match(/pushCut\(\{[^}]*\}\)/g) ?? [];
  assert.ok(calls.length > 0, "expected pushCut calls in Video.tsx");
  for (const c of calls) assert.match(c, /incomingEndScale:\s*1\b/, c);
});
