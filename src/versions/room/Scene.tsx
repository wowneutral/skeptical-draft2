// The drawing itself: line work with hidden lines dashed, a pen that plots it,
// a camera that walks the tour, and the leaders that tie the words to objects.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import monoUrl from '@fontsource/space-mono/files/space-mono-latin-400-normal.woff?url';
import { scroll } from '@/lib/scroll';
import { clamp, damp, isPhone, smooth, still } from '@/lib/utils';
import { FOCUS, KEYS, OBJS, SHEETS, st, type Obj, type V } from './room';
import { ui } from './ui';



const INK = new THREE.Color('#eaf2ff');
const ACC = new THREE.Color('#62e0ff');
const FILL = '#0c2142';
const R = Math.PI / 180;

type Built = {
  obj: Obj; group: THREE.Group; parts: { g: THREE.Group; geo: LineSegmentsGeometry; n: number; s: number; e: number; fills: THREE.Mesh[]; ex: V; segs: number[] }[];
  mats: { thin: LineMaterial; thick: LineMaterial; hid: LineMaterial; dim: LineMaterial; chain: LineMaterial };
  ev: number; ex: number;
};

function lineMat(o: { w: number; color?: THREE.Color; dashed?: boolean; hidden?: boolean; opacity?: number; dash?: number; gap?: number }) {
  const m = new LineMaterial({ color: (o.color ?? INK).getHex(), linewidth: o.w, dashed: !!o.dashed, dashSize: o.dash ?? 0.07, gapSize: o.gap ?? 0.055, transparent: (o.opacity ?? 1) < 1, opacity: o.opacity ?? 1 });
  if (o.hidden) { m.depthFunc = THREE.GreaterDepth; m.depthWrite = false; }
  return m;
}

const fillMat = new THREE.MeshBasicMaterial({ color: FILL, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

function build(): Built[] {
  // the pens: walls and dimensions on one, furniture on the other, the three doors last
  const len = (s: number[]) => { let L = 0; for (let i = 0; i < s.length; i += 6) L += Math.hypot(s[i + 3] - s[i], s[i + 4] - s[i + 1], s[i + 5] - s[i + 2]); return L; };
  const total = [0, 0, 0];
  for (const o of OBJS) for (const p of o.parts) total[o.pen] += len(p.segs);
  const cum = [0, 0, 0];
  return OBJS.map((obj) => {
    const group = new THREE.Group();
    group.position.set(...obj.pos); group.rotation.y = obj.rot;
    const mats = {
      thin: lineMat({ w: 1.25 }), thick: lineMat({ w: 2.6 }),
      hid: lineMat({ w: 1, dashed: true, hidden: true, opacity: 0.42 }),
      dim: lineMat({ w: obj.pen === 2 ? 2.6 : 1.1, color: ACC }),
      chain: lineMat({ w: 1.1, dashed: true, dash: 0.32, gap: 0.09, opacity: 0.85 }),
    };
    const parts = obj.parts.map((p) => {
      const g = new THREE.Group();
      const geo = new LineSegmentsGeometry(); geo.setPositions(p.segs);
      const n = p.segs.length / 6;
      const L = len(p.segs);
      const s = cum[obj.pen] / total[obj.pen]; cum[obj.pen] += L; const e = cum[obj.pen] / total[obj.pen];
      const main = new LineSegments2(geo, p.w === 'thick' ? mats.thick : p.w === 'dim' ? mats.dim : p.w === 'chain' ? mats.chain : mats.thin);
      main.computeLineDistances(); main.renderOrder = 1; main.frustumCulled = false; main.raycast = () => {};
      g.add(main);
      if (p.w === 'thin' || p.w === 'thick') { const h = new LineSegments2(geo, mats.hid); h.renderOrder = 2; h.frustumCulled = false; h.raycast = () => {}; g.add(h); }
      const fills = p.fills.map((f) => { const m = new THREE.Mesh(boxGeo, fillMat); m.scale.set(...f.s); m.position.set(...f.p); m.userData.obj = obj.id; g.add(m); return m; });
      group.add(g);
      return { g, geo, n, s, e, fills, ex: p.ex, segs: p.segs };
    });
    return { obj, group, parts, mats, ev: 0, ex: 0 };
  });
}

function Drawing({ built }: { built: Built[] }) {
  const { size } = useThree();
  const heads = useRef<(THREE.Mesh | null)[]>([]);
  const labels = useRef<THREE.Group>(null), ways = useRef<THREE.Group>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => { for (const b of built) for (const m of Object.values(b.mats)) m.resolution.set(size.width, size.height); }, [size, built]);

  useFrame((state, dt) => {
    const now = state.clock.elapsedTime;
    if (st.t0 < 0 && st.ready) st.t0 = now;
    st.reveal = still ? 1 : st.t0 < 0 ? 0 : clamp((now - st.t0 - 0.2) / 4.6);
    const focus = FOCUS[Math.round(st.f)];
    const hold = 1 - clamp(Math.abs(st.f - Math.round(st.f)) * 3);
    const W = still ? 1 : st.ways;
    for (const b of built) {
      const r = b.obj.pen === 2 ? W : smooth(st.reveal);
      // explode on a spring, with a little overshoot
      const tgt = st.explode[b.obj.id] ?? 0;
      if (still) b.ex = tgt; else { const a = 140 * (tgt - b.ex) - 13 * b.ev; b.ev += a * Math.min(dt, 0.05); b.ex += b.ev * Math.min(dt, 0.05); }
      const rt = st.rattle[b.obj.id];
      b.group.position.set(...b.obj.pos);
      if (rt !== undefined && !still) { const k = now - rt; if (k < 0.7) b.group.position.z += Math.sin(k * 70) * 0.03 * (1 - k / 0.7); }
      let head: THREE.Vector3 | null = null;
      for (const p of b.parts) {
        const u = clamp((r - p.s) / Math.max(1e-6, p.e - p.s));
        const k = Math.round(u * p.n);
        p.geo.instanceCount = k;
        for (const f of p.fills) f.visible = u >= 1;
        p.g.position.set(p.ex[0] * b.ex, p.ex[1] * b.ex, p.ex[2] * b.ex);
        p.g.rotation.z = p.ex[0] * b.ex * 0.25; p.g.rotation.x = -p.ex[2] * b.ex * 0.2;
        if (u > 0 && u < 1 && k > 0) { const i = (k - 1) * 6 + 3; head = tmp.set(p.segs[i], p.segs[i + 1], p.segs[i + 2]); p.g.localToWorld(head); }
      }
      const hm = heads.current[b.obj.pen];
      if (hm && head) { hm.position.copy(head); hm.visible = true; }
      const on = focus === b.obj.id ? hold : 0;
      const c = b.mats.thin.color as THREE.Color;
      c.copy(INK).lerp(ACC, on * 0.85); (b.mats.thick.color as THREE.Color).copy(c);
    }
    for (let i = 0; i < 3; i++) { const h = heads.current[i]; if (!h) continue; const r = i === 2 ? W : st.reveal; if (r <= 0 || r >= 1) h.visible = false; }
    if (labels.current) labels.current.visible = st.reveal > 0.92;
    if (ways.current) ways.current.visible = W > 0.6;
  });

  const L = (t: string, p: V, s = 0.24, rz = 0, color = '#eaf2ff') => (
    <Text font={monoUrl} fontSize={s} color={color} anchorX="center" anchorY="middle" position={p} rotation={[-Math.PI / 2, 0, rz]} letterSpacing={0.12}>{t}</Text>
  );
  return (
    <>
      {built.map((b) => <primitive key={b.obj.id} object={b.group} />)}
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => { heads.current[i] = m; }} visible={false} renderOrder={5}>
          <sphereGeometry args={[0.055, 12, 8]} />
          <meshBasicMaterial color="#62e0ff" depthTest={false} />
        </mesh>
      ))}
      <Suspense fallback={null}>
        <group ref={labels} visible={false}>
          {L('AFF', [-2.0, 0.01, -0.12], 0.26)}
          {L('NEG', [2.0, 0.01, -0.12], 0.26)}
          {L('JUDGE', [0, 0.01, -1.4], 0.26)}
          {L('LECTERN', [0, 0.01, 0.95], 0.15)}
          {L('DOOR', [3.4, 0.01, 4.0], 0.18)}
          {L('DRIVE. LOCKED.', [-3.9, 0.01, -1.7], 0.15, Math.PI / 2)}
          {L('GALLERY', [-0.6, 0.01, 3.12], 0.16)}
          {L('A', [-6.2, 0.01, 1.25], 0.26, 0, '#62e0ff')}
          {L('A', [6.6, 0.01, 1.25], 0.26, 0, '#62e0ff')}
          {L('SECTION A', [0, 0.01, 4.85], 0.15, 0, '#62e0ff')}
        </group>
        <group ref={ways} visible={false}>
          {L('COMPETE', [-4.25, 0.01, 0.75], 0.2, Math.PI / 2, '#62e0ff')}
          {L('LECTURE', [-2.95, 0.01, -2.75], 0.2, 0, '#62e0ff')}
          {L('COACH', [4.25, 0.01, -1.1], 0.2, -Math.PI / 2, '#62e0ff')}
        </group>
      </Suspense>
    </>
  );
}

function Floor() {
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (let x = -4.5; x <= 4.51; x += 0.5) pts.push(x, 0, -3.4, x, 0, 3.4);
    for (let z = -3.0; z <= 3.01; z += 0.5) pts.push(-4.9, 0, z, 4.9, 0, z);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g;
  }, []);
  const onMove = (e: ThreeEvent<PointerEvent>) => { if (!st.measure.on || !st.measure.a || st.measure.b) return; st.measure.hover = snap(e.point); st.measure.dirty = true; };
  return (
    <>
      <lineSegments geometry={geo} renderOrder={0}>
        <lineBasicMaterial color="#eaf2ff" transparent opacity={0.07} depthWrite={false} />
      </lineSegments>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.003, 0]} material={fillMat} onPointerMove={onMove} onClick={(e) => pick(e)}>
        <planeGeometry args={[10, 7]} />
      </mesh>
    </>
  );
}

const snap = (p: THREE.Vector3): V => [Math.round(p.x * 20) / 20, Math.max(0, Math.round(p.y * 20) / 20), Math.round(p.z * 20) / 20];

function pick(e: ThreeEvent<MouseEvent>) {
  if (e.delta > 6) return;
  e.stopPropagation();
  const m = st.measure;
  if (m.on) {
    const p = snap(e.point);
    if (!m.a || m.b) { m.a = p; m.b = null; m.hover = p; } else m.b = p;
    m.dirty = true;
    return;
  }
  const id = (e.object.userData.obj as string) || '';
  const o = OBJS.find((x) => x.id === id);
  if (!o?.click) return;
  if (o.click === 'rattle') st.rattle[id] = st.clock;
  else st.explode[id] = st.explode[id] ? 0 : 1;
  window.dispatchEvent(new CustomEvent('room:click', { detail: id }));
}

function Measure() {
  const line = useMemo(() => {
    const g = new LineSegmentsGeometry(); g.setPositions([0, 0, 0, 0, 0, 0]);
    const m = lineMat({ w: 2, color: ACC }); m.depthTest = false;
    const l = new LineSegments2(g, m); l.renderOrder = 6; l.frustumCulled = false; l.raycast = () => {}; return l;
  }, []);
  const { size, camera } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => { (line.material as LineMaterial).resolution.set(size.width, size.height); }, [size, line]);
  useFrame(() => {
    const m = st.measure;
    const a = m.a, b = m.b ?? m.hover;
    if (m.dirty) {
      m.dirty = false;
      if (a && b) {
        const t = 0.12;
        line.geometry.setPositions([...a, ...b, a[0], a[1], a[2], a[0], a[1] + t * 3, a[2], b[0], b[1], b[2], b[0], b[1] + t * 3, b[2]]);
        line.visible = true;
      } else line.visible = false;
    }
    const el = ui.mlabel;
    if (el) {
      if (m.on && a && b) {
        const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        v.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.3, (a[2] + b[2]) / 2).project(camera);
        el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -120%)`;
        el.textContent = `${d.toFixed(2)} sk`;
        el.style.opacity = '1';
      } else el.style.opacity = '0';
    }
    line.visible = line.visible && m.on;
  });
  return <primitive object={line} />;
}

/** Where the camera wants to be for a float position along the tour. */
function aim(f: number) {
  const i = clamp(Math.floor(f), 0, KEYS.length - 1), j = Math.min(KEYS.length - 1, i + 1);
  const a = KEYS[i], b = KEYS[j];
  let t = f - i;
  if (b.cut) t = t < 0.5 ? 0 : 1;
  t = smooth(t);
  let dy = b.yaw - a.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
  const L = (x: number, y: number) => x + (y - x) * t;
  return {
    t: [L(a.t[0], b.t[0]), L(a.t[1], b.t[1]), L(a.t[2], b.t[2])] as V,
    yaw: a.yaw + dy * t, pitch: L(a.pitch, b.pitch), dist: L(a.dist, b.dist), fov: L(a.fov, b.fov),
    sx: L(a.sx, b.sx), sy: L(a.sy, b.sy), psy: L(a.psy, b.psy), pd: L(a.pd, b.pd),
  };
}

function Rig({ built }: { built: Built[] }) {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const cur = useRef<ReturnType<typeof aim> | null>(null);
  const lastStop = useRef(-1), lastF = useRef(0);
  const v = useMemo(() => new THREE.Vector3(), []);
  const lead = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    st.clock = state.clock.elapsedTime;
    // where are we on the tour
    const c = st.centers;
    let f = 0;
    if (c.length > 1) {
      const y = scroll.y;
      if (y >= c[c.length - 1]) f = c.length - 1;
      else for (let i = 0; i < c.length - 1; i++) if (y < c[i + 1]) { const u = clamp((y - c[i]) / Math.max(1, c[i + 1] - c[i])); f = i + clamp((u - 0.2) / 0.6); break; }
    }
    const cutJump = Math.floor(lastF.current + 0.5) !== Math.floor(f + 0.5) && KEYS[Math.round(Math.max(f, lastF.current))]?.cut;
    lastF.current = f;
    st.f = f;
    st.ways = smooth(clamp((f - 8.35) / 0.6));
    const stop = Math.round(f);
    if (stop !== lastStop.current) {
      lastStop.current = stop; st.yawOff = 0; st.pitchOff = 0;
      if (ui.sheetNo) ui.sheetNo.textContent = 'A-' + String(stop).padStart(2, '0');
      if (ui.sheetName) ui.sheetName.textContent = SHEETS[stop];
      if (ui.root) ui.root.dataset.stop = String(stop);
      st.onStop?.(stop);
    }
    if (cutJump && ui.flash && !still) { ui.flash.classList.remove('go'); void ui.flash.offsetWidth; ui.flash.classList.add('go'); }

    const g = aim(f);
    // the toggle: plan and elevation keep the framing and flatten the lens
    if (st.mode !== 'persp') {
      const frame = Math.max(3.2, 2 * g.dist * Math.tan((g.fov * R) / 2)) * 1.25;
      g.fov = 11; g.dist = frame / 2 / Math.tan((g.fov * R) / 2);
      if (st.mode === 'plan') { g.yaw = 0; g.pitch = 89.4 * R; }
      else { g.yaw = Math.round(g.yaw / (Math.PI / 2)) * (Math.PI / 2); g.pitch = 0.4 * R; g.t = [g.t[0], Math.max(0.9, g.t[1]), g.t[2]]; }
    }
    g.yaw += st.yawOff; g.pitch = clamp(g.pitch + st.pitchOff, 0.2 * R, 89.4 * R);
    const phone = size.width < size.height;
    if (phone) g.dist *= g.pd;

    if (!cur.current || still || cutJump) cur.current = { ...g, t: [...g.t] as V };
    else {
      const k = st.dragging ? 9 : 3.6, d = Math.min(dt, 0.05);
      const C = cur.current;
      let dy = g.yaw - C.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      C.yaw += dy * (1 - Math.exp(-k * d));
      C.pitch = damp(C.pitch, g.pitch, k, d); C.dist = damp(C.dist, g.dist, k, d); C.fov = damp(C.fov, g.fov, k, d);
      for (let i = 0; i < 3; i++) C.t[i] = damp(C.t[i], g.t[i], k, d);
      C.sx = damp(C.sx, g.sx, k, d); C.sy = damp(C.sy, g.sy, k, d); C.psy = damp(C.psy, g.psy, k, d);
    }
    const C = cur.current;
    cam.fov = C.fov; cam.near = 0.05; cam.far = 400;
    cam.position.set(C.t[0] + Math.sin(C.yaw) * Math.cos(C.pitch) * C.dist, C.t[1] + Math.sin(C.pitch) * C.dist, C.t[2] + Math.cos(C.yaw) * Math.cos(C.pitch) * C.dist);
    cam.up.set(0, 1, 0);
    if (C.pitch > 89 * R) cam.up.set(-Math.sin(C.yaw), 0, -Math.cos(C.yaw));
    cam.lookAt(C.t[0], C.t[1], C.t[2]);
    const W = size.width, H = size.height;
    const sx = phone ? 0 : C.sx, sy = phone ? C.psy : C.sy;
    cam.setViewOffset(W, H, -sx * W, -sy * H, W, H);
    cam.updateProjectionMatrix();

    // the corner instruments
    if (ui.north) ui.north.setAttribute('transform', `rotate(${(C.yaw / R).toFixed(1)})`);
    if (ui.bar && ui.barLabel) {
      const ppu = H / (2 * C.dist * Math.tan((C.fov * R) / 2));
      const unit = [0.25, 0.5, 1, 2, 5, 10].find((u) => u * ppu >= 46) ?? 10;
      ui.bar.style.width = `${Math.min(220, unit * ppu * 2).toFixed(1)}px`;
      ui.barLabel.textContent = `${unit * 2} sk`;
    }

    // leaders from the words to the things
    const id = FOCUS[stop];
    const o = built.find((b) => b.obj.id === id);
    const vis = still ? (Math.abs(f - stop) < 0.45 ? 1 : 0) : 1 - clamp((Math.abs(f - stop) - 0.12) * 4);
    const els = o && ui.root ? Array.from(ui.root.querySelectorAll<HTMLElement>(`[data-sec="${stop}"] [data-lead]`)) : [];
    for (let i = 0; i < 3; i++) {
      const p = ui.paths[i], dot = ui.dots[i];
      if (!p || !dot) continue;
      const el = els[i], an = o?.obj.anchors[i];
      if (!o || !el || !an || vis <= 0.01) { p.style.opacity = '0'; dot.style.opacity = '0'; continue; }
      lead.set(...an);
      o.group.localToWorld(lead);
      v.copy(lead).project(cam);
      if (v.z > 1) { p.style.opacity = '0'; dot.style.opacity = '0'; continue; }
      const tx = ((v.x + 1) / 2) * W, ty = ((1 - v.y) / 2) * H;
      const r = el.getBoundingClientRect();
      let d: string;
      if (phone) {
        const x0 = clamp(tx, r.left + 16, r.right - 16), y0 = r.top;
        d = `M${x0},${y0} L${x0},${y0 - 18} L${tx},${ty}`;
      } else {
        const right = tx > r.right;
        const x0 = right ? r.right : r.left, y0 = clamp(ty, r.top + 14, r.bottom - 14);
        const x1 = x0 + (right ? 28 : -28);
        d = `M${x0},${y0} L${x1},${y0} L${tx},${ty}`;
      }
      p.setAttribute('d', d);
      p.style.opacity = String(vis);
      dot.setAttribute('transform', `translate(${tx.toFixed(1)},${ty.toFixed(1)})`);
      dot.style.opacity = String(vis);
    }
  });
  return null;
}

/** Drag to look around, inside limits, at any stop. */
function Orbit() {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    let x = 0, y = 0, on = false;
    const down = (e: PointerEvent) => { on = true; x = e.clientX; y = e.clientY; st.dragging = true; };
    const move = (e: PointerEvent) => {
      if (!on) return;
      const dx = e.clientX - x, dy = e.clientY - y; x = e.clientX; y = e.clientY;
      st.yawOff = clamp(st.yawOff - dx * 0.005, -0.75, 0.75);
      if (e.pointerType !== 'touch') st.pitchOff = clamp(st.pitchOff + dy * 0.004, -0.4, 0.4);
    };
    const up = () => { on = false; st.dragging = false; };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [gl]);
  return null;
}

function Clicks({ built }: { built: Built[] }) {
  // one handler for every solid in the room
  const fills = useMemo(() => built.flatMap((b) => b.parts.flatMap((p) => p.fills)), [built]);
  useEffect(() => {
    for (const f of fills) f.userData.pick = true;
  }, [fills]);
  return null;
}

export default function Scene() {
  const built = useMemo(build, []);
  const phone = isPhone();
  return (
    <Canvas
      dpr={[1, phone ? 1.75 : 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 14, position: [20, 20, 20], near: 0.05, far: 400 }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      raycaster={{ params: { Line: { threshold: 0 }, Points: { threshold: 0 }, Mesh: {}, LOD: {}, Sprite: {} } as THREE.RaycasterParameters }}
    >
      <group onClick={(e) => { if (e.object.userData.pick) pick(e); }} onPointerOver={(e) => { if (e.object.userData.pick && ui.root) ui.root.classList.add('can-click'); }} onPointerOut={() => ui.root?.classList.remove('can-click')}>
        <Drawing built={built} />
      </group>
      <Floor />
      <Measure />
      <Rig built={built} />
      <Orbit />
      <Clicks built={built} />
    </Canvas>
  );
}
