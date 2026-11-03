/* kit.js: clay materials, geometry helpers, model instancing and the decor (platform, walls, set dressing) of every setting. */
'use strict';
const PAL = { cream: '#f1e3cb', wood: '#c99a67', woodD: '#a97a4c', teal: '#6db3a8', coral: '#e9806e', sun: '#f2b45a', sky: '#8fb7e0', plum: '#9a7fb5', grey: '#bdb5aa', greyD: '#8d8a88', dark: '#4a4a58', darker: '#34343f', white: '#f7f1e6', red: '#e5574f', green: '#7fbf8a', metal: '#aab6c0', blue: '#5a86c9', pink: '#e9a0b4' };
const MAT = STYLE.material;

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
function clayMat(hex, o) {
  o = o || {};
  const key = hex + '|' + (o.rough || '') + '|' + (o.emissive || '') + '|' + (o.transparent || '');
  if (!o.unique && _mcache[key]) return _mcache[key];
  const m = new T.MeshStandardMaterial({ color: hex, roughness: o.rough == null ? MAT.roughness : o.rough, metalness: o.metal || 0, bumpMap: o.nobump ? null : CLAY_BUMP, bumpScale: MAT.bump });
  if (o.emissive) { m.emissive = new T.Color(o.emissive); m.emissiveIntensity = o.ei == null ? 1 : o.ei; }
  if (o.transparent) { m.transparent = true; m.opacity = o.opacity == null ? 0.5 : o.opacity; }
  if (!o.unique) _mcache[key] = m;
  return m;
}
/* A material that glows: unique per call so a prop can drive its emissive. */
const glowMat = (hex, glowHex, k) => { const m = clayMat(hex, { unique: true, emissive: '#000000', rough: 0.6 }); m.userData.glow = { color: new T.Color(glowHex || hex), k: k == null ? 1 : k }; return m; };
const RB = (w, h, d, r, mat) => new T.Mesh(new T.RoundedBoxGeometry(w, h, d, 4, Math.min(r == null ? MAT.round : r, Math.min(w, h, d) / 2 - 0.001)), mat);
const CY = (rt, rb, h, mat, seg) => new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 32), mat);
const SP = (r, mat) => new T.Mesh(new T.SphereGeometry(r, 28, 20), mat);
const TO = (R, r, mat, arc) => new T.Mesh(new T.TorusGeometry(R, r, 14, 40, arc == null ? TAU : arc), mat);
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
function grp(...kids) { const g = new T.Group(); kids.forEach((k) => k && g.add(k)); return g; }
function shadowAll(root, cast, recv) { root.traverse((m) => { if (m.isMesh) { m.castShadow = cast !== false; m.receiveShadow = recv !== false; } }); }

/* Clay-treats a loaded model instance: unique clay materials keeping the base colour/texture. */
function clayify(root, glowHex) {
  const tint = new T.Color(MAT.tintColor);
  root.traverse((m) => {
    if (!m.isMesh) return;
    const old = Array.isArray(m.material) ? m.material[0] : m.material;
    const col = old.color ? old.color.clone() : new T.Color('#dddddd');
    col.lerp(tint, MAT.tint);
    const nm = new T.MeshStandardMaterial({ color: col, map: old.map || null, roughness: MAT.roughness, metalness: 0, bumpMap: CLAY_BUMP, bumpScale: MAT.bump * 0.6, emissive: new T.Color('#000000') });
    if (old.map) nm.map.colorSpace = T.SRGBColorSpace;
    nm.userData.glow = { color: new T.Color(glowHex || '#ffd9a0'), k: 0.55 };
    if (old.vertexColors) nm.vertexColors = true;
    nm.side = T.DoubleSide; m.material = nm; m.castShadow = true; m.receiveShadow = true;
  });
}
/* Instance of a model, fitted to the catalog height (feet on y = 0, centred on x/z). */
async function instance(id, scale) {
  const def = CAT.MODELS[id], src = await loadModel(id);
  const o = def.rig === 'skinned' ? T.SkeletonUtils.clone(src.scene) : src.scene.clone(true);
  const root = new T.Group(); root.add(o);
  const pr = def.rig === 'skinned'; let b = boundsOf(o, pr); const h = b.max.y - b.min.y, s = (def.h * (scale || 1)) / h;
  o.scale.multiplyScalar(s); b = boundsOf(o, pr);
  o.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  return { root, inner: o, clips: src.animations, height: def.h * (scale || 1), box: b };
}

/* Canvas textures for platform tops and walls (seeded, tiny). */
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
const speckle = (g, w, h, a, n, seed) => { for (let i = 0; i < n; i++) { g.fillStyle = hs(i * 3 + seed) > 0.5 ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + a + ')'; g.fillRect(hs(i + seed) * w, hs(i * 7 + seed) * h, 2 + hs(i) * 3, 2 + hs(i * 5) * 3); } };
const TEX = {
  plain: (c) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); speckle(g, w, h, 0.05, 160, 3); }),
  checker: (c, c2) => canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? c : c2; g.fillRect(x * 32, y * 32, 32, 32); } speckle(g, w, h, 0.04, 100, 9); }, [2, 1.5]),
  tiles: (c, c2) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = c2; for (let i = 0; i <= 4; i++) { g.fillRect(i * 64 - 2, 0, 4, h); g.fillRect(0, i * 64 - 2, w, 4); } speckle(g, w, h, 0.04, 80, 11); }, [4, 2]),
  stripes: (c, c2) => canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? c : c2; g.fillRect(i * 16, 0, 16, h); } }, [3, 1]),
  grid: (c, c2) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.strokeStyle = c2; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); speckle(g, w, h, 0.05, 70, 13); }, [6, 4.5]),
};

/* ---- platform and decor per setting ---- */
const SLAB_W = 8.8, SLAB_D = 6.6;
function slab(w, h, d, hex, x, y, z, r) { const m = RB(w, h, d, r == null ? 0.1 : r, clayMat(hex)); return at(m, x, y, z); }
function texSlab(w, d, tex, x, y, z) { const m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return m; }
function platform(pal, floorTex) {
  const g = new T.Group();
  g.add(slab(SLAB_W, 0.6, SLAB_D, pal.platform, 0, -0.3, 0, 0.24));
  if (floorTex) g.add(texSlab(SLAB_W - 0.6, SLAB_D - 0.6, floorTex, 0, 0.004, 0));
  return g;
}
function wall(pal, tex, h) {
  const g = new T.Group(), w = RB(SLAB_W - 0.2, h || 4.4, 0.4, 0.18, tex ? new T.MeshStandardMaterial({ map: tex, roughness: 0.95 }) : clayMat(pal.wall));
  w.position.set(0, (h || 4.4) / 2, -SLAB_D / 2 + 0.25); g.add(w);
  g.add(slab(SLAB_W - 0.2, 0.28, 0.5, pal.accent, 0, 0.14, -SLAB_D / 2 + 0.3, 0.1)); // skirting
  return g;
}
async function inst(id, x, y, z, ry, sc) { const i = await instance(id, sc); clayify(i.root); i.root.position.set(x, y, z); i.root.rotation.y = ry || 0; return i.root; }

const DECOR = {
  async desk(pal) {
    const g = new T.Group();
    g.add(platform(pal, TEX.plain(pal.platform))); g.add(wall(pal, TEX.tiles('#f3e3c8', '#e8d3b0')));
    const win = grp(RB(2.0, 1.5, 0.12, 0.08, clayMat(PAL.white)), at(RB(1.7, 1.2, 0.08, 0.05, glowMat('#cfe8ff', '#cfe8ff', 0.9)), 0, 0, 0.05)); win.children[1].material.emissive = new T.Color('#9cc6f0'); win.children[1].material.emissiveIntensity = 0.55;
    win.add(at(RB(0.08, 1.2, 0.1, 0.03, clayMat(PAL.white)), 0, 0, 0.1), at(RB(1.7, 0.08, 0.1, 0.03, clayMat(PAL.white)), 0, 0, 0.1)); win.position.set(-1.8, 2.8, -2.6); g.add(win);
    g.add(slab(4.3, 0.18, 1.7, PAL.wood, 0, 0.94, -1.25, 0.07));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(CY(0.09, 0.11, 0.9, clayMat(PAL.woodD)), sx * 1.95, 0.45, -1.25 + sz * 0.7));
    g.add(slab(1.5, 0.06, 1.1, PAL.coral, 0.0, 0.03, 1.1, 0.03)); g.children[g.children.length - 1].geometry = new T.CylinderGeometry(1.5, 1.5, 0.06, 40);
    g.add(await inst('chair', -0.2, 0, -0.05, Math.PI * 0.12)); g.add(await inst('books', -1.0, 1.03, -1.9, 0.25)); g.add(await inst('plant', -3.4, 0, -1.8, 0)); g.add(await inst('mouse', 0.9, 1.03, -0.75, 0.3));
    return g;
  },
  async 'server-room'(pal) {
    const g = new T.Group();
    g.add(platform(pal, TEX.grid('#c9dae2', '#a3bccb'))); g.add(wall(pal, TEX.stripes('#d6e3ea', '#c8d8e1')));
    for (let i = 0; i < 3; i++) g.add(at(CY(0.09, 0.09, SLAB_W - 0.8, clayMat(PAL.grey)), 0, 2.2 + i * 0.35, -SLAB_D / 2 + 0.55)), g.children[g.children.length - 1].rotation.z = Math.PI / 2;
    for (const x of [-3.4, 3.4]) { const v = RB(0.9, 1.1, 0.1, 0.05, clayMat(PAL.greyD)); v.position.set(x, 3.3, -SLAB_D / 2 + 0.5); g.add(v); for (let k = 0; k < 4; k++) g.add(at(RB(0.7, 0.06, 0.06, 0.02, clayMat(PAL.dark)), x, 2.95 + k * 0.2, -SLAB_D / 2 + 0.56)); }
    for (const x of [-1.5, 1.5]) g.add(at(RB(0.06, 0.04, 5.6, 0.02, glowMat('#7fe0f0', '#7fe0f0', 0.9)), x, 0.03, 0.2));
    return g;
  },
  async street(pal) {
    const g = new T.Group();
    g.add(platform(pal, null));
    g.add(slab(SLAB_W - 0.5, 0.08, 2.9, '#555967', 0, 0.04, 1.55, 0.04)); g.add(slab(SLAB_W - 0.5, 0.16, 2.2, PAL.grey, 0, 0.08, -1.55, 0.06));
    for (let i = -3; i <= 3; i++) g.add(slab(0.6, 0.02, 0.1, PAL.white, i * 1.2, 0.1, 1.5, 0.01));
    g.add(slab(SLAB_W - 0.5, 0.2, 0.18, PAL.sun, 0, 0.1, 0.08, 0.05));
    g.add(await inst('building-a', -3.3, 0.16, -2.5, 0)); g.add(await inst('tower-a', -1.1, 0.16, -2.7, 0)); g.add(await inst('building-c', 1.2, 0.16, -2.5, 0)); g.add(await inst('tower-c', 3.3, 0.16, -2.7, 0));
    g.add(await inst('street-lamp', -2.2, 0.16, -0.5, 0)); g.add(await inst('street-lamp', 0.9, 0.16, -0.5, 0));
    return g;
  },
  async kitchen(pal) {
    const g = new T.Group();
    g.add(platform(pal, TEX.checker('#f7ecd8', '#ecc9a0'))); g.add(wall(pal, TEX.tiles('#faf0dc', '#e8d4b4')));
    g.add(slab(2.2, 1.0, 1.3, PAL.teal, -3.0, 0.5, -1.5, 0.08)); g.add(slab(2.4, 0.12, 1.4, PAL.white, -3.0, 1.0, -1.5, 0.05));
    g.add(slab(2.0, 1.0, 1.3, PAL.teal, 1.15, 0.5, -1.5, 0.08)); g.add(slab(2.2, 0.12, 1.4, PAL.white, 1.15, 1.0, -1.5, 0.05));
    g.add(await inst('shelf', -3.0, 2.2, -2.4, 0, 0.5)); g.add(await inst('plant', 3.5, 0, 1.6, 0, 0.8));
    return g;
  },
  async warehouse(pal) {
    const g = new T.Group();
    g.add(platform(pal, TEX.plain(pal.platform))); g.add(wall(pal, TEX.stripes('#e6dec8', '#d9cfb4')));
    for (const z of [-0.3, 2.2]) g.add(slab(SLAB_W - 1, 0.01, 0.14, PAL.sun, 0, 0.012, z, 0.005));
    for (const x of [-0.9, -1.9, 1.7, 2.55]) g.add(slab(1.15, 0.14, 1.15, PAL.woodD, x, 0.07, x < 0 ? (x === -0.9 ? 0.9 : 1.4) : 0.5, 0.05));
    g.add(await inst('barrel', -3.4, 0, 0.8, 0)); g.add(await inst('barrel', -3.5, 0, 1.9, 0.5, 0.8));
    return g;
  },
};
