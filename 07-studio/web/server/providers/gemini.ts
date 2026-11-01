// Google Gemini adapter (official @google/genai SDK).
import { GoogleGenAI } from "@google/genai";
import { ProviderError, type SpecProvider, type SpecRequest } from "./types.ts";

export const GEMINI_DEFAULT_MODEL = "gemini-2.5-pro";

export function createGeminiProvider(model: string, apiKey?: string): SpecProvider {
  const ai = new GoogleGenAI({ apiKey });
  return {
    async generateSpec({ system, user }: SpecRequest): Promise<string> {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: user,
          config: { systemInstruction: system, responseMimeType: "application/json" },
        });
        const text = response.text;
        if (!text?.trim()) throw new ProviderError("gemini", "Empty response from the model.");
        return text;
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        throw new ProviderError("gemini", `Gemini error: ${(err as Error).message}`);
      }
    },
  };
}
