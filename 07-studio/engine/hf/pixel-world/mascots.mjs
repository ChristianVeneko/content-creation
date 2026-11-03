// Mascots: data-defined hero designs stored at 03-assets/mascots/<id>/mascot.json, selectable as `hf.hero` in pixel-world.
// A mascot is a parametric figure (see runtime/cast.js `figure`) whose colours are semantic ramp names (M.skin, M.dark...)
// or explicit 5-hex ramps, so the runtime remaps it to every one of the 14 pixel palettes. `index.json` names the default.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { CC_ROOT } from "../../lib/env.mjs";

export const MASCOT_DIR = () => join(process.env.CC_MASCOTS_DIR || join(CC_ROOT, "03-assets", "mascots"));
export const BUILTIN_DEFAULT_HERO = "hoodie";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "use a #rrggbb colour");
const ramp = z.union([z.string().regex(/^[a-z]+$/, "ramp name such as skin, dark, stone, white, red, green"), z.array(hex).length(5, "a ramp has 5 hex colours, dark to light")]);
export const HAIR_STYLES = ["short", "pony", "beard", "curly", "none"];
export const HATS = ["none", "cap", "wizard", "helmet"];

export const mascotSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,23}$/, "id: lowercase a-z, 0-9 and dashes, up to 24 chars"),
  name: z.string().min(1).max(40),
  about: z.string().min(1).max(280),
  kind: z.enum(["human", "robot"]).default("human"),
  skin: ramp.default("skin"),
  hair: ramp.default("wood"),
  hairDark: hex.optional(),
  hairStyle: z.enum(HAIR_STYLES).default("short"),
  top: ramp.default("orange"),
  bottom: ramp.default("blue"),
  shoe: ramp.default("white"),
  shoeAccent: ramp.optional(),
  hat: z.enum(HATS).default("none"),
  hatRamp: ramp.optional(),
  robe: z.boolean().optional(),
  accent: ramp.optional(),
  glasses: z.boolean().default(false),
  backpack: ramp.optional(),
  stripe: ramp.optional(),
  logo: ramp.optional(),
}).strict();

let cache = null;
/** All valid mascots found on disk, sorted by id. An invalid file is reported in `errors`, never thrown. */
export function loadMascots() {
  const dir = MASCOT_DIR();
  if (cache && cache.dir === dir) return cache;
  const out = { dir, mascots: [], errors: [], default: BUILTIN_DEFAULT_HERO };
  if (existsSync(dir)) {
    for (const d of readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = join(dir, d.name, "mascot.json");
      if (!existsSync(file)) continue;
      try {
        const parsed = mascotSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
        if (!parsed.success) { out.errors.push(`${d.name}/mascot.json: ${parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")}`); continue; }
        if (parsed.data.id !== d.name) { out.errors.push(`${d.name}/mascot.json: id "${parsed.data.id}" must equal the folder name`); continue; }
        out.mascots.push(parsed.data);
      } catch (e) { out.errors.push(`${d.name}/mascot.json: ${e.message}`); }
    }
    try {
      const idx = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
      if (typeof idx.default === "string") out.default = idx.default;
    } catch { /* no index: the built-in default applies */ }
  }
  cache = out;
  return out;
}
export const resetMascotCache = () => { cache = null; };
export const mascotIds = () => loadMascots().mascots.map((m) => m.id);
export const getMascot = (id) => loadMascots().mascots.find((m) => m.id === id) ?? null;
/** The hero used when the payload names none: the mascot chosen in index.json when it exists, else the built-in hoodie kid. */
export function defaultHeroId() {
  const { default: d, mascots } = loadMascots();
  return d === BUILTIN_DEFAULT_HERO || mascots.some((m) => m.id === d) ? d : BUILTIN_DEFAULT_HERO;
}
