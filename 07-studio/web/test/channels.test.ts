// Channel store, channel/job API routes and spec generation with channel context (fake engine, fake provider).
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { SpecRequest } from "../server/providers/types.ts";
import { createApp } from "../server/app.ts";
import { ChannelError, ChannelStore } from "../server/channels.ts";
import { readConfig } from "../server/config.ts";
import { deriveStage } from "../server/jobs.ts";
import { buildUserPrompt } from "../server/specGen.ts";
type Json = any;

const fakeEngine = fileURLToPath(new URL("./fixtures/fake-engine.mjs", import.meta.url));
const root = mkdtempSync(path.join(process.env.TMPDIR ?? os.tmpdir(), "studio-channels-test-"));
after(() => rmSync(root, { recursive: true, force: true }));

const channelsDir = path.join(root, "08-channels");
const projectsDir = path.join(root, "04-projects");
const requests: SpecRequest[] = [];
const goodSpec = { version: 1, title: "Café en casa", scenes: [{ narration: "Hola", visual: { type: "emoji", emoji: "☕" } }] };
const config = { ...readConfig({}), engineCli: fakeEngine, engineDir: path.dirname(fakeEngine), projectsDir, channelsDir, workspaceRoot: root };
const { app, jobs } = createApp(config, {
  createProvider: () => ({
    async generateSpec(req: SpecRequest) {
      requests.push(req);
      return JSON.stringify(goodSpec);
    },
  }),
});

const send = (url: string, method: string, body?: unknown) =>
  app.request(url, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "Content-Type": "application/json" } });

// ---------- store ----------

test("store: create derives the slug, writes channel.json and voice.md, list ignores _ and . folders", () => {
  const dir = mkdtempSync(path.join(root, "store-"));
  const store = new ChannelStore(dir);
  const ch = store.create({ name: "Café Lento", handle: "@cafelento", platforms: ["tiktok", "nope"], pillars: ["  método ", ""], voice: "Habla de tú." }, new Date("2026-11-01T10:00:00Z"));
  assert.equal(ch.slug, "cafe-lento");
  assert.deepEqual(ch.platforms, ["tiktok"]);
  assert.deepEqual(ch.pillars, ["método"]);
  assert.equal(ch.language, "es");
  assert.equal(ch.createdAt, "2026-11-01T10:00:00.000Z");
  const json = JSON.parse(readFileSync(path.join(dir, "cafe-lento", "channel.json"), "utf8"));
  assert.equal(json.version, 1);
  assert.equal(json.slug, "cafe-lento");
  assert.equal(json.voice, undefined, "voice lives in voice.md, not channel.json");
  assert.equal(readFileSync(path.join(dir, "cafe-lento", "voice.md"), "utf8"), "Habla de tú.");
  mkdirSync(path.join(dir, "_template"));
  writeFileSync(path.join(dir, "_template", "channel.json"), JSON.stringify({ name: "x" }));
  mkdirSync(path.join(dir, ".hidden"));
  writeFileSync(path.join(dir, ".hidden", "channel.json"), JSON.stringify({ name: "y" }));
  assert.deepEqual(store.list().map((c) => c.slug), ["cafe-lento"]);
  assert.equal(store.get("cafe-lento")?.voice, "Habla de tú.");
});

test("store: rejects bad slugs, missing names and duplicates; update keeps unknown fields and the slug", () => {
  const dir = mkdtempSync(path.join(root, "store-"));
  const store = new ChannelStore(dir);
  assert.throws(() => store.create({ name: "" }), (e: Error) => e instanceof ChannelError && e.status === 400);
  assert.throws(() => store.create({ name: "X", slug: "../evil" }), (e: Error) => e instanceof ChannelError && e.status === 400);
  assert.throws(() => store.create({ name: "X", slug: "_template" }), (e: Error) => e instanceof ChannelError && e.status === 400);
  assert.equal(store.get("../evil"), undefined);
  store.create({ name: "Uno" });
  assert.throws(() => store.create({ name: "Uno" }), (e: Error) => e instanceof ChannelError && e.status === 409);
  const file = path.join(dir, "uno", "channel.json");
  writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, "utf8")), custom: { kept: true } }));
  const up = store.update("uno", { name: "Uno Dos", slug: "otro", niche: "café", defaults: { durationSec: 45, voiceProvider: "bogus" }, voice: "nuevo" });
  assert.equal(up.slug, "uno");
  assert.equal(up.name, "Uno Dos");
  assert.equal(up.defaults.durationSec, 45);
  assert.equal(up.defaults.voiceProvider, undefined, "invalid enum values are dropped");
  assert.deepEqual(JSON.parse(readFileSync(file, "utf8")).custom, { kept: true });
  assert.equal(store.get("uno")?.voice, "nuevo");
  assert.throws(() => store.update("nada", { name: "x" }), (e: Error) => e instanceof ChannelError && e.status === 404);
  assert.equal(store.remove("uno"), true);
  assert.equal(existsSync(path.join(dir, "uno")), false);
});

test("deriveStage: explicit stage wins, else ready with a video, else draft", () => {
  assert.equal(deriveStage(undefined, true), "ready");
  assert.equal(deriveStage(undefined, false), "draft");
  assert.equal(deriveStage("published", false), "published");
  assert.equal(deriveStage("idea", true), "idea");
});

// ---------- routes ----------

test("channel routes: create, list with counts, get with voice, update, avatar, delete guarded by jobs", async () => {
  const created = await send("/api/channels", "POST", { name: "Canal Demo", handle: "@canaldemo", voice: "Sin humo.", brand: { avatar: "03-assets/brand/a.png" } });
  assert.equal(created.status, 201);
  const ch = (await created.json()) as Json;
  assert.equal(ch.slug, "canal-demo");
  assert.equal((await send("/api/channels", "POST", { name: "Canal Demo" })).status, 409);
  assert.equal((await send("/api/channels", "POST", { handle: "x" })).status, 400);

  // Avatar: served only from inside the workspace root, images only.
  mkdirSync(path.join(root, "03-assets", "brand"), { recursive: true });
  writeFileSync(path.join(root, "03-assets", "brand", "a.png"), "PNG");
  const avatar = await app.request("/api/channels/canal-demo/avatar");
  assert.equal(avatar.status, 200);
  assert.equal(avatar.headers.get("content-type"), "image/png");
  await send("/api/channels/canal-demo", "PUT", { brand: { avatar: "../../etc/passwd.png" } });
  assert.equal((await app.request("/api/channels/canal-demo/avatar")).status, 404);
  await send("/api/channels/canal-demo", "PUT", { brand: { avatar: "03-assets/brand/a.png" } });

  // Old project without job.json/stage, with a video: derived "ready", job.json not rewritten.
  const old = path.join(projectsDir, "2026-01-01-viejo");
  mkdirSync(old, { recursive: true });
  writeFileSync(path.join(old, "spec.json"), JSON.stringify({ ...goodSpec, template: "countdown" }));
  writeFileSync(path.join(old, "video.mp4"), "x");

  const idea = await send("/api/jobs", "POST", { title: "Errores con el café", notes: "3 errores comunes", channel: "canal-demo" });
  assert.equal(idea.status, 201);
  const { id: ideaId } = (await idea.json()) as Json;
  assert.equal((await send("/api/jobs", "POST", { title: "x", channel: "no-existe" })).status, 400);
  assert.equal((await send("/api/jobs", "POST", { title: "  " })).status, 400);

  const list = (await (await app.request("/api/jobs")).json()) as Json;
  const oldJob = list.jobs.find((j: Json) => j.id === "2026-01-01-viejo");
  assert.equal(oldJob.stage, "ready");
  assert.equal(existsSync(path.join(old, "job.json")), false);
  const ideaJob = list.jobs.find((j: Json) => j.id === ideaId);
  assert.equal(ideaJob.stage, "idea");
  assert.equal(ideaJob.channel, "canal-demo");
  assert.equal(ideaJob.hasSpec, false);
  assert.equal(ideaJob.notes, "3 errores comunes");

  const detail = (await (await app.request(`/api/jobs/${ideaId}`)).json()) as Json;
  assert.equal(detail.spec, undefined);
  assert.equal(detail.stage, "idea");

  const channels = (await (await app.request("/api/channels")).json()) as Json;
  assert.equal(channels.channels.length, 1);
  assert.equal(channels.channels[0].counts.idea, 1);
  assert.equal(channels.channels[0].total, 1);
  assert.equal(channels.channels[0].hasAvatar, true);
  assert.equal(channels.channels[0].voice, undefined, "the list stays lean");

  const one = (await (await app.request("/api/channels/canal-demo")).json()) as Json;
  assert.equal(one.voice, "Sin humo.");
  assert.equal((await app.request("/api/channels/..%2Fx")).status, 404);
  assert.equal((await app.request("/api/channels/nada")).status, 404);

  const put = await send("/api/channels/canal-demo", "PUT", { niche: "Tecnología", voice: "Directo." });
  assert.equal(put.status, 200);
  assert.equal(((await put.json()) as Json).niche, "Tecnología");

  const blocked = await send("/api/channels/canal-demo", "DELETE");
  assert.equal(blocked.status, 409);
  assert.ok(existsSync(path.join(channelsDir, "canal-demo")));

  // Move the idea out of the channel, then delete: the channel folder goes, job folders stay.
  assert.equal((await send(`/api/jobs/${ideaId}`, "PATCH", { channel: null })).status, 200);
  const del = await send("/api/channels/canal-demo", "DELETE");
  assert.equal(del.status, 200);
  assert.equal(existsSync(path.join(channelsDir, "canal-demo")), false);
  assert.ok(existsSync(path.join(projectsDir, ideaId)));
  assert.equal((await send("/api/channels/canal-demo", "DELETE")).status, 404);
});

test("PATCH /api/jobs/:id validates and sets stage, channel, publishedAt, links and title", async () => {
  await send("/api/channels", "POST", { name: "Patch Canal" });
  // @ts-expect-error minimal spec
  const id = jobs.create({ title: "Uno", template: "countdown", prompt: "p", provider: "anthropic", spec: goodSpec });
  assert.equal((await send(`/api/jobs/${id}`, "PATCH", { stage: "viral" })).status, 400);
  assert.equal((await send(`/api/jobs/${id}`, "PATCH", { channel: "no-existe" })).status, 400);
  assert.equal((await send(`/api/jobs/${id}`, "PATCH", { links: ["javascript:alert(1)"] })).status, 400);
  assert.equal((await send(`/api/jobs/${id}`, "PATCH", { title: "" })).status, 400);
  assert.equal((await send(`/api/jobs/nope-x`, "PATCH", { stage: "ready" })).status, 404);
  const res = await send(`/api/jobs/${id}`, "PATCH", { stage: "published", channel: "patch-canal", links: ["https://tiktok.com/@x/video/1"], title: "Uno bis" });
  assert.equal(res.status, 200);
  const job = (await res.json()) as Json;
  assert.equal(job.stage, "published");
  assert.equal(job.channel, "patch-canal");
  assert.equal(job.title, "Uno bis");
  assert.deepEqual(job.links, ["https://tiktok.com/@x/video/1"]);
  assert.ok(job.publishedAt, "publishing stamps publishedAt");
  const meta = JSON.parse(readFileSync(path.join(projectsDir, id, "job.json"), "utf8"));
  assert.equal(meta.stage, "published");
  assert.equal(meta.provider, "anthropic", "other metadata is preserved");
});

test("POST /api/spec without channel sends the same user prompt as before", async () => {
  requests.length = 0;
  const options = { language: "es", durationSec: 30, tone: "", voiceProvider: "kokoro", captionStyle: "hormozi", platform: "all" } as const;
  const res = await send("/api/spec", "POST", { prompt: "café en casa", template: "countdown", provider: "anthropic", options });
  assert.equal(res.status, 200);
  const template = { id: "countdown", name: "Lista numerada", description: "Top 3, top 5: un ítem por escena.", emoji: "🔢", gradient: ["#3a1c71", "#ffaf7b"], promptHint: "numbered" };
  assert.equal(requests[0].user, buildUserPrompt("café en casa", template, "countdown", options));
  const { jobId } = (await res.json()) as Json;
  const job = (await (await app.request(`/api/jobs/${jobId}`)).json()) as Json;
  assert.equal(job.channel, undefined);
  assert.equal(job.stage, "draft");
});

test("POST /api/spec with channel adds the context to the user prompt, applies unset defaults and records the channel", async () => {
  await send("/api/channels", "POST", {
    name: "Canal Spec",
    niche: "Café de especialidad",
    voice: "Habla de tú.",
    defaults: { template: "countdown", voiceProvider: "none", durationSec: 45, captionStyle: "boxed", tone: "Calmo" },
  });
  requests.length = 0;
  const res = await send("/api/spec", "POST", { prompt: "molienda", provider: "anthropic", channel: "canal-spec", options: { captionStyle: "clean" } });
  assert.equal(res.status, 200, await res.clone().text());
  const user = requests[0].user;
  assert.match(user, /Channel context/);
  assert.match(user, /Café de especialidad/);
  assert.match(user, /Habla de tú\./);
  assert.match(user, /Template: countdown/, "channel default template used when none was sent");
  assert.match(user, /about 45 seconds/);
  assert.match(user, /Caption style: clean/, "explicit options win over channel defaults");
  assert.match(user, /Voice provider: none/);
  assert.ok(!requests[0].system.includes("Café de especialidad"), "system prompt stays channel-free (cacheable)");
  const { jobId, spec } = (await res.json()) as Json;
  assert.equal(spec.theme.captionStyle, "clean");
  const job = (await (await app.request(`/api/jobs/${jobId}`)).json()) as Json;
  assert.equal(job.channel, "canal-spec");
  assert.equal((await send("/api/spec", "POST", { prompt: "x", provider: "anthropic", channel: "no-existe", template: "countdown" })).status, 400);
});

test("store: defaults.captions keeps the full catalog and colors, drops invalid fields", () => {
  const store = new ChannelStore(mkdtempSync(path.join(root, "cap-")));
  const ch = store.create({ name: "Subs", defaults: { captionStyle: "karaoke", captions: { style: "two-tone", size: "xl", position: "top", uppercase: false, wordsPerPage: 4, colors: { text: "#FFFFFF", highlight: "#FF00AA", box: "red" }, junk: 1 } } });
  assert.equal(ch.defaults.captionStyle, "karaoke");
  assert.deepEqual(ch.defaults.captions, { style: "two-tone", size: "xl", position: "top", uppercase: false, wordsPerPage: 4, colors: { text: "#FFFFFF", highlight: "#FF00AA" } });
  assert.equal(store.create({ name: "Bad", defaults: { captions: { style: "nope" } } }).defaults.captions, undefined);
});

test("POST /api/spec accepts the full caption catalog and colors, and writes them to spec.captions", async () => {
  const captions = { style: "neon", size: "l", position: "upper", uppercase: true, wordsPerPage: 2, colors: { text: "#FFFFFF", highlight: "#00FFAA", box: "#101010", outline: "#000000" } };
  const res = await send("/api/spec", "POST", { prompt: "neón", template: "countdown", provider: "anthropic", options: { captionStyle: "pixel", captions } });
  assert.equal(res.status, 200, await res.clone().text());
  const { spec } = (await res.json()) as Json;
  assert.equal(spec.theme.captionStyle, "neon", "captions.style wins over captionStyle");
  assert.deepEqual(spec.captions, { ...captions });
  const reels = await send("/api/spec", "POST", { prompt: "reel", template: "countdown", provider: "anthropic", options: { captionStyle: "dialog", reelsSubtitles: "bloque" } });
  assert.equal(reels.status, 200);
  const r = (await reels.json()) as Json;
  assert.equal(r.spec.theme.captionStyle, "dialog");
  assert.equal(r.spec.reels.subtitles, "bloque");
});

test("POST /api/spec rejects an unknown caption style or a non-hex caption color", async () => {
  for (const options of [{ captionStyle: "comic" }, { captions: { colors: { text: "white" } } }, { captions: { style: "nope" } }, { reelsSubtitles: "maybe" }]) {
    const res = await send("/api/spec", "POST", { prompt: "x", template: "countdown", provider: "anthropic", options });
    assert.equal(res.status, 400, JSON.stringify(options));
  }
});

test("POST /api/spec applies channel caption defaults only when the request did not set them", async () => {
  await send("/api/channels", "POST", { name: "Canal Subs", defaults: { template: "countdown", captions: { style: "karaoke", size: "xl", colors: { text: "#FFFFFF", highlight: "#FF00AA", box: "#000000", outline: "#000000" } } } });
  const unset = (await (await send("/api/spec", "POST", { prompt: "a", provider: "anthropic", channel: "canal-subs" })).json()) as Json;
  assert.equal(unset.spec.theme.captionStyle, "karaoke");
  assert.equal(unset.spec.captions.size, "xl");
  assert.equal(unset.spec.captions.colors.highlight, "#FF00AA");
  const set = (await (await send("/api/spec", "POST", { prompt: "b", provider: "anthropic", channel: "canal-subs", options: { captionStyle: "clean", captions: { size: "s" } } })).json()) as Json;
  assert.equal(set.spec.theme.captionStyle, "clean");
  assert.equal(set.spec.captions.size, "s");
  assert.equal(set.spec.captions.colors, undefined, "request captions replace the channel's as a whole (Auto colors stay Auto)");
});

test("POST /api/spec with jobId fills an idea instead of creating a new folder", async () => {
  const idea = (await (await send("/api/jobs", "POST", { title: "Idea a guion", channel: "canal-spec" })).json()) as Json;
  const before = jobs.list().length;
  const res = await send("/api/spec", "POST", { prompt: "Idea a guion", template: "countdown", provider: "anthropic", channel: "canal-spec", jobId: idea.id });
  assert.equal(res.status, 200);
  const body = (await res.json()) as Json;
  assert.equal(body.jobId, idea.id);
  assert.equal(jobs.list().length, before);
  const job = (await (await app.request(`/api/jobs/${idea.id}`)).json()) as Json;
  assert.equal(job.stage, "draft");
  assert.equal(job.hasSpec, true);
  assert.equal(job.template, "countdown");
  const again = await send("/api/spec", "POST", { prompt: "x", template: "countdown", provider: "anthropic", jobId: idea.id });
  assert.equal(again.status, 409, "a job that already has a script is not overwritten");
});

// ---------- verifier advisories ----------

test("slugs must be lowercase (case-insensitive disks would collide)", () => {
  const store = new ChannelStore(mkdtempSync(path.join(root, "case-")));
  assert.throws(() => store.create({ name: "x", slug: "Bits" } as Json), ChannelError);
});

test("avatar: an image-named symlink to a non-image file is not served", async () => {
  const { symlinkSync } = await import("node:fs");
  writeFileSync(path.join(root, "secret.env"), "ENVSECRET");
  symlinkSync(path.join(root, "secret.env"), path.join(root, "fake.png"));
  await send("/api/channels", "POST", { name: "Link Probe", brand: { avatar: "fake.png" } });
  const res = await app.request("/api/channels/link-probe/avatar");
  assert.equal(res.status, 404);
});

test("channel context leaves the language to the generate options", async () => {
  const { buildChannelContext } = await import("../server/channelContext.ts");
  assert.doesNotMatch(buildChannelContext({ name: "x", language: "en" } as Json, ""), /Language:/);
});

test("mutating API calls from a foreign origin are rejected; local origins pass", async () => {
  const foreign = await app.request("/api/channels", { method: "POST", body: JSON.stringify({ name: "Evil" }), headers: { "Content-Type": "text/plain", Origin: "https://evil.example" } });
  assert.equal(foreign.status, 403);
  const local = await app.request("/api/channels", { method: "POST", body: JSON.stringify({ name: "Local Origin" }), headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:5173" } });
  assert.equal(local.status, 201);
});
