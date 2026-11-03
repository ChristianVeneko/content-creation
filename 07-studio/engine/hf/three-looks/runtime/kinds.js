/* kinds.js: builders of the procedural prop kinds. Each returns { root, top, base, update(ch, t) } where root stands on y = 0,
   top is the height of the highest point (labels, bursts), base the initial channels and update() applies kind-specific channels
   (fill, open, heat, spin, glow) to the parts. ch = { glow, fill, open, heat, spin, act, t }. */
'use strict';
const KB = {};
const lit = (mats, ch, k) => { for (const m of mats) { const d = m.userData.glow; m.emissive.copy(d.color); m.emissiveIntensity = clamp(k, 0, 2.2) * d.k; } };
const heatCol = (heat, a, b) => new T.Color(a).lerp(new T.Color(b), clamp(heat));

function drawScreen(g, w, h, ch, t) {
  const lit1 = clamp(ch.glow);
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, lit1 > 0.05 ? '#3d78c4' : '#20232d'); grd.addColorStop(1, lit1 > 0.05 ? '#1b3a6e' : '#15171f');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  const cols = ['#e9806e', '#6db3a8', '#f2b45a', '#9a7fb5', '#7fbf8a', '#5a86c9', '#e9a0b4'];
  const n = Math.round(clamp(ch.open) * 7 + (ch.open > 0 ? 0.0 : 0));
  for (let i = 0; i < n; i++) {
    const x = 24 + (i % 4) * 92 + (i * 17) % 24, y = 26 + Math.floor(i / 4) * 78 + (i * 11) % 18, ww = 190, hh = 112;
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 6, y + 8, ww, hh);
    g.fillStyle = '#fbf6ec'; g.fillRect(x, y, ww, hh); g.fillStyle = cols[i % cols.length]; g.fillRect(x, y, ww, 24);
    g.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + 12 + k * 16, y + 12, 5, 0, TAU); g.fill(); }
    g.fillStyle = '#cfc6b6'; for (let k = 0; k < 4; k++) g.fillRect(x + 14, y + 40 + k * 17, ww - 28 - ((k * 37 + i * 13) % 60), 8);
  }
  const bw = w - 56, by = h - 40;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(28, by, bw, 22);
  const f = clamp(ch.fill); g.fillStyle = f < 0.6 ? '#7fd08a' : f < 0.85 ? '#f2b45a' : '#e5574f'; g.fillRect(28, by, bw * f, 22);
  g.fillStyle = '#fff'; g.font = '700 19px Baloo2, sans-serif'; g.textBaseline = 'middle'; g.fillText('RAM', 34, by + 12);
  if (ch.heat > 0.01) { g.fillStyle = 'rgba(229,87,79,' + (ch.heat * 0.4) + ')'; g.fillRect(0, 0, w, h); }
  if (f > 0.92 && ch.open > 0.7) { g.strokeStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.arc(w / 2, h / 2 - 10, 30, t * 6, t * 6 + 4.2); g.stroke(); }
}
KB.monitor = async () => {
  const root = new T.Group(), cv = document.createElement('canvas'); cv.width = 512; cv.height = 300;
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
  const scr = new T.Mesh(new T.PlaneGeometry(1.7, 1.0), new T.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1, roughness: 0.4 }));
  root.add(at(CY(0.5, 0.56, 0.1, clayMat(PAL.dark)), 0, 0.05, 0), at(CY(0.1, 0.13, 0.5, clayMat(PAL.dark)), 0, 0.33, 0), at(RB(1.95, 1.22, 0.16, 0.1, clayMat(PAL.dark)), 0, 1.0, 0), at(scr, 0, 1.0, 0.085));
  const gl = cv.getContext('2d');
  return { root, top: 1.65, base: { glow: 0.75, fill: 0.1, open: 0 }, update(ch, t) { drawScreen(gl, 512, 300, ch, t); tex.needsUpdate = true; scr.material.emissiveIntensity = 0.12 + 0.9 * clamp(ch.glow); } };
};
KB.tower = async () => {
  const root = new T.Group(), body = RB(0.95, 1.8, 1.15, 0.16, clayMat(PAL.cream)); body.position.y = 0.95;
  const blades = new T.Group(); for (let i = 0; i < 5; i++) { const b = RB(0.22, 0.07, 0.03, 0.015, clayMat(PAL.dark)); b.position.x = 0.14; const p = new T.Group(); p.add(b); p.rotation.z = (i / 5) * TAU; blades.add(p); }
  blades.position.set(0, 1.35, 0.6); const ring = TO(0.3, 0.035, clayMat(PAL.dark)); ring.position.set(0, 1.35, 0.6);
  const l1 = glowMat('#5a6a5a', '#5ff08a', 1), l2 = glowMat('#6a5f4a', '#ffb347', 1);
  const d1 = CY(0.05, 0.05, 0.04, l1, 16), d2 = CY(0.05, 0.05, 0.04, l2, 16); d1.rotation.x = d2.rotation.x = Math.PI / 2; d1.position.set(-0.25, 0.55, 0.59); d2.position.set(-0.1, 0.55, 0.59);
  const slot = RB(0.6, 0.06, 0.04, 0.02, clayMat(PAL.darker)); slot.position.set(0.1, 0.9, 0.59);
  const inner = RB(0.8, 1.5, 0.9, 0.05, glowMat('#6b4a2a', '#ff9a4a', 1)); inner.position.set(0, 0.95, 0);
  const side = RB(0.05, 1.62, 1.05, 0.05, clayMat(PAL.teal)); side.position.set(0, 0, -0.52); const hinge = new T.Group(); hinge.add(side); hinge.position.set(0.5, 0.95, 0.57);
  root.add(body, inner, blades, ring, d1, d2, slot, hinge);
  return { root, top: 1.9, base: { glow: 0.5, open: 0 }, update(ch, t) {
    blades.rotation.z = -(ch.spin + t * (2 + 7 * ch.heat));
    hinge.rotation.y = -clamp(ch.open) * 1.8; inner.visible = ch.open > 0.02;
    lit([l1], ch, 0.6 + 0.4 * ch.glow); lit([l2], ch, hs(Math.floor(t * 9)) > 0.4 - ch.fill * 0.3 ? 1 : 0.15); inner.material.emissiveIntensity = 0.5 + 0.8 * ch.glow + ch.heat; inner.material.emissive.copy(heatCol(ch.heat, '#ff9a4a', '#ff3b2a'));
  } };
};
KB['ram-stick'] = async () => {
  const root = new T.Group(), mats = [];
  const board = RB(1.6, 0.6, 0.09, 0.03, clayMat('#3f9a6a')); board.position.y = 0.5;
  root.add(at(RB(1.2, 0.12, 0.4, 0.05, clayMat(PAL.dark)), 0, 0.06, 0), board, at(RB(1.5, 0.1, 0.05, 0.01, clayMat('#d9b34a')), 0, 0.26, 0.02));
  for (let i = 0; i < 4; i++) root.add(at(RB(0.28, 0.24, 0.05, 0.03, clayMat(PAL.darker)), -0.55 + i * 0.37, 0.52, 0.06));
  for (let i = 0; i < 8; i++) { const m = glowMat('#575f55', '#7fe38a', 1); mats.push(m); root.add(at(RB(0.12, 0.08, 0.05, 0.02, m), -0.63 + i * 0.18, 0.74, 0.06)); }
  return { root, top: 0.9, base: { glow: 0.6, fill: 0.2 }, update(ch) {
    const nl = ch.fill * 8; mats.forEach((m, i) => { const on = clamp(nl - i); m.userData.glow.color.set(i < 5 ? '#7fe38a' : i < 7 ? '#f2b45a' : '#e5574f'); m.emissive.copy(m.userData.glow.color); m.emissiveIntensity = on * (0.6 + 0.8 * ch.glow); });
  } };
};
KB.thermometer = async (def) => {
  const root = new T.Group(), s = def.size || 1;
  const bulbM = glowMat('#c94a3f', '#ff5a3a', 1), merM = glowMat('#d9473a', '#ff6a4a', 1);
  const tube = new T.Mesh(new T.CapsuleGeometry(0.13, 1.9, 6, 16), clayMat('#f4f1ea', { transparent: true, opacity: 0.6, rough: 0.3, nobump: true })); tube.position.y = 1.4;
  const mer = new T.Mesh(new T.CapsuleGeometry(0.065, 1.6, 6, 12), merM); const merG = new T.Group(); merG.add(at(mer, 0, 0.9, 0)); merG.position.set(0, 0.52, 0);
  root.add(at(RB(0.9, 0.14, 0.7, 0.07, clayMat(PAL.wood)), 0, 0.07, 0), at(SP(0.3, bulbM), 0, 0.45, 0), tube, merG);
  for (let i = 0; i < 7; i++) root.add(at(RB(i % 2 ? 0.14 : 0.22, 0.04, 0.04, 0.015, clayMat(PAL.dark)), 0.26, 0.85 + i * 0.28, 0));
  root.scale.setScalar(s);
  return { root, top: 2.5 * s, base: { glow: 0.5, fill: 0.15 }, update(ch) { merG.scale.y = Math.max(0.04, clamp(ch.fill)); lit([bulbM, merM], ch, 0.4 + 0.8 * clamp(ch.fill) + ch.heat); } };
};
KB.rack = async () => {
  const root = new T.Group(), leds = [];
  root.add(at(RB(1.6, 2.7, 1.1, 0.1, clayMat('#3f5163')), 0, 1.35, 0));
  for (let r = 0; r < 7; r++) {
    root.add(at(RB(1.4, 0.28, 0.06, 0.03, clayMat('#5c738b')), 0, 0.35 + r * 0.34, 0.56));
    const row = []; for (let k = 0; k < 3; k++) { const m = glowMat('#4e5a4e', '#7fe38a', 1); row.push(m); const d = CY(0.045, 0.045, 0.04, m, 12); d.rotation.x = Math.PI / 2; d.position.set(-0.5 + k * 0.17, 0.35 + r * 0.34, 0.6); root.add(d); }
    root.add(at(RB(0.5, 0.06, 0.04, 0.02, clayMat(PAL.darker)), 0.35, 0.35 + r * 0.34, 0.6)); leds.push(row);
  }
  const door = RB(1.56, 2.62, 0.05, 0.06, clayMat('#9fd3e0', { transparent: true, opacity: 0.28, rough: 0.2, nobump: true })); door.position.set(0.78, 0, 0); const hinge = new T.Group(); hinge.add(door); hinge.position.set(-0.78, 1.35, 0.62);
  root.add(hinge); root.add(at(RB(0.06, 2.62, 0.08, 0.02, clayMat(PAL.metal)), 0.0, 1.35, 0.66));
  return { root, top: 2.8, base: { glow: 0.6, fill: 0.3, open: 0 }, update(ch, t) {
    hinge.rotation.y = -clamp(ch.open) * 1.9;
    leds.forEach((row, r) => row.forEach((m, k) => {
      const full = r < Math.round(clamp(ch.fill) * 7), blink = hs(Math.floor(t * (3 + ch.heat * 6)) * 13 + r * 7 + k * 3 + def_seed(root)) > 0.45;
      const col = ch.heat > 0.3 ? (k === 1 ? '#ff6a3a' : '#ffb347') : (full ? '#ffcf5a' : '#7fe38a');
      m.userData.glow.color.set(col); m.emissive.copy(m.userData.glow.color); m.emissiveIntensity = (full || blink ? 1.1 : 0.15) * (0.3 + 0.9 * ch.glow);
    }));
  } };
};
const def_seed = (o) => Math.floor(Math.abs(o.position.x * 10 + o.position.z * 3)) % 50;
KB['hard-disk'] = async () => {
  const root = new T.Group(), plat = new T.Group(), arm = new T.Group(), ledM = glowMat('#575f55', '#7fe38a', 1);
  root.add(at(RB(1.95, 0.16, 1.95, 0.1, clayMat(PAL.dark)), 0, 0.08, 0));
  const disc = CY(0.78, 0.78, 0.06, clayMat('#cdd6dd', { rough: 0.3, metal: 0.5, nobump: true })); disc.position.y = 0.2; plat.add(disc);
  for (const r of [0.55, 0.3]) plat.add(at(TO(r, 0.012, clayMat(PAL.greyD, { nobump: true })), 0, 0.235, 0)).children.at(-1).rotation.x = Math.PI / 2;
  plat.add(at(CY(0.1, 0.1, 0.1, clayMat(PAL.dark)), 0, 0.26, 0)); const mark = RB(0.25, 0.02, 0.08, 0.01, clayMat(PAL.coral)); mark.position.set(0.5, 0.24, 0); plat.add(mark);
  const bar = RB(1.1, 0.06, 0.12, 0.03, clayMat(PAL.metal)); bar.position.set(-0.5, 0, 0); arm.add(bar, at(SP(0.1, clayMat(PAL.darker)), 0, 0, 0)); arm.position.set(0.8, 0.34, -0.7);
  root.add(plat, arm, at(RB(1.2, 0.07, 0.07, 0.03, ledM), 0, 0.12, 1.0));
  return { root, top: 0.5, base: { glow: 0.5, fill: 0 }, update(ch, t) {
    plat.rotation.y = -(ch.spin + t * 0.9); arm.rotation.y = 0.55 + 0.3 * Math.sin(t * (1.4 + 9 * clamp(ch.act))) + 0.1 * Math.sin(t * 23 * clamp(ch.act));
    ledM.userData.glow.color.set(ch.heat > 0.3 ? '#ff6a3a' : '#7fe38a'); lit([ledM], ch, (0.5 + 0.5 * ch.glow) * (hs(Math.floor(t * 12)) > 0.5 - 0.4 * ch.act ? 1 : 0.3));
  } };
};
KB.fan = async () => {
  const root = new T.Group(), rot = new T.Group();
  root.add(at(CY(0.5, 0.58, 0.12, clayMat(PAL.greyD)), 0, 0.06, 0), at(CY(0.07, 0.09, 1.3, clayMat(PAL.grey)), 0, 0.7, 0));
  const ring = TO(0.78, 0.07, clayMat(PAL.metal)); ring.position.set(0, 1.55, 0); root.add(ring, at(CY(0.12, 0.12, 0.12, clayMat(PAL.dark)), 0, 1.55, 0.05)).children.at(-1).rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) { const b = RB(0.62, 0.24, 0.03, 0.04, clayMat(i % 2 ? PAL.sky : PAL.teal)); b.position.x = 0.38; b.rotation.x = 0.35; const p = new T.Group(); p.add(b); p.rotation.z = (i / 5) * TAU; rot.add(p); }
  rot.position.set(0, 1.55, 0.04); root.add(rot);
  return { root, top: 2.4, base: { glow: 0.2 }, update(ch, t) { rot.rotation.z = -(ch.spin + t * 3.2); } };
};
KB.beacon = async () => {
  const root = new T.Group(), dm = glowMat('#c9572f', '#ff7a2a', 1); dm.transparent = true; dm.opacity = 0.85;
  const dome = SP(0.4, dm); dome.scale.y = 1.1; dome.position.y = 0.72; const refl = RB(0.5, 0.18, 0.08, 0.03, clayMat(PAL.sun)); refl.position.y = 0.72; const rg = new T.Group(); rg.add(refl); rg.position.y = 0;
  root.add(at(CY(0.45, 0.55, 0.3, clayMat(PAL.dark)), 0, 0.15, 0), at(CY(0.5, 0.5, 0.08, clayMat(PAL.sun)), 0, 0.34, 0), dome, rg);
  return { root, top: 1.2, base: { glow: 0.5 }, update(ch, t) { rg.rotation.y = ch.spin + t * (2 + 4 * ch.act); lit([dm], ch, (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 7))) * (0.3 + 0.9 * ch.glow)); } };
};
KB['traffic-light'] = async (def) => {
  const root = new T.Group(), lamps = ['#e5574f', '#f2b45a', '#7fd08a'].map((c) => glowMat('#5a5a5a', c, 1));
  root.add(at(CY(0.07, 0.1, 2.4, clayMat(PAL.dark)), 0, 1.2, 0), at(RB(0.62, 1.5, 0.45, 0.14, clayMat(PAL.dark)), 0, 2.7, 0));
  lamps.forEach((m, i) => { const d = CY(0.17, 0.17, 0.08, m, 20); d.rotation.x = Math.PI / 2; d.position.set(0, 3.15 - i * 0.45, 0.24); root.add(d); });
  root.scale.setScalar(def.size || 1);
  return { root, top: 3.6 * (def.size || 1), base: { glow: 0.2 }, update(ch, t) { const red = ch.glow > 0.5; lit([lamps[0]], ch, red ? 1.2 : 0.08); lit([lamps[1]], ch, red && hs(Math.floor(t * 4)) > 0.5 ? 0.3 : 0.06); lit([lamps[2]], ch, red ? 0.08 : 1.2); } };
};
KB.stove = async () => {
  const root = new T.Group(), b1 = glowMat('#3a3a42', '#ff7a2a', 1), b2 = glowMat('#3a3a42', '#ff7a2a', 1);
  root.add(at(RB(1.6, 1.0, 1.1, 0.08, clayMat('#f4efe6')), 0, 0.5, 0), at(RB(1.62, 0.06, 1.12, 0.03, clayMat(PAL.dark)), 0, 1.01, 0));
  const t1 = TO(0.26, 0.05, b1); t1.rotation.x = Math.PI / 2; t1.position.set(-0.4, 1.06, 0.1); const t2 = TO(0.26, 0.05, b2); t2.rotation.x = Math.PI / 2; t2.position.set(0.4, 1.06, 0.1);
  const door = RB(1.3, 0.62, 0.06, 0.04, clayMat('#d8d2c6')); door.position.set(0, -0.31, 0); door.add(at(RB(0.9, 0.3, 0.02, 0.02, clayMat(PAL.darker)), 0, 0, 0.04)); const hg = new T.Group(); hg.add(door); hg.position.set(0, 0.82, 0.57);
  root.add(t1, t2, hg); for (let i = 0; i < 4; i++) { const k = CY(0.05, 0.05, 0.05, clayMat(PAL.coral), 12); k.rotation.x = Math.PI / 2; k.position.set(-0.55 + i * 0.37, 0.9, 0.58); root.add(k); }
  return { root, top: 1.1, base: { glow: 0.2, open: 0 }, update(ch) { hg.rotation.x = clamp(ch.open) * 1.25; const k = Math.max(ch.heat, ch.glow * 0.5); lit([b1, b2], ch, k * 1.4); b1.emissive.copy(heatCol(ch.heat, '#ff7a2a', '#ff3b2a')); b2.emissive.copy(b1.emissive); } };
};
KB.fridge = async () => {
  const root = new T.Group(), inner = glowMat('#e8f1ee', '#fff3d0', 0.6), items = [];
  root.add(at(RB(1.25, 2.5, 1.05, 0.1, clayMat('#9fd3c0')), 0, 1.25, 0), at(RB(1.05, 2.3, 0.9, 0.05, inner), 0, 1.25, 0.08));
  for (let s = 0; s < 3; s++) { root.add(at(RB(1.05, 0.05, 0.8, 0.02, clayMat(PAL.white)), 0, 0.6 + s * 0.65, 0.1)); for (let k = 0; k < 3; k++) { const i = RB(0.26, 0.26, 0.26, 0.06, clayMat([PAL.coral, PAL.sun, PAL.green, PAL.sky][(s + k) % 4])); i.position.set(-0.3 + k * 0.3, 0.76 + s * 0.65, 0.12); root.add(i); items.push(i); } }
  const door = RB(1.2, 2.45, 0.09, 0.06, clayMat('#b9e3d2')); door.position.set(0.6, 0, 0); door.add(at(RB(0.08, 0.8, 0.08, 0.03, clayMat(PAL.metal)), 0.45, 0.2, 0.08)); const hg = new T.Group(); hg.add(door); hg.position.set(-0.6, 1.25, 0.56); root.add(hg);
  return { root, top: 2.6, base: { glow: 0, fill: 0.3, open: 0 }, update(ch) { hg.rotation.y = -clamp(ch.open) * 1.9; items.forEach((m, i) => { const v = clamp(ch.fill * 9 - i); m.visible = v > 0.01; m.scale.setScalar(Math.max(0.01, EZ.back(v))); }); inner.emissiveIntensity = 0.3 + 0.7 * clamp(ch.open); } };
};
KB.crate = async (def) => {
  const root = new T.Group(), w = clayMat(PAL.wood), d = clayMat(PAL.woodD);
  root.add(at(RB(0.95, 0.95, 0.95, 0.07, w), 0, 0.475, 0));
  for (const y of [0.18, 0.77]) root.add(at(RB(0.99, 0.14, 0.99, 0.04, d), 0, y, 0));
  for (const x of [-0.46, 0.46]) for (const z of [-0.46, 0.46]) root.add(at(RB(0.1, 0.99, 0.1, 0.03, d), x, 0.475, z));
  const tag = RB(0.34, 0.2, 0.02, 0.03, clayMat(PAL.cream)); tag.position.set(0, 0.5, 0.49); root.add(tag);
  return { root, top: 1.0, base: { glow: 0 }, update() {} };
};
KB.shelf = async () => {
  const root = new T.Group(), slots = [], cols = [PAL.coral, PAL.sun, PAL.teal, PAL.sky, PAL.plum, PAL.green];
  for (const x of [-1.3, 1.3]) root.add(at(RB(0.12, 2.5, 0.95, 0.04, clayMat(PAL.woodD)), x, 1.25, 0));
  for (const y of [0.2, 0.95, 1.7, 2.5]) root.add(at(RB(2.7, 0.1, 1.0, 0.04, clayMat(PAL.wood)), 0, y, 0));
  for (let l = 0; l < 3; l++) for (let k = 0; k < 4; k++) { const b = RB(0.48, 0.5, 0.55, 0.06, clayMat(cols[(l * 4 + k * 5) % 6])); b.position.set(-0.95 + k * 0.63, 0.5 + l * 0.75, 0); root.add(b); slots.push(b); }
  return { root, top: 2.6, base: { glow: 0, fill: 0.25 }, update(ch) { slots.forEach((m, i) => { const v = clamp(ch.fill * 12 - i); m.visible = v > 0.01; m.scale.setScalar(Math.max(0.01, EZ.back(v))); }); } };
};
KB.door = async () => {
  const root = new T.Group(), panel = RB(2.1, 2.3, 0.12, 0.04, new T.MeshStandardMaterial({ map: canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#c9a66a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(0, i * 11, w, 3); } }, [1, 2]), roughness: 0.9 }));
  panel.position.y = -1.15; const pg = new T.Group(); pg.add(panel); pg.position.set(0, 2.4, 0);
  root.add(at(RB(0.18, 2.6, 0.3, 0.05, clayMat(PAL.greyD)), -1.2, 1.3, 0), at(RB(0.18, 2.6, 0.3, 0.05, clayMat(PAL.greyD)), 1.2, 1.3, 0), at(RB(2.6, 0.22, 0.34, 0.05, clayMat(PAL.sun)), 0, 2.6, 0), pg);
  return { root, top: 2.8, base: { glow: 0, open: 0 }, update(ch) { pg.scale.y = Math.max(0.12, 1 - 0.88 * clamp(ch.open)); } };
};
KB.clock = async (def) => {
  const root = new T.Group(), faceM = clayMat('#fff6e4'), h1 = RB(0.05, 0.3, 0.03, 0.01, clayMat(PAL.dark)), h2 = RB(0.04, 0.2, 0.03, 0.01, clayMat(PAL.red)), ringM = clayMat(PAL.teal);
  const body = CY(0.5, 0.5, 0.26, ringM, 36); body.rotation.x = Math.PI / 2; body.position.set(0, 0.62, 0);
  const face = CY(0.4, 0.4, 0.04, faceM, 36); face.rotation.x = Math.PI / 2; face.position.set(0, 0.62, 0.14);
  const g1 = new T.Group(), g2 = new T.Group(); h1.position.y = 0.15; h2.position.y = 0.1; g1.add(h1); g2.add(h2); g1.position.set(0, 0.62, 0.18); g2.position.set(0, 0.62, 0.19);
  const bellL = SP(0.12, clayMat(PAL.sun)), bellR = SP(0.12, clayMat(PAL.sun)); bellL.position.set(-0.28, 1.12, 0); bellR.position.set(0.28, 1.12, 0);
  root.add(body, face, g1, g2, bellL, bellR, at(CY(0.04, 0.04, 0.2, clayMat(PAL.dark)), -0.32, 0.12, 0), at(CY(0.04, 0.04, 0.2, clayMat(PAL.dark)), 0.32, 0.12, 0));
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, m = RB(0.03, i % 3 ? 0.04 : 0.08, 0.02, 0.01, clayMat(PAL.dark)); m.position.set(Math.sin(a) * 0.33, 0.62 + Math.cos(a) * 0.33, 0.17); m.rotation.z = -a; root.add(m); }
  root.scale.setScalar(def.size || 1);
  return { root, top: 1.25, base: { glow: 0 }, update(ch, t) { g1.rotation.z = -t * 0.35 * (1 + ch.act * 8); g2.rotation.z = -t * 0.03; } };
};
KB.model = async (def) => {
  const i = await instance(def.model, def.size); clayify(i.root, def.glow);
  const mats = []; i.root.traverse((m) => { if (m.isMesh) mats.push(m.material); });
  return { root: i.root, top: i.height, base: { glow: def.lit || 0 }, update(ch) { lit(mats, ch, ch.glow + ch.heat * 0.9); if (ch.heat > 0.01) mats.forEach((m) => m.emissive.copy(heatCol(ch.heat, def.glow || '#ffd9a0', '#ff4a2a'))); } };
};
KB.car = async (def) => {
  const i = await instance(def.model, def.size); clayify(i.root, '#ffe9a0');
  const mats = []; i.root.traverse((m) => { if (m.isMesh) mats.push(m.material); });
  return { root: i.root, top: i.height, base: { glow: 0 }, drives: true, update(ch) { lit(mats, ch, ch.glow * 0.8 + ch.heat); } };
};
