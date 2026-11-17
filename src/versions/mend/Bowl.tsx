// The bowl on the stone. One porcelain bowl, a long softbox, a contact shadow.
// Press it and it parts along a crack; it comes back, and the crack is gold.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { clamp, damp, isPhone, lerp, still } from '@/lib/utils';
import { bowl } from './store';
import { buildShards, MAXF, SEEDS, seedsFor, type Shard } from './fracture';

const BG = '#0d0c0b';
const W = (n: number) => n.toFixed(1);

const HEAD = /* glsl */ `
uniform vec3 uSeeds[${MAXF * SEEDS}];
uniform float uCount;
uniform float uGrow;
uniform vec3 uGold;
varying vec3 vMid;
varying float vSide;
vec3 mendWarp(vec3 p, float k) {
  return vec3(
    p.x + 0.075 * sin(p.y * 5.1 + p.z * 3.3 + k * 1.3) + 0.02 * sin(p.y * 23.0 + p.z * 17.0 + k) + 0.007 * sin(p.y * 71.0 + p.z * 53.0 + k * 3.1),
    p.y + 0.075 * sin(p.z * 4.7 + p.x * 5.9 + k * 2.1) + 0.02 * sin(p.z * 21.0 + p.x * 19.0 + k * 1.9) + 0.007 * sin(p.z * 67.0 + p.x * 59.0 + k * 2.3),
    p.z + 0.075 * sin(p.x * 4.3 + p.y * 6.1 + k * 0.7) + 0.02 * sin(p.x * 25.0 + p.y * 15.0 + k * 2.7) + 0.007 * sin(p.x * 73.0 + p.y * 61.0 + k * 1.7));
}
float mendEdge(vec3 p, int k) {
  vec3 q = mendWarp(p, float(k));
  float best = 1e9; int bi = 0;
  for (int s = 0; s < ${SEEDS}; s++) { vec3 d = q - uSeeds[k * ${SEEDS} + s]; float dd = dot(d, d); if (dd < best) { best = dd; bi = s; } }
  vec3 s1 = uSeeds[k * ${SEEDS} + bi];
  float e = 1e9;
  for (int s = 0; s < ${SEEDS}; s++) {
    if (s == bi) continue;
    vec3 s2 = uSeeds[k * ${SEEDS} + s]; vec3 d2 = q - s2;
    e = min(e, (dot(d2, d2) - best) / (2.0 * length(s2 - s1)));
  }
  return e;
}
vec3 mendBump(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
  vec3 vSigmaX = dFdx(surf_pos); vec3 vSigmaY = dFdy(surf_pos);
  vec3 R1 = cross(vSigmaY, surf_norm); vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDir;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
`;

const COLOR = /* glsl */ `
float gold = 0.0; float gh = 0.0;
for (int k = 0; k < ${MAXF}; k++) {
  if (float(k) >= uCount) break;
  float wdt = 0.0078 * (float(k) > uCount - 1.5 ? uGrow : 1.0);
  float e = mendEdge(vMid, k);
  float aa = max(fwidth(e), 1e-5);
  float x = e / max(wdt, 1e-5);
  float cover = wdt < 1e-4 ? 0.0 : 1.0 - smoothstep(wdt - aa, wdt + aa, e);
  gold = max(gold, cover);
  gh = max(gh, sqrt(max(0.0, 1.0 - x * x)) * wdt * 0.55);
}
gold *= 1.0 - vSide; gh *= 1.0 - vSide;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.80, 0.70), vSide * 0.5);
diffuseColor.rgb = mix(diffuseColor.rgb, uGold, gold);
`;

function makeMaterial() {
  const all = new Float32Array(MAXF * SEEDS * 3);
  for (let k = 0; k < MAXF; k++) seedsFor(k).forEach((s, i) => all.set(s, (k * SEEDS + i) * 3));
  const seeds: THREE.Vector3[] = [];
  for (let i = 0; i < MAXF * SEEDS; i++) seeds.push(new THREE.Vector3(all[i * 3], all[i * 3 + 1], all[i * 3 + 2]));
  const u = { uSeeds: { value: seeds }, uCount: { value: still ? 5 : 0 }, uGrow: { value: 1 }, uGold: { value: new THREE.Color('#e2bb63') } };
  const m = new THREE.MeshPhysicalMaterial({ color: '#efe8da', roughness: 0.36, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.25, sheenColor: new THREE.Color('#fff6e6'), sheenRoughness: 0.5 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aMid;\nattribute float aSide;\nvarying vec3 vMid;\nvarying float vSide;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMid = aMid; vSide = aSide;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + HEAD)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + COLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(roughnessFactor, 0.8, vSide), 0.26, gold);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.82, gold);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = mendBump(-vViewPosition, normal, vec2(dFdx(gh), dFdy(gh)), faceDirection);')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\nmaterial.clearcoat *= (1.0 - gold) * (1.0 - vSide);\nmaterial.sheenColor *= (1.0 - gold);');
  };
  m.customProgramCacheKey = () => 'mend-bowl';
  return { m, u };
}

/** Black stone: a dark speckled slab whose edge falls away into the black. */
function useStone() {
  return useMemo(() => {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d')!;
    g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 26000; i++) { const v = 90 + Math.random() * 110; g.fillStyle = `rgb(${v},${v},${v})`; g.globalAlpha = 0.35; g.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    const rough = new THREE.CanvasTexture(c); rough.wrapS = rough.wrapT = THREE.RepeatWrapping; rough.repeat.set(6, 6);
    const a = document.createElement('canvas'); a.width = a.height = 256;
    const ga = a.getContext('2d')!;
    const grd = ga.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, '#fff'); grd.addColorStop(0.35, '#bbb'); grd.addColorStop(0.75, '#222'); grd.addColorStop(1, '#000');
    ga.fillStyle = grd; ga.fillRect(0, 0, 256, 256);
    const alpha = new THREE.CanvasTexture(a);
    return new THREE.MeshStandardMaterial({ color: '#181614', roughness: 0.62, roughnessMap: rough, metalness: 0, alphaMap: alpha, transparent: true, depthWrite: false });
  }, []);
}

// Where the camera stands for each section: azimuth, elevation, distance, and where the bowl sits on screen.
type Pose = { az: number; el: number; d: number; fx: number; fy: number };
const DESK: Pose[] = [
  { az: 0.0, el: 0.2, d: 9.6, fx: 0.71, fy: 0.54 },
  { az: -0.55, el: 0.36, d: 10.4, fx: 0.73, fy: 0.52 },
  { az: 0.5, el: 0.16, d: 9.8, fx: 0.72, fy: 0.54 },
  { az: 0.15, el: 0.62, d: 10.4, fx: 0.72, fy: 0.5 },
  { az: -0.3, el: 0.26, d: 9.4, fx: 0.72, fy: 0.54 },
  { az: 0.0, el: 0.12, d: 9.6, fx: 0.72, fy: 0.5 },
  { az: 0.0, el: 0.3, d: 10.6, fx: 0.72, fy: 0.5 },
];
const PHONE: Pose[] = DESK.map((p) => ({ ...p, d: p.d * 0.8, fx: 0.5, fy: 0.6 }));

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type Piece = { mesh: THREE.Mesh; c: THREE.Vector3; dir: THREE.Vector3; dist: number; axis: THREE.Vector3; ang: number };

function Scene() {
  const { camera, scene, size } = useThree();
  const group = useRef<THREE.Group>(null!);
  const key = useRef<THREE.DirectionalLight>(null!);
  const { m: mat, u } = useMemo(makeMaterial, []);
  const stone = useStone();
  const phone = isPhone();
  const st = useRef({
    cur: 0, pieces: [] as Piece[], phase: 'idle' as 'idle' | 'part' | 'hang' | 'close' | 'settle', t: 0, hold: false, grow: -1,
    pose: { ...(phone ? PHONE : DESK)[0] }, born: performance.now(), opened: still, auto: false, env: 0, closeFrom: 1, rotFrom: 1, pending: -1, held: false, building: false, next: null as Shard[] | null,
  });

  const load = (shards: Shard[]) => {
    const g = group.current; if (!g) return;
    st.current.pieces.forEach((p) => { g.remove(p.mesh); p.mesh.geometry.dispose(); });
    st.current.pieces = shards.map((s) => {
      const mesh = new THREE.Mesh(s.geo, mat);
      mesh.position.copy(s.c);
      mesh.castShadow = false;
      g.add(mesh);
      return { mesh, c: s.c.clone(), dir: new THREE.Vector3(), dist: 0, axis: new THREE.Vector3(1, 0, 0), ang: 0 };
    });
  };

  useEffect(() => {
    load(buildShards(0));
    bowl.ready = true;
    return () => { st.current.pieces.forEach((p) => p.mesh.geometry.dispose()); mat.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const begin = (hold: boolean, hit?: [number, number, number]) => {
    const s = st.current;
    if (still) { u.uCount.value = Math.min(MAXF, u.uCount.value + 1); bowl.mended++; return; }
    if (s.cur < MAXF) { u.uCount.value = s.cur + 1; u.uGrow.value = 0; }
    const h = hit ? new THREE.Vector3(...hit) : null;
    s.pieces.forEach((p, i) => {
      const r = Math.sin(i * 12.9898 + s.cur * 78.233) * 43758.5453, f = r - Math.floor(r);
      const radial = new THREE.Vector3(p.c.x, 0, p.c.z);
      const rl = radial.length();
      if (rl > 1e-3) radial.divideScalar(rl);
      p.dir.copy(radial).multiplyScalar(1).add(new THREE.Vector3(0, 0.28 + f * 0.2, 0)).normalize();
      const lift = clamp((p.c.y - 0.12) / 0.5);
      const near = h ? 1.35 - 0.7 * clamp(p.c.distanceTo(h) / 1.3) : 1;
      p.dist = (0.085 + f * 0.065) * (0.25 + 0.75 * lift) * near;
      p.axis.set(f - 0.5, (f * 7.1) % 1 - 0.5, ((f * 3.7) % 1) - 0.5).normalize();
      p.ang = (0.05 + f * 0.06) * (f > 0.5 ? 1 : -1) * (0.4 + 0.6 * lift);
    });
    s.phase = 'part'; s.t = 0; s.hold = hold;
  };

  const finish = () => {
    const s = st.current;
    bowl.mended++;
    if (s.cur < MAXF) {
      s.grow = 0;
      s.cur++;
      if (s.cur < MAXF) { const k = s.cur; s.building = true; setTimeout(() => { st.current.next = buildShards(k); }, 1250); }
    }
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    const p = group.current.worldToLocal(e.point.clone());
    bowl.asks.push({ hold: false, hit: [p.x, p.y, p.z] });
  };

  useFrame((state, dtRaw) => {
    const dt = Math.min(0.1, dtRaw);
    const s = st.current;
    const poses = isPhone() ? PHONE : DESK;

    // The lights come up.
    const age = (performance.now() - s.born) / 1000;
    const lit = still ? 1 : easeOut(clamp((age - 0.2) / 2.2));
    scene.environmentIntensity = 0.04 + 0.96 * lit;
    if (key.current) key.current.intensity = 1.3 * lit;
    if (!still && !s.auto && age > 2.6 && bowl.ready) { s.auto = true; if (bowl.sec === 0) bowl.asks.push({ hold: false }); }

    // The next set of cracks, cut while the gold set; swapped in while the bowl is whole.
    if (s.next && s.phase === 'idle') { load(s.next); s.next = null; s.building = false; }
    // The drive keeps it apart: once per visit, and it stays open until you scroll on.
    if (!bowl.hold) s.held = false;
    if (!still && bowl.hold && !s.held && s.phase === 'idle' && !s.building && s.pieces.length) { s.held = true; bowl.asks.length = 0; begin(true); }
    // Asked to break.
    if (s.phase === 'idle' && !s.building && bowl.asks.length && s.pieces.length) {
      const a = bowl.asks.shift()!;
      begin(a.hold, a.hit);
    }

    // The break: part, hang, close with weight, settle.
    let m = 0, rot = 0, dip = 0;
    s.t += dt;
    if (s.phase === 'part') {
      const p = clamp(s.t / 0.55); m = easeOut(p); rot = m;
      if (p >= 1) { s.phase = 'hang'; s.t = 0; }
    } else if (s.phase === 'hang') {
      const drift = 1 - Math.exp(-s.t * 0.9);
      m = 1 + 0.14 * drift; rot = 1 + 0.45 * drift;
      const keep = bowl.hold && (s.hold || s.held);
      if (!keep && s.t > 0.9) { s.phase = 'close'; s.t = 0; s.closeFrom = m; s.rotFrom = rot; }
    } else if (s.phase === 'close') {
      const p = clamp(s.t / 0.85), e = inOut(p);
      m = s.closeFrom * (1 - e); rot = s.rotFrom * (1 - e);
      if (p >= 1) { s.phase = 'settle'; s.t = 0; finish(); }
    } else if (s.phase === 'settle') {
      const p = clamp(s.t / 0.55);
      m = 0.035 * Math.sin(p * Math.PI) * (1 - p); rot = 0; dip = -0.006 * Math.sin(p * Math.PI) * (1 - p);
      if (p >= 1) {
        s.phase = 'idle';
      }
    }
    if (s.grow >= 0) { s.grow = Math.min(1, s.grow + dt / 1.1); u.uGrow.value = easeOut(s.grow); if (s.grow >= 1) s.grow = -1; }
    const q = new THREE.Quaternion();
    for (const p of s.pieces) {
      p.mesh.position.copy(p.c).addScaledVector(p.dir, p.dist * m);
      p.mesh.quaternion.copy(q.setFromAxisAngle(p.axis, p.ang * rot));
    }

    // Turning by hand, with weight; at Join it comes round to face you.
    if (!bowl.dragging) {
      bowl.yaw += bowl.yawV * dt;
      bowl.yawV = damp(bowl.yawV, 0, 2.2, dt);
      if (bowl.f > 4.6 && !still) { const tgt = Math.round(bowl.yaw / (Math.PI * 2)) * Math.PI * 2; bowl.yaw = damp(bowl.yaw, tgt, 1.4, dt); }
    }
    group.current.rotation.y = bowl.yaw;
    group.current.position.y = dip;

    // The camera, drifting slowly between sections.
    const f = clamp(bowl.f, 0, poses.length - 1), i = Math.floor(f), fr = f - i;
    const A = poses[i], B = poses[Math.min(poses.length - 1, i + 1)];
    const tgt: Pose = { az: lerp(A.az, B.az, fr), el: lerp(A.el, B.el, fr), d: lerp(A.d, B.d, fr), fx: lerp(A.fx, B.fx, fr), fy: lerp(A.fy, B.fy, fr) };
    const P = s.pose;
    const k = still ? 100 : 1.6;
    (Object.keys(P) as (keyof Pose)[]).forEach((n) => { P[n] = damp(P[n], still ? poses[0][n] : tgt[n], k, dt); });
    if (still) { P.fx = tgt.fx; P.fy = tgt.fy; }
    const look = new THREE.Vector3(0, 0.55, 0);
    camera.position.set(look.x + P.d * Math.sin(P.az) * Math.cos(P.el), look.y + P.d * Math.sin(P.el), look.z + P.d * Math.cos(P.az) * Math.cos(P.el));
    camera.lookAt(look);
    const cam = camera as THREE.PerspectiveCamera;
    cam.setViewOffset(size.width, size.height, (0.5 - P.fx) * size.width, (0.5 - P.fy) * size.height, size.width, size.height);
    cam.updateProjectionMatrix();

    // At the end the light makes one slow pass along the gold.
    const sweep = !still && bowl.f > 5.5 ? 1.25 : 0;
    s.env = damp(s.env, sweep, 0.55, dt);
    scene.environmentRotation.set(0, s.env, 0);
    scene.backgroundRotation.set(0, 0, 0);
    void W;
  });

  return (
    <>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.05} />
      <directionalLight ref={key} position={[-3.5, 5, 3]} intensity={1.3} color="#fff4e2" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={5} color="#fff7ea" position={[-3.4, 1.3, 2.6]} rotation-y={Math.atan2(3.4, -2.6)} scale={[0.9, 7, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#fff3e2" position={[0, 6, 0.5]} rotation-x={Math.PI / 2} scale={[5, 4, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#f4f0ff" position={[3.8, 1.6, -2.6]} rotation-y={Math.atan2(-3.8, 2.6)} scale={[0.6, 6, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#efe6d6" position={[1.5, 0.6, 5]} rotation-y={Math.PI} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#ffe9c4" position={[0, 3.2, 3.6]} rotation-x={-Math.PI / 5} scale={[7, 2.4, 1]} />
      </Environment>
      <group ref={group} onClick={onClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.003} material={stone} renderOrder={-1}>
        <circleGeometry args={[6.5, 64]} />
      </mesh>
      <ContactShadows position={[0, 0.0005, 0]} scale={4.2} blur={2.6} far={1.3} opacity={0.92} resolution={phone ? 256 : 512} color="#000000" />
    </>
  );
}

export default function Bowl() {
  return (
    <Canvas
      dpr={[1, isPhone() ? 1.5 : 1.6]}
      camera={{ fov: 19, near: 0.1, far: 60, position: [0, 2, 8.4] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
    >
      <Scene />
    </Canvas>
  );
}
