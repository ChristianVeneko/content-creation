/**
 * Vector preview for the illustrated template: dark grid, a two-tone headline
 * and a small flow diagram that draws itself on hover. No emoji by design.
 */
export function IllustratedPreview(props: { sample?: string; accent?: string }) {
  const accent = props.accent ?? "#ff7a59";
  return (
    <svg className="illus-preview" viewBox="0 0 90 160" aria-hidden="true">
      <defs>
        <pattern id="illus-grid" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M8 0H0V8" fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="90" height="160" fill="#0b1020" />
      <rect width="90" height="160" fill="url(#illus-grid)" />
      <rect x="8" y="9" width="74" height="8" rx="2" fill="#141c33" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.5" />
      <rect x="11" y="11.5" width="12" height="3" rx="1" fill={accent} />
      <rect x="27" y="12.25" width="22" height="1.5" rx="0.75" fill="#7c8cff" />
      <rect x="54" y="12.25" width="24" height="1.5" rx="0.75" fill="#38d0ff" />
      <text x="45" y="30" textAnchor="middle" className="illus-kicker">
        CÓMO FUNCIONA
      </text>
      <text x="45" y="40" textAnchor="middle" className="illus-main" fill={accent}>
        {(props.sample ?? "SDD vs ODD").slice(0, 16)}
      </text>
      <g className="illus-draw" fill="none" stroke="#e8ecff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="14" y="56" width="26" height="18" rx="3" pathLength="1" />
        <rect x="50" y="56" width="26" height="18" rx="3" pathLength="1" />
        <path d="M40 65H50" pathLength="1" />
        <path d="M27 74V88" pathLength="1" />
        <rect x="14" y="88" width="62" height="20" rx="3" pathLength="1" />
        <path d="M20 95h22M20 101h34" pathLength="1" stroke={accent} />
        <path d="M60 97l3 3 6-7" pathLength="1" stroke="#4ade80" />
      </g>
      <g className="illus-pills">
        <rect x="18" y="124" width="16" height="7" rx="1.5" fill="#f4f6ff" />
        <rect x="36" y="124" width="18" height="7" rx="1.5" fill={accent} />
        <rect x="56" y="124" width="14" height="7" rx="1.5" fill="#f4f6ff" />
      </g>
    </svg>
  );
}
