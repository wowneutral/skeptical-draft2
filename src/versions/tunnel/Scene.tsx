// The corridor: solid Bodoni phrases in a long dark hall, one torch carried by
// the camera, fog to black, and at the far end a wall of SKEPTICAL? that gives
// under the pointer.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, DepthOfField, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';
import { clamp, damp, lerp, smooth } from '@/lib/utils';
import { phraseGeo, wrap, glyphGeo, advance, kern, lineWidth } from './type3d';
import { EYE, OPEN_AT, VIEW, WALL_AT, WALL_VIEW, phrases, rig, type Phrase } from './plan';

const BONE = new THREE.Color('#f2f0eb');
const DIM = new THREE.Color('#3d3b37');
const WALLDIM = new THREE.Color('#8f8a80');
const BLACK = new THREE.Color('#000000');
const ACCENT = new THREE.Color('#c8372d');

function noiseTex(size = 256, lo = 0.55, hi = 0.85) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d')!; const img = x.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const px = i % size, py = (i / size) | 0;
    const streak = Math.sin(py * 0.09 + Math.sin(px * 0.02) * 2) * 0.5 + 0.5;
    const v = lerp(lo, hi, Math.random() * 0.6 + streak * 0.4) * 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

type Built = Phrase & { geo: THREE.BufferGeometry; mat: THREE.MeshPhysicalMaterial };

function Hall({ list, phone }: { list: Phrase[]; phone: boolean }) {
  const end = OPEN_AT(list.length);
  const len = 12 - end;
  const STEP = 7.5, W = 5.1, H = 7.6;
  const n = Math.floor(len / STEP);
  const rough = useMemo(() => { const t = noiseTex(); t.repeat.set(6, 40); return t; }, []);
  const stone = useMemo(() => { const t = noiseTex(128, 0.75, 0.95); t.repeat.set(20, 2); return t; }, []);
  const pillars = useRef<THREE.InstancedMesh>(null), lintels = useRef<THREE.InstancedMesh>(null), strips = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const z = 12 - i * STEP;
      pillars.current!.setMatrixAt(i * 2, m.makeTranslation(-W, H / 2, z));
      pillars.current!.setMatrixAt(i * 2 + 1, m.makeTranslation(W, H / 2, z));
      lintels.current!.setMatrixAt(i, m.makeTranslation(0, H - 0.35, z));
      strips.current!.setMatrixAt(i, m.makeTranslation(0, 0.004, z));
    }
    [pillars, lintels, strips].forEach((r) => { r.current!.instanceMatrix.needsUpdate = true; r.current!.computeBoundingSphere(); });
  }, [n]);
  const mid = (12 + end) / 2;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, (12 + WALL_AT(list.length) - 10) / 2]} receiveShadow>
        <planeGeometry args={[80, 12 - WALL_AT(list.length) + 30]} />
        <meshStandardMaterial color="#121110" roughness={0.5} roughnessMap={rough} metalness={0.05} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W + 0.45), H / 2, mid]} rotation-y={-s * Math.PI / 2} receiveShadow>
          <planeGeometry args={[len, H]} />
          <meshStandardMaterial color="#0e0d0c" roughness={0.92} roughnessMap={stone} />
        </mesh>
      ))}
      <mesh position={[0, H, mid]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[W * 2 + 1, len]} />
        <meshStandardMaterial color="#070707" roughness={1} />
      </mesh>
      <instancedMesh ref={pillars} args={[undefined, undefined, n * 2]} castShadow={!phone} receiveShadow>
        <boxGeometry args={[0.7, H, 0.9]} />
        <meshStandardMaterial color="#2a2825" roughness={0.72} roughnessMap={stone} />
      </instancedMesh>
      <instancedMesh ref={lintels} args={[undefined, undefined, n]}>
        <boxGeometry args={[W * 2 + 0.7, 0.7, 0.9]} />
        <meshStandardMaterial color="#2a2825" roughness={0.72} />
      </instancedMesh>
      <instancedMesh ref={strips} args={[undefined, undefined, n]} receiveShadow>
        <boxGeometry args={[W * 2, 0.01, 0.06]} />
        <meshStandardMaterial color="#8a8578" roughness={0.3} metalness={1} />
      </instancedMesh>
    </group>
  );
}

const WORD = 'SKEPTICAL?';
function Wall({ count, phone }: { count: number; phone: boolean }) {
  const Z = WALL_AT(count);
  const S = phone ? 1.25 : 1.7, LEAD = S * 1.42, ROWS = phone ? 9 : 7, REP = 3;
  const wordW = lineWidth(WORD) * S, gapW = 0.55 * S;
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const chars = useMemo(() => [...new Set(WORD.split(''))], []);
  const geos = useMemo(() => chars.map((c) => { const g = glyphGeo(c)!.clone(); g.scale(S, S, S * 1.6); return g; }), [chars, S]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.42, metalness: 0 }), []);
  // every letter: which mesh, which instance, its rest position
  const items = useMemo(() => {
    const out: { m: number; k: number; x: number; y: number; cx: number; cy: number; row: number; ch: string; center: boolean }[] = [];
    const per = new Array(chars.length).fill(0);
    const mid = ROWS - 3;  // the row at eye level, two rows above the floor row
    for (let r = 0; r < ROWS; r++) {
      const shift = (Math.abs(r - mid) % 2 ? 0.5 : 0) * (wordW + gapW);
      const y = 0.25 + (ROWS - 1 - r) * LEAD;
      for (let w = -REP; w <= REP; w++) {
        let x = -wordW / 2 + w * (wordW + gapW) - shift;
        for (let i = 0; i < WORD.length; i++) {
          const ch = WORD[i]; const m = chars.indexOf(ch);
          out.push({ m, k: per[m]++, x, y, cx: x + advance(ch) * S / 2, cy: y + S / 2, row: r, ch, center: r === mid && w === 0 });
          x += (advance(ch) + (i < WORD.length - 1 ? kern(ch, WORD[i + 1]) : 0)) * S;
        }
      }
    }
    return { out, per };
  }, [chars, ROWS, LEAD, S, wordW, gapW, phone]);
  const sim = useMemo(() => ({ p: new Float32Array(items.out.length), v: new Float32Array(items.out.length) }), [items]);
  useEffect(() => {
    const m = new THREE.Matrix4(); const c = new THREE.Color();
    items.out.forEach((it) => {
      const mesh = meshes.current[it.m]!;
      mesh.setMatrixAt(it.k, m.makeTranslation(it.x, it.y, Z + 0.5));
      const midRow = items.out.find((o) => o.center)!.row;
      c.copy(it.center ? (it.ch === '?' ? ACCENT : BONE) : WALLDIM).lerp(BLACK, it.center ? 0 : Math.min(0.6, Math.abs(it.row - midRow) * 0.09));
      mesh.setColorAt(it.k, c);
    });
    meshes.current.forEach((mm) => { if (!mm) return; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); });
  }, [items, Z]);
  const { camera } = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -(Z + 0.5)), [Z]);
  const hit = useMemo(() => new THREE.Vector3(), []), rh = useMemo(() => new THREE.Vector3(9999, 9999, 0), []);
  const mtx = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), e = useMemo(() => new THREE.Euler(), []);
  const pos = useMemo(() => new THREE.Vector3(), []), one = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const sleep = useRef(0), seen = useRef(-1);
  useFrame((_, dt) => {
    if (camera.position.z > OPEN_AT(count) + 10) { sleep.current = 0; return; }
    dt = Math.min(dt, 1 / 30);
    let has = false;
    if (rig.pointer.has) {
      ray.setFromCamera(new THREE.Vector2(rig.pointer.x, rig.pointer.y), camera);
      has = !!ray.ray.intersectPlane(plane, hit);
    }
    const age = performance.now() / 1000 - rig.ripple.t;
    if (seen.current !== rig.ripple.t) { seen.current = rig.ripple.t; ray.setFromCamera(new THREE.Vector2(rig.ripple.x, rig.ripple.y), camera); if (!ray.ray.intersectPlane(plane, rh)) rh.set(9999, 9999, 0); }
    let moving = 0;
    items.out.forEach((it, i) => {
      let target = 0;
      if (has) { const d2 = (it.cx - hit.x) ** 2 + (it.cy - hit.y) ** 2; target += Math.exp(-d2 / (2 * 1.5 * 1.5)) * 1.1; }
      if (age < 4) {
        const d = Math.hypot(it.cx - rh.x, it.cy - rh.y);
        target += Math.exp(-((d - age * 11) ** 2) / 1.2) * Math.exp(-age * 0.9) * 1.6;
      }
      // a spring with a little overshoot, so the letters feel heavy
      const a = (target - sim.p[i]) * 70 - sim.v[i] * 9;
      sim.v[i] += a * dt; sim.p[i] += sim.v[i] * dt;
      moving += Math.abs(sim.v[i]) + Math.abs(sim.p[i] - target);
      e.set(0, has ? clamp((it.cx - hit.x) * 0.05, -0.12, 0.12) * sim.p[i] : 0, 0);
      q.setFromEuler(e); pos.set(it.x, it.y, Z + 0.5 - sim.p[i]);
      mtx.compose(pos, q, one);
      meshes.current[it.m]!.setMatrixAt(it.k, mtx);
    });
    if (moving > 0.001 || sleep.current < 2) { sleep.current = moving > 0.001 ? 0 : sleep.current + 1; meshes.current.forEach((mm) => mm && (mm.instanceMatrix.needsUpdate = true)); }
  });
  return (
    <group>
      {chars.map((c, i) => (
        <instancedMesh key={c} ref={(el) => { meshes.current[i] = el; }} args={[geos[i], mat, items.per[i]]} castShadow={!phone} receiveShadow={false} frustumCulled={false} />
      ))}
      <mesh position={[0, 12, Z - 0.4]} receiveShadow>
        <planeGeometry args={[90, 30]} />
        <meshStandardMaterial color="#141311" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Phrases({ built }: { built: Built[] }) {
  return (
    <>
      {built.map((b) => (
        <mesh key={b.id} name={b.id} geometry={b.geo} material={b.mat} position={[b.x, b.y, b.z]} rotation-y={b.ry} castShadow />
      ))}
    </>
  );
}

function Rig({ built, count, phone, dof }: { built: Built[]; count: number; phone: boolean; dof: React.RefObject<any> }) {
  const { camera, scene } = useThree();
  const torch = useRef<THREE.SpotLight>(null), endLight = useRef<THREE.SpotLight>(null);
  const cur = useRef({ p: new THREE.Vector3(0, EYE, VIEW + 9), l: new THREE.Vector3(0, 2, 0), sx: 0, sy: 0, init: false });
  const tp = useMemo(() => new THREE.Vector3(), []), tl = useMemo(() => new THREE.Vector3(), []);
  const a = useMemo(() => ({ p: new THREE.Vector3(), l: new THREE.Vector3() }), []), b = useMemo(() => ({ p: new THREE.Vector3(), l: new THREE.Vector3() }), []);
  const focus = useMemo(() => new THREE.Vector3(), []);
  const WALL = WALL_AT(count), OPEN = OPEN_AT(count);
  const pose = (i: number, o: { p: THREE.Vector3; l: THREE.Vector3 }) => {
    if (i < 0) { o.p.set(0, phone ? 3.4 : 4.4, WALL + WALL_VIEW + (phone ? 3 : 0)); o.l.set(0, phone ? 4.4 : 5.9, WALL); return; }
    const ph = built[i];
    o.p.set(ph.x * 0.5, EYE + (ph.y - 2) * 0.35, ph.z + VIEW + (phone ? 1.2 : 0));
    o.l.set(ph.x * 0.85, ph.y - 0.15, ph.z - 1);
  };
  useEffect(() => { scene.fog = new THREE.Fog('#050505', 7, phone ? 34 : 40); scene.background = new THREE.Color('#050505'); }, [scene, phone]);
  useFrame((state, dt) => {
    dt = Math.min(dt, 1 / 20);
    const keys = rig.keys;
    if (keys.length) {
      const y = scroll.y;
      let j = 0; while (j < keys.length - 2 && y > keys[j + 1].y) j++;
      const k0 = keys[j], k1 = keys[Math.min(j + 1, keys.length - 1)];
      const t = k1.y > k0.y ? clamp((y - k0.y) / (k1.y - k0.y)) : 0;
      const e = smooth(clamp((t - 0.1) / 0.8));
      pose(k0.i, a); pose(k1.i, b);
      tp.lerpVectors(a.p, b.p, e); tl.lerpVectors(a.l, b.l, e);
    } else { pose(0, a); tp.copy(a.p); tl.copy(a.l); }
    // the opening: lights come up while the camera walks the last few metres in
    const intro = rig.intro;
    tp.z += (1 - smooth(intro)) * 9;
    const c = cur.current;
    if (!c.init) { c.p.copy(tp); c.l.copy(tl); c.init = true; }
    const lam = 5.5;
    c.p.set(damp(c.p.x, tp.x, lam, dt), damp(c.p.y, tp.y, lam, dt), damp(c.p.z, tp.z, lam, dt));
    c.l.set(damp(c.l.x, tl.x, lam, dt), damp(c.l.y, tl.y, lam, dt), damp(c.l.z, tl.z, lam, dt));
    const tt = state.clock.elapsedTime;
    const px = rig.pointer.has ? rig.pointer.x : Math.sin(tt * 0.31) * 0.35, py = rig.pointer.has ? rig.pointer.y : Math.sin(tt * 0.23) * 0.2;
    c.sx = damp(c.sx, px, 2.5, dt); c.sy = damp(c.sy, py, 2.5, dt);
    camera.position.set(c.p.x + c.sx * 0.35, c.p.y + c.sy * 0.18, c.p.z);
    camera.lookAt(c.l.x + c.sx * 0.6, c.l.y + c.sy * 0.3, c.l.z);

    // phrases: the one you are reading is lit and sharp; the one you pass lifts away overhead
    const camZ = c.p.z;
    let best = -1, bf = 0;
    built.forEach((ph, i) => {
      const d = camZ - ph.z - (phone ? 1.2 : 0);
      const f = 1 - clamp(Math.abs(d - VIEW) / 8);
      const k = clamp(1 - d / (VIEW * 0.66));
      ph.mat.color.copy(DIM).lerp(BONE, smooth(f)).lerp(BLACK, k * 0.85);
      ph.mat.emissive.copy(BONE).multiplyScalar(0.05 * f);
      const m = state.scene.getObjectByName(ph.id);
      if (m) { m.position.y = ph.y + k * k * 7.5; m.rotation.x = -k * 0.35; m.visible = d > -2; }
      if (f > bf) { bf = f; best = i; }
    });
    const endK = clamp((OPEN + 6 - camZ) / (OPEN + 6 - (WALL + WALL_VIEW)));
    if (best >= 0 && endK < 0.5) focus.set(built[best].x, built[best].y, built[best].z); else focus.set(c.sx * 3, 4.5 + c.sy * 2, WALL + 0.5);
    if (dof.current?.target) dof.current.target.lerp(focus, 1 - Math.exp(-6 * dt));

    // one torch, carried just above and behind the eye, aimed where the pointer is
    const L = torch.current;
    if (L) {
      L.position.set(camera.position.x + 0.5, camera.position.y + 1.7, camera.position.z + 1.2);
      L.target.position.set(focus.x * (1 - endK) + c.sx * (2.5 + endK * 4), (endK > 0.5 ? 4 : focus.y) + c.sy * (1.4 + endK * 3), focus.z);
      L.target.updateMatrixWorld();
      L.intensity = (phone ? 230 : 260) * smooth(intro) * (1 - endK * 0.45);
    }
    if (endLight.current) { endLight.current.target.position.set(0, 4, WALL); endLight.current.target.updateMatrixWorld(); }
    if (endLight.current) endLight.current.intensity = 1700 * smooth(endK) * smooth(intro);
  });
  return (
    <>
      <spotLight ref={torch} angle={0.62} penumbra={1} decay={2} distance={60} color="#fff4e6" castShadow={!phone}
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.03} shadow-camera-near={0.5} shadow-camera-far={40} />
      <spotLight ref={endLight} position={[0, 17, WALL + 13]} angle={0.95} penumbra={1} decay={2} distance={80} color="#fff8ee" castShadow={!phone}
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.04} />
      <ambientLight intensity={0.06} />
    </>
  );
}

function World({ phone, onReady }: { phone: boolean; onReady: () => void }) {
  const list = useMemo(() => phrases(phone), [phone]);
  const built = useMemo<Built[]>(() => list.map((p) => {
    const lines = wrap(p.text, p.max);
    const { geo } = phraseGeo(lines, p.size, p.align);
    const mat = new THREE.MeshPhysicalMaterial({ color: BONE, roughness: 0.36, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4, emissive: new THREE.Color(0) });
    return { ...p, geo, mat };
  }), [list]);
  const dof = useRef<any>(null);
  useEffect(() => { const id = requestAnimationFrame(() => onReady()); return () => cancelAnimationFrame(id); }, [onReady]);
  // the DOF effect picks its own target object; make sure it exists from the start
  return (
    <>
      <Environment resolution={64} frames={1} environmentIntensity={0.42}>
        <Lightformer form="rect" intensity={1.6} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={0.5} position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={0.25} position={[6, 2, -3]} rotation-y={-Math.PI / 2} scale={[4, 2, 1]} />
      </Environment>
      <Hall list={list} phone={phone} />
      <Phrases built={built} />
      <Wall count={list.length} phone={phone} />
      <Rig built={built} count={list.length} phone={phone} dof={dof} />
      {phone ? (
        <EffectComposer multisampling={0}>
          <Vignette offset={0.28} darkness={0.72} />
          <Noise opacity={0.035} />
        </EffectComposer>
      ) : (
        <EffectComposer multisampling={4}>
          <DepthOfField ref={dof} target={[0, 2, 0]} worldFocusRange={5} bokehScale={3.2} />
          <Vignette offset={0.28} darkness={0.72} />
          <Noise opacity={0.035} />
        </EffectComposer>
      )}
    </>
  );
}

export default function Scene({ phone, paused, onReady }: { phone: boolean; paused: boolean; onReady: () => void }) {
  return (
    <Canvas
      className="tn-canvas"
      dpr={[1, phone ? 1.4 : 1.6]}
      frameloop={paused ? 'never' : 'always'}
      shadows={phone ? false : { type: THREE.PCFShadowMap }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ fov: phone ? 56 : 38, near: 0.2, far: 120, position: [0, EYE, VIEW + 9] }}
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <World phone={phone} onReady={onReady} />
    </Canvas>
  );
}
