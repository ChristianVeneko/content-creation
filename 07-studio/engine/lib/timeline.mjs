// Pure timing math: scene durations, overlaps from transitions, narration offsets, fallback captions.

export const TIMING = {
  transitionFrames: 12, // scene-to-scene transition overlap
  leadSec: 0.15, // silence before a scene's narration starts (after its transition settles)
  tailSec: 0.35, // breathing room after a scene's narration
  endTailSec: 0.9, // extra hold on the final scene
  minSceneSec: 1.6,
  secPerWord: 0.3, // reading time used when there is no voice audio
};

export const countWords = (text) => (text.trim().match(/\S+/g) ?? []).length;

/**
 * Compute the scene timeline.
 * @param {{audioSec?: number|null, durationSec?: number, narration: string}[]} scenes
 * @param {{fps: number, transitionFrames?: number}} opts
 * @returns {{scenes: {from: number, durationInFrames: number, speechStartMs: number, speechSec: number}[], totalFrames: number, transitionFrames: number}}
 *
 * Each scene lasts lead + speech + tail (or durationSec when longer), plus the transition overlap
 * it shares with the next scene, so narration never runs into the next transition.
 */
export function computeTimeline(scenes, { fps, transitionFrames = TIMING.transitionFrames }) {
  const n = scenes.length;
  const t = n > 1 ? transitionFrames : 0;
  let from = 0;
  const out = scenes.map((s, i) => {
    const speechSec = s.audioSec ?? countWords(s.narration) * TIMING.secPerWord;
    const last = i === n - 1;
    const needed = TIMING.leadSec + speechSec + TIMING.tailSec + (last ? TIMING.endTailSec : 0);
    const sec = Math.max(needed, s.durationSec ?? 0, TIMING.minSceneSec);
    const durationInFrames = Math.ceil(sec * fps) + (last ? 0 : t);
    // The incoming transition covers the first `t` frames; speech starts right after it settles a bit.
    const speechStartFrame = from + (i === 0 ? 0 : Math.round(t / 2));
    const scene = {
      from,
      durationInFrames,
      speechStartMs: Math.round((speechStartFrame / fps + TIMING.leadSec) * 1000),
      speechSec,
    };
    from += durationInFrames - (last ? 0 : t);
    return scene;
  });
  return { scenes: out, totalFrames: from, transitionFrames: t };
}

/**
 * Evenly distribute each scene's narration words over its speech window (Remotion Caption[]).
 * Used when there is no audio (provider "none") or transcription fails.
 */
export function syntheticCaptions(specScenes, timeline) {
  const caps = [];
  specScenes.forEach((s, i) => {
    const words = s.narration.trim().split(/\s+/).filter(Boolean);
    const { speechStartMs, speechSec } = timeline.scenes[i];
    const totalChars = words.reduce((a, w) => a + w.length + 1, 0);
    let t = speechStartMs;
    for (const w of words) {
      const dur = (speechSec * 1000 * (w.length + 1)) / totalChars;
      caps.push({
        text: (caps.length ? " " : "") + w,
        startMs: Math.round(t),
        endMs: Math.round(t + dur),
        timestampMs: Math.round(t + dur / 2),
        confidence: null,
      });
      t += dur;
    }
  });
  return caps;
}

/**
 * Group word captions into pages of at most `wordsPerPage` words, breaking early after sentence punctuation
 * or long pauses. Returns [{startMs, endMs, words: Caption[]}].
 */
export function paginateCaptions(captions, wordsPerPage) {
  const pages = [];
  let cur = [];
  const flush = () => {
    if (cur.length) pages.push({ startMs: cur[0].startMs, endMs: cur[cur.length - 1].endMs, words: cur });
    cur = [];
  };
  captions.forEach((c, i) => {
    const prev = captions[i - 1];
    if (cur.length && prev && c.startMs - prev.endMs > 700) flush();
    cur.push(c);
    if (cur.length >= wordsPerPage || /[.!?…:;]$/.test(c.text.trim())) flush();
  });
  flush();
  // Keep each page on screen until the next one starts (max +400ms of hold) to avoid flicker.
  pages.forEach((p, i) => {
    const next = pages[i + 1];
    p.endMs = next ? Math.min(next.startMs, p.endMs + 400) : p.endMs + 400;
  });
  return pages;
}

const norm = (w) =>
  w
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Keep the transcription's word timings but show the script's exact words (fixes misheard terms like "SDD").
 * Words are matched with an LCS over normalized tokens; unmatched script words share the time between anchors.
 * @param {object[]} captions Caption[] from the transcriber
 * @param {string[]} narrations scene narrations in order
 */
export function alignToScript(captions, narrations) {
  const script = narrations.flatMap((n) => n.trim().split(/\s+/).filter(Boolean));
  if (!captions.length || !script.length) return captions;
  const a = script.map(norm);
  const b = captions.map((c) => norm(c.text));
  const n = a.length;
  const m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] && a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const match = new Array(n).fill(-1);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (a[i] && a[i] === b[j]) {
      match[i++] = j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  const out = [];
  let i = 0;
  while (i < n) {
    if (match[i] >= 0) {
      const c = captions[match[i]];
      out.push({ ...c, text: script[i] });
      i++;
      continue;
    }
    // run of unmatched script words [i, k)
    let k = i;
    while (k < n && match[k] < 0) k++;
    const prevJ = i > 0 ? match[i - 1] : -1;
    const nextJ = k < n ? match[k] : m;
    const gap = captions.slice(prevJ + 1, nextJ);
    const start = gap.length ? gap[0].startMs : prevJ >= 0 ? captions[prevJ].endMs : 0;
    const end = gap.length ? gap[gap.length - 1].endMs : nextJ < m ? captions[nextJ].startMs : start + 300 * (k - i);
    const span = Math.max(1, end - start) / (k - i);
    for (let q = i; q < k; q++) {
      const s = Math.round(start + (q - i) * span);
      const e = Math.round(start + (q - i + 1) * span);
      out.push({ text: script[q], startMs: s, endMs: e, timestampMs: Math.round((s + e) / 2), confidence: null });
    }
    i = k;
  }
  return out.map((c, idx) => ({ ...c, text: (idx ? " " : "") + c.text.trim() }));
}
