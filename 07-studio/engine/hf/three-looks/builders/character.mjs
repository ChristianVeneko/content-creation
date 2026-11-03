// Procedural character rig: head, torso, arms and legs with pivots, eyes that blink, a mouth and brows (expressions), hats and 4 designs.
// Rig ids are a convention the emotes rely on: hips, torso, head, eyeL/eyeR, mouth, armL/armR, legL/legR (L = left of the screen, -x).
import { P, SKINS, HAIRS, CLOTHES } from "./helpers.mjs";

export const CHARACTER_DESIGNS = ["kid", "bot", "worker", "scientist"];
export const CHARACTER_HATS = ["none", "cap", "hardhat", "beanie", "antenna"];
export const CHARACTER_EXPRESSIONS = ["smile", "surprised", "worried", "angry", "sleepy", "determined"];
const DESIGN_HAT = { kid: "none", bot: "antenna", worker: "hardhat", scientist: "none" };
const DESIGN_ROLES = {
  kid: { body: "#e9806e", accent: "#5a86c9", dark: "#3a3a48", light: "#f7f1e6" },
  bot: { body: "#7aa7d9", accent: "#f2b45a", dark: "#3d4558", light: "#e8eef5", metal: "#b8c4d0", screen: "#1b2740", glow: "#7fe8ff" },
  worker: { body: "#5a86c9", accent: "#f2a23a", dark: "#4a3a30", light: "#f6ecdc" },
  scientist: { body: "#f4f1ea", accent: "#6db3a8", dark: "#3f3f52", light: "#ffffff" },
};
export const characterRoles = (params = {}) => DESIGN_ROLES[CHARACTER_DESIGNS.includes(params.design) ? params.design : "kid"];

export function character(c) {
  const design = CHARACTER_DESIGNS.includes(c.p.design) ? c.p.design : CHARACTER_DESIGNS[c.seed % 4], r = c.rnd;
  const hat = CHARACTER_HATS.includes(c.p.hat) ? c.p.hat : DESIGN_HAT[design];
  const expr = CHARACTER_EXPRESSIONS.includes(c.p.expression) ? c.p.expression : "smile";
  const skin = c.p.skin ?? SKINS[Math.floor(r() * SKINS.length)], hair = c.p.hair ?? HAIRS[Math.floor(r() * HAIRS.length)];
  const bot = design === "bot", S = (v) => v;
  // proportions per design: head half-height, torso size, limb thickness, shoulder offset
  const D = {
    kid: { hy: 0.4, headS: [0.4, 0.38, 0.38], torso: [0.66, 0.5, 0.46], armR: 0.075, legR: 0.1, sh: 0.4, face: 0.36 },
    bot: { hy: 0.26, headS: [0.62, 0.52, 0.5], torso: [0.72, 0.62, 0.5], armR: 0.06, legR: 0.07, sh: 0.46, face: 0.26 },
    worker: { hy: 0.32, headS: [0.31, 0.32, 0.31], torso: [0.84, 0.66, 0.52], armR: 0.115, legR: 0.12, sh: 0.5, face: 0.29 },
    scientist: { hy: 0.34, headS: [0.3, 0.34, 0.3], torso: [0.6, 0.78, 0.4], armR: 0.07, legR: 0.09, sh: 0.38, face: 0.28 },
  }[design];
  const [tw, th] = D.torso, torsoY = 0.33 + (design === "scientist" ? 0.05 : 0) - (design === "kid" ? 0.04 : 0);
  const headY = th / 2 + D.hy - 0.02, front = D.face;
  const parts = [
    P("hips", "group", null, [0, 0.62, 0]),
    P("torso", "box", D.torso, [0, torsoY, 0], { parent: "hips", radius: design === "bot" ? 0.1 : 0.16, role: design === "bot" ? "metal" : "body", motion: ["breathe"] }),
    P("head", design === "bot" ? "box" : "sphere", D.headS, [0, headY, 0], { parent: "torso", pivot: [0, -D.hy + 0.02, 0], radius: design === "bot" ? 0.12 : undefined, ...(bot ? { role: "light" } : { color: skin }), motion: [{ type: "blink", parts: ["eyeL", "eyeR"] }] }),
  ];
  // legs and feet
  for (const [id, sx] of [["legL", -1], ["legR", 1]]) {
    const lx = design === "worker" ? 0.19 : 0.16;
    parts.push(bot ? P(id, "cylinder", [D.legR, D.legR, 0.52], [sx * lx, -0.26, 0], { parent: "hips", pivot: [0, 0.26, 0], role: "metal" }) : P(id, "capsule", [D.legR, 0.32], [sx * lx, -0.26, 0], { parent: "hips", pivot: [0, 0.26, 0], role: design === "scientist" ? "dark" : "accent" }));
    parts.push(P(id.replace("leg", "foot"), "box", [design === "worker" ? 0.26 : 0.22, 0.12, design === "worker" ? 0.42 : 0.36], [0, -0.3, 0.07], { parent: id, radius: 0.05, role: design === "kid" ? "light" : "dark" }));
  }
  // arms and hands
  for (const [id, sx] of [["armL", -1], ["armR", 1]]) {
    parts.push(bot ? P(id, "cylinder", [D.armR, D.armR, 0.5], [sx * (tw / 2 + 0.08), 0.07, 0], { parent: "torso", pivot: [0, 0.25, 0], role: "metal" }) : P(id, "capsule", [D.armR, 0.34], [sx * (tw / 2 + 0.07), 0.04, 0], { parent: "torso", pivot: [0, 0.255, 0], role: design === "kid" || design === "scientist" ? "body" : "accent" }));
    parts.push(P(id.replace("arm", "hand"), "sphere", [bot ? 0.08 : 0.09], [0, -0.3, 0], { parent: id, ...(bot ? { role: "accent" } : { color: skin }) }));
  }
  if (bot) parts.push(P("shoulderL", "sphere", [0.12], [-(tw / 2 + 0.08), 0.28, 0], { parent: "torso", role: "accent" }), P("shoulderR", "sphere", [0.12], [tw / 2 + 0.08, 0.28, 0], { parent: "torso", role: "accent" }));
  // face
  const eyeY = design === "bot" ? 0.03 : 0.05, ez = design === "bot" ? front + 0.04 : front - 0.01;
  const eScale = expr === "sleepy" ? [1, 0.3, 1] : expr === "surprised" ? [1.35, 1.35, 1] : 1;
  if (bot) parts.push(P("face", "box", [0.5, 0.3, 0.04], [0, 0.02, front], { parent: "head", radius: 0.05, role: "screen" }));
  for (const [id, sx] of [["eyeL", -1], ["eyeR", 1]]) parts.push(bot ? P(id, "box", [0.1, 0.12, 0.03], [sx * 0.13, eyeY, ez], { parent: "head", role: "glow", emissive: 1.5, scale: eScale }) : P(id, "sphere", [0.05, 0.07, 0.035], [sx * 0.12, eyeY, ez], { parent: "head", role: "dark", scale: eScale }));
  const mouthY = design === "bot" ? -0.07 : -0.1, mz = design === "bot" ? ez : front - 0.005, mrole = bot ? { role: "glow", emissive: 1.2 } : { color: "#5a2f2a" };
  const mouth = { smile: P("mouth", "torus", [0.08, 0.018, 180], [0, mouthY + 0.045, mz], { parent: "head", rot: [0, 0, 180], ...mrole }), surprised: P("mouth", "torus", [0.04, 0.02], [0, mouthY, mz], { parent: "head", ...mrole }), worried: P("mouth", "torus", [0.07, 0.016, 180], [0, mouthY - 0.02, mz], { parent: "head", ...mrole }), angry: P("mouth", "box", [0.15, 0.025, 0.02], [0, mouthY, mz], { parent: "head", rot: [0, 0, 0], ...mrole }), sleepy: P("mouth", "box", [0.07, 0.02, 0.02], [0, mouthY, mz], { parent: "head", ...mrole }), determined: P("mouth", "box", [0.17, 0.03, 0.02], [0, mouthY, mz], { parent: "head", ...mrole }) }[expr];
  parts.push(mouth);
  const brow = { angry: 24, determined: 11, worried: -18 }[expr], raised = expr === "surprised";
  if (brow !== undefined || raised) for (const [id, sx] of [["browL", -1], ["browR", 1]]) parts.push(P(id, "box", [0.12, 0.03, 0.025], [sx * 0.12, eyeY + (raised ? 0.14 : 0.11), ez - 0.005], { parent: "head", rot: [0, 0, raised ? 0 : -sx * brow], ...(bot ? { role: "glow", emissive: 1 } : { color: hair }) }));
  // design details
  if (design === "kid") {
    parts.push(P("pocket", "box", [0.34, 0.14, 0.05], [0, -0.1, 0.24], { parent: "torso", radius: 0.04, role: "accent" }), P("shorts", "box", [0.5, 0.2, 0.4], [0, -0.07, 0], { parent: "hips", radius: 0.08, role: "accent" }));
    for (let i = 0; i < 3; i++) parts.push(P(`tuft${i}`, "sphere", [0.12 - i * 0.015], [(i - 1) * 0.15, 0.34 - Math.abs(i - 1) * 0.04, 0.02], { parent: "head", color: hair }));
    parts.push(P("cheekL", "sphere", [0.05, 0.035, 0.02], [-0.22, -0.05, front - 0.04], { parent: "head", color: "#f08a8a", opacity: 0.8 }), P("cheekR", "sphere", [0.05, 0.035, 0.02], [0.22, -0.05, front - 0.04], { parent: "head", color: "#f08a8a", opacity: 0.8 }));
  } else if (bot) {
    parts.push(P("chest", "box", [0.4, 0.28, 0.04], [0, 0.04, 0.26], { parent: "torso", radius: 0.03, role: "screen" }), P("lightA", "sphere", [0.05], [-0.1, 0.04, 0.29], { parent: "torso", role: "glow", emissive: 1.6 }), P("lightB", "sphere", [0.05], [0.1, 0.04, 0.29], { parent: "torso", role: "accent", emissive: 1 }), P("earL", "cylinder", [0.08, 0.08, 0.1], [-0.35, 0, 0], { parent: "head", rot: [0, 0, 90], role: "accent" }), P("earR", "cylinder", [0.08, 0.08, 0.1], [0.35, 0, 0], { parent: "head", rot: [0, 0, 90], role: "accent" }), P("belt", "box", [0.5, 0.1, 0.4], [0, -0.05, 0], { parent: "hips", radius: 0.04, role: "dark" }));
  } else if (design === "worker") {
    parts.push(P("vest", "box", [tw + 0.04, th - 0.14, 0.54], [0, -0.03, 0], { parent: "torso", radius: 0.1, role: "accent" }), P("stripeA", "box", [tw + 0.06, 0.06, 0.55], [0, 0.06, 0], { parent: "torso", role: "light" }), P("stripeB", "box", [tw + 0.06, 0.06, 0.55], [0, -0.14, 0], { parent: "torso", role: "light" }), P("belt", "box", [0.62, 0.1, 0.44], [0, -0.02, 0], { parent: "hips", radius: 0.04, role: "dark" }), P("mustache", "box", [0.22, 0.05, 0.04], [0, -0.06, front + 0.0], { parent: "head", radius: 0.02, color: hair }));
  } else {
    parts.push(P("coatSkirt", "box", [0.68, 0.46, 0.44], [0, -0.05, 0], { parent: "hips", radius: 0.08, role: "body" }), P("tie", "box", [0.09, 0.4, 0.04], [0, 0.04, 0.22], { parent: "torso", radius: 0.02, role: "accent" }), P("pocket", "box", [0.16, 0.14, 0.04], [0.18, -0.12, 0.22], { parent: "torso", role: "light" }), P("glassL", "torus", [0.085, 0.015], [-0.12, 0.06, front + 0.02], { parent: "head", color: "#2a2a35" }), P("glassR", "torus", [0.085, 0.015], [0.12, 0.06, front + 0.02], { parent: "head", color: "#2a2a35" }), P("bridge", "box", [0.07, 0.015, 0.015], [0, 0.07, front + 0.02], { parent: "head", color: "#2a2a35" }));
    for (let i = 0; i < 5; i++) parts.push(P(`spike${i}`, "cone", [0.07, 0.15 + r() * 0.08], [(i - 2) * 0.12, 0.24 + (2 - Math.abs(i - 2)) * 0.03, -0.04], { parent: "head", rot: [0, 0, (i - 2) * -22], color: hair }));
  }
  if (!bot) parts.push(P("earL", "sphere", [0.07, 0.09, 0.05], [-D.headS[0] * 0.98, -0.02, 0], { parent: "head", color: skin }), P("earR", "sphere", [0.07, 0.09, 0.05], [D.headS[0] * 0.98, -0.02, 0], { parent: "head", color: skin }));
  if (design === "kid") parts.push(P("hood", "torus", [0.3, 0.07], [0, 0.28, -0.04], { parent: "torso", rot: [75, 0, 0], role: "body" }));
  // hats sit on the head
  const top = D.hy - 0.02;
  if (hat === "cap") parts.push(P("hat", "sphere", [D.headS[0] + 0.02, 0.2, D.headS[2] + 0.02], [0, top - 0.02, 0], { parent: "head", role: "accent" }), P("visor", "box", [0.34, 0.03, 0.22], [0, top - 0.08, front + 0.1], { parent: "head", radius: 0.012, role: "accent" }));
  if (hat === "hardhat") parts.push(P("hat", "sphere", [D.headS[0] + 0.03, 0.24, D.headS[2] + 0.03], [0, top - 0.04, 0], { parent: "head", color: "#f2b45a" }), P("brim", "box", [D.headS[0] * 2 - 0.02, 0.04, D.headS[2] * 2 - 0.02], [0, top - 0.14, 0.02], { parent: "head", radius: 0.02, color: "#f2b45a" }), P("ridge", "box", [0.07, 0.04, D.headS[2] * 1.7], [0, top + 0.19, 0], { parent: "head", radius: 0.02, color: "#e0961f" }));
  if (hat === "beanie") parts.push(P("hat", "sphere", [D.headS[0] + 0.02, 0.22, D.headS[2] + 0.02], [0, top - 0.04, 0], { parent: "head", role: "accent" }), P("cuff", "torus", [D.headS[0] - 0.02, 0.05], [0, top - 0.14, 0], { parent: "head", rot: [90, 0, 0], role: "light" }), P("pom", "sphere", [0.08], [0, top + 0.22, 0], { parent: "head", role: "light" }));
  if (hat === "antenna") parts.push(P("mast", "cylinder", [0.025, 0.025, 0.28], [0, top + 0.12, 0], { parent: "head", role: "metal" }), P("ball", "sphere", [0.07], [0, top + 0.3, 0], { parent: "head", role: "glow", emissive: 1.6, states: { glow: { emissive: 3 } } }));
  return { parts, roles: DESIGN_ROLES[design], init: { glow: 0.7 }, design, hat, expression: expr, skin, hair };
}
