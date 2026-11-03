// Themed pixel worlds (biomes): christmas village, desert, beach, mars, volcano, arctic, jungle, western town, haunted park, temple.
// Checks the catalog entries, the payload schema, the topic matcher and that every world draws, moves and fills the frame in several styles.
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "../hf/pixel-world/index.mjs";
import { normalizePayload } from "../hf/pixel-world/normalize.mjs";
import { payloadSchema } from "../hf/pixel-world/schema.mjs";
import { ZONES } from "../hf/pixel-world/layout.mjs";
import { open, prepare } from "../hf/pixel-world/sandbox.mjs";

const WORDS = "uno dos tres cuatro cinco seis siete ocho nueve diez once doce".split(" ").map((text, i) => ({ text, start: +(i * 0.75).toFixed(2), end: +(i * 0.75 + 0.6).toFixed(2) }));
const cat = catalog();
// id -> [a Spanish phrase and an English phrase that the topic matcher must resolve to it]
const BIOMES = {
  "christmas-village": ["navidad con nieve y regalos", "christmas village snow gifts"],
  desert: ["el desierto y las dunas", "desert dunes and cactus"],
  beach: ["un dia de playa con palmeras", "beach sea and palm trees"],
  mars: ["viaje a marte en un rover", "mars red planet rover"],
  volcano: ["un volcan en erupcion con lava", "volcano eruption lava"],
  arctic: ["el artico con pinguinos y hielo", "arctic ice penguins aurora"],
  jungle: ["la selva con rio y ruinas", "jungle vines river ruins"],
  "western-town": ["el lejano oeste y el saloon", "wild west saloon cowboy"],
  "haunted-park": ["halloween parque embrujado con fantasmas", "haunted halloween fairground ghosts"],
  temple: ["templo del imperio antiguo con tesoro", "ancient temple golden idol"],
};
const IDS = Object.keys(BIOMES);
const STYLES3 = ["pixel-snes-16bit", "pixel-gameboy-dmg", "pixel-1bit-dither"];
const world = (hf) => prepare({ hf: { style: "pixel-snes-16bit", ...hf }, words: WORDS, durationSec: 10 });
const sc = (id) => cat.scenarios.find((s) => s.id === id);

test("all ten biome worlds exist with 3-4 props, topics and English + Spanish keywords", () => {
  for (const id of IDS) {
    const s = sc(id);
    assert.ok(s, `${id} missing from the catalog`);
    assert.ok(s.props.length >= 3 && s.props.length <= 4, `${id}: ${s.props.length} props`);
    assert.ok(s.topics.length >= 5, `${id}: topics`);
    assert.ok(s.keywords.length >= 12, `${id}: ${s.keywords.length} keywords`);
    assert.ok(s.keywords.every((k) => k === k.toLowerCase()), `${id}: keywords must be lowercase`);
    assert.ok(s.about.length > 30, `${id}: about`);
    assert.ok(["day", "dusk", "night"].includes(s.time), `${id}: time`);
    assert.equal(s.dynamic, false);
    assert.equal(s.layers, 4, `${id}: far/back/mid/fore`);
  }
  assert.equal(cat.scenarios.filter((s) => s.id === "mine").length, 1, "mine already exists and is not duplicated");
  assert.equal(new Set(cat.scenarios.map((s) => s.id)).size, cat.scenarios.length);
});

test("the topic matcher resolves Spanish and English phrases to each biome", () => {
  for (const [id, phrases] of Object.entries(BIOMES)) for (const p of phrases) {
    const n = normalizePayload({ style: "pixel-snes-16bit", worlds: [{ scenario: p }] });
    assert.equal(n.worlds[0].scenario, id, `"${p}" -> ${n.worlds[0].scenario}`);
  }
});

test("every biome is accepted by the payload schema as hf.worlds[].scenario, with beats on each of its props", () => {
  for (const id of IDS) {
    const props = sc(id).props.map((p) => p.id);
    const beats = props.flatMap((target, i) => [{ on: { at: 1 + i }, do: "fill", target, value: 0.6 }, { on: { at: 1.5 + i }, do: "light", target }]);
    const parsed = payloadSchema.safeParse(normalizePayload({ style: "pixel-snes-16bit", worlds: [{ scenario: id, beats }] }));
    assert.ok(parsed.success, `${id}: ${parsed.success ? "" : parsed.error.issues.map((i) => i.message).join("; ")}`);
  }
});

test("props sit inside the action band (16-72 % of the frame)", () => {
  const top = ZONES.action.y0, bottom = ZONES.action.y1 + 4;
  for (const id of IDS) for (const p of sc(id).props) assert.ok(p.y >= top && p.y + p.h <= bottom, `${id}/${p.id} y ${p.y}-${p.y + p.h} outside ${top}-${bottom}`);
});

test("every biome draws in 3 styles, fills the frame, keeps lower-third detail and never stands still", () => {
  for (const st of STYLES3) for (const id of IDS) {
    const props = sc(id).props.map((p) => p.id);
    const beats = props.flatMap((target, i) => [{ on: { at: 0.5 + i * 0.4 }, do: "open", target }, { on: { at: 0.9 + i * 0.4 }, do: "fill", target, value: 0.8 }, { on: { at: 1.2 + i * 0.4 }, do: "light", target }]);
    const { data, style } = world({ style: st, worlds: [{ scenario: id, beats }] });
    const f = open({ data, style });
    let a;
    assert.doesNotThrow(() => { for (const t of [0.2, 1, 2.5, 4.7]) a = f.at(t); }, `${id}/${st}`);
    const snap = (t) => f.at(t).grid.map((r) => r.join(",")).join("|");
    const [top, mid, bottom] = f.at(2).thirds;
    assert.ok(top.covered > 0.9 && mid.covered > 0.9 && bottom.covered > 0.9, `${id}/${st}: a frame third is empty`);
    // the full-colour style must be rich; 4-colour and 1-bit styles are held to what the existing outdoor worlds (farm, lighthouse) reach there
    const full = st === "pixel-snes-16bit";
    assert.ok(bottom.detail >= (full ? 0.2 : 0.07), `${id}/${st}: bottom third detail ${bottom.detail.toFixed(2)}`);
    if (full) assert.ok(top.detail >= 0.1, `${id}/${st}: sky/back detail ${top.detail.toFixed(2)} (flat sky)`);
    assert.notEqual(snap(3.0), snap(3.4), `${id}/${st}: the frame is static between 3.0 s and 3.4 s`);
    assert.ok(a);
  }
});

test("the world is alive without any beat: continuous motion in the upper two thirds too", () => {
  for (const id of IDS) {
    const { data, style } = world({ worlds: [{ scenario: id, beats: [] }] });
    const f = open({ data, style });
    const rows = (t) => f.at(t).grid.slice(0, 96).map((r) => r.join(",")).join("|");
    assert.notEqual(rows(2.0), rows(2.5), `${id}: nothing moves above the floor`);
  }
});
