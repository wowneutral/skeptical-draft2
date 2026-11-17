// The scene: black slate, nine bone tiles, one raking key light, a long lens walking beside the row.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, N8AO, DepthOfField, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { scroll } from '@/lib/scroll';
import { clamp, damp, lerp, smooth, still } from '@/lib/utils';
import { FACE_DOWN, LAST, N, PT, PW, chainAngle, fOf, h, knock, pushFrom, row, scrollAngle, settle, t, zc, zp } from './row';

type Pose = { f: number; pos: [number, number, number]; tgt: [number, number, number]; fov: number; up?: [number, number, number] };

const SLAB_FACE_Y = t[LAST];
/** /domino?slow=8 plays the chain eight times slower, for checking the fall frame by frame. */
const SLOW = Math.max(1, Number(new URLSearchParams(location.search).get('slow')) || 1);
const DOT_Y = 0.71;
const FACE_Z = zp[LAST] - h[LAST] * 0.56;

function poses(phone: boolean): Pose[] {
  const list: Pose[] = [];
  const hero: Pose = phone
    ? { f: 0, pos: [4.2, 2.6, 7.5], tgt: [-0.8, 3.6, -13], fov: 44 }
    : { f: 0, pos: [3.0, 0.45, 8.8], tgt: [-0.6, 3.9, -12], fov: 27 };
  list.push(hero);
  for (let i = 1; i <= LAST; i++) {
    const H = h[i], z = zc[i];
    list.push(phone
      ? { f: i, pos: [1.2 * H, 0.45 * H, z + 3.4 * H], tgt: [-0.1 * H, 1.2 * H, z - 2 * H], fov: 40 }
      : { f: i, pos: [2.6 * H, 0.55 * H, z + 2.4 * H], tgt: [-0.3 * H, 0.9 * H, z - 2 * H], fov: 32 });
  }
  list.push(phone
    ? { f: 8.55, pos: [5, 21, -9], tgt: [0, 2, -20], fov: 44, up: [0, 0.6, -0.8] }
    : { f: 8.55, pos: [10, 18, -7], tgt: [0, 2, -19], fov: 34, up: [0, 0.75, -0.66] });
  list.push(phone
    ? { f: 9, pos: [0, SLAB_FACE_Y + 11.5, FACE_Z], tgt: [0, SLAB_FACE_Y, FACE_Z - 0.01], fov: 44, up: [0, 0, -1] }
    : { f: 9, pos: [0, SLAB_FACE_Y + 4.4, FACE_Z], tgt: [0, SLAB_FACE_Y, FACE_Z - 0.01], fov: 36, up: [0, 0, -1] });
  list.push({ ...hero, f: 10 });
  return list;
}

/** A canvas-drawn noise, for the slate's roughness and the bone's faint grain. */
function noiseTex(size: number, base: number, amp: number, streak = 0) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!; const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = Math.random() * amp + Math.sin((x * 0.05 + y * 0.013) * 3) * streak;
    const v = clamp(base + n - amp / 2) * 255, k = (y * size + x) * 4;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function Row({ phone }: { phone: boolean }) {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const wob = useRef(new Array(N).fill(0));
  const { gl } = useThree();
  const geo = useMemo(() => {
    const g = new RoundedBoxGeometry(PW, 1, PT, 5, 0.026);
    g.translate(0, 0.5, PT / 2);
    return g;
  }, []);
  const groove = useMemo(() => new RoundedBoxGeometry(PW * 0.78, 0.0075, 0.006, 2, 0.002), []);
  const grain = useMemo(() => { const tx = noiseTex(128, 0.36, 0.1); tx.repeat.set(2, 3); return tx; }, []);
  const bone = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#e8dfcb', roughness: 0.36, roughnessMap: grain, clearcoat: 1, clearcoatRoughness: 0.14, sheen: 0.25, sheenColor: new THREE.Color('#fff6e4'), sheenRoughness: 0.6 }), [grain]);
  const ebony = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#1b1815', roughness: 0.42, roughnessMap: grain, clearcoat: 1, clearcoatRoughness: 0.1 }), [grain]);
  const cut = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6f6656', roughness: 0.8 }), []);
  const red = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#c8321e', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }), []);
  const dotGeo = useMemo(() => new THREE.CylinderGeometry(0.075, 0.075, 0.012, 48).rotateX(Math.PI / 2), []);

  useEffect(() => () => { gl.domElement.style.cursor = ''; }, [gl]);

  useFrame((_, dt) => {
    const now = row.now, f = row.f;
    const raw = new Array(N);
    if (row.chain && now - row.chain.t0 > row.chain.done) row.chain = null;
    for (let i = 0; i < N; i++) {
      const standing = row.angles[i] < 0.08;
      wob.current[i] = damp(wob.current[i], row.hover === i && standing && !still ? 0.075 : 0, 9, dt);
      raw[i] = Math.max(scrollAngle(i, f), row.chain ? chainAngle(row.chain, i, now) : 0, wob.current[i]);
    }
    settle(raw, row.angles);
    for (let i = 0; i < N; i++) { const g = groups.current[i]; if (g) g.rotation.x = -row.angles[i]; }
    gl.domElement.style.cursor = row.hover >= 0 && row.angles[row.hover] < 0.08 && !still ? 'pointer' : '';
  });

  return (
    <>
      {h.map((H, i) => (
        <group key={i} position={[0, 0, zp[i]]} ref={(el) => { groups.current[i] = el; }}>
          <group scale={H}>
            <mesh geometry={geo} material={i === FACE_DOWN ? ebony : bone} castShadow receiveShadow
              onPointerOver={(e) => { e.stopPropagation(); row.hover = i; }}
              onPointerOut={() => { if (row.hover === i) row.hover = -1; }}
              onClick={(e) => { e.stopPropagation(); pushFrom(i); }} />
            {i === FACE_DOWN
              ? <mesh geometry={groove} material={cut} position={[0, 0.5, -0.0015]} />
              : <mesh geometry={groove} material={cut} position={[0, 0.5, PT + 0.0012]} />}
            {i === LAST && <mesh geometry={dotGeo} material={red} position={[0, DOT_Y, PT + 0.002]} />}
          </group>
        </group>
      ))}
    </>
  );
}

function Slate({ phone }: { phone: boolean }) {
  const rough = useMemo(() => { const tx = noiseTex(phone ? 256 : 512, 0.72, 0.28, 0.06); tx.repeat.set(10, 10); return tx; }, [phone]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, -14]} receiveShadow>
      <planeGeometry args={[160, 160]} />
      <meshStandardMaterial color="#141412" roughness={0.78} roughnessMap={rough} metalness={0.05} />
    </mesh>
  );
}

function Rig({ phone, dof }: { phone: boolean; dof: React.RefObject<{ target: THREE.Vector3 | null } | null> }) {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const P = useMemo(() => poses(phone), [phone]);
  const key = useRef<THREE.DirectionalLight>(null);
  const st = useRef({ f: 0, t0: -1, shake: 0, prev: new Array(N).fill(0), vel: new Array(N).fill(0) });
  const v = useMemo(() => ({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), up: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), focus: new THREE.Vector3() }), []);

  useEffect(() => {
    const k = key.current; if (!k) return;
    k.target.position.set(0, 0, -9); k.target.updateMatrixWorld();
  }, []);

  useFrame((state, dt) => {
    const S = st.current;
    const time = state.clock.elapsedTime;
    if (S.t0 < 0) S.t0 = time;
    row.now = time / SLOW;
    const intro = still ? 1 : smooth(clamp((time - S.t0 - 0.2) / 2.8));
    const fT = fOf(scroll.y);
    S.f = still ? fT : damp(S.f, fT, 7, Math.min(dt, 0.05));
    row.f = S.f;
    const f = S.f;

    // Where along the row the camera stands.
    let i = 0; while (i < P.length - 2 && P[i + 1].f <= f) i++;
    const A = P[i], B = P[i + 1];
    const s = smooth(clamp((f - A.f) / (B.f - A.f)));
    v.pos.set(...A.pos).lerp(v.b.set(...B.pos), s);
    v.tgt.set(...A.tgt).lerp(v.b.set(...B.tgt), s);
    v.up.set(...(A.up ?? [0, 1, 0])).lerp(v.b.set(...(B.up ?? [0, 1, 0])), s).normalize();
    // The opening: the lens settles in from further back while the key comes up.
    if (intro < 1) v.pos.add(v.a.copy(v.pos).sub(v.tgt).normalize().multiplyScalar((1 - intro) * 2.6));
    cam.position.copy(v.pos);
    cam.up.copy(v.up);
    cam.lookAt(v.tgt);
    cam.fov = lerp(A.fov, B.fov, s);

    // Impacts: a tile that was falling fast and has just been stopped.
    for (let n = 0; n < N; n++) {
      const vel = (row.angles[n] - S.prev[n]) / Math.max(dt, 1 / 120);
      if (S.vel[n] > 1.6 && vel < S.vel[n] * 0.35) {
        S.shake = Math.min(0.03, S.shake + 0.00055 * S.vel[n] * h[n] * (n === LAST ? 2.6 : 1));
        if (row.chain) knock(n, S.vel[n] / 4);
      }
      S.vel[n] = vel; S.prev[n] = row.angles[n];
    }
    if (S.shake > 0.00002 && !still) {
      cam.rotateX(S.shake * Math.sin(time * 61)); cam.rotateY(S.shake * 0.6 * Math.sin(time * 47 + 1)); cam.rotateZ(S.shake * 0.4 * Math.sin(time * 37 + 2));
      S.shake *= Math.exp(-dt * 6);
    }

    // The frame: at the top and the end the picture sits right of the words (below them on a phone).
    const k = still ? (f < 0.5 || f > 9.5 ? 1 : 0) : clamp(1 - smooth(clamp(f / 0.55)) + smooth(clamp((f - 9.45) / 0.55)));
    const W = size.width, Hh = size.height;
    const x0 = phone ? 0 : 0.36 * k, y0 = phone ? 0.46 * k : 0;
    const fw = W * (1 - x0), fh = Hh * (1 - y0);
    cam.aspect = fw / fh;
    if (k > 0.001) cam.setViewOffset(fw, fh, -x0 * W, -y0 * Hh, W, Hh); else cam.clearViewOffset();
    cam.updateProjectionMatrix();

    if (key.current) key.current.intensity = 2.5 * (0.12 + 0.88 * intro);

    // Focus on the tile the camera stands beside.
    const fi = clamp(Math.round(f), 0, LAST);
    if (f > 8.4 && f < 9.6) v.focus.set(0, SLAB_FACE_Y, FACE_Z);
    else v.focus.set(0, h[fi] * 0.55, zc[fi]);
    if (dof.current) dof.current.target = v.focus;
  });

  const sm = phone ? 1024 : 2048;
  return (
    <>
      <directionalLight ref={key} position={[-8, 4.6, 11]} color="#fff0db" intensity={2.5} castShadow
        shadow-mapSize={[sm, sm]} shadow-bias={-0.0003} shadow-normalBias={0.02}
        shadow-camera-left={-17} shadow-camera-right={17} shadow-camera-top={17} shadow-camera-bottom={-17} shadow-camera-near={1} shadow-camera-far={70} />
      <directionalLight position={[7, 9, -42]} color="#f4efe6" intensity={1.7} />
      <hemisphereLight args={['#2b2925', '#050505', 0.35]} />
    </>
  );
}

export default function Stage({ phone }: { phone: boolean }) {
  const dof = useRef<{ target: THREE.Vector3 | null }>(null);
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} dpr={[1, phone ? 1.5 : 1.6]}
      camera={{ fov: 25, near: 0.05, far: 140, position: [-2, 0.4, 8] }}
      gl={{ antialias: !phone, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.98; scene.fog = new THREE.Fog('#0c0c0b', 32, 80); }}
      onPointerMissed={() => { row.hover = -1; }}
    >
      <color attach="background" args={['#0c0c0b']} />
      <Environment resolution={128} frames={1} environmentIntensity={0.42}>
        <Lightformer form="rect" intensity={3} color="#fff4e2" position={[-6, 4, 12]} rotation-y={-0.5} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#fff8ee" position={[-8, 7, 2]} rotation-y={-Math.PI / 2} scale={[3, 14, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#f1ece2" position={[0, 12, -12]} rotation-x={Math.PI / 2} scale={[30, 6, 1]} />
        <Lightformer form="rect" intensity={0.35} color="#e9e4d8" position={[0, 5, -40]} scale={[50, 10, 1]} />
      </Environment>
      <Rig phone={phone} dof={dof} />
      <Row phone={phone} />
      <Slate phone={phone} />
      {!phone && (
        <EffectComposer multisampling={4}>
          <N8AO aoRadius={0.7} intensity={2.4} distanceFalloff={0.8} halfRes />
          <DepthOfField ref={dof as never} worldFocusRange={2.6} bokehScale={2.6} />
          <Vignette offset={0.32} darkness={0.55} />
        </EffectComposer>
      )}
      {phone && (
        <EffectComposer multisampling={0}>
          <Vignette offset={0.3} darkness={0.5} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

