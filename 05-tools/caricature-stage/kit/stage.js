// Spotlight stage backdrop: dark teal room, warm cones from above, haze, vignette.
(function () {
  const W = 1080, H = 1920;
  function bg(c, t, o = {}) {
    const tint = o.tint || ['#1d4048', '#0a1519'];
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, tint[0]);
    g.addColorStop(1, tint[1]);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    // back wall diamond pattern
    c.save();
    c.globalAlpha = 0.07;
    c.strokeStyle = '#9fd0d6';
    c.lineWidth = 2;
    for (let i = -20; i < 30; i++) {
      c.beginPath();
      c.moveTo(i * 90, 0);
      c.lineTo(i * 90 + 1100, 1100);
      c.moveTo(i * 90, 0);
      c.lineTo(i * 90 - 1100, 1100);
      c.stroke();
    }
    c.restore();
  }
  function cones(c, t, list) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const k of list) {
      const sway = Math.sin(t * 0.6 + k.x) * 18;
      const x = k.x + sway, top = k.top ?? -40, bot = k.bot ?? 1500, spread = k.spread ?? 330;
      const g = c.createLinearGradient(0, top, 0, bot);
      const col = k.col || '255,200,120';
      g.addColorStop(0, `rgba(${col},${0.42 * (k.a ?? 1)})`);
      g.addColorStop(0.7, `rgba(${col},${0.1 * (k.a ?? 1)})`);
      g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x - 40, top);
      c.lineTo(x + 40, top);
      c.lineTo(x + spread + (k.lean || 0), bot);
      c.lineTo(x - spread + (k.lean || 0), bot);
      c.closePath();
      c.fill();
      // pool of light on the floor
      const p = c.createRadialGradient(x + (k.lean || 0), bot - 40, 10, x + (k.lean || 0), bot - 40, spread);
      p.addColorStop(0, `rgba(${col},${0.25 * (k.a ?? 1)})`);
      p.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = p;
      c.fillRect(x - spread * 1.3, bot - spread, spread * 2.6, spread * 1.5);
    }
    c.restore();
  }
  function floor(c, y = 1500) {
    const g = c.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, '#0e1a1d');
    g.addColorStop(1, '#05090a');
    c.fillStyle = g;
    c.fillRect(0, y, W, H - y);
  }
  function haze(c, t) {
    c.save();
    let s = 11;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const x = (rnd() * W + t * (8 + rnd() * 14)) % W;
      const y = (rnd() * 1500 - t * (4 + rnd() * 6) + 1500) % 1500;
      c.fillStyle = `rgba(255,225,170,${0.08 + rnd() * 0.18})`;
      c.beginPath();
      c.arc(x, y, 1.2 + rnd() * 2.4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
  function vignette(c, k = 0.75) {
    const g = c.createRadialGradient(W / 2, H * 0.45, W * 0.3, W / 2, H * 0.5, H * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${k})`);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
  function grain(c, t) {
    c.save();
    c.globalAlpha = 0.05;
    let s = Math.floor(t * 30) * 977 + 3;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 900; i++) {
      c.fillStyle = rnd() > 0.5 ? '#fff' : '#000';
      c.fillRect(rnd() * W, rnd() * H, 2, 2);
    }
    c.restore();
  }
  window.STAGE = { W, H, bg, cones, floor, haze, vignette, grain };
})();
