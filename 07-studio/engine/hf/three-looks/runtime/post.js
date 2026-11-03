/* post.js: lights, environment and the post chain (bloom -> tilt-shift + vignette + grade -> tone mapping). */
'use strict';
const L = STYLE.light, P = STYLE.post;
const key = new T.DirectionalLight(L.key.color, L.key.intensity);
key.position.set(L.key.pos[0], L.key.pos[1], L.key.pos[2]); key.castShadow = true;
key.shadow.mapSize.set(L.shadow.size, L.shadow.size); key.shadow.bias = L.shadow.bias; key.shadow.radius = L.shadow.blurRadius; key.shadow.normalBias = 0.03;
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
const hemi = new T.HemisphereLight(L.fill.sky, L.fill.ground, L.fill.intensity);
const rim = new T.DirectionalLight(L.rim.color, L.rim.intensity); rim.position.set(L.rim.pos[0], L.rim.pos[1], L.rim.pos[2]);
scene.add(key, key.target, hemi, rim);
const MOODS = STYLE.moods;
const moodVals = (name) => { const m = MOODS[name] || MOODS.warm; return { bg: new T.Color(m.bg), key: new T.Color(m.keyColor || L.key.color), keyMul: m.keyMul, fillMul: m.fillMul, envMul: m.envMul }; };
const _bg = new T.Color(), _kc = new T.Color();
function applyMood(a, b, u) {
  const A = moodVals(a), B = moodVals(b), k = EZ.io(clamp(u));
  _bg.copy(A.bg).lerp(B.bg, k); scene.background = _bg; scene.fog = new T.Fog(_bg.getHex(), 30, 80);
  _kc.copy(A.key).lerp(B.key, k); key.color.copy(_kc);
  key.intensity = L.key.intensity * lerp(A.keyMul, B.keyMul, k); hemi.intensity = L.fill.intensity * lerp(A.fillMul, B.fillMul, k); scene.environmentIntensity = L.env * lerp(A.envMul, B.envMul, k);
}
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, res: { value: new T.Vector2(FW, FH) }, focus: { value: 0.63 }, band: { value: P.tilt.band }, blur: { value: P.tilt.blur }, vig: { value: P.vignette }, sat: { value: P.grade.sat }, warm: { value: P.grade.warm } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 res; uniform float focus, band, blur, vig, sat, warm; varying vec2 vUv;
  void main(){
    float d = abs(vUv.y - focus); float k = smoothstep(band * 0.5, band * 1.9, d);
    vec2 px = blur * k / res * 1.0; vec3 acc = texture2D(tDiffuse, vUv).rgb; float wsum = 1.0;
    for (int i = 0; i < 12; i++) { float a = float(i) * 2.399963; float r = sqrt((float(i) + 0.5) / 12.0) * 3.0; vec2 o = vec2(cos(a), sin(a)) * r * px; acc += texture2D(tDiffuse, vUv + o).rgb; wsum += 1.0; }
    vec3 c = acc / wsum;
    float l = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l), c, sat); c += vec3(warm, warm * 0.45, -warm * 0.6);
    vec2 q = vUv - 0.5; q.x *= 0.8; float v = smoothstep(0.35, 0.95, length(q) * 1.25); c *= 1.0 - vig * v;
    gl_FragColor = vec4(c, 1.0);
  }`,
};
/* Transition: a render-target crossfade. The incoming world is rendered into `tB`, the outgoing one is the normal frame, and this pass shows B through a
   moving mask (iris, slide, drop or pop) with a rim line at the edge: every transition frame still shows scene content, never a flat fill. */
const MixShader = {
  uniforms: { tDiffuse: { value: null }, tB: { value: null }, p: { value: 0 }, kind: { value: 0 }, rim: { value: new T.Color(STYLE.transition.color) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tB; uniform float p; uniform int kind; uniform vec3 rim; varying vec2 vUv;
  void main(){
    vec4 a = texture2D(tDiffuse, vUv);
    if (p <= 0.0) { gl_FragColor = a; return; }
    vec4 b = texture2D(tB, vUv);
    vec2 q = vec2((vUv.x - 0.5) * 0.5625, vUv.y - 0.5);
    float e;
    if (kind == 0) { e = length(q - vec2(0.0, 0.08)) - p * 1.05; }
    else if (kind == 1) { e = (vUv.x + (vUv.y - 0.5) * 0.18) - p * 1.25 + 0.12; }
    else if (kind == 2) { e = (1.0 - vUv.y) + sin(vUv.x * 9.0) * 0.025 - p * 1.1 + 0.05; }
    else { float ang = atan(q.y, q.x); e = length(q) / (1.0 + 0.07 * sin(ang * 7.0)) - p * 1.0; }
    float m = 1.0 - smoothstep(-0.008, 0.008, e);
    float edge = 1.0 - smoothstep(0.0, 0.03, abs(e));
    vec3 c = mix(a.rgb, b.rgb, m);
    c = mix(c, rim * 1.4, edge * 0.9 * step(0.02, p) * (1.0 - step(0.985, p)));
    gl_FragColor = vec4(c, 1.0);
  }`,
};
let composer = null, finishPass = null, mixPass = null, rtB = null;
function buildComposer() {
  const rt = new T.WebGLRenderTarget(FW, FH, { type: T.HalfFloatType, samples: 4 });
  rtB = new T.WebGLRenderTarget(FW, FH, { type: T.HalfFloatType, samples: 4 });
  composer = new T.EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(FW, FH);
  composer.addPass(new T.RenderPass(scene, cam));
  mixPass = new T.ShaderPass(MixShader); mixPass.uniforms.tB.value = rtB.texture; composer.addPass(mixPass);
  composer.addPass(new T.UnrealBloomPass(new T.Vector2(FW / 2, FH / 2), P.bloom.strength, P.bloom.radius, P.bloom.threshold));
  finishPass = new T.ShaderPass(FinishShader); composer.addPass(finishPass);
  composer.addPass(new T.OutputPass());
}
/* Procedural studio environment (no HDRI file): soft light boxes that give metal and glass something to reflect. */
function loadEnv() {
  const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; scene.environmentIntensity = L.env; pm.dispose();
}
