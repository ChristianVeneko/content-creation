/* Hand of God (Argentina v England, 22 June 1986) as a flat cartoon. One function per shot in shots.json, S(t, T):
   t = seconds into the shot, T = its length. Facts and kits from sources.md; only Maradona's 10 is shown. */
const C = Cartoon;
// the X cut is drawn natively at 7:8 (render.py --size 1008x1152): every camera zooms out to 0.8; these close-ups go further
// and shift so his face sits above the caption (78 % down)
window.FIT78 = { S_punch: { zoom: 0.72, dy: 95 }, S_hand: { zoom: 0.72, dy: 85 }, S_fist: { zoom: 0.64, dy: 62 }, S_godhand: { zoom: 0.72, dy: 85 }, S_people: { dy: 230 }, S_scored: { dy: 60 },
  // full figures: feet above the caption, on grass
  S_worldcup: { lift: 175 }, S_teams: { lift: 175 }, S_midfielder: { lift: 165 }, S_hook: { lift: 165 }, S_keeper: { lift: 175 }, S_rush: { lift: 210 },
  S_suddenly: { lift: 165 }, S_engplayers: { lift: 210 }, S_protest: { lift: 175 }, S_referee: { lift: 160 }, S_keeper55: { lift: 175 }, S_replay_side: { lift: 150 },
  // the number on his back and the glove's cuff clear of the caption; the TV room keeps the viewers' heads below it
  S_topdown: { lift: 230 }, S_float: { lift: 240 }, S_tv: { lift: 0 } };

// ---------------------------------------------------------------- the cast (kits from sources.md, generic faces)
const DIEGO = { skin: "#c68a5e", shirt: "#2d5fc8", shorts: "#1d1d22", socks: "#f2f2ee", boots: "#1a1a1a", sleeves: "short",
  hair: "mop", hairColor: "#1b1410", h: 300, build: 1.24, legs: 0.9, number: "10", numberColor: "#dfe3e8", seed: 10,
  face: { brows: 0.14, nose: 0.15 }, trim: "#1f4aa8" };
const SHILTON = { skin: "#efc3a2", shirt: "#8e959e", shorts: "#36405a", socks: "#8e959e", boots: "#1a1a1a", sleeves: "long",
  gloves: "#e8e3d4", hair: "short", hairColor: "#5a3b24", h: 395, build: 1.0, legs: 1.08, trim: "#2b4f9e", face: { nose: 0.14 } };
const ENG = (hair, hairColor, skin = "#f0c4a2", o = {}) => Object.assign({ skin, shirt: "#f6f6f1", shorts: "#9cc4e8", socks: "#9cc4e8",
  boots: "#1a1a1a", sleeves: "short", hair, hairColor, h: 330, build: 1.02, trim: "#1d2f6b" }, o);
const ARG = (hair, hairColor, skin = "#d6a07a", o = {}) => Object.assign({ skin, shirt: "#2d5fc8", shorts: "#1d1d22", socks: "#f2f2ee",
  boots: "#1a1a1a", sleeves: "short", hair, hairColor, h: 325, build: 1.05, trim: "#1f4aa8" }, o);
const REF = { skin: "#b98462", shirt: "#1d1d20", shorts: "#1d1d20", socks: "#1d1d20", boots: "#111", sleeves: "short", hair: "bald",
  hairColor: "#2a2420", h: 330, build: 1.05, trim: "#3a3a40" };
const FANS = ["#2d5fc8", "#f6f6f1", "#9cc4e8", "#e9c94a", "#d6453a", "#3c3c46", "#f0a8a0", "#7a5a3a", "#5aa0d8"];

// ---------------------------------------------------------------- the penalty box, seen from the pitch toward the goal
const GOAL = { x: 540, y: 1330, w: 1000, h: 330 };
function boxWorld(o = {}) {
  return [
    C.stadium(1150, { height: 560, rows: 15, size: 17, colors: FANS, x0: -1200, x1: 2300, seed: 3, bob: o.bob, arms: o.arms }),
    C.pitch(1150, { first: 22, grow: 1.28 }),
    C.line(-1200, GOAL.y, 2300, GOAL.y, 7),
    C.line(GOAL.x - 900, GOAL.y + 160, GOAL.x + 900, GOAL.y + 160, 9),
    o.inNet ? C.ball(...o.inNet) : "",                // a ball in the goal sits behind the net
    C.goal(GOAL.x, GOAL.y, GOAL.w, GOAL.h),
  ];
}

// the leap: k = 0 on the ground .. 1 at the top, contact at the top
function leap(k, o = {}) {
  const lift = 210 * Math.sin(Math.PI * 0.5 * C.clamp(k));
  const out = {};
  const dp = C.mixPose(C.pose.stand({ facing: "back", arms: [[20, 30], [-20, -30]], legs: [[8, 0], [-8, 0]] }),
    C.pose.jump({ facing: "back", arms: [[162, 172], [-40, -75]], legs: [[40, -20], [-8, 6]] }), C.sm(k * 1.3));
  dp.fist = [true, false];
  const sp = C.mixPose(C.pose.stand({ arms: [[30, 40], [-30, -40]] }),
    C.pose.keeperReach({ arms: [[40, 70], [-146, -150]], legs: [[18, -20], [-12, 4]], eyes: "wide", mouth: "o", look: [-0.6, -1], lean: -8 }), C.sm(k * 1.2));
  const sx = o.sx || 650, dx = o.dx || 445;
  const shil = C.person(SHILTON, Object.assign(sp, { lift: lift * 0.4 }), sx, 1560, 1, 1, 0, out.s = {});   // his glove stays short of the ball
  const dieg = C.person(DIEGO, Object.assign(dp, { lift }), dx, 1610, 1, 1, 0, out.d = {});
  return { shil, dieg, out, lift, shadows: [C.shadow(sx, 1562, 70, lift * 0.4), C.shadow(dx, 1612, 60, lift)] };
}

function leapWorld(k, o = {}) {
  const L = leap(k, o);
  const fist = L.out.d.hands[0];
  const items = [boxWorld(o), L.shadows, L.shil, L.dieg];
  const b = o.ball || [fist[0] + 6, fist[1] - 34];
  items.push(C.ball(b[0], b[1], 25, o.spin || 20));
  return { items, fist, L, ball: b };
}

// ---------------------------------------------------------------- the shots
function S_armup(t, T) {        // "with his left arm up,": the top of the leap, both in the air, the ball on his fist
  const k = 0.9 + 0.1 * C.sm(t / T);
  const c = C.cam(545 + 15 * t / T, 1330 - 15 * t / T, 1.5 + 0.1 * t / T);
  return C.frame(c, () => leapWorld(k).items);
}

function S_fist(t, T) {         // "and his fist": freeze, the fist meets the ball, a comic burst behind
  const c = C.cam(455, 1075, 2.3 + 0.22 * C.sm(t / T), -3);
  return C.frame(c, () => {
    const out = {};
    const pose = C.pose.jump({ arms: [[160, 172], [-40, -80]], eyes: "angry", mouth: "grit", look: [0.6, -1], head: -6, fist: [true, false], lean: -4 });
    const dieg = C.person(DIEGO, Object.assign(pose, { lift: 200 }), 470, 1610, 1, 1, 0, out);
    const f = out.hands[0];
    const bx = f[0] + 22, by = f[1] - 40;
    // Shilton's glove arrives from the right, a moment too late
    const gl = [[800, 700], [735, 790], [668, 832]];
    return [
      C.el("rect", { x: -500, y: 0, width: 2000, height: 2200, fill: "#ffcf3a" }),
      C.burst(bx, by, 1400, ["#ffd84f", "#ffb12a"], 26, 8 * t),
      C.speedLines(bx, by, 520, 170, 26, 4, "#fff6d0", 7),
      C.star(bx + 4, by + 4, 62, "#fff", 9),
      dieg,
      C.limb(gl, 34, [[0, 1, "#8e959e"]]), C.glove(gl[2][0] - 6, gl[2][1] - 4, 30, -62, "#e8e3d4", "#2b4f9e"),
      C.ball(bx, by, 26, 30),
    ];
  });
}

function S_tv(t, T) {           // "hadn't seen the hand,": the replay on a 1980s TV in a living room, an orange arrow draws on
  const c = C.cam(540, 1010, 1.0 + 0.04 * t / T);
  return C.frame(c, () => {
    const innerCam = C.cam(540, 1180, 1.25);
    const lw = leapWorld(0.98);
    // where the fist sits on the screen (640x480 space)
    const sx = (p) => [(p[0] - innerCam.x) * innerCam.z + 320, (p[1] - innerCam.y) * innerCam.z + 240];
    const fs = sx(lw.fist);
    const k = C.sm((t - 0.2) / 0.7);
    const screen = C.view(innerCam, () => lw.items, 640, 480)
      + C.ring(fs[0], fs[1] - 14, 52, C.sm((t - 0.65) / 0.35), "#ff7a1a", 14)
      + C.arrow([[fs[0] + 230, fs[1] + 170], [fs[0] + 170, fs[1] + 70], [fs[0] + 74, fs[1] + 18]], k, "#ff7a1a", 20);
    const sofa = [
      C.el("rect", { x: 120, y: 1640, width: 840, height: 330, rx: 60, fill: "#8a3b2e", stroke: C.INK, "stroke-width": C.OW }),
      C.el("rect", { x: 80, y: 1560, width: 120, height: 300, rx: 50, fill: "#7a3226", stroke: C.INK, "stroke-width": C.OW }),
      C.el("rect", { x: 880, y: 1560, width: 120, height: 300, rx: 50, fill: "#7a3226", stroke: C.INK, "stroke-width": C.OW }),
    ];
    const viewer = (x, sp) => C.person(sp, C.pose.sit({ facing: "back", arms: [[10, 10], [-10, -10]] }), x, 1880, 1.2);
    return [
      C.room(1300),
      C.el("rect", { x: 170, y: 260, width: 170, height: 220, fill: "#c9b07a", stroke: C.INK, "stroke-width": C.OW }),   // a picture frame
      C.el("rect", { x: 190, y: 280, width: 130, height: 180, fill: "#7fb0c8" }),
      C.el("path", { d: "M820 1300 L840 760 L900 760 L920 1300 Z", fill: "#c9a46a", stroke: C.INK, "stroke-width": C.OW }),   // a lamp
      C.el("path", { d: "M780 770 L960 770 L920 640 L820 640 Z", fill: "#f3dfa0", stroke: C.INK, "stroke-width": C.OW }),
      C.tv(540, 1210, 760, screen),
      viewer(360, ARG("short", "#2a1d14", "#e2b48c", { shirt: "#c8462e", sleeves: "long" })),
      viewer(700, ARG("side", "#6a4a2a", "#f0c4a2", { shirt: "#3f6e4a", sleeves: "long" })),
      sofa,
    ];
  }, null, "#e9d6a8");
}

// ---------------------------------------------------------------- more of the cast and shared scenes
const P = C.pose;
const ENG1 = ENG("short", "#7a5230"), ENG2 = ENG("side", "#2a1d14", "#e8b892"), ENG3 = ENG("short", "#c89a5a", "#f3caa8"), ENG4 = ENG("bald", "#4a3424", "#efc0a0");
const HODGE = ENG("short", "#3a2a1e", "#f0c4a2");                    // "an England midfielder", not named on screen
const ARG1 = ARG("short", "#1c1410"), ARG2 = ARG("side", "#3a2a1e", "#c99470");
const sky = (y = 1150) => C.el("rect", { x: -4000, y: y - 6000, width: 9000, height: 6000, fill: "url(#sky)" });
const clouds = (dx = 0) => [C.cloud(-260 + dx, 330, 1.1), C.cloud(380 + dx * 0.7, 190, 0.8), C.cloud(860 + dx * 0.5, 420, 1.0), C.cloud(1500 + dx, 260, 1.2)];
function wideWorld(o = {}) {                                        // the stadium seen from the pitch
  return [sky(), clouds(o.dx || 0), C.stadium(1150, { height: o.height || 560, rows: o.rows || 15, size: 17, colors: FANS, x0: -1600, x1: 2700, seed: 3, bob: o.bob, arms: o.arms, noSky: true }),
    C.pitch(1150, { first: 22, grow: 1.28 })];
}
const byDepth = (list) => list.sort((a, b) => a[0] - b[0]).map((x) => x[1]);  // draw far (small y) to near
const drift = (t, T, a, b) => C.lerp(a, b, C.ease.inout(t / T));
const bounce = (t, h, per = 0.5) => -Math.abs(Math.sin(Math.PI * t / per)) * h;
const streaks = (cx, k, y0 = 600, n = 20) => C.g(Array.from({ length: n }, (_, i) => C.el("rect", { x: cx - 700 + (i * 113) % 1400, y: y0 + i * 50, width: 300 + 400 * k, height: 8, fill: "#fff", opacity: 0.4 * k })));

// ---------------------------------------------------------------- 0-4: the hook
function S_punch(t, T) {        // "He punched the ball": the fist sends the ball off, a burst behind (slow motion)
  const c = C.cam(500 - 20 * t / T, 1040, 2.1 - 0.15 * t / T, 3);
  return C.frame(c, () => {
    const out = {};
    const pose = P.jump({ arms: [[155, 170], [-40, -80]], eyes: "angry", mouth: "grit", look: [0.7, -1], head: -6, fist: [true, false], lean: -4 });
    const d = C.person(DIEGO, Object.assign(pose, { lift: 200 }), 470, 1610, 1, 1, 0, out);
    const f = out.hands[0];
    const k = C.ease.out(t / T);
    const bx = f[0] + 30 + 230 * k, by2 = f[1] - 40 - 160 * k;
    return [C.el("rect", { x: -800, y: -400, width: 2600, height: 2800, fill: "#ffcf3a" }),
      C.burst(f[0], f[1], 1500, ["#ffd84f", "#ffb12a"], 24, -6 * t),
      C.speedLines(bx, by2, 380, 90, 18, 9, "#fff6d0", 6), d,
      C.star(f[0] + 10, f[1] - 20, 46 * (1 - k * 0.6), "#fff", 9), C.ball(bx, by2, 26, 40 + 300 * k)];
  });
}

function S_net(t, T) {          // "into the net": the ball hits the net, which bulges, swish lines
  const c = C.cam(600 + 30 * t / T, 1180, 1.9 + 0.1 * t / T);
  return C.frame(c, () => {
    const k = C.ease.out(t / 0.35);
    const bx = C.lerp(860, 760, k), by2 = C.lerp(1020, 1060, k), r = C.lerp(30, 21, k);
    return [boxWorld({ inNet: [bx, by2, r, 200 * t] }),
      t > 0.3 ? C.speedLines(bx, by2, 120, 40, 12, 3, "#ffffff", 4) : "",
      C.el("circle", { cx: bx, cy: by2, r: r * 1.6, fill: "none", stroke: "#fff", "stroke-width": 3, opacity: 0.6 * (1 - C.clamp((t - 0.3) / 0.5)) })];
  });
}

function S_hand(t, T) {         // "with his hand,": freeze on his face and the fist, which glows; a sly grin
  const c = C.cam(455, 1075, 2.25 + 0.2 * C.sm(t / T), -2 + 2 * t / T);
  return C.frame(c, () => {
    const out = {};
    const pose = P.jump({ arms: [[160, 172], [-40, -80]], eyes: "squint", mouth: "smile", look: [-0.9, 0.2], head: 4, fist: [true, false] });
    const d = C.person(DIEGO, Object.assign(pose, { lift: 200 }), 470, 1610, 1, 1, 0, out);
    const f = out.hands[0], gk = C.sm(t / 0.5);
    return [C.el("rect", { x: -800, y: -400, width: 2600, height: 2800, fill: "#2d5fc8" }),
      C.burst(f[0], f[1], 1500, ["#3a6fd6", "#2a58b8"], 24, 4 * t),
      C.glow(f[0], f[1], 70 + 20 * gk, "#ffd24a", 0.75 * gk), d,
      C.ball(f[0] + 22, f[1] - 40, 26, 30), C.rays(f[0], f[1], 160 * gk, 10, 360, "#fff2a8", 0.4 * gk, 10 * t)];
  });
}

function S_whip(t, T) {         // "in front of": a whip pan from the box to the stand, everything streaks
  const k = C.ease.in(t / T);
  const c = C.cam(540 + 1400 * k, 1050 - 150 * k, 1.3);
  return C.frame(c, () => [wideWorld({ bob: t, arms: 0.2 }), streaks(c.x, Math.max(0.3, k))]);
}

function S_people(t, T) {       // "114,580 people.": the packed stand, fans waving, the number standing gold on the pitch
  const k = C.ease.inout(t / T);
  const c = C.cam(540, C.lerp(1180, 980, k), C.lerp(1.1, 0.9, k));
  return C.frame(c, () => [sky(), clouds(-40 * t), C.stadium(1230, { height: 980, rows: 26, size: 19, colors: FANS, x0: -1500, x1: 2600, seed: 8, bob: t, arms: 0.35, noSky: true }),
    C.pitch(1230, { first: 24, grow: 1.3 }),
    C.bigText("114,580", 540, 1420 - 30 * C.ease.out(t / 0.6), 230, "#ffd24a", 18)]);
}

// ---------------------------------------------------------------- 5-9: the setting
function S_match(t, T) {        // "You see, it was": match play, small players running on a sunny pitch
  const c = C.cam(540 + 40 * t / T, 1250, 0.95);
  return C.frame(c, () => {
    const pl = [[DIEGO, 380, 1420, 0.0], [ENG1, 520, 1380, 0.3], [ARG1, 700, 1460, 0.6], [ENG2, 260, 1500, 0.2], [ENG3, 820, 1360, 0.8], [ARG2, 160, 1360, 0.5]];
    const list = pl.map(([sp, x, y, ph]) => [y, [C.shadow(x + 40 * t, y, 26), C.person(sp, P.run(t * 1.6 + ph, { look: [1, 0] }), x + 40 * t, y, 0.4)]]);
    return [wideWorld({ bob: t * 0.5 }), byDepth(list), C.ball(520 + 60 * t, 1440 + bounce(t, 30, 0.45), 11, 300 * t)];
  });
}

function S_clock(t, T) {        // "the 51st minute": push in on the old clock board in the stand
  const c = C.cam(540, 760, 1.0 + 0.45 * C.ease.inout(t / T));
  return C.frame(c, () => [wideWorld({ bob: t }), C.board(540, 640, 520, "51'")]);
}

function S_worldcup(t, T) {     // "of a World Cup": low behind Maradona and two team-mates walking up the pitch
  const c = C.cam(540, 1250 - 30 * t / T, 1.35 + 0.08 * t / T);
  return C.frame(c, () => {
    const w = (ph) => { const s = Math.sin((t * 1.1 + ph) * 6.28); return P.stand({ facing: "back", arms: [[12 + 18 * s, 20], [-12 + 18 * s, -20]], legs: [[6 + 16 * s, 0], [-6 + 16 * s, 0]] }); };
    return [wideWorld(), C.shadow(300, 1545, 40), C.shadow(540, 1600, 50), C.shadow(790, 1545, 40),
      C.person(ARG1, w(0.3), 300, 1545, 0.82), C.person(ARG2, w(0.7), 790, 1545, 0.82), C.person(DIEGO, w(0), 540, 1600, 1.0)];
  });
}

function S_quarter(t, T) {      // "quarter-final,": god's-eye over the pitch, both teams take their places
  const c = C.cam(540, 910, 0.85 + 0.04 * t / T, -8 * t / T);
  return C.frame(c, () => {
    const k = C.ease.inout(t / T), r = C.rng(21);
    const blue = [[540, 1030], [380, 1120], [700, 1120], [300, 1300], [460, 1260], [620, 1260], [780, 1300], [430, 1460], [650, 1460], [540, 1620]];
    const white = [[540, 780], [380, 700], [700, 700], [300, 520], [460, 560], [620, 560], [780, 520], [430, 380], [650, 380], [540, 290]];
    const tok = (p, sp) => C.token(C.lerp(p[0] + (r() - 0.5) * 500, p[0], k), C.lerp(p[1] + (r() - 0.5) * 400, p[1], k), sp, 1.25);
    return [C.topPitch(540, 200, 13.2), blue.map((p, i) => tok(p, i === 0 ? DIEGO : ARG1)), white.map((p) => tok(p, ENG1)),
      C.token(540, 214, SHILTON, 1.25)];
  }, null, "#5bab3f");
}

function S_teams(t, T) {        // "Argentina against England.": the two line-ups, the camera slides from blue to white
  const c = C.cam(drift(t, T, 330, 750), 1240, 1.25);
  return C.frame(c, () => {
    const st = (o) => P.stand(Object.assign({ arms: [[25, -45], [-25, 45]], mouth: "flat", eyes: "angry" }, o));
    const row = [[ARG1, 120, st()], [DIEGO, 330, st({ mouth: "smile", eyes: "open" })], [ARG2, 520, st()],
      [ENG1, 760, st()], [ENG2, 950, st({ eyes: "squint" })], [ENG3, 1140, st()]];
    return [wideWorld(), row.map(([sp, x, p]) => [C.shadow(x, 1520, 50), C.person(sp, p, x, 1520, 0.95)]),
      C.el("path", { d: "M640 1000 L610 1200 L660 1190 L625 1420", fill: "none", stroke: "#ffd24a", "stroke-width": 16, "stroke-linejoin": "round", "stroke-linecap": "round" })];
  });
}

// ---------------------------------------------------------------- 10-15: the build-up
function S_midfielder(t, T) {   // "Then an England midfielder": the ball drops toward him in the box
  const c = C.cam(560, 1210 + 20 * t / T, 1.55 - 0.05 * t / T);
  return C.frame(c, () => {
    const by2 = C.lerp(820, 1080, C.ease.in(t / T));
    return [boxWorld(), C.shadow(560, 1560, 55), C.person(HODGE, P.stand({ look: [0.3, -1], eyes: "open", mouth: "flat", arms: [[30, 10], [-30, -10]] }), 560, 1560, 1),
      C.ball(700, by2, 22, 90 * t)];
  });
}

function S_hook(t, T) {         // "hooked the ball back": his left foot swings, the ball loops up and back over him
  const c = C.cam(560, 1180, 1.45);
  return C.frame(c, () => {
    const sw = C.sm((t - 0.5) / 0.4);            // the swing lands at 0.9 s, on the kick in the sound
    const pose = P.stand({ legs: [[6, 2], [C.lerp(-10, -60, sw), C.lerp(-4, -20, sw)]], arms: [[50, 20], [-60, -30]], lean: -8 * sw, eyes: sw > 0.5 ? "wide" : "open", mouth: sw > 0.5 ? "o" : "flat", look: [0.4, -1] });
    const k = C.clamp((t - 0.88) / (T - 0.88));
    const bx = C.lerp(640, 520, k), by2 = C.lerp(1520, 760, C.ease.out(k));
    return [boxWorld(), C.shadow(560, 1560, 55), C.person(HODGE, pose, 560, 1560, 1), C.ball(bx, by2, C.lerp(22, 17, k), 400 * t),
      k > 0 ? C.speedLines(bx, by2 + 60, 30, 110, 5, 2, "#fff", 4) : ""];
  });
}

function S_track(t, T) {        // "toward his own goal.": the camera flies beside the looping ball, a dotted trail behind it
  const k = t / T;
  const ball = (u) => [C.lerp(-200, 1250, u), 900 - 430 * Math.sin(Math.PI * C.clamp(u * 0.8 + 0.1))];
  const b = ball(k);
  const c = C.cam(b[0] - 60, 900, 1.15);
  return C.frame(c, () => {
    const trail = Array.from({ length: 30 }, (_, i) => ball(k * i / 29));
    return [sky(1350), clouds(-200 * k), C.stadium(1350, { height: 300, rows: 8, size: 15, colors: FANS, x0: -900, x1: 2400, seed: 5, noSky: true }), C.pitch(1350),
      C.goal(1450, 1500, 700, 240), C.dashed(trail, 1, "#fff", 7, 20), C.ball(b[0], b[1], 26, 500 * t)];
  });
}

function S_keeper(t, T) {       // "So the keeper": Shilton on his line, ready
  const c = C.cam(540, 1180, 1.6 + 0.08 * t / T);
  return C.frame(c, () => [boxWorld(), C.shadow(540, 1420, 70),
    C.person(SHILTON, P.stand({ arms: [[55, 20], [-55, -20]], legs: [[18, -10], [-18, 10]], look: [0, -0.6], eyes: "open", mouth: "flat" }), 540, 1420, 1)]);
}

function S_rush(t, T) {         // "rushed out": Shilton runs at the camera off his line, speed lines
  const k = C.ease.in(t / T);
  const c = C.cam(540, 1250, 1.35);
  return C.frame(c, () => [boxWorld(), C.speedLines(540, 1150, 900, 380, 24, 6, "#ffffff", 5),
    C.shadow(540, C.lerp(1420, 1640, k), 70 * C.lerp(1, 1.4, k)),
    C.person(SHILTON, P.run(t * 2.2, { look: [0, -0.5], eyes: "wide", mouth: "grit", lean: 0 }), 540, C.lerp(1420, 1640, k), C.lerp(1, 1.35, k))]);
}

function S_meet(t, T) {         // "to meet it.": both go up for the dropping ball, from a little wider
  const k = C.lerp(0.15, 0.6, t / T);
  const c = C.cam(560, 1250, 1.2);
  return C.frame(c, () => leapWorld(k, { ball: [560, C.lerp(760, 1000, t / T)] }).items);
}

// ---------------------------------------------------------------- 16-23: the moment
function S_leap(t, T) {         // "But Maradona leapt": low behind him as he rises, slow motion
  const k = C.lerp(0.35, 0.85, C.ease.out(t / T));
  const c = C.cam(470, 1330 - 60 * t / T, 1.75);
  return C.frame(c, () => {
    const L = leap(k);
    const f = L.out.d.hands[0];
    return leapWorld(k, { ball: [f[0] + 6, f[1] - 34 - 160 * (1 - C.ease.out(t / T))] }).items;
  });
}

function S_topdown(t, T) {      // "got there first.": the freeze, close on the fist and the glove a hand's width short; a ring draws on
  const lw = leapWorld(1);
  const f = lw.fist;
  const c = C.cam(f[0] + 60, f[1] + 20, 3.3 + 0.25 * C.sm(t / T), 4 * t / T);
  return C.frame(c, () => [leapWorld(1).items, C.el("rect", { x: -3000, y: -3000, width: 7000, height: 7000, fill: "#ffcf3a", opacity: 0.18 }),
    C.ring(f[0] + 4, f[1] - 18, 62, C.sm((t - 0.15) / 0.6), "#ff7a1a", 6)]);
}

function S_float(t, T) {        // "The ball floated": from below, the ball drifts over the keeper's glove against the sky
  const c = C.cam(540, 700, 1.0);
  return C.frame(c, () => {
    const k = C.ease.inout(t / T);
    return [C.el("rect", { x: -2000, y: -2000, width: 5000, height: 5000, fill: "url(#sky)" }), C.sun(860, 260, 70), clouds(-60 * t),
      C.limb([[820, 2100], [740, 1500], [660, 1160]], 130, [[0, 1, "#8e959e"]]), C.glove(645, 1080, 120, -14, "#e8e3d4", "#2b4f9e"),
      C.ball(C.lerp(380, 600, k), C.lerp(880, 640, k), 70, 60 * t)];
  }, null, "#9fd6ee");
}

function S_over(t, T) {         // "over the keeper's head": Shilton looks up as the ball goes over him toward the goal
  const k = C.ease.inout(t / T);
  const c = C.cam(560, 1180, 1.5);
  return C.frame(c, () => [boxWorld(), C.ball(C.lerp(560, 660, k), C.lerp(880, 1100, k), C.lerp(30, 20, k), 120 * t), C.shadow(600, 1500, 70),
    C.person(SHILTON, P.keeperReach({ arms: [[40, 80], [-150, -165]], legs: [[10, -4], [-12, 4]], look: [0.2, -1], head: 12, eyes: "wide", mouth: "o", lift: 40 * (1 - k) }), 600, 1500, 1)]);
}

function S_drop(t, T) {         // "and dropped": at grass level, the ball comes down toward the open goal
  const c = C.cam(540, 1320, 1.9);
  return C.frame(c, () => {
    const k = C.ease.in(t / T);
    return [boxWorld(), C.shadow(560, 1345, 25 * (0.6 + k)), C.ball(560, C.lerp(1080, 1310, k), 22, 30 * t), C.speedLines(560, C.lerp(1080, 1310, k) - 40, 10, 90, 6, 7, "#fff", 4)];
  });
}

function S_ingoal(t, T) {       // "into the goal.": inside the post, the ball in the net, the net bulges
  const c = C.cam(560, 1180, 2.2 + 0.2 * t / T, -3);
  return C.frame(c, () => [boxWorld({ inNet: [560 + 10 * C.ease.out(t / T), 1260, 22, 20 * t] }),
    C.el("circle", { cx: 560, cy: 1260, r: 40 + 60 * C.ease.out(t / T), fill: "none", stroke: "#fff", "stroke-width": 4, opacity: 0.7 * (1 - t / T) })]);
}

// ---------------------------------------------------------------- 24-29: the protest
function S_suddenly(t, T) {     // "Suddenly,": a whip to England's players, who turn with a start
  const k = C.ease.out(t / 0.45);
  const c = C.cam(C.lerp(-400, 540, k), 1230, 1.35);
  return C.frame(c, () => {
    const pl = [[ENG1, 300], [ENG2, 540], [ENG3, 780]];
    const st = P.stand({ eyes: "wide", mouth: "o", look: [-0.6, 0], arms: [[40, 60], [-40, -60]] });
    return [boxWorld(), pl.map(([sp, x]) => [C.shadow(x, 1500, 50), C.person(sp, st, x, 1500, 0.9),
      t > 0.4 ? C.bigText("!", x + 20, 1060 - 20 * C.ease.out((t - 0.4) / 0.3), 110, "#ffd24a", 6) : ""]),
      k < 1 ? streaks(c.x, 1 - k) : ""];
  });
}

function S_engplayers(t, T) {   // "England's players": they run at the camera, shouting
  const k = t / T;
  const c = C.cam(540, 1250, 1.3);
  return C.frame(c, () => {
    const pl = [[ENG4, 330, 1480, 0.2], [ENG1, 760, 1490, 0.6], [ENG2, 540, 1560, 0]];
    return [boxWorld(), pl.map(([sp, x, y, ph]) => [C.shadow(x, y + 80 * k, 55), C.person(sp, P.run(t * 2 + ph, { look: [0, 0], eyes: "angry", mouth: "shout", lean: 0 }), x, y + 80 * k, 1 + 0.15 * k)])];
  });
}

function S_protest(t, T) {      // "protested the handball.": behind the referee, the England players point at their hands
  const c = C.cam(540, 1180, 1.45 - 0.05 * t / T);
  return C.frame(c, () => {
    const wag = Math.sin(t * 9) * 12;
    const pr = (o) => P.protest(Object.assign({ arms: [[150 + wag, 168 + wag], [-35, -95]] }, o));
    return [boxWorld(), C.shadow(300, 1470, 50), C.shadow(780, 1470, 50), C.shadow(560, 1420, 50),
      C.person(ENG3, pr({ look: [0.6, 0] }), 560, 1420, 0.9),
      C.person(ENG1, pr({ look: [0.8, 0] }), 300, 1470, 0.95), C.person(ENG2, pr({ look: [-0.8, 0], arms: [[35, 95], [-150 - wag, -168 - wag]] }), 780, 1470, 0.95),
      C.shadow(540, 1640, 60), C.person(REF, P.stand({ facing: "back", arms: [[15, 10], [-15, -10]] }), 540, 1640, 1.1)];
  });
}

function S_referee(t, T) {      // "But the referee": calm, he points back to the centre circle
  const c = C.cam(540, 1180, 1.6 + 0.06 * t / T);
  return C.frame(c, () => {
    const a = C.sm(t / 0.3);
    return [wideWorld(), C.shadow(540, 1440, 60),
      C.person(REF, P.stand({ arms: [[15, 10], [C.lerp(-15, -95, a), C.lerp(-10, -95, a)]], eyes: "squint", mouth: "flat", look: [-0.8, 0] }), 540, 1440, 1)];
  });
}

function S_stood(t, T) {        // "so the goal stood.": Maradona wheels away, arms wide, the crowd goes up
  const k = C.ease.out(t / T);
  const c = C.cam(500 - 60 * k, 1330, 1.85);
  return C.frame(c, () => [wideWorld({ bob: t, arms: 0.5 }), C.shadow(540 - 120 * k, 1560, 60),
    C.person(DIEGO, P.armsUp({ arms: [[110, 125], [-110, -125]], eyes: "closed", mouth: "grin", lift: 30 * Math.abs(Math.sin(t * 6)) }), 540 - 120 * k, 1560, 1.05)]);
}

// ---------------------------------------------------------------- 30-38: the quote
function pressRoom(t, o = {}) {
  const out = {};
  const d = C.person(DIEGO, P.sit({ arms: [[20, -70], [-20, 70]], eyes: o.eyes || "open", mouth: o.mouth || "smile", look: o.look || [0, 0], head: o.head || 0 }), 540, 1420, 1.2, 1, 0, out);
  const head = [out.head[0], out.head[1] + out.headR * 1.6];
  return { out, items: [
    C.el("rect", { x: -2000, y: -2000, width: 5000, height: 3300, fill: "#4c6a96" }),
    Array.from({ length: 14 }, (_, i) => C.el("rect", { x: -400 + i * 140, y: 500, width: 70, height: 700, fill: "#5677a6", opacity: 0.6 })),
    C.el("rect", { x: -2000, y: 1300, width: 5000, height: 2000, fill: "#6b4a34" }),
    d, C.pressTable(540, 1300, 900, 9, head[0], head[1])] };
}

function S_press(t, T) {        // "After the game,": the press room, journalists' heads in front, flashes
  const c = C.cam(540, 1210 + 30 * t / T, 1.5 + 0.06 * t / T);
  return C.frame(c, () => {
    const pr = pressRoom(t);
    const heads = [[180, ENG2], [430, ENG4], [690, ENG1], [930, ARG2]].map(([x, sp]) => C.person(Object.assign({}, sp, { shirt: "#5a5a64", sleeves: "long" }), P.stand({ facing: "back" }), x * 0.8 + 110, 2050, 1.3));
    return [pr.items, heads, C.flashes(t, -100, 600, 1180, 1500, 6, 2.5, 4)];
  });
}

function S_said(t, T) {         // "Maradona said": closer, he leans to the microphones, flashes go off
  const c = C.cam(540, 1060, 1.9 + 0.12 * t / T);
  return C.frame(c, () => [pressRoom(t, { mouth: t % 0.4 < 0.2 ? "o" : "smile", look: [0, 0.2] }).items, C.flashes(t, 150, 700, 930, 1300, 5, 3, 9)]);
}

function S_mics(t, T) {         // "it was scored": the bunch of microphones, his grin above them
  const c = C.cam(560, 1180 - 30 * t / T, 2.8);
  return C.frame(c, () => pressRoom(t, { mouth: "grin", eyes: "squint" }).items);
}

const memory = () => C.el("rect", { x: -3000, y: -3000, width: 7000, height: 7000, fill: "#c89a50", opacity: 0.28, style: "mix-blend-mode:multiply" });
function S_replay_side(t, T) {  // "a little": the leap again, as he remembers it (warm tint), the head near the ball
  const c = C.cam(520, 1180, 1.9 + 0.15 * t / T, -2);
  return C.frame(c, () => [leapWorld(0.97).items, memory()]);
}

function headShot(t, T, glowK) {
  const out = {};
  const pose = P.stand({ eyes: "squint", mouth: "grin", look: [0.3, -0.2], head: -4 });
  const d = C.person(DIEGO, pose, 540, 1720, 1.1, 1, 0, out);
  const h = out.head;
  return { h, items: [C.el("rect", { x: -2000, y: -2000, width: 5000, height: 5000, fill: "#2d5fc8" }), C.burst(h[0], h[1], 1500, ["#3a6fd6", "#2a58b8"], 22, 5 * t),
    C.glow(h[0], h[1], 150, "#ffd24a", 0.7 * glowK), C.rays(h[0], h[1], 420 * glowK, 12, 360, "#fff2a8", 0.35 * glowK, 6 * t), d] };
}
function S_head(t, T) {         // "with the head": his head glows
  const c = C.cam(540, 1400, 3.1 - 0.15 * t / T);
  return C.frame(c, () => headShot(t, T, C.sm(t / 0.35)).items);
}
function S_ofdiego(t, T) {      // "of Maradona,": pull back, the glow fades
  const e = C.ease.inout(t / T);
  const c = C.cam(540, C.lerp(1400, 1480, e), C.lerp(2.9, 1.5, e));
  return C.frame(c, () => headShot(t, T, 1 - C.sm(t / T)).items);
}

function S_orbit(t, T) {        // "and a little": the frozen contact once more, the camera turns around it
  const c = C.cam(500, 1080, 2.2, C.lerp(-8, 8, C.ease.inout(t / T)));
  return C.frame(c, () => [leapWorld(1).items, memory()]);
}

function S_godhand(t, T) {      // "with the hand": the fist glows gold
  const c = C.cam(455, 1050, 2.4 + 0.25 * t / T, -2);
  return C.frame(c, () => {
    const out = {};
    const d = C.person(DIEGO, Object.assign(P.jump({ arms: [[160, 172], [-40, -80]], eyes: "closed", mouth: "smile", head: -6, fist: [true, false] }), { lift: 200 }), 470, 1610, 1, 1, 0, out);
    const f = out.hands[0], gk = C.sm(t / 0.4);
    return [C.el("rect", { x: -800, y: -400, width: 2600, height: 2800, fill: "#f7d77a" }), C.burst(f[0], f[1], 1500, ["#ffe58a", "#ffcf4a"], 26, 6 * t),
      C.glow(f[0], f[1], 110, "#fff4c0", 0.9 * gk), d, C.glow(f[0], f[1], 40, "#fff", 0.8 * gk), C.rays(f[0], f[1], 300 * gk, 12, 360, "#fffbe0", 0.5 * gk, 8 * t)];
  });
}

function S_ofgod(t, T) {        // "of God.": looking up past the raised fist into the sun, rays come down
  const c = C.cam(540, 900 - 40 * t / T, 1.0);
  return C.frame(c, () => [C.el("rect", { x: -2000, y: -2000, width: 5000, height: 5000, fill: "url(#sky)" }), C.sun(560, 560, 110),
    C.rays(560, 560, 1800, 9, 80, "#fff6c8", 0.3, 3 * t), clouds(-30 * t),
    C.limb([[420, 2150], [470, 1700], [520, 1330]], 120, [[0, 1, DIEGO.skin], [0, 0.35, DIEGO.shirt]]), C.fist(528, 1210, 105, 6, DIEGO.skin),
    C.glow(528, 1180, 160, "#fff6c8", 0.35 * C.sm(t / T))], null, "#9fd6ee");
}

// ---------------------------------------------------------------- 39-45: four minutes later
function S_clock55(t, T) {      // "Four minutes later,": the clock board turns from 51' to 55'
  const c = C.cam(540, 700, 1.4 + 0.1 * t / T);
  return C.frame(c, () => [wideWorld({ bob: t }), C.board(540, 640, 520, t < 0.3 ? "51'" : "55'"),
    t > 0.24 && t < 0.38 ? C.el("rect", { x: 280, y: 510, width: 520, height: 260, fill: "#fff", opacity: 0.5 }) : ""]);
}

function S_ran(t, T) {          // "he ran from": Maradona sets off with the ball, a puff of dust
  const k = t / T;
  const c = C.cam(540 + 80 * k, 1250, 1.45);
  return C.frame(c, () => [wideWorld({ dx: -60 * k }), C.shadow(500 + 160 * k, 1560, 55),
    C.el("circle", { cx: 450, cy: 1540, r: 50 * (1 - k) + 10, fill: "#d8d0b0", opacity: 0.6 * (1 - k) }),
    C.person(DIEGO, P.run(t * 2.4, { look: [1, 0], eyes: "angry", mouth: "grit" }), 500 + 160 * k, 1560, 1),
    C.ball(580 + 165 * k, 1545 + bounce(t, 16, 0.25), 20, 500 * t)]);
}

function S_half(t, T) {         // "his own half,": god's-eye, an orange line draws his run toward the goal
  const route = [[560, 905], [610, 820], [520, 720], [630, 610], [540, 500], [640, 420], [560, 330], [548, 222]];
  const k = C.ease.inout(t / T);
  const c = C.cam(560, C.lerp(760, 520, k), 1.4);
  return C.frame(c, () => {
    const defs = [[600, 790], [540, 680], [610, 560], [580, 430]];
    const pos = (u) => { const n = route.length - 1, i = Math.min(n - 1, Math.floor(u * n)), f = u * n - i; return [C.lerp(route[i][0], route[i + 1][0], f), C.lerp(route[i][1], route[i + 1][1], f)]; };
    const d = pos(k);
    return [C.topPitch(540, 200, 13.2), defs.map((p) => C.token(p[0] + 40, p[1], ENG1, 1.2)), C.token(548, 220, SHILTON, 1.2),
      C.arrow(route, Math.max(0.01, k), "#ff7a1a", 12), C.token(d[0], d[1], DIEGO, 1.35)];
  }, null, "#5bab3f");
}

function S_past(t, T) {         // "past four England players": he runs by them, one after another they spin and fall
  const k = t / T;
  const dx = C.lerp(-50, 1650, k);
  const c = C.cam(dx + 120, 1250, 1.15);
  return C.frame(c, () => {
    const defs = [[ENG1, 250], [ENG2, 650], [ENG4, 1050], [ENG3, 1450]].map(([sp, x]) => {
      const f = C.clamp((dx - x + 40) / 220);
      return [1500, [C.shadow(x, 1520, 50), C.person(sp, P.stand({ eyes: f > 0.2 ? "wide" : "angry", mouth: f > 0.2 ? "o" : "grit", look: [f > 0.2 ? 1 : -1, 0], arms: [[60 + 80 * f, 90], [-60 - 80 * f, -90]] }), x, 1520, 0.95, 1, 75 * C.ease.in(f))]];
    });
    return [wideWorld({ dx: -200 * k }), byDepth(defs), C.shadow(dx, 1580, 55), C.person(DIEGO, P.run(t * 3, { look: [1, 0], eyes: "angry", mouth: "grit" }), dx, 1580, 1),
      C.ball(dx + 80, 1565 + bounce(t, 14, 0.2), 20, 700 * t)];
  });
}

function S_keeper55(t, T) {     // "and the keeper,": Shilton dives one way, Maradona goes round him the other
  const k = C.ease.inout(t / T);
  const c = C.cam(560, 1220, 1.35);
  return C.frame(c, () => [boxWorld(), C.shadow(C.lerp(600, 380, k), 1500, 70),
    C.person(SHILTON, P.keeperReach({ arms: [[-100, -110], [-120, -130]], eyes: "wide", mouth: "o", look: [1, 0] }), C.lerp(600, 380, k), 1500, 1, 1, -80 * k),
    C.shadow(C.lerp(420, 780, k), 1600, 55), C.person(DIEGO, P.run(t * 3, { look: [1, 0], eyes: "angry", mouth: "grit" }), C.lerp(420, 780, k), 1600, 1),
    C.ball(C.lerp(500, 860, k), 1585 + bounce(t, 12, 0.2), 20, 600 * t)]);
}

function S_scored(t, T) {       // "and scored the": the ball rolls into the empty net
  const k = C.ease.out(t / T);
  const c = C.cam(610, 1200, 1.5);
  return C.frame(c, () => [boxWorld(k > 0.9 ? { inNet: [520, 1290, 19, 300 * t] } : {}), k <= 0.9 ? C.ball(C.lerp(700, 520, k), C.lerp(1560, 1290, k), C.lerp(24, 19, k), 300 * t) : "",
    C.shadow(800, 1620, 55), C.person(DIEGO, P.stand({ facing: "back", legs: [[8, 0], [-30 + 30 * k, -40 + 40 * k]], arms: [[50, 30], [-50, -30]] }), 800, 1620, 1),
    k > 0.85 ? C.speedLines(520, 1290, 110, 40, 10, 6, "#fff", 4) : ""]);
}

function S_century(t, T) {      // "Goal of the Century.": crane up over the box, the gold words standing on the grass
  const k = C.ease.inout(t / T);
  const c = C.cam(540, C.lerp(1300, 1080, k), C.lerp(1.35, 0.85, k));
  return C.frame(c, () => [wideWorld({ bob: t, arms: 0.5 }),
    C.bigText("GOAL OF", 540, 1250, 92, "#ffd24a", 12), C.bigText("THE CENTURY", 540, 1350, 92, "#ffd24a", 12),
    C.shadow(540, 1700, 45), C.person(DIEGO, P.armsUp({ lift: 25 * Math.abs(Math.sin(t * 5)) }), 540, 1700, 0.68)]);
}
