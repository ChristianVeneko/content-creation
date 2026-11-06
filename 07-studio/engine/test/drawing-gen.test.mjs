// Drawing generators (lib/drawing-gen.mjs), the part fields they rely on (blur, blend, texture), backdrop layers with
// `gen`, and the data-atlas documentary example that is built with them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GEN_KINDS, expandGen, expandLayer, mapPoint, projectLL, projectRing } from "../lib/drawing-gen.mjs";
import { DRAW_BLENDS, DRAW_TEXTURES, MAX_BACKDROP_PARTS, MAX_BACKDROP_PATH_CHARS, drawPartSchema, drawingIssues } from "../lib/drawing.mjs";
import { elementSchema } from "../lib/illustration-schema.mjs";
import { LAND } from "../lib/globe-data.mjs";
import { validateSpec, resolveSpec } from "../lib/spec.mjs";
import { getTemplate } from "../lib/templates.mjs";
import { planIllustration } from "../lib/illustrated.mjs";
import { computeTimeline, syntheticCaptions } from "../lib/timeline.mjs";

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const backdropOf = (layers) => ({ type: "backdrop", layers });

test("every generator expands to valid parts inside the backdrop budget, deterministically", () => {
  assert.ok(GEN_KINDS.length >= 8);
  for (const kind of GEN_KINDS) {
    const a = expandGen({ kind });
    assert.ok(a.length >= 1, kind);
    for (const p of a) assert.equal(drawPartSchema.safeParse(p).success, true, `${kind}/${p.id}: ${JSON.stringify(drawPartSchema.safeParse(p).error?.issues)}`);
    assert.deepEqual(drawingIssues({ parts: a }, { pathChars: MAX_BACKDROP_PATH_CHARS }), [], kind);
    assert.ok(a.length <= MAX_BACKDROP_PARTS, `${kind} has ${a.length} parts`);
    assert.deepEqual(expandGen({ kind }), a, `${kind} is deterministic`);
    assert.equal(new Set(a.map((p) => p.id)).size, a.length, `${kind} ids are unique`);
  }
  for (const kind of ["starfield", "terrain", "grain-field", "water"]) assert.notDeepEqual(expandGen({ kind, seed: 1 }), expandGen({ kind, seed: 2 }), `${kind} varies with the seed`);
});

test("globe: continents are real silhouettes that appear or hide with the view, pins and arcs follow the sphere", () => {
  const ids = (g) => expandGen({ kind: "globe", ...g }).map((p) => p.id);
  const america = ids({ lon: -98, lat: 28 });
  assert.ok(america.includes("globe-north-america") && america.includes("globe-south-america"));
  assert.ok(!america.includes("globe-australia"), "the far side is not drawn");
  const asia = ids({ lon: 100, lat: 20 });
  assert.ok(asia.includes("globe-eurasia") && asia.includes("globe-australia") && !asia.includes("globe-south-america"));
  // orthographic geometry: the view center projects to the sphere center, the antipode is behind
  assert.deepEqual([projectLL(10, 20, 10, 20).x, projectLL(10, 20, 10, 20).y].map((v) => Math.round(v * 1e6) / 1e6 + 0), [0, 0]);
  assert.ok(projectLL(190, -20, 10, 20).z < 0);
  // far-side points slide onto the limb: every projected point stays within the sphere
  const ring = projectRing(LAND.eurasia, -98, 28, 270, 430, 230);
  for (const [x, y] of ring) assert.ok(Math.hypot(x - 270, y - 430) <= 230.001);
  assert.equal(projectRing(LAND.australia, -98, 28, 270, 430, 230), null);
  const parts = expandGen({ kind: "globe", lon: -98, lat: 28, pins: [{ at: "new-york" }, { at: "sydney" }], arcs: [{ from: "new-york", to: "san-francisco", at: 0.5 }] });
  assert.ok(parts.some((p) => p.id === "globe-pin0") && !parts.some((p) => p.id === "globe-pin1"), "a pin on the far side is skipped");
  const arc = parts.find((p) => p.id === "globe-arc0");
  assert.equal(arc.draw, true);
  assert.equal(arc.at, 0.5);
  const tinted = expandGen({ kind: "globe", tint: { "north-america": "#D9A441" } }).find((p) => p.id === "globe-north-america");
  assert.deepEqual(tinted.fill.gradient, ["#D9A441", "#D9A441"]);
});

test("map positions: mapPoint places lon/lat in the box and place names resolve", () => {
  const g = { box: [0, 0, 100, 100], lon: [-10, 10], lat: [-10, 10] };
  assert.deepEqual(mapPoint(g, [0, 0]), [50, 50]);
  assert.deepEqual(mapPoint(g, [-10, 10]), [0, 0]);
  assert.deepEqual(mapPoint({ ...g, lon: [-130, -60], lat: [20, 60] }, "omaha").map((v) => v > 0 && v < 100), [true, true]);
});

test("generator params are validated: unknown kinds, bad ranges and unknown landmasses are rejected", () => {
  const layer = (gen) => backdropOf([{ gen }]);
  const ok = (gen) => assert.equal(elementSchema.safeParse(layer(gen)).success, true, JSON.stringify(elementSchema.safeParse(layer(gen)).error?.issues));
  const bad = (gen) => assert.equal(elementSchema.safeParse(layer(gen)).success, false);
  ok([{ kind: "starfield", count: 200 }, { kind: "globe", lon: -90, tint: { africa: "bad" }, pins: [{ at: "paris" }] }]);
  bad([{ kind: "volcano" }]);
  bad([{ kind: "starfield", count: 5 }]);
  bad([{ kind: "globe", tint: { atlantis: "#FFFFFF" } }]);
  bad([{ kind: "globe", pins: [{ at: "atlantis" }] }]);
  bad([{ kind: "starfield", color: "chartreuse" }]);
  assert.equal(elementSchema.safeParse(backdropOf([{}])).success, false, "a layer needs parts or gen");
});

test("backdrop layers: own parts up to the backdrop budget, generated parts under (or over) them, plain drawings keep the small budget", () => {
  const part = (i) => ({ id: `p${i}`, shape: "circle", cx: i, cy: 10, r: 2, fill: "accent" });
  const many = (n) => Array.from({ length: n }, (_, i) => part(i));
  assert.equal(elementSchema.safeParse(backdropOf([{ parts: many(MAX_BACKDROP_PARTS) }])).success, true);
  assert.equal(elementSchema.safeParse(backdropOf([{ parts: many(MAX_BACKDROP_PARTS + 1) }])).success, false);
  assert.equal(elementSchema.safeParse({ type: "drawing", parts: many(61) }).success, false, "the drawing element keeps its 60-part cap");
  const mixed = expandLayer({ gen: [{ kind: "sky", id: "bg" }, { kind: "starfield", id: "top", over: true }], parts: [part(1)] });
  const order = mixed.parts.map((p) => p.id);
  assert.ok(order.indexOf("bg-sky") < order.indexOf("p1") && order.indexOf("p1") < order.indexOf("top-st0"));
  assert.deepEqual(expandLayer({ parts: [part(1)] }).parts, [part(1)], "a layer without gen is unchanged");
  const heavy = backdropOf([{ parts: [{ id: "a", shape: "path", d: "M0 0" + "L1 1".repeat(3900), fill: "accent" }, { id: "b", shape: "path", d: "M0 0" + "L1 1".repeat(3900), fill: "accent" }, { id: "c", shape: "path", d: "M0 0" + "L1 1".repeat(3900), fill: "accent" }, { id: "d", shape: "path", d: "M0 0" + "L1 1".repeat(3900), fill: "accent" }].concat(Array.from({ length: 9 }, (_, i) => ({ id: `e${i}`, shape: "path", d: "M0 0" + "L1 1".repeat(3900), fill: "accent" }))) }]);
  assert.equal(elementSchema.safeParse(heavy).success, false, "the backdrop path budget still applies");
});

test("part fields blur, blend and texture are validated and optional", () => {
  const p = (o) => drawPartSchema.safeParse({ id: "a", shape: "circle", cx: 1, cy: 1, r: 4, ...o }).success;
  assert.ok(p({}));
  assert.ok(p({ blur: 12, blend: "screen", texture: "mottle" }));
  for (const t of DRAW_TEXTURES) assert.ok(p({ texture: t }), t);
  for (const b of DRAW_BLENDS) assert.ok(p({ blend: b }), b);
  assert.ok(!p({ texture: "glitter" }) && !p({ blend: "difference" }) && !p({ blur: 90 }) && !p({ blur: -1 }));
});

test("data-atlas-documentary example: validates, 14-18 scenes, no empty frame, per-scene looks, plans like the format says", () => {
  const raw = JSON.parse(read("../examples/data-atlas-documentary.spec.json"));
  const v = validateSpec(raw);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.equal(raw.template, "data-atlas");
  assert.equal(raw.language, "es");
  assert.ok(raw.scenes.length >= 14 && raw.scenes.length <= 18);
  const glows = new Set();
  for (const s of raw.scenes) {
    const els = s.visual.elements;
    const bd = els.find((e) => e.type === "backdrop");
    assert.ok(bd, `${s.id} has a backdrop (no empty frame)`);
    assert.ok(bd.layers.length >= 2 || bd.layers[0].gen?.length, `${s.id} is layered`);
    glows.add(bd.glow);
    // a map scene (particles, route) always sits on a drawn map
    if (els.some((e) => e.type === "particle-field" || e.type === "route")) assert.ok(bd.layers.some((l) => (l.gen ?? []).some((g) => g.kind === "map")), `${s.id} draws its map`);
  }
  assert.ok(glows.size >= 6, `per-scene glow variation, got ${glows.size}`);
  const kinds = new Set(raw.scenes.flatMap((s) => s.visual.elements.filter((e) => e.type === "backdrop").flatMap((e) => e.layers.flatMap((l) => (l.gen ?? []).map((g) => g.kind)))));
  for (const k of ["globe", "starfield", "terrain", "rails", "grain-field", "water", "sky", "surface", "map"]) assert.ok(kinds.has(k), `the example uses ${k}`);
  const spec = resolveSpec(v.spec, getTemplate("data-atlas"));
  const timeline = computeTimeline(spec.scenes, { fps: spec.format.fps });
  const plan = planIllustration(spec, timeline, syntheticCaptions(spec.scenes, timeline));
  assert.equal(plan.length, raw.scenes.length);
  const secs = timeline.totalFrames / spec.format.fps;
  assert.ok(secs >= 40 && secs <= 62, `about 50 s, got ${secs.toFixed(1)}`);
});
