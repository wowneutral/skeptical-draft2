// The tower. One black basalt prism in a bone haze. Its cross section is a
// superellipse whose exponent follows the camera's distance: about 2 far
// away (a circle), about 40 at the foot (a square), continuous in between.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';
import { clamp, damp, lerp, smooth, still } from '@/lib/utils';
import { SHOTS, TOWER, tw, type Shot } from './state';

const BONE = new THREE.Color('#e7e3d9');
const SEG = 384;

/** Superellipse exponent for a camera distance: 2 beyond ~280, 40 inside ~16, log scaled. */
const expFor = (d: number) => {
  const t = clamp((Math.log(280) - Math.log(d)) / (Math.log(280) - Math.log(16)));
  return Math.exp(lerp(Math.log(2), Math.log(40), smooth(t)));
};
/** How much of the tower the haze swallows at a given distance (fog factor on the stone). */
const hazeFor = (d: number) => {
  const t = clamp((Math.log(d) - Math.log(10)) / (Math.log(500) - Math.log(10)));
  return lerp(0.02, 0.5, Math.pow(t, 1.15));
};

function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

/** Basalt courses drawn on canvases: colour, roughness and bump share the same joints. */
function makeStone() {
  const W = 512, Hc = 1024, courses = 8, ch = Hc / courses;
  const col = document.createElement('canvas'); col.width = W; col.height = Hc;
  const rough = document.createElement('canvas'); rough.width = W; rough.height = Hc;
  const bump = document.createElement('canvas'); bump.width = W; bump.height = Hc;
  const c = col.getContext('2d')!, r = rough.getContext('2d')!, b = bump.getContext('2d')!;
  const rnd = rng(11);
  c.fillStyle = '#1e1d1c'; c.fillRect(0, 0, W, Hc);
  r.fillStyle = '#d2d2d2'; r.fillRect(0, 0, W, Hc);
  b.fillStyle = '#bcbcbc'; b.fillRect(0, 0, W, Hc);
  for (let i = 0; i < courses; i++) {
    const y = i * ch, blocks = 3 + (i % 2), off = (i % 2) * (W / 7) + rnd() * 30;
    for (let k = -1; k <= blocks; k++) {
      const x0 = off + (k * W) / blocks, w = W / blocks;
      const v = 26 + Math.floor(rnd() * 4);
      c.fillStyle = `rgb(${v + 1},${v},${v})`; c.fillRect(x0, y, w, ch);
      const rv = 200 + Math.floor(rnd() * 22);
      r.fillStyle = `rgb(${rv},${rv},${rv})`; r.fillRect(x0, y, w, ch);
      // vertical joint
      c.fillStyle = 'rgba(10,10,10,0.25)'; c.fillRect(x0 - 0.75, y, 1.5, ch);
      r.fillStyle = '#ffffff'; r.fillRect(x0 - 1.5, y, 3, ch);
      b.fillStyle = '#8a8a8a'; b.fillRect(x0 - 1, y, 2, ch);
    }
    // the course joint, drawn fine and slightly uneven
    c.fillStyle = 'rgba(8,8,8,0.8)'; c.fillRect(0, y, W, 2);
    r.fillStyle = '#ffffff'; r.fillRect(0, y, W, 4);
    b.fillStyle = '#202020'; b.fillRect(0, y, W, 3);
    b.fillStyle = '#d8d8d8'; b.fillRect(0, y + 3, W, 1.5);
  }
  // grain: fine speckle and a few long weathering streaks
  for (let i = 0; i < 26000; i++) {
    const x = rnd() * W, y = rnd() * Hc, a = rnd();
    c.fillStyle = a > 0.5 ? 'rgba(255,250,240,0.05)' : 'rgba(0,0,0,0.12)'; c.fillRect(x, y, 1.4, 1.4);
    r.fillStyle = a > 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'; r.fillRect(x, y, 1.6, 1.6);
    b.fillStyle = a > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; b.fillRect(x, y, 1.2, 1.2);
  }
  for (let i = 0; i < 40; i++) {
    const x = rnd() * W; c.fillStyle = 'rgba(0,0,0,0.06)'; c.fillRect(x, rnd() * Hc, 2 + rnd() * 3, 60 + rnd() * 200);
  }
  const mk = (cv: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: mk(col, true), roughnessMap: mk(rough, false), bumpMap: mk(bump, false) };
}

/** A soft dark pool under the foot, on top of the real shadow. */
function makeContact() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d')!;
  const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(cv);
}

function Tower() {
  const { geometry, cap, update } = useMemo(() => {
    const { a, H } = TOWER;
    const N = SEG + 1;
    const pos = new Float32Array(N * 2 * 3), nor = new Float32Array(N * 2 * 3), uv = new Float32Array(N * 2 * 2);
    const idx: number[] = [];
    const U = 5, V = H / (0.56 * 8);
    for (let i = 0; i < N; i++) {
      uv.set([(i / SEG) * U, 0], i * 4); uv.set([(i / SEG) * U, V], i * 4 + 2);
      if (i < SEG) { const p = i * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    const cpos = new Float32Array((SEG + 1) * 3);
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
    const cidx: number[] = []; for (let i = 1; i < SEG; i++) cidx.push(0, i, i + 1); cg.setIndex(cidx);
    let last = -1;
    const update = (n: number) => {
      if (Math.abs(n - last) < 0.002) return; last = n;
      for (let i = 0; i < N; i++) {
        const th = (i / SEG) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
        const r = Math.pow(Math.pow(Math.abs(c), n) + Math.pow(Math.abs(s), n), -1 / n);
        const x = a * r * c, z = a * r * s;
        let nx = Math.sign(c) * Math.pow(Math.abs(c * r), n - 1), nz = Math.sign(s) * Math.pow(Math.abs(s * r), n - 1);
        const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
        pos.set([x, 0, z], i * 6); pos.set([x, H, z], i * 6 + 3);
        nor.set([nx, 0, nz], i * 6); nor.set([nx, 0, nz], i * 6 + 3);
        if (i < SEG) cpos.set([x, H, z], (i + 1) * 3);
      }
      cpos.set([0, H, 0], 0);
      g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
      cg.attributes.position.needsUpdate = true; cg.computeVertexNormals();
      g.computeBoundingSphere(); cg.computeBoundingSphere();
    };
    update(2);
    return { geometry: g, cap: cg, update };
  }, []);
  const stone = useMemo(() => makeStone(), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ ...stone, color: '#ffffff', roughness: 1, metalness: 0, bumpScale: 1.2 }), [stone]);
  const capMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2826', roughness: 0.95 }), []);
  useEffect(() => () => { geometry.dispose(); cap.dispose(); mat.dispose(); capMat.dispose(); Object.values(stone).forEach((t) => t.dispose()); }, [geometry, cap, mat, capMat, stone]);
  useFrame(() => update(tw.n));
  const { a, H } = TOWER;
  return (
    <group>
      <mesh geometry={geometry} material={mat} castShadow receiveShadow />
      <mesh geometry={cap} material={capMat} castShadow />
      {/* One narrow slit window high on the lit face, so the corners have something to turn against. */}
      <mesh position={[0, H * 0.79, a + 0.012]}>
        <planeGeometry args={[0.2, 2.6]} />
        <meshStandardMaterial color="#050505" roughness={1} />
      </mesh>
      <mesh position={[0, H * 0.79 - 1.32, a + 0.05]} castShadow>
        <boxGeometry args={[0.42, 0.07, 0.1]} />
        <meshStandardMaterial color="#3a3734" roughness={0.9} />
      </mesh>
      {/* The door: narrow, no handle. A smoother slab set into a frame. */}
      <group position={[0.55, 0, a]}>
        <mesh position={[0, 1.42, 0.02]} receiveShadow>
          <planeGeometry args={[0.9, 2.84]} />
          <meshStandardMaterial color="#0b0a0a" roughness={1} />
        </mesh>
        <mesh position={[0, 1.36, 0.035]} receiveShadow>
          <planeGeometry args={[0.74, 2.66]} />
          <meshStandardMaterial color="#1d1b1a" roughness={0.55} />
        </mesh>
        <mesh position={[0, 2.9, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[1.14, 0.14, 0.12]} />
          <meshStandardMaterial color="#2e2b29" roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}

function Ground() {
  const contact = useMemo(() => makeContact(), []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[6000, 6000]} />
        <meshStandardMaterial color="#efebe3" emissive="#4a463f" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
        <planeGeometry args={[TOWER.a * 4.2, TOWER.a * 4.2]} />
        <meshBasicMaterial map={contact} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

function Lights() {
  const key = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();
  useEffect(() => {
    const l = key.current; if (!l) return;
    l.target.position.set(0, 14, 0); scene.add(l.target);
    const c = l.shadow.camera; c.left = -9; c.right = 9; c.top = 30; c.bottom = -30; c.near = 1; c.far = 330; c.updateProjectionMatrix();
    l.shadow.bias = -0.0004; l.shadow.normalBias = 0.04;
    return () => { scene.remove(l.target); };
  }, [scene]);
  // Low, warm, from the side and a little in front: one face lit, one in shadow.
  const dir = new THREE.Vector3(-0.8, 0.3, 0.52).normalize().multiplyScalar(120);
  return (
    <>
      <directionalLight ref={key} position={[dir.x, dir.y + 14, dir.z]} intensity={4} color="#ffe8cf" castShadow shadow-mapSize={[2048, 2048]} />
      <hemisphereLight args={['#efece6', '#bdb8ae', 0.8]} />
      <directionalLight position={[60, 30, -20]} intensity={0.35} color="#dfe3ea" />
    </>
  );
}

const blend = (a: Shot, b: Shot, t: number): Shot => ({
  d: Math.exp(lerp(Math.log(a.d), Math.log(b.d), t)),
  az: lerp(a.az, b.az, t), h: lerp(a.h, b.h, t), pitch: lerp(a.pitch, b.pitch, t),
  fov: lerp(a.fov, b.fov, t), sx: lerp(a.sx, b.sx, t), sy: lerp(a.sy, b.sy, t),
});

function Rig({ phone }: { phone: boolean }) {
  const { camera, scene, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const cur = useRef<Shot | null>(null);
  const fog = useMemo(() => new THREE.FogExp2(BONE.getHex(), 0.002), []);
  useEffect(() => { scene.fog = fog; scene.background = BONE.clone(); return () => { scene.fog = null; scene.background = null; }; }, [scene, fog]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const list = SHOTS.map((s) => (phone ? s.phone : s.wide));
    // Where the scroll puts the camera: ease into each stop, so every section holds still to be read.
    let target: Shot;
    if (still) target = tw.frame ? list[3] : list[0];
    else {
      const stops = tw.stops, y = scroll.y;
      if (stops.length !== list.length) target = list[0];
      else {
        let i = 0; while (i < stops.length - 2 && y > stops[i + 1]) i++;
        const t = clamp((y - stops[i]) / Math.max(1, stops[i + 1] - stops[i]));
        target = blend(list[i], list[i + 1], smooth(smooth(t)));
      }
    }
    // Holding steps back toward the horizon; letting go walks in again, with a little weight.
    tw.hold = still ? 0 : damp(tw.hold, tw.holding ? 1 : 0, tw.holding ? 1.6 : 2.2, dt);
    const h = smooth(tw.hold);
    const far = list[0];
    const back: Shot = { ...far, d: Math.max(target.d, 520), sx: target.sx, sy: lerp(far.sy, target.sy, 0.3), az: target.az };
    const want = h > 0.0005 ? blend(target, back, h) : target;
    // Drag inertia and arrow keys.
    if (!still) {
      if (!tw.dragging) { tw.az += tw.azV * dt; tw.azV *= Math.exp(-3.2 * dt); }
      tw.az += tw.keyTurn * dt * 1.1;
    }
    const s = cur.current ?? (cur.current = { ...want });
    const k = still ? 1 : 1 - Math.exp(-6 * dt);
    s.d = Math.exp(lerp(Math.log(s.d), Math.log(want.d), k));
    s.az = lerp(s.az, want.az, k); s.h = lerp(s.h, want.h, k); s.pitch = lerp(s.pitch, want.pitch, k);
    s.fov = lerp(s.fov, want.fov, k); s.sx = lerp(s.sx, want.sx, k); s.sy = lerp(s.sy, want.sy, k);

    const az = s.az + tw.az;
    cam.position.set(Math.sin(az) * s.d, s.h, Math.cos(az) * s.d);
    cam.rotation.set(s.pitch, az, 0, 'YXZ');
    cam.fov = s.fov; cam.near = Math.max(0.1, s.d * 0.004); cam.far = 8000;
    cam.aspect = size.width / size.height;
    cam.updateProjectionMatrix();
    // A shift lens, as in architectural photography: the frame slides, the verticals stay vertical.
    cam.projectionMatrix.elements[8] = -s.sx;
    cam.projectionMatrix.elements[9] = -s.sy;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();

    tw.n = expFor(s.d);
    // The haze: thick far away, thin at the foot. Density is solved so the stone shows the right amount of fog.
    tw.intro = still ? 1 : Math.min(1, tw.intro + dt / 2.6);
    const f = lerp(0.995, hazeFor(s.d), smooth(tw.intro));
    fog.density = Math.sqrt(-Math.log(1 - f)) / s.d;
  });
  return null;
}

export default function Scene({ phone }: { phone: boolean }) {
  return (
    <Canvas
      className="tw-canvas"
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={phone ? [1, 1.5] : [1, 1.6]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      camera={{ fov: 15, near: 0.5, far: 8000, position: [0, 1.6, 430] }}
      aria-hidden="true"
    >
      <Rig phone={phone} />
      <Lights />
      <Tower />
      <Ground />
    </Canvas>
  );
}
