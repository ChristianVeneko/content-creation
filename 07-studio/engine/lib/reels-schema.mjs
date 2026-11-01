// zod pieces of the VideoSpec for the reels templates (used by lib/spec.mjs). Field-level rules per scene type
// live in lib/reels.mjs (reelsIssues), so the schema stays open to the pack's field names.
import { z } from "zod";
import { REEL_SCENES, REEL_SCENE_TYPES, REELS_TEMPLATE_IDS, reelsIssues, usesReelsKit } from "./reels.mjs";

const moment = z.union([z.string().min(1), z.number().int()]);
const TYPES = REEL_SCENE_TYPES.map((t) => `${t} (${REEL_SCENES[t].alias})`).join(", ");

/** visual.reel: one scene of the reels vocabulary. Unknown keys are the scene's own fields (kept as-is). */
export const reelSceneSchema = z
  .looseObject({
    type: z.string().optional().describe(`Scene type: ${TYPES}`),
    tipo: z.string().optional().describe("The pack's Spanish scene type name (alternative to type)"),
    en: z.array(moment).optional().describe('Moments, in order: "word", "word#2", "word+6", "word-4", "inicio", "fin" or a frame number'),
    entrada: z.string().optional().describe('Scene entrance: "corte", "suave" or "semitono"'),
    sinSubtitulos: z.boolean().optional().describe("No subtitles for this sentence (the text is already on screen)"),
    sfx: z.array(z.array(z.union([z.string(), z.number()]))).optional().describe('Extra sounds: [moment, "sound", volume 0-1]'),
    voz: z.string().optional().describe("How the voice should pronounce the sentence (TTS only)"),
  })
  .describe("Reels scene (reels-* templates)");

/** Top-level `reels` options. */
export const reelsOptionsSchema = z
  .object({
    subtitles: z.string().optional().describe('"linea"/"line" (keyword boxes, default), "bloque"/"block" (3 lines top-left) or "no"/"none"'),
    transition: z.string().optional().describe('Default entrance: "corte"/"cut", "suave"/"soft" or "semitono"/"halftone" (default by style family)'),
    cover: z
      .looseObject({
        etiqueta: z.string().max(16).optional(),
        lineas: z.array(z.string().min(1).max(16)).min(1).max(4).optional().describe("Title lines (<=12 chars reads best); *word* in the accent color"),
        icono: z.string().optional(),
        imagenes: z.array(z.string()).max(4).optional(),
        pegatina: z.string().max(16).optional(),
        oscura: z.boolean().optional(),
      })
      .optional()
      .describe("Cover (portada); English keys label/lines/icon/images/sticker/dark also work"),
  })
  .describe("Reels templates options");

/** Adds the reels rules (scene types, fields, `en` words, no emoji) for reels templates; rejects reel visuals elsewhere. */
export function refineReels(spec, ctx) {
  if (usesReelsKit(spec.template)) {
    for (const i of reelsIssues(spec)) ctx.addIssue({ code: "custom", path: i.path, message: i.message });
    return true;
  }
  spec.scenes.forEach((s, i) => {
    if (s.visual?.type === "reel") ctx.addIssue({ code: "custom", path: ["scenes", i, "visual", "type"], message: `visual.type "reel" needs a reels template: ${REELS_TEMPLATE_IDS.join(", ")}` });
  });
  return false;
}
