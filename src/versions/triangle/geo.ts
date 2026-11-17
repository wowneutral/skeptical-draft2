// The impossible triangle, built honestly: three square beams placed in depth so
// they only close from one camera position. The geometry is laid out in an
// orthographic frame, then pulled into perspective (near parts shrink exactly as
// much as the lens enlarges them), so from the hero camera the join is exact.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createNoise4D } from 'simplex-noise';

export const L = 3; // corner to corner, along each beam
export const W = 0.56; // beam section
export const D = 24; // hero camera distance
export const T = new THREE.Vector3(0, 0, 0); // hero target, the triangle's centroid
// Hero camera looks dead level along -z.
const R = new THREE.Vector3(1, 0, 0), U = new THREE.Vector3(0, 1, 0), B = new THREE.Vector3(0, 0, 1);
export const HERO_POS = new THREE.Vector3().copy(T).addScaledVector(B, D);

const k2 = Math.sqrt(2 / 3), k1 = 1 / Math.sqrt(3);
/** A cube axis, in camera coordinates (a right, b up, c toward camera), whose image points at angle phi. */
const axis = (phi: number) => new THREE.Vector3(k2 * Math.cos(phi), k2 * Math.sin(phi), k1);
const rad = THREE.MathUtils.degToRad;

/** Ortho camera coordinates to world, through the anamorphic correction. */
function toWorld(p: THREE.Vector3, out = new THREE.Vector3()) {
  const s = (D - p.z) / D;
  return out.copy(T).addScaledVector(R, p.x * s).addScaledVector(U, p.y * s).addScaledVector(B, p.z);
}
const J = new THREE.Matrix3();
function normalToWorld(p: THREE.Vector3, n: THREE.Vector3, out = new THREE.Vector3()) {
  const s = (D - p.z) / D, sp = -1 / D;
  // Jacobian of toWorld in (R,U,B); normals go through its inverse transpose.
  J.set(s, 0, p.x * sp, 0, s, p.y * sp, 0, 0, 1).invert().transpose();
  const m = n.clone().applyMatrix3(J);
  return out.set(0, 0, 0).addScaledVector(R, m.x).addScaledVector(U, m.y).addScaledVector(B, m.z).normalize();
}

export type Built = {
  beams: THREE.BufferGeometry[];
  corners: { apexFar: THREE.Vector3; left: THREE.Vector3; right: THREE.Vector3; apexNear: THREE.Vector3 };
  mids: THREE.Vector3[];
  minY: number;
  box: THREE.Box3;
};

export function buildTriangle(): Built {
  // Image: apex up. Beam 1 runs from the apex down-left, beam 2 is the base, beam 3 climbs back to the apex.
  const e1 = axis(rad(240)), e2 = axis(rad(0)), e3 = axis(rad(120));
  const side = L * k2, r = side / Math.sqrt(3);
  const P0 = new THREE.Vector3(0, r, -Math.sqrt(3) * L / 2);
  const P1 = P0.clone().addScaledVector(e1, L);
  const P2 = P1.clone().addScaledVector(e2, L);
  const P3 = P2.clone().addScaledVector(e3, L);
  const plan: { from: THREE.Vector3; dir: THREE.Vector3; a: number; b: number; o1: THREE.Vector3; o2: THREE.Vector3; seed: number }[] = [
    // Beam 1 carries both corner blocks of its own ends; the others start just past a block.
    { from: P0, dir: e1, a: -W / 2, b: L + W / 2, o1: e2, o2: e3, seed: 0.13 },
    { from: P1, dir: e2, a: W / 2 - 0.05, b: L + W / 2, o1: e3, o2: e1, seed: 0.57 },
    { from: P2, dir: e3, a: W / 2 - 0.05, b: L + W / 2, o1: e1, o2: e2, seed: 0.91 },
  ];
  const box = new THREE.Box3();
  const beams = plan.map((bm) => {
    const len = bm.b - bm.a;
    const th = bm.a < 0 ? W : W - 0.002;
    const g = new RoundedBoxGeometry(len, th, th, 3, 0.04);
    const pos = g.attributes.position as THREE.BufferAttribute, nor = g.attributes.normal as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const p = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Vector3(), w = new THREE.Vector3(), wn = new THREE.Vector3();
    const mid = (bm.a + bm.b) / 2;
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i); n.fromBufferAttribute(nor, i);
      // Box projection UVs in the beam's own frame, so the veins run with the stone.
      const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
      const lx = p.x + mid, S = 0.36;
      if (ax >= ay && ax >= az) uv.setXY(i, p.y * S + bm.seed * 3 + n.x, p.z * S + bm.seed);
      else if (ay >= az) uv.setXY(i, lx * S + bm.seed, p.z * S + bm.seed * 2 + n.y * 0.5);
      else uv.setXY(i, lx * S + bm.seed, p.y * S + bm.seed * 5 + n.z * 0.5);
      // Beam frame to ortho camera frame.
      c.copy(bm.from).addScaledVector(bm.dir, lx).addScaledVector(bm.o1, p.y).addScaledVector(bm.o2, p.z);
      const cn = new THREE.Vector3().addScaledVector(bm.dir, n.x).addScaledVector(bm.o1, n.y).addScaledVector(bm.o2, n.z);
      toWorld(c, w); normalToWorld(c, cn, wn);
      pos.setXYZ(i, w.x, w.y, w.z); nor.setXYZ(i, wn.x, wn.y, wn.z);
      box.expandByPoint(w);
    }
    pos.needsUpdate = true; nor.needsUpdate = true; uv.needsUpdate = true;
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  });
  const mids = [P0.clone().lerp(P1, 0.5), P1.clone().lerp(P2, 0.5), P2.clone().lerp(P3, 0.5)].map((v) => toWorld(v));
  return {
    beams,
    corners: { apexFar: toWorld(P0), left: toWorld(P1), right: toWorld(P2), apexNear: toWorld(P3) },
    mids, minY: box.min.y, box,
  };
}

/** Carrara, drawn: warm white ground, grey veins that branch, a faint second set, polish that varies. */
export function marbleTextures(size = 512) {
  const n4 = createNoise4D(mulberry(7));
  const col = document.createElement('canvas'); col.width = col.height = size;
  const rgh = document.createElement('canvas'); rgh.width = rgh.height = size;
  const cx = col.getContext('2d')!, rx = rgh.getContext('2d')!;
  const ci = cx.createImageData(size, size), ri = rx.createImageData(size, size);
  const TAU = Math.PI * 2;
  // Tileable noise: walk a torus in 4D.
  const tn = (u: number, v: number, f: number) => {
    const a = u * TAU, b = v * TAU, rr = f / TAU;
    return n4(Math.cos(a) * rr, Math.sin(a) * rr, Math.cos(b) * rr, Math.sin(b) * rr);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      let turb = 0, amp = 1, f = 1.4;
      for (let o = 0; o < 4; o++) { turb += tn(u, v, f) * amp; amp *= 0.48; f *= 2.1; }
      const warp = tn(u + 0.31, v + 0.17, 1);
      // Main veins: long soft ridges of a gently warped field, with a crisp core.
      const fld = Math.abs(Math.sin((u + v * 0.42) * TAU + turb * 2.3 + warp * 1.2));
      const vein = Math.exp(-fld * 9) * 0.55 + Math.exp(-fld * 55) * 0.6;
      const fld2 = Math.abs(Math.sin((v - u * 0.7) * TAU * 2 + turb * 3.4 + 1.7));
      const hair = Math.exp(-fld2 * 90) * 0.4;
      const cloud = tn(u, v, 3) * 0.5 + 0.5;
      const dark = Math.min(1, vein * 0.5 + hair * 0.45 + cloud * 0.08);
      const i = (y * size + x) * 4;
      // Ground #eeebe4, vein #8a8d93 (a cool grey).
      ci.data[i] = 240 - dark * (240 - 120);
      ci.data[i + 1] = 237 - dark * (237 - 122);
      ci.data[i + 2] = 231 - dark * (231 - 128);
      ci.data[i + 3] = 255;
      const rough = 0.22 + cloud * 0.14 + vein * 0.2 + hair * 0.1;
      const g = Math.round(Math.min(1, rough) * 255);
      ri.data[i] = g; ri.data[i + 1] = g; ri.data[i + 2] = g; ri.data[i + 3] = 255;
    }
  }
  cx.putImageData(ci, 0, 0); rx.putImageData(ri, 0, 0);
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace;
  const rough = new THREE.CanvasTexture(rgh);
  for (const t of [map, rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  return { map, rough };
}

/** Plaster and limestone: almost flat, a little tooth. */
export function stoneTexture(base: [number, number, number], amount: number, size = 256) {
  const n4 = createNoise4D(mulberry(19));
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const cx = cv.getContext('2d')!; const im = cx.createImageData(size, size);
  const TAU = Math.PI * 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const a = (x / size) * TAU, b = (y / size) * TAU;
    let v = 0, amp = 1, f = 3;
    for (let o = 0; o < 4; o++) { const rr = f / TAU; v += n4(Math.cos(a) * rr, Math.sin(a) * rr, Math.cos(b) * rr, Math.sin(b) * rr) * amp; amp *= 0.5; f *= 2.1; }
    const d = v * amount, i = (y * size + x) * 4;
    im.data[i] = base[0] + d; im.data[i + 1] = base[1] + d; im.data[i + 2] = base[2] + d; im.data[i + 3] = 255;
  }
  cx.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function mulberry(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
