// The stone, the honed sweep it sits on, one long softbox, and the camera
// that walks around it in weighted steps as the page scrolls.
import { memo, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import MARKS from '@/lib/marks.json';
import { clamp, damp, lerp, smooth, still } from '@/lib/utils';
import { S, step, wrap } from './sim';

// The hull: a half ellipsoid underneath, a low dome on top.
export const A = 1.55, B = 0.47, C = 0.34, HT = 0.12;
const BG = '#dcd7cc';

type Stop = { az: number; el: number; dist: number; fov: number; ty: number; fx: number; fy: number };
// hero, manifesto, the fourth line, record, drive, people, join
const DESK: Stop[] = [
  { az: 0.62, el: 0.3, dist: 12.4, fov: 17, ty: 0.2, fx: 0.71, fy: 0.56 },
  { az: -0.8, el: 0.34, dist: 15, fov: 17, ty: 0.2, fx: 0.71, fy: 0.54 },
  { az: 0.05, el: 0.09, dist: 13.5, fov: 17, ty: 0.24, fx: 0.71, fy: 0.55 },
  { az: 0.75, el: 0.07, dist: 11.2, fov: 17, ty: 0.26, fx: 0.72, fy: 0.52 },
  { az: 0, el: 1.53, dist: 17, fov: 17, ty: 0, fx: 0.71, fy: 0.5 },
  { az: 1.15, el: 0.42, dist: 15, fov: 17, ty: 0.2, fx: 0.71, fy: 0.54 },
  { az: 0, el: 0.7, dist: 14.5, fov: 17, ty: 0.1, fx: 0.5, fy: 0.25 },
];
const PHONE: Stop[] = DESK.map((s, i) => ({ ...s, fx: 0.5, fy: i === 4 ? 0.5 : 0.56, dist: s.dist * (i === 3 ? 1.05 : i === 4 ? 1 : 0.9) }));

/** Noise in [0, 1) from integer coordinates. */
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

/** Roughness for the stone: polished in the middle, breaking up toward the ends, with a fine grain. */
function stoneMaps() {
  const make = (lo: number, hi: number) => {
    const w = 512, h = 128, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d')!, img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const e = Math.abs((x / (w - 1)) * 2 - 1), side = Math.abs((y / (h - 1)) * 2 - 1);
      const t = smooth(clamp((e - 0.3) / 0.7)) * 0.85 + side * side * 0.15;
      const streak = hash(Math.floor(x / 3), y) * 0.5 + hash(x, Math.floor(y / 9)) * 0.5;
      const v = clamp(lo + (hi - lo) * t + (streak - 0.5) * 0.05 * (0.4 + t));
      const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 4;
    return tex;
  };
  return { rough: make(0.2, 0.62), coat: make(0.02, 0.38) };
}

/** The honed surface: pale with a fine grain and a few faint drifts. */
function floorMaps() {
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d')!, img = g.createImageData(n, n);
  const r = document.createElement('canvas'); r.width = r.height = n;
  const gr = r.getContext('2d')!, ri = gr.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const fine = hash(x, y), mid = hash(Math.floor(x / 6), Math.floor(y / 6));
    const drift = Math.sin((x * 0.021 + y * 0.008) + Math.sin(y * 0.03) * 1.7) * 0.5 + 0.5;
    const v = 0.93 + (fine - 0.5) * 0.06 + (mid - 0.5) * 0.03 - drift * 0.025;
    const i = (y * n + x) * 4;
    img.data[i] = v * 236; img.data[i + 1] = v * 231; img.data[i + 2] = v * 221; img.data[i + 3] = 255;
    const rv = 0.62 + (fine - 0.5) * 0.25 + drift * 0.08;
    ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = rv * 255; ri.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); gr.putImageData(ri, 0, 0);
  const map = new THREE.CanvasTexture(c), rough = new THREE.CanvasTexture(r);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); t.anisotropy = 8; }
  return { map, rough };
}

/** A soft dark ellipse for the contact shadow. */
function blobTex() {
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d')!, gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  return new THREE.CanvasTexture(c);
}

/** Height of the top face at (x, z), so the inlay sits flush. */
const topAt = (x: number, z: number) => HT * Math.pow(Math.sqrt(Math.max(0, 1 - (x / A) ** 2 - (z / B) ** 2)), 0.32);

function hullGeometry() {
  const s0 = new THREE.SphereGeometry(1, 160, 72);
  s0.deleteAttribute('uv'); s0.deleteAttribute('normal');
  // One shared vertex along the seam, so the polish has no line in it.
  const g = mergeVertices(s0, 1e-5);
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = new THREE.BufferAttribute(new Float32Array(p.count * 2), 2);
  g.setAttribute('uv', uv);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ny = y < 0 ? y * C : HT * Math.pow(y, 0.32);
    p.setXYZ(i, x * A, ny, z * B);
    uv.setXY(i, (x + 1) / 2, (z + 1) / 2);
  }
  g.computeVertexNormals();
  return g;
}

function inlayGeometry() {
  const m = MARKS.italic;
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${m.d}"/></svg>`);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const g = new THREE.ShapeGeometry(shapes, 24);
  g.computeBoundingBox();
  const bb = g.boundingBox!, cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2;
  const s = 0.6 / (bb.max.y - bb.min.y);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    // Glyph up runs along the stone's long axis, glyph right across it.
    const gx = (p.getX(i) - cx) * s, gy = -(p.getY(i) - cy) * s;
    const x = gy, z = gx;
    p.setXYZ(i, x, topAt(x, z) + 0.004, z);
  }
  // Mapping the glyph onto the top mirrors it, so turn every triangle to face up again.
  const idx = g.index;
  if (idx) for (let i = 0; i < idx.count; i += 3) { const t = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, t); }
  const nrm = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) nrm[i * 3 + 1] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return g;
}

const v3 = new THREE.Vector3(), q = new THREE.Vector3(), ndc = new THREE.Vector2();
const tilt = new THREE.Euler(), tiltM = new THREE.Matrix4(), inv = new THREE.Matrix4();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ray = new THREE.Raycaster();

function Stone({ phone }: { phone: boolean }) {
  const { camera, gl, scene, size } = useThree();
  const yawG = useRef<THREE.Group>(null), tiltG = useRef<THREE.Group>(null), hull = useRef<THREE.Mesh>(null);
  const born = useRef(0), blob = useRef<THREE.Mesh>(null), core = useRef<THREE.Mesh>(null), key = useRef<THREE.DirectionalLight>(null);
  const hullGeo = useMemo(hullGeometry, []), inlayGeo = useMemo(inlayGeometry, []);
  const maps = useMemo(stoneMaps, []), fl = useMemo(floorMaps, []), bt = useMemo(blobTex, []);

  // Hands on the stone: drag across it to spin it, tap an end to rock it.
  useEffect(() => {
    const el = gl.domElement;
    let id = -1, t0 = 0, x0 = 0, y0 = 0, moved = 0, lastT = 0;
    const last = new THREE.Vector3(), hitLocal = new THREE.Vector3();
    const toNdc = (e: PointerEvent) => { const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
    const hit = (e: PointerEvent) => { toNdc(e); ray.setFromCamera(ndc, camera); return hull.current ? ray.intersectObject(hull.current, false)[0] : undefined; };
    const onPlane = (e: PointerEvent, out: THREE.Vector3) => { toNdc(e); ray.setFromCamera(ndc, camera); return ray.ray.intersectPlane(floorPlane, out); };
    const down = (e: PointerEvent) => {
      if (still) return;
      const h = hit(e); if (!h || !hull.current) return;
      id = e.pointerId; t0 = performance.now(); lastT = t0; x0 = e.clientX; y0 = e.clientY; moved = 0;
      hitLocal.copy(h.point); hull.current.worldToLocal(hitLocal);
      onPlane(e, last);
      S.held = true; S.touched = true; S.handW = S.w;
      try { el.setPointerCapture(id); } catch { /* fine */ }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) {
        if (id < 0 && e.pointerType === 'mouse') { const o = !!hit(e); if (o !== S.over) { S.over = o; el.style.cursor = o ? 'grab' : ''; } }
        return;
      }
      moved = Math.max(moved, Math.hypot(e.clientX - x0, e.clientY - y0));
      const now = performance.now(), dt = Math.max(0.008, (now - lastT) / 1000); lastT = now;
      if (!onPlane(e, q)) return;
      const rx = last.x, rz = last.z, dx = q.x - last.x, dz = q.z - last.z;
      const wv = (rz * dx - rx * dz) / (rx * rx + rz * rz + 0.25) / dt;
      S.handW = clamp(lerp(S.handW, wv, 0.5), -14, 14);
      last.copy(q);
      el.style.cursor = 'grabbing';
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1; S.held = false; el.style.cursor = S.over ? 'grab' : '';
      const quick = performance.now() - t0 < 320 && moved < 9;
      if (quick) S.cmds.push({ type: 'tap', end: clamp(hitLocal.x / A, -1, 1) });
      else if (performance.now() - lastT > 90) S.handW = S.w; // held still before letting go
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
  }, [camera, gl]);

  const stops = phone ? PHONE : DESK;
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 10);
    S.t += dt;
    if (!born.current) born.current = performance.now();
    S.lit = still ? 1 : smooth(clamp(((performance.now() - born.current) / 1000 - 0.2) / 2.4));
    if (key.current) key.current.intensity = 2.6 * (0.05 + 0.95 * S.lit);
    scene.environmentIntensity = 0.18 + 0.82 * S.lit;

    // Camera: weighted steps between stops.
    S.f = still ? S.raw : Math.abs(S.raw - S.f) < 0.0005 ? S.raw : damp(S.f, S.raw, 2.1, dt);
    const i = clamp(Math.floor(S.f), 0, stops.length - 1), j = Math.min(stops.length - 1, i + 1), t = smooth(clamp(S.f - i));
    const a = stops[i], b = stops[j];
    const az = a.az + wrap(b.az - a.az) * t, el = lerp(a.el, b.el, t), dist = lerp(a.dist, b.dist, t), ty = lerp(a.ty, b.ty, t);
    const fx = lerp(a.fx, b.fx, t), fy = lerp(a.fy, b.fy, t), fov = lerp(a.fov, b.fov, t);
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(Math.sin(az) * Math.cos(el) * dist, ty + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    cam.lookAt(0, ty, 0);
    cam.fov = fov;
    cam.setViewOffset(size.width, size.height, -(fx - 0.5) * size.width, -(fy - 0.5) * size.height, size.width, size.height);
    cam.updateProjectionMatrix();

    // Where it should come to rest, if anywhere.
    let aim: number | null = null, k = 0;
    if (S.aimAt) {
      const r = gl.domElement.getBoundingClientRect();
      ndc.set(((S.aimAt.x - r.left) / r.width) * 2 - 1, -((S.aimAt.y - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      if (ray.ray.intersectPlane(groundPlane, q)) { aim = Math.atan2(-q.z, q.x); k = 1; }
    }
    if (aim === null && S.rest > 0) { aim = -Math.PI / 2; k = S.rest; }
    // Left alone after its opening turn, it settles back into its portrait.
    const sec = (performance.now() - born.current) / 1000;
    if (aim === null && !S.touched && S.raw < 0.6 && sec > 5) { aim = 0.02; k = 0.35 * smooth(clamp((sec - 5) / 2)); }
    if (!still) step(dt, aim, S.held ? 0 : k);

    // Pose: yaw, then pitch and roll, lifted so the lowest point touches the floor.
    if (yawG.current && tiltG.current) {
      yawG.current.rotation.y = S.yaw;
      tilt.set(S.b, 0, S.a, 'XYZ');
      tiltG.current.rotation.copy(tilt);
      tiltM.makeRotationFromEuler(tilt); inv.copy(tiltM).invert();
      v3.set(0, -1, 0).applyMatrix4(inv);
      const m = Math.sqrt(A * A * v3.x * v3.x + C * C * v3.y * v3.y + B * B * v3.z * v3.z);
      q.set((A * A * v3.x) / m, (C * C * v3.y) / m, (B * B * v3.z) / m).applyMatrix4(tiltM);
      tiltG.current.position.set(0, m, 0);
      // Shadows follow the contact point.
      const tl = Math.abs(S.a) + Math.abs(S.b);
      if (blob.current) { blob.current.position.set(q.x * 0.35, 0.003, q.z * 0.35); (blob.current.material as THREE.MeshBasicMaterial).opacity = (0.5 - tl * 0.6) * S.lit; }
      if (core.current) {
        core.current.position.set(q.x * 0.85, 0.004, q.z * 0.85);
        core.current.scale.set(1.5 - tl * 2.2, 0.7, 1);
        (core.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * S.lit;
      }
    }
    // Where the stone is on screen, for the page.
    v3.set(0, 0.25, 0).project(cam);
    const r = gl.domElement.getBoundingClientRect();
    S.sx = r.left + ((v3.x + 1) / 2) * r.width; S.sy = r.top + ((1 - v3.y) / 2) * r.height;
  });

  return (
    <>
      <directionalLight
        ref={key} castShadow position={[-1.6, 11, -6.5]} intensity={2.6} color="#fff8ee"
        shadow-mapSize={phone ? [1024, 1024] : [2048, 2048]} shadow-radius={9} shadow-bias={-0.0003} shadow-normalBias={0.02}
        shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} shadow-camera-near={4} shadow-camera-far={20}
      />
      <hemisphereLight args={['#f4efe6', '#b9b2a4', 0.35]} />
      <group ref={yawG}>
        <group ref={tiltG}>
          <mesh ref={hull} geometry={hullGeo} castShadow receiveShadow>
            <meshPhysicalMaterial
              color="#0b0b0c" roughness={1} roughnessMap={maps.rough} metalness={0}
              clearcoat={1} clearcoatRoughness={1} clearcoatRoughnessMap={maps.coat}
              envMapIntensity={1.15} specularIntensity={0.6}
            />
          </mesh>
          <mesh geometry={inlayGeo}>
            <meshPhysicalMaterial color="#ebe5d6" roughness={0.42} clearcoat={1} clearcoatRoughness={0.08} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
          </mesh>
        </group>
        <mesh ref={blob} rotation-x={-Math.PI / 2} scale={[A * 2.9, B * 3.6, 1]} renderOrder={1}>
          <planeGeometry />
          <meshBasicMaterial map={bt} transparent depthWrite={false} color="#000" opacity={0.5} />
        </mesh>
        <mesh ref={core} rotation-x={-Math.PI / 2} scale={[1.5, 0.7, 1]} renderOrder={2}>
          <planeGeometry />
          <meshBasicMaterial map={bt} transparent depthWrite={false} color="#000" opacity={0.7} />
        </mesh>
      </group>
      {/* The honed surface sweeping up into the backdrop. */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[16.05, 96]} />
        <meshStandardMaterial map={fl.map} roughnessMap={fl.rough} roughness={1} color="#ffffff" envMapIntensity={0.7} emissive="#d9d4ca" emissiveIntensity={0.22} />
      </mesh>
      <Sweep />
    </>
  );
}

function Sweep() {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    pts.push(new THREE.Vector2(15.9, 0));
    for (let i = 0; i <= 24; i++) { const t = (i / 24) * Math.PI / 2; pts.push(new THREE.Vector2(16 + Math.sin(t) * 10, 10 - Math.cos(t) * 10)); }
    pts.push(new THREE.Vector2(26, 60));
    return new THREE.LatheGeometry(pts, 96);
  }, []);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#d9d5cb" roughness={0.66} side={THREE.BackSide} envMapIntensity={0.7} emissive="#d9d4ca" emissiveIntensity={0.22} />
    </mesh>
  );
}

export default memo(function Scene({ phone }: { phone: boolean }) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} dpr={[1, phone ? 1.5 : 1.6]}
      camera={{ fov: 17, near: 0.5, far: 120, position: [6, 2, 13] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 24, 70]} />
      <Environment resolution={256} frames={1}>
        {/* One long softbox above and behind: the highlight down the curve. */}
        <Lightformer form="rect" intensity={4} color="#fffaf2" position={[-1, 7, -3.5]} rotation-x={Math.PI / 2.3} scale={[14, 2.4, 1]} />
        {/* A faint rim from behind. */}
        <Lightformer form="rect" intensity={2.4} color="#f7f1e6" position={[0, 1.2, -10]} scale={[18, 0.7, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#fff6ea" position={[-10, 3, 2]} rotation-y={Math.PI / 2} scale={[1.4, 8, 1]} />
        <Lightformer form="rect" intensity={0.35} color="#efe9dc" position={[0, 3, 12]} rotation-y={Math.PI} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={0.55} color="#e7e0d2" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} />
      </Environment>
      <Stone phone={phone} />
      <EffectComposer multisampling={phone ? 0 : 4}>
        <N8AO aoRadius={0.6} distanceFalloff={0.5} intensity={phone ? 2 : 2.6} halfRes={phone} color="#1d1a14" />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
});
