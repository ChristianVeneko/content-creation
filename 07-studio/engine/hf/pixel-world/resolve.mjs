// Resolves a validated payload against the narration: world windows, beat times (bound to words), caption groups, sfx cues.
// Pure and deterministic: the same inputs always give the same output.
import { getScenario, PROP_ACTS, worldProps, workshopProps } from "./catalog.mjs";
import { densify, DENSITY_MIN_PER_SEC } from "./normalize.mjs";
import { getStyle } from "./styles.mjs";

/** Smallest visible change of a progress bar or a prop fill between two consecutive values (12 % of its length). */
export const MIN_VISIBLE_DELTA = 0.12;
/** Nudges values whose change from the previous one is too small to notice, in time order (never lowers a big change). Returns descriptions of what moved. */
function nudgeSeries(items, label) {
  const notes = [], r2 = (v) => +v.toFixed(2);
  let prev = 0;
  for (const it of items.slice().sort((a, b) => a.t - b.t)) {
    const v = it.value;
    if (typeof v === "number" && Math.abs(v - prev) < MIN_VISIBLE_DELTA - 1e-9) {
      const up = v >= prev, nv = up ? Math.min(1, r2(prev + MIN_VISIBLE_DELTA)) : Math.max(0, r2(prev - MIN_VISIBLE_DELTA));
      if (Math.abs(nv - prev) > Math.abs(v - prev) + 1e-9) { notes.push(`${label} at ${it.t.toFixed(2)} s moved from ${v} to ${nv} so the change is visible (minimum ${Math.round(MIN_VISIBLE_DELTA * 100)} % of the bar)`); it.value = nv; }
    }
    prev = typeof it.value === "number" ? it.value : prev;
  }
  return notes;
}

export const normWord = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}

/**
 * Resolves `{ word, n?, offset? }` (or `{ at }`) to a time. Matching tolerance is fixed: exact word, then prefix of at least
 * 4 letters (singular/plural, stems), then edit distance 1 (words of 4+ letters) or 2 (7+). `n` is the 1-based occurrence;
 * when the narration has fewer occurrences the last one is used. Returns null when nothing matches.
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
    if (STRONG.test(w.text) || (SOFT.test(w.text) && cur.length >= 2) || cur.length >= 4 || nextLen > 20) flush();
  });
  flush();
  // avoid single-word orphans by merging into the previous group when it stays within 4 words
  for (let i = groups.length - 1; i > 0; i--) if (groups[i].length === 1 && groups[i - 1].length < 4 && !STRONG.test(groups[i - 1][groups[i - 1].length - 1].text)) { groups[i - 1].push(...groups[i]); groups.splice(i, 1); }
  return groups.map((g, i) => {
    const next = groups[i + 1], end = g[g.length - 1].end;
    return { ci: i, t0: +g[0].start.toFixed(3), tEnd: +(next ? Math.min(next[0].start, end + 0.45) : end + 0.45).toFixed(3), words: g.map((w) => ({ d: w.text, t0: +w.start.toFixed(3) })) };
  });
}

const SFX_OF = { fill: "blip", open: "pop", close: "click", light: "blip", dim: "click", burst: "hit", recolor: "pop", coins: "coin", chop: "hit", stamp: "stamp", pulse: "pop", "hero-stamp": "stamp", x2: "coin", shake: "hit", "radial-burst": "pop", emote: "blip", label: "pop", pan: "whoosh", push: "whoosh", react: "blip", jump: "pop", cheer: "coin", progress: "blip", counter: "blip", follow: "click" };

/**
 * @returns {{ data: object, sfx: Array<{at:number,kind:string}>, warnings: string[], durationSec: number }}
 */
export function resolvePayload({ payload, words, durationSec, mode = "multi", captionsEnabled = true }) {
  const warnings = [];
  const ws = (words ?? []).filter((w) => w && typeof w.text === "string").map((w) => ({ text: w.text, start: +w.start, end: +w.end })).filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end));
  const lastEnd = ws.length ? ws[ws.length - 1].end : 0;
  const dur = +(durationSec > 0 ? durationSec : lastEnd > 0 ? lastEnd + 0.6 : 20).toFixed(3);
  const style = getStyle(payload.style);
  const n = payload.worlds.length;

  // world windows: explicit `from` where given, even split elsewhere
  const starts = new Array(n).fill(null); starts[0] = 0;
  payload.worlds.forEach((w, i) => {
    if (i === 0 || w.from === undefined) return;
    const r = typeof w.from === "number" ? { t: w.from } : resolveWordRef(ws, w.from);
    if (r) starts[i] = r.t; else warnings.push(`world ${i + 1}: \`from\` word ${JSON.stringify(w.from.word)} not found in the narration; spacing evenly`);
  });
  let i = 0;
  while (i < n) {
    if (starts[i] !== null) { i++; continue; }
    let j = i; while (j < n && starts[j] === null) j++;
    const a = starts[i - 1], b = j < n ? starts[j] : dur, cnt = j - i + 1;
    for (let k = i; k < j; k++) starts[k] = a + ((b - a) * (k - i + 1)) / cnt;
    i = j;
  }
  for (let k = 1; k < n; k++) if (starts[k] < starts[k - 1] + 2) { starts[k] = Math.min(dur - 0.5, starts[k - 1] + 2); warnings.push(`world ${k + 1} starts less than 2 s after the previous world; moved to ${starts[k].toFixed(2)} s`); }

  const sfx = [], hud = [];
  const defaultTr = ["slide", "tiles", "iris", "down"];
  const worlds = payload.worlds.map((w, wi) => {
    const t0 = +starts[wi].toFixed(3), t1 = +(wi + 1 < n ? starts[wi + 1] : dur).toFixed(3);
    const sc = getScenario(w.scenario);
    const unresolved = [];
    const beats = [];
    w.beats.forEach((b, bi) => {
      const r = resolveWordRef(ws, b.on);
      let t;
      if (r) { t = r.t; if (r.exhausted) warnings.push(`world ${wi + 1} beat ${bi + 1}: word ${JSON.stringify(b.on.word)} occurs fewer than ${b.on.n} times; used the last occurrence`); }
      else { unresolved.push(bi); t = NaN; if (b.on.word !== undefined) warnings.push(`world ${wi + 1} beat ${bi + 1}: word ${JSON.stringify(b.on.word)} not found in the narration; spread inside the world`); }
      beats.push({ ...b, _i: bi, t });
    });
    // unresolved beats are spread evenly across the world window so the content is never dropped
    unresolved.forEach((bi, k) => { beats[bi].t = t0 + ((t1 - t0) * (k + 1)) / (unresolved.length + 1); });
    for (const b of beats) {
      if (b.t < t0 || b.t > t1 - 0.05) { if (b.t < t0 - 0.01 || b.t > t1) warnings.push(`world ${wi + 1} beat ${b._i + 1} (${b.do}) lands outside its world (${b.t.toFixed(2)} s); clamped into ${t0.toFixed(1)}-${t1.toFixed(1)} s`); b.t = Math.min(Math.max(b.t, t0), t1 - 0.05); }
      b.t = +b.t.toFixed(3);
    }
    const dens = densify({ t0, t1, beats, words: ws, propIds: worldProps(w).map((p) => p.id), castIds: (w.cast ?? [{ who: "hero" }]).map((c) => c.who) });
    if (dens.length) {
      const before = beats.length / (t1 - t0);
      beats.push(...dens.map((d, k) => ({ ...d, _i: -1 - k })));
      warnings.push(`world ${wi + 1}: ${before.toFixed(2)} beats/s is below ${DENSITY_MIN_PER_SEC}; added ${dens.length} ambient reaction beat(s) (${dens.map((d) => `${d.do}@${d.t.toFixed(1)}s`).join(", ")})`);
    }
    const out = [];
    for (const b of beats) {
      const { _i, on, ...rest } = b;
      if (b.do === "flash" && !payload.flash) { warnings.push(`world ${wi + 1} beat ${_i + 1}: \`flash\` ignored because the top-level \`flash\` option is off (default)`); continue; }
      if (b.do === "progress" || b.do === "counter") { hud.push({ t: b.t, hud: b.do, value: b.value, label: b.label ?? b.text ?? null }); }
      else if (b.do === "follow") { /* handled by the brand pill */ }
      else out.push(rest);
      if (SFX_OF[b.do] && !b.ambient) sfx.push({ at: b.t, kind: SFX_OF[b.do] });
    }
    const byTarget = {};
    for (const b of out) if (b.do === "fill" && typeof b.target === "string") (byTarget[b.target] ??= []).push(b);
    for (const [id, list] of Object.entries(byTarget)) warnings.push(...nudgeSeries(list, `world ${wi + 1} fill of ${id}: the nudged value is`).map((m) => m.replace(": the nudged value is", ": fill")));
    if (wi > 0) sfx.push({ at: +(t0 - 0.5).toFixed(3), kind: "whoosh" });
    return { sc: w.scenario, t0, t1, tr: w.transition ?? defaultTr[(wi - 1 + 4) % 4], time: w.time ?? null, cast: w.cast ?? null, pl: sc.dynamic ? workshopProps(w.props) : undefined, th: sc.dynamic ? w.theme ?? "bench" : undefined, beats: out, _props: sc.props.length };
  });
  worlds.forEach((w) => delete w._props);
  warnings.push(...nudgeSeries(hud.filter((h) => h.hud === "progress"), "progress beat"));

  let brand = null;
  if (payload.brand) {
    brand = { handle: payload.brand.handle, followAt: null };
    if (payload.brand.follow) { const r = resolveWordRef(ws, payload.brand.follow); brand.followAt = r ? +r.t.toFixed(3) : +(dur - 2).toFixed(3); if (!r) warnings.push("brand.follow word not found; the click lands 2 s before the end"); }
  }
  // dedupe sfx closer than 60 ms of the same kind
  sfx.sort((a, b) => a.at - b.at || a.kind.localeCompare(b.kind));
  const dedup = []; for (const s of sfx) if (!dedup.some((d) => d.kind === s.kind && Math.abs(d.at - s.at) < 0.06)) dedup.push({ at: +s.at.toFixed(3), kind: s.kind });
  return {
    data: { dur, mode, layout: payload.layout, hero: payload.hero, flash: !!payload.flash, capsDefault: !!captionsEnabled, brand, words: ws, caps: captionGroups(ws), hud, worlds },
    sfx: dedup, warnings, durationSec: dur, style,
  };
}
export { PROP_ACTS };
