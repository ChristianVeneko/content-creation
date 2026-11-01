import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { postMarkdown } from "../lib/build.mjs";
import { setupEnv } from "../lib/env.mjs";

setupEnv(); // keeps os.tmpdir() inside the repo

const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));

test("build with --json-logs reports an invalid spec as a validate error line and exits 1", () => {
  const dir = mkdtempSync(join(tmpdir(), "engine-test-"));
  const spec = join(dir, "bad.json");
  writeFileSync(spec, JSON.stringify({ version: 1, title: "x", template: "countdown", scenes: [] }));
  const r = spawnSync(process.execPath, [cli, "build", spec, "--out", join(dir, "out"), "--json-logs"], { encoding: "utf8" });
  assert.equal(r.status, 1);
  const lines = r.stdout.trim().split("\n").map((l) => JSON.parse(l));
  for (const l of lines) assert.ok("step" in l && "status" in l && "message" in l);
  const last = lines.at(-1);
  assert.equal(last.step, "validate");
  assert.equal(last.status, "error");
  assert.match(last.message, /scenes: at least one scene is required/);
  rmSync(dir, { recursive: true, force: true });
});

test("build without --out prints usage and exits 2", () => {
  const r = spawnSync(process.execPath, [cli, "build", "x.json"], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage/);
});

test("post.md lists every platform and prefixes hashtags", () => {
  const md = postMarkdown({ title: "T", post: { tiktok: "tt", instagram: "ig", youtube: { title: "yt", description: "d" }, hashtags: ["a", "#b"] } });
  for (const s of ["# T", "## TikTok", "tt", "## Instagram Reels", "ig", "**Title:** yt", "#a #b"]) assert.ok(md.includes(s), s);
});
