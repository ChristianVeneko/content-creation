// U16b tests: mechanism beats (travel, transform, spawn/stack/vanish, count, compare, carry, reject), sentence coverage lint,
// automatic interactions, stamps that do not repeat the caption, zoom that does not crop the hero. Runtime checks run the real
// composition script in the vm sandbox (hf/pixel-world/sandbox.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promptSection, payloadSchema } from "../hf/pixel-world/index.mjs";
import { normalizePayload, punctuate } from "../hf/pixel-world/normalize.mjs";
import { resolvePayload, captionGroups } from "../hf/pixel-world/resolve.mjs";
import { splitSentences, coverageReport, interactPunctuate } from "../hf/pixel-world/coverage.mjs";
import { MECH_KINDS } from "../hf/pixel-world/schema.mjs";
import { open, prepare } from "../hf/pixel-world/sandbox.mjs";

const NARR = "Haces commit. Cierras la caja con una etiqueta. Luego haces push y la caja viaja al buzon. El equipo la recibe.";
const words = (txt = NARR, step = 0.5) => txt.split(/\s+/).map((text, i) => ({ text, start: +(i * step).toFixed(3), end: +(i * step + step * 0.8).toFixed(3) }));
const WORDS = words(), DUR = +(WORDS[WORDS.length - 1].end + 0.6).toFixed(2);
const W_ = (w) => WORDS.find((x) => x.text.replace(/[^\p{L}]/gu, "").toLowerCase() === w.toLowerCase());
const parse = (hf) => payloadSchema.safeParse(normalizePayload({ style: "pixel-snes-16bit", ...hf }));
const world = (beats, extra = {}) => ({ worlds: [{ scenario: "post-office", beats, ...extra }] });
const issues = (hf) => { const r = parse(hf); return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`); };
const sandbox = (hf, o = {}) => { const { data, style } = prepare({ hf: { style: "pixel-snes-16bit", ...hf }, words: WORDS, durationSec: DUR, ...o }); return open({ data, style }); };

const GOOD = {
  travel: { on: { word: "push" }, do: "travel", target: "parcel", to: "mailbox", item: "box", path: "arc", ease: "inout", trail: true, spin: true, land: "slam", dur: 0.9, text: "PUSH" },
  transform: { on: { word: "caja" }, do: "transform", target: "parcel", item: "box", state: "closed" },
  spawn: { on: { word: "commit" }, do: "spawn", target: "board", count: 3, item: "commit", layout: "row" },
  stack: { on: { word: "commit" }, do: "stack", target: "board", count: 2, item: "tile" },
  vanish: { on: { word: "buzon" }, do: "vanish", target: "board" },
  count: { on: { word: "equipo" }, do: "count", target: "mailbox", value: 1, label: "OK" },
  compare: { on: { word: "equipo" }, do: "compare", target: "parcel", to: "mailbox", symbol: "check" },
  carry: { on: { word: "Luego" }, do: "carry", who: "hero", target: "parcel", to: "mailbox", item: "box" },
  reject: { on: { word: "buzon" }, do: "reject", target: "chute", item: "box" },
};

test("schema: every mechanism kind validates and the closed list is exposed", () => {
  assert.deepEqual(MECH_KINDS, ["travel", "transform", "spawn", "stack", "vanish", "count", "compare", "carry", "reject"]);
  for (const k of MECH_KINDS) assert.deepEqual(issues(world([GOOD[k]])), [], k);
});

test("schema: precise errors with paths for every misuse", () => {
  const bad = (beat) => issues(world([beat])).join(" | ");
  assert.match(bad({ ...GOOD.travel, to: undefined }), /hf?.*beats\.0\.to: `travel` needs `to`|worlds\.0\.beats\.0\.to: `travel` needs `to`/);
  assert.match(bad({ ...GOOD.travel, target: undefined }), /`travel` needs `target`/);
  assert.match(bad({ ...GOOD.travel, to: "moon" }), /beats\.0\.to: .*destination "moon".*mailbox/);
  assert.match(bad({ ...GOOD.travel, item: "rocket" }), /unknown item "rocket"; use one of: box, letter/);
  assert.match(bad({ ...GOOD.travel, path: "zigzag" }), /unknown path "zigzag"; use one of: line, arc, bezier/);
  assert.match(bad({ ...GOOD.travel, land: "teleport" }), /unknown landing effect \(`land`\) "teleport"/);
  assert.match(bad({ ...GOOD.transform, state: "melted" }), /unknown state "melted"/);
  assert.match(bad({ on: { word: "caja" }, do: "transform", target: "parcel" }), /`transform` needs `state`/);
  assert.match(bad({ ...GOOD.count, value: undefined }), /`count` needs `value`/);
  assert.match(bad({ ...GOOD.compare, to: "nowhere" }), /compare needs two props/);
  assert.match(bad({ ...GOOD.carry, to: undefined }), /`carry` needs `to`/);
  assert.match(bad({ ...GOOD.reject, target: "ghost" }), /has no prop "ghost"/);
  assert.match(bad({ on: { word: "x" }, do: "teleport", target: "parcel" }), /unknown beat kind/);
});

test("normalize: loose authoring maps to the closed lists (aliases for kinds, items, paths, states)", () => {
  const n = normalizePayload({ style: "pixel-snes-16bit", worlds: [{ scenario: "post-office", beats: [
    { on: "push", do: "send", target: "parcel", to: "mailbox", item: "package", path: "parabola", land: "door slam" },
    { on: "caja", do: "morph", target: "parcel", state: "sealed", item: "parcel" },
    { on: "commit", do: "pile", target: "board", count: 2, item: "token" },
  ] }] });
  const [a, b, c] = n.worlds[0].beats;
  assert.deepEqual([a.do, a.item, a.path, a.land], ["travel", "box", "arc", "slam"]);
  assert.deepEqual([b.do, b.state, b.item], ["transform", "closed", "box"]);
  assert.deepEqual([c.do, c.layout, c.item], ["stack", "pile", "tile"]);
  assert.equal(parse(n).success, true);
});

test("path math: endpoints, arc height, bezier and line; the landing frame is start + dur", () => {
  const f = sandbox(world([GOOD.travel]));
  const at = (kind, p, h = 40) => JSON.parse(f.run(`JSON.stringify(pathAt(${JSON.stringify(kind)}, ${p}, 10, 200, 210, 100, ${h}))`));
  for (const k of ["line", "arc", "bezier"]) { assert.deepEqual(at(k, 0), [10, 200], `${k} starts at A`); assert.deepEqual(at(k, 1).map(Math.round), [210, 100], `${k} ends at B`); }
  assert.deepEqual(at("line", 0.5), [110, 150]);
  assert.equal(at("arc", 0.5)[1], 150 - 40, "an arc of height 40 peaks 40 px above the chord at the middle");
  assert.ok(at("bezier", 0.5)[1] < 150 - 20, "a bezier bulges above the chord");
  const m = JSON.parse(f.run("JSON.stringify(WORLDS[0].mech.trav.find((m) => m.from === \"parcel\"))"));
  assert.equal(+(m.t + m.d).toFixed(3), +(W_("push").start + 0.9).toFixed(3), "lands at the word + dur");
  assert.equal(JSON.parse(f.run("arcHeight(0, 200) <= 70 && arcHeight(0, 10) >= 18")), true);
});

test("travel: the item moves along the route, the destination reacts when it lands, and the frames differ before and after", () => {
  const f = sandbox(world([GOOD.travel]));
  const tp = W_("push").start, land = tp + 0.9;
  const sig = (t) => f.at(t).grid.map((r) => r.join("")).join("");
  const before = sig(tp - 0.3), mid = sig(tp + 0.45), mid2 = sig(tp + 0.6), after = sig(land + 1.2);
  assert.notEqual(before, mid, "the item appears in flight");
  assert.notEqual(mid, mid2, "and moves");
  assert.notEqual(mid2, after);
  const lit = JSON.parse(f.run(`JSON.stringify([propState(WORLDS[0], "mailbox", ${land - 0.1}).lit, propState(WORLDS[0], "mailbox", ${land + 0.3}).lit])`));
  assert.ok(lit[0] === 0 && lit[1] > 0.5, "the destination lights up after the landing");
  assert.ok(JSON.parse(f.run("JSON.stringify(SHK)")).some(([t]) => Math.abs(t - land) < 0.01), "slam shakes the screen at the landing frame");
});

test("transform keeps an object on the prop through its states; a travel from that prop takes it away", () => {
  const f = sandbox(world([{ on: { word: "Cierras" }, do: "transform", target: "parcel", item: "box", state: "open" }, { on: { word: "etiqueta" }, do: "transform", target: "parcel", state: "labelled", text: "LOGIN" }, { on: { word: "push" }, do: "travel", target: "parcel", to: "mailbox", item: "box" }]));
  const rest = (t) => JSON.parse(f.run(`JSON.stringify(restOf(WORLDS[0], "parcel", ${t}))`));
  const s = (w) => W_(w).start;
  assert.equal(rest(s("Cierras") - 0.1), null);
  assert.equal(rest(s("Cierras") + 0.1).state, "open");
  assert.deepEqual([rest(s("etiqueta") + 0.1).state, rest(s("etiqueta") + 0.1).text, rest(s("etiqueta") + 0.1).item], ["labelled", "LOGIN", "box"]);
  assert.equal(rest(s("push") + 0.1), null, "the box left the prop");
});

test("spawn piles objects one by one; vanish removes them with a puff; count ticks to its value", () => {
  const f = sandbox(world([GOOD.spawn, { on: { word: "buzon" }, do: "vanish", target: "board" }, { on: { word: "equipo" }, do: "count", target: "mailbox", value: 7, label: "N" }]));
  const sig = (t) => f.at(t).grid.map((r) => r.join("")).join("");
  const t0 = W_("commit").start;
  const a = sig(t0 + 0.05), b = sig(t0 + 0.2), c = sig(t0 + 0.6), gone = sig(W_("buzon").start + 0.8);
  assert.ok(a !== b && b !== c, "objects appear one after another");
  assert.notEqual(c, gone, "they vanish");
  const slots = JSON.parse(f.run("JSON.stringify([0, 1, 2].map((i) => slotAt(WORLDS[0], WORLDS[0].mech.spawns[0], i)))"));
  assert.equal(new Set(slots.map((s) => s.join(","))).size, 3, "three distinct slots");
  const te = W_("equipo").start;
  const c0 = f.at(te - 0.2).grid.map((r) => r.join("")).join(""), c1 = f.at(te + 0.6).grid.map((r) => r.join("")).join("");
  assert.notEqual(c0, c1, "the counter chip appears");
});

test("compare, carry and reject draw something and are deterministic", () => {
  for (const k of ["compare", "carry", "reject"]) {
    const hf = world([GOOD[k]]), f1 = sandbox(hf), f2 = sandbox(hf), t0 = W_(GOOD[k].on.word).start;
    const sig = (f, t) => f.at(t).grid.map((r) => r.join("")).join("");
    for (const dt of [0.2, 0.5, 1.0]) assert.equal(sig(f1, t0 + dt), sig(f2, t0 + dt), `${k} is a pure function of time`);
    const base = sandbox(world([{ on: { word: GOOD[k].on.word }, do: "pulse", target: "board" }]));
    assert.ok([0.3, 0.6, 1.0].some((dt) => sig(f1, t0 + dt) !== sig(base, t0 + dt)), `${k} changes the picture`);
  }
  const f = sandbox(world([GOOD.carry])), c = JSON.parse(f.run("JSON.stringify(WORLDS[0].mech.carry[0])"));
  assert.ok(c.t < c.tp && c.tp < c.td, "carry: walk to the prop, pick up, walk, put down");
});

test("resolve: the same inputs give the same output (compose is deterministic)", () => {
  const hf = world([GOOD.travel, GOOD.spawn, GOOD.count]);
  const r1 = resolvePayload({ payload: parse(hf).data, words: WORDS, durationSec: DUR }), r2 = resolvePayload({ payload: parse(hf).data, words: WORDS, durationSec: DUR });
  assert.equal(JSON.stringify(r1.data), JSON.stringify(r2.data));
  assert.ok(r1.sfx.some((s) => s.kind === "whoosh") && r1.sfx.some((s) => s.kind === "hit"), "travel sounds: whoosh at the start, a hit when it slams");
});

test("sentences: split on terminal punctuation with the start of the next sentence as the end", () => {
  const s = splitSentences(WORDS);
  assert.equal(s.length, 4);
  assert.equal(s[0].text, "Haces commit.");
  assert.equal(s[0].t1, s[1].t0);
});

test("coverage lint: a sentence needs a drawn change AND an interaction; stamps and labels alone fail", () => {
  const beats = [{ t: 0.2, do: "hero-stamp" }, { t: 0.5, do: "label" }, { t: 1.6, do: "transform" }, { t: 2.6, do: "pulse" }, { t: 3.6, do: "travel" }];
  const r = coverageReport({ words: WORDS, beats });
  const bySentence = r.sentences.map((s) => [s.stampsOnly, s.ok]);
  assert.deepEqual(bySentence[0], [true, false], "stamps/labels only");
  assert.equal(r.sentences[1].ok, true);
  assert.equal(r.sentences[2].ok, false, "a pulse is emphasis, not an interaction");
  assert.match(r.sentences[0].issues.join(), /only by stamps/);
  assert.equal(r.ok, false);
});

const STORED = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "04-projects", "2026-11-03-commit-vs-push-guardar-no-es-enviar");
const PROOF = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "04-projects", "pixel-interact-proof");
const lintOf = (specPath, wordsPath) => {
  const spec = JSON.parse(readFileSync(specPath, "utf8")); let w = JSON.parse(readFileSync(wordsPath, "utf8")); w = Array.isArray(w) ? w : w.words;
  const p = payloadSchema.parse(normalizePayload(spec.hf));
  return resolvePayload({ payload: p, words: w, durationSec: w[w.length - 1].end + 0.6 });
};
test("coverage lint FAILS on the stored commit-vs-push spec and PASSES on the rewritten one", { skip: !existsSync(join(STORED, "words.json")) || !existsSync(join(PROOF, "spec.json")) }, () => {
  const old = lintOf(join(STORED, "spec.json"), join(STORED, "words.json"));
  assert.equal(old.coverage.written.ok, false);
  assert.ok(old.coverage.written.missing.length >= 8, `${old.coverage.written.missing.length} sentences without interaction`);
  assert.ok(old.warnings.some((w) => /^coverage: sentence \d+ .*no interaction beat/.test(w)));
  const fixed = lintOf(join(PROOF, "spec.json"), join(STORED, "words.json"));
  assert.equal(fixed.coverage.written.ok, true, fixed.coverage.written.sentences.filter((s) => !s.ok).map((s) => s.text).join(" / "));
  assert.equal(fixed.warnings.filter((w) => /^coverage:/.test(w)).length, 0);
});

test("interactPunctuate adds a pulse and a travelling token to sentences without an interaction, never touching written beats", () => {
  const sentences = splitSentences(WORDS), written = [{ t: 0.6, do: "travel" }];
  const add = interactPunctuate({ sentences, beats: written, propIds: ["parcel", "mailbox"], t0: 0, t1: DUR });
  assert.ok(add.length >= 4 && add.length % 2 === 0);
  assert.ok(add.every((b) => b.auto && b.interact), "marked automatic");
  assert.ok(add.some((b) => b.do === "travel" && b.who === "hero" && ["parcel", "mailbox"].includes(b.to)));
  assert.ok(!add.some((b) => b.t >= sentences[0].t0 && b.t < sentences[0].t1), "the covered sentence is left alone");
  assert.deepEqual(interactPunctuate({ sentences, beats: written, propIds: [], t0: 0, t1: DUR }), []);
  const r = resolvePayload({ payload: parse(world([{ on: { word: "Haces" }, do: "travel", target: "parcel", to: "mailbox" }])).data, words: WORDS, durationSec: DUR });
  assert.ok(r.warnings.some((w) => /had no interaction; added a pulse and a travelling token/.test(w)), "reported as a warning");
  assert.equal(r.coverage.final.ok, true);
  assert.equal(r.coverage.written.ok, false);
});

test("automatic stamps never repeat a word of the caption on screen", () => {
  const ws = words("Cuando haces commit guardas tus cambios en tu computadora pero nadie mas los ve. Push es enviar esos cambios al repositorio remoto para que tu equipo pueda trabajar con ellos.", 0.42);
  const groups = captionGroups(ws), nrm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  const add = punctuate({ t0: 0, t1: 9, beats: [], words: ws, groups, hook: true });
  const stamps = add.filter((b) => b.do === "hero-stamp");
  assert.ok(stamps.length >= 2);
  for (const s of stamps) {
    const g = groups.find((x) => s.t >= x.t0 - 0.02 && s.t < x.tEnd);
    assert.ok(!g.words.some((w) => nrm(w.d) === nrm(s.text)), `stamp ${s.text} repeats the caption "${g.words.map((w) => w.d).join(" ")}"`);
  }
});

test("a zoom never crops the hero at the frame edge", () => {
  const f = sandbox({ worlds: [{ scenario: "post-office", cast: [{ who: "hero", at: "left" }], beats: [{ on: { word: "push" }, do: "push", target: "mailbox", amount: 1.5, hold: 1 }, { on: { word: "caja" }, do: "radial-burst", target: "mailbox" }] }] });
  const ks = JSON.parse(f.run("JSON.stringify([WORLDS[0].zoom.concat(WORLDS[0].punch), heroXAt(WORLDS[0].cast[0], 1), WORLDS[0].cast[0].u])"));
  assert.ok(ks[0].length >= 2);
  for (const k of ks[0]) {
    const lo = k.ox * (1 - 1 / k.z), hi = lo + 270 / k.z, half = 14 * ks[2];
    assert.ok(ks[1] - half >= lo - 0.5 && ks[1] + half <= hi + 0.5, `hero [${ks[1] - half}, ${ks[1] + half}] inside the ${k.z}x window [${lo.toFixed(1)}, ${hi.toFixed(1)}]`);
  }
});

test("the payload accepts hf.ambient (calm|normal|lively, default normal) and the prompt teaches the plan, the kinds and two worked examples", () => {
  assert.equal(parse(world([])).data.ambient, "normal");
  assert.equal(parse({ ambient: "lively", ...world([]) }).data.ambient, "lively");
  assert.match(issues({ ambient: "wild", ...world([]) }).join(), /unknown ambient level "wild"; use one of: calm, normal, lively/);
  for (const k of MECH_KINDS) assert.ok(promptSection.includes(`- ${k}:`), `${k} documented`);
  assert.match(promptSection, /PLAN FIRST/); assert.match(promptSection, /LITERAL METAPHOR/); assert.match(promptSection, /commit vs push/); assert.match(promptSection, /restaurant/);
  const ex = JSON.parse(promptSection.match(/```json\n([\s\S]*?)```/)[1]);
  assert.ok(payloadSchema.safeParse(ex).success);
  assert.ok(ex.worlds.flatMap((w) => w.beats).some((b) => b.do === "travel"));
});

test("no forbidden APIs in the new runtime code", () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "hf", "pixel-world");
  for (const p of [join(dir, "runtime", "beats.js"), join(dir, "runtime", "fx.js"), join(dir, "coverage.mjs")]) assert.doesNotMatch(readFileSync(p, "utf8"), /Date\.now|Math\.random|requestAnimationFrame|repeat:\s*-1|performance\.now/, p);
  assert.ok(readdirSync(dir).includes("coverage.mjs"));
});

test("the placement solver moves the hero sideways instead of shrinking it to size S", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../hf/pixel-world/runtime/beats.js", import.meta.url), "utf8");
  assert.ok(!/\['S'\]/.test(src), "prepWorld must not try a smaller hero size");
});
