// The gallery: a block of white marble on a long black plinth, one light from above.
// The block is twelve slices with invisible seams. Each cut face carries its own drawn inclusion.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei';
import { clamp, damp, isPhone, lerp, smooth, still } from '@/lib/utils';
import { drawInks } from './ink';
import { N, CENTRE, vs } from './state';

const T = 0.1, H = 1.6, D = 1.0, X0 = -0.6;
const HINGE = new THREE.Vector3(0, 0, -D / 2);
const PILE_EDGE = -0.98; // where a slice's foot rests as it tips
const PILE_C = PILE_EDGE - H / 2; // the pile's centre
const BOOK = THREE.MathUtils.degToRad(78);
const BG = '#0d0d0c';

/* ---------- the marble, in block space so every seam agrees ---------- */

const GLSL_NOISE = /* glsl */ `
varying vec3 vMp; varying vec2 vInkUv;
uniform sampler2D inkMap; uniform float inkOn; uniform float flipU;
vec3 m289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 m289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 perm(vec4 x){return m289(((x*34.0)+1.0)*x);}
float sn(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=m289(i);
  vec4 p=perm(perm(perm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  vec3 ns=0.142857142857*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 nm=1.79284291400159-0.85373472095314*vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3));
  p0*=nm.x; p1*=nm.y; p2*=nm.z; p3*=nm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*sn(p); p=p*2.07+vec3(1.3,7.1,4.7); a*=0.5; } return s; }
`;

function marble(cut: boolean, ink: THREE.Texture | null, flip: boolean) {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0,
    roughness: cut ? 0.16 : 0.5,
    clearcoat: cut ? 1 : 0, clearcoatRoughness: 0.07,
    specularIntensity: cut ? 0.7 : 0.4,
  });
  m.onBeforeCompile = (s) => {
    s.uniforms.inkMap = { value: ink };
    s.uniforms.inkOn = { value: ink ? 1 : 0 };
    s.uniforms.flipU = { value: flip ? 1 : 0 };
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aMp;\nvarying vec3 vMp; varying vec2 vInkUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMp = aMp; vInkUv = uv;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL_NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 mp = vMp*1.55 + vec3(2.0, 0.4, 1.3);
        float cloud = fbm(mp*0.8)*0.5+0.5;
        float wv = mp.x*0.7 + mp.y*1.1 - mp.z*0.5 + fbm(mp*0.9)*2.6;
        float vein = pow(1.0-abs(sin(wv*2.1)), 9.0)*0.55 + pow(1.0-abs(sin(wv*2.1)), 40.0)*0.35;
        float wv2 = -mp.x*0.5 + mp.y*0.4 + mp.z*1.0 + fbm(mp*2.1+3.0)*1.8;
        vein += pow(1.0-abs(sin(wv2*3.3)), 60.0)*0.3;
        vec3 base = mix(vec3(0.93,0.905,0.86), vec3(0.78,0.765,0.74), cloud*0.45);
        base = mix(base, vec3(0.46,0.46,0.47), clamp(vein,0.0,1.0)*0.5);
        float ink = 0.0;
        if (inkOn > 0.5) ink = texture2D(inkMap, vec2(mix(vInkUv.x, 1.0-vInkUv.x, flipU), vInkUv.y)).r;
        diffuseColor.rgb = mix(base, vec3(0.018,0.018,0.017), ink);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(clamp(roughnessFactor + vein*0.08 + cloud*0.04, 0.0, 1.0), 0.62, ink);')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= 1.0 - ink*0.85;\n#endif');
  };
  m.customProgramCacheKey = () => 'vein-' + (cut ? 'c' : 'o');
  return m;
}

/* ---------- one slice ---------- */

function sliceGeometry(i: number) {
  const g = new THREE.BoxGeometry(T + 0.0016, H, D, 1, 1, 1);
  const cx = X0 + T * (i + 0.5);
  const pos = g.attributes.position.array as Float32Array;
  const mp = new Float32Array(pos.length);
  for (let k = 0; k < pos.length; k += 3) { mp[k] = pos[k] + cx; mp[k + 1] = pos[k + 1] + H / 2; mp[k + 2] = pos[k + 2]; }
  g.setAttribute('aMp', new THREE.BufferAttribute(mp, 3));
  return g;
}

/** Where slice i is when it is s of the way off the block (0 standing, 1 lying on the pile). */
function placeSlice(i: number, s: number, slot: number, pos: THREE.Vector3, rot: THREE.Euler) {
  const left = X0 + T * i;
  const u1 = smooth(clamp(s / 0.38));
  const u2 = smooth(clamp((s - 0.22) / 0.3));
  const u3 = clamp((s - 0.42) / 0.58);
  const a = (u3 < 0.5 ? 2 * u3 * u3 : 1 - Math.pow(-2 * u3 + 2, 2) / 2) * (Math.PI / 2);
  const px = lerp(left, PILE_EDGE, u1);
  const py = lerp(0, slot * T + 0.002, u2) + Math.sin(u3 * Math.PI) * 0.06;
  // The pivot is the slice's bottom-left edge; it tips over toward the pile,
  // turning a quarter as it goes so the cut lies with the mark upright to the room.
  const cx = T / 2, cy = H / 2;
  const x = px + cx * Math.cos(a) - cy * Math.sin(a), y = py + cx * Math.sin(a) + cy * Math.cos(a);
  const th = -(a / (Math.PI / 2)) * (Math.PI / 2);
  const rx = x - PILE_C;
  pos.set(PILE_C + rx * Math.cos(th), y, -rx * Math.sin(th));
  rot.set(0, th, a, 'YZX');
}

function Block() {
  const inks = useMemo(() => drawInks().map((cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; return t; }), []);
  const outer = useMemo(() => marble(false, null, false), []);
  const slices = useMemo(() => Array.from({ length: N }, (_, i) => {
    const geo = sliceGeometry(i);
    // Box groups: +x, -x, +y, -y, +z, -z.
    const px = i + 1 < N ? marble(true, inks[i + 1], true) : outer;
    const nx = i > 0 ? marble(true, inks[i], false) : outer;
    return { geo, mats: [px, nx, outer, outer, outer, outer] };
  }), [inks, outer]);

  // When the standing part is at rest it is drawn as one solid, so no seam can ever show.
  const solids = useMemo(() => Array.from({ length: N }, (_, k) => {
    const w = (N - k) * T, cx = X0 + T * k + w / 2;
    const g = new THREE.BoxGeometry(w, H, D, 1, 1, 1);
    const pos = g.attributes.position.array as Float32Array, mp = new Float32Array(pos.length);
    for (let j = 0; j < pos.length; j += 3) { mp[j] = pos[j] + cx; mp[j + 1] = pos[j + 1] + H / 2; mp[j + 2] = pos[j + 2]; }
    g.setAttribute('aMp', new THREE.BufferAttribute(mp, 3));
    return { geo: g, cx, mats: [outer, slices[k].mats[1], outer, outer, outer, outer] };
  }), [slices, outer]);
  const solidRefs = useRef<(THREE.Mesh | null)[]>([]);
  const hingeL = useRef<THREE.Group>(null), hingeR = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const sim = useRef(Array.from({ length: N }, () => ({ s: 0, v: 0 })));
  const book = useRef({ h: still ? 1 : 0, v: 0 });
  const wire = useRef<THREE.Group>(null);
  const tmpP = useMemo(() => new THREE.Vector3(), []), tmpR = useMemo(() => new THREE.Euler(), []);
  const { gl, camera } = useThree();

  useEffect(() => () => { inks.forEach((t) => t.dispose()); slices.forEach((s) => { s.geo.dispose(); s.mats.forEach((m) => m.dispose()); }); solids.forEach((s) => s.geo.dispose()); }, [inks, slices, solids]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    vs.t += Math.min(dtRaw, 0.25);
    const t = vs.t;
    const S = sim.current, B = book.current;
    const open = still || vs.stop === 5;
    const introDone = still || t > 2.7;
    const base = vs.stop <= 4 ? (vs.stop === 0 && !introDone ? 0 : vs.stop + 1) : 0;
    const count = open ? 0 : clamp(base + vs.delta, 0, N - 1);
    vs.count = count;

    // The book opens only once every slice is home, and every slice waits for the book to close.
    let maxS = 0; for (const x of S) maxS = Math.max(maxS, x.s);
    const bookTarget = open && maxS < 0.03 ? 1 : 0;
    const closed = B.h < 0.03;

    for (let i = 0; i < N; i++) {
      const x = S[i];
      let target = i < count ? 1 : 0;
      if (!closed) target = 0;
      if (target === 0 && vs.hover && i === count && !open && closed) target = 0.045;
      // One at a time: a slice leaves after the one before it is clear, comes back after the one above it.
      if (target === 1 && i > 0 && S[i - 1].s < 0.55) target = x.s;
      if (target === 0 && i < N - 1 && S[i + 1].s > 0.5 && x.s > 0.05) target = x.s;
      const d = vs.drag;
      if (d && d.i === i && (d.kind === 'take' || d.kind === 'back')) { x.s = d.s; x.v = 0; continue; }
      if (still) { x.s = target; x.v = 0; continue; }
      // A heavy spring with a little give at the end.
      const k = 30, c = 2 * Math.sqrt(k) * 0.62;
      x.v += (k * (target - x.s) - c * x.v) * dt;
      x.s = clamp(x.s + x.v * dt, -0.02, 1.0);
      if (x.s >= 1 && x.v > 0) x.v = -x.v * 0.18; // lands on the pile and settles
    }

    const bt = clamp(bookTarget + (vs.stop === 5 ? vs.bookPush : 0), 0, 1.08);
    if (still) B.h = 1; else {
      const k = 9, c = 2 * Math.sqrt(k) * 0.78;
      B.v += (k * (bt - B.h) - c * B.v) * dt;
      B.h += B.v * dt;
    }
    const ang = Math.max(0, B.h) * BOOK;
    const gap = Math.max(0, B.h) * 0.03;
    if (hingeL.current) { hingeL.current.rotation.y = -ang; hingeL.current.position.set(HINGE.x - gap, 0, HINGE.z); }
    if (hingeR.current) { hingeR.current.rotation.y = ang; hingeR.current.position.set(HINGE.x + gap, 0, HINGE.z); }

    let away = 0; while (away < N && S[away].s > 0.995) away++;
    let rest = !vs.drag && B.h < 0.002 && Math.abs(B.v) < 0.01;
    for (let i = away; i < N && rest; i++) if (Math.abs(S[i].s) > 0.0015 || Math.abs(S[i].v) > 0.01) rest = false;
    for (let k = 0; k < N; k++) { const m = solidRefs.current[k]; if (m) m.visible = rest && k === away; }
    for (let i = 0; i < N; i++) {
      const m = meshes.current[i]; if (!m) continue;
      m.visible = !(rest && i >= away);
      placeSlice(i, S[i].s, i, tmpP, tmpR);
      m.position.set(tmpP.x - HINGE.x, tmpP.y, tmpP.z - HINGE.z);
      m.rotation.copy(tmpR);
    }

    // The opening: a fine wire draws down through the first cut.
    if (wire.current) {
      const w = clamp((t - 0.5) / 1.7);
      const on = !still && t < 3.1;
      wire.current.visible = on;
      if (on) {
        wire.current.position.set(X0 + T, lerp(H + 0.35, -0.004, 1 - Math.pow(1 - w, 1.6)), 0);
        const f = clamp((t - 2.5) / 0.6);
        wire.current.scale.set(1, 1, 1 - f);
      }
    }
    gl.domElement.style.cursor = vs.drag ? 'grabbing' : vs.hover ? 'grab' : '';
    if (Math.round(t * 4) % 4 === 0) {
      const p = tmpP.set(0.25, 0.8, 0.3).project(camera);
      const r = gl.domElement.getBoundingClientRect();
      gl.domElement.dataset.block = `${Math.round(r.left + (p.x + 1) / 2 * r.width)},${Math.round(r.top + (1 - p.y) / 2 * r.height)}`;
    }
  });

  // Hands: press a slice and pull it left to take it; pull right to put the last one back.
  const down = (e: ThreeEvent<PointerEvent>) => {
    if (still) return;
    e.stopPropagation();
    const x0 = e.nativeEvent.clientX, w = Math.max(220, Math.min(420, window.innerWidth * 0.32));
    let decided: null | 'take' | 'back' | 'book' = vs.stop === 5 ? 'book' : null;
    let i = -1, s0 = 0;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      if (!decided) {
        if (Math.abs(dx) < 6) return;
        if (dx < 0 && vs.count < N - 1) { decided = 'take'; i = vs.count; }
        else if (dx > 0 && vs.count > 0) { decided = 'back'; i = vs.count - 1; }
        else return;
        s0 = sim.current[i].s;
        vs.drag = { kind: decided, i, x0, s0, s: s0, vx: 0, lastX: ev.clientX, lastT: performance.now() };
      }
      const d = vs.drag ?? (vs.drag = { kind: 'book', i: -1, x0, s0: 0, s: 0, vx: 0, lastX: ev.clientX, lastT: performance.now() });
      const now = performance.now();
      d.vx = lerp(d.vx, (ev.clientX - d.lastX) / Math.max(1, now - d.lastT), 0.5); d.lastX = ev.clientX; d.lastT = now;
      if (decided === 'book') { vs.bookPush = clamp(-dx / w, -1, 0.08); return; }
      // Heavy: the stone follows the hand at a slower rate once it starts to tip.
      const raw = s0 + (-dx / w);
      d.s = clamp(raw < 0.42 ? raw : 0.42 + (raw - 0.42) * 0.8, 0, 1);
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      const d = vs.drag; vs.drag = null; vs.bookPush = 0;
      if (!d || d.kind === 'book') return;
      const fling = -d.vx * 0.6;
      const S = sim.current[d.i]; S.v = fling * 3;
      if (d.kind === 'take' && d.s + fling > 0.3) vs.delta += 1;
      if (d.kind === 'back' && d.s + fling < 0.7) vs.delta -= 1;
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };

  const half = (lo: number, hi: number) => slices.slice(lo, hi).map((sl, k) => {
    const i = lo + k;
    return (
      <mesh key={i} ref={(m) => { meshes.current[i] = m; }} geometry={sl.geo} material={sl.mats} castShadow receiveShadow
        onPointerDown={down}
        onPointerOver={() => { vs.hover = true; }} onPointerOut={() => { vs.hover = false; }} />
    );
  });

  return (
    <group>
      <group ref={hingeL}>{half(0, CENTRE)}</group>
      <group ref={hingeR}>{half(CENTRE, N)}</group>
      {solids.map((so, k) => (
        <mesh key={'s' + k} ref={(m) => { solidRefs.current[k] = m; }} geometry={so.geo} material={so.mats} position={[so.cx, H / 2, 0]} visible={false} castShadow receiveShadow
          onPointerDown={down} onPointerOver={() => { vs.hover = true; }} onPointerOut={() => { vs.hover = false; }} />
      ))}
      <group ref={wire} visible={false}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0028, 0.0028, D + 0.9, 6]} />
          <meshStandardMaterial color="#2a2a28" metalness={1} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- the room ---------- */

function Plinth() {
  return (
    <group>
      <RoundedBox args={[3.9, 0.9, 1.9]} radius={0.012} smoothness={3} position={[-1.0, -0.45, 0]} receiveShadow castShadow>
        <meshPhysicalMaterial color="#121211" roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.3} />
      </RoundedBox>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#141412" roughness={0.88} />
      </mesh>
      <ContactShadows position={[-1.0, -0.898, 0]} scale={[7, 4]} opacity={0.75} blur={2.6} far={1.2} frames={1} resolution={256} color="#000000" />
    </group>
  );
}

type View = { pos: THREE.Vector3; look: THREE.Vector3; ox: number; oy: number };
const V = (p: [number, number, number], l: [number, number, number], ox = 0, oy = 0): View => ({ pos: new THREE.Vector3(...p), look: new THREE.Vector3(...l), ox, oy });

function views(phone: boolean, stop: number): View {
  if (still) return phone ? V([0, 2.2, 11.5], [0, 0.55, -0.45]) : V([0, 2.3, 10.4], [0, 0.6, -0.45], 0.2, 0);
  if (stop === 5) return phone ? V([0, 2.1, 11.6], [0, 0.6, -0.45]) : V([0, 1.9, 9.4], [0, 0.72, -0.45], 0, 0.15);
  if (stop >= 6) return phone ? V([-3.2, 3.2, 11.6], [-0.6, 0.5, 0]) : V([-2.83, 2.81, 12.1], [-0.35, 0.5, 0], 0, 0.2);
  // The cutting views: three quarters from the front left, drifting a little per section.
  const a = -0.34 - stop * 0.035, el = 0.24 + stop * 0.012, d = phone ? 14.2 : 14.2;
  const look = new THREE.Vector3(-0.95, 0.38, 0);
  const pos = new THREE.Vector3(Math.sin(a) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(a) * Math.cos(el) * d).add(look);
  return { pos, look, ox: phone ? 0 : 0.19, oy: phone ? 0.03 : 0.0 };
}

function Rig() {
  const { camera, size } = useThree();
  const cur = useRef<View | null>(null);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.12);
    const phone = isPhone();
    const v = views(phone, vs.stop);
    const intro = still ? 1 : smooth(clamp(vs.t / 3.2));
    if (!cur.current) cur.current = { pos: v.pos.clone().add(new THREE.Vector3(0.6, 0.5, 2.2)), look: v.look.clone(), ox: v.ox, oy: v.oy };
    const c = cur.current, l = still ? 100 : 1.5 + intro * 0.4;
    c.pos.x = damp(c.pos.x, v.pos.x, l, dt); c.pos.y = damp(c.pos.y, v.pos.y, l, dt); c.pos.z = damp(c.pos.z, v.pos.z, l, dt);
    c.look.x = damp(c.look.x, v.look.x, l, dt); c.look.y = damp(c.look.y, v.look.y, l, dt); c.look.z = damp(c.look.z, v.look.z, l, dt);
    c.ox = damp(c.ox, v.ox, l, dt); c.oy = damp(c.oy, v.oy, l, dt);
    camera.position.copy(c.pos); camera.lookAt(c.look);
    const cam = camera as THREE.PerspectiveCamera;
    cam.setViewOffset(size.width, size.height, -c.ox * size.width, -c.oy * size.height, size.width, size.height);
  });
  return null;
}

function Lights() {
  const spot = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(-0.7, 0, 0); return o; }, []);
  useEffect(() => { if (spot.current) spot.current.target = target; }, [target]);
  const phone = isPhone();
  return (
    <>
      <primitive object={target} />
      <spotLight ref={spot} position={[-1.1, 7.2, 1.6]} angle={0.36} penumbra={0.85} intensity={5.2} decay={0} color="#fff6ea"
        castShadow shadow-mapSize={[phone ? 1024 : 2048, phone ? 1024 : 2048]} shadow-bias={-0.0004} shadow-normalBias={0.015} shadow-camera-near={3} shadow-camera-far={11} />
      <directionalLight position={[3.5, 2.6, -4.5]} intensity={1.1} color="#dfe4ea" />
      <directionalLight position={[-5, 1.2, 3]} intensity={0.16} color="#ffffff" />
      <ambientLight intensity={0.05} />
      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#050505']} />
        <Lightformer form="rect" intensity={2.2} color="#fff4e6" position={[-1, 6, 1.5]} rotation={[Math.PI / 2, 0, 0]} scale={[5, 3, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#ffffff" position={[-6, 1.5, 3]} rotation={[0, Math.PI / 2.4, 0]} scale={[3, 1.2, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#dfe6ee" position={[4, 2, -5]} rotation={[0, -Math.PI / 4, 0]} scale={[2, 4, 1]} />
      </Environment>
    </>
  );
}

function Ready() {
  const done = useRef(false);
  useFrame(() => { if (!done.current) { done.current = true; vs.ready = true; vs.onReady?.(); } });
  return null;
}

export default function Scene() {
  const phone = isPhone();
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={phone ? [1, 1.5] : [1, 1.6]}
      camera={{ fov: 21, near: 0.5, far: 60, position: [-4, 3, 11] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      style={{ touchAction: 'pan-y' }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 14, 30]} />
      <Lights />
      <Block />
      <Plinth />
      <Rig />
      <Ready />
    </Canvas>
  );
}
