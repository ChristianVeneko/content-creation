import assert from "node:assert/strict";
import { test } from "node:test";
import type { Channel, GenerateOptions, Palette } from "../shared/types.ts";
import { VOICE_LIMIT, buildChannelContext, channelOptionDefaults } from "../server/channelContext.ts";
import { buildUserPrompt } from "../server/specGen.ts";

const channel: Channel = {
  version: 1,
  slug: "canal-demo",
  name: "Canal Demo",
  handle: "@canaldemo",
  platforms: ["youtube", "tiktok"],
  language: "es",
  niche: "Tecnología explicada sin humo",
  audience: "Devs junior en LATAM",
  pillars: ["IA práctica", "Carrera dev"],
  createdAt: "2026-11-01T00:00:00.000Z",
  defaults: { template: "reels-noche", palette: "noche", voiceProvider: "kokoro", voiceId: "em_alex", captionStyle: "boxed", musicMood: "tech-lofi", durationSec: 45, tone: "Directo y con humor seco" },
};

const options: GenerateOptions = { language: "es", durationSec: 30, tone: "", voiceProvider: "kokoro", captionStyle: "hormozi", platform: "all" };

test("channel context carries identity, audience, pillars, tone and the voice guide", () => {
  const block = buildChannelContext(channel, "Habla de tú. Nunca digas 'increíble'.");
  for (const s of ["Canal Demo", "@canaldemo", "es", "Tecnología explicada sin humo", "Devs junior en LATAM", "IA práctica", "Carrera dev", "Directo y con humor seco", "Nunca digas 'increíble'."]) {
    assert.ok(block.includes(s), `missing ${s}`);
  }
  assert.match(block, /^Channel context/);
});

test("channel context omits empty fields and truncates a long voice guide", () => {
  const bare: Channel = { ...channel, handle: undefined, niche: "", audience: undefined, pillars: [], defaults: {} };
  const block = buildChannelContext(bare, "x".repeat(VOICE_LIMIT * 3));
  assert.ok(!/Niche:|Audience:|Pillars:|Tone:/.test(block), block.slice(0, 300));
  assert.ok(block.length < VOICE_LIMIT + 600, `block too long: ${block.length}`);
  assert.match(block, /…/);
  const noVoice = buildChannelContext(bare, "  ");
  assert.ok(!noVoice.includes("Voice guide"));
});

test("channel defaults map to generate options, palette resolved by preset id", () => {
  const palette: Palette = { bg: ["#000000", "#111111"], text: "#ffffff", accent: "#ffcc00" };
  const d = channelOptionDefaults(channel, (id) => (id === "noche" ? palette : undefined));
  assert.equal(d.language, "es");
  assert.equal(d.voiceProvider, "kokoro");
  assert.equal(d.voiceId, "em_alex");
  assert.equal(d.captionStyle, "boxed");
  assert.equal(d.durationSec, 45);
  assert.equal(d.tone, "Directo y con humor seco");
  assert.deepEqual(d.palette, palette);
  assert.equal(d.music?.mood, "tech-lofi");
  assert.equal(d.music?.enabled, true);
  const none = channelOptionDefaults({ ...channel, defaults: { palette: "missing", captionStyle: null, musicMood: "auto" } }, () => undefined);
  assert.equal(none.palette, undefined);
  assert.equal(none.captionStyle, undefined);
  assert.equal(none.music, undefined, "auto mood leaves the music choice to the request");
});

test("user prompt without channel context is unchanged; with it the block precedes the request", () => {
  const before = buildUserPrompt("café", undefined, "countdown", options);
  assert.equal(
    before,
    ["Template: countdown", "Language: es", "Target total duration: about 30 seconds", "Platform focus: TikTok, Instagram Reels and YouTube Shorts", "Caption style: hormozi", "Voice provider: kokoro", "", "User request:", "café", "", "Return ONLY the VideoSpec JSON object."].join("\n"),
  );
  const ctx = buildChannelContext(channel, "");
  const withCtx = buildUserPrompt("café", undefined, "countdown", options, ctx);
  assert.ok(withCtx.includes(ctx));
  assert.ok(withCtx.indexOf(ctx) < withCtx.indexOf("User request:"));
  assert.ok(withCtx.endsWith("Return ONLY the VideoSpec JSON object."));
});

test("channel caption defaults map to options.captions; the style goes to captionStyle when none is set", () => {
  const withCaptions: Channel = { ...channel, defaults: { captions: { style: "neon", size: "l", colors: { text: "#FFFFFF", highlight: "#00FFAA", box: "#000000", outline: "#000000" } } } };
  const d = channelOptionDefaults(withCaptions, () => undefined);
  assert.equal(d.captionStyle, "neon");
  assert.deepEqual(d.captions, { size: "l", colors: { text: "#FFFFFF", highlight: "#00FFAA", box: "#000000", outline: "#000000" } });
  const both = channelOptionDefaults({ ...channel, defaults: { captionStyle: "boxed", captions: { style: "neon" } } }, () => undefined);
  assert.equal(both.captionStyle, "boxed", "the explicit captionStyle default wins over captions.style");
  assert.equal(both.captions, undefined, "no caption fields left once the style moved out");
});
