// The bracket sheet, in world units. Built once in abstract coordinates
// (u runs round by round, v runs across a round) and mapped to the screen:
// desktop runs left to right, the phone runs top to bottom.

export type Cam = { cx: number; cy: number; s: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Seg = { x1: number; y1: number; x2: number; y2: number; r: number };

export const ROUNDS = ['Octafinals', 'Quarterfinals', 'Semifinals', 'Finals'] as const;
export const COUNTS = [16, 8, 4, 2, 1];
export const SKEP = 0; // the one filled slot in octafinals

export type Geo = {
  phone: boolean;
  bounds: Rect; // everything on the sheet, labels included
  rules: Seg[]; // every hairline, tagged with its round
  path: string; // the red line
  pathLen: number;
  stops: number[]; // fraction of the red line at the end of each round's slot
  stub: number; // the short piece that already leaves SKEPTICAL
  fields: Rect[]; // the calm field of the slot the line reaches, per round (0..4)
  cols: Rect[]; // the area of each round, for pressing
  heads: { x: number; y: number }[]; // where each round label sits
  skep: { x: number; y: number; size: number };
  mark: { x: number; y: number; size: number };
};

export function build(phone: boolean): Geo {
  const V = phone ? 900 : 760;
  const L = phone ? [250, 200, 200, 200, 170] : [700, 380, 380, 380, 330];
  const U: number[] = [0];
  for (let r = 1; r < 5; r++) U[r] = U[r - 1] + L[r - 1];
  const vAt = (r: number, i: number) => (i + 0.5) * (V / COUNTS[r]);
  const P = (u: number, v: number) => (phone ? { x: v, y: u } : { x: u, y: v });

  const rules: Seg[] = [];
  const line = (u1: number, v1: number, u2: number, v2: number, r: number) => {
    const a = P(u1, v1), b = P(u2, v2);
    rules.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, r });
  };
  for (let r = 0; r < 5; r++) {
    for (let i = 0; i < COUNTS[r]; i++) line(U[r], vAt(r, i), U[r] + L[r], vAt(r, i), r);
    if (r < 4) for (let k = 0; k < COUNTS[r] / 2; k++) line(U[r + 1], vAt(r, 2 * k), U[r + 1], vAt(r, 2 * k + 1), r);
  }

  // The red line, with a little ink overshoot at each turn.
  const os = phone ? 9 : 8;
  const pts: { u: number; v: number }[] = [];
  const idx = [0, 1, 2, 3, 4].map((r) => Math.floor(SKEP / 2 ** r));
  pts.push({ u: U[0], v: vAt(0, idx[0]) });
  const stopsAt: number[] = [];
  for (let r = 0; r < 4; r++) {
    const v0 = vAt(r, idx[r]), v1 = vAt(r + 1, idx[r + 1]);
    const dir = Math.sign(v1 - v0) || 1;
    pts.push({ u: U[r + 1], v: v0 });
    stopsAt.push(pts.length - 1);
    pts.push({ u: U[r + 1] + os, v: v0 });
    pts.push({ u: U[r + 1], v: v0 });
    pts.push({ u: U[r + 1], v: v1 + dir * os });
    pts.push({ u: U[r + 1], v: v1 });
  }
  pts.push({ u: U[4] + L[4], v: vAt(4, 0) });
  stopsAt.push(pts.length - 1);

  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i].u - pts[i - 1].u, pts[i].v - pts[i - 1].v);
  const pathLen = cum[cum.length - 1];
  const path = pts.map((p, i) => { const q = P(p.u, p.v); return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join(' ');
  const stops = stopsAt.map((i) => cum[i] / pathLen);
  // stops[0] is the end of the SKEPTICAL slot: the stub is a fifth of that.
  const stub = stops[0] * 0.2;

  // The field above (desktop) or to the left (phone) of the slot the line reaches.
  const fields: Rect[] = [];
  for (let r = 0; r < 5; r++) {
    const gap = r < 4 ? V / COUNTS[r] : V / 2;
    const v = vAt(r, idx[r]);
    const a = P(U[r], v - gap), b = P(U[r] + L[r], v);
    fields.push({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) });
  }

  const cols: Rect[] = [];
  const heads: { x: number; y: number }[] = [];
  for (let r = 0; r < 4; r++) {
    const a = P(U[r], phone ? 0 : -100), b = P(U[r] + L[r], V);
    cols.push({ x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y });
    heads.push(phone ? P(U[r] + L[r] * 0.5, 0) : P(U[r], 0));
  }

  const sv = vAt(0, SKEP);
  const skep = phone ? { x: sv - 22, y: -40, size: 104 } : { x: 6, y: sv - 12, size: 118 };
  const cv = vAt(4, 0);
  const mark = phone ? { x: cv + 80, y: U[4] + L[4] * 0.55, size: 150 } : { x: U[4] + L[4] * 0.5, y: cv - 16, size: 230 };

  const W = phone ? V : U[4] + L[4];
  const H = phone ? U[4] + L[4] : V;
  const bounds = phone ? { x: -10, y: -150, w: W + 20, h: H + 160 } : { x: -10, y: -180, w: W + 20, h: H + 200 };
  return { phone, bounds, rules, path, pathLen, stops, stub, fields, cols, heads, skep, mark };
}

/** Fit a rect inside a screen box (contain). */
export function fit(r: Rect, box: Rect, vw: number, vh: number): Cam {
  const s = Math.min(box.w / r.w, box.h / r.h);
  // box centre on screen should show the rect centre
  const bx = box.x + box.w / 2, by = box.y + box.h / 2;
  return { s, cx: r.x + r.w / 2 - (bx - vw / 2) / s, cy: r.y + r.h / 2 - (by - vh / 2) / s };
}

/** Stand inside a slot: its rule sits near the bottom (desktop) or right (phone) edge. */
export function inside(f: Rect, phone: boolean, vw: number, vh: number): Cam {
  if (!phone) {
    const s = Math.max(vh / (f.h * 0.94), vw / (f.w * 0.98));
    const h = vh / s, w = vw / s;
    return { s, cx: f.x + Math.min(w / 2 + f.w * 0.01, f.w / 2), cy: f.y + f.h - h / 2 + h * 0.035 };
  }
  const s = Math.max(vw / (f.w * 0.94), vh / (f.h * 0.98));
  const h = vh / s, w = vw / s;
  return { s, cx: f.x + f.w - w / 2 + w * 0.035, cy: f.y + Math.min(h / 2 + f.h * 0.01, f.h / 2) };
}

export function union(a: Rect, b: Rect, pad: number): Rect {
  const x = Math.min(a.x, b.x) - pad, y = Math.min(a.y, b.y) - pad;
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) + pad - x, h: Math.max(a.y + a.h, b.y + b.h) + pad - y };
}

export function mixCam(a: Cam, b: Cam, t: number): Cam {
  const s = Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * t);
  // move the centre in step with the zoom so the travel feels like one gesture
  const k = Math.abs(b.s - a.s) < 1e-6 ? t : (1 / s - 1 / a.s) / (1 / b.s - 1 / a.s);
  const m = Number.isFinite(k) ? Math.min(1, Math.max(0, k * 0.5 + t * 0.5)) : t;
  return { s, cx: a.cx + (b.cx - a.cx) * m, cy: a.cy + (b.cy - a.cy) * m };
}
