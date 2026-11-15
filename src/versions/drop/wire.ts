// Line art in three dimensions on a 2D canvas: outlines flattened to polylines,
// pushed back into an extrusion, turned, and projected. Nothing here is a mesh.

export type Contour = {
  n: number;
  x: Float32Array; y: Float32Array;
  /** 1 where the outline turns sharply: those vertices get an edge running back into the depth. */
  c: Uint8Array;
  fx: Float32Array; fy: Float32Array; bx: Float32Array; by: Float32Array;
};
export type Shape = { cs: Contour[]; w: number; h: number; ox: number; oy: number };
export type Cam = { cx: number; cy: number; f: number };
export type Mat = Float32Array;

/** An SVG path (absolute M L H V Q C Z) as closed polylines. `q` is the length of one curve step, in path units. */
export function flatten(d: string, q = 45): { x: number[]; y: number[] }[] {
  const out: { x: number[]; y: number[] }[] = [];
  let cur: { x: number[]; y: number[] } | null = null;
  let px = 0, py = 0;
  const to = (x: number, y: number) => { cur?.x.push(x); cur?.y.push(y); px = x; py = y; };
  const re = /([MLHVQCZ])([^MLHVQCZ]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const n = (m[2].match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
    switch (m[1]) {
      case 'M':
        cur = { x: [], y: [] }; out.push(cur);
        for (let i = 0; i + 1 < n.length; i += 2) to(n[i], n[i + 1]);
        break;
      case 'L': for (let i = 0; i + 1 < n.length; i += 2) to(n[i], n[i + 1]); break;
      case 'H': for (const v of n) to(v, py); break;
      case 'V': for (const v of n) to(px, v); break;
      case 'Q':
        for (let i = 0; i + 3 < n.length; i += 4) {
          const x0 = px, y0 = py, [x1, y1, x2, y2] = n.slice(i, i + 4);
          const len = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1);
          const k = Math.max(2, Math.min(12, Math.ceil(len / q)));
          for (let s = 1; s <= k; s++) { const t = s / k, u = 1 - t; to(u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2); }
        }
        break;
      case 'C':
        for (let i = 0; i + 5 < n.length; i += 6) {
          const x0 = px, y0 = py, [x1, y1, x2, y2, x3, y3] = n.slice(i, i + 6);
          const len = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
          const k = Math.max(2, Math.min(14, Math.ceil(len / q)));
          for (let s = 1; s <= k; s++) { const t = s / k, u = 1 - t; to(u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3); }
        }
        break;
      default: break;
    }
  }
  for (const c of out) {
    // Drop doubled points and the closing point that repeats the first.
    for (let i = c.x.length - 1; i > 0; i--) if (Math.hypot(c.x[i] - c.x[i - 1], c.y[i] - c.y[i - 1]) < 0.01) { c.x.splice(i, 1); c.y.splice(i, 1); }
    const l = c.x.length - 1;
    if (l > 1 && Math.hypot(c.x[l] - c.x[0], c.y[l] - c.y[0]) < 0.01) { c.x.pop(); c.y.pop(); }
  }
  return out.filter((c) => c.x.length > 2);
}

/** Polylines centred on their own bounding box, ready to be extruded. */
export function shapeOf(polys: { x: number[]; y: number[] }[]): Shape {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (let i = 0; i < p.x.length; i++) { x0 = Math.min(x0, p.x[i]); x1 = Math.max(x1, p.x[i]); y0 = Math.min(y0, p.y[i]); y1 = Math.max(y1, p.y[i]); }
  const ox = (x0 + x1) / 2, oy = (y0 + y1) / 2;
  const cs = polys.map((p): Contour => {
    const n = p.x.length;
    const x = new Float32Array(n), y = new Float32Array(n), c = new Uint8Array(n);
    for (let i = 0; i < n; i++) { x[i] = p.x[i] - ox; y[i] = p.y[i] - oy; }
    for (let i = 0; i < n; i++) {
      const a = (i + n - 1) % n, b = (i + 1) % n;
      const ux = x[i] - x[a], uy = y[i] - y[a], vx = x[b] - x[i], vy = y[b] - y[i];
      const dot = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy) || 1);
      c[i] = dot < 0.86 ? 1 : 0;
    }
    return { n, x, y, c, fx: new Float32Array(n), fy: new Float32Array(n), bx: new Float32Array(n), by: new Float32Array(n) };
  });
  return { cs, w: x1 - x0, h: y1 - y0, ox, oy };
}

export const shape = (d: string, q = 45) => shapeOf(flatten(d, q));

/** Rotation about x, then z, then y, written into `o` (row-major 3x3). */
export function euler(rx: number, ry: number, rz: number, o: Mat): Mat {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  // R = Ry * Rx * Rz
  o[0] = cy * cz + sy * sx * sz; o[1] = -cy * sz + sy * sx * cz; o[2] = sy * cx;
  o[3] = cx * sz;                o[4] = cx * cz;                 o[5] = -sx;
  o[6] = -sy * cz + cy * sx * sz; o[7] = sy * sz + cy * sx * cz; o[8] = cy * cx;
  return o;
}
export function mul(a: Mat, b: Mat, o: Mat): Mat {
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return o;
}

export type SolidStyle = { stroke: string; fill: string | null; lw: number; alpha: number; back: number; glow: number; hatch?: number };

/**
 * Draw a shape as an extruded solid in hidden-line style: the back outline and
 * the edges running into the depth first, then the front face filled with the
 * background (so it hides what is behind it) and stroked bright.
 */
export function drawSolid(
  g: CanvasRenderingContext2D, s: Shape, m: Mat, kx: number, ky: number,
  tx: number, ty: number, tz: number, depth: number, cam: Cam, st: SolidStyle,
) {
  const zf = -depth / 2, zb = depth / 2;
  for (const c of s.cs) {
    for (let i = 0; i < c.n; i++) {
      const lx = c.x[i] * kx, ly = c.y[i] * ky;
      const ax = m[0] * lx + m[1] * ly, ay = m[3] * lx + m[4] * ly, az = m[6] * lx + m[7] * ly;
      let wz = az + m[8] * zf + tz, p = cam.f / (cam.f + wz);
      c.fx[i] = cam.cx + (ax + m[2] * zf + tx) * p; c.fy[i] = cam.cy + (ay + m[5] * zf + ty) * p;
      wz = az + m[8] * zb + tz; p = cam.f / (cam.f + wz);
      c.bx[i] = cam.cx + (ax + m[2] * zb + tx) * p; c.by[i] = cam.cy + (ay + m[5] * zb + ty) * p;
    }
  }
  g.lineJoin = 'round';
  g.strokeStyle = st.stroke;
  if (depth > 0 && st.back > 0) {
    g.beginPath();
    for (const c of s.cs) {
      g.moveTo(c.bx[0], c.by[0]);
      for (let i = 1; i < c.n; i++) g.lineTo(c.bx[i], c.by[i]);
      g.closePath();
      for (let i = 0; i < c.n; i++) if (c.c[i]) { g.moveTo(c.fx[i], c.fy[i]); g.lineTo(c.bx[i], c.by[i]); }
    }
    g.globalAlpha = st.alpha * st.back; g.lineWidth = st.lw * 0.8; g.stroke();
  }
  g.beginPath();
  for (const c of s.cs) {
    g.moveTo(c.fx[0], c.fy[0]);
    for (let i = 1; i < c.n; i++) g.lineTo(c.fx[i], c.fy[i]);
    g.closePath();
  }
  if (st.fill) { g.globalAlpha = Math.min(1, st.alpha * 1.2); g.fillStyle = st.fill; g.fill('evenodd'); }
  if (st.hatch) {
    // rule the face like paper: horizontal lines clipped to the letter
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const c of s.cs) for (let i = 0; i < c.n; i++) { x0 = Math.min(x0, c.fx[i]); x1 = Math.max(x1, c.fx[i]); y0 = Math.min(y0, c.fy[i]); y1 = Math.max(y1, c.fy[i]); }
    g.save(); g.clip('evenodd');
    g.beginPath();
    for (let y = Math.ceil(y0 / st.hatch) * st.hatch + 0.5; y < y1; y += st.hatch) { g.moveTo(x0, y); g.lineTo(x1, y); }
    g.globalAlpha = st.alpha * 0.2; g.lineWidth = 1; g.stroke();
    g.restore();
    g.beginPath();
    for (const c of s.cs) { g.moveTo(c.fx[0], c.fy[0]); for (let i = 1; i < c.n; i++) g.lineTo(c.fx[i], c.fy[i]); g.closePath(); }
  }
  if (st.glow > 0) { g.globalAlpha = st.alpha * st.glow; g.lineWidth = st.lw + 6; g.stroke(); }
  g.globalAlpha = st.alpha; g.lineWidth = st.lw; g.stroke();
  g.globalAlpha = 1;
}

/** Project one point with the same camera. Returns [x, y]. */
export function project(m: Mat, x: number, y: number, z: number, tx: number, ty: number, tz: number, cam: Cam, o: [number, number]) {
  const wx = m[0] * x + m[1] * y + m[2] * z + tx, wy = m[3] * x + m[4] * y + m[5] * z + ty, wz = m[6] * x + m[7] * y + m[8] * z + tz;
  const p = cam.f / (cam.f + wz);
  o[0] = cam.cx + wx * p; o[1] = cam.cy + wy * p;
  return o;
}
