// Video-level pixel UI that persists across cuts: the RPG dialog box with the narration typed in sync with the
// spoken words (the same caption pages the standard caption overlay uses), the speaker name per scene and a
// portrait of the character when the video has one.
import React, { useMemo } from "react";
import { PIXEL_LOOKS, dialogPages, pixelLookOf } from "../../lib/pixel.mjs";
import { DialogBox, type UiColors } from "./ui";
import { Portrait } from "./PixelScene";
import type { CaptionPage, ResolvedSpec, TimelineScene } from "../types";

export const PixelOverlay: React.FC<{ spec: ResolvedSpec; timeline: { scenes: TimelineScene[]; transitionFrames: number }; pages: CaptionPage[] }> = ({ spec, timeline, pages }) => {
  const look = PIXEL_LOOKS[pixelLookOf(spec) as keyof typeof PIXEL_LOOKS].ui as UiColors;
  // spec.captions.colors (when the user picked custom caption colors) recolors the dialog box too.
  const cc = spec.captions.colors ?? {};
  const ui: UiColors = { ...look, text: cc.text ?? look.text, accent: cc.highlight ?? look.accent, name: cc.highlight ?? look.name, box: cc.box ?? look.box, border: cc.outline ?? look.border };
  const fps = spec.format.fps;
  const fallback = spec.brand?.handle ? spec.brand.handle.replace(/^@/, "") : null;
  const speakerAt = (ms: number) => {
    const f = (ms / 1000) * fps;
    let i = 0;
    timeline.scenes.forEach((s, k) => {
      if (s.from <= f) i = k;
    });
    return spec.scenes[i]?.visual.pixel?.speaker ?? fallback;
  };
  const character = spec.scenes.map((s) => s.visual.pixel?.character).find(Boolean);
  const boxes = useMemo(() => dialogPages(pages), [pages]);
  return <DialogBox pages={boxes} speakerAt={speakerAt} ui={ui} portrait={character ? <Portrait spec={spec} character={character} /> : undefined} />;
};
