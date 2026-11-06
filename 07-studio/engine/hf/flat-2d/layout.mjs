// Stage geometry shared by schema, world layout and kit placement. Stage = 960 x 1040, placed so it sits in the
// action window of the 1080x1920 frame: x 60..1020, y 450..1490 (captions live above, the platform UI below).
export const STAGE = { w: 960, h: 1040, ox: 60, oy: 450 };
export const FRAME = { w: 1080, h: 1920 };
export const FLOOR_FEET = 900;
/** Where hero replicas sit (centre points in stage coordinates). */
export const AT = {
  top: [480, 360], "top-left": [250, 360], "top-right": [710, 360],
  middle: [480, 520], "middle-left": [250, 520], "middle-right": [710, 520],
  "floor-left": [220, 700], "floor-center": [480, 700], "floor-right": [740, 700],
};
export const AT_IDS = Object.keys(AT);
/** Where characters stand (x of the hip centre; feet at FLOOR_FEET). */
export const CAST_AT = { "far-left": 110, "floor-left": 240, left: 240, "floor-center": 480, center: 480, "floor-right": 720, right: 720, "far-right": 850 };
export const CAST_AT_IDS = Object.keys(CAST_AT);
export const ROLES = ["accent", "accent2", "accent3", "good", "bad", "warn", "ink", "muted"];
