// Word-by-word captions drawn by the composition itself: 2-4 words per group (max ~22 characters so they never
// wrap past two lines), one keyword in a box, shown only while the `captions` variable is true.
import { esc, normWord, r2 } from "./util.mjs";

const STOP = new Set("el la los las un una unos unas de del al y o u e a en con por para que se su sus lo le les es son ser fue como mas pero si no ni muy ya me te mi tu yo the a an and or of to in on at is are was it this that for with".split(" "));
const MAX_CHARS = 22, MAX_WORDS = 4;

export function groupWords(words) {
  const groups = [];
  let cur = [];
  const chars = (g) => g.reduce((n, w) => n + w.text.replace(/[.,:;]+$/, "").length, 0) + Math.max(0, g.length - 1);
  const flush = () => { if (cur.length) groups.push(cur); cur = []; };
  words.forEach((w, i) => {
    const text = w.text.replace(/[.,:;]+$/, "");
    if (cur.length && (cur.length >= MAX_WORDS || chars(cur) + 1 + text.length > MAX_CHARS)) flush();
    cur.push(w);
    const end = /[.:;,!?]$/.test(w.text);
    if (end && cur.length >= 2) flush();
    else if (end && !words[i + 1]) flush();
  });
  flush();
  return groups;
}

export function buildCaptions(words) {
  const groups = groupWords(words);
  const data = [];
  const html = groups.map((g, gi) => {
    let kw = g.findIndex((w) => /\d/.test(w.text));
    if (kw < 0) { let best = -1, bl = 0; g.forEach((w, i) => { const n = normWord(w.text); if (!STOP.has(n) && n.length > bl) { bl = n.length; best = i; } }); kw = best; }
    const next = groups[gi + 1] ? groups[gi + 1][0].start : Infinity;
    const last = g[g.length - 1];
    const end = Math.min(last.end + 0.12, next - 0.02, last.end + 0.5);
    data.push({ id: `cap${gi}`, start: r2(g[0].start), end: r2(Math.max(end, g[0].start + 0.3)), words: g.map((w, k) => ({ id: `cap${gi}w${k}`, t: r2(w.start) })) });
    return `<div class="cap" id="cap${gi}">${g.map((w, k) => `<span class="cw${k === kw ? " kw" : ""}" id="cap${gi}w${k}">${esc(w.text.replace(/[.,:;]+$/, ""))}</span>`).join("")}</div>`;
  }).join("\n");
  return { data, html };
}
