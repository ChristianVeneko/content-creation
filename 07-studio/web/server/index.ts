// Entry point: `node server/index.ts` (Node 24 runs TypeScript natively).
// Binds to 127.0.0.1 only. In production it also serves the built UI from dist/.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app.ts";
import { CC_ROOT, loadDotEnv, readConfig } from "./config.ts";
import { initLogger } from "./logger.ts";
import { listProviders } from "./providers/index.ts";

loadDotEnv();
const config = readConfig();
const logFile = process.env.STUDIO_LOG_FILE ?? path.join(CC_ROOT, "05-tools/cache/logs/studio.log");
const log = initLogger({ file: logFile, level: (process.env.LOG_LEVEL as "debug" | "info" | "warn" | "error") ?? "info" });
const { app } = createApp(config);

const production = process.env.NODE_ENV === "production";
if (production) {
  if (!existsSync(config.distDir)) {
    log.error("dist/ not found. Run `npm run build` first.");
    process.exit(1);
  }
  const root = path.relative(process.cwd(), config.distDir) || ".";
  app.use("*", serveStatic({ root }));
  // SPA fallback: any non-API route returns index.html.
  app.get("*", (c) => c.html(readFileSync(path.join(config.distDir, "index.html"), "utf8")));
}

const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port }, (info) => {
  log.info(`Video Studio on http://${info.address}:${info.port}${production ? " (serving UI)" : ""}`);
  log.info("config", { engine: config.engineCli, engineFound: existsSync(config.engineCli), projects: config.projectsDir, logFile });
  for (const p of listProviders({ claudeBin: config.claudeBin })) {
    if (p.available) log.info("provider.ready", { provider: p.id, model: p.model });
    else log.warn("provider.unavailable", { provider: p.id, reason: p.reason });
  }
});
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    log.error(`Port ${config.port} is already in use. Another Video Studio is probably running: stop it (lsof -tiTCP:${config.port} -sTCP:LISTEN | xargs kill) or set STUDIO_PORT.`);
  } else {
    log.error("server.error", { error: err });
  }
  process.exit(1);
});
