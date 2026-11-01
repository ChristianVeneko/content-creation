// "Subtítulos" controls shared by Create (options), the storyboard and the channel defaults: a live style
// gallery drawn in the palette's caption colors, size, position, casing, words per page and colors
// ("Auto (paleta)" or custom pickers). Reels templates get their subtitle mode instead of the style gallery;
// pixel templates start with captions off.
import { type CSSProperties, useId } from "react";
import type { Palette } from "../../shared/types.ts";
import {
  CAPTION_STYLES,
  STYLE_DEFAULT_POSITION,
  type CaptionColorKey,
  type CaptionPanelState,
  type CaptionPosition,
  type CaptionSettings,
  type CaptionSize,
  type CaptionStyle,
  type ReelsSubtitleMode,
  autoCaptionColors,
  captionKind,
  captionsFromPanel,
  panelFromCaptions,
  resetCaptionColors,
} from "../../shared/captions.ts";
import { paletteVars } from "../lib/palette.ts";
import { Segmented } from "./Segmented.tsx";

export const CAPTION_LABEL: Record<CaptionStyle, string> = {
  hormozi: "Impacto",
  clean: "Limpio",
  boxed: "Caja",
  pills: "Píldoras",
  chips: "Fichas",
  "two-tone": "Dos tonos",
  karaoke: "Karaoke",
  punch: "Golpe",
  typewriter: "Máquina",
  dialog: "Diálogo",
  neon: "Neón",
  underline: "Subrayado",
  minimal: "Mínimo",
  pixel: "Píxel",
};

const REELS_LABEL: Record<ReelsSubtitleMode, string> = { linea: "Línea", bloque: "Bloque", no: "Sin subtítulos" };
const SIZE_SCALE: Record<CaptionSize, number> = { s: 0.8, m: 1, l: 1.2, xl: 1.4 };
/** Band centers and heights in % of the 1080x1920 frame (engine CAPTION_BANDS). */
const BAND: Record<CaptionPosition, { top: number; height: number }> = {
  top: { top: 12, height: 13 },
  upper: { top: 21.9, height: 14.6 },
  center: { top: 42.7, height: 14.6 },
  lower: { top: 58.9, height: 13.5 },
  bottom: { top: 65.1, height: 7.8 },
};
const COLOR_LABEL: Record<CaptionColorKey, string> = { text: "Texto", highlight: "Palabra activa", box: "Caja", outline: "Contorno" };
const SAMPLE = ["Esto", "lo", "cambia"];

export interface CaptionPanelChange {
  captions: CaptionSettings;
  /** The chosen style (null: pick per video, channel defaults only). */
  style: CaptionStyle | null;
  reelsSubtitles: ReelsSubtitleMode | null;
}

function capVars(colors: CaptionPanelState["colors"], scale = 1): CSSProperties {
  return { "--cap-text": colors.text, "--cap-hl": colors.highlight, "--cap-box": colors.box, "--cap-outline": colors.outline, "--cap-scale": scale } as CSSProperties;
}

/** One caption sample: three words, the active one cycling (CSS only). */
export function CaptionSample({ style, casing = "auto", speaker }: { style: CaptionStyle; casing?: CaptionPanelState["casing"]; speaker?: string }) {
  return (
    <span className={`cap cap-${style}`} data-case={casing} aria-hidden="true">
      {style === "dialog" && <span className="cap-speaker">{speaker || "Ana"}</span>}
      <span className="cap-line">
        {SAMPLE.map((w, i) => (
          <span key={w} className="cap-w" style={{ "--i": i } as CSSProperties}>
            {w}
          </span>
        ))}
      </span>
    </span>
  );
}

export function CaptionPanel(props: {
  captions: CaptionSettings | undefined;
  /** Style used when `captions.style` is unset (theme.captionStyle / the generate option / channel default). */
  style: CaptionStyle | null | undefined;
  reelsSubtitles?: ReelsSubtitleMode | null;
  palette: Palette;
  templateId?: string;
  /** Channel defaults: smaller cards and a "pick per video" style. */
  compact?: boolean;
  disabled?: boolean;
  onChange: (next: CaptionPanelChange) => void;
}) {
  const uid = useId();
  const { palette, compact = false, disabled = false } = props;
  const kind = captionKind(props.templateId);
  const state = panelFromCaptions(props.captions, { palette, style: props.style });
  const auto = autoCaptionColors(palette);
  const reelsMode: ReelsSubtitleMode = props.reelsSubtitles ?? (props.captions?.enabled === false ? "no" : "linea");

  const emit = (next: CaptionPanelState, extra: Partial<CaptionSettings> = {}, reelsSubtitles = props.reelsSubtitles ?? null) =>
    props.onChange({ captions: { ...captionsFromPanel(next, props.captions), ...extra }, style: next.style, reelsSubtitles });
  const set = <K extends keyof CaptionPanelState>(k: K, v: CaptionPanelState[K]) => emit({ ...state, [k]: v });

  const previewStyle: CaptionStyle = state.style ?? "hormozi";
  const position = state.position === "auto" ? (STYLE_DEFAULT_POSITION[previewStyle] ?? "lower") : state.position;
  const band = BAND[position];
  const colorKeys: CaptionColorKey[] = kind === "reels" ? ["text", "highlight"] : ["text", "highlight", "box", "outline"];
  const showStyles = kind !== "reels";
  const off = kind === "pixel" && state.enabled !== true;

  const colors = (
    <fieldset className="field cap-colors">
      <legend className="field-label">Colores</legend>
      <div className="segmented" role="radiogroup" aria-label="Colores de subtítulos">
        {[
          { v: "auto" as const, label: "Auto (paleta)" },
          { v: "custom" as const, label: "Personalizado" },
        ].map((o) => (
          <label key={o.v} className="segmented-item">
            <input type="radio" name={`${uid}-colors`} checked={state.colorMode === o.v} disabled={disabled} onChange={() => set("colorMode", o.v)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {state.colorMode === "auto" ? (
        <p className="field-note cap-auto-note">
          <span className="cap-swatches" aria-hidden="true">
            {colorKeys.map((k) => (
              <span key={k} style={{ background: auto[k] }} />
            ))}
          </span>
          Salen de la paleta del video y cambian con ella.
        </p>
      ) : (
        <div className="cap-pickers">
          {colorKeys.map((k) => (
            <label key={k} className="cap-picker">
              <input type="color" value={state.colors[k]} disabled={disabled} onChange={(e) => set("colors", { ...state.colors, [k]: e.target.value.toUpperCase() })} />
              <span>{COLOR_LABEL[k]}</span>
            </label>
          ))}
          <button type="button" className="btn btn-text btn-sm" disabled={disabled} onClick={() => emit(resetCaptionColors(state, palette))}>
            Restablecer
          </button>
        </div>
      )}
    </fieldset>
  );

  if (kind === "reels") {
    return (
      <div className="cap-panel" data-compact={compact || undefined} data-disabled={disabled || undefined}>
        <Segmented<ReelsSubtitleMode>
          label="Subtítulos del reel"
          value={reelsMode}
          options={(["linea", "bloque", "no"] as const).map((v) => ({ value: v, label: REELS_LABEL[v] }))}
          onChange={(v) => emit(v !== "no" && state.enabled === false ? { ...state, enabled: null } : state, {}, v)}
        />
        <p className="field-note">Línea: palabras clave en cajas. Bloque: tres líneas arriba a la izquierda. Las plantillas reels dibujan sus propios subtítulos.</p>
        {reelsMode !== "no" && colors}
      </div>
    );
  }

  return (
    <div className="cap-panel" data-compact={compact || undefined} data-disabled={disabled || undefined}>
      {kind === "pixel" && (
        <div className="cap-pixel-note">
          <p className="field-note">Las plantillas pixel no llevan subtítulos por defecto: el texto ya está en la escena.</p>
          <label className="cap-toggle">
            <input type="checkbox" checked={state.enabled === true} disabled={disabled} onChange={(e) => set("enabled", e.target.checked ? true : null)} />
            <span>Añadir subtítulos</span>
          </label>
        </div>
      )}

      {!off && (
        <>
          <div className="cap-top">
            {showStyles && (
              <fieldset className="field cap-gallery-field">
                <legend className="field-label">Estilo</legend>
                <div className="cap-gallery" role="radiogroup" style={paletteVars(palette)}>
                  {compact && (
                    <label className="cap-card cap-card-unset">
                      <input type="radio" name={`${uid}-style`} checked={state.style === null} disabled={disabled} onChange={() => set("style", null)} />
                      <span className="cap-card-stage">
                        <span className="cap-unset">Por video</span>
                      </span>
                      <span className="cap-card-name">Elegir en cada video</span>
                    </label>
                  )}
                  {CAPTION_STYLES.map((s) => (
                    <label key={s} className="cap-card">
                      <input type="radio" name={`${uid}-style`} checked={state.style === s} disabled={disabled} onChange={() => set("style", s)} />
                      <span className="cap-card-stage" style={capVars(state.colors)}>
                        <CaptionSample style={s} casing={state.casing} speaker={props.captions?.speaker} />
                      </span>
                      <span className="cap-card-name">{CAPTION_LABEL[s]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {!compact && (
              <figure className="cap-preview" style={paletteVars(palette)}>
                <span className="cap-preview-band" style={{ top: `${band.top}%`, height: `${band.height}%` }} aria-hidden="true" />
                <span className="cap-preview-text" style={{ ...capVars(state.colors, SIZE_SCALE[state.size]), top: `${band.top + band.height / 2}%` }}>
                  <CaptionSample style={previewStyle} casing={state.casing} speaker={props.captions?.speaker} />
                </span>
                <figcaption className="field-note">Vista previa aproximada</figcaption>
              </figure>
            )}
          </div>

          {state.style === "dialog" && (
            <label className="field">
              <span className="field-label">Nombre en la caja (opcional)</span>
              <input
                className="input"
                value={props.captions?.speaker ?? ""}
                maxLength={40}
                disabled={disabled}
                placeholder="Ana"
                onChange={(e) => {
                  const { speaker: _speaker, ...rest } = captionsFromPanel(state, props.captions);
                  const name = e.target.value;
                  props.onChange({ captions: name.trim() ? { ...rest, speaker: name } : rest, style: state.style, reelsSubtitles: props.reelsSubtitles ?? null });
                }}
              />
            </label>
          )}

          <div className="cap-controls">
            <Segmented<CaptionSize> label="Tamaño" value={state.size} options={(["s", "m", "l", "xl"] as const).map((v) => ({ value: v, label: v.toUpperCase() }))} onChange={(v) => set("size", v)} />
            <Segmented<CaptionPanelState["position"]>
              label="Posición"
              value={state.position}
              options={[
                { value: "auto", label: "Auto" },
                { value: "top", label: "Arriba" },
                { value: "upper", label: "Alta" },
                { value: "center", label: "Centro" },
                { value: "lower", label: "Baja" },
                { value: "bottom", label: "Abajo" },
              ]}
              onChange={(v) => set("position", v)}
            />
            <Segmented<CaptionPanelState["casing"]>
              label="Mayúsculas"
              value={state.casing}
              options={[
                { value: "auto", label: "Auto" },
                { value: "upper", label: "MAYÚSCULAS" },
                { value: "normal", label: "Normal" },
              ]}
              onChange={(v) => set("casing", v)}
            />
            <Segmented<number>
              label="Palabras por página"
              value={state.wordsPerPage ?? 0}
              options={[{ value: 0, label: "Auto" }, ...[1, 2, 3, 4, 5, 6, ...(state.wordsPerPage && state.wordsPerPage > 6 ? [state.wordsPerPage] : [])].map((n) => ({ value: n, label: String(n) }))]}
              onChange={(v) => set("wordsPerPage", v === 0 ? null : v)}
            />
          </div>
          {colors}
        </>
      )}
    </div>
  );
}
