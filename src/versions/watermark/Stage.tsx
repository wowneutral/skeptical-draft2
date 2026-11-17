// The desk, the lamp and the sheet. One plane of paper with its own shader:
// reflected light from the raking key at the front, transmitted light from the
// lamp behind, mixed by where the lamp actually is.
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { scroll } from '@/lib/scroll';
import { clamp, damp, still } from '@/lib/utils';
import { ASPECT, makeHeavy, makePrint, makeThick, makeTooth } from './paper';
import { sample, st } from './state';

const SW = 2.4, SH = SW * ASPECT;
const KEY = new THREE.Vector3(-5.6, 1.9, 3.0);

const vert = /* glsl */ `
uniform float uBend;
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vT; varying vec3 vB;
void main(){
  vUv = uv;
  vec3 p = position;
  float y = uv.y, x = uv.x;
  p.z += uBend * (sin(y * 3.14159) * 0.10 + (1.0 - y) * (1.0 - y) * 0.07 + sin(x * 3.14159) * 0.035);
  float dzdy = uBend * (cos(y * 3.14159) * 3.14159 * 0.10 - 2.0 * (1.0 - y) * 0.07) / ${SH.toFixed(4)};
  float dzdx = uBend * cos(x * 3.14159) * 3.14159 * 0.035 / ${SW.toFixed(4)};
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  mat3 m = mat3(modelMatrix);
  vN = normalize(m * normalize(vec3(-dzdx, -dzdy, 1.0)));
  vT = normalize(m * vec3(1.0, 0.0, dzdx));
  vB = normalize(m * vec3(0.0, 1.0, dzdy));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const frag = /* glsl */ `
uniform sampler2D uThick; uniform sampler2D uPrint; uniform sampler2D uTooth;
uniform vec3 uLamp; uniform float uLampI; uniform vec3 uKey; uniform float uKeyI;
uniform float uHeavy; uniform float uSeed; uniform float uAmb;
varying vec2 vUv; varying vec3 vWorld; varying vec3 vN; varying vec3 vT; varying vec3 vB;
float hash(float n){ return fract(sin(n) * 43758.5453); }
float vn(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }
float deckle(float along, float s){ return 0.008 + 0.016 * vn(along * 9.0 + s) + 0.007 * vn(along * 47.0 + s * 3.1) + 0.003 * vn(along * 160.0 + s); }
void main(){
  vec2 uv = vUv;
  float dl = uv.x * ${SW.toFixed(4)}, dr = (1.0 - uv.x) * ${SW.toFixed(4)};
  float db = uv.y * ${SH.toFixed(4)}, dt = (1.0 - uv.y) * ${SH.toFixed(4)};
  float kl = deckle(uv.y * ${SH.toFixed(4)}, uSeed + 1.0), kr = deckle(uv.y * ${SH.toFixed(4)}, uSeed + 7.0);
  float kb = deckle(uv.x * ${SW.toFixed(4)}, uSeed + 13.0), kt = deckle(uv.x * ${SW.toFixed(4)}, uSeed + 29.0);
  if (dl < kl || dr < kr || db < kb || dt < kt) discard;
  float feather = smoothstep(0.0, 0.05, min(min(dl - kl, dr - kr), min(db - kb, dt - kt)));

  float thick = mix(texture2D(uThick, uv).r, 0.97, uHeavy);
  vec2 tuv = uv * vec2(${SW.toFixed(4)}, ${SH.toFixed(4)}) * 1.35;
  float e = 1.0 / 256.0;
  float h = texture2D(uTooth, tuv).r;
  float hx = texture2D(uTooth, tuv + vec2(e, 0.0)).r - texture2D(uTooth, tuv - vec2(e, 0.0)).r;
  float hy = texture2D(uTooth, tuv + vec2(0.0, e)).r - texture2D(uTooth, tuv - vec2(0.0, e)).r;
  vec3 N0 = normalize(vN);
  if (!gl_FrontFacing) N0 = -N0;
  vec3 N = normalize(N0 - (hx * normalize(vT) + hy * normalize(vB)) * 2.5);

  vec3 V = normalize(cameraPosition - vWorld);
  vec3 bone = pow(vec3(0.93, 0.895, 0.83), vec3(2.2));
  vec3 albedo = bone * (0.9 + 0.35 * (h - 0.5)) * (1.0 - 0.05 * (thick - 0.59));
  float ink = texture2D(uPrint, uv).a * (1.0 - uHeavy);
  vec3 base = mix(albedo, vec3(0.006, 0.0055, 0.005), ink);

  vec3 Kd = normalize(uKey - vWorld);
  float kd = max(dot(N, Kd), 0.0);
  vec3 keyCol = vec3(1.0, 0.95, 0.88);
  vec3 col = base * (keyCol * kd * uKeyI + vec3(0.05, 0.047, 0.043) * uAmb);
  vec3 Hh = normalize(Kd + V);
  col += keyCol * pow(max(dot(N, Hh), 0.0), 60.0) * ink * 0.35 * uKeyI;

  vec3 Ld = uLamp - vWorld; float ld = length(Ld); Ld /= ld;
  vec3 lampCol = vec3(1.0, 0.6, 0.28);
  col += base * lampCol * max(dot(N, Ld), 0.0) * uLampI * 0.5 / (1.0 + ld * ld * 0.2);

  // light through the sheet
  float back = clamp(-dot(N0, Ld) * 4.0, 0.0, 1.0);
  float fwd = max(dot(-V, Ld), 0.0);
  float scatter = 0.07 + 0.55 * pow(fwd, 6.0) + 2.2 * pow(fwd, 36.0);
  float T = exp(-(thick - 0.59) * 5.0);
  T *= mix(1.8, 1.0, feather);
  T *= 1.0 - ink * 0.985;
  T *= mix(1.0, 0.0025, uHeavy);
  col += lampCol * mix(vec3(1.0), albedo, 0.5) * T * scatter * back * uLampI * 0.62 / (1.0 + ld * ld * 0.04);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

type Maps = { thick: THREE.Texture; print: THREE.Texture; tooth: THREE.Texture; heavy: THREE.Texture };

function tex(c: HTMLCanvasElement, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

function sheetMat(maps: Maps, heavy: boolean, seed: number) {
  return new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, side: THREE.DoubleSide,
    uniforms: {
      uThick: { value: heavy ? maps.heavy : maps.thick }, uPrint: { value: maps.print }, uTooth: { value: maps.tooth },
      uLamp: { value: new THREE.Vector3() }, uLampI: { value: 0 }, uKey: { value: KEY.clone() }, uKeyI: { value: 0 },
      uHeavy: { value: heavy ? 1 : 0 }, uSeed: { value: seed }, uAmb: { value: 1 }, uBend: { value: 0 },
    },
  });
}

function Scene({ maps }: { maps: Maps }) {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const sheet = useRef<THREE.Group>(null), cover = useRef<THREE.Mesh>(null);
  const bulb = useRef<THREE.Group>(null), lampLight = useRef<THREE.PointLight>(null), key = useRef<THREE.SpotLight>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(SW, SH, 24, 32), []);
  const mA = useMemo(() => sheetMat(maps, false, 3), [maps]);
  const mB = useMemo(() => { const m = sheetMat(maps, true, 41); m.uniforms.uAmb.value = 5; return m; }, [maps]);
  const s = useRef({ lift: still ? 1 : 0, v: 0, side: 0, cover: 0, bright: 0, up: 0, zoom: 1, lx: 0.3, ly: 0.1, born: performance.now() / 1000, hold: 0, camL: still ? 1 : 0 });
  const look = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => () => { geo.dispose(); mA.dispose(); mB.dispose(); }, [geo, mA, mB]);

  useFrame((state, dtRaw) => {
    // the test browser can run at two frames a second: step the spring in small pieces
    const dt = Math.min(dtRaw, 1.2);
    const v = s.current, now = performance.now() / 1000, t = state.clock.elapsedTime;
    const p = sample(scroll.y);
    // the drag lets go, and the sheet settles back
    if (!st.dragging) st.hold = damp(st.hold, 0, 3.2, dt);
    const target = still ? 1 : clamp(Math.max(p.lift, st.pinned) + st.hold, 0, 1.08);
    if (still) { v.lift = 1; v.v = 0; } else {
      // a spring with a little give: paper has weight but not much
      const n = Math.ceil(dt / (1 / 60)), h = dt / n;
      for (let i = 0; i < n; i++) {
        v.v += (target - v.lift) * 46 * h;
        v.v *= Math.exp(-7.5 * h);
        v.lift += v.v * h;
      }
    }
    const L = v.lift;
    v.camL = still ? 1 : damp(v.camL, clamp(L, 0, 1), 3.4, dt);
    const k = still ? 1 : 1 - Math.exp(-4 * dt);
    v.side += (p.side - v.side) * k; v.cover += (p.cover - v.cover) * (still ? 1 : 1 - Math.exp(-3 * dt));
    v.bright += (p.bright - v.bright) * k; v.up += (p.up - v.up) * k; v.zoom += (p.zoom - v.zoom) * k;

    // the opening: the key light comes up first, then the lamp
    const age = now - v.born;
    const keyOn = still ? 1 : clamp((age - 0.2) / 1.6);
    const lampOn = still ? 1 : clamp((age - 1.1) / 1.4);

    // the lamp follows the pointer, or drifts when nobody is pointing
    let tx = st.px, ty = st.py;
    if (st.aim !== null) { tx = st.aim * 0.85; ty = 0.1; }
    else if (now - st.moved > 3 && !still) { tx = Math.sin(t * 0.31) * 0.7; ty = Math.cos(t * 0.23) * 0.35; }
    v.lx = still ? 0.25 : damp(v.lx, tx, 2.2, dt); v.ly = still ? 0.15 : damp(v.ly, ty, 2.2, dt);

    // the sheet: on the desk, or held up in front of the lamp
    const g = sheet.current!;
    const r = clamp(L, -0.1, 1.1);
    const rr = Math.pow(clamp(r), 0.75);
    g.position.set(0, 0.012 + 1.92 * r, 0.3 - 0.5 * r);
    g.rotation.set(-Math.PI / 2 + (Math.PI / 2 - 0.07) * rr + v.ly * 0.05 * r, -v.lx * 0.11 * r, still ? 0 : Math.sin(t * 0.6) * 0.012 * r);
    const bend = clamp(0.55 * r + v.v * 0.12, -0.3, 1);

    const lamp = tmp.set(v.lx * 1.7, 1.95 + v.ly * 1.0, -2.5);
    bulb.current!.position.copy(lamp);
    const lampI = lampOn * (1.0 + 0.7 * v.bright) * (0.55 + 0.45 * clamp(r));
    lampLight.current!.intensity = 9 * lampI;
    key.current!.intensity = 95 * keyOn * (1 - 0.45 * clamp(r));
    for (const m of [mA, mB]) {
      m.uniforms.uLamp.value.copy(lamp);
      m.uniforms.uLampI.value = lampI * 2.3;
      m.uniforms.uKeyI.value = keyOn * (2.3 - 1.85 * clamp(r));
      m.uniforms.uBend.value = bend;
    }

    // the cover sheet slides on and blocks the lamp
    const c = cover.current!;
    c.visible = v.cover > 0.01;
    c.position.set((1 - v.cover) * 5.2 + 0.07, -0.06 + (1 - v.cover) * 0.6, 0.035);
    c.rotation.set(0, 0, 0.018 + (1 - v.cover) * 0.22);

    // the camera: high over the desk, then level with the sheet as it rises
    const a = smoothT(v.camL);
    const aspect = size.width / size.height;
    const dist = Math.max(8.4, 4.9 / aspect) / (v.zoom * (st.phone ? 1 - 0.1 * (1 - a) : 1));
    look.set(0, 0.0 + 1.92 * a, 0.3 - 0.5 * a);
    const el = 1.0 - 0.95 * a; // elevation angle in radians
    cam.position.set(look.x + Math.sin(-v.lx * 0.04) * dist, look.y + Math.sin(el) * dist, look.z + Math.cos(el) * dist);
    cam.lookAt(look);
    // crop the frame instead of moving the sheet: it slides to the right on wide screens, up on phones
    const W = size.width, H = size.height;
    const sx = st.phone ? 0 : v.side * 0.24;
    const sy = st.phone ? 0.13 + 0.07 * (1 - a) + v.up * 0.3 : v.up;
    cam.setViewOffset(W, H, -sx * W, sy * H, W, H);
  });

  return (
    <>
      <color attach="background" args={['#0b0a09']} />
      <ambientLight intensity={0.06} color="#ffe8cc" />
      <spotLight ref={key} position={KEY} angle={0.5} penumbra={0.85} decay={2} color="#fff3e2" castShadow
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-camera-near={2} shadow-camera-far={16} />
      <pointLight ref={lampLight} position={[0, 2, -2.5]} color="#ffa04a" decay={2} distance={0} />
      <group ref={sheet}>
        <mesh geometry={geo} material={mA} castShadow />
        <mesh ref={cover} geometry={geo} material={mB} scale={0.965} castShadow />
      </group>
      {/* the lamp: a frosted bulb on a black cord */}
      <group ref={bulb}>
        <mesh>
          <sphereGeometry args={[0.13, 32, 16]} />
          <meshBasicMaterial color="#ffd6a3" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.16, 24]} />
          <meshStandardMaterial color="#141210" roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh position={[0, 5.3, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 10, 8]} />
          <meshStandardMaterial color="#0a0908" roughness={0.6} />
        </mesh>
      </group>
      {/* the desk and the wall */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial color="#1b1712" roughness={0.62} metalness={0} />
      </mesh>
      <mesh position={[0, 8, -7]} receiveShadow>
        <planeGeometry args={[60, 20]} />
        <meshStandardMaterial color="#14110d" roughness={0.95} />
      </mesh>
    </>
  );
}

const smoothT = (t: number) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };

export default function Stage({ line }: { line: string }) {
  const [maps, setMaps] = useState<Maps | null>(null);
  useEffect(() => {
    let live = true;
    const fam = '"Bodoni Moda Variable"';
    Promise.all([document.fonts.load(`600 100px ${fam}`), document.fonts.load(`italic 400 40px ${fam}`)]).catch(() => null).then(() => {
      if (!live) return;
      setMaps({ thick: tex(makeThick()), print: tex(makePrint(line)), tooth: tex(makeTooth(), true), heavy: tex(makeHeavy()) });
      st.ready = true;
    });
    return () => { live = false; };
  }, [line]);
  useEffect(() => () => { if (maps) Object.values(maps).forEach((t) => t.dispose()); }, [maps]);
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} dpr={[1, st.phone ? 1.5 : 1.6]}
      camera={{ fov: 30, near: 0.1, far: 80, position: [0, 6, 4] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
    >
      {maps && <Scene maps={maps} />}
    </Canvas>
  );
}
