// Version 18's stage: a round vault door set in a dark wall, the deposit boxes
// beside it, two brass plates and two keys on hooks. The scroll moves the
// camera; the dial and the wheel can be worked, and the door never opens.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { DRIVE } from '@/content';
import { scroll } from '@/lib/scroll';
import { clamp, damp, lerp, smooth, still } from '@/lib/utils';
import { refuse, turnDial, vault } from './stage';
import { brushed, dialMaps, doorMaps, keyTags, plate, recordPlates, wallMap } from './tex';
import { clunk } from './sound';

const BG = '#0c0d0f';
const DOOR_R = 2.06, FRAME_IN = 2.36, FRAME_OUT = 3.08;
const DIAL_Y = 0.56, WHEEL_Y = -0.86, FACE = 0.6;
const WHEEL_STOP = 0.55;
export const BOX_X = 5.9, REC_X = -5.9;
const BOX_Y = (i: number) => 1.86 - i * 0.62;

type V3 = [number, number, number];
type Shot = { p: V3; t: V3; fov: number; side: number };
/** Where the camera stands for each part of the page. side: 1 puts the subject right of the text, -1 left. */
const SHOTS: Shot[] = [
  { p: [0, 0, 15.2], t: [0, 0.12, 0], fov: 28, side: 1 },
  { p: [-3.9, 3.7, 5.4], t: [-1.15, 1.3, 0.55], fov: 27, side: -1 },
  { p: [3.7, 0.9, 3.9], t: [1.95, 0.1, 0.35], fov: 30, side: 1 },
  { p: [0, -0.16, 7.6], t: [0, -0.16, 0.6], fov: 28, side: 1 },
  { p: [REC_X, 0.12, 7.3], t: [REC_X, 0.12, 0], fov: 28, side: -1 },
  { p: [BOX_X, 0, 10.2], t: [BOX_X, 0, 0], fov: 28, side: 1 },
  { p: [REC_X, -2.95, 5.8], t: [REC_X, -2.95, 0], fov: 28, side: -1 },
  { p: [0, -0.35, 28], t: [0, -0.35, 0], fov: 28, side: 1 },
  { p: [0, 0.7, 16.5], t: [0, 0.55, 0], fov: 28, side: 1 },
];

function lathe(pts: [number, number][], uvR: number, seg = 128) {
  const g0 = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), seg);
  g0.rotateX(Math.PI / 2);
  const p = g0.attributes.position, uv = g0.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * uvR) + 0.5, p.getY(i) / (2 * uvR) + 0.5);
  const g = toCreasedNormals(g0, 0.6);
  g0.dispose();
  return g;
}

function useMats(phone: boolean) {
  const m = useMemo(() => {
    const S = phone ? 1024 : 2048;
    const d = doorMaps(S, 2.1), fr = doorMaps(1024, FRAME_OUT, false), di = dialMaps(phone ? 512 : 1024, 0.48);
    const br = brushed(512, 3, '#a19f99'), bb = brushed(512, 9, '#c79a4c');
    const wall = wallMap(1024); wall.repeat.set(1 / 6, 1 / 6);
    const steel = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 1, ...o });
    const mats = {
      door: steel({ map: d.map, roughnessMap: d.orm, metalnessMap: d.orm, bumpMap: d.bump, bumpScale: 1.1, anisotropy: 0.55, anisotropyMap: d.aniso, envMapIntensity: 1.25, side: THREE.DoubleSide }),
      frame: steel({ color: '#8c8982', map: fr.map, roughnessMap: fr.orm, metalnessMap: fr.orm, bumpMap: fr.bump, bumpScale: 0.6, anisotropy: 0.4, anisotropyMap: fr.aniso, envMapIntensity: 1, side: THREE.DoubleSide }),
      dial: steel({ map: di.map, roughnessMap: di.orm, metalnessMap: di.orm, bumpMap: di.bump, bumpScale: 1.4, clearcoat: 0.3, clearcoatRoughness: 0.3, envMapIntensity: 1.5, side: THREE.DoubleSide }),
      chrome: steel({ color: '#d9d8d4', roughness: 0.13, envMapIntensity: 1.5, side: THREE.DoubleSide }),
      brass: steel({ color: '#d3a457', roughness: 0.75, roughnessMap: bb.orm, envMapIntensity: 1.4, side: THREE.DoubleSide }),
      box: steel({ map: br.map, roughnessMap: br.orm, envMapIntensity: 1.1 }),
      recess: new THREE.MeshStandardMaterial({ color: '#050506', roughness: 0.95, metalness: 0.2 }),
      wall: new THREE.MeshStandardMaterial({ map: wall, roughness: 0.92, metalness: 0, envMapIntensity: 0.25 }),
      red: new THREE.MeshPhysicalMaterial({ color: '#4a0805', emissive: '#ff2a14', emissiveIntensity: 0.1, roughness: 0.15, clearcoat: 1 }),
      bulb: new THREE.MeshStandardMaterial({ color: '#fff4e0', emissive: '#ffcf8a', emissiveIntensity: 3.2 }),
      black: new THREE.MeshStandardMaterial({ color: '#0b0a09', roughness: 0.6, metalness: 0.5 }),
    };
    const keep = [d, fr, di, br, bb].flatMap((x) => Object.values(x) as THREE.Texture[]).concat([wall]);
    return { mats, keep };
  }, [phone]);
  useEffect(() => () => { m.keep.forEach((t) => t.dispose()); Object.values(m.mats).forEach((x) => x.dispose()); }, [m]);
  return m.mats;
}
type Mats = ReturnType<typeof useMats>;

/* ───────────── dragging: a turn around a point on screen ───────────── */

function useTurn(onDelta: (da: number) => void, onEnd: (moved: number) => void) {
  const { camera, gl } = useThree();
  const drag = useRef<{ cx: number; cy: number; a: number; moved: number } | null>(null);
  const v = useMemo(() => new THREE.Vector3(), []);
  const down = (e: ThreeEvent<PointerEvent>, centre: THREE.Object3D) => {
    e.stopPropagation();
    centre.getWorldPosition(v); v.project(camera);
    const r = gl.domElement.getBoundingClientRect();
    const cx = r.left + (v.x * 0.5 + 0.5) * r.width, cy = r.top + (-v.y * 0.5 + 0.5) * r.height;
    drag.current = { cx, cy, a: Math.atan2(-(e.clientY - cy), e.clientX - cx), moved: 0 };
    const move = (ev: PointerEvent) => {
      const d = drag.current; if (!d) return;
      const a = Math.atan2(-(ev.clientY - d.cy), ev.clientX - d.cx);
      let da = a - d.a; if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2;
      d.a = a; d.moved += Math.abs(da);
      onDelta(da);
    };
    const up = () => { const m = drag.current?.moved ?? 0; drag.current = null; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); onEnd(m); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
  return down;
}
const cursor = (c: string) => () => { document.body.style.cursor = c; };

/* ───────────── the door ───────────── */

function Door({ M }: { M: Mats }) {
  const geo = useMemo(() => ({
    door: lathe([[0, FACE], [1.27, FACE], [1.29, FACE - 0.03], [1.33, FACE - 0.03], [1.35, FACE], [1.61, FACE], [1.64, FACE + 0.035], [1.67, FACE + 0.055], [1.99, FACE + 0.055], [2.02, FACE + 0.03], [DOOR_R, FACE - 0.04], [DOOR_R, -0.4]], 2.1, 160),
    frame: lathe([[FRAME_IN, -0.45], [FRAME_IN, FACE - 0.08], [FRAME_IN + 0.05, FACE - 0.02], [FRAME_IN + 0.12, FACE], [2.82, FACE], [2.86, FACE + 0.03], [2.96, FACE + 0.03], [3.0, FACE - 0.02], [FRAME_OUT, 0.32], [FRAME_OUT, 0]], FRAME_OUT, 160),
    recess: new THREE.RingGeometry(1.7, 2.6, 96),
    bolt: new THREE.CapsuleGeometry(0.072, 0.3, 8, 20),
    dial: lathe([[0, 0.21], [0.33, 0.21], [0.35, 0.2], [0.41, 0.19], [0.44, 0.17], [0.46, 0.14], [0.47, 0.12], [0.47, 0.02], [0.45, 0]], 0.48, 120),
    bezel: lathe([[0.47, 0.0], [0.58, 0.0], [0.6, 0.02], [0.61, 0.06], [0.6, 0.085], [0.5, 0.1], [0.49, 0.08]], 0.62, 120),
    pointer: new THREE.ConeGeometry(0.04, 0.11, 3),
    hub: lathe([[0, 0.34], [0.09, 0.34], [0.13, 0.32], [0.15, 0.28], [0.15, 0.1], [0.24, 0.06], [0.33, 0.03], [0.34, 0]], 0.34, 80),
    spoke: new THREE.CylinderGeometry(0.036, 0.046, 0.62, 24),
    knob: new THREE.SphereGeometry(0.082, 32, 20),
    lamp: new THREE.SphereGeometry(0.1, 32, 20),
    lampRim: new THREE.TorusGeometry(0.115, 0.025, 12, 40),
    shade: lathe([[0.05, 0.25], [0.12, 0.24], [0.3, 0.02], [0.32, 0], [0.31, -0.01], [0.12, 0.2]], 0.32, 64),
    bulb: new THREE.SphereGeometry(0.1, 24, 16),
    arm: new THREE.CylinderGeometry(0.03, 0.03, 0.75, 12),
  }), []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  const bolts = useRef<THREE.InstancedMesh>(null), dial = useRef<THREE.Group>(null), wheel = useRef<THREE.Group>(null);
  const dialC = useRef<THREE.Group>(null), wheelC = useRef<THREE.Group>(null), red = useRef<THREE.PointLight>(null), all = useRef<THREE.Group>(null);
  const N = 18, tmp = useMemo(() => new THREE.Object3D(), []);
  const wheelHit = useRef(false), lastRefuse = useRef(-9), shown = useRef(0);

  const dialDown = useTurn((da) => turnDial(da), () => {});
  const wheelDown = useTurn((da) => {
    vault.wheelHeld = true;
    const w = vault.wheel + da;
    if (Math.abs(w) >= WHEEL_STOP) { vault.wheel = Math.sign(w) * WHEEL_STOP; if (!wheelHit.current) { wheelHit.current = true; refuse(); clunk(); } }
    else vault.wheel = w;
  }, (moved) => {
    vault.wheelHeld = false; wheelHit.current = false;
    if (moved < 0.05) { vault.wheelLock = false; vault.wheelV = 7; }
  });

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime, o = vault.open;
    // Bolts throw out into the frame one after another, then twitch when refused.
    const tw = vault.twitch;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + Math.PI / 2;
      const u = clamp((o - 0.5 - i * 0.012) / 0.14), back = 1 + 2.4 * (u - 1) ** 3 + 1.4 * (u - 1) ** 2;
      const r = lerp(1.9, 2.22, still ? 1 : back) - tw * 0.035 * Math.sin(t * 60 + i);
      tmp.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.36); tmp.rotation.set(0, 0, a - Math.PI / 2); tmp.updateMatrix();
      bolts.current?.setMatrixAt(i, tmp.matrix);
    }
    if (bolts.current) bolts.current.instanceMatrix.needsUpdate = true;
    vault.twitch = Math.max(0, tw - dt * 2.4);
    // The dial is a heavy thing: it settles onto the nearest detent.
    shown.current = still ? vault.dial : damp(shown.current, vault.dial, 22, dt);
    if (dial.current) dial.current.rotation.z = shown.current;
    // The wheel: a spring back to rest, a hard stop where the bolts are.
    if (!vault.wheelHeld) {
      vault.wheelV += (-26 * vault.wheel - 4.2 * vault.wheelV) * dt;
      vault.wheel += vault.wheelV * dt;
      if (Math.abs(vault.wheel) > WHEEL_STOP) {
        vault.wheel = Math.sign(vault.wheel) * WHEEL_STOP;
        if (Math.abs(vault.wheelV) > 1.2 && t - lastRefuse.current > 0.7) { lastRefuse.current = t; refuse(); clunk(); }
        vault.wheelV *= -0.32;
      }
      if (vault.wheelLock && Math.abs(vault.wheel) < 0.01 && Math.abs(vault.wheelV) < 0.1) vault.wheelLock = false;
    }
    if (wheel.current) wheel.current.rotation.z = vault.wheel;
    // The red lamp.
    vault.lamp = Math.max(0, vault.lamp - dt * 0.45);
    const lit = vault.lamp > 0 ? 0.55 + 0.45 * Math.sign(Math.sin(t * 9)) * Math.min(1, vault.lamp * 3) : 0;
    M.red.emissiveIntensity = 0.12 + vault.lamp * 5 * (0.6 + 0.4 * lit);
    if (red.current) red.current.intensity = vault.lamp * 3.2;
    // The whole door gives a little when the bolts take the load.
    if (all.current) { const s = vault.shake; all.current.position.x = Math.sin(t * 71) * s * 0.006; all.current.position.y = Math.cos(t * 53) * s * 0.004; }
  });

  const lampAt: V3 = [Math.cos(0.72) * 2.68, Math.sin(0.72) * 2.68, FACE + 0.08];
  return (
    <group ref={all}>
      <mesh geometry={geo.recess} material={M.recess} position={[0, 0, -0.3]} />
      <mesh geometry={geo.frame} material={M.frame} castShadow receiveShadow />
      <mesh geometry={geo.door} material={M.door} castShadow receiveShadow />
      <instancedMesh ref={bolts} args={[geo.bolt, M.chrome, N]} castShadow />
      {/* the dial */}
      <group position={[0, DIAL_Y, FACE]} ref={dialC}>
        <mesh geometry={geo.bezel} material={M.chrome} castShadow receiveShadow />
        <mesh geometry={geo.pointer} material={M.red} position={[0, 0.555, 0.11]} rotation={[0, 0, Math.PI]} />
        <group ref={dial}>
          <mesh geometry={geo.dial} material={M.dial} castShadow receiveShadow
            onPointerDown={(e) => dialC.current && dialDown(e, dialC.current)} onPointerOver={(e) => { e.stopPropagation(); vault.hover = 'dial'; cursor('grab')(); }} onPointerOut={() => { vault.hover = ''; cursor('')(); }} />
        </group>
      </group>
      {/* the wheel */}
      <group position={[0, WHEEL_Y, FACE]} ref={wheelC}>
        <group ref={wheel}>
          <mesh geometry={geo.hub} material={M.chrome} castShadow receiveShadow />
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
            return (
              <group key={i} rotation={[0, 0, a - Math.PI / 2]}>
                <mesh geometry={geo.spoke} material={M.chrome} position={[0, 0.42, 0.24]} castShadow />
                <mesh geometry={geo.knob} material={M.chrome} position={[0, 0.74, 0.24]} castShadow />
              </group>
            );
          })}
          <mesh visible={false} position={[0, 0, 0.25]}
            onPointerDown={(e) => wheelC.current && wheelDown(e, wheelC.current)} onPointerOver={(e) => { e.stopPropagation(); vault.hover = 'wheel'; cursor('grab')(); }} onPointerOut={() => { vault.hover = ''; cursor('')(); }}>
            <circleGeometry args={[0.84, 32]} />
          </mesh>
        </group>
      </group>
      {/* the red lamp on the frame */}
      <group position={lampAt}>
        <mesh geometry={geo.lampRim} material={M.chrome} />
        <mesh geometry={geo.lamp} material={M.red} />
        <pointLight ref={red} color="#ff2a10" intensity={0} distance={4} decay={2} position={[0, 0, 0.3]} />
      </group>
      {/* the work lamp over the door */}
      <group position={[0, 3.62, 0.62]}>
        <mesh geometry={geo.arm} material={M.black} position={[0, 0.2, -0.3]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={geo.shade} material={M.black} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.25, 0]} />
        <mesh geometry={geo.bulb} material={M.bulb} position={[0, 0.06, 0]} />
      </group>
    </group>
  );
}

/* ───────────── the wall: plaster with a round hole for the door ───────────── */

function Wall({ M }: { M: Mats }) {
  const g = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-30, -18); s.lineTo(30, -18); s.lineTo(30, 18); s.lineTo(-30, 18); s.lineTo(-30, -18);
    const h = new THREE.Path(); h.absarc(0, 0, FRAME_OUT - 0.02, 0, Math.PI * 2, true); s.holes.push(h);
    return new THREE.ShapeGeometry(s, 64);
  }, []);
  useEffect(() => () => g.dispose(), [g]);
  return <mesh geometry={g} material={M.wall} receiveShadow />;
}

/* ───────────── seven deposit boxes ───────────── */

function Boxes({ M, phone }: { M: Mats; phone: boolean }) {
  const parts = useMemo(() => {
    const front = new RoundedBoxGeometry(2.3, 0.52, 0.16, 3, 0.03);
    const cab = new RoundedBoxGeometry(2.72, 4.72, 0.34, 3, 0.05);
    const label = new THREE.PlaneGeometry(0.98, 0.3);
    const hole = new THREE.CylinderGeometry(0.035, 0.035, 0.03, 20);
    const rose = new THREE.CylinderGeometry(0.075, 0.075, 0.025, 28);
    const plates = DRIVE.items.map((d, i) => plate(phone ? 384 : 640, phone ? 117 : 196, [{ t: `${String(i + 1).padStart(2, '0')}   ${d.term}`, px: phone ? 50 : 84, w: 600 }], 60 + i));
    const mats = plates.map((p) => new THREE.MeshPhysicalMaterial({ map: p.map, bumpMap: p.bump, bumpScale: 1.2, roughnessMap: p.orm, metalness: 1, roughness: 1, envMapIntensity: 1.5 }));
    return { front, cab, label, hole, rose, plates, mats };
  }, [phone]);
  useEffect(() => () => { [parts.front, parts.cab, parts.label, parts.hole, parts.rose].forEach((g) => g.dispose()); parts.mats.forEach((m) => m.dispose()); parts.plates.forEach((p) => Object.values(p).forEach((t) => t.dispose())); }, [parts]);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const z = useRef(DRIVE.items.map(() => ({ x: 0, v: 0 })));
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    z.current.forEach((s, i) => {
      const target = vault.box === i ? 0.11 : 0;
      if (still) s.x = target; else { s.v += ((target - s.x) * 260 - s.v * 17) * dt; s.x += s.v * dt; if (target > 0 && s.x > target) { s.x = target; s.v = -s.v * 0.2; } }
      const g = refs.current[i]; if (g) g.position.z = 0.3 + s.x;
    });
  });
  return (
    <group position={[BOX_X, 0, 0]}>
      <mesh geometry={parts.cab} material={M.black} position={[0, 0, 0.12]} receiveShadow />
      {DRIVE.items.map((d, i) => (
        <group key={d.term} position={[0, BOX_Y(i), 0.3]} ref={(el) => { refs.current[i] = el; }}>
          <mesh geometry={parts.front} material={M.box} castShadow receiveShadow
            onClick={(e) => { e.stopPropagation(); vault.box = i; vault.onBox?.(i); }} onPointerOver={(e) => { e.stopPropagation(); cursor('pointer')(); }} onPointerOut={cursor('')} />
          <mesh geometry={parts.label} material={parts.mats[i]} position={[-0.52, 0, 0.083]} />
          {[0.62, 0.86].map((x) => (
            <group key={x} position={[x, 0, 0.085]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh geometry={parts.rose} material={M.brass} />
              <mesh geometry={parts.hole} material={M.recess} position={[0, 0.006, 0]} scale={[0.55, 1, 1.5]} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ───────────── two brass plates and two keys ───────────── */

function Plates({ phone }: { phone: boolean }) {
  const p = useMemo(() => {
    const geo = new RoundedBoxGeometry(2.55, 1.5, 0.05, 2, 0.02);
    const mats = recordPlates().map((t) => new THREE.MeshPhysicalMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 1.4, roughnessMap: t.orm, metalness: 1, roughness: 1, envMapIntensity: 1.5 }));
    return { geo, mats };
  }, []);
  useEffect(() => () => { p.geo.dispose(); p.mats.forEach((m) => { m.map?.dispose(); m.bumpMap?.dispose(); m.roughnessMap?.dispose(); m.dispose(); }); }, [p]);
  void phone;
  return (
    <group position={[REC_X, 0, 0.03]}>
      {p.mats.map((m, i) => <mesh key={i} geometry={p.geo} material={m} position={[0, 0.95 - i * 1.66, 0]} castShadow receiveShadow />)}
    </group>
  );
}

function Keys({ M }: { M: Mats }) {
  const g = useMemo(() => {
    const ring = new THREE.TorusGeometry(0.15, 0.035, 16, 48);
    const shaft = new THREE.CylinderGeometry(0.03, 0.03, 0.62, 16);
    const bit = new RoundedBoxGeometry(0.16, 0.05, 0.04, 2, 0.01);
    const hook = new THREE.TorusGeometry(0.06, 0.016, 10, 24, Math.PI * 1.3);
    const board = new RoundedBoxGeometry(2.7, 1.75, 0.08, 2, 0.03);
    const tag = new RoundedBoxGeometry(0.8, 0.47, 0.012, 2, 0.006);
    const tags = keyTags().map((t) => new THREE.MeshPhysicalMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 1.2, roughnessMap: t.orm, metalness: 1, roughness: 1, envMapIntensity: 1.4 }));
    return { ring, shaft, bit, hook, board, tag, tags };
  }, []);
  useEffect(() => () => { [g.ring, g.shaft, g.bit, g.hook, g.board, g.tag].forEach((x) => x.dispose()); g.tags.forEach((m) => { m.map?.dispose(); m.bumpMap?.dispose(); m.roughnessMap?.dispose(); m.dispose(); }); }, [g]);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const s = useRef([{ a: 0, v: 0 }, { a: 0, v: 0 }]);
  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05);
    s.current.forEach((k, i) => {
      if (vault.swing[i]) { k.v += vault.swing[i] * 2.6 * (i ? -1 : 1); vault.swing[i] = 0; }
      if (still) k.a = 0; else { k.v += (-18 * k.a - 0.9 * k.v) * dt; k.a += k.v * dt; }
      const r = refs.current[i]; if (r) r.rotation.z = k.a + (still ? 0 : Math.sin(st.clock.elapsedTime * 0.7 + i * 2) * 0.012);
    });
  });
  return (
    <group position={[REC_X, -2.95, 0]}>
      <mesh geometry={g.board} material={M.black} position={[0, 0, 0.04]} receiveShadow />
      {[0, 1].map((i) => (
        <group key={i} position={[i ? 0.62 : -0.62, 0.62, 0.14]}>
          <mesh geometry={g.hook} material={M.chrome} rotation={[0, Math.PI / 2, Math.PI * 0.85]} />
          <group ref={(el) => { refs.current[i] = el; }}
            onClick={(e) => { e.stopPropagation(); vault.swing[i] = 1; }} onPointerOver={(e) => { e.stopPropagation(); cursor('pointer')(); }} onPointerOut={cursor('')}>
            <mesh geometry={g.ring} material={M.brass} position={[0, -0.17, 0]} castShadow />
            <mesh geometry={g.shaft} material={M.brass} position={[0, -0.62, 0]} castShadow />
            <mesh geometry={g.bit} material={M.brass} position={[0.07, -0.86, 0]} castShadow />
            <mesh geometry={g.bit} material={M.brass} position={[0.05, -0.76, 0]} scale={[0.7, 1, 1]} castShadow />
            <mesh geometry={g.tag} material={g.tags[i]} position={[i ? -0.5 : 0.5, -0.5, -0.03]} rotation={[0, 0, i ? 0.08 : -0.08]} castShadow />
          </group>
        </group>
      ))}
    </group>
  );
}

/* ───────────── lights, camera ───────────── */

function Rig({ phone }: { phone: boolean }) {
  const { camera, size, scene } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const key = useRef<THREE.SpotLight>(null), top = useRef<THREE.SpotLight>(null), sweep = useRef<THREE.SpotLight>(null), sideA = useRef<THREE.SpotLight>(null), sideB = useRef<THREE.SpotLight>(null);
  const targets = useMemo(() => ({ key: new THREE.Object3D(), top: new THREE.Object3D(), sweep: new THREE.Object3D(), a: new THREE.Object3D(), b: new THREE.Object3D() }), []);
  const cur = useRef({ p: new THREE.Vector3(...SHOTS[0].p).add(new THREE.Vector3(0, 0, 4)), t: new THREE.Vector3(...SHOTS[0].t), fov: 28, sx: 0.2, sy: 0 });
  const p = useMemo(() => new THREE.Vector3(), []), tt = useMemo(() => new THREE.Vector3(), []);
  const born = useRef(-1);
  useEffect(() => {
    targets.key.position.set(0, 0, 0.6); targets.top.position.set(0, -0.6, 0.6); targets.a.position.set(REC_X, -0.8, 0); targets.b.position.set(BOX_X, 0, 0);
    Object.values(targets).forEach((o) => scene.add(o));
    return () => { Object.values(targets).forEach((o) => scene.remove(o)); };
  }, [scene, targets]);
  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime;
    if (born.current < 0) { born.current = t; vault.ready = true; }
    vault.open = still ? 1 : clamp((t - born.current - 0.4) / 3.6);
    const o = vault.open;
    // Where along the page are we?
    const st = vault.stops, y = scroll.y; let f = 0;
    if (st.length === SHOTS.length) {
      f = st.length - 1;
      for (let i = 0; i < st.length; i++) {
        if (y <= st[i].b) { f = i === 0 || y >= st[i].a ? i : i - 1 + smooth(clamp((y - st[i - 1].b) / Math.max(1, st[i].a - st[i - 1].b))); break; }
      }
    }
    vault.f = f;
    const i0 = Math.floor(f), i1 = Math.min(SHOTS.length - 1, i0 + 1), u = f - i0, A = SHOTS[i0], B = SHOTS[i1];
    p.set(lerp(A.p[0], B.p[0], u), lerp(A.p[1], B.p[1], u), lerp(A.p[2], B.p[2], u));
    tt.set(lerp(A.t[0], B.t[0], u), lerp(A.t[1], B.t[1], u), lerp(A.t[2], B.t[2], u));
    // A travelling shot pulls back a little in the middle, so it never cuts through the door.
    p.z += Math.sin(u * Math.PI) * Math.min(4, p.distanceTo(new THREE.Vector3(...B.p)) * 0.15);
    // The opening dolly.
    p.z += (1 - smooth(o)) * 3.2; p.x += (1 - smooth(o)) * 0.6;
    let fov = lerp(A.fov, B.fov, u), sx = lerp(A.side, B.side, u) * 0.2, sy = 0;
    if (phone) { fov = (2 * Math.atan(Math.tan((fov * Math.PI) / 360) * 1.95) * 180) / Math.PI; sx = 0; sy = 0.21; }
    const c = cur.current, k = still ? 1 : 1 - Math.exp(-4.2 * dt);
    c.p.lerp(p, k); c.t.lerp(tt, k); c.fov = lerp(c.fov, fov, k); c.sx = lerp(c.sx, sx, k); c.sy = lerp(c.sy, sy, k);
    const sh = vault.shake; vault.shake = Math.max(0, sh - dt * 4);
    cam.position.copy(c.p); cam.position.x += Math.sin(t * 90) * sh * 0.012; cam.position.y += Math.cos(t * 77) * sh * 0.01;
    cam.lookAt(c.t);
    cam.fov = c.fov;
    cam.setViewOffset(size.width, size.height, -c.sx * size.width, c.sy * size.height, size.width, size.height);
    cam.updateProjectionMatrix();
    // The lights: the lamp comes on, a light sweeps the metal, and at the end everything but the lamp goes down.
    const e = smooth(clamp(f - 7));
    const flick = o < 0.12 ? (Math.sin(t * 61) > 0.2 ? 1 : 0.15) * (o / 0.12) : 1;
    scene.environmentIntensity = (0.2 + 0.8 * smooth(clamp((o - 0.15) / 0.5))) * (1 - 0.82 * e);
    if (top.current) top.current.intensity = 2.3 * flick * (1 - 0.15 * e);
    if (key.current) key.current.intensity = 1.6 * smooth(clamp((o - 0.3) / 0.5)) * (1 - 0.95 * e);
    if (sideA.current) sideA.current.intensity = 2.2 * smooth(clamp((o - 0.6) / 0.4)) * (1 - e);
    if (sideB.current) sideB.current.intensity = 2.2 * smooth(clamp((o - 0.6) / 0.4)) * (1 - e);
    const sw = clamp((o - 0.08) / 0.62);
    if (sweep.current) {
      const x = lerp(-7, 7, smooth(sw));
      sweep.current.position.set(x, 2.5, 6.5); targets.sweep.position.set(x * 0.45, -0.2, 0.5);
      sweep.current.intensity = 9 * Math.sin(Math.PI * sw);
    }
  });
  const shadow = phone ? 512 : 1024;
  return (
    <>
      <ambientLight intensity={0.04} />
      <spotLight ref={top} position={[0, 3.45, 1.15]} target={targets.top} angle={1.0} penumbra={0.75} decay={0} intensity={0} color="#ffe1b5" castShadow shadow-mapSize={[shadow, shadow]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
      <spotLight ref={key} position={[-5, 5.5, 9.5]} target={targets.key} angle={0.36} penumbra={0.9} decay={0} intensity={0} color="#fff3e2" castShadow shadow-mapSize={[shadow, shadow]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
      <spotLight ref={sweep} target={targets.sweep} angle={0.16} penumbra={0.6} decay={0} intensity={0} color="#fff8ee" />
      <spotLight ref={sideA} position={[REC_X + 1.2, 4.2, 5]} target={targets.a} angle={0.55} penumbra={0.85} decay={0} intensity={0} color="#ffe6c4" />
      <spotLight ref={sideB} position={[BOX_X - 1.2, 4.2, 5.5]} target={targets.b} angle={0.55} penumbra={0.85} decay={0} intensity={0} color="#f1f2ff" />
      <directionalLight position={[8, 1, 3]} intensity={0.25} color="#b9cbff" />
    </>
  );
}

function Env() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#050506']} />
      <Lightformer form="rect" intensity={2.4} color="#fff1dc" position={[0, 7, 4]} rotation-x={Math.PI / 2} scale={[10, 2.5, 1]} />
      <Lightformer form="rect" intensity={1.3} color="#ffd9a8" position={[-8, 1.5, 4]} rotation-y={Math.PI / 2} scale={[2.2, 9, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#c9d6ff" position={[8, -1, 3]} rotation-y={-Math.PI / 2} scale={[1.4, 9, 1]} />
      <Lightformer form="ring" intensity={0.9} color="#ffffff" position={[0, 0, 12]} scale={5} />
      <Lightformer form="rect" intensity={0.35} color="#ffffff" position={[0, -6, 5]} rotation-x={-Math.PI / 2} scale={[14, 3, 1]} />
    </Environment>
  );
}

export default function Scene({ phone }: { phone: boolean }) {
  return (
    <Canvas dpr={[1, phone ? 1.4 : 1.6]} shadows={{ type: THREE.PCFShadowMap }} camera={{ fov: 28, near: 0.3, far: 90, position: [0, 0, 19] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }} onPointerMissed={() => { document.body.style.cursor = ''; }}>
      <color attach="background" args={[BG]} />
      <Scenery phone={phone} />
      {!phone && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO halfRes aoRadius={0.45} intensity={1.8} distanceFalloff={0.5} color="#000000" />
          <Bloom luminanceThreshold={0.92} intensity={0.55} mipmapBlur radius={0.6} />
          <Vignette offset={0.28} darkness={0.72} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

function Scenery({ phone }: { phone: boolean }) {
  const M = useMats(phone);
  return (
    <>
      <Env />
      <Rig phone={phone} />
      <Wall M={M} />
      <Door M={M} />
      <Boxes M={M} phone={phone} />
      <Plates phone={phone} />
      <Keys M={M} />
    </>
  );
}
