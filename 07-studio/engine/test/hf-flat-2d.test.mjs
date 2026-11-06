import { test } from "node:test";
import assert from "node:assert/strict";
import * as flat from "../hf/flat-2d/index.mjs";
import { EXAMPLE_PAYLOAD, EXAMPLE_WORDS } from "../hf/flat-2d/example.mjs";
import { STYLE_IDS, SETTING_IDS, KIT_KINDS, BEAT_KINDS, DESIGN_IDS } from "../hf/flat-2d/schema.mjs";
import { resolveWord, normWord } from "../hf/flat-2d/words.mjs";

const clone = (o) => JSON.parse(JSON.stringify(o));

test("meta follows the HyperFrames format contract", () => {
  assert.equal(flat.meta.id, "flat-2d");
  assert.deepEqual(flat.meta.modes, ["single", "multi"]);
  assert.ok(flat.meta.styles.length >= 8);
  assert.ok(flat.meta.settings.length >= 14);
  for (const s of [...flat.meta.styles, ...flat.meta.settings]) assert.ok(s.id && s.name && s.about, `meta entry ${s.id}`);
  assert.deepEqual(flat.meta.styles.map((s) => s.id), STYLE_IDS);
  assert.deepEqual(flat.meta.settings.map((s) => s.id), SETTING_IDS);
  assert.ok(DESIGN_IDS.length >= 4);
  assert.equal(typeof flat.promptSection, "string");
  assert.equal(typeof flat.compose, "function");
});

test("schema accepts the example payload", () => {
  const r = flat.payloadSchema.safeParse(EXAMPLE_PAYLOAD);
  assert.ok(r.success, r.success ? "" : JSON.stringify(r.error.issues, null, 1));
});

test("schema rejects unknown enum values with a clear path", () => {
  const bad = clone(EXAMPLE_PAYLOAD);
  bad.style = "flat-nope";
  bad.scenes[0].setting = "moon-base";
  bad.scenes[0].props[0].kind = "hologram";
  bad.scenes[0].beats[0].do = "explode";
  const r = flat.payloadSchema.safeParse(bad);
  assert.equal(r.success, false);
  const paths = r.error.issues.map((i) => i.path.join("."));
  for (const p of ["style", "scenes.0.setting", "scenes.0.props.0.kind", "scenes.0.beats.0.do"]) assert.ok(paths.includes(p), `missing issue at ${p}: ${paths}`);
  assert.match(r.error.issues.find((i) => i.path.join(".") === "style").message, /flat-soft-gradient/);
});

test("schema checks references and required beat params", () => {
  const bad = clone(EXAMPLE_PAYLOAD);
  bad.scenes[0].beats.push({ on: { word: "x" }, do: "type", target: "no-such-prop", text: "a" });
  bad.scenes[0].beats.push({ on: { word: "x" }, do: "count" });
  const r = flat.payloadSchema.safeParse(bad);
  assert.equal(r.success, false);
  const msgs = r.error.issues.map((i) => i.path.join(".") + " " + i.message).join("\n");
  assert.match(msgs, /target.*no-such-prop/s);
  assert.match(msgs, /count.*target/s);
});

test("schema rejects duplicate ids and empty scenes", () => {
  const dup = clone(EXAMPLE_PAYLOAD);
  dup.scenes[1].id = dup.scenes[0].id;
  assert.equal(flat.payloadSchema.safeParse(dup).success, false);
  assert.equal(flat.payloadSchema.safeParse({ ...clone(EXAMPLE_PAYLOAD), scenes: [] }).success, false);
});

test("normalize fixes common slips without dropping content", () => {
  const slip = {
    style: "Neon",
    scenes: [
      { setting: "Browser", label: "A", props: [{ id: "b", kind: "Browser Window", at: "TOP", size: "large", url: "x.com" }],
        cast: [{ who: "NICO", at: "left" }],
        beats: [{ on: "Enter", do: "typing", target: "b", text: "x.com" }, { on: { words: ["una"] }, do: "zoom", target: "b" }, { on: { word: "URL", n: "2" }, do: "pop", target: "B" }] },
      { setting: "street", props: [], beats: [{ on: { word: "casa" }, do: "emote", target: "nico", icon: "Light_Bulb" }] },
    ],
  };
  const n = flat.normalize(clone(slip));
  const r = flat.payloadSchema.safeParse(n);
  assert.ok(r.success, r.success ? "" : JSON.stringify(r.error.issues, null, 1));
  assert.equal(n.style, "flat-dark-neon-ui");
  assert.equal(n.scenes[0].setting, "desktop-browser");
  assert.equal(n.scenes[0].props[0].kind, "browser");
  assert.equal(n.scenes[0].beats.length, 3, "no beat dropped");
  assert.equal(n.scenes[0].beats[0].do, "type");
  assert.deepEqual(n.scenes[0].beats[0].on, { word: "Enter" });
  assert.equal(n.scenes[0].beats[2].on.n, 2);
  assert.equal(n.scenes[1].setting, "city-street");
  assert.equal(n.scenes[1].beats[0].icon, "lightbulb");
  assert.ok(n.scenes[0].id && n.scenes[1].id && n.scenes[0].id !== n.scenes[1].id);
  // idempotent
  assert.deepEqual(flat.normalize(clone(n)), n);
});

test("word binding resolves the n-th occurrence, accent-insensitive", () => {
  const words = [
    { text: "Una", start: 0, end: 0.2 }, { text: "URL,", start: 0.2, end: 0.5 }, { text: "otra", start: 0.5, end: 0.8 },
    { text: "url", start: 0.8, end: 1.1 }, { text: "Cómo", start: 1.1, end: 1.4 }, { text: "como.", start: 1.4, end: 1.7 },
  ];
  assert.equal(normWord("Cómo,"), "como");
  assert.equal(resolveWord(words, { word: "url" }).start, 0.2);
  assert.equal(resolveWord(words, { word: "URL", n: 2 }).start, 0.8);
  assert.equal(resolveWord(words, { word: "como", n: 2 }).index, 5);
  assert.equal(resolveWord(words, { word: "inexistente" }), null);
  assert.equal(resolveWord(words, { word: "url", n: 3 }), null);
  assert.equal(resolveWord(words, { word: "Cómo" , n: 1 }).index, 4);
  assert.ok(EXAMPLE_WORDS.length > 20);
});

test("the prompt section documents every style, setting, kit item and beat", () => {
  const p = flat.promptSection;
  for (const id of [...STYLE_IDS, ...SETTING_IDS, ...KIT_KINDS, ...BEAT_KINDS]) assert.ok(p.includes(id), `promptSection misses ${id}`);
  assert.match(p, /single/);
  assert.match(p, /multi/);
  assert.ok(p.includes(JSON.stringify(EXAMPLE_PAYLOAD.style)), "example payload is embedded");
});
