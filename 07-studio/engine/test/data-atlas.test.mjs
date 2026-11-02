// data-atlas (2D format, 2.5D mode): the look, its template and example, the new elements (backdrop, counter-pill,
// particle-field, route, ledger), the pure helpers behind them and the guarantee that older formats plan as before.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate } from "../lib/templates.mjs";
import { TEMPLATE_IDS, resolveSpec, validateSpec } from "../lib/spec.mjs";
import { specWriterPromptFor } from "../lib/spec-writer-prompt.mjs";
import {
  DEPTH_LAYERS,
  FORMAT_2D_LOOKS,
  ILLUSTRATED_TEMPLATE_IDS,
  LOOKS,
  LOOK_DEPTH,
  LOOK_UPSCALE,
  REGIONS,
  SLOT_TYPES,
  computeBeats,
  formatCount,
  layerMotion,
  lookOf,
  measure,
  planScene,
  routePointAt,
  routeSamples,
  staggerTimes,
} from "../lib/illustrated.mjs";
import { ELEMENT_TYPES, elementSchema, elementsSchema } from "../lib/illustration-schema.mjs";
import { sceneMomentStrings2d, hasDrawing2d } from "../lib/drawing.mjs";

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const example = (id) => JSON.parse(read(`../examples/${id}.spec.json`));
const lum = (hex) => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const ok = (el) => assert.equal(elementSchema.safeParse(el).success, true, JSON.stringify(elementSchema.safeParse(el).error?.issues));
const bad = (el, re) => {
  const r = elementSchema.safeParse(el);
  assert.equal(r.success, false, "should be rejected");
  if (re) assert.match(JSON.stringify(r.error.issues), re);
};
const layer = (depth = "subject") => ({ depth, parts: [{ id: "a", shape: "circle", cx: 100, cy: 100, r: 40, fill: "accent" }] });

test("data-atlas is a format look registered where every look must be", () => {
  assert.equal(FORMAT_2D_LOOKS.at(-1), "data-atlas", "appended after the existing formats");
  assert.ok(LOOKS.includes("data-atlas"));
  assert.ok(ILLUSTRATED_TEMPLATE_IDS.includes("data-atlas"));
  assert.ok(TEMPLATE_IDS.includes("data-atlas"));
  assert.ok(TEMPLATE_IDS.indexOf("data-atlas") < TEMPLATE_IDS.indexOf("clay-diorama"), "before the 3D looks");
  assert.ok(LOOK_UPSCALE["data-atlas"] >= 1);
  assert.ok(LOOK_DEPTH["data-atlas"]);
});

test("the data-atlas template describes a FORMAT with a dark cinematic palette and top captions", () => {
  const t = getTemplate("data-atlas");
  for (const k of ["id", "name", "description", "prompt_hint", "best_for", "preview", "defaults", "format"]) assert.ok(t[k], `missing ${k}`);
  assert.equal(t.format, "data-atlas");
  assert.equal(t.category, "illustrated-2d");
  assert.equal(t.defaults.theme.look, "data-atlas");
  assert.ok(t.defaults.theme.palette.bg.every((c) => lum(c) < 0.06), "dark cinematic background");
  assert.equal(t.defaults.captions.position, "top");
  assert.match(t.prompt_hint, /draw|dibuja/i);
  assert.match(t.prompt_hint, /2\.5D/);
  assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(JSON.stringify(t)), "no emoji");
  const spec = resolveSpec({ version: 1, title: "x", template: "data-atlas", scenes: [{ id: "a", narration: "x", visual: { type: "gradient" } }] }, t);
  assert.equal(lookOf(spec), "data-atlas");
});

test("slot elements take no room in the column and the backdrop does not delay the auto-staggered entrances", () => {
  for (const type of ["backdrop", "counter-pill", "particle-field", "route"]) assert.ok(SLOT_TYPES.includes(type), type);
  assert.ok(!SLOT_TYPES.includes("ledger"), "the ledger is a column element");
  const ledger = { type: "ledger", rows: [{ label: "Uno", value: "1" }] };
  const slots = [
    { type: "backdrop", layers: [layer()] },
    { type: "counter-pill", value: 5 },
    { type: "route", points: [[10, 10], [90, 90]] },
  ];
  const alone = planScene([ledger], 6);
  const withSlots = planScene([...slots, ledger], 6);
  assert.equal(withSlots.stackH, alone.stackH);
  assert.equal(withSlots.offsetY, alone.offsetY);
  const t = staggerTimes([{ type: "backdrop" }, { type: "card" }, { type: "card" }], 8);
  const base = staggerTimes([{ type: "card" }, { type: "card" }], 8);
  assert.equal(t[0], 0, "the backdrop is on from the first frame");
  assert.deepEqual(t.slice(1), base, "the other elements stagger as if it was not there");
});

test("backdrop: 1-5 agent-drawn depth layers, a mode flag for flat or 2.5D", () => {
  ok({ type: "backdrop", layers: [layer("far"), layer("mid"), layer("subject"), layer("near")] });
  ok({ type: "backdrop", mode: "flat", layers: [layer()] });
  ok({ type: "backdrop", glow: "accent2", haze: 0.6, layers: [{ ...layer(), viewBox: "0 0 540 960" }] });
  bad({ type: "backdrop", layers: [] });
  bad({ type: "backdrop", layers: Array.from({ length: 6 }, () => layer()) }, /at most 5|too_big/i);
  bad({ type: "backdrop", layers: [layer("sky")] });
  bad({ type: "backdrop", mode: "3d", layers: [layer()] });
  bad({ type: "backdrop", layers: [{ depth: "mid", parts: [{ id: "a", shape: "circle", cx: 1, cy: 1, fill: "accent" }] }] }, /needs `r`/);
  bad({ type: "backdrop", layers: [{ depth: "mid", parts: [{ id: "a", shape: "rect", w: 1, h: 1 }, { id: "a", shape: "rect", w: 1, h: 1 }] }] }, /duplicate part id/);
  assert.ok(ELEMENT_TYPES.includes("backdrop"));
});

test("backdrop layers join the drawing word moments", () => {
  const visual = { type: "illustration", elements: [{ type: "backdrop", layers: [{ depth: "subject", parts: [{ id: "a", shape: "circle", cx: 1, cy: 1, r: 4, at: "word:rojo" }] }] }] };
  assert.equal(hasDrawing2d(visual), true);
  assert.deepEqual(sceneMomentStrings2d(visual), ["word:rojo"]);
});

test("layerMotion: 2.5D layers drift at different speeds, blur far and near; flat is a single picture", () => {
  const speeds = ["far", "mid", "subject", "near"].map((d) => DEPTH_LAYERS[d].speed);
  assert.deepEqual([...speeds].sort((a, b) => a - b), speeds, "far to near gets faster");
  assert.equal(new Set(speeds).size, 4);
  const at = (mode, depth, p) => layerMotion(depth, mode, p, 1);
  for (const d of ["far", "mid", "subject", "near"]) {
    const a = at("2.5d", d, 0);
    const b = at("2.5d", d, 1);
    assert.ok(Math.abs(a.dx - b.dx) > 0, `${d} drifts`);
    assert.ok(b.scale > a.scale, `${d} dollies in`);
    const f = at("flat", d, 0.5);
    assert.equal(f.dx, 0, "flat: no parallax");
    assert.equal(f.blur, 0, "flat: no blur");
    assert.equal(f.scale, at("flat", "far", 0.5).scale, "flat: every layer pushes in together");
  }
  const travel = (d) => Math.abs(at("2.5d", d, 0).dx - at("2.5d", d, 1).dx);
  assert.ok(travel("far") < travel("mid") && travel("mid") < travel("subject") && travel("subject") < travel("near"));
  assert.ok(at("2.5d", "far", 0.5).blur > 0 && at("2.5d", "near", 0.5).blur > 0, "depth of field on far and near");
  assert.equal(at("2.5d", "subject", 0.5).blur, 0, "the subject stays sharp");
  // every layer is oversized enough to cover its own drift at both ends
  for (const d of ["far", "mid", "subject", "near"]) {
    const m = at("2.5d", d, 0);
    assert.ok(540 * (m.scale - 1) >= Math.abs(m.dx), `${d}: no empty edge at the start`);
  }
  assert.equal(layerMotion("near", "2.5d", 0.25, -1).dx, -layerMotion("near", "2.5d", 0.25, 1).dx, "the scene direction flips the drift");
});

test("counter-pill: a number that counts up inside a dark rounded pill", () => {
  ok({ type: "counter-pill", value: 6056296 });
  ok({ type: "counter-pill", value: 10000000, from: 6056296, label: "personas", prefix: "~", suffix: " M", decimals: 1 });
  bad({ type: "counter-pill" });
  bad({ type: "counter-pill", value: 1, decimals: 4 });
  bad({ type: "counter-pill", value: 1, label: "x".repeat(30) });
  assert.equal(measure({ type: "counter-pill", value: 1 }, 900), 0, "a slot, no column height");
});

test("formatCount groups thousands like the video language", () => {
  assert.equal(formatCount(6056296, 0, "es"), "6.056.296");
  assert.equal(formatCount(6056296, 0, "en"), "6,056,296");
  assert.equal(formatCount(1234.5, 1, "es-MX"), "1,234.5", "Mexican Spanish groups with commas");
  assert.equal(formatCount(1234.5, 1, "es-ES"), "1.234,5");
  assert.equal(formatCount(1234.5, 1, "en-US"), "1,234.5");
  assert.equal(formatCount(999, 0, "es"), "999");
  assert.equal(formatCount(-12000, 0, "es"), "-12.000");
  assert.equal(formatCount(0, 0, "es"), "0");
});

test("particle-field: points that fill a map, with a start and end density and an optional cluster", () => {
  ok({ type: "particle-field" });
  ok({ type: "particle-field", count: 300, from: 0.1, to: 1, color: "accent2", cluster: [70, 40], flow: true });
  bad({ type: "particle-field", count: 5 });
  bad({ type: "particle-field", count: 5000 });
  bad({ type: "particle-field", from: 1.5 });
  bad({ type: "particle-field", cluster: [120, 10] });
  assert.equal(measure({ type: "particle-field" }, 900), 0);
});

test("route: a glowing line over the frame that draws itself", () => {
  ok({ type: "route", points: [[10, 70], [40, 55], [90, 30]] });
  ok({ type: "route", points: [[10, 70], [90, 30]], color: "accent2", flow: true, dashed: true, label: "destino", endpoints: false });
  bad({ type: "route", points: [[10, 70]] });
  bad({ type: "route", points: [[10, 70], [140, 30]] });
  bad({ type: "route", points: Array.from({ length: 9 }, (_, i) => [i * 10, i * 10]) });
  const s = routeSamples([[0, 0], [50, 50], [100, 0]]);
  assert.equal(s.pts[0][0], 0);
  assert.deepEqual(s.pts.at(-1), [100, 0]);
  assert.ok(s.len.every((v, i) => i === 0 || v >= s.len[i - 1]), "cumulative length never decreases");
  assert.equal(s.total, s.len.at(-1));
  assert.deepEqual(routePointAt(s, 0), s.pts[0]);
  assert.deepEqual(routePointAt(s, 1), s.pts.at(-1));
  const mid = routePointAt(s, 0.5);
  assert.ok(Math.abs(mid[0] - 50) < 6, `half way is near the bend: ${mid}`);
  assert.equal(measure({ type: "route", points: [[0, 0], [1, 1]] }, 900), 0);
});

test("ledger: a paper table with a red underlined total, in parchment or blueprint", () => {
  ok({ type: "ledger", rows: [{ label: "Norte", value: "4.000" }] });
  ok({ type: "ledger", paper: "blueprint", tilt: -3, title: "Registro", columns: ["Zona", "Cifra"], rows: [{ label: "Norte", value: "4.000" }, { label: "Sur", value: "58.000" }], total: { label: "Total", value: "62.000" }, underline: true });
  bad({ type: "ledger", rows: [] });
  bad({ type: "ledger", rows: Array.from({ length: 9 }, () => ({ label: "a", value: "1" })) });
  bad({ type: "ledger", paper: "linen", rows: [{ label: "a", value: "1" }] });
  bad({ type: "ledger", tilt: 20, rows: [{ label: "a", value: "1" }] });
  const rows = (n) => Array.from({ length: n }, () => ({ label: "a", value: "1" }));
  const h = (n, extra = {}) => measure({ type: "ledger", rows: rows(n), ...extra }, 900);
  assert.ok(h(1) > 0 && h(4) > h(1) && h(8) > h(4));
  assert.ok(h(3, { total: { label: "T", value: "9" } }) > h(3));
  // the tallest ledger is scaled down to fit the stage
  const tall = planScene([{ type: "ledger", title: "T", columns: ["a", "b"], rows: rows(8), total: { label: "T", value: "9" } }], 6, { maxUpscale: LOOK_UPSCALE["data-atlas"] });
  assert.ok(tall.offsetY + tall.stackH * tall.scale <= REGIONS.stage.h + 0.5);
});

test("elements pace the sound beats: the backdrop and the particles are silent, the route draws, the ledger turns a page", () => {
  const spec = example("data-atlas");
  const scene = spec.scenes.find((s) => s.visual.elements.some((e) => e.type === "ledger"));
  const plan = [planScene(scene.visual.elements, 6)];
  const tl = { transitionFrames: 12, scenes: [{ from: 0, durationInFrames: 180 }] };
  const kinds = computeBeats(plan, tl, 30).map((b) => b.kind);
  assert.ok(kinds.includes("page"));
  const lone = planScene([{ type: "backdrop", layers: [layer()] }, { type: "particle-field" }], 6);
  const loneKinds = computeBeats([lone], tl, 30).map((b) => b.kind);
  assert.deepEqual(loneKinds.filter((k) => k !== "title"), [], "no beats from silent slots");
});

test("the data-atlas example validates, has 6 Spanish scenes and shows the whole format vocabulary", () => {
  const raw = example("data-atlas");
  assert.equal(raw.template, "data-atlas");
  assert.equal(raw.language, "es");
  assert.equal(raw.scenes.length, 6);
  assert.ok(raw.voice === undefined || ["none", "kokoro"].includes(raw.voice.provider), "voice comes from the template unless set");
  assert.equal(raw.theme, undefined, "the template brings its own palette");
  const r = validateSpec(raw);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.ok(r.spec.scenes.every((s) => s.visual.type === "illustration"));
  const types = new Set(r.spec.scenes.flatMap((s) => s.visual.elements.map((e) => e.type)));
  for (const t of ["backdrop", "counter-pill", "particle-field", "route", "ledger"]) assert.ok(types.has(t), `uses ${t}`);
  const modes = new Set(r.spec.scenes.flatMap((s) => s.visual.elements.filter((e) => e.type === "backdrop").map((e) => e.mode ?? "2.5d")));
  assert.deepEqual([...modes], ["2.5d"], "the example plays in the 2.5D mode");
  for (const s of r.spec.scenes) {
    const backdrop = s.visual.elements.find((e) => e.type === "backdrop");
    assert.ok(backdrop, `${s.id}: every scene has a backdrop`);
    const depths = backdrop.layers.map((l) => l.depth);
    assert.ok(backdrop.layers.length >= 3 && backdrop.layers.length <= 5, `${s.id}: 3-5 layers`);
    assert.ok(depths.includes("far") && depths.includes("subject"), `${s.id}: far and subject layers`);
    const p = planScene(s.visual.elements, 6, { maxUpscale: LOOK_UPSCALE["data-atlas"] });
    assert.ok(p.offsetY + p.stackH * p.scale <= REGIONS.stage.h + 0.5, `${s.id}: too tall`);
  }
  assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(JSON.stringify(raw)), "no emoji");
});

test("every element of the example draws from palette roles or computed neutrals, never a bare palette hex", () => {
  const raw = example("data-atlas");
  const hexes = JSON.stringify(raw).match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  // computed neutrals (black, white, paper tones) may stay; saturated brand-like colors must come from roles
  const neutral = (h) => {
    const n = parseInt(h.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    return Math.max(r, g, b) - Math.min(r, g, b) < 60;
  };
  assert.ok(hexes.every(neutral), `non-neutral hex in the example: ${hexes.filter((h) => !neutral(h)).join(", ")}`);
});

test("the spec-writer manual documents data-atlas, its elements and the 2.5D mode", () => {
  const full = read("../prompts/spec-writer.md");
  const p = specWriterPromptFor("data-atlas", full);
  for (const word of ["data-atlas", "backdrop", "counter-pill", "particle-field", "route", "ledger", "2.5D", "far", "near", "flat"]) assert.ok(p.includes(word), `manual mentions ${word}`);
  const other = specWriterPromptFor("whiteboard", full);
  assert.ok(!other.includes("counter-pill"), "other looks do not get the data-atlas section");
});

test("older formats plan exactly as before (flat-depth and ui-cards)", () => {
  const pin = {
    "flat-depth": ["08162624e0", "c56e306cd3", "be06119c16", "4af595451c", "bdf101a6a5", "074e6fc372", "4023a870cb", "fb7b3e691f", "727252d95b"],
    "ui-cards": ["c1e84eb801", "19fc5e452f", "b573421507", "473c94b296", "07b5feebd5", "c9232c48fa", "d2da3f0f9b", "b10130c471", "6681bc1e72", "8eaba64456"],
  };
  for (const [id, hashes] of Object.entries(pin)) {
    const spec = example(id);
    const got = spec.scenes.map((s) => createHash("sha1").update(JSON.stringify(planScene(s.visual.elements, 5, { maxUpscale: LOOK_UPSCALE[id] }))).digest("hex").slice(0, 10));
    assert.deepEqual(got, hashes, `${id} plan changed`);
  }
  assert.equal(elementsSchema.safeParse([{ type: "stat", value: "+50 %" }]).success, true);
  assert.deepEqual(staggerTimes([{ type: "card" }, { type: "card" }, { type: "card" }], 9), [0.55, 3.75, 6.95]);
});
