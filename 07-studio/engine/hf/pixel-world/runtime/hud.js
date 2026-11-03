/* hud.js: readability-critical colours and the HUD (progress bar + counter chip).
 * fnLook() picks the highest-contrast pair of the style palette (WCAG, computed) so every functional element reads in every style:
 * graphics (bar fill, frame, outline) >= 3:1 and text >= 4.5:1. Monochrome and low-colour styles use that pair directly. */
'use strict';
const FN_CACHE = {};
function fnLook() {
  if (FN_CACHE.v) return FN_CACHE.v;
  let best = [PALHEX[0], PALHEX[PALHEX.length - 1]], br = 0;
  for (const a of PALHEX) for (const b of PALHEX) { const r = contrastRatio(a, b); if (r > br) { br = r; best = [a, b]; } }
  const dark = relLum(best[0]) <= relLum(best[1]) ? best[0] : best[1], light = dark === best[0] ? best[1] : best[0];
  const low = !!STYLE.mono || PALHEX.length <= 8;
  const solid = (c) => { const v = col(c); return typeof v === 'string' ? v : null; };
  const pick = (cands, bg, min) => { for (const c of cands) { const v = solid(c); if (v && contrastRatio(bg, v) >= min) return v; } return light; };
  const fill = low ? light : pick([M.green[3], M.teal[3], M.yellow[3], M.green[2], M.orange[3]], dark, 3);
  const value = low ? light : pick([M.yellow[3], M.gold[3], M.orange[3]], dark, 4.5);
  return (FN_CACHE.v = { dark, light, low, track: dark, fill, frame: light, text: light, value, ink: dark });
}
/* lit fill on a dark track / dark ink on a light face: in low-colour styles the palette extremes, elsewhere the given colour */
const fnOn = (c) => (fnLook().low ? { raw: fnLook().light } : c);
const fnDk = (c) => (fnLook().low ? { raw: fnLook().dark } : c);

const glyphH = () => 8 * Math.max(PX, Math.round(1 / PX) * PX); // real glyph height of an 8 px font request (16 in 2x styles)
const hudZones = () => (PX >= 2 ? { progress: ZONES.hudProgress2, counter: ZONES.hudCounter2 } : { progress: ZONES.hudProgress, counter: ZONES.hudCounter });
/* shortens a label to `maxChars`: drops interior vowels from the end first (CULPABLES -> CLPBLS), then cuts; never returns a blank edge */
function abbrevLabel(label, maxChars) {
  let lab = String(label == null ? '' : label).trim();
  if (lab.length <= maxChars) return lab;
  const first = lab.split(/\s+/)[0];
  if (first !== lab && first.length >= 2 && first.length <= maxChars) return first; // several words: keep the first one whole
  const ch = first.split('');
  for (let i = ch.length - 1; i > 0 && ch.length > maxChars; i--) if (/[AEIOUÁÉÍÓÚaeiouáéíóú]/.test(ch[i]) && /[A-Za-zÁÉÍÓÚáéíóú]/.test(ch[i - 1])) ch.splice(i, 1);
  lab = ch.join('');
  return lab.length > maxChars ? lab.slice(0, Math.max(0, maxChars)).trim() : lab;
}
/* the counter chip text that fits the zone (measured with the real glyph width of the style grid) */
function hudCounterLayout(label, val) {
  const z = hudZones().counter, pad = PX >= 2 ? 4 : 6, v = String(val);
  const fitted = (lab) => (lab ? lab + ' ' + v : v);
  let max = String(label || '').trim().length, lab = abbrevLabel(label, max);
  while (max > 0 && txtW(fitted(lab), 8) + 2 * pad > z.w) { max--; lab = abbrevLabel(label, max); }
  const text = fitted(lab);
  return { label: lab, text, textW: txtW(text, 8), pad, w: txtW(text, 8) + 2 * pad };
}
function hudProgressLayout(label) {
  const z = hudZones().progress, fp = Math.max(PX, 1);
  let max = String(label || '').trim().length, lab = abbrevLabel(label, max);
  while (max > 0 && txtW(lab, 8) + 8 + 2 * fp > z.w) { max--; lab = abbrevLabel(label, max); }
  return { label: lab, textW: txtW(lab, 8) };
}
/* pop 0-1: how freshly a progress/counter beat just landed (1 at the beat, 0 after 0.45 s) */
function hudPop(t, kind) {
  let p = 0;
  for (const h of SPEC.hud) { if (kind && h.hud !== kind) continue; const d = t - h.t; if (d >= 0 && d < 0.45) p = Math.max(p, 1 - d / 0.45); }
  return p;
}
function drawHudProgress(g, prog, v, pop) {
  const z = hudZones().progress, F = fnLook();
  progressBar(g, z.x, z.y, z.w, v, M.green, z.h, pop);
  if (prog.label) { const lay = hudProgressLayout(prog.label); if (lay.label) txt(g, lay.label, z.x + 4, z.y + Math.floor((z.h - glyphH()) / 2), 8, { raw: F.text }, 'left', { raw: F.ink }); }
}
function drawHudCounter(g, cnt, s, pop) {
  const z = hudZones().counter, F = fnLook(), lay = hudCounterLayout(cnt.label, s), xr = z.x + z.w, ww = lay.w, bump = pop > 0.4 ? PX : 0, y = z.y - bump, flip = pop > 0.4;
  R(g, xr - ww - 1, y - 1, ww + 2, z.h + 2, { raw: F.ink }); R(g, xr - ww, y, ww, z.h, { raw: F.frame }); R(g, xr - ww + PX, y + PX, ww - 2 * PX, z.h - 2 * PX, { raw: flip ? F.light : F.track });
  const ty = y + Math.floor((z.h - glyphH()) / 2), tc = flip ? { raw: F.dark } : { raw: F.text };
  const labPart = lay.label ? lay.label + ' ' : '';
  txt(g, labPart, xr - ww + lay.pad, ty, 8, tc, 'left'); txt(g, s, xr - lay.pad, ty, 8, flip ? { raw: F.dark } : { raw: F.value }, 'right');
}
