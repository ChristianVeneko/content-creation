# Benchmark: @sebastiankra.ia reel vs our engine (2026-10-31)

Reference: `Video by sebastiankra.ia [DfKNtl-DAx6].mp4` (58s). Ours: `04-projects/2026-10-31-sdd-vs-odd-como-funcionan-y-cual-usar/video.mp4` (65s).

| Dimension | Reference | Ours | Gap |
|---|---|---|---|
| Visual per scene | Custom illustration drawn for THAT idea: robot mascot with states (sad / crowned / sleeping), shutter with countdown timer, price tags, jar filling with water, bar chart, sticky note, magnifier over a real tweet | Same glass card + Apple emoji for every scene | Biggest gap. Emoji = generic |
| Scene changes | 20 cuts in 58s (~every 2.9s), plus constant in-scene motion | 2 detected cuts in 65s, the card barely changes | 7–10x less visual change |
| Narrative devices | Persistent HUD (plan badge + "5h batch" bar + "week" bar) that updates with the story, recurring mascot, real screenshot as evidence, mini-charts, highlighted fine print | None | No continuity or proof |
| Typography | 2-tone headline (white line + big colored line, «quotes»), word captions in white/colored pill boxes, mono labels | One headline style + caption | Less hierarchy |
| Background | Dark navy with subtle grid (blueprint) | Blurred gradient | Gradient reads as "AI template" |
| Audio | Voice + music bed under it the whole time (92% of frames, about 13 dB under the voice) + SFX hit roughly every scene change (14 detected, ~1 per 4s) | Voice only | No music, no SFX |
| Branding | Handle + avatar footer fixed | None | |

## What makes the reference work
1. **Every scene has one custom metaphor drawn in code** (SVG/CSS), not a picked icon.
2. **One recurring character** (mascot) carries the emotion → continuity.
3. **A persistent HUD** shows the state the story is about and animates as facts change.
4. **Proof on screen**: a real screenshot/tweet with a highlight/magnifier.
5. **Sound design**: music bed plus an SFX on every reveal/cut.
6. **Cut every ~3s**, with something moving inside each shot.

## Conclusion
JSON-spec → fixed templates can't produce this. Each video needs **bespoke scene code** written by Claude (Remotion/HyperFrames components), built on a reusable **style kit** (grid bg, HUD, 2-tone headline, pill captions, mascot, SFX timeline).
