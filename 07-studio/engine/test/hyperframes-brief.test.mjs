// `node cli.mjs hyperframes-brief <spec>`: the brief that drives the HyperFrames skill route for 2D videos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RETENTION_RULES, briefMarkdown, buildBrief, drawList } from "../lib/hyperframes-brief.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";

const cli = fileURLToPath(new URL("../cli.mjs", import.meta.url));
const demo = JSON.parse(readFileSync(fileURLToPath(new URL("../examples/demo.spec.json", import.meta.url)), "utf8"));

test("brief of a valid spec: format, scenes with timings, adapted palette, captions, rules and the route", () => {
  const r = buildBrief(demo);
  assert.equal(r.ok, true);
  const b = r.brief;
  assert.deepEqual([b.format.width, b.format.height, b.format.fps], [1080, 1920, 30]);
  assert.deepEqual([b.format.safeBox.width, b.format.safeBox.height], [900, 1300]);
  assert.equal(b.scenes.length, demo.scenes.length);
  assert.equal(b.scenes[0].startSec, 0);
  assert.ok(b.scenes.every((s, i) => i === 0 || s.startSec > b.scenes[i - 1].startSec));
  assert.ok(b.scenes.every((s) => s.durationSec > 0 && s.draw.length >= 1 && s.narration.length > 0));
  assert.match(b.timing, /^text-timed/);
  const resolved = resolveSpec(validateSpec(demo).spec, null);
  assert.equal(b.palette.text, resolved.theme.palette.text);
  assert.equal(b.captions.style, "hormozi");
  assert.match(b.captions.colors.highlight, /^#[0-9A-F]{6}$/);
  assert.deepEqual(b.retentionRules, RETENTION_RULES);
  assert.ok(b.route.some((x) => x.includes("npx hyperframes check --json")));
  assert.ok(b.route.some((x) => x.includes("npx --yes hyperframes init")));
  // the summed durations reach the planner's total
  const last = b.scenes.at(-1);
  assert.ok(Math.abs(last.startSec + last.durationSec - b.totalSec) < 0.05);
});

test("brief timings follow the planner with measured narration when audio seconds are given", () => {
  const secs = demo.scenes.map(() => 5);
  const b = buildBrief(demo, { audioSecs: secs }).brief;
  assert.match(b.timing, /measured narration/);
  assert.ok(b.scenes.every((s) => s.speechSec === 5));
  assert.ok(b.totalSec > buildBrief(demo).brief.totalSec);
  // a count mismatch is ignored (text-timed)
  assert.match(buildBrief(demo, { audioSecs: [5] }).brief.timing, /^text-timed/);
});

test("brief of an invalid spec returns the validation errors", () => {
  const r = buildBrief({ version: 1, title: "x", template: "countdown", scenes: [] });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /at least one scene/.test(e.message)));
});

test("draw list covers image, 3D and element visuals", () => {
  assert.match(drawList({ visual: { type: "image", src: "a.jpg" } })[0], /image: a\.jpg/);
  assert.match(drawList({ visual: { type: "scene3d", objects: [{ kind: "custom", label: "Pig" }] } })[0], /3D scene: custom "Pig"/);
  assert.match(drawList({ visual: { type: "emoji" }, onScreenText: "x2" }).join("|"), /on-screen text: x2/);
});

test("markdown brief has the scene sections; the CLI prints it and exits 1 with errors on a bad spec", () => {
  const md = briefMarkdown(buildBrief(demo).brief);
  assert.match(md, /^# HyperFrames brief: /);
  assert.match(md, /## Scenes/);
  assert.match(md, /### 1\. hook/);
  const ok = spawnSync(process.execPath, [cli, "hyperframes-brief", fileURLToPath(new URL("../examples/demo.spec.json", import.meta.url))], { encoding: "utf8" });
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /^# HyperFrames brief: /);
  const json = spawnSync(process.execPath, [cli, "hyperframes-brief", "-", "--json"], { input: JSON.stringify(demo), encoding: "utf8" });
  assert.equal(json.status, 0);
  assert.equal(JSON.parse(json.stdout).scenes.length, demo.scenes.length);
  const bad = spawnSync(process.execPath, [cli, "hyperframes-brief", "-"], { input: JSON.stringify({ version: 1 }), encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.equal(JSON.parse(bad.stdout).ok, false);
});
