// cutaway-explainer: a 3D FORMAT look (style only) for cutaway explainers: a cross-section set built from scratch,
// a recurring character, pull-out reveals, and a diegetic overlay kit (flow chips, concept pill, limit bar, "not
// equal" card) plus flow-pipe signals. Existing looks must plan exactly as before.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { listTemplates, getTemplate } from "../lib/templates.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { computeTimeline } from "../lib/timeline.mjs";
import { PALETTES } from "../lib/palettes.mjs";
import { contrastRatio } from "../lib/palettes.mjs";
import { CAMERA_MOVES, LOOK3D, RENDER3D, THREE_D_TEMPLATE_IDS, cameraAt, collectIconNames3d, look3dOf, overlayColors, overlayContrast, planThree } from "../lib/scene3d.mjs";
import { SHOT_NAMES, FX_TYPES } from "../lib/scene3d-motion.mjs";

const ID = "cutaway-explainer";
const read = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
const text = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const BLOCK = { kind: "custom", id: "b", parts: [{ id: "body", shape: "box", size: [1, 2, 1], pos: [0, 1, 0] }] };
const WORLD = { concept: "a lighthouse keeper's cutaway tower", ground: { kind: "disc" }, parts: [{ id: "w", shape: "box", size: [4, 3, 0.2], pos: [0, 1.5, -2] }] };
const spec = (visual, more = {}) => ({ version: 1, title: "x", template: ID, scenes: [{ id: "a", narration: "Hola mundo, esto es una prueba larga.", visual: { type: "scene3d", objects: [BLOCK], world: WORLD, ...visual } }], ...more });
const errs = (s) => validateSpec(s).errors ?? [];
const has = (s, path, re) => errs(s).some((e) => e.path === path && re.test(e.message));
const planOf = (s) => {
  const r = validateSpec(s);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  const resolved = resolveSpec(r.spec, getTemplate(s.template));
  return planThree(resolved, computeTimeline(resolved.scenes, { fps: resolved.format.fps }));
};
const FLOW = { type: "flow", chips: [{ id: "a", icon: "sun", label: "SOL", value: "10" }, { id: "b", icon: "battery-full", label: "BATERIA" }, { id: "c", icon: "moon", label: "NOCHE" }], active: "b" };

test("the look is registered as a 3D format with a slug and a style-only render profile", () => {
  assert.ok(THREE_D_TEMPLATE_IDS.includes(ID));
  const t = listTemplates().find((x) => x.id === ID);
  assert.equal(t.category, "3d");
  assert.equal(t.format, "cutaway-explainer");
  assert.equal(RENDER3D[ID].set, "none", "no stock set by default");
  assert.ok(LOOK3D[ID].moves.includes("pullout"), "the pull-out reveal is in the look's camera rotation");
  assert.equal(look3dOf({ template: ID }), ID);
  const text = `${t.description} ${t.prompt_hint}`;
  assert.match(text, /from scratch|from custom parts/i);
  assert.doesNotMatch(text, /\p{Extended_Pictographic}/u);
});

test("the example validates, has 6 scenes built from scratch with the overlay kit and no stock content", () => {
  const raw = read(`../examples/${ID}.spec.json`);
  const r = validateSpec(raw);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(raw.template, ID);
  assert.equal(raw.language, "es");
  assert.equal(raw.scenes.length, 6);
  for (const s of raw.scenes) {
    assert.ok(!s.visual.stock);
    assert.ok(s.visual.objects.some((o) => o.kind === "custom"), "custom character or object");
    assert.ok(s.visual.world?.concept && s.visual.world.parts.length, "a world built from parts");
  }
  const types = new Set(raw.scenes.flatMap((s) => (s.visual.overlay ?? []).map((o) => o.type)));
  for (const k of ["flow", "concept", "limit", "versus"]) assert.ok(types.has(k), `overlay ${k} used`);
  assert.ok(raw.scenes.some((s) => (s.visual.fx ?? []).some((f) => f.type === "signal")), "pipe signals used");
  const plan = planOf(raw);
  assert.equal(plan.length, 6);
  assert.ok(plan.some((p) => p.move === "pullout"), "a pull-out reveal is planned");
});

test("stock rules are still enforced under the new look", () => {
  assert.ok(has(spec({ objects: [{ kind: "character" }] }), "scenes.0.visual.objects.0.kind", /stock/));
  assert.ok(has(spec({ set: "city" }), "scenes.0.visual.set", /stock/));
  assert.equal(validateSpec(spec({ objects: [{ kind: "character", stock: true }] })).ok, true, "opt-in still works");
  assert.ok(has(spec({ objects: [{ kind: "laptop" }], world: undefined }), "scenes.0.visual.objects", /from scratch/));
});

test("camera language: reveal / shoulder / through shots and the pullout move", () => {
  for (const s of ["reveal", "shoulder", "through"]) assert.ok(SHOT_NAMES.includes(s), s);
  assert.ok(CAMERA_MOVES.includes("pullout"));
  assert.equal(validateSpec(spec({ shots: [{ shot: "close" }, { shot: "reveal" }, { shot: "shoulder" }, { shot: "through" }] })).ok, true);
  const frame = { target: [0, 1, 0], dist: 10, viewH: 0 };
  const dist = (t) => {
    const c = cameraAt({ t, sceneSec: 6, look: ID, move: "pullout", frame });
    return Math.hypot(...c.position.map((p, i) => p - c.target[i]));
  };
  assert.ok(dist(0) < dist(3) && dist(3) < dist(6), "pulls out over the scene");
  assert.deepEqual(cameraAt({ t: 2, sceneSec: 6, look: ID, move: "pullout", frame }), cameraAt({ t: 2, sceneSec: 6, look: ID, move: "pullout", frame }));
});

test("overlay elements: flow chips, concept pill, limit bar and the not-equal card validate and plan", () => {
  const overlay = [
    { ...FLOW, at: 0.5, steps: [{ at: 2, active: "c", values: { c: "0 %" } }] },
    { type: "concept", text: "CONTROLADOR", at: 1 },
    { type: "limit", label: "DEMANDA", limit: 0.7, steps: [{ at: 1, value: 0.4 }, { at: 3, value: 0.9 }], limitLabel: "LIMITE", note: "SALIDA CORTADA" },
  ];
  const plan = planOf(spec({ overlay }));
  assert.equal(plan[0].overlay.length, 3);
  assert.deepEqual(plan[0].overlay.map((o) => o.type), ["flow", "concept", "limit"]);
  assert.equal(plan[0].overlay[0].at, 0.5);
  assert.equal(plan[0].overlay[0].steps[0].at, 2);
  const vs = planOf(spec({ overlay: [{ type: "versus", left: { title: "GUARDAR", sub: "cuanta energia", icon: "battery-full" }, right: { title: "ALIMENTAR", icon: "plug" }, at: "mundo" }] }));
  assert.equal(vs[0].overlay[0].type, "versus");
  assert.equal(typeof vs[0].overlay[0].at, "number", "a narration word resolves to seconds");
  assert.equal(planOf(spec({}))[0].overlay, undefined, "scenes without an overlay plan as before");
});

test("overlay validation: chip refs, ranges, one element per slot, no emoji", () => {
  assert.ok(has(spec({ overlay: [{ ...FLOW, active: "zzz" }] }), "scenes.0.visual.overlay.0.active", /no chip/));
  assert.ok(has(spec({ overlay: [{ ...FLOW, steps: [{ at: 1, values: { nope: "1" } }] }] }), "scenes.0.visual.overlay.0.steps.0.values", /no chip/));
  assert.ok(errs(spec({ overlay: [{ type: "limit", label: "X", limit: 1.5 }] })).length > 0, "limit is 0..1");
  assert.ok(errs(spec({ overlay: [{ type: "flow", chips: [FLOW.chips[0]] }] })).length > 0, "a flow needs at least 2 chips");
  assert.ok(has(spec({ overlay: [FLOW, FLOW] }), "scenes.0.visual.overlay", /one `flow`/));
  assert.ok(has(spec({ overlay: [{ type: "limit", label: "A" }, { type: "versus", left: { title: "A" }, right: { title: "B" } }] }), "scenes.0.visual.overlay", /card/));
  assert.ok(errs(spec({ overlay: [{ type: "concept", text: "SOL \u{1F31E}" }] })).some((e) => /emoji/.test(e.message)));
  assert.ok(errs(spec({ overlay: [{ type: "banner", text: "x" }] })).length > 0, "unknown overlay type");
});

test("signal fx: dots travel along a pipe path", () => {
  assert.ok(FX_TYPES.includes("signal"));
  const pts = [[0, 1, 0], [0, 2, 0], [2, 2, 0]];
  assert.equal(validateSpec(spec({ fx: [{ type: "signal", points: pts, count: 5, color: "accent2", at: 0.5 }] })).ok, true);
  assert.ok(has(spec({ fx: [{ type: "signal" }] }), "scenes.0.visual.fx.0.points", /points/));
  assert.ok(has(spec({ fx: [{ type: "signal", points: [[0, 0, 0]] }] }), "scenes.0.visual.fx.0.points", /points/));
  assert.ok(errs(spec({ fx: [{ type: "sparkle", points: pts }] })).length > 0);
});

test("overlay icons are collected for loading", () => {
  const s = spec({ overlay: [FLOW, { type: "versus", left: { title: "A", icon: "Plug" }, right: { title: "B" } }] });
  const names = collectIconNames3d(validateSpec(s).spec);
  for (const n of ["sun", "battery-full", "moon", "plug"]) assert.ok(names.includes(n), n);
});

test("overlay colors: labels read (>= 4.5:1) and fills are distinct (>= 3:1) on every palette", () => {
  const palettes = [getTemplate(ID).defaults.theme.palette, ...PALETTES.map((p) => p.palette ?? p)];
  assert.ok(palettes.length > 10);
  for (const p of palettes) {
    const c = overlayColors(p);
    for (const [name, ratio, min] of overlayContrast(c)) assert.ok(ratio >= min, `${name} ${ratio.toFixed(2)} < ${min} on ${JSON.stringify(p.bg)} / ${p.accent}`);
  }
  const c = overlayColors(getTemplate(ID).defaults.theme.palette);
  assert.ok(contrastRatio(c.panelText, c.panel) >= 4.5);
  assert.notEqual(c.over, c.fill, "the over-limit bar differs from the normal fill");
});

test("the template palette reads on its own backgrounds (text 4.5:1, accents 3:1)", () => {
  const p = getTemplate(ID).defaults.theme.palette;
  for (const bg of p.bg) {
    assert.ok(contrastRatio(p.text, bg) >= 4.5, `text on ${bg}`);
    for (const k of ["accent", "accent3"]) assert.ok(contrastRatio(p[k], bg) >= 3, `${k} on ${bg}`);
  }
});

test("an existing look still plans identically (clay-mascot, moody-night)", () => {
  const golden = { "clay-mascot": "cc49ba384fe749d7", "moody-night": "12b493a8430f94e2" };
  for (const [id, want] of Object.entries(golden)) {
    const raw = read(`../examples/${id}.spec.json`);
    const r = validateSpec(raw);
    assert.equal(r.ok, true);
    const res = resolveSpec(r.spec, getTemplate(id));
    const plan = planThree(res, computeTimeline(res.scenes, { fps: res.format.fps }));
    assert.equal(createHash("sha256").update(JSON.stringify(plan)).digest("hex").slice(0, 16), want, id);
  }
});

test("the 3D prompt documents the format, the overlay kit, the signals and the recipes", () => {
  const md = text("../prompts/spec-writer.md");
  for (const needle of [`### \`${ID}\``, "overlay", "signal", "pullout", "reveal", "cutaway house", "cartoon character", "flow-pipe", "versus", "limit"]) assert.ok(md.toLowerCase().includes(needle.toLowerCase()), `prompt mentions ${needle}`);
});
