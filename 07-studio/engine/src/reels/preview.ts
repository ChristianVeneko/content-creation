// Studio preview props for the reels templates: the example spec rendered silently with text-timed words.
import example from "../../examples/reels-noche.spec.json";
import nube from "../../templates/reels-nube.json";
import noche from "../../templates/reels-noche.json";
import menta from "../../templates/reels-menta.json";
import limon from "../../templates/reels-limon.json";
import pizarra from "../../templates/reels-pizarra.json";
import { resolveSpec } from "../../lib/spec.mjs";
import { computeReelsTimeline, planReels } from "../../lib/reels.mjs";
import type { ReelsRenderProps } from "./ReelsVideo";
import type { ReelsPlan } from "./tipos";

const TEMPLATES: Record<string, unknown> = { "reels-nube": nube, "reels-noche": noche, "reels-menta": menta, "reels-limon": limon, "reels-pizarra": pizarra };

export const reelsPreviewProps = (template: string): ReelsRenderProps => {
  const tpl = TEMPLATES[template] ?? noche;
  const raw = { ...(example as Record<string, unknown>), template, theme: undefined };
  const spec = resolveSpec(raw, tpl) as unknown as ReelsRenderProps["spec"];
  const timeline = computeReelsTimeline(spec.scenes, { fps: spec.format.fps });
  const reels = planReels(spec, timeline, []) as unknown as ReelsPlan;
  return {
    spec,
    timeline,
    captionPages: [],
    assets: { narration: null, music: null, visuals: spec.scenes.map(() => null) },
    illustration: null,
    icons: {},
    reels,
  };
};
