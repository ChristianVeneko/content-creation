import { test } from "node:test";
import assert from "node:assert/strict";
import { PALETTES, PALETTE_TAGS, contrastRatio, getPalette } from "../lib/palettes.mjs";
import { validateSpec } from "../lib/spec.mjs";

const HEX = /^#[0-9A-Fa-f]{6}$/;

test("ships at least 16 named palettes with unique ids", () => {
  assert.ok(PALETTES.length >= 16, `only ${PALETTES.length} palettes`);
  const ids = PALETTES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "palette ids must be unique");
  for (const p of PALETTES) {
    assert.match(p.id, /^[a-z0-9-]+$/);
    assert.ok(p.name.trim().length > 1, `${p.id}: needs a name`);
  }
});

test("every palette is complete hex: two bg stops, text, three accents", () => {
  for (const { id, palette } of PALETTES) {
    assert.equal(palette.bg.length, 2, `${id}: bg has two stops`);
    for (const c of [...palette.bg, palette.text, palette.accent, palette.accent2, palette.accent3]) assert.match(c, HEX, `${id}: ${c}`);
  }
});

test("text is readable on every background stop (contrast >= 4.5:1)", () => {
  for (const { id, palette } of PALETTES) {
    for (const bg of palette.bg) {
      const r = contrastRatio(palette.text, bg);
      assert.ok(r >= 4.5, `${id}: text ${palette.text} on ${bg} is ${r.toFixed(2)}:1`);
    }
  }
});

test("contrastRatio matches the WCAG reference values", () => {
  assert.equal(Math.round(contrastRatio("#000000", "#FFFFFF") * 10) / 10, 21);
  assert.equal(contrastRatio("#777777", "#777777"), 1);
});

test("tags come from the known vocabulary and every palette is dark or light", () => {
  for (const { id, tags } of PALETTES) {
    assert.ok(tags.length >= 2, `${id}: at least two tags`);
    for (const t of tags) assert.ok(PALETTE_TAGS.includes(t), `${id}: unknown tag ${t}`);
    assert.ok(tags.includes("dark") !== tags.includes("light"), `${id}: exactly one of dark / light`);
  }
  for (const t of ["warm", "cool", "neon", "pastel", "earthy", "brand-like"]) assert.ok(PALETTES.some((p) => p.tags.includes(t)), `no palette tagged ${t}`);
});

test("every palette is accepted by the spec schema as theme.palette", () => {
  for (const { id, palette } of PALETTES) {
    const r = validateSpec({ version: 1, title: "t", template: "countdown", theme: { palette }, scenes: [{ id: "a", narration: "hola", visual: { type: "gradient" } }] });
    assert.ok(r.ok, `${id}: ${JSON.stringify(r.errors)}`);
    assert.deepEqual(r.spec.theme.palette, palette);
  }
});

test("getPalette finds by id and returns undefined for unknown ids", () => {
  assert.equal(getPalette(PALETTES[0].id), PALETTES[0]);
  assert.equal(getPalette("nope"), undefined);
});
