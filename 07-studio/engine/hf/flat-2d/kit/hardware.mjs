// Hardware replicas: server rack (LEDs, lever), router (blinking lights, antennas).
export const rack = {
  about: "Server rack with LEDs and a side lever; beats light (LEDs turn on), lever (pull) and shake",
  base: { w: 380, h: 600 },
  fields: ["units", "title"],
  css: `.rk{position:absolute;left:0;top:0;right:60px;bottom:0;border-radius:calc(30px*var(--rk));background:var(--ink);box-shadow:var(--shd);padding:24px 22px;display:flex;flex-direction:column;gap:14px;border:var(--bw) solid var(--bc)}
.rk-u{position:relative;flex:1;border-radius:calc(14px*var(--rk));background:var(--wallx);display:flex;align-items:center;gap:14px;padding:0 18px;overflow:hidden}
.rk-u .led{width:20px;height:20px;border-radius:50%;background:var(--ledoff);display:block;flex:none}.rk-u .vent{flex:1;height:22px;background:repeating-linear-gradient(90deg,var(--muted) 0 6px,transparent 6px 14px);opacity:.55;border-radius:4px}
.rk-lv{position:absolute;right:0;top:50%;width:70px;height:240px;margin-top:-120px}.rk-lv .slot{position:absolute;left:28px;top:0;width:16px;height:240px;border-radius:8px;background:var(--muted);opacity:.7}
.rk-lv .arm{position:absolute;left:29px;top:30px;width:12px;height:170px;border-radius:6px;background:var(--warn);transform-origin:50% 100%}.rk-lv .knob{position:absolute;left:-12px;top:-22px;width:36px;height:36px;border-radius:50%;background:var(--bad)}`,
  build(ctx, p) {
    const n = Math.min(7, Math.max(3, p.units ?? 5));
    return `<div class="rk">${Array.from({ length: n }, (_, i) => `<div class="rk-u" data-i="${i}"><i class="led l1"></i><i class="led l2"></i><i class="vent"></i></div>`).join("")}</div>
      <div class="rk-lv"><div class="slot"></div><div class="arm"><i class="knob"></i></div></div>`;
  },
};

export const router = {
  about: "Wi-Fi router with antennas and blinking lights (blink loop is automatic); beat pulse flashes it",
  base: { w: 460, h: 280 },
  fields: ["title"],
  css: `.rt{position:absolute;left:0;bottom:0;right:0;height:130px;border-radius:calc(30px*var(--rk));background:var(--surface);box-shadow:var(--shd);border:var(--bw) solid var(--bc);display:flex;align-items:center;justify-content:center;gap:34px}
.rt .led{width:26px;height:26px;border-radius:50%;background:var(--good);display:block}.rt .led:nth-child(2){background:var(--accent3)}.rt .led:nth-child(3){background:var(--warn)}
.rt .ant{position:absolute;bottom:128px;width:22px;height:130px;border-radius:11px;background:var(--ink);transform-origin:50% 100%}.rt .a1{left:70px;transform:rotate(-14deg)}.rt .a2{right:70px;transform:rotate(14deg)}`,
  build(ctx, p) {
    return `<div class="ant a1" style="position:absolute;left:70px;bottom:128px;width:22px;height:130px;border-radius:11px;background:var(--ink);transform-origin:50% 100%;transform:rotate(-14deg)"></div><div class="ant a2" style="position:absolute;right:70px;bottom:128px;width:22px;height:130px;border-radius:11px;background:var(--ink);transform-origin:50% 100%;transform:rotate(14deg)"></div>
      <div class="rt"><i class="led b"></i><i class="led b"></i><i class="led b"></i><i class="led b"></i></div>`;
  },
};
