// stage.js: the 3D stage for story videos. Real low-poly sets with real lights and shadows (three.js),
// flat 2D stickmen on camera-facing planes, bloom plus one lens shader, recorded physics, and the 2D overlay.
// Everything is a pure function of time: the film page calls stage.draw(t) from window.seek(t).
import * as THREE from './vendor/three.module.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from './vendor/addons/postprocessing/ShaderPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import * as CANNON from './vendor/cannon-es.js';
export { THREE, CANNON };
export const W = 1080, H = 1920;

// ---------- small helpers ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const spring = x => x <= 0 ? 0 : 1 - Math.exp(-7 * x) * Math.cos(11 * x);
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---------- the lens: vignette, grain, fisheye, colour fringing (all keyed to t) ----------
const LensShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 0.45 }, grain: { value: 0.045 }, fisheye: { value: 0 }, fringe: { value: 0.0025 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, vignette, grain, fisheye, fringe; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + floor(time * 24.0) * 1.618) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; vec2 a = c * vec2(1.0, 1.778);
      float r2 = dot(a, a);
      vec2 uv = 0.5 + c * (1.0 - fisheye * 0.55 + fisheye * 1.4 * r2);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
      vec2 d = (uv - 0.5) * fringe * (1.0 + 3.0 * fisheye);
      vec3 col = vec3(texture2D(tDiffuse, uv + d).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - d).b);
      col *= mix(1.0 - vignette, 1.0, smoothstep(0.95, 0.2, length(a) / 1.1));
      if (fisheye > 0.0) col *= smoothstep(0.5, 0.46, length(c * vec2(1.0, 1.778)) * (0.45 + 0.55 * (1.0 - fisheye)) + 0.0);
      col += (rnd(vUv * 900.0) - 0.5) * grain;
      gl_FragColor = vec4(col, 1.0);
    }`
};

// ---------- the stage ----------
export function createStage(canvas2d) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, W / H, 0.05, 300);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.55, 0.5, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const lens = new ShaderPass(LensShader); composer.addPass(lens);
  const ctx = canvas2d.getContext('2d');
  const sets = {};
  return {
    THREE, renderer, scene, camera, composer, bloom, lens, ctx, sets,
    // show only one set (a THREE.Group) at a time
    use(name) { for (const k in sets) sets[k].visible = k === name; },
    // aim the camera: pos and target are [x, y, z]; fov in degrees (indoors use 60-75: a narrow lens sees very little)
    aim(pos, target, fov = 62) { camera.position.set(...pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(new THREE.Vector3(...target)); },
    draw(t, { fisheye = 0, vignette = 0.45, bloomStrength = 0.55 } = {}) {
      lens.uniforms.time.value = t; lens.uniforms.fisheye.value = fisheye; lens.uniforms.vignette.value = vignette; bloom.strength = bloomStrength;
      scene.traverse(o => { if (o.userData.billboard && o.visible) o.userData.billboard(camera); });
      composer.render();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      ctx.drawImage(renderer.domElement, 0, 0, W, H);
    }
  };
}

// ---------- low-poly set pieces ----------
const matCache = {};
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, flatShading: true, emissive: o.emissive || '#000000', emissiveIntensity: o.glow ?? 1 });
  return matCache[key];
}
export function box(w, h, d, color, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, o));
  m.position.set(x, y + h / 2, z); m.castShadow = o.cast ?? true; m.receiveShadow = true; return m;
}
// a wall in the XY plane (facing +z) with real rectangular holes [{x, y, w, h}] (doors, windows): a frame around a real hole
export function wallWithHoles(width, height, holes, color, thick = 0.12) {
  const s = new THREE.Shape(); s.moveTo(-width / 2, 0); s.lineTo(width / 2, 0); s.lineTo(width / 2, height); s.lineTo(-width / 2, height); s.closePath();
  for (const h of holes) { const p = new THREE.Path(); p.moveTo(h.x - h.w / 2, h.y); p.lineTo(h.x + h.w / 2, h.y); p.lineTo(h.x + h.w / 2, h.y + h.h); p.lineTo(h.x - h.w / 2, h.y + h.h); p.closePath(); s.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false }); g.translate(0, 0, -thick / 2);
  const m = new THREE.Mesh(g, mat(color)); m.castShadow = true; m.receiveShadow = true; return m;
}
// a room: floor, back wall (with holes), left and right walls, optional ceiling; returns a Group, back wall at z = -d/2
export function room({ w = 5, d = 5, h = 2.7, wall = '#8a8378', floor = '#5a4636', ceiling = '#6b665e', holes = [], ceil = true } = {}) {
  const g = new THREE.Group();
  const fl = box(w, 0.05, d, floor, 0, -0.05, 0); fl.castShadow = false; g.add(fl);
  const back = wallWithHoles(w, h, holes, wall); back.position.z = -d / 2; g.add(back);
  const l = box(0.12, h, d, wall, -w / 2, 0, 0); const r = box(0.12, h, d, wall, w / 2, 0, 0); g.add(l, r);
  if (ceil) { const c = box(w, 0.05, d, ceiling, 0, h, 0); c.castShadow = false; g.add(c); }
  return g;
}
// a door in a frame; pivot on its hinge side; set door.userData.open(angle)
export function door({ w = 0.9, h = 2.05, color = '#4a3326', frame = '#2b2522' } = {}) {
  const g = new THREE.Group();
  g.add(box(0.08, h + 0.08, 0.16, frame, -w / 2 - 0.04, 0, 0), box(0.08, h + 0.08, 0.16, frame, w / 2 + 0.04, 0, 0), box(w + 0.16, 0.08, 0.16, frame, 0, h, 0));
  const hinge = new THREE.Group(); hinge.position.set(-w / 2, 0, 0); g.add(hinge);
  const leaf = box(w, h, 0.05, color, w / 2, 0, 0); hinge.add(leaf);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat('#c9a35a', { metal: 0.6, rough: 0.4 })); knob.position.set(w - 0.1, 1.0, 0.05); hinge.add(knob);
  g.userData.open = a => { hinge.rotation.y = -a; };
  g.userData.leaf = leaf; return g;
}
// a warm practical lamp (a glowing bulb plus a shadow-casting point light)
export function practical(color = '#ffb46b', intensity = 6, distance = 9) {
  const g = new THREE.Group();
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color })); g.add(bulb);
  const L = new THREE.PointLight(color, intensity, distance, 1.6); L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.002; g.add(L);
  g.userData.light = L; g.userData.bulb = bulb; return g;
}
// a cold fill so night shots don't go black after compression, and one strong accent (door gap, screen, siren)
export function coldFill(scene, color = '#5d7bb3', intensity = 0.55) {
  const hemi = new THREE.HemisphereLight(color, '#1b1a22', intensity); scene.add(hemi);
  const dir = new THREE.DirectionalLight(color, intensity * 0.8); dir.position.set(-4, 6, 5); scene.add(dir); return { hemi, dir };
}
export function accent(color = '#ff3b30', intensity = 18, angle = 0.5) {
  const s = new THREE.SpotLight(color, intensity, 14, angle, 0.5, 1.4); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.002; return s;
}
// a tower block exterior: a box with a grid of window panels, some lit (a seeded pattern)
export function tower({ floors = 12, cols = 5, w = 7, d = 6, floorH = 3, color = '#3b3f4a', lit = '#ffd08a', dark = '#0e1117', seed = 7, litShare = 0.35 } = {}) {
  const g = new THREE.Group(); const R = rng(seed);
  g.add(box(w, floors * floorH, d, color, 0, 0, 0));
  const win = [];
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
    const on = R() < litShare;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w / cols * 0.55, floorH * 0.45), on ? new THREE.MeshBasicMaterial({ color: lit }) : mat(dark));
    p.position.set(-w / 2 + (c + 0.5) * w / cols, f * floorH + floorH * 0.55, d / 2 + 0.01); g.add(p); win.push({ mesh: p, floor: f + 1, col: c, on });
  }
  g.userData.windows = win; return g;
}

// ---------- the 2D stickman on a camera-facing plane ----------
// Bones in canvas pixels; a pose is joint angles in radians (0 = straight down for limbs, 0 = upright for the torso).
const BONES = { torso: 230, neck: 30, head: 58, upper: 135, fore: 125, thigh: 170, shin: 165 };
export function ik2(hip, foot, l1, l2, bend = 1) {             // 2-bone IK: the knee for a hip and a planted foot
  const dx = foot[0] - hip[0], dy = foot[1] - hip[1]; let d = Math.hypot(dx, dy); d = Math.min(d, l1 + l2 - 0.01);
  const a = Math.atan2(dy, dx), b = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  return [hip[0] + l1 * Math.cos(a - bend * b), hip[1] + l1 * Math.sin(a - bend * b)];
}
export class Stickman {
  // o: {height (m), body, outline, mark: {type: 'cap'|'scarf'|'band', color}, glow}
  constructor(o = {}) {
    this.o = Object.assign({ height: 1.75, body: '#f1ede4', outline: '#15171c', mark: null, glow: 0.18, eyes: true }, o);
    this.cv = document.createElement('canvas'); this.cv.width = 512; this.cv.height = 1024;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.PlaneGeometry(this.o.height * 0.5, this.o.height); g.translate(0, this.o.height / 2, 0);
    this.mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: this.tex, emissiveIntensity: this.o.glow, roughness: 1 }));
    this.mesh.castShadow = true;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5 });
    this.mesh.userData.billboard = cam => { const p = new THREE.Vector3(); cam.getWorldPosition(p); this.mesh.rotation.y = Math.atan2(p.x - this.mesh.position.x, p.z - this.mesh.position.z); };
    this.pose({});
  }
  // p: {facing: 1 right / -1 left / 0 front, lean, headTilt, armL: [shoulder, elbow], armR, legL: [hip, knee], legR, feet: [[x,y],[x,y]] (IK, canvas px), mood: 'scared'}
  pose(p) {
    const c = this.cv.getContext('2d'), o = this.o, s = 1;
    c.clearRect(0, 0, 512, 1024);
    const hipY = 1024 - BONES.thigh - BONES.shin - 14, hip = [256, hipY];
    const lean = p.lean || 0, f = p.facing ?? 1;
    const neck = [hip[0] + Math.sin(lean) * BONES.torso, hip[1] - Math.cos(lean) * BONES.torso];
    const head = [neck[0] + Math.sin(lean + (p.headTilt || 0)) * (BONES.neck + BONES.head), neck[1] - Math.cos(lean + (p.headTilt || 0)) * (BONES.neck + BONES.head)];
    const limb = (root, a1, a2, l1, l2) => { const j = [root[0] + Math.sin(a1) * l1, root[1] + Math.cos(a1) * l1]; return [j, [j[0] + Math.sin(a1 + a2) * l2, j[1] + Math.cos(a1 + a2) * l2]]; };
    const sh = [neck[0] + Math.sin(lean) * -24, neck[1] + Math.cos(lean) * 24];
    const aL = p.armL || [0.25, -0.2], aR = p.armR || [-0.25, 0.2];
    const legL = p.legL || [0.12, -0.05], legR = p.legR || [-0.12, 0.05];
    const AL = limb(sh, aL[0] + lean, aL[1], BONES.upper, BONES.fore), AR = limb(sh, aR[0] + lean, aR[1], BONES.upper, BONES.fore);
    let LL, LR;
    if (p.feet) { const k1 = ik2(hip, p.feet[0], BONES.thigh, BONES.shin, -f || -1), k2 = ik2(hip, p.feet[1], BONES.thigh, BONES.shin, -f || -1); LL = [k1, p.feet[0]]; LR = [k2, p.feet[1]]; }
    else { LL = limb(hip, legL[0], legL[1], BONES.thigh, BONES.shin); LR = limb(hip, legR[0], legR[1], BONES.thigh, BONES.shin); }
    const stroke = (pts, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(...pts[0]); for (const q of pts.slice(1)) c.lineTo(...q); c.stroke(); };
    const parts = [[hip, neck], [sh, ...AL], [sh, ...AR], [hip, ...LL], [hip, ...LR]];
    for (const P of parts) stroke(P, 44, o.outline);                       // thick dark outline
    c.fillStyle = o.outline; c.beginPath(); c.arc(head[0], head[1], BONES.head + 11, 0, 7); c.fill();
    for (const P of parts) stroke(P, 24, o.body);                          // light body
    c.fillStyle = o.body; c.beginPath(); c.arc(head[0], head[1], BONES.head, 0, 7); c.fill();
    if (o.mark) {                                                           // one mark so the hero reads in every shot
      c.fillStyle = o.mark.color;
      if (o.mark.type === 'cap') { c.beginPath(); c.arc(head[0], head[1] - 6, BONES.head + 4, Math.PI, 0); c.fill(); c.fillRect(head[0] + (f >= 0 ? 0 : -BONES.head - 30), head[1] - 12, BONES.head + 30, 14); }
      else if (o.mark.type === 'scarf') { stroke([[neck[0] - 30, neck[1] + 10], [neck[0] + 30, neck[1] + 10]], 26, o.mark.color); stroke([[neck[0] + 10 * f, neck[1] + 10], [neck[0] + 26 * f, neck[1] + 80]], 18, o.mark.color); }
      else if (o.mark.type === 'band') { stroke([[head[0] - BONES.head, head[1] - 18], [head[0] + BONES.head, head[1] - 18]], 16, o.mark.color); }
      else { stroke([hip, neck], 24, o.mark.color); }
    }
    if (o.eyes) {                                                           // dot eyes, no mouth
      c.fillStyle = o.outline; const ex = head[0] + (f === 0 ? 0 : f * 18), ey = head[1] - 6, r = p.mood === 'scared' ? 9 : 7;
      if (f === 0) { c.beginPath(); c.arc(ex - 18, ey, r, 0, 7); c.arc(ex + 18, ey, r, 0, 7); c.fill(); } else { c.beginPath(); c.arc(ex + f * 12, ey, r, 0, 7); c.fill(); }
    }
    this.tex.needsUpdate = true; return this;
  }
  // a walk with planted feet: x0 world start, speed m/s; returns the world x to place the mesh, and poses the legs by IK
  walk(t, { speed = 0.9, stride = 0.55, facing = 1 } = {}) {
    const px = 512 / (this.o.height * 0.5);                                 // canvas px per metre
    const x = speed * t, ph = x / stride;                                   // step phase
    const foot = (k) => { const s = Math.floor(ph + k * 0.5), u = ph + k * 0.5 - s;   // u: 0..1 within this foot's cycle
      const stance = u < 0.5, plant = (s + 0.5) * stride - k * 0.5 * stride;
      const fx = stance ? plant : lerp(plant, plant + stride, ease((u - 0.5) * 2));
      const lift = stance ? 0 : Math.sin((u - 0.5) * 2 * Math.PI) * 40;
      return [256 + (fx - x) * px * facing, 1010 - lift]; };
    this.pose({ facing, feet: [foot(0), foot(1)], armL: [0.35 * Math.sin(ph * Math.PI), -0.3], armR: [-0.35 * Math.sin(ph * Math.PI), 0.3], lean: 0.05 * facing });
    return x * facing;
  }
}

// ---------- physics: simulate once at load, sample by time ----------
export function recordPhysics(build, duration, dt = 1 / 120) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  const bodies = build(world, CANNON); const frames = [];
  for (let t = 0; t <= duration + dt; t += dt) { frames.push(bodies.map(b => [b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w])); world.step(dt); }
  return t => frames[Math.min(frames.length - 1, Math.max(0, Math.round(t / dt)))];
}
export function applyPhysics(meshes, state) { meshes.forEach((m, i) => { const s = state[i]; m.position.set(s[0], s[1], s[2]); m.quaternion.set(s[3], s[4], s[5], s[6]); }); }

// ---------- the 2D overlay ----------
export const FONTS = ['700 70px Oswald', '700 40px "JetBrains Mono"', '700 120px Oswald'];
export async function loadFonts() { for (const f of FONTS) await document.fonts.load(f); }
function txt(c, s, x, y, font, fill, o = {}) {
  c.font = font; c.textAlign = o.align || 'center'; c.textBaseline = 'middle';
  if (o.stroke) { c.lineJoin = 'round'; c.lineWidth = o.stroke; c.strokeStyle = o.strokeColor || '#0b0c0f'; c.strokeText(s, x, y); }
  c.fillStyle = fill; c.fillText(s, x, y);
}
// the HUD, top-left, monospace: DAY n and a clock
export function hud(c, day, clock, k = 1) {
  c.save(); c.globalAlpha = k; c.fillStyle = 'rgba(8,9,12,0.62)'; c.beginPath(); c.roundRect(40, 120, 330, 108, 18); c.fill();
  txt(c, 'DAY ' + day, 70, 152, '700 34px "JetBrains Mono"', '#f3eee4', { align: 'left' });
  txt(c, clock, 70, 198, '700 40px "JetBrains Mono"', '#ff5a4f', { align: 'left' }); c.restore();
}
// captions: 1-3 words, chunky, the key word in an accent colour; words = [{w, key}] drawn centred at y
export function caption(c, words, y = 1310, accent = '#ffcc4d') {
  c.save(); c.font = '700 74px Oswald'; const parts = words.map(w => ({ ...w, s: w.w.toUpperCase() }));
  const sp = 22, widths = parts.map(p => c.measureText(p.s).width), total = widths.reduce((a, b) => a + b, 0) + sp * (parts.length - 1);
  let x = 540 - total / 2;
  parts.forEach((p, i) => { txt(c, p.s, x + widths[i] / 2, y, '700 74px Oswald', p.key ? (p.color || accent) : '#ffffff', { stroke: 12 }); x += widths[i] + sp; });
  c.restore();
}
// the rule sticker: tilted, a red tab "RULE #n" and a big condensed title; k = 0..1 pop
export function ruleSticker(c, n, title, k, y = 520) {
  if (k <= 0) return; c.save(); c.translate(540, y); c.rotate(-0.06); c.scale(0.6 + 0.4 * clamp(k, 0, 1.2), 0.6 + 0.4 * clamp(k, 0, 1.2));
  c.fillStyle = '#f4f0e6'; c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 30; c.beginPath(); c.roundRect(-400, -120, 800, 250, 22); c.fill(); c.shadowBlur = 0;
  c.fillStyle = '#d93b30'; c.beginPath(); c.roundRect(-400, -120, 260, 70, [22, 0, 22, 0]); c.fill();
  txt(c, 'RULE #' + n, -270, -84, '700 44px Oswald', '#ffffff');
  const lines = Array.isArray(title) ? title : [title];
  lines.forEach((s, i) => txt(c, s.toUpperCase(), 0, 0 + i * 80 - (lines.length - 1) * 30 + 10, '700 72px Oswald', '#14161b'));
  c.restore();
}
// the end card: a question and two options, green and red, then COMMENT BELOW and FOLLOW FOR DAY n
export function endCard(c, t0, t, q, optA, optB, nextDay) {
  const k = clamp(spring(t - t0), 0, 1.15);
  c.save(); c.fillStyle = 'rgba(6,7,10,0.86)'; c.fillRect(0, 0, W, H);
  c.translate(540, 900); c.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k); c.translate(-540, -900);
  (Array.isArray(q) ? q : [q]).forEach((s, i) => txt(c, s.toUpperCase(), 540, 560 + i * 110, '700 104px Oswald', '#ffffff', { stroke: 10 }));
  const opt = (s, y, col) => { c.fillStyle = col; c.beginPath(); c.roundRect(170, y - 70, 740, 140, 30); c.fill(); txt(c, s.toUpperCase(), 540, y, '700 64px Oswald', '#ffffff'); };
  opt(optA, 900, '#2e9e57'); opt(optB, 1080, '#c8372d');
  txt(c, 'COMMENT BELOW', 540, 1250, '700 56px Oswald', '#ffffff'); txt(c, 'FOLLOW FOR DAY ' + nextDay, 540, 1330, '700 46px Oswald', '#ffcc4d');
  c.restore();
}
// a phone held in POV: a 2D screen with two stick thumbs; draw(c, x, y, w, h) fills the screen
export function phone(c, draw, k = 1) {
  c.save(); c.globalAlpha = k; const x = 260, y = 520, w = 560, h = 1060;
  c.fillStyle = '#0d0e12'; c.beginPath(); c.roundRect(x - 22, y - 22, w + 44, h + 44, 60); c.fill();
  c.save(); c.beginPath(); c.roundRect(x, y, w, h, 44); c.clip(); draw(c, x, y, w, h); c.restore();
  c.strokeStyle = '#15171c'; c.lineWidth = 44; c.lineCap = 'round'; c.beginPath(); c.moveTo(180, 1900); c.lineTo(300, 1500); c.moveTo(900, 1900); c.lineTo(780, 1520); c.stroke();
  c.strokeStyle = '#f1ede4'; c.lineWidth = 24; c.stroke(); c.restore();
}

// ---------- caption chunks, by meaning ----------
// Builds the caption chunks from TIMING (window.TIMING from voice.py): at most 3 words, broken at punctuation and before a
// phrase starts, never ending on a function word ("of", "the", "your"...). A time ("2:14 AM") or a number with its unit
// ("150 liters") stays together. Set window.CHUNKS to the result: render.py refuses a full render if a chunk ends badly.
// keyColor: {red: '#ff4b3e', ...}; each line's `key` ({word: 'red'}) colours that word.
export const FUNCTION_WORDS = new Set("a an the to of at for from with by into onto under about after before until behind through and or but nor so if as than that this these those is are was were be been it its it's i i'm you you're they're he she we they me him her us them my your his our their who which what when where while because".split(' '));
export const PARTICLES = new Set('in on up off out down back away over'.split(' '));
export function chunkCaptions(T, keyColor = { red: '#ff5a4f', yellow: '#ffcc4d', amber: '#ffcc4d', green: '#4fe08a', blue: '#5ab4ff' }) {
  const bare = s => String(s).toLowerCase().replace(/[^a-z0-9':]/g, '');
  const DET = new Set("a an the my your his her their our its this that these those every each some no one two three".split(' '));
  const isF = u => u.f;                                           // marked below: function words, and "in/on/up..." that start a phrase
  const out = [];
  T.lines.forEach((L, li) => {
    if (L.nocap) return;
    const keys = {}; for (const k in (L.key || {})) keys[bare(k)] = L.key[k];
    const raw = L.text.trim().split(/\s+/), same = raw.length === L.words.length, units = [];
    L.words.forEach((x, i) => {
      const brk = /[.,;!:?]$/.test(same ? raw[i] : x.w), d = String(x.w).replace(/[.,;!:?]+$/, ''), k = keys[bare(d)];
      const wd = { w: d, s: x.s, e: x.e, key: !!k, color: k ? (keyColor[k] || k) : undefined }, prev = units[units.length - 1];
      const glue = prev && prev.ws.length === 1 && ((/^(AM|PM)$/i.test(d) && /\d:\d\d$/.test(prev.ws[0].w)) ||
        (/^(liters?|litres?|days?|minutes?|hours?|seconds?|floors?|meters?|metres?|km|miles?|percent|%)$/i.test(d) && /^\d+([.,]\d+)?$/.test(prev.ws[0].w)));
      if (glue) { prev.ws.push(wd); prev.brk = brk; } else units.push({ ws: [wd], brk });
    });
    units.forEach((u, i) => { const b = bare(u.ws[0].w), nx = units[i + 1];
      u.f = u.ws.length === 1 && (FUNCTION_WORDS.has(b) || (PARTICLES.has(b) && !u.brk && !!nx && (DET.has(bare(nx.ws[0].w)) || /^\d/.test(nx.ws[0].w)))); });
    const segs = [[]]; for (const u of units) { segs[segs.length - 1].push(u); if (u.brk) segs.push([]); }
    for (const sg of segs) {
      let cur = [], n = 0;
      for (const u of sg) {
        if (n && n + u.ws.length > 3) {                          // break before the last phrase start, else after a content word
          let j = -1;
          if (!(isF(u) && !isF(cur[cur.length - 1]))) for (let k = cur.length - 1; k >= 1; k--) if (isF(cur[k]) && !isF(cur[k - 1])) { j = k; break; }
          if (j > 0) { out.push({ li, words: cur.slice(0, j).flatMap(x => x.ws) }); cur = cur.slice(j); }
          else if (!isF(cur[cur.length - 1])) { out.push({ li, words: cur.flatMap(x => x.ws) }); cur = []; }
          n = cur.reduce((a, x) => a + x.ws.length, 0);
        }
        cur.push(u); n += u.ws.length;
      }
      if (cur.length) out.push({ li, words: cur.flatMap(x => x.ws) });
    }
  });
  for (let i = out.length - 1; i > 0; i--) {                     // a lone particle ("snowed / in") joins the words before it
    const a = out[i - 1], b = out[i];
    if (b.words.length === 1 && PARTICLES.has(bare(b.words[0].w)) && a.li === b.li) { a.words.push(b.words[0]); out.splice(i, 1); }
  }
  out.forEach((c, i) => { c.s = c.words[0].s - 0.04; const nx = out[i + 1]; c.e = nx && nx.li === c.li ? nx.words[0].s - 0.04 : Math.min(T.lines[c.li].end + 0.3, nx ? nx.words[0].s - 0.06 : 1e9); });
  return out;
}
// draw the chunk for time t (call it last, on top of everything)
export function drawCaptions(c, chunks, t, y = 1310) { const ch = chunks.find(x => t >= x.s && t < x.e); if (ch) caption(c, ch.words, y); }
