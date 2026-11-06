/* scenarios-a.js: factory, arcade, dungeon, shop, post-office. Worlds are drawn in a 270x480 logical frame, ground at y=345. */
'use strict';
defScenario({
  id: 'factory', name: 'Token factory', about: 'Purple dusk factory: conveyor belt feeding a machine with gears and a chopping blade.',
  keywords: ['factory', 'machine', 'conveyor', 'tokenizer', 'process', 'pipeline', 'cut', 'split', 'industry', 'assembly'], time: 'dusk', w: 360,
  far(g, t, c) {
    skyFill(g, c, -20, 262); sunMoon(g, c, 205, 205, 26);
    for (const [x, ww, y] of [[-10, 26, 130], [34, 18, 160], [88, 22, 110], [150, 30, 150], [245, 20, 120], [300, 24, 140]]) { R(g, x, y, ww, 262 - y, M.stone[0]); R(g, x - 2, y, ww + 4, 5, M.stone[1]); puffs(g, x + ww / 2, y, t, hs(x), M.stone[3], 4, 40, 0.18); }
    R(g, -20, 232, W + 160, 40, M.dark[1]);
  },
  back(g, t, c) {
    R(g, -30, 150, 460, 150, M.stone[1]); dith(g, -30, 150, 460, 150, M.stone[1], M.stone[2], 1);
    for (let i = -1; i < 7; i++) { const x = i * 100 + 20; R(g, x - 2, 168, 46, 78, M.dark[1]); bands(g, x, 170, 244, 42, [M.purple[1], M.brick[2], M.orange[2], M.yellow[3]], 4); R(g, x + 20, 170, 2, 74, M.dark[1]); R(g, x, 205, 42, 2, M.dark[1]); }
    glow(g, 60, 205, 40, M.orange[3], 0.5); glow(g, 260, 205, 40, M.orange[3], 0.5);
  },
  mid(g, t, c) {
    ground(g, 290, 360, M.stone, { k: 0 }); for (let x = -40; x < 400; x += 8) { R(g, x, 296, 4, 4, M.yellow[1]); R(g, x + 4, 296, 4, 4, M.dark[1]); }
    for (let x = -30; x < 400; x += 46) R(g, x, 274, 6, 22, M.steel[1]);
    beltH(g, -40, 215, 262, t, 90);
  },
  props: {
    monitor: { x: 14, y: 146, w: 82, h: 66, about: 'wall monitor on the left',
      draw(g, t, S) { box(g, 14, 146, 82, 66, M.steel); R(g, 20, 152, 70, 54, M.blue[1]); dith(g, 20, 152, 70, 54, M.blue[1], M.blue[2], 2); R(g, 48, 212, 14, 10, M.steel[1]); R(g, 36, 222, 38, 4, M.steel[0]);
        if (S.lit > 0.02 || S.fill > 0) { R(g, 28, 160, 54, 30, M.white[3]); for (let i = 0; i < 3; i++) R(g, 40 + i * 12, 172 + Math.round(Math.sin(t * 8 + i * 1.3) * 2), 6, 6, M.blue[1]); txt(g, 'AI', 55, 197, 8, M.teal[3], 'center', INK); } } },
    machine: { x: 115, y: 108, w: 100, h: 154, about: 'big machine with gears and a blade', chops: true,
      draw(g, t, S) {
        const run = 1, by = S.ev.chop >= 0 ? Math.round(Math.sin(S.ev.chop * Math.PI) * 14) : 0, sx = S.ev.chop >= 0 ? Math.round(Math.sin(S.ev.chop * 40) * 1) : 0;
        R(g, 178 + sx, 112, 18, 42, M.steel[2]); R(g, 176 + sx, 108, 22, 6, M.steel[3]); puffs(g, 187 + sx, 106, t, 0.3, M.stone[4], 6, 46, 0.7);
        box(g, 115 + sx, 148, 100, 114, M.steel); R(g, 125 + sx, 158, 80, 14, M.steel[0]); txt(g, 'AI', 165 + sx, 162, 8, M.yellow[3], 'center');
        R(g, 127 + sx, 178, 76, 56, INK); R(g, 129 + sx, 180, 72, 52, M.dark[1]);
        gear(g, 150 + sx, 212, 14, 8, t * 2.4 * run, M.gold); gear(g, 182 + sx, 205, 11, 7, -t * 3 * run + 0.4, M.orange);
        R(g, 163 + sx, 180, 4, 14 + by, M.steel[3]); R(g, 160 + sx, 194 + by, 10, 3, M.white[3]);
        glow(g, 165 + sx, 205, 30, M.orange[3], 0.25);
        for (let i = 0; i < 4; i++) { const on = Math.floor(t * 4 + i) % 3 === 0, r = M[['red', 'yellow', 'green', 'teal'][i]]; R(g, 126 + sx + i * 10, 238, 7, 7, INK); R(g, 127 + sx + i * 10, 239, 5, 5, on ? r[3] : M.steel[0]); }
        R(g, 115 + sx, 240, 14, 22, INK); R(g, 201 + sx, 240, 14, 22, INK);
        if (S.ev.chop >= 0 && S.ev.chop < 0.3) alpha(g, 0.7, () => R(g, 129, 180, 72, 52, '#ffffff'));
      } },
    button: { x: 230, y: 296, w: 16, h: 50, about: 'red pedestal button',
      draw(g, t, S) { R(g, 232, 306, 12, 39, M.steel[0]); R(g, 230, 300, 16, 8, M.steel[2]); R(g, 232, 296, 12, 5, S.ev.pulse >= 0 || S.lit > 0.5 ? M.red[1] : M.red[3]); } },
    belt: { x: -40, y: 250, w: 255, h: 30, about: 'conveyor belt carrying items',
      draw(g, t, S) { /* belt is drawn in mid; props add moving crates */ for (let i = 0; i < 3; i++) { const x = ((t * 40 + i * 90) % 280) - 50; if (x < 100) crate(g, x, 244, 14, M.wood); } } },
  },
  fore(g, t) {
    R(g, -30, 410, 90, 80, M.dark[0]); R(g, -30, 410, 90, 3, M.dark[3]); R(g, -4, 380, 50, 30, M.dark[0]); R(g, 300, 420, 120, 70, M.dark[0]); R(g, 300, 420, 120, 3, M.dark[3]);
    for (const x of [20, 70, 230, 330]) { R(g, x, 0, 3, 40 + (x % 31), M.dark[0]); R(g, x - 2, 40 + (x % 31), 7, 7, M.dark[0]); }
    dust(g, t, 22, 7, M.yellow[4], 8);
  },
});

defScenario({
  id: 'arcade', name: 'Arcade cabinet', about: 'Neon arcade room: a big cabinet with a CRT screen, scoreboard and glowing floor.',
  keywords: ['arcade', 'game', 'cabinet', 'screen', 'score', 'play', 'retro', 'console', 'numbers', 'matrix'], time: 'night',
  far(g, t, c) { bands(g, -20, 0, 300, W + 60, [M.dark[1], M.purple[0], M.purple[1], M.purple[1], M.pink[0]], 8); for (const [x, y, w, h, r] of [[10, 170, 40, 90, M.pink], [210, 150, 36, 110, M.teal], [150, 190, 30, 70, M.green], [90, 160, 24, 100, M.yellow]]) { R(g, x, y, w, h, M.dark[0]); R(g, x + 3, y + 4, w - 6, h * 0.45, r[2]); glow(g, x + w / 2, y + 22, w, r[2], 0.5); } },
  back(g, t) { for (let i = 0; i < 14; i++) R(g, 8 + i * 20, 120 + (i % 3) * 6, 6, 6, Math.floor(t * 3 + i) % 4 === 0 ? M.yellow[3] : M.purple[1]); },
  mid(g, t) { ground(g, 300, W, M.purple, { specks: 0 }); for (let i = 0; i < 40; i++) R(g, (i * 23) % 300 - 20, 305 + hs(i) * 120, 2, 2, [M.teal[3], M.pink[2], M.yellow[3]][i % 3]); },
  props: {
    cabinet: { x: 36, y: 114, w: 198, h: 234, about: 'big arcade cabinet body with joystick and buttons',
      draw(g, t, S) { box(g, 36, 114, 198, 234, M.blue); R(g, 44, 122, 182, 28, INK); for (let i = 0; i < 18; i++) R(g, 47 + i * 10, 125, 6, 4, Math.floor(t * 8 + i) % 4 === 0 ? M.yellow[3] : M.wood[1]);
        R(g, 40, 268, 190, 24, M.blue[1]); const jx = Math.round(Math.sin(t * 9) * 3); R(g, 82, 274, 12, 5, INK); R(g, 87 + jx, 262, 3, 14, M.steel[3]); disc(g, 88 + jx, 261, 4, M.red[2]);
        [[M.yellow, 150], [M.green, 172], [M.teal, 194]].forEach(([r, x], i) => { const dn = Math.floor(t * 7 + i * 2) % 3 === 0 ? 1 : 0; R(g, x, 272 + dn, 10, 8, INK); R(g, x + 1, 273 + dn, 8, 5, r[2]); });
        R(g, 58, 292, 154, 40, M.blue[1]); R(g, 62, 296, 40, 22, INK); R(g, 108, 300, 3, 10, M.yellow[3]); } },
    screen: { x: 58, y: 156, w: 154, h: 106, about: 'CRT screen showing falling tokens', fills: true,
      draw(g, t, S) { g.save(); g.beginPath(); g.rect(58, 156, 154, 106); g.clip(); g.translate(58, 156);
        R(g, 0, 0, 154, 106, M.dark[1]); dith(g, 0, 0, 154, 106, M.dark[1], M.teal[0], 2);
        for (let cI = 0; cI < 14; cI++) for (let k = 0; k < 5; k++) { const y = ((t * 40 * (0.6 + hs(cI)) + hs(cI * 9) * 200 + k * 14) % 130) - 14; alpha(g, 0.35 + 0.4 * S.lit, () => txt(g, String(Math.floor(hs(cI * 7 + k + Math.floor(t * 4)) * 10)), 4 + cI * 11, y, 8, k === 0 ? M.green[4] : M.green[1])); }
        R(g, 0, 90, 154, 16, M.teal[1]);
        for (let i = 0; i < 4; i++) { const f = S.fill * 4 - i; if (f > 0) tile(g, 12 + i * 34, 90 - Math.round(Math.abs(Math.sin(f * 3)) * 6 * (f < 1 ? 1 : 0)), ['4', '8', '1', '7'][i], i, 8, { w: 28, h: 16 }); }
        for (let y = 0; y < 106; y += 3) alpha(g, 0.2, () => R(g, 0, y, 154, 1, INK)); g.restore(); R(g, 55, 153, 160, 3, INK); R(g, 55, 262, 160, 3, INK); R(g, 55, 153, 3, 112, INK); R(g, 212, 153, 3, 112, INK); glow(g, 135, 209, 90, M.teal[3], 0.22); } },
    scoreboard: { x: 90, y: 128, w: 90, h: 14, about: 'marquee above the screen', draw(g, t) { /* part of cabinet marquee */ } },
  },
  fore(g, t) { R(g, -20, 420, 80, 70, M.dark[0]); R(g, 230, 400, 70, 90, M.dark[0]); R(g, -20, 420, 80, 3, M.purple[2]); R(g, 230, 400, 70, 3, M.purple[2]); dust(g, t, 18, 21, M.teal[3], 5); },
});

defScenario({
  id: 'dungeon', name: 'Dungeon backpack', about: 'Stone dungeon with torches and a big inventory backpack panel of limited slots.',
  keywords: ['dungeon', 'backpack', 'inventory', 'memory', 'context', 'limit', 'slots', 'storage', 'mochila', 'cave', 'torch'], time: 'night',
  far(g, t) { R(g, -20, 0, 330, 320, M.stone[1]); dith(g, -20, 0, 330, 320, M.stone[1], M.stone[0], 1); R(g, 100, 110, 70, 190, M.dark[0]); R(g, 106, 104, 58, 12, M.dark[0]); },
  back(g, t) { for (let y = 0; y < 320; y += 16) { R(g, -20, y, 330, 1, M.dark[1]); for (let x = (y / 16) % 2 ? 0 : 12; x < 330; x += 24) R(g, x - 20, y, 1, 16, M.dark[1]); } for (const x of [44, 226]) glow(g, x, 188, 50, M.orange[2], 0.6 + 0.15 * Math.sin(t * 9 + x)); },
  mid(g, t) { ground(g, 300, W, M.stone, { k: 0 }); for (let y = 300; y < 480; y += 20) { R(g, -40, y, 350, 1, M.dark[1]); } for (const x of [44, 226]) { R(g, x - 2, 196, 5, 26, M.wood[1]); R(g, x - 5, 192, 11, 5, M.steel[2]); const f = Math.floor(t * 12 + x); R(g, x - 4, 176 - (hs(f) > 0.5 ? 2 : 0), 9, 16, M.fire[2]); R(g, x - 2, 170 - Math.round(hs(f + 1) * 4), 5, 14, M.fire[3]); R(g, x - 1, 178, 3, 8, M.fire[4]); } },
  props: {
    backpack: { x: 88, y: 160, w: 148, h: 126, about: 'inventory panel with 12 slots', fills: true, opens: true,
      draw(g, t, S) { const h = Math.round(122 * Math.max(S.open, S.fill > 0 ? 1 : 0)); if (h < 4) { box(g, 100, 250, 28, 34, M.green); return; }
        g.save(); g.beginPath(); g.rect(86, 158, 152, h + 6); g.clip(); const full = S.fill >= 0.99 && Math.floor(t * 8) % 2 === 0;
        R(g, 90, 162, 144, 126, full ? M.red[2] : INK); R(g, 92, 164, 140, 122, M.wood[1]); R(g, 92, 164, 140, 16, M.wood[0]);
        txt(g, Math.round(S.fill * 12) + '/12', 228, 168, 8, S.fill >= 0.99 ? M.red[3] : M.white[4], 'right');
        for (let i = 0; i < 12; i++) { const sx = 100 + (i % 4) * 32, sy = 186 + Math.floor(i / 4) * 32; R(g, sx - 1, sy - 1, 30, 30, INK); R(g, sx, sy, 28, 28, M.wood[0]); if (i < S.fill * 12 - 0.01) tile(g, sx, sy + 0, '', i, 8, { w: 28, h: 28 }); }
        g.restore(); } },
    chest: { x: 20, y: 300, w: 40, h: 34, about: 'treasure chest', draw(g, t, S) { box(g, 20, 312, 40, 24, M.wood); R(g, 20, 300 + (S.open ? 0 : 12), 40, 12, M.wood[2]); R(g, 36, 322, 8, 6, M.gold[3]); if (S.open > 0.5) glow(g, 40, 306, 24, M.yellow[3], 0.6); } },
    torch: { x: 38, y: 170, w: 14, h: 52, about: 'wall torch', draw() {} },
  },
  fore(g, t) { R(g, -20, 420, 70, 70, M.dark[0]); R(g, 250, 400, 70, 90, M.dark[0]); dust(g, t, 16, 5, M.stone[4], 4); },
});

defScenario({
  id: 'shop', name: 'Shop counter', about: 'Cosy shop: shelves of goods, a counter, a cash register and a hanging sign.',
  keywords: ['shop', 'store', 'tienda', 'buy', 'sell', 'price', 'cost', 'money', 'market', 'cash', 'merchant', 'hallucination'], time: 'day',
  mid(g, t, c) { room(g, t, M.brick, M.wood, 300, { stripe: M.yellow }); for (const x of [40, 190]) ceilLamp(g, x, 60, t); },
  props: {
    shelf: { x: 20, y: 150, w: 110, h: 100, about: 'goods shelf', draw(g, t, S) { shelf(g, 20, 150, 110, 3, 5); if (S.lit > 0.1) glow(g, 75, 200, 60, M.yellow[3], 0.4 * S.lit); } },
    counter: { x: 130, y: 262, w: 130, h: 70, about: 'shop counter', draw(g, t, S) { box(g, 130, 270, 130, 66, M.wood); R(g, 126, 262, 138, 10, M.wood[3]); R(g, 126, 262, 138, 2, M.wood[4]); for (let i = 0; i < 3; i++) R(g, 142 + i * 40, 284, 30, 40, M.wood[1]); } },
    register: { x: 196, y: 232, w: 40, h: 32, about: 'cash register with coins', stamps: true,
      draw(g, t, S) { box(g, 196, 240, 40, 24, M.steel); R(g, 202, 232, 28, 10, M.steel[3]); txt(g, S.fill > 0 ? String(Math.round(S.fill * 99)) : '0', 226, 234, 8, M.dark[1], 'right'); R(g, 200, 252, 32, 3, M.green[2]); } },
    sign: { x: 120, y: 120, w: 90, h: 24, about: 'hanging shop sign', draw(g, t, S) { R(g, 150, 100, 1, 24, INK); R(g, 190, 100, 1, 24, INK); box(g, 130, 124, 70, 18, S.tone ? M.red : M.yellow); txt(g, '$', 165, 128, 8, INK, 'center'); } },
  },
  fore(g, t) { R(g, -20, 430, 60, 60, M.dark[0]); R(g, 240, 420, 60, 70, M.dark[0]); dust(g, t, 14, 8, M.yellow[4], 3); },
});

defScenario({
  id: 'post-office', name: 'Post office hub', about: 'Sorting hub: conveyor with parcels, address label board and mailboxes.',
  keywords: ['post', 'mail', 'parcel', 'package', 'packet', 'network', 'ip', 'dns', 'address', 'delivery', 'correo', 'paquete', 'internet'], time: 'day',
  mid(g, t) { room(g, t, M.blue, M.stone, 300, { stripe: M.orange }); beltH(g, -40, 320, 282, t, 60, M.steel); for (let i = 0; i < 4; i++) { const x = ((t * 36 + i * 80) % 340) - 30; box(g, x, 258, 22, 24, M.wood); R(g, x + 8, 258, 5, 24, M.sand[3]); } },
  props: {
    board: { x: 20, y: 140, w: 100, h: 80, about: 'address label board', draw(g, t, S) { box(g, 20, 140, 100, 80, M.wood); for (let i = 0; i < 6; i++) { const x = 28 + (i % 3) * 30, y = 150 + Math.floor(i / 3) * 34, on = S.lit > 0.5 && i === 2; R(g, x, y, 24, 26, on ? M.yellow[3] : M.sand[3]); R(g, x + 3, y + 4, 18, 2, INK); R(g, x + 3, y + 9, 12, 2, INK); if (on) glow(g, x + 12, y + 13, 20, M.yellow[3], 0.6); } } },
    parcel: { x: 150, y: 232, w: 30, h: 30, about: 'big parcel', draw(g, t, S) { const dx = S.fill * 90; crate(g, 150 + dx, 232, 30, M.wood); R(g, 160 + dx, 232, 6, 30, M.sand[3]); R(g, 154 + dx, 240, 14, 8, M.white[3]); } },
    mailbox: { x: 210, y: 220, w: 40, h: 62, about: 'blue mailbox', draw(g, t, S) { box(g, 210, 230, 40, 52, M.blue); R(g, 214, 236, 32, 4, INK); R(g, 238, 224 - Math.round(S.open * 6), 4, 12, M.red[2]); R(g, 222, 268, 16, 4, M.steel[3]); } },
    chute: { x: 130, y: 90, w: 40, h: 60, about: 'parcel chute', draw(g) { pipeV(g, 140, 0, 150, M.steel, 20); R(g, 136, 146, 28, 6, M.steel[1]); } },
  },
  fore(g, t) { R(g, -20, 420, 80, 70, M.dark[0]); dust(g, t, 12, 3, M.white[3], 3); },
});
