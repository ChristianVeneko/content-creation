// Types shared by the server and the browser UI.
// The VideoSpec mirrors the engine contract in 07-studio/engine/spec.schema.json.

import type { CaptionSettings, CaptionStyle, ReelsSubtitleMode } from "./captions.ts";
import type { DurationSec } from "./durations.ts";
import type { HfOptions, HfQuality } from "./hf.ts";

export type { HfOptions, HfQuality } from "./hf.ts";
export type { CaptionColors, CaptionSettings, CaptionStyle, ReelsSubtitleMode } from "./captions.ts";
export type VoiceProvider = "elevenlabs" | "kokoro" | "none";
export type VisualType = "gradient" | "image" | "video" | "emoji" | "icon" | "illustration" | "scene3d";

/** One object of a 3D scene (engine-defined procedural kinds: phone, server, chart, lock, …). */
export interface Scene3DObject {
  kind: string;
  id?: string;
  label?: string;
  [key: string]: unknown;
}

/** One drawn element of an illustrated scene (engine-defined vocabulary: card, flow, compare, …). */
export interface IllustrationElement {
  type: string;
  id?: string;
  at?: number;
  [key: string]: unknown;
}
export type SceneAnimation = "pop" | "slide" | "typewriter" | "zoom";

export interface Scene {
  id: string;
  narration: string;
  onScreenText?: string;
  durationSec?: number;
  visual: { type: VisualType; src?: string; query?: string; emoji?: string; prompt?: string; elements?: IllustrationElement[]; objects?: Scene3DObject[]; layout?: string; camera?: string };
  /** Two-tone headline used by the illustrated template. */
  title?: { kicker?: string; main?: string };
  animation?: SceneAnimation;
}

export interface VideoSpec {
  version: 1;
  title: string;
  template: string;
  language: string;
  format: { width: number; height: number; fps: number };
  theme: {
    palette: Palette;
    font: string;
    captionStyle: CaptionStyle;
    /** Render engine (3D formats can choose "blender"); omitted = Remotion. A user setting, never the model's. */
    renderer?: Renderer;
  };
  voice: { provider: VoiceProvider; voiceId?: string; speed?: number };
  music?: MusicSpec;
  sfx?: { enabled: boolean; volume: number };
  /** Caption look (engine lib/captions.mjs); unset fields fall back to the template and palette. */
  captions?: CaptionSettings;
  /** Options of the reels-* templates (`subtitles`: "linea", "bloque" or "no"); other keys are kept as-is. */
  reels?: { subtitles?: string; [key: string]: unknown };
  /** HyperFrames formats only: "single" (one continuous world) or "multi" (a sequence of worlds). */
  mode?: "single" | "multi";
  /** HyperFrames formats only: the format-specific payload (validated by the engine's format module). */
  hf?: Record<string, unknown>;
  /** HyperFrames formats only, optional (SDD 7.7): beat spacing, camera, brand pill, call to action, variants. */
  pace?: "calm" | "normal" | "fast";
  camera?: { intensity?: "none" | "subtle" | "dynamic"; [key: string]: unknown };
  brand?: { handle?: string; avatar?: string; pill?: boolean; followClick?: boolean; [key: string]: unknown };
  cta?: { type: "follow" | "comment" | "send" | "custom"; [key: string]: unknown };
  variants?: { count: number };
  scenes: Scene[];
  post: {
    tiktok: string;
    instagram: string;
    youtube: { title: string; description: string };
    hashtags: string[];
  };
}

/** spec.theme.palette: background stops plus text and up to three accents (hex). */
export interface Palette {
  bg: string[];
  text: string;
  accent: string;
  accent2?: string;
  accent3?: string;
}

/** A curated palette preset (engine lib/palettes.mjs). */
export interface PalettePreset {
  id: string;
  name: string;
  description: string;
  tags: string[];
  palette: Palette;
}

/** A topic preset ("temática", engine lib/themes.mjs). Templates are filtered to ids the registry knows. */
export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  examplePrompt: string;
  templates: string[];
  palette: string;
  mood: string;
  /** Human label of the music mood (engine MOOD_LABELS). */
  moodLabel?: string;
  tone: string;
}

export type TemplateCategory = "illustrated-2d" | "3d" | "kinetic" | "reels-2d" | "hyperframes";

export type ProviderId = "anthropic" | "openai" | "gemini" | "claudeCode";

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  available: boolean;
  model: string;
  /** Human-readable reason when unavailable (never contains key values). */
  reason?: string;
  /** Alternative model ids the UI may offer (e.g. a faster option). */
  models?: { id: string; label: string }[];
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  emoji: string;
  /** Two or more CSS colors (engine preview data). */
  gradient: string[];
  accent?: string;
  sampleText?: string;
  promptHint?: string;
  /** Preview style hint from the engine (e.g. "illustrated" draws a vector card instead of an emoji). */
  style?: string;
  /** Gallery family (engine `category`). */
  category?: TemplateCategory | string;
  /** Kebab slug naming the video format (engine `format`; defaults to the template id). */
  format?: string;
  bestFor?: string[];
  /** The template's own palette (defaults.theme.palette), shown as "Original". */
  palette?: Palette;
  font?: string;
  /** HyperFrames formats: "hyperframes" and `ownsCaptions` (the composition draws its own subtitles). */
  engine?: string;
  ownsCaptions?: boolean;
  /** HyperFrames formats: scene modes, visual styles (optional swatch colors) and settings/scenarios the format offers. */
  modes?: ("single" | "multi")[];
  styles?: HfEntry[];
  settings?: HfEntry[];
  /** pixel-world: the narrating mascots (built-in heroes and saved mascots) and the default one. */
  mascots?: HfEntry[];
  defaultMascot?: string;
}

/** A style or setting of a HyperFrames format (engine `meta.styles` / `meta.settings`). */
export interface HfEntry {
  id: string;
  name: string;
  about: string;
  /** Hex colors for a small preview swatch, when the format provides them. */
  palette?: string[];
}

export type MusicProvider = "library" | "elevenlabs" | "format" | "none";

/** `spec.music` (engine contract, see engine/spec.schema.json). */
export interface MusicSpec {
  provider?: MusicProvider;
  /** Library mood id or "auto". */
  mood?: string;
  /** Library track id or "auto". */
  track?: string;
  file?: string;
  /** 0.12 = 13 dB under the voice. */
  volume: number;
  duck?: boolean;
  /** ElevenLabs Music only. */
  prompt?: string;
  tone?: string;
}

/** Music + SFX choices made in the UI (Create options or the storyboard). */
export interface MusicOptions {
  enabled: boolean;
  /** "format": the HyperFrames format synthesizes its own chiptune (pixel-world only). */
  provider: "library" | "elevenlabs" | "format";
  /** Mood id or "auto" (with provider "format": a format mood id or "auto"). */
  mood: string;
  /** Specific track id, or "" for automatic. */
  track: string;
  volume: number;
  sfxVolume: number;
  prompt: string;
}

export interface MusicMood {
  id: string;
  label: string;
  count: number;
}

export interface MusicTrack {
  id: string;
  mood: string;
  title: string;
  artist: string;
  durationSec: number;
  bpm?: number | null;
  license: string;
  credit: string;
  sourceUrl?: string;
}

export interface MusicLibrary {
  moods: MusicMood[];
  tracks: MusicTrack[];
  /** ElevenLabs Music can be used (key present on the server; the value is never sent). */
  elevenlabs: { available: boolean; reason?: string };
}

/** A trending Latin American Spanish voice from the ElevenLabs library (preview via /api/voices/:id/preview). */
export interface VoiceOption {
  voiceId: string;
  name: string;
  accent: string;
  locale: string;
  gender: string;
  useCase: string;
  description: string;
  uses7d: number;
}

export interface VoiceLibrary {
  /** ElevenLabs key present on the server (the value is never sent). */
  available: boolean;
  reason?: string;
  /** Most trending first; an empty voiceId means "auto": the engine picks one of the top five. */
  voices: VoiceOption[];
}

/** Render engine of a video (spec.theme.renderer): "remotion" (default) or "blender" (3D formats only). */
export type Renderer = "remotion" | "blender";

export interface GenerateOptions {
  language: string;
  durationSec: DurationSec;
  tone: string;
  voiceProvider: VoiceProvider;
  voiceId?: string;
  captionStyle: CaptionStyle;
  platform: "all" | "tiktok" | "instagram" | "youtube";
  music?: MusicOptions;
  /** Overrides the template palette (written to spec.theme.palette). */
  palette?: Palette;
  /** Caption settings written over spec.captions; `captions.style` wins over `captionStyle`. */
  captions?: CaptionSettings;
  /** Subtitle mode of the reels-* templates (spec.reels.subtitles). */
  reelsSubtitles?: ReelsSubtitleMode;
  /** Render engine (3D formats only; written to spec.theme.renderer, never chosen by the model). */
  renderer?: Renderer;
  /** HyperFrames formats only: mode, style, setting, subtitles, quality and advanced choices. Ignored for other formats. */
  hf?: HfOptions;
}

export interface GenerateRequest {
  prompt: string;
  /** Optional when `channel` has a default template. */
  template: string;
  provider: ProviderId;
  model?: string;
  /** Explicit choices. With a channel, options left out fall back to the channel defaults. */
  options: GenerateOptions;
  /** Channel slug: adds the channel context to the request and records the channel on the job. */
  channel?: string;
  /** Fill this existing idea (a job without a script) instead of creating a new folder. */
  jobId?: string;
}

/** Content stage the user sets by hand (independent of the render status). */
export type ContentStage = "idea" | "draft" | "ready" | "published";
export const CONTENT_STAGES: ContentStage[] = ["idea", "draft", "ready", "published"];

export type ChannelPlatform = "youtube" | "tiktok" | "instagram";
export const CHANNEL_PLATFORMS: ChannelPlatform[] = ["youtube", "tiktok", "instagram"];

/** `channel.json` defaults: applied to new videos of the channel unless the user picks otherwise. */
export interface ChannelDefaults {
  template?: string;
  /** Palette preset id (engine lib/palettes.mjs). */
  palette?: string | null;
  voiceProvider?: VoiceProvider;
  voiceId?: string;
  captionStyle?: CaptionStyle | null;
  /** Caption look for new videos (same fields as spec.captions); applied only when a video does not set its own. */
  captions?: CaptionSettings;
  /** Library mood id or "auto". */
  musicMood?: string;
  durationSec?: GenerateOptions["durationSec"];
  tone?: string;
}

/** `08-channels/<slug>/channel.json` (shared contract with the terminal skills). */
export interface Channel {
  version: 1;
  slug: string;
  name: string;
  handle?: string;
  platforms: ChannelPlatform[];
  language: string;
  niche?: string;
  audience?: string;
  pillars: string[];
  createdAt: string;
  defaults: ChannelDefaults;
  /** Public channel description (YouTube "About"), free text with line breaks. */
  description?: string;
  /** `avatar` and `banner` are paths relative to the content-creation root. */
  brand?: { avatar?: string; banner?: string; colors?: string[] };
}

/** A channel with its free-text voice guide (`voice.md`). */
export interface ChannelDetail extends Channel {
  voice: string;
}

/** List entry for the dashboard. */
export interface ChannelSummary extends Channel {
  counts: Record<ContentStage, number>;
  total: number;
  hasAvatar: boolean;
  /** Most recent video of the channel that has a cover. */
  lastCover?: { id: string; title: string };
}

/** Body of `PATCH /api/jobs/:id` (null clears a field). */
export interface JobPatch {
  title?: string;
  notes?: string;
  channel?: string | null;
  stage?: ContentStage;
  publishedAt?: string | null;
  links?: string[];
}

export type JobStatus = "draft" | "rendering" | "done" | "failed";

/** One engine progress line (`--json-logs`). */
export interface EngineLog {
  step: string;
  status: string;
  message?: string;
  progress?: number;
}

export interface JobSummary {
  id: string;
  title: string;
  template: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  prompt?: string;
  provider?: ProviderId;
  dir: string;
  hasVideo: boolean;
  hasCover: boolean;
  /** HyperFrames formats: `video-sin-subtitulos.mp4` exists next to `video.mp4`. */
  hasVideoNoSubs: boolean;
  /** Render quality of the last (or next) HyperFrames render. */
  quality?: HfQuality;
  /** False for an idea that has no script yet. */
  hasSpec: boolean;
  error?: string;
  channel?: string;
  /** Stored stage, or derived for older jobs: ready with a video, else draft. */
  stage: ContentStage;
  notes?: string;
  publishedAt?: string;
  links?: string[];
}

export interface JobDetail extends JobSummary {
  spec?: VideoSpec;
  logs: EngineLog[];
  progress: number;
  postMarkdown?: string;
}

// ---------- video kits (the "Motores" view) ----------

/** One way to make a video: the web engine's templates or a kit in 05-tools/ driven by the /video skill. */
export interface KitInfo {
  id: string;
  name: string;
  /** How it looks and moves, one line. */
  look: string;
  bestFor: string;
  /** Typical length, e.g. "30-50 s". */
  length: string;
  /** Machine render time, one line. */
  renderTime: string;
  /** What to tell /video to use this kit. */
  ask: string;
  /** Builds on a checked fact table (sources.md) before the script. */
  researched: boolean;
  /** Its folder exists on disk (the engine is always available). */
  available: boolean;
  /** Number of styles, for kits that have a style catalog (opuscar). */
  styles?: number;
}

/** One opuscar film style: style.json joined with the Spanish catalog (00-docs/opuscar-styles.md). */
export interface KitStyle {
  slug: string;
  name: string;
  group: string;
  does: string;
  /** B = 2D canvas, fast; M = 2D with textures; A = three.js with post, slow. */
  effort: string;
  film: string;
  line: string;
  durationSec?: number;
  still: boolean;
}
