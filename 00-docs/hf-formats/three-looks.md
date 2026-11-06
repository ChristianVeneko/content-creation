# three-looks (HyperFrames format)

3D animated worlds where EVERY MODEL IS BUILT FROM SCRATCH in code (primitive and procedural geometry), driven by a JSON payload (`spec.hf`). Module: `07-studio/engine/hf/three-looks/`. Look implemented: `clay-diorama`; the other looks of the plan are meant to be added as data in `styles.mjs`.

Binding rule: models, characters and sets are never taken from a stock or downloaded asset. The payload field `stock: true` is the only way to use the old CC0 GLB models (static, clay-treated, no clips); the validator rejects `model`, stock `build` ids and string heroes such as `"robo"` without it, and the spec writer is told never to set it unless the user asked. `03-assets/3d/hf-models` is no longer referenced by defaults, tests or `compose`.

Spike result (why HyperFrames and not Remotion): `04-projects/hf-spike/RESULT.md`. Needs a hardware GPU in Chrome for speed.

## How it works

- One HTML composition: a WebGL canvas (three.js 0.186.1, vendored in `vendor/three-bundle.js`; rebuild both bundles with `node hf/three-looks/vendor/build.mjs`; `three-stock.js` adds the GLTF loader and is copied only with `stock: true`) plus DOM layers (captions, name tags with leader lines, stamp words). Everything is a pure function of the `hf-seek` time. No HDRI: the environment is three's procedural `RoomEnvironment`.
- Parts vocabulary (`parts.mjs`, same semantics as the Remotion engine): 12 shapes (box with radius, sphere, cylinder, cone, torus, capsule, plane, ring, tube along points, extrude of an outline, lathe of a profile, group), 7 color roles, finishes auto/matte/clay/emissive/glass/metal, `pos/rot/scale/pivot/parent`, `keys`, 13 motion presets (bob, float, spin, wobble, breathe, hop, pop-in, look-at-camera, wave, walk, blink, assemble, explode) and named `states` (open, fill, heat, glow, spin) that beats drive. Limits: 160 parts per object, 400 world parts.
- Builders (`builders/`): procedural kits returning the same parts as hand-written `parts`. Character rig (4 designs: kid, bot, worker, scientist; 5 hats; 6 expressions; blinking eyes; walk cycle and emotes through rig ids) and 26 props: microwave, oven, laptop, phone, router, server-rack, battery (charge segments), padlock, magnifier, monitor, pipe, elbow, valve, pipe-system, funnel, conveyor, gears, cloud, chart-bars, door, table, shelf, plant, lamp, crate, thermometer.
- Sets (`sets.mjs`): studio, room, server-room, street, kitchen, warehouse: rounded platform, textured floor, back wall, procedural decor, a raised front step, a foreground row of small props and floor decals that fill the lower third.
- Framing (`frame.mjs`, `shots.mjs`): the resolver bakes every camera pose. The solver fits the hero and the targeted object into the safe fit box (x 90-990, y 330-1130; wide shots may use y up to 1580), keeps the hero at most 35 % of the frame height and either inside the safe box or fully outside the frame, and enforces the shot mix: about 25 % wide, 50 % close (close and macro), 25 % medium (medium, low, top), never two wides in a row, a close or macro shot on every state-changing beat (open, fill, heat, explode, assemble), every shot moves so the camera is never idle for 2 s.
- Text (`place.mjs`): name tags and stamp words are placed at compose time away from the hero and the targeted object; tags get a leader line to their object that the runtime redraws every frame.
- Transitions: a render-target crossfade (iris, slide, drop, pop): the incoming world is drawn into a render target and shown through a moving mask with a rim line, so every transition frame shows scene content.
- Modes: `multi` = one world per idea with a transition at each cut; `single` = all worlds side by side, the camera travels and the hero walks (no cuts).

## Payload

`{ style, stock?, hero: { design, hat, expression, skin, hair, colors, seed }, camera, worlds: [{ set, mood, from, transition, cast, objects, parts, shots, beats }] }`. An object is `{ id, label?, build + params | parts, colors?, seed?, scale?, at?, rot?, corner?, hidden?, motion?, keys? }`. Beat kinds: pop-in, pop-out, grow, shrink, pulse, shake, light-up, dim, burst, move, spin, open, close, fill, heat, cool, explode, assemble (objects; `open`/`close`/`fill` need a part with that state), walk, emote, look (cast), label, stamp (text). Word binding as in the other formats (`on: { word, n?, offset? }` or `{ at }`).

## Validation and normalize

Closed enums with precise messages. `normalize` maps legacy vocabulary (hero `robo` -> design `bot`, `setting` -> `set`, Spanish and English prop names -> builders, synonyms for acts, moods and shots, `"70%"` -> 0.7, anchors).

## Tests

`test/hf-three-looks-parts.test.mjs` (vocabulary, validation, builders, stock rule), `test/hf-three-looks.test.mjs` (schema, normalize, word binding, framing solver, shot mix, placement), `test/hf-three-looks-compose.test.mjs` (byte-identical compose, no model files in default output, stock opt-in, forbidden APIs, lower-third coverage on the draw plan, layout, transitions).

## Showcase

`04-projects/hf-showcase/three-looks/`: `models-contact-sheet.jpg` (4 characters, microwave, router, battery, pipe system) and `worlds-contact-sheet.jpg` (3 worlds), built by `build-showcase.mjs` from `models.spec.json` and `worlds.spec.json`.

## Known limits

Only clay-diorama. A macro or close shot on a wide target while the hero walks can pull back far (distance 30+), leaving empty ground below the platform. The lower-third check measures decor, object and cast rects on the draw plan (mean about 8 %, worst frame about 65 % on the example); the foreground rugs are busy. Stock models are static. Builders fit the clay look but are toy-simple; no shader effects (outline, DoF, transmission).
