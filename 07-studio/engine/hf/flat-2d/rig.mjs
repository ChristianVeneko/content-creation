// Rigged flat characters. Origin (0,0) = hip centre, feet at y = +176, head top near y = -295 (about 471 px tall).
// Every joint is <g class="X"> (positioned) > <g class="rot"> so GSAP rotates it around its local origin.
//   mode "front": symmetric view (arms/legs at +-x). mode "side": 3/4 view facing +x (flip with scaleX = -1 to face left):
//   far limbs sit behind the torso, features are shifted toward the facing side, a nose breaks the head outline.
// Joint classes (shared by both modes so clips are written once): aN aF (near/far arm, child .fore), lN lF (legs),
// head, eN eF (eyes), bN bF (brows), mouth variants m-smile m-open m-o, accessories (shades, hat, glasses).
import { mix, darken, lighten, lum, isHex } from "./util.mjs";

export const RIG = { height: 471, feetY: 176, headTop: -295, shoulderY: -150, armLen: 178, sizes: { S: 0.12, M: 0.18, L: 0.28 }, frameH: 1920 };
export const sizeScale = (size) => (RIG.sizes[size] ?? RIG.sizes.M) * RIG.frameH / RIG.height;

export const DESIGNS = {
  nico: { about: "teal hoodie, dark short hair, sunglasses", skin: "#F2B48C", hair: "#2B2233", hairStyle: "short", top: "#2DD4BF", pants: "#2F3A59", shoes: "#F4F6FB", accessory: "hoodie", shades: true },
  dora: { about: "purple cardigan, hair bun, round glasses", skin: "#C98B62", hair: "#3A2418", hairStyle: "bun", top: "#8B5CF6", pants: "#2A2F4A", shoes: "#F4F6FB", accessory: "cardigan", glasses: true },
  beto: { about: "blue shirt, orange safety vest, yellow hard hat", skin: "#8D5A3B", hair: "#16121A", hairStyle: "flat", top: "#3B82F6", pants: "#2A2F4A", shoes: "#FFD23F", accessory: "vest", hat: "hardhat" },
  luz: { about: "long ginger hair, red-orange dress, white sneakers", skin: "#F6CBA9", hair: "#B5452F", hairStyle: "long", top: "#F0546A", pants: "#F0546A", shoes: "#F4F6FB", accessory: "dress" },
  tomas: { about: "gray hair and beard, dark suit with red tie", skin: "#E0A878", hair: "#8D8D99", hairStyle: "short", top: "#33384F", pants: "#33384F", shoes: "#16121A", accessory: "tie", beard: true },
  mica: { about: "curly hair puff, yellow shirt under green overalls, cap", skin: "#D9A27A", hair: "#2A1B3D", hairStyle: "curly", top: "#FFD23F", pants: "#2FBF71", shoes: "#F4F6FB", accessory: "overalls", hat: "cap" },
};
export const DESIGN_IDS = Object.keys(DESIGNS);

/** Paint helpers per style cast mode: color keeps the design colors, duo maps to the ink set, line draws outlines only. */
export function castPaint(style) {
  const c = style.c, sw = style.shape.stroke ? Math.max(3, Math.round(style.shape.stroke * 0.75)) : 0;
  const mode = style.cast.mode;
  const outline = style.shape.stroke ? c[style.shape.strokeRole] ?? c.ink : null;
  if (mode === "line") {
    return { fill: (hex, k = 0) => mix(c.bg, c.ink, 0.1 + k * 0.08), stroke: c.ink, sw: 3, mode, ink: c.ink, white: mix(c.bg, c.ink, 0.25), blush: "none" };
  }
  if (mode === "duo") {
    const [dark, mid, light] = style.cast.duo;
    return { fill: (hex) => (lum(hex) < 0.28 ? dark : lum(hex) < 0.62 ? mid : light), stroke: dark, sw: 3, mode, ink: dark, white: light, blush: mid };
  }
  return { fill: (hex) => hex, stroke: outline, sw, mode, ink: "#1b1d2a", white: "#ffffff", blush: "#FF8FA0" };
}

const cap = (w, h, fill, st) => `<rect x="${-w / 2}" y="0" width="${w}" height="${h}" rx="${w / 2}" fill="${fill}"${st}/>`;

export function characterSvg(id, design, mode, style) {
  const D = DESIGNS[design] ?? DESIGNS.nico;
  const P = castPaint(style);
  const F = (hex, k) => P.fill(hex, k);
  const st = P.stroke ? ` stroke="${P.stroke}" stroke-width="${P.sw}" stroke-linejoin="round"` : "";
  const skin = F(D.skin, 1), skinShade = P.mode === "color" ? darken(D.skin, 0.1) : F(D.skin, 2), hair = F(D.hair, 0), top = F(D.top, 1), topShade = P.mode === "color" ? darken(D.top, 0.14) : F(D.top, 2);
  const pants = F(D.pants, 0), shoes = F(D.shoes, 2), ink = P.ink;
  const side = mode === "side";

  const arm = (cls, x, behind) => {
    const sleeve = D.accessory === "tie" || D.accessory === "dress" ? top : top;
    const c1 = behind ? topShade : sleeve;
    return `<g class="${cls}" transform="translate(${x},-150)"><g class="rot">${cap(34, 84, c1, st)}<rect x="-17" y="52" width="34" height="32" rx="12" fill="${topShade}" opacity="${P.mode === "line" ? 0 : 0.5}"/>
      <g class="fore" transform="translate(0,78)"><g class="rot">${cap(30, 76, skin, st)}<circle cx="0" cy="78" r="19" fill="${skin}"${st}/></g></g></g></g>`;
  };
  const leg = (cls, x, behind) => {
    const col = D.accessory === "dress" ? skin : pants;
    const f = behind ? (P.mode === "color" ? darken(isHex(col) ? col : pants, 0.1) : col) : col;
    const toe = side ? 14 : 0;
    return `<g class="${cls}" transform="translate(${x},-6)"><g class="rot">${cap(40, 160, f, st)}<ellipse cx="${side ? 14 : x < 0 ? -5 : 5}" cy="168" rx="${34 + toe / 2}" ry="15" fill="${shoes}"${st}/><ellipse cx="${side ? 14 : x < 0 ? -5 : 5}" cy="177" rx="${34 + toe / 2}" ry="6" fill="#0000001f"/></g></g>`;
  };

  // hair, behind and in front of the head (head origin = neck top; face circle centre (0,-58) r 58)
  const hx = side ? -10 : 0;
  const hairBack = {
    bun: `<circle cx="${hx - (side ? 14 : 0)}" cy="-124" r="26" fill="${hair}"${st}/>`,
    long: `<rect x="${hx - 64}" y="-112" width="${side ? 98 : 128}" height="${side ? 150 : 120}" rx="48" fill="${hair}"${st}/>`,
    curly: [[-44, -100, 34], [0, -126, 40], [44, -100, 34], [-62, -62, 28], [62, -62, 28]].map(([x, y, r]) => `<circle cx="${x + hx}" cy="${y}" r="${r}" fill="${hair}"${st}/>`).join(""),
    short: "", flat: "",
  }[D.hairStyle];
  const hairFront = {
    short: `<path d="M${hx - 58},-62 C${hx - 62},-124 ${hx + 62},-124 ${hx + 58},-62 C${hx + 46},-92 ${hx - 30},-100 ${hx - 58},-62Z" fill="${hair}"${st}/>`,
    bun: `<path d="M${hx - 60},-58 C${hx - 64},-126 ${hx + 66},-126 ${hx + 62},-58 C${hx + 40},-98 ${hx - 20},-96 ${hx - 60},-58Z" fill="${hair}"${st}/>`,
    long: `<path d="M${hx - 60},-58 C${hx - 64},-126 ${hx + 66},-126 ${hx + 62},-58 C${hx + 40},-98 ${hx - 20},-96 ${hx - 60},-58Z" fill="${hair}"${st}/>`,
    curly: `<path d="M${hx - 56},-70 C${hx - 50},-122 ${hx + 54},-122 ${hx + 56},-70 C${hx + 30},-96 ${hx - 30},-96 ${hx - 56},-70Z" fill="${hair}"${st}/>`,
    flat: `<path d="M${hx - 56},-70 C${hx - 50},-118 ${hx + 50},-118 ${hx + 56},-70 C${hx + 30},-92 ${hx - 30},-92 ${hx - 56},-70Z" fill="${hair}"${st}/>`,
  }[D.hairStyle];

  // face features: front = symmetric; side = shifted toward +x
  const ex = side ? [22, 50] : [-22, 22];
  const eye = (cls, x, small) => `<g class="${cls}" transform="translate(${x},-56)"><g class="rot"><ellipse rx="${small ? 9 : 12}" ry="${small ? 13 : 15}" fill="${P.white}"${st ? ` stroke="${P.stroke}" stroke-width="2"` : ""}/><circle class="pupil" cx="${side ? 2 : 0}" r="${small ? 6 : 7.5}" fill="${ink}"/><circle cx="${side ? 4 : 2.5}" cy="-3" r="2.2" fill="#fff"/></g></g>
      <g class="${cls === "eN" ? "bN" : "bF"}" transform="translate(${x},-84)"><g class="rot"><rect x="-14" y="-3" width="28" height="6" rx="3" fill="${hair}"/></g></g>`;
  const mx = side ? 30 : 0;
  const mouth = `<g class="mouth m-smile"><path d="M${mx - 18},-24 Q${mx},-6 ${mx + 18},-24" fill="none" stroke="${P.mode === "color" ? "#7A3B3B" : ink}" stroke-width="6" stroke-linecap="round"/></g>
      <g class="mouth m-open" opacity="0"><path d="M${mx - 17},-28 Q${mx},-2 ${mx + 17},-28Z" fill="${P.mode === "color" ? "#7A3B3B" : ink}"/><path d="M${mx - 9},-14 Q${mx},-8 ${mx + 9},-14 Q${mx},-4 ${mx - 9},-14Z" fill="${P.blush}"/></g>
      <g class="mouth m-o" opacity="0"><ellipse cx="${mx}" cy="-20" rx="9" ry="11" fill="${P.mode === "color" ? "#7A3B3B" : ink}"/></g>`;
  const nose = side ? `<ellipse cx="63" cy="-44" rx="9" ry="10" fill="${skin}"${st}/>` : `<ellipse cx="0" cy="-42" rx="5" ry="4" fill="${skinShade}" opacity=".7"/>`;
  const ears = side ? `<ellipse cx="-34" cy="-54" rx="11" ry="16" fill="${skinShade}"${st}/>` : `<ellipse cx="-58" cy="-56" rx="11" ry="16" fill="${skin}"${st}/><ellipse cx="58" cy="-56" rx="11" ry="16" fill="${skin}"${st}/>`;
  const cheeks = P.blush === "none" ? "" : side ? `<ellipse cx="40" cy="-30" rx="11" ry="6" fill="${P.blush}" opacity=".35"/>` : `<ellipse cx="-34" cy="-34" rx="12" ry="7" fill="${P.blush}" opacity=".35"/><ellipse cx="34" cy="-34" rx="12" ry="7" fill="${P.blush}" opacity=".35"/>`;
  const gx = side ? 36 : 0;
  const glasses = D.glasses ? `<g class="glasses"><circle cx="${gx - 22 + (side ? 0 : 0)}" cy="-56" r="${side ? 17 : 19}" fill="none" stroke="${ink}" stroke-width="5"/><circle cx="${gx + 18 + (side ? 6 : 4)}" cy="-56" r="${side ? 14 : 19}" fill="none" stroke="${ink}" stroke-width="5"/><path d="M${gx - 4},-58 L${gx + 4},-58" stroke="${ink}" stroke-width="5"/></g>` : "";
  const shades = D.shades ? `<g class="shades" opacity="0"><rect x="${side ? 4 : -48}" y="-72" width="${side ? 40 : 44}" height="30" rx="12" fill="#0b0c12"/><rect x="${side ? 44 : 4}" y="-72" width="${side ? 32 : 44}" height="30" rx="12" fill="#0b0c12"/><rect x="${side ? 36 : -6}" y="-66" width="12" height="6" fill="#0b0c12"/><path d="M${side ? 10 : -40},-66 L${side ? 24 : -26},-66" stroke="#fff" stroke-width="4" opacity=".5" stroke-linecap="round"/></g>` : "";
  const beard = D.beard ? `<path d="M${hx - 50},-52 Q${hx - 50},8 ${hx + 6},8 Q${hx + 56},8 ${hx + 54},-52 Q${hx + 30},-24 ${hx + 2},-26 Q${hx - 28},-24 ${hx - 50},-52Z" fill="${hair}" opacity=".95"/>` : "";
  const hat = D.hat === "hardhat" ? `<g class="hat"><path d="M${hx - 66},-76 C${hx - 66},-134 ${hx + 66},-134 ${hx + 66},-76Z" fill="${F("#FFC21A", 2)}"${st}/><rect x="${hx - 76}" y="-82" width="152" height="14" rx="7" fill="${F("#F2A900", 2)}"${st}/><rect x="${hx - 8}" y="-130" width="16" height="44" rx="6" fill="${F("#F2A900", 2)}"/></g>`
    : D.hat === "cap" ? `<g class="hat"><path d="M${hx - 62},-78 C${hx - 62},-128 ${hx + 62},-128 ${hx + 62},-78Z" fill="${F("#FF5D8F", 1)}"${st}/><path d="M${hx + 20},-80 L${hx + (side ? 96 : 84)},-76 L${hx + 20},-68Z" fill="${F("#E5497B", 2)}"${st}/></g>` : "";

  const torsoW = side ? 104 : 124;
  const tx = side ? -52 : -62;
  const dress = D.accessory === "dress" ? `<path d="M${tx},-30 L${tx + torsoW},-30 L${tx + torsoW + 22},40 Q${tx + torsoW / 2},56 ${tx - 22},40 Z" fill="${top}"${st}/>` : "";
  const acc = {
    hoodie: `<path d="M${tx + 32},-190 Q${tx + torsoW / 2},-150 ${tx + torsoW - 32},-190" fill="none" stroke="${topShade}" stroke-width="10" stroke-linecap="round"/><rect x="${tx + 28}" y="-62" width="${torsoW - 56}" height="40" rx="14" fill="${topShade}" opacity=".55"/>`,
    tie: `<path d="M${tx + torsoW / 2 - 14},-190 L${tx + torsoW / 2 + 14},-190 L${tx + torsoW / 2 + 8},-150 L${tx + torsoW / 2},-70 L${tx + torsoW / 2 - 8},-150Z" fill="${F("#FF5D5D", 2)}"/><path d="M${tx + torsoW / 2 - 18},-190 L${tx + torsoW / 2},-166 L${tx + torsoW / 2 + 18},-190Z" fill="#fff" opacity=".9"/>`,
    vest: `<rect x="${tx}" y="-190" width="${torsoW}" height="206" rx="42" fill="${F("#FFB020", 2)}" opacity=".96"/><rect x="${tx}" y="-120" width="${torsoW}" height="12" fill="#fff" opacity=".85"/><rect x="${tx}" y="-60" width="${torsoW}" height="12" fill="#fff" opacity=".85"/>`,
    cardigan: `<rect x="${tx + torsoW / 2 - 14}" y="-190" width="28" height="206" fill="${P.white}" opacity=".9"/><circle cx="${tx + torsoW / 2}" cy="-130" r="6" fill="${topShade}"/><circle cx="${tx + torsoW / 2}" cy="-90" r="6" fill="${topShade}"/>`,
    overalls: `<rect x="${tx}" y="-110" width="${torsoW}" height="126" rx="30" fill="${pants}"${st}/><rect x="${tx + 14}" y="-190" width="16" height="84" fill="${pants}"/><rect x="${tx + torsoW - 30}" y="-190" width="16" height="84" fill="${pants}"/><circle cx="${tx + torsoW / 2}" cy="-70" r="7" fill="${F("#FFD23F", 2)}"/>`,
    dress: "", none: "",
  }[D.accessory] ?? "";
  const lx = side ? [-8, 8] : [-25, 25];
  const ax = side ? { N: -2, F: 20 } : { N: 72, F: -72 };

  return `<g id="${id}" class="char"><g class="pos"><g class="flip"><g class="body">
    <ellipse class="shadow" cx="${side ? 10 : 0}" cy="182" rx="${side ? 80 : 95}" ry="14" fill="#000" opacity="${P.mode === "line" ? 0.12 : 0.26}"/>
    ${leg("lF", lx[0], true)}${arm("aF", ax.F, true)}${leg("lN", lx[1], false)}
    <g class="torso">
      ${dress}<rect x="${tx}" y="-190" width="${torsoW}" height="206" rx="42" fill="${top}"${st}/>
      <path d="M${tx},-30 L${tx + torsoW},-30 L${tx + torsoW},-6 Q${tx + torsoW},16 ${tx + torsoW - 42},16 L${tx + 42},16 Q${tx},16 ${tx},-6Z" fill="${topShade}" opacity="${P.mode === "line" ? 0 : 0.5}"/>
      ${acc}
    </g>
    ${arm("aN", ax.N, false)}
    <g class="head" transform="translate(${side ? 8 : 0},-186)"><g class="rot">
      ${hairBack}
      <rect x="-20" y="-6" width="40" height="30" rx="14" fill="${skinShade}"/>
      ${ears}
      <circle cx="${side ? 2 : 0}" cy="-58" r="58" fill="${skin}"${st}/>
      ${nose}${cheeks}${beard}${hairFront}
      ${eye("eF", ex[0], side)}${eye("eN", ex[1], false)}
      ${mouth}${glasses}${shades}${hat}
    </g></g>
  </g></g></g></g>`;
}
