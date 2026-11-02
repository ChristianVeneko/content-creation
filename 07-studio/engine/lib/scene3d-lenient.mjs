// Forgiving authoring for 3D scenes: fix the slips an agent makes most often before the strict schema runs, so a
// valid intent is never rejected over shape. Everything here only fills in or reshapes; it never drops content.
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

const fixVisual = (v) => {
  if (!v || typeof v !== "object") return v;
  const out = { ...v };
  if (Array.isArray(v.overlay)) out.overlay = v.overlay.map((o) => (o && o.type === "flow" && Array.isArray(o.chips) && o.chips.some((c) => typeof c === "string") ? { ...o, chips: chipObjects(o.chips) } : o));
  if (Array.isArray(v.fx)) out.fx = v.fx.map((f) => (f && f.type === "particles" && !f.kind ? { ...f, kind: "dust" } : f));
  return out;
};

/** @param {object} spec raw spec (not mutated) */
export function normalizeStageAuthoring(spec) {
  if (!spec || !Array.isArray(spec.scenes)) return spec;
  return { ...spec, scenes: spec.scenes.map((s) => (s && s.visual && s.visual.type === "scene3d" ? { ...s, visual: fixVisual(s.visual) } : s)) };
}
