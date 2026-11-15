// Version 13's stage: SKEPTICAL? as ten heavy objects on a paper sweep.
// Everything that stands here is a rigid body (Rapier). The page's scroll
// moves the camera between ten positions and brings the props on and off;
// the pointer, a finger or the keyboard knocks things over, and they get up.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Physics, useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';
import { DRIVE, JOIN, PEOPLE, RECORD } from '@/content';
import { gsap, scroll } from '@/lib/scroll';
import { clamp, damp, lerp, smooth, still } from '@/lib/utils';
import { DEPTH, QDOT, QH, QPIN, hulls, letter, lettering, noiseTexture, solid, type Outline } from './geo';
import { COACH_CAP, PEG, PLINTH, STOPS, VOL, type Plan, type Shot } from './plan';
import { stage } from './stage';

const PAPER = '#e9e4d8';
const STEP = 1 / 60, GRAV = 16.5, DROP = 7.5, FALL = 34;
// Collision groups: a solid body meets everything; a ghost meets nothing (a ray still finds it).
const SOLID = 0xffffffff, GHOST = 0x00020000;

type Ctx = ReturnType<typeof useRapier>;
type World = Ctx['world'];
type Body = ReturnType<World['createRigidBody']>;
type Collider = ReturnType<World['createCollider']>;
type Kind = 'letter' | 'hook' | 'plinth' | 'coach' | 'peg' | 'volume';
type Mode = 'away' | 'drop' | 'home' | 'loose' | 'rise' | 'held' | 'leave';
type Pose = { p: THREE.Vector3; q: THREE.Quaternion };
type Actor = {
  kind: Kind; ch: string; obj: THREE.Object3D; body: Body; kin: boolean; cols: Collider[];
  home: Pose; half: THREE.Vector3; mode: Mode; present: boolean; fixed: boolean;
  t: number; wait: number; landed: boolean; thud: number; rock: number;
  from: Pose; to: Pose; axis: THREE.Vector3; angle: number; u: number; du: number; style: 'spring' | 'fall'; lift: number; stay: boolean; calm: boolean;
  looseT: number; restT: number; pushedAt: number; swipedAt: number; riseAfter: number; hold: boolean; weight: number;
  pp: THREE.Vector3; pq: THREE.Quaternion; cp: THREE.Vector3; cq: THREE.Quaternion;
};

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const X = v3(1, 0, 0), Y = v3(0, 1, 0);

/* ───────────────────────── materials ───────────────────────── */

function makeMaterials() {
  // Orange peel: the slight waviness of sprayed lacquer.
  const peel = noiseTexture(256, (g, rnd, s) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1500; i++) {
      const x = rnd() * s, y = rnd() * s, r = 3 + rnd() * 9, c = rnd() < 0.5 ? 255 : 0;
      for (const [ox, oy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        gr.addColorStop(0, `rgba(${c},${c},${c},0.09)`); gr.addColorStop(1, `rgba(${c},${c},${c},0)`);
        g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  }, 2.2);
  // Paper tooth.
  const tooth = noiseTexture(256, (g, rnd, s) => {
    const im = g.createImageData(s, s);
    for (let i = 0; i < s * s; i++) { const v = 128 + (rnd() - 0.5) * 70; im.data.set([v, v, v, 255], i * 4); }
    g.putImageData(im, 0, 0);
  }, 1);
  // Brushed steel: long horizontal scratches.
  const brushed = noiseTexture(256, (g, rnd, s) => {
    g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) { const c = rnd() < 0.5 ? 255 : 0; g.fillStyle = `rgba(${c},${c},${c},${0.03 + rnd() * 0.07})`; g.fillRect(rnd() * s - 60, rnd() * s, 30 + rnd() * 200, 1); }
  }, 1);
  const ink = new THREE.MeshPhysicalMaterial({ color: '#12100c', roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.1, bumpMap: peel, bumpScale: 0.5, envMapIntensity: 0.9 });
  const red = new THREE.MeshPhysicalMaterial({ color: '#d92b10', roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.07, bumpMap: peel, bumpScale: 0.4, envMapIntensity: 0.85 });
  const steel = new THREE.MeshPhysicalMaterial({ color: '#c6c4bf', metalness: 1, roughness: 0.3, roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.3, anisotropy: 0.75, anisotropyRotation: Math.PI / 2, envMapIntensity: 1.5 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1b1915', metalness: 0.6, roughness: 0.5 });
  const brass = new THREE.MeshPhysicalMaterial({ color: '#cc9a3c', metalness: 1, roughness: 0.27, roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.25, anisotropy: 0.6, envMapIntensity: 1.7 });
  // Paint is matt: no sheen, so lettering on the floor stays ink at any angle.
  const paint = new THREE.MeshLambertMaterial({ color: '#191510', polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  // The paper takes its light from the lamps alone: a black environment of its own keeps the softboxes off it.
  const night = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  night.mapping = THREE.EquirectangularReflectionMapping; night.needsUpdate = true;
  const paper = new THREE.MeshStandardMaterial({ color: '#f0ebde', roughness: 1, bumpMap: tooth, bumpScale: 0.35, envMap: night, envMapIntensity: 0 });
  return { ink, red, steel, dark, brass, paint, paper, textures: [peel, tooth, brushed, night] };
}
type Mats = ReturnType<typeof makeMaterials>;

/* ───────────────────────── the paper sweep ───────────────────────── */

function Sweep({ zf, material }: { zf: number; material: THREE.Material }) {
  const geometry = useMemo(() => {
    // A profile in the z,y plane: floor, a quarter circle, wall. Swept along x.
    const R = 6.5, prof: [number, number][] = [[400, 0], [zf, 0]];
    for (let i = 1; i <= 18; i++) { const a = (i / 18) * Math.PI / 2; prof.push([zf - R * Math.sin(a), R - R * Math.cos(a)]); }
    prof.push([zf - R, 300]);
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    let s = 0;
    prof.forEach(([z, y], i) => {
      if (i) s += Math.hypot(z - prof[i - 1][0], y - prof[i - 1][1]);
      for (const x of [-700, 700]) { pos.push(x, y, z); uv.push(x / 3, s / 3); }
    });
    for (let i = 0; i < prof.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, [zf]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  // Layer 1: the main camera sees it, the contact-shadow camera does not.
  return <mesh geometry={geometry} material={material} receiveShadow layers={1} />;
}

/* ───────────────────────── building the bodies ───────────────────────── */

function crease(g: THREE.BufferGeometry) { return toCreasedNormals(g, 0.7); }

function buildSet(plan: Plan, world: World, R: Ctx['rapier'], M: Mats, root: THREE.Group, low: boolean) {
  const actors: Actor[] = [];
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

  const make = (kind: Kind, ch: string, obj: THREE.Object3D, home: THREE.Vector3, half: THREE.Vector3, o: Partial<Actor> = {}): Actor => {
    const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(home.x, home.y + DROP, home.z).setLinearDamping(0.06).setAngularDamping(0.3));
    obj.visible = false; root.add(obj);
    const a: Actor = {
      kind, ch, obj, body, kin: true, cols: [], home: { p: home.clone(), q: new THREE.Quaternion() }, half, mode: 'away', present: false, fixed: false,
      t: 0, wait: 0, landed: false, thud: 0.012, rock: 0.04, from: { p: v3(), q: new THREE.Quaternion() }, to: { p: v3(), q: new THREE.Quaternion() },
      axis: v3(1), angle: 0, u: 0, du: 0, style: 'spring', lift: 0.4, stay: false, calm: false,
      looseT: 0, restT: 0, pushedAt: -9, swipedAt: -9, riseAfter: 0, hold: false, weight: 1,
      pp: home.clone(), pq: new THREE.Quaternion(), cp: home.clone(), cq: new THREE.Quaternion(), ...o,
    };
    body.setEnabled(false);
    actors.push(a);
    return a;
  };
  // Everything starts as a ghost: a body that is being moved by the script passes through the others
  // (see setKin below), so nothing is ever batted across the room by a letter getting up.
  const coll = (a: Actor, desc: ReturnType<typeof R.ColliderDesc.cuboid> | null, density = 1): Collider | null => {
    if (!desc) return null;
    const c = world.createCollider(desc.setDensity(density).setFriction(0.72).setRestitution(0.06).setCollisionGroups(GHOST), a.body);
    a.cols.push(c);
    return c;
  };
  /** Hulls for a letter, plus a flat sole so round-bottomed letters stand. */
  const glyphColliders = (a: Actor, o: Outline, depth: number, fullSole: boolean) => {
    const hs = hulls(o, depth);
    for (const h of hs) coll(a, R.ColliderDesc.convexHull(h));
    let x0 = -o.w / 2, x1 = o.w / 2;
    if (!fullSole && hs[0]) { x0 = Infinity; x1 = -Infinity; for (let i = 0; i < hs[0].length; i += 3) { x0 = Math.min(x0, hs[0][i]); x1 = Math.max(x1, hs[0][i]); } }
    coll(a, R.ColliderDesc.cuboid((x1 - x0) / 2, 0.03, depth / 2 - 0.004).setTranslation((x0 + x1) / 2, -o.h / 2 + 0.03, 0));
  };
  const paintOn = (text: string, cap: number, maxW: number) => {
    const l = lettering(text, cap);
    const k = Math.min(1, maxW / l.width);
    const m = new THREE.Mesh(keep(l.geometry), M.paint);
    m.scale.setScalar(k);
    return { mesh: m, width: l.width * k, cap: cap * k };
  };

  // The nine letters.
  const quality = low ? 4 : 7;
  for (const L of plan.letters) {
    const o = letter(L.ch, undefined, quality);
    const mesh = new THREE.Mesh(keep(crease(solid(o, DEPTH, 0.036, low ? 2 : 4))), M.ink);
    mesh.castShadow = mesh.receiveShadow = true;
    const a = make('letter', L.ch, mesh, v3(L.x, L.y, L.z), v3(o.w / 2, o.h / 2, DEPTH / 2), { present: true });
    glyphColliders(a, o, DEPTH, L.ch === 'P');
  }

  // The question mark: a hook on a pin, standing on its dot.
  const ho = plan.q.o;
  const hookMesh = new THREE.Mesh(keep(crease(solid(ho, DEPTH, 0.024, low ? 2 : 4))), M.red);
  hookMesh.castShadow = hookMesh.receiveShadow = true;
  const pinLen = QPIN.y1 - QPIN.y0;
  const pin = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.02, 0.02, pinLen, 12)), M.steel);
  pin.position.set(QPIN.x, (QPIN.y0 + QPIN.y1) / 2 - ho.cy, 0); pin.castShadow = true;
  const hookGroup = new THREE.Group(); hookGroup.add(hookMesh, pin);
  // Its box, for clearance sums: from the floor to the top of the hook.
  const hook = make('hook', '?', hookGroup, v3(plan.q.x, QH / 2, plan.q.z), v3(ho.w / 2, QH / 2, DEPTH / 2), { present: true });
  // The body's origin is the middle of the whole mark; the hook's own outline is centred higher.
  const hookOff = ho.cy - QH / 2;
  hookMesh.position.y = hookOff; pin.position.y += hookOff;
  for (const h of hulls(ho, DEPTH, 5)) { for (let i = 1; i < h.length; i += 3) h[i] += hookOff; coll(hook, R.ColliderDesc.convexHull(h)); }
  coll(hook, R.ColliderDesc.cuboid(0.5, 0.03, DEPTH / 2 - 0.004).setTranslation(-0.05, -QH / 2 + 0.03, 0), 2.5);
  const dotLocal = v3(QDOT.x, QDOT.y - QH / 2, 0);
  const dotCollider = coll(hook, R.ColliderDesc.ball(QDOT.r).setTranslation(dotLocal.x, dotLocal.y, dotLocal.z))!;
  const ballMesh = new THREE.Mesh(keep(new THREE.SphereGeometry(QDOT.r, low ? 32 : 56, low ? 20 : 36)), M.red);
  ballMesh.castShadow = true; ballMesh.visible = false; root.add(ballMesh);
  const ballBody = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -20, 0));
  world.createCollider(R.ColliderDesc.ball(QDOT.r).setFriction(0.6), ballBody);
  ballBody.setEnabled(false);

  // The record: two brass blocks with the results lettered on the face.
  const plinthGeo = keep(new RoundedBoxGeometry(PLINTH.w, PLINTH.h, PLINTH.d, 4, 0.04));
  RECORD.results.forEach((r, i) => {
    const g = new THREE.Group();
    const block = new THREE.Mesh(plinthGeo, M.brass); block.castShadow = block.receiveShadow = true; g.add(block);
    const words = r.what.split(' ');
    // The longest line sets the size: break the title so no line runs much past the others.
    const lines: string[] = [];
    for (const w of words) { const last = lines[lines.length - 1]; if (last !== undefined && (last + ' ' + w).length <= 13) lines[lines.length - 1] = last + ' ' + w; else lines.push(w); }
    const cap = 0.27, lead = cap * 1.24, top = PLINTH.h / 2 - 0.17 - cap / 2, left = -PLINTH.w / 2 + 0.17;
    lines.forEach((ln, j) => { const t = paintOn(ln, cap, PLINTH.w - 0.34); t.mesh.position.set(left + t.width / 2, top - j * lead, PLINTH.d / 2 + 0.001); g.add(t.mesh); });
    const who = paintOn(r.who, 0.16, PLINTH.w - 0.34);
    who.mesh.position.set(left + who.width / 2, -PLINTH.h / 2 + 0.18 + 0.08, PLINTH.d / 2 + 0.001); g.add(who.mesh);
    const rule = new THREE.Mesh(keep(new THREE.PlaneGeometry(PLINTH.w - 0.34, 0.014)), M.paint);
    rule.position.set(0, -PLINTH.h / 2 + 0.18 + 0.16 + 0.1, PLINTH.d / 2 + 0.001); g.add(rule);
    const p = plan.plinths[i];
    const a = make('plinth', '', g, v3(p.x, PLINTH.h / 2, p.z), v3(PLINTH.w / 2, PLINTH.h / 2, PLINTH.d / 2), { wait: i * 0.28, thud: 0.03, rock: 0.022, weight: 0.4 });
    a.home.q.setFromAxisAngle(Y, p.yaw);
    coll(a, R.ColliderDesc.cuboid(PLINTH.w / 2, PLINTH.h / 2, PLINTH.d / 2), 2.4);
  });

  // The drive: seven closed steel blocks. They are kinematic for good; nothing moves them.
  const lidH = 0.2, seam = 0.012, baseH = VOL.h - lidH - seam;
  const baseGeo = keep(new RoundedBoxGeometry(VOL.w, baseH, VOL.d, 2, 0.014));
  const lidGeo = keep(new RoundedBoxGeometry(VOL.w, lidH, VOL.d, 2, 0.014));
  const seamGeo = keep(new THREE.BoxGeometry(VOL.w - 0.03, seam + 0.02, VOL.d - 0.03));
  const lockGeo = keep(new THREE.CylinderGeometry(0.05, 0.05, 0.016, 28));
  const slotGeo = keep(new THREE.BoxGeometry(0.012, 0.058, 0.004));
  DRIVE.items.forEach((it, i) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(baseGeo, M.steel); base.position.y = -VOL.h / 2 + baseH / 2; base.castShadow = base.receiveShadow = true;
    const lid = new THREE.Mesh(lidGeo, M.steel); lid.position.y = VOL.h / 2 - lidH / 2; lid.castShadow = lid.receiveShadow = true;
    const gap = new THREE.Mesh(seamGeo, M.dark); gap.position.y = VOL.h / 2 - lidH - seam / 2;
    const lock = new THREE.Mesh(lockGeo, M.dark); lock.rotation.x = Math.PI / 2; lock.position.set(0, VOL.h / 2 - lidH / 2, VOL.d / 2 + 0.004);
    const slot = new THREE.Mesh(slotGeo, M.steel); slot.position.set(0, VOL.h / 2 - lidH / 2, VOL.d / 2 + 0.013);
    const label = paintOn(it.term, 0.25, baseH - 0.36);
    label.mesh.rotation.z = Math.PI / 2;
    label.mesh.position.set(0, -VOL.h / 2 + 0.18 + label.width / 2, VOL.d / 2 + 0.001);
    g.add(base, lid, gap, lock, slot, label.mesh);
    const x = plan.volumes.x + (i - 3) * plan.volumes.pitch;
    const a = make('volume', '', g, v3(x, VOL.h / 2, plan.volumes.z), v3(VOL.w / 2, VOL.h / 2, VOL.d / 2), { fixed: true, wait: i * 0.085, thud: 0.02 });
    coll(a, R.ColliderDesc.cuboid(VOL.w / 2, VOL.h / 2, VOL.d / 2));
  });

  // The people: a tall letter for each coach, and eight small tablets for the debaters.
  const captions: THREE.Mesh[] = [];
  const floorText = (text: string, cap: number, x: number, z: number, align: 'left' | 'centre' = 'left', yaw = 0, pad = 0) => {
    const l = lettering(text, cap);
    const mat = M.paint.clone(); mat.transparent = true; mat.opacity = 0; keep(mat);
    const m = new THREE.Mesh(keep(l.geometry), mat);
    const along = align === 'left' ? pad + l.width / 2 : 0;
    m.rotation.set(-Math.PI / 2, yaw, 0, 'YXZ'); m.position.set(x + Math.cos(yaw) * along, 0.004, z - Math.sin(yaw) * along); m.receiveShadow = true; m.visible = false;
    root.add(m);
    return m;
  };
  PEOPLE.coaches.forEach((c, i) => {
    const o = letter(c.name[0], COACH_CAP, quality), depth = 0.74;
    const mesh = new THREE.Mesh(keep(crease(solid(o, depth, 0.05, low ? 2 : 4))), M.ink);
    mesh.castShadow = mesh.receiveShadow = true;
    const p = plan.coaches[i];
    const a = make('coach', c.name[0], mesh, v3(p.x, o.h / 2, p.z), v3(o.w / 2, o.h / 2, depth / 2), { wait: i * 0.3, thud: 0.035, weight: 1.45 });
    glyphColliders(a, o, depth, false);
    captions.push(floorText(c.name, 0.24, p.x, p.z + 2.45, 'centre'), floorText(c.role, 0.13, p.x, p.z + 2.82, 'centre'));
  });
  const pegGeo = keep(new RoundedBoxGeometry(PEG.w, PEG.h, PEG.d, 2, 0.02));
  plan.pegs.forEach((p, i) => {
    const mesh = new THREE.Mesh(pegGeo, M.ink); mesh.castShadow = mesh.receiveShadow = true;
    const a = make('peg', '', mesh, v3(p.x, PEG.h / 2, p.z), v3(PEG.w / 2, PEG.h / 2, PEG.d / 2), { wait: 0.55 + i * 0.07, thud: 0.004, rock: 0.05 });
    coll(a, R.ColliderDesc.cuboid(PEG.w / 2, PEG.h / 2, PEG.d / 2), 1.4);
  });
  const peopleCaptions = captions.splice(0);

  // Join: the three ways in, painted on the floor.
  const wayCaptions = JOIN.paths.map((p, i) => floorText(p.name, plan.ways[i].cap, plan.ways[i].x, plan.ways[i].z, 'left', plan.wayYaw, 0.5));

  // The room: a floor that nothing falls through and walls that keep things on the paper.
  const room = world.createRigidBody(R.RigidBodyDesc.fixed());
  const wall = (hx: number, hy: number, hz: number, x: number, y: number, z: number) => world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setFriction(0.78).setRestitution(0.04), room);
  wall(120, 5, 120, 0, -5, 0); wall(1, 20, 60, -24, 20, 0); wall(1, 20, 60, 24, 20, 0); wall(60, 20, 1, 0, 20, 16); wall(60, 20, 1, 0, 20, plan.volumes.z - 4);

  return { actors, hook, room, dotLocal, dotCollider, ballMesh, ballBody, peopleCaptions, wayCaptions, dispose: () => disposables.forEach((d) => d.dispose()) };
}

/* ───────────────────────── the set, alive ───────────────────────── */

function TheSet({ plan, M, low }: { plan: Plan; M: Mats; low: boolean }) {
  const { world, rapier: R } = useRapier();
  const { camera, size, scene } = useThree();
  const envSet = useRef(false);
  const root = useMemo(() => new THREE.Group(), []);
  const S = useMemo(() => buildSet(plan, world, R, M, root, low), [plan, world, R, M, root, low]);
  const sizeRef = useRef(size); sizeRef.current = size;

  const sim = useRef({
    now: 0, acc: 0, lastRise: -9, started: false, opening: true, quiet: 0,
    down: false, join: false, jobs: [] as { at: number; run: () => void }[],
    ball: { free: false, p: v3(), q: new THREE.Quaternion(), offQ: new THREE.Quaternion(), route: null as null | { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; t: number; dur: number }, at: -1, y0: 0 },
    ptr: { x: -1, y: -1, t: 0, vx: 0, vy: 0, down: false, travel: 0, downAt: 0, moved: false, touch: false, run: 0 },
  }).current;

  useEffect(() => {
    // For the test scripts only: a way to read the set's state from outside. Not in a production build.
    if (import.meta.env.DEV) (window as unknown as { __letters: unknown }).__letters = { stage, sim, actors: S.actors };
    stage.wake = Math.max(stage.wake, 60); stage.dirty = 4;
    world.timestep = STEP;
    world.gravity = { x: 0, y: -GRAV, z: 0 };
    return () => { S.dispose(); };
  }, [world, S]);

  /* ── helpers ── */
  const tmpQ = useMemo(() => new THREE.Quaternion(), []), tmpQ2 = useMemo(() => new THREE.Quaternion(), []);
  const tmpV = useMemo(() => v3(), []), tmpV2 = useMemo(() => v3(), []), tmpM = useMemo(() => new THREE.Matrix4(), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const byHandle = useMemo(() => new Map(S.actors.map((a) => [a.body.handle, a])), [S]);

  const api = useMemo(() => {
    const solid = (a: Actor, yes: boolean) => { for (const c of a.cols) c.setCollisionGroups(yes ? SOLID : GHOST); };
    const setKin = (a: Actor) => { if (!a.kin) { a.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true); a.kin = true; } solid(a, false); };
    const setDyn = (a: Actor) => { if (a.kin) { a.body.setBodyType(R.RigidBodyType.Dynamic, true); a.kin = false; } solid(a, true); };
    const read = (a: Actor, out: Pose) => { const t = a.body.translation(), r = a.body.rotation(); out.p.set(t.x, t.y, t.z); out.q.set(r.x, r.y, r.z, r.w); return out; };
    /** How far the middle of a box must be above the floor when turned by q. */
    const clearance = (a: Actor, q: THREE.Quaternion) => { const e = tmpM.makeRotationFromQuaternion(q).elements; return Math.abs(e[1]) * a.half.x + Math.abs(e[5]) * a.half.y + Math.abs(e[9]) * a.half.z; };
    const tilt = (q: { x: number; y: number; z: number; w: number }) => Math.acos(clamp(1 - 2 * (q.x * q.x + q.z * q.z), -1, 1));
    const settle = (a: Actor) => {
      a.mode = 'home'; a.calm = false;
      if (a.fixed) { a.body.setNextKinematicTranslation(a.home.p); a.body.setNextKinematicRotation(a.home.q); solid(a, true); return; }
      setDyn(a);
      a.body.setTranslation(a.home.p, false); a.body.setRotation(a.home.q, false);
      a.body.setLinvel({ x: 0, y: 0, z: 0 }, false); a.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
      a.body.sleep();
    };
    const startDrop = (a: Actor) => {
      a.mode = 'drop'; a.t = 0; a.landed = false;
      a.body.setEnabled(true); setKin(a);
      tmpV.copy(a.home.p).setY(a.home.p.y + DROP);
      a.body.setTranslation(tmpV, true); a.body.setRotation(a.home.q, true);
      a.cp.copy(tmpV); a.pp.copy(tmpV); a.cq.copy(a.home.q); a.pq.copy(a.home.q);
    };
    const startRise = (a: Actor, to: Pose, style: 'spring' | 'fall', stay: boolean) => {
      setKin(a); read(a, a.from); a.to.p.copy(to.p); a.to.q.copy(to.q);
      // The turn that takes the target to where it is now, as an axis and an angle.
      tmpQ.copy(a.to.q).invert(); tmpQ2.copy(a.from.q).multiply(tmpQ);
      if (tmpQ2.w < 0) tmpQ2.set(-tmpQ2.x, -tmpQ2.y, -tmpQ2.z, -tmpQ2.w);
      a.angle = 2 * Math.acos(clamp(tmpQ2.w, -1, 1));
      const s = Math.sqrt(Math.max(1e-9, 1 - tmpQ2.w * tmpQ2.w));
      a.axis.set(tmpQ2.x / s, tmpQ2.y / s, tmpQ2.z / s);
      if (a.angle < 1e-4) a.axis.set(1, 0, 0);
      a.u = 0; a.du = 0; a.t = 0; a.style = style; a.stay = stay; a.mode = 'rise';
      a.lift = style === 'fall' ? 0 : 0.6 * Math.min(1, a.angle / 1.2) + 0.07 * Math.min(4, a.from.p.distanceTo(a.to.p));
      sim.lastRise = sim.now;
    };
    const shove = (a: Actor, point: THREE.Vector3, dir: THREE.Vector3, strength: number): boolean => {
      if (still || a.fixed || a.mode === 'away' || a.mode === 'leave' || a.mode === 'drop') return false;
      if (a.kind === 'hook' && (sim.join || sim.ball.free)) return false;
      setDyn(a);
      const m = a.body.mass() * strength * a.weight;
      a.body.applyImpulseAtPoint({ x: dir.x * m, y: dir.y * m, z: dir.z * m }, point, true);
      a.mode = 'loose'; a.looseT = 0; a.restT = 0; a.pushedAt = sim.now;
      stage.shoves++;
      return true;
    };
    const topple = (a: Actor, side = 0, strength = 2.1) => {
      if (a.mode !== 'home' && a.mode !== 'rise') return;
      read(a, a.from);
      tmpV.copy(a.from.p).add(tmpV2.set(side * a.half.x * 0.5, a.half.y * 0.72, a.half.z));
      shove(a, tmpV, tmpV2.set(side * 0.28, 0, -1).normalize(), strength);
    };
    return { solid, setKin, setDyn, read, clearance, tilt, settle, startDrop, startRise, shove, topple };
  }, [R, S, sim, tmpM, tmpQ, tmpQ2, tmpV, tmpV2]);

  const word = useMemo(() => S.actors.filter((a) => a.kind === 'letter'), [S]);
  const tipped = useMemo<Pose>(() => ({ p: v3(plan.q.x, DEPTH / 2 + 0.002, plan.q.z + DEPTH / 2 + QH / 2), q: new THREE.Quaternion().setFromAxisAngle(X, Math.PI / 2) }), [plan]);
  // Flat on its back, where it stood: how each letter lies when the scroll knocks the word down.
  const lying = useMemo<Pose[]>(() => word.map((a) => ({ p: v3(a.home.p.x, a.half.z + 0.002, a.home.p.z - a.half.y - a.half.z), q: new THREE.Quaternion().setFromAxisAngle(X, -Math.PI / 2) })), [word]);
  const dotHome = useMemo(() => v3(plan.q.x + QDOT.x, QDOT.r, plan.q.z), [plan]);

  /* ── the pointer ── */
  useEffect(() => {
    const p = sim.ptr;
    const interactive = (e: Event) => !!(e.target as Element | null)?.closest?.('a, button, input, [data-nopush]');
    const move = (e: PointerEvent) => {
      const now = performance.now(), dt = Math.max(4, now - p.t);
      if (p.x >= 0 && now - p.t < 120) { p.vx = lerp(p.vx, ((e.clientX - p.x) / dt) * 1000, 0.5); p.vy = lerp(p.vy, ((e.clientY - p.y) / dt) * 1000, 0.5); } else { p.vx = p.vy = 0; }
      const step = Math.hypot(e.clientX - p.x, e.clientY - p.y);
      if (p.down) p.travel += step;
      p.x = e.clientX; p.y = e.clientY; p.t = now; p.moved = true; p.touch = e.pointerType === 'touch';
      // A fast swipe across something knocks it the way the pointer was going.
      const speed = Math.hypot(p.vx, p.vy);
      p.run += step;
      if (speed < 620 || p.run < 14 || sim.opening || (p.touch && !p.down) || interactive(e)) return;
      p.run = 0;
      const hit = cast(p.x, p.y);
      if (!hit || hit.a.fixed || sim.now - hit.a.swipedAt < 0.3) return;
      hit.a.swipedAt = sim.now;
      const right = tmpV.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
      const fwd = camera.getWorldDirection(tmpV2).setY(0);
      if (fwd.lengthSq() < 0.01) fwd.setFromMatrixColumn(camera.matrixWorld, 1).setY(0);
      fwd.normalize();
      // Sideways as swept, and always a little away from you: a hand across the word takes it down.
      const dir = right.multiplyScalar((p.vx / speed) * 0.7).addScaledVector(fwd, 0.75 - (p.vy / speed) * 0.5).normalize();
      hit.point.y = Math.max(hit.point.y, hit.a.cp.y + hit.a.half.y * 0.45);
      api.shove(hit.a, hit.point, dir, clamp(speed / 900, 1, 1.6) * 1.7);
    };
    const down = (e: PointerEvent) => { if (e.button !== 0 || interactive(e)) return; p.down = true; p.travel = 0; p.downAt = performance.now(); p.x = e.clientX; p.y = e.clientY; p.t = performance.now(); p.touch = e.pointerType === 'touch'; p.vx = p.vy = 0; };
    const up = (e: PointerEvent) => {
      if (!p.down) return; p.down = false;
      if (p.travel > 10 || performance.now() - p.downAt > 650 || interactive(e)) return;
      const hit = cast(e.clientX, e.clientY);
      if (!hit) return;
      if (hit.a.fixed) { stage.onLocked?.(e.clientX, e.clientY); return; }
      // A push goes the way you are looking, along the floor.
      tmpV2.copy(ray.ray.direction); tmpV2.y *= 0.12;
      if (tmpV2.lengthSq() < 0.05) return;
      api.shove(hit.a, hit.point, tmpV2.normalize(), 2.3);
    };
    const cancel = () => { p.down = false; };
    const leave = () => { p.x = p.y = -1; stage.over = false; };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', cancel, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const hitPoint = useMemo(() => v3(), []);
  const cast = (cx: number, cy: number): { a: Actor; point: THREE.Vector3 } | null => {
    const s = sizeRef.current;
    ray.setFromCamera(new THREE.Vector2((cx / s.width) * 2 - 1, -(cy / s.height) * 2 + 1), camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    // The floor and the walls of the room are not in the way of a push.
    const hit = world.castRay(new R.Ray({ x: o.x, y: o.y, z: o.z }, { x: d.x, y: d.y, z: d.z }), 400, true, undefined, undefined, undefined, S.room);
    if (!hit) return null;
    const body = hit.collider.parent();
    const a = body ? byHandle.get(body.handle) : undefined;
    if (!a) return null;
    const toi = (hit as unknown as { timeOfImpact?: number; toi?: number }).timeOfImpact ?? (hit as unknown as { toi: number }).toi;
    hitPoint.copy(o).addScaledVector(d, toi);
    return { a, point: hitPoint };
  };

  /* ── one step of everything that is scripted ── */
  const control = (dt: number) => {
    const now = sim.now;
    for (const a of S.actors) {
      switch (a.mode) {
        case 'away':
          if (!a.present) break;
          if (still) { a.body.setEnabled(true); a.obj.visible = true; api.settle(a); a.cp.copy(a.home.p); a.pp.copy(a.home.p); a.cq.copy(a.home.q); a.pq.copy(a.home.q); }
          else api.startDrop(a);
          break;
        case 'drop': {
          a.t += dt;
          const tau = a.t - a.wait;
          if (tau < 0) break;
          a.obj.visible = true;
          const fall = Math.sqrt((2 * DROP) / FALL);
          let y = 0, rx = 0;
          if (tau < fall) y = DROP - 0.5 * FALL * tau * tau;
          else {
            const s = tau - fall;
            if (!a.landed) { a.landed = true; stage.shake = Math.min(0.09, stage.shake + a.thud); }
            if (!a.fixed) { y = 0.1 * Math.exp(-7.5 * s) * Math.abs(Math.sin(11 * s)); rx = a.rock * Math.exp(-4.4 * s) * Math.sin(12.5 * s); }
            if (s > (a.fixed ? 0.04 : 1.1)) { api.settle(a); break; }
          }
          tmpQ.setFromAxisAngle(X, rx); tmpQ2.copy(a.home.q).multiply(tmpQ);
          tmpV.copy(a.home.p); tmpV.y = Math.max(a.home.p.y + y, api.clearance(a, tmpQ2) + 0.001);
          a.body.setNextKinematicTranslation(tmpV); a.body.setNextKinematicRotation(tmpQ2);
          break;
        }
        case 'home': {
          if (!a.present) {
            if (still) { a.mode = 'away'; a.obj.visible = false; a.body.setEnabled(false); } else { a.mode = 'leave'; a.t = 0; api.setKin(a); api.read(a, a.from); }
            break;
          }
          if (a.fixed || a.body.isSleeping()) break;
          const t = a.body.translation();
          if (Math.hypot(t.x - a.home.p.x, t.y - a.home.p.y, t.z - a.home.p.z) > 0.03 || api.tilt(a.body.rotation()) > 0.03) { a.mode = 'loose'; a.looseT = 0; a.restT = 0; }
          break;
        }
        case 'loose': {
          if (!a.present) { a.mode = 'leave'; a.t = 0; api.setKin(a); api.read(a, a.from); break; }
          a.looseT += dt;
          const lv = a.body.linvel(), av = a.body.angvel(), sp = Math.hypot(lv.x, lv.y, lv.z);
          if (sp < 0.35 && Math.hypot(av.x, av.y, av.z) < 0.7) a.restT += dt; else a.restT = 0;
          // Nothing leaves the paper at speed.
          if (sp > 12) a.body.setLinvel({ x: (lv.x / sp) * 12, y: (lv.y / sp) * 12, z: (lv.z / sp) * 12 }, true);
          const t = a.body.translation();
          const lost = t.y < -2 || Math.abs(t.x) > 23 || Math.abs(t.z) > 30;
          // Up when it has lain still for a moment; or, if its neighbours are already getting up, with them.
          const wave = now - sim.lastRise < 0.5 && a.looseT > 1.6;
          const ready = !a.hold && now >= a.riseAfter && now - a.pushedAt > 0.9 && ((a.restT > 0.9 && a.looseT > 2.3) || a.looseT > 7 || wave);
          if (lost || (ready && now - sim.lastRise > (a.calm ? 0.17 : 0.1))) api.startRise(a, a.home, 'spring', false);
          break;
        }
        case 'rise': {
          a.t += dt;
          if (!a.present) { a.mode = 'leave'; a.t = 0; api.read(a, a.from); break; }
          let done = false;
          if (a.style === 'fall') {
            // Toppling: slow, then all at once, then one short rebound off the floor.
            const T = 0.62;
            if (a.t < T) a.u = Math.pow(a.t / T, 2.4);
            else { const s = a.t - T; if (a.u < 1 && s < 0.05) stage.shake = Math.min(0.09, stage.shake + 0.03); a.u = 1 - 0.075 * Math.exp(-6.5 * s) * Math.abs(Math.sin(10.5 * s)); done = s > 0.95; }
          } else {
            const k = a.calm ? 26 : 62, c = a.calm ? 7.6 : 9.4;
            a.du += (k * (1 - a.u) - c * a.du) * dt; a.u += a.du * dt;
            done = a.t > 0.35 && Math.abs(1 - a.u) < 0.003 && Math.abs(a.du) < 0.04;
          }
          const e = clamp(a.u);
          tmpQ.setFromAxisAngle(a.axis, a.angle * (1 - a.u)); tmpQ2.copy(tmpQ).multiply(a.to.q);
          tmpV.lerpVectors(a.from.p, a.to.p, a.style === 'fall' ? e : smooth(e));
          tmpV.y += a.lift * Math.sin(Math.PI * e);
          tmpV.y = Math.max(tmpV.y, api.clearance(a, tmpQ2) + 0.001);
          a.body.setNextKinematicTranslation(tmpV); a.body.setNextKinematicRotation(tmpQ2);
          if (done) { if (a.stay) { a.mode = 'held'; a.body.setNextKinematicTranslation(a.to.p); a.body.setNextKinematicRotation(a.to.q); api.solid(a, true); } else api.settle(a); }
          break;
        }
        case 'held':
          break;
        case 'leave': {
          a.t += dt;
          tmpV.copy(a.from.p); tmpV.y += 0.5 * 26 * a.t * a.t;
          a.body.setNextKinematicTranslation(tmpV);
          if (a.t > 0.8) { a.mode = 'away'; a.obj.visible = false; a.body.setEnabled(false); }
          break;
        }
      }
    }
    // The dot, when it is off on its own.
    const b = sim.ball;
    if (b.free) {
      if (b.route) {
        const r = b.route; r.t = Math.min(1, r.t + dt / r.dur);
        const e = r.t < 0.5 ? 4 * r.t ** 3 : 1 - Math.pow(-2 * r.t + 2, 3) / 2, i = 1 - e;
        tmpV.set(i * i * r.a.x + 2 * i * e * r.c.x + e * e * r.b.x, 0, i * i * r.a.z + 2 * i * e * r.c.z + e * e * r.b.z);
        const dx = tmpV.x - b.p.x, dz = tmpV.z - b.p.z, d = Math.hypot(dx, dz);
        if (d > 1e-6) { tmpQ.setFromAxisAngle(tmpV2.set(dz / d, 0, -dx / d), d / QDOT.r); b.q.premultiply(tmpQ); }
        b.p.x = tmpV.x; b.p.z = tmpV.z; b.p.y = lerp(b.y0, QDOT.r, smooth(clamp(r.t * 3)));
        if (r.t >= 1) b.route = null;
      }
      S.ballBody.setNextKinematicTranslation(b.p);
    }
  };

  const rollTo = (x: number, z: number, first: boolean) => {
    const b = sim.ball, a = b.p.clone().setY(0), end = v3(x, 0, z);
    const len = a.distanceTo(end);
    if (len < 0.01) return;
    const c = first ? v3(a.x + 0.1, 0, lerp(a.z, end.z, 0.75)) : a.clone().lerp(end, 0.5).add(v3(-0.42, 0, 0));
    b.y0 = b.p.y;
    b.route = { a, b: end, c, t: 0, dur: 0.55 + len * 0.3 };
  };

  /* ── the frame ── */
  useFrame((_, dtRaw) => {
    // A slow frame is caught up with extra fixed steps (up to a second's worth), so the set keeps real time.
    // After a rest there is nothing to catch up on.
    const dt = sim.quiet >= 4 ? STEP : Math.min(dtRaw, 1);
    if (!sim.started || sim.opening) stage.wake = Math.max(stage.wake, 10);
    const f = stage.f, b = sim.ball;
    // Each material reflects the studio by its own amount, so it has to hold the environment itself.
    if (!envSet.current && scene.environment) {
      envSet.current = true;
      for (const m of [M.ink, M.red, M.steel, M.dark, M.brass]) { m.envMap = scene.environment; m.needsUpdate = true; }
    }

    // The opening: nine letters and a question mark come down one after another.
    if (!sim.started && (stage.go || still)) {
      sim.started = true;
      const order = [...word, S.hook];
      order.forEach((a, i) => {
        a.body.setEnabled(true);
        if (still) { a.obj.visible = true; api.settle(a); a.cp.copy(a.home.p); a.pp.copy(a.home.p); a.cq.copy(a.home.q); a.pq.copy(a.home.q); }
        else { a.wait = 0.15 + i * 0.13 + (a.kind === 'hook' ? 0.22 : 0); a.rock = (i % 2 ? 1 : -1) * (0.035 + (i % 3) * 0.012); a.thud = a.kind === 'hook' ? 0.03 : 0.016; api.startDrop(a); }
      });
      if (still) { sim.opening = false; stage.opened = true; stage.onOpened?.(); }
    }
    if (sim.opening && sim.started && S.hook.mode === 'home') { sim.opening = false; stage.opened = true; stage.onOpened?.(); }

    // What the scroll has brought on.
    const on = (kind: Kind, yes: boolean) => { for (const a of S.actors) if (a.kind === kind) a.present = yes; };
    on('plinth', f > 2.5); on('volume', f > 3.55); on('coach', f > 5.5); on('peg', f > 5.5);
    const fade = (ms: THREE.Mesh[], yes: boolean) => {
      for (const m of ms) {
        const mat = m.material as THREE.Material, to = yes ? 1 : 0;
        if (mat.opacity !== to) { mat.opacity = still || Math.abs(mat.opacity - to) < 0.01 ? to : damp(mat.opacity, to, 5, Math.min(dt, 0.1)); stage.wake = Math.max(stage.wake, 6); }
        m.visible = mat.opacity > 0.01;
      }
    };
    fade(S.peopleCaptions, f > 5.6); fade(S.wayCaptions, f > 7.5);

    if (!still && !sim.opening) {
      // "Yes, the name is a position": the scroll knocks the word flat on its back.
      const down = f > 6.84 && f < 8.62;
      if (down !== sim.down) {
        sim.down = down;
        const calm = f > 8;
        if (down) word.forEach((a, i) => { a.hold = true; sim.jobs.push({ at: sim.now + i * 0.085, run: () => { if (sim.down && a.mode !== 'drop') api.startRise(a, lying[i], a.mode === 'home' ? 'fall' : 'spring', true); } }); });
        else word.forEach((a, i) => {
          a.hold = false; a.calm = calm; a.riseAfter = sim.now + 0.25 + i * (calm ? 0.2 : 0.09);
          sim.jobs.push({ at: a.riseAfter, run: () => { if (!sim.down && (a.mode === 'held' || (a.mode === 'rise' && a.stay))) api.startRise(a, a.home, 'spring', false); } });
        });
      }
      // Join: the question mark tips towards you and lets go of its dot.
      const join = f > 7.58 && f < 8.6;
      if (join !== sim.join) {
        sim.join = join;
        const h = S.hook;
        if (join) {
          if (!b.free) { b.free = true; S.dotCollider.setEnabled(false); S.ballBody.setEnabled(true); S.ballBody.setTranslation(b.p, true); }
          b.at = -1;
          sim.jobs.push({ at: sim.now + 0.16, run: () => { if (sim.join && h.mode !== 'drop') api.startRise(h, tipped, h.mode === 'home' ? 'fall' : 'spring', true); } });
        } else {
          rollTo(dotHome.x, dotHome.z, false); b.at = -1;
          h.calm = f > 8;
          sim.jobs.push({ at: sim.now + 0.5, run: () => { if (!sim.join && (h.mode === 'held' || h.mode === 'rise')) api.startRise(h, h.home, 'spring', false); } });
        }
      }
      if (sim.join && b.free && b.at !== stage.way) { const w = plan.ways[stage.way]; rollTo(w.x, w.z, b.at === -1); b.at = stage.way; }
      // Back together: the dot is under the hook again and the hook is standing.
      if (!sim.join && b.free && !b.route && S.hook.mode === 'home' && Math.hypot(b.p.x - dotHome.x, b.p.z - dotHome.z) < 0.02) {
        b.free = false; S.dotCollider.setEnabled(true); S.ballBody.setEnabled(false);
        api.read(S.hook, S.hook.from); b.offQ.copy(S.hook.from.q).invert().multiply(b.q);
      }
    }

    // What the page asked for.
    while (stage.cmds.length) {
      const c = stage.cmds.shift()!;
      if (sim.opening || still) continue;
      if (c.type === 'all') [...word, S.hook].forEach((a, i) => sim.jobs.push({ at: sim.now + i * 0.07, run: () => api.topple(a, (i % 3) - 1, 2.0 + (i % 2) * 0.5) }));
      else for (const a of S.actors) if ((a.kind === 'letter' || a.kind === 'hook') && a.ch === c.ch) api.topple(a, 0, 2.2);
    }

    // Hover: the pointer shows when it is over something that can be pushed.
    const p = sim.ptr;
    if (p.moved && p.x >= 0 && !sim.opening) { p.moved = false; stage.over = !p.touch && !!cast(p.x, p.y); }

    // Step the world, at most a few fixed steps a frame so a slow machine falls behind instead of blowing up.
    let busy = sim.jobs.length > 0 || !!b.route;
    if (!busy) for (const a of S.actors) { if ((a.mode !== 'home' && a.mode !== 'away' && a.mode !== 'held') || a.present !== (a.mode !== 'away') || (a.mode === 'home' && !a.fixed && !a.body.isSleeping())) { busy = true; break; } }
    sim.quiet = busy ? 0 : sim.quiet + 1;
    if (sim.quiet < 6 || stage.shake > 0.0005) { stage.wake = Math.max(stage.wake, 6); stage.dirty = 3; }
    if (sim.started && sim.quiet < 4) {
      sim.acc += dt; let n = 0;
      while (sim.acc >= STEP && n < 60) {
        sim.now += STEP;
        for (let i = sim.jobs.length - 1; i >= 0; i--) if (sim.jobs[i].at <= sim.now) sim.jobs.splice(i, 1)[0].run();
        control(STEP);
        for (const a of S.actors) { a.pp.copy(a.cp); a.pq.copy(a.cq); }
        world.step();
        for (const a of S.actors) { if (a.mode === 'away') continue; const t = a.body.translation(), r = a.body.rotation(); a.cp.set(t.x, t.y, t.z); a.cq.set(r.x, r.y, r.z, r.w); }
        sim.acc -= STEP; n++;
      }
      if (n === 60) sim.acc = 0;
    } else sim.acc = 0;
    const alpha = clamp(sim.acc / STEP);
    for (const a of S.actors) {
      if (!a.obj.visible) continue;
      a.obj.position.lerpVectors(a.pp, a.cp, alpha); a.obj.quaternion.slerpQuaternions(a.pq, a.cq, alpha);
    }
    // The dot rides on the hook unless it has rolled off.
    if (!b.free) { b.p.copy(S.dotLocal).applyQuaternion(S.hook.obj.quaternion).add(S.hook.obj.position); b.q.copy(S.hook.obj.quaternion).multiply(b.offQ); }
    S.ballMesh.visible = b.free || S.hook.obj.visible;
    S.ballMesh.position.copy(b.p); S.ballMesh.quaternion.copy(b.q);
    stage.shake = damp(stage.shake, 0, 9, dt);
  });

  return <primitive object={root} />;
}

/* ───────────────────────── the camera ───────────────────────── */

type CamPose = { p: THREE.Vector3; t: THREE.Vector3; up: THREE.Vector3; fov: number; sx: number; sy: number };
function poseOf(s: Shot, aspect: number, out: CamPose): CamPose {
  const az = (s.az * Math.PI) / 180, el = (s.el * Math.PI) / 180;
  const tanV = Math.tan((s.fov * Math.PI) / 360), tanH = tanV * aspect;
  const fw = s.frame.x1 - s.frame.x0, fh = s.frame.y1 - s.frame.y0;
  const d = Math.max(s.h / (2 * tanV * fh), s.w / (2 * tanH * fw));
  out.t.set(s.at[0], s.at[1], s.at[2]);
  out.p.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d).add(out.t);
  out.p.y = Math.max(out.p.y, 0.09);
  if (s.up) out.up.set(s.up[0], s.up[1], s.up[2]); else out.up.set(0, 1, 0);
  out.fov = s.fov; out.sx = (s.frame.x0 + s.frame.x1) / 2 - 0.5; out.sy = (s.frame.y0 + s.frame.y1) / 2 - 0.5;
  return out;
}
const blank = (): CamPose => ({ p: v3(), t: v3(), up: v3(0, 1, 0), fov: 20, sx: 0, sy: 0 });

function Rig({ plan }: { plan: Plan }) {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const A = useMemo(blank, []), B = useMemo(blank, []), tmp = useMemo(() => v3(), []), tmp2 = useMemo(() => v3(), []);
  const sway = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const curves = useRef(new Map<string, { p: THREE.CatmullRomCurve3; t: THREE.CatmullRomCurve3 }>());
  useEffect(() => { cam.layers.enable(1); cam.near = 0.04; cam.far = 500; }, [cam]);
  useEffect(() => { curves.current.clear(); }, [size.width, size.height, plan]);
  useEffect(() => {
    if (still) return;
    const move = (e: PointerEvent) => { if (e.pointerType === 'touch') return; sway.current.tx = e.clientX / window.innerWidth - 0.5; sway.current.ty = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  const moving = useRef(false);
  useFrame((state, dtRaw) => {
    // After a rest the first frame's gap is not time the camera should make up.
    const dt = moving.current ? Math.min(dtRaw, 0.25) : 1 / 60;
    // Where the scroll is among the stops: hold at each, glide between.
    const stops = stage.stops; let raw = 0;
    if (stops.length) {
      const c = scroll.y + size.height / 2;
      raw = stops.length - 1;
      for (let i = 0; i < stops.length; i++) {
        if (c <= stops[i].b) { raw = c >= stops[i].a || i === 0 ? i : i - 1 + smooth(clamp((c - stops[i - 1].b) / Math.max(1, stops[i].a - stops[i - 1].b))); break; }
      }
    }
    stage.raw = raw;
    stage.f = still ? Math.round(raw) : Math.abs(raw - stage.f) < 0.0004 ? raw : damp(stage.f, raw, 6.5, dt);
    const f = clamp(stage.f, 0, STOPS.length - 1), i = Math.min(STOPS.length - 2, Math.floor(f)), t = f - i;
    const aspect = size.width / size.height;
    poseOf(plan.shots[STOPS[i]], aspect, A); poseOf(plan.shots[STOPS[i + 1]], aspect, B);
    const key = `${STOPS[i]}>${STOPS[i + 1]}`, via = plan.vias[key];
    if (via && t > 0 && t < 1) {
      let cv = curves.current.get(key);
      if (!cv) {
        cv = {
          p: new THREE.CatmullRomCurve3([A.p.clone(), ...via.map((v) => v3(...v.p)), B.p.clone()], false, 'centripetal'),
          t: new THREE.CatmullRomCurve3([A.t.clone(), ...via.map((v) => v3(...v.t)), B.t.clone()], false, 'centripetal'),
        };
        curves.current.set(key, cv);
      }
      cv.p.getPoint(t, cam.position); cv.t.getPoint(t, tmp);
    } else { cam.position.lerpVectors(A.p, B.p, t); tmp.lerpVectors(A.t, B.t, t); }
    cam.up.lerpVectors(A.up, B.up, t).normalize();
    // A little life: the camera leans a few centimetres toward the pointer and shudders when something lands.
    const s = sway.current; s.x = damp(s.x, s.tx, 3, dt); s.y = damp(s.y, s.ty, 3, dt);
    moving.current = Math.abs(raw - stage.f) > 0.0004 || Math.abs(s.x - s.tx) + Math.abs(s.y - s.ty) > 0.002 || stage.shake > 0.0005;
    if (moving.current) stage.wake = Math.max(stage.wake, 6);
    const reach = cam.position.distanceTo(tmp);
    if (!still) {
      tmp2.setFromMatrixColumn(cam.matrixWorld, 0); cam.position.addScaledVector(tmp2, s.x * reach * 0.022);
      cam.position.y += -s.y * reach * 0.012 + (stage.shake > 0.0005 ? Math.sin(state.clock.elapsedTime * 71) * stage.shake * reach * 0.012 : 0);
      cam.position.y = Math.max(cam.position.y, 0.07);
    }
    cam.lookAt(tmp);
    cam.fov = lerp(A.fov, B.fov, t);
    const sx = lerp(A.sx, B.sx, t), sy = lerp(A.sy, B.sy, t);
    cam.setViewOffset(size.width, size.height, -sx * size.width, -sy * size.height, size.width, size.height);
  }, -1);
  return null;
}

/* ───────────────────────── light ───────────────────────── */

/** The key: one big source, high and behind to the left, so the shadows fall forward where you can see them. */
function Key({ cx, far, low }: { cx: number; far: number; low: boolean }) {
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight('#fffaf2', 1.85);
    const mid = -far / 2 + 2.5, half = far / 2 + 9;
    l.position.set(cx - 8, 13, mid - 6.5); l.target.position.set(cx, 0, mid + 1);
    l.castShadow = true; l.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
    l.shadow.bias = -0.0004; l.shadow.normalBias = 0.035; l.shadow.radius = low ? 3 : 5;
    const c = l.shadow.camera; c.left = -18; c.right = 18; c.top = half; c.bottom = -half; c.near = 2; c.far = 70; c.updateProjectionMatrix();
    return l;
  }, [cx, far, low]);
  useEffect(() => () => { light.shadow.map?.dispose(); }, [light]);
  return <><primitive object={light} /><primitive object={light.target} /></>;
}

/* ───────────────────────── soft shadow under everything ───────────────────────── */

/**
 * The dark where things meet the paper: the set seen from underneath, blurred,
 * laid back on the floor (after drei's ContactShadows). It is only drawn again
 * when something has moved.
 */
function Contact({ x, z, w, h, res, far, blur, opacity, color }: { x: number; z: number; w: number; h: number; res: number; far: number; blur: number; opacity: number; color: string }) {
  const { gl, scene } = useThree();
  const K = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(res, res), targetBlur = new THREE.WebGLRenderTarget(res, res);
    target.texture.generateMipmaps = targetBlur.texture.generateMipmaps = false;
    const plane = new THREE.PlaneGeometry(w, h).rotateX(Math.PI / 2);
    const blurPlane = new THREE.Mesh(plane); blurPlane.visible = false;
    const depth = new THREE.MeshDepthMaterial(); depth.depthTest = depth.depthWrite = false;
    depth.onBeforeCompile = (shader) => {
      shader.uniforms.ucolor = { value: new THREE.Color(color) };
      shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'uniform vec3 ucolor;\nvoid main() {')
        .replace('vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );');
    };
    const hb = new THREE.ShaderMaterial(HorizontalBlurShader), vb = new THREE.ShaderMaterial(VerticalBlurShader);
    hb.depthTest = vb.depthTest = false;
    const cam = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0, far);
    const show = new THREE.MeshBasicMaterial({ transparent: true, map: target.texture, opacity, depthWrite: false });
    const mesh = new THREE.Mesh(plane, show); mesh.scale.set(1, -1, 1); mesh.rotation.x = -Math.PI / 2;
    const group = new THREE.Group(); group.rotation.x = Math.PI / 2; group.position.set(x, 0.006, z); group.add(mesh, cam, blurPlane);
    return { target, targetBlur, plane, blurPlane, depth, hb, vb, cam, show, group };
  }, [x, z, w, h, res, far, opacity, color]);
  useEffect(() => () => { K.target.dispose(); K.targetBlur.dispose(); K.plane.dispose(); K.depth.dispose(); K.hb.dispose(); K.vb.dispose(); K.show.dispose(); }, [K]);
  useFrame(() => {
    if (stage.dirty <= 0) return;
    stage.dirty--;
    gl.shadowMap.needsUpdate = true;
    const bg = scene.background, om = scene.overrideMaterial;
    K.group.visible = false; scene.background = null; scene.overrideMaterial = K.depth;
    gl.setRenderTarget(K.target); gl.render(scene, K.cam);
    scene.overrideMaterial = om;
    const pass = (b: number) => {
      K.blurPlane.visible = true;
      K.blurPlane.material = K.hb; K.hb.uniforms.tDiffuse.value = K.target.texture; K.hb.uniforms.h.value = b / 256;
      gl.setRenderTarget(K.targetBlur); gl.render(K.blurPlane, K.cam);
      K.blurPlane.material = K.vb; K.vb.uniforms.tDiffuse.value = K.targetBlur.texture; K.vb.uniforms.v.value = b / 256;
      gl.setRenderTarget(K.target); gl.render(K.blurPlane, K.cam);
      K.blurPlane.visible = false;
    };
    K.group.visible = true; pass(blur); pass(blur * 0.4);
    gl.setRenderTarget(null); scene.background = bg;
  });
  return <primitive object={K.group} />;
}

/** Frames are drawn only while something is happening: a scroll, a push, a pointer, an arrival. */
function Pump() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let last = -1;
    const poke = () => { stage.wake = Math.max(stage.wake, 45); };
    const tick = () => {
      if (scroll.y !== last) { last = scroll.y; stage.wake = Math.max(stage.wake, 30); }
      if (stage.cmds.length || !stage.opened) stage.wake = Math.max(stage.wake, 10);
      if (stage.wake > 0) { stage.wake--; invalidate(); }
    };
    stage.wake = Math.max(stage.wake, 180); stage.dirty = 4;
    gsap.ticker.add(tick);
    const evs = ['pointermove', 'pointerdown', 'pointerup', 'keydown', 'resize', 'focus'] as const;
    evs.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    return () => { gsap.ticker.remove(tick); evs.forEach((e) => window.removeEventListener(e, poke)); };
  }, [invalidate]);
  return null;
}

/* ───────────────────────── the canvas ───────────────────────── */

export default function Stage({ plan }: { plan: Plan }) {
  const M = useMemo(makeMaterials, []);
  useEffect(() => () => { Object.values(M).forEach((m) => { if (m instanceof THREE.Material) m.dispose(); }); M.textures.forEach((t) => t.dispose()); }, [M]);
  const low = plan.phone;
  const cx = (plan.letters[0].x + plan.q.x) / 2;
  return (
    <Canvas
      frameloop="demand" shadows={{ type: THREE.PCFShadowMap }} dpr={[1, low ? 1.5 : 1.6]} camera={{ fov: 15, near: 0.04, far: 500, position: [0, 3, 40] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.02; gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true; }}
      style={{ touchAction: 'pan-y', pointerEvents: 'none' }}
    >
      <color attach="background" args={[PAPER]} />
      <fog attach="fog" args={[PAPER, 110, 420]} />
      <hemisphereLight args={['#ffffff', '#e4e0d6', 0.9]} />
      <Key cx={cx} far={-plan.volumes.z} low={low} />
      {/* The fill: from the camera's side, no shadow, so the faces are not lost. */}
      <directionalLight position={[cx + 6, 7, 14]} intensity={2.3} color="#fbfaff" />
      <Environment resolution={256} frames={1}>
        {/* What the lacquer and the metal reflect: a dim studio, three softboxes, and the bright paper underfoot. */}
        <color attach="background" args={['#3f3b34']} />
        <Lightformer form="rect" intensity={3.2} color="#fffaf0" position={[-3, 9, -5]} rotation-x={Math.PI / 2} scale={[18, 4, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#fffaf0" position={[4, 9, 7]} rotation-x={Math.PI / 2} scale={[14, 3, 1]} />
        <Lightformer form="rect" intensity={4.2} color="#fff6ea" position={[-12, 4, 6]} rotation-y={Math.PI / 2.4} scale={[2.6, 9, 1]} />
        <Lightformer form="rect" intensity={2.6} color="#eef2ff" position={[12, 4, -2]} rotation-y={-Math.PI / 2} scale={[2.6, 9, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#f6f2ea" position={[0, 4, 16]} rotation-y={Math.PI} scale={[22, 5, 1]} />
        <Lightformer form="rect" intensity={0.85} color="#efe9dc" position={[0, -2.5, 0]} rotation-x={-Math.PI / 2} scale={[60, 60, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#e9e4d8" position={[0, 6, -15]} scale={[50, 12, 1]} />
      </Environment>
      <Sweep zf={plan.volumes.z - 3.6} material={M.paper} />
      <Suspense fallback={null}>
        <Physics paused gravity={[0, -GRAV, 0]}>
          <TheSet plan={plan} M={M} low={low} />
        </Physics>
      </Suspense>
      <Contact x={cx} z={(7.5 + plan.volumes.z - 2.5) / 2} w={low ? 26 : 36} h={10 - plan.volumes.z} res={low ? 512 : 1024} far={2.6} blur={low ? 1.5 : 2.1} opacity={0.62} color="#231b12" />
      <Rig plan={plan} />
      <Pump />
    </Canvas>
  );
}
