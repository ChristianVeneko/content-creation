/* scenarios-g.js: developer-tooling scenarios (git desk, server room, review room, terminal cave, CI pipeline, ticket board,
 * API kitchen, deploy pad). Every prop is a library prop from props.js / props-tech.js, so beats drive named states
 * (fill / open / light). Action stays in the 16-72 % band; floor.js dresses the lower third; ambient.js adds the moving life. */
'use strict';
defScenario({
  id: 'git-desk', name: 'Git workflow desk', about: 'Dusk dev desk: a branch graph and commit nodes on the wall, a laptop, a terminal and a folder of changes.',
  topics: ['git', 'commit', 'branches', 'version control', 'merge', 'save your work', 'history of changes', 'repository'], avoid: ['nature', 'food'], keywords: ['git', 'branch', 'commit', 'repo', 'desk'], time: 'dusk', floor: ['planks', 'wood', ['crate', 'chair']],
  far(g, t, c) { skyFill(g, c, -20, 262); skyline(g, t, 262, 5, M.stone, 8, 0.45, 40, 90); },
  back(g, t) { R(g, -30, 70, 340, 200, M.purple[0]); dith(g, -30, 70, 340, 200, M.purple[0], M.purple[1], 1); R(g, -30, 66, 340, 5, M.dark[1]); for (let x = 12; x < 270; x += 34) R(g, x, 76, 2, 190, M.dark[1]); },
  mid(g, t) { ground(g, 300, 270, M.wood, { specks: 0 }); deskTop(g, -10, 270, 290, M.wood); R(g, 0, 280, 270, 3, M.wood[0]); ceilLamp(g, 135, 56, t, M.yellow); },
  props: { graph: libProp('branch-graph', 8, 104, 2, { about: 'branch graph: main line and a feature branch (fill grows it, light highlights the merge)' }), nodes: libProp('commit-nodes', 134, 128, 2, { about: 'row of commit nodes (fill adds commits, light highlights the newest)' }), laptop: libProp('laptop', 8, 202, 2, { about: 'laptop: code, error (open) or success (light)' }), folder: libProp('folder', 108, 216, 1.5, { about: 'folder of changes (open fans the papers)' }), terminal: libProp('terminal', 180, 196, 1.6, { about: 'terminal typing commands (fill types lines)' }) },
  fore(g, t) { R(g, -20, 430, 80, 60, M.dark[0]); R(g, 230, 440, 80, 50, M.dark[0]); dust(g, t, 12, 4, M.yellow[4], 4); },
});
defScenario({
  id: 'server-room', name: 'Remote server room', about: 'Cold night data hall: racks with blinking lights, an uplink cloud and a router; something is being uploaded to a remote machine.',
  topics: ['remote server', 'push', 'upload', 'cloud storage', 'deploy target', 'backup', 'hosting', 'sending to the team'], avoid: ['nature', 'food'], keywords: ['server', 'remote', 'upload', 'cloud', 'rack'], time: 'night', floor: ['metal', 'steel', ['cable', 'pipe']],
  back(g, t) { R(g, -30, -20, 340, 330, M.dark[1]); for (let x = -10; x < 290; x += 30) { R(g, x, 66, 2, 240, M.blue[0]); } for (let y = 80; y < 300; y += 24) R(g, -30, y, 340, 1, M.blue[0]); glow(g, 135, 120, 110, M.teal[2], 0.15); },
  mid(g, t) { ground(g, 300, 270, M.steel, { specks: 6 }); R(g, -20, 296, 310, 4, M.teal[1]); },
  props: { remote: libProp('remote-server', 100, 206, 2, { about: 'the remote server: uploading bar (fill) and received counter' }), 'rack-a': libProp('server', 12, 216, 2, { about: 'local rack on the left' }), 'rack-b': libProp('server', 208, 216, 2, { about: 'rack on the right' }), uplink: libProp('cloud', 90, 104, 2, { about: 'uplink cloud (fill shows an upload bar)' }), router: libProp('router', 174, 118, 1.5, { about: 'router with blinking lights' }) },
  fore(g, t) { R(g, -30, 420, 90, 70, M.dark[0]); R(g, 240, 430, 80, 60, M.dark[0]); for (const x of [30, 100, 170, 240]) R(g, x, 0, 3, 50 + (x % 37), M.dark[0]); },
});
defScenario({
  id: 'review-room', name: 'Code review room', about: 'Warm dusk meeting room: a pull-request card on the board, an editor, a magnifying glass and a bug caught on the floor.',
  topics: ['code review', 'pull request', 'approval', 'feedback', 'quality', 'reviewing changes', 'finding mistakes in code'], avoid: ['nature', 'sports'], keywords: ['review', 'pull request', 'pr', 'approve', 'bug'], time: 'dusk', floor: ['carpet', 'brick', ['plant', 'chair']],
  far(g, t, c) { R(g, -30, -20, 340, 100, M.brick[0]); dith(g, -30, -20, 340, 100, M.brick[0], M.brick[1], 1); },
  back(g, t) { R(g, -30, 66, 340, 240, M.brick[1]); dith(g, -30, 66, 340, 240, M.brick[1], M.brick[0], 1); windowBox(g, 20, 100, 44, 56, true, M.blue); windowBox(g, 206, 100, 44, 56, true, M.blue); R(g, -30, 66, 340, 5, M.wood[1]); },
  mid(g, t) { ground(g, 300, 270, M.wood, { specks: 0 }); deskTop(g, 10, 272, 250, M.wood); },
  props: { pr: libProp('pr-card', 96, 96, 2, { about: 'pull-request card: open, approved (fill) and merged (light)' }), editor: libProp('editor', 8, 196, 1.5, { about: 'editor showing the code under review' }), glass: libProp('magnifier', 120, 232, 2, { about: 'magnifying glass sweeping the code' }), bug: libProp('bug', 200, 262, 2, { about: 'a bug found in review' }), shield: libProp('shield', 206, 190, 1.5, { about: 'approval shield' }) },
  fore(g, t) { R(g, -30, 430, 80, 60, M.dark[0]); R(g, 240, 440, 80, 50, M.dark[0]); },
});
defScenario({
  id: 'terminal-cave', name: 'Terminal cave', about: 'Dark cave lit by one giant terminal and a keyboard: glowing mushrooms, a crawling bug and a golden key.',
  topics: ['command line', 'terminal', 'shell', 'commands', 'hacker', 'typing commands', 'permissions and keys'], avoid: ['nature', 'kids'], keywords: ['terminal', 'cli', 'shell', 'command', 'console'], time: 'night', floor: ['sand', 'stone', ['rock', 'cable']],
  far(g, t, c) { R(g, -30, -20, 340, 300, M.dark[0]); stars(g, t, 14, 3, 80); },
  back(g, t) { for (let i = 0; i < 9; i++) { const x = i * 34 - 8, h = 30 + hs(i + 2) * 50; R(g, x, 66, 18, h, M.stone[0]); R(g, x + 4, 66 + h, 10, 8, M.stone[0]); R(g, x + 7, 66 + h + 8, 4, 6, M.stone[0]); } glow(g, 135, 210, 130, M.green[2], 0.2); },
  mid(g, t) { ground(g, 300, 270, M.stone, { k: 1, specks: 14 }); for (const [x, y] of [[18, 292], [236, 288], [250, 300]]) { R(g, x, y - 8, 3, 8, M.green[2]); disc(g, x + 1, y - 9, 4, M.green[3]); } },
  props: { terminal: libProp('terminal', 56, 150, 3, { about: 'giant terminal: fill types more lines' }), keyboard: libProp('keyboard', 14, 284, 2, { about: 'keyboard on the cave floor' }), key: libProp('key', 140, 296, 2, { about: 'golden key' }), bug: libProp('bug', 206, 290, 2, { about: 'a bug crawling in the dark' }) },
  fore(g, t) { R(g, -30, 420, 90, 70, M.dark[0]); R(g, 240, 430, 80, 60, M.dark[0]); },
});
defScenario({
  id: 'ci-pipeline', name: 'CI pipeline conveyor', about: 'Factory line for builds: boxes ride a belt through a check gate that stamps green checks; test tubes fill with results.',
  topics: ['continuous integration', 'ci pipeline', 'automated tests', 'build', 'checks', 'quality gate', 'automation'], avoid: ['nature', 'food'], keywords: ['ci', 'pipeline', 'tests', 'build', 'checks'], time: 'dusk', floor: ['metal', 'stone', ['crate', 'pipe']],
  far(g, t, c) { skyFill(g, c, -20, 262); },
  back(g, t) { R(g, -30, 90, 340, 190, M.stone[1]); dith(g, -30, 90, 340, 190, M.stone[1], M.stone[2], 1); for (let i = 0; i < 4; i++) { R(g, 14 + i * 66, 124, 46, 40, M.dark[1]); R(g, 16 + i * 66, 126, 42, 36, M.yellow[1]); } pipeH(g, -20, 100, 330, M.steel); },
  mid(g, t) { ground(g, 300, 270, M.stone, { k: 0 }); for (let x = -40; x < 330; x += 8) { R(g, x, 296, 4, 4, M.yellow[1]); R(g, x + 4, 296, 4, 4, M.dark[1]); } },
  props: { belt: libProp('ci-belt', 6, 248, 2, { about: 'conveyor with a check gate (light stamps green checks)' }), 'tube-a': libProp('ci-tube', 160, 214, 2, { about: 'test tube with results (fill raises it, light checks it)' }), 'tube-b': libProp('ci-tube', 202, 214, 2, { about: 'second test tube' }), gear: libProp('gear', 14, 122, 2, { about: 'machine gear' }), screen: libProp('screen', 100, 112, 1.6, { about: 'status monitor' }) },
  fore(g, t) { R(g, -30, 420, 80, 70, M.dark[0]); R(g, 240, 430, 80, 60, M.dark[0]); dust(g, t, 14, 4, M.yellow[4], 6); },
});
defScenario({
  id: 'ticket-board-office', name: 'Ticket board office', about: 'Bright agile office: a big kanban board, a TODO-DOING-DONE signpost and a queue of crates waiting.',
  topics: ['ticket board', 'kanban', 'task tracking', 'agile', 'sprint', 'backlog', 'project management', 'queue of work'], avoid: ['nature', 'horror'], keywords: ['kanban', 'ticket', 'board', 'sprint', 'backlog', 'todo'], time: 'day', floor: ['tiles', 'sand', ['plant', 'chair']],
  far(g, t, c) { R(g, -30, -20, 340, 100, M.blue[2]); dith(g, -30, -20, 340, 100, M.blue[2], M.blue[3], 1); },
  back(g, t) { R(g, -30, 66, 340, 240, M.blue[2]); dith(g, -30, 66, 340, 240, M.blue[2], M.blue[3], 1); R(g, -30, 66, 340, 5, M.white[2]); windowBox(g, 10, 106, 22, 44, false, M.teal); },
  mid(g, t) { ground(g, 300, 270, M.sand, { specks: 0 }); },
  props: { board: libProp('ticket-board', 39, 100, 3, { about: 'kanban board: fill moves the highlighted ticket across the columns' }), sign: libProp('sign-post', 10, 232, 2, { about: 'signpost TODO / DOING / DONE (fill)' }), queue: libProp('crate-stack', 206, 200, 2, { about: 'queue of crates (fill adds crates)' }), bulb: libProp('bulb', 124, 250, 2, { about: 'idea bulb' }) },
  fore(g, t) { R(g, -30, 430, 80, 60, M.dark[0]); R(g, 240, 440, 80, 50, M.dark[0]); },
});
defScenario({
  id: 'api-kitchen', name: 'API restaurant kitchen', about: 'Warm kitchen where requests are order slips on a rail, a hot stove cooks them and a package leaves through the pass window.',
  topics: ['api', 'requests and responses', 'orders', 'client and server', 'endpoint', 'waiter and kitchen', 'microservices'], avoid: ['nature', 'space'], keywords: ['api', 'request', 'response', 'order', 'endpoint', 'kitchen'], time: 'day', floor: ['tiles', 'sand', ['barrel', 'crate']],
  far(g, t, c) { R(g, -30, -20, 340, 100, M.orange[2]); dith(g, -30, -20, 340, 100, M.orange[2], M.orange[1], 1); },
  back(g, t) { R(g, -30, 66, 340, 240, M.orange[2]); dith(g, -30, 66, 340, 240, M.orange[2], M.orange[1], 1); for (let x = -10; x < 280; x += 22) for (let y = 70; y < 160; y += 22) R(g, x, y, 21, 21, (x / 22 + y / 22) % 2 ? M.orange[3] : M.orange[2]); R(g, -30, 150, 340, 4, M.steel[2]); },
  mid(g, t) { ground(g, 300, 270, M.sand, { specks: 0 }); box(g, -10, 262, 290, 24, M.steel); R(g, -10, 286, 290, 8, M.steel[0]); },
  props: { 'slip-a': libProp('order-slip', 20, 100, 2, { about: 'order slip (fill ticks its lines)' }), 'slip-b': libProp('order-slip', 78, 100, 2, { about: 'second order slip' }), stove: libProp('flame', 20, 206, 2, { about: 'stove fire cooking the order' }), pass: libProp('package', 190, 208, 2, { about: 'package leaving through the pass window (open, tape with fill, label with light)' }), phone: libProp('phone', 134, 190, 1.2, { about: 'phone placing the order' }) },
  fore(g, t) { R(g, -30, 430, 80, 60, M.dark[0]); R(g, 240, 440, 80, 50, M.dark[0]); },
});
defScenario({
  id: 'deploy-pad', name: 'Deploy launch pad', about: 'Sunrise launch field: a rocket on a pad takes off when the deploy ships, with a signpost, a mailbox and a pull-request card.',
  topics: ['deploy', 'release', 'shipping to production', 'launch', 'going live', 'delivery to users', 'ship it'], avoid: ['nature', 'food'], keywords: ['deploy', 'launch', 'release', 'ship', 'production', 'rocket'], time: 'dusk', floor: ['grass', 'grass', ['bush', 'barrel']],
  far(g, t, c) { skyFill(g, c, -20, 262); sunMoon(g, c, 60, 200, 22); clouds(g, t, 120, 4, '#ffffff', 3); },
  back(g, t) { hills(g, 272, M.grass, 4, 22); },
  mid(g, t) { ground(g, 300, 270, M.grass, { specks: 20 }); R(g, 60, 296, 150, 6, M.stone[2]); },
  props: { pad: libProp('deploy-pad', 78, 138, 3, { about: 'rocket on its pad (fill launches it, light starts the beacon)' }), sign: libProp('sign-post', 6, 226, 2, { about: 'signpost TODO / DOING / DONE' }), mail: libProp('mailbox', 214, 206, 2, { about: 'mailbox (open raises the flag)' }), pr: libProp('pr-card', 200, 108, 1.2, { about: 'pull-request card (fill approves, light merges)' }) },
  fore(g, t) { R(g, -30, 430, 80, 60, M.dark[0]); R(g, 240, 440, 80, 50, M.dark[0]); },
});
