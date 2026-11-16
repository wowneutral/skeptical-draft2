// The knot's stage: two three-strand ropes on a paper sweep, lit like a product shot.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { clamp, lerp, still } from '@/lib/utils';
import { fibreMaps, fuzz, makeKeys, paperMap, poseAt, R, ropeGeometry, threadMap, N } from './rope';
import { knot } from './store';

/* Camera per stage: distance, elevation, azimuth (deg), target x, z. */
type Cam = [number, number, number, number, number];
const CAMS: Cam[] = [
  [21, 40, -10, 0, 0.3],
  [22, 46, 4, 0, 0.3],
  [25, 53, 12, 0, 0.2],
  [24, 60, -4, 0, 0.1],
  [30, 70, 0, 1.0, 0.8],
  [0, 89.6, 0, 0, 0], // join: straight above the mark (distance and target set from the mark)
  [0, 89.6, 0, 0, 0], // ending: higher still
];

function Sweep({ map }: { map: THREE.Texture }) {
  const geo = useMemo(() => {
    const zf = -7, Rr = 7, prof: [number, number][] = [[60, 0], [zf, 0]];
    for (let i = 1; i <= 20; i++) { const a = (i / 20) * Math.PI / 2; prof.push([zf - Rr * Math.sin(a), Rr - Rr * Math.cos(a)]); }
    prof.push([zf - Rr, 60]);
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    let s = 0;
    prof.forEach(([z, y], i) => { if (i) s += Math.hypot(z - prof[i - 1][0], y - prof[i - 1][1]); for (const x of [-80, 80]) { pos.push(x, y, z); uv.push(x / 3, s / 3); } });
    for (let i = 0; i < prof.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color="#e3e0da" roughness={1} bumpMap={map} bumpScale={0.25} envMapIntensity={0.35} />
    </mesh>
  );
}

function Ropes({ low }: { low: boolean }) {
  const keys = useMemo(makeKeys, []);
  const maps = useMemo(fibreMaps, []);
  const thread = useMemo(threadMap, []);
  const A = useMemo(() => ropeGeometry(low ? 220 : 340, low ? 7 : 9, 7.2), [low]);
  const B = useMemo(() => ropeGeometry(low ? 160 : 240, low ? 7 : 9, 7.2), [low]);
  const bone = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#e9e1cd', map: maps.color, roughness: 0.82, roughnessMap: maps.rough, normalMap: maps.normal, normalScale: new THREE.Vector2(0.9, 0.9),
    sheen: 1, sheenColor: new THREE.Color('#fff8e8'), sheenRoughness: 0.55, envMapIntensity: 0.7,
  }), [maps]);
  const black = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#2a2724', map: maps.color, roughness: 0.7, roughnessMap: maps.rough, normalMap: maps.normal, normalScale: new THREE.Vector2(1, 1),
    sheen: 1, sheenColor: new THREE.Color('#8d877c'), sheenRoughness: 0.45, envMapIntensity: 0.8,
  }), [maps]);
  const whip = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7d2318', roughness: 0.6, bumpMap: thread, bumpScale: 1.2 }), [thread]);
  const bandGeo = useMemo(() => new THREE.CylinderGeometry(R * 1.1, R * 1.1, 0.24, 18, 1, true), []);
  const bands = useRef<(THREE.Mesh | null)[]>([]);
  const fzA = useMemo(() => fuzz(low ? 40 : 90, 11), [low]), fzB = useMemo(() => fuzz(low ? 40 : 90, 23), [low]);
  const ca = useMemo(() => new Float32Array(N * 3), []), cb = useMemo(() => new Float32Array(N * 3), []);
  const last = useRef({ f: -1, give: -1, px: -1, py: -1, jam: -1 });
  const vel = useRef(0);
  const shown = useRef(still ? 5 : 1.25);
  const giveS = useRef({ v: 0, vel: 0 });
  const endWorld = useMemo(() => new THREE.Vector3(), []);
  const restEnd = useMemo(() => new THREE.Vector3(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -R), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const pull = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const { camera, size, invalidate } = useThree();
  const cam = useRef({ d: 17, e: 38, a: -10, tx: 0, tz: 0.5, ox: 0, oy: 0 });
  const markC = useMemo(() => {
    const k = keys.A[5]; let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const arr of [keys.A[5], keys.B[5]]) for (let i = 0; i < arr.length; i += 3) { x0 = Math.min(x0, arr[i]); x1 = Math.max(x1, arr[i]); z0 = Math.min(z0, arr[i + 2]); z1 = Math.max(z1, arr[i + 2]); }
    void k;
    return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, h: z1 - z0 + 1.2, w: x1 - x0 + 1.2 };
  }, [keys]);

  useEffect(() => () => { A.geo.dispose(); B.geo.dispose(); }, [A, B]);

  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.3);
    // The stage springs toward the scroll's stage: a little overshoot, then it settles.
    const target = still ? 5 + (knot.f >= 5.5 ? 1 : 0) * 0 : (knot.ready ? knot.f : 1.25);
    if (still) shown.current = clamp(knot.f, 5, 6);
    else {
      const k = 10, c = 5.2, n = Math.ceil(dt / (1 / 60)), h = dt / n;
      for (let s = 0; s < n; s++) { vel.current += ((target - shown.current) * k - vel.current * c) * h; shown.current += vel.current * h; }
    }
    const f = clamp(shown.current, 0, 6);
    knot.shown = f;
    knot.jam = Math.abs(f - 3) < 0.45;
    // The pull: a spring with weight; holding drives it up, letting go springs most of it back.
    const g = giveS.current;
    let goal = 0;
    if (knot.drag) {
      ray.setFromCamera(new THREE.Vector2((knot.drag.x / size.width) * 2 - 1, -(knot.drag.y / size.height) * 2 + 1), camera);
      if (ray.ray.intersectPlane(plane, hit)) { const d = hit.distanceTo(restEnd); goal = clamp(Math.log1p(d * 0.9) / 1.6, 0, 1); pull.copy(hit); }
    } else if (knot.hold) { goal = 0.85; }
    const ks = knot.drag || knot.hold ? 26 : 34, cs = knot.drag || knot.hold ? 9 : 6.5;
    { const n = Math.ceil(dt / (1 / 60)), h = dt / n; for (let s = 0; s < n; s++) { g.vel += ((goal - g.v) * ks - g.vel * cs) * h; g.v += g.vel * h; } }
    knot.give = g.v;
    const give = Math.max(0, g.v);
    // Away from the jam, a pull loosens toward the next shape; at the jam it tightens the core.
    const fl = f < 4.5 ? Math.min(f + (knot.jam ? 0 : give * 0.75), f < 2.95 ? Math.ceil(f + 0.01) : 4.4) : f;
    poseAt(keys.A, fl, ca); poseAt(keys.B, fl, cb);
    // At the jam a pull only draws the core tighter, and it strains: a small shiver under load.
    const squeeze = knot.jam ? give * 0.26 : 0;
    const shiver = squeeze > 0.05 && !still ? Math.sin(clock.elapsedTime * 47) * 0.012 * give : 0;
    if (squeeze > 0) for (const arr of [ca, cb]) for (let i = 0; i < arr.length; i += 3) {
      const r = Math.hypot(arr[i], arr[i + 2]); const w = clamp(1 - r / 4.5); arr[i] *= 1 - squeeze * w; arr[i + 2] *= 1 - squeeze * w;
      arr[i] += shiver * w; arr[i + 2] -= shiver * w * 0.6;
    }
    // The loose end: it lies toward the pointer, and while pulled it follows the hand.
    restEnd.set(ca[(N - 1) * 3], R, ca[(N - 1) * 3 + 2]);
    let ex = 0, ez = 0;
    if (knot.drag && f < 4.5) { ex = (pull.x - restEnd.x) * 0.55; ez = (pull.z - restEnd.z) * 0.55; const l = Math.hypot(ex, ez), m = 2.4 * (knot.jam ? 0.45 : 1); if (l > m) { ex *= m / l; ez *= m / l; } }
    else if (knot.pointer.in && f < 1.5 && !still) {
      ray.setFromCamera(new THREE.Vector2(knot.pointer.x * 2 - 1, -knot.pointer.y * 2 + 1), camera);
      if (ray.ray.intersectPlane(plane, hit)) { tmp.subVectors(hit, restEnd); const l = tmp.length(); if (l > 0.01) { const m = Math.min(0.45, l * 0.12); ex = (tmp.x / l) * m; ez = (tmp.z / l) * m; } }
    }
    const tail = 14;
    for (let j = 0; j < tail; j++) {
      const i = N - 1 - j, w = Math.pow(1 - j / tail, 1.6);
      ca[i * 3] += ex * w; ca[i * 3 + 2] += ez * w;
    }
    const L = last.current;
    const changed = Math.abs(L.f - fl) > 1e-4 || Math.abs(L.give - g.v) > 1e-4 || Math.abs(L.px - ex) > 1e-4 || Math.abs(L.py - ez) > 1e-4 || L.jam !== squeeze || shiver !== 0;
    if (changed) {
      L.f = fl; L.give = g.v; L.px = ex; L.py = ez; L.jam = squeeze;
      A.update(ca); B.update(cb);
      fzA.write(A.tips); fzB.write(B.tips);
      const ends = [A.ends[0], A.ends[1], B.ends[0], B.ends[1]];
      ends.forEach((e, i) => {
        const m = bands.current[i]; if (!m) return;
        m.position.copy(e.p);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), e.t);
      });
    }
    // The loose end on screen, for the page to know where a grab starts.
    endWorld.set(ca[(N - 1) * 3], ca[(N - 1) * 3 + 1], ca[(N - 1) * 3 + 2]).project(camera);
    knot.endPx.x = (endWorld.x * 0.5 + 0.5) * size.width; knot.endPx.y = (-endWorld.y * 0.5 + 0.5) * size.height;

    // The camera: slow, long lens, keeps the knot centred; at Join it looks straight down; at the end it rises.
    const i = Math.min(5, Math.floor(f)), t = f - i;
    const tt = t * t * (3 - 2 * t);
    const phone = size.width <= 820;
    const mk = (n: number): Cam => {
      const c = CAMS[n];
      if (n < 5) return phone ? [c[0] * 0.98, c[1], c[2], c[3], c[4]] : c;
      const fov = 22 * Math.PI / 180, aspect = size.width / size.height;
      const needH = markC.h / (phone ? 0.84 : 0.8), needW = markC.w / (phone ? 0.86 : 0.42);
      const d = Math.max(needH, needW / aspect) / (2 * Math.tan(fov / 2));
      return [n === 6 ? d * (phone ? 2.2 : 3.4) : d, c[1], c[2], markC.x, markC.z];
    };
    const a = mk(i), b = mk(Math.min(6, i + 1));
    const C = cam.current;
    const k = still ? 1 : 1 - Math.exp(-dt * 3);
    C.d = lerp(C.d, lerp(a[0], b[0], tt), k); C.e = lerp(C.e, lerp(a[1], b[1], tt), k); C.a = lerp(C.a, lerp(a[2], b[2], tt), k);
    C.tx = lerp(C.tx, lerp(a[3], b[3], tt), k); C.tz = lerp(C.tz, lerp(a[4], b[4], tt), k);
    // Where on screen the knot sits: right of the column on a wide screen, above the words on a phone.
    const ox = phone ? 0 : (f > 5.5 ? lerp(0.2, 0, clamp((f - 5.5) * 2)) : 0.2);
    const oy = phone ? 0 : (f > 5.5 ? lerp(0, 0.27, clamp((f - 5.5) * 2)) : 0);
    C.ox = lerp(C.ox, ox, k); C.oy = lerp(C.oy, oy, k);
    const e = C.e * Math.PI / 180, az = C.a * Math.PI / 180;
    camera.position.set(C.tx + Math.sin(az) * Math.cos(e) * C.d, Math.sin(e) * C.d, C.tz + Math.cos(az) * Math.cos(e) * C.d);
    camera.up.set(0, 1, 0);
    if (C.e > 85) camera.up.set(Math.sin(az) * -0, 0, -1).normalize().lerp(new THREE.Vector3(0, 1, 0), 0).normalize();
    camera.lookAt(C.tx, 0, C.tz);
    const pc = camera as THREE.PerspectiveCamera;
    pc.setViewOffset(size.width, size.height, -C.ox * size.width, C.oy * size.height, size.width, size.height);
    pc.updateProjectionMatrix();

    const moving = Math.abs(vel.current) > 1e-4 || Math.abs(target - shown.current) > 1e-4 || Math.abs(g.vel) > 1e-4 || Math.abs(g.v - goal) > 1e-3 || changed || Math.abs(C.d - lerp(a[0], b[0], tt)) > 1e-3 || Math.abs(C.ox - ox) > 1e-4 || Math.abs(C.oy - oy) > 1e-4;
    if (moving || knot.drag || knot.hold || knot.pointer.in) invalidate();
  });

  return (
    <group>
      <mesh geometry={A.geo} material={bone} castShadow receiveShadow />
      <mesh geometry={B.geo} material={black} castShadow receiveShadow />
      <lineSegments geometry={fzA.geo}><lineBasicMaterial color="#d9cfb8" transparent opacity={0.85} /></lineSegments>
      <lineSegments geometry={fzB.geo}><lineBasicMaterial color="#3a3631" transparent opacity={0.85} /></lineSegments>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(m) => { bands.current[i] = m; }} geometry={bandGeo} material={whip} castShadow />
      ))}
    </group>
  );
}

function Kick() {
  // Keep drawing while the page scrolls or the pointer moves; frames are on demand otherwise.
  const { invalidate } = useThree();
  useEffect(() => {
    let raf = 0;
    const loop = () => { invalidate(); raf = requestAnimationFrame(loop); };
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); clearTimeout(stop); stop = window.setTimeout(() => cancelAnimationFrame(raf), 1600); };
    let stop = 0;
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('pointermove', on, { passive: true });
    window.addEventListener('pointerdown', on, { passive: true });
    window.addEventListener('keydown', on);
    on();
    return () => { cancelAnimationFrame(raf); clearTimeout(stop); window.removeEventListener('scroll', on); window.removeEventListener('pointermove', on); window.removeEventListener('pointerdown', on); window.removeEventListener('keydown', on); };
  }, [invalidate]);
  return null;
}

export default function Scene({ low }: { low: boolean }) {
  const paper = useMemo(paperMap, []);
  return (
    <Canvas
      frameloop="demand" shadows={{ type: THREE.PCFShadowMap }} dpr={[1, low ? 1.5 : 1.6]}
      camera={{ fov: 22, near: 0.5, far: 400, position: [0, 8, 16] }}
      gl={{ antialias: !low, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1; }}
      aria-hidden
    >
      <color attach="background" args={['#f3ede1']} />
      <Kick />
      <hemisphereLight args={['#fbfaf6', '#cbc6bb', 0.55]} />
      <directionalLight
        position={[-7, 13, 5]} intensity={2.3} color="#fffaf3" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-radius={5} shadow-blurSamples={12}
        shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-camera-near={1} shadow-camera-far={40}
      />
      <directionalLight position={[8, 6, -6]} intensity={0.45} color="#e8eefc" />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#6d685f']} />
        <Lightformer form="rect" intensity={3} color="#fff7ea" position={[-6, 10, 3]} rotation-x={Math.PI / 2} scale={[14, 10, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#fbf6ec" position={[0, 4, 14]} rotation-y={Math.PI} scale={[30, 8, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#eef2fb" position={[12, 5, -4]} rotation-y={-Math.PI / 2} scale={[4, 10, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#e9e4d8" position={[0, -2, 0]} rotation-x={-Math.PI / 2} scale={[60, 60, 1]} />
      </Environment>
      <Sweep map={paper} />
      <Ropes low={low} />
      {!low && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO aoRadius={0.55} intensity={2.2} distanceFalloff={0.6} halfRes quality="medium" color="#2a2116" />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
