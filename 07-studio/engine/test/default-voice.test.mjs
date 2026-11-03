import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { DEFAULT_VOICE_ID, synthesize } from "../lib/tts.mjs";
import { needsAutoVoice } from "../lib/build.mjs";

test("the app-wide default ElevenLabs voice is the one the user chose", () => {
  assert.equal(DEFAULT_VOICE_ID, "WFmom5vWeiir6CN1crV3");
});

test("a spec without an explicit library voice gets the default, in any language", () => {
  assert.equal(needsAutoVoice({ language: "es", voice: { provider: "elevenlabs" } }), true);
  assert.equal(needsAutoVoice({ language: "en", voice: { provider: "elevenlabs" } }), true);
  assert.equal(needsAutoVoice({ language: "es", voice: { provider: "elevenlabs", voiceId: "ef_dora" } }), true);
  assert.equal(needsAutoVoice({ language: "es", voice: { provider: "elevenlabs", voiceId: "abc123XYZ" } }), false);
});

test("ElevenLabs synthesis calls the default voice when no voiceId is given, ignoring ELEVENLABS_VOICE_ID", async () => {
  const dir = mkdtempSync(join(tmpdir(), "default-voice-"));
  const realFetch = globalThis.fetch;
  const oldKey = process.env.ELEVENLABS_API_KEY, oldVoice = process.env.ELEVENLABS_VOICE_ID;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
  };
  process.env.ELEVENLABS_API_KEY = "test";
  process.env.ELEVENLABS_VOICE_ID = "SOMEOTHERVOICE";
  try {
    await synthesize({ provider: "elevenlabs", texts: ["hola"], language: "es", dir });
    await synthesize({ provider: "elevenlabs", texts: ["hola"], language: "es", voiceId: "CustomVoice1", dir });
  } finally {
    globalThis.fetch = realFetch;
    if (oldKey === undefined) delete process.env.ELEVENLABS_API_KEY; else process.env.ELEVENLABS_API_KEY = oldKey;
    if (oldVoice === undefined) delete process.env.ELEVENLABS_VOICE_ID; else process.env.ELEVENLABS_VOICE_ID = oldVoice;
    rmSync(dir, { recursive: true, force: true });
  }
  assert.match(urls[0], /text-to-speech\/WFmom5vWeiir6CN1crV3\?/);
  assert.match(urls[1], /text-to-speech\/CustomVoice1\?/);
});
