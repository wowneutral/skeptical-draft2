// The museum model: a plaster temple front on a pale stone sweep, one soft key
// light from high left. The camera walks round it with the scroll; a drag turns
// it further; a pressed column makes the prop behind it give.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';
import { damp, isPhone, still } from '@/lib/utils';
import { poseAt, store, type Pose } from './store';
import {
  ABA, ARCH, BACK, COLH, COLS, CORN, ECH, FRIEZE, PED_H, SHAFT, STEP, TOP, Y0, YE, YP,
  echinusGeo, pedimentShapes, shaftGeo, surfaceMaps,
} from './geo';

export const BG = '#d8d5cd';
const D2R = Math.PI / 180;
const FOV = 15;
const STILL: Pose = { yaw: 48, el: 6, zoom: 1.04 };
const TARGET = new THREE.Vector3(0, TOP * 0.47, -0.2);

type Mats = { plaster: THREE.MeshStandardMaterial; shade: THREE.MeshStandardMaterial; back: THREE.MeshStandardMaterial; steel: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial };

function useMats(): Mats {
  return useMemo(() => {
    const cast = surfaceMaps(256, 11, 5, 260);
    cast.normal.repeat.set(2, 2); cast.rough.repeat.set(2, 2);
    const plaster = new THREE.MeshStandardMaterial({ color: '#f7f4ee', roughness: 0.9, roughnessMap: cast.rough, normalMap: cast.normal, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 0.6 });
    // The wall behind the colonnade is painted in shadow: the oldest trick of a flat.
    const shade = plaster.clone(); shade.color = new THREE.Color('#8e897f'); shade.envMapIntensity = 0.35;
    const back = new THREE.MeshStandardMaterial({ color: '#cfcac0', roughness: 0.97, normalMap: cast.normal, normalScale: new THREE.Vector2(0.6, 0.6) });
    const steel = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.38, metalness: 0.85, envMapIntensity: 1.2 });
    const ground = surfaceMaps(512, 5, 3, 900);
    ground.normal.repeat.set(26, 26); ground.rough.repeat.set(26, 26);
    const stone = new THREE.MeshStandardMaterial({ color: '#d6d2c8', roughness: 0.96, roughnessMap: ground.rough, normalMap: ground.normal, normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 0.3 });
    return { plaster, shade, back, steel, stone };
  }, []);
}

const Cast = (p: { m: THREE.Material; pos: [number, number, number]; size: [number, number, number]; r?: number }) => (
  <RoundedBox args={p.size} radius={p.r ?? 0.012} smoothness={3} position={p.pos} material={p.m} castShadow receiveShadow />
);

/** Box spanning z from z0 to z1 at a given x centre, y bottom, width and height. */
const slab = (x: number, y: number, w: number, h: number, z0: number, z1: number) => ({ pos: [x, y + h / 2, (z0 + z1) / 2] as [number, number, number], size: [w, h, z1 - z0] as [number, number, number] });

function Front({ mats }: { mats: Mats }) {
  const shaft = useMemo(() => shaftGeo(isPhone() ? 100 : 160, isPhone() ? 24 : 40), []);
  const ech = useMemo(() => echinusGeo(), []);
  const ped = useMemo(() => {
    const { ring, tym } = pedimentShapes();
    const r = new THREE.ExtrudeGeometry(ring, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 1 });
    const t = new THREE.ExtrudeGeometry(tym, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
    return { r, t };
  }, []);
  const hit = (i: number) => ({
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); store.hover = i; document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { if (store.hover === i) store.hover = -1; document.body.style.cursor = ''; },
    onPointerDown: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); store.hover = i; },
  });
  const W = 5.92;
  return (
    <group>
      {/* Three steps, each set a little forward of the one above. */}
      <Cast m={mats.plaster} {...slab(0, 0, 6.6, STEP, BACK, 0.17)} r={0.014} />
      <Cast m={mats.plaster} {...slab(0, STEP, 6.3, STEP, BACK, 0.11)} r={0.014} />
      <Cast m={mats.plaster} {...slab(0, STEP * 2, 6.0, STEP, BACK, 0.055)} r={0.014} />
      {/* The wall behind the columns: one thin board, painted dark on its face. */}
      <mesh position={[0, Y0 + COLH / 2, BACK / 2 - 0.004]} castShadow receiveShadow material={[mats.back, mats.back, mats.back, mats.back, mats.shade, mats.back]}>
        <boxGeometry args={[W - 0.2, COLH, -BACK - 0.008]} />
      </mesh>
      {COLS.map((x, i) => (
        <group key={i} position={[x, Y0, 0]} {...hit(i)}>
          <mesh geometry={shaft} material={mats.plaster} castShadow receiveShadow />
          <mesh geometry={ech} material={mats.plaster} castShadow receiveShadow />
          <Cast m={mats.plaster} pos={[0, SHAFT + ECH + ABA / 2, 0.012]} size={[0.68, ABA, 0.06]} r={0.01} />
        </group>
      ))}
      {/* Entablature: architrave, frieze with triglyphs, cornice. */}
      <Cast m={mats.plaster} {...slab(0, YE, W, ARCH, BACK, 0.042)} r={0.012} />
      <Cast m={mats.plaster} {...slab(0, YE + ARCH - 0.04, W + 0.06, 0.05, BACK, 0.058)} r={0.01} />
      <Cast m={mats.plaster} {...slab(0, YE + ARCH, W - 0.04, FRIEZE, BACK, 0.02)} r={0.008} />
      {Array.from({ length: 11 }, (_, k) => -2.5 + k * 0.5).map((x) => (
        <group key={x} position={[x, YE + ARCH + FRIEZE / 2, 0.02]}>
          <Cast m={mats.plaster} pos={[0, 0, 0.014]} size={[0.27, FRIEZE - 0.02, 0.028]} r={0.006} />
          {[-0.045, 0.045].map((g) => <mesh key={g} position={[g, 0, 0.0285]} material={mats.shade}><boxGeometry args={[0.03, FRIEZE - 0.07, 0.002]} /></mesh>)}
        </group>
      ))}
      <Cast m={mats.plaster} {...slab(0, YE + ARCH + FRIEZE, 6.05, 0.06, BACK, 0.05)} r={0.01} />
      <Cast m={mats.plaster} {...slab(0, YE + ARCH + FRIEZE + 0.06, 6.22, CORN - 0.06, BACK, 0.095)} r={0.016} />
      {/* Pediment: a raking cornice round a recessed tympanum. */}
      <mesh geometry={ped.r} material={mats.plaster} position={[0, YP, BACK + 0.02]} castShadow receiveShadow />
      <mesh geometry={ped.t} material={mats.plaster} position={[0, YP, BACK + 0.005]} castShadow receiveShadow />
      {/* The back of the flat: black steel walers bolted across it. */}
      {[Y0 + 0.9, YE - 0.2, YE + ARCH + FRIEZE * 0.6].map((y) => (
        <mesh key={y} position={[0, y, BACK - 0.03]} material={mats.steel} castShadow>
          <boxGeometry args={[W - 0.3, 0.07, 0.035]} />
        </mesh>
      ))}
      {/* Invisible hit areas so a column is easy to press. */}
      {COLS.map((x, i) => (
        <mesh key={'h' + i} position={[x, Y0 + COLH / 2, 0.06]} {...hit(i)} visible={false}>
          <boxGeometry args={[0.62, COLH, 0.04]} />
        </mesh>
      ))}
    </group>
  );
}

const PROP_TOP = YE - 0.2, PROP_FOOT = -2.05;
const Z = new THREE.Vector3(0, 0, 1);
/** Props told to give, passed from the front's sway to the props. */
const gave: number[] = [];

function Props({ mats, sway }: { mats: Mats; sway: React.RefObject<THREE.Group | null> }) {
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  const feet = useRef<(THREE.Group | null)[]>([]);
  const kick = useRef<(THREE.Mesh | null)[]>([]);
  const slip = useRef(COLS.map(() => ({ s: 0, v: 0 })));
  const tmp = useMemo(() => ({ top: new THREE.Vector3(), foot: new THREE.Vector3(), d: new THREE.Vector3(), base: new THREE.Vector3() }), []);
  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const g = sway.current; if (!g) return;
    g.updateMatrixWorld();
    COLS.forEach((x, i) => {
      const sl = slip.current[i];
      // A slipped prop is pushed back into its seat by the weight of the front.
      sl.v += (-38 * sl.s - 5.5 * sl.v) * dt; sl.s += sl.v * dt;
      if (sl.s < 0) { sl.s = 0; sl.v *= -0.25; }
      const s = sl.s;
      tmp.top.set(x, PROP_TOP - s * 0.06, BACK - 0.06).applyMatrix4(g.matrixWorld);
      tmp.foot.set(x, 0.045, PROP_FOOT - s * 0.38);
      tmp.d.subVectors(tmp.top, tmp.foot);
      const len = tmp.d.length();
      const b = bars.current[i];
      if (b) { b.position.addVectors(tmp.top, tmp.foot).multiplyScalar(0.5); b.quaternion.setFromUnitVectors(Z, tmp.d.normalize()); b.scale.set(1, 1, len); }
      const f = feet.current[i]; if (f) f.position.set(x, 0, PROP_FOOT - s * 0.38);
      const k = kick.current[i];
      if (k) {
        tmp.base.set(x, 0.05, BACK - 0.02).applyMatrix4(g.matrixWorld);
        tmp.d.subVectors(tmp.base, tmp.foot); const l2 = tmp.d.length();
        k.position.addVectors(tmp.base, tmp.foot).multiplyScalar(0.5); k.quaternion.setFromUnitVectors(Z, tmp.d.normalize()); k.scale.set(1, 1, l2);
      }
    });
    while (gave.length) slip.current[gave.shift()!].v += 5.2;
  });
  return (
    <group>
      {COLS.map((x, i) => (
        <group key={i}>
          <mesh ref={(m) => { bars.current[i] = m; }} material={mats.steel} castShadow><boxGeometry args={[0.034, 0.034, 1]} /></mesh>
          <mesh ref={(m) => { kick.current[i] = m; }} material={mats.steel} castShadow><boxGeometry args={[0.026, 0.026, 1]} /></mesh>
          <group ref={(m) => { feet.current[i] = m; }} position={[x, 0, PROP_FOOT]}>
            <mesh position={[0, 0.008, 0]} material={mats.steel} castShadow receiveShadow><boxGeometry args={[0.22, 0.016, 0.26]} /></mesh>
            {[-0.07, 0.07].map((b) => <mesh key={b} position={[b, 0.02, 0.07]} material={mats.steel}><cylinderGeometry args={[0.014, 0.014, 0.02, 8]} /></mesh>)}
          </group>
        </group>
      ))}
    </group>
  );
}

function Model({ mats }: { mats: Mats }) {
  const sway = useRef<THREE.Group>(null);
  const st = useRef({ lean: 0, lv: 0, roll: 0, rv: 0 });
  useFrame((_, dtRaw) => {
    const dt = Math.min(0.04, dtRaw);
    const s = st.current;
    while (store.knocks.length) {
      const i = store.knocks.shift()!; gave.push(i);
      // The prop gives: the front drops back onto the others, rolling toward the side that lost its support.
      s.lv -= 0.2; s.rv += (COLS[i] >= 0 ? 1 : -1) * (0.08 + Math.abs(COLS[i]) * 0.05);
    }
    const sub = 4, h = dt / sub;
    for (let k = 0; k < sub; k++) {
      s.lv += (-22 * s.lean - 1.9 * s.lv) * h; s.lean += s.lv * h;
      s.rv += (-28 * s.roll - 2.2 * s.rv) * h; s.roll += s.rv * h;
      // Caught: the remaining props stop it hard and it rebounds.
      const stop = -0.055;
      if (s.lean < stop) { s.lean = stop; s.lv = -s.lv * 0.42; }
      if (Math.abs(s.roll) > 0.03) { s.roll = Math.sign(s.roll) * 0.03; s.rv = -s.rv * 0.4; }
    }
    const g = sway.current; if (g) { g.rotation.x = s.lean; g.rotation.z = s.roll; }
  });
  return (
    <>
      <group ref={sway}>
        <Front mats={mats} />
      </group>
      <Props mats={mats} sway={sway} />
    </>
  );
}

function Floor({ mats }: { mats: Mats }) {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow material={mats.stone}>
      <circleGeometry args={[90, 64]} />
    </mesh>
  );
}

function Rig() {
  const { camera, size, scene } = useThree();
  const light = useRef<THREE.DirectionalLight>(null);
  const v = useRef({ yaw: 0, el: 9, zoom: 0.82, t: 0, px: 0, py: 0, drag: 0, inten: 0 });
  const tgt = useMemo(() => new THREE.Object3D(), []);
  useMemo(() => { tgt.position.copy(TARGET); scene.add(tgt); }, [scene, tgt]);
  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const c = v.current;
    c.t += dt;
    const p = still ? STILL : (poseAt(scroll.y) ?? { yaw: 0, el: 3, zoom: 1 });
    // The opening: one slow look round the side, once, to show what it is.
    let hint = 0;
    if (!still && !store.touched) {
      const t = c.t - 2.2;
      if (t > 0 && t < 4.6) hint = 30 * Math.sin(Math.PI * Math.min(1, t / 4.6)) ** 2;
    }
    if (!store.dragging && performance.now() - store.dragAt > 4000) store.drag = damp(store.drag, 0, 0.9, dt);
    // Scrolling on means walking on: a turn made by hand lets go sooner.
    if (!store.dragging && Math.abs(scroll.v) > 0.4) store.drag = damp(store.drag, 0, 2.5, dt);
    c.drag = damp(c.drag, store.drag + hint, store.dragging ? 14 : 3.2, dt);
    const k = still ? 60 : 3.4;
    c.yaw = damp(c.yaw, p.yaw, k, dt);
    c.el = damp(c.el, p.el, still ? 60 : 2.6, dt);
    c.zoom = damp(c.zoom, p.zoom, still ? 60 : 2.2, dt);
    const yaw = (c.yaw + c.drag) * D2R, el = c.el * D2R;
    const A = size.width / Math.max(1, size.height);
    const tn = Math.tan((FOV / 2) * D2R);
    const d = Math.max(3.25 / tn, 3.75 / (tn * A)) / c.zoom;
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(TARGET.x + d * Math.sin(yaw) * Math.cos(el), TARGET.y + d * Math.sin(el), TARGET.z + d * Math.cos(yaw) * Math.cos(el));
    cam.near = d * 0.5; cam.far = d * 4;
    cam.lookAt(TARGET);
    cam.updateProjectionMatrix();
    const f = scene.fog as THREE.Fog | null;
    if (f) { f.near = d + 6; f.far = d + 46; }
    // The key light: high left of the viewer, following the walk round partway; the pointer moves it a little.
    c.px = damp(c.px, still ? 0 : store.px, 2.4, dt); c.py = damp(c.py, still ? 0 : store.py, 2.4, dt);
    const la = (c.yaw * 0.7 - 42 + c.px * 16) * D2R, le = (40 - c.py * 8) * D2R;
    const L = light.current;
    if (L) {
      L.position.set(TARGET.x + 14 * Math.sin(la) * Math.cos(le), 14 * Math.sin(le), TARGET.z + 14 * Math.cos(la) * Math.cos(le));
      c.inten = still ? 1 : damp(c.inten, 1, 1.6, dt);
      L.intensity = 3.5 * c.inten;
    }
  });
  const phone = isPhone();
  return (
    <directionalLight
      ref={light} target={tgt} intensity={0} color="#fff6ea" castShadow
      shadow-mapSize={[phone ? 1024 : 2048, phone ? 1024 : 2048]} shadow-bias={-0.0003} shadow-normalBias={0.012}
      shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-camera-near={2} shadow-camera-far={30}
    />
  );
}

export default function Scene() {
  const phone = isPhone();
  return (
    <Canvas
      dpr={[1, 1.6]}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ fov: FOV, position: [0, 3, 30] }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
      aria-hidden
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 30, 70]} />
      <SceneBody />
      <hemisphereLight args={['#fbf8f1', '#b3ac9f', 0.62]} />
      <directionalLight position={[9, 5, -10]} intensity={0.5} color="#e9edf2" />
      <Environment resolution={64} environmentIntensity={0.5}>
        <Lightformer form="rect" intensity={2.2} color="#fff4e6" position={[-8, 7, 6]} rotation-y={Math.PI / 3} scale={[6, 6, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#eeeeec" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#e4dfd4" position={[0, -1, 0]} rotation-x={-Math.PI / 2} scale={[60, 60, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[8, 3, -8]} rotation-y={-Math.PI * 0.75} scale={[4, 8, 1]} />
      </Environment>
      <Rig />
      <EffectComposer multisampling={phone ? 0 : 4}>
        <N8AO aoRadius={0.4} distanceFalloff={0.5} intensity={phone ? 2.4 : 3} halfRes={phone} color="#2b2720" />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      </EffectComposer>
    </Canvas>
  );
}

function SceneBody() {
  const mats = useMats();
  return (
    <>
      <Model mats={mats} />
      <Floor mats={mats} />
    </>
  );
}

