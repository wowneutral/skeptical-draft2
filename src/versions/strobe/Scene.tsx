// The turntable. Sixteen plaster figures on a black platter under one soft key
// from above and a faint rim. The table has real momentum; above a threshold
// speed it is drawn only at angles locked to the figure spacing (plus a slow
// drift), so every slot holds one figure that animates in place. Motion only:
// the light never flickers.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';
import { clamp, damp } from '@/lib/utils';
import { N, STEP, bendOf, centreline, DOT } from './geo';
import { st, keyAt, now, type Key } from './store';

const S = 0.72; // figure scale
const R = 1.62; // ring radius
const PR = 2.18; // platter radius
const TOP = 0.78; // platter top
const D2R = Math.PI / 180;

type Frame = { el: number; az: number; z: number; tx: number; ty: number; tz: number; ox: number; oy: number; key: number; spot: number };
const F = (el: number, az: number, z: number, ox: number, oy: number, key = 1, spot = 0, ty = 0.95, tz = 0, tx = 0): Frame => ({ el, az, z, ox, oy, key, spot, tx, ty, tz });

const WIDE: Record<Key, Frame> = {
  hero: F(17, -14, 0.92, 0.2, 0.0, 1, 0, 1.15),
  manifesto: F(12, 16, 0.82, 0.2, 0.0),
  record: F(88.5, 0, 1.0, 0.2, 0.0),
  drive: F(7, 0, 0.5, 0.2, -0.02, 0.07, 1, 1.25, R * 0.75),
  people: F(30, -34, 0.9, 0.2, 0.02),
  join: F(4, 0, 0.64, 0, 0.17, 0.9, 0.55, 1.3, R * 0.5),
  end: F(10, 0, 0.3, 0, 0.16, 0.05, 1, 1.45, R),
};
const NARROW: Record<Key, Frame> = {
  hero: F(50, 0, 1.0, 0, 0.2),
  manifesto: F(30, 18, 0.9, 0, 0.2),
  record: F(88.5, 0, 1.0, 0, 0.2),
  drive: F(8, 0, 0.5, 0, 0.2, 0.07, 1, 1.25, R * 0.75),
  people: F(32, -30, 1.0, 0, 0.2),
  join: F(5, 0, 0.62, 0, 0.22, 0.9, 0.55, 1.3, R * 0.5),
  end: F(10, 0, 0.36, 0, 0.2, 0.05, 1, 1.45, R),
};

/* ---------- textures drawn on a canvas ---------- */

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, color = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Plaster: fine grain with a few soft pits. */
function plasterBump() {
  const t = canvasTex(256, 256, (g) => {
    const img = g.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 70; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,60,60,${0.2 + Math.random() * 0.3})`; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 0.6 + Math.random() * 1.6, 0, 7); g.fill(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 1);
  return t;
}

/** Concentric lathe marks on the platter top, as roughness. */
function grooves() {
  return canvasTex(1024, 1024, (g) => {
    g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 1024, 1024);
    for (let r = 4; r < 512; r += 1.5) { const v = 100 + Math.random() * 60; g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1; g.beginPath(); g.arc(512, 512, r, 0, 7); g.stroke(); }
  });
}

/** A soft occlusion pool, multiplied under things that stand on something. */
function pool() {
  return canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
}

/* ---------- geometry ---------- */

/** One stroke as a solid: an elliptical section swept along the centreline, with rounded ends. */
function strokeGeometry(b: number) {
  const L = centreline(b, 110);
  const rings: { x: number; y: number; nx: number; ny: number; r: number }[] = [];
  const CAP = 7;
  const s0 = L[0], e = L[L.length - 1];
  for (let j = CAP; j >= 1; j--) { const a = (j / CAP) * (Math.PI / 2); rings.push({ x: s0.x - s0.tx * s0.r * Math.sin(a), y: s0.y - s0.ty * s0.r * Math.sin(a), nx: -s0.ty, ny: s0.tx, r: s0.r * Math.cos(a) }); }
  for (const p of L) rings.push({ x: p.x, y: p.y, nx: -p.ty, ny: p.tx, r: p.r });
  for (let j = 1; j <= CAP; j++) { const a = (j / CAP) * (Math.PI / 2); rings.push({ x: e.x + e.tx * e.r * Math.sin(a), y: e.y + e.ty * e.r * Math.sin(a), nx: -e.ty, ny: e.tx, r: e.r * Math.cos(a) }); }
  const SEG = 18;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  rings.forEach((g, i) => {
    for (let k = 0; k <= SEG; k++) {
      const f = (k / SEG) * Math.PI * 2;
      const c = Math.cos(f), s = Math.sin(f);
      pos.push(g.x + g.nx * g.r * c, g.y + g.ny * g.r * c, g.r * 0.82 * s);
      uv.push(i / (rings.length - 1), k / SEG);
    }
  });
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < SEG; k++) {
    const a = i * (SEG + 1) + k, b2 = a + SEG + 1;
    idx.push(a, a + 1, b2, b2, a + 1, b2 + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** A lathe with chamfered edges: points are (radius, y) from the axis outward. */
const lathe = (pts: [number, number][], seg = 96) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

/* ---------- the scene ---------- */

function Table({ phone }: { phone: boolean }) {
  const { camera, size, scene } = useThree();
  const spin = useRef<THREE.Group>(null);
  const key = useRef<THREE.SpotLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const live = useRef({ t: 0, el: 30, az: -30, z: 1.25, ox: 0.2, oy: 0.03, key: 0, spot: 0, tx: 0, ty: 0.95, tz: 0, drift: 0, offset: 0, prevK: 'hero' as Key });

  const assets = useMemo(() => {
    const bump = plasterBump();
    const plaster = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#ece6d9'), roughness: 0.88, metalness: 0, bumpMap: bump, bumpScale: 0.6, sheen: 0.35, sheenRoughness: 0.9, sheenColor: new THREE.Color('#fff8ec') });
    const plinthMat = new THREE.MeshPhysicalMaterial({ color: '#1e1d1b', roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3 });
    const pin = new THREE.MeshStandardMaterial({ color: '#1a1714', roughness: 0.35, metalness: 0.9 });
    const lacquer = new THREE.MeshPhysicalMaterial({ color: '#0d0d0e', roughness: 0.5, roughnessMap: grooves(), metalness: 0.0, clearcoat: 0.55, clearcoatRoughness: 0.32 });
    const drum = new THREE.MeshPhysicalMaterial({ color: '#111112', roughness: 0.62, metalness: 0, clearcoat: 0.2, clearcoatRoughness: 0.6 });
    const floor = new THREE.MeshStandardMaterial({ color: '#100f0e', roughness: 0.96 });
    const poolTex = pool();
    const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, opacity: 0.9 });
    const strokes = Array.from({ length: N }, (_, k) => strokeGeometry(bendOf(k)));
    const dot = new THREE.SphereGeometry(DOT.r, 32, 20);
    const pinG = new THREE.CylinderGeometry(0.014, 0.014, 0.2, 10);
    const plinthG = lathe([[0, 0], [0.19, 0], [0.205, 0.012], [0.205, 0.052], [0.19, 0.066], [0, 0.066]], 40);
    const drumG = lathe([[0, 0], [2.42, 0], [2.46, 0.03], [2.46, 0.5], [2.42, 0.54], [2.3, 0.56], [0, 0.56]]);
    const platterG = lathe([[0, 0.6], [PR - 0.06, 0.6], [PR, 0.64], [PR, TOP - 0.035], [PR - 0.035, TOP], [0, TOP]]);
    const topG = new THREE.CircleGeometry(PR - 0.04, 96).rotateX(-Math.PI / 2).translate(0, TOP + 0.001, 0);
    const capG = lathe([[0, TOP], [0.16, TOP], [0.16, TOP + 0.03], [0.12, TOP + 0.06], [0, TOP + 0.07]], 40);
    return { plaster, plinthMat, pin, lacquer, drum, floor, poolMat, strokes, dot, pinG, plinthG, drumG, platterG, topG, capG };
  }, []);

  useMemo(() => {
    scene.environmentIntensity = 0.28;
    scene.fog = new THREE.Fog('#0a0a0a', 16, 34);
  }, [scene]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.2, dtRaw);
    const v = live.current;
    v.t += dt;
    st.k = keyAt(scroll.y);
    const f = (phone ? NARROW : WIDE)[st.k];
    const t = now();
    const user = st.drag || t - st.lastUser < 1.4;

    /* the table: momentum, friction, scroll as a torque, and a stop where a section asks for one */
    if (!st.drag) {
      const drive = scroll.v * 1.7;
      if (Math.abs(drive) > 0.08 && Math.abs(drive) > Math.abs(st.omega) * 0.9 && st.k !== 'drive') st.omega = damp(st.omega, drive, 5, dt);
      // viscous drag plus a little dry friction, so it always comes to a clean stop
      st.omega *= Math.exp(-0.62 * dt);
      st.omega -= Math.sign(st.omega) * Math.min(Math.abs(st.omega), 0.28 * dt);
      const hold = st.k === 'drive' ? 1 + st.sel * 2 : st.k === 'join' || st.k === 'end' ? N / 2 : -1;
      if (hold >= 0 && !user) {
        if (st.k === 'drive') st.omega = 0; // stops dead
        else st.omega *= Math.exp(-2.2 * dt);
        const want = -hold * STEP;
        const d = want - st.theta;
        const target = st.theta + (((d % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        if (Math.abs(st.omega) < 0.6) st.theta = damp(st.theta, target, st.k === 'drive' ? 7 : 1.6, dt);
      }
      st.theta += st.omega * dt;
    }

    /* the zoetrope: above the threshold the table is only drawn at angles locked to the figure spacing */
    const w = Math.abs(st.omega);
    const fast = w > (st.strobe ? 1.5 : 1.9);
    if (fast && !st.strobe) { st.strobe = true; v.drift = st.theta - STEP * Math.round(st.theta / STEP); }
    if (st.strobe) {
      v.drift += Math.sign(st.omega) * 0.1 * dt;
      st.shown = STEP * Math.round(st.theta / STEP) + v.drift;
      if (!fast) { st.strobe = false; v.offset = st.shown - st.theta; }
    } else {
      v.offset = damp(v.offset, 0, 3.5, dt);
      st.shown = st.theta + v.offset;
    }
    if (spin.current) spin.current.rotation.y = st.shown;

    /* camera: a long lens on a slow dolly between the section frames */
    const open = clamp(v.t / 2.4); const oe = 1 - Math.pow(1 - open, 3);
    const lam = 2.2;
    v.el = damp(v.el, f.el, lam, dt); v.az = damp(v.az, f.az, lam, dt); v.z = damp(v.z, f.z * (1.18 - 0.18 * oe), lam, dt);
    v.ox = damp(v.ox, f.ox, lam, dt); v.oy = damp(v.oy, f.oy, lam, dt);
    v.tx = damp(v.tx, f.tx, lam, dt); v.ty = damp(v.ty, f.ty, lam, dt); v.tz = damp(v.tz, f.tz, lam, dt);
    v.key = damp(v.key, f.key * oe, st.k === 'drive' ? 4 : 2, dt); v.spot = damp(v.spot, f.spot, 2.5, dt);

    const cam = camera as THREE.PerspectiveCamera;
    const W = size.width, H = size.height, A = W / Math.max(1, H);
    const tv = Math.tan((cam.fov / 2) * D2R), th = tv * A;
    const fw = phone ? 0.92 : (f.ox > 0.05 ? 0.56 : 0.9), fh = phone ? 0.5 : 0.82;
    const rad = 2.75;
    const dist = Math.max(rad / (th * fw), rad / (tv * fh)) * v.z;
    const el = v.el * D2R, az = v.az * D2R;
    cam.position.set(v.tx + dist * Math.sin(az) * Math.cos(el), v.ty + dist * Math.sin(el), v.tz + dist * Math.cos(az) * Math.cos(el));
    cam.near = dist * 0.3; cam.far = dist * 3 + 20;
    const fog = scene.fog as THREE.Fog | null;
    if (fog) { fog.near = dist * 1.05; fog.far = dist * 2.1; }
    cam.lookAt(v.tx, v.ty, v.tz);
    cam.setViewOffset(W, H, v.ox * W, v.oy * H, W, H);
    cam.updateProjectionMatrix();

    if (key.current) key.current.intensity = 260 * v.key;
    if (rim.current) rim.current.intensity = 1.1 * Math.max(0.06, v.key);
    if (spot.current) spot.current.intensity = 330 * v.spot;
    scene.environmentIntensity = 0.03 + 0.5 * v.key;
  });

  const keyTarget = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, TOP, 0); return o; }, []);
  const spotTarget = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, TOP + 0.85, R); return o; }, []);

  return (
    <>
      <primitive object={keyTarget} />
      <primitive object={spotTarget} />
      <spotLight ref={key} position={[2.2, 9.6, 5.6]} angle={0.44} penumbra={0.95} decay={2} intensity={0} color="#fff4e4" castShadow
        shadow-mapSize={[phone ? 1024 : 2048, phone ? 1024 : 2048]} shadow-bias={-0.0002} shadow-normalBias={0.02} shadow-camera-near={5} shadow-camera-far={20} target={keyTarget} />
      <directionalLight ref={rim} position={[-5, 3.2, -7]} intensity={0} color="#d6dbe2" />
      <spotLight ref={spot} position={[0.5, 7.5, R + 3.4]} angle={0.078} penumbra={0.55} decay={2} intensity={0} color="#fff3df" castShadow={!phone}
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0002} target={spotTarget} />
      <hemisphereLight args={['#2a2723', '#050505', 0.25]} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 8, 2]} rotation-x={Math.PI / 2} scale={[9, 4, 1]} />
        <Lightformer form="rect" intensity={0.7} position={[-7, 2, -5]} rotation-y={Math.PI / 3} scale={[3, 6, 1]} />
        <Lightformer form="ring" intensity={0.5} position={[6, 3, 4]} scale={2} />
        <Lightformer form="rect" intensity={1.1} position={[0, 2.5, 9]} scale={[9, 3, 1]} />
      </Environment>

      {/* floor and the base */}
      <mesh geometry={new THREE.CircleGeometry(40, 64)} material={assets.floor} rotation-x={-Math.PI / 2} receiveShadow />
      <mesh material={assets.poolMat} rotation-x={-Math.PI / 2} position-y={0.004} renderOrder={1}><planeGeometry args={[7.4, 7.4]} /></mesh>
      <mesh geometry={assets.drumG} material={assets.drum} castShadow receiveShadow />

      <group ref={spin}>
        <mesh geometry={assets.platterG} material={assets.drum} castShadow receiveShadow />
        <mesh geometry={assets.topG} material={assets.lacquer} receiveShadow />
        <mesh geometry={assets.capG} material={assets.pin} castShadow />
        {assets.strokes.map((g, k) => {
          const a = k * STEP;
          return (
            <group key={k} position={[Math.sin(a) * R, TOP, Math.cos(a) * R]} rotation-y={a}>
              <mesh material={assets.poolMat} rotation-x={-Math.PI / 2} position-y={0.003} renderOrder={1}><planeGeometry args={[0.78, 0.78]} /></mesh>
              <mesh geometry={assets.plinthG} material={assets.plinthMat} castShadow receiveShadow />
              <group position-y={0.066 + (DOT.r - DOT.y) * S} scale={S}>
                <mesh geometry={assets.dot} material={assets.plaster} position-y={DOT.y} castShadow receiveShadow />
                <mesh geometry={assets.pinG} material={assets.pin} position-y={(DOT.y + DOT.r) / 2} scale-y={(-(DOT.y + DOT.r)) / 0.2 + 0.1} />
                <mesh geometry={g} material={assets.plaster} castShadow receiveShadow />
              </group>
            </group>
          );
        })}
      </group>
    </>
  );
}

export default function Scene({ phone }: { phone: boolean }) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={phone ? [1, 1.5] : [1, 1.6]}
      camera={{ fov: phone ? 30 : 24, position: [0, 4, 14], near: 1, far: 60 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.AgXToneMapping; gl.toneMappingExposure = 1.05; }}
      aria-hidden
    >
      <color attach="background" args={['#0a0a0a']} />
      <Table phone={phone} />
    </Canvas>
  );
}
