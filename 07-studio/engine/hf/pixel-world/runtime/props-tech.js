/* props-tech.js: developer / delivery prop set (package, mailbox, remote server, commit graph, terminal, editor, laptop, PR card, ...).
 * Drawing language shared with props.js: 1 px ink outline (box/ball), a 3-step ramp (dark [1], mid [2], light [3]), one white highlight
 * pixel per big surface (hl), colours only from master ramps, natural size times scale `s` through Q(). Scale table: at the workshop
 * default s = 2 every prop is 24-96 px tall against the hero's 86 px (M); at s = 1 it is 12-48 px.
 * Named states (S): fill 0-1, open 0-1, lit 0-1. Top level only registers definitions. */
'use strict';
const ptxt = (g, s, x, y, c, Q, al = 'center') => txt(g, s, x, y, Math.max(8, Q(8)), c, al);

defProp('package', { about: 'cardboard package: open shows the inside, fill tapes it shut, light sticks a shipping label on it', w: 30, h: 26, row: 'floor', fills: true, opens: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), w = Q(28), o = clamp(S.open), tape = S.fill > 0.3, lab = S.lit > 0.2;
    box(g, x, y + Q(8), w, Q(16), M.wood);
    if (o > 0.3) { R(g, x + Q(2), y + Q(9), w - Q(4), Q(3), M.dark[1]); R(g, x - Q(2), y - Q(1), Q(8), Q(8), M.wood[3]); R(g, x + w - Q(6), y - Q(1), Q(8), Q(8), M.wood[3]); R(g, x + Q(8), y + Q(2), Q(12), Q(8), M.white[2]); }
    else { box(g, x - 1, y + Q(2), w + 2, Q(8), M.wood, { hi: true }); R(g, x + Q(3), y + Q(4), w - Q(6), 1, M.wood[3]); }
    if (tape) R(g, x + w / 2 - Q(3), y + (o > 0.3 ? Q(8) : Q(2)), Q(6), Q(16) + (o > 0.3 ? 0 : Q(6)), M.sand[3]);
    if (lab) { R(g, x + Q(3), y + Q(14), Q(11), Q(8), INK); R(g, x + Q(4), y + Q(15), Q(9), Q(6), M.white[3]); R(g, x + Q(5), y + Q(16), Q(5), 1, M.steel[1]); R(g, x + Q(5), y + Q(18), Q(7), 1, M.red[2]); }
    hl(g, x + 1, y + Q(9));
  } });
defProp('mailbox', { about: 'mailbox on a post: open raises the flag, fill pushes letters out of the slot, light shows a green dot', w: 26, h: 46, row: 'floor', fills: true, opens: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), up = S.open > 0.3;
    R(g, x + Q(10), y + Q(18), Q(5), Q(28), INK); R(g, x + Q(11), y + Q(18), Q(3), Q(28), M.wood[2]); R(g, x + Q(11), y + Q(18), 1, Q(28), M.wood[3]);
    box(g, x, y + Q(4), Q(24), Q(16), M.blue); R(g, x + Q(3), y + Q(8), Q(14), Q(3), M.dark[0]);
    const peek = Math.round(Q(5) * clamp(S.fill)); if (peek > 0) { R(g, x + Q(4), y + Q(7) - peek, Q(11), peek + 1, M.white[3]); R(g, x + Q(5), y + Q(8) - peek, Q(5), 1, M.red[2]); }
    R(g, x + Q(22), up ? y - Q(3) : y + Q(9), Q(2), up ? Q(14) : Q(8), M.steel[1]); R(g, x + Q(22), up ? y - Q(3) : y + Q(9), Q(7), Q(5), M.red[2]); R(g, x + Q(22), up ? y - Q(3) : y + Q(9), Q(7), 1, M.red[3]);
    R(g, x + Q(19), y + Q(14), Q(3), Q(3), S.lit > 0.2 ? M.green[3] : M.dark[1]); hl(g, x + 1, y + Q(5));
  } });
defProp('remote-server', { about: 'remote server rack: blinking lights, an uploading bar (fill) and a received counter', w: 30, h: 48, row: 'floor', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), w = Q(28); box(g, x, y, w, Q(46), M.steel);
    R(g, x + Q(3), y + Q(3), w - Q(6), Q(9), INK); R(g, x + Q(4), y + Q(4), w - Q(8), Q(7), M.dark[1]); txt(g, 'x' + Math.round(clamp(S.fill) * 9), x + w / 2, y + Q(4), Math.max(8, Q(8)), M.green[3], 'center');
    for (let i = 0; i < 3; i++) { const yy = y + Q(14) + i * Q(8); R(g, x + Q(3), yy, w - Q(6), Q(6), M.dark[1]); R(g, x + Q(5), yy + Q(2), Q(2), Q(2), Math.floor(t * (3 + S.lit * 5) + i * 2.3) % 3 ? M.green[3] : M.dark[3]); R(g, x + Q(9), yy + Q(2), Q(2), Q(2), Math.floor(t * 5 + i * 1.7) % 4 ? M.teal[2] : M.yellow[3]); }
    const bw = w - Q(8); R(g, x + Q(3), y + Q(38), w - Q(6), Q(6), INK); R(g, x + Q(4), y + Q(39), bw, Q(4), M.dark[2]); R(g, x + Q(4), y + Q(39), bw * clamp(S.fill), Q(4), M.teal[3]); hl(g, x + 1, y + 1);
  } });
defProp('commit-nodes', { about: 'row of commit nodes joined by arrows: fill makes them appear one by one, light highlights the newest', w: 60, h: 22, row: 'bench', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), n = 1 + Math.round(clamp(S.fill) * 3);
    for (let i = 0; i < 4; i++) {
      const cx = x + Q(7) + i * Q(15), cy = y + Q(11), on = i < n;
      if (i > 0) { R(g, cx - Q(11), cy, Q(6), Math.max(1, Q(2)), on ? M.steel[3] : M.dark[3]); if (on) R(g, cx - Q(6), cy - Q(1), Q(2), Q(4), M.steel[3]); }
      if (on) ball(g, cx, cy, Q(5), i === n - 1 && S.lit > 0.2 ? M.yellow : M.teal); else { disc(g, cx, cy, Q(5), M.dark[3]); disc(g, cx, cy, Q(3), M.dark[1]); }
      if (i === n - 1 && S.lit > 0.2) glow(g, cx, cy, Q(12), M.yellow[3], 0.4);
    }
  } });
defProp('branch-graph', { about: 'branch graph: a main line and a feature branch; fill grows both, light highlights the merge', w: 56, h: 36, row: 'high', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), v = clamp(S.fill), my = y + Q(8), fy = y + Q(27), nx = (i) => x + Q(6) + i * Q(14), L2 = Math.max(1, Q(2));
    R(g, x + Q(6), my, Q(14 * 3) * Math.min(1, v * 1.4 + 0.15), L2, M.teal[2]);
    if (v > 0.3) { line(g, nx(0), my, nx(1), fy, L2, M.purple[3]); R(g, nx(1), fy, Q(14), L2, M.purple[3]); }
    if (v > 0.8) line(g, nx(2), fy, nx(3), my, L2, M.purple[3]);
    for (let i = 0; i < 4; i++) if (v * 1.4 + 0.15 >= i / 3) ball(g, nx(i), my, Q(4), i === 3 && S.lit > 0.2 ? M.yellow : M.teal);
    if (v > 0.3) ball(g, nx(1), fy, Q(4), M.purple); if (v > 0.55) ball(g, nx(2), fy, Q(4), M.purple);
  } });
defProp('terminal', { about: 'terminal window: lines get typed (fill) and a blinking cursor waits at the end', w: 52, h: 38, row: 'bench', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), w = Q(52), n = 1 + Math.floor(clamp(S.fill) * 3.99);
    box(g, x, y, w, Q(38), M.steel); R(g, x, y, w, Q(7), M.stone[2]); for (let i = 0; i < 3; i++) R(g, x + Q(3) + i * Q(5), y + Q(2), Q(3), Q(3), [M.red, M.yellow, M.green][i][3]);
    R(g, x + Q(2), y + Q(8), w - Q(4), Q(28), M.dark[0]);
    for (let i = 0; i < n; i++) { const ly = y + Q(10) + i * Q(6), ww = Q(10 + ((i * 11 + 7) % 22)); R(g, x + Q(4), ly, Q(3), Q(3), M.green[3]); R(g, x + Q(9), ly, ww, Math.max(1, Q(2)), i === n - 1 ? M.white[3] : M.teal[3]); }
    if (Math.floor(t * 2) % 2 === 0) R(g, x + Q(9) + Q(10 + (((n - 1) * 11 + 7) % 22)) + Q(2), y + Q(10) + (n - 1) * Q(6), Q(3), Q(4), M.green[4]);
    hl(g, x + 1, y + 1);
  } });
defProp('editor', { about: 'code editor window: coloured code lines scroll by (faster with light)', w: 52, h: 38, row: 'bench',
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), w = Q(52), step = Q(5), rows = 6, span = rows * step, sc = t * (5 + S.lit * 14) * (s / 2);
    box(g, x, y, w, Q(38), M.steel); R(g, x, y, w, Q(6), M.stone[2]); R(g, x + Q(3), y + Q(2), Q(12), Q(2), M.white[2]);
    R(g, x + Q(2), y + Q(7), w - Q(4), Q(29), M.blue[0]); R(g, x + Q(2), y + Q(7), Q(7), Q(29), M.dark[2]);
    const base = Math.floor(sc / step), off = sc % step;
    for (let i = 0; i <= rows; i++) {
      const yy = y + Q(9) + i * step - off, k = base + i, h0 = hs(k * 3.1), ind = Math.floor(hs(k * 1.7) * 3) * Q(4), len = Q(6 + Math.floor(h0 * 22));
      if (yy < y + Q(8) || yy > y + Q(34)) continue;
      R(g, x + Q(3), yy, Q(3), Math.max(1, Q(2)), M.steel[1]); R(g, x + Q(11) + ind, yy, len, Math.max(1, Q(2)), [M.teal, M.yellow, M.pink, M.green, M.purple][Math.floor(hs(k * 5.3) * 5)][3]);
    }
    hl(g, x + 1, y + 1);
  } });
defProp('laptop', { about: 'laptop whose screen shows code, an error (open) or success (light); fill draws a loading bar', w: 48, h: 34, row: 'bench', fills: true, opens: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), w = Q(40), err = S.open > 0.3, ok = !err && S.lit > 0.3;
    box(g, x + Q(4), y, w, Q(26), M.steel); R(g, x + Q(7), y + Q(3), w - Q(6), Q(20), err ? M.red[1] : ok ? M.green[1] : M.blue[0]);
    if (err) { line(g, x + Q(18), y + Q(8), x + Q(30), y + Q(18), Math.max(2, Q(3)), M.white[4]); line(g, x + Q(30), y + Q(8), x + Q(18), y + Q(18), Math.max(2, Q(3)), M.white[4]); }
    else if (ok) { line(g, x + Q(16), y + Q(13), x + Q(21), y + Q(18), Math.max(2, Q(3)), M.white[4]); line(g, x + Q(21), y + Q(18), x + Q(32), y + Q(7), Math.max(2, Q(3)), M.white[4]); }
    else for (let i = 0; i < 4; i++) R(g, x + Q(10) + (i % 2) * Q(3), y + Q(6) + i * Q(4), Q(10 + ((i * 9) % 16)), Math.max(1, Q(2)), [M.teal, M.yellow, M.pink, M.green][i][3]);
    if (S.fill > 0.02) { R(g, x + Q(9), y + Q(21), Q(32), Q(2), INK); R(g, x + Q(9), y + Q(21), Q(32) * clamp(S.fill), Q(2), M.green[3]); }
    box(g, x, y + Q(27), Q(48), Q(6), M.steel); R(g, x + Q(19), y + Q(28), Q(10), 1, M.steel[0]); hl(g, x + Q(5), y + 1);
  } });
defProp('pr-card', { about: 'pull-request card: open (ring), approved (fill, check) and merged (light, purple); title lines and a branch tag', w: 38, h: 46, row: 'high', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), w = Q(38), merged = S.lit > 0.3, appr = !merged && S.fill > 0.5, c = merged ? M.purple : appr ? M.green : M.blue;
    box(g, x, y, w, Q(46), M.white); R(g, x, y, w, Q(6), c[2]); R(g, x, y, w, 1, c[3]);
    R(g, x + Q(4), y + Q(10), Q(26), Math.max(1, Q(2)), M.steel[2]); R(g, x + Q(4), y + Q(15), Q(18), Math.max(1, Q(2)), M.steel[1]);
    R(g, x + Q(4), y + Q(21), Q(12), Q(5), M.teal[2]); R(g, x + Q(17), y + Q(23), Q(4), 1, M.steel[1]); R(g, x + Q(22), y + Q(21), Q(10), Q(5), M.orange[2]);
    const cx = x + Q(7), cy = y + Q(37);
    if (merged) { ball(g, cx, cy, Q(5), M.purple); line(g, cx - Q(3), cy + Q(2), cx + Q(2), cy - Q(2), Math.max(1, Q(2)), M.white[4]); }
    else if (appr) { ball(g, cx, cy, Q(5), M.green); line(g, cx - Q(2), cy, cx, cy + Q(2), Math.max(1, Q(2)), M.white[4]); line(g, cx, cy + Q(2), cx + Q(3), cy - Q(2), Math.max(1, Q(2)), M.white[4]); }
    else { ball(g, cx, cy, Q(5), M.blue); disc(g, cx, cy, Q(2), M.white[3]); }
    const lab = merged ? 'DONE' : appr ? 'OK' : 'OPEN'; if (Q(14) + txtW(lab, 8) <= Q(37)) txt(g, lab, x + Q(14), y + Q(33), 8, merged ? M.purple[1] : appr ? M.green[1] : M.blue[1], 'left');
  } });
defProp('key', { about: 'golden key that glints; light makes it sparkle', w: 30, h: 14, row: 'floor',
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), bob = Math.round(Math.sin(t * 2 + x) * Q(1));
    y += bob; ball(g, x + Q(6), y + Q(7), Q(5), M.gold); disc(g, x + Q(6), y + Q(7), Q(2), M.dark[1]);
    box(g, x + Q(11), y + Q(5), Q(16), Q(4), M.gold); box(g, x + Q(20), y + Q(8), Q(3), Q(5), M.gold); box(g, x + Q(25), y + Q(8), Q(3), Q(4), M.gold);
    if (S.lit > 0.2) { R(g, x + Q(12), y + Q(5), Q(7), 1, M.white[4]); R(g, x + Q(2), y + Q(3), 1, Q(3), M.white[4]); }
    if (S.lit > 0.2 || Math.floor(t * 1.5) % 4 === 0) sparkle(g, x + Q(15), y + Q(4), t, Math.floor(t * 1.5) / 1.5);
  } });
defProp('ci-tube', { about: 'test tube for tests/CI: fill raises the liquid with bubbles, light stamps a green check on it', w: 18, h: 44, row: 'bench', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), v = clamp(S.fill), h = Q(34), ok = S.lit > 0.3, c = ok ? M.green : M.teal;
    R(g, x + Q(3) - 1, y + Q(4) - 1, Q(10) + 2, h + 2, INK); R(g, x + Q(3), y + Q(4), Q(10), h, M.white[3]); R(g, x + Q(1), y + Q(2), Q(14), Q(3), M.steel[2]);
    R(g, x + Q(4), y + Q(4) + h - Q(28) * v, Q(8), Q(28) * v, c[2]); R(g, x + Q(4), y + Q(4) + h - Q(28) * v, Q(8), 1, c[4]);
    if (v > 0.05) for (let i = 0; i < 3; i++) { const by = ((t * 8 + i * 6) % (Q(26) * v + 1)); R(g, x + Q(5) + i * Q(2), y + Q(4) + h - by, 1, 1, M.white[4]); }
    if (ok) { line(g, x + Q(5), y + Q(14), x + Q(8), y + Q(18), Math.max(1, Q(2)), M.white[4]); line(g, x + Q(8), y + Q(18), x + Q(12), y + Q(10), Math.max(1, Q(2)), M.white[4]); }
    R(g, x + Q(4), y + Q(5), 1, Q(8), M.white[4]);
  } });
defProp('crate-stack', { about: 'stack or queue of crates: fill adds crates, light highlights the top one', w: 26, h: 52, row: 'floor', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), n = 1 + Math.round(clamp(S.fill) * 3), cs = Q(12);
    for (let i = 0; i < n; i++) { const top = i === n - 1, off = (i % 2) * Q(2) + (top ? Math.round(Math.sin(t * 3) * 0) : 0); crate(g, x + Q(6) + off, y + Q(50) - (i + 1) * (cs + 1), cs, top && S.lit > 0.2 ? M.gold : M.wood); }
  } });
defProp('sign-post', { about: 'signpost whose board reads TODO, DOING or DONE as fill rises (0, 0.5, 1)', w: 46, h: 40, row: 'floor', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), k = S.fill > 0.75 ? 2 : S.fill > 0.25 ? 1 : 0, label = ['TODO', 'DOING', 'DONE'][k], rp = [M.red, M.yellow, M.green][k];
    R(g, x + Q(21), y + Q(14), Q(4), Q(26), INK); R(g, x + Q(22), y + Q(14), Q(2), Q(26), M.wood[2]);
    const w = Math.max(Q(44), txtW(label, Math.max(8, Q(8))) + Q(6)), bx = x + Q(23) - w / 2;
    box(g, bx, y, w, Q(16), rp); ptxt(g, label, x + Q(23), y + Q(4), INK, Q);
  } });
defProp('ghost', { about: 'friendly ghost for something missing or not sent: open fades it out, light turns it red', w: 26, h: 32, row: 'floor', opens: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), by = Math.round(Math.sin(t * 2.2 + x) * Q(2)), fade = 1 - 0.65 * clamp(S.open), c = S.lit > 0.3 ? M.red : M.white;
    y += by; alpha(g, fade, () => {
      R(g, x - 1, y + Q(2) - 1, Q(24) + 2, Q(26) + 2, INK); disc(g, x + Q(12), y + Q(10), Q(11) + 1, INK); disc(g, x + Q(12), y + Q(10), Q(11), c[3]); R(g, x, y + Q(10), Q(24), Q(17), c[3]);
      for (let i = 0; i < 4; i++) R(g, x + i * Q(6), y + Q(27), Q(6), Q(3) + ((i + Math.floor(t * 3)) % 2) * Q(2), c[3]);
      R(g, x + Q(4), y + Q(4), Q(2), Q(5), M.white[4]); R(g, x + Q(8), y + Q(9), Q(3), Q(5), INK); R(g, x + Q(15), y + Q(9), Q(3), Q(5), INK); R(g, x + Q(10), y + Q(17), Q(5), Q(3), INK);
    });
  } });
defProp('trash', { about: 'trash bin: open lifts the lid, fill piles rubbish up out of it', w: 26, h: 34, row: 'floor', fills: true, opens: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), lift = Math.round(Q(8) * clamp(S.open)), v = clamp(S.fill);
    if (v > 0.1) { R(g, x + Q(4), y + Q(8) - Q(6) * v, Q(8), Q(6) * v, M.white[3]); R(g, x + Q(12), y + Q(9) - Q(7) * v, Q(7), Q(5) * v, M.yellow[2]); }
    box(g, x + Q(2), y + Q(10), Q(22), Q(23), M.steel); for (let i = 0; i < 3; i++) R(g, x + Q(6) + i * Q(6), y + Q(13), 1, Q(16), M.steel[1]);
    box(g, x, y + Q(5) - lift, Q(26), Q(5), M.steel); R(g, x + Q(9), y + Q(2) - lift, Q(8), Q(3), M.steel[3]); hl(g, x + 1, y + Q(6) - lift);
  } });
defProp('folder', { about: 'file folder: open fans out its papers, fill adds papers', w: 34, h: 28, row: 'bench', fills: true, opens: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), n = 1 + Math.round(clamp(S.fill) * 2), o = clamp(S.open);
    R(g, x, y + Q(2), Q(12), Q(4), INK); box(g, x, y + Q(4), Q(32), Q(22), M.yellow);
    for (let i = 0; i < n; i++) { R(g, x + Q(4) + i * Q(2), y + Q(1) - Q(3) * o - i, Q(22), Q(14), INK); R(g, x + Q(5) + i * Q(2), y + Q(2) - Q(3) * o - i, Q(20), Q(13), M.white[3 - (i % 2)]); R(g, x + Q(7) + i * Q(2), y + Q(5) - Q(3) * o - i, Q(12), 1, M.steel[1]); }
    box(g, x, y + Q(12) + Math.round(Q(5) * o), Q(32), Q(14) - Math.round(Q(5) * o), M.yellow); hl(g, x + 1, y + Q(13) + Math.round(Q(5) * o));
  } });
defProp('ticket-board', { about: 'kanban board of three columns; fill moves the highlighted ticket from TODO to DOING to DONE', w: 64, h: 46, row: 'high', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), w = Q(64), cw = Q(19), col = clamp(S.fill) * 2;
    box(g, x, y, w, Q(46), M.wood); R(g, x + Q(2), y + Q(2), w - Q(4), Q(42), M.stone[1]);
    for (let i = 0; i < 3; i++) { R(g, x + Q(3) + i * Q(20), y + Q(3), cw, Q(4), [M.red, M.yellow, M.green][i][2]); R(g, x + Q(3) + i * Q(20), y + Q(8), cw, Q(34), M.stone[2]); }
    for (let i = 0; i < 2; i++) { R(g, x + Q(5) + i * Q(20), y + Q(11), Q(15), Q(7), INK); R(g, x + Q(6) + i * Q(20), y + Q(12), Q(13), Q(5), M.white[2]); }
    const hx = x + Q(5) + col * Q(20), hy = y + Q(21) + (col % 1 ? -Math.round(Math.sin((col % 1) * Math.PI) * Q(3)) : 0);
    R(g, hx - 1, hy - 1, Q(15) + 2, Q(8) + 2, INK); R(g, hx, hy, Q(15), Q(8), S.lit > 0.2 ? M.yellow[3] : M.pink[2]); R(g, hx + Q(2), hy + Q(3), Q(9), 1, INK);
  } });
defProp('order-slip', { about: 'kitchen order slip hanging on a rail: fill ticks its lines, it sways when lit', w: 24, h: 38, row: 'high', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), sw = Math.round(Math.sin(t * 2.4 + x) * Q(1) * (0.4 + S.lit)), n = Math.round(clamp(S.fill) * 4);
    R(g, x - Q(4), y, Q(32), Math.max(1, Q(2)), M.steel[3]); R(g, x + Q(11), y, Q(2), Q(6), M.steel[2]);
    x += sw; R(g, x, y + Q(5) - 1, Q(22) + 2, Q(30), INK); R(g, x + 1, y + Q(5), Q(22), Q(28), M.white[3]);
    for (let i = 0; i < 4; i++) { R(g, x + Q(4), y + Q(10) + i * Q(5), Q(2), Q(2), i < n ? M.green[2] : M.steel[1]); R(g, x + Q(8), y + Q(10) + i * Q(5), Q(10 - (i % 2) * 3), Math.max(1, Q(1.4)), i < n ? M.steel[2] : M.steel[1]); }
    for (let i = 0; i < 5; i++) R(g, x + 1 + i * Q(4.4), y + Q(33) + (i % 2) * Q(1), Q(4), Q(2), M.white[3]);
  } });
defProp('ci-belt', { about: 'CI conveyor: boxes ride a belt through a check gate; lit gates stamp green checks, unlit ones red crosses', w: 66, h: 34, row: 'floor',
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), w = Q(66), by = y + Q(22), gate = x + Q(34), ok = S.lit > 0.2 || S.fill > 0.5;
    R(g, x, by, w, Q(8), INK); R(g, x + 1, by + 1, w - 2, Q(6), M.steel[1]); R(g, x + 1, by + 1, w - 2, 1, M.steel[3]);
    const off = (t * 22) % Q(6); for (let xx = x - Q(6); xx < x + w; xx += Q(6)) { const px = xx + off; if (px > x && px + Q(2) < x + w) R(g, px, by + Q(4), Q(2), 1, M.steel[0]); }
    R(g, gate - Q(2), by - Q(16), Q(3), Q(16), M.steel[2]); R(g, gate + Q(9), by - Q(16), Q(3), Q(16), M.steel[2]); box(g, gate - Q(3), by - Q(19), Q(16), Q(4), M.steel);
    for (let i = 0; i < 3; i++) {
      const bx = x + ((t * 18 + i * Q(24)) % (w + Q(10))) - Q(10), done = bx > gate; if (bx < x || bx + Q(9) > x + w) continue;
      box(g, bx, by - Q(10), Q(9), Q(9), M.wood);
      if (done) { const c = ok ? M.green : M.red; R(g, bx + Q(2), by - Q(8), Q(5), Q(5), c[2]); R(g, bx + Q(3), by - Q(7), Q(3), 1, c[4]); }
    }
  } });
defProp('deploy-pad', { about: 'rocket on a launch pad for deploys: fill lifts it off with a flame, light lights the pad beacon', w: 38, h: 54, row: 'floor', fills: true,
  draw(g, t, S, x, y, s) {
    const Q = (n) => Math.round(n * s), v = clamp(S.fill), up = Math.round(v * v * Q(18)), cx = x + Q(19), ry = y + Q(8) - up;
    R(g, x + Q(2), y + Q(46), Q(34), Q(6), INK); R(g, x + Q(3), y + Q(47), Q(32), Q(4), M.steel[2]); R(g, x + Q(3), y + Q(47), Q(32), 1, M.steel[3]);
    R(g, x + Q(6), y + Q(42), Q(3), Q(5), M.steel[1]); R(g, x + Q(29), y + Q(42), Q(3), Q(5), M.steel[1]); R(g, x + Q(30), y + Q(40), Q(2), Q(2), S.lit > 0.2 && Math.floor(t * 3) % 2 ? M.red[3] : M.dark[2]);
    if (v > 0.05) { const f = Math.floor(t * 14) % 2; R(g, cx - Q(4), ry + Q(34), Q(8), Q(8) + f * Q(2), M.fire[2]); R(g, cx - Q(2), ry + Q(34), Q(4), Q(12) + f * Q(2), M.fire[4]); }
    R(g, cx - Q(6) - Q(4), ry + Q(24), Q(5), Q(11), M.red[2]); R(g, cx + Q(6) - 1, ry + Q(24), Q(5), Q(11), M.red[2]);
    box(g, cx - Q(6), ry + Q(8), Q(12), Q(30), M.white); R(g, cx - Q(2), ry + Q(2), Q(4), Q(6), M.red[2]); R(g, cx - Q(3), ry + Q(5), Q(6), Q(4), M.red[3]); ball(g, cx, ry + Q(18), Q(3), M.blue);
  } });
