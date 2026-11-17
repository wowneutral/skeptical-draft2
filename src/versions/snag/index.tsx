import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/instrument-sans/index.css';
import './snag.css';
import { useVersion } from '@/lib/version';
import { gsap } from '@/lib/scroll';
import { still, coarse, isPhone } from '@/lib/utils';
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { MARK, UH, pour, pourCols, type Mark, type Para, type Style, type Tok } from './flow';

/* ---------- copy as positioned words ---------- */

function Words({ s }: { s: string }) {
  return (
    <>
      {s.split(/\s+/).filter(Boolean).map((w, i) => (
        <Fragment key={i}>
          <span className="tk">{w}</span>{' '}
        </Fragment>
      ))}
    </>
  );
}
function Lk({ href, children }: { href: string; children: ReactNode }) {
  return (
    <>
      <a className="tk lk" href={href}>{children}</a>{' '}
    </>
  );
}
type PP = { k: string; st: string; as?: 'p' | 'h1' | 'h2' | 'h3' | 'span'; children: ReactNode };
function P({ k, st, as = 'p', children }: PP) {
  const Tag = as;
  return (
    <Tag data-p={k} data-st={st} className={`pp s-${st}`}>
      {children}
    </Tag>
  );
}

const SECS = ['top', 'manifesto', 'record', 'drive', 'people', 'join'] as const;
type SecId = (typeof SECS)[number];

/* ---------- geometry per viewport ---------- */

type Ctx = {
  W: number; H: number; L: number; R: number; phone: boolean;
  st: Record<string, Style>;
  paras: Map<string, Para>;
};
type Home = { x: number; y: number; s: number };
type Sec = {
  id: SecId; el: HTMLElement; top: number; h: number; toks: Tok[];
  home: Home; // local to the section
  lay: (M: Mark) => number; // pours words, returns content bottom
};

const DESK: Record<SecId, (c: Ctx) => { x: number; s: number }> = {
  top: (c) => ({ x: c.W * 0.69, s: Math.min(c.H * 1.02, c.W * 0.78) }),
  manifesto: (c) => ({ x: c.W * 0.5, s: c.H * 0.36 }),
  record: (c) => ({ x: c.W * 0.5, s: c.H * 0.66 }),
  drive: (c) => ({ x: c.W * 0.5, s: Math.min(c.H * 1.12, c.W * 0.8) }),
  people: (c) => ({ x: c.W * 0.2, s: c.H * 0.86 }),
  join: (c) => ({ x: c.L + (c.R - c.L - 88) / 3 + 22 + c.H * 0.03, s: c.H * 0.56 }),
};
const PHONE: Record<SecId, (c: Ctx) => { x: number; s: number }> = {
  top: (c) => ({ x: c.W - c.H * 0.58 * 0.02, s: c.H * 0.58 }),
  manifesto: (c) => ({ x: c.H * 0.3 * 0.06, s: c.H * 0.3 }),
  record: (c) => ({ x: c.W - c.H * 0.34 * 0.08, s: c.H * 0.34 }),
  drive: (c) => ({ x: c.H * 0.42 * 0.04, s: c.H * 0.42 }),
  people: (c) => ({ x: c.W - c.H * 0.32 * 0.08, s: c.H * 0.32 }),
  join: (c) => ({ x: c.H * 0.3 * 0.06, s: c.H * 0.3 }),
};

const margin = (s: number) => 9 + s * 0.014;
const OFF: Mark = { x: 0, y: 0, s: 1, on: false };

function build(c: Ctx, id: SecId, el: HTMLElement): Sec {
  const p = (k: string) => c.paras.get(k)!;
  const list = (ks: string[]) => ks.filter((k) => c.paras.has(k)).map(p);
  const { L, R, W, H, phone } = c;
  const pad = phone ? 64 : H * 0.1;
  const place = (phone ? PHONE : DESK)[id](c);
  const sec: Sec = { id, el, top: 0, h: 0, toks: [], home: { x: place.x, y: 0, s: place.s }, lay: () => 0 };
  const half = (s: number) => s * 0.33;
  let anchor = 0;
  const mid = (L + R) / 2;

  if (id === 'top') {
    const hero = list(['name', 'h1', 'st0', 'st1', 'st2']);
    const tail = list(['doors', 'hint']);
    sec.lay = (M) => {
      let y = phone ? 40 : H * 0.05;
      y = pour(hero, { p: 0, t: 0 }, L, R, y, Infinity, M, margin(M.s), true).y;
      const home = Math.abs(M.x - place.x) < 30 && Math.abs(M.y - sec.home.y) < 30 && Math.abs(M.s - place.s) < 20;
      if (phone || !home) return pour(tail, { p: 0, t: 0 }, L, phone ? R : Math.min(R, L + 760), y + 28, Infinity, M, margin(M.s), true).y;
      const ty = pour(tail, { p: 0, t: 0 }, place.x + place.s * 0.02, R, H * 0.64, Infinity, M, margin(M.s), true).y;
      return Math.max(y, ty);
    };
    sec.home.y = phone ? H * 0.29 + place.s / 2 : H * 0.05 + place.s / 2;
  }
  if (id === 'manifesto') {
    const ps = list(['m0', 'm1', 'm2', 'm3']);
    sec.lay = (M) => pour(ps, { p: 0, t: 0 }, L, phone ? R : Math.min(R, L + 1300), pad, Infinity, M, margin(M.s), true).y;
    const h0 = sec.lay(OFF);
    sec.home.y = phone ? pad + (h0 - pad) * 0.55 : pad + (h0 - pad) * 0.62;
  }
  if (id === 'record') {
    const head = list(['h']);
    const rule = list(['rule']);
    const ev = list(['ev']);
    const r0 = list(['n0', 'r0']);
    const r1 = list(['n1', 'r1']);
    const more = list(['more']);
    sec.lay = (M) => {
      const m = margin(M.s);
      let y = pour(head, { p: 0, t: 0 }, L, R, pad, Infinity, M, m, true).y;
      y = pour(rule, { p: 0, t: 0 }, L, phone ? R : Math.min(R, L + 620), y + 18, Infinity, M, m, true).y;
      anchor = y + (phone ? 40 : 70);
      if (phone) {
        y = pour(ev, { p: 0, t: 0 }, L, R, anchor, Infinity, M, m, true).y;
        y = pour(r0, { p: 0, t: 0 }, L, R, y + 44, Infinity, M, m, true).y;
        y = pour(r1, { p: 0, t: 0 }, L, R, y + 36, Infinity, M, m, true).y;
      } else {
        const g = M.on && M.y + M.s / 2 > anchor && M.y - M.s / 2 < anchor + 400 ? Math.min(R - 300, Math.max(L + 300, M.x)) : mid;
        y = pourCols(ev, L, R, g, half(0) + 60, anchor, M, m, c.st.d3.lh);
        const a = pour(r0, { p: 0, t: 0 }, L, mid - 30, y + 70, Infinity, M, m, true).y;
        const b = pour(r1, { p: 0, t: 0 }, mid + 30, R, y + 70, Infinity, M, m, true).y;
        y = Math.max(a, b);
      }
      return pour(more, { p: 0, t: 0 }, L, R, y + 36, Infinity, M, m, true).y;
    };
    sec.lay(OFF);
    sec.home.y = anchor + place.s * (phone ? 0.42 : 0.4);
  }
  if (id === 'drive') {
    const head = list(['h', 'lead']);
    const items = DRIVE.items.flatMap((_, i) => list([`t${i}`, `x${i}`]));
    const more = list(['more']);
    sec.lay = (M) => {
      const m = margin(M.s);
      let y = pour(head.slice(0, 1), { p: 0, t: 0 }, L, R, pad, Infinity, M, m, true).y;
      y = pour(head.slice(1), { p: 0, t: 0 }, L, phone ? R : Math.min(R, L + 620), y + 18, Infinity, M, m, true).y;
      anchor = y + (phone ? 40 : 60);
      if (phone) y = pour(items, { p: 0, t: 0 }, L, R, anchor, Infinity, M, m, true).y;
      else {
        const g = M.on && M.y + M.s / 2 > anchor && M.y - M.s / 2 < anchor + 900 ? Math.min(R - 280, Math.max(L + 280, M.x)) : mid;
        y = pourCols(items, L, R, g, 80, anchor, M, m, c.st.b.lh);
      }
      return pour(more, { p: 0, t: 0 }, L, R, y + 40, Infinity, M, m, true).y;
    };
    sec.lay(OFF);
    sec.home.y = anchor + place.s * (phone ? 0.45 : 0.43);
  }
  if (id === 'people') {
    const head = list(['h']);
    const body = list(['c0', 'b0', 'c1', 'b1', 'count', 'more']);
    sec.lay = (M) => {
      const m = margin(M.s);
      const y = pour(head, { p: 0, t: 0 }, L, R, pad, Infinity, M, m, true).y;
      anchor = y + 30;
      return pour(body, { p: 0, t: 0 }, L, phone ? R : Math.min(R, W * 0.8), anchor, Infinity, M, m, true).y;
    };
    sec.lay(OFF);
    sec.home.y = anchor + place.s * (phone ? 0.5 : 0.36);
  }
  if (id === 'join') {
    const head = list(['h', 'lead']);
    const paths = JOIN.paths.map((jp) => list([`n_${jp.id}`, `l_${jp.id}`, ...jp.text.map((_, i) => `x_${jp.id}${i}`), `a_${jp.id}`]));
    const tail = list(['already', 'coach', 'also', 'discord']);
    sec.lay = (M) => {
      const m = margin(M.s);
      let y = pour(head.slice(0, 1), { p: 0, t: 0 }, L, R, pad, Infinity, M, m, true).y;
      y = pour(head.slice(1), { p: 0, t: 0 }, L, phone ? R : Math.min(R, L + 620), y + 18, Infinity, M, m, true).y;
      anchor = y + (phone ? 40 : 70);
      if (phone) {
        y = anchor;
        paths.forEach((ps, i) => {
          y = pour(ps, { p: 0, t: 0 }, L, R, y + (i ? 56 : 0), Infinity, M, m, true).y;
        });
      } else {
        const gap = 44;
        const cw = (R - L - gap * 2) / 3;
        y = Math.max(...paths.map((ps, i) => pour(ps, { p: 0, t: 0 }, L + i * (cw + gap), L + i * (cw + gap) + cw, anchor, Infinity, M, m, true).y));
      }
      return pour(tail, { p: 0, t: 0 }, L, phone ? R : Math.min(R, L + 720), y + 64, Infinity, M, m, true).y;
    };
    sec.lay(OFF);
    sec.home.y = anchor + place.s * (phone ? 0.5 : 0.7);
  }
  return sec;
}

/* ---------- the page ---------- */

export default function Snag() {
  useVersion('snag');
  const root = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLButtonElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const rootEl = root.current!;
    const mk = markRef.current!;
    const slot = slotRef.current!;
    const path = mk.querySelector('path')!;
    let alive = true;
    let secs: Sec[] = [];
    let ctx: Ctx;
    let foot: Home = { x: 0, y: 0, s: 10 };
    let footTop = 0;
    // the mark, in page coordinates
    const S = { x: 0, y: 0, s: 1, vx: 0, vy: 0, vs: 0 };
    let over: { x: number; y: number } | null = null;
    let active = -1;
    let drag: null | { gx: number; gy: number; cx: number; cy: number } = null;
    let ready = false;
    let dropped = still;
    const last = { x: NaN, y: NaN, s: NaN };

    const measure = () => {
      const W = rootEl.clientWidth;
      const H = window.innerHeight;
      const phone = isPhone();
      const L = phone ? 20 : Math.max(32, W * 0.06);
      const R = W - L;
      const fb = phone ? 17 : W > 1200 ? 19 : 18;
      const sizes: Record<string, number> = {
        h1: phone ? 44 : Math.min(150, W * 0.075),
        h: phone ? 62 : Math.min(210, W * 0.125),
        d2: phone ? 30 : Math.max(30, Math.min(66, W * 0.04)),
        d3: phone ? 32 : Math.max(30, Math.min(70, W * 0.043)),
        d4: phone ? 26 : Math.max(24, Math.min(40, W * 0.026)),
        ui: phone ? 19 : 22,
        b: fb,
      };
      // the hero headline fits the clear span beside the bowl
      const hp = (phone ? PHONE : DESK).top({ W, H, L, R, phone } as Ctx);
      const span = phone ? R - L : hp.x - hp.s * 0.33 - margin(hp.s) - L;
      rootEl.style.setProperty('--h1', sizes.h1 + 'px');
      const probe = rootEl.querySelector<HTMLElement>('[data-p="h1"]')!;
      let longest = 0;
      probe.querySelectorAll<HTMLElement>('.tk').forEach((t) => (longest = Math.max(longest, t.getBoundingClientRect().width)));
      if (longest > span * 0.96) sizes.h1 = Math.floor((sizes.h1 * span * 0.96) / longest);
      for (const k in sizes) rootEl.style.setProperty('--' + k, sizes[k] + 'px');

      const st: Record<string, Style> = {};
      const mkSt = (k: string, lh: number, min: number, gap: number, hug: boolean) => {
        const pr = document.createElement('span');
        pr.className = `tk s-${k}`;
        pr.style.visibility = 'hidden';
        pr.textContent = 'n n';
        rootEl.appendChild(pr);
        const a = pr.getBoundingClientRect().width;
        pr.textContent = 'nn';
        const b = pr.getBoundingClientRect().width;
        pr.remove();
        const z = sizes[k];
        st[k] = { size: z, lh: Math.round(z * lh), sp: Math.max(z * 0.2, a - b), min, gap: Math.round(z * gap), hug };
      };
      mkSt('h1', 0.98, 1, 0, true);
      mkSt('h', 0.92, 1, 0, true);
      mkSt('d2', 1.08, 2, 0.42, true);
      mkSt('d3', 1.04, 1, 0.3, true);
      mkSt('d4', 1.1, 1, 0.9, false);
      mkSt('ui', 2.1, 1, 0.3, false);
      st.d3.keep = true;
      st.d4.keep = true;
      mkSt('b', 1.52, 3, 0.62, false);

      const paras = new Map<string, Para>();
      ctx = { W, H, L, R, phone, st, paras };
      secs = [];
      rootEl.querySelectorAll<HTMLElement>('[data-sec]').forEach((el) => {
        const id = el.dataset.sec as SecId;
        paras.clear();
        const toks: Tok[] = [];
        el.querySelectorAll<HTMLElement>('[data-p]').forEach((pe) => {
          const s = st[pe.dataset.st!];
          const ts = Array.from(pe.querySelectorAll<HTMLElement>('.tk')).map((t) => {
            const tk: Tok = { el: t, w: t.getBoundingClientRect().width, x: 0, y: 0, px: NaN, py: NaN, shown: false };
            toks.push(tk);
            return tk;
          });
          paras.set(pe.dataset.p!, { toks: ts, st: s });
        });
        const sec = build({ ...ctx, paras: new Map(paras) }, id, el);
        sec.toks = toks;
        const hOn = sec.lay({ ...sec.home, on: true });
        const hOff = sec.lay(OFF);
        const hm = sec.home.y + sec.home.s / 2;
        sec.h = Math.ceil(Math.max(hOn, hOff, hm) + (phone ? 56 : H * 0.07));
        if (id === 'top') sec.h = Math.max(sec.h, Math.ceil(H), Math.ceil(hm + 24));
        el.style.height = sec.h + 'px';
        secs.push(sec);
      });
      let t = 0;
      secs.forEach((s) => {
        s.top = t;
        t += s.h;
      });
      // the footer slot: the mark set as a plain question mark
      const rr = rootEl.getBoundingClientRect();
      const sr = slot.getBoundingClientRect();
      const fz = parseFloat(getComputedStyle(slot).fontSize);
      const fs = fz * 0.74;
      foot = { x: sr.left - rr.left + sr.width / 2, y: sr.bottom - rr.top - fz * 0.2 - fs / 2, s: fs };
      footTop = (rootEl.querySelector('footer') as HTMLElement).offsetTop;
      last.x = NaN;
      layAll(true);
    };

    const markLocal = (sec: Sec): Mark => ({ x: S.x, y: S.y - sec.top, s: S.s, on: true });

    const apply = (sec: Sec) => {
      for (const tk of sec.toks) {
        if (tk.x !== tk.px || tk.y !== tk.py) {
          tk.el.style.transform = `translate3d(${tk.x.toFixed(1)}px,${tk.y.toFixed(1)}px,0)`;
          tk.px = tk.x;
          tk.py = tk.y;
        }
      }
    };
    const near = (sec: Sec, y: number, s: number) => y + s / 2 > sec.top - 40 && y - s / 2 < sec.top + sec.h + 40;
    let prevNear = new Set<Sec>();
    const layAll = (force: boolean) => {
      const now = new Set<Sec>();
      for (const sec of secs) {
        const hit = near(sec, S.y, S.s);
        if (force || hit || prevNear.has(sec)) {
          sec.lay(hit ? markLocal(sec) : OFF);
          apply(sec);
        }
        if (hit) now.add(sec);
      }
      prevNear = now;
    };

    const homeOf = (i: number): Home => {
      if (i >= secs.length) return foot;
      const s = secs[i];
      return { x: s.home.x, y: s.top + s.home.y, s: s.home.s };
    };
    const whichActive = () => {
      const y = window.scrollY;
      const H = window.innerHeight;
      const max = document.documentElement.scrollHeight - H;
      if (y >= max - 4 || footTop <= y + H * 0.62) return secs.length;
      let a = 0;
      secs.forEach((s, i) => {
        if (s.top <= y + H * 0.5) a = i;
      });
      return a;
    };

    const drawMark = () => {
      const k = S.s / 1000;
      const w = (MARK.w / UH) * 1000;
      mk.style.transform = `translate3d(${(S.x - (w / 2) * k).toFixed(2)}px,${(S.y - 500 * k).toFixed(2)}px,0) scale(${k.toFixed(5)})`;
    };

    let ptr = { x: 0, y: 0 };
    const tick = (_t: number, dms: number) => {
      if (!alive || !ready) return;
      const dt = Math.min(0.05, dms / 1000);
      const a = whichActive();
      if (a !== active) {
        active = a;
        if (!drag) over = null;
      }
      const h = homeOf(active);
      if (drag) over = { x: ptr.x - drag.gx * S.s, y: ptr.y + window.scrollY - drag.gy * S.s };
      const tx = over ? over.x : h.x;
      const ty = over ? over.y : h.y;
      const ts = h.s;
      if (still || !dropped) {
        if (dropped || still) {
          S.x = tx;
          S.y = ty;
          S.s = ts;
        }
      } else {
        const k = drag ? 260 : 70;
        const d = drag ? 26 : 13;
        S.vx += ((tx - S.x) * k - S.vx * d) * dt;
        S.vy += ((ty - S.y) * k - S.vy * d) * dt;
        S.vs += ((ts - S.s) * 60 - S.vs * 15) * dt;
        S.x += S.vx * dt;
        S.y += S.vy * dt;
        S.s = Math.max(4, S.s + S.vs * dt);
      }
      const moved = Math.abs(S.x - last.x) + Math.abs(S.y - last.y) + Math.abs(S.s - last.s) > 0.05;
      if (moved || last.x !== last.x) {
        last.x = S.x;
        last.y = S.y;
        last.s = S.s;
        drawMark();
        layAll(false);
      }
    };

    // drag with mouse or pen
    const docPt = (cx: number, cy: number) => ({ x: cx - rootEl.getBoundingClientRect().left, y: cy });
    const pick = (cx: number, cy: number) => {
      const p = docPt(cx, cy);
      ptr = p;
      drag = { gx: (p.x - S.x) / S.s, gy: (p.y + window.scrollY - S.y) / S.s, cx, cy };
      mk.classList.add('up');
      rootEl.classList.add('dragging');
    };
    const dropIt = () => {
      if (!drag) return;
      drag = null;
      mk.classList.remove('up', 'held');
      rootEl.classList.remove('dragging');
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      e.preventDefault();
      path.setPointerCapture(e.pointerId);
      pick(e.clientX, e.clientY);
    };
    const onMove = (e: PointerEvent) => {
      if (drag && e.pointerType !== 'touch') ptr = docPt(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') dropIt();
    };
    // touch: press and hold to pick it up, so the page still scrolls
    let hold = 0;
    let t0 = { x: 0, y: 0 };
    const onTS = (e: TouchEvent) => {
      const t = e.touches[0];
      t0 = { x: t.clientX, y: t.clientY };
      clearTimeout(hold);
      mk.classList.add('press');
      hold = window.setTimeout(() => {
        mk.classList.add('held');
        pick(t0.x, t0.y);
      }, 320);
    };
    const onTM = (e: TouchEvent) => {
      const t = e.touches[0];
      if (drag) {
        e.preventDefault();
        ptr = docPt(t.clientX, t.clientY);
      } else if (Math.hypot(t.clientX - t0.x, t.clientY - t0.y) > 9) {
        clearTimeout(hold);
        mk.classList.remove('press');
      }
    };
    const onTE = () => {
      clearTimeout(hold);
      mk.classList.remove('press');
      dropIt();
    };
    const onKey = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 120 : 32;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      const b = over ?? homeOf(active);
      over = { x: Math.max(0, Math.min(ctx.W, b.x + d[0])), y: b.y + d[1] };
    };
    const noMenu = (e: Event) => e.preventDefault();

    path.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    path.addEventListener('touchstart', onTS, { passive: true });
    path.addEventListener('touchmove', onTM, { passive: false });
    path.addEventListener('touchend', onTE);
    path.addEventListener('touchcancel', onTE);
    path.addEventListener('contextmenu', noMenu);
    mk.addEventListener('keydown', onKey);
    gsap.ticker.add(tick);

    let rz = 0;
    let lastW = window.innerWidth;
    const onResize = () => {
      if (coarse && window.innerWidth === lastW) return; // phone toolbars
      lastW = window.innerWidth;
      clearTimeout(rz);
      rz = window.setTimeout(() => {
        measure();
        last.x = NaN;
      }, 160);
    };
    window.addEventListener('resize', onResize);

    (async () => {
      try {
        await Promise.all([
          document.fonts.load('900 100px "Bodoni Moda Variable"'),
          document.fonts.load('italic 600 40px "Bodoni Moda Variable"'),
          document.fonts.load('400 20px "Instrument Sans Variable"'),
          document.fonts.load('600 20px "Instrument Sans Variable"'),
        ]);
        await document.fonts.ready;
      } catch {
        /* fall back to whatever loaded */
      }
      if (!alive) return;
      measure();
      active = whichActive();
      const h = homeOf(active);
      S.x = h.x;
      S.s = h.s;
      S.y = still || active !== 0 ? h.y : -h.s * 0.7;
      drawMark();
      layAll(true);
      rootEl.classList.add('ready');
      ready = true;
      if (!still) window.setTimeout(() => (dropped = true), 450);
    })();

    return () => {
      alive = false;
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      clearTimeout(hold);
      clearTimeout(rz);
    };
  }, []);

  const hint = coarse ? 'Press and hold the question mark to move it.' : 'Pick up the question mark. Put it anywhere.';

  return (
    <div className="v-snag" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <button ref={markRef} className="mk" type="button" aria-label="The question mark. Arrow keys move it.">
        <svg viewBox={`${-MARK.w / 2} ${-UH / 2} ${MARK.w} ${UH}`} width={(MARK.w / UH) * 1000} height={1000} aria-hidden="true" focusable="false">
          <path d={MARK.d} />
        </svg>
      </button>
      <main id="main">
        <section data-sec="top" className="sec" aria-label="Skeptical">
          <P k="name" st="ui"><span className="tk mast">Skeptical</span></P>
          <P k="h1" st="h1" as="h1"><Words s={HERO.pitch.join(' ')} /></P>
          {HERO.statement.map((s, i) => (
            <P key={i} k={`st${i}`} st="d2"><Words s={s} /></P>
          ))}
          <P k="doors" st="ui">
            <Lk href={HERO.doors[0].href}>{HERO.doors[0].label}</Lk>
            <span className="tk dim">or</span>{' '}
            <Lk href={HERO.doors[1].href}>{HERO.doors[1].label}</Lk>
          </P>
          <P k="hint" st="b"><Words s={hint} /></P>
        </section>

        <section data-sec="manifesto" className="sec" aria-label="What we are">
          {MANIFESTO.map((m, i) => (
            <P key={i} k={`m${i}`} st="d2"><Words s={m} /></P>
          ))}
        </section>

        <section data-sec="record" id="record" className="sec">
          <P k="h" st="h" as="h2"><Words s={RECORD.title} /></P>
          <P k="rule" st="b"><Words s={RECORD.rule} /></P>
          <P k="ev" st="d3"><Words s={`${RECORD.when}. ${RECORD.name}. ${RECORD.where}.`} /></P>
          {RECORD.results.map((r, i) => (
            <Fragment key={i}>
              <P k={`n${i}`} st="d3" as="h3"><Words s={`${r.who}`} /></P>
              <P k={`r${i}`} st="b"><span className="tk em">{r.what}.</span>{' '}<Words s={r.more} /></P>
            </Fragment>
          ))}
          <P k="more" st="b"><Lk href={RECORD.more.href}>{RECORD.more.label}</Lk></P>
        </section>

        <section data-sec="drive" id="drive" className="sec">
          <P k="h" st="h" as="h2"><Words s={DRIVE.title} /></P>
          <P k="lead" st="b"><Words s={DRIVE.lead} /></P>
          {DRIVE.items.map((d, i) => (
            <Fragment key={i}>
              <P k={`t${i}`} st="d4" as="h3"><Words s={d.term} /></P>
              <P k={`x${i}`} st="b"><Words s={d.text} /></P>
            </Fragment>
          ))}
          <P k="more" st="b"><Lk href={DRIVE.more.href}>{DRIVE.more.label}</Lk></P>
        </section>

        <section data-sec="people" id="people" className="sec">
          <P k="h" st="h" as="h2"><Words s={PEOPLE.title} /></P>
          {PEOPLE.coaches.map((c, i) => (
            <Fragment key={i}>
              <P k={`c${i}`} st="d3" as="h3"><Words s={c.name} /></P>
              <P k={`b${i}`} st="b"><span className="tk em">{c.role}.</span>{' '}<Words s={c.bio} /></P>
            </Fragment>
          ))}
          <P k="count" st="d2"><Words s={PEOPLE.count} /></P>
          <P k="more" st="b"><Lk href={PEOPLE.more.href}>{PEOPLE.more.label}</Lk></P>
        </section>

        <section data-sec="join" id="join" className="sec">
          <P k="h" st="h" as="h2"><Words s={JOIN.title} /></P>
          <P k="lead" st="b"><Words s={JOIN.lead} /></P>
          {JOIN.paths.map((jp) => (
            <Fragment key={jp.id}>
              <P k={`n_${jp.id}`} st="d3" as="h3"><Words s={jp.name} /></P>
              <P k={`l_${jp.id}`} st="d4"><Words s={jp.line} /></P>
              {jp.text.map((t, i) => (
                <P key={i} k={`x_${jp.id}${i}`} st="b"><Words s={t} /></P>
              ))}
              <P k={`a_${jp.id}`} st="ui"><Lk href={jp.href}>{`${jp.name} with us`}</Lk></P>
            </Fragment>
          ))}
          <P k="already" st="b"><Words s={JOIN.already.before} /><Lk href={JOIN.already.href}>{JOIN.already.label}</Lk></P>
          <P k="coach" st="b"><Words s={JOIN.coach.before} /><Lk href={JOIN.coach.href}>{JOIN.coach.label}</Lk></P>
          <P k="also" st="b"><Words s={JOIN.also} /><Lk href={FOOTER.links[4].href}>{FOOTER.links[4].label}</Lk></P>
          <P k="discord" st="b"><Words s={JOIN.discord} /></P>
        </section>
      </main>

      <footer className="ft">
        <p className="ft-line">{FOOTER.line}</p>
        <nav className="ft-nav" aria-label="Elsewhere">
          <ul>
            {FOOTER.links.map((l) => (
              <li key={l.href}><a href={l.href}>{l.label}</a></li>
            ))}
          </ul>
          <ul>
            {FOOTER.pages.map((l) => (
              <li key={l.href}><a href={l.href}>{l.label}</a></li>
            ))}
          </ul>
        </nav>
        <p className="ft-end">
          Skeptical<span className="slot" ref={slotRef} aria-hidden="true">?</span>
        </p>
        <p className="ft-draft">Draft 2, version 75. Not the live site.</p>
      </footer>
    </div>
  );
}
