// Create: a six-step onboarding wizard (idea, style, palette, voice and music, format, review) with a
// progress rail and a summary sidebar. Every step can be visited in any order, and once the idea, the
// template and a provider are set the sidebar can generate straight away. A channel picked at the top
// prefills its defaults and gives the script writer the channel context; an idea from the panel prefills
// the prompt and receives the script in its own folder.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Channel, ChannelSummary, GenerateOptions, PalettePreset, ProviderId, ProviderInfo, TemplateInfo, ThemePreset } from "../../shared/types.ts";
import { DEFAULT_MUSIC } from "../../shared/music.ts";
import { CAPTION_LABEL, CaptionPanel } from "../components/CaptionPanel.tsx";
import { MusicPanel } from "../components/MusicPanel.tsx";
import { VoicePicker } from "../components/VoicePicker.tsx";
import { captionKind } from "../../shared/captions.ts";
import { PalettePicker } from "../components/PalettePicker.tsx";
import { Segmented } from "../components/Segmented.tsx";
import { StepRail, type RailStep } from "../components/StepRail.tsx";
import { CATEGORY_LABEL, TemplateThumb } from "../components/TemplateCard.tsx";
import { TemplateGallery } from "../components/TemplateGallery.tsx";
import { api } from "../lib/api.ts";
import { type PaletteChoice, paletteVars, resolveChoice } from "../lib/palette.ts";
import { href, navigate, safeStorage } from "../lib/route.ts";

const DRAFT_KEY = "studio.draft.v1";
const RETURNING_KEY = "studio.wizard.generated";
const TIP_KEY = "studio.tip.create.v1";
const TONES = ["Directo", "Divertido", "Inspirador", "Educativo", "Polémico", "Íntimo"];
const PROVIDER_NOTE: Record<ProviderId, string> = {
  claudeCode: "Usa tu suscripción, sin API key",
  anthropic: "API de Claude",
  openai: "API de OpenAI",
  gemini: "API de Google",
};
const VOICE_LABEL: Record<GenerateOptions["voiceProvider"], string> = { kokoro: "Kokoro local", elevenlabs: "ElevenLabs", none: "Sin voz" };
const PLATFORM_LABEL: Record<GenerateOptions["platform"], string> = { all: "Todas", tiktok: "TikTok", instagram: "Reels", youtube: "Shorts" };
const LANGUAGE_LABEL: Record<string, string> = { es: "Español", en: "Inglés", pt: "Portugués" };

/** "impacto · colores de la paleta" for the review list. */
function captionSummary(o: GenerateOptions, templateId: string): string {
  const kind = captionKind(templateId);
  const colors = o.captions?.colors ? "colores propios" : "colores de la paleta";
  if (kind === "reels") return o.reelsSubtitles === "no" ? "no" : `${o.reelsSubtitles === "bloque" ? "en bloque" : "en línea"} · ${colors}`;
  if (kind === "pixel" && o.captions?.enabled !== true) return "no (pixel)";
  return `${CAPTION_LABEL[o.captions?.style ?? o.captionStyle]?.toLowerCase() ?? o.captionStyle} · ${colors}`;
}

interface Draft {
  prompt: string;
  template: string;
  provider: ProviderId | "";
  options: GenerateOptions;
  theme: string;
  paletteChoice: PaletteChoice;
  /** Channel slug ("" for none); never restored from a saved draft. */
  channel: string;
}

const DEFAULT_DRAFT: Draft = {
  prompt: "",
  template: "",
  provider: "",
  options: { language: "es", durationSec: 30, tone: "", voiceProvider: "elevenlabs", voiceId: "", captionStyle: "hormozi", platform: "all", music: DEFAULT_MUSIC },
  theme: "",
  paletteChoice: { kind: "original" },
  channel: "",
};

/** Prefill the draft with a channel's defaults (only the ones the channel sets). */
function withChannel(d: Draft, ch: Channel | undefined): Draft {
  if (!ch) return { ...d, channel: "" };
  const def = ch.defaults ?? {};
  const options = { ...d.options };
  if (ch.language) options.language = ch.language;
  if (def.voiceProvider) {
    options.voiceProvider = def.voiceProvider;
    options.voiceId = def.voiceId ?? "";
  }
  if (def.captionStyle) options.captionStyle = def.captionStyle;
  if (def.captions) {
    const { style, ...captions } = def.captions;
    if (style && !def.captionStyle) options.captionStyle = style;
    options.captions = captions;
  }
  if (def.durationSec) options.durationSec = def.durationSec;
  if (def.tone) options.tone = def.tone;
  if (def.musicMood) options.music = { ...(options.music ?? DEFAULT_MUSIC), enabled: true, provider: "library", mood: def.musicMood, track: "" };
  const paletteChoice: PaletteChoice = def.palette ? { kind: "preset", id: def.palette } : def.palette === null ? { kind: "original" } : d.paletteChoice;
  return { ...d, channel: ch.slug, template: def.template || d.template, options, paletteChoice, theme: "" };
}

function loadDraft(): Draft {
  const raw = safeStorage().get(DRAFT_KEY);
  if (!raw) return DEFAULT_DRAFT;
  try {
    const d = JSON.parse(raw) as Partial<Draft>;
    const options = { ...DEFAULT_DRAFT.options, ...(d.options ?? {}) };
    options.music = { ...DEFAULT_MUSIC, ...(d.options?.music ?? {}) };
    delete options.palette;
    const paletteChoice = d.paletteChoice && ["original", "preset", "custom"].includes(d.paletteChoice.kind) ? d.paletteChoice : DEFAULT_DRAFT.paletteChoice;
    return { ...DEFAULT_DRAFT, ...d, options, paletteChoice, channel: "" }; // never restore a channel: each new video starts without one unless the user picks it (or opens a ?canal= link)
  } catch {
    return DEFAULT_DRAFT;
  }
}

const STEP_IDS = ["idea", "style", "palette", "sound", "format", "review"] as const;
const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !["radio", "checkbox", "button", "color"].includes((el as HTMLInputElement).type)) || el.tagName === "SELECT");

export function Create(props: { channel?: string; idea?: string }) {
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [channels, setChannels] = useState<ChannelSummary[] | null>(null);
  const [idea, setIdea] = useState<{ id: string; title: string } | null>(null);
  const [tipOpen, setTipOpen] = useState(() => safeStorage().get(TIP_KEY) !== "1");
  const [templates, setTemplates] = useState<TemplateInfo[] | null>(null);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [palettes, setPalettes] = useState<PalettePreset[] | null>(null);
  const [palettesError, setPalettesError] = useState<string | null>(null);
  const [themes, setThemes] = useState<ThemePreset[] | null>(null);
  const [model, setModel] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const returning = useMemo(() => safeStorage().get(RETURNING_KEY) === "1", []);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    safeStorage().set(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    api
      .templates()
      .then((t) => {
        setTemplates(t);
        setDraft((d) => (d.template && t.some((x) => x.id === d.template) ? d : { ...d, template: t[0]?.id ?? "" }));
      })
      .catch((e: Error) => setTemplatesError(e.message));
    api
      .providers()
      .then((p) => {
        setProviders(p);
        setDraft((d) => {
          const current = p.find((x) => x.id === d.provider && x.available);
          return current ? d : { ...d, provider: p.find((x) => x.available)?.id ?? "" };
        });
      })
      .catch((e: Error) => setError(e.message));
    api.palettes().then(setPalettes, (e: Error) => setPalettesError(e.message));
    api.themes().then(setThemes, () => setThemes([]));
    api.channels().then(
      (list) => {
        setChannels(list);
        // A remembered channel that no longer exists is dropped.
        setDraft((d) => (d.channel && !list.some((c) => c.slug === d.channel) ? { ...d, channel: "" } : d));
      },
      () => setChannels([]),
    );
  }, []);

  // Links from the panel: #/crear?canal=<slug> prefills that channel; #/crear?idea=<id> prefills the idea.
  const appliedRoute = useRef(false);
  useEffect(() => {
    if (appliedRoute.current || !channels) return;
    appliedRoute.current = true;
    const byChannel = (slug?: string) => channels.find((c) => c.slug === slug);
    if (props.idea) {
      api
        .job(props.idea)
        .then((job) => {
          if (job.spec) {
            navigate({ name: "job", id: job.id });
            return;
          }
          setIdea({ id: job.id, title: job.title });
          const slug = job.channel ?? props.channel;
          setDraft((d) => {
            const base = { ...d, prompt: job.notes ? `${job.title}\n\n${job.notes}` : job.title };
            return slug && byChannel(slug) ? withChannel(base, byChannel(slug)) : base;
          });
        })
        .catch((e: Error) => setError(`No pude abrir la idea: ${e.message}`));
    } else if (props.channel && byChannel(props.channel)) {
      setDraft((d) => withChannel(d, byChannel(props.channel)));
    }
  }, [channels, props.channel, props.idea]);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const t = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => window.clearInterval(t);
  }, [busy]);

  // Move focus to the new step's heading so keyboard and screen-reader users land in the right place.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [step]);

  const provider = providers?.find((p) => p.id === draft.provider);
  const template = templates?.find((t) => t.id === draft.template);
  const theme = themes?.find((t) => t.id === draft.theme);
  const channel = channels?.find((c) => c.slug === draft.channel);
  const knownIds = useMemo(() => new Set((templates ?? []).map((t) => t.id)), [templates]);
  const recommended = useMemo(() => (theme?.templates ?? []).filter((id) => knownIds.has(id)), [theme, knownIds]);
  const palette = resolveChoice(draft.paletteChoice, palettes, template);
  const setOpt = <K extends keyof GenerateOptions>(k: K, v: GenerateOptions[K]) => setDraft((d) => ({ ...d, options: { ...d.options, [k]: v } }));

  const missing = useMemo(() => {
    if (!draft.prompt.trim()) return "Escribe la idea del video";
    if (!draft.template) return "Elige una plantilla";
    if (!provider?.available) return "Elige un proveedor disponible";
    return null;
  }, [draft, provider]);

  const go = useCallback((i: number) => {
    const next = Math.max(0, Math.min(STEP_IDS.length - 1, i));
    setStep(next);
    setVisited((v) => new Set(v).add(next));
  }, []);

  function chooseTheme(t: ThemePreset) {
    if (draft.theme === t.id) {
      setDraft((d) => ({ ...d, theme: "" }));
      return;
    }
    const firstTemplate = t.templates.find((id) => knownIds.has(id));
    setDraft((d) => ({
      ...d,
      theme: t.id,
      prompt: d.prompt.trim() ? d.prompt : t.examplePrompt,
      template: firstTemplate ?? d.template,
      paletteChoice: palettes?.some((p) => p.id === t.palette) || !palettes ? { kind: "preset", id: t.palette } : d.paletteChoice,
      options: {
        ...d.options,
        tone: t.tone,
        music: { ...(d.options.music ?? DEFAULT_MUSIC), enabled: true, provider: "library", mood: t.mood, track: "" },
      },
    }));
  }

  async function generate() {
    if (missing || busy || !provider) {
      if (!draft.prompt.trim()) {
        go(0);
        window.setTimeout(() => promptRef.current?.focus(), 0);
      } else if (!draft.template) go(1);
      else go(5);
      return;
    }
    setBusy(true);
    setElapsed(0);
    setError(null);
    try {
      const { voiceId, ...rest } = draft.options;
      const res = await api.generate({
        prompt: draft.prompt,
        template: draft.template,
        provider: provider.id,
        model: model || undefined,
        options: { ...rest, ...(voiceId?.trim() ? { voiceId: voiceId.trim() } : {}), ...(palette.override ? { palette: palette.override } : {}) },
        ...(channel ? { channel: channel.slug } : {}),
        ...(idea ? { jobId: idea.id } : {}),
      });
      safeStorage().set(RETURNING_KEY, "1");
      setIdea(null);
      setDraft((d) => ({ ...d, prompt: "" }));
      navigate({ name: "job", id: res.jobId });
    } catch (e) {
      setError((e as Error).message);
      go(5);
    } finally {
      setBusy(false);
    }
  }

  // Keyboard: ⌘/Ctrl+Enter next (generate on the last step), ⌘/Ctrl+Shift+Enter generate now,
  // Alt+←/→ previous/next when the focus is not in a text field.
  const generateRef = useRef(generate);
  generateRef.current = generate;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey || step === STEP_IDS.length - 1) void generateRef.current();
        else go(step + 1);
      } else if (e.altKey && !isEditable(e.target) && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        e.preventDefault();
        go(step + (e.key === "ArrowRight" ? 1 : -1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, go]);

  const music = draft.options.music ?? DEFAULT_MUSIC;
  const musicLabel = !music.enabled
    ? "Sin música"
    : music.provider === "elevenlabs"
      ? "ElevenLabs Music"
      : music.mood === "auto"
        ? "Biblioteca · automática"
        : `Biblioteca · ${themes?.find((t) => t.mood === music.mood)?.moodLabel ?? music.mood}`;

  const steps: RailStep[] = [
    { id: "idea", label: "Idea", hint: draft.prompt.trim() ? "Lista" : "Qué quieres contar", done: Boolean(draft.prompt.trim()) },
    { id: "style", label: "Estilo", hint: template?.name ?? "Plantilla", done: Boolean(template) },
    { id: "palette", label: "Paleta", hint: palette.label, done: visited.has(2) },
    { id: "sound", label: "Voz y música", hint: VOICE_LABEL[draft.options.voiceProvider], done: visited.has(3) },
    { id: "format", label: "Formato", hint: `${draft.options.durationSec}s · ${PLATFORM_LABEL[draft.options.platform]}`, done: visited.has(4) },
    { id: "review", label: "Revisar", hint: missing ? "Falta algo" : "Listo para generar", done: false },
  ];

  const heading = (title: string, sub: string) => (
    <header className="step-head">
      <p className="step-count">
        Paso {step + 1} de {STEP_IDS.length}
      </p>
      <h1 className="step-title" ref={headingRef} tabIndex={-1}>
        {title}
      </h1>
      <p className="step-sub">{sub}</p>
    </header>
  );

  const dismissTip = () => {
    safeStorage().set(TIP_KEY, "1");
    setTipOpen(false);
  };

  return (
    <div className="create-page">
      {tipOpen && (
        <aside className="flow-tip" aria-label="Cómo funciona">
          <ol className="flow-steps">
            <li>
              <strong>Idea</strong> lo que quieres contar
            </li>
            <li>
              <strong>Guion</strong> el agente lo escribe por escenas
            </li>
            <li>
              <strong>Storyboard</strong> lo revisas y editas
            </li>
            <li>
              <strong>Render</strong> sale el MP4 con portada y textos
            </li>
          </ol>
          <button type="button" className="btn btn-text btn-sm" onClick={dismissTip}>
            Entendido
          </button>
        </aside>
      )}
      <div className="create-top">
        <label className="create-channel" htmlFor="create-channel">
          <span className="field-label">Canal</span>
          <select
            id="create-channel"
            className="input input-sm"
            value={draft.channel}
            disabled={busy || !channels}
            onChange={(e) => setDraft((d) => withChannel(d, channels?.find((c) => c.slug === e.target.value)))}
          >
            <option value="">Sin canal</option>
            {channels?.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <p className="muted create-channel-note">
          {channel
            ? "Usa el contexto y los valores del canal. Puedes cambiar cualquier opción."
            : channels && channels.length === 0
              ? <>Sin canales todavía. <a href={href({ name: "newChannel" })}>Crea uno</a> para darle contexto al agente.</>
              : "Elige un canal para usar su voz, su audiencia y sus valores por defecto."}
        </p>
        {idea && (
          <p className="create-idea" role="status">
            Desde la idea <strong>{idea.title}</strong>
            <button type="button" className="btn btn-text btn-sm" onClick={() => setIdea(null)} aria-label="Crear como video nuevo, sin usar la idea">
              Quitar
            </button>
          </p>
        )}
      </div>
    <div className="wizard">
      <StepRail steps={steps} current={step} onGo={go} />

      <section className="wizard-stage" aria-live="off">
        {step === 0 && (
          <div className="step step-idea">
            {heading("¿Qué video quieres hoy?", "Cuéntalo como se lo contarías a alguien. Una temática prellena estilo, paleta, música y tono; luego cambias lo que quieras.")}
            <div className="prompt-wrap">
              <label htmlFor="prompt" className="visually-hidden">
                Idea del video
              </label>
              <textarea
                id="prompt"
                ref={promptRef}
                className="prompt"
                rows={4}
                placeholder="Un reel de 30 segundos sobre 3 errores al preparar café en casa, con un gancho fuerte al inicio…"
                value={draft.prompt}
                onChange={(e) => setDraft((d) => ({ ...d, prompt: e.target.value }))}
                disabled={busy}
                autoFocus={!returning}
              />
              <span className="prompt-hint">
                <kbd>⌘</kbd> <kbd>Enter</kbd> siguiente paso
              </span>
            </div>

            <fieldset className="field topic-field">
              <legend className="field-label">Temáticas</legend>
              {!themes && <div className="loading-line" aria-busy="true" aria-label="Cargando temáticas" />}
              {themes && themes.length === 0 && <p className="muted">No hay temáticas disponibles ahora. Escribe tu idea y sigue.</p>}
              {themes && themes.length > 0 && (
                <div className="topics">
                  {themes.map((t) => {
                    const preset = palettes?.find((p) => p.id === t.palette);
                    return (
                      <button key={t.id} type="button" className="topic" aria-pressed={draft.theme === t.id} onClick={() => chooseTheme(t)} title={t.description}>
                        {preset && (
                          <span className="topic-dots" aria-hidden="true" style={paletteVars(preset.palette)}>
                            <span />
                            <span />
                            <span />
                          </span>
                        )}
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {theme && (
                <div className="topic-note" role="status">
                  <p>
                    <strong>{theme.label}</strong> prellenó
                    {recommended[0] ? ` la plantilla ${templates?.find((x) => x.id === recommended[0])?.name ?? recommended[0]},` : ""} la paleta{" "}
                    {palettes?.find((p) => p.id === theme.palette)?.name ?? theme.palette}, música {theme.moodLabel ?? theme.mood} y tono {theme.tone.toLowerCase()}.
                  </p>
                  {draft.prompt.trim() !== theme.examplePrompt && (
                    <button type="button" className="btn btn-text btn-sm" onClick={() => setDraft((d) => ({ ...d, prompt: theme.examplePrompt }))}>
                      Usar su idea de ejemplo
                    </button>
                  )}
                </div>
              )}
            </fieldset>

            <fieldset className="field">
              <legend className="field-label">Tono</legend>
              <div className="chips">
                {TONES.map((t) => (
                  <button key={t} type="button" className="chip" aria-pressed={draft.options.tone === t} onClick={() => setOpt("tone", draft.options.tone === t ? "" : t)}>
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 1 && (
          <div className="step step-style">
            {heading("Elige el estilo", "Pasa el cursor o el foco por una plantilla para verla en movimiento. Todas son verticales 9:16.")}
            {templatesError ? (
              <div className="notice notice-error" role="alert">
                <strong>No pude cargar las plantillas.</strong> {templatesError}
              </div>
            ) : !templates ? (
              <div className="gallery-grid" aria-busy="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <span key={i} className="tcard-skeleton" />
                ))}
              </div>
            ) : (
              <TemplateGallery
                templates={templates}
                value={draft.template}
                onChange={(id) => setDraft((d) => ({ ...d, template: id }))}
                recommended={recommended}
                recommendedFor={theme?.label}
                disabled={busy}
              />
            )}
            {template && (
              <div className="style-detail">
                <p className="style-detail-name">{template.name}</p>
                <p className="muted">{template.description}</p>
                {template.bestFor && template.bestFor.length > 0 && (
                  <ul className="tags" aria-label="Ideal para">
                    {template.bestFor.slice(0, 5).map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="step step-palette">
            {heading("Paleta de color", "Sirve para cualquier plantilla. La original es la que trae el estilo; el resto la reemplaza.")}
            <PalettePicker template={template} presets={palettes} presetsError={palettesError} choice={draft.paletteChoice} onChange={(c) => setDraft((d) => ({ ...d, paletteChoice: c }))} />
          </div>
        )}

        {step === 3 && (
          <div className="step step-sound">
            {heading("Voz y música", "La voz narra el guion; la música va por debajo y baja sola cuando se habla.")}
            <div className="sound-grid">
              <div className="panel">
                <Segmented
                  label="Voz"
                  value={draft.options.voiceProvider}
                  options={[
                    { value: "elevenlabs", label: "ElevenLabs" },
                    { value: "kokoro", label: "Kokoro local" },
                    { value: "none", label: "Sin voz" },
                  ]}
                  onChange={(v) => setDraft((d) => ({ ...d, options: { ...d.options, voiceProvider: v, voiceId: "" } }))}
                />
                {draft.options.voiceProvider === "elevenlabs" && draft.options.language.startsWith("es") && (
                  <VoicePicker value={draft.options.voiceId ?? ""} onChange={(id) => setOpt("voiceId", id)} disabled={busy} />
                )}
                {(draft.options.voiceProvider === "kokoro" || (draft.options.voiceProvider === "elevenlabs" && !draft.options.language.startsWith("es"))) && (
                  <label className="field">
                    <span className="field-label">ID de voz (opcional)</span>
                    <input
                      className="input"
                      value={draft.options.voiceId ?? ""}
                      placeholder={draft.options.voiceProvider === "kokoro" ? "ef_dora" : "ID de ElevenLabs"}
                      onChange={(e) => setOpt("voiceId", e.target.value)}
                    />
                  </label>
                )}
                <label className="field">
                  <span className="field-label">Idioma</span>
                  <select className="input" value={draft.options.language} onChange={(e) => setOpt("language", e.target.value)}>
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                    <option value="pt">Portugués</option>
                  </select>
                </label>
              </div>
              <div className="panel">
                <p className="field-label">Música y efectos</p>
                <MusicPanel value={music} onChange={(m) => setOpt("music", m)} disabled={busy} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step step-format">
            {heading("Formato y subtítulos", "Los primeros 3 segundos deciden si alguien se queda. Los subtítulos toman los colores de la paleta salvo que elijas otros.")}
            <div className="panel format-panel">
              <Segmented
                label="Duración"
                value={draft.options.durationSec}
                options={[15, 30, 45, 60].map((n) => ({ value: n as GenerateOptions["durationSec"], label: `${n}s` }))}
                onChange={(v) => setOpt("durationSec", v)}
              />
              <Segmented
                label="Plataforma"
                value={draft.options.platform}
                options={[
                  { value: "all", label: "Todas" },
                  { value: "tiktok", label: "TikTok" },
                  { value: "instagram", label: "Reels" },
                  { value: "youtube", label: "Shorts" },
                ]}
                onChange={(v) => setOpt("platform", v)}
              />
            </div>
            <div className="panel">
              <p className="field-label">Subtítulos</p>
              <CaptionPanel
                captions={draft.options.captions}
                style={draft.options.captionStyle}
                reelsSubtitles={draft.options.reelsSubtitles}
                palette={palette.preview}
                templateId={draft.template}
                disabled={busy}
                onChange={(c) =>
                  setDraft((d) => {
                    const { reelsSubtitles: _r, ...rest } = d.options;
                    return { ...d, options: { ...rest, captionStyle: c.style ?? d.options.captionStyle, captions: c.captions, ...(c.reelsSubtitles ? { reelsSubtitles: c.reelsSubtitles } : {}) } };
                  })
                }
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="step step-review">
            {heading("Revisa y genera", "Primero verás el guion por escenas y podrás editarlo; el render viene después.")}
            <dl className="review-list">
              {[
                { k: "Canal", v: channel?.name ?? "Sin canal", go: 0 },
                { k: "Idea", v: draft.prompt.trim() || "Sin escribir", go: 0, warn: !draft.prompt.trim() },
                { k: "Temática", v: theme?.label ?? "Ninguna", go: 0 },
                { k: "Estilo", v: template ? `${template.name}${template.category ? ` · ${CATEGORY_LABEL[template.category] ?? template.category}` : ""}` : "Sin elegir", go: 1, warn: !template },
                { k: "Paleta", v: palette.label, go: 2, palette: palette.preview },
                { k: "Voz", v: `${VOICE_LABEL[draft.options.voiceProvider]}${draft.options.voiceId ? ` · ${draft.options.voiceId}` : draft.options.voiceProvider === "elevenlabs" ? " · automática en tendencia" : ""} · ${LANGUAGE_LABEL[draft.options.language] ?? draft.options.language}`, go: 3 },
                { k: "Música", v: musicLabel, go: 3 },
                { k: "Formato", v: `${draft.options.durationSec}s · ${PLATFORM_LABEL[draft.options.platform]} · subtítulos ${captionSummary(draft.options, draft.template)}${draft.options.tone ? ` · tono ${draft.options.tone.toLowerCase()}` : ""}`, go: 4 },
              ].map((r) => (
                <div key={r.k} className="review-row" data-warn={r.warn || undefined}>
                  <dt>{r.k}</dt>
                  <dd>
                    {r.palette && (
                      <span className="swatches swatches-inline" aria-hidden="true">
                        {[r.palette.bg[0], r.palette.bg[1] ?? r.palette.bg[0], r.palette.text, r.palette.accent].map((c, i) => (
                          <span key={i} style={{ background: c }} />
                        ))}
                      </span>
                    )}
                    <span className="review-value">{r.v}</span>
                  </dd>
                  <button type="button" className="btn btn-text btn-sm" onClick={() => go(r.go)} aria-label={`Editar ${r.k.toLowerCase()}`}>
                    Editar
                  </button>
                </div>
              ))}
            </dl>

            <fieldset className="field review-providers">
              <legend className="field-label">Quién escribe el guion</legend>
              <div className="providers" role="radiogroup">
                {!providers && <p className="muted">Buscando proveedores…</p>}
                {providers?.map((p) => (
                  <label key={p.id} className="provider" data-available={p.available}>
                    <input
                      type="radio"
                      name="provider"
                      disabled={!p.available || busy}
                      checked={draft.provider === p.id}
                      onChange={() => {
                        setDraft((d) => ({ ...d, provider: p.id }));
                        setModel("");
                      }}
                    />
                    <span className="provider-dot" aria-hidden="true" />
                    <span className="provider-text">
                      <span className="provider-name">{p.label}</span>
                      <span className="provider-note">{p.available ? PROVIDER_NOTE[p.id] : p.reason}</span>
                    </span>
                  </label>
                ))}
              </div>
              {provider?.models && provider.models.length > 1 && (
                <select className="input input-sm" aria-label="Modelo" value={model || provider.model} onChange={(e) => setModel(e.target.value)}>
                  {provider.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}
            </fieldset>
          </div>
        )}

        <div className="step-nav">
          <button type="button" className="btn btn-quiet" onClick={() => go(step - 1)} disabled={step === 0}>
            Atrás
          </button>
          <span className="step-keys" aria-hidden="true">
            <kbd>Alt</kbd> <kbd>←</kbd> <kbd>→</kbd> cambiar de paso
          </span>
          {step < STEP_IDS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => go(step + 1)}>
              <span>
                Siguiente<span className="next-of">: {steps[step + 1].label}</span>
              </span>
            </button>
          ) : (
            <button type="button" className="btn btn-primary" data-state={busy ? "loading" : undefined} aria-disabled={Boolean(missing) || busy} onClick={generate}>
              {busy ? `Escribiendo el guion… ${elapsed}s` : "Escribir el guion"}
            </button>
          )}
        </div>
      </section>

      <aside className="summary" aria-label="Resumen del video">
        <div className="summary-preview">
          <span className="summary-frame" style={paletteVars(palette.preview)}>
            {template ? <TemplateThumb template={template} active={!busy} /> : <span className="summary-empty">Sin plantilla</span>}
          </span>
          <div className="summary-head">
            <p className="summary-title">{template?.name ?? "Tu video"}</p>
            <span className="swatches" aria-label={`Paleta ${palette.label}`} role="img">
              {[palette.preview.bg[0], palette.preview.bg[1] ?? palette.preview.bg[0], palette.preview.text, palette.preview.accent, palette.preview.accent2 ?? palette.preview.accent].map((c, i) => (
                <span key={i} style={{ background: c }} />
              ))}
            </span>
          </div>
        </div>
        <ul className="summary-list">
          {[
            { k: "Canal", v: channel?.name ?? "Sin canal", go: 0 },
            { k: "Idea", v: draft.prompt.trim() || "Sin escribir", go: 0 },
            { k: "Temática", v: theme?.label ?? "Ninguna", go: 0 },
            { k: "Paleta", v: palette.label, go: 2 },
            { k: "Voz", v: VOICE_LABEL[draft.options.voiceProvider], go: 3 },
            { k: "Música", v: musicLabel, go: 3 },
            { k: "Formato", v: `${draft.options.durationSec}s · ${PLATFORM_LABEL[draft.options.platform]}`, go: 4 },
          ].map((r) => (
            <li key={r.k}>
              <button type="button" className="summary-row" onClick={() => go(r.go)}>
                <span className="summary-k">{r.k}</span>
                <span className="summary-v">{r.v}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="summary-cta">
          {error && (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          )}
          <button type="button" className="btn btn-primary btn-block" data-state={busy ? "loading" : undefined} aria-disabled={Boolean(missing) || busy} onClick={generate}>
            {busy ? `Escribiendo el guion… ${elapsed}s` : returning && step < 5 ? "Generar ya" : "Escribir el guion"}
          </button>
          <p className="cta-note" aria-live="polite">
            {busy ? `${provider?.label ?? ""} está armando las escenas. Podrás editarlas antes de renderizar.` : missing ?? "Todo listo. Puedes generar desde cualquier paso."}
          </p>
          <p className="cta-keys" aria-hidden="true">
            <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>Enter</kbd> generar ya
          </p>
        </div>
      </aside>
    </div>
    </div>
  );
}
