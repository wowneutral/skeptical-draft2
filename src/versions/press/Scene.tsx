// Version 46's studio: one sort of type metal on a dark sweep, a bone sheet
// and a small ink slab. Pressing turns it face down onto the sheet; the sheet's
// texture is a canvas the prints are drawn into. Past the opening the canvas
// goes clear and the same sort visits the broadside: it stamps the record's
// margin, and lies on its side at Join.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';
import { clamp, damp, isPhone, lerp, smooth, still } from '@/lib/utils';
import { bodyGeometry, castTexture, D, drawDeboss, drawPrint, faceGeometry, GLYPH, HT, M, W } from './geo';
import { st } from './store';
import { thud } from './sound';

type Lay = {
  sheet: { x: number; z: number; w: number; h: number; yaw: number };
  slab: { x: number; z: number; w: number; d: number };
  cam: THREE.Vector3; tgt: THREE.Vector3; fov: number;
};
function layout(phone: boolean): Lay {
  if (phone) return {
    sheet: { x: 1.85, z: 0.2, w: 2.0, h: 2.6, yaw: -0.08 },
    slab: { x: 1.55, z: -1.8, w: 1.2, d: 0.7 },
    tgt: new THREE.Vector3(1.0, 0.9, 0.2), cam: new THREE.Vector3(0.5, 11.4, 15.7), fov: 30,
  };
  return {
    sheet: { x: 3.05, z: 0.55, w: 3.0, h: 4.0, yaw: -0.07 },
    slab: { x: 1.55, z: -2.35, w: 1.7, d: 1.05 },
    tgt: new THREE.Vector3(-0.15, 1.75, 0.45), cam: new THREE.Vector3(-1.25, 8.9, 10.6), fov: 25,
  };
}

const PX = 300; // canvas pixels per world unit on the sheet
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const DUR = 1.45, AUTO = 1.9, STAMP = 1.8;

/** The seamless: a floor that curves up into a wall behind. */
function Sweep() {
  const geometry = useMemo(() => {
    const zf = -4.5, R = 6, prof: [number, number][] = [[40, 0], [zf, 0]];
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
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#23211e', roughness: 0.94, metalness: 0, envMapIntensity: 0.08 }), []);
  useEffect(() => () => { geometry.dispose(); mat.dispose(); }, [geometry, mat]);
  return <mesh geometry={geometry} material={mat} receiveShadow />;
}

function Studio({ phone }: { phone: boolean }) {
  const L = useMemo(() => layout(phone), [phone]);
  const { camera, gl, size } = useThree();

  // ---- the sheet: paper, an ink layer, a deboss layer ----
  const sheet = useMemo(() => {
    const cw = Math.round(L.sheet.w * PX), ch = Math.round(L.sheet.h * PX);
    const mk = () => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; return c; };
    const paper = mk(), ink = mk(), view = mk(), bump = mk();
    const pg = paper.getContext('2d')!;
    pg.fillStyle = '#ece6d8'; pg.fillRect(0, 0, cw, ch);
    let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2600; i++) { pg.fillStyle = `rgba(${r() < 0.5 ? '120,110,95' : '255,255,250'},${0.05 + r() * 0.06})`; pg.fillRect(r() * cw, r() * ch, 1 + r() * 7, 0.6); }
    const bg = bump.getContext('2d')!;
    bg.fillStyle = '#c8c8c8'; bg.fillRect(0, 0, cw, ch);
    const map = new THREE.CanvasTexture(view); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    const bmap = new THREE.CanvasTexture(bump);
    const compose = () => { const v = view.getContext('2d')!; v.drawImage(paper, 0, 0); v.drawImage(ink, 0, 0); map.needsUpdate = true; bmap.needsUpdate = true; };
    compose();
    const mat = new THREE.MeshStandardMaterial({ map, bumpMap: bmap, bumpScale: 1.4, roughness: 0.88, metalness: 0, envMapIntensity: 0.55 });
    return { cw, ch, ink, bump, compose, mat, map, bmap };
  }, [L]);
  useEffect(() => { st.inkLayer = sheet.ink; }, [sheet]);
  const sheetMesh = useRef<THREE.Mesh>(null);

  // ---- the sort ----
  const low = phone;
  const body = useMemo(() => bodyGeometry(low), [low]);
  const face = useMemo(() => faceGeometry(low), [low]);
  const tex = useMemo(() => castTexture(512), []);
  const metal = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#a3a5a8', metalness: 0.55, roughness: 0.58, roughnessMap: tex, bumpMap: tex, bumpScale: 0.9,
    clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 1.6,
  }), [tex]);
  const inkMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#060606', metalness: 0.2, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.7 }), []);
  const shoulder = useMemo(() => metal.clone(), [metal]);
  const slabInk = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#050505', roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 }), []);
  const plate = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#5d5f62', metalness: 0.85, roughness: 0.4, roughnessMap: tex }), [tex]);
  useEffect(() => () => {
    [body, face].forEach((g) => g.dispose()); [metal, inkMat, shoulder, slabInk, plate, sheet.mat].forEach((m) => m.dispose());
    tex.dispose(); sheet.map.dispose(); sheet.bmap.dispose();
  }, [body, face, metal, inkMat, shoulder, slabInk, plate, tex, sheet]);

  const base = useRef<THREE.Group>(null), spin = useRef<THREE.Group>(null), studio = useRef<THREE.Group>(null);
  const key = useRef<THREE.SpotLight>(null);
  const sortMeshes = useRef<THREE.Object3D[]>([]);
  const slabMesh = useRef<THREE.Mesh>(null);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const floor = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const v = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), n: new THREE.Vector2() }), []);
  const s = useRef({
    born: -1, x: 0, y: 0, z: 0, rx: 0, rz: 0, roll: 0, yaw: 0, printed: false, shake: 0,
    spot: new THREE.Vector3(), spotYaw: 0, last: new THREE.Vector3(), cam: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 25,
    stampHit: false, phaseB: false, frames: 0,
  });

  const print = (wx: number, wz: number, yaw: number) => {
    const m = sheetMesh.current; if (!m) return;
    const p = m.worldToLocal(v.c.set(wx, 0, wz));
    const u = (p.x / L.sheet.w + 0.5) * sheet.cw, vv = (0.5 - p.y / L.sheet.h) * sheet.ch;
    const rot = -(yaw - L.sheet.yaw);
    const ink = st.ink;
    drawPrint(sheet.ink.getContext('2d')!, u, vv, GLYPH * PX, rot, ink, st.prints + 1);
    drawDeboss(sheet.bump.getContext('2d')!, u, vv, GLYPH * PX, rot);
    sheet.compose();
    st.prints += 1; st.lastInk = ink;
    st.ink = Math.max(0.1, ink * 0.74);
    st.onPrint?.(st.prints, ink);
  };

  // Where the nth print lands: near the middle, each a little askew of the last.
  const spotFor = (n: number) => {
    // Four places on the sheet, then each new one lands over an old one, a little askew.
    const c = Math.cos(L.sheet.yaw), sn = Math.sin(L.sheet.yaw);
    const slots = phone ? [[-0.45, 0], [0.45, 0.05], [0, 0.1], [-0.2, -0.05]] : [[-0.62, -0.88], [0.6, -0.8], [-0.55, 0.88], [0.64, 0.82]];
    const [bx, bz] = slots[n % 4], j = n >= 4 ? 0.09 : 0.03;
    const ox = bx + Math.sin(n * 2.1) * j, oz = bz + Math.cos(n * 1.7) * j;
    s.current.spot.set(L.sheet.x + ox * c + oz * sn, 0, L.sheet.z - ox * sn + oz * c);
    s.current.spotYaw = L.sheet.yaw + Math.sin(n * 3.3) * (n >= 4 ? 0.1 : 0.05);
  };

  // Reduced motion: the sort at rest beside one finished print.
  useEffect(() => {
    if (!still || st.prints) return;
    spotFor(0);
    const t = setTimeout(() => print(s.current.spot.x, s.current.spot.z, s.current.spotYaw), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // What the pointer is over, for the page's input layer.
  useEffect(() => {
    st.hit = (x, y) => {
      if (s.current.phaseB) return 'none';
      ray.setFromCamera(v.n.set(x, y), camera);
      if (ray.intersectObjects(sortMeshes.current, false).length) return 'sort';
      if (slabMesh.current && ray.intersectObject(slabMesh.current, false).length) return 'slab';
      return 'none';
    };
  }, [camera, ray, v]);

  useFrame((state, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const S = s.current, now = performance.now();
    if (S.born < 0) S.born = now;
    const open = still ? 1 : smooth(clamp((now - S.born - 150) / 2400));
    const vh = size.height;
    const p = clamp(scroll.y / vh);
    const phaseB = scroll.y > vh * 1.02;
    S.phaseB = phaseB;
    if (studio.current) studio.current.visible = !phaseB;
    const cam = camera as THREE.PerspectiveCamera;

    // ---- face ink: wet black when full, the grey metal shows as it runs dry ----
    const ink = st.ink;
    inkMat.color.setRGB(lerp(0.2, 0.004, ink), lerp(0.2, 0.004, ink), lerp(0.21, 0.004, ink));
    inkMat.roughness = lerp(0.5, 0.12, ink); inkMat.clearcoat = lerp(0.15, 1, ink); inkMat.metalness = lerp(0.85, 0.15, ink);

    if (!phaseB) {
      // ---- camera: the opening dolly, then the scroll tilts it down onto the sheet ----
      if (phone) { if (!cam.view || cam.view.offsetY !== Math.round(size.height * 0.2)) { cam.setViewOffset(size.width, size.height, 0, Math.round(size.height * 0.2), size.width, size.height); } }
      const top = v.a.set(L.sheet.x, phone ? 6.5 : 7.6, L.sheet.z + 0.02);
      const tc = v.b.set(L.sheet.x, 0, L.sheet.z);
      const e = smooth(p);
      S.cam.lerpVectors(L.cam, top, e); S.tgt.lerpVectors(L.tgt, tc, e);
      S.cam.multiplyScalar(1).add(v.c.set(0, (1 - open) * 1.2, (1 - open) * 4).multiplyScalar(1 - e));
      if (S.shake > 0) { S.cam.y += Math.sin(now * 0.09) * 0.03 * S.shake; S.shake = Math.max(0, S.shake - dt * 4); }
      cam.position.copy(S.cam); cam.lookAt(S.tgt);
      const fov = lerp(L.fov, phone ? 30 : 26, e);
      if (Math.abs(cam.fov - fov) > 1e-3) { cam.fov = fov; cam.updateProjectionMatrix(); }
      if (key.current) key.current.intensity = 260 * open;

      // ---- the sort ----
      let tx = 0, ty = 0, tz = 0, roll = 0, yaw = 0, tilt = true;
      const pr = st.press >= 0 ? (now - st.press) / 1000 / DUR : -1;
      const au = st.auto >= 0 ? (now - st.auto) / 1000 / AUTO : -1;
      if (pr >= 0 && pr < 1) {
        tilt = false;
        if (!S.printed && pr < 0.05) spotFor(st.prints);
        const sp = S.spot, up = 2.0;
        if (pr >= 0.42 && !S.printed) { S.printed = true; print(sp.x, sp.z, S.spotYaw); thud(1); S.shake = 1; }
        if (pr < 0.32) { const k = ease(pr / 0.32); tx = lerp(0, sp.x, k); tz = lerp(0, sp.z, k); ty = Math.sin(k * Math.PI * 0.5) * up; roll = k * Math.PI; yaw = lerp(0, S.spotYaw, k); }
        else if (pr < 0.42) { const k = (pr - 0.32) / 0.1; tx = sp.x; tz = sp.z; ty = up * (1 - k * k); roll = Math.PI; yaw = S.spotYaw; }
        else if (pr < 0.52) { tx = sp.x; tz = sp.z; ty = -0.012 * Math.sin(((pr - 0.42) / 0.1) * Math.PI); roll = Math.PI; yaw = S.spotYaw;
          if (!S.printed) { S.printed = true; print(sp.x, sp.z, S.spotYaw); thud(1); S.shake = 1; } }
        else if (pr < 0.62) { const k = 1 - Math.pow(1 - (pr - 0.52) / 0.1, 3); tx = sp.x; tz = sp.z; ty = up * 0.8 * k; roll = Math.PI; yaw = S.spotYaw; }
        else { const k = ease(clamp((pr - 0.62) / 0.33)); tx = lerp(sp.x, 0, k); tz = lerp(sp.z, 0, k); ty = up * 0.8 * (1 - k) + Math.sin(k * Math.PI) * 0.4; roll = Math.PI + k * Math.PI; yaw = lerp(S.spotYaw, 0, k); }
      } else if (au >= 0 && au < 1) {
        tilt = false;
        const sx = L.slab.x, sz = L.slab.z, top = 0.09;
        if (au < 0.25) { const k = ease(au / 0.25); tx = sx * k; tz = sz * k; ty = Math.sin(k * Math.PI) * 1.2 + top * k; roll = k * Math.PI; }
        else if (au < 0.75) { const k = (au - 0.25) / 0.5; tx = sx + Math.sin(k * Math.PI * 4) * L.slab.w * 0.25; tz = sz + Math.sin(k * Math.PI * 2) * 0.1; ty = top; roll = Math.PI; st.ink = Math.min(1, st.ink + dt * 1.6); }
        else { const k = ease((au - 0.75) / 0.25); tx = sx * (1 - k); tz = sz * (1 - k); ty = Math.sin(k * Math.PI) * 1.2 + top * (1 - k); roll = Math.PI + k * Math.PI; }
      } else if (st.drag) {
        tilt = false;
        ray.setFromCamera(v.n.set(st.pointer.x, st.pointer.y), cam);
        if (ray.ray.intersectPlane(floor, v.a)) {
          const over = Math.abs(v.a.x - L.slab.x) < L.slab.w / 2 + 0.2 && Math.abs(v.a.z - L.slab.z) < L.slab.d / 2 + 0.3;
          tx = clamp(v.a.x, -2.5, L.sheet.x + 2); tz = clamp(v.a.z, -3.5, 4.5); ty = over ? 0.09 : 0.45; roll = Math.PI;
          const moved = Math.hypot(S.x - S.last.x, S.z - S.last.z);
          if (over && S.y < 0.2) st.ink = Math.min(1, st.ink + moved * 0.5);
        }
      } else {
        if (pr >= 1) { st.press = -1; S.printed = false; }
        if (au >= 1) st.auto = -1;
      }
      S.last.set(S.x, 0, S.z);
      const L1 = st.drag ? 9 : 30;
      S.x = damp(S.x, tx, L1, dt); S.y = damp(S.y, ty, st.drag ? 7 : 30, dt); S.z = damp(S.z, tz, L1, dt);
      S.roll = st.drag || (pr >= 0 && pr < 1) || (au >= 0 && au < 1) ? damp(S.roll, roll, st.drag ? 8 : 40, dt) : damp(S.roll % (Math.PI * 2) > Math.PI ? S.roll - Math.PI * 2 : S.roll, 0, 8, dt);
      S.yaw = damp(S.yaw, yaw, 20, dt);
      const px = still ? 0 : st.pointer.x, py = still ? 0 : st.pointer.y;
      S.rx = damp(S.rx, tilt ? 0.1 - py * 0.12 : 0, 3, dt); S.rz = damp(S.rz, tilt ? -px * 0.14 : (S.x - S.last.x) * -2, 3, dt);
      // Where the sort and the slab are on screen, for the page's own tests.
      if ((S.frames = (S.frames + 1) % 12) === 1) {
        const hit = document.querySelector('.v-press .pr-hit') as HTMLElement | null;
        const sc = (x: number, y: number, z: number) => { v.c.set(x, y, z).project(cam); return `${Math.round((v.c.x + 1) / 2 * size.width)},${Math.round((1 - v.c.y) / 2 * size.height)}`; };
        if (hit) { hit.dataset.sort = sc(S.x, 1.6, S.z); hit.dataset.slab = sc(L.slab.x, 0.08, L.slab.z); }
      }
      if (base.current && spin.current) {
        base.current.visible = true; base.current.scale.setScalar(1);
        base.current.position.set(S.x, S.y, S.z);
        base.current.rotation.set(S.rx, 0, S.rz);
        spin.current.rotation.set(0, S.yaw, S.roll, 'YZX');
      }
      return;
    }

    // ---- past the opening: a clear canvas over the broadside ----
    if (cam.view) cam.clearViewOffset();
    cam.position.set(0, 9, 15); cam.lookAt(0, 0, 0);
    if (cam.fov !== 18) { cam.fov = 18; cam.updateProjectionMatrix(); }
    if (key.current) key.current.intensity = 260;
    const g = base.current, sp = spin.current; if (!g || !sp) return;
    const place = (el: HTMLElement, fx = 0.5, fy = 0.5) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width * fx, cy = r.top + r.height * fy;
      const toW = (x: number, y: number, out: THREE.Vector3) => { ray.setFromCamera(v.n.set((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1), cam); ray.ray.intersectPlane(floor, out); return out; };
      toW(cx, cy, v.a); toW(cx + 100, cy, v.b);
      const upp = v.a.distanceTo(v.b) / 100;
      return { at: v.a, k: (r.width * upp) / (GLYPH * (M.w / M.h)), vis: r.bottom > -200 && r.top < size.height + 200 };
    };
    const join = st.joinSlot ? place(st.joinSlot, 0.5, 0.86) : null;
    const tS = st.stamp >= 0 ? (now - st.stamp) / 1000 / STAMP : -1;
    g.rotation.set(0, 0, 0);
    if (st.recordMark && tS >= 0 && tS < 1) {
      const P = place(st.recordMark); const k = P.k * 0.92;
      g.visible = true; g.scale.setScalar(k);
      let y = 0.002, back = 0;
      if (tS >= 0.38 && !S.stampHit) { S.stampHit = true; st.recordMark.classList.add('is-printed'); thud(0.5); }
      if (tS < 0.38) { const e = 1 - tS / 0.38; y = 7 * e * e; back = -3 * e; }
      else if (tS < 0.5) { /* held on the paper */ }
      else { const e = smooth((tS - 0.5) / 0.5); y = 8 * e; back = -4 * e; }
      g.position.set(P.at.x, (y + HT / 2) * k - HT / 2 * k, P.at.z + back * k);
      sp.rotation.set(0, 0, Math.PI, 'YZX');
    } else if (join && join.vis) {
      const k = join.k;
      g.visible = true; g.scale.setScalar(k);
      // On its side, face to the reader: the mark backwards, beside the print that reads forwards.
      g.position.set(join.at.x, D / 2 * k - HT / 2 * k, join.at.z - (HT / 2) * k);
      sp.rotation.set(Math.PI / 2, 0, 0, 'XYZ');
    } else {
      g.visible = false;
      if (tS >= 1 && !S.stampHit && st.recordMark) { S.stampHit = true; st.recordMark.classList.add('is-printed'); }
    }
    void state; void gl;
  });

  const sw = L.sheet;
  return (
    <>
      <group ref={studio}>
        <Sweep />
        <group position={[sw.x, 0.004, sw.z]} rotation={[0, sw.yaw, 0]}>
          <mesh ref={sheetMesh} rotation={[-Math.PI / 2, 0, 0]} material={sheet.mat} receiveShadow>
            <planeGeometry args={[sw.w, sw.h]} />
          </mesh>
        </group>
        <group position={[L.slab.x, 0, L.slab.z]}>
          <mesh material={plate} position={[0, 0.03, 0]} castShadow receiveShadow>
            <boxGeometry args={[L.slab.w + 0.24, 0.06, L.slab.d + 0.24]} />
          </mesh>
          <mesh ref={slabMesh} material={slabInk} position={[0, 0.07, 0]} receiveShadow>
            <boxGeometry args={[L.slab.w, 0.025, L.slab.d]} />
          </mesh>
        </group>
      </group>
      <group ref={base}>
        <group ref={spin} position={[0, HT / 2, 0]}>
          <group position={[0, -HT / 2, 0]}>
            <mesh ref={(m) => { if (m && !sortMeshes.current.includes(m)) sortMeshes.current.push(m); }} geometry={body} material={metal} castShadow receiveShadow />
            <mesh ref={(m) => { if (m && !sortMeshes.current.includes(m)) sortMeshes.current.push(m); }} geometry={face} material={[inkMat, shoulder]} castShadow />
          </group>
        </group>
      </group>
      <spotLight ref={key} position={[-5, 11, 6]} angle={0.42} penumbra={0.9} intensity={0} decay={2} castShadow
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02} target-position={[1, 0, 0]} />
      <directionalLight position={[6, 4, -6]} intensity={1.6} color="#e9e2d4" />
      <ambientLight intensity={0.05} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[-3, 7, 4]} rotation-x={Math.PI / 2} scale={[7, 5, 1]} />
        <Lightformer form="rect" intensity={5} position={[7, 3, -3]} rotation-y={-Math.PI / 2} scale={[1.2, 9, 1]} color="#fff4e2" />
        <Lightformer form="rect" intensity={0.8} position={[-8, 2, 0]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="ring" intensity={2} position={[0, 4, 9]} scale={2} />
      </Environment>
      {/* keep W imported for the layout constants */}
      <group userData={{ w: W }} />
    </>
  );
}

export default function Scene() {
  const phone = useMemo(() => isPhone(), []);
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      camera={{ fov: 25, near: 0.5, far: 120, position: [0, 6, 13] }}
      style={{ touchAction: 'pan-y' }}
      frameloop="always"
    >
      <Studio phone={phone} />
    </Canvas>
  );
}
