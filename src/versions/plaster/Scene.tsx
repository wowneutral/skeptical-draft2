// The wall and the relief, one raking light, real shadows. The camera never turns:
// it looks straight at the wall like a copy stand, and only the light moves.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';
import { clamp, damp, isPhone, still } from '@/lib/utils';
import { layout, plasterNormal, solids } from './geo';
import { frameAt, store, type Frame } from './store';

const D2R = Math.PI / 180;
const FOV = 16;
const WAYS = [{ az: 186, el: 15 }, { az: 92, el: 16 }, { az: -6, el: 15 }];
const STILL: Frame = { ax: 0.5, ay: 0.5, sx: 0.5, sy: 0.5, s: 0.9, az: 166, el: 16, band: 1 };

function Relief({ phone }: { phone: boolean }) {
  const L = useMemo(() => layout(phone), [phone]);
  const geos = useMemo(() => solids(L), [L]);
  const { camera, size, gl } = useThree();
  const light = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const live = useRef({ az: 120, el: 86, wayK: 0, px: 0, py: 0, t: 0, my: -1, band: -1 });

  const [wallMat, letterMat] = useMemo(() => {
    const nWall = plasterNormal(512);
    nWall.repeat.set(10, 10);
    const nLetter = nWall.clone(); nLetter.repeat.set(0.000125, 0.000125); nLetter.needsUpdate = true;
    const base = { color: new THREE.Color('#ece7de'), roughness: 0.94, metalness: 0 };
    const w = new THREE.MeshStandardMaterial({ ...base, normalMap: nWall, normalScale: new THREE.Vector2(0.2, 0.2) });
    const l = new THREE.MeshStandardMaterial({ ...base, color: new THREE.Color('#f3efe8'), normalMap: nLetter, normalScale: new THREE.Vector2(0.16, 0.16) });
    return [w, l];
  }, []);

  useMemo(() => {
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1;
  }, [gl]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const v = live.current;
    const vh = size.height;
    // The plan for this scroll position, or one still frame.
    const f = still ? STILL : (frameAt(scroll.y) ?? STILL);
    store.cur = f;

    // The opening: from flat, straight-on light (the wall looks blank) the light swings down to graze it.
    if (!still) v.t += dt; else v.t = 9;
    const o = clamp((v.t - 0.5) / 2.8);
    const oe = 1 - Math.pow(1 - o, 3);
    store.open = o;

    // Pointer and keyboard nudge the light; a chosen way at Join brings the shadows back from its side.
    v.px = damp(v.px, store.px, 3, dt); v.py = damp(v.py, store.py, 3, dt);
    v.wayK = damp(v.wayK, store.way >= 0 ? clamp((88 - f.el) / 12) : 0, 2.6, dt);
    const way = WAYS[Math.max(0, store.way)];
    let az = f.az + v.px * 26 + store.hold.az;
    let el = clamp(f.el - v.py * 6 + store.hold.el, 4, 88);
    if (store.way >= 0 || v.wayK > 0.001) { const k = v.wayK; az = az + (((way.az - az + 540) % 360) - 180) * k; el = el + (way.el - el) * k; }
    if (still) { az = STILL.az; el = STILL.el; }
    // Opening blend.
    az = 112 + (az - 112) * oe; el = 86 + (el - 86) * oe;
    v.az = az; v.el = el;

    // Camera: pin the anchor point of the relief to its place on screen.
    const A = size.width / Math.max(1, vh);
    const tn = Math.tan((FOV / 2) * D2R);
    const d = L.w / (f.s * 2 * tn * A);
    const X = f.ax * L.w, Y = f.ay * L.h;
    const nx = f.sx * 2 - 1, ny = 1 - f.sy * 2;
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(X - nx * d * tn * A, Y - ny * d * tn, d);
    cam.near = Math.max(0.05, d * 0.3); cam.far = d * 3 + 10;
    cam.updateProjectionMatrix();
    cam.lookAt(cam.position.x, cam.position.y, 0);

    // The light: grazing light needs more power to keep the wall the same white.
    const lt = light.current; if (lt) {
      const ca = Math.cos(az * D2R), sa = Math.sin(az * D2R), ce = Math.cos(el * D2R), se = Math.sin(el * D2R);
      target.position.set(L.w / 2, L.h / 2, 0);
      lt.position.set(L.w / 2 + ca * ce * 30, L.h / 2 + sa * ce * 30, se * 30);
      lt.intensity = 2.0 * Math.min(3.2, 1 / Math.max(0.05, se));
    }
    if (hemi.current) hemi.current.intensity = 0.95 + 0.6 * clamp((el - 40) / 50);

    // The DOM below reads the band so the text never runs under the relief.
    const band = f.band * vh;
    const my = Math.round(scroll.y + band);
    if (Math.abs(my - v.my) > 0.5) { v.my = my; document.documentElement.style.setProperty('--pl-my', my + 'px'); }
    if (Math.abs(band - v.band) > 0.5) { v.band = band; document.documentElement.style.setProperty('--pl-band', Math.round(band) + 'px'); }
  });

  const r = Math.max(L.w, L.h) / 2 + 1.4;
  const ms = phone ? 1536 : 2048;
  return (
    <>
      <primitive object={target} />
      <hemisphereLight ref={hemi} args={['#fbf7ef', '#b9b1a3', 0.55]} />
      <directionalLight
        ref={light} castShadow color="#fff6ea" target={target}
        shadow-mapSize-width={ms} shadow-mapSize-height={ms}
        shadow-camera-left={-r} shadow-camera-right={r} shadow-camera-top={r} shadow-camera-bottom={-r}
        shadow-camera-near={10} shadow-camera-far={50}
        shadow-bias={-0.0004} shadow-normalBias={0.012} shadow-radius={3}
      />
      <mesh material={wallMat} receiveShadow position={[L.w / 2, L.h / 2, 0]}>
        <planeGeometry args={[80, 80]} />
      </mesh>
      {geos.map((g, i) => <mesh key={i} geometry={g} material={letterMat} castShadow receiveShadow />)}
    </>
  );
}

export default function Scene() {
  const phone = isPhone();
  return (
    <Canvas
      className="pl-canvas"
      dpr={[1, phone ? 1.5 : 1.6]}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ fov: FOV, position: [3.5, 0.4, 30], near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      frameloop={still ? 'demand' : 'always'}
      aria-hidden
    >
      <color attach="background" args={['#e8e4dc']} />
      <Relief phone={phone} />
    </Canvas>
  );
}
