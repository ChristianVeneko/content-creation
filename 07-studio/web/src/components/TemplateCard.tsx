// One gallery card: the real rendered still (/thumbs/<id>.jpg) that plays its short muted loop
// (/thumbs/<id>.mp4) on hover or keyboard focus. Falls back to the vector/typographic preview when the
// generated files are missing.
import { useEffect, useRef, useState } from "react";
import type { Palette, TemplateInfo } from "../../shared/types.ts";
import { api } from "../lib/api.ts";
import { paletteVars, templatePalette } from "../lib/palette.ts";
import { IllustratedPreview } from "./IllustratedPreview.tsx";
import { ThreePreview } from "./ThreePreview.tsx";
import { lookLine } from "../lib/formats.ts";
import { TypePreview } from "./TypePreview.tsx";

export const CATEGORY_LABEL: Record<string, string> = {
  "illustrated-2d": "Ilustrado 2D",
  "reels-2d": "Reels",
  "3d": "3D",
  kinetic: "Kinetic",
};

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The template's preview without thumbnails: vector card for illustrated / 3D, typographic otherwise. */
export function FallbackPreview({ template, palette }: { template: TemplateInfo; palette?: Palette }) {
  const p = palette ?? templatePalette(template);
  if (template.style === "illustrated") return <IllustratedPreview sample={template.sampleText} accent={p.accent} />;
  if (template.style === "three") return <ThreePreview sample={template.sampleText} accent={p.accent} gradient={[...p.bg, p.accent2 ?? p.accent]} />;
  return <TypePreview sample={template.sampleText} name={template.name} palette={p} />;
}

/** Still + hover loop, or the fallback. `active` forces the loop (e.g. the selected card in a preview). */
export function TemplateThumb({ template, active = false, palette }: { template: TemplateInfo; active?: boolean; palette?: Palette }) {
  const [still, setStill] = useState<"loading" | "ok" | "missing">("loading");
  const [hasLoop, setHasLoop] = useState(true);
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const wantsLoop = active && still === "ok" && hasLoop && !reducedMotion();

  useEffect(() => {
    if (!wantsLoop) setPlaying(false);
  }, [wantsLoop]);

  if (still === "missing") return <FallbackPreview template={template} palette={palette} />;
  return (
    <>
      <img
        className="tthumb-still"
        src={api.thumbUrl(template.id, "jpg")}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setStill("ok")}
        onError={() => setStill("missing")}
      />
      {wantsLoop && (
        <video
          ref={video}
          className="tthumb-loop"
          data-playing={playing}
          src={api.thumbUrl(template.id, "mp4")}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          aria-hidden="true"
          onPlaying={() => setPlaying(true)}
          onError={() => setHasLoop(false)}
        />
      )}
      {still === "loading" && <span className="tthumb-shimmer" aria-hidden="true" />}
    </>
  );
}

export function TemplateCard(props: {
  template: TemplateInfo;
  checked: boolean;
  onSelect: () => void;
  name: string;
  disabled?: boolean;
  recommended?: boolean;
}) {
  const { template: t } = props;
  const [active, setActive] = useState(false);
  const category = t.category ? CATEGORY_LABEL[t.category] ?? t.category : null;
  const look = lookLine(t, 70);
  return (
    <label
      className="tcard"
      style={paletteVars(templatePalette(t))}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      <input type="radio" name={props.name} value={t.id} checked={props.checked} onChange={props.onSelect} disabled={props.disabled} />
      <span className="tcard-frame">
        <TemplateThumb template={t} active={active} />
        {props.recommended && <span className="tcard-flag">Recomendada</span>}
        <span className="tcard-check" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="12" height="12">
            <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
      <span className="tcard-meta">
        <span className="tcard-name">{t.name}</span>
        {category && <span className="tcard-cat">{category}</span>}
        {look && <span className="tcard-look">{look}</span>}
      </span>
    </label>
  );
}
