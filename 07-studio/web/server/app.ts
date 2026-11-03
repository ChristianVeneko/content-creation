// HTTP API for the studio (Hono). Built as a factory so tests can inject fakes.
import { spawn, type ChildProcess } from "node:child_process";
import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Readable } from "node:stream";
import { Hono, type Context } from "hono";
import { streamSSE } from "hono/streaming";
import { CONTENT_STAGES, type ChannelSummary, type ContentStage, type GenerateOptions, type GenerateRequest, type JobPatch, type JobStatus, type JobSummary, type MusicLibrary, type PalettePreset, type VoiceLibrary, type ThemePreset, type VideoSpec } from "../shared/types.ts";
import type { StudioConfig } from "./config.ts";
import { Engine, asPalette, type EngineMusicTrack, type EngineVoice } from "./engine.ts";
import { ChannelError, ChannelStore, isValidChannelSlug } from "./channels.ts";
import { captionSettingsIssue, isCaptionStyle, isReelsSubtitleMode } from "../shared/captions.ts";
import { RENDERERS, is3dTemplate, isRenderer } from "../shared/renderers.ts";
import { type HfQuality, defaultHfOptions, hfOptionsIssue, isHfQuality, isHfTemplate, resolveHfOptions } from "../shared/hf.ts";
import { buildChannelContext, channelOptionDefaults } from "./channelContext.ts";
import { JobStore, isValidJobId, type JobEvent, type JobMeta } from "./jobs.ts";
import { log, log as studioLog } from "./logger.ts";
import { createProvider as defaultCreateProvider, isProviderId, listProviders } from "./providers/index.ts";
import { systemPromptFor } from "./systemPrompt.ts";
import { SpecGenerationError, buildUserPrompt, generateValidSpec } from "./specGen.ts";

const MIME: Record<string, string> = {
  "video.mp4": "video/mp4",
  "video-sin-subtitulos.mp4": "video/mp4",
  "cover.jpg": "image/jpeg",
  "post.md": "text/markdown; charset=utf-8",
  "spec.json": "application/json; charset=utf-8",
};

/** Stream a file with HTTP range support (video seeking, audio previews). */
function serveFile(file: string, contentType: string, range: string | undefined, extra: Record<string, string> = {}): Response {
  const size = statSync(file).size;
  const headers: Record<string, string> = { "Content-Type": contentType, "Accept-Ranges": "bytes", "Cache-Control": "no-cache", ...extra };
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (match && (match[1] || match[2])) {
    let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    let end = match[1] && match[2] ? Number(match[2]) : size - 1;
    end = Math.min(end, size - 1);
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    start = Math.max(0, start);
    const body = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(body, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const body = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(body, { status: 200, headers: { ...headers, "Content-Length": String(size) } });
}

const AUDIO_MIME: Record<string, string> = { ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg" };

const IMAGE_MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** Validate a PATCH /api/jobs/:id body. Returns the meta patch or an error message. */
function parseJobPatch(body: unknown, channelExists: (slug: string) => boolean): { patch: Partial<JobMeta> } | { error: string } {
  if (!isObj(body)) return { error: "Faltan los cambios." };
  const b = body as Partial<Record<keyof JobPatch, unknown>>;
  const patch: Partial<JobMeta> = {};
  if ("title" in b) {
    if (typeof b.title !== "string" || !b.title.trim()) return { error: "El título no puede quedar vacío." };
    patch.title = b.title.trim().slice(0, 200);
  }
  if ("notes" in b) {
    if (typeof b.notes !== "string") return { error: "Las notas deben ser texto." };
    patch.notes = b.notes.slice(0, 5000) || undefined;
  }
  if ("channel" in b) {
    if (b.channel === null || b.channel === "") patch.channel = undefined;
    else if (!isValidChannelSlug(b.channel) || !channelExists(b.channel)) return { error: "Ese canal no existe." };
    else patch.channel = b.channel;
  }
  if ("stage" in b) {
    if (!CONTENT_STAGES.includes(b.stage as ContentStage)) return { error: "Estado inválido: usa idea, draft, ready o published." };
    patch.stage = b.stage as ContentStage;
  }
  if ("publishedAt" in b) {
    if (b.publishedAt === null || b.publishedAt === "") patch.publishedAt = undefined;
    else if (typeof b.publishedAt !== "string" || Number.isNaN(Date.parse(b.publishedAt))) return { error: "La fecha de publicación no es válida." };
    else patch.publishedAt = new Date(b.publishedAt).toISOString();
  }
  if ("links" in b) {
    if (!Array.isArray(b.links) || b.links.length > 20) return { error: "Los enlaces deben ser una lista." };
    const links: string[] = [];
    for (const l of b.links) {
      if (typeof l !== "string" || !/^https?:\/\/\S+$/i.test(l.trim())) return { error: "Cada enlace debe empezar con http:// o https://." };
      links.push(l.trim());
    }
    patch.links = links;
  }
  return { patch };
}

export interface AppDeps {
  /** Provider factory (tests inject a scripted provider). */
  createProvider?: typeof defaultCreateProvider;
  /** fetch used to proxy voice previews (tests inject a fake). */
  fetchImpl?: typeof fetch;
}

const DEFAULT_OPTIONS: GenerateOptions = {
  language: "es",
  durationSec: 30,
  tone: "",
  voiceProvider: "elevenlabs",
  captionStyle: "hormozi",
  platform: "all",
};

export function createApp(config: StudioConfig, deps: AppDeps = {}) {
  const createProvider = deps.createProvider ?? defaultCreateProvider;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const app = new Hono();
  const engine = new Engine(config.engineCli, config.engineDir);
  const jobs = new JobStore(config.projectsDir);
  const channels = new ChannelStore(config.channelsDir);
  const running = new Map<string, ChildProcess>();

  const scratchDir = path.join(process.env.TMPDIR ?? os.tmpdir(), "video-studio");

  async function validateSpec(spec: VideoSpec): Promise<string | null> {
    await mkdir(scratchDir, { recursive: true });
    const file = path.join(scratchDir, `validate-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    await writeFile(file, JSON.stringify(spec, null, 2));
    try {
      return await engine.validate(file);
    } finally {
      await rm(file, { force: true });
    }
  }


  /** A job left "rendering" by a previous server process is reported as interrupted. */
  function liveStatus(id: string, status: JobStatus): JobStatus {
    return status === "rendering" && !running.has(id) ? "failed" : status;
  }

  // CSRF guard: the server binds 127.0.0.1, but a page on any site can still POST to it (text/plain needs no
  // preflight). Browsers send Origin on cross-site requests, so reject mutating calls from non-local origins.
  app.use("/api/*", async (c, next) => {
    const origin = c.req.header("origin");
    if (origin && !["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      let host = "";
      try {
        host = new URL(origin).hostname;
      } catch {
        /* malformed origin: treated as foreign */
      }
      if (!["127.0.0.1", "localhost", "[::1]"].includes(host)) return c.json({ error: "Origen no permitido." }, 403);
    }
    await next();
  });

  app.use("/api/*", async (c, next) => {
    const started = performance.now();
    await next();
    if (c.req.path.endsWith("/events")) return; // long-lived SSE streams are logged by the render itself
    const ms = Math.round(performance.now() - started);
    const fields = { method: c.req.method, path: c.req.path, status: c.res.status, ms };
    if (c.res.status >= 500) log.error("http", fields);
    else if (c.res.status >= 400) log.warn("http", fields);
    else log.debug("http", fields);
  });

  app.onError((err, c) => {
    log.error("http.unhandled", { method: c.req.method, path: c.req.path, error: err });
    return c.json({ error: err.message }, 500);
  });

  app.get("/api/health", (c) =>
    c.json({
      ok: true,
      engine: { cli: config.engineCli, found: engine.exists() },
      specWriter: existsSync(config.specWriterPrompt) ? "engine" : "fallback",
      projectsDir: config.projectsDir,
    }),
  );

  app.get("/api/providers", (c) => c.json({ providers: listProviders({ claudeBin: config.claudeBin }) }));

  app.get("/api/templates", async (c) => {
    if (!engine.exists()) return c.json({ error: "El motor de video todavía no está instalado.", templates: [] }, 503);
    try {
      return c.json({ templates: await engine.templates() });
    } catch (err) {
      return c.json({ error: (err as Error).message, templates: [] }, 502);
    }
  });

  // ---------- presets: palettes and themes (engine lib modules, pure data) ----------
  async function loadPreset<T>(file: string, name: string): Promise<T[]> {
    const mod = (await import(pathToFileURL(path.join(config.presetsDir, file)).href)) as Record<string, unknown>;
    const list = mod[name];
    if (!Array.isArray(list)) throw new Error(`${file} does not export ${name}`);
    return list as T[];
  }

  app.get("/api/palettes", async (c) => {
    try {
      const palettes = (await loadPreset<PalettePreset>("palettes.mjs", "PALETTES")).flatMap((p) => {
        const palette = asPalette(p.palette);
        return palette ? [{ id: p.id, name: p.name, description: p.description, tags: p.tags, palette }] : [];
      });
      return c.json({ palettes });
    } catch (err) {
      return c.json({ error: (err as Error).message, palettes: [] }, 502);
    }
  });

  app.get("/api/themes", async (c) => {
    try {
      const themes = await loadPreset<ThemePreset>("themes.mjs", "THEMES");
      const moodLabels = ((await import(pathToFileURL(path.join(config.presetsDir, "music-moods.mjs")).href).catch(() => ({}))) as { MOOD_LABELS?: Record<string, string> }).MOOD_LABELS ?? {};
      // Themes may recommend templates that are not in the registry (yet): keep only known ids, in order.
      const known = engine.exists() ? new Set((await engine.templates().catch(() => [])).map((t) => t.id)) : new Set<string>();
      return c.json({
        themes: themes.map((t) => ({
          id: t.id,
          label: t.label,
          description: t.description,
          examplePrompt: t.examplePrompt,
          templates: t.templates.filter((id) => known.has(id)),
          palette: t.palette,
          mood: t.mood,
          moodLabel: moodLabels[t.mood],
          tone: t.tone,
        })),
      });
    } catch (err) {
      return c.json({ error: (err as Error).message, themes: [] }, 502);
    }
  });

  // ---------- template thumbnails (engine/scripts/make-thumbs.mjs) ----------
  app.get("/thumbs/:file", (c) => {
    const name = c.req.param("file");
    const m = name.match(/^([a-z0-9][a-z0-9-]{0,80})\.(jpg|mp4)$/);
    if (!m) return c.json({ error: "Not found" }, 404);
    const file = path.join(config.thumbsDir, name);
    if (!existsSync(file)) return c.json({ error: "Not found" }, 404);
    return serveFile(file, m[2] === "jpg" ? "image/jpeg" : "video/mp4", c.req.header("range"), { "Cache-Control": "max-age=300" });
  });

  // ---------- music library ----------
  let musicCache: { at: number; moods: MusicLibrary["moods"]; tracks: EngineMusicTrack[] } | null = null;
  async function musicLibrary() {
    if (musicCache && Date.now() - musicCache.at < 60_000) return musicCache;
    const { moods, tracks } = await engine.music();
    musicCache = { at: Date.now(), moods, tracks };
    return musicCache;
  }

  app.get("/api/music", async (c) => {
    const elevenlabs = process.env.ELEVENLABS_API_KEY
      ? { available: true }
      : { available: false, reason: "Falta ELEVENLABS_API_KEY en .env" };
    if (!engine.exists()) return c.json({ error: "El motor de video todavía no está instalado.", moods: [], tracks: [], elevenlabs }, 503);
    try {
      const { moods, tracks } = await musicLibrary();
      const body: MusicLibrary = {
        moods,
        tracks: tracks.map(({ file: _file, ...t }) => t),
        elevenlabs,
      };
      return c.json(body);
    } catch (err) {
      return c.json({ error: (err as Error).message, moods: [], tracks: [], elevenlabs }, 502);
    }
  });

  app.get("/api/music/:id/preview", async (c) => {
    const id = c.req.param("id");
    if (!/^[A-Za-z0-9._-]{1,120}$/.test(id)) return c.json({ error: "Not found" }, 404);
    let track: EngineMusicTrack | undefined;
    try {
      track = (await musicLibrary()).tracks.find((t) => t.id === id);
    } catch {
      return c.json({ error: "Not found" }, 404);
    }
    if (!track) return c.json({ error: "Not found" }, 404);
    // Only files inside the music folder, as listed by the engine's vetted library.json.
    const root = path.resolve(config.musicDir);
    const file = path.resolve(root, track.file);
    if (!file.startsWith(root + path.sep) || !existsSync(file)) return c.json({ error: "Not found" }, 404);
    const mime = AUDIO_MIME[path.extname(file).toLowerCase()];
    if (!mime) return c.json({ error: "Not found" }, 404);
    return serveFile(file, mime, c.req.header("range"), { "Cache-Control": "max-age=3600" });
  });

  // ---------- voice library (trending Latin American Spanish ElevenLabs voices) ----------
  let voicesCache: { at: number; available: boolean; reason?: string; voices: EngineVoice[] } | null = null;
  async function voiceLibrary() {
    if (voicesCache && Date.now() - voicesCache.at < 10 * 60_000) return voicesCache;
    voicesCache = { at: Date.now(), ...(await engine.voices()) };
    return voicesCache;
  }

  app.get("/api/voices", async (c) => {
    if (!process.env.ELEVENLABS_API_KEY) return c.json({ available: false, reason: "Falta ELEVENLABS_API_KEY en .env", voices: [] } satisfies VoiceLibrary);
    if (!engine.exists()) return c.json({ available: false, reason: "El motor de video todavía no está instalado.", voices: [] } satisfies VoiceLibrary, 503);
    try {
      const lib = await voiceLibrary();
      const body: VoiceLibrary = { available: lib.available, ...(lib.reason ? { reason: lib.reason } : {}), voices: lib.voices.map(({ previewUrl: _p, ...v }) => v) };
      return c.json(body);
    } catch (err) {
      return c.json({ available: false, reason: (err as Error).message, voices: [] } satisfies VoiceLibrary, 502);
    }
  });

  app.get("/api/voices/:id/preview", async (c) => {
    const id = c.req.param("id");
    if (!/^[A-Za-z0-9]{4,40}$/.test(id) || !process.env.ELEVENLABS_API_KEY) return c.json({ error: "Not found" }, 404);
    let voice: EngineVoice | undefined;
    try {
      voice = (await voiceLibrary()).voices.find((v) => v.voiceId === id);
    } catch {
      return c.json({ error: "Not found" }, 404);
    }
    // Only previews listed by the engine and hosted by ElevenLabs (their bucket or API).
    let url: URL;
    try {
      url = new URL(voice?.previewUrl ?? "");
    } catch {
      return c.json({ error: "Not found" }, 404);
    }
    const okHost = url.hostname === "storage.googleapis.com" ? url.pathname.startsWith("/eleven-") : /(^|\.)elevenlabs\.io$/.test(url.hostname);
    if (url.protocol !== "https:" || !okHost) return c.json({ error: "Not found" }, 404);
    try {
      const res = await fetchImpl(url.toString());
      if (!res.ok || !res.body) return c.json({ error: "Preview unavailable" }, 502);
      return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "max-age=3600" } });
    } catch {
      return c.json({ error: "Preview unavailable" }, 502);
    }
  });

  // ---------- channels (08-channels/<slug>/channel.json + voice.md) ----------

  /** Brand avatar path, resolved inside the workspace root only (symlinks included), images only. */
  function avatarFile(avatar: string | undefined): string | null {
    if (!avatar) return null;
    const root = path.resolve(config.workspaceRoot);
    const file = path.resolve(root, avatar);
    if (!file.startsWith(root + path.sep) || !IMAGE_MIME[path.extname(file).toLowerCase()] || !existsSync(file)) return null;
    try {
      const real = realpathSync(file);
      const realRoot = realpathSync(root);
      // Check the type on the resolved file too: an image-named symlink must not serve .env or other text.
      const isImage = Boolean(IMAGE_MIME[path.extname(real).toLowerCase()]);
      return real.startsWith(realRoot + path.sep) && isImage && statSync(real).isFile() ? real : null;
    } catch {
      return null;
    }
  }

  function channelError(c: Context, err: unknown) {
    if (err instanceof ChannelError) return c.json({ error: err.message }, err.status);
    throw err;
  }

  app.get("/api/channels", (c) => {
    const all = jobs.list();
    const list: ChannelSummary[] = channels.list().map((ch) => {
      const mine = all.filter((j) => j.channel === ch.slug);
      const counts = { idea: 0, draft: 0, ready: 0, published: 0 } as Record<ContentStage, number>;
      for (const j of mine) counts[j.stage]++;
      const cover = mine.find((j) => j.hasCover);
      return {
        ...ch,
        counts,
        total: mine.length,
        hasAvatar: avatarFile(ch.brand?.avatar) !== null,
        ...(cover ? { lastCover: { id: cover.id, title: cover.title } } : {}),
      };
    });
    return c.json({ channels: list });
  });

  app.post("/api/channels", async (c) => {
    const body = await c.req.json().catch(() => null);
    try {
      return c.json(channels.create(body), 201);
    } catch (err) {
      return channelError(c, err);
    }
  });

  app.get("/api/channels/:slug", (c) => {
    const ch = channels.get(c.req.param("slug"));
    return ch ? c.json(ch) : c.json({ error: "No encontré ese canal." }, 404);
  });

  app.put("/api/channels/:slug", async (c) => {
    const body = await c.req.json().catch(() => null);
    try {
      return c.json(channels.update(c.req.param("slug"), body));
    } catch (err) {
      return channelError(c, err);
    }
  });

  app.delete("/api/channels/:slug", (c) => {
    const slug = c.req.param("slug");
    if (!channels.exists(slug)) return c.json({ error: "No encontré ese canal." }, 404);
    const inUse = jobs.list().filter((j) => j.channel === slug).length;
    if (inUse > 0) {
      return c.json({ error: `Este canal tiene ${inUse} ${inUse === 1 ? "video o idea" : "videos o ideas"}. Muévelos a otro canal o quítales el canal antes de eliminarlo.` }, 409);
    }
    channels.remove(slug);
    return c.json({ ok: true });
  });

  app.get("/api/channels/:slug/avatar", (c) => {
    const file = avatarFile(channels.get(c.req.param("slug"))?.brand?.avatar);
    if (!file) return c.json({ error: "Not found" }, 404);
    return serveFile(file, IMAGE_MIME[path.extname(file).toLowerCase()], undefined, { "Cache-Control": "max-age=60" });
  });

  async function resolvePalettes(): Promise<PalettePreset[]> {
    return loadPreset<PalettePreset>("palettes.mjs", "PALETTES").catch(() => []);
  }

  app.post("/api/spec", async (c) => {
    const body = (await c.req.json().catch(() => null)) as Partial<GenerateRequest> | null;
    if (!body || typeof body.prompt !== "string" || !body.prompt.trim()) {
      return c.json({ error: "Escribe qué video quieres." }, 400);
    }
    if (!isProviderId(body.provider)) return c.json({ error: "Proveedor inválido." }, 400);
    const channel = body.channel ? channels.get(body.channel) : undefined;
    if (body.channel && !channel) return c.json({ error: "Ese canal no existe." }, 400);
    const templateId = typeof body.template === "string" && body.template ? body.template : channel?.defaults.template;
    if (!templateId) return c.json({ error: "Elige una plantilla." }, 400);
    if (body.options?.palette !== undefined && !asPalette(body.options.palette)) {
      return c.json({ error: "La paleta no es válida: usa colores hex (#RRGGBB) para fondo, texto y acento." }, 400);
    }
    if (body.options?.captionStyle !== undefined && !isCaptionStyle(body.options.captionStyle)) {
      return c.json({ error: `Estilo de subtítulos desconocido: ${String(body.options.captionStyle)}.` }, 400);
    }
    if (body.options?.renderer !== undefined && !isRenderer(body.options.renderer)) {
      return c.json({ error: `Motor de render inválido: usa ${RENDERERS.join(" o ")}.` }, 400);
    }
    const captionIssue = captionSettingsIssue(body.options?.captions);
    if (captionIssue) return c.json({ error: captionIssue }, 400);
    if (body.options?.reelsSubtitles !== undefined && !isReelsSubtitleMode(body.options.reelsSubtitles)) {
      return c.json({ error: 'Modo de subtítulos de reels inválido: usa "linea", "bloque" o "no".' }, 400);
    }
    let target: JobMeta | undefined;
    if (body.jobId !== undefined) {
      target = typeof body.jobId === "string" && isValidJobId(body.jobId) ? jobs.readMeta(body.jobId) : undefined;
      if (!target) return c.json({ error: "No encontré esa idea." }, 404);
      if (jobs.readSpec(target.id)) return c.json({ error: "Este proyecto ya tiene guion." }, 409);
    }
    if (!engine.exists()) return c.json({ error: "El motor de video todavía no está instalado." }, 503);

    let channelDefaults: Partial<GenerateOptions> = {};
    if (channel) {
      const presets = channel.defaults.palette ? await resolvePalettes() : [];
      channelDefaults = channelOptionDefaults(channel, (id) => asPalette(presets.find((p) => p.id === id)?.palette) ?? undefined);
    }
    const options: GenerateOptions = { ...DEFAULT_OPTIONS, ...channelDefaults, ...(body.options ?? {}) };
    let provider;
    try {
      provider = createProvider(body.provider, {
        model: body.model,
        claudeBin: config.claudeBin,
        claudeTimeoutMs: config.claudeTimeoutMs,
      });
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
    const templates = await engine.templates().catch(() => []);
    const template = templates.find((t) => t.id === templateId);
    // HyperFrames formats: the choices (mode, style, quality, ...) are checked against the format's registry data
    const isHf = isHfTemplate(template);
    if (isHf) {
      const issue = hfOptionsIssue(body.options?.hf, template);
      if (issue) return c.json({ error: issue }, 400);
      options.hf = resolveHfOptions(body.options?.hf ?? options.hf ?? defaultHfOptions(template), template);
    } else {
      delete options.hf;
    }
    const startedAt = performance.now();
    const model = body.model ?? listProviders({ claudeBin: config.claudeBin }).find((p) => p.id === body.provider)?.model;
    log.info("spec.request", { provider: body.provider, model, template: templateId, channel: channel?.slug, durationSec: options.durationSec, language: options.language });
    try {
      const { spec, attempts } = await generateValidSpec({
        provider,
        // The subscription (Claude Code) gets the creative sections (custom sprites, models, fx); APIs stay catalog-first.
        system: isHf
          ? await engine.prompt(templateId, { creative: body.provider === "claudeCode" })
          : (await systemPromptFor(templateId, config, { creative: body.provider === "claudeCode" })).text,
        user: buildUserPrompt(body.prompt, template, templateId, options, channel ? buildChannelContext(channel, channel.voice) : undefined),
        templateId,
        // the render engine only exists for 3D formats (the engine rejects it elsewhere)
        options: isHf || !is3dTemplate(template) ? { ...options, renderer: undefined } : options,
        validate: validateSpec,
      });
      const title = spec.title ?? body.prompt.slice(0, 60);
      let id: string;
      if (target) {
        id = target.id;
        jobs.writeSpec(id, spec);
        jobs.update(id, { title, template: templateId, prompt: body.prompt, provider: body.provider, stage: "draft", ...(channel ? { channel: channel.slug } : {}), ...(options.hf ? { quality: options.hf.quality } : {}) });
      } else {
        id = jobs.create({ title, template: templateId, prompt: body.prompt, provider: body.provider, spec, ...(channel ? { channel: channel.slug } : {}), ...(options.hf ? { quality: options.hf.quality } : {}) });
      }
      log.info("spec.ok", { provider: body.provider, model, jobId: id, attempts, scenes: spec.scenes?.length, ms: Math.round(performance.now() - startedAt) });
      return c.json({ jobId: id, spec, attempts });
    } catch (err) {
      const status = err instanceof SpecGenerationError ? 422 : 502;
      log.error("spec.failed", {
        provider: body.provider,
        model,
        httpStatus: (err as { status?: number }).status,
        requestId: (err as { requestId?: string }).requestId,
        attempts: err instanceof SpecGenerationError ? err.attempts : undefined,
        ms: Math.round(performance.now() - startedAt),
        error: (err as Error).message,
      });
      return c.json({ error: (err as Error).message }, status);
    }
  });

  app.get("/api/jobs", (c) =>
    c.json({ jobs: jobs.list().map((j) => ({ ...j, status: liveStatus(j.id, j.status) })) }),
  );

  // An idea: title + notes (+ channel), no script yet.
  app.post("/api/jobs", async (c) => {
    const body = (await c.req.json().catch(() => null)) as { title?: unknown; notes?: unknown; channel?: unknown } | null;
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 200) : "";
    if (!title) return c.json({ error: "Escribe la idea." }, 400);
    const channel = body?.channel === undefined || body.channel === null || body.channel === "" ? undefined : body.channel;
    if (channel !== undefined && (!isValidChannelSlug(channel) || !channels.exists(channel))) return c.json({ error: "Ese canal no existe." }, 400);
    const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 5000) : undefined;
    const id = jobs.createIdea({ title, notes: notes || undefined, channel });
    const meta = jobs.readMeta(id)!;
    return c.json(jobs.summary(meta) satisfies JobSummary, 201);
  });

  app.patch("/api/jobs/:id", async (c) => {
    const id = c.req.param("id");
    if (!isValidJobId(id) || !jobs.readMeta(id)) return c.json({ error: "Not found" }, 404);
    if (running.has(id)) return c.json({ error: "El video se está renderizando. Espera a que termine." }, 409);
    const parsed = parseJobPatch(await c.req.json().catch(() => null), (slug) => channels.exists(slug));
    if ("error" in parsed) return c.json({ error: parsed.error }, 400);
    const meta = jobs.readMeta(id)!;
    const patch = parsed.patch;
    if (patch.stage === "published" && !("publishedAt" in patch) && !meta.publishedAt) patch.publishedAt = new Date().toISOString();
    const next = jobs.update(id, patch);
    return c.json({ ...jobs.summary(next), status: liveStatus(id, next.status) });
  });

  app.get("/api/jobs/:id", (c) => {
    const id = c.req.param("id");
    if (!isValidJobId(id)) return c.json({ error: "Not found" }, 404);
    const detail = jobs.detail(id);
    if (!detail) return c.json({ error: "Not found" }, 404);
    return c.json({ ...detail, status: liveStatus(id, detail.status) });
  });

  app.put("/api/jobs/:id/spec", async (c) => {
    const id = c.req.param("id");
    if (!isValidJobId(id) || !jobs.readMeta(id)) return c.json({ error: "Not found" }, 404);
    if (running.has(id)) return c.json({ error: "El video se está renderizando." }, 409);
    const body = (await c.req.json().catch(() => null)) as { spec?: VideoSpec } | null;
    if (!body?.spec || typeof body.spec !== "object") return c.json({ error: "Falta el spec." }, 400);
    const invalid = await validateSpec(body.spec);
    if (invalid) return c.json({ error: invalid }, 422);
    jobs.writeSpec(id, body.spec);
    jobs.update(id, { title: body.spec.title ?? id });
    return c.json({ ok: true });
  });

  app.post("/api/jobs/:id/render", async (c) => {
    const id = c.req.param("id");
    if (!isValidJobId(id) || !jobs.readMeta(id)) return c.json({ error: "Not found" }, 404);
    if (running.has(id)) return c.json({ error: "Ya se está renderizando." }, 409);
    if (!engine.exists()) return c.json({ error: "El motor de video todavía no está instalado." }, 503);
    const spec = jobs.readSpec(id);
    if (!spec) return c.json({ error: "Este proyecto no tiene spec.json." }, 400);
    const invalid = await validateSpec(spec);
    if (invalid) return c.json({ error: invalid }, 422);
    // HyperFrames formats render at a chosen quality (draft | looks | delivery) and take no render-engine choice
    const renderBody = (await c.req.json().catch(() => null)) as { quality?: unknown } | null;
    if (renderBody?.quality !== undefined && !isHfQuality(renderBody.quality)) return c.json({ error: "Calidad inválida: usa draft, looks o delivery." }, 400);
    const isHfSpec = isHfTemplate((await engine.templates().catch(() => [])).find((t) => t.id === spec.template));
    const quality: HfQuality | undefined = isHfSpec ? ((renderBody?.quality as HfQuality | undefined) ?? jobs.readMeta(id)?.quality ?? "looks") : undefined;

    const dir = jobs.dirOf(id);
    let meta = jobs.update(id, { status: "rendering", error: undefined, logs: [], progress: 0, ...(quality ? { quality } : {}) });
    jobs.emit(id, { type: "status", status: "rendering" });
    const tail: string[] = [];
    const { child, done } = engine.build(path.join(dir, "spec.json"), dir, {
      onLog: (log) => {
        meta.logs.push(log);
        if (typeof log.progress === "number") meta.progress = Math.max(meta.progress, log.progress);
        jobs.writeMeta(meta);
        jobs.emit(id, { type: "log", log, progress: meta.progress });
        if (log.status !== "running") studioLog.debug("render.step", { jobId: id, step: log.step, status: log.status, message: log.message });
      },
      onText: (text) => {
        tail.push(text);
        if (tail.length > 20) tail.shift();
        jobs.emit(id, { type: "text", text });
      },
    }, { quality });
    running.set(id, child);
    const renderStarted = performance.now();
    log.info("render.start", { jobId: id });
    void done.then((code) => {
      running.delete(id);
      const ok = code === 0 && existsSync(path.join(dir, "video.mp4"));
      const lastErr = [...meta.logs].reverse().find((l) => l.status === "error")?.message;
      const error = ok ? undefined : lastErr ?? (tail.slice(-3).join(" · ") || `El motor terminó con código ${code}.`);
      // A finished render moves an idea/draft to "ready"; a published video stays published.
      const stage = ok && (meta.stage === "idea" || meta.stage === "draft") ? "ready" : meta.stage;
      meta = jobs.update(id, { status: ok ? "done" : "failed", error, progress: ok ? 1 : meta.progress, logs: meta.logs, stage });
      jobs.emit(id, { type: "status", status: meta.status, error });
      const fields = { jobId: id, exitCode: code, ms: Math.round(performance.now() - renderStarted) };
      if (ok) log.info("render.done", fields);
      else log.error("render.failed", { ...fields, error, lastStep: [...meta.logs].reverse().find((l) => l.status === "error")?.step, tail: tail.slice(-3) });
    });
    return c.json({ ok: true }, 202);
  });

  app.delete("/api/jobs/:id/render", (c) => {
    const id = c.req.param("id");
    const child = running.get(id);
    if (!child) return c.json({ error: "No hay render en curso." }, 404);
    child.kill("SIGTERM");
    return c.json({ ok: true });
  });

  app.get("/api/jobs/:id/events", (c) => {
    const id = c.req.param("id");
    if (!isValidJobId(id) || !jobs.readMeta(id)) return c.json({ error: "Not found" }, 404);
    return streamSSE(c, async (stream) => {
      const detail = jobs.detail(id)!;
      await stream.writeSSE({ event: "snapshot", data: JSON.stringify({ ...detail, status: liveStatus(id, detail.status) }) });
      if (!running.has(id)) return;
      await new Promise<void>((resolve) => {
        const listener = (event: JobEvent) => {
          void stream.writeSSE({ event: event.type, data: JSON.stringify(event) });
          if (event.type === "status" && event.status !== "rendering") finish();
        };
        const ping = setInterval(() => void stream.writeSSE({ event: "ping", data: "{}" }), 15_000);
        const finish = () => {
          clearInterval(ping);
          jobs.events.off(id, listener);
          resolve();
        };
        jobs.events.on(id, listener);
        stream.onAbort(finish);
      });
    });
  });

  app.get("/api/jobs/:id/file/:name", (c) => {
    const id = c.req.param("id");
    const name = c.req.param("name");
    if (!isValidJobId(id)) return c.json({ error: "Not found" }, 404);
    const file = jobs.filePath(id, name);
    if (!file) return c.json({ error: "Not found" }, 404);
    const headers: Record<string, string> = {};
    if (c.req.query("download") !== undefined) headers["Content-Disposition"] = `attachment; filename="${id}-${name}"`;
    return serveFile(file, MIME[name] ?? "application/octet-stream", c.req.header("range"), headers);
  });

  app.post("/api/jobs/:id/reveal", (c) => {
    const id = c.req.param("id");
    if (!isValidJobId(id) || !jobs.readMeta(id)) return c.json({ error: "Not found" }, 404);
    const dir = jobs.dirOf(id);
    if (process.platform === "darwin") spawn("open", [dir], { stdio: "ignore", detached: true }).unref();
    return c.json({ ok: true, dir });
  });

  return { app, engine, jobs };
}
