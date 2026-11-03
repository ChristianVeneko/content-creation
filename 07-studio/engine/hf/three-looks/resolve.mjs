// Resolves a validated payload against the narration: world windows, beat times bound to words, cast, shot plan, captions, sfx.
// Pure and deterministic: the same inputs always give the same output.
import { SETTINGS, GLOBAL_ANCHORS, HERO_IDS, MODELS, EMOTE_HOLD, settingProps, SHOTS } from "./catalog.mjs";
import { getStyle } from "./styles.mjs";

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

const SFX_OF = { "pop-in": "pop", "pop-out": "pop", grow: "pop", shrink: "pop", pulse: "tick", shake: "stamp", "light-up": "ding", dim: "tick", burst: "stamp", move: "cut", spin: "cut", open: "pop", close: "tick", fill: "tick", heat: "stamp", cool: "tick", walk: null, emote: "pop", look: null, label: "pop", stamp: "stamp" };
export const SINGLE_TRAVEL_SEC = 1.7;
export const WORLD_SPACING = 15;
const TRANSITION_CYCLE = ["iris", "slide", "drop", "pop"];
const SHOT_CYCLE = ["wide", "medium", "close", "low", "over-shoulder", "medium", "top", "close"];
const MOVE_FOR = { wide: ["dolly-in", "orbit", "crane"], medium: ["orbit", "truck", "dolly-in"], close: ["push", "orbit-back", "dolly-in"], low: ["crane", "dolly-in", "orbit"], "over-shoulder": ["dolly-in", "truck", "push"], top: ["orbit", "dolly-out", "drift"] };

function anchorPos(setting, id) {
  const p = settingProps(setting)[id];
  if (p) return { p: [p.at[0], 0, p.at[2]], prop: true };
  const a = SETTINGS[setting].anchors?.[id] ?? GLOBAL_ANCHORS[id];
  return a ? { p: [...a], prop: false } : null;
}

/** Shot plan of one world: explicit shots (split when too long) or an automatic plan that follows the beats; always moving. */
function planShots(world, beats, castIds, camera, warnings) {
  const { t0, t1 } = world, len = t1 - t0, calm = camera === "calm";
  const seg = calm ? 4.2 : 3.2, maxLen = calm ? 5.2 : 4.4;
  const targetAt = (a, b) => {
    const hit = beats.find((x) => x.target && x.t >= a - 0.2 && x.t < b);
    return hit ? hit.target : null;
  };
  const list = [];
  const explicit = (world.payload.shots ?? []).map((s) => ({ ...s, t: s.from === undefined ? null : (typeof s.from === "number" ? s.from : world.refTime(s.from)) }));
  if (explicit.length) {
    const n = explicit.length;
    explicit.forEach((s, i) => { if (s.t == null || !Number.isFinite(s.t)) s.t = t0 + (len * i) / n; s.t = Math.min(Math.max(s.t, t0), t1 - 0.5); });
    explicit.sort((a, b) => a.t - b.t);
    if (explicit[0].t > t0 + 0.05) explicit.unshift({ kind: "wide", move: "dolly-in", t: t0 });
    else explicit[0].t = t0;
    explicit.forEach((s, i) => list.push({ t0: s.t, t1: i + 1 < explicit.length ? explicit[i + 1].t : t1, kind: s.kind ?? SHOT_CYCLE[i % SHOT_CYCLE.length], move: s.move, target: s.target }));
  } else {
    const count = Math.max(2, Math.round(len / seg));
    for (let i = 0; i < count; i++) list.push({ t0: t0 + (len * i) / count, t1: t0 + (len * (i + 1)) / count, kind: SHOT_CYCLE[(i + (world.i % 2)) % SHOT_CYCLE.length] });
    list[0].kind = "wide";
  }
  // split long shots, fill targets and moves
  const out = [];
  for (const s of list) {
    const parts = Math.max(1, Math.ceil((s.t1 - s.t0) / maxLen));
    for (let k = 0; k < parts; k++) out.push({ ...s, t0: s.t0 + ((s.t1 - s.t0) * k) / parts, t1: s.t0 + ((s.t1 - s.t0) * (k + 1)) / parts, part: k });
  }
  let prev = null;
  out.forEach((s, i) => {
    const tgt = s.target ?? targetAt(s.t0, s.t1);
    if (s.kind === "close" && !tgt) s.kind = "medium";
    if (s.kind === "over-shoulder" && !tgt) s.kind = "low";
    let target;
    if (s.kind === "low") target = { type: "hero" };
    else if (s.kind === "top" || s.kind === "wide") target = { type: "anchor", id: "back" };
    else if (!tgt || tgt === "hero") target = { type: "hero" };
    else if (settingProps(world.setting)[tgt]) target = { type: "prop", id: tgt };
    else target = { type: "anchor", id: tgt };
    if (s.target && s.kind !== "wide" && s.kind !== "top") target = settingProps(world.setting)[s.target] ? { type: "prop", id: s.target } : (s.target === "hero" ? { type: "hero" } : { type: "anchor", id: s.target });
    const cyc = MOVE_FOR[s.kind] ?? ["orbit"], mv = s.move ?? cyc[(i + world.i) % cyc.length];
    const same = prev && prev.kind === s.kind && JSON.stringify(prev.target) === JSON.stringify(target);
    let move = mv;
    if (same && prev.move === mv) move = (MOVE_FOR[s.kind] ?? cyc).find((m) => m !== prev.move) ?? "drift";
    let kind = s.kind;
    if (same && !s.part && !s.move && kind !== "wide") kind = kind === "medium" ? "low" : "medium";
    const shot = { t0: r3(s.t0), t1: r3(s.t1), kind, move, target, amp: calm ? 0.6 : 1 };
    prev = shot; s.out = shot;
  });
  const res = out.map((s) => s.out);
  res[0].t0 = t0; res[res.length - 1].t1 = t1;
  return res;
}

/** Validated payload + words -> the data the composition script reads (`SPEC`), sfx cues and warnings. */
export function resolvePayload({ payload, words, durationSec, mode = "multi", captionsEnabled = true }) {
  const warnings = [];
  const style = getStyle(payload.style);
  const lastEnd = words.length ? words[words.length - 1].end : 0;
  const dur = r3(Math.max(2, durationSec ?? lastEnd + 0.8));
  const n = payload.worlds.length;
  const single = mode === "single";

  // 1) world windows
  const starts = payload.worlds.map((w, i) => {
    if (i === 0) return 0;
    let t = null;
    if (typeof w.from === "number") t = w.from; else if (w.from) { const r = resolveWordRef(words, w.from); if (r) t = r.t; else warnings.push(`world ${i + 1}: \`from\` word ${JSON.stringify(w.from.word)} was not found in the narration; the world starts at an even split`); }
    return t ?? (dur * i) / n;
  });
  for (let i = 1; i < n; i++) { if (starts[i] < starts[i - 1] + 2.5) { if (starts[i] !== (dur * i) / n) warnings.push(`world ${i + 1} starts too close to world ${i} (${starts[i].toFixed(2)} s); moved to keep at least 2.5 s per world`); starts[i] = Math.min(starts[i - 1] + 2.5, dur - 0.5 * (n - i)); } }
  const worlds = payload.worlds.map((w, i) => ({ i, setting: w.setting, mood: w.mood ?? "warm", t0: r3(starts[i]), t1: r3(i + 1 < n ? starts[i + 1] : dur), payload: w }));

  // 2) cast
  const heroModel = payload.hero;
  const defaultAt = ["left", "right", "center"];
  const castOf = (w) => {
    const list = (w.payload.cast?.length ? w.payload.cast : [{ who: "hero" }]).map((c, k) => {
      const model = c.who === "hero" ? heroModel : c.who;
      const at = c.at ?? defaultAt[k] ?? "center";
      const a = anchorPos(w.setting, at);
      const p = a ? (a.prop ? [a.p[0], 0, a.p[2] + 1.1] : a.p) : GLOBAL_ANCHORS.left;
      return { id: `c${k}`, who: c.who, model, at: p.map((v) => r3(v)), size: c.size ?? "M" };
    });
    return list;
  };
  worlds.forEach((w) => { w.cast = castOf(w); });
  const castId = (w, who) => (who === undefined || who === "hero" ? w.cast.find((c) => c.who === "hero")?.id ?? w.cast[0].id : (w.cast.find((c) => c.who === who) ?? w.cast.find((c) => c.model === who) ?? w.cast[0]).id);

  // 3) beats bound to words
  const raw = [];
  worlds.forEach((w) => {
    const bs = w.payload.beats;
    bs.forEach((b, bi) => {
      let t = null;
      const r = resolveWordRef(words, b.on);
      if (r) { t = r.t; if (r.exhausted) warnings.push(`world ${w.i + 1} beat ${bi + 1} (${b.do}): "${b.on.word}" occurs fewer than ${b.on.n} times; the last occurrence is used`); }
      else { t = w.t0 + ((bi + 0.5) * (w.t1 - w.t0)) / Math.max(1, bs.length); warnings.push(`world ${w.i + 1} beat ${bi + 1} (${b.do}): word ${JSON.stringify(b.on.word ?? b.on.at)} was not found in the narration; the beat is spread evenly inside its world`); }
      if (t < w.t0 || t >= w.t1) { const c = Math.min(Math.max(t, w.t0), w.t1 - 0.05); warnings.push(`world ${w.i + 1} beat ${bi + 1} (${b.do}): "${b.on.word ?? b.on.at}" falls at ${t.toFixed(2)} s outside the world (${w.t0.toFixed(2)}-${w.t1.toFixed(2)} s); moved to ${c.toFixed(2)} s`); t = c; }
      const out = { t: r3(t), world: w.i, do: b.do };
      if (b.target !== undefined) out.target = b.target;
      if (["walk", "emote", "look"].includes(b.do)) out.who = castId(w, b.who);
      if (b.to !== undefined) { const a = anchorPos(w.setting, b.to); out.to = { world: w.i, p: a ? a.p.map(r3) : GLOBAL_ANCHORS.center, id: b.to, prop: !!a?.prop }; }
      for (const k of ["value", "amount", "symbol", "text", "dur", "hold"]) if (b[k] !== undefined) out[k] = b[k];
      raw.push(out);
    });
    const density = (w.payload.beats.length) / Math.max(1, w.t1 - w.t0);
    if (density < 0.3) warnings.push(`world ${w.i + 1} (${w.setting}) has ${w.payload.beats.length} beats in ${(w.t1 - w.t0).toFixed(1)} s (${density.toFixed(2)}/s); aim for at least 0.5 beats per second`);
  });
  // single mode: the hero walks between stations (synthetic walk at the start of each world)
  if (single) worlds.slice(1).forEach((w) => {
    const c = w.cast.find((x) => x.who === "hero") ?? w.cast[0];
    raw.push({ t: w.t0, world: w.i, do: "walk", who: c.id, to: { world: w.i, p: c.at, id: "station", prop: false }, dur: SINGLE_TRAVEL_SEC - 0.1, synthetic: true });
  });
  raw.sort((a, b) => a.t - b.t || a.world - b.world);

  // 4) transitions, travel windows, shots
  worlds.forEach((w) => {
    if (w.i > 0) { if (single) w.travel = { t0: w.t0, t1: r3(w.t0 + SINGLE_TRAVEL_SEC) }; else w.transition = w.payload.transition ?? TRANSITION_CYCLE[(w.i - 1) % TRANSITION_CYCLE.length]; }
    w.refTime = (ref) => resolveWordRef(words, ref)?.t ?? null;
    w.shots = planShots(w, raw.filter((b) => b.world === w.i), w.cast.map((c) => c.id), payload.camera, warnings);
  });

  // 5) sfx
  const sfx = [];
  raw.forEach((b) => { const k = SFX_OF[b.do]; if (k && !b.synthetic) sfx.push({ at: b.t, kind: k }); });
  worlds.slice(1).forEach((w) => sfx.push({ at: r3(Math.max(0, w.t0 - 0.15)), kind: "cut" }));
  sfx.sort((a, b) => a.at - b.at);
  const sfxOut = []; for (const s of sfx) { const last = sfxOut[sfxOut.length - 1]; if (last && s.at - last.at < 0.12 && last.kind === s.kind) continue; sfxOut.push(s); }

  const data = {
    dur, fps: 30, mode: single ? "single" : "multi", style: style.id, hero: heroModel, camera: payload.camera, capsDefault: !!captionsEnabled,
    groups: captionGroups(words), words: words.map((w) => ({ t0: r3(w.start), t1: r3(w.end) })),
    worlds: worlds.map(({ payload: _p, refTime: _r, ...w }) => w), beats: raw,
  };
  return { data, sfx: sfxOut, warnings, durationSec: dur, style };
}
export { EMOTE_HOLD, HERO_IDS, MODELS, SHOTS };
