// The question mark from Bodoni Moda Black (written by test/glyphs.mjs), as
// three.js shapes, y up, centred on its box, scaled so it stands H units tall.
import * as THREE from 'three';
import GLYPHS from './glyphs.json';

export const D = GLYPHS.glyphs[0].d;

/** Every subpath of the outline is its own solid: the hook and the dot. No holes. */
export function shapes(H: number) {
  const out: THREE.Shape[] = [];
  let cur: THREE.Shape | null = null;
  // Glyph box in font units (y down): x 60..570, y -760..10.
  const x0 = 60, x1 = 570, y0 = -760, y1 = 10;
  const k = H / (y1 - y0);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const X = (v: number) => (v - cx) * k, Y = (v: number) => -(v - cy) * k;
  const re = /([MLQCZ])([^MLQCZ]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(D))) {
    const n = (m[2].match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (m[1] === 'M') { cur = new THREE.Shape(); cur.moveTo(X(n[0]), Y(n[1])); out.push(cur); }
    else if (m[1] === 'L' && cur) cur.lineTo(X(n[0]), Y(n[1]));
    else if (m[1] === 'Q' && cur) cur.quadraticCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]));
    else if (m[1] === 'C' && cur) cur.bezierCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]), X(n[4]), Y(n[5]));
    else if (m[1] === 'Z') cur = null;
  }
  return { list: out, w: (x1 - x0) * k, h: H, k };
}

/** A faint, low-frequency roughness map, drawn once: lacquer is never perfectly even. */
export function roughnessMap() {
  const s = 256, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgb(70,70,70)';
  g.fillRect(0, 0, s, s);
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) {
    const v = 50 + r() * 50;
    g.fillStyle = `rgba(${v},${v},${v},0.18)`;
    g.beginPath();
    g.arc(r() * s, r() * s, 2 + r() * 14, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}
