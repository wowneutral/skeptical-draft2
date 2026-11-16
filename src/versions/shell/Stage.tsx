// The specimen: one chambered shell on an ebony stand under a museum light.
// It parts along its own plane; the camera then walks into the cut half one
// chamber per section, and at Join the halves close and it turns edge on.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { clamp, damp, isPhone, lerp, smooth, still } from '@/lib/utils';
import { buildShell, grainTexture, growthTexture, type Half } from './geo';
import { stage } from './stage';

const BG = '#0b0b0a';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const sstep = (a: number, b: number, x: number) => smooth(clamp((x - a) / (b - a)));

function useMaterials() {
  return useMemo(() => {
    const growth = growthTexture(); growth.repeat.set(1, 1);
    const grain = grainTexture(); grain.repeat.set(3, 1);
    const bone = new THREE.MeshPhysicalMaterial({ color: '#e7dfcf', roughness: 0.74, roughnessMap: growth, bumpMap: growth, bumpScale: 1.9, sheen: 0.25, sheenColor: new THREE.Color('#fff6e8'), sheenRoughness: 0.6, clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 0.45 });
    const nacre = new THREE.MeshPhysicalMaterial({ color: '#d2cabb', roughness: 0.32, sheen: 0.55, sheenColor: new THREE.Color('#f3eee5'), sheenRoughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.18, envMapIntensity: 0.6 });
    const polish = new THREE.MeshPhysicalMaterial({ color: '#f3ede2', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.9 });
    const wall = new THREE.MeshPhysicalMaterial({ color: '#ddd5c6', roughness: 0.36, sheen: 0.4, sheenColor: new THREE.Color('#f5f0e8'), side: THREE.DoubleSide, envMapIntensity: 0.55 });
    const ebony = new THREE.MeshPhysicalMaterial({ color: '#121110', roughness: 0.42, roughnessMap: grain, bumpMap: grain, bumpScale: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.25, envMapIntensity: 0.7 });
    const rod = new THREE.MeshStandardMaterial({ color: '#2a2622', metalness: 0.85, roughness: 0.38 });
    const pearl = new THREE.MeshPhysicalMaterial({ color: '#eee7da', roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.3, envMapIntensity: 1.1 });
    const floor = new THREE.MeshStandardMaterial({ color: '#0e0d0c', roughness: 0.92 });
    return { bone, nacre, polish, wall, ebony, rod, pearl, floor };
  }, []);
}

function HalfMesh({ h, m }: { h: Half; m: ReturnType<typeof useMaterials> }) {
  return (
    <>
      <mesh geometry={h.outer} material={m.bone} castShadow receiveShadow />
      <mesh geometry={h.inner} material={m.nacre} />
      <mesh geometry={h.rim} material={m.polish} receiveShadow />
      <mesh geometry={h.walls} material={m.wall} />
      <mesh geometry={h.edges} material={m.polish} />
    </>
  );
}

type Shot = { pos: THREE.Vector3; look: THREE.Vector3; fov: number };

function Specimen({ phone }: { phone: boolean }) {
  const m = useMaterials();
  const shell = useMemo(() => buildShell(phone), [phone]);
  const { camera, size } = useThree();
  const turn = useRef<THREE.Group>(null), front = useRef<THREE.Group>(null), back = useRef<THREE.Group>(null), key = useRef<THREE.SpotLight>(null), body = useRef<THREE.Group>(null);
  const st = useRef({ yaw: 0.35, vel: 0, open: still ? 1 : 0, ov: 0, lit: still ? 1 : 0, t: 0, look: v3(0, -1.6, 0), fov: 26, cur: null as Shot | null, tilt: 0, lift: 0 });

  // The shell is drawn round the coil's centre; hang it so the stem's end sits above the pearl.
  const cx = (shell.box.min.x + shell.box.max.x) / 2;
  const PR = 0.3, GAP = 0.42;
  const pearlY = shell.aperture.y - GAP - PR;
  const top = pearlY - PR; // the plinth's top
  const rodX = 0.95, rodZ = -0.62;

  const shots = useMemo(() => {
    const ch = shell.chambers;
    const into = (i: number, side: number, dist: number): Shot => {
      const c = ch[clamp(i, 0, ch.length - 1)];
      const at = v3(c.at.x, c.at.y, 0);
      return { pos: at.clone().add(v3(side * c.r * 2.2, c.r * 1.2, c.r * dist)), look: at, fov: 24 };
    };
    const far = phone ? 1.12 : 1;
    const list: Shot[] = [
      { pos: v3(0.4 * far, -0.9, 19 * far), look: v3(0.15, -2.05, 0), fov: 25 },
      { pos: v3(-2.4, 0.2, 14.5 * far), look: v3(0.6, -1.0, 0), fov: 25 },
      into(23, -1, 7.5),
      into(18, 1, 8),
      into(12, -1, 8.5),
      { pos: v3(2.2, -0.7, 18.5 * far), look: v3(0, -2.0, 0), fov: 25 },
      { pos: v3(-1.2, 1.2, 23 * far), look: v3(0, -2.3, 0), fov: 25 },
    ];
    // The seven things in the drive, seven chambers.
    const drive = [24, 22, 20, 18, 16, 14, 12].map((i, k) => into(i, k % 2 ? 1 : -1, 7));
    return { list, drive };
  }, [shell, phone]);

  const tmp = useMemo(() => ({ p: v3(0, 0, 0), l: v3(0, 0, 0) }), []);

  useFrame((state, dt) => {
    dt = Math.min(dt, 1 / 20);
    const s = st.current; s.t += dt;
    const f = still ? 1 : clamp(stage.f, 0, 6);

    // Light comes up over the case like a gallery opening.
    if (!still) s.lit = Math.min(1, s.lit + dt / 2.4);
    const lit = smooth(s.lit);
    const dusk = sstep(5.25, 5.95, f);
    if (key.current) { key.current.intensity = 520 * lit * (1 - 0.4 * dusk); key.current.angle = 0.42 - 0.13 * dusk; }
    stage.lit = s.lit > 0.98;

    // Open: pressed, or scrolled past the first screen; closed again at Join.
    const want = still ? 1 : Math.max(stage.open && f < 0.6 ? 1 : 0, sstep(0.2, 0.75, f)) * (1 - sstep(4.35, 4.95, f));
    // A spring with a little overshoot, so the halves have weight.
    s.ov += ((want - s.open) * 90 - s.ov * 13) * dt;
    s.open += s.ov * dt;
    const o = s.open;
    if (front.current) {
      front.current.position.set(2.7 * o, 0.25 * Math.sin(Math.PI * clamp(o)) , 1.15 * o);
      front.current.rotation.set(0, 2.15 * o, 0);
    }
    if (back.current) back.current.position.set(-0.25 * o, 0, -0.12 * o);

    // Turning: the drag, then inertia; past the first screen it settles on the cut side, at Join it shows the edge.
    if (!still) {
      s.vel += stage.push; stage.push = 0;
      s.vel += stage.nudge; stage.nudge = 0;
      s.yaw += s.vel * dt * 60; s.vel *= Math.pow(0.9, dt * 60);
      if (!stage.dragging) {
        const edge = sstep(4.4, 5, f);
        const base = f < 0.25 && !stage.open ? null : edge > 0 ? Math.PI / 2 * edge : 0;
        if (base !== null) {
          const k = Math.round((s.yaw - base) / (Math.PI * 2)) * Math.PI * 2;
          s.yaw = damp(s.yaw, base + k, 2.6, dt);
        }
      }
    } else s.yaw = 0;
    if (turn.current) {
      turn.current.rotation.y = s.yaw;
      s.tilt = damp(s.tilt, still ? 0 : stage.py * 0.05, 3, dt);
      turn.current.rotation.x = s.tilt;
    }
    if (body.current) { s.lift = still ? 1 : damp(s.lift, 1, 1.6, dt); body.current.position.y = (1 - s.lift) * -0.35; }

    // Camera: from shot to shot as the page scrolls, or to a drive item's chamber.
    const i = Math.floor(clamp(f, 0, 5.999)), u = sstep(0.25, 0.85, f - i);
    const a = shots.list[i], b = shots.list[Math.min(6, i + 1)];
    tmp.p.lerpVectors(a.pos, b.pos, u); tmp.l.lerpVectors(a.look, b.look, u);
    let fov = lerp(a.fov, b.fov, u);
    if (stage.focus >= 0 && f > 2.6 && f < 3.97) { const d = shots.drive[stage.focus]; tmp.p.copy(d.pos); tmp.l.copy(d.look); fov = d.fov; }
    // A breath of movement, never a spin.
    if (!still) { tmp.p.x += Math.sin(s.t * 0.21) * 0.08 + stage.px * 0.18; tmp.p.y += Math.sin(s.t * 0.17) * 0.05; }
    const k = still ? 1 : 1 - Math.exp(-2.2 * dt);
    if (!s.cur) { camera.position.copy(tmp.p); s.look.copy(tmp.l); }
    camera.position.lerp(tmp.p, s.cur ? k : 1); s.look.lerp(tmp.l, s.cur ? k : 1);
    s.cur = a;
    const cam = camera as THREE.PerspectiveCamera;
    s.fov = lerp(s.fov, fov, k);
    // Keep the whole shell in a narrow frame on a phone.
    cam.fov = s.fov * (size.width / size.height < 0.8 ? 1.18 : 1);
    cam.updateProjectionMatrix();
    camera.lookAt(s.look);
  });

  return (
    <>
      <spotLight ref={key} position={[1.2, 9.5, 3.4]} angle={0.42} penumbra={0.85} intensity={0} decay={2} color="#fff4e2" castShadow
        shadow-mapSize-width={phone ? 1024 : 2048} shadow-mapSize-height={phone ? 1024 : 2048} shadow-bias={-0.0006} shadow-normalBias={0.045} shadow-radius={6} target-position={[0, -2, 0]} />
      <directionalLight position={[-6, 2.5, -7]} intensity={1.5} color="#e8eef5" />
      <directionalLight position={[6, -1, -4]} intensity={0.35} color="#fff1dc" />
      <hemisphereLight args={['#2a2723', '#050505', 0.35]} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#fff6e8" position={[0, 6, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#e9eef4" position={[-6, 1, -3]} rotation={[0, Math.PI / 2.5, 0]} scale={[1.2, 7, 1]} />
        <Lightformer form="rect" intensity={0.25} color="#ffffff" position={[5, 0, 4]} rotation={[0, -Math.PI / 3, 0]} scale={[2, 4, 1]} />
      </Environment>

      <group ref={body}>
        {/* The shell turns on its rod. */}
        <group position={[rodX, 0, rodZ]}>
          <group ref={turn}>
            <group position={[-rodX - cx * 0, 0, -rodZ]}>
              <group ref={back}><HalfMesh h={shell.back} m={m} /></group>
              <group ref={front}><HalfMesh h={shell.front} m={m} /></group>
            </group>
          </group>
        </group>
      </group>
      {/* The rod and its little cradle. */}
      <mesh position={[rodX, (top + -1.2) / 2, rodZ]} material={m.rod} castShadow>
        <cylinderGeometry args={[0.035, 0.035, -1.2 - top, 12]} />
      </mesh>
      {/* The pearl: the dot of the question. */}
      <mesh position={[shell.aperture.x, pearlY, 0.05]} material={m.pearl} castShadow receiveShadow>
        <sphereGeometry args={[PR, 48, 32]} />
      </mesh>
      {/* The stand: an ebony plinth, softly bevelled. */}
      <Plinth y={top} m={m} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, top - 1.1, 0]} material={m.floor} receiveShadow>
        <planeGeometry args={[60, 60]} />
      </mesh>
      <fog attach="fog" args={[BG, 22, 40]} />
    </>
  );
}

function Plinth({ y, m }: { y: number; m: ReturnType<typeof useMaterials> }) {
  const geo = useMemo(() => {
    const R = 1.85, H = 1.1, b = 0.05;
    const pts = [
      new THREE.Vector2(R - b, 0), new THREE.Vector2(R, -b), new THREE.Vector2(R, -H + 0.16),
      new THREE.Vector2(R + 0.08, -H + 0.12), new THREE.Vector2(R + 0.08, -H),
    ];
    const g = new THREE.LatheGeometry(pts, 96); g.computeVertexNormals(); return g;
  }, []);
  return (
    <group position={[0.1, y, 0]}>
      <mesh geometry={geo} material={m.ebony} castShadow receiveShadow />
      {/* The top: a flat disc, so the light pools cleanly where the pearl sits. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={m.ebony} receiveShadow><circleGeometry args={[1.8, 96]} /></mesh>
    </group>
  );
}

export default function Stage() {
  const phone = isPhone();
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} dpr={[1, phone ? 1.4 : 1.6]} camera={{ fov: 25, near: 0.05, far: 80, position: [0, -0.4, 17.5] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }} frameloop={still ? 'demand' : 'always'}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; }}
      style={{ touchAction: 'pan-y' }}
    >
      <color attach="background" args={[BG]} />
      <Specimen phone={phone} />
    </Canvas>
  );
}
