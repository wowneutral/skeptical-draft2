// Version 49: the arch. A limestone arch whose keystone is cut with the
// question mark: doubt holds the whole thing up. Pull it out and the arch
// comes down; let go and it builds itself again. Scrolling walks you through
// the opening, and at Join you look back through it.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/index.css';
import './arch.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { N, KEY, outline, pierBlocks, MARK, markBounds, centroid } from './geo';
import { S, type Mode } from './store';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The arch as an engraving, for a browser without WebGL. */
function FlatArch() {
  const b = markBounds(), kc = centroid(outline(KEY)), k = 0.62 / b.h;
  return (
    <svg className="flat-arch" viewBox="-4.2 -6.6 8.4 7" role="img" aria-label="A stone arch whose keystone is cut with a question mark">
      <g transform="scale(1,-1)">
        <line x1="-4.2" x2="4.2" y1="0" y2="0" />
        {Array.from({ length: N }, (_, i) => <polygon key={i} points={outline(i).map((p) => p.join(',')).join(' ')} />)}
        {[-1, 1].flatMap((sg) => pierBlocks(sg).map(([x, y, w, h], j) => <rect key={`${sg}${j}`} x={x - w / 2} y={y - h / 2} width={w} height={h} />))}
        <path className="q" d={MARK.d} transform={`translate(${kc[0]} ${kc[1]}) scale(${k} ${-k}) translate(${-b.cx} ${-b.cy})`} />
      </g>
    </svg>
  );
}

export default function Arch() {
  useVersion('arch');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const [mode, setModeState] = useState<Mode>(S.mode);
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    const l = (m: Mode) => setModeState(m);
    S.listeners.add(l);
    return () => { window.removeEventListener('resize', on); S.listeners.delete(l); };
  }, []);

  // Where each section sits on the page tells the camera when to arrive at each position.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      const vh = window.innerHeight, max = Math.max(1, document.documentElement.scrollHeight - vh);
      const at = (name: string) => {
        const s = el.querySelector<HTMLElement>(`[data-cam="${name}"]`); if (!s) return 0;
        const r = s.getBoundingClientRect(), top = r.top + window.scrollY;
        return clamp((top + Math.min(r.height, vh) / 2 - vh / 2) / max);
      };
      const k = [0, at('manifesto'), at('record'), at('drive'), at('people'), 0, at('join'), 1];
      k[5] = (k[4] + k[6]) / 2;
      for (let i = 1; i < k.length; i++) k[i] = Math.max(k[i], k[i - 1] + 0.001);
      S.keys = k;
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts.ready.then(measure);
    return () => ro.disconnect();
  }, [phone]);

  const fallen = mode === 'fallen';
  const pull = () => { S.cmd = fallen ? 'build' : 'pull'; };

  return (
    <div className={`v-arch${webgl ? '' : ' no-gl'}`} ref={root} data-mode={mode}>
      <a className="skip-x" href="#main">Skip to content</a>

      {webgl && (
        <div className="stage" aria-hidden="true">
          <Suspense fallback={null}><Scene phone={phone} /></Suspense>
        </div>
      )}

      <header className="top">
        <a className="mark" href="#top" aria-label="Skeptical, back to the front">Skeptical<span>?</span></a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="hero" id="top" data-cam="hero" aria-labelledby="pitch">
          <div className="hero-text">
            <h1 id="pitch">
              <span className="sr-only-x">{SITE.heading}. </span>
              {HERO.pitch.map((l, i) => <span key={i} className="pl">{l}</span>)}
            </h1>
            <p className="statement">{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>
            <div className="doors">
              {HERO.doors.map((d, i) => <A key={d.href} href={d.href} className={i === 0 ? 'door solid' : 'door'}>{d.label}<span aria-hidden="true">→</span></A>)}
            </div>
            {webgl && (
              <button type="button" className="pull" onClick={pull} disabled={mode === 'opening' || mode === 'rebuild'}>
                <span className="glyph" aria-hidden="true">{fallen ? '↓' : '↑'}</span>
                {fallen ? 'Build it again.' : still ? 'Lift the keystone.' : 'Pull the keystone.'}
              </button>
            )}
          </div>
          {!webgl && <FlatArch />}
        </section>

        <section className="sheet manifesto" data-cam="manifesto" aria-label="What we are">
          <ol>
            {MANIFESTO.map((l, i) => <li key={i} data-rise className={i === 3 ? 'pos' : undefined}>{l}</li>)}
          </ol>
        </section>

        <section className="sheet record" id="record" data-cam="record" aria-labelledby="h-record">
          <h2 id="h-record" data-rise>{RECORD.title}</h2>
          <p className="rule" data-rise>{RECORD.rule}</p>
          <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
          <ul className="results">
            {RECORD.results.map((r) => (
              <li key={r.who} data-rise>
                <span className="what">{r.what}</span>
                <span className="who">{r.who}</span>
                <span className="more">{r.more}</span>
              </li>
            ))}
          </ul>
          <A className="more-link" href={RECORD.more.href}>{RECORD.more.label}</A>
        </section>

        <section className="sheet drive" id="drive" data-cam="drive" aria-labelledby="h-drive">
          <h2 id="h-drive" data-rise>{DRIVE.title}</h2>
          <p className="lead" data-rise>{DRIVE.lead}</p>
          <dl>
            {DRIVE.items.map((it) => (
              <div key={it.term} data-rise><dt>{it.term}</dt><dd>{it.text}</dd></div>
            ))}
          </dl>
          <A className="more-link" href={DRIVE.more.href}>{DRIVE.more.label}</A>
        </section>

        <section className="sheet people" id="people" data-cam="people" aria-labelledby="h-people">
          <h2 id="h-people" data-rise>{PEOPLE.title}</h2>
          <div className="coaches">
            {PEOPLE.coaches.map((c) => (
              <article key={c.name} data-rise>
                <p className="role">{c.role}</p>
                <h3>{c.name}</h3>
                <p>{c.bio}</p>
              </article>
            ))}
          </div>
          <p className="count" data-rise>{PEOPLE.count}</p>
          <A className="more-link" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
        </section>

        <section className="sheet join" id="join" data-cam="join" aria-labelledby="h-join">
          <h2 id="h-join" data-rise>{JOIN.title}</h2>
          <p className="lead" data-rise>{JOIN.lead}</p>
          <ol className="paths">
            {JOIN.paths.map((p) => (
              <li key={p.id} data-rise>
                <A className="path-name" href={p.href}><span>{p.name}</span><span aria-hidden="true">→</span></A>
                <p className="line">{p.line}</p>
                {p.text.map((t) => <p key={t}>{t}</p>)}
              </li>
            ))}
          </ol>
          <p className="aside" data-rise>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
          <p className="aside" data-rise>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
          <p className="aside" data-rise>{JOIN.discord}</p>
        </section>
      </main>

      <footer className="sheet foot" data-cam="footer">
        <p className="foot-line">{FOOTER.line}</p>
        <ul className="links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <p className="small">
          <a href="#top">Back through the arch.</a>
          <span>Draft 2, version 49. Not the live site.</span>
        </p>
      </footer>
    </div>
  );
}
