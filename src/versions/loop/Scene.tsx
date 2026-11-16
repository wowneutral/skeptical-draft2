// The set: one porcelain band on a dark floor, one key light, one faint rim, a long lens.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { clamp, damp, smooth, still } from '@/lib/utils';
import { FLOOR, H, LINES, PRINT_FONT, R, S, TEX_H, TEX_W, buildBand, drawLine } from './band';

const BG = '#0c0c0c';

type Pose = { fx: number; fy: number; az: number; el: number; d: number; flat: number };
// One pose per stop: hero, manifesto, record, drive, people, join, footer.
const DESK: Pose[] = [
  { fx: 0.71, fy: 0.5, az: -0.95, el: 0.2, d: 10.9, flat: 0 },
  { fx: 0.7, fy: 0.5, az: 0.35, el: 0.16, d: 12.6, flat: 0 },
  { fx: 0.29, fy: 0.5, az: 0.72, el: 0.1, d: 12.2, flat: 0 },
  { fx: 0.71, fy: 0.5, az: -0.85, el: 0.24, d: 12.4, flat: 0 },
  { fx: 0.29, fy: 0.52, az: 0.8, el: 0.06, d: 12, flat: 0 },
  { fx: 0.5, fy: 0.46, az: -0.25, el: 0.62, d: 13.4, flat: 1 },
  { fx: 0.5, fy: 0.31, az: 0.6, el: 0.14, d: 15.5, flat: 0 },
];
const PHONE: Pose[] = [
  { fx: 0.5, fy: 0.27, az: -0.9, el: 0.2, d: 18.5, flat: 0 },
  { fx: 0.5, fy: 0.27, az: 0.35, el: 0.16, d: 19, flat: 0 },
  { fx: 0.5, fy: 0.27, az: 0.62, el: 0.07, d: 18.5, flat: 0 },
  { fx: 0.5, fy: 0.27, az: -0.85, el: 0.24, d: 18.5, flat: 0 },
  { fx: 0.5, fy: 0.27, az: 0.8, el: 0.06, d: 18.5, flat: 0 },
  { fx: 0.5, fy: 0.27, az: -0.25, el: 0.7, d: 18.5, flat: 1 },
  { fx: 0.5, fy: 0.27, az: 0.6, el: 0.14, d: 19, flat: 0 },
];
const TAU = Math.PI * 2;
const azOf = (P: Pose[], i: number, follow: number) => P[i].az + (i >= 2 ? TAU : 0) + (i === 1 ? follow * TAU : 0);

function pose(P: Pose[], f: number, follow: number) {
  const a = clamp(Math.floor(f), 0, P.length - 1), b = Math.min(a + 1, P.length - 1), w = clamp(f - a);
  const get = (j: number, key: keyof Pose) => { const t = S.track[j]; return t && (key === 'fx' || key === 'fy') ? (key === 'fx' ? t.x : t.y) : P[j][key]; };
  const L = (key: keyof Pose) => get(a, key) + (get(b, key) - get(a, key)) * w;
  return { fx: L('fx'), fy: L('fy'), el: L('el'), d: L('d'), flat: L('flat'), az: azOf(P, a, follow) + (azOf(P, b, follow) - azOf(P, a, follow)) * w };
}

function Rig({ phone }: { phone: boolean }) {
  const { camera, size, gl } = useThree();
  const cur = useRef<ReturnType<typeof pose> | null>(null);
  const born = useRef(-1);
  useFrame((st, dt) => {
    dt = Math.min(dt, 0.1);
    const want = pose(phone ? PHONE : DESK, S.pf, S.follow);
    if (phone && S.phoneY > -2) { want.fx = 0.5; want.fy = S.phoneY; }
    if (!cur.current || still) cur.current = { ...want };
    const c = cur.current;
    const lam = 3.2;
    (Object.keys(c) as (keyof typeof c)[]).forEach((k) => { c[k] = damp(c[k], want[k], k === 'az' ? 2.6 : k === 'fx' || k === 'fy' ? (phone ? 60 : 8) : lam, dt); });
    const cam = camera as THREE.PerspectiveCamera;
    const ty = -0.1 + (-R + H + 0.1) * c.flat;
    const el = c.el + S.tilt.y * 0.02;
    const az = c.az + S.tilt.x * 0.035;
    cam.position.set(Math.sin(az) * Math.cos(el) * c.d, ty + Math.sin(el) * c.d, Math.cos(az) * Math.cos(el) * c.d);
    cam.lookAt(0, ty, 0);
    const w = size.width, h = size.height;
    cam.setViewOffset(w, h, w * (0.5 - c.fx), h * (0.5 - c.fy), w, h);
    cam.updateProjectionMatrix();
    const px = (R + 0.25) / (2 * c.d * Math.tan((cam.fov * Math.PI) / 360)) * h;
    S.screen.x = c.fx; S.screen.y = c.fy; S.screen.r = px;
    // The opening: the light comes up on the band.
    if (born.current < 0) born.current = st.clock.elapsedTime;
    const t = st.clock.elapsedTime - born.current;
    gl.toneMappingExposure = still ? 1 : 0.02 + 0.98 * smooth(clamp((t - 0.2) / 1.8));
  });
  return null;
}

function inkMaterial(map: THREE.Texture, other: THREE.Texture) {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#eee8dc', roughness: 0.36, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06,
    specularIntensity: 0.5, sheen: 0.35, sheenRoughness: 0.55, sheenColor: new THREE.Color('#fff4e4'), map,
  });
  const u = { uMapB: { value: other }, uMix: { value: 0 }, uFrom: { value: 0.75 }, uInk: { value: new THREE.Color('#0b0a09') } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'uniform sampler2D uMapB; uniform float uMix; uniform float uFrom; uniform vec3 uInk;\nfloat gInk = 0.0;\nvoid main() {')
      .replace('#include <map_fragment>', `
        float inkA = texture2D( map, vMapUv ).r;
        float inkB = texture2D( uMapB, vMapUv ).r;
        float dd = abs( fract( vMapUv.x - uFrom + 0.5 ) - 0.5 ) * 2.0;
        float mm = smoothstep( dd - 0.06, dd, uMix * 1.08 - 0.02 );
        gInk = mix( inkA, inkB, mm );
        diffuseColor.rgb = mix( diffuseColor.rgb, uInk, gInk * 0.97 );`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix( roughnessFactor, 0.6, gInk );');
  };
  m.customProgramCacheKey = () => 'loop-ink';
  return { m, u };
}

function makeTex(cv: HTMLCanvasElement, aniso: number) {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = aniso; t.colorSpace = THREE.NoColorSpace;
  return t;
}

function Band({ phone }: { phone: boolean }) {
  const { gl } = useThree();
  const geo = useMemo(() => buildBand(phone ? 480 : 720), [phone]);
  const kit = useMemo(() => {
    const ca = document.createElement('canvas'), cb = document.createElement('canvas');
    for (const c of [ca, cb]) { c.width = phone ? TEX_W / 1.5 : TEX_W; c.height = phone ? TEX_H / 1.5 : TEX_H; }
    drawLine(ca, '');
    drawLine(cb, '');
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const ta = makeTex(ca, aniso), tb = makeTex(cb, aniso);
    const ink = inkMaterial(ta, tb);
    const plain = new THREE.MeshPhysicalMaterial({ color: '#eee8dc', roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.06, specularIntensity: 0.5, sheen: 0.35, sheenRoughness: 0.55, sheenColor: new THREE.Color('#fff4e4') });
    return { ca, cb, ta, tb, ink, plain };
  }, [gl, phone]);
  useEffect(() => () => { geo.dispose(); kit.ta.dispose(); kit.tb.dispose(); kit.ink.m.dispose(); kit.plain.dispose(); }, [geo, kit]);

  const g = useRef<THREE.Group>(null);
  const pr = useRef({ shown: -1, busy: false, mix: 0, fonts: false, flat: 0, follow: 0, t0: -1, first: true, tx: 0, ty: 0 });
  useEffect(() => {
    let live = true;
    document.fonts.load(`500 120px ${PRINT_FONT}`).then(() => { if (live) setTimeout(() => { pr.current.fonts = true; }, still ? 0 : 700); }, () => { pr.current.fonts = true; });
    return () => { live = false; };
  }, []);

  useFrame((st, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const p = pr.current;
    if (p.t0 < 0) p.t0 = st.clock.elapsedTime;
    const t = st.clock.elapsedTime - p.t0;
    // The run: dragged, coasting, or (at the footer) going round for good.
    if (!still) {
      if (S.dragging) S.run = damp(S.run, S.target, 12, dt);
      else {
        S.target += S.vel * dt;
        S.vel *= Math.exp(-dt * 0.8);
        if (S.line === 6) S.target += dt * 0.012;
        S.run = damp(S.run, S.target, 5, dt);
      }
      p.follow = damp(p.follow, S.follow, 3.2, dt);
    }
    const off = -(S.run + p.follow * 0.5);
    kit.ta.offset.x = off; kit.tb.offset.x = off;

    // Printing: the new sentence spreads out from the front of the band.
    const want = S.line;
    if (p.fonts && !p.busy && p.shown !== want) {
      drawLine(kit.cb, LINES[want]);
      (kit.ink.u.uMapB.value as THREE.Texture).needsUpdate = true;
      kit.ink.u.uFrom.value = (((0.75 + off) % 1) + 1) % 1;
      p.busy = true; p.mix = still ? 1 : 0;
    }
    if (p.busy) {
      p.mix = Math.min(1, p.mix + Math.min(rawDt, 0.25) / (p.first ? 2.6 : 1.3));
      kit.ink.u.uMix.value = smooth(p.mix);
      if (p.mix >= 1) {
        // Swap: what was printing becomes what is printed.
        const a = kit.ink.m.map as THREE.CanvasTexture, b = kit.ink.u.uMapB.value as THREE.CanvasTexture;
        const ca = kit.ca; kit.ca = kit.cb; kit.cb = ca;
        kit.ta = b; kit.tb = a;
        kit.ink.m.map = b; kit.ink.u.uMapB.value = a;
        kit.ink.u.uMix.value = 0;
        p.shown = want; p.busy = false; p.first = false;
        S.opened = true;
      }
    }

    // Weight: the band leans a touch toward the pointer and settles once when the light comes up.
    if (!g.current) return;
    p.tx = damp(p.tx, still ? 0 : S.tilt.x, 3, dt); p.ty = damp(p.ty, still ? 0 : S.tilt.y, 3, dt);
    const want2 = pose(phone ? PHONE : DESK, S.pf, 0).flat;
    p.flat = still ? want2 : damp(p.flat, want2, 3.2, Math.min(rawDt, 0.12));
    const settle = still ? 0 : 0.045 * Math.exp(-t * 1.3) * Math.sin(t * 3.1);
    g.current.rotation.set(-Math.PI / 2 * p.flat + p.ty * 0.05 * (1 - p.flat), p.tx * 0.1, settle * (1 - p.flat));
    g.current.position.y = (-R + H) * p.flat * p.flat;
  });

  return (
    <group ref={g}>
      <mesh geometry={geo} material={[kit.ink.m, kit.plain]} castShadow receiveShadow />
    </group>
  );
}

function Key({ phone }: { phone: boolean }) {
  const light = useRef<THREE.SpotLight>(null);
  useEffect(() => {
    const l = light.current; if (!l) return;
    l.target.position.set(0, -0.7, 0); l.target.updateMatrixWorld();
    l.shadow.camera.near = 4; l.shadow.camera.far = 18; l.shadow.camera.updateProjectionMatrix();
  }, []);
  return (
    <spotLight
      ref={light} position={[-3.6, 6.6, 5.2]} angle={0.44} penumbra={1} intensity={150} decay={2} color="#fff6ea"
      castShadow shadow-mapSize={[phone ? 1024 : 2048, phone ? 1024 : 2048]} shadow-bias={-0.0003} shadow-normalBias={0.012} shadow-radius={5}
    />
  );
}

export default function Scene({ phone }: { phone: boolean }) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} dpr={[1, phone ? 1.5 : 1.6]} frameloop={still ? 'demand' : 'always'}
      camera={{ fov: 20, near: 1, far: 70, position: [0, 1, 12] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = still ? 1 : 0.02; }}
      style={{ touchAction: 'pan-y' }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 13, 30]} />
      <hemisphereLight args={['#f3eee4', '#0c0c0c', 0.22]} />
      <Key phone={phone} />
      {/* The rim: faint, cool, from behind. */}
      <directionalLight position={[4.5, 2.5, -7]} intensity={1.3} color="#e6ebf2" />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#060606']} />
        {/* The softbox the glaze reflects: it slides along the twist as the band turns. */}
        <Lightformer form="rect" intensity={5} color="#fff7ec" position={[-4, 4.5, 5]} scale={[5.5, 2.4, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.4} color="#e9eef6" position={[6, 1.5, -5]} scale={[1, 7, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.35} color="#f2ede4" position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
      </Environment>
      <Rig phone={phone} />
      <Band phone={phone} />
      <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1c1b19" roughness={0.94} />
      </mesh>
      <ContactShadows position={[0, FLOOR + 0.003, 0]} scale={6} resolution={phone ? 256 : 512} blur={2.6} far={1.3} opacity={0.7} color="#000000" />
      {!phone && <ContactShadows position={[0, FLOOR + 0.004, 0]} scale={4} resolution={512} blur={0.7} far={0.14} opacity={0.9} color="#000000" />}
    </Canvas>
  );
}
