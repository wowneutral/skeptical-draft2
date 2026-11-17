// The turn: one winged figure on an invisible turntable, seen through an orthographic camera.
// With the light off every fragment is the same flat ink, so the picture of it turning one way is
// the picture of its mirror turning the other. With the light on it is honed marble on a pale floor.
import { Suspense, use, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { clamp, damp } from '@/lib/utils';
import { DESK, PHONE, rig } from './store';

const H = 2.4; // figure height in scene units; the base stands on y = 0
const TAU = Math.PI * 2;
const BASE = 0.42; // rad/s, a slow even turn
const INK = 14 / 255;

const cache: Record<string, Promise<THREE.BufferGeometry>> = {};
function loadGeo(lo: boolean) {
  const key = lo ? 'lo' : 'hi';
  if (!cache[key]) {
    const base = import.meta.env.BASE_URL;
    const raw: Promise<THREE.BufferGeometry> = lo
      ? fetch(`${base}turn/lucy-lo.bin`).then((r) => r.arrayBuffer()).then((b) => {
          const head = new Uint32Array(b, 0, 2);
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(b, 8, head[0] * 3), 3));
          g.setIndex(new THREE.BufferAttribute(new Uint32Array(b, 8 + head[0] * 12, head[1]), 1));
          return g;
        })
      : new PLYLoader().loadAsync(`${base}models/lucy.ply`);
    cache[key] = raw.then((src) => {
      const g = src;
      g.rotateY(Math.PI); // face +z, toward the camera, at an angle of zero
      g.computeBoundingBox();
      const b0 = g.boundingBox!;
      const k = H / (b0.max.y - b0.min.y);
      g.scale(k, k, k);
      g.computeBoundingBox();
      const b = g.boundingBox!, c = b.getCenter(new THREE.Vector3());
      g.translate(-c.x, -b.min.y, -c.z);
      g.deleteAttribute('normal');
      g.computeVertexNormals();
      g.computeBoundingSphere();
      return g;
    });
  }
  return cache[key];
}

const NOISE = /* glsl */ `
float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }
`;

function useMarble(clip: THREE.Plane) {
  return useMemo(() => {
    const u = { uLight: { value: 0 }, uInk: { value: new THREE.Vector3(INK, INK, INK) } };
    const m = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', roughness: 0.52, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.5,
      sheen: 0.35, sheenRoughness: 0.8, sheenColor: new THREE.Color('#f3ead8'), envMapIntensity: 0.9,
      clippingPlanes: [clip],
    });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = 'varying vec3 vObj;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
      sh.fragmentShader = 'varying vec3 vObj;\nuniform float uLight;\nuniform vec3 uInk;\n' + NOISE + sh.fragmentShader
        .replace('#include <color_fragment>', /* glsl */ `
          #include <color_fragment>
          float cloud = fbm(vObj * 2.6);
          float t = vObj.x * 1.3 + vObj.y * 2.1 + vObj.z * 0.8 + fbm(vObj * 2.2 + 4.0) * 3.2;
          float vein = pow(1.0 - abs(sin(t * 3.14159)), 26.0) * 0.55 + pow(1.0 - abs(sin(t * 6.7 + cloud * 4.0)), 44.0) * 0.25;
          vec3 bone = pow(vec3(0.925, 0.905, 0.862), vec3(2.2));
          vec3 marble = mix(bone, bone * vec3(0.9, 0.89, 0.87), smoothstep(0.35, 0.75, cloud));
          marble = mix(marble, pow(vec3(0.46, 0.45, 0.43), vec3(2.2)), clamp(vein, 0.0, 1.0));
          diffuseColor.rgb = marble;`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (cloud - 0.5) * 0.16, 0.3, 0.8);')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb = mix(uInk, gl_FragColor.rgb, uLight);');
    };
    return { m, u };
  }, [clip]);
}

const FLOOR_V = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FLOOR_F = /* glsl */ `
varying vec2 vUv; uniform float uLight;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float a = pow(1.0 - smoothstep(0.0, 1.0, r), 1.6) * uLight;
  gl_FragColor = vec4(0.968, 0.958, 0.935, a);
}`;

function Figure({ lo }: { lo: boolean }) {
  const geo = use(loadGeo(lo));
  const { camera, size, gl } = useThree();
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), []);
  const { m, u } = useMarble(clip);
  const floorU = useMemo(() => ({ uLight: { value: 0 } }), []);
  const shadowMat = useRef<THREE.ShadowMaterial>(null);
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const st = useRef({
    th: 0.35, w: BASE, fx: -1, fy: 0.5, h: 0.8, target: null as number | null, sec: -1, arrive: 0,
    stopFor: 0, clipC: -0.05, phase: 'in' as 'out' | 'in' | 'rest', tilt: 0, hitKey: '',
  });

  useEffect(() => {
    gl.localClippingEnabled = true;
    rig.ready = true;
    const stage = gl.domElement.closest('.stage');
    stage?.classList.add('ready');
    if (rig.still) { st.current.clipC = H + 0.5; st.current.phase = 'rest'; }
    return () => { rig.ready = false; stage?.classList.remove('ready'); };
  }, [gl]);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.12);
    const s = st.current;
    const stages = rig.phone ? PHONE : DESK;
    const stage = stages[clamp(rig.sec, 0, stages.length - 1)];

    // --- where the figure stands: slide small moves, lift it through the floor for big ones
    if (s.fx < 0) { s.fx = stage.fx; s.fy = stage.fy; s.h = stage.h; }
    const far = Math.abs(stage.fx - s.fx) > 0.15 || Math.abs(stage.h - s.h) > 0.2;
    if (rig.still) { s.fx = stage.fx; s.fy = stage.fy; s.h = stage.h; s.clipC = H + 0.5; }
    else if (far && s.phase !== 'out') s.phase = 'out';
    if (!rig.still) {
      if (s.phase === 'out') {
        s.clipC -= dt * 6.5;
        if (s.clipC <= -0.05) { s.clipC = -0.05; s.fx = stage.fx; s.fy = stage.fy; s.h = stage.h; s.phase = 'in'; }
      } else if (s.phase === 'in' && rig.ready) {
        s.clipC = damp(s.clipC, H + 0.6, 2.6, dt) + dt * 0.4;
        if (s.clipC >= H + 0.45) { s.clipC = H + 0.5; s.phase = 'rest'; }
      }
      s.fx = damp(s.fx, stage.fx, 3, dt); s.fy = damp(s.fy, stage.fy, 3, dt); s.h = damp(s.h, stage.h, 3, dt);
    }
    clip.constant = s.clipC;

    // --- size and placement in screen pixels
    const W = size.width, Hh = size.height;
    let hPx = s.h * Hh;
    if (!rig.phone && stage.fx !== 0.5) hPx = Math.min(hPx, (W * 0.42) / 0.62);
    const zoom = hPx / H;
    // At Join the figure stands in the section itself, so it arrives below the people and leaves with the page.
    const ride = !rig.phone && rig.sec === 5 && s.phase !== 'out' ? rig.joinTop : 0;
    const cxPx = s.fx * W, cyPx = s.fy * Hh + ride;

    // --- the light
    const want = rig.still || rig.hold || stage.lit ? 1 : 0;
    rig.light = damp(rig.light, want, want > rig.light ? 4.5 : 2.2, dt);
    if (Math.abs(rig.light - want) < 0.002) rig.light = want;
    const L = rig.light;
    u.uLight.value = L; floorU.uLight.value = L * 0.95;
    if (shadowMat.current) shadowMat.current.opacity = 0.42 * L;
    gl.shadowMap.autoUpdate = L > 0.003;
    // A level camera for the silhouette (no cue), a few degrees above once lit, so the floor reads.
    s.tilt = damp(s.tilt, L * 0.13, 5, dt);

    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = zoom;
    const worldX = (s.fx - 0.5) * W / zoom;
    const tY = H / 2 + (cyPx / Hh - 0.5) * Hh / zoom * Math.cos(s.tilt);
    const R = 20;
    cam.position.set(0, tY + Math.sin(s.tilt) * R, Math.cos(s.tilt) * R);
    cam.lookAt(0, tY, 0);
    cam.updateProjectionMatrix();
    if (group.current) group.current.position.x = worldX;

    // --- the turn
    if (rig.sec !== s.sec) { s.sec = rig.sec; s.target = null; s.arrive = 1; }
    s.arrive = Math.max(0, s.arrive - dt * 0.7);
    let stop = stage.stop;
    if (stop !== null && rig.sec === 5) stop += rig.lean * 0.42;
    if (rig.still) {
      s.th = stop ?? 0.6; s.w = 0;
    } else if (rig.drag) {
      const d = rig.dragDx * (rig.phone ? 0.011 : 0.0075);
      rig.dragDx = 0;
      s.th += d;
      s.w = THREE.MathUtils.lerp(s.w, clamp(d / Math.max(dt, 1e-3), -9, 9), 0.45);
      s.target = null;
    } else {
      s.w += rig.kick; rig.kick = 0;
      if (stop !== null) {
        if (s.target === null || stop !== s.stopFor) {
          s.stopFor = stop;
          // Turn into the stop in the direction it is already going.
          const ahead = ((stop - s.th) % TAU + TAU) % TAU;
          s.target = Math.abs(s.w) < 0.12 ? s.th + (ahead > Math.PI ? ahead - TAU : ahead) : s.w >= 0 ? s.th + ahead : s.th - (TAU - ahead);
        }
        const vmax = Math.max(1.3, Math.abs(s.w) * 0.9);
        const want = clamp((s.target - s.th) * 2.2, -vmax, vmax);
        s.w = damp(s.w, want, 3.4, dt);
      } else {
        if (rig.flip) { rig.flip = false; s.w = -s.w * 0.25; }
        const dir = Math.sign(s.w) || 1;
        s.w = damp(s.w, dir * BASE * (1 - 0.65 * s.arrive) * (rig.over ? 0.55 : 1), 0.7, dt);
      }
      s.th += s.w * dt;
    }
    if (spin.current) spin.current.rotation.y = s.th;
    if (key.current) { key.current.position.set(worldX - 2.6, 5.5, 4.2); key.current.target.position.set(worldX, 1.1, 0); key.current.target.updateMatrixWorld(); }

    // --- the hit area over the figure, and the one line under it
    const wPx = hPx * 0.62;
    const k2 = `${cxPx | 0},${cyPx | 0},${hPx | 0}`;
    if (k2 !== s.hitKey) {
      s.hitKey = k2;
      if (rig.hit) {
        rig.hit.style.width = `${wPx}px`; rig.hit.style.height = `${hPx}px`;
        rig.hit.style.transform = `translate(${cxPx - wPx / 2}px, ${cyPx - hPx / 2}px)`;
      }
      if (rig.hint) rig.hint.style.transform = `translate(${cxPx}px, ${Math.min(cyPx + hPx / 2 + 10, Hh - 30)}px) translateX(-50%)`;
    }
  });

  return (
    <>
      <group ref={group}>
        <group ref={spin}>
          <mesh geometry={geo} material={m} castShadow />
        </group>
        <mesh rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={1} receiveShadow>
          <planeGeometry args={[6, 6]} />
          <shadowMaterial ref={shadowMat} transparent opacity={0} depthWrite={false} color="#2a2620" />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} renderOrder={0}>
          <circleGeometry args={[3.2, 64]} />
          <shaderMaterial vertexShader={FLOOR_V} fragmentShader={FLOOR_F} uniforms={floorU} transparent depthWrite={false} />
        </mesh>
      </group>
      <directionalLight
        ref={key} position={[-2.6, 5.5, 4.2]} intensity={2.6} color="#fff6ea" castShadow
        shadow-mapSize={[1024, 1024]} shadow-radius={14} shadow-blurSamples={16} shadow-bias={-0.0004}
        shadow-camera-left={-2.2} shadow-camera-right={2.2} shadow-camera-top={3} shadow-camera-bottom={-1.5}
        shadow-camera-near={0.5} shadow-camera-far={16}
      />
      <directionalLight position={[3.5, 2.6, -4]} intensity={1.1} color="#eef2ff" />
      <hemisphereLight args={['#fffaf0', '#b9b2a4', 0.35]} />
    </>
  );
}

export default function Scene({ lo, dpr }: { lo: boolean; dpr: [number, number] }) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 1.2, 20], zoom: 200, near: 0.1, far: 60 }}
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      shadows={{ type: THREE.VSMShadowMap }}
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <Suspense fallback={null}><Figure lo={lo} /></Suspense>
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[-3, 4, 3]} scale={[4, 3, 1]} color="#fff4e2" />
        <Lightformer form="rect" intensity={0.8} position={[4, 1, -3]} scale={[3, 4, 1]} color="#eef1ff" />
        <Lightformer form="rect" intensity={0.5} position={[0, -3, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} color="#d9d2c4" />
      </Environment>
    </Canvas>
  );
}
