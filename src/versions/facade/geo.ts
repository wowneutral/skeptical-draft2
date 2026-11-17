// The temple front, built as a stage flat. Every round surface is cast thin:
// the geometry is squashed to a finger's depth but keeps the normals of the
// full round, so from the front the light reads it as solid stone.
import * as THREE from 'three';

export const STEP = 0.14;
export const Y0 = STEP * 3; // top of the stylobate
export const SHAFT = 2.72;
export const ECH = 0.15;
export const ABA = 0.12;
export const COLH = SHAFT + ECH + ABA;
export const YE = Y0 + COLH; // underside of the architrave
export const ARCH = 0.34, FRIEZE = 0.36, CORN = 0.17;
export const YP = YE + ARCH + FRIEZE + CORN; // base of the pediment
export const PED_W = 6.15, PED_H = 1.02;
export const TOP = YP + PED_H;
export const COLS = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
export const BACK = -0.05; // the back face of the flat
export const SQUASH = 0.13; // how much of a real round survives

/** Radius of the shaft at height t (0 to 1): a taper with a slight swell (entasis). */
const R0 = 0.235;
const shaftR = (t: number) => R0 * (1 - 0.17 * Math.pow(t, 1.5) + 0.035 * Math.sin(Math.PI * t));

/** Twenty flutes on the full round: shallow scallops meeting in sharp arrises. */
function flute(th: number) {
  const u = (((th / (2 * Math.PI)) * 20) % 1 + 1) % 1;
  const s = u * 2 - 1;
  return 0.075 * Math.sqrt(Math.max(0, 1 - s * s));
}

/** A front half of a surface of revolution, squashed in depth after its normals are made. */
function halfLathe(rows: number, segs: number, at: (j: number, th: number) => [number, number], squash = SQUASH) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= segs; i++) {
      const th = -Math.PI / 2 + (i / segs) * Math.PI;
      const [r, y] = at(j / rows, th);
      pos.push(r * Math.sin(th), y, r * Math.cos(th));
      uv.push(i / segs, j / rows);
    }
  }
  const w = segs + 1;
  for (let j = 0; j < rows; j++) for (let i = 0; i < segs; i++) {
    const a = j * w + i, b = a + 1, c = a + w, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let k = 0; k < p.count; k++) p.setZ(k, p.getZ(k) * squash);
  return g;
}

export function shaftGeo(segs = 160, rows = 40) {
  return halfLathe(rows, segs, (t, th) => [shaftR(t) * (1 - flute(th)), t * SHAFT]);
}

/** The echinus: a cushion flaring out from the top of the shaft to the abacus. */
export function echinusGeo() {
  const r1 = shaftR(1), r2 = R0 * 1.42;
  return halfLathe(10, 64, (t, th) => {
    const k = Math.sin(t * Math.PI * 0.5);
    const neck = t < 0.18 ? (1 - flute(th) * (1 - t / 0.18)) : 1;
    return [(r1 + (r2 - r1) * Math.pow(k, 1.6)) * neck, SHAFT + t * ECH];
  }, SQUASH * 1.6);
}

/** A triangle ring for the raking cornice and a triangle for the tympanum. */
export function pedimentShapes() {
  const w = PED_W / 2, h = PED_H, band = 0.2;
  const outer = new THREE.Shape([new THREE.Vector2(-w, 0), new THREE.Vector2(w, 0), new THREE.Vector2(0, h)]);
  const slope = Math.atan2(h, w);
  // inner triangle, inset by the band width along each edge
  const ib = band, ih = h - ib / Math.cos(slope) - ib, iw = (ih * w) / h;
  const inner = new THREE.Path([new THREE.Vector2(-iw, ib), new THREE.Vector2(0, ib + ih), new THREE.Vector2(iw, ib)]);
  outer.holes.push(inner);
  const tym = new THREE.Shape([new THREE.Vector2(-iw, ib), new THREE.Vector2(iw, ib), new THREE.Vector2(0, ib + ih)]);
  return { ring: outer, tym };
}

function noise2(size: number, seed: number) {
  // value noise, a few octaves, wrapping
  const out = new Float32Array(size * size);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (const [cell, amp] of [[4, 0.5], [16, 0.25], [64, 0.15], [256, 0.1]] as const) {
    const g = new Float32Array(cell * cell).map(() => rnd());
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const fx = (x / size) * cell, fy = (y / size) * cell;
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const at = (a: number, b: number) => g[((b % cell) * cell) + (a % cell)];
      const v = at(x0, y0) * (1 - sx) * (1 - sy) + at(x0 + 1, y0) * sx * (1 - sy) + at(x0, y0 + 1) * (1 - sx) * sy + at(x0 + 1, y0 + 1) * sx * sy;
      out[y * size + x] += v * amp;
    }
  }
  return out;
}

/** A normal map drawn on a canvas from noise: cast plaster or honed stone. */
export function surfaceMaps(size: number, seed: number, strength: number, pits: number) {
  const h = noise2(size, seed);
  let s = seed * 7 + 3;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < pits; i++) {
    const cx = Math.floor(rnd() * size), cy = Math.floor(rnd() * size), r = 1 + rnd() * 2;
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
      const d = Math.hypot(x, y); if (d > r) continue;
      const k = ((cy + y + size) % size) * size + ((cx + x + size) % size);
      h[k] -= 0.12 * (1 - d / r);
    }
  }
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const rc = document.createElement('canvas'); rc.width = rc.height = size;
  const rctx = rc.getContext('2d')!;
  const rimg = rctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const at = (a: number, b: number) => h[((b + size) % size) * size + ((a + size) % size)];
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const n = new THREE.Vector3(-dx, -dy, 1).normalize();
    const k = (y * size + x) * 4;
    img.data[k] = (n.x * 0.5 + 0.5) * 255; img.data[k + 1] = (n.y * 0.5 + 0.5) * 255; img.data[k + 2] = (n.z * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
    const r = 200 + (h[y * size + x] - 0.5) * 120;
    rimg.data[k] = rimg.data[k + 1] = rimg.data[k + 2] = Math.max(0, Math.min(255, r)); rimg.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); rctx.putImageData(rimg, 0, 0);
  const normal = new THREE.CanvasTexture(c);
  const rough = new THREE.CanvasTexture(rc);
  for (const t of [normal, rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  return { normal, rough };
}
