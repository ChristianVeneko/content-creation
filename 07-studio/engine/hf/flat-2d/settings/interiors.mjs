// Interior settings. Each build(d) returns { far, mid, near, props } as SVG strings in stage coordinates.
import { W, H, FLOOR, BL, wallFloor, tiles, checker, windowFrame, plant, lamp, clock, frame, shelf, deskTop, chair, monitor, named, lt, dk, building, cloud } from "./common.mjs";

const done = (far, mid, near, parts) => ({ far, mid: mid + parts.map((p) => p.svg).join(""), near, props: Object.fromEntries(parts.map((p) => [p.name, { ...p.box, about: p.about || p.name }])) });

export const desktopBrowser = {
  id: "desktop-browser", name: "Desktop and browser", about: "A desk with a big monitor, lamp and plant: the place for URLs, apps and websites",
  build(d) {
    const far = wallFloor(d, FLOOR) + tiles(d, 0, 400, 96, "surface2", 0.18) + windowFrame(d, -250, 200, 220, 280, { sun: true, cloud: true }) + cloud(d, 1100, 120, 1.1) + frame(d, 1010, 380, 150, 190, "accent");
    const mid = d.rect(100, 70, 760, 520, { f: "ink", r: 40 }) + d.rect(112, 82, 736, 496, { f: "surface2", r: 30, sh: false, st: false, op: 0.18 }) +
      d.rect(420, 590, 120, 120, { f: "muted", sh: false }) + d.rect(340, 700, 280, 20, { f: "muted", r: 10, sh: false }) + deskTop(d, -240, 718, 1440, 36);
    const near = plant(d, 20, 1010, 1.3) + d.ellipse(980, 1030, 220, 26, { f: "ink", op: 0.12, sh: false, st: false });
    return done(far, mid, near, [
      named(d, "lamp", lamp(d, 900, 724, 1), { x: 840, y: 520, w: 120, h: 210 }),
      named(d, "plant", plant(d, 70, 724, 0.8), { x: 20, y: 590, w: 100, h: 140 }),
      named(d, "mug", d.rect(150, 656, 56, 60, { f: "accent", r: 12 }) + d.path("M206,672 q26,0 26,20 q0,20 -26,20", { f: "none", st: true, sh: false, extra: { stroke: d.col("accent"), "stroke-width": 8 } }), { x: 150, y: 656, w: 90, h: 60 }),
      named(d, "keyboard", d.rect(300, 690, 360, 26, { f: "surface", r: 10, sh: false }), { x: 300, y: 690, w: 360, h: 26 }),
      named(d, "monitor", d.rect(104, 74, 752, 512, { f: "none", st: false, sh: false, extra: { "pointer-events": "none" } }), { x: 100, y: 70, w: 760, h: 520 }),
    ]);
  },
};

export const office = {
  id: "office", name: "Office", about: "Open office with a window, whiteboard, clock, desks and plants: work, teams, meetings",
  build(d) {
    const far = wallFloor(d, FLOOR) + windowFrame(d, 60, 90, 300, 330, { sun: true, cloud: true }) + building(d, -240, 210, 150, 330, "surface2", 6, 2) + frame(d, 700, 120, 170, 120, "accent2");
    const mid = d.rect(-300, 640, 1560, 18, { f: "surface2", sh: false, st: false, op: 0.6 }) + deskTop(d, -200, 740, 700, 30) + monitor(d, 40, 590, 190, 120, "accent3") + monitor(d, 290, 600, 160, 110, "accent2") + deskTop(d, 640, 750, 700, 30) + monitor(d, 780, 600, 180, 120, "accent");
    const near = chair(d, 100, 1040, 1.2, "accent2") + plant(d, 940, 1040, 1.3);
    return done(far, mid, near, [
      named(d, "whiteboard", d.rect(430, 100, 420, 270, { f: "surface", r: 12 }) + d.rect(450, 130, 160, 14, { f: "accent", r: 6, sh: false }) + d.rect(450, 170, 300, 14, { f: "muted", r: 6, sh: false, op: 0.6 }) + d.rect(450, 210, 240, 14, { f: "muted", r: 6, sh: false, op: 0.6 }) + d.circle(780, 300, 26, { f: "bad", sh: false }), { x: 430, y: 100, w: 420, h: 270 }),
      named(d, "clock", clock(d, 400, 140, 50), { x: 350, y: 90, w: 100, h: 100 }),
      named(d, "window", "", { x: 60, y: 90, w: 300, h: 330 }),
      named(d, "desk", "", { x: -200, y: 740, w: 700, h: 30 }),
      named(d, "plant", plant(d, 560, 744, 0.9), { x: 520, y: 600, w: 90, h: 150 }),
    ]);
  },
};

export const barbershop = {
  id: "barbershop", name: "Barbershop", about: "Barber shop interior: mirrors, chairs, pole, bottles on shelves, checker floor (local business, services)",
  build(d) {
    const far = wallFloor(d, FLOOR, { wall: "wall", floor: "surface2" }) + checker(d, FLOOR + 6, 9, 80, "surface", "ink") + d.rect(BL.x0, 560, BL.x1 - BL.x0, 24, { f: "accent", sh: false, st: false, r: 0 }) + d.rect(BL.x0, 584, BL.x1 - BL.x0, 14, { f: "surface", sh: false, st: false, r: 0 });
    const mid = d.rect(180, 120, 260, 380, { f: "surface2", r: 130 }) + d.rect(198, 138, 224, 344, { f: lt(d, "accent3", 0.6), r: 112, sh: false }) + d.rect(520, 120, 260, 380, { f: "surface2", r: 130 }) + d.rect(538, 138, 224, 344, { f: lt(d, "accent3", 0.6), r: 112, sh: false }) + shelf(d, 460, 640, 440, 7, 4) + d.rect(150, 600, 640, 16, { f: "muted", r: 6, sh: false });
    const near = d.rect(-300, 985, 1560, 120, { f: "ink", op: 0.1, sh: false, st: false, r: 0 });
    const stripes = [0, 1, 2, 3, 4, 5].map((i) => `<polygon points="${-30 + i * 26},${690 + i * 16} ${-4 + i * 26},${690 + i * 16} ${12 + i * 26},${720 + i * 16} ${-14 + i * 26},${720 + i * 16}" fill="${d.col(i % 2 ? "accent" : "accent2")}"/>`).join("");
    return done(far, mid, near, [
      named(d, "pole", d.rect(40, 540, 64, 330, { f: "surface", r: 30 }) + d.circle(72, 530, 40, { f: "bad" }) + d.circle(72, 880, 40, { f: "bad" }) + `<g clip-path="inset(0)">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="42" y="${580 + i * 38}" width="60" height="16" fill="${d.col(i % 2 ? "accent" : "accent2")}" transform="skewY(-18)" opacity=".9" transform-origin="72 ${590 + i * 38}"/>`).join("")}</g>`, { x: 30, y: 490, w: 90, h: 430 }),
      named(d, "mirror", "", { x: 180, y: 120, w: 600, h: 380 }),
      named(d, "chair", d.rect(215, 730, 100, 120, { f: "accent", r: 30 }) + d.rect(190, 830, 150, 40, { f: "accent", r: 14 }) + d.rect(255, 868, 20, 50, { f: "muted", sh: false }) + d.ellipse(265, 922, 70, 12, { f: "muted", sh: false }), { x: 190, y: 730, w: 150, h: 200 }),
      named(d, "shelf", "", { x: 460, y: 580, w: 440, h: 70 }),
      named(d, "sign", d.rect(360, 40, 240, 74, { f: "surface", r: 20 }) + d.path("M400,90 L420,64 L440,90 L460,64 L480,90", { f: "none", sh: false, extra: { stroke: d.col("accent"), "stroke-width": 8, "stroke-linejoin": "round", "stroke-linecap": "round" } }) + stripes.slice(0, 0), { x: 360, y: 40, w: 240, h: 74 }),
    ]);
  },
};

export const kitchen = {
  id: "kitchen", name: "Kitchen", about: "Home or restaurant kitchen: stove with pot, hood, fridge, counter and shelf (recipes, orders, food business)",
  build(d) {
    const far = wallFloor(d, FLOOR) + tiles(d, 330, 700, 64, "surface", 0.5) + windowFrame(d, 640, 120, 230, 200, { sun: true });
    const mid = d.rect(-300, 700, 1560, 180, { f: "surface2", r: 0 }) + d.rect(-300, 690, 1560, 22, { f: "surface", r: 0, sh: false }) + d.rect(60, 60, 360, 70, { f: "accent2", r: 10 }) + d.rect(60, 140, 360, 40, { f: "accent2", r: 10, op: 0 });
    const near = d.ellipse(480, 1050, 700, 30, { f: "ink", op: 0.1, sh: false, st: false });
    return done(far, mid, near, [
      named(d, "hood", d.path("M110,250 L370,250 L330,160 L150,160 Z", { f: "muted" }) + d.rect(180, 130, 120, 36, { f: "muted", sh: false }), { x: 110, y: 130, w: 260, h: 120 }),
      named(d, "stove", d.rect(100, 600, 280, 120, { f: "ink", r: 14 }) + d.rect(120, 620, 100, 14, { f: "muted", r: 6, sh: false }) + d.rect(250, 620, 100, 14, { f: "muted", r: 6, sh: false }) + d.circle(150, 690, 12, { f: "warn", sh: false }) + d.circle(230, 690, 12, { f: "warn", sh: false }), { x: 100, y: 600, w: 280, h: 120 }),
      named(d, "pot", d.rect(150, 540, 130, 70, { f: "accent", r: 12 }) + d.rect(136, 536, 158, 16, { f: "accent", r: 8 }) + d.path("M180,520 q12,-30 0,-60 M220,520 q12,-30 0,-60 M255,520 q12,-30 0,-60", { f: "none", sh: false, extra: { stroke: d.col("surface"), "stroke-width": 7, "stroke-linecap": "round", opacity: 0.8 } }), { x: 136, y: 440, w: 160, h: 170 }),
      named(d, "fridge", d.rect(740, 380, 210, 500, { f: "surface", r: 28 }) + d.rect(740, 560, 210, 8, { f: "muted", sh: false, st: false }) + d.rect(760, 430, 14, 90, { f: "muted", r: 7, sh: false }) + d.rect(760, 600, 14, 120, { f: "muted", r: 7, sh: false }), { x: 740, y: 380, w: 210, h: 500 }),
      named(d, "table", d.rect(440, 780, 240, 24, { f: "warn", r: 8 }) + d.rect(470, 804, 14, 90, { f: "muted", sh: false }) + d.rect(636, 804, 14, 90, { f: "muted", sh: false }) + d.circle(520, 764, 20, { f: "bad", sh: false }) + d.circle(560, 770, 14, { f: "good", sh: false }), { x: 440, y: 740, w: 240, h: 160 }),
      named(d, "shelf", shelf(d, 440, 330, 270, 5, 9), { x: 440, y: 270, w: 270, h: 70 }),
    ]);
  },
};

export const classroom = {
  id: "classroom", name: "Classroom", about: "School classroom: blackboard, desks, clock, globe and bell (learning, tutorials, training)",
  build(d) {
    const far = wallFloor(d, FLOOR, { floor: "floor" }) + tiles(d, FLOOR + 10, 1100, 90, "surface2", 0.25) + windowFrame(d, 760, 150, 220, 260, { sun: true }) + d.rect(BL.x0, 470, BL.x1 - BL.x0, 12, { f: "accent3", sh: false, st: false, r: 0 });
    const mid = d.rect(60, 90, 680, 330, { f: "muted", r: 20 }) + d.rect(78, 108, 644, 294, { f: "good", r: 12, sh: false }) + d.rect(78, 108, 644, 294, { f: "ink", op: 0.35, r: 12, sh: false, st: false }) + d.rect(100, 410, 600, 14, { f: "surface2", r: 6, sh: false });
    const near = d.rect(-80, 930, 360, 40, { f: "warn", r: 10 }) + d.rect(-40, 970, 14, 90, { f: "muted", sh: false }) + d.rect(660, 930, 360, 40, { f: "warn", r: 10 }) + d.rect(900, 970, 14, 90, { f: "muted", sh: false });
    return done(far, mid, near, [
      named(d, "blackboard", "", { x: 60, y: 90, w: 680, h: 330 }),
      named(d, "desk", d.rect(300, 790, 220, 24, { f: "warn", r: 8 }) + d.rect(320, 814, 14, 80, { f: "muted", sh: false }) + d.rect(490, 814, 14, 80, { f: "muted", sh: false }) + d.rect(320, 840, 120, 50, { f: "accent2", r: 10, sh: false }), { x: 300, y: 790, w: 220, h: 110 }),
      named(d, "clock", clock(d, 900, 90, 44), { x: 856, y: 46, w: 88, h: 88 }),
      named(d, "globe", d.circle(120, 640, 54, { f: "accent2" }) + d.path("M90,610 q20,-14 36,6 q-8,22 -30,16 Z M130,650 q20,-6 28,12 q-10,18 -26,6 Z", { f: "good", sh: false }) + d.rect(110, 692, 20, 40, { f: "muted", sh: false }) + d.rect(88, 728, 64, 12, { f: "muted", r: 6, sh: false }), { x: 66, y: 586, w: 108, h: 160 }),
      named(d, "bell", d.path("M700,700 q0,-60 50,-60 q50,0 50,60 l20,22 h-140 Z", { f: "warn" }) + d.circle(750, 736, 14, { f: "ink", sh: false }), { x: 680, y: 640, w: 140, h: 112 }),
    ]);
  },
};

export const bank = {
  id: "bank", name: "Bank", about: "Bank lobby: columns, a round vault door, teller counter, coins and ATM (money, security, finance)",
  build(d) {
    const far = wallFloor(d, FLOOR, { floor: "surface2", wall: "wall" }) + checker(d, FLOOR + 4, 8, 90, "surface", "surface2") + d.path(`M-300,110 L480,10 L1260,110 Z`, { f: "surface2", r: 0, sh: false });
    const mid = [0, 1, 2, 3].map((i) => d.rect(-130 + i * 330, 120, 74, 760, { f: "surface", r: 12, sh: false }) + d.rect(-142 + i * 330, 110, 98, 28, { f: "surface2", r: 8, sh: false }) + d.rect(-142 + i * 330, 860, 98, 28, { f: "surface2", r: 8, sh: false })).join("");
    const near = d.rect(-300, 990, 1560, 90, { f: "ink", op: 0.12, sh: false, st: false, r: 0 });
    return done(far, mid, near, [
      named(d, "vault", d.circle(660, 590, 170, { f: "muted" }) + d.circle(660, 590, 130, { f: "surface2", sh: false }) + [0, 1, 2, 3, 4, 5].map((i) => `<rect x="650" y="450" width="20" height="60" fill="${d.col("muted")}" transform="rotate(${i * 60} 660 590)"/>`).join("") + d.circle(660, 590, 36, { f: "warn" }), { x: 490, y: 420, w: 340, h: 340 }),
      named(d, "counter", d.rect(60, 700, 380, 180, { f: "accent2", r: 16 }) + d.rect(60, 690, 380, 26, { f: "surface", r: 10, sh: false }) + d.rect(80, 560, 340, 130, { f: lt(d, "accent3", 0.55), r: 14, sh: false, op: 0.7 }), { x: 60, y: 560, w: 380, h: 320 }),
      named(d, "sign", d.rect(260, 40, 440, 84, { f: "accent", r: 20 }) + d.text(480, 100, "BANCO", { size: 52, f: "surface", font: "display", weight: 900 }), { x: 260, y: 40, w: 440, h: 84 }),
      named(d, "columns", "", { x: -130, y: 120, w: 1000, h: 760 }),
      named(d, "atm", d.rect(800, 520, 150, 360, { f: "ink", r: 22 }) + d.rect(816, 540, 118, 90, { f: "good", r: 10, sh: false }) + d.rect(830, 680, 90, 14, { f: "warn", r: 6, sh: false }), { x: 800, y: 520, w: 150, h: 360 }),
    ]);
  },
};

export const hospital = {
  id: "hospital", name: "Hospital ward", about: "Hospital room: bed, vitals monitor, IV drip, curtain and a cross sign (health, checks, uptime)",
  build(d) {
    const far = wallFloor(d, FLOOR, { wall: "wall", floor: "surface2" }) + tiles(d, FLOOR + 10, 1100, 100, "surface", 0.5) + d.rect(BL.x0, 400, BL.x1 - BL.x0, 14, { f: "good", op: 0.5, sh: false, st: false, r: 0 });
    const mid = d.rect(500, 520, 340, 250, { f: "surface", r: 14 }) + [0, 1, 2, 3, 4, 5].map((i) => d.circle(-120 + i * 60, 160, 26, { f: "surface", sh: false, st: false, op: 0.9 })).join("");
    const near = d.rect(-300, 990, 1560, 90, { f: "ink", op: 0.1, sh: false, st: false, r: 0 });
    return done(far, mid, near, [
      named(d, "cross", d.rect(380, 70, 200, 200, { f: "surface", r: 30 }) + d.rect(448, 100, 64, 140, { f: "bad", r: 10, sh: false }) + d.rect(410, 138, 140, 64, { f: "bad", r: 10, sh: false }), { x: 380, y: 70, w: 200, h: 200 }),
      named(d, "bed", d.rect(480, 720, 380, 70, { f: "accent2", r: 20 }) + d.rect(480, 690, 380, 50, { f: "surface", r: 20 }) + d.ellipse(560, 686, 60, 26, { f: "surface2", sh: false }) + d.rect(470, 790, 14, 100, { f: "muted", sh: false }) + d.rect(856, 790, 14, 100, { f: "muted", sh: false }), { x: 470, y: 680, w: 400, h: 210 }),
      named(d, "monitor", d.rect(80, 520, 230, 170, { f: "ink", r: 16 }) + `<polyline points="96,610 140,610 156,570 176,654 196,590 216,610 296,610" fill="none" stroke="${d.col("good")}" stroke-width="7" stroke-linejoin="round"/>` + d.rect(176, 690, 28, 150, { f: "muted", sh: false }) + d.rect(130, 836, 120, 14, { f: "muted", r: 7, sh: false }), { x: 80, y: 520, w: 230, h: 330 }),
      named(d, "iv", d.rect(370, 540, 10, 340, { f: "muted", sh: false }) + d.rect(330, 536, 90, 10, { f: "muted", r: 5, sh: false }) + d.rect(340, 556, 60, 90, { f: "accent3", r: 16 }) + d.rect(366, 646, 8, 90, { f: "accent3", sh: false, op: 0.6 }) + d.ellipse(375, 882, 44, 10, { f: "muted", sh: false }), { x: 330, y: 536, w: 90, h: 360 }),
      named(d, "curtain", "", { x: -120, y: 100, w: 360, h: 120 }),
    ]);
  },
};

export const homeOffice = {
  id: "home-office", name: "Home office", about: "Cozy home corner: window with plants, bookshelf, desk with laptop, lamp and rug (freelancers, remote work)",
  build(d) {
    const far = wallFloor(d, FLOOR, { wall: "wall", floor: "floor" }) + windowFrame(d, 80, 110, 280, 330, { sun: true, cloud: true }) + d.rect(BL.x0, 520, BL.x1 - BL.x0, 10, { f: "surface2", sh: false, st: false, r: 0, op: 0.5 });
    const mid = d.rect(520, 140, 300, 20, { f: "muted", r: 8, sh: false }) + shelf(d, 530, 140, 290, 6, 11) + d.rect(520, 300, 300, 20, { f: "muted", r: 8, sh: false }) + shelf(d, 530, 300, 290, 5, 21) + d.ellipse(480, 960, 420, 70, { f: "accent2", op: 0.55, sh: false, st: false });
    const near = d.rect(-60, 930, 280, 130, { f: "accent", r: 50 }) + d.rect(760, 950, 300, 110, { f: "accent2", r: 44 });
    return done(far, mid, near, [
      named(d, "laptop", d.rect(300, 640, 250, 150, { f: "ink", r: 14 }) + d.rect(312, 652, 226, 126, { f: "accent3", r: 8, sh: false }) + d.path("M270,792 L580,792 L560,812 L290,812 Z", { f: "muted", sh: false }), { x: 270, y: 640, w: 310, h: 172 }),
      named(d, "shelf", "", { x: 520, y: 70, w: 300, h: 250 }),
      named(d, "window", "", { x: 80, y: 110, w: 280, h: 330 }),
      named(d, "lamp", lamp(d, 640, 810, 0.8), { x: 600, y: 640, w: 100, h: 180 }),
      named(d, "plant", plant(d, 120, 810, 1), { x: 70, y: 660, w: 110, h: 220 }),
      named(d, "desk", deskTop(d, 200, 800, 520, 34), { x: 200, y: 800, w: 520, h: 34 }),
    ]);
  },
};

export const store = {
  id: "store", name: "Store", about: "Shop interior: shelves with products, counter with register, hanging sign and baskets (retail, e-commerce, pricing)",
  build(d) {
    const far = wallFloor(d, FLOOR, { floor: "surface2" }) + checker(d, FLOOR + 4, 8, 100, "surface", "surface2");
    const mid = [0, 1, 2].map((i) => shelf(d, 70, 250 + i * 150, 330, 6, 31 + i)).join("") + [0, 1, 2].map((i) => shelf(d, 600, 250 + i * 150, 330, 6, 41 + i)).join("");
    const near = d.rect(-300, 990, 1560, 90, { f: "ink", op: 0.1, sh: false, st: false, r: 0 });
    return done(far, mid, near, [
      named(d, "sign", d.path("M360,60 L600,60 L600,150 L360,150 Z", { f: "accent", r: 12 }) + d.text(480, 125, "OFERTA", { size: 52, f: "surface", font: "display", weight: 900 }) + d.rect(468, 0, 8, 60, { f: "muted", sh: false }), { x: 360, y: 0, w: 240, h: 150 }),
      named(d, "counter", d.rect(300, 740, 360, 140, { f: "accent2", r: 14 }) + d.rect(290, 730, 380, 24, { f: "surface", r: 10, sh: false }), { x: 290, y: 730, w: 380, h: 150 }),
      named(d, "register", d.rect(400, 640, 150, 90, { f: "ink", r: 12 }) + d.rect(414, 654, 122, 36, { f: "good", r: 6, sh: false }) + d.rect(380, 726, 190, 14, { f: "muted", r: 6, sh: false }), { x: 380, y: 640, w: 190, h: 100 }),
      named(d, "shelf", "", { x: 70, y: 150, w: 860, h: 400 }),
      named(d, "basket", d.path("M80,820 L200,820 L184,900 L96,900 Z", { f: "warn" }) + d.circle(120, 800, 18, { f: "bad", sh: false }) + d.circle(160, 806, 14, { f: "good", sh: false }), { x: 80, y: 780, w: 120, h: 120 }),
    ]);
  },
};
export { H, W, dk, cloud, chair };
