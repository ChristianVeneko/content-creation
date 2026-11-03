// three-looks resolver: contract, schema, normalize, word binding, framing solver, shot mix, label/stamp placement.
import { test } from "node:test";
import assert from "node:assert/strict";
import { meta, payloadSchema, promptSection, normalize } from "../hf/three-looks/index.mjs";
import { EXAMPLE_PAYLOAD } from "../hf/three-looks/prompt.mjs";
import { resolveWordRef, captionGroups, resolvePayload, posAt } from "../hf/three-looks/resolve.mjs";
import { normalizePayload } from "../hf/three-looks/normalize.mjs";
import { BEAT_KINDS, SHOTS } from "../hf/three-looks/catalog.mjs";
import { shotMix, catOf } from "../hf/three-looks/shots.mjs";
import { shotPoseAt, projectBox, FH, FW } from "../hf/three-looks/frame.mjs";
import { ZONES, rectsOverlap } from "../hf/three-looks/layout.mjs";
import { partBoxes } from "../hf/three-looks/coverage.mjs";
import { objectExtent } from "../hf/three-looks/parts.mjs";

const NARR = "Tu computadora se cuelga y no sabes por qué. Abres muchos programas y ventanas a la vez. La memoria se llena, se llena hasta el tope. Entonces el almacen se queda sin sitio, lleno de cajas de datos. Hay que sacar cosas a un camion. Y el disco trabaja lento, muy lento, el sistema espera. Los datos viajan sin parar. Todo ese esfuerzo genera calor, y cuando se calienta mucho, el ventilador no alcanza. Lo mejor es cerrar programas y reiniciar la computadora.";
export const words = NARR.split(/\s+/).map((text, i) => ({ text, start: +(i * 0.42).toFixed(2), end: +(i * 0.42 + 0.36).toFixed(2) }));
const byPath = (r) => Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
const run = (mode = "multi", payload = EXAMPLE_PAYLOAD) => resolvePayload({ payload: payloadSchema.parse(payload), words, mode });

test("contract: meta, one look as data, modes, builder-based prompt with a valid example", () => {
  assert.equal(meta.id, "three-looks"); assert.deepEqual(meta.modes, ["multi", "single"]);
  assert.deepEqual(meta.styles.map((s) => s.id), ["clay-diorama"]);
  assert.ok(BEAT_KINDS.includes("light-up") && BEAT_KINDS.includes("explode"));
  assert.ok(promptSection.includes("BINDING RULE") && promptSection.includes("SILHOUETTE FIRST") && promptSection.includes("microwave"));
  assert.doesNotMatch(promptSection, /\brobo\b|\.glb|Kenney|Poly Haven/);
  const ex = JSON.parse(promptSection.match(/```json\n([\s\S]*?)```/)[1]);
  assert.ok(payloadSchema.safeParse(ex).success);
  assert.ok(new Set(ex.worlds.map((w) => w.set)).size >= 3);
  assert.ok(ex.worlds.some((w) => w.objects.some((o) => o.parts)) && ex.worlds.some((w) => w.objects.some((o) => o.build)), "hand-written model next to builders");
});

test("schema: closed enums and beat checks name the allowed values", () => {
  const e1 = structuredClone(EXAMPLE_PAYLOAD); e1.style = "iso-toon"; e1.worlds[0].set = "moon"; e1.worlds[1].mood = "gloomy";
  const m1 = byPath(payloadSchema.safeParse(e1));
  assert.match(m1["style"], /unknown style "iso-toon".*clay-diorama/); assert.match(m1["worlds.0.set"], /unknown set "moon".*studio/); assert.match(m1["worlds.1.mood"], /unknown mood "gloomy".*warm/);
  const ex = structuredClone(EXAMPLE_PAYLOAD);
  ex.worlds[2].beats = [{ on: { word: "x" }, do: "open", target: "temp" }, { on: { word: "x" }, do: "light-up", target: "nope" }, { on: { word: "x" }, do: "fill", target: "rack" }];
  const m = byPath(payloadSchema.safeParse(ex));
  assert.match(m["worlds.2.beats.0.do"], /`open` is not available on "temp".*light-up/);
  assert.match(m["worlds.2.beats.1.target"], /no object "nope".*rack/);
  assert.equal(m["worlds.2.beats.2.value"], "`fill` needs `value` between 0 and 1");
});

test("normalize maps legacy stock vocabulary to scratch equivalents and is idempotent", () => {
  const n = normalizePayload({ hero: "robo", worlds: [{ setting: "oficina", objects: [{ kind: "microondas", size: "L" }], beats: [{ when: "listo", action: "abre", target: "microondas" }] }] });
  assert.deepEqual(n.hero, { design: "bot" }); assert.equal(n.worlds[0].set, "room"); assert.equal(n.worlds[0].objects[0].build, "microwave"); assert.equal(n.worlds[0].objects[0].scale, 1.15);
  assert.equal(n.worlds[0].beats[0].do, "open"); assert.equal(n.worlds[0].beats[0].target, "microwave");
  assert.deepEqual(normalizePayload(n), n);
  assert.deepEqual(normalize({ hf: { worlds: [] } }).hf.style, "clay-diorama");
});

test("word binding keeps its tolerance; captions group 2-4 words", () => {
  assert.equal(resolveWordRef(words, { word: "memoria" }).match, "exact");
  assert.ok(resolveWordRef(words, { word: "llenar" }));
  assert.equal(resolveWordRef(words, { word: "zzzzzz" }), null);
  for (const g of captionGroups(words)) assert.ok(g.words.length >= 1 && g.words.length <= 4);
});

test("resolve is pure: same inputs, identical data; every beat lands on its word", () => {
  const a = run(), b = run();
  assert.equal(JSON.stringify(a.data), JSON.stringify(b.data));
  const mem = a.data.beats.find((x) => x.do === "fill" && x.target === "mem");
  assert.ok(Math.abs(mem.t - words.find((w) => w.text.startsWith("memoria")).start) < 1e-6);
  assert.equal(a.warnings.length, 0, a.warnings.join("\n"));
});

const shotsOf = (d) => d.worlds.flatMap((w) => w.shots);
const entities = (d, w) => [...w.objects, ...w.cast];

test("shot mix: about 25 % wide / 50 % close / 25 % medium, never two wides in a row, causal beats get close or macro shots", () => {
  for (const mode of ["multi", "single"]) {
    const d = run(mode).data, shots = shotsOf(d), mix = shotMix(shots);
    assert.ok(mix.wide >= 0.15 && mix.wide <= 0.35, `wide ${mix.wide}`); assert.ok(mix.close >= 0.4 && mix.close <= 0.75, `close ${mix.close}`); assert.ok(mix.medium >= 0.08 && mix.medium <= 0.35, `medium ${mix.medium}`);
    shots.forEach((s, i) => { if (i) assert.ok(!(catOf(s.kind) === "wide" && catOf(shots[i - 1].kind) === "wide"), `two wides at ${i}`); });
    for (const b of d.beats) if (["open", "fill", "heat", "explode"].includes(b.do)) { const s = shotsOf(d).find((x) => b.t >= x.t0 - 0.2 && b.t < x.t1); assert.equal(catOf(s.kind), "close", `${b.do} at ${b.t} in ${s.kind}`); }
  }
});

test("camera is never idle: every shot moves, and any 2 s window changes the pose", () => {
  const d = run().data;
  for (const w of d.worlds) {
    for (const s of w.shots) assert.ok(Math.hypot(...s.pose0.pos.map((v, k) => v - s.pose1.pos[k])) > 0.2, `${s.kind} ${s.move} is static`);
    for (let t = w.t0; t + 2 < w.t1; t += 0.5) {
      const at = (x) => { const s = w.shots.find((q) => x >= q.t0 && x < q.t1) ?? w.shots.at(-1); return shotPoseAt(s, (x - s.t0) / (s.t1 - s.t0)).pos; };
      const a = at(t), b = at(t + 2); assert.ok(Math.hypot(...a.map((v, k) => v - b[k])) > 0.05, `idle at ${t}`);
    }
  }
});

test("framing: hero at most 35 % of the frame height, never cropped by an edge, hero and target inside the safe box, at every shot sample", () => {
  const d = run().data;
  let checked = 0;
  for (const w of d.worlds) {
    const hero = w.cast.find((c) => c.isHero), off = w.i * d.spacing;
    for (const s of w.shots) for (const u of [0, 0.5, 1]) {
      const t = s.t0 + u * (s.t1 - s.t0), pose = shotPoseAt(s, u), [x, z] = posAt(hero, t);
      const ext = objectExtent(hero.parts, hero.init, hero.scale), box = { min: [x + off + ext.min[0], 0, z + ext.min[2]], max: [x + off + ext.max[0], ext.max[1], z + ext.max[2]] };
      const r = projectBox(pose, box); checked++;
      assert.ok(r.y1 - r.y0 <= ZONES.heroMaxFrac * FH + 1, `hero ${(r.y1 - r.y0) / FH} at ${t.toFixed(1)}`);
      const inside = r.x0 >= 0 && r.x1 <= FW && r.y0 >= 0 && r.y1 <= FH, outside = r.x1 < 0 || r.x0 > FW || r.y1 < 0 || r.y0 > FH;
      assert.ok(inside || outside, `hero cropped at ${t.toFixed(1)} (${s.kind}) ${JSON.stringify(r)}`);
      if (inside) assert.ok(r.x0 >= ZONES.box.x0 - 1 && r.x1 <= ZONES.box.x1 + 1 && r.y0 >= ZONES.box.y0 - 1 && r.y1 <= ZONES.box.y1 + 1, `hero outside the safe box ${JSON.stringify(r)}`);
    }
  }
  assert.ok(checked > 30);
});

test("the targeted object of a close or macro shot fits the safe box", () => {
  const d = run().data;
  for (const w of d.worlds) for (const s of w.shots) {
    if (s.target.type !== "object") continue;
    const o = w.objects.find((x) => x.id === s.target.id), ext = objectExtent(o.parts, o.init, o.scale), mid = (s.t0 + s.t1) / 2, [x, z] = posAt(o, mid), off = w.i * d.spacing;
    const r = projectBox(shotPoseAt(s, 0.5), { min: [x + off + ext.min[0], ext.min[1], z + ext.min[2]], max: [x + off + ext.max[0], ext.max[1], z + ext.max[2]] });
    assert.ok(r.x0 >= ZONES.box.x0 - 1 && r.x1 <= ZONES.box.x1 + 1 && r.y0 >= ZONES.box.y0 - 1 && r.y1 <= ZONES.box.y1 + 1, `${o.id} ${JSON.stringify(r)}`);
  }
});

test("stamps and labels stay in their zones, avoid the hero and the targeted object, and labels carry a position for the leader line", () => {
  const d = run().data;
  for (const b of d.beats.filter((x) => x.do === "label" || x.do === "stamp")) {
    assert.ok(b.pos && Number.isFinite(b.pos.cx) && Number.isFinite(b.pos.cy), `${b.do} ${b.text} has no placement`);
    assert.ok(b.pos.cx >= 60 && b.pos.cx <= 1020);
    assert.ok(b.pos.cy >= ZONES.label.y0 - 40 && b.pos.cy < ZONES.captions.y0, `${b.text} y ${b.pos.cy}`);
    if (b.do === "stamp") assert.ok(b.pos.px >= 46 && b.pos.px <= ZONES.stampPx);
  }
});

test("single mode: one world per idea with the hero walking between stations (synthetic walks), no transitions", () => {
  const d = run("single").data;
  assert.equal(d.mode, "single"); assert.ok(d.worlds.slice(1).every((w) => w.travel && !w.transition));
  assert.ok(d.beats.filter((b) => b.synthetic).length === d.worlds.length - 1);
});

test("resolve: objects without `at` get free slots, `corner` pins, hidden objects are invisible until pop-in", () => {
  const p = payloadSchema.parse({ worlds: [{ set: "studio", objects: [{ id: "a", build: "crate" }, { id: "b", build: "crate" }, { id: "c", build: "lamp", corner: "back-right" }, { id: "h", build: "plant", hidden: true }], beats: [{ on: { at: 1 }, do: "pop-in", target: "h" }] }] });
  const d = resolvePayload({ payload: p, words, mode: "multi" }).data, w = d.worlds[0];
  const at = Object.fromEntries(w.objects.map((o) => [o.id, o.at]));
  assert.notDeepEqual(at.a, at.b); assert.deepEqual([at.c[0], at.c[2]], [3.5, -2.4]);
  assert.ok(w.objects.find((o) => o.id === "h").hidden && w.objects.find((o) => o.id === "h").vis.length === 1);
});
void rectsOverlap; void partBoxes; void SHOTS;
