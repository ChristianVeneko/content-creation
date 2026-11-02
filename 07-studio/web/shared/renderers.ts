// Render engines of a video (spec.theme.renderer). 2D formats always render with Remotion; 3D formats can also render
// with Blender (Eevee frames, slower and more cinematic). The engine validates the same rule (lib/blender-options.mjs).
import type { Renderer } from "./types.ts";

export const RENDERERS: Renderer[] = ["remotion", "blender"];
export const isRenderer = (v: unknown): v is Renderer => typeof v === "string" && (RENDERERS as string[]).includes(v);

/** A template drawn in 3D: the engine marks it style "three" (gallery category "3d"). */
export const is3dTemplate = (t?: { style?: string; category?: string } | null): boolean => Boolean(t && (t.style === "three" || t.category === "3d"));

export interface RendererChoice {
  value: Renderer;
  label: string;
  /** One line about time and quality (measured on a 3-scene, 8 s cut of a 3D format, 1080x1920 at 30 fps). */
  hint: string;
}

export const RENDERER_CHOICES: RendererChoice[] = [
  { value: "remotion", label: "Remotion (three.js)", hint: "Rápido: unos 2 minutos por video; luz y materiales de tiempo real." },
  { value: "blender", label: "Blender (Eevee)", hint: "Más cine: sombras y materiales suaves, pero tarda unos 0,3 s por fotograma (30 s son unos 5 minutos)." },
];

/** The renderer to write into the spec: only Blender is written (Remotion is the engine default, so it stays omitted). */
export const rendererForSpec = (r: Renderer | undefined, template?: { style?: string; category?: string } | null): Renderer | undefined => (r === "blender" && is3dTemplate(template) ? "blender" : undefined);
