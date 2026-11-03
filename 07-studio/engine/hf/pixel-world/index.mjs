// pixel-world: HyperFrames format of animated pixel-art worlds, driven entirely by a JSON payload (spec.hf).
// Contract: see 07-studio/engine/hf/registry.mjs. Docs: 00-docs/hf-formats/pixel-world.md.
import { STYLES } from "./styles.mjs";
import { loadCatalog } from "./catalog.mjs";
import { payloadSchema } from "./schema.mjs";
import { buildPromptSection } from "./prompt.mjs";
import { normalize as normalizeSpec } from "./normalize.mjs";
import { compose as composeImpl } from "./compose.mjs";

export const meta = {
  id: "pixel-world",
  name: "Pixel world",
  about: "Animated pixel-art worlds: procedural scenarios, a cast that talks and reacts, props that change on the narration words, camera moves and transitions. 14 retro styles.",
  category: "hyperframes",
  best_for: ["how-things-work explainers", "tech and AI concepts as a game level", "storytelling with faceless pixel worlds"],
  modes: ["multi", "single"],
  styles: STYLES.map(({ id, name, about }) => ({ id, name, about })),
  settings: [
    { id: "hero", name: "Hero", about: "Cast design that narrates: hoodie, capgirl, wizard, astro, robot." },
    { id: "layout", name: "Single-mode path", about: "strip (side-scroll) or tower (top to bottom); only used when mode is single." },
    { id: "brand", name: "Brand pill", about: "Avatar + handle pill with an optional fake follow click on a spoken word." },
    { id: "pixelScale", name: "Pixel quality", about: "chunky (big pixels), standard (default) or fine (double resolution, about a third slower); draft renders always use standard." },
    { id: "flash", name: "White flash", about: "Beat `flash` is ignored unless this is true (off by default, photosensitivity)." },
  ],
  defaults: { captions: { enabled: true }, music: { provider: "format", mood: "auto", duck: true }, hf: { style: "pixel-snes-16bit", hero: "hoodie", worlds: [{ scenario: "factory", beats: [] }] } },
  preview: { style: "pixel", gradient: ["#1a1c2c", "#5d275d"], accent: "#ffcd75" },
};
export { payloadSchema };
export const promptSection = buildPromptSection();
export const normalize = normalizeSpec;
export const compose = composeImpl;
export const catalog = () => loadCatalog();
