/* scenarios-e.js: tech scenarios (2/2): app store, keyboard desk, cloud sky, cooling room, cable maze, firewall gate. */
'use strict';
defScenario({
  id: 'app-store', name: 'App store market', about: 'Bright market of stalls: an awning stall of app icons, a hanging APPS banner, a phone, a padlock and a spinning coin.',
  topics: ['apps', 'app store', 'downloads', 'software', 'permissions', 'in-app purchases', 'marketplace', 'aplicaciones', 'descargar', 'privacidad'], keywords: ['app', 'store', 'market', 'download'], time: 'day', floor: ['tiles', 'sand', ['barrel', 'crate']],
  far(g, t, c) { skyFill(g, c, -20, 260); clouds(g, t, 80, 4, '#ffffff', 3); skyline(g, t, 280, 9, M.brick, 8, 0.3, 40, 90); },
  mid(g, t) { ground(g, 300, 270, M.sand, { specks: 8 }); for (let i = 0; i < 9; i++) R(g, i * 32 - 4, 120, 20, 14, i % 2 ? M.red[2] : M.white[3]); R(g, -10, 118, 300, 3, M.steel[1]); },
  props: {
    stall: { x: 12, y: 150, w: 120, h: 150, about: 'market stall with a wall of app icons', lit: true, fills: true,
      draw(g, t, S) { box(g, 12, 200, 120, 100, M.wood); R(g, 8, 148, 128, 18, M.red[2]); for (let i = 0; i < 8; i++) R(g, 8 + i * 16, 148, 8, 18, M.white[3]); for (let i = 0; i < 12; i++) { const c = TOKR[i % 6], pop = S.fill * 12 > i; R(g, 20 + (i % 4) * 28, 210 + Math.floor(i / 4) * 28, 22, 22, INK); R(g, 21 + (i % 4) * 28, 211 + Math.floor(i / 4) * 28, 20, 20, pop ? M[c][3] : M[c][2]); } } },
    phone: libProp('phone', 150, 190, 2, { about: 'phone with the store open' }), padlock: libProp('padlock', 214, 232, 2, { about: 'permission padlock' }), coin: libProp('coin', 214, 160, 3, { about: 'price coin' }),
  },
  fore(g, t) { R(g, -20, 440, 60, 50, M.dark[0]); R(g, 220, 430, 100, 60, M.dark[0]); },
});
defScenario({
  id: 'keyboard-desk', name: 'Keyboard desk', about: 'Giant desk: a big monitor with a progress bar, a wide keyboard, a crawling bug and an idea bulb.',
  topics: ['typing', 'coding', 'programming', 'passwords', 'keyboard', 'computer work', 'bugs', 'software', 'teclado', 'programar', 'contraseña'], keywords: ['keyboard', 'desk', 'monitor', 'code'], time: 'night', floor: ['carpet', 'purple', ['chair', 'cable']],
  back(g, t) { R(g, -30, -20, 340, 330, M.purple[0]); dith(g, -30, -20, 340, 330, M.purple[0], M.purple[1], 1); for (let i = 0; i < 5; i++) R(g, 16 + i * 54, 40 + (i % 2) * 14, 30, 22, M[TOKR[i]][1]); },
  mid(g, t) { ground(g, 300, 270, M.purple, { specks: 0 }); R(g, -20, 272, 310, 10, M.wood[2]); R(g, -20, 272, 310, 2, M.wood[4]); R(g, -20, 282, 310, 3, M.wood[0]); },
  props: { screen: libProp('screen', 55, 132, 4, { about: 'big monitor' }), keyboard: libProp('keyboard', 25, 246, 5, { about: 'wide keyboard' }), bug: libProp('bug', 212, 250, 2, { about: 'bug crawling on the desk' }), bulb: libProp('bulb', 222, 90, 2, { about: 'idea bulb' }) },
  fore(g, t) { R(g, -20, 440, 60, 50, M.dark[0]); R(g, 230, 440, 80, 50, M.dark[0]); },
});
defScenario({
  id: 'cloud-sky', name: 'Cloud sky', about: 'Sky above the clouds: a huge cloud with an upload bar, a small cloud, a floating island with a database, wifi and a phone.',
  topics: ['cloud', 'cloud storage', 'upload', 'sync', 'backup', 'streaming', 'remote servers', 'nube', 'respaldo', 'internet'], keywords: ['cloud', 'sky', 'upload', 'sync'], time: 'day', floor: ['grass', 'grass', ['bush', 'rock']],
  far(g, t, c) { skyFill(g, c, -20, 340); sunMoon(g, c, 214, 70, 16); clouds(g, t, 60, 4, '#ffffff', 3, 5); clouds(g, t, 230, 5, '#ffffff', 2, 8, 30); },
  mid(g, t) { R(g, -20, 296, 310, 20, M.grass[2]); R(g, -20, 296, 310, 3, M.grass[4]); R(g, -20, 316, 310, 190, M.wood[1]); dith(g, -20, 316, 310, 60, M.wood[1], M.wood[0], 0); },
  props: { cloud: libProp('cloud', 40, 110, 4, { about: 'huge cloud with an upload bar' }), cloud2: libProp('cloud', 8, 84, 2, { about: 'small cloud' }), database: libProp('database', 196, 232, 2, { about: 'database on the island' }), wifi: libProp('wifi', 150, 96, 2, { about: 'wifi symbol' }), phone: libProp('phone', 104, 220, 2, { about: 'phone on the island' }) },
  fore(g, t) { R(g, -20, 440, 80, 50, M.dark[0]); R(g, 220, 440, 100, 50, M.dark[0]); },
});
defScenario({
  id: 'cooling-room', name: 'Cooling room', about: 'Frosty machine room: a big fan, a thermometer, a temperature dial, a snowflake and a server, with cold pipes.',
  topics: ['cooling', 'heat', 'temperature', 'fan', 'thermal throttling', 'overheating', 'air conditioning', 'calor', 'enfriar', 'ventilador', 'sobrecalentamiento'], keywords: ['cooling', 'heat', 'fan', 'temperature'], time: 'day', floor: ['metal', 'teal', ['pipe', 'barrel']],
  back(g, t) { R(g, -30, -20, 340, 330, M.teal[1]); dith(g, -30, -20, 340, 330, M.teal[1], M.blue[1], 1); pipeH(g, -20, 60, 310, M.steel, 7); pipeH(g, -20, 84, 310, M.blue, 5); for (let x = 20; x < 270; x += 60) { pipeV(g, x, 60, 30, M.steel, 7); } for (let i = 0; i < 14; i++) R(g, hs(i) * 270, 100 + hs(i * 3) * 160, 2, 2, M.white[3]); },
  mid(g, t) { ground(g, 300, 270, M.steel, { specks: 0 }); },
  props: { fan: libProp('fan', 14, 245, 3, { about: 'big cooling fan' }), thermometer: libProp('thermometer', 124, 200, 2, { about: 'thermometer' }), dial: libProp('gauge', 92, 104, 2, { about: 'temperature dial' }), snow: libProp('snowflake', 196, 106, 3, { about: 'snowflake' }), server: libProp('server', 196, 232, 2, { about: 'hot server' }) },
  fore(g, t) { R(g, -20, 440, 60, 50, M.dark[0]); R(g, 230, 440, 80, 50, M.dark[0]); dust(g, t, 18, 4, M.white[4], 4); },
});
defScenario({
  id: 'cable-maze', name: 'Cable maze', about: 'Back-of-the-desk jungle of cables: a plug, a wall socket, a long cable and a bolt of power.',
  topics: ['cables', 'usb', 'ports', 'connections', 'wires', 'charging cables', 'power supply', 'compatibility', 'cable', 'puerto', 'conector'], keywords: ['cable', 'socket', 'plug', 'usb'], time: 'night', floor: ['tiles', 'steel', ['cable', 'cable']],
  back(g, t) { R(g, -30, -20, 340, 330, M.stone[0]); dith(g, -30, -20, 340, 330, M.stone[0], M.stone[1], 1); for (let i = 0; i < 6; i++) { const y = 40 + i * 38; for (let x = -10; x < 280; x += 4) R(g, x, y + Math.round(Math.sin(x * 0.06 + i * 1.7) * 10), 4, 3, M[['red', 'yellow', 'green', 'teal', 'purple', 'orange'][i]][1]); } },
  mid(g, t) { ground(g, 300, 270, M.stone, { k: 0 }); },
  props: {
    socket: { x: 190, y: 190, w: 64, h: 70, about: 'wall socket with two holes', opens: true, draw(g, t, S) { box(g, 190, 190, 64, 70, M.white); for (const y of [204, 230]) { R(g, 204, y, 36, 14, INK); R(g, 208, y + 3, 8, 8, M.dark[2]); R(g, 228, y + 3, 8, 8, M.dark[2]); } if (S.lit > 0.2) glow(g, 222, 225, 40, M.yellow[3], 0.4); } },
    plug: libProp('plug', 20, 238, 3, { about: 'plug on the loose' }), cable: libProp('cable', 40, 286, 4, { about: 'long tangled cable' }), bolt: libProp('bolt', 104, 100, 3, { about: 'power bolt' }),
  },
  fore(g, t) { R(g, -20, 440, 70, 50, M.dark[0]); R(g, 220, 430, 100, 60, M.dark[0]); },
});
defScenario({
  id: 'firewall-gate', name: 'Firewall gate', about: 'Night castle-style gate of a network: a big shield, a padlock, a scanning magnifier and a bug trying to sneak in.',
  topics: ['security', 'privacy', 'firewall', 'malware', 'hacking', 'passwords', 'antivirus', 'encryption', 'seguridad', 'privacidad', 'virus', 'hackeo'], keywords: ['firewall', 'security', 'gate', 'shield'], time: 'night', floor: ['tiles', 'stone', ['rock', 'barrel']],
  far(g, t, c) { skyFill(g, c, -20, 290); stars(g, t, 30, 5, 170); },
  back(g, t) { R(g, -20, 150, 310, 150, M.stone[1]); dith(g, -20, 150, 310, 150, M.stone[1], M.stone[0], 1); for (let x = -10; x < 280; x += 22) R(g, x, 138, 14, 14, M.stone[2]); R(g, 80, 160, 110, 140, M.dark[0]); R(g, 86, 166, 98, 134, M.blue[0]); for (let y = 170; y < 300; y += 14) R(g, 86, y, 98, 1, M.blue[1]); },
  mid(g, t) { ground(g, 300, 270, M.stone, { k: 0 }); },
  props: { shield: libProp('shield', 87, 190, 4, { about: 'big shield on the gate' }), padlock: libProp('padlock', 12, 238, 3, { about: 'padlock' }), scanner: libProp('magnifier', 190, 214, 3, { about: 'scanner magnifier' }), bug: libProp('bug', 196, 296, 3, { about: 'bug trying to sneak in' }) },
  fore(g, t) { R(g, -20, 440, 60, 50, M.dark[0]); R(g, 230, 440, 80, 50, M.dark[0]); },
});
