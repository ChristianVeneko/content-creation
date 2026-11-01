// "Claude Code (subscription)" adapter: shells out to `claude -p ... --output-format json`.
// No API key: the CLI uses the user's logged-in Claude Code subscription.
import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { ProviderError, type SpecProvider, type SpecRequest } from "./types.ts";

export type SpawnFn = (cmd: string, args: string[], opts: SpawnOptions) => ChildProcess;

export interface ClaudeCodeOptions {
  bin?: string;
  timeoutMs?: number;
  model?: string;
  /** Working directory for the CLI (kept outside the repo so no project CLAUDE.md loads). */
  cwd?: string;
  spawnFn?: SpawnFn;
  env?: NodeJS.ProcessEnv;
}

/**
 * Parse the stdout of `claude -p --output-format json`.
 * Expected shape: `{ "type": "result", "subtype": "success", "is_error": false, "result": "..." }`.
 */
export function parseClaudeJsonOutput(stdout: string): string {
  const trimmed = stdout.trim();
  if (!trimmed) throw new ProviderError("claudeCode", "Claude Code returned no output.");
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    // Some versions print a JSON array of events; others may prepend warnings.
    const last = trimmed.split("\n").reverse().find((l) => l.trim().startsWith("{"));
    if (!last) throw new ProviderError("claudeCode", "Could not parse Claude Code JSON output.");
    data = JSON.parse(last);
  }
  const result = Array.isArray(data)
    ? (data as Record<string, unknown>[]).findLast((e) => e && e.type === "result")
    : (data as Record<string, unknown>);
  if (!result || typeof result !== "object") {
    throw new ProviderError("claudeCode", "Claude Code output had no result.");
  }
  if (result.is_error === true || (typeof result.subtype === "string" && result.subtype !== "success")) {
    const detail = typeof result.result === "string" ? result.result : String(result.subtype ?? "error");
    throw new ProviderError("claudeCode", `Claude Code reported an error: ${detail}`);
  }
  if (typeof result.result !== "string" || !result.result.trim()) {
    throw new ProviderError("claudeCode", "Claude Code result was empty.");
  }
  return result.result;
}

export function createClaudeCodeProvider(opts: ClaudeCodeOptions = {}): SpecProvider {
  const bin = opts.bin ?? "claude";
  const timeoutMs = opts.timeoutMs ?? 300_000;
  const spawnFn: SpawnFn = opts.spawnFn ?? ((c, a, o) => spawn(c, a, o));

  return {
    generateSpec({ system, user }: SpecRequest): Promise<string> {
      const args = [
        "-p",
        user,
        "--output-format",
        "json",
        "--system-prompt",
        system,
        "--tools",
        "",
        "--no-session-persistence",
        // Skip the user's CLAUDE.md, skills, plugins, hooks and MCP servers: the spec
        // writer needs none of them, and loading them costs ~190k context tokens per call.
        "--safe-mode",
        "--strict-mcp-config",
        "--disable-slash-commands",
      ];
      if (opts.model) args.push("--model", opts.model);

      // Never hand an API key to the CLI: it would bill the API instead of the subscription.
      const env = { ...(opts.env ?? process.env) };
      delete env.ANTHROPIC_API_KEY;
      delete env.ANTHROPIC_AUTH_TOKEN;

      const cwd = opts.cwd ?? path.join(env.TMPDIR ?? process.cwd(), "video-studio-claude");
      if (!opts.spawnFn) mkdirSync(cwd, { recursive: true });

      return new Promise<string>((resolve, reject) => {
        let child: ChildProcess;
        try {
          child = spawnFn(bin, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
        } catch (err) {
          reject(new ProviderError("claudeCode", `Could not start '${bin}': ${(err as Error).message}`));
          return;
        }
        let stdout = "";
        let stderr = "";
        let settled = false;
        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          fn();
        };
        const timer = setTimeout(() => {
          // Settle first: kill() may emit "close" synchronously.
          finish(() =>
            reject(new ProviderError("claudeCode", `Claude Code timed out after ${Math.round(timeoutMs / 1000)}s.`)),
          );
          child.kill("SIGTERM");
        }, timeoutMs);

        child.stdout?.on("data", (d: Buffer) => (stdout += d.toString()));
        child.stderr?.on("data", (d: Buffer) => (stderr += d.toString()));
        child.on("error", (err) =>
          finish(() => reject(new ProviderError("claudeCode", `Could not run '${bin}': ${err.message}`))),
        );
        child.on("close", (code) =>
          finish(() => {
            try {
              // Even on non-zero exit, the JSON result often explains the failure.
              resolve(parseClaudeJsonOutput(stdout));
            } catch (err) {
              if (code !== 0 && !stdout.trim()) {
                reject(
                  new ProviderError(
                    "claudeCode",
                    `claude exited with code ${code}: ${stderr.trim().slice(0, 400) || "no output"}`,
                  ),
                );
              } else {
                reject(err);
              }
            }
          }),
        );
      });
    },
  };
}
