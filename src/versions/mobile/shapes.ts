// Flat outlines for the cut sheet metal. Each hangs from (0, 0) and falls
// downward. The same points draw the steel plates and the small marks beside
// the three ways in.
import type { Kind } from './sim';

type P = [number, number];

function circle(cx: number, cy: number, r: number, a0: number, a1: number, n: number): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}

export function outline(kind: Kind, s: number): P[] {
  const n = 48;
  switch (kind) {
    case 'disc':
    case 'dot':
      return circle(0, -s, s, Math.PI / 2, Math.PI / 2 + Math.PI * 2, n * 1.5).slice(0, -1);
    case 'half': {
      // a half moon, flat edge up, hung from the middle of the flat
      const pts: P[] = [[-s * 1.15, 0]];
      return pts.concat(circle(0, 0, s * 1.15, Math.PI, Math.PI * 2, n).slice(1));
    }
    case 'crescent': {
      // outer circle less an offset circle, hung from the upper horn
      const R = s, r = s * 0.86, ix = s * 0.4, iy = s * 0.14;
      const M = 160;
      const outer: P[] = [], inner: P[] = [];
      for (let i = 0; i <= M; i++) {
        const a = Math.PI * 0.001 + (Math.PI * 2 * 0.999 * i) / M;
        const p: P = [Math.cos(a) * R, Math.sin(a) * R];
        if (Math.hypot(p[0] - ix, p[1] - iy) > r) outer.push(p);
      }
      for (let i = M; i >= 0; i--) {
        const a = Math.PI * 0.001 + (Math.PI * 2 * 0.999 * i) / M;
        const p: P = [ix + Math.cos(a) * r, iy + Math.sin(a) * r];
        if (Math.hypot(p[0], p[1]) < R) inner.push(p);
      }
      const pts = outer.concat(inner);
      const top = pts.reduce((m, p) => (p[1] > m[1] ? p : m), pts[0]);
      return pts.map(([x, y]) => [x - top[0], y - top[1]] as P);
    }
    case 'leaf': {
      const h = s * 2.1, w = s * 0.62;
      const right: P[] = [], left: P[] = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n; const y = -h * t;
        const k = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.85);
        right.push([w * k + 0.08 * s * Math.sin(Math.PI * t), y]);
        left.unshift([-w * k * 0.92 + 0.08 * s * Math.sin(Math.PI * t), y]);
      }
      return right.concat(left.slice(1, -1));
    }
    case 'drop': {
      const r = s * 0.8, cy = -s * 1.7;
      const pts: P[] = [[0, 0]];
      const c = Math.acos(r / -cy);
      return pts.concat(circle(0, cy, r, Math.PI / 2 + c, Math.PI / 2 - c + Math.PI * 2, n));
    }
  }
}

/** The same outline as an SVG path, in a box of the given size. */
export function svgPath(kind: Kind, box = 40): { d: string; vb: string } {
  const pts = outline(kind, 1);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => -p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const k = box / Math.max(x1 - x0, y1 - y0);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${((x - x0) * k).toFixed(2)} ${((-y - y0) * k).toFixed(2)}`).join(' ') + 'Z';
  return { d, vb: `0 0 ${((x1 - x0) * k).toFixed(1)} ${((y1 - y0) * k).toFixed(1)}` };
}
