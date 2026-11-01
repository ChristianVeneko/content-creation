import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { isLatamVoice, pickVoice, trendingVoices } from "../lib/voices.mjs";

const raw = (id, accent, locale, extra = {}) => ({
  voice_id: id,
  name: `${id} - Test`,
  accent,
  locale,
  gender: "male",
  use_case: "narrative_story",
  description: "d",
  preview_url: `https://example.test/${id}.mp3`,
  usage_character_count_7d: 100,
  ...extra,
});

function fakeFetch(voices, calls = []) {
  return async (url, init) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, json: async () => ({ voices }) };
  };
}

test("isLatamVoice keeps Latin American accents and drops Spain", () => {
  assert.equal(isLatamVoice({ accent: "latin american", locale: "es-AR" }), true);
  assert.equal(isLatamVoice({ accent: "mexican", locale: "es-MX" }), true);
  assert.equal(isLatamVoice({ accent: "colombian", locale: "es-CO" }), true);
  assert.equal(isLatamVoice({ accent: "peninsular", locale: "es-ES" }), false);
  assert.equal(isLatamVoice({ accent: "latin american", locale: "es-ES" }), false);
});

test("trendingVoices asks for trending male Spanish voices and keeps only Latin American ones, in order", async () => {
  const cache = mkdtempSync(join(tmpdir(), "voices-"));
  try {
    const calls = [];
    const voices = await trendingVoices({
      apiKey: "k",
      cacheDir: cache,
      fetchImpl: fakeFetch([raw("a", "latin american", "es-AR"), raw("b", "peninsular", "es-ES"), raw("c", "mexican", "es-MX")], calls),
    });
    assert.deepEqual(voices.map((v) => v.voiceId), ["a", "c"]);
    assert.deepEqual(Object.keys(voices[0]).sort(), ["accent", "description", "gender", "locale", "name", "previewUrl", "useCase", "uses7d", "voiceId"]);
    const u = new URL(calls[0].url);
    assert.equal(u.pathname, "/v1/shared-voices");
    assert.equal(u.searchParams.get("sort"), "trending");
    assert.equal(u.searchParams.get("language"), "es");
    assert.equal(u.searchParams.get("gender"), "male");
    assert.equal(calls[0].init.headers["xi-api-key"], "k");
  } finally {
    rmSync(cache, { recursive: true, force: true });
  }
});

test("trendingVoices serves the cache inside the TTL and the stale cache when the API fails", async () => {
  const cache = mkdtempSync(join(tmpdir(), "voices-"));
  try {
    await trendingVoices({ apiKey: "k", cacheDir: cache, fetchImpl: fakeFetch([raw("a", "latin american", "es-AR")]) });
    const calls = [];
    const cached = await trendingVoices({ apiKey: "k", cacheDir: cache, fetchImpl: fakeFetch([raw("z", "mexican", "es-MX")], calls) });
    assert.equal(calls.length, 0);
    assert.deepEqual(cached.map((v) => v.voiceId), ["a"]);
    const failing = async () => ({ ok: false, status: 500, json: async () => ({}) });
    const stale = await trendingVoices({ apiKey: "k", cacheDir: cache, ttlMs: 0, fetchImpl: failing });
    assert.deepEqual(stale.map((v) => v.voiceId), ["a"]);
  } finally {
    rmSync(cache, { recursive: true, force: true });
  }
});

test("trendingVoices without an API key returns an empty list and does not call the API", async () => {
  const calls = [];
  assert.deepEqual(await trendingVoices({ apiKey: "", cacheDir: tmpdir(), fetchImpl: fakeFetch([], calls) }), []);
  assert.equal(calls.length, 0);
});

test("pickVoice is stable for a seed and stays within the top five", () => {
  const voices = ["a", "b", "c", "d", "e", "f", "g"].map((voiceId) => ({ voiceId }));
  const first = pickVoice(voices, "La entropía");
  assert.equal(pickVoice(voices, "La entropía"), first);
  const picked = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((s) => pickVoice(voices, s).voiceId));
  for (const id of picked) assert.ok(["a", "b", "c", "d", "e"].includes(id));
  assert.ok(picked.size > 1);
  assert.equal(pickVoice([], "x"), null);
});
