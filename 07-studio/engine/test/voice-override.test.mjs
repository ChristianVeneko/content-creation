import test from "node:test";
import assert from "node:assert/strict";
import { resolveVoiceOverride } from "../lib/voice-override.mjs";

test("a 20-character alphanumeric id is an ElevenLabs voice", () => {
  assert.deepEqual(resolveVoiceOverride({ voiceId: "21m00Tcm4TlvDq8ikWAM" }), { override: { provider: "elevenlabs", voiceId: "21m00Tcm4TlvDq8ikWAM" } });
});

test("a Kokoro id such as em_alex selects the local voice", () => {
  assert.deepEqual(resolveVoiceOverride({ voiceId: "em_alex" }), { override: { provider: "kokoro", voiceId: "em_alex" } });
});

test("the id is trimmed and an explicit provider wins over the guess", () => {
  assert.deepEqual(resolveVoiceOverride({ voiceId: "  abc123  ", provider: "elevenlabs" }), { override: { provider: "elevenlabs", voiceId: "abc123" } });
});

test("provider none drops the id", () => {
  assert.deepEqual(resolveVoiceOverride({ provider: "none" }), { override: { provider: "none" } });
});

test("an unknown provider or an unrecognizable id is an error that names the allowed values", () => {
  assert.match(resolveVoiceOverride({ provider: "azure" }).error, /elevenlabs, kokoro, none/);
  assert.match(resolveVoiceOverride({ voiceId: "??" }).error, /20-character ElevenLabs id|Kokoro/);
});

test("nothing given means no override", () => {
  assert.deepEqual(resolveVoiceOverride({}), { override: null });
});
