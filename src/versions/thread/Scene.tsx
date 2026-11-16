// Version 48's gallery: an iron question mark on one steel wire, a hand's width
// above a pale stone floor, under one hard spot. Pushes are integrated by hand:
// a long pendulum on the wire, a short rocking about the crimp, and a torsion
// spring in the wire itself, all heavily damped.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';
import { clamp, damp, isPhone, lerp, smooth, still } from '@/lib/utils';
import { cast, ironMap, stoneMaps } from './geo';
import { st, type Pose } from './store';

export const BG = '#0b0b0c';
/** Height of the single point the wire hangs from. */
const PIV = 17;
const G = 29.4; // a world unit is about a third of a metre
const LAMP = new THREE.Vector3(2.4, 14.2, 6.2);

const REST: Pose = { az: 0.42, h: 3.4, r: 12.5, ty: 1.75, fov: 24, sx: 0.3, sy: 0, up: 0 };

function poseAt(y: number): Pose {
  const k = st.keys;
  if (!k.length) return REST;
  if (y <= k[0].y) return k[0];
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1];
    if (y <= b.y) {
      const t = smooth(clamp((y - a.y) / Math.max(1, b.y - a.y)));
      const out = {} as Pose;
      (Object.keys(REST) as (keyof Pose)[]).forEach((n) => { out[n] = lerp(a[n], b[n], t); });
      return out;
    }
  }
  return k[k.length - 1];
}

function Floor() {
  const { map, rough } = useMemo(() => stoneMaps(isPhone() ? 512 : 1024), []);
  const mat = useMemo(() => {
    const rep = 80 / 12.8;
    map.repeat.set(rep, rep); rough.repeat.set(rep, rep);
    return new THREE.MeshStandardMaterial({ map, roughnessMap: rough, roughness: 0.9, metalness: 0, envMapIntensity: 0.15 });
  }, [map, rough]);
  useEffect(() => () => { map.dispose(); rough.dispose(); mat.dispose(); }, [map, rough, mat]);
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow material={mat} position={[-1.2, 0, -1.2]}>
      <planeGeometry args={[80, 80]} />
    </mesh>
  );
}

function Ceiling() {
  // The fixing: a plate, a bolt, an eye. Only seen at the very end.
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b8b5ae', metalness: 1, roughness: 0.3 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#141414', metalness: 0, roughness: 0.95 }), []);
  useEffect(() => () => { steel.dispose(); dark.dispose(); }, [steel, dark]);
  return (
    <group>
      <mesh position={[0, PIV + 0.32, 0]} rotation-x={Math.PI / 2} material={dark}><planeGeometry args={[60, 60]} /></mesh>
      <mesh position={[0, PIV + 0.3, 0]} material={steel}><cylinderGeometry args={[0.32, 0.34, 0.04, 48]} /></mesh>
      <mesh position={[0, PIV + 0.16, 0]} material={steel}><cylinderGeometry args={[0.035, 0.035, 0.28, 16]} /></mesh>
      <mesh position={[0, PIV - 0.02, 0]} material={steel}><torusGeometry args={[0.05, 0.012, 10, 28]} /></mesh>
      <pointLight position={[0.6, PIV - 0.6, 0.4]} intensity={2.4} distance={4} decay={2} color="#f3e9d8" />
      {/* the lamp that makes the pool */}
      <group position={LAMP.toArray()} onUpdate={(g) => g.lookAt(0, 0, 0)}>
        <mesh rotation-x={Math.PI / 2} material={dark}><cylinderGeometry args={[0.36, 0.3, 0.9, 32, 1, true]} /></mesh>
        <mesh position={[0, 0, 0.18]}>
          <circleGeometry args={[0.22, 32]} />
          <meshBasicMaterial color="#e6dcc8" />
        </mesh>
      </group>
    </group>
  );
}

function Hanging() {
  const low = useMemo(() => isPhone(), []);
  const C = useMemo(() => cast(low), [low]);
  const tex = useMemo(() => ironMap(512), []);
  const iron = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: '#2b2927', metalness: 0.6, roughness: 0.95, roughnessMap: tex, bumpMap: tex, bumpScale: 1.6,
      clearcoat: 0.18, clearcoatRoughness: 0.55, envMapIntensity: 1.1,
    });
    m.onBeforeCompile = (s) => {
      s.uniforms.uEdge = { value: new THREE.Color('#8c8983') };
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 wear;\nvarying vec3 vWear;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWear = wear;');
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWear;\nuniform vec3 uEdge;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, uEdge, vWear.x);')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.26, vWear.x);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 1.0, vWear.x);');
    };
    return m;
  }, [tex]);
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d6d2ca', metalness: 1, roughness: 0.22 }), []);
  useEffect(() => {
    return () => { C.hook.dispose(); C.dot.dispose(); tex.dispose(); iron.dispose(); steel.dispose(); };
  }, [C, tex, iron, steel]);

  const swing = useRef<THREE.Group>(null), hang = useRef<THREE.Group>(null), rock = useRef<THREE.Group>(null), twist = useRef<THREE.Group>(null);
  const wire = useRef<THREE.Mesh>(null), hook = useRef<THREE.Mesh>(null), dot = useRef<THREE.Mesh>(null);
  const key = useRef<THREE.SpotLight>(null);
  const { camera, scene, size } = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const m = useRef({ sx: 0, sz: 0, vx: 0, vz: 0, rx: 0, rz: 0, wx: 0, wz: 0, tw: 0, vt: 0, settle: 0, born: -1, frame: 0, cur: null as Pose | null });
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), d: new THREE.Vector3(), r: new THREE.Vector3(), cam: new THREE.Vector3(), tgt: new THREE.Vector3(), ndc: new THREE.Vector2() }), []);

  useEffect(() => {
    scene.fog = new THREE.Fog(BG, 13, 36);
    if (key.current) { key.current.target.position.set(0, 0, 0); scene.add(key.current.target); }
    return () => { scene.fog = null; };
  }, [scene]);

  useFrame((state, delta) => {
    const s = m.current, dt = Math.min(0.1, delta);
    const t = state.clock.elapsedTime;
    if (s.born < 0) s.born = t;
    const age = t - s.born;

    // The lamp comes on: a tungsten warm-up, once.
    const on = still ? 1 : clamp((age - 0.35) / 1.5);
    const lamp = on <= 0 ? 0 : 1 - Math.pow(1 - on, 3) * (1 + 0.25 * Math.sin(on * 9));
    if (key.current) key.current.intensity = 4.4 * lamp;
    scene.environmentIntensity = 0.2 + 0.8 * lamp;

    // Join: the swing dies by itself and the wire lets it down to a finger's width.
    s.settle = still ? st.settle : damp(s.settle, st.settle, 1.6, dt);
    const gap = lerp(0.3, 0.06, smooth(s.settle));
    const L = PIV - gap - C.attach.y;

    // Camera: the scroll gives a pose, the crane follows it with weight.
    const want = poseAt(scroll.y);
    if (!s.cur || still) s.cur = { ...want };
    else (Object.keys(want) as (keyof Pose)[]).forEach((n) => { s.cur![n] = damp(s.cur![n], want[n], 2.4, dt); });
    const p = s.cur;
    tmp.cam.set(Math.sin(p.az) * p.r, p.h, Math.cos(p.az) * p.r);
    tmp.tgt.set(0, lerp(p.ty, PIV, p.up), 0);
    camera.position.copy(tmp.cam);
    camera.lookAt(tmp.tgt);
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = p.fov; cam.aspect = size.width / size.height; cam.updateProjectionMatrix();
    cam.projectionMatrix.elements[8] = -p.sx; cam.projectionMatrix.elements[9] = -p.sy;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();

    // Pushes.
    const meshes = [hook.current!, dot.current!].filter(Boolean);
    const give = 1 - 0.8 * smooth(s.settle);
    const push = (pt: THREE.Vector3, dir: THREE.Vector3, k: number) => {
      tmp.d.set(dir.x, 0, dir.z).normalize();
      hang.current!.getWorldPosition(tmp.a);
      tmp.r.subVectors(pt, tmp.a);
      const j = k * give;
      const lin = 0.95 * j;
      s.vx += (tmp.d.x * lin) / L; s.vz += (tmp.d.z * lin) / L;
      const h = clamp(-tmp.r.y / 3, 0, 1.2);
      s.wx += -tmp.d.z * j * 0.42 * h; s.wz += tmp.d.x * j * 0.42 * h;
      s.vt += (tmp.r.z * tmp.d.x - tmp.r.x * tmp.d.z) * j * 2.3;
      st.struck++;
      st.onStrike?.(j);
    };
    if (!still) {
      while (st.strikes.length) {
        const q = st.strikes.shift()!;
        ray.setFromCamera(tmp.ndc.set(q.x, q.y), cam);
        const hit = ray.intersectObjects(meshes, false)[0];
        if (hit) push(hit.point, ray.ray.direction, q.k);
      }
      while (st.nudges.length) {
        const q = st.nudges.shift()!;
        hang.current!.getWorldPosition(tmp.a);
        const fwd = new THREE.Vector3().subVectors(tmp.a, cam.position).setY(0).normalize();
        const right = new THREE.Vector3(fwd.z, 0, -fwd.x).multiplyScalar(-1);
        const at = tmp.a.clone().add(new THREE.Vector3(0, -1.4, 0)).addScaledVector(right, 0.7 * q.side);
        const dir = q.side === 0 ? fwd : fwd.clone().addScaledVector(right, -0.6 * q.side);
        push(at, dir, q.k);
      }
    } else { st.strikes.length = 0; st.nudges.length = 0; }

    // Hover: does the pointer sit on the iron?
    if (++s.frame % 4 === 0 && !still) {
      let over = false;
      if (st.pointer.in) {
        ray.setFromCamera(tmp.ndc.set(st.pointer.x, st.pointer.y), cam);
        over = ray.intersectObjects(meshes, false).length > 0;
      }
      if (over !== st.over) { st.over = over; st.onOver?.(over); }
    }

    // Integrate: swing on the wire, rock about the crimp, twist in the wire.
    if (!still) {
      const ws = Math.sqrt(G / L), wr = 5.4, wt = 2.05;
      const boost = 1 + 7 * smooth(s.settle);
      const zs = 0.16 * boost, zr = 0.24 * boost, zt = 0.1 * boost;
      // air: the faintest drift, gone at Join
      const air = 1 - s.settle;
      const fx = air * 0.00025 * Math.sin(t * 0.37) * Math.sin(t * 0.13 + 1);
      const ft = air * 0.006 * Math.sin(t * 0.21 + 2);
      const n = Math.max(2, Math.ceil(dt * 240)), h = dt / n;
      for (let i = 0; i < n; i++) {
        s.vx += (-ws * ws * (s.sx - fx) - 2 * zs * ws * s.vx) * h;
        s.vz += (-ws * ws * (s.sz - fx * 0.6) - 2 * zs * ws * s.vz) * h;
        s.wx += (-wr * wr * s.rx - 2 * zr * wr * s.wx - 0.3 * s.vz * wr) * h;
        s.wz += (-wr * wr * s.rz - 2 * zr * wr * s.wz + 0.3 * s.vx * wr) * h;
        s.vt += (-wt * wt * (s.tw - ft) - 2 * zt * wt * s.vt) * h;
        s.sx += s.vx * h; s.sz += s.vz * h; s.rx += s.wx * h; s.rz += s.wz * h; s.tw += s.vt * h;
      }
      // it never lands and never wraps the wire
      s.sx = clamp(s.sx, -0.08, 0.08); s.sz = clamp(s.sz, -0.08, 0.08);
      s.rx = clamp(s.rx, -0.09, 0.09); s.rz = clamp(s.rz, -0.09, 0.09);
      s.tw = clamp(s.tw, -2.4, 2.4);
    }
    swing.current!.rotation.set(-s.sz, 0, s.sx);
    hang.current!.position.y = -L;
    rock.current!.rotation.set(s.rx, 0, s.rz);
    twist.current!.rotation.y = s.tw;
    wire.current!.scale.y = L;
    wire.current!.position.y = -L / 2;
  });

  return (
    <>
      <spotLight ref={key} position={LAMP.toArray()} angle={0.27} penumbra={0.42} decay={0} intensity={0} color="#fff3e2" castShadow
        shadow-mapSize-width={low ? 1024 : 2048} shadow-mapSize-height={low ? 1024 : 2048} shadow-bias={-0.0002} shadow-normalBias={0.015}
        shadow-camera-near={8} shadow-camera-far={24} shadow-radius={1.5} />
      <group ref={swing} position={[0, PIV, 0]}>
        <mesh ref={wire} castShadow>
          <cylinderGeometry args={[0.0045, 0.0045, 1, 6, 1, true]} />
          <meshBasicMaterial color="#f2eee6" toneMapped={false} />
        </mesh>
        <group ref={hang}>
          <group ref={rock}>
            <group ref={twist}>
              <mesh material={steel} position={[0, 0.02, 0]}><cylinderGeometry args={[0.022, 0.03, 0.09, 12]} /></mesh>
              <group position={[-C.attach.x, -C.attach.y, 0]}>
                <mesh ref={hook} geometry={C.hook} material={iron} castShadow />
                <mesh ref={dot} geometry={C.dot} material={iron} castShadow />
                <mesh material={steel} position={[C.pin.x, (C.pin.y0 + C.pin.y1) / 2, 0]} castShadow>
                  <cylinderGeometry args={[0.011, 0.011, C.pin.y1 - C.pin.y0, 8]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  );
}

export default function Scene({ onReady }: { onReady?: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 24, near: 0.1, far: 80, position: [5, 3.4, 11.5] }}
      onCreated={({ gl }) => { gl.setClearColor(BG); gl.toneMappingExposure = 1.05; onReady?.(); }}
      style={{ touchAction: 'pan-y' }}
    >
      <ambientLight intensity={0.035} color="#ffffff" />
      <directionalLight position={[-5, 6, -9]} intensity={1.1} color="#dfe6ee" />
      <pointLight position={[0, 0.15, 1.4]} intensity={1.3} distance={5} decay={2} color="#efe6d6" />
      <Environment resolution={256} frames={1} background={false}>
        <Lightformer form="circle" intensity={1.6} color="#e9e0d0" position={[0, -2, 0]} rotation-x={-Math.PI / 2} scale={9} />
        <Lightformer form="circle" intensity={7} color="#fff3e2" position={LAMP.toArray()} scale={1.4} onUpdate={(o) => o.lookAt(0, 0, 0)} />
        <Lightformer form="rect" intensity={1.4} color="#dde4ec" position={[-3, 3, -9]} scale={[14, 1.2, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#e8e2d8" position={[8, 2, 3]} rotation-y={-Math.PI / 2} scale={[2, 6, 1]} />
      </Environment>
      <Floor />
      <Ceiling />
      <Hanging />
    </Canvas>
  );
}
