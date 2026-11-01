// Reels family (becario-reels port): word-synced moments, auto-distribution, styles + palette roles, planning.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADELANTO,
  REEL_SCENE_TYPES,
  REEL_STYLE_IDS,
  REELS_TEMPLATE_IDS,
  computeReelsTimeline,
  defaultPalette,
  distributeMoments,
  parseMoment,
  parseNarration,
  planReels,
  reelColors,
  reelsIssues,
  reelsTtsText,
  resolveMoment,
  sceneTypeOf,
  usesReelsKit,
  wordFrame,
} from "../lib/reels.mjs";

// ---------------------------------------------------------------- parseMoment

test("parseMoment reads every form of a moment", () => {
  assert.deepEqual(parseMoment("palabra"), { kind: "word", word: "palabra", nth: 1, offset: 0 });
  assert.deepEqual(parseMoment("palabra#2"), { kind: "word", word: "palabra", nth: 2, offset: 0 });
  assert.deepEqual(parseMoment("palabra+6"), { kind: "word", word: "palabra", nth: 1, offset: 6 });
  assert.deepEqual(parseMoment("palabra-4"), { kind: "word", word: "palabra", nth: 1, offset: -4 });
  assert.deepEqual(parseMoment("palabra#2+6"), { kind: "word", word: "palabra", nth: 2, offset: 6 });
  assert.deepEqual(parseMoment("inicio"), { kind: "start", offset: 0 });
  assert.deepEqual(parseMoment("fin"), { kind: "end", offset: 0 });
  assert.deepEqual(parseMoment("fin-10"), { kind: "end", offset: -10 });
  assert.deepEqual(parseMoment("inicio+3"), { kind: "start", offset: 3 });
  assert.deepEqual(parseMoment(12), { kind: "frame", frame: 12 });
  assert.deepEqual(parseMoment("  código  "), { kind: "word", word: "código", nth: 1, offset: 0 });
  assert.equal(parseMoment(""), null);
  assert.equal(parseMoment("#2"), null);
  assert.equal(parseMoment(null), null);
});

// ---------------------------------------------------------------- resolveMoment

// Words of «Esta skill escribe animación y escribes 1.500 € con código, código.» at 10 frames per word,
// scene cut at frame 100 (ini 95 because of a soft entrance), scene end at 300.
const words = ["Esta", "skill", "escribe", "animación", "y", "escribes", "1.500", "€", "con", "código,", "código."].map((w, k) => ({ w, f: 110 + k * 10 }));
const ctx = { words, cut: 100, ini: 95, end: 300 };

test("resolveMoment: a word fires on its appearance frame, exact match before prefix", () => {
  assert.deepEqual(resolveMoment("skill", ctx), { frame: 120 });
  assert.deepEqual(resolveMoment("escribe", ctx), { frame: 130 }); // not «escribes»
  assert.deepEqual(resolveMoment("escribes", ctx), { frame: 160 });
  assert.deepEqual(resolveMoment("anim", ctx), { frame: 140 }); // prefix: «animación»
  assert.deepEqual(resolveMoment("ANIMACION", ctx), { frame: 140 }); // case and accents ignored
  assert.deepEqual(resolveMoment("1500", ctx), { frame: 170 }); // numbers without dots
  assert.deepEqual(resolveMoment("codigo", ctx), { frame: 200 }); // punctuation ignored
});

test("resolveMoment: #n picks the n-th occurrence and +/- shift frames", () => {
  assert.deepEqual(resolveMoment("código#2", ctx), { frame: 210 });
  assert.deepEqual(resolveMoment("código+6", ctx), { frame: 206 });
  assert.deepEqual(resolveMoment("código-4", ctx), { frame: 196 });
  assert.deepEqual(resolveMoment("código#2+12", ctx), { frame: 222 });
});

test("resolveMoment: inicio / fin / numeric frames", () => {
  assert.deepEqual(resolveMoment("inicio", ctx), { frame: 100 }); // the cut
  assert.deepEqual(resolveMoment("inicio+3", ctx), { frame: 103 });
  assert.deepEqual(resolveMoment("fin", ctx), { frame: 299 });
  assert.deepEqual(resolveMoment("fin-10", ctx), { frame: 289 });
  assert.deepEqual(resolveMoment(12, ctx), { frame: 107 }); // frames from the scene start (ini)
});

test("resolveMoment: unknown words and a missing occurrence are errors that list the words", () => {
  const r = resolveMoment("pizza", ctx);
  assert.match(r.error, /pizza/);
  assert.match(r.error, /Esta skill escribe/);
  assert.match(resolveMoment("skill#2", ctx).error, /skill/);
  assert.match(resolveMoment("#", ctx).error, /moment/);
});

test("words appear 4 frames before they are heard, never before the cut", () => {
  assert.equal(ADELANTO, 4);
  assert.equal(wordFrame(2.0, 0, 30), 56); // 60 - 4
  assert.equal(wordFrame(2.0, 58, 30), 58); // clamped to the cut
});

// ---------------------------------------------------------------- distributeMoments

test("distributeMoments spreads all moments when none are given", () => {
  assert.deepEqual(distributeMoments([], 1, 90), [2]);
  assert.deepEqual(distributeMoments([], 3, 100), [2, 36, 70]); // 2 .. 70 % of the scene
  assert.deepEqual(distributeMoments([], 2, 6), [2, 8]); // short scenes still reach frame 8
});

test("distributeMoments fills only the missing moments after the last given one", () => {
  assert.deepEqual(distributeMoments([10], 3, 100), [10, 36, 62]); // between 10 and dur - 12
  assert.deepEqual(distributeMoments([10, 20, 30], 3, 100), [10, 20, 30]);
  assert.deepEqual(distributeMoments([10, 20, 30, 40], 3, 100), [10, 20, 30]); // extra moments are ignored
});

// ---------------------------------------------------------------- narration keywords

test("parseNarration marks *keyword* groups and strips the asterisks", () => {
  const w = parseNarration("No es una *IA de vídeo:* es *código.*");
  assert.deepEqual(w.map((x) => x.w), ["No", "es", "una", "IA", "de", "vídeo:", "es", "código."]);
  assert.deepEqual(w.map((x) => x.clave), [false, false, false, true, true, true, false, true]);
  assert.equal(w[3].g, w[5].g);
  assert.notEqual(w[3].g, w[7].g);
  assert.equal(w[0].g, -1);
  assert.equal(reelsTtsText({ narration: "Es *código.*", visual: { type: "reel", reel: { type: "headline" } } }), "Es código.");
  assert.equal(reelsTtsText({ narration: "Hola *Claude*", visual: { type: "reel", reel: { type: "headline", voz: "Hola Clod" } } }), "Hola Clod");
});

// ---------------------------------------------------------------- styles and palette roles

test("five series styles, one reels template per style", () => {
  assert.deepEqual(REEL_STYLE_IDS, ["nube", "noche", "menta", "limon", "pizarra"]);
  assert.deepEqual(REELS_TEMPLATE_IDS, ["reels-nube", "reels-noche", "reels-menta", "reels-limon", "reels-pizarra"]);
  assert.ok(usesReelsKit("reels-limon"));
  assert.ok(!usesReelsKit("illustrated"));
  assert.equal(REEL_SCENE_TYPES.length, 18);
});

test("scene types accept English ids and the pack's Spanish names", () => {
  assert.equal(sceneTypeOf({ type: "counter" }), "counter");
  assert.equal(sceneTypeOf({ tipo: "contador" }), "counter");
  assert.equal(sceneTypeOf({ tipo: "titular" }), "headline");
  assert.equal(sceneTypeOf({ tipo: "comparación" }), "compare");
  assert.equal(sceneTypeOf({ type: "nope" }), null);
});

test("the template palette maps 1:1 onto the style roles", () => {
  for (const id of REEL_STYLE_IDS) {
    const base = reelColors(id);
    assert.deepEqual(reelColors(id, defaultPalette(id)), base, id);
    assert.equal(defaultPalette(id).accent, base.acento);
    assert.equal(defaultPalette(id).bg[0], base.fondo);
    assert.equal(defaultPalette(id).text, base.texto);
  }
});

test("a palette override recolors the roles with readable text on top", () => {
  const nube = reelColors("nube");
  const orange = reelColors("nube", { ...defaultPalette("nube"), accent: "#FFB000" });
  assert.equal(orange.acento, "#FFB000");
  assert.notEqual(orange.acentoTexto, "#FFFFFF"); // dark text on a light accent
  assert.equal(orange.fondo, nube.fondo); // background untouched
  const blue = reelColors("limon", { ...defaultPalette("limon"), accent: "#1530A0" });
  assert.equal(blue.acentoTexto, "#FFFFFF");

  const dark = reelColors("nube", { bg: ["#101418", "#1B2128"], text: "#F2F4F8", accent: "#22D3EE" });
  assert.equal(dark.fondo, "#101418");
  assert.equal(dark.fondo2, "#1B2128");
  assert.equal(dark.texto, "#F2F4F8");
  assert.notEqual(dark.tarjeta, "#FFFFFF"); // cards follow the dark background
  assert.equal(dark.tarjetaTexto, "#F2F4F8");
  assert.equal(dark.manchas.length, 3);
  for (const v of Object.values(dark).flat()) assert.match(v, /^#[0-9A-F]{6}$/i);
  // short hex is expanded
  assert.equal(reelColors("menta", { ...defaultPalette("menta"), accent: "#f0a" }).acento, "#FF00AA");
});

// ---------------------------------------------------------------- timeline + plan

const resolved = (scenes, extra = {}) => ({
  version: 1,
  title: "Prueba",
  template: "reels-nube",
  language: "es",
  format: { width: 1080, height: 1920, fps: 30 },
  theme: { palette: defaultPalette("nube"), font: "Manrope", captionStyle: "clean" },
  voice: { provider: "none" },
  music: { volume: 0.1 },
  sfx: { enabled: true, volume: 1 },
  captions: { enabled: true, wordsPerPage: 6 },
  scenes,
  ...extra,
});

const cap = (text, startMs, endMs) => ({ text, startMs, endMs, timestampMs: (startMs + endMs) / 2, confidence: null });

test("computeReelsTimeline keeps the shape of computeTimeline with short pauses and no transition overlap", () => {
  const tl = computeReelsTimeline([{ audioSec: 2, narration: "a" }, { audioSec: 1, narration: "b" }], { fps: 30 });
  assert.equal(tl.transitionFrames, 0);
  assert.equal(tl.scenes[1].from, tl.scenes[0].durationInFrames);
  const gap = tl.scenes[1].speechStartMs - (tl.scenes[0].speechStartMs + 2000);
  assert.ok(gap > 100 && gap < 450, `pause ${gap} ms`);
  assert.equal(tl.totalFrames, tl.scenes[1].from + tl.scenes[1].durationInFrames);
});

test("planReels cuts each scene one frame before its first word and resolves `en` on word timings", () => {
  const spec = resolved([
    { id: "a", narration: "Esta skill hace *reels enteros*", visual: { type: "reel", reel: { type: "headline", texto: "Reels / *enteros*", icono: "film", en: ["reels"] } } },
    { id: "b", narration: "Ahorras *50 euros* al mes", visual: { type: "reel", reel: { tipo: "contador", valor: 50, sufijo: " €", etiqueta: "ahorras al mes", en: ["ahorras", "mes+2"], entrada: "corte" } } },
    { id: "c", narration: "Tres pasos y listo", visual: { type: "reel", reel: { type: "steps", pasos: ["Uno", "Dos", "Tres"], entrada: "suave" } } },
  ]);
  const captions = [
    cap("Esta", 100, 300), cap(" skill", 300, 600), cap(" hace", 600, 800), cap(" *reels", 800, 1100), cap(" enteros*", 1100, 1500),
    cap(" Ahorras", 2000, 2300), cap(" *50", 2300, 2500), cap(" euros*", 2500, 2800), cap(" al", 2800, 2900), cap(" mes", 2900, 3200),
    cap(" Tres", 4000, 4200), cap(" pasos", 4200, 4500), cap(" y", 4500, 4600), cap(" listo", 4600, 5000),
  ];
  const timeline = { scenes: [], totalFrames: 180, transitionFrames: 0 };
  const plan = planReels(spec, timeline, captions);
  assert.equal(plan.style, "nube");
  assert.equal(plan.family, "suave");
  assert.equal(plan.scenes.length, 3);
  const [a, b, c] = plan.scenes;
  assert.equal(a.ini, 0);
  assert.equal(a.type, "headline");
  assert.deepEqual(a.b, [24 - ADELANTO]); // «reels» at 0.8 s
  // scene b: hard cut 1 frame before «Ahorras» (2.0 s = frame 60)
  assert.equal(b.entrada, "corte");
  assert.equal(b.ini, 59);
  assert.equal(a.fin, 59);
  assert.deepEqual(b.b, [Math.max(59, 60 - ADELANTO) - 59, 87 - ADELANTO + 2 - 59]);
  assert.equal(b.p.valor, 50);
  assert.equal(b.p.tipo, undefined);
  // scene c: soft entrance overlaps 5 frames before the cut and the previous scene stays 5 frames after it
  assert.equal(c.entrada, "suave");
  assert.equal(c.ini, 119 - 5);
  assert.equal(b.fin, 119 + 5);
  assert.equal(c.fin, 180);
  assert.equal(c.b.length, 3); // auto-distributed
  assert.ok(c.b[0] < c.b[1] && c.b[1] < c.b[2]);
  // words with relative frames and keyword flags
  assert.deepEqual(b.palabras.map((p) => p.w), ["Ahorras", "50", "euros", "al", "mes"]);
  assert.deepEqual(b.palabras.map((p) => p.clave), [false, true, true, false, false]);
  // subtitles: one phrase per scene in seconds
  assert.equal(plan.frases[1].inicio, 2);
  assert.equal(plan.frases[1].palabras[1].clave, true);
  // sounds: the counter's hit on its second moment
  assert.ok(plan.sounds.some((s) => s.s === "golpe" && s.at === b.ini + b.b[1]));
  assert.ok(plan.sounds.every((s) => s.vol > 0 && s.vol <= 1));
});

test("planReels: first scene is always a cut; style family picks the default entrance; spec transition wins", () => {
  const scenes = [
    { id: "a", narration: "uno dos", visual: { type: "reel", reel: { type: "headline", texto: "uno dos" } } },
    { id: "b", narration: "tres cuatro", visual: { type: "reel", reel: { type: "headline", texto: "tres" } } },
  ];
  const captions = [cap("uno", 0, 300), cap(" dos", 300, 600), cap(" tres", 1000, 1300), cap(" cuatro", 1300, 1600)];
  const tl = { scenes: [], totalFrames: 90, transitionFrames: 0 };
  const soft = planReels(resolved(scenes), tl, captions);
  assert.equal(soft.scenes[0].entrada, "corte");
  assert.equal(soft.scenes[1].entrada, "suave");
  const marked = planReels(resolved(scenes, { template: "reels-limon", theme: { palette: defaultPalette("limon") } }), tl, captions);
  assert.equal(marked.family, "marcado");
  assert.equal(marked.scenes[1].entrada, "corte");
  const half = planReels(resolved(scenes, { reels: { transition: "halftone" } }), tl, captions);
  assert.equal(half.scenes[1].entrada, "semitono");
  const none = planReels(resolved(scenes, { reels: { subtitles: "none" } }), tl, captions);
  assert.equal(none.subtitles, "no");
  assert.equal(planReels(resolved(scenes, { reels: { subtitles: "bloque" } }), tl, captions).subtitles, "bloque");
});

test("planReels falls back to text-timed words when captions do not match the script", () => {
  const spec = resolved([{ id: "a", narration: "uno dos tres", visual: { type: "reel", reel: { type: "list", items: ["a", "b"], en: ["dos", "tres"] } } }]);
  const tl = computeReelsTimeline([{ narration: "uno dos tres" }], { fps: 30 });
  const plan = planReels(spec, tl, []);
  assert.equal(plan.scenes[0].palabras.length, 3);
  assert.ok(plan.scenes[0].b[0] < plan.scenes[0].b[1]);
});

// ---------------------------------------------------------------- validation

test("reelsIssues validates scene types, fields, lengths and `en` words against the narration", () => {
  const ok = resolved([{ id: "a", narration: "Comenta *LISTA* y te mando los trucos", visual: { type: "reel", reel: { type: "cta", palabra: "LISTA", texto: "y te mando / los trucos", en: ["LISTA", "mando", "trucos"] } } }]);
  assert.deepEqual(reelsIssues(ok), []);
  const bad = resolved([
    { id: "a", narration: "uno dos", visual: { type: "reel", reel: { type: "nope" } } },
    { id: "b", narration: "uno dos", visual: { type: "reel", reel: { type: "counter", etiqueta: "x" } } },
    { id: "c", narration: "uno dos", visual: { type: "reel", reel: { type: "headline", texto: "uno dos", en: ["pizza", "dos#3", "fin"] } } },
    { id: "d", narration: "uno dos", visual: { type: "gradient" } },
    { id: "e", narration: "uno dos", visual: { type: "reel", reel: { type: "list", items: ["a"] } } },
    { id: "f", narration: "uno dos", visual: { type: "reel", reel: { type: "headline", texto: "Hola 🚀" } } },
  ]);
  const issues = reelsIssues(bad);
  const at = (p) => issues.filter((x) => x.path.join(".").startsWith(p)).map((x) => x.message).join(" | ");
  assert.match(at("scenes.0.visual.reel"), /unknown reel scene type "nope"/);
  assert.match(at("scenes.1.visual.reel"), /valor/);
  assert.match(at("scenes.2.visual.reel.en.0"), /"pizza" is not in the narration/);
  assert.match(at("scenes.2.visual.reel.en.1"), /dos/);
  assert.equal(at("scenes.2.visual.reel.en.2"), "");
  assert.match(at("scenes.3.visual"), /reel/);
  assert.match(at("scenes.4.visual.reel"), /items/);
  assert.match(at("scenes.5"), /emoji/);
});

// ---------------------------------------------------------------- templates + examples

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const readJson = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));

test("the five reels templates are valid JSON with gallery metadata, category reels-2d and the style's palette", async () => {
  const { TEMPLATE_IDS, validateSpec } = await import("../lib/spec.mjs");
  const wired = REELS_TEMPLATE_IDS.every((id) => TEMPLATE_IDS.includes(id));
  for (const style of REEL_STYLE_IDS) {
    const t = readJson(`../templates/reels-${style}.json`);
    assert.equal(t.id, `reels-${style}`);
    assert.equal(t.category, "reels-2d");
    for (const k of ["name", "description", "prompt_hint", "best_for", "preview", "defaults"]) assert.ok(t[k], `${t.id} missing ${k}`);
    assert.ok(t.preview.style && t.preview.gradient.length >= 2 && t.preview.accent && t.preview.sample_text, `${t.id} preview`);
    assert.deepEqual(t.defaults.theme.palette, defaultPalette(style));
    // the hint teaches the whole scene vocabulary and the `en` moments
    for (const type of REEL_SCENE_TYPES) assert.ok(t.prompt_hint.includes(type), `${t.id} hint lacks ${type}`);
    for (const form of ['"en"', '"word#2"', '"word+6"', '"inicio"', "*asterisks*"]) assert.ok(t.prompt_hint.includes(form), `${t.id} hint lacks ${form}`);
    assert.doesNotMatch(JSON.stringify(t), /[\u{1F300}-\u{1FAFF}]/u);
    if (wired) {
      const probe = { version: 1, title: "x", template: t.id, ...t.defaults, scenes: [{ id: "s", narration: "Hola *mundo*", visual: { type: "reel", reel: { type: "headline", texto: "Hola / *mundo*", en: ["mundo"] } } }] };
      delete probe.animation;
      const r = validateSpec(probe);
      assert.equal(r.ok, true, `${t.id}: ${JSON.stringify(r.errors)}`);
    }
  }
});

test("the reels examples validate and plan without warnings", async () => {
  const { TEMPLATE_IDS, validateSpec } = await import("../lib/spec.mjs");
  for (const f of ["reels-noche", "reels-catalog"]) {
    const spec = readJson(`../examples/${f}.spec.json`);
    assert.deepEqual(reelsIssues(spec), [], f);
    if (TEMPLATE_IDS.includes(spec.template)) assert.equal(validateSpec(spec).ok, true, f);
    const full = resolved(spec.scenes, { template: spec.template, reels: spec.reels, theme: { palette: defaultPalette(spec.template.slice(6)) } });
    const plan = planReels(full, computeReelsTimeline(full.scenes, { fps: 30 }), []);
    assert.deepEqual(plan.warnings, [], f);
    assert.equal(plan.scenes.length, spec.scenes.length);
  }
});

test("per-scene sfx add sounds on their moment; the editor's `sonidos` chips stay scene fields", () => {
  const spec = resolved([
    { id: "a", narration: "Todo con código", visual: { type: "reel", reel: { type: "editor", sonidos: ["pop", "ding"], sfx: [["código", "campana", 0.4]] } } },
    { id: "b", narration: "uno dos", visual: { type: "reel", reel: { type: "headline", texto: "uno", sonidos: [["dos", "tic"]] } } },
  ]);
  const caps = [cap("Todo", 0, 300), cap(" con", 300, 500), cap(" código", 500, 900), cap(" uno", 1200, 1400), cap(" dos", 1400, 1700)];
  const plan = planReels(spec, { scenes: [], totalFrames: 90, transitionFrames: 0 }, caps);
  assert.deepEqual(plan.scenes[0].p.sonidos, ["pop", "ding"]);
  assert.equal(plan.scenes[0].p.sfx, undefined);
  assert.ok(plan.sounds.some((s) => s.s === "campana" && s.at === 15 - ADELANTO && s.vol === 0.4));
  assert.equal(plan.scenes[1].p.sonidos, undefined); // the pack's phrase-level form is a sound list
  assert.ok(plan.sounds.some((s) => s.s === "tic" && s.at === 42 - ADELANTO));
  assert.match(reelsIssues(resolved([{ id: "a", narration: "uno", visual: { type: "reel", reel: { type: "headline", texto: "uno", sfx: [["uno", "boom"]] } } }]))[0].message, /unknown sound "boom"/);
});

test("planReels pulls a late first moment forward so a scene never sits empty for more than 0.8 s", () => {
  const spec = resolved([
    { id: "a", narration: "Hola", visual: { type: "reel", reel: { type: "headline", texto: "Hola" } } },
    { id: "b", narration: "Sus torres se alzan *227 metros* sobre el agua", visual: { type: "reel", reel: { type: "counter", valor: 227, sufijo: " m", etiqueta: "de altura", en: ["227", "agua"], entrada: "corte" } } },
  ]);
  const captions = [
    cap("Hola", 100, 900),
    cap(" Sus", 2000, 2200), cap(" torres", 2200, 2600), cap(" se", 2600, 2700), cap(" alzan", 2700, 3200), cap(" *227", 3300, 3900), cap(" metros*", 3900, 4300),
    cap(" sobre", 4300, 4500), cap(" el", 4500, 4600), cap(" agua", 4600, 5200),
  ];
  const plan = planReels(spec, { scenes: [], totalFrames: 180, transitionFrames: 0 }, captions);
  const b = plan.scenes[1];
  // «227» is said 1.3 s after the cut: the first element enters at most 0.8 s (24 frames) after the cut
  assert.ok(b.ini + b.b[0] - 59 <= 24, `first element enters ${b.ini + b.b[0] - 59} frames after the cut`);
  // the second moment keeps its word sync («agua» at 4.6 s = frame 138)
  assert.equal(b.ini + b.b[1], 138 - ADELANTO);
  assert.ok(plan.warnings.some((w) => /pulled forward/.test(w)), "the clamp is reported");
});
