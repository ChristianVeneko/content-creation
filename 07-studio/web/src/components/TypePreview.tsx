import type { Palette } from "../../shared/types.ts";
import { paletteVars } from "../lib/palette.ts";

/**
 * Typographic stand-in for a template without a rendered thumbnail: the template's sample line set
 * in its own palette (recolors live through CSS variables). No emoji by design.
 */
export function TypePreview(props: { sample?: string; name: string; palette: Palette }) {
  const words = (props.sample || props.name).toUpperCase().split(/\s+/).slice(0, 5);
  return (
    <div className="type-preview" style={paletteVars(props.palette)} aria-hidden="true">
      <span className="type-preview-kicker">{props.name}</span>
      <span className="type-preview-main">
        {words.map((w, i) => (
          <span key={i} className={i === 1 ? "is-accent" : undefined}>
            {w}{" "}
          </span>
        ))}
      </span>
      <span className="type-preview-bar" />
    </div>
  );
}
