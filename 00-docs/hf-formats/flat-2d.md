# flat-2d (HyperFrames format)

Data-driven flat 2D explainers: flat vector worlds, rigged characters, app replicas and a travelling camera, drawn in SVG/HTML and animated with one paused GSAP timeline (1080x1920, 30 fps). An LLM drives it through a JSON payload (`spec.hf`); no coding agent is involved.

Code: `07-studio/engine/hf/flat-2d/`. Contract (`meta`, `payloadSchema`, `promptSection`, `normalize`, `compose`) is `index.mjs`; `compose` returns `{ entry, sfx, durationSec, warnings }` where `entry` is the absolute path of `index.html`. The composition draws its OWN captions (variable `captions`), so the engine's caption overlay must not be applied.

## Modes
- `single` (default): one world, one camera. Scenes are stations on a snake path; the path draws itself while the camera travels (zoom-out dip plus light blur); a recap zoom-out closes long videos. Use for process, step-by-step, duels.
- `multi`: scenes side by side, joined by `slide`, `whip`, `up`, `wipe` or `iris`. Use for stories and rankings.
Both modes work with every style and setting.

## Styles (12): `styles.mjs`
flat-soft-gradient, flat-dark-neon-ui (default look of the guru videos), flat-memphis, flat-paper-cut, flat-blueprint, flat-neo-brutalist, flat-risograph-duotone, flat-glass-ui, flat-sticker-cartoon, flat-clay-2d, flat-isometric, flat-low-poly. A style = semantic color roles + shape rules (radius, stroke, shadow kind, gradient, facets) + texture + fonts + caption colors + cast mode (color, duo, line). Palettes are proposals, not sourced from a palette site.

## Settings (16): `settings/*.mjs`
desktop-browser, phone-ui, server-room, city-street, office, barbershop, kitchen, classroom, factory-line, airport, data-center, bank, hospital, home-office, store, void. Each draws 3 depth layers (far, mid, near) with parallax and 4-6 named props that beats can target (`pulse`, `chip`, `camera`, `act ... to`). Props with an empty group (window, mirror, shelf, blackboard, columns...) are decor targets: transform effects on them fall back to a pulse ring.

## Replicas (13): `kit/*.mjs`
browser (URL typed letter by letter, page draws itself), chat (typing dots), stats (rolling counters), chart (line, bars, donut that draw themselves), notification (toasts drop in), phone, list (directory/table with scan and pick), rack (LEDs, lever), router (blinking), calendar, stamp-card, progress, card. Dynamic extras created from beats: cursor (click), packet and line (send), chip, emote, hero stamp, burst, ring, tint.

## Cast: `rig.mjs`, `clips.mjs`
Six designs (nico, dora, beto, luz, tomas, mica) with head, torso, 2-segment arms, legs, blinking eyes and a talking mouth. Views: `front` or a 3/4 profile facing left/right (far limbs behind the torso, nose, shifted features). Sizes S/M/L = 12/18/28 % of frame height. Clips: idle, talk, walk, run, point, react, celebrate, shrug, wave, pull, click, think, turn, shades. Breathing and seeded blinking are automatic.

## Beats: `schema.mjs` (BEAT_SPEC), `beats.mjs`
`{ on: { word, n? }, do, ...params }` with 28 kinds: show, hide, type, message, count, draw, drop, click, scan, pick, send, light, mark, punch, fill, toggle, lever, grow, recolor, shake, bounce, pulse, emote, chip, hero, burst, act, camera. `n` is the n-th occurrence of the word (accent and punctuation insensitive). Unresolved words fall back (stem, then edit distance <= 2, then proportional placement) and are reported in `warnings`; nothing is dropped. `normalize()` fixes aliases (style, setting, kind, do, clip, icon, role), `on` shorthands, string numbers, case of targets, and adds characters used by a beat to the scene.

## Payload example
`example.mjs` holds a valid payload (the "type a URL" reel) and its word timings; the same JSON is embedded in `promptSection`.

```json
{ "style": "flat-dark-neon-ui", "mode": "single",
  "scenes": [{ "id": "pc", "setting": "desktop-browser", "label": "TU PC",
    "props": [{ "id": "web", "kind": "browser", "at": "top", "url": "ejemplo.com" }],
    "cast": [{ "who": "nico", "at": "floor-left", "facing": "right" }],
    "beats": [{ "on": { "word": "URL" }, "do": "type", "target": "web", "text": "ejemplo.com" }] }] }
```

## Layout and safe zones
Stage 960x1040 at frame (60,450): nothing important in the top 220 px, bottom 420 px or 60 px sides. Captions sit at y=240 (2-4 words, at most 22 characters, so never more than two lines), keyword boxed. Caption text 58-66 px, replica text 34-48 px (base size l).

## Assets and licenses
Icons: Phosphor only (MIT, `@phosphor-icons/core`), inlined from the engine's node_modules. Fonts: files from `03-assets/fonts` (SIL OFL) copied to `assetsDir/fonts`. `assetsDir/LICENSES.md` carries both notices. GSAP loads from the jsDelivr CDN pin used by the reference reel (`gsap@3.15.0`).

## SFX cues
`whoosh` (travel, transitions, send, walk), `pop`, `click`, `keyboard` (while typing), `hit` (shake, lever), `stamp` (hero, mark, punch).

## Add a style
Add an entry to `STYLES` in `styles.mjs` (all roles in `c`, `shape`, `fonts` from `FONTS`, `cast`, `cap`). If it needs a new shadow kind add it to `SHADOWS` (css.mjs) and `build` (draw.mjs); a texture goes in `css.mjs`. The id appears in `meta`, the schema and the prompt automatically.

## Add a setting
Create `{ id, name, about, build(d) }` in `settings/*.mjs` returning `{ far, mid, near, props }` (stage coordinates, use roles only, draw with `d.rect/circle/path/...`, name props with `named(d, "lamp", svg, box)`), then register it in `settings/index.mjs`. Keep kit slots (upper 100-620) free of important decor.

## Add a replica
Add `{ about, base:{w,h}, fields, css, build(ctx,p) }` in `kit/*.mjs`, register it in `kit/index.mjs`, and add the beat handling in `beats.mjs` (ops are plain data: set, to, fromTo, cycle, roll, path).

## Verification and showcase
`04-projects/hf-showcase/flat-2d/`: `build-showcase.mjs` (12 style and 16 setting compositions), `build-main.mjs` (22 s reel), `contact-sheet-12-styles.png`, `contact-sheet-16-settings.png`, `flat-2d-showcase.mp4`. Tests: `node --test test/hf-flat-2d*.test.mjs` from `07-studio/engine`.

## Known weaknesses
Characters are rigid-limb puppets (no cloth or hair secondary motion); 3/4 view is a mirrored side rig, not a true turn; the isometric style is extruded shapes, not true isometric projection; some setting decor sits behind the hero replica; the scene label can overlap a setting sign (airport gate sign).
