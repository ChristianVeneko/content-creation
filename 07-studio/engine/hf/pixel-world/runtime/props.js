/* props.js: the PROP LIBRARY (procedural tech props with states) and the composable `workshop-stage` builder.
 * Every library prop is drawn at its natural size times a scale `s` through Q(); pixels are never stretched.
 * Prop states (S): fill 0-1, open 0-1, lit 0-1, tone, ev.{pulse,chop,stamp,burst,coins} (-1 when idle).
 * Top level only registers definitions (the node side evaluates this file to list the library). */
'use strict';
const PL = {};
function defProp(kind, d) { PL[kind] = d; }
const hl = (g, x, y) => R(g, x, y, 1, 1, M.white[4]); // the single highlight pixel of a surface (shared drawing language)
const fireRamp = (v) => (v > 0.66 ? M.red : v > 0.33 ? M.orange : M.green);
const heatRamp = (v) => (v > 0.7 ? M.fire : v > 0.4 ? M.orange : M.teal);

defProp('phone', { about: 'smartphone: screen, app grid, battery percent; open shows its internals', w: 24, h: 42, row: 'bench', fills: true, opens: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), w = Q(24), h = Q(42);
    box(g, x, y, w, h, M.steel); R(g, x + Q(2), y + Q(4), w - Q(4), h - Q(9), S.open > 0.3 ? M.dark[1] : (S.lit > 0.1 ? M.teal[1] : M.dark[2]));
    if (S.open > 0.3) { const e = clamp(S.open); R(g, x + Q(4), y + Q(8), Q(7), Q(7), M.green[2]); R(g, x + Q(13), y + Q(8), Q(7), Q(5), M.steel[3]); R(g, x + Q(4), y + Q(20), Q(16), Q(10) * e, M.gold[2]); for (let i = 0; i < 4; i++) R(g, x + Q(4) + i * Q(4), y + Q(33), Q(2), Q(2), M.teal[3]); }
    else for (let i = 0; i < 6; i++) { const on = S.lit > 0.1; R(g, x + Q(4) + (i % 3) * Q(6), y + Q(7) + Math.floor(i / 3) * Q(6), Q(4), Q(4), on ? M[TOKR[i % 6]][3] : M.dark[3]); }
    R(g, x + Q(4), y + h - Q(9), Q(16) * clamp(S.fill), Q(2), fnOn(fireRamp(1 - S.fill)[3])); R(g, x + w / 2 - Q(2), y + h - Q(4), Q(4), Q(1.5), M.steel[0]);
    if (S.lit > 0.1) glow(g, x + w / 2, y + h / 2, Q(22), M.teal[3], 0.25 * S.lit);
  } });
defProp('battery', { about: 'battery with charge segments (fill = charge level)', w: 36, h: 20, row: 'bench', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), w = Q(32), h = Q(20), n = 5, lvl = S.fill * n;
    box(g, x, y, w, h, M.steel); R(g, x + w + 1, y + Q(6), Q(3), Q(8), M.steel[3]); R(g, x + Q(2), y + Q(2), w - Q(4), h - Q(4), fnDk(M.dark[1]));
    for (let i = 0; i < n; i++) { const on = i < Math.floor(lvl) || (i === Math.floor(lvl) && Math.sin(t * 8) > 0 && lvl % 1 > 0.05); if (on) R(g, x + Q(3) + i * Q(5.6), y + Q(3), Q(4.4), h - Q(6), fnOn(fireRamp(1 - S.fill)[2])); }
    if (S.lit > 0.1) glow(g, x + w / 2, y + h / 2, Q(24), M.green[3], 0.3 * S.lit);
  } });
defProp('thermometer', { about: 'thermometer: the mercury rises with fill and turns red', w: 14, h: 48, row: 'floor', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), h = Q(40), v = clamp(S.fill), c = heatRamp(v);
    R(g, x + Q(3) - 1, y - 1, Q(6) + 2, h + 2, INK); R(g, x + Q(3), y, Q(6), h, fnLook().low ? { raw: fnLook().light } : M.white[3]); R(g, x + Q(5), y + h - Q(34) * v - Q(2), Math.max(2, Q(2)), Q(34) * v + Q(2), fnDk(c[2]));
    ball(g, x + Q(6), y + h + Q(4), Q(5), c); for (let i = 0; i < 5; i++) R(g, x + Q(10), y + Q(4) + i * Q(7), Q(3), 1, M.steel[1]);
    if (v > 0.7) glow(g, x + Q(6), y + h + Q(4), Q(14), M.red[2], 0.35);
  } });
defProp('gauge', { about: 'round dial with a needle and a red zone (fill = reading)', w: 34, h: 30, row: 'high', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), cx = x + Q(16), cy = y + Q(16), r = Q(14), a = Math.PI * (1.1 + 0.8 * clamp(S.fill)) + Math.sin(t * 20) * 0.02 * S.fill;
    ball(g, cx, cy, r, M.steel); disc(g, cx, cy, r - Q(3), M.white[3]);
    for (let i = 0; i < 9; i++) { const k = Math.PI * (1.1 + 0.8 * i / 8); R(g, cx + Math.cos(k) * (r - Q(4)), cy + Math.sin(k) * (r - Q(4)), Math.max(1, Q(1.5)), Math.max(1, Q(1.5)), i > 6 ? M.red[2] : M.steel[1]); }
    line(g, cx, cy, cx + Math.cos(a) * (r - Q(5)), cy + Math.sin(a) * (r - Q(5)), Math.max(1, Q(1.4)), fnDk(M.red[1])); disc(g, cx, cy, Math.max(1, Q(1.6)), INK);
  } });
defProp('chip', { about: 'processor chip with pins and a die; fill heats it up, light powers the cores', w: 32, h: 32, row: 'bench', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), w = Q(28), v = clamp(S.fill), c = heatRamp(v);
    for (let i = 0; i < 6; i++) { R(g, x + Q(3) + i * Q(4.4), y - Q(2), Q(2), Q(4), M.gold[2]); R(g, x + Q(3) + i * Q(4.4), y + w - Q(2), Q(2), Q(4), M.gold[2]); R(g, x - Q(2), y + Q(3) + i * Q(4.4), Q(4), Q(2), M.gold[2]); R(g, x + w - Q(2), y + Q(3) + i * Q(4.4), Q(4), Q(2), M.gold[2]); }
    box(g, x, y, w, w, M.stone); box(g, x + Q(6), y + Q(6), w - Q(12), w - Q(12), v > 0.05 ? c : M.steel);
    for (let i = 0; i < 4; i++) { const on = S.lit > 0.2 && Math.floor(t * 6 + i * 1.7) % 3 !== 0; R(g, x + Q(8) + (i % 2) * Q(6), y + Q(8) + Math.floor(i / 2) * Q(6), Q(4), Q(4), on ? M.yellow[3] : M.dark[1]); }
    if (v > 0.5) glow(g, x + w / 2, y + w / 2, Q(24), M.orange[3], 0.4 * v);
  } });
defProp('fan', { about: 'cooling fan; spins faster with light and fill', w: 32, h: 32, row: 'floor', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), cx = x + Q(16), cy = y + Q(16), sp = 2 + S.lit * 8 + S.fill * 10;
    box(g, x, y, Q(32), Q(32), M.steel); disc(g, cx, cy, Q(13), M.dark[1]);
    for (let i = 0; i < 4; i++) { const a = t * sp + i * Math.PI / 2; for (let k = 3; k <= 12; k += 3) R(g, cx + Math.cos(a + k * 0.07) * Q(k), cy + Math.sin(a + k * 0.07) * Q(k), Math.max(2, Q(3)), Math.max(2, Q(3)), M.teal[2]); }
    disc(g, cx, cy, Q(3), M.steel[3]);
  } });
defProp('cable', { about: 'cable with a plug at each end; fill sends a pulse along it', w: 44, h: 16, row: 'bench', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), w = Q(44);
    for (let i = 0; i <= w; i += 2) { const yy = y + Q(8) + Math.round(Math.sin(i / Q(5)) * Q(3)); R(g, x + i, yy, 2, Math.max(2, Q(2.5)), M.dark[2]); R(g, x + i, yy, 2, 1, M.steel[2]); }
    box(g, x - Q(2), y + Q(4), Q(6), Q(9), M.steel); box(g, x + w - Q(4), y + Q(4), Q(6), Q(9), M.steel);
    if (S.fill > 0.02 || S.lit > 0.1) { const p = ((t * 0.9) % 1) * w; R(g, x + p, y + Q(8) + Math.round(Math.sin(p / Q(5)) * Q(3)) - 1, Q(5), Q(4), M.yellow[3]); glow(g, x + p, y + Q(9), Q(10), M.yellow[3], 0.5); }
  } });
defProp('charger', { about: 'wall charger brick with prongs; light turns the LED green', w: 22, h: 30, row: 'floor',
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s);
    R(g, x + Q(5), y + Q(26), Q(3), Q(5), M.steel[3]); R(g, x + Q(14), y + Q(26), Q(3), Q(5), M.steel[3]); box(g, x, y, Q(22), Q(26), M.white);
    R(g, x + Q(8), y + Q(4), Q(6), Q(4), S.lit > 0.2 ? M.green[3] : M.red[2]); if (S.lit > 0.2) { glow(g, x + Q(11), y + Q(6), Q(16), M.green[3], 0.45); txt(g, '+', x + Q(11), y + Q(11), Math.max(8, Q(8)), M.green[1], 'center'); }
  } });
defProp('router', { about: 'wifi router with antennas and blinking LEDs', w: 34, h: 24, row: 'bench',
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s);
    R(g, x + Q(5), y - Q(10), Q(2), Q(12), M.steel[1]); R(g, x + Q(27), y - Q(10), Q(2), Q(12), M.steel[1]); box(g, x, y + Q(4), Q(34), Q(14), M.steel);
    for (let i = 0; i < 4; i++) R(g, x + Q(4) + i * Q(5), y + Q(9), Q(3), Q(3), Math.floor(t * (4 + S.lit * 8) + i * 2) % 3 ? M.green[3] : M.dark[1]);
    if (S.lit > 0.2) for (let k = 1; k <= 2; k++) alpha(g, 0.7 - k * 0.2, () => ring(g, x + Q(17), y + Q(4), Q(6 + k * 5), M.teal[3]));
  } });
defProp('wifi', { about: 'wifi symbol of arcs; fill lights more arcs', w: 30, h: 24, row: 'high', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), cx = x + Q(15), cy = y + Q(22), n = 1 + Math.round(S.fill * 2) + (S.lit > 0.2 ? 0 : 0);
    const sz = Math.max(2, Q(2.4));
    disc(g, cx, cy, Math.max(2, Q(3)) + 1, INK); disc(g, cx, cy, Math.max(2, Q(3)), M.teal[3]);
    for (const pass of [0, 1]) for (let k = 1; k <= 3; k++) { const on = k <= n, r = Q(k * 6); for (let a = -0.75; a <= 0.75; a += 0.09) { const px = cx + Math.sin(a) * r, py = cy - Math.cos(a) * r; if (pass === 0) R(g, px - 1, py - 1, sz + 2, sz + 2, INK); else R(g, px, py, sz, sz, on ? M.teal[3 - (Math.floor(t * 3) % 2 && k === n ? 1 : 0)] : M.dark[3]); } }
  } });
defProp('cloud', { about: 'cloud; fill shows an upload bar, light makes it glow', w: 44, h: 28, row: 'high', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), bob = Math.round(Math.sin(t * 1.5 + x) * 2);
    y += bob; disc(g, x + Q(12), y + Q(16), Q(9), M.white[3]); disc(g, x + Q(24), y + Q(11), Q(11), M.white[3]); disc(g, x + Q(34), y + Q(17), Q(8), M.white[3]); R(g, x + Q(8), y + Q(16), Q(30), Q(9), M.white[3]); R(g, x + Q(8), y + Q(22), Q(30), Q(3), M.white[1]);
    if (S.fill > 0.02) { R(g, x + Q(9), y + Q(19), Q(28), Q(5), { raw: fnLook().dark }); R(g, x + Q(10), y + Q(20), Q(26) * S.fill, Q(3), { raw: fnLook().fill }); const ay = y + Q(10) - Math.round(((t * 2) % 1) * Q(4)); R(g, x + Q(22), ay, Q(3), Q(7), M.teal[1]); R(g, x + Q(19), ay + Q(1), Q(9), Q(2), M.teal[1]); }
    if (S.lit > 0.1) glow(g, x + Q(22), y + Q(14), Q(30), M.white[4], 0.25 * S.lit);
  } });
defProp('padlock', { about: 'padlock; open lifts the shackle, light turns it gold', w: 22, h: 30, row: 'floor', opens: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), up = Math.round(Q(6) * clamp(S.open));
    R(g, x + Q(4), y + Q(2) - up, Q(3), Q(12), M.steel[3]); R(g, x + Q(15), y + Q(2) - up * 0.2, Q(3), Q(12), M.steel[3]); R(g, x + Q(4), y - up, Q(14), Q(3), M.steel[3]);
    box(g, x, y + Q(12), Q(22), Q(16), S.lit > 0.2 ? M.gold : M.steel); R(g, x + Q(10), y + Q(17), Q(2), Q(6), INK); disc(g, x + Q(11), y + Q(18), Math.max(1, Q(1.6)), INK);
  } });
defProp('magnifier', { about: 'magnifying glass that sways; light highlights the lens', w: 26, h: 30, row: 'bench',
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), sw = Math.round(Math.sin(t * 2) * Q(2));
    line(g, x + Q(18) + sw, y + Q(20), x + Q(25) + sw, y + Q(29), Math.max(2, Q(3)), M.wood[2]); ball(g, x + Q(11) + sw, y + Q(11), Q(10), M.steel); disc(g, x + Q(11) + sw, y + Q(11), Q(7), S.lit > 0.2 ? M.yellow[4] : M.teal[4]); R(g, x + Q(7) + sw, y + Q(7), Q(3), Q(2), M.white[4]);
  } });
defProp('bug', { about: 'software bug: a beetle with legs that crawl', w: 22, h: 18, row: 'floor',
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), k = Math.floor(t * 8) % 2, dx = Math.round(Math.sin(t * 1.3) * Q(3));
    x += dx; for (let i = 0; i < 3; i++) { R(g, x + Q(2) + i * Q(6), y + Q(13) + (k ^ (i & 1)), Q(2), Q(4), INK); R(g, x + Q(2) + i * Q(6), y + Q(2) - (k ^ (i & 1)), Q(2), Q(3), INK); }
    ball(g, x + Q(11), y + Q(9), Q(7), M.red); R(g, x + Q(10), y + Q(3), Q(2), Q(12), INK); R(g, x + Q(4), y + Q(7), Q(2), Q(2), M.white[4]); R(g, x + Q(15), y + Q(7), Q(2), Q(2), M.white[4]);
  } });
defProp('coin', { about: 'spinning gold coin (a squashed disc with a rim and a highlight); pulse or coins make it hop', w: 18, h: 18, row: 'bench',
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), sq = Math.max(0.2, Math.abs(Math.cos(t * 3 + x))), r = Q(8), cx = x + Q(9), cy = y + Q(9);
    for (let dy = -r - 1; dy <= r + 1; dy++) { const o = Math.round(Math.sqrt(Math.max(0, (r + 1) * (r + 1) - dy * dy)) * sq), i = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)) * sq); R(g, cx - o, cy + dy, o * 2, 1, INK); if (i > 0) R(g, cx - i, cy + dy, i * 2, 1, dy < -r * 0.45 ? M.gold[3] : dy > r * 0.45 ? M.gold[1] : M.gold[2]); }
    if (sq > 0.6) txt(g, '$', cx, cy - Math.round(r * 0.45), Math.max(8, Q(8)), M.gold[0], 'center'); else R(g, cx - 1, cy - r + 1, 1, Math.max(1, r - 1), M.gold[4]);
  } });
defProp('barchart', { about: 'bar chart on a board; fill raises the bars', w: 36, h: 30, row: 'high', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s); box(g, x, y, Q(36), Q(30), M.white); R(g, x + Q(3), y + Q(26), Q(30), 1, M.steel[1]);
    for (let i = 0; i < 4; i++) { const v = clamp((0.25 + 0.2 * i) * (0.3 + 0.7 * S.fill) + 0.03 * Math.sin(t * 3 + i)); R(g, x + Q(4) + i * Q(7.5), y + Q(26) - Q(22) * v, Q(5.5), Q(22) * v, fnDk(M[['teal', 'green', 'yellow', 'red'][i]][2])); }
  } });
defProp('flame', { about: 'flame; fill grows it, it flickers', w: 20, h: 28, row: 'floor', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), v = 0.45 + 0.55 * clamp(S.fill + S.lit), f = Math.floor(t * 12 + x), j = hs(f) > 0.5 ? 1 : 0, H = Q(26) * v, b = y + Q(28);
    R(g, x + Q(3) - 1, b - H * 0.7 - 1, Q(14) + 2, H * 0.7 + 2, INK); R(g, x + Q(5) - 1, b - H - 1, Q(10) - j + 2, H * 0.3 + 2, INK);
    R(g, x + Q(3), b - H * 0.7, Q(14), H * 0.7, M.fire[1]); R(g, x + Q(5), b - H, Q(10) - j, H, M.fire[2]); R(g, x + Q(7), b - H * 0.8 - j, Q(6), H * 0.7, M.fire[3]); R(g, x + Q(8), b - H * 0.4, Q(4), H * 0.35, M.fire[4]);
    glow(g, x + Q(10), b - H * 0.4, Q(24) * v, M.orange[3], 0.4);
  } });
defProp('snowflake', { about: 'snowflake for cold and cooling; light makes it sparkle', w: 24, h: 24, row: 'high',
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), cx = x + Q(12), cy = y + Q(12) + Math.round(Math.sin(t * 1.4 + x) * 2);
    for (const pass of [0, 1]) for (let a = 0; a < 6; a++) { const k = a * Math.PI / 3 + t * 0.3; for (let r = 1; r <= 11; r += 2) { const px = cx + Math.cos(k) * Q(r), py = cy + Math.sin(k) * Q(r), z = Math.max(3, Q(3)); if (pass === 0) R(g, px - 1, py - 1, z + 2, z + 2, INK); else R(g, px, py, z, z, r > 7 ? M.teal[4] : M.teal[3]); } }
    disc(g, cx, cy, Math.max(1, Q(2)), '#ffffff'); if (S.lit > 0.1) glow(g, cx, cy, Q(18), M.teal[4], 0.35);
  } });
defProp('plug', { about: 'electric plug; open pulls it away from the wall, light sparks it', w: 18, h: 30, row: 'floor', opens: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), dx = -Math.round(Q(10) * clamp(S.open));
    R(g, x + Q(15), y + Q(4), Q(3), Q(24), M.steel[1]); box(g, x + Q(2) + dx, y + Q(6), Q(14), Q(18), M.red); R(g, x - Q(4) + dx, y + Q(9), Q(6), Q(3), M.steel[3]); R(g, x - Q(4) + dx, y + Q(18), Q(6), Q(3), M.steel[3]);
    if (S.lit > 0.2 && Math.floor(t * 10) % 2) burst(g, x - Q(3) + dx, y + Q(14), Math.floor(t * 10) / 10, Math.floor(t * 10) / 10 + 0.05, 5, [M.yellow[3], '#ffffff'], 3, 20, 0, 0.3, 2);
  } });
defProp('screen', { about: 'monitor with a progress bar; light turns it on, fill moves the bar', w: 40, h: 34, row: 'bench', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), on = S.lit > 0.1 || S.fill > 0.02;
    R(g, x + Q(14), y + Q(28), Q(12), Q(4), M.steel[1]); R(g, x + Q(8), y + Q(31), Q(24), Q(3), M.steel[1]); box(g, x, y, Q(40), Q(29), M.steel);
    R(g, x + Q(3), y + Q(3), Q(34), Q(23), on ? M.blue[1] : M.dark[1]);
    if (on) { for (let i = 0; i < 3; i++) R(g, x + Q(6), y + Q(6) + i * Q(4), Q(14 + ((i * 7) % 9)), Math.max(1, Q(1.5)), M.teal[3]); R(g, x + Q(6), y + Q(18), Q(28), Q(5), fnLook().low ? { raw: fnLook().light } : M.dark[2]); R(g, x + Q(7), y + Q(19), Q(26), Q(3), fnLook().low ? { raw: fnLook().dark } : M.dark[2]); R(g, x + Q(7), y + Q(19), Q(26) * S.fill, Q(3), fnLook().low ? { raw: fnLook().light } : M.green[3]); }
  } });
defProp('keyboard', { about: 'keyboard; keys flash while typing, pulse presses a key', w: 44, h: 16, row: 'bench',
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s); box(g, x, y, Q(44), Q(16), M.steel);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) { const k = r * 8 + i, dn = (S.lit > 0.1 && Math.floor(t * 9 + k * 5) % 7 === 0) || S.ev.pulse >= 0 && (k % 8) === Math.floor(S.ev.pulse * 8); R(g, x + Q(3) + i * Q(5), y + Q(3) + r * Q(4) + (dn ? 1 : 0), Q(4), Q(3), dn ? M.yellow[3] : M.white[2]); }
  } });
defProp('bolt', { about: 'lightning bolt for power and charging; pulses', w: 16, h: 26, row: 'high',
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), k = 1 + 0.12 * Math.sin(t * 6);
    const pts = [[9, 0, 6, 11], [6, 9, 7, 6], [10, 14, 4, 12], [3, 17, 5, 3]]; for (const [px, py, pw, ph] of pts) { R(g, x + Q(px) - 1, y + Q(py) - 1, Q(pw * k) + 2, Q(ph) + 2, INK); }
    for (const [px, py, pw, ph] of pts) R(g, x + Q(px), y + Q(py), Q(pw * k), Q(ph), M.yellow[3]);
    glow(g, x + Q(8), y + Q(13), Q(20), M.yellow[3], 0.4 + 0.3 * S.lit);
  } });
defProp('gear', { about: 'turning gear; fill speeds it up', w: 28, h: 28, row: 'high', fills: true,
  draw(g, t, S, x, y, s) { const Q = (n) => Math.round(n * s); disc(g, x + Q(14), y + Q(14), Q(13), INK); gear(g, x + Q(14), y + Q(14), Q(10), 8, t * (0.8 + S.fill * 3 + S.lit), M.gold); hl(g, x + Q(8), y + Q(8)); } });
defProp('server', { about: 'server rack with blinking LEDs; fill heats it', w: 24, h: 42, row: 'floor', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s); box(g, x, y, Q(24), Q(42), M.steel);
    for (let i = 0; i < 5; i++) { R(g, x + Q(3), y + Q(3) + i * Q(7.5), Q(18), Q(5.5), M.dark[1]); R(g, x + Q(5), y + Q(5) + i * Q(7.5), Q(3), Q(2), Math.floor(t * (3 + S.lit * 6) + i * 2.3) % 3 ? M.green[3] : M.dark[3]); R(g, x + Q(16), y + Q(5) + i * Q(7.5), Q(3), Q(2), (S.fill > 0.1 + i * 0.18) ? M.red[3] : M.teal[2]); }
  } });
defProp('shield', { about: 'security shield; light shows the check, burst breaks it', w: 24, h: 28, row: 'floor',
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), c = S.lit > 0.2 ? M.green : M.blue;
    R(g, x - 1, y - 1, Q(24) + 2, Q(18) + 2, INK); R(g, x, y, Q(24), Q(18), c[2]); for (let i = 0; i < 8; i++) { const w = Q(24) - i * Q(3); R(g, x + (Q(24) - w) / 2, y + Q(18) + i * Q(1.3), w, Q(1.6), c[2]); }
    R(g, x, y, Q(3), Q(18), c[3]); if (S.lit > 0.2) { line(g, x + Q(6), y + Q(11), x + Q(10), y + Q(15), Math.max(2, Q(3)), M.white[4]); line(g, x + Q(10), y + Q(15), x + Q(18), y + Q(6), Math.max(2, Q(3)), M.white[4]); } else txt(g, '!', x + Q(12), y + Q(6), Math.max(8, Q(9)), M.white[4], 'center');
  } });
defProp('bulb', { about: 'idea bulb; light turns it on', w: 18, h: 28, row: 'high',
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), on = S.lit > 0.1; ball(g, x + Q(9), y + Q(9), Q(8), on ? M.yellow : M.steel); box(g, x + Q(5), y + Q(18), Q(8), Q(6), M.steel); R(g, x + Q(6), y + Q(25), Q(6), Q(2), M.steel[1]);
    if (on) glow(g, x + Q(9), y + Q(9), Q(26), M.yellow[3], 0.5);
  } });
defProp('clock', { about: 'wall clock; fill sweeps the minute hand', w: 26, h: 26, row: 'high', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), cx = x + Q(13), cy = y + Q(13), a = -Math.PI / 2 + (t * 0.5 + S.fill * Math.PI * 4);
    ball(g, cx, cy, Q(12), M.steel); disc(g, cx, cy, Q(9), M.white[4]); line(g, cx, cy, cx + Math.cos(a) * Q(8), cy + Math.sin(a) * Q(8), Math.max(1, Q(1.4)), INK); line(g, cx, cy, cx + Math.cos(a / 12) * Q(5), cy + Math.sin(a / 12) * Q(5), Math.max(1, Q(1.8)), M.red[1]);
  } });
defProp('database', { about: 'database cylinder; fill lights its layers', w: 24, h: 30, row: 'floor', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s);
    for (let i = 0; i < 3; i++) { const yy = y + Q(2) + i * Q(9), on = S.fill > i / 3 - 0.01; R(g, x - 1, yy - 1, Q(24) + 2, Q(9) + 2, INK); R(g, x, yy, Q(24), Q(8), on ? M.teal[2] : M.steel[1]); R(g, x, yy, Q(24), Q(2), on ? M.teal[3] : M.steel[2]); R(g, x + Q(17), yy + Q(4), Q(3), Q(2), on ? M.green[3] : M.dark[1]); }
  } });

/* Registers a library prop under a scenario: returns a regular prop definition. */
function libProp(kind, x, y, s, o = {}) {
  const d = PL[kind];
  return { x, y, w: Math.round(d.w * s), h: Math.round(d.h * s), about: o.about || d.about, kind, fills: d.fills, opens: d.opens, draw(g, t, S) { d.draw(g, t, S, x, y, s); } };
}

/* ---------------- workshop-stage: a world whose props come from the payload ---------------- */
const WS_ROWS = { floor: 345, bench: 262, high: 0 };
const WS_THEMES = ['bench', 'sky', 'grid', 'night-city'];
function workshopBuild(list, theme) {
  const rows = { floor: [], bench: [], high: [] };
  list.forEach((p, i) => { const d = PL[p.kind]; if (d) rows[p.row && rows[p.row] ? p.row : d.row].push({ p, d, i }); });
  const props = {};
  for (const row in rows) {
    const n = rows[row].length;
    rows[row].forEach(({ p, d, i }, k) => {
      const s = p.size ? { S: 2, M: 3, L: 4 }[p.size] : (n <= 1 && d.w < 36 ? 3 : 2), w = Math.round(d.w * s), h = Math.round(d.h * s);
      let fx = typeof p.at === 'number' ? (p.at > 1 ? p.at / 270 : p.at) : p.at === 'left' ? 0.2 : p.at === 'right' ? 0.8 : p.at === 'center' ? 0.5 : (k + 1) / (n + 1);
      const cx = clamp(fx * 270, w / 2 + 6, 270 - w / 2 - 6), x = Math.round(cx - w / 2);
      const y = row === 'floor' ? WS_ROWS.floor - h - 4 : row === 'bench' ? WS_ROWS.bench - h : 104 + Math.round(hs(i * 3 + 1) * 24);
      props[p.id] = libProp(p.kind, x, y, s, { about: p.id + ': ' + d.about });
    });
  }
  const th = WS_THEMES.includes(theme) ? theme : 'bench';
  return {
    id: 'workshop-stage', name: 'Workshop stage', about: '', keywords: [], time: th === 'night-city' || th === 'grid' ? 'night' : 'day', w: 270, props,
    far(g, t, c) { if (th === 'sky') { skyFill(g, c, -20, 300); clouds(g, t, 90, 5, '#ffffff', 3); clouds(g, t, 200, 4, '#ffffff', 2); } else if (th === 'night-city') { skyFill(g, c, -20, 300); stars(g, t, 28, 6, 150); skyline(g, t, 300, 4, M.steel, 9, 0.4, 60, 150); } else if (th === 'grid') bands(g, -20, 0, 300, 330, [M.dark[0], M.purple[0], M.purple[1], M.pink[0]], 8); },
    back(g, t, c) {
      if (th === 'bench') { R(g, -30, -20, 330, 340, M.stone[1]); dith(g, -30, -20, 330, 340, M.stone[1], M.stone[2], 1); for (let x = 0; x < 300; x += 18) for (let y = 60; y < 250; y += 18) R(g, x + 6, y + 6, 2, 2, M.dark[1]); R(g, -30, 40, 330, 4, M.dark[1]); }
      else if (th === 'grid') { for (let x = -40; x < 330; x += 22) R(g, x, 140, 1, 170, M.purple[2]); for (let y = 140; y < 300; y += 20) R(g, -30, y, 330, 1, M.pink[1]); glow(g, 135, 200, 120, M.pink[2], 0.18); }
    },
    mid(g, t, c) {
      if (th === 'bench' || th === 'sky') ground(g, 300, 270, th === 'sky' ? M.grass : M.wood, { specks: 0 }); else if (th === 'grid') { ground(g, 300, 270, M.purple, { specks: 0 }); for (let x = -40; x < 340; x += 24) line(g, 135 + (x - 135) * 0.2, 300, x, 480, 1, M.pink[2]); } else ground(g, 300, 270, M.stone, { specks: 12 });
      R(g, -20, 262, 310, 8, M.wood[2]); R(g, -20, 262, 310, 2, M.wood[4]); R(g, -20, 270, 310, 3, M.wood[0]); for (const x of [10, 250]) R(g, x, 273, 8, 28, M.wood[1]);
    },
    fore(g, t) { R(g, -20, 440, 60, 50, M.dark[0]); R(g, 240, 450, 60, 40, M.dark[0]); dust(g, t, 14, 8, M.white[3], 3); },
  };
}
