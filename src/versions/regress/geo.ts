// Geometry and surfaces for the regress: the plaster question mark, the plinth,
// the stone-framed mirrors, and the reflection matrices that chain them.
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { createNoise4D } from 'simplex-noise';
import MARKS from '@/lib/marks.json';

/** Half the distance between the two mirrors. */
export const M = 4.2;
export const PLINTH = { w: 0.66, h: 0.64 };
export const GLASS = { w: 2.5, h: 3.0, y: 0.16 };
export const BAR = 0.15; // frame bar width
export const QH = 0.86; // height of the question mark

/** The brand's roman question mark, extruded with a soft bevel, standing on y = 0, centred on x and z. */
export function questionGeometry(): THREE.BufferGeometry {
  const { d } = MARKS.roman;
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 150, bevelEnabled: true, bevelThickness: 26, bevelSize: 12, bevelSegments: 4, curveSegments: 18 });
  geo.applyMatrix4(new THREE.Matrix4().makeScale(1, -1, -1));
  geo.computeBoundingBox();
  const b = geo.boundingBox!;
  geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  const s = QH / (b.max.y - b.min.y);
  geo.scale(s, s, s);
  geo.computeVertexNormals();
  return geo;
}

/** The SVG path and box of the same mark, for the flat fallback. */
export const MARK = MARKS.roman;

/** A canvas height field turned into a normal map: plaster grit, or honed stone. */
export function grainNormal(size: number, seed: number, amp: number[], strength: number): THREE.CanvasTexture {
  let s = seed;
  const n = createNoise4D(() => { s = (s * 16807) % 2147483647; return s / 2147483647; });
  const h = new Float32Array(size * size);
  const T = (x: number, y: number, f: number) => {
    const a = (x / size) * Math.PI * 2, b = (y / size) * Math.PI * 2;
    return n(Math.cos(a) * f, Math.sin(a) * f, Math.cos(b) * f, Math.sin(b) * f);
  };
  const fr = [0.7, 2, 6, 18, 40];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0;
    for (let i = 0; i < fr.length; i++) v += T(x, y, fr[i]) * (amp[i] ?? 0);
    h[y * size + x] = v;
  }
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const l = h[y * size + ((x - 1 + size) % size)], r = h[y * size + ((x + 1) % size)];
    const u = h[((y - 1 + size) % size) * size + x], dn = h[((y + 1) % size) * size + x];
    let nx = (l - r) * strength, ny = (dn - u) * strength, nz = 1;
    const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
    const o = (y * size + x) * 4;
    img.data[o] = (nx * 0.5 + 0.5) * 255; img.data[o + 1] = (ny * 0.5 + 0.5) * 255; img.data[o + 2] = (nz * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A roughness map for the floor: honed stone with faint scuffs. */
export function floorRough(size = 256): THREE.CanvasTexture {
  const n = createNoise4D(() => 0.61);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const a = (x / size) * Math.PI * 2, b = (y / size) * Math.PI * 2;
    const v = n(Math.cos(a) * 1.2, Math.sin(a) * 1.2, Math.cos(b) * 1.2, Math.sin(b) * 1.2) * 0.5
      + n(Math.cos(a) * 9, Math.sin(a) * 9, Math.cos(b) * 9, Math.sin(b) * 9) * 0.2;
    const g = Math.max(0, Math.min(255, 120 + v * 90));
    const o = (y * size + x) * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = g; img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Reflection across the plane through p with unit normal n. */
export function reflection(p: THREE.Vector3, n: THREE.Vector3, out = new THREE.Matrix4()): THREE.Matrix4 {
  const { x: a, y: b, z: c } = n;
  const d = -(a * p.x + b * p.y + c * p.z);
  return out.set(
    1 - 2 * a * a, -2 * a * b, -2 * a * c, -2 * a * d,
    -2 * a * b, 1 - 2 * b * b, -2 * b * c, -2 * b * d,
    -2 * a * c, -2 * b * c, 1 - 2 * c * c, -2 * c * d,
    0, 0, 0, 1,
  );
}
