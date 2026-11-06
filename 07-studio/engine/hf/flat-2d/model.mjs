// Geometry model: places replicas, characters and named setting props of each scene in stage coordinates and
// assigns the DOM ids every later step (HTML, beats, camera) refers to.
import { STAGE, AT, CAST_AT, FLOOR_FEET } from "./layout.mjs";
import { KITS, SIZE_K } from "./kit/index.mjs";
import { SETTINGS } from "./settings/index.mjs";
import { DESIGN_IDS, RIG, sizeScale, characterSvg } from "./rig.mjs";
import { icon } from "./icons.mjs";
import { esc } from "./util.mjs";
import { separateCast, separateProps } from "./place.mjs";

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
      return out;
    });
    const pre0 = s.cast.map((c, ci) => {
      const info = castInfo(c.who);
      const at = c.at ?? DEFAULT_CAST_AT[ci % 3];
      const x = (CAST_AT[at] ?? 480) + (c.dx ?? 0);
      const sc = sizeScale(info.size ?? "M");
      const hipY = FLOOR_FEET - RIG.feetY * sc;
      return { c, ci, info, x, sc, hipY, who: c.who, box: { x: x - 70 * sc, y: hipY - 300 * sc, w: 140 * sc, h: (RIG.feetY + 300) * sc } };
    });
    // layout rule: characters stand beside the replicas, never over them
    const sep = separateCast(props.map((p) => ({ id: p.id, box: p.box })), pre0);
    props.forEach((p, i) => {
      const nb = sep.props[i];
      if (nb.shrink !== 1) p.k *= nb.shrink;
      p.box = nb.box;
    });
    // layout rule: replicas never overlap each other either; the replica the beats talk about most keeps its place
    const uses = (id) => (beatsByScene[si] ?? []).filter((b) => b.target === id || b.from === id || b.to === id).length;
    const sep2 = separateProps(props.map((p) => ({ id: p.id, box: p.box, weight: uses(p.id) })), sep.cast);
    props.forEach((p, i) => {
      const nb = sep2.props[i];
      if (nb.shrink !== 1) p.k *= nb.shrink;
      p.box = nb.box;
      targets.set(p.id, { type: "prop", el: p.el, box: p.box, prop: p });
    });
    const cast = pre0.map((q, i) => {
      const { c, ci, info, sc, hipY } = q, x = sep.cast[i].x;
      const facing = c.facing ?? (x < 400 ? "right" : x > 560 ? "left" : "front");
      const mode = facing === "front" ? "front" : "side";
      const key = `c${si}_${c.who}`;
      const out = { who: c.who, key, design: info.design, size: info.size ?? "M", mode, facing, flip: facing === "left" ? -1 : 1, scale: sc, x, hipY, svg: characterSvg(key, info.design, mode, style), life: ci + si };
      out.box = sep.cast[i].box;
      targets.set(c.who, { type: "cast", el: key, box: out.box, cast: out });
      return out;
    });
    return { index: si, id: s.id, def: s, pre, setting: { ...setting, far: sub(setting.far), mid: sub(setting.mid), near: sub(setting.near) }, props, cast, targets };
  });
  return { scenes, style, castInfo };
}
export const center = (box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
