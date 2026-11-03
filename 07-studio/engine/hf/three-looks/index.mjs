// three-looks: HyperFrames format of 3D animated worlds (real GLB models, skeletal clips, clay look), driven by a JSON payload (spec.hf).
// Contract: see 07-studio/engine/hf/registry.mjs. Docs: 00-docs/hf-formats/three-looks.md.
import { STYLES } from "./styles.mjs";
import { loadCatalog } from "./catalog.mjs";
import { payloadSchema } from "./schema.mjs";
import { buildPromptSection } from "./prompt.mjs";
import { normalize as normalizeSpec } from "./normalize.mjs";
import { compose as composeImpl } from "./compose.mjs";

export const meta = {
  id: "three-looks",
  name: "Three looks (3D worlds)",
  about: "3D animated worlds with real GLB models and skeletal clips: a hero that reacts, props with named states driven by narration words, camera shots and clay transitions. Look: clay-diorama.",
  category: "hyperframes",
  best_for: ["how-things-work explainers with physical metaphors", "tech and AI concepts as a toy diorama", "friendly 3D storytelling without a face"],
  modes: ["multi", "single"],
  styles: STYLES.map(({ id, name, about }) => ({ id, name, about })),
  settings: [
    { id: "hero", name: "Hero", about: "robo (skeletal, full emote set, default), alex, dani or kiko." },
    { id: "mood", name: "Mood per world", about: "warm, cool, night or alert lighting for each world." },
    { id: "camera", name: "Camera intensity", about: "calm (longer shots, softer moves) or dynamic (default)." },
    { id: "transition", name: "Transition", about: "iris, slide, drop or pop between worlds (multi mode)." },
  ],
  defaults: { captions: { enabled: true }, hf: { style: "clay-diorama", hero: "robo", camera: "dynamic", worlds: [{ setting: "desk", beats: [] }] } },
  preview: { style: "clay", gradient: ["#f3e6d2", "#e8c9a0"], accent: "#f2a65a" },
};
export { payloadSchema };
export const promptSection = buildPromptSection();
export const normalize = normalizeSpec;
export const compose = composeImpl;
export const catalog = () => loadCatalog();
