// Per-template spec-writer prompt: the LLM reads the shared rules plus only the sections of the chosen template's
// family, instead of the whole manual. This keeps every generation call smaller (fewer input tokens).
import { ART_LOOKS, FORMAT_2D_LOOKS, usesIllustratedKit } from "./illustrated.mjs";
import { usesPixelKit } from "./pixel.mjs";
import { usesReelsKit } from "./reels.mjs";
import { usesThreeKit } from "./scene3d.mjs";
import { TEMPLATE_IDS, canonicalTemplateId, usesClassicLayout } from "./spec.mjs";

const FAMILY_SECTIONS = ["Template `illustrated`", "Illustrated-kit templates", "3D templates", "Pixel templates", "Reels templates"];

/** Split markdown into level-2 sections: [{ head, intro, subs: [{ head, body }] }]; text before the first "## " is the preamble. */
function parse(md) {
  const lines = md.split("\n");
  const pre = [];
  const sections = [];
  let sec = null;
  let sub = null;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      sec = { head: line, intro: [], subs: [] };
      sub = null;
      sections.push(sec);
    } else if (line.startsWith("### ") && sec) {
      sub = { head: line, body: [] };
      sec.subs.push(sub);
    } else if (sub) sub.body.push(line);
    else if (sec) sec.intro.push(line);
    else pre.push(line);
  }
  return { pre, sections };
}

const familyOf = (head) => FAMILY_SECTIONS.find((f) => head.slice(3).startsWith(f)) ?? null;

/**
 * "## Creative mode: <family>" sections hold the originals-first guidance (custom sprites, models, fx). They go only
 * to the subscription path (Claude Code), which can afford the freedom; API providers keep the catalog-first rules.
 */
const CREATIVE = "## Creative mode:";
const isCreative = (head) => head.startsWith(CREATIVE);
function keepCreative(id, head) {
  const family = head.slice(CREATIVE.length).trim().toLowerCase();
  if (family === "pixel") return usesPixelKit(id);
  if (family === "3d") return usesThreeKit(id);
  if (family === "reels") return usesReelsKit(id);
  if (family === "2d" || family === "illustrated") return usesIllustratedKit(id) || usesClassicLayout(id); // drawings + 2D fx
  return true;
}

/** Which `###` subsections of a family section the template needs. */
function keepSub(id, family, subHead) {
  if (family === "Illustrated-kit templates") {
    if (ART_LOOKS.includes(id)) return subHead.startsWith("### Art-style looks");
    if (FORMAT_2D_LOOKS.includes(id)) return subHead.startsWith("### Depth formats");
    return subHead.includes(`\`${id}\``);
  }
  if (family === "3D templates") return subHead.includes(`\`${id}\``);
  return true;
}

/** Which family sections the template needs. */
function keepFamily(id, family) {
  if (family === "Template `illustrated`") return usesIllustratedKit(id);
  if (family === "Illustrated-kit templates") return usesIllustratedKit(id) && id !== "illustrated";
  if (family === "3D templates") return usesThreeKit(id);
  if (family === "Pixel templates") return usesPixelKit(id);
  if (family === "Reels templates") return usesReelsKit(id);
  return true;
}

/**
 * The spec-writer prompt for one template: shared sections plus the template's family sections, with only its own
 * subsections inside multi-template sections. Unknown or missing template ids get the full manual. `creative` (the
 * Claude Code subscription path) adds the template family's "Creative mode" sections; otherwise they are dropped.
 */
export function specWriterPromptFor(templateId, fullPrompt, { creative = false } = {}) {
  const id = canonicalTemplateId(templateId);
  const known = TEMPLATE_IDS.includes(id);
  if (!known && creative) return fullPrompt;
  const { pre, sections } = parse(fullPrompt);
  if (!known) {
    const out = [...pre];
    for (const s of sections) if (!isCreative(s.head)) out.push(s.head, ...s.intro, ...s.subs.flatMap((x) => [x.head, ...x.body]));
    return out.join("\n");
  }
  const out = [...pre];
  for (const s of sections) {
    if (isCreative(s.head)) {
      if (creative && keepCreative(id, s.head)) out.push(s.head, ...s.intro, ...s.subs.flatMap((x) => [x.head, ...x.body]));
      continue;
    }
    const family = familyOf(s.head);
    if (family && !keepFamily(id, family)) continue;
    out.push(s.head, ...s.intro);
    for (const sub of s.subs) if (!family || keepSub(id, family, sub.head)) out.push(sub.head, ...sub.body);
  }
  return out.join("\n");
}
