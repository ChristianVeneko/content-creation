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
let composer = null, finishPass = null;
function buildComposer() {
  const rt = new T.WebGLRenderTarget(FW, FH, { type: T.HalfFloatType, samples: 4 });
  composer = new T.EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(FW, FH);
  composer.addPass(new T.RenderPass(scene, cam));
  composer.addPass(new T.UnrealBloomPass(new T.Vector2(FW / 2, FH / 2), P.bloom.strength, P.bloom.radius, P.bloom.threshold));
  finishPass = new T.ShaderPass(FinishShader); composer.addPass(finishPass);
  composer.addPass(new T.OutputPass());
}
async function loadEnv() {
  const tex = await new T.RGBELoader().loadAsync(ASSET.hdri); tex.mapping = T.EquirectangularReflectionMapping;
  const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(tex).texture; scene.environmentIntensity = L.env; pm.dispose();
}
