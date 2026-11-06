# SDD: Video engine rework (animated worlds, not static scenes)

Status: IN PROGRESS (units U1-U8 on `feat/video-engine-rework`; see `odd/tasks/video-engine-rework.md`). Date: 2026-11-02. Branch to create on approval: `feat/video-engine-rework` (from `feat/process-explainer`).
Tracking doc: `odd/tasks/video-engine-rework.md`. Nothing in this document has been executed; no file was deleted.

## 1. Problem

The current engine produces videos that look cheap next to the references the user collected:

- 3D: one isometric tabletop for the whole video, primitive self-built models that "spawn" and do not interact, a stick-figure character at 5-10 % of frame height, labels floating next to props. Evidence: export `04-projects/2026-11-03-por-que-la-ia-consume-tanta-ram-3/video.mp4` (57 s, same scene throughout).
- Pixel: reused static sets with the same few props (laptop, lamp, pedestal, coin), no character animation, no interaction, nothing combined.
- Only the Remotion kinetic/reels templates look acceptable, and those are for simple videos.
- Agents do not load the right skills: the `video` skill tells the agent to "build models from scratch", never loads the HyperFrames craft guides (`types/character.md`, `types/3d.md`, `types/explainer.md`, `types/vertical.md`) nor `threejs-loaders` / `threejs-asset-pipeline`, and HyperFrames is only a side route (`hyperframes-brief`).

## 2. Evidence: what the references do (analysis of the user's files)

| Reference | Style | Technique (inferred) | What makes it good |
|---|---|---|---|
| `Video by santiremedio [DfOOI0etk5L].mp4` (54 s, 540x960) | Animated pixel-art "game worlds" | HyperFrames, scenery and characters drawn in code (canvas/CSS), per the user's PDF. No AI video. | A new world every 8-10 s (saloon, street, desert, train, mine, safe); 3-4 depth layers with blur; a visual beat every 1.5-2 s; character bobs, blinks, talks and reacts ("?" over the head); props react ON narration words (progress bar fills, train recolors, gold bursts, door opens); hero-word stamp, karaoke captions, brand pill with fake follow click, vignette, bokeh, shake. |
| `Video by torna.club [DfK3Vs7B6B_].mp4` (32 s, 720x1280) | Flat vector 2D, no outlines | Rigged vector puppets (After Effects/Rive-style or SVG/GSAP) | Interiors and streets with continuous pan/zoom; characters with separate head/arms/legs; counter and stamp animations; phone mockup sliding over the live scene with shadow and glow; word-by-word karaoke subtitles; cuts every 4-9 s. |
| `Guía PIXEL - Videos sin cara en pixel.pdf` | Workflow | Claude Code + HyperFrames, user's own voice | 30 angles per topic; script of 110-150 words in 4 parts; every sentence must be drawable (one literal metaphor per sentence); a saved `estilo-pixel.md`; a visual change every 2 s; 1080x1920 with bottom safe zone (y < 1580); chiptune music 17 dB under voice; silences cut; show 5 stills before rendering; re-render winners in 10 different worlds. |

Gap list (ours vs references): one scene for 57 s vs a world per 8-10 s; empty frame vs 3-4 layers; tiny non-reacting character vs a character that acts; props that do not interact vs word-triggered state changes; no depth/atmosphere vs blur, vignette, glow, particles; generic captions vs karaoke/dialog styles; no emphasis effects; no brand pill/CTA world; camera is a slow tilt only.

## 3. Goals and non-goals

Goals
- G1. Videos with environments, animation and interaction at the level of the references.
- G2. Two new animated 2D formats: animated pixel art, and animated flat 2D ("2D normalito").
- G3. Six polished three.js looks only: Clay Diorama, Iso Toon, Neon Glass, Pedestal, Paper World, Toy Blocks (the six in the user's screenshots).
- G4. HyperFrames as the engine for the new 2D/pixel work, with the right skills loaded by construction.
- G5. Keep the Remotion kinetic and reels-2d templates untouched (they work).
- G6. One standard test video per new format, with measurable acceptance criteria (section 9).

Non-goals
- No new fake-3D "spawn and sit" scenes. No paid AI generation unless the user opts in per video.
- No change to captions/voice/music subsystems except where the new engine needs word-timing events.

## 4. Scope decisions

UPDATE 2026-11-02 (user): the 20 illustrated-2d templates are NOT deleted ("eliminarlas esas 20 esta forzado pero si se pueden sacar mejores resultados pues hazle un rework"); they are reworked or replaced only where the new formats are clearly better. Pixel and flat 2D now ship as HyperFrames format modules (`pixel-world`, `flat-2d`) driven by the API path; the old pixel templates and the 12 extra 3D looks stay untouched until a replacement passes the standard tests and the user approves removing them. The assumptions below (A1-A3 deletions) are therefore SUSPENDED, not executed.

Original reading of the request (kept for the record):

Reading of the user's request ("dejame ... explicativo/tutorial, datos y gráfica, historia cinematográfica, producto escaparate, todo de pixel arcade, eliminalo" and "en mundos 3D deja solo [6 looks]"):

- A1. Delete the whole illustrated-2d template family (20 templates: illustrated, whiteboard, broadcast, editorial-chart, editor-window, rank-numbers, watercolor, paper-collage, chalkboard, risograph, ukiyo-e, pop-comic, ui-cards, flat-depth, soft-gradient, host-tutorial, checklist-glass, spotlight-narrative, data-atlas). These are the "explicativo/tutorial, datos y gráfica, historia cinematográfica, producto escaparate" formats. Keep the shared drawing kit (`lib/drawing*.mjs`, `lib/fx2d.mjs`, `src/components/{Drawing2D,Fx2D,DrawingHero}`) because reels `dibujo` scenes use it.
- A2. Delete all pixel templates (pixel-dusk, -night, -arcade, -mono, -versus) and the current pixel engine; rebuild pixel as animated worlds. Keep the `pixel` caption style.
- A3. Delete 12 of 18 3D templates: holo-studio, neon-grid, soft-studio, moody-night, voxel-world, data-stage, monolith-story, clay-mascot, cutaway-explainer, engineering-explainer, process-explainer, documentary-3d. Keep clay-diorama, iso-toon, neon-glass, pedestal, paper-world, toy-blocks.
- A4. Keep reels-2d (5) and kinetic (5) templates.
- A5. "Eliminate all engines": the Blender renderer is removed (no `stage` support, used only by 3D, falls back to Remotion). The 3D stage/builders stack is NOT deleted blindly: the six kept looks use it today, so it is replaced in Phase 4 only after the new 3D path passes its test. Remotion stays as renderer for kinetic/reels-2d.
- A6. Everything is reversible through git (deletions happen on the feature branch in separate commits).

## 5. Current architecture facts that constrain the plan (audit)

- 49 templates today: illustrated-2d 20, 3D 18, pixel 5, reels-2d 5, kinetic 5 (+ generated `spec.schema.json`).
- `lib/scene3d-motion.mjs` (1137 lines) is imported by 2D code (`lib/drawing.mjs:8`, `lib/fx2d.mjs:8`): extract `momentError`, `resolveMomentStrings`, `sceneWords` into a neutral module before touching it.
- `lib/pixel-gen.mjs:11` imports `lib/reels.mjs` helpers: reels does not depend on pixel.
- Blender is only reachable for 3D templates (`lib/blender-options.mjs:13-20`) and ignores `stage` (`lib/blender-job.mjs`); failures fall back to Remotion (`lib/build.mjs:352`).
- Spec contract: 3D-only fields (`theme.look3d`, `theme.renderer`, `stage`, `scene3d`, `fx3d`), pixel-only fields (`visual.pixel`, `visual.type "pixel"`). `visual.fx` mixes 2D and 3D types.
- Web UI: `shared/types.ts`, `shared/renderers.ts`, `src/lib/formats.ts` and about 15 other files mention pixel/3D; 7 web tests are affected.
- Engine tests: 45 files; about 150 3D-only tests, about 36 pixel-only, plus mixed files that enumerate template ids (`templates`, `spec-writer-prompt`, `format-rework-2d`, `illustrated-formats`, `looks`, `data-atlas`).
- HyperFrames today: only `hyperframes-brief` (summarizes a spec for an agent). Skills `hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `remotion-to-hyperframes`, `media-use` exist; registry has about 450 blocks.

## 6. Research findings that drive the design

HyperFrames (https://github.com/heygen-com/hyperframes, Apache 2.0)
- HTML/CSS/GSAP/Lottie/Three.js/canvas compositions rendered by seeking frames in headless Chrome and encoding with FFmpeg; deterministic; local, Docker or Lambda.
- Contract (local skill `hyperframes`): timed `.clip` elements, one paused GSAP timeline on `window.__timelines`, no `Date.now`, no unseeded `Math.random`, no `repeat:-1`; three.js/canvas draw from the seek time (`hf-seek`); heavy setup registers `window.__hf.buildReady`; simulations are precomputed and looked up by `t`.
- CLI loop: `lint`, `check --json`, `snapshot` (read the PNGs), `preview`, `render`. Registry via `catalog --query` and `add`.
- No official sprite/atlas feature: build atlas playback on canvas/CSS `steps()` or PixiJS with the frame index computed from `t`.
- Gap: no public performance numbers for WebGL. Headless Chrome without GPU flags falls back to SwiftShader and is very slow (`--disable-gpu` is worse); on macOS use ANGLE/Metal (https://microlink.io/blog/webgl-without-a-gpu). Must be benchmarked in the pilot.

Pixel animation
- PixiJS `AnimatedSprite` with an atlas and `autoUpdate:false` allows manual, deterministic stepping (https://pixijs.download/release/docs/scene.AnimatedSpriteOptions.html).
- Aseprite CLI exports sheets + JSON per tag (https://www.aseprite.org/cli/); the license is paid.
- AI sprite tools exist but cost money and prices were not found: PixelLab (skeleton animate API/MCP), Retro Diffusion `rd-animation` on Replicate. Vendor advice: avoid camera pans/zooms on AI sprite assets.
- The user's PDF and the santiremedio reel show a free alternative: characters and scenery drawn in code. Default here: code-drawn procedural pixel art plus CC0 sprite assets; paid generators opt-in only.

3D assets and licenses
- Kenney (CC0), Quaternius (CC0), Poly Haven (CC0; no scraping), Poly Pizza (mixed CC0/CC-BY 3.0, check per model), Mixamo (royalty free, no redistribution of files; verify current Adobe terms), Sketchfab (per-model license; unverified). Every asset's source and license goes into the project `brief.md` (existing rule).
- Loaders/animation: glTF + `AnimationMixer`, toon/PBR/physical materials, postprocessing, gltf-transform; covered by the local `threejs-*` skills.

Not verified (open research items): Rive/Spine/Theatre.js headless determinism, Sketchfab terms, HyperFrames GPU performance, PixelLab/Retro Diffusion prices.

## 7. Target architecture

### 7.1 Engines
- Remotion: kinetic (5) and reels-2d (5) templates, unchanged.
- HyperFrames: the new `pixel-world` and `flat-2d` formats (primary engine for new work).
- three.js for the six 3D looks. Host (HyperFrames vs Remotion) is decided by the Phase 4 pilot with a render-time and look comparison; default stays Remotion until the pilot proves otherwise.
- Blender renderer: removed.

### 7.2 Scene Director (the new authoring layer)
The spec stops describing "a scene with objects" and describes a directed story. Spec v2 for the new formats (extends the existing VideoSpec; kinetic/reels specs stay valid):

```
worlds: [ { id, setting, duration, layers: [bg-far, mid, action, fg-blur], lights[], palette,
            cast: [ { id, sprite|rig, size, pos } ], props: [ { id, kind, pos, states } ],
            camera: [ { at, move: pan|push|rack|shake, to } ],
            beats:  [ { on: { word | at }, target, do: state | emote | emphasis | burst } ] } ]
captions: { style: karaoke | dialog | hero-word }
brand: { pill, followClick }
```
- `on.word` binds to transcript word timings (existing `timeline.mjs` / captions words), tolerance ±2 frames.
- Hard rules enforced by a validator (the "motion linter"): at least 1 beat per 2 s; at least 1 world per 10 s; the cast takes at least 12 % of frame height; at least 3 depth layers per pixel/flat world; at least 1 word-bound prop interaction per world; caption safe zone (nothing below y = 1580); no two consecutive worlds with the same setting.

### 7.3 Asset libraries (new, in `03-assets/`)
- `sprites/`: pixel atlases (PNG + JSON, Aseprite tag format) with character clips `idle`, `walk`, `talk`, `blink`, `react`; prop sprites; tilesets for settings (saloon, street, desert, train, mine, arcade, cave, space, sea, office).
- `rigs/`: flat-vector puppet rigs (SVG parts with pivots) with `idle`, `walk`, `talk`, `point`, `react`.
- `props-lib/`: interactive prop components (progress bar, counter, stamp, bubble "?"/"!", phone mockup with notification, safe/door, cart, gold pile, train with smoke, billboard, calendar, loyalty card).
- `models/`: CC0 glTF kits for the six 3D looks with a `LICENSES.md` manifest.
- Procedural generation stays available (code-drawn pixel sprites) as the free default.

### 7.4 Skill loadout (fixes "agents don't load the right skills")
- Each format has a `loadout` file listing the SKILL.md paths the agent MUST read before writing a spec (for example `pixel-world`: `hyperframes`, `hyperframes/types/character.md`, `types/vertical.md`, `hyperframes-cli`, `media-use`).
- The `video` skill gets a "Format router" that opens the loadout, then the format's one-page recipe, instead of the global "build from scratch" instruction.
- `video`, `lote` and `canal` skills updated to the new format list; `threejs-loaders` and `threejs-asset-pipeline` become mandatory for 3D looks.

### 7.5 Quality gates (automatic, before delivery)
1. `hyperframes lint` + `check --json` (new formats).
2. Motion linter metrics from 7.2 on the rendered video (beat density, world changes, camera delta, safe zone).
3. 5-still review sheet shown before the full render (from the PDF).
4. Audio: -14 LUFS ±1, music about 17 dB under voice, SFX onset at each emphasis.
5. Side-by-side contact sheet against the reference for the format (kept in `00-docs/reference-benchmarks/`).

### 7.6 Scene modes: single-scene and multi-scene (both supported)

`mode` is a first-class spec field and a first onboarding question. Every new format (pixel-world, flat-2d, the six 3D looks) supports both.

| | `multi` (several scenes) | `single` (one continuous world) |
|---|---|---|
| Structure | A sequence of `worlds`, each 6-10 s, joined by hard cut, slide, wipe or camera whip | ONE canvas and ONE camera; every block is a "station" on the canvas, joined by a path/line that draws while the camera travels |
| Transitions | Cuts allowed (references santiremedio and torna.club cut every 4-10 s) | No cuts and no scene disappearing; things transform in place (grow, rotate, recolor, fill) and are never removed to swap in another |
| Camera | Per-world shots plus whip/slide between worlds | Frames only the station being told; zooms out to show the whole block, then travels to the next, with light motion blur on long moves |
| Best for | Stories, rankings, "world per idea", pixel game worlds, product tours | Processes, step-by-step, before/after, "novice vs pro" duels, explainers with a single narrative thread |
| Linter | at least 1 world per 10 s; no two consecutive worlds with the same setting | at least 3 stations; the camera never idles more than 2 s; no frame is static for more than 1 s (something always moves: breathing, blinking, floating, parallax) |

Common rules (both modes): the first second already moves something big (hit, zoom, character running in); safe zones (see 7.7); everything is bound to narration word timing.

### 7.7 Parameters and adjustments (spec v2, web UI and `/video` onboarding)

New spec fields (all optional with smart defaults; kinetic/reels specs unaffected):

- Structure: `mode` (`multi` | `single`), `durationSec` (15-180), `pace` (`calm` 3 s | `normal` 2 s | `fast` 1.5 s between beats), `worldChangeSec` (multi, default 8), `stations` (single).
- Camera: `camera.intensity` (`none` | `subtle` | `dynamic`), `camera.shake` (bool, on emphasis beats only), `camera.blurOnTravel` (bool), `depthBlur` (bool; background and foreground).
- Cast: `cast` (none or a list), `character.size` (S 12 % | M 18 % | L 28 % of frame height), `character.style` (pixel 16/32 px, flat vector, by 3D look), `character.reactions` (emote bubbles on/off).
- Interaction: `emphasis.density` (low | normal | high), `emphasis.kit` (stamp, burst, flash-off by default, shake, emote), `interactions` (word-bound events).
- Text: `captions.style` (karaoke | dialog | hero-word | existing), `captions.position` (`top` below the safe zone by default, or `lower`), `captions.wordsPerPage` (2-4), `captions.keywordBox` (bool), `heroWord` (stamp text per block), icon library (`phosphor` | `lucide`; hand-drawn icons not allowed).
- Branding and end: `brand.pill` (avatar + handle), `brand.followClick` (fake follow animation with cursor), `cta` (follow | comment a word | send to a friend | custom) with an optional CTA world.
- Safe zone: `safeZone` preset `shorts-reels-tiktok` by default (nothing important in the top 220 px, bottom 420 px, or within 60 px of the sides); `showSafeZoneOverlay` in preview.
- Audio: `voice` (own recording | Kokoro | ElevenLabs with `voiceId` or trending), `voice.speed` (never above 1.25), `silenceTrim.maxSec` (0.25), `music.mood`/`level` (about 17 dB under voice), `sfx.pack` (whoosh on travel, pop on appear, click/keyboard, hit on climax), loudness target -14 LUFS.
- Script: `script.angles` (30 angle brainstorm, then pick), `script.words` (110-150), `script.drawablePerSentence` (one literal metaphor each), `[COMPROBAR]` marker for any unsure fact (never invent figures), no line breaks inside a sentence.
- Variants: `variants.count` (re-render the winning script in N different worlds with different hook, palette, music and captions).
- Deliverables: `with-subtitles` (default), `without-subtitles`, `how-to-rebuild.md` (commands to regenerate), render quality (`draft` | `looks` | `delivery`).
- Authoring model: a generator script reads the transcript word timings and writes the composition, so changing a sentence or the voice rebuilds everything automatically.

Web dashboard changes (Create and Storyboard views, `07-studio/web/src/views/*`, `shared/types.ts`, `shared/renderers.ts`, `src/lib/formats.ts`):
- A mode toggle ("Una escena continua" / "Varias escenas") with a one-line description of each.
- Grouped panels with sensible defaults and an "Avanzado" accordion: Ritmo (pace, worldChangeSec), Cámara, Personajes, Interacciones, Subtítulos, Marca y cierre, Zona segura, Audio, Variantes, Entregables.
- World/station list editor (reorder, change setting or look, duration) and a beat editor that binds a word of the transcript to an effect.
- Preview checkpoints: 8-second preview, a sheet of 5 stills before the full render, safe-zone overlay toggle.
- "Variantes" button (N worlds from one script) and a deliverables checklist.
- Format picker lists only the formats in section 8; render engine choice is removed for the new formats (Blender removed).

`/video` onboarding rewrite (skill `.claude/skills/video/SKILL.md`):
- Round 1: route and format (from the new catalog), mode (`single` vs `multi`, with a recommendation based on the topic: process/step-by-step/duel to `single`; story/ranking/world-per-idea to `multi`), duration, platforms.
- Round 2: look and world (settings for pixel-world, 3D look, flat palette), cast and character size, palette with the contrast rule.
- Round 3: voice, tone, captions (style, position, words per page), music and SFX.
- Round 4 (optional "Ajustes avanzados", skipped on "tú decide"): pace, camera intensity, emphasis density, brand pill and follow click, CTA type, safe-zone preset, deliverables, variants.
- Checkpoints that block until the user says OK: (1) script with the on-screen action next to each sentence, (2) 8-second preview, (3) sheet of 5 stills, then the full render.
- Before writing a spec the skill opens the format's loadout (7.4), so the right skills are always read.

### 7.8 Verification status of the `hyperframes` commands (checked 2026-11-02)

Confirmed in the local skills: `lint`, `check --json`, `snapshot`, `render --quality draft|looks|delivery`, `tts` (Kokoro), `transcribe` (Parakeet or whisper). Confirmed in the public README: `render`, `skills` (`skills update` for agents), `init`, `preview`, `add`, `catalog`. NOT confirmed anywhere: `npx hyperframes doctor`, and the `--model large-v3` and `--language es` options of `transcribe`. The package is not installed in this repo (`npx hyperframes@0.9.6` would be downloaded). P2 starts with an install-and-`--help` check inside `05-tools/` (no global install) and the flows that depend on those commands are adjusted to what the CLI really offers.

### 7.9 3D plan (six looks) - after the pilot

What the codebase already has: six Remotion + three.js looks (clay-diorama, iso-toon, neon-glass, pedestal, paper-world, toy-blocks), 26 CC0 GLB models and 2 HDRIs in `03-assets/3d/` (licenses in `licenses.json`), a stage/builders stack whose models are mostly primitive. Facts that shape the plan: HyperFrames renders three.js through its seek contract (the scene is a pure function of time; the `hyperframes` skill's `types/3d.md` describes `hf-seek`, precomputed simulations and `window.__hf.buildReady`); headless WebGL needs GPU flags (ANGLE/Metal on macOS) or it falls back to a very slow software renderer; Kenney downloads sit behind a JS page (not fetchable headlessly) and Quaternius packs are FBX/Blend (convert to GLB via the Blender MCP).

Plan (no code written yet):
1. Spike (half day, read-only on templates): render one clay-diorama scene through HyperFrames-hosted three.js and through the current Remotion path; compare render time, determinism and look. Decide the host (default stays Remotion if HyperFrames is not clearly better or equal).
2. A `three-looks` format module with the same contract as `pixel-world` and `flat-2d`: the six looks become STYLES (lighting rig, materials, background/HDRI, post-processing, camera language) and the payload describes scenes made of real assets + procedural helpers, camera shots, and word-bound beats; own captions (no engine overlay).
3. Asset pipeline: curated kit of CC0 glTF (Quaternius, Kenney, Poly Haven, Poly Pizza CC0 only) with skeletal clips (idle/walk/wave/react) played by `AnimationMixer` sampled at seek time; Mixamo clips only for personal use (verify terms); every asset recorded in `licenses.json`. The user downloads the packs that cannot be fetched headlessly; conversions go through the Blender MCP.
4. Quality rules (same linter metrics as the 2D formats): one world or camera setup per 6-10 s, a prop interaction bound to a word per scene, character at least 18 % of the frame height, camera never idle for more than 2 s, no scene reused with the same props twice in a row.
5. Standard tests: one video per look (six), 30-45 s each, built through the API path with Kokoro, graded by the same acceptance list A1-A8.
6. Only after the new module passes, retire the old Remotion 3D looks (user approval first), then the 12 extra looks and the Blender renderer.

## 8. Formats after the rework

| Format | Engine | Status |
|---|---|---|
| pixel-world (animated pixel, game-world per idea) | HyperFrames | NEW |
| flat-2d (animated vector, rigged puppets, parallax, phone mockups) | HyperFrames | NEW |
| 3D: clay-diorama, iso-toon, neon-glass, pedestal, paper-world, toy-blocks | three.js (host decided in Phase 4) | KEPT, rebuilt on real assets |
| reels-2d x5, kinetic x5 | Remotion | KEPT unchanged |
| illustrated-2d x20, pixel x5, 3D x12 | n/a | DELETED (A1-A3) |

## 9. Standard test videos (acceptance)

One standard test video per format, five in total, each about 30-45 s, vertical 1080x1920, with voice, music and captions. Proposed set (default; user can swap):
1. `pixel-world`: "Why AI uses so much RAM" retold as a game world (re-uses today's topic for comparison with the old export).
2. `flat-2d`: a barbershop/loyalty-card style business explainer (mirrors torna.club structure).
3. `clay-diorama` (3D).
4. `iso-toon` (3D).
5. `neon-glass` (3D).
(`pedestal`, `paper-world`, `toy-blocks` get a smoke test each after the first five pass.)

Acceptance for each test video (all must hold, measured by the motion linter plus a human review of the contact sheet):
- A1 structure (by `mode`): `multi` = at least 1 distinct world per 10 s with a cut or slide between them; `single` = no cuts, at least 3 stations joined by a drawn path, and no frame static for more than 1 s. Each standard test set includes at least one `single` and one `multi` video.
- A2 beat density: at least 1 emphasis/interaction per 2 s, and at least 1 word-bound prop interaction per world (landing within 66 ms of the word).
- A3 depth: at least 3 layers with different parallax speed and a blurred foreground (2D formats); distinct key light, fill and background for 3D looks.
- A4 character: at least 12 % of frame height, with idle, talk and react clips visibly different frame to frame.
- A5 captions: karaoke/dialog style with active-word highlight; nothing below y = 1580.
- A6 audio: -14 LUFS ±1; music about 17 dB under voice.
- A7 render integrity: 1080x1920, 30 fps, audio present, no black or blank frames, deterministic re-render (same frames on a second render).
- A8 comparison: reviewed side by side with the matching reference; the user approves the look.

## 10. Phases (each ends in a commit slice of about 400 authored changed lines or less; the unit that deletes data gets its own commit)

- P0 Decouple and baseline (low risk): extract shared moment helpers out of `scene3d-motion.mjs`; record baseline test count (engine 427 tests passing; web tests separate); create the feature branch; commit the pending lenient-normalizer fixes first (`role`, `pos`, `ease`) so they are not lost.
- P1 Delete (HIGH RISK, item 1/3: removes templates, examples, tests, spec fields, docs; contracts others consume): remove A1-A3 and Blender, regenerate `spec.schema.json`, update tests, web UI formats, docs (`template-styles.md`, `3d-resources.md`, README sections, spec-writer prompt sections), `video`/`canal`/`lote` skills. Done in separate commits per family so each can be reverted alone. Gate: engine and web test suites green.
- P2 HyperFrames foundation: project scaffold per video, word-timing event bus, caption styles (karaoke, dialog, hero-word), audio mix recipe, brand pill, lint/check/snapshot loop wired into `video` skill; spec v2 schema and motion linter.
- P3 `pixel-world`: atlas playback, 3 characters with clips, 6 settings with 3-4 layers, interactive prop library, emphasis kit, transitions; standard test video 1.
- P4 `flat-2d`: puppet rig runtime (pivots, walk/talk/point/react), parallax scenes, phone mockup and counters; standard test video 2.
- P5 3D looks: asset kits (Quaternius/Kenney/Poly Pizza CC0 first) with `LICENSES.md`, per-look lighting/material/camera recipe, skeletal clips via `AnimationMixer`, pilot comparing HyperFrames three.js vs Remotion (render time, look); standard test videos 3-5.
- P6 Skills and UI: format router, loadouts, `video`/`lote`/`canal` updates, web format picker, docs; smoke tests for the remaining 3D looks.
- P7 Review: compare all test videos with the references, collect the user's verdict, fix list.

## 11. Risks

| Risk | Mitigation |
|---|---|
| WebGL very slow in headless Chrome | Benchmark in the P5 pilot; use ANGLE/Metal flags; fall back to the existing Remotion three path |
| Pixel sprite quality and consistency | Default to code-drawn procedural pixel plus CC0 sprites; paid generators (PixelLab, Retro Diffusion) opt-in with cost shown |
| Deleting shared code breaks reels/kinetic | P0 decoupling first; per-family delete commits; test gates |
| "Looks cheap" persists | Acceptance A1-A8 plus the reference side-by-side; user approval is the final gate |
| Agent skips skills again | Loadout files enforced by the `video` skill; linter fails if a spec lacks the required fields |
| Asset licensing | `LICENSES.md` plus per-project `brief.md`; Poly Pizza/Sketchfab checked per model |
| Scope creep from 49 formats to many | Only the formats in section 8 exist after P1 |

Out of scope until confirmed: AI video generation (Higgsfield/fal/Veo) and paid sprite APIs.

## 12. Decisions needed from the user

- D1 (blocking P1): confirm assumptions A1-A5, in particular that all 20 illustrated-2d templates (including `rank-numbers`, which was not named explicitly) are deleted.
- D2 (non-blocking): confirm or swap the five test formats in section 9.
- D3 (non-blocking): paid pixel-sprite generators stay opt-in.

## 13. Sources

- HyperFrames: https://github.com/heygen-com/hyperframes and https://hyperframes.heygen.com/introduction
- Headless WebGL without GPU: https://microlink.io/blog/webgl-without-a-gpu, https://github.com/diusworks/mp-video-card
- PixiJS AnimatedSprite: https://pixijs.download/release/docs/scene.AnimatedSpriteOptions.html
- Aseprite CLI: https://www.aseprite.org/cli/
- PixelLab: https://www.pixellab.ai/docs/tools/skeleton-animation; Retro Diffusion: https://replicate.com/retro-diffusion/rd-animation
- Licenses: https://kenney.nl/support, https://quaternius.com/faq.html, https://polyhaven.com/license, https://helpx.adobe.com/gr_en/creative-cloud/faq/mixamo-faq.html
- Local: `.claude/skills/hyperframes*`, `remotion-to-hyperframes`, `media-use`, `threejs-*`; user's references in `/Users/christianmendoza/Desktop/Reference-Video/` and `Guía PIXEL - Videos sin cara en pixel.pdf`.
