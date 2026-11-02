// Agent-drawn 2D: `drawing` elements (illustrated kit) and `visual.drawing` (classic templates), part motion with word
// moments, and the 2D fx library (lib/drawing.mjs, lib/fx2d.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { getTemplate } from "../lib/templates.mjs";
import { computeTimeline } from "../lib/timeline.mjs";
import { planIllustration } from "../lib/illustrated.mjs";
import { DRAW_MOTIONS, DRAW_SHAPES, drawingLayout, partState, planDrawings } from "../lib/drawing.mjs";
import { FX2D_TYPES, fx2dCamera, fx2dWindow, particles2d, burst2d, scribbles2d } from "../lib/fx2d.mjs";
import { specWriterPromptFor } from "../lib/spec-writer-prompt.mjs";

const SUN = {
  type: "drawing",
  id: "sol",
  viewBox: "0 0 400 400",
  parts: [
    { id: "body", shape: "group", origin: [200, 200] },
    { id: "face", shape: "circle", cx: 200, cy: 200, r: 110, fill: { gradient: ["accent2", "accent"], angle: 90 }, stroke: "text", width: 6, parent: "body", draw: true },
    { id: "eye-l", shape: "ellipse", cx: 165, cy: 185, rx: 10, ry: 16, fill: "text", parent: "body" },
    { id: "eye-r", shape: "ellipse", cx: 235, cy: 185, rx: 10, ry: 16, fill: "text", parent: "body" },
    { id: "smile", shape: "path", d: "M160 240 Q200 275 240 240", stroke: "text", width: 8, fill: "none", parent: "body", draw: true, at: "sol" },
    { id: "ray", shape: "line", x1: 200, y1: 40, x2: 200, y2: 70, stroke: "accent2", width: 10, motion: ["pulse"] },
    { id: "label", shape: "text", x: 200, y: 380, text: "SOL", size: 40, fill: "text", anchor: "middle" },
    { id: "spark", shape: "polygon", points: [[330, 60], [340, 90], [370, 100], [340, 110], [330, 140], [320, 110], [290, 100], [320, 90]], fill: "#FFE066", motion: [{ type: "spin", speed: 2 }] },
    { id: "box", shape: "rect", x: 20, y: 300, w: 80, h: 60, r: 10, fill: "accent3", keys: [{ at: 0, y: 0 }, { at: "brilla", y: -40, ease: "back" }] },
  ],
  motion: ["float", { type: "blink", parts: ["eye-l", "eye-r"] }, { type: "pop-in", at: 0.2 }],
};

const illustrated = (elements, extra = {}, narration = "El sol brilla cada mañana sobre la ciudad dormida.") => ({
  version: 1,
  title: "x",
  template: "watercolor",
  voice: { provider: "none" },
  scenes: [{ id: "a", narration, durationSec: 5, title: { main: "Sol" }, visual: { type: "illustration", elements, ...extra } }],
});
const classic = (template, visual, narration = "El sol brilla cada mañana sobre la ciudad dormida.") => ({
  version: 1,
  title: "x",
  template,
  voice: { provider: "none" },
  scenes: [{ id: "a", narration, durationSec: 5, onScreenText: "El sol", visual }],
});
const errorsOf = (spec) => {
  const r = validateSpec(spec);
  assert.equal(r.ok, false, "expected the spec to be rejected");
  return r.errors;
};
const hasError = (errors, path, re) => assert.ok(errors.some((e) => e.path === path && re.test(e.message)), `${path} ${re}: ${JSON.stringify(errors)}`);
const without = (o, k) => Object.fromEntries(Object.entries(o).filter(([key]) => key !== k));

test("vocabulary: shapes, motion presets and fx types", () => {
  assert.deepEqual(DRAW_SHAPES, ["path", "rect", "circle", "ellipse", "polygon", "line", "text", "group"]);
  for (const m of ["bob", "float", "sway", "spin", "pulse", "wave", "blink", "pop-in", "slide-in-left", "slide-in-right", "wiggle", "squash", "draw-on", "orbit", "fall", "shake"]) assert.ok(DRAW_MOTIONS.includes(m), m);
  for (const f of ["sparkles", "confetti", "dust", "bubbles", "leaves", "stars", "ink-splash", "light-leak", "grain", "scribbles", "burst", "flash", "zoom-punch", "shake", "glitch", "chromatic", "speed-lines"]) assert.ok(FX2D_TYPES.includes(f), f);
});

test("an illustrated drawing element with parts, motion, keys and scene fx validates", () => {
  const r = validateSpec(
    illustrated([SUN, { type: "badge", id: "tag", text: "Brilla" }], {
      fx: [
        { type: "sparkles", target: "sol", at: "brilla" },
        { type: "burst", target: "sol/face", at: 1.2, seed: 7 },
        { type: "scribbles", target: "tag", at: "ciudad" },
        { type: "light-leak" },
        { type: "zoom-punch", at: "sol" },
        { type: "grain", until: "fin" },
      ],
    }),
  );
  assert.equal(r.ok, true, JSON.stringify(r.errors));
});

test("the old svg element keeps validating next to drawings", () => {
  const r = validateSpec(illustrated([{ type: "svg", paths: [{ d: "M0 0 L10 10", stroke: "accent" }] }, SUN]));
  assert.equal(r.ok, true, JSON.stringify(r.errors));
});

test("drawing errors: unknown shape, missing geometry, bad color, duplicate ids, unknown motion", () => {
  const bad = {
    ...SUN,
    parts: [
      { id: "a", shape: "blob" },
      { id: "b", shape: "circle", cx: 10, cy: 10 },
      { id: "c", shape: "rect", x: 0, y: 0, w: 10, h: 10, fill: "purpleish" },
      { id: "c", shape: "line", x1: 0, y1: 0, x2: 5, y2: 5 },
      { id: "d", shape: "path", d: "M0 0 L1 1", motion: ["moonwalk"] },
      { id: "e", shape: "text", x: 0, y: 0 },
    ],
    motion: undefined,
  };
  const errors = errorsOf(illustrated([bad]));
  const base = "scenes.0.visual.elements.0.parts";
  hasError(errors, `${base}.0.shape`, /unknown drawing shape "blob".*path, rect, circle/);
  hasError(errors, `${base}.1.r`, /circle needs `r`/);
  hasError(errors, `${base}.2.fill`, /palette role .*or a hex color/);
  hasError(errors, `${base}.3.id`, /duplicate part id "c"/);
  hasError(errors, `${base}.4.motion.0`, /unknown motion "moonwalk".*bob/);
  hasError(errors, `${base}.5.text`, /text needs `text`/);
});

test("part hierarchy: missing parents and cycles are rejected", () => {
  const cyc = { type: "drawing", parts: [
    { id: "a", shape: "group", parent: "c" },
    { id: "b", shape: "group", parent: "a" },
    { id: "c", shape: "group", parent: "b" },
    { id: "d", shape: "circle", cx: 0, cy: 0, r: 4, parent: "ghost" },
    { id: "e", shape: "circle", cx: 0, cy: 0, r: 4, parent: "e" },
  ] };
  const errors = errorsOf(illustrated([cyc]));
  const base = "scenes.0.visual.elements.0.parts";
  hasError(errors, `${base}.0.parent`, /parent cycle: a -> c -> b -> a/);
  hasError(errors, `${base}.3.parent`, /no part with id "ghost"/);
  hasError(errors, `${base}.4.parent`, /parent cycle: e -> e/);
  assert.equal(errors.filter((e) => /parent cycle/.test(e.message)).length, 2, "one report per cycle");
});

test("drawing budgets: at most 60 parts and 8000 path characters", () => {
  const many = { type: "drawing", parts: Array.from({ length: 61 }, (_, i) => ({ id: `p${i}`, shape: "circle", cx: i, cy: 0, r: 2 })) };
  hasError(errorsOf(illustrated([many])), "scenes.0.visual.elements.0.parts", /at most 60 parts/);
  const d = `M0 0 ${"L10 10 ".repeat(600)}`;
  const heavy = { type: "drawing", parts: [0, 1, 2].map((i) => ({ id: `p${i}`, shape: "path", d: d.slice(0, 3000) })) };
  hasError(errorsOf(illustrated([heavy])), "scenes.0.visual.elements.0.parts", /9000 path characters.*8000/);
});

test("drawing motion checks: blink needs parts, part motions take no parts, moments must be readable", () => {
  const d = {
    type: "drawing",
    parts: [{ id: "eye", shape: "circle", cx: 0, cy: 0, r: 4, motion: [{ type: "blink", parts: ["eye"] }] }],
    motion: ["blink", { type: "draw-on", parts: ["nose"] }, { type: "bob", at: "#bad" }],
  };
  const errors = errorsOf(illustrated([d]));
  const base = "scenes.0.visual.elements.0";
  hasError(errors, `${base}.motion.0`, /blink needs `parts`/);
  hasError(errors, `${base}.motion.1.parts.0`, /no part with id "nose"/);
  hasError(errors, `${base}.motion.2.at`, /cannot read the moment "#bad"/);
  hasError(errors, `${base}.parts.0.motion.0.parts`, /a part's motion moves that part/);
});

test("2D fx errors: unknown type, missing target, too many", () => {
  hasError(errorsOf(illustrated([SUN], { fx: [{ type: "fireworks" }] })), "scenes.0.visual.fx.0", /unknown fx "fireworks".*sparkles.*speed-lines/);
  const errors = errorsOf(illustrated([SUN], { fx: [{ type: "sparkles", target: "nope" }, { type: "burst", target: "sol/ghost" }, { type: "flash", at: "#x" }] }));
  hasError(errors, "scenes.0.visual.fx.0.target", /no element with id "nope"/);
  hasError(errors, "scenes.0.visual.fx.1.target", /no part "ghost" in drawing "sol"/);
  hasError(errors, "scenes.0.visual.fx.2.at", /cannot read the moment "#x"/);
  const nine = Array.from({ length: 9 }, () => ({ type: "dust" }));
  hasError(errorsOf(illustrated([SUN], { fx: nine })), "scenes.0.visual.fx", /at most 8/);
});

test("3D fx keep validating on scene3d visuals and 2D fx are rejected there", () => {
  const spec = (fx) => ({ version: 1, title: "x", template: "clay-diorama", scenes: [{ id: "a", narration: "hola mundo", title: { main: "x" }, visual: { type: "scene3d", stock: true, objects: [{ kind: "coin", id: "c" }], fx } }] });
  assert.equal(validateSpec(spec([{ type: "sweep" }, { type: "particles", kind: "sparks" }])).ok, true);
  hasError(errorsOf(spec([{ type: "sparkles" }])), "scenes.0.visual.fx.0.type", /2D fx.*3D scenes use: particles/);
});

test("classic templates accept a drawing visual and 2D fx", () => {
  const drawing = without(SUN, "type");
  for (const t of ["captions-voice", "kinetic-type", "countdown", "glass-cards", "letterbox"]) {
    const r = validateSpec(classic(t, { type: "drawing", drawing, fx: [{ type: "confetti", at: "brilla" }, { type: "burst", target: "sol" }] }));
    assert.equal(r.ok, true, `${t}: ${JSON.stringify(r.errors)}`);
  }
  hasError(errorsOf(classic("captions-voice", { type: "drawing" })), "scenes.0.visual.drawing", /requires visual.drawing/);
  hasError(errorsOf(classic("captions-voice", { type: "gradient", fx: [{ type: "burst", target: "ghost" }] })), "scenes.0.visual.fx.0.target", /no drawing with id "ghost"/);
  hasError(errorsOf(classic("captions-voice", { type: "drawing", drawing: { parts: [{ id: "x", shape: "circle", cx: 0, cy: 0 }] } })), "scenes.0.visual.drawing.parts.0.r", /circle needs `r`/);
  // a drawing visual belongs to the classic templates; the illustrated kit uses the drawing element
  const ill = illustrated([SUN]);
  ill.scenes[0].visual = { type: "drawing", drawing };
  hasError(errorsOf(ill), "scenes.0.visual.type", /classic templates/);
});

test("every example spec still validates", () => {
  const dir = fileURLToPath(new URL("../examples/", import.meta.url));
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const r = validateSpec(JSON.parse(readFileSync(dir + f, "utf8")));
    assert.equal(r.ok, true, `${f}: ${JSON.stringify(r.errors?.slice(0, 3))}`);
  }
});

// ---------------- motion ----------------

const ctx = (moments = {}) => ({ sec: (m) => (typeof m === "number" ? m : (moments[m] ?? 0)), enter: 0.5, seed: 3, unit: 1 });

test("keys interpolate offsets, rotation, scale and opacity with easing; word moments resolve through ctx.sec", () => {
  const node = { keys: [{ at: 0, x: 0, rot: 0, scale: 1, opacity: 0 }, { at: "dos", x: 100, rot: 90, scale: [2, 1], opacity: 1, ease: "linear" }] };
  const c = ctx({ dos: 2 });
  const a = partState(node, 0, c);
  assert.deepEqual([a.x, a.rot, a.sx, a.sy, a.opacity], [0, 0, 1, 1, 0]);
  const m = partState(node, 1, c);
  assert.ok(Math.abs(m.x - 50) < 1e-9 && Math.abs(m.rot - 45) < 1e-9 && Math.abs(m.sx - 1.5) < 1e-9 && m.sy === 1);
  const z = partState(node, 3, c);
  assert.deepEqual([z.x, z.rot, z.sx, z.opacity], [100, 90, 2, 1]);
});

test("presets: pop-in hides before its moment, bob is periodic, blink closes briefly, draw-on progresses, slide-in arrives", () => {
  const c = ctx();
  assert.equal(partState({ motion: [{ type: "pop-in", at: 1 }] }, 0.5, c).visible, false);
  assert.ok(Math.abs(partState({ motion: [{ type: "pop-in", at: 1 }] }, 2, c).sx - 1) < 1e-6);
  const bob = (t) => partState({ motion: ["bob"] }, t, c).y;
  assert.ok(Math.abs(bob(3) - bob(3 + 1.25)) < 1e-6, "bob period 1.25 s");
  assert.ok(Math.abs(bob(3.3)) > 1);
  const closed = Array.from({ length: 300 }, (_, i) => partState({ motion: ["blink"] }, i / 30, c).sy).filter((s) => s < 0.3).length;
  assert.ok(closed >= 2 && closed < 30, `blink closes for a few frames (${closed})`);
  const d = (t) => partState({ motion: [{ type: "draw-on", at: 1 }] }, t, c).draw;
  assert.equal(d(0.5), 0);
  assert.ok(d(1.3) > 0 && d(1.3) < 1);
  assert.equal(d(3), 1);
  const s = (t) => partState({ motion: [{ type: "slide-in-left", at: 0 }] }, t, c, { width: 400, height: 400 });
  assert.ok(s(0.05).x < -100 && Math.abs(s(2).x) < 1e-6);
});

test("drawing-level blink and draw-on reach only the listed parts, in order", () => {
  const drawing = { motion: [{ type: "blink", parts: ["e"] }, { type: "draw-on", at: 1, parts: ["a", "b"] }] };
  const c = ctx();
  const sy = (id) => Math.min(...Array.from({ length: 300 }, (_, i) => partState({}, i / 30, c, null, drawing.motion, id).sy));
  assert.ok(sy("e") < 0.3 && sy("a") === 1);
  const at = (id, t) => partState({}, t, c, null, drawing.motion, id).draw;
  assert.ok(at("a", 1.2) > at("b", 1.2), "b starts after a");
  assert.equal(at("z", 1.2), null);
});

test("partState is a pure function of time", () => {
  const node = { motion: ["float", "wiggle", "squash", { type: "shake", at: 1 }, "orbit", "sway", "spin", "wave"] };
  for (const t of [0, 0.7, 1.2, 4.4]) assert.deepEqual(partState(node, t, ctx()), partState(node, t, ctx()));
});

test("layout: default origins are part centers, groups take their children's box", () => {
  const lay = drawingLayout(SUN.parts);
  assert.deepEqual(lay.get("eye-l").origin, [165, 185]);
  assert.deepEqual(lay.get("box").origin, [60, 330]);
  assert.deepEqual(lay.get("body").origin, [200, 200], "explicit origin wins");
  const face = lay.get("face").box;
  assert.deepEqual([face.x, face.y, face.w, face.h], [90, 90, 220, 220]);
  assert.deepEqual(lay.roots, ["body", "ray", "label", "spark", "box"]);
  assert.deepEqual(lay.get("body").children, ["face", "eye-l", "eye-r", "smile"]);
});

// ---------------- fx ----------------

test("fx particles and bursts are deterministic per seed", () => {
  const area = { x: 100, y: 300, w: 800, h: 900 };
  for (const type of ["sparkles", "confetti", "dust", "bubbles", "leaves", "stars"]) {
    const a = particles2d(type, { seed: "s1", t: 1.7, area });
    assert.deepEqual(a, particles2d(type, { seed: "s1", t: 1.7, area }), type);
    assert.notDeepEqual(a, particles2d(type, { seed: "s2", t: 1.7, area }), type);
    assert.ok(a.length >= 4);
  }
  const b = burst2d(0.3, { seed: 4, origin: { x: 540, y: 900 } });
  assert.deepEqual(b, burst2d(0.3, { seed: 4, origin: { x: 540, y: 900 } }));
  assert.equal(burst2d(5, { seed: 4, origin: { x: 540, y: 900 } }).length, 0, "a burst ends");
  const s = scribbles2d(9, { x: 200, y: 600, w: 600, h: 300 }, 4);
  assert.equal(s.length, 4);
  assert.deepEqual(s, scribbles2d(9, { x: 200, y: 600, w: 600, h: 300 }, 4));
});

test("fx windows: one-shots last their duration, ambient effects span at..until", () => {
  const sec = (m) => (typeof m === "number" ? m : 2);
  const w = fx2dWindow({ type: "flash", at: 1 }, 1.1, 5, sec);
  assert.ok(w.active && w.p > 0 && w.p < 1);
  assert.equal(fx2dWindow({ type: "flash", at: 1 }, 2, 5, sec).active, false);
  assert.ok(fx2dWindow({ type: "dust", at: "x", until: 4 }, 3, 5, sec).active);
  assert.equal(fx2dWindow({ type: "dust", at: "x", until: 4 }, 1, 5, sec).active, false);
});

test("camera fx: zoom-punch and shake move the scene only inside their window", () => {
  const sec = (m) => m;
  const fx = [{ type: "zoom-punch", at: 1 }, { type: "shake", at: 2 }];
  assert.deepEqual(fx2dCamera(fx, 0.5, 5, sec), { x: 0, y: 0, scale: 1, glitch: 0, chroma: 0 });
  assert.ok(fx2dCamera(fx, 1.05, 5, sec).scale > 1.03);
  const s = fx2dCamera(fx, 2.1, 5, sec);
  assert.ok(Math.abs(s.x) + Math.abs(s.y) > 0.5);
  assert.deepEqual(fx2dCamera(fx, 4, 5, sec), { x: 0, y: 0, scale: 1, glitch: 0, chroma: 0 });
});

// ---------------- planning ----------------

test("planIllustration resolves the drawing and fx word moments of each scene (real captions when given)", () => {
  const raw = illustrated([SUN], { fx: [{ type: "burst", target: "sol", at: "ciudad" }] });
  const spec = resolveSpec(validateSpec(raw).spec, getTemplate("watercolor"));
  const timeline = computeTimeline(spec.scenes, { fps: 30 });
  const plan = planIllustration(spec, timeline);
  const m = plan[0].moments;
  assert.ok(m.brilla > 0 && m.ciudad > m.brilla && m.sol >= 0, JSON.stringify(m));
  const words = spec.scenes[0].narration.split(/\s+/).map((w, i) => ({ text: w, startMs: 100 + i * 200, endMs: 280 + i * 200 }));
  const p2 = planIllustration(spec, timeline, words);
  assert.ok(Math.abs(p2[0].moments.brilla - (100 + 2 * 200) / 1000) < 0.2, JSON.stringify(p2[0].moments));
  // scenes without drawings or fx keep the exact previous plan shape (no moments key)
  const plain = resolveSpec(validateSpec(illustrated([{ type: "badge", text: "Hola" }])).spec, getTemplate("watercolor"));
  assert.equal("moments" in planIllustration(plain, computeTimeline(plain.scenes, { fps: 30 }))[0], false);
});

test("planDrawings gives classic scenes their moments, and null when the spec has no drawings or fx", () => {
  const raw = classic("captions-voice", { type: "drawing", drawing: without(SUN, "type"), fx: [{ type: "flash", at: "ciudad" }] });
  const spec = resolveSpec(validateSpec(raw).spec, getTemplate("captions-voice"));
  const timeline = computeTimeline(spec.scenes, { fps: 30 });
  const plan = planDrawings(spec, timeline);
  assert.equal(plan[0].kind, "drawing2d");
  assert.ok(plan[0].moments.ciudad > 0);
  assert.deepEqual(plan[0].elements, []);
  const plain = resolveSpec(validateSpec(classic("captions-voice", { type: "emoji", emoji: "x" })).spec, getTemplate("captions-voice"));
  assert.equal(planDrawings(plain, computeTimeline(plain.scenes, { fps: 30 })), null);
});

// ---------------- instructions ----------------

const FULL = readFileSync(new URL("../prompts/spec-writer.md", import.meta.url), "utf8");

test("Creative mode: 2D goes to illustrated-kit and classic templates on the subscription path only", () => {
  assert.ok(FULL.includes("## Creative mode: 2D"));
  for (const id of ["illustrated", "watercolor", "ui-cards", "captions-voice", "kinetic-type", "countdown", "glass-cards", "letterbox"]) {
    assert.ok(specWriterPromptFor(id, FULL, { creative: true }).includes("## Creative mode: 2D"), id);
    assert.ok(!specWriterPromptFor(id, FULL).includes("## Creative mode: 2D"), `${id} API`);
  }
  for (const id of ["pixel-dusk", "clay-diorama", "reels-noche"]) assert.ok(!specWriterPromptFor(id, FULL, { creative: true }).includes("## Creative mode: 2D"), id);
  const section = FULL.slice(FULL.indexOf("## Creative mode: 2D"));
  const body = section.slice(0, section.indexOf("\n## ", 5) === -1 ? undefined : section.indexOf("\n## ", 5));
  assert.ok(body.length < 8192, `creative 2D section is ${body.length} chars`);
  assert.ok(/illustrated-stills\.mjs/.test(body), "tells the agent to review stills");
});
