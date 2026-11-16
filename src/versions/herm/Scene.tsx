// The gallery: one double herm in bone white marble on a dark stone floor.
// Two copies of the head scan, fused back to back under a carved band, on a tapering pillar.
// One key light from one side, a thin rim from behind the other. The visitor turns it.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, RoundedBox, useGLTF, useTexture } from '@react-three/drei';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scroll } from '@/lib/scroll';
import { clamp, damp, isPhone, lerp, smooth, still } from '@/lib/utils';
import { PHONE, WIDE, rig, type View } from './rig';

const BG = '#0c0c0d';
const BASE = `${import.meta.env.BASE_URL}models/`;

/* ---------- the stone: canvas-drawn veining, sampled on three planes ---------- */

function veinCanvas() {
  const S = 1024;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d')!;
  let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  g.fillStyle = '#ece8e0'; g.fillRect(0, 0, S, S);
  // cloud: soft warm and cool patches
  for (let i = 0; i < 140; i++) {
    const x = rnd() * S, y = rnd() * S, r = 40 + rnd() * 180;
    const warm = rnd() < 0.5;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, warm ? 'rgba(214,204,188,0.10)' : 'rgba(196,198,200,0.10)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  // veins: wandering lines, wrapped so the tile repeats without a seam
  const vein = (width: number, alpha: number, blur: number, len: number) => {
    let x = rnd() * S, y = rnd() * S, a = -0.6 + rnd() * 0.5;
    const pts: [number, number][] = [[x, y]];
    for (let i = 0; i < len; i++) { a += (rnd() - 0.5) * 0.5; x += Math.cos(a) * 9; y += Math.sin(a) * 9; pts.push([x, y]); }
    g.filter = `blur(${blur}px)`;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      g.beginPath(); g.moveTo(pts[0][0] + ox, pts[0][1] + oy);
      for (const [px, py] of pts) g.lineTo(px + ox, py + oy);
      g.strokeStyle = `rgba(92,92,96,${alpha})`; g.lineWidth = width; g.stroke();
    }
    g.filter = 'none';
  };
  for (let i = 0; i < 9; i++) vein(6 + rnd() * 8, 0.07, 6, 90 + rnd() * 80);
  for (let i = 0; i < 16; i++) vein(1.2 + rnd() * 1.6, 0.22, 0.8, 50 + rnd() * 90);
  for (let i = 0; i < 34; i++) vein(0.6, 0.16, 0.4, 20 + rnd() * 40);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
  return t;
}

function stone(vein: THREE.Texture, o: { rough: number; coat: number; scale: number; normal?: THREE.Texture }) {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: o.rough, metalness: 0, clearcoat: o.coat, clearcoatRoughness: 0.22,
    sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color('#f3e9dc'), specularIntensity: 0.55,
    normalMap: o.normal ?? null, normalScale: new THREE.Vector2(0.45, 0.45),
  });
  m.onBeforeCompile = (s) => {
    s.uniforms.uVein = { value: vein };
    s.uniforms.uScale = { value: o.scale };
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMp; varying vec3 vNl;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMp = position; vNl = objectNormal;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMp; varying vec3 vNl; uniform sampler2D uVein; uniform float uScale;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 tw = pow(abs(normalize(vNl)), vec3(4.0)); tw /= (tw.x + tw.y + tw.z);
        vec3 tp = vMp * uScale;
        vec3 marb = texture2D(uVein, tp.zy + vec2(0.31, 0.0)).rgb * tw.x + texture2D(uVein, tp.xz + vec2(0.0, 0.57)).rgb * tw.y + texture2D(uVein, tp.xy).rgb * tw.z;
        marb = pow(marb, vec3(2.2));
        float veinAmt = clamp(1.0 - marb.g / 0.83, 0.0, 1.0);
        diffuseColor.rgb = marb;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + veinAmt * 0.25, 0.0, 1.0);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.93, 0.85) * 0.012;');
  };
  m.customProgramCacheKey = () => `herm-stone-${o.rough}-${!!o.normal}`;
  return m;
}

/* ---------- the object ---------- */

const K = 0.52;          // scan units to gallery units
const SINK = 0.7;        // how far each head sinks into the other
const CROP = -1.15;      // where the neck goes into the capital
const TOP = 4.9;         // capital top
const Y0 = TOP - CROP * K - 0.1;

function useHeads() {
  const { scene } = useGLTF(`${BASE}head.glb`);
  return useMemo(() => {
    let src: THREE.BufferGeometry | undefined;
    scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && !src) src = (o as THREE.Mesh).geometry; });
    const g0 = src!.clone();
    const pos = g0.attributes.position as THREE.BufferAttribute;
    const idx = g0.index!;
    const keep: number[] = [];
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
      if (Math.min(pos.getY(a), pos.getY(b), pos.getY(c)) >= CROP) keep.push(a, b, c);
    }
    g0.setIndex(keep);
    // the seam: the head's cross-section where the two copies meet
    const N = 128, R = new Array(N).fill(0), cy = 1.0;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), z = pos.getZ(i), x = pos.getX(i);
      if (Math.abs(z + SINK) > 0.22 || y < CROP) continue;
      const a = Math.atan2(y - cy, x), r = Math.hypot(x, y - cy);
      const bin = ((Math.round((a / (Math.PI * 2)) * N) % N) + N) % N;
      R[bin] = Math.max(R[bin], r);
    }
    for (let i = 0; i < N; i++) if (!R[i]) { let l = i, h = i; while (!R[(l + N) % N]) l--; while (!R[h % N]) h++; R[i] = (R[(l + N) % N] + R[h % N]) / 2; }
    for (let pass = 0; pass < 3; pass++) { const r0 = R.slice(); for (let i = 0; i < N; i++) R[i] = Math.max(r0[i], (r0[(i + N - 1) % N] + r0[i] + r0[(i + 1) % N]) / 3); }
    const shape = new THREE.Shape();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      let x = Math.cos(a) * (R[i] + 0.07), y = cy + Math.sin(a) * (R[i] + 0.07);
      y = Math.max(y, CROP - 0.1);
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    const band = new THREE.ExtrudeGeometry(shape, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 3, curveSegments: 4 });
    band.translate(0, 0, -0.18);
    const place = (g: THREE.BufferGeometry, yaw: number) => { g.scale(K, K, K); g.rotateY(yaw); g.translate(0, Y0, 0); return g; };
    const a = g0.clone(); a.translate(0, 0, SINK);
    const b = g0.clone(); b.translate(0, 0, SINK);
    const heads = mergeGeometries([place(a, -Math.PI / 2), place(b, Math.PI / 2)])!;
    heads.computeBoundingSphere();
    place(band, -Math.PI / 2); band.computeVertexNormals();
    return { heads, band };
  }, [scene]);
}

function shaftGeometry() {
  // a square shaft, wider at the top, with real arrises
  const h = TOP - 0.22 - 0.36, bot = 0.6, top = 0.78;
  const g = new THREE.CylinderGeometry(top * Math.SQRT2, bot * Math.SQRT2, h, 4, 1, false);
  g.rotateY(Math.PI / 4);
  g.translate(0, 0.36 + h / 2, 0);
  const n = g.toNonIndexed(); n.computeVertexNormals();
  return n;
}

function Herm({ vein }: { vein: THREE.Texture }) {
  const normal = useTexture(`${BASE}head-normal.jpg`);
  useMemo(() => { normal.flipY = false; normal.colorSpace = THREE.NoColorSpace; normal.needsUpdate = true; }, [normal]);
  const { heads, band } = useHeads();
  const face = useMemo(() => stone(vein, { rough: 0.24, coat: 0.4, scale: 0.21, normal }), [vein, normal]);
  const carved = useMemo(() => stone(vein, { rough: 0.42, coat: 0.1, scale: 0.21 }), [vein]);
  const rough = useMemo(() => stone(vein, { rough: 0.6, coat: 0, scale: 0.17 }), [vein]);
  const shaft = useMemo(shaftGeometry, []);
  const turn = useRef<THREE.Group>(null);
  useEffect(() => { rig.loaded = true; }, []);
  useFrame(() => { if (turn.current) turn.current.rotation.y = pose.yaw; });
  return (
    <group ref={turn}>
      <mesh geometry={heads} material={face} castShadow receiveShadow />
      <mesh geometry={band} material={carved} castShadow receiveShadow />
      <mesh geometry={shaft} material={rough} castShadow receiveShadow />
      <RoundedBox args={[1.9, 0.22, 1.9]} radius={0.035} smoothness={3} position={[0, TOP - 0.11, 0]} material={carved} castShadow receiveShadow />
      <RoundedBox args={[1.68, 0.08, 1.68]} radius={0.02} smoothness={2} position={[0, TOP - 0.26, 0]} material={rough} castShadow receiveShadow />
    </group>
  );
}

/* ---------- pose: scroll, hand and pointer combined ---------- */

const pose = { x: 0.235, y: 0.02, zoom: 1, side: -1, key: 1, yaw: 0, shown: 0 };

function target(views: Record<string, View>): View {
  const A = rig.anchors;
  const first = views.hero;
  if (!A.length) return first;
  const f = scroll.y + window.innerHeight * 0.5;
  let i = 0;
  while (i + 1 < A.length && A[i + 1].s <= f) i++;
  const cur = views[A[i].v] ?? first;
  if (i === 0 || f >= A[i].e) return cur;
  const prev = views[A[i - 1].v] ?? first;
  const t = smooth(clamp((f - A[i].s) / (A[i].e - A[i].s)));
  return { x: lerp(prev.x, cur.x, t), y: lerp(prev.y, cur.y, t), zoom: lerp(prev.zoom, cur.zoom, t), turn: lerp(prev.turn, cur.turn, t), side: lerp(prev.side, cur.side, t), key: lerp(prev.key, cur.key, t) };
}

/** On a phone the herm stands in the gap above each text block and scrolls with it. */
function phoneTarget(): View {
  const A = rig.anchors, vh = window.innerHeight;
  if (!A.length) return PHONE.hero;
  let i = 0;
  while (i + 1 < A.length && (A[i].top - scroll.y) / vh + 0.56 < 0) i++;
  // at the very end it stays in view above the last words
  const u = A[i].v === 'end' ? Math.max(-0.06, (A[i].top - scroll.y) / vh) : (A[i].top - scroll.y) / vh;
  const cur = PHONE[A[i].v] ?? PHONE.hero, prev = i > 0 ? PHONE[A[i - 1].v] ?? cur : cur;
  const t = smooth(clamp((1 - u) / 0.9));
  return { x: 0, y: cur.y - u, zoom: cur.zoom, turn: lerp(prev.turn, cur.turn, t), side: lerp(prev.side, cur.side, t), key: lerp(prev.key, cur.key, t) };
}

function Rig() {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const key = useRef<THREE.SpotLight>(null), rimL = useRef<THREE.DirectionalLight>(null), rimR = useRef<THREE.DirectionalLight>(null);
  const aim = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, 6.0, 0); return o; }, []);
  useEffect(() => { if (key.current) key.current.target = aim; }, [aim]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    const phone = size.width <= 820;
    const t = phone ? phoneTarget() : target(WIDE);
    const L = still ? 1e3 : 3.2;
    pose.x = damp(pose.x, t.x, L, dt); pose.y = phone ? t.y : damp(pose.y, t.y, L, dt); pose.zoom = damp(pose.zoom, t.zoom, L, dt);
    pose.side = damp(pose.side, t.side, still ? 1e3 : 2.4, dt); pose.key = damp(pose.key, t.key, L, dt);
    // the hand: weight, damping, and a spring that always brings it to rest in profile
    if (!rig.drag && !still) {
      const rest = Math.round(rig.user / Math.PI) * Math.PI;
      const slow = Math.abs(rig.vel) < 2.6;
      if (slow) rig.vel += (rest - rig.user) * 10 * dt;
      rig.vel *= Math.exp(-(slow ? 4.4 : 0.9) * dt);
      rig.user += rig.vel * dt;
    }
    pose.shown = still ? rig.user : damp(pose.shown, rig.user, rig.drag ? 14 : 30, dt);
    pose.yaw = t.turn + pose.shown + (still ? 0 : rig.lean * 0.07);

    const W = size.width, H = size.height;
    cam.zoom = pose.zoom;
    cam.setViewOffset(W, H, -pose.x * W, pose.y * H, W, H);
    cam.updateProjectionMatrix();

    const s = pose.side, a = Math.abs(s), up = smooth(clamp(rig.intro * 1.6 - 0.4)), rimUp = smooth(clamp(rig.intro * 2));
    if (key.current) {
      key.current.position.set(s * 9, 12.5 + (1 - a) * 2.5, 1.4 + (1 - a) * 5.5);
      key.current.intensity = 5.2 * pose.key * up;
    }
    const rim = 3.4 * rimUp * (0.55 + 0.45 * pose.key);
    if (rimL.current) rimL.current.intensity = rim * clamp(0.5 + 0.5 * s);
    if (rimR.current) rimR.current.intensity = rim * clamp(0.5 - 0.5 * s);
  });
  return (
    <>
      <primitive object={aim} />
      <spotLight ref={key} position={[-8.5, 13.5, 3.2]} angle={0.36} penumbra={0.7} decay={0} intensity={0} color="#fff3e4"
        castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.025} />
      <directionalLight ref={rimL} position={[-7, 8.5, -9]} intensity={0} color="#dfe6f2" />
      <directionalLight ref={rimR} position={[7, 8.5, -9]} intensity={0} color="#dfe6f2" />
      <ambientLight intensity={0.012} />
    </>
  );
}

function Floor() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d')!; const img = g.createImageData(256, 256);
    let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < img.data.length; i += 4) { const v = 150 + r() * 90; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(24, 24);
    return t;
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[90, 90]} />
      <meshStandardMaterial color="#19191a" roughness={0.78} roughnessMap={tex} metalness={0} />
    </mesh>
  );
}

function Plinth({ vein }: { vein: THREE.Texture }) {
  const m = useMemo(() => stone(vein, { rough: 0.7, coat: 0, scale: 0.17 }), [vein]);
  return <RoundedBox args={[2.25, 0.36, 2.25]} radius={0.04} smoothness={3} position={[0, 0.18, 0]} material={m} castShadow receiveShadow />;
}

export default function Scene() {
  const vein = useMemo(veinCanvas, []);
  const phone = typeof window !== 'undefined' && isPhone();
  return (
    <Canvas
      className="herm-canvas"
      dpr={[1, phone ? 1.5 : 1.6]}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ position: [0, 4.5, 34], fov: 16.5, near: 1, far: 120 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ camera, scene, gl }) => {
        camera.lookAt(0, 3.85, 0);
        scene.background = new THREE.Color(BG);
        scene.fog = new THREE.Fog(BG, 38, 62);
        gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05;
      }}
    >
      <Environment resolution={128} environmentIntensity={0.09}>
        <Lightformer form="rect" intensity={2} position={[-6, 6, 4]} scale={[4, 6, 1]} target={[0, 4, 0]} />
        <Lightformer form="rect" intensity={1.2} position={[6, 6, 4]} scale={[4, 6, 1]} target={[0, 4, 0]} />
        <Lightformer form="rect" intensity={0.8} position={[0, 12, 0]} scale={[8, 8, 1]} rotation={[Math.PI / 2, 0, 0]} />
      </Environment>
      <Rig />
      <Floor />
      <Plinth vein={vein} />
      <ContactShadows position={[0, 0.005, 0]} scale={7} resolution={256} blur={2.6} far={1.2} opacity={0.85} frames={1} color="#000000" />
      <Suspense fallback={null}>
        <Herm vein={vein} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(`${BASE}head.glb`);
