// Geometry model: places replicas, characters and named setting props of each scene in stage coordinates and
// assigns the DOM ids every later step (HTML, beats, camera) refers to.
import { STAGE, AT, CAST_AT, FLOOR_FEET } from "./layout.mjs";
import { KITS, SIZE_K } from "./kit/index.mjs";
import { SETTINGS } from "./settings/index.mjs";
import { DESIGN_IDS, RIG, sizeScale, characterSvg } from "./rig.mjs";
import { icon } from "./icons.mjs";
import { esc } from "./util.mjs";

const DEFAULT_SIZE = { browser: "l", chat: "m", phone: "m", list: "m", stats: "m", chart: "m", notification: "m", rack: "m", router: "s", calendar: "m", "stamp-card": "m", progress: "m", card: "m" };
const DEFAULT_AT = ["top", "floor-right", "middle-left", "top-right", "middle-right", "top-left"];
const DEFAULT_CAST_AT = ["left", "right", "center"];
const ctx = { icon, esc };

/** Build per-scene geometry. `d` = style-aware draw kit, `hf` = normalized payload, `typed` = per-prop typed text. */
export function buildModel(hf, d, beatsByScene) {
  const style = d.style;
  const declared = new Map((hf.cast ?? []).map((c) => [c.id, c]));
  let autoDesign = 0;
  const castInfo = (who) => {
    const dec = declared.get(who);
    if (dec) return dec;
    const design = DESIGN_IDS.includes(who) ? who : DESIGN_IDS[autoDesign++ % DESIGN_IDS.length];
    const info = { id: who, design, size: "M" };
    declared.set(who, info);
    return info;
  };
  const scenes = hf.scenes.map((s, si) => {
    const setting = SETTINGS[s.setting].build(d);
    const pre = `s${si}`;
    const sub = (str) => str.replace(/id="@/g, `id="${pre}-`);
    const targets = new Map();
    for (const [name, box] of Object.entries(setting.props)) targets.set(name, { type: "setting", el: `${pre}-${name}`, box, name });
    const typedFor = (propId) => beatsByScene[si]?.find((b) => b.do === "type" && b.target === propId)?.text;
    const props = s.props.map((p, pi) => {
      const kit = KITS[p.kind];
      const k = SIZE_K[p.size ?? DEFAULT_SIZE[p.kind] ?? "m"];
      const typed = typedFor(p.id);
      const pp = { ...p, ...(p.kind === "browser" && typed !== undefined ? { url: typed } : {}), ...(p.kind === "chat" && typed !== undefined ? { typed } : {}) };
      const bw = kit.base.w, bh = kit.heightFor ? kit.heightFor(pp) : kit.base.h;
      const w = bw * k, h = bh * k;
      const [cx, cy] = AT[p.at ?? DEFAULT_AT[pi % DEFAULT_AT.length]];
      let x = cx - w / 2 + (p.dx ?? 0), y = cy - h / 2 + (p.dy ?? 0);
      x = Math.min(STAGE.w - 20 - w, Math.max(20, x));
      y = Math.min(STAGE.h - 30 - h, Math.max(104, y));
      const out = { ...p, si, pi, el: `p${si}_${p.id}`, kit, k, bw, bh, box: { x, y, w, h }, html: kit.build(ctx, pp), typed, rows: p.rows, hiddenInit: p.hidden === true };
      targets.set(p.id, { type: "prop", el: out.el, box: out.box, prop: out });
      return out;
    });
    const cast = s.cast.map((c, ci) => {
      const info = castInfo(c.who);
      const at = c.at ?? DEFAULT_CAST_AT[ci % 3];
      const x = (CAST_AT[at] ?? 480) + (c.dx ?? 0);
      const facing = c.facing ?? (x < 400 ? "right" : x > 560 ? "left" : "front");
      const mode = facing === "front" ? "front" : "side";
      const sc = sizeScale(info.size ?? "M");
      const key = `c${si}_${c.who}`;
      const hipY = FLOOR_FEET - RIG.feetY * sc;
      const out = { who: c.who, key, design: info.design, size: info.size ?? "M", mode, facing, flip: facing === "left" ? -1 : 1, scale: sc, x, hipY, svg: characterSvg(key, info.design, mode, style), life: ci + si };
      out.box = { x: x - 70 * sc, y: hipY - 300 * sc, w: 140 * sc, h: (RIG.feetY + 300) * sc };
      targets.set(c.who, { type: "cast", el: key, box: out.box, cast: out });
      return out;
    });
    return { index: si, id: s.id, def: s, pre, setting: { ...setting, far: sub(setting.far), mid: sub(setting.mid), near: sub(setting.near) }, props, cast, targets };
  });
  return { scenes, style, castInfo };
}
export const center = (box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
