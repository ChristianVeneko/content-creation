import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolveSpec, validateSpec } from "../lib/spec.mjs";
import { getTemplate } from "../lib/templates.mjs";
import { CAPTION_STYLES, captionHalo, deriveCaptionColors, dimmedWord, readableOn, resolveCaptionLook } from "../lib/captions.mjs";
import { PALETTES, contrastRatio } from "../lib/palettes.mjs";
import { REEL_STYLES, defaultPalette, planReels, reelColors, reelSubtitleColors } from "../lib/reels.mjs";

const AA = 4.5;
const HEX = /^#[0-9A-F]{6}$/;
const example = JSON.parse(readFileSync(new URL("../examples/demo.spec.json", import.meta.url), "utf8"));
const withCaptions = (captions, theme) => {
  const s = structuredClone(example);
  s.captions = { ...s.captions, ...captions };
  if (theme) s.theme = { ...s.theme, ...theme };
  return s;
};
const lookOf = (raw, template = raw.template) => resolveCaptionLook(resolveSpec(validateSpec(raw).spec, getTemplate(template)), { top: 1130, height: 260 });
const LIGHT = { bg: ["#F7FBFC", "#E4F1F4"], text: "#0E2A33", accent: "#0F7C90" };
const DARK = { bg: ["#0B1020", "#18223F"], text: "#F4F6FF", accent: "#FFB547" };
// A deliberately hard palette: mid-luminance background and a low-contrast accent.
const MUDDY = { bg: ["#7A7A7A", "#6E6E6E"], text: "#9A9A9A", accent: "#8C8C40" };

/** The pairs each look must keep readable: words over the outline and the box, ink over a highlight fill. */
function assertReadable(colors, style, label) {
  for (const k of ["text", "highlight", "box", "outline"]) assert.match(colors[k], HEX, `${label} ${k}=${colors[k]}`);
  // Pills: the outline is only a drop shadow under the pill and the highlight only a fill.
  const pairs = style === "pills" ? [["text", "box"]] : [["text", "outline"], ["text", "box"], ["highlight", "outline"], ["highlight", "box"]];
  for (const [w, s] of pairs) {
    const r = contrastRatio(colors[w], colors[s]);
    assert.ok(r >= AA, `${label} ${style}: ${w} ${colors[w]} over ${s} ${colors[s]} = ${r.toFixed(2)}`);
  }
  assert.ok(contrastRatio(readableOn(colors.highlight), colors.highlight) >= AA, `${label}: ink on highlight`);
}

test("derived caption colors are readable for every palette preset and every style", () => {
  for (const p of PALETTES) for (const style of CAPTION_STYLES) assertReadable(deriveCaptionColors(p.palette, { style }), style, p.id);
});

test("derived caption colors are readable on light, dark and muddy palettes", () => {
  for (const [name, pal] of Object.entries({ LIGHT, DARK, MUDDY })) for (const style of CAPTION_STYLES) assertReadable(deriveCaptionColors(pal, { style }), style, name);
});

test("auto colors come from the palette: text, accent highlight, darkest bg stop as the shade", () => {
  const c = deriveCaptionColors(DARK, { style: "hormozi" });
  assert.equal(c.text, DARK.text);
  assert.equal(c.highlight, DARK.accent);
  assert.equal(c.outline, "#0B1020");
  assert.equal(c.box, "#0B1020");
  // A light palette keeps its own dark text and gets a light shade instead of black.
  const l = deriveCaptionColors(LIGHT, { style: "hormozi" });
  assert.equal(l.text, LIGHT.text);
  assert.ok(contrastRatio(l.outline, "#FFFFFF") < 1.5, `light outline ${l.outline}`);
});

test("pills keep light pills with dark words on both dark and light palettes", () => {
  assert.equal(deriveCaptionColors({ ...DARK, accent3: "#38D0FF" }, { style: "pills" }).highlight, "#38D0FF", "pills light the active word with accent3");
  assert.equal(deriveCaptionColors({ ...DARK, accent3: "#38D0FF" }, { style: "pills", colors: { highlight: "#FF0000" } }).highlight, "#FF0000");
  for (const pal of [DARK, LIGHT]) {
    const c = deriveCaptionColors(pal, { style: "pills" });
    assert.ok(contrastRatio(c.box, "#FFFFFF") < 1.4, `pill box ${c.box}`);
    assert.ok(contrastRatio(c.text, "#000000") < 2.5, `pill text ${c.text}`);
  }
});

test("explicit captions.colors win over the palette; captions.accent is a legacy alias of colors.highlight", () => {
  const set = { text: "#FFEEDD", highlight: "#00FF88", box: "#112233", outline: "#221100" };
  assert.deepEqual(deriveCaptionColors(DARK, { style: "boxed", colors: set }), set);
  assert.equal(deriveCaptionColors(DARK, { style: "hormozi", accent: "#FF3366" }).highlight, "#FF3366");
  assert.equal(deriveCaptionColors(DARK, { style: "hormozi", accent: "#FF3366", colors: { highlight: "#00FF88" } }).highlight, "#00FF88");
  // Lowercase / short hex normalizes to #RRGGBB.
  assert.equal(deriveCaptionColors(DARK, { colors: { text: "#fed" } }).text, "#FFEEDD");
});

test("a partial override keeps the rest automatic and readable", () => {
  const c = deriveCaptionColors(LIGHT, { style: "hormozi", colors: { highlight: "#FFE600" } });
  assert.equal(c.highlight, "#FFE600");
  assert.ok(contrastRatio(c.text, c.outline) >= AA);
  assert.ok(contrastRatio(c.highlight, c.outline) >= AA, `outline ${c.outline} adapts to the yellow highlight`);
  assert.ok(contrastRatio(c.text, c.box) >= AA, `text ${c.text} adapts to the box ${c.box}`);
});

test("resolveCaptionLook exposes look.colors from the spec palette and captions.colors", () => {
  const auto = lookOf(withCaptions({}, { palette: DARK }));
  assert.deepEqual(Object.keys(auto.colors).sort(), ["box", "highlight", "outline", "text"]);
  assert.equal(auto.colors.text, DARK.text);
  assert.equal(auto.colors.highlight, DARK.accent);
  assert.equal(auto.accent, auto.colors.highlight);
  const custom = lookOf(withCaptions({ colors: { text: "#FFFFFF", highlight: "#FF0055" } }, { palette: DARK }));
  assert.equal(custom.colors.text, "#FFFFFF");
  assert.equal(custom.colors.highlight, "#FF0055");
  assert.equal(custom.customAccent, true);
  assert.equal(lookOf(withCaptions({ accent: "#FF3366" }, { palette: DARK })).colors.highlight, "#FF3366");
});

test("schema accepts captions.colors and rejects bad values with their paths", () => {
  const ok = validateSpec(withCaptions({ colors: { text: "#FFFFFF", highlight: "#FF0055", box: "#101010", outline: "#000" } }));
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));
  assert.equal(validateSpec(withCaptions({ colors: { highlight: "#FF0055" } })).ok, true);
  assert.equal(validateSpec(withCaptions({ colors: {} })).ok, true);
  const bad = validateSpec(withCaptions({ colors: { text: "white", highlight: "#12", box: 3, outline: "#GGGGGG" } }));
  assert.equal(bad.ok, false);
  const paths = bad.errors.map((e) => e.path);
  for (const p of ["captions.colors.text", "captions.colors.highlight", "captions.colors.box", "captions.colors.outline"]) assert.ok(paths.includes(p), `${p} in ${paths}`);
});

test("spec.schema.json documents captions.colors", () => {
  const schema = JSON.parse(readFileSync(new URL("../spec.schema.json", import.meta.url), "utf8"));
  const colors = schema.properties.captions.properties.colors;
  assert.ok(colors, "captions.colors in the JSON schema");
  assert.deepEqual(Object.keys(colors.properties).sort(), ["box", "highlight", "outline", "text"]);
});

test("every example spec still validates", () => {
  const dir = new URL("../examples/", import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".spec.json"))) {
    const r = validateSpec(JSON.parse(readFileSync(new URL(f, dir), "utf8")));
    assert.equal(r.ok, true, `${f}: ${JSON.stringify(r.errors)}`);
  }
});

test("reels subtitles keep the role colors unless captions.colors sets text/highlight", () => {
  for (const id of Object.keys(REEL_STYLES)) {
    const c = reelColors(id, defaultPalette(id));
    assert.deepEqual(reelSubtitleColors(c), { texto: c.texto, acento: c.acento, acentoTexto: c.acentoTexto }, id);
    assert.deepEqual(reelSubtitleColors(c, {}), reelSubtitleColors(c), id);
  }
  const c = reelColors("nube");
  const o = reelSubtitleColors(c, { text: "#ff0055", highlight: "#101010" });
  assert.equal(o.texto, "#FF0055");
  assert.equal(o.acento, "#101010");
  assert.ok(contrastRatio(o.acentoTexto, o.acento) >= AA);
  // box/outline alone do not touch the reels subtitles.
  assert.deepEqual(reelSubtitleColors(c, { box: "#000000", outline: "#FFFFFF" }), reelSubtitleColors(c));
});

test("planReels carries subtitle colors from captions.colors and leaves the scene roles alone", () => {
  const raw = JSON.parse(readFileSync(new URL("../examples/reels-nube.spec.json", import.meta.url), "utf8"));
  const spec = resolveSpec(validateSpec(raw).spec, getTemplate(raw.template));
  const timeline = { scenes: spec.scenes.map((s, i) => ({ from: i * 90, durationInFrames: 90 })), totalFrames: spec.scenes.length * 90 };
  const base = planReels(spec, timeline, []);
  assert.deepEqual(base.subtitleColors, { texto: base.colors.texto, acento: base.colors.acento, acentoTexto: base.colors.acentoTexto });
  spec.captions = { ...spec.captions, colors: { text: "#123456", highlight: "#FF0055" } };
  const custom = planReels(spec, timeline, []);
  assert.equal(custom.subtitleColors.texto, "#123456");
  assert.equal(custom.subtitleColors.acento, "#FF0055");
  assert.deepEqual(custom.colors, base.colors);
});

test("explicit text without an explicit outline derives the outline from the text (readableOn)", () => {
  const c = deriveCaptionColors(LIGHT, { style: "clean", colors: { text: "#FFFFFF" } });
  assert.equal(c.text, "#FFFFFF");
  assert.equal(c.outline, readableOn("#FFFFFF"));
  assert.ok(contrastRatio(c.text, c.outline) >= AA);
  const dark = deriveCaptionColors(DARK, { style: "minimal", colors: { text: "#101010" } });
  assert.equal(dark.outline, readableOn("#101010"));
  // An explicit outline still wins.
  assert.equal(deriveCaptionColors(LIGHT, { colors: { text: "#FFFFFF", outline: "#334455" } }).outline, "#334455");
  // Auto text keeps the palette shade as outline.
  assert.equal(deriveCaptionColors(DARK, { style: "clean" }).outline, "#0B1020");
});

test("the halo is strong when the word color is close to the darkest background stop", () => {
  assert.equal(captionHalo("#FFFFFF", LIGHT), "strong");
  assert.equal(captionHalo(LIGHT.text, LIGHT), "normal");
  assert.equal(captionHalo(DARK.text, DARK), "normal");
  assert.equal(captionHalo("#20283F", DARK), "strong");
  for (const p of PALETTES) assert.equal(captionHalo(p.palette.text, p.palette), "normal", p.id);
  const look = lookOf(withCaptions({ style: "clean", colors: { text: "#FFFFFF" } }, { palette: LIGHT }));
  assert.equal(look.halo, "strong");
  assert.equal(lookOf(withCaptions({ style: "clean" }, { palette: DARK })).halo, "normal");
});

test("unspoken words are dimmer than spoken ones but keep 4.5:1 over every background stop", () => {
  for (const p of PALETTES) {
    const d = dimmedWord(p.palette.text, p.palette.bg);
    assert.notEqual(d, p.palette.text.toUpperCase(), `${p.id} dims`);
    for (const bg of p.palette.bg) assert.ok(contrastRatio(d, bg) >= AA, `${p.id}: dim ${d} over ${bg} = ${contrastRatio(d, bg).toFixed(2)}`);
    assert.ok(contrastRatio(d, p.palette.bg[0]) < contrastRatio(p.palette.text, p.palette.bg[0]), `${p.id} is dimmer`);
  }
  // A word that already fails is not dimmed further.
  assert.equal(dimmedWord("#FFFFFF", LIGHT.bg), "#FFFFFF");
  const look = lookOf(withCaptions({ style: "neon" }, { palette: DARK }));
  assert.ok(contrastRatio(look.dim, DARK.bg[0]) >= AA && contrastRatio(look.dim, DARK.bg[1]) >= AA);
});
