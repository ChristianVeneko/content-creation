import { test } from "node:test";
import assert from "node:assert/strict";
import { meta, payloadSchema, promptSection, normalize } from "../hf/three-looks/index.mjs";
import { resolveWordRef, captionGroups, resolvePayload } from "../hf/three-looks/resolve.mjs";
import { normalizePayload } from "../hf/three-looks/normalize.mjs";
import { SETTINGS, SETTING_IDS, kindActs, BEAT_KINDS } from "../hf/three-looks/catalog.mjs";

const NARRATION = "Tu computadora se cuelga cuando la memoria se llena. La memoria RAM guarda lo que usas ahora. Si abres muchos programas, la memoria se llena y el disco trabaja mucho.";
const words = NARRATION.split(/\s+/).map((text, i) => ({ text, start: +(i * 0.4).toFixed(2), end: +(i * 0.4 + 0.35).toFixed(2) }));
const example = () => JSON.parse(promptSection.match(/```json\n([\s\S]*?)```/)[1]);
const byPath = (r) => Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));

test("contract: meta, styles as data (clay-diorama), settings, modes and prompt", () => {
  assert.equal(meta.id, "three-looks");
  assert.deepEqual(meta.modes, ["multi", "single"]);
  assert.deepEqual(meta.styles.map((s) => s.id), ["clay-diorama"]);
  assert.ok(SETTING_IDS.length >= 5, "at least 5 settings (3 required)");
  assert.ok(meta.settings.length >= 3);
  assert.ok(promptSection.length > 3000);
  assert.ok(BEAT_KINDS.includes("light-up") && BEAT_KINDS.includes("emote"));
});

test("schema accepts the rich example of the prompt", () => {
  const r = payloadSchema.safeParse(example());
  assert.ok(r.success, r.success ? "" : JSON.stringify(r.error.issues));
  assert.ok(r.data.worlds.length >= 3, "the example uses at least 3 distinct settings");
  assert.ok(new Set(r.data.worlds.map((w) => w.setting)).size >= 3);
});

test("schema rejects an unknown style, setting, hero and mood naming the allowed values", () => {
  const ex = example(); ex.style = "iso-toon"; ex.hero = "ninja"; ex.worlds[0].setting = "moon-base"; ex.worlds[1].mood = "gloomy";
  const m = byPath(payloadSchema.safeParse(ex));
  assert.match(m["style"], /unknown style "iso-toon".*clay-diorama/);
  assert.match(m["hero"], /unknown hero "ninja".*robo/);
  assert.match(m["worlds.0.setting"], /unknown setting "moon-base".*desk/);
  assert.match(m["worlds.1.mood"], /unknown mood "gloomy".*warm/);
});

test("schema checks beat targets against the world's setting and acts against the prop kind", () => {
  const ex = example();
  ex.worlds[0].beats = [
    { on: { word: "memoria" }, do: "light-up", target: "rack-9" },
    { on: { word: "memoria" }, do: "open", target: "lamp" },
    { on: { word: "memoria" }, do: "fill", target: "monitor" },
  ];
  ex.worlds[0].setting = "desk";
  const m = byPath(payloadSchema.safeParse(ex));
  assert.match(m["worlds.0.beats.0.target"], /no prop "rack-9".*monitor.*tower/);
  assert.match(m["worlds.0.beats.1.do"], /`open` is not available on "lamp".*light-up/);
  assert.equal(m["worlds.0.beats.2.value"], "`fill` needs `value` between 0 and 1");
});

test("schema: required fields per beat kind and limits", () => {
  const w = (beat) => payloadSchema.safeParse({ style: "clay-diorama", worlds: [{ setting: "desk", beats: [{ on: { word: "x" }, ...beat }] }] });
  assert.match(byPath(w({ do: "move", target: "monitor" }))["worlds.0.beats.0.to"], /`move` needs `to`/);
  assert.match(byPath(w({ do: "label", target: "monitor" }))["worlds.0.beats.0.text"], /`label` needs `text`/);
  assert.match(byPath(w({ do: "stamp", text: "X".repeat(30) }))["worlds.0.beats.0.text"], /at most 18/);
  assert.match(byPath(w({ do: "emote" }))["worlds.0.beats.0.symbol"], /`emote` needs `symbol`/);
  assert.match(byPath(w({ do: "emote", symbol: "cry" }))["worlds.0.beats.0.symbol"], /unknown emote "cry".*wave/);
  assert.match(byPath(w({ do: "walk" }))["worlds.0.beats.0.to"], /`walk` needs `to`/);
  assert.match(byPath(w({ do: "light-up" }))["worlds.0.beats.0.target"], /`light-up` needs a `target`/);
  assert.match(byPath(w({ do: "teleport", target: "monitor" }))["worlds.0.beats.0.do"], /unknown beat kind "teleport"/);
  assert.equal(payloadSchema.safeParse({ style: "clay-diorama", worlds: [] }).success, false);
  assert.ok(w({ do: "fill", target: "monitor", value: 0.7 }).success);
  assert.ok(w({ do: "stamp", text: "RAM LLENA" }).success);
  assert.ok(w({ do: "walk", to: "monitor", who: "hero" }).success);
});

test("schema: cast ids, positions, shots and transitions are closed", () => {
  const ex = example(); ex.worlds[0].cast = [{ who: "hero", at: "nowhere" }]; ex.worlds[1].shots = [{ kind: "selfie" }]; ex.worlds[2].transition = "dissolve";
  const m = byPath(payloadSchema.safeParse(ex));
  assert.match(m["worlds.0.cast.0.at"], /position "nowhere"/);
  assert.match(m["worlds.1.shots.0.kind"], /unknown shot "selfie".*wide/);
  assert.match(m["worlds.2.transition"], /unknown transition "dissolve".*iris/);
});

test("kind acts: every prop kind of every setting is known and base acts are shared", () => {
  for (const id of SETTING_IDS) for (const [pid, p] of Object.entries(SETTINGS[id].props)) {
    assert.ok(kindActs(p.kind).includes("pulse"), `${id}.${pid}`);
    assert.ok(p.at.length === 3 && p.at.every(Number.isFinite), `${id}.${pid} position`);
  }
  assert.ok(kindActs("monitor").includes("open") && !kindActs("lamp").includes("open"));
});

test("normalize fixes common slips without dropping content", () => {
  const raw = {
    style: " Clay Diorama ", hero: "Robot", worlds: [
      { scene: "Oficina", mood: "Calido", beats: [
        { on: "memoria", type: "glow", target: "pc" }, { time: 2.5, action: "emote", who: "hero", symbol: "wave" },
        { on: { word: "RAM", n: "2" }, do: "fill", target: "monitor", value: "70%" }, { on: { word: "x" }, do: "label", target: "monitor", text: "  RAM llena  " },
      ], cast: [{ who: "robot", at: "izquierda", size: "grande" }], shots: [{ type: "primer plano", move: "zoom in" }], transition: "circle" },
      { setting: "servidores", beats: [{ on: { word: "disco" }, do: "spinning", target: "hard disk" }] },
    ],
  };
  const n = normalizePayload(raw);
  assert.equal(n.style, "clay-diorama");
  assert.equal(n.hero, "robo");
  assert.equal(n.worlds[0].setting, "desk");
  assert.equal(n.worlds[0].mood, "warm");
  assert.equal(n.worlds[0].beats.length, 4, "nothing dropped");
  assert.deepEqual(n.worlds[0].beats[0].on, { word: "memoria" });
  assert.equal(n.worlds[0].beats[0].do, "light-up");
  assert.equal(n.worlds[0].beats[0].target, "tower");
  assert.deepEqual(n.worlds[0].beats[1].on, { at: 2.5 });
  assert.equal(n.worlds[0].beats[2].on.n, 2);
  assert.equal(n.worlds[0].beats[2].value, 0.7);
  assert.equal(n.worlds[0].beats[3].text, "RAM llena");
  assert.deepEqual(n.worlds[0].cast[0], { who: "hero", at: "left", size: "L" });
  assert.equal(n.worlds[0].shots[0].kind, "close");
  assert.equal(n.worlds[0].shots[0].move, "dolly-in");
  assert.equal(n.worlds[0].transition, "iris");
  assert.equal(n.worlds[1].setting, "server-room");
  assert.equal(n.worlds[1].beats[0].do, "spin");
  assert.equal(n.worlds[1].beats[0].target, "hard-disk");
  assert.ok(payloadSchema.safeParse(n).success, JSON.stringify(payloadSchema.safeParse(n).error?.issues));
});

test("normalize is idempotent, tolerates empty input and fills defaults", () => {
  const a = normalizePayload({ worlds: [{ setting: "desk" }] });
  assert.deepEqual(normalizePayload(a), a);
  assert.equal(a.style, "clay-diorama"); assert.deepEqual(a.worlds[0].beats, []);
  assert.deepEqual(normalizePayload(undefined), {});
  const spec = normalize({ template: "three-looks", hf: { worlds: [{ scenario: "desk", beats: [] }] } });
  assert.equal(spec.hf.worlds[0].setting, "desk");
});

test("word binding: n-th occurrence, offset, accents and a missing word spread evenly with a warning", () => {
  const w = (s, n, off) => resolveWordRef(words, { word: s, n, offset: off });
  const all = words.map((x, i) => [x.text.toLowerCase().replace(/[^a-záéíóú]/g, ""), i]).filter(([t]) => t === "memoria").map(([, i]) => words[i].start);
  assert.equal(all.length, 3);
  assert.equal(w("memoria").t, all[0]);
  assert.equal(w("memoria", 2).t, all[1]);
  assert.equal(w("memoria", 3).t, all[2]);
  assert.equal(w("Memoria", 2, 0.25).t, +(all[1] + 0.25).toFixed(2));
  assert.equal(resolveWordRef(words, { at: 3 }).t, 3);
  assert.equal(w("zzzz"), null);
});

test("resolve: beats land on their words, sorted, inside their world; missing words warn and are spread", () => {
  const payload = payloadSchema.parse({ style: "clay-diorama", worlds: [
    { setting: "desk", beats: [{ on: { word: "memoria", n: 2 }, do: "light-up", target: "monitor" }, { on: { word: "nadaquever" }, do: "pulse", target: "tower" }, { on: { word: "computadora" }, do: "pop-in", target: "ram-stick" }] },
    { setting: "server-room", from: { word: "disco" }, beats: [{ on: { word: "disco" }, do: "spin", target: "hard-disk" }] },
  ] });
  const r = resolvePayload({ payload, words, durationSec: 12.5, mode: "multi", captionsEnabled: true });
  const mem2 = resolveWordRef(words, { word: "memoria", n: 2 }).t;
  const b = r.data.beats.find((x) => x.do === "light-up");
  assert.equal(b.t, mem2);
  assert.ok(r.warnings.some((x) => /nadaquever/.test(x)));
  assert.deepEqual(r.data.beats.map((x) => x.t), [...r.data.beats.map((x) => x.t)].sort((a, c) => a - c));
  const [w0, w1] = r.data.worlds;
  assert.equal(w0.t0, 0); assert.equal(w0.t1, w1.t0); assert.equal(w1.t0, resolveWordRef(words, { word: "disco" }).t);
  assert.equal(w1.t1, r.durationSec);
  for (const x of r.data.beats) { const w = r.data.worlds[x.world]; assert.ok(x.t >= w.t0 - 1e-9 && x.t < w.t1, `${x.do} at ${x.t} outside world ${x.world}`); }
  assert.ok(r.sfx.length > 0 && r.sfx.every((s) => typeof s.at === "number" && typeof s.kind === "string"));
});

test("resolve: every world gets a shot plan that always moves and covers the world; consecutive shots differ", () => {
  const payload = payloadSchema.parse(example());
  const r = resolvePayload({ payload, words, durationSec: 30, mode: "multi", captionsEnabled: true });
  for (const w of r.data.worlds) {
    assert.ok(w.shots.length >= 2);
    assert.equal(w.shots[0].t0, w.t0);
    assert.ok(Math.abs(w.shots.at(-1).t1 - w.t1) < 1e-6);
    for (let i = 0; i < w.shots.length; i++) {
      const s = w.shots[i];
      assert.ok(s.move, "every shot has a move (camera never idle)");
      assert.ok(s.t1 - s.t0 <= 4.6 + 1e-9, `shot of ${s.t1 - s.t0}s is too long`);
      if (i > 0) { const p = w.shots[i - 1]; assert.ok(s.kind !== p.kind || s.target?.id !== p.target?.id || s.move !== p.move, "consecutive shots must differ"); }
    }
  }
});

test("resolve: single mode adds travel windows between worlds and no transition overlays", () => {
  const payload = payloadSchema.parse(example());
  const r = resolvePayload({ payload, words, durationSec: 30, mode: "single", captionsEnabled: true });
  assert.equal(r.data.mode, "single");
  for (const w of r.data.worlds.slice(1)) assert.ok(w.travel && w.travel.t1 > w.t0 && w.travel.t1 - w.t0 <= 2.0);
  assert.ok(r.data.worlds.every((w) => !w.transition));
  const m = resolvePayload({ payload, words, durationSec: 30, mode: "multi", captionsEnabled: true });
  assert.ok(m.data.worlds.slice(1).every((w) => w.transition));
});

test("caption groups: 2-4 words per group, in order, covering every word", () => {
  const g = captionGroups(words);
  assert.equal(g.flatMap((x) => x.words).length, words.length);
  assert.ok(g.every((x) => x.words.length >= 1 && x.words.length <= 4));
  assert.deepEqual(g.map((x) => x.t0), [...g.map((x) => x.t0)].sort((a, b) => a - b));
});
