import { ADELANTO, SEMI, SOLAPE } from "../../../lib/reels.mjs";

export const FPS = 30;
export const ANCHO = 1080;
export const ALTO = 1920;
/** Subtitle words (and the elements they trigger) appear a few frames before they are heard. */
export { ADELANTO };
/** Frames two scenes overlap in a soft fade. */
export { SOLAPE };
/** Length of the halftone wipe (the cut sits in its middle). */
export { SEMI };
export const s2f = (s: number) => Math.round(s * FPS);
