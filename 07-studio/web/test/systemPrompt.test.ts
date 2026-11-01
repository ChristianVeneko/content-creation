import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { readConfig } from "../server/config.ts";
import { systemPromptFor } from "../server/systemPrompt.ts";

const config = readConfig();
const full = readFileSync(config.specWriterPrompt, "utf8");

test("systemPromptFor sends only the chosen template's family sections", async () => {
  const reels = await systemPromptFor("reels-nube", config);
  assert.equal(reels.source, "engine");
  assert.ok(reels.text.length < full.length * 0.5, `expected a trimmed prompt, got ${reels.text.length} of ${full.length}`);
  assert.match(reels.text, /## Reels templates/);
  assert.doesNotMatch(reels.text, /## 3D templates/);
});

test("systemPromptFor: unknown template gets the full manual in creative mode, without creative sections otherwise", async () => {
  assert.equal((await systemPromptFor("no-such-template", config, { creative: true })).text, full);
  assert.doesNotMatch((await systemPromptFor("no-such-template", config)).text, /## Creative mode:/);
});

test("systemPromptFor falls back when the engine prompt is missing", async () => {
  const missing = await systemPromptFor("reels-nube", { ...config, specWriterPrompt: path.join(config.engineDir, "nope.md") });
  assert.equal(missing.source, "fallback");
});

test("systemPromptFor passes the creative flag through to the engine trimmer", async () => {
  const dir = (await import("node:fs")).mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "sp-"));
  const { writeFileSync } = await import("node:fs");
  writeFileSync(path.join(dir, "m.md"), "## A\na\n");
  writeFileSync(path.join(dir, "spec-writer-prompt.mjs"), "export const specWriterPromptFor = (id, full, o) => (o && o.creative ? 'C:' : 'A:') + full;");
  const cfg = { specWriterPrompt: path.join(dir, "m.md"), presetsDir: dir };
  assert.match((await systemPromptFor("x", cfg)).text, /^A:/);
  assert.match((await systemPromptFor("x", cfg, { creative: true })).text, /^C:/);
});
