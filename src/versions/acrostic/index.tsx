// Version 81: the acrostic. SKEPTICAL? runs down the first screen as ten capitals, each one the first
// letter of a real line from the site. Scrolling tips the column on its side into the masthead.
import { useEffect, useRef } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import './acrostic.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { A, C, CHARS, E, I, K, L, LINES, MARK, OWN, P, S, T, type Line } from './lines';

const LHR = 1;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const out = (t: number) => 1 - Math.pow(1 - t, 3.2);
const cl = (t: number) => Math.min(1, Math.max(0, t));

/** A line set with its capital dropped two rows deep. The visual is hidden from screen readers; the line is read whole. */
function Drop({ l, cls = '', id = true }: { l: Line; cls?: string; id?: boolean }) {
  return (
    <p className={`drop ${cls}`} id={id ? l.id : undefined}>
      <span className="cap" aria-hidden="true">{l.ch}</span>
      <span className="tx" aria-hidden="true">{l.a}<br />{l.b}</span>
      <span className="sr-only-x">{l.line}</span>
    </p>
  );
}

function More({ href, label }: { href: string; label: string }) {
  return (
    <a className="more" href={href}>
      <span>{label}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11" /></svg>
    </a>
  );
}

export default function Acrostic() {
  useVersion('acrostic', { anchorOffset: -96 });
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    const wrap = el.querySelector<HTMLElement>('.hero-wrap')!;
    const hero = el.querySelector<HTMLElement>('.hero')!;
    const list = el.querySelector<HTMLElement>('.rows')!;
    const caps = [...list.querySelectorAll<HTMLElement>('.cap')];
    const mast = el.querySelector<HTMLElement>('.mast')!;
    const marks = [...mast.querySelectorAll<HTMLElement>('.m')];
    const secs = [...el.querySelectorAll<HTMLElement>('[data-sec]')];
    const ends = [...el.querySelectorAll<HTMLElement>('.small .sc')];
    if (!still) el.classList.add('arm');

    // Font metrics, so every capital sits exactly from the cap height of its first row to the baseline of its second.
    const cv = document.createElement('canvas').getContext('2d')!;
    let capAdv = 0.8;
    let W = 10;
    const metrics = () => {
      cv.font = '900 100px "Bodoni Moda Variable"';
      const h = cv.measureText('H');
      const c = h.actualBoundingBoxAscent / 100;
      const a2 = h.fontBoundingBoxAscent / 100, d2 = h.fontBoundingBoxDescent / 100;
      capAdv = Math.max(...CHARS.map((x) => cv.measureText(x.ch).width / 100));
      cv.font = 'italic 500 100px "Bodoni Moda Variable"';
      const t = cv.measureText('x');
      const a1 = t.fontBoundingBoxAscent / 100, d1 = t.fontBoundingBoxDescent / 100;
      W = Math.max(...LINES.flatMap((l) => [cv.measureText(l.a).width, cv.measureText(l.b).width])) / 100;
      if (!(c > 0.3 && c < 1) || !(a1 > 0)) return;
      const Fr = (LHR + c) / c;
      const cur = (2 * LHR - (a2 + d2) * Fr) / 2 + a2 * Fr - c * Fr;
      const tt = (LHR - (a1 + d1)) / 2 + a1 - c - cur;
      const s = el.style;
      s.setProperty('--fr', Fr.toFixed(4));
      s.setProperty('--tt', tt.toFixed(4));
      s.setProperty('--capr', c.toFixed(4));
      // where the glyph sits inside a masthead letter's box, so the bar can centre it
      s.setProperty('--mpt', (0.66 - (cur / Fr + c / 2)).toFixed(4));
    };

    // The first screen: ten rows fill the height, and the longest row still fits the width.
    const fit = () => {
      const vh = hero.clientHeight, vw = hero.clientWidth;
      const phone = vw < 700;
      const padT = phone ? 18 : 28, padB = phone ? 74 : 84;
      const row = (vh - padT - padB) / 10;
      const Fr = parseFloat(getComputedStyle(el).getPropertyValue('--fr')) || 2.5;
      const gut = phone ? 16 : Math.max(32, vw * 0.06);
      const room = phone ? vw - gut * 2 : Math.min(vw * 0.62, vw - gut * 2);
      const fH = row / (2 * LHR + 0.16);
      const fW = room / (capAdv * Fr + 0.2 + W + 0.5);
      const f = Math.max(14, Math.min(fH, fW, 64));
      list.style.setProperty('--f', `${f}px`);
      list.style.setProperty('--gap', `${Math.max(0, row - 2 * LHR * f)}px`);
      list.style.paddingTop = `${padT}px`;
    };

    // Where each capital starts (in the column) and ends (in the masthead).
    let hc: { x: number; y: number }[] = [];
    let mc: { x: number; y: number }[] = [];
    let scl = 0.4;
    const measure = () => {
      caps.forEach((c) => (c.style.transform = 'none'));
      const base = hero.getBoundingClientRect();
      hc = caps.map((c) => { const r = c.getBoundingClientRect(); return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 }; });
      marks.forEach((m) => (m.style.transform = ''));
      lastQ = -1;
      mc = marks.map((m) => { const r = m.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      scl = parseFloat(getComputedStyle(marks[0]).fontSize) / parseFloat(getComputedStyle(caps[0]).fontSize);
      last = -1;
    };

    let last = -1;
    let shown = false;
    let active = '';
    const setShown = (on: boolean) => {
      if (on === shown) return;
      shown = on;
      mast.classList.toggle('on', on);
      if (on) mast.removeAttribute('inert'); else mast.setAttribute('inert', '');
      el.classList.toggle('mastered', on);
    };
    const setActive = (key: string) => {
      if (key === active) return;
      active = key;
      const own = OWN[key];
      marks.forEach((m, i) => m.classList.toggle('lo', !!own && !own.includes(i)));
    };

    type Pt = { x: number; y: number };
    const mean = (q: Pt[]) => ({ x: q.reduce((s, v) => s + v.x, 0) / q.length, y: q.reduce((s, v) => s + v.y, 0) / q.length });
    /** The whole word turns as one rigid piece, then each letter rights itself in turn and settles. */
    const turn = (els: HTMLElement[], from: Pt[], to: Pt[], t: number, deg: number, s: number) => {
      const n = from.length;
      const P0 = mean(from), P1 = mean(to);
      const Lf = Math.hypot(from[n - 1].x - from[0].x, from[n - 1].y - from[0].y) || 1;
      const Lt = Math.hypot(to[n - 1].x - to[0].x, to[n - 1].y - to[0].y) || 1;
      const tA = ease(cl(t / 0.64));
      const th = (deg * Math.PI / 180) * tA;
      const cs = Math.cos(th), sn = Math.sin(th);
      const sg = 1 + (Lt / Lf - 1) * tA;
      const px = P0.x + (P1.x - P0.x) * tA, py = P0.y + (P1.y - P0.y) * tA;
      els.forEach((c, i) => {
        const vx = from[i].x - P0.x, vy = from[i].y - P0.y;
        const rx = px + (vx * cs - vy * sn) * sg, ry = py + (vx * sn + vy * cs) * sg;
        const tB = out(cl((t - 0.4 - i * 0.032) / 0.3));
        const x = rx + (to[i].x - rx) * tB, y = ry + (to[i].y - ry) * tB;
        const rot = deg * tA * (1 - tB);
        const sc = 1 + (s - 1) * tA;
        c.style.transform = t <= 0 ? '' : `translate(${(x - from[i].x).toFixed(2)}px, ${(y - from[i].y).toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      });
    };

    const morph = (p: number) => {
      if (p === last) return;
      last = p;
      hero.style.setProperty('--out', cl(p / 0.2).toFixed(3));
      hero.classList.toggle('moving', p > 0.004);
      if (!hc.length) return;
      turn(caps, hc, mc, p, -90, scl);
    };

    // The end: the masthead letters fall back into a column, small, in the footer.
    let lastQ = -1;
    let home = false;
    const fall = (q: number) => {
      if (q === lastQ) return;
      lastQ = q;
      mast.classList.toggle('leaving', q > 0);
      const isHome = q >= 1;
      if (isHome !== home) { home = isHome; el.classList.toggle('home', home); }
      if (q <= 0 || !mc.length) { marks.forEach((m) => (m.style.transform = '')); return; }
      const s1 = parseFloat(getComputedStyle(ends[0]).fontSize) / parseFloat(getComputedStyle(marks[0]).fontSize);
      const to = ends.map((e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      turn(marks, mc, to, q, 90, s1);
    };

    const tick = () => {
      const vh = window.innerHeight;
      const top = wrap.offsetTop;
      const span = Math.max(1, wrap.offsetHeight - vh);
      const y = window.scrollY;
      if (still) {
        setShown(y > hero.offsetHeight * 0.8);
      } else {
        const p = cl((y - top) / span);
        morph(p);
        setShown(p >= 0.999);
        if (shown && ends.length) {
          const top = ends[0].getBoundingClientRect().top;
          fall(cl((vh * 0.96 - top) / (vh * 0.52)));
        } else fall(0);
      }
      let key = '';
      for (const s of secs) if (s.getBoundingClientRect().top < vh * 0.5) key = s.dataset.sec!;
      setActive(key);
    };

    const layout = () => { metrics(); fit(); measure(); tick(); };
    let alive = true;
    document.fonts.ready.then(() => Promise.all([
      document.fonts.load('900 100px "Bodoni Moda Variable"'),
      document.fonts.load('italic 500 100px "Bodoni Moda Variable"'),
    ])).catch(() => null).then(() => { if (alive) layout(); });
    layout();
    gsap.ticker.add(tick);
    let rt = 0;
    const onResize = () => { clearTimeout(rt); rt = window.setTimeout(layout, 120); };
    window.addEventListener('resize', onResize);

    // Sections set their capitals as they arrive.
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
    el.querySelectorAll('.sec .drop, .sec .reveal').forEach((d) => io.observe(d));

    // Pressing a letter lands on its line, and the line answers.
    let lt = 0;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const t = document.getElementById(a.getAttribute('href')!.slice(1));
      if (!t) return;
      clearTimeout(lt);
      el.querySelectorAll('.lit').forEach((x) => x.classList.remove('lit'));
      lt = window.setTimeout(() => { t.classList.add('in', 'lit'); lt = window.setTimeout(() => t.classList.remove('lit'), 2200); }, still ? 0 : 1100);
    };
    el.addEventListener('click', onClick);

    return () => {
      alive = false;
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', onResize);
      el.removeEventListener('click', onClick);
      io.disconnect();
      clearTimeout(rt);
      clearTimeout(lt);
    };
  }, []);

  const [compete, lecture, coach] = JOIN.paths;

  return (
    <div className="v-acrostic" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <header className="mast" inert>
        <nav aria-label="Sections" className="mast-row">
          {CHARS.map((c, i) => (
            <a key={i} className={`m${i === 9 ? ' q' : ''}${i > 5 ? ' r' : ''}`} href={`#${c.id}`} aria-label={c.line}>
              {c.ch}
              <span className="pk" aria-hidden="true">{c.line}</span>
            </a>
          ))}
        </nav>
      </header>

      <main id="main">
        <div className="hero-wrap">
          <section className="hero" aria-labelledby="h1">
            <nav aria-label="The name, line by line">
              <ol className="rows">
                {LINES.map((l, i) => (
                  <li key={l.id} style={{ '--i': i } as React.CSSProperties}>
                    <a className="row" href={`#${l.id}`} aria-label={l.line}>
                      <span className="cap">{l.ch}</span>
                      <span className="rest"><span>{l.a}</span><br /><span>{l.b}</span></span>
                    </a>
                  </li>
                ))}
                <li style={{ '--i': 9 } as React.CSSProperties}>
                  <a className="row q" href={`#${MARK.id}`} aria-label={MARK.line}>
                    <span className="cap">{MARK.ch}</span>
                  </a>
                </li>
              </ol>
            </nav>
            <div className="side">
              <h1 id="h1">{SITE.heading}</h1>
              <p>Every capital starts one of our lines.</p>
            </div>
          </section>
        </div>

        <section className="sec pitch" id="pitch" data-sec="pitch" aria-label="The pitch">
          <div className="pair">
            <Drop l={A} />
            <Drop l={C} />
          </div>
          <div className="body reveal">
            <p className="calm">{SITE.description}</p>
            <div className="doors">
              {HERO.doors.map((d) => (
                <a key={d.href} className="door" href={d.href}>
                  <span>{d.label}</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11" /></svg>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="sec statement" id="statement" data-sec="statement" aria-label="The statement">
          <p className="free reveal">{HERO.statement[0]}</p>
          <div className="pair">
            <Drop l={T} />
            <Drop l={E} />
          </div>
          <ol className="manifesto">
            {MANIFESTO.map((m, i) => (
              <li key={i} className="reveal">{m}</li>
            ))}
          </ol>
        </section>

        <section className="sec record" id="record" data-sec="record" aria-labelledby="h-record">
          <h2 id="h-record" className="rubric">{RECORD.title}</h2>
          <p className="calm lead reveal">{RECORD.rule.split(/(?<=\.)\s+/)[0]}</p>
          <Drop l={I} />
          <p className="event reveal">
            <span>{RECORD.when}</span>
            <span>{RECORD.name}</span>
            <span>{RECORD.where}</span>
          </p>
          <ul className="results">
            {RECORD.results.map((r) => (
              <li key={r.who} className="reveal">
                <span className="who">{r.who}</span>
                <span className="what">{r.what}</span>
                <span className="also">{r.more}</span>
              </li>
            ))}
          </ul>
          <More href={RECORD.more.href} label={RECORD.more.label} />
        </section>

        <section className="sec drive" id="drive" data-sec="drive" aria-labelledby="h-drive">
          <h2 id="h-drive" className="rubric">{DRIVE.title}</h2>
          <Drop l={L} />
          <p className="calm lead reveal">{DRIVE.lead.split(/(?<=\.)\s+/)[1]}</p>
          <dl className="items">
            {DRIVE.items.map((it) => (
              <div key={it.term} className={`item reveal${it.term === 'Ks' ? ' big' : ''}`}>
                <dt>{it.term}</dt>
                <dd>{it.term === 'Ks' ? <Drop l={K} /> : it.text}</dd>
              </div>
            ))}
          </dl>
          <More href={DRIVE.more.href} label={DRIVE.more.label} />
        </section>

        <section className="sec people" id="people" data-sec="people" aria-labelledby="h-people">
          <h2 id="h-people" className="rubric">{PEOPLE.title}</h2>
          <div className="coaches">
            {PEOPLE.coaches.map((c) => (
              <article key={c.name} className="coach reveal">
                <h3>{c.name}</h3>
                <p className="role">{c.role}</p>
                <p className="calm">{c.bio}</p>
              </article>
            ))}
          </div>
          <p className="count reveal">{PEOPLE.count}</p>
          <More href={PEOPLE.more.href} label={PEOPLE.more.label} />
        </section>

        <section className="sec join" id="join" data-sec="join" aria-labelledby="h-join" tabIndex={-1}>
          <h2 id="h-join" className="rubric">{JOIN.title}</h2>
          <span className="bigq" aria-hidden="true">?</span>
          <Drop l={P} />
          <p className="calm lead reveal">{JOIN.lead.split(/(?<=\.)\s+/)[1]}</p>
          <ol className="ways">
            {[compete, lecture, coach].map((w) => (
              <li key={w.id} className="way reveal">
                <a className="drop wayline" href={w.href} aria-label={`${w.name}. ${w.line}`}>
                  <span className="cap" aria-hidden="true">{w.name[0]}</span>
                  <span className="tx" aria-hidden="true">{w.name.slice(1)}.<br />{w.line}</span>
                </a>
                <div className="waytext">
                  {w.text.map((t, j) =>
                    w.id === 'compete' && j === 3 ? (
                      <p key={j} id={S.id} className="sline">
                        <span className="ini">{S.ch}</span>{S.line.slice(1)} {t.slice(S.line.length + 1)}
                      </p>
                    ) : (
                      <p key={j}>{t}</p>
                    ),
                  )}
                </div>
              </li>
            ))}
          </ol>
          <div className="after reveal">
            <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
            <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
            <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>
      </main>

      <footer className="foot" data-sec="end" id="end">
        <p className="fline">{FOOTER.line}</p>
        <div className="fcols">
          <nav aria-label="Again, line by line">
            <ol className="small">
              {CHARS.map((c, i) => (
                <li key={i}>
                  <a href={`#${c.id}`} className={i === 9 ? 'q' : ''}>
                    <span className="sc" aria-hidden="true">{c.ch}</span>
                    <span className="sl">{c.line}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="flinks">
            <ul>
              {FOOTER.links.map((l) => (
                <li key={l.href}><a href={l.href}>{l.label}</a></li>
              ))}
            </ul>
            <ul className="pages">
              {FOOTER.pages.map((l) => (
                <li key={l.href}><a href={l.href}>{l.label}</a></li>
              ))}
            </ul>
            <p className="draft">Draft 2, version 81. Not the live site.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
