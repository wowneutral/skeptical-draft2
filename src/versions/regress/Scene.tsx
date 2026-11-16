// The gallery: one plaster question mark on a black plinth between two facing mirrors.
// The reflections are copies of the room, chained by real reflection matrices and cut to
// each pane of glass with the stencil buffer, so every copy is clipped by the mirror it
// is seen through. Each copy has its own top light, a little dimmer and greener than the last.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { scroll } from '@/lib/scroll';
import { clamp, damp, isPhone, still } from '@/lib/utils';
import { BAR, GLASS, M, PLINTH, floorRough, grainNormal, questionGeometry, reflection } from './geo';
import { JOIN_ROOM, store } from './store';

const COPIES = JOIN_ROOM + 8; // rooms 0..12
const DEEP = 7; // how many levels are drawn past the camera's room
const LIGHTS = 7;
const TILT = 6 * (Math.PI / 180);
const FW = GLASS.w + BAR * 2, FH = GLASS.h + GLASS.y + BAR;
const ss = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

type Mats = { q: THREE.MeshStandardMaterial; plinth: THREE.MeshStandardMaterial; floor: THREE.MeshStandardMaterial; frame: THREE.MeshStandardMaterial; back: THREE.MeshStandardMaterial; pane: THREE.MeshBasicMaterial; tint: THREE.MeshBasicMaterial };

function useShared() {
  return useMemo(() => {
    const plaster = grainNormal(256, 7, [0.1, 0.12, 0.08, 0.05, 0.03], 7);
    plaster.repeat.set(3, 3);
    const stone = grainNormal(256, 3, [0.05, 0.05, 0.03, 0.02, 0.01], 4);
    const rough = floorRough(256);
    rough.repeat.set(6, 3);
    const geo = {
      q: questionGeometry(),
      plinth: new RoundedBoxGeometry(PLINTH.w, PLINTH.h, PLINTH.w, 3, 0.014),
      floor: new THREE.PlaneGeometry(30, M * 2).rotateX(-Math.PI / 2),
      side: new RoundedBoxGeometry(BAR, FH, 0.18, 2, 0.012),
      top: new RoundedBoxGeometry(FW, BAR, 0.18, 2, 0.012),
      bottom: new RoundedBoxGeometry(FW, GLASS.y, 0.18, 2, 0.012),
      foot: new RoundedBoxGeometry(0.28, 0.1, 0.62, 2, 0.02),
      back: new THREE.PlaneGeometry(FW - 0.01, FH - 0.01),
      pane: new THREE.PlaneGeometry(GLASS.w, GLASS.h),
    };
    const base = {
      q: new THREE.MeshStandardMaterial({ color: '#e9e2d3', roughness: 0.86, normalMap: plaster, normalScale: new THREE.Vector2(0.5, 0.5) }),
      plinth: new THREE.MeshStandardMaterial({ color: '#121212', roughness: 0.46, normalMap: stone, normalScale: new THREE.Vector2(0.25, 0.25) }),
      floor: new THREE.MeshStandardMaterial({ color: '#181816', roughness: 0.5, roughnessMap: rough, metalness: 0 }),
      frame: new THREE.MeshStandardMaterial({ color: '#2a2927', roughness: 0.2, normalMap: stone, normalScale: new THREE.Vector2(0.18, 0.18) }),
      back: new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.55, side: THREE.DoubleSide }),
    };
    const mats: Mats[] = [];
    for (let k = 0; k < COPIES; k++) {
      const st = { stencilWrite: true, stencilFunc: THREE.EqualStencilFunc, stencilRef: 0, stencilZPass: THREE.KeepStencilOp };
      const m: Mats = {
        q: base.q.clone(), plinth: base.plinth.clone(), floor: base.floor.clone(), frame: base.frame.clone(), back: base.back.clone(),
        pane: new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, ...st, stencilZPass: THREE.IncrementStencilOp }),
        tint: new THREE.MeshBasicMaterial({ color: '#123526', transparent: true, opacity: 0.13, depthTest: false, depthWrite: false, stencilWrite: true, stencilFunc: THREE.LessEqualStencilFunc, stencilRef: 1 }),
      };
      for (const key of ['q', 'plinth', 'floor', 'frame', 'back'] as const) Object.assign(m[key], st);
      mats.push(m);
    }
    return { geo, mats };
  }, []);
}

type Shared = ReturnType<typeof useShared>;

/** One mirror: black stone frame, feet, a back, and the glass (a stencil window plus a faint green tint). */
function Mirror({ s, k, portal, swing, onPress }: { s: Shared; k: number; portal: boolean; swing?: React.RefObject<THREE.Group | null>; onPress?: (e: ThreeEvent<MouseEvent>) => void }) {
  const { geo, mats } = s; const m = mats[k];
  const hx = FW / 2;
  return (
    <group ref={swing} position={[hx, 0, 0]}>
      <group position={[-hx, 0, 0]}>
        <mesh geometry={geo.side} material={m.frame} position={[-hx + BAR / 2, FH / 2, -0.04]} castShadow receiveShadow />
        <mesh geometry={geo.side} material={m.frame} position={[hx - BAR / 2, FH / 2, -0.04]} castShadow receiveShadow />
        <mesh geometry={geo.top} material={m.frame} position={[0, FH - BAR / 2, -0.04]} castShadow receiveShadow />
        <mesh geometry={geo.bottom} material={m.frame} position={[0, GLASS.y / 2, -0.04]} receiveShadow />
        <mesh geometry={geo.foot} material={m.frame} position={[-hx + 0.16, 0.05, -0.04]} receiveShadow />
        <mesh geometry={geo.foot} material={m.frame} position={[hx - 0.16, 0.05, -0.04]} receiveShadow />
        <mesh geometry={geo.back} material={m.back} position={[0, FH / 2, -0.1]} userData={{ late: true }} />
        {portal && <>
          <mesh geometry={geo.pane} material={m.pane} position={[0, GLASS.y + GLASS.h / 2, 0]} userData={{ pane: true }} onClick={onPress}
            onPointerOver={() => onPress && (document.body.dataset.rgCur = 'press')} onPointerOut={() => (document.body.dataset.rgCur = '')} />
          <mesh geometry={geo.pane} material={m.tint} position={[0, GLASS.y + GLASS.h / 2, 0.002]} userData={{ tint: true }} />
        </>}
      </group>
    </group>
  );
}

/** One room (k = 0 is the real one; the rest are its reflections). */
function Room({ s, k, groups, quests, swings, onPress }: {
  s: Shared; k: number; groups: React.RefObject<(THREE.Group | null)[]>; quests: React.RefObject<(THREE.Mesh | null)[]>; swings: React.RefObject<(THREE.Group | null)[]>;
  onPress: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const { geo, mats } = s; const m = mats[k];
  const far = k % 2 === 0;
  const swingRef = useMemo(() => ({ current: null as THREE.Group | null }), []);
  return (
    <group ref={(g) => { groups.current[k] = g; swings.current[k] = swingRef.current; }} matrixAutoUpdate={false}>
      <mesh geometry={geo.floor} material={m.floor} receiveShadow />
      <mesh geometry={geo.plinth} material={m.plinth} position={[0, PLINTH.h / 2, 0]} castShadow receiveShadow />
      <mesh ref={(q) => { quests.current[k] = q; }} geometry={geo.q} material={m.q} position={[0, PLINTH.h, 0]} castShadow receiveShadow />
      {/* the far mirror (the one you face) is the window in even rooms; the near one in odd rooms */}
      {(far || k === 0) && (
        <group name="far" position={[0, 0, -M]}>
          <Mirror s={s} k={k} portal={far} swing={far ? swingRef : undefined} onPress={k === 0 ? onPress : undefined} />
        </group>
      )}
      {(!far || k === 0) && (
        <group position={[0, 0, M]} rotation={[0, Math.PI, 0]}>
          <Mirror s={s} k={k} portal={!far} swing={!far ? swingRef : undefined} />
        </group>
      )}
    </group>
  );
}

function Gallery() {
  const s = useShared();
  const { camera, size, gl, scene, invalidate } = useThree();
  const phone = size.width < 760;
  const groups = useRef<(THREE.Group | null)[]>([]);
  const quests = useRef<(THREE.Mesh | null)[]>([]);
  const swings = useRef<(THREE.Group | null)[]>([]);
  const live = useRef({ arrived: false, tilt: 0, swing: 0, u: 0, t: 0, px: 0, py: 0, wob: 0, drag: { x: 0, last: 0 } });

  const lights = useMemo(() => Array.from({ length: LIGHTS }, (_, i) => {
    const l = new THREE.SpotLight('#fff1de', 0, 13, 0.6, 0.85, 2);
    l.castShadow = i < 3;
    const ms = i === 0 ? 1024 : 512;
    l.shadow.mapSize.set(ms, ms);
    l.shadow.bias = -0.0004; l.shadow.normalBias = 0.02;
    l.shadow.camera.near = 1; l.shadow.camera.far = 11;
    l.shadow.radius = 4;
    return l;
  }), []);
  const fill = useMemo(() => new THREE.HemisphereLight('#d8d2c6', '#080808', 0.6), []);

  useEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1.2;
    scene.fog = new THREE.Fog('#040504', 10, 44);
    store.invalidate = invalidate;
    return () => { scene.fog = null; };
  }, [gl, scene, invalidate]);

  // Dragging the question mark: anywhere it is grabbed, every copy turns with it.
  useEffect(() => {
    const el = gl.domElement;
    const move = (e: PointerEvent) => {
      const w = el.clientWidth || 1;
      store.px = (e.clientX / w) * 2 - 1; store.py = (e.clientY / (el.clientHeight || 1)) * 2 - 1;
      if (!store.held) return;
      const d = live.current.drag;
      const dx = e.clientX - d.x; d.x = e.clientX;
      const now = performance.now(); const dt = Math.max(8, now - d.last) / 1000; d.last = now;
      const turn = (dx / Math.min(w, 900)) * Math.PI * 2.2;
      store.yaw += turn;
      store.spin = store.spin * 0.5 + (turn / dt) * 0.5;
      if (still) invalidate();
    };
    const down = (e: PointerEvent) => {
      store.held = true; store.aim = null; store.spin = 0;
      live.current.drag = { x: e.clientX, last: performance.now() };
    };
    const up = () => { store.held = false; };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [gl, invalidate]);

  const onPress = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6 || store.room !== 0) return;
    e.stopPropagation();
    store.tilt = !store.tilt; store.onTilt(store.tilt);
    if (still) invalidate();
  };

  const R1 = useMemo(() => new THREE.Matrix4(), []), R2 = useMemo(() => new THREE.Matrix4(), []);
  const T = useMemo(() => Array.from({ length: COPIES }, () => new THREE.Matrix4()), []);
  const v3 = useMemo(() => ({ p: new THREE.Vector3(), n: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), look: new THREE.Vector3() }), []);
  const warm = useMemo(() => new THREE.Color('#fff0dc'), []), green = useMemo(() => new THREE.Color('#93c2a6'), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const L = live.current;
    const vh = size.height;

    // Where the scroll puts the camera: u runs 0..JOIN_ROOM, one room per section.
    const st = store.stops; const y = scroll.y;
    let u = 0;
    for (let i = 0; i < st.length - 1; i++) {
      if (y >= st[i]) {
        const t = clamp((y - st[i]) / Math.max(1, st[i + 1] - st[i]));
        u = i + (still ? (t > 0.8 ? 1 : 0) : ss(0.55, 1, t));
      }
    }
    u = clamp(u, 0, JOIN_ROOM);
    L.u = u;

    // The opening: the lights come up one reflection at a time (wall-clock, so a slow first frame cannot stall it).
    if (store.open < 0) store.open = performance.now();
    const op = still ? 99 : (performance.now() - store.open) / 1000;

    // Mirror tilt, only while the camera is still in the real room.
    const allow = u < 0.12 ? 1 : 0;
    L.tilt = still ? (store.tilt && allow ? TILT : 0) : damp(L.tilt, store.tilt && allow ? TILT : 0, 3.2, dt);
    // At Join, the window mirror swings aside.
    const swingTo = u > JOIN_ROOM - 0.04 ? 1 : 0;
    // Arriving at Join, the last question mark turns to face you.
    if (swingTo && !L.arrived && !store.held) { const a = Math.PI * (JOIN_ROOM % 2); store.aim = a + Math.round((store.yaw - a) / (Math.PI * 2)) * Math.PI * 2; }
    L.arrived = !!swingTo;
    L.swing = still ? swingTo : damp(L.swing, swingTo, 1.5, dt);

    // Reflection chain: R1 across the far mirror (tilted), R2 across the near one.
    v3.n.set(Math.sin(L.tilt), 0, Math.cos(L.tilt)); v3.p.set(0, 0, -M);
    reflection(v3.p, v3.n, R1);
    v3.n.set(0, 0, 1); v3.p.set(0, 0, M);
    reflection(v3.p, v3.n, R2);
    T[0].identity();
    for (let k = 1; k < COPIES; k++) T[k].multiplyMatrices(T[k - 1], k % 2 ? R1 : R2);

    // The camera's room: how many panes it has passed through.
    const camZ = -2 * u * M + (M - 0.42);
    const j = camZ < -M ? Math.min(COPIES - 1, Math.floor((-camZ - M) / (2 * M)) + 1) : 0;
    if (j !== store.room) store.room = j;

    // The question mark's turn: held, coasting, or easing to an aim.
    if (!store.held) {
      if (store.aim !== null) {
        const f = (store.aim - store.yaw) * 14 - store.spin * 5.5;
        store.spin += f * dt;
      } else store.spin *= Math.exp(-1.6 * dt);
      store.yaw += store.spin * dt;
    } else store.spin *= Math.exp(-8 * dt);
    L.wob = damp(L.wob, clamp(store.spin * 0.012, -0.08, 0.08), 6, dt);

    for (let k = 0; k < COPIES; k++) {
      const g = groups.current[k]; if (!g) continue;
      const lvl = k - j;
      const on = lvl >= 0 && lvl <= DEEP;
      g.visible = on;
      if (!on) continue;
      g.matrix.copy(T[k]); g.matrixWorldNeedsUpdate = true;
      const m = s.mats[k];
      m.q.stencilRef = m.plinth.stencilRef = m.floor.stencilRef = m.frame.stencilRef = m.back.stencilRef = m.pane.stencilRef = lvl;
      m.tint.stencilRef = lvl + 1;
      g.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return;
        const ud = o.userData;
        o.renderOrder = ud.pane ? lvl * 10 + 5 : ud.late ? 400 + lvl : ud.tint ? 800 + lvl : lvl * 10;
      });
      const q = quests.current[k];
      if (q) { q.rotation.y = store.yaw; q.rotation.z = L.wob; }
      const sw = swings.current[k];
      if (sw) sw.rotation.y = k === JOIN_ROOM ? -1.9 * (1 - Math.pow(1 - L.swing, 3)) : 0;
      // The tilt is the far mirror of the real room turning on its axis, so every even copy carries it.
      const farG = g.getObjectByName('far');
      if (farG) farG.rotation.y = L.tilt;
    }

    // Lights: one per level, each a reflection of the real one.
    for (let i = 0; i < LIGHTS; i++) {
      const l = lights[i]; const k = j + i;
      if (k >= COPIES) { l.intensity = 0; continue; }
      // Every copy's light leans toward the viewer's side, so the mark you stand before is never in its own shadow.
      v3.b.set(0, 0.6, 0).applyMatrix4(T[k]);
      v3.a.set(v3.b.x + 0.3, 4.8, v3.b.z + 1.0);
      l.position.copy(v3.a); l.target.position.copy(v3.b); l.target.updateMatrixWorld();
      const rise = ss(0.25 + i * 0.32, 1.25 + i * 0.32, op);
      // Past the join room the regress has stopped: nothing beyond is lit.
      const cut = k > JOIN_ROOM ? 1 - L.swing : 1;
      l.intensity = 100 * Math.pow(0.7, i) * rise * cut * (i === 0 ? 1 + L.swing * 0.5 : 1);
      l.color.copy(warm).lerp(green, Math.min(1, i / 5));
    }
    fill.intensity = 0.6 * ss(0, 1, op);

    // Camera: over the near mirror's shoulder, then forward through the glass, one room per section.
    L.px = damp(L.px, phone || still ? 0 : store.px, 2, dt); L.py = damp(L.py, phone || still ? 0 : store.py, 2, dt);
    const fu = u - Math.floor(u);
    const bump = Math.sin(Math.min(1, fu / 0.6) * Math.PI) * 0.3;
    const intro = still ? 0 : 1 - ss(0, 3.2, op);
    const cam = camera as THREE.PerspectiveCamera;
    const cx = phone ? 0.34 : 0.72;
    cam.position.set(cx + bump + L.px * 0.1 + intro * 0.2, 1.9 - L.py * 0.06 + intro * 0.25, camZ + intro * 0.3);
    v3.look.set((phone ? 0.12 : 0.1) + bump * 0.4, 1.02, camZ - 8.4);
    cam.lookAt(v3.look);
    cam.fov = phone ? 50 : 31;
    cam.near = 0.04; cam.far = 80;
    // Shift the picture away from the text column: right on wide screens, up on phones.
    if (phone) cam.setViewOffset(size.width, size.height, 0, vh * 0.17, size.width, vh);
    else cam.setViewOffset(size.width, size.height, -Math.min(size.width * 0.2, 340), 0, size.width, vh);
    cam.updateProjectionMatrix();
  });

  return (
    <>
      <primitive object={fill} />
      {lights.map((l, i) => <group key={i}><primitive object={l} /><primitive object={l.target} /></group>)}
      {Array.from({ length: COPIES }, (_, k) => (
        <Room key={k} s={s} k={k} groups={groups} quests={quests} swings={swings} onPress={onPress} />
      ))}
    </>
  );
}

export default function Scene() {
  const phone = isPhone();
  return (
    <Canvas
      className="rg-canvas"
      dpr={[1, phone ? 1.5 : 1.6]}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ fov: 31, position: [0.5, 1.6, M - 0.4], near: 0.04, far: 80 }}
      gl={{ antialias: true, stencil: true, powerPreference: 'high-performance' }}
      frameloop={still ? 'demand' : 'always'}
      aria-hidden
    >
      <color attach="background" args={['#040504']} />
      <Gallery />
    </Canvas>
  );
}
