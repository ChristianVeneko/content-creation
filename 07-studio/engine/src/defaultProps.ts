// Studio preview props: example specs rendered silently with synthetic captions.
import demo from "../examples/demo.spec.json";
import illustratedExample from "../examples/sdd-vs-odd.illustrated.spec.json";
import illustratedTemplate from "../templates/illustrated.json";
import clayExample from "../examples/clay-diorama.spec.json";
import isoExample from "../examples/iso-toon.spec.json";
import neonExample from "../examples/neon-glass.spec.json";
import heroExample from "../examples/pedestal.spec.json";
import clayTemplate from "../templates/clay-diorama.json";
import isoTemplate from "../templates/iso-toon.json";
import neonTemplate from "../templates/neon-glass.json";
import heroTemplate from "../templates/pedestal.json";
import paperExample from "../examples/paper-world.spec.json";
import toyExample from "../examples/toy-blocks.spec.json";
import holoExample from "../examples/holo-studio.spec.json";
import paperTemplate from "../templates/paper-world.json";
import toyTemplate from "../templates/toy-blocks.json";
import holoTemplate from "../templates/holo-studio.json";
import uiCardsExample from "../examples/ui-cards.spec.json";
import uiCardsTemplate from "../templates/ui-cards.json";
import flatDepthExample from "../examples/flat-depth.spec.json";
import flatDepthTemplate from "../templates/flat-depth.json";
import softGradientExample from "../examples/soft-gradient.spec.json";
import hostTutorialExample from "../examples/host-tutorial.spec.json";
import hostTutorialTemplate from "../templates/host-tutorial.json";
import checklistGlassExample from "../examples/checklist-glass.spec.json";
import checklistGlassTemplate from "../templates/checklist-glass.json";
import spotlightExample from "../examples/spotlight-narrative.spec.json";
import spotlightTemplate from "../templates/spotlight-narrative.json";
import dataAtlasExample from "../examples/data-atlas.spec.json";
import dataAtlasTemplate from "../templates/data-atlas.json";
import softGradientTemplate from "../templates/soft-gradient.json";
import pixelDuskExample from "../examples/pixel-dusk.spec.json";
import pixelNightExample from "../examples/pixel-night.spec.json";
import pixelArcadeExample from "../examples/pixel-arcade.spec.json";
import pixelMonoExample from "../examples/pixel-mono.spec.json";
import pixelDuskTemplate from "../templates/pixel-dusk.json";
import pixelNightTemplate from "../templates/pixel-night.json";
import pixelArcadeTemplate from "../templates/pixel-arcade.json";
import pixelVersusExample from "../examples/pixel-versus.spec.json";
import pixelVersusTemplate from "../templates/pixel-versus.json";
import pixelMonoTemplate from "../templates/pixel-mono.json";
import { planPixel, usesPixelKit } from "../lib/pixel.mjs";
import neonGridExample from "../examples/neon-grid.spec.json";
import softStudioExample from "../examples/soft-studio.spec.json";
import moodyNightExample from "../examples/moody-night.spec.json";
import voxelWorldExample from "../examples/voxel-world.spec.json";
import neonGridTemplate from "../templates/neon-grid.json";
import softStudioTemplate from "../templates/soft-studio.json";
import moodyNightTemplate from "../templates/moody-night.json";
import voxelWorldTemplate from "../templates/voxel-world.json";
import dataStageExample from "../examples/data-stage.spec.json";
import dataStageTemplate from "../templates/data-stage.json";
import monolithStoryExample from "../examples/monolith-story.spec.json";
import monolithStoryTemplate from "../templates/monolith-story.json";
import clayMascotExample from "../examples/clay-mascot.spec.json";
import clayMascotTemplate from "../templates/clay-mascot.json";
import cutawayExample from "../examples/cutaway-explainer.spec.json";
import cutawayTemplate from "../templates/cutaway-explainer.json";
import engineeringExample from "../examples/engineering-explainer.spec.json";
import engineeringTemplate from "../templates/engineering-explainer.json";
import { computeTimeline, paginateCaptions, syntheticCaptions } from "../lib/timeline.mjs";
import { resolveSpec } from "../lib/spec.mjs";
import { planIllustration } from "../lib/illustrated.mjs";
import { planThree, usesThreeKit } from "../lib/scene3d.mjs";
import type { RenderProps, ResolvedSpec, TemplateId } from "./types";

// 3D previews in Studio light with Lightformers (the HDRI is staged per job by the build).
const THREE_EXAMPLES: Record<string, [unknown, unknown]> = {
  "clay-diorama": [clayExample, clayTemplate],
  "iso-toon": [isoExample, isoTemplate],
  "neon-glass": [neonExample, neonTemplate],
  "pedestal": [heroExample, heroTemplate],
  "paper-world": [paperExample, paperTemplate],
  "toy-blocks": [toyExample, toyTemplate],
  "holo-studio": [holoExample, holoTemplate],
  "neon-grid": [neonGridExample, neonGridTemplate],
  "soft-studio": [softStudioExample, softStudioTemplate],
  "moody-night": [moodyNightExample, moodyNightTemplate],
  "voxel-world": [voxelWorldExample, voxelWorldTemplate],
  "data-stage": [dataStageExample, dataStageTemplate],
  "monolith-story": [monolithStoryExample, monolithStoryTemplate],
  "clay-mascot": [clayMascotExample, clayMascotTemplate],
  "cutaway-explainer": [cutawayExample, cutawayTemplate],
  "engineering-explainer": [engineeringExample, engineeringTemplate],
};

// Format looks preview their own example spec (their elements need a plan).
const FORMAT_EXAMPLES: Record<string, [unknown, unknown]> = {
  "ui-cards": [uiCardsExample, uiCardsTemplate],
  "flat-depth": [flatDepthExample, flatDepthTemplate],
  "soft-gradient": [softGradientExample, softGradientTemplate],
  "host-tutorial": [hostTutorialExample, hostTutorialTemplate],
  "checklist-glass": [checklistGlassExample, checklistGlassTemplate],
  "spotlight-narrative": [spotlightExample, spotlightTemplate],
  "data-atlas": [dataAtlasExample, dataAtlasTemplate],
};
const PIXEL_EXAMPLES: Record<string, [unknown, unknown]> = {
  "pixel-dusk": [pixelDuskExample, pixelDuskTemplate],
  "pixel-night": [pixelNightExample, pixelNightTemplate],
  "pixel-arcade": [pixelArcadeExample, pixelArcadeTemplate],
  "pixel-mono": [pixelMonoExample, pixelMonoTemplate],
  "pixel-versus": [pixelVersusExample, pixelVersusTemplate],
};

export const previewProps = (template: TemplateId): RenderProps => {
  const three = usesThreeKit(template);
  const format = template in FORMAT_EXAMPLES;
  const pixel = usesPixelKit(template);
  const spec =
    template === "illustrated"
      ? (resolveSpec(illustratedExample, illustratedTemplate) as unknown as ResolvedSpec)
      : format
        ? (resolveSpec(FORMAT_EXAMPLES[template][0], FORMAT_EXAMPLES[template][1]) as unknown as ResolvedSpec)
      : three
        ? (resolveSpec(THREE_EXAMPLES[template][0], THREE_EXAMPLES[template][1]) as unknown as ResolvedSpec)
      : pixel
        ? (resolveSpec(PIXEL_EXAMPLES[template][0], PIXEL_EXAMPLES[template][1]) as unknown as ResolvedSpec)
        : { ...(demo as unknown as ResolvedSpec), template };
  const timeline = computeTimeline(spec.scenes, { fps: spec.format.fps });
  const captions = syntheticCaptions(spec.scenes, timeline);
  return {
    spec,
    timeline,
    captionPages: paginateCaptions(captions, spec.captions.wordsPerPage),
    assets: { narration: null, music: null, visuals: spec.scenes.map(() => null), three: { hdri: null, models: {} } },
    illustration: template === "illustrated" || format ? planIllustration(spec, timeline) : three ? planThree(spec, timeline) : pixel ? planPixel(spec, timeline) : null,
    icons: {},
  };
};
