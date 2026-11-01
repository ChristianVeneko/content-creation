import assert from "node:assert/strict";
import { test } from "node:test";
import { generateValidSpec, sourceMentions, stripSourceMentions } from "../server/specGen.ts";
import type { GenerateOptions } from "../shared/types.ts";
const DEFAULT_OPTIONS: GenerateOptions = { language: "es", durationSec: 30, tone: "", voiceProvider: "kokoro", captionStyle: "hormozi", platform: "all" };

const spec = (narr: string[]) => ({ version: 1, title: "t", template: "reels-noche", scenes: narr.map((n, i) => ({ id: `s${i}`, narration: n, visual: { type: "gradient" } })) });

test("sourceMentions flags cited sources in narration and on-screen text", () => {
  assert.ok(sourceMentions(spec(["Dos de cada tres. Fuente: Stack Overflow 2026."]) as never));
  assert.ok(sourceMentions(spec(["Según la encuesta de Stack Overflow, 66% usa agentes."]) as never));
  assert.equal(sourceMentions(spec(["Según tu caso, elige Python."]) as never), null);
});

test("stripSourceMentions removes 'Fuente: …' fragments", () => {
  const out = stripSourceMentions(spec(["66% usa agentes. Fuente: Stack Overflow 2026.", "Hola"]) as never);
  assert.equal(out.scenes[0].narration, "66% usa agentes.");
});

test("generateValidSpec retries once on cited sources, then strips them", async () => {
  const replies = [spec(["Dato. Fuente: X."]), spec(["Dato. Fuente: X."])];
  const users: string[] = [];
  const res = await generateValidSpec({
    provider: { generateSpec: async ({ user }) => (users.push(user), JSON.stringify(replies.shift())) },
    system: "s", user: "u", templateId: "reels-noche", options: { ...DEFAULT_OPTIONS }, validate: async () => null,
  });
  assert.equal(users.length, 2);
  assert.match(users[1], /sources/i);
  assert.equal(res.spec.scenes[0].narration, "Dato.");
});
