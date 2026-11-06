/* main.js: frame function (multi and single modes), transitions and DOM overlays. Called from the hf-seek event. */
'use strict';
const WORLDS = SPEC.worlds;
WORLDS.forEach(prepWorld);
const TRD = 0.5, TRV = 1.0;
const FLASH_LEN = 0.06; // flash length: less than two frames at 30 fps
const SINGLE = SPEC.mode === 'single', TOWER = SPEC.layout === 'tower';
const SHK = [], STAMPS = [];
WORLDS.forEach((w) => { w.shakes.forEach((s) => SHK.push(s)); w.stamps.forEach((s) => STAMPS.push(s)); });
const FLASH = SPEC.flash ? WORLDS.reduce((a, w) => a.concat(w.flashes), []) : [];
const OFF = []; { let acc = 0; WORLDS.forEach((w, i) => { OFF.push(TOWER ? { x: 0, y: i * H } : { x: acc, y: 0 }); acc += w.W; }); }
const worldTime = (w) => w.time || STYLE.time || w.def.time || 'day';

function tilesClip(p) {
  return (g) => {
    g.beginPath();
    const S = 18, cols = Math.ceil(W / S), rows = Math.ceil(H / S);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const d = (c / cols) * 0.55 + (r / rows) * 0.45 + hs(c * 31 + r * 7) * 0.12; if (d < p * 1.12) g.rect(c * S, r * S, S, S); }
    g.clip();
  };
}
function irisClip(p, cx, cy) {
  return (g) => {
    g.beginPath();
    const r = Math.round(p * 360);
    for (let dy = -r; dy <= r; dy += 2) { const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy))); g.rect(cx - dx, cy + dy, dx * 2 + 1, 2); }
    g.clip();
  };
}
function pass(ox, oy, fn, clipFn) {
  for (const k in L) { L[k].save(); if (clipFn) clipFn(L[k]); L[k].translate(ox, oy); }
  const r = fn();
  for (const k in L) L[k].restore();
  return r;
}
/* cast draw: at pixelScale "fine" the figure is drawn under scale(1/SS) with its measures (u) times SS, so it gets SS times more pixels */
function drawCastX(g, who, o) {
  if (SS === 1) { drawCast(g, who, o); return; }
  const G0 = G, LS0 = LS;
  g.save(); g.scale(1 / SS, 1 / SS); G = PX; LS = 1;
  drawCast(g, who, Object.assign({}, o, { x: o.x * SS, y: o.y * SS, u: o.u * SS, jump: (o.jump || 0) * SS, sq: (o.sq || 0) * SS }));
  G = G0; LS = LS0; g.restore();
}
/* slow seeded camera drift of a world (logical px): a triangle sway (constant speed, so it keeps stepping) with a small wobble at the
 * turns; the far, back and foreground layers sway around the focal plane (props and cast), and together they never rest for 2 s */
function driftAt(w, t) {
  const d = w.dr; if (!d) return 0;
  const a = (t * 6.2832) / d[1] + d[2];
  return d[0] * (0.85 * Math.asin(Math.sin(a)) * 0.63662 + 0.15 * Math.sin(a * 2.3 + d[2] * 1.7));
}
function worldAt(t) { let i = 0; for (let k = 1; k < WORLDS.length; k++) if (t >= WORLDS[k].t0) i = k; return i; }

/* draws one world on all four layers. o: {ox, oy, cam, par, clip, hideHero} */
function drawWorld(i, t, o) {
  const w = WORLDS[i], d = w.def, c = { t, w, time: worldTime(w), idx: i };
  const k1 = o.par ? 0.25 : 1, k2 = o.par ? 0.55 : 1, k3 = o.par ? 1.5 : 1;
  for (const k in L) {
    const g = L[k]; g.save();
    if (o.clip) { g.beginPath(); g.rect(o.ox, o.oy, w.W, H); g.clip(); }
    g.translate(o.ox, o.oy);
  }
  const cam = o.cam, dv = driftAt(w, t);
  lay(L.b, cam, k1, (g) => { if (d.far) d.far(g, t, c); }, -dv * 0.75);
  lay(L.b, cam, k2, (g) => { if (d.back) d.back(g, t, c); }, -dv * 0.45);
  lay(L.m, cam, 1, (g) => {
    if (d.mid) d.mid(g, t, c);
    dressFloor(g, t, w);
    if (o.seam) { if (TOWER) R(g, -40, -2, w.W + 80, 6, M.stone[2]); else { R(g, -2, 0, 8, H, M.stone[1]); R(g, -2, 0, 2, H, M.stone[3]); } }
    for (const id in d.props) drawProp(g, t, w, id, c);
    const order = w.cast.map((cc, ix) => ({ cc, ix })).filter((e) => !(o.hideHero && e.cc.id === 'hero')).sort((a, b) => a.cc.x0 - b.cc.x0);
    for (const { cc } of order) drawCastX(g, cc.who, castState(w, cc, t));
  });
  lay(L.f, cam, k3, (g) => {
    if (d.fore) d.fore(g, t, c);
    dressFore(g, t, w);
    if (STYLE.atmos === 'rain') rain(g, t, 36, 5, M.steel[3]);
    else if (STYLE.atmos === 'embers') embers(g, t, 20, 9, 400);
    else if (STYLE.atmos === 'smoke') dust(g, t, 22, 4, M.steel[3], 3, 60, 360);
  }, dv * 0.6);
  lay(L.u, cam, 1, (g) => worldUI(g, t, w));
  for (const k in L) L[k].restore();
}

function heroDef() { return SPEC.hero; }
function singleCam(t) {
  const n = WORLDS.length; let i = worldAt(t);
  const stationCam = (j, tt) => ({ x: OFF[j].x + (TOWER ? 0 : camAt(WORLDS[j], tt)), y: OFF[j].y });
  const w = WORLDS[i];
  if (i < n - 1 && t >= w.t1 - TRV) {
    const a = stationCam(i, w.t1 - TRV), b = stationCam(i + 1, WORLDS[i + 1].t0), e = EA.io(pr(t, w.t1 - TRV, TRV));
    return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), i, trav: e };
  }
  const s = stationCam(i, t); return { x: s.x, y: s.y, i, trav: 0 };
}
function frameSingle(t) {
  const cam = singleCam(t);
  for (let i = 0; i < WORLDS.length; i++) {
    const w = WORLDS[i], ox = OFF[i].x - cam.x, oy = OFF[i].y - cam.y;
    if (ox > W || ox + w.W < 0 || oy > H || oy + H < 0) continue;
    drawWorld(i, t, { ox: snap(ox), oy: snap(oy), cam: 0, par: false, clip: true, seam: i > 0, hideHero: true });
  }
  // the travelling hero in global coordinates
  const i = cam.i, w = WORLDS[i], hc = w.cast.find((c) => c.id === 'hero');
  if (hc) {
    let s = castState(w, hc, t), gx = OFF[i].x + s.x, gy = OFF[i].y + s.y;
    if (cam.trav > 0 && i < WORLDS.length - 1) {
      const nw = WORLDS[i + 1], nc = nw.cast.find((c) => c.id === 'hero');
      const a = castState(w, hc, w.t1 - TRV), b = nc ? castState(nw, nc, nw.t0) : a;
      const ax = OFF[i].x + a.x, ay = OFF[i].y + a.y, bx = OFF[i + 1].x + b.x, by = OFF[i + 1].y + b.y, e = cam.trav;
      gx = lerp(ax, bx, TOWER ? 0.5 + (b.x - a.x) / W * 0.0 + 0 * e : e); gy = lerp(ay, by, TOWER ? EA.in(e) : e);
      if (TOWER) { gx = OFF[i].x + lerp(a.x, b.x, e); }
      s = { ...s, mv: TOWER ? 0 : 1, dir: TOWER ? s.dir : (bx >= ax ? 1 : -1), ph: gx / (9 * hc.u), mood: TOWER ? 's' : s.mood, fa: TOWER ? 170 : s.fa, ba: TOWER ? -170 : s.ba };
    }
    s.x = gx - cam.x; s.y = gy - cam.y;
    for (const k of ['m']) { L[k].save(); const g = L[k]; drawCastX(g, hc.who, s); L[k].restore(); }
  }
}
function frameMulti(t) {
  let tr = null;
  for (let k = 1; k < WORLDS.length; k++) if (t >= WORLDS[k].t0 - TRD && t < WORLDS[k].t0) tr = { from: k - 1, to: k, p: (t - (WORLDS[k].t0 - TRD)) / TRD };
  const draw = (i) => () => drawWorld(i, t, { ox: 0, oy: 0, cam: snap(camAt(WORLDS[i], t)), par: true });
  if (!tr) { draw(worldAt(t))(); return; }
  const e = EA.io(tr.p), ty = WORLDS[tr.to].tr || 'slide';
  if (ty === 'slide') { pass(-snap(e * W), 0, draw(tr.from)); pass(snap(W - e * W), 0, draw(tr.to)); }
  else if (ty === 'down') { pass(0, -snap(e * H), draw(tr.from)); pass(0, snap(H - e * H), draw(tr.to)); }
  else if (ty === 'tiles') { pass(0, 0, draw(tr.from)); pass(0, 0, draw(tr.to), tilesClip(tr.p)); }
  else { pass(0, 0, draw(tr.from)); pass(0, 0, draw(tr.to), irisClip(tr.p, 135, 300)); }
}
function frame(t) {
  for (const k in L) L[k].clearRect(-20, -20, W + 40, H + 40);
  const [sx, sy] = shakeAt(t, SHK);
  for (const k in L) { L[k].save(); L[k].translate(sx, sy); }
  if (SINGLE) frameSingle(t); else frameMulti(t);
  for (const k in L) L[k].restore();
  overlays(t);
}

/* ---------------- DOM overlays: captions, stamp, flash, brand pill, hud, zoom ---------------- */
const VARS = (window.__hyperframes && window.__hyperframes.getVariables && window.__hyperframes.getVariables()) || {};
const CAPS_ON = VARS.captions !== undefined ? !!VARS.captions : SPEC.capsDefault;
const capsEl = $('caps'), dlgEl = $('dlg'), stampEl = $('stamp'), flashEl = $('flash'), stageEl = $('stage'), pillEl = $('brand');
const capGroups = [];
SPEC.caps.forEach((gr, gi) => {
  const dv = document.createElement('div'); dv.className = 'cg'; dv.id = 'cg' + gi;
  const ws = gr.words.map((wd) => { const s = document.createElement('span'); s.className = 'cw'; s.textContent = wd.d; dv.appendChild(s); return s; });
  if (CAPS_ON) capsEl.appendChild(dv);
  capGroups.push({ el: dv, ws, g: gr });
});
let lastGroup = -1;
const PALSET = PALHEX.slice();
const stampCache = {};
/* stamp look: fill readable (WCAG >= 4.5) against its own ink stroke, else a boxed banner with the best palette pair */
function stampLook(name) {
  if (stampCache[name]) return stampCache[name];
  const r = rampOf(name, M.yellow), cands = [r[2], r[3], r[4]].map(domCol).concat([STYLE.cap.fg, PALHEX[PALORDER[PALORDER.length - 1]]]);
  return (stampCache[name] = stampPair(STYLE.cap.ink, cands, PALSET));
}
const BOXES = STYLE.cap.boxes;
function overlays(t) {
  let cur = -1;
  for (let i = 0; i < SPEC.caps.length; i++) if (t >= SPEC.caps[i].t0 - 0.02 && t < SPEC.caps[i].tEnd) cur = i;
  if (cur !== lastGroup) {
    if (lastGroup >= 0) capGroups[lastGroup].el.style.display = 'none';
    if (cur >= 0) capGroups[cur].el.style.display = 'block';
    lastGroup = cur;
  }
  dlgEl.style.display = CAPS_ON && cur >= 0 ? 'flex' : 'none';
  if (CAPS_ON && cur >= 0) drawDialogPortrait(t);
  if (cur >= 0) {
    const cg = capGroups[cur]; let wi = 0;
    cg.g.words.forEach((w, i) => { if (t >= w.t0 - 0.02) wi = i; });
    cg.ws.forEach((s, i) => {
      const on = i === wi, cls = on ? 'cw on' : i < wi ? 'cw past' : 'cw fut';
      if (s.className !== cls) s.className = cls;
      if (on) { s.style.background = BOXES[(cg.g.ci + i) % BOXES.length]; s.style.color = STYLE.cap.boxInk; s.style.textShadow = 'none'; } else { s.style.background = 'transparent'; s.style.color = STYLE.cap.fg; s.style.textShadow = ''; }
    });
  }
  let st = null;
  for (const s of STAMPS) { const dur = s.dur || 1.2; if (t >= s.t && t < s.t + dur) st = { ...s, t1: s.t + dur }; }
  if (st) {
    const p = EA.back(clamp((t - st.t) / 0.2)), out = clamp((st.t1 - t) / 0.12);
    stampEl.style.display = 'block';
    if (stampEl.textContent !== st.text) stampEl.textContent = st.text;
    const sp = stampLook(st.color);
    stampEl.style.color = sp.fg; stampEl.style.background = sp.boxed ? sp.bg : 'transparent'; stampEl.style.padding = sp.boxed ? '24px 0 30px' : '0'; stampEl.style.lineHeight = sp.boxed ? '1.25' : 'normal';
    stampEl.style.webkitTextStrokeColor = sp.boxed ? 'transparent' : sp.stroke; stampEl.style.webkitTextStrokeWidth = sp.boxed ? '0' : '14px';
    stampEl.style.textShadow = sp.boxed ? 'none' : '8px 8px 0 ' + sp.stroke; stampEl.style.borderTop = stampEl.style.borderBottom = sp.boxed ? '8px solid ' + sp.fg : '0';
    stampEl.style.transform = 'scale(' + ((0.4 + 0.6 * p) * (0.8 + 0.2 * out)).toFixed(3) + ') rotate(' + (st.rot || -2) + 'deg)';
    stampEl.style.opacity = out.toFixed(2);
  } else stampEl.style.display = 'none';
  let fl = 0;
  for (const f of FLASH) { const dt = t - f; if (dt >= 0 && dt < FLASH_LEN) fl = Math.max(fl, 0.5 * (1 - dt / FLASH_LEN)); } // under 2 frames, never above half white
  flashEl.style.opacity = fl.toFixed(2);
  // camera push (CSS zoom of the stage; whole canvases scale together)
  const wi = worldAt(t); let z = { z: 1, ox: W / 2, oy: 280 };
  if (!SINGLE) { const zz = zoomAt(WORLDS[wi], t); z = { z: zz.z, ox: zz.ox - camAt(WORLDS[wi], t), oy: zz.oy }; }
  else { const zz = zoomAt(WORLDS[wi], t); z = { z: zz.z, ox: zz.ox, oy: zz.oy }; }
  // crisp zoom: a quarter step makes every art pixel a whole number of screen px (4 x 1.25 = 5, 6, 7, 8) and the whole-logical-px
  // origin keeps the grid on whole screen px, so edges stay sharp (a smooth scale would resample the pixelated canvases)
  const zq = Math.round(z.z * 4) / 4;
  stageEl.style.transformOrigin = (Math.round(z.ox) * 4) + 'px ' + (Math.round(z.oy) * 4) + 'px';
  stageEl.style.transform = zq > 1 ? 'scale(' + zq.toFixed(2) + ')' : 'none';
  brand(t); hud(t);
}

/* game dialog box: the narrator's portrait speaks with the voice (mouth follows the loudness envelope or the word spans) */
const DLG_HERO = HEROES[SPEC.hero] || HEROES.hoodie;
function drawDialogPortrait(t) {
  const g = $('dp').getContext('2d'); g.imageSmoothingEnabled = false;
  R(g, 0, 0, 32, 32, M.yellow[2]); R(g, 0, 22, 32, 10, M.yellow[1]);
  portrait(g, DLG_HERO, { w: 32, h: 32, t, talk: talkLevel(t) });
}

/* brand pill: hero face avatar, handle, optional fake follow click */
const BR = SPEC.brand;
(function () {
  if (!BR) { pillEl.style.display = 'none'; return; }
  $('handle').textContent = BR.handle;
  if (BR.followAt == null) $('fbc').style.display = 'none';
})();
function brand(t) {
  if (!BR) return;
  const ag = $('av').getContext('2d'); ag.imageSmoothingEnabled = false;
  R(ag, 0, 0, 28, 28, M.yellow[2]); portrait(ag, DLG_HERO, { w: 28, h: 28, t, talk: talkLevel(t) });
  $('avs').style.transform = ((t % 3.1) < 0.1) ? 'scaleY(0.5)' : 'scaleY(1)';
  if (BR.followAt == null) return;
  const fa = BR.followAt, g = $('fbc').getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 16, 16);
  const done = t >= fa;
  R(g, 0, 0, 16, 16, done ? M.green[2] : M.red[2]);
  if (!done) { R(g, 7, 3, 2, 10, '#ffffff'); R(g, 3, 7, 10, 2, '#ffffff'); }
  else { R(g, 3, 8, 2, 2, '#ffffff'); R(g, 5, 10, 2, 2, '#ffffff'); R(g, 7, 8, 2, 2, '#ffffff'); R(g, 9, 6, 2, 2, '#ffffff'); R(g, 11, 4, 2, 2, '#ffffff'); }
  const cur = $('cur'), cp = pr(t, fa - 0.9, 0.7), press = t >= fa && t < fa + 0.15;
  cur.style.display = t >= fa - 0.95 && t < fa + 0.7 ? 'block' : 'none';
  cur.style.transform = 'translate(' + (lerp(160, 0, EA.out(cp))).toFixed(1) + 'px,' + (lerp(120, 0, EA.out(cp)) + (press ? 4 : 0)).toFixed(1) + 'px) scale(' + (press ? 0.85 : 1) + ')';
  pillEl.style.transform = 'scale(' + (t >= fa && t < fa + 0.3 ? 1 + 0.12 * Math.sin(((t - fa) / 0.3) * Math.PI) : 1).toFixed(3) + ')';
}
function hud(t) {
  const g = $('ch').getContext('2d'); g.imageSmoothingEnabled = false;
  g.save(); if (SS > 1) g.scale(SS, SS); g.clearRect(0, 0, W, H); g.restore();
  const hv = SPEC.hud; if (!hv.length) return;
  g.save(); if (SS > 1) g.scale(SS, SS);
  let prog = null, cnt = null;
  const pk = [], ck = [];
  for (const h of hv) { if (h.hud === 'progress') { pk.push([h.t - 0.001, pk.length ? pk[pk.length - 1][1] : 0], [h.t + 0.5, clamp(h.value)]); if (t >= h.t) prog = h; } else if (h.hud === 'counter') { ck.push([h.t - 0.001, ck.length ? ck[ck.length - 1][1] : 0], [h.t + 0.4, h.value]); if (t >= h.t) cnt = h; } }
  if (prog) drawHudProgress(g, prog, kf(t, pk, EA.out), hudPop(t, 'progress'));
  if (cnt) drawHudCounter(g, cnt, String(Math.round(kf(t, ck, EA.out))), hudPop(t, 'counter'));
  g.restore();
}

function renderAt(t) { t = Math.max(0, Math.min(DUR - 0.001, t)); frame(t); }
const fontsReady = Promise.all([document.fonts.load('16px PS2P'), document.fonts.load('700 64px PXS')]).then(() => { renderAt(0); });
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {}; window.__hf.buildReady.fonts = fontsReady;
window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
renderAt(0);
const tl = gsap.timeline({ paused: true }); tl.to({}, { duration: DUR });
window.__timelines = window.__timelines || {}; window.__timelines.main = tl;
