// The knot's geometry: authored keyframes of two centre curves, resampled to
// the same point count, eased between, and laid as three twisted strands.
import * as THREE from 'three';

export const R = 0.13; // rope radius
export const N = 64; // control points per rope after resampling
type P3 = [number, number, number]; // x, z, h (h: lift in rope diameters)

/* ───────── authored shapes ───────── */

// A reef knot, tight. Rope A (bone) and rope B (black) interlace at six crossings.
// Crossings where B passes under A, in the order they are undone: right top, left top, middle bottom.
function knotA(s: number): P3[] {
  return [
    [-3.4, -5.6, 0], [-2.9, -2.4, 0], [-1.8 * s, -0.5 * s, 0],
    [-0.9 * s, -0.2 * s, 1], [0, -0.35 * s, 0], [0.6 * s, -0.5 * s, 0.4],
    [0.9 * s, -0.25 * s, 1], [1.02 * s, 0, 0.5], [0.9 * s, 0.25 * s, 0],
    [0.6 * s, 0.5 * s, 0.3], [0, 0.35 * s, 1], [-0.9 * s, 0.2 * s, 0],
    [-1.9 * s, 0.55 * s, 0], [-2.6, 1.6, 0], [-1.9, 2.7, 0], [-0.2, 3.1, 0],
  ];
}
function knotB(s: number, flips: number): P3[] {
  const f1 = flips >= 1 ? 1 : 0, f2 = flips >= 2 ? 1 : 0, f3 = flips >= 3 ? 1 : 0;
  return [
    [3.6, -5.4, 0], [2.9, -2.2, 0], [1.8 * s, -0.45 * s, 0.2 * f1],
    [0.85 * s, -0.2 * s, f1 * 2], [0, -0.35 * s, 1], [-0.6 * s, -0.5 * s, 0.4 + f2],
    [-0.9 * s, -0.25 * s, f2 * 2], [-1.02 * s, 0, 0.6 + f2], [-0.9 * s, 0.25 * s, 1],
    [-0.6 * s, 0.5 * s, 0.4 + f3 * 0.6], [0, 0.35 * s, f3 * 2], [0.85 * s, 0.2 * s, 1],
    [1.9 * s, 0.6 * s, 0], [2.9, 1.6, 0], [3.3, 2.9, 0],
  ];
}
/** Where an over-crossing that has been undone sits: A lies flat beneath. */
function flatA(pts: P3[], flips: number): P3[] {
  const out = pts.map((p) => [...p] as P3);
  // A's points that sat over B at an undone crossing go down to the paper.
  if (flips >= 1) out[6][2] = 0;
  if (flips >= 2) out[3][2] = 0;
  if (flips >= 3) out[10][2] = 0;
  return out;
}

/** The two ropes apart: A lies open, B has slid off to the side. */
function apartA(): P3[] {
  return [[-3.6, -5.2, 0], [-3.0, -2.6, 0], [-2.2, -1.0, 0], [-1.3, -1.2, 0], [-0.4, -1.7, 0], [0.6, -1.9, 0], [1.5, -1.5, 0], [1.9, -0.7, 0], [1.6, 0.2, 0], [0.8, 0.8, 0], [-0.2, 1.1, 0], [-1.2, 1.4, 0], [-2.0, 1.9, 0], [-2.1, 2.7, 0], [-1.2, 3.3, 0], [0.2, 3.4, 0]];
}
function apartB(): P3[] {
  return [[4.6, -4.6, 0], [4.4, -1.6, 0], [4.6, 0.7, 0], [3.9, 1.6, 0], [3.4, 2.5, 0], [2.6, 3.1, 0], [1.9, 3.8, 0], [2.4, 4.6, 0], [3.4, 4.8, 0], [4.4, 4.5, 0], [5.2, 3.9, 0], [5.8, 3.2, 0], [6.4, 2.6, 0], [7.0, 2.2, 0], [7.6, 2.0, 0]];
}

/* ───────── resampling ───────── */

function curveOf(pts: P3[]) {
  const D = 2 * R * 0.92;
  return new THREE.CatmullRomCurve3(pts.map(([x, z, h]) => new THREE.Vector3(x, R + h * D, z)), false, 'centripetal');
}
function resample(pts: P3[] | THREE.Vector3[], n = N): Float32Array {
  const c = Array.isArray(pts) && pts.length && pts[0] instanceof THREE.Vector3 ? new THREE.CatmullRomCurve3(pts as THREE.Vector3[], false, 'centripetal') : curveOf(pts as P3[]);
  const out = new Float32Array(n * 3);
  c.getSpacedPoints(n - 1).forEach((v, i) => out.set([v.x, v.y, v.z], i * 3));
  return out;
}
function lengthOf(a: Float32Array) {
  let L = 0;
  for (let i = 3; i < a.length; i += 3) L += Math.hypot(a[i] - a[i - 3], a[i + 1] - a[i - 2], a[i + 2] - a[i - 1]);
  return L;
}

/** The question mark: A as the hook, B coiled flat as the dot. Lengths match the ropes. */
function markShapes(lenA: number, lenB: number) {
  // The hook, top down, screen up is -z. Ends with the long stem at the bottom.
  const hook: [number, number][] = [[-1.25, -1.15], [-1.05, -1.75], [-0.45, -2.25], [0.35, -2.4], [1.05, -2.1], [1.4, -1.45], [1.3, -0.75], [0.8, -0.2], [0.3, 0.25], [0.12, 0.85], [0.12, 1.5]];
  const hv = hook.map(([x, z]) => new THREE.Vector3(x, R, z));
  const raw = resample(hv, 200);
  const k = lenA / lengthOf(raw);
  // Order: A's standing end is the hook's curl, its free end the bottom of the stem.
  const A = hook.map(([x, z]) => new THREE.Vector3(x * k, R, z * k - 0.6 * k));
  const stemBottom = A[A.length - 1];
  // The dot: an Archimedean coil, flat and round, starting at the outside.
  const pitch = 2 * R * 1.02;
  const turns: THREE.Vector3[] = [];
  const r0 = R * 1.2;
  // Solve the number of turns for length lenB: L ~ pi * pitch * T^2 + 2 pi r0 T.
  const a = Math.PI * pitch, b = 2 * Math.PI * r0;
  const T = (-b + Math.sqrt(b * b + 4 * a * lenB)) / (2 * a);
  const cx = stemBottom.x, cz = stemBottom.z + R * 4 + (r0 + pitch * T);
  const steps = 90;
  for (let i = 0; i <= steps; i++) {
    const th = T * Math.PI * 2 * (1 - i / steps);
    const r = r0 + (pitch * th) / (Math.PI * 2);
    turns.push(new THREE.Vector3(cx + Math.cos(th + 1.2) * r, R, cz + Math.sin(th + 1.2) * r));
  }
  return { A: resample(A), B: resample(turns), dot: new THREE.Vector3(cx, 0, cz), top: A[3].z };
}

export type Keys = { A: Float32Array[]; B: Float32Array[]; mark: { dot: THREE.Vector3; top: number } };

/** Keyframes, one per section: hero, manifesto, record, drive, people, join, ending. */
export function makeKeys(): Keys {
  const A: Float32Array[] = [], B: Float32Array[] = [];
  const add = (a: P3[], b: P3[]) => { A.push(resample(a)); B.push(resample(b)); };
  add(knotA(1), knotB(1, 0)); // tight
  add(knotA(1.45), knotB(1.45, 0)); // loosened
  add(flatA(knotA(1.85), 1), knotB(1.85, 1)); // first crossing undone
  add(flatA(knotA(2.05), 2), knotB(2.05, 2)); // second undone, the last one jams
  add(apartA(), apartB()); // apart
  const m = markShapes(lengthOf(A[0]), lengthOf(B[0]));
  A.push(m.A); B.push(m.B);
  A.push(m.A); B.push(m.B);
  return { A, B, mark: { dot: m.dot, top: m.top } };
}

/** The pose at stage f, with points that rise early and fall late, so a rope never passes through the other. */
export function poseAt(keys: Float32Array[], f: number, out: Float32Array) {
  const n = keys.length - 1;
  const i = Math.max(0, Math.min(n - 1, Math.floor(f)));
  const t = Math.max(0, Math.min(1, f - i));
  const a = keys[i], b = keys[i + 1];
  const e = t * t * (3 - 2 * t);
  const rise = Math.min(1, e * 2.2), fall = Math.max(0, (e - 0.55) / 0.45);
  const bump = Math.sin(Math.PI * t);
  for (let j = 0; j < out.length; j += 3) {
    out[j] = a[j] + (b[j] - a[j]) * e;
    out[j + 2] = a[j + 2] + (b[j + 2] - a[j + 2]) * e;
    const ya = a[j + 1], yb = b[j + 1];
    const y = yb > ya ? ya + (yb - ya) * rise : ya + (yb - ya) * fall;
    // A rope leaving a crossing lifts clear for the middle of the move.
    out[j + 1] = y + (ya > R * 1.5 || yb > R * 1.5 ? bump * R * 1.6 : 0);
  }
}

/* ───────── strands ───────── */

type End = { p: THREE.Vector3; t: THREE.Vector3; n: THREE.Vector3; b: THREE.Vector3 };
export type RopeGeo = { geo: THREE.BufferGeometry; S: number; update: (c: Float32Array) => void; ends: End[]; tips: End[] };

/** Three strands twisted round a centre curve. S samples along, M around each strand. */
export function ropeGeometry(S: number, M: number, twist: number): RopeGeo {
  const ring = M + 1, perStrand = S * ring;
  const pos = new Float32Array(3 * perStrand * 3), nor = new Float32Array(3 * perStrand * 3), uv = new Float32Array(2 * perStrand * 3);
  const idx: number[] = [];
  for (let k = 0; k < 3; k++) for (let i = 0; i < S - 1; i++) for (let j = 0; j < M; j++) {
    const a = k * perStrand + i * ring + j, b = a + ring;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
  geo.setIndex(idx);
  const ctl = new THREE.CatmullRomCurve3(Array.from({ length: N }, () => new THREE.Vector3()), false, 'centripetal');
  const C = Array.from({ length: S }, () => new THREE.Vector3());
  const T = Array.from({ length: S }, () => new THREE.Vector3());
  const Nn = Array.from({ length: S }, () => new THREE.Vector3());
  const B = Array.from({ length: S }, () => new THREE.Vector3());
  const tmp = new THREE.Vector3(), q = new THREE.Quaternion();
  const ends = [0, 1].map(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3(), b: new THREE.Vector3() }));
  const sArr = new Float32Array(S);
  const tips = [0, 1].map(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3(), b: new THREE.Vector3() }));

  const update = (c: Float32Array) => {
    for (let i = 0; i < N; i++) ctl.points[i].set(c[i * 3], c[i * 3 + 1], c[i * 3 + 2]);
    const pts = ctl.getSpacedPoints(S - 1);
    for (let i = 0; i < S; i++) C[i].copy(pts[i]);
    let L = 0; sArr[0] = 0;
    for (let i = 1; i < S; i++) { L += C[i].distanceTo(C[i - 1]); sArr[i] = L; }
    for (let i = 0; i < S; i++) T[i].subVectors(C[Math.min(S - 1, i + 1)], C[Math.max(0, i - 1)]).normalize();
    // Parallel transport from a frame that starts flat on the paper.
    Nn[0].set(0, 1, 0); Nn[0].sub(tmp.copy(T[0]).multiplyScalar(Nn[0].dot(T[0]))).normalize();
    for (let i = 1; i < S; i++) {
      tmp.crossVectors(T[i - 1], T[i]);
      const l = tmp.length();
      Nn[i].copy(Nn[i - 1]);
      if (l > 1e-6) { tmp.divideScalar(l); q.setFromAxisAngle(tmp, Math.acos(Math.max(-1, Math.min(1, T[i - 1].dot(T[i]))))); Nn[i].applyQuaternion(q); }
    }
    for (let i = 0; i < S; i++) B[i].crossVectors(T[i], Nn[i]);
    // Fixed lay angle per unit length; the frame's own roll is measured from the start, so the lay stays with the rope.
    const fray = 0.22, bind = 0.42;
    for (let k = 0; k < 3; k++) {
      for (let i = 0; i < S; i++) {
        const s = sArr[i];
        const dEnd = Math.min(s, L - s);
        // Past the binding, the strands open into a short brush and thin out.
        const open = dEnd < fray ? 1 - dEnd / fray : 0;
        const off = R * (0.46 + open * 0.55);
        const rs = R * 0.6 * (dEnd < 0.04 ? Math.max(0.15, dEnd / 0.04) : 1) * (1 - open * 0.35) * (dEnd > fray && dEnd < bind ? 0.96 : 1);
        const th = s * twist + (k * Math.PI * 2) / 3;
        const ox = Math.cos(th) * off, oy = Math.sin(th) * off;
        const cx = C[i].x + Nn[i].x * ox + B[i].x * oy, cy = C[i].y + Nn[i].y * ox + B[i].y * oy, cz = C[i].z + Nn[i].z * ox + B[i].z * oy;
        for (let j = 0; j <= M; j++) {
          const ph = (j / M) * Math.PI * 2;
          // Each strand is pressed a little flat where it meets the other two.
          const ca = Math.cos(ph), sa = Math.sin(ph);
          const nx = Nn[i].x * ca + B[i].x * sa, ny = Nn[i].y * ca + B[i].y * sa, nz = Nn[i].z * ca + B[i].z * sa;
          const v = k * perStrand + i * (M + 1) + j;
          pos[v * 3] = cx + nx * rs; pos[v * 3 + 1] = cy + ny * rs; pos[v * 3 + 2] = cz + nz * rs;
          nor[v * 3] = nx; nor[v * 3 + 1] = ny; nor[v * 3 + 2] = nz;
          uv[v * 2] = j / M; uv[v * 2 + 1] = s * 2.2;
        }
      }
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.uv as THREE.BufferAttribute).needsUpdate = true;
    geo.computeBoundingSphere();
    // Where the thread binds each end.
    const at = (s0: number) => { let i = 0; while (i < S - 1 && sArr[i] < s0) i++; return i; };
    const i0 = at(0.3), i1 = at(L - 0.3);
    ends[0].p.copy(C[i0]); ends[0].t.copy(T[i0]); ends[0].n.copy(Nn[i0]); ends[0].b.copy(B[i0]);
    ends[1].p.copy(C[i1]); ends[1].t.copy(T[i1]); ends[1].n.copy(Nn[i1]); ends[1].b.copy(B[i1]);
    // The very tips, pointing out of the rope.
    tips[0].p.copy(C[0]); tips[0].t.copy(T[0]).negate(); tips[0].n.copy(Nn[0]); tips[0].b.copy(B[0]);
    tips[1].p.copy(C[S - 1]); tips[1].t.copy(T[S - 1]); tips[1].n.copy(Nn[S - 1]); tips[1].b.copy(B[S - 1]);
  };
  return { geo, S, update, ends, tips };
}

/* ───────── textures drawn on a canvas ───────── */

function rng(seed: number) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

/** A strand's fibres: a height field of long slanted hairs, turned into a normal map, plus a roughness map. */
export function fibreMaps() {
  const s = 256, rnd = rng(7);
  const c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
  // Fibres run along the strand (v) with a slight slant; draw wrapped.
  for (let i = 0; i < 900; i++) {
    const x = rnd() * s, y = rnd() * s, len = 30 + rnd() * 90, w = 0.6 + rnd() * 1.6, v = rnd() < 0.5 ? 255 : 20;
    g.strokeStyle = `rgba(${v},${v},${v},${0.12 + rnd() * 0.2})`; g.lineWidth = w;
    for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + len * 0.32, y + oy + len); g.stroke(); }
  }
  // Grooves between the yarns that make up a strand.
  for (let i = 0; i < 6; i++) {
    const x0 = (i / 6) * s;
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3;
    for (const ox of [-s, 0, s]) { g.beginPath(); g.moveTo(x0 + ox, 0); g.lineTo(x0 + ox + s * 0.32, s); g.stroke(); }
  }
  const h = g.getImageData(0, 0, s, s).data;
  const nc = document.createElement('canvas'); nc.width = nc.height = s;
  const ng = nc.getContext('2d')!; const im = ng.createImageData(s, s);
  const H = (x: number, y: number) => h[(((y + s) % s) * s + ((x + s) % s)) * 4] / 255;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 2.4, dy = (H(x, y + 1) - H(x, y - 1)) * 2.4;
    const l = Math.hypot(dx, dy, 1);
    const o = (y * s + x) * 4;
    im.data[o] = (-dx / l * 0.5 + 0.5) * 255; im.data[o + 1] = (-dy / l * 0.5 + 0.5) * 255; im.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[o + 3] = 255;
  }
  ng.putImageData(im, 0, 0);
  // Roughness: mostly matt, a little sheen where the fibres are pressed smooth.
  const rc = document.createElement('canvas'); rc.width = rc.height = s;
  const rg = rc.getContext('2d')!; const ri = rg.createImageData(s, s);
  for (let i = 0; i < s * s; i++) { const v = 200 + (h[i * 4] / 255 - 0.5) * 90 + (rnd() - 0.5) * 30; ri.data.set([v, v, v, 255], i * 4); }
  rg.putImageData(ri, 0, 0);
  const tex = (cv: HTMLCanvasElement, srgb = false) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { normal: tex(nc), rough: tex(rc), color: tex(c, true) };
}

/** Thread for the binding: fine rings round the rope. */
export function threadMap() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080'; g.fillRect(0, 0, 16, 64);
  for (let y = 0; y < 64; y += 4) { g.fillStyle = '#d8d8d8'; g.fillRect(0, y, 16, 2); g.fillStyle = '#383838'; g.fillRect(0, y + 3, 16, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function paperMap() {
  const s = 256, rnd = rng(3);
  const c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d')!; const im = g.createImageData(s, s);
  for (let i = 0; i < s * s; i++) { const v = 128 + (rnd() - 0.5) * 60; im.data.set([v, v, v, 255], i * 4); }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1);
  return t;
}

/** Loose fibres at a cut end: short hairs fanning out of the brush. Returns a writer for a LineSegments geometry. */
export function fuzz(count: number, seed: number) {
  const rnd = rng(seed);
  const spec = Array.from({ length: count }, () => ({ a: rnd() * Math.PI * 2, r: Math.sqrt(rnd()) * 0.95, back: rnd() * 0.12, len: 0.04 + rnd() * 0.14, sp: 0.2 + rnd() * 0.9, curl: (rnd() - 0.5) * 0.06 }));
  const pos = new Float32Array(count * 6 * 2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  const write = (ends: End[]) => {
    let o = 0;
    for (const e of ends) for (const f of spec) {
      const ca = Math.cos(f.a), sa = Math.sin(f.a), rr = R * f.r * 1.3;
      const ox = (e.n.x * ca + e.b.x * sa), oy = (e.n.y * ca + e.b.y * sa), oz = (e.n.z * ca + e.b.z * sa);
      const x0 = e.p.x + ox * rr - e.t.x * f.back, y0 = e.p.y + oy * rr - e.t.y * f.back, z0 = e.p.z + oz * rr - e.t.z * f.back;
      const L = f.len + f.back;
      pos[o++] = x0; pos[o++] = y0; pos[o++] = z0;
      pos[o++] = x0 + e.t.x * L + ox * L * f.sp + f.curl; pos[o++] = Math.max(0.01, y0 + e.t.y * L + oy * L * f.sp); pos[o++] = z0 + e.t.z * L + oz * L * f.sp - f.curl;
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    geo.computeBoundingSphere();
  };
  return { geo, write };
}
