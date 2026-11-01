// Persistent chrome of the illustrated template: blueprint background, top HUD and handle footer.
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { REGIONS } from "../../lib/illustrated.mjs";
import type { HudItem, HudValue, ResolvedSpec, TimelineScene } from "../types";
import { MONO_FONT, fontStack } from "../fonts";
import { inkOn, isRemote, rgba, seeded } from "../util";
import { Grain } from "../components/Background";
import { col, makeInk } from "./kit";
import { type Look, ensureLookFonts, lookFor } from "./looks";
import { ArtBackground, ArtCutFx, artHudSkin } from "./artstyles";
import { DepthBackdrop } from "./depth";
import { FormatBackground, formatHudSkin, isFormatLook } from "./formats2d";

export const IllustratedBackground: React.FC<{ spec: ResolvedSpec }> = ({ spec }) => {
  ensureLookFonts();
  const look = lookFor(spec);
  const ink = makeInk(spec.theme.palette, look);
  return (
    <>
      {look.id !== "blueprint" ? <LookBackground spec={spec} look={look} /> : <BlueprintBackground spec={spec} />}
      <DepthBackdrop look={look} ink={ink} />
    </>
  );
};

const BlueprintBackground: React.FC<{ spec: ResolvedSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ink = makeInk(spec.theme.palette);
  const t = frame / fps;
  const cell = 54;
  const drift = (t * 6) % cell;
  const specks = Array.from({ length: 26 }, (_, i) => ({
    x: seeded(i * 3 + 1) * width,
    y: ((seeded(i * 7 + 2) * height - t * (8 + seeded(i) * 14)) % height + height) % height,
    r: 1.5 + seeded(i * 11) * 2.5,
    a: 0.15 + seeded(i * 13) * 0.35,
  }));
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 60% at 50% 42%, ${ink.bg2} 0%, ${ink.bg} 70%)` }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${rgba("#8FA6FF", 0.07)} 1px, transparent 1px), linear-gradient(90deg, ${rgba("#8FA6FF", 0.07)} 1px, transparent 1px)`,
          backgroundSize: `${cell}px ${cell}px`,
          backgroundPosition: `${drift}px ${drift * 0.6}px`,
        }}
      />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {specks.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={i % 3 === 0 ? ink.accent3 : "#FFFFFF"} opacity={s.a * (0.6 + 0.4 * Math.sin(t * 1.3 + i))} />
        ))}
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.6) 100%)" }} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

/** HUD values per scene: base items with every scene override up to that scene applied. */
export const hudStates = (spec: ResolvedSpec): HudItem[][] => {
  const base = spec.hud?.items ?? [];
  let cur = base.map((x) => ({ ...x }));
  return spec.scenes.map((s) => {
    cur = cur.map((it) => ({ ...it, ...(s.hud?.[it.id] ?? ({} as HudValue)) }));
    return cur;
  });
};

const barValue = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? 0));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n > 1 ? n / 100 : n));
};

export const Hud: React.FC<{ spec: ResolvedSpec; scenes: TimelineScene[]; transitionFrames: number }> = ({ spec, scenes, transitionFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = spec.hud?.items ?? [];
  if (!items.length) return null;
  const look = lookFor(spec);
  const ink = makeInk(spec.theme.palette, look);
  const skin = hudSkin(look, ink);
  const states = hudStates(spec);
  const switchAt = scenes.map((s, i) => (i === 0 ? 0 : s.from + Math.round(transitionFrames / 2)));
  let idx = 0;
  switchAt.forEach((f, i) => (frame >= f ? (idx = i) : null));
  const since = frame - switchAt[idx];
  const prev = states[Math.max(0, idx - 1)];
  const now = states[idx];
  const enter = spring({ frame, fps, config: { damping: 14 } });
  const r = REGIONS.hud;
  const bars = items.filter((i) => i.type === "bar").length;
  const others = items.length - bars;
  return (
    <div
      style={{
        position: "absolute",
        left: r.x,
        top: r.y,
        width: r.w,
        height: r.h,
        boxSizing: "border-box",
        ...skin.box,
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: "0 24px",
        opacity: enter,
        transform: `translateY(${(1 - enter) * -30}px)`,
      }}
    >
      {skin.live ? (
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", background: ink.accent, color: "#FFFFFF", fontFamily: look.display, fontWeight: 700, fontSize: 28, letterSpacing: 2 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#FFFFFF", opacity: 0.35 + 0.65 * Math.abs(Math.sin((frame / fps) * 4)) }} />
          {spec.language.toLowerCase().startsWith("es") ? "EN VIVO" : "LIVE"}
        </div>
      ) : null}
      {items.map((base, k) => {
        const it = now[k];
        const was = prev[k];
        const c = col(ink, it.color, [ink.accent, ink.accent3, ink.accent2][k % 3]);
        const changed = idx > 0 && JSON.stringify(it) !== JSON.stringify(was);
        const flick = changed ? spring({ frame: since, fps, config: { damping: 8, stiffness: 220 } }) : 1;
        if (base.type === "chip") {
          return (
            <div key={base.id} style={{ flex: "0 0 auto", padding: "10px 22px", borderRadius: skin.chipRadius, background: c, color: inkOn(c), fontFamily: skin.font, fontWeight: skin.weight, fontSize: skin.chipSize, textTransform: "uppercase", transform: `scale(${interpolate(flick, [0, 1], [0.7, 1])})`, whiteSpace: "nowrap" }}>
              {String(it.value ?? it.label ?? "")}
            </div>
          );
        }
        if (base.type === "label") {
          return (
            <div key={base.id} style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontFamily: skin.small, fontWeight: 700, fontSize: 20, color: ink.muted, textTransform: "uppercase" }}>{it.label}</div>
              <div style={{ fontFamily: skin.font, fontWeight: skin.weight, fontSize: 30, color: c, transform: `scale(${interpolate(flick, [0, 1], [0.7, 1])})`, transformOrigin: "0 50%" }}>{String(it.value ?? "")}</div>
            </div>
          );
        }
        const from = barValue(was.value);
        const to = barValue(it.value);
        const v = interpolate(since, [0, 0.7 * fps], [idx === 0 ? 0 : from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.22, 1, 0.36, 1) });
        const v0 = idx === 0 ? interpolate(frame, [0.3 * fps, 1.1 * fps], [0, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : v;
        return (
          <div key={base.id} style={{ flex: `1 1 ${others ? 0 : 1}px`, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: skin.small, fontWeight: 700, fontSize: 21, color: ink.muted, textTransform: "uppercase", letterSpacing: 1 }}>
              <span>{it.label ?? base.id}</span>
              <span style={{ color: c }}>{Math.round(v0 * 100)}%</span>
            </div>
            {skin.segments ? (
              <div style={{ height: 16, display: "flex", gap: 6 }}>
                {Array.from({ length: 10 }, (_, q) => (
                  <div key={q} style={{ flex: 1, borderRadius: 4, background: (q + 1) / 10 <= v0 + 0.001 ? c : rgba(ink.text, 0.14), transform: `scaleY(${(q + 1) / 10 <= v0 + 0.001 ? 1 : 0.6})` }} />
                ))}
              </div>
            ) : (
              <div style={{ height: 16, borderRadius: skin.barRadius, background: look.light ? rgba(ink.text, 0.1) : rgba("#FFFFFF", 0.08), overflow: "hidden" }}>
                <div style={{ width: `${v0 * 100}%`, height: "100%", borderRadius: skin.barRadius, background: look.id === "blueprint" ? `linear-gradient(90deg, ${rgba(c, 0.7)}, ${c})` : c, boxShadow: look.id === "blueprint" ? `0 0 16px ${rgba(c, 0.6)}` : undefined }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const Footer: React.FC<{ spec: ResolvedSpec; avatar: string | null }> = ({ spec, avatar }) => {
  const look = lookFor(spec);
  if (look.id === "broadcast") return <Ticker spec={spec} look={look} />;
  const handle = spec.brand?.handle;
  if (!handle) return null;
  const r = REGIONS.footer;
  const src = avatar ? (isRemote(avatar) ? avatar : staticFile(avatar)) : null;
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
      {src ? <Img src={src} style={{ width: 60, height: 60, borderRadius: 30, objectFit: "cover", border: "3px solid rgba(255,255,255,0.8)" }} /> : null}
      <div style={{ fontFamily: look.id === "blueprint" ? fontStack("Montserrat") : look.display, fontWeight: look.id === "blueprint" ? 800 : look.displayWeight, fontSize: 34, color: look.light ? spec.theme.palette.text : "#FFFFFF", textShadow: look.light ? "none" : "0 3px 10px rgba(0,0,0,0.6)" }}>{handle.startsWith("@") ? handle : `@${handle}`}</div>
    </div>
  );
};

/** Full-frame soft light pulse on every scene cut (2-3 frames), synced with the whoosh peak. */
export const CutFlash: React.FC<{ scenes: TimelineScene[]; transitionFrames: number; spec?: ResolvedSpec }> = ({ scenes, transitionFrames, spec }) => {
  const frame = useCurrentFrame();
  const look = spec ? lookFor(spec) : null;
  if (look && look.id !== "blueprint") return <LookCutFx scenes={scenes} transitionFrames={transitionFrames} look={look} />;
  let a = 0;
  scenes.forEach((s, i) => {
    if (i === 0) return;
    const cut = s.from + Math.round(transitionFrames / 2);
    const d = frame - cut;
    if (d >= 0 && d < 4) a = Math.max(a, [0.48, 0.28, 0.12, 0.04][d]);
  });
  if (!a) return null;
  return <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(200,220,255,1) 0%, rgba(140,170,255,0.55) 60%, rgba(120,150,255,0.3) 100%)", opacity: a, mixBlendMode: "screen" }} />;
};

/* ---------------- look chrome ---------------- */

type Skin = { box: React.CSSProperties; font: string; small: string; weight: number; chipSize: number; chipRadius: number; barRadius: number; live: boolean; segments: boolean };

/** HUD styling of a look. */
const hudSkin = (look: Look, ink: ReturnType<typeof makeInk>): Skin => {
  const base: Skin = {
    box: { borderRadius: 22, border: `2px solid ${rgba(ink.accent3, 0.22)}`, background: rgba("#0B1020", 0.7), boxShadow: `0 0 30px ${rgba(ink.accent3, 0.08)}` },
    font: fontStack("Montserrat"),
    small: MONO_FONT,
    weight: 900,
    chipSize: 30,
    chipRadius: 12,
    barRadius: 8,
    live: false,
    segments: false,
  };
  switch (look.id) {
    case "whiteboard":
      return { ...base, box: { borderRadius: 8, border: `3px solid ${ink.text}`, background: "rgba(255,255,255,0.7)", transform: "rotate(-0.6deg)" }, font: look.display, small: look.body, weight: 400, chipRadius: 6, barRadius: 2 };
    case "broadcast":
      return { ...base, box: { borderRadius: 0, border: "none", borderBottom: `4px solid ${ink.accent}`, background: "rgba(10,10,12,0.92)", padding: "0 18px 0 0" }, font: look.display, small: look.display, weight: 700, chipRadius: 0, barRadius: 0, live: true };
    case "editorial-chart":
      return { ...base, box: { borderRadius: 0, border: "none", borderTop: `2px solid ${ink.text}`, borderBottom: `1px solid ${ink.line}`, background: "transparent" }, font: look.display, small: look.body, weight: 400, chipRadius: 2, barRadius: 0 };
    case "editor-window":
      return { ...base, box: { borderRadius: 10, border: `2px solid ${ink.line}`, background: ink.codeBar }, font: MONO_FONT, small: MONO_FONT, weight: 800, chipSize: 26, chipRadius: 6, barRadius: 2, segments: true };
    case "rank-numbers":
      return { ...base, box: { borderRadius: 46, border: "4px solid rgba(255,255,255,0.9)", background: rgba(ink.bg, 0.75), boxShadow: `0 8px 0 ${ink.drop}` }, font: look.display, small: fontStack("Montserrat"), weight: 400, chipSize: 36, chipRadius: 30, barRadius: 8, segments: true };
    default:
      return { ...base, ...(formatHudSkin(look, ink) ?? artHudSkin(look, ink) ?? {}) };
  }
};

const noise = (freq: number, op: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${op} 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`)}")`;

const LookBackground: React.FC<{ spec: ResolvedSpec; look: Look }> = ({ spec, look }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ink = makeInk(spec.theme.palette, look);
  const t = frame / fps;
  switch (look.id) {
    case "whiteboard": {
      // White board: warm paper, faint ghosts of erased marker, a soft frame edge. No movement except the grain.
      const ghosts = Array.from({ length: 7 }, (_, i) => ({ x: seeded(i * 5 + 3) * width, y: 200 + seeded(i * 9 + 1) * (height - 400), w: 160 + seeded(i * 4) * 260, r: -20 + seeded(i * 2) * 40 }));
      return (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 100% 70% at 50% 45%, ${ink.bg} 0%, ${ink.bg2} 100%)` }}>
          <AbsoluteFill style={{ backgroundImage: noise(0.8, 0.09) }} />
          <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
            {ghosts.map((g, i) => (
              <path key={i} d={`M ${g.x} ${g.y} q ${g.w / 3} ${-30 + (i % 3) * 20} ${g.w / 1.5} ${10} t ${g.w / 3} ${-12}`} stroke={i % 2 ? "#9AA3B5" : "#C9A9A2"} strokeWidth={14} strokeLinecap="round" fill="none" opacity={0.1} transform={`rotate(${g.r} ${g.x} ${g.y})`} />
            ))}
          </svg>
          <AbsoluteFill style={{ boxShadow: "inset 0 0 0 22px #D9D4C8, inset 0 0 90px rgba(80,70,50,0.18)" }} />
          <Grain opacity={0.035} />
        </AbsoluteFill>
      );
    }
    case "broadcast": {
      // Studio dark with a slow red light sweep, broadcast lines and a moving world-grid.
      const sweep = ((t * 0.18) % 1) * 160 - 30;
      return (
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${ink.bg} 0%, ${ink.bg2} 100%)` }}>
          <AbsoluteFill style={{ background: `linear-gradient(115deg, transparent ${sweep - 20}%, ${rgba(ink.accent, 0.22)} ${sweep}%, transparent ${sweep + 20}%)` }} />
          <AbsoluteFill style={{ backgroundImage: `radial-gradient(${rgba("#FFFFFF", 0.09)} 1.5px, transparent 1.6px)`, backgroundSize: "26px 26px", backgroundPosition: `${(t * 10) % 26}px 0px`, maskImage: "radial-gradient(ellipse 70% 40% at 50% 55%, black 0%, transparent 100%)" }} />
          <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(0deg, ${rgba("#FFFFFF", 0.03)} 0 2px, transparent 2px 5px)` }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 14, background: ink.accent }} />
          <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 100%)" }} />
          <Grain opacity={0.06} />
        </AbsoluteFill>
      );
    }
    case "editorial-chart": {
      // Newspaper salmon page: horizontal chart rules, a masthead rule, nothing that moves.
      return (
        <AbsoluteFill style={{ background: ink.bg }}>
          <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(0deg, ${rgba(ink.text, 0.06)} 0 1px, transparent 1px 64px)`, backgroundPosition: "0 30px" }} />
          <div style={{ position: "absolute", left: 90, right: 90, top: 196, height: 3, background: ink.text, opacity: 0.85 }} />
          <div style={{ position: "absolute", left: 90, right: 90, top: 203, height: 1, background: ink.text, opacity: 0.5 }} />
          <AbsoluteFill style={{ backgroundImage: noise(0.65, 0.05) }} />
        </AbsoluteFill>
      );
    }
    case "editor-window": {
      // Editor at night: a faint line-number gutter, dot grid and CRT scanlines that roll slowly.
      const roll = (t * 40) % 6;
      return (
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${ink.bg} 0%, ${ink.bg2} 100%)` }}>
          <AbsoluteFill style={{ backgroundImage: `radial-gradient(${rgba(ink.accent3, 0.1)} 1.2px, transparent 1.3px)`, backgroundSize: "36px 36px" }} />
          <div style={{ position: "absolute", left: 18, top: 0, bottom: 0, width: 50, fontFamily: MONO_FONT, fontWeight: 500, fontSize: 20, lineHeight: "48px", color: rgba(ink.muted, 0.22), textAlign: "right", whiteSpace: "pre" }}>
            {Array.from({ length: 40 }, (_, i) => String(i + 1)).join("\n")}
          </div>
          <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 2px, transparent 2px 6px)`, backgroundPosition: `0 ${roll}px` }} />
          <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
        </AbsoluteFill>
      );
    }
    case "rank-numbers": {
      // Party: rotating sunburst rays behind the stage and drifting confetti.
      const conf = Array.from({ length: 22 }, (_, i) => ({ x: seeded(i * 3 + 1) * width, y: ((seeded(i * 7 + 2) * height + t * (60 + seeded(i) * 80)) % height), r: seeded(i * 5) * 360 + t * 90 * (i % 2 ? 1 : -1), c: [ink.accent, ink.accent2, ink.accent3][i % 3] }));
      return (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 60% at 50% 55%, ${ink.bg2} 0%, ${ink.bg} 75%)` }}>
          <AbsoluteFill style={{ background: `repeating-conic-gradient(from ${t * 8}deg at 50% 62%, ${rgba("#FFFFFF", 0.06)} 0deg 9deg, transparent 9deg 18deg)`, maskImage: "radial-gradient(circle at 50% 62%, black 0%, transparent 70%)" }} />
          <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
            {conf.map((c, i) => (
              <rect key={i} x={c.x} y={c.y} width={14} height={26} rx={3} fill={c.c} opacity={0.45} transform={`rotate(${c.r} ${c.x + 7} ${c.y + 13})`} />
            ))}
          </svg>
          <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(10,0,20,0.6) 100%)" }} />
        </AbsoluteFill>
      );
    }
    default:
      if (isFormatLook(look.id)) return <FormatBackground look={look} ink={ink} />;
      return <ArtBackground spec={spec} look={look} ink={ink} />;
  }
};

/** Breaking-news ticker in the footer band: a red label and every scene headline scrolling right to left. */
const Ticker: React.FC<{ spec: ResolvedSpec; look: Look }> = ({ spec, look }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const ink = makeInk(spec.theme.palette, look);
  const r = REGIONS.footer;
  // Sits at the bottom of the footer band, clear of two-line captions above it.
  const H = 48;
  const top = 1500 - H; // bottom edge of the safe zone
  const heads = spec.scenes.map((s) => s.title?.main ?? s.onScreenText ?? "").filter(Boolean);
  const handle = spec.brand?.handle ? (spec.brand.handle.startsWith("@") ? spec.brand.handle : `@${spec.brand.handle}`) : "";
  const text = [...heads, handle].filter(Boolean).join("   ///   ").toUpperCase();
  const label = spec.scenes[0]?.title?.kicker ?? (spec.language.toLowerCase().startsWith("es") ? "ULTIMA HORA" : "BREAKING");
  const enter = spring({ frame, fps, config: { damping: 200 } });
  const LABEL_W = 240;
  const speed = 140; // px per second
  // One continuous crawl for the whole video (no loop seam): repeat the text until it outlasts the duration.
  const approx = Math.max(400, [...text].length * 15);
  const copies = Math.ceil(((durationInFrames / fps) * speed + r.w) / approx) + 1;
  const x = r.w - LABEL_W - (frame / fps) * speed;
  return (
    <div style={{ position: "absolute", left: r.x, top, width: r.w, height: H, display: "flex", overflow: "hidden", background: "#FFFFFF", transform: `translateY(${(1 - enter) * 120}px)` }}>
      <div style={{ flex: `0 0 ${LABEL_W}px`, zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: ink.accent, color: "#FFFFFF", fontFamily: look.display, fontWeight: 700, fontSize: 26, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden" }}>{label}</div>
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, height: H, left: x, display: "flex", alignItems: "center", whiteSpace: "nowrap", fontFamily: look.display, fontWeight: 500, fontSize: 27, color: "#0A0A0C" }}>
          {Array.from({ length: copies }, (_, k) => (
            <span key={k} style={{ paddingRight: 60 }}>
              {text}   ///
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/** Cut effects on top of the look transitions (frame offsets from the cut midpoint). */
const LookCutFx: React.FC<{ scenes: TimelineScene[]; transitionFrames: number; look: Look }> = ({ scenes, transitionFrames, look }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  let d = -99;
  let cutIndex = 0;
  scenes.forEach((s, i) => {
    if (i === 0) return;
    const cut = s.from + Math.round(transitionFrames / 2);
    if (frame - cut >= -2 && frame - cut < 6) {
      d = frame - cut;
      cutIndex = i;
    }
  });
  if (d === -99) return null;
  if (look.id === "broadcast") {
    // white flash on the cut + a few displaced RGB slices
    const flash = [0, 0, 0.85, 0.45, 0.15, 0, 0, 0][d + 2] ?? 0;
    const slices = d >= -2 && d <= 2 ? Array.from({ length: 5 }, (_, k) => ({ y: seeded(k * 13 + d * 7 + frame) * height, h: 10 + seeded(k + frame) * 46, x: (seeded(k * 3 + frame) - 0.5) * 120, c: k % 2 ? "rgba(255,0,40,0.55)" : "rgba(0,220,255,0.45)" })) : [];
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {slices.map((s, k) => (
          <div key={k} style={{ position: "absolute", left: s.x, top: s.y, width, height: s.h, background: s.c, mixBlendMode: "screen" }} />
        ))}
        {flash ? <AbsoluteFill style={{ background: "#FFFFFF", opacity: flash }} /> : null}
      </AbsoluteFill>
    );
  }
  if (look.id === "rank-numbers") {
    // colored burst from the center on the cut
    const a = [0, 0, 0.55, 0.3, 0.12, 0.04, 0, 0][d + 2] ?? 0;
    if (!a) return null;
    return <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 55%, rgba(255,230,0,0.95) 0%, rgba(255,61,127,0.5) 35%, rgba(0,0,0,0) 70%)`, opacity: a, mixBlendMode: "screen" }} />;
  }
  if (look.id === "editor-window") {
    // a bright scan line sweeping down through the CRT cut
    if (d < -2 || d > 3) return null;
    const y = interpolate(d, [-2, 3], [height * 0.2, height * 0.8]);
    return <div style={{ position: "absolute", left: 0, top: y, width, height: 6, background: "rgba(139,233,253,0.8)", boxShadow: "0 0 30px rgba(139,233,253,0.9)" }} />;
  }
  // art-style looks: comic burst, chalk dust, riso plate flash
  return <ArtCutFx look={look} d={d} seed={cutIndex} />;
};
