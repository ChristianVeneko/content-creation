// Spec-writer guidance for LLM providers: generated from the catalog so it always matches what the runtime can draw.
import { loadCatalog, BEAT_DOCS, BEAT_KINDS, EMOTES, TRANSITIONS } from "./catalog.mjs";

export function buildPromptSection() {
  const cat = loadCatalog();
  const styles = cat.styles.map((s) => `- ${s.id}: ${s.about}`).join("\n");
  const scen = cat.scenarios.map((s) => `- ${s.id} (props: ${s.props.map((p) => p.id).join(", ")}): ${s.about}`).join("\n");
  const kinds = BEAT_KINDS.map((k) => `- ${k}: ${BEAT_DOCS[k]}`).join("\n");
  const heroes = cat.heroes.map((h) => `${h.id} (${h.about})`).join("; ");
  const example = {
    style: "pixel-snes-16bit", hero: "hoodie", brand: { handle: "@canal", follow: { word: "Sigueme" } },
    worlds: [
      { scenario: "factory", cast: [{ who: "hero", at: "left", size: "M" }], beats: [
        { on: { word: "fichas" }, do: "burst", target: "machine" }, { on: { word: "tokens" }, do: "hero-stamp", text: "TOKENS", color: "teal" },
        { on: { word: "cortada" }, do: "chop", target: "machine" }, { on: { word: "cortada" }, do: "shake", amp: 4 }, { on: { word: "pedacito" }, do: "label", target: "belt", text: "TOKEN", color: "yellow" } ] },
      { scenario: "dungeon", transition: "tiles", cast: [{ who: "hero", at: "left" }, { who: "slime", at: "right", size: "S" }], beats: [
        { on: { word: "ventana" }, do: "open", target: "backpack" }, { on: { word: "token", n: 2 }, do: "fill", target: "backpack", value: 0.5 },
        { on: { word: "llena" }, do: "fill", target: "backpack", value: 1 }, { on: { word: "llena" }, do: "emote", who: "hero", symbol: "!" }, { on: { word: "llena" }, do: "shake", amp: 5 } ] },
    ],
  };
  return `Format \`pixel-world\`: animated pixel-art worlds (HyperFrames canvas). The picture is procedural and data-driven, so you write ONLY a JSON payload in \`spec.hf\`; no code. The narration text is yours to write in the video language; the payload is language-agnostic (every word in \`on.word\` must be a word that is actually spoken).

Modes (\`spec.mode\`): "multi" (default) = several worlds joined by transitions; "single" = one continuous level, the camera travels from world to world along a path, no cuts (\`layout\`: "strip" side-scroll, "tower" top-to-bottom). Every style works in both modes.

Payload: { "style": <style>, "hero": <hero>, "layout"?: "strip"|"tower", "flash"?: false, "brand"?: { "handle": "@name", "follow"?: { "word": "..." } }, "worlds": [ { "scenario": <scenario>, "from"?: { "word": "..", "n"?: 1 } | seconds, "transition"?: ${TRANSITIONS.join("|")}, "time"?: day|dusk|night, "cast"?: [ { "who": "hero"|<npc>, "at"?: left|center|right|<prop>, "size"?: S|M|L } ], "beats": [ { "on": { "word": "..", "n"?: 1 }, "do": <beat kind>, ...fields } ] } ] }
- \`on.word\` binds a beat to the n-th occurrence (n starts at 1) of a spoken word; accents and punctuation are ignored. Do not invent words that are not in the narration.
- Worlds without \`from\` are spaced evenly. Give \`from\` on the word where the new idea starts.
- Captions are drawn by the format itself, never add caption text.

Styles (one per video, applies to every scenario): 
${styles}

Hero: ${heroes}. NPCs (use in \`cast\`): ${cat.npcs.map((n) => `${n.id} (${n.about})`).join("; ")}.

Scenarios (props are the \`target\` of beats; use only listed props):
${scen}

Beat kinds (\`do\`):
${kinds}
Emote symbols: ${EMOTES.join(" ")}. Colours: red yellow green teal blue purple orange pink white gold.

Rules:
- Hook in the first 2 seconds: first beat on the first sentence (a hero-stamp or a prop reaction), never an empty start.
- One beat every 1.5-2 s; 8-10 s per world; 3-4 worlds per 30 s video (single mode: the same 3-4 stations).
- Literal, drawable metaphors: a token is a coin/tile, memory is a backpack, a server is a kitchen. One idea per sentence; maximum one number per scene.
- Vary the beat kinds (a prop change, an emphasis, a camera move, an emote); never the same kind three times in a row. Use shake and hero-stamp only on the 4-6 strongest words.
- Keep \`flash\` off. No sources or URLs in on-screen text. Mark uncertain facts with [COMPROBAR] in the narration notes, not in the payload.
- Text fields (\`text\`, \`label\`) are 1-3 words in the video language, at most 16 characters per chip.

Example payload (language of the words is Spanish here):
\`\`\`json
${JSON.stringify(example, null, 1)}
\`\`\`
`;
}
