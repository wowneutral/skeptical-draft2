// The stage: a plaster head in the dark under one lamp the visitor holds,
// printed through the Bayer dither. Scroll moves it between poses that the
// page marks out with [data-p] keys; a white question mark sits on the eyes
// until the page tells it to fall.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import MARKS from '@/lib/marks.json';
import { scroll } from '@/lib/scroll';
import { clamp, damp, isPhone, lerp, smooth, still } from '@/lib/utils';
import { DitherFX } from './DitherFX';
import { markShapes } from './mark';
import { stage } from './state';

const BASE = import.meta.env.BASE_URL;
type Key = { y: number; x: number; h: number; ry: number; s: number };
const keys: { list: Key[] } = { list: [] };

function readKeys() {
  const phone = isPhone();
  const list: Key[] = [];
  document.querySelectorAll<HTMLElement>('.v-dither [data-p]').forEach((el) => {
    const raw = (phone && el.dataset.m) || el.dataset.p!;
    const [x, h, ry, s] = raw.split(',').map(Number);
    list.push({ y: el.getBoundingClientRect().top + window.scrollY, x, h, ry, s });
  });
  list.sort((a, b) => a.y - b.y);
  keys.list = list;
}

function poseAt(y: number): Key {
  const L = keys.list;
  if (!L.length) return { y, x: 0.3, h: 0, ry: 0, s: 1 };
  if (y <= L[0].y) return L[0];
  for (let i = 0; i < L.length - 1; i++) {
    const a = L[i], b = L[i + 1];
    if (y <= b.y) {
      const t = smooth(clamp((y - a.y) / Math.max(1, b.y - a.y)));
      return { y, x: lerp(a.x, b.x, t), h: lerp(a.h, b.h, t), ry: lerp(a.ry, b.ry, t), s: lerp(a.s, b.s, t) };
    }
  }
  return L[L.length - 1];
}

function useHeadGeometry() {
  const { scene } = useGLTF(`${BASE}models/head.glb`);
  return useMemo(() => {
    let g: THREE.BufferGeometry | undefined;
    scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && !g) g = (o as THREE.Mesh).geometry; });
    const geo = g!.clone();
    geo.computeBoundingBox();
    const box = geo.boundingBox!, c = box.getCenter(new THREE.Vector3()), k = 2.7 / (box.max.y - box.min.y);
    geo.translate(-c.x, -c.y, -c.z); geo.scale(k, k, k);
    // Find the front of the face at eye height, so the censor sits on it.
    const pos = geo.attributes.position as THREE.BufferAttribute;
    let front = 0.9;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (Math.abs(x) < 0.45 && y > 0.36 && y < 0.56 && z > front) front = z;
    }
    return { geo, front };
  }, [scene]);
}

function Censor({ front }: { front: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const m = MARKS.italic;
    const shapes = markShapes(m.d);
    const g = new THREE.ExtrudeGeometry(shapes, { depth: 60, bevelEnabled: false, curveSegments: 10 });
    g.computeBoundingBox();
    const c = g.boundingBox!.getCenter(new THREE.Vector3());
    g.translate(-c.x, -c.y, -c.z);
    const k = 2.1 / (g.boundingBox!.max.y - g.boundingBox!.min.y);
    g.scale(k, -k, k);
    return g;
  }, []);
  useFrame(() => {
    const m = ref.current; if (!m) return;
    const c = stage.censor;
    m.visible = c < 0.999;
    m.position.set(0.03 + c * 0.25, -0.4 - c * c * 7.5 + Math.sin(c * Math.PI) * 0.15, front + 0.2 + c * 0.6);
    m.rotation.set(c * 1.1, c * 0.5, -0.06 + c * c * 2.2);
  });
  return (
    <mesh ref={ref} geometry={geo} renderOrder={10}>
      <meshBasicMaterial color="#ffffff" toneMapped={false} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

function Head({ shadows }: { shadows: boolean }) {
  const { geo, front } = useHeadGeometry();
  const normal = useTexture(`${BASE}models/head-normal.jpg`);
  useMemo(() => { normal.flipY = false; normal.needsUpdate = true; }, [normal]);
  const group = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.SpotLight>(null);
  const { viewport, camera, size } = useThree();
  const cur = useRef({ x: 0.3, h: 0, ry: 0, s: 1, lx: 0.62, ly: 0.32 });
  useEffect(() => { stage.ready = true; }, []);
  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, dtRaw), t = state.clock.elapsedTime, g = group.current; if (!g) return;
    const p = poseAt(scroll.y + window.innerHeight * 0.5);
    const c = cur.current, k = still ? 1 : 1 - Math.exp(-4 * dt);
    c.x = lerp(c.x, p.x, k); c.h = lerp(c.h, p.h, k); c.ry = lerp(c.ry, p.ry, k); c.s = lerp(c.s, p.s, k);
    const v = viewport.getCurrentViewport(camera, new THREE.Vector3(0, 0, 0));
    const sway = still ? 0 : Math.sin(t * 0.21) * 0.22 + Math.sin(t * 0.13) * 0.08;
    g.position.set(c.x * v.width * 0.5, c.h * v.height * 0.5, 0);
    g.rotation.set(0.04, c.ry + sway, 0);
    const base = Math.min(1, (v.height / 2.9));
    g.scale.setScalar(c.s * base * 0.98);
    // The lamp: the pointer, or a slow drift until someone takes it.
    let tx = stage.lx, ty = stage.ly;
    if (!stage.touched && !still) { tx = 0.55 + Math.sin(t * 0.33) * 0.32; ty = 0.3 + Math.sin(t * 0.27 + 1) * 0.16; }
    c.lx = still ? tx : damp(c.lx, tx, 5, dt); c.ly = still ? ty : damp(c.ly, ty, 5, dt);
    const L = lamp.current;
    if (L) {
      L.position.set((c.lx - 0.5) * v.width * 1.4 + g.position.x * 0.3, (0.5 - c.ly) * v.height * 1.6 + 0.6, 5.2);
      L.target.position.copy(g.position);
      L.target.updateMatrixWorld();
    }
    void size;
  });
  return (
    <>
      <spotLight ref={lamp} intensity={3.4} decay={0} angle={0.42} penumbra={0.9} castShadow={shadows}
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.025} />
      <directionalLight position={[-4, 2.5, -5]} intensity={0.9} />
      <ambientLight intensity={0.035} />
      <group ref={group}>
        <mesh geometry={geo} castShadow={shadows} receiveShadow={shadows}>
          <meshStandardMaterial color="#d9d4c8" roughness={0.58} metalness={0} normalMap={normal} normalScale={new THREE.Vector2(0.9, 0.9)} />
        </mesh>
        <Censor front={front} />
      </group>
    </>
  );
}

function Print() {
  const fx = useMemo(() => new DitherFX(), []);
  const { viewport } = useThree();
  useFrame(() => {
    const dpr = viewport.dpr, fine = Math.max(2, Math.round((isPhone() ? 1.5 : 2) * dpr));
    const e = stage.end;
    const cell = Math.max(fine, Math.round(lerp(stage.cell * dpr, 44 * dpr, e * e)));
    fx.uniforms.get('uCell')!.value = cell;
    fx.uniforms.get('uFade')!.value = smooth(clamp((e - 0.55) / 0.45));
    fx.uniforms.get('uGain')!.value = 1.0;
  });
  return <primitive object={fx} dispose={null} />;
}

export default function Scene() {
  const phone = isPhone();
  useEffect(() => {
    readKeys();
    const t1 = setTimeout(readKeys, 600), t2 = setTimeout(readKeys, 2000);
    const ro = new ResizeObserver(() => readKeys());
    const root = document.querySelector('.v-dither'); if (root) ro.observe(root);
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && e.type === 'pointermove') return;
      stage.lx = e.clientX / window.innerWidth; stage.ly = e.clientY / window.innerHeight; stage.touched = true;
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });
    return () => { clearTimeout(t1); clearTimeout(t2); ro.disconnect(); window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', move); };
  }, []);
  return (
    <Canvas
      dpr={[1, phone ? 1.5 : 1.6]}
      shadows={phone ? false : { type: THREE.PCFShadowMap }}
      camera={{ fov: 24, near: 0.1, far: 40, position: [0, 0.1, 9] }}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      frameloop={still ? 'demand' : 'always'}
    >
      <color attach="background" args={['#000000']} />
      <Suspense fallback={null}>
        <Head shadows={!phone} />
      </Suspense>
      <EffectComposer multisampling={0}>
        <Print />
      </EffectComposer>
    </Canvas>
  );
}
useGLTF.preload(`${BASE}models/head.glb`);
