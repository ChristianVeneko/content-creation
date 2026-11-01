// Root composition of the reels templates (reels-nube, reels-noche, reels-menta, reels-limon, reels-pizarra):
// one scene per sentence cut on its first word, word-synced entrances, the style background, transitions
// (corte / suave / semitono), keyword subtitles (linea / bloque) and the pack's SFX on scene moments. The agent's
// drawings (the `dibujo` scene, drawings in icon slots) and 2D fx (visual.fx) live inside each scene, under the subtitles.
import React from "react";
import { AbsoluteFill, Audio, type CalculateMetadataFunction, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import type { RenderProps } from "../types";
import { isRemote } from "../util";
import type { ReelsPlan } from "./tipos";
import { C, applyReel } from "./motor/actual";
import { useCargaFuentes } from "./motor/fuentes";
import { Escena, Semitono } from "./motor/Escena";
import { CapaFx } from "./motor/CapaFx";
import { FPS } from "./motor/constantes";
import { EscenaDibujo } from "./piezas/dibujo";
import { Fondo } from "./motor/Fondo";
import { Lienzo } from "./motor/Lienzo";
import { SubtitulosBloque, SubtitulosLinea } from "./motor/Subtitulos";
import { BIBLIOTECA } from "./escenas";

export type ReelsRenderProps = RenderProps & { reels?: ReelsPlan | null };

const src = (s: string) => (isRemote(s) ? s : staticFile(s));

export const calculateReelsMetadata: CalculateMetadataFunction<ReelsRenderProps> = ({ props }) => ({
  durationInFrames: Math.max(1, props.reels?.totalFrames ?? props.timeline.totalFrames),
  fps: props.spec.format.fps,
  width: props.spec.format.width,
  height: props.spec.format.height,
});

/** Applies the reel's style and waits for its fonts; returns the plan. */
export const useReel = (props: ReelsRenderProps): ReelsPlan => {
  const plan = props.reels;
  if (!plan) throw new Error("reels templates need the reels plan (lib/reels.mjs planReels) in the input props");
  applyReel(plan, props.icons ?? {});
  useCargaFuentes(plan.style);
  return plan;
};

export const ReelsVideo: React.FC<ReelsRenderProps> = (props) => {
  const plan = useReel(props);
  const { durationInFrames } = useVideoConfig();
  const { spec, assets } = props;
  const sfx = spec.sfx?.enabled === false ? 0 : (spec.sfx?.volume ?? 1);
  const v = spec.music.volume;
  return (
    <AbsoluteFill style={{ background: C.fondo }}>
      <Fondo />
      {plan.scenes.map((e) => {
        const Comp = BIBLIOTECA[e.type]?.C;
        if (!Comp) return null;
        return (
          <Sequence key={e.i} from={e.ini} durationInFrames={Math.max(1, e.dur)} name={`${e.i + 1}. ${e.type}`}>
            <EscenaDibujo.Provider value={{ momentos: e.momentos, entra: (e.b[0] ?? 0) / FPS, i: e.i, entrada: e.i === 0 ? "corte" : e.entrada }}>
              <Escena dur={e.dur} entrada={e.i === 0 ? "corte" : e.entrada} salida={e.salida}>
                <CapaFx e={e}>
                  <Lienzo>
                    <Comp p={e.p} b={e.b} dur={e.dur} palabras={e.palabras} i={e.i} />
                  </Lienzo>
                </CapaFx>
              </Escena>
            </EscenaDibujo.Provider>
          </Sequence>
        );
      })}
      {/* the halftone wipe covers only the scenes: subtitles stay on top */}
      {plan.scenes
        .filter((e) => e.i > 0 && e.entrada === "semitono")
        .map((e) => (
          <Semitono key={`semi-${e.i}`} centro={e.cut} />
        ))}
      {plan.subtitles === "linea" && <SubtitulosLinea frases={plan.frases} sin={plan.sinSubtitulos} />}
      {plan.subtitles === "bloque" && <SubtitulosBloque frases={plan.frases} sin={plan.sinSubtitulos} />}
      {assets.bed ? <Audio src={src(assets.bed)} /> : null}
      {assets.narration ? <Audio src={src(assets.narration)} /> : null}
      {assets.music ? (
        <Audio
          src={src(assets.music)}
          loop
          volume={(f) => interpolate(f, [0, 20, durationInFrames - 30, durationInFrames], [0, v, v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        />
      ) : null}
      {sfx > 0 &&
        plan.sounds.map((x, k) => (
          <Sequence key={`sfx-${k}`} from={Math.max(0, x.at)} durationInFrames={60} layout="none">
            <Audio src={staticFile(`reels/sounds/${x.s}.wav`)} volume={Math.min(1, x.vol * sfx)} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};
