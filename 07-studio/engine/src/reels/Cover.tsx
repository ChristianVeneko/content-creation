// Cover (portada) 1080x1920 for Instagram and TikTok, and the crop check: full 9:16, the 3:4 crop the
// Instagram profile grid uses (y 240-1680) and the small grid thumbnail. Configured in spec.reels.cover.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, ESTILO, SUAVE } from "./motor/actual";
import { F, alfa } from "./motor/estilos";
import { Fondo } from "./motor/Fondo";
import { Baldosa, Destello } from "./piezas/basicas";
import { useReel, type ReelsRenderProps } from "./ReelsVideo";
import type { ReelCover } from "./tipos";

/** true if the #RRGGBB color is dark. */
const esOscuro = (hex: string) => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
};

const conAcento = (t: string) => t.split(/(\*[^*]+\*)/g).map((s, k) => (s.startsWith("*") ? <span key={k} style={{ color: C.acento }}>{s.slice(1, -1)}</span> : <span key={k}>{s}</span>));

export const Portada: React.FC<{ p: ReelCover }> = ({ p }) => {
  const lineas = p.lineas.slice(0, 4);
  const imagenes = (p.imagenes ?? []).slice(0, 4);
  const largo = Math.max(1, ...lineas.map((l) => l.replace(/\*/g, "").length));
  const tam = Math.min(250, Math.max(84, (940 / (largo * 0.6)) * ESTILO.escalaTitulo));
  // "oscura" only makes sense on light styles: a dark style keeps its own background
  const oscura = !!p.oscura && !esOscuro(C.fondo);
  const colorTexto = oscura ? C.oscuroTexto : C.texto;
  const sombra = SUAVE ? `0 8px 0 ${alfa("#000000", 0.08)}` : `5px 6px 0 ${C.borde}`;
  return (
    <AbsoluteFill style={{ background: oscura ? C.oscuro : C.fondo }}>
      {!oscura && <Fondo />}
      {p.etiqueta && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 262, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, background: oscura ? alfa(C.oscuroTexto, 0.12) : C.oscuro, color: C.oscuroTexto, borderRadius: 40, padding: "12px 30px 10px 22px", fontFamily: F.titulo, fontSize: 34, letterSpacing: 3 }}>
            <Destello size={34} />
            {p.etiqueta}
          </div>
        </div>
      )}
      <div style={{ position: "absolute", left: 30, right: 30, top: p.etiqueta ? 360 : 300, textAlign: "center", lineHeight: 1.02, fontFamily: F.titulo, color: colorTexto, textShadow: sombra }}>
        {lineas.map((l, k) => (
          <div key={k} style={{ fontSize: k === 0 ? tam : tam * 0.62, whiteSpace: "nowrap" }}>
            {conAcento(l)}
          </div>
        ))}
      </div>
      {imagenes.map((s, k) => {
        const n = imagenes.length;
        const pos = (k - (n - 1) / 2) / Math.max(1, (n - 1) / 2);
        return (
          <div key={k} style={{ position: "absolute", left: 540 + pos * 300 - 165, top: 1000 + Math.abs(pos) * 50, width: 330, height: 220, borderRadius: 24, overflow: "hidden", border: `6px solid ${C.tarjeta}`, transform: `rotate(${pos * 13}deg)`, boxShadow: "0 24px 50px rgba(0,0,0,0.35)", zIndex: Math.round(10 - Math.abs(pos) * 5) }}>
            <Img src={staticFile(s)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        );
      })}
      {imagenes.length === 0 && p.icono && (
        <div style={{ position: "absolute", left: 540 - 150, top: 1060 }}>
          <Baldosa size={300} icono={p.icono} brillo={0.5} />
        </div>
      )}
      {p.pegatina && (
        <div style={{ position: "absolute", left: 620, top: 1300, transform: "rotate(-7deg)", zIndex: 20 }}>
          <div style={{ background: C.acento, color: C.acentoTexto, fontFamily: F.titulo, fontSize: 42, padding: "14px 26px 12px", borderRadius: 22, boxShadow: "0 16px 30px rgba(0,0,0,0.25)", whiteSpace: "nowrap" }}>{p.pegatina}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** cover.jpg: the cover alone. */
export const ReelsCover: React.FC<ReelsRenderProps> = (props) => {
  const plan = useReel(props);
  return <Portada p={plan.cover} />;
};

export const COVER_CHECK = { width: 1310, height: 1010 };

/** cover-check.png: full 9:16 cover, the 3:4 profile-grid crop and the small grid thumbnail, side by side. */
export const ReelsCoverCheck: React.FC<ReelsRenderProps> = (props) => {
  const plan = useReel(props);
  const label: React.CSSProperties = { position: "absolute", top: 8, color: "#FFD400", font: "bold 26px sans-serif" };
  return (
    <AbsoluteFill style={{ background: "#161616" }}>
      <div style={{ ...label, left: 10 }}>9:16 full</div>
      <div style={{ position: "absolute", left: 0, top: 44, width: 540, height: 960, overflow: "hidden" }}>
        <div style={{ width: 1080, height: 1920, transform: "scale(0.5)", transformOrigin: "0 0" }}>
          <Portada p={plan.cover} />
        </div>
      </div>
      <div style={{ ...label, left: 580 }}>3:4 profile crop</div>
      <div style={{ position: "absolute", left: 570, top: 44, width: 540, height: 720, overflow: "hidden" }}>
        <div style={{ width: 1080, height: 1920, transform: "scale(0.5) translateY(-240px)", transformOrigin: "0 0" }}>
          <Portada p={plan.cover} />
        </div>
      </div>
      <div style={{ ...label, left: 1140 }}>grid</div>
      <div style={{ position: "absolute", left: 1140, top: 44, width: 150, height: 200, overflow: "hidden" }}>
        <div style={{ width: 1080, height: 1920, transform: `scale(${150 / 1080}) translateY(-240px)`, transformOrigin: "0 0" }}>
          <Portada p={plan.cover} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
