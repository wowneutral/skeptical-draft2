// Version 88's scene: eight blocks of bone marble on the edge of a black plinth,
// each as far out as the weight above allows. They rest as kinematic bodies, so
// nothing jitters. Drag one out a hair too far and the blocks above it become
// real rigid bodies (Rapier) and fall; after a beat they lift back, bottom up.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Physics, useRapier } from '@react-three/rapier';
import { EffectComposer, N8AO, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clamp, damp, lerp, smooth, still } from '@/lib/utils';
import { marbleMaps, stoneRough } from './marble';
import { D, DESK, H, JOIN_STOP, L, P, PHONE, S, centreX, centreY, rightEdge } from './stack';

const BG = '#0c0c0b';
const COUNT = 9; // eight in the stack, one waiting for Join
type Mode = 'home' | 'free' | 'back';
type Blk = {
  mode: Mode; pos: THREE.Vector3; q: THREE.Quaternion; hz: number;
  from: THREE.Vector3; fromQ: THREE.Quaternion; t: number; delay: number;
};
const v3 = () => new THREE.Vector3();
const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Where block `id` rests when Join has run `u` of its way (0: eight blocks, 1: nine). */
function home(id: number, u: number, out: THREE.Vector3) {
  if (id === 8) {
    const slide = smooth(clamp((u - 0.22) / 0.42));
    const shift = smooth(clamp((u - 0.66) / 0.34));
    const x = lerp(-9, -L / 2, slide) + (centreX(0, 9) + L / 2) * shift;
    return out.set(x, centreY(0), 0);
  }
  const lift = smooth(clamp(u / 0.26));
  const shift = smooth(clamp((u - 0.66) / 0.34));
  return out.set(lerp(centreX(id, 8), centreX(id + 1, 9), shift), centreY(id) + H * lift, 0);
}

function Stack() {
  const { world, rapier: R } = useRapier();
  const { camera, gl, size } = useThree();
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const bodies = useRef<ReturnType<typeof world.createRigidBody>[]>([]);
  const born = useRef(performance.now());
  const blocks = useMemo<Blk[]>(() => Array.from({ length: COUNT }, (_, id) => ({
    mode: 'home', hz: 0, pos: home(id, 0, v3()), q: new THREE.Quaternion(), from: v3(), fromQ: new THREE.Quaternion(), t: 0, delay: 0,
  })), []);
  const st = useRef({ u: still && S.f > JOIN_STOP - 0.5 ? 1 : 0, fallT: -1, drag: -1, startX: 0, target: 0, dx: 0, vx: 0, planeZ: D / 2, pushing: 0, lastPush: 0, hover: -1, held: false });

  const geo = useMemo(() => new RoundedBoxGeometry(L, H, D, 3, 0.024), []);
  const mats = useMemo(() => {
    const { map, rmap } = marbleMaps();
    return Array.from({ length: COUNT }, (_, i) => {
      const m = map.clone(), r = rmap.clone();
      const off = (i * 0.37) % 1, rep = 0.55 + ((i * 0.23) % 0.3);
      for (const t of [m, r]) { t.offset.set(off, (i * 0.19) % 1); t.repeat.set(rep, 1); }
      return new THREE.MeshPhysicalMaterial({ map: m, roughnessMap: r, roughness: 0.92, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.45, envMapIntensity: 0.55 });
    });
  }, []);

  // The bodies: blocks start kinematic (asleep in effect), the plinth and floor are fixed.
  useEffect(() => {
    const made = blocks.map((b) => {
      const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(b.pos.x, b.pos.y, b.pos.z).setLinearDamping(0.05).setAngularDamping(0.25));
      world.createCollider(R.ColliderDesc.cuboid(L / 2 - 0.004, H / 2 - 0.004, D / 2).setFriction(0.75).setRestitution(0.04).setDensity(2.6), body);
      return body;
    });
    const fixed = world.createRigidBody(R.RigidBodyDesc.fixed());
    const cols = [
      world.createCollider(R.ColliderDesc.cuboid(10, P / 2, 1.6).setTranslation(-10, -P / 2, 0).setFriction(0.7), fixed),
      world.createCollider(R.ColliderDesc.cuboid(40, 0.5, 20).setTranslation(0, -P - 0.5, 0).setFriction(0.9).setRestitution(0.05), fixed),
      world.createCollider(R.ColliderDesc.cuboid(0.5, 6, 20).setTranslation(9, 0, 0), fixed),
      world.createCollider(R.ColliderDesc.cuboid(40, 6, 0.5).setTranslation(0, 0, -4.5), fixed),
      world.createCollider(R.ColliderDesc.cuboid(40, 6, 0.5).setTranslation(0, 0, 4.5), fixed),
    ];
    bodies.current = made;
    return () => {
      bodies.current = [];
      for (const b of made) world.removeRigidBody(b);
      for (const c of cols) world.removeCollider(c, false);
      world.removeRigidBody(fixed);
    };
  }, [world, R, blocks]);

  const n = () => (st.current.u >= 1 ? 9 : 8);
  const idxOf = (id: number) => (st.current.u >= 1 ? (id === 8 ? 0 : id + 1) : id);
  const idOf = (idx: number) => (st.current.u >= 1 ? (idx === 0 ? 8 : idx - 1) : idx);
  const calm = () => {
    const s = st.current;
    return (s.u === 0 || s.u === 1) && s.fallT < 0 && blocks.every((b) => b.mode === 'home') && performance.now() - born.current > 2400;
  };

  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const hit = useMemo(() => v3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const worldX = (cx: number, cy: number) => {
    const r = gl.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    plane.constant = -st.current.planeZ;
    return ray.ray.intersectPlane(plane, hit) ? hit.x : null;
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = st.current;
      if (s.drag < 0) return;
      const x = worldX(e.clientX, e.clientY);
      if (x != null) s.target = clamp(x - s.startX, -0.62 * L, 0.5 * L);
    };
    const up = () => { const s = st.current; s.held = false; if (s.drag >= 0) { s.target = 0; document.body.style.cursor = ''; } };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  });

  const down = (id: number) => (e: ThreeEvent<PointerEvent>) => {
    if (still || !calm() || (id === 8 && st.current.u < 1)) return;
    e.stopPropagation();
    const s = st.current;
    s.held = true; s.drag = idxOf(id); s.startX = e.point.x; s.planeZ = e.point.z; s.target = 0; s.dx = 0; s.vx = 0;
    document.body.style.cursor = 'grabbing';
  };

  const pivot = useMemo(() => v3(), []);
  const tmpQ = useMemo(() => new THREE.Quaternion(), []);
  const Z = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const tmp = useMemo(() => v3(), []);
  const cam = useRef({ p: v3().fromArray(DESK[0].p), t: v3().fromArray(DESK[0].t), fov: DESK[0].fov, ox: DESK[0].ox, oy: DESK[0].oy, init: false });

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 10);
    const s = st.current, now = performance.now();
    const age = (now - born.current) / 1000;

    /* ---------- camera from the scroll ---------- */
    const a = S.anchors, y = window.scrollY;
    let f = 0;
    for (let i = 0; i < a.length - 1; i++) if (y >= a[i]) f = i + clamp((y - a[i]) / Math.max(1, a[i + 1] - a[i]));
    if (still) f = Math.round(f);
    S.f = f;
    const stops = S.phone ? PHONE : DESK;
    const i0 = Math.min(stops.length - 1, Math.floor(f)), i1 = Math.min(stops.length - 1, i0 + 1), k = smooth(f - i0);
    const A = stops[i0], B = stops[i1];
    const c = cam.current;
    const tp = tmp.set(lerp(A.p[0], B.p[0], k), lerp(A.p[1], B.p[1], k), lerp(A.p[2], B.p[2], k));
    const lam = still || !c.init ? 1e6 : 3.2;
    c.p.x = damp(c.p.x, tp.x, lam, dt); c.p.y = damp(c.p.y, tp.y, lam, dt); c.p.z = damp(c.p.z, tp.z, lam, dt);
    c.t.x = damp(c.t.x, lerp(A.t[0], B.t[0], k), lam, dt); c.t.y = damp(c.t.y, lerp(A.t[1], B.t[1], k), lam, dt); c.t.z = damp(c.t.z, lerp(A.t[2], B.t[2], k), lam, dt);
    c.fov = damp(c.fov, lerp(A.fov, B.fov, k), lam, dt);
    c.ox = damp(c.ox, S.phone ? 0 : lerp(A.ox, B.ox, k), lam, dt);
    c.oy = damp(c.oy, lerp(A.oy, B.oy, k), lam, dt);
    c.init = true;
    const pc = camera as THREE.PerspectiveCamera;
    pc.position.copy(c.p); pc.lookAt(c.t); pc.fov = c.fov;
    pc.setViewOffset(size.width, size.height, -c.ox * size.width, c.oy * size.height, size.width, size.height);
    pc.updateProjectionMatrix();

    /* ---------- Join: a ninth block slides in under the stack ---------- */
    const want = f > JOIN_STOP - 0.45 ? 1 : 0;
    if (s.fallT < 0 && s.drag < 0 && blocks.every((b) => b.mode === 'home')) {
      s.u = still ? want : clamp(s.u + Math.sign(want - s.u) * dt / 2.6);
    }

    /* ---------- the keyboard push ---------- */
    if (S.push !== s.lastPush) {
      s.lastPush = S.push;
      if (!still && calm()) { s.drag = n() - 3; s.startX = 0; s.target = 0; s.dx = 0; s.pushing = now; }
    }
    if (s.pushing && s.drag >= 0) s.target = Math.min(0.4, (now - s.pushing) / 1000 * 0.16);

    /* ---------- dragging, with weight ---------- */
    const N = n();
    const homes = blocks.map((_, id) => home(id, s.u, v3()));
    let tilt = 0;
    if (s.drag >= 0) {
      const prev = s.dx;
      s.dx = damp(s.dx, s.target, 7, dt);
      s.vx = (s.dx - prev) / Math.max(dt, 1e-3);
      // Margin: past the edge of the block under it, the weight above starts to rock.
      const TIP = 0.075;
      if (s.dx > 0) tilt = -0.045 * smooth(clamp(s.dx / TIP));
      if (s.dx > TIP) {
        // Everything from the dragged block up becomes a rigid body.
        const from = s.drag;
        s.fallT = now; S.fallen = true;
        for (let idx = from; idx < N; idx++) {
          const id = idOf(idx), b = blocks[id], body = bodies.current[id];
          if (!body) continue;
          b.mode = 'free';
          body.setBodyType(R.RigidBodyType.Dynamic, true);
          body.setTranslation(b.pos, true); body.setRotation(b.q, true);
          const jit = (Math.sin(id * 12.9898) * 43758.5453) % 1;
          body.setLinvel({ x: Math.max(0.25, Math.min(s.vx, 2.5)) * (idx === from ? 1 : 0.6) + jit * 0.15, y: 0, z: jit * 0.25 }, true);
          body.setAngvel({ x: jit * 0.2, y: jit * 0.3, z: -0.9 - Math.abs(jit) * 0.6 }, true);
          body.wakeUp();
        }
        s.drag = -1; s.pushing = 0; s.dx = 0;
      } else if (!s.held && s.target === 0 && Math.abs(s.dx) < 0.002 && !s.pushing) {
        s.drag = -1; s.dx = 0;
      }
    }

    /* ---------- rebuild: lie still a beat, then lift back from the bottom up ---------- */
    if (s.fallT >= 0) {
      const since = (now - s.fallT) / 1000;
      const free = blocks.filter((b) => b.mode === 'free');
      const resting = free.every((b, j) => { const body = bodies.current[blocks.indexOf(b)]; const lv = body?.linvel(); return !lv || Math.hypot(lv.x, lv.y, lv.z) < 0.2; });
      if (free.length && ((since > 1.8 && resting) || since > 3.6)) {
        const order = free.map((b) => blocks.indexOf(b)).sort((p, q) => idxOf(p) - idxOf(q));
        order.forEach((id, j) => {
          const b = blocks[id], body = bodies.current[id];
          b.mode = 'back'; b.t = 0; b.delay = j * 0.3; b.from.copy(b.pos); b.fromQ.copy(b.q);
          body?.setBodyType(R.RigidBodyType.KinematicPositionBased, true);
        });
      }
      if (!free.length && blocks.every((b) => b.mode === 'home')) { s.fallT = -1; S.fallen = false; }
    }

    /* ---------- pose every block ---------- */
    const dragIdx = s.drag;
    if (dragIdx >= 0) {
      // Pivot on the arris of the block underneath (or the plinth).
      const below = dragIdx === 0 ? 0 : rightEdge(dragIdx - 1, N);
      pivot.set(below + s.dx, H * dragIdx, 0);
      tmpQ.setFromAxisAngle(Z, tilt);
    }
    blocks.forEach((b, id) => {
      const mesh = meshes.current[id], body = bodies.current[id];
      const hp = homes[id];
      if (b.mode === 'free') {
        if (body) { const t = body.translation(), r = body.rotation(); b.pos.set(t.x, t.y, t.z); b.q.set(r.x, r.y, r.z, r.w); }
        // Anything that leaves the room comes back at once.
        if (b.pos.y < -P - 4 || Math.abs(b.pos.x) > 30) { b.pos.copy(hp); }
      } else if (b.mode === 'back') {
        b.t += dt;
        const t = clamp((b.t - b.delay) / 1.15);
        const up = hp.y + 0.85;
        const rise = easeOut(clamp(t / 0.5));
        const across = easeIO(clamp((t - 0.12) / 0.62));
        const drop = easeOut(clamp((t - 0.6) / 0.4));
        b.pos.set(lerp(b.from.x, hp.x, across), t < 0.6 ? lerp(b.from.y, Math.max(up, b.from.y), rise) : lerp(Math.max(up, b.from.y), hp.y, drop), lerp(b.from.z, hp.z, across));
        b.q.copy(b.fromQ).slerp(new THREE.Quaternion(), easeIO(clamp(t / 0.8)));
        if (t >= 1) { b.mode = 'home'; b.pos.copy(hp); b.q.identity(); }
      } else {
        b.pos.copy(hp); b.q.identity();
        // Under the pointer a block eases a hair toward you: it can be taken hold of.
        b.hz = damp(b.hz, s.hover === id || (dragIdx >= 0 && idxOf(id) === dragIdx) ? 0.07 : 0, 10, dt);
        b.pos.z += b.hz;
        const idx = idxOf(id);
        if (dragIdx >= 0 && idx >= dragIdx && idx < N) {
          b.pos.x += s.dx;
          b.pos.sub(pivot).applyQuaternion(tmpQ).add(pivot);
          b.q.copy(tmpQ);
        }
        // The opening: the stack is laid block by block from the bottom.
        if (!still && id < 8) {
          const p = clamp((age - 0.35 - id * 0.17) / 0.7);
          b.pos.y += (1 - easeOut(p)) * 2.6;
          if (mesh) mesh.visible = p > 0;
        }
        if (id === 8 && mesh) mesh.visible = s.u > 0.01;
      }
      if (mesh) { mesh.position.copy(b.pos); mesh.quaternion.copy(b.q); }
      if (id < 8) { tmp.copy(b.pos).project(camera); S.probe[id] = [Math.round((tmp.x + 1) / 2 * size.width), Math.round((1 - tmp.y) / 2 * size.height), b.mode === 'home' ? 1 : 0]; }
      if (body && b.mode !== 'free') { body.setNextKinematicTranslation(b.pos); body.setNextKinematicRotation(b.q); }
    });
  });

  return (
    <group>
      {blocks.map((_, id) => (
        <mesh
          key={id}
          ref={(m) => { meshes.current[id] = m; }}
          geometry={geo}
          material={mats[id]}
          castShadow
          receiveShadow
          visible={id < 8 ? still : false}
          onPointerDown={down(id)}
          onPointerOver={(e) => { if (!still && calm()) { e.stopPropagation(); st.current.hover = id; document.body.style.cursor = st.current.drag >= 0 ? 'grabbing' : 'grab'; } }}
          onPointerOut={() => { if (st.current.hover === id) st.current.hover = -1; if (st.current.drag < 0) document.body.style.cursor = ''; }}
        />
      ))}
    </group>
  );
}

function Room({ phone }: { phone: boolean }) {
  const stone = useMemo(() => {
    const r = stoneRough();
    return new THREE.MeshPhysicalMaterial({ color: '#0b0b0a', roughness: 0.55, roughnessMap: r, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.16, envMapIntensity: 1 });
  }, []);
  const plinthGeo = useMemo(() => new RoundedBoxGeometry(20, P, 3.2, 2, 0.01), []);
  const key = useRef<THREE.DirectionalLight>(null);
  const halo = useRef<THREE.SpotLight>(null);
  useEffect(() => {
    const l = key.current, h = halo.current;
    if (l) { l.target.position.set(0.6, 0.4, 0); l.target.updateMatrixWorld(); }
    if (h) { h.target.position.set(1.5, 1.5, -7); h.target.updateMatrixWorld(); }
  }, []);
  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 18, 42]} />
      <ambientLight intensity={0.05} />
      <directionalLight
        ref={key}
        position={[-6, 10, 8.5]}
        intensity={3.6}
        castShadow
        shadow-mapSize={[phone ? 1024 : 2048, phone ? 1024 : 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-radius={3}
      />
      <directionalLight position={[6, 3, -7]} intensity={0.55} color="#d9d3c6" />
      <spotLight position={[1.2, 9, 3]} angle={0.42} penumbra={1} intensity={30} distance={22} decay={1.6} color="#fff6e8" />
      <mesh geometry={plinthGeo} material={stone} position={[-10, -P / 2, 0]} castShadow receiveShadow />
      <mesh position={[0, 2, -7]} receiveShadow>
        <planeGeometry args={[90, 30]} />
        <meshStandardMaterial color="#141412" roughness={1} />
      </mesh>
      <spotLight position={[2, 7, 4]} angle={0.5} penumbra={1} intensity={14} distance={30} decay={1.4} color="#f3ead9" ref={halo} />
      <mesh rotation-x={-Math.PI / 2} position={[0, -P, 0]} receiveShadow>
        <planeGeometry args={[90, 60]} />
        <meshStandardMaterial color="#121210" roughness={0.88} />
      </mesh>
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={1.6} position={[-4, 8, 5]} scale={[8, 4, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.5} position={[6, 2, 6]} scale={[2, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} position={[-3, 4, -9]} scale={[16, 1.2, 1]} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}

export default function Scene({ phone }: { phone: boolean }) {
  return (
    <Canvas
      className="ov-canvas"
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={phone ? [1, 1.5] : [1, 1.6]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: DESK[0].p, fov: DESK[0].fov, near: 0.5, far: 80 }}
      onCreated={({ gl }) => { gl.toneMappingExposure = 1.05; }}
    >
      <Room phone={phone} />
      <Suspense fallback={null}>
        <Physics gravity={[0, -24, 0]} timeStep={1 / 60}>
          <Stack />
        </Physics>
      </Suspense>
      <EffectComposer multisampling={phone ? 0 : 4} enableNormalPass={false}>
        <N8AO aoRadius={0.55} distanceFalloff={0.6} intensity={3.2} color="#000000" halfRes={phone} quality={phone ? 'low' : 'medium'} />
        <Vignette offset={0.25} darkness={0.55} />
      </EffectComposer>
    </Canvas>
  );
}
