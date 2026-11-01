// Scene sets: generic places drawn in code, each split into parallax layers.
//   far     : sky and distant shapes (blurred, slow parallax)
//   mid     : architecture and furniture (crisp)
//   near    : dark foreground silhouettes (heavily blurred, fast parallax)
// Every emissive pixel is also painted on the layer's glow buffer, which is blurred and screen-blended on top.
import { random } from "remotion";
import { Painter, mix, rgb, type RGB } from "./painter";

export type Layer = { p: Painter; g: Painter };
export type Layers = { far: Layer; mid: Layer; sub: Layer; near: Layer };
export type Roles = Record<string, RGB>;
export type SetCtx = { C: Roles; t: number; seed: string; sky: string };
/** Light ray: origin in view pixels, direction in degrees (90 = straight down), angular spread, length. */
export type Ray = { x: number; y: number; angle: number; spread: number; len: number; color?: string };
/** Surface a small prop can stand on (x range in view pixels). */
export type Surface = { x0: number; x1: number; y: number };
export type SetInfo = { floor: number; surfaces: Surface[]; rays: Ray[] };

const W = 270;
const FLOOR = 282;
const night = (c: SetCtx) => c.sky === "night" || c.sky === "neon";
const rnd = (c: SetCtx, k: string | number) => random(`${c.seed}-${k}`);

/** Lit rectangle: base color on the layer, glow on the glow buffer. */
const lit = (L: Layer, x: number, y: number, w: number, h: number, c: RGB) => {
  L.p.rect(x, y, w, h, c);
  L.g.rect(x, y, w, h, c);
};
const litDisc = (L: Layer, x: number, y: number, r: number, c: RGB) => {
  L.p.disc(x, y, r, c);
  L.g.disc(x, y, r, c);
};

function skyBackdrop(L: Layer, c: SetCtx, opts: { body?: "sun" | "moon"; bodyX?: number; bodyY?: number; bodyR?: number; stars?: boolean; to?: number } = {}) {
  const { C } = c;
  const to = opts.to ?? 300;
  L.p.vgrad(-30, -14, W + 60, to + 14, [C.sky0, C.sky1, C.sky2, C.sky3]);
  if (opts.stars ?? night(c)) {
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(rnd(c, `sx${i}`) * (W + 48)) - 24;
      const y = Math.floor(rnd(c, `sy${i}`) * to * 0.6) - 10;
      const tw = Math.sin(c.t * 2 + i) > 0.6;
      L.p.set(x, y, tw ? C.paper : mix(C.sky1, C.paper, 0.45));
      if (i % 9 === 0) L.g.set(x, y, C.paper);
    }
  }
  const body = opts.body ?? (night(c) ? "moon" : "sun");
  const bx = opts.bodyX ?? 200, by = opts.bodyY ?? 70, br = opts.bodyR ?? (body === "sun" ? 26 : 14);
  L.p.pool(bx, by, br * 3, br * 3, body === "sun" ? C.sky3 : mix(C.sky2, C.paper, 0.3), 0.55);
  litDisc(L, bx, by, br, body === "sun" ? mix(C.glow, C.paper, 0.35) : C.paper);
  if (body === "moon") {
    L.p.disc(bx - 4, by - 3, 3, mix(C.paper, C.sky2, 0.25));
    L.p.disc(bx + 5, by + 4, 2, mix(C.paper, C.sky2, 0.25));
  }
}

function skyline(L: Layer, c: SetCtx, base: number, color: RGB, maxH: number, k: string, windows = true) {
  let x = -24;
  let i = 0;
  while (x < W + 24) {
    const w = 14 + Math.floor(rnd(c, `${k}w${i}`) * 22);
    const h = 30 + Math.floor(rnd(c, `${k}h${i}`) * maxH);
    L.p.rect(x, base - h, w, h, color);
    if (rnd(c, `${k}a${i}`) > 0.6) L.p.rect(x + Math.floor(w / 2) - 1, base - h - 8, 2, 8, color);
    if (windows)
      for (let wy = base - h + 5; wy < base - 4; wy += 6)
        for (let wx = x + 3; wx < x + w - 3; wx += 5)
          if (rnd(c, `${k}l${i}-${wx}-${wy}`) > (night(c) ? 0.55 : 0.85)) lit(L, wx, wy, 2, 2, rnd(c, `${k}c${wx}${wy}`) > 0.8 ? c.C.glow2 : c.C.glow);
    x += w + 1;
    i++;
  }
}

function planks(L: Layer, c: SetCtx, y: number, h: number, a: RGB, b: RGB) {
  L.p.vgrad(-24, y, W + 48, h, [b, a, mix(a, c.C.ink, 0.5)]);
  for (let yy = y + 6; yy < y + h; yy += 7 + Math.floor((yy - y) / 30)) L.p.rect(-24, yy, W + 48, 1, mix(a, c.C.ink, 0.45));
  for (let i = 0; i < 26; i++) {
    const yy = y + 6 + Math.floor(rnd(c, `pk${i}`) * (h - 8));
    L.p.rect(-24 + Math.floor(rnd(c, `pkx${i}`) * (W + 48)), yy, 1, 6, mix(a, c.C.ink, 0.35));
  }
}

function lampPost(L: Layer, c: SetCtx, x: number, top: number, bottom: number) {
  const { C } = c;
  L.p.rect(x, top + 6, 3, bottom - top - 6, C.metal0);
  L.p.rect(x + 1, top + 6, 1, bottom - top - 6, C.metal1);
  L.p.rect(x - 4, top, 11, 3, C.metal0);
  lit(L, x - 3, top + 3, 9, 5, C.glow);
  L.p.rect(x - 2, bottom - 3, 7, 3, C.metal0);
}

function nearPlant(L: Layer, c: SetCtx, x: number, y: number, s: number, flip = false) {
  const col = mix(c.C.leaf0, c.C.ink, 0.55);
  for (let i = 0; i < 7; i++) {
    const a = (flip ? -1 : 1) * (-1.2 + i * 0.4);
    for (let r = 0; r < 34 * s; r++) {
      const px = x + Math.sin(a) * r;
      const py = y - Math.cos(a) * r * 0.9 + (r * r) / (70 * s);
      L.p.rect(px - 2, py - 1, 5 - r / (12 * s), 3, col);
    }
  }
}

// ---------------- sets ----------------

function room(L: Layers, c: SetCtx): SetInfo {
  const { C } = c;
  // far: sky and city through the window
  skyBackdrop(L.far, c, { bodyX: 46, bodyY: 64, bodyR: night(c) ? 9 : 16, to: 220 });
  skyline(L.far, c, 210, C.far0, 90, "rc");
  // mid: back wall with a window hole
  const wallTop = mix(C.wall0, C.ink, 0.3);
  const win = { x: 10, y: 36, w: 112, h: 150 };
  for (let y = -14; y < FLOOR; y++)
    for (let x = -24; x < W + 24; x++) {
      if (x >= win.x && x < win.x + win.w && y >= win.y && y < win.y + win.h) continue;
      const r = Math.min(1, Math.max(0, (y + 14) / 200));
      L.mid.p.set(x, y, r > 0.5 + (0.5 - Math.abs(((x * 7 + y * 3) % 16) / 16 - 0.5)) * 0.4 ? C.wall1 : wallTop);
    }
  // brick courses on the lower wall
  for (let y = 196; y < FLOOR; y += 8) {
    L.mid.p.rect(-24, y, W + 48, 1, mix(C.wall1, C.ink, 0.35));
    for (let x = (y / 8) % 2 ? -24 : -16; x < W + 24; x += 16) L.mid.p.rect(x, y, 1, 8, mix(C.wall1, C.ink, 0.35));
  }
  // window frame, mullions, sill, curtains
  const F = C.wood0, Fh = C.wood1;
  L.mid.p.rect(win.x - 4, win.y - 4, win.w + 8, 4, F);
  L.mid.p.rect(win.x - 4, win.y + win.h, win.w + 8, 5, Fh);
  L.mid.p.rect(win.x - 6, win.y + win.h + 5, win.w + 12, 3, F);
  L.mid.p.rect(win.x - 4, win.y, 4, win.h, F);
  L.mid.p.rect(win.x + win.w, win.y, 4, win.h, F);
  L.mid.p.rect(win.x + win.w / 2 - 2, win.y, 4, win.h, F);
  L.mid.p.rect(win.x, win.y + 70, win.w, 3, F);
  for (const cx of [win.x - 14, win.x + win.w + 2]) {
    for (let y = win.y - 6; y < win.y + win.h + 30; y++) {
      const sway = Math.round(Math.sin(y / 14 + c.t * 0.8) * 1);
      L.mid.p.rect(cx + sway, y, 12, 1, C.accent);
      L.mid.p.rect(cx + sway + 3, y, 1, 1, mix(C.accent, C.paper, 0.25));
      L.mid.p.rect(cx + sway + 7, y, 2, 1, mix(C.accent, C.ink, 0.35));
      L.mid.p.rect(cx + sway + 11, y, 1, 1, mix(C.accent, C.ink, 0.5));
    }
    L.mid.p.rect(cx - 2, win.y - 8, 16, 3, C.wood0);
  }
  // shelf with books and a small frame
  L.mid.p.rect(150, 112, 120, 4, C.wood1);
  L.mid.p.rect(150, 116, 120, 2, C.wood0);
  let bx = 196;
  const books = [C.accent, C.accent2, C.glow2, C.wood2, C.leaf1, C.paper];
  for (let i = 0; i < 10; i++) {
    const h = 14 + Math.floor(rnd(c, `bk${i}`) * 9);
    const w = 4 + Math.floor(rnd(c, `bw${i}`) * 3);
    L.mid.p.rect(bx, 112 - h, w, h, mix(books[i % books.length], C.wall0, 0.25));
    L.mid.p.rect(bx, 112 - h + 3, w, 1, mix(books[i % books.length], C.paper, 0.3));
    bx += w + (i % 4 === 3 ? 3 : 0);
  }
  L.mid.p.rect(158, 84, 26, 28, C.wood0);
  L.mid.p.rect(160, 86, 22, 24, C.sky2);
  L.mid.p.ridge(160, 182, (x) => 100 - Math.abs(x - 171) * 0.8, 110, C.far1);
  // desk (right), drawer and legs
  L.mid.p.rect(150, 246, 150, 6, C.wood2);
  L.mid.p.rect(150, 252, 150, 3, C.wood0);
  L.mid.p.rect(158, 255, 5, FLOOR - 255, C.wood0);
  L.mid.p.rect(250, 255, 40, 36, C.wood1);
  L.mid.p.frame(250, 255, 40, 36, C.wood0);
  L.mid.p.rect(266, 270, 8, 2, C.accent2);
  // floor, rug and light pool
  planks(L.mid, c, FLOOR, 190, C.floor1, mix(C.floor1, C.wall2, 0.4));
  L.mid.p.rect(-24, FLOOR - 4, W + 48, 4, C.wood0);
  for (let y = 0; y < 26; y++) {
    const half = Math.round(Math.sqrt(1 - ((y - 13) / 13.5) ** 2) * 78);
    L.mid.p.rect(76 - half, FLOOR + 6 + y, half * 2, 1, (y + Math.floor(c.t)) % 7 === 0 ? mix(C.wall2, C.paper, 0.2) : C.wall2);
  }
  L.mid.p.pool(70, 150, 90, 120, mix(C.wall1, C.sky3, 0.35), 0.35);
  // near: blurred houseplant and chair back
  nearPlant(L.near, c, -6, 470, 1.3);
  L.near.p.rect(232, 380, 60, 110, mix(C.wood0, C.ink, 0.6));
  L.near.p.rect(240, 370, 44, 10, mix(C.wood0, C.ink, 0.5));
  return { floor: FLOOR + 12, surfaces: [{ x0: 156, x1: 300, y: 246 }], rays: [{ x: 70, y: 40, angle: 62, spread: 22, len: 330 }] };
}

function street(L: Layers, c: SetCtx): SetInfo {
  const { C } = c;
  skyBackdrop(L.far, c, { bodyX: 210, bodyY: 54, bodyR: night(c) ? 10 : 22, to: 240 });
  skyline(L.far, c, 200, C.far0, 70, "sf", false);
  skyline(L.far, c, 220, C.far1, 40, "sf2");
  // shop fronts
  const shops = [
    { x: -24, w: 92, h: 190, wall: C.wall1, awn: C.accent },
    { x: 70, w: 74, h: 220, wall: C.wall2, awn: C.leaf1 },
    { x: 146, w: 70, h: 176, wall: C.wood1, awn: C.accent2 },
    { x: 218, w: 80, h: 206, wall: C.wall1, awn: C.glow2 },
  ];
  shops.forEach((s, i) => {
    const top = FLOOR - s.h;
    L.mid.p.vgrad(s.x, top, s.w, s.h, [mix(s.wall, C.ink, 0.15), s.wall, mix(s.wall, C.ink, 0.35)]);
    L.mid.p.rect(s.x - 2, top - 5, s.w + 4, 5, mix(s.wall, C.ink, 0.45));
    L.mid.p.rect(s.x, top, s.w, 1, mix(s.wall, C.paper, 0.25));
    for (let wy = top + 14; wy < FLOOR - 92; wy += 28)
      for (let wx = s.x + 8; wx < s.x + s.w - 16; wx += 22) {
        L.mid.p.rect(wx - 1, wy - 1, 14, 18, mix(s.wall, C.ink, 0.5));
        const on = rnd(c, `sw${i}${wx}${wy}`) > (night(c) ? 0.35 : 0.75);
        if (on) lit(L.mid, wx, wy, 12, 16, mix(C.glow, C.wall2, 0.25));
        else L.mid.p.vgrad(wx, wy, 12, 16, [C.sky1, C.sky0]);
        L.mid.p.rect(wx + 5, wy, 2, 16, mix(s.wall, C.ink, 0.5));
      }
    // awning with stripes, shop window and door
    const ay = FLOOR - 86;
    for (let x = s.x + 2; x < s.x + s.w - 2; x++) L.mid.p.rect(x, ay, 1, 10 + ((x - s.x) % 8 < 4 ? 0 : 1), (x - s.x) % 8 < 4 ? s.awn : C.paper);
    L.mid.p.rect(s.x + 2, ay + 11, s.w - 4, 1, mix(s.awn, C.ink, 0.5));
    lit(L.mid, s.x + 8, ay + 22, s.w - 36, 34, mix(C.glow, C.wood2, 0.35));
    L.mid.p.frame(s.x + 7, ay + 21, s.w - 34, 36, C.wood0);
    L.mid.p.rect(s.x + s.w - 24, ay + 18, 16, FLOOR - ay - 18, C.wood0);
    L.mid.p.rect(s.x + s.w - 22, ay + 20, 12, FLOOR - ay - 20, C.wood1);
    L.mid.p.set(s.x + s.w - 12, ay + 46, C.accent2);
  });
  // neon sign
  const neon = night(c) ? C.accent : C.accent2;
  const flick = Math.sin(c.t * 13) > -0.85 ? 1 : 0;
  L.mid.p.rect(150, 96, 52, 16, C.ink);
  if (flick) {
    L.mid.g.rect(150, 96, 52, 16, neon);
    for (let x = 0; x < 44; x += 6) lit(L.mid, 154 + x, 100, 4, 8, neon);
  }
  // sidewalk and road
  L.mid.p.rect(-24, FLOOR, W + 48, 26, C.floor1);
  for (let x = -24; x < W + 24; x += 18) L.mid.p.rect(x, FLOOR, 1, 26, mix(C.floor1, C.ink, 0.35));
  L.mid.p.rect(-24, FLOOR + 26, W + 48, 3, C.metal1);
  L.mid.p.vgrad(-24, FLOOR + 29, W + 48, 160, [C.floor0, mix(C.floor0, C.ink, 0.6)]);
  for (let x = -10; x < W + 24; x += 40) L.mid.p.rect(x, FLOOR + 80, 20, 3, mix(C.accent2, C.floor0, 0.4));
  lampPost(L.mid, c, 52, 150, FLOOR + 6);
  lampPost(L.mid, c, 214, 150, FLOOR + 6);
  L.mid.p.pool(54, FLOOR + 12, 40, 12, mix(C.floor1, C.glow, 0.45), 0.7);
  L.mid.p.pool(216, FLOOR + 12, 40, 12, mix(C.floor1, C.glow, 0.45), 0.7);
  // near: blurred fence and post
  for (let x = -24; x < W + 24; x += 14) L.near.p.rect(x, 420, 5, 80, mix(C.wood0, C.ink, 0.6));
  L.near.p.rect(-24, 432, W + 48, 6, mix(C.wood0, C.ink, 0.6));
  L.near.p.rect(250, 250, 14, 260, mix(C.metal0, C.ink, 0.6));
  return {
    floor: FLOOR + 16,
    surfaces: [],
    rays: [
      { x: 53, y: 156, angle: 90, spread: 30, len: 160 },
      { x: 215, y: 156, angle: 90, spread: 30, len: 160 },
    ],
  };
}

function desert(L: Layers, c: SetCtx): SetInfo {
  const { C } = c;
  skyBackdrop(L.far, c, { body: night(c) ? "moon" : "sun", bodyX: 150, bodyY: 150, bodyR: night(c) ? 16 : 34, to: 270 });
  L.far.p.ridge(-24, W + 24, (x) => 196 - (x > 20 && x < 90 ? 34 : 0) - (x > 170 && x < 250 ? 52 : 0) - Math.round(Math.sin(x / 9) * 2), 280, C.far0);
  L.far.p.ridge(-24, W + 24, (x) => 236 - Math.round(Math.sin(x / 23) * 8 + Math.sin(x / 7) * 2), 280, C.far1);
  // adobe buildings
  const adobe = mix(C.wood2, C.wall2, 0.4);
  const blds = [{ x: -18, w: 70, h: 96 }, { x: 186, w: 96, h: 120 }];
  blds.forEach((b, i) => {
    const top = FLOOR - b.h;
    L.mid.p.vgrad(b.x, top, b.w, b.h, [mix(adobe, C.paper, 0.15), adobe, mix(adobe, C.ink, 0.35)]);
    L.mid.p.rect(b.x, top, b.w, 3, mix(adobe, C.ink, 0.35));
    for (let k = 0; k < 6; k++) L.mid.p.rect(b.x + 4 + k * 12, top + 8, 3, 2, mix(C.wood0, C.ink, 0.2));
    L.mid.p.rect(b.x + 16, FLOOR - 40, 18, 40, C.wood0);
    L.mid.p.rect(b.x + 18, FLOOR - 38, 14, 38, mix(C.wood0, C.ink, 0.4));
    const lw = i ? 20 : 14;
    if (night(c)) lit(L.mid, b.x + b.w - lw - 12, top + 26, lw, 14, C.glow);
    else L.mid.p.rect(b.x + b.w - lw - 12, top + 26, lw, 14, mix(C.wood0, C.ink, 0.3));
  });
  // water tower
  L.mid.p.rect(212, 118, 34, 26, C.wood1);
  for (let x = 212; x < 246; x += 5) L.mid.p.rect(x, 118, 1, 26, C.wood0);
  L.mid.p.ridge(210, 248, (x) => 108 + Math.abs(x - 229) * 0.5, 118, C.wood0);
  for (const lx of [214, 242]) L.mid.p.rect(lx, 144, 2, 40, C.wood0);
  // cacti
  const cactus = (x: number, h: number) => {
    L.mid.p.rect(x, FLOOR - h, 7, h, C.leaf1);
    L.mid.p.rect(x + 1, FLOOR - h, 1, h, mix(C.leaf1, C.paper, 0.3));
    L.mid.p.rect(x - 7, FLOOR - h + 12, 7, 5, C.leaf1);
    L.mid.p.rect(x - 7, FLOOR - h + 2, 5, 14, C.leaf1);
    L.mid.p.rect(x + 7, FLOOR - h + 20, 7, 5, C.leaf1);
    L.mid.p.rect(x + 10, FLOOR - h + 9, 5, 14, C.leaf1);
    L.mid.p.rect(x + 5, FLOOR - h, 2, h, C.leaf0);
  };
  cactus(82, 46);
  cactus(158, 34);
  // ground: sand with ripples, fence and rail
  L.mid.p.vgrad(-24, FLOOR, W + 48, 190, [mix(C.wood2, C.sky3, 0.35), C.wood2, mix(C.wood1, C.ink, 0.4)]);
  for (let i = 0; i < 40; i++) L.mid.p.rect(Math.floor(rnd(c, `dr${i}`) * 300) - 24, FLOOR + 10 + Math.floor(rnd(c, `dry${i}`) * 170), 6 + (i % 5), 1, mix(C.wood1, C.ink, 0.15));
  for (let x = -20; x < W + 24; x += 22) L.mid.p.rect(x, FLOOR - 14, 3, 18, C.wood0);
  L.mid.p.rect(-24, FLOOR - 12, W + 48, 2, C.wood1);
  L.mid.p.rect(-24, FLOOR - 5, W + 48, 2, C.wood1);
  // near: blurred cactus and rocks
  L.near.p.rect(232, 330, 20, 180, mix(C.leaf0, C.ink, 0.5));
  L.near.p.rect(212, 370, 20, 12, mix(C.leaf0, C.ink, 0.5));
  L.near.p.rect(212, 350, 10, 26, mix(C.leaf0, C.ink, 0.5));
  L.near.p.disc(10, 486, 40, mix(C.wood0, C.ink, 0.5));
  return { floor: FLOOR + 14, surfaces: [], rays: [{ x: 150, y: 150, angle: 90, spread: 100, len: 300 }] };
}

function factory(L: Layers, c: SetCtx): SetInfo {
  const { C } = c;
  // far: ribbed metal wall with high windows
  L.far.p.vgrad(-24, -14, W + 48, 330, [mix(C.metal0, C.ink, 0.5), C.metal0, mix(C.metal0, C.wall1, 0.5)]);
  for (let x = -24; x < W + 24; x += 12) {
    L.far.p.rect(x, -14, 1, 330, mix(C.metal0, C.ink, 0.4));
    L.far.p.rect(x + 1, -14, 1, 330, mix(C.metal0, C.metal1, 0.25));
  }
  for (let x = 4; x < W; x += 44) lit(L.far, x, 30, 30, 16, mix(C.glow2, C.sky3, 0.3));
  // mid: pipes, hanging lamps, conveyor
  for (const [y, h] of [[70, 8], [86, 5]] as const) {
    L.mid.p.rect(-24, y, W + 48, h, C.metal0);
    L.mid.p.rect(-24, y + 1, W + 48, 1, C.metal1);
    for (let x = -10; x < W + 24; x += 50) L.mid.p.rect(x, y - 2, 5, h + 4, mix(C.metal0, C.ink, 0.4));
  }
  L.mid.p.rect(30, 86, 6, 140, C.metal0);
  L.mid.p.rect(31, 86, 1, 140, C.metal1);
  for (const lx of [60, 210]) {
    L.mid.p.rect(lx, 92, 1, 40, C.ink);
    L.mid.p.ridge(lx - 12, lx + 13, (x) => 132 + Math.abs(x - lx) * 0.25, 138, C.metal0);
    lit(L.mid, lx - 8, 138, 17, 2, C.glow);
  }
  // machine housings
  L.mid.p.rect(-20, 200, 44, 92, mix(C.metal0, C.wall1, 0.4));
  L.mid.p.frame(-20, 200, 44, 92, C.ink);
  lit(L.mid, -10, 214, 8, 4, C.leaf1);
  lit(L.mid, 2, 214, 8, 4, C.accent);
  L.mid.p.rect(236, 186, 50, 106, mix(C.metal0, C.wall1, 0.4));
  L.mid.p.frame(236, 186, 50, 106, C.ink);
  for (let y = 196; y < 280; y += 8) L.mid.p.rect(242, y, 30, 2, mix(C.metal0, C.ink, 0.35));
  // conveyor belt with moving rollers
  const by = 262;
  L.mid.p.rect(-24, by, W + 48, 8, C.ink);
  const shift = Math.floor(c.t * 20) % 10;
  for (let x = -24 + shift; x < W + 24; x += 10) L.mid.p.rect(x, by + 1, 5, 2, C.metal1);
  for (let x = -20 + (shift % 10); x < W + 24; x += 10) L.mid.p.disc(x, by + 6, 2, C.metal0);
  L.mid.p.rect(-24, by + 9, W + 48, 3, C.metal0);
  for (let x = -6; x < W + 24; x += 60) L.mid.p.rect(x, by + 12, 6, FLOOR - by - 12, C.metal0);
  // floor with hazard stripes
  L.mid.p.vgrad(-24, FLOOR, W + 48, 190, [C.floor1, C.floor0, mix(C.floor0, C.ink, 0.5)]);
  for (let x = -24; x < W + 24; x++) L.mid.p.rect(x, FLOOR, 1, 5, Math.floor((x + 24) / 6) % 2 ? C.accent2 : C.ink);
  for (let y = FLOOR + 20; y < 490; y += 26) L.mid.p.rect(-24, y, W + 48, 1, mix(C.floor0, C.ink, 0.4));
  // near: railing and hanging chain
  L.near.p.rect(-24, 400, W + 48, 6, mix(C.metal0, C.ink, 0.5));
  for (let x = -20; x < W + 24; x += 30) L.near.p.rect(x, 400, 5, 100, mix(C.metal0, C.ink, 0.5));
  for (let y = -14; y < 120; y += 6) L.near.p.rect(250 + ((y / 6) % 2), y, 4, 4, mix(C.metal0, C.ink, 0.45));
  return {
    floor: FLOOR + 16,
    surfaces: [{ x0: -24, x1: 294, y: by }],
    rays: [
      { x: 60, y: 140, angle: 90, spread: 34, len: 180 },
      { x: 210, y: 140, angle: 90, spread: 34, len: 180 },
    ],
  };
}

function gallery(L: Layers, c: SetCtx): SetInfo {
  const { C } = c;
  // far: arched stained glass window
  L.far.p.rect(-24, -14, W + 48, 330, mix(C.wall0, C.ink, 0.3));
  const cx = 135;
  for (let y = 0; y < 120; y++)
    for (let x = cx - 50; x < cx + 50; x++) {
      const dy = y < 50 ? Math.hypot(x - cx, (y - 50) * 1.0) : Math.abs(x - cx);
      if (dy > 50) continue;
      const seg = Math.floor(Math.atan2(y - 60, x - cx) * 3 + 10) % 5;
      const cols = [C.accent, C.glow2, C.accent2, C.leaf1, C.glow];
      const edge = dy > 47 || (x - cx) % 25 === 0 || y % 30 === 0;
      if (edge) L.far.p.set(x, y - 6, C.ink);
      else {
        L.far.p.set(x, y - 6, mix(cols[seg], C.paper, 0.15));
        L.far.g.set(x, y - 6, cols[seg]);
      }
    }
  // mid: wall, wainscot, frames, columns
  for (let y = -14; y < FLOOR; y++)
    for (let x = -24; x < W + 24; x++) {
      if (y < 114 && Math.abs(x - cx) < 54 && (y >= 44 || Math.hypot(x - cx, y - 44) < 54)) continue;
      L.mid.p.set(x, y, y > 200 ? (y % 22 < 2 ? C.wood0 : C.wood1) : C.wall1);
    }
  L.mid.p.rect(-24, 196, W + 48, 5, C.wood2);
  for (let x = -24; x < W + 24; x += 26) L.mid.p.rect(x, 201, 2, FLOOR - 201, C.wood0);
  const frames: [number, number, number, number, RGB][] = [
    [14, 126, 40, 52, C.sky3],
    [214, 120, 46, 40, C.leaf1],
  ];
  for (const [x, y, w, h, tint] of frames) {
    L.mid.p.rect(x - 4, y - 4, w + 8, h + 8, C.accent2);
    L.mid.p.frame(x - 4, y - 4, w + 8, h + 8, mix(C.accent2, C.ink, 0.5));
    L.mid.p.vgrad(x, y, w, h, [C.sky1, tint]);
    L.mid.p.ridge(x, x + w, (xx) => y + h - 10 - Math.abs(Math.sin((xx - x) / 6)) * 10, y + h, C.far0);
    L.mid.p.disc(x + w - 10, y + 10, 4, C.paper);
  }
  for (const colX of [-18, 268]) {
    L.mid.p.rect(colX, -14, 22, FLOOR + 14, C.paper);
    for (let x = 3; x < 22; x += 5) L.mid.p.rect(colX + x, -14, 1, FLOOR + 14, mix(C.paper, C.wall1, 0.45));
    L.mid.p.rect(colX - 3, FLOOR - 10, 28, 10, mix(C.paper, C.wall1, 0.3));
  }
  // checkered floor with fake perspective (rows grow toward the viewer) and a red carpet
  let y = FLOOR;
  let row = 0;
  while (y < 494) {
    const h = 6 + row * 3;
    for (let x = -24; x < W + 24; x++) {
      const ox = x - 135;
      const s = h * 1.6;
      const check = (Math.floor((ox + 1000 + (row % 2) * s) / s) % 2) === 0;
      L.mid.p.rect(x, y, 1, h, check ? mix(C.paper, C.wall2, 0.45) : mix(C.ink, C.wall1, 0.45));
    }
    y += h;
    row++;
  }
  L.mid.p.vgrad(100, FLOOR, 70, 190, [mix(C.accent, C.ink, 0.25), C.accent]);
  L.mid.p.pool(135, FLOOR + 10, 120, 30, mix(C.wall2, C.paper, 0.3), 0.4);
  // velvet rope posts
  for (const px of [36, 230]) {
    L.mid.p.rect(px, FLOOR - 30, 3, 34, C.accent2);
    L.mid.p.disc(px + 1, FLOOR - 32, 3, C.accent2);
  }
  for (let x = 39; x < 230; x++) L.mid.p.rect(x, FLOOR - 26 + Math.round(Math.sin(((x - 39) / 191) * Math.PI) * 8), 1, 2, C.accent);
  // near: blurred column and rope post
  L.near.p.rect(-24, -14, 34, 520, mix(C.paper, C.ink, 0.55));
  L.near.p.rect(220, 400, 10, 110, mix(C.accent2, C.ink, 0.45));
  L.near.p.disc(225, 398, 8, mix(C.accent2, C.ink, 0.45));
  return { floor: FLOOR + 14, surfaces: [], rays: [{ x: 135, y: 70, angle: 90, spread: 40, len: 300 }] };
}

function temple(L: Layers, c: SetCtx): SetInfo {
  const { C } = c;
  skyBackdrop(L.far, c, { body: night(c) ? "moon" : "sun", bodyX: 135, bodyY: 150, bodyR: 46, to: 280 });
  for (let i = 0; i < 4; i++) {
    const cy = 60 + i * 34, cx = (i * 97 + c.t * 3) % 330 - 30;
    for (let k = 0; k < 5; k++) L.far.p.disc(cx + k * 9, cy + (k % 2) * 2, 6, mix(C.sky2, C.paper, 0.15));
  }
  L.far.p.ridge(-24, W + 24, (x) => 250 - Math.round(Math.abs(Math.sin(x / 40)) * 30), 300, C.far0);
  // mid: shoji walls with a lit paper grid
  for (const [x0, x1] of [[-24, 60], [210, 294]] as const) {
    L.mid.p.rect(x0, 120, x1 - x0, FLOOR - 120, C.wood0);
    for (let y = 126; y < FLOOR - 6; y++)
      for (let x = x0 + 4; x < x1 - 4; x++) {
        const grid = (x - x0) % 10 === 0 || (y - 126) % 14 === 0;
        L.mid.p.set(x, y, grid ? C.wood0 : mix(C.paper, C.glow, 0.25));
        if (!grid && (x + y) % 3 === 0) L.mid.g.set(x, y, mix(C.glow, C.paper, 0.5));
      }
    L.mid.p.rect(x0, 110, x1 - x0, 10, mix(C.wood0, C.ink, 0.3));
  }
  // gate: two posts, two beams with flared ends
  const red = C.accent;
  L.mid.p.rect(70, 80, 10, FLOOR - 80, red);
  L.mid.p.rect(190, 80, 10, FLOOR - 80, red);
  L.mid.p.rect(72, 80, 2, FLOOR - 80, mix(red, C.paper, 0.3));
  L.mid.p.rect(192, 80, 2, FLOOR - 80, mix(red, C.paper, 0.3));
  for (let x = 50; x < 221; x++) {
    const lift = Math.round(((x - 135) / 85) ** 4 * 8);
    L.mid.p.rect(x, 64 - lift, 1, 8, C.ink);
    L.mid.p.rect(x, 72 - lift, 1, 5, red);
  }
  L.mid.p.rect(62, 98, 146, 6, red);
  L.mid.p.rect(128, 77, 14, 21, C.ink);
  // hanging lanterns on the beam
  for (const lx of [100, 170]) {
    L.mid.p.rect(lx, 104, 1, 18, C.ink);
    const sway = Math.round(Math.sin(c.t * 1.6 + lx) * 1);
    L.mid.p.rect(lx - 7 + sway, 122, 15, 2, C.ink);
    lit(L.mid, lx - 8 + sway, 124, 17, 20, mix(C.glow, C.accent, 0.35));
    for (let y = 127; y < 144; y += 4) L.mid.p.rect(lx - 8 + sway, y, 17, 1, mix(C.accent, C.ink, 0.3));
    L.mid.p.rect(lx - 7 + sway, 144, 15, 2, C.ink);
  }
  // stone path and ground
  L.mid.p.vgrad(-24, FLOOR, W + 48, 190, [C.floor1, C.floor0, mix(C.floor0, C.ink, 0.5)]);
  let y = FLOOR + 4;
  let row = 0;
  while (y < 490) {
    const h = 5 + row * 2;
    const half = 30 + row * 10;
    for (let x = 135 - half; x < 135 + half; x += h * 2) L.mid.p.rect(x + (row % 2) * h, y, h * 2 - 2, h - 2, mix(C.metal1, C.floor1, 0.4));
    y += h;
    row++;
  }
  // stone lanterns
  for (const sx of [24, 236]) {
    L.mid.p.rect(sx - 4, FLOOR - 40, 10, 40, C.metal0);
    L.mid.p.rect(sx - 9, FLOOR - 52, 20, 5, C.metal1);
    lit(L.mid, sx - 4, FLOOR - 47, 10, 7, C.glow);
    L.mid.p.rect(sx - 11, FLOOR - 58, 24, 6, C.metal0);
  }
  // near: blurred bamboo and branch
  for (const bx of [-18, 0, 250]) {
    L.near.p.rect(bx, -14, 9, 520, mix(C.leaf0, C.ink, 0.45));
    for (let yy = 20; yy < 500; yy += 60) L.near.p.rect(bx - 1, yy, 11, 3, mix(C.leaf0, C.ink, 0.7));
  }
  for (let x = 160; x < 300; x++) L.near.p.rect(x, -14 + Math.round(((x - 160) / 20) ** 2), 1, 5, mix(C.wood0, C.ink, 0.6));
  return { floor: FLOOR + 16, surfaces: [], rays: [{ x: 135, y: 150, angle: 90, spread: 70, len: 260 }] };
}

function forest(L: Layers, c: SetCtx): SetInfo {
  const { C } = c;
  skyBackdrop(L.far, c, { bodyX: 80, bodyY: 60, bodyR: night(c) ? 10 : 20, to: 280 });
  const trees = (base: number, col: RGB, k: string, h: number, step: number) => {
    for (let x = -30; x < W + 30; x += step) {
      const th = h + Math.floor(rnd(c, `${k}${x}`) * 40);
      for (let i = 0; i < th; i += 2) {
        const half = Math.round((i / th) * step * 0.9) + 1;
        L.far.p.rect(x - half, base - th + i, half * 2, 2, col);
      }
    }
  };
  trees(250, C.far0, "tf", 110, 22);
  trees(280, C.far1, "tm", 80, 30);
  // mid: trunks and canopies
  for (const [x, w] of [[-10, 26], [64, 16], [196, 22], [258, 30]] as const) {
    L.mid.p.rect(x, -14, w, FLOOR - 4 + 14, C.wood0);
    L.mid.p.rect(x + 3, -14, 2, FLOOR + 10, C.wood1);
    for (let y = 10; y < FLOOR; y += 17) L.mid.p.rect(x + 6 + (y % 3), y, 4, 2, mix(C.wood0, C.ink, 0.4));
    L.mid.p.rect(x - 5, FLOOR - 6, w + 10, 6, C.wood0);
  }
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rnd(c, `cx${i}`) * 330) - 30, y = Math.floor(rnd(c, `cy${i}`) * 80) - 10;
    L.mid.p.disc(x, y, 14 + (i % 4) * 3, i % 3 ? C.leaf0 : C.leaf1);
  }
  // ground: grass with dither, a trail
  L.mid.p.vgrad(-24, FLOOR - 6, W + 48, 196, [C.leaf1, C.leaf0, mix(C.leaf0, C.ink, 0.55)]);
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rnd(c, `gx${i}`) * 320) - 24, y = FLOOR - 6 + Math.floor(rnd(c, `gy${i}`) * 180);
    L.mid.p.rect(x, y - 3, 1, 3, mix(C.leaf1, C.paper, 0.2));
    L.mid.p.rect(x + 2, y - 2, 1, 2, mix(C.leaf1, C.paper, 0.2));
  }
  for (let y = FLOOR; y < 494; y++) {
    const half = 18 + (y - FLOOR) * 0.55;
    const cxp = 135 + Math.sin((y - FLOOR) / 30) * 14;
    L.mid.p.dither(cxp - half, y, half * 2, 1, C.wood2, C.wood1, (x) => Math.abs(x - cxp) / half);
  }
  // fireflies
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(rnd(c, `ffx${i}`) * 270 + Math.sin(c.t * 0.9 + i) * 10);
    const y = Math.floor(120 + rnd(c, `ffy${i}`) * 180 + Math.cos(c.t * 0.7 + i * 2) * 8);
    if (Math.sin(c.t * 3 + i * 1.7) > -0.3) lit(L.mid, x, y, 1, 1, C.glow);
  }
  // near: blurred leaves
  nearPlant(L.near, c, -4, 490, 1.6);
  nearPlant(L.near, c, 280, 490, 1.4, true);
  for (let i = 0; i < 8; i++) L.near.p.disc(210 + i * 12, -10 + (i % 3) * 8, 16, mix(C.leaf0, C.ink, 0.6));
  return { floor: FLOOR + 14, surfaces: [], rays: [{ x: 150, y: -10, angle: 75, spread: 26, len: 360 }, { x: 60, y: -10, angle: 80, spread: 14, len: 330 }] };
}

function lab(L: Layers, c: SetCtx): SetInfo {
  const { C } = c;
  L.far.p.vgrad(-24, -14, W + 48, 330, [mix(C.wall0, C.ink, 0.4), C.wall0, C.wall1]);
  for (let x = -24; x < W + 24; x += 30) L.far.p.rect(x, -14, 1, 330, mix(C.wall0, C.ink, 0.3));
  // big screen with a graph
  L.far.p.rect(70, 40, 130, 70, C.ink);
  lit(L.far, 74, 44, 122, 62, mix(C.glow2, C.ink, 0.75));
  for (let x = 0; x < 118; x++) {
    const v = Math.round(30 + Math.sin(x / 9 + c.t * 2) * 12 + Math.sin(x / 3) * 3);
    lit(L.far, 76 + x, 44 + v, 1, 2, C.glow2);
  }
  for (let y = 0; y < 3; y++) lit(L.far, 80, 50 + y * 6, 20 + y * 8, 2, C.accent2);
  // mid: shelves with flasks, tubes, cables, bench
  for (const sy of [140, 186]) {
    L.mid.p.rect(-24, sy, 100, 3, C.metal1);
    L.mid.p.rect(-24, sy + 3, 100, 2, C.metal0);
    for (let i = 0; i < 6; i++) {
      const fx = -16 + i * 15, col = [C.accent, C.glow2, C.accent2, C.leaf1][i % 4];
      L.mid.p.rect(fx + 2, sy - 16, 3, 6, mix(C.paper, C.metal1, 0.3));
      L.mid.p.disc(fx + 3, sy - 6, 5, mix(C.paper, C.metal1, 0.45));
      lit(L.mid, fx, sy - 6, 7, 5, col);
    }
  }
  for (const tx of [208, 238]) {
    L.mid.p.rect(tx, 120, 18, 130, mix(C.metal0, C.ink, 0.2));
    L.mid.p.rect(tx + 2, 124, 14, 122, mix(C.glow2, C.wall0, 0.45));
    L.mid.g.rect(tx + 2, 124, 14, 122, mix(C.glow2, C.wall0, 0.5));
    for (let b = 0; b < 6; b++) {
      const by = 246 - ((c.t * 30 + b * 23 + tx) % 120);
      L.mid.p.rect(tx + 4 + (b % 3) * 3, by, 2, 2, C.paper);
    }
    L.mid.p.rect(tx - 2, 114, 22, 6, C.metal1);
    L.mid.p.rect(tx - 2, 248, 22, 6, C.metal1);
  }
  L.mid.p.rect(-24, 246, W + 48, 6, C.metal1);
  L.mid.p.rect(-24, 252, W + 48, 4, C.metal0);
  for (const lx of [10, 120, 180]) L.mid.p.rect(lx, 256, 5, FLOOR - 256, C.metal0);
  // floor tiles
  L.mid.p.vgrad(-24, FLOOR, W + 48, 190, [C.floor1, C.floor0, mix(C.floor0, C.ink, 0.5)]);
  for (let y = FLOOR; y < 494; y += 20) L.mid.p.rect(-24, y, W + 48, 1, mix(C.floor0, C.ink, 0.4));
  for (let x = -24; x < W + 24; x += 24) L.mid.p.rect(x, FLOOR, 1, 190, mix(C.floor0, C.ink, 0.4));
  L.mid.p.pool(135, FLOOR + 6, 140, 20, mix(C.floor1, C.glow2, 0.4), 0.5);
  // near: blurred tube rack
  L.near.p.rect(-24, 360, 70, 150, mix(C.metal0, C.ink, 0.55));
  L.near.p.rect(250, -14, 50, 200, mix(C.metal0, C.ink, 0.6));
  return { floor: FLOOR + 14, surfaces: [{ x0: -24, x1: 294, y: 246 }], rays: [] };
}

function space(L: Layers, c: SetCtx): SetInfo {
  const { C } = c;
  L.far.p.vgrad(-24, -14, W + 48, 510, [mix(C.sky0, C.ink, 0.4), C.sky0, C.sky1]);
  // nebula: dithered blobs
  L.far.p.pool(70, 120, 120, 70, mix(C.accent, C.sky1, 0.5), 0.5);
  L.far.p.pool(210, 220, 110, 60, mix(C.glow2, C.sky1, 0.55), 0.45);
  for (let i = 0; i < 120; i++) {
    const x = Math.floor(rnd(c, `stx${i}`) * 330) - 30, y = Math.floor(rnd(c, `sty${i}`) * 500) - 12;
    const on = Math.sin(c.t * 2.5 + i * 1.3) > -0.5;
    L.far.p.set(x, y, on ? C.paper : mix(C.paper, C.sky0, 0.5));
    if (i % 7 === 0 && on) {
      L.far.g.set(x, y, C.paper);
      L.far.p.set(x - 1, y, mix(C.paper, C.sky0, 0.5));
      L.far.p.set(x + 1, y, mix(C.paper, C.sky0, 0.5));
    }
  }
  // planet with ring
  const px = 196, py = 96;
  for (let y = -30; y <= 30; y++)
    for (let x = -30; x <= 30; x++) {
      if (x * x + y * y > 900) continue;
      const shade = (x + y) / 60 + 0.5;
      L.far.p.set(px + x, py + y, shade > 0.62 + (bayer8(x, y) - 0.5) * 0.25 ? mix(C.accent, C.ink, 0.45) : y % 9 < 3 ? mix(C.accent2, C.accent, 0.4) : C.accent2);
    }
  for (let a = 0; a < 360; a += 0.5) {
    const x = px + Math.cos((a * Math.PI) / 180) * 50, y = py + Math.sin((a * Math.PI) / 180) * 9;
    if (a > 180 && a < 360 && Math.hypot(x - px, y - py) < 30) continue;
    L.far.p.set(x, y, C.paper);
  }
  // mid: station window frame and deck
  L.mid.p.rect(-24, -14, W + 48, 26, C.metal0);
  L.mid.p.rect(-24, 12, W + 48, 3, C.metal1);
  L.mid.p.rect(-24, -14, 20, FLOOR + 14, C.metal0);
  L.mid.p.rect(274, -14, 20, FLOOR + 14, C.metal0);
  for (let y = 20; y < FLOOR; y += 24) {
    L.mid.p.rect(-6, y, 2, 2, C.metal1);
    L.mid.p.rect(276, y, 2, 2, C.metal1);
  }
  for (const by of [140, 150]) lit(L.mid, -6, by, 3, 3, by === 140 ? C.accent : C.leaf1);
  // floating debris
  for (let i = 0; i < 5; i++) {
    const x = Math.round((rnd(c, `db${i}`) * 300 + c.t * (4 + i)) % 300) - 15, y = 60 + i * 40 + Math.round(Math.sin(c.t + i) * 3);
    L.mid.p.rect(x, y, 3 + (i % 2), 2 + (i % 3), C.metal1);
  }
  L.mid.p.rect(-24, FLOOR - 6, W + 48, 6, C.metal1);
  L.mid.p.vgrad(-24, FLOOR, W + 48, 190, [C.metal0, mix(C.metal0, C.ink, 0.6)]);
  for (let x = -24; x < W + 24; x += 8) L.mid.p.rect(x, FLOOR, 1, 190, mix(C.metal0, C.ink, 0.4));
  for (let y = FLOOR + 8; y < 494; y += 8) L.mid.p.rect(-24, y, W + 48, 1, mix(C.metal0, C.ink, 0.4));
  for (let x = 6; x < W; x += 40) lit(L.mid, x, FLOOR - 4, 6, 2, C.glow2);
  // near: blurred panels
  L.near.p.rect(-24, 380, 60, 130, mix(C.metal0, C.ink, 0.55));
  L.near.p.rect(240, 420, 60, 90, mix(C.metal0, C.ink, 0.55));
  return { floor: FLOOR + 14, surfaces: [], rays: [{ x: 196, y: 96, angle: 115, spread: 30, len: 280 }] };
}

const bayer8 = (x: number, y: number) => ((((x % 4) + 4) % 4) * 4 + (((y % 4) + 4) % 4)) / 16;

export const SETS: Record<string, (L: Layers, c: SetCtx) => SetInfo> = { room, street, desert, factory, gallery, temple, forest, lab, space };
export const rgbRoles = (roles: Record<string, string>): Roles => Object.fromEntries(Object.entries(roles).map(([k, v]) => [k, rgb(v)]));
