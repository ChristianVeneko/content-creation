/* cast.js: hero designs (parametric figure), npc creatures and emote bubbles. Sizes S/M/L = 12/18/28 % of the frame
 * height; all measures go through q() so a bigger figure gets more pixels, never scaled (pixel-perfect). */
'use strict';
const SIZES = { S: 58, M: 86, L: 134 }; // pixel height of the figure in the 480 px logical frame
const sizeU = (s) => (SIZES[s] || SIZES.M) / 58;

defHero({ id: 'hoodie', name: 'Hoodie kid', about: 'Round-headed kid in an orange hoodie, dark hair, white sneakers.', kind: 'human', skin: M.skin, hair: M.wood, hairStyle: 'short', hairDark: '#3a2418', top: M.orange, bottom: M.blue, shoe: M.white, hat: 'none' });
defHero({ id: 'capgirl', name: 'Cap girl', about: 'Teal jacket, red cap and a ponytail; slimmer silhouette.', kind: 'human', skin: M.skin, hair: M.brick, hairDark: '#6e2a30', hairStyle: 'pony', top: M.teal, bottom: M.stone, shoe: M.red, hat: 'cap', hatRamp: M.red });
defHero({ id: 'wizard', name: 'Wizard', about: 'Tall pointed hat, long purple robe and a white beard.', kind: 'human', skin: M.skin, hair: M.white, hairDark: '#c0c0cc', hairStyle: 'beard', top: M.purple, bottom: M.purple, shoe: M.wood, hat: 'wizard', hatRamp: M.purple, robe: true });
defHero({ id: 'astro', name: 'Astronaut', about: 'White suit, glass helmet dome and an orange chest pack.', kind: 'human', skin: M.skin, hair: M.wood, hairDark: '#3a2418', hairStyle: 'short', top: M.white, bottom: M.white, shoe: M.steel, hat: 'helmet', hatRamp: M.white, accent: M.orange });
defHero({ id: 'robot', name: 'Robo-buddy', about: 'Boxy steel robot with a visor screen, antenna and tube legs.', kind: 'robot', top: M.steel, bottom: M.steel, shoe: M.stone, hat: 'antenna', accent: M.teal });

/* Mouth level 0..2. With SPEC.env (30 fps voice loudness envelope, 0..1) the mouth follows the real voice, a frame
 * of hold smoothing keeps it from flickering; without it the mouth cycles while a word span is active. */
function talkLevel(t) {
  const env = SPEC.env;
  if (env && env.length) {
    const i = Math.floor(t * 30);
    if (i < 0 || i >= env.length) return 0;
    const v = Math.max(env[i], (i > 0 ? env[i - 1] : 0) * 0.7);
    return v < 0.12 ? 0 : v < 0.42 ? 1 : 2;
  }
  const ws = SPEC.words;
  let lo = 0, hi = ws.length - 1, hit = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (ws[mid].start <= t) { hit = mid; lo = mid + 1; } else hi = mid - 1; }
  if (hit < 0) return 0;
  const w = ws[hit]; if (t > w.end + 0.02) return 0;
  const ph = Math.floor((t - w.start) * 10 + w.start * 3) % 4;
  return [2, 1, 2, 0][ph < 0 ? 0 : ph];
}

/* o: x,y(feet),dir,t,ph(walk phase),mv(0..1 moving),talk(0..2),mood(n|s|h|t),fa,ba (arm deg, 0=down 90=forward 180=up),lit,look,lookY,bs,sq,u,jump */
function figure(g, o, D) {
  const u = o.u || 1, q = (n) => Math.max(1, Math.round(n * u)), qs = (n) => Math.round(n * u);
  const t = o.t, dir = o.dir || 1, x = snap(o.x), y = snap(o.y - (o.jump || 0));
  const mv = o.mv || 0, ph = o.ph || 0, moving = mv > 0.2;
  const sw = Math.sin(ph), cw = Math.cos(ph);
  const idle = Math.floor(t * 3.4 + (o.bs || 0)) % 2;
  const bob = moving ? -Math.round(Math.abs(sw) * u * 1.4) : -idle * Math.max(1, Math.round(u * 0.7));
  const sqz = o.sq ? qs(o.sq) : 0;
  const robot = D.kind === 'robot';
  g.save(); g.translate(x, y); g.scale(dir, 1);
  // shadow
  alpha(g, 0.4, () => R(g, -q(11), -1, q(22), Math.max(2, q(2)), INK));
  // back arm
  const ba = (o.ba != null ? o.ba : -sw * 38 * (moving ? 1 : 0) - 6) * Math.PI / 180;
  const sy0 = -q(34) + bob, aLen = q(13);
  const sleeveB = D.top;
  line(g, -q(4), sy0, -q(4) + Math.sin(ba) * aLen, sy0 + Math.cos(ba) * aLen, q(4), sleeveB[1]);
  R(g, -q(4) + Math.sin(ba) * aLen - q(2), sy0 + Math.cos(ba) * aLen - q(2), q(4), q(4), robot ? D.shoe[2] : D.skin[1]);
  // legs
  const stride = q(5), fl = sw * stride * (moving ? 1 : 0), bl = -sw * stride * (moving ? 1 : 0);
  const fLift = moving ? Math.max(0, cw) * q(3) : 0, bLift = moving ? Math.max(0, -cw) * q(3) : 0;
  const hipY = -q(18) + bob;
  if (D.robe) {
    R(g, -q(9), hipY, q(18), q(18) - bob, D.top[2]); R(g, -q(9), -q(3), q(18), q(3), D.top[1]);
    R(g, -q(9), hipY, q(2), q(18), D.top[3]); R(g, q(7), hipY, q(2), q(18), D.top[1]);
    R(g, -q(5) + bl, -q(2) - bLift, q(6), q(3), D.shoe[2]); R(g, q(0) + fl, -q(2) - fLift, q(6), q(3), D.shoe[2]);
  } else {
    const lw = robot ? q(4) : q(5);
    line(g, -q(3), hipY, -q(3) + bl, -q(3) - bLift, lw, D.bottom[1]); R(g, -q(6) + bl, -q(3) - bLift, q(8), q(3), D.shoe[1]);
    line(g, q(3), hipY, q(3) + fl, -q(3) - fLift, lw, D.bottom[2]); R(g, q(0) + fl, -q(3) - fLift, q(8), q(3), D.shoe[2]);
    if (STYLE.shade === 'bevel') R(g, q(0) + fl, -q(3) - fLift, q(8), 1, D.shoe[4]);
  }
  // torso
  const th = q(17) - sqz, ty = -q(35) + bob + sqz;
  if (STYLE.outline !== 'none') R(g, -q(8) - 1, ty - 1, q(16) + 2, th + 2, INK);
  R(g, -q(8), ty, q(16), th, D.top[2]);
  if (STYLE.shade === 'bevel') { R(g, -q(8), ty, q(16), q(2), D.top[3]); R(g, -q(8), ty, q(2), th, D.top[3]); R(g, q(6), ty + q(2), q(2), th - q(2), D.top[1]); R(g, -q(8), ty + th - q(2), q(16), q(2), D.top[1]); }
  if (D.accent && !robot) { R(g, -q(4), ty + q(5), q(8), q(5), D.accent[2]); R(g, -q(3), ty + q(6), q(6), q(2), D.accent[4]); }
  if (D.id === 'hoodie') { R(g, -q(5), ty + q(8), q(10), q(5), D.top[1]); R(g, 0, ty + 1, 1, q(7), D.top[1]); }
  if (D.id === 'capgirl') { R(g, -q(1), ty, q(2), th, D.top[4]); }
  if (D.id === 'wizard') { R(g, -q(8), ty + q(7), q(16), q(2), D.hatRamp[4]); }
  if (robot) {
    R(g, -q(5), ty + q(4), q(10), q(7), D.accent[1]); R(g, -q(4), ty + q(5), q(8), q(5), D.accent[2]);
    R(g, -q(3) + (Math.floor(t * 4) % 3) * q(2), ty + q(6), q(2), q(2), D.accent[4]);
  }
  // head
  const hh = Math.round(Math.sin(t * 5.2 - 0.9) * 0.7 * (moving ? 0 : 1));
  const hy = -q(56) + bob + hh + sqz;
  if (robot) {
    box(g, -q(10), hy + q(2), q(20), q(17), D.top);
    R(g, -q(8), hy + q(4), q(16), q(12), INK); R(g, -q(7), hy + q(5), q(14), q(10), o.lit ? D.accent[3] : D.accent[1]);
    R(g, -q(1), hy - q(3), q(2), q(5), D.top[1]); disc(g, 0, hy - q(4), q(2), Math.floor(t * 3) % 2 ? M.red[3] : M.red[1]);
  } else {
    if (STYLE.outline !== 'none') R(g, -q(9) - 1, hy - 1, q(18) + 2, q(18) + 2, INK);
    R(g, -q(9), hy, q(18), q(18), D.skin[2]);
    if (STYLE.shade === 'bevel') { R(g, q(7), hy + q(3), q(2), q(14), D.skin[1]); R(g, -q(8), hy + q(2), q(2), q(3), D.skin[3]); }
    // hair
    const hc = D.hair;
    if (D.hairStyle === 'short') { R(g, -q(10), hy - q(2), q(20), q(6), hc[1]); R(g, -q(10), hy + q(2), q(3), q(8), hc[1]); R(g, q(3), hy + q(3), q(6), q(2), hc[1]); R(g, -q(4), hy + q(4), q(5), q(2), hc[1]); }
    if (D.hairStyle === 'pony') { R(g, -q(10), hy - q(1), q(20), q(5), hc[1]); R(g, -q(11), hy + q(2), q(4), q(8), hc[1]); R(g, -q(15), hy + q(1), q(5), q(4), hc[1]); R(g, -q(16), hy + q(5), q(4), q(8), hc[1]); }
    if (D.hairStyle === 'beard') { R(g, -q(10), hy - q(1), q(20), q(5), hc[2]); R(g, -q(10), hy + q(2), q(3), q(10), hc[2]); R(g, -q(7), hy + q(12), q(14), q(8), hc[2]); R(g, -q(5), hy + q(18), q(10), q(3), hc[1]); }
    if (D.hat === 'cap') { R(g, -q(10), hy - q(3), q(20), q(6), D.hatRamp[2]); R(g, -q(10), hy - q(3), q(20), q(2), D.hatRamp[3]); R(g, q(3), hy + q(2), q(12), q(3), D.hatRamp[1]); }
    if (D.hat === 'wizard') {
      R(g, -q(13), hy - q(1), q(26), q(4), D.hatRamp[1]); R(g, -q(9), hy - q(8), q(18), q(8), D.hatRamp[2]); R(g, -q(6), hy - q(14), q(12), q(7), D.hatRamp[2]); R(g, -q(3), hy - q(20), q(7), q(7), D.hatRamp[2]); R(g, q(1), hy - q(24), q(4), q(5), D.hatRamp[1]);
      R(g, -q(9), hy - q(2), q(18), q(2), D.hatRamp[4]); R(g, -q(1), hy - q(7), q(3), q(3), M.yellow[3]);
    }
    if (D.hat === 'helmet') {
      alpha(g, 0.55, () => { R(g, -q(13), hy - q(5), q(26), q(27), M.teal[3]); });
      R(g, -q(14), hy - q(6), q(28), q(2), D.hatRamp[3]); R(g, -q(14), hy - q(6), q(2), q(30), D.hatRamp[3]); R(g, q(12), hy - q(6), q(2), q(30), D.hatRamp[1]); R(g, -q(14), hy + q(22), q(28), q(2), D.hatRamp[1]);
    }
    // eyes
    const mood = o.mood || 'n', blink = ((t + (o.bs || 0)) % 3.3) < 0.12;
    const ey = hy + q(8), eyeW = q(mood === 's' ? 5 : 4), eyeH = q(mood === 's' ? 6 : 5);
    for (const ex of [-q(5), q(2)]) {
      if (blink || mood === 'h') {
        if (mood === 'h') { R(g, ex, ey + q(2), 1, q(2), INK); R(g, ex + 1, ey + q(1), q(2), 1, INK); R(g, ex + q(3), ey + q(2), 1, q(2), INK); } else R(g, ex, ey + q(2), eyeW, 1, INK);
      } else {
        R(g, ex, ey, eyeW, eyeH, M.white[3]);
        R(g, ex + 1 + (o.look || 0) + (eyeW > q(4) ? 1 : 0), ey + 1 + (o.lookY || 0), Math.max(1, q(2)), Math.max(2, q(3)), o.lit ? M.teal[3] : INK);
        if (o.lit) R(g, ex + 1 + (o.look || 0), ey + 1 + (o.lookY || 0), 1, 1, M.white[4]);
      }
    }
    const by = mood === 's' ? ey - q(4) : mood === 't' ? ey - q(3) : ey - q(2);
    R(g, -q(5), by, q(4), 1, D.hairDark); R(g, q(2), by + (mood === 't' ? -1 : 0), q(4), 1, D.hairDark);
    const m = o.talk || 0;
    if (D.hairStyle === 'beard') { /* mouth hidden in beard */ if (m) R(g, -q(1), hy + q(13), q(3), q(2), INK); }
    else if (mood === 'h' && !m) { R(g, -q(2), ey + q(9), q(6), 1, INK); R(g, -q(3), ey + q(8), 1, 1, INK); R(g, q(4), ey + q(8), 1, 1, INK); }
    else if (mood === 's' && !m) { R(g, -q(1), ey + q(8), q(3), q(4), INK); }
    else if (!m) R(g, -q(1), ey + q(9), q(5), 1, INK);
    else if (m === 1) { R(g, -q(1), ey + q(8), q(5), q(3), INK); R(g, 0, ey + q(10), q(3), 1, M.red[3]); }
    else { R(g, -q(2), ey + q(7), q(6), q(5), INK); R(g, -q(1), ey + q(10), q(4), q(2), M.red[3]); }
  }
  // front arm
  const fa = (o.fa != null ? o.fa : sw * 38 * (moving ? 1 : 0) + 6) * Math.PI / 180;
  line(g, q(5), sy0, q(5) + Math.sin(fa) * aLen, sy0 + Math.cos(fa) * aLen, q(4), D.top[2]);
  R(g, q(5) + Math.sin(fa) * aLen - q(2), sy0 + Math.cos(fa) * aLen - q(2), q(4), q(4), robot ? D.shoe[3] : D.skin[2]);
  g.restore();
  if (o.lit) glow(g, x + dir, y - q(46) + bob, q(10), M.teal[3], 0.4);
}

/* ---------------- npc creatures (u = size factor like the heroes) ---------------- */
defNpc({ id: 'cat', name: 'Cat', about: 'Sitting cat with a wagging tail that blinks and hops.', draw(g, o) {
  const u = o.u, q = (n) => Math.max(1, Math.round(n * u)), t = o.t, x = snap(o.x), y = snap(o.y);
  const hop = o.mv ? Math.abs(Math.sin(t * 9)) * q(3) : 0;
  g.save(); g.translate(x, y - Math.round(hop)); g.scale(o.dir || 1, 1);
  alpha(g, 0.35, () => R(g, -q(8), -1, q(16), q(2), INK));
  const tail = Math.round(Math.sin(t * 5) * q(2));
  line(g, -q(7), -q(4), -q(12), -q(10) + tail, q(3), M.orange[2]); R(g, -q(13), -q(13) + tail, q(3), q(4), M.orange[3]);
  box(g, -q(8), -q(14), q(14), q(14), M.orange);
  box(g, -q(3), -q(25), q(13), q(11), M.orange);
  R(g, -q(3), -q(29), q(3), q(5), M.orange[2]); R(g, q(6), -q(29), q(3), q(5), M.orange[2]); R(g, -q(2), -q(28), 1, q(3), M.pink[3]); R(g, q(7), -q(28), 1, q(3), M.pink[3]);
  const blink = (t % 2.9) < 0.12; R(g, q(1), -q(20), q(2), blink ? 1 : q(3), INK); R(g, q(6), -q(20), q(2), blink ? 1 : q(3), INK);
  R(g, q(4), -q(17), q(2), q(1), M.pink[2]);
  R(g, -q(5), -q(10), q(3), q(2), M.orange[4]); R(g, q(1), -q(10), q(3), q(2), M.orange[4]);
  g.restore();
} });
defNpc({ id: 'slime', name: 'Slime', about: 'Bouncing blob with two eyes; squashes on every landing.', draw(g, o) {
  const u = o.u, q = (n) => Math.max(1, Math.round(n * u)), t = o.t, x = snap(o.x), y = snap(o.y);
  const ph = (t * 1.6 + (o.bs || 0)) % 1, hop = Math.round(Math.abs(Math.sin(ph * Math.PI)) * q(9)), sq = ph < 0.1 || ph > 0.9 ? 1 : 0;
  g.save(); g.translate(x, y - hop);
  alpha(g, 0.35, () => R(g, -q(9), hop - 1, q(18), q(2), INK));
  const w = q(sq ? 20 : 16), h = q(sq ? 10 : 15), r = M.green;
  if (STYLE.outline !== 'none') { R(g, -w / 2 - 1, -h - 1, w + 2, h + 2, INK); }
  R(g, -w / 2, -h, w, h, r[3]); R(g, -w / 2 + 1, -h - 1, w - 2, 1, r[3]);
  if (STYLE.shade === 'bevel') { R(g, -w / 2, -q(2), w, q(2), r[2]); R(g, -w / 2 + q(2), -h + q(2), q(3), q(2), r[4]); }
  R(g, -q(5), -h + q(5), q(3), q(4), INK); R(g, q(2), -h + q(5), q(3), q(4), INK); R(g, -q(4), -h + q(5), 1, 1, M.white[4]); R(g, q(3), -h + q(5), 1, 1, M.white[4]);
  g.restore();
} });
defNpc({ id: 'drone', name: 'Drone', about: 'Hovering helper bot with spinning rotors and a blinking light.', draw(g, o) {
  const u = o.u, q = (n) => Math.max(1, Math.round(n * u)), t = o.t, x = snap(o.x), y = snap(o.y);
  const fl = Math.round(Math.sin(t * 3 + (o.bs || 0)) * q(3)) - q(22);
  g.save(); g.translate(x, y + fl);
  alpha(g, 0.3, () => R(g, -q(7), -fl - 1, q(14), q(2), INK));
  box(g, -q(8), -q(5), q(16), q(10), M.steel);
  R(g, -q(5), -q(2), q(10), q(4), INK); R(g, -q(4), -q(1), q(3), q(2), M.teal[3]); R(g, q(1), -q(1), q(3), q(2), M.teal[3]);
  R(g, -q(1), -q(9), q(2), q(4), M.steel[1]); disc(g, 0, -q(10), q(2), Math.floor(t * 4) % 2 ? M.red[3] : M.red[1]);
  const w = Math.floor(t * 20) % 2 ? q(10) : q(6);
  R(g, -q(14), -q(7), w, 1, M.steel[3]); R(g, q(14) - w, -q(7), w, 1, M.steel[3]); R(g, -q(12), -q(6), q(2), q(2), M.steel[1]); R(g, q(10), -q(6), q(2), q(2), M.steel[1]);
  g.restore();
} });
defNpc({ id: 'ghost', name: 'Ghost', about: 'Friendly floating ghost that sways and fades its tail.', draw(g, o) {
  const u = o.u, q = (n) => Math.max(1, Math.round(n * u)), t = o.t, x = snap(o.x), y = snap(o.y);
  const fl = Math.round(Math.sin(t * 2.4 + (o.bs || 0)) * q(3)) - q(14);
  g.save(); g.translate(x + Math.round(Math.sin(t * 1.3) * q(2)), y + fl);
  alpha(g, 0.3, () => R(g, -q(8), -fl - 1, q(16), q(2), INK));
  const r = M.white;
  if (STYLE.outline !== 'none') { R(g, -q(9), -q(20), q(18), q(24), INK); }
  R(g, -q(8), -q(19), q(16), q(22), r[2]); R(g, -q(6), -q(22), q(12), q(3), r[2]);
  for (let i = 0; i < 4; i++) { const w = q(4); R(g, -q(8) + i * w, q(3), w, ((i + Math.floor(t * 5)) % 2 ? q(3) : q(1)) + 1, r[2]); }
  R(g, -q(5), -q(14), q(3), q(4), INK); R(g, q(2), -q(14), q(3), q(4), INK); R(g, -q(2), -q(8), q(4), q(3), INK);
  g.restore();
} });
defNpc({ id: 'bug', name: 'Bug', about: 'Literal beetle that scuttles side to side on six legs.', draw(g, o) {
  const u = o.u, q = (n) => Math.max(1, Math.round(n * u)), t = o.t, x = snap(o.x), y = snap(o.y);
  g.save(); g.translate(x, y); g.scale(o.dir || 1, 1);
  alpha(g, 0.35, () => R(g, -q(9), -1, q(18), q(2), INK));
  const st = Math.floor(t * 12) % 2;
  for (let i = 0; i < 3; i++) { R(g, -q(5) + i * q(5), -q(2) - (st && i % 2 ? 1 : 0), 1, q(3), INK); }
  const r = M.red;
  if (STYLE.outline !== 'none') R(g, -q(9), -q(11), q(18), q(10), INK);
  R(g, -q(8), -q(10), q(14), q(8), r[2]); R(g, -q(8), -q(10), q(14), q(2), r[3]); R(g, -q(1), -q(10), 1, q(8), INK);
  R(g, -q(5), -q(7), q(2), q(2), INK); R(g, q(2), -q(7), q(2), q(2), INK);
  R(g, q(6), -q(9), q(5), q(6), M.dark[2]); R(g, q(9), -q(8), 1, 1, M.white[4]); R(g, q(8), -q(13), 1, q(4), INK); R(g, q(11), -q(13), 1, q(4), INK);
  g.restore();
} });

/* hero lookup + draw: kind is a hero id or an npc id */
function drawCast(g, who, o) {
  const H = HEROES[who];
  if (H) { figure(g, o, H); return; }
  const N = NPCS[who]; if (N) N.draw(g, o);
}

/* ---------------- emote bubbles ---------------- */
const GLYPH = {
  '?': ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.....', '..X..'],
  '!': ['..X..', '..X..', '..X..', '..X..', '..X..', '.....', '..X..'],
  heart: ['.X.X.', 'XXXXX', 'XXXXX', 'XXXXX', '.XXX.', '..X..', '.....'],
  star: ['..X..', '..X..', 'XXXXX', '.XXX.', '.X.X.', 'X...X', '.....'],
  idea: ['.XXX.', 'X...X', 'X...X', '.XXX.', '.XXX.', '..X..', '.XXX.'],
  dots: ['.....', '.....', '.....', 'X.X.X', '.....', '.....', '.....'],
  check: ['.....', '....X', '...XX', 'X.XX.', 'XXX..', '.X...', '.....'],
  cross: ['X...X', '.X.X.', '..X..', '.X.X.', 'X...X', '.....', '.....'],
  zzz: ['XXXX.', '..X..', '.X...', 'XXXX.', '.....', '.....', '.....'],
  coin: ['.XXX.', 'X.X.X', 'XX.XX', 'X.X.X', '.XXX.', '.....', '.....'],
  note: ['..XX.', '..X.X', '..X..', '..X..', 'XXX..', 'XXX..', '.....'],
};
const GLYPHCOL = { '?': M.red[2], '!': M.green[1], heart: M.red[2], star: M.yellow[1], idea: M.yellow[1], dots: INK, check: M.green[1], cross: M.red[2], zzz: M.blue[2], coin: M.yellow[1], note: M.purple[2] };
function bubble(g, x, y, sym, t, t0, life = 1.4) {
  const dt = t - t0; if (dt < 0 || dt > life) return;
  const p = EA.back(clamp(dt / 0.22)) * (dt > life - 0.2 ? clamp((life - dt) / 0.2) : 1);
  const w = snap(26 * p), h = snap(24 * p); if (w < 6) return;
  const bx = snap(x - w / 2), by = snap(y - h);
  R(g, bx - 1, by - 1, w + 2, h + 2, INK); R(g, bx, by, w, h, M.white[4]);
  R(g, bx + w / 2 - 3, by + h + 1, 7, 2, INK); R(g, bx + w / 2 - 2, by + h, 5, 2, M.white[4]); R(g, bx + w / 2 - 1, by + h + 2, 3, 2, INK);
  if (p > 0.8) {
    const gl = GLYPH[sym] || GLYPH['!'], s = 2, bounce = Math.round(Math.sin(dt * 14));
    const gx = bx + w / 2 - (5 * s) / 2, gy = by + h / 2 - (7 * s) / 2 + bounce;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r][c] === 'X') R(g, gx + c * s, gy + r * s, s, s, GLYPHCOL[sym] || INK);
  }
}
