// The still life: a cone of bone sand on black stone under one low light.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, DepthOfField, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { createNoise3D } from 'simplex-noise';
import { scroll } from '@/lib/scroll';
import { clamp, damp, isPhone, lerp, smooth, still } from '@/lib/utils';
import { Heap, N, SIZE, H, rng, sandMaps, stoneMaps } from './sand';
import { stage } from './stage';

const BG = new THREE.Color('#0b0a09');
const D2R = Math.PI / 180;

/** One row per section: heap scale, camera distance, camera height in degrees, camera turn. */
const STOPS = [
  { s: 1, d: 27, e: 12.5, a: -6 },
  { s: 0.76, d: 22.5, e: 10, a: -2 },
  { s: 0.54, d: 18.5, e: 8, a: 3 },
  { s: 0.36, d: 15, e: 6.5, a: 8 },
  { s: 0.2, d: 11, e: 5, a: 12 },
  { s: 0, d: 2.5, e: 2.2, a: 14 },
];
const GRAIN = 0.046;

function pick(f: number) {
  const i = Math.max(0, Math.min(STOPS.length - 2, Math.floor(f))), t = smooth(clamp(f - i));
  const a = STOPS[i], b = STOPS[i + 1];
  return { s: lerp(a.s, b.s, t), d: lerp(a.d, b.d, t), e: lerp(a.e, b.e, t), a: lerp(a.a, b.a, t) };
}

/** A grain: a rounded, slightly lopsided lump. */
function grainGeometry(detail: number, rough: number, seed: number) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const n3 = createNoise3D(rng(seed)), p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 1 + n3(v.x * 1.1, v.y * 1.1, v.z * 1.1) * rough + n3(v.x * 3, v.y * 3, v.z * 3) * rough * 0.25;
    v.multiplyScalar(k); v.y *= 0.82; v.x *= 1.08;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function Still({ phone }: { phone: boolean }) {
  const { camera, size, gl } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const heap = useMemo(() => new Heap(phone ? 1300 : 2600), [phone]);
  const sand = useMemo(() => sandMaps(phone ? 384 : 512), [phone]);
  const stone = useMemo(() => stoneMaps(512), []);
  const group = useRef<THREE.Group>(null!), mesh = useRef<THREE.Mesh>(null!), grains = useRef<THREE.InstancedMesh>(null!), last = useRef<THREE.Mesh>(null!);
  const key = useRef<THREE.DirectionalLight>(null!), rim = useRef<THREE.DirectionalLight>(null!);
  const focus = useMemo(() => new THREE.Vector3(), []);
  const dof = useRef<any>(null);
  const st = useRef({ f: 0, ox: 0, oy: 0, px: 0, lightA: 100, lightE: 0.5, rev: -1, frame: 0, stroke: [] as { x: number; z: number; dx: number; dz: number }[], fogBase: 0 });

  // The surface as a mesh: a fine grid lifted by the heightfield. Below a hair of sand, it is stone.
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, N - 1, N - 1); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) p.setY(k, heap.h[k]);
    g.computeVertexNormals();
    return g;
  }, [heap]);

  const sandMat = useMemo(() => {
    const rep = 7;
    [sand.map, sand.normal, sand.rough].forEach((t) => t.repeat.set(rep, rep));
    const m = new THREE.MeshStandardMaterial({ color: '#efe6d4', map: sand.map, normalMap: sand.normal, normalScale: new THREE.Vector2(1.6, 1.6), roughnessMap: sand.rough, roughness: 1, metalness: 0 });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vLift;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLift = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vLift;').replace('void main() {', 'void main() {\n  if (vLift < 0.006) discard;');
    };
    return m;
  }, [sand]);

  const grainGeo = useMemo(() => grainGeometry(0, 0.2, 9), []);
  const grainMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.62, metalness: 0 }), []);
  const lastGeo = useMemo(() => grainGeometry(4, 0.085, 31), []);
  const lastMat = useMemo(() => {
    const t = sand.normal.clone(); t.repeat.set(0.6, 0.6); t.needsUpdate = true;
    return new THREE.MeshPhysicalMaterial({ color: '#efe6d3', roughness: 0.58, clearcoat: 0.12, clearcoatRoughness: 0.5, normalMap: t, normalScale: new THREE.Vector2(0.35, 0.35), sheen: 0.3, sheenColor: new THREE.Color('#ffe9c8') });
  }, [sand]);
  const stoneMat = useMemo(() => {
    [stone.map, stone.rough].forEach((t) => t.repeat.set(9, 9));
    return new THREE.MeshStandardMaterial({ map: stone.map, roughnessMap: stone.rough, roughness: 1, metalness: 0, color: '#ffffff' });
  }, [stone]);

  // Grain colours, once.
  useEffect(() => {
    const im = grains.current, c = new THREE.Color();
    heap.grains.forEach((g, i) => {
      if (g.c > 0.96) c.set('#4a433b'); else if (g.c > 0.86) c.set('#b9b2a6'); else if (g.c > 0.66) c.set('#f1dcc0'); else c.set('#f4ede0');
      im.setColorAt(i, c);
    });
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [heap]);

  // The pointer: press and drag across the heap (or swipe sideways on a phone) to brush sand off.
  useEffect(() => {
    if (still) return;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), p = new THREE.Vector3();
    let down = false, lastHit: THREE.Vector3 | null = null, kind = 'mouse';
    const hit = (cx: number, cy: number) => {
      const r = gl.domElement.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      const s = group.current?.scale.x ?? 1; if (s < 0.03) return null;
      const o = ray.ray.origin, d = ray.ray.direction;
      if (d.y >= 0) return null;
      // Start where the ray drops below the tip, march down the ray until it is under the sand.
      let t = (o.y - H * s * 1.05) / -d.y; if (t < 0) t = 0;
      const tEnd = o.y / -d.y, stepN = 160, dt = (tEnd - t) / stepN;
      for (let i = 0; i <= stepN; i++) {
        p.copy(d).multiplyScalar(t + dt * i).add(o);
        const lx = p.x / s, lz = p.z / s;
        if (Math.abs(lx) > SIZE / 2 || Math.abs(lz) > SIZE / 2) continue;
        const h = heap.at(lx, lz);
        if (h > 0.01 && p.y / s <= h) return new THREE.Vector3(lx, h, lz);
      }
      return null;
    };
    const ignore = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.('a, button, input, nav, header');
    const onDown = (e: PointerEvent) => {
      if (ignore(e.target)) return;
      kind = e.pointerType; const h = hit(e.clientX, e.clientY);
      if (!h) return;
      down = true; lastHit = h;
      if (e.pointerType === 'mouse') { e.preventDefault(); document.documentElement.classList.add('heap-dig'); }
      // A press takes a scoop: a short stroke down the slope from where you touched.
      const r = Math.hypot(h.x, h.z) || 1, ux = h.x / r, uz = h.z / r;
      for (let i = 0; i < 4; i++) heap.dig(h.x + ux * i * 0.07, h.z + uz * i * 0.07, ux, uz, e.pointerType === 'touch' ? 1.4 : 1);
    };
    const onMove = (e: PointerEvent) => {
      const h = hit(e.clientX, e.clientY);
      document.documentElement.classList.toggle('heap-over', !!h && e.pointerType === 'mouse' && !ignore(e.target));
      if (!down || !h) return;
      if (lastHit) {
        const dx = h.x - lastHit.x, dz = h.z - lastHit.z, len = Math.hypot(dx, dz);
        const steps = Math.max(1, Math.ceil(len / 0.08));
        for (let i = 1; i <= steps; i++) { const t = i / steps; heap.dig(lastHit.x + dx * t, lastHit.z + dz * t, (dx / (len || 1)), (dz / (len || 1)), kind === 'touch' ? 1.2 : 1); }
      }
      lastHit = h;
    };
    const onUp = () => { down = false; lastHit = null; document.documentElement.classList.remove('heap-dig'); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      document.documentElement.classList.remove('heap-over', 'heap-dig');
    };
  }, [heap, cam, gl]);

  const m4 = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), e3 = useMemo(() => new THREE.Euler(), []), v3 = useMemo(() => new THREE.Vector3(), []), sc = useMemo(() => new THREE.Vector3(), []);
  const rand = useMemo(() => rng(77), []);

  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, dtRaw), dtv = Math.min(0.3, dtRaw), S = st.current;
    S.frame++;
    // Where we are on the page, eased so the heap goes down with a little weight.
    S.f = still ? stage.f : damp(S.f, stage.f, 4, dtv);
    const P = pick(S.f), s = P.s, join = smooth(clamp(S.f - 4));
    if (phone) P.d *= lerp(1.5, 1.4, join);

    // A press of the line takes one stroke off the slope that faces you.
    if (stage.take > 0 && !still) {
      stage.take--;
      const a = (P.a + (rand() - 0.5) * 80) * D2R, r0 = 0.25 + rand() * 0.35, side = rand() < 0.5 ? -1 : 1;
      for (let i = 0; i < 16; i++) {
        const r = (r0 + i * 0.03) * 2.5, aa = a + side * i * 0.035;
        S.stroke.push({ x: Math.sin(aa) * r, z: Math.cos(aa) * r, dx: Math.sin(aa), dz: Math.cos(aa) });
      }
    }
    if (S.stroke.length) { const k = S.stroke.shift()!; heap.dig(k.x, k.z, k.dx, k.dz, 1.1); }

    // The sand settles.
    if (heap.live > 0) {
      heap.live--;
      heap.relax(3);
      heap.step(dt);
    }
    if (heap.rev !== S.rev) {
      S.rev = heap.rev;
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < p.count; k++) p.setY(k, heap.h[k]);
      p.needsUpdate = true; geo.computeVertexNormals();
      // Grains ride the surface.
      const im = grains.current;
      heap.grains.forEach((g, i) => {
        const h = heap.at(g.x, g.z);
        v3.set(g.x, h + g.s * (h > 0.01 ? 0.35 : 0.7), g.z);
        e3.set(g.rx, g.ry, g.rz); q.setFromEuler(e3);
        sc.set(g.s, g.s * 0.85, g.s * 1.1);
        m4.compose(v3, q, sc); im.setMatrixAt(i, m4);
      });
      im.instanceMatrix.needsUpdate = true;
    }

    // The heap goes down a step with each section.
    group.current.scale.setScalar(Math.max(0.0001, s));
    group.current.visible = s > 0.004;
    last.current.position.set(0, GRAIN * 0.72, 0);

    // The camera: lower and closer each step; a breath of parallax from the pointer.
    const px = still ? 0 : state.pointer.x;
    S.px = damp(S.px, px, 2, dt);
    const anchor = v3.set(0, lerp(H * Math.max(s, 0.02) * 0.4, GRAIN * 0.72, join), 0).clone();
    const az = (P.a + S.px * 2.2) * D2R, el = P.e * D2R;
    cam.position.set(anchor.x + Math.sin(az) * Math.cos(el) * P.d, anchor.y + Math.sin(el) * P.d, anchor.z + Math.cos(az) * Math.cos(el) * P.d);
    cam.lookAt(anchor);
    cam.near = P.d * 0.2; cam.far = P.d * 6;

    // Frame it: the heap sits beside the words; at the end, the grain sits where the page puts its dot.
    cam.clearViewOffset(); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const W = size.width, Hh = size.height;
    const pr = anchor.clone().project(cam), cx = (pr.x * 0.5 + 0.5) * W, cy = (-pr.y * 0.5 + 0.5) * Hh;
    let tx = phone ? 0.5 * W : 0.73 * W, ty = phone ? 0.3 * Hh : 0.5 * Hh;
    if (stage.dot && join > 0) {
      const r = stage.dot.getBoundingClientRect();
      const jp = join * join; tx = lerp(tx, r.left + r.width / 2, jp); ty = lerp(ty, r.top + r.height / 2, jp);
    }
    S.ox = cx - tx; S.oy = cy - ty;
    cam.setViewOffset(W, Hh, S.ox, S.oy, W, Hh);
    cam.updateProjectionMatrix();

    // The light: rises off the stone at the opening; at the end it swings so the grain's shadow points at the way you choose.
    const open = still ? 1 : stage.open;
    const wantA = stage.way >= 0 && join > 0.6 ? [32, 0, -32][stage.way] : 118;
    S.lightA = still ? wantA : damp(S.lightA, wantA, 3, dtv);
    const lE = lerp(0.6, lerp(10.5, 7, join), smooth(open)) * D2R, lA = (P.a + S.lightA) * D2R;
    const reach = Math.max(1.4, s * 14 + 1.4);
    key.current.position.set(anchor.x + Math.sin(lA) * Math.cos(lE) * reach, anchor.y + Math.sin(lE) * reach, anchor.z + Math.cos(lA) * Math.cos(lE) * reach);
    key.current.target.position.copy(anchor); key.current.target.updateMatrixWorld();
    key.current.intensity = 5.2 * smooth(clamp(open * 1.6));
    const sh = key.current.shadow.camera as THREE.OrthographicCamera, ext = Math.max(0.45, s * 3.6);
    if (Math.abs(sh.right - ext) > 1e-3) { sh.left = -ext; sh.right = ext; sh.top = ext; sh.bottom = -ext; sh.near = 0.05; sh.far = reach * 2.2; sh.updateProjectionMatrix(); }
    key.current.shadow.normalBias = 0.012 * Math.max(0.1, s);
    rim.current.position.set(anchor.x - Math.sin(lA) * 6, anchor.y + 2.2, anchor.z - Math.cos(lA) * 6 - 4);
    rim.current.target.position.copy(anchor); rim.current.target.updateMatrixWorld();
    rim.current.intensity = 0.35 * open;

    // Fog folds the far stone into the page.
    const fog = state.scene.fog as THREE.Fog;
    fog.near = P.d * 0.95; fog.far = P.d * 2.1;

    // Focus on the subject, everything else goes soft.
    focus.copy(anchor);
    const eff = dof.current;
    if (eff?.cocMaterial) { eff.cocMaterial.worldFocusRange = Math.max(0.25, s * 3.2 + 0.25); }

    if (!stage.drawn && S.frame > 2) { stage.drawn = true; stage.onDrawn?.(); }
    void scroll;
  });

  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 14, 40]} />
      <hemisphereLight args={['#7e7466', '#050403', 0.12]} />
      <directionalLight ref={key} color="#ffdcb4" intensity={0} castShadow shadow-mapSize={[phone ? 1024 : 1536, phone ? 1024 : 1536]} shadow-bias={-0.0003} shadow-radius={3} />
      <directionalLight ref={rim} color="#cfd3d8" intensity={0} />
      <Environment resolution={64} environmentIntensity={0.16}>
        <Lightformer form="rect" intensity={2.4} color="#ffdcb0" position={[8, 1.2, -2]} scale={[6, 1.2, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.4} color="#d8cfc2" position={[-6, 3, -6]} scale={[4, 3, 1]} target={[0, 0, 0]} />
      </Environment>

      <mesh rotation-x={-Math.PI / 2} receiveShadow material={stoneMat}>
        <planeGeometry args={[80, 80]} />
      </mesh>

      <group ref={group}>
        <mesh ref={mesh} geometry={geo} material={sandMat} castShadow receiveShadow />
        <instancedMesh ref={grains} args={[grainGeo, grainMat, heap.grains.length]} castShadow receiveShadow frustumCulled={false} />
      </group>
      <mesh ref={last} geometry={lastGeo} material={lastMat} scale={[GRAIN, GRAIN, GRAIN]} castShadow receiveShadow />

      <EffectComposer multisampling={0}>
        <DepthOfField ref={dof} target={focus} worldFocusRange={3} bokehScale={phone ? 2 : 3.2} resolutionScale={0.5} />
        <Vignette offset={0.3} darkness={0.55} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />
      </EffectComposer>
    </>
  );
}

export default function Scene() {
  const phone = isPhone();
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, phone ? 1.5 : 1.6]}
      camera={{ fov: phone ? 20 : 15, position: [0, 3, 17], near: 0.1, far: 100 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
    >
      <Still phone={phone} />
    </Canvas>
  );
}
