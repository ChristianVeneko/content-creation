// Spec-writer guidance for LLM providers: generated from the catalog so it always matches what the runtime can draw.
import { STYLE_GUIDE, PIXEL_SCALE_DOCS } from "./styles.mjs";
import { MECH_KINDS, MECH_DOCS, ITEMS, PATHS, EASES, LANDS, ITEM_STATES, STACK_LAYOUTS, AMBIENT_LEVELS } from "./schema.mjs";
import { loadCatalog, BEAT_DOCS, BEAT_KINDS, EMOTES, TRANSITIONS, WORKSHOP_THEMES, WORKSHOP_MAX_PROPS } from "./catalog.mjs";

const PIXEL_SCALES_TEXT = Object.entries(PIXEL_SCALE_DOCS).map(([k, v]) => `"${k}" = ${v}`).join(" ");

export function buildPromptSection() {
  const cat = loadCatalog();
  const styles = ["| style | mood | colours | good for | avoid |", "|---|---|---|---|---|", ...cat.styles.map((s) => { const g = STYLE_GUIDE[s.id]; return `| ${s.id} | ${g.mood} | ${s.palette.length}${s.mono ? " (monochrome)" : ""} | ${g.goodFor} | ${g.avoid} |`; })].join("\n");
  const short = (t, n = 70) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
  const scen = ["| scenario | suits topics | NOT for | props (beat targets) |", "|---|---|---|---|", ...cat.scenarios.filter((s) => !s.dynamic).map((s) => `| ${s.id} | ${s.topics.slice(0, 7).join(", ")} | ${s.avoid.join(", ") || "-"} | ${s.props.map((p) => p.id).join(", ")} |`)].join("\n");
  const ws = cat.scenarios.find((s) => s.dynamic);
  const lib = cat.propLib.map((p) => `- ${p.kind} (${p.row}${p.fills ? ", fill" : ""}${p.opens ? ", open" : ""}): ${p.about}`).join("\n");
  const kinds = BEAT_KINDS.map((k) => `- ${k}: ${BEAT_DOCS[k]}`).join("\n");
  const mech = MECH_KINDS.map((k) => `- ${k}: ${MECH_DOCS[k]}`).join("\n");
  const heroes = cat.heroes.map((h) => `${h.id} (${h.about})`).join("; ");
  const example = {
    style: "pixel-snes-16bit", hero: "hoodie", brand: { handle: "@canal" },
    worlds: [
      { scenario: "phone-workshop", cast: [{ who: "hero", at: "left" }, { who: "cat", at: "right" }], beats: [
        { on: { word: "celular" }, do: "light", target: "phone" }, { on: { word: "celular" }, do: "hero-stamp", text: "CELULAR", color: "teal" },
        { on: { word: "calienta" }, do: "pulse", target: "phone" }, { on: { word: "calienta" }, do: "emote", who: "hero", symbol: "!" },
        { on: { word: "procesador" }, do: "open", target: "phone" }, { on: { word: "procesador" }, do: "label", target: "chip", text: "CPU", color: "yellow" },
        { on: { word: "procesador" }, do: "fill", target: "chip", value: 0.4 }, { on: { word: "trabaja" }, do: "point", who: "hero", target: "chip" },
        { on: { word: "trabaja" }, do: "emote", who: "cat", symbol: "dots" }, { on: { word: "parar" }, do: "fill", target: "chip", value: 0.9 },
        { on: { word: "parar" }, do: "shake", amp: 3 }, { on: { word: "parar" }, do: "hero-stamp", text: "PARAR", color: "red" }, { on: { word: "parar" }, do: "progress", value: 0.9, label: "CALOR" },
        { on: { word: "app" }, do: "react", who: "hero", symbol: "?" }, { on: { word: "calculos" }, do: "radial-burst", target: "chip" },
        { on: { word: "calculos" }, do: "push", target: "chip", amount: 1.25 }, { on: { word: "calculos" }, do: "shake", amp: 2 }, { on: { word: "bateria" }, do: "fill", target: "battery", value: 0.3 },
        { on: { word: "abre" }, do: "shake", amp: 2 }, { on: { word: "abre" }, do: "emote", who: "cat", symbol: "star" } ] },
      { scenario: "workshop-stage", theme: "bench", transition: "tiles", cast: [{ who: "hero", at: "left" }],
        props: [{ kind: "battery", id: "battery", at: "left" }, { kind: "thermometer", id: "thermo", at: "center" }, { kind: "flame", id: "flame", at: "right" }, { kind: "fan", id: "fan", row: "high", at: 0.8 }],
        beats: [
          { on: { word: "bateria" }, do: "fill", target: "battery", value: 0.8 }, { on: { word: "bateria" }, do: "pulse", target: "battery" },
          { on: { word: "energia" }, do: "light", target: "battery" }, { on: { word: "energia" }, do: "hero-stamp", text: "ENERGIA", color: "yellow" },
          { on: { word: "forma" }, do: "walk", who: "hero", to: "thermo" }, { on: { word: "calor" }, do: "fill", target: "thermo", value: 1 },
          { on: { word: "calor" }, do: "light", target: "flame" }, { on: { word: "calor" }, do: "shake", amp: 4 },
          { on: { word: "calor" }, do: "hero-stamp", text: "CALOR", color: "orange" }, { on: { word: "calor" }, do: "radial-burst", target: "flame" },
          { on: { word: "calor" }, do: "emote", who: "hero", symbol: "!" }, { on: { word: "calor" }, do: "counter", value: 45, label: "GRADOS" },
          { on: { word: "sube" }, do: "shake", amp: 3 }, { on: { word: "grados" }, do: "hero-stamp", text: "45 GRADOS", color: "red" } ] },
      { scenario: "post-office", beats: [
        { on: { word: "caja" }, do: "transform", target: "parcel", item: "box", state: "open" }, { on: { word: "cierras" }, do: "transform", target: "parcel", state: "closed" },
        { on: { word: "etiqueta" }, do: "transform", target: "parcel", state: "labelled", text: "PARA: EQUIPO" },
        { on: { word: "viaja" }, do: "travel", target: "parcel", to: "mailbox", item: "box", state: "labelled", path: "arc", trail: true, spin: true, land: "slam", text: "PUSH" },
        { on: { word: "viaja" }, do: "transform", target: "mailbox", state: "flag-up" }, { on: { word: "llega" }, do: "count", target: "mailbox", value: 1, label: "RECIBIDO" },
        { on: { word: "caja" }, do: "hero-stamp", text: "CERRADA", color: "teal" }, { on: { word: "viaja" }, do: "shake", amp: 3 }, { on: { word: "llega" }, do: "light", target: "mailbox" },
        { on: { word: "llega" }, do: "emote", who: "hero", symbol: "check" } ] },
    ],
  };
  return `Format \`pixel-world\`: animated pixel-art worlds (HyperFrames canvas). The picture is procedural and data-driven, so you write ONLY a JSON payload in \`spec.hf\`; no code. The narration text is yours to write in the video language; the payload is language-agnostic (every word in \`on.word\` must be a word that is actually spoken).

Modes (\`spec.mode\`): "multi" (default) = several worlds joined by transitions; "single" = one continuous level, the camera travels from world to world along a path, no cuts (\`layout\`: "strip" side-scroll, "tower" top-to-bottom). Every style works in both modes.

Payload: { "style": <style>, "hero": <hero>, "layout"?: "strip"|"tower", "flash"?: false, "pixelScale"?: "chunky"|"standard"|"fine", "brand"?: { "handle": "@name" }, "worlds": [ { "scenario": <scenario>, "from"?: { "word": "..", "n"?: 1 } | seconds, "transition"?: ${TRANSITIONS.join("|")}, "time"?: day|dusk|night, "cast"?: [ { "who": "hero"|<npc>, "at"?: left|center|right|<prop>, "size"?: S|M|L } ], "beats": [ { "on": { "word": "..", "n"?: 1 }, "do": <beat kind>, ...fields } ] } ] }
- \`on.word\` binds a beat to the n-th occurrence (n starts at 1) of a spoken word; accents and punctuation are ignored. Do not invent words that are not in the narration.
- Worlds without \`from\` are spaced evenly. Give \`from\` on the word where the new idea starts.
- Captions are drawn by the format itself, never add caption text.

Styles (one per video, applies to every scenario). CHOOSE BY TOPIC, never by habit:
${styles}
Default picks: tech and AI, phones, hardware, networks -> pixel-cyberpunk-neon, pixel-snes-16bit or pixel-crt-arcade; kids, friendly, everyday life, health -> pixel-snes-16bit or pixel-pico8; serious, security, privacy, mystery -> pixel-noir or pixel-crt-arcade; heat, energy, weather -> pixel-liquid-fire; nature, travel, stories -> pixel-dusk-lowres. The monochrome styles (pixel-gameboy-dmg, pixel-1bit-dither, pixel-virtual-red, 2-4 tones) are chosen only when the user asks for retro or handheld: in them progress bars, heat and colour coding barely read. Always set \`style\`; when unsure use pixel-snes-16bit.

Hero (the narrating mascot; leave \`hero\` out to use the default mascot, which is the one the user chose; name another only when the brief asks for a character): ${heroes}. NPCs (use in \`cast\`): ${cat.npcs.map((n) => `${n.id} (${n.about})`).join("; ")}.

Scenarios. CHOOSE BY TOPIC: read the "suits topics" column and pick the scenario whose tags match what the sentence is about. NEVER choose a scenario whose props contradict the topic (no AI machine, hospital, dungeon or shop for a phone-heat topic). Props are the \`target\` of beats; use only the listed props:
${scen}

COMPOSABLE SCENARIO \`workshop-stage\`: use it when no scenario above fits the sentence literally, or to draw a metaphor exactly. Give \`"props": [ { "kind": <library kind>, "id"?: "my-id", "at"?: left|center|right|0-1, "size"?: S|M|L, "row"?: floor|bench|high } ]\` (1-${WORKSHOP_MAX_PROPS} items) and optionally \`"theme"\`: ${WORKSHOP_THEMES.join("|")}. Prop ids default to the kind (battery, battery-2...); beats target those ids. Prop library (each reacts to fill, light, open, pulse, burst, recolor beats as written):
${lib}

Beat kinds (\`do\`):
${kinds}
Mechanism beats (the story told literally: things MOVE and CHANGE, they are not only labelled). Items: ${ITEMS.join(" ")}; \`path\`: ${PATHS.join("|")}; \`ease\`: ${EASES.join("|")}; \`land\`: ${LANDS.join("|")}; \`state\`: ${ITEM_STATES.join("|")}; \`layout\`: ${STACK_LAYOUTS.join("|")}; \`trail\`/\`spin\`: true. Origin and destination are props of the scenario, \`hero\`, or left|center|right:
${mech}
Emote symbols: ${EMOTES.join(" ")}. Colours: red yellow green teal blue purple orange pink white gold.

PLAN FIRST (write this checklist in your head, one line per narrated sentence, BEFORE the payload): sentence -> the ONE drawable noun -> what is drawn (prop and state) -> what moves, from where to where -> which prop changes state. Every sentence needs at least one drawn change AND one interaction beat (travel, transform, spawn, stack, vanish, count, compare, carry, reject or a prop action fill/open/close/light/dim/burst/recolor/coins/chop/stamp) inside its own seconds; stamps, labels and emotes alone do not count. The engine lints this and reports every sentence that fails ("coverage: sentence N ...").
LITERAL METAPHOR: one drawable noun per sentence; abstract ideas become objects. Commit = a box that closes (transform open -> closed -> labelled) and stays on the desk; push = that box travelling (arc, trail, land slam) to the mailbox/cloud, whose flag goes up; merge = two rails/pieces joining (travel both to the same prop); API = restaurant (a msg order slip travels to the kitchen, a dish travels back); cache = a shelf that fills (spawn tiles); error = reject at a gate. Use only props of the chosen scenario (or compose them with workshop-stage); the destination of a travel is always a prop that exists.
CONSISTENCY: one hero, one palette (one style), one scale (hero M, props as listed); the same noun keeps the same item and prop for the whole video (the box that was closed is the box that travels). Never repeat in a stamp or label a word that the caption is already showing; pick the concept word.
WORKED EXAMPLE, "commit vs push" (post-office: board, parcel, mailbox, chute): "Guardas tus cambios: commit." -> transform parcel (item box, open) on "Guardas", transform closed on "commit", label "COMMIT". "Pero nadie los ve." -> count on mailbox value 0 label "REMOTO" and compare parcel vs mailbox. "Con push los envias." -> travel parcel -> mailbox (arc, trail, spin, land slam) on "push", transform mailbox flag-up on "envias", count mailbox 1. "Cada commit se acumula." -> spawn board 3 commit items (pile).
WORKED EXAMPLE, "an API is a restaurant" (kitchen: rail, stove, window, pot; hero at left): "Tu pides un plato." -> travel from hero to window item msg (order slip, bezier) on "pides"; "La cocina lo prepara." -> light stove, fill pot, spawn pot 1 dish; "Y te lo devuelve." -> travel from window to hero item dish (arc, land bounce), count window 1 label "PEDIDOS".

Rules:
- Hook in the first 2 seconds: first beat on the first sentence (a hero-stamp or a prop reaction), never an empty start.
- Interaction density: at least one mechanism beat per sentence; travel/carry on the verbs (envia, lleva, manda, sube), transform on the verbs that change state (cierra, abre, etiqueta, activa), spawn/stack on plurals and "cada", reject on "no puede/bloquea/error". Do not use \`ambient\` unless asked: ${AMBIENT_LEVELS.join("|")} (default normal) is a user setting.
- BEAT DENSITY: at least one beat every 2 s of each world, aim for one per 1.5 s, several beats on the same strong word are fine (prop change + label + emote). The engine adds ambient reactions when a world is under 0.5 beats/s, but written beats are always better. 8-10 s per world; 3-4 worlds per 30 s video (single mode: the same 3-4 stations).
- Cast: the hero is size M by default; leave \`size\` out. Use L only for a deliberate close-up of a lone hero with almost no props, S for a tiny sidekick. A hero at L covers 28 % of the frame and hides the props, so it is the exception. Put the action on props in the middle of the frame; the lower third is dressed by the engine, never place text there.
- The HUD (\`progress\`, \`counter\`) sits under the caption band; labels are short (CALOR, CARGA) and never repeat the caption words.
- Literal, drawable metaphors: a token is a coin/tile, memory is a backpack, a server is a kitchen. One idea per sentence; maximum one number per scene.
- PUNCH (this is what makes the video feel alive): in every 10 s of narration put a \`hero-stamp\` or a \`shake\` on 8-12 of the strongest words in total: the hook word (stamp it in the first 2 seconds), every impact word, every number (stamp it with the number, \`"45 GRADOS"\`) and the payoff. About 0.7 punch events per second (hero-stamp, shake, radial-burst, emote) is the target; the engine adds shakes to stamps, bursts and pushes and pads weak worlds, but beats you write are always better. Stamps need 1.6 s between them; \`text\` is at most 11 characters.
- Vary the beat kinds (a prop change, an emphasis, a camera move, an emote); never the same kind three times in a row. Use \`push\` on 1-2 impact beats per world; the camera also drifts slowly by itself.
- \`flash\` (a white blink under 2 frames) is a photosensitivity risk and stays OFF unless the brief asks for a high-energy or hype video; then set \`"flash": true\` and write at most 3 \`flash\` beats per 10 s (the engine drops the rest, and any before 0.5 s). Never use it on a calm explainer.
- \`pixelScale\` is the pixel quality; leave it out (standard) unless the user or the topic asks: ${PIXEL_SCALES_TEXT}
- GAME FEEL (the PIXEL guide): the video IS a video game and each idea is a different level (world). One literal metaphor per sentence; a visual change at least every 2 seconds; one giant stamped word per idea (the concept, no more than one per idea); a sentence that cannot be drawn gets rewritten. Prefer game vocabulary you do not need to explain (lives, coins, levels, enemies, pipes). Change the WORLD to change the video, not the idea: when the brief gives a theme (christmas, desert, beach, mars, volcano, arctic, jungle, western, haunted, temple, mine, space, sea) pick the scenario of that theme for every world of the video.
- NO CALL TO ACTION: never write comment, follow or subscribe lines ("comenta X", "sigueme", "te mando la guia") in the narration or in stamps, and never use \`brand.follow\`. The last sentence is the payoff of the idea, shown with a stamp.
- No sources or URLs in on-screen text. Mark uncertain facts with [COMPROBAR] in the narration notes, not in the payload.
- Text fields (\`text\`, \`label\`) are 1-3 words in the video language, at most 16 characters per chip.

Example payload (language of the words is Spanish here):
\`\`\`json
${JSON.stringify(example, null, 1)}
\`\`\`
`;
}
