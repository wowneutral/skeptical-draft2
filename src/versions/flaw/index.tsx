// Version 51: the flaw. A blank slab of polished black stone on a bone plinth.
// Every press cracks it; the scroll grows one authored crack, and by Join the
// fractures have drawn a question mark across its face.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './flaw.css';
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { gsap } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { st } from './store';

const Scene = lazy(() => import('./Scene'));

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

/** A hairline fracture as an SVG path, seeded so it is the same on every visit. */
function fracture(seed: number, w = 600, h = 14, n = 34) {
  const r = rng(seed * 977 + 13);
  let d = `M0 ${h / 2}`, y = h / 2;
  for (let i = 1; i <= n; i++) { y = clamp(y + (r() - 0.5) * h * 0.55, 1.5, h - 1.5); d += ` L${((i / n) * w).toFixed(1)} ${y.toFixed(1)}`; }
  const spurAt = 0.3 + r() * 0.4, sx = spurAt * w;
  d += ` M${sx.toFixed(1)} ${h / 2} l${(14 + r() * 26).toFixed(1)} ${(r() < 0.5 ? -1 : 1) * (3 + r() * 4)}`;
  return d;
}

/** A section rule that is a crack: it runs across when it comes into view. */
function Rule({ seed }: { seed: number }) {
  const d = useMemo(() => fracture(seed), [seed]);
  return (
    <svg className="rule" viewBox="0 0 600 14" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** A door: a big link whose underline fractures under the pointer or focus. */
function Door({ href, children, seed }: { href: string; children: React.ReactNode; seed: number }) {
  const d = useMemo(() => fracture(seed, 400, 12, 26), [seed]);
  return (
    <A className="door" href={href}>
      <span className="door-t">{children}</span>
      <svg className="door-u" viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
        <path className="calm" d="M0 6 H400" />
        <path className="cut" d={d} />
      </svg>
    </A>
  );
}

/** Without WebGL: the finished stone, flat. */
function FlatStone() {
  const k = 300 / MARKS.italic.h;
  return (
    <svg className="flat" viewBox="0 0 840 460" role="img" aria-label="A black stone with a question mark cracked into it">
      <rect x="20" y="20" width="800" height="400" fill="#0b0b0c" stroke="#3a3936" />
      <path d={MARKS.italic.d} transform={`translate(${420 - (MARKS.italic.w * k) / 2} 70) scale(${k})`} fill="none" stroke="#9c978d" strokeWidth={1.2 / k} />
      <rect x="0" y="420" width="840" height="40" fill="#d6cfbf" />
    </svg>
  );
}

export default function Flaw() {
  useVersion('flaw');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The opening: the softbox comes up on the stone, then the words arrive beside it.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const items = el.querySelectorAll<HTMLElement>('[data-open]');
    if (still) { el.classList.add('opened'); return; }
    gsap.set(items, { autoAlpha: 0, y: 18 });
    let done = false;
    const go = () => {
      if (done) return; done = true;
      el.classList.add('opened');
      gsap.to(items, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay: 0.5 });
    };
    st.onReady = go;
    if (st.ready || !webgl) go();
    const t = setTimeout(go, 3500);
    return () => { clearTimeout(t); st.onReady = null; };
  }, [webgl]);

  // Every frame: where the reader is, as a number the stone can follow.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const secs = Array.from(el.querySelectorAll<HTMLElement>('[data-sec]'));
    let tops: number[] = [];
    const measure = () => { const y = window.scrollY; tops = secs.map((s) => s.getBoundingClientRect().top + y); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    const tick = () => {
      const vh = window.innerHeight, line = window.scrollY + (isPhone() ? vh * 0.62 : vh * 0.55);
      let f = 0;
      for (let i = 0; i < tops.length; i++) {
        if (line < tops[i]) break;
        const next = tops[i + 1] ?? tops[i] + vh;
        f = i + clamp((line - tops[i]) / Math.max(1, next - tops[i]));
      }
      const max = document.documentElement.scrollHeight - vh;
      if (window.scrollY >= max - 4) f = Math.max(f, secs.length - 1);
      st.f = Math.min(f, secs.length - 1);
    };
    gsap.ticker.add(tick);
    const move = (e: PointerEvent) => { st.px = (e.clientX / window.innerWidth) * 2 - 1; st.py = (e.clientY / window.innerHeight) * 2 - 1; };
    window.addEventListener('pointermove', move, { passive: true });
    // Rules crack across when they come into view.
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
    el.querySelectorAll('.rule').forEach((r) => io.observe(r));
    return () => { gsap.ticker.remove(tick); ro.disconnect(); io.disconnect(); window.removeEventListener('pointermove', move); };
  }, []);

  return (
    <div className={`v-flaw${phone ? ' is-phone' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <div className="stage" aria-hidden={webgl ? 'true' : undefined}>
        {webgl ? <Suspense fallback={null}><Scene phone={phone} /></Suspense> : <FlatStone />}
      </div>

      <header className="top" data-open>
        <span className="brand">Skeptical</span>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="sec hero" data-sec aria-labelledby="pitch">
          <div className="col">
            <h1 id="pitch" className="pitch" data-open>
              <span className="sr-only-x">Skeptical. </span>
              {HERO.pitch.map((l, i) => <span key={i} className="pl">{l}</span>)}
            </h1>
            <ul className="statement" data-open>
              {HERO.statement.map((s) => <li key={s}>{s}</li>)}
            </ul>
            <div className="doors" data-open>
              {HERO.doors.map((d, i) => <Door key={d.href} href={d.href} seed={i + 3}>{d.label}</Door>)}
            </div>
            {webgl && (
              <button type="button" className="strike" data-open onClick={() => { st.asks++; }}>
                <svg viewBox="0 0 22 22" aria-hidden="true"><path d="M3 11 L8 10 L11 13 L15 8 L19 9 M11 13 L12 18" /></svg>
                <span>{phone ? 'Tap the stone.' : 'Press the stone.'}</span>
              </button>
            )}
          </div>
        </section>

        <section className="sec manifesto" data-sec aria-label="What we are">
          <div className="col">
            <Rule seed={11} />
            <ul>
              {MANIFESTO.map((m) => <li key={m} data-rise>{m}</li>)}
            </ul>
          </div>
        </section>

        <section className="sec record" id="record" data-sec aria-labelledby="h-record">
          <div className="col">
            <Rule seed={21} />
            <h2 id="h-record" className="title" data-rise>{RECORD.title}</h2>
            <p className="rule-line" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise>
              <span>{RECORD.when}</span>
              <span className="ev-name">{RECORD.name}</span>
              <span>{RECORD.where}</span>
            </p>
            <ol className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="what">{r.what}</span>
                  <span className="who">{r.who}</span>
                  <span className="more">{r.more}</span>
                </li>
              ))}
            </ol>
            <A className="more-link" href={RECORD.more.href}>{RECORD.more.label}</A>
          </div>
        </section>

        <section className="sec drive" id="drive" data-sec aria-labelledby="h-drive">
          <div className="col">
            <Rule seed={31} />
            <h2 id="h-drive" className="title" data-rise>{DRIVE.title}</h2>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((it) => (
                <div key={it.term} className="item" data-rise>
                  <dt>{it.term}</dt>
                  <dd>{it.text}</dd>
                </div>
              ))}
            </dl>
            <A className="more-link" href={DRIVE.more.href}>{DRIVE.more.label}</A>
          </div>
        </section>

        <section className="sec people" id="people" data-sec aria-labelledby="h-people">
          <div className="col">
            <Rule seed={41} />
            <h2 id="h-people" className="title" data-rise>{PEOPLE.title}</h2>
            <div className="coaches">
              {PEOPLE.coaches.map((c) => (
                <article key={c.name} className="coach" data-rise>
                  <h3>{c.name}</h3>
                  <p className="role">{c.role}</p>
                  <p className="bio">{c.bio}</p>
                </article>
              ))}
            </div>
            <p className="count" data-rise>{PEOPLE.count}</p>
            <A className="more-link" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
          </div>
        </section>

        <section className="sec join" id="join" data-sec aria-labelledby="h-join">
          <div className="col">
            <Rule seed={51} />
            <h2 id="h-join" className="title big" data-rise>{JOIN.title}</h2>
            <p className="lead" data-rise>{JOIN.lead}</p>
            <ol className="paths">
              {JOIN.paths.map((p, i) => (
                <li key={p.id} className="path" data-rise>
                  <h3>{p.name}</h3>
                  <Door href={p.href} seed={60 + i}>{p.line}</Door>
                  <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                </li>
              ))}
            </ol>
            <div className="after" data-rise>
              <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>.</p>
              <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
              <p>{JOIN.also} <A href={`mailto:${FOOTER.links[4].label}`}>{FOOTER.links[4].label}</A></p>
              <p>{JOIN.discord}</p>
            </div>
          </div>
        </section>

        <footer className="sec foot" data-sec>
          <div className="col">
            <Rule seed={71} />
            <p className="foot-line">{FOOTER.line}</p>
            <ul className="links">
              {FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
            </ul>
            <ul className="pages">
              {FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
            </ul>
            <p className="draft">Draft 2, version 51. Not the live site.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
