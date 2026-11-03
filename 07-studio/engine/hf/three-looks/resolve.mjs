// Resolves a validated payload against the narration: world windows, beat times bound to words, cast, shot plan, captions, sfx.
// Pure and deterministic: the same inputs always give the same output.
import { EMOTE_HOLD, STOCK_MODELS } from "./catalog.mjs";
import { getStyle } from "./styles.mjs";
import { SETS, GLOBAL_ANCHORS, CORNERS, setDecor, SLAB } from "./sets.mjs";
import { expandObject } from "./objects.mjs";
import { objectExtent } from "./parts.mjs";
import { planSlots, assignMix, finalizeShots, solveShots } from "./shots.mjs";
import { projectBox, shotPoseAt } from "./frame.mjs";
import { placeLabel, placeStamp } from "./place.mjs";
import { ZONES } from "./layout.mjs";

export const normWord = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const r3 = (n) => Math.round(n * 1000) / 1000;
const lev = (a, b) => {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
};

/**
 * Resolves `{ word, n?, offset? }` (or `{ at }`) to a time. Matching tolerance is fixed: exact word, then prefix of at least
 * 4 letters, then edit distance 1 (words of 4+ letters) or 2 (7+). `n` is the 1-based occurrence; when the narration has fewer
 * occurrences the last one is used. Returns null when nothing matches.
 */
export function resolveWordRef(words, ref) {
  if (ref == null) return null;
  if (ref.word === undefined) return typeof ref.at === "number" ? { t: ref.at + (ref.offset ?? 0), index: -1, match: "at", n: 1 } : null;
  const tokens = String(ref.word).split(/\s+/).map(normWord).filter(Boolean);
  if (!tokens.length) return null;
  const norm = words.map((w) => normWord(w.text));
  const test = { exact: (a, k) => a === k, prefix: (a, k) => Math.min(a.length, k.length) >= 4 && (a.startsWith(k) || k.startsWith(a)), fuzzy: (a, k) => k.length >= 4 && Math.abs(a.length - k.length) <= 2 && lev(a, k) <= (k.length >= 7 ? 2 : 1) };
  for (const kind of ["exact", "prefix", "fuzzy"]) {
    const hits = [];
    for (let i = 0; i + tokens.length <= words.length; i++) {
      let ok = true;
      for (let j = 0; j < tokens.length; j++) if (!test[kind](norm[i + j], tokens[j])) { ok = false; break; }
      if (ok) hits.push(i);
    }
    if (hits.length) {
      const n = ref.n ?? 1, idx = hits[Math.min(n, hits.length) - 1];
      return { t: words[idx].start + (ref.offset ?? 0), index: idx, match: kind, n: Math.min(n, hits.length), exhausted: n > hits.length };
    }
  }
  return null;
}

const STRONG = /[.?!:;]$/, SOFT = /,$/;
/** Caption groups of 2-4 words; breaks on sentence end, comma, 4 words or a long line. */
export function captionGroups(words) {
  const groups = []; let cur = [];
  const flush = () => { if (cur.length) { groups.push(cur); cur = []; } };
  words.forEach((w, i) => {
    cur.push(w);
    const len = cur.map((x) => x.text).join(" ").length, nextLen = words[i + 1] ? len + 1 + words[i + 1].text.length : 99;
    if (STRONG.test(w.text) || (SOFT.test(w.text) && cur.length >= 2) || cur.length >= 4 || nextLen > 22) flush();
  });
  flush();
  for (let i = groups.length - 1; i > 0; i--) if (groups[i].length === 1 && groups[i - 1].length < 4 && !STRONG.test(groups[i - 1][groups[i - 1].length - 1].text)) { groups[i - 1].push(...groups[i]); groups.splice(i, 1); }
  return groups.map((g, i) => {
    const next = groups[i + 1], end = g[g.length - 1].end;
    return { ci: i, t0: r3(g[0].start), tEnd: r3(next ? Math.min(next[0].start, end + 0.45) : end + 0.45), words: g.map((w) => ({ d: w.text, t0: r3(w.start) })) };
  });
}

const SFX_OF = { "pop-in": "pop", "pop-out": "pop", grow: "pop", shrink: "pop", pulse: "tick", shake: "stamp", "light-up": "ding", dim: "tick", burst: "stamp", move: "cut", spin: "cut", open: "pop", close: "tick", fill: "tick", heat: "stamp", cool: "tick", explode: "stamp", assemble: "pop", walk: null, emote: "pop", look: null, label: "pop", stamp: "stamp" };
export const SINGLE_TRAVEL_SEC = 1.7;
export const WORLD_SPACING = 15;
const TRANSITION_CYCLE = ["iris", "slide", "drop", "pop"];
const OBJECT_SLOTS = ["back-center", "back-left", "back-right", "mid-left", "mid-right", "mid-center", "front-right", "front-left"];
const CAST_SLOTS = ["front-left", "front-right", "front-center"];
const WALK_SPEED = 1.7, MOVE_SPEED = 2.4;
const DESIGNS = ["kid", "bot", "worker", "scientist"];

/** Position [x, z] (world-local) of an entity at time t along its path events. */
export function posAt(e, t) {
  let p = [e.at[0], e.at[2]];
  for (const ev of e.path) {
    if (t >= ev.t + ev.dur) { p = ev.to; continue; }
    if (t >= ev.t) { const u = ev.dur > 0 ? (t - ev.t) / ev.dur : 1, k = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; p = [ev.from[0] + (ev.to[0] - ev.from[0]) * k, ev.from[1] + (ev.to[1] - ev.from[1]) * k]; }
    break;
  }
  return p;
}
export function visibleAt(e, t) { let v = !e.hidden; for (const ev of e.vis) { if (t >= ev.t) v = ev.to; else break; } return v; }

/** Moments (seconds or { word, n, offset }) inside parts, keys and motion -> seconds. */
function bakeMoments(list, words, warn, who) {
  const sec = (m) => { if (m === undefined || typeof m === "number") return m; const r = resolveWordRef(words, m); if (!r) { warn(`${who}: moment word ${JSON.stringify(m.word)} was not found in the narration; using 0 s`); return 0; } return r.t; };
  const keys = (ks) => (ks ?? []).map((k) => ({ ...k, at: sec(k.at) })).sort((a, b) => a.at - b.at);
  const motion = (ms) => (ms ?? []).map((m) => (typeof m === "string" ? { type: m } : { ...m, ...(m.at !== undefined ? { at: sec(m.at) } : {}), ...(m.until !== undefined ? { until: sec(m.until) } : {}) }));
  return { keys, motion, bakeParts: (parts) => parts.map((p) => { const q = { ...p }; if (p.keys) q.keys = keys(p.keys); if (p.motion) q.motion = motion(p.motion); return q; }) };
}

/** Validated payload + words -> the data the composition script reads (`SPEC`), sfx cues and warnings. */
export function resolvePayload({ payload, words, durationSec, mode = "multi", captionsEnabled = true }) {
  const warnings = [], warn = (m) => warnings.push(m);
  const style = getStyle(payload.style), stock = payload.stock === true;
  const lastEnd = words.length ? words[words.length - 1].end : 0;
  const dur = r3(Math.max(2, durationSec ?? lastEnd + 0.8));
  const n = payload.worlds.length, single = mode === "single";

  // 1) world windows
  const starts = payload.worlds.map((w, i) => {
    if (i === 0) return 0;
    let t = null;
    if (typeof w.from === "number") t = w.from; else if (w.from) { const r = resolveWordRef(words, w.from); if (r) t = r.t; else warn(`world ${i + 1}: \`from\` word ${JSON.stringify(w.from.word)} was not found in the narration; the world starts at an even split`); }
    return t ?? (dur * i) / n;
  });
  for (let i = 1; i < n; i++) { if (starts[i] < starts[i - 1] + 2.5) { if (starts[i] !== (dur * i) / n) warn(`world ${i + 1} starts too close to world ${i} (${starts[i].toFixed(2)} s); moved to keep at least 2.5 s per world`); starts[i] = Math.min(starts[i - 1] + 2.5, dur - 0.5 * (n - i)); } }
  const worlds = payload.worlds.map((w, i) => ({ i, set: w.set, mood: w.mood ?? "warm", t0: r3(starts[i]), t1: r3(i + 1 < n ? starts[i + 1] : dur), payload: w }));
  const heroSpec = typeof payload.hero === "string" ? {} : (payload.hero ?? {});
  const moments = (w) => bakeMoments(null, words, warn, `world ${w.i + 1}`);

  // 2) objects and cast (entities)
  worlds.forEach((w) => {
    const bm = moments(w), ents = [];
    const used = new Set();
    const spot = (v, opts = {}) => {
      if (Array.isArray(v)) return [...v];
      const e = ents.find((x) => x.id === v); if (e) return opts.stand ? [e.at[0], e.at[2] + 1.2] : [e.at[0], e.at[2]];
      if (GLOBAL_ANCHORS[v]) return [...GLOBAL_ANCHORS[v]];
      if (CORNERS[v]) return [...CORNERS[v]];
      return [...GLOBAL_ANCHORS.center];
    };
    w.spot = spot;
    const slotFree = () => { const s = OBJECT_SLOTS.find((x) => !used.has(x)) ?? "mid-center"; used.add(s); return s; };
    w.payload.objects.forEach((o) => {
      const isStock = o.model !== undefined || (stock && STOCK_MODELS[o.build]);
      let ex, ext;
      if (isStock) {
        const id = o.model ?? o.build, h = (STOCK_MODELS[id]?.h ?? 1) * (o.scale ?? 1);
        ex = { parts: [], colors: {}, init: {}, motion: o.motion ?? [], keys: o.keys ?? [], scale: o.scale ?? 1 }; ext = { min: [-0.6, 0, -0.6], max: [0.6, h, 0.6] };
      } else { ex = expandObject(o); ext = objectExtent(ex.parts, ex.init, ex.scale); }
      let at = o.corner ? CORNERS[o.corner] : o.at !== undefined ? spot(o.at) : GLOBAL_ANCHORS[slotFree()];
      if (o.at !== undefined && typeof o.at === "string") used.add(o.at);
      ents.push({
        id: o.id, kind: "object", label: o.label, stock: isStock ? (o.model ?? o.build) : undefined, parts: bm.bakeParts(ex.parts), colors: ex.colors, init: ex.init, motion: bm.motion([...ex.motion]), keys: bm.keys(ex.keys),
        at: [r3(at[0]), 0, r3(at[1])], rot: r3(((o.rot ?? 0) * Math.PI) / 180 + Math.max(-0.3, Math.min(0.3, -at[0] * 0.06))), scale: ex.scale, hidden: !!o.hidden, ext: { min: ext.min.map(r3), max: ext.max.map(r3) }, path: [], vis: [],
      });
    });
    const castList = w.payload.cast?.length ? w.payload.cast : [{}];
    castList.forEach((c, k) => {
      const id = c.who ?? (k === 0 ? "hero" : `cast${k}`), isHero = id === "hero";
      const src = isHero ? { ...heroSpec, ...c } : { design: DESIGNS[(k + w.i + 1) % 4], seed: k * 3 + w.i + 1, ...c };
      const ex = typeof payload.hero === "string" && isHero ? null : expandObject({ ...src, scale: src.scale }, { cast: true });
      const at = c.at !== undefined ? spot(c.at) : GLOBAL_ANCHORS[CAST_SLOTS[k] ?? "front-center"];
      const ext = ex ? objectExtent(ex.parts, ex.init, ex.scale) : { min: [-0.5, 0, -0.5], max: [0.5, (STOCK_MODELS[payload.hero]?.h ?? 1.8), 0.5] };
      ents.push({
        id, kind: "cast", isHero, stock: ex ? undefined : payload.hero, parts: ex ? bm.bakeParts(ex.parts) : [], colors: ex?.colors ?? {}, init: ex?.init ?? {}, motion: ex ? bm.motion(ex.motion) : [], keys: [], scale: ex?.scale ?? 1,
        at: [r3(at[0]), 0, r3(at[1])], rot: 0, hidden: false, ext: { min: ext.min.map(r3), max: ext.max.map(r3) }, path: [], vis: [],
      });
    });
    w.ents = ents;
  });
  const entOf = (w, id) => w.ents.find((e) => e.id === id);
  const heroOf = (w) => w.ents.find((e) => e.isHero) ?? w.ents.find((e) => e.kind === "cast");

  // 3) beats bound to words
  const raw = [];
  worlds.forEach((w) => {
    const bs = w.payload.beats;
    bs.forEach((b, bi) => {
      let t = null;
      const r = resolveWordRef(words, b.on);
      if (r) { t = r.t; if (r.exhausted) warn(`world ${w.i + 1} beat ${bi + 1} (${b.do}): "${b.on.word}" occurs fewer than ${b.on.n} times; the last occurrence is used`); }
      else { t = w.t0 + ((bi + 0.5) * (w.t1 - w.t0)) / Math.max(1, bs.length); warn(`world ${w.i + 1} beat ${bi + 1} (${b.do}): word ${JSON.stringify(b.on.word ?? b.on.at)} was not found in the narration; the beat is spread evenly inside its world`); }
      if (t < w.t0 || t >= w.t1) { const c = Math.min(Math.max(t, w.t0), w.t1 - 0.05); warn(`world ${w.i + 1} beat ${bi + 1} (${b.do}): "${b.on.word ?? b.on.at}" falls at ${t.toFixed(2)} s outside the world (${w.t0.toFixed(2)}-${w.t1.toFixed(2)} s); moved to ${c.toFixed(2)} s`); t = c; }
      const out = { t: r3(t), world: w.i, do: b.do };
      if (b.target !== undefined) out.target = b.target;
      if (["walk", "emote", "look"].includes(b.do)) out.who = b.who ?? (heroOf(w)?.id ?? "hero");
      if (b.to !== undefined) out.to = { world: w.i, id: typeof b.to === "string" ? b.to : "xz", p: w.spot(b.to, { stand: b.do === "walk" && typeof b.to === "string" }).map(r3) };
      for (const k of ["value", "amount", "symbol", "text", "dur", "hold"]) if (b[k] !== undefined) out[k] = b[k];
      raw.push(out);
    });
    const density = w.payload.beats.length / Math.max(1, w.t1 - w.t0);
    if (density < 0.3) warn(`world ${w.i + 1} (${w.set}) has ${w.payload.beats.length} beats in ${(w.t1 - w.t0).toFixed(1)} s (${density.toFixed(2)}/s); aim for at least 0.5 beats per second`);
  });
  if (single) worlds.slice(1).forEach((w) => { const c = heroOf(w); raw.push({ t: w.t0, world: w.i, do: "walk", who: c.id, to: { world: w.i, id: "station", p: [c.at[0], c.at[2]] }, dur: SINGLE_TRAVEL_SEC - 0.1, synthetic: true, local: true }); });
  raw.sort((a, b) => a.t - b.t || a.world - b.world);

  // 4) paths and visibility from the beats
  worlds.forEach((w) => {
    const cur = new Map(w.ents.map((e) => [e.id, [e.at[0], e.at[2]]]));
    raw.filter((b) => b.world === w.i).forEach((b) => {
      if ((b.do === "walk" && b.to) || (b.do === "move" && b.to)) {
        const e = entOf(w, b.do === "walk" ? b.who : b.target); if (!e) return;
        const from = cur.get(e.id), to = b.to.p, dist = Math.hypot(to[0] - from[0], to[1] - from[1]), d = r3(b.dur ?? Math.max(0.9, dist / (b.do === "walk" ? WALK_SPEED : MOVE_SPEED)));
        e.path.push({ t: b.t, dur: d, from: from.map(r3), to: to.map(r3), hop: b.do === "move" }); cur.set(e.id, to);
        if (b.do === "walk") b.dur = d;
      }
      if (b.do === "pop-in" || b.do === "pop-out") { const e = entOf(w, b.target); if (e) e.vis.push({ t: b.t, to: b.do === "pop-in" }); }
    });
  });

  // 5) transitions, travel windows, shots (global mix first, then the framing solver bakes the poses), tags
  worlds.forEach((w) => {
    if (w.i > 0) { if (single) w.travel = { t0: w.t0, t1: r3(w.t0 + SINGLE_TRAVEL_SEC) }; else w.transition = w.payload.transition ?? TRANSITION_CYCLE[(w.i - 1) % TRANSITION_CYCLE.length]; }
    w.refTime = (ref) => resolveWordRef(words, ref)?.t ?? null;
    w.slots = planSlots({ world: w, beats: raw.filter((b) => b.world === w.i), camera: payload.camera, single });
  });
  assignMix(worlds.flatMap((w) => w.slots), warnings);
  const mixState = { n: 0, closeN: 0, medN: 0, objN: 0 };
  worlds.forEach((w) => {
    const off = w.i * WORLD_SPACING, hero = heroOf(w), wb = raw.filter((b) => b.world === w.i);
    const boxAt = (e, t) => { const [x, z] = posAt(e, t); return { min: [x + off + e.ext.min[0], e.ext.min[1], z + e.ext.min[2]], max: [x + off + e.ext.max[0], e.ext.max[1], z + e.ext.max[2]] }; };
    const objectIds = w.ents.filter((e) => e.kind === "object").map((e) => e.id);
    const slots = finalizeShots({ world: w, slots: w.slots, objectIds, hasHero: !!hero, state: mixState, camera: payload.camera });
    w.shots = solveShots({ slots, ents: w.ents, hero, boxAt, visibleAt, anchorPoint: (id) => { const p = w.spot(id); return [p[0] + off, p[1]]; }, warnings, worldIndex: w.i });
    w.boxAt = boxAt;
    // name tags and stamp words: placed away from the hero and the target
    const placed = [];
    wb.filter((b) => b.do === "label" || b.do === "stamp").forEach((b) => {
      const shot = w.shots.find((s) => b.t + 0.4 >= s.t0 && b.t + 0.4 < s.t1) ?? w.shots[w.shots.length - 1], pose = shotPoseAt(shot, (b.t + 0.4 - shot.t0) / Math.max(0.01, shot.t1 - shot.t0));
      const heroRect = hero ? projectBox(pose, boxAt(hero, b.t + 0.4)) : null, te = b.target ? entOf(w, b.target) : null, tRect = te ? projectBox(pose, boxAt(te, b.t + 0.4)) : null;
      const taken = placed.filter((p) => Math.abs(p.t - b.t) < 3).map((p) => p.rect);
      if (b.do === "label") {
        const obstacles = [heroRect && heroRect !== tRect && te !== hero ? heroRect : null, ...w.ents.filter((e) => e.kind === "cast" && e !== te).map((e) => projectBox(pose, boxAt(e, b.t + 0.4)))].filter(Boolean);
        const pl = placeLabel({ text: b.text, target: tRect ?? { x0: 440, x1: 640, y0: 600, y1: 800 }, obstacles, taken });
        b.pos = { cx: pl.cx, cy: pl.cy }; placed.push({ t: b.t, rect: pl.rect }); if (!pl.clear) warn(`world ${w.i + 1}: label "${b.text}" at ${b.t.toFixed(1)} s could not avoid the hero and its object completely`);
      } else {
        const obstacles = [heroRect, tRect].filter(Boolean);
        const pl = placeStamp({ text: b.text, obstacles, taken });
        b.pos = { cx: pl.cx, cy: pl.cy, px: pl.px }; placed.push({ t: b.t, rect: pl.rect }); if (!pl.clear) warn(`world ${w.i + 1}: stamp "${b.text}" at ${b.t.toFixed(1)} s overlaps the hero or the targeted object`);
      }
    });
  });

  // 6) sfx
  const sfx = [];
  raw.forEach((b) => { const k = SFX_OF[b.do]; if (k && !b.synthetic) sfx.push({ at: b.t, kind: k }); });
  worlds.slice(1).forEach((w) => sfx.push({ at: r3(Math.max(0, w.t0 - 0.15)), kind: "cut" }));
  sfx.sort((a, b) => a.at - b.at);
  const sfxOut = []; for (const s of sfx) { const last = sfxOut[sfxOut.length - 1]; if (last && s.at - last.at < 0.12 && last.kind === s.kind) continue; sfxOut.push(s); }

  const data = {
    dur, fps: 30, mode: single ? "single" : "multi", style: style.id, camera: payload.camera, capsDefault: !!captionsEnabled, stock, spacing: WORLD_SPACING,
    groups: captionGroups(words), words: words.map((w) => ({ t0: r3(w.start), t1: r3(w.end) })),
    worlds: worlds.map((w) => {
      const decor = setDecor(w.set), wp = w.payload.parts;
      const bm = moments(w);
      if (wp?.length) decor.push({ id: "world", name: "world", parts: bm.bakeParts(wp), colors: {}, at: [0, 0, 0], rot: 0, scale: 1 });
      const S = SETS[w.set];
      return {
        i: w.i, set: w.set, mood: w.mood, t0: w.t0, t1: w.t1, ...(w.transition ? { transition: w.transition } : {}), ...(w.travel ? { travel: w.travel } : {}),
        look: { pal: S.pal, floor: S.floor, wall: S.wall, slab: SLAB }, decor,
        objects: w.ents.filter((e) => e.kind === "object").map(({ ext, ...e }) => e), cast: w.ents.filter((e) => e.kind === "cast").map(({ ext, ...e }) => e), shots: w.shots,
      };
    }),
    beats: raw,
  };
  return { data, sfx: sfxOut, warnings, durationSec: dur, style };
}
export { EMOTE_HOLD };
