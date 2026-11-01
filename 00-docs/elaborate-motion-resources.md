# Resources for elaborate illustrated motion videos (researched 2026-10-31)

Items marked ⚠ are unverified.

## Prompting that gets past "gradient + emoji"
1. State the style, palette, and stroke rule: "flat vector, 3-color palette #…, 6px round-cap outlines, NO emoji, every object drawn as inline SVG paths".
2. Ask for a **beat sheet** first (scene | time | what is drawn | motion verb | SFX), then the code.
3. Ban the defaults: no stock gradients, no emoji, no text-only scenes; every scene needs a custom illustration with at least 5 paths.
4. Keep one shared `beats[]` array that drives both the animation and the SFX.

## Prompt and skill sources
- Futurepedia **AI Style Atlas**: 86 styles (whiteboard, blueprint, claymation, Manim…), each with a Claude prompt + code + sound kit (1280x720, adapt to 1080x1920): https://www.futurepedia.io/resources/ai-style-atlas
- YouMind **Opus 5.5 SVG animation** prompt (all SVG, synced synthesized audio): https://youmind.com/video-prompts/opus-5-5-svg-animation-11970
- **HyperFrames** prompt examples (vertical explainer, hand-drawn underline, slam hook): https://hyperframes.heygen.com/prompting/examples.md · motion guide: https://hyperframes.heygen.com/prompting/motion.md
- **Remotion prompt showcase**: https://www.remotion.dev/prompts · templates (81, MIT): https://github.com/reactvideoeditor/remotion-templates
- Local: 700+ Opus 5.5 prompts in `05-tools/repos/awesome-opus5-5-videos/prompts/`
- Skills: `npx skills add https://github.com/vibe-motion/skills --skill svg-assembly-animator`; greensock/gsap-skills; whiteboard-animation, hand-drawn-diagrams, manim-video (third-party ⚠)

## Techniques
- Line draw-on: `@remotion/paths` `evolvePath()` (or stroke-dashoffset); morph paths with `interpolatePath`.
- Hand-drawn look: Rough.js (`rough.svg()`), or an feTurbulence + feDisplacementMap filter over clean SVG.
- GSAP is 100% free since 3.13 (DrawSVG, MorphSVG, SplitText, MotionPath) and is HyperFrames' animation engine.
- Remotion: `@remotion/noise` (organic wobble), `@remotion/lottie`, `@remotion/three` (camera moves), `@remotion/transitions` + `addSound()` (whoosh on each cut).
- HyperFrames blocks (`npx hyperframes add <name>`): hw-write-title, hw-arrow, hw-underline, hw-frame, svg-line-draw-loader, kinetic-center-build, caption-kinetic-slam, whip-pan, camera-shake, push-in, flowchart-vertical, data-chart, chat-message, caption-highlight, confetti.

## SFX
- In `03-assets/sfx`: Kenney (CC0): impact, interface, keyboard, ui, casino, with `sfx-analysis.md`.
- **@remotion/sfx** (v4.0.429+): whoosh, whip, mouseClick, uiSwitch, ding, pageTurn, vineBoom… → `npx remotion add @remotion/sfx`
- Kenney Interface Sounds (CC0): https://kenney.nl/assets/interface-sounds
- Freesound (filter CC0), Pixabay sounds (Pixabay license), Mixkit SFX ⚠ license, Sonniss GDC bundle ⚠ check AI clause.
- **Sync recipe**: one `beats[]` timeline; whoosh peak on the cut (start half its length early); riser ENDS on the hit; pop at overshoot peak; one click per typed char; pencil-scratch loop while drawing; 3–4 round-robin variants ±5–8% pitch; max 2–3 overlapping; SFX −12 dB under the voice; leave some beats silent.

## Illustration assets (license)
- Open Peeps (CC0) https://www.openpeeps.com
- unDraw (commercial OK, no redistribution/AI training) https://undraw.co/license
- Humaaans / Open Doodles ⚠, DrawKit ⚠, IRA Design ⚠, Storyset (attribution)
- Icons that draw on well: Phosphor, Tabler, Iconoir (MIT ⚠)
- LottieFiles free (Lottie Simple License; check each animation)

## Workflow write-ups
- Chase AI: https://chaseai.io/blog/how-to-create-videos-claude-code-remotion
- Whiteboard pipeline (Golpo): https://www.mejba.me/blog/claude-code-whiteboard-animation-golpo ⚠
- HyperFrames 30 days: https://hyperframes.heygen.com/thirty-days.md
