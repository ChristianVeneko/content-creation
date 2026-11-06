// Format gallery: family chips, search and cards grouped by family (how it looks and moves), previewing the real render.
// Everything comes from the engine registry; nothing here lists template ids.
import { useId, useMemo, useState } from "react";
import type { TemplateInfo } from "../../shared/types.ts";
import { FAMILIES, familyCounts, formatFamily, matchesFormatQuery, rankTemplates } from "../lib/formats.ts";
import { TemplateCard } from "./TemplateCard.tsx";

export const matchesQuery = matchesFormatQuery;

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

  const chips = useMemo(() => familyCounts(props.templates), [props.templates]);

  const shown = useMemo(
    () => rankTemplates(props.templates.filter((t) => (filter === "all" || formatFamily(t) === filter) && matchesFormatQuery(t, query)), rec),
    [props.templates, filter, query, rec],
  );

  // Without a filter or search the formats are grouped by family; otherwise one flat, ranked grid.
  const sections = useMemo(() => {
    if (filter !== "all" || query.trim()) return [{ id: "flat", label: "", hint: "", items: shown }];
    const recommendedItems = shown.filter((t) => rec.includes(t.id));
    const rest = shown.filter((t) => !rec.includes(t.id));
    const out: { id: string; label: string; hint: string; items: TemplateInfo[] }[] = [];
    if (recommendedItems.length > 0) out.push({ id: "rec", label: `Recomendadas para ${props.recommendedFor ?? "tu temática"}`, hint: "", items: recommendedItems });
    for (const f of FAMILIES) {
      const items = rest.filter((t) => formatFamily(t) === f.id);
      if (items.length > 0) out.push({ id: f.id, label: f.label, hint: f.hint, items });
    }
    return out;
  }, [shown, filter, query, rec, props.recommendedFor]);

  return (
    <div className="gallery">
      <div className="gallery-tools">
        <div className="gallery-filters" role="group" aria-label="Filtrar por familia">
          {chips.map((f) => (
            <button key={f.id} type="button" className="gfilter" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
              <span className="gfilter-count">{f.count}</span>
            </button>
          ))}
        </div>
        <label className="gallery-search" htmlFor={searchId}>
          <span className="visually-hidden">Buscar formato</span>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            id={searchId}
            type="search"
            placeholder="Buscar: tutorial, datos, ranking, 3D…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
          />
        </label>
      </div>
      {shown.length === 0 ? (
        <div className="gallery-empty">
          <p>Ningún formato coincide{query ? ` con “${query}”` : ""}.</p>
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
        <div className="gallery-sections" role="radiogroup" aria-label="Formatos">
          {sections.map((sec) => (
            <section key={sec.id} className="gallery-section">
              {sec.label && (
                <header className="gallery-section-head">
                  <h2>{sec.label}</h2>
                  {sec.hint && <p className="muted">{sec.hint}</p>}
                </header>
              )}
              <div className="gallery-grid">
                {sec.items.map((t) => (
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
