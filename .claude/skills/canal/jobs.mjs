#!/usr/bin/env node
// Token-lean helper for /canal and /video: reads 08-channels/ and 04-projects/*/job.json so the agent
// never opens those files one by one. Same folder naming and job.json shape as the web studio
// (07-studio/web/server/jobs.ts). Dependency-free.
//
//   node .claude/skills/canal/jobs.mjs channels
//   node .claude/skills/canal/jobs.mjs status [<channel>]
//   node .claude/skills/canal/jobs.mjs new "<title>" [--channel s] [--template t] [--stage idea|draft] [--notes "..."]
//   node .claude/skills/canal/jobs.mjs set <id> stage=ready [channel=s] [status=done] [template=t] [title=...] [publishedAt=ISO] [links=a,b]
//
// Env overrides (tests): CC_PROJECTS_DIR, CC_CHANNELS_DIR.
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PROJECTS = process.env.CC_PROJECTS_DIR ?? path.join(ROOT, "04-projects");
const CHANNELS = process.env.CC_CHANNELS_DIR ?? path.join(ROOT, "08-channels");
const STAGES = ["idea", "draft", "ready", "published"];
const STATUSES = ["draft", "rendering", "done", "failed"];
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const die = (msg) => { console.error(`error: ${msg}`); process.exit(1); };
const readJson = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return undefined; } };

export function slugify(text) {
  const slug = text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/g, "");
  return slug || "video";
}

function listChannels() {
  if (!existsSync(CHANNELS)) return [];
  return readdirSync(CHANNELS).filter((d) => !d.startsWith("_") && !d.startsWith("."))
    .map((d) => readJson(path.join(CHANNELS, d, "channel.json"))).filter(Boolean);
}

function listJobs() {
  if (!existsSync(PROJECTS)) return [];
  const out = [];
  for (const id of readdirSync(PROJECTS).sort()) {
    if (id.startsWith("_") || id.startsWith(".") || !ID_RE.test(id)) continue;
    const dir = path.join(PROJECTS, id);
    if (!statSync(dir).isDirectory()) continue;
    const meta = readJson(path.join(dir, "job.json"));
    const spec = meta ? undefined : readJson(path.join(dir, "spec.json"));
    const hasVideo = existsSync(path.join(dir, "video.mp4"));
    if (!meta && !spec && !hasVideo) continue;
    out.push({ id, title: meta?.title ?? spec?.title ?? id, channel: meta?.channel ?? "",
      stage: meta?.stage ?? (hasVideo ? "ready" : "draft"), hasVideo });
  }
  return out;
}

function flags(args) {
  const f = {}, rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) f[args[i].slice(2)] = args[++i];
    else rest.push(args[i]);
  }
  return { f, rest };
}

function writeMeta(id, meta) {
  meta.updatedAt = new Date().toISOString();
  writeFileSync(path.join(PROJECTS, id, "job.json"), JSON.stringify(meta, null, 2) + "\n");
}

const [cmd, ...args] = process.argv.slice(2);

if (cmd === "channels") {
  const chs = listChannels();
  if (!chs.length) console.log("no channels");
  for (const c of chs) console.log([c.slug, c.name, c.handle ?? "", c.language, (c.platforms ?? []).join(","), c.defaults?.template ?? ""].join("\t"));
} else if (cmd === "status") {
  const only = args[0];
  const jobs = listJobs().filter((j) => !only || j.channel === only);
  const groups = new Map();
  for (const j of jobs) {
    const k = j.channel || "(sin canal)";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(j);
  }
  if (!jobs.length) console.log(only ? `no videos for ${only}` : "no videos");
  for (const [ch, list] of groups) {
    const counts = STAGES.map((s) => `${s} ${list.filter((j) => j.stage === s).length}`).join(" · ");
    console.log(`${ch}: ${list.length} videos · ${counts}`);
    if (only) for (const j of list) console.log(`  ${j.stage.padEnd(9)} ${j.id}  ${j.title}`);
  }
} else if (cmd === "new") {
  const { f, rest } = flags(args);
  const title = rest[0];
  if (!title) die('usage: new "<title>" [--channel s] [--template t] [--stage idea|draft] [--notes "..."]');
  const stage = f.stage ?? "draft";
  if (!["idea", "draft"].includes(stage)) die(`--stage must be idea or draft, got ${stage}`);
  if (f.channel && !existsSync(path.join(CHANNELS, f.channel, "channel.json"))) die(`unknown channel ${f.channel}`);
  const now = new Date();
  mkdirSync(PROJECTS, { recursive: true });
  const base = `${now.toISOString().slice(0, 10)}-${slugify(title)}`;
  let id = base;
  for (let n = 2; existsSync(path.join(PROJECTS, id)); n++) id = `${base}-${n}`;
  mkdirSync(path.join(PROJECTS, id), { recursive: true });
  const meta = { id, title, template: f.template ?? "", status: "draft", createdAt: now.toISOString(),
    updatedAt: now.toISOString(), logs: [], progress: 0, stage,
    ...(f.notes ? { notes: f.notes } : {}), ...(f.channel ? { channel: f.channel } : {}) };
  writeMeta(id, meta);
  const brief = path.join(PROJECTS, "_template", "brief.md");
  if (stage !== "idea" && existsSync(brief)) copyFileSync(brief, path.join(PROJECTS, id, "brief.md"));
  console.log(id);
} else if (cmd === "set") {
  const [id, ...pairs] = args;
  if (!id || !ID_RE.test(id) || id.includes("..") || !existsSync(path.join(PROJECTS, id))) die(`unknown project ${id}`);
  const file = path.join(PROJECTS, id, "job.json");
  const spec = readJson(path.join(PROJECTS, id, "spec.json"));
  const meta = readJson(file) ?? { id, title: spec?.title ?? id, template: spec?.template ?? "", status: "draft",
    createdAt: new Date().toISOString(), logs: [], progress: 0 };
  for (const p of pairs) {
    const i = p.indexOf("=");
    if (i < 1) die(`expected key=value, got ${p}`);
    const k = p.slice(0, i), v = p.slice(i + 1);
    if (k === "stage" && !STAGES.includes(v)) die(`stage must be one of ${STAGES.join("|")}`);
    if (k === "status" && !STATUSES.includes(v)) die(`status must be one of ${STATUSES.join("|")}`);
    if (k === "channel" && v && !existsSync(path.join(CHANNELS, v, "channel.json"))) die(`unknown channel ${v}`);
    if (!["stage", "status", "channel", "template", "title", "publishedAt", "links", "notes"].includes(k)) die(`unknown field ${k}`);
    if (k === "links") meta.links = v.split(",").map((s) => s.trim()).filter(Boolean);
    else if (v === "") delete meta[k];
    else meta[k] = v;
  }
  if (meta.stage === "published" && !meta.publishedAt) meta.publishedAt = new Date().toISOString();
  writeMeta(id, meta);
  console.log(`${id}: stage ${meta.stage ?? "-"} · status ${meta.status} · channel ${meta.channel ?? "-"}`);
} else {
  console.log("usage: jobs.mjs channels | status [<channel>] | new \"<title>\" [--channel s] [--template t] [--stage idea|draft] [--notes ...] | set <id> key=value...");
  process.exit(cmd ? 1 : 0);
}
