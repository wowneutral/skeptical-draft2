// The relief: SKEPTICAL? in Bodoni Moda Black, extruded out of the wall.
// One world unit is a thousand font units, so a capital stands 0.75 tall.
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { createNoise4D } from 'simplex-noise';
import GLYPHS from './glyphs.json';

export const K = 0.001;
export const CAP = 0.75;
export const DEPTH = 0.12;
const TRACK = 95; // extra font units between letters

export type Layout = { glyphs: { ch: string; d: string; dx: number; dy: number }[]; w: number; h: number };

/** One row on a wide screen; two rows (SKEPT / ICAL?) on a phone. The box runs from (0,0) up to (w,h). */
export function layout(phone: boolean): Layout {
  const rows = phone ? ['SKEPT', 'ICAL?'] : ['SKEPTICAL?'];
  const gap = 380; // between rows, font units
  const out: Layout['glyphs'] = [];
  let w = 0;
  const widths = rows.map((r) => r.split('').reduce((s, ch) => s + GLYPHS.glyphs.find((g) => g.ch === ch)!.advance + TRACK, -TRACK));
  w = Math.max(...widths);
  let i = 0;
  rows.forEach((r, ri) => {
    let pen = (w - widths[ri]) / 2;
    const base = (rows.length - 1 - ri) * (750 + gap);
    for (const ch of r) {
      const g = GLYPHS.glyphs[i++];
      out.push({ ch, d: g.d, dx: pen - g.x, dy: base });
      pen += g.advance + TRACK;
    }
  });
  return { glyphs: out, w: w * K, h: (rows.length * 750 + (rows.length - 1) * gap) * K };
}

/** Extruded, bevelled solids for every glyph, already placed in the box. */
export function solids(l: Layout): THREE.BufferGeometry[] {
  const loader = new SVGLoader();
  return l.glyphs.map((g) => {
    const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${g.d}"/></svg>`);
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: DEPTH / K - 18, bevelEnabled: true, bevelThickness: 16, bevelSize: 5, bevelSegments: 3, curveSegments: 10 });
    // SVG y points down; flip, place, and scale to world units.
    geo.applyMatrix4(new THREE.Matrix4().makeScale(1, -1, -1)); // a half turn about x: keeps the winding
    geo.translate(0, 0, DEPTH / K - 4);
    geo.translate(g.dx, g.dy, 0);
    geo.scale(K, K, K);
    geo.computeVertexNormals();
    return geo;
  });
}

/** A plaster surface: a canvas height field of trowel strokes and grit, turned into a normal map. */
export function plasterNormal(size = 512): THREE.CanvasTexture {
  const n = createNoise4D(() => 0.37);
  const h = new Float32Array(size * size);
  // Seamless: sample 4D noise on two circles.
  const T = (x: number, y: number, f: number) => {
    const a = (x / size) * Math.PI * 2, b = (y / size) * Math.PI * 2;
    return n(Math.cos(a) * f, Math.sin(a) * f, Math.cos(b) * f, Math.sin(b) * f);
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    h[y * size + x] = T(x, y, 0.6) * 0.18 + T(x, y, 1.6) * 0.12 + T(x, y, 6) * 0.06 + T(x, y, 22) * 0.035 + T(x, y, 30) * 0.02;
  }
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const s = 9;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const l = h[y * size + ((x - 1 + size) % size)], r = h[y * size + ((x + 1) % size)];
    const u = h[((y - 1 + size) % size) * size + x], d = h[((y + 1) % size) * size + x];
    let nx = (l - r) * s, ny = (d - u) * s, nz = 1;
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
