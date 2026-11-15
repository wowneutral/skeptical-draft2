// The ink. Every handwritten thing on the page is a job: a list of pen strokes
// in one small SVG. The writer takes due jobs in page order, tells the pen where
// the nib must be, waits for it to arrive, and draws the strokes as the nib moves.
import STROKES from './strokes.json';
import { INKS, rig, spendInk } from './rig';
import { clamp } from '@/lib/utils';

type Pt = [number, number];
type Glyphs = { w: number; asc: number; desc: number; th: number; box: number[]; strokes: number[][][] };
export const WORDS = STROKES as unknown as Record<string, Glyphs>;

export type MarkKind = 'circle' | 'underline' | 'underline2' | 'bracket' | 'fix' | 'tick' | 'arrow' | 'box' | 'tally';

export type Job = {
  id: string;
  order: number;
  kind: 'word' | 'mark';
  host: HTMLElement;
  svg: SVGSVGElement;
  /** Build or rebuild the strokes from the current layout. */
  build: () => void;
  strokes: Pt[][];
  /** Stroke width in svg units. */
  th: number;
  pad: number;
  /** Pen length on screen while writing, px. */
  pen: () => number;
  speed: number;
  /** Trigger line: the job is due once the host's top passes this fraction of the viewport. */
  at: number;
  els: { ink: SVGPathElement; sheen: SVGPathElement; a: SVGCircleElement; b: SVGCircleElement; len: number }[];
  state: 'idle' | 'queued' | 'going' | 'done';
  si: number; sd: number; phase: 'travel' | 'draw' | 'hop'; t: number; hop: { from: Pt; to: Pt; dur: number };
  hold?: boolean;
};

const NS = 'http://www.w3.org/2000/svg';
const plen = (s: Pt[]) => { let L = 0; for (let i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return L; };

function pathD(s: Pt[]) {
  if (s.length === 1) return `M${s[0][0]} ${s[0][1]}l0.01 0`;
  if (s.length === 2) return `M${s[0][0]} ${s[0][1]}L${s[1][0]} ${s[1][1]}`;
  let d = `M${s[0][0].toFixed(1)} ${s[0][1].toFixed(1)}`;
  for (let i = 1; i < s.length - 1; i++) {
    const mx = (s[i][0] + s[i + 1][0]) / 2, my = (s[i][1] + s[i + 1][1]) / 2;
    d += `Q${s[i][0].toFixed(1)} ${s[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const e = s[s.length - 1];
  return d + `L${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
}

function pointAt(s: Pt[], d: number): Pt {
  for (let i = 1; i < s.length; i++) {
    const l = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
    if (d <= l || i === s.length - 1) { const t = l ? clamp(d / l) : 1; return [s[i - 1][0] + (s[i][0] - s[i - 1][0]) * t, s[i - 1][1] + (s[i][1] - s[i - 1][1]) * t]; }
    d -= l;
  }
  return s[s.length - 1];
}

/** Put the strokes into the svg as paths, all undrawn. */
export function paint(job: Job) {
  const svg = job.svg;
  svg.querySelectorAll('g.st, g.gd').forEach((g) => g.remove());
  const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'st');
  if (job.kind === 'word') {
    // Pencil guides under the ink, the way you rough a heading in before inking it.
    const gd = document.createElementNS(NS, 'g'); gd.setAttribute('class', 'gd');
    for (const s of job.strokes) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', pathD(s)); p.style.strokeWidth = String(job.th * 0.3); gd.append(p); }
    svg.append(gd);
  }
  job.els = job.strokes.map((s) => {
    const len = Math.max(0.01, plen(s));
    const ink = document.createElementNS(NS, 'path'), sheen = document.createElementNS(NS, 'path');
    const d = pathD(s);
    ink.setAttribute('d', d); sheen.setAttribute('d', d);
    ink.setAttribute('class', 'ik'); sheen.setAttribute('class', 'sh');
    for (const p of [ink, sheen]) { p.setAttribute('pathLength', String(len)); p.style.strokeDasharray = `${len} ${len + 1}`; p.style.strokeDashoffset = String(len); }
    ink.style.strokeWidth = String(job.th); sheen.style.strokeWidth = String(job.th * 0.2);
    sheen.setAttribute('transform', `translate(${-job.th * 0.14} ${-job.th * 0.16})`);
    const a = document.createElementNS(NS, 'circle'), b = document.createElementNS(NS, 'circle');
    a.setAttribute('cx', String(s[0][0])); a.setAttribute('cy', String(s[0][1])); a.setAttribute('r', String(job.th * 0.6));
    b.setAttribute('cx', String(s[s.length - 1][0])); b.setAttribute('cy', String(s[s.length - 1][1])); b.setAttribute('r', String(job.th * 0.56));
    a.setAttribute('class', 'pool'); b.setAttribute('class', 'pool');
    g.append(ink, a, b, sheen);
    return { ink, sheen, a, b, len };
  });
  svg.append(g);
}

function setDrawn(job: Job, i: number, d: number) {
  const e = job.els[i]; if (!e) return;
  const off = String(Math.max(0, e.len - d));
  e.ink.style.strokeDashoffset = off; e.sheen.style.strokeDashoffset = off;
  if (d > 0) e.a.classList.add('on');
  if (d >= e.len) e.b.classList.add('on');
}

export function finish(job: Job) {
  job.els.forEach((_, i) => setDrawn(job, i, 1e9));
  if (job.state !== 'done') {
    if (!job.svg.style.getPropertyValue('--ink')) tint(job);
    job.state = 'done';
  }
  job.svg.classList.add('dry');
}

function tint(job: Job) {
  const k = INKS[rig.ink];
  job.svg.style.setProperty('--ink', k.c); job.svg.style.setProperty('--ink-dry', k.dry);
}

/** svg units to screen px. */
function toScreen(job: Job, p: Pt): Pt {
  const r = job.svg.getBoundingClientRect(), vb = job.svg.viewBox.baseVal;
  const k = vb.width ? r.width / vb.width : 1;
  return [r.left + (p[0] - vb.x) * k, r.top + (p[1] - vb.y) * k];
}
function unitPx(job: Job) { const r = job.svg.getBoundingClientRect(), vb = job.svg.viewBox.baseVal; return vb.width ? r.width / vb.width : 1; }

/* ───────────────────────── the writer ───────────────────────── */

export const writer = {
  jobs: [] as Job[],
  queue: [] as Job[],
  enabled: false,
  instant: false,
  onWrite: (_down: boolean) => {},
  add(job: Job) { this.jobs.push(job); this.jobs.sort((a, b) => a.order - b.order); job.build(); paint(job); if (this.instant) finish(job); },
  remove(job: Job) { this.jobs = this.jobs.filter((j) => j !== job); this.queue = this.queue.filter((j) => j !== job); },
  rebuild(job: Job) {
    job.build(); paint(job);
    if (job.state === 'done') finish(job);
    else if (job.state === 'going') { job.si = 0; job.sd = 0; job.phase = 'travel'; job.t = 0; rig.arrived = false; }
  },
  tick(dt: number) {
    const H = window.innerHeight;
    if (this.instant) { for (const j of this.jobs) if (j.state !== 'done') finish(j); return; }
    for (const j of this.jobs) {
      if (j.state === 'done' || j.hold) continue;
      const r = j.host.getBoundingClientRect();
      const gone = r.bottom < -40 || r.top > H + 40;
      if (j.state === 'idle' && this.enabled && !gone && r.top < H * j.at && r.bottom > H * 0.06) { j.state = 'queued'; this.queue.push(j); this.queue.sort((a, b) => a.order - b.order); }
      // Scrolled past before the pen got to it: the words are written anyway.
      else if ((j.state === 'queued' || j.state === 'going') && gone) { finish(j); this.queue = this.queue.filter((x) => x !== j); if (this.queue[0] !== j) rig.arrived = false; }
      else if (j.state === 'idle' && this.enabled && r.bottom < 0) finish(j);
    }
    const job = this.queue[0];
    if (!job) { rig.writing = false; this.onWrite(false); return; }
    if (rig.want === 'draw') return;
    rig.writing = true;
    if (job.state === 'queued') {
      job.state = 'going'; job.si = 0; job.sd = 0; job.phase = 'travel'; job.t = 0; rig.arrived = false;
      tint(job);
    }
    const hurry = this.queue.length > 1 ? 1.9 : 1;
    const len = job.pen();
    if (job.phase === 'travel') {
      job.t += dt;
      const s = job.strokes[0]; if (!s) { this.done(job); return; }
      const p = toScreen(job, s[0]);
      Object.assign(rig.nib, { x: p[0], y: p[1], lift: 26, len });
      if (rig.arrived || !rig.webgl || job.t > 2.2) { job.phase = 'draw'; job.t = 0; }
      this.onWrite(false);
      return;
    }
    // Spend this frame's time: strokes and the hops between them, as many as fit, so a slow frame never slows the hand.
    const k = unitPx(job);
    let budget = dt, down = false;
    while (budget > 1e-6) {
      if (job.phase === 'hop') {
        const use = Math.min(budget, job.hop.dur - job.t);
        job.t += use; budget -= use;
        const u = clamp(job.t / job.hop.dur), e = u * u * (3 - 2 * u);
        const p = toScreen(job, [job.hop.from[0] + (job.hop.to[0] - job.hop.from[0]) * e, job.hop.from[1] + (job.hop.to[1] - job.hop.from[1]) * e]);
        const dist = Math.hypot(job.hop.to[0] - job.hop.from[0], job.hop.to[1] - job.hop.from[1]) * k;
        Object.assign(rig.nib, { x: p[0], y: p[1], lift: Math.sin(u * Math.PI) * Math.min(26, 4 + dist * 0.18), len });
        if (u >= 1) { job.phase = 'draw'; job.t = 0; }
        continue;
      }
      const s = job.strokes[job.si], e = job.els[job.si];
      const rate = (job.speed * hurry) / Math.max(0.0001, k);
      const use = Math.min(budget, (e.len - job.sd) / rate);
      budget -= use;
      const step = use * rate;
      job.sd = Math.min(e.len, job.sd + step);
      spendInk(step * k);
      setDrawn(job, job.si, job.sd);
      const p = toScreen(job, pointAt(s, job.sd));
      Object.assign(rig.nib, { x: p[0], y: p[1], lift: 0, len });
      down = true;
      if (job.sd >= e.len - 1e-6) {
        const next = job.strokes[job.si + 1];
        if (!next) { this.done(job); this.onWrite(false); return; }
        const from = s[s.length - 1], to = next[0];
        const dist = Math.hypot(to[0] - from[0], to[1] - from[1]) * k;
        job.hop = { from, to, dur: clamp(dist / 3600, 0.035, 0.13) / hurry };
        job.si++; job.sd = 0; job.phase = 'hop'; job.t = 0; down = false;
      }
    }
    this.onWrite(down);
  },
  done(job: Job) {
    finish(job);
    this.queue.shift();
    rig.nib.lift = 60;
    if (this.queue[0]) rig.arrived = false;
  },
};

/* ───────────────────────── shapes for the marks ───────────────────────── */

function rand(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

/** Strokes for a mark around a box of w by h px, in px with the box at (0,0). */
export function markStrokes(kind: MarkKind, w: number, h: number, seed: string): Pt[][] {
  const r = rand(seed), j = (a: number) => (r() - 0.5) * a;
  const line = (x0: number, y0: number, x1: number, y1: number, n = 10, wave = 1.6): Pt[] =>
    Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI * 2 + r()) * wave * (i && i < n ? 1 : 0)] as Pt; });
  switch (kind) {
    case 'circle': {
      const cx = w / 2, cy = h / 2, rx = w / 2 + 16 + j(4), ry = h / 2 + 12 + j(4), a0 = -2.5 + j(0.3), turn = Math.PI * 2 * 1.1, rot = -0.05 + j(0.04);
      const pts: Pt[] = [];
      for (let i = 0; i <= 64; i++) {
        const t = i / 64, a = a0 + t * turn, g = 1 + 0.035 * Math.sin(a * 3 + 1.3) + t * 0.05;
        const x = Math.cos(a) * rx * g, y = Math.sin(a) * ry * g;
        pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
      }
      return [pts];
    }
    case 'underline': return [line(-4, h + 5 + j(2), w + 8, h + 2 + j(3), 14, 1.4)];
    case 'underline2': return [line(-4, h + 4 + j(2), w + 8, h + 2 + j(2), 14, 1.2), line(8, h + 12 + j(2), w - 6, h + 10 + j(2), 12, 1.2)];
    case 'bracket': {
      const x = -26, pts: Pt[] = [];
      const ctrl: Pt[] = [[x + 14, 2], [x + 2, 10], [x + 1, h * 0.25], [x, h / 2 - 16], [x - 12, h / 2], [x, h / 2 + 16], [x + 1, h * 0.75], [x + 2, h - 10], [x + 14, h - 2]];
      for (let i = 0; i < ctrl.length - 1; i++) for (let k = 0; k < 6; k++) { const t = k / 6, a = ctrl[i], b = ctrl[i + 1]; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
      pts.push(ctrl[ctrl.length - 1]);
      return [pts];
    }
    case 'fix': {
      // "public" struck through twice, then "private" written above it.
      const word = WORDS['private'];
      const out: Pt[][] = [line(-6, h * 0.5 + j(2), w + 6, h * 0.42 + j(2), 8, 0.8), line(-3, h * 0.66 + j(2), w + 8, h * 0.58 + j(2), 8, 0.8)];
      if (word) {
        const k = (h * 1.05) / 1000, ox = -w * 0.05, oy = -h * 0.28, rot = -0.06;
        for (const s of word.strokes) out.push(s.map(([x, y]) => { const X = x * k, Y = y * k; return [ox + X * Math.cos(rot) - Y * Math.sin(rot), oy + X * Math.sin(rot) + Y * Math.cos(rot)] as Pt; }));
      }
      return out;
    }
    case 'tick': {
      const s = Math.min(w, h);
      return [[[s * 0.05, s * 0.55], [s * 0.2, s * 0.68], [s * 0.36, s * 0.9], [s * 0.55, s * 0.55], [s * 0.78, s * 0.22], [s * 1.0, s * 0.02]]];
    }
    case 'arrow': {
      const pts: Pt[] = [];
      for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push([w * t, h * 0.15 + (h * 0.7) * t * t + Math.sin(t * Math.PI) * -h * 0.18]); }
      const e = pts[pts.length - 1], p = pts[pts.length - 3], a = Math.atan2(e[1] - p[1], e[0] - p[0]), L = 20;
      return [pts, [[e[0] + Math.cos(a + 2.5) * L, e[1] + Math.sin(a + 2.5) * L], e, [e[0] + Math.cos(a - 2.5) * L, e[1] + Math.sin(a - 2.5) * L]]];
    }
    case 'tally': {
      // Eight strokes: a gate of five, then three.
      const out: Pt[][] = [], gap = w / 9.5;
      const stroke = (x: number) => [[x + j(3), 4 + j(4)], [x + j(2), h * 0.5], [x + j(3), h - 4 + j(3)]] as Pt[];
      for (let i = 0; i < 4; i++) out.push(stroke(gap * (i + 0.4)));
      out.push([[-gap * 0.1, h * 0.72], [gap * 2, h * 0.5 + j(3)], [gap * 4.2, h * 0.24]]);
      for (let i = 0; i < 3; i++) out.push(stroke(gap * (i + 5.6)));
      return out;
    }
    case 'box': {
      const o = 10;
      return [line(-o, -2, w + o, 2 + j(3), 16, 1.2).concat(line(w + 2, -o, w - 2, h + o, 10, 1.2).slice(1)), line(w + o, h + 1, -o, h - 2, 16, 1.2).concat(line(-2, h + o, 2, -o, 10, 1.2).slice(1))];
    }
  }
}
