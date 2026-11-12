// ---------------- extra props: hotel, combo, records ----------------
// a thug of the combo: dark figure with a hoodie and a chain glint
function thug(x, y, s, k = 0, lean = 0) {
  c.save(); c.translate(x, y); c.rotate(lean); c.scale(s, s);
  c.fillStyle = '#0b0c0e';
  c.beginPath(); c.ellipse(0, -130, 78, 92, 0, 0, Math.PI * 2); c.fill(); // hood
  c.beginPath(); c.moveTo(-60, -60); c.bezierCurveTo(-200, -30, -220, 80, -230, 340); c.lineTo(230, 340); c.bezierCurveTo(220, 80, 200, -30, 60, -60); c.fill();
  c.fillStyle = '#16181b'; c.beginPath(); c.ellipse(0, -118, 54, 66, 0, 0, Math.PI * 2); c.fill(); // face shadow
  c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(-28, -128, 18, 6); c.fillRect(10, -128, 18, 6); // eyes
  c.strokeStyle = '#e3b448'; c.lineWidth = 6; c.beginPath(); c.moveTo(-50, -40); c.quadraticCurveTo(0, 30, 50, -40); c.stroke();
  if (k) { c.fillStyle = '#0b0c0e'; c.beginPath(); c.ellipse(140 + k * 60, -40 - k * 30, 46, 40, 0, 0, Math.PI * 2); c.fill(); } // fist
  c.restore();
}
function vinyl(x, y, r, ang, label, col = '#e2312b') {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30;
  c.fillStyle = '#111214'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(255,255,255,0.07)'; c.lineWidth = 3;
  for (let i = 0.45; i < 0.95; i += 0.07) { c.beginPath(); c.arc(0, 0, r * i, 0, Math.PI * 2); c.stroke(); }
  c.fillStyle = col; c.beginPath(); c.arc(0, 0, r * 0.36, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#111214'; c.beginPath(); c.arc(0, 0, r * 0.05, 0, Math.PI * 2); c.fill();
  c.rotate(-ang);
  if (label) txt(c, label, 0, r * 0.18, r * 0.11, '#fff', { shadow: false });
  c.restore();
}
function tomb(x, y, s, k, name = '') {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(s * k, s * k);
  const g = c.createLinearGradient(-130, -200, 130, 160); g.addColorStop(0, '#a9adb2'); g.addColorStop(1, '#5d6268');
  c.fillStyle = g; c.beginPath(); c.moveTo(-130, 160); c.lineTo(-130, -80); c.arc(0, -80, 130, Math.PI, 0); c.lineTo(130, 160); c.closePath(); c.fill();
  c.fillStyle = '#3f6a33'; c.fillRect(-170, 150, 340, 26);
  txt(c, 'RIP', 0, -70, 82, '#2b2f33', { shadow: false });
  if (name) txt(c, name, 0, 20, 40, '#2b2f33', { shadow: false });
  c.restore();
}
function manhole(x, y, s, t) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#1e2124'; c.beginPath(); c.ellipse(0, 0, 230, 80, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#4a4f55'; c.lineWidth = 10;
  for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 50, -60 + Math.abs(i) * 6); c.lineTo(i * 50, 60 - Math.abs(i) * 6); c.stroke(); }
  c.beginPath(); c.ellipse(0, 0, 230, 80, 0, 0, Math.PI * 2); c.stroke();
  // muddy sound waves coming out
  for (let i = 0; i < 4; i++) {
    const p = ((t * 0.9 + i * 0.25) % 1);
    c.strokeStyle = `rgba(150,170,110,${0.7 * (1 - p)})`; c.lineWidth = 8;
    c.beginPath(); c.ellipse(0, -40 - p * 260, 120 + p * 200, 30 + p * 50, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  }
  c.restore();
}
function cape(x, y, s, k) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(s * k, s * k); c.rotate(Math.sin(k * 6) * 0.05);
  c.fillStyle = '#c8282b'; c.beginPath(); c.moveTo(-60, -120); c.lineTo(60, -120); c.quadraticCurveTo(150, 60, 120, 180); c.quadraticCurveTo(0, 150, -120, 180); c.quadraticCurveTo(-150, 60, -60, -120); c.fill();
  c.fillStyle = '#9b1b1e'; c.fillRect(-60, -130, 120, 24);
  c.fillStyle = '#111'; c.beginPath(); c.ellipse(-36, -190, 40, 22, 0, 0, Math.PI * 2); c.ellipse(36, -190, 40, 22, 0, 0, Math.PI * 2); c.fill(); // mask
  c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-36, -190, 16, 9, 0, 0, Math.PI * 2); c.ellipse(36, -190, 16, 9, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}
function board(x, y, w, h) {
  c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30;
  c.fillStyle = '#7a4a26'; c.fillRect(x - w / 2 - 18, y - h / 2 - 18, w + 36, h + 36);
  c.shadowColor = 'transparent';
  c.fillStyle = '#1f3a2c'; c.fillRect(x - w / 2, y - h / 2, w, h);
  c.restore();
}
function guard(x, y, s) {
  silhouette(c, x, y, s, '#0e1012');
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#e3b448'; c.fillRect(-120, 40, 240, 60);
  txt(c, 'SEGURIDAD', 0, 72, 34, '#111', { shadow: false });
  c.restore();
}

function vs(x, y, k) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(k, k); c.rotate(-0.08);
  c.beginPath(); for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, r = i % 2 ? 70 : 120; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath();
  c.fillStyle = '#ffd23f'; c.fill(); c.lineWidth = 8; c.strokeStyle = '#b8201e'; c.stroke();
  txt(c, 'VS', 0, 4, 80, '#b8201e', { shadow: false });
  c.restore();
}
// ---------------- new props for v2 ----------------
// ---------------- new props for v2 ----------------
// ---------------- new props for v2 ----------------
function jacuzzi(x, y, t) {
  c.save(); c.translate(x, y);
  // tub
  const g = c.createLinearGradient(0, -40, 0, 220); g.addColorStop(0, '#e9eef0'); g.addColorStop(1, '#9fb0b6');
  c.fillStyle = g; c.beginPath(); c.roundRect(-400, -30, 800, 260, 60); c.fill();
  // water
  const wg = c.createLinearGradient(0, -60, 0, 40); wg.addColorStop(0, '#5ec8e6'); wg.addColorStop(1, '#2a8fb5');
  c.fillStyle = wg; c.beginPath(); c.ellipse(0, -30, 370, 60, 0, 0, Math.PI * 2); c.fill();
  c.restore();
}
function bubblesFront(x, y, t) {
  c.save(); c.translate(x, y);
  for (let i = 0; i < 22; i++) {
    const bx = -340 + ((i * 67) % 680), by = -30 - ((t * 60 + i * 37) % 140);
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(bx, by, 8 + (i % 4) * 4, 0, Math.PI * 2); c.fill();
  }
  // foam band over the shoulders
  c.fillStyle = '#f4fbfd';
  for (let i = 0; i < 16; i++) { c.beginPath(); c.arc(-340 + i * 45, -32 + Math.sin(t * 3 + i) * 6, 34, 0, Math.PI * 2); c.fill(); }
  // tub front lip
  const g = c.createLinearGradient(0, -10, 0, 240); g.addColorStop(0, '#f2f6f7'); g.addColorStop(1, '#8fa1a8');
  c.fillStyle = g; c.beginPath(); c.roundRect(-410, 0, 820, 240, 50); c.fill();
  c.restore();
}
function duck(x, y, s, t) {
  c.save(); c.translate(x, y + Math.sin(t * 2.5) * 6); c.scale(s, s); c.rotate(Math.sin(t * 2) * 0.08);
  c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(0, 0, 70, 46, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(40, -50, 34, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f08a24'; c.beginPath(); c.moveTo(66, -54); c.lineTo(100, -46); c.lineTo(66, -38); c.fill();
  c.fillStyle = '#111'; c.beginPath(); c.arc(48, -58, 6, 0, Math.PI * 2); c.fill();
  c.restore();
}
function trash(x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#7d8790'; c.beginPath(); c.moveTo(-90, -80); c.lineTo(90, -80); c.lineTo(70, 120); c.lineTo(-70, 120); c.closePath(); c.fill();
  c.fillStyle = '#5c656d'; c.fillRect(-105, -105, 210, 28); c.fillRect(-30, -125, 60, 22);
  c.strokeStyle = '#5c656d'; c.lineWidth = 10; for (const k of [-40, 0, 40]) { c.beginPath(); c.moveTo(k, -50); c.lineTo(k * 0.8, 95); c.stroke(); }
  c.restore();
}
function shot(x, y, s, ang) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.fillStyle = '#f3efe6'; c.fillRect(-60, -100, 120, 200);
  c.fillStyle = '#e8457a'; c.fillRect(-48, -86, 96, 20);
  c.fillStyle = '#c9ccd0'; for (let i = 0; i < 5; i++) c.fillRect(-48, -54 + i * 28, 70 + (i % 2) * 20, 12);
  c.restore();
}
function roadSign(x, y, label, dir, lit) {
  c.save(); c.translate(x, y);
  c.fillStyle = '#5a5f66'; c.fillRect(-10, 0, 20, 520);
  c.shadowColor = lit ? 'rgba(255,210,63,0.8)' : 'rgba(0,0,0,0.4)'; c.shadowBlur = lit ? 40 : 16;
  c.fillStyle = lit ? '#ffd23f' : '#2f8f4e';
  c.beginPath();
  if (dir < 0) { c.moveTo(-250, -10); c.lineTo(-190, -80); c.lineTo(150, -80); c.lineTo(150, 60); c.lineTo(-190, 60); }
  else { c.moveTo(250, -10); c.lineTo(190, -80); c.lineTo(-150, -80); c.lineTo(-150, 60); c.lineTo(190, 60); }
  c.closePath(); c.fill();
  c.shadowColor = 'transparent';
  c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke();
  const lines = label.split('|');
  lines.forEach((L, i) => txt(c, L, dir < 0 ? -20 : 20, -36 + i * 52, 40, lit ? '#1a1205' : '#fff', { shadow: false }));
  c.restore();
}
function fireAura(x, y, k, t) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI / 2 + (i - 7) * 0.2, r = (260 + Math.sin(t * 9 + i * 1.7) * 50) * k;
    const g = c.createRadialGradient(0, 0, 40, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.6);
    g.addColorStop(0, `rgba(255,120,30,${0.35 * k})`); g.addColorStop(1, 'rgba(255,40,0,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(-90, 120); c.quadraticCurveTo(Math.cos(a) * r * 0.5 - 60, Math.sin(a) * r * 0.5, Math.cos(a) * r, Math.sin(a) * r); c.quadraticCurveTo(Math.cos(a) * r * 0.5 + 60, Math.sin(a) * r * 0.5, 90, 120); c.fill();
  }
  c.restore();
}
function redEyes(x, y, s, k) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(s, s); c.globalCompositeOperation = 'lighter';
  for (const sx of [-1, 1]) {
    const g = c.createRadialGradient(sx * 50, -12, 2, sx * 50, -12, 50); g.addColorStop(0, `rgba(255,60,40,${k})`); g.addColorStop(1, 'rgba(255,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(sx * 50, -12, 50, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}
function tostones(x, y, s, k) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(s * k, s * k);
  c.fillStyle = '#f3efe6'; c.beginPath(); c.ellipse(0, 30, 200, 60, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#d9d4c8'; c.beginPath(); c.ellipse(0, 30, 150, 40, 0, 0, Math.PI * 2); c.fill();
  [[-90, 0], [0, -10], [90, 0], [-45, -40], [45, -40]].forEach(([tx, ty], i) => {
    const g = c.createRadialGradient(tx - 10, ty - 10, 4, tx, ty, 52); g.addColorStop(0, '#f6d27a'); g.addColorStop(1, '#c98a2c');
    c.fillStyle = g; c.beginPath(); c.ellipse(tx, ty, 54, 40, i * 0.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.7)'; for (let j = 0; j < 4; j++) { c.beginPath(); c.arc(tx - 20 + j * 13, ty - 6 + (j % 2) * 10, 3, 0, Math.PI * 2); c.fill(); }
  });
  c.restore();
}

