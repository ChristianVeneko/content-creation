// An original, generic chibi character built from boxes (no sprite sheet): big head, short body.
// Poses: idle (breathing bob), walk (alternating legs and arms), point (arm out), hold (both arms up, item overhead).
// Art units are scaled by `s` (2 => 8 screen pixels per art pixel). Every box gets a 1-unit ink outline first.
import { mix, rgb, type RGB } from "./painter";
import type { Layer, Roles } from "./sets";

export type CharacterSpec = { pose?: string; hair?: string; skin?: string; shirt?: string; pants?: string; facing?: "left" | "right" };
type Box = [number, number, number, number, RGB];

export const CHAR_W = 22;
export const CHAR_H = 40;

export function characterColors(c: CharacterSpec, C: Roles) {
  // Defaults: colored hair, an open jacket in the look's accent over a light tee, dark denim.
  const hair = c.hair ? rgb(c.hair) : mix(C.accent, C.ink, 0.45);
  const skin = c.skin ? rgb(c.skin) : rgb("#E8B48E");
  const shirt = c.shirt ? rgb(c.shirt) : mix(C.accent, C.wall1, 0.25);
  const pants = c.pants ? rgb(c.pants) : rgb("#33405E");
  return { hair, skin, shirt, pants };
}

/** Head-only boxes (also used for the dialog portrait). Origin = top-left of the 22-wide art grid. */
export function headBoxes(c: CharacterSpec, C: Roles, blink = false): { base: Box[]; detail: Box[] } {
  const { hair, skin } = characterColors(c, C);
  const hl = mix(hair, C.paper, 0.25);
  const sh = mix(skin, C.ink, 0.22);
  const base: Box[] = [
    [3, 4, 16, 14, skin],
    [2, 2, 18, 5, hair],
    [2, 6, 3, 6, hair],
    [17, 6, 3, 5, hair],
    [1, 10, 2, 4, skin],
    [19, 10, 2, 4, skin],
  ];
  const detail: Box[] = [
    [3, 1, 12, 2, hair],
    [12, 0, 6, 2, hair],
    [4, 7, 9, 2, hair],
    [13, 7, 2, 1, hair],
    [6, 2, 5, 1, hl],
    [13, 3, 3, 1, hl],
    [3, 16, 16, 2, sh],
    [10, 15, 2, 1, sh],
    [10, 13, 1, 1, sh],
  ];
  if (blink) detail.push([6, 12, 3, 1, C.ink], [13, 12, 3, 1, C.ink]);
  else detail.push([6, 11, 3, 3, C.ink], [13, 11, 3, 3, C.ink], [6, 11, 1, 1, C.paper], [13, 11, 1, 1, C.paper]);
  detail.push([4, 14, 2, 1, mix(skin, C.accent, 0.35)], [16, 14, 2, 1, mix(skin, C.accent, 0.35)]);
  return { base, detail };
}

function drawBoxes(L: Layer, ox: number, oy: number, s: number, base: Box[], detail: Box[], flip: boolean, ink: RGB) {
  const fx = (x: number, w: number) => (flip ? CHAR_W - x - w : x);
  for (const [x, y, w, h] of base) L.p.rect(ox + (fx(x, w) - 1) * s, oy + (y - 1) * s, (w + 2) * s, (h + 2) * s, ink);
  for (const [x, y, w, h, c] of base) L.p.rect(ox + fx(x, w) * s, oy + y * s, w * s, h * s, c);
  for (const [x, y, w, h, c] of detail) L.p.rect(ox + fx(x, w) * s, oy + y * s, w * s, h * s, c);
}

/**
 * Draw the character with feet on `bottom`, centered on `cx`. Returns the art-space point above the hands
 * (for a held item) in view pixels, and the head top.
 */
export function drawCharacter(L: Layer, c: CharacterSpec, C: Roles, cx: number, bottom: number, s: number, t: number) {
  const { skin, shirt, pants } = characterColors(c, C);
  const pose = c.pose ?? "idle";
  const flip = c.facing === "left";
  const ox = Math.round(cx - (CHAR_W * s) / 2);
  const walkPhase = pose === "walk" ? Math.floor(t * 6) % 4 : 0;
  const bob = pose === "walk" ? (walkPhase % 2) : Math.floor(t * 1.6) % 2;
  const oy = bottom - CHAR_H * s + bob * s;
  const blink = t % 3.3 < 0.12;
  const shS = mix(shirt, C.ink, 0.3);
  const pS = mix(pants, C.ink, 0.25);
  const shoe = mix(C.accent, C.paper, 0.35);
  const tee = mix(C.paper, C.wall1, 0.15);
  const base: Box[] = [];
  const detail: Box[] = [];
  // legs and shoes
  const legL = pose === "walk" ? [0, -1, 0, 1][walkPhase] : 0;
  const legR = -legL;
  base.push([6, 30 + Math.min(0, legL), 4, 7 - Math.abs(legL), pants], [12, 30 + Math.min(0, legR), 4, 7 - Math.abs(legR), pants]);
  base.push([5 + legL, 37 - Math.abs(legL) - bob, 6, 2, shoe], [11 + legR, 37 - Math.abs(legR) - bob, 6, 2, shoe]);
  detail.push([9, 30, 1, 5, pS], [12, 30, 1, 5, pS]);
  // torso: open jacket over a tee
  base.push([5, 19, 12, 12, shirt]);
  detail.push([9, 19, 4, 11, tee], [8, 19, 1, 11, shS], [13, 19, 1, 11, shS], [5, 29, 12, 1, shS]);
  // arms
  if (pose === "hold") {
    base.push([0, -1, 3, 22, shirt], [19, -1, 3, 22, shirt], [0, -4, 3, 3, skin], [19, -4, 3, 3, skin]);
  } else if (pose === "point") {
    base.push([2, 19, 3, 9, shirt], [2, 28, 3, 2, skin], [17, 19, 6, 3, shirt], [23, 19, 3, 3, skin]);
  } else {
    const sw = pose === "walk" ? [0, 1, 0, -1][walkPhase] : 0;
    base.push([2, 19 + sw, 3, 9, shirt], [17, 19 - sw, 3, 9, shirt], [2, 28 + sw, 3, 2, skin], [17, 28 - sw, 3, 2, skin]);
  }
  const head = headBoxes(c, C, blink);
  drawBoxes(L, ox, oy, s, [...base, ...head.base], [...detail, ...head.detail], flip, C.ink);
  return { handX: cx, handY: oy - (pose === "hold" ? 4 : -5) * s, top: oy };
}
