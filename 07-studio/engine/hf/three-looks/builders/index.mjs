// Builder catalog: procedural kits generated entirely in code. A builder takes params ({ size, colors by role, seed, ...own }) and returns
// custom parts (the same schema as hand-written `parts`), so validation, bounds and the runtime treat both the same way.
import { makeCtx, DEFAULT_ROLES, clampN } from "./helpers.mjs";
import { microwave, oven, laptop, phone, router, serverRack, battery, padlock, magnifier, monitor } from "./props-tech.mjs";
import { pipe, elbow, valve, funnel, conveyor, gears, cloud, chartBars, pipeSystem } from "./props-flow.mjs";
import { door, table, shelf, plant, lamp, crate, thermometer } from "./props-home.mjs";
import { character, characterRoles, CHARACTER_DESIGNS, CHARACTER_HATS, CHARACTER_EXPRESSIONS } from "./character.mjs";

const ST = (s) => s;
/** id -> { about, states (named states = beat acts), params (own params), fn } */
export const BUILDERS = {
  character: { about: "a person or robot rig: head, torso, arms and legs with pivots, blinking eyes, mouth, brows", states: "walk/emote/look beats", params: `design ${CHARACTER_DESIGNS.join("|")}, hat ${CHARACTER_HATS.join("|")}, expression ${CHARACTER_EXPRESSIONS.join("|")}, skin/hair hex`, fn: character, roles: characterRoles },
  microwave: { about: "microwave oven with a hinged door, turntable and food", states: "open/close, light-up, heat, spin", fn: microwave },
  oven: { about: "oven with a drop-down door, four burners and a pie", states: "open/close, heat, light-up", fn: oven },
  laptop: { about: "laptop with a hinged lid and a screen with windows", states: "open/close, light-up", fn: laptop },
  phone: { about: "smartphone on a stand with app icons and a notification badge", states: "light-up, open (badge)", fn: phone },
  router: { about: "Wi-Fi router with antennas, LEDs and signal arcs", states: "fill (LEDs), light-up", fn: router },
  "server-rack": { about: "server cabinet with a glass door, LED units", states: "open/close, fill (LEDs), heat", params: "units 4-8", fn: serverRack },
  battery: { about: "battery with a charge window of segments", states: "fill (segments light), light-up", params: "segments 3-8", fn: battery },
  padlock: { about: "padlock with a swinging shackle and a keyhole light", states: "open/close, light-up, heat", fn: padlock },
  magnifier: { about: "magnifying glass on a stand", states: "light-up", fn: magnifier, roles: { accent: "#f2a23a" } },
  monitor: { about: "desktop monitor whose windows pop in and a RAM bar", states: "open (windows), fill (RAM bar), light-up", fn: monitor },
  pipe: { about: "straight pipe with flanges and legs", states: "fill (flow glow), heat", params: "length 0.8-4", fn: pipe },
  elbow: { about: "pipe elbow bending up (tube along a curve)", states: "heat, light-up", fn: elbow },
  valve: { about: "pipe valve with a hand wheel", states: "spin, open (wheel turns), heat", fn: valve },
  "pipe-system": { about: "tank, pipes, elbows, a valve and a bucket: a small plumbing system", states: "fill (tank and bucket), open/spin (valve wheel), heat", fn: pipeSystem },
  funnel: { about: "funnel on three legs with falling drops", states: "fill (drops), heat", fn: funnel },
  conveyor: { about: "conveyor belt with rollers and three boxes", states: "fill (boxes travel), spin (rollers), light-up", fn: conveyor },
  gears: { about: "three meshed gears on a plate (ratio-locked rotation)", states: "spin", fn: gears },
  cloud: { about: "friendly cloud with a lightning bolt", states: "light-up, heat", fn: cloud, roles: {} },
  "chart-bars": { about: "bar chart on a plate; bars grow one after another and an arrow lights", states: "fill, light-up", params: "bars 3-7 or values [0.1-1, ...]", fn: chartBars },
  door: { about: "door in a frame with a lit room behind it", states: "open/close", fn: door },
  table: { about: "table with a runner", states: "none (set dressing)", params: "height 0.5-1.4", fn: table },
  shelf: { about: "shelf whose boxes pop in", states: "fill", fn: shelf },
  plant: { about: "potted plant", states: "none (breathes)", params: "leaves 5-11", fn: plant },
  lamp: { about: "floor lamp with a glowing bulb", states: "light-up/dim", fn: lamp },
  crate: { about: "wooden crate with braces", states: "none", fn: crate },
  thermometer: { about: "thermometer with a red column", states: "fill, heat", fn: thermometer },
};
export const BUILDER_KINDS = Object.keys(BUILDERS);
export { CHARACTER_DESIGNS, CHARACTER_HATS, CHARACTER_EXPRESSIONS };

/** @returns {{ kind, parts, colors, init, motion, scale, about }} */
export function buildParts(kind, params = {}) {
  const b = BUILDERS[kind];
  if (!b) throw new Error(`unknown builder "${kind}"; use one of: ${BUILDER_KINDS.join(", ")}`);
  const roles = typeof b.roles === "function" ? b.roles(params) : b.roles;
  const c = makeCtx(params, roles);
  const out = b.fn(c);
  return { kind, parts: out.parts, colors: { ...c.colors, ...(out.roles ?? {}), ...(params.colors ?? {}) }, init: out.init ?? {}, motion: out.motion ?? [], scale: clampN(params.size, 0.3, 3, 1), about: b.about, meta: { design: out.design, hat: out.hat, expression: out.expression } };
}
export const builderCatalog = () => BUILDER_KINDS.map((id) => ({ id, about: BUILDERS[id].about, states: BUILDERS[id].states, params: BUILDERS[id].params ?? "" }));
export { DEFAULT_ROLES };
