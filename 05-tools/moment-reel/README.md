# Moment Reel: a free Claude Code skill that turns famous sports moments into cartoon story reels

Say "make a moment reel of the Hand of God" and Claude makes a 30-50 second vertical cartoon that tells it as a story:
- **the facts first:** it searches the web, keeps a sources file with read dates, and leaves out anything it can't verify;
- **a story, not a highlight:** the act first ("He punched the ball into the net with his hand..."), then the chain that led to it, the context, the reveal and the consequence;
- **a flat 2D cartoon:** simple shapes, bold colours, thick outlines, a paper texture and expressive faces, with comic freezes on the key instant, a TV replay with an arrow, the press room and the crowd, and a new picture every one or two seconds;
- **a voice-over from a free voice that runs on your computer,** with 2-4 word captions burned in, timed to every word;
- **sound made in code:** the crowd, kicks, whooshes, impacts and a light music bed.

There's no real footage, no photos, no broadcast audio, no AI video and no logos. Famous players are caricatures (hair, build, kit, number), never traced from a photo.

You get a 1080x1920 master for Reels, Shorts and TikTok, a 1008x1152 cut for X under 10 MB (drawn natively at 7:8, so it fills the tile), the covers, the sources and a check report.

**Example:** the 48 s reel on the page you downloaded this from (left out of this zip to keep it small): the skill's worked example, Maradona's "Hand of God" against England in 1986. The example's voice-over is the optional ElevenLabs narrator; by default the skill uses the free local Kokoro voice.

## What you need

A Claude subscription (Claude Code comes with Pro and Max). Nothing else: no other accounts, no API keys, no paid tools and no graphics card.

Claude Code installs these free tools once per computer:
- A Python environment in `~/.cache/moment-reel` with numpy, Pillow, imageio-ffmpeg (ffmpeg), kokoro-onnx, faster-whisper and websockets.
- The Kokoro-82M voice (Apache-2.0), the faster-whisper base.en timing model (MIT) and the Nunito caption font (SIL OFL), about 500 MB together.
- A browser to draw the frames in: it uses Google Chrome or Microsoft Edge if you have one, or else installs Playwright's free Chromium.

Python 3.10 or newer must be on the computer (python.org).

The voice is the free local Kokoro narrator. If you already pay for ElevenLabs and want it, set `ELEVENLABS_API_KEY` in your own shell and ask for it; the skill reads the key from the environment only and never prints it. A voice-over you already recorded can be brought in too (`import_voice.py`).

## Install

Copy the `moment-reel` folder into `~/.claude/skills/` (on Windows: `C:\Users\<you>\.claude\skills\`). That's all; Claude runs the setup the first time you use it.

## Make a reel

1. Make an empty folder and open Claude Code in it.
2. Say **"make a moment reel of ..."** with the moment, or "you pick".
3. Claude checks the facts and shows you the story, line by line, with the pictures each line gets and the sources. Say "go", or give notes.
4. Claude records the voice, plans a picture for every caption chunk, and draws three key frames, a style board, for you to approve.
5. Claude draws every shot, renders the frames for both cuts (about 10 minutes for 48 s on a normal 6-core CPU), mixes the sound and burns in the captions. Then it checks every frame:
   - a contact sheet every 0.5 s that it looks at tile by tile;
   - flicker, frozen shots, and a new picture for every caption;
   - loudness and the X file size.
6. **You get** `out/<name>_9x16.mp4`, `out/<name>_x_7x8.mp4`, two covers, `sources.md` and `qa/report.md`.

A new moment takes about 2.5-3.5 hours end to end: the sources and script take about half an hour, the drawing and fixing take most of the rest, and the machine time (voice, render, encode, checks) is about 15 minutes.

## What's in this download

- `moment-reel/SKILL.md`: the steps and the rules Claude follows.
- `moment-reel/scripts/`: the pipeline scripts.
  - `setup.py`: the free tools.
  - `new_reel.py`: a new reel folder with a starter scene for the sport.
  - `check_script.py`: checks the script against the story formula before it's voiced.
  - `narrate.py`: the voice, word times and caption chunks.
  - `import_voice.py`: a voice-over you already have.
  - `plan.py`: the shot plan timed to the words, and the sound cues.
  - `sound.py`: crowd, effects and music, synthesized.
  - `encode.py`: captions and both cuts.
  - `check.py`: the checks and the contact sheets.
- `moment-reel/renderers/`: the picture step.
  - `cartoon/`: the flat cartoon. `cartoon.js` holds people with poses and faces, the stadium, goal, ball, TV, press room, comic freezes and arrows; `render.py` runs headless Chrome.
  - `animatic/`: a moving storyboard in seconds.
  - Any renderer that reads `build/plan.json` and writes the frames fits (`renderers/README.md`).
- `moment-reel/reference/`: the story formula, the shot types and transitions, and the facts and real sizes to get for each sport.
- `moment-reel/examples/hand_of_god/`: Maradona's "Hand of God", 1986: the sources, the beat sheet, the script, the shot plan and `cartoon/moment.js` with all 46 shots.

## What it can't do (yet)

- **Five sports built in:** football, basketball, tennis, boxing and athletics (each venue seen from the side and from above). Any other sport needs its venue drawn in `moment.js` from the basic shapes, which takes Claude about 20-30 minutes.
- **Front and back views only.** People are flat puppets that face you or turn away, so a profile reads as someone walking sideways.
- **No lip sync.** Mouths are set per shot.
- **Listen yourself.** The sound is synthesized, with no real commentary or crowd, so listen once before you post.
- **The voice:** Kokoro speaks English and can't shout or act.
- **Only documented moments.** An obscure moment may not have enough sources to tell it.

## Rules it keeps

- Every fact on screen and in the voice is checked first; anything unverified stays out and is listed as left out.
- No real footage, photos, broadcast commentary or crowd recordings. Every picture is drawn and every sound is synthesized.
- Caricatures only: a famous player is recognisable by his hair, build, kit and number, never by a traced or realistic face, and no one's voice is imitated.
- No league, club, kit maker, sponsor or broadcaster logos, and no trophy designs.

## Credits

The flat cartoon look is in the spirit of the history-as-a-cartoon channels (OverSimplified and others); the story formula and the caption style follow Zack D. Films (youtube.com/@zackdfilms), studied frame by frame; nothing of theirs is copied. The first version of this skill rendered an era TV look in code, an idea from [lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar). Kokoro-82M (Apache-2.0), faster-whisper (MIT) and Nunito (SIL OFL) are downloaded at setup, not included here.

## License

MIT, see `LICENSE`.
