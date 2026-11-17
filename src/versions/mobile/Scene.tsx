// The mobile in three dimensions: painted sheet steel on fine black rods,
// one high light, and the shadow it throws on the wall behind.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { isPhone, still } from '@/lib/utils';
import { ARMS, PIECES, N, S, advance, push, redraw, type Tone } from './sim';
import { outline } from './shapes';

const WALL_Z = -4.2;
const HOOK_Y = 4.4; // where the stem of the hook ends and the first wire starts

/** A brushed, slightly uneven painted finish: drawn once on a canvas. */
function paintMap() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8a8a8a';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const y = Math.random() * 256, x = Math.random() * 256, w = 20 + Math.random() * 90;
    const v = 120 + Math.random() * 30;
    g.strokeStyle = `rgba(${v},${v},${v},0.18)`;
    g.lineWidth = 0.6 + Math.random() * 1.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + (Math.random() - 0.5) * 3); g.stroke();
  }
  for (let i = 0; i < 260; i++) {
    const v = 90 + Math.random() * 40;
    g.fillStyle = `rgba(${v},${v},${v},0.25)`;
    g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, Math.random() * 2.2, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.4, 1.4);
  return t;
}

function useMaterials() {
  return useMemo(() => {
    const rough = paintMap();
    const tone = (color: string, roughness: number, clear: number) =>
      new THREE.MeshPhysicalMaterial({ color, roughness, roughnessMap: rough, bumpMap: rough, bumpScale: 0.6, metalness: 0, clearcoat: clear, clearcoatRoughness: 0.32 });
    return {
      black: tone('#131211', 0.5, 0.55),
      bone: tone('#f4efe4', 0.6, 0.35),
      red: tone('#a3221a', 0.45, 0.6),
      rod: new THREE.MeshPhysicalMaterial({ color: '#1a1918', roughness: 0.32, metalness: 0.75, clearcoat: 0.3 }),
      wire: new THREE.MeshStandardMaterial({ color: '#2a2826', roughness: 0.4, metalness: 0.8 }),
      wall: new THREE.ShadowMaterial({ color: '#3a2f22', opacity: 0.3 }),
    } as Record<Tone | 'rod' | 'wire' | 'wall', THREE.Material>;
  }, []);
}

function plateGeometry(kind: Parameters<typeof outline>[0], size: number) {
  const pts = outline(kind, size).map(([x, y]) => new THREE.Vector2(x, y));
  const shape = new THREE.Shape(pts);
  const depth = kind === 'dot' ? 0.05 : 0.032;
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.009, bevelSize: 0.009, bevelSegments: 3, curveSegments: 4 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

/** The top: a steel rod bent as the hook of a question mark, ending in a ball. */
function hookCurve() {
  const P = (x: number, y: number) => new THREE.Vector3(x * 0.95, y * 0.95 + HOOK_Y, 0);
  return new THREE.CatmullRomCurve3([
    P(-0.62, 0.95), P(-0.55, 1.32), P(-0.25, 1.56), P(0.18, 1.58), P(0.52, 1.38), P(0.62, 1.02), P(0.45, 0.68), P(0.16, 0.44), P(0.02, 0.2), P(0, 0),
  ], false, 'catmullrom', 0.5);
}

function armCurve(i: number) {
  const A = ARMS[i];
  const x0 = -A.d * A.a, x1 = A.d * A.b;
  const lo = Math.min(x0, x1), hi = Math.max(x0, x1), mid = (lo + hi) / 2, half = (hi - lo) / 2;
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k <= 24; k++) { const x = lo + ((hi - lo) * k) / 24; pts.push(new THREE.Vector3(x, A.arch * (1 - ((x - mid) / half) ** 2), 0)); }
  return { curve: new THREE.CatmullRomCurve3(pts), archAt: (x: number) => A.arch * (1 - ((x - mid) / half) ** 2), lo, hi };
}

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), e = new THREE.Euler();
function placeWire(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
  v1.subVectors(b, a); const len = v1.length();
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(up, v1.normalize());
  m.scale.set(1, len, 1);
}

const pointer = { x: 0, y: 0, vx: 0, vy: 0, t: 0 };
if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (ev) => {
    const now = performance.now(), dt = Math.max(8, now - pointer.t);
    pointer.vx = (ev.clientX - pointer.x) / dt; pointer.vy = (ev.clientY - pointer.y) / dt;
    pointer.x = ev.clientX; pointer.y = ev.clientY; pointer.t = now;
  }, { passive: true });
}

function Mobile({ onReady }: { onReady: () => void }) {
  const mats = useMaterials();
  const { camera, size, invalidate } = useThree();
  useEffect(() => { redraw.fn = () => invalidate(); return () => { redraw.fn = () => {}; }; }, [invalidate]);
  const hook = useMemo(() => new THREE.TubeGeometry(hookCurve(), 120, 0.032, 10, false), []);
  const arms = useMemo(() => Array.from({ length: N }, (_, i) => armCurve(i)), []);
  const armGeo = useMemo(() => arms.map((a) => new THREE.TubeGeometry(a.curve, 48, 0.018, 8, false)), [arms]);
  const plates = useMemo(() => PIECES.map((p) => plateGeometry(p.kind, p.size)), []);
  const wireGeo = useMemo(() => { const g = new THREE.CylinderGeometry(0.0065, 0.0065, 1, 6, 1); g.translate(0, 0.5, 0); return g; }, []);
  const bead = useMemo(() => new THREE.SphereGeometry(0.03, 12, 10), []);
  const loop = useMemo(() => new THREE.TorusGeometry(0.035, 0.009, 6, 16), []);

  const root = useRef<THREE.Group>(null);
  const armRefs = useRef<(THREE.Group | null)[]>([]);
  const armBody = useRef<(THREE.Group | null)[]>([]);
  const armWires = useRef<(THREE.Mesh | null)[]>([]);
  const pieceRefs = useRef<(THREE.Group | null)[]>([]);
  const pieceInner = useRef<(THREE.Group | null)[]>([]);
  const pieceWire = useRef<(THREE.Mesh | null)[]>([]);
  const ceiling = useRef<THREE.Mesh>(null);
  const P = useMemo(() => Array.from({ length: N }, () => new THREE.Vector3()), []);
  const E = useMemo(() => Array.from({ length: N }, () => new THREE.Vector3()), []);
  const Q = useMemo(() => Array.from({ length: N }, () => new THREE.Quaternion()), []);
  const ready = useRef(false);
  const look = useRef(new THREE.Vector3(0, 0.2, 0));

  useEffect(() => { if (ceiling.current) placeWire(ceiling.current, new THREE.Vector3(0.02, HOOK_Y + 1.5, 0), new THREE.Vector3(0.02, HOOK_Y + 9, 0)); }, []);

  useFrame((_, dt) => {
    advance(dt);
    const phone = size.width <= 820;
    // Camera: a long lens, held still, easing down a little as the weights go on.
    const aspect = size.width / size.height;
    const viewH = phone ? 11.4 : 11.6;
    const dist = viewH / 2 / Math.tan(THREE.MathUtils.degToRad(12));
    const viewW = viewH * aspect;
    const xOff = phone ? 0.9 : -(viewW * 0.18) + 0.6;
    const stageY = phone ? 1.0 - Math.min(S.stage, 5) * 0.05 : 1.0 - Math.min(S.stage, 5) * 0.06;
    look.current.x = xOff; look.current.y += (stageY - look.current.y) * Math.min(1, dt * 2);
    camera.position.set(look.current.x - 0.4, look.current.y + 0.8, dist);
    camera.lookAt(look.current.x, look.current.y, 0);

    const lift = (1 - S.open) * 9;
    if (root.current) root.current.position.y = lift;

    // Arms, top down.
    for (let i = 0; i < N; i++) {
      const A = ARMS[i];
      const top = i === 0 ? v2.set(0, HOOK_Y, 0) : E[i - 1];
      const L = A.drop;
      P[i].set(top.x + Math.sin(A.sx) * L, top.y - Math.cos(A.sx) * Math.cos(A.sz) * L, top.z + Math.sin(A.sz) * L);
      e.set(0, A.yaw, A.tilt, 'YXZ');
      Q[i].setFromEuler(e);
      const ac = arms[i];
      v1.set(A.d * A.b - A.u, ac.archAt(A.d * A.b), 0).applyQuaternion(Q[i]);
      E[i].copy(P[i]).add(v1);
      const g = armRefs.current[i];
      if (g) { g.position.copy(P[i]); g.quaternion.copy(Q[i]); }
      const b = armBody.current[i];
      if (b) b.position.x = -A.u;
      const w = armWires.current[i];
      if (w) placeWire(w, top, v1.copy(P[i]).setY(P[i].y + 0.035));
    }
    // Pieces.
    PIECES.forEach((p, j) => {
      const A = ARMS[p.arm];
      const g = pieceRefs.current[j], inner = pieceInner.current[j], wm = pieceWire.current[j];
      if (!g || !inner || !wm) return;
      const ac = arms[p.arm];
      v1.set(p.x - A.u, ac.archAt(p.x), 0).applyQuaternion(Q[p.arm]).add(P[p.arm]);
      g.position.copy(v1);
      e.set(p.sz, A.yaw + p.turn * 0.0, p.sx, 'ZXY');
      g.quaternion.setFromEuler(e);
      const a = Math.max(0, p.a);
      const drop = (1 - Math.min(1, a)) * 1.4;
      g.visible = a > 0.01;
      inner.position.y = -p.wire + drop;
      inner.scale.setScalar(Math.max(0.001, Math.min(1, a) ** 0.6));
      wm.scale.y = Math.max(0.001, p.wire - drop);
      wm.position.y = -p.wire + drop;
    });
    if (!ready.current) { ready.current = true; onReady(); }
  });

  // Pointer: brushing a shape pushes it the way the pointer was moving.
  const onMove = (j: number) => (ev: ThreeEvent<PointerEvent>) => {
    ev.stopPropagation();
    S.hovered = j;
    const k = 0.9;
    const vx = Math.max(-3, Math.min(3, pointer.vx)), vy = Math.max(-3, Math.min(3, pointer.vy));
    const sp = Math.hypot(vx, vy);
    if (sp < 0.05 || S.drag.j >= 0) return;
    push(j, vx * k * 0.25, -vy * k * 0.25, -sp * k * 0.3);
  };
  const onDown = (j: number) => (ev: ThreeEvent<PointerEvent>) => {
    ev.stopPropagation();
    const x0 = ev.nativeEvent.clientX, y0 = ev.nativeEvent.clientY;
    const perUnit = size.height / (size.width <= 820 ? 11.4 : 11.6);
    S.drag.j = j; S.drag.dx = 0; S.drag.dy = 0;
    document.body.style.cursor = 'grabbing';
    const move = (e: PointerEvent) => { S.drag.dx = (e.clientX - x0) / perUnit; S.drag.dy = -(e.clientY - y0) / perUnit; };
    const up = () => {
      S.drag.j = -1; document.body.style.cursor = '';
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    const side = ev.point.x - (pieceRefs.current[j]?.getWorldPosition(v2).x ?? 0);
    push(j, 0.5 * Math.sign(side || 1) * -1, 0.25, -1.3);
  };

  return (
    <group ref={root}>
      <mesh ref={ceiling} geometry={wireGeo} material={mats.wire} castShadow />
      <mesh geometry={hook} material={mats.rod} castShadow />
      <mesh position={hookCurve().getPoint(0)} material={mats.rod} castShadow>
        <sphereGeometry args={[0.1, 24, 18]} />
      </mesh>
      {ARMS.map((A, i) => (
        <group key={i}>
          <mesh ref={(m) => { armWires.current[i] = m; }} geometry={wireGeo} material={mats.wire} castShadow />
          <group ref={(g) => { armRefs.current[i] = g; }}>
            <mesh geometry={loop} material={mats.rod} position={[0, 0.03, 0]} castShadow />
            <group ref={(g) => { armBody.current[i] = g; }}>
              <mesh geometry={armGeo[i]} material={mats.rod} castShadow />
              <mesh geometry={bead} material={mats.rod} position={[-A.d * A.a, 0, 0]} castShadow />
              <mesh geometry={bead} material={mats.rod} position={[A.d * A.b, 0, 0]} castShadow />
            </group>
          </group>
        </group>
      ))}
      {PIECES.map((p, j) => (
        <group key={j} ref={(g) => { pieceRefs.current[j] = g; }}>
          <mesh ref={(m) => { pieceWire.current[j] = m; }} geometry={wireGeo} material={mats.wire} castShadow />
          <group ref={(g) => { pieceInner.current[j] = g; }}>
            <mesh
              geometry={plates[j]} material={mats[p.tone]} rotation={[0, 0, p.turn]} castShadow
              onPointerMove={onMove(j)} onPointerDown={onDown(j)}
              onPointerOver={() => { document.body.style.cursor = 'grab'; }}
              onPointerOut={() => { document.body.style.cursor = ''; S.hovered = -1; }}
            />
          </group>
        </group>
      ))}
      <mesh position={[0, 0, WALL_Z]} material={mats.wall} receiveShadow>
        <planeGeometry args={[80, 60]} />
      </mesh>
    </group>
  );
}

function Lights() {
  const spot = useRef<THREE.SpotLight>(null);
  const phone = isPhone();
  useEffect(() => {
    const s = spot.current; if (!s) return;
    s.target.position.set(1.5, 1, WALL_Z);
    s.target.updateMatrixWorld();
  }, []);
  return (
    <>
      <ambientLight intensity={0.9} color="#f3eee4" />
      <spotLight
        ref={spot} position={[-11, 10, 12]} angle={0.4} penumbra={0.3} intensity={5.6} decay={0} color="#fff6e8"
        castShadow shadow-mapSize={[phone ? 1536 : 2048, phone ? 1536 : 2048]} shadow-bias={-0.0004} shadow-normalBias={0.015}
        shadow-camera-near={6} shadow-camera-far={40}
      />
      <directionalLight position={[6, 3, -4]} intensity={1.4} color="#e9eef5" />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[-4, 6, 6]} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[5, 2, 3]} scale={[3, 8, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#efe6d4" position={[0, -5, 2]} scale={[12, 2, 1]} />
      </Environment>
    </>
  );
}

export default function Scene({ onReady }: { onReady: () => void }) {
  return (
    <Canvas
      className="m-canvas"
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 24, near: 1, far: 80, position: [0, 0, 26] }}
      frameloop={still ? 'demand' : 'always'}
      onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.0; }}
    >
      <Lights />
      <Mobile onReady={onReady} />
    </Canvas>
  );
}
