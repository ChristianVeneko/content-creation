import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { rgba } from "../util";

/** Thin progress bar at the very top. */
export const ProgressBar: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: rgba("#FFFFFF", 0.15) }}>
      <div style={{ width: `${p * 100}%`, height: "100%", background: color, boxShadow: `0 0 18px ${rgba(color, 0.8)}`, borderRadius: "0 6px 6px 0" }} />
    </div>
  );
};
