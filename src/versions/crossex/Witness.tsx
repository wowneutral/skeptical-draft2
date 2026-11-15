// The witness on the stand: the brand's question mark as a lacquered solid. Every question
// you ask knocks it round; the more you have asked, the harder it turns. Drag to turn it yourself.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import MARKS from '@/lib/marks.json';
import { isPhone, still } from '@/lib/utils';

import { stand } from './stand';

function Mark() {
  const geo = useMemo(() => {
    const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${MARKS.roman.d}"/></svg>`);
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const g = new THREE.ExtrudeGeometry(shapes, { depth: 260, bevelEnabled: true, bevelThickness: 40, bevelSize: 26, bevelSegments: 6, curveSegments: 22 });
    g.rotateX(Math.PI);
    g.center();
    const s = 2.7 / MARKS.roman.h;
    g.scale(s, s, s);
    g.computeVertexNormals();
    return g;
  }, []);
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    dt = Math.min(dt, 0.05);
    t.current += dt;
    if (!stand.drag) {
      if (stand.kick > 0) { stand.v += stand.kick; stand.kick = 0; }
      const rest = Math.round(stand.angle / (Math.PI * 2)) * Math.PI * 2 + (still ? -0.5 : Math.sin(t.current * 0.5) * 0.5 - 0.3);
      const fast = Math.abs(stand.v) > 2.5;
      stand.v *= Math.exp(-(fast ? 0.8 : 2.4) * dt);
      if (!fast) stand.v += (rest - stand.angle) * 8 * dt;
      stand.angle += stand.v * dt;
    }
    m.rotation.y = stand.angle;
    m.rotation.z = still ? -0.06 : -0.06 + Math.sin(t.current * 0.8) * 0.03 * (1 + stand.p * 3);
    m.position.y = 0.15 + (still ? 0 : Math.sin(t.current * 1.2) * 0.05);
  });
  return (
    <mesh ref={ref} geometry={geo} castShadow>
      <meshPhysicalMaterial color="#ff4b1f" roughness={0.26} metalness={0.05} clearcoat={1} clearcoatRoughness={0.12} sheen={0.3} sheenColor="#ffd2b8" />
    </mesh>
  );
}

export default function Witness() {
  const phone = useMemo(isPhone, []);
  const last = useRef<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  // Only draw while the stand is on screen.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: '120px' });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);
  return (
    <div className="w-box" ref={box}>
    <Canvas
      frameloop={on && !still ? 'always' : 'demand'}
      className="w-canvas"
      dpr={[1, phone ? 1.4 : 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ fov: 22, position: [0, 0.2, 9], near: 0.1, far: 50 }}
      onPointerDown={(e) => { stand.drag = true; last.current = e.clientX; }}
      onPointerMove={(e) => { if (!stand.drag || last.current === null) return; const dx = e.clientX - last.current; last.current = e.clientX; stand.angle += dx * 0.012; stand.v = dx * 0.6; }}
      onPointerUp={() => { stand.drag = false; last.current = null; }}
      onPointerLeave={() => { stand.drag = false; last.current = null; }}
    >
      <ambientLight intensity={0.15} />
      <directionalLight position={[-3, 4, 5]} intensity={2.2} color="#fff4e6" />
      <directionalLight position={[4, 1, -4]} intensity={3} color="#f4f1ea" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={4} color="#fff1e0" position={[-3, 3, 4]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={2.5} color="#f4f1ea" position={[4, 0, -2]} rotation-y={-Math.PI / 2} scale={[1, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ff8a5c" position={[0, -4, 2]} rotation-x={Math.PI / 2} scale={[6, 3, 1]} />
      </Environment>
      <Mark />
      {!phone && <ContactShadows position={[0, -1.45, 0]} opacity={0.7} scale={5} blur={2.6} far={2.5} color="#000000" frames={still ? 1 : 40} />}
    </Canvas>
    </div>
  );
}
