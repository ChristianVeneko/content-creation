import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAPTION_STYLES, resolveSpec, validateSpec } from "../lib/spec.mjs";
import { getTemplate } from "../lib/templates.mjs";
import { CAPTION_BANDS, CAPTION_POSITIONS, CAPTION_SIZES, CAPTION_SIZE_SCALE, resolveCaptionLook } from "../lib/captions.mjs";

const example = JSON.parse(readFileSync(new URL("../examples/demo.spec.json", import.meta.url), "utf8"));
const withCaptions = (captions, theme) => {
  const s = structuredClone(example);
  s.captions = { ...s.captions, ...captions };
  if (theme) s.theme = { ...s.theme, ...theme };
  return s;
};
const errorPaths = (r) => (r.errors ?? []).map((e) => e.path);

const NEW_STYLES = ["chips", "two-tone", "karaoke", "punch", "typewriter", "dialog", "neon", "underline", "minimal", "pixel"];
const LEGACY_BAND = { top: 1130, height: 260 };

test("the caption catalog keeps the four original styles and adds the ten new ones", () => {
  for (const s of ["hormozi", "clean", "boxed", "pills", ...NEW_STYLES]) assert.ok(CAPTION_STYLES.includes(s), s);
  assert.equal(CAPTION_STYLES.length, 14);
});

test("schema accepts every style in both captions.style and theme.captionStyle", () => {
  for (const style of CAPTION_STYLES) {
    const a = validateSpec(withCaptions({ style }));
    assert.equal(a.ok, true, `${style}: ${JSON.stringify(a.errors)}`);
    const b = validateSpec(withCaptions({}, { captionStyle: style }));
    assert.equal(b.ok, true, `${style}: ${JSON.stringify(b.errors)}`);
  }
});

test("schema accepts every size and position preset", () => {
  assert.deepEqual(CAPTION_SIZES, ["s", "m", "l", "xl"]);
  assert.deepEqual(CAPTION_POSITIONS, ["top", "upper", "center", "lower", "bottom"]);
  for (const size of CAPTION_SIZES) assert.equal(validateSpec(withCaptions({ size })).ok, true, size);
  for (const position of CAPTION_POSITIONS) assert.equal(validateSpec(withCaptions({ position })).ok, true, position);
});

test("schema accepts accent, uppercase and speaker", () => {
  const r = validateSpec(withCaptions({ style: "dialog", accent: "#FF3366", uppercase: true, speaker: "Nova" }));
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.spec.captions.speaker, "Nova");
});

test("schema rejects bad style, size, position, accent and speaker values with their paths", () => {
  const r = validateSpec(withCaptions({ style: "comic", size: "xxl", position: "left", accent: "red", uppercase: "yes", speaker: "x".repeat(41) }));
  assert.equal(r.ok, false);
  const paths = errorPaths(r);
  for (const p of ["captions.style", "captions.size", "captions.position", "captions.accent", "captions.uppercase", "captions.speaker"]) assert.ok(paths.includes(p), `${p} in ${paths}`);
});

test("a spec without the new caption fields validates and resolves exactly as before", () => {
  const r = validateSpec(example);
  assert.equal(r.ok, true);
  assert.deepEqual(r.spec.captions, { enabled: true, wordsPerPage: 3 });
  const full = resolveSpec(r.spec, getTemplate(example.template));
  assert.deepEqual(full.captions, { enabled: true, wordsPerPage: 3 });
  assert.equal(full.theme.captionStyle, "hormozi");
  const minimal = validateSpec({ version: 1, title: "T", template: "illustrated", scenes: [{ id: "a", narration: "hola", visual: { type: "gradient" } }] });
  const m = resolveSpec(minimal.spec, getTemplate("illustrated"));
  assert.deepEqual(m.captions, { enabled: true, wordsPerPage: 3 });
  assert.equal(m.theme.captionStyle, "pills");
});

test("default look keeps today's style, size, accent and the template's own band", () => {
  const spec = resolveSpec(validateSpec(example).spec, getTemplate(example.template));
  const look = resolveCaptionLook(spec, LEGACY_BAND);
  assert.equal(look.style, "hormozi");
  assert.equal(look.size, "m");
  assert.equal(look.scale, 1);
  assert.deepEqual(look.band, LEGACY_BAND);
  assert.equal(look.accent, spec.theme.palette.accent);
  assert.equal(look.uppercase, undefined);
  const chrome = { top: 1268, height: 124 };
  assert.deepEqual(resolveCaptionLook(spec, chrome).band, chrome);
});

test("captions.style overrides theme.captionStyle; legacy theme.captionStyle still works alone", () => {
  const over = resolveSpec(validateSpec(withCaptions({ style: "karaoke" }, { captionStyle: "boxed" })).spec, getTemplate("captions-voice"));
  assert.equal(resolveCaptionLook(over, LEGACY_BAND).style, "karaoke");
  const legacy = resolveSpec(validateSpec(withCaptions({}, { captionStyle: "boxed" })).spec, getTemplate("captions-voice"));
  assert.equal(resolveCaptionLook(legacy, LEGACY_BAND).style, "boxed");
});

test("size presets scale every style, m is the current size", () => {
  assert.deepEqual(Object.keys(CAPTION_SIZE_SCALE), CAPTION_SIZES);
  assert.equal(CAPTION_SIZE_SCALE.m, 1);
  assert.ok(CAPTION_SIZE_SCALE.s < 1 && CAPTION_SIZE_SCALE.l > 1 && CAPTION_SIZE_SCALE.xl > CAPTION_SIZE_SCALE.l);
  const spec = resolveSpec(validateSpec(withCaptions({ size: "xl" })).spec, getTemplate("captions-voice"));
  assert.equal(resolveCaptionLook(spec, LEGACY_BAND).scale, CAPTION_SIZE_SCALE.xl);
});

test("position presets are bands inside the safe area and override the template band", () => {
  for (const p of CAPTION_POSITIONS) {
    const b = CAPTION_BANDS[p];
    assert.ok(b.top >= 220 && b.top + b.height <= 1400, `${p} ${JSON.stringify(b)}`);
  }
  assert.deepEqual(CAPTION_BANDS.lower, LEGACY_BAND);
  assert.ok(CAPTION_BANDS.top.top <= 240 && CAPTION_BANDS.top.top + CAPTION_BANDS.top.height >= 470);
  assert.ok(CAPTION_BANDS.center.top <= 830 && CAPTION_BANDS.center.top + CAPTION_BANDS.center.height >= 1090);
  assert.equal(CAPTION_BANDS.bottom.top + CAPTION_BANDS.bottom.height, 1400);
  const spec = resolveSpec(validateSpec(withCaptions({ position: "top" })).spec, getTemplate("captions-voice"));
  assert.deepEqual(resolveCaptionLook(spec, { top: 1268, height: 124 }).band, CAPTION_BANDS.top);
});

test("two-tone defaults to the upper band and punch to the center band unless a position is set", () => {
  const two = resolveSpec(validateSpec(withCaptions({ style: "two-tone" })).spec, getTemplate("captions-voice"));
  assert.deepEqual(resolveCaptionLook(two, LEGACY_BAND).band, CAPTION_BANDS.upper);
  const punch = resolveSpec(validateSpec(withCaptions({ style: "punch" })).spec, getTemplate("captions-voice"));
  assert.deepEqual(resolveCaptionLook(punch, LEGACY_BAND).band, CAPTION_BANDS.center);
  const pinned = resolveSpec(validateSpec(withCaptions({ style: "punch", position: "bottom" })).spec, getTemplate("captions-voice"));
  assert.deepEqual(resolveCaptionLook(pinned, LEGACY_BAND).band, CAPTION_BANDS.bottom);
});

test("captions.accent, uppercase and speaker pass through to the look", () => {
  const spec = resolveSpec(validateSpec(withCaptions({ style: "dialog", accent: "#FF3366", uppercase: false, speaker: "Nova" })).spec, getTemplate("captions-voice"));
  const look = resolveCaptionLook(spec, LEGACY_BAND);
  assert.equal(look.accent, "#FF3366");
  assert.equal(look.uppercase, false);
  assert.equal(look.speaker, "Nova");
});

test("caption example specs validate and use the catalog options", () => {
  for (const f of ["captions-dialog", "captions-two-tone"]) {
    const raw = JSON.parse(readFileSync(new URL(`../examples/${f}.spec.json`, import.meta.url), "utf8"));
    const r = validateSpec(raw);
    assert.equal(r.ok, true, `${f}: ${JSON.stringify(r.errors)}`);
    assert.ok(r.spec.captions.style, f);
  }
});
