// The Blender renderer: the pure scene-plan -> Blender job generator (custom parts, world ground, shots, motion tracks,
// degradations), the ASS layer, and an optional real Eevee render when a Blender binary is available.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { getTemplate } from "../lib/templates.mjs";
import { computeTimeline, paginateCaptions, syntheticCaptions } from "../lib/timeline.mjs";
import { LOOK3D, planThree } from "../lib/scene3d.mjs";
import { setupEnv } from "../lib/env.mjs";
import { blenderJob, partFinish } from "../lib/blender-job.mjs";
import { BLENDER_LOOKS, blenderLook } from "../lib/blender-looks.mjs";
import { proxyParts } from "../lib/blender-parts.mjs";
import { assColor, buildAss } from "../lib/blender-captions.mjs";
import { BlenderError, SCENE_PY, filterPath, findBlender, runBlender } from "../lib/blender.mjs";

setupEnv();
const PARTS = [
  { id: "body", shape: "sphere", size: [0.8, 0.6, 0.6], pos: [0, 0.7, 0], color: "accent" },
  { id: "eye", shape: "sphere", size: [0.08], pos: [0.3, 0.9, 0.5], role: "dark", motion: ["bob"] },
  { id: "arm", shape: "capsule", size: [0.1, 0.4], pos: [0.7, 0.6, 0], role: "accent", pivot: [0, 0.3, 0] },
];
const WORLD = { concept: "a lit stage at dusk", ground: { kind: "disc", color: "accent2", size: 12 }, backdrop: "accent", parts: [{ id: "sign", shape: "sign", size: [1.6, 0.5], text: "HOLA", pos: [0, 1, -3], color: "#223344" }] };
const NARRATION = "Hola mundo, esto es una prueba larga para el render.";
const specOf = (visual = {}, more = {}) => ({ version: 1, title: "x", template: "clay-mascot", voice: { provider: "none" }, scenes: [{ id: "a", narration: NARRATION, title: { kicker: "Uno", main: "Hola" }, visual: { type: "scene3d", objects: [{ kind: "custom", id: "m", label: "Mascota", parts: PARTS }], world: WORLD, ...visual } }], ...more });
function jobOf(raw, opts = {}) {
  const v = validateSpec(raw);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  const spec = resolveSpec(v.spec, getTemplate(raw.template));
  const timeline = computeTimeline(spec.scenes.map((s) => ({ durationSec: s.durationSec, narration: s.narration })), { fps: spec.format.fps });
  const plans = planThree(spec, timeline);
  return { spec, timeline, job: blenderJob({ spec, timeline, plans, ...opts }) };
}
const camDist = (c) => Math.hypot(c[0] - c[3], c[1] - c[4], c[2] - c[5]);

test("job: a custom part carries its resolved color, finish and a static one-sample track", () => {
  const { spec, job } = jobOf(specOf());
  const o = job.scenes[0].objects[0];
  assert.equal(o.kind, "custom");
  assert.equal(o.parts.length, 3);
  const body = o.parts[0];
  assert.equal(body.shape, "sphere");
  assert.deepEqual(body.size, [0.8, 0.6, 0.6]);
  assert.equal(body.color.toLowerCase(), spec.theme.palette.accent.toLowerCase());
  assert.equal(body.mat, "clay"); // clay-mascot look material
  assert.equal(body.track.length, 1);
  assert.equal(body.track[0].length, 10);
  assert.deepEqual(body.track[0].slice(0, 3), [0, 0.7, 0]);
  // pivot parts keep their pivot for the rotation point
  assert.deepEqual(o.parts[2].pivot, [0, 0.3, 0]);
  // a part with motion has one sample per frame
  assert.equal(o.parts[1].track.length, job.scenes[0].frames);
  // the object itself always has its entrance: one transform per frame, [pos, rot, scale, opacity, visible]
  assert.equal(o.object.length, job.scenes[0].frames);
  assert.equal(o.object[0].length, 11);
  assert.equal(o.object.at(-1)[10], 1);
});

test("job: world ground, backdrop and parts come from the plan", () => {
  const { spec, job } = jobOf(specOf());
  const s = job.scenes[0];
  assert.equal(s.ground.kind, "disc");
  assert.equal(s.ground.size, 12);
  assert.match(s.ground.color, /^#[0-9a-f]{6}$/i);
  assert.equal(s.bg.stops.length, 3); // a flat world.backdrop becomes light -> color -> dark stops
  assert.notDeepEqual(s.bg.stops, BLENDER_LOOKS["clay-mascot"].bg(spec.theme.palette));
  assert.equal(s.world.parts.length, 1);
  assert.equal(s.world.parts[0].shape, "sign");
  assert.equal(s.world.parts[0].text, "HOLA");
  assert.equal(s.world.parts[0].textColor, undefined);
  assert.equal(job.render.width, 1080);
  assert.equal(job.render.height, 1920);
  assert.equal(job.render.fps, 30);
});

test("job: shots shape the per-frame camera track (wide to close pulls in)", () => {
  const plain = jobOf(specOf({ camera: "static" })).job.scenes[0];
  const shot = jobOf(specOf({ camera: "static", shots: [{ shot: "wide" }, { shot: "close" }] })).job.scenes[0];
  assert.equal(shot.camera.length, shot.frames);
  assert.ok(shot.camera.every((c) => c.length === 7));
  assert.ok(camDist(shot.camera[0]) > camDist(shot.camera.at(-1)) * 1.4, "wide first, close last");
  assert.notDeepEqual(plain.camera, shot.camera);
});

test("job: scenes tile the timeline without overlap (hard cuts, transition frames belong to the next scene)", () => {
  const raw = specOf();
  raw.scenes.push({ ...raw.scenes[0], id: "b" });
  const { job, timeline } = jobOf(raw);
  assert.equal(job.scenes[0].startFrame, 0);
  assert.equal(job.scenes[1].startFrame, job.scenes[0].frames);
  assert.equal(job.scenes.reduce((a, s) => a + s.frames, 0), timeline.totalFrames);
  assert.equal(job.totalFrames, timeline.totalFrames);
});

test("degradation: built-in kinds become proxy parts with one warning, unsupported fx are skipped with a warning", () => {
  const raw = specOf({ stock: true, objects: [{ kind: "phone", id: "p", icon: "star" }, { kind: "database", id: "d" }], fx: [{ type: "sweep" }, { type: "shockwave", target: "p", at: 1 }] });
  const { job } = jobOf(raw);
  const objs = job.scenes[0].objects;
  assert.ok(objs[0].parts.length >= 2 && objs[1].parts.length >= 2);
  assert.ok(job.warnings.some((w) => /built-in kind "phone" is approximated/.test(w)));
  assert.ok(job.warnings.some((w) => /built-in kind "database" is approximated/.test(w)));
  assert.ok(job.warnings.some((w) => /fx "sweep" is not supported/.test(w)));
  assert.equal(job.scenes[0].fx.length, 1);
  assert.equal(job.scenes[0].fx[0].type, "shockwave");
  assert.equal(job.warnings.filter((w) => /"phone"/.test(w)).length, 1);
  assert.deepEqual(proxyParts("nope").map((p) => p.id), ["cube"]);
});

test("looks: every look with a camera language has a Blender entry, and an unknown look falls back with a warning", () => {
  for (const id of Object.keys(LOOK3D)) assert.ok(BLENDER_LOOKS[id], `BLENDER_LOOKS needs an entry for the 3D look "${id}" (lib/blender-looks.mjs)`);
  const f = blenderLook("brand-new-look");
  assert.equal(f.fallback, true);
  assert.equal(f.id, "clay-diorama");
  assert.equal(partFinish({ role: "glow" }, blenderLook("moody-night")).mat, "emissive");
  assert.equal(partFinish({ role: "metal" }, blenderLook("moody-night")).mat, "metal");
  assert.equal(partFinish({ material: "glass" }, blenderLook("moody-night")).mat, "glass");
});

test("ASS layer: word captions with the highlight in BGR, headline, label events, and the caption band", () => {
  const { spec, timeline, job } = jobOf(specOf());
  const caps = syntheticCaptions(spec.scenes, timeline);
  const pages = paginateCaptions(caps, spec.captions.wordsPerPage);
  const ass = buildAss({ spec, timeline, captionPages: pages, job });
  assert.match(ass, /PlayResX: 1080\nPlayResY: 1920/);
  assert.equal((ass.match(/Dialogue: 0,[^\n]*,Cap,/g) ?? []).length, caps.length);
  assert.ok(ass.includes(assColor(spec.theme.palette.accent)) || ass.includes("\\c&H"));
  assert.match(ass, /,Head,,0,0,0,,\{\\an8\\pos\(540,\d+\)\\fad\(160,0\)\}Hola/);
  assert.match(ass, /,Kick,,0,0,0,,\{\\an8[^}]*\}UNO/);
  assert.match(ass, /,Label,,0,0,0,,\{\\an5\\pos\(\d+,\d+\)[^}]*\}MASCOTA/);
  assert.equal(assColor("#FFD60A"), "&H000AD6FF");
  const off = buildAss({ spec: { ...spec, captions: { ...spec.captions, enabled: false } }, timeline, captionPages: pages, job });
  assert.equal((off.match(/,Cap,/g) ?? []).length, 0);
});

test("helpers: filter paths are escaped, a missing Blender is a BlenderError, scene.py is valid Python", async () => {
  assert.equal(filterPath("/a b/c:d'e"), "/a b/c\\:d\\'e");
  assert.equal(findBlender("/nonexistent/blender"), null);
  await assert.rejects(runBlender({ jobFile: "x", framesDir: join(tmpdir(), "nope-frames"), totalFrames: 1, blender: "/nonexistent/blender" }), BlenderError);
  const r = spawnSync("python3", ["-I", "-c", `import ast,sys; ast.parse(open(sys.argv[1]).read())`, SCENE_PY], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});

test("real render: two Eevee frames when a Blender binary is available", { skip: findBlender() ? false : "no Blender binary (set BLENDER_BIN)" }, async () => {
  const { job } = jobOf(specOf());
  job.render.scale = 10;
  job.scenes[0].only = [0, 40];
  const dir = mkdtempSync(join(tmpdir(), "blender-test-"));
  try {
    const jobFile = join(dir, "job.json");
    writeFileSync(jobFile, JSON.stringify(job));
    const r = await runBlender({ jobFile, framesDir: join(dir, "frames"), totalFrames: 2 });
    assert.ok(r.seconds > 0);
    for (const n of ["00000", "00040"]) {
      const f = join(dir, "frames", `${n}.png`);
      assert.ok(existsSync(f) && statSync(f).size > 200, n);
      assert.equal(readFileSync(f).subarray(1, 4).toString(), "PNG");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
