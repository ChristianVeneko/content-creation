// Spec-writer guidance for the three-looks format (built from the catalog, builders and schema so it never drifts) and the rich example payload.
import { STYLES, STYLE_GUIDE } from "./styles.mjs";
import { SETS, SET_IDS, GLOBAL_ANCHORS } from "./sets.mjs";
import { BEAT_KINDS, BEAT_DOCS, EMOTES, TRANSITIONS, MOODS, MOOD_DOCS, SHOTS, MOVES } from "./catalog.mjs";
import { PART_SIZE, PART_ROLES, PART_MATERIALS, MOTION_ABOUT, STATE_ABOUT, MAX_PARTS, MAX_WORLD_PARTS } from "./parts.mjs";
import { builderCatalog, CHARACTER_DESIGNS, CHARACTER_HATS, CHARACTER_EXPRESSIONS } from "./builders/index.mjs";

/** A valid payload that uses hand-written custom models next to builders (also the fixture of the tests). */
export const EXAMPLE_PAYLOAD = {
  style: "clay-diorama", camera: "dynamic",
  hero: { design: "kid", expression: "worried", seed: 4 },
  worlds: [
    { set: "room", mood: "warm", cast: [{ who: "hero", at: "front-left" }],
      objects: [
        { id: "pc", build: "laptop", at: "back-center", label: "Computadora" },
        { id: "mem", build: "battery", params: { segments: 6 }, at: "back-right", label: "Memoria" },
        { id: "cpu", label: "Procesador", at: "mid-left", scale: 1.1, motion: ["bob"], parts: [
          { id: "base", shape: "box", size: [1.2, 0.14, 1.2], pos: [0, 0.07, 0], radius: 0.05, role: "dark" },
          { id: "die", shape: "box", size: [0.7, 0.12, 0.7], pos: [0, 0.13, 0], parent: "base", radius: 0.04, role: "metal" },
          { id: "core", shape: "sphere", size: [0.17], pos: [0, 0.14, 0], parent: "die", role: "glow", states: { glow: { emissive: 3 }, heat: { color: "#e5574f" } } },
          { id: "pinsL", shape: "box", size: [0.06, 0.05, 1.0], pos: [-0.66, 0, 0], parent: "base", role: "accent" },
          { id: "pinsR", shape: "box", size: [0.06, 0.05, 1.0], pos: [0.66, 0, 0], parent: "base", role: "accent" },
        ] },
      ],
      beats: [
        { on: { word: "computadora" }, do: "stamp", text: "SE CUELGA" },
        { on: { word: "computadora" }, do: "emote", who: "hero", symbol: "no" },
        { on: { word: "programas" }, do: "light-up", target: "pc" },
        { on: { word: "programas" }, do: "label", target: "pc", text: "Programas" },
        { on: { word: "ventanas" }, do: "pulse", target: "pc" },
        { on: { word: "memoria" }, do: "label", target: "mem", text: "Memoria" },
        { on: { word: "memoria" }, do: "fill", target: "mem", value: 0.4 },
        { on: { word: "llena" }, do: "fill", target: "mem", value: 0.8 },
        { on: { word: "tope" }, do: "fill", target: "mem", value: 1 },
        { on: { word: "tope" }, do: "shake", target: "mem", dur: 0.9 },
        { on: { word: "tope" }, do: "emote", who: "hero", symbol: "faint" },
      ] },
    { set: "warehouse", mood: "cool", from: { word: "almacen" }, cast: [{ who: "hero", at: "front-left" }],
      objects: [
        { id: "shelf", build: "shelf", at: "back-left", label: "Almacen" },
        { id: "belt", build: "conveyor", at: "mid-right" },
        { id: "crate", build: "crate", at: "mid-left", hidden: true },
      ],
      beats: [
        { on: { word: "almacen" }, do: "label", target: "shelf", text: "Almacen" },
        { on: { word: "sitio" }, do: "fill", target: "shelf", value: 1 },
        { on: { word: "cajas" }, do: "pop-in", target: "crate" },
        { on: { word: "cajas" }, do: "emote", who: "hero", symbol: "wave" },
        { on: { word: "sacar" }, do: "light-up", target: "belt" },
        { on: { word: "camion" }, do: "fill", target: "belt", value: 1 },
        { on: { word: "camion" }, do: "walk", who: "hero", to: "belt" },
        { on: { word: "camion" }, do: "stamp", text: "SACAR" },
      ] },
    { set: "server-room", mood: "alert", from: { word: "disco" }, cast: [{ who: "hero", at: "front-right" }],
      objects: [
        { id: "rack", build: "server-rack", at: "back-center", label: "Disco" },
        { id: "cooler", build: "pipe-system", at: "mid-left", scale: 0.7 },
        { id: "temp", build: "thermometer", at: "back-right" },
      ],
      beats: [
        { on: { word: "disco" }, do: "open", target: "rack" },
        { on: { word: "disco" }, do: "label", target: "rack", text: "Disco" },
        { on: { word: "lento" }, do: "fill", target: "rack", value: 0.9 },
        { on: { word: "datos", n: 2 }, do: "burst", target: "rack" },
        { on: { word: "calor" }, do: "heat", target: "rack" },
        { on: { word: "calor" }, do: "fill", target: "temp", value: 1 },
        { on: { word: "calor" }, do: "stamp", text: "CALOR" },
        { on: { word: "ventilador" }, do: "open", target: "cooler" },
        { on: { word: "ventilador" }, do: "fill", target: "cooler", value: 0.9 },
        { on: { word: "alcanza" }, do: "shake", target: "temp", dur: 0.8 },
      ] },
    { set: "studio", mood: "warm", from: { word: "mejor" }, cast: [{ who: "hero", at: "front-center" }],
      objects: [
        { id: "power", label: "Reinicio", at: "mid-center", scale: 1.3, parts: [
          { id: "plate", shape: "cylinder", size: [0.7, 0.7, 0.14], pos: [0, 0.07, 0], role: "dark" },
          { id: "button", shape: "cylinder", size: [0.5, 0.5, 0.16], pos: [0, 0.14, 0], parent: "plate", role: "accent", states: { glow: { emissive: 1.4 } } },
          { id: "ring", shape: "torus", size: [0.27, 0.05, 280], pos: [0, 0.09, 0], parent: "button", rot: [-90, 0, 0], role: "light", emissive: 0.6 },
          { id: "bar", shape: "box", size: [0.06, 0.26, 0.05], pos: [0, 0.09, 0.0], parent: "button", rot: [-90, 0, 0], role: "light", emissive: 0.6 },
        ] },
        { id: "pc2", build: "laptop", at: "back-center" },
      ],
      beats: [
        { on: { word: "cerrar" }, do: "close", target: "pc2" },
        { on: { word: "reiniciar" }, do: "light-up", target: "power" },
        { on: { word: "reiniciar" }, do: "pulse", target: "power" },
        { on: { word: "reiniciar" }, do: "stamp", text: "REINICIA" },
        { on: { word: "reiniciar" }, do: "emote", who: "hero", symbol: "thumbs-up" },
        { on: { word: "computadora", n: 2 }, do: "open", target: "pc2" },
      ] },
  ],
};

const short = (t, n = 90) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

export function buildPromptSection() {
  const styles = ["| style | mood | good for | avoid |", "|---|---|---|---|", ...STYLES.map((s) => { const g = STYLE_GUIDE[s.id]; return `| ${s.id} | ${g.mood} | ${g.goodFor} | ${g.avoid} |`; })].join("\n");
  const sets = ["| set | suits topics | NOT for |", "|---|---|---|", ...SET_IDS.map((id) => `| ${id} | ${SETS[id].topics.slice(0, 8).join(", ")} | ${SETS[id].avoid.join(", ") || "-"} |`)].join("\n");
  const builders = builderCatalog().map((b) => `- ${b.id}: ${short(b.about, 90)}. States: ${b.states}.${b.params ? ` Params: ${b.params}.` : ""}`).join("\n");
  const shapes = Object.entries(PART_SIZE).map(([k, v]) => `${k} ${v.about}`).join("; ");
  const motion = Object.entries(MOTION_ABOUT).map(([k, v]) => `${k} (${v})`).join("; ");
  const states = Object.entries(STATE_ABOUT).map(([k, v]) => `${k}: ${v}`).join("; ");
  const beats = BEAT_KINDS.map((k) => `- ${k}: ${BEAT_DOCS[k]}`).join("\n");
  const shots = Object.entries(SHOTS).map(([k, s]) => `${k} (${s.about})`).join("; ");
  return `Format \`three-looks\`: 3D animated worlds, EVERY MODEL BUILT FROM SCRATCH (HyperFrames + three.js). Look \`clay-diorama\`: matte plasticine toys, rounded edges, warm key light, soft shadows, on a rounded platform with a procedural set. The picture is rendered from your JSON payload (\`spec.hf\`) and the narration words: every beat lands on its word.

Modes (\`spec.mode\`): "multi" (default) = one world per idea (6-10 s each) joined by a render-target crossfade (iris, slide, drop, pop: both worlds stay visible in every frame); "single" = ONE continuous row of worlds, the camera travels from station to station while the hero walks, no cuts.

BINDING RULE: models are never taken from a stock or downloaded asset. Describe every model as primitive and procedural geometry: either a builder (below) or hand-written \`parts\`. The payload field \`stock\` exists only for a user who explicitly asked for stock models: NEVER set it, never use \`model\` or a stock hero id; the validator rejects them.

Payload: { "style": "clay-diorama", "hero": { "design"?: ${CHARACTER_DESIGNS.join("|")}, "hat"?: ${CHARACTER_HATS.join("|")}, "expression"?: ${CHARACTER_EXPRESSIONS.join("|")}, "skin"?, "hair"?, "colors"?, "seed"? }, "camera"?: "calm"|"dynamic", "worlds": [ { "set": <set>, "mood"?: ${MOODS.join("|")}, "from"?: { "word": "..", "n"?: 1 } | seconds, "transition"?: ${TRANSITIONS.join("|")}, "cast"?: [ { "who": "hero"|<id>, character fields, "at"?: <spot> } ] (max 3), "objects": [ <object> ] (max 14), "parts"?: [ world dressing parts ] (max ${MAX_WORLD_PARTS}), "shots"?: [ { "from"?, "kind"?, "move"?, "target"? } ], "beats": [ { "on": { "word": "..", "n"?: 1, "offset"?: s } | { "at": seconds }, "do": <beat>, ... } ] } ] }
Object: { "id": "a-z0-9-_", "label"?, "build"?: <builder>, "params"?: { builder params }, "parts"?: [ <part> ] (hand-written, or appended to a builder), "colors"?: { <role>: "#hex" }, "seed"?, "scale"?: 0.3-3, "at"?: <spot>, "rot"?: yaw degrees, "corner"?: back-left|back-right|front-left|front-right (pins it to a platform corner), "hidden"?: true (appears with pop-in), "motion"?: [..], "keys"?: [..] }. <spot> = an anchor (${Object.keys(GLOBAL_ANCHORS).join(", ")}), an object id or [x, z]. Objects without \`at\` fill the back and middle rows; the hero stands front-left by default.
- \`on.word\` binds a beat to the n-th occurrence (n starts at 1) of a spoken word; accents and punctuation are ignored, short stems work (llena, llenar). Never invent words that are not in the narration.
- Worlds without \`from\` are spaced evenly; give \`from\` on the word where the new idea starts. Captions are drawn by the format; never write caption text.

How to model from scratch (hand-written \`parts\`, 1-${MAX_PARTS} per object): SILHOUETTE FIRST (the outline must read at 1/10 size: one big block, one smaller block, one tall or round piece), then 12-40 parts, round the edges (\`radius\` 0.04-0.12 on boxes), PIVOTS for anything that moves (a door hinge, a lid, an arm: set \`pivot\` at the hinge and a state or motion rotates it), COLOR ROLES instead of hex (${PART_ROLES.join(", ")}: the look recolors them, an object can override with \`colors\`), and ONE signature detail that says what the thing is (a glowing core, a hand wheel, a screen with windows). Units are metres, the object stands on y = 0 and faces +z; a part's \`pos\` is relative to its parent's centre; children hang from a parent with \`parent\`.
Part: { "id", "shape", "size", "points"?, "radius"?, "pos"?, "rot"? (degrees), "scale"?, "pivot"?, "parent"?, "role"? | "color"?, "material"?: ${PART_MATERIALS.join("|")}, "emissive"?, "opacity"?, "states"?: { open|fill|heat|glow|spin: { pos?, rot?, scale?, emissive?, color?, from?, to? } }, "keys"?: [ { "at": seconds | { "word" }, "pos"?, "rot"?, "scale"?, "opacity"?, "ease"? } ], "motion"?: [..] }.
Shapes: ${shapes}.
States make a part react to beats: ${states}. An effect value is what the part reaches at 1 (\`from\`/\`to\` window the channel: an LED that lights between fill 0.4 and 0.5; \`grow: "bottom"\` keeps the base fixed). \`open\`, \`close\` and \`fill\` beats need a part with that state; the error names the acts an object accepts.
Motion presets (names or { type, at, until, amp, speed, parts, axis, lift }): ${motion}.

Builders (procedural kits; give { "build": <kind>, "params"?: { seed, size, colors by role, own params } }). Characters go in \`cast\` and \`hero\` (character fields), never in \`objects\`:
- character: head, torso, arms and legs with pivots, blinking eyes, mouth and brows. Designs ${CHARACTER_DESIGNS.join(", ")}; hats ${CHARACTER_HATS.join(", ")}; expressions ${CHARACTER_EXPRESSIONS.join(", ")}. Emotes: ${EMOTES.join(" ")}.
${builders}

Style: ${styles}
Moods: ${MOODS.map((m) => `${m} = ${MOOD_DOCS[m]}`).join("; ")}.

Sets. CHOOSE BY TOPIC, one idea per world, and use at least 3 DIFFERENT sets in a 30-45 s video (never the same set twice in a row):
${sets}

Beat kinds (\`do\`):
${beats}
Props take every act except open, close and fill, which need the matching state; heat, light-up and spin work on any object.

Camera: the engine plans it. It frames the hero and the target inside the safe box, keeps the hero under 35 % of the frame height and never cropped, mixes about 25 % wide / 50 % close / 25 % medium, never two wides in a row, puts a close or macro shot on every causal beat (open, fill, heat, light-up...) and never leaves the camera idle. Shots: ${shots}. Moves: ${Object.keys(MOVES).join(", ")}. Give \`shots\` only to force a framing. Name tags get a leader line to their object; stamps avoid the hero and the target.

Rules:
- BEAT DENSITY: at least one beat every 2 s in each world, aim for 1.2-1.5 s; several beats on the same strong word are good (state change + label + emote). Hook: the first beat lands on the first sentence.
- Every world needs: an object state change driven by a word, a hero reaction (emote or walk) and a close-up cause: show the mechanism, not the label.
- Build the topic as literal drawable objects: memory is a battery or shelf, a program is a window on a monitor, a leak is a pipe system with a valve, speed is a conveyor, security is a padlock. One idea per world, 3-6 objects.
- Text (\`label\`, \`stamp\`) is 1-3 words in the video language, at most 22 characters for a label and 18 for a stamp. Use \`stamp\` on the 3-4 strongest words only.
- Vary the beat kinds; never the same kind three times in a row. Use \`shake\` and \`burst\` sparingly.
- Never write sources or URLs on screen. Do not invent figures.

Example payload (Spanish words; a hand-written model next to builders):
\`\`\`json
${JSON.stringify(EXAMPLE_PAYLOAD, null, 1)}
\`\`\`
`;
}
