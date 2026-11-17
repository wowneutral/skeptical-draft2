// The trophy: a museum piece on a turntable. Marble base, a ring of brass plates,
// a slender brass column and the question mark cast in dark bronze.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei';
import { EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import MARKS from '@/lib/marks.json';
import { RECORD } from '@/content';
import { clamp, damp, still } from '@/lib/utils';
import { brushedTexture, makePlate, marbleTexture, SERIF, type Plate } from './tex';
import { FACET, T } from './store';

const BG = '#0d0c0b';
const N = 12;
const VISITOR = 6;
const PLATE_Y = 0.63;

/** Camera stops: yaw of the trophy (deg), distance, camera height, target height, screen shift x, y. */
type Shot = [number, number, number, number, number, number];
const DESK: Shot[] = [
  [25, 15.5, 3.0, 2.45, 0.2, 0.02],
  [140, 14.5, 4.2, 2.6, 0.24, 0],
  [345, 4.7, 1.25, PLATE_Y + 0.12, 0.25, 0],
  [420, 17, 2.2, 2.3, 0.28, 0],
  [475, 16, 4.8, 2.2, 0.27, 0],
  [540, 4.5, 1.2, PLATE_Y + 0.1, 0.25, 0],
  [565, 22, 2.8, 2.45, 0, -0.25],
];
const PHONE: Shot[] = [
  [25, 20, 3.0, 2.45, 0, -0.25],
  [140, 19, 4.4, 2.5, 0, -0.27],
  [345, 6.4, 1.3, PLATE_Y + 0.1, 0, -0.27],
  [420, 21, 2.2, 2.3, 0, -0.28],
  [475, 20, 4.8, 2.2, 0, -0.28],
  [540, 6.6, 1.3, PLATE_Y + 0.1, 0, -0.27],
  [565, 24, 2.6, 2.4, 0, -0.3],
];

function useMarkGeometry() {
  return useMemo(() => {
    const m = MARKS.italic;
    const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${m.d}"/></svg>`);
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const g = new THREE.ExtrudeGeometry(shapes, { depth: 150, bevelEnabled: true, bevelThickness: 22, bevelSize: 16, bevelSegments: 4, curveSegments: 18 });
    g.scale(1, -1, 1);
    g.computeBoundingBox();
    const b = g.boundingBox!;
    g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
    const s = 1.42 / (b.max.y - b.min.y);
    g.scale(s, s, s);
    g.computeVertexNormals();
    // Patina in the hollows, worn bronze on the edges and the top of the curve.
    const pos = g.getAttribute('position'), nor = g.getAttribute('normal');
    const col = new Float32Array(pos.count * 3);
    const dark = new THREE.Color('#5c4530'), green = new THREE.Color('#4a4a3a'), worn = new THREE.Color('#e2b678');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const nz = Math.abs(nor.getZ(i)), ny = nor.getY(i);
      const y = pos.getY(i), x = pos.getX(i);
      const edge = clamp((nz - 0.12) / 0.4) * (1 - clamp((nz - 0.86) / 0.12));
      const top = clamp(ny) * clamp((y - 0.55) / 0.6);
      const grain = 0.5 + 0.5 * Math.sin(x * 23 + y * 31) * Math.sin(y * 17 - x * 11);
      const w = clamp(edge * 0.85 + top * 0.55 + grain * 0.08);
      c.copy(dark).lerp(green, clamp(1 - nz) * 0.6 * (1 - w)).lerp(worn, w * w);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
}

function useColumnGeometry() {
  return useMemo(() => {
    // radius, height: a turned brass stem with a knop and a cup for the mark to stand in.
    const P: [number, number][] = [
      [0.001, 0], [0.34, 0], [0.34, 0.05], [0.3, 0.07], [0.22, 0.12], [0.15, 0.2], [0.11, 0.32], [0.095, 0.5],
      [0.09, 0.8], [0.12, 0.86], [0.13, 0.9], [0.12, 0.94], [0.1, 0.97], [0.17, 1.06], [0.21, 1.16], [0.17, 1.26], [0.1, 1.34],
      [0.085, 1.4], [0.08, 1.8], [0.085, 1.95], [0.11, 2.0], [0.12, 2.04], [0.1, 2.07], [0.14, 2.12], [0.26, 2.2], [0.3, 2.25], [0.3, 2.29], [0.001, 2.29],
    ];
    const g = new THREE.LatheGeometry(P.map(([r, y]) => new THREE.Vector2(r, y)), 72);
    return g;
  }, []);
}

function prism(rTop: number, rBot: number, h: number) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, N, 1, false, -Math.PI / N);
  return g;
}

function Trophy({ phone }: { phone: boolean }) {
  const spin = useRef<THREE.Group>(null);
  const visitor = useRef<THREE.Group>(null);
  const mark = useMarkGeometry();
  const column = useColumnGeometry();
  const marble = useMemo(() => marbleTexture(phone), [phone]);
  const brushed = useMemo(() => brushedTexture(), []);
  const plates = useMemo(() => ({ a: makePlate(1024, 512, 5), b: makePlate(1024, 512, 6), v: makePlate(1024, 512, 7), blank: makePlate(512, 256, 8) }), []);
  const edges = useRef<number[]>([]);
  const ver = useRef(-1);

  // Draw the two results, then the visitor's plate, once the serif has loaded.
  useEffect(() => {
    let live = true;
    const go = () => {
      if (!live) return;
      const [s, n] = RECORD.results;
      plates.a.draw([s.who.toUpperCase(), s.what.toUpperCase()]);
      plates.b.draw([n.who.toUpperCase(), n.what.toUpperCase()]);
      ver.current = -1;
    };
    go();
    document.fonts.load(`600 40px ${SERIF}`).then(go, go);
    document.fonts.load(`500 40px ${SERIF}`).then(go, go);
    return () => { live = false; };
  }, [plates]);

  const mats = useMemo(() => {
    const stone = new THREE.MeshPhysicalMaterial({ map: marble, roughness: 0.38, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.5, flatShading: true, envMapIntensity: 0.55 });
    const brass = new THREE.MeshPhysicalMaterial({ color: '#c09a5e', metalness: 1, roughness: 0.32, roughnessMap: brushed, clearcoat: 0.6, clearcoatRoughness: 0.18, anisotropy: 0.75, envMapIntensity: 1.15 });
    const bronze = new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.6, roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.35, envMapIntensity: 1.8 });
    const plinth = new THREE.MeshPhysicalMaterial({ color: '#131210', roughness: 0.42, metalness: 0.1, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    const face = (p: Plate) => new THREE.MeshPhysicalMaterial({ map: p.map, bumpMap: p.map, bumpScale: 2.6, roughnessMap: p.rough, roughness: 1, metalness: 0.9, clearcoat: 0.45, clearcoatRoughness: 0.25, anisotropy: 0.5, envMapIntensity: 2.4 });
    return { stone, brass, bronze, plinth, a: face(plates.a), b: face(plates.b), v: face(plates.v), blank: face(plates.blank) };
  }, [marble, brushed, plates]);

  const geo = useMemo(() => ({
    s1: prism(1.22, 1.22, 0.24), c1: prism(1.19, 1.22, 0.025),
    s2: prism(1.0, 1.0, 0.46), c2: prism(0.97, 1.0, 0.02),
    s3: prism(0.74, 0.74, 0.18), c3: prism(0.71, 0.74, 0.02),
  }), []);

  const PW = 0.42, PH = 0.21, PD = 0.016;
  const apothem = 1.0 * Math.cos(Math.PI / N);

  useFrame((_, rawDt) => {
    rawDt = Math.min(rawDt, 0.5);
    const dt = rawDt;
    const t = T.turn;
    if (!still) {
      if (!t.drag) {
        t.g += t.flick * dt; t.flick *= Math.exp(-2.4 * dt);
        if (Math.abs(t.flick) < 0.25) {
          const snap = Math.round(t.g / FACET) * FACET; // settle on a plate, like a detent
          t.g = damp(t.g, snap, 3, dt);
          t.flick = 0;
        }
      }
      const K = 55, C = 8.5;
      for (let h = rawDt; h > 0; h -= 1 / 120) {
        const s = Math.min(h, 1 / 120);
        t.w += (K * (t.g - t.u) - C * t.w) * s;
        t.u += t.w * s;
      }
    }
    const g = spin.current; if (!g) return;
    const shots = phone ? PHONE : DESK;
    const f = T.f, i = Math.floor(f), k = f - i;
    const a = shots[clamp(i, 0, shots.length - 1)], b = shots[clamp(i + 1, 0, shots.length - 1)];
    const yaw = still ? -15 : a[0] + (b[0] - a[0]) * k;
    g.rotation.y = (yaw * Math.PI) / 180 + (still ? 0 : t.u);
    // The visitor's plate eases out of the ring at Join.
    const out = still ? 0 : clamp(1 - Math.abs(f - 5) * 1.6);
    if (visitor.current) visitor.current.position.z = apothem + PD / 2 + out * 0.035;
    // Engraving, letter by letter.
    const pl = T.plate;
    if (pl.ver !== ver.current) {
      ver.current = pl.ver;
      edges.current = plates.v.draw(pl.text ? [pl.text] : [], 0);
      if (pl.dur === 0) plates.v.draw(pl.text ? [pl.text] : [], 1);
    }
    if (pl.dur > 0 && pl.text) {
      const p = clamp((performance.now() - pl.start) / pl.dur);
      const e = edges.current, n = e.length - 1;
      if (p >= 1) { plates.v.draw([pl.text], 1); pl.dur = 0; }
      else if (n > 0) {
        const q = p * n, li = Math.floor(q), fr = q - li;
        const x = e[li] + (e[li + 1] - e[li]) * fr;
        plates.v.draw([pl.text], x / 1024, x);
      }
    }
  });

  return (
    <group ref={spin}>
      {/* turntable plinth */}
      <mesh position-y={0.08} material={mats.plinth} castShadow receiveShadow>
        <cylinderGeometry args={[1.58, 1.62, 0.16, 96]} />
      </mesh>
      <mesh position-y={0.163} material={mats.brass} receiveShadow>
        <cylinderGeometry args={[1.585, 1.585, 0.008, 96, 1, true]} />
      </mesh>
      {/* stepped marble base */}
      <mesh geometry={geo.s1} position-y={0.16 + 0.12} material={mats.stone} castShadow receiveShadow />
      <mesh geometry={geo.c1} position-y={0.4 + 0.0125} material={mats.stone} castShadow receiveShadow />
      <mesh geometry={geo.s2} position-y={0.4 + 0.23} material={mats.stone} castShadow receiveShadow />
      <mesh geometry={geo.c2} position-y={0.86 + 0.01} material={mats.stone} castShadow receiveShadow />
      <mesh geometry={geo.s3} position-y={0.86 + 0.09} material={mats.stone} castShadow receiveShadow />
      <mesh geometry={geo.c3} position-y={1.04 + 0.01} material={mats.stone} castShadow receiveShadow />
      {/* the ring of plates */}
      {Array.from({ length: N }, (_, k) => {
        const face = k === 0 ? mats.a : k === 1 ? mats.b : k === VISITOR ? mats.v : mats.blank;
        return (
          <group key={k} rotation-y={k * FACET}>
            <group ref={k === VISITOR ? visitor : undefined} position={[0, PLATE_Y, apothem + PD / 2]}>
              <mesh material={mats.brass} castShadow receiveShadow>
                <boxGeometry args={[PW, PH, PD]} />
              </mesh>
              <mesh position-z={PD / 2 + 0.0006} material={face} receiveShadow>
                <planeGeometry args={[PW - 0.004, PH - 0.004]} />
              </mesh>
            </group>
          </group>
        );
      })}
      {/* column and mark */}
      <mesh geometry={column} position-y={1.06} material={mats.brass} castShadow receiveShadow />
      <mesh geometry={mark} position-y={1.06 + 2.27} material={mats.bronze} castShadow receiveShadow />
    </group>
  );
}

function Rig({ phone }: { phone: boolean }) {
  const { camera, size } = useThree();
  const key = useRef<THREE.SpotLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const cur = useRef<Shot | null>(null);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.5);
    const shots = phone ? PHONE : DESK;
    const f = still ? 0 : T.f, i = Math.floor(f), k = f - i;
    const a = shots[clamp(i, 0, shots.length - 1)], b = shots[clamp(i + 1, 0, shots.length - 1)];
    const want = a.map((v, j) => v + (b[j] - v) * k) as Shot;
    if (!cur.current) cur.current = [...want] as Shot;
    const c = cur.current;
    for (let j = 1; j < 6; j++) c[j] = still ? want[j] : damp(c[j], want[j], 4.2, dt);
    const cam = camera as THREE.PerspectiveCamera;
    const elev = c[2] - c[3];
    const flat = Math.sqrt(Math.max(0.01, c[1] * c[1] - elev * elev));
    cam.position.set(0, c[2], flat);
    look.set(0, c[3], 0);
    cam.lookAt(look);
    const W = size.width, H = size.height;
    cam.setViewOffset(W, H, -c[4] * W, -c[5] * H, W, H);
    // The opening: the key light comes up on the piece.
    const o = still ? 1 : T.opened ? clamp((performance.now() - T.openedAt) / 1800) : 0;
    const e = o * o * (3 - 2 * o);
    if (key.current) key.current.intensity = 260 * (0.08 + 0.92 * e);
    if (rim.current) rim.current.intensity = 2.4 * clamp(e * 1.4);
  });
  return (
    <>
      <spotLight ref={key} position={[2.6, 10, 4.2]} angle={0.44} penumbra={0.75} distance={22} decay={2} castShadow
        shadow-mapSize={[phone ? 1024 : 2048, phone ? 1024 : 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03} color="#ffdcb0" intensity={0} />
      <directionalLight ref={rim} position={[-5, 4.5, -6]} color="#a9bfe0" intensity={0} />
      <ambientLight intensity={0.05} />
    </>
  );
}

export default function Scene({ phone }: { phone: boolean }) {
  return (
    <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.6]} frameloop="always"
      camera={{ fov: phone ? 30 : 24, near: 0.1, far: 80, position: [0, 3, 15] }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 14, 34]} />
      <Trophy phone={phone} />
      <Rig phone={phone} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <MeshReflectorMaterial blur={[400, 120]} resolution={phone ? 384 : 1024} mixBlur={1} mixStrength={7} mixContrast={1} roughness={0.85} depthScale={1} minDepthThreshold={0.4} maxDepthThreshold={1.3} color="#0f0e0c" metalness={0.25} mirror={0.5} envMapIntensity={0} />
      </mesh>
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#060606']} />
        <Lightformer form="rect" intensity={2.6} color="#ffe6c4" position={[2, 7, 3]} scale={[5, 3, 1]} rotation-x={Math.PI / 2.4} />
        <Lightformer form="rect" intensity={1.1} color="#c8d6ee" position={[-6, 2, -3]} scale={[1, 6, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.4} color="#ffe2bd" position={[6, 2.5, 1]} scale={[0.8, 6, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" intensity={0.9} color="#f3dcb8" position={[0, 0.6, 8]} scale={[14, 2.6, 1]} rotation-y={Math.PI} />
        <Lightformer form="rect" intensity={2.2} color="#bcd0f0" position={[-3, 5, -6]} scale={[2.5, 7, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffe6c4" position={[3.5, 6, -5]} scale={[1.5, 5, 1]} />
      </Environment>
      <EffectComposer multisampling={phone ? 0 : 4}>
        <N8AO halfRes aoRadius={0.35} intensity={2.2} distanceFalloff={0.5} color="#000000" />
        <Vignette offset={0.3} darkness={0.55} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
