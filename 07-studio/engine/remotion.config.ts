// Used by `npm run studio` only. The CLI build uses @remotion/renderer with explicit options.
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// three.js (3D templates) needs ANGLE; the Node render calls pass the same option (lib/render.mjs CHROMIUM_OPTIONS).
Config.setChromiumOpenGlRenderer("angle");
