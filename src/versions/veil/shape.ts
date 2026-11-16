// The brand mark as three.js shapes, parsed by hand (the path uses only M, L, Q),
// and a point-in-shape test so the sheet's spheres sit inside the stone.
import * as THREE from 'three';

export function markShapes(d: string) {
  const sp = new THREE.ShapePath();
  const tok = d.match(/[MLQZ]|-?\d*\.?\d+/gi) ?? [];
  let i = 0, cmd = 'M';
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/[MLQZ]/i.test(tok[i])) cmd = tok[i++].toUpperCase();
    if (cmd === 'M') { sp.moveTo(num(), num()); cmd = 'L'; }
    else if (cmd === 'L') sp.lineTo(num(), num());
    else if (cmd === 'Q') { const a = num(), b = num(), c = num(), e = num(); sp.quadraticCurveTo(a, b, c, e); }
    else if (cmd === 'Z') { i++; }
  }
  return sp.toShapes();
}

function inPoly(x: number, y: number, p: THREE.Vector2[]) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if ((p[i].y > y) !== (p[j].y > y) && x < ((p[j].x - p[i].x) * (y - p[i].y)) / (p[j].y - p[i].y) + p[i].x) c = !c;
  }
  return c;
}

export function inShapes(shapes: THREE.Shape[], x: number, y: number) {
  for (const s of shapes) {
    const { shape, holes } = s.extractPoints(8);
    if (inPoly(x, y, shape) && !holes.some((h) => inPoly(x, y, h))) return true;
  }
  return false;
}

/** Points along every outline, about `gap` apart (in path units). */
export function outline(shapes: THREE.Shape[], gap: number) {
  const out: THREE.Vector2[] = [];
  for (const s of shapes) {
    const pts = s.getSpacedPoints(Math.max(8, Math.round(s.getLength() / gap)));
    out.push(...pts);
  }
  return out;
}
