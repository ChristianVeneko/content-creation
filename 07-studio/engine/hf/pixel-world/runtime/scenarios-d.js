/* scenarios-d.js: tech scenarios (1/2): phone workshop, battery lab, charging station, CPU city, data center, wifi tower.
 * Props are library props (props.js) so beats can drive their states. Action sits in the 16-72 % band; floor.js dresses the lower third. */
'use strict';
defScenario({
  id: 'phone-workshop', name: 'Phone workshop', about: 'Repair bench with a giant open smartphone, a battery and a processor chip under a desk lamp.',
  topics: ['smartphone', 'phone', 'device', 'repair', 'hardware', 'inside a gadget', 'celular', 'teléfono', 'móvil'], keywords: ['phone', 'smartphone', 'repair', 'workshop'], time: 'day', floor: ['planks', 'wood', ['crate', 'chair']],
  back(g, t) { R(g, -30, -20, 340, 330, M.teal[0]); dith(g, -30, -20, 340, 330, M.teal[0], M.teal[1], 1); R(g, -30, 90, 340, 4, M.dark[1]); for (let x = 8; x < 270; x += 22) for (let y = 104; y < 250; y += 22) R(g, x, y, 2, 2, M.dark[1]); for (const [x, y, c] of [[22, 112, 'red'], [60, 120, 'yellow'], [200, 110, 'green'], [236, 124, 'blue']]) { R(g, x, y, 4, 30, M[c][2]); R(g, x - 2, y + 26, 8, 8, M.steel[2]); } },
  mid(g, t) { ground(g, 300, 270, M.wood, { specks: 0 }); R(g, -20, 262, 310, 8, M.wood[2]); R(g, -20, 262, 310, 2, M.wood[4]); R(g, -20, 270, 310, 3, M.wood[0]); for (const x of [10, 250]) R(g, x, 273, 8, 28, M.wood[1]); ceilLamp(g, 135, 60, t); },
  props: { phone: libProp('phone', 99, 136, 3, { about: 'giant smartphone on the bench (open shows its insides)' }), battery: libProp('battery', 14, 222, 2, { about: 'lithium battery pack' }), chip: libProp('chip', 196, 198, 2, { about: 'processor chip' }) },
  fore(g, t) { R(g, -20, 430, 70, 60, M.dark[0]); R(g, 230, 440, 70, 50, M.dark[0]); },
});
defScenario({
  id: 'battery-lab', name: 'Battery lab', about: 'Lab bench: a big battery pack with charge segments, a charger, a dial and a thermometer.',
  topics: ['battery', 'charging', 'energy', 'lithium', 'chemistry of power', 'heat while charging', 'batería', 'carga', 'autonomía'], keywords: ['battery', 'lab', 'charge'], time: 'day', floor: ['tiles', 'teal', ['pipe', 'crate']],
  back(g, t) { R(g, -30, -20, 340, 320, M.teal[1]); for (let x = 0; x < 300; x += 20) R(g, x, -20, 1, 320, M.teal[0]); for (let y = 0; y < 300; y += 20) R(g, -30, y, 340, 1, M.teal[0]); for (const x of [30, 120, 220]) { R(g, x, 70, 24, 6, M.steel[2]); R(g, x + 10, 40, 4, 30, M.steel[1]); } },
  mid(g, t) { ground(g, 300, 270, M.steel, { specks: 0 }); R(g, -20, 262, 310, 8, M.steel[3]); R(g, -20, 270, 310, 4, M.steel[0]); R(g, 10, 273, 250, 24, M.steel[1]); },
  props: { pack: libProp('battery', 20, 202, 3, { about: 'big battery pack' }), dial: libProp('gauge', 186, 108, 2, { about: 'voltage dial' }), charger: libProp('charger', 146, 202, 2, { about: 'charger brick' }), thermometer: libProp('thermometer', 224, 190, 2, { about: 'thermometer' }) },
  fore(g, t) { R(g, -20, 430, 80, 60, M.dark[0]); R(g, 220, 440, 90, 50, M.dark[0]); },
});
defScenario({
  id: 'charging-station', name: 'Charging station', about: 'Night street kiosk: a charger, a plug, a cable on the floor and a charge meter under a lightning bolt.',
  topics: ['charging', 'power', 'electricity', 'plug', 'cable', 'wireless charging', 'cargador', 'enchufe', 'energía'], keywords: ['charger', 'plug', 'power'], time: 'night', floor: ['tiles', 'stone', ['cable', 'barrel']],
  far(g, t, c) { skyFill(g, c, -20, 290); stars(g, t, 28, 3, 160); skyline(g, t, 290, 7, M.steel, 9, 0.3, 50, 120); },
  back(g, t) { R(g, 60, 150, 150, 150, M.stone[0]); R(g, 64, 154, 142, 120, M.stone[1]); R(g, 56, 146, 158, 8, M.steel[2]); for (const x of [-4, 244]) lampPost(g, x, 300, t, M.yellow, 120); },
  mid(g, t) { ground(g, 300, 270, M.stone, { k: 0 }); R(g, 80, 168, 110, 80, M.dark[1]); dith(g, 80, 168, 110, 80, M.dark[1], M.teal[0], 2); },
  props: { charger: libProp('charger', 12, 250, 3, { about: 'charger brick on the street' }), plug: libProp('plug', 204, 250, 3, { about: 'wall plug' }), cable: libProp('cable', 76, 284, 2, { about: 'long cable on the floor' }), meter: libProp('battery', 92, 190, 2, { about: 'charge meter on the kiosk' }), bolt: libProp('bolt', 112, 94, 2, { about: 'lightning bolt' }) },
  fore(g, t) { R(g, -20, 440, 60, 50, M.dark[0]); R(g, 230, 430, 80, 60, M.dark[0]); dust(g, t, 16, 6, M.yellow[4], 4); },
});
defScenario({
  id: 'cpu-city', name: 'CPU city', about: 'A glowing city built on a circuit board: a huge processor chip, a clock, a cooling fan and a load dial.',
  topics: ['processor', 'cpu', 'chip', 'cores', 'clock speed', 'performance', 'computation', 'procesador', 'rendimiento', 'throttling'], keywords: ['cpu', 'processor', 'chip', 'circuit'], time: 'night', floor: ['circuit', 'teal', ['cable', 'crate']],
  far(g, t) { bands(g, -20, 0, 300, 330, [M.dark[0], M.blue[0], M.blue[1], M.teal[0]], 8); for (let i = 0; i < 9; i++) { const x = i * 34 - 10, h = 40 + hs(i * 5) * 70; R(g, x, 250 - h, 26, h, M.dark[1]); R(g, x, 250 - h, 26, 2, M.teal[1]); for (let k = 0; k < 5; k++) R(g, x + 4 + (k % 2) * 10, 256 - h + k * 12, 3, 3, Math.floor(t * 3 + i + k) % 3 ? M.teal[3] : M.dark[2]); } },
  back(g, t) { for (let i = 0; i < 7; i++) { const y = 150 + i * 18; R(g, -20, y, 310, 1, M.teal[1]); const p = ((t * 60 + i * 47) % 340) - 20; R(g, p, y - 1, 6, 3, M.yellow[3]); } },
  mid(g, t) { ground(g, 300, 270, M.blue, { specks: 0 }); },
  props: { cpu: libProp('chip', 56, 120, 4, { about: 'the huge processor chip in the city centre' }), clock: libProp('clock', 8, 96, 2, { about: 'clock tower' }), load: libProp('gauge', 196, 96, 2, { about: 'load dial' }), fan: libProp('fan', 190, 232, 2, { about: 'cooling fan' }) },
  fore(g, t) { R(g, -20, 440, 70, 50, M.dark[0]); R(g, 240, 440, 60, 50, M.dark[0]); },
});
defScenario({
  id: 'data-center', name: 'Data center', about: 'Aisle of three tall server racks with blinking LEDs and a cloud icon floating above.',
  topics: ['servers', 'data center', 'cloud computing', 'hosting', 'storage', 'big data', 'internet infrastructure', 'servidor', 'nube', 'centro de datos'], keywords: ['server', 'rack', 'datacenter'], time: 'night', floor: ['metal', 'steel', ['pipe', 'cable']],
  back(g, t) { R(g, -30, -20, 340, 330, M.dark[1]); dith(g, -30, -20, 340, 330, M.dark[1], M.dark[2], 1); for (let x = 10; x < 270; x += 40) { R(g, x, 0, 2, 100, M.steel[0]); } for (let i = 0; i < 6; i++) R(g, 10 + i * 46, 60 + (i % 2) * 8, 30, 3, Math.floor(t * 4 + i) % 4 ? M.teal[2] : M.dark[3]); pipeH(g, -20, 36, 310, M.purple, 6); },
  mid(g, t) { ground(g, 300, 270, M.steel, { specks: 0 }); R(g, 120, 300, 30, 180, M.purple[1]); },
  props: { rack1: libProp('server', 18, 215, 3, { about: 'left server rack' }), rack2: libProp('server', 99, 215, 3, { about: 'middle server rack' }), rack3: libProp('server', 180, 215, 3, { about: 'right server rack' }), cloud: libProp('cloud', 84, 96, 2, { about: 'cloud icon above the racks' }) },
  fore(g, t) { R(g, -20, 440, 60, 50, M.dark[0]); R(g, 230, 430, 90, 60, M.dark[0]); dust(g, t, 12, 9, M.teal[3], 4); },
});
defScenario({
  id: 'wifi-tower', name: 'Wifi tower', about: 'Green hill with a lattice antenna tower sending rings of signal, a house with a router and a phone.',
  topics: ['wifi', 'signal', 'network', 'internet', 'antenna', '5g', 'coverage', 'router', 'señal', 'red', 'conexión'], keywords: ['wifi', 'tower', 'antenna', 'signal'], time: 'day', floor: ['grass', 'grass', ['bush', 'rock']],
  far(g, t, c) { skyFill(g, c, -20, 280); sunMoon(g, c, 220, 90, 16); clouds(g, t, 70, 4, '#ffffff', 3); hills(g, 270, M.grass, 4, 30); },
  mid(g, t) { ground(g, 300, 270, M.grass, { specks: 20 }); R(g, 150, 220, 90, 82, M.brick[1]); R(g, 142, 208, 106, 14, M.brick[2]); R(g, 170, 250, 22, 50, M.wood[1]); },
  props: {
    tower: { x: 24, y: 110, w: 56, h: 200, about: 'lattice antenna tower sending signal rings', fills: true,
      draw(g, t, S) { for (let i = 0; i < 9; i++) { const y = 300 - i * 20, w = 44 - i * 3; R(g, 52 - w / 2, y, w, 3, M.steel[2]); line(g, 52 - w / 2, y, 52 + w / 2 - 3, y - 20, 2, M.steel[1]); line(g, 52 + w / 2, y, 52 - w / 2 + 3, y - 20, 2, M.steel[1]); } disc(g, 52, 106, 6, M.red[2]); const n = Math.round(1 + S.fill * 3 + S.lit); for (let k = 0; k < n; k++) { const r = ((t * 24 + k * 22) % 70) + 8; alpha(g, 1 - r / 78, () => ring(g, 52, 106, r, M.teal[3])); } } },
    wifi: libProp('wifi', 104, 88, 3, { about: 'wifi symbol of the signal' }), router: libProp('router', 154, 224, 2, { about: 'router in the house' }), phone: libProp('phone', 208, 218, 2, { about: 'phone receiving signal' }),
  },
  fore(g, t) { R(g, -20, 440, 60, 50, M.dark[0]); R(g, 230, 440, 90, 50, M.dark[0]); },
});
