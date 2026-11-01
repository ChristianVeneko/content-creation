// "Música" controls shared by Create (options) and the storyboard: on/off, source (library mood / track or
// ElevenLabs), music and SFX levels shown as dB under the voice, and a play/pause preview of library tracks.
import { useEffect, useId, useRef, useState } from "react";
import type { MusicLibrary, MusicOptions, MusicTrack } from "../../shared/types.ts";
import { musicDuckedDb, musicLevelDb, sfxLevelDb } from "../../shared/music.ts";
import { api } from "../lib/api.ts";

let libraryPromise: Promise<MusicLibrary> | null = null;
function loadLibrary(): Promise<MusicLibrary> {
  libraryPromise ??= api.music().catch((e: Error) => {
    libraryPromise = null;
    throw e;
  });
  return libraryPromise;
}

const fmtDb = (v: number) => (Number.isFinite(v) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)} dB` : "silencio");
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export function MusicPanel({ value, onChange, disabled = false }: { value: MusicOptions; onChange: (next: MusicOptions) => void; disabled?: boolean }) {
  const [library, setLibrary] = useState<MusicLibrary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const uid = useId();

  useEffect(() => {
    loadLibrary().then(setLibrary, (e: Error) => setError(e.message));
    return () => audio.current?.pause();
  }, []);

  const set = <K extends keyof MusicOptions>(k: K, v: MusicOptions[K]) => onChange({ ...value, [k]: v });
  const elAvailable = library?.elevenlabs.available ?? false;
  const provider = value.provider === "elevenlabs" && elAvailable ? "elevenlabs" : "library";
  const moodTracks: MusicTrack[] = library?.tracks.filter((t) => value.mood !== "auto" && t.mood === value.mood) ?? [];

  function toggle(track: MusicTrack) {
    const el = (audio.current ??= new Audio());
    if (playing === track.id) {
      el.pause();
      setPlaying(null);
      return;
    }
    el.pause();
    el.src = api.musicPreviewUrl(track.id);
    el.volume = 0.8;
    el.onended = () => setPlaying(null);
    el.onerror = () => {
      setPlaying(null);
      setLoadingId(null);
      setError(`No pude reproducir “${track.title}”.`);
    };
    setLoadingId(track.id);
    setError(null);
    el.play().then(
      () => {
        setPlaying(track.id);
        setLoadingId(null);
      },
      () => {
        setLoadingId(null);
      },
    );
  }

  return (
    <div className="music" data-disabled={disabled || undefined}>
      <div className="segmented music-onoff" role="radiogroup" aria-label="Música">
        {[
          { v: true, label: "Con música" },
          { v: false, label: "Sin música" },
        ].map((o) => (
          <label key={String(o.v)} className="segmented-item">
            <input type="radio" name={`${uid}-on`} checked={value.enabled === o.v} disabled={disabled} onChange={() => set("enabled", o.v)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>

      {value.enabled && (
        <>
          <fieldset className="field">
            <legend className="field-label">Fuente</legend>
            <div className="music-sources" role="radiogroup">
              <label className="music-source">
                <input type="radio" name={`${uid}-src`} checked={provider === "library"} disabled={disabled} onChange={() => set("provider", "library")} />
                <span className="music-source-name">Biblioteca</span>
                <span className="music-source-note">Gratis · licencias CC0 / CC BY con crédito</span>
              </label>
              <label className="music-source" data-unavailable={!elAvailable || undefined}>
                <input
                  type="radio"
                  name={`${uid}-src`}
                  checked={provider === "elevenlabs"}
                  disabled={disabled || !elAvailable}
                  onChange={() => set("provider", "elevenlabs")}
                />
                <span className="music-source-name">ElevenLabs</span>
                <span className="music-source-note">{elAvailable ? "A medida para este video, gasta créditos" : library?.elevenlabs.reason ?? "No disponible"}</span>
              </label>
            </div>
          </fieldset>

          {provider === "library" ? (
            <>
              <fieldset className="field">
                <legend className="field-label">Estilo</legend>
                <div className="chips">
                  <button type="button" className="chip" aria-pressed={value.mood === "auto"} disabled={disabled} onClick={() => onChange({ ...value, mood: "auto", track: "" })}>
                    Automático
                  </button>
                  {library?.moods
                    .filter((m) => m.count > 0)
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="chip"
                        aria-pressed={value.mood === m.id}
                        disabled={disabled}
                        onClick={() => onChange({ ...value, mood: m.id, track: value.mood === m.id ? value.track : "" })}
                      >
                        {m.label}
                      </button>
                    ))}
                </div>
                {!library && !error && <p className="field-note">Cargando la biblioteca…</p>}
                {value.mood === "auto" && library && <p className="field-note">Se elige según el tema y el tono del video, sin repetir la pista del render anterior.</p>}
              </fieldset>

              {moodTracks.length > 0 && (
                <fieldset className="field">
                  <legend className="field-label">Pista</legend>
                  <ul className="tracks" role="radiogroup">
                    <li className="track">
                      <label className="track-pick">
                        <input type="radio" name={`${uid}-track`} checked={!value.track} disabled={disabled} onChange={() => set("track", "")} />
                        <span className="track-text">
                          <span className="track-title">Cualquiera de este estilo</span>
                        </span>
                      </label>
                    </li>
                    {moodTracks.map((t) => (
                      <li key={t.id} className="track" data-playing={playing === t.id || undefined}>
                        <label className="track-pick">
                          <input type="radio" name={`${uid}-track`} checked={value.track === t.id} disabled={disabled} onChange={() => set("track", t.id)} />
                          <span className="track-text">
                            <span className="track-title">{t.title}</span>
                            <span className="track-meta">
                              {t.artist} · {fmtTime(t.durationSec)} · {t.license}
                            </span>
                          </span>
                        </label>
                        <button
                          type="button"
                          className="track-play"
                          aria-label={playing === t.id ? `Pausar ${t.title}` : `Escuchar ${t.title}`}
                          aria-pressed={playing === t.id}
                          data-state={loadingId === t.id ? "loading" : undefined}
                          onClick={() => toggle(t)}
                        >
                          <span aria-hidden="true" className={playing === t.id ? "icon-pause" : "icon-play"} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              )}
            </>
          ) : (
            <label className="field">
              <span className="field-label">Cómo quieres que suene (opcional)</span>
              <textarea
                className="input"
                rows={2}
                maxLength={600}
                value={value.prompt}
                disabled={disabled}
                placeholder="Lo-fi tranquilo con piano eléctrico y batería suave…"
                onChange={(e) => set("prompt", e.target.value)}
              />
              <span className="field-note">Sin texto, se arma con el estilo y el tono. Si ElevenLabs falla, se usa la biblioteca.</span>
            </label>
          )}

          <label className="field level">
            <span className="level-head">
              <span className="field-label">Volumen de la música</span>
              <output className="level-db">{fmtDb(musicLevelDb(value.volume))} bajo la voz</output>
            </span>
            <input
              type="range"
              className="range"
              min={0.02}
              max={0.48}
              step={0.01}
              value={value.volume}
              disabled={disabled}
              onChange={(e) => set("volume", Number(e.target.value))}
            />
            <span className="field-note">Mientras se habla baja a {fmtDb(musicDuckedDb(value.volume))}; sube en las pausas.</span>
          </label>
        </>
      )}

      <label className="field level">
        <span className="level-head">
          <span className="field-label">Efectos de sonido</span>
          <output className="level-db">{value.sfxVolume <= 0 ? "apagados" : `${fmtDb(sfxLevelDb(value.sfxVolume))} bajo la voz`}</output>
        </span>
        <input
          type="range"
          className="range"
          min={0}
          max={2}
          step={0.05}
          value={value.sfxVolume}
          disabled={disabled}
          onChange={(e) => set("sfxVolume", Number(e.target.value))}
        />
      </label>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
