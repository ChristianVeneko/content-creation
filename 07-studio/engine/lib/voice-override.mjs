// Voice chosen at build time (`--voice-id`, `--voice`): the id decides the provider unless one is given explicitly.
export const VOICE_PROVIDER_CHOICES = ["elevenlabs", "kokoro", "none"];
const ELEVENLABS_ID = /^[A-Za-z0-9]{20}$/;
const KOKORO_ID = /^[a-z]{2}_[a-z]+$/;

/**
 * @param {{voiceId?: string, provider?: string}} input
 * @returns {{override: {provider: string, voiceId?: string} | null} | {error: string}}
 */
export function resolveVoiceOverride({ voiceId, provider } = {}) {
  const id = typeof voiceId === "string" ? voiceId.trim() : "";
  if (provider !== undefined && !VOICE_PROVIDER_CHOICES.includes(provider)) return { error: `Unknown voice provider "${provider}"; allowed providers: ${VOICE_PROVIDER_CHOICES.join(", ")}` };
  if (provider === "none") return { override: { provider: "none" } };
  if (!id) return { override: provider ? { provider } : null };
  if (provider) return { override: { provider, voiceId: id } };
  if (ELEVENLABS_ID.test(id)) return { override: { provider: "elevenlabs", voiceId: id } };
  if (KOKORO_ID.test(id)) return { override: { provider: "kokoro", voiceId: id } };
  return { error: `Cannot tell which provider "${id}" belongs to: use a 20-character ElevenLabs id or a Kokoro id like em_alex, or pass --voice elevenlabs|kokoro` };
}
