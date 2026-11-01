import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTemplate, listTemplates } from "../lib/templates.mjs";
import { TEMPLATE_IDS, resolveSpec, validateSpec } from "../lib/spec.mjs";
import { computeTimeline } from "../lib/timeline.mjs";
import { computeBeats } from "../lib/illustrated.mjs";
import { autoMood } from "../lib/music.mjs";
import {
  BAYER4,
  PIXEL_LOOKS,
  PIXEL_TEMPLATE_IDS,
  PROP_KINDS,
  ROLES,
  SET_IDS,
  bayer,
  cameraOffset,
  ditherPick,
  hexToRgb,
  lookPalette,
  nearestIndex,
  planPixel,
  quantizePixels,
  snap,
  usesPixelKit,
} from "../lib/pixel.mjs";

const PIXEL = ["pixel-dusk", "pixel-night", "pixel-arcade", "pixel-mono"];
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const example = (id) => JSON.parse(read(`../examples/${id}.spec.json`));
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

const fullScene = {
  set: "room",
  props: [
    { kind: "monitor", label: "Editor" },
    { kind: "block", x: 0.7, color: "#55CC77" },
    { kind: "chest", open: true, at: 1.2 },
  ],
  character: { pose: "hold", item: "item", x: 0.25, hair: "#3A2418", skin: "#F2C29B", shirt: "#22222E", pants: "#C9B48A" },
  banner: { text: "Nunca sin backups", accent: "backups", kicker: "Regla 1" },
  counter: { value: 12220, from: 0, label: "tokens que gasta", prefix: "+" },
  speaker: "BYTE",
  camera: "pan-left",
  transition: "iris",
  rays: true,
  dust: true,
};
const mini = (pixel, template = "pixel-dusk", extra = {}) => ({
  version: 1,
  title: "x",
  template,
  scenes: [{ id: "a", narration: "Hola mundo, esto es pixel.", visual: { type: "pixel", pixel }, ...extra }],
});
const errorsOf = (spec) => {
  const r = validateSpec(spec);
  return r.ok ? [] : r.errors;
};

test("pixel template ids are registered, ordered after the 3D looks, and only they use the pixel kit", () => {
  assert.deepEqual(PIXEL_TEMPLATE_IDS, PIXEL);
  for (const id of PIXEL) assert.ok(TEMPLATE_IDS.includes(id), id);
  const ids = listTemplates().map((t) => t.id);
  const at = ids.indexOf("pixel-dusk");
  assert.deepEqual(ids.slice(at, at + 4), PIXEL);
  assert.ok(at > ids.indexOf("holo-studio"));
  assert.deepEqual(ids.slice(-5), ["captions-voice", "kinetic-type", "countdown", "glass-cards", "letterbox"]);
  assert.ok(!usesPixelKit("illustrated") && !usesPixelKit("clay-diorama") && !usesPixelKit("reels-noche"));
});

test("the schema accepts a full pixel scene on every pixel template", () => {
  for (const id of PIXEL) assert.deepEqual(errorsOf(mini(fullScene, id)), [], id);
});

test("the schema rejects bad pixel scenes with a path and a reason", () => {
  const cases = [
    [{ set: "moon-base" }, "visual.pixel.set", /unknown pixel set/],
    [{ set: "room", props: [{ kind: "spaceship" }] }, "visual.pixel.props.0.kind", /unknown pixel prop/],
    [{ set: "room", banner: { text: "Hola mundo", accent: "adios" } }, "visual.pixel.banner.accent", /must be a word/],
    [{ set: "room", character: { pose: "hold" } }, "visual.pixel.character.item", /needs character.item/],
    [{ set: "room", character: { pose: "idle", item: "coin" } }, "visual.pixel.character.pose", /only drawn with pose "hold"/],
    [{ set: "room", counter: { value: 3, label: "x" }, checklist: { items: ["a"] } }, "visual.pixel.checklist", /one UI panel per scene/],
    [{ set: "room", props: [{ kind: "coin", big: true }, { kind: "trophy", big: true }] }, "visual.pixel.props", /at most one big prop/],
    [{ set: "room", props: Array.from({ length: 7 }, () => ({ kind: "coin" })) }, "visual.pixel.props", /.+/],
    [{ set: "room", character: { pose: "idle", hair: "brown" } }, "visual.pixel.character.hair", /hex color/],
  ];
  for (const [pixel, path, re] of cases) {
    const errs = errorsOf(mini(pixel));
    const hit = errs.find((e) => e.path === `scenes.0.${path}`);
    assert.ok(hit, `${JSON.stringify(pixel)} -> ${JSON.stringify(errs)}`);
    assert.match(hit.message, re);
  }
  const missing = errorsOf({ ...mini(fullScene), scenes: [{ id: "a", narration: "x", visual: { type: "pixel" } }] });
  assert.ok(missing.some((e) => e.path === "scenes.0.visual.pixel" && /requires visual.pixel/.test(e.message)), JSON.stringify(missing));
});

test("a pixel visual is only allowed on pixel templates", () => {
  for (const tpl of ["illustrated", "clay-diorama", "captions-voice"]) {
    const errs = errorsOf(mini(fullScene, tpl));
    assert.ok(errs.some((e) => e.path === "scenes.0.visual.type" && /needs a pixel template/.test(e.message)), `${tpl}: ${JSON.stringify(errs)}`);
  }
});

test("emoji are rejected in anything a pixel template draws", () => {
  const errs = errorsOf(mini({ set: "room", banner: { text: "Hola \u{1F680}" } }));
  assert.ok(errs.some((e) => e.path === "scenes.0.visual.pixel.banner.text" && /emoji/.test(e.message)), JSON.stringify(errs));
});

test("every pixel template has gallery metadata, a pixel preview, captions off by default and an example that validates", () => {
  for (const id of PIXEL) {
    const t = getTemplate(id);
    assert.equal(t.category, "pixel", id);
    assert.equal(t.preview.style, "pixel", `${id} preview style`);
    for (const k of ["name", "description", "prompt_hint", "best_for"]) assert.ok(t[k], `${id} missing ${k}`);
    assert.ok(!/\b(engineering|ingenier)/i.test(t.name), `${id} name must describe a format, not a topic`);
    assert.ok(!EMOJI.test(JSON.stringify(t)), `${id} has emoji`);
    assert.equal(t.defaults.captions.enabled, false, `${id}: the dialog box shows the narration`);
    const ex = example(id);
    assert.equal(ex.template, id);
    const r = validateSpec(ex);
    assert.equal(r.ok, true, `${id}: ${JSON.stringify(r.errors)}`);
    assert.ok(ex.scenes.every((s) => s.visual.type === "pixel"), `${id}: every example scene is a pixel scene`);
    assert.ok(!EMOJI.test(JSON.stringify(ex)), `${id} example has emoji`);
  }
  const sets = new Set(PIXEL.flatMap((id) => example(id).scenes.map((s) => s.visual.pixel.set)));
  assert.ok(sets.size >= 7, `examples cover most sets, got ${[...sets].join(", ")}`);
});

test("every look maps every color role, and the mono look draws with exactly 4 colors", () => {
  for (const id of PIXEL) {
    const l = PIXEL_LOOKS[id];
    for (const r of ROLES) assert.match(l.roles[r] ?? "", /^#[0-9A-Fa-f]{6}$/, `${id}.${r}`);
    assert.ok(lookPalette(id).length <= 24, `${id} palette is limited`);
  }
  assert.equal(lookPalette("pixel-mono").length, 4);
  for (const c of Object.values(PIXEL_LOOKS["pixel-mono"].roles)) assert.ok(lookPalette("pixel-mono").includes(c.toUpperCase()), c);
});

test("pixel math helpers are pure and deterministic", () => {
  assert.equal(snap(3.49), 3);
  assert.equal(snap(-2.6), -3);
  const flat = BAYER4.flat().sort((a, b) => a - b);
  assert.deepEqual(flat, Array.from({ length: 16 }, (_, i) => i));
  assert.equal(bayer(0, 0), bayer(4, 8));
  assert.equal(bayer(-1, -1), bayer(3, 3));
  // a 50 % blend picks exactly half the pixels of every 4x4 tile; 0 and 1 pick none / all
  const count = (ratio) => Array.from({ length: 16 }, (_, i) => ditherPick(i % 4, Math.floor(i / 4), ratio)).filter(Boolean).length;
  assert.equal(count(0.5), 8);
  assert.equal(count(0), 0);
  assert.equal(count(1), 16);
  assert.deepEqual(hexToRgb("#FF8000"), [255, 128, 0]);
  assert.deepEqual(hexToRgb("#f80"), [255, 136, 0]);
  const pal = ["#0F380F", "#306230", "#8BAC0F", "#9BBC0F"].map(hexToRgb);
  assert.equal(nearestIndex(pal, 0, 0, 0), 0);
  assert.equal(nearestIndex(pal, 255, 255, 255), 3);
  const px = new Uint8ClampedArray([10, 10, 10, 255, 200, 220, 40, 200, 1, 2, 3, 20]);
  const copy = new Uint8ClampedArray(px);
  quantizePixels(px, pal);
  assert.deepEqual([...px], [15, 56, 15, 255, 155, 188, 15, 255, 1, 2, 3, 0]);
  quantizePixels(copy, pal);
  assert.deepEqual([...copy], [...px], "same input, same output");
  for (const move of ["pan-left", "pan-right", "rise", "static"]) {
    for (const t of [0, 1.3, 2.7, 5]) {
      const o = cameraOffset(move, t, 5);
      assert.ok(Number.isInteger(o.x) && Number.isInteger(o.y), `${move}@${t} snapped`);
      assert.deepEqual(cameraOffset(move, t, 5), o);
    }
  }
  assert.ok(cameraOffset("pan-left", 0, 5).x > cameraOffset("pan-left", 5, 5).x);
});

test("planPixel resolves cameras, transitions, prop entrances and SFX beats", () => {
  const spec = resolveSpec(example("pixel-dusk"), getTemplate("pixel-dusk"));
  const timeline = computeTimeline(spec.scenes, { fps: 30 });
  const plan = planPixel(spec, timeline);
  assert.equal(plan.length, spec.scenes.length);
  for (const [i, p] of plan.entries()) {
    assert.equal(p.kind, "pixel");
    assert.ok(SET_IDS.includes(p.set));
    assert.ok(["pan-left", "pan-right", "rise", "static"].includes(p.camera));
    assert.ok(["iris", "dissolve", "cut"].includes(p.transition));
    const props = spec.scenes[i].visual.pixel.props ?? [];
    assert.equal(p.props.length, props.length);
    for (const q of p.props) assert.ok(q.x >= 0 && q.x <= 1 && q.enter >= 0);
  }
  assert.deepEqual(planPixel(spec, timeline), plan, "deterministic");
  const beats = computeBeats(plan, timeline, 30);
  assert.ok(beats.filter((b) => b.kind === "cut").length === spec.scenes.length - 1);
  assert.ok(beats.some((b) => b.kind === "pop"));
  assert.ok(PROP_KINDS.length >= 18);
});

test("pixel templates pick a playful music mood", () => {
  for (const id of PIXEL) assert.equal(autoMood({ title: "x", template: id, scenes: [{ narration: "x" }] }), "upbeat-fun", id);
});

test("UI text helpers wrap, fit, format and type the dialog deterministically", async () => {
  const { wrapMono, fitMono, formatCount, dialogAt } = await import("../lib/pixel.mjs");
  assert.deepEqual(wrapMono("Nunca sin estas 5 herramientas", 12), ["Nunca sin", "estas 5", "herramientas"]);
  const fit = fitMono("Nunca sin estas 5 herramientas", { maxWidth: 880, sizes: [48, 40, 32], maxLines: 2 });
  assert.equal(fit.size, 48);
  assert.deepEqual(fit.lines, ["Nunca sin estas 5", "herramientas"]);
  assert.ok(fit.lines.length <= 2 && fit.lines.every((l) => l.length * fit.size <= 880));
  assert.equal(fitMono("Hola", { maxWidth: 880, sizes: [48, 40], maxLines: 1 }).size, 48);
  assert.equal(formatCount(12220), "12.220");
  assert.equal(formatCount(3120), "3.120");
  assert.equal(formatCount(999), "999");
  assert.equal(formatCount(-1000000), "-1.000.000");
  const pages = [
    { startMs: 0, endMs: 1000, words: [{ text: "Hola", startMs: 0, endMs: 500 }, { text: " mundo.", startMs: 500, endMs: 1000 }] },
    { startMs: 1200, endMs: 2000, words: [{ text: " Otra", startMs: 1200, endMs: 2000 }] },
  ];
  assert.equal(dialogAt(pages, -10), null);
  assert.equal(dialogAt(pages, 499).text, "Hola");
  assert.equal(dialogAt(pages, 600).text, "Hola mu");
  assert.deepEqual(dialogAt(pages, 1100), { text: "Hola mundo.", full: "Hola mundo.", done: true, page: 0 });
  assert.equal(dialogAt(pages, 1250).page, 1);
  assert.equal(dialogAt(pages, 2000 + 1499).text, "Otra");
  assert.equal(dialogAt(pages, 2000 + 1501), null);
});

test("dialog pages hold one sentence per box and split long sentences near two lines", async () => {
  const { dialogPages } = await import("../lib/pixel.mjs");
  const mk = (texts, gap = 0) => texts.map((text, i) => ({ text: (i ? " " : "") + text, startMs: i * 300 + (i >= 3 ? gap : 0), endMs: i * 300 + 280 + (i >= 3 ? gap : 0) }));
  const caps = mk(["Esto", "es", "corto.", "Otra", "frase", "aqui."]);
  const pages = dialogPages([{ startMs: 0, endMs: 2000, words: caps.slice(0, 4) }, { startMs: 0, endMs: 2000, words: caps.slice(4) }]);
  assert.deepEqual(pages.map((p) => p.words.map((w) => w.text.trim()).join(" ")), ["Esto es corto.", "Otra frase aqui."]);
  assert.equal(pages[1].startMs, caps[3].startMs);
  const long = mk(Array.from({ length: 20 }, (_, i) => `palabra${i}`));
  const split = dialogPages([{ startMs: 0, endMs: 9000, words: long }], { maxChars: 40 });
  assert.ok(split.length >= 4 && split.every((p) => p.words.map((w) => w.text.trim()).join(" ").length <= 40));
  const sentence = mk("Cada servidor encendido cuesta dinero, aunque nadie lo use.".split(" "));
  const halves = dialogPages([{ startMs: 0, endMs: 9000, words: sentence }], { maxChars: 58 }).map((p) => p.words.length);
  assert.equal(halves.length, 2);
  assert.ok(Math.min(...halves) >= 3, `balanced split, got ${halves}`);
  const paused = dialogPages([{ startMs: 0, endMs: 9000, words: mk(["uno", "dos", "tres", "cuatro"], 900) }]);
  assert.equal(paused.length, 2);
});

test("bannerFace: accented capitals avoid Press Start 2P (it draws Í/É as lowercase), plain text keeps it", async () => {
  const { bannerFace } = await import("../lib/pixel.mjs");
  // Ñ renders fine in Press Start 2P (checked in the T4 stills), only accented vowels do not
  for (const t of ["Nunca sin estas 5 herramientas", "AÑO NUEVO", "Diseño de verdad"]) assert.deepEqual(bannerFace(t), { face: "press", advance: 1 }, t);
  for (const t of ["Sígueme para más", "Récords imposibles", "Qué pasó"]) {
    assert.equal(bannerFace(t).face, "silkscreen", t);
    assert.ok(bannerFace(t).advance < 1 && bannerFace(t).advance >= 0.875, t);
  }
});
