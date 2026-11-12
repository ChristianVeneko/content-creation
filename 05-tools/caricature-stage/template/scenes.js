// One scene per narration line. Each scene MUST start with a SCENERY set that matches the place
// (build.sh refuses scenes without one). Time every prop to a word: at('l03', 'word').
// Helpers in scope: ch(t, id, x, y, s, opts), at, end, talk, ST, DUR, W, H, PR helpers (stamp, chip, bubble,
// burst, phone, tv, paper, gavel, mic, neon, heart, tear, arm, ...), props-extra (thug, vinyl, tomb, manhole,
// jacuzzi, duck, trash, roadSign, fireAura, redEyes, tostones, board, guard, cape, vs, ...).
const S = [];
function scene(id, fn) { S.push({ id, fn }); }

scene('l01', (t) => {
  const a = ST.l01, tK = at('l01', 'PALABRA');
  SCENERY.lobby(c, t);
  ch(t, 'host', 540, 960, 1.05, { look: 0 });
  stamp(c, 540, 520, 'SELLO', pop(t, tK, 0.28), { px: 80 });
  return { zoom: 1 + lin(t, a, end('l01')) * 0.05 };
});
