import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { specWriterPromptFor } from "../lib/spec-writer-prompt.mjs";
import { TEMPLATE_IDS } from "../lib/spec.mjs";

const FULL = readFileSync(new URL("../prompts/spec-writer.md", import.meta.url), "utf8");
const has = (s, h) => s.includes(h);

test("every template keeps the shared sections (inputs, output contract, retention, post copy, checklist)", () => {
  for (const id of TEMPLATE_IDS) {
    const p = specWriterPromptFor(id, FULL);
    for (const h of ["## Inputs", "## Output contract", "## Retention rules", "## Post copy", "## Quality checklist"]) assert.ok(has(p, h), `${id} lacks ${h}`);
  }
});

test("a template gets its own family section and not the other families", () => {
  const cases = {
    "pixel-dusk": { yes: ["## Pixel templates"], no: ["## 3D templates", "## Reels templates", "## Template `illustrated`"] },
    "reels-noche": { yes: ["## Reels templates"], no: ["## 3D templates", "## Pixel templates", "## Template `illustrated`"] },
    "moody-night": { yes: ["## 3D templates", "### `neon-grid`, `soft-studio`, `moody-night`, `voxel-world`"], no: ["### `clay-diorama`", "## Pixel templates", "## Template `illustrated`"] },
    "clay-diorama": { yes: ["## 3D templates", "### `clay-diorama`"], no: ["### `holo-studio`", "## Reels templates"] },
    broadcast: { yes: ["## Template `illustrated`", "### `broadcast`"], no: ["### `whiteboard`", "## 3D templates", "## Pixel templates"] },
    watercolor: { yes: ["## Template `illustrated`", "### Art-style looks"], no: ["### `broadcast`", "## Reels templates"] },
    "ui-cards": { yes: ["## Template `illustrated`", "### Depth formats"], no: ["### Art-style looks", "## 3D templates"] },
    illustrated: { yes: ["## Template `illustrated`"], no: ["### `broadcast`", "## 3D templates", "## Pixel templates", "## Reels templates"] },
    "captions-voice": { yes: [], no: ["## Template `illustrated`", "## 3D templates", "## Pixel templates", "## Reels templates"] },
  };
  for (const [id, { yes, no }] of Object.entries(cases)) {
    const p = specWriterPromptFor(id, FULL);
    for (const h of yes) assert.ok(has(p, h), `${id} should keep ${h}`);
    for (const h of no) assert.ok(!has(p, h), `${id} should drop ${h}`);
  }
});

test("the per-template prompt is much smaller than the full manual, legacy ids resolve, unknown ids get the full manual", () => {
  for (const id of ["pixel-dusk", "moody-night", "broadcast", "reels-noche", "captions-voice"]) assert.ok(specWriterPromptFor(id, FULL).length < FULL.length * 0.75, id);
  assert.equal(specWriterPromptFor("breaking-news", FULL), specWriterPromptFor("broadcast", FULL));
  assert.equal(specWriterPromptFor("no-such-template", FULL, { creative: true }), FULL);
  assert.ok(!specWriterPromptFor("no-such-template", FULL).includes("## Creative mode:"));
  assert.equal(specWriterPromptFor(undefined, FULL, { creative: true }), FULL);
});

// Creative mode: "## Creative mode: <family>" sections are only for the subscription (Claude Code) path.
const SYN = ["# Manual", "## Inputs", "in", "## Pixel templates", "px", "## Creative mode: pixel", "draw your own sprites", "## 3D templates", "3d", "## Creative mode: 3D", "build your own models", "## Quality checklist", "ok"].join("\n");

test("creative sections are dropped by default and kept only for the template's family in creative mode", () => {
  const api = specWriterPromptFor("pixel-dusk", SYN);
  assert.ok(!api.includes("Creative mode"), "API prompt must not carry creative sections");
  const pixel = specWriterPromptFor("pixel-dusk", SYN, { creative: true });
  assert.ok(pixel.includes("## Creative mode: pixel") && !pixel.includes("## Creative mode: 3D"));
  const three = specWriterPromptFor("moody-night", SYN, { creative: true });
  assert.ok(three.includes("## Creative mode: 3D") && !three.includes("## Creative mode: pixel"));
  assert.ok(!specWriterPromptFor("reels-noche", SYN, { creative: true }).includes("Creative mode"));
});

test("unknown templates get the full manual without creative sections unless creative", () => {
  assert.ok(!specWriterPromptFor("no-such-template", SYN).includes("Creative mode"));
  assert.equal(specWriterPromptFor("no-such-template", SYN, { creative: true }), SYN);
});

test("the prompt tells the writer how to plan videos up to 180 s: more scenes, never longer ones", () => {
  for (const id of ["illustrated", "reels-nube"]) {
    const p = specWriterPromptFor(id, FULL);
    assert.match(p, /15 to 180/);
    assert.match(p, /MORE scenes, never longer ones/);
  }
});
