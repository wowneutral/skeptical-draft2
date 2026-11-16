// The shell, built from numbers: a logarithmic spiral tube that grows by a
// constant ratio each turn, walled into chambers, then let go of its coil at
// the end so the last chamber drops into a stem. Cut along its own plane, the
// spiral is the hook of a question mark.
import * as THREE from 'three';

const B = Math.log(3) / (2 * Math.PI); // the shell triples its size each turn
const K = 0.52; // tube radius as a share of the spiral radius (the whorls just overlap)
const FLAT = 0.82; // laterally compressed, like the real thing
const T0 = -4.6 * Math.PI, T1 = 0.62 * Math.PI; // where the coil starts and lets go

export const SEPTA = 26;

type Sample = { c: THREE.Vector2; t: THREE.Vector2; n: THREE.Vector2; r: number; u: number };

const rAt = (th: number) => Math.exp(B * th);
// Clockwise as the camera sees it, so the coil reads as the bowl of a question mark.
const spiral = (th: number) => { const r = rAt(th); return new THREE.Vector2(r * Math.cos(-th + 0.35), r * Math.sin(-th + 0.35)); };

/** The centreline: the coil, then a short curve that straightens into a downward stem. */
function centreline(n: number): Sample[] {
  const pts: { c: THREE.Vector2; r: number }[] = [];
  const nc = Math.floor(n * 0.84);
  for (let i = 0; i <= nc; i++) { const th = T0 + (T1 - T0) * (i / nc); pts.push({ c: spiral(th), r: K * rAt(th) }); }
  // Bezier from the end of the coil into the stem.
  const p0 = spiral(T1), d = 0.002, p1d = spiral(T1 + d).sub(spiral(T1 - d)).normalize();
  const rEnd = K * rAt(T1);
  const p3 = new THREE.Vector2(p0.x - 0.42, p0.y - 1.9);
  const c1 = p0.clone().addScaledVector(p1d, 0.85);
  const c2 = p3.clone().add(new THREE.Vector2(0, 1.0));
  const tail = n - nc;
  for (let i = 1; i <= tail; i++) {
    const t = i / tail, a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t * t, e = t ** 3;
    const p = new THREE.Vector2(a * p0.x + b * c1.x + c * c2.x + e * p3.x, a * p0.y + b * c1.y + c * c2.y + e * p3.y);
    pts.push({ c: p, r: rEnd * (1 + 0.06 * t) });
  }
  let u = 0;
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)].c, b = pts[Math.min(pts.length - 1, i + 1)].c;
    const t = b.clone().sub(a).normalize();
    if (i > 0) u += p.c.distanceTo(pts[i - 1].c) / Math.max(0.05, p.r);
    // In-plane normal, pointing out of the coil.
    return { c: p.c, t, n: new THREE.Vector2(t.y, -t.x), r: p.r, u };
  });
}

/** A swept half tube (side 1 = the front half, z >= 0; side -1 = the back). */
function tube(S: Sample[], side: 1 | -1, scale: number, inward: boolean, seg = 28) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  S.forEach((s) => {
    for (let j = 0; j <= seg; j++) {
      const phi = (j / seg) * Math.PI, R = s.r * scale;
      const x = s.c.x + s.n.x * R * Math.cos(phi), y = s.c.y + s.n.y * R * Math.cos(phi), z = side * R * FLAT * Math.sin(phi);
      pos.push(x, y, z); uv.push(s.u * 0.3, j / seg);
    }
  });
  const w = seg + 1;
  for (let i = 0; i < S.length - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * w + j, b = a + w, c = a + 1, d = b + 1;
    const flip = (side === 1) === inward;
    if (flip) idx.push(a, c, b, c, d, b); else idx.push(a, b, c, c, b, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Make every triangle of a flat piece face +z or -z, and give it that normal. */
function faceZ(g: THREE.BufferGeometry, want: number) {
  const p = g.getAttribute('position'), ix = g.getIndex()!; const a = ix.array as Uint16Array | Uint32Array;
  for (let i = 0; i < a.length; i += 3) {
    const ax = p.getX(a[i]), ay = p.getY(a[i]), bx = p.getX(a[i + 1]), by = p.getY(a[i + 1]), cx = p.getX(a[i + 2]), cy = p.getY(a[i + 2]);
    const z = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (z * want < 0) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
  }
  const n = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) n[i * 3 + 2] = want;
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  return g;
}

/** The polished cut: the flat strip of wall where the plane slices the tube. */
function cutRim(S: Sample[], side: 1 | -1, th: number) {
  const pos: number[] = [], idx: number[] = [];
  let k = 0;
  for (const sgn of [1, -1]) {
    S.forEach((s) => {
      const o = s.r * sgn, i = s.r * (1 - th) * sgn;
      pos.push(s.c.x + s.n.x * o, s.c.y + s.n.y * o, 0, s.c.x + s.n.x * i, s.c.y + s.n.y * i, 0);
    });
    for (let i = 0; i < S.length - 1; i++) {
      const a = k + i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
    k += S.length * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  // The cut faces away from its own half.
  return faceZ(g, side === 1 ? -1 : 1);
}

export type Chamber = { at: THREE.Vector3; r: number };

/** The chamber walls: dished half discs across the tube, plus their polished cut edges. */
function septa(S: Sample[], side: 1 | -1, th: number) {
  const nc = Math.floor(S.length * 0.84);
  const walls: THREE.BufferGeometry[] = [], edges: THREE.BufferGeometry[] = [];
  const chambers: Chamber[] = [];
  const first = Math.floor(nc * 0.06), last = nc - 4;
  const picks: number[] = [];
  for (let i = 0; i < SEPTA; i++) picks.push(Math.round(first + (last - first) * (i / (SEPTA - 1))));
  picks.forEach((pi, n) => {
    const s = S[pi], R = s.r * (1 - th * 0.7), dish = 0.55;
    const ring = 12, rad = 6;
    const pos: number[] = [], idx: number[] = [];
    for (let a = 0; a <= ring; a++) for (let b = 0; b <= rad; b++) {
      const phi = (a / ring) * Math.PI, rho = b / rad;
      const off = -dish * R * (1 - rho * rho);
      const x = s.c.x + s.n.x * R * rho * Math.cos(phi) + s.t.x * off, y = s.c.y + s.n.y * R * rho * Math.cos(phi) + s.t.y * off;
      pos.push(x, y, side * R * FLAT * rho * Math.sin(phi));
    }
    for (let a = 0; a < ring; a++) for (let b = 0; b < rad; b++) { const p = a * (rad + 1) + b, q = p + rad + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); walls.push(g);
    // The cut edge of this wall: a thin flat curve in the plane.
    const ep: number[] = [], ei: number[] = []; const m = 16, w = Math.max(0.006, s.r * th * 0.55);
    for (let i = 0; i <= m; i++) {
      const u = -1 + (2 * i) / m, off = -dish * R * (1 - u * u);
      const x = s.c.x + s.n.x * R * u + s.t.x * off, y = s.c.y + s.n.y * R * u + s.t.y * off;
      ep.push(x, y, 0, x + s.t.x * w, y + s.t.y * w, 0);
    }
    for (let i = 0; i < m; i++) { const a = i * 2; ei.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const e = new THREE.BufferGeometry(); e.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3)); e.setIndex(ei);
    edges.push(faceZ(e, side === 1 ? -1 : 1));
    if (n > 0) { const pp = S[picks[n - 1]]; const mid = s.c.clone().add(pp.c).multiplyScalar(0.5); chambers.push({ at: new THREE.Vector3(mid.x, mid.y, 0), r: (s.r + pp.r) / 2 }); }
  });
  return { walls, edges, chambers };
}

function merge(list: THREE.BufferGeometry[]) {
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
  let off = 0;
  for (const g of list) {
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nrm.push(n.getX(i), n.getY(i), n.getZ(i)); }
    const ix = g.getIndex()!; for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + off);
    off += p.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  return g;
}

export type Half = { outer: THREE.BufferGeometry; inner: THREE.BufferGeometry; rim: THREE.BufferGeometry; walls: THREE.BufferGeometry; edges: THREE.BufferGeometry };

export function buildShell(phone: boolean) {
  const S = centreline(phone ? 300 : 460);
  const th = 0.075;
  const half = (side: 1 | -1): Half & { chambers: Chamber[] } => {
    const sp = septa(S, side, th);
    return { outer: tube(S, side, 1, false, phone ? 22 : 30), inner: tube(S, side, 1 - th, true, phone ? 16 : 22), rim: cutRim(S, side, th), walls: merge(sp.walls), edges: merge(sp.edges), chambers: sp.chambers };
  };
  const front = half(1), back = half(-1);
  const end = S[S.length - 1];
  // Centre the drawing on its bounding box.
  const box = new THREE.Box3().setFromBufferAttribute(back.outer.getAttribute('position') as THREE.BufferAttribute);
  return { front, back, chambers: back.chambers, box, aperture: new THREE.Vector3(end.c.x, end.c.y - end.r * 0.2, 0), apertureR: end.r };
}

/** Growth lines, fine and uneven, drawn once on a canvas: used for bump and roughness. */
export function growthTexture() {
  const W = 1024, H = 64;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W;) {
    const w = 0.6 + rnd() * 1.6, v = rnd() < 0.5 ? 40 + rnd() * 60 : 170 + rnd() * 70;
    g.fillStyle = `rgba(${v | 0},${v | 0},${v | 0},${0.35 + rnd() * 0.5})`;
    g.fillRect(x, 0, w, H);
    x += w + 1.2 + rnd() * 4.5;
  }
  // A few heavier pauses in growth.
  for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(30,30,30,0.6)'; g.fillRect(rnd() * W, 0, 2.2, H); }
  // Speckle across the width so it does not read as stripes.
  const im = g.getImageData(0, 0, W, H);
  for (let i = 0; i < im.data.length; i += 4) { const d = (rnd() - 0.5) * 26; im.data[i] += d; im.data[i + 1] += d; im.data[i + 2] += d; }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 4;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** The ebony stand's grain. */
export function grainTexture() {
  const S = 256; const cv = document.createElement('canvas'); cv.width = S; cv.height = S; const g = cv.getContext('2d')!;
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) { const v = rnd() < 0.5 ? 40 : 200; g.fillStyle = `rgba(${v},${v},${v},${0.04 + rnd() * 0.08})`; g.fillRect(0, rnd() * S, S, 0.6 + rnd() * 1.5); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; return t;
}
