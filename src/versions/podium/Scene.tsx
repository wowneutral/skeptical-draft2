// The hall. A black lacquer lectern with a brass edge and a gooseneck
// microphone, on a dark stage, in front of an empty house. One spotlight.
// The camera starts at the back row and walks down the aisle as the speech
// goes on. At the record the house lights come up a little; at Join three
// more spots find three marks on the floor.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clamp, damp, lerp, smooth, still } from '@/lib/utils';
import { stage } from './stage';

const phoneNow = () => window.innerWidth <= 820;

/* ---------- camera ---------- */
type Key = { p: [number, number, number]; l: [number, number, number]; f: number };
// One key per section of the page, in order (see index.tsx BEATS).
const KEYS: Key[] = [
  { p: [0, 1.7, 23], l: [0, 2.55, 0], f: 24 }, // 0 pitch: the back row
  { p: [0.3, 1.65, 19.5], l: [0, 2.45, 0], f: 24 }, // 1 free
  { p: [-0.2, 1.6, 16.5], l: [0, 2.35, 0], f: 25 }, // 2 private
  { p: [0, 1.55, 14], l: [0, 2.25, 0], f: 26 }, // 3 contributes, doors
  { p: [0.6, 1.5, 12], l: [0, 2.2, 0], f: 27 }, // 4 manifesto
  { p: [-0.5, 1.5, 10.4], l: [0, 2.15, 0], f: 28 },
  { p: [0.4, 1.45, 9], l: [0, 2.1, 0], f: 29 },
  { p: [-0.3, 1.45, 7.8], l: [0, 2.05, 0], f: 30 },
  { p: [-4.4, 3.9, 17.5], l: [0, 1.0, 0], f: 36 }, // 8 the record: back and up, the house shows
  { p: [2.0, 2.75, 2.7], l: [-0.75, 0.95, 0], f: 30 }, // 9 the drive: over the shoulder, the notes
  { p: [-2.6, 1.9, 6.2], l: [0, 2.25, 0], f: 30 }, // 10 coach
  { p: [2.4, 1.8, 6.4], l: [0, 2.25, 0], f: 30 }, // 11 coach
  { p: [0, 4.6, 13.5], l: [0, 1.15, 0.6], f: 32 }, // 12 join: the three marks
  { p: [0, 1.62, 3.4], l: [0, 2.15, 0], f: 30 }, // 13 the close: at the mic
];
const PHONE: Partial<Record<number, Partial<Key>>> = {
  9: { p: [0.7, 2.6, 4.4], l: [0, 1.75, 0], f: 42 },
  12: { p: [0, 8.4, 19.5], l: [0, 3.1, 1.0], f: 46 },
};

function Rig() {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3(0, 2.4, 0));
  const tmpP = useRef(new THREE.Vector3()), tmpL = useRef(new THREE.Vector3());
  const first = useRef(true);
  useFrame((_, dt) => {
    const phone = size.width <= 820;
    const key = (i: number): Key => {
      const k = KEYS[clamp(i, 0, KEYS.length - 1)];
      if (!phone) return k;
      const o = PHONE[i];
      // On a phone the frame is tall: stand further back, widen, keep the lectern low.
      const base: Key = { p: [k.p[0] * 0.6, k.p[1] + 0.3, k.p[2] * 0.98 + 1.2], l: [k.l[0] * 0.4, k.l[1] - 0.15, k.l[2]], f: k.f + 12 };
      return o ? { ...base, ...o } as Key : base;
    };
    const c = clamp(stage.cam, 0, KEYS.length - 1);
    const i = Math.floor(c), t = smooth(smooth(c - i));
    const a = key(i), b = key(i + 1);
    tmpP.current.set(lerp(a.p[0], b.p[0], t), lerp(a.p[1], b.p[1], t), lerp(a.p[2], b.p[2], t));
    tmpL.current.set(lerp(a.l[0], b.l[0], t), lerp(a.l[1], b.l[1], t), lerp(a.l[2], b.l[2], t));
    // A small lean toward the pointer, as if you shifted in your seat.
    tmpP.current.x += stage.px * 0.35; tmpP.current.y += -stage.py * 0.12;
    const fov = lerp(a.f, b.f, t);
    const cam = camera as THREE.PerspectiveCamera;
    if (first.current || still) {
      cam.position.copy(tmpP.current); look.current.copy(tmpL.current); cam.fov = fov; first.current = false;
    } else {
      const k = Math.min(dt, 0.05);
      cam.position.x = damp(cam.position.x, tmpP.current.x, 2.6, k);
      cam.position.y = damp(cam.position.y, tmpP.current.y, 2.6, k);
      cam.position.z = damp(cam.position.z, tmpP.current.z, 2.6, k);
      look.current.lerp(tmpL.current, 1 - Math.exp(-3 * k));
      cam.fov = damp(cam.fov, fov, 2.6, k);
    }
    cam.lookAt(look.current);
    cam.updateProjectionMatrix();
  });
  return null;
}

/* ---------- textures drawn on a canvas ---------- */
function boardsTexture() {
  const w = 1024, h = 1024, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#16120f'; g.fillRect(0, 0, w, h);
  const rows = 16;
  for (let r = 0; r < rows; r++) {
    const y = (r * h) / rows;
    let x = -Math.random() * 400;
    while (x < w) {
      const len = 260 + Math.random() * 420, v = 14 + Math.random() * 10;
      g.fillStyle = `rgb(${v + 6},${v + 2},${v - 2})`;
      g.fillRect(x + 2, y + 2, len - 4, h / rows - 4);
      // grain
      for (let k = 0; k < 18; k++) {
        g.strokeStyle = `rgba(0,0,0,${0.12 + Math.random() * 0.2})`;
        g.lineWidth = 1;
        g.beginPath();
        const gy = y + 4 + Math.random() * (h / rows - 8);
        g.moveTo(x + 2, gy); g.bezierCurveTo(x + len * 0.3, gy + 2, x + len * 0.6, gy - 2, x + len - 2, gy + 1);
        g.stroke();
      }
      x += len;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); t.anisotropy = 8;
  return t;
}
function brushedTexture() {
  const w = 512, h = 64, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    const v = 80 + Math.random() * 90;
    g.fillStyle = `rgba(${v},${v},${v},0.35)`;
    g.fillRect(Math.random() * w, Math.random() * h, 40 + Math.random() * 200, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ---------- the lectern ---------- */
const BRASS = '#b48a4e';
function Lectern() {
  const body = useMemo(() => {
    // Side profile: front (toward the house) at negative x; it flares forward toward the top.
    const s = new THREE.Shape();
    s.moveTo(0.27, 0.1);
    s.lineTo(-0.25, 0.1);
    s.lineTo(-0.335, 1.15);
    s.quadraticCurveTo(-0.345, 1.19, -0.31, 1.19);
    s.lineTo(0.3, 1.07);
    s.quadraticCurveTo(0.32, 1.06, 0.315, 1.03);
    s.lineTo(0.27, 0.1);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.86, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 4, curveSegments: 12 });
    g.translate(0, 0, -0.43);
    g.computeVertexNormals();
    return g;
  }, []);
  const brushed = useMemo(brushedTexture, []);
  const lacquer = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#050505', roughness: 0.4, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1 }), []);
  const brass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: BRASS, metalness: 1, roughness: 0.3, roughnessMap: brushed, clearcoat: 0.3, clearcoatRoughness: 0.2, envMapIntensity: 1.3 }), [brushed]);
  // The front face's slope, for the brass inlay.
  const tilt = Math.atan2(0.085, 1.05);
  const at = (y: number) => 0.25 + 0.085 * ((y - 0.1) / 1.05) + 0.013;
  return (
    <group>
      <mesh geometry={body} material={lacquer} rotation-y={Math.PI / 2} castShadow receiveShadow />
      {/* plinth */}
      <mesh material={lacquer} position={[0, 0.05, 0]} castShadow receiveShadow>
        <primitive object={new RoundedBoxGeometry(1.02, 0.1, 0.7, 3, 0.012)} attach="geometry" />
      </mesh>
      <mesh material={brass} position={[0, 0.103, 0]}>
        <boxGeometry args={[1.0, 0.008, 0.68]} />
      </mesh>
      {/* the brass edge along the top front */}
      <mesh material={brass} position={[0, 1.19, 0.322]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 0.9, 20]} />
      </mesh>
      {/* a fine inlay line across the front */}
      <mesh material={brass} position={[0, 1.02, at(1.02)]} rotation-x={tilt}>
        <boxGeometry args={[0.86, 0.006, 0.004]} />
      </mesh>
      <Notes />
      <Mic brass={brass} />
    </group>
  );
}

/** The speaker's cards on the reading surface. At the drive they fan out, one per item. */
function Notes() {
  const group = useRef<THREE.Group>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ece6da', roughness: 0.85 }), []);
  const cards = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((_, dt) => {
    const on = clamp(1 - Math.abs(stage.cam - 9) * 1.3);
    cards.current.forEach((m, i) => {
      if (!m) return;
      const active = Math.round(stage.card) === i;
      const tx = (i - 3) * 0.035 * on - 0.08;
      const ry = (i - 3) * 0.07 * on;
      const ty = 0.004 * i + (active ? 0.012 * on : 0);
      const k = still ? 1 : 1 - Math.exp(-6 * Math.min(dt, 0.05));
      m.position.x += (tx - m.position.x) * k;
      m.position.y += (ty - m.position.y) * k;
      m.rotation.y += (ry - m.rotation.y) * k;
    });
  });
  // Reading surface slope rises toward the house (+z).
  const slope = -Math.atan2(0.12, 0.61);
  return (
    <group ref={group} position={[0, 1.145, 0.0]} rotation-x={slope}>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} ref={(m) => { cards.current[i] = m; }} material={mat} position={[-0.08, 0.004 * i, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.0025, 0.29]} />
        </mesh>
      ))}
    </group>
  );
}

function Mic({ brass }: { brass: THREE.Material }) {
  const neck = useRef<THREE.Group>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.13, -0.005), new THREE.Vector3(-0.01, 0.27, -0.05),
    new THREE.Vector3(-0.035, 0.37, -0.15), new THREE.Vector3(-0.055, 0.405, -0.26),
  ]), []);
  const tube = useMemo(() => new THREE.TubeGeometry(curve, 80, 0.0075, 10), [curve]);
  // Ribs on the gooseneck: a bump map of rings.
  const ribs = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 8; c.height = 256;
    const g = c.getContext('2d')!;
    for (let y = 0; y < 256; y += 4) { g.fillStyle = '#fff'; g.fillRect(0, y, 8, 2); g.fillStyle = '#000'; g.fillRect(0, y + 2, 8, 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 1); t.rotation = Math.PI / 2;
    return t;
  }, []);
  const neckMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#1b1b1d', metalness: 0.9, roughness: 0.32, bumpMap: ribs, bumpScale: 0.4, envMapIntensity: 1.2 }), [ribs]);
  const head = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0c0c0d', roughness: 0.75, metalness: 0.4 }), []);
  const end = curve.getPoint(1), dir = curve.getTangent(1);
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()), [dir]);
  useFrame((_, dt) => {
    if (!neck.current || still) return;
    const k = 1 - Math.exp(-4 * Math.min(dt, 0.05));
    // The mic turns a little toward whoever is watching.
    neck.current.rotation.y += (stage.px * 0.22 - neck.current.rotation.y) * k;
    neck.current.rotation.x += (stage.py * 0.06 - neck.current.rotation.x) * k;
  });
  return (
    <group position={[0.27, 1.19, 0.2]}>
      <mesh material={brass} position-y={0.012} castShadow><cylinderGeometry args={[0.028, 0.034, 0.024, 24]} /></mesh>
      <group ref={neck} position-y={0.02}>
        <mesh geometry={tube} material={neckMat} castShadow />
        <group position={end} quaternion={q}>
          <mesh material={brass} position-y={0.006}><cylinderGeometry args={[0.0105, 0.0105, 0.016, 20]} /></mesh>
          <mesh material={head} position-y={0.055} castShadow><capsuleGeometry args={[0.019, 0.06, 8, 20]} /></mesh>
        </group>
      </group>
    </group>
  );
}

/* ---------- the hall ---------- */
const STAGE_FRONT = 3.2, FLOOR = -1.15;
function Hall() {
  const boards = useMemo(boardsTexture, []);
  const curtain = useMemo(() => {
    const g = new THREE.PlaneGeometry(22, 11, 360, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      p.setZ(i, Math.sin(x * 3.3) * 0.13 + Math.sin(x * 7.9 + 1.3) * 0.045 + Math.sin(x * 1.1) * 0.08);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const velvet = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#1a0e0d', roughness: 0.95, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color('#5c2f2a'), envMapIntensity: 0.15 }), []);
  return (
    <group>
      {/* stage */}
      <mesh position={[0, -0.6, -2.4]} receiveShadow>
        <boxGeometry args={[24, 1.2, 11.2]} />
        <meshStandardMaterial map={boards} roughness={0.55} metalness={0} envMapIntensity={0.35} />
      </mesh>
      {/* the stage lip */}
      <mesh position={[0, -0.03, STAGE_FRONT + 0.01]}>
        <boxGeometry args={[24, 0.06, 0.03]} />
        <meshStandardMaterial color="#0c0b0a" roughness={0.4} />
      </mesh>
      <mesh position={[0, -5.5 + 5.5, -6.6]} geometry={curtain} material={velvet} receiveShadow />
      {/* house floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR, 16]} receiveShadow>
        <planeGeometry args={[40, 30]} />
        <meshStandardMaterial color="#0d0c0b" roughness={0.9} />
      </mesh>
      {/* side walls */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 11.5, 3, 10]} rotation-y={-s * Math.PI / 2} receiveShadow>
          <planeGeometry args={[34, 12]} />
          <meshStandardMaterial color="#121110" roughness={0.95} envMapIntensity={0.1} />
        </mesh>
      ))}
      <Seats />
      <Sconces />
    </group>
  );
}

function Seats() {
  const back = useRef<THREE.InstancedMesh>(null), seat = useRef<THREE.InstancedMesh>(null), arm = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: [number, number, number][] = [];
    const rows = phoneNow() ? 14 : 18;
    for (let r = 0; r < rows; r++) {
      const z = 5.4 + r * 1.05, y = FLOOR + r * 0.075;
      for (let s = -11; s <= 11; s++) {
        if (s === 0) continue; // the aisle
        const x = s * 0.6 + (s > 0 ? 0.35 : -0.35);
        if (Math.abs(x) > 10.6) continue;
        out.push([x, y, z]);
      }
    }
    return out;
  }, []);
  const geos = useMemo(() => ({
    back: new RoundedBoxGeometry(0.54, 0.62, 0.09, 3, 0.04),
    seat: new RoundedBoxGeometry(0.5, 0.1, 0.44, 3, 0.04),
    arm: new RoundedBoxGeometry(0.05, 0.5, 0.5, 2, 0.02),
  }), []);
  const fabric = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#2a1514', roughness: 0.95, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color('#6b3a33'), envMapIntensity: 0.1 }), []);
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: '#151210', roughness: 0.5, envMapIntensity: 0.3 }), []);
  useEffect(() => {
    const m = new THREE.Object3D();
    spots.forEach(([x, y, z], i) => {
      m.rotation.set(-0.12, 0, 0); m.position.set(x, y + 0.82, z + 0.24); m.updateMatrix(); back.current!.setMatrixAt(i, m.matrix);
      m.rotation.set(0, 0, 0); m.position.set(x, y + 0.45, z); m.updateMatrix(); seat.current!.setMatrixAt(i, m.matrix);
      m.position.set(x - 0.29, y + 0.3, z + 0.02); m.updateMatrix(); arm.current!.setMatrixAt(i, m.matrix);
    });
    [back, seat, arm].forEach((r) => { r.current!.instanceMatrix.needsUpdate = true; r.current!.computeBoundingSphere(); });
  }, [spots]);
  return (
    <group>
      <instancedMesh ref={back} args={[geos.back, fabric, spots.length]} receiveShadow />
      <instancedMesh ref={seat} args={[geos.seat, fabric, spots.length]} receiveShadow />
      <instancedMesh ref={arm} args={[geos.arm, wood, spots.length]} receiveShadow />
    </group>
  );
}

/** Small wall lamps down both sides of the house: dark until the record. */
function Sconces() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color('#ffd9a8'), emissiveIntensity: 0, roughness: 1 }), []);
  useFrame(() => { mat.emissiveIntensity = 0.05 + stage.house * 3.2; });
  return (
    <group>
      {[-1, 1].flatMap((s) => [5, 10, 15, 20].map((z) => (
        <mesh key={`${s}${z}`} material={mat} position={[s * 11.42, 2.4, z]} rotation-y={-s * Math.PI / 2}>
          <planeGeometry args={[0.18, 0.5]} />
        </mesh>
      )))}
    </group>
  );
}

/* ---------- light ---------- */
/** A soft beam you can see: an open cone, bright at its core, fading to its edge and its foot. */
function Beam({ from, to, radius, power }: { from: [number, number, number]; to: [number, number, number]; radius: number; power: { current: number } }) {
  const ref = useRef<THREE.Mesh>(null);
  const { geo, pos, quat } = useMemo(() => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const len = a.distanceTo(b) * 1.04;
    const g = new THREE.CylinderGeometry(0.06, radius, len, 64, 24, true);
    g.translate(0, -len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), b.clone().sub(a).normalize());
    return { geo: g, pos: a, quat: q, len };
  }, [from, to, radius]);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uPower: { value: 0 }, uColor: { value: new THREE.Color('#fff1dc') }, uLen: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying float vH;
      uniform float uLen;
      void main() {
        vH = -position.y / uLen;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = -mv.xyz; vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying float vH;
      uniform float uPower; uniform vec3 uColor;
      void main() {
        float rim = abs(dot(normalize(vN), normalize(vV)));
        float core = pow(rim, 2.2);
        float along = smoothstep(0.0, 0.12, vH) * (1.0 - 0.55 * vH) * smoothstep(1.0, 0.86, vH);
        float a = core * along * uPower;
        gl_FragColor = vec4(uColor * a, 1.0);
      }`,
  }), []);
  useEffect(() => { mat.uniforms.uLen.value = geo.parameters.height; }, [geo, mat]);
  useFrame(() => { mat.uniforms.uPower.value = power.current; if (ref.current) ref.current.visible = power.current > 0.002; });
  return <mesh ref={ref} geometry={geo} material={mat} position={pos} quaternion={quat} renderOrder={5} />;
}

/** Dust, only inside the main beam, drifting so slowly you have to look for it. */
function Dust({ from, to, radius }: { from: [number, number, number]; to: [number, number, number]; radius: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 140, a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const t = 0.25 + Math.random() * 0.7, r = Math.sqrt(Math.random()) * radius * t * 0.8, th = Math.random() * Math.PI * 2;
      const p = a.clone().lerp(b, t);
      arr[i * 3] = p.x + Math.cos(th) * r; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z + Math.sin(th) * r;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, [from, to, radius]);
  const mat = useMemo(() => new THREE.PointsMaterial({ color: '#fff4e0', size: 0.016, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = still ? 0 : clock.elapsedTime;
    ref.current.position.y = Math.sin(t * 0.13) * 0.06;
    ref.current.position.x = Math.sin(t * 0.09) * 0.04;
    mat.opacity = 0.5 * (1 - stage.end) * (1 - stage.join * 0.6);
  });
  return <points ref={ref} geometry={geo} material={mat} />;
}

const MARKS: [number, number][] = [[-2.7, 1.5], [0, 2.0], [2.7, 1.5]];
const MAIN_FROM: [number, number, number] = [0.5, 8.6, 4.2];
const MAIN_TO: [number, number, number] = [0, 0, -0.1];

function Lights() {
  const key = useRef<THREE.SpotLight>(null), rim = useRef<THREE.SpotLight>(null), hemi = useRef<THREE.HemisphereLight>(null);
  const house = useRef<(THREE.PointLight | null)[]>([]);
  const joins = useRef<(THREE.SpotLight | null)[]>([]);
  const beamMain = useRef(0);
  const mainPower = useRef(0), joinPower = useRef([0, 0, 0]);
  const powers = useMemo(() => [0, 1, 2].map(() => ({ current: 0 })), []);
  const keyTarget = useMemo(() => { const o = new THREE.Object3D(); o.position.set(...MAIN_TO); return o; }, []);
  const targets = useMemo(() => MARKS.map(([x, z]) => { const o = new THREE.Object3D(); o.position.set(x, 0, z); return o; }), []);
  const { scene } = useThree();
  const born = useRef(-1), on = useRef(still ? 1 : 0);
  useEffect(() => { scene.add(keyTarget); targets.forEach((t) => scene.add(t)); return () => { scene.remove(keyTarget); targets.forEach((t) => scene.remove(t)); }; }, [scene, keyTarget, targets]);
  useFrame(({ clock }, dt) => {
    const now = clock.elapsedTime;
    if (born.current < 0) { born.current = now; stage.onReady?.(); }
    // The opening: a beat of dark, then the spot strikes, catches twice, and holds.
    if (!still) {
      const t = now - born.current - 0.7;
      on.current = t < 0 ? 0 : t < 0.08 ? 0.7 : t < 0.2 ? 0.08 : t < 0.3 ? 0.9 : t < 0.42 ? 0.35 : Math.min(1, 0.6 + (t - 0.42) * 1.6);
    }
    const join = stage.join, end = stage.end;
    const main = on.current * (1 - join * 0.72) * (1 - end * 0.85);
    mainPower.current = main;
    if (key.current) {
      key.current.intensity = 900 * main;
      key.current.target = keyTarget;
      // The light leans a touch with the pointer, like a follow spot finding its mark.
      const k = 1 - Math.exp(-3 * Math.min(dt, 0.05));
      keyTarget.position.x += ((still ? 0 : stage.px * 0.18) - keyTarget.position.x) * k;
    }
    if (rim.current) { rim.current.intensity = 160 * on.current * (1 - end * 0.7); rim.current.target = keyTarget; }
    const h = stage.house;
    if (hemi.current) hemi.current.intensity = 0.03 + h * 1.1;
    house.current.forEach((l) => { if (l) l.intensity = h * 110; });
    scene.environmentIntensity = 0.3 + h * 0.3;
    targets.forEach((tg, i) => {
      const chosen = stage.pick === i, near = stage.near === i;
      // The three come up one after another as you arrive.
      const up = clamp(join * 2.2 - i * 0.55);
      const want = up * (stage.pick < 0 ? (near ? 1 : 0.62) : chosen ? 1.15 : 0.28);
      const k = still ? 1 : 1 - Math.exp(-5 * Math.min(dt, 0.05));
      joinPower.current[i] += (want - joinPower.current[i]) * k;
      powers[i].current = joinPower.current[i] * 0.15;
      const l = joins.current[i];
      if (l) { l.intensity = 1100 * joinPower.current[i]; l.target = tg; }
    });
    beamMain.current = main * 0.13;
  });
  return (
    <>
      <spotLight ref={key} position={MAIN_FROM} angle={0.165} penumbra={0.9} distance={0} decay={2} color="#fff0d8" castShadow
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0001} shadow-normalBias={0.02} />
      <spotLight ref={rim} position={[-2.4, 4.6, -4.4]} angle={0.16} penumbra={1} decay={2} color="#ece4d8" />
      <hemisphereLight ref={hemi} args={['#ffe6c4', '#140c0a', 0.03]} />
      {[[-6, 6, 9], [6, 6, 9], [-6, 6, 17], [6, 6, 17], [0, 6.5, 4]].map((p, i) => (
        <pointLight key={i} ref={(l) => { house.current[i] = l; }} position={p as [number, number, number]} intensity={0} distance={16} decay={1.6} color="#ffdcb0" />
      ))}
      <Beam from={MAIN_FROM} to={MAIN_TO} radius={1.35} power={beamMain} />
      <Dust from={MAIN_FROM} to={MAIN_TO} radius={1.65} />
      {MARKS.map(([x, z], i) => (
        <group key={i}>
          <spotLight ref={(l) => { joins.current[i] = l; }} position={[x * 1.15, 8.4, z + 3.4]} angle={0.12} penumbra={0.6} decay={2} intensity={0} color="#fff3e2" />
          <Beam from={[x * 1.15, 8.4, z + 3.4]} to={[x, 0, z]} radius={0.95} power={powers[i]} />
          <Mark x={x} z={z} i={i} />
        </group>
      ))}
    </>
  );
}

/** Spike tape on the boards: a cross where you stand. */
function Mark({ x, z, i }: { x: number; z: number; i: number }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9cfbf', roughness: 0.7 }), []);
  useFrame(() => { mat.color.set(stage.pick === i ? '#c7a065' : '#d9cfbf'); });
  return (
    <group position={[x, 0.002, z]} rotation-y={0.785}>
      <mesh material={mat} rotation-x={-Math.PI / 2}><planeGeometry args={[0.46, 0.05]} /></mesh>
      <mesh material={mat} rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2}><planeGeometry args={[0.46, 0.05]} /></mesh>
    </group>
  );
}

export default function PodiumScene() {
  const phone = phoneNow();
  return (
    <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, phone ? 1.4 : 1.6]} camera={{ fov: 24, near: 0.1, far: 80, position: [0, 1.7, 23] }}
      gl={{ antialias: false, powerPreference: 'high-performance' }} style={{ touchAction: 'pan-y' }}>
      <color attach="background" args={['#070707']} />
      <fog attach="fog" args={['#070707', 16, 40]} />
      <Hall />
      <Lectern />
      <Lights />
      <Rig />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#050505']} />
        {/* A long softbox overhead and two strips: what the lacquer and brass reflect. */}
        <Lightformer form="rect" intensity={3} position={[0, 6, 2]} scale={[2, 8, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.6} position={[-5, 2, 3]} scale={[0.6, 6, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.2} position={[5, 2, -2]} scale={[0.6, 6, 1]} rotation-y={-Math.PI / 2} />
      </Environment>
      <EffectComposer multisampling={phone ? 0 : 4}>
        <Vignette offset={0.25} darkness={0.75} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.09} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
