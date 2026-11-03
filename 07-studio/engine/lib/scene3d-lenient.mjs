// Forgiving authoring for 3D scenes: fix the slips an agent makes most often before the strict schema runs, so a
// valid intent is never rejected over shape. Everything here only fills in or reshapes; it never drops content.
import { PART_ROLES, EASINGS } from "./scene3d-motion.mjs";

const slug = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "chip";

/** A flow chip written as a bare label becomes `{id, icon, label}` (ids stay unique, labels fit 10 characters). */
function chipObjects(chips) {
  const used = new Set();
  return chips.map((c, i) => {
    if (c && typeof c === "object") {
      used.add(c.id);
      return c;
    }
    const label = String(c).trim().slice(0, 10) || `Paso ${i + 1}`;
    let id = slug(label).slice(0, 24);
    for (let n = 2; used.has(id); n++) id = `${slug(label).slice(0, 20)}-${n}`;
    used.add(id);
    return { id, icon: "circle", label };
  });
}

/** `active` and step references written with a label ("Tú", "MODELO") resolve to the chip id; unknown refs stay as written. */
function resolveFlowRefs(flow) {
  const chips = flow.chips;
  const byId = new Set(chips.map((c) => c.id));
  const bySlug = new Map();
  for (const c of chips) {
    bySlug.set(slug(c.id), c.id);
    if (!bySlug.has(slug(c.label))) bySlug.set(slug(c.label), c.id);
  }
  const ref = (r) => (typeof r !== "string" || byId.has(r) ? r : (bySlug.get(slug(r)) ?? r));
  const out = { ...flow };
  if (flow.active !== undefined) out.active = ref(flow.active);
  if (Array.isArray(flow.steps)) {
    out.steps = flow.steps.map((st) => {
      if (!st || typeof st !== "object") return st;
      const next = { ...st };
      if (st.active !== undefined) next.active = ref(st.active);
      if (st.values && typeof st.values === "object") next.values = Object.fromEntries(Object.entries(st.values).map(([k, v]) => [ref(k), v]));
      return next;
    });
  }
  return out;
}

const fixFlow = (o) => {
  if (!o || o.type !== "flow" || !Array.isArray(o.chips)) return o;
  const withChips = o.chips.some((c) => typeof c === "string") ? { ...o, chips: chipObjects(o.chips) } : o;
  return resolveFlowRefs(withChips);
};

const ROLE_ALIASES = {
  primary: "body", main: "body", base: "body", wood: "body", wall: "body", floor: "body", ground: "body", skin: "body", fabric: "body", paper: "light", white: "light",
  secondary: "accent", highlight: "accent", detail: "accent", trim: "accent", metal0: "metal", metal1: "metal", steel: "metal", iron: "metal", chrome: "metal",
  black: "dark", shadow: "dark", ink: "dark", glass: "screen", display: "screen", monitor: "screen", light0: "light", lamp: "glow", emissive: "glow", neon: "glow", fire: "glow",
};
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** A part whose `role` is not one of PART_ROLES: a hex becomes `color`, a known synonym maps to its role, anything else falls back to `body`. */
function fixPartRole(p) {
  if (typeof p.role !== "string" || PART_ROLES.includes(p.role)) return p;
  const { role, ...rest } = p;
  if (HEX.test(role)) return rest.color === undefined ? { ...rest, color: role } : rest;
  const alias = ROLE_ALIASES[role.trim().toLowerCase()];
  return { ...rest, role: alias ?? "body" };
}

const clamp6 = (x) => (typeof x === "number" ? Math.min(6, Math.max(-6, x)) : x);

/** An easing written as "easeInOut", "ease-out", "cubic-in-out", "spring"... becomes one of EASINGS; unknown names return undefined (the default easing applies). */
function fixEase(e) {
  if (typeof e !== "string" || EASINGS.includes(e)) return e;
  const t = e.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-+|-+$/g, "");
  const parts = t.split("-").filter((w) => w !== "ease" && w !== "quad" && w !== "cubic" && w !== "quart" && w !== "quint" && w !== "sine" && w !== "expo" && w !== "circ");
  const name = parts.join("-");
  if (EASINGS.includes(name)) return name;
  if (name === "" || name === "inout" || name === "smooth" || name === "ease") return "in-out";
  if (name === "spring" || name === "overshoot") return "elastic";
  if (parts.includes("back")) return "back";
  if (parts.includes("elastic")) return "elastic";
  if (parts.includes("bounce")) return "bounce";
  if (parts[0] === "in" && parts[1] === "out") return "in-out";
  if (parts[0] === "out" || parts[0] === "decelerate") return "out";
  if (parts[0] === "in" || parts[0] === "accelerate") return "in";
  if (parts[0] === "none" || parts[0] === "constant") return "linear";
  return undefined;
}

/** Keyframes: offsets beyond the +-6 range are clamped, easing names are mapped to EASINGS (see fixEase). */
function fixKeys(keys) {
  return keys.map((k) => {
    if (!k || typeof k !== "object") return k;
    const out = { ...k };
    if (Array.isArray(k.pos)) out.pos = k.pos.map(clamp6);
    if (k.ease !== undefined) {
      const ease = fixEase(k.ease);
      if (ease === undefined) delete out.ease;
      else out.ease = ease;
    }
    return out;
  });
}

/** Walks any authored value; every part (has `shape`) gets its role repaired and every `keys` list its offsets clamped. */
function fixRoles(node) {
  if (Array.isArray(node)) return node.map(fixRoles);
  if (!node || typeof node !== "object") return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) out[k] = k === "keys" && Array.isArray(v) ? fixKeys(v) : fixRoles(v);
  return typeof out.shape === "string" ? fixPartRole(out) : out;
}

const fixVisual = (v) => {
  if (!v || typeof v !== "object") return v;
  const out = { ...v };
  if (v.world) out.world = fixRoles(v.world);
  if (Array.isArray(v.objects)) out.objects = fixRoles(v.objects);
  if (Array.isArray(v.overlay)) out.overlay = v.overlay.map(fixFlow);
  if (Array.isArray(v.fx)) out.fx = v.fx.map((f) => (f && f.type === "particles" && !f.kind ? { ...f, kind: "dust" } : f));
  return out;
};

/** @param {object} spec raw spec (not mutated) */
export function normalizeStageAuthoring(spec) {
  if (!spec || !Array.isArray(spec.scenes)) return spec;
  const withStage = spec.stage ? { ...spec, stage: fixRoles(spec.stage) } : spec;
  return { ...withStage, scenes: spec.scenes.map((s) => (s && s.visual && s.visual.type === "scene3d" ? { ...s, visual: fixVisual(s.visual) } : s)) };
}
