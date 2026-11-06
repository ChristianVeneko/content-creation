// U15 tests for pixel-world: punch defaults (hero size, punctuation density, auto shake, flash guard), camera life (drift, crisp
// zoom), the motion kit, and the selectable pixel quality (`hf.pixelScale`: chunky | standard | fine). Rendering checks run the real
// runtime in the vm sandbox (hf/pixel-world/sandbox.mjs); its canvas stub ignores scale(), so fine-mode sprites are only checked
// for "draws without throwing", while HUD, text and geometry checks hold in logical units.
import { test } from "node:test";
import assert from "node:assert/strict";
import { promptSection, payloadSchema } from "../hf/pixel-world/index.mjs";
import { normalizePayload, punctuate, punchLoad, deriveShakes, capFlashes, PUNCH_MIN_PER_SEC } from "../hf/pixel-world/normalize.mjs";
import { resolvePayload, driftOf } from "../hf/pixel-world/resolve.mjs";
import { STYLES, PIXEL_SCALES, pixelGrid } from "../hf/pixel-world/styles.mjs";
import { ZONES, hudZonesFor } from "../hf/pixel-world/layout.mjs";
import { open, prepare } from "../hf/pixel-world/sandbox.mjs";

const TEXT = "Cuando haces commit guardas tus cambios en tu computadora pero nadie mas los ve. Push es enviar esos cambios al repositorio remoto para que tu equipo pueda trabajar con ellos. Primero commit, despues push, siempre en ese orden. Si olvidas el push, tus 3 cambios se quedan atrapados en tu maquina y el equipo nunca los recibe. Ahora ya sabes la diferencia entre guardar y enviar.";
const words = (txt = TEXT, step = 0.42) => txt.split(/\s+/).map((text, i) => ({ text, start: +(i * step).toFixed(3), end: +(i * step + step * 0.8).toFixed(3) }));
const WORDS = words();
const DUR = +(WORDS[WORDS.length - 1].end + 0.6).toFixed(2);
const weak = (extra = {}, worlds) => ({ style: "pixel-snes-16bit", ...extra, worlds: worlds ?? [
  { scenario: "post-office", beats: [{ on: { word: "commit" }, do: "pulse", target: "parcel" }, { on: { word: "repositorio" }, do: "light", target: "mailbox" }] },
  { scenario: "keyboard-desk", beats: [{ on: { word: "Primero" }, do: "pulse", target: "screen" }, { on: { word: "olvidas" }, do: "emote", who: "hero", symbol: "?" }] },
] });
const resolve = (hf, o = {}) => resolvePayload({ payload: payloadSchema.parse(normalizePayload(hf)), words: WORDS, durationSec: DUR, ...o });
const sandboxWorld = (hf, o = {}) => prepare({ hf: { style: "pixel-snes-16bit", ...hf }, words: WORDS, durationSec: DUR, ...o });

// ---------------------------------------------------------------------------------------------- 1. punch defaults
test("the hero is size M by default, alone or not; an explicit L is kept", () => {
  const { data, style } = sandboxWorld({ worlds: [{ scenario: "phone-workshop" }, { scenario: "battery-lab", cast: [{ who: "hero", size: "L" }] }, { scenario: "factory", cast: [{ who: "hero" }, { who: "cat" }] }] });
  const f = open({ data, style });
  assert.equal(f.run("WORLDS[0].cast[0].size"), "M");
  assert.equal(f.run("WORLDS[1].cast[0].size"), "L");
  assert.deepEqual(JSON.parse(f.run("JSON.stringify(WORLDS[2].cast.map((c) => c.size))")), ["M", "M"]);
  assert.ok(f.run("SIZES.M") <= 86, "M is at most 86 px (the reference hero is about 72 px)");
});

test("punctuate lifts a weak world to about 0.6-0.9 punch events per second, bound to words, never touching written beats", () => {
  const r = resolve(weak());
  for (const [i, w] of r.data.worlds.entries()) {
    const span = w.t1 - w.t0, rate = punchLoad(w.beats, false) / span;
    assert.ok(rate >= PUNCH_MIN_PER_SEC && rate <= 1.3, `world ${i + 1}: ${rate.toFixed(2)} punch events/s`);
  }
  assert.ok(r.warnings.some((m) => /punch events\/s .* added \d+ bound to strong words/.test(m)), r.warnings.join("|"));
  const w0 = r.data.worlds[0], written = w0.beats.filter((b) => !b.auto && !b.ambient);
  assert.deepEqual(written.map((b) => b.do).sort(), ["light", "pulse"], "written beats are kept as they were");
  for (const b of w0.beats.filter((b) => b.auto && b.do === "hero-stamp")) { assert.ok(b.text.length >= 3 && b.text.length <= 11, b.text); assert.ok(b.t >= w0.t0 && b.t <= w0.t1); }
  const stamps = w0.beats.filter((b) => b.do === "hero-stamp").map((b) => b.t).sort((a, b) => a - b);
  for (let i = 1; i < stamps.length; i++) assert.ok(stamps[i] - stamps[i - 1] >= 1.6 - 1e-6, "stamps never overlap (1.2 s each)");
  assert.ok(stamps[0] < 2.5, "the hook word is stamped in the first 2.5 s");
  assert.deepEqual(resolve(weak()).data, r.data, "deterministic");
});

test("a world that is already punchy is left alone, except for the hook stamp of the first world", () => {
  const beats = Array.from({ length: 8 }, (_, i) => ({ t: 1 + i * 1.2, do: i % 2 ? "shake" : "hero-stamp", on: { at: 1 + i * 1.2 } }));
  assert.deepEqual(punctuate({ t0: 0, t1: 12, beats, words: WORDS, flash: false }), []);
  assert.deepEqual(punctuate({ t0: 0, t1: 12, beats: [], words: [] }), []);
  const noStamp = beats.map((b) => ({ ...b, do: "shake" }));
  const hook = punctuate({ t0: 0, t1: 12, beats: noStamp, words: WORDS, hook: true });
  assert.equal(hook.length, 1);
  assert.equal(hook[0].do, "hero-stamp");
});

test("every impact beat gets a small automatic shake unless one is already there; auto shakes are silent", () => {
  const beats = [{ t: 2, do: "hero-stamp" }, { t: 4, do: "radial-burst" }, { t: 4.05, do: "shake", amp: 5 }, { t: 6, do: "push" }];
  const add = deriveShakes(beats);
  assert.deepEqual(add.map((s) => s.t), [2, 6]);
  assert.ok(add.every((s) => s.auto && s.ambient && s.amp >= 2 && s.amp <= 3));
  const r = resolve(weak({}, [{ scenario: "factory", beats: [{ on: { word: "commit" }, do: "hero-stamp", text: "COMMIT" }, { on: { word: "Push" }, do: "burst", target: "machine" }] }]));
  const shakes = r.data.worlds[0].beats.filter((b) => b.do === "shake").map((b) => b.t);
  for (const b of r.data.worlds[0].beats.filter((b) => ["hero-stamp", "burst"].includes(b.do))) assert.ok(shakes.some((t) => t >= b.t - 0.1 && t <= b.t + 0.3), `${b.do}@${b.t} has no shake`);
  for (const x of r.sfx.filter((x) => x.kind === "hit")) assert.ok(r.data.worlds[0].beats.some((b) => !b.ambient && b.t === x.at && ["shake", "burst"].includes(b.do)), `a "hit" sound at ${x.at} that only a derived shake explains`);
});

test("flash is opt-in and hard-capped: none before 0.5 s, at most 3 per 10 s, 0.5 s apart, shorter than 2 frames", () => {
  const times = [0.2, 0.6, 0.7, 1.2, 1.8, 2.4, 3.0, 9.0, 10.8, 11.2, 12.5];
  const { kept, dropped } = capFlashes(times);
  assert.ok(kept.every((t) => t >= 0.5));
  for (const t of kept) assert.ok(kept.filter((k) => k <= t && t - k < 10).length <= 3, `window ending ${t}`);
  for (let i = 1; i < kept.length; i++) assert.ok(kept[i] - kept[i - 1] >= 0.5);
  assert.ok(dropped.includes(0.2) && dropped.length >= 4);
  const many = Array.from({ length: 30 }, (_, i) => ({ on: { at: 0.1 + i * 0.7 }, do: "flash" }));
  const on = resolve(weak({ flash: true }, [{ scenario: "factory", beats: many }]));
  const ft = on.data.worlds[0].beats.filter((b) => b.do === "flash").map((b) => b.t);
  assert.ok(ft.length >= 1 && capFlashes(ft).dropped.length === 0, "what survives passes the guard");
  assert.ok(ft.every((t) => t >= 0.5) && on.warnings.some((m) => /photosensitivity guard/.test(m)));
  const off = resolve(weak({ flash: false }, [{ scenario: "factory", beats: many }]));
  assert.equal(off.data.worlds[0].beats.filter((b) => b.do === "flash").length, 0, "off by default: written and auto flashes are ignored");
  const f = open(sandboxWorld({ flash: true, worlds: [{ scenario: "factory", beats: [{ on: { at: 1 }, do: "flash" }] }] }));
  assert.ok(f.run("FLASH_LEN") < 2 / 30, "a flash lasts less than two frames");
  f.at(1.0); assert.ok(+f.run("flashEl.style.opacity") <= 0.5, "never above half white");
  f.at(1.1); assert.equal(+f.run("flashEl.style.opacity"), 0);
});

// ---------------------------------------------------------------------------------------------- 2. camera life
test("every world drifts: the far layers never rest for more than 2 s and the sway is small", () => {
  const six = Array.from({ length: 6 }, () => ({ scenario: "factory" }));
  const { data, style } = sandboxWorld({ worlds: six }, { durationSec: 60 });
  const f = open({ data, style });
  const series = JSON.parse(f.run("JSON.stringify(WORLDS.map((w) => { const a = []; for (let t = 0; t < 20; t += 1 / 30) { const d = driftAt(w, t); a.push([Math.round(-d * 0.75), Math.round(d * 0.6), Math.round(-d * 0.45)].join()); } return a; }))"));
  for (const [wi, a] of series.entries()) {
    let still = 0, worst = 0;
    for (let i = 1; i < a.length; i++) { still = a[i] === a[i - 1] ? still + 1 : 0; worst = Math.max(worst, still); }
    assert.ok(worst / 30 <= 2, `world ${wi + 1}: the camera layers are still for ${(worst / 30).toFixed(1)} s`);
    assert.ok(new Set(a).size >= 4, `world ${wi + 1} barely moves`);
    assert.ok(Math.max(...a.map((p) => Math.abs(+p.split(",")[0]))) <= 8, "drift stays within 8 logical px");
  }
  for (let n = 1; n <= 8; n++) for (let wi = 0; wi < n; wi++) { const [amp, per] = driftOf(wi, n, "pixel-noir"); assert.ok(amp >= 4 && amp <= 7 && per >= 6 && per <= 10); }
  assert.deepEqual(driftOf(2, 5, "x"), driftOf(2, 5, "x"));
});

test("zoom keeps pixels crisp: quarter steps on a whole-logical-pixel origin; impact beats punch the camera in", () => {
  const { data, style } = sandboxWorld({ worlds: [{ scenario: "factory", beats: [{ on: { at: 2 }, do: "push", target: "machine", amount: 1.4, hold: 1 }, { on: { at: 7 }, do: "hero-stamp", text: "PUSH" }] }] });
  const f = open({ data, style });
  const seen = new Set();
  for (let t = 0; t < 10; t += 1 / 30) {
    f.at(t);
    const tr = f.run("stageEl.style.transform"), o = f.run("stageEl.style.transformOrigin");
    if (tr !== "none") { const z = +tr.match(/scale\(([\d.]+)\)/)[1]; assert.ok(Number.isInteger(z * 4), `zoom ${z} is not a quarter step`); seen.add(z); const [ox, oy] = o.split(" ").map((v) => parseFloat(v)); assert.ok(ox % 4 === 0 && oy % 4 === 0, `origin ${o} is not on whole logical px`); }
  }
  assert.ok(seen.has(1.25) && seen.has(1.5), `quarter steps seen: ${[...seen]}`);
  f.at(7.12); assert.notEqual(f.run("stageEl.style.transform"), "none", "the hero-stamp punches the camera");
  f.at(9.8); assert.equal(f.run("stageEl.style.transform"), "none", "and lets go");
});

// ---------------------------------------------------------------------------------------------- 3. motion kit
test("the hero squashes then stretches on a hit, and every cast member bounces in when its world appears", () => {
  const { data, style } = sandboxWorld({ worlds: [{ scenario: "factory", cast: [{ who: "hero" }, { who: "cat" }], beats: [{ on: { at: 3 }, do: "shake", amp: 3 }] }] });
  const f = open({ data, style });
  const st = (t, i = 0) => JSON.parse(f.run(`JSON.stringify((() => { const s = castState(WORLDS[0], WORLDS[0].cast[${i}], ${t}); return { sq: s.sq, jump: s.jump }; })())`));
  assert.equal(st(3.03).sq, 2, "squash right after the hit");
  assert.ok(st(3.15).jump > 0 && st(3.15).sq === 0, "stretch hop after the squash");
  assert.deepEqual(st(5), { sq: 0, jump: 0 }, "at rest later");
  assert.ok(st(0.1).jump > 10, "drops in at the start of the video");
  assert.equal(st(1.7).jump, 0, "and has landed");
  assert.equal(JSON.parse(f.run("JSON.stringify(dropIn(0.01, 0, 34, 0.55))")) < -30, true);
});

const cells = (f, t) => f.at(t).grid.map((r) => r.join(",")).join("|");
const diff = (a, b) => { let n = 0; const A = a.split("|"), B = b.split("|"); for (let i = 0; i < A.length; i++) { const x = A[i].split(","), y = B[i].split(","); for (let j = 0; j < x.length; j++) if (x[j] !== y[j]) n++; } return n; };
test("coins, chops and fills now move things: they draw flying particles that the bare prop does not", () => {
  const cases = [["coins", "register", 0.4], ["chop", "machine", 0.15], ["fill", "machine", 0.4]];
  for (const [kind, target, dt] of cases) {
    const scenario = kind === "coins" ? "shop" : "factory", tgt = kind === "coins" ? "register" : target;
    const beat = { on: { at: 2 }, do: kind, target: tgt, ...(kind === "fill" ? { value: 0.8 } : {}) };
    const withB = open(sandboxWorld({ worlds: [{ scenario, beats: [beat] }] })), without = open(sandboxWorld({ worlds: [{ scenario, beats: [{ on: { at: 2 }, do: "pulse", target: tgt }] }] }));
    // frames at the same time differ beyond the prop's own state: compare against the same scene with the beat moved away
    const far = open(sandboxWorld({ worlds: [{ scenario, beats: [{ ...beat, on: { at: 9 } }] }] }));
    assert.ok(diff(cells(withB, 2 + dt), cells(far, 2 + dt)) > 10, `${kind} left no visible motion`);
    void without;
  }
  const f = open(sandboxWorld({ worlds: [{ scenario: "factory", beats: [{ on: { at: 2 }, do: "chop", target: "machine" }] }] }));
  assert.equal(cells(f, 2.2), cells(f, 2.2), "deterministic frames");
  assert.equal(f.run("flicker(1.234, 3) === flicker(1.234, 3) && flicker(0.5, 1) >= 0.55 && flicker(0.5, 1) <= 1"), true);
});

// ---------------------------------------------------------------------------------------------- 4. pixelScale
test("pixelScale: schema default, closed enum, aliases and the grid of each preset", () => {
  assert.equal(payloadSchema.parse({ worlds: [{ scenario: "factory" }] }).pixelScale, "standard");
  const bad = payloadSchema.safeParse({ pixelScale: "ultra", worlds: [{ scenario: "factory" }] });
  assert.equal(bad.success, false);
  assert.match(bad.error.issues[0].message, /use one of: chunky, standard, fine/);
  assert.deepEqual(["coarse", "grueso", "Normal", "HD", "fino"].map((v) => normalizePayload({ pixelScale: v, worlds: [] }).pixelScale), ["chunky", "chunky", "standard", "fine", "fine"]);
  const snes = STYLES.find((s) => s.id === "pixel-snes-16bit"), gb = STYLES.find((s) => s.id === "pixel-gameboy-dmg");
  assert.deepEqual(pixelGrid(snes, "chunky"), { scale: "chunky", px: 2, ss: 1 });
  assert.deepEqual(pixelGrid(snes, "standard"), { scale: "standard", px: 1, ss: 1 });
  assert.deepEqual(pixelGrid(gb, "standard"), { scale: "standard", px: 2, ss: 1 }, "standard keeps the style's own grid");
  assert.deepEqual(pixelGrid(gb, "fine"), { scale: "fine", px: 1, ss: 2 });
  assert.deepEqual(pixelGrid(snes, "fine", "draft"), { scale: "standard", px: 1, ss: 1 }, "draft forces standard");
  for (const sc of PIXEL_SCALES) { const g = pixelGrid(snes, sc); assert.equal(1080 % (4 / g.ss * 1), 0); assert.equal(1920 % (4 / g.ss), 0); assert.ok(g.ss === 1 || g.ss === 2); }
});

test("resolve writes the grid into the data and the style; draft quality ignores chunky/fine with a warning", () => {
  const fine = resolve(weak({ pixelScale: "fine" })), chunky = resolve(weak({ pixelScale: "chunky" })), std = resolve(weak());
  assert.deepEqual([fine.data.pixelScale, fine.data.ss, fine.style.px], ["fine", 2, 1]);
  assert.deepEqual([chunky.data.pixelScale, chunky.data.ss, chunky.style.px], ["chunky", 1, 2]);
  assert.deepEqual([std.data.pixelScale, std.data.ss, std.style.px], ["standard", 1, 1]);
  const draft = resolve(weak({ pixelScale: "fine" }), { quality: "draft" });
  assert.deepEqual([draft.data.pixelScale, draft.data.ss], ["standard", 1]);
  assert.ok(draft.warnings.some((m) => /draft quality always renders standard/.test(m)));
  assert.equal(draft.style.px, 1);
});

test("every style x every pixelScale composes, draws a frame in both modes and keeps the HUD labels inside their boxes", () => {
  const beats = [{ on: { at: 0.5 }, do: "progress", value: 0.6, label: "CALOR EXTREMO" }, { on: { at: 0.6 }, do: "counter", value: 42, label: "CULPABLES" }, { on: { at: 1.2 }, do: "hero-stamp", text: "STAMP" }, { on: { at: 1.6 }, do: "push", target: "monitor", amount: 1.25 }];
  for (const st of STYLES) for (const sc of PIXEL_SCALES) for (const mode of ["multi", "single"]) {
    const { data, style, warnings } = sandboxWorld({ style: st.id, pixelScale: sc, worlds: [{ scenario: "factory", beats }, { scenario: "workshop-stage", props: [{ kind: "battery" }, { kind: "fan" }], beats: [] }] }, { mode, durationSec: 12 });
    const f = open({ data, style });
    const label = `${st.id}/${sc}/${mode}`;
    assert.equal(f.run("SS"), sc === "fine" ? 2 : 1, label);
    assert.equal(f.run("PX"), sc === "chunky" ? 2 : sc === "fine" ? 1 : st.px, label);
    if (sc === "fine") for (const id of ["cb", "cm", "cf", "cu", "ch"]) assert.equal(f.run(`[$("${id}").width, $("${id}").height].join()`), "540,960", `${label}: ${id} canvas size`);
    else assert.equal(f.run("$('cm').width"), undefined, `${label}: canvas keeps the template size`);
    for (const t of [0.05, 0.8, 1.7, 3, 6, 9]) { const fr = f.at(t); assert.ok(fr.thirds.every((th) => th.covered > 0.5), `${label}@${t}: a frame third is empty`); }
    f.at(3);
    const hz = hudZonesFor(style.px), texts = f.hudTexts();
    assert.ok(texts.length >= 2, `${label}: HUD drew ${texts.length} texts`);
    for (const tx of texts) {
      const inP = tx.x >= hz.progress.x && tx.x + tx.w <= hz.progress.x + hz.progress.w + 0.001 && tx.y >= hz.progress.y && tx.y + tx.h <= hz.progress.y + hz.progress.h + 0.001;
      const inC = tx.x >= hz.counter.x && tx.x + tx.w <= hz.counter.x + hz.counter.w + 0.001 && tx.y >= hz.counter.y - 2 && tx.y + tx.h <= hz.counter.y + hz.counter.h + 0.001;
      assert.ok(inP || inC, `${label}: HUD text ${JSON.stringify(tx)} is clipped by its box ${JSON.stringify(hz)}`);
    }
    assert.ok(hz.progress.y + hz.progress.h <= ZONES.hud.y1 && hz.counter.y + hz.counter.h <= ZONES.hud.y1, label);
    void warnings;
  }
});

test("fine: geometry rounds to half a logical pixel, the cast is drawn with twice the measures, frames are deterministic", () => {
  const { data, style } = sandboxWorld({ pixelScale: "fine", worlds: [{ scenario: "factory", beats: [{ on: { at: 1 }, do: "pulse", target: "machine" }] }] });
  const f = open({ data, style });
  assert.equal(f.run("snap(0.74)"), 0.5);
  assert.equal(f.run("snap(0.76)"), 1);
  assert.equal(f.run("G"), 0.5);
  f.at(1.2);
  assert.equal(f.run("G"), 0.5, "the grid is restored after the cast");
  assert.equal(f.run("LS"), 2);
  assert.equal(cells(f, 2.5), cells(open({ data, style }), 2.5));
  const std = open(sandboxWorld({ worlds: [{ scenario: "factory" }] }));
  assert.equal(std.run("snap(0.74)"), 1);
  assert.equal(std.run("G"), 1);
});

test("every pixelScale of a style keeps the same layout: scenario props and HUD zones do not move", () => {
  const props = (sc) => { const { data, style } = sandboxWorld({ pixelScale: sc, worlds: [{ scenario: "phone-workshop" }] }); return open({ data, style }).run("JSON.stringify(Object.keys(WORLDS[0].def.props).map((id) => propBox(WORLDS[0], id)))"); };
  assert.equal(props("fine"), props("standard"));
  assert.equal(props("chunky"), props("standard"));
});

// ---------------------------------------------------------------------------------------------- prompt
test("the prompt asks for punch (8-12 stamps/shakes, hero M), explains flash and the pixel quality, and the example validates", () => {
  assert.match(promptSection, /size M/);
  assert.match(promptSection, /8-12/);
  assert.doesNotMatch(promptSection, /Keep `flash` off/);
  assert.doesNotMatch(promptSection, /4-6 strongest/);
  assert.match(promptSection, /`flash`.*photosensitiv|photosensitiv.*`flash`/s);
  assert.match(promptSection, /pixelScale/);
  for (const sc of PIXEL_SCALES) assert.ok(promptSection.includes(sc));
  const ex = JSON.parse(promptSection.match(/```json\n([\s\S]*?)```/)[1]);
  assert.ok(payloadSchema.safeParse(ex).success);
  const punch = ex.worlds.flatMap((w) => w.beats).filter((b) => ["hero-stamp", "shake", "radial-burst"].includes(b.do)).length;
  assert.ok(punch >= 6, `example carries ${punch} punch beats`);
});

test("compose forwards the render quality: draft forces the standard pixel scale and says so", async () => {
  const { compose } = await import("../hf/pixel-world/index.mjs");
  const { mkdtempSync, rmSync, mkdirSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "pw-q-"));
  try {
    const words = [{ text: "Hola", start: 0, end: 0.4 }, { text: "mundo", start: 0.5, end: 1 }];
    const spec = { hf: { style: "pixel-snes-16bit", pixelScale: "fine", worlds: [{ scenario: "factory", beats: [] }] } };
    const run = async (quality) => {
      const out = join(dir, quality ?? "none");
      mkdirSync(join(out, "assets"), { recursive: true });
      return compose({ spec, words, durationSec: 2, outDir: out, assetsDir: join(out, "assets"), captions: { enabled: true }, quality });
    };
    const draft = await run("draft");
    assert.ok(draft.warnings.some((w) => /pixelScale "fine" ignored: draft quality/.test(w)), JSON.stringify(draft.warnings));
    const looks = await run("looks");
    assert.ok(!looks.warnings.some((w) => /pixelScale/.test(w)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
