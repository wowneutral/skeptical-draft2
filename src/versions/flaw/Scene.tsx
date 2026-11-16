// The stele: one slab of polished black stone, upright in a low bone plinth,
// lit by one long softbox. Every press puts a flaw in it; the scroll grows one more.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { clamp, damp, lerp, smooth, still } from '@/lib/utils';
import { DOT, FH, FW, Stone } from './stone';
import { st } from './store';

const BG = '#0c0c0d';
const W = 4.2, H = 2.1, D = 0.34, BS = 0.022;
const BASE = 0.42; // the slab's foot, sunk into the plinth's slot
const LOOK = new THREE.Vector3(0, 1.32, 0);

/** Camera per section: [azimuth, elevation]. The light rakes differently at each. */
const KEYS: [number, number][] = [[0, 0.1], [-0.26, 0.078], [0.24, 0.062], [-0.18, 0.125], [0.2, 0.088], [0, 0.098], [0.05, 0.072]];

function slabGeometry() {
  const s = new THREE.Shape();
  const w = W / 2 - BS, h = H / 2 - BS;
  s.moveTo(-w, -h); s.lineTo(w, -h); s.lineTo(w, h); s.lineTo(-w, h); s.closePath();
  const depth = D - 2 * BS;
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: BS, bevelSize: BS, bevelSegments: 3, curveSegments: 1 });
  g.translate(0, 0, -depth / 2);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, clamp((pos.getX(i) + W / 2) / W), clamp((pos.getY(i) + H / 2) / H));
  uv.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** A canvas-drawn grain for the bone plinth: fine speckle in colour and roughness. */
function boneTextures() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#d6cfbf'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { const v = Math.random(); x.fillStyle = v < 0.5 ? `rgba(120,108,88,${0.05 + v * 0.1})` : `rgba(250,246,236,${0.05 + (v - 0.5) * 0.12})`; x.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1);
  return t;
}

function Shards({ fire }: { fire: React.MutableRefObject<number> }) {
  const N = 18;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const parts = useMemo(() => Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), s: 0, rest: false })), []);
  const seen = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, dt0) => {
    const m = mesh.current; if (!m) return;
    const dt = Math.min(dt0, 1 / 30);
    if (fire.current !== seen.current) {
      seen.current = fire.current;
      const x = (DOT.x / FW - 0.5) * W, y = BASE + (1 - DOT.y / FH) * H, z = D / 2 + 0.01;
      parts.forEach((q) => {
        const a = Math.random() * Math.PI * 2, rr = Math.random() * 0.09;
        q.p.set(x + Math.cos(a) * rr, y + Math.sin(a) * rr, z);
        q.v.set((Math.random() - 0.5) * 0.9, Math.random() * 0.7, 0.35 + Math.random() * 0.9);
        q.w.set(Math.random() * 14, Math.random() * 14, Math.random() * 14);
        q.s = 0.008 + Math.random() * 0.022; q.rest = false;
      });
      if (still) parts.forEach((q) => { q.p.set(x + (Math.random() - 0.5) * 0.5, 0.5 + q.s * 0.4, D / 2 + 0.05 + Math.random() * 0.2); q.rest = true; });
    }
    parts.forEach((q, i) => {
      if (q.s > 0 && !q.rest) {
        q.v.y -= 9.8 * dt; q.p.addScaledVector(q.v, dt);
        q.r.x += q.w.x * dt; q.r.y += q.w.y * dt; q.r.z += q.w.z * dt;
        const floor = q.p.z < 0.5 && Math.abs(q.p.x) < 2.45 ? 0.5 : 0;
        if (q.p.y < floor + q.s * 0.4) {
          q.p.y = floor + q.s * 0.4; q.v.y *= -0.28; q.v.x *= 0.55; q.v.z *= 0.55; q.w.multiplyScalar(0.5);
          if (Math.abs(q.v.y) < 0.12) { q.rest = true; }
        }
      }
      dummy.position.copy(q.p); dummy.rotation.copy(q.r); dummy.scale.setScalar(q.s);
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, N]} castShadow frustumCulled={false}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshPhysicalMaterial color="#141415" roughness={0.35} clearcoat={0.6} flatShading />
    </instancedMesh>
  );
}

function Stele({ phone }: { phone: boolean }) {
  const { camera, size, scene, gl, invalidate } = useThree();
  const stone = useMemo(() => new Stone(phone ? 1536 : 2048), [phone]);
  const geo = useMemo(slabGeometry, []);
  const bone = useMemo(boneTextures, []);
  const fire = useRef(0);
  const born = useRef(performance.now());
  const slab = useRef<THREE.Mesh>(null);
  const kick = useRef({ x: 0, v: 0, y: 0, w: 0 });
  const cam = useRef({ az: KEYS[0][0], el: KEYS[0][1], ex: 0, ey: 0, t: 0, f: 0 });
  const face = useMemo(() => new THREE.MeshPhysicalMaterial({
    map: stone.tColor, normalMap: stone.tNormal, roughnessMap: stone.tRough, roughness: 1, metalness: 0,
    clearcoat: 0.7, clearcoatRoughness: 0.035, clearcoatNormalMap: stone.tNormal, clearcoatRoughnessMap: stone.tRough,
    normalScale: new THREE.Vector2(1, 1), clearcoatNormalScale: new THREE.Vector2(1, 1), specularIntensity: 1, ior: 1.54,
  }), [stone]);
  const side = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#0b0b0c', roughness: 0.09, clearcoat: 0.7, clearcoatRoughness: 0.04, ior: 1.54 }), []);

  useEffect(() => {
    stone.onChip = () => { fire.current++; invalidate(); };
    if (still) { stone.setMark(1, true, 0, true); stone.tick(0); invalidate(); }
    return () => { stone.onChip = null; };
  }, [stone, invalidate]);

  useEffect(() => () => { geo.dispose(); face.dispose(); side.dispose(); [stone.tColor, stone.tNormal, stone.tRough, bone].forEach((t) => t.dispose()); }, [geo, face, side, stone, bone]);

  const asks = useRef(st.asks);
  const strikeAt = (u: number, v: number) => {
    stone.strike(u, v, still); stone.tick(0); invalidate();
    // The stone takes the blow: a small, heavy recoil about its foot.
    if (!still) { kick.current.v -= 0.05 * (0.4 + v); kick.current.w += (u - 0.5) * 0.04; }
  };

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 1 / 20), c = cam.current;
    c.t += dt;
    if (st.asks !== asks.current) {
      asks.current = st.asks;
      strikeAt(0.12 + Math.random() * 0.76, 0.18 + Math.random() * 0.66);
    }
    // The scroll: where we are in the page.
    c.f = still ? 0 : damp(c.f, st.f, 4, dt);
    if (!still) stone.setMark(clamp((st.f - 0.55) / 4.1), st.f >= 4.88, dt);
    stone.tick(dt);
    const i = Math.min(KEYS.length - 2, Math.floor(c.f)), k = smooth(clamp(c.f - i));
    const az = lerp(KEYS[i][0], KEYS[i + 1][0], k), el = lerp(KEYS[i][1], KEYS[i + 1][1], k);
    // The pointer nudges the softbox, so the cracks glint as you move.
    c.ex = damp(c.ex, still ? 0 : st.py * 0.035, 3.2, dt);
    c.ey = damp(c.ey, still ? 0 : st.px * 0.09, 3.2, dt);
    const open = still ? 1 : smooth(clamp(((performance.now() - born.current) / 1000 - 0.4) / 2.2));
    scene.environmentRotation.set(c.ex + (1 - open) * 0.16, c.ey, 0);
    scene.environmentIntensity = 0.15 + 0.85 * open;
    const aspect = size.width / size.height;
    const fov = (20 * Math.PI) / 180;
    const need = phone ? W * 1.2 : W * 1.86;
    const dist = Math.max(phone ? 9 : 12, need / (2 * Math.tan(fov / 2) * aspect), phone ? 0 : (H * 2.62) / (2 * Math.tan(fov / 2)));
    // The ending: a slow step back, so the finished stone stands whole in the frame.
    const back = 1 + 0.07 * smooth(clamp(c.f - 5));
    camera.position.set(Math.sin(az) * Math.cos(el) * dist * back, LOOK.y + Math.sin(el) * dist * back, Math.cos(az) * Math.cos(el) * dist * back);
    camera.lookAt(LOOK);
    const pc = camera as THREE.PerspectiveCamera;
    if (phone) pc.clearViewOffset();
    else pc.setViewOffset(size.width, size.height, -size.width * 0.225, -size.height * 0.015, size.width, size.height);
    const kk = kick.current;
    kk.v += (-260 * kk.x - 9 * kk.v) * dt; kk.x += kk.v * dt;
    kk.w += (-200 * kk.y - 8 * kk.w) * dt; kk.y += kk.w * dt;
    if (slab.current) { slab.current.rotation.x = kk.x; slab.current.rotation.y = kk.y; }
    if (!st.ready && (c.t > 0.2 || still)) { st.ready = true; st.onReady?.(); }
  });

  const down = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (!e.face || e.face.normal.z < 0.5 || !e.uv) return;
    e.stopPropagation();
    strikeAt(e.uv.x, e.uv.y);
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    const pt = (e.nativeEvent as PointerEvent).pointerType;
    if (pt === 'mouse' || e.delta > 10) return;
    if (!e.face || e.face.normal.z < 0.5 || !e.uv) return;
    strikeAt(e.uv.x, e.uv.y);
  };
  const over = (e: ThreeEvent<PointerEvent>) => { gl.domElement.style.cursor = e.face && e.face.normal.z > 0.5 ? 'crosshair' : ''; };

  return (
    <group>
      <mesh ref={slab} geometry={geo} material={[face, side]} position={[0, BASE + H / 2, 0]} castShadow onPointerDown={down} onClick={click} onPointerMove={over} onPointerOut={() => { gl.domElement.style.cursor = ''; }} />
      {/* The plinth: a low bone block with a slot, on a wider step. */}
      <RoundedBox args={[4.9, 0.5, 1.15]} radius={0.018} smoothness={3} position={[0, 0.25, 0.02]} castShadow receiveShadow>
        <meshPhysicalMaterial map={bone} color="#e4ddce" roughness={0.58} clearcoat={0.08} />
      </RoundedBox>
      <RoundedBox args={[5.4, 0.06, 1.5]} radius={0.01} smoothness={2} position={[0, 0.03, 0.02]} receiveShadow>
        <meshPhysicalMaterial map={bone} color="#bdb6a7" roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, 0.497, 0]}><boxGeometry args={[W + 0.06, 0.008, D + 0.06]} /><meshStandardMaterial color="#1a1918" roughness={0.9} /></mesh>
      <Shards fire={fire} />
    </group>
  );
}

function Lights({ phone }: { phone: boolean }) {
  const key = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const l = key.current; if (!l) return;
    const f = still ? 0 : st.f;
    l.position.set(-6 + Math.sin(f * 0.9) * 2.2, 7.5, 4.5 + Math.cos(f * 0.7) * 1.2);
  });
  return (
    <>
      <directionalLight ref={key} intensity={1.7} color="#fff6ea" castShadow={!phone} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-1} />
      <directionalLight position={[6, 3, -5]} intensity={0.9} color="#dfe6ff" />
      <ambientLight intensity={0.05} />
    </>
  );
}

export default function Scene({ phone }: { phone: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      shadows={{ type: THREE.PCFShadowMap }}
      frameloop={still ? 'demand' : 'always'}
      camera={{ fov: 20, position: [0, 2.6, 13], near: 1, far: 70 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 16, 32]} />
      <Environment resolution={512} frames={1}>
        {/* One long softbox, low and in front: the band across the face. */}
        <Lightformer form="rect" intensity={16} color="#fffaf2" position={[0, -0.36, 10]} scale={[26, 0.1, 1]} />
        {/* A dim ceiling, so the walls of a crack have something to catch. */}
        <Lightformer form="rect" intensity={0.5} color="#ffffff" position={[0, 9, 2]} scale={[18, 10, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#f4f1ea" position={[-9, 0.5, 4]} scale={[0.7, 9, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#f4f1ea" position={[9, 0.5, 3]} scale={[0.5, 9, 1]} />
      </Environment>
      <Lights phone={phone} />
      <Stele phone={phone} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#111112" roughness={0.92} />
      </mesh>
      <ContactShadows position={[0, 0.062, 0.02]} scale={[7.5, 3]} opacity={0.75} blur={2.2} far={1.6} frames={1} resolution={512} />
    </Canvas>
  );
}
