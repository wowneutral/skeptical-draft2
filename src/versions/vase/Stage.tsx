// The vase: thrown porcelain under one long softbox on a black sweep.
// Press it and the key light dies while the wall behind it comes up, so the
// vase turns into a silhouette and the white either side is two faces.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { clamp, damp, isPhone, smooth, still } from '@/lib/utils';
import { scroll } from '@/lib/scroll';
import { D, FOV, H, PROFILE, RS, ZP, frameFor } from './frame';
import { st } from './store';

const BONE = new THREE.Color('#f1ede4');

function rnd(seed: number) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

/** The lathe line: underside, foot ring, the outer wall, a rolled lip, then down inside to a floor. */
function vaseGeometry() {
  const curve = new THREE.CatmullRomCurve3(PROFILE.map(([t, r]) => new THREE.Vector3(r * RS, t * H, 0)), false, 'centripetal');
  const outer = curve.getPoints(260).map((p) => new THREE.Vector2(p.x, p.y));
  const pts: THREE.Vector2[] = [];
  // underside: a shallow recess inside the foot ring
  pts.push(new THREE.Vector2(0.001, 0.035), new THREE.Vector2(0.3, 0.034), new THREE.Vector2(0.5, 0.03), new THREE.Vector2(0.54, 0.012), new THREE.Vector2(0.56, 0.0), new THREE.Vector2(0.6, 0.0));
  for (const p of outer) if (p.y > 0.004) pts.push(p);
  const top = outer[outer.length - 1], prev = outer[outer.length - 6];
  const t = 0.075; // wall thickness at the lip
  // the outward normal at the rim, to roll the lip over
  const tan = new THREE.Vector2(top.x - prev.x, top.y - prev.y).normalize();
  const n = new THREE.Vector2(tan.y, -tan.x); // points outward
  const c = new THREE.Vector2(top.x - n.x * t / 2, top.y - n.y * t / 2);
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI; const v = new THREE.Vector2(n.x * Math.cos(a) + tan.x * Math.sin(a), n.y * Math.cos(a) + tan.y * Math.sin(a)).multiplyScalar(t / 2); pts.push(new THREE.Vector2(c.x + v.x, c.y + v.y)); }
  // inside: follow the wall down, thickening, then a rounded floor
  const inner = outer.filter((p) => p.y > H * 0.86).reverse();
  inner.forEach((p, i) => { if (i === 0) return; const k = 1 + (i / inner.length) * 0.8; pts.push(new THREE.Vector2(Math.max(0.02, p.x - t * k), p.y)); });
  const last = pts[pts.length - 1];
  for (let i = 1; i <= 8; i++) { const a = (i / 8) * (Math.PI / 2); pts.push(new THREE.Vector2(last.x * Math.cos(a), last.y - 0.16 * Math.sin(a))); }
  pts[pts.length - 1].x = 0.001;
  const g = new THREE.LatheGeometry(pts, isPhone() ? 96 : 160);
  g.computeVertexNormals();
  return g;
}

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, color = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!; draw(g);
  const tx = new THREE.CanvasTexture(c);
  tx.wrapS = THREE.RepeatWrapping; tx.wrapT = THREE.ClampToEdgeWrapping; tx.anisotropy = 4;
  if (color) tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

/** Glaze: ivory with a few iron specks, slightly thicker where it pooled; throwing rings that wander; drips in the gloss. */
function glaze() {
  const W = 1024, Hh = 1024;
  const map = canvasTex(W, Hh, (g) => {
    const r = rnd(7);
    g.fillStyle = '#f6f1e6'; g.fillRect(0, 0, W, Hh);
    for (let i = 0; i < 40; i++) { const x = r() * W, w = 10 + r() * 50; g.fillStyle = `rgba(214,206,186,${0.08 + r() * 0.1})`; g.fillRect(x, Hh * 0.5 + r() * Hh * 0.3, w, Hh * (0.1 + r() * 0.3)); }
    for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * Hh, s = 0.5 + r() * 1.6; g.fillStyle = `rgba(90,70,50,${0.25 + r() * 0.5})`; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
  }, true);
  const bump = canvasTex(W, Hh, (g) => {
    const r = rnd(11);
    g.fillStyle = '#808080'; g.fillRect(0, 0, W, Hh);
    // throwing rings, a little out of level, so turning the pot moves them
    for (let y = 0; y < Hh; y += 3 + r() * 5) {
      const a = 0.03 + r() * 0.07, ph = r() * 6.28, amp = 1 + r() * 3, c = r() < 0.5 ? 255 : 0;
      g.strokeStyle = `rgba(${c},${c},${c},${a})`; g.lineWidth = 1 + r() * 2; g.beginPath();
      for (let x = 0; x <= W; x += 16) g.lineTo(x, y + Math.sin((x / W) * 6.283 + ph) * amp);
      g.stroke();
    }
    for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * Hh, rr = 2 + r() * 5; g.fillStyle = 'rgba(40,40,40,0.25)'; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
  });
  const rough = canvasTex(W, Hh, (g) => {
    const r = rnd(23);
    g.fillStyle = 'rgb(60,60,60)'; g.fillRect(0, 0, W, Hh);
    // drips: glossier runs from the lip down
    for (let i = 0; i < 26; i++) { const x = r() * W, w = 6 + r() * 26, len = Hh * (0.15 + r() * 0.5); const gr = g.createLinearGradient(0, Hh, 0, Hh - len); gr.addColorStop(0, 'rgba(25,25,25,0.9)'); gr.addColorStop(1, 'rgba(25,25,25,0)'); g.fillStyle = gr; g.fillRect(x, Hh - len, w, len); }
    // a few duller patches where the glaze went thin
    for (let i = 0; i < 18; i++) { const x = r() * W, y = r() * Hh, rr = 20 + r() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(150,150,150,0.5)'); gr.addColorStop(1, 'rgba(150,150,150,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  });
  return new THREE.MeshPhysicalMaterial({
    color: '#ffffff', map, roughness: 0.42, roughnessMap: rough, bumpMap: bump, bumpScale: 0.6,
    clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.25, sheenColor: new THREE.Color('#fff6e8'), sheenRoughness: 0.6,
    ior: 1.5, specularIntensity: 0.6, envMapIntensity: 1,
  });
}

function Scene() {
  const { scene, size, camera } = useThree();
  const geo = useMemo(vaseGeometry, []);
  const mat = useMemo(glaze, []);
  const group = useRef<THREE.Group>(null!), vase = useRef<THREE.Mesh>(null!);
  const floor = useRef<THREE.Mesh>(null!), panel = useRef<THREE.Mesh>(null!);
  const key = useRef<THREE.SpotLight>(null!), rim = useRef<THREE.DirectionalLight>(null!);
  // the sweep: black paper, a pool of light round the foot that falls away to nothing
  const floorMat = useMemo(() => {
    const map = canvasTex(512, 512, (g) => {
      // the pool is centred just in front of the foot and is black before the back edge
      g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
      g.save(); g.translate(256, 112); g.scale(1.7, 1);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 108);
      gr.addColorStop(0, '#57534d'); gr.addColorStop(0.45, '#25231f'); gr.addColorStop(0.8, '#0a0908'); gr.addColorStop(1, '#000000');
      g.fillStyle = gr; g.fillRect(-160, -120, 320, 240); g.restore();
    }, true);
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    // matt paper: Lambert, so the softboxes never skate across it at a grazing angle
    return new THREE.MeshLambertMaterial({ map });
  }, []);
  const panelMat = useMemo(() => new THREE.MeshBasicMaterial({ color: BONE, toneMapped: false, transparent: true, opacity: 0, depthWrite: false }), []);
  const target = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => { camera.lookAt(0, 0, 0); }, [camera]);
  useEffect(() => { scene.add(target); key.current.target = target; return () => { scene.remove(target); }; }, [scene, target]);

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.25);
    // the opening: the softbox comes up and slides in
    st.open = still ? 1 : Math.min(1, st.open + dt / 2.6);
    const o = smooth(st.open);
    // the light swap is a slow crossfade, never a cut
    if (still) st.bp = st.backT; else st.bp = clamp(st.bp + Math.sign(st.backT - st.bp) * Math.min(Math.abs(st.backT - st.bp), dt / 1.9));
    const keyOn = (1 - smooth(clamp(st.bp / 0.62))) * o;
    const wall = smooth(clamp((st.bp - 0.32) / 0.68));
    // travel between shots with weight
    const t = frameFor(st.shot, size.width, size.height), f = st.f;
    if (still || !st.ready) { f.gx = t.gx; f.gy = t.gy; f.s = t.s; st.ready = true; }
    else { const k = 2.2; f.gx = damp(f.gx, t.gx, k, dt); f.gy = damp(f.gy, t.gy, k, dt); f.s = damp(f.s, t.s, k, dt); }
    group.current.position.set(f.gx, f.gy, 0);
    group.current.scale.setScalar(f.s);
    // turning: inertia from a drag, and a slow drift of the light with the scroll
    if (!still) { if (!st.drag) { st.rot += st.vel * dt; st.vel *= Math.exp(-1.7 * dt); } }
    const turn = st.rot + (still ? 0 : scroll.y * 0.0011) + (still ? 0 : (1 - o) * -1.4);
    vase.current.rotation.y = turn;
    scene.environmentRotation.set(0, turn, 0);
    scene.environmentIntensity = keyOn;
    key.current.intensity = 340 * keyOn;
    rim.current.intensity = 0.6 * keyOn;
    target.position.set(f.gx, f.gy + f.s * H * 0.45, 0);
    key.current.position.set(f.gx - 6, f.gy + 9 * f.s + 4, 7);
    // floor and wall
    floor.current.position.set(f.gx, f.gy, (12 - ZP) / 2);
    const top = (f.gy + f.s * H) * (D + ZP) / D, bot = f.gy * (D + ZP) / D;
    panel.current.position.set(0, (top + bot) / 2, -ZP);
    panel.current.scale.set(1, top - bot, 1);
    panelMat.opacity = wall; panel.current.visible = wall > 0.002;
    st.onFrame?.(f, st.bp);
  });

  return (
    <>
      <Environment resolution={256} frames={1}>
        {/* the long softbox: one tall strip, front left, makes the highlight that runs the length of the glaze */}
        <Lightformer form="rect" intensity={6} color="#fffaf0" position={[-3.2, 1, 4]} rotation={[0, -0.65, 0]} scale={[0.9, 12, 1]} />
        {/* a weaker strip opposite for the rim */}
        <Lightformer form="rect" intensity={2} color="#f3efe8" position={[4.5, 0.5, -1.5]} rotation={[0, -1.9, 0]} scale={[0.6, 10, 1]} />
        {/* a top card, so the shoulders and lip catch */}
        <Lightformer form="rect" intensity={1.4} position={[0, 6, 0.5]} rotation={[Math.PI / 2, 0, 0]} scale={[5, 3, 1]} />
        {/* a small card low on the right, a second wet line */}
        <Lightformer form="rect" intensity={1.8} position={[2.6, -0.5, 3.6]} rotation={[0, 0.6, 0]} scale={[0.25, 6, 1]} />
      </Environment>
      <spotLight ref={key} angle={0.42} penumbra={1} decay={2} intensity={0} color="#fff4e4" />
      <directionalLight ref={rim} position={[4, 3, -6]} intensity={0} color="#e9ecf2" />
      <mesh ref={panel} renderOrder={-1} material={panelMat}><planeGeometry args={[90, 1]} /></mesh>
      <mesh ref={floor} rotation={[-Math.PI / 2, 0, 0]} material={floorMat}><planeGeometry args={[14, 12 + ZP]} /></mesh>
      <group ref={group}>
        <mesh ref={vase} geometry={geo} material={mat} />
        <ContactShadows position={[0, 0.003, 0]} scale={3.4} blur={2.4} far={1.6} opacity={0.9} resolution={isPhone() ? 256 : 512} color="#000000" frames={still ? 1 : Infinity} />
      </group>
    </>
  );
}

export default function Stage() {
  return (
    <Canvas
      className="v-canvas"
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.18 }}
      camera={{ position: [0, 0, D], fov: FOV, near: 1, far: 60 }}
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none', touchAction: 'pan-y' }}
      aria-hidden
    >
      <Scene />
    </Canvas>
  );
}
