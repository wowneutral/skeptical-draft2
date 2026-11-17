// The replica: one marble figure on a black plinth, rebuilt block by block in black bronze.
// One shader does the change. The statue's bounding box is cut into a mason's grid of
// about two hundred blocks; a small float texture holds each block's state, and every
// fragment is drawn as veined marble or polished bronze, with a bright seam where they meet.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import { Bvh, ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { clamp, lerp, smooth, still } from '@/lib/utils';
import { rig } from './store';

const URL_PLY = `${import.meta.env.BASE_URL}models/lucy.ply`;
const H = 2.4; // statue height in scene units; the plinth top is y = 0
const PLINTH = { w: 1.25, d: 1.05, h: 0.95 };

type Grid = {
  geo: THREE.BufferGeometry;
  min: THREE.Vector3; cell: number; dims: THREE.Vector3; n: number;
  occ: number[];          // occupied cell indices
  order: number[];        // occupied cells in replacement order (base upward, wings last)
  wings: number;          // how many of the last in order are wing blocks
  drive: number;          // the block the camera visits at the drive
  centre: (i: number) => THREE.Vector3;
};

/** Bake the scan into scene units and cut its box into blocks. */
function buildGrid(src: THREE.BufferGeometry): Grid {
  const geo = src.clone();
  geo.rotateY(Math.PI); // face +z, toward the camera
  geo.computeBoundingBox();
  const b0 = geo.boundingBox!;
  const k = H / (b0.max.y - b0.min.y);
  geo.scale(k, k, k);
  geo.computeBoundingBox();
  const b = geo.boundingBox!, c = b.getCenter(new THREE.Vector3());
  geo.translate(-c.x, -b.min.y, -c.z);
  geo.computeBoundingBox();
  geo.computeVertexNormals();
  const box = geo.boundingBox!;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const pad = 0.002;
  const min = box.min.clone().subScalar(pad);
  const size = box.getSize(new THREE.Vector3()).addScalar(pad * 2);

  // Find the cell size that gives about two hundred occupied blocks.
  let cell = 0.12, dims = new THREE.Vector3(), occ: number[] = [];
  for (let s = 0.11; s < 0.4; s += 0.004) {
    const d = new THREE.Vector3(Math.ceil(size.x / s), Math.ceil(size.y / s), Math.ceil(size.z / s));
    const seen = new Uint8Array(d.x * d.y * d.z);
    for (let i = 0; i < pos.count; i += 2) {
      const x = Math.min(d.x - 1, Math.floor((pos.getX(i) - min.x) / s));
      const y = Math.min(d.y - 1, Math.floor((pos.getY(i) - min.y) / s));
      const z = Math.min(d.z - 1, Math.floor((pos.getZ(i) - min.z) / s));
      seen[x + y * d.x + z * d.x * d.y] = 1;
    }
    const list: number[] = [];
    seen.forEach((v, i) => v && list.push(i));
    cell = s; dims = d; occ = list;
    if (list.length <= 210) break;
  }
  const n = dims.x * dims.y * dims.z;
  const centre = (i: number) => {
    const x = i % dims.x, y = Math.floor(i / dims.x) % dims.y, z = Math.floor(i / (dims.x * dims.y));
    return new THREE.Vector3(min.x + (x + 0.5) * cell, min.y + (y + 0.5) * cell, min.z + (z + 0.5) * cell);
  };
  const hash = (i: number) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const isWing = (p: THREE.Vector3) => p.y > H * 0.52 && (Math.abs(p.x) > 0.3 || p.z < -0.14);
  const key = (i: number) => {
    const p = centre(i);
    return (isWing(p) ? 100 : 0) + p.y / H + hash(i) * 0.09;
  };
  const order = [...occ].sort((a, b2) => key(a) - key(b2));
  const wings = occ.filter((i) => isWing(centre(i))).length;
  // The drive block: on the front of the chest.
  let drive = order[Math.floor(order.length / 2)], best = -1e9;
  for (const i of occ) {
    const p = centre(i);
    if (isWing(p)) continue;
    const s = p.z - Math.abs(p.y - H * 0.63) * 1.6 - Math.abs(p.x) * 1.2;
    if (s > best) { best = s; drive = i; }
  }
  return { geo, min, cell, dims, n, occ, order, wings, drive, centre };
}

const GLSL_COMMON = /* glsl */ `
uniform sampler2D uState; uniform vec3 uMin; uniform float uCell; uniform vec3 uDims; uniform float uHover;
uniform float uLift; uniform float uSeam; uniform float uLight;
varying vec3 vObj;
float cellIdx(ivec3 c) { return float(c.x) + float(c.y) * uDims.x + float(c.z) * uDims.x * uDims.y; }
vec4 stateAt(ivec3 c) { return texelFetch(uState, ivec2(int(cellIdx(c)), 0), 0); }
`;

const GLSL_NOISE = /* glsl */ `
float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }
`;

function makeMaterial(g: Grid, tex: THREE.DataTexture) {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, metalness: 0, envMapIntensity: 1 });
  const uniforms = {
    uState: { value: tex }, uMin: { value: g.min }, uCell: { value: g.cell }, uDims: { value: g.dims },
    uHover: { value: -1 }, uLift: { value: 0.02 }, uSeam: { value: 0.004 }, uLight: { value: 0 },
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = GLSL_COMMON + sh.vertexShader.replace('#include <begin_vertex>', /* glsl */ `
      #include <begin_vertex>
      vObj = position;
      {
        vec3 lpv = (position - uMin) / uCell;
        ivec3 cv = ivec3(clamp(floor(lpv), vec3(0.0), uDims - 1.0));
        vec4 Sv = stateAt(cv);
        transformed += objectNormal * Sv.g * uLift;
      }`);
    sh.fragmentShader = GLSL_COMMON + GLSL_NOISE + sh.fragmentShader
      .replace('#include <color_fragment>', /* glsl */ `
      #include <color_fragment>
      vec3 lp = (vObj - uMin) / uCell;
      ivec3 cc = ivec3(clamp(floor(lp), vec3(0.0), uDims - 1.0));
      vec3 l = lp - vec3(cc);
      vec4 S = stateAt(cc);
      vec3 fw = max(fwidth(l), vec3(1e-4));
      float bz = clamp((S.r - l.y) / fw.y + 0.5, 0.0, 1.0);
      float bzHard = step(l.y, S.r - 1e-4);

      // Marble: bone white, a soft cloud and fine grey veins.
      float cloud = fbm(vObj * 3.1);
      float t = vObj.x * 1.4 + vObj.y * 2.2 + vObj.z * 0.9 + fbm(vObj * 2.4 + 4.0) * 3.4;
      float vein = pow(1.0 - abs(sin(t * 3.14159)), 22.0) * 0.8 + pow(1.0 - abs(sin(t * 7.3 + cloud * 4.0)), 40.0) * 0.35;
      vec3 bone = vec3(0.80, 0.765, 0.69);
      vec3 marble = mix(bone, bone * vec3(0.86, 0.86, 0.85), smoothstep(0.35, 0.75, cloud));
      marble = mix(marble, vec3(0.30, 0.30, 0.29), clamp(vein, 0.0, 1.0));
      // Black bronze: a warm dark metal with a mottled patina.
      float pat = fbm(vObj * 7.0 + 11.0);
      vec3 bronze = mix(vec3(0.36, 0.235, 0.13), vec3(0.15, 0.105, 0.07), smoothstep(0.35, 0.8, pat));

      // The mason's grid: where the surface crosses a block face.
      float grout = 0.0, seam = 0.0;
      float w = uSeam / uCell;
      for (int a = 0; a < 3; a++) {
        float d0 = l[a], d1 = 1.0 - l[a];
        float d = min(d0, d1);
        float line = 1.0 - smoothstep(0.5, 1.0, max(d / fw[a] / 1.3, d / w));
        if (line <= 0.0) continue;
        ivec3 nc = cc; nc[a] += (d0 < d1) ? -1 : 1;
        float nb = bzHard;
        if (all(greaterThanEqual(nc, ivec3(0))) && all(lessThan(nc, ivec3(uDims)))) {
          vec4 N = stateAt(nc);
          float ly = (a == 1) ? ((d0 < d1) ? 0.999 : 0.001) : l.y;
          nb = step(ly, N.r - 1e-4);
        }
        grout = max(grout, line);
        seam = max(seam, line * abs(nb - bzHard));
      }
      // The wipe front inside a block that is being replaced.
      if (S.r > 0.001 && S.r < 0.999) seam = max(seam, 1.0 - smoothstep(0.7, 2.0, abs(l.y - S.r) / fw.y));
      float hov = 0.0;
      if (abs(cellIdx(cc) - uHover) < 0.5) {
        float m = min(min(min(l.x, 1.0 - l.x), min(l.y, 1.0 - l.y)), min(l.z, 1.0 - l.z));
        float fm = max(max(fw.x, fw.y), fw.z);
        hov = (1.0 - smoothstep(1.2, 2.4, m / fm)) + 0.07;
      }
      diffuseColor.rgb = mix(marble, bronze, bz);
      diffuseColor.rgb *= 1.0 - grout * mix(0.3, 0.6, bz);
      float rMarble = 0.58 - vein * 0.12, rBronze = 0.26 + pat * 0.12;
      `)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(rMarble, rBronze, bz);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = mix(0.0, 1.0, bz);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.78, 0.48) * seam * 1.25 * uLight;
        totalEmissiveRadiance += vec3(0.93, 0.91, 0.86) * hov * 0.9;`);
  };
  mat.customProgramCacheKey = () => 'replica-v1';
  return { mat, uniforms };
}

type Cell = { prog: number; settle: number; vel: number; on: boolean };

function Statue({ onReady }: { onReady: () => void }) {
  const src = useLoader(PLYLoader, URL_PLY);
  const grid = useMemo(() => buildGrid(src), [src]);
  const data = useMemo(() => new Float32Array(grid.n * 4), [grid]);
  const tex = useMemo(() => {
    const t = new THREE.DataTexture(data, grid.n, 1, THREE.RGBAFormat, THREE.FloatType);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
    return t;
  }, [data, grid]);
  const { mat, uniforms } = useMemo(() => makeMaterial(grid, tex), [grid, tex]);
  const cells = useMemo(() => new Map<number, Cell>(grid.occ.map((i) => [i, { prog: 0, settle: 0, vel: 0, on: false }])), [grid]);
  const rank = useMemo(() => new Map(grid.order.map((i, r) => [i, r])), [grid]);
  const mesh = useRef<THREE.Mesh>(null);
  const count = useRef(0);
  const { gl } = useThree();

  useEffect(() => { onReady(); }, [onReady]);
  useEffect(() => {
    sceneInfo.drive = grid.centre(grid.drive);
    sceneInfo.ready = true;
  }, [grid]);

  const targets = useMemo(() => {
    const T = grid.order.length, body = T - grid.wings;
    return [0, Math.round(body * 0.14), Math.round(body * 0.5), Math.round(body * 0.66), body, T];
  }, [grid]);

  const isOn = (i: number) => rig.manual.has(i) || (rank.get(i) ?? 1e9) < count.current;

  const replace = (i: number) => {
    const c = cells.get(i); if (!c) return;
    if (isOn(i) || i === grid.drive && rig.at > 2.5 && rig.at < 3.5) {
      // Already bronze: it only knocks and reseats.
      if (!still) { c.settle = 0.35; c.vel = 0; }
      return;
    }
    rig.manual.add(i);
  };
  rig.next = () => {
    // The next marble block you can see: lowest first, on the side facing the room.
    const i = grid.order.find((j) => !isOn(j) && j !== grid.drive && grid.centre(j).z > 0.02) ?? grid.order.find((j) => !isOn(j));
    if (i !== undefined) replace(i);
  };

  const cellAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    if (!mesh.current) return -1;
    const p = mesh.current.worldToLocal(e.point.clone());
    const x = Math.floor((p.x - grid.min.x) / grid.cell), y = Math.floor((p.y - grid.min.y) / grid.cell), z = Math.floor((p.z - grid.min.z) / grid.cell);
    if (x < 0 || y < 0 || z < 0 || x >= grid.dims.x || y >= grid.dims.y || z >= grid.dims.z) return -1;
    const i = x + y * grid.dims.x + z * grid.dims.x * grid.dims.y;
    return cells.has(i) ? i : -1;
  };

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const at = still ? Math.round(rig.at) : rig.at;
    const f = Math.floor(clamp(at, 0, 5)), u = at - f;
    count.current = Math.round(lerp(targets[f], targets[Math.min(5, f + 1)], u));
    const inDrive = rig.at > 2.5 && rig.at < 3.6;
    for (const [i, c] of cells) {
      let target = isOn(i) ? 1 : 0;
      if (i === grid.drive && !rig.manual.has(i)) target = rig.at < 2.5 ? 0 : 1;
      if (rig.original) target = 0;
      if (i === grid.drive && inDrive && !rig.manual.has(i) && !rig.original) {
        c.prog = still ? 0.55 : clamp(rig.driveU * 1.15 - 0.05);
        c.on = true;
      } else if (still) {
        c.prog = target;
      } else if (target === 1) {
        if (!c.on) { c.on = true; c.settle = 1; c.vel = 0; }
        c.prog = Math.min(1, c.prog + dt / 0.6);
      } else {
        c.on = false;
        c.prog = Math.max(0, c.prog - dt / 0.35);
      }
      if (!still) {
        // An underdamped spring: the block slides in, overshoots a hair, and seats.
        const acc = -170 * c.settle - 11 * c.vel;
        c.vel += acc * dt; c.settle += c.vel * dt;
      } else c.settle = 0;
      data[i * 4] = c.prog; data[i * 4 + 1] = c.settle;
    }
    tex.needsUpdate = true;
    uniforms.uLight.value = rig.light;
  });

  return (
    <Bvh firstHitOnly>
      <mesh
        ref={mesh}
        geometry={grid.geo}
        material={mat}
        castShadow
        receiveShadow
        onPointerMove={(e) => { e.stopPropagation(); const i = cellAt(e); uniforms.uHover.value = i; gl.domElement.style.cursor = i >= 0 ? 'pointer' : ''; }}
        onPointerOut={() => { uniforms.uHover.value = -1; gl.domElement.style.cursor = ''; }}
        onClick={(e) => { e.stopPropagation(); if (e.delta > 8) return; const i = cellAt(e); if (i >= 0) { uniforms.uHover.value = i; replace(i); } }}
      />
    </Bvh>
  );
}

export const sceneInfo = { drive: new THREE.Vector3(0, 1.5, 0.3), ready: false };

/** Views: azimuth (0 is front), elevation, distance, target height, plus how far right of centre. */
const VIEWS = [
  { az: 0.62, el: 0.1, d: 8.5, ty: 1.12 },
  { az: 0.4, el: 0.02, d: 7.4, ty: 0.55 },
  { az: -0.28, el: 0.12, d: 9.2, ty: 1.12 },
  { az: 0.32, el: 0.08, d: 1.05, ty: -1 }, // the drive: close on one block
  { az: -0.95, el: 0.2, d: 9.4, ty: 1.3 },
  { az: 0.62, el: 0.1, d: 8.5, ty: 1.12 },
];

function Rig() {
  const { camera } = useThree();
  const cur = useRef({ az: VIEWS[0].az, el: VIEWS[0].el, d: VIEWS[0].d, tx: 0, ty: VIEWS[0].ty, tz: 0 });
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const at = still ? Math.round(rig.at) : rig.at;
    const f = Math.floor(clamp(at, 0, 5)), u = smooth(at - f);
    const a = VIEWS[f], b = VIEWS[Math.min(5, f + 1)];
    const tgt = (v: typeof a) => (v.ty < 0 ? sceneInfo.drive : new THREE.Vector3(0, v.ty, 0));
    const ta = tgt(a), tb = tgt(b);
    const phoneK = rig.phone ? 0.94 : 1;
    const goal = {
      az: lerp(a.az, b.az, u) + (still ? 0 : rig.px * 0.06),
      el: lerp(a.el, b.el, u) + (still ? 0 : -rig.py * 0.03),
      d: lerp(a.d, b.d, u) * phoneK,
      tx: lerp(ta.x, tb.x, u), ty: lerp(ta.y, tb.y, u), tz: lerp(ta.z, tb.z, u),
    };
    const c = cur.current;
    const k = still ? 1 : 1 - Math.exp(-4.5 * dt);
    (Object.keys(goal) as (keyof typeof goal)[]).forEach((key) => { c[key] = lerp(c[key], goal[key], k); });
    look.set(c.tx, c.ty, c.tz);
    camera.position.set(c.tx + Math.sin(c.az) * Math.cos(c.el) * c.d, c.ty + Math.sin(c.el) * c.d, c.tz + Math.cos(c.az) * Math.cos(c.el) * c.d);
    camera.lookAt(look);
  });
  return null;
}

function Lights() {
  const key = useRef<THREE.SpotLight>(null), rim = useRef<THREE.SpotLight>(null);
  const { scene } = useThree();
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, 1.1, 0); return o; }, []);
  useFrame(() => {
    if (key.current) key.current.intensity = 260 * rig.light;
    if (rim.current) rim.current.intensity = 160 * rig.light;
    scene.environmentIntensity = 0.05 + 0.75 * rig.light;
  });
  return (
    <>
      <primitive object={target} />
      <spotLight ref={key} position={[-3.2, 6.4, 3.4]} target={target} angle={0.42} penumbra={0.9} decay={2} distance={16} color="#fff3e2"
        castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
      <spotLight ref={rim} position={[3.6, 3.8, -4.2]} target={target} angle={0.38} penumbra={1} decay={2} distance={14} color="#d9e2ff" />
      <ambientLight intensity={0.05} />
    </>
  );
}

export default function Scene({ onReady }: { onReady: () => void }) {
  const phone = rig.phone;
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, phone ? 1.4 : 1.6]}
      camera={{ fov: 22, near: 0.1, far: 60, position: [5, 1.6, 8] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
    >
      <color attach="background" args={['#0c0c0c']} />
      <fog attach="fog" args={['#0c0c0c', 12, 24]} />
      <Statue onReady={onReady} />
      {/* The plinth: darker than the room, eased edges. */}
      <RoundedBox args={[PLINTH.w, PLINTH.h, PLINTH.d]} radius={0.012} smoothness={3} position={[0, -PLINTH.h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#141312" roughness={0.78} metalness={0} />
      </RoundedBox>
      <ContactShadows position={[0, 0.002, 0]} scale={[PLINTH.w, PLINTH.d]} opacity={0.75} blur={1.6} far={0.5} frames={1} resolution={256} color="#000000" />
      <mesh rotation-x={-Math.PI / 2} position-y={-PLINTH.h} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#121110" roughness={0.85} />
      </mesh>
      <Lights />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#050505']} />
        <Lightformer form="rect" intensity={5} position={[-3, 5, 3]} scale={[5, 4, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={1.2} position={[5, 1.5, 3]} scale={[2, 5, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={1.6} position={[4, 2, -4]} scale={[1.2, 6, 1]} target={[0, 1, 0]} color="#dfe6ff" />
        <Lightformer form="rect" intensity={0.6} position={[0, 1, 6]} scale={[8, 2, 1]} target={[0, 1, 0]} />
      </Environment>
      <Rig />
      <EffectComposer multisampling={phone ? 0 : 4}>
        <N8AO halfRes aoRadius={0.35} intensity={2.2} distanceFalloff={0.6} quality={phone ? 'performance' : 'medium'} />
        <Vignette offset={0.25} darkness={0.7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
