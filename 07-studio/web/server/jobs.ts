// Job store: one folder per video under 04-projects/<date>-<slug>/ holding
// spec.json, job.json (studio metadata) and the engine outputs.
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ContentStage, EngineLog, JobDetail, JobStatus, JobSummary, ProviderId, VideoSpec } from "../shared/types.ts";

export const OUTPUT_FILES = ["video.mp4", "cover.jpg", "post.md", "spec.json"] as const;
export type OutputFile = (typeof OUTPUT_FILES)[number];

export interface JobMeta {
  id: string;
  title: string;
  template: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  prompt?: string;
  provider?: ProviderId;
  error?: string;
  logs: EngineLog[];
  progress: number;
  /** Channel slug (08-channels/<slug>). */
  channel?: string;
  /** Content stage set by hand. Older jobs have none: see deriveStage. */
  stage?: ContentStage;
  /** Free notes, mainly for ideas. */
  notes?: string;
  publishedAt?: string;
  links?: string[];
}

export type JobEvent =
  | { type: "log"; log: EngineLog; progress: number }
  | { type: "text"; text: string }
  | { type: "status"; status: JobStatus; error?: string };

const MAX_LOGS = 400;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function slugify(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug || "video";
}

export function isValidJobId(id: string): boolean {
  return ID_RE.test(id) && !id.includes("..");
}

/** The stored stage wins; jobs from before stages existed read as ready with a video, else draft. */
export function deriveStage(stage: ContentStage | undefined, hasVideo: boolean): ContentStage {
  return stage ?? (hasVideo ? "ready" : "draft");
}

export class JobStore {
  readonly root: string;
  readonly events = new EventEmitter();

  constructor(root: string) {
    this.root = root;
    this.events.setMaxListeners(100);
  }

  dirOf(id: string): string {
    if (!isValidJobId(id)) throw new Error("Invalid job id");
    return path.join(this.root, id);
  }

  private newFolder(title: string, now: Date): string {
    mkdirSync(this.root, { recursive: true });
    const base = `${now.toISOString().slice(0, 10)}-${slugify(title)}`;
    let id = base;
    for (let n = 2; existsSync(path.join(this.root, id)); n++) id = `${base}-${n}`;
    mkdirSync(path.join(this.root, id), { recursive: true });
    return id;
  }

  create(
    input: { title: string; template: string; prompt: string; provider: ProviderId; spec: VideoSpec; channel?: string },
    now = new Date(),
  ): string {
    const id = this.newFolder(input.title || input.prompt, now);
    const meta: JobMeta = {
      id,
      title: input.title,
      template: input.template,
      status: "draft",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      prompt: input.prompt,
      provider: input.provider,
      logs: [],
      progress: 0,
      stage: "draft",
      ...(input.channel ? { channel: input.channel } : {}),
    };
    this.writeMeta(meta);
    this.writeSpec(id, input.spec);
    return id;
  }

  /** An idea: a job folder with job.json only (no script yet), stage "idea". */
  createIdea(input: { title: string; notes?: string; channel?: string }, now = new Date()): string {
    const id = this.newFolder(input.title, now);
    const meta: JobMeta = {
      id,
      title: input.title,
      template: "",
      status: "draft",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      logs: [],
      progress: 0,
      stage: "idea",
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.channel ? { channel: input.channel } : {}),
    };
    this.writeMeta(meta);
    return id;
  }

  writeSpec(id: string, spec: VideoSpec): string {
    const file = path.join(this.dirOf(id), "spec.json");
    writeFileSync(file, JSON.stringify(spec, null, 2) + "\n");
    return file;
  }

  readSpec(id: string): VideoSpec | undefined {
    const file = path.join(this.dirOf(id), "spec.json");
    if (!existsSync(file)) return undefined;
    try {
      return JSON.parse(readFileSync(file, "utf8")) as VideoSpec;
    } catch {
      return undefined;
    }
  }

  readMeta(id: string): JobMeta | undefined {
    const dir = this.dirOf(id);
    const file = path.join(dir, "job.json");
    if (existsSync(file)) {
      try {
        return JSON.parse(readFileSync(file, "utf8")) as JobMeta;
      } catch {
        // fall through to inference
      }
    }
    // Projects created outside the studio (CLI or /video skill): infer metadata.
    if (!existsSync(dir)) return undefined;
    const spec = this.readSpec(id);
    if (!spec && !existsSync(path.join(dir, "video.mp4"))) return undefined;
    const st = statSync(dir);
    return {
      id,
      title: spec?.title ?? id,
      template: spec?.template ?? "",
      status: existsSync(path.join(dir, "video.mp4")) ? "done" : "draft",
      createdAt: st.birthtime.toISOString(),
      updatedAt: st.mtime.toISOString(),
      logs: [],
      progress: 0,
    };
  }

  writeMeta(meta: JobMeta): void {
    meta.updatedAt = new Date().toISOString();
    if (meta.logs.length > MAX_LOGS) meta.logs = meta.logs.slice(-MAX_LOGS);
    writeFileSync(path.join(this.dirOf(meta.id), "job.json"), JSON.stringify(meta, null, 2) + "\n");
  }

  update(id: string, patch: Partial<JobMeta>): JobMeta {
    const meta = this.readMeta(id);
    if (!meta) throw new Error(`Job not found: ${id}`);
    const next = { ...meta, ...patch, id };
    this.writeMeta(next);
    return next;
  }

  emit(id: string, event: JobEvent): void {
    this.events.emit(id, event);
  }

  summary(meta: JobMeta): JobSummary {
    const dir = this.dirOf(meta.id);
    const hasVideo = existsSync(path.join(dir, "video.mp4"));
    return {
      id: meta.id,
      title: meta.title,
      template: meta.template,
      status: meta.status,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      prompt: meta.prompt,
      provider: meta.provider,
      error: meta.error,
      dir,
      hasVideo,
      hasCover: existsSync(path.join(dir, "cover.jpg")),
      hasSpec: existsSync(path.join(dir, "spec.json")),
      channel: meta.channel,
      stage: deriveStage(meta.stage, hasVideo),
      notes: meta.notes,
      publishedAt: meta.publishedAt,
      links: meta.links,
    };
  }

  detail(id: string): JobDetail | undefined {
    const meta = this.readMeta(id);
    if (!meta) return undefined;
    const postFile = path.join(this.dirOf(id), "post.md");
    return {
      ...this.summary(meta),
      spec: this.readSpec(id),
      logs: meta.logs,
      progress: meta.progress,
      postMarkdown: existsSync(postFile) ? readFileSync(postFile, "utf8") : undefined,
    };
  }

  list(): JobSummary[] {
    if (!existsSync(this.root)) return [];
    return readdirSync(this.root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && isValidJobId(d.name) && !d.name.startsWith("_"))
      .flatMap((d) => {
        const meta = this.readMeta(d.name);
        return meta ? [this.summary(meta)] : [];
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  filePath(id: string, name: string): string | null {
    if (!(OUTPUT_FILES as readonly string[]).includes(name)) return null;
    const file = path.join(this.dirOf(id), name);
    return existsSync(file) ? file : null;
  }
}
