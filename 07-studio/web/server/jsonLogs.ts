// Incremental parser for the engine's `--json-logs` stdout stream:
// one JSON object per line `{step, status, message, progress}`.
import type { EngineLog } from "../shared/types.ts";

export type LogLine = { kind: "log"; log: EngineLog } | { kind: "text"; text: string };

/** Parse a single line. Non-JSON or malformed lines come back as plain text. */
export function parseLogLine(line: string): LogLine | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      if (obj && typeof obj === "object" && typeof obj.step === "string") {
        const log: EngineLog = {
          step: obj.step,
          status: typeof obj.status === "string" ? obj.status : "info",
        };
        if (typeof obj.message === "string") log.message = obj.message;
        if (typeof obj.progress === "number" && Number.isFinite(obj.progress)) {
          // Accept both 0..1 and 0..100 conventions; normalize to 0..1.
          log.progress = clamp01(obj.progress > 1 ? obj.progress / 100 : obj.progress);
        }
        return { kind: "log", log };
      }
    } catch {
      // fall through to text
    }
  }
  return { kind: "text", text: trimmed };
}

/**
 * Feed arbitrary chunks (split anywhere, even mid-line); emits complete lines.
 * Call `end()` to flush a trailing line without a newline.
 */
export class JsonLogStream {
  #buffer = "";
  #onLine: (line: LogLine) => void;

  constructor(onLine: (line: LogLine) => void) {
    this.#onLine = onLine;
  }

  push(chunk: string | Buffer): void {
    this.#buffer += chunk.toString();
    let idx: number;
    while ((idx = this.#buffer.indexOf("\n")) !== -1) {
      const line = this.#buffer.slice(0, idx).replace(/\r$/, "");
      this.#buffer = this.#buffer.slice(idx + 1);
      const parsed = parseLogLine(line);
      if (parsed) this.#onLine(parsed);
    }
  }

  end(): void {
    const parsed = parseLogLine(this.#buffer);
    this.#buffer = "";
    if (parsed) this.#onLine(parsed);
  }
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
