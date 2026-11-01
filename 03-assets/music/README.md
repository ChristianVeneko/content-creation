# Music

Curated, commercial-safe background music for the Video Studio, organized by mood. The engine reads
`library.json`; see `07-studio/engine/README.md` § Music for how tracks are picked and mixed.

| Folder (mood) | Feel |
|---|---|
| `tech-lofi/` | Chill lo-fi / electric-piano grooves for tech, code, AI, tutorials |
| `cinematic-epic/` | Big percussion and orchestra for history, stakes, "the future" |
| `tense-mystery/` | Suspense pulses for mysteries, risks, mistakes, news |
| `inspiring-uplifting/` | Bright, positive, building: motivation, habits, success |
| `minimal-ambient/` | Calm pads / electric piano: quotes, reflection, slow topics |
| `upbeat-fun/` | Bouncy, playful: curiosities, food, travel, listicles |
| `ende-happy-beats/` (mood `corporate-happy`) | The original ende.app "Happy Beats / Business Moves" pack |
| `generated/` | ElevenLabs Music tracks generated per video (cache; `<hash>.mp3` + `<hash>.json` metadata) |

Each mood folder has `cues/<track>.music-cues.json` (tempo, beat grid, strong cues) made with brag's
`analyze_music_cues.py`.

## Sources and licenses

Only licenses that allow commercial use and modification are accepted: **CC0** and **CC BY** (any version).
NC, ND and SA licenses are refused by the downloader and again by the engine's loader (`lib/music.mjs`).

- **Incompetech (Kevin MacLeod)**, CC BY 4.0, https://incompetech.com. Downloaded from the public catalog
  (`pieces.json`) and the site's direct MP3 links. Required credit (one line per track, kept in `library.json`):
  `<Title> Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/`
- **ende.app** "Happy Beats / Business Moves", CC BY 4.0. Credit: `Music: ende.app (CC BY 4.0)`.
- **Openverse** (CC0 / CC BY results only) is supported by the downloader (`--openverse`), but its audio API timed
  out on every request when the library was built (2026-10-31), so no Openverse tracks are included yet.
- **ElevenLabs Music** (`generated/`): generated on demand with the user's ElevenLabs plan; credit
  `Music: generated with ElevenLabs Music`. Usage rights follow the ElevenLabs plan terms.
- Not used on purpose: Pixabay, Uppbeat and the YouTube Audio Library (their terms forbid automated download).

## Credit rules

- The build writes the chosen track's `credit` into the `## Credits` section of `post.md`. Paste it into the
  video description when publishing (CC BY requires attribution).
- Record the track in the project's `brief.md` when a video uses it.

## Quality checks

`07-studio/engine/scripts/music-fetch.py` downloads the curated titles and rejects any track that is shorter than
60 s, clips (> 0.2 % of samples at full scale), has a silent gap longer than 3 s in its first 90 s, or contains vocals
(demucs `htdemucs` two-stem split on a 40 s excerpt; rejected when the vocal stem is louder than -14 dB relative to the
mix). Rejections are listed in `rejected.json`; the check values of accepted tracks are in `library.json` (`check`).

Rebuild or refresh (keeps already-checked tracks):

```bash
source ./env.sh   # from the repo root
.venv/bin/python 07-studio/engine/scripts/music-fetch.py [--per-mood 5] [--openverse]
```

`.history.json` stores the last tracks the engine used, so consecutive renders avoid repeating a track.
