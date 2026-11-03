// HyperFrames formats in the web app: registry-driven catalog, caption ownership, choices flowing into the spec,
// and the spec writer repairing a bad payload. Existing formats must be untouched.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { GenerateOptions, TemplateInfo, VideoSpec } from "../shared/types.ts";
import { applyHfOptions, defaultHfOptions, hfOptionsIssue, hfPromptLines, isHfSpec, isHfTemplate, resolveHfOptions } from "../shared/hf.ts";
import { normalizeTemplates } from "../server/engine.ts";
import type { SpecProvider, SpecRequest } from "../server/providers/types.ts";
import { applyOptions, buildUserPrompt, generateValidSpec } from "../server/specGen.ts";
import { FAMILIES, familyCounts, formatFamily } from "../src/lib/formats.ts";

// what `node cli.mjs templates` prints for a HyperFrames format
const RAW_HF = {
  id: "pixel-world", name: "Pixel World", category: "hyperframes", format: "pixel-world", description: "Animated pixel worlds.", prompt_hint: "x",
  best_for: ["explainers"], preview: { style: "hyperframes", gradient: ["#0F0C29", "#302B63"], accent: "#FFD60A" },
  engine: "hyperframes", ownsCaptions: true, modes: ["single", "multi"],
  styles: [{ id: "gameboy", name: "Game Boy", about: "4 greens", palette: ["#0f380f", "#9bbc0f", "nope"] }, { id: "neo", name: "Neo", about: "neon" }],
  settings: [{ id: "forest", name: "Forest", about: "Pine forest" }],
};
const [hf] = normalizeTemplates([RAW_HF]);

const options: GenerateOptions = { language: "es", durationSec: 30, tone: "", voiceProvider: "kokoro", captionStyle: "boxed", platform: "all" };

test("a HyperFrames format shows up from registry data (modes, styles with swatches, settings, own captions)", () => {
  assert.equal(isHfTemplate(hf), true);
  assert.deepEqual(hf.modes, ["single", "multi"]);
  assert.deepEqual(hf.styles?.map((s) => s.id), ["gameboy", "neo"]);
  assert.deepEqual(hf.styles?.[0].palette, ["#0f380f", "#9bbc0f"], "only valid hex colors are kept for the swatch");
  assert.deepEqual(hf.settings?.map((s) => s.id), ["forest"]);
  assert.equal(hf.ownsCaptions, true);
});

test("templates without HyperFrames data keep their exact shape", () => {
  const [t] = normalizeTemplates([{ id: "clay-diorama", category: "3d", preview: { gradient: ["#000", "#111"] } }]);
  for (const k of ["engine", "ownsCaptions", "modes", "styles", "settings"]) assert.equal(k in t, false, k);
  assert.equal(isHfTemplate(t), false);
});

test("HyperFrames formats land in their own animated families; the old pixel family is untouched", () => {
  assert.equal(formatFamily(hf), "pixel-anim");
  assert.equal(formatFamily({ ...hf, id: "flat-2d", format: "flat-2d", name: "Flat 2D" }), "flat-anim");
  assert.equal(formatFamily({ ...hf, id: "future-thing", format: "future-thing", name: "Future" }), "animated");
  assert.equal(formatFamily({ ...hf, id: "pixel-arcade", category: "pixel", engine: undefined, ownsCaptions: undefined }), "pixel");
  assert.deepEqual(FAMILIES.slice(0, 3).map((f) => f.label), ["Pixel animado", "2D animado", "Animado (otros)"]);
  assert.equal(familyCounts([hf]).some((c) => c.id === "pixel-anim" && c.label === "Pixel animado"), true);
});

test("applyOptions on a HyperFrames spec never writes engine caption fields (no double subtitles)", () => {
  const raw = {
    version: 1, title: "T", template: "x", theme: { palette: { bg: ["#000000"], text: "#ffffff", accent: "#ff0000" }, captionStyle: "neon", renderer: "blender" },
    captions: { enabled: true, style: "hormozi", position: "top", colors: { text: "#ffffff" }, wordsPerPage: 2 }, reels: { subtitles: "linea" },
    scenes: [{ narration: "Hola", visual: { type: "gradient" } }],
  };
  const spec = applyOptions(raw, "pixel-world", {
    ...options, captions: { style: "boxed", colors: { text: "#00ff00" } }, reelsSubtitles: "bloque", renderer: "blender",
    hf: resolveHfOptions({ mode: "single", style: "neo", withSubtitles: false }, hf),
  });
  assert.deepEqual(spec.captions, { enabled: false });
  assert.equal(spec.reels, undefined);
  assert.equal("captionStyle" in spec.theme, false);
  assert.equal("renderer" in spec.theme, false);
  assert.equal(spec.mode, "single");
  assert.equal(spec.hf?.style, "neo");
  assert.equal(spec.template, "pixel-world");
});

test("mode, style, quality-independent advanced choices flow into the spec only when set", () => {
  const base: VideoSpec = { version: 1, title: "T", template: "pixel-world", language: "es", format: { width: 1080, height: 1920, fps: 30 }, theme: { palette: { bg: ["#000000"], text: "#fff", accent: "#f00" }, font: "x", captionStyle: "clean" }, voice: { provider: "none" }, scenes: [], post: { tiktok: "", instagram: "", youtube: { title: "", description: "" }, hashtags: [] }, hf: { scenes: 3 } };
  const min = applyHfOptions(base, defaultHfOptions(hf));
  assert.equal(min.mode, "multi");
  assert.deepEqual(min.hf, { scenes: 3, style: "gameboy" }, "the model's own payload fields are kept");
  for (const k of ["pace", "camera", "cta", "variants"] as const) assert.equal(k in min, false, k);
  const full = applyHfOptions({ ...base, brand: { handle: "@x" } }, { ...defaultHfOptions(hf), mode: "single", pace: "fast", camera: "dynamic", brandPill: true, followClick: true, cta: "comment", variants: 3 });
  assert.equal(full.pace, "fast");
  assert.deepEqual(full.camera, { intensity: "dynamic" });
  assert.deepEqual(full.brand, { handle: "@x", pill: true, followClick: true });
  assert.deepEqual(full.cta, { type: "comment" });
  assert.deepEqual(full.variants, { count: 3 });
  assert.equal(isHfSpec(full), true);
});

test("resolveHfOptions repairs a mode, style or setting the format does not have; hfOptionsIssue names the problem", () => {
  const onlySingle = { ...hf, modes: ["single" as const] };
  assert.equal(resolveHfOptions({ mode: "multi", style: "ghost", setting: "ghost" }, onlySingle).mode, "single");
  assert.equal(resolveHfOptions({ style: "ghost" }, hf).style, "gameboy");
  assert.equal("setting" in resolveHfOptions({ setting: "ghost" }, hf), false);
  assert.match(hfOptionsIssue({ mode: "multi" }, onlySingle) ?? "", /no admite el modo multi/);
  assert.match(hfOptionsIssue({ mode: "single", style: "ghost" }, hf) ?? "", /Estilo desconocido/);
  assert.match(hfOptionsIssue({ mode: "single", quality: "ultra" }, hf) ?? "", /Calidad inválida/);
  assert.match(hfOptionsIssue({ mode: "single", variants: 9 }, hf) ?? "", /Variantes/);
  assert.equal(hfOptionsIssue({ ...defaultHfOptions(hf), setting: "forest" }, hf), null);
});

test("the user prompt carries the HyperFrames choices and drops the caption style line; other formats keep theirs", () => {
  const prompt = buildUserPrompt("explica los tokens", hf, "pixel-world", { ...options, hf: resolveHfOptions({ mode: "single", style: "neo", setting: "forest", pace: "calm" }, hf) });
  assert.match(prompt, /Scene mode: single/);
  assert.match(prompt, /Style: neo \(Neo\)/);
  assert.match(prompt, /Setting\/scenario: forest \(Forest\)/);
  assert.match(prompt, /Pace: calm/);
  assert.match(prompt, /own subtitles/);
  assert.doesNotMatch(prompt, /Caption style:/);
  const plain = buildUserPrompt("x", undefined, "countdown", options);
  assert.match(plain, /Caption style: boxed/);
  assert.doesNotMatch(plain, /Scene mode:/);
  assert.equal(hfPromptLines({ ...defaultHfOptions(hf) }, hf as TemplateInfo).at(-1)?.startsWith("Captions:"), true);
});

function scripted(outputs: string[]) {
  const requests: SpecRequest[] = [];
  const provider: SpecProvider = { async generateSpec(req) { requests.push(req); const n = outputs.shift(); if (n === undefined) throw new Error("no more outputs"); return n; } };
  return { provider, requests };
}

test("the spec writer repairs a bad format payload once, with the engine's precise message", async () => {
  const bad = { version: 1, title: "T", template: "pixel-world", hf: { scenes: "three" }, scenes: [{ narration: "Hola", visual: { type: "gradient" } }] };
  const good = { ...bad, hf: { scenes: 3 } };
  const { provider, requests } = scripted([JSON.stringify(bad), JSON.stringify(good)]);
  const validate = async (s: VideoSpec) => (typeof s.hf?.scenes === "number" ? null : "hf.scenes: must be a number");
  const res = await generateValidSpec({ provider, system: "S", user: "U", templateId: "pixel-world", options: { ...options, hf: defaultHfOptions(hf) }, validate });
  assert.equal(res.attempts, 2);
  assert.match(requests[1].user, /hf\.scenes: must be a number/);
  assert.match(requests[1].user, /Fix spec\.hf/);
  assert.equal(res.spec.captions?.enabled, true);
  assert.equal(res.spec.hf?.style, "gameboy");
});
