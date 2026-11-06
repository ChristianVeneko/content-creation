/* scenarios-b.js: interior scenarios. */
'use strict';
defScenario({
  id: 'library', name: 'Library of shelves', about: 'Tall bookshelves with a rolling ladder, a glowing book and a reading desk.',
  keywords: ['library', 'books', 'search', 'embedding', 'vector', 'index', 'knowledge', 'biblioteca', 'libro', 'buscar', 'read'], time: 'night',
  mid(g, t) { room(g, t, M.purple, M.wood, 300); for (const x of [135]) ceilLamp(g, x, 50, t); shelf(g, -10, 110, 100, 5, 2, ['red', 'blue', 'green', 'orange', 'purple'], 28); shelf(g, 180, 110, 100, 5, 7, ['teal', 'red', 'yellow', 'green', 'purple'], 28); },
  props: {
    ladder: { x: 100, y: 120, w: 20, h: 190, about: 'rolling ladder', draw(g, t, S) { const dx = Math.round(S.fill * 60); R(g, 100 + dx, 122, 3, 188, M.wood[1]); R(g, 117 + dx, 122, 3, 188, M.wood[1]); for (let y = 134; y < 300; y += 16) R(g, 100 + dx, y, 20, 3, M.wood[3]); } },
    book: { x: 128, y: 250, w: 26, h: 22, about: 'glowing magic book on the desk', draw(g, t, S) { box(g, 126, 256, 30, 14, M.purple); R(g, 140, 256, 2, 14, M.sand[3]); R(g, 128, 258, 11, 10, M.sand[3]); R(g, 143, 258, 11, 10, M.sand[3]); if (S.lit > 0.05 || S.open > 0.05) glow(g, 141, 250, 34, M.yellow[3], 0.6 * Math.max(S.lit, S.open)); else glow(g, 141, 252, 14, M.teal[3], 0.3); } },
    desk: { x: 100, y: 268, w: 72, h: 50, about: 'reading desk', draw(g) { deskTop(g, 100, 268, 72); } },
    lamp: { x: 40, y: 60, w: 14, h: 10, about: 'hanging lamp', draw(g, t, S) { ceilLamp(g, 47, 60, t, S.tone ? M.pink : M.yellow); } },
  },
  fore(g, t) { R(g, -20, 420, 90, 70, M.dark[0]); dust(g, t, 22, 4, M.yellow[3], 3); },
});
defScenario({
  id: 'kitchen', name: 'Restaurant kitchen', about: 'Busy kitchen: ticket rail, stove with pots, pass window and hanging pans.',
  keywords: ['kitchen', 'restaurant', 'chef', 'order', 'queue', 'server', 'thread', 'concurrency', 'cocina', 'pedido', 'cook', 'waiter', 'api'], time: 'day',
  mid(g, t) { room(g, t, M.teal, M.stone, 300, { stripe: M.white }); for (let i = 0; i < 6; i++) { const x = 20 + i * 44; R(g, x, 84, 1, 18, INK); disc(g, x, 110, 7, M.steel[2]); R(g, x - 1, 110, 3, 3, M.steel[0]); } R(g, -40, 80, 360, 3, M.steel[1]); },
  props: {
    rail: { x: 20, y: 150, w: 110, h: 60, about: 'order ticket rail', stamps: true, draw(g, t, S) { R(g, 20, 150, 110, 4, M.steel[2]); const n = Math.round(2 + S.fill * 4); for (let i = 0; i < n; i++) { const x = 26 + i * 17; R(g, x, 154, 14, 26 + (i % 2) * 8, M.white[3]); R(g, x + 2, 158, 10, 2, INK); R(g, x + 2, 163, 7, 2, INK); } if (S.ev.stamp >= 0) R(g, 60, 190, 30, 14, M.red[2]); } },
    stove: { x: 150, y: 232, w: 100, h: 70, about: 'stove with a steaming pot', draw(g, t, S) { box(g, 150, 260, 100, 56, M.steel); for (const x of [165, 215]) { const on = S.lit > 0.3 || Math.sin(t * 6 + x) > -0.2; R(g, x - 10, 256, 24, 4, M.steel[0]); R(g, x - 8, 252, 20, 4, on ? M.fire[2] : M.steel[1]); } box(g, 160, 222, 40, 30, M.steel); R(g, 154, 222, 52, 4, M.steel[3]); puffs(g, 180, 218, t, 0.2, M.white[3], 5, 40, 0.6); if (S.lit > 0.3) glow(g, 180, 250, 36, M.fire[3], 0.5); } },
    window: { x: 130, y: 124, w: 100, h: 50, about: 'pass window where plates go out', draw(g, t, S) { R(g, 130, 124, 100, 50, INK); R(g, 133, 127, 94, 44, M.orange[1]); R(g, 130, 170, 100, 6, M.steel[3]); for (let i = 0; i < 3; i++) if (S.fill * 3 > i) { disc(g, 150 + i * 30, 164, 8, M.white[3]); disc(g, 150 + i * 30, 162, 4, M.red[2]); } } },
    pot: { x: 40, y: 270, w: 30, h: 30, about: 'big pot on the floor', draw(g, t, S) { box(g, 40, 276, 30, 28, M.steel); R(g, 36, 272, 38, 5, M.steel[3]); if (S.ev.burst >= 0) puffs(g, 55, 268, t, 0.1, M.white[3], 8, 50, 1.5); } },
  },
  fore(g, t) { R(g, 230, 430, 70, 60, M.dark[0]); dust(g, t, 10, 3, M.white[3], 2); },
});
defScenario({
  id: 'bank-vault', name: 'Bank vault', about: 'Steel vault with a huge round door, tumbler lock, laser beams and safe-deposit boxes.',
  keywords: ['bank', 'vault', 'safe', 'lock', 'key', 'password', 'encryption', 'hash', '2fa', 'security', 'boveda', 'llave', 'clave', 'secret', 'private'], time: 'night',
  mid(g, t) { room(g, t, M.steel, M.stone, 310, { k: 0 }); for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { box(g, -6 + c * 10, 110 + r * 12, 8, 10, M.steel, { flat: true }); box(g, 246 + c * 10 - 20, 110 + r * 12, 8, 10, M.steel, { flat: true }); } },
  props: {
    door: { x: 55, y: 140, w: 160, h: 160, about: 'round vault door', opens: true, draw(g, t, S) { const o = Math.round(S.open * 40); disc(g, 135, 220, 86, INK); disc(g, 135, 220, 82, M.steel[1]); disc(g, 135, 220, 70, M.steel[2]); disc(g, 135, 220, 56, M.steel[1]); if (S.open > 0.05) { disc(g, 135 - o, 220, 60, M.steel[2]); } for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; R(g, 135 + Math.cos(a) * 74 - 3, 220 + Math.sin(a) * 74 - 3, 6, 6, M.steel[3]); } } },
    lock: { x: 108, y: 195, w: 54, h: 54, about: 'tumbler wheel in the middle of the door', draw(g, t, S) { const a = S.fill * 6.28 + t * 0.4 * (S.lit > 0.5 ? 0 : 0); disc(g, 135, 222, 20, M.gold[1]); disc(g, 135, 222, 6, M.gold[3]); for (let i = 0; i < 4; i++) { const k = a + i * 1.57; line(g, 135, 222, 135 + Math.cos(k) * 24, 222 + Math.sin(k) * 24, 3, M.gold[3]); disc(g, 135 + Math.cos(k) * 24, 222 + Math.sin(k) * 24, 3, M.gold[4]); } if (S.lit > 0.5) glow(g, 135, 222, 40, M.green[3], 0.6); } },
    laser: { x: 10, y: 270, w: 250, h: 30, about: 'red laser beams across the floor', draw(g, t, S) { const on = S.lit < 0.5; for (let i = 0; i < 3; i++) { const y = 280 + i * 14 + Math.round(Math.sin(t * 2 + i) * 2); if (on) { R(g, 10, y, 250, 1, M.red[3]); glow(g, 135, y, 120, M.red[2], 0.12); } } R(g, 6, 270, 6, 56, M.steel[1]); R(g, 258, 270, 6, 56, M.steel[1]); } },
    box: { x: 218, y: 250, w: 36, h: 50, about: 'safe-deposit box', draw(g, t, S) { box(g, 220, 262, 34, 40, M.steel); R(g, 226, 270, 22, 3, INK); disc(g, 237, 288, 3, M.gold[3]); } },
  },
  fore(g, t) { R(g, -20, 430, 70, 60, M.dark[0]); },
});
defScenario({
  id: 'hospital', name: 'Hospital ward', about: 'Clean ward: bed, heart monitor with a moving ECG line, IV drip and a medicine cabinet.',
  keywords: ['hospital', 'health', 'monitor', 'uptime', 'debug', 'bug', 'doctor', 'heartbeat', 'ecg', 'patient', 'check', 'hospital', 'salud', 'medico', 'ping'], time: 'day',
  mid(g, t) { room(g, t, M.teal, M.white, 300, { stripe: M.white }); R(g, 120, 90, 30, 40, M.white[3]); R(g, 134, 98, 2, 24, M.red[2]); R(g, 126, 108, 18, 2, M.red[2]); },
  props: {
    monitor: { x: 30, y: 170, w: 96, h: 80, about: 'heart monitor with ECG line', fills: true, draw(g, t, S) { box(g, 30, 170, 96, 64, M.steel); R(g, 36, 176, 84, 52, M.dark[0]); let py = 0; for (let x = 0; x < 84; x += 2) { const ph = ((x + t * 50) % 42); const y = ph < 6 ? -ph * 3 : ph < 10 ? -18 + (ph - 6) * 8 : ph < 14 ? 14 - (ph - 10) * 4 : 0; R(g, 36 + x, 202 + y * (S.lit > 0.5 ? 0.3 : 1), 2, 2, S.lit > 0.5 ? M.red[3] : M.green[3]); } R(g, 56, 234, 14, 12, M.steel[1]); R(g, 40, 246, 46, 5, M.steel[0]); } },
    bed: { x: 140, y: 240, w: 120, h: 60, about: 'hospital bed', draw(g, t, S) { box(g, 140, 262, 120, 14, M.steel); R(g, 142, 246, 90, 18, M.white[3]); R(g, 142, 246, 90, 2, M.white[4]); R(g, 142, 238, 26, 12, M.white[3]); R(g, 146, 276, 4, 40, M.steel[1]); R(g, 250, 276, 4, 40, M.steel[1]); R(g, 232, 232, 10, 32, M.teal[2]); } },
    drip: { x: 118, y: 150, w: 14, h: 120, about: 'IV drip stand', fills: true, draw(g, t, S) { R(g, 122, 160, 2, 150, M.steel[2]); R(g, 112, 308, 22, 3, M.steel[1]); R(g, 116, 140, 14, 22, M.white[3]); R(g, 117, 150 + Math.round((1 - Math.max(0.2, 1 - S.fill)) * 6), 12, 10, M.teal[2]); if (Math.floor(t * 2) % 2) R(g, 122, 170, 2, 3, M.teal[3]); } },
    cabinet: { x: 20, y: 262, w: 40, h: 60, about: 'medicine cabinet', draw(g, t, S) { box(g, 20, 262, 40, 52, M.white); R(g, 38, 264, 2, 48, M.steel[1]); R(g, 32, 284, 4, 6, M.steel[2]); R(g, 43, 284, 4, 6, M.steel[2]); R(g, 36, 270, 8, 2, M.red[2]); } },
  },
  fore(g, t) { R(g, 240, 440, 60, 50, M.dark[0]); dust(g, t, 10, 9, M.white[3], 2); },
});
defScenario({
  id: 'hotel', name: 'Hotel reception', about: 'Warm lobby: reception desk, key rack with room numbers, service bell and an elevator.',
  keywords: ['hotel', 'reception', 'key', 'room', 'permission', 'auth', 'session', 'token', 'login', 'access', 'recepcion', 'llave', 'acceso', 'badge'], time: 'day',
  mid(g, t) { room(g, t, M.red, M.wood, 300, { stripe: M.gold }); ceilLamp(g, 135, 70, t); },
  props: {
    keyrack: { x: 24, y: 140, w: 80, h: 70, about: 'key rack with numbered keys', draw(g, t, S) { box(g, 24, 140, 80, 70, M.wood); for (let i = 0; i < 6; i++) { const x = 34 + (i % 3) * 22, y = 152 + Math.floor(i / 3) * 28, on = S.lit > 0.5 && i === 4; R(g, x, y, 3, 8, on ? M.green[3] : M.gold[3]); disc(g, x + 1, y + 11, 4, on ? M.green[3] : M.gold[2]); if (on) glow(g, x, y + 8, 18, M.green[3], 0.6); } } },
    desk: { x: 90, y: 250, w: 110, h: 70, about: 'reception desk', draw(g, t, S) { box(g, 90, 270, 110, 56, M.wood); R(g, 86, 262, 118, 10, M.wood[3]); } },
    bell: { x: 130, y: 244, w: 20, h: 20, about: 'service bell', draw(g, t, S) { const p = S.ev.pulse >= 0 ? 2 : 0; R(g, 130, 262, 20, 3, M.steel[1]); disc(g, 140, 256 + p, 9, M.gold[2]); R(g, 138, 246 + p, 4, 3, M.gold[4]); if (S.ev.pulse >= 0) { R(g, 124, 246, 4, 1, '#ffffff'); R(g, 152, 246, 4, 1, '#ffffff'); } } },
    elevator: { x: 200, y: 160, w: 60, h: 140, about: 'elevator with floor indicator', opens: true, draw(g, t, S) { box(g, 200, 160, 60, 142, M.steel); const o = Math.round(S.open * 24); R(g, 206, 174, 48, 120, M.dark[1]); R(g, 206, 174, 24 - o, 120, M.steel[2]); R(g, 230 + o, 174, 24 - o, 120, M.steel[2]); txt(g, String(1 + Math.round(S.fill * 8)), 230, 162, 8, M.red[3], 'center'); } },
  },
  fore(g, t) { R(g, -20, 430, 70, 60, M.dark[0]); dust(g, t, 12, 6, M.yellow[3], 2); },
});
defScenario({
  id: 'classroom', name: 'Classroom', about: 'School classroom: green blackboard, rows of desks, a bell and an exam sheet.',
  keywords: ['school', 'class', 'classroom', 'learn', 'training', 'machine learning', 'exam', 'benchmark', 'teacher', 'aula', 'escuela', 'examen', 'estudiar', 'model'], time: 'day',
  mid(g, t) { room(g, t, M.sand, M.wood, 300, { stripe: M.green }); windowBox(g, 200, 100, 40, 50, false, M.blue); windowBox(g, 20, 100, 40, 50, false, M.blue); },
  props: {
    blackboard: { x: 64, y: 130, w: 140, h: 80, about: 'green blackboard', fills: true, draw(g, t, S) { box(g, 64, 130, 140, 80, M.wood); R(g, 70, 136, 128, 68, M.green[0]); line(g, 80, 160, 80 + S.fill * 100, 160 - S.fill * 12, 2, M.white[4]); for (let i = 0; i < 3; i++) R(g, 80 + i * 36, 184, 24 * (S.lit > 0.5 ? 1 : 0.4), 2, M.white[3]); R(g, 70, 206, 128, 3, M.wood[2]); R(g, 90, 203, 8, 3, M.white[4]); } },
    desk: { x: 90, y: 262, w: 60, h: 60, about: 'student desk', draw(g) { box(g, 90, 270, 60, 8, M.wood); R(g, 96, 278, 4, 36, M.steel[1]); R(g, 140, 278, 4, 36, M.steel[1]); } },
    exam: { x: 160, y: 232, w: 24, h: 30, about: 'exam sheet', stamps: true, draw(g, t, S) { R(g, 160, 240, 24, 30, M.white[3]); for (let i = 0; i < 4; i++) R(g, 164, 246 + i * 5, 16, 1, INK); if (S.ev.stamp >= 0.4 || S.fill > 0.9) { disc(g, 176, 262, 5, M.red[2]); } } },
    bell: { x: 220, y: 200, w: 24, h: 24, about: 'school bell', draw(g, t, S) { const sw = S.ev.pulse >= 0 ? Math.round(Math.sin(S.ev.pulse * 20) * 3) : 0; R(g, 232, 196, 1, 8, INK); disc(g, 232 + sw, 214, 10, M.gold[2]); R(g, 222 + sw, 222, 20, 3, M.gold[1]); } },
  },
  fore(g, t) { R(g, -20, 420, 80, 70, M.dark[0]); R(g, 230, 430, 70, 60, M.dark[0]); },
});
defScenario({
  id: 'gym', name: 'Gym', about: 'Weight room: barbell with plates, scoreboard, treadmill and a bench.',
  keywords: ['gym', 'train', 'training', 'weights', 'parameters', 'epochs', 'overfitting', 'workout', 'gimnasio', 'pesas', 'strength', 'effort', 'reps'], time: 'day',
  mid(g, t) { room(g, t, M.stone, M.red, 300, { stripe: M.orange }); for (let i = 0; i < 5; i++) { box(g, 10 + i * 50, 110, 26, 6, M.steel, { flat: true }); disc(g, 14 + i * 50, 122, 6, M.steel[2]); } },
  props: {
    barbell: { x: 40, y: 230, w: 130, h: 60, about: 'barbell with plates (fill adds plates)', fills: true, draw(g, t, S) { const lift = Math.round(S.ev.pulse >= 0 ? Math.sin(S.ev.pulse * Math.PI) * 10 : 0); const n = 1 + Math.round(S.fill * 3); R(g, 40, 258 - lift, 130, 4, M.steel[3]); for (let i = 0; i < n; i++) { box(g, 46 + i * 7, 240 - lift - i, 6, 40 + i * 2, M.dark, { flat: true }); box(g, 164 - i * 7, 240 - lift - i, 6, 40 + i * 2, M.dark, { flat: true }); } R(g, 40, 298, 130, 4, M.steel[1]); } },
    scoreboard: { x: 110, y: 130, w: 100, h: 50, about: 'scoreboard with LED digits', draw(g, t, S) { box(g, 110, 130, 100, 50, M.dark); const v = String(Math.round(S.fill * 99)).padStart(2, '0'); txt(g, v, 160, 146, 16, M.red[3], 'center'); if (S.lit > 0.5) glow(g, 160, 155, 40, M.red[2], 0.5); } },
    treadmill: { x: 190, y: 240, w: 76, h: 70, about: 'treadmill', draw(g, t, S) { R(g, 196, 290, 70, 8, M.steel[1]); beltH(g, 196, 262, 296, t, 60, M.dark); R(g, 250, 244, 4, 52, M.steel[2]); R(g, 236, 242, 22, 6, M.red[2]); } },
    bench: { x: 14, y: 280, w: 40, h: 30, about: 'bench', draw(g) { box(g, 14, 290, 40, 8, M.red); R(g, 20, 298, 4, 20, M.steel[1]); R(g, 44, 298, 4, 20, M.steel[1]); } },
  },
  fore(g, t) { R(g, 230, 440, 60, 50, M.dark[0]); dust(g, t, 10, 2, M.white[3], 2); },
});
defScenario({
  id: 'casino', name: 'Casino floor', about: 'Flashing casino: slot machine with spinning reels, dice table, chips and neon sign.',
  keywords: ['casino', 'slot', 'dice', 'random', 'probability', 'temperature', 'sampling', 'luck', 'gamble', 'bet', 'azar', 'suerte', 'apuesta', 'chance'], time: 'night',
  mid(g, t) { room(g, t, M.purple, M.red, 300, { k: 0 }); for (let i = 0; i < 12; i++) R(g, i * 24, 100 + (i % 2) * 4, 6, 6, Math.floor(t * 4 + i) % 3 === 0 ? M.yellow[3] : M.pink[1]); },
  props: {
    slot: { x: 70, y: 140, w: 90, h: 170, about: 'slot machine with three reels', draw(g, t, S) { box(g, 70, 140, 90, 170, M.red); R(g, 78, 170, 74, 40, INK); const spin = S.ev.pulse >= 0 || S.fill > 0 && S.fill < 1; for (let i = 0; i < 3; i++) { R(g, 82 + i * 22, 174, 18, 32, M.white[4]); const sym = spin ? Math.floor(t * 12 + i * 3) % 4 : (i + Math.round(S.fill)) % 4; disc(g, 91 + i * 22, 190, 6, [M.red, M.yellow, M.green, M.blue][sym][2]); } R(g, 78, 150, 74, 14, M.yellow[2]); txt(g, '777', 115, 152, 8, INK, 'center'); R(g, 168, 190 + (S.ev.pulse >= 0 ? 14 : 0), 4, 30, M.steel[3]); disc(g, 170, 188 + (S.ev.pulse >= 0 ? 14 : 0), 5, M.red[2]); R(g, 94, 230, 42, 6, INK); if (S.lit > 0.5) glow(g, 115, 190, 70, M.yellow[3], 0.5); } },
    dice: { x: 180, y: 260, w: 40, h: 40, about: 'big dice', draw(g, t, S) { const r = S.ev.pulse >= 0 ? Math.round(Math.abs(Math.sin(S.ev.pulse * 9)) * 14) : 0; box(g, 184, 270 - r, 28, 28, M.white); const f = Math.floor(S.fill * 5) + 1; const pts = [[0, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]]; for (let i = 0; i < Math.min(f, 5); i++) R(g, 196 + pts[i][0] * 7 - 1, 284 - r + pts[i][1] * 7 - 1, 3, 3, INK); } },
    chips: { x: 28, y: 270, w: 30, h: 40, about: 'stack of casino chips', draw(g, t, S) { const n = 3 + Math.round(S.fill * 4); for (let i = 0; i < n; i++) { R(g, 30, 306 - i * 5, 26, 5, i % 2 ? M.red[2] : M.blue[2]); R(g, 30, 306 - i * 5, 26, 1, M.white[3]); } } },
    sign: { x: 150, y: 90, w: 120, h: 30, about: 'neon sign', draw(g, t, S) { const on = Math.floor(t * 3) % 8 !== 0; if (on) { signBoard(g, 210, 96, 'LUCK', M.pink, 8); glow(g, 210, 106, 50, M.pink[2], 0.5); } else signBoard(g, 210, 96, 'LUCK', M.purple, 8); } },
  },
  fore(g, t) { R(g, -20, 430, 70, 60, M.dark[0]); dust(g, t, 18, 11, M.pink[3], 4); },
});
defScenario({
  id: 'bakery', name: 'Bakery', about: 'Warm bakery: brick oven with fire, dough table, bread shelf and a recipe book.',
  keywords: ['bakery', 'bread', 'recipe', 'algorithm', 'compile', 'build', 'cache', 'oven', 'panaderia', 'receta', 'pan', 'cook', 'cooking', 'step'], time: 'day',
  mid(g, t) { room(g, t, M.orange, M.wood, 300, { stripe: M.brick }); windowBox(g, 20, 100, 40, 40, false, M.blue); },
  props: {
    oven: { x: 150, y: 170, w: 110, h: 140, about: 'brick oven with fire', opens: true, draw(g, t, S) { brickWall(g, 150, 170, 110, 140, M.brick, 14, 8); R(g, 150, 160, 110, 12, M.stone[2]); R(g, 168, 218, 74, 56, INK); R(g, 170, 220, 70, 52, M.fire[0]); const f = Math.floor(t * 10); for (let i = 0; i < 5; i++) { const h = 14 + hs(f + i) * 14; R(g, 176 + i * 12, 270 - h, 10, h, i % 2 ? M.fire[2] : M.fire[3]); } glow(g, 205, 250, 60, M.fire[3], 0.4 + 0.5 * S.lit); R(g, 168, 218, 74, 56 - Math.round(S.open * 44), M.steel[1]); puffs(g, 205, 160, t, 0.4, M.stone[4], 5, 36, 0.4); } },
    dough: { x: 40, y: 250, w: 60, h: 40, about: 'dough on the table', fills: true, draw(g, t, S) { box(g, 30, 270, 90, 8, M.wood); R(g, 36, 278, 4, 36, M.wood[1]); R(g, 110, 278, 4, 36, M.wood[1]); const r = 10 + Math.round(S.fill * 12); disc(g, 70, 266 - r * 0.2, r, M.sand[3]); R(g, 62, 262, 5, 2, M.white[4]); } },
    shelf: { x: 20, y: 140, w: 100, h: 50, about: 'bread shelf', draw(g, t, S) { R(g, 20, 176, 100, 4, M.wood[1]); for (let i = 0; i < 4; i++) { disc(g, 34 + i * 24, 168, 9, M.orange[3]); R(g, 28 + i * 24, 163, 12, 2, M.orange[1]); } } },
    recipe: { x: 120, y: 244, w: 24, h: 20, about: 'recipe book', draw(g, t, S) { box(g, 118, 252, 26, 12, M.red); R(g, 130, 252, 2, 12, M.sand[3]); if (S.lit > 0.5) glow(g, 131, 252, 20, M.yellow[3], 0.6); } },
  },
  fore(g, t) { R(g, -20, 430, 70, 60, M.dark[0]); dust(g, t, 14, 3, M.sand[4], 2); },
});
defScenario({
  id: 'detective-office', name: 'Detective office', about: 'Noir office: corkboard with red string, desk lamp, venetian blinds and a case file.',
  keywords: ['detective', 'office', 'logs', 'forensics', 'observability', 'git blame', 'clue', 'investigate', 'noir', 'evidence', 'oficina', 'pista', 'investigar', 'trace'], time: 'night',
  mid(g, t) { room(g, t, M.stone, M.wood, 300); R(g, 190, 100, 70, 96, INK); for (let y = 104; y < 192; y += 8) R(g, 194, y, 62, 5, Math.floor(t * 0.5) % 2 ? M.steel[3] : M.steel[2]); alpha(g, 0.25, () => { for (let y = 200; y < 300; y += 10) R(g, 150, y, 110, 4, M.yellow[3]); }); },
  props: {
    corkboard: { x: 20, y: 130, w: 150, h: 90, about: 'corkboard with red string', draw(g, t, S) { box(g, 20, 130, 150, 90, M.wood); R(g, 26, 136, 138, 78, M.sand[1]); const pts = [[44, 152], [90, 168], [136, 150], [70, 198], [130, 196]]; const n = 2 + Math.round(S.fill * 3); for (let i = 0; i < pts.length; i++) { R(g, pts[i][0] - 8, pts[i][1] - 8, 16, 16, M.white[3]); R(g, pts[i][0] - 5, pts[i][1] - 4, 10, 6, M.steel[1]); disc(g, pts[i][0], pts[i][1] - 8, 2, M.red[2]); if (i > 0 && i <= n) line(g, pts[i - 1][0], pts[i - 1][1] - 8, pts[i][0], pts[i][1] - 8, 1, M.red[2]); } } },
    lamp: { x: 150, y: 232, w: 30, h: 40, about: 'desk lamp with a cone of light', draw(g, t, S) { R(g, 150, 268, 24, 4, M.steel[1]); line(g, 160, 268, 168, 246, 2, M.steel[2]); box(g, 160, 238, 18, 10, M.green, { flat: true }); glow(g, 172, 256, 38, M.yellow[3], 0.4 + 0.4 * (S.lit > 0.3 ? 1 : 0.3)); } },
    desk: { x: 90, y: 268, w: 130, h: 60, about: 'wooden desk with case file', draw(g, t, S) { box(g, 90, 272, 130, 10, M.wood); R(g, 96, 282, 6, 38, M.wood[1]); R(g, 208, 282, 6, 38, M.wood[1]); R(g, 106, 262, 28, 10, M.sand[3]); R(g, 112, 264, 14, 1, INK); } },
    magnifier: { x: 30, y: 240, w: 30, h: 40, about: 'magnifying glass', draw(g, t, S) { const o = Math.round(Math.sin(t * 2) * 2); disc(g, 44, 252 + o, 10, M.steel[2]); disc(g, 44, 252 + o, 7, M.teal[3]); line(g, 51, 260 + o, 60, 272 + o, 3, M.wood[2]); } },
  },
  fore(g, t) { R(g, -20, 430, 70, 60, M.dark[0]); R(g, 240, 420, 60, 70, M.dark[0]); puffs(g, 250, 330, t, 0.1, M.steel[3], 6, 80, 0.2); },
});
defScenario({
  id: 'warehouse', name: 'Warehouse robot', about: 'Industrial warehouse: tall racks, forklift, barcode scanner arch and stacked crates.',
  keywords: ['warehouse', 'database', 'index', 'sql', 'query', 'storage', 'rack', 'forklift', 'inventory', 'almacen', 'bodega', 'datos', 'table', 'rows'], time: 'day',
  mid(g, t) { room(g, t, M.steel, M.stone, 300, { k: 2 }); for (let x = 0; x < 3; x++) { R(g, 10 + x * 100, 130, 3, 170, M.orange[2]); } },
  props: {
    rack: { x: 20, y: 130, w: 120, h: 170, about: 'tall storage rack with boxes', draw(g, t, S) { for (let r = 0; r < 4; r++) { R(g, 14, 160 + r * 40, 132, 4, M.orange[2]); for (let c = 0; c < 4; c++) if (hs(r * 4 + c) > 0.2) crate(g, 22 + c * 30, 136 + r * 40, 24, c % 2 ? M.wood : M.sand); } if (S.lit > 0.3) { R(g, 14, 160 + 40, 132, 4, M.yellow[3]); glow(g, 80, 204, 50, M.yellow[3], 0.4); } } },
    forklift: { x: 150, y: 250, w: 80, h: 60, about: 'forklift', draw(g, t, S) { const x = 150 + Math.round(S.fill * 20); box(g, x + 20, 270, 50, 32, M.yellow); R(g, x + 30, 252, 30, 20, M.steel[3]); R(g, x + 22, 246, 4, 56, M.steel[2]); R(g, x - 4, 296, 30, 3, M.steel[3]); disc(g, x + 32, 304, 7, M.dark[1]); disc(g, x + 62, 304, 7, M.dark[1]); if (S.ev.pulse >= 0) crate(g, x - 2, 280, 18, M.wood); } },
    scanner: { x: 210, y: 170, w: 50, h: 130, about: 'barcode scanner arch', draw(g, t, S) { R(g, 214, 180, 6, 120, M.steel[1]); R(g, 256, 180, 6, 120, M.steel[1]); R(g, 214, 178, 48, 8, M.steel[2]); const on = S.lit > 0.3; if (on) { R(g, 220, 190 + ((t * 40) % 100), 36, 1, M.red[3]); glow(g, 238, 240, 40, M.red[2], 0.25); } } },
    crates: { x: 150, y: 296, w: 40, h: 40, about: 'stacked crates', draw(g) { crate(g, 156, 316, 22, M.wood); crate(g, 180, 316, 22, M.sand); crate(g, 168, 294, 22, M.wood); } },
  },
  fore(g, t) { R(g, -20, 430, 60, 60, M.dark[0]); dust(g, t, 14, 8, M.white[3], 3); },
});
defScenario({
  id: 'cinema', name: 'Cinema', about: 'Dark cinema: big screen, projector beam from the back, rows of seats and popcorn.',
  keywords: ['cinema', 'movie', 'video', 'film', 'codec', 'streaming', 'frames', 'projector', 'cine', 'pelicula', 'stream', 'watch', 'popcorn'], time: 'night',
  mid(g, t) { room(g, t, M.purple, M.red, 300, { k: 0 }); for (let i = 0; i < 6; i++) { R(g, 14 + i * 44, 300, 30, 8, M.red[1]); box(g, 14 + i * 44, 310, 30, 34, M.red); } },
  props: {
    screen: { x: 30, y: 130, w: 210, h: 120, about: 'big cinema screen', draw(g, t, S) { box(g, 30, 130, 210, 120, M.steel); R(g, 38, 138, 194, 104, S.lit > 0.2 || S.fill > 0.01 ? M.teal[2] : M.white[3]); const f = Math.floor(t * 6) % 3; if (S.lit > 0.2 || S.fill > 0.01) { R(g, 60 + f * 20, 160, 40, 40, M.yellow[3]); disc(g, 190, 180, 18, M.orange[2]); } glow(g, 135, 190, 130, M.white[4], 0.15); R(g, 38, 236, 194 * clamp(S.fill), 6, M.red[2]); } },
    projector: { x: 120, y: 40, w: 30, h: 30, about: 'projector with light beam', draw(g, t, S) { box(g, 120, 42, 30, 20, M.steel); disc(g, 135, 52, 5, M.yellow[3]); alpha(g, 0.15 + 0.1 * S.lit, () => { for (let i = 0; i < 30; i++) R(g, 135 - i * 2 + (i * 0), 62 + i * 3, 4 + i * 4, 4, M.white[4]); }); } },
    popcorn: { x: 200, y: 300, w: 30, h: 34, about: 'popcorn bucket', draw(g, t, S) { R(g, 200, 318, 26, 22, M.red[2]); for (let i = 0; i < 3; i++) R(g, 203 + i * 8, 318, 3, 22, M.white[3]); for (let i = 0; i < 5; i++) disc(g, 204 + i * 5, 314 - (i % 2) * 3, 4, M.yellow[4]); } },
    seats: { x: 10, y: 300, w: 250, h: 50, about: 'rows of red seats', draw() {} },
  },
  fore(g, t) { R(g, -20, 420, 270, 70, M.dark[0]); for (let i = 0; i < 6; i++) disc(g, 20 + i * 44, 428, 12, M.dark[1]); },
});
