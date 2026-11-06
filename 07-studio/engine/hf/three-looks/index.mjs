// three-looks: HyperFrames format of 3D animated worlds, every model built from scratch in code (parts and builders), clay look, driven by a JSON payload (spec.hf).
// Contract: see 07-studio/engine/hf/registry.mjs. Docs: 00-docs/hf-formats/three-looks.md.
import { STYLES } from "./styles.mjs";
import { loadCatalog } from "./catalog.mjs";
import { builderCatalog } from "./builders/index.mjs";
import { payloadSchema } from "./schema.mjs";
import { buildPromptSection } from "./prompt.mjs";
import { normalize as normalizeSpec } from "./normalize.mjs";
import { compose as composeImpl } from "./compose.mjs";

export const meta = {
  id: "three-looks",
  name: "Three looks (3D worlds)",
  about: "3D animated worlds with every model built from scratch (character rigs, procedural props, hand-written parts): a hero that reacts, objects with named states driven by narration words, a framing solver and crossfade transitions. Look: clay-diorama.",
  category: "hyperframes",
  best_for: ["how-things-work explainers with physical metaphors", "tech and AI concepts as a toy diorama", "friendly 3D storytelling without a face"],
  modes: ["multi", "single"],
  styles: STYLES.map(({ id, name, about }) => ({ id, name, about })),
  settings: [
    { id: "hero", name: "Hero", about: "character design kid, bot, worker or scientist with hat, expression, skin and hair (built from scratch)." },
    { id: "mood", name: "Mood per world", about: "warm, cool, night or alert lighting for each world." },
    { id: "camera", name: "Camera intensity", about: "calm (longer shots, softer moves) or dynamic (default)." },
    { id: "transition", name: "Transition", about: "iris, slide, drop or pop between worlds (multi mode)." },
  ],
  defaults: { captions: { enabled: true }, hf: { style: "clay-diorama", hero: { design: "kid" }, camera: "dynamic", worlds: [{ set: "studio", objects: [], beats: [] }] } },
  preview: { style: "clay", gradient: ["#f3e6d2", "#e8c9a0"], accent: "#f2a65a" },
};
export { payloadSchema };
export const promptSection = buildPromptSection();
export const normalize = normalizeSpec;
export const compose = composeImpl;
export const catalog = () => loadCatalog();
export const builders = () => builderCatalog();
