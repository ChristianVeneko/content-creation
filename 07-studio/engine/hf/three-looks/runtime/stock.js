/* stock.js (only with `stock: true`): static GLB models, clay-treated. No skeletal clips. The default composition never loads this file. */
'use strict';
const GLTF = new T.GLTFLoader(), STOCK_CACHE = {};
const loadStock = (id) => (STOCK_CACHE[id] = STOCK_CACHE[id] || new Promise((res, rej) => GLTF.load(STOCK[id].url, res, undefined, (e) => rej(new Error('stock model ' + id + ': ' + (e && e.message || e))))));
async function buildStockObject(ent) {
  const src = await loadStock(ent.stock), inner = src.scene.clone(true), root = new T.Group(), body = new T.Group(); body.add(inner); root.add(body);
  let b = boundsOf(inner, false); const k = (STOCK[ent.stock].h) / Math.max(0.01, b.max.y - b.min.y); inner.scale.multiplyScalar(k); b = boundsOf(inner, false);
  inner.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  const tint = new T.Color(MAT.tintColor);
  inner.traverse((m) => { if (!m.isMesh) return; const old = Array.isArray(m.material) ? m.material[0] : m.material, col = old.color ? old.color.clone() : new T.Color('#dddddd'); col.lerp(tint, MAT.tint); const nm = new T.MeshStandardMaterial({ color: col, map: old.map || null, roughness: MAT.roughness, metalness: 0, bumpMap: CLAY_BUMP, bumpScale: MAT.bump * 0.6 }); if (old.map) nm.map.colorSpace = T.SRGBColorSpace; nm.userData = { base: col.clone(), em: 0, op: 1 }; m.material = nm; m.castShadow = true; m.receiveShadow = true; });
  const o = { ent, root, body, recs: {}, order: [], top: [], seed: hs(ent.at[0] * 3.1 + ent.at[2]) * 20, wi: 0, heatObj: false, tr: [], spins: [], bursts: [], labels: [], hasSpinPart: false, ev: { vis: [], grow: [], glow: [], fill: [], open: [], heat: [], explode: [] } };
  o.init = { vis: ent.hidden ? 0 : 1, grow: 1, glow: 0.7, fill: 0, open: 0, heat: 0, explode: 0 };
  o.top = (b.max.y - b.min.y) * ent.scale; o.width = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
  body.scale.setScalar(ent.scale); o.centre = [0, 0.5, 0]; o.top_ = [];
  return o;
}
