// Resolves a validated payload against the narration: world windows, beat times (bound to words), caption groups, sfx cues.
// Pure and deterministic: the same inputs always give the same output.
import { getMascot } from "./mascots.mjs";
import { getScenario, PROP_ACTS, worldProps, workshopProps } from "./catalog.mjs";
import { densify, DENSITY_MIN_PER_SEC, punctuate, punchLoad, deriveShakes, capFlashes, PUNCH_MIN_PER_SEC, FLASH_MAX_PER_10S } from "./normalize.mjs";
import { getStyle, pixelGrid } from "./styles.mjs";
import { splitSentences, coverageReport, coverageWarnings, interactPunctuate, foreignProps } from "./coverage.mjs";

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

const SFX_OF = { fill: "blip", open: "pop", close: "click", light: "blip", dim: "click", burst: "hit", recolor: "pop", coins: "coin", chop: "hit", stamp: "stamp", pulse: "pop", transform: "pop", spawn: "pop", stack: "pop", vanish: "pop", count: "blip", compare: "coin", carry: "click", reject: "hit", travel: "whoosh", "hero-stamp": "stamp", x2: "coin", shake: "hit", "radial-burst": "pop", emote: "blip", label: "pop", pan: "whoosh", push: "whoosh", react: "blip", jump: "pop", cheer: "coin", progress: "blip", counter: "blip", follow: "click" };

/**
 * Seeded camera drift of a world: [amplitude in logical px, period in s, phase in rad]. The runtime turns it into a slow parallax
 * sway of the far, back and foreground layers, so the camera is never idle for more than a couple of seconds.
 */
export function driftOf(wi, n, styleId = "") {
  let h = 2166136261 ^ (wi * 7919 + n * 104729);
  for (const c of String(styleId)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const r = (k) => { const x = Math.sin((h + k * 977) * 12.9898) * 43758.5453; return x - Math.floor(x); };
  return [+(4 + r(1) * 3).toFixed(2), +(6 + r(2) * 4).toFixed(2), +(r(3) * Math.PI * 2).toFixed(3)];
}

/**
 * @returns {{ data: object, sfx: Array<{at:number,kind:string}>, warnings: string[], durationSec: number }}
 */
export function resolvePayload({ payload, words, durationSec, mode = "multi", captionsEnabled = true, quality }) {
  const warnings = [];
  const ws = (words ?? []).filter((w) => w && typeof w.text === "string").map((w) => ({ text: w.text, start: +w.start, end: +w.end })).filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end));
  const lastEnd = ws.length ? ws[ws.length - 1].end : 0;
  const dur = +(durationSec > 0 ? durationSec : lastEnd > 0 ? lastEnd + 0.6 : 20).toFixed(3);
  const baseStyle = getStyle(payload.style);
  const grid = pixelGrid(baseStyle, payload.pixelScale, quality);
  if (payload.pixelScale && payload.pixelScale !== "standard" && grid.scale === "standard") warnings.push(`pixelScale "${payload.pixelScale}" ignored: draft quality always renders standard`);
  const style = grid.px === baseStyle.px ? baseStyle : { ...baseStyle, px: grid.px };
  const n = payload.worlds.length;
  const flashRefs = [];

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
  const sentences = splitSentences(ws), capG = captionGroups(ws), writtenBeats = [], allBeats = [], addedInteract = [];
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
    writtenBeats.push(...beats.map((b) => ({ t: b.t, do: b.do })));
    const propsOrdered = worldProps(w).slice().sort((a, b) => Math.abs((a.x ?? 135) + (a.w ?? 0) / 2 - 135) - Math.abs((b.x ?? 135) + (b.w ?? 0) / 2 - 135)).map((p) => p.id);
    const inter = interactPunctuate({ sentences, beats, propIds: propsOrdered, t0, t1 });
    if (inter.length) {
      beats.push(...inter.map((d, k) => ({ ...d, _i: -300 - k })));
      addedInteract.push(...inter.filter((d) => d.do === "travel"));
      warnings.push(`world ${wi + 1}: ${inter.length / 2} sentence(s) had no interaction; added a pulse and a travelling token on ${inter.filter((d) => d.do === "travel").map((d) => `${d.to}@${d.t.toFixed(1)}s`).join(", ")}`);
    }
    const dens = densify({ t0, t1, beats, words: ws, propIds: worldProps(w).map((p) => p.id), castIds: (w.cast ?? [{ who: "hero" }]).map((c) => c.who) });
    if (dens.length) {
      const before = beats.length / (t1 - t0);
      beats.push(...dens.map((d, k) => ({ ...d, _i: -1 - k })));
      warnings.push(`world ${wi + 1}: ${before.toFixed(2)} beats/s is below ${DENSITY_MIN_PER_SEC}; added ${dens.length} ambient reaction beat(s) (${dens.map((d) => `${d.do}@${d.t.toFixed(1)}s`).join(", ")})`);
    }
    const pun = punctuate({ t0, t1, beats, words: ws, propIds: worldProps(w).map((p) => p.id), castIds: (w.cast ?? [{ who: "hero" }]).map((c) => c.who), flash: !!payload.flash, hook: wi === 0, groups: capG });
    if (pun.length) {
      const before = punchLoad(beats, !!payload.flash) / (t1 - t0);
      beats.push(...pun.map((d, k) => ({ ...d, _i: -100 - k })));
      warnings.push(`world ${wi + 1}: ${before.toFixed(2)} punch events/s (stamp, shake, burst, flash, emote) is below ${PUNCH_MIN_PER_SEC}; added ${pun.length} bound to strong words (${pun.map((d) => `${d.do}@${d.t.toFixed(1)}s`).join(", ")})`);
    }
    const shk = deriveShakes(beats);
    if (shk.length) beats.push(...shk.map((d, k) => ({ ...d, _i: -200 - k })));
    const out = [];
    for (const b of beats) {
      const { _i, on, ...rest } = b;
      if (b.do === "flash" && !payload.flash) { warnings.push(`world ${wi + 1} beat ${_i + 1}: \`flash\` ignored because the top-level \`flash\` option is off (default)`); continue; }
      if (b.do === "progress" || b.do === "counter") { hud.push({ t: b.t, hud: b.do, value: b.value, label: b.label ?? b.text ?? null }); }
      else if (b.do === "follow") { /* handled by the brand pill */ }
      else { out.push(rest); if (b.do === "flash") flashRefs.push({ out, rest, t: b.t, wi }); }
      if (SFX_OF[b.do] && !b.ambient) sfx.push({ at: b.t, kind: SFX_OF[b.do] });
      if (b.do === "travel") sfx.push({ at: +(b.t + (b.dur ?? 0.9)).toFixed(3), kind: b.land === "slam" ? "hit" : b.land === "none" ? "click" : b.land === "burst" ? "coin" : "pop" });
      allBeats.push({ t: b.t, do: b.do, target: b.target, auto: !!b.auto || !!b.ambient });
    }
    const byTarget = {};
    for (const b of out) if (b.do === "fill" && typeof b.target === "string") (byTarget[b.target] ??= []).push(b);
    for (const [id, list] of Object.entries(byTarget)) warnings.push(...nudgeSeries(list, `world ${wi + 1} fill of ${id}: the nudged value is`).map((m) => m.replace(": the nudged value is", ": fill")));
    if (wi > 0) sfx.push({ at: +(t0 - 0.5).toFixed(3), kind: "whoosh" });
    return { sc: w.scenario, t0, t1, dr: driftOf(wi, n, payload.style), tr: w.transition ?? defaultTr[(wi - 1 + 4) % 4], time: w.time ?? null, cast: w.cast ?? null, pl: sc.dynamic ? workshopProps(w.props) : undefined, th: sc.dynamic ? w.theme ?? "bench" : undefined, beats: out, _props: sc.props.length };
  });
  worlds.forEach((w) => delete w._props);
  if (flashRefs.length) {
    const { dropped } = capFlashes(flashRefs.map((f) => f.t));
    for (const t of dropped) {
      const f = flashRefs.find((r) => r.t === t && r.out.includes(r.rest)); if (!f) continue;
      f.out.splice(f.out.indexOf(f.rest), 1);
      warnings.push(`world ${f.wi + 1}: flash at ${t.toFixed(2)} s dropped (photosensitivity guard: none before 0.5 s, at most ${FLASH_MAX_PER_10S} per 10 s, 0.5 s apart)`);
    }
  }
  const covWritten = coverageReport({ words: ws, beats: writtenBeats }), covFinal = coverageReport({ words: ws, beats: allBeats, countAuto: true });
  warnings.push(...coverageWarnings(covWritten).map((m) => m + (covFinal.sentences[+m.match(/sentence (\d+)/)[1] - 1]?.ok ? " [fixed by an automatic interaction]" : "")));
  warnings.push(...foreignProps(worlds, (w) => { const sc = getScenario(w.sc); return sc?.dynamic ? workshopProps(w.pl).map((p) => p.id) : (sc?.props ?? []).map((p) => p.id); }));
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
    data: { dur, mode, ambient: payload.ambient ?? "normal", layout: payload.layout, hero: payload.hero, mascots: usedMascots(payload), flash: !!payload.flash, pixelScale: grid.scale, ss: grid.ss, capsDefault: !!captionsEnabled, brand, words: ws, caps: captionGroups(ws), hud, worlds },
    sfx: dedup, warnings, durationSec: dur, style, coverage: { written: covWritten, final: covFinal },
  };
}
export { PROP_ACTS };

/** Designs of the data-defined mascots a payload uses (its hero and any mascot in a world's cast), inlined for the browser runtime. */
export function usedMascots(payload) {
  const ids = new Set([payload.hero, ...(payload.worlds ?? []).flatMap((w) => (w.cast ?? []).map((c) => c?.who))]);
  return [...ids].map((id) => getMascot(id)).filter(Boolean);
}
