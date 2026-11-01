// UI helpers for channels and content stages: labels, the editable channel draft, and the reference data
// (templates, palettes, music moods) the channel defaults pick from.
import { useEffect, useState } from "react";
import type { ChannelDefaults, ChannelDetail, ChannelPlatform, ContentStage, MusicMood, PalettePreset, TemplateInfo } from "../../shared/types.ts";
import { api, type ChannelInput } from "./api.ts";

export const STAGES: ContentStage[] = ["idea", "draft", "ready", "published"];
export const STAGE_LABEL: Record<ContentStage, string> = { idea: "Idea", draft: "Borrador", ready: "Listo", published: "Publicado" };
export const STAGE_HINT: Record<ContentStage, string> = {
  idea: "Por desarrollar",
  draft: "Guion o storyboard",
  ready: "Renderizado, sin publicar",
  published: "Ya está en redes",
};

export const PLATFORM_LABEL: Record<ChannelPlatform, string> = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram" };
export const LANGUAGES: { value: string; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "pt", label: "Portugués" },
];

export const VOICE_TEMPLATE = `## Cómo hablo
Frases cortas, de tú, sin rodeos. Explico como a un amigo.

## Frases que uso
- "Vamos al grano"

## Palabras que evito
- increíble, brutal, épico

## Llamado a la acción
Sígueme para más ideas como esta.

## Ejemplo de gancho
"Estás haciendo esto mal y nadie te lo dijo."
`;

/** Editable form state for a channel (strings for free-text lists). */
export interface ChannelDraft {
  name: string;
  handle: string;
  platforms: ChannelPlatform[];
  language: string;
  niche: string;
  audience: string;
  pillarsText: string;
  voice: string;
  avatar: string;
  defaults: ChannelDefaults;
}

export const EMPTY_CHANNEL: ChannelDraft = {
  name: "",
  handle: "",
  platforms: [],
  language: "es",
  niche: "",
  audience: "",
  pillarsText: "",
  voice: "",
  avatar: "",
  defaults: { voiceProvider: "elevenlabs", durationSec: 30, musicMood: "auto" },
};

export function draftFromChannel(c: ChannelDetail): ChannelDraft {
  return {
    name: c.name,
    handle: c.handle ?? "",
    platforms: c.platforms,
    language: c.language || "es",
    niche: c.niche ?? "",
    audience: c.audience ?? "",
    pillarsText: c.pillars.join("\n"),
    voice: c.voice,
    avatar: c.brand?.avatar ?? "",
    defaults: c.defaults,
  };
}

export function channelInput(d: ChannelDraft, brand?: ChannelDetail["brand"]): ChannelInput {
  const handle = d.handle.trim();
  return {
    name: d.name.trim(),
    handle: handle && !handle.startsWith("@") ? `@${handle}` : handle,
    platforms: d.platforms,
    language: d.language,
    niche: d.niche,
    audience: d.audience,
    pillars: d.pillarsText.split("\n").map((p) => p.trim()).filter(Boolean),
    voice: d.voice,
    defaults: d.defaults,
    // Keep brand colors set elsewhere (terminal skills); only the avatar path is edited here.
    brand: { ...(brand ?? {}), avatar: d.avatar.trim() || undefined },
  };
}

export interface ChannelRefs {
  templates: TemplateInfo[] | null;
  palettes: PalettePreset[] | null;
  moods: MusicMood[] | null;
}

let refsCache: Promise<ChannelRefs> | null = null;

/** Templates, palette presets and music moods, loaded once per page (each tolerates failure). */
export function useChannelRefs(): ChannelRefs {
  const [refs, setRefs] = useState<ChannelRefs>({ templates: null, palettes: null, moods: null });
  useEffect(() => {
    let alive = true;
    refsCache ??= Promise.all([
      api.templates().catch(() => [] as TemplateInfo[]),
      api.palettes().catch(() => [] as PalettePreset[]),
      api.music().then((m) => m.moods, () => [] as MusicMood[]),
    ]).then(([templates, palettes, moods]) => ({ templates, palettes, moods }));
    void refsCache.then((r) => alive && setRefs(r));
    return () => {
      alive = false;
    };
  }, []);
  return refs;
}

export const dateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
