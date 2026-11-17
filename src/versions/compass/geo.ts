// The compass: every letter here is a function of a few points. Move a point
// and the circles, the straightedge lines and the ink are all worked out again.

export type V = { x: number; y: number };
export type Guide = { k: 'c'; c: V; r: number; s: number } | { k: 'l'; a: V; b: V; e: number };
export type Built = { guides: Guide[]; ink: string[]; marks: V[]; from: V; hp?: V[] };
export type Glyph = { vb: [number, number, number, number]; pts: V[]; build: (p: V[]) => Built; dur: number };

export const v = (x: number, y: number): V => ({ x, y });
const f = (n: number) => (Math.round(n * 10) / 10).toString();
const fp = (p: V) => `${f(p.x)} ${f(p.y)}`;
export const at = (c: V, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return v(c.x + r * Math.cos(a), c.y + r * Math.sin(a));
};
export const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);
const cl = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

const rect = (x0: number, y0: number, x1: number, y1: number) => `M${f(x0)} ${f(y0)}H${f(x1)}V${f(y1)}H${f(x0)}Z`;
const poly = (...p: V[]) => 'M' + p.map(fp).join('L') + 'Z';
const disc = (c: V, r: number) =>
  `M${f(c.x - r)} ${f(c.y)}A${f(r)} ${f(r)} 0 1 0 ${f(c.x + r)} ${f(c.y)}A${f(r)} ${f(r)} 0 1 0 ${f(c.x - r)} ${f(c.y)}Z`;
/** The ring between two circles, from angle a0 to a1 (degrees, clockwise on screen). */
const band = (O: V, R: number, I: V, ri: number, a0: number, a1: number) => {
  const lg = a1 - a0 > 180 ? 1 : 0;
  return `M${fp(at(O, R, a0))}A${f(R)} ${f(R)} 0 ${lg} 1 ${fp(at(O, R, a1))}L${fp(at(I, ri, a1))}A${f(ri)} ${f(ri)} 0 ${lg} 0 ${fp(at(I, ri, a0))}Z`;
};

const C = (c: V, r: number, s = -90): Guide => ({ k: 'c', c, r, s });
const L = (a: V, b: V, e = 0): Guide => ({ k: 'l', a, b, e });
const H = (y: number, x0: number, x1: number) => L(v(x0, y), v(x1, y));
const Vt = (x: number, y0: number, y1: number) => L(v(x, y0), v(x, y1));

/** The path a guide is drawn along: circles start where the compass is set down. */
export function guidePath(g: Guide) {
  if (g.k === 'c') {
    const a = at(g.c, g.r, g.s), b = at(g.c, g.r, g.s + 180), r = f(g.r);
    return `M${fp(a)}A${r} ${r} 0 1 1 ${fp(b)}A${r} ${r} 0 1 1 ${fp(a)}`;
  }
  const d = dist(g.a, g.b) || 1, ux = (g.b.x - g.a.x) / d, uy = (g.b.y - g.a.y) / d;
  return `M${fp(v(g.a.x - ux * g.e, g.a.y - uy * g.e))}L${fp(v(g.b.x + ux * g.e, g.b.y + uy * g.e))}`;
}

/* ---------- The question mark: a hook from two circles, a tapered bar, one dot ---------- */

const q0 = { O: v(500, 400), R: 300 };
const QT = (() => {
  const R = q0.R, tR = 0.35 * R, tL = 0.07 * R, tT = 0.055 * R;
  const I = v(q0.O.x - (tR - tL) / 2, q0.O.y + (tT - (tR + tL) / 2)), ri = R - (tR + tL) / 2;
  return at(v((q0.O.x + I.x) / 2, (q0.O.y + I.y) / 2), (R + ri) / 2, 460);
})();
export const QMARK: Glyph = {
  vb: [60, 50, 880, 1150],
  dur: 3.1,
  pts: [q0.O, v(q0.O.x + q0.R, q0.O.y), v(434, 968), v(434, 1112)],
  build: ([O, E, S0, D0]) => {
    const R = cl(dist(O, E), 150, 440);
    const tR = 0.35 * R, tL = 0.07 * R, tT = 0.055 * R;
    const I = v(O.x - (tR - tL) / 2, O.y + (tT - (tR + tL) / 2));
    const ri = R - (tR + tL) / 2;
    const a0 = 200, a1 = 470;
    const mid = v((O.x + I.x) / 2, (O.y + I.y) / 2), rm = (R + ri) / 2;
    const T = at(mid, rm, 460);
    // The stem and the dot hang from the hook: when the hook moves, they come with it.
    const sh = v(T.x - QT.x, T.y - QT.y);
    const S = v(S0.x + sh.x, S0.y + sh.y), D = v(D0.x + sh.x, D0.y + sh.y);
    let dx = S.x - T.x, dy = S.y - T.y;
    if (dy < 0.4 * R) dy = 0.4 * R;
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    const px = -dy, py = dx;
    const Sx = v(T.x + dx * len, T.y + dy * len);
    const wt = 0.27 * R, wb = 0.085 * R;
    const T0 = v(T.x - dx * 0.12 * R, T.y - dy * 0.12 * R);
    const sl0 = v(T0.x + px * wt / 2, T0.y + py * wt / 2), sr0 = v(T0.x - px * wt / 2, T0.y - py * wt / 2);
    const sl1 = v(Sx.x + px * wb / 2, Sx.y + py * wb / 2), sr1 = v(Sx.x - px * wb / 2, Sx.y - py * wb / 2);
    const rb = 0.15 * R, B = at(O, R - rb, a0 + 5);
    const rd = 0.19 * R;
    return {
      ink: [band(O, R, I, ri, a0, a1), disc(B, rb), poly(sl0, sl1, sr1, sr0), disc(D, rd)],
      guides: [
        H(O.y, O.x - R - 260, O.x + R + 260),
        Vt(O.x, O.y - R - 200, D.y + rd + 200),
        C(O, R, 200),
        C(I, ri, 200),
        L(O, E),
        C(B, rb, 180),
        L(sl0, sl1, 260),
        L(sr0, sr1, 260),
        H(Sx.y, O.x - R - 260, O.x + R + 260),
        C(D, rd, -90),
        L(Sx, D),
      ],
      marks: [I, B, T],
      from: O,
      hp: [O, E, S, D],
    };
  },
};

/* ---------- Shared parts of the capitals: cap height 1000, baseline 1000 ---------- */

const SW = 150, HR = 22;

/** R, D and P share a bowl: the outer circle and an inner one pushed left, so the right side is heavy. */
function bowl(Cc: V, r: number, tb: number) {
  const I = v(Cc.x - (tb - HR), Cc.y), ri = r - HR;
  return { I, ri, d: band(Cc, r, I, ri, -90, 90) };
}

export const D_: Glyph = {
  vb: [-260, -190, 1420, 1380],
  dur: 3.2,
  pts: [v(440, 500), v(940, 500), v(90, 500)],
  build: ([Cc, E, Lp]) => {
    const r = cl(dist(Cc, E), 260, 640);
    const top = Cc.y - r, bot = Cc.y + r;
    const x0 = Math.min(Lp.x, Cc.x - SW - 20), x1 = x0 + SW;
    const b = bowl(Cc, r, 170);
    const outer = `M${f(x0 - 70)} ${f(top)}H${f(Cc.x)}A${f(r)} ${f(r)} 0 0 1 ${f(Cc.x)} ${f(bot)}H${f(x0 - 70)}V${f(bot - HR)}H${f(x0)}V${f(top + HR)}H${f(x0 - 70)}Z`;
    const counter = `M${f(x1)} ${f(top + HR)}H${f(b.I.x)}A${f(b.ri)} ${f(b.ri)} 0 0 1 ${f(b.I.x)} ${f(bot - HR)}H${f(x1)}Z`;
    return {
      ink: [outer + counter],
      guides: [
        H(top, -400, 1400), H(bot, -400, 1400),
        Vt(x0, top - 260, bot + 260), Vt(x1, top - 260, bot + 260),
        H(Cc.y, x0 - 200, Cc.x + r + 260), Vt(Cc.x, top - 220, bot + 220),
        C(Cc, r, -90), L(Cc, E), C(b.I, b.ri, -90),
      ],
      marks: [b.I, v(x0, Cc.y)],
      from: Cc,
    };
  },
};

function bowlLetter(Cc: V, E: V, F: V, tb: number) {
  const r = cl(dist(Cc, E), 160, 420);
  const top = Cc.y - r;
  const base = Math.max(F.y, Cc.y + r + 120);
  const x0 = Math.min(F.x - SW / 2, Cc.x - SW - 20), x1 = x0 + SW;
  const b = bowl(Cc, r, tb);
  const ink = [
    rect(x0, top, x1, base), rect(x0 - 64, top, x1, top + HR), rect(x0 - 84, base - HR, x1 + 84, base),
    rect(x1 - 2, top, Cc.x + 2, top + HR), rect(x1 - 2, Cc.y + r - HR, Cc.x + 2, Cc.y + r), b.d,
  ];
  const guides = [
    H(top, -400, 1400), H(base, -400, 1400),
    Vt(x0, top - 260, base + 240), Vt(x1, top - 260, base + 240),
    H(Cc.y + r, x0 - 160, Cc.x + r + 240), Vt(Cc.x, top - 220, Cc.y + r + 260),
    C(Cc, r, -90), L(Cc, E), C(b.I, b.ri, -90),
  ];
  return { r, top, base, x0, x1, b, ink, guides };
}

export const P_: Glyph = {
  vb: [-240, -190, 1340, 1380],
  dur: 3.0,
  pts: [v(455, 290), v(745, 290), v(165, 1000)],
  build: ([Cc, E, F]) => {
    const o = bowlLetter(Cc, E, F, 160);
    return { ink: o.ink, guides: o.guides, marks: [o.b.I], from: Cc };
  },
};

export const R_: Glyph = {
  vb: [-240, -190, 1340, 1380],
  dur: 3.4,
  pts: [v(440, 270), v(710, 270), v(165, 1000), v(790, 1000)],
  build: ([Cc, E, F, K]) => {
    const o = bowlLetter(Cc, E, F, 150);
    const yb = Cc.y + o.r - HR / 2;
    const base = Math.max(K.y, yb + 160);
    const Tl = v(Cc.x - 90, yb), Tr = v(Cc.x + 78, yb);
    const Bl = v(K.x - 150, base), Br = v(K.x + 22, base);
    return {
      ink: [...o.ink, poly(Tl, Bl, Br, Tr), rect(K.x - 190, base - HR, K.x + 96, base)],
      guides: [...o.guides, L(Tl, Bl, 240), L(Tr, Br, 240)],
      marks: [o.b.I, v(Cc.x, yb)],
      from: Cc,
    };
  },
};

export const J_: Glyph = {
  vb: [-200, -190, 1220, 1420],
  dur: 3.0,
  pts: [v(560, 0), v(380, 800)],
  build: ([T, O]) => {
    const x0 = T.x - SW / 2, x1 = T.x + SW / 2;
    const R = cl(x1 - O.x, 150, 520);
    const Oc = v(x1 - R, Math.max(O.y, T.y + 300));
    const tb = 0.55 * SW, ri = R - tb;
    const I = v(x0 - ri, Oc.y);
    const rb = 0.3 * R, B = at(Oc, R - rb, 154);
    return {
      ink: [
        rect(x0, T.y, x1, Oc.y + 1), rect(x0 - 84, T.y, x1 + 84, T.y + HR),
        band(Oc, R, I, ri, 0, 160), disc(B, rb),
      ],
      guides: [
        H(T.y, -400, 1400), H(1000, -400, 1400),
        Vt(x0, T.y - 260, Oc.y + R + 200), Vt(x1, T.y - 260, Oc.y + R + 200),
        H(Oc.y, Oc.x - R - 220, x1 + 260),
        C(Oc, R, 0), C(I, ri, 0), L(Oc, at(Oc, R, 45)), C(B, rb, 154),
      ],
      marks: [I, B],
      from: Oc,
    };
  },
};

/** The full stop after Join: one centre, one swing. */
export const STOP: Glyph = {
  vb: [-150, -150, 300, 300],
  dur: 1.7,
  pts: [v(0, 0), v(92, 0)],
  build: ([c, e]) => {
    const r = dist(c, e);
    return {
      ink: [disc(c, r)],
      guides: [H(0, -140, 1100), Vt(0, -900, 260), L(c, e), C(c, r, 0)],
      marks: [],
      from: c,
    };
  },
};
