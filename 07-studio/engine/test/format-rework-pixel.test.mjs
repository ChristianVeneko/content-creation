// Format rework (pixel): the pixel-versus format (rounds, fighters with a header strip, ranking and verdict panels,
// crowns and the energy-beam / power-up / hit-flash fx) built on the existing pixel family.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate } from "../lib/templates.mjs";
import { TEMPLATE_IDS, validateSpec } from "../lib/spec.mjs";
import { PANEL_TYPES, PIXEL_LOOKS, PIXEL_TEMPLATE_IDS, ROLES, SET_IDS, VERSUS_FX, fighterXs, lookPalette, planPixel, planPixelScene, rankRows, starsOf, versusFxOf } from "../lib/pixel.mjs";
import { computeTimeline } from "../lib/timeline.mjs";
import { fxWindow } from "../lib/pixel-gen.mjs";

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const example = (id) => JSON.parse(read(`../examples/${id}.spec.json`));
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

const sprite = { id: "bot", frames: [["..22..", ".2222.", "222222", ".2..2."]] };
const scene = (pixel, extra = {}) => ({
  version: 1,
  title: "x",
  template: "pixel-versus",
  scenes: [{ id: "a", narration: "Ronda uno, pelean los dos.", visual: { type: "pixel", pixel: { set: "arena", sprites: [sprite], ...pixel } }, ...extra }],
});
const errorsOf = (spec) => {
  const r = validateSpec(spec);
  return r.ok ? [] : r.errors;
};
const pathsOf = (spec) => errorsOf(spec).map((e) => String(e.path ?? ""));

test("pixel-versus is the fifth pixel template, with its own look, the arena set and a format slug", () => {
  assert.deepEqual(PIXEL_TEMPLATE_IDS.slice(0, 4), ["pixel-dusk", "pixel-night", "pixel-arcade", "pixel-mono"]);
  assert.equal(PIXEL_TEMPLATE_IDS[4], "pixel-versus");
  assert.ok(TEMPLATE_IDS.includes("pixel-versus"));
  assert.ok(SET_IDS.includes("arena"), "a fixed arena stage set");
  const l = PIXEL_LOOKS["pixel-versus"];
  for (const r of ROLES) assert.match(l.roles[r] ?? "", /^#[0-9A-Fa-f]{6}$/, `role ${r}`);
  assert.ok(lookPalette("pixel-versus").length <= 24);
  const t = getTemplate("pixel-versus");
  assert.equal(t.category, "pixel");
  assert.equal(t.format, "pixel-versus");
  assert.equal(t.preview.style, "pixel");
  assert.equal(t.defaults.captions.enabled, false, "the dialog box shows the narration");
  assert.ok(!EMOJI.test(JSON.stringify(t)), "no emoji");
  assert.match(t.prompt_hint, /draw|sprite/i);
  assert.match(t.prompt_hint, /every video|new subjects|each video/i);
});

test("the example validates, is all pixel and shows rounds, fighters, ranking, verdict and the new fx", () => {
  const ex = example("pixel-versus");
  assert.equal(ex.template, "pixel-versus");
  const r = validateSpec(ex);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.ok(ex.scenes.every((s) => s.visual.type === "pixel"));
  const keys = new Set(ex.scenes.flatMap((s) => Object.keys(s.visual.pixel)));
  for (const k of ["round", "fighters", "ranking", "verdict", "fx"]) assert.ok(keys.has(k), `example uses ${k}`);
  const fx = new Set(ex.scenes.flatMap((s) => (s.visual.pixel.fx ?? []).map((f) => f.type)));
  for (const t of VERSUS_FX) assert.ok(fx.has(t), `example uses fx ${t}`);
  assert.ok(!EMOJI.test(JSON.stringify(ex)));
});

test("scene field round: the 'ROUND n/N' title card", () => {
  assert.deepEqual(errorsOf(scene({ round: { n: 2, of: 5, title: "Velocidad" } })), []);
  assert.deepEqual(errorsOf(scene({ round: { n: 1, of: 3 } })), []);
  assert.ok(errorsOf(scene({ round: { n: 0, of: 5 } })).length, "n starts at 1");
  assert.ok(errorsOf(scene({ round: { n: 6, of: 5 } })).length, "n cannot pass of");
  assert.ok(errorsOf(scene({ round: { n: 1, of: 5, title: "x".repeat(40) } })).length);
});

test("scene field fighters: contestants with sprite, name, stars and a side; header strip data", () => {
  const f = (o = {}) => ({ sprite: "bot", name: "Alfa", stars: 4.5, ...o });
  assert.deepEqual(errorsOf(scene({ fighters: [f(), f({ name: "Beta", stars: 3, crown: true, side: "right", anim: "jump" })] })), []);
  assert.ok(pathsOf(scene({ fighters: [f({ stars: 6 })] })).length, "stars max 5");
  assert.ok(errorsOf(scene({ fighters: [f({ stars: 3.3 })] })).length, "half-star steps");
  assert.ok(errorsOf(scene({ fighters: [] })).length, "at least one");
  assert.ok(errorsOf(scene({ fighters: [f(), f(), f(), f()] })).length, "at most three");
  assert.ok(errorsOf(scene({ fighters: [f({ side: "up" })] })).length);
  assert.ok(errorsOf(scene({ fighters: [f({ anim: "walk-across" })] })).length, "only in-place animations");
  assert.ok(pathsOf(scene({ fighters: [f({ sprite: "ghost" })] })).some((p) => p.includes("fighters")), "an unknown sprite is reported at the fighter");
  assert.deepEqual(fighterXs([{}]), [0.5]);
  assert.deepEqual(fighterXs([{}, {}]), [0.27, 0.73]);
  assert.deepEqual(fighterXs([{}, {}, {}]), [0.2, 0.5, 0.8]);
  assert.deepEqual(fighterXs([{ side: "right" }, { side: "left" }]), [0.73, 0.27]);
  assert.deepEqual(starsOf(3.5), ["full", "full", "full", "half", "empty"]);
  assert.deepEqual(starsOf(0), ["empty", "empty", "empty", "empty", "empty"]);
  assert.deepEqual(starsOf(5), ["full", "full", "full", "full", "full"]);
});

test("scene field ranking: rows with rank, name, score and a bar; ranks are by score, ties share", () => {
  const rows = [
    { name: "Alfa", score: 80 },
    { name: "Beta", score: 95, crown: true },
    { name: "Gamma", score: 80 },
  ];
  assert.deepEqual(errorsOf(scene({ ranking: { title: "Velocidad", rows } })), []);
  assert.ok(errorsOf(scene({ ranking: { rows: [rows[0]] } })).length, "at least two rows");
  assert.ok(errorsOf(scene({ ranking: { rows: [1, 2, 3, 4, 5, 6].map((i) => ({ name: `n${i}`, score: i })) } })).length, "at most five rows");
  assert.ok(errorsOf(scene({ ranking: { rows: [{ name: "x", score: -1 }, rows[1]] } })).length, "scores are not negative");
  const ranked = rankRows(rows);
  assert.deepEqual(ranked.map((r) => r.rank), [2, 1, 2]);
  assert.deepEqual(ranked.map((r) => r.ratio), [80 / 95, 1, 80 / 95]);
  assert.deepEqual(rankRows(rows, 200).map((r) => r.ratio), [0.4, 0.475, 0.4], "an explicit max scales the bars");
});

test("scene field verdict: rows that fill in one by one, a winner and a crown", () => {
  const rows = [{ name: "Alfa", score: "9.1" }, { name: "Beta", score: 8, note: "KO" }];
  assert.deepEqual(errorsOf(scene({ verdict: { title: "VEREDICTO", rows, winner: 0 } })), []);
  assert.deepEqual(errorsOf(scene({ verdict: { rows } })), [], "title and winner are optional");
  assert.ok(errorsOf(scene({ verdict: { rows, winner: 2 } })).length, "winner must be a row");
  assert.ok(errorsOf(scene({ verdict: { rows: [rows[0]] } })).length, "at least two rows");
});

test("one UI panel per scene now includes ranking and verdict", () => {
  assert.deepEqual(PANEL_TYPES, ["popup", "counter", "checklist", "ranking", "verdict"]);
  const rows = [{ name: "A", score: 1 }, { name: "B", score: 2 }];
  assert.ok(errorsOf(scene({ ranking: { rows }, verdict: { rows } })).length);
  assert.ok(errorsOf(scene({ ranking: { rows }, popup: { title: "x", text: "y" } })).length);
  assert.deepEqual(errorsOf(scene({ banner: { text: "Ronda" }, ranking: { rows } })), []);
});

test("fx energy-beam: a beam from the origin to a target; options and defaults", () => {
  const f = { type: "energy-beam", at: 0.5, x: 0.28, y: 0.6, to: { x: 0.74, y: 0.6 }, intensity: 0.8, color: "glow2" };
  assert.deepEqual(errorsOf(scene({ fx: [f] })), []);
  assert.ok(errorsOf(scene({ fx: [{ ...f, to: { x: 2, y: 0.5 } }] })).length, "the target stays near the view");
  assert.ok(errorsOf(scene({ fx: [{ type: "hit-flash", to: { x: 0.5, y: 0.5 } }] })).length, "`to` is only for energy-beam");
  assert.equal(versusFxOf({ type: "energy-beam" }).duration, 1.4);
  assert.equal(versusFxOf({ type: "energy-beam", duration: 3 }).duration, 3, "an explicit duration wins");
});

test("fx power-up: a rising flame aura around a fighter", () => {
  assert.deepEqual(errorsOf(scene({ fx: [{ type: "power-up", x: 0.27, y: 0.7, at: 0.2, duration: 2, intensity: 0.9 }] })), []);
  assert.deepEqual(errorsOf(scene({ fx: [{ type: "power-up", loop: true }] })), []);
  assert.equal(versusFxOf({ type: "power-up" }).duration, 1.6);
  assert.equal(versusFxOf({ type: "power-up" }).at, 0.4, "one-shots start at 0.4 s unless told otherwise");
  assert.equal(versusFxOf({ type: "power-up", at: 1 }).at, 1);
});

test("fx hit-flash: a star-burst impact with a short screen flash", () => {
  assert.deepEqual(errorsOf(scene({ fx: [{ type: "hit-flash", x: 0.7, y: 0.6, at: "pelean" }] })), []);
  assert.ok(pathsOf(scene({ fx: [{ type: "hit-flash", at: "inexistente" }] })).some((p) => p.includes("fx")), "word moments are checked like every fx");
  const w = fxWindow(versusFxOf({ type: "hit-flash" }), 0.5, 5);
  assert.equal(w.active, true);
  assert.equal(fxWindow(versusFxOf({ type: "hit-flash" }), 1.5, 5).active, false, "gone after 0.4 s");
});

test("unknown fx still list every valid type, the old ones and the new ones", () => {
  const e = errorsOf(scene({ fx: [{ type: "kamehameha" }] }));
  const msg = JSON.stringify(e);
  for (const t of ["sparks", "burst", "glitch", ...VERSUS_FX]) assert.ok(msg.includes(t), `lists ${t}`);
});

test("planning: round card, panel rows and the new fx give timed beats", () => {
  const rows = [{ name: "A", score: 3 }, { name: "B", score: 2 }, { name: "C", score: 1 }];
  const p = planPixelScene({ set: "arena", round: { n: 1, of: 3 }, ranking: { rows } }, 6, 0, {});
  assert.deepEqual(p.round, { at: 0.2, until: 2 });
  assert.equal(p.rows.length, 3);
  assert.ok(p.rows.every((t, i) => i === 0 || t > p.rows[i - 1]), "rows reveal one after another");
  assert.ok(p.rows[2] < 6 - 1, "the last row lands before the closing hold");
  const v = planPixelScene({ set: "arena", verdict: { rows } }, 6, 0, {});
  assert.equal(v.rows.length, 3);
  const beats = planPixelScene({ set: "arena", fx: [{ type: "energy-beam", at: 1 }, { type: "hit-flash", at: 2 }, { type: "power-up", at: 0.5 }] }, 6, 0, {}).elements.map((e) => e.el.type);
  assert.equal(beats.filter((t) => t === "stamp").length, 2, "beam and impact make an SFX beat");
  const spec = scene({ ranking: { rows } });
  const tl = computeTimeline(spec.scenes, { fps: 30 });
  assert.equal(planPixel({ ...spec, format: { fps: 30 } }, tl)[0].rows.length, 3);
});

test("previous behavior holds: a classic pixel scene plans exactly as before (no new keys appear)", () => {
  const full = { set: "room", props: [{ kind: "monitor", label: "Editor" }, { kind: "block", x: 0.7, color: "#55CC77" }, { kind: "chest", open: true, at: 1.2 }], character: { pose: "hold", item: "item", x: 0.25 }, banner: { text: "x" }, counter: { value: 1, label: "a" }, camera: "pan-left", transition: "iris" };
  assert.deepEqual(planPixelScene(full, 5, 0, {}), {
    kind: "pixel",
    set: "room",
    moments: {},
    camera: "pan-left",
    transition: "iris",
    props: [{ x: 0.5, enter: 0.35 }, { x: 0.7, enter: 0.95 }, { x: 0.86, enter: 1.2 }],
    panelAt: 0.6,
    checks: [],
    elements: [
      { el: { type: "icon" }, box: null, enter: 0.35, items: [] },
      { el: { type: "icon" }, box: null, enter: 0.95, items: [] },
      { el: { type: "stamp" }, box: null, enter: 1.2, items: [] },
      { el: { type: "counter" }, box: null, enter: 0.3, items: [] },
    ],
  });
});
