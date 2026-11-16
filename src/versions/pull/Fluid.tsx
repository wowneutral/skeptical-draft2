// The dish and the pool. A bone ceramic dish on a pale sweep holds black
// ferrofluid; magnets (the pointer, and the hidden ones the page places)
// raise a lattice of wet spikes, computed in the vertex shader.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import MARKS from '@/lib/marks.json';
import { clamp, damp, isPhone, still } from '@/lib/utils';
import { field, N_PTS } from './store';

const FLUID_Y = 0.115;

/** Where the pointer is, in normalised device coordinates, or null. */
const ptr = { x: 0, y: 0, on: false };

/** The brand question mark, blurred into a field the shader can read. */
function makeGlyph() {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const m = MARKS.italic, k = (S * 0.74) / m.h;
  g.filter = 'blur(5px)';
  g.setTransform(k, 0, 0, k, S / 2 + 4, S / 2);
  g.fillStyle = '#fff';
  g.fill(new Path2D(m.d));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}

const HEAD = /* glsl */ `
uniform vec4 uP[${N_PTS}];
uniform vec3 uHand;
uniform vec3 uLean;
uniform vec2 uVel;
uniform sampler2D uGlyph;
uniform float uGlyphS;
uniform float uFront;
uniform float uSpace;
varying float vSpike;
varying vec2 vLocal;

float fieldAt(vec2 p) {
  vec2 d = p - uHand.xy;
  float f = uHand.z * exp(-dot(d, d) / 0.13);
  for (int i = 0; i < ${N_PTS}; i++) {
    vec2 e = p - uP[i].xy;
    f += uP[i].z * exp(-dot(e, e) / (uP[i].w * uP[i].w));
  }
  vec2 l = p - uLean.xy;
  f += uLean.z * exp(-dot(l, l) / 0.16);
  vec2 uv = p * 0.5 + 0.5;
  float down = 1.0 - uv.y;
  float shown = 1.0 - smoothstep(uFront - 0.06, uFront + 0.015, down);
  f += texture2D(uGlyph, uv).r * uGlyphS * shown * 1.15;
  return f * smoothstep(1.0, 0.8, length(p));
}

float spikeAt(vec2 p, float f) {
  vec2 q = p / uSpace;
  vec2 s = vec2(1.0, 1.7320508);
  vec2 a = mod(q, s) - 0.5 * s;
  vec2 b = mod(q - 0.5 * s, s) - 0.5 * s;
  vec2 l = dot(a, a) < dot(b, b) ? a : b;
  float amp = smoothstep(0.16, 0.85, f);
  float base = 0.44 + 0.1 * amp;
  float c = clamp(1.0 - length(l) / base, 0.0, 1.0);
  return pow(c, 2.8) * amp * (0.15 + 0.1 * min(f, 1.6));
}

float heightAt(vec2 p, out float spike, out float f) {
  f = fieldAt(p);
  spike = spikeAt(p, f);
  return 0.045 * min(f, 1.6) + spike;
}
`;

const BODY = /* glsl */ `
vec2 P = position.xy;
float sp0, f0, sp1, f1, sp2, f2, sp3, f3, sp4, f4;
float e = 0.0035;
float h0 = heightAt(P, sp0, f0);
float hx1 = heightAt(P + vec2(e, 0.0), sp1, f1);
float hx0 = heightAt(P - vec2(e, 0.0), sp2, f2);
float hy1 = heightAt(P + vec2(0.0, e), sp3, f3);
float hy0 = heightAt(P - vec2(0.0, e), sp4, f4);
vec3 objectNormal = normalize(vec3(-(hx1 - hx0) / (2.0 * e), -(hy1 - hy0) / (2.0 * e), 1.0));
vec2 grad = vec2(f1 - f2, f3 - f4) / (2.0 * e);
vec2 tilt = grad / (length(grad) + 2.0) * 0.4 - uVel * 0.6;
vSpike = sp0;
vLocal = P;
vec3 displaced = vec3(P + tilt * sp0, h0);
`;

function Pool({ segs }: { segs: number }) {
  const glyph = useMemo(makeGlyph, []);
  const uniforms = useMemo(() => ({
    uP: { value: Array.from({ length: N_PTS }, () => new THREE.Vector4(0, 0, 0, 0.2)) },
    uHand: { value: new THREE.Vector3() },
    uLean: { value: new THREE.Vector3() },
    uVel: { value: new THREE.Vector2() },
    uGlyph: { value: glyph },
    uGlyphS: { value: 0 },
    uFront: { value: 0 },
    uSpace: { value: 0.068 },
  }), [glyph]);

  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({ color: '#050505', roughness: 0.035, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 0.6, ior: 1.5, envMapIntensity: 0.95 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = HEAD + sh.vertexShader
        .replace('#include <beginnormal_vertex>', BODY)
        .replace('#include <begin_vertex>', 'vec3 transformed = displaced;');
      sh.fragmentShader = 'varying float vSpike;\nvarying vec2 vLocal;\n' + sh.fragmentShader
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (length(vLocal) > 1.0) discard;');
    };
    return m;
  }, [uniforms]);

  const geo = useMemo(() => new THREE.PlaneGeometry(2.02, 2.02, segs, segs), [segs]);
  const { camera } = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLUID_Y), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const s = useRef({
    hx: 0, hz: 0, hvx: 0, hvz: 0, hs: 0, hsv: 0, lx: 0, lz: 0, ls: 0,
    pts: Array.from({ length: N_PTS }, () => ({ x: 0, z: 0, s: 0, r: 0.22 })),
    g: 0, front: 0, t: 0, vx: 0, vz: 0,
  });

  /** Screen px to dish coordinates, or null when the ray misses. */
  const toDish = (sx: number, sy: number) => {
    ndc.set((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
  };

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1), st = s.current;
    st.t += dt;
    if (still) return;

    // The visitor's magnet: a lagging, slightly overshooting spring.
    let tx = st.hx, tz = st.hz, ton = 0;
    const H = field.hand;
    if (H.seen) { tx = H.x; tz = H.z; ton = H.on; }
    else if (ptr.on) {
      ndc.set(ptr.x, ptr.y); ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        const r = Math.hypot(hit.x, hit.z);
        tx = hit.x; tz = hit.z;
        ton = clamp((1.75 - r) / 0.6);
      }
    }
    // The opening: one hidden pass under the dish, then a still mirror.
    const o = clamp((st.t - 0.9) / 2.6);
    if (o > 0 && o < 1 && ton < 0.1) { tx = -1.1 + 2.2 * o; tz = 0.25 - 0.5 * o; ton = Math.sin(Math.PI * o) * 1.05; }
    const k = 55, c = 9.5, n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
    for (let j = 0; j < n; j++) {
      const ax = k * (tx - st.hx) - c * st.hvx, az = k * (tz - st.hz) - c * st.hvz;
      st.hvx += ax * h; st.hvz += az * h; st.hx += st.hvx * h; st.hz += st.hvz * h;
      const as = 38 * (ton - st.hs) - 6.5 * st.hsv;
      st.hsv += as * h; st.hs = Math.max(0, st.hs + st.hsv * h);
    }
    st.vx = damp(st.vx, clamp(st.hvx * 0.12, -0.5, 0.5), 6, dt);
    st.vz = damp(st.vz, clamp(st.hvz * 0.12, -0.5, 0.5), 6, dt);

    // Hidden magnets the page asked for.
    for (let i = 0; i < N_PTS; i++) {
      const p = st.pts[i], q = field.pts[i];
      if (q.s > 0.01) { p.x = damp(p.x, q.x, 4, dt); p.z = damp(p.z, q.z, 4, dt); p.r = damp(p.r, q.r, 4, dt); }
      p.s = damp(p.s, q.s, q.s > p.s ? 2.6 : 3.4, dt);
      uniforms.uP.value[i].set(p.x, -p.z, p.s, p.r);
    }
    // Lean toward a way in.
    const L = field.lean;
    let lt = 0;
    if (L.s > 0) {
      const d = toDish(L.x, L.z);
      if (d) { const r = Math.hypot(d.x, d.z) || 1, m = Math.min(r, 0.78); st.lx = damp(st.lx, (d.x / r) * m, 5, dt); st.lz = damp(st.lz, (d.z / r) * m, 5, dt); lt = L.s; }
    }
    st.ls = damp(st.ls, lt, lt > st.ls ? 3 : 4, dt);
    st.g = damp(st.g, field.glyphOn, field.glyphOn > st.g ? 2.2 : 2.8, dt);
    st.front = damp(st.front, field.glyph, 5, dt);

    uniforms.uHand.value.set(st.hx, -st.hz, st.hs);
    uniforms.uVel.value.set(st.vx, -st.vz);
    uniforms.uLean.value.set(st.lx, -st.lz, st.ls * 1.1);
    uniforms.uGlyphS.value = st.g;
    uniforms.uFront.value = st.front * 1.08;
  });

  return <mesh geometry={geo} material={mat} rotation-x={-Math.PI / 2} position-y={FLUID_Y} frustumCulled={false} />;
}

/** The dish: a shallow bone ceramic bowl, turned on a lathe. */
function Dish() {
  const geo = useMemo(() => {
    const pts = [
      [0, 0.07], [0.6, 0.07], [0.92, 0.075], [1.0, 0.09], [1.05, 0.13], [1.085, 0.18], [1.11, 0.205],
      [1.14, 0.212], [1.17, 0.2], [1.185, 0.175], [1.18, 0.13], [1.155, 0.07], [1.1, 0.025], [0.98, 0.006], [0.84, 0.0],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const curve = new THREE.SplineCurve(pts);
    const prof = curve.getPoints(90);
    prof.push(new THREE.Vector2(0.0001, 0));
    const g = new THREE.LatheGeometry(prof, 160);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshPhysicalMaterial color="#efe9dd" roughness={0.42} clearcoat={0.7} clearcoatRoughness={0.16} sheen={0.3} sheenColor="#fff7ea" />
    </mesh>
  );
}

/** Frames the dish where the page wants it: product angle at the top, looking down for the mark. */
function Rig() {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const s = useRef({ side: field.side, top: field.top, ready: false });
  const strip = useRef(0);
  const scene = useThree((st) => st.scene);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1), st = s.current;
    const first = !st.ready; st.ready = true;
    st.side = first || still ? field.side : damp(st.side, field.side, 2.6, dt);
    st.top = first || still ? field.top : damp(st.top, field.top, 2.2, dt);
    const phone = size.width <= 820, aspect = size.width / size.height;
    const el = THREE.MathUtils.degToRad(27 + 43 * st.top);
    // Distance chosen so the dish fills the share of the screen the layout leaves it.
    const want = phone ? 0.9 : 0.55 - 0.12 * st.side;
    const vis = 2.5 / want / Math.min(aspect, 1.7);
    const dist = vis / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
    cam.position.set(0, Math.sin(el) * dist, Math.cos(el) * dist);
    cam.lookAt(0, 0.08, 0);
    const cx = phone ? 0.5 : 0.5 + 0.22 * st.side;
    const cy = phone ? 0.64 - 0.14 * st.side : 0.63 - 0.08 * st.side;
    cam.setViewOffset(size.width, size.height, -(cx - 0.5) * size.width, -(cy - 0.5) * size.height, size.width, size.height);
    cam.updateProjectionMatrix();
    // The strip light's reflection slides with the scroll.
    strip.current = still ? field.strip : damp(strip.current, field.strip, 3, dt);
    scene.environmentRotation.set(strip.current * 0.6, 0, 0.12 - strip.current * 0.24);
    scene.backgroundRotation.copy(scene.environmentRotation);
  });
  return null;
}

/** Pointer and touch, read from the window so the page keeps scrolling normally. */
function useInput() {
  useEffect(() => {
    const set = (x: number, y: number) => { ptr.x = (x / window.innerWidth) * 2 - 1; ptr.y = -(y / window.innerHeight) * 2 + 1; ptr.on = true; };
    const mv = (e: PointerEvent) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') set(e.clientX, e.clientY); };
    const tm = (e: TouchEvent) => { const t = e.touches[0]; if (t) set(t.clientX, t.clientY); };
    const off = () => { ptr.on = false; };
    const leave = (e: MouseEvent) => { if (!e.relatedTarget) ptr.on = false; };
    window.addEventListener('pointermove', mv, { passive: true });
    window.addEventListener('touchstart', tm, { passive: true });
    window.addEventListener('touchmove', tm, { passive: true });
    window.addEventListener('touchend', off, { passive: true });
    window.addEventListener('touchcancel', off, { passive: true });
    document.addEventListener('mouseout', leave);
    window.addEventListener('blur', off);
    return () => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('touchstart', tm); window.removeEventListener('touchmove', tm);
      window.removeEventListener('touchend', off); window.removeEventListener('touchcancel', off); document.removeEventListener('mouseout', leave); window.removeEventListener('blur', off);
    };
  }, []);
}

/** With reduced motion the scene draws on demand: once per scroll, never on its own. */
function Demand() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!still) return;
    const on = () => invalidate();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, [invalidate]);
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  const n = useRef(0);
  useFrame(() => { n.current++; if (n.current === 3) onReady(); });
  return null;
}

export default function Fluid({ onReady }: { onReady: () => void }) {
  useInput();
  const phone = isPhone();
  return (
    <Canvas
      dpr={[1, 1.6]}
      frameloop={still ? 'demand' : 'always'}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 18, near: 0.5, far: 80, position: [0, 3, 10] }}
      shadows={{ type: THREE.PCFShadowMap }}
      style={{ touchAction: 'pan-y', pointerEvents: 'none' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.AgXToneMapping; gl.toneMappingExposure = 1.05; }}
    >
      <Rig />
      <Dish />
      <Pool segs={phone ? 260 : 400} />
      <ContactShadows position={[0, 0.001, 0]} scale={4.2} blur={2.2} opacity={0.62} far={1.2} resolution={512} frames={1} color="#2b2418" />
      <ContactShadows position={[0, 0.002, 0]} scale={2.8} blur={0.7} opacity={0.5} far={0.25} resolution={512} frames={1} color="#1b160e" />
      <directionalLight position={[1.5, 6, 2]} intensity={1.6} color="#fff8ee" />
      <hemisphereLight args={["#fffaf0", "#b8b0a0", 0.7]} />
      <ambientLight intensity={0.25} color="#efe8da" />
      <Environment resolution={256} frames={1}>
        <mesh scale={40}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#0d0c0a" side={THREE.BackSide} />
        </mesh>
        {/* One large soft overhead light. */}
        <Lightformer form="rect" intensity={4} color="#fffaf0" position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={[4.2, 4.2, 1]} />
        {/* The long strip softbox, behind and above: its reflection is the band across the pool. */}
        <Lightformer form="rect" intensity={7} color="#ffffff" position={[0, 5.5, -8]} scale={[26, 0.5, 1]} />
        <Lightformer form="rect" intensity={3.2} color="#fff6ea" position={[-9, 3, 2]} rotation-y={Math.PI / 2} scale={[1.2, 10, 1]} />
        {/* The pale sweep, bounced back into the pool at grazing angles. */}
        <Lightformer form="rect" intensity={1.1} color="#e8e4da" position={[0, 2, 14]} rotation-y={Math.PI} scale={[40, 8, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#fff8ee" position={[6, 5, 6]} rotation-y={-Math.PI / 4} scale={[3, 3, 1]} />
      </Environment>
      <Demand />
      <Ready onReady={onReady} />
    </Canvas>
  );
}
