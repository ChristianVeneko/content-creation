// Spec-writer guidance for LLM providers: generated from the catalog so it always matches what the runtime can draw.
import { STYLES, STYLE_GUIDE } from "./styles.mjs";
import { SETTINGS, KINDS, kindActs, BEAT_KINDS, BEAT_DOCS, EMOTES, TRANSITIONS, MOODS, MOOD_DOCS, HEROES, SHOTS, MOVES, GLOBAL_ANCHORS } from "./catalog.mjs";

/** A rich valid payload (Spanish narration words). Four worlds, four settings, word-bound beats of every family. */
export const EXAMPLE_PAYLOAD = {
  style: "clay-diorama", hero: "robo", camera: "dynamic",
  worlds: [
    { setting: "desk", mood: "warm", cast: [{ who: "hero", at: "left", size: "L" }],
      shots: [{ kind: "wide", move: "dolly-in" }, { kind: "close", target: "monitor", move: "push" }, { kind: "over-shoulder", target: "monitor" }],
      beats: [
        { on: { word: "computadora" }, do: "emote", who: "hero", symbol: "wave" },
        { on: { word: "computadora" }, do: "stamp", text: "SE CUELGA" },
        { on: { word: "programas" }, do: "light-up", target: "monitor" },
        { on: { word: "programas" }, do: "open", target: "monitor" },
        { on: { word: "ventanas" }, do: "label", target: "monitor", text: "Programas" },
        { on: { word: "memoria" }, do: "pop-in", target: "ram-stick" },
        { on: { word: "memoria" }, do: "walk", who: "hero", to: "ram-stick" },
        { on: { word: "llena" }, do: "fill", target: "ram-stick", value: 1 },
        { on: { word: "llena" }, do: "shake", target: "monitor", dur: 1.2 },
        { on: { word: "llena" }, do: "emote", who: "hero", symbol: "no" },
      ] },
    { setting: "warehouse", mood: "cool", transition: "slide", cast: [{ who: "hero", at: "center" }],
      beats: [
        { on: { word: "almacen" }, do: "light-up", target: "shelf-l" },
        { on: { word: "almacen" }, do: "fill", target: "shelf-l", value: 0.35 },
        { on: { word: "cajas" }, do: "pop-in", target: "crate-3" },
        { on: { word: "cajas" }, do: "pop-in", target: "crate-4" },
        { on: { word: "cajas" }, do: "label", target: "crate-1", text: "Datos" },
        { on: { word: "lleno" }, do: "fill", target: "shelf-l", value: 1 },
        { on: { word: "lleno" }, do: "shake", target: "shelf-l" },
        { on: { word: "camion" }, do: "pop-in", target: "truck" },
        { on: { word: "camion" }, do: "open", target: "door" },
        { on: { word: "sacar" }, do: "move", target: "crate-1", to: "truck" },
        { on: { word: "sacar" }, do: "emote", who: "hero", symbol: "punch" },
      ] },
    { setting: "server-room", mood: "alert", transition: "drop", cast: [{ who: "hero", at: "right" }],
      shots: [{ kind: "wide", move: "orbit" }, { kind: "close", target: "hard-disk" }, { kind: "low" }],
      beats: [
        { on: { word: "disco" }, do: "light-up", target: "hard-disk" },
        { on: { word: "disco" }, do: "spin", target: "hard-disk", dur: 2.4 },
        { on: { word: "lento" }, do: "stamp", text: "LENTISIMO" },
        { on: { word: "lento" }, do: "emote", who: "hero", symbol: "faint" },
        { on: { word: "datos" }, do: "burst", target: "rack-2" },
        { on: { word: "datos" }, do: "pulse", target: "rack-1" },
        { on: { word: "trabaja" }, do: "shake", target: "hard-disk" },
        { on: { word: "trabaja" }, do: "heat", target: "hard-disk" },
        { on: { word: "espera" }, do: "label", target: "hard-disk", text: "Disco lento" },
      ] },
    { setting: "kitchen", mood: "alert", transition: "iris", cast: [{ who: "hero", at: "left", size: "L" }],
      beats: [
        { on: { word: "calor" }, do: "heat", target: "pot" },
        { on: { word: "calor" }, do: "fill", target: "thermometer", value: 0.5 },
        { on: { word: "calienta" }, do: "fill", target: "thermometer", value: 0.9 },
        { on: { word: "calienta" }, do: "shake", target: "pot", dur: 1.4 },
        { on: { word: "calienta" }, do: "emote", who: "hero", symbol: "no" },
        { on: { word: "ventilador" }, do: "cool", target: "pot" },
        { on: { word: "ventilador" }, do: "fill", target: "thermometer", value: 0.3 },
        { on: { word: "reiniciar" }, do: "burst", target: "pot" },
        { on: { word: "reiniciar" }, do: "emote", who: "hero", symbol: "thumbs-up" },
        { on: { word: "reiniciar" }, do: "stamp", text: "REINICIA" },
      ] },
  ],
};

export function buildPromptSection() {
  const short = (t, n = 80) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
  const styles = ["| style | mood | good for | avoid |", "|---|---|---|---|", ...STYLES.map((s) => { const g = STYLE_GUIDE[s.id]; return `| ${s.id} | ${g.mood} | ${g.goodFor} | ${g.avoid} |`; })].join("\n");
  const settings = ["| setting | suits topics | NOT for | props (beat targets: id = kind) |", "|---|---|---|---|", ...Object.entries(SETTINGS).map(([id, s]) => `| ${id} | ${s.topics.slice(0, 9).join(", ")} | ${s.avoid.join(", ")} | ${Object.entries(s.props).map(([pid, p]) => `${pid}${p.hidden ? "*" : ""} = ${p.kind === "model" || p.kind === "car" ? p.model : p.kind}`).join(", ")} |`)].join("\n");
  const kinds = Object.entries(KINDS).map(([k, v]) => `- ${k}: ${short(v.about, 120)}${v.acts.length ? ` Extra acts: ${v.acts.join(", ")}.` : ""}`).join("\n");
  const beats = BEAT_KINDS.map((k) => `- ${k}: ${BEAT_DOCS[k]}`).join("\n");
  const heroes = HEROES.map((h) => `${h.id} (${short(h.about, 90)})`).join("; ");
  const shots = Object.entries(SHOTS).map(([k, s]) => `${k} (${s.about})`).join("; ");
  const moves = Object.keys(MOVES).join(", ");
  return `Format \`three-looks\`: 3D animated worlds with real models (HyperFrames + three.js). Today the look is \`clay-diorama\`: matte plasticine toys on a rounded platform, soft warm studio light, soft shadows. The picture is rendered from your JSON payload in \`spec.hf\`; you write no code. The narration is yours to write in the video language; the payload is language-agnostic, but every \`on.word\` must be a word that is actually spoken.

Modes (\`spec.mode\`): "multi" (default) = one world per idea (6-10 s each) joined by clay transitions (iris, slide, drop, pop); "single" = ONE continuous diorama row: the camera travels from station to station along a path while the hero walks, no cuts. The same payload works in both modes.

Payload: { "style": "clay-diorama", "hero": <hero>, "camera"?: "calm"|"dynamic", "worlds": [ { "setting": <setting>, "mood"?: ${MOODS.join("|")}, "from"?: { "word": "..", "n"?: 1 } | seconds, "transition"?: ${TRANSITIONS.join("|")}, "cast"?: [ { "who": "hero"|<hero id>, "at"?: <anchor or prop>, "size"?: "S"|"M"|"L" } ], "shots"?: [ { "from"?: word|seconds, "kind"?: <shot>, "move"?: <move>, "target"?: <prop|hero> } ], "beats": [ { "on": { "word": "..", "n"?: 1 } | { "at": seconds }, "do": <beat kind>, ...fields } ] } ] }
- \`on.word\` binds a beat to the n-th occurrence (n starts at 1) of a spoken word; accents and punctuation are ignored, short stems work (llena, llenar). Never invent words that are not in the narration.
- Worlds without \`from\` are spaced evenly; give \`from\` on the word where the new idea starts. Captions are drawn by the format; never write caption text.

Style: ${styles}
Moods: ${MOODS.map((m) => `${m} = ${MOOD_DOCS[m]}`).join("; ")}. Match the mood to the sentence (alert for failures and heat, cool for calm explanations, night for late work).

Hero: ${heroes}. Default \`robo\` (the only hero with a full skeleton: real Wave, Yes, No, ThumbsUp, Jump, Dance, Death, Sitting and Punch clips). The hero is always on screen at 18 % of the frame height or more and reacts to the words. Extra cast members (max 3 per world) use another hero id.

Settings. CHOOSE BY TOPIC, one idea per world, and use at least 3 DIFFERENT settings in a 30-45 s video (never repeat the same setting twice in a row). Props are the \`target\` of beats; ids ending with * start hidden and appear with \`pop-in\`:
${settings}

Prop kinds and what each accepts besides pop-in, pop-out, grow, shrink, pulse, shake, light-up, dim, burst, move:
${kinds}
A beat whose act the target does not accept is rejected (for example \`open\` on a lamp); the error lists what it accepts.

Anchors for \`walk\`, \`move\` and \`cast.at\`: ${Object.keys(GLOBAL_ANCHORS).join(", ")} (and every prop id of the world). The hero stands at \`left\` by default, so props in the middle and right are free to act on.

Beat kinds (\`do\`):
${beats}
Emote symbols: ${EMOTES.join(" ")}.

Camera: shots ${shots}. Moves: ${moves}. Without \`shots\` the engine plans a camera that follows your beats (a shot every 3-4 s, always moving, never the same framing twice in a row). Give \`shots\` only to force a specific framing.

Rules:
- BEAT DENSITY: at least one beat every 2 s in each world, aim for 1.2-1.5 s; several beats on the same strong word are good (prop change + label + emote). Hook: the first beat lands on the first sentence (a stamp, a prop reaction or an emote).
- Every world needs: a prop state change driven by a word (open, light-up, fill, heat, move, pop-in or burst), a hero reaction (emote or walk) and a camera that follows it.
- Literal drawable metaphors: memory is a shelf of crates or a RAM stick, a program is a window on the monitor, overheating is a pot boiling with a thermometer, a slow disk is a hard disk spinning, traffic is a street with cars. One idea per world, at most one number per world.
- Text (\`label\`, \`stamp\`) is 1-3 words in the video language, at most 22 characters for a label and 18 for a stamp. Use \`stamp\` on the 3-4 strongest words only. Text never goes below the caption band; the engine places it.
- Vary the beat kinds; never the same kind three times in a row. Use \`shake\` and \`burst\` sparingly (the 4-6 most dramatic words).
- Never write sources or URLs on screen. Mark uncertain facts with [COMPROBAR] in the narration notes, not in the payload. Do not invent figures.

Example payload (Spanish words):
\`\`\`json
${JSON.stringify(EXAMPLE_PAYLOAD, null, 1)}
\`\`\`
`;
}
