/* kit.js: clay finishes, geometry of every part shape (all primitive or procedural), floor and wall textures. No model files. */
'use strict';
const MAT = STYLE.material, FIN = STYLE.finishes, ROLES = STYLE.roles;

/* Seeded clay noise: a small tiling bump map (soft fingerprints and dents). */
const CLAY_BUMP = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const img = g.createImageData(128, 128);
  const n = (x, y, s) => hs(Math.floor(x / s) * 17 + Math.floor(y / s) * 131 + s * 7);
  const sm = (x, y, s) => { const x0 = Math.floor(x / s), y0 = Math.floor(y / s), fx = x / s - x0, fy = y / s - y0, a = n(x0 * s, y0 * s, s), b = n((x0 + 1) * s, y0 * s, s), c2 = n(x0 * s, (y0 + 1) * s, s), d = n((x0 + 1) * s, (y0 + 1) * s, s), ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy); return lerp(lerp(a, b, ux), lerp(c2, d, ux), uy); };
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const v = 0.5 * sm(x, y, 32) + 0.3 * sm(x, y, 12) + 0.2 * sm(x, y, 4); const k = Math.floor(255 * v), i = (y * 128 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = k; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(MAT.bumpScale, MAT.bumpScale); return t;
})();

const _mcache = {};
/* Material of a part. `dyn` parts (states, keys, glow) get a unique instance so the runtime can drive emissive, color and opacity. */
function partMaterial(p, ent, dyn) {
  const role = p.role || 'body', colors = ent.colors || {};
  const hex = p.color || colors[role] || ROLES[role] || '#cccccc';
  let finish = p.material && p.material !== 'auto' ? p.material : (role === 'metal' ? 'satin' : 'clay');
  const f = finish === 'satin' ? { rough: 0.5, metal: 0.55, bump: 0 } : (FIN[finish] || FIN.clay);
  const em = p.emissive != null ? p.emissive : (role === 'glow' ? 1 : role === 'screen' ? 0.5 : finish === 'emissive' ? 1.2 : 0);
  const op = p.opacity != null ? p.opacity : (f.opacity != null ? f.opacity : 1);
  const key = [hex, finish, em, op].join('|');
  if (!dyn && _mcache[key]) return _mcache[key];
  const m = new T.MeshStandardMaterial({ color: hex, roughness: f.rough, metalness: f.metal, bumpMap: f.bump ? CLAY_BUMP : null, bumpScale: MAT.bump * (f.bump || 0) });
  if (em > 0) { m.emissive = new T.Color(hex); m.emissiveIntensity = em; }
  if (op < 1) { m.transparent = true; m.opacity = op; m.depthWrite = op > 0.6; }
  m.userData = { base: new T.Color(hex), em, op, hex };
  if (!dyn) _mcache[key] = m;
  return m;
}

const _gcache = {};
const FACETS = (p, d) => p.facets || d;
/* Geometry of a part shape. Shared between identical parts. Sizes follow parts.mjs (PART_SIZE). */
function partGeometry(p) {
  const key = JSON.stringify([p.shape, p.size, p.points, p.radius, p.facets]);
  if (_gcache[key]) return _gcache[key];
  const s = p.size || [], g = (() => {
    switch (p.shape) {
      case 'box': { const w = s[0], h = s[1] == null ? w : s[1], d = s[2] == null ? w : s[2], mn = Math.min(w, h, d); const r = Math.min(p.radius != null ? p.radius : Math.min(0.045, mn * 0.3), mn / 2 - 0.001); return r > 0.004 ? new T.RoundedBoxGeometry(w, h, d, 3, r) : new T.BoxGeometry(w, h, d); }
      case 'sphere': { const ge = new T.SphereGeometry(1, FACETS(p, 28), Math.max(6, Math.round(FACETS(p, 28) * 0.7))); ge.scale(s[0], s[1] == null ? s[0] : s[1], s[2] == null ? s[0] : s[2]); return ge; }
      case 'cylinder': return s.length === 3 ? new T.CylinderGeometry(s[0], s[1], s[2], FACETS(p, 32)) : new T.CylinderGeometry(s[0], s[0], s[1], FACETS(p, 32));
      case 'cone': return new T.ConeGeometry(s[0], s[1], FACETS(p, 32));
      case 'torus': return new T.TorusGeometry(s[0], s[1], 14, 44, (s[2] == null ? 360 : s[2]) * D2R);
      case 'capsule': return new T.CapsuleGeometry(s[0], s[1], 6, 16);
      case 'plane': return new T.PlaneGeometry(s[0], s[1]);
      case 'ring': return new T.RingGeometry(s[0], s[1], 44);
      case 'tube': return new T.TubeGeometry(new T.CatmullRomCurve3(p.points.map((q) => new T.Vector3(q[0], q[1], q[2] || 0))), Math.max(12, p.points.length * 10), s[0], 10, false);
      case 'extrude': { const sh = new T.Shape(); p.points.forEach((q, i) => (i ? sh.lineTo(q[0], q[1]) : sh.moveTo(q[0], q[1]))); const r = p.radius || 0; const ge = new T.ExtrudeGeometry(sh, { depth: s[0], bevelEnabled: r > 0, bevelThickness: r, bevelSize: r, bevelSegments: 2 }); ge.translate(0, 0, -s[0] / 2); return ge; }
      case 'lathe': return new T.LatheGeometry(p.points.map((q) => new T.Vector2(Math.max(0.001, q[0]), q[1])), FACETS(p, 40));
      default: return null;
    }
  })();
  _gcache[key] = g; return g;
}
const DOUBLE = { plane: 1, ring: 1, lathe: 1, torus: 1 };
const isLit = (p) => p.role === 'glow' || p.role === 'screen' || (p.emissive || 0) > 0;
const isDyn = (p) => !!(p.states || p.keys || isLit(p) || (p.motion && p.motion.length) || p.opacity != null);

/* Canvas textures for platform tops and walls (seeded, tiny). */
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
const speckle = (g, w, h, a, n, seed) => { for (let i = 0; i < n; i++) { g.fillStyle = hs(i * 3 + seed) > 0.5 ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + a + ')'; g.fillRect(hs(i + seed) * w, hs(i * 7 + seed) * h, 2 + hs(i) * 3, 2 + hs(i * 5) * 3); } };
const TEX = {
  plain: (c, c2) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = c2; for (let i = 0; i < 5; i++) { g.fillRect(i * 64 - 1, 0, 3, h); g.fillRect(0, i * 64 - 1, w, 3); } speckle(g, w, h, 0.05, 160, 3); }, [4, 3]),
  checker: (c, c2) => canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? c : c2; g.fillRect(x * 32, y * 32, 32, 32); } speckle(g, w, h, 0.04, 100, 9); }, [2, 1.5]),
  tiles: (c, c2) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = c2; for (let i = 0; i <= 4; i++) { g.fillRect(i * 64 - 2, 0, 4, h); g.fillRect(0, i * 64 - 2, w, 4); } speckle(g, w, h, 0.04, 80, 11); }, [4, 2]),
  stripes: (c, c2) => canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? c : c2; g.fillRect(i * 16, 0, 16, h); } }, [3, 1]),
  grid: (c, c2) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.strokeStyle = c2; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); speckle(g, w, h, 0.05, 70, 13); }, [6, 4.5]),
};
const RB = (w, h, d, r, mat) => new T.Mesh(new T.RoundedBoxGeometry(w, h, d, 4, Math.min(r == null ? MAT.round : r, Math.min(w, h, d) / 2 - 0.001)), mat);
const solidMat = (hex, rough) => new T.MeshStandardMaterial({ color: hex, roughness: rough == null ? MAT.roughness : rough, metalness: 0, bumpMap: CLAY_BUMP, bumpScale: MAT.bump });
