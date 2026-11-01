// Channel store: one folder per channel under 08-channels/<slug>/ holding channel.json (structured fields and
// defaults) and voice.md (free-text voice guide). Shared contract with the terminal skills, so unknown
// fields in channel.json are preserved on update.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  CHANNEL_PLATFORMS,
  type Channel,
  type ChannelDefaults,
  type ChannelDetail,
  type ChannelPlatform,
  type GenerateOptions,
  type VoiceProvider,
} from "../shared/types.ts";
import { isCaptionStyle, cleanCaptionSettings } from "../shared/captions.ts";
import { isValidJobId, slugify } from "./jobs.ts";

export class ChannelError extends Error {
  readonly status: 400 | 404 | 409;
  constructor(status: 400 | 404 | 409, message: string) {
    super(message);
    this.name = "ChannelError";
    this.status = status;
  }
}

/**
 * Same rule as job ids (no path traversal), never a hidden or template folder, and lowercase only: the workspace
 * disk is case-insensitive, so "Bits" and "bits" would be the same folder and bypass the in-use guard.
 */
export function isValidChannelSlug(slug: unknown): slug is string {
  return (
    typeof slug === "string" &&
    slug.length <= 64 &&
    slug === slug.toLowerCase() &&
    isValidJobId(slug) &&
    !slug.startsWith("_") &&
    !slug.startsWith(".")
  );
}

const VOICE_PROVIDERS: VoiceProvider[] = ["kokoro", "elevenlabs", "none"];
const DURATIONS: GenerateOptions["durationSec"][] = [15, 30, 45, 60];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const MAX_VOICE = 50_000;

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max = 400): string | undefined => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const strList = (v: unknown, max = 12): string[] =>
  Array.isArray(v) ? v.flatMap((x) => (typeof x === "string" && x.trim() ? [x.trim().slice(0, 200)] : [])).slice(0, max) : [];

function sanitizeDefaults(v: unknown): ChannelDefaults {
  if (!isObj(v)) return {};
  const d: ChannelDefaults = {};
  if (str(v.template, 80)) d.template = str(v.template, 80);
  if (v.palette === null) d.palette = null;
  else if (str(v.palette, 80)) d.palette = str(v.palette, 80);
  if (VOICE_PROVIDERS.includes(v.voiceProvider as VoiceProvider)) d.voiceProvider = v.voiceProvider as VoiceProvider;
  if (str(v.voiceId, 120)) d.voiceId = str(v.voiceId, 120);
  if (v.captionStyle === null) d.captionStyle = null;
  else if (isCaptionStyle(v.captionStyle)) d.captionStyle = v.captionStyle;
  const captions = cleanCaptionSettings(v.captions);
  if (captions) d.captions = captions;
  if (str(v.musicMood, 80)) d.musicMood = str(v.musicMood, 80);
  if (DURATIONS.includes(v.durationSec as GenerateOptions["durationSec"])) d.durationSec = v.durationSec as GenerateOptions["durationSec"];
  if (str(v.tone, 400)) d.tone = str(v.tone, 400);
  return d;
}

function sanitizeBrand(v: unknown): Channel["brand"] | undefined {
  if (!isObj(v)) return undefined;
  const brand: NonNullable<Channel["brand"]> = {};
  if (str(v.avatar, 400)) brand.avatar = str(v.avatar, 400);
  const colors = strList(v.colors, 8).filter((c) => HEX_RE.test(c));
  if (colors.length) brand.colors = colors;
  return brand;
}

/** Fields the client may set. Only keys present in the input are returned (so updates are partial). */
function sanitizeFields(input: Record<string, unknown>): Partial<Channel> {
  const out: Partial<Channel> = {};
  if ("name" in input) out.name = str(input.name, 80) ?? "";
  if ("handle" in input) out.handle = str(input.handle, 80);
  if ("platforms" in input) out.platforms = strList(input.platforms).filter((p): p is ChannelPlatform => CHANNEL_PLATFORMS.includes(p as ChannelPlatform));
  if ("language" in input) out.language = str(input.language, 12) ?? "es";
  if ("niche" in input) out.niche = str(input.niche, 400);
  if ("audience" in input) out.audience = str(input.audience, 600);
  if ("pillars" in input) out.pillars = strList(input.pillars);
  if ("defaults" in input) out.defaults = sanitizeDefaults(input.defaults);
  if ("brand" in input) out.brand = sanitizeBrand(input.brand);
  return out;
}

function voiceOf(input: Record<string, unknown>): string | undefined {
  return typeof input.voice === "string" ? input.voice.slice(0, MAX_VOICE) : undefined;
}

export class ChannelStore {
  readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  dirOf(slug: string): string {
    if (!isValidChannelSlug(slug)) throw new ChannelError(400, "Identificador de canal inválido.");
    return path.join(this.root, slug);
  }

  private readRaw(slug: string): Record<string, unknown> | undefined {
    if (!isValidChannelSlug(slug)) return undefined;
    const file = path.join(this.root, slug, "channel.json");
    if (!existsSync(file)) return undefined;
    try {
      const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
      return isObj(raw) ? raw : undefined;
    } catch {
      return undefined;
    }
  }

  /** Normalize a stored channel.json (written by the web or by hand/terminal) to the Channel shape. */
  private normalize(slug: string, raw: Record<string, unknown>): Channel {
    const f = sanitizeFields({ platforms: [], pillars: [], defaults: {}, ...raw });
    return {
      version: 1,
      slug,
      name: f.name || slug,
      ...(f.handle ? { handle: f.handle } : {}),
      platforms: f.platforms ?? [],
      language: f.language ?? "es",
      ...(f.niche ? { niche: f.niche } : {}),
      ...(f.audience ? { audience: f.audience } : {}),
      pillars: f.pillars ?? [],
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
      defaults: f.defaults ?? {},
      ...(f.brand ? { brand: f.brand } : {}),
    };
  }

  list(): Channel[] {
    if (!existsSync(this.root)) return [];
    return readdirSync(this.root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && isValidChannelSlug(d.name))
      .flatMap((d) => {
        const raw = this.readRaw(d.name);
        return raw ? [this.normalize(d.name, raw)] : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  exists(slug: string): boolean {
    return this.readRaw(slug) !== undefined;
  }

  get(slug: string): ChannelDetail | undefined {
    const raw = this.readRaw(slug);
    if (!raw) return undefined;
    const voiceFile = path.join(this.root, slug, "voice.md");
    const voice = existsSync(voiceFile) ? readFileSync(voiceFile, "utf8") : "";
    return { ...this.normalize(slug, raw), voice };
  }

  private write(slug: string, raw: Record<string, unknown>, voice: string | undefined): ChannelDetail {
    const dir = this.dirOf(slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "channel.json"), JSON.stringify(raw, null, 2) + "\n");
    if (voice !== undefined) writeFileSync(path.join(dir, "voice.md"), voice);
    return this.get(slug)!;
  }

  create(input: unknown, now = new Date()): ChannelDetail {
    if (!isObj(input)) throw new ChannelError(400, "Faltan los datos del canal.");
    const fields = sanitizeFields(input);
    if (!fields.name) throw new ChannelError(400, "El canal necesita un nombre.");
    const slug = input.slug === undefined ? slugify(fields.name) : input.slug;
    if (!isValidChannelSlug(slug)) throw new ChannelError(400, "Identificador de canal inválido.");
    if (existsSync(path.join(this.root, slug))) throw new ChannelError(409, `Ya existe un canal con el identificador "${slug}".`);
    const channel: Channel = {
      version: 1,
      slug,
      name: fields.name,
      ...(fields.handle ? { handle: fields.handle } : {}),
      platforms: fields.platforms ?? [],
      language: fields.language ?? "es",
      ...(fields.niche ? { niche: fields.niche } : {}),
      ...(fields.audience ? { audience: fields.audience } : {}),
      pillars: fields.pillars ?? [],
      createdAt: now.toISOString(),
      defaults: fields.defaults ?? {},
      ...(fields.brand ? { brand: fields.brand } : {}),
    };
    return this.write(slug, channel as unknown as Record<string, unknown>, voiceOf(input) ?? "");
  }

  /** Partial update: only the fields sent change; the slug, createdAt and unknown fields are kept. */
  update(slug: string, input: unknown): ChannelDetail {
    const raw = this.readRaw(slug);
    if (!raw) throw new ChannelError(404, "No encontré ese canal.");
    if (!isObj(input)) throw new ChannelError(400, "Faltan los datos del canal.");
    const fields = sanitizeFields(input);
    if ("name" in fields && !fields.name) throw new ChannelError(400, "El canal necesita un nombre.");
    const next: Record<string, unknown> = { ...raw, version: 1, slug };
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) delete next[k];
      else next[k] = v;
    }
    return this.write(slug, next, voiceOf(input));
  }

  /** Removes the channel folder only (never job folders). The caller checks that no job points to it. */
  remove(slug: string): boolean {
    if (!this.readRaw(slug)) return false;
    rmSync(this.dirOf(slug), { recursive: true, force: true });
    return true;
  }
}
