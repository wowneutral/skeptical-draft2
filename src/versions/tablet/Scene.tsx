// The tablet on dark stone: two bone leaves on a hinge, black wax in each,
// a red cord, a bronze stylus. One low raking light from the left.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { scroll } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { T, userCut } from './director';
import { CH, CW } from './wax';

// leaf size, rail width, thickness, hinge gap
const W = 3.3, H = 2.15, M = 0.17, TH = 0.13, G = 0.035;
const IW = W - 2 * M, IH = H - 2 * M;
const WAX_Y = TH * 0.6 + 0.004;
const ZF = -(G + H / 2), ZN = G + H / 2;
const L = 2.45; // stylus length, tip to blade

const smooth = (t: number) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const easeIO = (t: number) => { t = Math.min(1, Math.max(0, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

function rnd(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function boneTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d')!; const r = rnd(5);
  x.fillStyle = '#c9bc9f'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    x.strokeStyle = r() < 0.5 ? 'rgba(150,128,96,0.10)' : 'rgba(255,250,236,0.12)';
    x.lineWidth = 0.6 + r() * 2.2;
    const y = r() * 512; x.beginPath(); x.moveTo(0, y);
    for (let k = 0; k <= 8; k++) x.lineTo(k * 64, y + (r() - 0.5) * 6);
    x.stroke();
  }
  for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(110,90,62,${0.05 + r() * 0.1})`; x.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

function stoneTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d')!; const r = rnd(9);
  x.fillStyle = '#1c1a17'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    x.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * 0.18})` : `rgba(70,64,56,${r() * 0.12})`;
    x.beginPath(); x.arc(r() * 512, r() * 512, 1 + r() * 26, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(7, 7); t.anisotropy = 4;
  return t;
}

/** canvas pixels on a leaf (open) to a world point on the wax */
const onWax = (leaf: 0 | 1, x: number, y: number, out: THREE.Vector3) =>
  out.set(-IW / 2 + (x / CW) * IW, WAX_Y, (leaf ? ZN : ZF) - IH / 2 + (y / CH) * IH);

function basis(dir: THREE.Vector3, hint: THREE.Vector3) {
  const y = dir.clone().normalize();
  const x = hint.clone().sub(y.clone().multiplyScalar(hint.dot(y))).normalize();
  const z = new THREE.Vector3().crossVectors(x, y);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}
const CUT_DIR = new THREE.Vector3(0.36, 1, 0.55).normalize();
const SWEEP_DIR = new THREE.Vector3(-0.45, -1, 0.55).normalize();
const Q_CUT = basis(CUT_DIR, new THREE.Vector3(1, 0, 0));
const Q_SWEEP = basis(SWEEP_DIR, new THREE.Vector3(0, 0, 1));
const Q_REST = basis(new THREE.Vector3(0.06, 0, -1), new THREE.Vector3(1, 0, 0));
const REST = new THREE.Vector3(W / 2 + 0.42, 0.03, 1.05);

function Leaf({ which, bone }: { which: 0 | 1; bone: THREE.Material }) {
  const wax = T.wax[which];
  const last = useRef<[number, number] | null>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: wax.cTex, bumpMap: wax.hTex, bumpScale: 5, roughness: 0.36, metalness: 0, color: '#ffffff' }), [wax]);
  const px = (e: ThreeEvent<PointerEvent>): [number, number] | null => (e.uv ? [e.uv.x * CW, (1 - e.uv.y) * CH] : null);
  const usable = () => T.h > 0.98;
  const move = (e: ThreeEvent<PointerEvent>) => {
    const p = px(e); if (!p || !usable()) return;
    T.ptr.on = true; T.ptr.leaf = which; T.ptr.x = p[0]; T.ptr.y = p[1];
    if (T.ptr.down && last.current) { userCut(which, last.current[0], last.current[1], p[0], p[1]); }
    last.current = T.ptr.down ? p : null;
  };
  return (
    <group>
      <RoundedBox args={[W, TH * 0.6, H]} radius={0.02} smoothness={3} position={[0, TH * 0.3, 0]} castShadow receiveShadow material={bone} />
      {[-1, 1].map((s) => (
        <RoundedBox key={'z' + s} args={[W, TH, M]} radius={0.022} smoothness={3} position={[0, TH / 2, s * (H / 2 - M / 2)]} castShadow receiveShadow material={bone} />
      ))}
      {[-1, 1].map((s) => (
        <RoundedBox key={'x' + s} args={[M, TH, H - 2 * M + 0.02]} radius={0.022} smoothness={3} position={[s * (W / 2 - M / 2), TH / 2, 0]} castShadow receiveShadow material={bone} />
      ))}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, WAX_Y, 0]}
        receiveShadow
        material={mat}
        onPointerMove={move}
        onPointerDown={(e) => { if (!usable()) return; T.ptr.down = true; const p = px(e); last.current = p; if (p) { T.ptr.on = true; T.ptr.leaf = which; T.ptr.x = p[0]; T.ptr.y = p[1]; userCut(which, p[0], p[1], p[0] + 0.5, p[1]); } }}
        onPointerUp={() => { T.ptr.down = false; last.current = null; }}
        onPointerOut={() => { T.ptr.on = false; T.ptr.down = false; last.current = null; }}
      >
        <planeGeometry args={[IW, IH]} />
      </mesh>
    </group>
  );
}

function roundedLoop(zc: number, hz: number, y0: number, y1: number, r: number) {
  const pts: THREE.Vector3[] = [];
  const corners: [number, number, number][] = [
    [zc + hz - r, y1 - r, 0], [zc - hz + r, y1 - r, Math.PI / 2], [zc - hz + r, y0 + r, Math.PI], [zc + hz - r, y0 + r, Math.PI * 1.5],
  ];
  for (const [cz, cy, a0] of corners) for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector3(0, cy + Math.sin(a) * r, cz + Math.cos(a) * r)); }
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.2);
}

function Cord() {
  const g = useRef<THREE.Group>(null);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#b0261c', roughness: 0.62, sheen: 1, sheenColor: new THREE.Color('#ff8a70'), sheenRoughness: 0.5 }), []);
  const geos = useMemo(() => {
    const top = 2 * TH + 0.018, zc = -(G + H / 2);
    const loop = new THREE.TubeGeometry(roundedLoop(zc, H / 2 + 0.018, -0.004, top, 0.035), 140, 0.017, 8, true);
    const bowA = new THREE.CatmullRomCurve3([[0, top, zc], [0.1, top + 0.012, zc - 0.07], [0.22, top + 0.01, zc - 0.03], [0.2, top + 0.01, zc + 0.05], [0.06, top + 0.01, zc + 0.03], [0, top, zc]].map((p) => new THREE.Vector3(...(p as [number, number, number]))));
    const bowB = new THREE.CatmullRomCurve3([[0, top, zc], [-0.1, top + 0.012, zc + 0.06], [-0.2, top + 0.01, zc + 0.02], [-0.19, top + 0.01, zc - 0.06], [-0.05, top + 0.01, zc - 0.03], [0, top, zc]].map((p) => new THREE.Vector3(...(p as [number, number, number]))));
    const tailA = new THREE.CatmullRomCurve3([[0, top, zc], [0.05, top + 0.004, zc + 0.2], [0.02, top + 0.002, zc + 0.42], [0.09, top, zc + 0.6]].map((p) => new THREE.Vector3(...(p as [number, number, number]))));
    const tailB = new THREE.CatmullRomCurve3([[0, top, zc], [-0.06, top + 0.004, zc + 0.18], [-0.12, top + 0.002, zc + 0.36], [-0.1, top, zc + 0.5]].map((p) => new THREE.Vector3(...(p as [number, number, number]))));
    return [loop, ...[bowA, bowB].map((c) => new THREE.TubeGeometry(c, 40, 0.016, 8, false)), ...[tailA, tailB].map((c) => new THREE.TubeGeometry(c, 30, 0.015, 8, false))];
  }, []);
  useFrame(() => {
    if (!g.current) return;
    const c = Math.min(1, T.h / 0.42);
    const slide = easeIO(c / 0.6), drop = smooth((c - 0.6) / 0.4);
    g.current.position.x = THREE.MathUtils.lerp(-0.62, -(W / 2 + 0.34), slide);
    g.current.scale.y = THREE.MathUtils.lerp(1, 0.06, drop);
    g.current.rotation.y = drop * 0.32;
    g.current.position.z = drop * 0.35;
    // the cord goes taut when someone pulls at the cover
    g.current.scale.z = 1 + T.tug * 0.02;
  });
  return <group ref={g}>{geos.map((geo, i) => <mesh key={i} geometry={geo} material={mat} castShadow />)}</group>;
}

function Stylus() {
  const g = useRef<THREE.Group>(null);
  const { shaft, blade } = useMemo(() => {
    const prof: [number, number][] = [[0, 0], [0.006, 0.02], [0.024, 0.2], [0.03, 0.26], [0.03, 0.29], [0.024, 0.31], [0.023, 0.34], [0.033, 0.36], [0.033, 0.4], [0.023, 0.42], [0.021, 1.6], [0.022, 1.95], [0.03, 1.98], [0.03, 2.03], [0.02, 2.06], [0.014, 2.12], [0, 2.13]];
    const shaft = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40);
    const s = new THREE.Shape();
    s.moveTo(-0.018, 2.08); s.lineTo(0.018, 2.08); s.lineTo(0.15, L - 0.01); s.quadraticCurveTo(0, L + 0.01, -0.15, L - 0.01); s.closePath();
    const blade = new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3, curveSegments: 12 });
    blade.translate(0, 0, -0.007);
    return { shaft, blade };
  }, []);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#b07e4c', metalness: 1, roughness: 0.3, clearcoat: 0.3, clearcoatRoughness: 0.4 }), []);
  const tip = useMemo(() => new THREE.Vector3(), []), want = useMemo(() => new THREE.Vector3(), []), q = useMemo(() => new THREE.Quaternion(), []);
  useFrame((_, dt) => {
    const o = g.current; if (!o) return;
    dt = Math.min(dt, 0.1);
    const p = T.pen;
    let k = 7;
    if (p.mode === 'rest') { want.copy(REST); q.copy(Q_REST); k = 5; }
    else if (p.mode === 'cut') {
      onWax(p.leaf, p.x, p.y, tip); tip.y += p.lift * 0.32 - 0.002;
      want.copy(tip); q.copy(Q_CUT); k = p.lift < 0.3 ? 38 : 12;
    } else {
      onWax(p.leaf, p.x, p.y, tip); tip.y += 0.008;
      want.copy(tip).addScaledVector(SWEEP_DIR, -L); q.copy(Q_SWEEP); k = 16;
    }
    if (still) { o.position.copy(REST); o.quaternion.copy(Q_REST); return; }
    o.position.lerp(want, 1 - Math.exp(-k * dt));
    o.quaternion.slerp(q, 1 - Math.exp(-Math.min(k, 9) * dt));
  });
  return (
    <group ref={g} position={REST.toArray()} quaternion={Q_REST.toArray() as [number, number, number, number]}>
      <mesh geometry={shaft} material={mat} castShadow scale={[1.4, 1, 1.4]} />
      <mesh geometry={blade} material={mat} castShadow />
    </group>
  );
}

/** Runs the stylus through its queue of jobs. */
function Runner() {
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.25);
    // the cover's spring when tugged
    { const sd = Math.min(dt, 0.03); T.tugV += (-60 * T.tug - 7 * T.tugV) * sd; T.tug += T.tugV * sd; } if (T.tug < 0) { T.tug = 0; T.tugV = Math.abs(T.tugV) * 0.25; }
    if (!T.job) T.job = T.jobs.shift() ?? null;
    const j = T.job, p = T.pen;
    if (!j) {
      if (T.ptr.on && T.h > 0.98 && !still) { p.mode = 'cut'; p.leaf = T.ptr.leaf; p.x = T.ptr.x; p.y = T.ptr.y; p.lift = T.ptr.down ? 0 : 1; }
      else p.mode = 'rest';
    } else if (j.k === 'wait') { j.t += dt; if (j.t >= j.d) T.job = null; p.mode = 'rest'; }
    else if (j.k === 'hinge') {
      p.mode = 'rest';
      const r = dt / 2.3;
      T.h = j.to ? Math.min(1, T.h + r) : Math.max(0, T.h - r);
      if (T.h === j.to) T.job = null;
    } else if (j.k === 'sweep') {
      const w = T.wax[j.leaf];
      const span = CW + 160;
      p.mode = 'sweep'; p.leaf = j.leaf; T.focus = j.leaf;
      if (j.t < 0) { j.t = Math.min(0, j.t + dt / 0.5); p.x = -80; p.y = CH / 2; return; }
      const prev = -80 + easeIO(j.t) * span;
      j.t = Math.min(1, j.t + dt / 1.15);
      const now = -80 + easeIO(j.t) * span;
      p.x = now; p.y = CH / 2 + Math.sin(j.t * 5) * 50;
      w.smooth(prev, now);
      if (j.t >= 1) { w.clear(); T.job = null; }
    } else if (j.k === 'cut') {
      const w = T.wax[j.leaf];
      w.marked = true; p.mode = 'cut'; p.leaf = j.leaf; if (j.focus) T.focus = j.leaf;
      let s = j.strokes[j.si];
      if (!s) { w.key = j.key; w.marked = false; T.job = null; return; }
      if (j.air > 0) {
        j.air -= dt; p.x = s[0][0]; p.y = s[0][1]; p.lift = j.air > 0.07 ? 1 : j.air / 0.07; return;
      }
      p.lift = 0;
      let budget = j.speed * dt;
      while (budget > 0 && s) {
        const a = s[j.pi], b = s[j.pi + 1];
        if (!b) { j.si++; j.pi = 0; j.along = 0; j.air = 0.16; s = j.strokes[j.si]; break; }
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 0.001;
        const from = j.along, to = Math.min(len, from + budget);
        const ax = a[0] + ((b[0] - a[0]) * from) / len, ay = a[1] + ((b[1] - a[1]) * from) / len;
        const bx = a[0] + ((b[0] - a[0]) * to) / len, by = a[1] + ((b[1] - a[1]) * to) / len;
        w.cut(ax, ay, bx, by, j.width);
        p.x = bx; p.y = by;
        budget -= to - from;
        if (to >= len) { j.pi++; j.along = 0; } else j.along = to;
      }
    }
  });
  useFrame(() => { for (const w of T.wax) w.flush(); });
  return null;
}

function Tablet() {
  const bone = useMemo(() => new THREE.MeshPhysicalMaterial({ map: boneTexture(), color: '#ffffff', roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.45, sheen: 0.4, sheenColor: new THREE.Color('#fff4e0') }), []);
  const pivot = useRef<THREE.Group>(null);
  const pin = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#b9ab90', roughness: 0.5, clearcoat: 0.2 }), []);
  useFrame(() => {
    if (!pivot.current) return;
    const open = easeIO((T.h - 0.36) / 0.64);
    pivot.current.rotation.x = -Math.PI * (1 - open) + T.tug * 0.16;
  });
  return (
    <group>
      <group position={[0, 0, ZF]}><Leaf which={0} bone={bone} /></group>
      <group ref={pivot} position={[0, TH, 0]}>
        <group position={[0, -TH, ZN]}><Leaf which={1} bone={bone} /></group>
      </group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 - 0.55), TH, 0]} rotation-z={Math.PI / 2} material={pin} castShadow>
          <cylinderGeometry args={[0.034, 0.034, 0.34, 20]} />
        </mesh>
      ))}
      <Cord />
    </group>
  );
}

function Floor() {
  const map = useMemo(stoneTexture, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial map={map} roughness={0.82} metalness={0} />
    </mesh>
  );
}

function Rig() {
  const { camera, size } = useThree();
  const tgt = useMemo(() => new THREE.Vector3(0, 0, -1.1), []), cur = useMemo(() => new THREE.Vector3(0, 0, -1.1), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const ptr = useRef({ x: 0, y: 0 });
  useFrame((state, dt) => {
    dt = Math.min(dt, 0.1);
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const open = easeIO((T.h - 0.36) / 0.64);
    if (T.phone) {
      cam.fov = 26;
      const hf = 2 * Math.atan(Math.tan((cam.fov * Math.PI) / 360) * aspect);
      const dW = (W * 0.62) / Math.tan(hf / 2);
      const dH = (H * 0.66) / Math.tan((cam.fov * Math.PI) / 360);
      const d = Math.max(dW, dH);
      const z = T.h < 0.5 ? ZF : T.focus ? ZN : ZF;
      tgt.set(0, 0, z);
      cur.lerp(tgt, 1 - Math.exp(-(still ? 60 : 3.2) * dt));
      pos.set(cur.x, d * Math.sin(1.33), cur.z + d * Math.cos(1.33));
    } else {
      cam.fov = 21;
      const hf = 2 * Math.atan(Math.tan((cam.fov * Math.PI) / 360) * aspect);
      const el = 0.64;
      const d = Math.max(2.62 / Math.tan(hf / 2), 2.1 / Math.tan((cam.fov * Math.PI) / 360));
      tgt.set(0.1, 0, THREE.MathUtils.lerp(-1.0, 0.05, open));
      cur.lerp(tgt, 1 - Math.exp(-(still ? 60 : 2.5) * dt));
      ptr.current.x += (state.pointer.x - ptr.current.x) * (1 - Math.exp(-2 * dt));
      ptr.current.y += (state.pointer.y - ptr.current.y) * (1 - Math.exp(-2 * dt));
      const az = still ? 0 : ptr.current.x * 0.05 + (scroll.p - 0.5) * 0.06;
      const e = el + (still ? 0 : ptr.current.y * 0.025);
      pos.set(cur.x + Math.sin(az) * Math.cos(e) * d, Math.sin(e) * d, cur.z + Math.cos(az) * Math.cos(e) * d);
    }
    cam.position.copy(pos);
    cam.lookAt(cur);
    cam.updateProjectionMatrix();
  });
  return null;
}

export default function Scene({ phone }: { phone: boolean }) {
  T.phone = phone;
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, phone ? 1.5 : 1.6]}
      camera={{ fov: 21, near: 0.5, far: 80, position: [0, 9, 12] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; scene.background = new THREE.Color('#0d0c0b'); scene.fog = new THREE.Fog('#0d0c0b', 16, 30); }}
      onPointerMissed={() => { T.ptr.down = false; }}
    >
      <Environment resolution={128} environmentIntensity={0.3} frames={1}>
        <Lightformer form="rect" intensity={0.7} color="#fff3e2" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#ffe2c0" position={[-8, 1.5, 0]} rotation-y={Math.PI / 2} scale={[6, 1.2, 1]} />
        <Lightformer form="rect" intensity={3} color="#dfe5f0" position={[2, 2.5, -8]} scale={[9, 2.5, 1]} />
      </Environment>
      <hemisphereLight args={['#f3e6d2', '#100e0c', 0.12]} />
      <directionalLight
        position={[-6.2, 1.9, -2.4]}
        intensity={4.2}
        color="#ffe6c8"
        castShadow
        shadow-mapSize={[phone ? 1024 : 2048, phone ? 1024 : 2048]}
        shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-camera-near={0.5} shadow-camera-far={20}
        shadow-bias={-0.0004} shadow-normalBias={0.02}
      />
      <Floor />
      <Tablet />
      <Stylus />
      <ContactShadows position={[0, 0.002, 0]} scale={10} blur={2.4} far={1.4} opacity={0.7} resolution={phone ? 256 : 512} color="#000000" />
      <Runner />
      <Rig />
    </Canvas>
  );
}

export const _geo = { W, H, IW, IH };
