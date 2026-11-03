# three-looks (HyperFrames format)

3D animated worlds with real GLB models, driven by a JSON payload (`spec.hf`). Module: `07-studio/engine/hf/three-looks/`. Look implemented: `clay-diorama`. The other five looks of the plan (iso-toon, neon-glass, pedestal, paper-world, toy-blocks) are meant to be added as data in `styles.mjs` (lighting rig, materials, background/mood table, post chain, caption and tag style); no look-specific code exists in the schema or the resolver.

Spike result (why HyperFrames and not Remotion): `04-projects/hf-spike/RESULT.md` (7.2 s per 10 s of video on the GPU, 0 of 300 frames differ between renders, 0.57 GB).

## How it works

- One HTML composition: a WebGL canvas (three.js 0.186.1, vendored in `vendor/three-bundle.js` and made lint-clean by `vendor/build.mjs`; rebuild with `node hf/three-looks/vendor/build.mjs`) plus DOM layers (captions, floating name tags, stamp words, transition wipe). Everything is a pure function of the `hf-seek` time: tracks built from beats, `AnimationMixer` actions sampled with `time` and `weight` set by hand and `mixer.update(0)`, seeded hash noise only, no clock, no `Math.random`, no animation loop. Heavy setup (HDRI, GLBs, fonts) is `window.__hf.buildReady.three`.
- Needs a hardware GPU in Chrome (`--browser-gpu` auto): software WebGL is about 10x slower.
- Clay look: matte `MeshStandardMaterial` (roughness 0.9) with a seeded bump map, rounded kit geometry (`RoundedBoxGeometry`), warm key + hemisphere fill + cool rim, HDRI environment, soft PCF shadows plus blob contact shadows, bloom, a tilt-shift blur + vignette + grade pass, tone mapping.
- Frame zones (`layout.mjs`, one source for runtime and tests): nothing important in the top 220 px, bottom 420 px or 60 px sides; the picture is shifted up (`viewOffsetY`) so the caption band y 1190-1420 stays free; name tags are clamped inside x 130-950, y 310-1090; stamp word centred at y 640; all text 52 px or bigger; captions are the format's own (variable `captions`), 2-4 words per group with the active word highlighted.
- Modes: `multi` = one world per idea with a clay transition (iris, slide, drop, pop) at each cut; `single` = all worlds side by side, the camera travels between them and the hero walks (no cuts).

## Content

- Settings (5): `desk`, `server-room`, `street`, `kitchen`, `warehouse`. Each has a platform, set dressing and 6-8 targetable props; hidden props appear with `pop-in`.
- Prop kinds with named states: monitor (`open` windows, `fill` RAM bar, `heat`), tower, ram-stick, thermometer, rack (door `open`, LED `fill`), hard-disk (`spin`), fan, beacon, traffic-light, stove, fridge, crate, shelf (`fill`), door, clock, and real models (lamp, pot, apple, barrel, barrier, sign, cars, trucks). Beat kinds: pop-in, pop-out, grow, shrink, pulse, shake, light-up, dim, burst, move, spin, open, close, fill, heat, cool (props); walk, emote, look (cast); label, stamp (text). Each prop accepts only the acts of its kind; the schema error lists them.
- Heroes: `robo` (skinned, real clips: Idle, Walking, Wave, Yes, No, ThumbsUp, Jump, Dance, Death, Sitting, Punch) and the Kenney blocky `alex`, `dani`, `kiko` (node animation clips: idle, walk, wave, yes, no, sit, die). Skeleton-free secondary motion on top: a squash-and-stretch pulse on every spoken word, anticipation at the start of an emote, a hop on `jump`, yaw look-at, walk bob.
- Camera: shots wide, medium, close, low, top, over-shoulder; moves dolly-in, dolly-out, orbit, orbit-back, push, crane, truck, drift. Without `shots` the resolver plans a shot every 3-4 s that follows the beats, never repeats a framing and always moves. Hero height stays at 18 % of the frame or more (tested).
- Word binding: `on: { word, n?, offset? }` or `{ at }`, same tolerance as pixel-world (exact, 4+ letter prefix, edit distance 1-2); a word not found is spread evenly inside its world with a warning, nothing is dropped.

## Assets and licenses

All CC0, listed in `03-assets/3d/licenses.json`: the 26 GLBs of `models/` and `hdri/` plus the new `hfModels` section (robot-expressive from the three.js examples, Television, Classic Laptop, Ceiling Fan, Brass Pot, Barrel, Shelf from Poly Haven; the television, laptop and fan are packed but not used by a setting yet). `hfModels` is kept apart from `models` because the Remotion 3D templates enumerate `models` (`lib/scene3d.mjs`). A test checks that every GLB the module references exists and has a CC0 entry.

## Validation and normalize

Closed enums with precise messages (style, hero, setting, mood, transition, shot, move, emote, prop and act per kind). `normalize` fixes: key aliases (`scene`, `scenario`, `type`, `action`, `prop`, `time`), Spanish/English synonyms for settings, moods, acts, targets (`pc` -> `tower`, `disco` -> `hard-disk`), shot and move names, `"70%"` -> 0.7, anchors (`izquierda`), sizes, cast `robot` -> `hero`. Unknown values are left for the schema to report.

## Tests

`test/hf-three-looks.test.mjs` (schema, normalize, word binding, resolve, shot plan, single mode) and `test/hf-three-looks-compose.test.mjs` (byte-identical compose, forbidden APIs, asset references, licenses, camera and 18 % hero rule, layout and font sizes).

## Known limits

Only clay-diorama; the platform is wider than the portrait frame so wide shots crop it; the hero is often large; decor is simple; `three-looks` has no brand pill or HUD.
