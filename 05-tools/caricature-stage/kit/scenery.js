// Detailed painted-vector backgrounds for the caricature films (1080x1920).
// Each set is layered (far, mid, near), lit, and has its own ambient motion.
(function () {
  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const lg = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const rg = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const glow = (c, x, y, r, col, a = 1) => { c.fillStyle = rg(c, x, y, 0, r, [[0, `rgba(${col},${a})`], [1, `rgba(${col},0)`]]); c.fillRect(x - r, y - r, r * 2, r * 2); };

  // ---------- shared pieces ----------
  function palm(c, x, y, s, t, seed = 1, col = '#0b1a1a') {
    c.save(); c.translate(x, y); c.scale(s, s);
    // trunk with rings
    c.strokeStyle = col; c.lineCap = 'round';
    c.lineWidth = 34; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(30, -260, 10 + Math.sin(t * 0.7 + seed) * 6, -520); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 3;
    for (let i = 1; i < 14; i++) { const yy = -i * 37; c.beginPath(); c.moveTo(-14 + i, yy); c.lineTo(16 + i * 0.6, yy - 4); c.stroke(); }
    // fronds
    const top = [10 + Math.sin(t * 0.7 + seed) * 6, -520];
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.42 + Math.sin(t * 1.1 + i + seed) * 0.05;
      const L = 230 + (i % 3) * 40, tipx = top[0] + Math.cos(a) * L, tipy = top[1] + Math.sin(a) * L * 0.7 + 90;
      c.fillStyle = col; c.beginPath(); c.moveTo(top[0], top[1]);
      c.quadraticCurveTo((top[0] + tipx) / 2 + Math.sin(a) * 40, (top[1] + tipy) / 2 - 60, tipx, tipy);
      c.quadraticCurveTo((top[0] + tipx) / 2 - Math.sin(a) * 10, (top[1] + tipy) / 2 - 20, top[0], top[1] + 16); c.fill();
      // leaflets
      c.strokeStyle = col; c.lineWidth = 5;
      for (let k = 0.25; k < 0.95; k += 0.12) {
        const px = top[0] + (tipx - top[0]) * k, py = top[1] + (tipy - top[1]) * k - Math.sin(k * Math.PI) * 50;
        c.beginPath(); c.moveTo(px, py); c.lineTo(px + 26 * Math.cos(a + 1.2), py + 30 + 10 * k); c.stroke();
      }
    }
    c.fillStyle = '#2a1d10'; for (const [dx, dy] of [[-10, 8], [14, 10], [2, 20]]) { c.beginPath(); c.arc(top[0] + dx, top[1] + dy, 14, 0, TAU); c.fill(); }
    c.restore();
  }
  function plant(c, x, y, s, t, seed = 2) {
    c.save(); c.translate(x, y); c.scale(s, s);
    // pot
    c.fillStyle = lg(c, -90, 0, 90, 0, [[0, '#3c2a1e'], [0.5, '#8a6a4c'], [1, '#2a1d14']]);
    c.beginPath(); c.moveTo(-100, 0); c.lineTo(100, 0); c.lineTo(78, 210); c.lineTo(-78, 210); c.closePath(); c.fill();
    c.fillStyle = '#e3b448'; c.fillRect(-104, -6, 208, 18);
    // monstera leaves
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.36 + Math.sin(t * 0.9 + i + seed) * 0.04, L = 260 + (i % 3) * 70;
      const ex = Math.cos(a) * L, ey = Math.sin(a) * L;
      c.strokeStyle = '#1d4a2c'; c.lineWidth = 7; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(ex * 0.4, ey * 0.6, ex, ey); c.stroke();
      c.save(); c.translate(ex, ey); c.rotate(a + Math.PI / 2);
      c.fillStyle = lg(c, -70, 0, 70, 0, [[0, '#1f5a34'], [0.5, '#3f8f52'], [1, '#174628']]);
      c.beginPath(); c.ellipse(0, 0, 70, 95, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(10,30,15,0.6)'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -90); c.lineTo(0, 90); c.stroke();
      c.fillStyle = 'rgba(8,20,10,0.55)'; for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(k * 26, 10, 7, 26, 0, 0, TAU); c.fill(); }
      c.restore();
    }
    c.restore();
  }
  function peopleWalking(c, t, y, s, n, col, seed = 3) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const speed = 18 + r() * 22, dir = r() > 0.5 ? 1 : -1, off = r() * W;
      const x = ((off + dir * t * speed) % (W + 200) + W + 200) % (W + 200) - 100;
      const sc = s * (0.85 + r() * 0.3), bob = Math.abs(Math.sin(t * 4 + i)) * 4;
      c.save(); c.translate(x, y - bob); c.scale(sc, sc); c.fillStyle = col;
      c.beginPath(); c.arc(0, -150, 26, 0, TAU); c.fill();
      c.beginPath(); c.roundRect(-34, -122, 68, 120, 22); c.fill();
      const sw = Math.sin(t * 4 + i) * 12;
      c.fillRect(-26 + sw * 0.3, -10, 20, 90); c.fillRect(6 - sw * 0.3, -10, 20, 90);
      if (i % 3 === 0) { c.fillRect(30, -60, 40, 50); } // suitcase / bag
      c.restore();
    }
  }
  function nightSky(c, t, y1, top = '#0b1030', mid = '#2a1f5c', bot = '#d0705a') {
    c.fillStyle = lg(c, 0, 0, 0, y1, [[0, top], [0.65, mid], [1, bot]]); c.fillRect(0, 0, W, y1);
    const r = rng(9);
    for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * y1 * 0.7, tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + r() * 2) + i)); c.fillStyle = `rgba(255,255,240,${0.25 + 0.6 * tw * r()})`; c.fillRect(x, y, 2 + (i % 7 === 0 ? 2 : 0), 2 + (i % 7 === 0 ? 2 : 0)); }
  }
  function moon(c, x, y, r) {
    glow(c, x, y, r * 4, '255,240,200', 0.25);
    c.fillStyle = '#fff6dc'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(200,190,160,0.5)'; for (const [dx, dy, rr] of [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.12], [-0.05, 0.35, 0.1]]) { c.beginPath(); c.arc(x + dx * r, y + dy * r, rr * r, 0, TAU); c.fill(); }
  }
  function ocean(c, t, y0, y1, mx) {
    c.fillStyle = lg(c, 0, y0, 0, y1, [[0, '#1b2b5a'], [1, '#0a1230']]); c.fillRect(0, y0, W, y1 - y0);
    for (let i = 0; i < 26; i++) {
      const yy = y0 + 6 + i * (y1 - y0) / 26, w = 30 + i * 9, x = mx + Math.sin(t * 1.5 + i * 1.7) * (10 + i * 2);
      c.fillStyle = `rgba(255,240,200,${0.55 - i * 0.018})`; c.fillRect(x - w / 2, yy, w, 3);
      c.fillStyle = 'rgba(160,190,255,0.08)'; c.fillRect(((i * 211 + t * 20) % W), yy, 60, 2);
    }
  }
  function shell(c, x, y, s, col) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = col; c.beginPath(); c.moveTo(0, 40);
    for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI; c.lineTo(Math.cos(a) * 70, Math.sin(a) * 70 - 10 + (i % 2) * 8); }
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(60,40,10,0.55)'; c.lineWidth = 4;
    for (let i = 1; i < 12; i++) { const a = Math.PI + (i / 12) * Math.PI; c.beginPath(); c.moveTo(0, 36); c.lineTo(Math.cos(a) * 64, Math.sin(a) * 64 - 8); c.stroke(); }
    c.fillRect(-18, 34, 36, 16);
    c.restore();
  }

  // ---------- 1. hotel lobby ----------
  function lobby(c, t, o = {}) {
    const vx = 540, vy = 760;
    // ceiling
    c.fillStyle = lg(c, 0, 0, 0, 300, [[0, '#1a0f0a'], [1, '#3a2418']]); c.fillRect(0, 0, W, 300);
    c.strokeStyle = 'rgba(227,180,72,0.35)'; c.lineWidth = 3;
    for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(vx + i * 180, 0); c.lineTo(vx + i * 40, 300); c.stroke(); }
    for (let k = 0; k < 4; k++) { const y = 40 + k * 70, sp = 1 - k * 0.18; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let i = -5; i <= 5; i++) glow(c, vx + i * 150 * sp, y + 20, 26, '255,220,150', 0.55); }
    // back wall
    c.fillStyle = lg(c, 0, 300, 0, 1120, [[0, '#6b4a33'], [1, '#3c271a']]); c.fillRect(0, 300, W, 820);
    // wood slats
    c.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = 0; x < W; x += 28) c.fillRect(x, 300, 10, 820);
    // arched windows with the night ocean
    for (const [cx, ww] of [[150, 220], [540, 300], [930, 220]]) {
      const top = 380, bot = 960;
      c.save();
      c.beginPath(); c.moveTo(cx - ww / 2, bot); c.lineTo(cx - ww / 2, top + ww / 2); c.arc(cx, top + ww / 2, ww / 2, Math.PI, 0); c.lineTo(cx + ww / 2, bot); c.closePath(); c.clip();
      nightSky(c, t, 760, '#0c1236', '#33276a', '#a8586a');
      moon(c, cx + ww * 0.2, 520, 28);
      ocean(c, t, 760, bot, cx);
      palm(c, cx - ww * 0.35, bot + 40, 0.75, t, cx, '#08121a');
      c.restore();
      c.strokeStyle = '#d9b25a'; c.lineWidth = 14;
      c.beginPath(); c.moveTo(cx - ww / 2, bot); c.lineTo(cx - ww / 2, top + ww / 2); c.arc(cx, top + ww / 2, ww / 2, Math.PI, 0); c.lineTo(cx + ww / 2, bot); c.stroke();
      c.lineWidth = 6; c.beginPath(); c.moveTo(cx, top); c.lineTo(cx, bot); c.moveTo(cx - ww / 2, 720); c.lineTo(cx + ww / 2, 720); c.stroke();
    }
    // brass sign with the shell
    if (o.sign !== false) {
      glow(c, 540, 335, 260, '255,200,120', 0.35);
      shell(c, 330, 342, 0.42, '#e8c46a');
      c.save(); c.font = '900 64px Montserrat, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = lg(c, 0, 305, 0, 370, [[0, '#fff1c4'], [1, '#c99a3a']]); c.shadowColor = 'rgba(255,200,120,0.8)'; c.shadowBlur = 24;
      c.fillText(o.name || 'GRAND HOTEL', 580, 340); c.restore();
    }
    // chandelier
    const cy = 120;
    c.strokeStyle = '#b8862c'; c.lineWidth = 4; c.beginPath(); c.moveTo(540, 0); c.lineTo(540, cy); c.stroke();
    c.beginPath(); c.ellipse(540, cy, 170, 26, 0, 0, TAU); c.lineWidth = 8; c.stroke();
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU, x = 540 + Math.cos(a) * 160, y = cy + Math.sin(a) * 22, L = 60 + (i % 3) * 30;
      c.strokeStyle = 'rgba(230,245,255,0.75)'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + L); c.stroke();
      const sp = Math.max(0, Math.sin(t * 3 + i * 2.1)); if (sp > 0.85) glow(c, x, y + L, 22, '255,255,255', (sp - 0.85) * 6);
    }
    glow(c, 540, cy + 60, 240, '255,225,170', 0.35);
    // reception desk
    const dy = 980;
    c.fillStyle = lg(c, 0, dy, 0, dy + 200, [[0, '#efe8dc'], [1, '#b9ae9e']]); c.fillRect(200, dy, 680, 200);
    c.strokeStyle = 'rgba(120,110,100,0.45)'; c.lineWidth = 3;
    const r = rng(5); for (let i = 0; i < 12; i++) { c.beginPath(); let x = 200 + r() * 680, y = dy; c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 80; y += 40; c.lineTo(x, y); } c.stroke(); }
    c.fillStyle = '#c99a3a'; c.fillRect(186, dy - 18, 708, 22);
    glow(c, 300, dy - 60, 70, '255,210,140', 0.6);
    c.fillStyle = '#e3b448'; c.beginPath(); c.moveTo(280, dy - 18); c.lineTo(320, dy - 18); c.lineTo(310, dy - 70); c.lineTo(290, dy - 70); c.fill(); c.beginPath(); c.moveTo(262, dy - 70); c.lineTo(338, dy - 70); c.lineTo(320, dy - 110); c.lineTo(280, dy - 110); c.fillStyle = '#f6e3b0'; c.fill();
    c.fillStyle = '#c9ccd0'; c.beginPath(); c.arc(760, dy - 24, 18, Math.PI, 0); c.fill(); c.fillRect(740, dy - 24, 40, 6);
    // guests crossing behind the desk
    c.save(); c.beginPath(); c.rect(0, 700, W, dy - 700); c.clip(); peopleWalking(c, t, dy, 0.9, 5, 'rgba(25,15,10,0.55)'); c.restore();
    // marble floor in perspective
    c.fillStyle = lg(c, 0, 1120, 0, H, [[0, '#d9cbb4'], [1, '#7c6a55']]); c.fillRect(0, 1120, W, H - 1120);
    c.save(); c.beginPath(); c.rect(0, 1120, W, H - 1120); c.clip();
    for (let i = 0; i < 14; i++) { const y0 = 1120 + Math.pow(i / 14, 1.8) * 800, y1 = 1120 + Math.pow((i + 1) / 14, 1.8) * 800; for (let j = -12; j <= 12; j++) { if ((i + j) % 2) continue; const xa0 = vx + (j - 0.5) * (40 + i * 30), xa1 = vx + (j + 0.5) * (40 + i * 30), xb0 = vx + (j - 0.5) * (40 + (i + 1) * 30), xb1 = vx + (j + 0.5) * (40 + (i + 1) * 30); c.fillStyle = 'rgba(40,25,15,0.28)'; c.beginPath(); c.moveTo(xa0, y0); c.lineTo(xa1, y0); c.lineTo(xb1, y1); c.lineTo(xb0, y1); c.closePath(); c.fill(); } }
    // reflections of the lights
    for (const x of [150, 540, 930]) { c.fillStyle = lg(c, 0, 1120, 0, 1700, [[0, 'rgba(255,230,180,0.35)'], [1, 'rgba(255,230,180,0)']]); c.fillRect(x - 40, 1120, 80, 580); }
    c.restore();
    // rug
    c.fillStyle = 'rgba(120,20,30,0.55)'; c.beginPath(); c.moveTo(380, 1180); c.lineTo(700, 1180); c.lineTo(900, 1920); c.lineTo(180, 1920); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(227,180,72,0.6)'; c.lineWidth = 6; c.stroke();
    // foreground plants
    if (o.plants !== false) { plant(c, 10, 1420, 0.62, t, 1); plant(c, 1070, 1440, 0.66, t, 4); }
    // warm haze
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 540, 700, 700, '255,180,110', 0.12); c.restore();
  }

  // ---------- 2. pool deck at night ----------
  function pool(c, t, o = {}) {
    nightSky(c, t, 900, '#090d2a', '#2c2463', '#c76a5e');
    moon(c, 820, 260, 54);
    // hotel tower on the left
    c.fillStyle = '#141a33'; c.fillRect(-20, 300, 380, 700); c.fillStyle = '#10152b'; c.fillRect(330, 420, 120, 580);
    const r = rng(12);
    for (let row = 0; row < 16; row++) for (let col = 0; col < 7; col++) { const on = r() > 0.45; c.fillStyle = on ? `rgba(255,${200 + Math.floor(r() * 40)},120,${0.6 + 0.3 * Math.sin(t * 0.5 + row + col)})` : 'rgba(40,50,80,0.8)'; c.fillRect(20 + col * 46, 330 + row * 40, 26, 22); }
    c.save(); c.font = '900 40px Montserrat, sans-serif'; c.fillStyle = '#ffd98a'; c.shadowColor = '#ffb347'; c.shadowBlur = 20; c.textAlign = 'center'; c.fillText(o.name || 'HOTEL', 170, 290); c.restore();
    ocean(c, t, 900, 1080, 820);
    // string lights
    for (const [y0, sag] of [[160, 90], [240, 70]]) {
      c.strokeStyle = 'rgba(30,30,30,0.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, y0); c.quadraticCurveTo(540, y0 + sag * 2, W, y0); c.stroke();
      for (let i = 0; i <= 16; i++) { const u = i / 16, x = u * W, y = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * (y0 + sag * 2) + u * u * y0 + 10; const on = 0.6 + 0.4 * Math.sin(t * 2 + i); glow(c, x, y, 26, '255,210,120', 0.6 * on); c.fillStyle = '#fff2c4'; c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill(); }
    }
    palm(c, 960, 1120, 1.2, t, 3, '#071014'); palm(c, 120, 1150, 1.0, t, 7, '#071014');
    // deck
    c.fillStyle = lg(c, 0, 1080, 0, H, [[0, '#4a3a2c'], [1, '#22180f']]); c.fillRect(0, 1080, W, H - 1080);
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 3; for (let y = 1100; y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    // pool glow on everything
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 540, 1250, 600, '60,200,255', 0.18); c.restore();
  }

  // ---------- 3. podcast / TV studio ----------
  function studio(c, t, o = {}) {
    const acc = o.accent || '255,77,109', acc2 = o.accent2 || '80,160,255';
    c.fillStyle = lg(c, 0, 0, 0, 1200, [[0, '#121216'], [1, '#1e1e26']]); c.fillRect(0, 0, W, 1200);
    // acoustic foam wedges
    for (let y = 0; y < 1150; y += 70) for (let x = (y / 70) % 2 ? 35 : 0; x < W; x += 70) { c.fillStyle = lg(c, x, y, x + 60, y + 60, [[0, '#2a2a33'], [1, '#141419']]); c.beginPath(); c.moveTo(x, y + 30); c.lineTo(x + 30, y); c.lineTo(x + 60, y + 30); c.lineTo(x + 30, y + 60); c.closePath(); c.fill(); }
    // LED bars
    for (const x of [90, 990]) { glow(c, x, 600, 220, acc, 0.35); c.fillStyle = `rgba(${acc},1)`; c.fillRect(x - 8, 180, 16, 840); }
    for (const x of [300, 780]) { glow(c, x, 600, 160, acc2, 0.18); c.fillStyle = `rgba(${acc2},0.9)`; c.fillRect(x - 5, 240, 10, 700); }
    // big screen with the brand
    c.fillStyle = '#05070a'; c.fillRect(330, 360, 420, 250); c.fillStyle = lg(c, 340, 370, 740, 600, [[0, `rgba(${acc},0.5)`], [1, `rgba(${acc2},0.4)`]]); c.fillRect(340, 370, 400, 230);
    if (o.brand) { c.save(); c.font = '900 52px Montserrat, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.shadowColor = `rgba(${acc},1)`; c.shadowBlur = 30; c.fillText(o.brand, 540, 485 + Math.sin(t * 2) * 3); c.restore(); }
    // shelves with plants and plaques
    for (const [x, y] of [[110, 760], [770, 760]]) {
      c.fillStyle = '#3a2a1e'; c.fillRect(x, y, 200, 14); c.fillRect(x, y + 150, 200, 14);
      c.fillStyle = '#d9b25a'; c.fillRect(x + 20, y - 70, 50, 70); c.fillStyle = '#1d4a2c'; c.beginPath(); c.arc(x + 140, y - 40, 40, 0, TAU); c.fill(); c.fillStyle = '#6b4a33'; c.fillRect(x + 120, y - 20, 40, 20);
      c.fillStyle = '#c9ccd0'; c.fillRect(x + 30, y + 80, 140, 70); c.fillStyle = '#e2312b'; c.beginPath(); c.moveTo(x + 85, y + 98); c.lineTo(x + 85, y + 132); c.lineTo(x + 115, y + 115); c.fill();
    }
    // ring light
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 14; c.beginPath(); c.arc(960, 330, 80, 0, TAU); c.stroke(); glow(c, 960, 330, 170, '255,255,255', 0.2);
    c.fillStyle = '#222'; c.fillRect(955, 410, 10, 600);
    // floor and desk
    c.fillStyle = lg(c, 0, 1150, 0, H, [[0, '#1c1c22'], [1, '#0a0a0d']]); c.fillRect(0, 1150, W, H - 1150);
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 540, 1300, 500, acc, 0.12); c.restore();
    // cameras in the foreground corners
    for (const [x, sgn] of [[60, 1], [1020, -1]]) { c.save(); c.translate(x, 1500); c.scale(sgn, 1); c.fillStyle = '#0b0b0e'; c.fillRect(-60, -120, 180, 110); c.beginPath(); c.arc(140, -65, 46, 0, TAU); c.fill(); c.fillStyle = 'rgba(80,120,200,0.5)'; c.beginPath(); c.arc(140, -65, 26, 0, TAU); c.fill(); c.fillStyle = '#e2312b'; c.beginPath(); c.arc(-30, -100, 8 * (0.6 + 0.4 * Math.sin(t * 4)), 0, TAU); c.fill(); c.fillStyle = '#0b0b0e'; c.fillRect(0, -10, 14, 400); c.restore(); }
  }

  // ---------- 4. night street ----------
  function street(c, t, o = {}) {
    nightSky(c, t, 700, '#070a1c', '#1b1840', '#5a2f5c');
    const r = rng(21);
    // buildings
    let x = -40;
    while (x < W) {
      const bw = 140 + r() * 140, bh = 420 + r() * 380, base = 1100;
      c.fillStyle = `rgb(${18 + r() * 14},${18 + r() * 12},${34 + r() * 20})`; c.fillRect(x, base - bh, bw, bh);
      for (let yy = base - bh + 30; yy < base - 60; yy += 50) for (let xx = x + 18; xx < x + bw - 30; xx += 38) { const on = r() > 0.5; c.fillStyle = on ? `rgba(255,${190 + r() * 50},110,${0.5 + 0.4 * Math.sin(t * 0.4 + xx + yy)})` : 'rgba(30,35,60,0.9)'; c.fillRect(xx, yy, 20, 28); }
      x += bw + 6;
    }
    // neon signs
    const neon = (s, nx, ny, col, px = 52) => { const on = Math.sin(t * 7 + nx) > -0.9 ? 1 : 0.2; c.save(); c.font = `900 ${px}px Montserrat, sans-serif`; c.textAlign = 'center'; c.shadowColor = col; c.shadowBlur = 30 * on; c.fillStyle = on > 0.5 ? '#fff' : '#666'; c.fillText(s, nx, ny); c.restore(); };
    neon(o.neon1 || 'BAR', 200, 700, '#ff3ea5'); neon(o.neon2 || 'DISCOS', 820, 640, '#3ec8ff', 46);
    // street lamps
    for (const lx of [160, 920]) { c.fillStyle = '#1a1a1f'; c.fillRect(lx - 6, 760, 12, 420); c.fillRect(lx - 6, 760, 70 * (lx < 540 ? 1 : -1), 10); glow(c, lx + 60 * (lx < 540 ? 1 : -1), 780, 200, '255,200,120', 0.45); c.fillStyle = lg(c, 0, 780, 0, 1500, [[0, 'rgba(255,200,120,0.25)'], [1, 'rgba(255,200,120,0)']]); c.beginPath(); c.moveTo(lx + 40 * (lx < 540 ? 1 : -1), 780); c.lineTo(lx + 80 * (lx < 540 ? 1 : -1), 780); c.lineTo(lx + 260 * (lx < 540 ? 1 : -1), 1500); c.lineTo(lx - 140 * (lx < 540 ? 1 : -1), 1500); c.fill(); }
    // sidewalk and wet asphalt
    c.fillStyle = '#2a2a30'; c.fillRect(0, 1100, W, 50); c.fillStyle = '#3a3a42'; c.fillRect(0, 1100, W, 10);
    c.fillStyle = lg(c, 0, 1150, 0, H, [[0, '#14141a'], [1, '#07070a']]); c.fillRect(0, 1150, W, H - 1150);
    for (let i = 0; i < 40; i++) { const rx = r() * W, ry = 1170 + r() * 700; c.fillStyle = ['rgba(255,62,165,0.18)', 'rgba(62,200,255,0.18)', 'rgba(255,200,120,0.2)'][i % 3]; c.fillRect(rx, ry, 4 + r() * 10, 30 + r() * 90); }
    c.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 6; i++) c.fillRect(500, 1220 + i * 120, 80 - i * 4, 50);
  }

  // ---------- 5. bedroom at night (phone glow) ----------
  function bedroom(c, t) {
    c.fillStyle = lg(c, 0, 0, 0, H, [[0, '#141a2e'], [1, '#090b14']]); c.fillRect(0, 0, W, H);
    // window with the city
    c.save(); c.beginPath(); c.rect(620, 240, 380, 520); c.clip();
    nightSky(c, t, 760, '#0b1030', '#2a1f5c', '#6a3a6a');
    const r = rng(33); for (let i = 0; i < 9; i++) { const bx = 620 + i * 46, bh = 140 + r() * 220; c.fillStyle = '#0e1226'; c.fillRect(bx, 760 - bh, 42, bh); for (let y = 760 - bh + 14; y < 750; y += 26) if (r() > 0.4) { c.fillStyle = 'rgba(255,210,120,0.7)'; c.fillRect(bx + 8, y, 10, 12); } }
    c.restore();
    c.strokeStyle = '#2c3350'; c.lineWidth = 18; c.strokeRect(620, 240, 380, 520); c.lineWidth = 8; c.beginPath(); c.moveTo(810, 240); c.lineTo(810, 760); c.stroke();
    c.fillStyle = 'rgba(80,90,140,0.25)'; c.fillRect(600, 220, 60, 600); c.fillRect(960, 220, 60, 600);
    // posters and a lamp
    c.fillStyle = '#2a2140'; c.fillRect(90, 300, 220, 300); c.fillStyle = '#e2312b'; c.beginPath(); c.arc(200, 420, 70, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(200, 420, 20, 0, TAU); c.fill();
    c.fillStyle = '#3a2f22'; c.fillRect(380, 900, 18, 200); glow(c, 389, 880, 180, '255,190,110', 0.35); c.fillStyle = '#f6d9a0'; c.beginPath(); c.moveTo(340, 900); c.lineTo(440, 900); c.lineTo(420, 840); c.lineTo(360, 840); c.fill();
    // bed
    c.fillStyle = lg(c, 0, 1150, 0, H, [[0, '#3b4a7a'], [1, '#1a2240']]); c.beginPath(); c.roundRect(-40, 1150, W + 80, 900, 60); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 10; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(0, 1220 + i * 90); c.quadraticCurveTo(540, 1180 + i * 90 + Math.sin(i) * 40, W, 1230 + i * 90); c.stroke(); }
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 540, 820, 520, '120,170,255', 0.22); c.restore();
  }

  // ---------- 6. classroom ----------
  function classroom(c, t) {
    c.fillStyle = lg(c, 0, 0, 0, 1150, [[0, '#3f5a52'], [1, '#2c423c']]); c.fillRect(0, 0, W, 1150);
    c.fillStyle = '#5c4a38'; c.fillRect(0, 1060, W, 90);
    // windows with daylight
    for (const x of [20, 900]) { c.fillStyle = lg(c, 0, 120, 0, 700, [[0, '#9fd6f2'], [1, '#e7f3f6']]); c.fillRect(x, 120, 160, 560); c.strokeStyle = '#e8e2d4'; c.lineWidth = 12; c.strokeRect(x, 120, 160, 560); c.beginPath(); c.moveTo(x + 80, 120); c.lineTo(x + 80, 680); c.moveTo(x, 400); c.lineTo(x + 160, 400); c.stroke(); glow(c, x + 80, 400, 320, '255,250,220', 0.18); }
    // clock with moving hands
    c.fillStyle = '#f4efe6'; c.beginPath(); c.arc(540, 150, 58, 0, TAU); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 8; c.stroke();
    c.lineWidth = 6; c.beginPath(); c.moveTo(540, 150); c.lineTo(540 + Math.cos(t * 0.5 - 1.5) * 30, 150 + Math.sin(t * 0.5 - 1.5) * 30); c.stroke();
    c.lineWidth = 3; c.strokeStyle = '#e2312b'; c.beginPath(); c.moveTo(540, 150); c.lineTo(540 + Math.cos(t * 6) * 46, 150 + Math.sin(t * 6) * 46); c.stroke();
    // alphabet strip and posters
    c.fillStyle = '#f3efe6'; c.fillRect(200, 820, 680, 70); c.save(); c.font = '900 40px Montserrat, sans-serif'; c.fillStyle = '#2f58c7'; c.textBaseline = 'middle'; c.fillText('+  −  ×  ÷  =  π  √', 230, 857); c.restore();
    c.fillStyle = 'rgba(255,210,63,0.9)'; c.fillRect(220, 920, 160, 110); c.fillStyle = 'rgba(226,49,43,0.9)'; c.fillRect(700, 920, 160, 110);
    // desks in the foreground
    c.fillStyle = lg(c, 0, 1150, 0, H, [[0, '#7c5a3a'], [1, '#3e2a18']]); c.fillRect(0, 1150, W, H - 1150);
    for (const [x, y, s] of [[160, 1560, 1.1], [920, 1560, 1.1]]) { c.fillStyle = '#c9a06a'; c.fillRect(x - 160 * s, y, 320 * s, 40 * s); c.fillStyle = '#4a4f55'; c.fillRect(x - 140 * s, y + 40 * s, 14, 300); c.fillRect(x + 126 * s, y + 40 * s, 14, 300); }
  }

  // ---------- 7. crossroads ----------
  function crossroads(c, t) {
    nightSky(c, t, 900, '#141a44', '#5a3a7a', '#f08a5a');
    // sun glow at horizon and far hills
    glow(c, 540, 900, 500, '255,170,90', 0.45);
    c.fillStyle = '#2a2050'; c.beginPath(); c.moveTo(0, 900); for (let x = 0; x <= W; x += 60) c.lineTo(x, 860 - Math.sin(x * 0.01) * 40 - Math.sin(x * 0.03) * 15); c.lineTo(W, 900); c.fill();
    // ground and the road splitting in two
    c.fillStyle = lg(c, 0, 900, 0, H, [[0, '#2a3a2a'], [1, '#121a12']]); c.fillRect(0, 900, W, H - 900);
    c.fillStyle = '#26262c';
    c.beginPath(); c.moveTo(500, 900); c.lineTo(580, 900); c.lineTo(820, H); c.lineTo(260, H); c.fill();
    c.beginPath(); c.moveTo(540, 1150); c.lineTo(-100, 980); c.lineTo(-100, 1080); c.lineTo(540, 1300); c.fill();
    c.beginPath(); c.moveTo(540, 1150); c.lineTo(1180, 980); c.lineTo(1180, 1080); c.lineTo(540, 1300); c.fill();
    c.fillStyle = '#ffd23f'; for (let i = 0; i < 8; i++) { const u = i / 8, y = 920 + Math.pow(u, 1.5) * 1000; c.fillRect(538 - u * 6, y, 4 + u * 12, 20 + u * 60); }
    palm(c, 80, 1000, 0.8, t, 2, '#0a0e1c'); palm(c, 1000, 1000, 0.9, t, 5, '#0a0e1c');
  }


  // ---------- 8. barbershop ----------
  function barbershop(c, t, o = {}) {
    c.fillStyle = lg(c, 0, 0, 0, 1150, [[0, '#2b3a3a'], [1, '#1c2626']]); c.fillRect(0, 0, W, 1150);
    // subway tiles
    c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 3;
    for (let y = 700; y < 1150; y += 34) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let x = (y / 34) % 2 ? 0 : 35; x < W; x += 70) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 34); c.stroke(); } }
    // neon sign
    const on = Math.sin(t * 9) > -0.95 ? 1 : 0.3;
    c.save(); c.font = '900 70px Montserrat, sans-serif'; c.textAlign = 'center'; c.shadowColor = '#3ec8ff'; c.shadowBlur = 40 * on; c.fillStyle = on > 0.5 ? '#e8fbff' : '#557'; c.fillText(o.name || 'BARBER SHOP', 540, 150); c.restore();
    c.strokeStyle = `rgba(255,62,165,${0.9 * on})`; c.lineWidth = 6; c.strokeRect(250, 85, 580, 95);
    // three mirrors with reflections and lamp strips
    for (const mx of [190, 540, 890]) {
      c.fillStyle = '#d9b25a'; c.beginPath(); c.roundRect(mx - 140, 230, 280, 420, 140); c.fill();
      c.fillStyle = lg(c, mx - 130, 240, mx + 130, 640, [[0, '#9fc3c8'], [1, '#4e6e74']]); c.beginPath(); c.roundRect(mx - 128, 242, 256, 396, 128); c.fill();
      c.save(); c.beginPath(); c.roundRect(mx - 128, 242, 256, 396, 128); c.clip();
      const sx = mx - 200 + ((t * 120 + mx) % 520); c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.moveTo(sx, 240); c.lineTo(sx + 40, 240); c.lineTo(sx - 60, 640); c.lineTo(sx - 100, 640); c.fill();
      c.fillStyle = 'rgba(20,30,30,0.35)'; c.beginPath(); c.arc(mx, 520, 70, 0, TAU); c.fill(); c.fillRect(mx - 110, 580, 220, 80);
      c.restore();
      for (let i = 0; i < 6; i++) glow(c, mx - 150, 270 + i * 70, 22, '255,240,200', 0.7);
    }
    // counter with products
    c.fillStyle = lg(c, 0, 690, 0, 760, [[0, '#f2efe8'], [1, '#b9b3a8']]); c.fillRect(30, 690, 1020, 26);
    const r = rng(41);
    for (let i = 0; i < 22; i++) { const bx = 50 + i * 46, bh = 40 + r() * 50; c.fillStyle = ['#2f58c7', '#e2312b', '#2fbf71', '#e3b448', '#f3efe6'][i % 5]; c.beginPath(); c.roundRect(bx, 690 - bh, 26, bh, 6); c.fill(); c.fillStyle = '#222'; c.fillRect(bx + 8, 690 - bh - 10, 10, 10); }
    // barber poles (spinning stripes)
    for (const px of [40, 1040]) {
      c.fillStyle = '#c9ccd0'; c.beginPath(); c.roundRect(px - 34, 260, 68, 30, 12); c.fill(); c.beginPath(); c.roundRect(px - 34, 640, 68, 30, 12); c.fill();
      c.save(); c.beginPath(); c.roundRect(px - 24, 290, 48, 350, 20); c.clip(); c.fillStyle = '#f4f1ea'; c.fillRect(px - 30, 290, 60, 350);
      for (let i = -6; i < 12; i++) { const yy = 290 + ((i * 50 + t * 80) % 450) - 50; c.fillStyle = i % 2 ? '#d63a35' : '#2f58c7'; c.beginPath(); c.moveTo(px - 30, yy); c.lineTo(px + 30, yy - 36); c.lineTo(px + 30, yy - 18); c.lineTo(px - 30, yy + 18); c.fill(); }
      c.restore();
    }
    // checker floor
    c.fillStyle = '#e8e2d4'; c.fillRect(0, 1150, W, H - 1150);
    c.save(); c.beginPath(); c.rect(0, 1150, W, H - 1150); c.clip();
    for (let i = 0; i < 12; i++) { const y0 = 1150 + Math.pow(i / 12, 1.7) * 780, y1 = 1150 + Math.pow((i + 1) / 12, 1.7) * 780; for (let j = -10; j <= 10; j++) { if ((i + j) % 2) continue; const w0 = 50 + i * 26, w1 = 50 + (i + 1) * 26; c.fillStyle = '#1e1e22'; c.beginPath(); c.moveTo(540 + (j - 0.5) * w0, y0); c.lineTo(540 + (j + 0.5) * w0, y0); c.lineTo(540 + (j + 0.5) * w1, y1); c.lineTo(540 + (j - 0.5) * w1, y1); c.fill(); } }
    c.restore();
    // hair clippings drifting
    for (let i = 0; i < 12; i++) { const hx = (i * 97 + t * 15) % W, hy = 900 + ((t * 30 + i * 61) % 260); c.strokeStyle = 'rgba(30,20,15,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + 8, hy + 4); c.stroke(); }
  }

  // ---------- 9. courtroom ----------
  function court(c, t) {
    c.fillStyle = lg(c, 0, 0, 0, 1150, [[0, '#5a3a22'], [1, '#3a2414']]); c.fillRect(0, 0, W, 1150);
    for (let x = 0; x < W; x += 120) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x, 0, 8, 1150); c.strokeStyle = 'rgba(255,200,140,0.12)'; c.lineWidth = 3; c.strokeRect(x + 20, 180, 80, 260); c.strokeRect(x + 20, 480, 80, 260); }
    // tall windows with blinds and light beams
    for (const wx of [40, 900]) {
      c.fillStyle = '#cfe3ee'; c.fillRect(wx, 120, 140, 520);
      c.fillStyle = 'rgba(80,60,40,0.55)'; for (let y = 125; y < 640; y += 22) c.fillRect(wx, y, 140, 10);
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = lg(c, wx, 200, wx + (wx < 540 ? 500 : -500), 1300, [[0, 'rgba(255,240,200,0.22)'], [1, 'rgba(255,240,200,0)']]);
      c.beginPath(); c.moveTo(wx, 140); c.lineTo(wx + 140, 140); c.lineTo(wx + 140 + (wx < 540 ? 420 : -420), 1300); c.lineTo(wx + (wx < 540 ? 420 : -420), 1300); c.fill(); c.restore();
    }
    // seal and flags
    c.fillStyle = '#e3b448'; c.beginPath(); c.arc(540, 250, 110, 0, TAU); c.fill(); c.fillStyle = '#7a4a26'; c.beginPath(); c.arc(540, 250, 90, 0, TAU); c.fill();
    c.save(); c.font = '110px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#e3b448'; c.fillText('⚖', 540, 258); c.restore();
    const flag = (fx, pr) => { c.fillStyle = '#c9ccd0'; c.fillRect(fx, 160, 8, 600); const wv = (u) => Math.sin(t * 2 + u * 4) * 8 * u; c.save(); c.translate(fx + 8, 180);
      const n = pr ? 5 : 13, sh = 140 / n;
      for (let i = 0; i < n; i++) { c.fillStyle = i % 2 ? '#f4f4f4' : (pr ? '#d42b2b' : '#b22234'); c.beginPath(); c.moveTo(0, i * sh); for (let u = 0; u <= 1; u += 0.1) c.lineTo(u * 210, i * sh + wv(u)); for (let u = 1; u >= 0; u -= 0.1) c.lineTo(u * 210, i * sh + sh + wv(u)); c.fill(); }
      if (pr) { c.fillStyle = '#2f6fd6'; c.beginPath(); c.moveTo(0, 0); c.lineTo(110, 70 + wv(0.5)); c.lineTo(0, 140); c.fill(); c.fillStyle = '#fff'; c.font = '40px serif'; c.fillText('★', 22, 84); }
      else { c.fillStyle = '#3c3b6e'; c.fillRect(0, 0, 90, sh * 7); c.fillStyle = '#fff'; for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 6; xx++) { c.beginPath(); c.arc(8 + xx * 15, 8 + yy * 14, 2.5, 0, TAU); c.fill(); } }
      c.restore(); };
    flag(250, true); flag(810, false);
    // bench
    c.fillStyle = lg(c, 0, 640, 0, 1000, [[0, '#8a5a32'], [1, '#4a2c16']]); c.fillRect(130, 660, 820, 340);
    c.fillStyle = '#a8703c'; c.fillRect(110, 640, 860, 30);
    for (let i = 0; i < 6; i++) { c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 4; c.strokeRect(160 + i * 130, 700, 110, 260); }
    // ceiling fans
    for (const fx of [300, 780]) { c.fillStyle = '#2a1a0e'; c.fillRect(fx - 3, 0, 6, 70); c.save(); c.translate(fx, 75); c.scale(1, 0.25); c.rotate(t * 6); c.fillStyle = 'rgba(40,25,12,0.9)'; for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.fillRect(0, -14, 120, 28); } c.restore(); }
    // gallery benches
    c.fillStyle = lg(c, 0, 1150, 0, H, [[0, '#6b4424'], [1, '#2a180a']]); c.fillRect(0, 1150, W, H - 1150);
    for (let i = 0; i < 4; i++) { const y = 1300 + i * 170; c.fillStyle = '#4a2c16'; c.fillRect(-20, y, W + 40, 40); c.fillStyle = '#7a4a26'; c.fillRect(-20, y - 60, W + 40, 60); }
  }

  // ---------- 10. TV newsroom ----------
  function newsroom(c, t, o = {}) {
    c.fillStyle = lg(c, 0, 0, 0, 1200, [[0, '#0a1230'], [1, '#14204a']]); c.fillRect(0, 0, W, 1200);
    // curved video wall: night skyline
    c.save(); c.beginPath(); c.moveTo(40, 160); c.quadraticCurveTo(540, 120, 1040, 160); c.lineTo(1040, 820); c.quadraticCurveTo(540, 780, 40, 820); c.closePath(); c.clip();
    nightSky(c, t, 820, '#0b1a4a', '#1f4fa0', '#6a8ad0');
    const r = rng(77); let x = 40; while (x < 1040) { const bw = 50 + r() * 70, bh = 160 + r() * 330; c.fillStyle = '#0a1638'; c.fillRect(x, 820 - bh, bw, bh); for (let y = 820 - bh + 12; y < 810; y += 22) for (let xx = x + 8; xx < x + bw - 10; xx += 16) if (r() > 0.5) { c.fillStyle = `rgba(160,210,255,${0.5 + 0.3 * Math.sin(t + xx)})`; c.fillRect(xx, y, 8, 10); } x += bw + 4; }
    for (let i = 0; i < 6; i++) { c.strokeStyle = 'rgba(80,160,255,0.15)'; c.lineWidth = 2; c.beginPath(); c.moveTo(40, 160 + i * 110); c.lineTo(1040, 160 + i * 110); c.stroke(); }
    c.restore();
    c.strokeStyle = '#3a7bff'; c.lineWidth = 8; c.beginPath(); c.moveTo(40, 160); c.quadraticCurveTo(540, 120, 1040, 160); c.stroke();
    // logo panel
    c.fillStyle = '#d42b2b'; c.fillRect(380, 200, 320, 90); c.save(); c.font = '900 50px Montserrat, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(o.brand || 'NOTICIAS', 540, 263); c.restore();
    // ticker band
    c.fillStyle = '#d42b2b'; c.fillRect(0, 840, 240, 64); c.fillStyle = '#f3efe6'; c.fillRect(240, 840, W - 240, 64);
    c.save(); c.textAlign = 'left'; c.font = '900 26px Montserrat, sans-serif'; c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText('ÚLTIMA HORA', 12, 873); c.font = '900 34px Montserrat, sans-serif'; c.beginPath(); c.rect(240, 840, W - 240, 64); c.clip(); c.fillStyle = '#111';
    const tick = (o.ticker || 'FARÁNDULA PR • EN VIVO • LO ÚLTIMO •') + '   '; const tw = c.measureText(tick).width; const off = (t * 140) % tw; for (let k = -1; k < 4; k++) c.fillText(tick, 260 + k * tw - off, 873); c.restore();
    // desk
    c.fillStyle = lg(c, 0, 1150, 0, H, [[0, '#1a2440'], [1, '#05070f']]); c.fillRect(0, 1150, W, H - 1150);
    c.fillStyle = lg(c, 0, 1180, 0, 1400, [[0, '#2a3a6a'], [1, '#0e1530']]); c.beginPath(); c.moveTo(60, 1200); c.quadraticCurveTo(540, 1150, 1020, 1200); c.lineTo(1000, 1500); c.lineTo(80, 1500); c.fill();
    c.strokeStyle = '#3a7bff'; c.lineWidth = 6; c.beginPath(); c.moveTo(60, 1200); c.quadraticCurveTo(540, 1150, 1020, 1200); c.stroke();
    // studio lights at the top
    for (let i = 0; i < 5; i++) glow(c, 140 + i * 200, 40, 90, '200,220,255', 0.35 + 0.1 * Math.sin(t * 2 + i));
  }

  // ---------- 11. boxing arena ----------
  function arena(c, t, o = {}) {
    c.fillStyle = '#05060a'; c.fillRect(0, 0, W, H);
    // crowd rows with camera flashes
    const r = rng(55);
    for (let row = 0; row < 9; row++) {
      const y = 380 + row * 70, s = 0.5 + row * 0.07;
      for (let i = 0; i < 18; i++) {
        const x = (i + (row % 2) * 0.5) * 64, bob = Math.abs(Math.sin(t * (2 + r()) + i + row)) * 6;
        c.fillStyle = `rgba(${20 + row * 6},${18 + row * 5},${30 + row * 6},1)`; c.beginPath(); c.arc(x, y - bob, 18 * s * 1.6, 0, TAU); c.fill(); c.fillRect(x - 24 * s * 1.6, y - bob + 10, 48 * s * 1.6, 60);
        if (Math.sin(t * 13 + i * 7.1 + row * 3.3) > 0.985) glow(c, x, y - 20, 50, '255,255,255', 0.9);
      }
    }
    // moving spotlights
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) { const ax = 540 + Math.sin(t * 0.7 + k * 2) * 400; c.fillStyle = lg(c, 0, 0, 0, 1300, [[0, 'rgba(255,240,200,0.3)'], [1, 'rgba(255,240,200,0)']]); c.beginPath(); c.moveTo(200 + k * 340, 0); c.lineTo(260 + k * 340, 0); c.lineTo(ax + 180, 1300); c.lineTo(ax - 180, 1300); c.fill(); }
    c.restore();
    // jumbotron
    c.fillStyle = '#111'; c.fillRect(300, 60, 480, 240); c.fillStyle = lg(c, 310, 70, 770, 290, [[0, '#d42b2b'], [1, '#2f58c7']]); c.fillRect(310, 70, 460, 220);
    c.save(); c.font = '900 64px Montserrat, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(o.title || 'BOXEO', 540, 200 + Math.sin(t * 3) * 4); c.restore();
    // ring apron, ropes and posts
    c.fillStyle = lg(c, 0, 1150, 0, H, [[0, '#2a3a8a'], [1, '#0e1640']]); c.fillRect(0, 1150, W, H - 1150);
    for (let i = 0; i < 3; i++) { const y = 1000 + i * 80, sag = Math.sin(t * 2 + i) * 4; c.strokeStyle = ['#e2312b', '#f3efe6', '#2f58c7'][i]; c.lineWidth = 14; c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(540, y + 12 + sag, W, y); c.stroke(); }
    for (const px of [30, 1050]) { c.fillStyle = '#c9ccd0'; c.fillRect(px - 20, 940, 40, 420); c.fillStyle = '#e2312b'; c.fillRect(px - 26, 990, 52, 40); c.fillRect(px - 26, 1070, 52, 40); c.fillRect(px - 26, 1150, 52, 40); }
  }

  // ---------- 12. nightclub ----------
  function club(c, t, o = {}) {
    c.fillStyle = lg(c, 0, 0, 0, H, [[0, '#12051e'], [1, '#05020a']]); c.fillRect(0, 0, W, H);
    // lasers
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 8; k++) { const a = Math.sin(t * 1.3 + k) * 0.9 + (k - 4) * 0.12, col = ['255,40,180', '40,220,255', '120,255,80'][k % 3]; c.strokeStyle = `rgba(${col},0.55)`; c.lineWidth = 4; c.beginPath(); c.moveTo(540, 120); c.lineTo(540 + Math.sin(a) * 1600, 120 + Math.cos(a) * 1600); c.stroke(); }
    c.restore();
    // disco ball
    c.strokeStyle = '#444'; c.lineWidth = 3; c.beginPath(); c.moveTo(540, 0); c.lineTo(540, 60); c.stroke();
    c.save(); c.beginPath(); c.arc(540, 120, 62, 0, TAU); c.clip(); c.fillStyle = '#9aa3ad'; c.fillRect(470, 50, 140, 140);
    for (let y = 60; y < 190; y += 14) for (let x = 470; x < 620; x += 14) { const b = 0.5 + 0.5 * Math.sin(t * 6 + x * 0.3 + y * 0.2); c.fillStyle = `rgba(255,255,255,${0.25 + 0.6 * b})`; c.fillRect(x + 1, y + 1, 11, 11); }
    c.restore();
    for (let i = 0; i < 30; i++) { const a = i * 2.4 + t * 0.6, rr = 200 + (i * 53) % 700; const x = 540 + Math.cos(a) * rr, y = 400 + Math.sin(a) * rr * 0.5; glow(c, x, y, 14, '255,255,255', 0.6); }
    // DJ booth
    c.fillStyle = '#1a1a22'; c.fillRect(300, 700, 480, 160); c.fillStyle = lg(c, 300, 700, 780, 700, [[0, '#ff28b4'], [0.5, '#28dcff'], [1, '#78ff50']]); c.fillRect(300, 700, 480, 10);
    for (const dx of [400, 680]) { c.fillStyle = '#0a0a0e'; c.beginPath(); c.arc(dx, 690, 50, Math.PI, 0); c.fill(); }
    c.save(); c.font = '900 46px Montserrat, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.shadowColor = '#ff28b4'; c.shadowBlur = 30; c.fillText(o.name || 'CLUB', 540, 800); c.restore();
    // crowd with hands up
    for (let i = 0; i < 14; i++) { const x = i * 82 + 20, bob = Math.abs(Math.sin(t * 4 + i)) * 20, y = 1020 - bob; c.fillStyle = '#07030c'; c.beginPath(); c.arc(x, y, 34, 0, TAU); c.fill(); c.fillRect(x - 44, y + 26, 88, 200); if (i % 2) { c.save(); c.translate(x + 30, y + 20); c.rotate(-0.4 + Math.sin(t * 4 + i) * 0.2); c.fillRect(0, -110, 18, 110); c.restore(); } }
    // LED floor grid
    c.save(); c.beginPath(); c.rect(0, 1150, W, H - 1150); c.clip();
    for (let i = 0; i < 10; i++) for (let j = -8; j <= 8; j++) { const y0 = 1150 + Math.pow(i / 10, 1.6) * 780, y1 = 1150 + Math.pow((i + 1) / 10, 1.6) * 780, w0 = 70 + i * 34, w1 = 70 + (i + 1) * 34; const hue = (i * 40 + j * 25 + t * 120) % 360; c.fillStyle = `hsla(${hue},90%,55%,${0.25 + 0.25 * Math.sin(t * 5 + i + j)})`; c.beginPath(); c.moveTo(540 + (j - 0.5) * w0 + 3, y0 + 3); c.lineTo(540 + (j + 0.5) * w0 - 3, y0 + 3); c.lineTo(540 + (j + 0.5) * w1 - 3, y1 - 3); c.lineTo(540 + (j - 0.5) * w1 + 3, y1 - 3); c.fill(); }
    c.restore();
  }

  // ---------- 13. beach (day) ----------
  function beach(c, t) {
    c.fillStyle = lg(c, 0, 0, 0, 900, [[0, '#2f8fe0'], [1, '#a9e0ff']]); c.fillRect(0, 0, W, 900);
    glow(c, 860, 200, 260, '255,240,180', 0.5); c.fillStyle = '#fff5c4'; c.beginPath(); c.arc(860, 200, 80, 0, TAU); c.fill();
    for (let i = 0; i < 4; i++) { const cx = ((i * 330 + t * (12 + i * 4)) % (W + 400)) - 200, cy = 120 + i * 70; c.fillStyle = 'rgba(255,255,255,0.9)'; for (const [dx, dy, rr] of [[0, 0, 50], [50, 10, 40], [-50, 12, 38], [20, -24, 40]]) { c.beginPath(); c.arc(cx + dx, cy + dy, rr, 0, TAU); c.fill(); } }
    for (let i = 0; i < 3; i++) { const gx = (i * 300 + t * 60) % (W + 200) - 100, gy = 300 + i * 50 + Math.sin(t * 3 + i) * 10; c.strokeStyle = '#333'; c.lineWidth = 4; c.beginPath(); c.moveTo(gx - 20, gy); c.quadraticCurveTo(gx - 10, gy - 12 * Math.abs(Math.sin(t * 6 + i)), gx, gy); c.quadraticCurveTo(gx + 10, gy - 12 * Math.abs(Math.sin(t * 6 + i)), gx + 20, gy); c.stroke(); }
    c.fillStyle = lg(c, 0, 760, 0, 1060, [[0, '#1f7fbf'], [1, '#38c0d8']]); c.fillRect(0, 760, W, 300);
    for (let i = 0; i < 5; i++) { const y = 800 + i * 55; c.strokeStyle = `rgba(255,255,255,${0.35 + i * 0.1})`; c.lineWidth = 6; c.beginPath(); for (let x = 0; x <= W; x += 20) c.lineTo(x, y + Math.sin(x * 0.02 + t * 2 + i) * 8); c.stroke(); }
    c.fillStyle = lg(c, 0, 1040, 0, H, [[0, '#f4dca0'], [1, '#d9b06a']]); c.beginPath(); c.moveTo(0, 1060); for (let x = 0; x <= W; x += 30) c.lineTo(x, 1050 + Math.sin(x * 0.01 + t * 1.5) * 12); c.lineTo(W, H); c.lineTo(0, H); c.fill();
    palm(c, 120, 1160, 1.1, t, 2, '#2c5a2a'); 
    c.fillStyle = '#e2312b'; c.beginPath(); c.moveTo(780, 820); c.quadraticCurveTo(900, 720, 1020, 820); c.fill(); c.fillStyle = '#f3efe6'; c.beginPath(); c.moveTo(860, 760); c.quadraticCurveTo(900, 740, 940, 760); c.lineTo(900, 820); c.fill(); c.fillStyle = '#7a5a3a'; c.fillRect(896, 800, 8, 330);
  }

  // ---------- 14. police station ----------
  function police(c, t) {
    c.fillStyle = lg(c, 0, 0, 0, 1150, [[0, '#2c3e5a'], [1, '#1c2a40']]); c.fillRect(0, 0, W, 1150);
    // flickering fluorescent tubes
    for (let i = 0; i < 3; i++) { const on = (i === 1 && Math.sin(t * 17) > 0.7) ? 0.3 : 1; c.fillStyle = `rgba(230,245,255,${0.9 * on})`; c.fillRect(140 + i * 300, 40, 220, 16); glow(c, 250 + i * 300, 60, 200, '220,240,255', 0.25 * on); }
    // badge emblem
    c.save(); c.translate(540, 260); c.fillStyle = '#e3b448'; c.beginPath(); for (let k = 0; k < 14; k++) { const a = -Math.PI / 2 + k * Math.PI / 7, rr = k % 2 ? 90 : 120; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.fill();
    c.fillStyle = '#1d3f8f'; c.beginPath(); c.arc(0, 0, 70, 0, TAU); c.fill(); c.font = '900 30px Montserrat, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('POLICÍA', 0, 10); c.restore();
    // window with siren glow (red/blue alternating)
    const red = Math.sin(t * 8) > 0; c.fillStyle = '#0a1020'; c.fillRect(760, 420, 260, 300); c.fillStyle = 'rgba(80,90,120,0.6)'; for (let y = 425; y < 720; y += 20) c.fillRect(760, y, 260, 8);
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 890, 570, 360, red ? '255,40,40' : '40,90,255', 0.45); c.restore();
    // notice board
    c.fillStyle = '#9a7048'; c.fillRect(60, 420, 380, 300); const r = rng(8);
    for (let i = 0; i < 7; i++) { c.save(); c.translate(100 + (i % 4) * 85, 460 + Math.floor(i / 4) * 130); c.rotate((r() - 0.5) * 0.2); c.fillStyle = ['#f3efe6', '#ffe36b', '#f3efe6'][i % 3]; c.fillRect(0, 0, 70, 100); c.fillStyle = '#e2312b'; c.beginPath(); c.arc(35, 6, 6, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 4; k++) c.fillRect(8, 24 + k * 16, 54, 5); c.restore(); }
    // filing cabinets and desk
    for (const fx of [40, 900]) { c.fillStyle = '#6b7a8c'; c.fillRect(fx, 800, 140, 350); for (let k = 0; k < 4; k++) { c.strokeStyle = '#3e4a58'; c.lineWidth = 4; c.strokeRect(fx + 10, 810 + k * 85, 120, 75); c.fillStyle = '#c9ccd0'; c.fillRect(fx + 55, 840 + k * 85, 30, 8); } }
    c.fillStyle = lg(c, 0, 1150, 0, H, [[0, '#4a5262'], [1, '#1e232c']]); c.fillRect(0, 1150, W, H - 1150);
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; for (let y = 1170; y < H; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  }

  // ---------- 15. radio studio ----------
  function radio(c, t, o = {}) {
    studio(c, t, { accent: '255,60,60', accent2: '255,170,60' });
    // ON AIR sign
    const on = Math.sin(t * 2.5) > -0.6;
    c.fillStyle = '#1a0a0a'; c.fillRect(380, 90, 320, 120); c.save(); c.font = '900 64px Montserrat, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#ff2020'; c.shadowBlur = on ? 40 : 0; c.fillStyle = on ? '#ff3b3b' : '#4a1a1a'; c.fillText('ON AIR', 540, 152); c.restore();
    // window into the control room
    c.fillStyle = 'rgba(120,170,200,0.25)'; c.fillRect(320, 330, 440, 260); c.strokeStyle = '#333'; c.lineWidth = 12; c.strokeRect(320, 330, 440, 260);
    if (window.PR) PR.silhouette(c, 540, 560, 0.5, 'rgba(10,15,20,0.8)');
    // mixing console with moving faders and blinking leds
    c.fillStyle = lg(c, 0, 1180, 0, 1450, [[0, '#2a2a30'], [1, '#111114']]); c.beginPath(); c.moveTo(60, 1230); c.lineTo(1020, 1230); c.lineTo(1060, 1460); c.lineTo(20, 1460); c.fill();
    for (let i = 0; i < 16; i++) { const x = 110 + i * 56, v = 0.5 + 0.4 * Math.sin(t * (1.5 + i * 0.2) + i); c.fillStyle = '#0a0a0c'; c.fillRect(x, 1260, 10, 120); c.fillStyle = '#d9d9d9'; c.fillRect(x - 10, 1260 + (1 - v) * 100, 30, 16); for (let k = 0; k < 6; k++) { const lit = k / 6 < v; c.fillStyle = lit ? (k > 4 ? '#ff3b3b' : k > 3 ? '#ffd23f' : '#2fbf71') : '#222'; c.fillRect(x + 22, 1370 - k * 18, 10, 12); } }
  }

  const list = {
    lobby: 'hotel lobby (o.name on the brass sign): chandelier, arched sea windows, brass sign, marble desk and floor, plants, walking guests',
    pool: 'hotel pool deck at night: stars, moon, sea, lit tower, palms, string lights',
    studio: 'podcast / TV studio: foam, LED bars, brand screen (o.brand, o.accent), ring light, cameras',
    street: 'night street: buildings, neon signs (o.neon1/o.neon2), lamps, wet asphalt',
    bedroom: 'bedroom at night with city window and phone glow',
    classroom: 'classroom with ticking clock, windows, posters, desks (for explanations / math)',
    crossroads: 'road splitting in two at sunset (choices, decisions)',
    barbershop: 'barbershop: neon sign (o.name), mirrors, spinning barber poles, products, checker floor',
    court: 'courtroom: seal, PR and US flags waving, bench, blinds with light beams, ceiling fans, benches',
    newsroom: 'TV news set: skyline video wall, logo (o.brand), scrolling ticker (o.ticker), desk',
    arena: 'boxing arena: crowd with camera flashes, moving spotlights, jumbotron (o.title), ring ropes',
    club: 'nightclub: lasers, disco ball, DJ booth (o.name), dancing crowd, LED floor',
    beach: 'beach by day: sun, drifting clouds, gulls, waves, sand, palm, umbrella',
    police: 'police station: badge, flickering lights, red/blue siren glow, notice board, cabinets',
    radio: 'radio studio: ON AIR sign, control-room window, mixing console with live faders',
  };

  // project sets: SCENERY.add('gym', (c, t, o) => {...}, 'what it is') from the film's sets.js
  function add(name, fn, desc) { window.SCENERY[name] = fn; list[name] = desc || name; }
  window.SCENERY = { add, lobby, pool, studio, street, bedroom, classroom, crossroads, barbershop, court, newsroom, arena, club, beach, police, radio, palm, plant, glow, list };
})();
