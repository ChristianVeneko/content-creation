// Voice library API: trending Latin American Spanish ElevenLabs voices and their audio previews.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createApp } from "../server/app.ts";
import { readConfig } from "../server/config.ts";
type Json = any;

const fakeEngine = fileURLToPath(new URL("./fixtures/fake-engine.mjs", import.meta.url));
const scratch = mkdtempSync(path.join(process.env.TMPDIR ?? os.tmpdir(), "studio-voices-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));
mkdirSync(path.join(scratch, "projects"));
const config = { ...readConfig({}), engineCli: fakeEngine, engineDir: path.dirname(fakeEngine), projectsDir: path.join(scratch, "projects") };

const fetched: string[] = [];
const fetchImpl = (async (url: string) => {
  fetched.push(String(url));
  return new Response("ID3voice", { status: 200, headers: { "content-type": "text/plain" } });
}) as typeof fetch;

async function withKey<T>(fn: () => Promise<T>): Promise<T> {
  const prev = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "sk-secret-value";
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = prev;
  }
}

test("GET /api/voices lists trending voices without the key or the remote preview URL", async () => {
  const { app } = createApp(config, { fetchImpl });
  await withKey(async () => {
    const res = await app.request("/api/voices");
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(!text.includes("sk-secret-value"));
    const body = JSON.parse(text) as Json;
    assert.equal(body.available, true);
    assert.deepEqual(body.voices.map((v: Json) => v.voiceId), ["voiceA1", "voiceB2"]);
    assert.equal(body.voices[0].name, "Diego - Neutral");
    assert.equal(body.voices[0].accent, "latin american");
    assert.equal(body.voices[0].previewUrl, undefined);
  });
});

test("GET /api/voices reports unavailable without an ElevenLabs key", async () => {
  const prev = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  try {
    const { app } = createApp(config, { fetchImpl });
    const body = (await (await app.request("/api/voices")).json()) as Json;
    assert.equal(body.available, false);
    assert.deepEqual(body.voices, []);
  } finally {
    if (prev !== undefined) process.env.ELEVENLABS_API_KEY = prev;
  }
});

test("GET /api/voices/:id/preview proxies the listed preview as audio/mpeg", async () => {
  const { app } = createApp(config, { fetchImpl });
  await withKey(async () => {
    const res = await app.request("/api/voices/voiceA1/preview");
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "audio/mpeg");
    assert.equal(await res.text(), "ID3voice");
    assert.equal(fetched.at(-1), "https://storage.googleapis.com/eleven-public-prod/a.mp3");
  });
});

test("preview rejects unknown voices and preview hosts outside ElevenLabs", async () => {
  const { app } = createApp(config, { fetchImpl });
  await withKey(async () => {
    const before = fetched.length;
    for (const id of ["nope", "voiceB2", "..%2Fx"]) {
      const res = await app.request(`/api/voices/${id}/preview`);
      assert.equal(res.status, 404, id);
    }
    assert.equal(fetched.length, before, "never fetches an unlisted or foreign URL");
  });
});
