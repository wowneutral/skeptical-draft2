// The stone: a bone white marble disc with one groove cut into it and one
// black ball. The disc tilts toward the pointer, the ball rolls along the
// groove with momentum and friction, knocks at the turns, stops at the gate,
// and at the end drops into the centre as the dot of a cut question mark.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { createNoise2D } from 'simplex-noise';
import MARKS from '@/lib/marks.json';
import { clamp, damp, still } from '@/lib/utils';
import { BALL, DEPTH, DROP, RHO, at, outline, road, setDot, stops } from './path';
import { maze } from './store';

const TH = 0.2; // the stone's thickness below the groove floor

// ---- The question mark in the centre, from the brand's own Bodoni mark.
const Q = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${MARKS.italic.d}"/></svg>`;
  const shapes = new SVGLoader().parse(svg).paths.flatMap((p) => SVGLoader.createShapes(p));
  const box = new THREE.Box2();
  const parts = shapes.map((s) => { const pts = s.getPoints(24); pts.forEach((p) => box.expandByPoint(p)); return { s, pts, area: Math.abs(THREE.ShapeUtils.area(pts)) }; });
  parts.sort((a, b) => b.area - a.area);
  const c = box.getCenter(new THREE.Vector2()), k = 0.36 / (box.max.y - box.min.y);
  const ox = 0.012, oz = -0.03; // nudge the mark so the hook sits in the middle of the centre
  const map = (p: THREE.Vector2) => new THREE.Vector2((p.x - c.x) * k + ox, -((p.y - c.y) * k + oz));
  const hook = parts[0];
  const shape = new THREE.Shape(hook.pts.map(map));
  hook.s.holes.forEach((h) => shape.holes.push(new THREE.Path(h.getPoints(24).map(map))));
  const dot = parts[1] ? parts[1].pts.reduce((a, p) => a.add(p), new THREE.Vector2()).divideScalar(parts[1].pts.length) : new THREE.Vector2(c.x, box.max.y - 100);
  const dw = { x: (dot.x - c.x) * k + ox, z: (dot.y - c.y) * k + oz };
  return { shape, dot: dw };
})();
setDot(Q.dot.x, Q.dot.z);
const STOPS = stops();

// ---- Marble, drawn once on a canvas: a warm bone ground, a faint grain, a few soft veins.
function marble() {
  const N = 1024, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const rc = document.createElement('canvas'); rc.width = rc.height = N;
  const g = cv.getContext('2d')!, gr = rc.getContext('2d')!;
  const img = g.createImageData(N, N), rough = gr.createImageData(N, N);
  const n2 = createNoise2D(() => 0.31), n3 = createNoise2D(() => 0.77);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    let f = 0, a = 1, fr = 2.2; for (let o = 0; o < 4; o++) { f += a * n2(u * fr, v * fr); a *= 0.5; fr *= 2.1; }
    const vein = Math.pow(1 - Math.abs(Math.sin((u * 1.3 + v * 0.55) * 7 + f * 3.2)), 14);
    const hair = Math.pow(1 - Math.abs(n3(u * 9 + f, v * 9 - f)), 26);
    const grain = (Math.random() - 0.5) * 7 + n3(u * 140, v * 140) * 3;
    const d = vein * 20 + hair * 16 - f * 5 + grain;
    const i = (y * N + x) * 4;
    img.data[i] = 242 - d; img.data[i + 1] = 238 - d * 1.04; img.data[i + 2] = 229 - d * 1.12; img.data[i + 3] = 255;
    const r = 150 + f * 26 + grain * 2 + vein * 40;
    rough.data[i] = rough.data[i + 1] = rough.data[i + 2] = r; rough.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); gr.putImageData(rough, 0, 0);
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace;
  const rmap = new THREE.CanvasTexture(rc);
  for (const t of [map, rmap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  return { map, rmap };
}
/** Top faces get planar UVs across the whole disc, so the veins run on through the walls. */
function planarUV(geo: THREE.BufferGeometry, axisY: boolean) {
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) * 0.5 + 0.5; uv[i * 2 + 1] = (axisY ? p.getY(i) : p.getZ(i)) * 0.5 + 0.5; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
/** Wall faces get the grain laid along them, so they don't streak. */
function sideUV(geo: THREE.BufferGeometry) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) if (Math.abs(n.getY(i)) < 0.5) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i), along = Math.abs(n.getX(i)) > Math.abs(n.getZ(i)) ? z : x;
    uv.setXY(i, along * 0.5 + 0.5, y * 3 + x * 0.21 + z * 0.37);
  }
  uv.needsUpdate = true;
}
/** The rim of the body gets its grain wrapped round it, not smeared down it. */
function rimUV(geo: THREE.BufferGeometry) {
  const p = geo.attributes.position, uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    if (Math.hypot(x, z) > 0.985 && y < -0.004) uv.setXY(i, Math.atan2(x, z) / Math.PI * 1.6, y * 1.6 + 0.3);
  }
  uv.needsUpdate = true;
}
function blob() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function useStone() {
  return useMemo(() => {
    const { map, rmap } = marble();
    // The walls: the disc with the whole path cut out as one hole, extruded with a bevel.
    const outer = new THREE.Shape(); outer.absarc(0, 0, 0.994, 0, Math.PI * 2, false);
    const line = outline().map((p) => new THREE.Vector2(p.x, -p.z));
    outer.holes.push(new THREE.Path(line));
    const BT = 0.007, BS = 0.006;
    const walls = new THREE.ExtrudeGeometry(outer, { depth: DEPTH - BT, bevelEnabled: true, bevelThickness: BT, bevelSize: BS, bevelSegments: 3, curveSegments: 160 });
    walls.rotateX(-Math.PI / 2);
    walls.computeVertexNormals();
    planarUV(walls, false);
    sideUV(walls);
    // The body of the stone: floor, rim, a softened bottom edge, and the sunken centre.
    const prof = [[0, -TH], [0.975, -TH], [0.992, -TH + 0.008], [1.0, -TH + 0.026], [1.0, -0.002], [0.994, 0], [RHO, 0], [RHO, -DROP], [0, -DROP]].map(([x, y]) => new THREE.Vector2(x, y));
    const body = new THREE.LatheGeometry(prof, 160);
    planarUV(body, false);
    rimUV(body);
    // The cut question mark, inlaid in black.
    const inlay = new THREE.ExtrudeGeometry(Q.shape, { depth: 0.002, bevelEnabled: false, curveSegments: 12 });
    inlay.rotateX(-Math.PI / 2);
    const mats = {
      top: new THREE.MeshPhysicalMaterial({ map, roughnessMap: rmap, roughness: 0.62, clearcoat: 0.22, clearcoatRoughness: 0.35, envMapIntensity: 0.7 }),
      side: new THREE.MeshStandardMaterial({ map, color: '#e4dccd', roughness: 0.8, envMapIntensity: 0.55 }),
      floor: new THREE.MeshStandardMaterial({ map, color: '#d8cfbe', roughnessMap: rmap, roughness: 0.92, envMapIntensity: 0.5 }),
      ink: new THREE.MeshPhysicalMaterial({ color: '#100f0d', roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.12 }),
      ball: new THREE.MeshPhysicalMaterial({ color: '#0b0b0a', roughness: 0.09, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6 }),
      gate: new THREE.MeshPhysicalMaterial({ color: '#171513', roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
      blob: new THREE.MeshBasicMaterial({ map: blob(), transparent: true, depthWrite: false, opacity: 0.55 }),
    };
    return { walls, body, inlay, mats };
  }, []);
}

type Sim = { s: number; v: number; y: number; vy: number; tilt: THREE.Vector2; tv: THREE.Vector2; jolt: THREE.Vector2; jv: THREE.Vector2; gate: number; rested: boolean; reset: number; t: number };

function Scene() {
  const { walls, body, inlay, mats } = useStone();
  const pivot = useRef<THREE.Group>(null), disc = useRef<THREE.Group>(null), ball = useRef<THREE.Mesh>(null), shade = useRef<THREE.Mesh>(null), gate = useRef<THREE.Mesh>(null);
  const { camera, size, gl } = useThree();
  const cam = useRef({ el: 0, az: 0, d: 0, tx: 0, tz: 0, ty: 0, init: false });
  const sim = useRef<Sim>({ s: STOPS[0], v: 0, y: still ? BALL : 1.1, vy: 0, tilt: new THREE.Vector2(), tv: new THREE.Vector2(), jolt: new THREE.Vector2(), jv: new THREE.Vector2(), gate: 0, rested: false, reset: 0, t: 0 });

  useEffect(() => { maze.ready = true; return () => { maze.ready = false; }; }, []);
  useEffect(() => { gl.domElement.style.touchAction = 'pan-y'; }, [gl]);

  useFrame((_, dtRaw) => {
    const S = sim.current, dt = Math.min(dtRaw, 1 / 15), camDt = Math.min(dtRaw, 0.25), sec = Math.min(maze.sec, 5);
    S.t += dt;
    const target = STOPS[sec];
    const gateOpen = sec >= 4 || S.s > road.sGate + 0.02;

    if (still) {
      // Reduced motion: the stone stays level and the ball is placed, not rolled.
      S.s = target; S.v = 0; S.y = S.s > road.sCentre ? BALL - DROP : BALL; S.gate = gateOpen ? 1 : 0; S.tilt.set(0, 0); S.rested = sec === 5;
    } else {
      if (maze.warp >= 0) { S.s = maze.warp; S.v = 0; maze.warp = -1; }
      if (maze.reset !== S.reset) { S.reset = maze.reset; S.s = STOPS[0]; S.v = 0; S.y = 0.9; S.vy = 0; S.rested = false; maze.onRest?.(false); }
      const here = at(S.s);
      // What tilts the stone: the pointer, a drag or a held finger, the arrow keys, and the page nudging the ball on.
      const want = new THREE.Vector2();
      const p = maze.pointer, user = p.down || performance.now() - maze.keys.t < 450;
      if (p.on || p.down) {
        const hx = p.x / (size.width * 0.5), hy = p.y / (size.height * 0.5);
        const m = Math.hypot(hx, hy), reach = p.down ? 1 : clamp(1.5 - m * 0.75, 0, 1);
        if (m > 0.02) want.set(hx / Math.max(m, 0.35), hy / Math.max(m, 0.35)).multiplyScalar(Math.min(1, m / 0.35) * (p.down ? 0.13 : 0.045) * reach);
      }
      if (performance.now() - maze.keys.t < 450) want.add(new THREE.Vector2(maze.keys.x, maze.keys.z).multiplyScalar(0.11));
      if (!user && !S.rested && S.s < target - 0.004) {
        const vd = Math.min(1.25, (target - S.s) * 1.7 + 0.06);
        const acc = clamp((vd - S.v) * 2.4, -0.5, 0.75);
        want.add(new THREE.Vector2(here.tx, here.tz).multiplyScalar(acc / 7));
      }
      if (want.length() > 0.15) want.setLength(0.15);
      // The stone is heavy: a spring with a little overshoot, plus the jolt of each knock.
      S.tv.add(want.clone().sub(S.tilt).multiplyScalar(42 * dt)).multiplyScalar(Math.exp(-8.5 * dt));
      S.tilt.addScaledVector(S.tv, dt);
      S.jv.addScaledVector(S.jolt, -260 * dt).multiplyScalar(Math.exp(-14 * dt));
      S.jolt.addScaledVector(S.jv, dt);

      // The ball: falls if it is in the air, rolls if it is in the groove.
      const floor = (S.s > road.sCentre ? -DROP : 0) + BALL;
      if (S.y > floor + 1e-4 || S.vy > 0) {
        S.vy -= 6.5 * dt; S.y += S.vy * dt;
        if (S.y <= floor) { const hit = -S.vy; S.y = floor; S.vy = hit > 0.25 ? hit * 0.32 : 0; if (hit > 0.2) S.jv.add(new THREE.Vector2(here.x, here.z).multiplyScalar(-0.02 * hit)); }
      }
      if (S.rested) { S.v = 0; S.s = road.len; }
      else {
        const tilt = S.tilt.clone().add(S.jolt);
        const steps = 6, h = dt / steps;
        for (let k = 0; k < steps; k++) {
          const a = at(S.s), drive = 7 * (tilt.x * a.tx + tilt.y * a.tz);
          let acc = drive - S.v * 0.55 - Math.sign(S.v) * 0.04;
          if (Math.abs(S.v) < 0.03 && Math.abs(drive) < 0.14) { S.v = 0; acc = 0; }
          const prev = S.s;
          S.v += acc * h; S.s += S.v * h;
          // A soft knock at every turn of the path.
          for (const c of road.corners) if ((prev < c) !== (S.s < c) && Math.abs(S.v) > 0.22) {
            S.jv.add(new THREE.Vector2(a.tx, a.tz).multiplyScalar(0.05 * S.v)); S.v *= 0.62;
          }
          // The gate stops it until the page opens it.
          const gs = road.sGate - BALL - 0.01;
          if (S.gate < 0.5 && prev <= gs && S.s > gs) { S.s = gs; S.jv.add(new THREE.Vector2(a.tx, a.tz).multiplyScalar(0.04 * S.v)); S.v = -S.v * 0.22; }
          // The step down into the centre can't be climbed back.
          if (S.y < BALL - DROP * 0.5 && S.s < road.sCentre + BALL * 0.6) { S.s = road.sCentre + BALL * 0.6; S.v = Math.abs(S.v) * 0.25; }
          if (S.s < BALL) { S.s = BALL; S.v = Math.abs(S.v) * 0.3; }
          if (S.s >= road.len) { S.s = road.len; S.v = -Math.abs(S.v) * 0.18; }
        }
        if (S.s > road.len - 0.012 && Math.abs(S.v) < 0.08 && S.y < BALL - DROP + 0.002) { S.rested = true; maze.onRest?.(true); S.jv.add(new THREE.Vector2(0.004, 0.006)); }
      }
      S.gate = damp(S.gate, gateOpen ? 1 : 0, 3.2, dt);
    }
    maze.s = S.s; maze.resting = S.rested;

    // Apply: tilt the stone about its foot, lift it so the low edge stays on the floor.
    const T = S.tilt.clone().add(S.jolt), mag = T.length();
    if (pivot.current && disc.current) {
      disc.current.rotation.set(T.y, 0, -T.x);
      pivot.current.position.y = -TH + Math.sin(mag) * 1.0;
    }
    const b = at(S.s);
    if (ball.current) { ball.current.position.set(b.x, S.y, b.z); ball.current.rotation.x += (S.v * dt) / BALL * (b.tz || 0); ball.current.rotation.z -= (S.v * dt) / BALL * (b.tx || 0); }
    if (shade.current) {
      const fl = S.s > road.sCentre + 0.02 ? -DROP : 0, up = Math.max(0, S.y - BALL - fl);
      shade.current.position.set(b.x + 0.004, fl + 0.0015, b.z + 0.006);
      const sc = 0.085 * (1 + up * 3); shade.current.scale.set(sc, sc, sc);
      (shade.current.material as THREE.MeshBasicMaterial).opacity = 0.55 / (1 + up * 12);
    }
    if (gate.current) gate.current.position.y = (DEPTH + 0.034) / 2 - S.gate * (DEPTH + 0.04);

    // The camera: above at a slight angle; down at the rim for the record; straight above at the end.
    const phone = maze.phone, aspect = size.width / size.height;
    const fit = 1.12 / Math.tan(THREE.MathUtils.degToRad(11)) / Math.min(1, aspect) * (phone ? 1.07 : 1.17);
    const pose = phone
      ? [{ el: 84, az: 0, d: fit, t: [0, 0, 0.02] }, { el: 84, az: 0, d: fit, t: [0, 0, 0.02] }, { el: 22, az: 8, d: 1.7, t: [0, 0, -0.1] }, { el: 72, az: 0, d: fit * 0.62, t: [0, 0, -0.2] }, { el: 84, az: 0, d: fit, t: [0, 0, 0.02] }, { el: 89, az: 0, d: fit * 0.98, t: [0, 0, 0] }][sec]
      : [{ el: 50, az: -10, d: fit, t: [0, -0.04, 0.02] }, { el: 56, az: 8, d: fit * 0.98, t: [0, -0.04, 0] }, { el: 16, az: 9, d: 1.5, t: [-0.02, 0.02, -0.1] }, { el: 58, az: -6, d: fit * 0.6, t: [0, 0, -0.22] }, { el: 46, az: -16, d: fit, t: [0, -0.04, 0.02] }, { el: 86, az: 0, d: fit * 0.96, t: [0, -0.02, 0] }][sec];
    const C = cam.current, k = still || !C.init ? 1 : 1 - Math.exp(-1.5 * camDt);
    C.init = true;
    C.el += (pose.el - C.el) * k; C.az += (pose.az - C.az) * k; C.d += (pose.d - C.d) * k;
    C.tx += (pose.t[0] - C.tx) * k; C.ty += (pose.t[1] - C.ty) * k; C.tz += (pose.t[2] - C.tz) * k;
    const el = THREE.MathUtils.degToRad(C.el), az = THREE.MathUtils.degToRad(C.az);
    camera.position.set(C.tx + C.d * Math.sin(az) * Math.cos(el), C.ty + C.d * Math.sin(el), C.tz + C.d * Math.cos(az) * Math.cos(el));
    camera.lookAt(C.tx, C.ty, C.tz);
  });

  const g = road.gate;
  return (
    <>
      <group ref={pivot} position={[0, -TH, 0]}>
        <group ref={disc}>
          <group position={[0, TH, 0]}>
            <mesh geometry={walls} material={[mats.top, mats.side]} castShadow receiveShadow />
            <mesh geometry={body} material={mats.floor} castShadow receiveShadow />
            <mesh geometry={inlay} material={mats.ink} position={[0, -DROP + 0.0002, 0]} receiveShadow />
            <mesh ref={gate} material={mats.gate} position={[g.x, DEPTH / 2, g.z]} castShadow receiveShadow>
              <boxGeometry args={[0.022, DEPTH + 0.034, 0.1]} />
            </mesh>
            <mesh ref={ball} material={mats.ball} castShadow>
              <sphereGeometry args={[BALL, 48, 32]} />
            </mesh>
            <mesh ref={shade} material={mats.blob} rotation-x={-Math.PI / 2} renderOrder={2}>
              <planeGeometry args={[1, 1]} />
            </mesh>
          </group>
        </group>
      </group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -TH - 0.001, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <shadowMaterial opacity={0.16} color="#3a3022" />
      </mesh>
      <ContactShadows position={[0, -TH, 0]} scale={3.2} resolution={256} blur={2.6} opacity={0.5} far={0.6} color="#2b241a" frames={still ? 1 : Infinity} />
    </>
  );
}

function Key() {
  const ref = useRef<THREE.DirectionalLight>(null);
  useEffect(() => { const l = ref.current; if (!l) return; l.target.position.set(0, 0, 0); l.target.updateMatrixWorld(); }, []);
  return (
    <directionalLight ref={ref} position={[-2.7, 1.75, -1.5]} intensity={4.1} color="#fff1dc" castShadow
      shadow-mapSize={[maze.phone ? 1024 : 2048, maze.phone ? 1024 : 2048]} shadow-bias={-0.0003} shadow-normalBias={0.012}
      shadow-camera-left={-1.5} shadow-camera-right={1.5} shadow-camera-top={1.5} shadow-camera-bottom={-1.5} shadow-camera-near={0.5} shadow-camera-far={8} />
  );
}

export default function Stone() {
  return (
    <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.6]} gl={{ alpha: true, antialias: true }} camera={{ fov: 22, near: 0.05, far: 40, position: [0, 5, 4] }}
      onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMappingExposure = 1.05; }}>
      <hemisphereLight args={['#f6f1e7', '#a89f90', 0.6]} />
      <Key />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={1.6} color="#fff8ee" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="circle" intensity={14} color="#ffffff" position={[-1.6, 4.2, 2.2]} scale={[0.9, 0.9, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.4} color="#fff0dc" position={[-6, 2, -3]} rotation-y={Math.PI / 2.6} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#e8e2d6" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[30, 30, 1]} />
      </Environment>
      <Scene />
    </Canvas>
  );
}

