// Version 43's still life: a thick tumbler two thirds full of water, a steel
// rule leaning in it, a dark sweep, one softbox and a rim. The rule is drawn
// twice: the dry part as it is, and the wet part moved by Snell's law for the
// camera's angle and clipped at the surface. That is the whole trick.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { clamp, damp, lerp, smooth } from '@/lib/utils';
import { store } from './store';

/* ───────── the object, in world units (the glass stands at the origin) ───────── */
export const G = {
  Rb: 0.44, Rt: 0.53, H: 1.55, wall: 0.05, base: 0.21,
  W: 0, // water level, set below
  L: 2.75, w: 0.17, t: 0.016,
};
G.W = G.base + (G.H - G.base) * 0.66;
const Ro = (y: number) => G.Rb + (G.Rt - G.Rb) * (y / G.H);
const Ri = (y: number) => Ro(y) - G.wall;
const N = 1.333;
const ZB = -0.17; // the rule leans in a plane a little behind the axis, where the water magnifies more
const RHO = Ri(G.base) - 0.17; // where the foot of the rule sits, across from the lean
const TH_REST = Math.atan((Math.sqrt(Ri(G.H) ** 2 - ZB * ZB) - 0.12 + RHO) / (G.H - G.base - 0.04));
const H_CLEAR = G.H - G.base + 0.1; // lifted this far, the foot clears the rim
export const H_OUT = H_CLEAR + 0.32;
const H_UP = H_CLEAR + 0.12;

export type Cam = { az: number; el: number; d: number };
export const STOP_HERO: Cam = { az: -14, el: 7, d: 9.4 };
export const STOP_RECORD: Cam = { az: 0, el: 26, d: 12.2 };

/* ───────── poses ───────── */
const UP = new THREE.Vector3(0, 1, 0);
const E = new THREE.Vector3(1, 0, 0); // the plane the rule leans in
const NRM = new THREE.Vector3(0, 0, 1);
const m4 = new THREE.Matrix4();
const qA = new THREE.Quaternion(), qB = new THREE.Quaternion();
const tmpV = new THREE.Vector3();

/** The rule's centre and rotation for a lift h, a lean angle th, and the record blend a. */
function pose(h: number, th: number, a: number, outP: THREE.Vector3, outQ: THREE.Quaternion) {
  const p1 = smooth(clamp(a / 0.5)), p2 = smooth(clamp((a - 0.5) / 0.3)), p3 = smooth(clamp((a - 0.8) / 0.2));
  const hh = lerp(h, Math.max(h, H_UP), p1), tt = lerp(th, 0, p1);
  const dir = new THREE.Vector3(Math.sin(tt), Math.cos(tt), 0);
  const foot = new THREE.Vector3(-RHO * (1 - p1 * 0.9), G.base + 0.045 + hh, 0);
  const c = foot.addScaledVector(dir, G.L / 2);
  // In the water: length along dir, face toward the camera's side of the lean plane.
  const X = new THREE.Vector3().crossVectors(dir, NRM);
  m4.makeBasis(X, dir, NRM); qA.setFromRotationMatrix(m4);
  // Across the top: length along E, face up.
  m4.makeBasis(new THREE.Vector3(0, 0, 1), E, UP); qB.setFromRotationMatrix(m4);
  outQ.copy(qA).slerp(qB, p2);
  const yTop = G.H + G.t / 2 + 0.004;
  outP.set(lerp(c.x, 0, p2), lerp(c.y, yTop, p3), lerp(ZB, 0, p1));
  return outP;
}

/* ───────── textures drawn on a canvas ───────── */
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!; draw(g);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8; return t;
}
function rnd(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

function ruleTextures() {
  const W = 256, H = 2048, mm = (H - 40) / 300;
  const ticks = (g: CanvasRenderingContext2D, ink: string) => {
    g.fillStyle = ink;
    for (let i = 0; i <= 300; i++) {
      const y = 20 + i * mm;
      const len = i % 10 === 0 ? 0.42 : i % 5 === 0 ? 0.28 : 0.16;
      g.fillRect(0, y - 0.9, W * len, 1.8);
      if (i % 2 === 0) { const l2 = i % 10 === 0 ? 0.24 : 0.1; g.fillRect(W * (1 - l2), y - 0.8, W * l2, 1.6); }
    }
    // The hanging hole, etched, at the dry end.
    g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(W * 0.62, H - 60, 22, 0, Math.PI * 2); g.stroke();
    g.fillRect(W * 0.62 - 1, 70, 2, 12); // a single centre mark
  };
  const map = canvasTex(W, H, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); ticks(g, '#2b2c2e'); }, true);
  const r = rnd(7);
  const rough = canvasTex(W, H, (g) => {
    g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { const v = rnd(i)() < 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${0.04 + r() * 0.08})`; g.fillRect(r() * W, r() * H - 200, 1, 80 + r() * 700); }
    ticks(g, '#c8c8c8');
  });
  return { map, rough };
}

function floorTextures() {
  // Contact shadow: dark under the glass, drawn away from the softbox.
  const shadow = canvasTex(512, 512, (g) => {
    const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256);
    gr.addColorStop(0, 'rgba(0,0,0,0.92)'); gr.addColorStop(0.3, 'rgba(0,0,0,0.7)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  });
  // Caustic: the light the base and the water bend onto the floor.
  const caustic = canvasTex(512, 512, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
    g.globalCompositeOperation = 'lighter';
    const blob = (x: number, y: number, r: number, a: number) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,250,240,${a})`); gr.addColorStop(1, 'rgba(255,250,240,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
    // A crescent: the bright rim of the focused light.
    for (let i = 0; i < 90; i++) { const t = (i / 89 - 0.5) * 2.2; blob(256 + Math.cos(t) * 150, 256 + Math.sin(t) * 150, 26 - Math.abs(t) * 8, 0.09); }
    blob(330, 256, 70, 0.35); blob(380, 256, 30, 0.45);
    const r = rnd(3);
    for (let i = 0; i < 40; i++) { const t = (r() - 0.5) * 1.8, d = 60 + r() * 100; blob(256 + Math.cos(t) * d, 256 + Math.sin(t) * d, 6 + r() * 10, 0.12); }
  }, true);
  return { shadow, caustic };
}

/* ───────── geometry ───────── */
function lathe(pts: THREE.Vector2[], seg: number, probe: number) {
  let g = new THREE.LatheGeometry(pts, seg);
  // Make sure the outside faces out: the probe vertex sits on the outer wall at angle 0 (+z).
  const n = g.getAttribute('normal');
  if (n.getZ(probe) < 0) { g.dispose(); g = new THREE.LatheGeometry(pts.slice().reverse(), seg); }
  return g;
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number) {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); out.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); }
  return out;
}
function glassGeometry() {
  const { Rb, H, wall, base } = G, k = 0.035, rr = wall / 2;
  const P: THREE.Vector2[] = [new THREE.Vector2(0, 0.0)];
  P.push(new THREE.Vector2(Rb - k - 0.06, 0.0));
  P.push(...arc(Rb - k, k, k, -Math.PI / 2, 0, 6));
  const probe = P.length + 4;
  for (let i = 1; i <= 10; i++) { const y = k + (H - rr - k) * (i / 10); P.push(new THREE.Vector2(Ro(y), y)); }
  // The rim: rounded, the thickness of the wall.
  P.push(...arc(Ro(H - rr) - rr, H - rr, rr, 0, Math.PI, 10).slice(1));
  for (let i = 1; i <= 10; i++) { const y = H - rr - (H - rr - base - 0.05) * (i / 10); P.push(new THREE.Vector2(Ri(y), y)); }
  P.push(...arc(Ri(base + 0.05) - 0.05, base + 0.05, 0.05, 0, -Math.PI / 2, 6).slice(1));
  P.push(new THREE.Vector2(0, base));
  return lathe(P, 120, probe);
}
function waterGeometry() {
  const e = 0.004, b = G.base + e;
  const P: THREE.Vector2[] = [new THREE.Vector2(0, b), new THREE.Vector2(Ri(b) - e - 0.05, b)];
  P.push(...arc(Ri(b + 0.05) - e - 0.05, b + 0.05, 0.05, -Math.PI / 2, 0, 5).slice(1));
  const probe = P.length + 2;
  for (let i = 1; i <= 6; i++) { const y = b + 0.05 + (G.W + 0.022 - b - 0.05) * (i / 6); P.push(new THREE.Vector2(Ri(y) - e, y)); }
  return lathe(P, 120, probe);
}
const RW = Ri(G.W) - 0.004;
const meniscus = (r: number) => G.W + 0.022 * Math.exp(-(RW - r) / 0.022);

/* ───────── the water's surface, with rings ───────── */
function Surface() {
  const NR = 44, NS = 120;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array((NR + 1) * (NS + 1) * 3), idx: number[] = [];
    for (let i = 0; i <= NR; i++) for (let j = 0; j <= NS; j++) {
      const r = RW * Math.pow(i / NR, 0.85), t = (j / NS) * Math.PI * 2, o = (i * (NS + 1) + j) * 3;
      pos[o] = Math.cos(t) * r; pos[o + 1] = meniscus(r); pos[o + 2] = Math.sin(t) * r;
    }
    for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++) {
      const a = i * (NS + 1) + j, b = a + NS + 1, c = a + 1, d = b + 1;
      idx.push(a, c, b, c, d, b);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, []);
  const calm = useRef(true);
  useFrame(() => {
    const now = performance.now() / 1000;
    store.waves = store.waves.filter((w) => now - w.t < 4);
    if (!store.waves.length && calm.current) return;
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i <= NR; i++) for (let j = 0; j <= NS; j++) {
      const k = i * (NS + 1) + j, x = pos.getX(k), z = pos.getZ(k), r = Math.hypot(x, z);
      let y = meniscus(r);
      const edge = 1 - Math.pow(r / RW, 8);
      for (const w of store.waves) {
        const age = now - w.t, d = Math.hypot(x - w.x, z - w.z), front = 0.5 * age;
        const env = (q: number) => Math.exp(-(((q - front) / 0.14) ** 2));
        const amp = w.a * 0.011 * Math.exp(-age * 1.1);
        y += amp * (Math.sin(32 * (d - front)) * env(d) + 0.55 * Math.sin(32 * (2 * RW - r - front)) * env(2 * RW - r)) * edge;
      }
      pos.setY(k, y);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
    calm.current = store.waves.length === 0;
  });
  return (
    <mesh geometry={geo}>
      <meshPhysicalMaterial color="#ffffff" transmission={1} thickness={0.05} roughness={0.02} ior={N} envMapIntensity={1.4} specularIntensity={1} />
    </mesh>
  );
}

/* ───────── the rule ───────── */
const wetShader = (mat: THREE.Material, u: { cam: { value: THREE.Vector3 }; inv: { value: THREE.Matrix4 } }) => {
  mat.onBeforeCompile = (s) => {
    s.uniforms.uCam = u.cam; s.uniforms.uInv = u.inv;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>
uniform vec3 uCam; uniform mat4 uInv;`)
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position);
{
  // Snell at the side of a water cylinder (one refracting surface, paraxial):
  // a point inside looks magnified sideways, by more the further back it is.
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  float R = ${G.Rb.toFixed(4)} + ${(G.Rt - G.Rb).toFixed(4)} * (wp.y / ${G.H.toFixed(4)}) - ${G.wall.toFixed(4)};
  vec2 c = normalize(uCam.xz + vec2(1e-5));
  vec2 s = vec2(-c.y, c.x);
  float a = dot(wp.xz, s), b = dot(wp.xz, c);
  float u = max(0.02, R - b);
  float v = 1.0 / (${N.toFixed(3)} / u - ${(N - 1).toFixed(3)} / R);
  float m = 1.0 + (${N.toFixed(3)} * v / u - 1.0) * 1.7; // the thick wall adds its own lens
  float a2 = clamp(a * m, -R * 0.95, R * 0.95);
  float b2 = mix(b, max(-R * 0.95, R - v), 0.35);
  // Seen from above the surface the wet part also rises toward the eye.
  float e = clamp(uCam.y / max(0.1, length(uCam.xz)), 0.0, 1.0);
  float depth = ${G.W.toFixed(4)} - wp.y;
  wp.y += depth * e * 0.18;
  wp.xz = s * a2 + c * b2;
  transformed = (uInv * wp).xyz;
}`);
  };
};

function Rule({ mode }: { mode: Mode }) {
  const { map, rough } = useMemo(ruleTextures, []);
  const geo = useMemo(() => new THREE.BoxGeometry(G.w, G.L, G.t, 1, 64, 1), []);
  const u = useMemo(() => ({ cam: { value: new THREE.Vector3() }, inv: { value: new THREE.Matrix4() } }), []);
  const [dry, wet] = useMemo(() => {
    const base = { color: '#e2e4e5', metalness: 1, roughness: 0.36, map, roughnessMap: rough, envMapIntensity: 2.4, clipShadows: true } as const;
    const d = new THREE.MeshStandardMaterial({ ...base, clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 1, 0), -G.W)] });
    const w = new THREE.MeshStandardMaterial({ ...base, envMapIntensity: 3, clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, -1, 0), G.W)] });
    wetShader(w, u);
    return [d, w];
  }, [map, rough, u]);
  const grp = useRef<THREE.Group>(null);
  const wetMesh = useRef<THREE.Mesh>(null);
  const st = useRef({ h: mode === 'live' ? H_OUT + 1.1 : mode === 'lifted' ? H_UP : 0, v: 0, lean: 1, a: mode === 'lifted' ? 1 : 0, lastFoot: 9, lastWave: 0, start: 0 });
  const { camera, gl } = useThree();
  useEffect(() => { gl.localClippingEnabled = true; }, [gl]);

  const P = useMemo(() => new THREE.Vector3(), []), Q = useMemo(() => new THREE.Quaternion(), []);
  useFrame((_, dtRaw) => {
    const s = st.current, now = performance.now() / 1000;
    if (mode === 'live') {
      if (!s.start) s.start = now + 1.1;
      const going = now > s.start;
      // The record lifts it out on its own, at its own pace (wall clock, so a slow frame never stalls it).
      const at = store.auto > 0.5 ? 1 : 0;
      s.a = clamp(s.a + Math.sign(at - s.a) * Math.min(dtRaw, 0.5) / 2.4);
      if (Math.abs(at - s.a) < 0.002) s.a = at;
      // Substeps of at most 1/60 s: a slow frame still plays at the right speed.
      const total = Math.min(dtRaw, 0.5), steps = Math.max(1, Math.ceil(total * 60)), dt = total / steps;
      for (let n = 0; n < steps; n++) {
        if (store.held) {
          const k = 1 - Math.exp(-dt * 18);
          const nv = (store.lift - s.h) * k / Math.max(dt, 1e-3);
          s.v = lerp(s.v, nv, 0.5); s.h += (store.lift - s.h) * k;
        } else if (!going) {
          s.v = 0;
        } else if (!store.opened) {
          // The opening: it drops into the glass on the clock, then the page arrives.
          const t = now - s.start, T = 0.75;
          const k = clamp(t / T);
          s.h = (H_OUT + 1.1) * (1 - k * k); s.v = -2 * (H_OUT + 1.1) * k / T;
          if (k >= 1) { s.h = 0; s.v = -0.6; store.opened = true; }
        } else if (store.out || s.a > 0.01) {
          // Hold it up in the air: a soft spring with a little overshoot.
          const target = s.a > 0.01 ? H_UP : H_OUT;
          s.v += ((target - s.h) * 60 - s.v * 9) * dt; s.h += s.v * dt;
        } else {
          // Let go: it falls, slows in the water, knocks the bottom once.
          s.v -= 9.8 * 0.55 * dt;
          const footY = G.base + 0.045 + s.h;
          if (footY < G.W) s.v *= Math.exp(-dt * 4.5);
          s.h += s.v * dt;
          if (s.h < 0) { s.h = 0; s.v = Math.abs(s.v) > 0.25 ? -s.v * 0.16 : 0; }
        }
      }
      s.h = clamp(s.h, -0.001, H_OUT + 2.6);
      s.lean = damp(s.lean, store.held ? store.lean : store.out ? 0.4 : 1, 7, Math.min(dtRaw, 0.5));
      store.lift = store.held ? store.lift : s.h;
    }
    const th = TH_REST * s.lean * (1 - smooth(clamp(s.h / H_CLEAR)));
    pose(s.h, th, s.a, P, Q);
    const g = grp.current; if (!g) return;
    g.position.copy(P); g.quaternion.copy(Q); g.updateMatrixWorld();
    u.cam.value.copy(camera.position);
    if (wetMesh.current) u.inv.value.copy(wetMesh.current.matrixWorld).invert();
    // Rings where it meets the water.
    if (mode === 'live') {
      const dir = tmpV.set(0, 1, 0).applyQuaternion(Q);
      const foot = P.clone().addScaledVector(dir, -G.L / 2);
      const sAlong = dir.y > 0.05 ? (G.W - foot.y) / dir.y : -1;
      if (sAlong > 0 && sAlong < G.L) {
        const px = foot.x + dir.x * sAlong, pz = foot.z + dir.z * sAlong;
        if (s.lastFoot > G.W && foot.y <= G.W) store.waves.push({ x: px, z: pz, t: now, a: clamp(Math.abs(s.v) * 0.7, 0.6, 1.6) });
        else if (Math.abs(s.v) > 0.35 && now - s.lastWave > 0.14) { s.lastWave = now; store.waves.push({ x: px, z: pz, t: now, a: clamp(Math.abs(s.v) * 0.25, 0.1, 0.5) }); }
      }
      s.lastFoot = foot.y;
    }
  });

  return (
    <group ref={grp}>
      <mesh geometry={geo} material={dry} />
      <mesh geometry={geo} material={wet} ref={wetMesh} />
    </group>
  );
}

/* ───────── the camera ───────── */
function Rig({ mode, phone }: { mode: Mode; phone: boolean }) {
  const { camera, size } = useThree();
  const cur = useRef<Cam & { ty: number }>({ ...(mode === 'lifted' ? STOP_RECORD : STOP_HERO), ty: 1.25 });
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1), c = cur.current;
    const goal: Cam = mode === 'live' ? store : mode === 'lifted' ? STOP_RECORD : STOP_HERO;
    const k = mode === 'live' ? 2.2 : 100;
    c.az = damp(c.az, goal.az, k, dt); c.el = damp(c.el, goal.el, k, dt); c.d = damp(c.d, goal.d, k, dt);
    const lifted = mode === 'lifted' ? 1 : store.auto > 0.5 ? 1 : 0;
    c.ty = damp(c.ty, lifted ? 1.45 : 1.25, 1.5, dt);
    const cam = camera as THREE.PerspectiveCamera;
    const az = THREE.MathUtils.degToRad(c.az), el = THREE.MathUtils.degToRad(c.el);
    const d = c.d * (phone ? 1.3 : 1) * (phone && lifted ? 1.2 : 1);
    cam.position.set(Math.sin(az) * Math.cos(el) * d, c.ty + Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d);
    cam.lookAt(0, c.ty, 0);
    // Frame it: the glass sits to the right on a wide screen, in the top half on a phone.
    const W = size.width, H = size.height;
    const px = mode !== 'live' ? 0.5 : phone ? 0.5 : 0.7, py = mode !== 'live' ? 0.5 : phone ? 0.29 : 0.52;
    cam.setViewOffset(W, H, W * (0.5 - px), H * (0.5 - py), W, H);
  });
  return null;
}

/* ───────── the room ───────── */
function Sweep() {
  const geo = useMemo(() => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 20; i++) pts.push([0, 9 - (i / 20) * 12]); // floor, front to back: z from 9 to -3
    for (let i = 1; i <= 24; i++) { const a = (i / 24) * (Math.PI / 2); pts.push([4 - Math.cos(a) * 4, -3 - Math.sin(a) * 4]); }
    for (let i = 1; i <= 6; i++) pts.push([4 + i * 2, -7]);
    const pos: number[] = [], idx: number[] = [];
    pts.forEach(([y, z], i) => { pos.push(-30, y, z, 30, y, z); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    if (g.getAttribute('normal').getY(0) < 0) { g.setIndex(idx.map((_, i) => idx[i - (i % 3) + [0, 2, 1][i % 3]])); g.computeVertexNormals(); }
    return g;
  }, []);
  const { shadow, caustic } = useMemo(floorTextures, []);
  return (
    <group>
      <mesh geometry={geo}><meshStandardMaterial color="#17181a" roughness={0.88} envMapIntensity={0.12} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.16, 0.003, -0.04]} scale={[1.9, 1.5, 1]}>
        <planeGeometry args={[1, 1]} /><meshBasicMaterial map={shadow} transparent depthWrite={false} color="#000" alphaMap={shadow} opacity={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.62, 0.005, 0.12]} rotation-z={-0.08} scale={[1.8, 1.25, 1]}>
        <planeGeometry args={[1, 1]} /><meshBasicMaterial map={caustic} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Glass({ phone }: { phone: boolean }) {
  const glass = useMemo(glassGeometry, []);
  const water = useMemo(waterGeometry, []);
  return (
    <group>
      <mesh geometry={glass} renderOrder={2}>
        <MeshTransmissionMaterial
          transmission={1} thickness={0.32} roughness={0.015} ior={1.52} chromaticAberration={0.035} anisotropy={0.08}
          distortion={0} samples={phone ? 4 : 6} resolution={phone ? 384 : 640} backside={false} color="#f7f9f7"
          attenuationColor="#e9eeea" attenuationDistance={2.2} envMapIntensity={1.3} clearcoat={1} clearcoatRoughness={0.02} />
      </mesh>
      <mesh geometry={water} renderOrder={1}>
        <meshPhysicalMaterial color="#ffffff" transmission={1} thickness={0.12} roughness={0.03} ior={N} envMapIntensity={1.1} />
      </mesh>
      <Surface />
    </group>
  );
}

function Lights({ mode }: { mode: Mode }) {
  const spot = useRef<THREE.SpotLight>(null), back = useRef<THREE.SpotLight>(null);
  const { scene } = useThree();
  const born = useRef(0);
  useEffect(() => {
    if (spot.current) { spot.current.target.position.set(0.3, 0, 0); spot.current.target.updateMatrixWorld(); }
    if (back.current) { back.current.target.position.set(0.9, 2.2, -7); back.current.target.updateMatrixWorld(); }
  }, []);
  useFrame(() => {
    // The opening: the studio light comes up before anything else happens.
    const now = performance.now() / 1000; if (!born.current) born.current = now;
    const t = mode === 'live' ? smooth(clamp((now - born.current) / 1.4)) : 1;
    if (spot.current) spot.current.intensity = 170 * t;
    if (back.current) back.current.intensity = 260 * t;
    scene.environmentIntensity = 0.15 + 0.85 * t;
  });
  return (
    <>
      <ambientLight intensity={0.03} />
      <spotLight ref={spot} position={[-4.5, 7.5, 3.2]} angle={0.5} penumbra={1} decay={2} intensity={95} color="#fff6ea" />
      {/* The backdrop light: a soft pool on the sweep behind the glass, so its walls draw dark lines against it. */}
      <spotLight ref={back} position={[1.2, 7, 3]} angle={0.3} penumbra={1} decay={2} intensity={0} color="#f3efe8" />
      <directionalLight position={[3, 3, -6]} intensity={0.5} color="#e8eef5" />
    </>
  );
}

export type Mode = 'live' | 'rest' | 'lifted';

export default function Scene({ mode, phone }: { mode: Mode; phone: boolean }) {
  return (
    <Canvas
      frameloop={mode === 'live' ? 'always' : 'demand'}
      dpr={[1, phone ? 1.5 : 1.6]}
      camera={{ fov: phone ? 27 : 20, near: 0.5, far: 60, position: [0, 2, 10] }}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={({ gl }) => { gl.localClippingEnabled = true; }}
    >
      <color attach="background" args={['#0b0c0d']} />
      <Environment resolution={256} frames={1}>
        {/* The big softbox, camera left: the long highlight down the glass and the rule. */}
        <Lightformer form="rect" intensity={4} color="#fffaf2" position={[-5, 2.5, 3]} scale={[3.2, 9, 1]} target={[0, 1, 0]} />
        {/* The rim, behind and right. */}
        <Lightformer form="rect" intensity={3} color="#eef3f7" position={[4.5, 2, -4]} scale={[0.8, 8, 1]} target={[0, 1, 0]} />
        {/* A faint top card for the water's surface. */}
        <Lightformer form="rect" intensity={1.1} color="#ffffff" position={[0, 7, 1]} scale={[5, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.35} color="#ffffff" position={[3, 1, 6]} scale={[4, 2, 1]} target={[0, 1, 0]} />
        {/* A white card high in front, for the steel to hold. */}
        <Lightformer form="rect" intensity={1.6} color="#fbf8f2" position={[-1.5, 5.5, 7]} scale={[6, 2.5, 1]} target={[0, 1.2, 0]} />
        {/* A card high behind the glass: what the rule holds when it lies face up across the top. */}
        <Lightformer form="rect" intensity={1.8} color="#f6f4ee" position={[0, 5, -6]} scale={[7, 3, 1]} target={[0, 1.5, 0]} />
        {/* A broad dim card behind the camera: what a polished face holds when it looks straight back. */}
        <Lightformer form="rect" intensity={0.9} color="#f4f2ec" position={[0, 2.5, 12]} scale={[12, 5, 1]} target={[0, 1.2, 0]} />
      </Environment>
      <Lights mode={mode} />
      <Rig mode={mode} phone={phone} />
      <Sweep />
      <Glass phone={phone} />
      <Rule mode={mode} />
      {mode === 'live' && <Handle />}
    </Canvas>
  );
}

/* ───────── the hand: a generous invisible grip around the rule and glass ───────── */
function Handle() {
  const ref = useRef<THREE.Mesh>(null);
  const { camera, size, gl } = useThree();
  const drag = useRef<{ x: number; y: number; lift: number; lean: number; t: number; moved: boolean } | null>(null);
  useFrame(() => {
    const m = ref.current; if (!m) return;
    const h = store.lift;
    m.position.set(0.2, Math.max(1.4, 1.3 + h * 0.8), 0);
    m.scale.set(1, 1 + h * 0.4, 1);
    m.visible = store.auto < 0.5;
  });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current; if (!d) return;
      const cam = camera as THREE.PerspectiveCamera;
      const k = (2 * cam.position.distanceTo(new THREE.Vector3(0, 1.3, 0)) * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / size.height;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (Math.hypot(dx, dy) > 6) d.moved = true;
      if (!store.held && d.moved) store.held = true;
      if (!store.held) return;
      const side = Math.cos(THREE.MathUtils.degToRad(store.az)) >= 0 ? 1 : -1;
      store.lift = clamp(d.lift - dy * k * 1.1, 0, H_OUT + 0.9);
      store.lean = clamp(d.lean + (dx * k * side) / 0.55, 0.05, 1.1);
    };
    const up = () => {
      const d = drag.current; if (!d) return;
      drag.current = null;
      if (!d.moved) { store.out = !store.out; store.onOut?.(store.out); }
      else if (store.held) { store.out = false; store.onOut?.(false); }
      store.held = false;
      gl.domElement.classList.remove('is-grab'); document.querySelector('.v-bend')?.classList.remove('is-grab');
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [camera, size, gl]);
  return (
    <mesh ref={ref}
      onPointerDown={(e) => { if (store.auto > 0.5) return; e.stopPropagation(); drag.current = { x: e.clientX, y: e.clientY, lift: store.lift, lean: store.out ? 0.4 : store.lean, t: performance.now(), moved: false }; gl.domElement.classList.add('is-grab'); document.querySelector('.v-bend')?.classList.add('is-grab'); }}
      onPointerOver={() => { store.over = true; gl.domElement.classList.add('is-over'); }}
      onPointerOut={() => { store.over = false; gl.domElement.classList.remove('is-over'); }}>
      <boxGeometry args={[1.9, 2.8, 1.2]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  );
}
