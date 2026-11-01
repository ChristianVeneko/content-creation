import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { PassThrough } from "node:stream";
import { test } from "node:test";
import type { ChildProcess, SpawnOptions } from "node:child_process";
import { createClaudeCodeProvider, parseClaudeJsonOutput } from "../server/providers/claudeCode.ts";
import { ProviderError } from "../server/providers/types.ts";
import { parseSpecText } from "../server/specGen.ts";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

test("parses .result from `claude -p --output-format json`", () => {
  const text = parseClaudeJsonOutput(fixture("claude-success.json"));
  const spec = parseSpecText(text) as { title: string; scenes: unknown[] };
  assert.equal(spec.title, "3 trucos de café");
  assert.equal(spec.scenes.length, 1);
});

test("reports is_error results as provider errors", () => {
  assert.throws(() => parseClaudeJsonOutput(fixture("claude-error.json")), (err: Error) => {
    assert.ok(err instanceof ProviderError);
    assert.match(err.message, /Not logged in/);
    return true;
  });
});

test("rejects empty or non-JSON output", () => {
  assert.throws(() => parseClaudeJsonOutput(""), ProviderError);
  assert.throws(() => parseClaudeJsonOutput("not json at all"), ProviderError);
});

test("accepts a stream-style JSON array and picks the result event", () => {
  const out = JSON.stringify([{ type: "system" }, { type: "result", subtype: "success", is_error: false, result: "{}" }]);
  assert.equal(parseClaudeJsonOutput(out), "{}");
});

interface FakeRun {
  cmd: string;
  args: string[];
  opts: SpawnOptions;
}

function fakeSpawn(stdout: string, opts: { code?: number; hang?: boolean } = {}) {
  const calls: FakeRun[] = [];
  const spawnFn = (cmd: string, args: string[], o: SpawnOptions) => {
    calls.push({ cmd, args, opts: o });
    const child = new EventEmitter() as ChildProcess & EventEmitter;
    const out = new PassThrough();
    const err = new PassThrough();
    Object.assign(child, { stdout: out, stderr: err, kill: () => { child.emit("close", null); return true; } });
    if (!opts.hang) {
      setImmediate(() => {
        out.end(stdout);
        err.end();
        child.emit("close", opts.code ?? 0);
      });
    }
    return child as ChildProcess;
  };
  return { spawnFn, calls };
}

test("runs claude -p with json output, system prompt, and no API key in the env", async () => {
  const { spawnFn, calls } = fakeSpawn(fixture("claude-success.json"));
  const provider = createClaudeCodeProvider({
    spawnFn,
    cwd: "/tmp/x",
    env: { PATH: "/bin", ANTHROPIC_API_KEY: "sk-ant-secret", HOME: "/h" },
  });
  const text = await provider.generateSpec({ system: "SYS", user: "hazme un video" });
  assert.match(text, /3 trucos de café/);
  const [call] = calls;
  assert.equal(call.cmd, "claude");
  assert.deepEqual(call.args.slice(0, 4), ["-p", "hazme un video", "--output-format", "json"]);
  assert.equal(call.args[call.args.indexOf("--system-prompt") + 1], "SYS");
  assert.equal(call.args[call.args.indexOf("--tools") + 1], "", "no tools for a pure text task");
  for (const flag of ["--safe-mode", "--strict-mcp-config", "--no-session-persistence"]) {
    assert.ok(call.args.includes(flag), `missing ${flag}`);
  }
  const env = call.opts.env as NodeJS.ProcessEnv;
  assert.equal(env.ANTHROPIC_API_KEY, undefined, "subscription mode must not pass an API key");
  assert.equal(env.HOME, "/h");
});

test("times out a hung claude process", async () => {
  const { spawnFn } = fakeSpawn("", { hang: true });
  const provider = createClaudeCodeProvider({ spawnFn, cwd: "/tmp/x", timeoutMs: 30, env: {} });
  await assert.rejects(provider.generateSpec({ system: "s", user: "u" }), /timed out/);
});

test("non-zero exit with no stdout surfaces stderr context", async () => {
  const { spawnFn } = fakeSpawn("", { code: 1 });
  const provider = createClaudeCodeProvider({ spawnFn, cwd: "/tmp/x", env: {} });
  await assert.rejects(provider.generateSpec({ system: "s", user: "u" }), /exited with code 1/);
});
