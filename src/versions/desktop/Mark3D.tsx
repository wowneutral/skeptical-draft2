// question.mark: the brand's Bodoni question mark as a solid object, rendered
// the way this machine draws everything, in one-bit dither with one highlight
// colour. Drag it to spin it; let go and it keeps turning, then settles.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import MARKS from '@/lib/marks.json';
import { still } from '@/lib/utils';

export const spin = { v: 0.0, drag: false, angle: 0.3, tilt: 0, kick: 0 };

const vert = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec3 vW;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    vW = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * mv;
  }`;

// Ordered dither on chunky pixels: ink, highlighter, paper. What you write is what you see.
const frag = /* glsl */ `
  uniform float uPx; uniform vec3 uInk; uniform vec3 uHi; uniform vec3 uPaper; uniform vec3 uL;
  varying vec3 vN; varying vec3 vV; varying vec3 vW;
  float bayer(vec2 p) {
    vec2 q = mod(floor(p), 4.0);
    int i = int(q.x) + int(q.y) * 4;
    float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    float v = 0.0;
    for (int k = 0; k < 16; k++) if (k == i) v = m[k];
    return (v + 0.5) / 16.0;
  }
  void main() {
    vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(vV);
    vec3 l = normalize(uL);
    float d = max(dot(n, l), 0.0);
    float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    vec3 h = normalize(l + v);
    float sp = pow(max(dot(n, h), 0.0), 40.0);
    float i = clamp(0.12 + d * 0.78 + rim * 0.25 + sp * 0.9, 0.0, 1.0);
    float t = bayer(gl_FragCoord.xy / uPx);
    vec3 c;
    if (i < 0.5) c = (i * 2.0 > t) ? uHi : uInk;
    else c = ((i - 0.5) * 2.0 > t) ? uPaper : uHi;
    gl_FragColor = vec4(c, 1.0);
  }`;

const shadowFrag = /* glsl */ `
  uniform float uPx; uniform vec3 uInk; uniform float uK;
  varying vec2 vUv;
  float bayer(vec2 p) {
    vec2 q = mod(floor(p), 4.0);
    int i = int(q.x) + int(q.y) * 4;
    float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    float v = 0.0;
    for (int k = 0; k < 16; k++) if (k == i) v = m[k];
    return (v + 0.5) / 16.0;
  }
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.1, r) * uK;
    if (a < bayer(gl_FragCoord.xy / uPx)) discard;
    gl_FragColor = vec4(uInk, 1.0);
  }`;

const lin = (h: string) => new THREE.Color(h);

function useMarkGeometry() {
  return useMemo(() => {
    const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${MARKS.italic.d}"/></svg>`);
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const g = new THREE.ExtrudeGeometry(shapes, { depth: 220, bevelEnabled: true, bevelThickness: 34, bevelSize: 22, bevelSegments: 4, curveSegments: 18 });
    g.rotateX(Math.PI);
    g.center();
    const s = 2.6 / MARKS.italic.h;
    g.scale(s, s, s);
    g.computeVertexNormals();
    return g;
  }, []);
}

function Mark({ px }: { px: number }) {
  const geo = useMarkGeometry();
  const ref = useRef<THREE.Mesh>(null);
  const sh = useRef<THREE.Mesh>(null);
  const { gl } = useThree();
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag,
    uniforms: { uPx: { value: px * gl.getPixelRatio() }, uInk: { value: lin('#15171d') }, uHi: { value: lin('#ffd84a') }, uPaper: { value: lin('#f3f1ea') }, uL: { value: new THREE.Vector3(-0.6, 0.8, 0.9) } },
  }), [px, gl]);
  const smat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: shadowFrag, transparent: false,
    uniforms: { uPx: { value: px * gl.getPixelRatio() }, uInk: { value: lin('#15171d') }, uK: { value: 0.7 } },
  }), [px, gl]);
  const t0 = useRef(0);
  useFrame((st, dt) => {
    const m = ref.current; if (!m) return;
    dt = Math.min(dt, 0.05);
    t0.current += dt;
    if (!spin.drag) {
      // Coast with friction, then a spring brings the face back round to the front,
      // where it sways a little as if it were hanging on something.
      const front = Math.round(spin.angle / (Math.PI * 2)) * Math.PI * 2 + (still ? 0.35 : Math.sin(t0.current * 0.6) * 0.45 + 0.2);
      const fast = Math.abs(spin.v) > 2.2;
      spin.v *= Math.exp(-(fast ? 0.9 : 2.6) * dt);
      if (!fast) spin.v += (front - spin.angle) * 9 * dt;
      spin.angle += spin.v * dt;
    }
    spin.kick *= Math.exp(-4 * dt);
    const bob = still ? 0 : Math.sin(t0.current * 1.3) * 0.06;
    m.rotation.y = spin.angle;
    m.rotation.x = spin.tilt * 0.4 + Math.sin(t0.current * 0.7) * 0.05;
    m.rotation.z = -0.08 + spin.kick * 0.2;
    m.position.y = 0.12 + bob + spin.kick * 0.3;
    if (sh.current) {
      const k = 1 - (bob + spin.kick * 0.3) * 1.2;
      sh.current.scale.set(1.6 * k, 0.5 * k, 1);
    }
    st.invalidate();
  });
  return (
    <group>
      <mesh ref={ref} geometry={geo} material={mat} />
      <mesh ref={sh} material={smat} position={[0.05, -1.45, -0.2]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}

export default function Mark3D({ px = 3 }: { px?: number }) {
  return (
    <Canvas
      className="m3-canvas"
      dpr={[1, 1.6]}
      flat
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      camera={{ fov: 20, position: [0, 0.1, 8.6], near: 0.1, far: 50 }}
    >
      <Mark px={px} />
    </Canvas>
  );
}

export function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
