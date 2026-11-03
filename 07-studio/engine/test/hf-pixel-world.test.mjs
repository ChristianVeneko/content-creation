import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { meta, payloadSchema, promptSection, normalize, compose, catalog } from "../hf/pixel-world/index.mjs";
import { resolveWordRef, captionGroups, resolvePayload } from "../hf/pixel-world/resolve.mjs";
import { normalizePayload } from "../hf/pixel-world/normalize.mjs";
import { RUNTIME_DIR } from "../hf/pixel-world/catalog.mjs";

const NARRATION = "Sabías que ChatGPT no lee palabras? Lee fichas. Se llaman tokens. Cada pedacito es un token. Las palabras cortas suelen ser una sola ficha, pero una palabra larga se parte en varios trozos.";
const words = NARRATION.split(/\s+/).map((text, i) => ({ text, start: +(i * 0.4).toFixed(2), end: +(i * 0.4 + 0.35).toFixed(2) }));
const tmp = () => mkdtempSync(join(tmpdir(), "pw-test-"));
const example = () => JSON.parse(promptSection.match(/```json\n([\s\S]*?)```/)[1]);

test("contract: meta, schema, prompt and compose are exported", () => {
  assert.equal(meta.id, "pixel-world");
  assert.deepEqual(meta.modes, ["multi", "single"]);
  assert.ok(meta.styles.length >= 10, "at least 10 styles");
  assert.ok(catalog().scenarios.length >= 24, "at least 24 scenarios");
  assert.ok(catalog().heroes.length >= 4, "at least 4 hero designs");
  assert.ok(catalog().npcs.length >= 3);
  for (const s of meta.styles) assert.ok(s.id && s.name && s.about);
  assert.equal(typeof compose, "function");
  assert.equal(typeof payloadSchema.safeParse, "function");
});

test("schema accepts the example of the prompt", () => {
  const r = payloadSchema.safeParse(example());
  assert.ok(r.success, r.success ? "" : JSON.stringify(r.error.issues));
});

test("schema rejects an unknown scenario and style with a clear path", () => {
  const ex = example(); ex.worlds[0].scenario = "moon-base"; ex.style = "pixel-nope";
  const r = payloadSchema.safeParse(ex); assert.equal(r.success, false);
  const byPath = Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
  assert.match(byPath["worlds.0.scenario"], /unknown scenario "moon-base".*factory/);
  assert.match(byPath["style"], /unknown style "pixel-nope".*pixel-snes-16bit/);
});

test("schema rejects a beat target that is not a prop of the scenario", () => {
  const ex = example(); ex.worlds[0].beats[0].target = "rocket";
  const r = payloadSchema.safeParse(ex); assert.equal(r.success, false);
  const issue = r.error.issues.find((i) => i.path.join(".") === "worlds.0.beats.0.target");
  assert.match(issue.message, /no prop "rocket".*machine/);
});

test("schema requires per-kind fields and rejects unknown beat kinds", () => {
  const ex = example(); ex.worlds[0].beats = [{ on: { word: "a" }, do: "hero-stamp" }, { on: { word: "a" }, do: "explode-all" }, { do: "pulse", target: "belt" }];
  const r = payloadSchema.safeParse(ex); assert.equal(r.success, false);
  const paths = r.error.issues.map((i) => i.path.join("."));
  assert.ok(paths.includes("worlds.0.beats.0.text"));
  assert.ok(paths.includes("worlds.0.beats.1.do"));
  assert.ok(paths.some((p) => p.startsWith("worlds.0.beats.2.on")));
});

test("normalize maps common slips without dropping content", () => {
  const spec = { template: "pixel-world", mode: "multi", hf: { style: "gameboy", hero: "girl", scenes: [
    { scenario: "tienda", transition: "wipe", time: "sunset", cast: [{ who: "main", at: "Left", size: "large" }], beats: [
      { on: "fichas", do: "glow", target: "shelves", value: "0.5" }, { word: "tokens", n: "2", do: "stamp text", text: "A".repeat(50) }, { on: { word: "x" }, do: "shake", amp: 99 }, { on: { word: "y" }, do: "emote", symbol: "love" } ] },
  ] } };
  const out = normalize(spec);
  assert.equal(out.hf.style, "pixel-gameboy-dmg");
  assert.equal(out.hf.hero, "capgirl");
  const w = out.hf.worlds[0];
  assert.equal(w.scenario, "shop"); assert.equal(w.transition, "tiles"); assert.equal(w.time, "dusk");
  assert.deepEqual(w.cast[0], { who: "hero", at: "left", size: "L" });
  assert.deepEqual(w.beats[0].on, { word: "fichas" }); assert.equal(w.beats[0].do, "light"); assert.equal(w.beats[0].target, "shelf");
  assert.deepEqual(w.beats[1].on, { word: "tokens", n: 2 }); assert.equal(w.beats[1].do, "hero-stamp"); assert.equal(w.beats[1].text.length, 32);
  assert.equal(w.beats[2].amp, 6); assert.equal(w.beats[3].symbol, "heart");
  assert.equal(w.beats.length, 4);
  assert.ok(payloadSchema.safeParse(out.hf).success, JSON.stringify(payloadSchema.safeParse(out.hf).error?.issues));
  assert.deepEqual(spec.hf.style, "gameboy", "input is not mutated");
});

test("normalize leaves unmappable values for the validator and never touches foreign specs", () => {
  const out = normalizePayload({ style: "zzzzzzzz", worlds: [{ scenario: "qqqqqqq", beats: [] }] });
  assert.equal(out.style, "zzzzzzzz");
  const spec = { template: "flat-2d", scenes: [{ id: "s1" }] };
  assert.equal(normalize(spec), spec);
});

test("word binding resolves the n-th occurrence, ignores accents and punctuation", () => {
  const ws = [{ text: "Cada", start: 1, end: 1.3 }, { text: "token.", start: 2, end: 2.4 }, { text: "cada", start: 3, end: 3.2 }, { text: "TOKEN,", start: 4, end: 4.2 }, { text: "Número", start: 5, end: 5.4 }];
  assert.equal(resolveWordRef(ws, { word: "token" }).t, 2);
  assert.equal(resolveWordRef(ws, { word: "token", n: 2 }).t, 4);
  assert.equal(resolveWordRef(ws, { word: "cada", n: 2 }).t, 3);
  assert.equal(resolveWordRef(ws, { word: "numero" }).t, 5);
  assert.equal(resolveWordRef(ws, { word: "token", offset: -0.25 }).t, 1.75);
  assert.equal(resolveWordRef(ws, { word: "tokens" }).match, "prefix", "plural tolerated");
  assert.equal(resolveWordRef(ws, { word: "token", n: 9 }).t, 4, "falls back to the last occurrence");
  assert.equal(resolveWordRef(ws, { word: "cada token" }).t, 1, "phrases bind to their first word");
  assert.equal(resolveWordRef(ws, { word: "zzz" }), null);
  assert.equal(resolveWordRef(ws, { at: 7.5 }).t, 7.5);
});

test("resolvePayload: worlds, beats bound to words, hud, sfx and caption groups", () => {
  const payload = payloadSchema.parse({ style: "pixel-pico8", flash: false, brand: { handle: "@x", follow: { word: "trozos." } }, worlds: [
    { scenario: "factory", beats: [{ on: { word: "fichas." }, do: "burst", target: "machine" }, { on: { word: "tokens." }, do: "progress", value: 0.5 }, { on: { word: "tokens." }, do: "flash" }] },
    { scenario: "shop", from: { word: "Cada" }, beats: [{ on: { word: "nope-not-there" }, do: "pulse", target: "sign" }] } ] });
  const r = resolvePayload({ payload, words, durationSec: 14, captionsEnabled: true });
  const t = (w) => words.find((x) => x.text === w).start;
  assert.equal(r.data.worlds[0].beats[0].t, t("fichas."));
  assert.equal(r.data.worlds[1].t0, t("Cada"));
  assert.equal(r.data.hud[0].t, t("tokens.")); assert.equal(r.data.hud[0].value, 0.5);
  assert.ok(!r.data.worlds[0].beats.some((b) => b.do === "flash"), "flash is off by default");
  assert.ok(r.warnings.some((w) => /flash/.test(w)) && r.warnings.some((w) => /nope-not-there/.test(w)));
  const unresolved = r.data.worlds[1].beats[0].t; assert.ok(unresolved > r.data.worlds[1].t0 && unresolved < 14, "unbound beat is spread, not dropped");
  assert.ok(r.sfx.some((s) => s.kind === "hit" && s.at === t("fichas.")) && r.sfx.some((s) => s.kind === "whoosh"));
  assert.ok(r.data.brand.followAt > 0);
  for (const g of captionGroups(words)) assert.ok(g.words.length >= 1 && g.words.length <= 4);
});

test("compose is deterministic: byte-identical output twice, own captions, variable and safe fonts", async () => {
  const spec = { mode: "multi", hf: example() };
  const a = tmp(), b = tmp();
  try {
    const ra = await compose({ spec, words, durationSec: 12, outDir: a, captions: { enabled: true } });
    const rb = await compose({ spec, words, durationSec: 12, outDir: b, captions: { enabled: true } });
    assert.equal(ra.entry, "index.html"); assert.equal(ra.durationSec, 12); assert.deepEqual(ra.sfx, rb.sfx);
    for (const f of ["index.html", "hyperframes.json", "meta.json"]) assert.equal(readFileSync(join(a, f), "utf8"), readFileSync(join(b, f), "utf8"), f);
    const html = readFileSync(join(a, "index.html"), "utf8");
    assert.match(html, /data-composition-variables='\[\{"id":"captions","type":"boolean","label":"Captions","default":true\}\]'/);
    assert.match(html, /data-width="1080" data-height="1920"/);
    assert.ok(readdirSync(join(a, "assets", "fonts")).includes("PressStart2P-Regular.ttf"));
    const off = tmp(); await compose({ spec, words, durationSec: 12, outDir: off, captions: { enabled: false } });
    assert.match(readFileSync(join(off, "index.html"), "utf8"), /"default":false/); rmSync(off, { recursive: true, force: true });
  } finally { rmSync(a, { recursive: true, force: true }); rmSync(b, { recursive: true, force: true }); }
});

test("every style x a sample of scenarios composes in both modes without throwing", async () => {
  const cat = catalog(), sample = [cat.scenarios[0].id, cat.scenarios[Math.floor(cat.scenarios.length / 2)].id, cat.scenarios.at(-1).id];
  const dirs = [];
  try {
    for (const st of cat.styles) for (const mode of ["multi", "single"]) {
      const d = tmp(); dirs.push(d);
      const hf = { style: st.id, layout: mode === "single" && st.id.endsWith("c64") ? "tower" : "strip", worlds: sample.map((s) => ({ scenario: s, beats: [{ on: { word: "tokens." }, do: "light", target: cat.scenarios.find((x) => x.id === s).props[0].id }] })) };
      const r = await compose({ spec: { mode, hf }, words, durationSec: 15, outDir: d });
      assert.equal(r.durationSec, 15);
      assert.match(readFileSync(join(d, "index.html"), "utf8"), new RegExp(`"id":"${st.id}"`));
    }
  } finally { for (const d of dirs) rmSync(d, { recursive: true, force: true }); }
});

test("compose reports precise validation errors", async () => {
  const d = tmp();
  try { await assert.rejects(() => compose({ spec: { hf: { worlds: [{ scenario: "factory", beats: [{ on: { word: "a" }, do: "burst", target: "zzz" }] }] } }, words, durationSec: 5, outDir: d }), /hf\.worlds\.0\.beats\.0\.target: scenario "factory" has no prop "zzz"/); }
  finally { rmSync(d, { recursive: true, force: true }); }
});

test("determinism: no Date.now / Math.random / requestAnimationFrame / repeat:-1 in the runtime or generated files", async () => {
  const files = readdirSync(RUNTIME_DIR).filter((f) => f.endsWith(".js")).map((f) => readFileSync(join(RUNTIME_DIR, f), "utf8"));
  const d = tmp();
  try { await compose({ spec: { hf: example() }, words, durationSec: 12, outDir: d }); files.push(readFileSync(join(d, "index.html"), "utf8")); } finally { rmSync(d, { recursive: true, force: true }); }
  for (const src of files) {
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(code, /Date\.now|Math\.random|requestAnimationFrame|repeat\s*:\s*-1|new Date\(/);
  }
});

test("every scenario declares 3+ props and the cast/styles lists are consistent", () => {
  const cat = catalog();
  for (const s of cat.scenarios) { assert.ok(s.props.length >= 3, `${s.id} props`); assert.ok(s.about.length > 20); }
  assert.equal(new Set(cat.scenarios.map((s) => s.id)).size, cat.scenarios.length);
  for (const st of cat.styles) assert.ok(st.palette.length >= 2 && st.palette.every((c) => /^#[0-9a-f]{6}$/i.test(c)), st.id);
});
