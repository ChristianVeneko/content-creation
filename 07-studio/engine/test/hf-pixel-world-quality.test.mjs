// Quality tests for pixel-world: scenario fit (topics), prop library, composable scenario, frame fill, HUD/caption zones,
// contrast and beat density. Rendering checks run the real runtime in a vm with a recording canvas (hf/pixel-world/sandbox.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { payloadSchema, promptSection, catalog } from "../hf/pixel-world/index.mjs";
import { normalizePayload, densify } from "../hf/pixel-world/normalize.mjs";
import { resolvePayload } from "../hf/pixel-world/resolve.mjs";
import { RUNTIME_DIR, COLORS, worldProps, propKinds } from "../hf/pixel-world/catalog.mjs";
import { STYLES } from "../hf/pixel-world/styles.mjs";
import { ZONES, FRAME, hudRects, bandRect, rectsOverlap } from "../hf/pixel-world/layout.mjs";
import { open, prepare, snapshot } from "../hf/pixel-world/sandbox.mjs";

const NEW_SCENARIOS = ["phone-workshop", "battery-lab", "charging-station", "cpu-city", "data-center", "wifi-tower", "app-store", "keyboard-desk", "cloud-sky", "cooling-room", "cable-maze", "firewall-gate"];
const WORDS = "uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis".split(" ").map((text, i) => ({ text, start: +(i * 0.75).toFixed(2), end: +(i * 0.75 + 0.6).toFixed(2) }));
const cat = catalog();
const world = (hf, extra = {}) => prepare({ hf: { style: "pixel-snes-16bit", ...hf }, words: WORDS, durationSec: 12, ...extra });

// ---------------------------------------------------------------------------------------------- scenario fit
test("every scenario carries topic tags and a 'not for' hint is available for the generic ones", () => {
  for (const s of cat.scenarios) assert.ok(s.topics.length >= 3, `${s.id} needs 3+ topics`);
  for (const id of ["factory", "hospital", "dungeon"]) assert.ok(cat.scenarios.find((s) => s.id === id).avoid.length >= 2, `${id} avoid`);
});

test("12+ new tech scenarios exist with 3+ layers, 3+ named props and distinct palette use", () => {
  const ids = cat.scenarios.map((s) => s.id);
  for (const id of NEW_SCENARIOS) { assert.ok(ids.includes(id), id); const s = cat.scenarios.find((x) => x.id === id); assert.ok(s.layers >= 3, `${id} layers`); assert.ok(s.props.length >= 3, `${id} props`); }
  const src = ["scenarios-d.js", "scenarios-e.js"].map((f) => readFileSync(join(RUNTIME_DIR, f), "utf8")).join("\n").split("defScenario({").slice(1);
  const sigs = src.map((b) => [...new Set([...b.matchAll(/M\.([a-z]+)/g)].map((m) => m[1]))].sort().join(","));
  assert.equal(src.length, 12);
  assert.equal(new Set(sigs).size, 12, "each new scenario uses a different set of colour ramps");
});

test("the prompt guides the choice by topic and forbids contradicting props", () => {
  assert.match(promptSection, /\| scenario \| suits topics \| NOT for \| props/);
  for (const s of cat.scenarios.filter((x) => !x.dynamic)) assert.ok(promptSection.includes(`| ${s.id} |`), s.id);
  assert.match(promptSection, /NEVER choose a scenario whose props contradict the topic/);
  assert.match(promptSection, /COMPOSABLE SCENARIO `workshop-stage`/);
});

test("a phone-heat topic lands on a tech scenario, never on the factory machine", () => {
  const n = normalizePayload({ worlds: [{ scenario: "smartphone heat" }, { scenario: "bateria carga" }, { scenario: "firewall security" }] });
  assert.deepEqual(n.worlds.map((w) => w.scenario), ["phone-workshop", "battery-lab", "firewall-gate"]);
});

test("the prompt example is dense: at least one beat per 2 s of a 10 s world", () => {
  const ex = JSON.parse(promptSection.match(/```json\n([\s\S]*?)```/)[1]);
  assert.ok(payloadSchema.safeParse(ex).success);
  for (const w of ex.worlds) assert.ok(w.beats.length >= 10, `${w.scenario} has ${w.beats.length} beats`);
  assert.ok(new Set(ex.worlds.flatMap((w) => w.beats.map((b) => b.do))).size >= 9);
});

// ---------------------------------------------------------------------------------------------- prop library + workshop-stage
test("the prop library has 24+ kinds and each one draws in every state without throwing", () => {
  const kinds = propKinds();
  assert.ok(kinds.length >= 24, `${kinds.length} kinds`);
  for (const p of cat.propLib) assert.ok(p.about.length > 10 && ["floor", "bench", "high"].includes(p.row), p.kind);
  const per = 7;
  for (let i = 0; i < kinds.length; i += per) {
    const props = kinds.slice(i, i + per).map((kind) => ({ kind }));
    const { data, style } = world({ worlds: [{ scenario: "workshop-stage", props, beats: [{ on: { at: 1 }, do: "fill", target: props[0].kind, value: 1 }, { on: { at: 2 }, do: "open", target: props[0].kind }, { on: { at: 3 }, do: "light", target: props[1].kind }, { on: { at: 4 }, do: "burst", target: props[2].kind }, { on: { at: 5 }, do: "recolor", target: props[3].kind }, { on: { at: 6 }, do: "pulse", target: props[4].kind }] }] });
    const f = open({ data, style });
    for (const t of [0.5, 1.4, 2.5, 3.2, 4.1, 5.3, 6.4, 9]) assert.doesNotThrow(() => f.at(t), `${kinds.slice(i, i + per)} at ${t}`);
  }
});

test("props with a fill state change what they draw when a fill beat lands", () => {
  const filling = cat.propLib.filter((p) => p.fills).map((p) => p.kind);
  assert.ok(filling.length >= 12);
  const keep = [{ on: { at: 0.5 }, do: "emote", who: "hero", symbol: "!" }, { on: { at: 0.8 }, do: "emote", who: "hero", symbol: "?" }, { on: { at: 1.1 }, do: "emote", who: "hero", symbol: "?" }, { on: { at: 1.4 }, do: "emote", who: "hero", symbol: "!" }, { on: { at: 1.7 }, do: "emote", who: "hero", symbol: "?" }, { on: { at: 2 }, do: "emote", who: "hero", symbol: "!" }];
  for (const kind of filling) {
    const mk = (extra) => { const { data, style } = world({ worlds: [{ scenario: "workshop-stage", props: [{ kind }], cast: [{ who: "hero", at: "right", size: "M" }], beats: [...keep, ...extra] }] }); return open({ data, style }).at(5.5).grid.map((r) => r.join("|")).join("\n"); };
    assert.notEqual(mk([{ on: { at: 3 }, do: "fill", target: kind, value: 1 }]), mk([]), `${kind} ignores fill`);
  }
});

test("workshop-stage: props come from the payload, ids are stable, targets are validated", () => {
  const ok = payloadSchema.safeParse({ worlds: [{ scenario: "workshop-stage", theme: "sky", props: [{ kind: "battery" }, { kind: "battery" }, { kind: "cloud", id: "nube" }], beats: [{ on: { word: "a" }, do: "fill", target: "battery-2", value: 0.5 }, { on: { word: "a" }, do: "pulse", target: "nube" }] }] });
  assert.ok(ok.success, ok.success ? "" : JSON.stringify(ok.error.issues));
  const bad = payloadSchema.safeParse({ worlds: [{ scenario: "workshop-stage", props: [{ kind: "battery" }], beats: [{ on: { word: "a" }, do: "fill", target: "chip" }] }] });
  assert.equal(bad.success, false); assert.match(bad.error.issues[0].message, /no prop "chip".*battery/);
  const none = payloadSchema.safeParse({ worlds: [{ scenario: "workshop-stage" }] }); assert.equal(none.success, false); assert.match(none.error.issues[0].message, /needs `props`/);
  const wrong = payloadSchema.safeParse({ worlds: [{ scenario: "factory", props: [{ kind: "battery" }] }] }); assert.equal(wrong.success, false); assert.match(wrong.error.issues[0].message, /only on scenario "workshop-stage"/);
  const unk = payloadSchema.safeParse({ worlds: [{ scenario: "workshop-stage", props: [{ kind: "rocket" }] }] }); assert.equal(unk.success, false); assert.match(unk.error.issues[0].message, /unknown prop kind "rocket"/);
  assert.deepEqual(worldProps({ scenario: "workshop-stage", props: [{ kind: "fan" }, { kind: "fan" }] }).map((p) => p.id), ["fan", "fan-2"]);
});

test("normalize maps loose workshop props and infers the scenario from `props`", () => {
  const n = normalizePayload({ worlds: [{ props: ["celular", { type: "ventilador", size: "large" }, { kind: "bolt", at: "Left" }], theme: "Neon" }] });
  assert.equal(n.worlds[0].scenario, "workshop-stage");
  assert.deepEqual(n.worlds[0].props.map((p) => p.kind), ["phone", "fan", "bolt"]);
  assert.equal(n.worlds[0].props[1].size, "L"); assert.equal(n.worlds[0].props[2].at, "left"); assert.equal(n.worlds[0].theme, "grid");
});

// ---------------------------------------------------------------------------------------------- fill the frame
test("every scenario fills the bottom third of the frame with detail (not an empty floor)", () => {
  const sc = cat.scenarios.map((s) => (s.dynamic ? { scenario: s.id, props: [{ kind: "phone" }, { kind: "battery" }, { kind: "fan" }] } : { scenario: s.id }));
  for (const w of sc) {
    const { data, style } = world({ worlds: [{ ...w, beats: [] }] });
    const [top, mid, bottom] = open({ data, style }).at(2).thirds;
    assert.ok(top.covered > 0.9 && mid.covered > 0.9 && bottom.covered > 0.9, `${w.scenario} leaves a frame third empty`);
    assert.ok(bottom.detail >= 0.2, `${w.scenario}: bottom third detail ${bottom.detail.toFixed(2)} < 0.2`);
    assert.ok(bottom.colours >= 10, `${w.scenario}: bottom third uses only ${bottom.colours} colours`);
  }
});

test("the lower third keeps its detail in a 4-colour style too", () => {
  for (const id of ["factory", "hospital", "wifi-tower"]) {
    const { data, style } = world({ style: "pixel-gameboy-dmg", worlds: [{ scenario: id, beats: [] }] });
    assert.ok(open({ data, style }).at(2).thirds[2].detail >= 0.15, id);
  }
});

test("new scenarios place props inside the action band (16-72 % of the height) and the cast defaults to size M", () => {
  const top = ZONES.action.y0, bottom = ZONES.action.y1 + 4;
  for (const id of NEW_SCENARIOS) for (const p of cat.scenarios.find((s) => s.id === id).props) assert.ok(p.y >= top && p.y + p.h <= bottom, `${id}/${p.id} y ${p.y}-${p.y + p.h} outside ${top}-${bottom}`);
  assert.equal(Math.round(ZONES.action.y0 / FRAME.h * 100), 16);
  const { data, style } = world({ worlds: [{ scenario: "phone-workshop" }, { scenario: "battery-lab", cast: [{ who: "hero" }, { who: "cat" }] }] });
  const f = open({ data, style });
  assert.equal(f.run("WORLDS[0].cast[0].size"), "M", "a lone hero is M by default now (L only when the payload asks)");
  assert.deepEqual(JSON.parse(f.run("JSON.stringify(WORLDS[1].cast.map((c) => c.size))")), ["M", "M"]);
});

// ---------------------------------------------------------------------------------------------- HUD / caption zones
test("no HUD element (progress, counter, stamp) intersects the caption band, nor the brand pill", () => {
  const cap = bandRect(ZONES.caption), brand = bandRect(ZONES.brand);
  for (const r of hudRects()) { assert.equal(rectsOverlap(r, cap), false, `${r.name} overlaps the caption band`); assert.equal(rectsOverlap(r, brand), false, `${r.name} overlaps the brand pill`); }
  assert.ok(ZONES.capTop / FRAME.scale >= ZONES.caption.y0 && ZONES.capTop / FRAME.scale < ZONES.caption.y1);
  assert.equal(rectsOverlap(ZONES.hudProgress, ZONES.hudCounter), false);
  assert.ok(ZONES.hud.y0 >= ZONES.action.y1, "the HUD sits below the action band, clear of props and cast");
});

test("the HUD canvas draws only inside its zone (rendered check) and the template keeps captions in the band", async () => {
  const beats = [{ on: { at: 0.5 }, do: "progress", value: 0.9, label: "CARGA" }, { on: { at: 0.6 }, do: "counter", value: 42, label: "GRADOS" }];
  const { data, style } = world({ worlds: [{ scenario: "battery-lab", beats }] });
  const snap = open({ data, style }).at(3);
  const rows = new Set(); snap.hud.forEach((row, r) => row.forEach((v) => { if (v) rows.add(r); }));
  assert.ok(rows.size > 0, "HUD drew nothing");
  const y0 = Math.min(...rows) * snap.cell, y1 = (Math.max(...rows) + 1) * snap.cell;
  assert.ok(y0 >= ZONES.hud.y0 - snap.cell && y1 <= ZONES.hud.y1 + snap.cell, `HUD rows ${y0}-${y1} outside ${ZONES.hud.y0}-${ZONES.hud.y1}`);
  assert.ok(y0 >= ZONES.caption.y1 && !(y1 > ZONES.caption.y0 && y0 < ZONES.caption.y1));
  const { compose } = await import("../hf/pixel-world/index.mjs");
  const { mkdtempSync, rmSync } = await import("node:fs"), { tmpdir } = await import("node:os");
  const d = mkdtempSync(join(tmpdir(), "pw-q-"));
  try { await compose({ spec: { hf: { worlds: [{ scenario: "phone-workshop", beats: [] }] } }, words: WORDS, durationSec: 8, outDir: d }); const html = readFileSync(join(d, "index.html"), "utf8"); assert.match(html, new RegExp(`top: ${ZONES.capTop}px`)); assert.match(html, new RegExp(`top: ${ZONES.stampTop}px`)); }
  finally { rmSync(d, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------------------------------------- contrast
test("stamps and chips reach a WCAG contrast of 4.5 in every style and colour", () => {
  for (const st of STYLES) {
    const { data, style } = world({ style: st.id, worlds: [{ scenario: "factory", beats: [] }] });
    const f = open({ data, style });
    for (const color of COLORS) {
      const sp = f.run(`stampLook(${JSON.stringify(color)})`);
      const against = sp.boxed ? sp.bg : sp.stroke;
      assert.ok(f.run(`contrastRatio(${JSON.stringify(sp.fg)}, ${JSON.stringify(against)})`) >= 4.5, `${st.id}/${color} stamp ${sp.fg} on ${against}`);
      const cc = f.run(`(() => { const c = chipColors(COLN[${JSON.stringify(color)}]); return [col(c.bg), col(c.fg)]; })()`);
      if (typeof cc[0] === "string" && typeof cc[1] === "string") assert.ok(f.run(`contrastRatio(${JSON.stringify(cc[0])}, ${JSON.stringify(cc[1])})`) >= 4.5, `${st.id}/${color} chip ${cc}`);
    }
  }
});

test("contrast helpers follow WCAG 2.x and fall back to a boxed stamp when nothing reads", () => {
  const f = open({ ...world({ worlds: [{ scenario: "factory", beats: [] }] }) });
  assert.equal(+f.run('contrastRatio("#000000", "#ffffff")').toFixed(2), 21);
  assert.equal(f.run('contrastRatio("#777777", "#777777")'), 1);
  const sp = f.run('stampPair("#222222", ["#2a2a2a", "#303030"], ["#222222", "#2a2a2a", "#f0f0f0"])');
  assert.equal(sp.boxed, true); assert.ok(f.run(`contrastRatio(${JSON.stringify(sp.fg)}, ${JSON.stringify(sp.bg)})`) >= 4.5);
});

// ---------------------------------------------------------------------------------------------- beat density
const dWords = Array.from({ length: 22 }, (_, i) => ({ text: ["Cada", "calor", "procesador", "trabaja", "batería", "energía", "pantalla", "brillo", "carga", "rápido", "menos"][i % 11], start: i * 0.5, end: i * 0.5 + 0.4 }));
test("densify adds ambient reaction beats bound to words and never touches existing beats", () => {
  const beats = [{ t: 0.5, do: "light" }, { t: 9, do: "pulse" }];
  const before = JSON.stringify(beats);
  const add = densify({ t0: 0, t1: 10, beats, words: dWords, propIds: ["phone", "chip"], castIds: ["hero", "cat"] });
  assert.equal(JSON.stringify(beats), before);
  assert.equal(add.length, 3);
  assert.ok(add.every((b) => b.ambient && ["react", "pulse", "emote", "jump"].includes(b.do)));
  for (const b of add) assert.ok(dWords.some((w) => Math.abs(w.start - b.t) < 1e-6), "bound to a spoken word");
  const all = [...beats.map((b) => b.t), ...add.map((b) => b.t)].sort((a, b) => a - b);
  for (let i = 1; i < all.length; i++) assert.ok(all[i] - all[i - 1] >= 0.6);
  assert.deepEqual(densify({ t0: 0, t1: 10, beats, words: dWords, propIds: ["phone"], castIds: ["hero"] }), densify({ t0: 0, t1: 10, beats, words: dWords, propIds: ["phone"], castIds: ["hero"] }));
});

test("densify leaves a dense world alone and handles a world with no words", () => {
  const dense = Array.from({ length: 5 }, (_, i) => ({ t: i * 2, do: "pulse" }));
  assert.deepEqual(densify({ t0: 0, t1: 10, beats: dense, words: dWords }), []);
  assert.deepEqual(densify({ t0: 0, t1: 10, beats: [], words: [] }), []);
});

test("resolvePayload reports ambient beats in warnings and keeps written beats", () => {
  const payload = payloadSchema.parse({ worlds: [{ scenario: "phone-workshop", beats: [{ on: { word: "Cada" }, do: "light", target: "phone" }] }] });
  const r = resolvePayload({ payload, words: dWords, durationSec: 11 });
  assert.ok(r.warnings.some((w) => /ambient reaction beat/.test(w)), r.warnings.join("|"));
  const beats = r.data.worlds[0].beats;
  assert.ok(beats.length >= 5 && beats.filter((b) => b.ambient || b.auto).length === beats.length - 1);
  assert.equal(beats.find((b) => !b.ambient && !b.auto).do, "light");
  assert.ok(!r.sfx.some((s) => s.kind === "blip" && beats.filter((b) => b.ambient && !beats.some((o) => o.auto && o.t === b.t)).some((b) => Math.abs(b.t - s.at) < 1e-6)), "ambient beats are silent");
  const dense = payloadSchema.parse({ worlds: [{ scenario: "phone-workshop", beats: Array.from({ length: 6 }, (_, i) => ({ on: { at: i * 1.8 }, do: "pulse", target: "phone" })) }] });
  assert.ok(!resolvePayload({ payload: dense, words: dWords, durationSec: 11 }).warnings.some((w) => /ambient/.test(w)));
});

test("the new runtime files stay deterministic and the quality module has no clock or randomness", () => {
  for (const f of readdirSync(RUNTIME_DIR).filter((x) => /^(props|floor|contrast|scenarios-[def])\.js$/.test(x))) {
    const code = readFileSync(join(RUNTIME_DIR, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(code, /Date\.now|Math\.random|requestAnimationFrame|new Date\(/, f);
  }
  const a = snapshot({ ...world({ worlds: [{ scenario: "wifi-tower", beats: [] }] }), t: 3.3 }), b = snapshot({ ...world({ worlds: [{ scenario: "wifi-tower", beats: [] }] }), t: 3.3 });
  assert.deepEqual(a.grid, b.grid);
});
