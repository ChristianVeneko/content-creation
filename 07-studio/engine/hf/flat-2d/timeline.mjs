// Turns spoken-word references into seconds: scene entry times, travel windows and one time per beat.
import { locateWord } from "./words.mjs";
import { clamp, r2 } from "./util.mjs";

const MIN_SCENE = 2.2;

export function resolveTimeline(hf, words, durationSec, mode) {
  const warnings = [];
  const S = hf.scenes.length;
  const D = durationSec;
  const find = (ref, where) => {
    const hit = locateWord(words, ref);
    if (!hit) warnings.push(`${where}: word "${ref.word ?? ref.at}"${ref.n ? ` #${ref.n}` : ""} not found in the narration`);
    else if (hit.how !== "exact") warnings.push(`${where}: word "${ref.word}" matched "${hit.text}" (${hit.how})`);
    return hit;
  };
  const enter = hf.scenes.map((s, i) => {
    if (i === 0) return 0;
    const hit = s.enter ? find(s.enter, `scenes.${i}.enter`) : null;
    if (hit) return hit.start + (s.enter.offset ?? 0);
    const w = words.length ? words[Math.min(words.length - 1, Math.floor((i * words.length) / S))].start : (D * i) / S;
    return w;
  });
  for (let i = 1; i < S; i++) {
    if (enter[i] < enter[i - 1] + MIN_SCENE) { warnings.push(`scenes.${i}: entry moved to keep scenes at least ${MIN_SCENE}s long`); enter[i] = enter[i - 1] + MIN_SCENE; }
  }
  if (S > 1 && enter[S - 1] > D - 1.5) { warnings.push("last scene entry is too close to the end; squeezing scenes"); for (let i = 1; i < S; i++) enter[i] = Math.min(enter[i], D - 1.5 - (S - 1 - i) * 1.2); }
  const scenes = hf.scenes.map((s, i) => {
    const exit = i + 1 < S ? enter[i + 1] : D;
    return { enter: r2(enter[i]), exit: r2(exit) };
  });
  const beats = hf.scenes.map((s, si) => {
    const sc = scenes[si];
    const lo = si === 0 ? 0.05 : sc.enter + 0.1, hi = Math.max(lo + 0.1, sc.exit - 0.3);
    let unresolved = 0;
    const out = s.beats.map((b, bi) => {
      const hit = find(b.on, `scenes.${si}.beats.${bi}`);
      let t, tEnd;
      if (hit) { t = hit.start + (b.on.offset ?? 0); tEnd = Math.max(t + 0.15, hit.end + (b.on.offset ?? 0)); }
      else { unresolved++; t = lo + ((hi - lo) * unresolved) / (s.beats.length + 1); tEnd = t + 0.4; }
      const tc = clamp(t, lo, hi);
      return { ...b, si, bi, t: r2(tc), tEnd: r2(Math.max(tc + 0.15, tEnd + (tc - t))) };
    });
    return out.map((b, i) => ({ ...b, order: i })).sort((a, b) => a.t - b.t || a.order - b.order);
  });
  return { enter: scenes.map((s) => s.enter), scenes, beats, warnings, duration: D };
}
