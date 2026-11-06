// Channel form sections, shared by the 3-step channel wizard and the channel context editor.
import { useId } from "react";
import { CHANNEL_PLATFORMS, type ChannelDefaults, type GenerateOptions, type VoiceProvider } from "../../shared/types.ts";
import { DURATION_CHOICES, durationLabel } from "../../shared/durations.ts";
import { LANGUAGES, PLATFORM_LABEL, VOICE_TEMPLATE, type ChannelDraft, type ChannelRefs } from "../lib/channels.ts";
import { templatePalette } from "../lib/palette.ts";
import { CaptionPanel } from "./CaptionPanel.tsx";
import { Segmented } from "./Segmented.tsx";

export type ChannelSection = "identity" | "audience" | "voice" | "defaults" | "brand";

const TONES = ["Directo", "Divertido", "Inspirador", "Educativo", "Polémico", "Íntimo"];

export function ChannelFields(props: {
  section: ChannelSection;
  draft: ChannelDraft;
  onChange: (d: ChannelDraft) => void;
  refs: ChannelRefs;
  autoFocus?: boolean;
}) {
  const id = useId();
  const { draft, refs } = props;
  const set = <K extends keyof ChannelDraft>(k: K, v: ChannelDraft[K]) => props.onChange({ ...draft, [k]: v });
  const setDef = <K extends keyof ChannelDefaults>(k: K, v: ChannelDefaults[K]) => props.onChange({ ...draft, defaults: { ...draft.defaults, [k]: v } });

  if (props.section === "identity") {
    return (
      <div className="form-grid">
        <label className="field" htmlFor={`${id}-name`}>
          <span className="field-label">Nombre del canal</span>
          <input id={`${id}-name`} className="input" value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Canal Demo" required maxLength={80} autoFocus={props.autoFocus} />
        </label>
        <label className="field" htmlFor={`${id}-handle`}>
          <span className="field-label">Usuario (opcional)</span>
          <input id={`${id}-handle`} className="input" value={draft.handle} onChange={(e) => set("handle", e.target.value)} placeholder="@canaldemo" maxLength={80} />
        </label>
        <fieldset className="field">
          <legend className="field-label">Dónde publicas</legend>
          <div className="chips">
            {CHANNEL_PLATFORMS.map((p) => {
              const on = draft.platforms.includes(p);
              return (
                <button key={p} type="button" className="chip" aria-pressed={on} onClick={() => set("platforms", on ? draft.platforms.filter((x) => x !== p) : [...draft.platforms, p])}>
                  {PLATFORM_LABEL[p]}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="field" htmlFor={`${id}-lang`}>
          <span className="field-label">Idioma de los videos</span>
          <select id={`${id}-lang`} className="input" value={draft.language} onChange={(e) => set("language", e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  if (props.section === "audience") {
    return (
      <div className="form-grid">
        <label className="field" htmlFor={`${id}-niche`}>
          <span className="field-label">Nicho</span>
          <input id={`${id}-niche`} className="input" value={draft.niche} onChange={(e) => set("niche", e.target.value)} placeholder="Tecnología explicada sin tecnicismos" maxLength={400} autoFocus={props.autoFocus} />
        </label>
        <label className="field" htmlFor={`${id}-aud`}>
          <span className="field-label">Para quién es</span>
          <textarea id={`${id}-aud`} className="input" rows={2} value={draft.audience} onChange={(e) => set("audience", e.target.value)} placeholder="Personas de 20 a 35 años que empiezan a programar y quieren ideas prácticas" maxLength={600} />
        </label>
        <label className="field" htmlFor={`${id}-pillars`}>
          <span className="field-label">Pilares de contenido (uno por línea)</span>
          <textarea id={`${id}-pillars`} className="input" rows={4} value={draft.pillarsText} onChange={(e) => set("pillarsText", e.target.value)} placeholder={"IA práctica\nCarrera y empleo\nHerramientas gratis"} />
          <span className="field-note">Los temas que repites. El agente los usa para mantener el canal coherente.</span>
        </label>
      </div>
    );
  }

  if (props.section === "voice") {
    return (
      <div className="form-grid">
        <fieldset className="field">
          <legend className="field-label">Tono</legend>
          <div className="chips">
            {TONES.map((t) => (
              <button key={t} type="button" className="chip" aria-pressed={draft.defaults.tone === t} onClick={() => setDef("tone", draft.defaults.tone === t ? undefined : t)}>
                {t}
              </button>
            ))}
          </div>
          <input className="input" aria-label="Tono en tus palabras" value={draft.defaults.tone ?? ""} onChange={(e) => setDef("tone", e.target.value || undefined)} placeholder="O descríbelo: directo, con humor seco" maxLength={400} />
        </fieldset>
        <label className="field" htmlFor={`${id}-voice`}>
          <span className="field-label">Guía de voz (voice.md)</span>
          <textarea id={`${id}-voice`} className="input voice-input" rows={10} value={draft.voice} onChange={(e) => set("voice", e.target.value)} placeholder={VOICE_TEMPLATE} />
          <span className="field-note">
            Cómo hablas, frases que usas o evitas, tu llamado a la acción y un ejemplo. El agente la lee antes de escribir cada guion.{" "}
            {!draft.voice.trim() && (
              <button type="button" className="btn btn-text btn-sm" onClick={() => set("voice", VOICE_TEMPLATE)}>
                Empezar con la plantilla
              </button>
            )}
          </span>
        </label>
      </div>
    );
  }

  if (props.section === "defaults") {
    const templates = refs.templates ?? [];
    const channelPalette =
      refs.palettes?.find((p) => p.id === draft.defaults.palette)?.palette ?? templatePalette(templates.find((t) => t.id === draft.defaults.template));
    return (
      <div className="form-grid form-grid-2">
        <label className="field" htmlFor={`${id}-tpl`}>
          <span className="field-label">Plantilla habitual</span>
          <select id={`${id}-tpl`} className="input" value={draft.defaults.template ?? ""} onChange={(e) => setDef("template", e.target.value || undefined)}>
            <option value="">Elegir en cada video</option>
            {draft.defaults.template && !templates.some((t) => t.id === draft.defaults.template) && <option value={draft.defaults.template}>{draft.defaults.template}</option>}
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor={`${id}-pal`}>
          <span className="field-label">Paleta</span>
          <select id={`${id}-pal`} className="input" value={draft.defaults.palette ?? ""} onChange={(e) => setDef("palette", e.target.value || null)}>
            <option value="">La de la plantilla</option>
            {draft.defaults.palette && !refs.palettes?.some((p) => p.id === draft.defaults.palette) && <option value={draft.defaults.palette}>{draft.defaults.palette}</option>}
            {(refs.palettes ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-span">
          <Segmented<VoiceProvider>
            label="Voz"
            value={draft.defaults.voiceProvider ?? "kokoro"}
            options={[
              { value: "kokoro", label: "Kokoro local" },
              { value: "elevenlabs", label: "ElevenLabs" },
              { value: "none", label: "Sin voz" },
            ]}
            onChange={(v) => setDef("voiceProvider", v)}
          />
        </div>
        {draft.defaults.voiceProvider !== "none" && (
          <label className="field" htmlFor={`${id}-vid`}>
            <span className="field-label">ID de voz (opcional)</span>
            <input id={`${id}-vid`} className="input" value={draft.defaults.voiceId ?? ""} onChange={(e) => setDef("voiceId", e.target.value || undefined)} placeholder={draft.defaults.voiceProvider === "elevenlabs" ? "Vacío = automática en tendencia" : "em_alex"} />
          </label>
        )}
        <label className="field" htmlFor={`${id}-mood`}>
          <span className="field-label">Música</span>
          <select id={`${id}-mood`} className="input" value={draft.defaults.musicMood ?? "auto"} onChange={(e) => setDef("musicMood", e.target.value)}>
            <option value="auto">Automática según el tema</option>
            {draft.defaults.musicMood && draft.defaults.musicMood !== "auto" && !refs.moods?.some((m) => m.id === draft.defaults.musicMood) && <option value={draft.defaults.musicMood}>{draft.defaults.musicMood}</option>}
            {(refs.moods ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <div className="form-span">
          <Segmented<GenerateOptions["durationSec"]>
            label="Duración habitual"
            value={draft.defaults.durationSec ?? 30}
            options={DURATION_CHOICES.map((n) => ({ value: n as GenerateOptions["durationSec"], label: durationLabel(n) }))}
            onChange={(v) => setDef("durationSec", v)}
          />
        </div>
        <fieldset className="field form-span">
          <legend className="field-label">Subtítulos</legend>
          <CaptionPanel
            compact
            captions={draft.defaults.captions}
            style={draft.defaults.captionStyle ?? draft.defaults.captions?.style ?? null}
            palette={channelPalette}
            onChange={(c) => {
              const { style: _style, ...captions } = c.captions;
              props.onChange({ ...draft, defaults: { ...draft.defaults, captionStyle: c.style, captions: Object.keys(captions).length ? captions : undefined } });
            }}
          />
          <span className="field-note">Se aplican a los videos nuevos del canal cuando no eliges otros subtítulos.</span>
        </fieldset>
      </div>
    );
  }

  return (
    <div className="form-grid">
      <label className="field" htmlFor={`${id}-avatar`}>
        <span className="field-label">Avatar (ruta dentro de content-creation)</span>
        <input id={`${id}-avatar`} className="input" value={draft.avatar} onChange={(e) => set("avatar", e.target.value)} placeholder="03-assets/brand/mi-canal/avatar.png" />
        <span className="field-note">PNG, JPG o WebP. Solo se muestran archivos dentro de la carpeta del proyecto.</span>
      </label>
      <label className="field" htmlFor={`${id}-banner`}>
        <span className="field-label">Portada (ruta dentro de content-creation)</span>
        <input id={`${id}-banner`} className="input" value={draft.banner} onChange={(e) => set("banner", e.target.value)} placeholder="03-assets/brand/mi-canal/banner-2560x1440.png" />
        <span className="field-note">2560x1440; el texto importante dentro de los 1546x423 del centro.</span>
      </label>
      <label className="field" htmlFor={`${id}-desc`}>
        <span className="field-label">Descripción del canal (la de YouTube)</span>
        <textarea id={`${id}-desc`} className="input" rows={8} value={draft.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} />
      </label>
    </div>
  );
}
