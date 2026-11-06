// The 2D layer of the Blender route as one ASS subtitle file burned in by ffmpeg (libass): word-synced captions in
// the spec's caption colors and band, the scene headline, and object labels that follow their 3D anchors (projected with
// the same pure camera math as the Remotion labels). Pure: returns the ASS text.
import { resolveCaptionLook, readableOn } from "./captions.mjs";
import { projectPoint } from "./scene3d.mjs";

const hex6 = (h) => `#${String(h).replace("#", "").slice(0, 6).toUpperCase().padStart(6, "0")}`;
/** "#RRGGBB" (+ alpha 0..255, 0 = opaque) to the ASS &HAABBGGRR color. */
export const assColor = (h, a = 0) => {
  const c = hex6(h).slice(1);
  return `&H${a.toString(16).padStart(2, "0").toUpperCase()}${c.slice(4, 6)}${c.slice(2, 4)}${c.slice(0, 2)}`.toUpperCase();
};
const clock = (ms) => {
  const cs = Math.max(0, Math.round(ms / 10));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
};
const clean = (t) => String(t).replace(/[{}\\]/g, "").replace(/\n/g, " ");
const BOXED = new Set(["boxed", "pills", "chips"]);
const SHOUT = new Set(["hormozi", "punch", "karaoke", "neon"]);
const FONT = "Montserrat ExtraBold";
const BLACK = "Montserrat Black";

/**
 * Build the ASS file.
 * @param {{spec: object, timeline: object, captionPages: object[], job: object, fps?: number}} a
 *   job: the blenderJob (object tracks and camera per frame give the label anchors)
 */
export function buildAss({ spec, timeline, captionPages, job }) {
  const fps = spec.format.fps;
  const pal = spec.theme.palette;
  const look = resolveCaptionLook(spec, { top: 1130, height: 260 });
  const c = look.colors;
  const style = look.style;
  const boxed = BOXED.has(style);
  const size = Math.round(84 * look.scale);
  const cy = Math.round(look.band.top + look.band.height / 2);
  const upper = look.uppercase ?? SHOUT.has(style);
  const lightBg = (pal.bg.map((b) => b).reduce((a, b) => a + parseInt(b.slice(1, 3), 16), 0) / pal.bg.length) > 140;
  const labelBox = lightBg ? job.look.dark : job.look.light;
  const labelInk = readableOn(labelBox);
  const styles = [
    `Style: Cap,${FONT},${size},${assColor(c.text)},${assColor(c.highlight)},${assColor(boxed ? c.box : c.outline)},${assColor(c.outline, 96)},0,0,0,0,100,100,0,0,${boxed ? 3 : 1},${boxed ? 14 : 9},${boxed ? 0 : 3},5,90,90,0,1`,
    `Style: Head,${BLACK},96,${assColor(pal.text)},${assColor(pal.accent)},${assColor(c.outline)},${assColor(c.outline, 96)},0,0,0,0,100,100,0,0,1,0,2,8,90,90,0,1`,
    `Style: Kick,${FONT},44,${assColor(pal.accent)},${assColor(pal.accent)},${assColor(c.outline)},${assColor(c.outline, 96)},0,0,0,0,100,100,6,0,1,0,2,8,90,90,0,1`,
    `Style: Label,${FONT},38,${assColor(labelInk)},${assColor(labelInk)},${assColor(labelBox)},${assColor(labelBox, 80)},0,0,0,0,100,100,1,0,3,14,0,5,40,40,0,1`,
    `Style: Big,${BLACK},150,${assColor(pal.accent)},${assColor(pal.accent)},${assColor(c.outline)},${assColor(c.outline, 96)},0,0,0,0,100,100,-3,0,1,6,0,5,40,40,0,1`,
  ];
  const events = [];
  const ev = (start, end, st, text) => events.push(`Dialogue: 0,${clock(start)},${clock(end)},${st},,0,0,0,,${text}`);

  // ---- captions: one event per spoken word, the active word in the highlight color
  if (spec.captions.enabled) {
    for (const page of captionPages) {
      const words = page.words;
      words.forEach((w, i) => {
        const start = w.startMs;
        const end = i + 1 < words.length ? words[i + 1].startMs : page.endMs;
        const line = words
          .map((x, j) => {
            const t = clean(x.text.trim());
            const shown = upper ? t.toUpperCase() : t;
            return j === i ? `{\\c${assColor(c.highlight)}}${shown}{\\c${assColor(c.text)}}` : shown;
          })
          .join(" ");
        ev(start, Math.max(end, start + 80), "Cap", `{\\an5\\pos(540,${cy})}${line}`);
      });
    }
  }

  // ---- headlines and object labels, per scene
  spec.scenes.forEach((s, i) => {
    const js = job.scenes[i];
    const t0 = (js.startFrame / fps) * 1000;
    const t1 = ((js.startFrame + js.frames) / fps) * 1000;
    const head = s.title?.main ?? s.onScreenText;
    if (head) {
      if (s.title?.kicker) ev(t0 + 120, t1, "Kick", `{\\an8\\pos(540,215)\\fad(160,0)}${clean(s.title.kicker).toUpperCase()}`);
      ev(t0 + 120, t1, "Head", `{\\an8\\pos(540,${s.title?.kicker ? 275 : 235})\\fad(160,0)}${clean(head)}`);
    }
    for (const o of js.objects) {
      if (!o.label && !(o.kind === "stat" && o.value !== null)) continue;
      const first = (o.enter + (o.kind === "stat" ? 0.2 : 0.25)) * 1000;
      for (let f = Math.ceil((first / 1000) * fps); f < js.frames; f += 2) {
        const tr = o.object[Math.min(f, o.object.length - 1)];
        if (tr[10] < 0.5) continue;
        const cam = js.camera[f];
        const camState = { ortho: js.ortho, fov: cam[6], viewH: cam[6], position: cam.slice(0, 3), target: cam.slice(3, 6) };
        const top = [tr[0], tr[1] + o.h + (o.kind === "stat" ? 0.15 : 0.28), tr[2]];
        const a = projectPoint(camState, top, spec.format.width, spec.format.height);
        const x = Math.round(Math.max(150, Math.min(930, a.x)));
        const start = t0 + (f / fps) * 1000;
        const end = Math.min(t1, t0 + ((f + 2) / fps) * 1000);
        const fade = f === Math.ceil((first / 1000) * fps) ? "\\fad(180,0)" : "";
        const clampY = (y) => Math.round(Math.max(600, Math.min(1236, y)));
        if (o.kind === "stat" && o.value !== null) {
          ev(start, end, "Big", `{\\an5\\pos(${x},${clampY(a.y - 80)})${fade}}${clean(o.value)}`);
          if (o.label) ev(start, end, "Label", `{\\an5\\pos(${x},${clampY(a.y + 40)})${fade}}${clean(o.label).toUpperCase()}`);
        } else ev(start, end, "Label", `{\\an5\\pos(${x},${clampY(a.y - 30)})${fade}}${clean(o.label).toUpperCase()}`);
      }
    }
  });

  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${spec.format.width}`,
    `PlayResY: ${spec.format.height}`,
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
    ...styles,
    "",
    "[Events]",
    "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
    ...events,
    "",
  ].join("\n");
}
