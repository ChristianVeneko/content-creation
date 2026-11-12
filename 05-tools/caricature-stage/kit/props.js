// Props and motion helpers for the caricature stage films.
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lin = (t, a, b) => clamp((t - a) / (b - a));
  const eo = (x) => 1 - Math.pow(1 - x, 3);
  const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const back = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const pop = (t, t0, d = 0.35) => (t < t0 ? 0 : back(clamp((t - t0) / d)));
  const F = (px) => `900 ${px}px Montserrat, Arial Black, sans-serif`;

  function txt(c, s, x, y, px, col = '#fff', o = {}) {
    c.save();
    c.font = F(px);
    c.textAlign = o.align || 'center';
    c.textBaseline = 'middle';
    if (o.stroke) { c.lineWidth = o.stroke; c.strokeStyle = o.strokeCol || '#0b0d10'; c.lineJoin = 'round'; c.strokeText(s, x, y); }
    if (o.shadow !== false) { c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 14; c.shadowOffsetY = 5; }
    c.fillStyle = col;
    c.fillText(s, x, y);
    c.restore();
  }

  // rubber stamp that slams in: k = pop progress
  function stamp(c, x, y, s, k, o = {}) {
    if (k <= 0) return;
    const col = o.col || '#e2312b', px = o.px || 92, ang = o.ang ?? -0.12;
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    const sc = 1 + (1 - clamp(k)) * 1.6;
    c.scale(sc, sc);
    c.globalAlpha = clamp(k * 1.4);
    c.font = F(px);
    const w = c.measureText(s).width + px * 0.8, h = px * 1.45;
    c.beginPath();
    c.roundRect(-w / 2, -h / 2, w, h, px * 0.16);
    c.lineWidth = px * 0.11;
    c.strokeStyle = col;
    c.stroke();
    c.fillStyle = 'rgba(20,0,0,0.25)';
    c.fill();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = col;
    c.fillText(s, 0, px * 0.05);
    c.restore();
  }

  function paper(c, x, y, w, h, ang, title, o = {}) {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 14;
    c.fillStyle = o.bg || '#efe4c9';
    c.fillRect(-w / 2, -h / 2, w, h);
    c.shadowColor = 'transparent';
    const g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(120,90,40,0.18)');
    c.fillStyle = g; c.fillRect(-w / 2, -h / 2, w, h);
    c.font = F(o.titlePx || 46);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = o.ink || '#2b2116';
    c.fillText(title, 0, -h / 2 + 70);
    c.fillStyle = 'rgba(43,33,22,0.55)';
    const n = o.lines ?? 7;
    for (let i = 0; i < n; i++) {
      const lw = (i % 3 === 2 ? 0.55 : 0.8) * w;
      c.fillRect(-w * 0.4, -h / 2 + 140 + i * 38, lw, 12);
    }
    if (o.badge) o.badge(c, w, h);
    c.restore();
  }

  function tv(c, x, y, w, h, inner, o = {}) {
    c.save();
    c.translate(x, y);
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40;
    c.fillStyle = '#1b2226';
    c.beginPath(); c.roundRect(-w / 2 - 26, -h / 2 - 26, w + 52, h + 52, 30); c.fill();
    c.shadowColor = 'transparent';
    c.save();
    c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.clip();
    const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, o.bg0 || '#b8282b'); g.addColorStop(1, o.bg1 || '#4a0e12');
    c.fillStyle = g; c.fillRect(-w / 2, -h / 2, w, h);
    if (inner) inner(c, w, h);
    // scanlines
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = -h / 2; i < h / 2; i += 6) c.fillRect(-w / 2, i, w, 2);
    c.restore();
    if (o.live) {
      c.fillStyle = '#e2312b'; c.fillRect(-w / 2 + 20, h / 2 - 80, 150, 50);
      txt(c, 'EN VIVO', -w / 2 + 95, h / 2 - 55, 26, '#fff', { shadow: false });
    }
    if (o.banner) {
      c.fillStyle = '#f3efe6'; c.fillRect(-w / 2 + 170, h / 2 - 80, w - 190, 50);
      txt(c, o.banner, -w / 2 + 170 + (w - 190) / 2, h / 2 - 55, 26, '#1a1a1a', { shadow: false });
    }
    c.restore();
  }

  function phone(c, x, y, w, h, ang, inner, o = {}) {
    c.save();
    c.translate(x, y); c.rotate(ang);
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 36; c.shadowOffsetY = 16;
    c.fillStyle = '#121417';
    c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 56); c.fill();
    c.shadowColor = 'transparent';
    c.save();
    c.beginPath(); c.roundRect(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 44); c.clip();
    c.fillStyle = o.bg || '#20262b'; c.fillRect(-w / 2, -h / 2, w, h);
    if (inner) inner(c, w, h);
    c.restore();
    c.fillStyle = '#000'; c.beginPath(); c.roundRect(-60, -h / 2 + 30, 120, 30, 15); c.fill();
    if (o.handle) {
      c.fillStyle = o.dot || '#e8457a'; c.beginPath(); c.arc(-w / 2 + 70, -h / 2 + 100, 22, 0, TAU); c.fill();
      txt(c, o.handle, -w / 2 + 104, -h / 2 + 100, 28, '#fff', { align: 'left', shadow: false });
    }
    c.restore();
  }

  function bubble(c, x, y, s, k, o = {}) {
    if (k <= 0) return;
    const px = o.px || 64;
    c.save();
    c.translate(x, y);
    c.scale(k, k);
    c.rotate(o.ang || 0);
    c.font = F(px);
    const w = c.measureText(s).width + px * 1.1, h = px * 1.7;
    c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 20; c.shadowOffsetY = 8;
    c.fillStyle = o.bg || '#f6f1e6';
    c.beginPath();
    c.roundRect(-w / 2, -h / 2, w, h, h / 2);
    const tx = (o.tail || 0) * w * 0.3;
    c.moveTo(tx - 20, h / 2 - 4); c.lineTo(tx + (o.tail || 0) * 50, h / 2 + 46); c.lineTo(tx + 26, h / 2 - 4);
    c.fill();
    c.shadowColor = 'transparent';
    c.fillStyle = o.ink || '#1b1613';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(s, 0, px * 0.05);
    c.restore();
  }

  function burst(c, x, y, r, k, col = '#ffd23f', label) {
    if (k <= 0 || k >= 1.6) return;
    c.save();
    c.translate(x, y);
    const s = eo(clamp(k));
    c.scale(s, s);
    c.globalAlpha = clamp(1.6 - k);
    c.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU, rr = i % 2 ? r * 0.55 : r;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
    c.fillStyle = col; c.fill();
    c.lineWidth = 10; c.strokeStyle = '#b8201e'; c.stroke();
    if (label) txt(c, label, 0, 0, r * 0.36, '#b8201e', { shadow: false, stroke: 0 });
    c.restore();
  }

  function bill(c, x, y, ang, s = 1) {
    c.save();
    c.translate(x, y); c.rotate(ang); c.scale(s, s);
    c.fillStyle = '#7fb36a'; c.fillRect(-80, -38, 160, 76);
    c.strokeStyle = '#3f6a33'; c.lineWidth = 5; c.strokeRect(-70, -28, 140, 56);
    c.fillStyle = '#3f6a33'; c.beginPath(); c.arc(0, 0, 20, 0, TAU); c.fill();
    txt(c, '$', 0, 2, 26, '#cfe8c4', { shadow: false });
    c.restore();
  }

  function gavel(c, x, y, ang) {
    c.save();
    c.translate(x, y); c.rotate(ang);
    c.fillStyle = '#7a4a26'; c.fillRect(-14, -10, 28, 260);
    const g = c.createLinearGradient(-110, -60, 110, 60);
    g.addColorStop(0, '#a8693a'); g.addColorStop(1, '#5c3418');
    c.fillStyle = g; c.beginPath(); c.roundRect(-120, -70, 240, 110, 24); c.fill();
    c.fillStyle = '#e3b448'; c.fillRect(-120, -36, 24, 42); c.fillRect(96, -36, 24, 42);
    c.restore();
  }

  function neon(c, x, y, s, px, col, on = 1) {
    c.save();
    c.font = F(px);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = col; c.shadowBlur = 40 * on;
    c.lineWidth = 6; c.strokeStyle = on > 0.5 ? col : 'rgba(120,120,120,0.5)';
    c.strokeText(s, x, y);
    c.shadowBlur = 18 * on;
    c.fillStyle = on > 0.5 ? '#fff6f0' : 'rgba(90,90,90,0.4)';
    c.globalAlpha = 0.25 + 0.75 * on;
    c.fillText(s, x, y);
    c.restore();
  }

  function mic(c, x, y, s = 1) {
    c.save();
    c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#2a2d31'; c.fillRect(-8, 0, 16, 220);
    const g = c.createLinearGradient(-40, -110, 40, 0);
    g.addColorStop(0, '#5a5f66'); g.addColorStop(1, '#1d1f22');
    c.fillStyle = g; c.beginPath(); c.roundRect(-40, -120, 80, 130, 36); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 6; i++) c.fillRect(-30, -105 + i * 18, 60, 5);
    c.restore();
  }

  function silhouette(c, x, y, s = 1, col = '#0c1214') {
    c.save();
    c.translate(x, y); c.scale(s, s);
    c.fillStyle = col;
    c.beginPath(); c.ellipse(0, -120, 70, 86, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(-50, -40); c.bezierCurveTo(-170, -20, -190, 60, -200, 300); c.lineTo(200, 300); c.bezierCurveTo(190, 60, 170, -20, 50, -40); c.fill();
    c.restore();
  }

  function heart(c, x, y, r, col = '#e2312b') {
    c.save();
    c.translate(x, y);
    c.beginPath();
    c.moveTo(0, r * 0.35);
    c.bezierCurveTo(-r * 1.2, -r * 0.4, -r * 0.5, -r * 1.2, 0, -r * 0.45);
    c.bezierCurveTo(r * 0.5, -r * 1.2, r * 1.2, -r * 0.4, 0, r * 0.35);
    c.fillStyle = col; c.fill();
    c.restore();
  }

  function chip(c, x, y, s, k, o = {}) {
    if (k <= 0) return;
    const px = o.px || 54;
    c.save();
    c.translate(x, y); c.scale(k, k);
    c.font = F(px);
    const w = c.measureText(s).width + px * 1.0, h = px * 1.6;
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 20;
    c.fillStyle = o.bg || '#ffd23f';
    c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 18); c.fill();
    c.shadowColor = 'transparent';
    c.fillStyle = o.ink || '#1a1205';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(s, 0, px * 0.05);
    c.restore();
  }

  function tear(c, x, y, k) {
    if (k <= 0) return;
    c.save();
    c.translate(x, y + k * 60);
    c.globalAlpha = clamp(1.2 - k * 0.6);
    c.beginPath();
    c.moveTo(0, -18); c.quadraticCurveTo(14, 4, 0, 14); c.quadraticCurveTo(-14, 4, 0, -18);
    c.fillStyle = '#8fd3ff'; c.fill();
    c.restore();
  }

  // a swinging arm from a shoulder; ang in radians (0 = hanging down)
  function arm(c, x, y, ang, s, sleeve, skin) {
    c.save();
    c.translate(x, y); c.rotate(ang); c.scale(s, s);
    c.lineWidth = 6; c.strokeStyle = 'rgba(255,214,150,0.55)';
    c.fillStyle = sleeve; c.beginPath(); c.roundRect(-46, -20, 92, 150, 40); c.fill(); c.stroke();
    c.fillStyle = skin; c.beginPath(); c.roundRect(-34, 110, 68, 170, 30); c.fill();
    c.beginPath(); c.ellipse(0, 300, 52, 60, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(-34, 110, 20, 170);
    c.restore();
  }

  window.PR = { clamp, lin, eo, eio, back, pop, F, txt, stamp, paper, tv, phone, bubble, burst, bill, gavel, neon, mic, silhouette, heart, chip, tear, arm };
})();
