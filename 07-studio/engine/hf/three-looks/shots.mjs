// Shot planner (the resolver enforces the shot mix) and the baked-pose solver.
// Mix: about 25 % wide, 50 % close (close + macro), 25 % medium (medium, low, top); never two wides in a row; every causal beat gets a
// close or macro shot; the camera always moves (every shot has a move), so it is never idle for 2 s.
import { SHOTS, MOVES } from "./catalog.mjs";
import { solveShot, unionBox, boxCenter, boxCorners, shotPoseAt } from "./frame.mjs";

export const CAUSAL = new Set(["open", "close", "fill", "heat", "cool", "light-up", "dim", "explode", "assemble", "spin"]);
const STATE_ACTS = new Set(["open", "fill", "light-up", "heat", "explode", "assemble"]);
// hard causal steps always need a close or macro; soft ones (a lamp turning on, a lid closing) may sit in a medium shot of their object
const SOFT = new Set(["light-up", "dim", "cool", "close", "spin"]);
const CYCLE = ["wide", "close", "medium", "close"];
const MEDIUM_KINDS = ["medium", "low", "medium", "top"];
const MOVE_FOR = { wide: ["dolly-in", "orbit", "crane"], medium: ["orbit", "truck", "dolly-in"], close: ["push", "orbit-back", "dolly-in"], macro: ["push", "orbit", "dolly-in"], low: ["crane", "dolly-in", "orbit"], top: ["orbit", "dolly-out", "drift"] };
const r3 = (n) => Math.round(n * 1000) / 1000;
export const catOf = (kind) => SHOTS[kind]?.cat ?? "medium";

/** Fractions of wide / close / medium shots of a list. */
export function shotMix(shots) {
  const n = shots.length || 1, c = { wide: 0, close: 0, medium: 0 };
  for (const s of shots) c[catOf(s.kind)]++;
  return { wide: c.wide / n, close: c.close / n, medium: c.medium / n, n: shots.length };
}

/** Splits one world into slots (explicit shots first, else even slots) and notes the causal beats inside each. */
export function planSlots({ world, beats, camera, single }) {
  const { t0, t1 } = world, len = t1 - t0, calm = camera === "calm";
  const seg = calm ? 3.0 : 2.2, maxLen = calm ? 4.2 : 3.4;
  const base = [];
  const explicit = (world.payload.shots ?? []).map((s) => ({ ...s, t: s.from === undefined ? null : (typeof s.from === "number" ? s.from : world.refTime(s.from)) }));
  if (explicit.length) {
    explicit.forEach((s, i) => { if (s.t == null || !Number.isFinite(s.t)) s.t = t0 + (len * i) / explicit.length; s.t = Math.min(Math.max(s.t, t0), t1 - 0.5); });
    explicit.sort((a, b) => a.t - b.t);
    if (explicit[0].t > t0 + 0.05) explicit.unshift({ t: t0 }); else explicit[0].t = t0;
    explicit.forEach((s, i) => base.push({ t0: s.t, t1: i + 1 < explicit.length ? explicit[i + 1].t : t1, kind: s.kind, move: s.move, target: s.target, explicit: !!s.kind }));
  } else {
    const count = Math.max(2, Math.round(len / seg));
    for (let i = 0; i < count; i++) base.push({ t0: t0 + (len * i) / count, t1: t0 + (len * (i + 1)) / count });
  }
  const out = [];
  for (const s of base) { const parts = Math.max(1, Math.ceil((s.t1 - s.t0) / maxLen)); for (let k = 0; k < parts; k++) out.push({ ...s, t0: s.t0 + ((s.t1 - s.t0) * k) / parts, t1: s.t0 + ((s.t1 - s.t0) * (k + 1)) / parts, part: k }); }
  out.forEach((s) => {
    const within = beats.filter((b) => b.t >= s.t0 - 0.15 && b.t < s.t1);
    s.world = world.i; s.cb = within.find((b) => CAUSAL.has(b.do) && b.target); s.tb = s.cb ?? within.find((b) => b.target && b.do !== "look");
    s.causal = within.filter((b) => CAUSAL.has(b.do) && b.target).length;
    s.hard = within.filter((b) => CAUSAL.has(b.do) && !SOFT.has(b.do) && b.target).length;
  });
  void single;
  return out;
}

/**
 * Assigns the shot category of every slot of the video: about 25 % wide, 50 % close, 25 % medium. Wides go to world starts first and to slots with
 * no causal beat; mediums to the slots with the fewest causal beats; never two wides in a row; causal slots are close or macro. Explicit shot kinds
 * are kept unless they break a rule (reported as a warning).
 */
export function assignMix(slots, warnings) {
  const n = slots.length; if (!n) return;
  slots.forEach((s) => { s.cat = null; });
  const fixed = (i) => slots[i].explicit && slots[i].kind;
  slots.forEach((s, i) => { if (fixed(i)) s.cat = catOf(s.kind); });
  const nW = Math.max(1, Math.round(n * 0.25)), nM = Math.round(n * 0.25);
  const count = (c) => slots.filter((s) => s.cat === c).length;
  const adjWide = (i) => (i > 0 && slots[i - 1].cat === "wide") || (i + 1 < n && slots[i + 1].cat === "wide");
  const startIdx = slots.map((s, i) => (i === 0 || slots[i - 1].world !== s.world ? i : -1)).filter((i) => i >= 0);
  const pick = (cands, c) => { for (const i of cands) { if (slots[i].cat !== null) continue; if (c === "wide" && adjWide(i)) continue; slots[i].cat = c; return true; } return false; };
  const free = (i) => slots[i].cat === null;
  // wides: even spread over the video, preferring causal-free slots (a world start when it is free)
  const spread = Array.from({ length: nW }, (_, k) => Math.min(n - 1, Math.floor(((k + 0.5) * n) / nW - 0.5 + 0.001)));
  for (let k = count("wide"); k < nW; k++) {
    const want = spread[k - count("wide") >= 0 ? k - 0 : 0] ?? 0;
    const order = [...slots.keys()].filter(free).sort((a, b) => (slots[a].causal > 0) - (slots[b].causal > 0) || (startIdx.includes(b) - startIdx.includes(a)) || Math.abs(a - want) - Math.abs(b - want));
    if (!pick(order, "wide")) break;
  }
  // mediums: fewest causal beats first
  for (let k = count("medium"); k < nM; k++) {
    const order = [...slots.keys()].filter(free).sort((a, b) => slots[a].causal - slots[b].causal || a - b);
    const ok = (j) => !(slots[j - 1]?.cat === "medium");
    const i = order.find((j) => slots[j].causal === 0 && ok(j)) ?? [...slots.keys()].filter(free).sort((a, b) => slots[a].hard - slots[b].hard || slots[a].causal - slots[b].causal || a - b).find((j) => slots[j].hard === 0 && ok(j));
    if (i === undefined) break; slots[i].cat = "medium";
  }
  slots.forEach((s) => { if (s.cat === null) s.cat = "close"; });
  // rules on explicit shots
  slots.forEach((s, i) => {
    if (s.cat !== "close" && s.hard > 0 && s.explicit) { warnings.push(`world ${s.world + 1}: shot "${s.kind}" at ${s.t0.toFixed(1)} s holds a causal beat (${s.cb.do}); changed to a close or macro shot`); s.cat = "close"; s.kind = undefined; s.explicit = false; }
    if (s.cat === "wide" && i > 0 && slots[i - 1].cat === "wide") { warnings.push(`world ${s.world + 1}: two wide shots in a row at ${s.t0.toFixed(1)} s; the second became a medium`); s.cat = "medium"; s.kind = undefined; s.explicit = false; }
  });
}

/** Fills kind, target and move of the slots of one world (after assignMix). */
export function finalizeShots({ world, slots, objectIds, hasHero, state, camera }) {
  const calm = camera === "calm";
  let closeN = state.closeN, medN = state.medN, objN = state.objN;
  slots.forEach((s, i) => {
    const idx = state.n++, cb = s.cb;
    let kind;
    if (s.explicit && s.kind) kind = s.kind;
    else if (s.cat === "wide") kind = "wide";
    else if (s.cat === "close") { kind = cb && STATE_ACTS.has(cb.do) && closeN % 2 === 0 ? "macro" : "close"; closeN++; }
    else { kind = MEDIUM_KINDS[medN % MEDIUM_KINDS.length]; medN++; }
    let tgt = s.target ?? (s.tb ? s.tb.target : null), target;
    const isId = (id) => objectIds.includes(id);
    if (kind === "wide" || kind === "top") target = { type: "all" };
    else if (kind === "low") target = { type: "hero" };
    else {
      if (!tgt && (kind === "close" || kind === "macro")) tgt = objectIds.length ? objectIds[objN++ % objectIds.length] : null;
      if (tgt && isId(tgt)) target = { type: "object", id: tgt };
      else if (tgt && tgt !== "hero" && /^cast\d/.test(tgt)) target = { type: "cast", id: tgt };
      else if (tgt && tgt !== "hero" && !isId(tgt)) target = { type: "anchor", id: tgt };
      else target = { type: "hero" };
      if (!hasHero && target.type === "hero") target = objectIds.length ? { type: "object", id: objectIds[0] } : { type: "all" };
    }
    const prev = slots[i - 1], cyc = MOVE_FOR[kind];
    if (prev && prev.kind === kind && JSON.stringify(prev.target) === JSON.stringify(target) && !s.explicit) { kind = kind === "close" ? "macro" : kind === "macro" ? "close" : kind; }
    let move = s.move ?? cyc[(idx + world.i) % cyc.length];
    if (prev && prev.move === move && !s.move) move = cyc.find((m) => m !== prev.move) ?? "drift";
    Object.assign(s, { kind, cat: catOf(kind), move, target, amp: calm ? 0.6 : 1 });
  });
  state.closeN = closeN; state.medN = medN; state.objN = objN;
  slots[0].t0 = world.t0; slots[slots.length - 1].t1 = world.t1;
  return slots.map((s) => ({ t0: r3(s.t0), t1: r3(s.t1), kind: s.kind, cat: s.cat, move: s.move, target: s.target, amp: s.amp }));
}

/** Bakes camera poses: for each slot, the framing solver fits the subject and the hero rule at u = 0, 0.5 and 1. */
export function solveShots({ slots, ents, hero, boxAt, visibleAt, anchorPoint, warnings, worldIndex }) {
  return slots.map((s) => {
    const preset = SHOTS[s.kind], move = MOVES[s.move] ?? {}, times = [0, 0.5, 1].map((u) => ({ u, t: s.t0 + u * (s.t1 - s.t0) }));
    const samples = times.map(({ u, t }) => {
      const heroBox = hero ? boxAt(hero, t) : null;
      let subject;
      const all = () => { const b = ents.filter((e) => e.kind === "object" && (visibleAt(e, t) || visibleAt(e, s.t1))).map((e) => boxAt(e, t)); if (hero) b.push(heroBox); const ox = worldIndex * 15; b.push({ min: [ox - 3.0, 0, -2.5], max: [ox + 3.0, 2.2, 4.2] }); return b; };
      if (preset.group === "all") subject = all();
      else if (preset.group === "hero") subject = heroBox ? [heroBox] : all();
      else {
        const te = s.target.type === "object" || s.target.type === "cast" ? ents.find((e) => e.id === s.target.id) : null;
        if (te) { subject = [boxAt(te, t)]; if (heroBox && te !== hero) { const tb = boxAt(te, t), c1 = boxCenter(tb), c2 = boxCenter(heroBox); if (Math.hypot(c1[0] - c2[0], c1[2] - c2[2]) < (preset.group === "macro" ? 2.6 : 3.4)) subject.push(heroBox); } if (te === hero) subject = [heroBox]; }
        else if (s.target.type === "anchor") { const p = anchorPoint(s.target.id); subject = [{ min: [p[0] - 0.5, 0, p[1] - 0.5], max: [p[0] + 0.5, 1.4, p[1] + 0.5] }]; if (heroBox && preset.group === "target") subject.push(heroBox); }
        else subject = heroBox ? [heroBox] : all();
      }
      if (!subject.length) subject = [{ min: [-1, 0, -1], max: [1, 1.5, 1] }];
      return { u, subject, hero: hero && !subject.includes(heroBox) ? heroBox : (hero ? heroBox : null) };
    });
    const focusBox = unionBox(samples.flatMap((x) => x.subject));
    let sol = solveShot({ preset, move, amp: s.amp, samples, focusBox });
    if (hero && sol.dist > 14 && samples.every((x) => !x.subject.includes(x.hero))) { // hero far from the target made the solver pull back: frame both together when that is closer
      const s3 = samples.map((x) => ({ ...x, subject: [...x.subject, x.hero] })), alt = solveShot({ preset, move, amp: s.amp, samples: s3, focusBox: unionBox(s3.flatMap((x) => x.subject)) });
      if (!alt.warn && alt.dist < sol.dist * 0.8) sol = alt;
    }
    if (sol.warn && sol.warn.startsWith("subject") && hero) { // hero and target cannot share the frame: frame the target alone
      const s2 = samples.map((x) => ({ ...x, subject: x.subject.filter((b) => b !== x.hero) })).filter((x) => x.subject.length);
      if (s2.length === samples.length) { const alt = solveShot({ preset, move, amp: s.amp, samples: s2.map((x) => ({ ...x, hero: null })), focusBox: unionBox(s2.flatMap((x) => x.subject)) }); if (!alt.warn) sol = alt; }
    }
    if (sol.warn) warnings.push(`world ${worldIndex + 1}: shot ${s.kind} at ${s.t0.toFixed(1)} s: ${sol.warn}`);
    const r = (p) => ({ pos: p.pos.map(r3), look: p.look.map(r3), fov: r3(p.fov) });
    return { ...s, pose0: r(sol.pose0), pose1: r(sol.pose1), dist: r3(sol.dist) };
  });
}
export { shotPoseAt, boxCorners };
