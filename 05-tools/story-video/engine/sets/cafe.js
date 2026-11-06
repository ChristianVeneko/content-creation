// sets/cafe.js: a reusable low-poly café set for story-video films (import from a film as '../engine/sets/cafe.js').
//
// What it builds: a café room at dusk. A big window (real hole in the back wall) onto a wet street with towers, street
// lamps and animated rain; a counter with an espresso machine and a back shelf; three small tables with chairs; pendant
// lamps (warm practicals, one of them shadow-casting); plants, a wall clock and a door. Cold light comes in from the
// window (hemisphere fill + a shadow-casting directional), warm light from the lamps. No people and no story text: the
// film adds its stickmen at the anchors, and an optional laptop on the main table shows the film's own canvas.
//
// buildCafe(stage, opts) -> { group, anchors, props, lights, update(t) }
//   opts: w, d, h (room size, default 8 x 7 x 3.1) · wall, floor, ceiling, wood (colours) · seed (layout noise)
//         rain (true) · sky ('dusk' | 'night') · shadowLamps (1: how many pendants cast shadows; point shadows are slow)
//         windowLight (1.0) · fill (0.55) · lampIntensity (4) · screenCanvas (a canvas: puts a laptop on the main table)
//         addToScene (true) · name ('cafe': the key in stage.sets)
//   update(t): animates the rain and the steam as a pure function of t (call it from seek before stage.draw).
//   anchors ([x, y, z] in world units, y = 0 is the floor; a Stickman's mesh goes at a seat anchor as is):
//     table, tableTop, seat (main chair, facing -z toward the window), seatOpposite (window side, facing +z),
//     laptop, cup, phone, window (glass centre), outside (a camera spot in the street looking in), street,
//     counter (counter top centre), barista (behind the counter, floor), espresso, door, doorOutside,
//     table2, customer1 (faces +x), customer2 (faces -x), table3, seat3, clock, lampMain, ceiling
//   props: tables, chairs, counter, espresso, cups, window, lamps, plants, clock, door, laptop, phone, street
//   lights: { fill, window, lamps: [PointLight...] }
//
// Prop builders (each returns a THREE.Group, built from stage.js pieces, deterministic):
//   mesaCafe({r, h, top, leg}) · silla({color, seatH}) (faces +z) · barra({len, h, d, color, top}) (front +z)
//   maquinaEspresso({color}) · taza({steam, color}) (update(t), setSteam(k)) · ventanal({w, h, rain, seed}) (update(t))
//   lamparaColgante({color, intensity, distance, cord, shadow}) (origin at the ceiling) · plantaMaceta({h, seed})
//   laptop({screenCanvas, color}) (screen faces +z; setOpen(angle), tex) · relojPared({r}) (setTime(h, m)) · telefono()
//   calleLluviosa({seed, sky}) (the street outside, origin at the window wall, outside is -z)
import { THREE, box, mat, practical, rng, room, door, tower, clamp } from '../stage.js';

const TAU = Math.PI * 2;
function cyl(rt, rb, h, seg, color, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, o));
  m.position.set(x, y + h / 2, z); m.castShadow = o.cast ?? true; m.receiveShadow = true; return m;
}
function glow(color) { return new THREE.MeshBasicMaterial({ color, toneMapped: false }); }

// ---------- furniture ----------
export function mesaCafe({ r = 0.38, h = 0.74, top = '#6b4a33', leg = '#1f1c1a' } = {}) {
  const g = new THREE.Group();
  g.add(cyl(r, r, 0.04, 10, top, 0, h - 0.04, 0));
  g.add(cyl(0.035, 0.035, h - 0.06, 6, leg, 0, 0.02, 0));
  g.add(cyl(0.2, 0.24, 0.03, 8, leg, 0, 0, 0));
  g.userData.topY = h; return g;
}
export function silla({ color = '#3a2e26', seatH = 0.46 } = {}) {   // the sitter faces +z; the backrest is at -z
  const g = new THREE.Group();
  g.add(box(0.42, 0.04, 0.4, color, 0, seatH - 0.04, 0));
  for (const [x, z] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) g.add(box(0.03, seatH - 0.04, 0.03, '#1b1714', x, 0, z));
  g.add(box(0.03, 0.42, 0.03, '#1b1714', -0.18, seatH, -0.18), box(0.03, 0.42, 0.03, '#1b1714', 0.18, seatH, -0.18));
  g.add(box(0.42, 0.14, 0.03, color, 0, seatH + 0.26, -0.18));
  g.userData.seatH = seatH; return g;
}
export function barra({ len = 2.8, h = 1.05, d = 0.6, color = '#3b2a20', top = '#c9b79c' } = {}) {   // front faces +z
  const g = new THREE.Group();
  g.add(box(len, h - 0.05, d - 0.08, color, 0, 0, 0));
  g.add(box(len + 0.1, 0.05, d, top, 0, h - 0.05, 0, { rough: 0.45 }));
  for (let i = 0; i < Math.floor(len / 0.35); i++) g.add(box(0.02, h - 0.2, 0.01, '#2a1d16', -len / 2 + 0.2 + i * 0.35, 0.08, (d - 0.08) / 2 + 0.005, { cast: false }));
  g.add(box(len, 0.03, 0.03, '#a88a4a', 0, 0.22, d / 2 + 0.06, { metal: 0.7, rough: 0.35 }));
  g.userData.topY = h; return g;
}
export function maquinaEspresso({ color = '#b8bcc4' } = {}) {   // front faces +z
  const g = new THREE.Group(); const steel = { metal: 0.75, rough: 0.3 };
  g.add(box(0.62, 0.42, 0.42, color, 0, 0, 0, steel));
  g.add(box(0.64, 0.04, 0.44, '#7d828b', 0, 0.42, 0, steel));
  g.add(box(0.5, 0.06, 0.3, '#2a2c31', 0, 0.0, 0.2));
  for (const x of [-0.16, 0.16]) {
    g.add(cyl(0.05, 0.05, 0.06, 8, '#55595f', x, 0.23, 0.23, steel));
    g.add(box(0.03, 0.03, 0.18, '#15171c', x, 0.22, 0.34));
  }
  g.add(box(0.02, 0.2, 0.02, '#7d828b', 0.27, 0.16, 0.24, steel));
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), glow('#ff7a3d')); led.position.set(0, 0.35, 0.215); g.add(led);
  for (let i = 0; i < 4; i++) g.add(cyl(0.035, 0.03, 0.06, 7, '#efe9df', -0.2 + i * 0.13, 0.46, 0));
  g.userData.led = led; return g;
}
let steamTex = null;
function wisp() {
  if (steamTex) return steamTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  steamTex = new THREE.CanvasTexture(cv); steamTex.colorSpace = THREE.SRGBColorSpace; return steamTex;
}
export function taza({ steam = true, color = '#efe9df', coffee = '#3b2416' } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.075, 0.07, 0.012, 10, color, 0, 0, 0));
  g.add(cyl(0.045, 0.034, 0.075, 9, color, 0, 0.012, 0));
  const cf = new THREE.Mesh(new THREE.CircleGeometry(0.04, 9), mat(coffee)); cf.rotation.x = -Math.PI / 2; cf.position.y = 0.08; g.add(cf);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 4, 8, Math.PI), mat(color)); hd.rotation.z = -Math.PI / 2; hd.position.set(0.045, 0.05, 0); g.add(hd);
  const puffs = [];
  for (let k = 0; k < 4; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: wisp(), transparent: true, opacity: 0, depthWrite: false })); g.add(s); puffs.push(s); }
  let level = steam ? 1 : 0;
  g.userData.setSteam = k => { level = k; };
  g.userData.update = t => puffs.forEach((s, k) => {
    const u = ((t * 0.32 + k / puffs.length) % 1 + 1) % 1;
    s.position.set(Math.sin(t * 1.6 + k * 1.9) * 0.018 * (0.3 + u), 0.09 + u * 0.24, Math.cos(t * 1.1 + k) * 0.01);
    s.scale.setScalar(0.045 + u * 0.09); s.material.opacity = 0.42 * Math.sin(u * Math.PI) * level; s.visible = level > 0.01;
  });
  g.userData.update(0); return g;
}
export function plantaMaceta({ h = 0.9, seed = 4, pot = '#8a5a3c', leaf = '#3f6b3a' } = {}) {
  const g = new THREE.Group(), R = rng(seed);
  g.add(cyl(0.17, 0.13, 0.32, 8, pot, 0, 0, 0));
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11 + R() * 0.08, 0), mat(i % 2 ? leaf : '#4e7d45'));
    const a = R() * TAU, r = 0.04 + R() * 0.1; m.position.set(Math.cos(a) * r, 0.32 + (h - 0.32) * (0.35 + R() * 0.65), Math.sin(a) * r);
    m.scale.set(1, 1.5, 0.7); m.rotation.set(R(), R() * 3, R()); m.castShadow = true; g.add(m);
  }
  return g;
}
export function lamparaColgante({ color = '#ffb46b', intensity = 4, distance = 7, cord = 1.0, shade = '#24262b', shadow = true } = {}) {
  const g = new THREE.Group();                                    // origin at the ceiling; the bulb hangs `cord` below it
  g.add(box(0.012, cord, 0.012, '#111111', 0, -cord, 0, { cast: false }));
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 0.18, 10, 1, true), new THREE.MeshStandardMaterial({ color: shade, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.3, flatShading: true }));
  sh.position.y = -cord - 0.07; g.add(sh);
  const p = practical(color, intensity, distance); p.position.y = -cord - 0.14; g.add(p);
  p.userData.light.castShadow = shadow;
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.19, 10), glow('#ffd9a8')); inner.rotation.x = Math.PI / 2; inner.position.y = -cord - 0.155; g.add(inner);
  g.userData.light = p.userData.light; g.userData.bulb = p.userData.bulb; return g;
}
export function laptop({ screenCanvas = null, color = '#2b2f37', w = 0.34, d = 0.24, open = 1.85 } = {}) {   // screen faces +z
  const g = new THREE.Group(), al = { metal: 0.35, rough: 0.5 };
  g.add(box(w, 0.016, d, color, 0, 0, 0, al));
  g.add(box(w - 0.04, 0.002, d * 0.45, '#16181d', 0, 0.016, -0.02, { cast: false }));
  g.add(box(w * 0.32, 0.002, d * 0.22, '#3a3f49', 0, 0.016, d * 0.3, { cast: false }));
  const lid = new THREE.Group(); lid.position.set(0, 0.016, -d / 2); g.add(lid);
  const sh = 0.22 / 0.34 * w;
  const back = box(w, sh, 0.01, color, 0, 0, 0, al); back.position.z = -0.005; lid.add(back);
  let tex = null;
  if (screenCanvas) { tex = new THREE.CanvasTexture(screenCanvas); tex.colorSpace = THREE.SRGBColorSpace; }
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.025, sh - 0.025), tex ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : glow('#0c0f14'));
  scr.position.set(0, sh / 2, 0.001); lid.add(scr);
  g.userData.setOpen = a => { lid.rotation.x = Math.PI / 2 - a; };   // a = 0 closed, PI/2 upright, ~1.85 open (tilted back)
  g.userData.setOpen(open);
  g.userData.lid = lid; g.userData.screen = scr; g.userData.tex = tex; g.userData.screenH = sh; return g;
}
export function telefono({ color = '#0d0e12', screen = '#111318' } = {}) {   // lying flat, top toward -z
  const g = new THREE.Group(); g.add(box(0.075, 0.01, 0.15, color));
  const sm = new THREE.MeshBasicMaterial({ color: screen, toneMapped: false });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.138), sm); s.rotation.x = -Math.PI / 2; s.position.y = 0.0105; g.add(s);
  g.userData.screenMat = sm; return g;
}
export function relojPared({ r = 0.2, face = '#efe9df', rim = '#1d1f24' } = {}) {   // faces +z
  const g = new THREE.Group();
  const f = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 16), mat(face)); f.rotation.x = Math.PI / 2; g.add(f);
  const rm = new THREE.Mesh(new THREE.TorusGeometry(r, 0.02, 4, 16), mat(rim)); rm.position.z = 0.02; g.add(rm);
  for (let i = 0; i < 12; i++) { const k = box(0.012, 0.035, 0.005, rim, 0, 0, 0, { cast: false }); const a = i / 12 * TAU; k.position.set(Math.sin(a) * r * 0.82, Math.cos(a) * r * 0.82 - 0.017, 0.022); k.rotation.z = -a; g.add(k); }
  const hand = (len, wd, col) => { const p = new THREE.Group(); p.position.z = 0.026; const m = box(wd, len, 0.006, col, 0, 0, 0, { cast: false }); p.add(m); g.add(p); return p; };
  const hh = hand(r * 0.5, 0.022, rim), mh = hand(r * 0.78, 0.014, rim);
  g.userData.setTime = (h, m) => { mh.rotation.z = -m / 60 * TAU; hh.rotation.z = -((h % 12) + m / 60) / 12 * TAU; };
  g.userData.setTime(6, 0); return g;
}

// ---------- the big window with rain (a frame around a real hole: put it over a wall hole of the same size) ----------
export function ventanal({ w = 4.4, h = 2.1, rain = true, seed = 9, frame = '#1c1f26', mullions = 3, streaks = 260, drops = 70 } = {}) {
  const g = new THREE.Group(), R = rng(seed);                    // origin: bottom centre of the hole; outside is -z
  g.add(box(w + 0.16, 0.08, 0.2, frame, 0, -0.08, 0), box(w + 0.16, 0.08, 0.2, frame, 0, h, 0));
  g.add(box(0.08, h, 0.2, frame, -w / 2 - 0.04, 0, 0), box(0.08, h, 0.2, frame, w / 2 + 0.04, 0, 0));
  for (let i = 1; i < mullions; i++) g.add(box(0.05, h, 0.12, frame, -w / 2 + i * w / mullions, 0, 0));
  g.add(box(w, 0.04, 0.08, frame, 0, h * 0.78, 0));
  g.add(box(w + 0.2, 0.05, 0.34, '#5b4636', 0, -0.05, 0.16));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: '#8fb0d8', transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.3, depthWrite: false }));
  glass.position.set(0, h / 2, -0.03); g.add(glass);
  const upd = [];
  if (rain) {
    const dummy = new THREE.Object3D();
    // falling streaks outside, in a slab behind the glass
    const sm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.009, 0.32), new THREE.MeshBasicMaterial({ color: '#a9bfe6', transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), streaks);
    sm.frustumCulled = false; g.add(sm);
    const S = Array.from({ length: streaks }, () => ({ x: (R() - 0.5) * (w + 6), z: -0.35 - R() * 8.5, v: 6 + R() * 3, p: R() * 10 }));
    // drops trickling down the glass, stop-and-go
    const dm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.012, 0.05), new THREE.MeshBasicMaterial({ color: '#cfe0ff', transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }), drops);
    dm.frustumCulled = false; g.add(dm);
    const D = Array.from({ length: drops }, () => ({ x: (R() - 0.5) * (w - 0.1), v: 0.12 + R() * 0.25, p: R() * 20, len: 0.6 + R() * 1.6 }));
    const span = h + 3.5;
    upd.push(t => {
      S.forEach((s, i) => { const y = h + 2.5 - (((s.p + s.v * t) % span) + span) % span;
        dummy.position.set(s.x + (y - h) * 0.06, y, s.z); dummy.rotation.set(0, 0, 0.06); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); sm.setMatrixAt(i, dummy.matrix); });
      sm.instanceMatrix.needsUpdate = true;
      D.forEach((d, i) => { const ph = (d.p + t * d.v), cyc = h + 0.2, u = ((ph % cyc) + cyc) % cyc;
        const y = h - u - 0.04 * Math.sin(ph * 7) * 0.5, wob = Math.sin(ph * 3 + i) * 0.006;
        dummy.position.set(d.x + wob, y, -0.045); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1 + 0.6 * (0.5 + 0.5 * Math.sin(ph * 5)), 1); dummy.updateMatrix(); dm.setMatrixAt(i, dummy.matrix); });
      dm.instanceMatrix.needsUpdate = true;
    });
  }
  g.userData.update = t => upd.forEach(f => f(t));
  g.userData.update(0); g.userData.glass = glass; return g;
}

// ---------- the street outside (origin at the window wall, outside is -z) ----------
export function calleLluviosa({ seed = 21, sky = 'dusk', width = 60 } = {}) {
  const g = new THREE.Group(), R = rng(seed);
  const street = box(width, 0.04, 30, '#16181e', 0, -0.06, -16.5, { metal: 0.45, rough: 0.28 }); street.castShadow = false; g.add(street);
  g.add(box(width, 0.12, 2.2, '#2a2c33', 0, -0.06, -1.2));                       // the sidewalk in front of the café
  g.add(box(width, 0.12, 2.0, '#2a2c33', 0, -0.06, -11.2));                      // the far sidewalk
  const cv = document.createElement('canvas'); cv.width = 8; cv.height = 256; const x = cv.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 256);
  if (sky === 'night') { gr.addColorStop(0, '#070b16'); gr.addColorStop(0.6, '#0e1528'); gr.addColorStop(1, '#1d2238'); }
  else { gr.addColorStop(0, '#141a33'); gr.addColorStop(0.5, '#2a2c4c'); gr.addColorStop(0.8, '#4a3a55'); gr.addColorStop(1, '#6a4a52'); }
  x.fillStyle = gr; x.fillRect(0, 0, 8, 256);
  const st = new THREE.CanvasTexture(cv); st.colorSpace = THREE.SRGBColorSpace;
  const skyM = new THREE.Mesh(new THREE.PlaneGeometry(200, 90), new THREE.MeshBasicMaterial({ map: st, fog: false })); skyM.position.set(0, 30, -48); g.add(skyM);
  const towers = [];
  for (let i = 0; i < 9; i++) {
    const tw = tower({ floors: 5 + Math.floor(R() * 9), cols: 3 + Math.floor(R() * 3), w: 5 + R() * 3, d: 5, floorH: 3, seed: Math.floor(R() * 999), litShare: 0.4, color: i % 2 ? '#2a2f3d' : '#323748', lit: R() < 0.5 ? '#ffd08a' : '#ffc070' });
    tw.position.set(-26 + i * 6.5 + (R() - 0.5) * 2, -0.06, -16 - R() * 10); g.add(tw); towers.push(tw);
  }
  const lampM = glow('#ffcf8a'), refl = new THREE.MeshBasicMaterial({ color: '#ffb46b', transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 6; i++) {
    const lx = -12.5 + i * 5;
    g.add(box(0.1, 3.6, 0.1, '#1a1c22', lx, 0, -10.6));
    g.add(box(0.7, 0.06, 0.1, '#1a1c22', lx + 0.3, 3.6, -10.6));
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.22), lampM); hd.position.set(lx + 0.6, 3.55, -10.6); g.add(hd);
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 5.5), refl); r.rotation.x = -Math.PI / 2; r.position.set(lx + 0.6, -0.015, -7.6); g.add(r);
  }
  const cars = [];
  for (let i = 0; i < 2; i++) {
    const c = new THREE.Group(); c.position.set(-6 + i * 9.5, -0.02, -4.2 - i * 0.2); const col = i ? '#5b2b2b' : '#2b3550';
    c.add(box(3.6, 0.7, 1.6, col, 0, 0.25, 0, { metal: 0.4, rough: 0.35 }), box(2.0, 0.55, 1.45, '#14171d', -0.2, 0.95, 0));
    for (const [wx, wz] of [[-1.2, 0.75], [1.2, 0.75], [-1.2, -0.75], [1.2, -0.75]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 8), mat('#0c0d10')); wh.rotation.x = Math.PI / 2; wh.position.set(wx, 0.32, wz); c.add(wh); }
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.3), glow('#ff3b30')); tl.position.set(1.82, 0.7, 0.5); c.add(tl);
    const tl2 = tl.clone(); tl2.position.z = -0.5; c.add(tl2);
    g.add(c); cars.push(c);
  }
  g.userData.towers = towers; g.userData.cars = cars; return g;
}

// ---------- the whole café ----------
export function buildCafe(stage, opts = {}) {
  const o = Object.assign({ w: 8, d: 7, h: 3.1, wall: '#5a4a40', floor: '#4a3426', ceiling: '#2e2622', wood: '#6b4a33', seed: 3, rain: true, sky: 'dusk',
    shadowLamps: 1, windowLight: 1.0, fill: 0.55, lampIntensity: 4, screenCanvas: null, addToScene: true, name: 'cafe' }, opts);
  const { w, d, h } = o, BZ = -d / 2, R = rng(o.seed);
  const g = new THREE.Group();
  const WIN = { x: -1.0, y: 0.55, w: 4.4, h: 2.1 }, DOOR = { x: w / 2 - 1.1, y: 0, w: 1.0, h: 2.2 };
  g.add(room({ w, d, h, wall: o.wall, floor: o.floor, ceiling: o.ceiling, holes: [WIN, DOOR] }));
  // the front wall (room() leaves it open): solid, with two pictures and a coat rack, so reverse shots from the window see a room
  const front = box(w, h, 0.12, o.wall, 0, 0, d / 2); g.add(front);
  g.add(box(w, 1.0, 0.03, '#3f3028', 0, 0, d / 2 - 0.075, { cast: false }));
  for (const [x, col] of [[-2.3, '#7a5a3a'], [-0.6, '#3a4a5a'], [1.1, '#6a3a3a']]) { g.add(box(0.7, 0.55, 0.04, '#1d1f24', x, 1.35, d / 2 - 0.08)); g.add(box(0.56, 0.42, 0.045, col, x, 1.415, d / 2 - 0.085, { cast: false })); }
  g.add(box(0.05, 1.7, 0.05, '#1d1f24', 2.6, 0, d / 2 - 0.3), box(0.4, 0.05, 0.05, '#1d1f24', 2.6, 1.65, d / 2 - 0.3), box(0.3, 0.6, 0.12, '#5a2f2a', 2.6, 1.0, d / 2 - 0.36));
  // floor planks and a skirting board
  for (let i = 0; i < 14; i++) g.add(box(0.012, 0.004, d, '#3a281d', -w / 2 + (i + 0.5) * w / 14, 0, 0, { cast: false }));
  g.add(box(w, 0.1, 0.03, '#2a1d16', 0, 0, BZ + 0.075, { cast: false }));
  g.add(box(0.03, 0.1, d, '#2a1d16', -w / 2 + 0.075, 0, 0, { cast: false }));
  // a wainscot on the left wall, two framed pictures and the clock
  g.add(box(0.03, 1.0, d, '#3f3028', -w / 2 + 0.075, 0, 0, { cast: false }));
  const pics = [[-1.2, '#8b6b4a'], [0.4, '#4a5a6b']];
  for (const [z, col] of pics) { g.add(box(0.04, 0.62, 0.48, '#1d1f24', -w / 2 + 0.08, 1.45, z)); g.add(box(0.045, 0.5, 0.36, col, -w / 2 + 0.085, 1.51, z, { cast: false })); }
  const clock = relojPared(); clock.position.set(-w / 2 + 0.1, 2.35, -0.4); clock.rotation.y = Math.PI / 2; g.add(clock);
  // the window and the street
  const win = ventanal({ w: WIN.w, h: WIN.h, rain: o.rain, seed: o.seed + 6 }); win.position.set(WIN.x, WIN.y, BZ); g.add(win);
  const street = calleLluviosa({ seed: o.seed + 18, sky: o.sky }); street.position.z = BZ - 0.06; g.add(street);
  // the door (a real door in the back wall, to the right)
  const dr = door({ color: '#2f3a35', frame: '#1c1f26' }); dr.position.set(DOOR.x, 0, BZ); g.add(dr);
  const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9), new THREE.MeshBasicMaterial({ color: '#2a3550', toneMapped: false })); doorGlass.position.set(0.45, 1.25, 0.03); dr.userData.leaf.parent.add(doorGlass);
  // the counter along the right wall (front faces -x, into the room) with the espresso machine and a back shelf
  const CX = w / 2 - 1.75, CZ = -0.1, CL = 3.0;
  const counter = barra({ len: CL }); counter.position.set(CX, 0, CZ); counter.rotation.y = -Math.PI / 2; g.add(counter);
  const espresso = maquinaEspresso(); espresso.position.set(CX + 0.02, 1.05, CZ - 0.85); espresso.rotation.y = -Math.PI / 2; g.add(espresso);
  const cups = {};
  cups.counter = taza({ steam: true }); cups.counter.position.set(CX - 0.12, 1.05, CZ + 0.35); g.add(cups.counter);
  g.add(box(0.3, 0.32, 0.22, '#efe9df', CX + 0.05, 1.05, CZ + 0.9));                 // the till
  g.add(box(0.26, 0.18, 0.02, '#14161b', CX + 0.05, 1.37, CZ + 0.86));
  for (const y of [1.3, 1.75, 2.2]) {
    g.add(box(0.3, 0.04, 2.6, '#4a3426', w / 2 - 0.2, y, CZ));
    for (let i = 0; i < 9; i++) { const tall = R() < 0.5; g.add(cyl(0.035, 0.035, tall ? 0.24 : 0.12, 6, tall ? (R() < 0.5 ? '#2f5a3a' : '#5a2f2a') : '#efe9df', w / 2 - 0.2, y + 0.04, CZ - 1.1 + i * 0.27)); }
  }
  // a dark menu board above the shelf (abstract chalk lines, no text)
  g.add(box(0.04, 0.7, 1.4, '#16181b', w / 2 - 0.08, 2.35, CZ));
  for (let i = 0; i < 5; i++) g.add(box(0.045, 0.025, 0.5 + R() * 0.6, '#d9d2c4', w / 2 - 0.1, 2.5 + 0.0 - i * 0.11, CZ - 0.15 + (R() - 0.5) * 0.2, { cast: false }));
  // tables and chairs
  const tables = {}, chairs = {};
  const T1 = [-1.5, -2.55], T2 = [0.55, -2.55], T3 = [-1.2, 0.7];
  tables.main = mesaCafe({ top: o.wood }); tables.main.position.set(T1[0], 0, T1[1]); g.add(tables.main);
  tables.t2 = mesaCafe({ top: o.wood }); tables.t2.position.set(T2[0], 0, T2[1]); g.add(tables.t2);
  tables.t3 = mesaCafe({ top: o.wood }); tables.t3.position.set(T3[0], 0, T3[1]); g.add(tables.t3);
  const chair = (x, z, ry, key) => { const s = silla(); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s); chairs[key] = s; return s; };
  chair(T1[0], T1[1] + 0.62, Math.PI, 'main');            // facing -z, toward the window
  chair(T1[0], T1[1] - 0.6, 0, 'opposite');               // window side, facing +z
  chair(T2[0] - 0.6, T2[1], Math.PI / 2, 'c1');           // facing +x
  chair(T2[0] + 0.6, T2[1], -Math.PI / 2, 'c2');          // facing -x
  chair(T3[0], T3[1] + 0.6, Math.PI, 't3');
  chair(T3[0] + 0.6, T3[1], -Math.PI / 2, 't3b');
  // cups and the phone
  cups.main = taza({ steam: true }); cups.main.position.set(T1[0] + 0.24, 0.74, T1[1] + 0.14); g.add(cups.main);
  cups.t2a = taza({ steam: true }); cups.t2a.position.set(T2[0] - 0.15, 0.74, T2[1] + 0.05); g.add(cups.t2a);
  cups.t2b = taza({ steam: false }); cups.t2b.position.set(T2[0] + 0.16, 0.74, T2[1] - 0.06); g.add(cups.t2b);
  cups.t3 = taza({ steam: false }); cups.t3.position.set(T3[0] + 0.1, 0.74, T3[1]); g.add(cups.t3);
  const phone = telefono(); phone.position.set(T1[0] - 0.26, 0.74, T1[1] + 0.12); phone.rotation.y = 0.25; g.add(phone);
  let lap = null;
  if (o.screenCanvas) { lap = laptop({ screenCanvas: o.screenCanvas }); lap.position.set(T1[0], 0.74, T1[1] + 0.02); g.add(lap); }
  // plants
  const plants = [plantaMaceta({ seed: o.seed + 1, h: 1.1 }), plantaMaceta({ seed: o.seed + 2, h: 0.85 }), plantaMaceta({ seed: o.seed + 3, h: 0.7 })];
  plants[0].position.set(-w / 2 + 0.35, 0, BZ + 0.4); plants[1].position.set(DOOR.x - 0.85, 0, BZ + 0.35); plants[2].position.set(-w / 2 + 0.35, 0, d / 2 - 0.6);
  plants.forEach(p => g.add(p));
  // pendant lamps (the warm practicals); only the first `shadowLamps` cast shadows
  const LP = [[T1[0], T1[1] + 0.3], [T2[0], T2[1]], [CX + 0.05, CZ - 0.7], [CX + 0.05, CZ + 0.7], [T3[0], T3[1]]];
  const lamps = LP.map(([x, z], i) => { const L = lamparaColgante({ intensity: o.lampIntensity * (i === 0 ? 0.6 : 0.8), distance: 6.5, cord: i === 0 ? 1.05 : i < 2 || i === 4 ? 1.25 : 0.75, shadow: i < o.shadowLamps }); L.position.set(x, h, z); g.add(L); return L; });
  // cold light from the window: a hemisphere fill and a shadow-casting directional from the street
  const hemi = new THREE.HemisphereLight('#5d7bb3', '#1b1a22', o.fill); g.add(hemi);
  const sun = new THREE.DirectionalLight('#7f9ad6', o.windowLight); sun.position.set(WIN.x - 1.5, 4.5, BZ - 6); sun.target.position.set(WIN.x + 0.5, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0015;
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 25 }); sun.shadow.camera.updateProjectionMatrix();
  g.add(sun, sun.target);
  if (o.addToScene) { stage.scene.add(g); stage.sets[o.name] = g; }
  const anchors = {
    table: [T1[0], 0, T1[1]], tableTop: [T1[0], 0.74, T1[1]],
    seat: [T1[0], -0.14, T1[1] + 0.62], seatOpposite: [T1[0], -0.14, T1[1] - 0.6],
    laptop: [T1[0], 0.74, T1[1] + 0.02], cup: [T1[0] + 0.24, 0.74, T1[1] + 0.14], phone: [T1[0] - 0.26, 0.74, T1[1] + 0.12],
    window: [WIN.x, WIN.y + WIN.h / 2, BZ], outside: [WIN.x - 0.4, 1.5, BZ - 3.2], street: [WIN.x, 0, BZ - 6],
    counter: [CX, 1.05, CZ], barista: [CX + 0.65, 0, CZ - 0.2], espresso: [CX, 1.05, CZ - 0.85],
    door: [DOOR.x, 0, BZ], doorOutside: [DOOR.x, 0, BZ - 1.2],
    table2: [T2[0], 0, T2[1]], customer1: [T2[0] - 0.6, -0.14, T2[1]], customer2: [T2[0] + 0.6, -0.14, T2[1]],
    table3: [T3[0], 0, T3[1]], seat3: [T3[0], -0.14, T3[1] + 0.6],
    clock: [-w / 2 + 0.1, 2.35, -0.4], lampMain: [T1[0], h - 1.19, T1[1] + 0.3], ceiling: [0, h, 0]
  };
  const animated = [win, ...Object.values(cups)];
  const update = t => animated.forEach(a => a.userData.update && a.userData.update(t));
  return { group: g, anchors, props: { tables, chairs, counter, espresso, cups, window: win, lamps, plants, clock, door: dr, laptop: lap, phone, street },
    lights: { fill: hemi, window: sun, lamps: lamps.map(l => l.userData.light) }, update };
}
