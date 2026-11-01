// Palettes, themes (temáticas), template metadata and thumbnails exposed to the onboarding wizard.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { GenerateOptions } from "../shared/types.ts";
import { createApp } from "../server/app.ts";
import { readConfig } from "../server/config.ts";
import { normalizeTemplates } from "../server/engine.ts";
import { applyOptions } from "../server/specGen.ts";
type Json = any;

const fakeEngine = fileURLToPath(new URL("./fixtures/fake-engine.mjs", import.meta.url));
const tmp = mkdtempSync(path.join(process.env.TMPDIR ?? os.tmpdir(), "studio-presets-test-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
const thumbsDir = path.join(tmp, "thumbs");
const config = { ...readConfig({}), engineCli: fakeEngine, engineDir: path.dirname(fakeEngine), projectsDir: path.join(tmp, "projects"), thumbsDir };
const { app } = createApp(config);
const FAKE_IDS = ["captions-voice", "kinetic-type", "countdown", "glass-cards", "letterbox"];

test("GET /api/palettes lists the curated presets", async () => {
  const res = await app.request("/api/palettes");
  assert.equal(res.status, 200);
  const { palettes } = (await res.json()) as Json;
  assert.ok(palettes.length >= 16);
  const p = palettes[0];
  assert.deepEqual(Object.keys(p).sort(), ["description", "id", "name", "palette", "tags"]);
  assert.equal(p.palette.bg.length, 2);
  assert.match(p.palette.accent, /^#[0-9A-F]{6}$/i);
});

test("GET /api/themes lists the topics and ignores template ids missing from the registry", async () => {
  const res = await app.request("/api/themes");
  assert.equal(res.status, 200);
  const { themes } = (await res.json()) as Json;
  assert.ok(themes.length >= 12);
  for (const t of themes) {
    for (const id of t.templates) assert.ok(FAKE_IDS.includes(id), `${t.id} kept unknown template ${id}`);
    assert.ok(t.label && t.examplePrompt && t.palette && t.mood && t.tone);
  }
  const motivacion = themes.find((t: Json) => t.id === "motivacion");
  assert.deepEqual(motivacion.templates, ["letterbox", "kinetic-type", "captions-voice"], "order kept, reels-noche dropped");
  assert.equal(motivacion.moodLabel, "Cinemático / épico", "the mood label comes from the engine");
});

test("normalizeTemplates passes category, best_for, palette and font through", () => {
  const [t] = normalizeTemplates([
    {
      id: "editor-window",
      name: "Code Tutorial",
      category: "illustrated-2d",
      best_for: ["coding tutorials", "CLI tips"],
      preview: { style: "illustrated", gradient: ["#191A21", "#282A36"], accent: "#50FA7B" },
      defaults: { theme: { palette: { bg: ["#15161C", "#22232D"], text: "#F8F8F2", accent: "#50FA7B", accent2: "#FF79C6" }, font: "JetBrains Mono" } },
    },
  ]);
  assert.equal(t.category, "illustrated-2d");
  assert.deepEqual(t.bestFor, ["coding tutorials", "CLI tips"]);
  assert.deepEqual(t.palette, { bg: ["#15161C", "#22232D"], text: "#F8F8F2", accent: "#50FA7B", accent2: "#FF79C6" });
  assert.equal(t.font, "JetBrains Mono");
  const [bare] = normalizeTemplates([{ id: "x" }]);
  assert.equal(bare.category, undefined);
  assert.equal(bare.palette, undefined);
});

const base: GenerateOptions = { language: "es", durationSec: 30, tone: "", voiceProvider: "none", captionStyle: "clean", platform: "all" };
const modelSpec = () => ({ version: 1, title: "t", theme: { palette: { bg: ["#000000", "#111111"], text: "#FFFFFF", accent: "#FF0000" }, font: "Inter" }, scenes: [{ narration: "hola", visual: { type: "gradient" } }] });

test("options.palette is written to spec.theme.palette, keeping font and caption style", () => {
  const palette = { bg: ["#0B1020", "#18223F"], text: "#F4F6FF", accent: "#FFB547", accent2: "#7C8CFF", accent3: "#38D0FF" };
  const spec = applyOptions(modelSpec(), "countdown", { ...base, palette });
  assert.deepEqual(spec.theme.palette, palette);
  assert.equal(spec.theme.font, "Inter");
  assert.equal(spec.theme.captionStyle, "clean");
});

test("without options.palette the model palette is left alone", () => {
  const spec = applyOptions(modelSpec(), "countdown", base);
  assert.deepEqual(spec.theme.palette, { bg: ["#000000", "#111111"], text: "#FFFFFF", accent: "#FF0000" });
});

test("an invalid options.palette is ignored instead of breaking the spec", () => {
  // @ts-expect-error deliberately malformed
  const spec = applyOptions(modelSpec(), "countdown", { ...base, palette: { bg: "red", text: "white" } });
  assert.equal(spec.theme.palette.accent, "#FF0000");
});

test("POST /api/spec rejects a malformed palette with 400 before calling a provider", async () => {
  const res = await app.request("/api/spec", {
    method: "POST",
    body: JSON.stringify({ prompt: "hola", provider: "anthropic", template: "countdown", options: { palette: { bg: ["nope"], text: "#fff", accent: "#000" } } }),
  });
  assert.equal(res.status, 400);
  assert.match(((await res.json()) as Json).error, /paleta/i);
});

test("GET /thumbs/:file serves generated thumbnails and nothing else", async () => {
  assert.equal((await app.request("/thumbs/countdown.jpg")).status, 404, "missing thumbnail is a 404");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(thumbsDir, { recursive: true });
  writeFileSync(path.join(thumbsDir, "countdown.jpg"), "jpg");
  writeFileSync(path.join(tmp, "secret.jpg"), "secret");
  const ok = await app.request("/thumbs/countdown.jpg");
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "image/jpeg");
  assert.equal(await ok.text(), "jpg");
  assert.equal((await app.request("/thumbs/..%2Fsecret.jpg")).status, 404);
  assert.equal((await app.request("/thumbs/countdown.png")).status, 404, "only .jpg and .mp4");
});
