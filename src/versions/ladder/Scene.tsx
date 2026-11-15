// Version 6's stage: one ladder in open sky. You climb from night, through a
// bank of cloud, into the sunrise. Scroll is altitude.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Cloud, Clouds } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';
import { clamp, damp, lerp, smooth, still } from '@/lib/utils';

export const RUNGS = 200, STEP = 0.62, H = RUNGS * STEP;
export const CLIMB_END = 0.92;           // share of the page spent climbing; the rest is the ladder going
const CLOUD_Y = H * 0.7, CLOUD_T = 9;    // where the cloud bank sits and how thick it is
/** What the page needs to know about the climb, written here every frame. */
export const lstage = { reveal: 0, at: 0, climb: 0, inCloud: 0, day: 0 };

const SKY = /* glsl */ `
precision highp float; varying vec3 vDir; uniform float uDay, uShow; uniform vec3 uSun;
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 nZen = lin(vec3(0.012, 0.014, 0.035)), nHor = lin(vec3(0.03, 0.04, 0.12));
  vec3 dZen = lin(vec3(0.62, 0.66, 0.9)), dHor = lin(vec3(1.0, 0.76, 0.56));
  float t = smoothstep(0.0, 1.0, uDay);
  vec3 zen = mix(nZen, dZen, t), hor = mix(nHor, dHor, smoothstep(0.15, 1.0, uDay));
  vec3 col = mix(hor, zen, pow(smoothstep(-0.08, 0.75, h), 0.7));
  // A band of first light low in the east, then the sun itself.
  float s = max(dot(d, normalize(uSun)), 0.0);
  col += lin(vec3(1.0, 0.45, 0.2)) * pow(s, 6.0) * 0.6 * smoothstep(0.25, 0.9, uDay);
  col += lin(vec3(1.0, 0.9, 0.75)) * (pow(s, 900.0) * 30.0 + pow(s, 60.0) * 1.2) * smoothstep(0.55, 1.0, uDay);
  gl_FragColor = vec4(col * uShow, 1.0);
}`;

function Sky() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uDay: { value: 0 }, uShow: { value: 0 }, uSun: { value: new THREE.Vector3(0.35, 0.05, -1) } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: SKY,
  }), []);
  useFrame(() => {
    material.uniforms.uDay.value = lstage.day;
    material.uniforms.uShow.value = lstage.reveal;
    material.uniforms.uSun.value.set(0.35, lerp(-0.12, 0.09, lstage.day), -1);
  });
  return <mesh frustumCulled={false} renderOrder={-10} material={material}><sphereGeometry args={[1, 32, 16]} /></mesh>;
}

function Stars() {
  const { geometry, material } = useMemo(() => {
    let s = 5; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const N = 1400, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = rnd() * Math.PI * 2, r = 30 + rnd() * 60;
      pos.set([Math.cos(a) * r, rnd() * (H + 80) - 20, Math.sin(a) * r], i * 3);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const material = new THREE.PointsMaterial({ color: '#f1ece1', size: 1.6, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false });
    return { geometry, material };
  }, []);
  const dpr = useThree((s) => s.viewport.dpr);
  useFrame(() => { material.size = 1.6 * dpr; material.opacity = (1 - smooth(clamp(lstage.day / 0.45))) * lstage.reveal * 3; });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

function LadderMesh() {
  const pivot = useRef<THREE.Group>(null);
  const wood = useMemo(() => {
    // A little grain, so the rails are not flat plastic.
    const c = document.createElement('canvas'); c.width = 64; c.height = 512;
    const g = c.getContext('2d')!; g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, 64, 512);
    let s = 9; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 420; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? 0 : 255},${rnd() < 0.5 ? 0 : 255},${rnd() < 0.5 ? 0 : 255},${0.04 + rnd() * 0.08})`; g.fillRect(rnd() * 64, rnd() * 512, 1 + rnd() * 2, 20 + rnd() * 120); }
    const bump = new THREE.CanvasTexture(c); bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.set(1, 40);
    return new THREE.MeshStandardMaterial({ color: '#e6dfd0', roughness: 0.78, metalness: 0, bumpMap: bump, bumpScale: 1.4 });
  }, []);
  const rungs = useMemo(() => {
    const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.046, 0.046, 1.9, 12), wood, RUNGS);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < RUNGS; i++) mesh.setMatrixAt(i, m.compose(new THREE.Vector3(0, (i + 0.5) * STEP, 0), q, one));
    return mesh;
  }, [wood]);
  const night = useMemo(() => new THREE.Color('#e6dfd0'), []), dawn = useMemo(() => new THREE.Color('#3a2620'), []);
  useFrame(() => {
    const gone = smooth(clamp((lstage.at - CLIMB_END) / (1 - CLIMB_END)));
    if (pivot.current) { pivot.current.rotation.x = -gone * 1.05; pivot.current.rotation.z = gone * 0.4; pivot.current.position.y = H - gone * 30; }
    wood.color.copy(night).lerp(dawn, smooth(clamp((lstage.day - 0.5) / 0.5)));
  });
  return (
    // The ladder pivots on its top when it goes, so it swings out from under you.
    <group ref={pivot} position-y={H}>
      <group position-y={-H}>
        {[-0.95, 0.95].map((x) => <mesh key={x} position={[x, H / 2, 0]} material={wood}><boxGeometry args={[0.11, H + 1.2, 0.16]} /></mesh>)}
        <primitive object={rungs} />
      </group>
    </group>
  );
}

function Rig() {
  const fog = useRef<THREE.FogExp2>(null);
  const first = useRef(true);
  const cNight = useMemo(() => new THREE.Color('#05060c'), []), cCloud = useMemo(() => new THREE.Color('#d9d2d6'), []), cDay = useMemo(() => new THREE.Color('#f0c9a6'), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera, w = state.size.width, h = state.size.height, phone = w <= 760;
    lstage.at = damp(lstage.at, scroll.p, still || first.current ? 1000 : 4, dt); first.current = false;
    const climb = clamp(lstage.at / CLIMB_END); lstage.climb = climb;
    const y = lerp(1.6, H + 2.6, climb);
    // Day follows altitude: nothing until the cloud, everything above it.
    lstage.day = smooth(clamp((y - (CLOUD_Y - 16)) / 34));
    lstage.inCloud = Math.exp(-Math.pow((y - CLOUD_Y) / (CLOUD_T * 0.75), 2));
    const top = smooth(clamp((climb - 0.88) / 0.12));
    const sway = still ? 0 : Math.sin(climb * 9) * 0.9 * (1 - top);
    cam.position.set(sway * (phone ? 0.4 : 1), y, (phone ? 8.2 : 4.6) + (1 - lstage.reveal) * 5);
    // Looking up the rails all the way; at the top the eye comes down to the horizon and the sun.
    look.set(lerp(0, 2.2, top), y + lerp(7, 0.4, top), lerp(0, -30, top));
    cam.lookAt(look);
    cam.setViewOffset(w, h, -(phone ? 0.47 : 0.25) * w, 0, w, h);
    if (fog.current) {
      fog.current.color.copy(cNight).lerp(cDay, lstage.day).lerp(cCloud, lstage.inCloud * 0.85).multiplyScalar(lstage.reveal);
      fog.current.density = 0.02 + lstage.inCloud * 0.16;
    }
  });
  return <fogExp2 ref={fog} attach="fog" args={['#05060c', 0.02]} />;
}

export default function LadderScene() {
  const phone = typeof window !== 'undefined' && window.innerWidth <= 760;
  return (
    <Canvas dpr={[1, 1.6]} camera={{ fov: 42, near: 0.1, far: 600, position: [0, 1.6, 9] }} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <Sky />
      <Stars />
      <LadderMesh />
      <Clouds material={THREE.MeshLambertMaterial} texture={`${import.meta.env.BASE_URL}tex/cloud.png`} limit={phone ? 120 : 260} frustumCulled={false}>
        <Cloud seed={3} segments={phone ? 30 : 70} bounds={[46, CLOUD_T * 0.5, 46]} volume={26} position={[0, CLOUD_Y, -18]} color="#f4ece8" opacity={0.75} fade={60} speed={still ? 0 : 0.12} growth={5} />
        <Cloud seed={11} segments={phone ? 20 : 50} bounds={[60, CLOUD_T * 0.4, 30]} volume={30} position={[10, CLOUD_Y - 3, -60]} color="#ffd9c2" opacity={0.6} fade={90} speed={still ? 0 : 0.08} growth={6} />
        <Cloud seed={7} segments={phone ? 14 : 34} bounds={[10, CLOUD_T * 0.5, 8]} volume={9} position={[0, CLOUD_Y + 1, 2]} color="#ffffff" opacity={0.5} fade={12} speed={still ? 0 : 0.2} growth={3} />
      </Clouds>
      <hemisphereLight args={['#ffffff', '#1a1a2e', 1.1]} />
      <directionalLight position={[3, 6, 5]} intensity={1.5} />
      <directionalLight position={[4, 1, -10]} intensity={2.2} color="#ffb27a" />
      <Rig />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={1.0} intensity={0.7} />
        <Vignette offset={0.25} darkness={0.55} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
