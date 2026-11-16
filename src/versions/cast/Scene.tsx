// Version 41's studio: a bronze question mark on a dark seamless sweep, one big
// softbox and a rim strip, a contact shadow. The page's scroll moves the camera
// between shots and takes the hook and the dot apart; the hand turns it.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';
import { clamp, damp, isPhone, lerp, smooth, still } from '@/lib/utils';
import { castParts, DEPTH, grain, H } from './geo';
import { st, type Pose } from './store';

const BG = '#0d0d0e';

function pose(y: number): Pose {
  const k = st.keys;
  if (!k.length) return { cam: [1.6, 2.1, 14], tgt: [-2.1, 1.55, 0], yaw: 0.42, explode: 0, fov: 22 };
  if (y <= k[0].y) return k[0];
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1];
    if (y <= b.y) {
      const t = smooth(clamp((y - a.y) / Math.max(1, b.y - a.y)));
      const m = (p: number, q: number) => lerp(p, q, t);
      return {
        cam: [m(a.cam[0], b.cam[0]), m(a.cam[1], b.cam[1]), m(a.cam[2], b.cam[2])],
        tgt: [m(a.tgt[0], b.tgt[0]), m(a.tgt[1], b.tgt[1]), m(a.tgt[2], b.tgt[2])],
        yaw: m(a.yaw, b.yaw), explode: m(a.explode, b.explode), fov: m(a.fov, b.fov),
      };
    }
  }
  return k[k.length - 1];
}

/** The seamless: a floor that curves up into a wall, swept along x. */
function Sweep() {
  const geometry = useMemo(() => {
    const zf = -3.5, R = 5, prof: [number, number][] = [[40, 0], [zf, 0]];
    for (let i = 1; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; prof.push([zf - R * Math.sin(a), R - R * Math.cos(a)]); }
    prof.push([zf - R, 60]);
    const pos: number[] = [], idx: number[] = [];
    prof.forEach(([z, y]) => { for (const x of [-80, 80]) pos.push(x, y, z); });
    for (let i = 0; i < prof.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.92, metalness: 0, envMapIntensity: 0.06 }), []);
  useEffect(() => () => { geometry.dispose(); mat.dispose(); }, [geometry, mat]);
  // Layer 1: the main camera sees it, the contact-shadow camera does not.
  return <mesh geometry={geometry} material={mat} receiveShadow layers={1} />;
}

function Mark() {
  const low = useMemo(() => isPhone(), []);
  const parts = useMemo(() => castParts(low), [low]);
  const tex = useMemo(() => grain(512), []);
  const bronze = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#b5824e', metalness: 1, roughness: 0.34, roughnessMap: tex, bumpMap: tex, bumpScale: 0.6,
    clearcoat: 0.6, clearcoatRoughness: 0.18, envMapIntensity: 1.25,
  }), [tex]);
  useEffect(() => () => { parts.hook.geo.dispose(); parts.dot.geo.dispose(); tex.dispose(); bronze.dispose(); }, [parts, tex, bronze]);

  const turn = useRef<THREE.Group>(null), hook = useRef<THREE.Mesh>(null), dot = useRef<THREE.Mesh>(null);
  const key = useRef<THREE.SpotLight>(null), rim = useRef<THREE.DirectionalLight>(null);
  const { camera, scene, size } = useThree();
  const cur = useRef<Pose | null>(null);
  const state = useRef({ ex: 0, tilt: 0, tiltX: 0, hop: 0, hopV: 0, wob: 0, wobV: 0, open: still ? 1 : 0, born: -1, pathYaw: 0 });

  // Where the four labels point, in each part's own space.
  const anchors = useMemo(() => {
    const hc = parts.hook.centre, dc = parts.dot.centre, K = H / 1540;
    const front = DEPTH / 2 + 0.07;
    return [
      { part: 'hook' as const, p: new THREE.Vector3(380 * K - hc.x, (770 + 560) * K - hc.y, front) },   // the crown of the hook
      { part: 'hook' as const, p: new THREE.Vector3(-97 * K - hc.x, (770 - 140) * K - hc.y, front) },   // the stem
      { part: 'dot' as const, p: new THREE.Vector3(0, 0, front) },                                       // the dot
      { part: 'gap' as const, p: new THREE.Vector3(-70 * K, (770 - 292) * K, 0) },                       // the seam between them
    ];
  }, [parts]);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const s = state.current;
    if (s.born < 0) s.born = performance.now();
    // The opening: the lights come up and the camera settles in.
    if (!still) s.open = clamp((performance.now() - s.born - 250) / 2600);
    const o = 1 - Math.pow(1 - s.open, 3);
    if (o >= 0.98) st.opened = true;

    const target = pose(scroll.y);
    if (!cur.current || still) cur.current = JSON.parse(JSON.stringify(target));
    const c = cur.current!;
    const L = 3.2;
    for (let i = 0; i < 3; i++) { c.cam[i] = damp(c.cam[i], target.cam[i], L, dt); c.tgt[i] = damp(c.tgt[i], target.tgt[i], L, dt); }
    c.yaw = damp(c.yaw, target.yaw, L, dt); c.explode = damp(c.explode, target.explode, L, dt); c.fov = damp(c.fov, target.fov, L, dt);

    const cam = camera as THREE.PerspectiveCamera;
    const pull = (1 - o) * 3.5;
    cam.position.set(c.cam[0], c.cam[1] + (1 - o) * 0.6, c.cam[2] + pull);
    cam.lookAt(c.tgt[0], c.tgt[1], c.tgt[2]);
    if (Math.abs(cam.fov - c.fov) > 1e-3) { cam.fov = c.fov; cam.updateProjectionMatrix(); }

    // The turntable: what the hand gave it, then friction, then a slow spring home.
    const sp = st.spin;
    if (!sp.held) {
      sp.a += sp.v * dt;
      sp.v *= Math.exp(-1.6 * dt);
      if (Math.abs(sp.v) < 1.2) {
        const home = Math.round(sp.a / (Math.PI * 2)) * Math.PI * 2;
        sp.v += (home - sp.a) * 9 * dt;
        sp.v *= Math.exp(-2.2 * dt);
      }
    }
    if (!still) {
      s.tilt = damp(s.tilt, st.pointer.x * 0.16, 2.5, dt);
      s.tiltX = damp(s.tiltX, st.pointer.y * 0.06, 2.5, dt);
    }
    s.pathYaw = damp(s.pathYaw, (st.path - 1) * 0.32 * smooth(clamp(1 - c.explode * 4)) * (target.yaw === 0 ? 1 : 0), 3, dt);

    // A knock: the dot hops and the hook rings.
    if (st.knock) { s.hopV += 3.2; s.wobV += 2.4; st.knock = 0; }
    s.hopV += (-s.hop * 120 - s.hopV * 9) * dt; s.hop += s.hopV * dt; if (s.hop < 0 && s.hopV < 0) { s.hop = 0; s.hopV *= -0.35; }
    s.wobV += (-s.wob * 160 - s.wobV * 5) * dt; s.wob += s.wobV * dt;

    const g = turn.current, hk = hook.current, dm = dot.current;
    if (g && hk && dm) {
      g.rotation.y = c.yaw + sp.a + s.tilt + s.pathYaw;
      g.rotation.x = s.tiltX;
      const e = c.explode, ee = smooth(clamp(e));
      const hc = parts.hook.centre, dc = parts.dot.centre;
      hk.position.set(hc.x - 0.55 * ee, hc.y + 1.15 * ee, hc.z - 0.4 * ee);
      hk.rotation.set(-0.08 * ee, -0.3 * ee, 0.12 * ee + s.wob * 0.02);
      const rx = 1.15 * ee, r = (parts.dot.box.max.y - parts.dot.box.min.y) / 2;
      dm.position.set(dc.x + rx, dc.y + s.hop * 0.5, dc.z + 0.5 * ee);
      dm.rotation.set(0, 0.25 * ee, -rx / r);
    }
    scene.environmentIntensity = o;
    if (key.current) key.current.intensity = 260 * o;
    if (rim.current) rim.current.intensity = 2.6 * o;

    // Leader lines to the spec labels: projected every frame, written straight to the DOM.
    let show = smooth(clamp((c.explode - 0.55) / 0.4)) * o;
    const ap = document.getElementById('s-apart');
    if (ap) { const r = ap.getBoundingClientRect(), vh = size.height; show *= smooth(clamp(((Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh - 0.55) / 0.35)); }
    const ov = st.overlay;
    if (ov) {
      ov.style.opacity = String(show);
      ov.style.visibility = show < 0.02 ? 'hidden' : 'visible';
    }
    if (show >= 0.02 && hk && dm) {
      hk.updateWorldMatrix(true, false); dm.updateWorldMatrix(true, false);
      const W = size.width, Hh = size.height, phone = W <= 820;
      anchors.forEach((an, i) => {
        const lab = st.labels[i]; if (!lab?.a) return;
        if (an.part === 'gap') {
          const pH = new THREE.Vector3(-97 * (H / 1540) - parts.hook.centre.x, parts.hook.box.min.y - parts.hook.centre.y + 0.05, 0).applyMatrix4(hk.matrixWorld);
          const pD = new THREE.Vector3(0, parts.dot.box.max.y - parts.dot.centre.y - 0.05, 0).applyMatrix4(dm.matrixWorld);
          tmp.copy(pH).lerp(pD, 0.5);
        } else tmp.copy(an.p).applyMatrix4((an.part === 'hook' ? hk : dm).matrixWorld);
        tmp.project(cam);
        const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * Hh;
        const side = phone ? 1 : (i < 2 ? -1 : 1);
        const reach = phone ? 26 : 70;
        const ly = y + (phone ? [-34, 26, 30, -10][i] : [-46, 40, 46, -34][i]);
        const ex = x + side * reach;
        const lx = phone ? Math.max(ex + 10, W - 16 - lab.a.offsetWidth) : ex + side * (phone ? 40 : 120);
        lab.line?.setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)} L${ex.toFixed(1)} ${ly.toFixed(1)} L${lx.toFixed(1)} ${ly.toFixed(1)}`);
        lab.pin?.setAttribute('cx', x.toFixed(1)); lab.pin?.setAttribute('cy', y.toFixed(1));
        const w = lab.a.offsetWidth, h = lab.a.offsetHeight;
        const left = side < 0 ? lx - w - 8 : lx + 8;
        lab.a.style.transform = `translate(${Math.round(clamp(left, 8, W - w - 8))}px, ${Math.round(ly - h / 2)}px)`;
      });
    }
  });

  return (
    <>
      <spotLight ref={key} position={[-5, 9, 7]} angle={0.5} penumbra={1} decay={2} intensity={0} castShadow
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02} target-position={[0, 1, 0]} />
      <directionalLight ref={rim} position={[6, 4, -6]} intensity={0} color="#ffe6c8" />
      <group ref={turn}>
        <mesh ref={hook} geometry={parts.hook.geo} material={bronze} castShadow />
        <mesh ref={dot} geometry={parts.dot.geo} material={bronze} castShadow />
      </group>
    </>
  );
}

function Layers() {
  const { camera } = useThree();
  useEffect(() => { camera.layers.enable(1); }, [camera]);
  return null;
}

function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      {/* The big softbox: up, left and in front. This is the long soft highlight on the bronze. */}
      <Lightformer form="rect" intensity={3.2} color="#fff3e2" position={[-5, 4, 6]} rotation={[0, -0.7, 0]} scale={[7, 5, 1]} />
      {/* A tall strip behind and right: the rim that draws the edge. */}
      <Lightformer form="rect" intensity={4} color="#ffe2c2" position={[7, 2, -3]} rotation={[0, -1.9, 0]} scale={[0.9, 9, 1]} />
      {/* A low card for the underside, very dim. */}
      {/* A second softbox, front right, for the faces when the object turns toward it. */}
      <Lightformer form="rect" intensity={2.2} color="#fff6ea" position={[6, 3, 8]} rotation={[0, 0.65, 0]} scale={[8, 6, 1]} />
      <Lightformer form="rect" intensity={0.5} color="#ffffff" position={[0, -3, 4]} rotation={[Math.PI / 2.4, 0, 0]} scale={[10, 3, 1]} />
      {/* A thin top strip. */}
      <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[1, 8, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 0.7, 1]} />
    </Environment>
  );
}

export default function Scene() {
  const phone = useMemo(() => isPhone(), []);
  return (
    <Canvas
      className="cast-canvas"
      dpr={[1, phone ? 1.5 : 1.6]}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ fov: 22, near: 0.5, far: 120, position: [1.6, 2.1, 17] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ scene }) => { scene.background = new THREE.Color(BG); scene.fog = new THREE.Fog(BG, 18, 34); }}
      aria-hidden="true"
    >
      <Layers />
      <Studio />
      <Sweep />
      <Mark />
      <ContactShadows position={[0, 0.003, 0]} scale={7} blur={2.2} opacity={0.85} far={3.2} resolution={phone ? 256 : 512} color="#000000" frames={still ? 1 : Infinity} />
    </Canvas>
  );
}
