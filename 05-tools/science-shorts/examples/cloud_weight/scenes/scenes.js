/* How heavy is a cloud? One function per shot in shots.json: S(t, T, sh). t = seconds into the shot, T = its length,
   sh.beats.<name> = seconds into the shot where that beat's word is spoken. Facts from sources.md. */
const F = Flat, C = F.PAL, B = (sh, k) => sh.beats[k];
// the 7:8 X cut: per-shot framing where the default (zoom 0.74, lift 40) isn't right
window.FIT78 = { S_title: { zoom: 0.68, lift: -60 }, S_falls: { lift: -70 }, S_rain: { zoom: 0.7, lift: 60 } };

// ---------------------------------------------------------------- backgrounds (one per kind of scene, top -> bottom)
const SKY = ["#1683f5", "#45b8ff", "#a8ecff"];
const NIGHT = ["#0d0a3a", "#1d1677", "#3a2bb0"];
const VIOLET = ["#2b1491", "#6a2ed8", "#b43fd6"];
const MAGENTA = ["#4a1aa8", "#9b2fc9", "#e0338f"];
const WARM = ["#ff7a1e", "#ffae2e", "#ffd94a"];
const TEAL = ["#0a3f8f", "#0f7fbf", "#16c2c8"];
const RAIN = ["#3e4f9e", "#6f86c9", "#a9c3e8"];
const SUNSET = ["#3a6cf0", "#ff9f5a", "#ffd36b"];

// ---------------------------------------------------------------- the cast and shared pieces
const ME = { skin: "#c98358", hair: "#2a1d4a", hairStyle: "curly", shirt: "#ff6b5b", pants: "#3b2f9a", shoes: "#1b1340" };
const isoPt = (x, y, a, i, j, k) => [x + (i - j) * a * 0.866, y - (i + j) * a * 0.5 - k * a];

/** A little water droplet as a plain shaded dot (cheap: hundreds per frame). */
function dot(x, y, r, c = C.water) {
  return F.el("circle", { cx: x, cy: y, r, fill: c }) + F.el("circle", { cx: x - r * 0.32, cy: y - r * 0.32, r: r * 0.32, fill: "#e6fbff", opacity: 0.85 });
}
/** An air molecule: two bonded balls (oxygen or nitrogen), turning slowly. */
function molecule(x, y, s, ang, c) {
  const dx = Math.cos(ang) * 11 * s, dy = Math.sin(ang) * 11 * s;
  return F.el("circle", { cx: x - dx, cy: y - dy, r: 12 * s, fill: c }) + F.el("circle", { cx: x + dx, cy: y + dy, r: 12 * s, fill: c })
    + F.el("circle", { cx: x - dx - 4 * s, cy: y - dy - 4 * s, r: 4 * s, fill: "#fff", opacity: 0.6 });
}
function molecules(n, box, t, seed, a = 0.9, s = 1) {
  const R = F.rng(seed); let out = "";
  const [x0, y0, w, h] = box;
  for (let i = 0; i < n; i++) {
    const bx = R() * w, by = R() * h, ph = R() * 6.28, sp = 20 + 30 * R();
    const x = x0 + ((bx + sp * Math.sin(t * 0.9 + ph) * 1.4) % w + w) % w, y = y0 + ((by + sp * Math.cos(t * 0.7 + ph)) % h + h) % h;
    out += F.g(molecule(x, y, s * (0.8 + 0.4 * R()), t * 1.3 + ph, R() > 0.78 ? "#ff8fb8" : "#cfe8ff"), { opacity: a });
  }
  return out;
}
/** Wavy warm-air arrow rising from (x, y0) to y1, drawn on with p. */
function warmArrow(x, y0, y1, p, t, w = 30, color = C.orange) {
  if (p <= 0) return "";
  const pts = [];
  for (let k = 0; k <= 8; k++) { const y = F.lerp(y0, y1, k / 8); pts.push([x + 28 * Math.sin(k * 1.3 + t * 3 + x), y]); }
  return F.arrow(pts, { p, w, color });
}
/** A drinking glass standing at (x, y) (its base), h tall. */
function glass(x, y, h, water) {
  const w0 = h * 0.42, w1 = h * 0.56;
  const d = F.P.poly([[x - w1 / 2, y - h], [x + w1 / 2, y - h], [x + w0 / 2, y], [x - w0 / 2, y]]);
  return F.shadow(x, y + 6, w0 * 0.75, 0.22) + F.el("path", { d, fill: "#ffffff", opacity: 0.22 }) + (water || "")
    + F.el("path", { d, fill: "none", stroke: "#fff", "stroke-width": 12, "stroke-linejoin": "round", opacity: 0.95 })
    + F.el("path", { d: `M${x - w1 / 2 + 34} ${y - h + 40}L${x - w0 / 2 + 30} ${y - 40}`, stroke: "#fff", "stroke-width": 14, "stroke-linecap": "round", opacity: 0.55 })
    + F.el("ellipse", { cx: x, cy: y - h, rx: w1 / 2, ry: 18, fill: "none", stroke: "#fff", "stroke-width": 10, opacity: 0.9 });
}
/** An umbrella held up at (x, y) (the handle's top), r wide. */
function umbrella(x, y, r, c = C.yellow) {
  const shape = `M${x - r} ${y}A${r} ${r * 0.82} 0 0 1 ${x + r} ${y}` + [3, 2, 1, 0].map((k) => { const a = x - r + (k + 1) * r / 2; return `Q${a - r / 4} ${y - 30} ${a - r / 2} ${y}`; }).join("") + "Z";
  return F.el("path", { d: `M${x} ${y - r * 0.82}V${y + 250}q0 40 -40 40`, stroke: C.ink, "stroke-width": 12, fill: "none", "stroke-linecap": "round" })
    + F.blob(shape, c, { k: 26, h: 9, light: -110 }) + F.el("path", { d: `M${x} ${y - r * 0.82}L${x - r * 0.5} ${y}M${x} ${y - r * 0.82}L${x + r * 0.5} ${y}`, stroke: F.shade(c, -0.25), "stroke-width": 6, fill: "none" });
}
/** Rain streaks falling inside box. */
function rain(box, t, n = 90, seed = 4, a = 0.75) {
  const R = F.rng(seed), [x0, y0, w, h] = box; let d = "";
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * w, sp = 1300 + 500 * R(), y = y0 + ((R() * h + sp * t) % h);
    d += `M${F.lerp(x, x - 16, 0).toFixed(1)} ${y.toFixed(1)}l-12 46`;
  }
  return F.el("path", { d, stroke: "#e8f6ff", "stroke-width": 7, "stroke-linecap": "round", opacity: a });
}
/** An elephant silhouette (for the x-ray through the cloud). */
const eleGhost = (x, y, s, a) => F.g(F.elephant(x, y, s, { color: "#7d74c9", flip: true }), { opacity: a });

// ---------------------------------------------------------------- 0. title card: the cloud carrying elephants
function S_title(t, T, sh) {
  const sag = F.prog(t, B(sh, "sag"), 0.5), worried = t > B(sh, "sag") + 0.15;
  const c = F.drift(t, T, [540, 980, 1.0], [540, 960, 1.07]);
  const cy = 820 + F.bob(t, 10, 0.5) + 50 * F.ease.back(sag, 2.5) * (sag > 0 ? 1 : 0);
  return F.frame(c, () => {
    const out = [F.sun(900, 600, 70, { t }), F.hills(1560, { colors: ["#8fe0a8", "#46c47f", "#23a165"] })];
    out.push(F.cloud(170, 640, 0.4, { t: t + 3, seed: 4, glow: false }), F.cloud(960, 1180, 0.32, { t: t + 7, seed: 9, glow: false }));
    // the elephants hang from strings under the cloud
    [[360, 0], [540, 1], [720, 2]].forEach(([x, i]) => {
      const p = F.pop(t, B(sh, "sag") + i * 0.12, 0.5);
      if (p <= 0) return;
      const top = [x, cy + 120], len = 230 * Math.min(1, p), sw = 7 * Math.sin(t * 2.3 + i * 1.7);
      const ex = top[0] + Math.sin(sw * Math.PI / 180) * len, ey = top[1] + Math.cos(sw * Math.PI / 180) * len;
      out.push(F.el("path", { d: `M${top[0]} ${top[1]}L${ex} ${ey}`, stroke: "#ffffff", "stroke-width": 5 }));
      out.push(F.at(ex, ey, 1, sw, F.elephant(0, 135, 0.5 * p, { t, flip: i === 0 })));
    });
    out.push(F.cloud(540, cy, 1.25, { t, face: true, mood: worried ? "worried" : "happy", look: worried ? [0, 1] : [0, 0] }));
    if (worried) out.push(F.drop(735, cy - 60 + 30 * F.prog(t, B(sh, "sag") + 0.4, 0.8), 16, { color: "#9fe6ff" }));
    return out;
  }, () => F.title([{ text: "This Cloud Weighs", size: 86 * F.U }], F.W / 2, F.H * 0.085, t, { t0: B(sh, "title") })
    + F.title([{ text: "100 Elephants!", size: 124 * F.U, fill: C.yellow }], F.W / 2, F.H * 0.085 + 96 * F.U, t, { t0: B(sh, "t2") }), SKY);
}

// ---------------------------------------------------------------- 1. "so how is it just hanging up there?"
function S_question(t, T, sh) {
  const c = F.drift(t, T, [540, 1180, 1.05], [540, 930, 0.92], F.ease.inout);
  return F.frame(c, () => [
    F.sun(180, 300, 70, { t }), F.cloud(620, 500, 1.0, { t, face: true, mood: "smile", look: [-0.3, 0.6] }),
    F.hills(1300, { colors: ["#8fe0a8", "#46c47f", "#23a165"], seed: 8 }),
    F.person(520, 1420, 0.8, Object.assign({ mood: "o", look: [0.3, -1], arms: [[18, 4], [150, 20]] }, ME)),
    F.bubble("?", 700, 930, 600, 1040, { p: F.pop(t, B(sh, "q")), size: 90 }),
  ], null, SKY);
}

// ---------------------------------------------------------------- 2. a cubic kilometer
function cubeScene(t, sh, opt) {
  const X = 540, Y = 1270, A = 420, P = (i, j, k) => isoPt(X, Y, A, i, j, k);
  const out = [F.dots(70, [-400, -200, 1900, 2300], t, { seed: 2, r: [2, 5], color: "#ffffff", a: 0.35, twinkle: true })];
  out.push(F.bokeh(7, [-200, 100, 1500, 1600], t, 31), F.glow(X, Y - A * 0.9, A * 1.5, "#7f8cff", 0.22));
  out.push(F.cube(X, Y, A, { p: opt.cube, color: "#ffffff", alpha: opt.alpha || 0.12, grid: opt.grid ? 10 : 0, gp: opt.grid }));
  out.push(F.cloud(X, Y - A * 1.0 + F.bob(t, 8, 0.5), 1.08, { t, face: opt.face !== false, mood: opt.mood || "smile", glow: true }));
  return { out, P, X, Y, A };
}
function S_cube(t, T, sh) {
  const c = F.drift(t, T, [540, 950, 1.0], [540, 920, 1.06]);
  return F.frame(c, () => {
    const q = cubeScene(t, sh, { cube: F.prog(t, B(sh, "cube"), 0.7) });
    const { out, P } = q;
    out.push(F.dimension(...P(0.06, 0, -0.1), ...P(1, 0, -0.1), "1 km", { p: F.prog(t, B(sh, "w"), 0.6), lx: 80, ly: 50 }));
    out.push(F.dimension(...P(1, 0, 0.02).map((v, i) => i ? v : v + 80), ...P(1, 0, 1).map((v, i) => i ? v : v + 80), "1 km", { p: F.prog(t, B(sh, "h"), 0.6), lx: 0 }));
    out.push(F.dimension(...P(0, 0.06, -0.1), ...P(0, 1, -0.1), "1 km", { p: F.prog(t, B(sh, "d"), 0.6), lx: -80, ly: 50 }));
    return out;
  }, null, NIGHT);
}

// ---------------------------------------------------------------- 3. one cubic meter: half a gram
function S_meter(t, T, sh) {
  const c = F.drift(t, T, [540, 940, 1.0], [540, 920, 1.05]);
  return F.frame(c, () => {
    const out = [F.cloud(230, 1290, 0.5, { t, glow: false })];
    const inner = () => {
      const s = [F.dots(40, [-330, -330, 660, 660], t, { seed: 5, r: [2, 4], color: "#ffffff", a: 0.25 })];
      s.push(F.cube(0, 150, 170, { color: "#ffffff", alpha: 0.18, edge: 6 }));
      const R = F.rng(21);
      for (let i = 0; i < 9; i++) {
        const x = -110 + R() * 220, y = -40 + R() * 180 - 160 * 0.5, ph = R() * 6;
        const glowk = F.prog(t, B(sh, "water"), 0.3) * Math.max(0, 1 - (t - B(sh, "water")) / 1.2);
        s.push(dot(x + 8 * Math.sin(t + ph), y + 6 * Math.cos(t * 0.8 + ph), 9 + 5 * glowk));
      }
      s.push(F.tag("1 m³", 0, -235, { raw: true, size: 58, p: F.pop(t, B(sh, "inset") + 0.25), rot: -3 }));
      return s;
    };
    out.push(F.inset(540, 800, 340, inner, { p: F.pop(t, B(sh, "inset"), 0.5), from: [300, 1220], ring: C.yellow, bg: "#1d1677" }));
    out.push(F.pill("just", 690, 1250, { p: F.pop(t, B(sh, "half")), sub: "½ gram of water", bg: C.deepwater, size: 46 }));
    return out;
  }, null, VIOLET);
}

// ---------------------------------------------------------------- 4. not even a sip
function S_sip(t, T, sh) {
  const c = F.drift(t, T, [540, 1000, 1.0], [540, 1040, 1.12]);
  return F.frame(c, () => {
    const k = F.prog(t, B(sh, "drop"), 0.35), y = F.lerp(560, 1255, F.ease.in(k));
    const landed = k >= 1;
    const water = landed ? F.el("ellipse", { cx: 540, cy: 1262, rx: 30, ry: 9, fill: C.water }) + dot(540, 1252, 9) : "";
    return [F.spot(540, 1000, 470, "#ffe36a", 0.5), glass(540, 1300, 560, water), landed ? "" : F.drop(540, y, 16),
      F.tag("Not even a sip", 540, 560, { p: F.pop(t, B(sh, "tag")), size: 66, rot: -4 })];
  }, null, WARM);
}

// ---------------------------------------------------------------- 5. a billion cubic meters
function S_billion(t, T, sh) {
  const c = F.drift(t, T, [540, 920, 0.94], [540, 900, 1.0]);
  return F.frame(c, () => {
    const q = cubeScene(t, sh, { cube: 1, grid: F.prog(t, B(sh, "grid"), 1.2), alpha: 0.14 });
    const n = 1e9 * F.ease.out(F.prog(t, B(sh, "count"), 1.0));
    q.out.push(F.counter(n, 540, 330, { p: F.pop(t, B(sh, "count")), size: 70, unit: "m³", minw: 600 }));
    return q.out;
  }, null, NIGHT);
}

// ---------------------------------------------------------------- 6. 500 tonnes
function S_tonnes(t, T, sh) {
  const c = F.shake(F.drift(t, T, [540, 960, 1.0], [540, 940, 1.06]), t, B(sh, "tag"), 16);
  return F.frame(c, () => {
    const grow = F.prog(t, 0, T * 0.9), r = 120 + 150 * F.ease.out(grow);
    const out = [F.bokeh(8, [-300, 0, 1700, 1900], t, 16), F.glow(540, 980, 520, "#9fe6ff", 0.35)];
    const R = F.rng(31);
    for (let i = 0; i < 70; i++) {                         // streams of droplets pouring into the big drop
      const a = R() * Math.PI * 2, d0 = 700 + 300 * R(), sp = 0.55 + 0.4 * R(), ph = R();
      const k = ((t * sp + ph) % 1), d = d0 * (1 - k);
      if (d < r * 0.9) continue;
      out.push(dot(540 + Math.cos(a) * d, 980 + Math.sin(a) * d * 1.1, 8 + 6 * R()));
    }
    out.push(F.drop(540, 1050, r, { face: true, mood: grow > 0.6 ? "shock" : "o" }));
    out.push(F.tag("500 tonnes", 540, 340, { p: F.pop(t, B(sh, "tag")), size: 88, rot: -5 }));
    return out;
  }, null, MAGENTA);
}

// ---------------------------------------------------------------- 7. floating over your head
function S_overhead(t, T, sh) {
  const c = F.drift(t, T, [540, 1180, 0.92], [540, 1060, 0.98], F.ease.inout);
  const flinch = t > B(sh, "head");
  return F.frame(c, () => [
    F.hills(1420, { colors: ["#46c47f", "#23a165", "#168a55"], seed: 12, trees: true }),
    F.cloud(540, 640, 2.15, { t, glow: true }),
    F.g(F.drop(540, 700, 150), { opacity: 0.55 }),
    F.pill("500 t", 540, 660, { p: F.pop(t, B(sh, "look")), bg: C.deepwater, size: 44 }),
    F.person(540, 1500, 0.62, Object.assign({ mood: flinch ? "shock" : "o", look: [0, -1], arms: flinch ? [[160, 30], [160, 30]] : [[14, 6], [14, 6]] }, ME)),
    flinch ? F.drop(650, 1135 + 40 * F.prog(t, B(sh, "head") + 0.2, 0.7), 12, { color: "#bff1ff" }) : "",
  ], null, ["#0f5fd8", "#2f9bff", "#8fdcff"]);
}

// ---------------------------------------------------------------- 8. why doesn't it fall? it does, slowly
function S_why(t, T, sh) {
  const zin = F.prog(t, B(sh, "slow"), 1.4);
  const c = F.drift(t, T, [540, 900, 1.0], [540, 880, 1.05]);
  const cc = { x: F.lerp(c.x, 540, zin), y: F.lerp(c.y, 860, zin), z: c.z * (1 + 0.3 * F.ease.inout(zin)), r: 0 };
  return F.frame(cc, () => {
    const out = [F.hills(1600, { colors: ["#8fe0a8", "#46c47f", "#23a165"], seed: 3 }), F.cloud(540, 860, 1.75, { t, face: !(t > B(sh, "cut")), mood: "o", look: [0, 1] })];
    out.push(F.bubble("?", 790, 470, 700, 640, { p: F.pop(t, B(sh, "q")) * (t > B(sh, "cut") ? 0 : 1), size: 90 }));
    const inner = () => {
      const s = [];
      const R = F.rng(9);
      for (let i = 0; i < 26; i++) {
        const x = -240 + R() * 480, y0 = -240 + R() * 480, ph = R() * 6;
        const y = ((y0 + 240 + 22 * t) % 480) - 240;
        s.push(dot(x + 6 * Math.sin(t * 1.3 + ph), y, 10));
        if (t > B(sh, "slow")) s.push(F.arrow([[x, y + 18], [x, y + 18 + 34 * F.prog(t, B(sh, "slow") + i * 0.01, 0.4)]], { w: 6, color: "#ffe36a", head: 16 }));
      }
      return s;
    };
    out.push(F.inset(540, 880, 215, inner, { p: F.pop(t, B(sh, "cut"), 0.5), ring: C.yellow, bg: "#2a63d8", w: 12 }));
    return out;
  }, null, SKY);
}

// ---------------------------------------------------------------- 9. split into droplets so tiny
function S_split(t, T, sh) {
  const ts = B(sh, "split"), dive = F.prog(t, B(sh, "tiny"), 1.0);
  const c = { x: F.lerp(540, 612, F.ease.inout(dive)), y: F.lerp(930, 868, F.ease.inout(dive)), z: 1.0 * Math.pow(5.5, F.ease.inout(dive)), r: 0 };
  return F.frame(c, () => {
    const out = [F.bokeh(8, [-300, 0, 1700, 1900], t, 6), F.dots(60, [-300, -100, 1700, 2100], t, { seed: 6, r: [1.5, 4], a: 0.35, twinkle: true })];
    const k = F.prog(t, ts, 0.9);
    if (k <= 0) { out.push(F.drop(540, 960, 200 * (1 + 0.04 * Math.sin(t * 9)))); return out; }
    const R = F.rng(41);
    for (let i = 0; i < 260; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 520, rr = 4 + 7 * R();
      const x = 540 + Math.cos(a) * d * F.ease.out(k), y = 960 + Math.sin(a) * d * F.ease.out(k) * 1.15 + 20 * Math.sin(t + i);
      out.push(dot(x, y, F.lerp(30, rr, F.ease.out(k))));
    }
    out.push(F.drop(612, 868, 9, { face: dive > 0.5, mood: "smile" }));
    return out;
  }, null, ["#0d0a3a", "#14206f", "#1b4fa8"]);
}

// ---------------------------------------------------------------- 10. a centimeter a second
function S_sink(t, T, sh) {
  const c = F.drift(t, T, [540, 940, 1.0], [540, 990, 1.04]);
  return F.frame(c, () => {
    const cm = 150, y0 = 640, y = y0 + cm * t;                 // 1 cm a second, a cm drawn 150 units tall
    const out = [F.bokeh(7, [-300, 0, 1700, 1900], t, 8), F.dots(50, [-300, -100, 1700, 2100], t, { seed: 8, r: [2, 4], a: 0.25 })];
    // a vertical ruler with centimeter marks
    out.push(F.rrect(240, 420, 130, 1100, 14, C.amber, { k: 12, h: 5 }));
    let d = "";
    for (let i = 0; i <= 70; i++) { const yy = 470 + i * cm / 10; if (yy > 1500) break; d += `M370 ${yy}h${i % 10 === 0 ? -64 : i % 5 === 0 ? -42 : -24}`; }
    out.push(F.el("path", { d, stroke: F.shade(C.amber, -0.55), "stroke-width": 5 }));
    for (let i = 0; i <= 6; i++) out.push(F.text(String(i), 280, 470 + i * cm, { size: 34, fill: F.shade(C.amber, -0.6), anchor: "middle" }));
    out.push(F.el("path", { d: `M380 ${y}H520`, stroke: "#ffffff", "stroke-width": 4, "stroke-dasharray": "10 10", opacity: 0.7 }));
    out.push(F.drop(600, y, 60, { face: true, mood: "sleepy" }));
    out.push(F.stopwatch(870, 700, 110, t * 1.0 + 0.0));
    out.push(F.pill("about", 760, 1300, { p: F.pop(t, B(sh, "pill")), sub: "1 cm per second", bg: C.purple, size: 34 }));
    return out;
  }, null, TEAL);
}

// ---------------------------------------------------------------- 11. warm air rising from the ground
function S_warm(t, T, sh) {
  const c = F.drift(t, T, [540, 1180, 0.98], [540, 900, 0.9], F.ease.inout);
  return F.frame(c, () => {
    const lift = F.prog(t, B(sh, "push"), 0.6);
    const out = [F.sun(880, 380, 85, { t, face: false }), F.hills(1500, { colors: ["#9ce07a", "#5cc46a", "#2f9e5a"], seed: 14 })];
    out.push(F.el("path", { d: "M-600 1640H1700", stroke: "#ffcf6a", "stroke-width": 26, opacity: 0.35 }));
    [200, 400, 620, 840].forEach((x, i) => out.push(warmArrow(x, 1600, 860 + 30 * (i % 2), F.prog(t, B(sh, "rise") + i * 0.12, 0.9), t, 30)));
    out.push(F.cloud(520, 650 - 60 * F.ease.out(lift), 1.15, { t, face: true, mood: lift > 0 ? "happy" : "smile", look: [0, 1] }));
    return out;
  }, null, SUNSET);
}

// ---------------------------------------------------------------- 12. hundreds of times faster
function S_race(t, T, sh) {
  const c = F.drift(t, T, [540, 940, 1.0], [540, 900, 1.05]);
  return F.frame(c, () => {
    const pa = F.prog(t, B(sh, "air"), 0.6), pd = F.prog(t, B(sh, "drop"), 0.4), carry = F.prog(t, B(sh, "carry"), 1.6);
    const out = [F.bokeh(8, [-300, 0, 1700, 1900], t, 12), F.dots(60, [-300, -100, 1700, 2100], t, { seed: 12, r: [2, 4], a: 0.3, twinkle: true })];
    out.push(F.arrow([[690, 1360], [690, 540]], { p: pa, w: 120, color: C.orange, head: 260 }));
    out.push(F.pill("warm air", 690, 330, { p: F.pop(t, B(sh, "air") + 0.4), sub: "a few m per second", bg: C.coral, size: 36 }));
    out.push(F.drop(320, 830, 44, { face: true, mood: "sleepy" }));
    out.push(F.arrow([[320, 895], [320, 945]], { p: pd, w: 10, color: C.cyan, head: 26 }));
    out.push(F.pill("droplet", 320, 1070, { p: F.pop(t, B(sh, "drop") + 0.1), sub: "~1 cm per second", bg: C.deepwater, size: 34 }));
    if (carry > 0) {
      const R = F.rng(3);
      for (let i = 0; i < 14; i++) {
        const ph = R(), x = 600 + R() * 180, y = 1380 - ((carry * 1.4 + ph) % 1) * 900;
        out.push(dot(x, y, 12));
      }
    }
    return out;
  }, null, NIGHT);
}

// ---------------------------------------------------------------- 13. the air in that same space
function S_air(t, T, sh) {
  const c = F.drift(t, T, [540, 920, 0.98], [540, 900, 1.03]);
  return F.frame(c, () => {
    const q = cubeScene(t, sh, { cube: 1, face: false });
    const k = F.prog(t, B(sh, "fill"), 0.8);
    const { X, Y, A } = q;
    if (k > 0) q.out.push(F.g(molecules(Math.round(70 * k), [X - A * 0.8, Y - A * 1.9, A * 1.6, A * 1.75], t, 17, 0.95, 1.1), {}));
    q.out.push(F.tag("Air", 540, 330, { p: F.pop(t, B(sh, "fill") + 0.1), size: 74, bg: "#cfe8ff" }));
    return q.out;
  }, null, ["#120c4a", "#2b2a9e", "#4a6cf0"]);
}

// ---------------------------------------------------------------- 14. a thousand times heavier
function S_scale(t, T, sh) {
  const tip = F.prog(t, B(sh, "tip"), 0.7);
  const c = F.shake(F.drift(t, T, [540, 1000, 0.95], [540, 980, 1.0]), t, B(sh, "tip") + 0.45, 12);
  return F.frame(c, () => {
    const tilt = 22 * F.ease.back(tip, 2.0);
    const left = (px, py) => F.drop(px, py - 45, 34) + F.pill("water", px, py - 150, { p: F.pop(t, B(sh, "water")), bg: C.deepwater, size: 30 });
    const right = (px, py) => {
      const s = [F.blob(F.P.circle(px, py - 150, 150), "#cfe8ff", { k: 30, h: 10, opacity: 0.5 })];
      s.push(molecules(26, [px - 120, py - 280, 240, 250], t, 23, 1, 0.9));
      return s.join("");
    };
    return [F.spot(540, 980, 520, "#ffffff", 0.08), F.balance(540, 1400, tilt, left, right, { span: 340, s: 1.05 }),
      F.tag("1,000×", 540, 360, { p: F.pop(t, B(sh, "tag")), size: 110, rot: -6, sub: "heavier" })];
  }, null, MAGENTA);
}

// ---------------------------------------------------------------- 15. the cloud is a lightweight
function S_light(t, T, sh) {
  const c = F.drift(t, T, [540, 920, 1.0], [540, 900, 1.1]);
  return F.frame(c, () => {
    const pb = F.pop(t, B(sh, "belt"), 0.5), up = Math.sin(t * 5) * 6;
    const belt = pb > 0 ? F.at(540, 1000, pb, 0, F.rrect(-250, -40, 500, 80, 30, "#ffc21c", { k: 10, h: 4 }) + F.circle(0, 0, 78, "#ffd94a", { dark: "#e8a90f" })
      + F.el("circle", { cx: 0, cy: 0, r: 50, fill: "#fff3b0" }) + F.text("1", 0, 2, { size: 64, fill: "#c27a00" })) : "";
    return [F.rays(540, 860, 120, 1300, 14, "#ffffff", t * 6, 0.18), F.spot(540, 880, 430, "#ffd94a", 0.35),
      F.dots(40, [-200, 200, 1500, 1400], t, { seed: 19, r: [5, 9], color: [C.yellow, C.pink, C.cyan, C.lime], vy: 90, a: 0.9 }),
      F.cloud(540, 820 + up, 1.45, { t, face: true, mood: "smug", look: [0.4, 0] }), belt,
      F.tag("Lightweight", 540, 380, { p: F.pop(t, B(sh, "tag")), size: 86, rot: -5, bg: C.yellow })];
  }, null, VIOLET);
}

// ---------------------------------------------------------------- 16. crashing into each other
function S_crash(t, T, sh) {
  const c = F.drift(t, T, [540, 940, 1.0], [540, 920, 1.08]);
  return F.frame(c, () => {
    const out = [F.bokeh(8, [-300, 0, 1700, 1900], t, 14), F.glow(540, 960, 700, "#3a6cff", 0.25), F.dots(50, [-300, -100, 1700, 2100], t, { seed: 14, r: [2, 4], a: 0.25 })];
    const R = F.rng(55);
    for (let i = 0; i < 46; i++) { const x = -250 + R() * 1580, y = 250 + R() * 1450, ph = R() * 6; out.push(dot(x + 14 * Math.sin(t * 0.8 + ph), y + 10 * Math.cos(t * 0.6 + ph), 7 + 7 * R())); }
    const pairs = [[B(sh, "c1"), 380, 760], [B(sh, "c1") + 0.25, 720, 1100], [B(sh, "c2"), 560, 520], [B(sh, "c2") + 0.2, 300, 1230], [B(sh, "c2") + 0.45, 780, 1400]];
    pairs.forEach(([tc, x, y], i) => {
      const k = F.clamp((t - (tc - 0.6)) / 0.6), merged = t >= tc;
      const r = 46 + 8 * (i % 2);
      if (!merged) {
        const gap = 1.25 * r * 2 * (1 - F.ease.in(k)) + r * 0.6;
        out.push(F.drop(x - gap / 2, y + F.bob(t, 6, 0.7, i), r, { face: i % 2 === 0, mood: "o" }), F.drop(x + gap / 2, y + F.bob(t, 6, 0.6, i + 2), r));
      } else {
        const rr = r * 1.26 * (1 + 0.12 * Math.exp(-(t - tc) * 6) * Math.sin((t - tc) * 30));
        out.push(F.drop(x, y, rr, { face: true, mood: "happy" }));
        if (t - tc < 0.35) out.push(F.el("circle", { cx: x, cy: y, r: rr * (1.2 + (t - tc) * 3), fill: "none", stroke: "#bff1ff", "stroke-width": 6, opacity: 1 - (t - tc) / 0.35 }));
      }
    });
    return out;
  }, null, NIGHT);
}

// ---------------------------------------------------------------- 17. a million make one raindrop
function S_raindrop(t, T, sh) {
  const c = F.drift(t, T, [540, 940, 1.0], [540, 930, 1.08]);
  return F.frame(c, () => {
    const td = B(sh, "drop"), k = F.prog(t, 0, td), formed = t >= td;
    const out = [F.bokeh(8, [-300, 0, 1700, 1900], t, 17), F.glow(540, 960, 640, "#59c8ff", 0.25)];
    const R = F.rng(77);
    if (!formed) for (let i = 0; i < 180; i++) {
      const a = R() * Math.PI * 2, d0 = 300 + 500 * R(), d = d0 * (1 - F.ease.in(F.clamp(k * (0.9 + 0.3 * R()))));
      if (d > 20) out.push(dot(540 + Math.cos(a + t * 0.6) * d, 960 + Math.sin(a + t * 0.6) * d * 1.1, 6 + 4 * R()));
    }
    const r = formed ? 100 + 50 * F.pop(t, td, 0.5) : 40 + 60 * k;
    out.push(F.drop(540, 980, Math.max(1, r), { face: formed, mood: "happy" }));
    out.push(F.counter(1e6 * F.ease.out(F.prog(t, B(sh, "count"), 0.9)), 540, 420, { p: F.pop(t, B(sh, "count")), size: 70, minw: 520, unit: "drops" }));
    return out;
  }, null, ["#0b1a6e", "#1748b8", "#2a8ae8"]);
}

// ---------------------------------------------------------------- 18. too heavy to float, it falls
function S_falls(t, T, sh) {
  const c = F.drift(t, T, [540, 900, 1.0], [540, 940, 1.04]);
  return F.frame(c, () => {
    const tf = B(sh, "fall"), fk = t > tf ? F.ease.in(F.clamp((t - tf) / 0.55)) : 0;
    const y = 920 + F.bob(t, 10, 1.6) + 1300 * fk;
    const out = [F.cloud(540, 420, 1.3, { t, face: true, mood: fk > 0 ? "shock" : "worried", look: [0, 1] })];
    [300, 540, 780].forEach((x, i) => out.push(warmArrow(x, 1700, 1180 - 40 * (i % 2), 1, t * 2, 26)));
    if (fk > 0) out.push(F.el("path", { d: `M540 ${y - 220}V${y - 120}M500 ${y - 260}V${y - 170}M580 ${y - 250}V${y - 160}`, stroke: "#ffffff", "stroke-width": 8, "stroke-linecap": "round", opacity: 0.7 }));
    out.push(F.drop(540, y, 120, { face: true, mood: fk > 0 ? "shock" : "worried" }));
    out.push(F.tag("Too heavy!", 760, 760, { p: F.pop(t, B(sh, "tag")) * (fk > 0.6 ? 0 : 1), size: 64, rot: 6 }));
    return out;
  }, null, SKY);
}

// ---------------------------------------------------------------- 19. one drop at a time
function S_rain(t, T, sh) {
  const last = B(sh, "last"), push = F.prog(t, last - 0.4, 1.2);
  const c0 = F.drift(t, T, [540, 1060, 0.92], [540, 1000, 0.98]);
  const c = { x: F.lerp(c0.x, 620, F.ease.inout(push)), y: F.lerp(c0.y, F.WIDE ? 1300 : 1220, F.ease.inout(push)), z: c0.z * (1 + 0.24 * F.ease.inout(push)), r: 0 };
  return F.frame(c, () => {
    const out = [F.cloud(540, 470, 1.6, { t, color: "#e3e6ff", dark: "#9fa6dd", glow: false, face: true, mood: "smile", look: [0, 1] })];
    const ek = F.prog(t, B(sh, "ele"), 0.4) * Math.max(0, 1 - Math.max(0, t - B(sh, "ele") - 1.4) / 0.6);
    if (ek > 0) out.push(eleGhost(400, 650, 0.9, 0.55 * ek));
    out.push(rain([-300, 600, 1700, 1300], t, 110, 4, 0.7));
    out.push(F.hills(1460, { colors: ["#6fbf8a", "#3f9f6c", "#2a7f56"], seed: 21 }));
    out.push(F.person(560, 1560, 0.72, Object.assign({ mood: t > last + 0.1 ? "happy" : "smile", look: [0, -1], arms: [[14, 6], [150, -95]], hold: (hx, hy) => umbrella(hx, hy - 215, 290) }, ME)));
    const dk = F.clamp((t - (last - 0.45)) / 0.45);
    if (dk > 0 && dk < 1) out.push(F.drop(676, F.lerp(560, 960, F.ease.in(dk)), 30));
    if (t > last) {
      const s = t - last;
      for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.15 + 0.7 * i / 5); out.push(dot(676 + Math.cos(a) * 160 * s * 3, 982 + Math.sin(a) * 120 * s * 3 + 400 * s * s * 4, 8 * Math.max(0, 1 - s * 2))); }
    }
    return out;
  }, null, RAIN);
}
