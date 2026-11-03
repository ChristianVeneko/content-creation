import assert from "node:assert/strict";
import { test } from "node:test";
import type { GenerateOptions, VideoSpec } from "../shared/types.ts";
import type { SpecProvider, SpecRequest } from "../server/providers/types.ts";
import { SpecGenerationError, applyOptions, buildUserPrompt, generateValidSpec, parseSpecText } from "../server/specGen.ts";

const options: GenerateOptions = {
  language: "es",
  durationSec: 30,
  tone: "divertido",
  voiceProvider: "elevenlabs",
  voiceId: "voz-123",
  captionStyle: "boxed",
  platform: "tiktok",
};

const goodSpec = {
  version: 1,
  title: "Café",
  template: "whatever",
  scenes: [{ narration: "Hola", visual: { type: "emoji", emoji: "☕" } }],
};

function scripted(outputs: string[]) {
  const requests: SpecRequest[] = [];
  const provider: SpecProvider = {
    async generateSpec(req) {
      requests.push(req);
      const next = outputs.shift();
      if (next === undefined) throw new Error("no more outputs");
      return next;
    },
  };
  return { provider, requests };
}

const validateScenes = async (spec: VideoSpec) =>
  Array.isArray(spec.scenes) && spec.scenes.length > 0 ? null : "scenes must be a non-empty array";

test("returns on the first valid answer", async () => {
  const { provider, requests } = scripted([JSON.stringify(goodSpec)]);
  const res = await generateValidSpec({ provider, system: "S", user: "U", templateId: "countdown", options, validate: validateScenes });
  assert.equal(res.attempts, 1);
  assert.equal(requests.length, 1);
  assert.equal(res.spec.template, "countdown", "template forced to the user's choice");
});

test("retries once with the JSON parse error, then succeeds", async () => {
  const { provider, requests } = scripted(["Claro, aquí tienes: {not json", "```json\n" + JSON.stringify(goodSpec) + "\n```"]);
  const res = await generateValidSpec({ provider, system: "S", user: "U", templateId: "countdown", options, validate: validateScenes });
  assert.equal(res.attempts, 2);
  assert.match(requests[1].user, /^U\n/);
  assert.match(requests[1].user, /not valid JSON/);
  assert.equal(requests[1].system, "S");
});

test("retries once with the validation error, then succeeds", async () => {
  const { provider, requests } = scripted([JSON.stringify({ ...goodSpec, scenes: [] }), JSON.stringify(goodSpec)]);
  const res = await generateValidSpec({ provider, system: "S", user: "U", templateId: "countdown", options, validate: validateScenes });
  assert.equal(res.attempts, 2);
  assert.match(requests[1].user, /scenes must be a non-empty array/);
});

test("gives up after two retries (three attempts) with a SpecGenerationError", async () => {
  const { provider, requests } = scripted(["nope", "still nope", "nope again", "never asked"]);
  await assert.rejects(
    generateValidSpec({ provider, system: "S", user: "U", templateId: "t", options, validate: validateScenes }),
    (err: Error) => err instanceof SpecGenerationError && err.attempts === 3,
  );
  assert.equal(requests.length, 3);
});

test("applyOptions enforces language, voice, caption style and scene ids", () => {
  const spec = applyOptions(structuredClone(goodSpec), "kinetic-type", options);
  assert.equal(spec.language, "es");
  assert.deepEqual(spec.voice, { provider: "elevenlabs", voiceId: "voz-123" });
  assert.equal(spec.theme.captionStyle, "boxed");
  assert.equal(spec.scenes[0].id, "s1");
  assert.deepEqual(spec.format, { width: 1080, height: 1920, fps: 30 });
});

test("parseSpecText tolerates prose and fences, rejects missing JSON", () => {
  assert.deepEqual(parseSpecText('Here:\n```json\n{"a":1}\n```\nBye'), { a: 1 });
  assert.deepEqual(parseSpecText('ok {"a":{"b":2}} done'), { a: { b: 2 } });
  assert.throws(() => parseSpecText("no json"), /No JSON/);
});

test("user prompt carries the template hint and every option", () => {
  const p = buildUserPrompt("café de especialidad", { id: "countdown", name: "Lista", description: "", emoji: "🔢", gradient: ["#000", "#fff"], promptHint: "numbered items" }, "countdown", options);
  for (const s of ["countdown", "numbered items", "es", "30 seconds", "divertido", "TikTok", "boxed", "elevenlabs", "café de especialidad"]) {
    assert.ok(p.includes(s), `missing ${s}`);
  }
});

test("applyOptions drops a model voiceId that belongs to a different voice provider", () => {
  const raw = { ...structuredClone(goodSpec), voice: { provider: "elevenlabs", voiceId: "eleven-abc" } };
  const spec = applyOptions(raw, "countdown", { ...options, voiceProvider: "kokoro", voiceId: undefined });
  assert.deepEqual(spec.voice, { provider: "kokoro" });
  const same = applyOptions({ ...structuredClone(goodSpec), voice: { provider: "kokoro", voiceId: "em_alex" } }, "countdown", { ...options, voiceProvider: "kokoro", voiceId: undefined });
  assert.equal(same.voice.voiceId, "em_alex");
});

test("applyOptions writes Blender as the user's render engine and never keeps one the model chose", () => {
  const blender = applyOptions(structuredClone(goodSpec), "moody-night", { ...options, renderer: "blender" });
  assert.equal(blender.theme.renderer, "blender");
  const modelPick = { ...structuredClone(goodSpec), theme: { renderer: "blender" } };
  const none = applyOptions(modelPick, "moody-night", options);
  assert.equal("renderer" in none.theme, false);
  const remotion = applyOptions(structuredClone(goodSpec), "moody-night", { ...options, renderer: "remotion" });
  assert.equal("renderer" in remotion.theme, false, "remotion is the default and stays omitted");
});

test("onRejected reports every rejected attempt with its error, so the server can log what the model got wrong", async () => {
  const { provider } = scripted([JSON.stringify({ ...goodSpec, scenes: [] }), "no json here", JSON.stringify(goodSpec)]);
  const seen: { attempt: number; error: string }[] = [];
  const res = await generateValidSpec({
    provider, system: "S", user: "U", templateId: "t", options, validate: validateScenes,
    onRejected: (attempt, error) => seen.push({ attempt, error }),
  });
  assert.equal(res.attempts, 3);
  assert.equal(seen.length, 2);
  assert.deepEqual(seen.map((s) => s.attempt), [1, 2]);
  assert.match(seen[0].error, /scenes must be a non-empty array/);
  assert.match(seen[1].error, /not valid JSON/);
});
