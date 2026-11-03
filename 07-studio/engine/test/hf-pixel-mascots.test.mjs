import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadMascots, mascotSchema, resetMascotCache, getMascot, defaultHeroId } from "../hf/pixel-world/mascots.mjs";
import { loadCatalog } from "../hf/pixel-world/catalog.mjs";
import { payloadSchema } from "../hf/pixel-world/schema.mjs";
import { STYLES } from "../hf/pixel-world/styles.mjs";
import { open, prepare } from "../hf/pixel-world/sandbox.mjs";
import { buildPromptSection } from "../hf/pixel-world/prompt.mjs";
import { buildHtml } from "../hf/pixel-world/compose.mjs";
import { meta } from "../hf/pixel-world/index.mjs";

const WORDS = "uno dos tres cuatro cinco seis siete ocho nueve diez".split(" ").map((text, i) => ({ text, start: +(i * 0.7).toFixed(2), end: +(i * 0.7 + 0.55).toFixed(2) }));
const hfOf = (extra = {}) => ({ style: "pixel-snes-16bit", worlds: [{ scenario: "factory", beats: [] }], ...extra });

test("the saved mascot from the user's photo is valid and is the default hero", () => {
  const m = getMascot("chris");
  assert.ok(m, "03-assets/mascots/chris/mascot.json loads");
  assert.equal(m.hairStyle, "curly");
  assert.equal(m.glasses, true);
  assert.ok(m.backpack && m.stripe && m.logo && m.shoeAccent);
  assert.equal(defaultHeroId(), "chris");
  assert.equal(loadMascots().errors.length, 0);
});

test("a mascot is a selectable hero: catalog, schema, default and the format meta know it", () => {
  const heroes = loadCatalog().heroes;
  assert.ok(heroes.some((h) => h.id === "chris" && h.mascot), "catalog lists the mascot");
  for (const id of ["hoodie", "capgirl", "wizard", "astro", "robot"]) assert.ok(heroes.some((h) => h.id === id), `built-in ${id} stays`);
  assert.equal(payloadSchema.parse(hfOf()).hero, "chris", "no hero named: the default mascot");
  assert.equal(payloadSchema.parse(hfOf({ hero: "wizard" })).hero, "wizard");
  const bad = payloadSchema.safeParse(hfOf({ hero: "nobody" }));
  assert.equal(bad.success, false);
  assert.match(JSON.stringify(bad.error.issues), /chris/);
  assert.equal(meta.defaultMascot, "chris");
  assert.ok(meta.mascots.some((m) => m.id === "chris" && m.custom));
});

test("the mascot design travels inlined in the composition data", () => {
  const { data } = prepare({ hf: hfOf(), words: WORDS, durationSec: 8 });
  assert.equal(data.hero, "chris");
  assert.equal(data.mascots.length, 1);
  assert.equal(data.mascots[0].id, "chris");
  const w = prepare({ hf: hfOf({ hero: "wizard" }), words: WORDS, durationSec: 8 }).data;
  assert.deepEqual(w.mascots, [], "a built-in hero inlines no mascot");
});

test("the mascot draws, talks and shows its portrait in every one of the 14 pixel styles", () => {
  assert.equal(STYLES.length, 14);
  for (const s of STYLES) {
    const { data, style } = prepare({ hf: hfOf({ style: s.id }), words: WORDS, durationSec: 8 });
    const rt = open({ data, style });
    for (const t of [0.5, 2.1, 4.4]) {
      const f = rt.at(t);
      assert.ok(f.thirds[1].covered > 0.2, `${s.id} t=${t}: the middle of the frame is drawn`);
    }
    assert.equal(rt.run("typeof portrait"), "function", `${s.id}: portrait helper`);
    assert.equal(rt.run("HEROES.chris.glasses"), true, `${s.id}: the mascot is registered with its glasses`);
    assert.doesNotThrow(() => rt.run("(() => { const g = document.getElementById('dp').getContext('2d'); portrait(g, HEROES.chris, { w: 32, h: 32, t: 1, talk: 2 }); })()"), `${s.id}: portrait`);
  }
});

test("invalid mascot files are reported, never thrown, and a mascot must match its folder", () => {
  const dir = mkdtempSync(join(tmpdir(), "mascots-"));
  const old = process.env.CC_MASCOTS_DIR;
  try {
    mkdirSync(join(dir, "ok")); mkdirSync(join(dir, "broken")); mkdirSync(join(dir, "mismatch"));
    writeFileSync(join(dir, "ok", "mascot.json"), JSON.stringify({ id: "ok", name: "Ok", about: "fine", skin: "skin", hairStyle: "curly" }));
    writeFileSync(join(dir, "broken", "mascot.json"), JSON.stringify({ id: "broken", name: "B", about: "x", hairStyle: "mohawk" }));
    writeFileSync(join(dir, "mismatch", "mascot.json"), JSON.stringify({ id: "other", name: "M", about: "x" }));
    writeFileSync(join(dir, "index.json"), JSON.stringify({ default: "missing" }));
    process.env.CC_MASCOTS_DIR = dir; resetMascotCache();
    const lib = loadMascots();
    assert.deepEqual(lib.mascots.map((m) => m.id), ["ok"]);
    assert.equal(lib.errors.length, 2);
    assert.match(lib.errors.join("\n"), /broken\/mascot.json.*hairStyle/);
    assert.match(lib.errors.join("\n"), /must equal the folder name/);
    assert.equal(defaultHeroId(), "hoodie", "an index.json naming a missing mascot falls back to the built-in hero");
  } finally {
    if (old === undefined) delete process.env.CC_MASCOTS_DIR; else process.env.CC_MASCOTS_DIR = old;
    resetMascotCache(); rmSync(dir, { recursive: true, force: true });
  }
  assert.equal(mascotSchema.safeParse({ id: "Bad Id", name: "x", about: "x" }).success, false);
  assert.equal(mascotSchema.safeParse({ id: "x", name: "x", about: "x", skin: ["#fff"] }).success, false);
});

test("PIXEL guide: dialog-box captions with the portrait, no comment or follow call to action", () => {
  const { data, style } = prepare({ hf: hfOf({ brand: { handle: "@x" } }), words: WORDS, durationSec: 8 });
  const html = buildHtml({ data, style });
  assert.match(html, /<div id="dlg"><canvas id="dp"/);
  const p = buildPromptSection();
  assert.match(p, /NO CALL TO ACTION/);
  assert.doesNotMatch(p, /"follow":\s*\{\s*"word"/, "the example payload no longer closes with a follow click");
  assert.match(p, /christmas, desert, beach, mars, volcano/);
});
