// Palette step: the template's own palette ("Original"), the curated presets, and a custom editor.
// The preview recolors live through CSS variables; the chosen palette is written to spec.theme.palette.
import { useId, useState } from "react";
import type { Palette, PalettePreset, TemplateInfo } from "../../shared/types.ts";
import { MIN_CONTRAST, type PaletteChoice, contrastBadges, isHexColor, paletteVars, resolveChoice, templatePalette } from "../lib/palette.ts";
import { TemplateThumb } from "./TemplateCard.tsx";

const TAGS: { id: string; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "dark", label: "Oscuras" },
  { id: "light", label: "Claras" },
  { id: "warm", label: "Cálidas" },
  { id: "cool", label: "Frías" },
  { id: "neon", label: "Neón" },
  { id: "pastel", label: "Pastel" },
  { id: "earthy", label: "Tierra" },
  { id: "brand-like", label: "De marca" },
];

const CUSTOM_FIELDS: { key: "bg0" | "bg1" | "text" | "accent" | "accent2"; label: string }[] = [
  { key: "bg0", label: "Fondo arriba" },
  { key: "bg1", label: "Fondo abajo" },
  { key: "text", label: "Texto" },
  { key: "accent", label: "Acento" },
  { key: "accent2", label: "Acento 2" },
];

function Swatches({ p }: { p: Palette }) {
  return (
    <span className="swatches" aria-hidden="true">
      {[p.bg[0], p.bg[1] ?? p.bg[0], p.text, p.accent, p.accent2 ?? p.accent].map((c, i) => (
        <span key={i} style={{ background: c }} />
      ))}
    </span>
  );
}

/** Small marker on palettes whose text or accent falls under the minimum contrast. */
function LowContrast({ p }: { p: Palette }) {
  if (contrastBadges(p).every((b) => b.ok)) return null;
  return (
    <span className="pal-warn" title={`Contraste bajo (mínimo ${MIN_CONTRAST}:1)`}>
      <span aria-hidden="true">!</span>
      <span className="visually-hidden">Contraste bajo</span>
    </span>
  );
}

/** A 9:16 mock drawn only from the palette variables: the live recolor preview. */
export function PalettePreview({ template, palette }: { template: TemplateInfo | undefined; palette: Palette }) {
  const sample = (template?.sampleText || template?.name || "Tu video").toUpperCase();
  const [first, ...rest] = sample.split(/\s+/);
  return (
    <div className="pal-preview" style={paletteVars(palette)} aria-label="Vista previa de la paleta" role="img">
      <span className="pal-kicker">{template?.name ?? "Plantilla"}</span>
      <span className="pal-main">
        {first} <span className="pal-accent">{rest.join(" ")}</span>
      </span>
      <span className="pal-bars" aria-hidden="true">
        <span style={{ height: "46%" }} />
        <span style={{ height: "72%" }} />
        <span style={{ height: "58%" }} />
        <span style={{ height: "92%" }} />
      </span>
      <span className="pal-chips" aria-hidden="true">
        <span className="pal-chip a1">dato</span>
        <span className="pal-chip a2">idea</span>
        <span className="pal-chip a3">paso</span>
      </span>
      <span className="pal-caption">
        así se <span className="pal-accent">leerá</span>
      </span>
    </div>
  );
}

export function PalettePicker(props: {
  template: TemplateInfo | undefined;
  presets: PalettePreset[] | null;
  presetsError?: string | null;
  choice: PaletteChoice;
  onChange: (c: PaletteChoice) => void;
}) {
  const [tag, setTag] = useState("all");
  const name = useId();
  const resolved = resolveChoice(props.choice, props.presets, props.template);
  const original = templatePalette(props.template);
  const custom: Palette = props.choice.kind === "custom" ? props.choice.palette : { ...resolved.preview, bg: [resolved.preview.bg[0], resolved.preview.bg[1] ?? resolved.preview.bg[0]] };
  const badges = contrastBadges(resolved.preview);
  const lowContrast = badges.some((b) => !b.ok);
  const visible = props.presets?.filter((p) => tag === "all" || p.tags.includes(tag)) ?? [];

  function setCustom(key: (typeof CUSTOM_FIELDS)[number]["key"], value: string) {
    if (!isHexColor(value)) return;
    const next: Palette = { ...custom, bg: [...custom.bg] };
    if (key === "bg0") next.bg[0] = value;
    else if (key === "bg1") next.bg[1] = value;
    else next[key] = value;
    props.onChange({ kind: "custom", palette: next });
  }
  const customValue = (key: (typeof CUSTOM_FIELDS)[number]["key"]) =>
    key === "bg0" ? custom.bg[0] : key === "bg1" ? custom.bg[1] ?? custom.bg[0] : key === "accent2" ? custom.accent2 ?? custom.accent : custom[key];

  return (
    <div className="palette-step">
      <div className="palette-stage">
        <PalettePreview template={props.template} palette={resolved.preview} />
        <div className="palette-stage-meta">
          <p className="palette-current">
            <span className="muted">Paleta</span> {resolved.label}
          </p>
          <ul className="contrast-badges" aria-label="Contraste de la paleta">
            {badges.map((b) => (
              <li key={b.id} className={b.ok ? "contrast ok" : "contrast warn"}>
                {b.label}
                {b.ok ? " · bien" : " · bajo"}
              </li>
            ))}
          </ul>
          <p className={lowContrast ? "contrast warn" : "contrast ok"} role={lowContrast ? "alert" : undefined}>
            {lowContrast
              ? `Contraste por debajo de ${MIN_CONTRAST}:1: el texto o el acento costarán de leer. Prueba otra paleta o ajusta los colores.`
              : "Buen contraste: se leerá bien sobre el fondo."}
          </p>
          {props.template && (
            <figure className="palette-original">
              <span className="palette-original-frame">
                <TemplateThumb template={props.template} />
              </span>
              <figcaption className="muted">Render original del formato</figcaption>
            </figure>
          )}
        </div>
      </div>

      <div className="palette-choices">
        <div className="pal-list" role="radiogroup" aria-label="Paletas">
          <label className="pal-option pal-option-original">
            <input type="radio" name={name} checked={props.choice.kind === "original"} onChange={() => props.onChange({ kind: "original" })} />
            <Swatches p={original} />
            <span className="pal-name">Original</span>
            <span className="pal-desc">La del formato</span>
            <LowContrast p={original} />
          </label>
        </div>

        <div className="gallery-filters pal-tags" role="group" aria-label="Filtrar paletas">
          {TAGS.map((t) => (
            <button key={t.id} type="button" className="gfilter" aria-pressed={tag === t.id} onClick={() => setTag(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        {props.presetsError && (
          <p className="notice notice-error" role="alert">
            No pude cargar las paletas. {props.presetsError}
          </p>
        )}
        {!props.presets && !props.presetsError && <div className="loading-line" aria-busy="true" aria-label="Cargando paletas" />}
        <div className="pal-list pal-grid" role="radiogroup" aria-label="Paletas curadas">
          {visible.map((p) => (
            <label key={p.id} className="pal-option" title={p.description}>
              <input
                type="radio"
                name={name}
                checked={props.choice.kind === "preset" && props.choice.id === p.id}
                onChange={() => props.onChange({ kind: "preset", id: p.id })}
              />
              <Swatches p={p.palette} />
              <span className="pal-name">{p.name}</span>
              <LowContrast p={p.palette} />
            </label>
          ))}
        </div>

        <fieldset className="field pal-custom">
          <legend className="field-label">Personalizada</legend>
          <div className="pal-custom-grid">
            {CUSTOM_FIELDS.map((f) => (
              <label key={f.key} className="pal-color">
                <input type="color" value={customValue(f.key)} onChange={(e) => setCustom(f.key, e.target.value.toUpperCase())} />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
          <p className="muted">Parte de la paleta elegida; cualquier cambio la convierte en personalizada.</p>
        </fieldset>
      </div>
    </div>
  );
}
