// Props drawn in code at an integer sprite scale (2 = each art pixel is 2 low-res pixels = 8 screen pixels).
// Every prop draws with the look's color roles and paints its emissive parts on the glow buffer too.
import { mix, rgb, type RGB } from "./painter";
import type { Layer, Roles } from "./sets";

export type PropOpts = { color?: string; open?: boolean; t: number; since: number; glow?: boolean };
/** Bounding box of a drawn prop in view pixels (labels anchor above it). */
export type Box = { x: number; y: number; w: number; h: number };
/** Kinds that hover above the floor instead of standing on it. */
export const FLOATING = new Set(["block", "coin", "item", "heart", "key"]);
/** Kinds small enough to stand on a desk / bench / conveyor surface. */
export const SMALL = new Set(["monitor", "laptop", "phone", "plant", "trophy", "hourglass", "lantern", "crate", "chest", "scroll", "robot"]);

type Draw = (L: Layer, x: number, y: number, s: number, C: Roles, o: PropOpts) => Box;

const sp = (L: Layer, rows: string[], legend: Record<string, RGB | undefined>, x: number, y: number, s: number, glowKeys = "", flip = false) => {
  L.p.sprite(rows, legend, x, y, s, flip);
  if (glowKeys) {
    const g: Record<string, RGB | undefined> = {};
    for (const k of glowKeys) g[k] = legend[k];
    L.g.sprite(rows, g, x, y, s, flip);
  }
  return { x, y, w: rows[0].length * s, h: rows.length * s };
};
/** Bottom-centered placement helper: (cx, bottom) -> top-left of a w x h art sprite at scale s. */
const at = (cx: number, bottom: number, w: number, h: number, s: number) => [Math.round(cx - (w * s) / 2), bottom - h * s] as const;

const BLOCK = [
  ".kkkkkkkkkkkk.",
  "khhhhhhhhhhhhk",
  "khaaawwwwaaadk",
  "khaawwaawwaadk",
  "khaaaaaawwaadk",
  "khaaaaawwaaadk",
  "khaaaawwaaaadk",
  "khaaaawwaaaadk",
  "khaaaaaaaaaadk",
  "khaaaawwaaaadk",
  "khaaaaaaaaaadk",
  "kddddddddddddk",
  "kdkdkdkdkdkddk",
  ".kkkkkkkkkkkk.",
];
const block: Draw = (L, x, y, s, C, o) => {
  const a = o.color ? rgb(o.color) : C.accent2;
  const [px, py] = at(x, y, 14, 14, s);
  return sp(L, BLOCK, { k: C.ink, h: mix(a, C.paper, 0.45), a, d: mix(a, C.ink, 0.4), w: C.paper }, px, py, s, o.glow ? "aw" : "");
};

const coin: Draw = (L, x, y, s, C, o) => {
  const w = Math.max(2, Math.round(5 * Math.abs(Math.cos(o.t * 2.2))));
  const h = 7;
  const gold = o.color ? rgb(o.color) : C.glow;
  for (let yy = -h; yy <= h; yy++) {
    const half = Math.round(w * Math.sqrt(1 - (yy / (h + 0.5)) ** 2));
    L.p.rect(x - (half + 1) * s, y - (h + 1 - yy) * s - s, (half * 2 + 2) * s, s, C.ink);
  }
  for (let yy = -h + 1; yy < h; yy++) {
    const half = Math.round(w * Math.sqrt(1 - (yy / (h + 0.5)) ** 2));
    L.p.rect(x - half * s, y - (h + 1 - yy) * s - s, half * 2 * s || s, s, yy < -2 ? mix(gold, C.paper, 0.4) : gold);
    L.g.rect(x - half * s, y - (h + 1 - yy) * s - s, half * 2 * s || s, s, gold);
  }
  if (w > 2) L.p.rect(x - s, y - (h + 1) * s, s, 4 * s, mix(gold, C.ink, 0.35));
  return { x: x - 6 * s, y: y - (2 * h + 2) * s, w: 12 * s, h: (2 * h + 2) * s };
};

const MONITOR = [
  "kkkkkkkkkkkkkkkkkkkkkk",
  "kmmmmmmmmmmmmmmmmmmmmk",
  "kmssssssssssssssssssmk",
  "kmsaaaaaasssssssssssmk",
  "kmssssssssssssssssssmk",
  "kmsppppppppppppppsssmk",
  "kmsssssssssssssssssmmk",
  "kmsbbbbbbbbbbssssssmmk",
  "kmssssssssssssssssssmk",
  "kmsppppppppppppssssmmk",
  "kmssssssssssssssssssmk",
  "kmsbbbbbbbsssssssssmmk",
  "kmssssssssssssssssssmk",
  "kmmmmmmmmmmmmmmmmmmmmk",
  "kkkkkkkkkkkkkkkkkkkkkk",
  ".........kmmk.........",
  ".........kmmk.........",
  "......kkkkkkkkkk......",
];
const monitor: Draw = (L, x, y, s, C) => {
  const [px, py] = at(x, y, 22, 18, s);
  return sp(L, MONITOR, { k: C.ink, m: C.metal0, s: mix(C.glow2, C.ink, 0.72), a: C.accent, p: mix(C.paper, C.glow2, 0.3), b: C.accent2 }, px, py, s, "sapb");
};

const LAPTOP = [
  "..kkkkkkkkkkkkkkkk..",
  "..kssssssssssssssk..",
  "..ksaaaassssssssk...",
  "..kssssssssssssssk..",
  "..kspppppppppssssk..",
  "..ksssssssssssssssk.",
  "..ksbbbbbbsssssssk..",
  "..kkkkkkkkkkkkkkkk..",
  ".kmmmmmmmmmmmmmmmmk.",
  "kmhhhhhhhhhhhhhhhhmk",
  "kkkkkkkkkkkkkkkkkkkk",
];
const laptop: Draw = (L, x, y, s, C) => {
  const [px, py] = at(x, y, 20, 11, s);
  return sp(L, LAPTOP, { k: C.ink, m: C.metal0, h: C.metal1, s: mix(C.glow2, C.ink, 0.7), a: C.accent, p: C.paper, b: C.accent2 }, px, py, s, "sapb");
};

const PHONE = ["kkkkkkkk", "kmmmmmmk", "kssssssk", "ksaasssk", "kssssssk", "kspppssk", "kssssssk", "ksbbbssk", "kssssssk", "kssssssk", "kmmkkmmk", "kkkkkkkk"];
const phone: Draw = (L, x, y, s, C) => {
  const [px, py] = at(x, y, 8, 12, s);
  return sp(L, PHONE, { k: C.ink, m: C.metal0, s: mix(C.glow2, C.ink, 0.6), a: C.accent, p: C.paper, b: C.accent2 }, px, py, s, "sapb");
};

const door: Draw = (L, x, y, s, C) => {
  const w = 22, h = 40;
  const [px, py] = at(x, y, w, h, s);
  L.p.rect(px - s, py - s, (w + 2) * s, (h + 1) * s, C.ink);
  L.p.vgrad(px, py, w * s, h * s, [C.wood2, C.wood1, C.wood0]);
  for (const [dx, dy, ww, hh] of [[3, 3, 7, 15], [12, 3, 7, 15], [3, 21, 7, 16], [12, 21, 7, 16]]) {
    L.p.frame(px + dx * s, py + dy * s, ww * s, hh * s, C.wood0);
    L.p.rect(px + (dx + 1) * s, py + (dy + 1) * s, s, (hh - 2) * s, mix(C.wood2, C.paper, 0.2));
  }
  L.p.rect(px + 18 * s, py + 20 * s, 2 * s, 2 * s, C.accent2);
  L.g.rect(px + 18 * s, py + 20 * s, 2 * s, 2 * s, C.accent2);
  return { x: px, y: py, w: w * s, h: h * s };
};

const windowProp: Draw = (L, x, y, s, C) => {
  const w = 18, h = 20;
  const [px, py] = at(x, y, w, h, s);
  L.p.rect(px - s, py - s, (w + 2) * s, (h + 2) * s, C.wood0);
  L.p.vgrad(px, py, w * s, h * s, [C.sky0, C.sky2, C.sky3]);
  L.g.rect(px, py + 10 * s, w * s, 10 * s, mix(C.sky3, C.ink, 0.5));
  L.p.rect(px + 8 * s, py, 2 * s, h * s, C.wood0);
  L.p.rect(px, py + 9 * s, w * s, 2 * s, C.wood0);
  return { x: px, y: py, w: w * s, h: h * s };
};

const lamp: Draw = (L, x, y, s, C, o) => {
  const h = 34;
  L.p.rect(x - 4 * s, y - 2 * s, 8 * s, 2 * s, C.metal0);
  L.p.rect(x - s / 2, y - h * s, s, (h - 2) * s, C.metal0);
  const flick = Math.sin(o.t * 17) > -0.9 ? C.glow : mix(C.glow, C.ink, 0.3);
  for (let i = 0; i < 8; i++) L.p.rect(x - (4 + Math.floor(i / 2)) * s, y - (h + 8 - i) * s, (8 + Math.floor(i / 2) * 2) * s, s, i < 2 ? mix(C.accent2, C.ink, 0.3) : C.accent2);
  L.p.rect(x - 7 * s, y - h * s, 14 * s, s, flick);
  L.g.rect(x - 7 * s, y - h * s, 14 * s, 2 * s, flick);
  L.g.disc(x, y - (h - 2) * s, 3 * s, flick);
  return { x: x - 8 * s, y: y - (h + 8) * s, w: 16 * s, h: (h + 8) * s };
};

const LANTERN = ["...kk...", ".kkkkkk.", "kaaaaaak", "kgggggak", "kgwggggk", "kaaaaaak", "kgggggak", "kgwggggk", "kaaaaaak", "kgggggak", ".kkkkkk.", "...kk...", "...a....", "...a...."];
const lantern: Draw = (L, x, y, s, C, o) => {
  const sway = Math.round(Math.sin(o.t * 1.8 + x) * 0.6) * s;
  const [px, py] = at(x + sway, y, 8, 14, s);
  return sp(L, LANTERN, { k: C.ink, a: mix(C.accent, C.ink, 0.25), g: mix(C.glow, C.accent, 0.35), w: C.paper }, px, py, s, "gw");
};

const CRATE = ["kkkkkkkkkkkkkk", "kwwwwwwwwwwwwk", "kwddddddddddwk", "kwdwhhhhhhwdwk", "kwddwhhhhwddwk", "kwdhhwhhwhhdwk", "kwdhhhwwhhhdwk", "kwdhhhwwhhhdwk", "kwdhhwhhwhhdwk", "kwddwhhhhwddwk", "kwdwhhhhhhwdwk", "kwddddddddddwk", "kwwwwwwwwwwwwk", "kkkkkkkkkkkkkk"];
const crate: Draw = (L, x, y, s, C) => {
  const [px, py] = at(x, y, 14, 14, s);
  return sp(L, CRATE, { k: C.ink, w: C.wood2, d: C.wood0, h: C.wood1 }, px, py, s);
};

const PLANT = ["....l..l....", "..l.ll.ll.l.", ".lLlllLllll.", "lllLlllLlLll", ".lllLllllll.", "lLllllLlllLl", "..llllll.l..", "....lll.....", "..kkkkkkkk..", "..kppppppk..", "..kpPPPPpk..", "...kppppk...", "...kppppk...", "...kkkkkk..."];
const plant: Draw = (L, x, y, s, C) => {
  const [px, py] = at(x, y, 12, 14, s);
  return sp(L, PLANT, { l: C.leaf1, L: mix(C.leaf1, C.paper, 0.3), k: C.ink, p: C.wood1, P: C.wood2 }, px, py, s);
};

const TROPHY = ["kkkkkkkkkkkk", "kgGggggggggk", "kgGggggggggk", "kkgGgggggdkk", "k.kgggggdk.k", "kk.kgggdk.kk", "....kgdk....", ".....kk.....", ".....gd.....", "....kgdk....", "...kkkkkk...", "...kwwwwk...", "..kkkkkkkk..", "..kddddddk..", "..kkkkkkkk.."];
const trophy: Draw = (L, x, y, s, C) => {
  const [px, py] = at(x, y, 12, 15, s);
  return sp(L, TROPHY, { k: C.ink, g: C.glow, G: C.paper, d: mix(C.glow, C.ink, 0.4), w: C.paper }, px, py, s, "gG");
};

const hourglass: Draw = (L, x, y, s, C, o) => {
  const w = 10, h = 16;
  const [px, py] = at(x, y, w, h, s);
  const p = (o.t % 4) / 4;
  L.p.rect(px, py, w * s, 2 * s, C.wood0);
  L.p.rect(px, py + (h - 2) * s, w * s, 2 * s, C.wood0);
  for (let i = 0; i < 12; i++) {
    const half = Math.max(1, Math.round(Math.abs(i - 5.5) * 0.7));
    const yy = py + (2 + i) * s;
    L.p.rect(x - (half + 1) * s, yy, (half * 2 + 2) * s, s, C.ink);
    const top = i < 6;
    const fill = top ? i >= 6 * p : 11 - i < 6 * p;
    L.p.rect(x - half * s, yy, half * 2 * s, s, fill ? C.accent2 : mix(C.paper, C.sky2, 0.4));
  }
  L.p.rect(x - Math.round(s / 2), py + 8 * s, s, 5 * s, C.accent2);
  return { x: px, y: py, w: w * s, h: h * s };
};

const sign: Draw = (L, x, y, s, C) => {
  const w = 30, h = 12, post = 14;
  L.p.rect(x - s, y - post * s, 2 * s, post * s, C.wood0);
  const px = Math.round(x - (w * s) / 2), py = y - (post + h) * s;
  L.p.rect(px - s, py - s, (w + 2) * s, (h + 2) * s, C.ink);
  L.p.vgrad(px, py, w * s, h * s, [mix(C.wood2, C.paper, 0.55), mix(C.wood2, C.paper, 0.35)]);
  L.p.rect(px, py + (h - 2) * s, w * s, s, C.wood1);
  return { x: px, y: py, w: w * s, h: h * s };
};

const chest: Draw = (L, x, y, s, C, o) => {
  const w = 16, h = 12;
  const [px, py] = at(x, y, w, h, s);
  const opened = o.open && o.since > 0.5;
  L.p.rect(px - s, py + 4 * s, (w + 2) * s, (h - 3) * s, C.ink);
  L.p.vgrad(px, py + 5 * s, w * s, (h - 5) * s, [C.wood2, C.wood0]);
  L.p.rect(px, py + 7 * s, w * s, s, C.accent2);
  L.p.rect(px + 7 * s, py + 6 * s, 2 * s, 3 * s, C.accent2);
  if (opened) {
    L.p.rect(px - s, py - 5 * s, (w + 2) * s, 10 * s, C.ink);
    L.p.rect(px, py - 4 * s, w * s, 8 * s, C.wood0);
    L.p.rect(px, py - 4 * s, w * s, 2 * s, C.wood1);
    L.g.rect(px + s, py + 4 * s, (w - 2) * s, 2 * s, C.glow);
    L.p.rect(px + s, py + 4 * s, (w - 2) * s, 2 * s, C.glow);
    burst(L, x, py, s, C, o.since - 0.5);
  } else {
    L.p.rect(px - s, py - s, (w + 2) * s, 6 * s, C.ink);
    L.p.vgrad(px, py, w * s, 5 * s, [C.wood2, C.wood1]);
    L.p.rect(px, py + 4 * s, w * s, s, C.accent2);
  }
  return { x: px, y: py, w: w * s, h: h * s };
};

/** Radiating pixel burst (item pickup, chest opening): 8 spokes that fly out and fade by dithering. */
export function burst(L: Layer, cx: number, cy: number, s: number, C: Roles, since: number) {
  if (since < 0 || since > 0.9) return;
  const r0 = 4 + since * 50;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    for (let i = 0; i < 3; i++) {
      const r = r0 + i * 3;
      const px = Math.round(cx + Math.cos(a) * r), py = Math.round(cy + Math.sin(a) * r);
      if ((i + k) % 2 === 0 || since < 0.5) {
        L.p.rect(px, py, s, s, C.paper);
        L.g.rect(px, py, s, s, C.glow);
      }
    }
  }
}

const ITEM = ["....kk....", "...kwwk...", "..kwaaak..", ".kwaaaaak.", "kwaaaaaadk", "kaaaaaaddk", ".kaaaaddk.", "..kaaddk..", "...kddk...", "....kk...."];
const item: Draw = (L, x, y, s, C, o) => {
  const a = o.color ? rgb(o.color) : C.glow2;
  const [px, py] = at(x, y, 10, 10, s);
  L.g.disc(x, py + 5 * s, 9 * s, a);
  burst(L, x, py + 5 * s, s, C, o.since - 0.1);
  return sp(L, ITEM, { k: C.ink, w: C.paper, a, d: mix(a, C.ink, 0.4) }, px, py, s, "aw");
};

const HEART = [".kk...kk.", "kaakkkaak", "kawaaaaak", "kaaaaaaak", ".kaaaaak.", "..kaaak..", "...kak...", "....k...."];
const heart: Draw = (L, x, y, s, C, o) => {
  const beat = Math.sin(o.t * 6) > 0.85 ? 1 : 0;
  const [px, py] = at(x, y, 9, 8, s);
  return sp(L, HEART, { k: C.ink, a: o.color ? rgb(o.color) : C.accent, w: C.paper }, px, py - beat * s, s, beat ? "a" : "");
};

const KEY = [".kkk........", "kgggk.......", "kgkgkkkkkkkk", "kgggggggggggk", "kgkgkkkgkgk.", "kgggk..kk.k.", ".kkk........"];
const key: Draw = (L, x, y, s, C) => {
  const [px, py] = at(x, y, 13, 7, s);
  return sp(L, KEY, { k: C.ink, g: C.glow }, px, py, s, "g");
};

const SCROLL = ["kkkkkkkkkkkkkk", "kwppppppppppwk", "kkpPPPPPPPPpkk", ".kpppppppppk..", ".kpPPPPPPpppk.", ".kppppppppppk.", ".kpPPPPPPPppk.", ".kppppppppppk.", "kkpppppppppkkk", "kwppppppppppwk", "kkkkkkkkkkkkkk"];
const scroll: Draw = (L, x, y, s, C) => {
  const [px, py] = at(x, y, 14, 11, s);
  return sp(L, SCROLL, { k: C.ink, w: C.wood1, p: C.paper, P: mix(C.paper, C.wood1, 0.6) }, px, py, s);
};

const ROBOT = ["......k.......", ".....kak......", "......k.......", ".kkkkkkkkkkkk.", "kmmmmmmmmmmmmk", "kmssssssssssmk", "kmseesssseesmk", "kmseesssseesmk", "kmssssssssssmk", "kmsssmmmmsssmk", "kmmmmmmmmmmmmk", ".kkkkkkkkkkkk.", "..kmmmmmmmmk..", "..kmhhhhhhmk..", "..kmmmmmmmmk..", "..kkk....kkk..", "..kmk....kmk..", ".kkkk....kkkk."];
const robot: Draw = (L, x, y, s, C, o) => {
  const body = o.color ? rgb(o.color) : C.metal1;
  const blink = (o.t % 3.1) < 0.12;
  const [px, py] = at(x, y, 14, 18, s);
  return sp(L, ROBOT, { k: C.ink, m: body, s: mix(C.ink, C.metal0, 0.4), e: blink ? mix(C.ink, C.metal0, 0.4) : C.glow2, a: C.accent, h: C.accent2 }, px, py, s, blink ? "a" : "ea");
};

export const PROPS: Record<string, Draw> = { monitor, laptop, phone, door, window: windowProp, lamp, lantern, crate, plant, coin, block, trophy, hourglass, sign, chest, item, heart, key, scroll, robot };
