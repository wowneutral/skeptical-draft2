// The marks. Every pair of quotation marks on the page is a small physical body:
// hung on a line it springs to its socket, pulled off it is thrown and falls to
// the floor of its section, dropped on a line it doubts that line again.
import { still, clamp } from '@/lib/utils';

export const COMMA = 'M88 44 C88 104 58 142 8 162 L6.5 159.6 C44 136 62 108 65.5 80.5 A40 40 0 1 1 88 44 Z';
// A pair spans x 6..200, y 4..162 (198 by 158). Height is the reference size.
const RATIO = 198 / 158;

type Mode = 'doubt' | 'locked' | 'final' | 'refuse';
type State = 'hung' | 'drag' | 'tether' | 'free' | 'stop' | 'gone';

interface Claim {
  el: HTMLElement;
  mode: Mode;
  sockets: [HTMLElement, HTMLElement] | null;
  words: HTMLElement[];
  stopEl: HTMLElement | null;
  believed: boolean;
  pair: Mark[] | null;
  seen: boolean;
  hover: boolean;
  sec: number;
  wave: number[];
}

interface Mark {
  el: HTMLElement;
  open: boolean;
  x: number; y: number; vx: number; vy: number; a: number; va: number; s: number;
  state: State;
  claim: Claim | null;
  partner: Mark;
  sec: number;
  restA: number;
  gx: number; gy: number;
  lastPx: number; lastPy: number; t: number;
  passed: boolean;
  from: Claim | null;
  written: string;
  shown: boolean;
}

function svg(open: boolean) {
  const g = open
    ? `<g transform="rotate(180 103 83)"><path d="${COMMA}"/><path d="${COMMA}" transform="translate(112 0)"/></g>`
    : `<path d="${COMMA}"/><path d="${COMMA}" transform="translate(112 0)"/>`;
  return `<svg viewBox="4 4 198 158" aria-hidden="true" focusable="false">${g}</svg>`;
}

export class Marks {
  root: HTMLElement;
  layer: HTMLElement;
  claims: Claim[] = [];
  marks: Mark[] = [];
  secs: HTMLElement[] = [];
  floors: { top: number; bottom: number; left: number; right: number }[] = [];
  px = -9999; py = -9999; pcx = -9999; pcy = -9999;
  ox = 0; oy = 0;
  raf = 0; last = 0;
  io: IntersectionObserver;
  off: (() => void)[] = [];
  dragging: Mark | null = null;
  pad = 18;

  constructor(root: HTMLElement, layer: HTMLElement) {
    this.root = root;
    this.layer = layer;
    this.secs = Array.from(root.querySelectorAll<HTMLElement>('[data-sec]'));
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-claim]'));
    this.io = new IntersectionObserver((es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        const c = this.claims.find((x) => x.el === e.target);
        if (c && !c.seen) { c.seen = true; c.pair?.forEach((m) => this.reveal(m)); }
        this.io.unobserve(e.target);
      }
    }, { threshold: 0.35 });
    for (const el of els) {
      const mode = el.dataset.claim as Mode;
      const so = el.querySelector<HTMLElement>('.sk-o');
      const sc = el.querySelector<HTMLElement>('.sk-c');
      const c: Claim = {
        el, mode,
        sockets: so && sc ? [so, sc] : null,
        words: Array.from(el.querySelectorAll<HTMLElement>('.w')),
        stopEl: el.querySelector<HTMLElement>('.stop'),
        believed: mode === 'refuse', pair: null, seen: still, hover: false,
        sec: this.secs.findIndex((s) => s.contains(el)), wave: [],
      };
      this.claims.push(c);
      if (c.sockets) {
        const pair = this.makePair(c);
        c.pair = pair;
        if (!still) this.io.observe(el);
      }
      if (mode !== 'refuse') this.bindClaim(c);
      el.dataset.b = c.believed ? '1' : '0';
    }
    const move = (e: PointerEvent) => { this.pcx = e.clientX; this.pcy = e.clientY; };
    const leave = () => { this.pcx = -9999; this.pcy = -9999; };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    this.off.push(() => window.removeEventListener('pointermove', move));
    this.off.push(() => document.removeEventListener('pointerleave', leave));
    this.measure();
    for (const m of this.marks) this.placeAtSocket(m, true);
    this.last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(1 / 30, (t - this.last) / 1000);
      this.last = t;
      this.step(dt);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.io.disconnect();
    this.off.forEach((f) => f());
    this.claims.forEach((c) => c.wave.forEach((id) => clearTimeout(id)));
    this.layer.innerHTML = '';
  }

  makePair(c: Claim): Mark[] {
    const mk = (open: boolean): Mark => {
      const el = document.createElement('div');
      el.className = 'q-m' + (open ? ' is-o' : ' is-c') + (c.mode === 'locked' ? ' is-locked' : '');
      el.innerHTML = svg(open);
      this.layer.appendChild(el);
      const m = { el, open, x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, s: 40, state: 'hung', claim: c, sec: c.sec, restA: 0, gx: 0, gy: 0, lastPx: 0, lastPy: 0, t: 0, passed: false, from: null, written: '', shown: still } as unknown as Mark;
      if (still) el.classList.add('is-shown');
      this.bindMark(m);
      this.marks.push(m);
      return m;
    };
    const o = mk(true), cl = mk(false);
    o.partner = cl; cl.partner = o;
    return [o, cl];
  }

  reveal(m: Mark) {
    if (m.shown) return;
    m.shown = true;
    m.el.classList.add('is-shown');
    // Drop in from above with a little spin, so the spring has something to settle.
    m.y -= m.s * 1.1; m.vy = 0; m.a = m.open ? -24 : 18; m.va = 0;
  }

  measure() {
    const r = this.root.getBoundingClientRect();
    this.ox = r.left; this.oy = r.top;
    this.floors = this.secs.map((s) => {
      const b = s.getBoundingClientRect();
      return { top: b.top - r.top, bottom: b.bottom - r.top, left: 0, right: r.width };
    });
    this.px = this.pcx - this.ox; this.py = this.pcy - this.oy;
    this.pad = window.innerWidth < 700 ? 84 : 18;
  }

  socket(m: Mark) {
    const c = m.claim!;
    const s = c.sockets![m.open ? 0 : 1].getBoundingClientRect();
    const h = s.height || 40;
    return { x: s.left - this.ox + (h * RATIO) / 2, y: s.top - this.oy + h / 2, s: h };
  }

  placeAtSocket(m: Mark, hidden: boolean) {
    if (!m.claim) return;
    const t = this.socket(m);
    m.x = t.x; m.y = t.y; m.s = t.s; m.vx = m.vy = m.va = 0; m.a = 0;
    if (hidden && !m.shown) { m.y -= t.s * 1.1; }
  }

  // Claims: tap or Enter.
  bindClaim(c: Claim) {
    const act = () => this.act(c);
    const key = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } };
    const en = () => { c.hover = true; };
    const lv = () => { c.hover = false; };
    c.el.addEventListener('click', act);
    c.el.addEventListener('keydown', key);
    c.el.addEventListener('pointerenter', en);
    c.el.addEventListener('pointerleave', lv);
    this.off.push(() => { c.el.removeEventListener('click', act); c.el.removeEventListener('keydown', key); c.el.removeEventListener('pointerenter', en); c.el.removeEventListener('pointerleave', lv); });
  }

  act(c: Claim) {
    if (c.mode === 'locked') { c.pair?.forEach((m, i) => this.wobble(m, i ? 1 : -1)); return; }
    if (!c.believed) { this.believe(c, null); return; }
    if (c.mode === 'final') { if ((c as Claim & { gone?: Mark[] }).gone) this.undoStop(c); return; }
    // Already taken at its word: doubt it again with the nearest loose pair.
    const pair = this.loosePair(c);
    if (pair) this.doubt(c, pair);
  }

  loosePair(c: Claim): Mark[] | null {
    let best: Mark[] | null = null, bd = Infinity;
    const r = c.el.getBoundingClientRect();
    const cx = r.left - this.ox + r.width / 2, cy = r.top - this.oy + r.height / 2;
    for (const m of this.marks) {
      if (!m.open || (m.state !== 'free' && m.state !== 'gone' && m.state !== 'stop') || m.claim) continue;
      if (m.state === 'gone' || m.state === 'stop') continue;
      const d = Math.hypot(m.x - cx, m.y - cy);
      if (d < bd) { bd = d; best = [m, m.partner]; }
    }
    return best;
  }

  setWords(c: Claim, up: boolean) {
    c.wave.forEach((id) => clearTimeout(id));
    c.wave = [];
    c.el.dataset.b = up ? '1' : '0';
    c.el.setAttribute('aria-pressed', up ? 'true' : 'false');
    c.words.forEach((w, i) => {
      const go = () => { w.classList.toggle('up', up); w.classList.toggle('dn', !up); };
      if (still) go(); else c.wave.push(window.setTimeout(go, i * 55));
    });
  }

  believe(c: Claim, held: Mark | null) {
    if (c.believed || !c.pair) return;
    const pair = c.pair;
    c.believed = true;
    c.pair = null;
    this.setWords(c, true);
    if (c.mode === 'final') {
      for (const m of pair) { m.claim = null; m.state = 'stop'; m.t = 0; m.va = (m.open ? -1 : 1) * 260; }
      if (still) this.finishStop(c, pair);
      return;
    }
    for (const m of pair) {
      m.claim = null;
      m.sec = c.sec;
      m.restA = (Math.random() * 2 - 1) * 34 + (Math.random() < 0.25 ? 180 : 0);
      if (m === held) { m.from = c; continue; }
      m.state = 'free';
      const dir = m.open ? -1 : 1;
      m.vx = dir * (380 + Math.random() * 380);
      m.vy = -(700 + Math.random() * 380);
      m.va = dir * (240 + Math.random() * 360);
      if (still) this.rest(m);
    }
  }

  finishStop(c: Claim, pair: Mark[]) {
    for (const m of pair) { m.state = 'gone'; m.el.classList.remove('is-shown'); }
    c.stopEl?.classList.add('is-stop');
    (c as Claim & { gone?: Mark[] }).gone = pair;
  }

  doubt(c: Claim, pair: Mark[]) {
    if (!c.sockets || !c.believed) return;
    c.believed = false;
    c.pair = pair;
    for (const m of pair) { m.claim = c; m.state = 'hung'; m.passed = false; m.sec = c.sec; if (!m.shown) { m.shown = true; m.el.classList.add('is-shown'); } }
    this.setWords(c, false);
    if (still) for (const m of pair) this.placeAtSocket(m, false);
  }

  rest(m: Mark) {
    const f = this.floors[m.sec];
    if (!f) return;
    const hh = m.s * 0.42;
    m.x = clamp(m.x + m.vx * 0.35, m.s, f.right - m.s);
    m.y = f.bottom - hh - this.pad;
    m.a = m.restA; m.vx = m.vy = m.va = 0;
  }

  wobble(m: Mark, dir: number) {
    m.va += dir * 520;
    m.vy -= 160;
    m.vx += dir * 60;
    if (still) { m.va = 0; m.vy = 0; m.vx = 0; }
  }

  secAt(y: number) {
    for (let i = 0; i < this.floors.length; i++) if (y >= this.floors[i].top && y < this.floors[i].bottom) return i;
    return this.floors.length - 1;
  }

  // Marks: drag.
  bindMark(m: Mark) {
    const down = (e: PointerEvent) => {
      if (m.state === 'gone' || m.state === 'stop') return;
      e.preventDefault();
      m.el.setPointerCapture(e.pointerId);
      this.pcx = e.clientX; this.pcy = e.clientY;
      this.measure();
      m.gx = this.px - m.x; m.gy = this.py - m.y;
      m.lastPx = this.px; m.lastPy = this.py;
      m.state = m.claim && m.claim.mode === 'locked' ? 'tether' : 'drag';
      m.passed = !m.claim;
      m.from = null;
      this.dragging = m;
      m.el.classList.add('is-held');
      this.root.classList.add('is-dragging');
    };
    const up = (e: PointerEvent) => {
      if (this.dragging !== m) return;
      try { m.el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      this.dragging = null;
      m.el.classList.remove('is-held');
      this.root.classList.remove('is-dragging');
      this.root.querySelectorAll('.is-target').forEach((x) => x.classList.remove('is-target'));
      this.drop(m);
    };
    m.el.addEventListener('pointerdown', down);
    m.el.addEventListener('pointerup', up);
    m.el.addEventListener('pointercancel', up);
    this.off.push(() => { m.el.removeEventListener('pointerdown', down); m.el.removeEventListener('pointerup', up); m.el.removeEventListener('pointercancel', up); });
  }

  hit(x: number, y: number): Claim | null {
    for (const c of this.claims) {
      const r = c.el.getBoundingClientRect();
      const l = r.left - this.ox - 28, t = r.top - this.oy - 28;
      if (x > l && x < l + r.width + 56 && y > t && y < t + r.height + 56) return c;
    }
    return null;
  }

  drop(m: Mark) {
    if (m.state === 'tether') { m.state = 'hung'; m.va += (Math.random() < 0.5 ? -1 : 1) * 420; return; }
    if (m.claim && !m.passed) { m.state = 'hung'; return; }
    let c = this.hit(this.px, this.py);
    if (c && c === m.from) c = null;
    m.from = null;
    m.sec = this.secAt(m.y);
    m.state = 'free';
    m.restA = (Math.random() * 2 - 1) * 34;
    if (c && c.mode === 'refuse') {
      // The record already says why. The mark slides off it.
      const r = c.el.getBoundingClientRect();
      const mid = r.left - this.ox + r.width / 2;
      const dir = m.x < mid ? -1 : 1;
      m.vx = dir * 1300; m.vy = -260; m.va = dir * 700;
      c.el.classList.remove('is-refusing'); void c.el.offsetWidth; c.el.classList.add('is-refusing');
      if (still) this.rest(m);
      return;
    }
    if (c && (c.mode === 'doubt' || c.mode === 'final') && c.believed && c.sockets) {
      this.doubt(c, [m.open ? m : m.partner, m.open ? m.partner : m]);
      return;
    }
    if (c && c.mode === 'locked') { m.vy = -700; m.vx = (Math.random() * 2 - 1) * 500; }
    if (still) this.rest(m);
  }

  step(dt: number) {
    this.measure();
    const drag = this.dragging;
    if (drag && drag.state === 'drag' && drag.passed) {
      let c = this.hit(this.px, this.py);
      if (drag.from) { if (c !== drag.from) drag.from = null; else c = null; }
      this.root.querySelectorAll('.is-target').forEach((x) => { if (x !== c?.el) x.classList.remove('is-target'); });
      if (c && ((c.believed && c.mode !== 'refuse' && c.mode !== 'locked') || c.mode === 'refuse')) c.el.classList.add('is-target');
    }
    for (const m of this.marks) this.move(m, dt);
  }

  move(m: Mark, dt: number) {
    const k = m.state;
    if (k === 'gone') return;
    if (k === 'hung' && m.claim) {
      const t = this.socket(m);
      if (!m.shown) { m.x = t.x; m.y = t.y - t.s * 1.1; m.s = t.s; this.write(m); return; }
      let tx = t.x, ty = t.y, ta = 0;
      if (still) { m.x = tx; m.y = ty; m.s = t.s; m.a = 0; this.write(m); return; }
      const dir = m.open ? -1 : 1;
      if (m.claim.hover) {
        if (m.claim.mode === 'locked') ta = Math.sin(this.last * 0.045 + (m.open ? 0 : 2)) * 5;
        else { tx += dir * t.s * 0.08; ta = dir * 6; }
      }
      const dx = this.px - t.x, dy = this.py - t.y, d = Math.hypot(dx, dy), R = t.s * 2.2;
      if (d < R && d > 1) { const f = (1 - d / R) * t.s * 0.14; tx += (dx / d) * f; ty += (dy / d) * f; ta += (dx / d) * (1 - d / R) * 10; }
      const K = m.claim.mode === 'locked' ? 260 : 170, C = 2 * Math.sqrt(K) * 0.42;
      m.vx += (K * (tx - m.x) - C * m.vx) * dt;
      m.vy += (K * (ty - m.y) - C * m.vy) * dt;
      m.x += m.vx * dt; m.y += m.vy * dt;
      const KA = 120, CA = 2 * Math.sqrt(KA) * 0.3;
      m.va += (KA * (ta + m.vx * 0.02 - m.a) - CA * m.va) * dt;
      m.a += m.va * dt;
      m.s += (t.s - m.s) * Math.min(1, dt * 8);
    } else if (k === 'drag' || k === 'tether') {
      let tx = this.px - m.gx, ty = this.py - m.gy;
      if (k === 'tether' && m.claim) {
        const t = this.socket(m);
        const dx = tx - t.x, dy = ty - t.y, d = Math.hypot(dx, dy), R = t.s * 0.95;
        if (d > 0.01) { const nd = R * Math.tanh(d / R); tx = t.x + (dx / d) * nd; ty = t.y + (dy / d) * nd; }
      }
      const K = 700, C = 2 * Math.sqrt(K) * 0.75;
      m.vx += (K * (tx - m.x) - C * m.vx) * dt;
      m.vy += (K * (ty - m.y) - C * m.vy) * dt;
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (still) { m.x = tx; m.y = ty; m.vx = m.vy = 0; }
      const ta = clamp(m.vx * 0.035, -35, 35);
      m.va += (160 * (ta - m.a) - 12 * m.va) * dt;
      m.a += m.va * dt;
      if (still) m.a = 0;
      if (k === 'drag' && m.claim && !m.passed) {
        const t = this.socket(m);
        if (Math.hypot(m.x - t.x, m.y - t.y) > t.s * 0.75) { m.passed = true; this.believe(m.claim, m); }
      }
    } else if (k === 'free') {
      const f = this.floors[m.sec];
      if (still || !f) { this.write(m); return; }
      const hh = m.s * 0.42, floor = f.bottom - hh - this.pad;
      m.vy += 2600 * dt;
      m.x += m.vx * dt; m.y += m.vy * dt; m.a += m.va * dt;
      const L = m.s * 0.6, Rr = f.right - m.s * 0.6;
      if (m.x < L) { m.x = L; m.vx = Math.abs(m.vx) * 0.45; m.va *= -0.6; }
      if (m.x > Rr) { m.x = Rr; m.vx = -Math.abs(m.vx) * 0.45; m.va *= -0.6; }
      if (m.y > floor) {
        m.y = floor;
        if (m.vy > 140) { m.vy = -m.vy * 0.32; m.vx *= 0.72; m.va = m.va * 0.4 + (m.restA - m.a) * 2; }
        else { m.vy = 0; m.vx *= Math.pow(0.02, dt); m.va = 0; m.a += (m.restA - m.a) * Math.min(1, dt * 10); }
      }
    } else if (k === 'stop') {
      const c = this.claims.find((x) => x.mode === 'final');
      if (!c || !c.stopEl) return;
      const r = c.stopEl.getBoundingClientRect();
      const tx = r.left - this.ox + r.width / 2, ty = r.bottom - this.oy - r.height * 0.28;
      const ts = r.height * 0.5;
      m.t += dt;
      const K = 90, C = 2 * Math.sqrt(K) * 0.8;
      m.vx += (K * (tx - m.x) - C * m.vx) * dt;
      m.vy += (K * (ty - m.y) - C * m.vy) * dt - (m.t < 0.35 ? 2600 * dt : 0);
      m.x += m.vx * dt; m.y += m.vy * dt;
      m.a += m.va * dt;
      m.s += (ts - m.s) * Math.min(1, dt * 3.2);
      if (m.t > 1.1 && Math.hypot(tx - m.x, ty - m.y) < ts * 0.6) {
        if (m.open) this.finishStop(c, [m, m.partner]);
      }
    }
    this.write(m);
  }

  write(m: Mark) {
    const tr = `translate3d(${(m.x - (100 * RATIO) / 2).toFixed(1)}px,${(m.y - 50).toFixed(1)}px,0) rotate(${m.a.toFixed(2)}deg) scale(${(m.s / 100).toFixed(3)})`;
    if (tr === m.written) return;
    m.written = tr;
    m.el.style.transform = tr;
  }

  // Bring back the gone pair of the final line (Enter on it again).
  undoStop(c: Claim) {
    const g = (c as Claim & { gone?: Mark[] }).gone;
    if (!g) return;
    c.stopEl?.classList.remove('is-stop');
    (c as Claim & { gone?: Mark[] }).gone = undefined;
    const r = c.stopEl!.getBoundingClientRect();
    for (const m of g) { m.x = r.left - this.ox; m.y = r.top - this.oy; m.state = 'free'; m.el.classList.add('is-shown'); }
    this.doubt(c, g);
  }
}
