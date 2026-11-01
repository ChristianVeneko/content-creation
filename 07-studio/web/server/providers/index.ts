// Provider registry: availability from the environment (never exposes key values)
// and factory for the adapter behind the common SpecProvider interface.
import { accessSync, constants } from "node:fs";
import path from "node:path";
import type { ProviderId, ProviderInfo } from "../../shared/types.ts";
import { ANTHROPIC_DEFAULT_MODEL, ANTHROPIC_FAST_MODEL, createAnthropicProvider } from "./anthropic.ts";
import { createClaudeCodeProvider } from "./claudeCode.ts";
import { GEMINI_DEFAULT_MODEL, createGeminiProvider } from "./gemini.ts";
import { OPENAI_DEFAULT_MODEL, createOpenAIProvider } from "./openai.ts";
import type { SpecProvider } from "./types.ts";

export const PROVIDER_IDS: ProviderId[] = ["claudeCode", "anthropic", "openai", "gemini"];

function hasValue(v: string | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/** Resolve an executable on PATH (or an absolute path). Returns null when missing. */
export function findExecutable(bin: string, envPath = process.env.PATH ?? ""): string | null {
  const candidates = bin.includes("/") ? [bin] : envPath.split(path.delimiter).map((d) => path.join(d, bin));
  for (const c of candidates) {
    try {
      accessSync(c, constants.X_OK);
      return c;
    } catch {
      // keep looking
    }
  }
  return null;
}

/**
 * Explain why a present key cannot be right, or null when it looks fine.
 * Catches the common mistake of pasting another service's key (same value)
 * or a key with the wrong prefix, before any request is made.
 */
export function keyProblem(name: string, env: NodeJS.ProcessEnv, prefix?: string): string | null {
  const value = env[name]?.trim();
  if (!value) return `Falta ${name} en .env`;
  for (const [other, v] of Object.entries(env)) {
    if (other !== name && /_(API_)?KEY$/.test(other) && v?.trim() === value) {
      return `${name} tiene el mismo valor que ${other}: parece que pegaste la key equivocada.`;
    }
  }
  if (prefix && !value.startsWith(prefix)) {
    return `${name} no tiene el formato correcto (debe empezar con "${prefix}").`;
  }
  return null;
}

export interface RegistryDeps {
  env?: NodeJS.ProcessEnv;
  claudeBin?: string;
  which?: (bin: string) => string | null;
}

export function listProviders(deps: RegistryDeps = {}): ProviderInfo[] {
  const env = deps.env ?? process.env;
  const which = deps.which ?? ((b: string) => findExecutable(b, env.PATH ?? ""));
  const claudeBin = deps.claudeBin ?? env.CLAUDE_BIN ?? "claude";
  const claudePath = which(claudeBin);
  const geminiKey = hasValue(env.GEMINI_API_KEY) || hasValue(env.GOOGLE_API_KEY);
  const anthropicProblem = keyProblem("ANTHROPIC_API_KEY", env, "sk-ant-");
  const openaiProblem = keyProblem("OPENAI_API_KEY", env, "sk-");

  return [
    {
      id: "claudeCode",
      label: "Claude Code (suscripción)",
      available: claudePath !== null,
      model: env.CLAUDE_CODE_MODEL ?? "default",
      reason: claudePath ? undefined : "No se encontró el comando `claude` en el PATH.",
    },
    {
      id: "anthropic",
      label: "Anthropic",
      available: anthropicProblem === null,
      model: env.ANTHROPIC_MODEL ?? ANTHROPIC_DEFAULT_MODEL,
      models: [
        { id: env.ANTHROPIC_MODEL ?? ANTHROPIC_DEFAULT_MODEL, label: "Opus 5.5 · mejor calidad" },
        { id: ANTHROPIC_FAST_MODEL, label: "Sonnet 5.5 · más rápido" },
      ],
      reason: anthropicProblem ?? undefined,
    },
    {
      id: "openai",
      label: "OpenAI",
      available: openaiProblem === null,
      model: env.OPENAI_MODEL ?? OPENAI_DEFAULT_MODEL,
      reason: openaiProblem ?? undefined,
    },
    {
      id: "gemini",
      label: "Gemini",
      available: geminiKey,
      model: env.GEMINI_MODEL ?? GEMINI_DEFAULT_MODEL,
      reason: geminiKey ? undefined : "Falta GEMINI_API_KEY en .env",
    },
  ];
}

export function isProviderId(v: unknown): v is ProviderId {
  return typeof v === "string" && (PROVIDER_IDS as string[]).includes(v);
}

export interface CreateProviderOptions {
  env?: NodeJS.ProcessEnv;
  model?: string;
  claudeBin?: string;
  claudeTimeoutMs?: number;
}

export function createProvider(id: ProviderId, opts: CreateProviderOptions = {}): SpecProvider {
  const env = opts.env ?? process.env;
  const info = listProviders({ env, claudeBin: opts.claudeBin }).find((p) => p.id === id);
  if (!info?.available) throw new Error(info?.reason ?? `Unknown provider: ${id}`);
  switch (id) {
    case "anthropic":
      return createAnthropicProvider(opts.model ?? info.model, env.ANTHROPIC_API_KEY);
    case "openai":
      return createOpenAIProvider(opts.model ?? info.model, env.OPENAI_API_KEY);
    case "gemini":
      return createGeminiProvider(opts.model ?? info.model, env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY);
    case "claudeCode":
      return createClaudeCodeProvider({
        bin: opts.claudeBin ?? env.CLAUDE_BIN ?? "claude",
        timeoutMs: opts.claudeTimeoutMs,
        model: env.CLAUDE_CODE_MODEL,
        env,
      });
  }
}
