// Controls of a HyperFrames format (pixel-world, flat-2d, ...): scene mode, style (with palette swatch), setting,
// render quality and an "Avanzado" accordion. Everything comes from the format's registry data (`TemplateInfo`).
import type { TemplateInfo } from "../../shared/types.ts";
import {
  HF_CAMERAS,
  HF_CAMERA_LABEL,
  HF_CTAS,
  HF_CTA_LABEL,
  HF_MAX_VARIANTS,
  HF_MODE_CHOICES,
  HF_PACES,
  HF_PACE_LABEL,
  HF_PIXEL_CHOICES,
  HF_PIXEL_DRAFT_NOTE,
  HF_PIXEL_FORMAT,
  HF_QUALITY_CHOICES,
  hfModesOf,
  type HfOptions,
} from "../../shared/hf.ts";
import { Segmented } from "./Segmented.tsx";

const AUTO = "";

export function HfPanel(props: { template: TemplateInfo; value: HfOptions; onChange: (patch: Partial<HfOptions>) => void; disabled?: boolean }) {
  const { template: t, value: v, disabled } = props;
  const modes = HF_MODE_CHOICES.filter((m) => hfModesOf(t).includes(m.value));
  const style = t.styles?.find((s) => s.id === v.style);
  const setting = t.settings?.find((s) => s.id === v.setting);
  const unset = <K extends keyof HfOptions>(k: K) => props.onChange({ [k]: undefined } as Partial<HfOptions>);
  return (
    <div className="hf-panel panel" data-testid="hf-panel">
      <Segmented label="Escenas" value={v.mode} options={modes.map(({ value, label }) => ({ value, label }))} onChange={(mode) => props.onChange({ mode })} />
      <p className="length-note" data-testid="hf-mode-hint">{HF_MODE_CHOICES.find((m) => m.value === v.mode)?.hint}</p>

      {t.styles && t.styles.length > 0 && (
        <label className="field">
          <span className="field-label">Estilo</span>
          <span className="hf-style-row">
            {style?.palette && (
              <span className="swatches swatches-inline" aria-hidden="true" data-testid="hf-swatch">
                {style.palette.slice(0, 5).map((c, i) => (
                  <span key={i} style={{ background: c }} />
                ))}
              </span>
            )}
            <select className="input" value={v.style ?? ""} disabled={disabled} onChange={(e) => props.onChange({ style: e.target.value })}>
              {t.styles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </span>
          {style?.about && <span className="muted hf-about">{style.about}</span>}
        </label>
      )}

      {t.settings && t.settings.length > 0 && (
        <label className="field">
          <span className="field-label">Escenario</span>
          <select className="input" value={v.setting ?? AUTO} disabled={disabled} onChange={(e) => (e.target.value ? props.onChange({ setting: e.target.value }) : unset("setting"))}>
            <option value={AUTO}>Que lo elija el agente</option>
            {t.settings.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {setting?.about && <span className="muted hf-about">{setting.about}</span>}
        </label>
      )}

      {t.id === HF_PIXEL_FORMAT && t.mascots && t.mascots.length > 0 && (
        <label className="field">
          <span className="field-label">Mascota</span>
          <select className="input" data-testid="hf-mascot" value={v.mascot ?? AUTO} disabled={disabled} onChange={(e) => (e.target.value ? props.onChange({ mascot: e.target.value }) : unset("mascot"))}>
            <option value={AUTO}>Por defecto{t.defaultMascot ? ` (${t.mascots.find((m) => m.id === t.defaultMascot)?.name ?? t.defaultMascot})` : ""}</option>
            {t.mascots.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <span className="muted hf-about">{(t.mascots.find((m) => m.id === (v.mascot ?? t.defaultMascot)) ?? t.mascots[0]).about}</span>
        </label>
      )}

      <Segmented label="Calidad del render" value={v.quality} options={HF_QUALITY_CHOICES.map(({ value, label }) => ({ value, label }))} onChange={(quality) => props.onChange({ quality })} />
      <p className="length-note">{HF_QUALITY_CHOICES.find((q) => q.value === v.quality)?.hint}</p>

      {t.id === HF_PIXEL_FORMAT && (
        <>
          <Segmented label="Calidad de píxel" value={v.pixelScale ?? "standard"} options={HF_PIXEL_CHOICES.map(({ value, label }) => ({ value, label }))} onChange={(pixelScale) => props.onChange({ pixelScale })} />
          <p className="length-note" data-testid="hf-pixel-hint">{HF_PIXEL_CHOICES.find((p) => p.value === (v.pixelScale ?? "standard"))?.hint}</p>
          {v.quality === "draft" && (v.pixelScale ?? "standard") !== "standard" && <p className="length-note" data-testid="hf-pixel-draft">{HF_PIXEL_DRAFT_NOTE}</p>}
        </>
      )}

      <details className="hf-advanced">
        <summary>Avanzado</summary>
        <div className="hf-advanced-body">
          <Segmented
            label="Ritmo"
            value={v.pace ?? AUTO}
            options={[{ value: AUTO, label: "Auto" }, ...HF_PACES.map((value) => ({ value, label: HF_PACE_LABEL[value] }))]}
            onChange={(p) => (p ? props.onChange({ pace: p }) : unset("pace"))}
          />
          <Segmented
            label="Cámara"
            value={v.camera ?? AUTO}
            options={[{ value: AUTO, label: "Auto" }, ...HF_CAMERAS.map((value) => ({ value, label: HF_CAMERA_LABEL[value] }))]}
            onChange={(c) => (c ? props.onChange({ camera: c }) : unset("camera"))}
          />
          <label className="check">
            <input type="checkbox" checked={Boolean(v.brandPill)} disabled={disabled} onChange={(e) => props.onChange({ brandPill: e.target.checked || undefined })} />
            <span>Mostrar la marca (avatar y usuario)</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={Boolean(v.followClick)} disabled={disabled} onChange={(e) => props.onChange({ followClick: e.target.checked || undefined })} />
            <span>Cerrar con el clic de seguir</span>
          </label>
          <Segmented
            label="Llamado a la acción"
            value={v.cta ?? AUTO}
            options={[{ value: AUTO, label: "Auto" }, ...HF_CTAS.map((value) => ({ value, label: HF_CTA_LABEL[value] }))]}
            onChange={(c) => (c ? props.onChange({ cta: c }) : unset("cta"))}
          />
          <Segmented
            label="Variantes"
            value={v.variants ?? 1}
            options={Array.from({ length: HF_MAX_VARIANTS }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
            onChange={(n) => props.onChange({ variants: n > 1 ? n : undefined })}
          />
        </div>
      </details>
    </div>
  );
}
