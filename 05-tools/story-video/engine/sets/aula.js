// sets/aula.js: a reusable low-poly university classroom by day, built only from stage.js primitives.
//
// What it builds (one THREE.Group, room centred on x = 0, z = 0, floor at y = 0, the class faces -z):
//   - floor, ceiling, a front wall (z = -d/2) with a real door hole, a back wall, a solid right wall and a
//     left wall (x = -w/2) with real window holes, mullions and sills; a sky, a lawn and trees outside;
//   - a blackboard on the front wall (pizarra), a wall clock above it (relojPared), a teacher's desk with a
//     chair and its own laptop, rows of student desks with chairs (pupitre), seeded backpacks (mochila),
//     ceiling fluorescent fixtures (fluorescente), and the hero's laptop on the hero's desk;
//   - lights: a warm sun (directional, shadows) that throws window patches on the floor (the warm practical),
//     a cold hemisphere fill, and cold-white tube spill lights. The accent (a screen, an alarm) is the film's.
// Everything is deterministic: the only randomness is rng(opts.seed).
//
// buildAula(stage, opts) -> { group, anchors, props, lights }. It adds the group to stage.scene and registers it
// as stage.sets[opts.name] (default 'aula'). Options (all optional):
//   name 'aula', w 8, d 10, h 3 (room size, metres), rows 4, cols 4 (student desks), hero [col, row] ([2, 2]),
//   seed 3, boardText (string or array of lines, chalk on the board), boardFont ('700 120px Oswald'),
//   clock {h, m} (10:10), screenCanvas (canvas drawn on the hero laptop; one is made if missing),
//   teacherScreenCanvas (the same for the teacher's laptop), backpackShare 0.45, empty [[col, row], ...] (desks
//   without chairs pulled out or backpacks), colors {wall, front, floor, ceiling, desk, board},
//   sun 2.6 (intensity), fill 0.9, tubes 2.2 (spill intensity, 0 = off), sky '#a9d3f2'.
//
// Anchors (world [x, y, z]):
//   desk         the hero desk top centre (put props here)       seat        where a seated Stickman mesh goes
//   board        the blackboard centre                           door        the door hole centre (front wall)
//   teacherDesk  the teacher desk top centre                     teacherSeat where the seated teacher Stickman goes
//   window       the middle window centre (left wall)            clock       the wall clock centre
//   back         a camera spot at the back of the room           front       a camera spot at the front, by the board
//   desks        every student desk: [{col, row, top, seat}]
//
// Prop builders, each returns a THREE.Group with handles on userData:
//   pupitre({desk, chair, chairOut})              desk + chair, the chair behind the desk (+z); userData.chair
//   pizarra({text, w, h, font, color})           userData.setText(text) redraws the chalk
//   relojPared({r})                               userData.set(h, m) turns the hands
//   laptop({screenCanvas, glow})                  userData.screen, .texture, .refresh(), .lid(angle), .light (PointLight)
//   fluorescente({len, on})                       userData.setOn(0..1)
//   mochila({color, seed})                        a backpack
//   mesaProfesor({color})                         a teacher desk with a chair behind it (-z side)
import { THREE, box, mat, door, wallWithHoles, rng } from '../stage.js';

// ---------- props ----------
export function pupitre({ desk = '#9a7552', chair = '#2f6db0', chairOut = 0 } = {}) {
  const g = new THREE.Group();
  g.add(box(0.72, 0.04, 0.5, desk, 0, 0.71, 0));                                   // top at y 0.75
  g.add(box(0.66, 0.16, 0.02, '#4a4f58', 0, 0.55, -0.23, { metal: 0.4, rough: 0.5 })); // modesty panel
  for (const [x, z] of [[-0.32, -0.21], [0.32, -0.21], [-0.32, 0.21], [0.32, 0.21]]) g.add(box(0.035, 0.71, 0.035, '#3b3f47', x, 0, z, { metal: 0.5, rough: 0.4 }));
  const ch = new THREE.Group(); ch.position.set(0, 0, 0.5 + chairOut); g.add(ch);
  ch.add(box(0.42, 0.04, 0.4, chair, 0, 0.45, 0));                                   // seat top at y 0.49
  ch.add(box(0.42, 0.34, 0.035, chair, 0, 0.58, 0.19));                              // back
  for (const [x, z] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) ch.add(box(0.03, 0.45, 0.03, '#3b3f47', x, 0, z, { metal: 0.5, rough: 0.4 }));
  g.userData.chair = ch; return g;
}

export function pizarra({ text = '', w = 3.4, h = 1.25, font = '700 120px Oswald', color = '#23382f' } = {}) {
  const g = new THREE.Group();
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = Math.round(1024 * h / w);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  board.position.set(0, h / 2, 0.035); board.receiveShadow = true; g.add(board);
  g.add(box(w + 0.12, 0.06, 0.06, '#8b8f96', 0, -0.06, 0.03), box(w + 0.12, 0.06, 0.06, '#8b8f96', 0, h, 0.03));
  g.add(box(0.06, h + 0.12, 0.06, '#8b8f96', -w / 2 - 0.03, -0.06, 0.03), box(0.06, h + 0.12, 0.06, '#8b8f96', w / 2 + 0.03, -0.06, 0.03));
  g.add(box(w * 0.9, 0.03, 0.09, '#8b8f96', 0, -0.06, 0.1));                         // chalk tray
  g.add(box(0.12, 0.05, 0.06, '#d9d3c4', w * 0.3, -0.03, 0.1));                      // eraser
  const R = rng(17);
  g.userData.setText = (t, { fontOverride, ink = '#ecebe2' } = {}) => {
    const x = cv.getContext('2d'), W = cv.width, H = cv.height;
    x.fillStyle = color; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(230,235,225,${0.025 + R() * 0.04})`; x.beginPath(); x.ellipse(R() * W, R() * H, 40 + R() * 160, 10 + R() * 30, R() * 3, 0, 7); x.fill(); } // old smudges
    const lines = Array.isArray(t) ? t : (t ? [t] : []);
    x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle';
    const f = fontOverride || font, size = parseInt(f.match(/(\d+)px/)?.[1] || '120', 10);
    lines.forEach((s, i) => { let fs = size; x.font = f; while (x.measureText(s).width > W * 0.9 && fs > 30) { fs -= 4; x.font = f.replace(/\d+px/, fs + 'px'); }
      x.fillText(s, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.12); });
    tex.needsUpdate = true;
  };
  g.userData.setText(text); g.userData.board = board; return g;
}

export function relojPared({ r = 0.2 } = {}) {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.025, r + 0.025, 0.05, 28), mat('#22252b', { metal: 0.3, rough: 0.5 }));
  rim.rotation.x = Math.PI / 2; rim.castShadow = true; g.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 28), mat('#f4f1e8', { rough: 0.7 })); face.position.z = 0.027; g.add(face);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, big = i % 3 === 0;
    const tk = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.018 : 0.01, big ? 0.05 : 0.03, 0.004), mat('#1a1c20')); tk.position.set(Math.sin(a) * r * 0.82, Math.cos(a) * r * 0.82, 0.03); tk.rotation.z = -a; g.add(tk); }
  const hand = (len, wd, col, z) => { const p = new THREE.Group(); p.position.z = z; const m = new THREE.Mesh(new THREE.BoxGeometry(wd, len, 0.006), mat(col)); m.position.y = len / 2 - 0.02; p.add(m); g.add(p); return p; };
  const hh = hand(r * 0.55, 0.022, '#1a1c20', 0.034), mh = hand(r * 0.8, 0.014, '#1a1c20', 0.04);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 10), mat('#c8372d')); hub.rotation.x = Math.PI / 2; hub.position.z = 0.046; g.add(hub);
  g.userData.set = (h, m) => { mh.rotation.z = -(m / 60) * Math.PI * 2; hh.rotation.z = -(((h % 12) + m / 60) / 12) * Math.PI * 2; };
  g.userData.set(10, 10); return g;
}

export function laptop({ screenCanvas = null, glow = 0, body = '#2b2f37' } = {}) {
  const g = new THREE.Group();
  const cv = screenCanvas || Object.assign(document.createElement('canvas'), { width: 640, height: 400 });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  g.add(box(0.34, 0.018, 0.24, body, 0, 0, 0, { metal: 0.3, rough: 0.5 }));
  g.add(box(0.3, 0.002, 0.1, '#16181d', 0, 0.018, -0.02, { cast: false }));          // keyboard
  const hinge = new THREE.Group(); hinge.position.set(0, 0.018, -0.115); g.add(hinge);
  hinge.add(box(0.34, 0.23, 0.01, body, 0, 0, 0, { metal: 0.3, rough: 0.5 }));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.195), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  scr.position.set(0, 0.115, 0.0055); hinge.add(scr);
  const L = new THREE.PointLight('#9fc0ff', glow, 2.2, 1.5); L.position.set(0, 0.18, 0.15); g.add(L);
  g.userData.lid = a => { hinge.rotation.x = -a; };
  g.userData.lid(0.28);
  Object.assign(g.userData, { screen: scr, texture: tex, canvas: cv, light: L, refresh() { tex.needsUpdate = true; } });
  return g;
}

export function fluorescente({ len = 1.25, on = 1 } = {}) {
  const g = new THREE.Group();
  g.add(box(len, 0.06, 0.32, '#d9dadc', 0, -0.06, 0, { cast: false }));
  const tubeMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#eef4ff', emissiveIntensity: 1.6 * on, roughness: 0.4 });
  for (const z of [-0.08, 0.08]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len * 0.94, 8), tubeMat); t.rotation.z = Math.PI / 2; t.position.set(0, -0.08, z); g.add(t); }
  g.userData.setOn = k => { tubeMat.emissiveIntensity = 1.6 * k; }; return g;
}

export function mochila({ color = '#7a3b3b', seed = 1 } = {}) {
  const g = new THREE.Group(), R = rng(seed);
  const dark = new THREE.Color(color).multiplyScalar(0.6).getStyle();
  g.add(box(0.3, 0.38, 0.17, color, 0, 0, 0));
  g.add(box(0.31, 0.12, 0.19, dark, 0, 0.3, 0));                                    // flap
  g.add(box(0.22, 0.15, 0.06, dark, 0, 0.06, 0.11));                                 // front pocket
  g.add(box(0.05, 0.3, 0.02, '#202227', -0.09, 0.04, -0.095), box(0.05, 0.3, 0.02, '#202227', 0.09, 0.04, -0.095));
  g.rotation.set(-0.18 - R() * 0.1, R() * 1.2 - 0.6, 0); return g;
}

export function mesaProfesor({ color = '#6b4a33' } = {}) {
  const g = new THREE.Group();
  g.add(box(1.6, 0.05, 0.78, color, 0, 0.72, 0));                                    // top at 0.77
  g.add(box(1.5, 0.55, 0.04, new THREE.Color(color).multiplyScalar(0.75).getStyle(), 0, 0.17, 0.33)); // front panel, toward the class
  g.add(box(0.04, 0.72, 0.7, '#3b2a20', -0.76, 0, 0), box(0.04, 0.72, 0.7, '#3b2a20', 0.76, 0, 0));
  const ch = new THREE.Group(); ch.position.set(0.0, 0, -0.62); g.add(ch);
  ch.add(box(0.48, 0.05, 0.45, '#24262c', 0, 0.44, 0), box(0.48, 0.55, 0.05, '#24262c', 0, 0.49, -0.22), box(0.05, 0.44, 0.05, '#15171c', 0, 0, 0));
  g.userData.chair = ch; return g;
}

// ---------- the classroom ----------
export function buildAula(stage, opts = {}) {
  const o = Object.assign({ name: 'aula', w: 8, d: 10, h: 3, rows: 4, cols: 4, hero: [2, 2], seed: 3, boardText: '', boardFont: '700 120px Oswald',
    clock: { h: 10, m: 10 }, screenCanvas: null, teacherScreenCanvas: null, backpackShare: 0.45, empty: [], sun: 2.6, fill: 0.9, tubes: 2.2, sky: '#a9d3f2' }, opts);
  const C = Object.assign({ wall: '#c9c2b4', front: '#b9b2a4', floor: '#8a7a68', ceiling: '#dcd8cf', desk: '#a07b56', board: '#23382f', chair: '#2f5f9e' }, opts.colors || {});
  const R = rng(o.seed), { w, d, h } = o;
  const g = new THREE.Group(); stage.scene.add(g); stage.sets[o.name] = g;

  // shell: floor, ceiling, walls with real holes
  const fl = box(w, 0.05, d, C.floor, 0, -0.05, 0); fl.castShadow = false; g.add(fl);
  for (let i = -Math.floor(d / 2); i <= Math.floor(d / 2); i++) g.add(box(w, 0.003, 0.012, '#7a6b5a', 0, 0, i, { cast: false }));   // floor tile seams
  const ce = box(w, 0.05, d, C.ceiling, 0, h, 0); ce.castShadow = false; g.add(ce);
  const DOOR = { x: w / 2 - 1.1, w: 0.95, h: 2.1 };
  const front = wallWithHoles(w, h, [{ x: DOOR.x, y: 0, w: DOOR.w, h: DOOR.h }], C.front); front.position.z = -d / 2; g.add(front);
  const back = wallWithHoles(w, h, [], C.wall); back.position.z = d / 2; back.rotation.y = Math.PI; g.add(back);
  g.add(box(0.12, h, d, C.wall, w / 2, 0, 0));
  const WIN = [-d * 0.25, d * 0.05, d * 0.35].map(z => ({ z, y: 1.0, w: 1.8, h: 1.45 }));
  const left = wallWithHoles(d, h, WIN.map(q => ({ x: -q.z, y: q.y, w: q.w, h: q.h })), C.wall); left.rotation.y = Math.PI / 2; left.position.x = -w / 2; g.add(left);
  for (const q of WIN) {                                                                // frames: sill, mullions, transom
    g.add(box(0.26, 0.05, q.w + 0.1, '#e8e4dc', -w / 2 + 0.04, q.y - 0.05, q.z));
    g.add(box(0.05, q.h, 0.05, '#e8e4dc', -w / 2, q.y, q.z), box(0.05, 0.05, q.w, '#e8e4dc', -w / 2, q.y + q.h * 0.62, q.z));
  }
  g.add(box(0.03, 0.12, d - 0.2, '#6f675b', -w / 2 + 0.07, 0, 0, { cast: false }), box(0.03, 0.12, d - 0.2, '#6f675b', w / 2 - 0.07, 0, 0, { cast: false })); // skirting
  // outside: sky, lawn, trees, a far building
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(60, 24), new THREE.MeshBasicMaterial({ color: o.sky })); sky.rotation.y = Math.PI / 2; sky.position.set(-w / 2 - 14, 6, 0); g.add(sky);
  const lawn = box(14, 0.05, 40, '#6f9a4e', -w / 2 - 7.1, -0.4, 0); lawn.castShadow = false; g.add(lawn);
  for (let i = 0; i < 9; i++) { const tz = -d / 2 - 2 + R() * (d + 4), tx = -w / 2 - 3 - R() * 7, s = 0.8 + R() * 0.8;
    g.add(box(0.18 * s, 1.2 * s, 0.18 * s, '#5b4433', tx, -0.4, tz));
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * s, 0), mat(R() < 0.5 ? '#4f8a3c' : '#3f7a34')); crown.position.set(tx, -0.4 + 1.6 * s, tz); crown.castShadow = true; g.add(crown); }
  g.add(box(3, 5, 12, '#c8b9a2', -w / 2 - 12, -0.4, -2));
  for (let r2 = 0; r2 < 3; r2++) for (let c2 = 0; c2 < 5; c2++) g.add(box(0.05, 0.7, 1.2, '#5f7590', -w / 2 - 10.48, 0.6 + r2 * 1.5, -6.5 + c2 * 2.2, { cast: false }));

  // front of the room: board, clock, door, teacher desk
  const board = pizarra({ text: o.boardText, font: o.boardFont, color: C.board }); board.position.set(-0.3, 0.95, -d / 2 + 0.06); g.add(board);
  const clock = relojPared({ r: 0.22 }); clock.position.set(-2.75, 2.45, -d / 2 + 0.09); g.add(clock); clock.userData.set(o.clock.h, o.clock.m);
  const dr = door({ color: '#6a4c35', frame: '#3b3f47' }); dr.position.set(DOOR.x, 0, -d / 2); g.add(dr);
  const tDesk = mesaProfesor({}); tDesk.position.set(0.2, 0, -d / 2 + 1.35); g.add(tDesk);  // front panel toward the class, chair on the board side
  const tLap = laptop({ screenCanvas: o.teacherScreenCanvas }); tLap.position.set(0.35, 0.77, -d / 2 + 1.25); g.add(tLap);  // screen toward the teacher (-z side)
  tLap.rotation.y = Math.PI;
  g.add(box(0.22, 0.04, 0.3, '#e9e4d6', -0.35, 0.77, -d / 2 + 1.35, { cast: false }), box(0.2, 0.03, 0.28, '#d24b3c', -0.36, 0.81, -d / 2 + 1.37, { cast: false })); // papers + a red folder
  // student desks
  const desks = [], props = { board, clock, door: dr, teacherDesk: tDesk, teacherLaptop: tLap, desks: [], backpacks: [], fixtures: [] };
  const z0 = -d / 2 + 3.2, dz = 1.3, dx = 1.6, x0 = -dx * (o.cols - 1) / 2;
  const isEmpty = (cI, rI) => o.empty.some(([a, b]) => a === cI && b === rI);
  for (let rI = 0; rI < o.rows; rI++) for (let cI = 0; cI < o.cols; cI++) {
    const x = x0 + cI * dx, z = z0 + rI * dz, hero = cI === o.hero[0] && rI === o.hero[1];
    const p = pupitre({ desk: C.desk, chair: C.chair, chairOut: hero ? 0.05 : (R() - 0.5) * 0.12 }); p.position.set(x, 0, z); p.rotation.y = hero ? 0 : (R() - 0.5) * 0.06; g.add(p); props.desks.push(p);
    desks.push({ col: cI, row: rI, top: [x, 0.75, z], seat: [x, -0.12, z + 0.5 + (hero ? 0.05 : 0)] });
    if (!hero && !isEmpty(cI, rI) && R() < o.backpackShare) { const m = mochila({ color: ['#7a3b3b', '#2f4f6f', '#3d5a3a', '#5a4a7a', '#8a6a2a'][Math.floor(R() * 5)], seed: o.seed * 31 + rI * 7 + cI });
      m.position.set(x + (R() < 0.5 ? -0.42 : 0.42), 0, z + 0.45); g.add(m); props.backpacks.push(m); }
  }
  const H = desks.find(q => q.col === o.hero[0] && q.row === o.hero[1]) || desks[0];
  const lap = laptop({ screenCanvas: o.screenCanvas }); lap.position.set(H.top[0], 0.75, H.top[2] + 0.04); g.add(lap); props.laptop = lap;
  const heroBag = mochila({ color: '#2b2f37', seed: 99 }); heroBag.position.set(H.top[0] + 0.45, 0, H.top[2] + 0.5); g.add(heroBag); props.backpacks.push(heroBag);
  // ceiling fixtures
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const f = fluorescente({}); f.position.set(-1.6 + j * 3.2, h - 0.02, -d / 2 + 2 + i * 3); g.add(f); props.fixtures.push(f); }

  // lights: warm sun through the windows (the warm practical), cold fill, cold-white tube spill
  const sun = new THREE.DirectionalLight('#ffd9a8', o.sun); sun.position.set(-w / 2 - 7, 6.5, 1.5); sun.target.position.set(0, 0, 0.5);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 30 }); g.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#bcd0f0', '#4a4036', o.fill); g.add(hemi);
  const tubes = [-d / 2 + 2.5, d / 2 - 3].map(z => { const L = new THREE.PointLight('#e6eeff', o.tubes, 9, 1.4); L.position.set(0.5, h - 0.35, z); g.add(L); return L; });
  const lights = { sun, hemi, tubes };

  const anchors = {
    desk: H.top, seat: H.seat, board: [-0.3, 0.95 + 0.62, -d / 2 + 0.1], door: [DOOR.x, 1.05, -d / 2],
    teacherDesk: [0.2, 0.77, -d / 2 + 1.35], teacherSeat: [0.2, -0.12, -d / 2 + 0.75], window: [-w / 2, 1.7, WIN[1].z],
    clock: [-2.75, 2.45, -d / 2 + 0.1], back: [0, 1.75, d / 2 - 0.4], front: [w / 2 - 1.6, 1.7, -d / 2 + 0.6], desks
  };
  return { group: g, anchors, props, lights };
}
