// Expands an object spec (builder or hand-written parts, or both) into the parts the runtime builds. One path for tests, schema and resolver.
import { buildParts, BUILDERS } from "./builders/index.mjs";
import { DEFAULT_ROLES } from "./builders/helpers.mjs";

/** @returns {{ parts, colors, init, motion, scale, meta }} */
export function expandObject(obj, { cast = false, heroDefaults = {} } = {}) {
  const colors = { ...(obj.colors ?? {}) };
  let out;
  if (cast) {
    const src = { ...heroDefaults, ...obj };
    out = buildParts("character", { design: src.design, hat: src.hat, expression: src.expression, skin: src.skin, hair: src.hair, seed: src.seed, colors: { ...(heroDefaults.colors ?? {}), ...colors } });
    out.scale = (src.scale ?? 1) * 0.92;
  } else if (obj.build && BUILDERS[obj.build]) {
    out = buildParts(obj.build, { ...(obj.params ?? {}), colors: { ...(obj.params?.colors ?? {}), ...colors }, seed: obj.seed ?? obj.params?.seed });
    out.scale = obj.scale ?? obj.params?.size ?? 1;
    if (obj.parts?.length) out.parts = [...out.parts, ...obj.parts];
  } else out = { kind: "custom", parts: obj.parts ?? [], colors: { ...DEFAULT_ROLES, ...colors }, init: {}, motion: [], scale: obj.scale ?? 1, meta: {} };
  return { parts: out.parts, colors: out.colors, init: out.init, motion: [...(out.motion ?? []), ...(obj.motion ?? [])], keys: obj.keys ?? [], scale: out.scale, meta: out.meta ?? {} };
}
