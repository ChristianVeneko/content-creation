// The render-engine choice of a spec: `theme.renderer`. Pure (no Node built-ins): lib/spec.mjs imports it and the
// Remotion bundle reaches spec.mjs.
//   remotion  the spec-driven Remotion composition (three.js for the 3D templates); the default and the only choice for 2D.
//   blender   3D templates only: Eevee frames from 05-tools/bin/blender, captions and labels burned in with ffmpeg.
import { usesThreeKit } from "./scene3d.mjs";

export const RENDERERS = ["remotion", "blender"];
export const DEFAULT_RENDERER = "remotion";

/** Renderers a template can use. */
export const allowedRenderers = (templateId) => (usesThreeKit(templateId) ? [...RENDERERS] : [DEFAULT_RENDERER]);

/** Message for a renderer a template cannot use (or an unknown one), or null when it is fine. */
export function rendererIssue(templateId, renderer) {
  if (renderer === undefined || renderer === null) return null;
  const allowed = allowedRenderers(templateId);
  if (!RENDERERS.includes(renderer)) return `unknown renderer "${renderer}"; allowed renderers: ${RENDERERS.join(", ")}`;
  if (!allowed.includes(renderer)) return `renderer "${renderer}" is only for 3D templates; template "${templateId}" supports: ${allowed.join(", ")}`;
  return null;
}

/** The renderer a spec asks for (`theme.renderer`), `remotion` when it does not. */
export const rendererOf = (spec) => (RENDERERS.includes(spec?.theme?.renderer) ? spec.theme.renderer : DEFAULT_RENDERER);

/**
 * Pick the renderer for a build: an explicit override (the `--renderer` flag) wins over `theme.renderer`.
 * @returns {{renderer: string, error: string | null}}
 */
export function chooseRenderer(spec, override) {
  const renderer = override ?? rendererOf(spec);
  return { renderer, error: rendererIssue(spec?.template, renderer) };
}
