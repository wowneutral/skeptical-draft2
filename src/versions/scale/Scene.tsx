// The instrument. Aged brass, a slate plinth on felt, a knife edge on agate,
// a hanging pointer over an engraved arc, two pans on chains, and the doubt:
// the brand question mark cast in nickel. Every position comes from sim.ts.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import MARKS from '@/lib/marks.json';
import { scroll } from '@/lib/scroll';
import { isPhone, still } from '@/lib/utils';
import { WEIGHTS, S, PIV_Y, LB, LC, PAN_R, hook, type W, type Kind } from './sim';

/* ---------- textures drawn on a canvas ---------- */
function noiseCanvas(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!; draw(g, size); return c;
}
function useTextures() {
  return useMemo(() => {
    // brass: brushed lines, a few darker tarnish clouds; used for roughness and a faint colour shift
    const rough = noiseCanvas(512, (g, s) => {
      g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 2600; i++) { const y = Math.random() * s, v = 80 + Math.random() * 70; g.strokeStyle = `rgba(${v},${v},${v},0.25)`; g.lineWidth = Math.random() * 1.6; g.beginPath(); g.moveTo(0, y); g.lineTo(s, y + (Math.random() - 0.5) * 6); g.stroke(); }
      for (let i = 0; i < 26; i++) { const x = Math.random() * s, y = Math.random() * s, r = 20 + Math.random() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(190,190,190,0.45)'); gr.addColorStop(1, 'rgba(190,190,190,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    });
    const tarnish = noiseCanvas(512, (g, s) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 40; i++) { const x = Math.random() * s, y = Math.random() * s, r = 16 + Math.random() * 80; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(120,96,60,0.32)'); gr.addColorStop(1, 'rgba(120,96,60,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    });
    const felt = noiseCanvas(512, (g, s) => {
      const im = g.createImageData(s, s);
      for (let i = 0; i < im.data.length; i += 4) { const v = 200 + Math.random() * 55; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      g.putImageData(im, 0, 0);
    });
    // the engraved arc: ticks in polar position on a square that maps the ring's planar uvs
    const arc = noiseCanvas(1024, (g, s) => {
      g.fillStyle = '#d9b46a'; g.fillRect(0, 0, s, s);
      const R = 2.02, cx = s / 2, cy = s / 2, px = s / (2 * R);
      g.strokeStyle = '#2a1d0c'; g.fillStyle = '#2a1d0c';
      for (let k = -24; k <= 24; k++) {
        const a = -Math.PI / 2 + (k * 0.9 * Math.PI) / 180;
        const long = k % 6 === 0, mid = k % 3 === 0;
        const r0 = (k === 0 ? 1.74 : long ? 1.78 : mid ? 1.84 : 1.88) * px, r1 = 1.97 * px;
        g.lineWidth = k === 0 ? 6 : long ? 3.4 : 1.8;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy - Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy - Math.sin(a) * r1); g.stroke();
      }
      g.lineWidth = 1.6; g.beginPath(); g.arc(cx, cy, 1.97 * px, Math.PI / 2 - 0.42, Math.PI / 2 + 0.42); g.stroke();
      g.beginPath(); g.arc(cx, cy, 1.765 * px, Math.PI / 2 - 0.42, Math.PI / 2 + 0.42); g.lineWidth = 1; g.stroke();
      g.font = 'italic 600 30px "Bodoni Moda Variable", serif'; g.textAlign = 'center';
      const word = (t: string, deg: number) => { const a = -Math.PI / 2 + (deg * Math.PI) / 180; g.save(); g.translate(cx + Math.cos(a) * 1.81 * px, cy - Math.sin(a) * 1.81 * px); g.rotate(-(a + Math.PI / 2)); g.fillText(t, 0, 10); g.restore(); };
      word('Skeptical', -15.3); word('the doubt', 15.3); word('level', 2.6);
    });
    const mk = (c: HTMLCanvasElement, rep = 1, srgb = false) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
    return { rough: mk(rough), tarnish: mk(tarnish, 1, true), felt: mk(felt, 6), arc: mk(arc, 1, true) };
  }, []);
}

function useMaterials() {
  const tx = useTextures();
  return useMemo(() => {
    const brass = new THREE.MeshPhysicalMaterial({ color: '#d4a752', metalness: 1, roughness: 0.32, roughnessMap: tx.rough, map: tx.tarnish, clearcoat: 0.35, clearcoatRoughness: 0.18 });
    const brassBright = new THREE.MeshPhysicalMaterial({ color: '#e8bf68', metalness: 1, roughness: 0.18, roughnessMap: tx.rough, clearcoat: 0.6, clearcoatRoughness: 0.08 });
    const darkBrass = new THREE.MeshPhysicalMaterial({ color: '#8a6a34', metalness: 1, roughness: 0.42, roughnessMap: tx.rough, map: tx.tarnish });
    const iron = new THREE.MeshPhysicalMaterial({ color: '#4a4744', metalness: 0.85, roughness: 0.5, roughnessMap: tx.rough, clearcoat: 0.2 });
    const nickel = new THREE.MeshPhysicalMaterial({ color: '#d8dbe0', metalness: 1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05 });
    const slate = new THREE.MeshPhysicalMaterial({ color: '#1d2124', metalness: 0, roughness: 0.38, roughnessMap: tx.felt, clearcoat: 0.5, clearcoatRoughness: 0.35 });
    const felt = new THREE.MeshStandardMaterial({ color: '#17201d', roughness: 0.95, roughnessMap: tx.felt, map: tx.felt });
    const agate = new THREE.MeshPhysicalMaterial({ color: '#7a2618', roughness: 0.1, metalness: 0, clearcoat: 1, transmission: 0 });
    const leather = new THREE.MeshPhysicalMaterial({ color: '#3b1f14', roughness: 0.55, roughnessMap: tx.felt, sheen: 0.6, sheenColor: new THREE.Color('#a0705a'), clearcoat: 0.25 });
    const arc = new THREE.MeshPhysicalMaterial({ map: tx.arc, metalness: 0.9, roughness: 0.3, roughnessMap: tx.rough, clearcoat: 0.4, side: THREE.DoubleSide, emissive: new THREE.Color('#ffb54a'), emissiveIntensity: 0, emissiveMap: tx.arc });
    return { brass, brassBright, darkBrass, iron, nickel, slate, felt, agate, leather, arc };
  }, [tx]);
}
type M = ReturnType<typeof useMaterials>;

/* ---------- geometry ---------- */
const lathe = (pts: [number, number][], seg = 48) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

function useGeometry() {
  return useMemo(() => {
    // the beam: a tapered arm with lozenge cut outs, extruded and bevelled
    const sh = new THREE.Shape();
    const half = (x: number) => 0.055 + 0.13 * Math.pow(1 - Math.abs(x) / 2.36, 1.5);
    const N = 40;
    for (let i = 0; i <= N; i++) { const x = -2.36 + (4.72 * i) / N; if (i === 0) sh.moveTo(x, half(x)); else sh.lineTo(x, half(x)); }
    for (let i = N; i >= 0; i--) { const x = -2.36 + (4.72 * i) / N; sh.lineTo(x, -half(x) * 0.8); }
    sh.closePath();
    [-1.75, -1.15, -0.6, 0.6, 1.15, 1.75].forEach((cx) => {
      const w = 0.22, hh = half(cx) * 0.48, hole = new THREE.Path();
      hole.moveTo(cx - w, 0); hole.lineTo(cx, hh); hole.lineTo(cx + w, 0); hole.lineTo(cx, -hh * 0.8); hole.closePath(); sh.holes.push(hole);
    });
    const beam = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.014, bevelSegments: 3, curveSegments: 6 });
    beam.translate(0, 0, -0.035);
    // the column, turned
    const column = lathe([[0, 0], [0.62, 0], [0.62, 0.05], [0.56, 0.09], [0.36, 0.14], [0.22, 0.24], [0.17, 0.34], [0.2, 0.38], [0.2, 0.42], [0.12, 0.48], [0.1, 0.6], [0.09, 2.6], [0.12, 2.66], [0.15, 2.7], [0.15, 2.76], [0.1, 2.8], [0, 2.82]]);
    // a pan: a shallow dish with a beaded rim
    const pan = lathe([[0, -0.12], [0.3, -0.115], [0.6, -0.08], [0.82, -0.02], [PAN_R, 0.04], [PAN_R + 0.03, 0.06], [PAN_R + 0.02, 0.085], [PAN_R - 0.02, 0.07], [0.8, 0.0], [0.58, -0.05], [0.3, -0.08], [0, -0.085]], 64);
    // the weights
    const cyl = (r: number, h: number) => lathe([[0, 0], [r, 0], [r + 0.012, 0.012], [r + 0.012, h * 0.62], [r, h * 0.64], [r * 0.45, h * 0.68], [r * 0.32, h * 0.72], [r * 0.32, h * 0.8], [r * 0.5, h * 0.86], [r * 0.5, h * 0.95], [r * 0.4, h], [0, h]], 40);
    const bell = (r: number, h: number) => lathe([[0, 0], [r, 0], [r + 0.01, 0.02], [r * 0.9, h * 0.25], [r * 0.62, h * 0.55], [r * 0.45, h * 0.7], [r * 0.3, h * 0.76], [r * 0.3, h * 0.84], [r * 0.48, h * 0.9], [r * 0.4, h], [0, h]], 40);
    const disc = (r: number, h: number) => lathe([[0, 0], [r - 0.02, 0], [r, 0.02], [r, h - 0.02], [r - 0.02, h], [r * 0.3, h], [r * 0.25, h * 0.7], [0, h * 0.7]], 40);
    // the doubt, cast from the brand mark
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${MARKS.italic.d}"/></svg>`;
    const data = new SVGLoader().parse(svg);
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const q = new THREE.ExtrudeGeometry(shapes, { depth: 120, bevelEnabled: true, bevelThickness: 22, bevelSize: 14, bevelSegments: 4, curveSegments: 10 });
    q.computeBoundingBox();
    const bb = q.boundingBox!, k = 1.32 / (bb.max.y - bb.min.y);
    q.translate(-(bb.min.x + bb.max.x) / 2, -bb.max.y, -60);
    q.scale(k, -k, -k);
    q.computeVertexNormals();
    // a chain link
    const link = new THREE.TorusGeometry(0.03, 0.0085, 6, 12); link.scale(1, 1.7, 1);
    return { beam, column, pan, cyl, bell, disc, q, link };
  }, []);
}
type G = ReturnType<typeof useGeometry>;

/* ---------- parts ---------- */
function Chains({ g, m }: { g: G; m: M }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = 15;
  const mats = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const top = new THREE.Vector3(0, -0.14, 0), Y = new THREE.Vector3(0, 1, 0);
    for (let c = 0; c < 3; c++) {
      const a = Math.PI / 2 + (c * Math.PI * 2) / 3;
      const end = new THREE.Vector3(Math.cos(a) * (PAN_R - 0.02), -LC + 0.08, Math.sin(a) * (PAN_R - 0.02));
      const d = end.clone().sub(top), len = d.length(); d.normalize();
      const q0 = new THREE.Quaternion().setFromUnitVectors(Y, d);
      for (let i = 0; i < n; i++) {
        const p = top.clone().addScaledVector(d, ((i + 0.5) / n) * len);
        const q = q0.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y, i % 2 ? Math.PI / 2 : 0));
        const s = len / n / 0.095;
        out.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(s, s, s)));
      }
    }
    return out;
  }, []);
  return <instancedMesh ref={(r) => { ref.current = r; if (r) { mats.forEach((mt, i) => r.setMatrixAt(i, mt)); r.instanceMatrix.needsUpdate = true; } }} args={[g.link, m.brass, mats.length]} castShadow />;
}

function Hanger({ side, g, m, onPan }: { side: 'L' | 'R'; g: G; m: M; onPan: (s: 'L' | 'R', e: { clientY: number; type: string }) => void }) {
  const ref = useRef<THREE.Group>(null);
  const i = side === 'L' ? 0 : 1;
  useFrame(() => {
    const gr = ref.current; if (!gr) return;
    const [hx, hy] = hook(side);
    gr.position.set(hx, hy, 0);
    gr.rotation.set(-S.ps[i], 0, S.ph[i]);
  });
  return (
    <group ref={ref}>
      <mesh material={m.brassBright} rotation-y={Math.PI / 2} position-y={-0.06}><torusGeometry args={[0.07, 0.016, 10, 24]} /></mesh>
      <mesh material={m.brass} position-y={-0.14}><sphereGeometry args={[0.04, 16, 12]} /></mesh>
      <Chains g={g} m={m} />
      <mesh geometry={g.pan} material={m.brass} position-y={-LC} castShadow receiveShadow
        onPointerDown={(e) => { e.stopPropagation(); onPan(side, { clientY: e.nativeEvent.clientY, type: e.nativeEvent.pointerType }); }}
        onPointerOver={() => { document.body.style.cursor = 'grab'; }} onPointerOut={() => { document.body.style.cursor = ''; }} />
    </group>
  );
}

function Weight({ w, g, m, yaw }: { w: W; g: G; m: M; yaw: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const gr = ref.current; if (!gr) return;
    const vis = w.side !== null || !!w.fly || (w.id === 'q' && S.qLift);
    gr.visible = vis && w.scale > 0.01;
    if (!gr.visible) return;
    gr.position.set(w.pos[0], w.pos[1], w.pos[2]);
    const hover = w.id === 'q' && S.qLift && !w.fly ? Math.sin(S.t * 1.4) * 0.06 : 0;
    gr.position.y += hover;
    gr.rotation.set(0, w.id === 'q' ? (S.qLift ? Math.sin(S.t * 0.6) * 0.5 : -0.25) : yaw, w.tilt + w.rot);
    gr.scale.setScalar(Math.max(0.001, w.scale));
  });
  const geo = (k: Kind) => {
    switch (k) {
      case 'q': return <mesh geometry={g.q} material={m.nickel} castShadow />;
      case 'cyl': return <mesh geometry={g.cyl(w.r, w.h)} material={m.brass} castShadow receiveShadow />;
      case 'bell': return <mesh geometry={g.bell(w.r, w.h)} material={m.brassBright} castShadow receiveShadow />;
      case 'iron': return (<group><mesh geometry={g.disc(w.r, w.h)} material={m.iron} castShadow receiveShadow /><mesh material={m.brassBright} position-y={w.h * 0.7}><cylinderGeometry args={[w.r * 0.24, w.r * 0.24, 0.02, 20]} /></mesh></group>);
      case 'coin': return (<group><mesh geometry={g.disc(w.r, w.h)} material={m.darkBrass} castShadow receiveShadow /><mesh material={m.brassBright} position-y={w.h * 0.7 + 0.005} rotation-x={-Math.PI / 2}><ringGeometry args={[w.r * 0.55, w.r * 0.7, 40]} /></mesh></group>);
      case 'box': return (
        <group>
          <RoundedBox args={[0.84, 0.3, 0.56]} radius={0.03} smoothness={3} position-y={0.15} material={m.leather} castShadow receiveShadow />
          <RoundedBox args={[0.86, 0.08, 0.58]} radius={0.02} smoothness={2} position-y={0.31} material={m.leather} castShadow />
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], j) => (<mesh key={j} material={m.brass} position={[sx * 0.41, 0.17, sz * 0.27]}><boxGeometry args={[0.07, 0.34, 0.07]} /></mesh>))}
          <mesh material={m.brassBright} position={[0, 0.25, 0.29]}><boxGeometry args={[0.14, 0.12, 0.02]} /></mesh>
          <mesh material={m.brassBright} position={[0, 0.36, 0]}><boxGeometry args={[0.3, 0.03, 0.06]} /></mesh>
        </group>);
    }
  };
  return <group ref={ref} visible={false}>{geo(w.kind)}</group>;
}

function Instrument({ onPan }: { onPan: (s: 'L' | 'R', e: { clientY: number; type: string }) => void }) {
  const g = useGeometry(), m = useMaterials();
  const beam = useRef<THREE.Group>(null);
  useFrame(() => {
    if (beam.current) beam.current.rotation.z = -S.th;
    m.arc.emissiveIntensity = S.glow * 0.9;
  });
  const yaws = useMemo(() => WEIGHTS.map((_, i) => (i * 1.7) % (Math.PI * 2)), []);
  return (
    <group>
      {/* plinth and column */}
      <RoundedBox args={[3.4, 0.3, 1.5]} radius={0.05} smoothness={3} position={[0, 0.15, 0]} material={m.slate} castShadow receiveShadow />
      <mesh material={m.brass} position={[0, 0.305, 0]} receiveShadow><boxGeometry args={[3.2, 0.012, 1.3]} /></mesh>
      {[-1.45, 1.45].map((x) => (<mesh key={x} material={m.darkBrass} position={[x, 0.33, 0.5]}><cylinderGeometry args={[0.07, 0.08, 0.05, 24]} /></mesh>))}
      <mesh geometry={g.column} material={m.brass} position-y={0.31} castShadow receiveShadow />
      {/* yoke and agate bearings */}
      <mesh material={m.brass} position={[0, PIV_Y - 0.38, 0]} castShadow><boxGeometry args={[0.24, 0.08, 0.8]} /></mesh>
      {[-0.32, 0.32].map((z) => (
        <group key={z}>
          <mesh material={m.brass} position={[0, PIV_Y - 0.2, z]} castShadow><boxGeometry args={[0.12, 0.32, 0.08]} /></mesh>
          <mesh material={m.agate} position={[0, PIV_Y - 0.03, z]}><boxGeometry args={[0.2, 0.03, 0.12]} /></mesh>
        </group>
      ))}
      {/* the arc */}
      <mesh material={m.arc} position={[0, PIV_Y, 0.33]} receiveShadow>
        <ringGeometry args={[1.72, 2.02, 64, 1, -Math.PI / 2 - 0.44, 0.88]} />
      </mesh>
      <mesh material={m.darkBrass} position={[0, PIV_Y - 1.75, 0.2]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.025, 0.025, 0.3, 10]} /></mesh>
      {/* the beam, pointer and knife edge, all on one pivot */}
      <group ref={beam} position={[0, PIV_Y, 0]}>
        <mesh geometry={g.beam} material={m.brass} castShadow receiveShadow />
        <mesh material={m.brassBright} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.2, 0.2, 0.14, 40]} /></mesh>
        <mesh material={m.darkBrass} rotation-x={Math.PI / 2} position-z={0.075}><cylinderGeometry args={[0.07, 0.07, 0.02, 24]} /></mesh>
        <mesh material={m.nickel} rotation-x={Math.PI / 2} rotation-y={Math.PI / 2} position-y={0.0}><cylinderGeometry args={[0.07, 0.07, 0.72, 3]} /></mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * LB, 0, 0]}>
            <mesh material={m.brassBright} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.12, 24]} /></mesh>
            <mesh material={m.nickel} rotation-x={Math.PI / 2} rotation-y={Math.PI / 2} position-y={0.02}><cylinderGeometry args={[0.04, 0.04, 0.2, 3]} /></mesh>
            <mesh material={m.brass} position={[s * 0.12, 0, 0]}><sphereGeometry args={[0.06, 20, 14]} /></mesh>
          </group>
        ))}
        {/* the pointer hangs from the pivot and reads the arc */}
        <group position-z={0.42}>
          <mesh material={m.brassBright} position-y={-1.0}><cylinderGeometry args={[0.028, 0.008, 2.0, 12]} /></mesh>
          <mesh material={m.darkBrass} position-y={-1.98} rotation-x={Math.PI / 2}><coneGeometry args={[0.03, 0.12, 4]} /></mesh>
          <mesh material={m.brass} position-y={-0.6}><sphereGeometry args={[0.05, 16, 12]} /></mesh>
        </group>
      </group>
      <Hanger side="L" g={g} m={m} onPan={onPan} />
      <Hanger side="R" g={g} m={m} onPan={onPan} />
      {WEIGHTS.map((w, i) => <Weight key={w.id} w={w} g={g} m={m} yaw={yaws[i]} />)}
    </group>
  );
}

function Lights() {
  const key = useRef<THREE.SpotLight>(null), rim = useRef<THREE.DirectionalLight>(null), glow = useRef<THREE.PointLight>(null);
  const cKey = useMemo(() => new THREE.Color(), []), warm = useMemo(() => new THREE.Color('#ffd7a1'), []), hot = useMemo(() => new THREE.Color('#ffc066'), []);
  const cRim = useMemo(() => new THREE.Color(), []), cool = useMemo(() => new THREE.Color('#8fb4ff'), []), gold = useMemo(() => new THREE.Color('#ffcf7a'), []);
  const tip = useRef(0);
  useFrame((_, dt) => {
    tip.current += ((S.tipped ? 1 : 0) - tip.current) * Math.min(1, dt * 2);
    const t = tip.current;
    if (key.current) { cKey.copy(warm).lerp(hot, t); key.current.color.copy(cKey); key.current.intensity = 90 + t * 40 + S.glow * 160; }
    if (rim.current) { cRim.copy(cool).lerp(gold, t); rim.current.color.copy(cRim); rim.current.intensity = 2.2 + t * 1.2; }
    if (glow.current) glow.current.intensity = S.glow * 6;
  });
  const phone = isPhone();
  return (
    <>
      <ambientLight intensity={0.08} />
      <spotLight ref={key} position={[-4.5, 8.5, 6]} angle={0.5} penumbra={0.8} intensity={90} decay={1.6} castShadow
        shadow-mapSize={phone ? [512, 512] : [1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02} target-position={[0, 2, 0]} />
      <directionalLight ref={rim} position={[5, 4, -6]} intensity={2.2} />
      <pointLight ref={glow} position={[0, PIV_Y - 1.8, 1]} intensity={0} distance={5} color="#ffb24a" />
    </>
  );
}

function Rig() {
  const { camera, size } = useThree();
  const cur = useRef({ x: 0, y: 0, k: 0 });
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((st, dt) => {
    const phone = size.width < 760;
    const aspect = size.width / size.height;
    const vh = window.innerHeight || 800;
    const k = phone ? 0 : Math.min(1, Math.max(0, scroll.y / (vh * 0.85)));
    const c = cur.current, e = 1 - Math.exp(-dt * 3);
    c.k += (k - c.k) * e;
    // how much of the world the frame must hold: the whole room on the first screen, closer in the sections
    const need = phone ? 6.2 : 7.4 - c.k * 0.9;
    const tanH = Math.tan(THREE.MathUtils.degToRad(13));
    const dist = Math.max((need * 0.95) / (2 * tanH), (need * 1.25) / (2 * tanH * aspect));
    const px = still ? 0 : st.pointer.x * 0.35, py = still ? 0 : st.pointer.y * 0.2;
    c.x += (px - c.x) * e; c.y += (py - c.y) * e;
    // in the reading sections the instrument moves to the right and the type takes the left
    const off = -c.k * Math.min(3.0, dist * tanH * aspect * 0.48);
    const ly = phone ? 2.35 : 1.95 + c.k * 0.4;
    camera.position.set(off + c.x - 0.6 * (1 - c.k), ly + 0.55 + c.y, dist);
    look.set(off - 0.2 * (1 - c.k), ly, 0);
    camera.lookAt(look);
  });
  return null;
}

export default function Scene({ onPan }: { onPan: (s: 'L' | 'R', e: { clientY: number; type: string }) => void }) {
  const phone = isPhone();
  return (
    <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, phone ? 1.4 : 1.6]} camera={{ fov: 26, position: [0, 2.9, 15], near: 1, far: 60 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={({ scene }) => { scene.background = new THREE.Color('#101214'); scene.fog = new THREE.Fog('#101214', 16, 34); }}>
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={4} color="#fff1d8" position={[-3, 6, 4]} rotation-x={Math.PI / 2.6} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#ffd29a" position={[0, 2, 7]} scale={[8, 1.4, 1]} />
        <Lightformer form="rect" intensity={2.6} color="#cfe0ff" position={[7, 3, -2]} rotation-y={-Math.PI / 2} scale={[1.6, 7, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffe0b0" position={[-7, 2, -2]} rotation-y={Math.PI / 2} scale={[1.2, 6, 1]} />
        <Lightformer form="ring" intensity={2.5} color="#fff4e0" position={[2, 5, 6]} scale={1.6} />
        <Lightformer form="rect" intensity={0.4} color="#3a2a18" position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[14, 14, 1]} />
      </Environment>
      <Lights />
      <Rig />
      <Instrument onPan={onPan} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#15191a" roughness={0.95} />
      </mesh>
      <ContactShadows position={[0, 0.002, 0]} scale={9} blur={2.4} opacity={0.75} far={0.8} frames={1} resolution={256} color="#000000" />
      {!phone && !still ? (
        <EffectComposer multisampling={0}>
          <DepthOfField target={[0, 2.4, 0]} focalLength={0.06} bokehScale={2.2} />
          <Bloom mipmapBlur luminanceThreshold={0.92} intensity={0.5} />
          <Vignette offset={0.3} darkness={0.7} />
        </EffectComposer>
      ) : (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={0.92} intensity={0.4} />
          <Vignette offset={0.3} darkness={0.6} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
