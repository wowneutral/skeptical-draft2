// Version 1's stage: a chrome head under studio softboxes, with skin detail
// from the scan's normal map, then dithered as a post-processing pass.
import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, useGLTF, useTexture } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import MARKS from '@/lib/marks.json';
import { coarse, still } from '@/lib/utils';
import { Field } from '@/components/three/Field';
import { Marks } from '@/components/three/Marks';
import { OrbitRig, view } from '@/components/three/OrbitRig';
import { stage } from '@/versions/orbit/stage';
import { DitherEffect } from './DitherEffect';

const MASK = { get x() { return view.mx; }, get y() { return view.my; } };

function HeadModel() {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/head.glb`);
  const normal = useTexture(`${import.meta.env.BASE_URL}models/head-normal.jpg`);
  const geometry = useMemo(() => {
    let g: THREE.BufferGeometry | undefined;
    scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && !g) g = (o as THREE.Mesh).geometry; });
    const geo = g!.clone();
    geo.computeBoundingBox();
    const box = geo.boundingBox!, c = box.getCenter(new THREE.Vector3()), k = 2.7 / (box.max.y - box.min.y);
    geo.translate(-c.x, -c.y, -c.z); geo.scale(k, k, k);
    return geo;
  }, [scene]);
  useMemo(() => { normal.flipY = false; normal.needsUpdate = true; }, [normal]);
  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial color="#e2e2dc" metalness={1} roughness={0.27} normalMap={normal} normalScale={new THREE.Vector2(1.1, 1.1)} envMapIntensity={1.15} />
    </mesh>
  );
}

/** The censor bar from the live site, drawn to a texture and wrapped across the eyes. */
function Band() {
  const band = useMemo(() => {
    const COLS = 20, ROWS = 4, CELL = 56;
    const c = document.createElement('canvas'); c.width = (COLS + 2) * CELL; c.height = (ROWS + 2) * CELL;
    const ctx = c.getContext('2d')!;
    const paths = { italic: new Path2D(MARKS.italic.d), roman: new Path2D(MARKS.roman.d) };
    const scale = (CELL * 0.7) / MARKS.italic.h, TONES = [1, 0.6, 0.3];
    let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    type Tile = { col: number; row: number; fringe: boolean; on: boolean; born: number; next: number; turn: number; flip: boolean; roman: boolean; tone: number; inverse: boolean };
    const tiles: Tile[] = [];
    for (let row = -1; row <= ROWS; row++) for (let col = -1; col <= COLS; col++) {
      const fringe = row < 0 || row >= ROWS || col < 0 || col >= COLS;
      if ((row < 0 || row >= ROWS) && (col < 0 || col >= COLS)) continue;
      tiles.push({ col, row, fringe, on: !fringe || rnd() < 0.3, born: fringe ? 0.55 + rnd() * 0.45 : rnd() * 0.8, next: 0, turn: 0, flip: false, roman: false, tone: 0, inverse: false });
    }
    const roll = (t: Tile) => {
      t.turn = rnd() < 0.62 ? 0 : Math.floor(rnd() * 4); t.flip = rnd() < 0.3; t.roman = rnd() < 0.35;
      const k = rnd(); t.tone = k < 0.55 ? 0 : k < 0.85 ? 1 : 2; t.inverse = rnd() < 0.045;
      if (t.fringe) t.on = rnd() < 0.3;
    };
    tiles.forEach(roll);
    const texture = new THREE.CanvasTexture(c); texture.anisotropy = 8; texture.colorSpace = THREE.SRGBColorSpace;
    let progress = -1, acc = 0;
    const draw = (p: number) => {
      progress = p; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
      for (const t of tiles) {
        if (!t.on || p < t.born) continue;
        const x = (t.col + 1) * CELL, y = (t.row + 1) * CELL;
        ctx.fillStyle = t.inverse ? '#f0f0ec' : '#050505'; ctx.fillRect(x - 0.5, y - 0.5, CELL + 1, CELL + 1);
        ctx.save(); ctx.translate(x + CELL / 2, y + CELL / 2); ctx.rotate((t.turn * Math.PI) / 2); ctx.scale(t.flip ? -scale : scale, scale);
        ctx.fillStyle = t.inverse ? '#050505' : `rgba(240,240,236,${TONES[t.tone]})`; ctx.fill(t.roman ? paths.roman : paths.italic); ctx.restore();
      }
      texture.needsUpdate = true;
    };
    const update = (clock: number, dt: number, show: number) => {
      const p = Math.min(1, Math.max(0, (show - 0.45) / 0.5));
      acc += dt;
      if (acc < 1 / 24 && p === progress) return;
      let dirty = p !== progress;
      if (acc >= 1 / 24) {
        acc = 0;
        if (!still && p > 0) for (const t of tiles) { if (clock < t.next) continue; roll(t); t.next = clock + (0.18 + rnd() * 1.5) * (p < 1 ? 1 / 6 : 1); dirty = true; }
      }
      if (dirty) draw(p);
    };
    return { texture, update };
  }, []);
  useFrame((state, dt) => band.update(state.clock.elapsedTime, dt, stage.reveal));
  return (
    <mesh position={[0, 0.45, 0]} scale={[0.63, 0.31, 0.93]}>
      <cylinderGeometry args={[1, 1, 1, 64, 1, true, -1.15, 2.3]} />
      <meshBasicMaterial map={band.texture} alphaTest={0.5} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

function DitherPass() {
  const { size, viewport } = useThree();
  const { effect, canvas, ctx, texture, ptr } = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 144;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 144);
    const texture = new THREE.CanvasTexture(canvas);
    return { effect: new DitherEffect(texture), canvas, ctx, texture, ptr: { x: -1, y: -1, lx: -1, ly: -1, moved: 0 } };
  }, []);
  useEffect(() => {
    if (coarse || still) { effect.uniforms.get('uTrailOn')!.value = 0; return; }
    const move = (e: PointerEvent) => { ptr.x = e.clientX / window.innerWidth; ptr.y = e.clientY / window.innerHeight; ptr.moved = 1; };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [effect, ptr]);
  useFrame(() => {
    effect.uniforms.get('uReveal')!.value = stage.reveal;
    effect.uniforms.get('uCell')!.value = Math.max(2, Math.round((size.width <= 820 ? 1.5 : 2) * viewport.dpr));
    // The trail heals in about two seconds.
    ctx.fillStyle = 'rgba(0,0,0,0.045)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (ptr.moved && ptr.x >= 0) {
      const x = ptr.x * canvas.width, y = ptr.y * canvas.height;
      const speed = ptr.lx < 0 ? 0 : Math.hypot(x - ptr.lx, y - ptr.ly);
      const r = 14 + Math.min(18, speed * 1.2);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ptr.lx = x; ptr.ly = y; ptr.moved = 0;
    }
    texture.needsUpdate = true;
  });
  return <primitive object={effect} dispose={null} />;
}

export default function HeadScene() {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ fov: 32, near: 0.1, far: 60, position: [3, 0.35, 5.6] }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
      <color attach="background" args={['#050505']} />
      <Field show={stage} />
      <Suspense fallback={null}>
        <HeadModel />
        <Band />
      </Suspense>
      <Marks show={stage} mask={MASK} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#161616']} />
        <Lightformer form="rect" intensity={7} position={[0, 6, 1]} scale={[9, 3, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={4} position={[-6, 1, 2]} scale={[2, 9, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={2.5} position={[6, 0, -2]} scale={[1.4, 9, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="ring" intensity={3} position={[1, 2, 7]} scale={2.4} />
        <Lightformer form="rect" intensity={1.5} position={[0, -5, 0]} scale={[6, 2, 1]} rotation-x={-Math.PI / 2} />
      </Environment>
      <OrbitRig />
      <EffectComposer multisampling={0}>
        <DitherPass />
      </EffectComposer>
    </Canvas>
  );
}
useGLTF.preload(`${import.meta.env.BASE_URL}models/head.glb`);
