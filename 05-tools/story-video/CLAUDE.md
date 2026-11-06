# STORY VIDEO STUDIO (v7: 3D sets, 2D stickmen)

You are my animation studio. You make a second-person survival thriller with stickmen, for Reels, Shorts and TikTok:
- 60 to 90 seconds, vertical 1080x1920, a new shot every 1.5 to 3 s;
- real 3D low-poly sets with real lights and shadows (three.js);
- flat 2D stickmen;
- a narrator, captions, sound effects, a dark music bed, and an ending people argue about in the comments.

Everything is built in code on this computer. There are no AI images and no AI video.

**What I need:** a Claude subscription (Claude Code is included with Pro and Max). Nothing else: no other accounts, API keys or paid tools. Everything below is free and you install it yourself. Ask me before anything paid.

**This file is the whole system.** Follow it exactly. Its examples (a tower block, water, a cat) only show the level of detail. Make it MY story: never copy an example's setting, names or lines.

## 0. Setup (you do all of it)

1. **Save this file.** If it isn't saved as `CLAUDE.md` in this folder yet, save it there word for word.
2. **Python 3.10+.** On Windows the command is `python`. If it's missing, install it:
   - Windows: `winget install -e --id Python.Python.3.12`
   - macOS: `brew install python`
   - Linux: the package manager
3. **Packages.** Run `python -m pip install playwright kokoro-onnx soundfile faster-whisper edge-tts numpy pillow imageio-ffmpeg`. If Google Chrome isn't installed, also run `python -m playwright install chromium`.
4. **Engine files.** Write the six files in section 9 into `engine/`, exactly as given.
5. **Vendor files.** Run `python engine/fetch_vendor.py`. It downloads three.js and cannon-es locally (about 2 MB) so renders never depend on the internet.
6. **First-run downloads.** On their first run:
   - `voice.py` downloads the Kokoro voice model (about 350 MB) and a speech-timing model (about 145 MB);
   - `sound.py` downloads the sound effects it uses from Mixkit.

   All of it is free with no account, and each file downloads once.

## 1. Inputs (the start gate)

Ask me in one message, with your defaults filled in:
- **The video idea:** one line is fine. Default: pitch 10 premises (section 3) and recommend the best.
- **The setting.** Rotate between episodes: apartment, subway, school at night, hospital, cabin, plane, office, motel. Fit the threat to the setting.
- **The length:** 60 to 90 s. Default 70.
- **The narrator.** "free" means Kokoro `am_michael`, the default.
  - ElevenLabs only if I already have a paid key and say so. It's never required.

**Then, before building anything, show me:**
1. the beat sheet and the full script;
2. after the shots are built, 6 stills of the key shots.

Only then render the full video. If I answer "you pick" at a gate, choose and keep going.

## 2. Format

- **The hook:** "Imagine you..." with a time stamp, in the first 3 s. The camera starts close on you and pulls out to show where you are.
- **Frame 0 shows you AND the threat** (or its light under the door), with the first caption already on screen. A face alone reads as an empty circle at feed size.
- **The HUD:** DAY n and a clock that moves forward through the episode, monospace, top-left.
- **3 to 4 RULES,** each a short command on a tilted sticker, and each paid off on screen later.
- **A threat that escalates,** mostly shown, not told.
- **A twist that makes one rule impossible to keep.**
- **A two-choice ending** ("DO YOU OPEN IT?") with a green option and a red option, where both look bad. Then "COMMENT BELOW" and "FOLLOW FOR DAY 2".
- **Size:** 20 to 30 voice lines and a new shot every 1.5 to 3 s. The length can be 60 to 90 s, but 60 to 75 s works best; cut filler before going past 75.

## 3. Story

**Pitch 10 premises and keep 1.**
- Each one names:
  - you, with a want, a fear and a flaw;
  - an everyday place with a number;
  - what's about to go wrong;
  - the hidden twist.
- Score each from 1 to 5 on five things:
  - "what would I do?";
  - a ticking clock;
  - a secret;
  - an everyday place made deadly;
  - a hero worth fearing for.
- Keep the top total, and save the table in `story.md`.

**Write the beat sheet, then the script, and show both.**
- One line is one visual. Rules are short commands.
- Open a new question every 10 s or so, and answer it only with a bigger one.
- Put the viewer in POV for the scary parts: through a door gap, a window, a phone, a peephole.

**The story checklist.** Print it as a table (the line number and the line), and rewrite until every row is filled:
1. **The cold open is a moment at a clock time,** never a setup.
2. **A real dilemma:** helping costs water, trust or safety, and both sides are voiced.
3. **A reversal 30 to 70% through:** what we believed flips.
4. **The rules and one fact with a number,** each paid off on screen. Use only facts you're sure of. A rule's catch goes in the post caption.
5. **A cost** that stays lost.
6. **False relief** just before the end.
7. **The last line is an image or a line of dialogue.**
8. **The choice splits viewers about 50/50,** and both options cost something.
9. **No filler:** every line raises the stakes, reveals something, or makes a choice.
10. **The 12-year-old test:** every choice makes sense with no explanation.

**Write numbers twice.** In `lines.json`, `text` is the caption form ("11:58 PM") and `say` is the spoken form ("eleven fifty-eight P M"). `voice.py` speaks `say` and puts the times on the `text` words.

## 4. Look

**Palette:** one per story, with the light doing the mood. Every set gets:
- one warm practical (`practical()`);
- one cold fill (`coldFill()`), so night shots don't go black after compression;
- one strong accent (`accent()`): a door gap, a screen or a siren.

**Sets:** real 3D low-poly, made from `stage.js` pieces:
- `room()` with real holes for doors and windows;
- `door()`, `box()`, `tower()`, `wallWithHoles()`.

Build every set once at load as a `THREE.Group` in `stage.sets`, and switch between them with `stage.use(name)`.

**The stickman** (`new Stickman({mark})`) is flat and 2D-looking:
- a light body with a thick dark outline, round strokes, dot eyes and no mouth;
- the main character gets one mark (`cap`, `scarf`, `band` or a colour) so doubles and callbacks read;
- pose with joint angles (`pose({lean, armL: [shoulder, elbow], legL: [hip, knee], facing})`);
- walk with `walk(t, {speed})`, whose 2-bone IK keeps the planted foot still;
- each figure is a plane that faces the camera and casts a real shadow.

**Animals and props** are drawn the same way: 2D canvas strokes on a plane that faces the camera, the same model in every shot.

**The overlay**, drawn on the 2D canvas after `stage.draw(t)`:
- `hud(c, day, clock)`;
- `chunkCaptions(TIMING)` builds the caption chunks by meaning: 1 to 3 chunky words, broken at punctuation and before a phrase starts, never ending on a function word (of, the, your, to...), with a time ("2:14 AM") or a number and its unit ("150 liters") kept together. Set `window.CHUNKS` to the result and draw it last with `drawCaptions(c, CHUNKS, t)`. `render.py` refuses a full render if a chunk ends on a function word.
- `ruleSticker(c, n, lines, k)`;
- `phone(c, draw)`: phone screens are drawn in 2D;
- `endCard(c, t0, t, question, greenOption, redOption, nextDay)`.

**Banned:** AI frames, glossy 3D characters, emojis, music with vocals, captions longer than 3 words.

## 5. Shots (a library to adapt; never use all of them)

**Opening and outside:**
- **The opener:** tight on you, pulling out to show where you are.
- **Outside chaos from above** (balcony, bridge, window): physics vehicles or debris from `recordPhysics()`, a running crowd, something falling or burning.

**In the room:**
- **Third-person action:** walking with planted feet, reaching, hesitating, barricading.
- **POV interaction:** throwing, holding a torch, opening something.
- **Knocks, shakes and things falling.**

**Close and POV:**
- **A POV phone in your hands:** a 2D phone UI with two stick thumbs.
- **A macro** on the one detail that matters.
- **A close-up of your face** for the reaction.
- **A low angle on a door or vent:** light leaking in, shadows moving.
- **A fisheye peephole, camera or window view** of the threat stepping closer: `stage.draw(t, {fisheye: 1})`.

**The ending:** the choice screen and the end card.

## 6. Build

1. **Write `part1/lines.json`.** It has 20 to 30 lines: `text`, optional `say`, `pause` (the silence after the line), `key` (the accent word) and `voice` (for a character).
   ```json
   {"voice": "am_michael", "speed": 1.1, "lines": [
     {"text": "Imagine it's 11:58 PM, and the power dies.", "say": "Imagine it's eleven fifty-eight P M, and the power dies.", "key": {"dies": "red"}},
     {"text": "Open up, I'm not bitten.", "voice": "bm_george"}]}
   ```
   - The narrator is `am_michael`.
   - Characters: `bm_george`, `af_bella`, `bf_emma`, `am_puck`, `am_fenrir`. Keep them clearly different from the narrator.
2. **Voice.** Run `python engine/voice.py part1`. It voices each line, times every word with faster-whisper, and maps the times onto the caption words.
   - It warns if a caption word has no voice under it within 120 ms.
   - If the length is outside 58 to 85 s, cut or add lines.
3. **Write `part1/film.html`.**
   - The structure:
     - an import map for `three`;
     - Oswald and JetBrains Mono from Google Fonts;
     - `<canvas id="film" width="1080" height="1920">`;
     - `timing.js`;
     - one module script that imports `../engine/stage.js`, builds every set at load, then sets `window.TOTAL` = `TIMING.voice_end` + 3.5, `window.seek = t => {...}` and, after `await loadFonts()`, `window.READY = true`.
   - `seek(t)` must be a pure function of time.
     - Find the shot for `t` from a shot table keyed to word times (`w(line, "word")`).
     - Set the visible set, the stickmen's poses and positions, and the camera (`stage.aim(pos, target, fov)`).
     - Call `stage.draw(t, {fisheye})`, then draw the overlay.
   - The HUD clock moves forward on the story's clock times.
   - The end card takes the last 3.5 s, after the voice.
   - Captions: `const CHUNKS = chunkCaptions(TIMING); window.CHUNKS = CHUNKS;`. Read the printed chunks once: every chunk must read as a phrase on its own.
4. **Six stills.** Run `python engine/render.py part1/film.html part1/stills --at <6 times>` on the key shots and show them to me.
   - Check each one:
     - is the subject close to the aim point;
     - is there light on every figure;
     - are the set's light and shadow readable;
     - is there text over text;
     - does any counter fail to show its spoken number.
   - Fix, then re-check.
5. **Check motion at the full frame rate before the full render.** Render 2 s around each cut (`--at` with 30 times a second) and look at them in order.
6. **Sound.** Write `part1/sfx.json`, with one sound per event, keyed to words: `{"at": "knocks@12", "type": "knock"}`.
   - Mixkit types:
     - doors: knock, slam, creak, floorcreak, lock;
     - impacts: thud, hit, boom;
     - movement and tension: whoosh, heartbeat, swell;
     - the animal: meow, catangry;
     - other: glass.
   - Made in code: tick, click, hiss, growl, sting, rumble, drip, alarm.
   - Add a dip before the big moment with `"bed"` level cues.
   - Run `python engine/sound.py part1 <TOTAL>`. It mixes:
     - the voice on top;
     - a dark music bed 13 dB under it, made in code, ducking under every line;
     - a looped Mixkit room tone;
     - the effects.
   - It brings the result to -14 LUFS and scans for dropouts.
7. **Render and encode.**
   - `python engine/render.py part1/film.html part1/frames`. Add `--gpu` if the graphics card is free.
   - Software rendering is slow (about 0.5 to 1 frame a second for a full 3D scene). To speed it up, run 3 ranges side by side in 3 terminals (`--from 0 --to 800`, `--from 800 --to 1600`, `--from 1600`). Use the same `--from N` to resume a render that stopped.
   - Then `python engine/encode.py part1`. It writes:
     - `part1.mp4`, the phone copy under 10 MB;
     - `part1_master.mp4`;
     - `sheet.jpg`;
     - a pacing check.
   - Fix any PACING WARNING or STOP and encode again.
8. **The cover.** Run `python engine/render.py "part1/film.html#cover" part1/cover`. In cover mode `seek` draws the strongest picture, a red pill with the story title, and a 2-line title of 2 to 4 words in the top third.
9. **The post kit.** Write `part1/post.md`: the title, a caption (what happened, the rules, the fact, "comment A or B"), 5 hashtags and a pinned comment.
10. **Clean up.** Delete `frames/`, `vo/` and `stills/`. Deliver `part1.mp4`, `cover.jpg` and `post.md`.

**Part 2,** only when I ask, with the vote result:
- Answer the vote in the first 8 s.
- Keep every set, stickman and number.
- The rules carry over; add one.
- End on a new choice.

## 7. Gotchas

- **Field of view:** a normal lens sees very little sideways. Indoors use 60 to 75 degrees, and keep the subject close to the aim point.
- **Glass behind a solid frame is invisible.** Build windows and mirrors as a frame around a real hole (`wallWithHoles`).
- **Dust spread everywhere reads as stars.** Keep it inside light beams.
- **Night shots go black after compression.** Every set gets a cold fill.
- **Fog swallows distant things.** Keep fog far for exteriors.
- **Never judge from one frame every few seconds.** Check motion at the full frame rate around every cut.
- **Check with numbers before every full render:** the cuts, the captions (`voice.py`'s 120 ms check and `render.py`'s chunk check) and the audio joints (`sound.py`'s dropout scan).
- **Captions read by meaning:** "never open / the door / after dark", not "never open the / door after / dark".
- **Counters must land.** Every counter (a value, a clock, a percentage) reaches its final value no later than the word that says it, and stays on screen at least 0.5 s after. A card that fades mid-count shows a wrong number.
- **Never use `ctx.filter` blur** on the 2D canvas: it crashes long renders.
- **Keep `seek(t)` pure:** no `Date.now()`, no unseeded random, no animation loops. Physics is recorded once with `recordPhysics` and sampled by time.

## 8. The rater (optional, recommended)

If you have the AI animation rater from the same guide (`rate_prep.py` and `RATER_PROMPT.md`), run it on `part1.mp4`. It should come out GOOD, with no point under 7. If it doesn't, fix the top 3 fixes it names.

## 9. Engine files (save each exactly as written)

### engine/fetch_vendor.py
```python
"""fetch_vendor.py: download three.js 0.160.0 (the module file plus the post-processing passes) and cannon-es 0.20.0
into engine/vendor/, once, so renders never depend on the internet. Run: python engine/fetch_vendor.py"""
import os, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); V = os.path.join(HERE, "vendor")
T = "https://cdn.jsdelivr.net/npm/three@0.160.0/"
FILES = {"three.module.js": T + "build/three.module.js", "cannon-es.js": "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js"}
for f in ["EffectComposer", "RenderPass", "ShaderPass", "UnrealBloomPass", "OutputPass", "MaskPass", "Pass"]:
    FILES[f"addons/postprocessing/{f}.js"] = T + f"examples/jsm/postprocessing/{f}.js"
for f in ["CopyShader", "LuminosityHighPassShader", "OutputShader"]:
    FILES[f"addons/shaders/{f}.js"] = T + f"examples/jsm/shaders/{f}.js"
for rel, url in FILES.items():
    p = os.path.join(V, rel)
    if os.path.exists(p) and os.path.getsize(p) > 0: continue
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "wb").write(urllib.request.urlopen(url, timeout=60).read()); print("downloaded", rel)
print("vendor ready:", V)
```

### engine/stage.js
```js
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
```

### engine/render.py
```python
"""render.py: film page -> numbered JPEG frames, with Playwright driving Chrome.
The page defines window.READY (true once fonts, sets and physics are built), window.TOTAL (seconds),
window.seek(t) (draws frame t as a pure function of time) and a 1080x1920 canvas with id "film".
  python engine/render.py part1/film.html part1/frames            every frame at 30 fps (f00000.jpg ...)
  python engine/render.py part1/film.html part1/stills --at 0,3.5  only these moments (at_0.00.jpg ...)
  python engine/render.py "part1/film.html#cover" part1/cover      the page's cover mode, one still
  options: --fps 30 --quality 90 --from N --to M (a frame range: resume a stopped render, or run 3 ranges side by side)
           --gpu (use the graphics card) --cpu (software WebGL, the default: slower but works everywhere)
The project folder is served over http://127.0.0.1 (ES modules don't load from file://).
needs: pip install playwright, then Chrome, or: python -m playwright install chromium"""
import base64, functools, http.server, os, sys, threading, time
from playwright.sync_api import sync_playwright

def main():
    a = sys.argv[1:]
    if len(a) < 2: sys.exit(__doc__)
    page_arg, out = a[0], a[1]
    opt = lambda k, d: type(d)(a[a.index(k) + 1]) if k in a else d
    fps, q = opt("--fps", 30), opt("--quality", 90)
    page_path, _, frag = page_arg.partition("#")
    at = [float(x) for x in a[a.index("--at") + 1].split(",")] if "--at" in a else ([0.0] if frag else None)
    page_path = os.path.abspath(page_path)
    root = os.path.dirname(page_path)                                   # serve the folder that holds engine/
    while not os.path.isdir(os.path.join(root, "engine")) and os.path.dirname(root) != root: root = os.path.dirname(root)
    rel = os.path.relpath(page_path, root).replace("\\", "/")
    handler = functools.partial(type("Q", (http.server.SimpleHTTPRequestHandler,), {"log_message": lambda *x: None}), directory=root)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{srv.server_address[1]}/{rel}" + ("#" + frag if frag else "")
    args = ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] if "--gpu" in a else ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        try: browser = p.chromium.launch(channel="chrome", headless=True, args=args)
        except Exception: browser = p.chromium.launch(headless=True, args=args)
        page = browser.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
        errors = []; page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(url)
        try: page.wait_for_function("window.READY === true", timeout=180000)
        except Exception: sys.exit("the page never set window.READY = true. Page errors: " + " | ".join(errors[:3]))
        total = page.evaluate("window.TOTAL")
        chunks = page.evaluate("(window.CHUNKS || []).map(c => (c.words || []).map(w => String(w.w || w)))")
        FUNC = set("a an the to of at for from with by into onto under about after before until behind through and or but nor so if as than that this these those is are was were be been it its it's i i'm you you're they're he she we they me him her us them my your his our their who which what when where while because".split())
        PART = set("in on up off out down back away over".split())    # a verb's particle may end a chunk ("snowed in"), never alone
        bad = [" ".join(c) for c in chunks if c and (c[-1].lower().strip(".,!?;:\"'") in FUNC or (len(c) == 1 and c[0].lower() in PART))]
        if not chunks: print("CAPTION CHECK: the page has no window.CHUNKS, so the caption chunks can't be checked")
        elif bad and at is None and "--force" not in a: sys.exit("CAPTION CHUNK FAIL (a caption ends on a function word; chunk by meaning): " + " | ".join(bad[:10]))
        else: print(f"caption chunks: {len(chunks)}, {len(bad)} ending on a function word")
        n_all = int(round(total * fps))
        k0, k1 = opt("--from", 0), opt("--to", n_all)              # a frame range: resume a stopped render, or split one across processes
        times = at if at is not None else [k / fps for k in range(k0, min(k1, n_all))]
        print(f"page ready, TOTAL = {total:.2f} s, {len(times)} images", flush=True)
        t0 = time.time()
        for k, t in enumerate(times):
            data = page.evaluate("([t, q]) => { window.seek(t); return document.getElementById('film').toDataURL('image/jpeg', q); }", [t, q / 100])
            name = f"at_{t:.2f}.jpg" if at is not None else f"f{k + k0:05d}.jpg"
            with open(os.path.join(out, name), "wb") as f: f.write(base64.b64decode(data.split(",", 1)[1]))
            if at is None and k % 150 == 0: print(f"frame {k}/{len(times)}  {time.time() - t0:.0f} s", flush=True)
        if errors: print("PAGE ERRORS:", " | ".join(errors[:5]))
        browser.close()
    srv.shutdown()
    print(f"done: {len(times)} images in {out} ({time.time() - t0:.0f} s)")

if __name__ == "__main__":
    main()
```

### engine/voice.py
```python
"""voice.py PART_DIR : lines.json -> narration.wav + timing.js (the time of every word, for captions and animation)
Each line has "text" (the caption form: "11:58 PM") and optionally "say" (the spoken form: "eleven fifty-eight P M").
Main voice: Kokoro-82M, a free open model that runs on this computer's CPU. Word times come from faster-whisper, also local.
If Kokoro can't run, it falls back by itself to edge-tts (a free online voice), then to the computer's own voice
(Windows SAPI, macOS say, Linux espeak-ng). Force one with "engine": "kokoro" | "edge" | "offline" in lines.json.
needs: pip install kokoro-onnx soundfile faster-whisper edge-tts imageio-ffmpeg numpy  (models download on the first run)"""
import asyncio, difflib, json, os, platform, re, shutil, subprocess, sys, tempfile, urllib.request, wave
import numpy as np
SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__)); MODELS = os.path.join(HERE, "models")
KOKORO_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"

def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
FF = ffmpeg()
part = sys.argv[1]
spec = json.load(open(os.path.join(part, "lines.json"), encoding="utf-8"))
VOICE, SPEED = spec.get("voice", "am_michael"), float(spec.get("speed", 1.1))
engine = os.environ.get("VOICE_ENGINE", spec.get("engine", "kokoro"))
os.makedirs(os.path.join(part, "vo"), exist_ok=True); os.makedirs(MODELS, exist_ok=True)

def decode(path):
    return subprocess.run([FF, "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout

_k = _w = None
def kokoro():
    global _k
    if _k is None:
        from kokoro_onnx import Kokoro
        for n in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
            p = os.path.join(MODELS, n)
            if not os.path.exists(p):
                print("downloading", n, "(once)"); urllib.request.urlretrieve(KOKORO_URL + n, p + ".part"); os.replace(p + ".part", p)
        _k = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
    return _k

def whisper():
    global _w
    if _w is None:
        from faster_whisper import WhisperModel, download_model
        d = os.path.join(MODELS, "whisper-base.en")
        if not os.path.exists(os.path.join(d, "model.bin")): print("downloading the timing model (once)"); download_model("base.en", output_dir=d)
        _w = WhisperModel(d, device="cpu", compute_type="int8")
    return _w

def norm(w): return re.sub(r"[^a-z0-9]", "", w.lower())
def clean(w): return w.strip(".,!?;\"()[]").rstrip(".")

def estimate(text, raw):
    """word times in proportion to word length, inside the voiced part of the line"""
    x = np.abs(np.frombuffer(raw, np.int16).astype(np.float32)); loud = np.where(x > 600)[0]
    a, b = (loud[0] / SR, loud[-1] / SR) if len(loud) else (0, len(x) / SR)
    ws = text.split(); k = [len(w) + 2 for w in ws]; tot = sum(k); out, t = [], a
    for w, n in zip(ws, k):
        d = (b - a) * n / tot; out.append((clean(w), t, d * 0.9)); t += d
    return out

def align(text, raw):
    """word times from faster-whisper, matched back to the script's own words"""
    try:
        audio = np.frombuffer(raw, np.int16).astype(np.float32)[::3] / 32768      # 48 kHz -> 16 kHz
        segs, _ = whisper().transcribe(audio, language="en", word_timestamps=True, beam_size=1, initial_prompt=text)
        heard = [(w.word, w.start, w.end) for s in segs for w in s.words]
    except Exception as e:
        print("word timing fell back to an estimate:", e); return estimate(text, raw)
    sw = text.split(); times = [None] * len(sw)
    sm = difflib.SequenceMatcher(a=[norm(w) for w in sw], b=[norm(h[0]) for h in heard], autojunk=False)
    for a, b, n in sm.get_matching_blocks():
        for j in range(n): times[a + j] = (heard[b + j][1], heard[b + j][2])
    if not any(times): return estimate(text, raw)
    end = len(raw) / 2 / SR
    i = 0
    while i < len(sw):                                   # words whisper didn't match: share the gap by length
        if times[i] is None:
            j = i
            while j < len(sw) and times[j] is None: j += 1
            t0 = times[i - 1][1] if i > 0 else max(0.0, (times[j][0] if j < len(sw) else end) - 0.3 * (j - i))
            t1 = times[j][0] if j < len(sw) else min(end, t0 + 0.35 * (j - i))
            k = [len(w) + 2 for w in sw[i:j]]; tot = sum(k); t = t0
            for m, n in zip(range(i, j), k):
                d = (t1 - t0) * n / tot; times[m] = (t, t + d); t += d
            i = j
        else: i += 1
    return [(clean(w), s, max(0.05, e - s)) for w, (s, e) in zip(sw, times)]

async def edge(text, voice, path):
    import edge_tts
    if re.match(r"^[ab][fm]_", voice): voice = "en-US-AvaNeural" if voice[1] == "f" else "en-US-AndrewNeural"
    for attempt in range(3):
        try:
            words, audio = [], bytearray()
            async for ch in edge_tts.Communicate(text, voice, rate="+5%", boundary="WordBoundary").stream():
                if ch["type"] == "audio": audio += ch["data"]
                elif ch["type"] == "WordBoundary": words.append((ch["text"], ch["offset"] / 1e7, ch["duration"] / 1e7))
            if not audio or not words: raise RuntimeError("empty answer")
            open(path, "wb").write(audio); return words
        except Exception as e:
            print("edge-tts retry", attempt + 1, e); await asyncio.sleep(2 + attempt * 2)
    raise RuntimeError("edge-tts is not answering")

def offline(text, path):
    tmp = tempfile.mkdtemp(); txt = os.path.join(tmp, "line.txt"); open(txt, "w", encoding="utf-8").write(text)
    if platform.system() == "Windows":
        ps = ("Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 1; "
              f"$s.SetOutputToWaveFile('{path}'); $s.Speak([IO.File]::ReadAllText('{txt}')); $s.Dispose()")
        subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True)
    elif platform.system() == "Darwin": subprocess.run(["say", "-f", txt, "-o", path, "--data-format=LEI16@22050"], check=True)
    else: subprocess.run(["espeak-ng", "-f", txt, "-w", path], check=True)

async def speak(i, line):
    """one line -> (pcm at 48 kHz, word boundaries relative to that pcm)"""
    text, path = line.get("say", line["text"]).strip(), os.path.join(part, "vo", f"line{i:02d}")
    if engine == "kokoro":
        import soundfile as sf
        a, sr = kokoro().create(text, voice=line.get("voice", VOICE), speed=float(line.get("speed", SPEED)), lang="en-us")
        sf.write(path + ".wav", a, sr); raw = decode(path + ".wav"); return raw, align(text, raw)
    if engine == "edge":
        bounds = await edge(text, line.get("voice", VOICE), path + ".mp3"); return decode(path + ".mp3"), bounds
    offline(text, path + ".wav"); raw = decode(path + ".wav"); return raw, align(text, raw)

async def main():
    global engine
    order = {"kokoro": ["kokoro", "edge", "offline"], "edge": ["edge", "offline"], "offline": ["offline"]}[engine]
    for engine in order:
        try:
            lead = spec.get("lead", 0.15)
            pcm, cursor, out = bytearray(b"\0\0" * int(lead * SR)), lead, []
            for i, line in enumerate(spec["lines"]):
                raw, bounds = await speak(i, line)
                text = line["text"].strip()
                a = max(0.0, bounds[0][1] - 0.06)                             # trim the silence around each line
                b = min(len(raw) / 2 / SR, bounds[-1][1] + bounds[-1][2] + 0.15)
                raw = raw[int(a * SR) * 2:int(b * SR) * 2]; dur = len(raw) / 2 / SR
                if "say" in line:                                               # map the heard spoken words back onto the caption words
                    cw, sw = line["text"].split(), line["say"].split()
                    sb = bounds if len(bounds) == len(sw) else [(w, bounds[min(len(bounds) - 1, int(j * len(bounds) / len(sw)))][1], 0.2) for j, w in enumerate(sw)]
                    nb = []
                    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(a=[norm(w) for w in cw], b=[norm(w) for w in sw], autojunk=False).get_opcodes():
                        if op == "equal":
                            nb += [(clean(cw[i1 + k]), sb[j1 + k][1], sb[j1 + k][2]) for k in range(i2 - i1)]
                        elif i2 > i1:
                            js, je = (j1, j2) if j2 > j1 else (max(0, j1 - 1), j1)
                            st_, en_ = sb[js][1], sb[je - 1][1] + sb[je - 1][2]
                            for k in range(i2 - i1):
                                a_ = st_ + (en_ - st_) * k / (i2 - i1); nb.append((clean(cw[i1 + k]), a_, (en_ - st_) / (i2 - i1)))
                    bounds = nb
                words = []
                for btext, off, d in bounds:                                  # one boundary can hold several words
                    ws = btext.split() or [btext]
                    for j, w in enumerate(ws):
                        s = off - a + d * j / len(ws); e = off - a + d * (j + 1) / len(ws)
                        words.append({"w": w, "s": round(cursor + s, 3), "e": round(cursor + e, 3)})
                extra = {k: v for k, v in line.items() if k not in ("text", "pause", "speed")}
                out.append({"i": i, "text": text, "start": round(cursor, 3), "end": round(cursor + dur, 3), "words": words, **extra})
                pcm += raw; gap = float(line.get("pause", 0.25))
                pcm += b"\0\0" * int(gap * SR); cursor += dur + gap
                print(f"line {i:2d}  {cursor:6.2f} s  {len(words):2d} words  {text[:60]}")
            break
        except Exception as e:
            print(f"voice '{engine}' failed ({e}); trying the next one")
    else:
        sys.exit("no voice worked")
    with wave.open(os.path.join(part, "narration.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(pcm))
    open(os.path.join(part, "timing.js"), "w", encoding="utf-8").write(
        "window.TIMING = " + json.dumps({"voice_end": round(cursor, 3), "engine": engine, "lines": out}) + ";\n")
    x = np.frombuffer(bytes(pcm), np.int16).astype(np.float32) / 32768        # every caption word must have voice under it
    bad = [w["w"] for l in out for w in l["words"] if np.sqrt(np.mean(x[max(0, int((w["s"] - 0.12) * SR)):int((w["s"] + 0.12) * SR)] ** 2)) < 0.004]
    print("caption check: OK" if not bad else f"CAPTION WARNING: no voice within 120 ms of: {', '.join(bad[:8])}")
    n = sum(len(l["words"]) for l in out)
    print(f"narration {cursor:.2f} s, {n} words, {n / cursor * 60:.0f} words per minute, voice: {engine}")

asyncio.run(main())
```

### engine/sound.py
```python
"""sound.py PART_DIR TOTAL_SECONDS : narration.wav + timing.js + sfx.json -> mix.wav (-14 LUFS, all sound synthesized)
sfx.json = {"bed": [{"at": 0, "level": 0.6}, {"at": "knocks@14", "level": 1.0}],
            "sfx": [{"at": "knocks@14", "type": "knock", "vol": 0.8}, {"at": 31.2, "type": "hit"}],
            "music": "on"}   (or "off", or {"level": -13}: dB under the voice while it speaks; 12 to 14 is right)
The music is a dark bed made here: a low drone, a slow minor-key pad, a soft pulse that quickens near the end,
and low booms on every "hit" sound. It ducks under each line, swells a little in the gaps and with the "bed" cues.
"at" is seconds, or "word@line" (first time that word is spoken in that 0-based line), optionally "+0.2" / "-0.1".
types from Mixkit (free sound effects, downloaded once into engine/sfx/, Mixkit Sound Effects Free License):
  knock slam thud creak floorcreak lock heartbeat hit boom whoosh meow catangry glass swell
types made in code (tiny UI sounds, and the offline fallback for every type): tick click hiss growl sting rumble drip alarm
needs: pip install numpy imageio-ffmpeg"""
import json, os, re, shutil, subprocess, sys, wave
import numpy as np
def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
FF = ffmpeg()
SR = 48000
part, TOTAL = sys.argv[1], float(sys.argv[2])
N = int(TOTAL * SR)
rng = np.random.default_rng(7)
timing = json.loads(re.sub(r"^\s*window\.TIMING\s*=\s*|;\s*$", "", open(os.path.join(part, "timing.js"), encoding="utf-8").read().strip()))
spec = json.load(open(os.path.join(part, "sfx.json"), encoding="utf-8")) if os.path.exists(os.path.join(part, "sfx.json")) else {}

def when(at):
    if isinstance(at, (int, float)): return float(at)
    m = re.match(r"^\s*([^@+]+)@(\d+)\s*([+-]\s*[\d.]+)?\s*$", str(at))
    if not m: return float(at)
    word, li, off = m.group(1).strip().lower(), int(m.group(2)), float((m.group(3) or "0").replace(" ", ""))
    for w in timing["lines"][li]["words"]:
        if re.sub(r"[^\w']", "", w["w"].lower()) == re.sub(r"[^\w']", "", word): return w["s"] + off
    sys.exit(f'sfx.json: "{word}" is not spoken in line {li}: {timing["lines"][li]["text"]}')

def band(x, lo, hi):
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    f[(fr < lo) | (fr > hi)] = 0
    return np.fft.irfft(f, len(x))

def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

def tone(f, n, f_end=None):
    t = np.arange(n) / SR
    fr = f if f_end is None else f * (f_end / f) ** (t / t[-1])
    return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(fr, t.shape)) / SR)

def noise(n): return rng.standard_normal(n)

HERE = os.path.dirname(os.path.abspath(__file__))
MIXKIT = {"knock": (1523, 1.4), "slam": (201, 1.9), "thud": (2589, 1.5), "creak": (110, 2.5), "floorcreak": (109, 2.0), "lock": (337, 1.1),
          "heartbeat": (493, 1.6), "hit": (2908, 3.0), "boom": (2182, 0.5), "whoosh": (1491, 1.2), "meow": (94, 0.6), "catangry": (95, 1.6),
          "glass": (2826, 2.0), "swell": (686, 6.0), "roomtone": (1046, 49.0)}
def mixkit(kind):
    """a Mixkit sound effect as a 48 kHz mono array, downloaded once; None if it can't be fetched"""
    sid, maxlen = MIXKIT[kind]
    d = os.path.join(HERE, "sfx"); os.makedirs(d, exist_ok=True)
    wav = os.path.join(d, f"{kind}_{sid}.wav")
    if not os.path.exists(wav):
        try:
            import urllib.request
            mp3 = wav[:-4] + ".mp3"
            req = urllib.request.Request(f"https://assets.mixkit.co/active_storage/sfx/{sid}/{sid}-preview.mp3", headers={"User-Agent": "Mozilla/5.0"})
            open(mp3, "wb").write(urllib.request.urlopen(req, timeout=30).read())
            subprocess.run([FF, "-y", "-loglevel", "error", "-i", mp3, "-ac", "1", "-ar", str(SR), wav], check=True); os.remove(mp3)
        except Exception as e:
            print(f"Mixkit '{kind}' not available ({e}); using the code-made version"); return None
    with wave.open(wav) as w: x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
    x = x[:int(maxlen * SR)]
    if len(x) > SR // 10: x[-SR // 20:] *= np.linspace(1, 0, SR // 20)
    return x
FALLBACK = {"slam": "thud", "floorcreak": "creak", "lock": "click", "boom": "hit", "meow": "hiss", "catangry": "hiss", "swell": "rumble"}
def make(kind):
    if kind in MIXKIT and kind != "roomtone":
        x = mixkit(kind)
        if x is not None: return x
        kind = FALLBACK.get(kind, kind)
    return synth(kind)

def synth(kind):
    L = lambda s: int(s * SR)
    if kind == "knock":
        one = 0.9 * tone(120, L(0.25), 80) * env(L(0.25), 0.001, 0.05) + 0.5 * band(noise(L(0.25)), 300, 2500) * env(L(0.25), 0.0005, 0.015)
        out = np.zeros(L(1.2))
        for k in range(3): out[L(0.33 * k):L(0.33 * k) + len(one)] += one
        return out
    if kind == "thud": n = L(0.6); return tone(70, n, 40) * env(n, 0.002, 0.12) + 0.4 * band(noise(n), 60, 800) * env(n, 0.001, 0.05)
    if kind == "hit": n = L(2.2); return tone(55, n, 30) * env(n, 0.003, 0.6) + 0.35 * band(noise(n), 30, 300) * env(n, 0.002, 0.4)
    if kind == "whoosh": n = L(0.9); e = np.sin(np.linspace(0, np.pi, n)) ** 2; return 0.8 * band(noise(n), 400, 3000) * e
    if kind == "tick": n = L(0.05); return band(noise(n), 2000, 6000) * env(n, 0.0002, 0.006)
    if kind == "click": n = L(0.08); return 0.8 * tone(1800, n) * env(n, 0.0002, 0.01)
    if kind == "hiss": n = L(0.9); e = np.minimum(1, np.arange(n) / L(0.05)) * np.exp(-np.arange(n) / L(0.5)); return 0.7 * band(noise(n), 3000, 9000) * e
    if kind == "creak":
        n = L(1.1); t = np.arange(n) / SR; f = 160 + 50 * np.sin(2 * np.pi * 1.3 * t) + 15 * band(noise(n), 5, 40)
        saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
        return 0.35 * band(saw, 200, 2500) * np.sin(np.linspace(0, np.pi, n))
    if kind == "sting": n = L(2.5); return 0.35 * sum(tone(f, n) for f in (220, 233.1, 311.1, 466.2)) * env(n, 0.01, 0.8)
    if kind == "heartbeat":
        one = tone(50, L(0.3), 35) * env(L(0.3), 0.004, 0.07); out = np.zeros(L(0.9))
        out[:len(one)] += one; out[L(0.28):L(0.28) + len(one)] += 0.7 * one; return out
    if kind == "rumble": n = L(2.5); return 0.9 * band(noise(n), 25, 140) * np.sin(np.linspace(0, np.pi, n))
    if kind == "glass":
        n = L(0.8); return 0.3 * sum(tone(f, n) * env(n, 0.0005, 0.1 + 0.05 * k) for k, f in enumerate((2400, 3150, 4100, 5300))) + 0.5 * band(noise(n), 3000, 10000) * env(n, 0.0005, 0.05)
    if kind == "growl":
        n = L(1.2); t = np.arange(n) / SR; f = 95 + 10 * np.sin(2 * np.pi * 3 * t)
        saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
        return 0.6 * band(saw, 60, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t)) * np.sin(np.linspace(0, np.pi, n))
    if kind == "alarm":
        n = L(1.6); t = np.arange(n) / SR; gate = ((t * 4) % 1 < 0.5).astype(float)
        return 0.4 * np.sign(np.sin(2 * np.pi * 880 * t)) * gate * np.minimum(1, (n - np.arange(n)) / L(0.1))
    if kind == "drip": n = L(0.25); return 0.6 * tone(900, n, 1800) * env(n, 0.001, 0.04)
    sys.exit(f"unknown sfx type {kind}")

with wave.open(os.path.join(part, "narration.wav")) as w:
    v = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
voice = np.zeros(N); voice[:min(N, len(v))] = v[:N]
t = np.arange(N) / SR
drone = (np.sin(2 * np.pi * 55 * t) + 0.7 * np.sin(2 * np.pi * 82.4 * t + 1) + 0.4 * np.sin(2 * np.pi * 110.6 * t)) * (0.75 + 0.25 * np.sin(2 * np.pi * t / 7))
rt = mixkit("roomtone") if spec.get("roomtone", True) else None       # a dark cinematic room tone from Mixkit, looped
if rt is not None and len(rt) > SR:
    reps = int(np.ceil(N / len(rt))) + 1; room = np.tile(rt, reps)[:N]
else:
    room = band(noise(N), 40, 400)
room = room / (np.abs(room).max() + 1e-9)
bed = 0.5 * drone / 2.1 + 0.5 * room
cues = sorted([(when(c["at"]), float(c["level"])) for c in spec.get("bed", [{"at": 0, "level": 0.7}])])
level = np.interp(t, [c[0] for c in cues] + [TOTAL], [c[1] for c in cues] + [cues[-1][1]])
level *= np.clip((TOTAL - t) / 1.5, 0, 1) * np.clip(t / 0.3, 0, 1)
venv = np.convolve(np.abs(voice), np.ones(SR // 20) / (SR // 20), mode="same")
duck = 1 - 0.55 * np.clip(venv / 0.04, 0, 1)
fx = np.zeros(N)
for c in spec.get("sfx", []):
    s = int(when(c["at"]) * SR); x = make(c["type"]); x = x / (np.abs(x).max() + 1e-9)
    e = min(N, s + len(x)); fx[s:e] += float(c.get("vol", 0.7)) * x[:e - s]
# music: a dark bed made here, never a downloaded track
mcfg = spec.get("music", "on")
music = np.zeros(N)
if mcfg not in ("off", False, None, 0):
    mdb = float(mcfg.get("level", -13)) if isinstance(mcfg, dict) else (float(mcfg) if isinstance(mcfg, (int, float)) and not isinstance(mcfg, bool) else -13.0)
    chords = [(73.42, 146.83, 174.61, 220.0), (58.27, 116.54, 146.83, 174.61), (49.0, 98.0, 116.54, 146.83), (55.0, 110.0, 130.81, 164.81)]
    seg = 8.0                                                   # D minor, B flat, G minor, A: 8 s each, slow crossfades
    for k in range(int(TOTAL // seg) + 2):
        f0 = chords[k % 4]; t0 = k * seg - 1.5; t1 = t0 + seg + 3.0
        a, b = max(0, int(t0 * SR)), min(N, int(t1 * SR))
        if a >= b: continue
        tt = np.arange(a, b) / SR
        wdw = np.sin(np.pi * np.clip((tt - t0) / (t1 - t0), 0, 1)) ** 2
        pad = np.zeros(b - a)
        for i, fr in enumerate(f0):
            for det in (-0.7, 0.7):
                ph = 2 * np.pi * (fr + det) * tt
                pad += (np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)) * (1.0 if i == 0 else 0.5)
        music[a:b] += pad * wdw
    music = band(music, 30, 700); music /= np.abs(music).max() + 1e-9
    low = (np.sin(2 * np.pi * 36.71 * t) + 0.5 * np.sin(2 * np.pi * 73.42 * t + 0.7)) * (0.7 + 0.3 * np.sin(2 * np.pi * t / 11))
    music = 0.7 * music + 0.35 * low
    thump = tone(48, int(0.4 * SR), 34) * env(int(0.4 * SR), 0.004, 0.09)
    tp = 1.0
    while tp < TOTAL - 2.0:                                     # the pulse: 57 a minute, about 75 in the last 15 s
        i = int(tp * SR); e = min(N, i + len(thump)); music[i:e] += 0.45 * thump[:e - i]
        tp += 1.05 if tp < TOTAL - 17 else 0.8
    boom = tone(41, int(2.5 * SR), 30) * env(int(2.5 * SR), 0.01, 0.8)
    for c in spec.get("sfx", []):                               # low booms on the big beats
        if c.get("type") == "hit":
            i = int(when(c["at"]) * SR); e = min(N, i + len(boom)); music[i:e] += 0.8 * boom[:e - i]
    vslow = np.convolve(np.abs(voice), np.ones(SR // 4) / (SR // 4), mode="same")
    talking = vslow > 0.01
    mduck = 1 - 0.37 * np.clip(vslow / 0.03, 0, 1)               # about 4 dB down while a line plays
    music *= mduck * (0.75 + 0.3 * np.clip(level, 0, 1.2))       # swells with the bed cues and fades with it
    vr = np.sqrt(np.mean(voice[talking] ** 2)) if talking.any() else 0.1
    mr = np.sqrt(np.mean(music[talking] ** 2)) + 1e-9
    music *= vr * 10 ** (mdb / 20) / mr                          # mdb below the voice while it speaks
    print(f"music: {mdb:.0f} dB under the voice while it speaks")
mix = voice + 0.22 * bed * level * duck + 0.45 * fx + music
mix /= max(1.0, np.abs(mix).max() / 0.98)
raw = os.path.join(part, "mix_raw.wav")
with wave.open(raw, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
def measure(path):
    m = subprocess.run([FF, "-hide_banner", "-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(json.loads(m[m.rindex("{"):m.rindex("}") + 1])["input_i"])
li = measure(raw); out = os.path.join(part, "mix.wav"); gain = -14 - li
for k in range(2):                                   # the second round corrects what the limiter took off
    if k: gain += -14 - measure(out)
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", raw, "-af", f"volume={gain:.2f}dB,alimiter=limit=0.84:level=false",
                    "-ar", str(SR), "-ac", "2", out], check=True)
os.remove(raw)
# dropout scan: a 100 ms hole inside a spoken line means a cut went wrong
holes = []
for L in timing["lines"]:
    a, b = int(L["start"] * SR), int(L["end"] * SR)
    seg = voice[a:b]; hop = SR // 20
    quiet = [np.sqrt(np.mean(seg[k:k + hop] ** 2)) < 0.0015 for k in range(0, max(0, len(seg) - hop), hop)]
    run = 0
    for j, qq in enumerate(quiet):                                  # a natural pause is under 0.7 s; a dropout is longer
        run = run + 1 if qq else 0
        if run * hop > 0.7 * SR and 3 < j < len(quiet) - 3: holes.append(round(L["start"] + j * hop / SR, 2)); break
if holes: print("DROPOUT WARNING: silence inside a spoken line at " + ", ".join(map(str, holes)) + " s")
else: print("dropout scan: OK")
print(f"mix.wav written: {TOTAL:.2f} s, {measure(out):.1f} LUFS (from {li:.1f})")
```

### engine/encode.py
```python
"""encode.py FOLDER : FOLDER/frames + FOLDER/mix.wav -> FOLDER/<folder>.mp4 (the phone copy: H.264 + AAC, under 10 MB),
FOLDER/<folder>_master.mp4 (high quality),
FOLDER/sheet.jpg (frame 0, then one frame every 3 s) and a pacing check (cuts per 10 s, longest still).
needs: pip install numpy imageio-ffmpeg"""
import os, re, shutil, subprocess, sys
import numpy as np
def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
FF = ffmpeg()
part = os.path.normpath(os.path.abspath(sys.argv[1])); name = os.path.basename(part) + ".mp4"
out = os.path.join(part, name)
import wave
with wave.open(os.path.join(part, "mix.wav")) as w: need = int(w.getnframes() / w.getframerate() * 30)
have = len([n for n in os.listdir(os.path.join(part, "frames")) if n.endswith(".jpg")])
if have < need - 3: sys.exit(f"STOP: frames/ has {have} frames but the sound needs {need}: the render stopped early, render again")
for crf in (22, 24, 26, 28, 30):
    subprocess.run([FF, "-y", "-loglevel", "error", "-framerate", "30", "-i", os.path.join(part, "frames", "f%05d.jpg"),
                    "-i", os.path.join(part, "mix.wav"), "-vf", "scale=out_range=tv:out_color_matrix=bt709,format=yuv420p",
                    "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-maxrate", "1100k", "-bufsize", "2200k",
                    "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv",
                    "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out], check=True)
    mb = os.path.getsize(out) / 1e6
    if mb < 10: break
subprocess.run([FF, "-y", "-loglevel", "error", "-framerate", "30", "-i", os.path.join(part, "frames", "f%05d.jpg"), "-i", os.path.join(part, "mix.wav"),
                "-vf", "scale=out_range=tv:out_color_matrix=bt709,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "20",
                "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv", "-c:a", "aac", "-b:a", "192k", "-shortest",
                "-movflags", "+faststart", out[:-4] + "_master.mp4"], check=True)
rows = -(-len(os.listdir(os.path.join(part, "frames"))) // 540)
subprocess.run([FF, "-y", "-loglevel", "error", "-i", out, "-vf", rf"select='not(mod(n\,90))',scale=270:-1,tile=6x{rows}",
                "-frames:v", "1", "-fps_mode", "vfr", os.path.join(part, "sheet.jpg")], check=True)
info = subprocess.run([FF, "-hide_banner", "-i", out, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
dur = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info); secs = int(dur.group(2)) * 60 + float(dur.group(3))
lufs = re.findall(r"I:\s+(-?[\d.]+) LUFS", info)
print(f"{name}: {secs:.1f} s, {mb:.1f} MB (crf {crf}), loudness {lufs[-1] if lufs else '?'} LUFS, contact sheet: sheet.jpg")
# pacing: how often the picture cuts, and where nothing on screen moves at all
raw = subprocess.run([FF, "-loglevel", "error", "-i", out, "-vf", "fps=10,scale=54:96,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, 96, 54).astype(np.float32)
d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
cuts = []
for i in np.where(d > 14)[0]:
    if not cuts or (i + 1) / 10 - cuts[-1] > 0.25: cuts.append((i + 1) / 10)
stills, start = [], None
for i, s in enumerate(np.append(d < 0.35, False)):
    if s and start is None: start = i
    if not s and start is not None:
        if (i - start) / 10 > 2.5: stills.append(f"{start / 10:.1f}-{i / 10:.1f} s")
        start = None
gaps = [f"{a:.1f}-{b:.1f} s" for a, b in zip([0.0] + cuts, cuts + [secs]) if b - a > 5.0]
per10 = len(cuts) / secs * 10
print(f"pacing: {per10:.1f} cuts per 10 s (aim for 3.3 or more: a new shot every 1.5 to 3 s)")
if per10 < 2.5 or stills or gaps:
    if stills: print("PACING WARNING: nothing moves at " + ", ".join(stills) + ": add a move or a card there")
    if gaps: print("PACING WARNING: no cut for over 5 s at " + ", ".join(gaps) + ": cut to a new picture there")
    if per10 < 2.5: print("PACING WARNING: too few cuts overall: give more lines their own shot")
else:
    print("pacing OK")
```
