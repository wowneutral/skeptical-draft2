// The orrery: a binary star, eight worlds, two comets, a dark ring of seven
// and one empty orbit. Brass instrument on a table, or the sky itself.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { createNoise3D } from 'simplex-noise';
import { scroll } from '@/lib/scroll';
import { clamp, damp, isPhone, lerp, smooth, still } from '@/lib/utils';
import { K, NINTH, RING, stage, WORLDS } from './stage';

const POS: Record<string, THREE.Vector3> = {};
const P = (id: string) => (POS[id] ??= new THREE.Vector3());
const RAD: Record<string, number> = {};

const STAR_A = new THREE.Color('#ffc477');
const STAR_B = new THREE.Color('#b9d2ff');
const BRASS = new THREE.Color('#d1a65a');
const SKYLINE = new THREE.Color('#8ea2cc');

/** Solve Kepler's equation and place a body on its ellipse. */
function kepler(a: number, e: number, M: number, w: number, inc: number, node: number, out: THREE.Vector3) {
  let E = M;
  for (let i = 0; i < 5; i++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w);
  const xr = x * cw - y * sw, zr = x * sw + y * cw;
  // tilt the plane a touch about a node line
  const cn = Math.cos(node), sn = Math.sin(node);
  const u = xr * cn + zr * sn, v = -xr * sn + zr * cn;
  out.set(u * cn - v * Math.cos(inc) * sn, v * Math.sin(inc), u * sn + v * Math.cos(inc) * cn);
  return out;
}

const NOISE = /* glsl */ `
float hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z); }
float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=0.5; } return v; }
`;

const VERT = /* glsl */ `
varying vec3 vN; varying vec3 vW; varying vec3 vO;
void main(){ vO = position; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }
`;

const LIGHT_U = () => ({ uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uCA: { value: STAR_A.clone() }, uCB: { value: STAR_B.clone() } });

const PLANET_FRAG = /* glsl */ `
uniform vec3 uA, uB, uCA, uCB, c1, c2, atm; uniform float kind, seed, time;
varying vec3 vN; varying vec3 vW; varying vec3 vO;
${NOISE}
void main(){
  vec3 p = normalize(vO); vec3 s = vec3(seed);
  vec3 col;
  if (kind < 0.5) {
    float n = fbm(p*3.0+s); col = mix(c2, c1, smoothstep(0.32, 0.72, n));
    float cr = noise(p*11.0+s); col *= 0.78 + 0.35*smoothstep(0.2,0.8,cr);
  } else if (kind < 1.5) {
    float w = fbm(p*vec3(2.0,7.0,2.0)+s);
    float b = sin((p.y + w*0.18)*26.0)*0.5+0.5; float b2 = sin(p.y*7.0 + w*3.0)*0.5+0.5;
    col = mix(c2, c1, b*0.55 + b2*0.45);
    float spot = smoothstep(0.16, 0.0, length(vec2(atan(p.z,p.x)*0.5 - 0.6, (p.y+0.28)*1.6)));
    col = mix(col, c2*0.8, spot*0.8);
  } else if (kind < 2.5) {
    float land = fbm(p*2.4+s);
    col = land > 0.53 ? mix(vec3(0.34,0.33,0.2), vec3(0.55,0.45,0.3), smoothstep(0.53,0.7,land)) : c1*(0.75+0.4*land);
    float cl = smoothstep(0.5, 0.78, fbm(p*4.0+vec3(time*0.03,0.0,0.0)+s*2.0));
    col = mix(col, c2, cl*0.9);
    col = mix(col, c2, smoothstep(0.82,0.95,abs(p.y)));
  } else {
    float n = fbm(p*4.0+s);
    col = mix(c2, c1, smoothstep(0.2, 0.85, n*0.75 + abs(p.y)*0.45));
    col = mix(col, vec3(0.93,0.96,1.0), smoothstep(0.78, 0.92, abs(p.y)));
  }
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  vec3 L1 = normalize(uA - vW), L2 = normalize(uB - vW);
  float d1 = max(dot(N,L1),0.0), d2 = max(dot(N,L2),0.0);
  vec3 lit = col * (uCA*d1*1.3 + uCB*d2*0.85 + vec3(0.02,0.025,0.04));
  float fr = pow(1.0 - max(dot(N,V),0.0), 3.0);
  float day = clamp(max(dot(N,L1), dot(N,L2)) + 0.35, 0.0, 1.0);
  lit += atm * fr * day * 0.85;
  if (kind > 1.5 && kind < 2.5) { vec3 H = normalize(L1+V); lit += uCA * pow(max(dot(N,H),0.0), 60.0) * 0.35 * step(fbm(p*2.4+s), 0.53); }
  gl_FragColor = vec4(lit, 1.0);
}`;

const SHELL_FRAG = /* glsl */ `
uniform vec3 uA, uB, atm; varying vec3 vN; varying vec3 vW; varying vec3 vO;
void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  float f = pow(1.0 - abs(dot(N,V)), 5.0);
  float day = clamp(max(dot(N, normalize(uA - vW)), dot(N, normalize(uB - vW))) + 0.45, 0.0, 1.0);
  gl_FragColor = vec4(atm * f * day * 1.1, 1.0); }`;

const RING_FRAG = /* glsl */ `
uniform vec3 c1, c2, uA, uCA; uniform float r0, r1, seed;
varying vec3 vN; varying vec3 vW; varying vec3 vO;
${NOISE}
void main(){ float r = (length(vO.xy) - r0) / (r1 - r0);
  float b = noise(vec3(r*38.0, seed, 0.0))*0.6 + noise(vec3(r*9.0, seed, 3.0))*0.4;
  float a = smoothstep(0.0,0.06,r) * smoothstep(1.0,0.9,r) * (0.25 + 0.7*b) * (1.0 - 0.75*smoothstep(0.55,0.6,r)*smoothstep(0.66,0.6,r));
  vec3 col = mix(c2, c1, b) * (0.35 + uCA*0.75);
  gl_FragColor = vec4(col * a, a * 0.9); }`;

const STAR_FRAG = /* glsl */ `
uniform vec3 col; uniform float time;
varying vec3 vN; varying vec3 vW; varying vec3 vO;
${NOISE}
void main(){ vec3 p = normalize(vO); vec3 V = normalize(cameraPosition - vW);
  float mu = max(dot(normalize(vN), V), 0.0);
  float g = fbm(p*9.0 + vec3(0.0, time*0.08, time*0.05));
  vec3 c = col * (0.5 + 0.55*pow(mu, 0.45)) * (0.8 + 0.4*g);
  c = mix(c, vec3(1.0, 0.98, 0.94), 0.45*pow(mu, 2.0));
  gl_FragColor = vec4(c, 1.0); }`;

const DARK_FRAG = /* glsl */ `
uniform float hl; varying vec3 vN; varying vec3 vW; varying vec3 vO;
void main(){ vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  float f = pow(1.0 - max(dot(N,V),0.0), 4.0);
  vec3 c = mix(vec3(0.16,0.13,0.1), vec3(0.95,0.72,0.38), hl) * f * (0.35 + 0.65*hl);
  gl_FragColor = vec4(c, 1.0); }`;

/** A soft round glow, drawn once. */
function glowTex(kind: 'soft' | 'streak' | 'ring') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  if (kind === 'soft') {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.08, 'rgba(255,255,255,0.75)'); r.addColorStop(0.25, 'rgba(255,255,255,0.22)'); r.addColorStop(0.6, 'rgba(255,255,255,0.04)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  } else if (kind === 'streak') {
    const r = g.createLinearGradient(0, 0, 128, 0);
    r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.5, 'rgba(255,255,255,0.9)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 62, 128, 4);
    const v = g.createRadialGradient(64, 64, 0, 64, 64, 30); v.addColorStop(0, 'rgba(255,255,255,0.5)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = v; g.fillRect(0, 0, 128, 128);
  } else {
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,1)'; g.beginPath(); g.arc(64, 64, 9, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Engraved brass plate and dark wood, drawn on canvases. */
function plateTex() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d')!;
  const bg = g.createRadialGradient(512, 512, 40, 512, 512, 512);
  bg.addColorStop(0, '#8f6a33'); bg.addColorStop(1, '#5a3f1c');
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { g.strokeStyle = `rgba(255,230,180,${Math.random() * 0.05})`; const r = Math.random() * 512; g.beginPath(); g.arc(512, 512, r, 0, Math.PI * 2); g.stroke(); }
  g.strokeStyle = 'rgba(30,18,6,0.7)';
  WORLDS.forEach((w) => { g.lineWidth = 2; g.beginPath(); g.arc(512, 512, (w.a / 26) * 512, 0, Math.PI * 2); g.stroke(); });
  g.lineWidth = 3; g.beginPath(); g.arc(512, 512, 500, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(512, 512, 470, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 360; i += 2) {
    const a = (i / 180) * Math.PI, l = i % 30 === 0 ? 30 : i % 10 === 0 ? 18 : 9;
    g.lineWidth = i % 30 === 0 ? 3 : 1.5;
    g.beginPath(); g.moveTo(512 + Math.cos(a) * 500, 512 + Math.sin(a) * 500); g.lineTo(512 + Math.cos(a) * (500 - l), 512 + Math.sin(a) * (500 - l)); g.stroke();
  }
  g.setLineDash([10, 10]); g.lineWidth = 2; g.beginPath(); g.arc(512, 512, (NINTH / 26) * 512, 0, Math.PI * 2); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function woodTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1a0f09'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const y = Math.random() * 512; g.strokeStyle = `rgba(${70 + Math.random() * 40},${36 + Math.random() * 20},18,${0.12 + Math.random() * 0.2})`; g.lineWidth = 1 + Math.random() * 3;
    g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 6); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}

function setLights(u: Record<string, THREE.IUniform>) { u.uA.value.copy(P('A')); u.uB.value.copy(P('B')); }

function pick(id: string) {
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => { if (e.delta > 8 || stage.moved > 8) return; e.stopPropagation(); stage.follow = id; stage.followAt = stage.f; stage.onFollow?.(id); },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { document.body.style.cursor = ''; },
  };
}

/** The clock. Everything else reads stage.t. */
function Clock() {
  const sp = useRef(still ? 0 : 1);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    sp.current = damp(sp.current, stage.speed, 3, d);
    stage.t += d * sp.current;
    stage.intro = still ? 1 : Math.min(1, stage.intro + d / 3.2);
    stage.close = damp(stage.close, clamp((stage.f - 4.55) / 0.9), 4, d);
    // the scroll chooses the view until the visitor does
    if (!stage.manual) stage.inst = damp(stage.inst, stage.f < 0.55 ? 1 : 0, 2.2, d);
    else stage.inst = damp(stage.inst, stage.inst > 0.5 ? 1 : 0, 3, d);
  }, -2);
  return null;
}

function Binary() {
  const a = useRef<THREE.Group>(null!), b = useRef<THREE.Group>(null!);
  const soft = useMemo(() => glowTex('soft'), []), streak = useMemo(() => glowTex('streak'), []);
  const ma = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: STAR_FRAG, uniforms: { col: { value: STAR_A.clone().multiplyScalar(1.15) }, time: { value: 0 } } }), []);
  const mb = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: STAR_FRAG, uniforms: { col: { value: STAR_B.clone().multiplyScalar(1.05) }, time: { value: 0 } } }), []);
  const ring = useMemo(() => { const g = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 129 }, (_, i) => new THREE.Vector3(Math.cos(i / 64 * Math.PI), 0, Math.sin(i / 64 * Math.PI)))); return g; }, []);
  const lm = useMemo(() => new THREE.LineBasicMaterial({ color: '#ffe2b0', transparent: true, opacity: 0.25 }), []);
  const glow = useRef<THREE.Sprite>(null!);
  RAD.A = 1.05; RAD.B = 0.72;
  useFrame(() => {
    const ph = stage.t * 0.9;
    P('A').set(Math.cos(ph) * 1.25, 0, Math.sin(ph) * 1.25);
    P('B').set(-Math.cos(ph) * 1.85, 0, -Math.sin(ph) * 1.85);
    a.current.position.copy(P('A')); b.current.position.copy(P('B'));
    a.current.rotation.y = stage.t * 0.2; b.current.rotation.y = -stage.t * 0.25;
    ma.uniforms.time.value = mb.uniforms.time.value = stage.t;
    lm.color.copy(BRASS).lerp(new THREE.Color('#ffe2b0'), 1 - stage.inst);
    glow.current.material.opacity = 0.22 + 0.12 * (1 - stage.inst);
  });
  return (
    <group>
      <group ref={a}>
        <mesh material={ma} {...pick('A')}><sphereGeometry args={[1.05, 48, 32]} /></mesh>
        <sprite scale={9}><spriteMaterial map={soft} color={STAR_A} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.9} /></sprite>
        <sprite scale={[16, 1.4, 1]}><spriteMaterial map={streak} color={STAR_A} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.35} /></sprite>
      </group>
      <group ref={b}>
        <mesh material={mb} {...pick('B')}><sphereGeometry args={[0.72, 48, 32]} /></mesh>
        <sprite scale={6.5}><spriteMaterial map={soft} color={STAR_B} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.9} /></sprite>
        <sprite scale={[11, 1, 1]}><spriteMaterial map={streak} color={STAR_B} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.3} /></sprite>
      </group>
      <sprite ref={glow} scale={34}><spriteMaterial map={soft} color={'#ffd9a8'} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.25} /></sprite>
      <line scale={1.25}><primitive object={ring} attach="geometry" /><primitive object={lm} attach="material" /></line>
      <line scale={1.85}><primitive object={ring} attach="geometry" /><primitive object={lm} attach="material" /></line>
    </group>
  );
}

function World({ i }: { i: number }) {
  const w = WORLDS[i];
  const id = 'w' + i;
  RAD[id] = w.r;
  const g = useRef<THREE.Group>(null!), spin = useRef<THREE.Mesh>(null!);
  const orb = useMemo(() => ({ M0: (i * 2.39) % (Math.PI * 2), om: (i * 1.7) % 6.28, inc: 0.012 + (i % 3) * 0.012, node: i * 0.9 }), [i]);
  const n = K * Math.pow(w.a, -1.5);
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: PLANET_FRAG, uniforms: { ...LIGHT_U(), c1: { value: new THREE.Color(w.c1) }, c2: { value: new THREE.Color(w.c2) }, atm: { value: new THREE.Color(w.atm) }, kind: { value: w.kind }, seed: { value: i * 3.17 }, time: { value: 0 } } }), [w, i]);
  const shell = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: SHELL_FRAG, uniforms: { ...LIGHT_U(), atm: { value: new THREE.Color(w.atm) } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), [w]);
  const ringMat = useMemo(() => w.ring ? new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: RING_FRAG, uniforms: { ...LIGHT_U(), c1: { value: new THREE.Color(w.c1) }, c2: { value: new THREE.Color(w.c2) }, r0: { value: w.r * 1.4 }, r1: { value: w.r * (w.ring === 2 ? 2.0 : 2.45) }, seed: { value: i } }, transparent: true, side: THREE.DoubleSide, depthWrite: false }) : null, [w, i]);
  // the ellipse, drawn once
  const line = useMemo(() => {
    const pts: THREE.Vector3[] = []; const v = new THREE.Vector3();
    for (let k = 0; k <= 256; k++) { const E = (k / 256) * Math.PI * 2; const M = E - w.e * Math.sin(E); pts.push(kepler(w.a, w.e, M, orb.om, orb.inc, orb.node, v).clone()); }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineBasicMaterial({ color: BRASS, transparent: true, opacity: 0.5 });
    return new THREE.Line(geo, m);
  }, [w, orb]);
  const hit = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }), []);
  useFrame(() => {
    kepler(w.a, w.e, orb.M0 + n * stage.t, orb.om, orb.inc, orb.node, P(id));
    g.current.position.copy(P(id));
    const s = smooth(clamp(stage.intro * 1.6 - i * 0.07));
    g.current.scale.setScalar(Math.max(0.001, s));
    spin.current.rotation.y = stage.t * (0.6 + i * 0.07);
    setLights(mat.uniforms); setLights(shell.uniforms); if (ringMat) setLights(ringMat.uniforms);
    mat.uniforms.time.value = stage.t;
    const lm = line.material as THREE.LineBasicMaterial;
    lm.color.copy(BRASS).lerp(SKYLINE, 1 - stage.inst);
    const near = stage.follow === id ? 0.35 : 0;
    lm.opacity = lerp(0.22, 0.6, stage.inst) + near;
    line.geometry.setDrawRange(0, Math.floor(257 * smooth(clamp(stage.intro * 1.4 - i * 0.05))));
  });
  return (
    <>
      <primitive object={line} />
      <group ref={g}>
        <group rotation={[0, 0, w.tilt]}>
          <mesh ref={spin} material={mat}><sphereGeometry args={[w.r, 48, 32]} /></mesh>
          <mesh material={shell} scale={1.045}><sphereGeometry args={[w.r, 32, 24]} /></mesh>
          {ringMat && <mesh material={ringMat} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[w.r * 1.4, w.r * (w.ring === 2 ? 2.0 : 2.45), 96, 1]} /></mesh>}
        </group>
        <mesh material={hit} {...pick(id)}><sphereGeometry args={[Math.max(w.r * 1.8, 0.9), 12, 8]} /></mesh>
      </group>
    </>
  );
}

/** The brass instrument: column, arms, pins, plate, table. It falls away in sky view. */
function Instrument() {
  const root = useRef<THREE.Group>(null!);
  const arms = useRef<(THREE.Group | null)[]>([]);
  const plate = useMemo(plateTex, []), wood = useMemo(woodTex, []);
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c99a4e', metalness: 1, roughness: 0.3, transparent: true }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b4a20', metalness: 1, roughness: 0.45, transparent: true }), []);
  const plateM = useMemo(() => new THREE.MeshStandardMaterial({ map: plate, metalness: 0.85, roughness: 0.42, transparent: true }), [plate]);
  const woodM = useMemo(() => new THREE.MeshStandardMaterial({ map: wood, roughness: 0.62, metalness: 0, transparent: true }), [wood]);
  const H = (i: number) => -1.25 - i * 0.42;
  const binArm = useRef<THREE.Group>(null!);
  useFrame(() => {
    const k = stage.inst;
    root.current.visible = k > 0.01;
    if (!root.current.visible) return;
    root.current.position.y = -(1 - k) * 6;
    [brass, dark, plateM, woodM].forEach((m) => { m.opacity = k; });
    WORLDS.forEach((w, i) => {
      const a = arms.current[i]; if (!a) return;
      const p = P('w' + i); const d = Math.hypot(p.x, p.z);
      a.rotation.y = -Math.atan2(p.z, p.x);
      const bar = a.children[0], pin = a.children[1], cap = a.children[2];
      bar.scale.set(d, 1, 1); bar.position.x = d / 2;
      const top = p.y - w.r - H(i) + root.current.position.y * -1;
      pin.position.x = d; pin.scale.set(1, Math.max(0.01, top), 1); pin.position.y = top / 2;
      cap.position.x = d;
    });
    binArm.current.rotation.y = -stage.t * 0.9;
  });
  return (
    <group ref={root}>
      <mesh material={brass} position={[0, -3.6, 0]}><cylinderGeometry args={[0.32, 0.5, 5.2, 32]} /></mesh>
      <mesh material={dark} position={[0, -1.15, 0]}><cylinderGeometry args={[0.42, 0.42, 0.18, 32]} /></mesh>
      <group ref={binArm} position={[0, -1.05, 0]}>
        <mesh material={brass} rotation={[0, 0, Math.PI / 2]} position={[-0.3, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 3.1, 10]} /></mesh>
        <mesh material={brass} position={[1.25, 0.0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.1, 8]} /></mesh>
        <mesh material={brass} position={[-1.85, 0.0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.1, 8]} /></mesh>
      </group>
      {WORLDS.map((w, i) => (
        <group key={i} position={[0, H(i), 0]} ref={(el) => { arms.current[i] = el; }}>
          <mesh material={i % 2 ? dark : brass}><boxGeometry args={[1, 0.07, 0.1]} /></mesh>
          <mesh material={brass}><cylinderGeometry args={[0.035, 0.035, 1, 8]} /></mesh>
          <mesh material={dark}><sphereGeometry args={[0.1, 12, 8]} /></mesh>
        </group>
      ))}
      {WORLDS.map((w, i) => (
        <mesh key={'c' + i} material={dark} position={[0, H(i), 0]}><cylinderGeometry args={[0.36 - i * 0.012, 0.36 - i * 0.012, 0.12, 24]} /></mesh>
      ))}
      <mesh material={plateM} rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.2, 0]}><circleGeometry args={[26, 96]} /></mesh>
      <mesh material={brass} rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.2, 0]}><torusGeometry args={[26, 0.22, 12, 128]} /></mesh>
      <mesh material={brass} rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.05, 0]}><torusGeometry args={[NINTH, 0.08, 8, 128]} /></mesh>
      <mesh material={woodM} rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.6, 0]}><circleGeometry args={[140, 48]} /></mesh>
      <spotLight position={[-20, 40, 18]} angle={0.7} penumbra={0.8} intensity={2600 * 1} color={'#ffd9a0'} distance={160} decay={1.6} />
      <pointLight position={[0, 0.5, 0]} intensity={60} color={'#ffcf90'} distance={60} decay={1.2} />
    </group>
  );
}

function Comets() {
  const N = 260;
  const soft = useMemo(() => glowTex('soft'), []);
  const heads = useRef<(THREE.Group | null)[]>([]);
  const mats = useMemo(() => [0, 1].map((k) => {
    const g = new THREE.BufferGeometry();
    const f = new Float32Array(N), r = new Float32Array(N * 3), pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { f[i] = Math.random(); r[i * 3] = Math.random() * 2 - 1; r[i * 3 + 1] = Math.random() * 2 - 1; r[i * 3 + 2] = Math.random() * 2 - 1; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aF', new THREE.BufferAttribute(f, 1)); g.setAttribute('aR', new THREE.BufferAttribute(r, 3));
    const m = new THREE.ShaderMaterial({
      uniforms: { uHead: { value: new THREE.Vector3() }, uDir: { value: new THREE.Vector3() }, uT: { value: 0 }, uC: { value: new THREE.Color(k ? '#bfe3ff' : '#ffe7c2') }, uPx: { value: 1 } },
      vertexShader: `attribute float aF; attribute vec3 aR; uniform vec3 uHead, uDir; uniform float uT, uPx; varying float vA;
        void main(){ float f = fract(aF + uT*0.05); vec3 p = uHead + uDir * pow(f,1.15) * 11.0 + aR * (0.12 + f*1.6);
          vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; vA = pow(1.0-f, 1.6);
          gl_PointSize = uPx * (2.0 + 5.0*(1.0-f)) * (30.0 / -mv.z); }`,
      fragmentShader: `uniform vec3 uC; varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d)*vA*0.55; gl_FragColor = vec4(uC*a, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    return { g, m };
  }), []);
  const base = useMemo(() => [new THREE.Vector3(-14, 8, -12), new THREE.Vector3(16, 11, -18)], []);
  const { gl } = useThree();
  useFrame(() => {
    [0, 1].forEach((k) => {
      const p = P('c' + k).copy(base[k]);
      const s = stage.t * 0.03 + k * 2;
      p.x += Math.sin(s) * 1.4; p.y += Math.cos(s * 0.7) * 0.6;
      heads.current[k]?.position.copy(p);
      const m = mats[k].m;
      m.uniforms.uHead.value.copy(p); m.uniforms.uDir.value.copy(p).normalize(); m.uniforms.uT.value = stage.t; m.uniforms.uPx.value = gl.getPixelRatio();
    });
  });
  RAD.c0 = RAD.c1 = 0.3;
  const grp = useRef<THREE.Group>(null!);
  useFrame(() => { grp.current.visible = stage.inst < 0.6; });
  return (
    <group ref={grp}>
      {[0, 1].map((k) => (
        <group key={k}>
          <points geometry={mats[k].g} material={mats[k].m} frustumCulled={false} />
          <group ref={(el) => { heads.current[k] = el; }}>
            <mesh><sphereGeometry args={[0.22, 16, 12]} /><meshBasicMaterial color={k ? '#e8f4ff' : '#fff3dc'} /></mesh>
            <sprite scale={5}><spriteMaterial map={soft} color={k ? '#bfe3ff' : '#ffe0b0'} blending={THREE.AdditiveBlending} depthWrite={false} transparent /></sprite>
            <mesh {...pick('c' + k)}><sphereGeometry args={[1.4, 10, 8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/** Seven bodies that give off no light, and a dust lane. */
function DarkRing() {
  const geos = useMemo(() => {
    const nz = createNoise3D(() => 0.37);
    return Array.from({ length: 7 }, (_, k) => {
      const g = new THREE.IcosahedronGeometry(1, 4);
      const p = g.attributes.position as THREE.BufferAttribute; const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = nz(v.x * 1.3 + k, v.y * 1.3, v.z * 1.3) * 0.22 + nz(v.x * 4 + k, v.y * 4, v.z * 4) * 0.05; v.multiplyScalar(1 + n); v.x *= 1 + (k % 3) * 0.15; p.setXYZ(i, v.x, v.y, v.z); }
      g.computeVertexNormals(); return g;
    });
  }, []);
  const mats = useMemo(() => geos.map(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: DARK_FRAG, uniforms: { hl: { value: 0 } } })), [geos]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const dust = useMemo(() => {
    const n = 1400, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const t = Math.random() * Math.PI * 2, r = RING + (Math.random() - 0.5) * 4; a[i * 3] = Math.cos(t) * r; a[i * 3 + 1] = (Math.random() - 0.5) * 0.8; a[i * 3 + 2] = Math.sin(t) * r; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g;
  }, []);
  const n = K * Math.pow(RING, -1.5);
  const sizes = [1.1, 0.75, 1.35, 0.9, 1.2, 0.7, 1.0];
  const dustRef = useRef<THREE.Points>(null!);
  useFrame((_, dt) => {
    if (dustRef.current) dustRef.current.visible = stage.inst < 0.6;
    refs.current.forEach((m, k) => {
      if (!m) return;
      const t = -Math.PI / 2 + (k - 3) * 0.17 + n * stage.t * 0.3;
      P('d' + k).set(Math.cos(t) * RING, Math.sin(k * 1.9) * 1.6, Math.sin(t) * RING);
      m.position.copy(P('d' + k)); m.scale.setScalar(sizes[k] * Math.max(0.001, 1 - stage.inst));
      m.rotation.set(stage.t * 0.05 + k, stage.t * 0.04 * (k % 2 ? 1 : -1), 0);
      const u = mats[k].uniforms.hl; u.value = damp(u.value, stage.hl === k || stage.follow === 'd' + k ? 1 : 0, 6, Math.min(dt, 0.05));
    });
  });
  sizes.forEach((s, k) => { RAD['d' + k] = s; });
  return (
    <>
      {geos.map((g, k) => (
        <mesh key={k} geometry={g} material={mats[k]} scale={sizes[k]} ref={(el) => { refs.current[k] = el; }} {...pick('d' + k)} />
      ))}
      <points geometry={dust} ref={dustRef}><pointsMaterial size={0.09} color={'#5a4a3a'} transparent opacity={0.6} depthWrite={false} /></points>
    </>
  );
}

/** The ninth orbit. Dashed until somebody joins it. */
function Ninth() {
  const ring = useMemo(() => glowTex('ring'), []);
  const line = useMemo(() => {
    const pts = Array.from({ length: 361 }, (_, i) => new THREE.Vector3(Math.cos(i / 180 * Math.PI) * NINTH, 0, Math.sin(i / 180 * Math.PI) * NINTH));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineDashedMaterial({ color: '#f3efe6', dashSize: 0.7, gapSize: 0.9, transparent: true, opacity: 0.4 });
    const l = new THREE.Line(g, m); l.computeLineDistances(); return l;
  }, []);
  const you = useRef<THREE.Sprite>(null!);
  const n = K * Math.pow(NINTH, -1.5);
  useFrame(() => {
    const m = line.material as LineDashedMaterialish;
    const c = stage.close;
    m.dashSize = 0.7 + c * 40; m.gapSize = 0.9 * (1 - c) + 0.0001;
    m.opacity = lerp(0.35, 0.95, c) * smooth(clamp(stage.intro * 1.3 - 0.3));
    m.color.set(c > 0.02 ? '#ffe2b0' : '#f3efe6');
    const t = 1.1 + n * stage.t;
    P('you').set(Math.cos(t) * NINTH, 0, Math.sin(t) * NINTH);
    you.current.position.copy(P('you'));
    you.current.material.opacity = c;
    you.current.scale.setScalar(1.6 + c * 0.6);
  });
  return (
    <>
      <primitive object={line} />
      <sprite ref={you}><spriteMaterial map={ring} color={'#ffe2b0'} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
    </>
  );
}
type LineDashedMaterialish = THREE.LineDashedMaterial;

/** A deep star field in three shells, and a faint band of sky behind it. */
function Sky() {
  const bg = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uInst: { value: 1 } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uInst; varying vec3 vD; ${NOISE}
      void main(){ vec3 d = normalize(vD); vec3 bn = normalize(vec3(0.15, 1.0, 0.35));
        float h = dot(d, bn); float band = exp(-pow(h/0.2, 2.0));
        float n = fbm(d*4.0); float lane = smoothstep(0.45, 0.7, fbm(d*7.0+3.0));
        vec3 c = vec3(0.012,0.014,0.03) + band*(vec3(0.09,0.075,0.07)*n + vec3(0.03,0.04,0.07))*(1.0 - 0.75*lane);
        float gl0 = max(dot(d, normalize(vec3(0.0,0.06,-1.0))),0.0); c += vec3(0.07,0.045,0.03) * pow(gl0, 5.0) * (0.6 + 0.8*n) + vec3(0.02,0.022,0.04)*pow(gl0,2.0);
        vec3 room = mix(vec3(0.028,0.019,0.013), vec3(0.008,0.006,0.005), smoothstep(-0.2, 0.6, d.y));
        gl_FragColor = vec4(mix(c, room, uInst), 1.0); }`,
  }), []);
  const layers = useMemo(() => [[2600, 260, 380, 1.2], [900, 120, 200, 1.7], [260, 62, 100, 2.4]].map(([n, r0, r1, s]) => {
    const p = new Float32Array(n * 3), c = new Float32Array(n * 3), sz = new Float32Array(n);
    const bn = new THREE.Vector3(0.15, 1, 0.35).normalize(), v = new THREE.Vector3(), col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      v.randomDirection();
      if (Math.random() < 0.45) { v.addScaledVector(bn, -v.dot(bn) * 0.85).normalize(); }
      v.multiplyScalar(r0 + Math.random() * (r1 - r0)); p.set([v.x, v.y, v.z], i * 3);
      const tt = Math.random(); col.setHSL(tt < 0.3 ? 0.08 : tt < 0.6 ? 0.6 : 0.12, tt < 0.6 ? 0.5 : 0.1, 0.75 + Math.random() * 0.25); c.set([col.r, col.g, col.b], i * 3);
      sz[i] = s * (0.5 + Math.pow(Math.random(), 3) * 2.2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    return g;
  }), []);
  const pm = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uO: { value: 1 }, uT: { value: 0 }, uPx: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    vertexShader: `attribute float size; varying vec3 vC; varying float vTw; uniform float uT, uPx; void main(){ vC = color; vTw = 0.75 + 0.25*sin(uT*1.7 + position.x*3.1 + position.z); vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = size*uPx; }`,
    fragmentShader: `uniform float uO; varying vec3 vC; varying float vTw; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5, 0.05, d) * uO * vTw; gl_FragColor = vec4(vC*a, a); }`,
  }), []);
  const { gl } = useThree();
  useFrame((st) => {
    bg.uniforms.uInst.value = stage.inst;
    pm.uniforms.uO.value = lerp(1, 0.18, stage.inst);
    pm.uniforms.uT.value = still ? 0 : st.clock.elapsedTime;
    pm.uniforms.uPx.value = gl.getPixelRatio();
  });
  return (
    <>
      <mesh material={bg}><sphereGeometry args={[600, 48, 24]} /></mesh>
      {layers.map((g, i) => <points key={i} geometry={g} material={pm} frustumCulled={false} />)}
    </>
  );
}

type Key = { pos: THREE.Vector3; look: THREE.Vector3; fov: number };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function keyFor(i: number, phone: boolean): Key {
  switch (i) {
    case 0: return phone ? { pos: V(0, 44, 64), look: V(0, 10, 0), fov: 44 } : { pos: V(10, 27, 56), look: V(-15, -3, 0), fov: 38 };
    case 1: {
      const p = P('w3'); const d = p.clone().setY(0).normalize(); const t = V(-d.z, 0, d.x);
      const pos = p.clone().addScaledVector(d, 3.6).addScaledVector(t, phone ? -1.2 : 2.2).add(V(0, phone ? 1.0 : 0.9, 0));
      const look = p.clone().multiplyScalar(phone ? 0.75 : 0.4).add(V(0, phone ? -0.5 : 0, 0));
      return { pos, look, fov: phone ? 52 : 40 };
    }
    case 2: return phone ? { pos: V(0, 3.2, 15), look: V(0, 0, 0), fov: 52 } : { pos: V(0, 2.6, 11.5), look: V(0, 0.1, 0), fov: 36 };
    case 3: return phone ? { pos: V(0, 12, 62), look: V(0, 10, -14), fov: 60 } : { pos: V(0, 9, 40), look: V(0, 13, -14), fov: 40 };
    case 4: return phone ? { pos: V(0, 5, 14), look: V(0, 2, -36), fov: 72 } : { pos: V(0, 4, -4), look: V(0, 1.5, -36), fov: 50 };
    case 5: return phone ? { pos: V(0, 92, 26), look: V(0, 0, 0), fov: 46 } : { pos: V(0, 52, 26), look: V(-6, 0, 2), fov: 44 };
    default: return phone ? { pos: V(0, 100, 50), look: V(0, 0, 0), fov: 46 } : { pos: V(0, 60, 44), look: V(0, 0, 0), fov: 44 };
  }
}

function Rig() {
  const { camera, size } = useThree();
  const cur = useRef({ pos: V(0, 70, 110), look: V(0, 0, 0), fov: 40, fw: 0 });
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), q: new THREE.Vector3() }), []);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const phone = size.width <= 820;
    const f = clamp(stage.f, 0, 6);
    const i = Math.floor(f), t = smooth(f - i);
    const a = keyFor(i, phone), b = keyFor(Math.min(6, i + 1), phone);
    const pos = a.pos.clone().lerp(b.pos, t), look = a.look.clone().lerp(b.look, t);
    let fov = lerp(a.fov, b.fov, t);
    // drag to turn the system around its centre
    if (!stage.dragging && !still) { stage.yaw += stage.yawV * d; stage.yawV *= Math.pow(0.04, d); }
    const off = pos.clone().sub(look);
    off.applyAxisAngle(V(0, 1, 0), stage.yaw);
    const r = off.length(); const el = clamp(Math.asin(off.y / r) + stage.pitch, -0.2, 1.45); const az = Math.atan2(off.x, off.z);
    off.set(Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r);
    pos.copy(look).add(off);
    // follow a body
    if (stage.follow && Math.abs(stage.f - stage.followAt) > 0.8) { stage.follow = ''; stage.onFollow?.(''); }
    cur.current.fw = damp(cur.current.fw, stage.follow ? 1 : 0, 3, d);
    if (stage.follow || cur.current.fw > 0.001) {
      const id = stage.follow || 'w3';
      const bp = P(id), rr = RAD[id] ?? 0.5;
      const dir = bp.clone().setY(0); if (dir.lengthSq() < 0.01) dir.set(0, 0, 1); dir.normalize().applyAxisAngle(V(0, 1, 0), stage.yaw + 0.5);
      const fp = bp.clone().addScaledVector(dir, rr * 6 + 2.5).add(V(0, rr * 2 + 0.8 + stage.pitch * 4, 0));
      if (id[0] === 'd') fp.copy(bp).add(dir.clone().multiplyScalar(-(rr * 5 + 3))).add(V(0, rr, 0));
      pos.lerp(fp, smooth(cur.current.fw)); look.lerp(bp, smooth(cur.current.fw)); fov = lerp(fov, 40, cur.current.fw);
    }
    // the opening: the camera comes down out of the room
    const it = 1 - Math.pow(1 - stage.intro, 3);
    pos.lerp(V(0, 46, 78), 1 - it);
    const k = still ? 30 : 3.2;
    cur.current.pos.x = damp(cur.current.pos.x, pos.x, k, d); cur.current.pos.y = damp(cur.current.pos.y, pos.y, k, d); cur.current.pos.z = damp(cur.current.pos.z, pos.z, k, d);
    cur.current.look.x = damp(cur.current.look.x, look.x, k, d); cur.current.look.y = damp(cur.current.look.y, look.y, k, d); cur.current.look.z = damp(cur.current.look.z, look.z, k, d);
    cur.current.fov = damp(cur.current.fov, fov, k, d);
    camera.position.copy(cur.current.pos); camera.lookAt(cur.current.look);
    const pc = camera as THREE.PerspectiveCamera; if (Math.abs(pc.fov - cur.current.fov) > 0.01) { pc.fov = cur.current.fov; pc.updateProjectionMatrix(); }
    // where the page should pin its labels
    const ids = ['A', 'B', 'c0', 'c1', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'you', 'w3'];
    camera.updateMatrixWorld();
    for (const id of ids) {
      tmp.v.copy(P(id)).project(camera);
      const pin = (stage.pins[id] ??= { x: 0, y: 0, on: false });
      pin.x = (tmp.v.x + 1) / 2 * size.width; pin.y = (1 - tmp.v.y) / 2 * size.height; pin.on = tmp.v.z < 1 && Math.abs(tmp.v.x) < 1.1 && Math.abs(tmp.v.y) < 1.1;
    }
    void scroll;
  });
  return null;
}

function Bg() {
  const { scene } = useThree();
  useEffect(() => { scene.background = new THREE.Color('#03040a'); }, [scene]);
  return null;
}

export default function Scene() {
  const phone = isPhone();
  return (
    <Canvas dpr={[1, phone ? 1.4 : 1.6]} camera={{ fov: 40, near: 0.1, far: 2000, position: [0, 46, 78] }} gl={{ antialias: true, powerPreference: 'high-performance' }} style={{ touchAction: 'pan-y' }}
      onPointerMissed={() => { /* clicks on empty sky do nothing */ }}>
      <Bg />
      <Clock />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ffd8a0" position={[0, 6, -4]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#9fb4ff" position={[-8, 2, 4]} rotation-y={Math.PI / 2} scale={[6, 4, 1]} />
        <Lightformer form="ring" intensity={2} color="#ffffff" position={[6, 4, 6]} scale={3} />
      </Environment>
      <ambientLight intensity={0.15} />
      <Sky />
      <Binary />
      {WORLDS.map((_, i) => <World key={i} i={i} />)}
      <Instrument />
      <Comets />
      <DarkRing />
      <Ninth />
      <Rig />
    </Canvas>
  );
}
