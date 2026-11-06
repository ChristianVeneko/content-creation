// Beat -> sound mapping for pixel-world. Input is the RESOLVED plan (`data` of resolvePayload: worlds with their
// beats already bound to word starts), so every cue lands on the start of the word its beat is bound to.
// Output: [{ at, voice, pitch, gainDb }] sorted by time. `voice` names a voice of audio-sfx.mjs; `gainDb` is a level
// offset against the SFX reference (the mixer puts the reference under the voice).

const UP3 = [1, 1.26, 1.5];
const FOOTSTEP_GAP = 0.22;
const WALK_SECONDS = 0.9; // the runtime derives the walk length from distances the plan does not carry

/** Voice-level offsets (dB): noise-heavy voices are tamed, thumps and coins pushed. */
export const VOICE_LEVEL = { whoosh: -5, whooshUp: -5, whooshDown: -5, poof: -6, burst: -2, hit: 1, stamp: 1, thud: 0, tick: -5, step: -9, blip: -3, pop: -3, ping: -2, coin: -1, transition: -4, select: -3, jump: -2, rise: -3, fall: -3, powerup: -2, error: -3, flip: -4, slash: -2, buzz: -4 };

const EMOTE_CUE = { heart: ["ping", 1], star: ["ping", 1.19], idea: ["ping", 1.33], note: ["ping", 0.89], check: ["ping", 1.5], coin: ["coin", 1], cross: ["error", 1], "!": ["blip", 1.3], "?": ["blip", 0.85], dots: ["tick", 0.8], zzz: ["tick", 0.6] };
const TRANSITION_CUE = { slide: "whoosh", tiles: "transition", iris: "whooshDown", down: "fall" };

/** Cues of one beat (without the `at` offsets beyond the beat itself): [[dt, voice, pitch, extraDb]]. */
function beatCues(b) {
  switch (b.do) {
    case "fill": return UP3.map((p, i) => [i * 0.07, "blip", p, i === 2 ? 1 : 0]);
    case "open": return [[0, "flip", 1, 0]];
    case "close": return [[0, "thud", 1.4, -6]];
    case "light": return [[0, "ping", 1, 0]];
    case "dim": return [[0, "tick", 0.7, 0]];
    case "burst": return [[0, "burst", 1, 0]];
    case "recolor": return [[0, "pop", 1.1, 0]];
    case "coins": return Array.from({ length: Math.min(3, b.count ?? 2) }, (_, i) => [i * 0.09, "coin", 1 + i * 0.12, 0]);
    case "chop": return [[0, "hit", 1.1, 0]];
    case "stamp": return [[0, "stamp", 1, 0]];
    case "pulse": return [[0, "tick", 1, 0]];
    case "hero-stamp": return [[0, "stamp", 1, 0], [0.06, "coin", 1, 0]];
    case "x2": return [[0, "coin", 1, 0], [0.1, "coin", 1.26, 0]];
    case "shake": return [[0, "thud", 1, 0]];
    case "radial-burst": return [[0, "burst", 1.2, -2]];
    case "emote": { const [v, p] = EMOTE_CUE[b.symbol] ?? ["blip", 1]; return [[0, v, p, 0]]; }
    case "label": return [[0, "pop", 1, 0]];
    case "pan": return [[0, "whoosh", 1, 0]];
    case "push": return [[0, "whooshUp", 1, 0]];
    case "point": return [[0, "tick", 1.3, 0]];
    case "react": { const [v, p] = EMOTE_CUE[b.symbol ?? "!"] ?? ["blip", 1.3]; return [[0, v, p, 0]]; }
    case "jump": return [[0, "jump", 1, 0], [0.34, "fall", 1.6, -4]];
    case "cheer": return [[0, "powerup", 1, 0]];
    case "walk": { const n = Math.round(WALK_SECONDS / FOOTSTEP_GAP); return Array.from({ length: n }, (_, i) => [0.05 + i * FOOTSTEP_GAP, "step", i % 2 ? 0.9 : 1.05, 0]); }
    case "follow": return [[0, "select", 1, 0]];
    default: return []; // flash and anything unknown stay silent
  }
}

/**
 * @param {{ worlds: object[], hud?: object[], brand?: {followAt:number|null}|null, dur: number }} data resolved plan
 * @returns {Array<{at:number, voice:string, pitch:number, gainDb:number}>}
 */
export function cuesFromPlan(data) {
  const cues = [];
  const add = (at, voice, pitch, extraDb = 0) => {
    if (!Number.isFinite(at) || at < 0 || at > data.dur - 0.02) return;
    cues.push({ at: Math.round(at * 1000) / 1000, voice, pitch: Math.round(pitch * 1000) / 1000, gainDb: (VOICE_LEVEL[voice] ?? 0) + extraDb });
  };
  add(0.03, "select", 1, 0);
  (data.worlds ?? []).forEach((w, wi) => {
    if (wi > 0) {
      add(w.t0 - 0.38, TRANSITION_CUE[w.tr] ?? "whoosh", 1, 0);
      add(w.t0 + 0.02, "blip", 0.8, -4);
    }
    for (const b of w.beats ?? []) {
      if (b.ambient || b.derived) continue; // ambient reactions stay silent
      for (const [dt, voice, pitch, extra] of beatCues(b)) add(b.t + dt, voice, pitch, extra);
    }
  });
  for (const h of data.hud ?? []) add(h.t, h.hud === "progress" ? "blip" : "ping", h.hud === "progress" ? 0.9 + 0.6 * Math.min(1, Math.max(0, h.value ?? 0)) : 1.2, -1);
  if (data.brand?.followAt != null) add(data.brand.followAt, "select", 1.2, 0);
  cues.sort((a, b) => a.at - b.at || a.voice.localeCompare(b.voice));
  // drop exact repeats of the same voice and pitch within 50 ms
  const out = [];
  for (const c of cues) if (!out.some((o) => o.voice === c.voice && o.pitch === c.pitch && Math.abs(o.at - c.at) < 0.05)) out.push(c);
  return out;
}
