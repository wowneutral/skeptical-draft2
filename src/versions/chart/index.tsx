// Version 96: the site as one eye test chart, lit in a dark room. Scrolling steps you
// closer one row at a time: the chart zooms about the row you reach until it reads at
// display size, and that section opens beneath it. The last, smallest line fills the screen.
import { useEffect, useRef, type ReactNode } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import './chart.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { gsap, scroll, scrollToY } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';

type Link = { label: string; href: string };
type Row = {
  key: string;
  /** Font size in chart units at rest. */
  f: number;
  /** Wrap width in em, desktop and phone. */
  k: number;
  kp: number;
  lh?: number;
  text?: string;
  links?: Link[];
  rule?: boolean;
  block?: ReactNode;
  wide?: boolean;
};

const ext = (href: string) => (href.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noreferrer' });

const ROWS: Row[] = [
  { key: 'q', f: 400, k: 2, kp: 2, lh: 0.8, text: '?' },
  {
    key: 'name', f: 132, k: 12, kp: 12, lh: 0.86, text: SITE.name,
    block: <p className="lede">{SITE.description}</p>,
  },
  { key: 'pitch', f: 50, k: 14, kp: 7.4, text: HERO.pitch.join(' ') },
  { key: 'doors', f: 36, k: 17, kp: 8, links: HERO.doors },
  { key: 'statement', f: 27, k: 19, kp: 8, text: HERO.statement.join(' '), rule: true },
  { key: 'm1', f: 21, k: 18, kp: 8, text: MANIFESTO[0] },
  { key: 'm2', f: 17, k: 18, kp: 8, text: MANIFESTO[1] },
  { key: 'm3', f: 14, k: 19, kp: 8, text: MANIFESTO[2] },
  { key: 'm4', f: 11.5, k: 19, kp: 8, text: MANIFESTO[3] },
  {
    key: 'record', f: 9.5, k: 19, kp: 8,
    text: RECORD.results.map((r) => `${r.who} ${r.what}.`).join(' '),
    block: (
      <>
        <h2 id="record">{RECORD.title}</h2>
        <p>{RECORD.rule}</p>
        <p className="ev"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
        <ul className="res">
          {RECORD.results.map((r) => (
            <li key={r.who}><b>{r.who}</b><span>{r.what}.</span> {r.more}</li>
          ))}
        </ul>
        <a className="more" href={RECORD.more.href} {...ext(RECORD.more.href)}>{RECORD.more.label}</a>
      </>
    ),
  },
  {
    key: 'drive', f: 8, k: 22, kp: 7.2, wide: true,
    text: DRIVE.items.map((d) => d.term).join(' '),
    block: (
      <>
        <h2 id="drive">{DRIVE.title}</h2>
        <p>{DRIVE.lead}</p>
        <dl className="items">
          {DRIVE.items.map((d) => (
            <div key={d.term}><dt>{d.term}</dt><dd>{d.text}</dd></div>
          ))}
        </dl>
        <a className="more" href={DRIVE.more.href} {...ext(DRIVE.more.href)}>{DRIVE.more.label}</a>
      </>
    ),
  },
  {
    key: 'people', f: 6.6, k: 15, kp: 7.4,
    text: PEOPLE.coaches.map((c) => c.name).join('. ') + '.',
    block: (
      <>
        <h2 id="people">{PEOPLE.title}</h2>
        <div className="coaches">
          {PEOPLE.coaches.map((c) => (
            <div key={c.name}><h3>{c.name}</h3><p className="role">{c.role}</p><p>{c.bio}</p></div>
          ))}
        </div>
        <p className="count">{PEOPLE.count}</p>
        <a className="more" href={PEOPLE.more.href} {...ext(PEOPLE.more.href)}>{PEOPLE.more.label}</a>
      </>
    ),
  },
  {
    key: 'ways', f: 5.5, k: 14, kp: 7, wide: true,
    links: JOIN.paths.map((p) => ({ label: p.name, href: p.href })),
    block: (
      <>
        <h2 id="join">{JOIN.title}</h2>
        <p>{JOIN.lead}</p>
        <div className="paths">
          {JOIN.paths.map((p) => (
            <div key={p.id}>
              <h3><a href={p.href} {...ext(p.href)}>{p.name}</a></h3>
              <p className="line">{p.line}</p>
              {p.text.map((t) => <p key={t}>{t}</p>)}
            </div>
          ))}
        </div>
        <p className="aside">
          <span>{JOIN.already.before}<a href={JOIN.already.href} {...ext(JOIN.already.href)}>{JOIN.already.label}</a>.</span>{' '}
          <span>{JOIN.coach.before}<a href={JOIN.coach.href} {...ext(JOIN.coach.href)}>{JOIN.coach.label}</a>.</span>
        </p>
        <p className="aside">{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
        <p className="aside">{JOIN.discord}</p>
      </>
    ),
  },
  {
    key: 'footer', f: 4.4, k: 7.6, kp: 6, text: FOOTER.line,
    block: (
      <footer className="foot">
        <ul>{FOOTER.links.map((l) => <li key={l.href}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}</ul>
        <ul>{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}</ul>
        <p className="draft">Draft 2, version 96. Not the live site.</p>
        <button type="button" className="back" onClick={() => scrollToY(0)}>Step back</button>
      </footer>
    ),
  },
];
const N = ROWS.length;
const LAST = N - 1;

const ease = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

type State = { s: number; c: number; C: number };
type Layout = {
  vw: number; vh: number; phone: boolean;
  w: number[]; h: number[]; y: number[]; bh: number[];
  W: number; H: number; px: number; pt: number; pb: number;
  states: State[]; over: number[]; reach: number[]; dwell: number[]; T: number; G: number;
};

export default function Chart() {
  useVersion('chart');
  const root = useRef<HTMLDivElement>(null);
  const go = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    if (still) return;
    const el = root.current!;
    const track = el.querySelector<HTMLElement>('.track')!;
    const stage = el.querySelector<HTMLElement>('.stage')!;
    const panel = el.querySelector<HTMLElement>('.panel')!;
    const hint = el.querySelector<HTMLElement>('.hint')!;
    const rows = [...el.querySelectorAll<HTMLElement>('.row')];
    const blocks = ROWS.map((_, i) => el.querySelector<HTMLElement>(`[data-block="${i}"]`));
    const marks = [...el.querySelectorAll<HTMLElement>('.mark')];
    const lens = el.querySelector<HTMLElement>('.lens')!;
    const lrows = [...el.querySelectorAll<HTMLElement>('.lrow')];
    const lpanel = el.querySelector<HTMLElement>('.lens-panel')!;
    const ptr = { x: -1, y: -1, on: false };
    let lensA = 0;
    const intro = { b: 5 };
    let L: Layout | null = null;
    let hov = -1;
    let cur = -1;
    let lastKey = '';

    const measure = () => {
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const phone = vw < 700;
      stage.style.height = vh + 'px';
      rows.forEach((r, i) => { r.style.maxWidth = (phone ? ROWS[i].kp : ROWS[i].k) + 'em'; lrows[i].style.maxWidth = r.style.maxWidth; });
      const w = rows.map((r) => r.offsetWidth);
      const h = rows.map((r) => r.offsetHeight);
      const bh = blocks.map((b) => (b ? b.offsetHeight : 0));
      const y: number[] = [];
      let acc = 0;
      for (let j = 0; j < N; j++) {
        y.push(acc);
        if (j < LAST) acc += h[j] + ROWS[j + 1].f * 0.55 + ROWS[j].f * 0.1;
      }
      const H = y[LAST] + h[LAST];
      const W = Math.max(...w);
      const px = W * 0.08, pt = W * 0.1, pb = W * 0.1;
      const s0 = Math.min((vh * (phone ? 0.66 : 0.84)) / (H + pt + pb), (vw * (phone ? 0.9 : 0.9)) / (W + 2 * px));
      const G = phone ? 24 : 36;
      const mT = phone ? 56 : vh * 0.1;
      const mB = phone ? 84 : vh * 0.09;
      const avail = vh - mT - mB;
      const states: State[] = [{ s: s0, c: (H + pb - pt) / 2, C: vh * (phone ? 0.45 : 0.49) }];
      const over = [0];
      for (let i = 1; i < N; i++) {
        const end = i === LAST;
        const s = Math.min(
          (vw * (end ? 0.9 : 0.88)) / w[i],
          (vh * (end ? 0.78 : phone ? 0.5 : 0.56)) / h[i],
          end ? (avail - G - bh[i]) / h[i] : Infinity,
          (phone ? 170 : 300) / ROWS[i].f,
        );
        const total = h[i] * s + (bh[i] ? G + bh[i] : 0);
        const fits = total <= avail;
        const top = end ? (fits ? mT + (avail - total) * 0.5 : Math.max(mT, (vh - h[i] * s) / 2)) : fits ? mT + (avail - total) * 0.42 : mT;
        states.push({ s, c: y[i], C: top });
        over.push(Math.max(0, top + total - (vh - mB)));
      }
      const T = vh * 0.85;
      const dwell = over.map((o, i) => (i === 0 ? vh * 0.15 : vh * 0.45 + o * 1.15));
      const reach = [0];
      for (let i = 1; i < N; i++) reach.push(reach[i - 1] + dwell[i - 1] + T);
      const total = reach[LAST] + dwell[LAST] + vh * 0.2;
      track.style.height = total + vh + 'px';
      L = { vw, vh, phone, w, h, y, bh, W, H, px, pt, pb, states, over, reach, dwell, T, G };
      lastKey = '';
    };

    /** Scroll position to a row index (fractional while stepping) and a pan through a tall section. */
    const where = (sy: number) => {
      const { reach, dwell, over } = L!;
      let k = 0;
      while (k < LAST && sy >= reach[k + 1]) k++;
      const local = sy - reach[k];
      if (local <= dwell[k] || k === LAST) {
        const p = dwell[k] > 0 ? clamp(local / dwell[k]) : 0;
        const q = clamp((p - 0.08) / 0.84);
        return { t: k, pan: over[k] * (q * q * (3 - 2 * q)) };
      }
      const e = ease(clamp((local - dwell[k]) / L!.T));
      return { t: k + e, pan: over[k] * (1 - e) };
    };

    const view = (t: number) => {
      const st = L!.states;
      const a = Math.floor(t);
      const e = t - a;
      if (e < 1e-5 || a >= LAST) return st[Math.min(a, LAST)];
      const A = st[a], B = st[a + 1];
      if (Math.abs(A.s - B.s) < 1e-6) return { s: A.s, c: A.c + (B.c - A.c) * e, C: A.C + (B.C - A.C) * e };
      // A pure zoom about the one chart line that both states put at the same height.
      const ys = (A.c * A.s - B.c * B.s + B.C - A.C) / (A.s - B.s);
      const Ys = (ys - A.c) * A.s + A.C;
      return { s: A.s * Math.pow(B.s / A.s, e), c: ys, C: Ys };
    };

    const frame = () => {
      if (!L) return;
      const { t, pan } = where(scroll.y);
      const want = ptr.on && t < 0.35 ? 1 : 0;
      lensA += (want - lensA) * 0.22;
      if (Math.abs(want - lensA) < 0.01) lensA = want;
      const key = `${t.toFixed(4)}|${pan.toFixed(1)}|${hov}|${ptr.x}|${ptr.y}|${lensA.toFixed(3)}|${intro.b.toFixed(3)}`;
      if (key === lastKey) return;
      lastKey = key;
      const { vw, vh, w, h, y, bh, W, H, px, pt, pb, G, phone } = L;
      const { s, c, C } = view(t);
      const Y = (cy: number) => (cy - c) * s + C - pan;
      let gap = 0;
      const R = L.phone ? 0 : 118;
      const M = 3.4;
      const lx = ptr.x - R, ly = ptr.y - R;
      const lensOn = lensA > 0.001;
      lens.style.visibility = lensOn ? 'visible' : 'hidden';
      if (lensOn) lens.style.transform = `translate(${lx}px, ${ly}px) scale(${0.6 + 0.4 * lensA})`;
      lens.style.opacity = String(lensA);
      const nowCur = t < 0.5 ? 0 : Math.round(t);
      // Every step is a refocus: the chart softens mid-step and lands sharp.
      const focus = Math.sin((t - Math.floor(t)) * Math.PI) * (phone ? 0.7 : 1.1);
      for (let j = 0; j < N; j++) {
        const r = rows[j];
        const top = Y(y[j]) + gap;
        const hh = h[j] * s;
        const off = top > vh + 40 || top + hh < -40;
        r.style.visibility = off ? 'hidden' : '';
        if (!off) {
          r.style.transform = `translate(${(vw - w[j] * s) / 2}px, ${top}px) scale(${s})`;
          const blur = j === hov ? 0 : (j === nowCur ? 0 : clamp((j - t - 1.5) * (phone ? 0.12 : 0.3), 0, phone ? 0.45 : 1.1)) + focus + intro.b * clamp(1 - j * 0.04);
          r.style.filter = blur > 0.05 ? `blur(${(blur / s).toFixed(3)}px)` : '';
          if (lensOn) {
            const x0 = (vw - w[j] * s) / 2;
            lrows[j].style.transform = `translate(${(x0 - ptr.x) * M + R}px, ${(top - ptr.y) * M + R}px) scale(${s * M})`;
          }
        }
        // The red row mark in the left margin.
        const m = marks[j];
        const fs = ROWS[j].f * s;
        const mw = clamp(fs * 0.3, 3, phone ? 10 : 26) * (j === nowCur && t > 0.5 ? 1.7 : 1);
        const mh = clamp(fs * 0.05, 1, phone ? 3 : 4);
        const mx = Math.max(vw / 2 - (W / 2 + px * 0.55) * s - mw, phone ? 3 : 14);
        const my = top + Math.min(hh, fs * 1.0) / 2 - mh / 2;
        m.style.visibility = my < -10 || my > vh + 10 ? 'hidden' : '';
        m.style.transform = `translate(${mx}px, ${my}px) scale(${mw}, ${mh})`;
        const b = blocks[j];
        if (b) {
          const d = Math.abs(t - j);
          const o = clamp(1 - d);
          const oo = o * o * (3 - 2 * o);
          const op = clamp(1 - d * 2.6);
          b.style.visibility = op < 0.02 ? 'hidden' : 'visible';
          b.style.opacity = String(op);
          b.style.transform = `translateY(${top + hh + G + (1 - op) * 18}px)`;
          gap += oo * (bh[j] + G * 2);
        }
      }
      const pl = vw / 2 - (W / 2 + px) * s;
      const ptop = Y(-pt);
      panel.style.transform = `translate(${pl}px, ${ptop}px) scale(${(W + 2 * px) * s}, ${(H + pt + pb) * s + gap})`;
      if (lensOn) lpanel.style.transform = `translate(${(pl - ptr.x) * M + R}px, ${(ptop - ptr.y) * M + R}px) scale(${(W + 2 * px) * s * M}, ${((H + pt + pb) * s + gap) * M})`;
      hint.style.opacity = String(clamp(1 - t * 4));
      hint.style.visibility = t > 0.3 ? 'hidden' : '';
      if (nowCur !== cur) {
        rows[cur]?.removeAttribute('data-cur');
        cur = nowCur;
        rows[cur].setAttribute('data-cur', '');
        el.dataset.at = ROWS[cur].key;
      }
    };

    go.current = (i: number) => { if (L) scrollToY(L.reach[i] + 1); };

    measure();
    frame();
    gsap.ticker.add(frame);
    let lastW = window.innerWidth, lastH = window.innerHeight;
    const onResize = () => {
      if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 140) return;
      lastW = window.innerWidth; lastH = window.innerHeight;
      measure(); frame();
    };
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(() => { measure(); frame(); });

    const onOver = (e: PointerEvent) => {
      const r = (e.target as HTMLElement).closest?.('.row') as HTMLElement | null;
      hov = r ? rows.indexOf(r) : -1;
    };
    stage.addEventListener('pointerover', onOver);
    // A reading glass under a mouse pointer while the whole chart is in view: the fine print, corrected.
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !L || L.phone) { ptr.on = false; return; }
      ptr.x = Math.round(e.clientX); ptr.y = Math.round(e.clientY);
      const r = panel.getBoundingClientRect();
      ptr.on = ptr.x > r.left && ptr.x < r.right && ptr.y > r.top && ptr.y < r.bottom;
    };
    const onLeave = () => { ptr.on = false; };
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);

    // The room lights up: the chart's lamp flickers on before anything else is legible.
    const lamp = gsap.timeline({ delay: 0.25 });
    lamp.set(panel, { opacity: 0.04 })
      .to(panel, { opacity: 0.55, duration: 0.05, ease: 'none' })
      .to(panel, { opacity: 0.1, duration: 0.07, ease: 'none' })
      .to(panel, { opacity: 0.8, duration: 0.05, ease: 'none' }, '+=0.12')
      .to(panel, { opacity: 0.35, duration: 0.06, ease: 'none' })
      .to(panel, { opacity: 1, duration: 0.5, ease: 'power2.out' }, '+=0.05')
      .to(intro, { b: 0, duration: 1.6, ease: 'power3.out' }, '-=0.45')
      .fromTo(hint, { y: 10 }, { y: 0, duration: 0.8, ease: 'power3.out' }, '-=1.2');

    return () => {
      gsap.ticker.remove(frame);
      window.removeEventListener('resize', onResize);
      stage.removeEventListener('pointerover', onOver);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      lamp.kill();
    };
  }, []);

  /** Pressing any row steps straight to it. A link in a row you have not reached yet steps first. */
  const onRowClick = (i: number) => (e: React.MouseEvent) => {
    if (still) return;
    const at = root.current?.dataset.at;
    if (at === ROWS[i].key) return;
    e.preventDefault();
    go.current(i);
  };
  const onRowFocus = (i: number) => (e: React.FocusEvent) => {
    if (still) return;
    if ((e.target as HTMLElement).matches(':focus-visible') && root.current?.dataset.at !== ROWS[i].key) go.current(i);
  };

  return (
    <div className="v-chart" ref={root} data-at="q">
      <a className="skip-x" href="#main">Skip to the chart</a>
      <main id="main">
        <h1 className="sr-only-x">{SITE.heading}</h1>
        <div className="track">
          <div className="stage">
            <div className="panel" aria-hidden="true" />
            {ROWS.map((r, i) => (
              <span className="mark" key={'m' + r.key} aria-hidden="true" />
            ))}
            {ROWS.map((r, i) => (
              <div className="unit" key={r.key}>
                {r.links ? (
                  <div className={`row row-${r.key} has-links`} style={{ ['--f' as string]: r.f, lineHeight: r.lh }}>
                    {r.links.map((l) => (
                      <a key={l.href} href={l.href} {...ext(l.href)} onClick={onRowClick(i)} onFocus={onRowFocus(i)}>{l.label}</a>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`row row-${r.key}${r.rule ? ' has-rule' : ''}`}
                    style={{ ['--f' as string]: r.f, lineHeight: r.lh }}
                    onClick={onRowClick(i)}
                    onFocus={onRowFocus(i)}
                    aria-label={r.key === 'q' ? 'Back to the whole chart' : undefined}
                  >
                    {r.text}
                  </button>
                )}
                {r.block && (
                  <section className={`calm${r.wide ? ' is-wide' : ''}`} data-block={i}>
                    {r.block}
                  </section>
                )}
              </div>
            ))}
            <div className="lens" aria-hidden="true">
              <div className="lens-panel" />
              {ROWS.map((r) => (
                <span key={'l' + r.key} className={`lrow row-${r.key}${r.links ? ' has-links' : ''}${r.rule ? ' has-rule' : ''}`} style={{ ['--f' as string]: r.f, lineHeight: r.lh }}>
                  {r.links ? r.links.map((l) => <span key={l.href} className="ll">{l.label}</span>) : r.text}
                </span>
              ))}
            </div>
            <p className="hint">Scroll to step closer. Or press a row.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
