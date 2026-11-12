// Shorts-style burned-in captions for opuscar pages (repo addition, see ADAPTER.md).
// Big 1-3 word chunks timed to every spoken word, the spoken word lit in the accent colour, a short pop-in per chunk.
// Copy this file into the film folder and import it:
//
//   import { makeCaptions } from './shorts-captions.js';
//   const CAP = await makeCaptions({ words: WORDS, starts: STARTS, fontUrl: 'fonts/Montserrat-Black.ttf', accent: '#C6F432' });
//   window.render = t => { ...draw the frame...; CAP.render(t); };
//
// words  = voices/words.json  ({id: [[word, start, end], ...]}, seconds from the start of each line's WAV)
// starts = {id: second the line starts in the film}  (voices/starts.json + your lead-in, or your own timeline)
// Await it before window.READY = true (it loads the font). It is a DOM layer, so canvas, WebGL and DOM pages all work.
// The film's .srt stays sentence-level (cues.json); these captions are not reported in TEXTS(t).

const PUNCT = /[.,:;!?…)»"]$/;

export async function makeCaptions(o) {
  const opt = Object.assign({
    ids: null,            // line order; default: sorted by start
    parent: document.body,
    font: 'ShortCap', fontUrl: null, weight: 900,
    size: 84,             // px
    y: 1330,              // centre of the caption block (inside the 900x1300 safe box: 310-1610)
    width: 900,
    color: '#FFFFFF', accent: '#C6F432', stroke: '#0C0F14', strokeW: 13,
    shadow: '0 8px 22px rgba(0,0,0,.55)',
    upper: false,
    maxWords: 3, maxChars: 16,
    emphasis: [],         // words always drawn in the accent colour (case-insensitive, punctuation ignored)
    hold: 0.3,            // seconds a chunk stays after its last word when no chunk follows at once
    hide: [],             // [[t0, t1], ...] spans with no captions (e.g. a title card that already says it)
    z: 50,
  }, o);
  if (opt.fontUrl) {
    const f = new FontFace(opt.font, `url(${opt.fontUrl})`, { weight: String(opt.weight) });
    await f.load(); document.fonts.add(f);
  }
  const ids = opt.ids || Object.keys(opt.starts).filter(id => opt.words[id]).sort((a, b) => opt.starts[a] - opt.starts[b]);
  const norm = w => w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '');
  const emph = new Set(opt.emphasis.map(norm));

  // words on the film clock
  const chunks = [];
  for (const id of ids) {
    const base = opt.starts[id]; let cur = null;
    for (const [w, s, e] of opt.words[id]) {
      const W = { w, s: base + s, e: base + e };
      const chars = cur ? cur.words.reduce((n, x) => n + x.w.length + 1, 0) + w.length : 0;
      if (!cur || cur.words.length >= opt.maxWords || chars > opt.maxChars || PUNCT.test(cur.words.at(-1).w)) {
        cur = { words: [], line: id }; chunks.push(cur);
      }
      cur.words.push(W);
    }
  }
  chunks.forEach((c, i) => {
    c.t0 = c.words[0].s; const n = chunks[i + 1]; const end = c.words.at(-1).e;
    c.t1 = n && n.words[0].s - end < 0.7 ? n.words[0].s : end + opt.hold;
    c.text = c.words.map(x => x.w).join(' ');
  });

  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'absolute', left: `${(1080 - opt.width) / 2}px`, width: `${opt.width}px`, top: `${opt.y}px`,
    transform: 'translateY(-50%)', textAlign: 'center', pointerEvents: 'none', zIndex: opt.z,
    fontFamily: `'${opt.font}', Montserrat, Arial, sans-serif`, fontWeight: opt.weight, fontSize: `${opt.size}px`,
    lineHeight: 1.08, letterSpacing: '-0.01em', color: opt.color,
    WebkitTextStroke: `${opt.strokeW}px ${opt.stroke}`, paintOrder: 'stroke fill', textShadow: opt.shadow,
    textTransform: opt.upper ? 'uppercase' : 'none',
  });
  const inner = document.createElement('div'); inner.style.display = 'inline-block'; inner.style.transformOrigin = '50% 60%';
  box.appendChild(inner); opt.parent.appendChild(box);

  let shown = null, spans = [];
  const back = x => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  function render(t) {
    const hidden = opt.hide.some(([a, b]) => t >= a && t < b);
    const c = hidden ? null : chunks.find(k => t >= k.t0 && t < k.t1);
    if (c !== shown) {
      shown = c; inner.textContent = ''; spans = [];
      if (c) for (const [i, W] of c.words.entries()) {
        const sp = document.createElement('span'); sp.textContent = W.w; sp.style.display = 'inline-block';
        sp.style.margin = '0 0.14em'; sp.style.transformOrigin = '50% 70%';
        inner.appendChild(sp); spans.push(sp);
      }
    }
    box.style.visibility = c ? 'visible' : 'hidden';
    if (!c) return;
    const k = Math.min(1, (t - c.t0) / 0.14);
    inner.style.transform = `scale(${0.8 + 0.2 * back(k)})`;
    inner.style.opacity = String(Math.min(1, k * 2.5));
    c.words.forEach((W, i) => {
      const next = c.words[i + 1]; const on = t >= W.s && t < (next ? next.s : c.t1);
      spans[i].style.color = on || emph.has(norm(W.w)) ? opt.accent : opt.color;
      spans[i].style.transform = on ? 'translateY(-4px)' : 'none';
    });
  }
  return { render, chunks, el: box };
}
