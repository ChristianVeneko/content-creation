// Token-lean CLI commands for agents: a one-line template index, one template's entry, the trimmed spec-writer prompt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
const full = run("templates");

test("templates --brief prints one short line per template", () => {
  const r = run("templates", "--brief");
  assert.equal(r.status, 0);
  const lines = r.stdout.trim().split("\n");
  assert.equal(lines.length, JSON.parse(full.stdout).length);
  assert.match(lines.find((l) => l.startsWith("reels-nube")), /^reels-nube\treels-2d\t/);
  assert.ok(r.stdout.length < full.stdout.length / 4);
});

test("template <id> prints that template's full entry; unknown id exits 1", () => {
  const r = run("template", "reels-nube");
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).id, "reels-nube");
  const bad = run("template", "nope");
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Unknown template: nope/);
});

test("prompt <id> prints the trimmed spec-writer prompt", () => {
  const manual = readFileSync(fileURLToPath(new URL("../prompts/spec-writer.md", import.meta.url)), "utf8");
  const r = run("prompt", "reels-nube");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /## Reels templates/);
  assert.ok(r.stdout.length < manual.length / 2);
  assert.equal(run("prompt").status, 2);
});

test("templates without --brief keeps the JSON array", () => {
  assert.ok(Array.isArray(JSON.parse(full.stdout)));
});
