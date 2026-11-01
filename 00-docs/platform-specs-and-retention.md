# Platform Specs & Retention Playbook (late 2026)

**[O]** = official platform doc, **[3P]** = third-party guide (these vary, so check in the app).

## Specs
| Spec | Instagram Reels | TikTok | YouTube Shorts |
|---|---|---|---|
| Canvas | 1080×1920 9:16 | 1080×1920 9:16 (≥720p) [O] | 1080×1920; must be vertical/square [O] |
| Max duration | 3 min [3P] | 10 min in-app (60 min via web on some accounts) [3P] | 3 min (since Oct 15, 2024) [O] |
| Ideal duration | 15–60s (60–90s for education) | 15–45s (1–3 min storytime) | 20–60s |
| FPS | 30 | 30 (up to 60) | match source [O] |
| Codec | H.264 + AAC, MP4 | H.264 (H.265 OK) | H.264 High, closed GOP, AAC-LC 48kHz, faststart [O] |
| Bitrate 1080p | ~8–10 Mbps | ~8–12 Mbps | 8 Mbps @30fps, 12 Mbps @60fps [O] |
| Safe zone | ~220px top, 280–420px bottom, 120px right | 240px top, 660px bottom, 120px sides, buttons on the right from y≈840 | ~250px top, 400–500px bottom, 190px right |
| Caption | 2,200 chars, **max 5 hashtags** (Dec 2025) [3P] | ~4,000 chars | Title 100 (40 visible), description 5,000, >60 hashtags = all ignored [O] |
| Cover | 1080×1920; profile grid crops to 3:4 (1080×1440) | frame or image 1080×1920 | strong first frame |

**Universal preset:** 1080×1920, 30fps, H.264 High, ~10 Mbps VBR, AAC 48kHz 320–384kbps, MP4 faststart, audio at -14 LUFS.
**Universal safe zone:** keep text and faces inside a **center box of 900×1300 px, slightly high**. Captions go at ~55–70% of frame height.
Overlay: `03-assets/overlays/safe-zone-1080x1920.png` (generate with `02-scripts/make-safe-zone.sh`).

Sources: [YouTube Shorts 3 min](https://support.google.com/youtube/answer/15424877) · [YouTube encoding](https://support.google.com/youtube/answer/1722171) · [YouTube hashtags](https://support.google.com/youtube/answer/6390658) · [TikTok creative best practices](https://ads.tiktok.com/help/article/creative-best-practices) · [Later: IG hashtags](https://later.com/blog/instagram-hashtags/)

## Retention
**Hook (0–3s):** state the payoff in the first 3s (TikTok [O]). Show a face in the first 1–2s. Run three hooks at once: visual, spoken, and text on screen by 0.5s. No intros or logos.
**Pacing:** something changes every 2–4s (cut, 110–120% punch-in, b-roll, SFX, text pop). Fast formats cut every 1–1.5s. Add an open loop every 5–8s. Remove breaths and dead air (`cut-silences.sh`). Target ~170 wpm.
**Captions:** 1–4 words per chunk, bold sans-serif, white with a black stroke, the active word in color. Max ~5–10 words/s (TikTok).
**Loop:** the last line connects back to the first. Match the first and last frames.
**CTA:** only one, tied to the payoff. "Send this to…" works best on IG because sends/DMs are a top signal. No outro.
**Analytics:** YouTube "viewed vs swiped away" low means a weak hook; high viewed with low % watched means a weak middle. IG signals: watch time, likes/reach, sends/reach.
**Cadence:** 3–5/week per platform. Upload the master without the TikTok watermark. Test 2–3 hooks on the same body. Track hook, length, 3s retention, and % viewed in `00-docs/content-log.csv`.

## Viral formats
| Format | Structure |
|---|---|
| Talking head + b-roll | Hook to camera → context → 2–3 points with b-roll → payoff → CTA/loop |
| Listicle | "N things that X" → best item last (tease it at the start) → 3–6s per item → "save this" |
| POV | Text "POV: …" at frame 1 → acted scene → escalation → twist |
| Before/After | After for 1s → "here's how" → before → 3–5 fast steps → reveal → loop |
| Storytime | Climax as a cold open → rewind → tension + open loops → twist → lesson |
| Tutorial | Result first → N steps (<8s each) with labels → common mistake → result |
| Green screen | Article/tweet behind you → reaction hook → explain → take → question CTA |
| Myth vs Fact | "Stop doing X" → why → what to do instead → proof |
| Reply to comment | Comment bubble on screen → ~30s answer → invite the next question |
