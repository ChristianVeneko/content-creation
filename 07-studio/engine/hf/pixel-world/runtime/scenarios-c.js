/* scenarios-c.js: outdoor and special-environment scenarios. */
'use strict';
defScenario({
  id: 'space-station', name: 'Space station', about: 'Orbital module: round window onto Earth, comms dish, airlock door and a control console.',
  keywords: ['space', 'station', 'satellite', 'api', 'latency', 'cdn', 'signal', 'orbit', 'comms', 'espacio', 'satelite', 'senal', 'cloud', 'remote'], time: 'night',
  far(g, t) { R(g, -40, -20, 360, 340, M.dark[1]); stars(g, t, 50, 3, 300); },
  mid(g, t) { R(g, -40, 90, 360, 230, M.steel[1]); dith(g, -40, 90, 360, 230, M.steel[1], M.steel[0], 1); for (let x = -20; x < 300; x += 40) R(g, x, 90, 2, 230, M.steel[0]); R(g, -40, 300, 360, 8, M.steel[3]); ground(g, 308, W, M.steel, { specks: 0 }); for (let x = 0; x < 300; x += 18) R(g, x, 330, 8, 2, M.yellow[2]); },
  props: {
    window: { x: 60, y: 120, w: 150, h: 100, about: 'round window showing Earth', draw(g, t, S) { disc(g, 135, 170, 56, INK); disc(g, 135, 170, 52, M.dark[0]); stars(g, t, 12, 8, 0); disc(g, 135, 200, 40, M.water[2]); disc(g, 125, 195, 14, M.grass[2]); disc(g, 150, 210, 10, M.grass[2]); const s = Math.floor(t * 3); if (S.lit > 0.3) { R(g, 100 + (t * 30) % 70, 140, 3, 3, M.yellow[4]); glow(g, 135, 170, 60, M.teal[3], 0.3); } } },
    dish: { x: 200, y: 200, w: 60, h: 100, about: 'comms dish that pulses signal rings', draw(g, t, S) { R(g, 228, 250, 4, 50, M.steel[2]); const a = Math.sin(t) * 0.2; disc(g, 230, 240, 16, M.steel[3]); disc(g, 234, 236, 12, M.steel[2]); R(g, 237, 218, 2, 18, M.steel[3]); disc(g, 238, 216, 3, M.red[2]); const k = S.lit > 0.3 || S.ev.pulse >= 0; if (k) for (let i = 0; i < 3; i++) { const r = ((t * 20 + i * 12) % 36); alpha(g, 1 - r / 36, () => { R(g, 238 + r, 214 - r * 0.4, 1, 6, M.teal[3]); R(g, 238 + r * 0.7, 214 - r, 6, 1, M.teal[3]); }); } } },
    airlock: { x: 10, y: 180, w: 50, h: 120, about: 'airlock hatch', opens: true, draw(g, t, S) { box(g, 10, 190, 50, 112, M.steel); const o = Math.round(S.open * 18); R(g, 16, 198, 38, 96, M.dark[0]); R(g, 16, 198, 19 - o, 96, M.orange[2]); R(g, 35 + o, 198, 19 - o, 96, M.orange[2]); R(g, 30, 190, 10, 6, S.open > 0.3 ? M.green[2] : M.red[2]); } },
    console: { x: 70, y: 260, w: 120, h: 60, about: 'control console with lights', draw(g, t, S) { box(g, 70, 270, 120, 50, M.steel); screenBox(g, 80, 276, 40, 28, true, t, M.green); for (let i = 0; i < 6; i++) R(g, 130 + i * 8, 280, 5, 5, Math.floor(t * 3 + i) % 3 === 0 || S.lit > 0.5 ? M.red[3] : M.steel[0]); R(g, 130, 294, 52, 6, M.steel[0]); } },
  },
  fore(g, t) { R(g, -20, 430, 70, 60, M.dark[0]); R(g, 230, 420, 60, 70, M.dark[0]); },
});
defScenario({
  id: 'farm', name: 'Farm', about: 'Sunny farm: red barn with a silo, crop rows to harvest, a tractor and a windmill.',
  keywords: ['farm', 'harvest', 'crops', 'data pipeline', 'etl', 'cache', 'granja', 'cosechar', 'campo', 'grow', 'barn', 'tractor', 'field', 'plant'], time: 'day', w: 360,
  far(g, t, c) { outdoor(g, c, 300, M.grass); },
  mid(g, t) { ground(g, 300, 360, M.grass, { k: 0, specks: 20 }); for (let r = 0; r < 3; r++) R(g, -40, 330 + r * 22, 440, 3, M.wood[1]); },
  props: {
    barn: { x: 20, y: 190, w: 120, h: 110, about: 'red barn', opens: true, draw(g, t, S) { box(g, 20, 220, 120, 80, M.red); R(g, 14, 206, 132, 16, M.red[1]); R(g, 30, 196, 100, 14, M.red[1]); R(g, 26, 190, 108, 8, M.red[0]); const o = Math.round(S.open * 18); R(g, 60, 246, 40, 54, M.wood[0]); R(g, 60, 246, 20 - o, 54, M.white[3]); R(g, 80 + o, 246, 20 - o, 54, M.white[3]); line(g, 60, 246, 80, 300, 2, M.red[1]); } },
    silo: { x: 150, y: 170, w: 40, h: 130, about: 'grain silo (fill raises the level mark)', fills: true, draw(g, t, S) { box(g, 150, 190, 40, 110, M.steel); disc(g, 170, 190, 20, M.steel[3]); R(g, 156, 296 - Math.round(S.fill * 90), 6, 4, M.yellow[3]); for (let y = 200; y < 296; y += 14) R(g, 150, y, 40, 1, M.steel[1]); } },
    crops: { x: 200, y: 300, w: 150, h: 50, about: 'crop rows that pop up as harvest', draw(g, t, S) { for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) { const k = (r * 8 + i) / 16, h = 6 + Math.round(clamp(S.fill * 1.4 - k * 0.4) * 8); const x = 206 + i * 18, y = 322 + r * 18; R(g, x, y - h, 3, h, M.green[2]); disc(g, x + 1, y - h - 2, 4, S.tone ? M.orange[2] : M.green[3]); if (S.fill > 0.99) disc(g, x + 1, y - h - 2, 3, M.orange[2]); } } },
    tractor: { x: 120, y: 270, w: 70, h: 50, about: 'tractor', draw(g, t, S) { const x = 214 - Math.round(S.fill * 20); box(g, x, 290, 44, 20, M.green); R(g, x + 26, 274, 18, 18, M.green[2]); R(g, x + 28, 276, 12, 10, M.teal[3]); disc(g, x + 10, 318, 12, M.dark[1]); disc(g, x + 38, 322, 8, M.dark[1]); R(g, x + 6, 278, 3, 12, M.steel[2]); puffs(g, x + 7, 276, t, 0.4, M.stone[4], 4, 20, 0.6); } },
  },
  fore(g, t) { for (let i = 0; i < 12; i++) { const x = i * 34; R(g, x, 440 + hs(i) * 20, 3, 40, M.grass[0]); R(g, x + 3, 446, 2, 34, M.grass[1]); } fireflies(g, t, 6, 3, 360, 60); },
});
defScenario({
  id: 'train-station', name: 'Train station', about: 'Dusk platform: a train on rails, track switch, departure board and a signal light.',
  keywords: ['train', 'station', 'rail', 'routing', 'load balancing', 'ci', 'cd', 'deploy', 'switch', 'tren', 'estacion', 'via', 'request', 'route', 'depart'], time: 'dusk', w: 360,
  far(g, t, c) { skyFill(g, c, -20, 250); sunMoon(g, c, 70, 200, 20); skyline(g, t, 250, 5, M.stone, 11, 0.25); },
  mid(g, t) { ground(g, 300, 360, M.stone, { k: 0 }); R(g, -40, 296, 440, 6, M.sand[2]); for (let x = -30; x < 400; x += 14) R(g, x, 332, 8, 3, M.wood[1]); R(g, -40, 336, 440, 2, M.steel[3]); R(g, -40, 346, 440, 2, M.steel[3]); },
  props: {
    train: { x: 40, y: 240, w: 180, h: 100, about: 'train car on the rails', draw(g, t, S) { const x = 40 + Math.round(EA.io(clamp(S.fill)) * 150); for (let k = 0; k < 2; k++) { const xx = x + k * 98 - 98; box(g, xx, 250, 92, 70, M.blue); R(g, xx, 296, 92, 6, M.blue[1]); for (let i = 0; i < 3; i++) windowBox(g, xx + 8 + i * 28, 262, 20, 18, S.lit > 0.2 || i === 1, M.teal); disc(g, xx + 20, 324, 8, M.dark[1]); disc(g, xx + 70, 324, 8, M.dark[1]); } box(g, x + 92, 240, 40, 80, M.red); R(g, x + 102, 228, 10, 14, M.steel[1]); puffs(g, x + 107, 226, t, 0.5, M.white[3], 5, 30, 0.6); R(g, x + 130, 300, 6, 20, M.steel[3]); } },
    board: { x: 230, y: 130, w: 100, h: 50, about: 'departure board', draw(g, t, S) { box(g, 230, 130, 100, 50, M.dark); for (let i = 0; i < 3; i++) { R(g, 238, 138 + i * 13, 24, 6, M.yellow[2]); R(g, 270, 138 + i * 13, 48, 6, i === 1 && S.lit > 0.3 ? M.green[3] : M.steel[2]); } } },
    signal: { x: 330, y: 200, w: 20, h: 100, about: 'rail signal light', draw(g, t, S) { R(g, 338, 220, 4, 80, M.steel[1]); box(g, 332, 200, 16, 28, M.dark); disc(g, 340, 208, 4, S.lit > 0.3 || S.fill > 0.5 ? M.green[3] : M.red[3]); disc(g, 340, 220, 4, M.dark[2]); if (S.lit > 0.3) glow(g, 340, 208, 14, M.green[3], 0.6); else glow(g, 340, 208, 14, M.red[3], 0.5); } },
    switch: { x: 200, y: 316, w: 40, h: 30, about: 'track switch lever', draw(g, t, S) { const a = S.open || S.fill; R(g, 210, 330, 6, 8, M.steel[1]); line(g, 213, 330, 213 + Math.round((a - 0.5) * 16), 316, 3, M.red[2]); disc(g, 213 + Math.round((a - 0.5) * 16), 314, 4, M.red[3]); } },
  },
  fore(g, t) { R(g, 300, 400, 100, 80, M.dark[0]); R(g, -20, 430, 70, 60, M.dark[0]); },
});
defScenario({
  id: 'wizard-tower', name: 'Wizard tower', about: 'Magic lab: bubbling cauldron, spellbook, glowing crystal and a window with moon.',
  keywords: ['wizard', 'magic', 'spell', 'prompt', 'llm', 'function', 'potion', 'cauldron', 'mago', 'hechizo', 'tower', 'ai', 'model', 'generate'], time: 'night',
  mid(g, t) { room(g, t, M.purple, M.stone, 300, { k: 0 }); R(g, 105, 100, 60, 74, INK); disc(g, 135, 120, 30, INK); R(g, 108, 104, 54, 70, SKYS.night[3]); disc(g, 135, 120, 27, SKYS.night[3]); stars(g, t, 6, 2, 0); disc(g, 148, 124, 9, M.white[3]); disc(g, 144, 121, 8, SKYS.night[3]); },
  props: {
    cauldron: { x: 30, y: 250, w: 60, h: 60, about: 'bubbling cauldron', draw(g, t, S) { disc(g, 60, 292, 28, INK); disc(g, 60, 292, 26, M.steel[0]); R(g, 30, 272, 60, 6, M.steel[2]); R(g, 34, 274, 52, 5, S.tone ? M.pink[2] : M.green[2]); for (let i = 0; i < 4; i++) { const ph = (t * 1.2 + i * 0.25) % 1; disc(g, 40 + i * 14, 274 - ph * 14, 2 + (i % 2), S.tone ? M.pink[3] : M.green[3]); } glow(g, 60, 270, 38, S.tone ? M.pink[3] : M.green[3], 0.4 + 0.4 * S.lit); R(g, 36, 318, 6, 14, M.wood[1]); R(g, 78, 318, 6, 14, M.wood[1]); } },
    book: { x: 130, y: 240, w: 40, h: 32, about: 'floating spellbook', draw(g, t, S) { const fl = Math.round(Math.sin(t * 2) * 3); box(g, 132, 248 + fl, 36, 20, M.red); R(g, 149, 248 + fl, 2, 20, M.sand[3]); R(g, 136, 250 + fl, 12, 16, M.sand[3]); R(g, 152, 250 + fl, 12, 16, M.sand[3]); if (S.lit > 0.2 || S.open > 0.2) { glow(g, 150, 246 + fl, 32, M.yellow[3], 0.6); sparkle(g, 150 + Math.round(Math.sin(t * 5) * 14), 236 + fl, t, Math.floor(t * 4) / 4); } } },
    crystal: { x: 200, y: 200, w: 40, h: 100, about: 'glowing crystal on a pedestal', draw(g, t, S) { R(g, 208, 280, 24, 30, M.stone[2]); R(g, 204, 306, 32, 6, M.stone[3]); const c = S.tone ? M.pink : M.teal; R(g, 216, 232, 8, 44, c[2]); R(g, 212, 244, 16, 24, c[3]); R(g, 218, 226, 4, 8, c[4]); glow(g, 220, 252, 40, c[3], 0.4 + 0.5 * S.lit); } },
    shelf: { x: 20, y: 130, w: 70, h: 80, about: 'potion shelf', draw(g, t, S) { R(g, 20, 160, 70, 4, M.wood[1]); for (let i = 0; i < 4; i++) { const r = M[['red', 'green', 'blue', 'purple'][i]]; R(g, 28 + i * 16, 144, 8, 16, r[2]); R(g, 30 + i * 16, 140, 4, 5, M.sand[3]); } } },
  },
  fore(g, t) { R(g, -20, 430, 60, 60, M.dark[0]); fireflies(g, t, 10, 7, 160, 140, '#e0c8ff'); },
});
defScenario({
  id: 'pirate-ship', name: 'Pirate ship', about: 'Night sea deck: pirate ship with sails, treasure map, deck cannon and a chest, waves rolling.',
  keywords: ['pirate', 'ship', 'sea', 'malware', 'phishing', 'vpn', 'hacking', 'treasure', 'map', 'barco', 'pirata', 'mar', 'attack', 'hack'], time: 'dusk',
  far(g, t, c) { skyFill(g, c, -20, 260); sunMoon(g, c, 60, 200, 22); clouds(g, t, 130, 3, M.purple[3], 4); R(g, -40, 255, 360, 80, M.water[1]); },
  mid(g, t) { waves(g, t, 256, -40, 320, M.water, 90, 2); R(g, -40, 300, 360, 200, M.water[0]); for (let i = 0; i < 14; i++) R(g, (i * 29 + t * 8) % 320 - 20, 310 + (i % 5) * 26, 14, 2, M.water[3]); },
  props: {
    ship: { x: 30, y: 150, w: 200, h: 170, about: 'pirate ship hull and sails', draw(g, t, S) { const bob = Math.round(Math.sin(t * 1.6) * 2); R(g, 128, 150 + bob, 4, 100, M.wood[1]); for (const [y, w] of [[154, 70], [190, 84]]) { R(g, 130 - w / 2, y + bob, w, 30, M.white[3]); R(g, 130 - w / 2, y + bob, w, 3, M.white[4]); R(g, 130 - w / 2, y + 27 + bob, w, 3, M.white[1]); } R(g, 132, 150 + bob, 22, 8, M.red[2]); box(g, 40, 252 + bob, 180, 40, M.wood); R(g, 40, 250 + bob, 190, 8, M.wood[3]); for (let i = 0; i < 6; i++) disc(g, 56 + i * 28, 274 + bob, 4, INK); } },
    map: { x: 170, y: 200, w: 40, h: 30, about: 'treasure map', draw(g, t, S) { const bob = Math.round(Math.sin(t * 1.6) * 2); R(g, 176, 222 + bob, 32, 24, M.sand[3]); R(g, 176, 222 + bob, 32, 2, M.sand[1]); line(g, 180, 240 + bob, 196, 230 + bob, 1, M.red[2]); if (S.lit > 0.3 || S.fill > 0.5) { R(g, 196, 228 + bob, 2, 6, M.red[3]); R(g, 194, 230 + bob, 6, 2, M.red[3]); glow(g, 197, 230 + bob, 14, M.red[3], 0.5); } } },
    cannon: { x: 60, y: 230, w: 40, h: 30, about: 'deck cannon', draw(g, t, S) { const bob = Math.round(Math.sin(t * 1.6) * 2); const r = S.ev.pulse >= 0 ? -4 : 0; R(g, 60 + r, 236 + bob, 30, 12, M.steel[1]); R(g, 56 + r, 234 + bob, 8, 16, M.steel[2]); disc(g, 78, 254 + bob, 7, M.wood[1]); if (S.ev.pulse >= 0 && S.ev.pulse < 0.5) { disc(g, 52, 240 + bob, 8, M.fire[3]); puffs(g, 48, 238 + bob, t, 0.2, M.stone[4], 4, 16, 1); } } },
    chest: { x: 190, y: 250, w: 36, h: 24, about: 'treasure chest on deck', draw(g, t, S) { const bob = Math.round(Math.sin(t * 1.6) * 2); box(g, 190, 262 + bob, 36, 16, M.wood); R(g, 190, 252 + bob - Math.round(S.open * 6), 36, 10, M.wood[2]); R(g, 204, 264 + bob, 8, 5, M.gold[3]); if (S.open > 0.3) glow(g, 208, 258 + bob, 24, M.yellow[3], 0.6); } },
  },
  fore(g, t) { for (let x = -10; x < 300; x += 24) R(g, x, 440 + Math.round(Math.sin(t * 2 + x) * 3), 20, 50, M.water[0]); rain(g, t, 14, 3, M.water[4], 2); },
});
defScenario({
  id: 'airport', name: 'Airport', about: 'Runway at dawn: a plane taking off, control tower, boarding gate and a baggage carousel.',
  keywords: ['airport', 'plane', 'flight', 'oauth', 'boarding', 'gate', 'tower', 'airline', 'aeropuerto', 'avion', 'vuelo', 'travel', 'cdn', 'edge'], time: 'day', w: 360,
  far(g, t, c) { outdoor(g, c, 300, M.stone, { sx: 60, sy: 170 }); },
  mid(g, t) { ground(g, 300, 360, M.stone, { k: 0, specks: 8 }); for (let x = -30; x < 400; x += 40) R(g, x, 330, 22, 3, M.white[3]); R(g, -40, 300, 440, 4, M.yellow[2]); },
  props: {
    plane: { x: 30, y: 180, w: 150, h: 100, about: 'passenger plane that takes off', draw(g, t, S) { const p = EA.io(clamp(S.fill)); const x = 40 + p * 170, y = 262 - p * 110; box(g, x, y, 110, 22, M.white); R(g, x + 96, y - 2, 18, 12, M.white[2]); R(g, x + 100, y + 2, 8, 4, M.teal[3]); R(g, x + 30, y + 16, 50, 6, M.red[2]); R(g, x + 4, y - 18, 10, 18, M.red[2]); R(g, x + 40, y + 20, 36, 8, M.steel[2]); for (let i = 0; i < 6; i++) R(g, x + 20 + i * 12, y + 6, 5, 5, M.blue[2]); } },
    tower: { x: 250, y: 130, w: 40, h: 170, about: 'control tower', draw(g, t, S) { R(g, 262, 180, 16, 120, M.stone[3]); box(g, 248, 140, 44, 40, M.teal); R(g, 252, 148, 36, 16, M.blue[2]); R(g, 268, 128, 2, 12, M.steel[2]); disc(g, 269, 126, 3, Math.floor(t * 2) % 2 ? M.red[3] : M.red[1]); if (S.lit > 0.3) glow(g, 270, 156, 40, M.yellow[3], 0.5); } },
    gate: { x: 190, y: 240, w: 40, h: 60, about: 'boarding gate with sign', draw(g, t, S) { box(g, 190, 240, 44, 60, M.steel); R(g, 196, 248, 32, 20, S.lit > 0.3 ? M.green[3] : M.red[3]); txt(g, 'A1', 212, 252, 8, INK, 'center'); R(g, 196, 274, 32, 26, M.dark[1]); } },
    carousel: { x: 110, y: 300, w: 80, h: 40, about: 'baggage carousel', draw(g, t, S) { R(g, 110, 316, 90, 12, M.steel[1]); R(g, 110, 316, 90, 3, M.steel[3]); for (let i = 0; i < 2; i++) { const x = 110 + ((t * 30 + i * 45) % 90); crate(g, x - 8, 304, 16, i ? M.red : M.blue); } } },
  },
  fore(g, t) { R(g, -20, 440, 70, 50, M.dark[0]); clouds(g, t, 60, 2, '#ffffff', 5); },
});
defScenario({
  id: 'ocean-floor', name: 'Ocean floor', about: 'Underwater world: a submarine, glowing cable on the seabed, fish schools and a treasure chest.',
  keywords: ['ocean', 'sea', 'underwater', 'cable', 'submarine', 'fish', 'data lake', 'internet', 'big data', 'mar', 'oceano', 'submarino', 'pez', 'deep'], time: 'night',
  far(g, t) { bands(g, -40, -20, 340, 360, [M.water[3], M.water[2], M.water[2], M.water[1], M.water[1], M.water[0]], 8); for (let i = 0; i < 6; i++) { alpha(g, 0.12, () => R(g, 20 + i * 50 + Math.sin(t + i) * 4, 0, 14, 240, '#ffffff')); } },
  mid(g, t) { ground(g, 310, 270, M.sand, { k: 1 }); for (let i = 0; i < 12; i++) { const x = 10 + i * 24; R(g, x, 296, 3, 14 + (i % 3) * 4, M.green[2]); R(g, x + 3, 300, 2, 10, M.green[3]); } for (let i = 0; i < 24; i++) disc(g, (i * 37) % 270, 400 - ((t * 12 + i * 20) % 300), 1 + (i % 2), M.water[4]); },
  props: {
    submarine: { x: 40, y: 190, w: 100, h: 50, about: 'yellow submarine', draw(g, t, S) { const x = 40 + Math.round(S.fill * 70), y = 200 + Math.round(Math.sin(t * 1.5) * 3); box(g, x, y + 8, 90, 32, M.yellow); R(g, x + 30, y - 4, 24, 14, M.yellow[2]); R(g, x + 40, y - 12, 3, 10, M.steel[2]); for (let i = 0; i < 3; i++) disc(g, x + 20 + i * 24, y + 24, 5, S.lit > 0.2 ? M.yellow[4] : M.teal[3]); R(g, x + 90, y + 18, 4, 12, M.steel[2]); R(g, x - 6, y + 20 + (Math.floor(t * 12) % 2) * 4, 6, 3, M.steel[3]); for (let i = 0; i < 3; i++) disc(g, x - 12 - i * 6, y + 24 - ((t * 20 + i * 8) % 20), 2, M.water[4]); } },
    cable: { x: -10, y: 316, w: 290, h: 20, about: 'glowing data cable on the seabed', draw(g, t, S) { R(g, -10, 326, 290, 5, M.steel[1]); for (let i = 0; i < 12; i++) { const x = ((i * 26 + t * 60) % 290) - 10; R(g, x, 326, 6, 5, M.teal[3]); } glow(g, 135, 328, 130, M.teal[3], 0.15 + 0.3 * S.lit); } },
    fish: { x: 150, y: 150, w: 100, h: 60, about: 'school of fish', draw(g, t, S) { const n = 4 + Math.round(S.fill * 6); for (let i = 0; i < n; i++) { const x = ((i * 31 + t * 25) % 320) - 30, y = 150 + (i % 4) * 14 + Math.round(Math.sin(t * 2 + i) * 3); fishShape(g, 270 - x, y, -1, [M.orange, M.pink, M.yellow][i % 3], t, 1); } } },
    chest: { x: 210, y: 288, w: 40, h: 28, about: 'sunken treasure chest', draw(g, t, S) { box(g, 210, 298, 38, 18, M.wood); R(g, 210, 288 - Math.round(S.open * 6), 38, 10, M.wood[2]); R(g, 225, 300, 8, 5, M.gold[3]); if (S.open > 0.3 || S.lit > 0.3) glow(g, 229, 292, 28, M.yellow[3], 0.6); } },
  },
  fore(g, t) { for (let i = 0; i < 5; i++) { const x = 10 + i * 60; R(g, x, 440 + (i % 2) * 10, 8, 50, M.green[0]); R(g, x + 6, 450, 6, 40, M.green[1]); } },
});
defScenario({
  id: 'mine', name: 'Mine', about: 'Underground mine: ore veins, a mine cart on rails, a lantern, and a drill.',
  keywords: ['mine', 'mining', 'ore', 'bitcoin', 'crypto', 'data mining', 'cart', 'pickaxe', 'drill', 'mina', 'minar', 'cueva', 'gold', 'dig', 'extract'], time: 'night',
  far(g, t) { R(g, -40, -20, 360, 340, M.stone[0]); dith(g, -40, -20, 360, 340, M.stone[0], M.stone[1], 1); },
  back(g, t) { for (let i = 0; i < 10; i++) { const x = (i * 61) % 300, y = 120 + (i * 47) % 160; R(g, x, y, 10, 8, M.stone[2]); R(g, x + 2, y + 2, 5, 3, M.stone[3]); } for (const x of [30, 135, 240]) { R(g, x, 90, 5, 220, M.wood[1]); } R(g, 20, 90, 230, 6, M.wood[2]); },
  mid(g, t) { ground(g, 310, 270, M.stone, { k: 0 }); R(g, -40, 330, 360, 3, M.steel[2]); R(g, -40, 346, 360, 3, M.steel[2]); for (let x = -30; x < 320; x += 18) R(g, x, 332, 6, 16, M.wood[1]); },
  props: {
    ore: { x: 160, y: 190, w: 100, h: 110, about: 'ore vein in the wall', draw(g, t, S) { R(g, 160, 200, 100, 110, M.stone[1]); for (let i = 0; i < 6; i++) { const x = 170 + (i % 3) * 30, y = 214 + Math.floor(i / 3) * 40, gone = S.fill * 6 > i; if (!gone) { R(g, x, y, 14, 12, M.gold[2]); R(g, x + 2, y + 2, 4, 3, M.gold[4]); } } if (S.lit > 0.3) glow(g, 210, 250, 60, M.yellow[3], 0.4); } },
    cart: { x: 40, y: 280, w: 70, h: 50, about: 'mine cart on rails', draw(g, t, S) { const x = 40 + Math.round(S.fill * 60); box(g, x, 292, 56, 28, M.steel); const n = Math.round(S.fill * 5); for (let i = 0; i < n; i++) disc(g, x + 10 + i * 9, 290, 5, M.gold[3]); disc(g, x + 12, 326, 6, M.dark[1]); disc(g, x + 44, 326, 6, M.dark[1]); } },
    lantern: { x: 120, y: 120, w: 20, h: 30, about: 'hanging lantern', draw(g, t, S) { R(g, 130, 90, 1, 30, INK); box(g, 124, 120, 14, 18, M.orange); R(g, 127, 124, 8, 10, M.yellow[4]); glow(g, 131, 130, 50, M.yellow[3], 0.5 + 0.1 * Math.sin(t * 8)); } },
    drill: { x: 20, y: 200, w: 60, h: 60, about: 'drill machine', chops: true, draw(g, t, S) { const a = S.ev.chop >= 0 ? 4 : 0; box(g, 20, 220, 40, 30, M.red); R(g, 60 + Math.round(Math.sin(t * 40) * a), 228, 30, 8, M.steel[3]); for (let i = 0; i < 3; i++) R(g, 62 + i * 8, 226 + (i % 2) * 6, 5, 4, M.steel[2]); } },
  },
  fore(g, t) { R(g, -20, 430, 60, 60, M.dark[0]); R(g, 240, 410, 60, 80, M.dark[0]); dust(g, t, 16, 5, M.stone[4], 3); },
});
defScenario({
  id: 'castle', name: 'Castle siege', about: 'Dusk castle: stone walls with archers, a gate with drawbridge, a tower and a catapult.',
  keywords: ['castle', 'siege', 'firewall', 'ddos', 'rate limit', 'gate', 'wall', 'defense', 'castillo', 'muralla', 'defensa', 'guard', 'attack', 'block'], time: 'dusk',
  far(g, t, c) { skyFill(g, c, -20, 280); sunMoon(g, c, 210, 190, 24); hills(g, 290, M.stone, 4, 30); },
  mid(g, t) { ground(g, 310, 270, M.grass, { k: 0, specks: 12 }); R(g, -40, 330, 360, 18, M.water[2]); R(g, -40, 330, 360, 2, M.water[4]); },
  props: {
    wall: { x: -10, y: 190, w: 280, h: 120, about: 'stone wall with battlements', draw(g, t, S) { brickWall(g, -10, 200, 290, 110, M.stone, 14, 8); for (let x = -10; x < 280; x += 26) R(g, x, 188, 14, 14, M.stone[2]); } },
    gate: { x: 100, y: 230, w: 70, h: 80, about: 'castle gate with portcullis', opens: true, draw(g, t, S) { R(g, 100, 230, 70, 80, INK); const o = Math.round(S.open * 56); R(g, 104, 234, 62, 76, M.dark[1]); for (let x = 108; x < 164; x += 8) R(g, x, 234 - o, 3, 70, M.steel[2]); R(g, 104, 234 - o, 62, 4, M.steel[1]); } },
    tower: { x: 200, y: 120, w: 60, h: 190, about: 'tall tower with flag', draw(g, t, S) { brickWall(g, 200, 150, 60, 160, M.stone, 14, 8); for (let x = 200; x < 260; x += 16) R(g, x, 140, 10, 12, M.stone[2]); R(g, 228, 100, 2, 40, M.steel[2]); const w = Math.round(Math.sin(t * 5) * 2); R(g, 230, 102, 18 + w, 10, S.tone ? M.blue[2] : M.red[2]); R(g, 224, 180, 12, 20, INK); } },
    catapult: { x: 10, y: 280, w: 60, h: 40, about: 'catapult', draw(g, t, S) { const a = S.ev.pulse >= 0 ? 1 : 0; box(g, 10, 306, 50, 10, M.wood); line(g, 34, 306, a ? 58 : 14, a ? 270 : 272, 3, M.wood[2]); disc(g, a ? 60 : 12, a ? 266 : 268, 5, M.stone[3]); disc(g, 20, 322, 6, M.dark[1]); disc(g, 50, 322, 6, M.dark[1]); } },
  },
  fore(g, t) { R(g, -20, 430, 60, 60, M.dark[0]); R(g, 240, 420, 60, 70, M.dark[0]); },
});
defScenario({
  id: 'courier-city', name: 'Courier city', about: 'Sunny city street: houses, a courier bike on the road, a depot and street lamps.',
  keywords: ['courier', 'delivery', 'city', 'street', 'http', 'request', 'response', 'rest', 'bike', 'ciudad', 'entrega', 'calle', 'moto', 'route', 'send'], time: 'day', w: 360,
  far(g, t, c) { skyFill(g, c, -20, 280); clouds(g, t, 130, 4, '#ffffff', 3); skyline(g, t, 280, 9, M.blue, 11, 0.2); },
  mid(g, t) { R(g, -40, 300, 440, 200, M.stone[1]); R(g, -40, 300, 440, 14, M.sand[2]); R(g, -40, 314, 440, 2, M.stone[0]); for (let x = -30; x < 400; x += 44) R(g, x, 350, 24, 4, M.yellow[2]); R(g, -40, 400, 440, 2, M.stone[0]); lampPost(g, 160, 300, t, M.yellow, 80); lampPost(g, 330, 300, t, M.yellow, 80); },
  props: {
    house: { x: 20, y: 190, w: 80, h: 110, about: 'house with a mailbox', draw(g, t, S) { box(g, 20, 220, 80, 80, M.sand); R(g, 14, 210, 92, 12, M.red[2]); R(g, 28, 198, 64, 14, M.red[2]); R(g, 28, 198, 64, 2, M.red[3]); windowBox(g, 30, 232, 18, 18, S.lit > 0.3, M.blue); doorBox(g, 66, 252, 22, 48); R(g, 104, 284, 3, 16, M.wood[1]); box(g, 100, 276, 12, 10, S.tone ? M.green : M.blue); } },
    depot: { x: 130, y: 220, w: 90, h: 80, about: 'delivery depot', draw(g, t, S) { box(g, 130, 230, 90, 70, M.orange); R(g, 126, 222, 98, 10, M.steel[2]); R(g, 150, 252, 50, 48, M.dark[1]); for (let i = 0; i < 4; i++) R(g, 150, 252 + i * 12, 50, 1, M.steel[1]); signBoard(g, 175, 236, 'GO', M.yellow, 8, 2); } },
    bike: { x: 120, y: 296, w: 50, h: 40, about: 'courier bike that rides along', draw(g, t, S) { const x = 100 + ((S.fill > 0 ? EA.io(clamp(S.fill)) * 150 : 20)); const sp = Math.floor(t * 12); for (const wx of [x, x + 30]) { disc(g, wx, 332, 9, INK); disc(g, wx, 332, 6, M.dark[3]); R(g, wx - 1, 327 + (sp % 2) * 2, 2, 2, M.steel[3]); } line(g, x, 332, x + 14, 314, 2, M.red[2]); line(g, x + 14, 314, x + 30, 332, 2, M.red[2]); R(g, x + 10, 306, 12, 10, M.sand[3]); box(g, x + 8, 300, 14, 12, M.yellow); } },
    tower: { x: 250, y: 130, w: 60, h: 170, about: 'office tower', draw(g, t, S) { bldg(g, 250, 150, 60, 150, M.blue, 5, t, 0.45); R(g, 276, 126, 2, 24, M.steel[2]); disc(g, 277, 124, 3, M.red[2]); } },
  },
  fore(g, t) { R(g, -20, 440, 60, 50, M.dark[0]); R(g, 260, 430, 100, 60, M.dark[0]); },
});
defScenario({
  id: 'greenhouse', name: 'Greenhouse', about: 'Glass greenhouse: plants of growing sizes, watering can, sprinkler and wooden shelf.',
  keywords: ['greenhouse', 'plant', 'garden', 'git', 'branch', 'growth', 'tree', 'versioning', 'invernadero', 'jardin', 'planta', 'grow', 'seed', 'water'], time: 'day',
  far(g, t, c) { outdoor(g, c, 300, M.grass, { sun: true }); },
  back(g, t) { for (let x = -10; x < 290; x += 30) { R(g, x, 100, 2, 200, M.white[2]); } R(g, -10, 100, 290, 3, M.white[2]); alpha(g, 0.14, () => R(g, -10, 100, 290, 200, M.teal[4])); },
  mid(g, t) { planks(g, 300, W, M.sand); R(g, -40, 296, 360, 6, M.wood[1]); },
  props: {
    plant: { x: 100, y: 190, w: 70, h: 120, about: 'plant that grows with fill', fills: true, draw(g, t, S) { box(g, 114, 290, 42, 26, M.orange); const h = 20 + Math.round(S.fill * 70); R(g, 134, 290 - h, 4, h, M.green[1]); for (let i = 0; i < 4; i++) { const y = 290 - h * (0.2 + i * 0.22), sw = Math.round(Math.sin(t * 2 + i) * 1); R(g, 136, y, 16 + sw, 6, M.green[3]); R(g, 120, y - 6, 16 - sw, 6, M.green[2]); } if (S.fill > 0.9) disc(g, 136, 290 - h - 4, 6, M.pink[2]); } },
    can: { x: 30, y: 260, w: 40, h: 40, about: 'watering can', draw(g, t, S) { const tilt = S.ev.pulse >= 0 || S.fill > 0 && S.fill < 1; box(g, 30, 270, 26, 22, M.teal); R(g, 56, tilt ? 280 : 274, 14, 3, M.teal[2]); if (tilt) for (let i = 0; i < 6; i++) R(g, 72 + (i % 2) * 2, 282 + ((t * 40 + i * 6) % 30), 1, 3, M.water[3]); } },
    shelf: { x: 190, y: 220, w: 80, h: 80, about: 'wooden plant shelf', draw(g, t, S) { R(g, 190, 250, 80, 4, M.wood[1]); R(g, 190, 296, 80, 4, M.wood[1]); R(g, 192, 250, 3, 50, M.wood[1]); R(g, 266, 250, 3, 50, M.wood[1]); for (let i = 0; i < 4; i++) { R(g, 196 + i * 18, 240, 10, 10, M.orange[2]); disc(g, 201 + i * 18, 232, 7, M.green[2 + (i % 2)]); } } },
    sprinkler: { x: 20, y: 120, w: 40, h: 30, about: 'ceiling sprinkler', draw(g, t, S) { R(g, 40, 100, 3, 24, M.steel[2]); R(g, 30, 124, 24, 5, M.steel[3]); if (S.lit > 0.3 || S.ev.pulse >= 0) for (let i = 0; i < 10; i++) R(g, 24 + i * 3, 130 + ((t * 60 + i * 9) % 150), 1, 3, M.water[3]); } },
  },
  fore(g, t) { for (let i = 0; i < 6; i++) { R(g, i * 50 - 5, 430 + (i % 2) * 8, 10, 60, M.green[0]); disc(g, i * 50, 430, 12, M.green[0]); } },
});
defScenario({
  id: 'lighthouse', name: 'Lighthouse', about: 'Rocky coast at night: lighthouse with a rotating beam, a small boat, buoy and waves.',
  keywords: ['lighthouse', 'monitoring', 'alert', 'ping', 'beam', 'coast', 'guide', 'faro', 'costa', 'vigilar', 'watch', 'signal', 'health check', 'ship'], time: 'night',
  far(g, t, c) { skyFill(g, c, -20, 280); stars(g, t, 36, 6, 220); sunMoon(g, c, 60, 170, 14); R(g, -40, 270, 360, 80, M.water[0]); },
  mid(g, t) { waves(g, t, 276, -40, 320, M.water, 80, 2); R(g, -40, 320, 360, 200, M.water[0]); R(g, 160, 270, 130, 76, M.stone[1]); R(g, 150, 296, 150, 50, M.stone[2]); R(g, 150, 296, 150, 2, M.stone[3]); },
  props: {
    lighthouse: { x: 190, y: 120, w: 50, h: 170, about: 'lighthouse with rotating beam', draw(g, t, S) { for (let i = 0; i < 5; i++) { const y = 270 - i * 28, w = 40 - i * 4; R(g, 215 - w / 2, y - 28, w, 28, i % 2 ? M.red[2] : M.white[3]); } box(g, 200, 120, 30, 20, M.steel); R(g, 204, 124, 22, 12, M.yellow[3]); const a = t * 1.5 * (S.lit > 0.3 ? 1.4 : 1); const dir = Math.cos(a); glow(g, 215, 130, 26, M.yellow[3], 0.6); alpha(g, 0.28, () => { for (let i = 1; i < 14; i++) R(g, 215 + dir * i * 14 - (dir > 0 ? 0 : 0), 130 - i * 0.5, Math.max(4, i * 3), Math.max(2, i), M.yellow[4]); }); } },
    boat: { x: 40, y: 250, w: 60, h: 40, about: 'small boat on the water', draw(g, t, S) { const x = 40 + Math.round(S.fill * 100), b = Math.round(Math.sin(t * 2) * 2); R(g, x + 20, 230 + b, 2, 28, M.wood[2]); R(g, x + 22, 232 + b, 16, 20, M.white[3]); box(g, x, 258 + b, 40, 12, M.wood); } },
    buoy: { x: 120, y: 260, w: 20, h: 30, about: 'blinking buoy', draw(g, t, S) { const b = Math.round(Math.sin(t * 2.4) * 2); R(g, 126, 262 + b, 8, 14, M.red[2]); R(g, 126, 268 + b, 8, 3, M.white[3]); const on = Math.floor(t * 2) % 2 === 0 || S.lit > 0.3; disc(g, 130, 258 + b, 3, on ? M.yellow[3] : M.yellow[1]); if (on) glow(g, 130, 258 + b, 14, M.yellow[3], 0.6); } },
    rocks: { x: 150, y: 290, w: 140, h: 50, about: 'rocks at the foot of the lighthouse', draw() {} },
  },
  fore(g, t) { for (let x = -10; x < 300; x += 22) R(g, x, 446 + Math.round(Math.sin(t * 2 + x) * 3), 18, 40, M.water[0]); },
});
defScenario({
  id: 'subway-map', name: 'Metro station', about: 'Underground metro: route map with stations, a train at the platform and ticket gates.',
  keywords: ['metro', 'subway', 'graph', 'shortest path', 'microservices', 'map', 'network', 'stations', 'lines', 'tube', 'mapa', 'ruta', 'nodes', 'route'], time: 'night',
  mid(g, t) { room(g, t, M.stone, M.stone, 300, { stripe: M.yellow, k: 2 }); for (let x = 20; x < 300; x += 70) { R(g, x, 100, 6, 200, M.steel[1]); } },
  props: {
    map: { x: 40, y: 130, w: 190, h: 100, about: 'metro route map with stations', draw(g, t, S) { box(g, 40, 130, 190, 100, M.white); const pts = [[60, 190], [100, 160], [140, 190], [180, 150], [210, 180]]; const lines = [M.red, M.blue]; const n = 1 + Math.round(S.fill * 4); for (let i = 1; i <= n && i < pts.length; i++) line(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 3, M.red[2]); line(g, 60, 150, 140, 190, 3, M.blue[2]); line(g, 140, 190, 210, 150, 3, M.blue[2]); for (const [x, y] of pts) { disc(g, x, y, 5, INK); disc(g, x, y, 3, M.white[4]); } if (S.lit > 0.3) glow(g, pts[2][0], pts[2][1], 24, M.yellow[3], 0.7); } },
    train: { x: 20, y: 250, w: 200, h: 60, about: 'metro train at the platform', draw(g, t, S) { const x = -120 + Math.round(EA.out(clamp(S.fill * 1.4 + 0.3)) * 140); box(g, x, 258, 230, 52, M.teal); R(g, x, 296, 230, 6, M.teal[1]); for (let i = 0; i < 5; i++) { windowBox(g, x + 12 + i * 44, 266, 30, 22, S.lit > 0.2, M.blue); } } },
    gate: { x: 200, y: 280, w: 60, h: 40, about: 'ticket gate', draw(g, t, S) { box(g, 200, 290, 20, 30, M.steel); box(g, 244, 290, 20, 30, M.steel); R(g, 220, 304, 24, 3, S.lit > 0.3 ? M.green[3] : M.red[3]); R(g, 206, 294, 8, 4, M.green[3]); } },
    sign: { x: 120, y: 90, w: 70, h: 24, about: 'station name sign', draw(g, t, S) { signBoard(g, 155, 92, 'M', S.tone ? M.red : M.blue, 8); } },
  },
  fore(g, t) { R(g, -20, 430, 70, 60, M.dark[0]); dust(g, t, 10, 12, M.white[3], 2); },
});
