// Where the vase stands for each part of the page, and where that lands on screen.
// The DOM and the 3D scene both read this, so the text and the porcelain agree.

export const D = 16; // camera distance
export const FOV = 20; // vertical field of view, degrees
export const H = 3.2; // vase height in its own units
export const ZP = 1.7; // the backdrop stands this far behind the vase's axis
export const VIS = 2 * D * Math.tan((FOV / 2) * Math.PI / 180); // world height seen at the vase

export type Shot = 'hero' | 'side' | 'join' | 'end';
export type Frame = { gx: number; gy: number; s: number };

/** Normalized profile: [height 0..1, radius]. The space beside it is a face looking in. */
export const PROFILE: [number, number][] = [
  [0.0, 0.5], [0.014, 0.535], [0.032, 0.55], [0.05, 0.52], [0.075, 0.56],
  [0.12, 0.64], [0.2, 0.63], [0.27, 0.585], [0.315, 0.47], [0.36, 0.385],
  [0.395, 0.375], [0.44, 0.465], [0.475, 0.4], [0.505, 0.418], [0.535, 0.39],
  [0.572, 0.44], [0.6, 0.31], [0.625, 0.27], [0.66, 0.36], [0.71, 0.47],
  [0.758, 0.548], [0.8, 0.505], [0.88, 0.54], [0.95, 0.65], [1.0, 0.79],
];
export const RS = 1.25; // radius scale
export const MAXR = 0.8 * RS;

/** Vase radius (own units) at normalized height t, linear between profile points. */
export function radiusAt(t: number) {
  for (let i = 1; i < PROFILE.length; i++) {
    const [y1, r1] = PROFILE[i];
    if (t <= y1) { const [y0, r0] = PROFILE[i - 1]; const k = (t - y0) / (y1 - y0 || 1); return (r0 + (r1 - r0) * k) * RS; }
  }
  return PROFILE[PROFILE.length - 1][1] * RS;
}

/** A frame from where the rim and the foot should sit (fractions of screen height) and an x offset (fraction of width). */
function fromScreen(rimF: number, footF: number, xF: number, aspect: number): Frame {
  const yRim = (0.5 - rimF) * VIS, yFoot = (0.5 - footF) * VIS;
  return { gx: xF * VIS * aspect, gy: yFoot, s: (yRim - yFoot) / H };
}

export function frameFor(shot: Shot, w: number, h: number): Frame {
  const a = w / h, phone = w <= 820;
  if (phone) {
    if (shot === 'hero') return fromScreen(0.29, 0.6, 0, a);
    if (shot === 'side') return fromScreen(0.2, 0.6, 0, a);
    if (shot === 'join') return fromScreen(0.17, 0.5, 0, a);
    return fromScreen(0.22, 0.5, 0, a);
  }
  if (shot === 'hero') return fromScreen(0.2, 0.8, 0, a);
  if (shot === 'side') return fromScreen(0.15, 0.84, 0.25, a);
  if (shot === 'join') return fromScreen(0.08, 0.55, 0, a);
  return fromScreen(0.2, 0.74, 0.27, a);
}

/** Screen numbers for a frame: rim line, the band's lower edge, the axis, and the half width at a given height. */
export function onScreen(f: Frame, w: number, h: number) {
  const ppu = h / VIS;
  const y = (Y: number, z = 0) => h / 2 - Y * (D / (D - z)) * ppu;
  return {
    ppu,
    rim: y(f.gy + f.s * H),
    foot: y(f.gy),
    bandBot: y(f.gy, -ZP),
    cx: w / 2 + f.gx * ppu,
    half: (t0: number, t1: number) => { let m = 0; for (let t = t0; t <= t1; t += 0.01) m = Math.max(m, radiusAt(t)); return m * f.s * ppu; },
    at: (t: number) => y(f.gy + f.s * H * t),
  };
}
