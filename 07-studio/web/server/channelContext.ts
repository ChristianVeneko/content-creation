// Channel context for spec generation (pure). The block goes into the USER prompt so the per-template
// system prompt stays identical across channels and keeps hitting the provider's prompt cache.
import type { Channel, GenerateOptions, Palette } from "../shared/types.ts";
import { DEFAULT_MUSIC } from "../shared/music.ts";

/** voice.md is cut to this many characters to keep the request lean. */
export const VOICE_LIMIT = 2000;

const clean = (v: string | undefined | null) => (typeof v === "string" ? v.trim() : "");

export function buildChannelContext(channel: Channel, voice: string): string {
  const name = clean(channel.name);
  const handle = clean(channel.handle);
  const pillars = (channel.pillars ?? []).map(clean).filter(Boolean);
  const tone = clean(channel.defaults?.tone);
  let guide = clean(voice);
  if (guide.length > VOICE_LIMIT) guide = `${guide.slice(0, VOICE_LIMIT).trimEnd()}…`;
  const lines = [
    "Channel context (write for this channel, in its voice; never mention these notes in the video):",
    `Channel: ${name}${handle ? ` (${handle})` : ""}`,
    // No language line: the generate options carry the language (channel default or the user's explicit choice).
    clean(channel.niche) ? `Niche: ${clean(channel.niche)}` : null,
    clean(channel.audience) ? `Audience: ${clean(channel.audience)}` : null,
    pillars.length ? `Pillars: ${pillars.join("; ")}` : null,
    tone ? `Tone: ${tone}` : null,
    guide ? `Voice guide:\n${guide}` : null,
  ];
  return lines.filter((l): l is string => l !== null).join("\n");
}

/**
 * Generate options implied by the channel defaults. The caller spreads the request's explicit options over
 * this, so a default only applies when the request did not set that option.
 */
export function channelOptionDefaults(channel: Channel, resolvePalette: (id: string) => Palette | undefined): Partial<GenerateOptions> {
  const d = channel.defaults ?? {};
  const out: Partial<GenerateOptions> = {};
  if (clean(channel.language)) out.language = clean(channel.language);
  if (d.voiceProvider) out.voiceProvider = d.voiceProvider;
  if (clean(d.voiceId)) out.voiceId = clean(d.voiceId);
  if (d.captionStyle) out.captionStyle = d.captionStyle;
  if (d.captions) {
    // The style travels as captionStyle so an explicit captionStyle in the request still wins over it.
    const { style, ...rest } = d.captions;
    if (style && !out.captionStyle) out.captionStyle = style;
    if (Object.keys(rest).length) out.captions = rest;
  }
  if (d.durationSec) out.durationSec = d.durationSec;
  if (clean(d.tone)) out.tone = clean(d.tone);
  if (d.palette) {
    const palette = resolvePalette(d.palette);
    if (palette) out.palette = palette;
  }
  if (clean(d.musicMood) && d.musicMood !== "auto") {
    out.music = { ...DEFAULT_MUSIC, enabled: true, provider: "library", mood: clean(d.musicMood), track: "" };
  }
  return out;
}
