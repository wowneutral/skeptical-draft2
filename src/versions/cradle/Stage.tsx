// The cradle, shot like a product: eight polished balls on fine wires from a
// matte black frame, on black stone, on a dark seamless sweep. One large soft
// key from above and behind. The balls are traced against each other in their
// own shader, so each one carries the same clean highlight and its neighbours.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clamp, damp, lerp, smooth, still } from '@/lib/utils';
import { GAP, LC, N, R, RAIL_Z, TOP, click, group, pull, px, rig, step, wakeSound } from './rig';

type Shot = { az: number; el: number; d: number; fov: number; tx: number; ty: number; sx: number; sy: number };
const S = (az: number, el: number, d: number, fov: number, tx: number, ty: number, sx: number, sy: number): Shot => ({ az, el, d, fov, tx, ty, sx, sy });

// hero, record, drive, people, join, end
const WIDE: Shot[] = [
  S(0, 3, 26.5, 16, 0, 1.3, 0.215, 0.03),
  S(-17, 8, 27, 16, 0, 1.25, -0.2, 0.0),
  S(0, 6, 28, 16, 0, 1.3, 0.19, 0.0),
  S(50, 1.2, 12.5, 26, -0.6, 1.05, -0.17, 0.02),
  S(87, 5, 25, 16, 0, 1.3, 0, 0.15),
  S(0, 2, 27, 16, 0, 1.3, 0.19, 0.03),
];
const TALL: Shot[] = [
  S(0, 4, 28, 25, 0, 1.3, 0, 0.19),
  S(-17, 8, 28, 25, 0, 1.25, 0, 0.2),
  S(0, 6, 28, 25, 0, 1.3, 0, 0.2),
  S(50, 1.2, 12, 34, -0.6, 1.05, 0, 0.22),
  S(87, 5, 22, 25, 0, 1.3, 0, 0.24),
  S(0, 3, 28, 25, 0, 1.3, 0, 0.2),
];

/* ───────── the balls' own shader ───────── */

const ballVert = /* glsl */ `
varying vec3 vW; varying vec3 vN;
void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;

const ballFrag = /* glsl */ `
uniform vec3 uC[8]; uniform float uLit[8]; uniform float uIdx; uniform float uExpo; uniform float uR;
varying vec3 vW; varying vec3 vN;
const vec3 F0 = vec3(0.60, 0.60, 0.585);
float rectL(vec3 d, vec3 c, vec3 tx, vec3 ty, vec2 hs, float soft){
  float k = dot(d, c); if (k <= 0.0) return 0.0;
  vec2 q = abs(vec2(dot(d, tx), dot(d, ty)) / k) / hs;
  return (1.0 - smoothstep(1.0 - soft, 1.0, q.x)) * (1.0 - smoothstep(1.0 - soft, 1.0, q.y));
}
vec3 env(vec3 d){
  vec3 col = vec3(0.02) * (0.5 + 0.5 * clamp(d.y + 0.6, 0.0, 1.0));
  // the sweep in front of the cradle catches a little of the key
  col += vec3(0.05, 0.05, 0.048) * smoothstep(-0.1, 0.9, d.z) * smoothstep(-0.2, 0.3, d.y) * (1.0 - smoothstep(0.3, 0.9, d.y));
  // the key: one large soft box above and behind
  vec3 kc = normalize(vec3(0.0, 0.8, -0.6)); vec3 kx = vec3(1.0, 0.0, 0.0); vec3 ky = normalize(cross(kc, kx));
  col += vec3(1.0, 0.985, 0.955) * 7.5 * rectL(d, kc, kx, ky, vec2(1.25, 0.30), 0.22);
  // a dim card in front, so the fronts read as round
  vec3 fc = normalize(vec3(-0.35, 0.25, 1.0)); vec3 fx = normalize(cross(vec3(0.0,1.0,0.0), fc)); vec3 fy = cross(fc, fx);
  col += vec3(1.1) * rectL(d, fc, fx, fy, vec2(1.5, 0.75), 0.85);
  // a thin strip at the side for the rim
  vec3 rc = normalize(vec3(1.0, 0.15, -0.35)); vec3 rx = normalize(cross(vec3(0.0,1.0,0.0), rc)); vec3 ry = cross(rc, rx);
  col += vec3(0.9) * rectL(d, rc, rx, ry, vec2(0.06, 0.9), 0.4);
  vec3 lc2 = normalize(vec3(-1.0, 0.15, -0.35)); vec3 lx = normalize(cross(vec3(0.0,1.0,0.0), lc2)); vec3 ly = cross(lc2, lx);
  col += vec3(0.45) * rectL(d, lc2, lx, ly, vec2(0.05, 0.9), 0.4);
  // below the horizon: black stone with the key's sheen far off
  if (d.y < 0.0) col = vec3(0.03) + vec3(0.12) * smoothstep(-0.3, 0.0, d.y) * smoothstep(-0.2, 0.9, -d.z) + vec3(0.025) * smoothstep(-0.5, 0.0, d.y);
  return col;
}
vec3 trace(vec3 p, vec3 r, int self){
  vec3 acc = vec3(1.0); vec3 col = vec3(0.0);
  for (int b = 0; b < 3; b++){
    float best = 1e9; int hit = -1;
    for (int j = 0; j < 8; j++){
      if (j == self) continue;
      vec3 oc = p - uC[j]; float bb = dot(oc, r); float c = dot(oc, oc) - uR * uR; float h = bb * bb - c;
      if (h > 0.0){ float t = -bb - sqrt(h); if (t > 1e-4 && t < best){ best = t; hit = j; } }
    }
    if (hit < 0){ col += acc * env(r); return col; }
    vec3 q = p + r * best; vec3 n = normalize(q - uC[hit]);
    float cs = clamp(dot(-r, n), 0.0, 1.0);
    acc *= (F0 + (1.0 - F0) * pow(1.0 - cs, 5.0)) * uLit[hit];
    p = q; r = reflect(r, n); self = hit;
  }
  return col + acc * env(r);
}
void main(){
  vec3 V = normalize(vW - cameraPosition); vec3 Nn = normalize(vN); vec3 Rr = reflect(V, Nn);
  float cs = clamp(dot(-V, Nn), 0.0, 1.0);
  int self = int(uIdx + 0.5);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - cs, 5.0);
  vec3 col = F * trace(vW, Rr, self) * uLit[self];
  // under the ball, the stone takes the light away
  col *= mix(0.55, 1.0, smoothstep(-0.9, -0.2, Nn.y));
  gl_FragColor = vec4(col * uExpo, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function noiseTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, rep = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!; draw(g, size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.NoColorSpace;
  return t;
}

function useParts() {
  return useMemo(() => {
    const centers = Array.from({ length: N }, () => new THREE.Vector3());
    const shared = { uC: { value: centers }, uLit: { value: new Array(N).fill(1) }, uExpo: { value: still ? 1 : 0 }, uR: { value: R } };
    const balls = Array.from({ length: N }, (_, i) => new THREE.ShaderMaterial({ vertexShader: ballVert, fragmentShader: ballFrag, uniforms: { ...shared, uIdx: { value: i } } }));
    // Stone: a fine mottle in the roughness, so the sheen breaks up like honed granite.
    const mottle = noiseTex(256, (g, s) => {
      const im = g.createImageData(s, s);
      for (let i = 0; i < s * s; i++) { const v = 120 + (Math.random() - 0.5) * 60 + (Math.random() < 0.02 ? 50 : 0); im.data.set([v, v, v, 255], i * 4); }
      g.putImageData(im, 0, 0);
    }, 3);
    const stone = new THREE.MeshPhysicalMaterial({ color: '#0d0d0e', roughness: 0.42, roughnessMap: mottle, clearcoat: 0.55, clearcoatRoughness: 0.2, envMapIntensity: 0.9 });
    const frame = new THREE.MeshPhysicalMaterial({ color: '#0b0b0b', roughness: 0.55, metalness: 0.15, clearcoat: 0.5, clearcoatRoughness: 0.35, envMapIntensity: 1.1 });
    const steel = new THREE.MeshStandardMaterial({ color: '#d9d7d2', metalness: 1, roughness: 0.22, envMapIntensity: 1.4 });
    const wire = new THREE.MeshStandardMaterial({ color: '#cfcdc8', metalness: 1, roughness: 0.3, envMapIntensity: 1.6 });
    const sweep = new THREE.MeshStandardMaterial({ color: '#121213', roughness: 0.92, metalness: 0, envMapIntensity: 0.12 });
    return { centers, shared, balls, stone, frame, steel, wire, sweep };
  }, []);
}

/** A floor that curves up into a wall: the seamless sweep. */
function sweepGeometry() {
  const prof: [number, number][] = [];
  const y0 = -0.34, zc = -5, rad = 6;
  prof.push([30, y0]);
  for (let z = 30; z > zc; z -= 2) prof.push([z, y0]);
  for (let k = 0; k <= 16; k++) { const a = (k / 16) * (Math.PI / 2); prof.push([zc - Math.sin(a) * rad, y0 + rad - Math.cos(a) * rad]); }
  prof.push([zc - rad, 40]);
  const xs = [-60, 60], pos: number[] = [], idx: number[] = [];
  prof.forEach(([z, y]) => xs.forEach((x) => pos.push(x, y, z)));
  for (let k = 0; k < prof.length - 1; k++) { const a = k * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function Wire({ z, len, mat }: { z: number; len: number; mat: THREE.Material }) {
  // from the rail at (0,0,z) down to the eyelet at (0,-len,0)
  const l = Math.hypot(len, z), a = Math.atan2(z, len);
  return (
    <mesh position={[0, -len / 2, z / 2]} rotation={[a, 0, 0]} material={mat}>
      <cylinderGeometry args={[0.0075, 0.0075, l, 6, 1]} />
    </mesh>
  );
}

const debug = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

function Cradle() {
  const p = useParts();
  const pivots = useRef<(THREE.Group | null)[]>([]);
  const { camera, gl, size, scene } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const sweep = useMemo(sweepGeometry, []);
  const post = useMemo(() => new RoundedBoxGeometry(0.11, TOP + 0.08, 0.11, 2, 0.025), []);
  const span = (N - 1) * (2 * R + GAP) / 2 + R + 0.42;
  const rail = useMemo(() => new RoundedBoxGeometry(span * 2 + 0.11, 0.1, 0.1, 2, 0.025), [span]);
  const slab = useMemo(() => new RoundedBoxGeometry(6.0, 0.34, 2.2, 4, 0.05), []);
  const key = useRef<THREE.SpotLight>(null);
  const lens = useRef({ az: 0, el: 3, d: 31, fov: 16, tx: 0, ty: 1.3, sx: 0.17, sy: 0, init: false });
  const t0 = useRef(-1);
  const timers = useRef<{ at: number; fn: () => void }[]>([]);
  const drag = useRef<{ i: number; id: number; x: number; y: number; t: number; moved: boolean } | null>(null);
  const hover = useRef({ i: -1, at: 0 });
  const lit = useRef(new Array(N).fill(1));
  const target = useMemo(() => new THREE.Object3D(), []);
  const mark = useRef<THREE.Mesh>(null);

  useEffect(() => { if (key.current) { key.current.target = target; } }, [target]);

  // Pointer: hover nudges, drag pulls along the arc, release swings; a tap swings the nearest.
  useEffect(() => {
    const el = gl.domElement;
    const ray = new THREE.Raycaster(), v2 = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3(), c = new THREE.Vector3();
    const toRay = (e: PointerEvent) => { const r = el.getBoundingClientRect(); v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, cam); };
    const pick = () => {
      let best = Infinity, which = -1;
      for (let i = 0; i < N; i++) { c.set(px(i) + LC * Math.sin(rig.th[i]), TOP - LC * Math.cos(rig.th[i]), 0); const d = ray.ray.distanceSqToPoint(c); if (d < (R * 1.15) ** 2) { const t = c.distanceTo(ray.ray.origin); if (t < best) { best = t; which = i; } } }
      return which;
    };
    const nearest = (e: PointerEvent) => {
      const r = el.getBoundingClientRect(); let best = Infinity, which = -1;
      for (let i = 0; i < N; i++) { c.set(px(i) + LC * Math.sin(rig.th[i]), TOP - LC * Math.cos(rig.th[i]), 0).project(cam); const sx = (c.x + 1) / 2 * r.width + r.left, sy = (1 - c.y) / 2 * r.height + r.top; const d = Math.hypot(sx - e.clientX, (sy - e.clientY) * 0.35); if (d < best) { best = d; which = i; } }
      return best < Math.min(r.width, r.height) * 0.3 ? which : -1;
    };
    const sideOn = () => Math.abs(lens.current.az) < 40;
    const press = () => { rig.pressed = true; wakeSound(); if (!rig.soundTouched && !rig.sound) { rig.sound = true; rig.onSound?.(true); } };
    const swing = (i: number) => { const side = i < N / 2 ? -1 : 1; pull(group(i, side), side * 0.62, 0.55); press(); };
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      toRay(e);
      const i = pick();
      drag.current = { i, id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
      if (i >= 0 && sideOn() && e.pointerType === 'mouse') { el.setPointerCapture(e.pointerId); rig.script = null; press(); el.style.cursor = 'grabbing'; }
    };
    const move = (e: PointerEvent) => {
      toRay(e);
      const d = drag.current;
      if (d && d.i >= 0 && sideOn() && e.pointerType === 'mouse') {
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 3) d.moved = true;
        if (!d.moved || !ray.ray.intersectPlane(plane, hit)) return;
        const th = clamp(Math.atan2(hit.x - px(d.i), TOP - hit.y), -1.15, 1.15);
        const side = th < 0 ? -1 : 1;
        rig.held.fill(0);
        for (const b of group(d.i, side)) { rig.held[b] = 1; rig.ht[b] = th; }
        return;
      }
      if (e.pointerType !== 'mouse') return;
      const i = pick();
      el.style.cursor = i >= 0 ? 'grab' : '';
      const now = performance.now();
      if (i >= 0 && !still && (i !== hover.current.i || now - hover.current.at > 600) && !rig.script) {
        hover.current = { i, at: now };
        rig.om[i] += clamp(e.movementX * 0.04, -0.5, 0.5) || 0.2;
      }
      if (i < 0) hover.current.i = -1;
    };
    const up = (e: PointerEvent) => {
      const d = drag.current; drag.current = null;
      if (!d) return;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (d.moved && d.i >= 0 && sideOn() && e.pointerType === 'mouse') { for (let b = 0; b < N; b++) if (rig.held[b]) { rig.held[b] = 0; rig.om[b] = 0; } el.style.cursor = 'grab'; return; }
      const quick = Math.hypot(e.clientX - d.x, e.clientY - d.y) < 12 && performance.now() - d.t < 600;
      if (!quick) return;
      const i = d.i >= 0 ? d.i : nearest(e);
      if (i >= 0) swing(i);
    };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
  }, [gl, cam]);

  useFrame((state, dt) => {
    const now = state.clock.elapsedTime;
    if (t0.current < 0) {
      t0.current = now;
      if (!still) timers.current.push({ at: now + 2.1, fn: () => { if (rig.shot <= 0 && !rig.pressed) pull([0], -0.62, 0.9); } });
    }
    const age = now - t0.current;
    // Timers
    timers.current = timers.current.filter((t) => { if (now >= t.at) { t.fn(); return false; } return true; });

    // Which shot, and what it does when it arrives.
    const shots = rig.phone ? TALL : WIDE;
    const f = clamp(rig.f, 0, shots.length - 1);
    const k = Math.round(f);
    if (Math.abs(f - k) < 0.3 && k !== rig.shot) {
      const was = rig.shot; rig.shot = k;
      rig.settleTo = 0;
      if (!still && was !== -1) {
        if (k === 1 || k === 3) timers.current.push({ at: now + 0.25, fn: () => { if (rig.shot === k) pull([0, 1], -0.6) } });
        if (k === 4) timers.current.push({ at: now + 0.35, fn: () => { if (rig.shot === k) pull([0, 1, 2], -0.58) } });
      }
      if (k === 2 && !still) rig.settleTo = 9;
      if (k === 5 && !still) {
        rig.settleTo = 3.5;
        timers.current.push({ at: now + 2.4, fn: () => { if (rig.shot !== 5) return; rig.settleTo = 0; pull([0], -0.16, 0.7); } });
        timers.current.push({ at: now + 3.6, fn: () => { if (rig.shot === 5) rig.settleTo = 1.6; } });
      }
    }

    // Physics, and the click.
    const hard = step(dt);
    if (hard > 0.25) click(hard);

    if (debug) { const v = new THREE.Vector3(); (window as unknown as { __cradle: number[][] }).__cradle = p.centers.map((c) => { v.copy(c).project(cam); return [Math.round((v.x + 1) / 2 * size.width), Math.round((1 - v.y) / 2 * size.height), +rig.th[0].toFixed(3), +rig.th[N - 1].toFixed(3)]; }); }
    for (let i = 0; i < N; i++) {
      const g = pivots.current[i]; if (g) g.rotation.z = rig.th[i];
      p.centers[i].set(px(i) + LC * Math.sin(rig.th[i]), TOP - LC * Math.cos(rig.th[i]), 0);
    }

    if (mark.current) { mark.current.visible = rig.focus; mark.current.position.x = p.centers[rig.sel].x; }

    // The drive: seven in shadow, the first one lit.
    const w = 1 - smooth(clamp(Math.abs(f - 2) * 1.4));
    for (let i = 0; i < N; i++) { const to = i === 0 ? 1 + 0.5 * w : 1 - 0.975 * w; lit.current[i] = still ? to : damp(lit.current[i], to, 4, dt); }
    p.shared.uLit.value = lit.current;
    const expo = still ? 1 : smooth(clamp((age - 0.15) / 1.8));
    p.shared.uExpo.value = expo;
    scene.environmentIntensity = expo * (1 - 0.55 * w);
    if (key.current) key.current.intensity = 26 * expo * (1 - 0.6 * w);

    // The lens.
    const a = Math.floor(f), b = Math.min(shots.length - 1, a + 1), u = smooth(f - a);
    const A = shots[a], B = shots[b];
    const goal = { az: lerp(A.az, B.az, u), el: lerp(A.el, B.el, u), d: lerp(A.d, B.d, u), fov: lerp(A.fov, B.fov, u), tx: lerp(A.tx, B.tx, u), ty: lerp(A.ty, B.ty, u), sx: lerp(A.sx, B.sx, u), sy: lerp(A.sy, B.sy, u) };
    const L = lens.current;
    const lam = still || !L.init ? 1e9 : 2.6;
    (Object.keys(goal) as (keyof typeof goal)[]).forEach((key) => { L[key] = lam > 1e8 ? goal[key] : damp(L[key], goal[key], lam, dt); });
    L.init = true;
    const az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
    // A slow breath in the lens so the still frame is alive, never on reduced motion.
    const br = still ? 0 : Math.sin(now * 0.21) * 0.35;
    cam.position.set(L.tx + Math.sin(az + br * 0.004) * Math.cos(el) * L.d, L.ty + Math.sin(el) * L.d, Math.cos(az) * Math.cos(el) * L.d);
    cam.lookAt(L.tx, L.ty, 0);
    cam.fov = L.fov;
    cam.setViewOffset(size.width, size.height, -L.sx * size.width, L.sy * size.height, size.width, size.height);
    cam.updateProjectionMatrix();
  });

  const eyelet = LC - R - 0.035;
  return (
    <group>
      <primitive object={target} position={[0, 0, -1.5]} />
      <spotLight ref={key} position={[0, 11, -6]} angle={0.62} penumbra={1} decay={0} intensity={0} color="#fffaf2" />
      <spotLight position={[9, 3.5, -4]} angle={0.25} penumbra={0.8} decay={0} intensity={2.5} color="#ffffff" />
      <ambientLight intensity={0.02} />

      <mesh geometry={sweep} material={p.sweep} />
      <mesh geometry={slab} material={p.stone} position={[0, -0.17, 0]} />

      {/* the frame: two posts at each end, two rails, little steel feet */}
      {[-1, 1].map((sx) => [-1, 1].map((sz) => (
        <group key={`${sx}${sz}`} position={[sx * span, 0, sz * RAIL_Z]}>
          <mesh geometry={post} material={p.frame} position={[0, (TOP + 0.08) / 2 - 0.02, 0]} />
          <mesh material={p.steel} position={[0, 0.012, 0]}><cylinderGeometry args={[0.1, 0.11, 0.024, 24]} /></mesh>
        </group>
      )))}
      {[-1, 1].map((sz) => <mesh key={sz} geometry={rail} material={p.frame} position={[0, TOP + 0.02, sz * RAIL_Z]} />)}

      {Array.from({ length: N }, (_, i) => (
        <group key={i} position={[px(i), TOP, 0]} ref={(g) => { pivots.current[i] = g; }}>
          {[-1, 1].map((sz) => <mesh key={sz} material={p.steel} position={[0, -0.035, sz * RAIL_Z]}><boxGeometry args={[0.035, 0.03, 0.12]} /></mesh>)}
          <Wire z={RAIL_Z} len={eyelet} mat={p.wire} />
          <Wire z={-RAIL_Z} len={eyelet} mat={p.wire} />
          <mesh material={p.steel} position={[0, -eyelet + 0.005, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.03, 0.009, 8, 20]} /></mesh>
          <mesh material={p.balls[i]} position={[0, -LC, 0]}><sphereGeometry args={[R, 64, 48]} /></mesh>
        </group>
      ))}

      <mesh ref={mark} visible={false} position={[0, 0.006, 0.62]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.42, 0.035]} /><meshBasicMaterial color="#ecebe6" toneMapped={false} /></mesh>
      <ContactShadows position={[0, 0.003, 0]} scale={[5.9, 2.15]} resolution={512} blur={2.2} far={1.4} opacity={0.9} frames={still ? 2 : Infinity} color="#000000" />

      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={6} color="#fffaf0" position={[0, 8, -6]} scale={[14, 4, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[9, 2, -3]} scale={[0.6, 8, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[-9, 2, -3]} scale={[0.6, 8, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={0.25} color="#ffffff" position={[-3, 2, 9]} scale={[6, 4, 1]} target={[0, 1, 0]} />
      </Environment>
    </group>
  );
}

export default function Stage({ phone }: { phone: boolean }) {
  rig.phone = phone;
  return (
    <Canvas
      dpr={phone ? [1, 1.5] : [1, 1.6]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 16, near: 0.5, far: 200, position: [0, 2, 31] }}
      style={{ touchAction: 'pan-y' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}
    >
      <color attach="background" args={['#0c0c0d']} />
      <Cradle />
    </Canvas>
  );
}

