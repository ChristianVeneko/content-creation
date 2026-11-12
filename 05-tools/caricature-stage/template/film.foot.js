// ---------------- render ----------------
const CUT = 0.45; // L-cut: the previous scene holds while the next line starts
function sceneAt(t) {
  let cur = S[0];
  for (const s of S) if (t >= ST[s.id] + (s === S[0] ? 0 : CUT)) cur = s;
  return cur;
}
const buf = document.createElement('canvas');
buf.width = W; buf.height = H;
const BUF = buf.getContext('2d');

window.DUR = DUR;
window.render = (t) => {
  const sc = sceneAt(t);
  c = BUF;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, H);
  const cam = sc.fn(t) || {};
  c = MAIN;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const since = t - ST[sc.id] - (sc === S[0] ? 0 : CUT);
  const punch = since >= 0 && since < 0.35 && sc !== S[0] ? (1 - eo(since / 0.35)) * 0.05 : 0;
  const z = (cam.zoom || 1) + punch, sh = cam.shake || 0;
  const dx = sh ? Math.sin(t * 91) * sh : 0, dy = sh ? Math.cos(t * 77) * sh : 0;
  c.save();
  c.translate(W / 2 + dx + (cam.pan || 0), H / 2 + dy);
  c.scale(z, z);
  c.drawImage(buf, -W / 2, -H / 2);
  c.restore();
  if (since >= 0 && since < 0.12 && sc !== S[0]) { c.fillStyle = `rgba(255,255,255,${0.25 * (1 - since / 0.12)})`; c.fillRect(0, 0, W, H); }
  STAGE.haze(c, t);
  STAGE.vignette(c, 0.7);
  STAGE.grain(c, t);
  const Q = new URLSearchParams(location.search);
  if (Q.get('cover')) {
    const lines = Q.get('cover').split('|');
    c.save();
    const g = c.createLinearGradient(0, 1150, 0, 1700); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0.9)');
    c.fillStyle = g; c.fillRect(0, 1150, W, 770);
    lines.forEach((L, i) => {
      const hi = L.startsWith('*'); const s = hi ? L.slice(1) : L;
      let px = 124; c.font = PR.F(px); while (c.measureText(s).width > 900) { px -= 4; c.font = PR.F(px); }
      txt(c, s, 540, 1330 + i * 135, px, hi ? '#ffd23f' : '#ffffff', { stroke: 16 });
    });
    c.restore();
    return;
  }
  if (window.CAP) window.CAP.render(t);
};

window.READY = false;
const starts = {};
for (const id of IDS) starts[id] = ST[id];
makeCaptions({ words: WORDS, starts, fontUrl: 'fonts/Montserrat-Black.ttf', accent: '#ffd23f', y: 1330, size: 92, maxWords: 2, maxChars: 13,
  emphasis: EMPHASIS }).then((cap) => {
  window.CAP = cap;
  document.fonts.load('900 40px Montserrat').then(() => { window.render(0); window.READY = true; });
});
