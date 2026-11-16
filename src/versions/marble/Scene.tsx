// The room: one question mark cut from white marble, on a plinth, under a high window.
// The camera walks around it as the page scrolls; daylight crosses the floor as you go.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import MARKS from '@/lib/marks.json';
import { clamp, damp, lerp, smooth, still } from '@/lib/utils';
import { rig, VIEWS_PHONE, VIEWS_WIDE, type View } from './rig';

const WALL = '#cbc7c0';
const PLINTH_H = 2.3;
const MARK_H = 2.5;

/* ---------- the marble ---------- */

const NOISE = /* glsl */ `
vec3 mmod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mmod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mperm(vec4 x){return mmod289(((x*34.0)+1.0)*x);}
vec4 mtis(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float msnoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mmod289(i);
  vec4 p=mperm(mperm(mperm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=mtis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float mfbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*msnoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return s; }
float mvein(vec3 p){
  float n = mfbm(p*0.8);
  float a = p.x*0.62 + p.y*1.05 + p.z*0.4 + n*2.9;
  float sa = 1.0-abs(sin(a*2.3));
  float v1 = pow(sa, 6.0)*0.32 + pow(sa, 30.0)*0.45;
  float b = -p.x*0.8 + p.y*0.45 + p.z*0.9 + mfbm(p*1.9+vec3(4.0))*2.2;
  float v2 = pow(1.0-abs(sin(b*3.7)), 40.0)*0.28;
  float hair = 0.0;
  return clamp(v1+v2+hair, 0.0, 1.0);
}
`;

function marbleMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0.2, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.14,
    sheen: 0.5, sheenRoughness: 0.55, sheenColor: new THREE.Color('#fff4e6'), specularIntensity: 0.6,
  });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMp = position;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMp;\n' + NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 mp = vMp*2.1 + vec3(3.0, 1.0, 0.0);
        float mv = mvein(mp);
        float cloud = mfbm(mp*0.7)*0.5+0.5;
        vec3 baseC = mix(vec3(0.885,0.870,0.835), vec3(0.78,0.775,0.76), cloud*0.55);
        diffuseColor.rgb = mix(baseC, vec3(0.36,0.36,0.37), mv*0.8);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + mv*0.16 + cloud*0.05, 0.0, 1.0);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vec3(1.0,0.94,0.87) * 0.05;');
  };
  m.customProgramCacheKey = () => 'marble-v38';
  return m;
}

/** The Bodoni question mark, cut 0.55 deep with a soft arris, standing on its dot. */
function markGeometry() {
  const M = MARKS.roman;
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${M.d}"/></svg>`);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const k = MARK_H / M.h;
  const g = new THREE.ExtrudeGeometry(shapes, { depth: 0.5 / k, bevelEnabled: true, bevelThickness: 0.05 / k, bevelSize: 0.035 / k, bevelSegments: 6, curveSegments: 30 });
  g.scale(k, -k, k);
  // The flip turned the faces inside out; turn them back.
  const pos = g.attributes.position as THREE.BufferAttribute;
  const swap = (attr: THREE.BufferAttribute) => {
    const a = attr.array as Float32Array, n = attr.itemSize;
    for (let i = 0; i < attr.count; i += 3) for (let c = 0; c < n; c++) { const t = a[(i + 1) * n + c]; a[(i + 1) * n + c] = a[(i + 2) * n + c]; a[(i + 2) * n + c] = t; }
  };
  swap(pos); if (g.attributes.normal) swap(g.attributes.normal as THREE.BufferAttribute); if (g.attributes.uv) swap(g.attributes.uv as THREE.BufferAttribute);
  g.computeBoundingBox();
  const b = g.boundingBox!;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  g.computeVertexNormals();
  return g;
}

/* ---------- textures drawn here ---------- */

function canvasTex(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, srgb = true) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d')!; draw(c, size);
  const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** Polished concrete: soft clouds and a fine speckle. */
function floorTex() {
  const t = canvasTex(512, (c, s) => {
    c.fillStyle = '#c4beb4'; c.fillRect(0, 0, s, s);
    let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 90; i++) { const g = c.createRadialGradient(r() * s, r() * s, 0, r() * s, r() * s, 40 + r() * 120); const d = r() < 0.5; g.addColorStop(0, d ? 'rgba(120,112,100,0.09)' : 'rgba(235,230,222,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, s, s); }
    for (let i = 0; i < 9000; i++) { c.fillStyle = r() < 0.5 ? 'rgba(90,84,76,0.16)' : 'rgba(250,248,242,0.14)'; c.fillRect(r() * s, r() * s, 1, 1); }
    c.strokeStyle = 'rgba(80,74,66,0.18)'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, s - 1, s - 1);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5);
  return t;
}

/** What the window throws on the floor: six panes and their bars. */
function cookieTex() {
  return canvasTex(256, (c, s) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, s, s);
    c.filter = 'blur(2.5px)';
    c.fillStyle = '#fff';
    const m = 34, bar = 9, cols = 3, rows = 2;
    const pw = (s - 2 * m - (cols - 1) * bar) / cols, ph = (s - 2 * m - (rows - 1) * bar) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) c.fillRect(m + i * (pw + bar), m + j * (ph + bar), pw, ph);
  }, false);
}

/** The window as seen from inside: bright panes, pale bars. */
function windowTex() {
  return canvasTex(256, (c, s) => {
    c.fillStyle = '#d9d5ce'; c.fillRect(0, 0, s, s);
    c.fillStyle = '#ffffff';
    const m = 10, bar = 8, cols = 3, rows = 2;
    const pw = (s - 2 * m - (cols - 1) * bar) / cols, ph = (s - 2 * m - (rows - 1) * bar) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) c.fillRect(m + i * (pw + bar), m + j * (ph + bar), pw, ph);
  });
}

/* ---------- the room ---------- */

const WIN = new THREE.Vector3(-10.98, 9.6, -1.6);

function Daylight() {
  const light = useRef<THREE.SpotLight>(null!);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const cookie = useMemo(cookieTex, []);
  const cool = useMemo(() => new THREE.Color('#fff9f0'), []), warm = useMemo(() => new THREE.Color('#ffc890'), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => () => cookie.dispose(), [cookie]);
  useFrame(() => {
    const L = light.current; if (!L) return;
    // The sun moves across the afternoon as the visit goes on.
    const t = clamp(rig.at / 6);
    const yaw = lerp(-0.22, 0.38, t), pitch = lerp(0.8, 0.5, smooth(t));
    dir.set(Math.cos(pitch) * Math.cos(yaw), -Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw)).normalize();
    L.position.copy(WIN).addScaledVector(dir, -7);
    target.position.copy(WIN).addScaledVector(dir, 14);
    target.updateMatrixWorld();
    L.color.copy(cool).lerp(warm, smooth(clamp((t - 0.55) / 0.45)));
    L.intensity = 3200 * rig.light;
    const end = smooth(clamp((rig.at - 5) / 1));
    if (hemi.current) hemi.current.intensity = (0.34 - 0.12 * end) * (0.35 + 0.65 * rig.light);
  });
  return (
    <>
      <primitive object={target} />
      <hemisphereLight ref={hemi} args={['#f3f1ec', '#a39c90', 0.34]} />
      <spotLight
        ref={light} target={target} map={cookie} castShadow angle={0.36} penumbra={0.25} decay={2} distance={0}
        shadow-mapSize={[rig.phone ? 1024 : 2048, rig.phone ? 1024 : 2048]} shadow-bias={-0.00015} shadow-normalBias={0.03} shadow-camera-near={3} shadow-camera-far={40} shadow-radius={4}
      />
    </>
  );
}

function Room() {
  const floor = useMemo(floorTex, []);
  const win = useMemo(windowTex, []);
  useEffect(() => () => { floor.dispose(); win.dispose(); }, [floor, win]);
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ color: WALL, roughness: 0.92 }), []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial map={floor} roughness={0.42} metalness={0} color="#ffffff" envMapIntensity={0.6} />
      </mesh>
      {/* Walls. The window wall lets the light through; the others take its shadow. */}
      <mesh position={[0, 6, -11]} receiveShadow material={wall}><planeGeometry args={[24, 12]} /></mesh>
      <mesh position={[0, 6, 11]} rotation-y={Math.PI} receiveShadow material={wall}><planeGeometry args={[24, 12]} /></mesh>
      <mesh position={[11, 6, 0]} rotation-y={-Math.PI / 2} receiveShadow material={wall}><planeGeometry args={[24, 12]} /></mesh>
      <mesh position={[-11, 6, 0]} rotation-y={Math.PI / 2} material={wall}><planeGeometry args={[24, 12]} /></mesh>
      <mesh position={[0, 12, 0]} rotation-x={Math.PI / 2}><planeGeometry args={[24, 24]} /><meshStandardMaterial color="#d8d4cd" roughness={1} /></mesh>
      {/* A shadow gap where the walls meet the floor. */}
      {[[0, 0.04, -10.97, 0], [0, 0.04, 10.97, Math.PI], [10.97, 0.04, 0, -Math.PI / 2], [-10.97, 0.04, 0, Math.PI / 2]].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation-y={r}><planeGeometry args={[24, 0.08]} /><meshBasicMaterial color="#6f6a62" /></mesh>
      ))}
      {/* The high window. */}
      <mesh position={WIN} rotation-y={Math.PI / 2}>
        <planeGeometry args={[3.6, 2.5]} />
        <meshBasicMaterial map={win} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Plinth() {
  return (
    <group>
      <RoundedBox args={[1.9, PLINTH_H, 1.9]} radius={0.025} smoothness={3} position={[0, PLINTH_H / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#efece6" roughness={0.88} />
      </RoundedBox>
      {/* A recessed toe, so the block floats a hair off the floor. */}
      <mesh position={[0, 0.03, 0]}><boxGeometry args={[1.8, 0.06, 1.8]} /><meshStandardMaterial color="#5d5850" roughness={1} /></mesh>
    </group>
  );
}

/** One bench, for the end of the visit. */
function Bench() {
  return (
    <group position={[0.4, 0, 5.4]}>
      <RoundedBox args={[3.4, 0.16, 0.9]} radius={0.03} smoothness={3} position={[0, 0.98, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#3b2d22" roughness={0.42} clearcoat={0.3} clearcoatRoughness={0.4} />
      </RoundedBox>
      {[-1.35, 1.35].map((x) => (
        <RoundedBox key={x} args={[0.14, 0.9, 0.78]} radius={0.02} smoothness={2} position={[x, 0.45, 0]} castShadow>
          <meshStandardMaterial color="#1d1a17" roughness={0.6} metalness={0.4} />
        </RoundedBox>
      ))}
    </group>
  );
}

function Sculpture() {
  const g = useMemo(markGeometry, []);
  const m = useMemo(marbleMaterial, []);
  const turn = useRef<THREE.Group>(null!);
  useEffect(() => () => { g.dispose(); m.dispose(); }, [g, m]);
  useFrame((st, dt) => {
    dt = Math.min(dt, 0.05);
    // Inertia while it spins; after a moment alone it comes back to face the room.
    if (!rig.held) {
      rig.turn += rig.spin * dt;
      rig.spin *= Math.exp(-2.2 * dt);
      if (performance.now() - rig.lastTouch > 2600 && Math.abs(rig.spin) < 0.6) {
        const home = Math.round(rig.turn / (Math.PI * 2)) * Math.PI * 2;
        rig.turn = still ? home : damp(rig.turn, home, 1.6, dt);
      }
    }
    turn.current.rotation.y = rig.turn;
    if (Math.abs(rig.spin) > 0.002 || Math.abs(rig.turn - Math.round(rig.turn / (Math.PI * 2)) * Math.PI * 2) > 0.0005 || rig.held) st.invalidate();
  });
  return (
    <group position={[0, PLINTH_H, 0]}>
      <group ref={turn} rotation-y={0}>
        <mesh geometry={g} material={m} castShadow receiveShadow position={[0.02, 0.002, 0]} />
      </group>
    </group>
  );
}

/* ---------- the walk ---------- */

function viewAt(views: View[], at: number, out: View) {
  const i = Math.max(0, Math.min(views.length - 2, Math.floor(at)));
  const u = clamp(at - i);
  const a = views[i], b = views[i + 1];
  (Object.keys(a) as (keyof View)[]).forEach((k) => { out[k] = lerp(a[k], b[k], u); });
  return out;
}

function Walk() {
  const { camera, size, invalidate } = useThree();
  const cur = useRef<View | null>(null);
  const want = useMemo<View>(() => ({ az: 0, r: 0, h: 0, ty: 0, fov: 30, sx: 0, sy: 0 }), []);
  const lean = useRef({ x: 0, y: 0 });
  useEffect(() => { rig.wake = invalidate; return () => { rig.wake = () => {}; }; }, [invalidate]);
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    const views = rig.phone ? VIEWS_PHONE : VIEWS_WIDE;
    viewAt(views, rig.at, want);
    if (!cur.current) cur.current = { ...want };
    const c = cur.current;
    let moving = false;
    (Object.keys(want) as (keyof View)[]).forEach((k) => {
      const nv = still ? want[k] : damp(c[k], want[k], 3.2, dt);
      if (Math.abs(nv - want[k]) > 0.0004) moving = true;
      c[k] = nv;
    });
    const L = lean.current;
    const lx = still || rig.phone ? 0 : rig.px, ly = still || rig.phone ? 0 : rig.py;
    L.x = damp(L.x, lx, 2.4, dt); L.y = damp(L.y, ly, 2.4, dt);
    if (Math.abs(L.x - lx) > 0.001 || Math.abs(L.y - ly) > 0.001) moving = true;
    // The opening: you step in from further back as the lights come up.
    const back = (1 - rig.light) * 2.4;
    const az = c.az + L.x * 0.05;
    const r = c.r + back;
    camera.position.set(Math.sin(az) * r, c.h + L.y * 0.25 + back * 0.15, Math.cos(az) * r);
    camera.lookAt(0, c.ty, 0);
    const p = camera as THREE.PerspectiveCamera;
    p.fov = c.fov;
    p.setViewOffset(size.width, size.height, c.sx * size.width, c.sy * size.height, size.width, size.height);
    p.updateProjectionMatrix();
    if (moving || (rig.light > 0 && rig.light < 1)) invalidate();
  });
  return null;
}

export default function Scene({ onReady }: { onReady: () => void }) {
  const low = rig.phone;
  return (
    <Canvas
      frameloop="demand" shadows={{ type: THREE.PCFShadowMap }} dpr={[1, low ? 1.5 : 1.6]}
      camera={{ fov: 30, near: 0.1, far: 80, position: [0, 4, 12] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.0;
        requestAnimationFrame(() => requestAnimationFrame(onReady));
      }}
      style={{ touchAction: 'pan-y' }}
    >
      <color attach="background" args={[WALL]} />
      {/* Light from the room itself, bounced off the far walls. No shadow. */}
      <directionalLight position={[6, 8, 9]} intensity={0.32} color="#f2efe8" />
      <Daylight />
      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#8d877d']} />
        <Lightformer form="rect" intensity={6} color="#fffaf2" position={[-10, 9.6, -1.6]} rotation-y={Math.PI / 2} scale={[3.6, 2.5, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#e8e4dc" position={[0, 6, 11]} rotation-y={Math.PI} scale={[22, 10, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#e2ded6" position={[11, 6, 0]} rotation-y={-Math.PI / 2} scale={[22, 10, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#d9d4cb" position={[0, 6, -11]} scale={[22, 10, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#f4f1ea" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[18, 18, 1]} />
      </Environment>
      <Room />
      <Plinth />
      <Bench />
      <Sculpture />
      <ContactShadows frames={1} position={[0, 0.005, 2]} scale={[14, 14]} resolution={low ? 512 : 1024} far={2.4} blur={2.4} opacity={0.5} color="#2a241c" />
      <Walk />
    </Canvas>
  );
}
