// Version 67: the regress. A plaster question mark between two facing mirrors, its
// reflections running back into the dark, each one asking the one behind it.
// Scroll walks the camera through the glass, one reflection per section; at Join
// one mirror swings aside and a single question mark is left with the three ways in.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './regress.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { useRise } from '@/lib/motion';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { JOIN_ROOM, store } from './store';
import { MARK } from './geo';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children, onEnter }: { href: string; className?: string; children: React.ReactNode; onEnter?: () => void }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined} onPointerEnter={onEnter} onFocus={onEnter}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Without WebGL: the same corridor drawn flat, each mark smaller and dimmer. */
function Flat() {
  const vb = `${-MARK.w / 2 - 60} -1340 ${MARK.w + 120} 1640`;
  return (
    <div className="rg-flat" aria-hidden>
      {[1, 0.62, 0.4, 0.26, 0.17, 0.11].map((s, i) => (
        <svg key={i} viewBox={vb} style={{ width: `${s * 100}%`, opacity: Math.max(0.12, 1 - i * 0.2), transform: i % 2 ? 'scaleX(-1)' : undefined }}>
          <path d={MARK.d} />
        </svg>
      ))}
    </div>
  );
}

/** Turn the nearest way round to a given angle. */
function aimAt(a: number) {
  const twoPi = Math.PI * 2;
  store.aim = a + Math.round((store.yaw - a) / twoPi) * twoPi;
}

export default function Regress() {
  const [phone] = useState(isPhone);
  useVersion('regress', { anchorOffset: phone ? Math.round(window.innerHeight * 0.5) : 0 });
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [tilt, setTilt] = useState(false);
  useRise(root);
  const [word, sub] = SITE.heading.split(': ');

  useEffect(() => {
    store.onTilt = setTilt;
    store.open = -1; store.tilt = false; store.yaw = 0.35; store.spin = 0; store.aim = null;
    return () => { store.onTilt = () => {}; document.body.dataset.rgCur = ''; };
  }, []);

  // Where each section starts is where the camera arrives in the next reflection.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      const secs = Array.from(el.querySelectorAll<HTMLElement>('[data-stop]'));
      const vh = window.innerHeight;
      store.stops = secs.map((s, i) => (i === 0 ? 0 : Math.max(0, s.getBoundingClientRect().top + window.scrollY - vh * (phone ? 0.25 : 0.55))));
      store.invalidate();
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    const onScroll = () => { if (still) store.invalidate(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { ro.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, [phone]);

  const turn = () => { aimAt(store.yaw + Math.PI); if (still) { store.yaw = store.aim!; store.aim = null; } store.invalidate(); };
  const press = () => { store.tilt = !store.tilt; setTilt(store.tilt); store.invalidate(); };
  const face = (i: number) => () => { aimAt(Math.PI * (JOIN_ROOM % 2) + (i - 1) * 0.75); if (still) { store.yaw = store.aim!; store.aim = null; } store.invalidate(); };

  return (
    <div className="v-regress" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="rg-stage">
        {webgl ? <Suspense fallback={null}><Scene /></Suspense> : <Flat />}
      </div>

      <main id="main" className="rg-main">
        <section className="rg-sec rg-hero" data-stop aria-labelledby="rg-h1">
          <div className="rg-panel">
            <h1 id="rg-h1" className="rg-h1">
              <span className="rg-word">{word}</span><span className="sr-only-x">: </span>
              <span className="rg-sub">{sub}</span>
            </h1>
            <p className="rg-pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <ul className="rg-state">{HERO.statement.map((l) => <li key={l}>{l}</li>)}</ul>
            <div className="rg-doors">
              {HERO.doors.map((d, i) => <A key={d.href} className={i ? 'rg-door rg-door-b' : 'rg-door'} href={d.href}>{d.label}</A>)}
            </div>
            <p className="rg-hint">
              Drag the <button type="button" className="rg-word-btn" onClick={turn}>question</button>. Press the{' '}
              <button type="button" className="rg-word-btn" aria-pressed={tilt} onClick={press}>mirror</button>.
            </p>
          </div>
        </section>

        <section className="rg-sec" data-stop aria-labelledby="rg-man">
          <div className="rg-panel">
            <p className="rg-depth" data-rise>Reflection 1</p>
            <h2 id="rg-man" className="sr-only-x">Manifesto</h2>
            <ol className="rg-man">{MANIFESTO.map((l) => <li key={l} data-rise>{l}</li>)}</ol>
          </div>
        </section>

        <section id="record" className="rg-sec" data-stop aria-labelledby="rg-rec">
          <div className="rg-panel">
            <p className="rg-depth" data-rise>Reflection 2</p>
            <h2 id="rg-rec" className="rg-h2" data-rise>{RECORD.title}</h2>
            <p className="rg-lead" data-rise>{RECORD.rule}</p>
            <p className="rg-event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="rg-results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="rg-what">{r.what}</span>
                  <span className="rg-who">{r.who}</span>
                  <span className="rg-more-t">{r.more}</span>
                </li>
              ))}
            </ul>
            <A className="rg-more" href={RECORD.more.href}>{RECORD.more.label}</A>
          </div>
        </section>

        <section id="drive" className="rg-sec" data-stop aria-labelledby="rg-drv">
          <div className="rg-panel">
            <p className="rg-depth" data-rise>Reflection 3</p>
            <h2 id="rg-drv" className="rg-h2" data-rise>{DRIVE.title}</h2>
            <p className="rg-lead" data-rise>{DRIVE.lead}</p>
            <dl className="rg-drive">
              {DRIVE.items.map((d) => (
                <div key={d.term} data-rise><dt>{d.term}</dt><dd>{d.text}</dd></div>
              ))}
            </dl>
            <A className="rg-more" href={DRIVE.more.href}>{DRIVE.more.label}</A>
          </div>
        </section>

        <section id="people" className="rg-sec" data-stop aria-labelledby="rg-ppl">
          <div className="rg-panel">
            <p className="rg-depth" data-rise>Reflection 4</p>
            <h2 id="rg-ppl" className="rg-h2" data-rise>{PEOPLE.title}</h2>
            <ul className="rg-people">
              {PEOPLE.coaches.map((c) => (
                <li key={c.name} data-rise>
                  <span className="rg-role">{c.role}</span>
                  <span className="rg-name">{c.name}</span>
                  <span className="rg-bio">{c.bio}</span>
                </li>
              ))}
            </ul>
            <p className="rg-count" data-rise>{PEOPLE.count}</p>
            <A className="rg-more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
          </div>
        </section>

        <section id="join" className="rg-sec rg-join" data-stop aria-labelledby="rg-jn">
          <div className="rg-panel">
            <p className="rg-depth" data-rise>One question left</p>
            <h2 id="rg-jn" className="rg-h2" data-rise>{JOIN.title}</h2>
            <p className="rg-lead" data-rise>{JOIN.lead}</p>
            <ol className="rg-paths">
              {JOIN.paths.map((p, i) => (
                <li key={p.id} data-rise>
                  <A className="rg-path" href={p.href} onEnter={face(i)}>
                    <span className="rg-path-n">{p.name}</span>
                    <span className="rg-path-l">{p.line}</span>
                  </A>
                  <div className="rg-path-t">{p.text.map((t) => <p key={t}>{t}</p>)}</div>
                </li>
              ))}
            </ol>
            <div className="rg-after" data-rise>
              <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
              <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
              <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
              <p>{JOIN.discord} <A href={SITE.discord}>Discord</A></p>
            </div>
          </div>
        </section>

        <footer className="rg-foot">
          <p className="rg-foot-line">{FOOTER.line}</p>
          <ul className="rg-foot-links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="rg-foot-pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <p className="rg-draft">Draft 2, version 67. Not the live site.</p>
        </footer>
      </main>
    </div>
  );
}
