// Format helpers for the wizard: templates are VIDEO FORMATS (how it looks and how it moves), grouped by family.
// Pure functions; the registry (engine `templates`) stays the single source of truth for what exists.
import type { TemplateInfo } from "../../shared/types.ts";

export type FamilyId = "explainer" | "data" | "story" | "ranking" | "product" | "pixel" | "3d";

export const FAMILIES: { id: FamilyId; label: string; hint: string }[] = [
  { id: "explainer", label: "Explicativo / tutorial", hint: "Explica paso a paso, con ejemplos claros" },
  { id: "data", label: "Datos y gráficas", hint: "Cifras, comparativas y tendencias" },
  { id: "story", label: "Historia / cinematográfico", hint: "Narrativa con atmósfera y ritmo" },
  { id: "ranking", label: "Ranking / versus", hint: "Listas, rondas y duelos" },
  { id: "product", label: "Producto / escaparate", hint: "Lanzamientos, funciones y marca" },
  { id: "pixel", label: "Pixel / arcade", hint: "Retro, juegos y marcadores" },
  { id: "3d", label: "Mundos 3D (solo estilo)", hint: "Cámara, luz y movimiento; los modelos los crea el agente" },
];

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const hayOf = (t: TemplateInfo) => fold([t.id, t.format ?? "", t.name, t.description, ...(t.bestFor ?? [])].join(" "));
const slugOf = (t: TemplateInfo) => fold(`${t.id} ${t.format ?? ""}`);

/** The family a template belongs to: category first (pixel, 3D), then keywords of its format and best-for lines. */
export function formatFamily(t: TemplateInfo): FamilyId {
  if (t.category === "pixel" || /pixel|arcade/.test(slugOf(t))) return "pixel";
  if (t.category === "3d") return "3d";
  const slug = slugOf(t);
  const hay = hayOf(t);
  if (/rank|versus|round|countdown/.test(slug) || /\b(top n|rankings?|versus)\b/.test(hay)) return "ranking";
  if (/chart|data|stat|stage|broadcast/.test(slug) || /\b(statistics|market data|benchmarks|analytics)\b/.test(hay)) return "data";
  if (/story|narrative|cinematic|monolith|letterbox|watercolor|ukiyo/.test(slug) || /\b(storytelling|storytime|cinematic|stories)\b/.test(hay)) return "story";
  if (/product|showcase|glass|ui-cards|gradient|pedestal/.test(slug) || /\b(product|launch(es)?|features?)\b/.test(hay)) return "product";
  return "explainer";
}

/** Chips for the family filter: "all" first, then only the families present, in catalog order. */
export function familyCounts(list: TemplateInfo[]): { id: FamilyId | "all"; label: string; count: number }[] {
  const counts = new Map<FamilyId, number>();
  for (const t of list) counts.set(formatFamily(t), (counts.get(formatFamily(t)) ?? 0) + 1);
  return [
    { id: "all", label: "Todos", count: list.length },
    ...FAMILIES.filter((f) => counts.has(f.id)).map((f) => ({ id: f.id, label: f.label, count: counts.get(f.id) ?? 0 })),
  ];
}

/** One short line about how the format looks and moves: the first sentence of its description. */
export function lookLine(t: TemplateInfo, max = 100): string {
  const text = t.description.trim();
  if (!text) return "";
  const first = text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;
  return first.length <= max ? first : `${first.slice(0, max - 1).trimEnd()}…`;
}

export function matchesFormatQuery(t: TemplateInfo, q: string): boolean {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = `${hayOf(t)} ${fold(t.category ?? "")}`;
  return words.every((w) => hay.includes(w));
}

/** Recommended ids first, in the recommendation's order; the rest keep registry order. */
export function rankTemplates(list: TemplateInfo[], recommended: string[]): TemplateInfo[] {
  const rank = (t: TemplateInfo) => (recommended.includes(t.id) ? recommended.indexOf(t.id) : recommended.length);
  return [...list].sort((a, b) => rank(a) - rank(b));
}
