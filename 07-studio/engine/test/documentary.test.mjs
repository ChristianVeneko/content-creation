// documentary-3d: the data-documentary template (dark cinematic gallery stage), its set-piece builders, the counter overlay and the
// "El clavo de oro" acceptance example.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate, listTemplates } from "../lib/templates.mjs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { computeTimeline } from "../lib/timeline.mjs";
import { THREE_D_TEMPLATE_IDS, counterValueAt, formatCounter, planThree } from "../lib/scene3d.mjs";
import { BUILDER_NAMES, LAND, runBuilder } from "../lib/scene3d-builders.mjs";
import { MAX_PARTS, MAX_WORLD_EXPANDED, overlaySchema } from "../lib/scene3d-motion.mjs";

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const read = (rel) => JSON.parse(readFileSync(here(rel), "utf8"));
const NEW = ["globe", "train", "rail-track", "dome-building", "aircraft", "ledger", "blueprint-sheet", "desk-wood", "wheat-field", "bowl", "cracked-ground", "particle-map"];
const parts = (name, params = {}, seed = 1) => runBuilder(name, params, { seed }).parts;

test("the documentary builders are registered, deterministic by seed, unique ids, within the caps", () => {
  for (const n of NEW) {
    assert.ok(BUILDER_NAMES.includes(n), `missing ${n}`);
    const a = runBuilder(n, {}, { seed: 4 });
    assert.deepEqual(a, runBuilder(n, {}, { seed: 4 }), `${n} not deterministic`);
    const ids = a.parts.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, `${n} duplicate ids`);
    assert.ok(ids.length <= MAX_PARTS, `${n} ${ids.length} parts`);
    for (const p of a.parts) if (p.parent !== undefined) assert.ok(ids.includes(p.parent), `${n}/${p.id} parent`);
  }
});

test("globe: continent tiles from the built-in data, an eight-segment route with a traveler, pins, night side", () => {
  assert.ok(Object.keys(LAND).length >= 6);
  const p = parts("globe");
  assert.ok(p.filter((x) => x.id.startsWith("land")).length >= 40, "land tiles");
  assert.equal(p.filter((x) => /^route-\d$/.test(x.id)).length, 8);
  assert.ok(p.some((x) => x.id === "traveler") && p.some((x) => x.id === "pin-0") && p.some((x) => x.id === "night" && x.shape === "lathe"));
  assert.ok(!parts("globe", { route: [], night: false, pins: [] }).some((x) => x.id.startsWith("route") || x.id === "night"));
  assert.notDeepEqual(parts("globe", { regions: ["africa"] }), p, "regions change the continents");
});

test("train: wheels that turn, a steam group, lit windows, a consist of N carriages and optional rails", () => {
  const t = parts("train", { carriages: 4 });
  const wheels = t.filter((x) => /^wheel-\d$/.test(x.id));
  assert.equal(wheels.length, 6);
  assert.ok(wheels.every((w) => w.motion?.[0]?.type === "spin" && w.motion[0].axis === "x"));
  assert.equal(t.filter((x) => x.id === "coach" || x.id.startsWith("coach~") || /^coach-\d+$/.test(x.id)).length, 4);
  assert.ok(t.some((x) => x.id === "steam") && t.filter((x) => x.id.startsWith("puff")).length === 3);
  assert.ok(t.some((x) => x.id === "headlamp" && x.material === "emissive"));
  assert.ok(!parts("train", { drive: false }).some((x) => x.motion));
  assert.ok(parts("train").some((x) => x.id.startsWith("sleeper")) && !parts("train", { rails: false }).some((x) => x.id.startsWith("sleeper")));
  assert.ok(parts("train", { carriages: 0, puffs: 0 }).length < t.length);
});

test("scatter and flat set pieces: wheat sways, ledger text fits, particle map stays inside its landmass", () => {
  const w = runBuilder("wheat-field", { count: 100 }, { seed: 1 });
  assert.equal(w.scatterMany.length, 1);
  assert.ok(w.parts.every((x) => x.motion?.[0]?.type === "wobble") && w.scatterMany[0].count === 100);
  assert.ok(!runBuilder("wheat-field", { wind: 0 }).parts.some((x) => x.motion));
  const l = parts("ledger", { rows: [["Alfa", "1"], ["Beta", "2"]], total: [], underline: 1 });
  assert.ok(l.filter((x) => x.shape === "sign").every((x) => x.text.length <= 24 && x.textColor));
  assert.equal(l.filter((x) => x.id.startsWith("underline")).length, 1);
  assert.equal(parts("ledger", { total: [] }).filter((x) => x.id.startsWith("underline")).length, 0);
  const m = parts("particle-map", { region: "africa", particles: 60 });
  assert.equal(m.filter((x) => x.id.startsWith("dot")).length, 60);
  assert.equal(m.filter((x) => /^route-\d$/.test(x.id)).length, 8);
  assert.ok(m.some((x) => x.id === "land" && x.shape === "extrude" && x.points.length <= 64));
});

test("set pieces: blueprint ink lines to reveal, aircraft props, dome lit windows, cracked ground and bowl", () => {
  assert.ok(parts("blueprint-sheet", { drawing: "locomotive" }).filter((x) => x.id.startsWith("ink")).length >= 8);
  assert.equal(parts("blueprint-sheet", { drawing: "none" }).filter((x) => x.id.startsWith("ink")).length, 0);
  const a = parts("aircraft");
  assert.equal(a.filter((x) => /^prop-\d$/.test(x.id)).length, 4);
  assert.ok(a.filter((x) => x.id.startsWith("nav") || x.id === "strobe").length >= 3);
  assert.equal(parts("aircraft", { engines: 2 }).filter((x) => /^prop-\d$/.test(x.id)).length, 2);
  assert.ok(parts("dome-building").filter((x) => x.id.startsWith("win") && x.material === "emissive").length >= 12);
  assert.equal(parts("dome-building", { lit: false }).filter((x) => x.material === "emissive").length, 0);
  assert.ok(parts("cracked-ground", { plates: 20 }).filter((x) => x.id.startsWith("plate")).length === 20);
  assert.ok(parts("bowl").some((x) => x.shape === "lathe") && parts("bowl", { grain: 5 }).filter((x) => x.id.startsWith("kernel")).length === 5);
  assert.ok(parts("desk-wood").some((x) => x.id === "bulb") && !parts("desk-wood", { props: false }).some((x) => x.id === "bulb"));
});

test("ship, mountain and sun gain night options without changing their defaults", () => {
  assert.ok(parts("ship", { lights: true }).some((x) => x.id.startsWith("porthole")));
  assert.ok(!parts("ship").some((x) => x.id.startsWith("porthole") || x.id === "lantern"));
  assert.ok(parts("mountain", { rim: "#FFB38A" }).some((x) => x.material === "emissive"));
  assert.ok(parts("sun", { corona: true }).filter((x) => x.id.startsWith("corona")).length === 2);
  assert.equal(parts("sun", { rays: 0 }).some((x) => x.id === "rays"), false);
});

test("counter overlay: schema, one per scene, value tween and number format", () => {
  assert.ok(overlaySchema.safeParse({ type: "counter", value: 180, unit: "days", label: "BY CART" }).success);
  assert.ok(!overlaySchema.safeParse({ type: "counter" }).success, "value is required");
  assert.ok(!overlaySchema.safeParse({ type: "counter", value: 1, unit: "x".repeat(11) }).success);
  assert.ok(!overlaySchema.safeParse({ type: "counter", value: 1, sep: ";" }).success);
  const o = { type: "counter", value: 100, from: 0, dur: 2, at: 1, steps: [{ at: 4, value: 40, dur: 1 }] };
  assert.equal(counterValueAt(o, 0), 0);
  assert.equal(counterValueAt(o, 1), 0);
  const mid = counterValueAt(o, 2);
  assert.ok(mid > 0 && mid < 100);
  assert.ok(counterValueAt(o, 2.5) > mid, "monotone up");
  assert.equal(counterValueAt(o, 3.5), 100);
  assert.equal(counterValueAt(o, 4.5) < 100 && counterValueAt(o, 4.5) > 40, true, "steps tween on from the current value");
  assert.equal(counterValueAt(o, 9), 40);
  assert.equal(formatCounter(12345, {}), "12,345");
  assert.equal(formatCounter(12345, { sep: "." }), "12.345");
  assert.equal(formatCounter(1862, { sep: "" }), "1862");
  assert.equal(formatCounter(2.5, { decimals: 1, sep: "." }), "2,5");
  assert.equal(formatCounter(-1200, { prefix: "$" }), "-$1,200");
  const raw = read("../examples/documentary-3d.spec.json");
  raw.scenes[0].visual.overlay = [{ type: "counter", value: 1 }, { type: "counter", value: 2 }];
  const r = validateSpec(raw);
  assert.equal(r.ok, false);
  assert.match(JSON.stringify(r.errors), /one `counter` per scene/);
});

test("documentary-3d is a registered 3D template with topic-neutral metadata and its own look", () => {
  assert.ok(THREE_D_TEMPLATE_IDS.includes("documentary-3d"));
  const t = listTemplates().find((x) => x.id === "documentary-3d");
  assert.equal(t.category, "3d");
  assert.equal(t.format, "documentary-3d");
  const full = getTemplate("documentary-3d");
  const text = JSON.stringify([full.description, full.prompt_hint, full.best_for]).toLowerCase();
  for (const domain of ["history", "econom", "science", "technolog", "geograph"]) assert.ok(text.includes(domain), `mentions ${domain}`);
  assert.ok(Object.keys(full.recipes).length >= 3);
  assert.ok(!/default/i.test(JSON.stringify(full.recipes)), "no recipe is the default topic");
  assert.equal(full.defaults.captions.position, "top");
  assert.equal(full.defaults.captions.style, "two-tone");
  assert.equal(full.defaults.theme.palette.bg.length, 2);
  assert.equal(listTemplates().filter((x) => x.category === "3d").length, THREE_D_TEMPLATE_IDS.length);
});

test("El clavo de oro: one persistent stage, 14+ scenes, 8+ distinct builders, counters, ~50 s, voice none", () => {
  const raw = read("../examples/documentary-3d-clavo.spec.json");
  assert.equal(raw.template, "documentary-3d");
  assert.equal(raw.language, "es");
  assert.equal(raw.voice.provider, "none");
  const r = validateSpec(raw);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.ok(raw.stage && r.spec.scenes.length >= 14 && r.spec.scenes.every((s) => !s.visual.objects && !s.visual.world));
  const used = new Set([...raw.stage.actors, ...raw.stage.world.parts].map((a) => a.build).filter(Boolean));
  assert.ok(used.size >= 8, `${used.size} distinct builders: ${[...used].join(", ")}`);
  assert.ok(r.spec.scenes.filter((s) => (s.visual.overlay ?? []).some((o) => o.type === "counter")).length >= 6, "counters tick in at least 6 scenes");
  assert.ok(r.spec.scenes.filter((s) => (s.visual.beats ?? []).length || (s.visual.fx ?? []).length).length >= 14, "real beats or fx in the scenes");
  const spec = resolveSpec(r.spec, getTemplate("documentary-3d"));
  const tl = computeTimeline(spec.scenes, { fps: spec.format.fps });
  const sec = tl.totalFrames / spec.format.fps;
  assert.ok(sec >= 44 && sec <= 56, `${sec} s`);
  const plans = planThree(spec, tl);
  assert.equal(plans.length, spec.scenes.length);
  assert.ok(plans.every((p) => p.stage === plans[0].stage), "ONE shared stage plan");
  assert.ok(plans[0].stage.world.parts.length <= MAX_WORLD_EXPANDED);
  // a camera flight: every scene focuses a stage actor, and the flight is continuous (cut only on purpose)
  const keys = plans[0].cameraKeys;
  assert.ok(keys.filter((k) => k.focusActor).length >= 14);
  assert.equal(raw.scenes.flatMap((s) => s.visual.shots ?? []).filter((s) => s.cut).length <= 2, true);
  const named = raw.scenes.flatMap((s) => (s.visual.shots ?? []).map((x) => x.focus)).filter(Boolean);
  const ids = new Set(raw.stage.actors.map((a) => a.id));
  for (const f of named) assert.ok(ids.has(f), `focus ${f} is a stage actor`);
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(JSON.stringify(raw)), "no emoji");
});

test("the short documentary sample validates as the template example", () => {
  const raw = read("../examples/documentary-3d.spec.json");
  const r = validateSpec(raw);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.ok(r.spec.scenes.length >= 5 && r.spec.scenes.length <= 14);
});

test("shots may zoom in far (a close-up of a small set piece) but not to zero", () => {
  const raw = read("../examples/documentary-3d.spec.json");
  raw.scenes[0].visual.shots = [{ shot: "zoom-to", focus: "globe", zoom: 0.2 }];
  assert.equal(validateSpec(raw).ok, true);
  raw.scenes[0].visual.shots = [{ shot: "zoom-to", focus: "globe", zoom: 0.05 }];
  assert.equal(validateSpec(raw).ok, false);
});
