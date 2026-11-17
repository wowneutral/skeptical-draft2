// The pinscreen: a heavy matte black frame holding thousands of polished steel
// pins, almost face on under one raking warm light. Something you never see
// presses up from behind; the pins rise into its shape. Your hand presses them down.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer, useGLTF } from '@react-three/drei';
import { DepthOfField, EffectComposer, N8AO } from '@react-three/postprocessing';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, damp, still } from '@/lib/utils';
import { stage } from './stage';
import { eightField, makeGrid, markField, PITCH, plaqueFields, slabFields, type Grid } from './fields';

const BG = '#0b0b0c';
const AMP = 0.62;          // full rise of a pin, world units
const BORDER = 0.62;       // frame width
const HEAD_URL = `${import.meta.env.BASE_URL}models/head.glb`;

type Fields = { mark: Float32Array; eight: Float32Array; plaques: Float32Array[]; slabs: Float32Array[]; head: Float32Array; headReady: { v: boolean } };

/* ---------- materials ---------- */

function noiseTexture(seed: number, base: number, spread: number) {
  const S = 256, c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d')!; const img = g.createImageData(S, S);
  let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < S * S; i++) { const v = Math.round((base + (rnd() - 0.5) * spread) * 255); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  g.filter = 'blur(1px)'; g.drawImage(c, 0, 0); g.filter = 'none';
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.repeat.set(3, 3);
  return t;
}

function steel() {
  const m = new THREE.MeshPhysicalMaterial({ color: '#c9cbce', metalness: 1, roughness: 0.15, envMapIntensity: 1.2 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aH; attribute float aR; varying float vAO; varying float vR;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.z += aH;
        float shaft = smoothstep(-0.5, -0.004, position.z);
        vAO = mix(0.12, 1.0, shaft) * mix(0.45, 1.0, smoothstep(-0.32, 0.04, aH));
        vR = aR;`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAO; varying float vR;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.88, 1.05, vR);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (vR - 0.5) * 0.1, 0.08, 1.0);')
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        reflectedLight.indirectDiffuse *= vAO; reflectedLight.indirectSpecular *= vAO;
        reflectedLight.directDiffuse *= mix(0.35, 1.0, vAO); reflectedLight.directSpecular *= mix(0.35, 1.0, vAO);`);
  };
  m.customProgramCacheKey = () => 'pins-steel';
  return m;
}

function steelDepth() {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aH;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += aH;');
  };
  m.customProgramCacheKey = () => 'pins-depth';
  return m;
}

/** One pin: a long thin shaft along z with a low domed head at z = 0. */
function pinGeometry(phone: boolean) {
  const r = PITCH * 0.47, seg = phone ? 10 : 14;
  const shaft = new THREE.CylinderGeometry(PITCH * 0.17, PITCH * 0.17, 0.6, phone ? 5 : 6, 1, true);
  shaft.rotateX(Math.PI / 2); shaft.translate(0, 0, -0.3 - 0.004);
  const head = new THREE.SphereGeometry(r, seg, phone ? 4 : 5, 0, Math.PI * 2, 0, Math.PI / 2);
  head.rotateX(Math.PI / 2); head.scale(1, 1, 0.56);
  const rim = new THREE.CylinderGeometry(r, r * 0.94, 0.012, seg, 1, true);
  rim.rotateX(Math.PI / 2); rim.translate(0, 0, -0.006);
  const under = new THREE.CircleGeometry(r * 0.94, seg);
  under.rotateX(Math.PI); under.translate(0, 0, -0.012);
  const g = mergeGeometries([shaft, head, rim, under])!;
  return g;
}

function frameGeometry(W: number, H: number) {
  const ow = W + BORDER * 2, oh = H + BORDER * 2, r = 0.16;
  const s = new THREE.Shape();
  s.moveTo(-ow / 2 + r, -oh / 2); s.lineTo(ow / 2 - r, -oh / 2); s.quadraticCurveTo(ow / 2, -oh / 2, ow / 2, -oh / 2 + r);
  s.lineTo(ow / 2, oh / 2 - r); s.quadraticCurveTo(ow / 2, oh / 2, ow / 2 - r, oh / 2);
  s.lineTo(-ow / 2 + r, oh / 2); s.quadraticCurveTo(-ow / 2, oh / 2, -ow / 2, oh / 2 - r);
  s.lineTo(-ow / 2, -oh / 2 + r); s.quadraticCurveTo(-ow / 2, -oh / 2, -ow / 2 + r, -oh / 2);
  const hw = W / 2 + PITCH * 0.6, hh = H / 2 + PITCH * 0.6;
  const hole = new THREE.Path();
  hole.moveTo(-hw, -hh); hole.lineTo(-hw, hh); hole.lineTo(hw, hh); hole.lineTo(hw, -hh); hole.lineTo(-hw, -hh);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 6 });
  g.translate(0, 0, -0.9 + 0.12);
  return g;
}

/* ---------- the hidden head, rendered to a depth picture from behind the frame ---------- */

function HeadDepth({ grid, fields }: { grid: Grid; fields: Fields }) {
  const { scene } = useGLTF(HEAD_URL);
  const gl = useThree((s) => s.gl);
  const kit = useMemo(() => {
    let src: THREE.BufferGeometry | undefined;
    scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && !src) src = (o as THREE.Mesh).geometry; });
    const g = src!.clone();
    g.computeBoundingBox();
    const b = g.boundingBox!, c = new THREE.Vector3(); b.getCenter(c);
    g.translate(-c.x, -c.y, -c.z);
    const size = new THREE.Vector3(); b.getSize(size);
    const R = Math.max(size.x, size.y, size.z) * 0.5;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uN: { value: 0 }, uF: { value: 1 } },
      vertexShader: 'varying float vz; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vz = -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uN; uniform float uF; varying float vz; void main(){ float d = clamp((vz - uN) / (uF - uN), 0.0, 1.0); gl_FragColor = vec4(vec3(1.0 - d), 1.0); }',
    });
    const mesh = new THREE.Mesh(g, mat);
    const turn = new THREE.Group(); turn.add(mesh);
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0); sc.add(turn);
    const RW = 128, RH = Math.round((128 * grid.H) / grid.W);
    const rt = new THREE.WebGLRenderTarget(RW, RH, { depthBuffer: true });
    const fh = size.y * 1.14, fw = (fh * grid.W) / grid.H;
    const cam = new THREE.OrthographicCamera(-fw / 2, fw / 2, fh / 2, -fh / 2, 0.01, R * 8);
    cam.position.set(0, 0, R * 3); cam.lookAt(0, 0, 0);
    mat.uniforms.uN.value = R * 3 - R * 0.95; mat.uniforms.uF.value = R * 3 + R * 0.1;
    const buf = new Uint8Array(RW * RH * 4);
    return { sc, turn, rt, cam, buf, RW, RH };
  }, [scene, grid]);
  useEffect(() => () => kit.rt.dispose(), [kit]);
  const last = useRef(-9);
  const frame = useRef(0);
  useFrame(() => {
    frame.current++;
    const near = stage.mode >= 3 && stage.mode <= 5;
    if (fields.headReady.v && (!near || frame.current % 3)) return;
    const yaw = -Math.PI / 2 + (stage.headP - 0.5) * 0.3;
    if (fields.headReady.v && Math.abs(yaw - last.current) < 0.004) return;
    last.current = yaw;
    kit.turn.rotation.y = yaw;
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(kit.rt); gl.render(kit.sc, kit.cam);
    gl.readRenderTargetPixels(kit.rt, 0, 0, kit.RW, kit.RH, kit.buf);
    gl.setRenderTarget(prev);
    const f = fields.head;
    for (let k = 0; k < grid.n; k++) {
      const px = Math.min(kit.RW - 1, Math.round(grid.u[k] * (kit.RW - 1)));
      const py = Math.min(kit.RH - 1, Math.round(grid.v[k] * (kit.RH - 1)));
      const d = kit.buf[(py * kit.RW + px) * 4] / 255;
      f[k] = d > 0.004 ? 0.32 + 0.68 * d : 0;
    }
    fields.headReady.v = true;
  });
  return null;
}

/* ---------- the board ---------- */

function Board({ phone }: { phone: boolean }) {
  const grid = useMemo(() => makeGrid(phone), [phone]);
  const fields = useMemo<Fields>(() => ({
    mark: markField(grid), eight: eightField(grid), plaques: plaqueFields(grid, phone), slabs: slabFields(grid),
    head: new Float32Array(grid.n), headReady: { v: false },
  }), [grid, phone]);
  const sim = useMemo(() => ({
    h: new Float32Array(grid.n), vel: new Float32Array(grid.n), dent: new Float32Array(grid.n),
    from: new Float32Array(grid.n), next: new Float32Array(grid.n), goal: new Float32Array(grid.n),
    mode: -1, t0: 0, level: 0, lift: new Float32Array(7),
  }), [grid]);

  const { geo, mat, depth, mesh } = useMemo(() => {
    const geo = pinGeometry(phone);
    const aR = new Float32Array(grid.n); for (let k = 0; k < grid.n; k++) aR[k] = grid.seed[k];
    geo.setAttribute('aH', new THREE.InstancedBufferAttribute(sim.h, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aR', new THREE.InstancedBufferAttribute(aR, 1));
    const mat = steel(), depth = steelDepth();
    const mesh = new THREE.InstancedMesh(geo, mat, grid.n);
    const m = new THREE.Matrix4();
    for (let k = 0; k < grid.n; k++) { m.makeTranslation(grid.x[k], grid.y[k], 0); mesh.setMatrixAt(k, m); }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.customDepthMaterial = depth;
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    return { geo, mat, depth, mesh };
  }, [grid, phone, sim]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); depth.dispose(); }, [geo, mat, depth]);

  const frame = useMemo(() => frameGeometry(grid.W, grid.H), [grid]);
  const frameMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#050506', roughness: 0.78, metalness: 0.0, clearcoat: 0.12, clearcoatRoughness: 0.6,
    roughnessMap: noiseTexture(3, 0.75, 0.5),
  }), []);

  const board = useRef<THREE.Group>(null);
  const ptr = useRef({ x: 0, y: 0, on: false, down: false });
  const key = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  const born = useRef(-1);

  const local = (e: ThreeEvent<PointerEvent>) => {
    const p = board.current!.worldToLocal(e.point.clone());
    ptr.current.x = p.x; ptr.current.y = p.y; ptr.current.on = true;
  };

  useFrame((st, dt) => {
    const t = st.clock.elapsedTime;
    if (born.current < 0) born.current = t;
    const age = t - born.current;
    const g = grid, S = sim, F = fields;
    // the light comes up, then the first impression arrives
    const up = still ? 1 : clamp((age - 0.15) / 1.4);
    if (key.current) key.current.intensity = 4.6 * up * up;
    (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = 0.15 + 0.85 * up;
    const want = still || age > 1.1 ? stage.mode : -1;
    if (want !== S.mode) { S.from.set(S.goal); S.mode = want; S.t0 = still ? -99 : t; }
    if (stage.level !== S.level) { S.level = stage.level; S.dent.fill(0); }

    // what presses from behind right now
    const N = S.next, mode = S.mode;
    const breath = still ? 1 : 1 + Math.sin(t * 0.7) * 0.025;
    for (let c = 0; c < 7; c++) S.lift[c] = damp(S.lift[c], stage.focus === c ? 1 : 0, 6, dt);
    if (mode === 0) for (let k = 0; k < g.n; k++) N[k] = F.mark[k] * breath;
    else if (mode === 1) for (let k = 0; k < g.n; k++) N[k] = F.eight[k] * breath;
    else if (mode === 2) {
      const a = 0.42 + 0.4 * S.lift[0], b = 0.42 + 0.4 * S.lift[1];
      for (let k = 0; k < g.n; k++) N[k] = F.plaques[0][k] * a + F.plaques[1][k] * b;
    } else if (mode === 3) {
      N.fill(0);
      for (let c = 0; c < 7; c++) {
        const amp = (0.38 + ((c * 37) % 7) * 0.035) * (still ? 1 : 1 + Math.sin(t * 0.9 + c * 1.9) * 0.08) + 0.5 * S.lift[c];
        const f = F.slabs[c];
        for (let k = 0; k < g.n; k++) if (f[k] > 0) N[k] += f[k] * amp;
      }
    } else if (mode === 4) for (let k = 0; k < g.n; k++) N[k] = F.head[k] * 0.92;
    else N.fill(0);

    // the press: the pointer, a finger, or the keyboard's point
    let px = ptr.current.x, py = ptr.current.y, on = ptr.current.on, down = ptr.current.down;
    if (stage.key.on) { px = (stage.key.x - 0.5) * g.W; py = (stage.key.y - 0.5) * g.H; on = true; down = stage.key.down; }
    const R = down ? 0.62 : 0.44, depthP = down ? 0.55 : 0.36, R2 = R * R;
    const keep = mode === 5 ? 0.9996 : 0.972;
    const decay = Math.pow(keep, Math.min(dt, 0.1) * 60);
    const span = 0.55, travel = 1.15;
    const steps = Math.max(1, Math.min(4, Math.round(Math.min(dt, 0.1) * 60)));
    const pinH = S.h, vel = S.vel, dent = S.dent, goal = S.goal, from = S.from;
    for (let k = 0; k < g.n; k++) {
      if (on) {
        const dx = g.x[k] - px, dy = g.y[k] - py, d2 = dx * dx + dy * dy;
        if (d2 < R2) { const w = 1 - d2 / R2; const p = depthP * w * w; if (p > dent[k]) dent[k] = p; }
      }
      dent[k] *= decay;
      const b = still ? 1 : clamp((t - S.t0 - g.delay[k] * travel) / span);
      const e = from[k] + (N[k] - from[k]) * (b * b * (3 - 2 * b));
      goal[k] = e;
      const crest = b > 0 && b < 1 ? Math.sin(b * Math.PI) * 0.16 : 0;
      const target = (e + crest) * AMP - dent[k];
      if (still) { pinH[k] = Math.max(-0.4, target); vel[k] = 0; continue; }
      let h = pinH[k], v = vel[k];
      for (let i = 0; i < steps; i++) { v += (target - h) * 0.11 - v * 0.3; h += v; }
      pinH[k] = Math.max(-0.4, h); vel[k] = v;
    }
    (geo.getAttribute('aH') as THREE.InstancedBufferAttribute).needsUpdate = true;
    ptr.current.on = ptr.current.on && on && !stage.key.on;

    // the frame turns very slightly toward the reader
    if (board.current) {
      const lx = still ? 0 : stage.look.x, ly = still ? 0 : stage.look.y;
      board.current.rotation.y = damp(board.current.rotation.y, (phone ? -0.1 : -0.2) + lx * 0.035, 2.5, dt);
      board.current.rotation.x = damp(board.current.rotation.x, (phone ? -0.14 : -0.1) - ly * 0.025, 2.5, dt);
    }
  });

  return (
    <>
      <directionalLight ref={key} position={[-7.5, 6.2, 3.4]} intensity={0} color="#ffe2c2" castShadow
        shadow-mapSize={phone ? [1024, 1024] : [2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.012}
        shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-camera-near={1} shadow-camera-far={24} />
      <directionalLight position={[7, -4, 2.5]} intensity={0.35} color="#c9d4e4" />
      <group ref={board} rotation={[-0.1, -0.2, 0]}>
        <primitive object={mesh} />
        <mesh geometry={frame} material={frameMat} castShadow receiveShadow />
        <mesh position={[0, 0, -0.62]} receiveShadow>
          <planeGeometry args={[grid.W + 0.3, grid.H + 0.3]} />
          <meshStandardMaterial color="#060607" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0, 0.02]}
          onPointerMove={local} onPointerOver={local}
          onPointerDown={(e) => { local(e); ptr.current.down = true; }}
          onPointerUp={() => { ptr.current.down = false; }}
          onPointerOut={() => { ptr.current.on = false; ptr.current.down = false; }}>
          <planeGeometry args={[grid.W, grid.H]} />
          <meshBasicMaterial colorWrite={false} depthWrite={false} transparent opacity={0} />
        </mesh>
        <Suspense fallback={null}><HeadDepth grid={grid} fields={fields} /></Suspense>
      </group>
    </>
  );
}

/** Long lens, framed so the board fills most of its stage. */
function Rig({ phone }: { phone: boolean }) {
  const { camera, size } = useThree();
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const g = phone ? { W: 53.5 * PITCH, H: 59 * PITCH * 0.866 } : { W: 87.5 * PITCH, H: 91 * PITCH * 0.866 };
    const fw = g.W + BORDER * 2, fh = g.H + BORDER * 2;
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), aspect = size.width / size.height;
    const fill = phone ? 0.96 : 0.9;
    const d = Math.max(fw / (fill * 2 * tan * aspect), fh / (fill * 2 * tan));
    cam.position.set(phone ? 0.1 : 0.35, phone ? -0.1 : -0.25, d);
    cam.lookAt(0, 0, 0);
  });
  return null;
}

export default function Scene({ phone }: { phone: boolean }) {
  return (
    <Canvas
      dpr={[1, phone ? 1.5 : 1.6]}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ fov: 22, position: [0, 0, 30], near: 1, far: 120 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
    >
      <color attach="background" args={[BG]} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={1.7} color="#fff4e6" position={[-2, 7, 6]} scale={[10, 2.4, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={4} color="#ffcf9e" position={[-9, 2, 3]} scale={[1.6, 9, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.9} color="#d6e0ee" position={[9, -1, 4]} scale={[1.4, 7, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.1} color="#ffffff" position={[0, -2, 12]} scale={[16, 5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.6} color="#ffe9d2" position={[-5, 5, 9]} scale={[3, 0.6, 1]} target={[0, 0, 0]} />
      </Environment>
      <Rig phone={phone} />
      <Board phone={phone} />
      {!phone && (
        <EffectComposer multisampling={0}>
          <N8AO aoRadius={0.14} distanceFalloff={0.35} intensity={2.2} halfRes quality="performance" color="#000000" />
          <DepthOfField target={[0, 0, 0]} worldFocusRange={3.2} bokehScale={2.2} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
