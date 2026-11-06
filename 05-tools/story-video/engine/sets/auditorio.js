// sets/auditorio.js: a reusable auditorium set (hackathon, conference, school assembly) built from stage.js pieces.
// It builds, as one THREE.Group: a dark hall (floor, walls, ceiling, a front wall with exit doors), a raised stage with
// a glowing front edge, steps and a podium, a giant screen on the back wall that shows a 2D canvas you redraw, two
// stage spotlights on a truss (the warm practical, with soft visible beams), rows of long tables with chairs and
// glowing laptops, pizza boxes and cans, an optional judges' table in front of the stage, a hanging banner, a cold
// fill (hemisphere + directional, inside the group) and a soft glow in front of the giant screen (the accent).
// Everything is low-poly and deterministic (seeded rng only); there is no story text in here: films pass labels in.
//
// usage (in a film):   import { buildAuditorio } from '../engine/sets/auditorio.js';
//   const A = buildAuditorio(stage, { screenCanvas: myCanvas, yourLaptopCanvas: myLaptopCanvas, judgesLabel: 'JUECES' });
//   stage.use('auditorio'); stage.aim(A.anchors.yourSeat ...); A.props.screen.userData.update() after redrawing myCanvas.
//
// buildAuditorio(stage, opts) options (all optional):
//   name ('auditorio')  key in stage.sets          seed (3)            seeded layout (props, which screens are on)
//   w (18) d (24) h (7.5)  hall size in metres; the back wall (behind the stage) is at z = -d/2, the audience faces -z
//   rows (4)            rows of long tables          perTable (4)       seats per table (two tables per row, aisle at x = 0)
//   screenCanvas        canvas shown on the giant screen (16:9 is best); without it the screen is a dark panel
//   yourLaptopCanvas    canvas for the hero's laptop screen (seat: row yourRow, left table, next to the aisle)
//   yourRow (2)         which row the hero sits in   laptopCanvases     array of canvases for the other laptops
//                                                                        (default: seeded code screens made here)
//   judges (true)       a cloth-covered judges' table in front of the stage, left side
//   judgesLabel (null)  text on a tent card on the judges' table     bannerText (null)  text on a banner on the left wall
//   wall, floor, ceiling, table, chair: colours        edge ('#8B7CFF')   glow colour of the stage front edge
//   spotColor ('#ffc48a') spotIntensity (60)   fillColor ('#5d7bb3') fillIntensity (0.6)   screenGlow ('#7fa8ff')
//   litShare (0.75)     share of the other laptops that are on
//
// returns { group, anchors, props, lights }
//   anchors (named [x, y, z], world = group coords): stage (stage floor centre), podium (top of the podium),
//     screen (giant screen centre), yourSeat (hero's chair, floor), yourHero (where a seated Stickman mesh goes,
//     y = -0.146 for the stock sitting pose), yourLaptop (hero's laptop on the table top), judgesTable (table top
//     centre), aisle (centre aisle, floor), back (back of the hall, floor), entrance (front wall door, floor),
//     stageFront (floor in front of the stage), truss (spot truss centre)
//   props: screen (pantallaGigante group; .userData.update()), yourLaptop (laptop group), laptops (all other laptops),
//     seats ([{pos: [x, 0, z], hero: [x, y, z], laptop, row, side, index}] every chair except the hero's),
//     judgesTable, judgesSeats ([x, 0, z] chairs, facing the stage), spots (focoEscenario rigs), banner, escenario,
//     atril, exitSigns
//   lights: hemi, dir (cold fill), spots (SpotLights), screenGlow (PointLight in front of the giant screen)
//
// prop builders (each returns a THREE.Group or Mesh whose origin sits on the floor / table top, facing +z unless said):
//   escenario({w, d, h, color, edge, steps})      a stage platform, front edge at z = +d/2, steps on the right
//   pantallaGigante({canvas, w, h, frame})        a framed screen showing a canvas texture; userData.update()
//   filaSillas({n, spacing, color, facing})       a row of chairs along x; facing -1 (default) faces -z; userData.seats
//   mesaLarga({len, depth, height, color, cloth}) a long table along x; cloth: a front skirt colour (judges)
//   laptop({screenCanvas, color, lid})            an open laptop, screen towards +z; userData.screen/.texture/.lid
//   focoEscenario({color, intensity, angle, distance, shadow, beam})  a spotlight can with a SpotLight and a faint
//                                                 beam cone; userData.aim([x, y, z]) in the rig's parent coords
//   banner({text, w, h, bg, fg, font})            a cloth banner (canvas text, drawn when called: load fonts first)
//   latasYCajasPizza({seed, n, w, d, avoid})      cans and pizza boxes (some open) over a w x d area, off the x in avoid
//   atril({color, top})                           a podium
//   pantallaCodigo(seed, {bg, a, b})              a 512x320 canvas of fake code rows (for laptop screens)
import { THREE, box, mat, room, wallWithHoles, rng } from '../stage.js';

// ---------- small prop builders ----------
export function pantallaCodigo(seed = 1, { bg = '#0c0f14', a = '#8fb6ff', b = '#e4b363', dim = false } = {}) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 320; const g = cv.getContext('2d'), R = rng(seed);
  g.fillStyle = bg; g.fillRect(0, 0, 512, 320);
  g.fillStyle = '#161a22'; g.fillRect(0, 0, 512, 22); g.fillStyle = '#0f1218'; g.fillRect(0, 22, 110, 298);
  for (let i = 0; i < 8; i++) { g.fillStyle = '#3a4252'; g.fillRect(12, 36 + i * 22, 50 + R() * 40, 7); }
  for (let i = 0; i < 12; i++) { const x = 126 + (i % 4) * 14, u = 20 + R() * 120, v = 20 + R() * 160;
    g.fillStyle = a; g.fillRect(x, 36 + i * 23, u, 8); g.fillStyle = b; g.fillRect(x + u + 10, 36 + i * 23, v, 8); }
  if (dim) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, 512, 320); }
  return cv;
}

export function laptop({ screenCanvas = null, color = '#2b2f37', lid = -0.28, glow = true } = {}) {
  const g = new THREE.Group();
  g.add(box(0.38, 0.018, 0.26, color, 0, 0, 0, { metal: 0.3, rough: 0.5, cast: false }));
  g.add(box(0.32, 0.002, 0.11, '#16181d', 0, 0.018, 0.03, { cast: false }));
  const L = new THREE.Group(); L.position.set(0, 0.018, -0.13); L.rotation.x = lid; g.add(L);
  L.add(box(0.38, 0.25, 0.012, color, 0, 0, 0, { metal: 0.3, rough: 0.5 }));
  let tex = null, sm;
  if (screenCanvas) { tex = new THREE.CanvasTexture(screenCanvas); tex.colorSpace = THREE.SRGBColorSpace; sm = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); }
  else sm = new THREE.MeshBasicMaterial({ color: glow ? '#1b2333' : '#07080b' });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.22), sm); scr.position.set(0, 0.125, 0.0065); L.add(scr);
  g.userData = { screen: scr, texture: tex, lid: L, update: () => { if (tex) tex.needsUpdate = true; } };
  return g;
}

export function mesaLarga({ len = 6, depth = 0.8, height = 0.72, color = '#3b3f48', legColor = '#1a1c21', cloth = null } = {}) {
  const g = new THREE.Group();
  g.add(box(len, 0.04, depth, color, 0, height - 0.04, 0));
  const lx = len / 2 - 0.12, lz = depth / 2 - 0.08;
  for (const x of [-lx, lx]) for (const z of [-lz, lz]) g.add(box(0.05, height - 0.04, 0.05, legColor, x, 0, z, { cast: false }));
  if (len > 3.5) for (const z of [-lz, lz]) g.add(box(0.05, height - 0.04, 0.05, legColor, 0, 0, z, { cast: false }));
  if (cloth) g.add(box(len - 0.02, height - 0.14, 0.02, cloth, 0, 0.1, depth / 2 - 0.01, { cast: false }));
  g.userData.top = height; return g;
}

export function filaSillas({ n = 4, spacing = 1.2, color = '#24262c', frame = '#15171c', seat = 0.46, facing = -1 } = {}) {
  const g = new THREE.Group(); const seats = [];
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * spacing; const ch = new THREE.Group(); ch.position.x = x; g.add(ch);
    ch.add(box(0.44, 0.05, 0.42, color, 0, seat - 0.05, 0, { cast: false }));
    for (const [a, b] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) ch.add(box(0.03, seat - 0.05, 0.03, frame, a, 0, b, { cast: false }));
    ch.add(box(0.44, 0.46, 0.04, color, 0, seat, -facing * 0.2, { cast: false }));
    seats.push([x, 0, 0]);
  }
  g.userData.seats = seats; return g;
}

export function escenario({ w = 12, d = 4, h = 0.9, color = '#1d2028', top = '#2a2d36', edge = '#8B7CFF', steps = true } = {}) {
  const g = new THREE.Group();
  g.add(box(w, h - 0.04, d, color, 0, 0, 0), box(w, 0.04, d, top, 0, h - 0.04, 0, { cast: false }));
  const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: edge, toneMapped: false }));
  strip.position.set(0, h - 0.06, d / 2 + 0.011); g.add(strip);
  if (steps) for (let i = 0; i < 3; i++) g.add(box(1.4, h * (i + 1) / 4, 0.32, color, w / 2 - 1.2, 0, d / 2 + 0.16 + (2 - i) * 0.32));
  g.userData = { h, strip }; return g;
}

export function atril({ color = '#2a2d36', top = '#3a3e49' } = {}) {
  const g = new THREE.Group();
  g.add(box(0.6, 1.05, 0.45, color, 0, 0, 0), box(0.68, 0.05, 0.5, top, 0, 1.05, 0.02));
  const mic = box(0.015, 0.25, 0.015, '#111216', 0.12, 1.1, 0.1, { cast: false }); mic.rotation.x = 0.35; g.add(mic);
  g.userData.top = 1.1; return g;
}

export function pantallaGigante({ canvas = null, w = 9, h = null, frame = '#0b0c10', bg = '#05070b' } = {}) {
  h = h ?? w * 9 / 16; const g = new THREE.Group();
  g.add(box(w + 0.3, 0.15, 0.12, frame, 0, -0.15, 0), box(w + 0.3, 0.15, 0.12, frame, 0, h, 0),
    box(0.15, h, 0.12, frame, -w / 2 - 0.075, 0, 0), box(0.15, h, 0.12, frame, w / 2 + 0.075, 0, 0));
  let tex = null, m;
  if (canvas) { tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); }
  else m = new THREE.MeshBasicMaterial({ color: bg });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(0, h / 2, 0.02); g.add(p);
  g.userData = { panel: p, texture: tex, w, h, update: () => { if (tex) tex.needsUpdate = true; } };
  return g;
}

export function focoEscenario({ color = '#ffc48a', intensity = 60, angle = 0.32, distance = 22, shadow = false, beam = true, beamOpacity = 0.028 } = {}) {
  const g = new THREE.Group();
  const can = new THREE.Group(); g.add(can);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.42, 10), mat('#16181d', { metal: 0.4, rough: 0.5 })); body.rotation.x = Math.PI / 2; can.add(body);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), new THREE.MeshBasicMaterial({ color, toneMapped: false })); lens.position.z = 0.215; can.add(lens);
  g.add(box(0.04, 0.3, 0.04, '#16181d', 0, 0, 0, { cast: false }));
  const L = new THREE.SpotLight(color, intensity, distance, angle, 0.45, 1.3); L.castShadow = shadow;
  if (shadow) { L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.002; }
  const target = new THREE.Object3D(); g.add(L, target); L.target = target;
  let cone = null;
  if (beam) { cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 16, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: beamOpacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); g.add(cone); }
  g.userData = { light: L, target, cone, can,
    aim(p) {                                                    // p in the rig's parent coords (the rig is never rotated)
      const d = new THREE.Vector3(p[0] - g.position.x, p[1] - g.position.y, p[2] - g.position.z); target.position.copy(d);
      const len = d.length(), dir = d.clone().normalize();
      can.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      if (cone) { const r = Math.tan(angle) * len * 0.85; cone.scale.set(r, len, r); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir); cone.position.copy(dir.clone().multiplyScalar(len / 2)); }
    } };
  return g;
}

export function banner({ text = '', w = 4, h = 1, bg = '#8B7CFF', fg = '#0c0f14', font = '700 150px Oswald' } = {}) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = Math.round(1024 * h / w); const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = parseInt(font.match(/(\d+)px/)[1], 10);
  while (size > 20 && g.measureText(text).width > cv.width * 0.9) { size -= 6; g.font = font.replace(/\d+px/, size + 'px'); }
  g.fillText(text, cv.width / 2, cv.height / 2 + 4);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide }));
  m.receiveShadow = true; m.userData = { canvas: cv, texture: tex }; return m;
}

export function latasYCajasPizza({ seed = 1, n = 6, w = 5, d = 0.6, avoid = [], radius = 0.34 } = {}) {
  const g = new THREE.Group(), R = rng(seed);
  const pickX = () => { let x = 0; for (let k = 0; k < 12; k++) { x = (R() - 0.5) * w; if (!avoid.some(a => Math.abs(a - x) < radius)) break; } return x; };
  const CAN = ['#c8372d', '#2e9e57', '#e8ecf2', '#3b6fd9', '#C6F432'];
  for (let i = 0; i < n; i++) {
    const x = pickX(), z = (R() - 0.5) * d;
    if (R() < 0.45) {                                                       // a pizza box, some open with a crust inside
      const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = (R() - 0.5) * 0.6; g.add(b);
      b.add(box(0.36, 0.045, 0.36, '#c9a46a', 0, 0, 0, { cast: false }));
      if (R() < 0.5) { const lid = new THREE.Group(); lid.position.set(0, 0.045, -0.18); lid.rotation.x = -1.9 + R() * 0.4; b.add(lid); lid.add(box(0.36, 0.01, 0.36, '#d8b57c', 0, 0, 0.18, { cast: false }));
        b.add(box(0.3, 0.012, 0.3, '#3a2a1c', 0, 0.045, 0, { cast: false }), box(0.1, 0.015, 0.12, '#d9a35a', 0.06, 0.045, -0.04, { cast: false })); }
      else if (R() < 0.5) b.add(box(0.34, 0.04, 0.34, '#b8935c', 0.02, 0.045, 0.01, { cast: false }));
    } else {                                                                // a can, standing or knocked over
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 8), mat(CAN[Math.floor(R() * CAN.length)], { metal: 0.5, rough: 0.4 }));
      if (R() < 0.3) { can.rotation.z = Math.PI / 2; can.rotation.y = R() * 3; can.position.set(x, 0.033, z); } else can.position.set(x, 0.06, z);
      g.add(can);
    }
  }
  return g;
}

// ---------- the whole hall ----------
export function buildAuditorio(stage, o = {}) {
  o = Object.assign({ name: 'auditorio', seed: 3, w: 18, d: 24, h: 7.5, rows: 4, perTable: 4, yourRow: 2, judges: true, judgesLabel: null, bannerText: null,
    wall: '#262a33', floor: '#2b2d33', ceiling: '#14161b', table: '#3b3f48', chair: '#24262c', edge: '#8B7CFF', spotColor: '#ffc48a', spotIntensity: 60,
    fillColor: '#5d7bb3', fillIntensity: 0.6, screenGlow: '#7fa8ff', litShare: 0.75, screenCanvas: null, yourLaptopCanvas: null, laptopCanvases: null }, o);
  const R = rng(o.seed), G = new THREE.Group(); G.name = o.name;
  const back = -o.d / 2, front = o.d / 2;
  // the hall
  G.add(room({ w: o.w, d: o.d, h: o.h, wall: o.wall, floor: o.floor, ceiling: o.ceiling }));
  const fw = wallWithHoles(o.w, o.h, [{ x: -o.w / 2 + 2.2, y: 0, w: 1.6, h: 2.3 }, { x: o.w / 2 - 2.2, y: 0, w: 1.6, h: 2.3 }], o.wall); fw.position.z = front; G.add(fw);
  const exitSigns = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.04), new THREE.MeshBasicMaterial({ color: '#2fd67a', toneMapped: false })); m.position.set(s * (o.w / 2 - 2.2), 2.6, front - 0.1); G.add(m); return m; });
  for (const s of [-1, 1]) { const bk = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.3), new THREE.MeshBasicMaterial({ color: '#05060a' })); bk.position.set(s * (o.w / 2 - 2.2), 1.15, front + 0.3); bk.rotation.y = Math.PI; G.add(bk); }
  // wall panels (acoustic slats) so the side walls read in the dark
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) G.add(box(0.06, 3.2, 1.6, '#1d2028', s * (o.w / 2 - 0.09), 1.4, back + 4 + i * 3.4, { cast: false }));
  // the stage, steps, podium
  const sd = 4, sh = 0.9, sz = back + sd / 2;
  const esc = escenario({ w: o.w - 6, d: sd, h: sh, edge: o.edge }); esc.position.z = sz; G.add(esc);
  const at = atril(); at.position.set(3.4, sh, sz + 0.6); at.rotation.y = -0.25; G.add(at);
  // the giant screen on the back wall
  const sw = 9, scr = pantallaGigante({ canvas: o.screenCanvas, w: sw }); scr.position.set(0, sh + 1.15, back + 0.12); G.add(scr);
  const scrY = sh + 1.15 + scr.userData.h / 2;
  // the truss and two stage spots (the warm practical); the left one casts shadows
  const tz = sz + sd / 2 + 2.2, ty = o.h - 0.7;
  G.add(box(o.w - 4, 0.12, 0.12, '#101114', 0, ty + 0.18, tz, { cast: false }));
  for (const s of [-1, 1]) G.add(box(0.04, o.h - ty - 0.2, 0.04, '#101114', s * (o.w / 2 - 3), ty + 0.3, tz, { cast: false }));
  const spots = [-1, 1].map((s, i) => { const f = focoEscenario({ color: o.spotColor, intensity: o.spotIntensity, angle: 0.3, shadow: i === 0 });
    f.position.set(s * 2.6, ty, tz); G.add(f); f.userData.aim([s * 0.9, sh, sz + 0.3]); return f; });
  // the rows: two long tables per row, chairs on the +z side facing the stage, laptops on top
  const tableLen = o.perTable * 1.25 + 0.4, tx = 1.1 + tableLen / 2, rowZ = r => sz + sd / 2 + 3.4 + r * 2.9;
  const laptopTex = o.laptopCanvases || [pantallaCodigo(o.seed * 7 + 1), pantallaCodigo(o.seed * 7 + 2, { a: '#c6f432', b: '#8B7CFF' }), pantallaCodigo(o.seed * 7 + 3, { dim: true })];
  const laptops = [], seats = []; let yourLaptop = null, yourSeat = null, yourHero = null, yourLaptopPos = null;
  for (let r = 0; r < o.rows; r++) for (const side of [-1, 1]) {
    const z = rowZ(r), x = side * tx;
    const t = mesaLarga({ len: tableLen, color: o.table }); t.position.set(x, 0, z); G.add(t);
    const ch = filaSillas({ n: o.perTable, spacing: 1.25, color: o.chair }); ch.position.set(x, 0, z + 0.75); G.add(ch);
    const clutter = latasYCajasPizza({ seed: o.seed * 100 + r * 2 + (side > 0), n: 5, w: tableLen - 0.4, d: 0.45, avoid: [...Array(o.perTable).keys()].map(i => (i - (o.perTable - 1) / 2) * 1.25) }); clutter.position.set(x, 0.72, z - 0.12); G.add(clutter);
    for (let i = 0; i < o.perTable; i++) {
      const lx = x + (i - (o.perTable - 1) / 2) * 1.25, isYou = r === o.yourRow && side === -1 && i === o.perTable - 1;
      const on = isYou || R() < o.litShare;
      const lp = laptop({ screenCanvas: isYou ? o.yourLaptopCanvas : (on ? laptopTex[Math.floor(R() * laptopTex.length)] : null), glow: false });
      lp.position.set(lx, 0.72, z + 0.14); G.add(lp);
      const seat = { pos: [lx, 0, z + 0.75], hero: [lx, -0.146, z + 0.62], laptop: lp, row: r, side, index: i, on };
      if (isYou) { yourLaptop = lp; yourSeat = seat.pos; yourHero = seat.hero; yourLaptopPos = [lx, 0.72, z + 0.14]; } else { laptops.push(lp); seats.push(seat); }
    }
  }
  // the judges' table: in front of the stage, left, chairs behind it facing the stage
  let judgesTable = null, judgesSeats = [], jt = [-o.w / 2 + 4.2, 0.72, sz + sd / 2 + 1.5];
  if (o.judges) {
    judgesTable = mesaLarga({ len: 3.2, depth: 0.75, color: '#2a2d36', cloth: '#1b1e26' }); judgesTable.position.set(jt[0], 0, jt[2]); judgesTable.rotation.y = Math.PI; G.add(judgesTable);
    const jc = filaSillas({ n: 3, spacing: 1.0, color: o.chair }); jc.position.set(jt[0], 0, jt[2] + 0.7); G.add(jc);
    judgesSeats = jc.userData.seats.map(s => [jt[0] + s[0], 0, jt[2] + 0.7]);
    for (let i = 0; i < 3; i++) { const lp = laptop({ screenCanvas: laptopTex[i % laptopTex.length], glow: false }); lp.position.set(jt[0] + (i - 1), 0.72, jt[2] + 0.1); G.add(lp); }
    if (o.judgesLabel) for (const s of [1, -1]) { const b = banner({ text: o.judgesLabel, w: 1.4, h: 0.32, bg: '#e8ecf2', fg: '#0c0f14' }); b.position.set(jt[0], 0.9, jt[2] + s * 0.07 - 0.25); b.rotation.set(-0.25, s > 0 ? 0 : Math.PI, 0, 'YXZ'); G.add(b); }   // a tent card, readable from both sides
  }
  // a banner on the left wall
  let ban = null;
  if (o.bannerText) { ban = banner({ text: o.bannerText, w: 6, h: 1.3, bg: o.edge, fg: '#0c0f14' }); ban.position.set(-o.w / 2 + 0.1, 4.6, back + 8.5); ban.rotation.y = Math.PI / 2; G.add(ban); }
  // lights: cold fill (inside the group, so stage.use hides it with the set) and a glow in front of the giant screen
  const hemi = new THREE.HemisphereLight(o.fillColor, '#1b1a22', o.fillIntensity); G.add(hemi);
  const dir = new THREE.DirectionalLight(o.fillColor, o.fillIntensity * 0.8); dir.position.set(-4, 8, 6); G.add(dir);
  const glow = new THREE.PointLight(o.screenGlow, 6, 16, 1.4); glow.position.set(0, scrY, back + 2.2); G.add(glow);
  stage.scene.add(G); stage.sets[o.name] = G;
  const anchors = {
    stage: [0, sh, sz], podium: [3.4, sh + 1.1, sz + 0.6], screen: [0, scrY, back + 0.14], stageFront: [0, 0, sz + sd / 2 + 0.8],
    yourSeat, yourHero, yourLaptop: yourLaptopPos, judgesTable: jt, aisle: [0, 0, rowZ(1)], back: [0, 0, front - 2], entrance: [-o.w / 2 + 2.2, 0, front - 0.5],
    truss: [0, ty, tz]
  };
  return { group: G, anchors,
    props: { screen: scr, yourLaptop, laptops, seats, judgesTable, judgesSeats, spots, banner: ban, escenario: esc, atril: at, exitSigns },
    lights: { hemi, dir, spots: spots.map(s => s.userData.light), screenGlow: glow } };
}
