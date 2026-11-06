// U10 readability tests for pixel-world: style guidance, functional contrast in every style, HUD labels that fit, hero placement,
// foreground silhouettes without hard black blocks and visible beat feedback. Rendering checks run the real runtime in a vm sandbox.
import { test } from "node:test";
import assert from "node:assert/strict";
import { promptSection, catalog } from "../hf/pixel-world/index.mjs";
import { STYLES, STYLE_GUIDE, recommendStyles } from "../hf/pixel-world/styles.mjs";
import { styleAdvice } from "../hf/pixel-world/normalize.mjs";
import { ZONES, hudZonesFor, hudRects, bandRect, rectsOverlap } from "../hf/pixel-world/layout.mjs";
import { open, prepare } from "../hf/pixel-world/sandbox.mjs";

const WORDS = "uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis".split(" ").map((text, i) => ({ text, start: +(i * 0.75).toFixed(2), end: +(i * 0.75 + 0.6).toFixed(2) }));
const cat = catalog();
const world = (hf, extra = {}) => prepare({ hf: { style: "pixel-snes-16bit", ...hf }, words: WORDS, durationSec: 12, ...extra });
const ratio = (f, a, b) => f.run(`contrastRatio(${JSON.stringify(a)}, ${JSON.stringify(b)})`);

// ------------------------------------------------------------------------------------------------ 1a style guidance
test("the prompt carries a style table with mood, colour count and good-for / avoid for every style", () => {
  assert.match(promptSection, /\| style \| mood \| colours \| good for \| avoid \|/);
  for (const s of STYLES) {
    assert.ok(promptSection.includes(`| ${s.id} |`), `${s.id} missing from the style table`);
    const g = STYLE_GUIDE[s.id];
    assert.ok(g && g.mood && g.goodFor && g.avoid, `${s.id} guide incomplete`);
  }
  assert.match(promptSection, /monochrome styles .* only when the user asks for retro|only when the user asks for retro/i);
  assert.match(promptSection, /tech and AI.*cyberpunk/i);
  assert.match(promptSection, /kids.*snes.*pico8|kids.*pico8/i);
  assert.match(promptSection, /serious.*noir/i);
});

test("recommendStyles picks by topic: tech -> cyberpunk/snes/crt, kids -> snes/pico8, security -> noir/crt", () => {
  assert.ok(recommendStyles("por que tu celular se calienta: la bateria y el procesador de la IA").some((id) => ["pixel-cyberpunk-neon", "pixel-snes-16bit", "pixel-crt-arcade"].includes(id)));
  assert.ok(recommendStyles("cuento para ninos: amigos y juegos divertidos").slice(0, 2).some((id) => ["pixel-snes-16bit", "pixel-pico8"].includes(id)));
  assert.ok(recommendStyles("seguridad: contrasenas, hackers y privacidad").slice(0, 2).some((id) => ["pixel-noir", "pixel-crt-arcade"].includes(id)));
  assert.equal(recommendStyles("").length >= 1, true);
});

// ------------------------------------------------------------------------------------------------ 1c style advice
test("styleAdvice warns, never overrides: missing style, or a monochrome style for a topic that is not retro", () => {
  const noStyle = styleAdvice({ worlds: [] }, "por que tu celular se calienta");
  assert.equal(noStyle.length, 1); assert.match(noStyle[0], /style is missing/i); assert.match(noStyle[0], /pixel-/);
  const mono = styleAdvice({ style: "pixel-gameboy-dmg" }, "por que tu celular se calienta");
  assert.equal(mono.length, 1); assert.match(mono[0], /monochrome/i); assert.match(mono[0], /retro/i);
  assert.deepEqual(styleAdvice({ style: "pixel-gameboy-dmg" }, "un repaso a la consola portatil Game Boy de Nintendo"), []);
  assert.deepEqual(styleAdvice({ style: "pixel-gameboy-dmg" }, "videojuegos retro de los noventa"), []);
  assert.deepEqual(styleAdvice({ style: "pixel-cyberpunk-neon" }, "por que tu celular se calienta"), []);
  const raw = { style: "pixel-1bit-dither" }; styleAdvice(raw, "x"); assert.equal(raw.style, "pixel-1bit-dither");
});

// ------------------------------------------------------------------------------------------------ 1b functional contrast
test("functional elements use a palette pair with WCAG >= 3:1 (graphics) and >= 4.5:1 (text) in all 14 styles", () => {
  assert.equal(STYLES.length, 14);
  for (const st of STYLES) {
    const f = open(world({ style: st.id, worlds: [{ scenario: "factory", beats: [] }] }));
    const fn = f.run("fnLook()");
    assert.ok(ratio(f, fn.track, fn.fill) >= 3, `${st.id}: bar fill ${fn.fill} on track ${fn.track} = ${ratio(f, fn.track, fn.fill).toFixed(2)}`);
    assert.ok(ratio(f, fn.track, fn.frame) >= 3, `${st.id}: frame on track`);
    assert.ok(ratio(f, fn.ink, fn.frame) >= 3, `${st.id}: outline vs frame`);
    assert.ok(ratio(f, fn.track, fn.text) >= 4.5, `${st.id}: label text ${fn.text} on plate ${fn.track} = ${ratio(f, fn.track, fn.text).toFixed(2)}`);
    assert.ok(ratio(f, fn.track, fn.value) >= 4.5, `${st.id}: counter value on plate`);
    for (const c of [fn.track, fn.fill, fn.frame, fn.text, fn.value, fn.ink]) assert.ok(st.palette.includes(c) || /^#[0-9a-f]{6}$/i.test(c), `${st.id}: ${c} not from the palette`);
    for (const c of [fn.track, fn.fill, fn.frame, fn.text, fn.value, fn.ink]) assert.ok(f.run(`PALHEX.includes(${JSON.stringify(c)})`), `${st.id}: ${c} is not a palette colour`);
  }
});

// ------------------------------------------------------------------------------------------------ 2 HUD labels
const LONG = ["CULPABLES", "TEMPERATURA", "BATERIA", "CARGA", "GRADOS", "MAXIMO ABSOLUTO!", "X"];
test("HUD labels fit the box in every style: auto-abbreviated, never clipped, 2x styles get a wider HUD", () => {
  for (const st of STYLES) {
    const f = open(world({ style: st.id, worlds: [{ scenario: "battery-lab", beats: [] }] }));
    const px = st.px, z = hudZonesFor(px);
    for (const label of LONG) for (const val of ["4", "45", "100"]) {
      const lay = f.run(`hudCounterLayout(${JSON.stringify(label)}, ${JSON.stringify(val)})`);
      assert.ok(lay.w <= z.counter.w, `${st.id} ${label} ${val}: chip ${lay.w} wider than ${z.counter.w}`);
      assert.ok(lay.textW + 2 * lay.pad <= lay.w + 0.001, `${st.id} ${label}: text clipped inside its chip`);
      assert.ok(lay.label.length >= Math.min(label.length, 3), `${st.id} ${label}: abbreviated to nothing (${lay.label})`);
      assert.ok(lay.label.length === 0 || lay.label[0] === label[0], `${st.id} ${label}: abbreviation ${lay.label} must keep the initial`);
    }
    const pl = f.run('hudProgressLayout("CALOR EXTREMO ALTO")');
    assert.ok(pl.textW + 8 <= z.progress.w + 0.001, `${st.id}: progress label clipped`);
  }
  assert.ok(hudZonesFor(2).counter.w > hudZonesFor(1).counter.w, "chunky styles widen the counter");
  const f2 = open(world({ style: "pixel-gameboy-dmg", worlds: [{ scenario: "battery-lab", beats: [] }] }));
  assert.ok(f2.run('hudCounterLayout("CULPABLES", "4")').label.length >= 5, "CULPABLES keeps at least five letters in a 2x style");
});

test("rendered HUD text stays inside the HUD zone in every style (glyph extents measured from the real font size)", () => {
  const beats = [{ on: { at: 0.5 }, do: "progress", value: 0.6, label: "CALOR EXTREMO" }, { on: { at: 0.6 }, do: "counter", value: 42, label: "CULPABLES" }];
  for (const st of STYLES) {
    const { data, style } = world({ style: st.id, worlds: [{ scenario: "battery-lab", beats }] });
    const f = open({ data, style }); f.at(3);
    const texts = f.hudTexts();
    assert.ok(texts.length >= 2, `${st.id}: HUD drew ${texts.length} texts`);
    const hz = hudZonesFor(st.px);
    for (const tx of texts) {
      const inP = tx.x >= hz.progress.x && tx.x + tx.w <= hz.progress.x + hz.progress.w + 0.001 && tx.y >= hz.progress.y && tx.y + tx.h <= hz.progress.y + hz.progress.h + 0.001;
      const inC = tx.x >= hz.counter.x && tx.x + tx.w <= hz.counter.x + hz.counter.w + 0.001 && tx.y >= hz.counter.y - 2 && tx.y + tx.h <= hz.counter.y + hz.counter.h + 0.001;
      assert.ok(inP || inC, `${st.id}: text ${JSON.stringify(tx)} outside the HUD boxes ${JSON.stringify(hz)}`);
    }
    for (const r of hudRects(st.px)) { assert.equal(rectsOverlap(r, bandRect(ZONES.caption)), false, `${st.id}/${r.name}`); }
    assert.ok(hz.progress.y + hz.progress.h <= ZONES.hud.y1 && hz.counter.y + hz.counter.h <= ZONES.hud.y1, `${st.id}: HUD zones exceed the HUD band`);
    assert.equal(rectsOverlap(hz.progress, hz.counter), false);
  }
});

// ------------------------------------------------------------------------------------------------ 3 hero placement
const heroBox = (f, wi) => JSON.parse(f.run(`JSON.stringify((() => { const w = WORLDS[${wi}], c = w.cast.find((k) => k.id === 'hero'); return { x: c.x0, half: HERO_HALF * c.u, size: c.size }; })())`));
const propBoxes = (f, wi) => JSON.parse(f.run(`JSON.stringify(Object.keys(WORLDS[${wi}].def.props).map((id) => ({ id, ...propBox(WORLDS[${wi}], id) })))`));
const overlapW = (h, p) => Math.max(0, Math.min(h.x + h.half, p.x + p.w) - Math.max(h.x - h.half, p.x));

test("the hero stands beside the active prop: never on a prop a beat targets whenever a free column exists", () => {
  for (const s of cat.scenarios) {
    const props = s.dynamic ? [{ kind: "phone", at: "left" }, { kind: "battery", at: "center" }, { kind: "fan", at: "right" }] : null;
    const ids = s.dynamic ? ["phone", "battery", "fan"] : s.props.map((p) => p.id);
    const target = ids[Math.min(1, ids.length - 1)];
    const beats = [{ on: { at: 1 }, do: "pulse", target }, { on: { at: 2.5 }, do: "fill", target, value: 0.7 }, { on: { at: 4 }, do: "light", target }];
    const { data, style } = world({ worlds: [{ scenario: s.id, ...(props ? { props } : {}), cast: [{ who: "hero", at: "center" }], beats }] });
    const f = open({ data, style }); const h = heroBox(f, 0), pb = propBoxes(f, 0), tp = pb.find((p) => p.id === target);
    const W = f.run("WORLDS[0].W"), free = [];
    for (let x = h.half; x <= W - h.half; x += 2) if (overlapW({ x, half: h.half }, tp) === 0) free.push(x);
    // the hero keeps its size (props move, it never shrinks), so a crowded scene may leave a sliver of overlap: at most 8 logical px
    if (free.length) assert.ok(overlapW(h, tp) <= 8, `${s.id}: hero (x ${h.x}, half ${h.half}) covers ${target} (${tp.x}-${tp.x + tp.w}) by ${overlapW(h, tp)}`);
  }
});

test("an explicit hero position is kept when it is free, and an explicit prop anchor still stands beside that prop", () => {
  const { data, style } = world({ worlds: [{ scenario: "phone-workshop", cast: [{ who: "hero", at: "left" }], beats: [{ on: { at: 1 }, do: "pulse", target: "chip" }] }] });
  const f = open({ data, style }); const h = heroBox(f, 0), chip = propBoxes(f, 0).find((p) => p.id === "chip");
  assert.equal(overlapW(h, chip), 0);
  const w2 = world({ worlds: [{ scenario: "phone-workshop", cast: [{ who: "hero", at: "phone" }], beats: [{ on: { at: 1 }, do: "pulse", target: "phone" }] }] });
  const f2 = open(w2), h2 = heroBox(f2, 0), ph = propBoxes(f2, 0).find((p) => p.id === "phone");
  assert.equal(overlapW(h2, ph), 0);
});

test("a hero walking to a prop that a later beat targets yields: no overlap at the time of the beat", () => {
  const beats = [{ on: { at: 0.5 }, do: "walk", who: "hero", to: "center" }, { on: { at: 3 }, do: "pulse", target: "cpu" }, { on: { at: 5 }, do: "fill", target: "cpu", value: 0.8 }];
  const { data, style } = world({ worlds: [{ scenario: "cpu-city", cast: [{ who: "hero", at: "left" }], beats }] });
  const f = open({ data, style }), cpu = propBoxes(f, 0).find((p) => p.id === "cpu");
  const hx = JSON.parse(f.run("JSON.stringify([2.9, 4.9, 6].map((t) => castState(WORLDS[0], WORLDS[0].cast[0], t).x))")), half = f.run("HERO_HALF * WORLDS[0].cast[0].u");
  for (const x of hx.slice(0, 2)) assert.equal(overlapW({ x, half }, cpu), 0, `hero at ${x} covers the cpu at ${cpu.x}-${cpu.x + cpu.w}`);
});

// ------------------------------------------------------------------------------------------------ 3b silhouettes
test("foreground silhouettes are never plain black blocks in styles without blur", () => {
  const noBlur = STYLES.filter((s) => !(s.blur && s.blur[0] > 0));
  assert.ok(noBlur.length >= 5);
  for (const st of STYLES) {
    const f = open(world({ style: st.id, worlds: [{ scenario: "factory", beats: [] }] }));
    const r = f.run(`(() => {
      const rec = [], g = { fillStyle: '', globalAlpha: 1, globalCompositeOperation: 'source-over', save() {}, restore() {}, translate() {}, fillRect(x, y, w, h) { rec.push([typeof this.fillStyle === 'string' ? this.fillStyle : 'pat', w * h, this.globalAlpha]); } };
      dressFore(g, 1, WORLDS[0]); const dark = PALHEX[PALORDER[0]]; let solidDark = 0, pat = 0, all = 0;
      for (const [fs, a, al] of rec) { if (a > 4000) continue; all += a; if (fs === dark && al >= 0.9) solidDark += a; if (fs === 'pat') pat += a; }
      return { solidDark, pat, all };
    })()`);
    if (!(st.blur && st.blur[0] > 0)) assert.ok(r.solidDark / r.all < 0.3 && r.pat / r.all > 0.5, `${st.id}: silhouettes are ${(100 * r.solidDark / r.all).toFixed(0)}% plain dark, ${(100 * r.pat / r.all).toFixed(0)}% dithered`);
  }
});

// ------------------------------------------------------------------------------------------------ 4 beat feedback
test("progress and counter beats change visibly: minimum delta, a warning, and a pop highlight at the beat", () => {
  const beats = [{ on: { at: 1 }, do: "progress", value: 0.5, label: "CARGA" }, { on: { at: 3 }, do: "progress", value: 0.52, label: "CARGA" }, { on: { at: 5 }, do: "counter", value: 4, label: "CUL" }, { on: { at: 7 }, do: "counter", value: 5, label: "CUL" }];
  const r = world({ worlds: [{ scenario: "battery-lab", beats }] });
  const prog = r.data.hud.filter((h) => h.hud === "progress");
  assert.ok(Math.abs(prog[1].value - prog[0].value) >= 0.1, `delta ${(prog[1].value - prog[0].value).toFixed(2)} is below the visible minimum`);
  assert.ok(r.warnings.some((w) => /progress/i.test(w) && /nudged|visible/i.test(w)), "the nudge is reported");
  const f = open(r);
  const key = (t) => { const s = f.at(t); const rows = []; s.hud.forEach((row, y) => row.forEach((v, x) => { if (v) rows.push(`${x},${y},${v}`); })); return rows.join("|"); };
  assert.notEqual(key(3.1), key(4.2), "the progress bar does not change at its beat");
  assert.notEqual(key(7.1), key(8.2), "the counter pop does not show at its beat");
  const pop = f.run("hudPop(3.1)"), calm = f.run("hudPop(4.2)");
  assert.ok(pop > 0.5 && calm === 0, `pop ${pop} / ${calm}`);
});

test("a fill beat on a prop adds a derived pulse so the change pops (explicit pulses are not duplicated)", () => {
  const beats = [{ on: { at: 2 }, do: "fill", target: "battery", value: 0.6 }];
  const f = open(world({ worlds: [{ scenario: "workshop-stage", props: [{ kind: "battery", at: "center" }], beats }] }));
  assert.ok(f.run("WORLDS[0].pe.battery.filter((b) => b.do === 'pulse' && Math.abs(b.t - 2) <= 0.3 && b.derived).length") === 1);
  const f2 = open(world({ worlds: [{ scenario: "workshop-stage", props: [{ kind: "battery", at: "center" }], beats: [...beats, { on: { at: 2.1 }, do: "pulse", target: "battery" }] }] }));
  assert.equal(f2.run("WORLDS[0].pe.battery.filter((b) => b.do === 'pulse' && Math.abs(b.t - 2) <= 0.3).length"), 1);
  assert.equal(f2.run("WORLDS[0].pe.battery.filter((b) => b.derived && Math.abs(b.t - 2) <= 0.3).length"), 0);
});

test("a prop fill beat nudges tiny deltas and reports it; large deltas are untouched", () => {
  const r = world({ worlds: [{ scenario: "workshop-stage", props: [{ kind: "battery" }], beats: [{ on: { at: 1 }, do: "fill", target: "battery", value: 0.4 }, { on: { at: 3 }, do: "fill", target: "battery", value: 0.42 }, { on: { at: 5 }, do: "fill", target: "battery", value: 0.9 }] }] });
  const fills = r.data.worlds[0].beats.filter((b) => b.do === "fill");
  assert.ok(fills[1].value - fills[0].value >= 0.1);
  assert.equal(fills[2].value, 0.9);
  assert.equal(fills[0].value, 0.4);
});
