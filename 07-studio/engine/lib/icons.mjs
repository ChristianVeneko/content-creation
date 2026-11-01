// Phosphor icons (MIT, @phosphor-icons/core): read the raw duotone SVGs at build time and pass their paths
// to the renderer, so icons can be drawn on stroke by stroke and then filled.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ENGINE_ROOT } from "./env.mjs";

const DIR = join(ENGINE_ROOT, "node_modules", "@phosphor-icons", "core", "assets", "duotone");
export const FALLBACK_ICON = "sparkle";

const normalize = (name) => String(name).trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/-duotone$/, "");

/** Every icon name referenced by the spec's illustrated scenes (elements, flow nodes, compare sides, badges). */
export function collectIconNames(spec) {
  const names = new Set();
  const visit = (v) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (!v || typeof v !== "object") return;
    if (v.type === "icon" && v.name) names.add(normalize(v.name));
    if (typeof v.icon === "string") names.add(normalize(v.icon));
    if (v.type === "compare" && v.winner) names.add("trophy");
    Object.values(v).forEach(visit);
  };
  for (const s of spec.scenes) if (s.visual?.type === "illustration") visit(s.visual.elements);
  return [...names];
}

/** Parse one duotone SVG: the faint background shape (opacity 0.2) and the outline shape. */
export function parseIconSvg(svg) {
  const paths = [...svg.matchAll(/<path\s+([^>]*?)\/?>/g)].map((m) => {
    const d = /\sd="([^"]+)"|^d="([^"]+)"/.exec(" " + m[1]);
    return { d: d ? d[1] || d[2] : "", faint: /opacity="0?\.2"/.test(m[1]) };
  });
  return { viewBox: /viewBox="([^"]+)"/.exec(svg)?.[1] ?? "0 0 256 256", back: paths.filter((p) => p.faint).map((p) => p.d), outline: paths.filter((p) => !p.faint).map((p) => p.d) };
}

/**
 * Load icons by name. Unknown names map to the fallback icon and are reported in `missing`.
 * @returns {{icons: Record<string, {viewBox: string, back: string[], outline: string[]}>, missing: string[]}}
 */
export function loadIcons(names, dir = DIR) {
  const icons = {};
  const missing = [];
  const read = (n) => {
    const f = join(dir, `${n}-duotone.svg`);
    return existsSync(f) ? parseIconSvg(readFileSync(f, "utf8")) : null;
  };
  const fallback = read(FALLBACK_ICON);
  for (const raw of names) {
    const n = normalize(raw);
    const icon = read(n);
    if (!icon) missing.push(n);
    icons[n] = icon ?? fallback;
  }
  return { icons, missing };
}

export const iconKey = normalize;
