// A single-stroke capital alphabet, drawn the way a stylus point cuts it:
// each glyph is a list of strokes in cutting order, in a box one unit tall
// (y runs down). Only the letters the tablet needs.
type P = [number, number];
type G = { w: number; s: P[][] };

const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 18): P[] => {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + (a1 - a0) * (i / n)) * Math.PI) / 180;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
};

const bowl = (): P[] => [[0, 0], [0.32, 0], ...arc(0.32, 0.26, 0.28, 0.26, -90, 90, 14), [0, 0.52]];

export const GLYPHS: Record<string, G> = {
  A: { w: 0.8, s: [[[0, 1], [0.4, 0], [0.8, 1]], [[0.15, 0.64], [0.65, 0.64]]] },
  C: { w: 0.76, s: [arc(0.44, 0.5, 0.44, 0.5, -38, -322, 26)] },
  D: { w: 0.74, s: [[[0, 0], [0, 1]], [[0, 0], [0.24, 0], ...arc(0.24, 0.5, 0.5, 0.5, -90, 90, 22), [0, 1]]] },
  E: { w: 0.58, s: [[[0.58, 0], [0, 0], [0, 1], [0.58, 1]], [[0, 0.5], [0.46, 0.5]]] },
  F: { w: 0.56, s: [[[0.56, 0], [0, 0], [0, 1]], [[0, 0.5], [0.46, 0.5]]] },
  H: { w: 0.72, s: [[[0, 0], [0, 1]], [[0.72, 0], [0.72, 1]], [[0, 0.5], [0.72, 0.5]]] },
  I: { w: 0.02, s: [[[0, 0], [0, 1]]] },
  J: { w: 0.5, s: [[[0.5, 0], [0.5, 0.72], ...arc(0.25, 0.72, 0.25, 0.28, 0, 160, 12)]] },
  K: { w: 0.66, s: [[[0, 0], [0, 1]], [[0.66, 0], [0, 0.6]], [[0.22, 0.42], [0.68, 1]]] },
  L: { w: 0.54, s: [[[0, 0], [0, 1], [0.54, 1]]] },
  M: { w: 0.92, s: [[[0, 1], [0, 0], [0.46, 0.78], [0.92, 0], [0.92, 1]]] },
  N: { w: 0.74, s: [[[0, 1], [0, 0], [0.74, 1], [0.74, 0]]] },
  O: { w: 0.92, s: [arc(0.46, 0.5, 0.46, 0.5, -90, 270, 34)] },
  P: { w: 0.62, s: [[[0, 1], [0, 0]], bowl()] },
  R: { w: 0.66, s: [[[0, 1], [0, 0]], bowl(), [[0.3, 0.52], [0.68, 1]]] },
  S: { w: 0.62, s: [[...arc(0.31, 0.255, 0.28, 0.255, -20, -270, 16), ...arc(0.31, 0.755, 0.31, 0.245, -90, 160, 18).slice(1)]] },
  T: { w: 0.72, s: [[[0, 0], [0.72, 0]], [[0.36, 0], [0.36, 1]]] },
  U: { w: 0.72, s: [[[0, 0], [0, 0.64], ...arc(0.36, 0.64, 0.36, 0.36, 180, 0, 16), [0.72, 0]]] },
  '?': { w: 0.56, s: [[...arc(0.28, 0.25, 0.28, 0.25, -165, 55, 18), [0.28, 0.6], [0.28, 0.74]], [[0.28, 0.955], [0.28, 0.965]]] },
  '.': { w: 0.04, s: [[[0.02, 0.955], [0.02, 0.965]]] },
  ' ': { w: 0.34, s: [] },
};

export type Stroke = P[];
const TRACK = 0.24;

/** Lay out lines of capitals centred in a box; returns strokes in canvas pixels and the cut width. */
export function layout(lines: string[], box: { x: number; y: number; w: number; h: number }, maxCap: number, weight = 0.1): { strokes: Stroke[]; width: number } {
  const widthOf = (t: string) => t.split('').reduce((a, ch, i) => a + (GLYPHS[ch]?.w ?? 0.4) + (i ? TRACK : 0), 0);
  const widest = Math.max(...lines.map(widthOf));
  const lead = 1.5;
  const capByW = box.w / widest;
  const capByH = box.h / (lines.length + (lines.length - 1) * (lead - 1));
  const cap = Math.min(maxCap, capByW, capByH);
  const total = cap * (lines.length + (lines.length - 1) * (lead - 1));
  const strokes: Stroke[] = [];
  lines.forEach((t, li) => {
    let x = box.x + (box.w - widthOf(t) * cap) / 2;
    const y = box.y + (box.h - total) / 2 + li * cap * lead;
    t.split('').forEach((ch) => {
      const g = GLYPHS[ch];
      if (!g) return;
      for (const s of g.s) strokes.push(s.map(([px, py]) => [x + px * cap, y + py * cap] as P));
      x += (g.w + TRACK) * cap;
    });
  });
  return { strokes, width: Math.max(5, cap * weight) };
}
