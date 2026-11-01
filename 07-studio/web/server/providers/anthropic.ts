// Anthropic Messages API adapter (official @anthropic-ai/sdk).
import Anthropic from "@anthropic-ai/sdk";
import { ProviderError, type SpecProvider, type SpecRequest } from "./types.ts";

export const ANTHROPIC_DEFAULT_MODEL = "claude-opus-5-5";
export const ANTHROPIC_FAST_MODEL = "claude-sonnet-5-5";

export function createAnthropicProvider(model: string, apiKey?: string): SpecProvider {
  const client = new Anthropic({ apiKey });
  return {
    async generateSpec({ system, user }: SpecRequest): Promise<string> {
      try {
        // Streaming avoids HTTP timeouts on long specs; finalMessage() collects it.
        // `fallbacks: "default"` lets the API re-run a policy-declined request on a
        // suitable fallback model inside the same call.
        const stream = client.beta.messages.stream({
          model,
          max_tokens: 32000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          // The system prompt is the same for every video of a template: cache it so retries and repeat
          // generations read it at the cached-input rate instead of paying for it again.
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: user }],
        });
        const message = await stream.finalMessage();
        if (message.stop_reason === "refusal") {
          throw new ProviderError("anthropic", "The model declined this request. Try rephrasing the prompt.");
        }
        const text = message.content
          .flatMap((block) => (block.type === "text" ? [block.text] : []))
          .join("");
        if (!text.trim()) throw new ProviderError("anthropic", "Empty response from the model.");
        return text;
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        if (err instanceof Anthropic.APIError) {
          const rid = err.requestID ?? undefined;
          const suffix = rid ? ` (request_id ${rid})` : "";
          const message =
            err instanceof Anthropic.AuthenticationError
              ? `Anthropic rechazó ANTHROPIC_API_KEY (401). Revisa que sea una key de Anthropic (empieza con sk-ant-) en .env${suffix}.`
              : err instanceof Anthropic.RateLimitError
                ? `Límite de uso de Anthropic (429). Espera un momento y reintenta${suffix}.`
                : `Error de la API de Anthropic ${err.status ?? ""}: ${err.message}${suffix}`;
          throw Object.assign(new ProviderError("anthropic", message), { status: err.status, requestId: rid });
        }
        throw new ProviderError("anthropic", (err as Error).message);
      }
    },
  };
}
