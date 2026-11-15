// The coin: two struck halves, a reeded edge, felt underneath. It lives in a fixed
// canvas and flies to whichever slot on the page is nearest the middle of the screen.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { coin, type Face } from './store';
import { edgeTextures, faceTextures, shadowTexture, SERIF } from './tex';
import { isPhone, still } from '@/lib/utils';
import { rattle, ring } from './sound';

const THICK = 0.15;
const HALF = THICK / 2;
const ROLE_OF: Record<string, string> = {};

type Tex = { a: ReturnType<typeof faceTextures>; b: ReturnType<typeof faceTextures>; e: ReturnType<typeof edgeTextures>; sh: THREE.Texture };

function halfGeometry() {
  const g = new THREE.CylinderGeometry(1, 1, HALF, 160, 1, false);
  // planar UVs on the top cap so the face reads upright once the coin faces +z
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) if (nor.getY(i) > 0.5) uv.setXY(i, 0.5 + pos.getX(i) / 2, 0.5 - pos.getZ(i) / 2);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, HALF / 2);
  return g;
}

const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qT = new THREE.Quaternion();
const eul = new THREE.Euler();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const axis = new THREE.Vector3();
const rx = (a: number, q = new THREE.Quaternion()) => q.setFromAxisAngle(X, a);

function Half({ face, t }: { face: Face; t: Tex }) {
  const geo = useMemo(halfGeometry, []);
  const mats = useMemo(() => {
    const f = face === 0 ? t.a : t.b;
    const side = new THREE.MeshPhysicalMaterial({ map: t.e.map, normalMap: t.e.normalMap, roughnessMap: t.e.roughnessMap, metalness: 1, roughness: 1, anisotropy: 0.8, anisotropyRotation: Math.PI / 2, clearcoat: 0.2, clearcoatRoughness: 0.35, normalScale: new THREE.Vector2(1.1, 1.1) });
    const top = new THREE.MeshPhysicalMaterial({ map: f.map, normalMap: f.normalMap, roughnessMap: f.roughnessMap, metalness: 1, roughness: 1, normalScale: new THREE.Vector2(1.5, 1.5), anisotropy: 0.35, clearcoat: 0.12, clearcoatRoughness: 0.5 });
    const cut = new THREE.MeshPhysicalMaterial({ color: '#f1cf86', metalness: 1, roughness: 0.18 });
    return [side, top, cut];
  }, [face, t]);
  const rim = useMemo(() => new THREE.TorusGeometry(0.982, 0.024, 14, 160), []);
  const rimMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#e0b765', metalness: 1, roughness: 0.22, clearcoat: 0.3, clearcoatRoughness: 0.3 }), []);
  return (
    <group>
      <mesh geometry={geo} material={mats} />
      <mesh geometry={rim} material={rimMat} position={[0, 0, HALF]} scale={[1, 1, 0.8]} />
    </group>
  );
}

/** Screen rect to world units at z = 0, for a camera on the z axis. */
function useWorld() {
  const { camera, size } = useThree();
  return useMemo(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const visH = 2 * cam.position.z * Math.tan((cam.fov * Math.PI) / 360);
    const visW = visH * (size.width / size.height);
    return { visH, visW, W: size.width, H: size.height };
  }, [camera, size]);
}

function Rig({ t }: { t: Tex }) {
  const root = useRef<THREE.Group>(null!), body = useRef<THREE.Group>(null!), hA = useRef<THREE.Group>(null!), hB = useRef<THREE.Group>(null!), sh = useRef<THREE.Mesh>(null!);
  const w = useWorld();
  const st = useRef({
    x: 0, y: 0, s: 2, z: 0, theta: still ? 0 : -9 * Math.PI - 0.7, idle: 0, idleV: 0, time: 0,
    split: 0, dial: 0, dialV: 0, phi: 0, alpha: 0, lastPhiStep: 0, role: 'hero', slots: [] as HTMLElement[], scan: 0,
    px: 0, py: 0, intro: !still,
  });
  const pointer = useThree((s) => s.pointer);

  useEffect(() => {
    if (still) { coin.phase = 'idle'; return; }
    // the opening: a real flip that lands on the debater face
    coin.phase = 'fly'; coin.t = 0; coin.T = 1.25; coin.lift = 0.55; coin.onEdge = false;
    coin.theta0 = st.current.theta; coin.omega = (0.85 - coin.theta0) / coin.T; coin.slot = 'hero';
  }, []);

  useFrame((_, dtRaw) => {
    const s = st.current;
    const dt = Math.min(dtRaw, 1 / 20);
    s.time += dt;
    // find the slots now and then (sections can change order)
    if (s.scan-- <= 0) { s.slots = Array.from(document.querySelectorAll<HTMLElement>('[data-slot]')); s.scan = 20; }
    const H = w.H, W = w.W;
    let best: HTMLElement | null = null, bestD = 1e9, bestR: DOMRect | null = null;
    const tossing = coin.phase === 'fly' || coin.phase === 'settle';
    for (const el of s.slots) {
      const r = el.getBoundingClientRect();
      if (r.height === 0) continue;
      const role = el.dataset.slot!;
      let d = Math.abs(r.top + r.height / 2 - H / 2);
      if (tossing && role === coin.slot) d -= 5000;
      if (d < bestD) { bestD = d; best = el; bestR = r; }
    }
    if (!best || !bestR) return;
    const role = best.dataset.slot!;
    if (coin.phase === 'edge' && role !== coin.slot) { coin.phase = 'idle'; coin.k = 0; }
    s.role = role; ROLE_OF.now = role;
    const r = bestR;
    const tx = ((r.left + r.width / 2) / W - 0.5) * w.visW;
    const ty = -((r.top + r.height / 2) / H - 0.5) * w.visH;
    const fitPx = role === 'split' ? Math.min(r.width / 4.4, r.height / 2) : Math.min(r.width, r.height) / 2;
    const ts = (fitPx / H) * w.visH * 0.92;
    const k = still ? 1 : 1 - Math.exp(-7 * dt);
    s.x += (tx - s.x) * k; s.y += (ty - s.y) * k; s.s += (ts - s.s) * k;

    // ----- orientation
    let liftH = 0; // 0..1 height of the toss
    const wantSplit = role === 'split' ? 1 : 0;
    s.split += (wantSplit - s.split) * (still ? 1 : 1 - Math.exp(-4 * dt));
    const faceBase = coin.face * Math.PI;

    if (coin.phase === 'fly') {
      // slow motion at the top of the arc
      const u = coin.t / coin.T, fromTop = Math.abs(u - 0.5) * 2;
      const scale = 0.22 + 0.78 * Math.min(1, fromTop * fromTop * 1.6);
      coin.t += dt * scale;
      const uu = Math.min(1, coin.t / coin.T);
      liftH = 4 * uu * (1 - uu) * coin.lift;
      s.theta = coin.theta0 + coin.omega * Math.min(coin.t, coin.T);
      rx(s.theta, qT);
      if (coin.t >= coin.T) {
        const kk = Math.round(s.theta / Math.PI);
        coin.k = kk;
        coin.alpha0 = s.theta - kk * Math.PI;
        if (Math.abs(coin.alpha0) < 0.25) coin.alpha0 = 0.25 * Math.sign(coin.alpha0 || 1);
        coin.phase = 'settle'; coin.t = 0; coin.dur = coin.onEdge ? 2.2 : 1.5 + Math.abs(coin.alpha0) * 1.4;
        s.phi = Math.random() * 6.28; s.lastPhiStep = Math.floor(s.phi / Math.PI);
        if (coin.sound) ring(0.9);
      }
    } else if (coin.phase === 'settle') {
      coin.t += dt;
      const p = Math.min(1, coin.t / coin.dur);
      const a0 = Math.abs(coin.alpha0);
      let a: number;
      if (coin.onEdge) a = a0 + (Math.PI / 2 - a0) * (1 - Math.pow(1 - p, 3)) + Math.sin(coin.t * 9) * 0.06 * (1 - p);
      else a = a0 * Math.pow(1 - p, 1.7);
      s.alpha = a;
      // Euler's disk: as the tilt dies the wobble speeds up
      const rate = coin.onEdge ? 7 * (1 - p) + 0.2 : 5 / Math.sqrt(a / a0 + 0.015);
      s.phi += rate * dt;
      const step = Math.floor(s.phi / Math.PI);
      if (step !== s.lastPhiStep) { s.lastPhiStep = step; if (coin.sound && !coin.onEdge) rattle(rate); }
      axis.set(Math.cos(s.phi), Math.sin(s.phi), 0);
      qT.setFromAxisAngle(axis, a).multiply(rx(coin.k * Math.PI));
      liftH = Math.sin(a) * 0.12 + (coin.t < 0.3 ? Math.sin((coin.t / 0.3) * Math.PI) * 0.06 * a0 : 0);
      if (p >= 1) {
        const face = (((coin.k % 2) + 2) % 2) as Face;
        s.theta = coin.k * Math.PI; s.idle = 0; s.idleV = 0;
        if (coin.onEdge) { coin.phase = 'edge'; coin.t = 0; coin.onLand?.(-1, coin.slot); }
        else {
          coin.phase = 'idle';
          coin.face = face;
          if (s.intro) s.intro = false; else coin.onLand?.(face, coin.slot);
          if (coin.sound) ring(0.4);
        }
      }
    } else if (coin.phase === 'edge') {
      // standing on its edge, barely breathing
      coin.t += dt;
      axis.set(Math.cos(s.phi), Math.sin(s.phi), 0);
      qT.setFromAxisAngle(axis, Math.PI / 2 + Math.sin(coin.t * 2) * 0.01).multiply(rx(coin.k * Math.PI));
      liftH = 0.12;
    } else {
      // idle, by role
      s.px += (pointer.x - s.px) * (1 - Math.exp(-3 * dt));
      s.py += (pointer.y - s.py) * (1 - Math.exp(-3 * dt));
      if (role === 'hero' || role === 'call') {
        s.idleV += ((still ? 0 : role === 'hero' ? 0.42 : 0.2) - s.idleV) * (1 - Math.exp(-0.8 * dt));
        s.idle += s.idleV * dt;
        eul.set(faceBase + s.idle - s.py * 0.25, Math.sin(s.time * 0.31) * 0.35 + s.px * 0.35, 0);
        qT.setFromEuler(eul);
      } else if (role === 'edge') {
        // spun on its edge on the table
        eul.set(-0.32, 0, 0.06 * Math.sin(s.time * 1.7));
        qT.setFromEuler(eul).multiply(qA.setFromAxisAngle(Y, still ? 0.7 : s.time * 5.2)).multiply(rx(faceBase));
      } else if (role === 'seal') {
        eul.set(-0.95 + s.py * 0.08, 0.18 + s.px * 0.1, 0.22);
        qT.setFromEuler(eul).multiply(rx(faceBase));
      } else if (role === 'dial') {
        const target = -coin.dial * ((Math.PI * 2) / 7);
        if (still) { s.dial = target; s.dialV = 0; }
        else { s.dialV += ((target - s.dial) * 70 - s.dialV * 9) * dt; s.dial += s.dialV * dt; }
        eul.set(s.py * 0.1, s.px * 0.15, 0);
        qT.setFromEuler(eul).multiply(rx(faceBase)).multiply(qA.setFromAxisAngle(Z, coin.face ? -s.dial : s.dial));
      } else {
        eul.set(s.py * 0.12, s.px * 0.2, 0);
        qT.setFromEuler(eul);
      }
      // keep theta tracking the hero tumble so a toss starts where the coin is
      if (role === 'hero' || role === 'call') s.theta = faceBase + s.idle; else { s.idle = 0; s.theta = faceBase; }
    }

    // ----- apply
    const g = root.current;
    const sc = s.s * (1 + liftH * 0.55);
    g.position.set(s.x, s.y + liftH * s.s * 0.8, liftH * 6);
    g.scale.setScalar(sc);
    const slerpK = still ? 1 : coin.phase === 'idle' ? 1 - Math.exp(-6 * dt) : 1 - Math.exp(-30 * dt);
    body.current.quaternion.slerp(role === 'split' && coin.phase === 'idle' ? qT : qT, slerpK);
    // split: the halves part, the second turns to show its face
    const sp = s.split, d = 1.15 * sp;
    const lift = (i: number) => (coin.coachHover === i ? 0.25 : 0);
    hA.current.position.set(-d * 1.0, 0, sp * (0.1 + lift(0)));
    hB.current.position.set(d * 1.0, 0, -HALF + sp * (HALF + 0.1 + lift(1)));
    hB.current.quaternion.copy(rx(Math.PI + Math.PI * sp, qB));
    hA.current.rotation.set(0, sp * 0.18 + lift(0) * 0.5, 0);
    // contact shadow on the felt
    const m = sh.current;
    m.position.set(s.x + s.s * (0.16 + liftH * 0.9), s.y - s.s * (0.2 + liftH * 0.4), -1.2);
    m.scale.set(s.s * (2.5 + liftH * 2 + sp * 2.4), s.s * (2.5 + liftH * 2), 1);
    (m.material as THREE.MeshBasicMaterial).opacity = (role === 'seal' ? 0.5 : 0.62) * (1 - Math.min(0.7, liftH * 0.9));
  });

  return (
    <>
      <mesh ref={sh} renderOrder={-1}>
        <planeGeometry />
        <meshBasicMaterial map={t.sh} transparent depthWrite={false} opacity={0.6} />
      </mesh>
      <group ref={root}>
        <group ref={body}>
          <group ref={hA}><Half face={0} t={t} /></group>
          <group ref={hB}><Half face={1} t={t} /></group>
        </group>
      </group>
    </>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[-6, 8, 10]} intensity={1.6} color="#fff1d6" />
      <spotLight position={[9, -2, -6]} angle={0.6} penumbra={1} intensity={60} color="#bfe6ff" />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#0a120f']} />
        <Lightformer form="rect" intensity={3.2} color="#fff0d0" position={[-4, 6, 6]} scale={[8, 4, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2} color="#ffffff" position={[6, 2, 5]} scale={[2, 9, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={2.4} color="#ffd9a0" position={[0, 0, 9]} scale={4} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.4} color="#7fd6b0" position={[0, -6, 2]} scale={[12, 2, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.6} color="#ffffff" position={[-7, -1, -2]} scale={[1, 10, 1]} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}

export default function CoinScene() {
  const [t, setT] = useState<Tex | null>(null);
  useEffect(() => {
    let live = true;
    const S = isPhone() ? 768 : 1024;
    document.fonts.load(`700 40px ${SERIF}`).catch(() => {}).finally(() => {
      if (!live) return;
      setT({ a: faceTextures(0, S), b: faceTextures(1, S), e: edgeTextures(), sh: shadowTexture() });
    });
    return () => { live = false; };
  }, []);
  return (
    <Canvas
      className="coin-canvas"
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 40], fov: 16, near: 1, far: 100 }}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}
      aria-hidden
    >
      <Lights />
      {t && <Rig t={t} />}
    </Canvas>
  );
}
