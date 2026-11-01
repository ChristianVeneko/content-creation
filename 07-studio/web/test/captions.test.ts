// Caption catalog helpers (pure): auto palette colors, panel state <-> spec.captions, validation.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Palette } from "../shared/types.ts";
import {
  CAPTION_STYLES,
  autoCaptionColors,
  captionKind,
  captionSettingsIssue,
  captionsFromPanel,
  cleanCaptionSettings,
  panelFromCaptions,
  resetCaptionColors,
} from "../shared/captions.ts";

const palette: Palette = { bg: ["#1B2A4A", "#05070D"], text: "#F5F1E8", accent: "#FFB703" };

test("the catalog mirrors the engine's 14 styles in order", () => {
  assert.deepEqual(CAPTION_STYLES, ["hormozi", "clean", "boxed", "pills", "chips", "two-tone", "karaoke", "punch", "typewriter", "dialog", "neon", "underline", "minimal", "pixel"]);
});

test("auto colors: text and accent from the palette, the darkest bg stop as the shade", () => {
  assert.deepEqual(autoCaptionColors(palette), { text: "#F5F1E8", highlight: "#FFB703", box: "#05070D", outline: "#05070D" });
});

test("Auto (paleta) writes no colors and drops the legacy accent", () => {
  const state = panelFromCaptions({ enabled: true, wordsPerPage: 3, accent: "#FF0000" }, { palette, style: "hormozi" });
  assert.equal(state.colorMode, "custom", "a legacy accent opens in custom mode");
  assert.equal(state.colors.highlight, "#FF0000");
  const out = captionsFromPanel({ ...state, colorMode: "auto" }, { enabled: true, wordsPerPage: 3, accent: "#FF0000", speaker: "Ana" });
  assert.equal(out.colors, undefined);
  assert.equal(out.accent, undefined);
  assert.equal(out.speaker, "Ana", "unrelated fields of the base are kept");
  assert.equal(out.enabled, true);
});

test("custom writes all four colors", () => {
  const state = panelFromCaptions(undefined, { palette, style: "neon" });
  assert.equal(state.colorMode, "auto");
  assert.deepEqual(state.colors, autoCaptionColors(palette), "custom pickers are prefilled from the auto values");
  const out = captionsFromPanel({ ...state, colorMode: "custom", colors: { ...state.colors, highlight: "#00FFAA" } });
  assert.deepEqual(out.colors, { text: "#F5F1E8", highlight: "#00FFAA", box: "#05070D", outline: "#05070D" });
  assert.equal(out.style, "neon");
});

test("reset clears custom colors back to Auto with the palette values", () => {
  const custom = { ...panelFromCaptions({ colors: { text: "#000000" } }, { palette, style: "clean" }) };
  assert.equal(custom.colorMode, "custom");
  assert.equal(custom.colors.text, "#000000");
  assert.equal(custom.colors.highlight, "#FFB703", "unset custom fields fall back to the auto values");
  const reset = resetCaptionColors(custom, palette);
  assert.equal(reset.colorMode, "auto");
  assert.deepEqual(reset.colors, autoCaptionColors(palette));
  assert.equal(captionsFromPanel(reset, { colors: { text: "#000000" } }).colors, undefined);
});

test("auto choices are omitted; explicit ones are written", () => {
  const state = panelFromCaptions({ size: "xl", position: "top", uppercase: false, wordsPerPage: 2 }, { palette, style: "pills" });
  assert.equal(state.size, "xl");
  assert.equal(state.position, "top");
  assert.equal(state.casing, "normal");
  assert.equal(state.wordsPerPage, 2);
  const out = captionsFromPanel({ ...state, size: "m", position: "auto", casing: "auto", wordsPerPage: null }, { size: "xl", position: "top", uppercase: false, wordsPerPage: 2 });
  assert.deepEqual(out, { style: "pills" });
  const upper = captionsFromPanel({ ...state, casing: "upper" });
  assert.equal(upper.uppercase, true);
  assert.equal(upper.size, "xl");
  assert.equal(upper.position, "top");
  assert.equal(upper.wordsPerPage, 2);
});

test("a null style (channel: pick per video) writes no style", () => {
  const state = panelFromCaptions(undefined, { palette, style: null });
  assert.equal(state.style, null);
  assert.equal(captionsFromPanel(state).style, undefined);
});

test("enabled is only written when the panel sets it", () => {
  const state = panelFromCaptions(undefined, { palette, style: "pixel" });
  assert.equal(state.enabled, null);
  assert.equal("enabled" in captionsFromPanel(state), false);
  assert.equal(captionsFromPanel({ ...state, enabled: true }).enabled, true);
});

test("template kinds: reels-* and pixel-* get their own caption panels", () => {
  assert.equal(captionKind("reels-noche"), "reels");
  assert.equal(captionKind("pixel-dusk"), "pixel");
  assert.equal(captionKind("captions-voice"), "standard");
  assert.equal(captionKind(undefined), "standard");
});

test("validation accepts the full catalog and colors, rejects bad values", () => {
  for (const style of CAPTION_STYLES) assert.equal(captionSettingsIssue({ style }), null, style);
  assert.equal(captionSettingsIssue({ size: "xl", position: "lower", uppercase: true, wordsPerPage: 6, speaker: "Ana", colors: { text: "#FFFFFF", highlight: "#ff0000", box: "#000000", outline: "#123ABC" } }), null);
  assert.equal(captionSettingsIssue(undefined), null);
  assert.ok(captionSettingsIssue({ style: "comic-sans" }));
  assert.ok(captionSettingsIssue({ colors: { text: "red" } }));
  assert.ok(captionSettingsIssue({ size: "huge" }));
  assert.ok(captionSettingsIssue({ wordsPerPage: 0 }));
  assert.ok(captionSettingsIssue("hormozi"));
});

test("clean keeps the valid fields and drops the rest", () => {
  assert.deepEqual(cleanCaptionSettings({ style: "neon", size: "huge", colors: { text: "#FFFFFF", box: "nope" }, extra: 1 }), { style: "neon", colors: { text: "#FFFFFF" } });
  assert.equal(cleanCaptionSettings({ size: "huge" }), undefined, "nothing valid left");
  assert.equal(cleanCaptionSettings(null), undefined);
});

test("reels subtitle modes accept the engine's Spanish and English aliases", async () => {
  const { normReelsSubtitles } = await import("../shared/captions.ts");
  assert.equal(normReelsSubtitles("block"), "bloque");
  assert.equal(normReelsSubtitles(" Línea "), "linea");
  assert.equal(normReelsSubtitles("none"), "no");
  assert.equal(normReelsSubtitles("maybe"), null);
});
