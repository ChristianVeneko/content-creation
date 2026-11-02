# Video Studio engine

Spec-driven renderer for vertical short videos (Reels, TikTok, Shorts). One JSON **VideoSpec** in, a finished
1080x1920 H.264 MP4 out, with voiceover, word-by-word captions, animated scenes, a cover image and post copy.

Built on [Remotion](https://www.remotion.dev). Everything runs locally; ElevenLabs is optional.

## Setup

```bash
source ./env.sh   # from the repo root: keeps every cache inside the repo
cd 07-studio/engine
npm install
```

Requirements (`./setup.sh` at the repo root installs them): Node 20+, `ffmpeg`/`ffprobe` (`05-tools/bin` first,
else the one on PATH). Optional, Apple Silicon only (`./setup.sh --voice-local`): the Python venv `.venv` with
`mlx_audio` (local Kokoro TTS) and `mlx_whisper` (word-timed captions). Elsewhere use ElevenLabs or `voice.provider`
`none`; without whisper the captions are timed from the script text. The CLI applies the same cache
environment as `env.sh` by itself, so it is safe to spawn from other processes.

## CLI

```bash
node cli.mjs templates                                  # JSON array of the templates (~92 KB)
node cli.mjs templates --brief                          # one line per template: id, category, format, name, best for (~5 KB, for agents)
node cli.mjs template <id>                              # one template's full entry (defaults, prompt hint)
node cli.mjs prompt <template>                          # spec-writer prompt trimmed to that template's family (9-19 KB of 42 KB)
node cli.mjs music                                      # JSON: moods (id, label, count), library tracks, level references
node cli.mjs voices [--gender male|female] [--pick <seed>] # JSON: trending Latin American Spanish ElevenLabs voices (or the auto pick)
node cli.mjs validate <spec.json|->                     # {"ok":true|false,"errors":[{"path","message"}]}; exit 0/1
node cli.mjs build <spec.json> --out <dir> [--json-logs] [--keep-work]
```

`build` writes into `<dir>`:

| File | Content |
|---|---|
| `video.mp4` | 1080x1920, 30 fps, H.264 yuv420p (CRF 18) + AAC 48 kHz, faststart, narration at -14 LUFS |
| `cover.jpg` | Still from the end of scene 1 (hook text fully on screen) |
| `post.md` | TikTok / Instagram / YouTube copy and hashtags from `spec.post` |
| `spec.json` | The spec with template defaults applied (re-renderable) |
| `captions.json` | Word timings (Remotion `Caption[]`) |

`--keep-work` keeps `<dir>/.work` (audio, Remotion public dir, bundle) for debugging; otherwise it is deleted.

### JSON logs

With `--json-logs`, stdout is one JSON object per line:

```json
{"step":"tts","status":"running","message":"Voice 2/5","progress":0.16}
```

- `step`: `validate` → `tts` → `captions` → `render` → `cover` → `done`
- `status`: `running`, `done`, or `error`
- `progress`: overall 0-1, monotonic
- The final line is `{"step":"done","status":"done","message":...,"progress":1,"outputs":{"video","cover","post","spec"},"durationSec":22.2}`
- On failure: `{"step":"<failed step>","status":"error","message":"..."}` and exit code 1.

Without `--json-logs`, human-readable progress goes to stderr.

## Pipeline

1. **validate**: zod schema (`lib/spec.mjs`), then template defaults fill anything the spec omits.
2. **tts**: per scene.
   - `voice.provider: "elevenlabs"` and `ELEVENLABS_API_KEY` set: `POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}` with `eleven_multilingual_v2` (voice from `voiceId`; for Spanish with no `voiceId` the build picks one of the 5 most trending Latin American Spanish male voices from the ElevenLabs library, stable per title, and writes it into the output `spec.json`; `node cli.mjs voices [--pick <seed>]` lists them or shows the pick, cached 24 h in `$CC_CACHE/elevenlabs`; otherwise `ELEVENLABS_VOICE_ID`, else a premade multilingual voice). Without a key, or on API error, it falls back to Kokoro.
   - `kokoro`: local `mlx-community/Kokoro-82M-bf16` via `scripts/kokoro_batch.py` (model loaded once). Spanish voices: `ef_dora` (female), `em_alex`, `em_santa` (male).
   - `none`: no audio; scene length is `durationSec` or ~0.3 s per word.
   Silence is trimmed, then scene lengths are computed from audio length plus padding (`lib/timeline.mjs`).
3. **captions**: scene clips are placed on one narration track (loudness-normalized), transcribed with
   `02-scripts/transcribe.py` (mlx-whisper, word timestamps). If transcription fails, captions are timed from the text.
4. **render**: assets are copied into a per-job Remotion public dir, the project is bundled and rendered with
   `@remotion/renderer` (composition id = template id).
5. **cover**: `renderStill` near the end of scene 1.

## VideoSpec

Schema: [`spec.schema.json`](spec.schema.json) (generated from `lib/spec.mjs` with `npm run schema`).
Example: [`examples/demo.spec.json`](examples/demo.spec.json). Required: `version`, `title`, `template`, `scenes`.
Everything else falls back to the template defaults.

- `visual.type`: `illustration` (`illustrated` template: `elements[]` drawn in code, see below), `scene3d` (3D templates:
  `objects[]` rendered with three.js, see [3D templates](#3d-templates)), `gradient` (animated mesh gradient), `image`/`video` (`src` = local path, absolute or relative to the
  spec file or the workspace root, or an https URL; Ken Burns + readability scrim), `emoji`/`icon` (big animated emoji).
- `animation`: `pop`, `slide`, `typewriter`, `zoom`.
- `theme.captionStyle`: `hormozi` (uppercase heavy, stroked, accent active word with pop), `clean` (sentence case,
  karaoke highlight), `boxed` (word chips, accent active chip), `pills` (light word pills, active word in a highlight pill),
  or any style of the caption catalog below. `captions.style` wins when both are set.
- `captions` (catalog in `lib/captions.mjs`, rendered by `src/components/Captions.tsx` + `src/components/captions/`):

  | Field | Values | Default |
  |---|---|---|
  | `enabled` | boolean | `true` |
  | `wordsPerPage` | 1-8 | `3` |
  | `style` | `hormozi`, `clean`, `boxed`, `pills`, `chips`, `two-tone`, `karaoke`, `punch`, `typewriter`, `dialog`, `neon`, `underline`, `minimal`, `pixel` | `theme.captionStyle` |
  | `size` | `s` (x0.8), `m` (x1, classic), `l` (x1.2), `xl` (x1.4) | `m` |
  | `position` | `top` y230-480, `upper` y420-700, `center` y820-1100, `lower` y1130-1390, `bottom` y1250-1400 (x always 90-990) | template band (`two-tone`: `upper`, `punch`: `center`) |
  | `colors` | `{ text?, highlight?, box?, outline? }` hex | automatic from `theme.palette` (see below) |
  | `accent` | hex (legacy alias of `colors.highlight`, which wins) | `theme.palette.accent` |
  | `uppercase` | boolean | the style's own casing |
  | `speaker` | string, max 40 | none (`dialog` nameplate and initial tile) |

  New styles: `chips` (sentence-case chips, active chip filled), `two-tone` (muted lead-in line + bold keyword line,
  word-by-word reveal), `karaoke` (whole page visible, spoken word fills with the accent), `punch` (one huge Anton word,
  6+ letter words in the accent), `typewriter` (JetBrains Mono on a slab in the box color, blinking block cursor), `dialog` (RPG box,
  speaker nameplate, typed text, bouncing advance arrow; sits on the band's bottom edge), `neon` (core in the word color + layered
  accent glow, flicker-on), `underline` (accent bar sweeps under the spoken word), `minimal` (lowercase Inter, soft
  shadow), `pixel` (Pixelify Sans in a stepped-corner banner, hard pixel shadow). A spec without the new fields keeps its
  style, size and band (its colors now follow the palette, see "Caption colors"). `top` anchors tall styles to the band's top edge and `bottom` to its bottom edge. Keyword
  highlighting from `*asterisks*` in narration is not implemented (the TTS and alignment pipeline would see them).
  Examples: `examples/captions-dialog.spec.json`, `examples/captions-two-tone.spec.json`.
- Caption colors (`deriveCaptionColors` in `lib/captions.mjs`, resolved as `look.colors`): no style hardcodes white,
  black or a fixed box. `text` = `palette.text`, `highlight` = `colors.highlight` ?? `captions.accent` ??
  `palette.accent` (`pills`: `accent3` when the palette has one), `box` and `outline` = the darkest `palette.bg` stop
  (`pills` use the lightest palette color as the pill and the darkest for its words). Derived colors are adjusted until
  words reach WCAG 4.5:1 over the box and the outline (surfaces move first, then words, toward white or black); the
  ink on a highlight fill is black or white, whichever reads. Explicit `captions.colors` fields are kept as given.
  Reels subtitles (`linea`, `bloque`) take `colors.text` / `colors.highlight` as their text / keyword color (scenes
  keep their roles); pixel templates' dialog box takes every set field. Without `captions.colors` both are unchanged.
- `music` (see [Music](#music)): `{provider, mood, track, file, volume, duck, prompt, tone}`.
- `sfx`: `{enabled, volume}`; SFX on the beat timeline (see below). `volume` 1 = SFX peaks 12 dB under the voice
  (0.5 = -18 dB, 2 = -6 dB).
- `theme.palette.accent2` / `accent3`: extra accents (illustrated: amber / cyan).
- Text stays inside the universal safe zone (center 900x1300); captions sit at y ≈ 1130-1390 unless `captions.position` moves them.

## Music

Library: `03-assets/music/library.json` (built by `scripts/music-fetch.py`, see `03-assets/music/README.md`). Only CC0 and
CC BY tracks are loaded (`lib/music.mjs` drops NC / ND / SA licenses, entries without credit, or missing files).

| Field | Meaning |
|---|---|
| `provider` | `library` (default), `elevenlabs` (opt-in per video, spends credits), `none` (no music at all) |
| `mood` | `tech-lofi`, `cinematic-epic`, `tense-mystery`, `inspiring-uplifting`, `minimal-ambient`, `upbeat-fun`, `corporate-happy`, or `auto` |
| `track` | A library id (`node cli.mjs music`), or `auto` |
| `file` | Local audio file; wins over `track` / `mood` |
| `volume` | 0-1. Level of the bed relative to the voice: `0.12` = **-13 dB**, each doubling +6 dB (`0.24` = -7 dB, `0.06` = -19 dB) |
| `duck` | Default on: the music dips a further **9 dB** while words are spoken (raised-cosine attack 0.18 s before a word, release 0.55 s), so `0.12` sits at -22 dB under speech and -13 dB in pauses |
| `prompt` | ElevenLabs only: what the music should sound like (default: from mood + tone) |
| `tone` | Tone hint for `mood: "auto"` and the ElevenLabs prompt |

- **Mood auto-pick** (`autoMood`): the `tone` first, then topic keywords in the title (weight 3) and narration/hashtags
  (weight 1), then the template id (news → tense, code/tutorial → tech-lofi, countdown/whiteboard → upbeat, quote →
  ambient, …). Deterministic for the same spec.
- **Track pick**: deterministic by title within the mood, preferring tracks longer than the video, and skipping the
  last two tracks used (`03-assets/music/.history.json`) so consecutive renders do not repeat.
- **ElevenLabs**: `POST https://api.elevenlabs.io/v1/music` (`music_v1`, `force_instrumental: true`,
  `music_length_ms` = video length rounded up to whole seconds). Cached in `03-assets/music/generated/<hash>.mp3` +
  `<hash>.json`, so re-renders do not spend credits again. Without `ELEVENLABS_API_KEY` or on any API error the build
  logs the reason and uses the library.
- Music is mixed into the build-time bed (`lib/audio-bed.mjs`) and the final MP4 is normalized to -14 LUFS.
  Templates without music defaults (no `provider`, `mood` or `track`) keep the old behavior: only `music.file`, played
  by Remotion at `volume`.
- `post.md` gets a `## Credits` section with the chosen track's credit line.

## Templates

`templates/*.json` hold defaults (`theme`, `voice`, `music`, `captions`, `animation`) plus gallery metadata
(`name`, `description`, `prompt_hint`, `best_for`, `preview.emoji` or `preview.style`, `preview.gradient`, `preview.accent`, `preview.sample_text`).

`format` (optional kebab slug, `^[a-z0-9]+(-[a-z0-9]+)*$`) names the video format the template implements (how it looks and
moves); when missing it defaults to the template id. It shows up in `templates`, `templates --brief` (third column, right
after `category`), `template <id>` and the web gallery, which groups formats by family.

Video length: 15 to 180 s in total (15, 30, 45, 60, 90, 120, 150, 180 in the UI). A scene is capped at 60 s and a spec at
60 scenes; long videos are more 3-6 s scenes, never longer ones (`prompts/spec-writer.md` says so to the writer).

| id | Look |
|---|---|
| `illustrated` | Default. Drawn-in-code illustrations on a navy blueprint grid, two-tone headlines, word-pill captions, live HUD, SFX + ducked music |
| `whiteboard` | Illustrated kit: marker on a whiteboard (Permanent Marker/Kalam), draw-on strokes with boil, eraser-wipe transition |
| `broadcast` | Illustrated kit: red/white/black newsroom, live label + ticker, slam-in elements, RGB-split glitch cut |
| `editorial-chart` | Illustrated kit: salmon newsprint, serif headlines, charts as protagonists, zoom-through transition |
| `editor-window` | Illustrated kit: Dracula editor/terminal, typed prompt headlines, diff lines, step badges, CRT power-cycle cut |
| `rank-numbers` | Illustrated kit: purple/yellow/pink, giant rank slam (`title.number`), sunburst + confetti, whip-pan cut |
| `ui-cards` | Illustrated kit, depth format: dark navy grid + dust, HUD of labeled bars, two-line header, UI cards (post with highlighter + magnifier, chart with dashed "expected", jar meter + stamp, hourglass, hanging price tags, stat badge, timer, panels) |
| `flat-depth` | Illustrated kit, depth format: flat-shaded 2.5D sets on a wooden table in perspective (laptops, phones, coin stacks, boxes, books, mugs, monitors, plants), round-headed characters with moods, yellow stat badge, karaoke headline |
| `soft-gradient` | Illustrated kit, depth format: drifting pastel mesh gradients, frosted glass cards with soft long shadows, gradient accent word |
| `host-tutorial` | Illustrated kit format: numbered step tutorial on warm paper, a persistent cutout host (`host` element, pose and expression per scene), `roadmap` card, `window` UI mockups, halftone-dot transition |
| `checklist-glass` | Illustrated kit format: "Checklist n / N" pill, frosted `window` mockups with cursor and highlight, a persistent `mascot` slot, pastel mesh |
| `spotlight-narrative` | Illustrated kit format: dark spotlight story, one `beacon` (icon in glowing rings with a counting number) or layered `drawing` per scene |
| `data-atlas` | Illustrated kit format: data documentary. One agent-drawn `backdrop` per scene (3-5 depth layers) in a **2.5D** mode (per-layer parallax, dolly, depth of field; default) or `flat` (one picture, one push-in), plus `counter-pill`, `particle-field`, `route` and `ledger` props; captions top, no title |
| `pixel-versus` | Pixel family format: arena stage, `round` cards, `fighters` with a header strip of stars, `ranking` and `verdict` panels, crowns, `energy-beam` / `power-up` / `hit-flash` fx |

**Depth pass.** Looks listed in `LOOK_DEPTH` (`lib/illustrated.mjs`) get soft contact shadows under elements, lit gradient
panels with a top highlight, parallax background layers, a ground plane (`grid`, `floor`, `stage`, `table`) and a vignette
(`src/illustrated/depth.tsx`): `illustrated` (blueprint), `broadcast`, `editorial-chart`, `rank-numbers` and the three depth
formats. The hand-drawn and printed looks (whiteboard and the art styles) keep their flat media. The format elements
(`post`, `chart`, `meter`, `hourglass`, `tags`, `stat`, `timer`, `panels`, `object`, `character`) are documented in
`prompts/spec-writer.md` and render in every illustrated-kit look (`src/illustrated/format-elements.tsx`).
| `clay-diorama` | 3D: pastel clay miniatures on a floating plinth, soft shadows, drop-in squash, orbit camera, iris cut |
| `iso-toon` | 3D: isometric toon blocks with outlines on a navy grid, orthographic camera, animated arrows, isometric pan cut |
| `neon-glass` | 3D: frosted glass + neon glow, bloom, reflective grid floor, punch-in camera, light-streak cut |
| `pedestal` | 3D: one hero object on a glossy pedestal, studio HDRI, turntable, exploded views with dashed callouts, dip cut |
| `pixel-dusk` | Pixel: warm sunset pixel art, blurred parallax layers, amber light rays, pixel banner, RPG dialog box typing the narration |
| `pixel-night` | Pixel: navy/violet night, moonlight, neon signs, glow, popup chat windows, counters |
| `pixel-arcade` | Pixel: saturated magenta/cyan/yellow CRT with scanlines, mystery blocks and pickups that burst |
| `pixel-mono` | Pixel: strict 4-color handheld green, every layer quantized, dithered light |
| `neon-grid` | 3D style (format `synthwave`): navy matte bodies, cyan rims, bloom, depth fog, glide camera; no scenery |
| `soft-studio` | 3D style (format `soft-product`): pastel soft-matte look, warm key, wide soft shadow, slow dolly; no scenery |
| `moody-night` | 3D style (format `night-cinematic`): dusk-blue fill, one warm key, fog, low cinematic and hand-held camera; no scenery |
| `voxel-world` | 3D style (format `voxel`): flat-shaded sharp blocks, snap-in placement, low hero angle; no scenery |
| `data-stage` | 3D format: dark arena, volumetric spotlights, instanced crowd, rows receding into depth, scales and tubes built from parts |
| `monolith-story` | 3D format: one recurring monolith, a color-keyed backdrop per scene, pixel-font signs, push and orbit camera |
| `clay-mascot` | 3D format: soft clay look, a persistent mascot pinned to a screen corner, pastel backdrop, soft shadows |
| `cutaway-explainer` | 3D format: low-poly cutaway cross-section in soft daylight, close-up to pull-out reveal camera, diegetic overlay kit (`visual.overlay`: flow chips, concept pill, limit bar, not-equal card) and `signal` fx along pipes |
| `captions-voice` | Voiceover + kinetic captions over gradients, photos or b-roll |
| `kinetic-type` | Huge animated words, ghost outline type, no b-roll |
| `countdown` | Hook with TOP N chip, big numbered items, payoff |
| `glass-cards` | Glass cards with emoji tile, step dots |
| `letterbox` | Cinematic: letterbox, grain, vignette, typewriter quotes |

The six illustrated-kit looks come first in `cli.mjs templates`, then the 3D looks, then the four pixel looks; the reels and classic templates last. Per-look references (inspiration links, palette, fonts, motion, transitions, SFX): `00-docs/template-styles.md`.

## Illustrated template

Scene fields: `title` (`kicker` small white line, `main` big accent line, `quote` wraps it in «»), `hud` (per-scene
changes keyed by HUD item id) and `visual: {type: "illustration", elements: [...]}`. Top level: `hud.items[]`
(`chip` / `label` / `bar`, values animate as scenes change), `brand` (`handle`, `avatar` for the footer).
Emoji are rejected anywhere visible in an illustrated spec; callout/stamp `target` must be an element id of the scene.

Element vocabulary (`lib/illustration-schema.mjs`): `card`, `flow`, `timeline`, `compare`, `split`, `checklist`,
`bars`, `counter`, `code`, `terminal`, `chat`, `doc`, `icon` ([Phosphor](https://phosphoricons.com) duotone, MIT,
read from `@phosphor-icons/core` at build time), `badge`, `stamp`, `callout` (rough.js hand-drawn circle / underline /
box / arrow), `svg` (custom `paths[]` drawn on with `evolvePath`). Every element accepts `id`, `at` and `color`
(hex or token `accent`, `accent2`, `accent3`, `good`, `bad`, `muted`, `text`).

How it works (`lib/illustrated.mjs`, pure and shared by the build and the bundle):

1. **Layout**: elements stack in the stage (x 90..990, y 590..1240) with measured heights; the column scales down
   if it does not fit. Callouts/targeted stamps are overlays; a labelled callout reserves a row for its tag.
2. **Pacing**: entrances without `at` are spread from 0.55 s to the scene end minus a 1.4 s reading hold (never more
   than 3.2 s apart); list items, bars, nodes, doc lines and typed code fill the gaps, so something changes every 2-4 s.
3. **Beats → SFX**: one `beats[]` timeline (cut, title, pop, tick, type, stamp, ding, page, draw) drives the SFX:
   round-robin variants with ±6 % playback rate, the whoosh pre-rolled so its peak lands on the cut, at most 3
   overlapping sounds (cuts and stamps win). `lib/audio-bed.mjs` mixes SFX + music into one `bed.wav`; the final MP4
   audio is re-normalized to -14 LUFS.
4. Captions are re-aligned to the script words (`alignToScript`) so technical terms are spelled as written.

SFX kit (all CC0): Kenney packs, `@remotion/sfx` whoosh/whip/page-turn/mouse-click downloaded to
`03-assets/sfx/remotion/`, and whooshes/pops synthesized by `scripts/gen-sfx.py` into `03-assets/sfx/generated/`.
Music: see [Music](#music); the build adds the track's credit to `post.md`.
Fonts: Montserrat + JetBrains Mono (OFL, `public/fonts/`).

Dev loop: `node scripts/illustrated-stills.mjs <spec> <outDir> --at=0.5,0.97` renders stills without TTS.

### Agent drawings and 2D fx (illustrated kit + classic templates)

- `drawing` element (illustrated kit) and `visual: { "type": "drawing", "drawing": {...} }` (classic templates
  `captions-voice`, `kinetic-type`, `countdown`, `glass-cards`, `letterbox`, drawn in the emoji/icon slot): named parts
  (`path rect circle ellipse polygon line text group`) with `parent` hierarchy, palette-role / hex / gradient paint,
  stroke draw-on, keyframes and motion presets (`bob float sway spin pulse wave blink pop-in slide-in-left
  slide-in-right wiggle squash draw-on orbit fall shake`). Max 60 parts, 8000 path characters. Schema:
  `lib/drawing-schema.mjs`; checks, geometry, motion and planning: `lib/drawing.mjs`; render: `src/components/Drawing2D.tsx`,
  restyled per look by `src/illustrated/drawing-skin.ts` (wash, marker wobble, paper cutouts, halftone, comic ink).
- `visual.fx` (max 8, 2D scenes): `sparkles confetti dust bubbles leaves stars ink-splash light-leak grain scribbles
  burst flash zoom-punch shake glitch chromatic speed-lines`, with `at`/`until`/`target`/`seed` like the pixel and 3D fx
  (`lib/fx2d.mjs`, `src/components/Fx2D.tsx`). 3D scenes keep their own fx list.
- Every `at` is seconds or a narration word (`"word"`, `"word#2"`, `"word+6"`, `"inicio"`, `"fin"`), resolved from the
  real voice timing at build time (`planIllustration` / `planDrawings`). Shared easing, keys and moments: `lib/motion.mjs`.
- Stills with word moments and a contact sheet: `node lib/illustrated-stills.mjs <spec> <outDir> [--look=watercolor] --sheet`.
  Example: `examples/2d-generative.spec.json`. The originals-first guidance is `## Creative mode: 2D` in
  `prompts/spec-writer.md` (subscription path only).
- **Reels** (`reels-*`) use the same kit: a `dibujo` scene (alias `drawing`: `{dibujo, texto?, etiqueta?, marco?, en}`,
  moments: drawing, then texto) and drawings in any icon slot (`icono` anywhere, `cta.iconos`): `Icono` in
  `src/reels/piezas/basicas.tsx` draws a drawing object instead of an icon name, so every scene gets them for free.
  `visual.fx` renders inside each scene, under the subtitles (`src/reels/motor/CapaFx.tsx`); targets are the dibujo's
  `id` / `"id/part"`. Roles come from the style (`src/reels/piezas/dibujo.tsx`: soft family diffuse shadows, marked
  family ink outlines + hard shadow; `accent2`/`accent3` from `REEL_ART` in `lib/reels.mjs`). `planReels` resolves word
  moments into each scene's `momentos`. Review: `node lib/reels-stills.mjs <spec> <outDir> --sheet` (adds fx hits).
  Example: `examples/reels-generative.spec.json`; guidance: `## Creative mode: reels`.

## 3D templates

The 3D templates (`clay-diorama`, `iso-toon`, `neon-glass`, `pedestal`, `paper-world`, `toy-blocks`, `holo-studio`,
`neon-grid`, `soft-studio`, `moody-night`, `voxel-world`, `data-stage`, `monolith-story`, `clay-mascot`, `cutaway-explainer`) render each scene as a real three.js scene through
[`@remotion/three`](https://www.remotion.dev/docs/three) (React Three Fiber 9, drei 10, three 0.186). Headline, captions,
HUD, footer, SFX beats and the music bed are the illustrated kit's, so they stay 2D, sharp and in the safe zone.

Scene fields: `title` (as illustrated) and `visual: {type: "scene3d", objects[], layout?, camera?, focus?, connect?, explode?, set?}`.
Vocabulary and validation: `lib/scene3d.mjs` (unknown kinds are rejected with the list of kinds; `connect`/`focus` ids must
exist; `chart` needs `values`, `stat` a `value`, `icon` an `icon`, `model` a listed model; no emoji).

| Field | Meaning |
|---|---|
| `objects[].kind` | Procedural: `cube`, `sphere`, `phone`, `laptop`, `monitor`, `server`, `database`, `cloud`, `document`, `folder`, `envelope`, `coin`, `chart`, `stat`, `lock`, `key`, `gear`, `globe`, `chip`, `battery`, `rocket`, `lightbulb`, `person`, `building`, `house`, `tree`, `pin`, `card`, `check`, `cross`, `icon` (extruded Phosphor icon), `model` (local CC0 GLB), `car` (CC0 low-poly car, `model` picks one of `CAR_MODELS`), `character` (CC0 blocky character, `model` `character-a/d/k`, `anim` idle/walk/sprint/yes/no/sit/pick-up) |
| `objects[]` extras | `id`, `label` (2D tag locked to the object), `color` (hex or token), `icon`, `value`, `values` + `items` (chart), `model`, `anim`, `size`, `pos`, `at`, `highlight` |
| `layout` | `auto` (by count), `row`, `grid`, `flow` (zigzag, auto arrows), `circle`, `stack` (layers), `hero` |
| `camera` | `auto` (the look's rotation), `orbit`, `dolly`, `push`, `crane`, `pan`, `turntable`, `topdown`, `static`, `glide` (lateral truck), `rise` (pedestal up), `handheld` (slow deterministic drift) |
| `world` | The set the agent builds from scratch for the scene: `concept` (required, a few words), `ground` (`look`, `none`, `plane`, `disc`, `grid`, `mirror`), `backdrop` (flat color, blended toward the palette background), `parts` (custom parts, `pos` up to +-30, sizes up to 40, `repeat` copies, `sign` pixel-font signs; max 24, 160 after repeats) and `crowd` (instanced silhouettes). Renders in `src/three/world.tsx` |
| `shots` | 2-4 camera shots (`wide`, `medium`, `close`, `low`, `high`, `overhead`, `left`, `right`, each with optional `at`, `focus`, `yaw`, `pitch`, `zoom`) expanded to camera keys; use instead of `cameraKeys` |
| `objects[].corner` | Custom object pinned to a screen corner (`bl`, `br`, `tl`, `tr`) as a persistent mascot that follows the camera |
| `set`, `stock` | Stock catalog scenery (`road`, `desk`, `room`, `grid`, `stage`, `city`, `voxel`; props are CC0 GLBs in `SET_MODELS`). No look has a default set (`auto` = `none`); a named set, or a `character`/`car`/`model` object, needs `stock: true` on the scene (or on the object) |

3D templates supply only style (camera, light, materials, motion, fx). Models and worlds are built from scratch for each
video: a scene must contain a `custom` object or a `world` with `parts` or a `crowd`, unless it sets `stock: true`; three or
more scenes that all show the identical subject and world are rejected. Isometric (orthographic) is `iso-toon` only.

How it works:

1. **Plan** (`planThree`, pure, shared by Node and the bundle): layout on the ground plane, entrance times, chart bar
   times, connections, the camera move and a framing (`frameContent`) that fits the content in the stage band.
2. **Camera** (`cameraAt`) is a pure function of time; `projectPoint` uses the same camera to place the 2D labels, so
   labels track objects exactly (then they are de-overlapped and clamped to x 90..990, y 600..1236).
3. **Render** (`src/three/`): one `<ThreeCanvas width={1080} height={1920}>` per scene; materials, lights, floor,
   particles and transitions per look (`src/three/looks.ts`, `kit.tsx`, `objects.tsx`, `transitions.tsx`). Bloom (neon)
   is three's `UnrealBloomPass` composer built synchronously, so the first frame of a scene is already complete.
4. **Determinism**: every motion derives from `useCurrentFrame()` (no `useFrame` animation, clock, `Math.random`, drei
   `Float`/`Sparkles` or `Environment` presets); `test/three-render.test.mjs` renders the same frame twice and compares bytes.
5. **GL**: three.js needs ANGLE, so every `selectComposition`/`renderMedia`/`renderStill` call passes
   `chromiumOptions: { gl: "angle" }` (`CHROMIUM_OPTIONS` in `lib/render.mjs`); Studio uses `remotion.config.ts`.
6. **Render profile** (`RENDER3D` in `lib/scene3d.mjs`): per look, tone mapping, exposure, optional HDRI, the PCF radius
   of the single key-light shadow map, bloom (only `neon-glass` and `holo-studio`), linear fog matched to the backdrop and
   the default set. The low-poly looks are cheap by design: one hemisphere light + one directional key with one shadow
   map, flat/standard materials, data textures generated once, no HDRI, no AO, no depth of field, no extra passes.
7. **Assets**: procedural by default. `lib/three-assets.mjs` copies the look's HDRI and any referenced GLB from
   `03-assets/3d/` (CC0, see its `licenses.json`) into the job's public dir; renders never hit the network.

Dev loop: `node scripts/illustrated-stills.mjs examples/clay-diorama.spec.json <outDir> --at=0.3,0.9` (also `--frames=`,
`--png`, `--verbose`). Rendering needs an awake display on macOS: if the Mac display sleeps, headless Chrome stalls on
"Waiting for root component to load"; wrap long renders in `02-scripts/keepawake.sh` (uses `caffeinate` on macOS).

## Pixel templates

`pixel-dusk`, `pixel-night`, `pixel-arcade` and `pixel-mono` are looks (palette + light + mood) of one pixel-art family
drawn in code (`src/pixel/`, no sprite files). Scene field: `visual: {type: "pixel", pixel: {set, props?, character?,
banner?, popup? | counter? | checklist?, speaker?, camera?, transition?, rays?, dust?}}`. Vocabulary, looks and
validation: `lib/pixel.mjs` (unknown sets or props are rejected with the list; one UI panel per scene; `banner.accent`
must be a word of the text; pose `hold` needs `item`; a `pixel` visual is only valid on a pixel template; no emoji).

How it works:

1. **Plan** (`planPixel`, pure): set per scene, camera move, transition (`iris`, `dissolve`, `cut`), prop entrance times
   and the SFX beats (same shape as the illustrated planner, so `computeBeats` voices pops, ticks and cuts).
2. **Draw** (`src/pixel/painter.ts`): a software painter writes whole pixels into RGBA buffers of 270x480 (plus a pan
   margin), so there is no antialiasing anywhere; each buffer is shown on a canvas upscaled x4 with
   `image-rendering: pixelated`. Gradients use 4x4 Bayer ordered dithering; `pixel-mono` quantizes every layer to its
   4 colors. All motion derives from `useCurrentFrame()`; randomness is Remotion `random(seed)`.
3. **Depth**: each set (`src/pixel/sets.ts`) draws far / mid / near layers; props (`props.ts`) and the optional generic
   character (`character.ts`) go on the subject layer. The camera pans with parallax per layer; the upscaled far and
   near layers (and a masked copy of the floor) are blurred with CSS for a fake depth of field.
4. **Light**: emissive pixels are also painted on a glow buffer per layer (blurred, screen-blended); light rays are
   gradient wedges with screen blend; dust motes drift through the frame; vignette per look, scanlines on arcade.
5. **UI** (`src/pixel/ui.tsx`): pixel title banner (Press Start 2P) with one accent word, popup window, counter HUD,
   checklist panel and prop tags (Silkscreen), and the RPG dialog box (`PixelOverlay.tsx`, Pixelify Sans) that types
   the narration in sync with the word timings (`dialogPages` regroups caption pages into one sentence per box). The
   build transcribes the narration for pixel templates even with captions disabled.

Fonts (OFL, `public/fonts/`, copies in `03-assets/fonts/`): Pixelify Sans, Press Start 2P, Silkscreen.

## LLM prompt

[`prompts/spec-writer.md`](prompts/spec-writer.md) is the system prompt that turns a user prompt + template + language +
duration + tone into a valid VideoSpec. Always run `node cli.mjs validate` on the model output before building.

## Development

```bash
npm test                                   # node --test (schema, templates, timeline, CLI, illustrated planner/SFX)
npm run typecheck                          # tsc over src/
npm run studio                             # Remotion Studio with the demo spec as preview props
node scripts/preview-stills.mjs <dir>      # quick stills of all templates (no TTS)
```

Layout: `cli.mjs` (entry), `lib/` (Node pipeline), `src/` (Remotion compositions: `Video.tsx`, `layouts.tsx`,
`components/`, `illustrated/`, `three/`), `public/fonts/` (OFL fonts), `templates/`, `prompts/`, `examples/`, `test/`.
