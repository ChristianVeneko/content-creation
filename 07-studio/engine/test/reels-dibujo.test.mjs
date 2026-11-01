// Reels + the shared 2D kit: the `dibujo` (drawing) scene, drawings as icon pieces, 2D fx in reels scenes, the
// reels creative-mode section and the per-scene moment map the renderer reads.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { REEL_SCENE_TYPES, computeReelsTimeline, defaultPalette, planReels, reelsIssues, sceneTypeOf } from "../lib/reels.mjs";
import { validateSpec } from "../lib/spec.mjs";
import { specWriterPromptFor } from "../lib/spec-writer-prompt.mjs";

const readJson = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));

const SUN = {
  id: "sol",
  viewBox: "0 0 400 400",
  parts: [
    { id: "disc", shape: "circle", cx: 200, cy: 200, r: 110, fill: "accent", stroke: "ink", width: 8, draw: true },
    { id: "eye", shape: "circle", cx: 170, cy: 190, r: 12, fill: "ink", parent: "disc" },
    { id: "ray", shape: "line", x1: 200, y1: 40, x2: 200, y2: 70, stroke: "accent2", width: 10, at: "calienta" },
  ],
  motion: [{ type: "pop-in" }, { type: "blink", parts: ["eye"] }],
};

const reelSpec = (scenes, extra = {}) => ({ version: 1, title: "Prueba", template: "reels-noche", language: "es", voice: { provider: "none" }, scenes, ...extra });
let sceneN = 0;
const scene = (narration, reel, visualExtra = {}) => ({ id: `s${++sceneN}`, narration, visual: { type: "reel", reel, ...visualExtra } });
const errorsOf = (spec) => {
  const r = validateSpec(spec);
  return r.ok ? [] : r.errors.map((e) => `${e.path}: ${e.message}`);
};

// ---------------------------------------------------------------- the dibujo scene

test("dibujo is a reels scene type with the English alias drawing", () => {
  assert.ok(REEL_SCENE_TYPES.includes("drawing"));
  assert.equal(sceneTypeOf({ type: "dibujo" }), "drawing");
  assert.equal(sceneTypeOf({ tipo: "dibujo" }), "drawing");
  assert.equal(sceneTypeOf({ type: "drawing" }), "drawing");
});

test("a dibujo scene with a valid drawing, texto, etiqueta and en validates (both type names)", () => {
  for (const type of ["dibujo", "drawing"]) {
    const spec = reelSpec([scene("El sol *calienta* la tierra.", { type, dibujo: SUN, texto: "El sol / *calienta*", etiqueta: "CIENCIA", en: ["sol", "calienta"] })]);
    assert.deepEqual(errorsOf(spec), [], type);
  }
});

test("a dibujo scene without a drawing, or with a broken one, is rejected with a path into the drawing", () => {
  const missing = errorsOf(reelSpec([scene("El sol calienta.", { type: "dibujo", texto: "Sol" })]));
  assert.ok(missing.some((e) => /dibujo/.test(e) && /missing/.test(e)), missing.join("\n"));

  const bad = { ...SUN, parts: [{ id: "x", shape: "hexagon" }, { id: "y", shape: "circle", cx: 1, cy: 1 }] };
  const errs = errorsOf(reelSpec([scene("El sol calienta.", { type: "dibujo", dibujo: bad })]));
  assert.ok(errs.some((e) => e.includes("scenes.0.visual.reel.dibujo.parts.0.shape") && /unknown drawing shape "hexagon"/.test(e)), errs.join("\n"));
  assert.ok(errs.some((e) => e.includes("scenes.0.visual.reel.dibujo.parts.1.r") && /circle needs `r`/.test(e)), errs.join("\n"));

  const motion = errorsOf(reelSpec([scene("El sol calienta.", { type: "dibujo", dibujo: { ...SUN, motion: ["moonwalk"] } })]));
  assert.ok(motion.some((e) => /unknown motion "moonwalk"/.test(e)), motion.join("\n"));

  const extra = errorsOf(reelSpec([scene("El sol calienta.", { type: "dibujo", dibujo: { ...SUN, wings: true } })]));
  assert.ok(extra.some((e) => e.includes("dibujo")), extra.join("\n"));
});

test("drawing word moments must be said in the scene's narration", () => {
  const d = { ...SUN, parts: SUN.parts.map((p) => (p.id === "ray" ? { ...p, at: "luna" } : p)) };
  const issues = reelsIssues(reelSpec([scene("El sol calienta.", { type: "dibujo", dibujo: d })]));
  assert.ok(issues.some((i) => i.path.join(".") === "scenes.0.visual.reel.dibujo.parts.2.at" && /"luna" is not in the narration/.test(i.message)), JSON.stringify(issues));
});

test("the dibujo scene uses 1 moment, or 2 with texto, and pops on its first", () => {
  const spec = {
    ...reelSpec([
      scene("El sol calienta la tierra cada día.", { type: "dibujo", dibujo: SUN, en: ["sol"] }),
      scene("Y la tierra *respira* y se calienta.", { type: "dibujo", dibujo: SUN, texto: "*Respira*", en: ["tierra", "respira"] }),
    ]),
    format: { width: 1080, height: 1920, fps: 30 },
    theme: { palette: defaultPalette("noche") },
    music: { volume: 0.1 },
    reels: {},
  };
  const plan = planReels(spec, computeReelsTimeline(spec.scenes, { fps: 30 }), []);
  assert.equal(plan.scenes[0].type, "drawing");
  assert.equal(plan.scenes[0].b.length, 1);
  assert.equal(plan.scenes[1].b.length, 2);
  assert.ok(plan.sounds.some((s) => s.at === plan.scenes[0].ini + plan.scenes[0].b[0]));
  assert.deepEqual(plan.warnings, []);
});

// ---------------------------------------------------------------- drawings as pieces (any icono slot)

test("any icono slot takes a drawing instead of an icon name", () => {
  const piece = { viewBox: "0 0 100 100", parts: [{ id: "c", shape: "circle", cx: 50, cy: 50, r: 40, fill: "accent" }], motion: ["bob"] };
  const spec = reelSpec([
    scene("Hola *mundo* redondo.", { type: "headline", texto: "Hola / *mundo*", icono: piece, en: ["mundo"] }),
    scene("Tres cosas: uno, dos y tres.", { type: "list", titulo: "Cosas", items: [{ texto: "Uno", icono: piece }, "Dos", { texto: "Tres", icono: "rocket" }] }),
    scene("Gato o perro, gana el gato.", { type: "compare", izquierda: { titulo: "Gato", icono: piece }, derecha: { titulo: "Perro", icono: "dog" }, ganador: "izquierda" }),
    scene("Comenta GATO y te lo mando.", { type: "cta", palabra: "GATO", iconos: [piece, "gift"] }),
  ]);
  assert.deepEqual(errorsOf(spec), []);
});

test("a broken drawing piece is rejected at its path; a non-drawing object in icono is rejected", () => {
  const broken = { parts: [{ id: "c", shape: "circle", cx: 50, cy: 50 }] };
  const errs = errorsOf(reelSpec([scene("Hola *mundo*.", { type: "headline", texto: "Hola", icono: broken })]));
  assert.ok(errs.some((e) => e.includes("scenes.0.visual.reel.icono.parts.0.r")), errs.join("\n"));
  const items = errorsOf(reelSpec([scene("Uno y dos.", { type: "list", items: [{ texto: "Uno", icono: broken }, "Dos"] })]));
  assert.ok(items.some((e) => e.includes("scenes.0.visual.reel.items.0.icono.parts.0.r")), items.join("\n"));
  const junk = errorsOf(reelSpec([scene("Hola *mundo*.", { type: "headline", texto: "Hola", icono: { nombre: "rocket" } })]));
  assert.ok(junk.some((e) => /icono/.test(e) && /icon name or a drawing/.test(e)), junk.join("\n"));
});

// ---------------------------------------------------------------- 2D fx in reels

test("visual.fx in reels validates against the 2D kit, targets the dibujo and its parts", () => {
  const ok = reelSpec([
    scene("El sol *calienta* la tierra.", { type: "dibujo", dibujo: SUN, en: ["sol"] }, { fx: [{ type: "burst", target: "sol/disc", at: "calienta" }, { type: "sparkles", target: "sol" }, { type: "zoom-punch", at: "calienta" }] }),
    scene("Hola *mundo*.", { type: "headline", texto: "Hola" }, { fx: [{ type: "confetti", at: 0.4 }, { type: "flash", at: "mundo" }] }),
  ]);
  assert.deepEqual(errorsOf(ok), []);

  const unknown = errorsOf(reelSpec([scene("El sol calienta.", { type: "dibujo", dibujo: SUN }, { fx: [{ type: "burst", target: "luna" }] })]));
  assert.ok(unknown.some((e) => e.includes("scenes.0.visual.fx.0.target") && /no drawing with id "luna"/.test(e) && /dibujo\.id/.test(e)), unknown.join("\n"));
  const part = errorsOf(reelSpec([scene("El sol calienta.", { type: "dibujo", dibujo: SUN }, { fx: [{ type: "burst", target: "sol/nose" }] })]));
  assert.ok(part.some((e) => /no part "nose" in drawing "sol"/.test(e)), part.join("\n"));
  const threeD = errorsOf(reelSpec([scene("Hola *mundo*.", { type: "headline", texto: "Hola" }, { fx: [{ type: "embers" }] })]));
  assert.ok(threeD.some((e) => e.includes("scenes.0.visual.fx")), threeD.join("\n"));
  const word = reelsIssues(reelSpec([scene("Hola *mundo*.", { type: "headline", texto: "Hola" }, { fx: [{ type: "flash", at: "adios" }] })]));
  assert.ok(word.some((i) => i.path.join(".") === "scenes.0.visual.fx.0.at" && /"adios" is not in the narration/.test(i.message)), JSON.stringify(word));
});

test("the plan carries each scene's fx and a moment map (scene-relative seconds) for drawings and fx", () => {
  const spec = {
    ...reelSpec([
      scene("Hola a todos.", { type: "headline", texto: "Hola" }),
      scene("El sol *calienta* la tierra.", { type: "dibujo", dibujo: SUN, en: ["sol"] }, { fx: [{ type: "burst", target: "sol/disc", at: "tierra" }] }),
    ]),
    format: { width: 1080, height: 1920, fps: 30 },
    theme: { palette: defaultPalette("noche") },
    music: { volume: 0.1 },
    reels: {},
  };
  const caps = [
    ["Hola", 0, 300], ["a", 300, 400], ["todos.", 400, 800],
    ["El", 1000, 1100], ["sol", 1100, 1400], ["calienta", 1400, 1900], ["la", 1900, 2000], ["tierra.", 2000, 2400],
  ].map(([text, startMs, endMs]) => ({ text, startMs, endMs, timestampMs: startMs, confidence: null }));
  const plan = planReels(spec, { scenes: [], totalFrames: 100 }, caps);
  const s = plan.scenes[1];
  assert.deepEqual(s.fx, [{ type: "burst", target: "sol/disc", at: "tierra" }]);
  // "calienta" is heard at 1.4 s, shown 4 frames early; relative to the scene start (its first frame)
  const rel = (ms) => Math.round(((Math.round((ms / 1000) * 30) - 4 - s.ini) / 30) * 1000) / 1000;
  assert.equal(s.momentos.calienta, rel(1400));
  assert.equal(s.momentos.tierra, rel(2000));
  assert.equal(plan.scenes[0].fx, undefined);
  assert.equal(plan.scenes[0].momentos, undefined);
  assert.deepEqual(plan.warnings, []);
});

// ---------------------------------------------------------------- examples and instructions

test("every reels example validates; reels-generative plans without warnings and uses drawings and fx", () => {
  for (const f of ["reels-nube", "reels-noche", "reels-menta", "reels-limon", "reels-pizarra", "reels-catalog", "reels-generative"]) {
    const spec = readJson(`../examples/${f}.spec.json`);
    assert.deepEqual(errorsOf(spec), [], f);
  }
  const gen = readJson("../examples/reels-generative.spec.json");
  assert.equal(gen.language, "es");
  assert.ok(gen.scenes.length >= 8 && gen.scenes.length <= 10);
  const drawn = gen.scenes.filter((s) => sceneTypeOf(s.visual.reel) === "drawing" || JSON.stringify(s.visual.reel).includes('"parts"'));
  assert.ok(drawn.length >= Math.ceil(gen.scenes.length / 3), `${drawn.length} drawn scenes`);
  const fxTypes = new Set(gen.scenes.flatMap((s) => (s.visual.fx ?? []).map((f) => f.type)));
  assert.ok(fxTypes.size >= 5, [...fxTypes].join(","));
  const full = { ...gen, format: { width: 1080, height: 1920, fps: 30 }, theme: { palette: defaultPalette(gen.template.slice(6)) }, music: { volume: 0.1 }, reels: gen.reels ?? {} };
  const plan = planReels(full, computeReelsTimeline(full.scenes, { fps: 30 }), []);
  assert.deepEqual(plan.warnings, []);
});

const FULL = readFileSync(new URL("../prompts/spec-writer.md", import.meta.url), "utf8");

test("## Creative mode: reels goes only to reels templates on the subscription path, and stays compact", () => {
  assert.ok(FULL.includes("## Creative mode: reels"));
  const creative = specWriterPromptFor("reels-limon", FULL, { creative: true });
  assert.ok(creative.includes("## Creative mode: reels"));
  assert.ok(!creative.includes("## Creative mode: 2D") && !creative.includes("## Creative mode: pixel") && !creative.includes("## Creative mode: 3D"));
  assert.ok(!specWriterPromptFor("reels-limon", FULL).includes("## Creative mode: reels"), "API prompt must stay catalog-first");
  for (const id of ["watercolor", "captions-voice", "pixel-dusk", "moody-night"]) assert.ok(!specWriterPromptFor(id, FULL, { creative: true }).includes("## Creative mode: reels"), id);
  const start = FULL.indexOf("## Creative mode: reels");
  const end = FULL.indexOf("\n## ", start + 5);
  const section = FULL.slice(start, end === -1 ? undefined : end);
  assert.ok(Buffer.byteLength(section) < 6144, `${Buffer.byteLength(section)} bytes`);
  for (const k of ["dibujo", "fx", "reels-stills.mjs", "0.6"]) assert.ok(section.includes(k), `section lacks ${k}`);
  // the catalog sections mention the new fields in at most one short line
  const reels = FULL.slice(FULL.indexOf("## Reels templates"), start > FULL.indexOf("## Reels templates") ? start : undefined);
  assert.ok(reels.split("\n").filter((l) => /dibujo|visual\.fx/.test(l)).length <= 2, "Reels templates section stays catalog-first");
});
