import { useState } from "react";
import type { JobDetail, Scene, VideoSpec, VisualType } from "../../shared/types.ts";
import { applyMusicOptions, formatMusicAvailable, musicOptionsFromSpec } from "../../shared/music.ts";
import { Frame } from "../components/Frame.tsx";
import { CAPTION_LABEL, CaptionPanel, type CaptionPanelChange } from "../components/CaptionPanel.tsx";
import { MusicPanel } from "../components/MusicPanel.tsx";
import { captionKind, isCaptionStyle, normReelsSubtitles } from "../../shared/captions.ts";
import { HF_QUALITY_CHOICES, type HfQuality, isHfSpec } from "../../shared/hf.ts";
import { Segmented } from "../components/Segmented.tsx";
import { FALLBACK_PALETTE } from "../lib/palette.ts";
import { api } from "../lib/api.ts";

const VISUALS: { value: VisualType; label: string }[] = [
  { value: "gradient", label: "Degradado" },
  { value: "emoji", label: "Emoji" },
  { value: "icon", label: "Icono" },
  { value: "image", label: "Imagen" },
  { value: "video", label: "Clip de video" },
];

function estimateSeconds(scene: Scene): number {
  if (scene.durationSec) return scene.durationSec;
  const words = scene.narration.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1.5, Math.round((words / 2.6) * 10) / 10);
}

function musicSummary(spec: VideoSpec): string {
  const m = spec.music;
  if (m?.provider === "none") return "Sin música";
  if (m?.provider === "elevenlabs") return "ElevenLabs a medida";
  if (m?.provider === "format") return "Chiptune del formato";
  if (m?.track && m.track !== "auto") return "Pista elegida";
  if (m?.mood && m.mood !== "auto") return "Biblioteca · estilo elegido";
  return "Biblioteca · automática";
}

function captionsSummary(spec: VideoSpec): string {
  if (isHfSpec(spec)) return spec.captions?.enabled === false ? "Video principal sin subtítulos" : "Subtítulos propios del formato";
  const kind = captionKind(spec.template);
  const colors = spec.captions?.colors || spec.captions?.accent ? "colores propios" : "colores de la paleta";
  if (kind === "reels") {
    const mode = spec.captions?.enabled === false ? "no" : normReelsSubtitles(spec.reels?.subtitles);
    return mode === "no" ? "Sin subtítulos" : `${mode === "bloque" ? "En bloque" : "En línea"} · ${colors}`;
  }
  if (spec.captions?.enabled === false || (kind === "pixel" && spec.captions?.enabled !== true)) return "Sin subtítulos";
  const style = spec.captions?.style ?? spec.theme?.captionStyle;
  return `${style ? CAPTION_LABEL[style] ?? style : "Del estilo"} · ${colors}`;
}

/** Write a caption panel change into the spec (theme.captionStyle follows the chosen style). */
function applyCaptions(spec: VideoSpec, c: CaptionPanelChange): VideoSpec {
  const next: VideoSpec = { ...spec, captions: c.captions };
  if (c.style) next.theme = { ...spec.theme, captionStyle: c.style };
  if (c.reelsSubtitles) next.reels = { ...(spec.reels ?? {}), subtitles: c.reelsSubtitles };
  return next;
}

/** Illustrated (2D) and 3D scenes are drawn by the engine from a list of parts, not from a single visual. */
const isDrawn = (scene: Scene) => scene.visual.type === "illustration" || scene.visual.type === "scene3d";
const drawnParts = (scene: Scene): { type: string }[] =>
  scene.visual.type === "scene3d"
    ? (scene.visual.objects ?? []).map((o) => ({ type: o.kind }))
    : (scene.visual.elements ?? []).map((e) => ({ type: e.type }));

export function Storyboard({ job, onRendering }: { job: JobDetail; onRendering: () => void }) {
  const [spec, setSpec] = useState<VideoSpec | undefined>(job.spec);
  const [dirty, setDirty] = useState(false);
  const [quality, setQuality] = useState<HfQuality>(job.quality ?? "looks");
  const [state, setState] = useState<"idle" | "saving" | "starting">("idle");
  const [error, setError] = useState<string | null>(job.status === "failed" ? job.error ?? "El render anterior falló." : null);

  if (!spec) {
    return (
      <div className="empty">
        <p className="h-section">Este proyecto no tiene guion.</p>
      </div>
    );
  }

  const hf = isHfSpec(spec);
  const bg = spec.theme?.palette?.bg;
  const total = spec.scenes.reduce((s, sc) => s + estimateSeconds(sc), 0);

  const update = (next: VideoSpec) => {
    setSpec(next);
    setDirty(true);
  };
  const updateScene = (i: number, patch: Partial<Scene>) =>
    update({ ...spec, scenes: spec.scenes.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const removeScene = (i: number) => update({ ...spec, scenes: spec.scenes.filter((_, j) => j !== i) });
  const addScene = () =>
    update({
      ...spec,
      scenes: [
        ...spec.scenes,
        { id: `s${Date.now().toString(36)}`, narration: "", onScreenText: "", visual: { type: "gradient" } },
      ],
    });

  async function save(): Promise<boolean> {
    if (!dirty || !spec) return true;
    setState("saving");
    setError(null);
    try {
      await api.saveSpec(job.id, spec);
      setDirty(false);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setState("idle");
    }
  }

  async function render() {
    if (!(await save())) return;
    setState("starting");
    try {
      await api.render(job.id, hf ? { quality } : {});
      onRendering();
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  }

  return (
    <div className="board">
      <header className="board-head">
        <div className="board-title">
          <label className="field-label" htmlFor="title">
            Guion · {spec.scenes.length} escenas · ~{Math.round(total)}s
          </label>
          <textarea
            id="title"
            className="title-input"
            rows={1}
            value={spec.title}
            onChange={(e) => update({ ...spec, title: e.target.value.replace(/\n/g, " ") })}
          />
          {job.prompt && <p className="muted board-prompt">“{job.prompt}”</p>}
        </div>
        <div className="board-actions">
          <button type="button" className="btn btn-quiet" onClick={save} disabled={!dirty || state !== "idle"} data-state={state === "saving" ? "loading" : undefined}>
            {state === "saving" ? "Guardando…" : dirty ? "Guardar cambios" : "Guardado"}
          </button>
          <button type="button" className="btn btn-primary" onClick={render} disabled={state !== "idle" || spec.scenes.length === 0} data-state={state === "starting" ? "loading" : undefined}>
            {state === "starting" ? "Arrancando…" : hf && quality === "draft" ? "Renderizar borrador" : "Renderizar video"}
          </button>
        </div>
      </header>

      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}

      <details className="board-music">
        <summary>
          <span className="board-music-title">Música y efectos</span>
          <span className="board-music-summary">{musicSummary(spec)}</span>
        </summary>
        <div className="board-music-body">
          <MusicPanel
            value={musicOptionsFromSpec(spec)}
            onChange={(m) => update(applyMusicOptions(spec, m))}
            disabled={state !== "idle"}
            formatMusic={formatMusicAvailable(spec.template)}
          />
        </div>
      </details>

      {hf && (
        <details className="board-music" data-testid="hf-render">
          <summary>
            <span className="board-music-title">Render</span>
            <span className="board-music-summary">{HF_QUALITY_CHOICES.find((q) => q.value === quality)?.label} · {spec.mode === "single" ? "una escena continua" : "varias escenas"}</span>
          </summary>
          <div className="board-music-body">
            <Segmented label="Calidad" value={quality} options={HF_QUALITY_CHOICES.map(({ value, label }) => ({ value, label }))} onChange={setQuality} />
            <p className="length-note">{HF_QUALITY_CHOICES.find((q) => q.value === quality)?.hint} Un borrador sirve para revisar ritmo y textos antes del render final.</p>
          </div>
        </details>
      )}

      <details className="board-music">
        <summary>
          <span className="board-music-title">Subtítulos</span>
          <span className="board-music-summary">{captionsSummary(spec)}</span>
        </summary>
        <div className="board-music-body">
          {hf ? (
            <>
              <p className="muted" data-testid="hf-captions-note">Este formato trae sus propios subtítulos dentro de la animación; no se les pone estilo ni se superponen otros.</p>
              <Segmented
                label="Video principal"
                value={spec.captions?.enabled === false ? "sin" : "con"}
                options={[
                  { value: "con", label: "Con subtítulos" },
                  { value: "sin", label: "Sin subtítulos" },
                ]}
                onChange={(v) => update({ ...spec, captions: { enabled: v === "con" } })}
              />
              <p className="length-note">Siempre se entregan los dos archivos (video.mp4 y video-sin-subtitulos.mp4).</p>
            </>
          ) : (
          <CaptionPanel
            captions={spec.captions}
            style={isCaptionStyle(spec.theme?.captionStyle) ? spec.theme.captionStyle : "hormozi"}
            reelsSubtitles={normReelsSubtitles(spec.reels?.subtitles)}
            palette={spec.theme?.palette ?? FALLBACK_PALETTE}
            templateId={spec.template}
            disabled={state !== "idle"}
            onChange={(c) => update(applyCaptions(spec, c))}
          />
          )}
        </div>
      </details>

      <ol className="strip">
        {spec.scenes.map((scene, i) => (
          <li key={scene.id} className="scene">
            <Frame size="md" gradient={bg} className="scene-frame">
              <span className="scene-index">{String(i + 1).padStart(2, "0")}</span>
              {isDrawn(scene) && (
                <span className="scene-illus" aria-hidden="true">
                  {scene.title?.kicker && <span className="scene-illus-kicker">{scene.title.kicker}</span>}
                  {scene.title?.main && <span className="scene-illus-main">{scene.title.main}</span>}
                  <span className="scene-illus-elements">
                    {drawnParts(scene).map((el, k) => (
                      <span key={k} className="scene-illus-chip">
                        {el.type}
                      </span>
                    ))}
                  </span>
                </span>
              )}
              {scene.visual.type === "emoji" && scene.visual.emoji && (
                <span className="frame-emoji" aria-hidden="true">
                  {scene.visual.emoji}
                </span>
              )}
              {scene.onScreenText && <span className={hf ? "frame-caption" : `frame-caption caption-${spec.theme?.captionStyle ?? "clean"}`}>{scene.onScreenText}</span>}
              <span className="scene-time">{estimateSeconds(scene).toFixed(1)}s</span>
            </Frame>
            <div className="scene-fields">
              <label className="field">
                <span className="field-label">Narración</span>
                <textarea
                  className="input"
                  rows={3}
                  value={scene.narration}
                  onChange={(e) => updateScene(i, { narration: e.target.value })}
                />
              </label>
              {scene.title && (
                <div className="field-row">
                  <label className="field">
                    <span className="field-label">Antetítulo</span>
                    <input
                      className="input"
                      value={scene.title.kicker ?? ""}
                      onChange={(e) => updateScene(i, { title: { ...scene.title, kicker: e.target.value } })}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Título</span>
                    <input
                      className="input"
                      value={scene.title.main ?? ""}
                      onChange={(e) => updateScene(i, { title: { ...scene.title, main: e.target.value } })}
                    />
                  </label>
                </div>
              )}
              <label className="field">
                <span className="field-label">Texto en pantalla</span>
                <input
                  className="input"
                  value={scene.onScreenText ?? ""}
                  onChange={(e) => updateScene(i, { onScreenText: e.target.value })}
                />
              </label>
              {isDrawn(scene) ? (
                <p className="field-note">
                  {scene.visual.type === "scene3d" ? "Escena 3D" : "Ilustración"} con {drawnParts(scene).length} {scene.visual.type === "scene3d" ? "objetos" : "elementos dibujados"}:{" "}
                  {drawnParts(scene).map((el) => el.type).join(", ") || "ninguno"}.
                </p>
              ) : (
              <div className="field-row">
                <label className="field">
                  <span className="field-label">Visual</span>
                  <select
                    className="input"
                    value={scene.visual.type}
                    onChange={(e) => updateScene(i, { visual: { ...scene.visual, type: e.target.value as VisualType } })}
                  >
                    {VISUALS.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">{scene.visual.type === "emoji" ? "Emoji" : "Búsqueda / prompt"}</span>
                  <input
                    className="input"
                    value={(scene.visual.type === "emoji" ? scene.visual.emoji : scene.visual.query ?? scene.visual.prompt) ?? ""}
                    onChange={(e) =>
                      updateScene(i, {
                        visual:
                          scene.visual.type === "emoji"
                            ? { ...scene.visual, emoji: e.target.value }
                            : { ...scene.visual, query: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
              )}
              <button type="button" className="btn btn-text btn-sm" onClick={() => removeScene(i)} disabled={spec.scenes.length <= 1}>
                Quitar escena
              </button>
            </div>
          </li>
        ))}
        <li className="scene scene-add">
          <button type="button" className="add-scene" onClick={addScene}>
            <span aria-hidden="true">+</span> Añadir escena
          </button>
        </li>
      </ol>
    </div>
  );
}
