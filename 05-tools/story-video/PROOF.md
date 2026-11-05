# Proof: what the v7 prompt made, and how it rated

The ratings come from fresh Claude sessions using the rater in `rater/`, blind. Each rater saw only the frames and numbers that `rate_prep.py` pulls from the MP4. They also did a LOOK check against the spec.

## The videos

| video | how it was made | story / craft | total | verdict | LOOK check |
|---|---|---|---|---|---|
| `test_videos/hero_floor7_part1.mp4` (78 s): FLOOR 7, Part 1 | A Claude session followed this prompt to remake our FLOOR 7 story in 3D. We then fixed three things: a wider opening frame, the 37 to 18 counter landing early, and caption chunks by meaning. | 53 / 47 | 100 / 120 | GOOD, no point under 7 | 7 of 7 |
| `test_videos/replication_v7_motel.mp4` (68 s): SNOWED IN at a motel | A fresh session in an empty folder, with "you pick" at every gate. The session was cut off before the frame render; we ran its own remaining commands (render, encode, cover) and applied the caption chunk fix. | 52 / 52 | 104 / 120 | GOOD, lowest point 6 (the first frame) | 6 of 7 (some captions run to 4 words) |

For comparison, the viral reference series rated 96 to 99 on the same rater (Parts 1 to 3).

## What the raters still flag

- **The first frame.** A close-up of the hero's face reads weakly at feed size; open on the threat. The guide now says so in the start gate and the stills check.
- **Voice clarity** is about 0.87 against a 0.88 target with the free local voice. A listen is worth it; "bitten" was transcribed as "busy" once.
- **Length.** The FLOOR 7 hero runs 78 s, 3 s past the 75 s sweet spot.
- **The choice leans one way.** Both end-card votes tilt toward the safe answer. The guide asks for a 50/50 split, but the scripts still drift.

## Measured

| video | loudness | true peak | pacing | phone copy |
|---|---|---|---|---|
| hero | -14.3 LUFS | -3.3 dBFS | 6.9 cuts per 10 s | 7.0 MB |
| motel | -14.2 LUFS | -3.4 dBFS | 6.9 cuts per 10 s | 5.8 MB |

