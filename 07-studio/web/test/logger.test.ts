import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createLogger, redact } from "../server/logger.ts";

test("redact masks API keys found in strings and env values", () => {
  const env = { ANTHROPIC_API_KEY: "sk-ant-api03-abcdefghijklmnop", ELEVENLABS_API_KEY: "sk_0123456789abcdef0123" };
  const out = redact(`bad key sk-ant-api03-abcdefghijklmnop and sk_0123456789abcdef0123 and Bearer xyz.abc.def`, env);
  assert.ok(!out.includes("abcdefghijklmnop"));
  assert.ok(!out.includes("0123456789abcdef0123"));
  assert.ok(!out.includes("xyz.abc.def"));
  assert.match(out, /\[ANTHROPIC_API_KEY\]/);
});

test("redact masks key-shaped strings even when they are not in the environment", () => {
  const out = redact("leaked sk-ant-api03-zzzzzzzzzzzz and AIzaSyZZZZZZZZZZZZ", {});
  assert.equal(out, "leaked sk-ant-… and AIza…");
});

test("logger writes JSON lines to a file with level, msg and redacted fields", () => {
  const dir = mkdtempSync(path.join(process.env.TMPDIR ?? os.tmpdir(), "logger-test-"));
  const file = path.join(dir, "studio.log");
  const env = { OPENAI_API_KEY: "sk-proj-SECRETSECRETSECRET" };
  const log = createLogger({ file, level: "debug", console: false, env });
  log.info("spec.request", { provider: "openai", header: "sk-proj-SECRETSECRETSECRET" });
  log.debug("debug.event", { n: 1 });
  log.error("spec.failed", { status: 401 });
  const lines = readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(lines.map((l) => [l.level, l.msg]), [["info", "spec.request"], ["debug", "debug.event"], ["error", "spec.failed"]]);
  assert.equal(lines[2].status, 401);
  assert.ok(typeof lines[0].ts === "string");
  assert.ok(!JSON.stringify(lines).includes("SECRETSECRET"));
  rmSync(dir, { recursive: true, force: true });
});

test("logger respects the minimum level", () => {
  const dir = mkdtempSync(path.join(process.env.TMPDIR ?? os.tmpdir(), "logger-test-"));
  const file = path.join(dir, "studio.log");
  const log = createLogger({ file, level: "warn", console: false, env: {} });
  log.info("hidden");
  log.warn("shown");
  const lines = readFileSync(file, "utf8").trim().split("\n");
  assert.equal(lines.length, 1);
  assert.match(lines[0], /shown/);
  rmSync(dir, { recursive: true, force: true });
});
