// Version 94's stage: a bronze arrow that must cover half the distance first.
// The arrow travels half the remaining gap at every step; the camera follows
// it in, scaled about the target's centre, so every frame is the same picture
// at a smaller scale. The scene never lets the point touch the plaster.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, DepthOfField, Vignette } from '@react-three/postprocessing';
import type { DepthOfFieldEffect } from 'postprocessing';
import * as THREE from 'three';
import { clamp, damp, still } from '@/lib/utils';
import { rig, want } from './rig';

/** The opening gap between point and plaster, in scene units. */
export const G0 = 1.6;
const SHAFT = 3.5;

/* ───────────── canvas textures ───────────── */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, r: () => number, s: number) => void, repeat: [number, number], color = false) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  draw(g, rng(size * 7 + repeat[0]), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeMaterials(low: boolean) {
  // Long scratches along the shaft: a cast and filed bronze.
  const brushed = canvasTex(256, (g, r, s) => {
    g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 2200; i++) { const c = r() < 0.5 ? 255 : 0; g.fillStyle = `rgba(${c},${c},${c},${0.04 + r() * 0.1})`; g.fillRect(r() * s - 40, r() * s, 20 + r() * 160, 1); }
  }, [6, 1]);
  // Patina: blotches of darker, rougher metal.
  const patina = canvasTex(256, (g, r, s) => {
    g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) {
      const x = r() * s, y = r() * s, rad = 4 + r() * 26, c = r() < 0.6 ? 40 : 220;
      for (const [ox, oy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        gr.addColorStop(0, `rgba(${c},${c},${c},0.22)`); gr.addColorStop(1, `rgba(${c},${c},${c},0)`);
        g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
    }
  }, [3, 1]);
  // Plaster: fine tooth, pinholes and a few drag marks from the trowel.
  const grain = canvasTex(low ? 256 : 512, (g, r, s) => {
    const im = g.createImageData(s, s);
    for (let i = 0; i < s * s; i++) { const v = 150 + (r() - 0.5) * 60; im.data.set([v, v, v, 255], i * 4); }
    g.putImageData(im, 0, 0);
    for (let i = 0; i < 340; i++) {
      const x = r() * s, y = r() * s, rad = 0.6 + r() * 2.4;
      g.fillStyle = `rgba(20,20,20,${0.35 + r() * 0.4})`; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 0.08;
    for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? '#fff' : '#000'; g.save(); g.translate(r() * s, r() * s); g.rotate(r() * Math.PI); g.fillRect(-60, 0, 120 + r() * 80, 1 + r() * 3); g.restore(); }
    g.globalAlpha = 1;
  }, [22, 22]);
  const tint = canvasTex(256, (g, r, s) => {
    g.fillStyle = '#e6dfd0'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) { const c = r() < 0.5 ? 'rgba(170,155,130,0.10)' : 'rgba(255,252,244,0.10)'; g.fillStyle = c; g.beginPath(); g.arc(r() * s, r() * s, 1 + r() * 7, 0, Math.PI * 2); g.fill(); }
  }, [22, 22], true);

  const bronze = new THREE.MeshPhysicalMaterial({ color: '#a87444', metalness: 1, roughness: 0.36, roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.15, clearcoat: 0.35, clearcoatRoughness: 0.25, envMapIntensity: 1.9 });
  const head = new THREE.MeshPhysicalMaterial({ color: '#d29a5e', metalness: 1, roughness: 0.27, roughnessMap: brushed, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: 2.4 });
  const fin = new THREE.MeshPhysicalMaterial({ color: '#5d4029', metalness: 1, roughness: 0.48, roughnessMap: patina, bumpMap: patina, bumpScale: 0.4, envMapIntensity: 1.6, side: THREE.DoubleSide });
  const band = new THREE.MeshPhysicalMaterial({ color: '#d29a5c', metalness: 1, roughness: 0.2, envMapIntensity: 1.6 });
  const plaster = new THREE.MeshStandardMaterial({ color: '#ffffff', map: tint, roughness: 0.94, roughnessMap: grain, bumpMap: grain, bumpScale: 1.4, envMapIntensity: 0.22 });
  return { bronze, head, fin, band, plaster, textures: [brushed, patina, grain, tint] };
}
type Mats = ReturnType<typeof makeMaterials>;

/* ───────────── geometry ───────────── */

/** A lathe profile around Y, turned to lie along -X (the arrow's body runs back from the tip). */
const alongX = (g: THREE.BufferGeometry) => { g.rotateZ(Math.PI / 2); return g; };

function headGeometry() {
  // A leaf blade, cut twice and crossed: four bevelled edges meeting at one point.
  const L = 0.46, W = 0.085, b = 0.006;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(-0.08, 0.018, -0.2, W, -0.3, W);
  s.bezierCurveTo(-0.36, W, -0.39, 0.04, -L + 0.02, 0.02);
  s.lineTo(-L, 0.02); s.lineTo(-L, -0.02); s.lineTo(-L + 0.02, -0.02);
  s.bezierCurveTo(-0.39, -0.04, -0.36, -W, -0.3, -W);
  s.bezierCurveTo(-0.2, -W, -0.08, -0.018, 0, 0);
  const depth = 0.006;
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.009, bevelSize: b, bevelSegments: 3, curveSegments: 28 });
  g.translate(-b, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

function finGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(-0.16, 0.01, -0.34, 0.11, -0.5, 0.135);
  s.lineTo(-0.6, 0.135);
  s.bezierCurveTo(-0.6, 0.08, -0.62, 0.03, -0.64, 0);
  s.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1, curveSegments: 20 });
  g.translate(0, 0, -0.0015);
  return g;
}

function shaftGeometry() {
  // Barrelled shaft: slightly fuller in the middle, tapering to the socket and the nock.
  const pts: THREE.Vector2[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N, y = 0.4 + t * (SHAFT - 0.4);
    const r = 0.019 + 0.0045 * Math.sin(Math.PI * Math.pow(t, 0.8));
    pts.push(new THREE.Vector2(r, y));
  }
  // The nock: a swell and a cut end.
  pts.push(new THREE.Vector2(0.025, SHAFT + 0.02), new THREE.Vector2(0.027, SHAFT + 0.07), new THREE.Vector2(0.016, SHAFT + 0.095), new THREE.Vector2(0.0, SHAFT + 0.095));
  pts.unshift(new THREE.Vector2(0.0, 0.4));
  return alongX(new THREE.LatheGeometry(pts, 48));
}

function socketGeometry() {
  const pts = [new THREE.Vector2(0, 0.3), new THREE.Vector2(0.006, 0.3), new THREE.Vector2(0.024, 0.38), new THREE.Vector2(0.028, 0.42), new THREE.Vector2(0.027, 0.47), new THREE.Vector2(0.021, 0.48), new THREE.Vector2(0, 0.48)];
  return alongX(new THREE.LatheGeometry(pts, 48));
}

function targetGeometry() {
  // A thick plaster disc with shallow V-cut rings in its face. Face at y = 0, back at y = -T.
  const R = 0.62, T = 0.17, e = 0.035;
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, -T), new THREE.Vector2(R - e, -T)];
  for (let i = 1; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; pts.push(new THREE.Vector2(R - e + e * Math.sin(a), -T + e - e * Math.cos(a))); }
  pts.push(new THREE.Vector2(R, -e));
  for (let i = 1; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; pts.push(new THREE.Vector2(R - e + e * Math.cos(a), -e + e * Math.sin(a))); }
  const rings = [0.5, 0.38, 0.26, 0.14];
  for (const r of rings) {
    const w = 0.009, d = 0.005;
    pts.push(new THREE.Vector2(r + w, 0), new THREE.Vector2(r + w * 0.35, -d), new THREE.Vector2(r - w * 0.35, -d), new THREE.Vector2(r - w, 0));
  }
  pts.push(new THREE.Vector2(0.03, 0), new THREE.Vector2(0, 0));
  const g = new THREE.LatheGeometry(pts, 160);
  // Planar UVs across the face, so the grain is even right where the point aims.
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.3 + 0.5, p.getZ(i) / 1.3 + 0.5);
  uv.needsUpdate = true;
  return alongX(g);
}

/* ───────────── the arrow and the target ───────────── */

function Arrow({ M, group }: { M: Mats; group: React.RefObject<THREE.Group | null> }) {
  const geo = useMemo(() => ({ head: headGeometry(), fin: finGeometry(), shaft: shaftGeometry(), socket: socketGeometry() }), []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  const fins = [0, 1, 2].map((i) => (i / 3) * Math.PI * 2 + Math.PI / 6);
  return (
    <group ref={group}>
      <mesh geometry={geo.head} material={M.head} castShadow receiveShadow />
      <mesh geometry={geo.head} material={M.head} castShadow receiveShadow rotation-x={Math.PI / 2} />
      <mesh geometry={geo.socket} material={M.bronze} castShadow receiveShadow />
      <mesh geometry={geo.shaft} material={M.bronze} castShadow receiveShadow />
      {[2.62, 2.66, 3.4].map((x) => (
        <mesh key={x} material={M.band} position-x={-x} rotation-y={Math.PI / 2} castShadow>
          <torusGeometry args={[0.0235, 0.0034, 10, 40]} />
        </mesh>
      ))}
      {fins.map((a) => (
        <group key={a} rotation-x={a}>
          <mesh geometry={geo.fin} material={M.fin} position={[-2.74, 0.019, 0]} castShadow receiveShadow />
        </group>
      ))}
    </group>
  );
}

/* ───────────── backdrop: a soft pool of light on a far gallery wall ───────────── */

function Wall() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(256, 200, 10, 256, 256, 300);
    gr.addColorStop(0, '#2a2721'); gr.addColorStop(0.45, '#181713'); gr.addColorStop(1, '#0c0c0b');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    // A little noise so the pool does not band.
    const im = g.getImageData(0, 0, 512, 512); const r = rng(9);
    for (let i = 0; i < im.data.length; i += 4) { const n = (r() - 0.5) * 5; im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n; }
    g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={[-0.6, 0.2, -9]}>
      <planeGeometry args={[34, 34]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

/* ───────────── the rig: steps, springs, camera, lights ───────────── */

type Frame = { look: THREE.Vector3; dir: THREE.Vector3; dist: number; key: THREE.Vector3; rot: number };
const FRAMES: Record<'wide' | 'tall', Frame> = {
  // Wide: the arrow flies left to right, seen from front left, a little above.
  wide: { look: new THREE.Vector3(-1.42, 0.06, 0), dir: new THREE.Vector3(-0.36, 0.2, 1).normalize(), dist: 13.4, key: new THREE.Vector3(-0.85, 1, 0.35).normalize(), rot: 0 },
  // Tall: the arrow flies down the screen toward a target at the bottom.
  tall: { look: new THREE.Vector3(0, 1.38, 0), dir: new THREE.Vector3(0.18, 0.34, 1).normalize(), dist: 14, key: new THREE.Vector3(0.3, 1, 0.55).normalize(), rot: -Math.PI / 2 },
};

function Rig({ M, tall, low }: { M: Mats; tall: boolean; low: boolean }) {
  const F = FRAMES[tall ? 'tall' : 'wide'];
  const world = useRef<THREE.Group>(null), arrow = useRef<THREE.Group>(null), target = useRef<THREE.Mesh>(null);
  const key = useRef<THREE.DirectionalLight>(null), rim = useRef<THREE.DirectionalLight>(null), gap = useRef<THREE.PointLight>(null);
  const dof = useRef<DepthOfFieldEffect>(null);
  const { camera } = useThree();
  const tg = useMemo(() => targetGeometry(), []);
  useEffect(() => () => tg.dispose(), [tg]);
  const st = useRef({ u: 0, uv: 0, c: still ? 0 : 0.55, t: 0, last: -9, lit: still ? 1 : 0, yaw: 0, pitch: 0, glow: 0, q: 0, h: 0 });
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler(), m: new THREE.Matrix4() }), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20), s = st.current;
    s.t += dt;
    const now = performance.now() / 1000;
    // Step toward the level the page asks for, one halving at a time.
    const w = want();
    if (still) { rig.step = w; }
    else if (rig.step < w && now - s.last > 0.42) { rig.step++; s.last = now; s.uv -= 2.4; s.q = 0.022; }
    else if (rig.step > w && now - s.last > 0.1) { rig.step--; s.last = now; }
    if (rig.onStep) rig.onStep(rig.step);

    // The arrow: a stiff spring in log space. Fast, a tiny overshoot, a settle.
    const goal = -rig.step;
    if (still) { s.u = goal; s.uv = 0; }
    else { const k = 260, d = 21; s.uv += (k * (goal - s.u) - d * s.uv) * dt; s.u += s.uv * dt; }
    // The camera: slower, so you see the arrow close in before the frame resets.
    if (still) s.c = s.u; else s.c = damp(s.c, s.u, s.t < 1.2 ? 0.8 : 2.1, dt);
    s.lit = still ? 1 : damp(s.lit, 1, 1.6, dt);
    s.glow = still ? rig.glow : damp(s.glow, rig.glow, 2.5, dt);

    const g = G0 * Math.pow(2, s.u);          // the gap, scene units
    const S = Math.pow(2, s.c);               // the frame's scale

    // The shaft flexes after every lunge and quivers under the pointer, pivoting on its point.
    s.q *= Math.exp(-3.2 * dt);
    s.h = damp(s.h, rig.hover && !still ? 1 : 0, 6, dt);
    if (arrow.current) {
      arrow.current.position.x = -g;
      const amp = still ? 0 : s.q + s.h * 0.0035;
      arrow.current.rotation.y = amp * Math.sin(now * 29);
      arrow.current.rotation.z = amp * 0.6 * Math.sin(now * 23 + 1.3);
    }
    if (world.current) world.current.rotation.z = F.rot;

    // Orbit: drag holds, release eases home.
    const back = !rig.held && performance.now() - rig.releasedAt > 1400;
    if (back) { rig.yaw = damp(rig.yaw, 0, 1.6, dt); rig.pitch = damp(rig.pitch, 0, 1.6, dt); }
    s.yaw = still ? rig.yaw : damp(s.yaw, rig.yaw, 7, dt);
    s.pitch = still ? rig.pitch : damp(s.pitch, rig.pitch, 7, dt);

    const look = tmp.a.copy(F.look).multiplyScalar(S);
    tmp.e.set(s.pitch, s.yaw, 0, 'YXZ'); tmp.q.setFromEuler(tmp.e);
    const dir = tmp.b.copy(F.dir).applyQuaternion(tmp.q);
    const dist = F.dist * S;
    camera.position.copy(look).addScaledVector(dir, dist);
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    const pc = camera as THREE.PerspectiveCamera;
    pc.near = dist * 0.4; pc.far = dist * 2.2 + 14; pc.updateProjectionMatrix();

    // Key light from above and behind the arrow; its shadow box scales with the frame.
    const kl = key.current;
    if (kl) {
      kl.position.copy(look).addScaledVector(F.key, 8 * S);
      kl.target.position.copy(look); kl.target.updateMatrixWorld();
      const half = 2.6 * S, cam = kl.shadow.camera as THREE.OrthographicCamera;
      cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half; cam.near = 0.5 * S; cam.far = 16 * S; cam.updateProjectionMatrix();
      kl.shadow.normalBias = 0.004 * S;
      // The point's shadow on the plaster sharpens as the frame closes in.
      kl.shadow.radius = 1.5 + 4 * clamp(1 - rig.step / 6);
      kl.intensity = 3.6 * s.lit;
    }
    if (rim.current) { rim.current.position.copy(look).add(tmp.b.set(tall ? 3 : 4, tall ? -1 : 2.5, -5).multiplyScalar(S)); rim.current.target.position.copy(look); rim.current.target.updateMatrixWorld(); rim.current.intensity = 2.2 * s.lit; }
    // The sliver of light between the point and the plaster.
    if (gap.current && world.current) {
      gap.current.position.set(-g * 0.45, 0, 0).applyEuler(world.current.rotation);
      gap.current.position.addScaledVector(F.dir, g * 0.5);
      gap.current.distance = g * 2.6;
      gap.current.intensity = 14 * s.glow;
    }
    // Long lens, shallow focus: the point and the plaster sharp, the tail soft.
    const fx = dof.current;
    if (fx) {
      const focus = tmp.a.set(-g * 0.5, 0, 0).applyEuler(world.current!.rotation);
      const fd = camera.position.distanceTo(focus);
      fx.cocMaterial.focusDistance = fd;
      fx.cocMaterial.focusRange = fd * 0.07;
    }
  });

  return (
    <>
      <group ref={world}>
        <Arrow M={M} group={arrow} />
        <mesh ref={target} geometry={tg} material={M.plaster} castShadow receiveShadow />
      </group>
      <directionalLight ref={key} castShadow color="#fff3e2" shadow-mapSize={low ? [1024, 1024] : [2048, 2048]} shadow-bias={-0.0002} />
      <directionalLight ref={rim} color="#dfe6ff" />
      <pointLight ref={gap} color="#fff4dc" decay={0} />
      <ambientLight intensity={0.05} />
      <Wall />
      {!low && (
        <EffectComposer multisampling={4}>
          <DepthOfField ref={dof} focusDistance={10} focusRange={1} bokehScale={3.2} />
          <Vignette offset={0.32} darkness={0.55} />
        </EffectComposer>
      )}
    </>
  );
}

export default function Stage({ tall, low, onReady }: { tall: boolean; low: boolean; onReady?: () => void }) {
  const M = useMemo(() => makeMaterials(low), [low]);
  useEffect(() => () => { Object.values(M).forEach((m) => { if (m instanceof THREE.Material) m.dispose(); }); M.textures.forEach((t) => t.dispose()); }, [M]);
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={low ? [1, 1.5] : [1, 1.6]}
      camera={{ fov: 13, position: [0, 0, 20], near: 1, far: 60 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; onReady?.(); }}
      style={{ touchAction: 'pan-y' }}
    >
      <color attach="background" args={['#0c0c0b']} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[8, 4, 1]} color="#fff2e0" />
        <Lightformer form="rect" intensity={1.1} position={[-6, 1, 3]} rotation-y={Math.PI / 2} scale={[1.2, 8, 1]} color="#fff" />
        <Lightformer form="rect" intensity={1.6} position={[5, 2, -5]} rotation-y={-Math.PI / 3} scale={[6, 0.8, 1]} color="#e8eeff" />
        <Lightformer form="rect" intensity={1.3} position={[0, 1.5, 7]} scale={[16, 7, 1]} color="#ffe6c8" />
        <Lightformer form="rect" intensity={2.2} position={[-2, 4, 5]} rotation-x={-Math.PI / 5} scale={[5, 0.7, 1]} color="#fff" />
        <Lightformer form="rect" intensity={0.5} position={[0, -5, 2]} rotation-x={-Math.PI / 2} scale={[10, 3, 1]} color="#3a3228" />
      </Environment>
      <Rig M={M} tall={tall} low={low} />
    </Canvas>
  );
}
