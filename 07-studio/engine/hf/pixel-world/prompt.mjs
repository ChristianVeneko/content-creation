// Spec-writer guidance for LLM providers: generated from the catalog so it always matches what the runtime can draw.
import { loadCatalog, BEAT_DOCS, BEAT_KINDS, EMOTES, TRANSITIONS, WORKSHOP_THEMES, WORKSHOP_MAX_PROPS } from "./catalog.mjs";

export function buildPromptSection() {
  const cat = loadCatalog();
  const styles = cat.styles.map((s) => `- ${s.id}: ${s.about}`).join("\n");
  const short = (t, n = 70) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
  const scen = ["| scenario | suits topics | NOT for | props (beat targets) |", "|---|---|---|---|", ...cat.scenarios.filter((s) => !s.dynamic).map((s) => `| ${s.id} | ${s.topics.slice(0, 7).join(", ")} | ${s.avoid.join(", ") || "-"} | ${s.props.map((p) => p.id).join(", ")} |`)].join("\n");
  const ws = cat.scenarios.find((s) => s.dynamic);
  const lib = cat.propLib.map((p) => `- ${p.kind} (${p.row}${p.fills ? ", fill" : ""}${p.opens ? ", open" : ""}): ${p.about}`).join("\n");
  const kinds = BEAT_KINDS.map((k) => `- ${k}: ${BEAT_DOCS[k]}`).join("\n");
  const heroes = cat.heroes.map((h) => `${h.id} (${h.about})`).join("; ");
  const example = {
    style: "pixel-snes-16bit", hero: "hoodie", brand: { handle: "@canal", follow: { word: "Sigueme" } },
    worlds: [
      { scenario: "phone-workshop", cast: [{ who: "hero", at: "left", size: "L" }, { who: "cat", at: "right", size: "M" }], beats: [
        { on: { word: "celular" }, do: "light", target: "phone" }, { on: { word: "celular" }, do: "hero-stamp", text: "CELULAR", color: "teal" },
        { on: { word: "calienta" }, do: "pulse", target: "phone" }, { on: { word: "calienta" }, do: "emote", who: "hero", symbol: "!" },
        { on: { word: "procesador" }, do: "open", target: "phone" }, { on: { word: "procesador" }, do: "label", target: "chip", text: "CPU", color: "yellow" },
        { on: { word: "procesador" }, do: "fill", target: "chip", value: 0.4 }, { on: { word: "trabaja" }, do: "point", who: "hero", target: "chip" },
        { on: { word: "trabaja" }, do: "emote", who: "cat", symbol: "dots" }, { on: { word: "parar" }, do: "fill", target: "chip", value: 0.9 },
        { on: { word: "parar" }, do: "shake", amp: 3 }, { on: { word: "parar" }, do: "progress", value: 0.9, label: "CALOR" },
        { on: { word: "app" }, do: "react", who: "hero", symbol: "?" }, { on: { word: "calculos" }, do: "radial-burst", target: "chip" },
        { on: { word: "calculos" }, do: "push", target: "chip", amount: 1.2 }, { on: { word: "bateria" }, do: "fill", target: "battery", value: 0.3 } ] },
      { scenario: "workshop-stage", theme: "bench", transition: "tiles", cast: [{ who: "hero", at: "left", size: "L" }],
        props: [{ kind: "battery", id: "battery", at: "left" }, { kind: "thermometer", id: "thermo", at: "center" }, { kind: "flame", id: "flame", at: "right" }, { kind: "fan", id: "fan", row: "high", at: 0.8 }],
        beats: [
          { on: { word: "bateria" }, do: "fill", target: "battery", value: 0.8 }, { on: { word: "bateria" }, do: "pulse", target: "battery" },
          { on: { word: "energia" }, do: "light", target: "battery" }, { on: { word: "energia" }, do: "hero-stamp", text: "ENERGIA", color: "yellow" },
          { on: { word: "forma" }, do: "walk", who: "hero", to: "thermo" }, { on: { word: "calor" }, do: "fill", target: "thermo", value: 1 },
          { on: { word: "calor" }, do: "light", target: "flame" }, { on: { word: "calor" }, do: "shake", amp: 4 },
          { on: { word: "calor" }, do: "emote", who: "hero", symbol: "!" }, { on: { word: "calor" }, do: "counter", value: 45, label: "GRADOS" } ] },
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

Scenarios. CHOOSE BY TOPIC: read the "suits topics" column and pick the scenario whose tags match what the sentence is about. NEVER choose a scenario whose props contradict the topic (no AI machine, hospital, dungeon or shop for a phone-heat topic). Props are the \`target\` of beats; use only the listed props:
${scen}

COMPOSABLE SCENARIO \`workshop-stage\`: use it when no scenario above fits the sentence literally, or to draw a metaphor exactly. Give \`"props": [ { "kind": <library kind>, "id"?: "my-id", "at"?: left|center|right|0-1, "size"?: S|M|L, "row"?: floor|bench|high } ]\` (1-${WORKSHOP_MAX_PROPS} items) and optionally \`"theme"\`: ${WORKSHOP_THEMES.join("|")}. Prop ids default to the kind (battery, battery-2...); beats target those ids. Prop library (each reacts to fill, light, open, pulse, burst, recolor beats as written):
${lib}

Beat kinds (\`do\`):
${kinds}
Emote symbols: ${EMOTES.join(" ")}. Colours: red yellow green teal blue purple orange pink white gold.

Rules:
- Hook in the first 2 seconds: first beat on the first sentence (a hero-stamp or a prop reaction), never an empty start.
- BEAT DENSITY: at least one beat every 2 s of each world, aim for one per 1.5 s, several beats on the same strong word are fine (prop change + label + emote). The engine adds ambient reactions when a world is under 0.5 beats/s, but written beats are always better. 8-10 s per world; 3-4 worlds per 30 s video (single mode: the same 3-4 stations).
- Cast: the hero is large by default; use size M or L for anyone on screen (S only for a tiny sidekick). Put the action on props in the middle of the frame; the lower third is dressed by the engine, never place text there.
- The HUD (\`progress\`, \`counter\`) sits under the caption band; labels are short (CALOR, CARGA) and never repeat the caption words.
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
