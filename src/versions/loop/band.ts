// The band: a thin porcelain solid with one side. Its whole surface is a single
// strip twice the length of the loop, so one line printed along it reads
// unbroken, comes back on the far face after one lap and home after two.
import * as THREE from 'three';
import { DRIVE, FOOTER, HERO, JOIN, MANIFESTO, PEOPLE, RECORD } from '@/content';

export const R = 1;           // radius of the centre line
export const W = 0.2454;      // half the width of the band
export const H = 0.026;       // half the thickness
export const WF = W - H;      // half the width of the flat faces
export const FLOOR = -(R + W) - 0.002;
const U0 = -Math.PI / 2;      // where the band stands upright on its edge (the bottom)
const US = Math.PI / 2;       // where the strip starts: the top, where it lies flat

/** The printed sentence for each stop, in page order. Whole sentences only. */
export const LINES = [
  HERO.statement.join(' '),
  MANIFESTO[3],
  RECORD.rule,
  DRIVE.lead,
  PEOPLE.count,
  JOIN.lead,
  FOOTER.line,
];

/** What the page and the scene share. Plain mutable state; nothing here renders React. */
export const S = {
  f: 0,            // where the scroll is among the stops, 0 to 6
  pf: 0,           // the same for the camera: whole numbers hold, fractions are a move between stops
  follow: 0,       // 0 to 1 through the manifesto, where the camera goes round with the line
  line: 0,         // which sentence the band should carry
  run: 0,          // where the print sits along the strip, in strips (1 = two laps)
  target: 0,       // where the drag wants the print
  vel: 0,          // strips per second, while coasting
  dragging: false,
  tilt: { x: 0, y: 0 },
  opened: false,
  screen: { x: 0.7, y: 0.5, r: 0.3 }, // where the band is on screen, for the drag and the button
  phone: false,
  /** For stops whose band follows its own window on the page (Join, the footer): where that window's centre is, in screen fractions. */
  /** On a phone: the centre of the band's window nearest the top third of the screen, as a screen fraction. */
  phoneY: -9,
  track: [] as ({ x: number; y: number } | null)[],
};

function frame(u: number) {
  const c = Math.cos(u), s = Math.sin(u);
  const radial = new THREE.Vector3(c, s, 0);
  const z = new THREE.Vector3(0, 0, 1);
  const phi = (u - U0) / 2;
  const B = radial.clone().multiplyScalar(Math.cos(phi)).addScaledVector(z, Math.sin(phi));
  const N = radial.clone().multiplyScalar(-Math.sin(phi)).addScaledVector(z, Math.cos(phi));
  return { C: radial.clone().multiplyScalar(R), B, N };
}

/** A point on the closed cross-section (a stadium) at profile parameter q in [0, 4). */
function point(u: number, q: number, out = new THREE.Vector3()) {
  const { C, B, N } = frame(u);
  out.copy(C);
  if (q < 1) { out.addScaledVector(B, -WF + 2 * WF * q).addScaledVector(N, H); }
  else if (q < 2) { const t = Math.PI / 2 - Math.PI * (q - 1); out.addScaledVector(B, WF + H * Math.cos(t)).addScaledVector(N, H * Math.sin(t)); }
  else if (q < 3) { out.addScaledVector(B, WF - 2 * WF * (q - 2)).addScaledVector(N, -H); }
  else { const t = -Math.PI / 2 + Math.PI * (q - 3); out.addScaledVector(B, -WF - H * Math.cos(t)).addScaledVector(N, H * Math.sin(t)); }
  return out;
}

export function buildBand(segU = 720) {
  // The profile, densest on the rounded edges.
  const prof: number[] = [];
  const flat = 6, rim = 10;
  for (let i = 0; i < flat; i++) prof.push(i / flat);
  for (let i = 0; i < rim; i++) prof.push(1 + i / rim);
  for (let i = 0; i < flat; i++) prof.push(2 + i / flat);
  for (let i = 0; i < rim; i++) prof.push(3 + i / rim);
  prof.push(4);
  const P = prof.length;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  const p = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), du = new THREE.Vector3(), dq = new THREE.Vector3(), n = new THREE.Vector3();
  const e = 1e-4;
  for (let i = 0; i <= segU; i++) {
    const u = US + (i / segU) * Math.PI * 2;
    const C = frame(u).C;
    for (let j = 0; j < P; j++) {
      const q = prof[j] % 4;
      point(u, q, p);
      point(u + e, q, a); point(u - e, q, b); du.subVectors(a, b);
      const q1 = Math.min(q + e, 3.99999), q0 = Math.max(q - e, 0);
      point(u, q1, a); point(u, q0, b); dq.subVectors(a, b);
      n.crossVectors(du, dq).normalize();
      if (n.dot(a.subVectors(p, C)) < 0) n.negate();
      pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z);
      // The print: the near face is the strip's first lap, the far face its second.
      const lap = (u - US) / (Math.PI * 4);
      const pq = prof[j];
      if (pq === 1) uv.push(lap, 0);
      else if (pq === 3) uv.push(lap + 0.5, 0);
      else if (pq === 4) uv.push(lap, 1);
      else if (q < 1) { const v = -WF + 2 * WF * q; uv.push(lap, (WF - v) / (2 * WF)); }
      else if (q >= 2 && q < 3) { const v = WF - 2 * WF * (q - 2); uv.push(lap + 0.5, (WF + v) / (2 * WF)); }
      else uv.push(lap, -0.05);
    }
  }
  // Faces first (printed), then the rounded edges (plain glaze).
  const rims: number[] = [];
  for (let i = 0; i < segU; i++) for (let j = 0; j < P - 1; j++) {
    const k = i * P + j, k2 = (i + 1) * P + j;
    const isFace = prof[j] < 1 || (prof[j] >= 2 && prof[j] < 3);
    (isFace ? idx : rims).push(k, k2, k + 1, k + 1, k2, k2 + 1);
  }
  const nFace = idx.length;
  for (const r of rims) idx.push(r);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // Faces wind either way round the twist; make every triangle face its normal.
  const ia = g.index!.array as Uint32Array | Uint16Array;
  const pa = g.attributes.position.array as Float32Array, na = g.attributes.normal.array as Float32Array;
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), fn = new THREE.Vector3(), vn = new THREE.Vector3();
  for (let t = 0; t < ia.length; t += 3) {
    v0.fromArray(pa, ia[t] * 3); v1.fromArray(pa, ia[t + 1] * 3); v2.fromArray(pa, ia[t + 2] * 3);
    fn.crossVectors(v1.sub(v0), v2.sub(v0));
    vn.fromArray(na, ia[t] * 3);
    if (fn.dot(vn) < 0) { const x = ia[t + 1]; ia[t + 1] = ia[t + 2]; ia[t + 2] = x; }
  }
  g.addGroup(0, nFace, 0);
  g.addGroup(nFace, idx.length - nFace, 1);
  g.computeBoundingSphere();
  return g;
}

export const TEX_W = 6144, TEX_H = 240;
export const PRINT_FONT = "'Bodoni Moda Variable', 'Bodoni Moda', serif";

/** Draw one sentence as an ink mask (white on black), repeated whole so it closes on itself. */
export function drawLine(cv: HTMLCanvasElement, text: string) {
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (!text) return;
  let fs = cv.height * 0.5;
  const set = () => { ctx.font = `500 ${fs}px ${PRINT_FONT}`; };
  set();
  let w = ctx.measureText(text).width;
  let n = Math.max(1, Math.round(cv.width / (w * 1.12 + fs * 1.6)));
  const room = cv.width / n - fs * 1.8;
  if (w > room) { fs *= room / w; set(); w = ctx.measureText(text).width; }
  const step = cv.width / n;
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  for (let i = 0; i < n; i++) {
    const x = step * (i + 0.5);
    ctx.fillText(text, x, cv.height * 0.53);
    // A small printed rule between repeats, like a full stop held over.
    const m = step * (i + 1);
    ctx.fillRect(m - fs * 0.09, cv.height * 0.53 - fs * 0.09, fs * 0.18, fs * 0.18);
  }
}
