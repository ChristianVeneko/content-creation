// VideoSpec schema (zod) — the single source of truth for spec.schema.json.
// The shape is the "Shared contract" of the Video Studio feature; do not rename fields.
import { z } from "zod";
import { MOODS, MUSIC_PROVIDERS } from "./music-moods.mjs";
import { elementsSchema, hasEmoji, hudItemSchema, hudOverrideSchema, lookSchema, sceneTitleSchema } from "./illustration-schema.mjs";
import { ART_LOOKS, FORMAT_2D_LOOKS, usesIllustratedKit } from "./illustrated.mjs";
import { THREE_D_TEMPLATE_IDS, refineScene3d, scene3dFields, usesThreeKit } from "./scene3d.mjs";
import { REELS_TEMPLATE_IDS } from "./reels.mjs";
import { PIXEL_TEMPLATE_IDS, pixelSceneSchema, refinePixel, refinePixelSpec, usesPixelKit } from "./pixel.mjs";
import { reelSceneSchema, reelsOptionsSchema, refineReels } from "./reels-schema.mjs";
import { CAPTION_POSITIONS, CAPTION_SIZES, CAPTION_STYLES } from "./captions.mjs";
import { FX_TYPES as FX3D_TYPES, fx3dSchema } from "./scene3d-motion.mjs";
import { drawingVisualSchema } from "./drawing.mjs";
import { FX2D_TYPES, MAX_FX2D, fx2dIssues, fx2dSchema } from "./fx2d.mjs";

export { CAPTION_STYLES };

/** The classic templates: one big text + an emoji/icon hero, or an agent `drawing` (visual.type "drawing"). */
export const CLASSIC_TEMPLATE_IDS = ["captions-voice", "kinetic-type", "countdown", "glass-cards", "letterbox"];
export const usesClassicLayout = (templateId) => CLASSIC_TEMPLATE_IDS.includes(templateId);

// `illustrated` is listed first: it is the recommended default template. Then the other illustrated-kit looks,
// the 3D looks (three.js), and the classic templates last.
export const TEMPLATE_IDS = ["illustrated", "whiteboard", "broadcast", "editorial-chart", "editor-window", "rank-numbers", ...ART_LOOKS, ...FORMAT_2D_LOOKS, ...THREE_D_TEMPLATE_IDS, ...PIXEL_TEMPLATE_IDS, ...REELS_TEMPLATE_IDS, ...CLASSIC_TEMPLATE_IDS];
/** Old topic-named ids (renamed 2026-11-01 to format names). Saved specs keep working through this map. */
export const LEGACY_TEMPLATE_IDS = {
  "breaking-news": "broadcast",
  "data-story": "editorial-chart",
  "code-tutorial": "editor-window",
  "top-list": "rank-numbers",
  listicle: "countdown",
  "explainer-cards": "glass-cards",
  "quote-story": "letterbox",
  "hero-product": "pedestal",
  "iso-explainer": "iso-toon",
};
/** Map a legacy template id to its current id; unknown ids pass through unchanged. */
export const canonicalTemplateId = (id) => (typeof id === "string" && LEGACY_TEMPLATE_IDS[id]) || id;

/** Return a shallow copy of a raw spec with legacy template, look and look3d ids replaced. */
export function migrateLegacyIds(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const out = { ...raw, template: canonicalTemplateId(raw.template) };
  if (raw.theme && typeof raw.theme === "object" && !Array.isArray(raw.theme)) {
    const theme = { ...raw.theme };
    if (theme.look3d) theme.look3d = canonicalTemplateId(theme.look3d);
    if (theme.look) theme.look = canonicalTemplateId(theme.look);
    out.theme = theme;
  }
  return out;
}
export const ANIMATIONS = ["pop", "slide", "typewriter", "zoom"];
export const VISUAL_TYPES = ["gradient", "image", "video", "emoji", "icon", "illustration", "scene3d", "reel", "pixel", "drawing"];
export const VOICE_PROVIDERS = ["elevenlabs", "kokoro", "none"];

const hex = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "must be a hex color like #1A2B3C");

/** Error of a failed branch, with its nested path in the message (zod's union error says only "Invalid input"). */
const branchError = (errs) => {
  const e = [...(errs ?? [])].sort((a, b) => b.path.length - a.path.length)[0];
  return e ? (e.path.length ? `${e.path.join(".")}: ${e.message}` : e.message) : undefined;
};
/** One `visual.fx` entry: a 3D effect (scene3d visuals) or a 2D effect (illustrated kit, classic and reels templates). */
const fxEntrySchema = z.union([fx3dSchema, fx2dSchema], {
  error: (iss) => {
    const type = iss.input?.type;
    if (FX2D_TYPES.includes(type)) return branchError(iss.errors?.[1]);
    if (FX3D_TYPES.includes(type)) return branchError(iss.errors?.[0]);
    return `unknown fx${type === undefined ? "" : ` "${type}"`}; 2D scenes (illustrated kit, classic and reels templates) use: ${FX2D_TYPES.join(", ")}; 3D scenes use: ${FX3D_TYPES.join(", ")}`;
  },
});

/** Boxes an fx may aim at: element ids (with split children) and "drawing/part" ids. */
function fxTargets(v) {
  const els = v.elements ?? [];
  const all = [...els, ...els.flatMap((e) => (e.type === "split" ? [...e.left, ...e.right] : []))];
  const ids = new Set(all.map((e) => e.id).filter(Boolean));
  const drawings = new Map(all.filter((e) => e.type === "drawing" && e.id).map((e) => [e.id, e]));
  if (v.drawing?.id) drawings.set(v.drawing.id, v.drawing);
  // reels: the drawing of a `dibujo` scene
  const reelDrawing = v.reel?.dibujo ?? v.reel?.drawing;
  if (reelDrawing?.id && Array.isArray(reelDrawing.parts)) drawings.set(reelDrawing.id, reelDrawing);
  return { ids, drawings };
}

export const visualSchema = z
  .object({
    type: z.enum(VISUAL_TYPES),
    src: z.string().min(1).optional().describe("Local file path (absolute or relative to the spec) or https URL"),
    query: z.string().optional().describe("Stock search query (informational)"),
    emoji: z.string().optional(),
    prompt: z.string().optional().describe("Image generation prompt (informational)"),
    elements: elementsSchema.optional().describe('Illustration elements (visual.type "illustration" only)'),
    ...scene3dFields,
    reel: reelSceneSchema.optional().describe('Reels scene (visual.type "reel", reels-* templates)'),
    pixel: pixelSceneSchema.optional().describe('Pixel-art scene (visual.type "pixel", pixel-* templates)'),
    drawing: drawingVisualSchema.optional().describe('Agent-drawn vector art (visual.type "drawing", classic templates): {id, viewBox, parts, motion, keys}'),
    fx: z
      .array(fxEntrySchema)
      .max(MAX_FX2D, `at most ${MAX_FX2D} fx per scene`)
      .optional()
      .describe(`Effects. 2D scenes (illustrated kit, classic, reels): ${FX2D_TYPES.join(", ")}. 3D scenes (max 6): ${FX3D_TYPES.join(", ")}`),
  })
  .superRefine((v, ctx) => {
    if ((v.type === "image" || v.type === "video") && !v.src) {
      ctx.addIssue({ code: "custom", path: ["src"], message: `visual.type "${v.type}" requires visual.src` });
    }
    if (v.type === "illustration" && !v.elements?.length) {
      ctx.addIssue({ code: "custom", path: ["elements"], message: 'visual.type "illustration" requires at least one element in visual.elements' });
    }
    if (v.type === "drawing" && !v.drawing) ctx.addIssue({ code: "custom", path: ["drawing"], message: 'visual.type "drawing" requires visual.drawing: {id?, viewBox?, parts: [...], motion?, keys?}' });
    const is3d = v.type === "scene3d";
    (v.fx ?? []).forEach((f, i) => {
      if (is3d && FX2D_TYPES.includes(f.type)) ctx.addIssue({ code: "custom", path: ["fx", i, "type"], message: `"${f.type}" is a 2D fx; 3D scenes use: ${FX3D_TYPES.join(", ")}` });
      if (!is3d && FX3D_TYPES.includes(f.type)) ctx.addIssue({ code: "custom", path: ["fx", i, "type"], message: `"${f.type}" is a 3D fx; 2D scenes use: ${FX2D_TYPES.join(", ")}` });
    });
    if (!is3d && v.fx?.length) {
      const { ids, drawings } = fxTargets(v);
      const classic = v.type !== "illustration";
      const targetError = (target) => {
        const [id, part] = target.split("/");
        if (part !== undefined) {
          const d = drawings.get(id);
          if (!d) return classic ? `no drawing with id "${id}" in this scene${v.type === "reel" ? " (set visual.reel.dibujo.id)" : ""}` : `no drawing element with id "${id}" in this scene`;
          return d.parts.some((p) => p.id === part) ? null : `no part "${part}" in drawing "${id}"`;
        }
        if (classic) return drawings.has(id) ? null : `no drawing with id "${id}" in this scene (set ${v.type === "reel" ? "visual.reel.dibujo.id" : "visual.drawing.id"})`;
        return ids.has(id) ? null : `no element with id "${id}" in this scene`;
      };
      for (const i of fx2dIssues(v.fx, targetError)) ctx.addIssue({ code: "custom", path: i.path, message: i.message });
    }
    refineScene3d(v, ctx);
    refinePixel(v, ctx);
    if (v.type === "reel" && !v.reel) ctx.addIssue({ code: "custom", path: ["reel"], message: 'visual.type "reel" requires visual.reel: {type, ...fields, en}' });
  });

export const sceneSchema = z.object({
  id: z.string().min(1),
  narration: z.string().min(1, "narration must not be empty"),
  onScreenText: z.string().optional(),
  durationSec: z.number().positive().max(60).optional(),
  visual: visualSchema,
  animation: z.enum(ANIMATIONS).optional(),
  title: sceneTitleSchema.optional().describe("Two-tone headline (illustrated template)"),
  hud: hudOverrideSchema.optional().describe("Per-scene HUD changes, keyed by HUD item id"),
});

export const videoSpecSchema = z
  .object({
    version: z.literal(1),
    title: z.string().min(1),
    template: z.enum(TEMPLATE_IDS),
    language: z.string().min(2).default("es"),
    format: z
      .object({
        width: z.number().int().positive().default(1080),
        height: z.number().int().positive().default(1920),
        fps: z.number().int().min(12).max(60).default(30),
      })
      .optional(),
    theme: z
      .object({
        palette: z
          .object({
            bg: z.array(hex).min(1).max(4),
            text: hex,
            accent: hex,
            accent2: hex.optional().describe("Second accent (illustrated: amber)"),
            accent3: hex.optional().describe("Third accent (illustrated: cyan)"),
          })
          .optional(),
        font: z.string().optional(),
        look: lookSchema.optional().describe("Illustrated-kit look; defaults to the template's own look"),
        look3d: z.enum(THREE_D_TEMPLATE_IDS).optional().describe("3D look (3D templates only); defaults to the template's own look"),
        captionStyle: z.enum(CAPTION_STYLES).optional().describe("Caption style; captions.style wins when both are set"),
      })
      .optional(),
    voice: z
      .object({
        provider: z.enum(VOICE_PROVIDERS),
        voiceId: z.string().optional(),
        speed: z.number().min(0.5).max(2).optional(),
      })
      .optional(),
    music: z
      .object({
        provider: z
          .enum(MUSIC_PROVIDERS)
          .optional()
          .describe('"library" (default: curated CC0/CC BY tracks by mood), "elevenlabs" (generated per video, opt-in, spends credits; falls back to the library), "none" (no music)'),
        mood: z
          .enum([...MOODS, "auto"])
          .optional()
          .describe('Library mood, or "auto" (picked from tone, topic keywords and template)'),
        track: z.string().min(1).optional().describe('Library track id (03-assets/music/library.json) or "auto"'),
        file: z.string().optional().describe("Local audio file (absolute or relative to the spec); wins over track/mood"),
        volume: z.number().min(0).max(1).default(0.12).describe("Music bed level: 0.12 = 13 dB under the voice; each doubling +6 dB (0.24 = -7 dB, 0.06 = -19 dB)"),
        duck: z.boolean().optional().describe("Dip the music a further 9 dB while words are spoken (smooth attack/release)"),
        prompt: z.string().max(600).optional().describe('ElevenLabs Music prompt (provider "elevenlabs" only); default derived from mood + tone'),
        tone: z.string().max(120).optional().describe("Tone hint used by mood auto-pick and the ElevenLabs prompt"),
      })
      .superRefine((m, ctx) => {
        if (m.prompt && m.provider !== "elevenlabs") ctx.addIssue({ code: "custom", path: ["prompt"], message: 'music.prompt is only used with music.provider "elevenlabs"' });
      })
      .optional(),
    sfx: z
      .object({
        enabled: z.boolean().default(true),
        volume: z.number().min(0).max(2).default(1).describe("1 = SFX peaks 12 dB under the voice; 0.5 = -18 dB, 2 = -6 dB"),
      })
      .optional(),
    hud: z
      .object({ items: z.array(hudItemSchema).min(1).max(4) })
      .optional()
      .describe("Persistent top HUD (illustrated template)"),
    reels: reelsOptionsSchema.optional(),
    brand: z
      .object({
        handle: z.string().min(1).max(40).optional(),
        avatar: z.string().min(1).optional().describe("Local image path for the footer avatar"),
      })
      .optional(),
    captions: z
      .object({
        enabled: z.boolean().default(true),
        wordsPerPage: z.number().int().min(1).max(8).default(3),
        style: z.enum(CAPTION_STYLES).optional().describe("Caption style; overrides theme.captionStyle when set"),
        size: z.enum(CAPTION_SIZES).optional().describe('Size preset: s, m (default, the classic size), l, xl'),
        position: z
          .enum(CAPTION_POSITIONS)
          .optional()
          .describe("Position preset inside the safe area (x 90-990): top y230-480, upper y420-700, center y820-1100, lower y1130-1390, bottom y1250-1400. Omitted: the template's own band"),
        accent: hex.optional().describe("Legacy alias of colors.highlight (colors.highlight wins when both are set)"),
        colors: z
          .object({
            text: hex.optional().describe("Caption word color; omitted: theme.palette.text"),
            highlight: hex.optional().describe("Active-word / keyword color; omitted: captions.accent, else theme.palette.accent"),
            box: hex.optional().describe("Word box / panel color (boxed, chips, pills, typewriter, dialog, pixel); omitted: derived from the palette"),
            outline: hex.optional().describe("Stroke and shadow color (hormozi, punch, karaoke...); omitted: the darkest theme.palette.bg stop"),
          })
          .optional()
          .describe("Custom caption colors. Omit to follow the palette automatically (readable contrast is enforced on derived colors); set only the fields the user asked for"),
        uppercase: z.boolean().optional().describe("Force uppercase on (true) or off (false); omitted: the style's own casing"),
        speaker: z.string().min(1).max(40).optional().describe('Speaker name shown in the "dialog" style box'),
      })
      .optional(),
    scenes: z
      .array(sceneSchema)
      .min(1, "at least one scene is required")
      .max(60)
      .superRefine((scenes, ctx) => {
        const seen = new Set();
        scenes.forEach((s, i) => {
          if (seen.has(s.id)) ctx.addIssue({ code: "custom", path: [i, "id"], message: `duplicate scene id "${s.id}"` });
          seen.add(s.id);
        });
      }),
    post: z
      .object({
        tiktok: z.string(),
        instagram: z.string(),
        youtube: z.object({ title: z.string().max(100), description: z.string() }),
        hashtags: z.array(z.string()),
      })
      .optional(),
  })
  .superRefine((spec, ctx) => {
    if (refineReels(spec, ctx)) return;
    if (!usesClassicLayout(spec.template)) {
      spec.scenes.forEach((s, i) => {
        if (s.visual?.type === "drawing")
          ctx.addIssue({ code: "custom", path: ["scenes", i, "visual", "type"], message: `visual.type "drawing" is for the classic templates (${CLASSIC_TEMPLATE_IDS.join(", ")}); illustrated-kit templates add a { "type": "drawing" } element to visual.elements` });
      });
    }
    const pixel = usesPixelKit(spec.template);
    if (!pixel) {
      spec.scenes.forEach((s, i) => {
        if (s.visual?.type === "pixel") ctx.addIssue({ code: "custom", path: ["scenes", i, "visual", "type"], message: `visual.type "pixel" needs a pixel template: ${PIXEL_TEMPLATE_IDS.join(", ")}` });
      });
    } else {
      // Pixel fonts have no emoji glyphs: nothing drawn on screen may contain emoji.
      spec.scenes.forEach((s, i) => {
        const visible = { onScreenText: s.onScreenText, visual: { pixel: s.visual?.pixel } };
        for (const where of findEmoji(visible)) ctx.addIssue({ code: "custom", path: ["scenes", i, ...where], message: "emoji are not allowed in pixel templates; use a pixel prop (coin, block, heart, trophy...) instead" });
      });
      spec.scenes.forEach((s, i) => {
        if (s.visual?.fx?.length) ctx.addIssue({ code: "custom", path: ["scenes", i, "visual", "fx"], message: "pixel templates take their effects inside visual.pixel.fx" });
      });
      refinePixelSpec(spec, ctx);
      return;
    }
    const three = usesThreeKit(spec.template);
    if (!three) {
      spec.scenes.forEach((s, i) => {
        if (s.visual?.type === "scene3d") ctx.addIssue({ code: "custom", path: ["scenes", i, "visual", "type"], message: `visual.type "scene3d" needs a 3D template: ${THREE_D_TEMPLATE_IDS.join(", ")}` });
      });
    }
    if (three) {
      // 3D looks draw everything; emoji are not allowed in anything shown on screen.
      spec.scenes.forEach((s, i) => {
        const visible = { onScreenText: s.onScreenText, title: s.title, hud: s.hud, visual: { objects: s.visual?.objects, connect: s.visual?.connect } };
        for (const where of findEmoji(visible)) ctx.addIssue({ code: "custom", path: ["scenes", i, ...where], message: "emoji are not allowed in 3D templates; use a 3D object (kind icon, check, cross...) instead" });
      });
      for (const where of findEmoji(spec.hud)) ctx.addIssue({ code: "custom", path: ["hud", ...where], message: "emoji are not allowed in 3D templates" });
      return;
    }
    if (!usesIllustratedKit(spec.template)) return;
    // The illustrated look forbids emoji in anything drawn on screen.
    spec.scenes.forEach((s, i) => {
      const visible = { onScreenText: s.onScreenText, title: s.title, hud: s.hud, elements: s.visual?.elements };
      for (const where of findEmoji(visible)) {
        ctx.addIssue({ code: "custom", path: ["scenes", i, ...where], message: "emoji are not allowed in the illustrated template; draw it with an element (icon, svg, badge) instead" });
      }
    });
    for (const where of findEmoji(spec.hud)) ctx.addIssue({ code: "custom", path: ["hud", ...where], message: "emoji are not allowed in the illustrated template" });
    // callout/stamp targets must be ids of elements in the same scene
    spec.scenes.forEach((s, i) => {
      const els = s.visual?.elements ?? [];
      const ids = new Set(els.flatMap((e) => [e.id, ...(e.type === "split" ? [...e.left, ...e.right].map((c) => c.id) : [])]).filter(Boolean));
      els.forEach((e, k) => {
        if ((e.type === "callout" || e.type === "stamp") && e.target && !ids.has(e.target)) {
          ctx.addIssue({ code: "custom", path: ["scenes", i, "visual", "elements", k, "target"], message: `no element with id "${e.target}" in this scene` });
        }
      });
    });
  });

/** Paths (arrays) of string leaves that contain emoji. */
function findEmoji(value, path = []) {
  if (typeof value === "string") return hasEmoji(value) ? [path] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => findEmoji(v, [...path, i]));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => findEmoji(v, [...path, k]));
  return [];
}

/** Turn zod issues into `[{path, message}]` with dotted paths like `scenes.0.visual.src`. */
export function formatIssues(error) {
  return error.issues.map((iss) => ({
    path: iss.path.length ? iss.path.join(".") : "(root)",
    message: iss.message,
  }));
}

/**
 * Validate a raw spec object.
 * @returns {{ok: true, spec: object, errors: []} | {ok: false, errors: {path: string, message: string}[]}}
 */
export function validateSpec(raw) {
  const res = videoSpecSchema.safeParse(migrateLegacyIds(raw));
  if (!res.success) return { ok: false, errors: formatIssues(res.error) };
  return { ok: true, spec: res.data, errors: [] };
}

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
function deepMerge(base, over) {
  if (!isObj(base)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over ?? {})) {
    if (v === undefined) continue;
    out[k] = isObj(v) && isObj(base[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}

/**
 * Fill everything the spec omits from the template defaults, so render code never deals with optionals.
 * Spec values always win over template defaults.
 */
export function resolveSpec(spec, template) {
  const d = template?.defaults ?? {};
  const base = {
    language: "es",
    format: { width: 1080, height: 1920, fps: 30 },
    theme: deepMerge({ palette: { bg: ["#0F0C29", "#302B63"], text: "#FFFFFF", accent: "#FFD60A" }, font: "Montserrat", captionStyle: "hormozi" }, d.theme),
    voice: deepMerge({ provider: "kokoro", speed: 1 }, d.voice),
    music: deepMerge({ volume: 0.12 }, d.music), // duck defaults to on when library/ElevenLabs music is mixed
    sfx: deepMerge({ enabled: false, volume: 1 }, d.sfx),
    captions: deepMerge({ enabled: true, wordsPerPage: 3 }, d.captions),
    animation: d.animation ?? "pop",
  };
  const merged = deepMerge(base, spec);
  merged.scenes = spec.scenes.map((s) => ({ ...s, animation: s.animation ?? base.animation }));
  delete merged.animation;
  merged.post = spec.post ?? { tiktok: "", instagram: "", youtube: { title: spec.title, description: "" }, hashtags: [] };
  return merged;
}
