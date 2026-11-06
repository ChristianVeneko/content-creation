import type {
  Channel,
  ChannelDetail,
  ChannelSummary,
  GenerateRequest,
  HfQuality,
  JobPatch,
  JobDetail,
  JobSummary,
  KitInfo,
  KitStyle,
  MusicLibrary,
  PalettePreset,
  ProviderInfo,
  TemplateInfo,
  ThemePreset,
  VideoSpec,
  VoiceLibrary,
} from "../../shared/types.ts";

/** Fields the client sends to create or update a channel (voice.md travels as `voice`). */
export type ChannelInput = Partial<Omit<Channel, "version" | "createdAt">> & { voice?: string };

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...(init.headers ?? {}) } : init?.headers,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data;
}

export const api = {
  providers: () => call<{ providers: ProviderInfo[] }>("/api/providers").then((r) => r.providers),
  music: () => call<MusicLibrary>("/api/music"),
  musicPreviewUrl: (id: string) => `/api/music/${encodeURIComponent(id)}/preview`,
  voices: () => call<VoiceLibrary>("/api/voices"),
  voicePreviewUrl: (id: string) => `/api/voices/${encodeURIComponent(id)}/preview`,
  templates: () => call<{ templates: TemplateInfo[] }>("/api/templates").then((r) => r.templates),
  palettes: () => call<{ palettes: PalettePreset[] }>("/api/palettes").then((r) => r.palettes),
  themes: () => call<{ themes: ThemePreset[] }>("/api/themes").then((r) => r.themes),
  kits: () => call<{ kits: KitInfo[] }>("/api/kits").then((r) => r.kits),
  opuscarStyles: () => call<{ styles: KitStyle[] }>("/api/kits/opuscar/styles").then((r) => r.styles),
  opuscarStillUrl: (slug: string) => `/api/kits/opuscar/styles/${encodeURIComponent(slug)}/still`,
  thumbUrl: (id: string, kind: "jpg" | "mp4") => `/thumbs/${encodeURIComponent(id)}.${kind}`,
  generate: (body: GenerateRequest) =>
    call<{ jobId: string; spec: VideoSpec; attempts: number }>("/api/spec", { method: "POST", body: JSON.stringify(body) }),
  jobs: () => call<{ jobs: JobSummary[] }>("/api/jobs").then((r) => r.jobs),
  job: (id: string) => call<JobDetail>(`/api/jobs/${encodeURIComponent(id)}`),
  saveSpec: (id: string, spec: VideoSpec) =>
    call<{ ok: true }>(`/api/jobs/${encodeURIComponent(id)}/spec`, { method: "PUT", body: JSON.stringify({ spec }) }),
  render: (id: string, opts: { quality?: HfQuality } = {}) =>
    call<{ ok: true }>(`/api/jobs/${encodeURIComponent(id)}/render`, { method: "POST", ...(opts.quality ? { body: JSON.stringify({ quality: opts.quality }) } : {}) }),
  cancel: (id: string) => call<{ ok: true }>(`/api/jobs/${encodeURIComponent(id)}/render`, { method: "DELETE" }),
  reveal: (id: string) => call<{ ok: true; dir: string }>(`/api/jobs/${encodeURIComponent(id)}/reveal`, { method: "POST" }),
  fileUrl: (id: string, name: string, download = false) =>
    `/api/jobs/${encodeURIComponent(id)}/file/${name}${download ? "?download" : ""}`,
  eventsUrl: (id: string) => `/api/jobs/${encodeURIComponent(id)}/events`,
  createIdea: (body: { title: string; notes?: string; channel?: string }) =>
    call<JobSummary>("/api/jobs", { method: "POST", body: JSON.stringify(body) }),
  patchJob: (id: string, patch: JobPatch) =>
    call<JobSummary>(`/api/jobs/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }),
  channels: () => call<{ channels: ChannelSummary[] }>("/api/channels").then((r) => r.channels),
  channel: (slug: string) => call<ChannelDetail>(`/api/channels/${encodeURIComponent(slug)}`),
  createChannel: (body: ChannelInput) => call<ChannelDetail>("/api/channels", { method: "POST", body: JSON.stringify(body) }),
  updateChannel: (slug: string, body: ChannelInput) =>
    call<ChannelDetail>(`/api/channels/${encodeURIComponent(slug)}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteChannel: (slug: string) => call<{ ok: true }>(`/api/channels/${encodeURIComponent(slug)}`, { method: "DELETE" }),
  avatarUrl: (slug: string) => `/api/channels/${encodeURIComponent(slug)}/avatar`,
  bannerUrl: (slug: string) => `/api/channels/${encodeURIComponent(slug)}/banner`,
};
