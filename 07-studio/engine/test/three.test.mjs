import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { listTemplates, getTemplate } from "../lib/templates.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { computeTimeline } from "../lib/timeline.mjs";
import { computeBeats } from "../lib/illustrated.mjs";
import { CHROMIUM_OPTIONS } from "../lib/render.mjs";
import { MODEL_IDS, OBJECT_KINDS, THREE_D_TEMPLATE_IDS, cameraAt, floatY, planThree, projectPoint, usesThreeKit } from "../lib/scene3d.mjs";

const THREE = ["clay-diorama", "iso-toon", "neon-glass", "pedestal", "paper-world", "toy-blocks", "holo-studio", "neon-grid", "soft-studio", "moody-night", "voxel-world", "data-stage", "monolith-story", "clay-mascot", "cutaway-explainer"];
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const example = (id) => JSON.parse(read(`../examples/${id}.spec.json`));
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

const mini = (objects, extra = {}) => ({
  version: 1,
  title: "x",
  template: "clay-diorama",
  scenes: [{ id: "a", narration: "Hola mundo.", title: { main: "Hola" }, visual: { type: "scene3d", stock: true, objects, ...extra } }],
});

test("the template list orders illustrated looks, then the 3D looks, then the classic templates", () => {
  const ids = listTemplates().map((t) => t.id);
  assert.deepEqual(THREE_D_TEMPLATE_IDS, THREE);
  assert.deepEqual(ids.slice(0, 6), ["illustrated", "whiteboard", "broadcast", "editorial-chart", "editor-window", "rank-numbers"]);
  const at = ids.indexOf("clay-diorama");
  assert.deepEqual(ids.slice(at, at + THREE.length), THREE);
  assert.deepEqual(ids.slice(-5), ["captions-voice", "kinetic-type", "countdown", "glass-cards", "letterbox"]);
});

test("every 3D template uses the 3D kit, previews as style three and has gallery metadata without emoji", () => {
  for (const id of THREE) {
    const t = getTemplate(id);
    assert.ok(usesThreeKit(id), id);
    assert.equal(t.preview.style, "three", `${id} preview style`);
    for (const k of ["name", "description", "prompt_hint", "best_for"]) assert.ok(t[k], `${id} missing ${k}`);
    assert.ok(!EMOJI.test(JSON.stringify(t)), `${id} has emoji`);
  }
  for (const id of ["illustrated", "captions-voice"]) assert.equal(usesThreeKit(id), false);
});

test("each 3D example spec validates, uses only scene3d visuals and has no emoji", () => {
  for (const id of THREE) {
    const raw = example(id);
    assert.equal(raw.template, id);
    const r = validateSpec(raw);
    assert.equal(r.ok, true, `${id}: ${JSON.stringify(r.errors)}`);
    assert.ok(r.spec.scenes.length >= 5 && r.spec.scenes.length <= 14, `${id}: 5-14 scenes`);
    assert.ok(r.spec.scenes.every((s) => s.visual.type === "scene3d"), `${id}: all scenes scene3d`);
    assert.ok(!EMOJI.test(JSON.stringify(raw)), `${id}: emoji`);
  }
});

test("an unknown 3D object kind is rejected with its path and the list of kinds", () => {
  const r = validateSpec(mini([{ kind: "cube" }, { kind: "spaceship" }]));
  assert.equal(r.ok, false);
  const e = r.errors.find((x) => x.path === "scenes.0.visual.objects.1.kind");
  assert.ok(e, JSON.stringify(r.errors));
  assert.match(e.message, /unknown 3D object kind "spaceship"/);
  assert.match(e.message, /phone/);
  assert.equal(OBJECT_KINDS.includes("spaceship"), false);
});

test("scene3d checks: required fields per kind, connection and focus ids, unknown models, emoji", () => {
  const bad = (objects, extra, path, re) => {
    const r = validateSpec(mini(objects, extra));
    assert.equal(r.ok, false, path);
    assert.ok(r.errors.some((e) => e.path === path && re.test(e.message)), `${path}: ${JSON.stringify(r.errors)}`);
  };
  bad([{ kind: "chart" }], {}, "scenes.0.visual.objects.0.values", /values/);
  bad([{ kind: "stat" }], {}, "scenes.0.visual.objects.0.value", /value/);
  bad([{ kind: "icon" }], {}, "scenes.0.visual.objects.0.icon", /icon/);
  bad([{ kind: "model", model: "spaceship" }], {}, "scenes.0.visual.objects.0.model", /unknown model/);
  bad([{ kind: "cube", id: "a" }], { connect: [{ from: "a", to: "zz" }] }, "scenes.0.visual.connect.0.to", /no object with id "zz"/);
  bad([{ kind: "cube", id: "a" }], { focus: "b" }, "scenes.0.visual.focus", /no object with id "b"/);
  bad([], {}, "scenes.0.visual.objects", /at least one object/);
  bad([{ kind: "cube", label: "Hola \u{1F680}" }], {}, "scenes.0.visual.objects.0.label", /emoji/);
  const ok = validateSpec(mini([{ kind: "cube", id: "a", label: "API" }, { kind: "database", id: "b" }], { connect: [{ from: "a", to: "b" }], focus: "b", camera: "orbit" }));
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));
});

test("scene3d visuals are rejected outside the 3D templates", () => {
  const s = mini([{ kind: "cube" }]);
  s.template = "illustrated";
  const r = validateSpec(s);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.path === "scenes.0.visual.type" && /3D template/.test(e.message)), JSON.stringify(r.errors));
});

test("the model catalog matches 03-assets/3d/licenses.json and every asset is CC0 with a source", () => {
  const lic = JSON.parse(read("../../../03-assets/3d/licenses.json"));
  assert.deepEqual(lic.models.map((m) => m.id).sort(), [...MODEL_IDS].sort());
  for (const a of [...lic.models, ...lic.hdri]) {
    assert.equal(a.license, "CC0-1.0", a.id);
    assert.match(a.source, /^https:\/\//, a.id);
    assert.ok(a.file && a.credit, a.id);
  }
});

test("every render call passes chromiumOptions with gl angle (three.js needs it)", () => {
  assert.deepEqual(CHROMIUM_OPTIONS, { gl: "angle" });
  for (const f of ["../lib/render.mjs", "../scripts/illustrated-stills.mjs", "../scripts/preview-stills.mjs"]) {
    const src = read(f);
    const calls = src.match(/\b(selectComposition|renderMedia|renderStill)\(\{[^)]*\}\)/gs) ?? [];
    assert.ok(calls.length > 0, `${f}: no render calls found`);
    for (const c of calls) assert.match(c, /chromiumOptions/, `${f}: ${c.slice(0, 80)}`);
  }
  assert.match(read("../remotion.config.ts"), /setChromiumOpenGlRenderer\("angle"\)/);
});

test("the camera frames every example object inside the safe zone for the whole scene", () => {
  for (const id of THREE) {
    const spec = resolveSpec(validateSpec(example(id)).spec, getTemplate(id));
    const timeline = computeTimeline(spec.scenes, { fps: 30 });
    const plans = planThree(spec, timeline);
    plans.forEach((p, i) => {
      const sec = timeline.scenes[i].durationInFrames / 30;
      for (const t of [0.1, sec / 2, sec - 0.2]) {
        const cam = cameraAt({ t, sceneSec: sec, look: id, move: p.move, frame: p.frame, focusPos: p.focus === null ? null : p.objects[p.focus].pos });
        p.objects.forEach((o, k) => {
          if (p.focus !== null && k !== p.focus && t > sec / 2) return; // a focus push may crop the others
          for (const y of [0, o.h]) {
            const q = projectPoint(cam, [o.pos[0], o.pos[1] + y + floatY(id, t, k), o.pos[2]]);
            assert.ok(q.x > 60 && q.x < 1020 && q.y > 300 && q.y < 1560, `${id} scene ${i + 1} obj ${k} at ${t.toFixed(1)}s -> ${Math.round(q.x)},${Math.round(q.y)}`);
          }
        });
      }
    });
  }
});

test("3D plans drive the SFX beat timeline: a pop per object, a draw per connection, bar pops for charts", () => {
  const spec = resolveSpec(
    validateSpec(mini([{ kind: "cube", id: "a" }, { kind: "chart", id: "b", values: [1, 2, 3] }], { connect: [{ from: "a", to: "b" }] })).spec,
    getTemplate("clay-diorama"),
  );
  const timeline = computeTimeline(spec.scenes, { fps: 30 });
  const plans = planThree(spec, timeline);
  assert.equal(plans[0].objects.length, 2);
  assert.equal(plans[0].connections.length, 1);
  assert.ok(plans[0].connections[0].enter > plans[0].objects[1].enter);
  const kinds = computeBeats(plans, timeline, 30).map((b) => b.kind);
  assert.equal(kinds.filter((k) => k === "pop").length, 2 + 3);
  assert.equal(kinds.filter((k) => k === "draw").length, 1);
  assert.ok(kinds.includes("title"));
});

test("the camera is a pure function of time and each look has a distinct language", () => {
  const frame = { target: [0, 0.5, 0], dist: 12, viewH: 9 };
  const a = cameraAt({ t: 1.2, sceneSec: 4, look: "clay-diorama", move: "orbit", frame });
  assert.deepEqual(a, cameraAt({ t: 1.2, sceneSec: 4, look: "clay-diorama", move: "orbit", frame }));
  assert.notDeepEqual(a.position, cameraAt({ t: 3, sceneSec: 4, look: "clay-diorama", move: "orbit", frame }).position);
  assert.equal(cameraAt({ t: 0, sceneSec: 4, look: "iso-toon", move: "static", frame }).ortho, true);
  assert.equal(cameraAt({ t: 0, sceneSec: 4, look: "neon-glass", move: "static", frame }).ortho, false);
  // the camera target projects to the frame center
  const c = cameraAt({ t: 0, sceneSec: 4, look: "pedestal", move: "static", frame });
  const p = projectPoint(c, c.target);
  assert.ok(Math.abs(p.x - 540) < 1 && Math.abs(p.y - 960) < 1, JSON.stringify(p));
});
