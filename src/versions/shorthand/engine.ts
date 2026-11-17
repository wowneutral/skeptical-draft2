import { gsap } from '@/lib/scroll';
import { clamp, smooth, lerp, damp, isPhone } from '@/lib/utils';

export type Mode = 'fit' | 'wrap' | 'fixed';
export type Size = 'hero' | 'big' | 'xl' | 'l' | 'm' | 's' | 'mark';

type Var = { el: HTMLElement; kind: 'grow' | 'swap' | 'space'; inner: HTMLElement; sym?: HTMLElement; w0: number; w1: number; frac: number };

export type Entry = {
  root: HTMLElement;
  text: HTMLElement;
  mode: Mode;
  size: Size;
  vars: Var[];
  keeps: HTMLElement[];
  keepEm: number;
  fsShort: number;
  fsFull: number;
  capPx: number;
  W: number;
  force: () => number | null;
  user: number | null;
  hover: boolean;
  rate: number;
  p: number;
  applied: number;
  ready: boolean;
};

export const state = { hold: false, flow: false, suppress: false, listeners: new Set<() => void>() };
export function setFlow(v: boolean) {
  state.flow = v;
  state.listeners.forEach((f) => f());
}

const entries = new Set<Entry>();
const STAGGER = 1.35;

/** Full-state font size for wrapped lines, in px. */
function baseSize(size: Size) {
  const w = window.innerWidth;
  const phone = isPhone();
  const c = (min: number, v: number, max: number) => Math.min(max, Math.max(min, v));
  if (phone) {
    return { hero: w * 0.2, big: w * 0.16, xl: w * 0.118, l: w * 0.095, m: w * 0.078, s: 22, mark: w * 0.2 }[size];
  }
  return { hero: 200, big: 150, xl: c(44, w * 0.066, 112), l: c(34, w * 0.048, 80), m: c(26, w * 0.03, 46), s: c(20, w * 0.019, 28), mark: 120 }[size];
}
function capFor(size: Size) {
  const h = window.innerHeight;
  const phone = isPhone();
  const f = { hero: phone ? 0.42 : 0.66, big: phone ? 0.34 : 0.4, xl: phone ? 0.3 : 0.3, l: phone ? 0.22 : 0.22, m: phone ? 0.16 : 0.15, s: 0.08, mark: phone ? 0.28 : 0.34 }[size];
  return h * f;
}

function apply(e: Entry, p: number) {
  let em = e.keepEm;
  for (const v of e.vars) {
    const t = clamp(p * (1 + STAGGER) - STAGGER * v.frac);
    const s = smooth(t);
    const w = v.w0 + (v.w1 - v.w0) * s;
    em += w;
    if (v.kind !== 'space') v.el.style.width = w.toFixed(4) + 'em';
    if (v.kind === 'space') {
      v.el.style.fontSize = s.toFixed(4) + 'em';
      continue;
    }
    if (v.kind === 'grow') {
      v.inner.style.opacity = clamp(t * 3.2 - 0.1).toFixed(3);
      v.inner.style.transform = `translateY(${((1 - s) * 0.16).toFixed(3)}em)`;
    } else if (v.sym) {
      const a = clamp(t * 2.2);
      v.sym.style.opacity = (1 - a).toFixed(3);
      v.sym.style.transform = `translateY(${(-a * 0.3).toFixed(3)}em) scale(${(1 - 0.3 * a).toFixed(3)})`;
      v.inner.style.opacity = clamp(t * 2 - 0.55).toFixed(3);
      v.inner.style.transform = `translateY(${((1 - smooth(clamp(t * 1.6 - 0.3))) * 0.3).toFixed(3)}em)`;
    }
  }
  if (e.mode === 'fit') {
    const fs = Math.min(e.capPx, (e.W * 0.985) / Math.max(em, 0.5));
    e.text.style.fontSize = fs.toFixed(2) + 'px';
  } else if (e.mode === 'wrap') {
    e.text.style.fontSize = lerp(e.fsShort, e.fsFull, smooth(p)).toFixed(2) + 'px';
  }
  e.root.style.setProperty('--p', p.toFixed(3));
  e.applied = p;
}

export function measure(e: Entry) {
  const fs0 = parseFloat(getComputedStyle(e.text).fontSize) || 16;
  let keepEm = 0;
  for (const k of e.keeps) keepEm += k.getBoundingClientRect().width / fs0;
  let s = 0;
  let f = 0;
  for (const v of e.vars) {
    if (v.kind === 'space') v.el.style.fontSize = '1em';
    v.w1 = (v.kind === 'space' ? v.el : v.inner).getBoundingClientRect().width / fs0;
    v.w0 = v.sym ? v.sym.getBoundingClientRect().width / fs0 : 0;
    s += v.w0;
    f += v.w1;
  }
  e.keepEm = keepEm;
  const shortEm = keepEm + s;
  e.W = e.text.clientWidth;
  e.capPx = capFor(e.size);
  if (e.mode === 'wrap') {
    e.fsFull = baseSize(e.size);
    // the shorthand gets as big as the width allows: one line on a desk, a few on a phone
    e.fsShort = e.fsFull;
    apply(e, 0);
    const fsNow = parseFloat(e.text.style.fontSize) || fs0;
    let maxWord = 0.5;
    e.text.querySelectorAll<HTMLElement>('.u-w').forEach((w) => (maxWord = Math.max(maxWord, w.getBoundingClientRect().width / fsNow)));
    const lines = isPhone() ? 3 : 1;
    const byLines = (e.W * 0.97 * lines) / Math.max(shortEm, 0.5);
    e.fsShort = Math.max(e.fsFull, Math.min(e.capPx, byLines, (e.W * 0.97) / maxWord));
  }
  if (e.mode !== 'fixed') {
    e.root.style.removeProperty('--res');
    apply(e, 0);
    const h0 = e.text.offsetHeight;
    apply(e, 1);
    const h1 = e.text.offsetHeight;
    e.root.style.setProperty('--res', Math.ceil(Math.max(h0, h1)) + 'px');
    void f;
  }
  apply(e, e.p);
  e.ready = true;
}

let running = false;
let resizeT = 0;
function onResize() {
  clearTimeout(resizeT);
  resizeT = window.setTimeout(() => entries.forEach(measure), 140);
}

function tick(_t: number, dtMs: number) {
  const dt = Math.min(0.05, dtMs / 1000);
  const vh = window.innerHeight;
  const targets: number[] = [];
  const list = [...entries];
  for (const e of list) {
    if (!e.ready) {
      targets.push(e.p);
      continue;
    }
    const r = e.root.getBoundingClientRect();
    let sc = 0;
    if (r.bottom > -vh * 0.2 && r.top < vh * 1.2) {
      const d = Math.max(0, Math.abs(r.top + r.height / 2 - vh / 2) - r.height * 0.22);
      sc = 1 - smooth(clamp((d - vh * 0.14) / (vh * 0.24)));
    } else if (e.user !== null) e.user = null;
    let t: number;
    if (state.hold || state.flow) t = 0;
    else if (e.user !== null) t = e.user;
    else {
      const f = e.force();
      t = f === null ? sc : f;
    }
    if (e.hover && !state.hold && !state.flow) t = t > 0.5 ? 0.88 : Math.max(t, 0.14);
    targets.push(t);
  }
  list.forEach((e, i) => {
    if (!e.ready) return;
    const t = targets[i];
    e.p = Math.abs(t - e.p) < 0.0008 ? t : damp(e.p, t, state.hold ? 9 : e.rate, dt);
    if (Math.abs(e.p - e.applied) > 0.0004) apply(e, e.p);
  });
}

export function register(e: Entry) {
  entries.add(e);
  if (!running) {
    running = true;
    gsap.ticker.add(tick);
    window.addEventListener('resize', onResize);
  }
  const go = () => entries.has(e) && measure(e);
  if (document.fonts?.ready) document.fonts.ready.then(() => requestAnimationFrame(go));
  else requestAnimationFrame(go);
  return () => {
    entries.delete(e);
    if (!entries.size && running) {
      running = false;
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', onResize);
    }
  };
}

export function remeasureAll() {
  entries.forEach(measure);
}
