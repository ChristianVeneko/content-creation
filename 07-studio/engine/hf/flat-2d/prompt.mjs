// Spec-writer guidance for LLM providers, generated from the registries so it can never drift from the schema.
import { STYLES, STYLE_IDS } from "./styles.mjs";
import { SETTINGS, SETTING_IDS, settingPropNames } from "./settings/index.mjs";
import { KITS, KIT_KINDS } from "./kit/index.mjs";
import { BEAT_SPEC, BEAT_KINDS, CLIPS, SHOW_HOW, TRANSITIONS, CAMERA_MOVES, PAGES } from "./schema.mjs";
import { DESIGNS, DESIGN_IDS } from "./rig.mjs";
import { ICON_NAMES } from "./icons.mjs";
import { AT_IDS, CAST_AT_IDS, ROLES } from "./layout.mjs";
import { EXAMPLE_PAYLOAD } from "./example.mjs";

const props = settingPropNames();
export const promptSection = `## Format: flat-2d (flat vector worlds with characters, app replicas and a travelling camera)

Output \`hf\` (this payload) next to the narration. Everything on screen is bound to a spoken word with on: { word, n? } (n = n-th occurrence of that word in the narration; accents and punctuation are ignored). Write the narration first, then bind every cue to words that really appear in it.

### Mode
- "single" (default): ONE giant world, ONE camera, no cuts. Each scene is a station joined by a path that draws itself while the camera travels and zooms out between blocks. Use it for process / step-by-step / how-it-works / duel videos.
- "multi": separate worlds joined by transitions (${TRANSITIONS.join(", ")}). Use it for stories, rankings, lists of unrelated items.

### Styles (hf.style)
${STYLE_IDS.map((id) => `- ${id}: ${STYLES[id].about}`).join("\n")}

### Settings (scene.setting) and their named props (targets for effects, chips, camera, pointing)
${SETTING_IDS.map((id) => `- ${id}: ${SETTINGS[id].about}. Props: ${props[id].join(", ")}`).join("\n")}

### Replicas (scene.props[].kind); slots (at): ${AT_IDS.join(", ")}; sizes: s, m, l
${KIT_KINDS.map((k) => `- ${k}: ${KITS[k].about}. Fields: ${KITS[k].fields.join(", ")}`).join("\n")}
Browser pages: ${PAGES.join(", ")}. Max 6 replicas and 3 characters per scene. Use replicas instead of loose icons: a real-looking browser, chat, stats panel, chart, phone, list.

### Characters (hf.cast[] design; scene.cast[] who, at, facing)
${DESIGN_IDS.map((id) => `- ${id}: ${DESIGNS[id].about}`).join("\n")}
Slots: ${CAST_AT_IDS.join(", ")}. Facing: front, left, right (3/4 views). Sizes S, M, L. Clips (beat act): ${CLIPS.join(", ")}.

### Beats (scene.beats[]): { on: { word, n? }, do, ...params }
${BEAT_KINDS.map((k) => `- ${k} (${[...BEAT_SPEC[k].req, ...BEAT_SPEC[k].opt.map((o) => o + "?")].join(", ")}): ${BEAT_SPEC[k].about}`).join("\n")}
show/hide how: ${SHOW_HOW.join(", ")}. camera move: ${CAMERA_MOVES.join(", ")}. Colors are roles: ${ROLES.join(", ")}.
Icons (Phosphor only): ${ICON_NAMES.join(", ")}.

### Script rules
- Hook inside the first 2 seconds; something new on screen every 3-5 seconds; short spoken sentences.
- Every sentence must be drawable: bind it to a replica, a character action or a camera move.
- One number per scene at most. No sources or URLs of real sources in on-screen text. Mark uncertain facts so the writer can verify them.
- Replicas hold the story (type the URL, roll the numbers, draw the chart); characters react (emote, point, shrug); at most one hero word per scene.
- Scenes need at least 2.5 seconds each; scene.enter = { word } of the first word of that scene. The first scene starts at 0.
- Text on screen is short: labels up to 24 characters, chips up to 3 words.

### Example payload
\`\`\`json
${JSON.stringify(EXAMPLE_PAYLOAD, null, 1)}
\`\`\`
`;
