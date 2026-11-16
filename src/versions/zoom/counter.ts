// Finds the enclosed counter of a glyph (the hole in an o, the bowl of a p) by
// drawing it on a canvas and flood filling from the edges. Returns the largest
// rectangle of the given aspect that fits inside it, relative to the glyph's
// origin on its baseline, in px at the given font size.
export type Box = { x: number; y: number; w: number; h: number; hole?: { url: string; x: number; y: number; w: number; h: number } };

const REF = 480;

export function counterBox(ch: string, family: string, style: string, weight: number, size: number, aspect: number, tint = '#000'): Box | null {
  const S = Math.round(REF * 2);
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.font = `${style} ${weight} ${REF}px ${family}`;
  g.fillStyle = '#000';
  const ox = REF * 0.5, by = REF * 1.3;
  g.fillText(ch, ox, by);
  const d = g.getImageData(0, 0, S, S).data;
  const N = S * S;
  const ink = new Uint8Array(N);
  for (let i = 0; i < N; i++) ink[i] = d[i * 4 + 3] > 110 ? 1 : 0;
  // 0 = unknown paper, 1 = ink, 2 = outside, 3+ = counter labels
  const lab = new Int32Array(N);
  // close hairline gaps a pixel or two wide before looking for the counter
  const thick = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (ink[i]) { const x = i % S; for (let d = -2; d <= 2; d++) if (x + d >= 0 && x + d < S) thick[i + d] = 1; }
  for (let i = 0; i < N; i++) if (thick[i]) for (let d = -2; d <= 2; d++) { const q = i + d * S; if (q >= 0 && q < N) ink[q] = 1; }
  for (let i = 0; i < N; i++) lab[i] = ink[i];
  const stack = new Int32Array(N);
  const fill = (seed: number, v: number) => {
    let sp = 0; let count = 0;
    stack[sp++] = seed; lab[seed] = v;
    while (sp) {
      const p = stack[--sp]; count++;
      const x = p % S, y = (p / S) | 0;
      if (x > 0 && lab[p - 1] === 0) { lab[p - 1] = v; stack[sp++] = p - 1; }
      if (x < S - 1 && lab[p + 1] === 0) { lab[p + 1] = v; stack[sp++] = p + 1; }
      if (y > 0 && lab[p - S] === 0) { lab[p - S] = v; stack[sp++] = p - S; }
      if (y < S - 1 && lab[p + S] === 0) { lab[p + S] = v; stack[sp++] = p + S; }
    }
    return count;
  };
  fill(0, 2);
  let best = -1, bestN = 0, v = 3;
  for (let i = 0; i < N; i++) {
    if (lab[i] === 0) { const n = fill(i, v); if (n > bestN) { bestN = n; best = v; } v++; }
  }
  if (best < 0) return null;
  // summed-area table of the chosen counter
  const W1 = S + 1;
  const sat = new Float64Array(W1 * W1);
  let sx = 0, sy = 0;
  for (let y = 0; y < S; y++) {
    let row = 0;
    for (let x = 0; x < S; x++) {
      const on = lab[y * S + x] === best ? 1 : 0;
      if (on) { sx += x; sy += y; }
      row += on;
      sat[(y + 1) * W1 + x + 1] = sat[y * W1 + x + 1] + row;
    }
  }
  const area = (x0: number, y0: number, x1: number, y1: number) => sat[y1 * W1 + x1] - sat[y0 * W1 + x1] - sat[y1 * W1 + x0] + sat[y0 * W1 + x0];
  const fits = (cx: number, cy: number, h: number) => {
    const w = h * aspect;
    const x0 = Math.round(cx - w / 2), x1 = Math.round(cx + w / 2), y0 = Math.round(cy - h / 2), y1 = Math.round(cy + h / 2);
    if (x0 < 0 || y0 < 0 || x1 > S || y1 > S) return false;
    return area(x0, y0, x1, y1) >= (x1 - x0) * (y1 - y0) - 1;
  };
  let cx = sx / bestN, cy = sy / bestN;
  // search a small neighbourhood of centres for the biggest fit
  let bh = 0, bcx = cx, bcy = cy;
  for (let dy = -8; dy <= 8; dy += 2) for (let dx = -8; dx <= 8; dx += 2) {
    let lo = 0, hi = S;
    const x = cx + dx * (REF / 100), y = cy + dy * (REF / 100);
    while (hi - lo > 1) { const m = (lo + hi) / 2; if (fits(x, y, m)) lo = m; else hi = m; }
    if (lo > bh) { bh = lo; bcx = x; bcy = y; }
  }
  cx = bcx; cy = bcy;
  const k = size / REF;
  const h = bh * 0.9;
  return { x: (cx - ox) * k, y: (cy - by) * k, w: h * aspect * k, h: h * k, hole: holeOf(lab, best, S, tint, ox, by, k) };
}

/** The counter as a solid shape in the next level's colour, grown a few pixels so
 *  its soft edge always hides under the letter's own (crisp) stroke. */
function holeOf(lab: Int32Array, v: number, S: number, fill: string, ox: number, by: number, k: number) {
  let x0 = S, y0 = S, x1 = 0, y1 = 0;
  for (let i = 0; i < S * S; i++) if (lab[i] === v) {
    const x = i % S, y = (i / S) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const r = 6;
  const w = x1 - x0 + 1 + 2 * r, h = y1 - y0 + 1 + 2 * r;
  const a = new Uint8Array(w * h), b = new Uint8Array(w * h);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (lab[y * S + x] === v) a[(y - y0 + r) * w + (x - x0 + r)] = 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x]) for (let d = -r; d <= r; d++) { const q = x + d; if (q >= 0 && q < w) b[y * w + q] = 1; }
  a.fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (b[y * w + x]) for (let d = -r; d <= r; d++) { const q = y + d; if (q >= 0 && q < h) a[q * w + x] = 1; }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (!g) return undefined;
  const n = parseInt(fill.slice(1), 16);
  const img = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) if (a[i]) { img.data[i * 4] = n >> 16; img.data[i * 4 + 1] = (n >> 8) & 255; img.data[i * 4 + 2] = n & 255; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  return { url: c.toDataURL('image/png'), x: (x0 - r - ox) * k, y: (y0 - r - by) * k, w: w * k, h: h * k };
}
