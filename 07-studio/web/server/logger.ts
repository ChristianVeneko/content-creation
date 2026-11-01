// Structured logger: human-readable console lines + JSON lines file.
// Every message and field passes through `redact` so API keys never reach logs.
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const COLORS: Record<LogLevel, string> = { debug: "\x1b[90m", info: "\x1b[36m", warn: "\x1b[33m", error: "\x1b[31m" };
const RESET = "\x1b[0m";

// Known key shapes: Anthropic, OpenAI, ElevenLabs, Google, Bearer tokens.
const KEY_PATTERNS: RegExp[] = [
  /\b(sk-ant-)[A-Za-z0-9_-]{6,}/g,
  /\b(sk-(?:proj-)?)[A-Za-z0-9_-]{10,}/g,
  /\b(sk_)[A-Za-z0-9]{10,}/g,
  /\b(AIza)[A-Za-z0-9_-]{10,}/g,
  /\b(Bearer )[A-Za-z0-9._-]+/g,
];

/** Mask secrets: any env value whose name looks secret, plus known key patterns. */
export function redact(text: string, env: NodeJS.ProcessEnv = process.env): string {
  let out = text;
  for (const [name, value] of Object.entries(env)) {
    if (value && value.length >= 8 && /(KEY|TOKEN|SECRET|PASSWORD)/i.test(name)) {
      out = out.split(value).join(`${value.slice(0, 4)}…[${name}]`);
    }
  }
  for (const re of KEY_PATTERNS) out = out.replace(re, "$1…");
  return out;
}

function redactValue(value: unknown, env: NodeJS.ProcessEnv): unknown {
  if (typeof value === "string") return redact(value, env);
  if (value instanceof Error) {
    return { name: value.name, message: redact(value.message, env), stack: value.stack ? redact(value.stack, env) : undefined };
  }
  if (Array.isArray(value)) return value.map((v) => redactValue(v, env));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactValue(v, env)]));
  }
  return value;
}

export interface LoggerOptions {
  /** JSON lines file; omit to log to console only. */
  file?: string;
  level?: LogLevel;
  console?: boolean;
  env?: NodeJS.ProcessEnv;
}

export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  readonly file?: string;
}

export function createLogger(opts: LoggerOptions = {}): Logger {
  const env = opts.env ?? process.env;
  const min = LEVELS[opts.level ?? "info"] ?? LEVELS.info;
  const toConsole = opts.console ?? true;
  const color = toConsole && process.stdout.isTTY;
  if (opts.file) mkdirSync(path.dirname(opts.file), { recursive: true });

  function write(level: LogLevel, msg: string, fields: LogFields = {}): void {
    if (LEVELS[level] < min) return;
    const ts = new Date().toISOString();
    const safe = redactValue(fields, env) as LogFields;
    const safeMsg = redact(msg, env);
    if (opts.file) {
      try {
        appendFileSync(opts.file, JSON.stringify({ ts, level, msg: safeMsg, ...safe }) + "\n");
      } catch {
        // A log write must never crash the server.
      }
    }
    if (toConsole) {
      const extras = Object.entries(safe)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join(" ");
      const tag = level.toUpperCase().padEnd(5);
      const line = `${ts.slice(11, 23)} ${color ? COLORS[level] + tag + RESET : tag} ${safeMsg}${extras ? " " + extras : ""}`;
      (level === "error" || level === "warn" ? console.error : console.log)(line);
    }
  }

  return {
    file: opts.file,
    debug: (m, f) => write("debug", m, f),
    info: (m, f) => write("info", m, f),
    warn: (m, f) => write("warn", m, f),
    error: (m, f) => write("error", m, f),
  };
}

/** Process-wide logger, configured by `initLogger` at startup (console-only until then). */
export let log: Logger = createLogger({ console: true, level: "info" });

export function initLogger(opts: LoggerOptions): Logger {
  log = createLogger(opts);
  return log;
}
