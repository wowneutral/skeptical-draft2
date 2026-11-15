// The lift in WebGL: the lobby wall, the doors with the name cut through
// them, the car, the dial. The rooms beyond the doorway are real DOM placed
// in the same space with CSS3DRenderer, under a canvas that is clear wherever
// you can see through.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { clamp, damp, smooth } from '@/lib/utils';
import GLYPHS from './glyphs.json';
import { lift, LIGHT, step, FLOORS } from './lift';
import { brass, carFloor, ceiling, dialFace, plaster, sill, steel, terrazzo, walnut } from './tex';
import type { Geo } from './geo';

type Props = { geo: Geo; rooms: HTMLElement[]; floors: HTMLElement[]; shaft: HTMLElement; host: HTMLElement; root: HTMLElement };

/* ------------------------------------------------------------------ */
/* Materials                                                            */
/* ------------------------------------------------------------------ */
function makeMaterials() {
  const st = steel({ wear: 0.45, tone: 156 }), st2 = steel({ wear: 0.5, tone: 132 }), br = brass(), fl = carFloor(4, 3);
  [st.map, st.rough].forEach((t) => t.repeat.set(1 / 0.9, 1 / 2.3));
  [st2.map, st2.rough].forEach((t) => t.repeat.set(1 / 0.9, 1 / 2.4));
  const door = new THREE.MeshPhysicalMaterial({ color: '#f2f3f5', map: st.map, roughnessMap: st.rough, roughness: 0.95, metalness: 1, anisotropy: 0.75, anisotropyRotation: Math.PI / 2, envMapIntensity: 1.25 });
  const edge = new THREE.MeshPhysicalMaterial({ color: '#d9dadc', roughness: 0.22, metalness: 1, envMapIntensity: 1.4 });
  const wall = new THREE.MeshPhysicalMaterial({ color: '#e7e3dc', map: st2.map, roughnessMap: st2.rough, roughness: 1.05, metalness: 1, anisotropy: 0.6, anisotropyRotation: Math.PI / 2, envMapIntensity: 1.05 });
  const seam = new THREE.MeshStandardMaterial({ color: '#0d0c0b', roughness: 0.8 });
  const brassM = new THREE.MeshPhysicalMaterial({ color: '#e0b878', map: br.map, roughnessMap: br.rough, roughness: 0.8, metalness: 1, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 1.3 });
  const plast = new THREE.MeshStandardMaterial({ map: plaster(), roughness: 0.92, metalness: 0 });
  const wood = new THREE.MeshPhysicalMaterial({ map: walnut(), roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.25, metalness: 0 });
  const terra = new THREE.MeshPhysicalMaterial({ map: terrazzo(), roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.18, metalness: 0 });
  fl.map.repeat.set(1, 1); fl.rough.repeat.set(1, 1);
  const floor = new THREE.MeshStandardMaterial({ map: fl.map, roughnessMap: fl.rough, roughness: 1, metalness: 0.05 });
  const sillM = new THREE.MeshStandardMaterial({ map: sill(), roughness: 0.4, metalness: 0.9 });
  const ceil = ceiling();
  const light = new THREE.MeshBasicMaterial({ map: ceil, color: '#ffffff', toneMapped: false });
  const dark = new THREE.MeshStandardMaterial({ color: '#16130f', roughness: 0.9 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#ffe2b0', transparent: true, opacity: 0.2, roughness: 0.1, metalness: 0, envMapIntensity: 0.7, depthWrite: false });
  const glow = new THREE.MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false });
  const shaft = new THREE.MeshStandardMaterial({ color: '#191715', roughness: 0.95 });
  const dial = dialFace();
  const face = new THREE.MeshStandardMaterial({ map: dial.map, emissiveMap: dial.emit, emissive: '#ffffff', emissiveIntensity: 1.6, roughness: 0.5, metalness: 0.4, transparent: true });
  const btn = new THREE.MeshStandardMaterial({ color: '#d8b06e', roughness: 0.35, metalness: 1, emissive: '#ff9a2a', emissiveIntensity: 0 });
  return { door, edge, wall, seam, brassM, plast, wood, terra, floor, sillM, light, dark, glass, glow, shaft, face, btn, dial };
}
type M = ReturnType<typeof makeMaterials>;

/* ------------------------------------------------------------------ */
/* The name, cut through the doors                                      */
/* ------------------------------------------------------------------ */
const loader = new SVGLoader();
type Pt = THREE.Vector2;
function glyph(ch: string) {
  const g = GLYPHS.glyphs.find((x) => x.ch === ch)!;
  const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${g.d}"/></svg>`);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  return { shapes: shapes.map((s) => s.extractPoints(5)), x: g.x, adv: g.advance };
}
const CAP = 859, TRACK = 70;
function word(text: string) { return text.split('').map(glyph); }
function wordWidth(gs: ReturnType<typeof word>) { return gs.reduce((a, g) => a + g.adv, 0) + TRACK * (gs.length - 1); }

/** Lay out a word on one leaf; returns the holes for the leaf and the islands (counters) that sit in them. */
function cut(text: string, map: (u: number, v: number) => [number, number]) {
  const holes: THREE.Path[] = [], islands: THREE.Shape[] = [];
  let pen = 0;
  for (const g of word(text)) {
    for (const s of g.shapes) {
      const tf = (p: Pt) => { const [x, y] = map(pen + (p.x - g.x), -p.y); return new THREE.Vector2(x, y); };
      holes.push(new THREE.Path(s.shape.map(tf)));
      s.holes.forEach((h) => islands.push(new THREE.Shape(h.map(tf))));
    }
    pen += g.adv + TRACK;
  }
  return { holes, islands };
}

function Leaf({ side, geo, M }: { side: -1 | 1; geo: Geo; M: M }) {
  const ref = useRef<THREE.Group>(null);
  const { door, island, glassGeo, glassPos } = useMemo(() => {
    const { W, H, phone } = geo;
    const half = W / 2, over = 0.05, gap = 0.003;
    const x0 = side < 0 ? -half - over : gap, x1 = side < 0 ? -gap : half + over;
    const outline = new THREE.Shape([new THREE.Vector2(x0, 0), new THREE.Vector2(x1, 0), new THREE.Vector2(x1, H - 0.004), new THREE.Vector2(x0, H - 0.004)]);
    // Read from the lobby: looking at the doors from outside, +x is on your left,
    // so SKEP goes on the +x leaf and every glyph runs toward -x.
    const text = side > 0 ? 'SKEP' : 'TICAL';
    const w = wordWidth(word(text));
    let res, gpos: [number, number], gsz: [number, number];
    if (!phone) {
      const Lh = geo.letter, s = Lh / CAP, m = 0.075, base = geo.wordY - Lh / 2;
      const start = side > 0 ? m + w * s : -m;
      res = cut(text, (u, v) => [start - u * s, base + v * s]);
      gpos = [side > 0 ? m + (w * s) / 2 : -m - (w * s) / 2, geo.wordY]; gsz = [w * s + 0.08, Lh + 0.08];
    } else {
      // Tall narrow doors: the name runs down each leaf like the spine of a book.
      const Lh = geo.letter, s = Lh / CAP, cx = side * (half / 2) + side * 0.01, top = geo.wordY + (w * s) / 2;
      res = cut(text, (u, v) => [cx + Lh / 2 - v * s, top - u * s]);
      gpos = [cx, geo.wordY]; gsz = [Lh + 0.08, w * s + 0.08];
    }
    outline.holes = res.holes;
    const depth = 0.035;
    const ex = { depth, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.0025, bevelSegments: 1, curveSegments: 5 };
    const d = new THREE.ExtrudeGeometry(outline, ex);
    d.translate(0, 0, -depth / 2);
    const isl = new THREE.ExtrudeGeometry(res.islands, { ...ex, bevelEnabled: false });
    isl.translate(0, 0, -depth / 2);
    const gg = new THREE.PlaneGeometry(gsz[0], gsz[1]);
    return { door: d, island: isl, glassGeo: gg, glassPos: gpos };
  }, [geo, side]);
  useEffect(() => () => { door.dispose(); island.dispose(); glassGeo.dispose(); }, [door, island, glassGeo]);
  useFrame(() => {
    const g = ref.current; if (!g) return;
    g.position.x = side * lift.doors * (geo.W / 2 + 0.03);
  });
  return (
    <group ref={ref} position={[0, 0, -0.072]}>
      <mesh geometry={door} material={[M.door, M.edge]} castShadow receiveShadow />
      <mesh geometry={island} material={[M.door, M.edge]} castShadow />
      {/* Frosted glass behind the letters, on the car side. */}
      <mesh geometry={glassGeo} material={M.glass} position={[glassPos[0], glassPos[1], 0.019]} renderOrder={2} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Walls with a hole                                                    */
/* ------------------------------------------------------------------ */
function slab(w: number, h: number, hw: number, hh: number, depth: number) {
  // A wall that goes round the doorway: a U, so there is no hole to triangulate.
  const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(-hw / 2, 0), new THREE.Vector2(-hw / 2, hh), new THREE.Vector2(hw / 2, hh), new THREE.Vector2(hw / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(w / 2, h), new THREE.Vector2(-w / 2, h)]);
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
}
function frame(w: number, h: number, t: number, depth: number) {
  const s = new THREE.Shape([new THREE.Vector2(-w / 2 - t, 0), new THREE.Vector2(-w / 2, 0), new THREE.Vector2(-w / 2, h), new THREE.Vector2(w / 2, h), new THREE.Vector2(w / 2, 0), new THREE.Vector2(w / 2 + t, 0), new THREE.Vector2(w / 2 + t, h + t), new THREE.Vector2(-w / 2 - t, h + t)]);
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 4 });
}

/* ------------------------------------------------------------------ */
/* The dial over the doors                                              */
/* ------------------------------------------------------------------ */
function Dial({ M, y, z, flip, r }: { M: M; y: number; z: number; flip: boolean; r: number }) {
  const needle = useRef<THREE.Mesh>(null);
  const { faceGeo, rim, ng } = useMemo(() => {
    const faceGeo = new THREE.PlaneGeometry(2 * r * 1.0, 2 * r * (560 / 1024));
    faceGeo.translate(0, r * (560 / 1024) - r * (40 / 512), 0);
    const ring = new THREE.Shape();
    ring.absarc(0, 0, r * 1.07, 0, Math.PI, false); ring.lineTo(-r * 0.98, 0); ring.absarc(0, 0, r * 0.98, Math.PI, 0, true); ring.lineTo(r * 1.07, 0);
    const base = new THREE.Shape([new THREE.Vector2(-r * 1.12, -0.05), new THREE.Vector2(r * 1.12, -0.05), new THREE.Vector2(r * 1.12, 0.005), new THREE.Vector2(-r * 1.12, 0.005)]);
    const rim = new THREE.ExtrudeGeometry([ring, base], { depth: 0.04, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2, curveSegments: 24 });
    const n = new THREE.Shape([new THREE.Vector2(-0.012, -0.03), new THREE.Vector2(0.012, -0.03), new THREE.Vector2(0.003, r * 0.8), new THREE.Vector2(-0.003, r * 0.8)]);
    const ng = new THREE.ExtrudeGeometry(n, { depth: 0.008, bevelEnabled: false });
    return { faceGeo, rim, ng };
  }, [r]);
  useFrame(() => {
    const nd = needle.current; if (!nd) return;
    const a = M.dial.ang(clamp(lift.p, 0, FLOORS.length - 1)) - Math.PI / 2;
    nd.rotation.z = a + Math.sin(lift.t * 60) * 0.03 * lift.shake;
  });
  return (
    <group position={[0, y, z]} rotation-y={flip ? Math.PI : 0}>
      <mesh geometry={rim} material={M.brassM} position-z={-0.03} castShadow />
      <mesh geometry={faceGeo} material={M.face} position-z={0.004} />
      <mesh ref={needle} geometry={ng} material={M.brassM} position={[0, 0, 0.012]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* The set                                                              */
/* ------------------------------------------------------------------ */
function Hall({ geo, M }: { geo: Geo; M: M }) {
  const ref = useRef<THREE.Group>(null);
  const sconce = useRef<THREE.PointLight[]>([]);
  const { W, H } = geo;
  const g = useMemo(() => ({ wall: slab(14, 4.2, W, H, 0.1), arch: frame(W + 0.02, H + 0.01, geo.phone ? 0.09 : 0.13, 0.05) }), [W, H, geo.phone]);
  useEffect(() => () => { g.wall.dispose(); g.arch.dispose(); }, [g]);
  const sx = W / 2 + (geo.phone ? 0.55 : 0.95);
  useFrame(() => {
    if (ref.current) ref.current.visible = lift.enter < 0.42;
    const on = lift.lights;
    sconce.current.forEach((l, i) => { if (l) l.intensity = (geo.phone ? 2.2 : 3.2) * on * (1 + Math.sin(lift.t * (11 + i * 3)) * 0.015); });
    M.glow.color.setRGB(1 * on + 0.05, 0.85 * on + 0.04, 0.62 * on + 0.03);
  });
  return (
    <group ref={ref}>
      <mesh geometry={g.wall} material={M.plast} position-z={-0.22} receiveShadow />
      {/* Wainscot and a brass rail at its top. */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={M.wood} position={[s * (W / 2 + 0.2 + 3.5), 0.52, -0.235]} receiveShadow><boxGeometry args={[7, 1.04, 0.03]} /></mesh>
          <mesh material={M.brassM} position={[s * (W / 2 + 0.2 + 3.5), 1.05, -0.245]}><boxGeometry args={[7, 0.035, 0.04]} /></mesh>
        </group>
      ))}
      <mesh geometry={g.arch} material={M.brassM} position-z={-0.27} castShadow receiveShadow />
      <mesh material={M.terra} rotation-x={-Math.PI / 2} position={[0, 0, -4.2]} receiveShadow><planeGeometry args={[16, 8]} /></mesh>
      <mesh material={M.sillM} rotation-x={-Math.PI / 2} position={[0, 0.004, -0.17]} receiveShadow><planeGeometry args={[W + 0.1, 0.32]} /></mesh>
      {/* Two sconces. */}
      {[-1, 1].map((s, i) => (
        <group key={s} position={[s * sx, 1.92, -0.25]}>
          <mesh material={M.brassM} position-z={-0.01}><boxGeometry args={[0.12, 0.34, 0.02]} /></mesh>
          <mesh material={M.glow} position-z={-0.07}><cylinderGeometry args={[0.07, 0.1, 0.24, 24, 1, true, Math.PI / 2, Math.PI]} /></mesh>
          <mesh material={M.brassM} position={[0, 0.125, -0.07]}><cylinderGeometry args={[0.075, 0.075, 0.012, 24, 1, false, Math.PI / 2, Math.PI]} /></mesh>
          <pointLight ref={(l) => { if (l) sconce.current[i] = l; }} position={[0, 0.05, -0.32]} color="#ffb867" distance={5} decay={2} intensity={0} />
        </group>
      ))}
      {/* The call plate. */}
      <group position={[geo.call[0], geo.call[1], -0.235]}>
        <mesh material={M.brassM}><boxGeometry args={[0.14, 0.3, 0.02]} /></mesh>
        <mesh material={M.btn} rotation-x={Math.PI / 2} position-z={-0.02}><cylinderGeometry args={[0.032, 0.036, 0.022, 32]} /></mesh>
      </group>
      <Dial M={M} y={H + 0.2} z={-0.29} flip r={geo.dialR} />
    </group>
  );
}

function Car({ geo, M }: { geo: Geo; M: M }) {
  const ref = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const { W, H, CW, CD, CH } = geo;
  const front = useMemo(() => slab(CW, CH, W, H, 0.12), [CW, CH, W, H]);
  useEffect(() => () => front.dispose(), [front]);
  // Wall panels with dark seams between them.
  const panels = useMemo(() => {
    const out: { pos: [number, number, number]; size: [number, number, number]; rotY: number }[] = [];
    const n = Math.max(2, Math.round(CD / 0.95));
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
      const len = (CD - 0.12) / n;
      out.push({ pos: [s * (CW / 2 - 0.01), CH / 2 + 0.06, 0.12 + len * (i + 0.5)], size: [len - 0.012, CH - 0.24, 0.02], rotY: Math.PI / 2 });
    }
    const nb = Math.max(2, Math.round(CW / 1.0));
    for (let i = 0; i < nb; i++) { const len = CW / nb; out.push({ pos: [-CW / 2 + len * (i + 0.5), CH / 2 + 0.06, CD - 0.01], size: [len - 0.012, CH - 0.24, 0.02], rotY: 0 }); }
    return out;
  }, [CW, CD, CH]);
  useFrame(() => {
    const g = ref.current; if (!g) return;
    // Outside, the car comes down the shaft to you; inside, you go with it.
    g.position.y = lift.enter > 0.3 ? 0 : (lift.p - 1) * geo.FH;
    if (lamp.current) lamp.current.intensity = (geo.phone ? 5 : 7.5) * (0.35 + 0.65 * lift.lights);
  });
  return (
    <group ref={ref}>
      <mesh geometry={front} material={M.wall} position-z={-0.02} castShadow receiveShadow />
      <mesh material={M.seam} position={[0, CH / 2, CD + 0.02]}><boxGeometry args={[CW + 0.1, CH + 0.1, 0.02]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} material={M.seam} position={[s * (CW / 2 + 0.02), CH / 2, CD / 2]}><boxGeometry args={[0.02, CH + 0.1, CD + 0.2]} /></mesh>)}
      {panels.map((p, i) => (
        <mesh key={i} material={M.wall} position={p.pos} rotation-y={p.rotY} receiveShadow><boxGeometry args={p.size} /></mesh>
      ))}
      {/* Kick plates and the ceiling cornice. */}
      {[-1, 1].map((s) => <mesh key={s} material={M.dark} position={[s * (CW / 2 - 0.02), 0.08, CD / 2 + 0.06]}><boxGeometry args={[0.03, 0.16, CD - 0.1]} /></mesh>)}
      <mesh material={M.dark} position={[0, 0.08, CD - 0.02]}><boxGeometry args={[CW, 0.16, 0.03]} /></mesh>
      {/* Brass handrails. */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={M.brassM} position={[s * (CW / 2 - 0.07), 0.92, CD / 2 + 0.25]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.02, 0.02, CD - 0.9, 16]} /></mesh>
          {[0.5, CD - 0.2].map((z) => <mesh key={z} material={M.brassM} position={[s * (CW / 2 - 0.04), 0.92, z - (z > 1 ? 0.05 : -0.05)]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.06, 10]} /></mesh>)}
        </group>
      ))}
      <mesh material={M.brassM} position={[0, 0.92, CD - 0.07]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.02, 0.02, CW - 0.3, 16]} /></mesh>
      <mesh material={M.floor} rotation-x={-Math.PI / 2} position={[0, 0, 0.1 + CD / 2]} receiveShadow><planeGeometry args={[CW, CD]} /></mesh>
      <mesh material={M.sillM} rotation-x={-Math.PI / 2} position={[0, 0.003, 0.04]} receiveShadow><planeGeometry args={[W + 0.06, 0.14]} /></mesh>
      <mesh material={M.dark} position={[0, CH + 0.01, CD / 2]} rotation-x={Math.PI / 2}><planeGeometry args={[CW, CD + 0.2]} /></mesh>
      <mesh material={M.light} position={[0, CH - 0.005, CD / 2 + 0.05]} rotation-x={Math.PI / 2}><planeGeometry args={[CW * 0.62, CD * 0.6]} /></mesh>
      <mesh material={M.brassM} position={[0, CH - 0.04, 0.16]}><boxGeometry args={[CW, 0.08, 0.04]} /></mesh>
      <pointLight ref={lamp} position={[0, CH - 0.35, CD * 0.55]} color="#ffe2b5" distance={7} decay={1.6} intensity={6} />
      <Dial M={M} y={H + 0.18} z={0.11} flip={false} r={geo.dialR * 0.92} />
      {/* The underside of the car, for when it is up the shaft. */}
      <mesh material={M.shaft} position={[0, -0.25, CD / 2]}><boxGeometry args={[CW + 0.1, 0.5, CD + 0.2]} /></mesh>
    </group>
  );
}

/** The shaft, seen from the lobby through the letters before the car arrives. */
function Shaft({ geo, M }: { geo: Geo; M: M }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.visible = lift.enter < 0.42; });
  const { CW, CD } = geo;
  return (
    <group ref={ref}>
      <mesh material={M.shaft} position={[0, 4, CD + 0.35]}><boxGeometry args={[CW + 1, 30, 0.1]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} material={M.shaft} position={[s * (CW / 2 + 0.4), 4, CD / 2 + 0.2]}><boxGeometry args={[0.1, 30, CD + 0.3]} /></mesh>)}
      {[-0.4, 0.4].map((x) => <mesh key={x} material={M.edge} position={[x, 8, CD + 0.2]}><cylinderGeometry args={[0.012, 0.012, 30, 6]} /></mesh>)}
    </group>
  );
}

/** Light from the room beyond the doors, falling into the car past the doors. */
function RoomLight({ geo }: { geo: Geo }) {
  const ref = useRef<THREE.SpotLight>(null);
  const col = useMemo(() => new THREE.Color(), []);
  const { scene } = useThree();
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, 0, geo.CD * 0.7); return o; }, [geo.CD]);
  useEffect(() => { scene.add(target); return () => { scene.remove(target); }; }, [scene, target]);
  useFrame((_, dt) => {
    const l = ref.current; if (!l) return;
    const i = lift.at >= 0 ? lift.at : 1;
    col.set(LIGHT[i]);
    l.color.lerp(col, 1 - Math.exp(-dt * 4));
    const want = lift.enter < 0.42 ? 6 : (i === 0 ? 1.2 : 22) * clamp(lift.doors * 1.3);
    l.intensity = damp(l.intensity, want, 8, dt);
  });
  return (
    <spotLight ref={ref} target={target} position={[0, 2.4, -2.6]} angle={0.62} penumbra={0.55} decay={1.2} distance={9} intensity={0}
      castShadow shadow-mapSize-width={geo.phone ? 512 : 1024} shadow-mapSize-height={geo.phone ? 512 : 1024} shadow-bias={-0.0004} shadow-camera-near={0.5} shadow-camera-far={9} />
  );
}

/* ------------------------------------------------------------------ */
/* Camera, the machine, and the DOM rooms                               */
/* ------------------------------------------------------------------ */
function Rig({ geo, rooms, floors, shaft, host, root, M }: Props & { M: M }) {
  const { camera, size } = useThree();
  const css = useMemo(() => new CSS3DRenderer(), []);
  const cssScene = useMemo(() => new THREE.Scene(), []);
  const ptr = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const st = useRef({ arrive: 0, b: 0, shift: 0, lit: -2 });

  useEffect(() => {
    css.domElement.className = 'css3d';
    host.appendChild(css.domElement);
    const objs: CSS3DObject[] = [];
    const add = (el: HTMLElement, z: number) => {
      const o = new CSS3DObject(el);
      o.position.set(0, geo.room.cy, z);
      o.scale.setScalar(1 / geo.PX);
      cssScene.add(o); objs.push(o);
    };
    rooms.forEach((el) => add(el, geo.room.z));
    // Each room's floor, from the sill out to its far wall.
    floors.forEach((el) => {
      const o = new CSS3DObject(el);
      o.position.set(0, 0.001, (geo.room.z - 0.2) / 2);
      o.rotation.x = -Math.PI / 2;
      o.scale.setScalar(1 / geo.PX);
      cssScene.add(o); objs.push(o);
    });
    const sh = new CSS3DObject(shaft);
    sh.position.set(0, geo.H / 2, -0.32); sh.scale.setScalar(1 / geo.PX);
    cssScene.add(sh); objs.push(sh);
    return () => { objs.forEach((o) => cssScene.remove(o)); css.domElement.remove(); };
  }, [css, cssScene, host, rooms, floors, shaft, geo]);

  useEffect(() => { css.setSize(size.width, size.height); }, [css, size]);

  useEffect(() => {
    const mv = (e: PointerEvent) => { if (e.pointerType === 'mouse') { ptr.current.x = e.clientX / innerWidth - 0.5; ptr.current.y = e.clientY / innerHeight - 0.5; } };
    window.addEventListener('pointermove', mv, { passive: true });
    return () => window.removeEventListener('pointermove', mv);
  }, []);

  const cam = camera as THREE.PerspectiveCamera;
  useFrame((state, rawDt) => {
    const dt = Math.min(0.2, rawDt);
    step(dt);
    const s = st.current, p = ptr.current, t = lift.t;
    p.sx = damp(p.sx, p.x, 3, dt); p.sy = damp(p.sy, p.y, 3, dt);
    s.arrive = damp(s.arrive, lift.at > 0 ? smooth(clamp(lift.doors)) : 0, 2.4, dt);
    s.b = damp(s.b, lift.at === 0 && lift.phase === 'inside' ? 1 : 0, 2.2, dt);

    // Walk in, turn round, step back.
    const e = lift.enter;
    const a = smooth(clamp(e / 0.46)), b = smooth(clamp((e - 0.38) / 0.4)), c = smooth(clamp((e - 0.72) / 0.28));
    const zIn = THREE.MathUtils.lerp(geo.rideZ, geo.arriveZ, s.arrive);
    let z = THREE.MathUtils.lerp(geo.outZ, geo.midZ, a);
    z = THREE.MathUtils.lerp(z, zIn, c);
    let y = THREE.MathUtils.lerp(geo.outY, geo.camY, a);
    let yaw = Math.PI + b * Math.PI;
    let x = 0, roll = 0, pitch = THREE.MathUtils.lerp(geo.outPitch, geo.pitch, a);

    // The ride: a slight sway, a dip as it starts and stops, the alarm's shake.
    const v = Math.abs(lift.v), sway = Math.min(1, v) * (e >= 1 ? 1 : 0);
    x += Math.sin(t * 2.1) * 0.006 * sway;
    roll += Math.sin(t * 1.7) * 0.0035 * sway + Math.sin(t * 9) * 0.0006 * sway;
    y += -Math.exp(-lift.jolt * 4) * Math.sin(lift.jolt * 13) * 0.012 * (e >= 1 ? 1 : 0);
    const sh = lift.shake * lift.shake;
    x += (Math.sin(t * 71) + Math.sin(t * 43)) * 0.01 * sh; y += Math.sin(t * 57) * 0.008 * sh; roll += Math.sin(t * 63) * 0.01 * sh;
    // The basement: turn to the plate on the left wall.
    yaw += s.b * geo.bYaw;
    x += s.b * geo.bX;
    // The pointer leans the head a little.
    yaw -= p.sx * 0.05; pitch -= p.sy * 0.03;

    cam.position.set(x, y, z);
    cam.rotation.set(pitch, yaw, roll, 'YXZ');
    // Make room for the panel on the right once you are in.
    const shift = geo.panelShift * smooth(clamp((e - 0.6) / 0.4));
    if (Math.abs(shift - s.shift) > 0.3 || (shift === 0 && s.shift !== 0)) {
      s.shift = shift;
      if (shift > 0) cam.setViewOffset(size.width, size.height, shift, 0, size.width, size.height); else cam.clearViewOffset();
    }
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    const lit = Math.round(clamp(lift.p, 0, FLOORS.length - 1));
    if (lit !== s.lit) { s.lit = lit; M.dial.draw(lit); }
    M.btn.emissiveIntensity = lift.phase === 'calling' ? 2 + Math.sin(t * 8) * 0.6 : 0;

    // The shaft behind the doors runs past as the car moves.
    shaft.style.setProperty('--ride', `${(lift.p * geo.FH * geo.PX).toFixed(1)}px`);

    state.gl.render(state.scene, cam);
    css.render(cssScene, cam);
  }, 1);

  // Where the call button sits on screen, for the real button over it.
  useFrame(() => {
    if (lift.enter > 0.05) return;
    const v = new THREE.Vector3(geo.call[0], geo.call[1], -0.26).project(cam);
    root.style.setProperty('--call-x', `${((v.x + 1) / 2) * size.width}px`);
    root.style.setProperty('--call-y', `${((1 - v.y) / 2) * size.height}px`);
    const d = new THREE.Vector3(0, geo.H + 0.62, -0.3).project(cam);
    root.style.setProperty('--sign-y', `${((1 - d.y) / 2) * size.height}px`);
  });
  return null;
}

export default function Stage(props: Props) {
  const M = useMemo(makeMaterials, []);
  useEffect(() => () => { Object.values(M).forEach((m) => { if (m instanceof THREE.Material) m.dispose(); }); }, [M]);
  const { geo } = props;
  return (
    <Canvas
      frameloop="always" shadows={{ type: THREE.PCFShadowMap }} dpr={[1, geo.phone ? 1.5 : 1.6]}
      camera={{ fov: geo.fov, near: 0.05, far: 60, position: [0, geo.outY, geo.outZ] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}
      style={{ touchAction: 'pan-y', pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.12} color="#ffe9c9" />
      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#1c1814']} />
        <Lightformer form="rect" intensity={3.2} color="#fff1d8" position={[0, 6, 1.5]} rotation-x={Math.PI / 2} scale={[3, 3, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffd6a0" position={[0, 1.6, 6]} rotation-y={Math.PI} scale={[6, 2.4, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#ffc27a" position={[0, 1.8, -6]} scale={[7, 2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#e9eef6" position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[4, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#ffe8c8" position={[6, 2.6, 0]} rotation-y={-Math.PI / 2} scale={[4, 0.6, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#6b5440" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[12, 12, 1]} />
      </Environment>
      <Hall geo={geo} M={M} />
      <Shaft geo={geo} M={M} />
      <Car geo={geo} M={M} />
      <Leaf side={-1} geo={geo} M={M} />
      <Leaf side={1} geo={geo} M={M} />
      <RoomLight geo={geo} />
      <Rig {...props} M={M} />
    </Canvas>
  );
}
