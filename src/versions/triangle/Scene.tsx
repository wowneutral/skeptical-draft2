import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { clamp, lerp, smooth, still } from '@/lib/utils';
import { buildTriangle, marbleTextures, stoneTexture, D, T } from './geo';
import { stage } from './stage';

type Pose = { az: number; el: number; tgt: THREE.Vector3; fov: number; sx: number; sy: number };

const rad = THREE.MathUtils.degToRad;
let audio: AudioContext | null = null;
export function wakeAudio() {
  try { if (!audio) audio = new AudioContext(); if (audio.state === 'suspended') audio.resume(); } catch { audio = null; }
}
/** The lens: two very short, very quiet ticks. */
function click() {
  if (!audio || audio.state !== 'running') return;
  const t0 = audio.currentTime;
  for (const [dt, g] of [[0, 0.05], [0.028, 0.032]] as const) {
    const len = Math.floor(audio.sampleRate * 0.012);
    const buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
    const src = audio.createBufferSource(); src.buffer = buf;
    const bp = audio.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 1.4;
    const gn = audio.createGain(); gn.gain.value = g;
    src.connect(bp).connect(gn).connect(audio.destination); src.start(t0 + dt);
  }
}

function Rig({ built, plinth }: { built: ReturnType<typeof buildTriangle>; plinth: { x0: number; x1: number; z1: number; top: number } }) {
  const { camera, size, gl } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const poses = useMemo(() => {
    const c = built.corners;
    const desk: Pose[] = [
      { az: 0, el: 0, tgt: T.clone().add(new THREE.Vector3(0, -0.12, 0)), fov: 10.6, sx: 0.2, sy: 0 },
      { az: -34, el: 9, tgt: c.left.clone().add(new THREE.Vector3(0.35, 0.3, 0)), fov: 7.4, sx: 0.25, sy: 0 },
      { az: 40, el: 22, tgt: c.right.clone().add(new THREE.Vector3(-0.35, 0.3, 0)), fov: 7.4, sx: 0.25, sy: 0 },
      { az: 118, el: 13, tgt: T.clone().add(new THREE.Vector3(0, -0.15, 0)), fov: 14.5, sx: 0.26, sy: 0 },
      { az: 0, el: 0, tgt: c.apexNear.clone().add(new THREE.Vector3(0, -0.35, 0)), fov: 6, sx: 0.25, sy: 0 },
      { az: 0, el: 0, tgt: T.clone().add(new THREE.Vector3(0, -2.05, 0)), fov: 17, sx: 0, sy: 0 },
    ];
    const phone: Pose[] = desk.map((p, i) => ({ ...p, sx: 0, sy: 0, fov: i === 0 || i === 5 ? 10.2 : i === 3 ? 13.5 : p.fov * 1.1 }));
    phone[5].tgt = T.clone().add(new THREE.Vector3(0, -0.25, 0));
    phone[0].tgt = T.clone().add(new THREE.Vector3(0, -0.2, 0));
    return { desk, phone };
  }, [built]);
  const sp = useRef({ band: -1, drag: still ? 0 : 17, armed: false, frames: 0, edge: [0, 0, 0], px: 0, py: 0 });
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), t: new THREE.Vector3() }), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20), s = sp.current;
    if (++s.frames === 4) gl.shadowMap.autoUpdate = false;
    // Which view the page is on.
    const stops = stage.stops, y = window.scrollY;
    let f = 0;
    if (stops.length > 1) {
      if (y >= stops[stops.length - 1]) f = stops.length - 1;
      else for (let i = 0; i < stops.length - 1; i++) {
        if (y < stops[i + 1]) { const u = clamp((y - stops[i]) / Math.max(1, stops[i + 1] - stops[i])); f = i + smooth(clamp((u - 0.18) / 0.64)); break; }
      }
    }
    if (still) f = Math.round(f);
    stage.f = f;
    const band = stage.phone ? 0 : smooth(clamp((f - 0.25) / 0.55)) * (1 - smooth(clamp((f - 4.2) / 0.5)));
    if (Math.abs(band - s.band) > 0.002) { s.band = band; stage.onBand?.(band); }
    const list = stage.phone ? poses.phone : poses.desk;
    const i0 = Math.min(list.length - 1, Math.floor(f)), i1 = Math.min(list.length - 1, i0 + 1), u = f - i0;
    const A = list[i0], B = list[i1];
    // The swing: a spring with a little overshoot, and the click when it closes.
    if (!stage.held) {
      const k = 34, c = still ? 2 * Math.sqrt(k) : 5.2;
      stage.vel += (-k * s.drag - c * stage.vel) * dt;
      s.drag += stage.vel * dt;
      if (s.armed && Math.abs(s.drag) < 0.3 && Math.abs(stage.vel) < 3) { s.armed = false; click(); }
    } else {
      s.drag = stage.drag;
      if (Math.abs(s.drag) > 8) s.armed = true;
    }
    stage.drag = s.drag;
    // The pointer only nudges: enough for the corner to start lying.
    s.px = lerp(s.px, still || stage.phone ? 0 : stage.px, 1 - Math.exp(-3 * dt));
    s.py = lerp(s.py, still || stage.phone ? 0 : stage.py, 1 - Math.exp(-3 * dt));
    const az = rad(lerp(A.az, B.az, u) + s.drag + s.px * 3.2), el = rad(lerp(A.el, B.el, u) - s.py * 2);
    tmp.t.lerpVectors(A.tgt, B.tgt, u);
    cam.position.set(T.x + D * Math.sin(az) * Math.cos(el), T.y + D * Math.sin(el), T.z + D * Math.cos(az) * Math.cos(el));
    cam.lookAt(tmp.t);
    const aspect = size.width / size.height;
    let fov = lerp(A.fov, B.fov, u);
    if (stage.phone && aspect < 1) fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(rad(fov / 2)) * Math.max(1, 0.98 / aspect)));
    cam.fov = fov; cam.near = 1; cam.far = 140;
    const sx = lerp(A.sx, B.sx, u), sy = lerp(A.sy, B.sy, u);
    cam.setViewOffset(size.width, size.height, -sx * size.width, -sy * size.height, size.width, size.height);
    cam.updateProjectionMatrix();
    // The three ways in stand on the plinth's front edge: tell the page where it is.
    if (stage.onEdge && !stage.phone && f > 4.2) {
      tmp.a.set(plinth.x0, plinth.top, plinth.z1).project(cam); tmp.b.set(plinth.x1, plinth.top, plinth.z1).project(cam);
      const ey = (1 - tmp.a.y) / 2 * size.height, l = (tmp.a.x + 1) / 2 * size.width, r = (tmp.b.x + 1) / 2 * size.width;
      const e = s.edge;
      if (Math.abs(e[0] - ey) > 0.5 || Math.abs(e[1] - l) > 0.5 || Math.abs(e[2] - (r - l)) > 0.5) { s.edge = [ey, l, r - l]; stage.onEdge(ey, l, r - l); }
    }
  });
  return null;
}

function Sculpture() {
  const built = useMemo(buildTriangle, []);
  const tex = useMemo(() => marbleTextures(512), []);
  const mats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshPhysicalMaterial({
    map: tex.map, roughnessMap: tex.rough, roughness: 1, metalness: 0,
    clearcoat: 0.32, clearcoatRoughness: 0.32, specularIntensity: 0.55, sheen: 0.15, sheenRoughness: 0.8, sheenColor: new THREE.Color('#fff4e6'),
    emissive: new THREE.Color('#ffe2b8'), emissiveIntensity: 0,
  })), [tex]);
  const plinthTex = useMemo(() => { const t = stoneTexture([228, 223, 213], 5); t.repeat.set(2, 2); return t; }, []);
  const floorTex = useMemo(() => { const t = stoneTexture([200, 193, 181], 7); t.repeat.set(10, 10); return t; }, []);
  const wallTex = useMemo(() => { const t = stoneTexture([222, 218, 210], 2.4); t.repeat.set(6, 3); return t; }, []);
  const bx = built.box;
  const top = built.minY, PH = 3.4, PW = 6.8;
  const cx = (bx.min.x + bx.max.x) / 2, cz = (bx.min.z + bx.max.z) / 2, PD = bx.max.z - bx.min.z + 0.9;
  const floorY = top - PH;
  const plinth = { x0: cx - PW / 2, x1: cx + PW / 2, z1: cz + PD / 2, top };
  const key = useRef<THREE.DirectionalLight>(null);
  const born = useRef(-1);
  useEffect(() => () => { mats.forEach((m) => m.dispose()); }, [mats]);
  useFrame(({ clock }, dt) => {
    // The opening: the skylight comes up over the room.
    if (born.current < 0) born.current = clock.elapsedTime;
    const t = still ? 1 : smooth(clamp((clock.elapsedTime - born.current) / 2.4));
    if (key.current) key.current.intensity = 0.4 + t * 2.4;
    mats.forEach((m, i) => { m.emissiveIntensity = lerp(m.emissiveIntensity, stage.hover === i ? 0.22 : 0, 1 - Math.exp(-8 * dt)); });
  });
  return (
    <>
      <Rig built={built} plinth={plinth} />
      <color attach="background" args={['#dedad2']} />
      <hemisphereLight args={['#fffaf2', '#8f887c', 0.7]} />
      <directionalLight
        ref={key} position={[-0.7, 7.6, 14]} intensity={3} castShadow color="#fff8ee"
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.025} shadow-radius={4}
        shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-camera-near={6} shadow-camera-far={34}
      />
      <Environment resolution={128} frames={1} environmentIntensity={0.55}>
        <color attach="background" args={['#bdb6aa']} />
        <Lightformer form="rect" intensity={3.2} position={[0, 9, 1]} rotation-x={Math.PI / 2} scale={[9, 9, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#fff1dc" position={[-8, 2, 4]} rotation-y={Math.PI / 2} scale={[6, 4, 1]} />
        <Lightformer form="rect" intensity={0.5} position={[6, 1, 8]} rotation-y={-Math.PI / 3} scale={[5, 3, 1]} />
      </Environment>
      {built.beams.map((g, i) => <mesh key={i} geometry={g} material={mats[i]} castShadow receiveShadow />)}
      <mesh position={[cx, top - PH / 2, cz]} castShadow receiveShadow>
        <boxGeometry args={[PW, PH, PD]} />
        <meshStandardMaterial map={plinthTex} roughness={0.88} />
      </mesh>
      <ContactShadows position={[cx, top + 0.004, cz]} scale={[PW, PD]} far={1.4} blur={2.2} opacity={0.62} resolution={512} frames={1} color="#2b261e" />
      <mesh position={[0, floorY, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial map={floorTex} roughness={0.95} />
      </mesh>
      <mesh position={[0, floorY + 20, 0]}>
        <boxGeometry args={[110, 40, 110]} />
        <meshBasicMaterial map={wallTex} side={THREE.BackSide} toneMapped={false} />
      </mesh>
    </>
  );
}

export default function Scene() {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.6]}
      camera={{ fov: 12, position: [0, 0, D], near: 1, far: 140 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1; }}
      aria-hidden
    >
      <Sculpture />
    </Canvas>
  );
}
