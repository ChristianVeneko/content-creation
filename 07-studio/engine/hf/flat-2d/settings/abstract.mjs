// Abstract settings: the "void" stage (diagrams, data, concepts) and the phone UI backdrop (apps, social).
import { W, FLOOR, BL, wallFloor, named, lt } from "./common.mjs";
import { mulberry32 } from "../util.mjs";

const done = (far, mid, near, parts) => ({ far, mid: mid + parts.map((p) => p.svg).join(""), near, props: Object.fromEntries(parts.map((p) => [p.name, { ...p.box, about: p.about || p.name }])) });

export const voidStage = {
  id: "void", name: "Void stage", about: "Abstract stage with a soft floor, grid and floating shapes: concepts, diagrams, data and metaphors with no fixed place",
  build(d) {
    const r = mulberry32(5);
    let far = d.rect(BL.x0, BL.y0, BL.x1 - BL.x0, FLOOR - BL.y0, { f: "wall", sh: false, st: false, r: 0, op: 0.7 }) + d.rect(BL.x0, FLOOR, BL.x1 - BL.x0, BL.y1 - FLOOR, { f: "floor", sh: false, st: false, r: 0 });
    for (let i = -6; i < 14; i++) far += `<line x1="${i * 120}" y1="${FLOOR}" x2="${480 + (i * 120 - 480) * 2.4}" y2="1400" stroke="${d.col("muted")}" stroke-width="3" opacity=".25"/>`;
    for (let j = 0; j < 4; j++) far += `<line x1="${BL.x0}" x2="${BL.x1}" y1="${FLOOR + 30 + j * j * 26}" y2="${FLOOR + 30 + j * j * 26}" stroke="${d.col("muted")}" stroke-width="3" opacity=".25"/>`;
    let mid = "";
    const roles = ["accent", "accent2", "accent3"];
    for (let i = 0; i < 9; i++) mid += d.circle(-40 + r() * 1040, 80 + r() * 700, 10 + r() * 22, { f: roles[i % 3], sh: false, st: false, op: 0.35 });
    const near = d.circle(60, 990, 60, { f: "accent2", op: 0.4, sh: false, st: false }) + d.circle(900, 1010, 80, { f: "accent", op: 0.35, sh: false, st: false });
    return done(far, mid, near, [
      named(d, "orb", d.circle(480, 700, 70, { f: "accent" }) + d.circle(458, 676, 22, { f: "surface", sh: false, st: false, op: 0.5 }), { x: 410, y: 630, w: 140, h: 140 }),
      named(d, "ring", `<circle cx="760" cy="640" r="80" fill="none" stroke="${d.col("accent2")}" stroke-width="14"/>`, { x: 680, y: 560, w: 160, h: 160 }),
      named(d, "grid", "", { x: 0, y: 880, w: 960, h: 160 }),
    ]);
  },
};

export const phoneUi = {
  id: "phone-ui", name: "Phone UI world", about: "A big abstract app backdrop with skeleton cards, avatars and a status bar: social media, apps, notifications",
  build(d) {
    const far = d.rect(BL.x0, BL.y0, BL.x1 - BL.x0, BL.y1 - BL.y0, { f: "wall", sh: false, st: false, r: 0 }) + d.circle(120, 160, 260, { f: "accent2", op: 0.18, sh: false, st: false }) + d.circle(880, 760, 320, { f: "accent", op: 0.16, sh: false, st: false });
    let mid = "";
    for (let i = 0; i < 4; i++) {
      const y = 560 + i * 120;
      mid += d.rect(80, y, 800, 100, { f: "surface", r: 28, op: 0.9 }) + d.circle(140, y + 50, 30, { f: ["accent", "accent2", "accent3", "good"][i], sh: false }) + d.rect(190, y + 26, 300, 16, { f: "muted", r: 8, sh: false, op: 0.55 }) + d.rect(190, y + 58, 200, 14, { f: "muted", r: 7, sh: false, op: 0.3 });
    }
    const near = d.circle(900, 980, 44, { f: "bad", sh: false, st: false, op: 0.8 }) + d.circle(60, 940, 28, { f: "warn", sh: false, st: false, op: 0.8 });
    return done(far, mid, near, [
      named(d, "avatar", d.circle(120, 150, 60, { f: "accent" }) + d.circle(120, 134, 22, { f: "surface", sh: false }) + d.path("M76,194 q44,-52 88,0 Z", { f: "surface", sh: false }), { x: 60, y: 90, w: 120, h: 120 }),
      named(d, "card1", "", { x: 80, y: 560, w: 800, h: 100 }),
      named(d, "card2", "", { x: 80, y: 680, w: 800, h: 100 }),
      named(d, "card3", "", { x: 80, y: 800, w: 800, h: 100 }),
    ]);
  },
};
export { W, lt };
