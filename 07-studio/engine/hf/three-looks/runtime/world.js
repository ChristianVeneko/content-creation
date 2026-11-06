/* world.js: assembles a world from scratch (ground, rounded platform, textured floor, back wall, decor parts, objects, cast) and the anchor lookup. */
'use strict';
const decorEnt = (d) => ({ id: d.id, parts: d.parts, colors: d.colors || {}, init: {}, motion: [], keys: [], at: d.at, rot: d.rot || 0, scale: d.scale || 1, hidden: false, path: [], vis: [] });

async function buildWorld(w) {
  const g = new T.Group(), off = worldOffset(w.i), L = w.look, S = L.slab;
  g.position.set(0, 0, 0);
  // tabletop ground under the diorama (a slightly darker tone, fades into the fog)
  const gnd = RB(46, 1.2, 30, 0.5, solidMat(STYLE.ground.color, 0.95)); gnd.position.set(off[0], -1.2, 3); gnd.receiveShadow = true; g.add(gnd);
  const zc = (S.front + S.back) / 2, slab = RB(S.w, 0.6, S.d, 0.26, solidMat(L.pal.platform)); slab.position.set(off[0], -0.3, zc); slab.receiveShadow = true; g.add(slab);
  const fl = new T.Mesh(new T.PlaneGeometry(S.w - 0.6, S.d - 0.6), new T.MeshStandardMaterial({ map: TEX[L.floor.tex](L.floor.c1, L.floor.c2), roughness: 0.95, metalness: 0 }));
  fl.rotation.x = -Math.PI / 2; fl.position.set(off[0], 0.004, zc); fl.receiveShadow = true; g.add(fl);
  if (L.wall) {
    const wl = RB(S.w - 0.2, L.wall.h, 0.4, 0.18, new T.MeshStandardMaterial({ map: TEX[L.wall.tex](L.wall.c1, L.wall.c2), roughness: 0.95 }));
    wl.position.set(off[0], L.wall.h / 2, S.back + 0.25); wl.castShadow = true; wl.receiveShadow = true; g.add(wl);
    const sk = RB(S.w - 0.2, 0.28, 0.5, 0.1, solidMat(L.pal.accent)); sk.position.set(off[0], 0.14, S.back + 0.3); g.add(sk);
  }
  // decor (static, built once)
  for (const d of w.decor) { const o = await buildObject(decorEnt(d)); o.wi = w.i; for (const k of Object.keys(o.ev)) o.ev[k] = buildTrack([], o.init[k]); o.burstMeshes = []; evalObject(o, 0); if (o.blob) o.blob.visible = false; g.add(o.root); }
  const objects = {};
  for (const e of w.objects) { const o = await buildObject(e); wireObjectBeats(o, w.i); objects[e.id] = o; g.add(o.root); }
  scene.add(g);
  const rt = { w, g, objects };
  return rt;
}
