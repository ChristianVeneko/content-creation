// API flow for a HyperFrames format against the fake engine (opt-in `fake-world` template): catalog data,
// spec generation with the format prompt, caption ownership, quality on render and both mp4 outputs.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
type Json = any;
process.env.FAKE_ENGINE_HF = "1";
const { createApp } = await import("../server/app.ts");
const { readConfig } = await import("../server/config.ts");

const fakeEngine = fileURLToPath(new URL("./fixtures/fake-engine.mjs", import.meta.url));
const projects = mkdtempSync(path.join(process.env.TMPDIR ?? os.tmpdir(), "studio-hf-test-"));
after(() => rmSync(projects, { recursive: true, force: true }));
const config = { ...readConfig({}), engineCli: fakeEngine, engineDir: path.dirname(fakeEngine), projectsDir: projects };

const sent: { system: string; user: string }[] = [];
const outputs: string[] = [];
const createProvider = (() => ({ async generateSpec(req: { system: string; user: string }) { sent.push(req); return outputs.shift() ?? "{}"; } })) as never;
const { app, jobs } = createApp(config, { createProvider });

const specBody = (hf: Json) => ({ prompt: "explica los tokens", provider: "anthropic", template: "fake-world", options: { hf, captions: { style: "hormozi", colors: { text: "#ff0000" } }, reelsSubtitles: "bloque", captionStyle: "neon", renderer: "blender" } });
const post = (body: Json) => app.request("/api/spec", { method: "POST", body: JSON.stringify(body) });
const draft = (hf: Json) => JSON.stringify({ version: 1, title: "Tokens", template: "x", hf, theme: { captionStyle: "pills" }, captions: { style: "boxed" }, scenes: [{ narration: "Hola", visual: { type: "gradient" } }] });

test("/api/templates exposes the HyperFrames format with modes, styles with swatches and settings", async () => {
  const { templates } = (await (await app.request("/api/templates")).json()) as Json;
  const t = templates.find((x: Json) => x.id === "fake-world");
  assert.equal(t.ownsCaptions, true);
  assert.deepEqual(t.modes, ["single", "multi"]);
  assert.deepEqual(t.styles.map((s: Json) => s.id), ["neon", "sunny"]);
  assert.deepEqual(t.styles[0].palette, ["#0F0C29", "#FF2E97", "#FFD60A"]);
  assert.deepEqual(t.settings.map((s: Json) => s.id), ["city"]);
});

test("spec generation uses the engine's format prompt, repairs a bad payload once and never adds caption fields", async () => {
  outputs.push(draft({ scenes: "three" }), draft({ scenes: 3 }));
  const res = await post(specBody({ mode: "single", style: "sunny", setting: "city", withSubtitles: true, quality: "draft", pace: "calm" }));
  assert.equal(res.status, 200);
  const { spec, attempts } = (await res.json()) as Json;
  assert.equal(attempts, 2);
  assert.match(sent[0].system, /## HyperFrames format `fake-world`/, "the per-format prompt comes from `prompt <id>`");
  assert.doesNotMatch(sent[0].system, /CREATIVE/, "API providers get the catalog prompt, not the creative one");
  assert.match(sent[1].user, /hf\.scenes: must be a number/);
  assert.match(sent[0].user, /Setting\/scenario: city \(City\)/);
  assert.equal(spec.mode, "single");
  assert.equal(spec.hf.style, "sunny");
  assert.equal(spec.pace, "calm");
  assert.deepEqual(spec.captions, { enabled: true });
  assert.equal(spec.reels, undefined);
  assert.equal("captionStyle" in spec.theme, false);
  assert.equal("renderer" in spec.theme, false);
  assert.equal(jobs.readMeta((await jobs.list())[0].id)?.quality, "draft");
});

test("a mode or style the format does not offer is a 400 naming it", async () => {
  const bad = await post(specBody({ mode: "multi", style: "ghost" }));
  assert.equal(bad.status, 400);
  assert.match(((await bad.json()) as Json).error, /Estilo desconocido/);
  const q = await post(specBody({ mode: "multi", quality: "ultra" }));
  assert.match(((await q.json()) as Json).error, /Calidad inválida/);
});

test("without hf options the format defaults apply (first style, multi, subtitles on)", async () => {
  outputs.push(draft({ scenes: 3 }));
  const res = await post({ prompt: "x", provider: "anthropic", template: "fake-world" });
  const { spec } = (await res.json()) as Json;
  assert.equal(spec.mode, "multi");
  assert.equal(spec.hf.style, "neon");
  assert.deepEqual(spec.captions, { enabled: true });
});

test("render passes --quality to the engine for HyperFrames formats and lists both mp4 files", async () => {
  const id = jobs.create({ title: "HF", template: "fake-world", prompt: "p", provider: "anthropic", spec: { version: 1, template: "fake-world", mode: "single", hf: { scenes: 3 }, scenes: [{ id: "s1", narration: "hola", visual: { type: "gradient" } }] } as never });
  const start = await app.request(`/api/jobs/${id}/render`, { method: "POST", body: JSON.stringify({ quality: "delivery" }) });
  assert.equal(start.status, 202);
  let detail: Json;
  for (let i = 0; i < 100; i++) {
    detail = (await (await app.request(`/api/jobs/${id}`)).json()) as Json;
    if (detail.status !== "rendering") break;
    await new Promise((r) => setTimeout(r, 30));
  }
  assert.equal(detail.status, "done");
  assert.equal(detail.hasVideoNoSubs, true);
  assert.equal(detail.quality, "delivery");
  const args = JSON.parse(readFileSync(path.join(projects, id, "args.json"), "utf8")) as string[];
  assert.deepEqual(args.slice(args.indexOf("--quality")), ["--quality", "delivery"]);
  const nosubs = await app.request(`/api/jobs/${id}/file/video-sin-subtitulos.mp4`);
  assert.equal(nosubs.status, 200);
  assert.equal(await nosubs.text(), "fake-nosubs");
  const bad = await app.request(`/api/jobs/${id}/render`, { method: "POST", body: JSON.stringify({ quality: "ultra" }) });
  assert.equal(bad.status, 400);
});

test("render of a regular format sends no --quality", async () => {
  // @ts-expect-error minimal spec
  const id = jobs.create({ title: "R", template: "countdown", prompt: "p", provider: "anthropic", spec: { version: 1, template: "countdown", scenes: [{ id: "s1", narration: "hola", visual: { type: "emoji", emoji: "x" } }] } });
  await app.request(`/api/jobs/${id}/render`, { method: "POST", body: JSON.stringify({ quality: "draft" }) });
  for (let i = 0; i < 100 && (jobs.readMeta(id)?.status ?? "rendering") === "rendering"; i++) await new Promise((r) => setTimeout(r, 30));
  const args = JSON.parse(readFileSync(path.join(projects, id, "args.json"), "utf8")) as string[];
  assert.equal(args.includes("--quality"), false);
});
