import React from "react";
import { Composition, Still } from "remotion";
import { Video, calculateVideoMetadata } from "./Video";
import { previewProps } from "./defaultProps";
import type { TemplateId } from "./types";
import { ReelsVideo, calculateReelsMetadata } from "./reels/ReelsVideo";
import { COVER_CHECK, ReelsCover, ReelsCoverCheck } from "./reels/Cover";
import { reelsPreviewProps } from "./reels/preview";

const TEMPLATES: TemplateId[] = ["illustrated", "captions-voice", "kinetic-type", "countdown", "glass-cards", "letterbox", "whiteboard", "broadcast", "editorial-chart", "editor-window", "rank-numbers", "watercolor", "paper-collage", "chalkboard", "risograph", "ukiyo-e", "pop-comic", "ui-cards", "flat-depth", "soft-gradient", "host-tutorial", "checklist-glass", "spotlight-narrative", "data-atlas", "clay-diorama", "iso-toon", "neon-glass", "pedestal", "paper-world", "toy-blocks", "holo-studio", "neon-grid", "soft-studio", "moody-night", "voxel-world", "data-stage", "monolith-story", "clay-mascot", "cutaway-explainer", "engineering-explainer", "process-explainer", "pixel-dusk", "pixel-night", "pixel-arcade", "pixel-mono", "pixel-versus", "reels-nube", "reels-noche", "reels-menta", "reels-limon", "reels-pizarra"];
const isReels = (id: string) => id.startsWith("reels-");

// One composition per template; all share the same spec-driven component.
export const RemotionRoot: React.FC = () => (
  <>
    {TEMPLATES.map((id) => (
      <Composition
        key={id}
        id={id}
        component={(isReels(id) ? ReelsVideo : Video) as unknown as React.FC<Record<string, unknown>>}
        calculateMetadata={(isReels(id) ? calculateReelsMetadata : calculateVideoMetadata) as never}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={(isReels(id) ? reelsPreviewProps(id) : previewProps(id)) as unknown as Record<string, unknown>}
      />
    ))}
    {/* reels cover (cover.jpg) and its 9:16 / 3:4 / grid crop check (cover-check.png) */}
    <Still id="reels-cover" component={ReelsCover as unknown as React.FC<Record<string, unknown>>} width={1080} height={1920} defaultProps={reelsPreviewProps("reels-noche") as unknown as Record<string, unknown>} />
    <Still id="reels-cover-check" component={ReelsCoverCheck as unknown as React.FC<Record<string, unknown>>} width={COVER_CHECK.width} height={COVER_CHECK.height} defaultProps={reelsPreviewProps("reels-noche") as unknown as Record<string, unknown>} />
  </>
);
