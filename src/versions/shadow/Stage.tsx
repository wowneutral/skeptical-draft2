// Version 34's room: a pale wall, a dark floor, a plinth, the bronze and one spotlight.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clamp, damp, isPhone, still } from '@/lib/utils';
import { LIGHT, WALL, buildSculpture } from './geo';
import { SNAP, nearest, st } from './stage';

function noise(size: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, repeat = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  draw(g, r);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4;
  return t;
}

function useMaterials() {
  return useMemo(() => {
    // Cast bronze: a mottled roughness, worn brighter on the edges by handling.
    const rough = noise(256, (g, r) => {
      g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) { const v = Math.floor(90 + r() * 90); g.fillStyle = `rgba(${v},${v},${v},0.22)`; const w = 1 + r() * 7; g.fillRect(r() * 256, r() * 256, w, w * (0.4 + r())); }
    }, 3);
    const bronze = new THREE.MeshPhysicalMaterial({ color: '#8c5a2e', metalness: 1, roughness: 0.42, roughnessMap: rough, clearcoat: 0.35, clearcoatRoughness: 0.5, envMapIntensity: 1.1, emissive: '#ff9a4a', emissiveIntensity: 0 });
    const steel = new THREE.MeshStandardMaterial({ color: '#3a332c', metalness: 1, roughness: 0.38, envMapIntensity: 0.8 });
    // Plaster: a faint tooth so the light has something to rake across.
    const plaster = noise(512, (g, r) => {
      g.fillStyle = '#d3cabb'; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 9000; i++) { const v = r() < 0.5 ? 255 : 120; g.fillStyle = `rgba(${v},${v - 6},${v - 14},0.035)`; const w = 1 + r() * 3; g.fillRect(r() * 512, r() * 512, w, w); }
    }, 6);
    plaster.colorSpace = THREE.SRGBColorSpace;
    const wall = new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.95, envMapIntensity: 0.04 });
    const floorTex = noise(512, (g, r) => {
      g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 5000; i++) { const v = Math.floor(r() * 255); g.fillStyle = `rgba(${v},${v},${v},0.08)`; g.fillRect(r() * 512, r() * 512, 2 + r() * 20, 1 + r() * 3); }
    }, 5);
    const floor = new THREE.MeshStandardMaterial({ color: '#2a2621', roughness: 0.62, roughnessMap: floorTex, metalness: 0, envMapIntensity: 0.12 });
    const plinth = new THREE.MeshStandardMaterial({ color: '#cfc7b9', roughness: 0.88, envMapIntensity: 0.08 });
    return { bronze, steel, wall, floor, plinth };
  }, []);
}

function Room() {
  const m = useMaterials();
  const s = useMemo(() => buildSculpture(), []);
  const turn = useRef<THREE.Group>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const mats = useMemo(() => s.pieces.map(() => m.bronze.clone()), [s, m]);
  const phone = isPhone();
  const { camera, scene } = useThree();
  const t0 = useRef(-1);
  const look = useRef(new THREE.Vector3());
  const push = useRef(0);

  const plinthH = s.top;
  const plinthGeo = useMemo(() => new RoundedBoxGeometry(1.75, plinthH, 1.75, 3, 0.025), [plinthH]);
  const rods = useMemo(() => s.rods.map((r) => {
    const len = r.a.distanceTo(r.b), mid = r.a.clone().add(r.b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), r.b.clone().sub(r.a).normalize());
    return { len, mid, q, r: r.r, shadow: r.shadow };
  }), [s]);

  useLayoutEffect(() => {
    if (spot.current) { spot.current.target.position.copy(WALL); spot.current.target.updateMatrixWorld(); scene.add(spot.current.target); }
  }, [scene]);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    const now = state.clock.elapsedTime;
    if (t0.current < 0) t0.current = now;
    const age = now - t0.current;

    // The turn: scroll plus hand, pulled into the mark when it comes close.
    if (!st.dragging && Math.abs(st.uv) > 0.0005) { st.user += st.uv * dt; st.uv *= Math.exp(-3.2 * dt); }
    const tgt = st.base + st.user;
    const { k, d } = nearest(tgt);
    const goal = Math.abs(d) < SNAP ? k * Math.PI * 2 : tgt;
    if (still) { st.angle = goal; st.av = 0; }
    else {
      const acc = (goal - st.angle) * 70 - st.av * 11.5;
      st.av += acc * dt; st.angle += st.av * dt;
    }
    const n = nearest(st.angle);
    const on = Math.abs(n.d) < 0.006 && Math.abs(st.av) < 0.08;
    if (on !== st.resolved) { st.resolved = on; if (on) st.pulse = 1; st.onResolve?.(on); }
    if (turn.current) turn.current.rotation.y = st.angle;

    // The light comes up once, then breathes harder for a moment when the mark appears.
    st.pulse = Math.max(0, st.pulse - dt * 0.9);
    const up = still ? 1 : clamp((age - 0.25) / 1.6);
    const flick = age < 0.6 ? (Math.sin(age * 60) > 0.2 ? 0.25 : 0) : 0;
    if (spot.current) spot.current.intensity = 820 * (up * up * (3 - 2 * up) + flick * (1 - up)) * (1 + 0.14 * st.pulse * st.pulse);

    // Hot bar: the drive item under the pointer warms its bar.
    mats.forEach((mm, i) => { mm.emissiveIntensity = damp(mm.emissiveIntensity, st.hot === i ? 0.32 : 0, 8, dt); });

    // Camera: a long lens, slightly off the light's axis; it steps aside for the reading column.
    const side = st.side;
    const px = still ? 0 : st.px, py = still ? 0 : st.py;
    // When the mark lands, the camera leans in a little, as if you stepped closer to look.
    push.current = still ? 0 : damp(push.current, st.resolved ? 1 : 0, 1.4, dt);
    const lean = push.current;
    if (phone) {
      camera.position.set(-0.4 + px * 0.25, 3.6 + py * 0.15, 23.5 - lean * 0.9);
      look.current.set(-1.25, 4.0, 2.6);
    } else {
      camera.position.set(-2.3 - side * 1.0 + px * 0.4, 3.3 + py * 0.2, 24 + side * 5 - lean * 1.1);
      look.current.set(-5.3 - side * 1.7, 3.0, 0);
    }
    camera.lookAt(look.current);
  });

  const lw = phone ? 1024 : 2048;
  return (
    <>
      <color attach="background" args={['#0c0b0a']} />
      <hemisphereLight args={['#5b5147', '#0c0b0a', 0.06]} />
      <directionalLight position={[7, 7, -1]} intensity={0.35} color="#9fb0c4" />
      <spotLight ref={spot} position={LIGHT.toArray()} angle={0.36} penumbra={0.7} decay={2} intensity={0} color="#ffe9cc" castShadow
        shadow-mapSize-width={lw} shadow-mapSize-height={lw} shadow-bias={-0.00025} shadow-normalBias={0.012} shadow-camera-near={3} shadow-camera-far={26} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#ffd9b0" position={[-7, 3, 10]} scale={[5, 3, 1]} target={[0, 2, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[0, 9, 4]} scale={[14, 1, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={0.35} color="#a8b6c8" position={[8, 3, 2]} scale={[4, 6, 1]} target={[0, 2, 0]} />
      </Environment>

      <mesh material={m.wall} position={[0, 10, 0]} receiveShadow><planeGeometry args={[70, 20]} /></mesh>
      <mesh material={m.floor} rotation-x={-Math.PI / 2} position={[0, 0, 15]} receiveShadow><planeGeometry args={[70, 30]} /></mesh>
      <mesh material={m.plinth} geometry={plinthGeo} position={[s.centre.x, plinthH / 2, s.centre.z]} castShadow receiveShadow />

      <group position={[s.centre.x, 0, s.centre.z]}>
        <group ref={turn}>
          <group position={[-s.centre.x, 0, -s.centre.z]}>
            {s.pieces.map((p, i) => <mesh key={i} geometry={p.geo} material={mats[i]} castShadow receiveShadow />)}
            {rods.map((r, i) => (
              <mesh key={`r${i}`} position={r.mid} quaternion={r.q} material={m.steel} castShadow={r.shadow}>
                <cylinderGeometry args={[r.r, r.r, r.len, 10]} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </>
  );
}

export default function Stage() {
  const phone = isPhone();
  return (
    <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={phone ? [1, 1.5] : [1, 1.6]} gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: phone ? 31 : 25, near: 0.5, far: 80, position: [-2.3, 3.3, 24] }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}>
      <Room />
    </Canvas>
  );
}
