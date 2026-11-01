// The spec-writer system prompt for one template. The engine trims the 42 KB manual to the shared rules plus the
// chosen template's family (engine lib/spec-writer-prompt.mjs), which cuts input tokens by 55-75% per generation.
// `creative` (Claude Code subscription only) adds the originals-first sections; API providers keep the catalog rules.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { StudioConfig } from "./config.ts";
import { FALLBACK_SYSTEM_PROMPT } from "./specGen.ts";

export interface SystemPrompt {
  text: string;
  source: "engine" | "fallback";
}

type Trimmer = (templateId: string, full: string, opts?: { creative?: boolean }) => string;

export async function systemPromptFor(
  templateId: string,
  config: Pick<StudioConfig, "specWriterPrompt" | "presetsDir">,
  opts: { creative?: boolean } = {},
): Promise<SystemPrompt> {
  if (!existsSync(config.specWriterPrompt)) return { text: FALLBACK_SYSTEM_PROMPT, source: "fallback" };
  const full = readFileSync(config.specWriterPrompt, "utf8");
  try {
    const mod = (await import(pathToFileURL(path.join(config.presetsDir, "spec-writer-prompt.mjs")).href)) as {
      specWriterPromptFor?: Trimmer;
    };
    return { text: mod.specWriterPromptFor ? mod.specWriterPromptFor(templateId, full, { creative: Boolean(opts.creative) }) : full, source: "engine" };
  } catch {
    return { text: full, source: "engine" };
  }
}
