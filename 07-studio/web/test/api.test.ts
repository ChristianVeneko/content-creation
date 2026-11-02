// API integration test against the fake engine (no LLM calls, no real render).
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
type Json = any;
import { createApp } from "../server/app.ts";
import { readConfig } from "../server/config.ts";

const fakeEngine = fileURLToPath(new URL("./fixtures/fake-engine.mjs", import.meta.url));
const projects = mkdtempSync(path.join(process.env.TMPDIR ?? os.tmpdir(), "studio-api-test-"));
after(() => rmSync(projects, { recursive: true, force: true }));

const config = { ...readConfig({}), engineCli: fakeEngine, engineDir: path.dirname(fakeEngine), projectsDir: projects };
const { app, jobs } = createApp(config);

test("health and templates", async () => {
  const health = (await (await app.request("/api/health")).json()) as Json;
  assert.equal(health.engine.found, true);
  const res = await app.request("/api/templates");
  assert.equal(res.status, 200);
  const { templates } = (await res.json()) as Json;
  assert.equal(templates.length, 5);
  assert.deepEqual(Object.keys(templates[0]).sort(), ["accent", "description", "emoji", "format", "gradient", "id", "name", "promptHint", "sampleText"]);
  assert.equal(templates[0].format, templates[0].id, "format defaults to the template id");
});

test("spec request validation errors are 400", async () => {
  const res = await app.request("/api/spec", { method: "POST", body: JSON.stringify({ prompt: "", provider: "anthropic" }) });
  assert.equal(res.status, 400);
});

test("render streams engine progress and ends done with outputs", async () => {
  const spec = {
    version: 1, title: "Prueba", template: "countdown", language: "es",
    scenes: [{ id: "s1", narration: "hola", visual: { type: "emoji", emoji: "👋" } }],
  };
  // @ts-expect-error minimal spec for the fake engine
  const id = jobs.create({ title: "Prueba", template: "countdown", prompt: "p", provider: "anthropic", spec });
  const start = await app.request(`/api/jobs/${id}/render`, { method: "POST" });
  assert.equal(start.status, 202);
  let detail: Json;
  for (let i = 0; i < 100; i++) {
    detail = (await (await app.request(`/api/jobs/${id}`)).json()) as Json;
    if (detail.status !== "rendering") break;
    await new Promise((r) => setTimeout(r, 30));
  }
  assert.equal(detail.status, "done");
  assert.equal(detail.progress, 1);
  assert.equal(detail.logs.filter((l: { status: string }) => l.status === "done").length, 4);
  const video = await app.request(`/api/jobs/${id}/file/video.mp4`, { headers: { range: "bytes=0-1" } });
  assert.equal(video.status, 206);
  assert.equal(await video.text(), "fa");
  assert.equal((await app.request(`/api/jobs/${id}/file/job.json`)).status, 404, "only whitelisted files are served");
  const list = (await (await app.request("/api/jobs")).json()) as Json;
  assert.equal(list.jobs[0].id, id);
});

test("invalid spec edits are rejected with the validator message", async () => {
  // @ts-expect-error minimal spec
  const id = jobs.create({ title: "Otra", template: "countdown", prompt: "p", provider: "openai", spec: { version: 1, scenes: [{}] } });
  const res = await app.request(`/api/jobs/${id}/spec`, { method: "PUT", body: JSON.stringify({ spec: { version: 1, scenes: [] } }) });
  assert.equal(res.status, 422);
  const { error } = (await res.json()) as Json;
  assert.match(error, /^scenes: /, "engine errors are rendered as `path: message`");
});
