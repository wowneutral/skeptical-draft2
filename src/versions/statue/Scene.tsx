// Version 2's stage: the prompt's bronze horse in a dark gallery. One light
// from above, a floor that reflects it, dust in the beam. Everything is
// rendered in colour and then drained to black and off-white in post.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, MeshReflectorMaterial, Sparkles, SpotLight } from '@react-three/drei';
import { Bloom, EffectComposer, HueSaturation, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { still } from '@/lib/utils';
import { OrbitRig } from '@/components/three/OrbitRig';
import { stage } from '@/versions/orbit/stage';

const LOCAL = '/models/bronze_horse.glb';
const REMOTE = 'https://api.getlayers.ai/storage/v1/object/public/public/assets/laocoon-59f84455c6/bronze_horse.glb';
const FLOOR = -1.55, HEIGHT = 3.1;

const timeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/** The prompt's own model: a copy in the project if there is one, then its address, then a stand-in. */
async function loadStatue(): Promise<THREE.Object3D> {
  const gltf = new GLTFLoader();
  try {
    const probe = await fetch(LOCAL, { method: 'HEAD' });
    if (probe.ok && !/html/.test(probe.headers.get('content-type') ?? '')) return (await gltf.loadAsync(LOCAL)).scene;
  } catch { /* fall through */ }
  try { return (await timeout(gltf.loadAsync(REMOTE), 15000)).scene; } catch { /* fall through */ }
  const geo = await new PLYLoader().loadAsync('/models/lucy.ply');
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: '#cfcfc9', metalness: 1, roughness: 0.32 }));
}

function Statue() {
  const [object, setObject] = useState<THREE.Object3D | null>(null);
  useEffect(() => {
    let alive = true;
    loadStatue().then((o) => {
      if (!alive) return;
      o.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true; mesh.receiveShadow = true;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.isMeshStandardMaterial) { mat.metalness = Math.max(mat.metalness, 0.85); mat.roughness = Math.min(mat.roughness, 0.42); mat.envMapIntensity = 1; }
      });
      // Stand it on the floor, centred, at a fixed height whatever its own units are.
      const box = new THREE.Box3().setFromObject(o), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      const k = Math.min(HEIGHT / size.y, 3.9 / Math.max(size.x, size.z));
      const wrap = new THREE.Group();
      o.position.set(-c.x, -box.min.y, -c.z);
      wrap.add(o); wrap.scale.setScalar(k); wrap.position.y = FLOOR;
      setObject(wrap);
    });
    return () => { alive = false; };
  }, []);
  return object ? <primitive object={object} /> : null;
}

function Lights() {
  const key = useRef<THREE.SpotLight>(null);
  const { scene } = useThree();
  useFrame(() => {
    // The light comes up when the loader leaves.
    if (key.current) key.current.intensity = 300 * stage.reveal;
    scene.environmentIntensity = 0.06 + 0.5 * stage.reveal;
  });
  return (
    <>
      <SpotLight ref={key} position={[1.2, 6.2, 2.2]} angle={0.42} penumbra={0.95} distance={9.5} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0002}
        volumetric attenuation={6} anglePower={6} opacity={0.11} radiusTop={0.12} radiusBottom={2.3} color="#fff6e8" />
      <directionalLight position={[-4, 2.5, -5]} intensity={1.6} color="#dfe6ff" />
    </>
  );
}

export default function StatueScene() {
  const phone = typeof window !== 'undefined' && window.innerWidth <= 820;
  const floor = useMemo(() => (phone ? 512 : 1024), [phone]);
  return (
    <Canvas shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.6]} camera={{ fov: 32, near: 0.1, far: 80, position: [3.4, 0.6, 6] }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
      <color attach="background" args={['#050505']} />
      <fog attach="fog" args={['#050505', 9, 24]} />
      <Statue />
      <mesh rotation-x={-Math.PI / 2} position-y={FLOOR} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <MeshReflectorMaterial blur={[420, 120]} resolution={floor} mixBlur={1} mixStrength={14} mixContrast={1} roughness={0.9} depthScale={1.1} minDepthThreshold={0.4} maxDepthThreshold={1.3} color="#0b0b0b" metalness={0.55} mirror={0.6} />
      </mesh>
      <Sparkles count={110} scale={[4.5, 5.5, 4.5]} position={[0, 0.9, 0]} size={1.7} speed={still ? 0 : 0.22} opacity={0.45} color="#f0f0ec" noise={0.6} />
      <Lights />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#070707']} />
        <Lightformer form="rect" intensity={5} position={[0, 6, 0]} scale={[7, 7, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={2} position={[-6, 1, 1]} scale={[1.5, 8, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.5} position={[6, 1, -3]} scale={[1.5, 8, 1]} rotation-y={-Math.PI / 2} />
      </Environment>
      <OrbitRig radius={7.2} phoneRadius={11.5} height={0.5} lookY={-0.05} bob={0.2} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.45} />
        <HueSaturation saturation={-1} />
        <Vignette offset={0.22} darkness={0.8} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
