// OpenAI adapter (official `openai` SDK, Responses API).
import OpenAI from "openai";
import { ProviderError, type SpecProvider, type SpecRequest } from "./types.ts";

export const OPENAI_DEFAULT_MODEL = "gpt-5";

export function createOpenAIProvider(model: string, apiKey?: string): SpecProvider {
  const client = new OpenAI({ apiKey });
  return {
    async generateSpec({ system, user }: SpecRequest): Promise<string> {
      try {
        const response = await client.responses.create({
          model,
          instructions: system,
          input: user,
          text: { format: { type: "json_object" } },
        });
        const text = response.output_text;
        if (!text?.trim()) throw new ProviderError("openai", "Empty response from the model.");
        return text;
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        if (err instanceof OpenAI.APIError) {
          throw new ProviderError("openai", `OpenAI API error ${err.status ?? ""}: ${err.message}`);
        }
        throw new ProviderError("openai", (err as Error).message);
      }
    },
  };
}
