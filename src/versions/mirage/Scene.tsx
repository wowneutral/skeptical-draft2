// The mirage: two concave mirrors closed like a shell, a porcelain question
// mark hidden at the bottom, and its image standing in the opening on top.
// The image is a second copy of the mark. It answers nothing: it is light.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import MARKS from '@/lib/marks.json';
import { clamp, damp, still } from '@/lib/utils';
import { stage } from './stage';

/* ─────────── the optics, as numbers ─────────── */
// Two equal paraboloids, each with its focus at the other's vertex.
const R = 1.5; // mirror radius
const H = R / (2 * Math.SQRT2); // depth of each bowl
const F = 2 * H; // focal length
const A = 0.56; // the opening
const BAND = 0.1; // half the height of the seam band
const T = 0.075; // wall
const FOOT = 0.05;
const para = (r: number) => (r * r) / (4 * F);
const LIP = 2 * H - para(A); // underside of the opening
const TOP = LIP + T; // top of the opening
const MARK_H = 0.6;
const BG = '#0b0b0c';

type Shot = { az: number; el: number; d: number; ty: number };
// hero, manifesto, record, drive, people, join, end
const SHOTS: Shot[] = [
  { az: 0.5, el: 0.34, d: 11.2, ty: 0.62 },
  { az: 1.15, el: 0.2, d: 10.6, ty: 0.6 },
  { az: -0.85, el: 0.045, d: 9.4, ty: 0.62 },
  { az: -0.25, el: 1.0, d: 7.6, ty: 1.0 },
  { az: 2.15, el: 0.06, d: 9.6, ty: 0.6 },
  { az: 0.0, el: 0.2, d: 10.2, ty: 0.66 },
  { az: 0.35, el: 0.6, d: 11.5, ty: 0.75 },
];

const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

function lathe(points: THREE.Vector2[], seg = 128) {
  return new THREE.LatheGeometry(points, seg);
}

function markGeometry(height: number) {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${MARKS.italic.d}"/></svg>`);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const g = new THREE.ExtrudeGeometry(shapes, { depth: 170, bevelEnabled: true, bevelThickness: 46, bevelSize: 30, bevelSegments: 6, curveSegments: 22 });
  g.rotateX(Math.PI);
  g.computeBoundingBox();
  const b = g.boundingBox!;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  const s = height / (b.max.y - b.min.y);
  g.scale(s, s, s);
  return g;
}

function noiseTexture(size: number, draw: (g: CanvasRenderingContext2D, rnd: () => number) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  draw(g, rnd);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function makeKit() {
  // Powder coat: fine tooth on the black outside.
  const tooth = noiseTexture(256, (g, rnd) => {
    const im = g.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) { const v = 128 + (rnd() - 0.5) * 90; im.data.set([v, v, v, 255], i * 4); }
    g.putImageData(im, 0, 0);
  });
  tooth.repeat.set(10, 4);
  // The ring of reflected light at the image's foot: a soft annulus, faint.
  const ring = noiseTexture(256, (g) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.52, 'rgba(255,255,255,0)');
    gr.addColorStop(0.7, 'rgba(255,255,255,0.55)');
    gr.addColorStop(0.78, 'rgba(255,255,255,0.18)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  });
  ring.wrapS = ring.wrapT = THREE.ClampToEdgeWrapping;
  // The well under the opening: near black, the faintest lift in the middle.
  const well = noiseTexture(128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, '#0d0d0e'); gr.addColorStop(0.8, '#040405'); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  well.colorSpace = THREE.SRGBColorSpace;

  const black = new THREE.MeshPhysicalMaterial({ color: '#060607', roughness: 0.7, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.32, bumpMap: tooth, bumpScale: 0.2, side: THREE.DoubleSide, envMapIntensity: 0.55 });
  const silver = new THREE.MeshStandardMaterial({ color: '#efeeea', metalness: 1, roughness: 0.045, side: THREE.DoubleSide, envMapIntensity: 1.25 });
  const porcelain = new THREE.MeshPhysicalMaterial({ color: '#f4f0e6', roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.25, sheenColor: new THREE.Color('#fff8ec'), envMapIntensity: 1.05 });
  // The image: the same porcelain, a shade flatter.
  const image = new THREE.MeshPhysicalMaterial({ color: '#e6e1d6', roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.08, envMapIntensity: 0.88 });
  const halo = new THREE.MeshBasicMaterial({ map: ring, transparent: true, opacity: 0.16, depthWrite: false, color: '#f3efe6', toneMapped: false });
  const dark = new THREE.MeshBasicMaterial({ map: well });
  const floor = new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: 0.86, metalness: 0, envMapIntensity: 0.06 });
  const proxy = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  return { black, silver, porcelain, image, halo, dark, floor, proxy, textures: [tooth, ring, well] };
}
type Kit = ReturnType<typeof makeKit>;

function makeGeo() {
  const N = 48;
  const innerBottom: THREE.Vector2[] = [];
  const outerBottom: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) { const r = (R * i) / N; innerBottom.push(v2(r, para(r))); }
  outerBottom.push(v2(0.001, -T));
  for (let i = 1; i <= N; i++) { const r = (R * i) / N; outerBottom.push(v2((r * (R + T)) / R, (para(r) * (H - BAND + T)) / H - T)); }
  outerBottom.push(v2(R + T, H - BAND * 0.5), v2(R + T, H));
  const innerLid: THREE.Vector2[] = [];
  const outerLid: THREE.Vector2[] = [];
  for (let i = 0; i <= N; i++) { const r = A + ((R - A) * i) / N; innerLid.push(v2(r, 2 * H - para(r))); }
  const k = (TOP - H - BAND) / (para(R) - para(A));
  for (let i = 0; i <= N; i++) { const r = A + ((R - A) * i) / N; outerLid.push(v2(A + ((r - A) * (R + T - A)) / (R - A), TOP - (para(r) - para(A)) * k)); }
  outerLid.push(v2(R + T, H + BAND * 0.5), v2(R + T, H));
  const fr = 0.62;
  const fy = (para((fr * R) / (R + T)) * (H - BAND + T)) / H - T;
  const foot = [v2(0.001, -T - FOOT), v2(fr - 0.03, -T - FOOT), v2(fr, -T - FOOT + 0.02), v2(fr, fy + 0.01)];
  return {
    innerBottom: lathe(innerBottom),
    outerBottom: lathe(outerBottom),
    innerLid: lathe(innerLid),
    outerLid: lathe(outerLid),
    rim: lathe([v2(R, H), v2(R + T, H)]),
    lip: lathe([v2(A, LIP), v2(A - 0.006, LIP + T * 0.5), v2(A, TOP)], 96),
    foot: lathe(foot, 96),
    well: new THREE.CircleGeometry(A, 64),
    halo: new THREE.CircleGeometry(0.34, 48),
    mark: markGeometry(MARK_H),
    small: markGeometry(MARK_H * 0.9),
    proxy: new THREE.CylinderGeometry(A * 0.62, A * 0.62, MARK_H * 1.05, 16),
  };
}

/* ─────────── the object ─────────── */

function Mirage({ kit }: { kit: Kit }) {
  const geo = useMemo(makeGeo, []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  const object = useRef<THREE.Group>(null), turn = useRef<THREE.Group>(null), lid = useRef<THREE.Group>(null);
  const image = useRef<THREE.Group>(null), well = useRef<THREE.Mesh>(null);
  const { camera, gl } = useThree();
  const st = useRef({ l: still ? 0 : 1, lv: 0, t: 0, seated: still, up: false, tilt: 0, tiltV: 0, aim: 0, cam: { ...SHOTS[0] }, drag: null as null | { x: number; moved: number; part: 'lid' | 'base'; id: number } });

  // Dragging lives on the window, so a drag that leaves the object keeps turning it.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = st.current.drag; if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x; d.x = e.clientX; d.moved += Math.abs(dx);
      const k = 0.0105;
      stage.yaw += dx * k; stage.yawV = dx * k * 60;
    };
    const up = (e: PointerEvent) => {
      const d = st.current.drag; if (!d || e.pointerId !== d.id) return;
      st.current.drag = null;
      document.documentElement.classList.remove('mirage-drag');
      if (e.type === 'pointerup' && d.moved < 7) {
        if (d.part === 'lid') stage.lift = stage.lift ? 0 : 1;
        else if (stage.lift) stage.lift = 0;
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, []);

  const over = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); stage.over = true; gl.domElement.style.cursor = 'grab'; };
  const out = () => { stage.over = false; gl.domElement.style.cursor = ''; };
  const down = (part: 'lid' | 'base') => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    st.current.drag = { x: e.nativeEvent.clientX, moved: 0, part, id: e.nativeEvent.pointerId };
    document.documentElement.classList.add('mirage-drag');
  };
  const aim = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); st.current.aim = clamp(e.uv ? e.uv.x * 2 - 1 : 0, -1, 1); };
  // The image: it takes the pointer and does nothing with it. No cursor, no response.
  const nothing = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); if (stage.over) out(); };

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const s = st.current;
    s.t += rawDt;
    const f = clamp(stage.f, 0, SHOTS.length - 1);

    // The camera: a crane between seven positions, with weight.
    const i = Math.min(SHOTS.length - 2, Math.floor(f)), u = f - i;
    const e = u * u * (3 - 2 * u);
    const a = SHOTS[i], b = SHOTS[i + 1];
    const phone = stage.phone;
    const target = { az: a.az + (b.az - a.az) * e, el: a.el + (b.el - a.el) * e, d: a.d + (b.d - a.d) * e, ty: a.ty + (b.ty - a.ty) * e };
    if (phone) { target.el = Math.min(1.2, target.el + 0.14); target.d *= 1.16; }
    const c = s.cam, lam = still ? 1e6 : 2.4;
    c.az = damp(c.az, target.az, lam, dt); c.el = damp(c.el, target.el, lam, dt); c.d = damp(c.d, target.d, lam, dt); c.ty = damp(c.ty, target.ty, lam, dt);
    // The opening: the camera settles in as the lid comes down.
    const settle = still ? 0 : Math.max(0, 1 - s.t / 3.2);
    const ease = settle * settle;
    // With the top off, step back and up so the lifted mirror stays in frame.
    const off = clamp(stage.lid, 0, 1.2);
    const d = c.d * (1 - 0.08 * ease) + off * 1.9, el = c.el + 0.1 * ease, az = c.az - 0.25 * ease, ty = c.ty + off * 0.5;
    camera.position.set(Math.sin(az) * Math.cos(el) * d, ty + Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d);
    camera.lookAt(0, ty, 0);

    // The lid: a spring with a heavy, short landing.
    const end = f > SHOTS.length - 1.6;
    const want = s.t < 1.1 && !still ? 1 : stage.lift || end ? 1 : 0;
    if (still) { s.l = want; s.lv = 0; }
    else {
      s.lv += ((want - s.l) * 70 - s.lv * 10.5) * dt;
      s.l += s.lv * dt;
      if (s.l < 0) { s.l = 0; s.lv = Math.abs(s.lv) > 0.4 ? -s.lv * 0.12 : 0; }
    }
    stage.lid = s.l;
    const seated = s.l < 0.004;
    if (seated && !s.seated) { s.seated = true; stage.onSeated?.(); }
    if (seated === s.up) { s.up = !seated; stage.onLid?.(s.up); }
    if (lid.current) {
      lid.current.position.set(0, s.l * 1.32, -s.l * 0.12);
      lid.current.rotation.x = -s.l * 0.16;
    }
    // The image is there only while the mirrors are closed. It does not fade: it is or it is not.
    if (image.current) image.current.visible = seated;
    if (well.current) well.current.visible = seated;

    // Turning: inertia, and at Join it comes round to face you and stands still.
    if (!s.drag) {
      stage.yaw += stage.yawV * dt;
      stage.yawV *= Math.exp(-2.6 * dt);
      const face = Math.max(0, 1 - Math.abs(f - 5) * 1.6);
      if (face > 0) {
        const home = Math.round(stage.yaw / (Math.PI * 2)) * Math.PI * 2;
        stage.yaw = damp(stage.yaw, home, 3 * face, dt);
        stage.yawV *= 1 - face * 0.2;
      }
    }
    if (turn.current) turn.current.rotation.y = stage.yaw;

    // The rim answers the pointer: the whole object leans a little, like something heavy touched.
    const tilt = stage.over ? s.aim * 0.035 : 0;
    s.tiltV += ((tilt - s.tilt) * 90 - s.tiltV * 12) * dt;
    s.tilt += s.tiltV * dt;
    if (object.current) object.current.rotation.z = -s.tilt;
    void state;
  });

  const shell = { onPointerOver: over, onPointerOut: out, onPointerMove: aim };
  return (
    <group ref={object} position={[0, T + FOOT, 0]}>
      <group ref={turn}>
        {/* The base mirror. */}
        <group {...shell} onPointerDown={down('base')}>
          <mesh geometry={geo.outerBottom} material={kit.black} castShadow receiveShadow />
          <mesh geometry={geo.foot} material={kit.black} castShadow />
          <mesh geometry={geo.rim} material={kit.silver} />
        </group>
        <mesh geometry={geo.innerBottom} material={kit.silver} receiveShadow raycast={() => null} />
        {/* The real mark, at the bottom. Facing away: the image is turned half round. */}
        <mesh geometry={geo.small} material={kit.porcelain} rotation-y={Math.PI} position={[0, 0.004, 0]} castShadow raycast={() => null} />

        {/* The top mirror, with the opening. */}
        <group ref={lid}>
          <group {...shell} onPointerDown={down('lid')}>
            <mesh geometry={geo.outerLid} material={kit.black} castShadow receiveShadow />
            <mesh geometry={geo.rim} material={kit.silver} />
            <mesh geometry={geo.lip} material={kit.silver} />
          </group>
          <mesh geometry={geo.innerLid} material={kit.silver} raycast={() => null} />
          <mesh ref={well} geometry={geo.well} material={kit.dark} rotation-x={-Math.PI / 2} position={[0, LIP - 0.002, 0]} raycast={() => null} />
        </group>

        {/* The image. */}
        <group ref={image} position={[0, TOP - T * 0.55, 0]}>
          <mesh geometry={geo.mark} material={kit.image} raycast={() => null} />
          <mesh geometry={geo.halo} material={kit.halo} rotation-x={-Math.PI / 2} position={[0, T * 0.56, 0]} raycast={() => null} renderOrder={2} />
          <mesh geometry={geo.proxy} material={kit.proxy} position={[0, MARK_H / 2, 0]} onPointerOver={nothing} onPointerMove={nothing} onPointerDown={nothing} />
        </group>
      </group>
    </group>
  );
}

/* ─────────── the black sweep ─────────── */

function Sweep({ material }: { material: THREE.Material }) {
  const geometry = useMemo(() => {
    const zf = -5, Rr = 5;
    const prof: [number, number][] = [[60, 0], [zf, 0]];
    for (let i = 1; i <= 20; i++) { const a = (i / 20) * Math.PI / 2; prof.push([zf - Rr * Math.sin(a), Rr - Rr * Math.cos(a)]); }
    prof.push([zf - Rr, 80]);
    const pos: number[] = [], idx: number[] = [];
    prof.forEach(([z, y]) => { for (const x of [-80, 80]) pos.push(x, y, z); });
    for (let i = 0; i < prof.length - 1; i++) { const q = i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} receiveShadow />;
}

function Scene() {
  const kit = useMemo(makeKit, []);
  useEffect(() => () => { Object.values(kit).forEach((m) => { if (m instanceof THREE.Material) m.dispose(); }); kit.textures.forEach((t) => t.dispose()); }, [kit]);
  const low = stage.phone;
  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 13, 30]} />
      {/* One large soft key from above, a thin rim from behind, almost nothing else. */}
      <spotLight position={[0.8, 9, 1.6]} angle={0.3} penumbra={1} intensity={3.4} decay={0} color="#fff9ef" castShadow shadow-mapSize={low ? [512, 512] : [1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-radius={8} />
      <directionalLight position={[-1.5, 2.4, -7]} intensity={2.6} color="#eef0f6" />
      <ambientLight intensity={0.04} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#020202']} />
        {/* The key as three long strips overhead: long clean lines in the silver. */}
        {[-1.6, 0, 1.6].map((z) => <Lightformer key={z} form="rect" intensity={2.4} position={[0, 7, z]} rotation-x={Math.PI / 2} scale={[9, 0.7, 1]} />)}
        <Lightformer form="rect" intensity={2.6} position={[-6, 1.6, 0.5]} rotation-y={Math.PI / 2} scale={[0.5, 12, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[6, 1.6, -0.5]} rotation-y={-Math.PI / 2} scale={[0.3, 12, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[0, 1.2, -7]} scale={[14, 0.25, 1]} />
        <Lightformer form="rect" intensity={0.5} position={[0, 0.4, 7]} rotation-y={Math.PI} scale={[6, 0.8, 1]} />
      </Environment>
      <Sweep material={kit.floor} />
      <ContactShadows position={[0, 0.002, 0]} scale={5.5} resolution={low ? 256 : 512} blur={2.4} far={1.6} opacity={0.9} color="#000000" frames={still ? 1 : Infinity} />
      <Mirage kit={kit} />
    </>
  );
}

export default function Stage() {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, stage.phone ? 1.5 : 1.6]}
      camera={{ fov: 21, near: 0.1, far: 80, position: [5, 4, 10] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; }}
      style={{ touchAction: 'pan-y' }}
    >
      <Scene />
    </Canvas>
  );
}

