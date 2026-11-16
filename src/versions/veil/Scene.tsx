// The gallery: one light from above, a polished floor, a low plinth, the mark
// in black stone, and the sheet over it. The sheet is the star.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer, MeshReflectorMaterial, RoundedBox } from '@react-three/drei';
import { EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import MARKS from '@/lib/marks.json';
import { scroll } from '@/lib/scroll';
import { clamp, damp, smooth, still } from '@/lib/utils';
import { Cloth, veil, type Sphere } from './cloth';
import { inShapes, markShapes, outline } from './shape';

const BG = '#0e0d0c';
const PL = { w: 1.5, h: 0.34, d: 1.0 };
const MARK_H = 1.5;
const DEPTH = 0.3;

/** The mark as an extruded solid, plus the spheres the sheet hangs on. */
function useMark() {
  return useMemo(() => {
    const m = MARKS.italic;
    const shapes = markShapes(m.d);
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: DEPTH / ((MARK_H) / m.h), bevelEnabled: true, bevelThickness: 18, bevelSize: 12, bevelSegments: 4, curveSegments: 22 });
    geo.computeBoundingBox();
    const bb = geo.boundingBox!.clone();
    const s = MARK_H / (bb.max.y - bb.min.y);
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
    // SVG y runs down: flip it, stand it on the plinth.
    geo.translate(-cx, -bb.max.y, -cz);
    geo.scale(s, -s, s);
    geo.translate(0, PL.h, 0);
    geo.computeVertexNormals();
    // Spheres: sample the outline's interior on a grid.
    const spheres: Sphere[] = [];
    const step = 0.08 / s;
    for (let y = bb.min.y + step * 0.5; y < bb.max.y; y += step) for (let x = bb.min.x + step * 0.5; x < bb.max.x; x += step) {
      if (inShapes(shapes, x, y)) spheres.push({ x: (x - cx) * s, y: (bb.max.y - y) * s + PL.h, z: 0, r: 0.14 });
    }
    // And along the outline, so the thin hairlines of the hook hold the sheet too.
    for (const q of outline(shapes, 0.06 / s)) spheres.push({ x: (q.x - cx) * s, y: (bb.max.y - q.y) * s + PL.h, z: 0, r: 0.11 });
    const top = PL.h + MARK_H;
    return { geo, spheres, top };
  }, []);
}

/** A fine silk weave, drawn once, as a normal map. */
function useWeave() {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const img = g.createImageData(64, 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const nx = Math.sin((x / 64) * Math.PI * 16) * (Math.floor(y / 4) % 2 ? 1 : -1);
      const ny = Math.sin((y / 64) * Math.PI * 16) * (Math.floor(x / 4) % 2 ? 1 : -1);
      const i = (y * 64 + x) * 4;
      img.data[i] = 128 + nx * 40; img.data[i + 1] = 128 + ny * 40; img.data[i + 2] = 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 26);
    return t;
  }, []);
}

const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();

function Gallery({ phone }: { phone: boolean }) {
  const mark = useMark();
  const weave = useWeave();
  const { camera, gl, raycaster, pointer } = useThree();
  const n = phone ? 36 : 50;
  const SIZE = 4.4;
  const cloth = useMemo(() => {
    const c = new Cloth(n, SIZE, { x0: -PL.w / 2, x1: PL.w / 2, y0: -1, y1: PL.h, z0: -PL.d / 2, z1: PL.d / 2 }, phone ? 5 : 6);
    c.setSpheres(mark.spheres);
    if (still) {
      // Half unveiled: the sheet has slipped off and lies at the foot of the plinth.
      c.layFlat(-1.6, 0.6, 0.55, 0.5);
      for (let i = 0; i < 420; i++) c.step(1 / 60);
    } else {
      c.layFlat(0.04, mark.top + 0.3, 0.02, 0.35);
      for (let i = 0; i < 340; i++) c.step(1 / 60);
    }
    return c;
  }, [n, phone, mark]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(cloth.pos, 3));
    const uv = new Float32Array(n * n * 2);
    const idx: number[] = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      uv[(j * n + i) * 2] = i / (n - 1); uv[(j * n + i) * 2 + 1] = j / (n - 1);
      if (i < n - 1 && j < n - 1) { const a = j * n + i; idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); }
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [cloth, n]);

  const silk = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#e6dfd1', roughness: 0.52, sheen: 1, sheenRoughness: 0.32, sheenColor: new THREE.Color('#fff6e6'),
    side: THREE.DoubleSide, normalMap: weave, normalScale: new THREE.Vector2(0.12, 0.12), envMapIntensity: 0.55,
  }), [weave]);

  // Interaction state lives in refs: the hand, the scripted pull, the draught.
  const hand = useRef<{ idx: number; plane: THREE.Plane; on: boolean }>({ idx: -1, plane: new THREE.Plane(), on: false });
  const act = useRef<{ kind: '' | 'pull' | 'draught'; t: number; idx: number; from: THREE.Vector3; side: THREE.Vector3; fwd: THREE.Vector3; yaw: number; ox: number; oz: number; flat: Float32Array }>(
    { kind: '', t: 0, idx: -1, from: new THREE.Vector3(), side: new THREE.Vector3(), fwd: new THREE.Vector3(), yaw: 0, ox: 0, oz: 0, flat: new Float32Array(n * n * 3) });
  const acc = useRef(0), frame = useRef(0), quiet = useRef(0);
  const key = useRef<THREE.SpotLight>(null), rim = useRef<THREE.SpotLight>(null);
  const cam = useRef({ th: -0.42, y: 1.32 });
  const light = useRef(still ? 1 : 0);
  const house = useRef(1);

  const neighbours = (idx: number, w: number, r: number) => {
    const i0 = idx % n, j0 = Math.floor(idx / n);
    for (let j = Math.max(0, j0 - r); j <= Math.min(n - 1, j0 + r); j++) for (let i = Math.max(0, i0 - r); i <= Math.min(n - 1, i0 + r); i++) {
      const d = Math.hypot(i - i0, j - j0);
      if (d > r) continue;
      const k = j * n + i;
      cloth.pin[k] = w * (1 - d / (r + 1));
    }
  };
  const setTargets = (idx: number, p: THREE.Vector3, r: number) => {
    const i0 = idx % n, j0 = Math.floor(idx / n);
    const b = idx * 3;
    const ox = p.x - cloth.pos[b], oy = p.y - cloth.pos[b + 1], oz = p.z - cloth.pos[b + 2];
    for (let j = Math.max(0, j0 - r); j <= Math.min(n - 1, j0 + r); j++) for (let i = Math.max(0, i0 - r); i <= Math.min(n - 1, i0 + r); i++) {
      const k = (j * n + i) * 3;
      cloth.tgt[k] = cloth.pos[k] + ox; cloth.tgt[k + 1] = Math.max(0.02, cloth.pos[k + 1] + oy); cloth.tgt[k + 2] = cloth.pos[k + 2] + oz;
    }
  };

  useEffect(() => {
    const up = () => { if (hand.current.on) { hand.current.on = false; cloth.pin.fill(0); cloth.fric = 0.85; gl.domElement.style.cursor = ''; } };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [cloth, gl]);

  const grab = (e: ThreeEvent<PointerEvent>) => {
    if (still || act.current.kind) return;
    e.stopPropagation();
    const f = e.face; if (!f) return;
    let best = f.a, bd = Infinity;
    for (const v of [f.a, f.b, f.c]) { tmpV.fromArray(cloth.pos, v * 3); const d = tmpV.distanceToSquared(e.point); if (d < bd) { bd = d; best = v; } }
    camera.getWorldDirection(tmpV2);
    hand.current = { idx: best, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(tmpV2.clone().negate(), e.point), on: true };
    (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
    gl.domElement.style.cursor = 'grabbing';
    cloth.fric = 0.22;
    cloth.sleep = 0; quiet.current = 0;
  };

  // A hand passing over the silk stirs it: a breath of lift under the pointer.
  const brush = (e: ThreeEvent<PointerEvent>) => {
    if (still || hand.current.on || act.current.kind || !e.face) return;
    const v = e.face.a, i0 = v % n, j0 = Math.floor(v / n), r = 3;
    const sp = Math.min(1, Math.hypot(e.movementX ?? 0, e.movementY ?? 0) / 20);
    for (let j = Math.max(0, j0 - r); j <= Math.min(n - 1, j0 + r); j++) for (let i = Math.max(0, i0 - r); i <= Math.min(n - 1, i0 + r); i++) {
      const d = Math.hypot(i - i0, j - j0); if (d > r) continue;
      cloth.prev[(j * n + i) * 3 + 1] -= 0.0035 * sp * (1 - d / (r + 1));
    }
    quiet.current = 0;
  };

  const startPull = () => {
    let idx = 0, hy = -Infinity;
    for (let p = 0; p < n * n; p++) { const y = cloth.pos[p * 3 + 1] + (Math.random() * 0.04); if (y > hy) { hy = y; idx = p; } }
    const a = act.current;
    a.kind = 'pull'; a.t = 0; a.idx = idx; a.from.fromArray(cloth.pos, idx * 3);
    camera.getWorldDirection(a.fwd); a.fwd.y = 0; a.fwd.normalize();
    a.side.set(-a.fwd.z, 0, a.fwd.x);
    cloth.fric = 0.08;
    veil.busy = true;
  };
  const startDraught = () => {
    const a = act.current;
    a.kind = 'draught'; a.t = 0;
    a.yaw = Math.random() * Math.PI; a.ox = (Math.random() - 0.5) * 0.24; a.oz = (Math.random() - 0.5) * 0.24;
    veil.busy = true;
  };

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    // The opening: the house light comes up on the object.
    if (!still) light.current = Math.min(1, light.current + dt / 2.6);
    house.current = damp(house.current, veil.house, 2.2, dt);
    const L = smooth(light.current) * house.current;
    if (key.current) { key.current.intensity = 420 * L; key.current.angle = 0.3 * (0.75 + 0.25 * house.current); }
    if (rim.current) rim.current.intensity = 150 * L;
    veil.light = L;

    // Requests from the page.
    if (veil.want && !act.current.kind && !still) {
      const w = veil.want; veil.want = null;
      hand.current.on = false; cloth.pin.fill(0);
      if (w === 'unveil') startPull(); else startDraught();
      cloth.sleep = 0; quiet.current = 0;
    }

    // The camera walks round the plinth at eye level.
    const p = scroll.p;
    const R = phone ? 10.2 : 7.7;
    const th = -0.42 + p * Math.PI * 2 + (hand.current.on ? 0 : state.pointer.x * 0.05);
    cam.current.th = still ? th : damp(cam.current.th, th, 3, dt);
    cam.current.y = damp(cam.current.y, 1.3 + (hand.current.on ? 0 : state.pointer.y * 0.06), 3, dt);
    camera.position.set(Math.sin(cam.current.th) * R, cam.current.y, Math.cos(cam.current.th) * R);
    camera.lookAt(0, phone ? 0.42 : 0.82, 0);

    if (still) return;
    const a = act.current;
    // The scripted pull: up off the hook, out to the side, down to the floor.
    if (a.kind === 'pull') {
      a.t += dt / 1.9;
      const t = clamp(a.t);
      const e = 1 - Math.pow(1 - t, 2.2);
      const end = tmpV2.copy(a.side).multiplyScalar(2.8).addScaledVector(a.fwd, -0.9); end.y = 0.05;
      const mid = tmpV.copy(a.from).addScaledVector(a.side, 1.0); mid.y += 0.55;
      const q = new THREE.Vector3();
      // Quadratic curve from the hook through a lift to the floor.
      q.copy(a.from).multiplyScalar((1 - e) * (1 - e)).addScaledVector(mid, 2 * e * (1 - e)).addScaledVector(end, e * e);
      neighbours(a.idx, 0.45, 2);
      setTargets(a.idx, q, 2);
      if (a.t >= 1) { a.kind = ''; cloth.pin.fill(0); cloth.fric = 0.85; veil.busy = false; }
    } else if (a.kind === 'draught') {
      a.t += dt / 2.1;
      const t = a.t;
      const rise = smooth(clamp(t / 0.55));
      const yb = lerpN(0.6, mark.top + 0.75, rise);
      cloth.flatTarget(a.flat, a.ox, yb, a.oz, a.yaw, 0.42 * (1 - clamp(t)), t);
      const w = t < 0.75 ? 0.02 + 0.1 * smooth(clamp(t / 0.4)) : 0;
      cloth.tgt.set(a.flat); cloth.pin.fill(w);
      if (t >= 0.75) { a.kind = ''; cloth.pin.fill(0); veil.busy = false; }
    }
    // The hand.
    if (hand.current.on) {
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.ray.intersectPlane(hand.current.plane, tmpV);
      if (hit) { hit.y = Math.max(0.03, hit.y); neighbours(hand.current.idx, 0.32, 2); setTargets(hand.current.idx, hit, 2); }
    }

    // Fixed steps; sleep when the silk has settled.
    const busy = hand.current.on || !!a.kind;
    if (busy) quiet.current = 0;
    if (quiet.current < 150) {
      acc.current += dt;
      let s = 0;
      while (acc.current >= 1 / 60 && s < 3) { cloth.step(1 / 60); acc.current -= 1 / 60; s++; }
      if (s === 0) return;
      const attr = geo.getAttribute('position') as THREE.BufferAttribute;
      attr.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      if (!busy && cloth.energy() < 2e-8) quiet.current++; else if (!busy) quiet.current = Math.max(0, quiet.current - 1);
    }
    if (++frame.current % 20 === 0) {
      const c = cloth.coverage(mark.top) > 0.07;
      if (c !== veil.covered && !a.kind) { veil.covered = c; veil.onCovered?.(c); }
    }
  });

  return (
    <>
      <mesh geometry={mark.geo} castShadow receiveShadow>
        <meshPhysicalMaterial color="#080808" roughness={0.16} metalness={0} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={2.6} />
      </mesh>
      <RoundedBox args={[PL.w, PL.h, PL.d]} radius={0.018} smoothness={3} position={[0, PL.h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1d1b19" roughness={0.78} metalness={0} envMapIntensity={0.5} />
      </RoundedBox>
      <mesh geometry={geo} material={silk} castShadow receiveShadow onPointerDown={grab} onPointerMove={brush}
        onPointerOver={() => { if (!hand.current.on && !still) gl.domElement.style.cursor = 'grab'; }}
        onPointerOut={() => { if (!hand.current.on) gl.domElement.style.cursor = ''; }} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <MeshReflectorMaterial blur={[380, 110]} resolution={phone ? 384 : 1024} mixBlur={1} mixStrength={9} mixContrast={1} roughness={0.9} depthScale={1} minDepthThreshold={0.4} maxDepthThreshold={1.3} color="#0c0b0a" metalness={0.2} mirror={0.55} envMapIntensity={0} />
      </mesh>
      <spotLight ref={key} position={[0.6, 7.2, 1.2]} angle={0.3} penumbra={0.85} distance={14} decay={2} castShadow shadow-mapSize={[phone ? 1024 : 2048, phone ? 1024 : 2048]} shadow-bias={-0.0012} shadow-normalBias={0.05} color="#fff3e2" intensity={0} />
      <spotLight ref={rim} position={[-3.4, 3.4, -4.2]} angle={0.5} penumbra={1} distance={14} decay={2} color="#e3e6ef" intensity={0} />
      <ambientLight intensity={0.035} />
    </>
  );
}
const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;

export default function Scene({ phone }: { phone: boolean }) {
  return (
    <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.6]} frameloop={still ? 'demand' : 'always'}
      camera={{ fov: phone ? 30 : 26, near: 0.1, far: 60, position: [0, 1.3, 7.7] }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 10, 24]} />
      <Gallery phone={phone} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#050505']} />
        <Lightformer form="rect" intensity={3.2} position={[0, 6, 0.5]} scale={[4, 4, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={0.9} position={[-5, 1.6, 2]} scale={[1.2, 5, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.6} position={[5, 2, -2]} scale={[1.2, 5, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" intensity={1.2} position={[0, 2.4, -6]} scale={[6, 1.2, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[0, 1.6, 6]} scale={[5, 0.6, 1]} rotation-y={Math.PI} />
      </Environment>
      <EffectComposer multisampling={0}>
        <N8AO halfRes aoRadius={0.32} intensity={1.7} distanceFalloff={0.6} color="#000000" />
        <Vignette offset={0.25} darkness={0.7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
