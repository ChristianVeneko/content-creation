// flat-2d HyperFrames format: data-driven flat 2D explainers (one big world and one camera, or several worlds).
import { STYLES, STYLE_IDS } from "./styles.mjs";
import { SETTINGS, SETTING_IDS } from "./settings/index.mjs";
import { payloadSchema as schema } from "./schema.mjs";
import { normalize as norm } from "./normalize.mjs";
import { promptSection as prompt } from "./prompt.mjs";

export const meta = {
  id: "flat-2d",
  name: "Flat 2D",
  about: "Flat vector worlds with rigged characters, app replicas and a travelling camera, drawn in SVG/HTML and animated with GSAP",
  modes: ["single", "multi"],
  styles: STYLE_IDS.map((id) => ({ id, name: STYLES[id].name, about: STYLES[id].about })),
  settings: SETTING_IDS.map((id) => ({ id, name: SETTINGS[id].name, about: SETTINGS[id].about })),
};
export const payloadSchema = schema;
export const promptSection = prompt;
export const normalize = norm;
export { compose } from "./compose.mjs";
