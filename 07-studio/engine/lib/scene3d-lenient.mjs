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

const fixVisual = (v) => {
  if (!v || typeof v !== "object") return v;
  const out = { ...v };
  if (Array.isArray(v.overlay)) out.overlay = v.overlay.map(fixFlow);
  if (Array.isArray(v.fx)) out.fx = v.fx.map((f) => (f && f.type === "particles" && !f.kind ? { ...f, kind: "dust" } : f));
  return out;
};

/** @param {object} spec raw spec (not mutated) */
export function normalizeStageAuthoring(spec) {
  if (!spec || !Array.isArray(spec.scenes)) return spec;
  return { ...spec, scenes: spec.scenes.map((s) => (s && s.visual && s.visual.type === "scene3d" ? { ...s, visual: fixVisual(s.visual) } : s)) };
}
