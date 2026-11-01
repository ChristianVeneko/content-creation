import assert from "node:assert/strict";
import { test } from "node:test";
import { listProviders } from "../server/providers/index.ts";

const noClaude = () => null;

test("providers are unavailable without keys and never expose values", () => {
  const list = listProviders({ env: {}, which: noClaude });
  assert.deepEqual(list.map((p) => [p.id, p.available]), [
    ["claudeCode", false],
    ["anthropic", false],
    ["openai", false],
    ["gemini", false],
  ]);
  for (const p of list) assert.ok(p.reason, `${p.id} explains why it is unavailable`);
});

test("providers become available when their key is present", () => {
  const env = { ANTHROPIC_API_KEY: "sk-ant-secret", OPENAI_API_KEY: "sk-secret", GEMINI_API_KEY: "g-secret" };
  const list = listProviders({ env, which: noClaude });
  const byId = Object.fromEntries(list.map((p) => [p.id, p]));
  assert.equal(byId.anthropic.available, true);
  assert.equal(byId.openai.available, true);
  assert.equal(byId.gemini.available, true);
  const json = JSON.stringify(list);
  for (const secret of Object.values(env)) assert.ok(!json.includes(secret), "key value leaked");
});

test("blank keys count as missing; GOOGLE_API_KEY enables Gemini", () => {
  const list = listProviders({ env: { ANTHROPIC_API_KEY: "  ", GOOGLE_API_KEY: "x" }, which: noClaude });
  assert.equal(list.find((p) => p.id === "anthropic")!.available, false);
  assert.equal(list.find((p) => p.id === "gemini")!.available, true);
});

test("Claude Code is available when the claude binary is found", () => {
  const list = listProviders({ env: {}, which: (b) => (b === "claude" ? "/usr/local/bin/claude" : null) });
  assert.equal(list.find((p) => p.id === "claudeCode")!.available, true);
});

test("model ids default to current models and honor env overrides", () => {
  const defaults = Object.fromEntries(listProviders({ env: {}, which: noClaude }).map((p) => [p.id, p.model]));
  assert.equal(defaults.anthropic, "claude-opus-5-5");
  const env = { ANTHROPIC_MODEL: "claude-sonnet-5-5", OPENAI_MODEL: "gpt-x", GEMINI_MODEL: "gemini-y" };
  const over = Object.fromEntries(listProviders({ env, which: noClaude }).map((p) => [p.id, p.model]));
  assert.deepEqual([over.anthropic, over.openai, over.gemini], ["claude-sonnet-5-5", "gpt-x", "gemini-y"]);
});

test("an Anthropic key with the wrong format is reported unavailable with a clear reason", () => {
  const list = listProviders({ env: { ANTHROPIC_API_KEY: "sk_59811aeffffffffffffffffffffffffffffffffffffffff" }, which: noClaude });
  const a = list.find((p) => p.id === "anthropic")!;
  assert.equal(a.available, false);
  assert.match(a.reason!, /sk-ant-/);
});

test("a key duplicated from another service (e.g. ElevenLabs) is flagged", () => {
  const dup = "sk-ant-same-value-as-elevenlabs";
  const list = listProviders({ env: { ANTHROPIC_API_KEY: dup, ELEVENLABS_API_KEY: dup }, which: noClaude });
  const a = list.find((p) => p.id === "anthropic")!;
  assert.equal(a.available, false);
  assert.match(a.reason!, /ELEVENLABS_API_KEY/);
});

test("an OpenAI key that does not start with sk- is reported unavailable", () => {
  const list = listProviders({ env: { OPENAI_API_KEY: "AIzaWrongKey" }, which: noClaude });
  const o = list.find((p) => p.id === "openai")!;
  assert.equal(o.available, false);
  assert.match(o.reason!, /sk-/);
});
