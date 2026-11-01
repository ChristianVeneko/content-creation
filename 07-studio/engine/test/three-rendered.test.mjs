// Low-poly 3D sets (format catalog T5): cheap render profiles per look, environment sets, the CC0 asset catalog, the
// new 3D formats (neon-grid, soft-studio, moody-night, voxel-world) and the slow camera moves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate, listTemplates } from "../lib/templates.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { computeTimeline } from "../lib/timeline.mjs";
import {
  CAMERA_MOVES,
  CAR_MODELS,
  CHARACTER_MODELS,
  LOOK3D,
  MODEL_IDS,
  OBJECT_KINDS,
  RENDER3D,
  SET_MODELS,
  SETS_3D,
  THREE_D_TEMPLATE_IDS,
  cameraAt,
  collectModelIds,
  planThree,
  projectPoint,
  setOf,
  usesThreeKit,
} from "../lib/scene3d.mjs";
import { LOOK_HDRI } from "../lib/three-assets.mjs";
import { autoMood } from "../lib/music.mjs";

const NEW = ["neon-grid", "soft-studio", "moody-night", "voxel-world"];
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const ASSETS = fileURLToPath(new URL("../../../03-assets/3d/", import.meta.url));
const lic = JSON.parse(read("../../../03-assets/3d/licenses.json"));
const example = (id) => JSON.parse(read(`../examples/${id}.spec.json`));
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const mini = (template, visual) => ({ version: 1, title: "x", template, scenes: [{ id: "a", narration: "Hola mundo.", title: { main: "Hola" }, visual: { type: "scene3d", ...visual } }] });

test("the four new 3D formats are registered 3D-kit templates with category 3d, a camera and gallery metadata", () => {
  const ids = listTemplates().map((t) => t.id);
  for (const id of NEW) {
    assert.ok(THREE_D_TEMPLATE_IDS.includes(id), id);
    assert.ok(usesThreeKit(id), id);
    assert.ok(ids.includes(id), `${id} listed`);
    assert.ok(LOOK3D[id], `${id} camera`);
    const t = getTemplate(id);
    assert.equal(t.category, "3d");
    assert.equal(t.preview.style, "three");
    for (const k of ["name", "description", "prompt_hint", "best_for"]) assert.ok(t[k], `${id} missing ${k}`);
    assert.ok(!EMOJI.test(JSON.stringify(t)), `${id} has emoji`);
  }
});

test("each new format has an example spec that validates, uses scene3d visuals only and resolves to its own look", () => {
  for (const id of NEW) {
    const raw = example(id);
    assert.equal(raw.template, id);
    const r = validateSpec(raw);
    assert.equal(r.ok, true, `${id}: ${JSON.stringify(r.errors)}`);
    assert.ok(r.spec.scenes.length >= 5 && r.spec.scenes.length <= 14, `${id}: 5-14 scenes`);
    assert.ok(r.spec.scenes.every((s) => s.visual.type === "scene3d"), `${id}: all scenes scene3d`);
    assert.ok(!EMOJI.test(JSON.stringify(raw)), `${id}: emoji`);
  }
});

test("every 3D look has a cheap render profile: tone mapping, one soft key shadow, fog, a default set; bloom only where it was", () => {
  const BLOOM_BEFORE = ["neon-glass", "holo-studio"];
  for (const id of THREE_D_TEMPLATE_IDS) {
    const r = RENDER3D[id];
    assert.ok(r, `${id} has no render profile`);
    assert.deepEqual(Object.keys(r).sort(), ["bloom", "envIntensity", "exposure", "fog", "hdri", "set", "shadowRadius", "tone"], `${id}: no extra (expensive) passes`);
    assert.ok(["agx", "aces", "neutral", "none"].includes(r.tone), `${id} tone ${r.tone}`);
    assert.ok(r.exposure > 0.3 && r.exposure < 2.5, `${id} exposure`);
    assert.ok(SETS_3D.includes(r.set) && r.set !== "auto", `${id} set ${r.set}`);
    assert.ok(r.shadowRadius >= 0, `${id} shadowRadius`);
    assert.equal(r.bloom !== null, BLOOM_BEFORE.includes(id), `${id}: bloom only on the looks that already had it`);
    assert.ok(r.fog === null || (r.fog.near > 0 && r.fog.far > r.fog.near && r.fog.add >= 0), `${id} fog`);
    assert.ok(r.hdri === null || lic.hdri.some((h) => h.id === r.hdri), `${id} hdri ${r.hdri} not in licenses.json`);
    assert.equal(LOOK_HDRI[id] ?? null, r.hdri, `${id}: LOOK_HDRI follows the render profile`);
  }
  // the new formats: no HDRI, fog for depth, a set the camera is inside
  for (const id of NEW) {
    const r = RENDER3D[id];
    assert.equal(r.hdri, null, `${id}: no HDRI`);
    assert.ok(r.fog, `${id} needs fog`);
    assert.notEqual(r.set, "none", `${id} needs a set`);
  }
});

test("every asset in 03-assets/3d/licenses.json exists on disk, is CC0 and credits its source and author", () => {
  let bytes = 0;
  for (const a of [...lic.models, ...lic.hdri]) {
    const f = `${ASSETS}${a.file}`;
    assert.ok(existsSync(f), `${a.id}: ${a.file} missing`);
    bytes += statSync(f).size;
    assert.equal(a.license, "CC0-1.0", a.id);
    assert.match(a.source, /^https:\/\//, a.id);
    assert.ok(a.credit && a.author, `${a.id} needs credit and author`);
  }
  assert.deepEqual(lic.models.map((m) => m.id).sort(), [...MODEL_IDS].sort());
  assert.ok(bytes < 15 * 1024 * 1024, `3D assets total ${Math.round(bytes / 1048576)} MB (keep under 15 MB)`);
});

test("sets: every set prop, car and character model is in the catalog; an unknown set is rejected", () => {
  for (const [set, ids] of Object.entries(SET_MODELS)) {
    assert.ok(SETS_3D.includes(set), set);
    for (const m of ids) assert.ok(MODEL_IDS.includes(m), `${set} uses unknown model ${m}`);
  }
  for (const m of [...CAR_MODELS, ...CHARACTER_MODELS]) assert.ok(MODEL_IDS.includes(m), m);
  for (const k of ["car", "character"]) assert.ok(OBJECT_KINDS.includes(k), k);
  const ok = validateSpec(mini("soft-studio", { set: "desk", objects: [{ kind: "laptop" }] }));
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));
  const bad = validateSpec(mini("soft-studio", { set: "volcano", objects: [{ kind: "laptop" }] }));
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => e.path === "scenes.0.visual.set"), JSON.stringify(bad.errors));
  const badCar = validateSpec(mini("moody-night", { objects: [{ kind: "car", model: "character-a" }] }));
  assert.equal(badCar.ok, false);
  assert.ok(badCar.errors.some((e) => e.path === "scenes.0.visual.objects.0.model" && /car/.test(e.message)), JSON.stringify(badCar.errors));
});

test("the set of a scene: explicit set wins, auto and missing fall back to the look's default", () => {
  assert.equal(setOf({ set: "road" }, "soft-studio"), "road");
  assert.equal(setOf({ set: "auto" }, "moody-night"), RENDER3D["moody-night"].set);
  assert.equal(setOf({}, "neon-grid"), RENDER3D["neon-grid"].set);
});

test("staged models: set props, default car and character models and explicit models are collected", () => {
  const spec = resolveSpec(validateSpec(mini("moody-night", { objects: [{ kind: "car" }, { kind: "character", model: "character-d" }, { kind: "model", model: "food-apple-01" }] })).spec, getTemplate("moody-night"));
  const ids = collectModelIds(spec);
  for (const m of SET_MODELS[setOf(spec.scenes[0].visual, "moody-night")]) assert.ok(ids.includes(m), `set prop ${m}`);
  assert.ok(ids.includes(CAR_MODELS[0]), "default car");
  assert.ok(ids.includes("character-d"));
  assert.ok(ids.includes("food-apple-01"));
  assert.equal(new Set(ids).size, ids.length, "no duplicates");
});

test("new camera moves are pure, move the camera and keep the target at the frame center", () => {
  const frame = { target: [0, 0.5, 0], dist: 12, viewH: 9 };
  for (const move of ["glide", "rise"]) {
    assert.ok(CAMERA_MOVES.includes(move), move);
    const a = cameraAt({ t: 1, sceneSec: 4, look: "soft-studio", move, frame });
    assert.deepEqual(a, cameraAt({ t: 1, sceneSec: 4, look: "soft-studio", move, frame }));
    assert.notDeepEqual(a.position, cameraAt({ t: 3.5, sceneSec: 4, look: "soft-studio", move, frame }).position, move);
    const p = projectPoint(a, a.target);
    assert.ok(Math.abs(p.x - 540) < 1 && Math.abs(p.y - 960) < 1, `${move}: ${JSON.stringify(p)}`);
  }
});

test("the camera keeps every new-format example object inside the safe zone for the whole scene", () => {
  for (const id of NEW) {
    const spec = resolveSpec(validateSpec(example(id)).spec, getTemplate(id));
    const timeline = computeTimeline(spec.scenes, { fps: 30 });
    planThree(spec, timeline).forEach((p, i) => {
      const sec = timeline.scenes[i].durationInFrames / 30;
      for (const t of [0.1, sec / 2, sec - 0.2]) {
        const cam = cameraAt({ t, sceneSec: sec, look: id, move: p.move, frame: p.frame, focusPos: p.focus === null ? null : p.objects[p.focus].pos });
        p.objects.forEach((o, k) => {
          if (p.focus !== null && k !== p.focus && t > sec / 2) return;
          for (const y of [0, o.h]) {
            const q = projectPoint(cam, [o.pos[0], o.pos[1] + y, o.pos[2]]);
            assert.ok(q.x > 60 && q.x < 1020 && q.y > 300 && q.y < 1560, `${id} scene ${i + 1} obj ${k} at ${t.toFixed(1)}s -> ${Math.round(q.x)},${Math.round(q.y)}`);
          }
        });
      }
    });
  }
});

test("music: each new format has its own default mood", () => {
  const mood = (template) => autoMood({ template, title: "x", scenes: [] });
  assert.equal(mood("moody-night"), "tense-mystery");
  assert.equal(mood("soft-studio"), "minimal-ambient");
  assert.equal(mood("voxel-world"), "upbeat-fun");
  assert.equal(mood("neon-grid"), "tech-lofi");
});

test("a character takes only character models and known animations; a malformed anim or model is rejected", () => {
  const ok = validateSpec(mini("voxel-world", { objects: [{ kind: "character", model: "character-k", anim: "walk" }] }));
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));
  const badAnim = validateSpec(mini("voxel-world", { objects: [{ kind: "character", anim: "dance" }] }));
  assert.equal(badAnim.ok, false);
  assert.ok(badAnim.errors.some((e) => e.path === "scenes.0.visual.objects.0.anim"), JSON.stringify(badAnim.errors));
  const badModel = validateSpec(mini("voxel-world", { objects: [{ kind: "character", model: "car-taxi" }] }));
  assert.equal(badModel.ok, false);
  assert.ok(badModel.errors.some((e) => e.path === "scenes.0.visual.objects.0.model" && /character/.test(e.message)), JSON.stringify(badModel.errors));
});

test("every catalogued model is used: a model kind default, a car, a character or a set prop", () => {
  const PROPS = ["potted-plant-04", "alarm-clock-01", "food-apple-01", "megaphone-01"];
  const used = new Set([...PROPS, ...CAR_MODELS, ...CHARACTER_MODELS, ...Object.values(SET_MODELS).flat()]);
  for (const m of MODEL_IDS) assert.ok(used.has(m), `${m} is catalogued but nothing renders it`);
});

test("the spec writer prompt names the new formats, the set field and the new kinds (briefly)", () => {
  const prompt = read("../prompts/spec-writer.md");
  for (const id of NEW) assert.ok(prompt.includes(`\`${id}\``), id);
  for (const s of ['"set"?', "`car`", "`character`", '"glide"', '"rise"']) assert.ok(prompt.includes(s), s);
});
