# AI animation rater: how to use it

The rater tells you plainly whether an episode is good or ass, scores it on 12 points, and gives the 3 fixes that would raise it most. It costs nothing beyond the Claude subscription.

1. **Prepare the episode.** Run `python rate_prep.py my_episode.mp4`. Add `--prev part1.mp4` when you're rating a Part 2.
   - It writes a `rate_my_episode/` folder with:
     - the first frame;
     - the first 3 seconds;
     - a contact sheet (one frame every 2 s);
     - the last 6 seconds;
     - `metrics.md`: length, cuts every 10 s, still stretches, loudness, and a timed transcript.
   - It needs `pip install numpy imageio-ffmpeg faster-whisper`. Claude Code can install them for you.
2. **Listen to the first 10 seconds yourself.** Claude can't hear audio. Open `RATER_PROMPT.md` and answer the voice check: A for a person telling a story, B for a robot.
3. **Rate it.** Open Claude Code in that folder and paste `RATER_PROMPT.md`.

You get:
- **STORY out of 60:** hook, dilemma, reversal, cost, cliffhanger and how much the comments will split;
- **CRAFT out of 60:** first frame, pacing, consistent characters, captions, audio and length;
- a total out of 120;
- the verdict:
  - **GOOD** needs a total of 84 or more, STORY and CRAFT at 40 or more each, and no point under 4;
  - anything else is **ASS**, with the reason (boring, no voice, robotic voice, looks bad, or one weak spot);
- the top 3 fixes.

**How we checked it** (2026-10-29): fresh Claude sessions rated these episodes blind, from `rate_prep.py` output only.

| episode | STORY | CRAFT | total | verdict |
|---|---|---|---|---|
| a reference series that went viral, Part 1 | 45 | 51 | 96 | GOOD |
| the reference series, Part 2 (690K views on Instagram) | 48 | 48 | 96 | GOOD |
| the reference series, Part 3 (444K) | 49 | 50 | 99 | GOOD |
| a deliberately weak render (a title card, one held frame, a robot voice, "like and subscribe") | 5 | 26 | 31 | ASS (boring) |
| a silent draft from another public stickman skill (no voice key) | 48 | 33 | 81 | ASS (no voice) |

The scores for the test videos are in `../PROOF.md`.
