// Object library of the 3D templates. Most kinds are built from primitives; `model`, `car` and `character` load local
// CC0 GLBs (a procedural stand-in renders when the file is not staged). Every object stands on y = 0, has a ~1.4 x 1.4
// footprint and the nominal height of OBJECT_SPECS in lib/scene3d.mjs. Animation (spins, blinking LEDs, growing bars,
// flames, character clips) is driven by `t` (seconds, from useCurrentFrame): the character mixer is set to t, never
// advanced by a clock.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { staticFile } from "remotion";
import { CHARACTER_ANIMS, modelOf } from "../../lib/scene3d.mjs";
import type { Object3D } from "../types";
import { IconMesh, Part, RBox, mixHex, useKit3D } from "./kit";
import { radialTexture } from "./sets";

export type ObjProps = {
  o: Object3D;
  /** body color (resolved) */
  color: string;
  /** contrast accent (resolved) */
  accent: string;
  /** seconds into the scene */
  t: number;
  /** entrance time (seconds) */
  enter: number;
  /** chart bar entrance times */
  items: number[];
  models: Record<string, string>;
  /** index of the object in its scene (default car / character model) */
  index?: number;
};

const PI = Math.PI;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const num = (v: unknown, d = 0) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : d;
};

/** Screen glyph: an icon on a screen face, else three UI bars. */
const ScreenUI: React.FC<{ w: number; h: number; z: number; icon?: string; accent: string; y?: number }> = ({ w, h, z, icon, accent, y = 0 }) =>
  icon ? (
    <IconMesh name={icon} size={Math.min(w, h) * 0.62} position={[0, y, z]} finish="glow" color={accent} />
  ) : (
    <group position={[0, y, z]}>
      <Part position={[0, h * 0.22, 0]} finish="glow" color={accent} outline={false}>
        <planeGeometry args={[w * 0.6, h * 0.12]} />
      </Part>
      <Part position={[-w * 0.08, 0, 0]} finish="glow" color={mixHex(accent, "#FFFFFF", 0.6)} outline={false}>
        <planeGeometry args={[w * 0.44, h * 0.06]} />
      </Part>
      <Part position={[-w * 0.04, -h * 0.14, 0]} finish="glow" color={mixHex(accent, "#FFFFFF", 0.6)} outline={false}>
        <planeGeometry args={[w * 0.52, h * 0.06]} />
      </Part>
    </group>
  );

const Cube: React.FC<ObjProps> = ({ o, color, accent }) => (
  <group>
    <RBox args={[1.3, 1.2, 1.3]} radius={0.2} position={[0, 0.6, 0]} color={color} />
    {o.icon ? <IconMesh name={o.icon} size={0.78} depth={0.08} position={[0, 0.6, 0.651]} finish="light" /> : <RBox args={[0.5, 0.08, 0.5]} radius={0.03} position={[0, 1.23, 0]} finish="body" color={accent} />}
  </group>
);

const Sphere: React.FC<ObjProps> = ({ color }) => (
  <Part position={[0, 0.65, 0]} color={color}>
    <sphereGeometry args={[0.65, 48, 32]} />
  </Part>
);

const Phone: React.FC<ObjProps> = ({ o, color, accent }) => (
  <group position={[0, 0.95, 0]} rotation={[0, -0.18, 0]}>
    <RBox args={[0.98, 1.9, 0.14]} radius={0.14} color={color} />
    <RBox args={[0.86, 1.74, 0.02]} radius={0.1} position={[0, 0, 0.065]} finish="screen" />
    <Part position={[0, 0.78, 0.078]} finish="dark" outline={false}>
      <boxGeometry args={[0.24, 0.05, 0.01]} />
    </Part>
    <ScreenUI w={0.86} h={1.74} z={0.078} icon={o.icon} accent={accent} />
  </group>
);

const Laptop: React.FC<ObjProps> = ({ o, color, accent }) => (
  <group rotation={[0, 0.12, 0]}>
    <RBox args={[1.7, 0.08, 1.15]} radius={0.04} position={[0, 0.04, 0.1]} color={color} />
    <Part position={[0, 0.082, 0.05]} rotation={[-PI / 2, 0, 0]} finish="dark" outline={false}>
      <planeGeometry args={[1.45, 0.62]} />
    </Part>
    <group position={[0, 0.08, -0.47]} rotation={[-0.22, 0, 0]}>
      <RBox args={[1.7, 1.1, 0.06]} radius={0.04} position={[0, 0.55, 0]} color={color} />
      <RBox args={[1.56, 0.96, 0.01]} radius={0.02} position={[0, 0.55, 0.031]} finish="screen" outline={false} />
      <ScreenUI w={1.56} h={0.96} z={0.04} icon={o.icon} accent={accent} y={0.55} />
    </group>
  </group>
);

const Monitor: React.FC<ObjProps> = ({ o, color, accent }) => (
  <group>
    <Part position={[0, 0.03, 0]} color={color}>
      <cylinderGeometry args={[0.42, 0.48, 0.06, 40]} />
    </Part>
    <Part position={[0, 0.3, -0.05]} finish="metal">
      <cylinderGeometry args={[0.07, 0.07, 0.55, 20]} />
    </Part>
    <RBox args={[1.7, 1.05, 0.09]} radius={0.06} position={[0, 1.05, 0]} color={color} />
    <RBox args={[1.56, 0.92, 0.01]} radius={0.03} position={[0, 1.05, 0.046]} finish="screen" outline={false} />
    <ScreenUI w={1.56} h={0.92} z={0.055} icon={o.icon} accent={accent} y={1.05} />
  </group>
);

const Server: React.FC<ObjProps> = ({ color, accent, t }) => (
  <group>
    <RBox args={[1.15, 1.9, 1.0]} radius={0.08} position={[0, 0.95, 0]} color={color} />
    {[0, 1, 2, 3].map((k) => (
      <group key={k} position={[0, 0.32 + k * 0.42, 0.5]}>
        <RBox args={[0.98, 0.32, 0.06]} radius={0.03} finish="dark" />
        {[0, 1, 2].map((j) => (
          <Part key={j} position={[0.28 + j * 0.12, 0, 0.035]} finish="glow" color={Math.sin(t * 6 + k * 1.3 + j * 2.1) > -0.2 ? accent : mixHex(accent, "#000000", 0.7)} outline={false}>
            <sphereGeometry args={[0.035, 12, 8]} />
          </Part>
        ))}
        {[0, 1, 2, 3].map((j) => (
          <Part key={`v${j}`} position={[-0.36 + j * 0.1, 0, 0.035]} finish="light" outline={false}>
            <boxGeometry args={[0.05, 0.18, 0.01]} />
          </Part>
        ))}
      </group>
    ))}
  </group>
);

const Database: React.FC<ObjProps> = ({ color, accent }) => (
  <group>
    {[0, 1, 2].map((k) => (
      <group key={k} position={[0, 0.22 + k * 0.48, 0]}>
        <Part color={color}>
          <cylinderGeometry args={[0.66, 0.66, 0.42, 48]} />
        </Part>
        <Part position={[0, 0.0, 0]} finish="glow" color={accent} outline={false}>
          <torusGeometry args={[0.665, 0.022, 8, 64]} />
        </Part>
      </group>
    ))}
  </group>
);

const Cloud: React.FC<ObjProps> = ({ color }) => (
  <group position={[0, 0.1, 0]}>
    {(
      [
        [-0.5, 0.42, 0, 0.42],
        [0.02, 0.62, -0.05, 0.56],
        [0.52, 0.42, 0, 0.42],
        [0.22, 0.32, 0.28, 0.36],
        [-0.24, 0.3, 0.26, 0.36],
      ] as const
    ).map(([x, y, z, r], k) => (
      <Part key={k} position={[x, y, z]} color={color}>
        <sphereGeometry args={[r, 40, 28]} />
      </Part>
    ))}
  </group>
);

const Document: React.FC<ObjProps> = ({ o, color, accent }) => (
  <group position={[0, 0.82, 0]} rotation={[0, -0.12, 0.04]}>
    <RBox args={[1.15, 1.5, 0.07]} radius={0.04} finish="light" />
    <RBox args={[0.9, 0.16, 0.02]} radius={0.02} position={[0, 0.5, 0.04]} color={color} outline={false} />
    {o.icon ? <IconMesh name={o.icon} size={0.5} position={[0, 0.14, 0.04]} finish="body" color={accent} /> : null}
    {[0, 1, 2, 3].map((k) => (
      <Part key={k} position={[-0.06 + (k % 2) * 0.05, (o.icon ? -0.18 : 0.18) - k * 0.17, 0.04]} finish="dark" outline={false}>
        <boxGeometry args={[0.78 - (k % 2) * 0.14, 0.055, 0.01]} />
      </Part>
    ))}
  </group>
);

const Folder: React.FC<ObjProps> = ({ color }) => (
  <group position={[0, 0.02, 0]}>
    <RBox args={[1.45, 1.05, 0.08]} radius={0.05} position={[0, 0.55, -0.12]} color={mixHex(color, "#000000", 0.15)} />
    <RBox args={[0.55, 0.16, 0.08]} radius={0.04} position={[-0.42, 1.1, -0.12]} color={mixHex(color, "#000000", 0.15)} />
    <RBox args={[1.2, 0.9, 0.03]} radius={0.02} position={[0.04, 0.6, -0.04]} rotation={[0, 0, 0.04]} finish="light" />
    <group position={[0, 0.02, 0.0]} rotation={[0.22, 0, 0]}>
      <RBox args={[1.45, 0.92, 0.08]} radius={0.05} position={[0, 0.46, 0.04]} color={color} />
    </group>
  </group>
);

const triShape = (w: number, h: number) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, -h);
  s.closePath();
  return s;
};

const Envelope: React.FC<ObjProps> = ({ color, accent }) => {
  const flap = useMemo(() => new THREE.ExtrudeGeometry(triShape(1.42, 0.55), { depth: 0.03, bevelEnabled: false }), []);
  return (
    <group position={[0, 0.48, 0]} rotation={[0, 0.15, 0]}>
      <RBox args={[1.45, 0.92, 0.14]} radius={0.05} color={color} />
      <Part geometry={flap} position={[0, 0.46, 0.07]} color={mixHex(color, "#000000", 0.12)}>
        {null}
      </Part>
      <Part position={[0, -0.02, 0.105]} rotation={[PI / 2, 0, 0]} finish="glow" color={accent} outline={false}>
        <cylinderGeometry args={[0.1, 0.1, 0.03, 24]} />
      </Part>
    </group>
  );
};

const Coin: React.FC<ObjProps> = ({ o, color, t }) => {
  const n = Math.round(num(o.value, 1));
  const gold = color;
  if (n >= 2) {
    return (
      <group>
        {Array.from({ length: Math.min(6, n) }, (_, k) => (
          <Part key={k} position={[Math.sin(k * 2.4) * 0.05, 0.08 + k * 0.17, Math.cos(k * 1.7) * 0.05]} color={gold}>
            <cylinderGeometry args={[0.62, 0.62, 0.15, 48]} />
          </Part>
        ))}
      </group>
    );
  }
  return (
    <group position={[0, 0.68, 0]} rotation={[0, t * 1.4, 0]}>
      <Part rotation={[PI / 2, 0, 0]} color={gold}>
        <cylinderGeometry args={[0.66, 0.66, 0.16, 64]} />
      </Part>
      <Part position={[0, 0, 0.081]} color={mixHex(gold, "#FFFFFF", 0.25)} outline={false}>
        <torusGeometry args={[0.52, 0.035, 10, 64]} />
      </Part>
      <IconMesh name={o.icon ?? "currency-dollar"} size={0.62} depth={0.05} position={[0, 0, 0.08]} finish="body" color={mixHex(gold, "#FFFFFF", 0.3)} />
    </group>
  );
};

const Chart: React.FC<ObjProps> = ({ o, color, items, t }) => {
  const { palette } = useKit3D();
  const values = o.values ?? [1, 2, 3];
  const max = Math.max(...values, 1e-6);
  const n = values.length;
  const w = Math.min(0.42, 1.7 / n - 0.08);
  const cols = [color, palette.accent2 ?? palette.accent, palette.accent3 ?? palette.accent];
  return (
    <group>
      <RBox args={[1.95, 0.12, 0.9]} radius={0.05} position={[0, 0.06, 0]} finish="light" />
      {values.map((v, k) => {
        const h = 0.15 + (1.75 * v) / max;
        const g = easeOut((t - (items[k] ?? 0)) / 0.6);
        const x = (k - (n - 1) / 2) * (1.75 / n);
        return g > 0 ? (
          <RBox key={k} args={[w, h, w]} radius={0.04} position={[x, 0.12 + (h * g) / 2, 0]} scale={[1, Math.max(0.001, g), 1]} color={k === values.indexOf(max) ? color : mixHex(cols[k % 3], "#FFFFFF", 0.15)} />
        ) : null;
      })}
    </group>
  );
};

const Stat: React.FC<ObjProps> = ({ color }) => (
  <group>
    <Part position={[0, 0.22, 0]} color={color}>
      <cylinderGeometry args={[0.8, 0.86, 0.44, 64]} />
    </Part>
    <Part position={[0, 0.445, 0]} finish="light" outline={false}>
      <cylinderGeometry args={[0.68, 0.68, 0.02, 64]} />
    </Part>
  </group>
);

const Lock: React.FC<ObjProps> = ({ color, t, enter }) => {
  // the shackle snaps shut shortly after the entrance
  const close = easeOut((t - enter - 0.5) / 0.25);
  return (
    <group>
      <group position={[0, 0.98 + (1 - close) * 0.22, 0]}>
        <Part finish="metal">
          <torusGeometry args={[0.34, 0.09, 16, 48, PI]} />
        </Part>
        <Part position={[-0.34, -0.15, 0]} finish="metal">
          <cylinderGeometry args={[0.09, 0.09, 0.3, 16]} />
        </Part>
        <Part position={[0.34, -0.15, 0]} finish="metal">
          <cylinderGeometry args={[0.09, 0.09, 0.3, 16]} />
        </Part>
      </group>
      <RBox args={[1.15, 0.95, 0.5]} radius={0.14} position={[0, 0.5, 0]} color={color} />
      <Part position={[0, 0.56, 0.26]} rotation={[PI / 2, 0, 0]} finish="dark" outline={false}>
        <cylinderGeometry args={[0.1, 0.1, 0.03, 24]} />
      </Part>
      <Part position={[0, 0.4, 0.26]} finish="dark" outline={false}>
        <boxGeometry args={[0.08, 0.2, 0.03]} />
      </Part>
    </group>
  );
};

const Key: React.FC<ObjProps> = ({ color, t }) => (
  <group position={[0, 0.05, 0]} rotation={[0, Math.sin(t * 1.2) * 0.4, 0]}>
    <Part position={[0, 1.05, 0]} color={color}>
      <torusGeometry args={[0.3, 0.11, 16, 40]} />
    </Part>
    <RBox args={[0.16, 0.85, 0.16]} radius={0.04} position={[0, 0.42, 0]} color={color} />
    <RBox args={[0.24, 0.12, 0.16]} radius={0.03} position={[0.15, 0.12, 0]} color={color} />
    <RBox args={[0.18, 0.1, 0.16]} radius={0.03} position={[0.13, 0.32, 0]} color={color} />
  </group>
);

const gearShape = (teeth: number, r: number, depth: number) => {
  const s = new THREE.Shape();
  const steps = teeth * 4;
  for (let k = 0; k <= steps; k++) {
    const a = (k / steps) * PI * 2;
    const rr = k % 4 === 0 || k % 4 === 1 ? r : r - depth;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (k === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, r * 0.32, 0, PI * 2, true);
  s.holes.push(hole);
  return s;
};

const Gear: React.FC<ObjProps> = ({ color, t }) => {
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(gearShape(10, 0.66, 0.16), { depth: 0.24, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 24 });
    g.center();
    return g;
  }, []);
  return (
    <group position={[0, 0.72, 0]} rotation={[0, 0, t * 0.9]}>
      <Part geometry={geo} color={color}>
        {null}
      </Part>
    </group>
  );
};

const Globe: React.FC<ObjProps> = ({ color, accent, t }) => (
  <group>
    <Part position={[0, 0.04, 0]} finish="dark">
      <cylinderGeometry args={[0.38, 0.45, 0.08, 40]} />
    </Part>
    <Part position={[0, 0.2, 0]} finish="metal">
      <cylinderGeometry args={[0.05, 0.05, 0.3, 12]} />
    </Part>
    <group position={[0, 0.92, 0]} rotation={[0.35, t * 0.6, 0]}>
      <Part color={color}>
        <icosahedronGeometry args={[0.6, 3]} />
      </Part>
      <mesh>
        <sphereGeometry args={[0.615, 18, 12]} />
        <meshBasicMaterial color={mixHex(color, "#FFFFFF", 0.7)} wireframe transparent opacity={0.45} />
      </mesh>
    </group>
    <group position={[0, 0.92, 0]} rotation={[1.2, 0, 0.3]}>
      <Part finish="glow" color={accent} outline={false}>
        <torusGeometry args={[0.9, 0.025, 10, 96]} />
      </Part>
      <Part position={[Math.cos(t * 1.6) * 0.9, Math.sin(t * 1.6) * 0.9, 0]} finish="glow" color={accent} outline={false}>
        <sphereGeometry args={[0.07, 16, 12]} />
      </Part>
    </group>
  </group>
);

const Chip: React.FC<ObjProps> = ({ o, color, accent }) => (
  <group position={[0, 0.06, 0]}>
    <RBox args={[1.25, 0.2, 1.25]} radius={0.05} position={[0, 0.12, 0]} finish="dark" />
    <RBox args={[0.78, 0.06, 0.78]} radius={0.04} position={[0, 0.24, 0]} color={color} />
    {o.icon ? <IconMesh name={o.icon} size={0.5} position={[0, 0.275, 0]} rotation={[-PI / 2, 0, 0]} finish="glow" color={accent} /> : null}
    {[0, 1, 2, 3].flatMap((side) =>
      [0, 1, 2, 3, 4].map((k) => {
        const off = (k - 2) * 0.22;
        const a = (side * PI) / 2;
        return (
          <Part key={`${side}-${k}`} position={[Math.cos(a) * 0.7 + Math.sin(a) * off, 0.06, Math.sin(a) * 0.7 - Math.cos(a) * off]} rotation={[0, -a, 0]} finish="metal" outline={false}>
            <boxGeometry args={[0.18, 0.05, 0.08]} />
          </Part>
        );
      }),
    )}
  </group>
);

const Battery: React.FC<ObjProps> = ({ o, color, t, enter }) => {
  const { look } = useKit3D();
  let v = num(o.value, 0.8);
  if (v > 1) v /= 100;
  const level = clamp01(v) * easeOut((t - enter - 0.3) / 1.0);
  const fill = v < 0.25 ? look.bad : v < 0.6 ? "#FFC145" : look.good;
  return (
    <group>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 1.38, 48, 1, true]} />
        <meshPhysicalMaterial color={mixHex(color, "#FFFFFF", 0.5)} transparent opacity={0.35} roughness={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Part position={[0, 0.04, 0]} color={color}>
        <cylinderGeometry args={[0.47, 0.47, 0.08, 48]} />
      </Part>
      {level > 0.01 ? (
        <Part position={[0, 0.08 + (1.26 * level) / 2, 0]} finish={look.bloom ? "glow" : "body"} color={fill} outline={false}>
          <cylinderGeometry args={[0.38, 0.38, 1.26 * level, 40]} />
        </Part>
      ) : null}
      <Part position={[0, 1.43, 0]} color={color}>
        <cylinderGeometry args={[0.47, 0.47, 0.08, 48]} />
      </Part>
      <Part position={[0, 1.53, 0]} finish="metal">
        <cylinderGeometry args={[0.16, 0.16, 0.14, 24]} />
      </Part>
    </group>
  );
};

const Rocket: React.FC<ObjProps> = ({ color, accent, t }) => {
  const body = useMemo(() => {
    const pts = [
      [0, 0],
      [0.32, 0.05],
      [0.42, 0.4],
      [0.44, 0.9],
      [0.36, 1.3],
      [0.2, 1.62],
      [0, 1.8],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 40);
  }, []);
  const fin = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.38, -0.12);
    s.lineTo(0.36, 0.22);
    s.lineTo(0, 0.55);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false });
    g.translate(0, 0, -0.03);
    return g;
  }, []);
  const flicker = 0.85 + 0.15 * Math.sin(t * 40) * Math.sin(t * 23);
  return (
    <group position={[0, 0.32 + Math.sin(t * 2) * 0.04, 0]}>
      <Part geometry={body} finish="light">
        {null}
      </Part>
      <Part position={[0, 1.42, 0]} color={color}>
        <coneGeometry args={[0.31, 0.4, 40]} />
      </Part>
      {[0, 1, 2].map((k) => (
        <group key={k} rotation={[0, (k * 2 * PI) / 3, 0]}>
          <Part geometry={fin} position={[0.36, 0.05, 0]} color={color}>
            {null}
          </Part>
        </group>
      ))}
      <Part position={[0, 1.0, 0.4]} rotation={[PI / 2, 0, 0]} finish="screen">
        <cylinderGeometry args={[0.14, 0.14, 0.06, 32]} />
      </Part>
      <Part position={[0, 1.0, 0.43]} rotation={[0, 0, 0]} finish="glow" color={accent} outline={false}>
        <torusGeometry args={[0.15, 0.03, 8, 32]} />
      </Part>
      <group position={[0, -0.18, 0]} rotation={[PI, 0, 0]} scale={[1, flicker, 1]}>
        <Part finish="glow" color="#FFB547" outline={false}>
          <coneGeometry args={[0.22, 0.5, 24]} />
        </Part>
      </group>
    </group>
  );
};

const Lightbulb: React.FC<ObjProps> = ({ color, t, enter }) => {
  const { look } = useKit3D();
  const on = easeOut((t - enter - 0.35) / 0.3);
  const glow = mixHex("#FFF6D8", color, 0.35);
  return (
    <group>
      {[0, 1, 2].map((k) => (
        <Part key={k} position={[0, 0.12 + k * 0.1, 0]} finish="metal">
          <cylinderGeometry args={[0.24 - k * 0.01, 0.24 - k * 0.01, 0.08, 32]} />
        </Part>
      ))}
      <Part position={[0, 0.45, 0]} finish="metal">
        <cylinderGeometry args={[0.26, 0.3, 0.12, 32]} />
      </Part>
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.55, 48, 32]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.1 + on * (look.bloom ? 0.3 : 0.45)} roughness={0.2} />
      </mesh>
      {look.bloom ? null : <pointLight position={[0, 1.0, 0.8]} intensity={on * 3} distance={3.5} color="#FFE9A8" />}
    </group>
  );
};

/** A generic figure with legs, torso, arms and head (not a mascot); the arms sway with t. */
const Person: React.FC<ObjProps> = ({ color, t }) => {
  const sway = Math.sin(t * 2.2) * 0.12;
  return (
    <group rotation={[0, Math.sin(t * 1.3) * 0.15, 0]}>
      {[-0.14, 0.14].map((x) => (
        <Part key={x} position={[x, 0.36, 0]} finish="dark">
          <capsuleGeometry args={[0.11, 0.48, 8, 16]} />
        </Part>
      ))}
      <Part position={[0, 0.98, 0]} color={color}>
        <capsuleGeometry args={[0.29, 0.36, 10, 24]} />
      </Part>
      {[-1, 1].map((k) => (
        <group key={k} position={[k * 0.38, 1.2, 0]} rotation={[k * sway, 0, k * 0.16]}>
          <Part position={[0, -0.24, 0]} color={mixHex(color, "#000000", 0.12)}>
            <capsuleGeometry args={[0.085, 0.42, 8, 16]} />
          </Part>
          <Part position={[0, -0.52, 0]} finish="light">
            <sphereGeometry args={[0.085, 16, 12]} />
          </Part>
        </group>
      ))}
      <Part position={[0, 1.42, 0]} finish="light">
        <cylinderGeometry args={[0.08, 0.1, 0.14, 16]} />
      </Part>
      <Part position={[0, 1.6, 0]} finish="light">
        <sphereGeometry args={[0.24, 32, 24]} />
      </Part>
    </group>
  );
};

const Building: React.FC<ObjProps> = ({ color, accent }) => (
  <group>
    <RBox args={[1.2, 2.0, 1.2]} radius={0.05} position={[0, 1.0, 0]} color={color} />
    <RBox args={[0.6, 0.14, 0.6]} radius={0.03} position={[0.15, 2.07, -0.1]} finish="dark" />
    {Array.from({ length: 5 }, (_, r) =>
      [0, 1, 2].map((c) => (
        <group key={`${r}-${c}`}>
          <Part position={[-0.34 + c * 0.34, 0.4 + r * 0.34, 0.605]} finish={(r * 3 + c) % 4 === 1 ? "glow" : "screen"} color={accent} outline={false}>
            <planeGeometry args={[0.2, 0.2]} />
          </Part>
          <Part position={[0.605, 0.4 + r * 0.34, -0.34 + c * 0.34]} rotation={[0, PI / 2, 0]} finish={(r * 3 + c) % 5 === 2 ? "glow" : "screen"} color={accent} outline={false}>
            <planeGeometry args={[0.2, 0.2]} />
          </Part>
        </group>
      )),
    )}
  </group>
);

const House: React.FC<ObjProps> = ({ color, accent }) => {
  const roof = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(triShape(1.6, -0.75), { depth: 1.2, bevelEnabled: false });
    g.translate(0, 0, -0.6);
    return g;
  }, []);
  return (
    <group>
      <RBox args={[1.3, 0.95, 1.05]} radius={0.04} position={[0, 0.475, 0]} finish="light" />
      <Part geometry={roof} position={[0, 0.95, 0]} color={color}>
        {null}
      </Part>
      <RBox args={[0.3, 0.5, 0.04]} radius={0.02} position={[-0.25, 0.25, 0.53]} finish="dark" />
      <RBox args={[0.3, 0.26, 0.04]} radius={0.02} position={[0.3, 0.55, 0.53]} finish="glow" color={accent} outline={false} />
    </group>
  );
};

const Tree: React.FC<ObjProps> = ({ color, t }) => (
  <group rotation={[0, 0, Math.sin(t * 1.4) * 0.03]}>
    <Part position={[0, 0.35, 0]} color="#8B5E3C">
      <cylinderGeometry args={[0.12, 0.16, 0.7, 16]} />
    </Part>
    <Part position={[0, 1.05, 0]} color={color}>
      <icosahedronGeometry args={[0.62, 1]} />
    </Part>
    <Part position={[0.18, 1.55, 0.05]} color={mixHex(color, "#FFFFFF", 0.12)}>
      <icosahedronGeometry args={[0.38, 1]} />
    </Part>
  </group>
);

const Pin: React.FC<ObjProps> = ({ color, t }) => {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
    for (let k = 0; k <= 24; k++) {
      const a = -PI / 2 + 0.55 + (k / 24) * (PI - 0.55 + PI / 2);
      pts.push(new THREE.Vector2(Math.max(0, Math.cos(a) * 0.52), 1.1 + Math.sin(a) * 0.52));
    }
    return new THREE.LatheGeometry(pts, 40);
  }, []);
  return (
    <group position={[0, Math.abs(Math.sin(t * 2.2)) * 0.1, 0]}>
      <Part geometry={geo} color={color}>
        {null}
      </Part>
      <Part position={[0, 1.12, 0.42]} finish="light" outline={false}>
        <sphereGeometry args={[0.18, 24, 16]} />
      </Part>
    </group>
  );
};

const Card: React.FC<ObjProps> = ({ color, accent }) => (
  <group position={[0, 0.5, 0]} rotation={[-0.15, -0.3, 0.08]}>
    <RBox args={[1.55, 0.98, 0.05]} radius={0.06} color={color} />
    <RBox args={[0.3, 0.22, 0.02]} radius={0.03} position={[-0.45, 0.08, 0.03]} color="#E8C36A" outline={false} />
    <Part position={[0.15, -0.25, 0.028]} finish="light" outline={false}>
      <planeGeometry args={[1.0, 0.07]} />
    </Part>
    <Part position={[0.52, 0.3, 0.03]} finish="glow" color={accent} outline={false}>
      <circleGeometry args={[0.12, 24]} />
    </Part>
  </group>
);

const checkShape = () => {
  const s = new THREE.Shape();
  s.moveTo(-0.32, 0.02);
  s.lineTo(-0.1, -0.2);
  s.lineTo(0.34, 0.24);
  s.lineTo(0.26, 0.32);
  s.lineTo(-0.1, -0.04);
  s.lineTo(-0.24, 0.1);
  s.closePath();
  return s;
};

const Badge: React.FC<ObjProps & { good: boolean }> = ({ color, good, t }) => {
  const mark = useMemo(() => new THREE.ExtrudeGeometry(checkShape(), { depth: 0.1, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }), []);
  return (
    <group position={[0, 0.66, 0]} rotation={[0, Math.sin(t * 1.5) * 0.25, 0]}>
      <Part rotation={[PI / 2, 0, 0]} color={color}>
        <cylinderGeometry args={[0.62, 0.62, 0.2, 64]} />
      </Part>
      {good ? (
        <Part geometry={mark} position={[0, 0, 0.09]} finish="light">
          {null}
        </Part>
      ) : (
        <group position={[0, 0, 0.14]}>
          <RBox args={[0.7, 0.14, 0.1]} radius={0.04} rotation={[0, 0, PI / 4]} finish="light" />
          <RBox args={[0.7, 0.14, 0.1]} radius={0.04} rotation={[0, 0, -PI / 4]} finish="light" />
        </group>
      )}
    </group>
  );
};

const IconTile: React.FC<ObjProps> = ({ o, color }) => (
  <group position={[0, 0.82, 0]}>
    <RBox args={[1.35, 1.35, 0.24]} radius={0.24} color={color} />
    <IconMesh name={o.icon} size={0.92} depth={0.12} position={[0, 0, 0.12]} finish="light" />
  </group>
);

const Model: React.FC<ObjProps> = ({ o, models }) => {
  const path = o.model ? models[o.model] : undefined;
  if (!path) return <Cube {...({ o, color: "#9AA3B8", accent: "#FFFFFF", t: 0, enter: 0, items: [], models } as ObjProps)} />;
  return <GltfModel url={staticFile(path)} />;
};

/** A local GLB normalized to a 1.6-unit tall object standing on y = 0 (suspends; ThreeCanvas waits via delayRender). */
const GltfModel: React.FC<{ url: string }> = ({ url }) => {
  const { look } = useKit3D();
  const gltf = useGLTF(url, false, false);
  const obj = useMemo(() => {
    const root = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const s = 1.6 / Math.max(size.y, size.x * 0.85, size.z * 0.85, 1e-6);
    root.scale.setScalar(s);
    const box2 = new THREE.Box3().setFromObject(root);
    const c = box2.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -box2.min.y, -c.z);
    root.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = look.shadows;
      m.receiveShadow = look.shadows;
      const src = m.material as THREE.MeshStandardMaterial;
      // match the look's surface while keeping the model's own colors (texture)
      if (look.material === "clay") m.material = new THREE.MeshStandardMaterial({ map: src.map ?? null, color: src.map ? "#FFFFFF" : src.color, roughness: 0.8, metalness: 0 });
      else if (look.material === "toon") m.material = new THREE.MeshToonMaterial({ map: src.map ?? null, color: src.map ? "#FFFFFF" : src.color });
    });
    const g = new THREE.Group();
    g.add(root);
    return g;
  }, [gltf, look.material, look.shadows]);
  return <primitive object={obj} />;
};

// ---------------- cars (Kenney Car Kit, CC0) ----------------

const CAR_LEN = 2.3;

/** A GLB car normalized to CAR_LEN along z, nose toward +z (the camera), standing on y = 0. */
const CarModel: React.FC<{ url: string }> = ({ url }) => {
  const { look } = useKit3D();
  const gltf = useGLTF(url, false, false);
  const obj = useMemo(() => {
    const root = gltf.scene.clone(true);
    const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    root.scale.setScalar(CAR_LEN / Math.max(size.z, size.x, 1e-6));
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -box.min.y, -c.z);
    root.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = look.shadows;
      m.receiveShadow = look.shadows;
      const src = m.material as THREE.MeshStandardMaterial;
      // the kit's palette texture on a plain satin standard material
      if (look.material === "paint" || look.material === "soft") m.material = new THREE.MeshStandardMaterial({ map: src.map ?? null, color: src.map ? "#FFFFFF" : src.color, roughness: 0.45, metalness: 0.1 });
    });
    const g = new THREE.Group();
    g.add(root);
    return g;
  }, [gltf, look.material, look.shadows]);
  return <primitive object={obj} />;
};

/** Procedural car (no model staged): body, cabin with dark glass, four wheels. */
const ProcCar: React.FC<{ color: string }> = ({ color }) => (
  <group>
    <RBox args={[1.08, 0.42, CAR_LEN]} radius={0.16} position={[0, 0.4, 0]} color={color} />
    <RBox args={[0.94, 0.38, 1.15]} radius={0.14} position={[0, 0.78, -0.15]} color={color} />
    <RBox args={[0.96, 0.28, 1.0]} radius={0.1} position={[0, 0.8, -0.15]} finish="dark" outline={false} />
    {[-1, 1].map((sx) =>
      [-1, 1].map((sz) => (
        <Part key={`${sx}${sz}`} position={[sx * 0.52, 0.22, sz * 0.72]} rotation={[0, 0, Math.PI / 2]} finish="dark">
          <cylinderGeometry args={[0.22, 0.22, 0.18, 24]} />
        </Part>
      )),
    )}
  </group>
);

/** Night lights of a car (no real lights): headlight glare + a faint beam cone + a pool on the road, tail-light glow. */
const CarLights: React.FC = () => {
  const glare = radialTexture();
  return (
    <group>
      <mesh position={[0, 0.015, CAR_LEN / 2 + 2.6]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[2.6, 4.6]} />
        <meshBasicMaterial map={glare} color="#FFE2B0" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {[-0.36, 0.36].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.48, CAR_LEN / 2 + 0.02]}>
            <circleGeometry args={[0.09, 20]} />
            <meshBasicMaterial color={new THREE.Color("#FFF1D6").multiplyScalar(5)} toneMapped={false} />
          </mesh>
          <mesh position={[x, 0.48, CAR_LEN / 2 + 0.05]} renderOrder={3}>
            <planeGeometry args={[0.7, 0.45]} />
            <meshBasicMaterial map={glare} color="#FFE2B0" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
          {/* the beam: a faint additive cone in the haze */}
          <mesh position={[x * 1.6, 0.42, CAR_LEN / 2 + 2.6]} rotation={[Math.PI / 2 + 0.06, 0, 0]} renderOrder={3}>
            <coneGeometry args={[0.9, 5, 32, 1, true]} />
            <meshBasicMaterial color="#FFDDAA" transparent opacity={0.022} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[x, 0.55, -CAR_LEN / 2 - 0.05]} rotation={[0, Math.PI, 0]} renderOrder={3}>
            <planeGeometry args={[0.55, 0.35]} />
            <meshBasicMaterial map={glare} color={new THREE.Color("#FF2A3A").multiplyScalar(2)} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const Car: React.FC<ObjProps> = ({ o, models, color, index = 0 }) => {
  const { look } = useKit3D();
  const id = modelOf(o, index);
  const url = id && models[id] ? staticFile(models[id]) : null;
  return (
    <group>
      {url ? <CarModel url={url} /> : <ProcCar color={color} />}
      {look.night ? <CarLights /> : null}
    </group>
  );
};

// ---------------- characters (Kenney Blocky Characters, CC0, animated) ----------------

/** Skinned GLB character normalized to 1.7 units, facing the camera; its clip is set to t (frame-pure). */
const CharacterModel: React.FC<{ url: string; anim: string; t: number }> = ({ url, anim, t }) => {
  const { look } = useKit3D();
  const gltf = useGLTF(url, false, false);
  const rig = useMemo(() => {
    const root = cloneSkinned(gltf.scene);
    const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    const wrap = new THREE.Group();
    wrap.add(root);
    wrap.scale.setScalar(1.7 / Math.max(size.y, 1e-6));
    const box = new THREE.Box3().setFromObject(wrap);
    root.position.set(-(box.min.x + box.max.x) / 2 / wrap.scale.x, -box.min.y / wrap.scale.y, -(box.min.z + box.max.z) / 2 / wrap.scale.z);
    root.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = look.shadows;
      m.receiveShadow = look.shadows;
      m.frustumCulled = false;
    });
    const mixer = new THREE.AnimationMixer(root);
    const want = (CHARACTER_ANIMS as Record<string, string>)[anim] ?? "idle";
    const clip = THREE.AnimationClip.findByName(gltf.animations, want) ?? THREE.AnimationClip.findByName(gltf.animations, "idle") ?? gltf.animations[0];
    if (clip) mixer.clipAction(clip).play();
    return { wrap, mixer };
  }, [gltf, anim, look.shadows]);
  useLayoutEffect(() => {
    rig.mixer.setTime(Math.max(0, t));
  });
  return <primitive object={rig.wrap} />;
};

const Character: React.FC<ObjProps> = (p) => {
  const id = modelOf(p.o, p.index ?? 0);
  const url = id && p.models[id] ? staticFile(p.models[id]) : null;
  return url ? <CharacterModel url={url} anim={p.o.anim ?? "idle"} t={p.t} /> : <Person {...p} />;
};

/** Default body color of a kind when the spec gives none (else the palette cycles). */
export const KIND_COLOR: Record<string, string> = { coin: "#F5B83D", tree: "#4CB96B", cloud: "#FFFFFF" };

export const ObjectView: React.FC<ObjProps> = (p) => {
  const { look } = useKit3D();
  switch (p.o.kind) {
    case "cube":
      return <Cube {...p} />;
    case "sphere":
      return <Sphere {...p} />;
    case "phone":
      return <Phone {...p} />;
    case "laptop":
      return <Laptop {...p} />;
    case "monitor":
      return <Monitor {...p} />;
    case "server":
      return <Server {...p} />;
    case "database":
      return <Database {...p} />;
    case "cloud":
      return <Cloud {...p} />;
    case "document":
      return <Document {...p} />;
    case "folder":
      return <Folder {...p} />;
    case "envelope":
      return <Envelope {...p} />;
    case "coin":
      return <Coin {...p} />;
    case "chart":
      return <Chart {...p} />;
    case "stat":
      return <Stat {...p} />;
    case "lock":
      return <Lock {...p} />;
    case "key":
      return <Key {...p} />;
    case "gear":
      return <Gear {...p} />;
    case "globe":
      return <Globe {...p} />;
    case "chip":
      return <Chip {...p} />;
    case "battery":
      return <Battery {...p} />;
    case "rocket":
      return <Rocket {...p} />;
    case "lightbulb":
      return <Lightbulb {...p} />;
    case "person":
      return <Person {...p} />;
    case "building":
      return <Building {...p} />;
    case "house":
      return <House {...p} />;
    case "tree":
      return <Tree {...p} />;
    case "pin":
      return <Pin {...p} />;
    case "card":
      return <Card {...p} />;
    case "check":
      return <Badge {...p} good color={p.o.color ? p.color : look.good} />;
    case "cross":
      return <Badge {...p} good={false} color={p.o.color ? p.color : look.bad} />;
    case "icon":
      return <IconTile {...p} />;
    case "model":
      return <Model {...p} />;
    case "car":
      return <Car {...p} />;
    case "character":
      return <Character {...p} />;
    default:
      return <Cube {...p} />;
  }
};
