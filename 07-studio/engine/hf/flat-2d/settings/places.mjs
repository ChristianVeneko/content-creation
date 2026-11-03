// Outdoor and industrial settings.
import { W, FLOOR, BL, wallFloor, tiles, windowFrame, plant, building, cloud, named, lt, checker } from "./common.mjs";
import { mulberry32 } from "../util.mjs";

const done = (far, mid, near, parts) => ({ far, mid: mid + parts.map((p) => p.svg).join(""), near, props: Object.fromEntries(parts.map((p) => [p.name, { ...p.box, about: p.about || p.name }])) });
const R = (d, x, y, w, h, o) => d.rect(x, y, w, h, o);

const shopfront = (d, x, y, w, color, label, icon) =>
  d.rect(x, y, w, 330, { f: "surface", r: 12 }) + d.rect(x + 18, y + 120, w - 36, 190, { f: lt(d, "accent3", 0.55), r: 10, sh: false }) +
  d.path(`M${x - 14},${y + 60} L${x + w + 14},${y + 60} L${x + w - 6},${y + 124} L${x + 6},${y + 124} Z`, { f: color }) +
  [0, 1, 2, 3, 4].map((i) => `<polygon points="${x + 6 + i * (w - 12) / 5},${y + 60} ${x + 6 + (i + 1) * (w - 12) / 5},${y + 60} ${x + 6 + (i + 0.5) * (w - 12) / 5},${y + 124}" fill="${d.col("surface")}" opacity=".5"/>`).join("") +
  d.rect(x + 20, y + 4, w - 40, 50, { f: color, r: 10 }) + d.text(x + w / 2, y + 44, label, { size: 34, f: "surface", font: "display", weight: 800 }) + d.rect(x + w / 2 - 34, y + 190, 68, 120, { f: "ink", op: 0.75, r: 8, sh: false, st: false });

export const cityStreet = {
  id: "city-street", name: "City street", about: "Street with shopfronts, lamp posts, a car and a bus stop on a skyline: local business, delivery, neighborhoods",
  build(d) {
    const sky = d.rect(BL.x0, BL.y0, BL.x1 - BL.x0, 820 - BL.y0, { f: lt(d, "accent3", 0.6), sh: false, st: false, r: 0, op: 0.5 });
    const r = mulberry32(8);
    let sk = "";
    for (let i = 0; i < 9; i++) sk += building(d, -280 + i * 170, 330 - r() * 170, 140, 520, i % 2 ? "surface2" : "wall", 7, 2, 4 + i);
    const far = sky + cloud(d, 200, 170, 1.2) + cloud(d, 780, 100, 0.9) + sk;
    const mid = d.rect(BL.x0, 820, BL.x1 - BL.x0, 80, { f: "surface2", sh: false, st: false, r: 0 }) + d.rect(BL.x0, 900, BL.x1 - BL.x0, 300, { f: "floor", sh: false, st: false, r: 0 }) +
      [0, 1, 2, 3, 4].map((i) => d.rect(-90 + i * 260, 990, 130, 12, { f: "warn", r: 6, sh: false, st: false })).join("");
    const near = d.rect(-60, 700, 24, 340, { f: "ink", r: 8, sh: false, op: 0.7 }) + d.rect(980, 700, 24, 340, { f: "ink", r: 8, sh: false, op: 0.7 });
    return done(far, mid, near, [
      named(d, "shop-a", shopfront(d, 20, 490, 270, "accent", "PAN", "bread"), { x: 6, y: 490, w: 300, h: 330 }),
      named(d, "shop-b", shopfront(d, 350, 490, 270, "accent2", "CAFE", "coffee"), { x: 336, y: 490, w: 300, h: 330 }),
      named(d, "shop-c", shopfront(d, 680, 490, 270, "good", "FARMA", "first-aid-kit"), { x: 666, y: 490, w: 300, h: 330 }),
      named(d, "lamppost", d.rect(906, 520, 12, 360, { f: "ink", r: 6, sh: false }) + d.path("M912,520 q-60,-6 -70,40", { f: "none", sh: false, extra: { stroke: d.col("ink"), "stroke-width": 12, "stroke-linecap": "round" } }) + d.circle(838, 570, 22, { f: "warn" }), { x: 830, y: 500, w: 100, h: 380 }),
      named(d, "car", d.rect(180, 860, 300, 70, { f: "bad", r: 26 }) + d.path("M230,860 L270,810 L400,810 L440,860 Z", { f: "bad", r: 10 }) + d.path("M250,858 L282,820 L330,820 L330,858 Z M342,858 L342,820 L392,820 L420,858 Z", { f: lt(d, "accent3", 0.6), sh: false }) + d.circle(250, 934, 30, { f: "ink" }) + d.circle(250, 934, 12, { f: "muted", sh: false }) + d.circle(420, 934, 30, { f: "ink" }) + d.circle(420, 934, 12, { f: "muted", sh: false }), { x: 180, y: 810, w: 300, h: 160 }),
      named(d, "bench", d.rect(560, 880, 150, 16, { f: "warn", r: 6, sh: false }) + d.rect(570, 896, 10, 40, { f: "muted", sh: false }) + d.rect(690, 896, 10, 40, { f: "muted", sh: false }), { x: 560, y: 840, w: 150, h: 100 }),
    ]);
  },
};

export const airport = {
  id: "airport", name: "Airport", about: "Terminal with a huge window onto the runway, departures board, gate sign and luggage (travel, logistics, routing)",
  build(d) {
    const far = wallFloor(d, FLOOR, { wall: "wall", floor: "surface2" }) + tiles(d, FLOOR + 6, 1100, 110, "surface", 0.5) +
      d.rect(-40, 90, 1040, 470, { f: lt(d, "accent3", 0.6), r: 20, sh: false }) + d.rect(-40, 440, 1040, 120, { f: "floor", r: 0, sh: false, st: false, op: 0.55 }) + cloud(d, 200, 200, 1.1) + cloud(d, 720, 150, 0.8);
    const mid = [0, 1, 2, 3, 4].map((i) => `<rect x="${-40 + i * 260}" y="90" width="12" height="470" fill="${d.col("surface")}"/>`).join("") + d.rect(-40, 552, 1040, 16, { f: "surface", r: 0, sh: false });
    const near = d.rect(-300, 990, 1560, 90, { f: "ink", op: 0.1, sh: false, st: false, r: 0 });
    return done(far, mid, near, [
      named(d, "plane", d.rect(380, 260, 330, 66, { f: "surface", r: 33 }) + d.path("M560,262 L520,170 L570,170 L640,262 Z", { f: "accent" }) + d.path("M430,320 L400,372 L450,372 L500,326 Z", { f: "accent" }) + [0, 1, 2, 3, 4, 5].map((i) => d.circle(430 + i * 36, 292, 8, { f: "accent3", sh: false, st: false })).join("") + d.path("M690,262 q30,10 24,34 L690,296 Z", { f: "accent" }), { x: 380, y: 170, w: 330, h: 205 }),
      named(d, "gate-sign", d.rect(60, 20, 260, 84, { f: "warn", r: 18 }) + d.text(190, 82, "GATE 7", { size: 44, f: "ink", font: "display", weight: 900 }), { x: 60, y: 20, w: 260, h: 84 }),
      named(d, "board", d.rect(660, 40, 260, 100, { f: "ink", r: 14 }) + [0, 1, 2].map((i) => d.rect(678, 58 + i * 26, 130, 12, { f: i === 1 ? "warn" : "good", r: 6, sh: false, st: false }) + d.rect(822, 58 + i * 26, 74, 12, { f: "muted", r: 6, sh: false, st: false })).join(""), { x: 660, y: 40, w: 260, h: 100 }),
      named(d, "desk", d.rect(60, 690, 400, 190, { f: "accent2", r: 16 }) + d.rect(50, 680, 420, 26, { f: "surface", r: 10, sh: false }) + d.rect(180, 580, 150, 100, { f: "ink", r: 10 }) + d.rect(192, 592, 126, 62, { f: "accent3", r: 6, sh: false }), { x: 50, y: 580, w: 420, h: 300 }),
      named(d, "luggage", d.rect(700, 740, 110, 150, { f: "accent", r: 18 }) + d.rect(730, 710, 50, 36, { f: "none", sh: false, extra: { stroke: d.col("ink"), "stroke-width": 8, rx: 10 } }) + d.rect(830, 780, 90, 110, { f: "accent2", r: 16 }) + d.circle(740, 906, 12, { f: "ink", sh: false }) + d.circle(780, 906, 12, { f: "ink", sh: false }), { x: 700, y: 710, w: 220, h: 210 }),
    ]);
  },
};

export const factoryLine = {
  id: "factory-line", name: "Factory line", about: "Conveyor belt with boxes, a robot arm, gears and chimneys: production, pipelines, steps in a process",
  build(d) {
    let far = d.rect(BL.x0, BL.y0, BL.x1 - BL.x0, FLOOR - BL.y0, { f: "wall", sh: false, st: false, r: 0 }) + d.rect(BL.x0, FLOOR, BL.x1 - BL.x0, BL.y1 - FLOOR, { f: "floor", sh: false, st: false, r: 0 });
    for (let i = 0; i < 4; i++) far += d.rect(-100 + i * 280, 160, 200, 300, { f: "surface2", r: 10, sh: false, op: 0.6 }) + d.path(`M${-100 + i * 280},160 L${100 + i * 280 - 100},90 L${100 + i * 280 + 100},160 Z`, { f: "surface2", sh: false, op: 0.6 });
    const smoke = [0, 1, 2].map((i) => d.circle(780 + i * 24, 120 - i * 50, 34 + i * 10, { f: "surface", op: 0.55, sh: false, st: false })).join("");
    const mid = d.rect(-300, 740, 1560, 56, { f: "ink", r: 28 }) + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => d.circle(-240 + i * 120, 768, 20, { f: "muted", sh: false })).join("");
    const near = d.rect(-300, 960, 1560, 120, { f: "warn", op: 0.5, sh: false, st: false, r: 0 });
    return done(far, mid + smoke, near, [
      named(d, "conveyor", "", { x: -40, y: 740, w: 1040, h: 56 }),
      named(d, "box", d.rect(120, 650, 100, 90, { f: "warn", r: 10 }) + d.rect(150, 650, 40, 90, { f: "surface", sh: false, op: 0.5 }) + d.rect(380, 650, 100, 90, { f: "warn", r: 10 }) + d.rect(410, 650, 40, 90, { f: "surface", sh: false, op: 0.5 }), { x: 120, y: 650, w: 360, h: 90 }),
      named(d, "arm", d.rect(740, 700, 120, 40, { f: "muted", r: 10 }) + d.rect(784, 520, 34, 190, { f: "accent", r: 14 }) + d.path("M800,530 L650,470", { f: "none", sh: false, extra: { stroke: d.col("accent"), "stroke-width": 30, "stroke-linecap": "round" } }) + d.circle(800, 530, 26, { f: "ink" }) + d.path("M650,470 l-30,-20 m30,20 l-34,10", { f: "none", sh: false, extra: { stroke: d.col("ink"), "stroke-width": 12, "stroke-linecap": "round" } }), { x: 610, y: 440, w: 260, h: 300 }),
      named(d, "gear", d.circle(120, 520, 70, { f: "muted" }) + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="108" y="438" width="24" height="26" fill="${d.col("muted")}" transform="rotate(${i * 45} 120 520)"/>`).join("") + d.circle(120, 520, 26, { f: "surface2", sh: false }), { x: 40, y: 430, w: 160, h: 180 }),
      named(d, "chimney", d.rect(740, 160, 70, 300, { f: "accent2", r: 10 }) + d.rect(730, 150, 90, 24, { f: "ink", r: 8, sh: false }), { x: 730, y: 150, w: 90, h: 310 }),
    ]);
  },
};

export const dataCenter = {
  id: "data-center", name: "Data center", about: "Cloud facility seen from outside: louvered hall, rooftop fans, satellite dish, pylons and clouds (cloud, hosting, scale)",
  build(d) {
    const far = d.rect(BL.x0, BL.y0, BL.x1 - BL.x0, FLOOR - BL.y0, { f: lt(d, "accent3", 0.55), sh: false, st: false, r: 0, op: 0.4 }) + d.rect(BL.x0, FLOOR, BL.x1 - BL.x0, BL.y1 - FLOOR, { f: "floor", sh: false, st: false, r: 0 }) + cloud(d, 150, 160, 1.3) + cloud(d, 620, 100, 1) + cloud(d, 900, 240, 1.2);
    let hall = d.rect(-100, 480, 1160, 400, { f: "surface", r: 14 });
    for (let i = 0; i < 12; i++) hall += d.rect(-60 + i * 94, 530, 66, 290, { f: "surface2", r: 10, sh: false });
    for (let i = 0; i < 12; i++) hall += d.circle(-27 + i * 94, 860, 6, { f: i % 3 === 0 ? "good" : "accent", sh: false, st: false });
    const mid = hall + d.rect(-100, 470, 1160, 26, { f: "muted", r: 0, sh: false }) + d.rect(780, 640, 100, 240, { f: "ink", r: 10, op: 0.8 });
    const near = d.rect(40, 940, 40, 150, { f: "ink", sh: false, op: 0.6 }) + d.rect(880, 940, 40, 150, { f: "ink", sh: false, op: 0.6 });
    const fan = (cx) => d.rect(cx - 58, 400, 116, 76, { f: "muted", r: 10 }) + d.circle(cx, 400, 44, { f: "ink" }) + [0, 1, 2].map((i) => `<ellipse cx="${cx}" cy="${400 - 22}" rx="10" ry="22" fill="${d.col("accent3")}" transform="rotate(${i * 120} ${cx} 400)"/>`).join("");
    return done(far, mid, near, [
      named(d, "building", "", { x: -100, y: 470, w: 1160, h: 410 }),
      named(d, "fan", fan(260) + fan(440), { x: 190, y: 340, w: 330, h: 140 }),
      named(d, "dish", d.path("M700,400 q-80,10 -100,-80 q80,-10 100,80 Z", { f: "surface" }) + d.rect(692, 400, 12, 80, { f: "muted", sh: false }) + d.path("M650,350 l50,-40", { f: "none", sh: false, extra: { stroke: d.col("accent"), "stroke-width": 8, "stroke-linecap": "round" } }), { x: 600, y: 300, w: 120, h: 180 }),
      named(d, "cloud", cloud(d, 480, 250, 1.8, "surface") + d.text(480, 262, "NUBE", { size: 48, f: "accent", font: "display", weight: 900 }), { x: 340, y: 130, w: 280, h: 160 }),
      named(d, "pylon", d.path("M860,470 L900,470 L930,880 L830,880 Z", { f: "none", sh: false, extra: { stroke: d.col("ink"), "stroke-width": 8 } }) + d.rect(820, 520, 150, 8, { f: "ink", sh: false }) + d.rect(836, 600, 118, 8, { f: "ink", sh: false }), { x: 820, y: 470, w: 150, h: 410 }),
    ]);
  },
};

export const serverRoom = {
  id: "server-room", name: "Server room", about: "Dark hall of server racks with blinking LEDs, cable trays and a cooling unit (servers, networks, backends, hosting)",
  build(d) {
    const far = wallFloor(d, FLOOR, { wall: "wall", floor: "floor" }) + tiles(d, FLOOR + 6, 1100, 90, "surface2", 0.3) + d.rect(BL.x0, 150, BL.x1 - BL.x0, 24, { f: "muted", sh: false, st: false, r: 0, op: 0.6 }) + d.rect(BL.x0, 200, BL.x1 - BL.x0, 14, { f: "muted", sh: false, st: false, r: 0, op: 0.4 });
    const rack = (x, y, w, h, seed) => {
      const r = mulberry32(seed);
      let s = d.rect(x, y, w, h, { f: "ink", r: 12 });
      for (let i = 0; i < Math.floor(h / 54); i++) s += d.rect(x + 12, y + 14 + i * 54, w - 24, 40, { f: "wall", r: 6, sh: false, st: false }) + d.circle(x + 32, y + 34 + i * 54, 6, { f: r() > 0.3 ? "good" : "warn", sh: false, st: false }) + d.circle(x + 54, y + 34 + i * 54, 6, { f: r() > 0.5 ? "accent3" : "bad", sh: false, st: false }) + d.rect(x + w - 74, y + 28 + i * 54, 50, 10, { f: "muted", r: 5, sh: false, st: false });
      return s;
    };
    const mid = rack(-70, 300, 180, 580, 1) + rack(130, 360, 150, 520, 2) + rack(690, 360, 150, 520, 3) + rack(860, 300, 180, 580, 4);
    const near = `<path d="M60 ${-20} Q 60 300 120 520" fill="none" stroke="${d.col("accent")}" stroke-width="12" opacity=".8"/><path d="M880 ${-20} Q 900 300 830 560" fill="none" stroke="${d.col("accent3")}" stroke-width="12" opacity=".8"/>`;
    return done(far, mid, near, [
      named(d, "rack-left", "", { x: 130, y: 360, w: 150, h: 520 }),
      named(d, "rack-right", "", { x: 690, y: 360, w: 150, h: 520 }),
      named(d, "cooling", d.rect(340, 600, 280, 280, { f: "surface2", r: 18 }) + d.circle(480, 740, 90, { f: "ink" }) + [0, 1, 2, 3].map((i) => `<ellipse cx="480" cy="${740 - 38}" rx="18" ry="40" fill="${d.col("accent3")}" transform="rotate(${i * 90} 480 740)"/>`).join(""), { x: 340, y: 600, w: 280, h: 280 }),
      named(d, "cables", "", { x: 40, y: 100, w: 880, h: 120 }),
      named(d, "door", d.rect(400, 330, 160, 260, { f: "muted", r: 14 }) + d.rect(420, 350, 120, 100, { f: "ink", r: 8, sh: false }) + d.circle(540, 480, 10, { f: "warn", sh: false }), { x: 400, y: 330, w: 160, h: 260 }),
    ]);
  },
};
export { W };
