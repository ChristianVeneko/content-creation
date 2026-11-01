/**
 * Vector preview for the 3D templates: an isometric platform with shaded blocks
 * (three faces each) and the sample headline. Colors come from the template's
 * preview gradient and accent; the blocks float on hover. No emoji by design.
 */
export function ThreePreview(props: { sample?: string; accent?: string; gradient?: string[] }) {
  const accent = props.accent ?? "#ff7a59";
  const g = props.gradient ?? ["#0e1630", "#18264f", "#4cc9f0"];
  const bg = g[0];
  const light = isLight(bg);
  const second = g[2] ?? accent;
  const ink = light ? "#2b2433" : "#f4f6ff";
  return (
    <svg className="three-preview" viewBox="0 0 90 160" aria-hidden="true">
      <defs>
        <linearGradient id={`tp-bg-${bg.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={g[0]} />
          <stop offset="1" stopColor={g[1] ?? g[0]} />
        </linearGradient>
      </defs>
      <rect width="90" height="160" fill={`url(#tp-bg-${bg.slice(1)})`} />
      <text x="45" y="30" textAnchor="middle" className="three-kicker" fill={ink}>
        EN 3D
      </text>
      <text x="45" y="40" textAnchor="middle" className="three-main" fill={accent}>
        {(props.sample ?? "MUNDO 3D").slice(0, 14)}
      </text>
      {/* platform: an isometric slab (top + two sides) */}
      <path d="M45 72 L80 92 L45 112 L10 92 Z" fill={shade(second, light ? 0.55 : -0.35)} />
      <path d="M10 92 L45 112 L45 117 L10 97 Z" fill={shade(second, light ? 0.25 : -0.6)} />
      <path d="M45 112 L80 92 L80 97 L45 117 Z" fill={shade(second, light ? 0.05 : -0.7)} />
      <g className="three-blocks">
        <Block x={31} y={88} size={9} h={14} color={accent} />
        <Block x={56} y={86} size={8} h={22} color={second} />
        <Block x={44} y={99} size={7} h={9} color={shade(accent, 0.35)} />
      </g>
      <ellipse cx="45" cy="134" rx="18" ry="3" fill={light ? "rgba(43,36,51,0.12)" : "rgba(0,0,0,0.35)"} />
    </svg>
  );
}

/** One isometric block: top, left and right faces. (x, y) is the bottom-front corner. */
function Block(props: { x: number; y: number; size: number; h: number; color: string }) {
  const { x, y, size: s, h, color } = props;
  const top = `M${x} ${y - h} L${x + s} ${y - h - s * 0.58} L${x} ${y - h - s * 1.16} L${x - s} ${y - h - s * 0.58} Z`;
  const left = `M${x - s} ${y - s * 0.58} L${x} ${y} L${x} ${y - h} L${x - s} ${y - h - s * 0.58} Z`;
  const right = `M${x} ${y} L${x + s} ${y - s * 0.58} L${x + s} ${y - h - s * 0.58} L${x} ${y - h} Z`;
  return (
    <g>
      <path d={left} fill={shade(color, -0.18)} />
      <path d={right} fill={shade(color, -0.38)} />
      <path d={top} fill={shade(color, 0.12)} />
    </g>
  );
}

function rgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Lighten (k > 0, toward white) or darken (k < 0, toward black) a hex color. */
function shade(hex: string, k: number): string {
  const c = rgb(hex).map((v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function isLight(hex: string): boolean {
  const [r, g, b] = rgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
}
