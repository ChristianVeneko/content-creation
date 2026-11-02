// ElevenLabs voice picker: trending Latin American Spanish male voices with a play/pause preview.
// An empty voiceId means "auto": the engine picks one of the five most trending voices per video.
import { useEffect, useId, useRef, useState } from "react";
import type { VoiceLibrary, VoiceOption } from "../../shared/types.ts";
import { api } from "../lib/api.ts";

const SHOWN = 12;

let libraryPromise: Promise<VoiceLibrary> | null = null;
function loadVoices(): Promise<VoiceLibrary> {
  libraryPromise ??= api.voices().catch((e: Error) => {
    libraryPromise = null;
    throw e;
  });
  return libraryPromise;
}

const ACCENT: Record<string, string> = {
  "latin american": "Latino neutro",
  mexican: "Mexicano",
  colombian: "Colombiano",
  argentine: "Argentino",
  chilean: "Chileno",
  venezuelan: "Venezolano",
  peruvian: "Peruano",
  caribbean: "Caribeño",
};

/** "Diego - Neutral & Conversacional" → ["Diego", "Neutral & Conversacional"]. */
function splitName(name: string): [string, string] {
  const i = name.indexOf(" - ");
  return i > 0 ? [name.slice(0, i).trim(), name.slice(i + 3).trim()] : [name.trim(), ""];
}

export function VoicePicker({ value, onChange, disabled = false }: { value: string; onChange: (voiceId: string) => void; disabled?: boolean }) {
  const [library, setLibrary] = useState<VoiceLibrary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const uid = useId();

  useEffect(() => {
    loadVoices().then(setLibrary, (e: Error) => setError(e.message));
    return () => audio.current?.pause();
  }, []);

  function toggle(v: VoiceOption, label: string) {
    const el = (audio.current ??= new Audio());
    if (playing === v.voiceId) {
      el.pause();
      setPlaying(null);
      return;
    }
    el.pause();
    el.src = api.voicePreviewUrl(v.voiceId);
    el.volume = 0.9;
    el.onended = () => setPlaying(null);
    el.onerror = () => {
      setPlaying(null);
      setLoadingId(null);
      setError(`No pude reproducir la voz de ${label}.`);
    };
    setLoadingId(v.voiceId);
    setError(null);
    el.play().then(
      () => {
        setPlaying(v.voiceId);
        setLoadingId(null);
      },
      () => setLoadingId(null),
    );
  }

  if (!library && !error) return <p className="field-hint">Cargando voces en tendencia…</p>;
  if (library && !library.available) return <p className="field-hint">{library.reason ?? "ElevenLabs no está disponible."} Se usará Kokoro local.</p>;

  const voices = library?.voices.slice(0, SHOWN) ?? [];
  // A voice that is not in the trending list (a channel default or an id typed by the user) lives in the own-id field.
  const custom = value && !voices.some((v) => v.voiceId === value) ? value : "";

  return (
    <fieldset className="voices" disabled={disabled}>
      <legend className="field-label">Voces masculinas en tendencia · español latino</legend>
      {error && (
        <p className="field-hint" role="alert">
          {error}
        </p>
      )}
      <ul className="tracks voice-list">
        <li className="track">
          <label className="track-pick">
            <input type="radio" name={`${uid}-voice`} checked={!value} onChange={() => onChange("")} />
            <span className="track-text">
              <span className="track-title">Automática (Recomendado)</span>
              <span className="track-meta">Una de las 5 más usadas esta semana, distinta según el video</span>
            </span>
          </label>
        </li>
        {voices.map((v) => {
          const [name, traits] = splitName(v.name);
          return (
            <li key={v.voiceId} className="track" data-playing={playing === v.voiceId || undefined}>
              <label className="track-pick">
                <input type="radio" name={`${uid}-voice`} checked={value === v.voiceId} onChange={() => onChange(v.voiceId)} />
                <span className="track-text">
                  <span className="track-title">{name}</span>
                  <span className="track-meta">
                    {[ACCENT[v.accent] ?? v.accent, traits].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </label>
              <button
                type="button"
                className="track-play"
                aria-label={playing === v.voiceId ? `Pausar a ${name}` : `Escuchar a ${name}`}
                aria-pressed={playing === v.voiceId}
                data-state={loadingId === v.voiceId ? "loading" : undefined}
                onClick={() => toggle(v, name)}
              >
                <span aria-hidden="true" className={playing === v.voiceId ? "icon-pause" : "icon-play"} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="field">
        <label className="field-label" htmlFor={`${uid}-own`}>
          O usa tu propio ID de voz
        </label>
        <input
          id={`${uid}-own`}
          className="input"
          value={custom}
          placeholder="ID de ElevenLabs, p. ej. 21m00Tcm4TlvDq8ikWAM"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value.trim())}
        />
        <p className="field-hint">Pégalo desde tu biblioteca de ElevenLabs. Si lo dejas vacío se usa la voz seleccionada arriba.</p>
      </div>
    </fieldset>
  );
}
