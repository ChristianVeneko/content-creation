// Template gallery: category filter, search and a grid of cards that preview the real render.
// Everything comes from the engine registry; nothing here lists template ids.
import { useId, useMemo, useState } from "react";
import type { TemplateInfo } from "../../shared/types.ts";
import { TemplateCard } from "./TemplateCard.tsx";

const FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "illustrated-2d", label: "Ilustrado 2D" },
  { id: "reels-2d", label: "Reels" },
  { id: "3d", label: "3D" },
  { id: "kinetic", label: "Kinetic" },
];

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function matchesQuery(t: TemplateInfo, q: string): boolean {
  if (!q.trim()) return true;
  const hay = fold([t.id, t.name, t.description, t.category ?? "", ...(t.bestFor ?? [])].join(" "));
  return fold(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

export function TemplateGallery(props: {
  templates: TemplateInfo[];
  value: string;
  onChange: (id: string) => void;
  recommended?: string[];
  recommendedFor?: string;
  disabled?: boolean;
}) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const name = useId();
  const searchId = useId();
  const rec = props.recommended ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: props.templates.length };
    for (const t of props.templates) if (t.category) c[t.category] = (c[t.category] ?? 0) + 1;
    return c;
  }, [props.templates]);

  const shown = useMemo(() => {
    const list = props.templates.filter((t) => (filter === "all" || t.category === filter) && matchesQuery(t, query));
    // Recommended templates for the chosen topic first, in the topic's order; the rest keep registry order.
    const rank = (t: TemplateInfo) => (rec.includes(t.id) ? rec.indexOf(t.id) : rec.length);
    return [...list].sort((a, b) => rank(a) - rank(b));
  }, [props.templates, filter, query, rec]);

  return (
    <div className="gallery">
      <div className="gallery-tools">
        <div className="gallery-filters" role="group" aria-label="Filtrar por familia">
          {FILTERS.filter((f) => f.id === "all" || counts[f.id]).map((f) => (
            <button key={f.id} type="button" className="gfilter" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
              <span className="gfilter-count">{counts[f.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className="gallery-search" htmlFor={searchId}>
          <span className="visually-hidden">Buscar plantilla</span>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            id={searchId}
            type="search"
            placeholder="Buscar: pizarra, datos, código…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
          />
        </label>
      </div>
      {rec.length > 0 && props.recommendedFor && (
        <p className="gallery-note">
          Primero las recomendadas para <strong>{props.recommendedFor}</strong>. Puedes elegir cualquiera.
        </p>
      )}
      {shown.length === 0 ? (
        <div className="gallery-empty">
          <p>Ninguna plantilla coincide{query ? ` con “${query}”` : ""}.</p>
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Ver todas
          </button>
        </div>
      ) : (
        <div className="gallery-grid" role="radiogroup" aria-label="Plantillas">
          {shown.map((t) => (
            <TemplateCard
              key={t.id}
              name={name}
              template={t}
              checked={props.value === t.id}
              onSelect={() => props.onChange(t.id)}
              disabled={props.disabled}
              recommended={rec.includes(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
