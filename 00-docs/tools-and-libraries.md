# Code-based Video Tools, MCPs & Pipelines (verified 2026-10-31)

## Rendering frameworks
| Tool | License | Use | Claude drives via |
|---|---|---|---|
| **Remotion** https://www.remotion.dev | free ≤3-person companies | React → MP4, best for templated shorts | `npx remotion render`, skills already installed (`remotion-*`) |
| @remotion/captions + install-whisper-cpp | same | word-level TikTok captions (`createTikTokStyleCaptions`) | npm |
| @remotion/mcp | free | docs search only (no render) | `npx @remotion/mcp@latest` |
| **HyperFrames** (HeyGen) https://github.com/heygen-com/hyperframes | Apache-2.0 | HTML/CSS+GSAP/Lottie → MP4, no React | `npx hyperframes`, Claude plugin |
| Revideo https://docs.re.video | MIT | headless Motion Canvas fork, render API | npm |
| Motion Canvas | MIT | TS explainer animations (editor-based) | npm |
| MoviePy https://github.com/Zulko/moviepy | MIT | Python editing | pip |
| Manim | MIT | math/diagram animation (`-r 1080,1920`) | pip |
| Editly | MIT (dormant) | JSON5 → video | npm |
| Twick | Sustainable Use | timeline-editor SDK | npm |
| Lottie / GSAP / Rive | free | animation inside Remotion/HyperFrames | npm |

## MCP servers & Claude integrations
- **Optional integrations:** Canva MCP, Higgsfield skills (`higgsfield-*`), Remotion skills.
- **ElevenLabs MCP** (TTS, cloning, STT, SFX): `claude mcp add elevenlabs -e ELEVENLABS_API_KEY=xxx -- uvx elevenlabs-mcp`
- **fal MCP** (1,000+ image/video/audio models): `claude mcp add --transport http fal https://mcp.fal.ai/mcp --header "Authorization: Key $FAL_KEY"`
- **Replicate MCP**: https://replicate.com/docs/reference/mcp
- **ffmpeg-mcp**: https://github.com/video-creator/ffmpeg-mcp · **mcp-ffmpeg**: https://github.com/bitscorp-mcp/mcp-ffmpeg
- **claude-code-video-toolkit** (skills: Remotion, Manim, ElevenLabs, ffmpeg, yt-dlp): https://github.com/digitalsamba/claude-code-video-toolkit
- **Youtube-clipper-skill**: https://github.com/op7418/Youtube-clipper-skill
- remotion-mcp-app (unofficial): https://github.com/mcp-use/remotion-mcp-app

## End-to-end "AI shorts" generators
- **MoneyPrinterTurbo** (MIT, very active): https://github.com/harry0703/MoneyPrinterTurbo. Topic → script → stock footage → TTS → subtitles → 9:16 MP4. REST API + web UI.
- short-video-maker (stale, reported vulnerability), ShortGPT (stale), MoneyPrinter v1.

## Long video → clips
- **OpenShorts** (MIT): https://github.com/mutonby/openshorts. LLM highlights + face-tracked 9:16 + subs.
- **SupoClip** (AGPL): https://github.com/FujiwaraChoki/supoclip. OpusClip alternative.
- AI-Youtube-Shorts-Generator: https://github.com/Anil-matcha/AI-Youtube-Shorts-Generator
- **auto-editor** (silence cuts): `brew install auto-editor`
- **PySceneDetect** (`scenedetect`), **MediaPipe** (face crop), Ultralytics YOLO (AGPL).

## Captions
- **mlx-whisper** (Apple Silicon, Metal; best on Mac), **whisper.cpp** (`brew install whisper.cpp`, `-ml 1 -oj`), faster-whisper (CPU only on Mac), **WhisperX** (precise alignment + diarization), whisper-timestamped.
- **pycaps** (MIT, active): CSS-styled CapCut-like animated captions. `pip install pycaps`
- stable-ts (archived), auto-subtitle, captacity (stale).
- DIY: word timestamps → ASS file with `\k`/`\c` per word, `PlayResX=1080 PlayResY=1920`, then `02-scripts/burn-captions.sh` (needs ffmpeg with libass).

## Audio
- **ElevenLabs** (premium TTS), **Kokoro** via **mlx-audio** / kokoro-onnx (free, local, multilingual), Chatterbox (MIT, emotional, cloneable), Piper (GPL), F5-TTS (weights NC).
- **Demucs** (adefossez fork) / audio-separator: separate voice and music.
- **ffmpeg-normalize**: `ffmpeg-normalize in.mp4 -t -14 -tp -1.5 -c:a aac -o out.mp4`
- **yt-dlp**: `--download-sections "*00:01:00-00:02:00"`

## Recommended starter stack
1. Render: Remotion 1080×1920@30 (or HyperFrames).
2. Captions: mlx-whisper → @remotion/captions (or ASS/pycaps for ffmpeg-only).
3. Voice: Kokoro (mlx-audio) for free, ElevenLabs for premium.
4. Clipping: yt-dlp → auto-editor → scenedetect → MediaPipe crop (or OpenShorts).
5. Finishing: Demucs → ffmpeg-normalize -14 LUFS → H.264 yuv420p faststart.

## Install (see 05-tools/install.sh)
