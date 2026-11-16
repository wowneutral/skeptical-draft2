// Version 49's stage: a limestone arch on a bone sweep, lit like a museum
// photograph. Eleven voussoirs are rigid bodies (Rapier). Pull the keystone
// and the rest lose their reason to stand; let go and they come back, one by
// one from the springers up, the keystone last.
import { memo, Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Physics, RigidBody, ConvexHullCollider, CuboidCollider, type RapierRigidBody } from '@react-three/rapier';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { scroll } from '@/lib/scroll';
import { clamp, damp, still } from '@/lib/utils';
import { D, HS, KEY, MARK, N, centroid, markBounds, outline, pierBlocks, rng } from './geo';
import { S, setMode } from './store';

const BG = '#e6e1d6';
const DYNAMIC = 0, KINEMATIC = 2;
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ───────────── stone, drawn on a canvas ───────────── */

function paintStone(g: CanvasRenderingContext2D, s: number, rnd: () => number, base = '#e3ddd0') {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  const wrap = (f: (ox: number, oy: number) => void) => { for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) f(ox, oy); };
  // Mottling: the slow clouds of colour in an oolitic limestone.
  for (let i = 0; i < 160; i++) {
    const x = rnd() * s, y = rnd() * s, r = s * (0.04 + rnd() * 0.18), warm = rnd() < 0.55;
    const c = warm ? '190,180,160' : '246,243,236', a = 0.05 + rnd() * 0.1;
    wrap((ox, oy) => { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); });
  }
  // Bedding: faint lines laid down with the sediment.
  for (let i = 0; i < 9; i++) {
    const y = rnd() * s; g.strokeStyle = `rgba(150,132,104,${0.05 + rnd() * 0.06})`; g.lineWidth = 0.6 + rnd() * 1.4; g.beginPath();
    for (let x = -10; x <= s + 10; x += 16) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 6 + (rnd() - 0.5) * 2);
    g.stroke();
  }
  // Grain.
  const im = g.getImageData(0, 0, s, s), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 16; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.9; }
  g.putImageData(im, 0, 0);
  // Fossil specks and shell grit.
  for (let i = 0; i < 520; i++) {
    const x = rnd() * s, y = rnd() * s, r = 0.4 + rnd() * rnd() * 2.6, dark = rnd() < 0.7;
    g.fillStyle = dark ? `rgba(120,104,80,${0.25 + rnd() * 0.4})` : `rgba(250,247,240,${0.4 + rnd() * 0.4})`;
    g.beginPath(); g.ellipse(x, y, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2); g.fill();
  }
}

/** Bump: tooth, pits, and the parallel drove marks a mason's chisel leaves. */
function paintTool(g: CanvasRenderingContext2D, s: number, rnd: () => number) {
  g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
  const im = g.getImageData(0, 0, s, s), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 50; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(im, 0, 0);
  const band = s / 7;
  for (let b = 0; b < 7; b++) {
    const y0 = b * band, ang = 1.05 + (rnd() - 0.5) * 0.25, step = 5 + rnd() * 3;
    g.save(); g.beginPath(); g.rect(0, y0, s, band); g.clip();
    for (let x = -band; x < s + band; x += step + (rnd() - 0.5) * 2) {
      g.strokeStyle = `rgba(30,30,30,${0.18 + rnd() * 0.25})`; g.lineWidth = 1 + rnd() * 1.4;
      g.beginPath(); g.moveTo(x, y0 - 2); g.lineTo(x + Math.cos(ang) * band * 1.3, y0 + Math.sin(ang) * band * 1.3); g.stroke();
    }
    g.restore();
  }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + rnd() * 0.4})`; g.beginPath(); g.arc(rnd() * s, rnd() * s, 0.6 + rnd() * 1.8, 0, Math.PI * 2); g.fill(); }
}

function canvasTex(s: number, draw: (g: CanvasRenderingContext2D) => void, srgb: boolean) {
  const c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d', { willReadFrequently: true })!; draw(g);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The keystone's face: the same stone, with the question mark cut into it. */
function keyFace(s: number) {
  const b = markBounds(), k = (0.62 / 1.2) * s / b.h;
  const cut = (g: CanvasRenderingContext2D, f: () => void) => {
    g.save(); g.translate(s / 2, s / 2 + s * 0.02); g.scale(k, k); g.translate(-b.cx, -b.cy); f(); g.restore();
  };
  const p = new Path2D(MARK.d);
  const map = canvasTex(s, (g) => {
    paintStone(g, s, rng(505));
    // The floor of the cut is rougher and greyer than the dressed face.
    cut(g, () => { g.fillStyle = 'rgba(92,80,62,0.55)'; g.fill(p); });
    g.globalCompositeOperation = 'multiply'; g.filter = 'blur(2px)';
    cut(g, () => { g.strokeStyle = 'rgba(110,96,74,0.6)'; g.lineWidth = 18; g.stroke(p); });
    g.filter = 'none'; g.globalCompositeOperation = 'source-over';
  }, true);
  const bump = canvasTex(s, (g) => {
    paintTool(g, s, rng(506));
    // A V cut: soft walls going down to a hard floor.
    g.filter = 'blur(5px)'; cut(g, () => { g.fillStyle = '#000'; g.fill(p); g.strokeStyle = '#1a1a1a'; g.lineWidth = 16; g.stroke(p); });
    g.filter = 'none'; cut(g, () => { g.fillStyle = '#000'; g.fill(p); });
  }, false);
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.repeat.set(1 / 1.2, 1 / 1.2); t.offset.set(0.5, 0.5); }
  return { map, bump };
}

/* ───────────── the stones ───────────── */

type Stone = {
  i: number; geo: THREE.BufferGeometry; hull: Float32Array; home: THREE.Vector3; homeQ: THREE.Quaternion;
  pile: THREE.Vector3; pileQ: THREE.Quaternion;
  from: THREE.Vector3; fromQ: THREE.Quaternion; ctrl: THREE.Vector3; start: number; dur: number; done: boolean;
};

function buildStones(): Stone[] {
  const out: Stone[] = [];
  const r = rng(49);
  for (let i = 0; i < N; i++) {
    const pts = outline(i), c = centroid(pts);
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x - c[0], y - c[1])));
    const bt = 0.04;
    const geo = new THREE.ExtrudeGeometry(shape, { depth: D - bt * 2, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelOffset: -bt, bevelSegments: 3, curveSegments: 1, steps: 1 });
    geo.translate(0, 0, -(D - bt * 2) / 2);
    // The back face reads the right way round from behind.
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute, pos = geo.getAttribute('position') as THREE.BufferAttribute, cap = geo.groups[0];
    for (let v = cap.start; v < cap.start + cap.count; v++) if (pos.getZ(v) < 0) uv.setX(v, -uv.getX(v));
    const hull: number[] = [];
    for (const [x, y] of pts) for (const z of [-D / 2, D / 2]) hull.push(x - c[0], y - c[1], z);
    // Where it lies before the arch is built: a mason's yard in front of the piers.
    const side = i < KEY ? -1 : i > KEY ? 1 : 0;
    const pile = v3(side * (2.2 + Math.abs(i - KEY) * 0.95) + (r() - 0.5) * 0.4, D / 2, 2.6 + (i % 2) * 1.9 + r() * 0.6);
    if (i === KEY) pile.set(0.3, D / 2, 4.6);
    const pileQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, (r() - 0.5) * 2.4));
    out.push({ i, geo, hull: new Float32Array(hull), home: v3(c[0], c[1], 0), homeQ: new THREE.Quaternion(), pile, pileQ, from: v3(), fromQ: new THREE.Quaternion(), ctrl: v3(), start: 0, dur: 1, done: true });
  }
  return out;
}

const backOut = (u: number, s = 1.25) => 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);
const cubicOut = (u: number) => 1 - Math.pow(1 - u, 3);
/** Bottom up: the two springers, then their neighbours, the keystone last. */
const ORDER = [0, 10, 1, 9, 2, 8, 3, 7, 4, 6, 5];

const Arch = memo(function Arch({ phone }: { phone: boolean }) {
  const stones = useMemo(buildStones, []);
  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const hit = useRef<THREE.Mesh>(null);
  const { camera, gl, clock } = useThree();

  const mats = useMemo(() => {
    const tool = canvasTex(512, (g) => paintTool(g, 512, rng(7)), false);
    const make = (seed: number) => {
      const map = canvasTex(512, (g) => paintStone(g, 512, rng(seed)), true);
      map.repeat.set(0.42, 0.42); map.offset.set(seed * 0.137, seed * 0.291);
      const t = tool.clone(); t.needsUpdate = true; t.repeat.set(0.42, 0.42); t.offset.set(seed * 0.23, seed * 0.11);
      return new THREE.MeshStandardMaterial({ map, bumpMap: t, bumpScale: 0.9, roughness: 0.9, metalness: 0, envMapIntensity: 0.6 });
    };
    const stone = [make(1), make(2), make(3)];
    const kf = keyFace(1024);
    const face = new THREE.MeshStandardMaterial({ map: kf.map, bumpMap: kf.bump, bumpScale: 2.0, roughness: 0.92, envMapIntensity: 0.6 });
    return { stone, face };
  }, []);

  const piers = useMemo(() => {
    const list: { geo: THREE.BufferGeometry; p: [number, number, number]; m: number }[] = [];
    let k = 0;
    for (const sign of [-1, 1]) for (const [x, y, w, h, d] of pierBlocks(sign)) list.push({ geo: new RoundedBoxGeometry(w, h, d, 3, 0.035), p: [x, y, 0], m: k++ % 3 });
    return list;
  }, []);

  // The drag, the fall, the rebuild: all driven from here.
  const st = useRef({
    t0: still ? -1 : 0.7, collapseAt: 0, releaseAt: 0, buildAt: Infinity, lift: 0, hover: 0,
    target: v3(), cur: v3(), vel: v3(), tilt: 0, dragging: false, grab: v3(), grabKey: v3(), shake: 0,
    auto: 0 as number, autoStart: 0, keyDrop: false,
  });
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -D / 2), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const tmp = useMemo(() => ({ a: v3(), q: new THREE.Quaternion(), e: new THREE.Euler() }), []);

  const pointAt = (cx: number, cy: number, out: THREE.Vector3) => {
    const r = gl.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, out);
  };

  const key = () => bodies.current[KEY];
  const now = () => clock.elapsedTime;

  const collapse = () => {
    const s = st.current;
    setMode('fallen'); s.collapseAt = now();
    bodies.current.forEach((b, i) => {
      if (!b || i === KEY) return;
      b.setBodyType(DYNAMIC as never, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true); b.setAngvel({ x: 0, y: 0, z: 0 }, true);
      const x = stones[i].home.x, m = b.mass(), h = (stones[i].home.y - HS) / 3.05;
      // Without the keystone the crown drops into the gap; the springers stay where they sit.
      // (A sideways push alone just jams the two halves into a flatter arch: tested.)
      b.applyImpulse({ x: Math.sign(x) * m * 0.5 * h, y: -m * 3.2 * h, z: (Math.random() - 0.5) * m * 0.8 }, true);
      b.applyTorqueImpulse({ x: (Math.random() - 0.5) * m * 0.6, y: (Math.random() - 0.5) * m * 0.4, z: Math.sign(x) * m * 0.5 * h }, true);
    });
  };

  const dropKey = () => {
    const s = st.current, b = key(); if (!b) return;
    b.setBodyType(DYNAMIC as never, true);
    b.setLinvel({ x: clamp(s.vel.x, -6, 6), y: clamp(s.vel.y, -6, 6), z: 0 }, true);
    b.setAngvel({ x: 0, y: 0, z: -s.vel.x * 0.4 }, true);
    s.keyDrop = true;
  };

  const rebuild = (opening = false) => {
    const s = st.current, t = now();
    setMode(opening ? 'opening' : 'rebuild');
    s.buildAt = Infinity; s.lift = 0; s.dragging = false; s.auto = 0;
    let delay = opening ? 0 : 0.15;
    ORDER.forEach((i, k) => {
      const b = bodies.current[i], stn = stones[i]; if (!b) return;
      const p = b.translation(), q = b.rotation();
      b.setBodyType(KINEMATIC as never, true);
      stn.from.set(p.x, p.y, p.z); stn.fromQ.set(q.x, q.y, q.z, q.w);
      const last = i === KEY;
      stn.ctrl.copy(stn.from).lerp(stn.home, 0.5);
      stn.ctrl.y = Math.max(stn.from.y, stn.home.y) + (last ? 2.6 : 1.3 + k * 0.08);
      if (last) stn.ctrl.x = stn.home.x;
      if (last) delay += 0.32;
      stn.start = t + delay; stn.dur = last ? 1.05 : 0.78; stn.done = false;
      delay += last ? 0 : 0.13;
    });
  };

  // Start: the stones lie in the yard; the arch builds itself. Reduced motion: it simply stands.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      bodies.current.forEach((b, i) => {
        if (!b) return;
        const stn = stones[i];
        if (still) { setMode('standing'); return; }
        b.setTranslation(stn.pile, true); b.setRotation(stn.pileQ, true);
      });
      S.ready = true; S.onReady?.();
    });
    return () => cancelAnimationFrame(id);
  }, [stones]);

  // A finger on the keystone holds the page still; anywhere else it scrolls.
  useEffect(() => {
    const el = gl.domElement;
    const ts = (e: TouchEvent) => {
      const t = e.touches[0]; if (!t || !hit.current) return;
      const r = el.getBoundingClientRect();
      ndc.set(((t.clientX - r.left) / r.width) * 2 - 1, -((t.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if ((S.mode === 'standing' || S.mode === 'held') && ray.intersectObject(hit.current).length) e.preventDefault();
    };
    el.addEventListener('touchstart', ts, { passive: false });
    return () => el.removeEventListener('touchstart', ts);
  }, [gl, camera, ray, ndc]);

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (S.mode === 'fallen') { e.stopPropagation(); if (st.current.keyDrop) S.cmd = 'build'; return; }
    if (S.mode !== 'standing') return;
    e.stopPropagation();
    const s = st.current, b = key(); if (!b) return;
    if (!pointAt(e.clientX, e.clientY, s.grab)) return;
    const p = b.translation(); s.grabKey.set(p.x, p.y, p.z); s.cur.copy(s.grabKey); s.target.copy(s.grabKey);
    s.dragging = true; s.auto = 0; setMode('held');
    document.documentElement.classList.add('arch-grabbing');
    const move = (ev: PointerEvent) => {
      if (!pointAt(ev.clientX, ev.clientY, tmp.a)) return;
      const dx = tmp.a.x - s.grab.x, dy = tmp.a.y - s.grab.y;
      if (S.mode === 'held') {
        s.lift = still ? clamp(dy, 0, 0.16) : Math.max(0, dy);
        s.target.set(stones[KEY].home.x, stones[KEY].home.y + s.lift, 0);
        if (!still && s.lift > 0.42) collapse();
      } else if (S.mode === 'fallen') {
        s.target.set(clamp(s.grabKey.x + dx, -9, 9), Math.max(0.9, s.grabKey.y + dy), 0);
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      document.documentElement.classList.remove('arch-grabbing');
      s.dragging = false;
      if (S.mode === 'held') { setMode('standing'); s.lift = 0; }
      else if (S.mode === 'fallen') { dropKey(); s.releaseAt = now(); s.buildAt = Math.max(now() + 1.1, s.collapseAt + 2.6); }
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };

  useFrame((state, dt) => {
    const s = st.current, t = now(), b = key();
    if (!b || !bodies.current.every(Boolean)) return;

    if (s.t0 >= 0) { if (t > s.t0 && S.ready) { s.t0 = -1; rebuild(true); } else return; }

    // Requests from the page (the button, for the keyboard and anyone who'd rather press).
    if (S.cmd) {
      const c = S.cmd; S.cmd = null;
      if (c === 'pull' && S.mode === 'standing') { s.auto = 1; s.autoStart = t; setMode('held'); }
      if (c === 'build' && S.mode === 'fallen') { if (!s.keyDrop) dropKey(); s.buildAt = t + 0.35; }
    }
    if (s.auto && S.mode !== 'rebuild') {
      const u = t - s.autoStart;
      if (still) { s.lift = Math.sin(clamp(u / 1.4) * Math.PI) * 0.16; s.target.set(stones[KEY].home.x, stones[KEY].home.y + s.lift, 0); if (u > 1.4) { s.auto = 0; s.lift = 0; setMode('standing'); } }
      else {
        s.lift = cubicOut(clamp(u / 0.9)) * 1.6;
        s.target.set(stones[KEY].home.x, stones[KEY].home.y + s.lift, 0);
        if (S.mode === 'held' && s.lift > 0.42) collapse();
        if (u > 2.1) { s.auto = 0; s.vel.set(0.6, 0, 0); dropKey(); s.buildAt = Math.max(t + 1.2, s.collapseAt + 3); }
      }
    }

    // The keystone follows the hand (kinematic) until it is let go.
    if ((S.mode === 'held' || S.mode === 'standing') || (S.mode === 'fallen' && !s.keyDrop)) {
      if (S.mode === 'standing' && !s.auto) {
        // It answers the pointer: a breath of lift when you reach for it.
        s.target.copy(stones[KEY].home); s.target.y += s.hover * 0.05;
      }
      const prev = tmp.a.copy(s.cur);
      s.cur.x = damp(s.cur.x, s.target.x, 16, dt); s.cur.y = damp(s.cur.y, s.target.y, 16, dt); s.cur.z = damp(s.cur.z, s.target.z, 16, dt);
      if (S.mode === 'standing' && !s.hover && !s.auto) s.cur.copy(stones[KEY].home);
      s.vel.copy(s.cur).sub(prev).divideScalar(Math.max(dt, 1 / 120));
      s.tilt = damp(s.tilt, S.mode === 'fallen' ? clamp(-s.vel.x * 0.08, -0.6, 0.6) : 0, 6, dt);
      b.setNextKinematicTranslation(s.cur);
      b.setNextKinematicRotation(tmp.q.setFromEuler(tmp.e.set(0, 0, s.tilt)));
    }
    s.hover = damp(s.hover, S.mode === 'standing' && hoverOn.current ? 1 : 0, 8, dt);

    if (S.mode === 'fallen' && t > s.buildAt) { s.keyDrop = false; rebuild(); }

    // The flight home.
    if (S.mode === 'rebuild' || S.mode === 'opening') {
      let all = true;
      for (const i of ORDER) {
        const stn = stones[i], body = bodies.current[i]!;
        if (stn.done) continue;
        all = false;
        const u = clamp((t - stn.start) / stn.dur);
        const e = backOut(u, i === KEY ? 1.1 : 1.35), r = cubicOut(u);
        const a = stn.from, c = stn.ctrl, h = stn.home, w0 = (1 - e) * (1 - e), w1 = 2 * (1 - e) * e, w2 = e * e;
        tmp.a.set(a.x * w0 + c.x * w1 + h.x * w2, a.y * w0 + c.y * w1 + h.y * w2, a.z * w0 + c.z * w1 + h.z * w2);
        body.setNextKinematicTranslation(tmp.a);
        body.setNextKinematicRotation(tmp.q.copy(stn.fromQ).slerp(stn.homeQ, r));
        if (u >= 1) { stn.done = true; body.setNextKinematicTranslation(h); body.setNextKinematicRotation(stn.homeQ); if (i === KEY) s.shake = 1; }
      }
      if (all) { s.cur.copy(stones[KEY].home); s.target.copy(s.cur); setMode('standing'); }
    }

    // The seat: the arch takes the keystone's weight and the room feels it.
    if (s.shake > 0.001) { state.camera.position.y += Math.sin(t * 55) * 0.022 * s.shake; s.shake = damp(s.shake, 0, 6, dt); }
  });

  const hoverOn = useRef(false);
  const over = () => { if (S.mode === 'standing') { hoverOn.current = true; document.documentElement.classList.add('arch-grab'); } };
  const out = () => { hoverOn.current = false; document.documentElement.classList.remove('arch-grab'); };

  return (
    <>
      {stones.map((stn) => {
        const key = stn.i === KEY;
        return (
          <RigidBody key={stn.i} ref={(b) => { bodies.current[stn.i] = b; }} type="kinematicPosition" colliders={false} position={stn.home.toArray()} canSleep angularDamping={0.15} linearDamping={0.05}>
            <ConvexHullCollider args={[stn.hull]} density={2.4} friction={0.45} restitution={0.03} />
            <mesh geometry={stn.geo} castShadow receiveShadow material={key ? [mats.face, mats.stone[0]] : mats.stone[stn.i % 3]} />
            {key && (
              <mesh ref={hit} scale={phone ? 2.1 : 1.35} onPointerDown={onDown} onPointerOver={over} onPointerOut={out}>
                <boxGeometry args={[0.9, 1.1, D + 0.1]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
              </mesh>
            )}
          </RigidBody>
        );
      })}
      {piers.map((p, k) => <mesh key={k} geometry={p.geo} position={p.p} material={mats.stone[p.m]} castShadow receiveShadow />)}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[60, 0.5, 60]} position={[0, -0.5, 0]} friction={0.9} />
        {[-1, 1].map((sg) => <CuboidCollider key={sg} args={[0.62, HS / 2, D / 2 + 0.1]} position={[sg * 2.525, HS / 2, 0]} friction={0.9} />)}
      </RigidBody>
      <GapPress onPress={() => { if (S.mode === 'fallen' && now() - st.current.collapseAt > 0.5) { if (!st.current.keyDrop) dropKey(); st.current.buildAt = now() + 0.2; } }} />
    </>
  );
});

/** The empty opening, pressable once the arch is down. */
function GapPress({ onPress }: { onPress: () => void }) {
  return (
    <mesh position={[0, HS / 2 + 1, 0]} onPointerDown={(e) => { if (S.mode === 'fallen') { e.stopPropagation(); onPress(); } }}>
      <planeGeometry args={[7, HS + 3.4]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color="#f3eee5" roughness={1} metalness={0} envMapIntensity={0.5} />
    </mesh>
  );
}

/* ───────────── the walk ───────────── */

type K = { pos: [number, number, number]; look: [number, number, number]; fov: number };
const WALK: K[] = [
  { pos: [0, 2.5, 26], look: [0, 3.05, 0], fov: 24 },          // front on, the museum photograph
  { pos: [3.6, 2.2, 14.5], look: [-0.2, 3.2, 0], fov: 26 },    // three quarters, nearer
  { pos: [0.9, 1.75, 8.5], look: [0, 3.1, -2], fov: 34 },      // at the threshold
  { pos: [0.2, 1.5, 3.4], look: [0, 4.2, -4], fov: 62 },       // looking up into the opening
  { pos: [-1.2, 1.6, -3.4], look: [2.5, 3.8, 2], fov: 54 },    // through, and back up at the keystone
  { pos: [-5.5, 2.3, -10], look: [0, 3, 0], fov: 34 },         // stepping away
  { pos: [-1.6, 2.4, -16], look: [0, 3.0, 0], fov: 27 },       // looking back through it
  { pos: [0, 2.5, -26], look: [0, 3.05, 0], fov: 24 },         // the back, framed
];

function Rig({ phone }: { phone: boolean }) {
  const { camera, size } = useThree();
  const qs = useMemo(() => WALK.map((k) => {
    // A camera looks down its own -z, so take the orientation from one.
    const o = new THREE.PerspectiveCamera(); o.position.set(...k.pos); o.lookAt(...k.look); return o.quaternion.clone();
  }), []);
  const cur = useRef({ f: 0, init: false });
  const tmp = useMemo(() => ({ p: v3(), q: new THREE.Quaternion(), a: v3(), b: v3() }), []);
  const ptr = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  useEffect(() => {
    const m = (e: PointerEvent) => { ptr.current.x = e.clientX / window.innerWidth - 0.5; ptr.current.y = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener('pointermove', m);
    return () => window.removeEventListener('pointermove', m);
  }, []);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = phone ? 33 : 24;
    // The arch stands to the right of the words on a wide screen, above them on a phone.
    const w = size.width, h = size.height;
    if (phone) cam.setViewOffset(w, h, 0, h * 0.17, w, h);
    else cam.setViewOffset(w, h, -w * 0.235, 0, w, h);
    cam.updateProjectionMatrix();
  }, [camera, size, phone]);

  useFrame((_s, dt) => {
    const keys = S.keys, p = scroll.p;
    let i = 0;
    while (i < keys.length - 2 && p > keys[i + 1]) i++;
    const span = Math.max(1e-4, keys[i + 1] - keys[i]);
    const u = clamp((p - keys[i]) / span), e = u * u * (3 - 2 * u);
    const f = i + e;
    const c = cur.current;
    c.f = !c.init || still ? f : damp(c.f, f, 4, dt); c.init = true;
    const j = Math.min(WALK.length - 2, Math.floor(c.f)), w = c.f - j;
    const A = WALK[j], B = WALK[j + 1];
    tmp.a.set(...A.pos); tmp.b.set(...B.pos);
    // A phone needs to stand further back to take in the whole arch.
    const far = (k: number) => (phone && (k === 0 || k === WALK.length - 1) ? 1.28 : phone && (k === 1 || k === WALK.length - 2) ? 1.15 : 1);
    tmp.a.setZ(A.pos[2] * far(j)); tmp.b.setZ(B.pos[2] * far(j + 1));
    if (phone) { tmp.a.x *= 0.6; tmp.b.x *= 0.6; }
    tmp.p.copy(tmp.a).lerp(tmp.b, w);
    tmp.q.copy(qs[j]).slerp(qs[j + 1], w);
    const pt = ptr.current;
    pt.sx = damp(pt.sx, still ? 0 : pt.x, 2.5, dt); pt.sy = damp(pt.sy, still ? 0 : pt.y, 2.5, dt);
    camera.position.copy(tmp.p);
    camera.position.x += pt.sx * 0.35; camera.position.y -= pt.sy * 0.18;
    camera.quaternion.copy(tmp.q);
    // The lens widens as you walk under the stone, and closes again outside.
    const cam = camera as THREE.PerspectiveCamera, fov = A.fov + (B.fov - A.fov) * w + (phone ? 9 : 0);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
  });
  return null;
}

/* ───────────── the room ───────────── */

// Memoised: a re-render would hand the rigid bodies their props again and stand the stones back up.
export default memo(function Scene({ phone }: { phone: boolean }) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} flat dpr={[1, phone ? 1.5 : 1.6]}
      camera={{ fov: 24, near: 0.1, far: 220, position: [0, 2.5, 26] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 32, 95]} />
      {/* One low warm key from the left, like a gallery window in late afternoon. */}
      <directionalLight
        position={[-12.5, 6.2, 7.5]} intensity={3.0} color="#ffe8cf" castShadow
        shadow-mapSize={[phone ? 1024 : 2048, phone ? 1024 : 2048]} shadow-bias={-0.0004} shadow-normalBias={0.025} shadow-radius={6}
        shadow-camera-left={-17} shadow-camera-right={17} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={60}
      />
      <directionalLight position={[8, 7, -12]} intensity={0.55} color="#dfe6ee" />
      <hemisphereLight args={['#f3f2ee', '#d4cfc5', 0.75]} />
      <Environment resolution={64} environmentIntensity={0.45}>
        <Lightformer form="rect" intensity={2} color="#fff4e6" position={[-10, 5, 6]} rotation-y={Math.PI / 2.4} scale={[6, 6, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#eef0f2" position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#e6e1d6" position={[0, -1, 0]} rotation-x={-Math.PI / 2} scale={[60, 60, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <Physics gravity={[0, -14.5, 0]}>
          <Arch phone={phone} />
        </Physics>
      </Suspense>
      <Floor />
      <Rig phone={phone} />
      <EffectComposer multisampling={phone ? 0 : 4}>
        <N8AO aoRadius={0.55} distanceFalloff={0.6} intensity={phone ? 2.2 : 2.8} halfRes={phone} color="#2a2015" />
      </EffectComposer>
    </Canvas>
  );
});
