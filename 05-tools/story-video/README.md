# Story Video Studio: one Claude prompt that makes a 3D animated survival story

Claude writes, builds, voices and renders a vertical second-person survival thriller of 60 to 90 seconds, ready for Reels, Shorts or TikTok:
- real 3D low-poly sets with real light and shadow (three.js), with flat 2D stickmen acting inside them;
- a HUD with the day and a moving clock, and 3 to 4 rules that pay off on screen;
- a twist that breaks one rule, and a two-choice ending people argue about in the comments.

Every frame is built in code. There are no AI images and no AI video.

## What you need

A Claude subscription (Claude Code is included with Pro and Max). Nothing else: no other accounts, API keys or paid tools.

Claude installs the free tools itself:
- Python packages;
- Playwright with Chrome;
- ffmpeg;
- three.js and cannon-es, downloaded once into the project;
- a free voice model that runs on your own computer (about 500 MB, once).

## Make a video

1. Make an empty folder, open Claude Code in it, and paste the whole of `story_video_prompt.md`. Claude saves it as `CLAUDE.md`.
2. **The start gate.** Claude asks for:
   - your idea, or it pitches 10 and scores them;
   - the setting;
   - the length;
   - the narrator. "free" means the local Kokoro voice. ElevenLabs is optional and only if you already pay for it.
3. Claude shows you the beat sheet and the script, then 6 stills of the key shots. Answer "you pick" or give notes at each step.
4. Claude renders and checks:
   - captions are timed to the voice within 120 ms, and chunked by meaning;
   - loudness is -14 LUFS, with a dropout scan;
   - the pacing check passes.
5. **You get:**
   - `part1/part1.mp4`, the phone copy under 10 MB, plus a high-quality master;
   - `part1/cover.jpg`;
   - `part1/post.md`.

**How long it takes:** in our fresh-session tests it took about 1 to 2 hours of Claude working on its own. Most of that is the frame render, which runs at about 0.5 to 1.5 frames a second on the CPU and a few times faster with `--gpu`.

**Before you post:** listen to it once. Claude can't hear audio, so the voice and the mix are the one thing only you can check.

**Want a Part 2?** In the same folder, say "make part 2" and how the vote went.

## Sound and licences

- **Sound effects** (knocks, slams, impacts, whooshes, heartbeats, a dark room tone) are downloaded by the engine from Mixkit (mixkit.co) on first use, into your own project.
  - Mixkit's Sound Effects Free License allows them in commercial and non-commercial projects with no attribution.
  - It doesn't allow redistributing the sound files on their own, so this download doesn't include them.
  - If a download fails, the engine falls back to sounds made in code.
- **Music:** a dark tension bed made in code (a drone, a minor-key pad, a slow pulse, low booms), mixed 13 dB under the voice. There are no vocals and no downloaded tracks.
- **Voice:** Kokoro-82M (Apache 2.0), run locally.
- **3D:** three.js (MIT) and cannon-es (MIT).

## Why there's no Blender

Every set here is low-poly and built from simple shapes in code. That's quicker for Claude to write and change than a Blender scene, and it adds no install step. Blender would add a 300+ MB install and a modelling and export step to every video, and it would compete for the graphics card, without making these sets look better. If you need a detailed prop, you can model it in Blender, export it to glTF and load it into the scene; the guide doesn't need it.

## Rate it: good or ass

`rater/` holds the AI animation rater:
- `rate_prep.py` pulls the frames and numbers out of your MP4;
- `RATER_PROMPT.md` has Claude score it out of 120, give a plain verdict and list the 3 fixes that would raise it most.

`rater/HOWTO.md` explains it. We checked it against a real series that went viral (3 parts, all GOOD) and against a deliberately bad video (ASS).

## Proof

The test videos are left out of this download to keep it small; the scores are in `PROOF.md`.

## Files

| file | what it is |
|---|---|
| `story_video_prompt.md` | the one prompt to paste (the six engine files are inside) |
| `rater/rate_prep.py`, `rater/RATER_PROMPT.md`, `rater/HOWTO.md` | the rater |
| `PROOF.md` | how each video was made and how it rated |
