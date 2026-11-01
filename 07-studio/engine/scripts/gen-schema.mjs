// Regenerates spec.schema.json from the zod schema in lib/spec.mjs.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { videoSpecSchema } from "../lib/spec.mjs";

export function buildJsonSchema() {
  const schema = z.toJSONSchema(videoSpecSchema, { io: "input", unrepresentable: "any" });
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://local.video-studio/spec.schema.json",
    title: "VideoSpec",
    description: "Video Studio spec: one vertical short video (template, theme, voice, scenes, post copy). Omitted theme/voice/music/captions fields fall back to the template defaults.",
    ...Object.fromEntries(Object.entries(schema).filter(([k]) => k !== "$schema")),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = fileURLToPath(new URL("../spec.schema.json", import.meta.url));
  writeFileSync(out, JSON.stringify(buildJsonSchema(), null, 2) + "\n");
  console.log(`wrote ${out}`);
}
