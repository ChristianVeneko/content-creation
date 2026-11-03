// Tech-oriented settings (phone home screen, cloud, cafe, wifi tower, app store, vault, helpdesk, hardware lab).
// Same contract as the other settings: 3 depth layers, named props in stage coordinates, roles only. Upper area
// (y 100-620) stays free for replicas; decor lives on the sides and the lower half.
import { FLOOR, BL, wallFloor, tiles, windowFrame, plant, lamp, clock, cloud, building, named, lt, checker } from "./common.mjs";
import { mulberry32 } from "../util.mjs";

const done = (far, mid, near, parts) => ({ far, mid: mid + parts.map((p) => p.svg).join(""), near, props: Object.fromEntries(parts.map((p) => [p.name, { ...p.box, about: p.about || p.name }])) });
const full = (d, y0, y1, f, o = {}) => d.rect(BL.x0, y0, BL.x1 - BL.x0, y1 - y0, { f, sh: false, st: false, r: 0, ...o });
const ROLES = ["accent", "accent2", "accent3", "good", "warn", "bad"];

const appIcon = (d, x, y, s, f, glyph) => d.rect(x, y, s, s, { f, r: s * 0.26 }) + glyph(x, y, s);
const dotGlyph = (d) => (x, y, s) => d.circle(x + s / 2, y + s / 2, s * 0.2, { f: "surface", sh: false, st: false, op: 0.9 });
const barGlyph = (d) => (x, y, s) => d.rect(x + s * 0.24, y + s * 0.4, s * 0.52, s * 0.2, { f: "surface", r: 6, sh: false, st: false, op: 0.9 });

export const phoneHome = {
  id: "phone-home", name: "Phone home screen", about: "Phone wallpaper with a status bar, widgets, an app-icon grid and a dock: apps, notifications, screen time, mobile habits",
  topics: ["apps", "mobile", "notifications", "screen time", "social media"],
  build(d) {
    const far = full(d, BL.y0, BL.y1, "wall") + d.circle(80, 220, 330, { f: "accent2", op: 0.2, sh: false, st: false }) + d.circle(900, 640, 380, { f: "accent", op: 0.16, sh: false, st: false }) + d.circle(500, 1040, 300, { f: "accent3", op: 0.18, sh: false, st: false });
    const status = d.rect(0, 0, 960, 56, { f: "surface2", r: 0, sh: false, st: false, op: 0.5 }) + d.text(80, 40, "9:41", { size: 30, f: "ink", font: "display", weight: 800 }) + d.rect(780, 20, 40, 20, { f: "ink", r: 4, sh: false, st: false }) + d.rect(836, 20, 60, 24, { f: "good", r: 8, sh: false, st: false });
    let mid = status;
    const gl = [dotGlyph(d), barGlyph(d)];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) mid += appIcon(d, 90 + c * 200, 650 + r * 130, 100, ROLES[(r * 4 + c) % ROLES.length], gl[(r + c) % 2]);
    const near = d.rect(60, 960, 840, 130, { f: "surface", r: 50, op: 0.85 }) + [0, 1, 2, 3].map((i) => appIcon(d, 110 + i * 200, 976, 96, ROLES[(i + 2) % ROLES.length], dotGlyph(d))).join("");
    return done(far, mid, near, [
      named(d, "status-bar", "", { x: 0, y: 0, w: 960, h: 56 }),
      named(d, "app-grid", "", { x: 90, y: 650, w: 780, h: 360 }),
      named(d, "dock", "", { x: 60, y: 960, w: 840, h: 130 }),
      named(d, "widget", d.rect(690, 110, 230, 200, { f: "surface", r: 36 }) + d.circle(805, 190, 46, { f: "warn", sh: false }) + d.rect(750, 256, 110, 14, { f: "muted", r: 7, sh: false, op: 0.5 }), { x: 690, y: 110, w: 230, h: 200 }),
      named(d, "badge", d.circle(880, 640, 26, { f: "bad" }) + d.text(880, 650, "3", { size: 30, f: "surface", font: "display", weight: 800 }), { x: 850, y: 612, w: 60, h: 60 }),
    ]);
  },
};

export const cloudSky = {
  id: "cloud-sky", name: "Cloud and sky", about: "Open sky with clouds, a floating server platform and data streams: cloud storage, SaaS, backups, streaming, remote access",
  topics: ["cloud", "storage", "backup", "saas", "streaming", "internet"],
  build(d) {
    const far = full(d, BL.y0, BL.y1, lt(d, "accent3", 0.62)) + full(d, 700, BL.y1, lt(d, "accent3", 0.4), { op: 0.7 }) + d.circle(820, 130, 70, { f: "warn", op: 0.85, sh: false, st: false }) + cloud(d, 180, 200, 1.6) + cloud(d, 760, 330, 1.3) + cloud(d, 480, 90, 1);
    const mid = cloud(d, 90, 760, 2.2) + cloud(d, 850, 840, 2.4) + d.rect(250, 800, 460, 30, { f: "surface", r: 16, op: 0.95 }) + [0, 1, 2].map((i) => d.rect(290 + i * 140, 690, 110, 110, { f: "ink", r: 14 }) + d.circle(318 + i * 140, 720, 7, { f: "good", sh: false, st: false }) + d.circle(342 + i * 140, 720, 7, { f: "accent3", sh: false, st: false }) + d.rect(300 + i * 140, 746, 90, 12, { f: "wall", r: 5, sh: false, st: false, op: 0.8 }) + d.rect(300 + i * 140, 770, 90, 12, { f: "wall", r: 5, sh: false, st: false, op: 0.8 })).join("");
    const near = cloud(d, 20, 1000, 2.8) + cloud(d, 940, 1010, 2.6) + [0, 1, 2, 3].map((i) => d.circle(150 + i * 220, 600 + (i % 2) * 40, 7, { f: "surface", op: 0.8, sh: false, st: false })).join("");
    return done(far, mid, near, [
      named(d, "server-stack", "", { x: 280, y: 680, w: 440, h: 160 }),
      named(d, "platform", "", { x: 250, y: 800, w: 460, h: 36 }),
      named(d, "cloud-left", "", { x: 20, y: 640, w: 330, h: 200 }),
      named(d, "cloud-right", "", { x: 700, y: 720, w: 330, h: 190 }),
      named(d, "sun", "", { x: 750, y: 60, w: 140, h: 140 }),
    ]);
  },
};

export const cafeLaptops = {
  id: "cafe-laptops", name: "Cafe with laptops", about: "Coffee shop with a counter, a window, menu board and tables with open laptops: public wifi, remote work, freelancers, coffee-shop scams",
  topics: ["public wifi", "remote work", "freelance", "coffee", "security"],
  build(d) {
    const far = wallFloor(d, FLOOR, { wall: "wall", floor: "floor" }) + windowFrame(d, 40, 100, 260, 300, { sun: true }) + d.rect(640, 100, 270, 190, { f: "ink", r: 14, op: 0.9 }) + d.text(775, 150, "MENU", { size: 36, f: "surface", font: "display", weight: 800 }) + [0, 1, 2].map((i) => d.rect(670, 176 + i * 36, 130 + (i % 2) * 40, 12, { f: "surface", r: 6, sh: false, st: false, op: 0.6 })).join("");
    const laptop = (x, y, f) => d.rect(x, y, 150, 96, { f: "ink", r: 10 }) + d.rect(x + 12, y + 12, 126, 72, { f, r: 6, sh: false, st: false }) + d.path(`M${x - 18},${y + 96} L${x + 168},${y + 96} L${x + 150},${y + 112} L${x},${y + 112} Z`, { f: "muted", sh: false });
    const table = (x) => d.rect(x, 760, 280, 22, { f: "warn", r: 8 }) + d.rect(x + 130, 782, 20, 100, { f: "muted", r: 6, sh: false }) + d.ellipse(x + 140, 884, 80, 14, { f: "muted", sh: false });
    const mid = table(60) + laptop(120, 640, "accent3") + d.rect(240, 722, 36, 38, { f: "surface", r: 8 }) + table(620) + laptop(690, 640, "accent2") + d.rect(560, 726, 34, 34, { f: "surface", r: 8 });
    const near = d.rect(-60, 800, 150, 24, { f: "warn", r: 8, sh: false, op: 0.0 }) + plant(d, 920, 1040, 1.4) + lamp(d, 30, 1040, 1);
    return done(far, mid, near, [
      named(d, "window", "", { x: 40, y: 100, w: 260, h: 300 }),
      named(d, "menu-board", "", { x: 640, y: 100, w: 270, h: 190 }),
      named(d, "table-left", "", { x: 60, y: 640, w: 280, h: 250 }),
      named(d, "table-right", "", { x: 620, y: 640, w: 280, h: 250 }),
      named(d, "laptop", "", { x: 120, y: 640, w: 150, h: 112 }),
      named(d, "coffee", d.rect(420, 700, 60, 60, { f: "accent", r: 14 }) + d.path("M480,714 q26,0 26,18 q0,18 -26,18", { f: "none", sh: false, extra: { stroke: d.col("accent"), "stroke-width": 8 } }) + d.rect(404, 760, 92, 10, { f: "muted", r: 5, sh: false }), { x: 400, y: 690, w: 110, h: 80 }),
    ]);
  },
};

export const wifiStreet = {
  id: "wifi-street", name: "Wifi tower street", about: "Street with a tall antenna tower sending signal arcs, houses, a lamp post and a street cabinet: wifi, mobile coverage, 5G, internet providers",
  topics: ["wifi", "coverage", "5g", "internet provider", "signal"],
  build(d) {
    const r = mulberry32(21);
    let sk = "";
    for (let i = 0; i < 8; i++) sk += building(d, -280 + i * 180, 360 - r() * 130, 130, 480, i % 2 ? "surface2" : "wall", 6, 2, 11 + i);
    const far = full(d, BL.y0, 820, lt(d, "accent3", 0.6), { op: 0.5 }) + cloud(d, 220, 150, 1.2) + cloud(d, 700, 80, 0.9) + sk;
    const mid = full(d, 820, 900, "surface2") + full(d, 900, BL.y1, "floor") + [0, 1, 2, 3, 4].map((i) => d.rect(-90 + i * 260, 990, 130, 12, { f: "warn", r: 6, sh: false, st: false })).join("");
    const house = (x, f) => d.rect(x, 700, 170, 180, { f: "surface" }) + d.path(`M${x - 14},702 L${x + 85},620 L${x + 184},702 Z`, { f }) + d.rect(x + 62, 780, 46, 100, { f: "ink", op: 0.7, sh: false, st: false }) + d.rect(x + 16, 730, 34, 34, { f: lt(d, "accent3", 0.5), r: 6, sh: false });
    const tower = d.path("M780,880 L830,260 L880,880 Z", { f: "muted" }) + [0, 1, 2, 3, 4, 5].map((i) => `<line x1="${792 + i * 6}" y1="${860 - i * 100}" x2="${868 - i * 6}" y2="${760 - i * 100}" stroke="${d.col("surface")}" stroke-width="6" opacity=".9"/>`).join("") + d.circle(830, 250, 24, { f: "bad" }) + [1, 2, 3].map((i) => `<path d="M${830 - i * 44} ${250 - i * 14} Q830 ${250 - i * 60} ${830 + i * 44} ${250 - i * 14}" fill="none" stroke="${d.col("accent")}" stroke-width="9" stroke-linecap="round" opacity="${(1 - i * 0.22).toFixed(2)}"/>`).join("");
    const near = d.rect(-60, 700, 24, 340, { f: "ink", r: 8, sh: false, op: 0.7 }) + d.rect(980, 700, 24, 340, { f: "ink", r: 8, sh: false, op: 0.7 }) + d.circle(-20, 700, 30, { f: "warn", op: 0.5, sh: false, st: false }) + d.circle(992, 700, 30, { f: "warn", op: 0.5, sh: false, st: false });
    return done(far, mid, near, [
      named(d, "tower", tower, { x: 760, y: 220, w: 140, h: 660 }),
      named(d, "signal", "", { x: 690, y: 160, w: 280, h: 130 }),
      named(d, "house-left", house(40, "bad"), { x: 26, y: 620, w: 200, h: 270 }),
      named(d, "house-mid", house(300, "accent2"), { x: 286, y: 620, w: 200, h: 270 }),
      named(d, "cabinet", d.rect(560, 790, 90, 100, { f: "accent3", r: 10 }) + d.circle(605, 830, 10, { f: "good", sh: false, st: false }) + d.rect(578, 856, 54, 8, { f: "ink", r: 4, sh: false, st: false, op: 0.6 }), { x: 560, y: 790, w: 90, h: 100 }),
    ]);
  },
};

export const appStore = {
  id: "app-store", name: "App store shelf", about: "Store with shelves of colourful app tiles, a price sign and a shopping basket: app stores, downloads, subscriptions, permissions, apps that spy",
  topics: ["apps", "downloads", "subscriptions", "permissions", "shopping"],
  build(d) {
    const far = wallFloor(d, FLOOR, { wall: "wall", floor: "floor" }) + d.rect(660, 22, 260, 66, { f: "accent", r: 18 }) + d.text(790, 70, "APPS", { size: 44, f: "surface", font: "display", weight: 900 });
    const r = mulberry32(31);
    const row = (y) => { let s = d.rect(40, y + 98, 880, 18, { f: "muted", r: 6, sh: false }); for (let i = 0; i < 8; i++) s += d.rect(60 + i * 108, y, 90, 90, { f: ROLES[Math.floor(r() * ROLES.length)], r: 22 }) + d.circle(105 + i * 108, y + 45, 16, { f: "surface", sh: false, st: false, op: 0.85 }); return s; };
    const mid = row(560) + row(700) + row(840) + d.rect(30, 540, 14, 410, { f: "muted", r: 6, sh: false }) + d.rect(916, 540, 14, 410, { f: "muted", r: 6, sh: false });
    const near = d.rect(-80, 980, 300, 70, { f: "warn", r: 24 }) + d.path("M60,980 q-20,-56 30,-56 q50,0 30,56", { f: "none", sh: false, extra: { stroke: d.col("warn"), "stroke-width": 10 } }) + plant(d, 930, 1040, 1.2);
    return done(far, mid, near, [
      named(d, "sign", "", { x: 660, y: 22, w: 260, h: 66 }),
      named(d, "shelf-top", "", { x: 40, y: 560, w: 880, h: 120 }),
      named(d, "shelf-mid", "", { x: 40, y: 700, w: 880, h: 120 }),
      named(d, "shelf-bottom", "", { x: 40, y: 840, w: 880, h: 120 }),
      named(d, "basket", "", { x: -60, y: 930, w: 280, h: 120 }),
    ]);
  },
};

export const vaultDoor = {
  id: "vault-door", name: "Vault and security door", about: "Steel wall with a round vault door, a keypad, a camera and laser beams: passwords, 2FA, encryption, hacking, access control, fraud",
  topics: ["passwords", "2fa", "encryption", "hacking", "security", "fraud"],
  build(d) {
    const far = full(d, BL.y0, FLOOR, "wall") + full(d, FLOOR, BL.y1, "floor") + tiles(d, 100, FLOOR, 120, "surface2", 0.25) + [0, 1, 2, 3, 4].map((i) => d.rect(-60 + i * 260, 120, 18, 760, { f: "surface2", sh: false, st: false, r: 0, op: 0.6 })).join("");
    const vault = d.circle(740, 700, 190, { f: "muted" }) + d.circle(740, 700, 150, { f: "surface2", sh: false }) + d.circle(740, 700, 44, { f: "ink" }) + [0, 1, 2, 3].map((i) => `<rect x="${740 - 9}" y="${700 - 140}" width="18" height="70" rx="8" fill="${d.col("muted")}" transform="rotate(${i * 90} 740 700)"/>`).join("") + d.circle(740, 700, 14, { f: "warn", sh: false, st: false });
    const keypad = d.rect(80, 560, 120, 180, { f: "ink", r: 16 }) + d.rect(96, 576, 88, 36, { f: "good", r: 8, sh: false, st: false, op: 0.85 }) + [0, 1, 2, 3, 4, 5].map((i) => d.circle(108 + (i % 3) * 30, 640 + Math.floor(i / 3) * 34, 10, { f: "surface", sh: false, st: false })).join("");
    const cam = d.path("M770,120 L890,150 L880,200 L760,170 Z", { f: "ink" }) + d.rect(850, 100, 14, 40, { f: "muted", r: 5, sh: false }) + d.circle(880, 176, 10, { f: "bad", sh: false, st: false });
    const mid = vault + keypad + cam;
    const near = [0, 1, 2].map((i) => `<line x1="-40" y1="${700 + i * 60}" x2="1000" y2="${660 + i * 80}" stroke="${d.col("bad")}" stroke-width="4" opacity=".5"/>`).join("");
    return done(far, mid, near, [
      named(d, "vault", "", { x: 550, y: 510, w: 380, h: 380 }),
      named(d, "keypad", "", { x: 80, y: 560, w: 120, h: 180 }),
      named(d, "camera", "", { x: 750, y: 100, w: 150, h: 120 }),
      named(d, "lasers", "", { x: 0, y: 650, w: 960, h: 200 }),
      named(d, "padlock", d.rect(300, 780, 90, 76, { f: "warn", r: 14 }) + d.path("M318,780 v-26 a27,27 0 0 1 54,0 v26", { f: "none", sh: false, extra: { stroke: d.col("muted"), "stroke-width": 12 } }) + d.circle(345, 818, 9, { f: "ink", sh: false, st: false }), { x: 300, y: 730, w: 90, h: 126 }),
    ]);
  },
};

export const helpdesk = {
  id: "helpdesk", name: "Helpdesk call centre", about: "Call centre with headset desks, monitors, a wall board and ticket notes: tech support, customer service, scams by phone, bots and tickets",
  topics: ["support", "customer service", "phone scams", "tickets", "chatbots"],
  build(d) {
    const far = wallFloor(d, FLOOR, { wall: "wall", floor: "floor" }) + d.rect(300, 90, 360, 220, { f: "ink", r: 14 }) + [0, 1, 2].map((i) => d.rect(326, 120 + i * 60, 308 - i * 60, 30, { f: ["good", "warn", "bad"][i], r: 10, sh: false, st: false, op: 0.85 })).join("") + clock(d, 820, 170, 52) + building(d, -250, 200, 150, 330, "surface2", 6, 2, 17);
    const desk = (x, f) => d.rect(x, 760, 340, 24, { f: "warn", r: 8 }) + d.rect(x + 20, 784, 16, 100, { f: "muted", r: 5, sh: false }) + d.rect(x + 304, 784, 16, 100, { f: "muted", r: 5, sh: false }) + d.rect(x + 100, 650, 140, 96, { f: "ink", r: 10 }) + d.rect(x + 112, 662, 116, 70, { f: f, r: 6, sh: false, st: false }) + d.rect(x + 160, 746, 20, 16, { f: "muted", r: 4, sh: false });
    const headset = (x) => d.path(`M${x},720 q0,-50 40,-50 q40,0 40,50`, { f: "none", sh: false, extra: { stroke: d.col("ink"), "stroke-width": 10, "stroke-linecap": "round" } }) + d.rect(x - 8, 712, 18, 34, { f: "accent", r: 8, sh: false }) + d.rect(x + 70, 712, 18, 34, { f: "accent", r: 8, sh: false });
    const mid = desk(-20, "accent3") + desk(640, "accent2") + headset(350) + d.rect(330, 764, 130, 10, { f: "surface2", r: 5, sh: false });
    const near = plant(d, 40, 1040, 1.4) + d.rect(840, 960, 160, 90, { f: "surface", r: 16, op: 0.0 });
    return done(far, mid, near, [
      named(d, "wallboard", "", { x: 300, y: 90, w: 360, h: 220 }),
      named(d, "desk-left", "", { x: -20, y: 650, w: 340, h: 240 }),
      named(d, "desk-right", "", { x: 640, y: 650, w: 340, h: 240 }),
      named(d, "headset", "", { x: 340, y: 660, w: 100, h: 100 }),
      named(d, "ticket", d.rect(700, 300, 120, 100, { f: "warn", r: 8 }) + d.rect(716, 322, 80, 10, { f: "ink", r: 5, sh: false, st: false, op: 0.5 }) + d.rect(716, 346, 60, 10, { f: "ink", r: 5, sh: false, st: false, op: 0.5 }), { x: 700, y: 300, w: 120, h: 100 }),
    ]);
  },
};

export const hardwareLab = {
  id: "hardware-lab", name: "Hardware lab", about: "Electronics bench with a circuit board, oscilloscope, soldering iron, chips and a parts drawer wall: chips, repairs, devices, hardware, IoT, how gadgets work",
  topics: ["hardware", "chips", "repairs", "devices", "iot", "electronics"],
  build(d) {
    const far = wallFloor(d, FLOOR, { wall: "wall", floor: "floor" }) + [0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => d.rect(30 + c * 76, 100 + r * 64, 66, 54, { f: "surface2", r: 8, sh: false }) + d.rect(52 + c * 76, 118 + r * 64, 22, 8, { f: "muted", r: 4, sh: false, st: false })).join("")).join("") + frame(d, 700, 100, 200, 140, "accent3");
    function frame(dd, x, y, w, h, f) { return dd.rect(x, y, w, h, { f: "surface", r: 10 }) + dd.rect(x + 12, y + 12, w - 24, h - 24, { f, r: 6, sh: false, st: false }) + `<path d="M${x + 24} ${y + h / 2} h30 l10 -30 l20 60 l16 -40 h${w - 140}" fill="none" stroke="${dd.col("surface")}" stroke-width="6" stroke-linecap="round"/>`; }
    const bench = d.rect(-30, 780, 1020, 26, { f: "warn", r: 8 }) + d.rect(40, 806, 20, 80, { f: "muted", r: 6, sh: false }) + d.rect(900, 806, 20, 80, { f: "muted", r: 6, sh: false });
    const pcb = d.rect(330, 740, 300, 40, { f: "good", r: 8 }) + [0, 1, 2, 3, 4].map((i) => d.rect(350 + i * 52, 726, 34, 14, { f: "ink", r: 3, sh: false, st: false })).join("") + d.rect(450, 700, 70, 40, { f: "ink", r: 6 }) + d.circle(580, 748, 7, { f: "warn", sh: false, st: false });
    const scope = d.rect(70, 650, 200, 130, { f: "ink", r: 14 }) + d.rect(86, 666, 130, 98, { f: "good", op: 0.8, r: 8, sh: false, st: false }) + `<path d="M92 716 q18 -40 36 0 t36 0 t36 0" fill="none" stroke="${d.col("ink")}" stroke-width="5" stroke-linecap="round"/>` + d.circle(244, 690, 10, { f: "warn", sh: false, st: false }) + d.circle(244, 730, 10, { f: "bad", sh: false, st: false });
    const iron = d.path("M700,780 L820,690", { f: "none", sh: false, extra: { stroke: d.col("muted"), "stroke-width": 16, "stroke-linecap": "round" } }) + d.path("M820,690 L860,660", { f: "none", sh: false, extra: { stroke: d.col("bad"), "stroke-width": 8, "stroke-linecap": "round" } });
    const mid = bench + scope + pcb + iron;
    const near = lamp(d, 900, 1040, 1.1) + d.rect(20, 960, 120, 90, { f: "accent", r: 14, op: 0.0 });
    return done(far, mid, near, [
      named(d, "drawers", "", { x: 30, y: 100, w: 380, h: 250 }),
      named(d, "scope", "", { x: 70, y: 650, w: 200, h: 130 }),
      named(d, "pcb", "", { x: 330, y: 700, w: 300, h: 80 }),
      named(d, "soldering", "", { x: 700, y: 660, w: 170, h: 130 }),
      named(d, "monitor-wall", "", { x: 700, y: 100, w: 200, h: 140 }),
    ]);
  },
};
export { checker };
