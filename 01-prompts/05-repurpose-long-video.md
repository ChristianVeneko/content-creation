# Repurpose a long video into 5 clips
Get the transcript first: `02-scripts/transcribe.sh video.mp4 es` (produces .srt/.json with timestamps).
```
You are a clip editor. Below is a timestamped transcript of a long video ({duration}, topic: {topic}).

Find the 5 best standalone vertical clips (each {20–60}s).
For each clip output:
- Rank and clip title
- Start–end timestamps (exact, from the transcript)
- Why it works (insight, emotion, controversy, story, or tactical value)
- Hook: the first spoken line as-is, plus a REWRITTEN cold-open hook if the original start is weak (note where to splice it, e.g. pull a later punchline to the front)
- Trims: sentences/filler to cut inside the range (with timestamps)
- On-screen text for 0–3s (≤6 words)
- Suggested b-roll/inserts
- Ending: where to cut so it loops or lands on a punchline
- Caption first line

Rules: each clip must make sense with zero context; prefer moments with a clear claim + payoff; no two clips on the same idea.
Also output an ffmpeg command per clip: ffmpeg -ss START -to END -i {input} ... then pipe to 02-scripts/to-vertical.sh.

Transcript:
{transcript}
```
