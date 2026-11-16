// The specimen's one object: the question mark of Bodoni Moda Black, extruded
// into black lacquer and stood on the bone page. It faces the pointer, takes a
// drag or a flick, and always springs back to face you, a little past and back.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { scroll } from '@/lib/scroll';
import { still, isPhone } from '@/lib/utils';
import { roughnessMap, shapes } from './geo';

export const H = 3.6;
const DEPTH = 0.62;
const TAU = Math.PI * 2;

/** Shared between the DOM and the scene, never React state. */
export const turn = { px: 0, py: 0, drag: false, dx: 0, kick: 0, inView: true };

function Glyph({ guides }: { guides: React.RefObject<(HTMLElement | null)[]> }) {
  const group = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const geo = useMemo(() => {
    const s = shapes(H);
    const g = new THREE.ExtrudeGeometry(s.list, {
      depth: DEPTH, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.035, bevelSegments: 6, curveSegments: 40,
    });
    g.translate(0, 0, -DEPTH / 2);
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: '#060606', roughness: 0.3, envMapIntensity: 1.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06,
      roughnessMap: roughnessMap(), reflectivity: 0.5, specularIntensity: 0.6,
    });
    return m;
  }, []);
  useEffect(() => () => { geo.dispose(); mat.roughnessMap?.dispose(); mat.dispose(); }, [geo, mat]);

  // The motion: one angle on a spring, an under-damped one so it lands with a small overshoot.
  const s = useRef({ ang: still ? 0 : -2.6, vel: 0, rx: 0, lift: still ? 0 : -0.5, born: 0 });
  const v3 = useMemo(() => new THREE.Vector3(), []);

  useFrame((_st, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30);
    const S = s.current;
    const hp = Math.min(1, scroll.y / Math.max(1, window.innerHeight));
    const base = turn.px * 0.55 + hp * 1.1;
    if (turn.kick) { S.vel += turn.kick; turn.kick = 0; }
    if (turn.drag) {
      const step = turn.dx * 0.011;
      turn.dx = 0;
      S.ang += step;
      S.vel = S.vel * 0.6 + (step / Math.max(dt, 1 / 120)) * 0.4;
    } else {
      // The nearest whole turn that faces you: a flick keeps going, then settles face on.
      const tgt = base + TAU * Math.round((S.ang - base) / TAU);
      const acc = 22 * (tgt - S.ang) - 4.2 * S.vel;
      S.vel += acc * dt;
      S.ang += S.vel * dt;
    }
    S.rx += ((-turn.py * 0.16) - S.rx) * (1 - Math.exp(-5 * dt));
    S.lift += (hp * 0.5 - S.lift) * (1 - Math.exp(-4 * dt));
    if (group.current) {
      group.current.rotation.set(S.rx, S.ang, 0);
      group.current.position.y = S.lift;
    }
    // Keep the specimen's guide lines on the glyph's real cap height and baseline.
    const g = guides.current;
    if (g) {
      const at = (y: number) => { v3.set(0, y + S.lift, 0).project(camera); return (1 - v3.y) / 2 * size.height; };
      const top = at(H / 2), bot = at(-H / 2), mid = at(-H / 2 + H * 0.31);
      if (g[0]) g[0].style.transform = `translate3d(0,${top.toFixed(1)}px,0)`;
      if (g[1]) g[1].style.transform = `translate3d(0,${mid.toFixed(1)}px,0)`;
      if (g[2]) g[2].style.transform = `translate3d(0,${bot.toFixed(1)}px,0)`;
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
    </group>
  );
}

function Rig() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const narrow = size.width / size.height < 0.9;
    cam.position.set(0, 1.0, narrow ? 17 : 13.4);
    cam.lookAt(0, 0.05, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

export default function Mark({ guides }: { guides: React.RefObject<(HTMLElement | null)[]> }) {
  const low = isPhone();
  return (
    <Canvas
      frameloop={still ? 'demand' : 'always'}
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, low ? 1.5 : 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 18, near: 0.5, far: 80, position: [0, 1.1, 16.5] }}
      style={{ touchAction: 'pan-y' }}
    >
      <Rig />
      <hemisphereLight args={['#fffaf0', '#d9d2c3', 0.12]} />
      <directionalLight
        position={[-4, 10, 5]} intensity={2.2} color="#fff8ec" castShadow
        shadow-mapSize={[low ? 1024 : 2048, low ? 1024 : 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}
        shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-camera-near={1} shadow-camera-far={30}
      />
      <Environment resolution={256} frames={1}>
        {/* A long softbox overhead, a tall strip each side, a low card in front: the lacquer reads by these. */}
        <Lightformer form="rect" intensity={3} color="#fffaf0" position={[0, 8, 2]} rotation-x={Math.PI / 2} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={5} color="#fff6ea" position={[-7, 2, 4]} rotation-y={Math.PI / 2.6} scale={[1.6, 10, 1]} />
        <Lightformer form="rect" intensity={3.2} color="#f2efe8" position={[7, 2, -1]} rotation-y={-Math.PI / 2.2} scale={[1.2, 10, 1]} />
        <Lightformer form="rect" intensity={0.4} color="#f4f1ea" position={[2, 6, 9]} rotation-x={-0.5} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#e9e4d8" position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} />
      </Environment>
      <Glyph guides={guides} />
      <ContactShadows position={[0, -H / 2, 0]} scale={9} blur={2.2} far={3.2} opacity={0.62} resolution={low ? 256 : 512} color="#1d1810" frames={still ? 1 : Infinity} />
    </Canvas>
  );
}
