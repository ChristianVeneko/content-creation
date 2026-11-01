// Remotion bundling + rendering via the Node APIs.
import { join } from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { ENGINE_ROOT } from "./env.mjs";

/**
 * Chromium options for every render call. three.js (the 3D templates) does not work with Chrome's default
 * OpenGL renderer; ANGLE is Remotion's recommendation for desktop renders and is harmless for 2D templates.
 * remotion.config.ts does not apply to the Node APIs, so each call passes this explicitly.
 */
export const CHROMIUM_OPTIONS = { gl: "angle" };

export async function bundleProject({ publicDir, outDir, onProgress = () => {} }) {
  return bundle({
    entryPoint: join(ENGINE_ROOT, "src", "index.ts"),
    publicDir,
    outDir,
    onProgress: (p) => onProgress(p / 100),
  });
}

export async function renderVideo({ serveUrl, compositionId, inputProps, output, onProgress = () => {} }) {
  const composition = await selectComposition({ serveUrl, id: compositionId, inputProps, logLevel: "error", chromiumOptions: CHROMIUM_OPTIONS });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    pixelFormat: "yuv420p",
    crf: 18,
    x264Preset: "medium",
    audioCodec: "aac",
    audioBitrate: "320k",
    imageFormat: "jpeg",
    jpegQuality: 92,
    outputLocation: output,
    inputProps,
    logLevel: "error",
    chromiumOptions: CHROMIUM_OPTIONS,
    onProgress: ({ progress }) => onProgress(progress),
  });
  return composition;
}

export async function renderCover({ serveUrl, composition, inputProps, frame, output }) {
  await renderStill({ composition, serveUrl, output, frame, imageFormat: "jpeg", jpegQuality: 92, inputProps, logLevel: "error", chromiumOptions: CHROMIUM_OPTIONS });
}
