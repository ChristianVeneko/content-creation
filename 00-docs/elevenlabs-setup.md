# ElevenLabs setup

1. Create an API key at https://elevenlabs.io/app/settings/api-keys (enable Text to Speech, Voices read, Speech to Text, Sound Effects, Music if you will use them).
2. `cp .env.example .env` (once) and set `ELEVENLABS_API_KEY=sk_...`. The default voice of the app is `WFmom5vWeiir6CN1crV3` (set in `07-studio/engine/lib/tts.mjs`); a spec or channel `voiceId` overrides it. `ELEVENLABS_VOICE_ID` is no longer read.
3. Restart Claude Code inside the repo folder. It picks up the project-scoped `.mcp.json` (server `elevenlabs`, launched by `05-tools/bin/elevenlabs-mcp`, caches inside the repo). Approve the server when Claude Code asks. Check with `/mcp`.
4. Usage:
   - Engine / web studio: set `voice.provider: "elevenlabs"` (the web studio exposes it once the key exists). Model: `eleven_multilingual_v2`.
   - Claude Code: "hazme un video" → choose "ElevenLabs" in the voice question, or ask directly ("genera la voz con ElevenLabs").
   - MCP output files land in `04-projects/_elevenlabs/`.
5. Commercial use requires a paid ElevenLabs plan (the free tier requires attribution).
