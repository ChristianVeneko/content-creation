// Binding cues to narration: find the n-th occurrence of a word in the word timings (accent-insensitive).
import { normWord } from "./util.mjs";
export { normWord };

/** Strict lookup: { word, n? } or { at } -> { index, start, end, text } or null. */
export function resolveWord(words, ref) {
  if (!ref) return null;
  if (ref.word === undefined) return ref.at === undefined ? null : { index: -1, start: ref.at, end: ref.at, text: "" };
  const target = normWord(ref.word);
  if (!target) return null;
  let seen = 0;
  for (let i = 0; i < words.length; i++) {
    if (normWord(words[i].text) === target && ++seen === (ref.n ?? 1)) return { index: i, start: words[i].start, end: words[i].end, text: words[i].text };
  }
  return null;
}

const lev = (a, b) => {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
};

/** Lenient lookup used by compose: exact, then stem/prefix, then edit distance <= 2. Reports how it matched. */
export function locateWord(words, ref) {
  const exact = resolveWord(words, ref);
  if (exact) return { ...exact, how: "exact" };
  if (ref.word === undefined) return null;
  const target = normWord(ref.word), n = ref.n ?? 1;
  const nw = words.map((w) => normWord(w.text));
  const pick = (pred, how) => {
    let seen = 0;
    for (let i = 0; i < words.length; i++) if (pred(nw[i]) && ++seen === n) return { index: i, start: words[i].start, end: words[i].end, text: words[i].text, how };
    return null;
  };
  if (target.length >= 4) {
    const stem = pick((w) => w.length >= 4 && (w.startsWith(target.slice(0, Math.max(4, target.length - 2))) || target.startsWith(w.slice(0, Math.max(4, w.length - 2)))), "stem");
    if (stem) return stem;
    const near = pick((w) => Math.abs(w.length - target.length) <= 2 && lev(w, target) <= 2, "near");
    if (near) return near;
  }
  return null;
}
