// Sentence coverage: every narrated sentence must have something drawn that changes AND something that interacts.
// Pure functions of (words, resolved beats): no I/O, deterministic. Used by resolve (warnings) and by tests.
import { PROP_ACTS } from "./catalog.mjs";
import { MECH_KINDS } from "./schema.mjs";

/** Prop actions that count as an interaction (pulse is only emphasis). */
const PROP_CHANGES = PROP_ACTS.filter((k) => k !== "pulse");
/** Beats that change what is drawn (props, objects, cast); stamps, labels, emotes, camera and HUD do not. */
export const DRAWN_KINDS = [...PROP_CHANGES, "pulse", ...MECH_KINDS, "walk", "point", "jump", "cheer"];
export const INTERACTION_KINDS = [...PROP_CHANGES, ...MECH_KINDS];
export const STAMP_KINDS = ["hero-stamp", "label", "x2", "emote", "react", "shake", "flash", "radial-burst", "push", "pan", "progress", "counter", "follow"];
const END = /[.?!…]["')»]?$/;

/** Sentences of the narration: [{ i, text, t0, t1, words }]. t1 is the start of the next sentence (last: end of speech + 0.3 s). */
export function splitSentences(words) {
  const ws = (words ?? []).filter((w) => w && typeof w.text === "string"), out = []; let cur = [];
  const flush = () => { if (cur.length) { out.push({ i: out.length, words: cur, text: cur.map((w) => w.text).join(" "), t0: cur[0].start, t1: 0 }); cur = []; } };
  ws.forEach((w) => { cur.push(w); if (END.test(w.text.trim())) flush(); });
  flush();
  out.forEach((s, k) => { s.t1 = out[k + 1] ? out[k + 1].t0 : s.words[s.words.length - 1].end + 0.3; });
  return out;
}

/**
 * @param {{ words: Array, beats: Array<{t:number,do:string,target?:string,auto?:boolean,ambient?:boolean}>, propIds?: string[] }} a
 * `beats` are all beats of the video (resolved times). `written` beats exclude the ones the engine added (auto / ambient).
 * @returns {{ sentences: Array<{i,text,t0,t1,drawn,interactions,stampsOnly,auto,ok,issues:string[]}>, ok: boolean, missing: number[] }}
 */
export function coverageReport({ words, beats, countAuto = false }) {
  const list = beats.filter((b) => countAuto || (!b.auto && !b.ambient));
  const sentences = splitSentences(words).map((s) => {
    const inside = list.filter((b) => b.t >= s.t0 - 0.05 && b.t < s.t1 - 0.05);
    const drawn = inside.filter((b) => DRAWN_KINDS.includes(b.do)).length, interactions = inside.filter((b) => INTERACTION_KINDS.includes(b.do)).length;
    const stampsOnly = inside.length > 0 && inside.every((b) => STAMP_KINDS.includes(b.do));
    const issues = [];
    if (!drawn) issues.push("nothing drawn changes (no prop action or moving object)");
    if (!interactions) issues.push("no interaction beat (travel, transform, spawn, count, carry, compare, reject or a prop action)");
    if (stampsOnly) issues.push("covered only by stamps/labels");
    return { i: s.i, text: s.text, t0: +s.t0.toFixed(2), t1: +s.t1.toFixed(2), drawn, interactions, stampsOnly, ok: issues.length === 0, issues };
  });
  return { sentences, ok: sentences.every((s) => s.ok), missing: sentences.filter((s) => !s.ok).map((s) => s.i) };
}

/** One warning line per sentence that fails the lint. */
export function coverageWarnings(report) {
  return report.sentences.filter((s) => !s.ok).map((s) => `coverage: sentence ${s.i + 1} (${s.t0.toFixed(1)}-${s.t1.toFixed(1)} s) "${s.text.slice(0, 60)}": ${s.issues.join("; ")}`);
}

/** Props used by beats that are not in the world's scenario (should be empty after schema validation; kept as a lint on resolved data). */
export function foreignProps(worlds, propsOf) {
  const out = [];
  worlds.forEach((w, wi) => { const ids = propsOf(w); for (const b of w.beats) for (const k of ["target", "to"]) if (typeof b[k] === "string" && ["travel", "transform", "spawn", "stack", "vanish", "count", "compare", "carry", "reject", ...PROP_ACTS].includes(b.do) && !ids.includes(b[k]) && !["hero", "left", "center", "right"].includes(b[k]) && !(w.cast ?? []).some((c) => c.who === b[k])) out.push(`world ${wi + 1}: ${b.do}.${k} ${JSON.stringify(b[k])} is not a prop of the scenario`); });
  return out;
}

const EMPTY_SKIP = new Set(["para", "pero", "como", "esta", "este", "estos", "estas", "cuando", "donde", "porque", "entonces", "tambien", "that", "this", "with", "from", "then", "they", "your", "tiene", "cada", "sino", "solo", "todo", "toda", "sobre", "algo", "mucho", "ahora"]);
const nw = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const ITEM_CYCLE = ["box", "msg", "coin", "tile"];

/**
 * Minimal literal interactions for sentences that lack one: a pulse on a prop plus a token travelling from the hero to it.
 * Never changes existing beats; each sentence gets one pair bound to a spoken word. Pure; `propIds` order = preference (nearest first).
 * @returns {Array<object>} beats with `auto: true`, `interact: true`
 */
export function interactPunctuate({ sentences, beats, propIds, t0, t1 }) {
  if (!propIds?.length) return [];
  const added = []; let k = 0, last = null;
  for (const s of sentences) {
    if (s.t0 < t0 - 0.01 || s.t0 >= t1 - 0.4) continue;
    const has = beats.concat(added).some((b) => INTERACTION_KINDS.includes(b.do) && b.t >= s.t0 - 0.05 && b.t < s.t1 - 0.05);
    if (has) continue;
    const free = (t) => beats.concat(added).every((b) => Math.abs(b.t - t) >= 0.5);
    const cands = s.words.map((w) => ({ w, k: nw(w.text) })).filter(({ w, k: kk }) => w.start >= t0 && w.start <= t1 - 0.8 && kk.length >= 4 && !EMPTY_SKIP.has(kk) && free(w.start));
    const pick = cands.sort((a, b) => b.k.length - a.k.length || a.w.start - b.w.start)[0] ?? s.words.map((w) => ({ w, k: nw(w.text) })).find(({ w }) => w.start >= t0 && w.start <= t1 - 0.8 && free(w.start));
    if (!pick) continue;
    const dest = propIds.find((p) => p !== last) ?? propIds[0]; last = dest;
    const t = +pick.w.start.toFixed(3);
    added.push({ t, do: "pulse", target: dest, on: { at: t }, auto: true, interact: true });
    added.push({ t, do: "travel", who: "hero", to: dest, item: ITEM_CYCLE[k++ % ITEM_CYCLE.length], path: "arc", land: "burst", dur: 0.8, on: { at: t }, auto: true, interact: true });
  }
  return added;
}
