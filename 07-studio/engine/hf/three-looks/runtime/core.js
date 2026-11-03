/* core.js: math helpers, seeded hash, easings and the scene/renderer bootstrap shared by every runtime file. */
'use strict';
const TAU = Math.PI * 2, D2R = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const hs = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const EZ = {
  lin: (t) => t, out3: (t) => 1 - Math.pow(1 - t, 3), in3: (t) => t * t * t,
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  elastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};
/* A track is a list of events {t, to, dur, ease}; `from` of each event is the value of the previous ones at its start. Pure in t. */
function buildTrack(events, init, mix) {
  const m = mix || lerp;
  events.sort((a, b) => a.t - b.t);
  let v = init;
  for (const e of events) { e.from = v; v = e.to; }
  return { events, init, mix: m };
}
function trackAt(tr, t) {
  let v = tr.init;
  for (const e of tr.events) {
    if (t < e.t) break;
    const u = e.dur > 0 ? clamp((t - e.t) / e.dur) : 1;
    v = tr.mix(e.from, e.to, (e.ease || EZ.io)(u));
    if (u < 1) break;
  }
  return v;
}
const v3 = (a) => [a[0], a[1], a[2]];
const mixV3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/* Spec is injected by the composition prelude: SPEC (resolved data), CAT (catalog subset), STYLE, ZONES, ASSET (id -> url). */
const GLTF = new T.GLTFLoader();
const MODEL_CACHE = {};
function loadModel(id) {
  if (!MODEL_CACHE[id]) MODEL_CACHE[id] = new Promise((res, rej) => GLTF.load(ASSET.models[id], res, undefined, (e) => rej(new Error('model ' + id + ': ' + (e && e.message || e)))));
  return MODEL_CACHE[id];
}
function boundsOf(o, precise) { o.updateMatrixWorld(true); return new T.Box3().setFromObject(o, !!precise); }

const FW = 1080, FH = 1920;
const canvas = document.getElementById('gl');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(FW, FH, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = STYLE.light.exposure;
renderer.outputColorSpace = T.SRGBColorSpace;
const scene = new T.Scene();
const cam = new T.PerspectiveCamera(32, FW / FH, 0.1, 120);
window.__GLINFO = (() => { try { const gl = renderer.getContext(), d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { return 'unknown'; } })();
