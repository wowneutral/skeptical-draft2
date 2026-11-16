// Version 65's studio: a heavy dark steel chain on a bone paper sweep, lit like a product shot.
// The chain is a verlet simulation (chain.ts). The page's scroll lifts it by one end with an
// unseen hook, the camera walks down it beside the sections, and at Join it is laid back down.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scroll } from '@/lib/scroll';
import { clamp, smooth, still } from '@/lib/utils';
import { BEND, Chain, H0, IDX, LAY, LINKS, N, STRAIGHT, WIRE, type V3 } from './chain';
import { link } from './store';

const PAPER = '#d6d2cb';
const SKY = '#e7e2d8';
const FOV = 24;
const ANCHOR: V3 = [LAY.dot[0], N + 3.4, LAY.dot[1] - 1.4];

/* ─────────────── geometry: a forged link, and the same link opened ─────────────── */

class Stadium extends THREE.Curve<THREE.Vector3> {
  constructor(private u0 = 0, private u1 = 1, private splay = 0) { super(); }
  getPoint(t: number, out = new THREE.Vector3()) {
    const s = STRAIGHT, R = BEND;
    const per = 4 * s + 2 * Math.PI * R;
    const u = this.u0 + (this.u1 - this.u0) * t;
    let d = u * per;
    // starts at the middle of the top side, heading +x
    let x = 0, y = 0;
    if (d < s) { x = d; y = R; }
    else if ((d -= s) < Math.PI * R) { const a = Math.PI / 2 - d / R; x = s + R * Math.cos(a); y = R * Math.sin(a); }
    else if ((d -= Math.PI * R) < 2 * s) { x = s - d; y = -R; }
    else if ((d -= 2 * s) < Math.PI * R) { const a = -Math.PI / 2 - d / R; x = -s + R * Math.cos(a); y = R * Math.sin(a); }
    else { d -= Math.PI * R; x = -s + d; y = R; }
    // an opened link is sprung: its two cut ends pushed apart
    const z = this.splay ? this.splay * (Math.pow(1 - t, 3) - Math.pow(t, 3)) : 0;
    return out.set(x, y, z);
  }
}

function linkGeometry(open: boolean, low: boolean) {
  const tub = low ? 64 : 96, rad = low ? 14 : 20;
  if (!open) {
    const g = new THREE.TubeGeometry(new Stadium(), tub, WIRE, rad, true);
    return g;
  }
  const g0 = 0.1;
  const curve = new Stadium(g0, 1 - g0, 0.24);
  const tube = new THREE.TubeGeometry(curve, tub, WIRE, rad, false);
  const capA = new THREE.SphereGeometry(WIRE, rad, 10); capA.translate(...curve.getPoint(0).toArray());
  const capB = new THREE.SphereGeometry(WIRE, rad, 10); capB.translate(...curve.getPoint(1).toArray());
  const m = mergeGeometries([tube.toNonIndexed(), capA.toNonIndexed(), capB.toNonIndexed()])!;
  tube.dispose(); capA.dispose(); capB.dispose();
  return m;
}

function noise(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, rep: number) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!; draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.NoColorSpace;
  return t;
}

let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

function makeMaterials() {
  // Polishing marks: fine scratches that break the highlight up a little.
  const polish = noise(256, (g, s) => {
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1600; i++) { const c = rnd() < 0.5 ? 255 : 150; g.fillStyle = `rgba(${c},${c},${c},${0.05 + rnd() * 0.1})`; g.fillRect(rnd() * s, rnd() * s, 1, 6 + rnd() * 40); }
  }, 2);
  const tooth = noise(256, (g, s) => {
    const im = g.createImageData(s, s);
    for (let i = 0; i < s * s; i++) { const v = 128 + (rnd() - 0.5) * 60; im.data.set([v, v, v, 255], i * 4); }
    g.putImageData(im, 0, 0);
  }, 1);
  tooth.repeat.set(40, 40);
  const steel = new THREE.MeshPhysicalMaterial({
    color: '#5a5e65', metalness: 1, roughness: 0.17, roughnessMap: polish,
    clearcoat: 0.8, clearcoatRoughness: 0.05, envMapIntensity: 1.9,
  });
  const paper = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 1, bumpMap: tooth, bumpScale: 0.25, envMapIntensity: 0.35 });
  return { steel, paper, textures: [polish, tooth] };
}

/* ─────────────── the paper sweep ─────────────── */

function Sweep({ material }: { material: THREE.Material }) {
  const geometry = useMemo(() => {
    const zf = -9.6, R = 8;
    const prof: [number, number][] = [[300, 0], [zf, 0]];
    for (let i = 1; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; prof.push([zf - R * Math.sin(a), R - R * Math.cos(a)]); }
    prof.push([zf - R, 200]);
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    let s = 0;
    prof.forEach(([z, y], i) => {
      if (i) s += Math.hypot(z - prof[i - 1][0], y - prof[i - 1][1]);
      for (const x of [-300, 300]) { pos.push(x, y, z); uv.push(x / 12, s / 12); }
    });
    for (let i = 0; i < prof.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const ref = useRef<THREE.Mesh>(null);
  // Layer 1: the main camera sees it, the contact-shadow camera does not.
  useEffect(() => { ref.current?.layers.set(1); }, []);
  return <mesh ref={ref} geometry={geometry} material={material} receiveShadow />;
}

/* ─────────────── framing ─────────────── */

type Pose = { p: THREE.Vector3; t: THREE.Vector3 };
const tanH = Math.tan((FOV * Math.PI) / 360);

/** A camera that puts the question mark inside a page rectangle, looking down at a tilt. */
function slotPose(r: { left: number; top: number; width: number; height: number }, tilt: number, vw: number, vh: number, out: Pose) {
  const ct = Math.cos(tilt);
  const ppu = Math.min((r.height * 0.9) / (LAY.h * ct), (r.width * 0.9) / LAY.w);
  const d = vh / (ppu * 2 * tanH);
  const sx = r.left + r.width / 2 - vw / 2, sy = r.top + r.height / 2 - vh / 2;
  const tx = -sx / ppu, tz = -sy / (ppu * ct);
  out.t.set(tx, H0, tz);
  out.p.set(tx, H0 + d * Math.cos(tilt), tz + d * Math.sin(tilt));
  return out;
}

function hangGeom(vw: number, vh: number, phone: boolean) {
  const D = phone ? 27 : 20.5;
  const Hv = 2 * D * tanH, Wv = Hv * (vw / vh);
  const f = phone ? 0.12 : 0.26;
  return { D, Hv, ox: (0.5 - f) * Wv };
}

function hangPose(y: number, vw: number, vh: number, phone: boolean, out: Pose) {
  const { D, ox } = hangGeom(vw, vh, phone);
  out.t.set(ANCHOR[0] + ox, y, ANCHOR[2]);
  out.p.set(ANCHOR[0] + ox, y + 0.9, ANCHOR[2] + D);
  return out;
}

const mixPose = (a: Pose, b: Pose, t: number, out: Pose) => { out.p.lerpVectors(a.p, b.p, t); out.t.lerpVectors(a.t, b.t, t); return out; };

/* ─────────────── the chain ─────────────── */

const X = new THREE.Vector3(), Yl = new THREE.Vector3(), Zl = new THREE.Vector3(), REF = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0), FRONT = new THREE.Vector3(0, 0, 1), AX = new THREE.Vector3(1, 0, 0);
const M4 = new THREE.Matrix4(), QR = new THREE.Quaternion();
const PV = new THREE.Vector3();
const A3: V3 = [0, 0, 0], B3: V3 = [0, 0, 0];

function Rig({ low }: { low: boolean }) {
  const { camera, size, gl, raycaster } = useThree();
  const chain = useMemo(() => new Chain(), []);
  const M = useMemo(makeMaterials, []);
  const geo = useMemo(() => ({ closed: linkGeometry(false, low), open: linkGeometry(true, low) }), [low]);
  const meshes = useMemo(() => Array.from({ length: LINKS }, (_, k) => {
    const m = new THREE.Mesh(geo.closed, M.steel);
    m.castShadow = true; m.userData.k = k;
    return m;
  }), [geo, M]);
  const group = useRef<THREE.Group>(null);
  const st = useRef({
    started: false, idle: 0, hover: -1, down: null as null | { k: number; x: number; y: number; pt: THREE.Vector3; moved: boolean },
    cam: { p: new THREE.Vector3(), t: new THREE.Vector3() } as Pose, init: false, sway: 0, told: false,
    frame: 0, u: 0, poseA: { p: new THREE.Vector3(), t: new THREE.Vector3() } as Pose, poseB: { p: new THREE.Vector3(), t: new THREE.Vector3() } as Pose,
    pose: { p: new THREE.Vector3(), t: new THREE.Vector3() } as Pose,
  });

  useEffect(() => () => { geo.closed.dispose(); geo.open.dispose(); M.steel.dispose(); M.paper.dispose(); M.textures.forEach((t) => t.dispose()); }, [geo, M]);

  // Settle before the first frame, then let the dot fall into place.
  useMemo(() => { for (let i = 0; i < 240; i++) chain.step(); }, [chain]);
  useEffect(() => {
    camera.layers.enable(1);
    if (still) { link.ready = true; return; }
    chain.dropDot(5.5);
    const t = setTimeout(() => { link.ready = true; }, 200);
    return () => clearTimeout(t);
  }, [camera, chain]);

  // Pointer: press a link to open it, drag a link to pull the chain.
  useEffect(() => {
    const el = gl.domElement;
    const ndc = new THREE.Vector2(), plane = new THREE.Plane(), hit = new THREE.Vector3();
    const move = (e: PointerEvent) => {
      const s = st.current, d = s.down;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 7) {
        d.moved = true;
        // grab the nearer of the link's two joints
        const ia = chain.a[d.k], ib = chain.b[d.k];
        const pa = new THREE.Vector3(...chain.get(ia)), pb = new THREE.Vector3(...chain.get(ib));
        const i = pa.distanceTo(d.pt) < pb.distanceTo(d.pt) ? ia : ib;
        chain.drag = { i, t: chain.get(i) };
        document.documentElement.classList.add('link-grabbing');
      }
      if (d.moved && chain.drag) {
        const r = el.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const j = chain.get(chain.drag.i);
        const air = j[1] > 1.6 || !!chain.hook;
        if (air) plane.set(FRONT, -j[2]); else plane.set(UP, -(H0 + 0.9));
        if (raycaster.ray.intersectPlane(plane, hit)) {
          chain.drag.t = [clamp(hit.x, -30, 30), clamp(hit.y, H0, 40), clamp(hit.z, -9, 14)];
        }
        s.idle = 0;
      }
    };
    const up = (e: PointerEvent) => {
      const s = st.current, d = s.down;
      if (!d) return;
      s.down = null;
      document.documentElement.classList.remove('link-grabbing');
      if (!d.moved && e.type === 'pointerup') openLink(d.k, e.clientX, e.clientY);
      chain.drag = null; s.idle = 0;
    };
    // The same press, picked by hand: a finger on a phone reaches the chain even when the
    // renderer's own events do not see it. Ignored when the press is on the page's words.
    const press = (e: PointerEvent) => {
      if (st.current.down || still) return;
      const t = e.target as Element | null;
      if (t?.closest?.('.col, .paths, .small, .hero-text, .join-head, .foot, .top, a, button')) return;
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length) {
        st.current.down = { k: hits[0].object.userData.k as number, x: e.clientX, y: e.clientY, pt: hits[0].point.clone(), moved: false };
        return;
      }
      // A press inside a link's eye, or just off the steel, still counts as that link.
      let best = -1, bd = (e.pointerType === 'mouse' ? 30 : 46) ** 2;
      for (let k = 0; k < meshes.length; k++) {
        PV.copy(meshes[k].position).project(camera);
        if (PV.z > 1) continue;
        const sx = (PV.x * 0.5 + 0.5) * r.width + r.left, sy = (-PV.y * 0.5 + 0.5) * r.height + r.top;
        const d2 = (sx - e.clientX) ** 2 + (sy - e.clientY) ** 2;
        if (d2 < bd) { bd = d2; best = k; }
      }
      if (best < 0) return;
      st.current.down = { k: best, x: e.clientX, y: e.clientY, pt: meshes[best].position.clone(), moved: false };
    };
    window.addEventListener('pointerdown', press, { passive: true });
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointerdown', press); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, camera, raycaster, chain, meshes]);

  const openLink = (k: number, sx?: number, sy?: number) => {
    const did = chain.open(k);
    st.current.idle = 0;
    if (did && !st.current.told) {
      st.current.told = true;
      let x = sx, y = sy;
      if (x == null || y == null) {
        const v = new THREE.Vector3(...chain.get(chain.a[k])).project(camera);
        x = (v.x * 0.5 + 0.5) * size.width; y = (-v.y * 0.5 + 0.5) * size.height;
      }
      link.onOpen?.(x, y);
    }
  };

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    const k = e.object.userData.k as number | undefined;
    if (k == null) return;
    e.stopPropagation();
    st.current.down = { k, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, pt: e.point.clone(), moved: false };
  };
  const onOver = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); st.current.hover = e.object.userData.k ?? -1; link.onHover?.(true); };
  const onOut = () => { st.current.hover = -1; link.onHover?.(false); };

  useFrame((_, dtRaw) => {
    const s = st.current, dt = Math.min(dtRaw, 0.12);
    s.frame = (s.frame + 1) % 4;
    const vw = size.width, vh = size.height, phone = link.phone;
    const y = scroll.y;

    // keyboard requests
    if (link.openReq !== -2) {
      const k = link.openReq >= 0 ? link.openReq : 4 + Math.floor(Math.random() * 11);
      link.openReq = -2;
      openLink(k);
    }
    if (link.shakeReq) {
      link.shakeReq = false;
      for (let i = 0; i < IDX.COUNT; i++) { chain.p[i * 3 + 1] = chain.x[i * 3 + 1] - 0.06 - Math.random() * 0.05; chain.p[i * 3] = chain.x[i * 3] + (Math.random() - 0.5) * 0.08; }
      s.idle = 0;
    }

    // where the page is
    let lift = 0, lay = 0, desc = 0;
    const hero = link.heroSlot?.getBoundingClientRect();
    const join = link.joinSlot?.getBoundingClientRect();
    if (!still && join) {
      lift = clamp(y / (vh * 0.95));
      const sec = link.joinSec?.getBoundingClientRect() ?? join;
      lay = clamp((vh * 1.05 - sec.top) / (vh * 0.95));
      const joinDocTop = sec.top + y;
      const a = vh * 0.95, b = joinDocTop - vh * 1.05;
      desc = clamp((y - a) / Math.max(1, b - a));
    }
    const uT = lay > 0 ? 1 - lay : lift;
    // the hook never jumps: however fast the page moves, it travels at a set pace
    const rate = 0.55 * dt;
    s.u += clamp(uT - s.u, -rate, rate);
    const u = still ? 0 : s.u;

    // the hook
    s.sway += (clamp(scroll.v * 0.5, -1.2, 1.2) - s.sway) * Math.min(1, dt * 3);
    if (u > 0.002) {
      const h = Chain.hookFor(u, [ANCHOR[0] + s.sway * smooth(clamp((u - 0.78) / 0.22)), ANCHOR[1], ANCHOR[2]]);
      if (!chain.hook) { chain.hookAt = chain.get(0); }
      chain.hook = h;
    } else chain.hook = null;

    // the paper's memory of the shape
    s.idle += dt;
    const lying = u < 0.002;
    chain.homeK = chain.drag ? 0 : lying ? (chain.opened >= 0 ? 0 : s.idle > 2.2 ? 0.018 : 0.003) : u < 0.78 ? 0.07 : 0;

    chain.update(still ? 0 : dt);

    // links
    const px: string[] = [];
    for (let k = 0; k < LINKS; k++) {
      const m = meshes[k];
      chain.get(chain.a[k], A3); chain.get(chain.b[k], B3);
      X.set(B3[0] - A3[0], B3[1] - A3[1], B3[2] - A3[2]).normalize();
      const sv = smooth(clamp((Math.abs(X.y) - 0.5) / 0.4));
      REF.copy(UP).lerp(FRONT, sv);
      Zl.copy(REF).addScaledVector(X, -REF.dot(X)).normalize();
      Yl.crossVectors(Zl, X);
      M4.makeBasis(X, Yl, Zl);
      m.quaternion.setFromRotationMatrix(M4);
      const roll = (1 - sv) * (k % 2 ? Math.PI / 4 : -Math.PI / 4) + sv * (k % 2 ? Math.PI / 2 : 0);
      QR.setFromAxisAngle(AX, roll);
      m.quaternion.multiply(QR);
      m.position.set((A3[0] + B3[0]) / 2, (A3[1] + B3[1]) / 2, (A3[2] + B3[2]) / 2);
      const g = chain.opened === k ? geo.open : geo.closed;
      if (m.geometry !== g) m.geometry = g;
      if (s.frame === 0) { PV.copy(m.position).project(camera); px.push(`${Math.round((PV.x * 0.5 + 0.5) * vw)},${Math.round((-PV.y * 0.5 + 0.5) * vh)}`); }
      const target = s.hover === k && !chain.drag ? 1.05 : 1;
      m.scale.setScalar(m.scale.x + (target - m.scale.x) * Math.min(1, dt * 12));
    }

    if (s.frame === 0) document.querySelector('.v-link .stage')?.setAttribute('data-px', px.join(' '));
    // camera
    const heroPose = hero
      ? slotPose({ left: hero.left, top: hero.top + y, width: hero.width, height: hero.height }, phone ? 0.3 : 0.42, vw, vh, s.poseA)
      : slotPose({ left: 0, top: 0, width: vw, height: vh }, 0.42, vw, vh, s.poseA);
    const { Hv } = hangGeom(vw, vh, phone);
    const top = ANCHOR[1] - Hv * 0.3, bottom = H0 + Hv * 0.36;
    let pose: Pose;
    if (still) pose = heroPose;
    else if (lay > 0 && join) {
      const jp = slotPose(join, phone ? 0.22 : 0.3, vw, vh, s.poseB);
      const hp = hangPose(bottom, vw, vh, phone, s.pose);
      pose = mixPose(hp, jp, smooth(smooth(lay)), s.pose);
    } else if (lift < 1) {
      const hp = hangPose(top, vw, vh, phone, s.poseB);
      pose = mixPose(heroPose, hp, smooth(clamp(lift * 1.1)), s.pose);
    } else pose = hangPose(top + (bottom - top) * smooth(desc * 0.85 + desc * desc * 0.15), vw, vh, phone, s.pose);

    if (!s.init) {
      s.init = true;
      s.cam.t.copy(pose.t); s.cam.p.copy(pose.p);
      if (!still) s.cam.p.lerp(pose.t, -0.18).y += 1.2; // the opening: a slow push in
    }
    const lam = 1 - Math.exp(-dt * (s.started ? 5 : 1.6));
    s.cam.p.lerp(pose.p, lam); s.cam.t.lerp(pose.t, lam);
    if (s.cam.p.distanceTo(pose.p) < 0.3) s.started = true;
    camera.position.copy(s.cam.p);
    camera.lookAt(s.cam.t);
  });

  return (
    <group ref={group}>
      <Sweep material={M.paper} />
      <group onPointerDown={onDown} onPointerOver={onOver} onPointerOut={onOut}>
        {meshes.map((m, k) => <primitive key={k} object={m} />)}
      </group>
    </group>
  );
}

function KeyLight({ low }: { low: boolean }) {
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight('#ffffff', 2.1);
    l.position.set(-9, 30, 15);
    l.target.position.set(0, 7, -2);
    l.castShadow = true;
    l.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
    l.shadow.bias = -0.0005; l.shadow.normalBias = 0.03; l.shadow.radius = 4;
    const c = l.shadow.camera; c.left = -17; c.right = 17; c.top = 17; c.bottom = -17; c.near = 2; c.far = 90; c.updateProjectionMatrix();
    return l;
  }, [low]);
  useEffect(() => () => { light.shadow.map?.dispose(); }, [light]);
  return <><primitive object={light} /><primitive object={light.target} /></>;
}

export default function Scene({ low }: { low: boolean }) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, low ? 1.5 : 1.6]}
      camera={{ fov: FOV, near: 0.5, far: 400, position: [0, 30, 20] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.0; scene.background = new THREE.Color(SKY); }}
      style={{ touchAction: 'pan-y' }}
      frameloop={still ? 'demand' : 'always'}
    >
      <hemisphereLight args={['#ffffff', '#d6d2ca', 0.7]} />
      <KeyLight low={low} />
      <Environment resolution={256} frames={1}>
        {/* the big softbox overhead, a strip rim behind, a card on the left, the paper's bounce */}
        <Lightformer form="rect" intensity={5} color="#fffaf0" position={[-2, 16, 6]} rotation-x={Math.PI / 2} scale={[16, 7, 1]} />
        <Lightformer form="rect" intensity={9} color="#ffffff" position={[0, 7, -16]} scale={[26, 1.6, 1]} />
        <Lightformer form="rect" intensity={3} color="#fff4e6" position={[-15, 6, 4]} rotation-y={Math.PI / 2} scale={[3, 12, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#f3efe6" position={[0, 6, 24]} rotation-y={Math.PI} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#e9e2d4" position={[0, -2, 0]} rotation-x={-Math.PI / 2} scale={[80, 80, 1]} />
      </Environment>
      <Rig low={low} />
      <ContactShadows position={[0, 0.006, 0]} scale={36} resolution={low ? 384 : 512} far={2.4} blur={2.4} opacity={0.82} color="#241e18" frames={still ? 1 : Infinity} />
    </Canvas>
  );
}

