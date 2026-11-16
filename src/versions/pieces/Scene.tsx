// The slate and the seven pieces. One spot from high on the left, a cool rim
// from behind, real shadows, bevelled marble. Pieces arc between arrangements,
// slide under the pointer with weight and land with a small knock.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import { createNoise2D } from 'simplex-noise';
import { clamp, damp, isPhone, still } from '@/lib/utils';
import { ARR, LOCAL, RED } from './shapes';
import { board } from './store';

const H = 0.36, BT = 0.055, BS = 0.06, GAP = 0.016;
const FOV = 15, ELEV = 0.86, AZ = 0.34;

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Marble drawn on a canvas: a warm base, soft clouding and a few thin grey veins. Returns colour and roughness. */
function marble(seed: number, red: boolean, size: number) {
  const n2 = createNoise2D(rng(seed));
  const c = document.createElement('canvas'), r = document.createElement('canvas');
  c.width = c.height = r.width = r.height = size;
  const cx = c.getContext('2d')!, rx = r.getContext('2d')!;
  const img = cx.createImageData(size, size), rim = rx.createImageData(size, size);
  const base = red ? [196, 51, 31] : [236, 231, 220];
  const vein = red ? [120, 26, 16] : [168, 163, 155];
  const s = 2.4 / size;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x * s, v = y * s;
    let f = 0, amp = 1, fr = 1;
    for (let o = 0; o < 4; o++) { f += amp * n2(u * fr, v * fr); amp *= 0.45; fr *= 2.1; }
    const w = Math.abs(Math.sin((u * 1.3 + v * 0.7) * 2.6 + f * 2.1));
    const vn = Math.pow(1 - w, 30) * 0.55 + Math.pow(1 - w, 4) * 0.1;
    const cloud = 0.5 + 0.5 * n2(u * 0.6 + 9, v * 0.6 - 3);
    const k = (y * size + x) * 4;
    for (let ch = 0; ch < 3; ch++) img.data[k + ch] = base[ch] * (1 - vn) + vein[ch] * vn - cloud * (red ? 14 : 9);
    img.data[k + 3] = 255;
    const rough = 120 + cloud * 40 + vn * 60;
    rim.data[k] = rim.data[k + 1] = rim.data[k + 2] = rough; rim.data[k + 3] = 255;
  }
  cx.putImageData(img, 0, 0); rx.putImageData(rim, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const rough = new THREE.CanvasTexture(r);
  for (const t of [map, rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  return { map, rough };
}

/** Slate: fine dark grain, a little more polish in places. */
function slate(size: number) {
  const n2 = createNoise2D(rng(7));
  const c = document.createElement('canvas'); c.width = c.height = size;
  const cx = c.getContext('2d')!, img = cx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const g = n2(x * 0.9, y * 0.9) * 0.6 + n2(x * 0.05, y * 0.02) * 0.25;
    const k = (y * size + x) * 4, v = 150 + g * 40;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
  }
  cx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10);
  return t;
}

function pieceGeometry(i: number) {
  const shape = new THREE.Shape(LOCAL[i].map(([x, y]) => new THREE.Vector2(x, y)));
  const depth = H - 2 * BT;
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: BT, bevelSize: BS, bevelOffset: -BS - GAP, bevelSegments: 5, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -depth / 2, 0);
  g.computeVertexNormals();
  return g;
}

type Tr = { t0: number; dur: number; x0: number; z0: number; a0: number; f0: number; y0: number; arc: number };
type P = {
  x: number; z: number; a: number; av: number; f: number;
  tgt: { x: number; z: number; a: number; f: number };
  stack: number; lift: number; hop: number; knock: number; tr: Tr | null;
  tiltX: number; tiltZ: number; vx: number; vz: number;
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrapPI = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** The footprint of a piece on the board, in world x/z. */
function footprint(i: number, p: { x: number; z: number; a: number; f: number }, shrink = 0) {
  const c = Math.cos(p.a), s = Math.sin(p.a);
  return LOCAL[i].map(([lx, ly]) => {
    lx *= 1 - shrink; ly *= 1 - shrink;
    let zl = -ly; if (Math.round(p.f) % 2) zl = -zl;
    return [p.x + lx * c + zl * s, p.z - lx * s + zl * c] as [number, number];
  });
}
function inside(poly: [number, number][], x: number, z: number) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, z0] = poly[i], [x1, z1] = poly[(i + 1) % poly.length];
    const cr = (x1 - x0) * (z - z0) - (z1 - z0) * (x - x0);
    if (cr !== 0) { const sg = Math.sign(cr); if (sign && sg !== sign) return false; sign = sg; }
  }
  return true;
}
function overlap(a: [number, number][], b: [number, number][]) {
  for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length];
    const nx = y0 - y1, ny = x1 - x0;
    const pa = a.map((p) => p[0] * nx + p[1] * ny), pb = b.map((p) => p[0] * nx + p[1] * ny);
    if (Math.max(...pa) <= Math.min(...pb) + 1e-4 || Math.max(...pb) <= Math.min(...pa) + 1e-4) return false;
  }
  return true;
}

// A small knock, made from a burst of filtered noise. Only after the visitor has touched something.
let ctx: AudioContext | null = null;
function wakeAudio() { if (!ctx) { try { ctx = new AudioContext(); } catch { ctx = null; } } else if (ctx.state === 'suspended') ctx.resume().catch(() => {}); }
function knock(vol: number) {
  if (!ctx || ctx.state !== 'running') return;
  const len = Math.floor(ctx.sampleRate * 0.09), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520 + Math.random() * 260; bp.Q.value = 2.2;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(bp).connect(g).connect(ctx.destination); src.start();
}

function Pieces() {
  const { camera, gl, size } = useThree();
  const groups = useRef<(THREE.Group | null)[]>([]);
  const spot = useRef<THREE.SpotLight>(null);
  const geos = useMemo(() => LOCAL.map((_, i) => pieceGeometry(i)), []);
  const mats = useMemo(() => {
    const phone = isPhone();
    const white = marble(3, false, phone ? 256 : 512), red = marble(11, true, phone ? 128 : 256);
    return LOCAL.map((_, i) => {
      const t = i === RED ? red : white;
      const map = t.map.clone(), rough = t.rough.clone();
      const ox = (i * 0.37) % 1, oy = (i * 0.61) % 1;
      for (const x of [map, rough]) { x.repeat.set(0.24, 0.24); x.offset.set(ox, oy); x.needsUpdate = true; }
      return new THREE.MeshPhysicalMaterial({
        map, roughnessMap: rough, roughness: i === RED ? 0.62 : 0.55, metalness: 0,
        clearcoat: i === RED ? 0.35 : 0.5, clearcoatRoughness: 0.28, envMapIntensity: 0.7,
        sheen: 0.2, sheenRoughness: 0.6, sheenColor: new THREE.Color(i === RED ? '#ff8a70' : '#fffaf0'),
      });
    });
  }, []);

  const st = useRef<{ ps: P[]; arr: number; reset: number; drag: number; grab: [number, number]; down: { x: number; y: number; t: number; i: number } | null; hover: number; touched: boolean; dist: number; az: number; px: number; first: boolean } | null>(null);
  if (!st.current) {
    const home = ARR[0].poses;
    const r = rng(5);
    st.current = {
      arr: -1, reset: 0, drag: -1, grab: [0, 0], down: null, hover: -1, touched: false, dist: 0, az: AZ, px: 0, first: true,
      ps: home.map((h) => ({
        x: h.x * 1.8 + (r() - 0.5) * 3, z: h.z * 1.4 + (r() - 0.5) * 2, a: h.a + (r() - 0.5) * 2, av: 0, f: 0,
        tgt: { ...h }, stack: 0, lift: 0, hop: -9, knock: -9, tr: null, tiltX: 0, tiltZ: 0, vx: 0, vz: 0,
      })),
    };
  }

  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -H), []);
  const hitV = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  const toBoard = (cx: number, cy: number) => {
    const r = gl.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, hitV) ? [hitV.x, hitV.z] as [number, number] : null;
  };
  const pick = (cx: number, cy: number) => {
    const s = st.current!, b = toBoard(cx, cy); if (!b) return -1;
    let best = -1, top = -1;
    s.ps.forEach((p, i) => { if (inside(footprint(i, p), b[0], b[1]) && p.stack + p.lift > top) { top = p.stack + p.lift; best = i; } });
    return best;
  };
  /** Rest a piece on whatever it was dropped onto. */
  const settle = (i: number) => {
    const s = st.current!, p = s.ps[i];
    const me = footprint(i, { ...p.tgt }, 0.04);
    let h = 0;
    s.ps.forEach((q, j) => { if (j !== i && overlap(me, footprint(j, q.tgt, 0.04))) h = Math.max(h, q.stack + H); });
    p.stack = Math.min(h, H * 3);
  };
  const turn = (i: number, now: number) => {
    const s = st.current!, p = s.ps[i];
    if (p.tr) return;
    p.tgt.a += Math.PI / 4; p.hop = now; p.knock = now + 0.3; settle(i);
    s.touched = true; board.onTouch?.(i);
    setTimeout(() => knock(0.22), 300);
  };
  const nowRef = useRef(0);

  // Pointer: press a piece to turn it, drag it to slide it. A touch on a piece holds the page still; anywhere else it scrolls.
  useEffect(() => {
    const el = gl.domElement, s = st.current!;
    const region = () => { const r = el.getBoundingClientRect(); return r; };
    const down = (e: PointerEvent) => {
      if (e.button > 0) return;
      const i = pick(e.clientX, e.clientY); if (i < 0) return;
      wakeAudio();
      const b = toBoard(e.clientX, e.clientY); if (!b) return;
      const p = s.ps[i]; if (p.tr) return;
      s.down = { x: e.clientX, y: e.clientY, t: performance.now(), i };
      s.grab = [p.tgt.x - b[0], p.tgt.z - b[1]];
      try { el.setPointerCapture(e.pointerId); } catch { /* fine */ }
    };
    const move = (e: PointerEvent) => {
      if (!s.down) {
        if (e.pointerType === 'mouse') { const i = pick(e.clientX, e.clientY); s.hover = i; el.style.cursor = i >= 0 ? 'grab' : ''; }
        return;
      }
      const moved = Math.hypot(e.clientX - s.down.x, e.clientY - s.down.y);
      if (s.drag < 0 && moved > 5) { s.drag = s.down.i; el.style.cursor = 'grabbing'; s.touched = true; board.onTouch?.(s.drag); }
      if (s.drag >= 0) {
        const b = toBoard(e.clientX, e.clientY); if (!b) return;
        const p = s.ps[s.drag], r = region();
        const vis = 2 * s.dist * Math.tan((FOV * Math.PI) / 360);
        const rx = Math.max(1.6, (vis * (r.width / r.height)) * (isPhone() ? 0.42 : board.focusX * 0.88));
        const rz = Math.max(1.6, vis * 0.62);
        p.tgt.x = clamp(b[0] + s.grab[0], -rx, rx);
        p.tgt.z = clamp(b[1] + s.grab[1], -rz, rz);
      }
    };
    const up = (e: PointerEvent) => {
      if (!s.down) return;
      const d = s.down; s.down = null;
      try { el.releasePointerCapture(e.pointerId); } catch { /* fine */ }
      el.style.cursor = s.hover >= 0 ? 'grab' : '';
      if (s.drag >= 0) {
        const i = s.drag; s.drag = -1; settle(i);
        s.ps[i].knock = nowRef.current + 0.12; setTimeout(() => knock(0.3), 120);
      } else if (performance.now() - d.t < 600) turn(d.i, nowRef.current);
    };
    const tstart = (e: TouchEvent) => { const t = e.touches[0]; if (t && e.touches.length === 1 && pick(t.clientX, t.clientY) >= 0) e.preventDefault(); };
    const leave = () => { if (!s.down) { s.hover = -1; el.style.cursor = ''; } };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('touchstart', tstart, { passive: false });
    board.turn = (i) => { wakeAudio(); turn(i, nowRef.current); };
    // Where each piece is on screen (used by the test scripts).
    (window as unknown as { __pieces: () => number[][] }).__pieces = () => s.ps.map((p) => {
      const v = new THREE.Vector3(p.x, H, p.z).project(camera), r = el.getBoundingClientRect();
      return [Math.round(r.left + (v.x + 1) / 2 * r.width), Math.round(r.top + (1 - v.y) / 2 * r.height)];
    });
    board.nudge = (i, dx, dz) => {
      const p = s.ps[i]; if (p.tr) return;
      p.tgt.x = clamp(p.tgt.x + dx, -5, 5); p.tgt.z = clamp(p.tgt.z + dz, -4, 4);
      s.touched = true; settle(i); p.knock = nowRef.current + 0.2;
    };
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('touchstart', tstart);
      board.turn = () => {}; board.nudge = () => {};
    };
  }, [gl, camera]);

  useEffect(() => {
    const on = (e: PointerEvent) => { if (e.pointerType === 'mouse') st.current!.px = (e.clientX / window.innerWidth) * 2 - 1; };
    window.addEventListener('pointermove', on);
    return () => window.removeEventListener('pointermove', on);
  }, []);

  const tgtV = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const s = st.current!, now = state.clock.elapsedTime, dt = Math.min(delta, 0.05);
    nowRef.current = now;

    // A new section: lift every piece and lay it down in the new shape, the red one last.
    if (board.arr !== s.arr || board.reset !== s.reset) {
      const first = s.arr < 0;
      s.arr = board.arr; s.reset = board.reset; s.drag = -1; s.down = null;
      const home = ARR[s.arr].poses;
      s.ps.forEach((p, i) => {
        const h = home[i];
        const a1 = p.a + wrapPI(h.a - p.a);
        p.tgt = { x: h.x, z: h.z, a: a1, f: h.f }; p.stack = 0; p.av = 0;
        if (still) { p.x = h.x; p.z = h.z; p.a = a1; p.f = h.f; p.tr = null; return; }
        const order = i === RED ? 7.4 : [0, 1, 2, 3, 4, 0, 5][i] + (i === 6 ? 1 : 0);
        const flip = Math.abs(h.f - p.f) > 0.5;
        p.tr = {
          t0: now + (first ? 0.5 : 0.02) + order * (first ? 0.16 : 0.075), dur: first ? 1.15 : 0.95,
          x0: p.x, z0: p.z, a0: p.a, f0: p.f, y0: first ? 5.5 + i * 0.3 : p.stack + p.lift,
          arc: flip ? 2.1 : first ? 0 : 0.9 + Math.hypot(h.x - p.x, h.z - p.z) * 0.12,
        };
      });
      if (first) board.onReady?.();
    }

    s.ps.forEach((p, i) => {
      const g = groups.current[i]; if (!g) return;
      let y = 0, tx = 0, tz = 0;
      if (p.tr) {
        const tr = p.tr, t = (now - tr.t0) / tr.dur;
        if (t >= 1) { p.x = p.tgt.x; p.z = p.tgt.z; p.a = p.tgt.a; p.f = p.tgt.f; p.tr = null; p.knock = now; p.lift = 0; if (s.touched) knock(i === RED ? 0.18 : 0.08); }
        else {
          const e = ease(clamp(t)), ey = clamp(t);
          p.x = tr.x0 + (p.tgt.x - tr.x0) * e; p.z = tr.z0 + (p.tgt.z - tr.z0) * e;
          p.a = tr.a0 + (p.tgt.a - tr.a0) * e; p.f = tr.f0 + (p.tgt.f - tr.f0) * e;
          // Falls in like something dropped: accelerating, then the arc on top.
          y = tr.y0 * (1 - ey * ey) + tr.arc * Math.sin(Math.PI * ey);
          tx = Math.sin(Math.PI * ey) * 0.12 * (i % 2 ? 1 : -1);
        }
      } else {
        const lam = s.drag === i ? 16 : 9;
        const ox = p.x, oz = p.z;
        p.x = damp(p.x, p.tgt.x, lam, dt); p.z = damp(p.z, p.tgt.z, lam, dt);
        p.vx = damp(p.vx, (p.x - ox) / Math.max(dt, 1e-3), 12, dt); p.vz = damp(p.vz, (p.z - oz) / Math.max(dt, 1e-3), 12, dt);
        // A spring for the turn, so it overshoots a little and comes back.
        p.av += ((p.tgt.a - p.a) * 170 - p.av * 15) * dt; p.a += p.av * dt;
        p.f = p.tgt.f;
        // Heavy things lean into the way they are pulled.
        tz = clamp(-p.vx * 0.045, -0.22, 0.22); tx = clamp(p.vz * 0.045, -0.22, 0.22);
      }
      const want = s.drag === i ? 0.55 : board.hl.includes(i) ? 0.32 : board.focus === i ? 0.3 : s.hover === i && s.drag < 0 ? 0.07 : 0;
      p.lift = still ? (want > 0.1 ? want : 0) : damp(p.lift, want, s.drag === i ? 14 : 8, dt);
      const hop = now - p.hop < 0.32 ? Math.sin((Math.PI * (now - p.hop)) / 0.32) * 0.38 : 0;
      const k = now - p.knock;
      const bounce = !still && k > 0 ? Math.exp(-7.5 * k) * Math.abs(Math.sin(k * 19)) * 0.11 : 0;
      const wob = !still && k > 0 ? Math.exp(-6 * k) * Math.sin(k * 26) * 0.05 : 0;
      p.tiltX = damp(p.tiltX, tx, 10, dt); p.tiltZ = damp(p.tiltZ, tz, 10, dt);
      g.position.set(p.x, H / 2 + p.stack + p.lift + y + hop + bounce, p.z);
      g.rotation.set(p.f * Math.PI + p.tiltX + wob, p.a, p.tiltZ + wob * 0.6, 'YXZ');
    });

    // The camera: a long lens high and to the right, framing the shape in the left of the screen on a wide screen.
    const ar = ARR[s.arr], aspect = size.width / size.height, phone = isPhone();
    const fx = phone ? 0.5 : board.focusX, regionW = phone ? 1 : board.focusX * 2;
    const t2 = Math.tan((FOV * Math.PI) / 360) * 2;
    const needH = Math.max(ar.h * Math.sin(ELEV) + (phone ? 2.6 : 3.4), (ar.w + (phone ? 2.8 : 3.8)) / (aspect * regionW), phone ? 7.4 : 8.4);
    const dist = needH / t2;
    s.dist = s.dist ? (still ? dist : damp(s.dist, dist, 1.6, dt)) : dist;
    s.az = still ? AZ : damp(s.az, AZ + s.px * 0.05, 2.5, dt);
    const vis = t2 * s.dist, shift = (0.5 - fx) * vis * aspect;
    const rx = Math.cos(s.az), rz = -Math.sin(s.az);
    tgtV.set(rx * shift, 0, rz * shift - (phone ? 0.5 : 0.15));
    camera.position.set(tgtV.x + Math.sin(s.az) * Math.cos(ELEV) * s.dist, Math.sin(ELEV) * s.dist, tgtV.z + Math.cos(s.az) * Math.cos(ELEV) * s.dist);
    camera.lookAt(tgtV);
    if (spot.current) { spot.current.target.position.set(0, 0, 0); spot.current.target.updateMatrixWorld(); }
  });

  const slateMap = useMemo(() => slate(256), []);
  const phone = isPhone();
  return (
    <>
      <spotLight ref={spot} position={[-6, 13, -5]} angle={0.42} penumbra={1} intensity={340} decay={2} color="#fff4e4" castShadow
        shadow-mapSize-width={phone ? 1024 : 2048} shadow-mapSize-height={phone ? 1024 : 2048} shadow-bias={-0.0003} shadow-normalBias={0.03} shadow-radius={5}
        shadow-camera-near={6} shadow-camera-far={34} />
      <directionalLight position={[7, 3.5, -9]} intensity={0.9} color="#dfe6ff" />
      <hemisphereLight args={['#f4efe6', '#0d0d0c', 0.12]} />
      {LOCAL.map((_, i) => (
        <group key={i} ref={(g) => { groups.current[i] = g; }}>
          <mesh geometry={geos[i]} material={mats[i]} castShadow receiveShadow />
        </group>
      ))}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#262523" roughness={0.74} roughnessMap={slateMap} bumpMap={slateMap} bumpScale={0.22} metalness={0} />
      </mesh>
    </>
  );
}

export default function Scene() {
  const phone = isPhone();
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} dpr={[1, phone ? 1.5 : 1.6]}
      camera={{ fov: FOV, near: 1, far: 140, position: [0, 30, 30] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; scene.background = new THREE.Color('#0d0d0c'); scene.fog = new THREE.Fog('#0d0d0c', 40, 90); }}
      aria-hidden
    >
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#fff6ea" position={[-6, 8, -4]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#eef2ff" position={[8, 3, -6]} rotation-y={-Math.PI / 2} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={0.25} color="#f6f2ea" position={[0, 2, 12]} rotation-y={Math.PI} scale={[20, 4, 1]} />
      </Environment>
      <Pieces />
      {!phone && (
        <EffectComposer multisampling={0}>
          <N8AO aoRadius={0.7} intensity={2.2} distanceFalloff={0.6} halfRes quality="performance" color="#000000" />
        </EffectComposer>
      )}
    </Canvas>
  );
}
