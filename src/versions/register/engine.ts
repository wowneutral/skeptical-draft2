// The press. Every sheet on the page has two plates: black and red.
// Each sheet keeps a spring for its own offset (which the register marks follow)
// and each unit of display type keeps a spring for the pointer's drag.
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';

type Unit = {
  el: HTMLElement;
  k: HTMLElement | null;
  r: HTMLElement | null;
  px: number; // page centre
  py: number;
  x: number; y: number; vx: number; vy: number;
  last: string;
};
export type Mode = 'scroll' | 'hero' | 'fixed';
type Sheet = {
  el: HTMLElement;
  mode: Mode;
  units: Unit[];
  marks: { k: HTMLElement; r: HTMLElement }[];
  fs: number;
  bx: number; by: number; // this run's misregistration
  sx: number; sy: number; vx: number; vy: number;
  locked: boolean;
  last: string;
};

const sheets = new Set<Sheet>();
const ptr = { x: -9999, y: -9999, vx: 0, vy: 0, on: false, t: 0 };
let running = false;
let run = 0;

function rand(seed: number) {
  const s = Math.sin(seed * 12.9898 + run * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function setBase(s: Sheet, i: number) {
  const ang = rand(i + 1) * Math.PI * 2;
  const mag = Math.min(18, Math.max(3, s.fs * (s.mode === 'hero' ? 0.05 : s.fs < 110 ? 0.055 : 0.07))) * (0.8 + rand(i + 7) * 0.5);
  s.bx = Math.cos(ang) * mag;
  s.by = Math.sin(ang) * mag * 0.7;
}

function measure(s: Sheet) {
  const sy = window.scrollY;
  const cs = getComputedStyle(s.el.querySelector('.ty') || s.el);
  s.fs = parseFloat(cs.fontSize) || 60;
  for (const u of s.units) {
    const r = u.el.getBoundingClientRect();
    u.px = r.left + r.width / 2;
    u.py = r.top + r.height / 2 + sy;
  }
}

export function measureAll() {
  sheets.forEach(measure);
}

export function addSheet(el: HTMLElement, mode: Mode) {
  const units: Unit[] = Array.from(el.querySelectorAll<HTMLElement>('.u')).map((u) => ({
    el: u,
    k: u.querySelector<HTMLElement>('.k'),
    r: u.querySelector<HTMLElement>('.r'),
    px: 0, py: 0, x: 0, y: 0, vx: 0, vy: 0, last: '',
  }));
  const marks = Array.from(el.querySelectorAll<HTMLElement>('.rm')).map((m) => ({
    k: m.querySelector<HTMLElement>('.rk')!,
    r: m.querySelector<HTMLElement>('.rr')!,
  }));
  const s: Sheet = { el, mode, units, marks, fs: 60, bx: 0, by: 0, sx: 0, sy: 0, vx: 0, vy: 0, locked: false, last: '' };
  measure(s);
  const i = sheets.size;
  setBase(s, i);
  // the press starts: plates arrive far apart
  if (mode !== 'fixed') {
    s.sx = s.bx * 3.2;
    s.sy = s.by * 3.2;
  }
  sheets.add(s);
  start();
  return () => {
    sheets.delete(s);
  };
}

/** Run another sheet: every plate gets a new offset and settles again. */
export function reprint() {
  run += 1;
  let i = 0;
  sheets.forEach((s) => {
    if (s.mode === 'fixed') return;
    setBase(s, i++);
    s.sx += s.bx * 2.6;
    s.sy += s.by * 2.6;
    s.vx += s.bx * 30;
    s.vy += s.by * 30;
    s.locked = false;
  });
}

function onMove(e: PointerEvent) {
  const now = performance.now();
  if (ptr.on) {
    const dt = Math.max(8, now - ptr.t);
    const vx = ((e.clientX - ptr.x) / dt) * 16;
    const vy = ((e.clientY - ptr.y) / dt) * 16;
    ptr.vx = ptr.vx * 0.6 + vx * 0.4;
    ptr.vy = ptr.vy * 0.6 + vy * 0.4;
  }
  ptr.x = e.clientX;
  ptr.y = e.clientY;
  ptr.t = now;
  ptr.on = true;
}
function onLeave() {
  ptr.on = false;
}
function onUp(e: PointerEvent) {
  if (e.pointerType !== 'mouse') ptr.on = false;
}

function tick(_t: number, dtMs: number) {
  const dt = Math.min(0.033, (dtMs || 16) / 1000);
  const vh = window.innerHeight;
  const scy = window.scrollY;
  ptr.vx *= 0.9;
  ptr.vy *= 0.9;
  sheets.forEach((s) => {
    const rect = s.el.getBoundingClientRect();
    if (rect.bottom < -200 || rect.top > vh + 200) return;

    // where the sheet should sit
    let tx = 0;
    let ty = 0;
    if (s.mode === 'hero') {
      const f = Math.max(0, 1 - scy / (vh * 0.3));
      tx = s.bx * f;
      ty = s.by * f;
    } else if (s.mode === 'scroll') {
      const c = rect.top + Math.min(rect.height, vh) / 2;
      const d = Math.abs(c - vh * 0.5) / (vh * 0.5);
      if (s.locked && d > 0.62) s.locked = false;
      else if (!s.locked && d < 0.46) s.locked = true;
      if (!s.locked) {
        const k = Math.min(1.5, 0.75 + (d - 0.46) * 1.1);
        tx = s.bx * k;
        ty = s.by * k;
      }
    }
    // underdamped: a small authored settle
    const K = 230;
    const C = 15;
    s.vx += (K * (tx - s.sx) - C * s.vx) * dt;
    s.vy += (K * (ty - s.sy) - C * s.vy) * dt;
    s.sx += s.vx * dt;
    s.sy += s.vy * dt;

    const key = s.sx.toFixed(2) + ',' + s.sy.toFixed(2);
    if (key !== s.last) {
      s.last = key;
      const rk = `translate3d(${(-s.sx * 0.35).toFixed(2)}px,${(-s.sy * 0.35).toFixed(2)}px,0)`;
      const rr = `translate3d(${(s.sx * 0.65).toFixed(2)}px,${(s.sy * 0.65).toFixed(2)}px,0)`;
      for (const m of s.marks) {
        m.k.style.transform = rk;
        m.r.style.transform = rr;
      }
    }
    s.el.classList.toggle('is-in', Math.abs(s.sx) < 0.4 && Math.abs(s.sy) < 0.4);

    // the hand on the sheet
    const near = s.mode !== 'fixed' && ptr.on && ptr.y > rect.top - s.fs && ptr.y < rect.bottom + s.fs;
    const sig = s.fs * 0.85;
    const A = s.fs * 0.11;
    const cap = s.fs * 0.3;
    for (const u of s.units) {
      let px = 0;
      let py = 0;
      if (near) {
        const dx = u.px - ptr.x;
        const dy = u.py - scy - ptr.y;
        const d2 = dx * dx + dy * dy;
        const w = Math.exp(-d2 / (2 * sig * sig));
        if (w > 0.01) {
          const d = Math.sqrt(d2) || 1;
          px = ((dx / d) * A + ptr.vx * 0.9) * w;
          py = ((dy / d) * A * 0.6 + ptr.vy * 0.9) * w;
          const m = Math.hypot(px, py);
          if (m > cap) {
            px *= cap / m;
            py *= cap / m;
          }
        }
      }
      u.vx += (160 * (px - u.x) - 11 * u.vx) * dt;
      u.vy += (160 * (py - u.y) - 11 * u.vy) * dt;
      u.x += u.vx * dt;
      u.y += u.vy * dt;
      const ox = s.sx + u.x;
      const oy = s.sy + u.y;
      const key2 = ox.toFixed(2) + ',' + oy.toFixed(2);
      if (key2 === u.last) continue;
      u.last = key2;
      if (u.k) u.k.style.transform = `translate3d(${(-ox * 0.35).toFixed(2)}px,${(-oy * 0.35).toFixed(2)}px,0)`;
      if (u.r) u.r.style.transform = `translate3d(${(ox * 0.65).toFixed(2)}px,${(oy * 0.65).toFixed(2)}px,0)`;
    }
  });
}

function start() {
  if (running || still || typeof window === 'undefined') return;
  running = true;
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('pointercancel', onLeave, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);
  gsap.ticker.add(tick);
}

export function stop() {
  if (!running) return;
  running = false;
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerdown', onMove);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('pointercancel', onLeave);
  document.documentElement.removeEventListener('pointerleave', onLeave);
  window.removeEventListener('blur', onLeave);
  gsap.ticker.remove(tick);
}
