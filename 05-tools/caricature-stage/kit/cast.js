// Caricature cast drawn in canvas 2D. Flat vector shapes with soft gradients,
// heavy eyelids and dark beards, in the "spotlight stage" editorial look.
// CAST.draw(ctx, id, {x, y, s, mouth, blink, look, brow, tilt, mood})
(function () {
  const TAU = Math.PI * 2;

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.max(0, Math.min(255, Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k))));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }

  // ---------- generic shapes ----------
  let FJ = 0.42, FC = 0.2;
  function facePath(c, w, h, jaw = FJ, chin = FC) {
    c.beginPath();
    c.moveTo(0, -h / 2);
    c.bezierCurveTo(w * 0.32, -h / 2, w * 0.5, -h * 0.36, w * 0.5, -h * 0.1);
    c.bezierCurveTo(w * 0.5, h * 0.16, w * jaw, h * 0.4, w * chin, h * 0.48);
    c.quadraticCurveTo(0, h * 0.54, -w * chin, h * 0.48);
    c.bezierCurveTo(-w * jaw, h * 0.4, -w * 0.5, h * 0.16, -w * 0.5, -h * 0.1);
    c.bezierCurveTo(-w * 0.5, -h * 0.36, -w * 0.32, -h / 2, 0, -h / 2);
    c.closePath();
  }

  function skinFill(c, w, h, skin) {
    const g = c.createRadialGradient(-w * 0.12, -h * 0.18, w * 0.05, 0, 0, w * 0.72);
    g.addColorStop(0, shade(skin, 0.16));
    g.addColorStop(0.55, skin);
    g.addColorStop(1, shade(skin, -0.32));
    return g;
  }

  function ear(c, x, y, w, h, skin, side, earring) {
    c.save();
    c.translate(x, y);
    c.scale(side, 1);
    c.beginPath();
    c.ellipse(0, 0, w * 0.075, h * 0.1, 0.15, 0, TAU);
    c.fillStyle = shade(skin, -0.12);
    c.fill();
    c.beginPath();
    c.ellipse(w * 0.012, 0, w * 0.04, h * 0.06, 0.15, 0, TAU);
    c.fillStyle = shade(skin, -0.32);
    c.fill();
    if (earring) {
      c.beginPath();
      c.arc(w * 0.005, h * 0.1, w * 0.022, 0, TAU);
      c.lineWidth = w * 0.012;
      c.strokeStyle = '#e8c35a';
      c.stroke();
    }
    c.restore();
  }

  function eye(c, x, y, w, o, side) {
    // o: {blink 0..1, look -1..1, lid heaviness, iris color, glare}
    const ew = w * 0.105, eh = w * 0.045 * (1 - o.blink * 0.92);
    c.save();
    c.translate(x, y);
    // socket shadow
    c.beginPath();
    c.ellipse(0, -w * 0.01, ew * 1.35, w * 0.07, 0, 0, TAU);
    c.fillStyle = 'rgba(70,30,20,0.16)';
    c.fill();
    // sclera
    c.beginPath();
    c.moveTo(-ew, 0);
    c.quadraticCurveTo(-ew * 0.1, -eh * 2.1, ew, -eh * 0.2 * side);
    c.quadraticCurveTo(ew * 0.1, eh * 1.4, -ew, 0);
    c.closePath();
    c.fillStyle = '#f3ece2';
    c.fill();
    c.save();
    c.clip();
    const ix = o.look * ew * 0.45;
    c.beginPath();
    c.arc(ix, -eh * 0.15, w * 0.042, 0, TAU);
    c.fillStyle = o.iris;
    c.fill();
    c.beginPath();
    c.arc(ix, -eh * 0.15, w * 0.02, 0, TAU);
    c.fillStyle = '#120c08';
    c.fill();
    c.beginPath();
    c.arc(ix + w * 0.014, -eh * 0.5, w * 0.009, 0, TAU);
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.fill();
    // upper lid shadow inside eye
    c.fillStyle = 'rgba(40,20,10,0.35)';
    c.fillRect(-ew, -eh * 2.2, ew * 2, eh * 0.9 + o.lid * eh);
    c.restore();
    // heavy upper lid line
    c.beginPath();
    c.moveTo(-ew * 1.12, eh * 0.15);
    c.quadraticCurveTo(-ew * 0.1, -eh * 2.25 - w * 0.006, ew * 1.08, -eh * 0.2 * side - w * 0.004);
    c.lineWidth = w * 0.017;
    c.lineCap = 'round';
    c.strokeStyle = '#1a0f0b';
    c.stroke();
    // lid crease
    c.beginPath();
    c.moveTo(-ew * 0.8, -eh * 1.6 - w * 0.012);
    c.quadraticCurveTo(0, -eh * 2.6 - w * 0.03, ew * 0.9, -eh * 0.9 - w * 0.016);
    c.lineWidth = w * 0.006;
    c.strokeStyle = 'rgba(60,25,15,0.45)';
    c.stroke();
    // lower lash
    c.beginPath();
    c.moveTo(-ew * 0.7, eh * 0.55);
    c.quadraticCurveTo(0, eh * 1.25, ew * 0.75, eh * 0.2);
    c.lineWidth = w * 0.005;
    c.strokeStyle = 'rgba(60,25,15,0.4)';
    c.stroke();
    c.restore();
  }

  function brow(c, x, y, w, side, color, angle, thick) {
    c.save();
    c.translate(x, y);
    c.scale(side, 1);
    c.rotate(angle);
    c.beginPath();
    c.moveTo(-w * 0.13, w * 0.02);
    c.quadraticCurveTo(-w * 0.02, -w * 0.035 * thick, w * 0.13, -w * 0.012);
    c.quadraticCurveTo(w * 0.14, w * 0.012, w * 0.11, w * 0.012);
    c.quadraticCurveTo(-w * 0.02, -w * 0.005, -w * 0.12, w * 0.04 * thick);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    c.restore();
  }

  function nose(c, w, h, skin, size = 1) {
    const s = size;
    c.save();
    // side shadow
    c.beginPath();
    c.moveTo(w * 0.03 * s, -h * 0.06);
    c.quadraticCurveTo(w * 0.07 * s, h * 0.05, w * 0.1 * s, h * 0.12);
    c.quadraticCurveTo(w * 0.04 * s, h * 0.13, w * 0.02, h * 0.1);
    c.closePath();
    c.fillStyle = 'rgba(80,35,20,0.22)';
    c.fill();
    // nose bottom (ball + wings)
    c.beginPath();
    c.ellipse(0, h * 0.115, w * 0.06 * s, w * 0.042 * s, 0, 0, TAU);
    c.fillStyle = shade(skin, 0.06);
    c.fill();
    c.beginPath();
    c.ellipse(-w * 0.075 * s, h * 0.125, w * 0.04 * s, w * 0.032 * s, 0.3, 0, TAU);
    c.ellipse(w * 0.075 * s, h * 0.125, w * 0.04 * s, w * 0.032 * s, -0.3, 0, TAU);
    c.fillStyle = shade(skin, -0.08);
    c.fill();
    // nostrils
    c.beginPath();
    c.ellipse(-w * 0.04 * s, h * 0.142, w * 0.02 * s, w * 0.01 * s, 0.25, 0, TAU);
    c.ellipse(w * 0.04 * s, h * 0.142, w * 0.02 * s, w * 0.01 * s, -0.25, 0, TAU);
    c.fillStyle = shade(skin, -0.55);
    c.fill();
    // tip highlight
    c.beginPath();
    c.ellipse(-w * 0.012, h * 0.1, w * 0.02 * s, w * 0.012 * s, 0, 0, TAU);
    c.fillStyle = 'rgba(255,235,215,0.45)';
    c.fill();
    c.restore();
  }

  function mouth(c, w, h, skin, open, smile, lip) {
    const y = h * 0.275, mw = w * (0.12 + smile * 0.07);
    open = Math.max(open, smile * 0.45);
    c.save();
    c.translate(0, y);
    const oh = open * w * 0.09 + smile * w * 0.03;
    if (oh > w * 0.01) {
      c.beginPath();
      c.moveTo(-mw, -smile * w * 0.02);
      c.quadraticCurveTo(0, -w * 0.012, mw, -smile * w * 0.02);
      c.quadraticCurveTo(0, oh * 1.6, -mw, -smile * w * 0.02);
      c.closePath();
      c.fillStyle = '#3a1010';
      c.fill();
      c.save();
      c.clip();
      c.fillStyle = '#f4efe6';
      c.fillRect(-mw, -w * 0.03, mw * 2, w * 0.035 + smile * w * 0.015);
      c.beginPath();
      c.ellipse(0, oh * 1.2, mw * 0.6, oh * 0.5, 0, 0, TAU);
      c.fillStyle = '#b04848';
      c.fill();
      c.restore();
    } else {
      c.beginPath();
      c.moveTo(-mw, 0);
      c.quadraticCurveTo(0, w * 0.012 - smile * w * 0.0, mw, 0);
      c.lineWidth = w * 0.012;
      c.lineCap = 'round';
      c.strokeStyle = shade(lip, -0.45);
      c.stroke();
    }
    // lower lip
    c.beginPath();
    c.moveTo(-mw * 0.7, oh * 1.0 + w * 0.012);
    c.quadraticCurveTo(0, oh * 1.0 + w * 0.05, mw * 0.7, oh * 1.0 + w * 0.012);
    c.quadraticCurveTo(0, oh * 1.0 + w * 0.022, -mw * 0.7, oh * 1.0 + w * 0.012);
    c.fillStyle = lip;
    c.fill();
    c.restore();
  }

  // beard: full mass over jaw with a cut-out band around the cheeks
  function beard(c, w, h, color, o) {
    const len = o.len ?? 0.6, top = o.top ?? 0.08;
    const g = c.createLinearGradient(0, -h * 0.1, 0, h * len);
    g.addColorStop(0, shade(color, 0.08));
    g.addColorStop(1, shade(color, -0.35));
    c.beginPath();
    c.moveTo(-w * 0.5, -h * 0.12);
    c.lineTo(-w * 0.47, top * h);
    c.quadraticCurveTo(-w * 0.3, h * (top + 0.06), -w * 0.2, h * 0.19);
    c.quadraticCurveTo(0, h * 0.2, w * 0.2, h * 0.19);
    c.quadraticCurveTo(w * 0.3, h * (top + 0.06), w * 0.47, top * h);
    c.lineTo(w * 0.5, -h * 0.12);
    c.bezierCurveTo(w * 0.53, h * 0.2, w * 0.4, h * (len - 0.05), 0, h * len);
    c.bezierCurveTo(-w * 0.4, h * (len - 0.05), -w * 0.53, h * 0.2, -w * 0.5, -h * 0.12);
    c.closePath();
    c.globalAlpha = o.alpha ?? 1;
    c.fillStyle = g;
    c.fill();
    c.globalAlpha = 1;
    if (o.grey) {
      // grey streak on the chin
      c.save();
      c.clip();
      c.beginPath();
      c.ellipse(0, h * (len - 0.05), w * 0.18, h * 0.12, 0, 0, TAU);
      c.fillStyle = o.grey;
      c.fill();
      c.restore();
    }
    // stubble texture
    c.save();
    c.globalAlpha = o.alpha ? 0.1 : 0.18;
    c.fillStyle = shade(color, 0.35);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 90; i++) {
      const a = rnd() * Math.PI, r = rnd();
      const px = Math.cos(a) * w * 0.42 * r * 1.1, py = h * 0.18 + Math.sin(a) * h * (len - 0.2) * r;
      c.fillRect(px, py, w * 0.004, w * 0.012);
    }
    c.restore();
  }

  function goatee(c, w, h, color, grey) {
    c.beginPath();
    c.moveTo(-w * 0.1, h * 0.31);
    c.quadraticCurveTo(0, h * 0.29, w * 0.1, h * 0.31);
    c.quadraticCurveTo(w * 0.13, h * 0.47, 0, h * 0.6);
    c.quadraticCurveTo(-w * 0.13, h * 0.47, -w * 0.1, h * 0.31);
    c.fillStyle = color;
    c.fill();
    if (grey) {
      c.beginPath();
      c.moveTo(-w * 0.06, h * 0.45);
      c.quadraticCurveTo(0, h * 0.42, w * 0.06, h * 0.45);
      c.quadraticCurveTo(0, h * 0.6, -w * 0.06, h * 0.45);
      c.fillStyle = grey;
      c.fill();
    }
  }

  function mustache(c, w, h, color, wide = 1) {
    c.beginPath();
    c.moveTo(0, h * 0.18);
    c.bezierCurveTo(w * 0.1 * wide, h * 0.16, w * 0.2 * wide, h * 0.19, w * 0.21 * wide, h * 0.28);
    c.quadraticCurveTo(w * 0.1, h * 0.235, 0, h * 0.245);
    c.quadraticCurveTo(-w * 0.1, h * 0.235, -w * 0.21 * wide, h * 0.28);
    c.bezierCurveTo(-w * 0.2 * wide, h * 0.19, -w * 0.1 * wide, h * 0.16, 0, h * 0.18);
    c.fillStyle = color;
    c.fill();
  }

  function hairBuzz(c, w, h, color, line = 0.3) {
    c.save();
    facePath(c, w * 1.03, h * 1.03);
    c.clip();
    const g = c.createLinearGradient(0, -h / 2, 0, -h * line);
    g.addColorStop(0, shade(color, 0.12));
    g.addColorStop(1, color);
    c.beginPath();
    c.moveTo(-w * 0.6, -h * 0.6);
    c.lineTo(w * 0.6, -h * 0.6);
    c.lineTo(w * 0.6, -h * 0.02);
    c.lineTo(w * 0.47, -h * 0.02);
    c.quadraticCurveTo(w * 0.44, -h * (line - 0.02), w * 0.3, -h * (line + 0.01));
    c.quadraticCurveTo(0, -h * (line - 0.03), -w * 0.3, -h * (line + 0.01));
    c.quadraticCurveTo(-w * 0.44, -h * (line - 0.02), -w * 0.47, -h * 0.02);
    c.lineTo(-w * 0.6, -h * 0.02);
    c.closePath();
    c.fillStyle = g;
    c.fill();
    // fade on the sides
    const f = c.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
    f.addColorStop(0, 'rgba(200,150,120,0.35)');
    f.addColorStop(0.18, 'rgba(0,0,0,0)');
    f.addColorStop(0.82, 'rgba(0,0,0,0)');
    f.addColorStop(1, 'rgba(200,150,120,0.35)');
    c.fillStyle = f;
    c.fillRect(-w * 0.6, -h * 0.4, w * 1.2, h * 0.4);
    c.restore();
  }

  function hairSlick(c, w, h, color) {
    const g = c.createLinearGradient(0, -h * 0.7, 0, -h * 0.25);
    g.addColorStop(0, shade(color, 0.18));
    g.addColorStop(1, color);
    c.beginPath();
    c.moveTo(-w * 0.5, -h * 0.05);
    c.bezierCurveTo(-w * 0.58, -h * 0.5, -w * 0.3, -h * 0.68, 0, -h * 0.66);
    c.bezierCurveTo(w * 0.3, -h * 0.68, w * 0.58, -h * 0.5, w * 0.5, -h * 0.05);
    c.lineTo(w * 0.45, -h * 0.12);
    c.quadraticCurveTo(w * 0.38, -h * 0.34, w * 0.18, -h * 0.36);
    c.quadraticCurveTo(0, -h * 0.4, -w * 0.18, -h * 0.36);
    c.quadraticCurveTo(-w * 0.38, -h * 0.34, -w * 0.45, -h * 0.12);
    c.closePath();
    c.fillStyle = g;
    c.fill();
    // combed shine lines
    c.strokeStyle = 'rgba(255,255,255,0.13)';
    c.lineWidth = w * 0.01;
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo(i * w * 0.08, -h * 0.4);
      c.quadraticCurveTo(i * w * 0.12, -h * 0.58, i * w * 0.05 + w * 0.06, -h * 0.64);
      c.stroke();
    }
  }

  function cap(c, w, h, color, o = {}) {
    const top = -h * 0.64, band = -h * 0.26;
    const g = c.createLinearGradient(-w * 0.5, top, w * 0.5, band);
    g.addColorStop(0, shade(color, 0.12));
    g.addColorStop(1, shade(color, -0.2));
    c.beginPath();
    c.moveTo(-w * 0.55, band);
    c.bezierCurveTo(-w * 0.6, top + h * 0.04, w * 0.6, top + h * 0.04, w * 0.55, band);
    c.closePath();
    c.fillStyle = g;
    c.fill();
    // brim
    c.beginPath();
    c.moveTo(-w * 0.6, band + h * 0.01);
    c.quadraticCurveTo(0, band - h * 0.05, w * 0.62, band + h * 0.01);
    c.quadraticCurveTo(w * 0.55, band + h * 0.1, 0, band + h * 0.085);
    c.quadraticCurveTo(-w * 0.55, band + h * 0.1, -w * 0.6, band + h * 0.01);
    c.fillStyle = o.brim || shade(color, -0.12);
    c.fill();
    c.beginPath();
    c.moveTo(-w * 0.58, band + h * 0.07);
    c.quadraticCurveTo(0, band + h * 0.1, w * 0.6, band + h * 0.07);
    c.lineWidth = h * 0.012;
    c.strokeStyle = o.under || 'rgba(0,0,0,0.35)';
    c.stroke();
    if (o.text) {
      c.save();
      c.font = `900 ${w * (o.textSize || 0.15)}px Montserrat, Arial Black, sans-serif`;
      c.textAlign = 'center';
      c.fillStyle = o.textColor || '#fff';
      c.fillText(o.text, 0, band - h * 0.08);
      c.restore();
    }
    if (o.emboss) {
      c.save();
      c.strokeStyle = shade(color, -0.25);
      c.lineWidth = w * 0.012;
      c.lineCap = 'round';
      for (const dx of [-0.13, 0, 0.13]) {
        c.beginPath();
        c.moveTo(w * dx, band - h * 0.2);
        c.lineTo(w * dx, band - h * 0.07);
        c.moveTo(w * dx - w * 0.035, band - h * 0.16);
        c.lineTo(w * dx + w * 0.035, band - h * 0.16);
        c.stroke();
      }
      c.restore();
    }
    // shadow of brim on forehead
    c.save();
    facePath(c, w, h);
    c.clip();
    c.fillStyle = 'rgba(30,10,5,0.28)';
    c.beginPath();
    c.ellipse(0, band + h * 0.09, w * 0.55, h * 0.05, 0, 0, TAU);
    c.fill();
    c.restore();
  }

  function glasses(c, w, h, o) {
    const y = -h * 0.04, rx = w * 0.15, ry = w * 0.1;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.roundRect(s * w * 0.21 - rx, y - ry, rx * 2, ry * 2, ry * 0.7);
      c.fillStyle = o.lens;
      c.fill();
      c.lineWidth = w * (o.frame ? 0.014 : 0.006);
      c.strokeStyle = o.frame || 'rgba(255,255,255,0.35)';
      c.stroke();
      // glare
      c.beginPath();
      c.moveTo(s * w * 0.21 - rx * 0.6, y - ry * 0.6);
      c.lineTo(s * w * 0.21 - rx * 0.1, y - ry * 0.6);
      c.lineTo(s * w * 0.21 - rx * 0.5, y + ry * 0.3);
      c.closePath();
      c.fillStyle = 'rgba(255,255,255,0.22)';
      c.fill();
    }
    c.beginPath();
    c.moveTo(-w * 0.06, y - ry * 0.4);
    c.quadraticCurveTo(0, y - ry * 0.7, w * 0.06, y - ry * 0.4);
    c.lineWidth = w * 0.012;
    c.strokeStyle = o.frame || '#d8c9a8';
    c.stroke();
  }

  // ---------- bodies ----------
  function torso(c, w, h, o) {
    const sw = w * (o.wide || 1.25), top = h * 0.62;
    // neck
    c.beginPath();
    c.moveTo(-w * 0.22, h * 0.3);
    c.lineTo(-w * 0.24, top + h * 0.12);
    c.lineTo(w * 0.24, top + h * 0.12);
    c.lineTo(w * 0.22, h * 0.3);
    c.closePath();
    c.fillStyle = shade(o.skin, -0.3);
    c.fill();
    // shadow the jaw casts on the neck
    c.beginPath(); c.ellipse(0, h * 0.42, w * 0.26, h * 0.1, 0, 0, TAU); c.fillStyle = 'rgba(40,15,8,0.35)'; c.fill();
    const g = c.createLinearGradient(-sw, top, sw, top + h);
    g.addColorStop(0, shade(o.cloth, 0.12));
    g.addColorStop(0.6, o.cloth);
    g.addColorStop(1, shade(o.cloth, -0.35));
    c.beginPath();
    c.moveTo(-w * 0.3, top);
    c.bezierCurveTo(-sw * 0.6, top + h * 0.02, -sw * 0.95, top + h * 0.12, -sw, top + h * 0.45);
    c.lineTo(-sw * 1.05, top + h * 2.2);
    c.lineTo(sw * 1.05, top + h * 2.2);
    c.lineTo(sw, top + h * 0.45);
    c.bezierCurveTo(sw * 0.95, top + h * 0.12, sw * 0.6, top + h * 0.02, w * 0.3, top);
    c.closePath();
    c.fillStyle = g;
    c.fill();
    c.save();
    c.clip();
    if (o.draw) o.draw(c, w, h, top, sw);
    // cloth folds and a chest highlight
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = w * 0.022;
    for (const sg of [-1, 1]) {
      c.beginPath(); c.moveTo(sg * sw * 0.72, top + h * 0.55); c.quadraticCurveTo(sg * sw * 0.55, top + h * 0.8, sg * sw * 0.62, top + h * 1.1); c.stroke();
      c.beginPath(); c.moveTo(sg * sw * 0.45, top + h * 0.95); c.quadraticCurveTo(sg * sw * 0.3, top + h * 1.05, sg * sw * 0.35, top + h * 1.3); c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.05)'; c.beginPath(); c.ellipse(-sw * 0.3, top + h * 0.4, sw * 0.35, h * 0.18, -0.3, 0, TAU); c.fill();
    // rim light on the shoulder
    c.beginPath();
    c.moveTo(-sw * 0.98, top + h * 0.5);
    c.bezierCurveTo(-sw * 0.92, top + h * 0.12, -sw * 0.55, top + h * 0.03, -w * 0.3, top + h * 0.01);
    c.lineWidth = w * 0.03;
    c.strokeStyle = 'rgba(255,220,160,0.18)';
    c.stroke();
    c.restore();
  }

  function chain(c, w, h, top, color = '#e3b448', pend) {
    c.save();
    c.lineWidth = w * 0.028;
    c.strokeStyle = color;
    c.setLineDash([w * 0.03, w * 0.012]);
    c.beginPath();
    c.moveTo(-w * 0.3, top + h * 0.02);
    c.quadraticCurveTo(0, top + h * 0.55, w * 0.3, top + h * 0.02);
    c.stroke();
    c.setLineDash([]);
    if (pend) {
      c.beginPath();
      c.arc(0, top + h * 0.36, w * 0.08, 0, TAU);
      c.fillStyle = color;
      c.fill();
      c.lineWidth = w * 0.012;
      c.strokeStyle = shade(color, -0.35);
      c.stroke();
      c.font = `900 ${w * 0.07}px Montserrat, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = shade(color, -0.5);
      c.fillText(pend, 0, top + h * 0.365);
    }
    c.restore();
  }

  // ---------- the cast ----------
  const SPECS = {
    // Generic example character. Real people live in a private, git-ignored file
    // (05-tools/caricature-stage/private/cast-people.js) that adds entries with CAST.add().
    host: {
      name: 'HOST',
      w: 230, h: 300, skin: '#c99a74', iris: '#4a3020', jaw: 0.42, chin: 0.22,
      draw(c, w, h, p) {
        torso(c, w, h, { skin: p.skin, cloth: p.cloth || '#2f58c7', wide: 1.35, draw(c, w, h, top) {
          c.beginPath(); c.ellipse(0, top + h * 0.03, w * 0.28, h * 0.06, 0, 0, Math.PI); c.lineWidth = w * 0.035; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.stroke();
        } });
        head(c, w, h, p, () => beard(c, w, h, '#2a1d16', { len: 0.54, top: 0.1, alpha: 0.8 }), () => mustache(c, w, h, '#22170f', 0.95), () => hairBuzz(c, w, h, '#1d1714', 0.32));
      },
    },
  };

  function head(c, w, h, p, beardFn, faceHairFn, topFn) {
    const smile = p.smile ?? 0;
    // ears
    ear(c, -w * 0.5, -h * 0.02, w, h, p.skin, -1, p.earring);
    ear(c, w * 0.5, -h * 0.02, w, h, p.skin, 1, p.earring);
    facePath(c, w, h);
    c.fillStyle = skinFill(c, w, h, p.skin);
    c.fill();
    // cheek blush and jaw shadow
    c.save();
    facePath(c, w, h);
    c.clip();
    if (p.blush !== false) for (const s of [-1, 1]) {
      c.beginPath();
      c.ellipse(s * w * 0.27, h * 0.1, w * 0.1, w * 0.06, 0, 0, TAU);
      c.fillStyle = 'rgba(200,80,60,0.12)';
      c.fill();
    }
    c.beginPath();
    c.ellipse(w * 0.42, 0, w * 0.18, h * 0.5, 0, 0, TAU);
    c.fillStyle = 'rgba(60,20,10,0.15)';
    c.fill();
    // warm rim light on the left edge, forehead and nose-bridge highlights
    c.fillStyle = (() => { const g = c.createLinearGradient(-w * 0.52, 0, -w * 0.3, 0); g.addColorStop(0, 'rgba(255,226,180,0.45)'); g.addColorStop(1, 'rgba(255,226,180,0)'); return g; })();
    c.fillRect(-w * 0.55, -h * 0.5, w * 0.3, h);
    c.beginPath(); c.ellipse(-w * 0.07, -h * 0.29, w * 0.17, h * 0.06, -0.15, 0, TAU); c.fillStyle = 'rgba(255,240,220,0.16)'; c.fill();
    c.beginPath(); c.moveTo(-w * 0.012, -h * 0.07); c.quadraticCurveTo(-w * 0.02, h * 0.02, -w * 0.018, h * 0.08); c.lineWidth = w * 0.012; c.strokeStyle = 'rgba(255,240,220,0.3)'; c.stroke();
    // shadow under the cheekbones
    if (p.blush !== false) for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(sg * w * 0.33, h * 0.17, w * 0.08, h * 0.06, sg * 0.4, 0, TAU); c.fillStyle = 'rgba(70,25,12,0.1)'; c.fill(); }
    c.restore();
    if (beardFn) beardFn();
    nose(c, w, h, p.skin, p.nose || 1);
    mouth(c, w, h, p.skin, p.mouth || 0, Math.max(smile, p.mood === 'laugh' ? 1 : 0), p.lip || shade(p.skin, -0.18));
    if (faceHairFn) faceHairFn();
    const browAng = (p.brow || 0) * 0.25 + (p.mood === 'angry' ? 0.22 : 0);
    eye(c, -w * 0.21, -h * 0.04, w, { blink: p.blink || 0, look: p.look || 0, lid: p.mood === 'angry' ? 1 : 0.4, iris: p.iris }, -1);
    eye(c, w * 0.21, -h * 0.04, w, { blink: p.blink || 0, look: p.look || 0, lid: p.mood === 'angry' ? 1 : 0.4, iris: p.iris }, 1);
    brow(c, -w * 0.21, -h * 0.135 - (p.brow || 0) * h * 0.02, w, -1, '#1a110c', browAng, 1.2);
    brow(c, w * 0.21, -h * 0.135 - (p.brow || 0) * h * 0.02, w, 1, '#1a110c', browAng, 1.2);
    if (topFn) topFn();
  }

  function draw(c, id, o = {}) {
    const sp = SPECS[id];
    const p = Object.assign({}, sp, o);
    FJ = sp.jaw ?? 0.42; FC = sp.chin ?? 0.2;
    c.save();
    c.translate(o.x || 0, o.y || 0);
    c.rotate(o.tilt || 0);
    const s = o.s || 1;
    c.scale(s * (o.flip ? -1 : 1), s);
    sp.draw(c, sp.w, sp.h, p);
    c.restore();
  }

  function add(id, spec) { SPECS[id] = spec; }
  // drawing parts, so private cast files can build characters with the same look
  const parts = { facePath, skinFill, ear, eye, brow, nose, mouth, beard, goatee, mustache, hairBuzz, hairSlick, cap, glasses, torso, chain, head, shade };
  window.CAST = { draw, SPECS, shade, add, parts };
})();
