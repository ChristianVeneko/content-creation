# Template styles: the six illustrated-kit looks and the four 3D looks

Every illustrated-kit template draws its scenes in code (no stock footage, no emoji) with the same element vocabulary (`card`, `flow`, `compare`, `checklist`, `bars`, `counter`, `code`, `terminal`, `chat`, `doc`, `timeline`, `icon`, `badge`, `stamp`, `callout`, `svg`, `split`). What changes per template is the **look**: palette, typography, panels, element entrances, camera, headline treatment, background, cut effect and scene transition.

- Look registry: `07-studio/engine/lib/illustrated.mjs` (`LOOKS`, `ILLUSTRATED_TEMPLATE_IDS`, `lookOf`, `LOOK_UPSCALE`) and `07-studio/engine/src/illustrated/looks.ts` (render tokens).
- A template picks its look with `defaults.theme.look` in `07-studio/engine/templates/<id>.json`; `illustrated` has no key and keeps `blueprint`.
- Transitions: `src/illustrated/transitions.tsx`. Headlines: `src/illustrated/headlines.tsx`. Backgrounds, HUD skins, ticker and cut effects: `src/illustrated/Chrome.tsx`.
- Safe zone for all looks: x 90..990, y 220..1500 (`REGIONS` in `lib/illustrated.mjs`). Scene cuts land on transition progress 0.5, where the `cut` SFX beat peaks.
- Links were checked on 2026-10-31 (HTTP 200 unless noted). Dribbble tag pages answer with a bot check (HTTP 202) but open normally in a browser.

## At a glance

| Template | Look | Transition | Camera | Entrance | Effect layer |
| --- | --- | --- | --- | --- | --- |
| `illustrated` | blueprint | punch push-cut + soft blue flash | slow push-in 1 to 1.045 | spring pop with overshoot | grid drift, specks, grain |
| `whiteboard` | whiteboard | eraser wipe with a wobbly edge | static with 0.6 px marker boil | marker reveal left to right | paper grain, erased-marker ghosts, rough.js boil |
| `broadcast` | broadcast | hard cut at midpoint + RGB split + white flash | snap zoom 1.05 to 1 on each scene, heavy shake on stamps | snap slide from the left with skew | red light sweep, scanlines, glitch slices, live ticker |
| `editorial-chart` | editorial-chart | zoom-through (old grows 1.4x and blurs, new settles from 0.82x) | slow drift pan with 2% scale | calm fade + rise, in-out cubic | flat newsprint, chart rules, masthead rule |
| `editor-window` | editor-window | CRT power cycle (collapse to a line, expand) + scan line | static | power-on flicker in frame steps | dot grid, line-number gutter, rolling scanlines |
| `rank-numbers` | rank-numbers | whip pan with motion blur and skew | spring settle 1.06 to 1 with a small twist | toy bounce with twist | rotating sunburst, confetti, color burst on the cut |

---

## illustrated (blueprint)

The original look; unchanged by the new templates.

- **References**: Kurzgesagt explainers (https://www.youtube.com/@kurzgesagt) for flat iconic diagrams on dark backgrounds; 3Blue1Brown (https://www.youtube.com/@3blue1brown) for things drawing themselves on; the benchmark reel in `00-docs/benchmark-sebastiankra-vs-engine.md`.
- **Palette**: bg `#0B1020` / `#111A33`, text `#FFFFFF`, accent `#FF7A59`, accent2 `#FFC145`, accent3 `#38D6F5`, good `#3DDC97`, bad `#FF4D6D`.
- **Fonts**: Montserrat 900 headlines (OFL), Inter body (OFL), JetBrains Mono labels (OFL).
- **Motion**: spring pops with overshoot (damping 10, stiffness 170), slow push-in, punch cut whose whoosh peaks on the cut.
- **Effects**: blueprint grid drifting diagonally, floating specks, vignette, film grain, soft blue screen flash on cuts.
- **SFX**: the default kit: `generated/whoosh-*` on cuts, `generated/pop-*` on entrances, `interface/click_*` ticks, `keyboard/keypress-*` typing, `impact/impactSoft_heavy_*` stamps.
- **Best for**: tech explainers, comparisons, processes.
- **Do**: two-tone headline (white kicker + accent main), 2-5 elements per scene. **Don't**: light backgrounds or long paragraphs.

## whiteboard

A teacher sketching on a clean whiteboard: everything looks drawn with markers and wobbles slightly, like hand-drawn animation boil.

- **References**:
  - Minute Physics (https://www.youtube.com/@MinutePhysics): marker-on-white explainers, very few strokes per idea.
  - Excalidraw (https://excalidraw.com) and rough.js (https://roughjs.com): the hand-drawn shape language this look reuses (rough.js draws every frame, card border and callout).
  - HyperFrames blocks in `00-docs/hyperframes-catalog.md`: `hw-boil` (re-pose every N frames), `hw-title` (handwritten title + squiggle underline), `hw-callout-circle`, `hw-box-label`, `hw-pipeline`, `hw-scribble-transition`, `whiteboard-ink`.
- **Palette**: board `#F7F5EF` / `#ECE8DD`, ink `#1F2430`, red marker `#E8452C` (accent), blue marker `#1F6FEB` (accent2), green marker `#1E9E5A` (accent3), muted ink `#6B6F7B`.
- **Fonts**: Permanent Marker for headlines and display text (Apache-2.0, `public/fonts/PermanentMarker-LICENSE.txt`, https://fonts.google.com/specimen/Permanent+Marker); Kalam Bold for kickers, body and labels (OFL, `public/fonts/Kalam-OFL.txt`, https://fonts.google.com/specimen/Kalam). Mixed case, never forced uppercase.
- **Motion and easing**: elements are revealed left to right by a clip that follows an in-out curve (like a marker stroke), no scale and no overshoot; headlines write on letter by letter, then a rough underline draws beneath; numbered steps get a hand-drawn circle; rough strokes re-seed about 6 times per second once drawn (boil); the camera holds still with a sub-pixel jitter every 5 frames.
- **Transition**: eraser wipe. A blue felt eraser rides a wobbly edge from left to right and reveals a clean board, then the next scene draws itself on it.
- **Illustration style**: transparent panels with rough.js rectangles in the element color, hachure-filled bars outlined by hand, icons in marker colors inside a rough circle, stamps written then circled twice, callouts drawn with high roughness.
- **Effects**: paper grain, faint ghosts of erased marker strokes, a soft board frame edge. No glow, no drop shadows.
- **SFX character**: soft and papery. Good fits: `remotion/page-turn.wav` and `remotion/whip.wav` for draws, `ui/switch*.ogg` or `interface/click_00*.ogg` (marker taps), `impact/impactSoft_medium_*` for the circled stamp. Avoid metallic impacts and glitch sounds.
- **Best for**: concept explainers, how-it-works, onboarding, mental models.
- **Do**: 1-4 big simple drawings per scene, circles and arrows to point at the idea, `title.number` for steps. **Don't**: dense panels, many colors at once, dark code windows (code renders on white paper here).

## broadcast

A broadcast news package: red section tab, white lower-third headline bars, a live label in the top bar and a crawling ticker.

- **References**:
  - BBC News (https://www.youtube.com/@BBCNews) and Vox (https://www.youtube.com/@Vox): lower thirds, ticker crawls and section bugs.
  - Dribbble tags (bot check, 202) https://dribbble.com/tags/lower_third and https://dribbble.com/tags/broadcast_design.
  - HyperFrames: `lower-third-bild` (white headline bar with red drop shadow, red sub line), `rgb-glitch-text`, `glitch`, `ticker-takeover`, `caption-glitch-rgb`.
- **Palette**: studio black `#0A0A0C` / `#1C0B0E`, white `#FFFFFF`, news red `#E10600` (accent), alert yellow `#FFD400` (accent2), panels `#1F1F23`.
- **Fonts**: Oswald 500/700 everywhere (OFL, https://fonts.google.com/specimen/Oswald), uppercase.
- **Motion and easing**: snappy expo-out (cubic-bezier 0.16, 1, 0.3, 1) in 0.2-0.25 s; elements slam in from the left with a skew that straightens; headline: the red tab slides in, the white bar wipes open, the text rises inside it; a 1.05 to 1 snap zoom at every scene start; strong camera shake on stamps.
- **Transition**: hard cut at the midpoint, with an RGB split (red/cyan drop shadows) and a horizontal jitter for a few frames around it, plus a full-frame white flash and displaced color slices on the cut.
- **Illustration style**: square panels with a thick red left rule, flat bars (red / white / yellow), counters with a red underline bar, icons in a square keyline frame, stamps as solid red boxes with a white inner keyline (no rotation).
- **Effects**: slow red light sweep, dot map in the center, fine scanlines, vignette, grain, a red rule across the top, and the ticker in the footer band (label = first scene kicker, text = every headline plus the handle).
- **SFX character**: hard and urgent. Good fits: `interface/glitch_002.ogg` / `glitch_004.ogg` on cuts, `impact/impactPunch_heavy_*` or `impact/impactMetal_heavy_*` for stamps, `interface/bong_001.ogg` for counters, `interface/switch_00*.ogg` for pops.
- **Best for**: tech news, launches, incidents, industry updates.
- **Do**: section kickers (ULTIMA HORA, DATOS, REACCIONES), headlines under ~32 characters, stamps for status (CONFIRMADO, OFICIAL), 2-word captions (template default). **Don't**: present fictional events as real; use playful colors or bouncy motion.

## editorial-chart

An editorial data piece on newsprint where the chart is the protagonist.

- **References**:
  - The Pudding (https://pudding.cool) and Our World in Data (https://ourworldindata.org): one clear takeaway per chart, annotations on the data.
  - Financial Times chart doctor, Visual Vocabulary (https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary): which chart for which relationship; the salmon page is a nod to FT print.
  - HyperFrames: `data-chart` (NYT-style typography), `chart-story`, `animated-bar-chart`, `number-wheel`, `zoom-through-transition`.
- **Palette**: newsprint `#FFF1E5` / `#F6E3D3`, ink `#262A33`, editorial blue `#0F5499` (accent), orange `#E3632D` (accent2), teal `#0D7680` (accent3), muted `#66605A`, rules `rgba(38,42,51,0.16)`.
- **Fonts**: DM Serif Display for headlines and numbers (OFL, `public/fonts/DMSerifDisplay-OFL.txt`, https://fonts.google.com/specimen/DM+Serif+Display), sentence case; Inter 600-800 for kickers, axes and labels (OFL).
- **Motion and easing**: calm in-out cubic (0.65, 0, 0.35, 1), 0.8-1.1 s; headline: accent rule draws, kicker fades in, serif headline rises; bars grow slowly from an animated axis with gridlines and tick labels on round numbers; counters count up with a thin rule growing under them; camera drifts 20 px sideways with a 2% scale over the scene. Sparse stages upscale up to 1.3x so charts fill the frame.
- **Transition**: zoom-through. The old chart grows to 1.4x while fading and blurring, the new scene settles in from 0.82x.
- **Illustration style**: flat rectangular bars without glow, y axis with 5 ticks, values above bars in the serif, callouts drawn as clean vector lines (rough.js roughness 0), stamps as ruled annotation tags, icons in a thin ring.
- **Effects**: none that move: horizontal chart rules over the page, a double masthead rule above the title, faint paper noise.
- **SFX character**: quiet and precise; the template lowers SFX to 0.75. Good fits: `ui/click*.ogg` and `interface/select_008.ogg` for bars and ticks, `interface/bong_001.ogg` once for the key number, `remotion/page-turn.wav` for cuts.
- **Best for**: statistics, research findings, market data, trends over time.
- **Do**: one chart per scene, real values with a unit, a callout on the bar that matters, cite sources in the narration. **Don't**: decorative icons as the main visual, more than 5 bars, rotated stamps.

## editor-window

An editor-first coding tutorial at night.

- **References**:
  - Fireship (https://www.youtube.com/@Fireship) and CodeAesthetic (https://www.youtube.com/@CodeAesthetic): code as the hero, quick steps, diffs.
  - Code Hike (https://codehike.org) and the local Remotion template `05-tools/repos/templates/remotion-dev_template-code-hike`: animated code walkthroughs.
  - Dracula theme (https://draculatheme.com): the syntax palette family.
  - HyperFrames: `code-terminal-run` (typed prompt with a caret), `dynamic-grid`, `caption-glitch-rgb` (CRT scanlines).
- **Palette**: bg `#15161C` / `#22232D`, editor `#1E1F29`, tab bar `#14151B`, terminal `#0E0F14`, text `#F8F8F2`, green `#50FA7B` (accent), pink `#FF79C6` (accent2), cyan `#8BE9FD` (accent3), red `#FF5555`, comments `#7D88B3`.
- **Fonts**: JetBrains Mono 500/700/800 for everything (OFL, https://www.jetbrains.com/lp/mono/), mixed case.
- **Motion and easing**: no camera movement at all; elements power on with a stepped opacity flicker (0, 0.7, 0.15, 0.9, 0.5, 1) while sliding up 24 px; the headline is a prompt line (`> `) typed character by character with a pink block cursor; a `PASO 01` badge and a file tab (the kicker) above it.
- **Transition**: CRT power cycle. The old screen collapses vertically to a bright line, the new one expands from it, and a cyan scan line sweeps down through the cut.
- **Illustration style**: code windows with editor tabs (active tab + ghost tab), line numbers, Dracula syntax colors, diff lines (`+ ` green tint and bar, `- ` red tint and bar), terminals that type `$` commands and print output; long lines shrink to fit; stamps as `// COMMENT` boxes; icons in a rounded glowing keyline; segmented progress bars in the HUD.
- **Effects**: dot grid, a faint line-number gutter down the left edge, rolling CRT scanlines, vignette.
- **SFX character**: mechanical keyboard and clicks. Good fits: `keyboard/keypress-*` (typing), `ui/switch*.ogg` for flickers, `interface/error_005.ogg` for a red diff line, `interface/glitch_002.ogg` for the CRT cut.
- **Best for**: coding tutorials, CLI tips, refactors and diffs, dev tooling.
- **Do**: one step per scene with `title.number`, max 8 code lines of 48 characters, terminal output without `$`. **Don't**: emoji in code, screenshots of code, more than one code window per scene.

## rank-numbers

An illustrated countdown with game-show energy.

- **References**:
  - WatchMojo (https://www.youtube.com/@WatchMojo): numbered countdown structure, best item last.
  - Dribbble countdown tag (bot check, 202): https://dribbble.com/tags/countdown.
  - HyperFrames: `whip-pan-cut`, `whip-pan`, `number-pop-in`, `velocity-throw-snap`.
- **Palette**: deep purple `#22073A` / `#4A1580`, white `#FFFFFF`, yellow `#FFE600` (accent), hot pink `#FF3D7F` (accent2), cyan `#00E5FF` (accent3), hard shadow `#12021F`.
- **Fonts**: Anton for headlines and rank numbers (OFL, https://fonts.google.com/specimen/Anton), Montserrat 800 for kickers and body (OFL, https://fonts.google.com/specimen/Montserrat), uppercase.
- **Motion and easing**: springy and bouncy (damping 7-11); the rank number slams from 3.2x to 1x with a cyan shock ring, then title words drop in one by one with the last word in the accent color; elements bounce in from 0.3x with a twist; the camera settles from 1.06x with a 1.5 degree twist at each scene start.
- **Transition**: whip pan. Both scenes fly left together with up to 22 px blur and a skew, plus a yellow-to-pink color burst on the cut.
- **Illustration style**: chunky rounded panels with thick white borders and hard drop shadows, icons on a dark disc inside rotating sun rays, sticker badges with white outlines, pill bars, stamps tilted -12 degrees.
- **Effects**: rotating sunburst behind the stage, drifting confetti, vignette.
- **SFX character**: punchy and fun. Good fits: `remotion/whip.wav` on cuts, `impact/impactPunch_heavy_*` on the rank slam, `generated/pop-*` on entrances, `interface/bong_001.ogg` for number one.
- **Best for**: top N lists, tools and apps, tips, mistakes to avoid, rankings.
- **Do**: hook scene, one item per scene counting down with `title.number`, a HUD chip with `N/total`, payoff scene. **Don't**: more than 3 elements per item scene, long item names (2-4 words).

## Fonts added for these looks

| File | Family | License |
| --- | --- | --- |
| `07-studio/engine/public/fonts/PermanentMarker-Regular.ttf` | Permanent Marker | Apache-2.0 (`PermanentMarker-LICENSE.txt`) |
| `07-studio/engine/public/fonts/Kalam-Bold.ttf` | Kalam | SIL OFL 1.1 (`Kalam-OFL.txt`) |
| `07-studio/engine/public/fonts/DMSerifDisplay-Regular.ttf` | DM Serif Display | SIL OFL 1.1 (`DMSerifDisplay-OFL.txt`) |

All three come from the google/fonts repository (https://github.com/google/fonts) and are loaded by `ensureLookFonts()` in `src/illustrated/looks.ts`.

## 3D looks (three.js)

Four templates render every scene as a real 3D scene with three.js through `@remotion/three` (React Three Fiber). The scene vocabulary is `visual.type: "scene3d"` with `objects[]` of procedural kinds (`phone`, `server`, `database`, `chart`, `stat`, `lock`, `icon`...), a `layout`, a `camera` move, optional `connect` arrows, `focus` and `explode` (schema: `07-studio/engine/lib/scene3d.mjs`). Headline, captions, HUD, footer, SFX and music are the illustrated kit's, so they stay sharp and inside the safe zone.

- **Style, not scenery.** A 3D template supplies camera, light, materials, motion and fx only. The agent builds every model (`custom` parts) and the world (`visual.world`: concept, ground, backdrop, parts, crowd) from scratch for each video, may try 2-4 `shots` per scene, and stock catalog content (characters, cars, models, sets) needs `stock: true`. Isometric is `iso-toon` only.
- **Formats**: `data-stage` (dark arena, spotlights, crowd, receding rows, scales and tubes), `monolith-story` (one recurring monolith, color-keyed backdrop per scene, pixel signs), `clay-mascot` (clay look with a mascot pinned to a screen corner), `cutaway-explainer` (low-poly cutaway set, pull-out reveal camera, overlay kit of flow chips, concept pill, limit bar and not-equal card, signal dots along pipes).
- Look registry: `lib/scene3d.mjs` (`THREE_D_TEMPLATE_IDS`, camera language in `LOOK3D`, layout, `cameraAt`, `projectPoint`) and `src/three/looks.ts` (materials, floor, lights, tone mapping, bloom, label skin).
- Kit: `src/three/kit.tsx` (materials per look, `Part`/`RBox`, extruded Phosphor icons, `CameraRig`, `Lights`, `Floor`, seeded `Particles`, `Connection` arrows, `BloomRender`), `src/three/objects.tsx` (procedural objects), `src/three/Scene3D.tsx` (scene + 2D labels locked to 3D anchors), `src/three/transitions.tsx`.
- Every motion is a function of the frame (no `useFrame` animation, no clock, no `Math.random`); renders use `gl: "angle"`; the same frame renders to identical bytes (`test/three-render.test.mjs`).
- Assets: procedural first; optional CC0 GLB models and HDRIs from `03-assets/3d/` (`licenses.json`), staged per job.

| Template | Materials | Lighting | Camera | Entrance | Transition | Effects |
| --- | --- | --- | --- | --- | --- | --- |
| `clay-diorama` | matte clay (roughness 0.82), pastel | warm hemisphere + soft key with 2048 shadow map, HDRI `brown-photostudio-02` at 0.45 | perspective 30 deg, auto moves orbit / dolly / crane / orbit / push | drop-in with squash and stretch | iris pop (old set shrinks, new opens through a growing circle) | floating plinth with a floor shadow, dust motes, light vignette |
| `iso-toon` | 3-band toon + dark outlines | ambient + one hard key, crisp shadows, no tone mapping | orthographic, true isometric (35.264 / 45 deg), pan / dolly / orbit (+-8 deg) / static | grow from the ground | isometric pan (both shots slide along the 30 deg axis) | grid platform, floating cubes, arrows with travelling packets |
| `neon-glass` | frosted glass (transmission 0.92) + emissive edges | two colored point lights + Lightformer studio, ACES | perspective 34 deg, push-in punch / orbit / dolly / crane | flicker-in with a spin | light streak: hard cut with RGB split and a white line | bloom (UnrealBloomPass), reflective floor, scrolling neon grid, sparks |
| `pedestal` | clearcoat gloss, metal accents | studio HDRI `studio-small-09` + spot key + warm/cool rims, ACES | perspective 26 deg, turntable / push / orbit / dolly; hero rocks +-0.55 rad | swing-in from above with a turn | cinematic dip (push + blur to black, settle back) | mirror floor, pedestal, dashed callouts, gold motes, strong vignette |

### clay-diorama

A tactile miniature world, like a stop-motion set.

- **References**: claymation desk loop "animated on twos" (`05-tools/repos/awesome-opus5-5-videos/prompts/wikiwayne-080350.md`); diorama / snow-globe miniatures (`eigeorguy-813651.md`, `lribes4-742305.md`); Skillry Opus 5.5 gallery (https://skillry.dev/ai-videos/opus-5-5).
- **Palette**: cream `#F7EFE5` / `#E9DCCD`, ink `#2B2433`, coral `#FF7A59` (accent), periwinkle `#7C6CFF` (accent2), mint `#2FB98F` (accent3); lavender plinth (accent2 mixed 72% with white).
- **Materials and lighting**: `meshStandardMaterial` roughness 0.82, metalness 0; warm sky / lilac ground hemisphere; soft key from above-right with PCF shadows; neutral tone mapping keeps pastels true.
- **Camera**: slow 28-degree orbit, dolly-in, crane; objects drop in with squash and stretch and a gentle idle float.
- **Labels**: white pills with dark text and a soft shadow; stat numbers in coral.
- **SFX character**: soft pops and whooshes (`generated/pop-*`, `remotion/whoosh.wav`); music mood `upbeat-fun` by default.
- **Best for**: friendly explainers, personal finance, how something works, product tours for beginners.

### iso-toon

A clean isometric system diagram that builds itself.

- **References**: isometric 2.5D process animation (`nft-chen-068069.md`); ISO-GLOW isometric skill post (https://x.com/Aprilzz423/status/2109294655489868227, unverified); `iart-ai/explainer-video-skills` isometric-animation (https://github.com/iart-ai/explainer-video-skills); `htekdev/explainer-3d` components (https://github.com/htekdev/explainer-3d).
- **Palette**: navy `#0E1630` / `#18264F`, cream text `#F4F1EA`, coral `#FF6B57` (accent), amber `#FFC857` (accent2), cyan `#4CC9F0` (accent3); outlines `#0A1024`; platform navy tinted with cyan.
- **Materials and lighting**: `meshToonMaterial` with a 3-step Nearest ramp and drei `Outlines`; flat (no tone mapping) so palette colors stay exact.
- **Camera**: orthographic at the true isometric angle; pans along the process, dolly, small orbit; `stack` layouts get translucent layer plates.
- **Labels**: dark navy cards with a cyan border and a hard offset shadow.
- **SFX character**: clicks and pops on each block, whoosh on the pan; music mood `corporate-happy`.
- **Best for**: software architecture, how the internet works, pipelines, step-by-step systems.

### neon-glass

Dark, glowing, high energy.

- **References**: "inside your mind" Remotion + three.js piece (`argbeknwn-466818.md`); AI data-centre tour (`mdaman010-111079.md`); `htekdev/explainer-3d` dark `#0A0A1A` palette with bloom.
- **Palette**: near-black `#04050B` / `#0B0F24`, white text, cyan `#00E5FF` (accent), hot pink `#FF2E88` (accent2), violet `#A78BFA` (accent3).
- **Materials and lighting**: `meshPhysicalMaterial` transmission 0.92, roughness 0.14, ior 1.45 tinted by the object color; emissive parts above the bloom threshold; cyan and pink point lights; Lightformer environment.
- **Camera**: punch-in on the cut, orbit, dolly, crane; objects flicker in with a spin; highlight rings pulse.
- **Effects**: three.js `UnrealBloomPass` (strength 0.75, threshold 0.9) built synchronously so stills and the first frame of every scene are complete; mirror floor with a scrolling grid; sparks.
- **SFX character**: synth whooshes and glitch hits on the light-streak cut; music mood `tech-lofi`.
- **Best for**: AI and tech news, cybersecurity, crypto, futuristic hooks.

### pedestal

A product launch film for one object.

- **References**: three.js exploded phone with dashed callouts (`nft-chen-068069.md`); 3D logo / product intro with a glint (`juancarlos17626-429530.md`); Apple keynote product shots.
- **Palette**: black `#08080B` / `#1B1B22`, text `#F5F5F7`, amber-gold `#FF9F0A` (accent), silver `#D9D9E0` (accent2), sky `#64D2FF` (accent3).
- **Materials and lighting**: clearcoat `meshPhysicalMaterial`, metal accents; Poly Haven `studio_small_09` HDRI (CC0) plus a spot key and warm/cool rim lights; ACES tone mapping.
- **Camera**: turntable, push-in on details, orbit; the hero rocks on its pedestal; `explode: true` sends parts out from the center.
- **Labels**: thin uppercase text with dashed leader lines to a gold dot on the object (above the object when it sits near the frame edge).
- **SFX character**: deep whooshes on the dip, soft clicks; music mood `cinematic-epic`.
- **Best for**: product reviews, gadget launches, app features, "what is inside" videos.


---

# Art-style looks (six 2D media) and three more 3D looks

The art looks are illustrated-kit templates (category `illustrated-2d`): same element vocabulary, HUD and safe zone, but each one is a **medium** with its own texture, panel skin, headline, entrance, camera, transition, cut effect and SFX voice. Code: `src/illustrated/artstyles.tsx` (backgrounds, SVG texture filters, panels, headlines, HUD skins, cut effects), `src/illustrated/art-transitions.tsx`, entrances in `src/illustrated/kit.tsx` (`useEnter`), cameras in `src/illustrated/IllustratedScene.tsx`, SFX voice in `lib/illustrated.mjs` (`LOOK_SFX`: which kit sound plays on cuts and entrances; beat times never move). The 3D looks extend `src/three/looks.ts`, `kit.tsx` (materials, lights, floors, particles), `transitions.tsx`, `headlines3d.tsx` (headline skins and lens overlays) and `lib/scene3d.mjs` (`LOOK3D` camera language).

Everything is procedural (SVG `feTurbulence` / `feDisplacementMap`, CSS gradients, three.js primitives). No texture files, no models beyond the CC0 set in `03-assets/3d`, no emoji, no mascot.

## Research: code-based style projects cited by El Telar

Source: https://eltelar.es/articulos/video-ia-herramientas.html (read 2026-11-01). Licenses checked with the GitHub API the same day. Only ideas (style grammar) were taken; no code, assets or text was copied.

| Project | Repo | License | What we took |
| --- | --- | --- | --- |
| Lemo-Opuscar (51 film styles as Claude Code skill) | https://github.com/lemomo-ai/lemo-opuscar | MIT | Style grammar from `styles/watercolor`, `risograph`, `ukiyoe`, `ink-wash`, `chalkboard`, `papercut-red`, `brick-toy`, `lowpoly-island`, `hologram-hud`, `tilt-shift`: pooled-edge washes, overprint and misregistration, washi + bokashi + seals, chalk written in stroke order with one-pass wipes, 12 fps stepping for cut paper and bricks with a smooth camera, flat-shaded low-poly, scan-plane holograms with rolling glyph numbers, tilt-shift blur band. Also its rule "deterministic render(t), animate on twos only where the style wants it". |
| Claude Animation Base (p5.js + p5.brush watercolor) | https://github.com/JohnHeibel/ClaudeAnimationBase | MIT | Watercolor fills as layered translucent displaced shapes with a darker edge, painted in over time (our `washUri`, `bloom` entrance). The mascot it animates was not used. |
| gbro-collage-broll (paper collage B-roll) | https://github.com/pyang5166/gbro-collage-broll | MIT | A shot that assembles itself from paper pieces in a few seconds (our ransom-note headline and stop-motion scrap entrances). Its Gemini pipeline was not used. |
| HyperFrames (HeyGen, video as HTML) | https://github.com/heygen-com/hyperframes | Apache-2.0 | Already catalogued in `00-docs/hyperframes-catalog.md`; reconfirmed the "page as a function of time" approach. |
| onetake | https://github.com/feitangyuan/onetake | PolyForm Noncommercial | **Excluded** (not commercial-safe). |

## At a glance (new templates)

| Template | Category | Transition | Camera | Entrance | Effect layer | SFX voice (cut / pop) |
| --- | --- | --- | --- | --- | --- | --- |
| `watercolor` | illustrated-2d | wash dissolve: soft blooms open one after another and merge | float: slow pendulum sway | bloom: blur 14 px to sharp, 0.95 s | cold-press paper grain, breathing pigment blooms, splatter, deckled vignette | draw (soft whip) / tick |
| `paper-collage` | illustrated-2d | paper slide: a torn sheet slides up in 8 held poses with its shadow | jitter: camera re-placed every 12 fps pose | stopmo: slid in at 12 fps with overshoot, tiny boil after landing | kraft fibres, corrugation, paper scraps and masking tape at the edges | page / tick |
| `chalkboard` | illustrated-2d | smudge wipe: a diagonal felt smear, old lesson blurs away | tilt: slow pan up the board | chalk: written on left to right, dusty while fresh | slate mottling, eraser arcs, SVG chalk filter on every stroke, wooden frame and tray, chalk-dust puff on the cut | draw / tick |
| `risograph` | illustrated-2d | halftone wipe: dots swell diagonally into solid ink | plate: press creep with registration wobble every 3 frames | misprint: lands off register with a pink plate trailing, snaps together | off-white stock, halftone sun and horizon, feed streaks, ink grain, SVG misregistration filter, plate flash on the cut | default |
| `ukiyo-e` | illustrated-2d | ink bleed: a sumi blot floods the print, then thins into the paper | scroll: handscroll pan right to left | brush: ink spreads from the left edge out of a blur | washi fibres, bokashi sky, seigaiha wave band, double key-block border, seal, SVG print-grain filter | page / tick |
| `ui-cards` | illustrated-2d | template default | slow push-in | spring pop | navy grid with drifting dust, top light, parallax orbs, contact shadows, lit card gradients, vignette | default |
| `flat-depth` | illustrated-2d | template default | dolly: slow lateral dolly along the table with a 3.5% push | drop: falls onto the table, squashes on contact | dark gradient wall, ceiling spot, wooden table in one-point perspective with a drifting vanishing point, contact shadows | default |
| `soft-gradient` | illustrated-2d | template default | drift: slow pan with 2% scale | rise: fade + rise | drifting pastel mesh gradient, two parallax orb layers, frosted glass panels, soft long shadows | default |
| `host-tutorial` | illustrated-2d | template default | settle: spring settle at scene start | pop | warm paper texture, halftone dot corner, hard-shadow cards, fixed cutout host at the bottom | halftone-dot swell |
| `checklist-glass` | illustrated-2d | template default | drift | rise | pastel mesh with a glossy sheen, frosted UI-mockup cards, progress pill, bottom-right mascot | default |
| `spotlight-narrative` | illustrated-2d | template default | push: slow push-in | rise | dark vignette, one spotlight cone, pulsing floor rings, dust, light leak, grain | zoom-through |
| `data-atlas` | illustrated-2d | template default | drift (the backdrop layers add their own parallax dolly) | rise | night haze, warm glow, drifting motes and a heavy vignette over a layered backdrop painted with generators (globe, starfield, sky, terrain, rails, wheat, sea, wood, cracked earth, map); dark pill counter, particle map with a self-drawing route, parchment or blueprint ledger | slow cross-dissolve with a push-in |
| `pop-comic` | illustrated-2d | panel slam: next panel slams in on a diagonal with speed lines and a burst outline | dutch: punch-in on a tilted angle | slam: drops from 1.6x with overshoot and twist | yellow stock, Ben-Day dots, speed rays, gutter frame, newsprint dot screen, action burst on the cut | stamp (impact) / pop |
| `paper-world` | 3d | page turn hinged on the left edge | crane / orbit / dolly / push, pitch 40 | unfold: stands up from the page on its hinge | flat-shaded paper, 9-sided paper island with cone trees and hills, falling paper confetti, paper grain overlay | default |
| `toy-blocks` | 3d | block build: tiles snap in bottom-up in 10 held poses | macro long lens (fov 17): orbit / topdown / dolly / pan | snap: drops in 0.3-unit steps on twos, clicks in | glossy plastic, studded baseplate on a wooden desk, tilt-shift blur bands, falling bricks | default |
| `holo-studio` | 3d | scanline swap: old hologram thins into scanlines, new one is redrawn line by line | turntable / orbit / push / crane, eye level | scan: a glowing scan ring grows the object upward with a flicker | translucent iridescent shells with cyan rims, projector pad rings and light cone, bloom, fog, data motes, scanlines, HUD rulers | default |

---

## watercolor

A naturalist's field journal that paints itself.

- **References**: Lemo-Opuscar `styles/watercolor/STYLE.md` (MIT, grammar only: translucent strokes, pooled edges, specimen + handwritten note); Claude Animation Base / p5.brush watercolor fills (MIT); botanical plates and field journals in general.
- **Palette**: paper `#F7F1E5` / `#EDE3CF`, sepia ink text `#2F2E2B`, ultramarine `#3B6FB6` (accent), rose madder `#D9667A` (accent2), sap green `#5E9B62` (accent3), muted `#7A7268`.
- **Fonts**: Fraunces (OFL, variable, display 650) for titles and panel text; Caveat (OFL) for kickers, labels and notes. Files and licenses: `public/looks/fonts/`, `03-assets/fonts/`.
- **Motion and easing**: entrances bleed in from a 14 px blur on a gentle ease (0.95 s) with a small idle drift; titles fade in from blur while a painted swash sweeps behind them; camera sways like a drying sheet.
- **Transition**: wash dissolve. Fourteen soft-edged blooms open at seeded spots, staggered, and merge into the next page.
- **Illustration style**: no borders; every panel, badge and icon halo is a displaced translucent wash with a darker pooled edge and a second glaze.
- **SFX**: cuts voice `draw` (soft whip), entrances `tick` (quiet taps); music mood `inspiring-uplifting`; captions `pills`.
- **Do**: few airy elements, one big icon, real numbers. **Don't**: code panels, dense text, many colors per scene.

## paper-collage

A stop-motion zine made of torn paper on kraft board.

- **References**: gbro-collage-broll (MIT, grammar: shots assembling from paper scraps); Lemo-Opuscar `papercut-red` (MIT, grammar: 12 fps held poses, paper is the drawing); ransom-note and punk-zine collage.
- **Palette**: kraft `#CDA77E` / `#B88C62`, ink `#1E1A17`, tomato `#E84A2F` (accent), mustard `#F2B632` (accent2), cobalt `#2F5DD9` (accent3), paper `#FBF7EE`.
- **Fonts**: ransom-note title mixes Archivo Black, DM Serif Display, Rubik Mono One and Anton (all OFL) word by word; body Rubik (OFL).
- **Motion and easing**: everything is quantized to 12 fps poses; scraps slide in from below-right with an overshoot and keep a 0.9 degree boil; the camera is re-placed every pose.
- **Transition**: paper slide. A new sheet with a torn top edge and a soft shadow is pushed up in 8 held poses while the old scene darkens and drops.
- **Illustration style**: torn-edge scraps (SVG polygons with jagged edges) with layered soft shadows, masking-tape labels, scrap-paper icon halos and badges.
- **SFX**: cuts voice `page` (paper slide), entrances `tick`; music mood `upbeat-fun`; captions `boxed`.
- **Do**: 2-5 word titles, chunky elements, a stamp verdict. **Don't**: long paragraphs, smooth tweens.

## chalkboard

A real classroom blackboard; one idea per board.

- **References**: Lemo-Opuscar `chalkboard` (MIT, grammar: chalk written in stroke order, one-pass wipe, three chalks at most, wooden frame and tray); classroom lessons in general.
- **Palette**: slate `#26392F` / `#1B2A24`, chalk white `#F2F1EA`, chalk yellow `#F4E285` (accent), chalk pink `#F2A0B6` (accent2), chalk blue `#9FD3E8` (accent3).
- **Fonts**: Fredericka the Great (OFL) for titles; Patrick Hand (OFL) for kickers, body and labels.
- **Motion and easing**: elements and titles are written on left to right at hand speed (linear), dusty while fresh; rough.js chalk frames and underlines with high roughness; the camera pans slowly up the board.
- **Transition**: smudge wipe: a diagonal felt-eraser smear band crosses the board; the old lesson blurs away and a puff of chalk dust follows the cut.
- **Illustration style**: an SVG chalk filter (fractal noise alpha + slight displacement) on every stroke of the scene; dashed chalk HUD; no shadows.
- **SFX**: cuts voice `draw` (swipe), entrances `tick` (chalk taps); music mood `minimal-ambient`; captions `clean`.
- **Do**: steps with `title.number`, circle the key term. **Don't**: more than three chalk colors in a scene.

## risograph

An indie zine printed on a stencil duplicator.

- **References**: Lemo-Opuscar `risograph` (MIT, grammar: 2-3 translucent spot inks, overprint mixing, misregistration, halftones, pinholes and feed streaks); riso print shops and zines in general.
- **Palette**: stock `#F4EFE3` / `#EDE6D6`, blue ink text `#1D235C`, fluoro pink `#FF48B0` (accent), yellow `#FFE800` (accent2), medium blue `#0078BF` (accent3).
- **Fonts**: Rubik Mono One (OFL) wide display; Space Mono Bold (OFL) for body and labels.
- **Motion and easing**: entrances land off register (30 px) with the pink plate trailing, then snap together on a back-out ease; titles print in two plates that creep into register; the press creeps the sheet sideways with a 3-frame registration wobble.
- **Transition**: halftone wipe: a 40 px dot screen swells diagonally until the dots merge into the next print, while the old plate slips off register.
- **Illustration style**: flat ink fields with a halftone tint and an offset second plate; an SVG misregistration + ink-grain filter on every scene; a plate flash on the cut.
- **SFX**: default kit; music mood `tech-lofi`; captions `boxed`.
- **Do**: short bold words, big flat numbers. **Don't**: gradients, glows or photographic shading.

## ukiyo-e

A woodblock print unrolled like a handscroll.

- **References**: Lemo-Opuscar `ukiyoe` and `ink-wash` (MIT, grammar: washi, bokashi, out-of-register blocks, vertical cartouche and red seal; sumi strokes that bleed). No famous print is reproduced.
- **Palette**: washi `#F1E6CE` / `#E5D4B0`, sumi `#1A1A1A`, vermilion `#C8372D` (accent), ochre `#C9A04A` (accent2), Prussian blue `#1F4E79` (accent3).
- **Fonts**: Gloock (OFL) display; Rubik (OFL) for the cartouche and body.
- **Motion and easing**: elements spread in from the left edge like ink on wet paper (circle reveal + blur); the title prints in and a tapered sumi stroke is brushed under it; the camera pans like an unrolling handscroll.
- **Transition**: ink bleed: a displaced sumi blot floods the scene, then thins and blurs into the paper as the next print appears.
- **Illustration style**: double key-block borders, brush ensō behind icons, vermilion hanko seals for stamps and badges, an SVG print-grain filter on every scene.
- **SFX**: cuts voice `page` (the scroll turns), entrances `tick`; music mood `cinematic-epic`; captions `boxed`.
- **Do**: calm pacing, empty space, 1-3 word kickers. **Don't**: busy layouts or bright extra colors.

## pop-comic

A retro pop-art comic page.

- **References**: Ben-Day dot printing and 1960s pop art in general; comic panel grammar (caption boxes, speech bubbles, action bursts). No existing character or artwork is reproduced.
- **Palette**: yellow stock `#FFE14D` / `#FFC93C`, ink `#111111`, red `#E8262B` (accent), yellow `#FFD400` (accent2), cyan `#1FA8E0` (accent3).
- **Fonts**: Bangers (OFL) titles; Comic Neue Bold (OFL) for captions and body.
- **Motion and easing**: elements slam in from 1.6x with a springy overshoot and a twist; titles slam on a dutch angle; strong camera shake on stamps.
- **Transition**: panel slam: the next panel flies in on a diagonal with a black gutter, speed lines and a burst outline, shoving the old panel out.
- **Illustration style**: 7 px ink borders with 12 px hard shadows, Ben-Day tints in panels, starburst icon halos, speech-bubble chats with ink outlines, action-burst stamps, outlined counters.
- **SFX**: cuts voice `stamp` (impact), entrances `pop`; music mood `upbeat-fun`; captions `boxed`.
- **Do**: punchy caps, one-word bursts (`BOOM`, `NOPE`). **Don't**: long sentences in bubbles.

## paper-world (3D)

A pop-up book world.

- **References**: Lemo-Opuscar `paper-popup` and `lowpoly-island` (MIT, grammar: flat-shaded low-poly, pieces that arrive with a bounce, sky gradient instead of a horizon).
- **Palette**: `#FCEFD8` / `#F1D9B5` sky, text `#3A3330`, coral `#E76F51` (accent), sand `#E9C46A` (accent2), leaf `#6DB37E` (accent3).
- **Fonts**: Baloo 2 (OFL) for banners and labels.
- **Materials and lighting**: `meshStandardMaterial` with `flatShading`, roughness 1, colors pulled 12% toward paper white; warm low sun with long soft shadows; a 9-sided paper island with cone trees and icosahedron hills behind the subject.
- **Camera**: perspective fov 28 at pitch 40; crane, orbit, dolly, push. Objects unfold from the page on their hinge.
- **Transition**: page turn hinged on the left edge. **Headline**: a cut paper banner with folded ends that unfolds down.
- **Best for**: stories, journeys, cities and sustainability, onboarding.

## toy-blocks (3D)

Macro toy photography on a desk. Generic bricks only (no brand names, logos or minifigure silhouettes).

- **References**: Lemo-Opuscar `brick-toy` and `tilt-shift` (MIT, grammar: glossy ABS with softbox highlights, studs on every top face, stop-motion poses on twos with a smooth camera, sharp band + blur above and below).
- **Palette**: warm desk light `#FFF4DA` / `#EBD3A6`, text `#1A1A1A`, red `#E3262E` (accent), yellow `#FFD500` (accent2), green `#2BB24C` (accent3).
- **Fonts**: Rubik (OFL) for the brick headline and labels.
- **Materials and lighting**: clearcoat `meshPhysicalMaterial` (roughness 0.3); a studded baseplate (instanced studs) on a wooden desk; two softbox Lightformers and a key light; ACES tone mapping.
- **Camera**: telephoto fov 17 (macro), orbit / topdown / dolly / pan; tilt-shift blur bands (CSS backdrop blur with a gradient mask).
- **Transition**: block build, bottom-up tiles in 10 held poses. **Headline**: title on a toy brick with studs, dropped on twos.
- **Best for**: playful tech, building a business, systems, kids topics.

## holo-studio (3D)

Holograms on a projector pad in a dark studio.

- **References**: Lemo-Opuscar `hologram-hud` (MIT, grammar: scan plane grows the subject, round projector pad, three depth layers, numbers rolling from garbage glyphs).
- **Palette**: `#02060B` / `#06161F`, text `#E9FDFF`, cyan `#2DE2FF` (accent), violet `#B26BFF` (accent2), mint `#38F2A6` (accent3).
- **Fonts**: Chakra Petch SemiBold (OFL) titles; Share Tech Mono (OFL) kickers and labels.
- **Materials and lighting**: translucent iridescent `meshPhysicalMaterial` (opacity 0.42, iridescence 1) with cyan drei `Outlines` as rims; projector pad with emissive rings, a faint light cone and a grid; bloom (strength 0.6, threshold 0.88) and fog.
- **Camera**: eye-level turntable, orbit, push, crane; objects hover and rock on the pad. Entrance: a glowing scan ring grows each object upward.
- **Transition**: scanline swap. **Headline**: thin glowing caps in corner brackets; the kicker rolls from glyphs into text.
- **Best for**: AI, cybersecurity, specs and teardowns, data.

## Depth pass and depth formats (2026-11-01)

Reference: the dark-grid UI explainers (sebastiankra.ia) and the flat 2.5D scenes (blacksaless) in `00-docs/format-research.md`. Original designs; no characters, logos or scenes were copied.

- **Depth pass** (opt-in per look, `LOOK_DEPTH` in `07-studio/engine/lib/illustrated.mjs`, drawn by `src/illustrated/depth.tsx`): soft contact shadows on the ground under each element, panels with a lit-top / shaded-bottom overlay and a 1.5 px top highlight over a soft ambient shadow, parallax background layers (far blurred orbs, near bokeh) that drift slowly, a ground plane and a vignette.
  - `illustrated` (blueprint): perspective grid floor rolling toward the camera with a glowing horizon.
  - `broadcast`: glossy studio floor with converging lines and a red reflection; orbs glow red.
  - `editorial-chart`: paper lift only (light contact shadows, lifted panels, faint vignette); no orbs, the page stays flat.
  - `rank-numbers`: a lit round podium with a rim light and a pulsing glow.
  - Whiteboard, editor-window and the six art styles are unchanged on purpose: their media are flat.
- **`ui-cards`**: Montserrat 900 two-line header (white kicker line, accent main line), HUD of labeled bars in a dark glass bar, word-pill captions, handle footer.
- **`flat-depth`**: Baloo 2 headline whose words light up one by one, the active word on a yellow chip; objects drawn with a lit face and a shade face; stacks stand on the table's front edge.
- **`host-tutorial`**: bold sans headline with a serif-italic accent word (Fraunces), mono step kicker, white hard-shadow panels.
- **`checklist-glass`**: same headline treatment, a frosted progress pill with a fill track, glass panels.
- **`spotlight-narrative`**: Fraunces 700 headline with a tracked kicker, glowing beacon rings, dark panels.
- **`data-atlas`**: Montserrat 800 numbers in a dark pill, mono ledger text on paper, two-tone captions at the top (y 230–480). Full-bleed backdrop (fills the entire 1080x1920 canvas) with optional 2.5D layered parallax (`mode: "parallax"` default) or flat mode (`mode: "flat"`). Parallax adds multi-plane drift, atmospheric haze, and depth-of-field blur on far/near planes at an 18% render cost.
- **`cutaway-explainer` (3D)**: Low-poly architectural and mechanical cutaways with a recurring character. Dynamic camera moves (`reveal`, `shoulder`, `through`, `pullout`). Overlay kit of diegetic flow chips, accent-colored concept pills, limit/demand bars, not-equal cards, and pipe signal pulse effects. Supports both Three.js (Remotion real-time 33 fps) and Blender 5.2.3 Eevee (`theme.renderer = "blender"`, photorealistic contact shadows and PBR shaders).
- **`engineering-explainer` (3D Master Template)**: Engineering, process, and physical forensics explainer template. Built for multi-phase diorama cutaways (earth strata, foundations, piping networks, hydrostatic pressure, structural steel cages). Replaces simple isometric idle loops with 7 physical timeline state-transition motions: `dig` (excavation), `pour` (concrete/liquid pouring), `fill` (fluid volume rising), `drain` (emptying), `collapse` (unreinforced wall fracture and failure), `buoyancy` (hydrostatic upward flotation of empty structures like a boat), and `insert` (spring valves, couplings and parts snapping into position). Directly supports 5 core engineering archetypes:
  1. `como-funciona` / `how-it-works`: Internal fluid/mechanical process, continuous functioning.
  2. `paso-a-paso` / `process-construction`: Step-by-step construction, layers, sequential assembly.
  3. `que-paso` / `failure-forensics`: Forensic failure analysis, structural collapse, hydrostatic buoyancy failure.
  4. `para-que-sirve` / `component-purpose`: Hidden or specialized engineering solutions (hydrostatic relief valves, expansion joints).
  5. `fuerzas-ingenieria` / `engineering-forces`: Physical forces, upward hydrostatic pressure vs gravity, stress vectors.
- **Persistent stage (any 3D look, best with `engineering-explainer`)**: a top-level `stage` keeps one low-poly world (actors, strata terrain with `carve` dig/raise/collapse beats, liquids with `level` beats, instanced `scatter` for grass, flowers and trees) across all scenes; scenes declare `shots`, `beats` (word-synced tweens) and a continuous camera (`zoom-to`, `dive` into the cutaway). Titles sit on a palette-derived pill. See `07-studio/engine/examples/stage-yard.spec.json` and the spec-writer 3D section.
- **`soft-gradient`**: Rubik 800 headline with a gradient last word, a frosted pill kicker, glass panels with `backdrop-filter`.
- **Format elements** (`src/illustrated/format-elements.tsx`): `post`, `chart`, `meter`, `hourglass`, `tags`, `stat`, `timer`, `panels`, `object`, `character`. They work in every illustrated-kit look. `character` is a generic person (round or blocky); there is no mascot.

## Fonts added (all SIL Open Font License 1.1)

Downloaded from the Google Fonts repository (https://github.com/google/fonts/tree/main/ofl) on 2026-11-01, each with its `OFL.txt` saved next to it in `03-assets/fonts/` and `07-studio/engine/public/looks/fonts/` (the engine bundles them through webpack imports, so no build staging is needed): Fraunces, Caveat, Fredericka the Great, Patrick Hand, Rubik Mono One, Space Mono Bold, Comic Neue Bold, Rubik, Gloock, Baloo 2, Chakra Petch SemiBold, Share Tech Mono (Reserved Font Name "Share"; used unmodified).
