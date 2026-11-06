// The Node -> Blender hand-over: one JSON job with everything scripts/blender/scene.py needs, already resolved from the
// planned scene (lib/scene3d.mjs planThree): the look, the world (ground, backdrop, parts, crowd), the objects with
// their parts and per-frame transforms, the camera per frame (move + shots/cameraKeys), connections and fx. Blender never
// re-implements the planning; it builds meshes and sets transforms. Coordinates stay in three.js space (y up); the Python
// side converts to Blender (z up). Pure (no Node built-ins besides what the imports bring).
import { boundsOf, LOOK3D, look3dOf, modelOf, objectHeight, RENDER3D } from "./scene3d.mjs";
import { customHeight, motionList, partCenters } from "./scene3d-motion.mjs";
import { BLENDER_LOOKS, blenderLook, colorOf, mixHex } from "./blender-looks.mjs";
import { collapseTrack, r4, sceneSampler } from "./blender-motion.mjs";
import { MODEL_KINDS, proxyParts } from "./blender-parts.mjs";

/** Render settings: Eevee, the video's frame size and rate. `scale` (percent) renders smaller for quick previews. */
export const BLENDER_RENDER = { engine: "eevee", samples: 16, scale: 100 };

const DEFAULT_KIND_COLOR = { coin: "#F5B83D", tree: "#4CB96B", cloud: "#FFFFFF" };
/** Part fields the job carries (the rest of the spec part is drawn from them). */
const NODE_FIELDS = ["id", "shape", "size", "points", "radius", "text", "pivot", "parent"];

/** Material family and glow of a part: mirrors PartMat in src/three/custom.tsx. */
export function partFinish(p, look) {
  const mat = p.material ?? "auto";
  const role = p.role ?? "body";
  if (mat === "emissive" || (mat === "auto" && role === "glow")) return { mat: "emissive", emissive: Math.max(1, p.emissive ?? 1) };
  if (mat !== "auto") return { mat, emissive: p.emissive ?? 0 };
  if (role === "metal") return { mat: "metal", emissive: p.emissive ?? 0 };
  if (role === "screen") return { mat: "emissive", emissive: Math.max(0.35, p.emissive ?? 0.35) };
  return { mat: look.material, emissive: p.emissive ?? 0 };
}

/**
 * Build the Blender job for a resolved 3D spec.
 * @param {{spec: object, timeline: {scenes: {from: number, durationInFrames: number}[], totalFrames: number}, plans: object[], models?: Record<string, string>, pubDir?: string, fontPath?: string, scale?: number}} a
 *   models: model id -> path relative to pubDir (lib/three-assets.mjs stageThreeAssets), used by stock model kinds
 * @returns {object} the job (JSON-serializable); job.warnings lists what Blender cannot express
 */
export function blenderJob({ spec, timeline, plans, models = {}, pubDir = "", fontPath = null, scale = 100 }) {
  const fps = spec.format.fps;
  const lookId = look3dOf(spec);
  const look = blenderLook(lookId);
  const palette = spec.theme.palette;
  const warnings = [];
  const warn = (m) => {
    if (!warnings.includes(m)) warnings.push(m);
  };
  if (look.fallback) warn(`3D look "${look.requested}" has no Blender look entry yet; using clay-diorama colors and lights`);
  const profile = RENDER3D[lookId] ?? RENDER3D["clay-diorama"];
  const cycle = [palette.accent, palette.accent2 ?? palette.accent, palette.accent3 ?? palette.accent];
  const n = spec.scenes.length;
  const proxied = new Set();
  const abs = (id) => (id && models[id] ? `${pubDir}/${models[id]}` : null);

  const nodeOf = (p, color) => {
    const fin = partFinish(p, look);
    const node = { color, mat: fin.mat, emissive: fin.emissive };
    for (const f of NODE_FIELDS) if (p[f] !== undefined) node[f] = p[f];
    if (p.textColor) node.textColor = colorOf(palette, look, p.textColor, "#FFFFFF");
    if (p.opacity !== undefined) node.opacity = p.opacity;
    return node;
  };
  const partColor = (p, body, accent) => {
    const role = p.role ?? "body";
    const fallback = role === "accent" || role === "glow" ? accent : role === "dark" ? look.dark : role === "light" ? look.light : role === "screen" ? look.screen : role === "metal" ? "#CDD1DA" : body;
    return colorOf(palette, look, p.color, fallback);
  };
  /** Nodes of a part list with their per-frame local transforms (static parts carry a single sample). */
  const buildParts = (sampler, owner, parts, body, accent, ctx, frames, camYawAt) => {
    const centers = partCenters(parts);
    return parts.map((p, i) => {
      const node = nodeOf(p, partColor(p, body, accent));
      const samples = [];
      for (let f = 0; f < frames; f++) samples.push(sampler.partAt(owner, parts, centers, ctx, i, f, camYawAt ? camYawAt(f) : null));
      node.track = collapseTrack(samples);
      if (samples.some((s) => s[9] < 0.999)) node.fade = true;
      return node;
    });
  };

  const scenes = spec.scenes.map((s, i) => {
    const plan = plans[i];
    const from = timeline.scenes[i].from;
    const frames = i === n - 1 ? timeline.scenes[i].durationInFrames : timeline.scenes[i + 1].from - from;
    const v = s.visual?.type === "scene3d" ? s.visual : { type: "scene3d", objects: [] };
    const objs = v.objects ?? [];
    const sampler = sceneSampler({ plan, objects: objs, lookId, enter: look.enter, index: i, fps, frames });
    const { min, max } = boundsOf(plan.objects.length ? plan.objects : [{ pos: [0, 0, 0], scale: 1, h: 1 }]);
    const center = [r4((max[0] + min[0]) / 2), r4((max[2] + min[2]) / 2)];
    const half = [r4((max[0] - min[0]) / 2), r4((max[2] - min[2]) / 2)];
    const w = plan.world;
    // the keyed backdrop is blended halfway toward the palette background (palette text stays readable on it)
    const wb = w?.backdrop ? mixHex(colorOf(palette, look, w.backdrop, palette.bg[0]), palette.bg[0], 0.5) : null;
    const bgStops = wb ? [mixHex(wb, "#FFFFFF", 0.08), wb, mixHex(wb, "#000000", 0.28)] : look.bg(palette);
    const groundBase = look.ground ? look.ground(palette) : mixHex(bgStops.at(-1), "#000000", 0.3);
    let ground = { kind: "plane", color: groundBase, size: Math.max(60, half[0] * 4, half[1] * 4), center, half, look: true };
    if (w?.ground && w.ground.kind !== "look") {
      const gc = w.ground.color ? mixHex(colorOf(palette, look, w.ground.color, groundBase), palette.bg[0], 0.4) : groundBase;
      ground = { kind: w.ground.kind ?? "plane", color: gc, size: w.ground.size ?? (w.ground.kind === "disc" ? Math.max(half[0], half[1]) * 2 + 4 : 60), center, half, accent: palette.accent };
    }
    if (ground.kind === "mirror") warn("ground mirror is rendered as a glossy plane (no live reflections in the Eevee setup)");

    const objects = objs.map((o, k) => {
      const pl = plan.objects[k];
      const body = colorOf(palette, look, o.color, DEFAULT_KIND_COLOR[o.kind] && lookId !== "neon-glass" ? DEFAULT_KIND_COLOR[o.kind] : cycle[(k + i) % 3]);
      const accent = cycle[(k + i + 1) % 3];
      const ctx = sampler.ctxOf(k);
      const objSamples = [];
      for (let f = 0; f < frames; f++) {
        const st = sampler.objectAt(k, f);
        objSamples.push([...st.pos, ...st.rot, ...st.scale, st.op, st.visible ? 1 : 0].map(r4));
      }
      const camYawAt = (f) => {
        const st = sampler.objectAt(k, f);
        return st.camYaw - st.rot[1];
      };
      const hasLook = (o.parts ?? []).some((p) => looksAtCamera(p));
      let parts;
      let model = null;
      if (o.kind === "custom") parts = o.parts ?? [];
      else {
        if (MODEL_KINDS.includes(o.kind)) model = abs(modelOf(o, k));
        if (!model) {
          parts = proxyParts(o.kind, o);
          if (!proxied.has(o.kind)) {
            proxied.add(o.kind);
            warn(`built-in kind "${o.kind}" is approximated with simple shapes in the Blender renderer; build it with a custom object for a faithful model`);
          }
        }
      }
      return {
        index: k,
        id: o.id ?? null,
        kind: o.kind,
        label: o.label ?? null,
        value: o.value ?? null,
        h: pl.h,
        scale: pl.scale,
        enter: pl.enter,
        corner: pl.corner ?? null,
        highlight: Boolean(o.highlight),
        model,
        object: collapseTrack(objSamples),
        parts: parts ? buildParts(sampler, o.kind === "custom" ? o : { motion: [] }, parts, body, accent, ctx, frames, hasLook ? camYawAt : null) : [],
        body,
        accent,
      };
    });

    const worldParts = w?.parts?.length
      ? buildParts(sampler, { motion: [] }, w.parts, palette.accent2 ?? palette.accent, palette.accent3 ?? palette.accent, { sec: sampler.sec, enter: 0, seed: (i + 1) * 31 + 977 }, frames, null)
      : [];
    const crowd = w?.crowd
      ? { ...w.crowd, pos: w.crowd.pos ?? [0, 0, -6], height: w.crowd.height ?? 1.1, color: colorOf(palette, look, w.crowd.color, mixHex(palette.bg[1] ?? palette.bg[0], "#000000", 0.5)), rim: palette.accent2 ?? palette.accent, seed: i + 1 }
      : null;

    const idToIndex = new Map(objs.map((o, k) => [o.id, k]).filter(([id]) => id));
    const anchor = (target, f) => {
      const k = idToIndex.get(String(target).split("/")[0]);
      if (k === undefined) return null;
      const st = sampler.objectAt(k, f);
      return [st.pos[0], st.pos[1] + plan.objects[k].h * 0.5 * (st.scale[1] / Math.max(1e-6, plan.objects[k].scale)), st.pos[2]].map(r4);
    };
    const fx = [];
    for (const f of v.fx ?? []) {
      const at = f.at === undefined ? 0 : sampler.sec(f.at);
      const until = f.until === undefined ? null : sampler.sec(f.until);
      const base = { type: f.type, at, until, color: colorOf(palette, look, f.color, palette.accent), size: f.size ?? 1, count: f.count ?? 40 };
      if (f.type === "spotlight") fx.push({ ...base, pos: f.pos ?? [0, 8, 2], aim: f.target ? null : (f.aim ?? [center[0], 0, center[1]]), target: f.target ? Array.from({ length: frames }, (_, fr) => anchor(f.target, fr)).filter(Boolean) : null });
      else if (f.type === "shockwave" || f.type === "glow" || f.type === "particles") {
        const track = f.target ? collapseTrack(Array.from({ length: frames }, (_, fr) => anchor(f.target, fr) ?? [center[0], 0.5, center[1]])) : [[center[0], 0.5, center[1]]];
        fx.push({ ...base, kind: f.kind ?? null, burst: Boolean(f.burst), anchor: track });
      } else warn(`fx "${f.type}" is not supported by the Blender renderer (skipped)`);
    }

    const camera = [];
    for (let f = 0; f < frames; f++) {
      const c = sampler.camAt(f / fps);
      camera.push([...c.position, ...c.target, c.ortho ? c.viewH : c.fov].map(r4));
    }
    return {
      index: i,
      id: s.id,
      startFrame: from,
      frames,
      sceneFrames: timeline.scenes[i].durationInFrames,
      bg: { stops: bgStops },
      ground,
      ortho: Boolean(LOOK3D[lookId]?.ortho),
      objects,
      connections: plan.connections.map((c) => {
        const A = plan.objects[c.from];
        const B = plan.objects[c.to];
        return { from: [A.pos[0], A.h * 0.5, A.pos[2]], to: [B.pos[0], B.h * 0.5, B.pos[2]], enter: c.enter, color: lookId === "clay-diorama" ? look.dark : palette.accent };
      }),
      world: { parts: worldParts, crowd },
      fx,
      camera,
      center,
      half,
      layout: plan.layout,
    };
  });

  return {
    version: 1,
    render: { ...BLENDER_RENDER, width: spec.format.width, height: spec.format.height, fps, scale },
    look: {
      id: look.id,
      material: look.material,
      key: look.key,
      sky: look.sky,
      exposure: look.exposure + (profile.exposure - 1) * 0.6,
      tone: look.tone,
      night: Boolean(look.night),
      bloom: Boolean(look.bloom),
      blocky: Boolean(look.blocky),
      dark: look.dark,
      light: look.light,
      screen: look.screen,
      palette: { accent: palette.accent, accent2: palette.accent2 ?? palette.accent, accent3: palette.accent3 ?? palette.accent, bg: palette.bg, text: palette.text },
    },
    fontPath,
    totalFrames: timeline.totalFrames,
    scenes,
    warnings,
  };
}

function looksAtCamera(p) {
  return motionList(p.motion).some((m) => m.type === "look-at-camera");
}

export { BLENDER_LOOKS, customHeight, objectHeight };
