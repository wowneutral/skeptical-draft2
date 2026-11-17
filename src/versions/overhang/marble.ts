// Honed bone marble and black stone, drawn on canvases at load. No images are fetched.
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function marbleMaps(seed = 7) {
  const w = 1024, h = 256;
  const col = document.createElement('canvas'); col.width = w; col.height = h;
  const rough = document.createElement('canvas'); rough.width = w; rough.height = h;
  const cg = col.getContext('2d')!, rg = rough.getContext('2d')!;
  const ci = cg.createImageData(w, h), ri = rg.createImageData(w, h);
  const n2 = createNoise2D(rng(seed));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Tileable enough along x for offsets: the noise is sampled on a slow drift.
      const nx = x / 260, ny = y / 260;
      let t = 0, a = 1, f = 1;
      for (let o = 0; o < 4; o++) { t += a * n2(nx * f, ny * f); a *= 0.5; f *= 2.03; }
      const v = Math.sin(x * 0.0085 + y * 0.021 + t * 4.2);
      const vein = Math.pow(1 - Math.abs(v), 16);
      const v2 = Math.sin(x * 0.019 - y * 0.034 + t * 6.5 + 1.7);
      const hair = Math.pow(1 - Math.abs(v2), 46) * 0.55;
      const cloud = n2(x / 140 + 9, y / 140) * 0.5 + 0.5;
      const k = Math.min(1, vein * 0.78 + hair * 0.55);
      const base = [238 - cloud * 9, 233 - cloud * 10, 222 - cloud * 13];
      const deep = [122, 115, 103];
      const i = (y * w + x) * 4;
      ci.data[i] = base[0] + (deep[0] - base[0]) * k;
      ci.data[i + 1] = base[1] + (deep[1] - base[1]) * k;
      ci.data[i + 2] = base[2] + (deep[2] - base[2]) * k;
      ci.data[i + 3] = 255;
      const r = 120 + cloud * 30 + k * 60 + (n2(x / 3, y / 3) * 10);
      ri.data[i] = ri.data[i + 1] = ri.data[i + 2] = r; ri.data[i + 3] = 255;
    }
  }
  cg.putImageData(ci, 0, 0); rg.putImageData(ri, 0, 0);
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace;
  const rmap = new THREE.CanvasTexture(rough);
  for (const t of [map, rmap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  return { map, rmap };
}

/** Polished black stone: faint mottle in the roughness so the key light breaks up on it. */
export function stoneRough(seed = 3) {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d')!, im = g.createImageData(s, s), n2 = createNoise2D(rng(seed));
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const v = 70 + (n2(x / 40, y / 40) * 0.5 + 0.5) * 50 + n2(x / 4, y / 4) * 8;
    const i = (y * s + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 1);
  return t;
}
