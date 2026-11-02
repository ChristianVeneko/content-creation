// Turn a user prompt into a validated VideoSpec: build the request, call the
// provider, parse JSON, enforce the user's explicit choices, validate via the
// engine, and retry once with the error when the output is invalid.
import type { GenerateOptions, TemplateInfo, VideoSpec } from "../shared/types.ts";
import type { SpecProvider } from "./providers/types.ts";
import { applyMusicOptions } from "../shared/music.ts";
import { CAPTION_STYLES, cleanCaptionSettings } from "../shared/captions.ts";
import { asPalette } from "./engine.ts";

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

export const FALLBACK_SYSTEM_PROMPT = `You write VideoSpec JSON for vertical short videos (1080x1920, 30fps).
Return ONLY one JSON object, no prose, no code fences, matching:
{ "version":1, "title":string, "template":string, "language":string,
  "format":{"width":1080,"height":1920,"fps":30},
  "theme":{"palette":{"bg":[hex,hex],"text":hex,"accent":hex},"font":"Montserrat","captionStyle":${CAPTION_STYLES.map((c) => `"${c}"`).join("|")}},
  "voice":{"provider":"elevenlabs"|"kokoro"|"none","voiceId"?:string},
  "music":{"volume":0.12}, "captions":{"enabled":true,"wordsPerPage":3},
  "scenes":[{"id":string,"narration":string,"onScreenText"?:string,"durationSec"?:number,
    "visual":{"type":"gradient"|"image"|"video"|"emoji"|"icon","query"?:string,"emoji"?:string,"prompt"?:string},
    "animation"?:"pop"|"slide"|"typewriter"|"zoom"}],
  "post":{"tiktok":string,"instagram":string,"youtube":{"title":string,"description":string},"hashtags":string[]} }
Open with a hook in the first 2 seconds. Keep narration natural and spoken.`;

const PLATFORM_LABEL: Record<GenerateOptions["platform"], string> = {
  all: "TikTok, Instagram Reels and YouTube Shorts",
  tiktok: "TikTok",
  instagram: "Instagram Reels",
  youtube: "YouTube Shorts",
};

export function buildUserPrompt(prompt: string, template: TemplateInfo | undefined, templateId: string, o: GenerateOptions, channelContext?: string): string {
  const lines = [
    `Template: ${templateId}${template ? ` (${template.name})` : ""}`,
    template?.promptHint ? `Template guidance: ${template.promptHint}` : null,
    `Language: ${o.language}`,
    `Target total duration: about ${o.durationSec} seconds`,
    o.tone ? `Tone: ${o.tone}` : null,
    `Platform focus: ${PLATFORM_LABEL[o.platform]}`,
    `Caption style: ${o.captionStyle}`,
    `Voice provider: ${o.voiceProvider}${o.voiceId ? ` (voiceId ${o.voiceId})` : ""}`,
    ...(channelContext ? ["", channelContext] : []),
    "",
    "User request:",
    prompt.trim(),
    "",
    "Return ONLY the VideoSpec JSON object.",
  ];
  return lines.filter((l) => l !== null).join("\n");
}

/** Extract and parse the JSON object from model text (tolerates code fences and prose). */
export function parseSpecText(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object found in the model output.");
  return JSON.parse(t.slice(start, end + 1));
}

/** Enforce the choices the user made explicitly in the UI. */
export function applyOptions(raw: unknown, templateId: string, o: GenerateOptions): VideoSpec {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("The VideoSpec must be a JSON object.");
  const spec = raw as VideoSpec;
  spec.version = 1;
  spec.template = templateId;
  spec.language = o.language;
  spec.format = { ...{ width: 1080, height: 1920, fps: 30 }, ...(spec.format ?? {}) };
  const captions = cleanCaptionSettings(o.captions);
  spec.theme = { ...(spec.theme ?? ({} as VideoSpec["theme"])), captionStyle: captions?.style ?? o.captionStyle };
  if (captions) spec.captions = { ...(isObject(spec.captions) ? spec.captions : {}), ...captions };
  if (o.reelsSubtitles) spec.reels = { ...(isObject(spec.reels) ? spec.reels : {}), subtitles: o.reelsSubtitles };
  // the render engine is a user setting (3D formats only), never the model's choice
  delete spec.theme.renderer;
  if (o.renderer === "blender") spec.theme.renderer = "blender";
  const palette = asPalette(o.palette);
  if (palette) spec.theme.palette = palette;
  const modelVoiceProvider = spec.voice?.provider;
  spec.voice = { ...(spec.voice ?? {}), provider: o.voiceProvider };
  if (o.voiceId) spec.voice.voiceId = o.voiceId;
  else if (o.voiceProvider === "none" || modelVoiceProvider !== o.voiceProvider) delete spec.voice.voiceId;
  if (Array.isArray(spec.scenes)) {
    spec.scenes.forEach((s, i) => {
      if (s && typeof s === "object" && !s.id) s.id = `s${i + 1}`;
    });
  }
  // Music and SFX are user choices, never the model's.
  if (o.music) return applyMusicOptions(spec, o.music, o.tone);
  return spec;
}

export type Validator = (spec: VideoSpec) => Promise<string | null>;

export interface GenerateResult {
  spec: VideoSpec;
  attempts: number;
}

export class SpecGenerationError extends Error {
  readonly attempts: number;
  readonly lastOutput: string;
  constructor(message: string, attempts: number, lastOutput: string) {
    super(message);
    this.name = "SpecGenerationError";
    this.attempts = attempts;
    this.lastOutput = lastOutput;
  }
}

/**
 * Ask the provider for a spec; on unparseable or invalid output, retry ONCE
 * with the error appended to the request.
 */
// Sources belong in the post description, never in the spoken script or on screen (channel rule; models still do it).
const CITE_LABEL = /(?:^|\s)(?:fuente|fuentes|source|sources)\s*:[^.!?\n]*[.!?]?/gi;
const CITE_PHRASE = /\b(?:seg[uú]n|de acuerdo con|according to)\s+(?:la |el |los |las |una |un |the |a )?(?:encuesta|estudio|informe|reporte|survey|study|report)\b/i;

/** First scene text that cites a source, as a short message for the retry prompt; null when clean. */
export function sourceMentions(spec: VideoSpec): string | null {
  for (const [i, sc] of (spec.scenes ?? []).entries()) {
    for (const text of [sc.narration, sc.onScreenText]) {
      if (typeof text !== "string") continue;
      if (new RegExp(CITE_LABEL.source, "i").test(text) || CITE_PHRASE.test(text)) {
        return `scenes[${i}] cites a source ("${text.slice(0, 80)}"). Never mention sources, studies or surveys in narration or onScreenText; credit them only at the end of post.youtube.description.`;
      }
    }
  }
  return null;
}

/** Last resort after the retry: drop "Fuente: …" fragments from narration and on-screen text. */
export function stripSourceMentions(spec: VideoSpec): VideoSpec {
  const clean = (t?: string) => (typeof t === "string" ? t.replace(CITE_LABEL, "").replace(/\s{2,}/g, " ").trim() : t);
  return { ...spec, scenes: spec.scenes.map((sc) => ({ ...sc, narration: clean(sc.narration) ?? "", onScreenText: clean(sc.onScreenText) })) };
}

export async function generateValidSpec(args: {
  provider: SpecProvider;
  system: string;
  user: string;
  templateId: string;
  options: GenerateOptions;
  validate: Validator;
  maxAttempts?: number;
}): Promise<GenerateResult> {
  const maxAttempts = args.maxAttempts ?? 2;
  let user = args.user;
  let lastError = "";
  let lastOutput = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastOutput = await args.provider.generateSpec({ system: args.system, user });
    try {
      const spec = applyOptions(parseSpecText(lastOutput), args.templateId, args.options);
      const invalid = await args.validate(spec);
      const cited = invalid ? null : sourceMentions(spec);
      if (!invalid && !cited) return { spec, attempts: attempt };
      if (!invalid && attempt === maxAttempts) return { spec: stripSourceMentions(spec), attempts: attempt };
      lastError = invalid ? `The VideoSpec failed validation: ${invalid}` : `The script breaks the no-sources rule: ${cited}`;
    } catch (err) {
      lastError = `The output was not valid JSON: ${(err as Error).message}`;
    }
    user =
      `${args.user}\n\nYour previous answer was rejected. ${lastError}\n` +
      `Previous answer:\n${lastOutput.slice(0, 6000)}\n\nReturn ONLY the corrected VideoSpec JSON object.`;
  }
  throw new SpecGenerationError(lastError, maxAttempts, lastOutput);
}
