import { test } from "node:test";
import assert from "node:assert/strict";
import { THEMES, getTheme } from "../lib/themes.mjs";
import { PALETTES } from "../lib/palettes.mjs";
import { MOODS } from "../lib/music-moods.mjs";

const REQUIRED = ["tecnologia-ia", "programacion", "finanzas", "salud-fitness", "cocina", "viajes", "educacion", "noticias", "motivacion", "ciencia", "gaming", "negocios-marketing"];

test("ships the 12 required topics (and maybe more) with unique ids", () => {
  assert.ok(THEMES.length >= 12);
  const ids = THEMES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of REQUIRED) assert.ok(ids.includes(id), `missing theme ${id}`);
});

test("every theme has a label, an example prompt and a tone", () => {
  for (const t of THEMES) {
    assert.ok(t.label.trim().length > 2, `${t.id}: label`);
    assert.ok(t.examplePrompt.trim().length > 30, `${t.id}: examplePrompt`);
    assert.ok(t.tone.trim().length > 2, `${t.id}: tone`);
  }
});

test("palette ids and music moods point at real presets", () => {
  const palettes = new Set(PALETTES.map((p) => p.id));
  for (const t of THEMES) {
    assert.ok(palettes.has(t.palette), `${t.id}: unknown palette ${t.palette}`);
    assert.ok(MOODS.includes(t.mood), `${t.id}: unknown mood ${t.mood}`);
  }
});

test("each theme recommends at least two template ids, without duplicates", () => {
  for (const t of THEMES) {
    assert.ok(Array.isArray(t.templates) && t.templates.length >= 2, `${t.id}: templates`);
    assert.equal(new Set(t.templates).size, t.templates.length, `${t.id}: duplicate template ids`);
    for (const id of t.templates) assert.match(id, /^[a-z0-9-]+$/);
  }
});

test("getTheme finds by id", () => {
  assert.equal(getTheme("cocina")?.id, "cocina");
  assert.equal(getTheme("nope"), undefined);
});
