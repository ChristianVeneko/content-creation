import test from "node:test";
import assert from "node:assert/strict";
import { PALETTES, contrastRatio } from "../lib/palettes.mjs";
import { listTemplates } from "../lib/templates.mjs";
import { resolveSpec } from "../lib/spec.mjs";
import { adaptPalette, TEXT_MIN, ACCENT_MIN } from "../lib/palette-adapt.mjs";

const worst = (fg, bgs) => Math.min(...bgs.map((b) => contrastRatio(fg, b)));
const accents = (p) => [p.accent, p.accent2, p.accent3].filter(Boolean);

const passes = (p) => {
  assert.ok(worst(p.text, p.bg) >= TEXT_MIN, `text ${p.text} on ${p.bg}: ${worst(p.text, p.bg).toFixed(2)}`);
  for (const a of accents(p)) assert.ok(worst(a, p.bg) >= ACCENT_MIN, `accent ${a} on ${p.bg}: ${worst(a, p.bg).toFixed(2)}`);
};

test("a palette that already reads well is returned unchanged", () => {
  const p = { bg: ["#0F0C29", "#302B63"], text: "#FFFFFF", accent: "#FFD60A", accent2: "#5C8BFF", accent3: "#FF8FA3" };
  passes(p);
  assert.deepEqual(adaptPalette(p), p);
});

test("low-contrast text and accents are nudged until they read, bg is untouched when text can fit", () => {
  const p = { bg: ["#F4EFE6", "#E8DFCF"], text: "#CFC8BA", accent: "#F2E58A", accent2: "#BDE9F5" };
  const out = adaptPalette(p);
  assert.deepEqual(out.bg, p.bg);
  passes(out);
  assert.notEqual(out.text, p.text);
});

test("a gradient too wide for any text color gets only its offending stop moved", () => {
  const p = { bg: ["#1A0B3B", "#5B1AA8", "#E1306C"], text: "#FFFFFF", accent: "#FFD60A" };
  const out = adaptPalette(p);
  passes(out);
  assert.equal(out.bg[0], p.bg[0]);
  assert.equal(out.bg[1], p.bg[1]);
  assert.notEqual(out.bg[2], p.bg[2]);
});

test("adapting is idempotent", () => {
  const p = { bg: ["#FFD60A", "#FFB300"], text: "#FFF4B0", accent: "#FFE866" };
  const once = adaptPalette(p);
  assert.deepEqual(adaptPalette(once), once);
});

test("optional accents stay absent when the palette has none", () => {
  const out = adaptPalette({ bg: ["#101010"], text: "#EEEEEE", accent: "#FFD60A" });
  assert.equal("accent2" in out, false);
  assert.equal("accent3" in out, false);
});

test("every template with every palette preset resolves to a readable palette", () => {
  // HyperFrames formats carry their own styles instead of a theme palette
  const templates = listTemplates().filter((t) => t.engine !== "hyperframes");
  assert.ok(templates.length >= 40);
  for (const t of templates) {
    // the template's own palette: designed fills keep their colors, but the text must read and nothing is altered
    const own = resolveSpec({ title: "t", template: t.id, scenes: [{}] }, t).theme.palette;
    assert.ok(worst(own.text, own.bg) >= TEXT_MIN, `${t.id} default text ${own.text} on ${own.bg}`);
    assert.deepEqual(own, adaptPalette(t.defaults.theme.palette, { accents: false }), `${t.id} default palette is not a fixed point`);
    // user-picked presets, including light ones on dark-first templates and vice versa
    for (const { id, palette } of PALETTES) {
      const resolved = resolveSpec({ title: "t", template: t.id, theme: { palette }, scenes: [{}] }, t);
      try {
        passes(resolved.theme.palette);
      } catch (e) {
        throw new Error(`${t.id} x ${id}: ${e.message}`);
      }
    }
  }
});

test("explicit user colors win unless they would be unreadable", () => {
  const t = listTemplates()[0];
  const own = { bg: ["#0A0A0A"], text: "#FFFFFF", accent: "#00E5FF" };
  assert.deepEqual(resolveSpec({ title: "t", template: t.id, theme: { palette: own }, scenes: [{}] }, t).theme.palette.accent, "#00E5FF");
});
