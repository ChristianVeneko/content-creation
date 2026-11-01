// 2D fx of a reels scene (visual.fx, lib/fx2d.mjs drawn by src/components/Fx2D.tsx): tinted with the style's roles,
// timed with the scene's word moments, inside the scene wrapper (so they fade with its transitions) and under the
// subtitles. Back fx sit behind the scene content, front fx over it, camera hits (zoom punch, shake, glitch,
// chromatic) move or filter the content. Targets: the `dibujo` scene's drawing id, or "id/part".
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { drawingBoxInPx, partBoxInPx } from "../../components/Drawing2D";
import { Fx2DFilters, Fx2DLayer, fxSceneStyle, hasScreenFx, type Fx } from "../../components/Fx2D";
import { dibujoDe, layoutDibujo } from "../escenas/dibujo";
import { coloresDibujo, tinteFx } from "../piezas/dibujo";
import type { ReelScene } from "../tipos";
import { FPS } from "./constantes";
import { aPantalla } from "./Lienzo";

/** Screen box of an fx target in this scene: the dibujo scene's drawing (or one of its parts), else null. */
const objetivo = (e: ReelScene) => (id: string) => {
  if (e.type !== "drawing") return null;
  const d = dibujoDe(e.p);
  if (!d) return null;
  const [did, part] = id.split("/");
  if (d.id !== undefined && did !== d.id) return null;
  const { arte } = layoutDibujo(e.p);
  const caja = part !== undefined ? partBoxInPx(d, part, arte.w, arte.h) : null;
  const b = caja ?? drawingBoxInPx(d, arte.w, arte.h);
  return aPantalla({ x: arte.x + b.x, y: arte.y + b.y, w: b.w, h: b.h });
};

/** The scene content with its fx around it; without fx, the content as is (same tree as before fx existed). */
export const CapaFx: React.FC<{ e: ReelScene; children: React.ReactNode }> = ({ e, children }) => {
  const f = useCurrentFrame();
  const fx = (e.fx ?? []) as Fx[];
  if (!fx.length) return <>{children}</>;
  const t = f / FPS;
  const sceneSec = e.dur / FPS;
  const uid = `rfx${e.i}`;
  const layer = { fx, t, sceneSec, moments: e.momentos, tint: tinteFx(), colors: coloresDibujo(), target: objetivo(e), uid };
  const screen = hasScreenFx(fx) ? fxSceneStyle(fx, t, sceneSec, e.momentos, uid) : null;
  return (
    <AbsoluteFill>
      {screen ? <Fx2DFilters uid={uid} glitch={screen.cam.glitch} chroma={screen.cam.chroma} seed={e.i * 31 + 7} /> : null}
      <AbsoluteFill style={screen?.style}>
        <Fx2DLayer {...layer} depth="back" />
        {children}
      </AbsoluteFill>
      <Fx2DLayer {...layer} depth="front" />
    </AbsoluteFill>
  );
};
