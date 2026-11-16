// The brand question mark as three.js shapes, read straight from its path
// (M, L and Q only), one shape per subpath: the hook and the dot.
import * as THREE from 'three';

export function markShapes(d: string): THREE.Shape[] {
  const tok = d.match(/[MLQ]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const shapes: THREE.Shape[] = [];
  let cur: THREE.Shape | null = null, cmd = '', i = 0;
  const n = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/[MLQ]/.test(tok[i])) cmd = tok[i++];
    if (cmd === 'M') { cur = new THREE.Shape(); shapes.push(cur); cur.moveTo(n(), n()); cmd = 'L'; }
    else if (cmd === 'L') cur!.lineTo(n(), n());
    else if (cmd === 'Q') { const a = n(), b = n(), c = n(), e = n(); cur!.quadraticCurveTo(a, b, c, e); }
    else i++;
  }
  return shapes;
}
