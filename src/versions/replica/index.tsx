// Version 76: the replica. A marble figure on a plinth is rebuilt block by block in
// black bronze as you scroll, from the base upward, until at Join nothing original is left.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './replica.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap, scroll } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { clamp, isPhone, smooth, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Loader } from '@/components/Loader';
import { rig } from './store';

const Scene = lazy(() => import('./Scene'));
const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch { return false; }
}

const Arrow = () => (
  <svg className="arr" viewBox="0 0 22 12" aria-hidden="true"><path d="M0 6h20M15 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
);

export default function Replica() {
  useVersion('replica');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [phone, setPhone] = useState(isPhone);
  const [lit, setLit] = useState(still || !webgl);
  const [loaded, setLoaded] = useState(false);
  useRise(root);
  rig.phone = phone;

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Scroll to view: each [data-view] section's top is one state of the statue.
  useEffect(() => {
    const el = root.current; if (!el) return;
    let stops: number[] = [];
    const measure = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      stops = [...el.querySelectorAll<HTMLElement>('[data-view]')].map((s, i) => {
        if (i === 0) return 0;
        const r = s.getBoundingClientRect();
        return clamp(r.top + scrollY - (phone ? 0 : innerHeight * 0.08), 0, max);
      });
    };
    const tick = () => {
      const y = scroll.y;
      let at = 0;
      for (let i = 0; i < stops.length - 1; i++) {
        if (y >= stops[i] && y <= stops[i + 1]) {
          const u = (y - stops[i]) / Math.max(1, stops[i + 1] - stops[i]);
          // Hold each view for the first part of its section, then travel.
          at = i + smooth(clamp((u - 0.38) / 0.56));
          if (i === 3) rig.driveU = clamp((u - 0.04) / 0.5);
          break;
        }
        if (y > stops[i + 1]) at = i + 1;
      }
      if (y < stops[3]) rig.driveU = 0;
      rig.at = at;
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    gsap.ticker.add(tick);
    return () => { ro.disconnect(); gsap.ticker.remove(tick); };
  }, [phone]);

  useEffect(() => {
    if (!webgl || still) return;
    const on = (e: PointerEvent) => { rig.px = (e.clientX / innerWidth) * 2 - 1; rig.py = (e.clientY / innerHeight) * 2 - 1; };
    window.addEventListener('pointermove', on);
    return () => window.removeEventListener('pointermove', on);
  }, [webgl]);

  // The opening: the gallery is dark, then the key light comes up on the marble.
  const onDone = useCallback(() => {
    if (still) { rig.light = 1; setLit(true); return; }
    gsap.to(rig, { light: 1, duration: 2.6, ease: 'power2.inOut' });
    setTimeout(() => setLit(true), 700);
  }, []);
  const onReady = useCallback(() => setLoaded(true), []);
  useEffect(() => { if (!webgl) rig.light = 1; const t = setTimeout(() => { setLit(true); rig.light = 1; }, 9000); return () => clearTimeout(t); }, [webgl]);

  return (
    <div ref={root} className={'v-replica' + (lit ? ' lit' : '') + (webgl ? '' : ' flat')}>
      <a className="skip-x" href="#main">Skip to the text</a>

      {webgl && (
        <div className="stage" aria-hidden="true">
          <Suspense fallback={null}>
            <Scene onReady={onReady} />
          </Suspense>
        </div>
      )}
      {webgl && <LoaderGate loaded={loaded} onDone={onDone} />}

      <header className="top">
        <a className="mark" href="#top" aria-label="Skeptical, back to the start">Skeptical<i>?</i></a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="sec s-hero" id="top" data-view>
          <div className="win" />
          <div className="col">
            <h1 className="pitch">
              <span className="sr-only-x">{SITE.heading}. </span>
              {HERO.pitch.map((l) => <span key={l} className="pl" aria-hidden="true"><span>{l}</span></span>)}
            </h1>
            <p className="say">{HERO.statement.map((l) => <span key={l}>{l} </span>)}</p>
            <div className="doors">
              {HERO.doors.map((d) => <a key={d.href} className="door" href={d.href} {...ext(d.href)}>{d.label}<Arrow /></a>)}
            </div>
            {webgl && (
              <p className="press">
                <button type="button" onClick={() => rig.next()}>Replace a block</button>
                <span>or press the statue.</span>
              </p>
            )}
          </div>
        </section>

        <section className="sec s-man" aria-labelledby="man-h" data-view>
          <div className="win" />
          <div className="col">
            <h2 id="man-h" className="sr-only-x">What we are.</h2>
            <ol className="man" data-rise>
              {MANIFESTO.map((l) => <li key={l}>{l}</li>)}
            </ol>
          </div>
        </section>

        <section className="sec s-rec" id="record" aria-labelledby="rec-h" data-view>
          <div className="win" />
          <div className="col">
            <h2 id="rec-h" className="ttl">{RECORD.title}</h2>
            <p className="rule" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <p className="what">{r.what}</p>
                  <p className="who">{r.who}</p>
                  <p className="more">{r.more}</p>
                </li>
              ))}
            </ul>
            <a className="go" href={RECORD.more.href} {...ext(RECORD.more.href)}>{RECORD.more.label}<Arrow /></a>
          </div>
        </section>

        <section className="sec s-drive" id="drive" aria-labelledby="drive-h" data-view>
          <div className="win" />
          <div className="col">
            <h2 id="drive-h" className="ttl">{DRIVE.title}</h2>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="drawer">
              {DRIVE.items.map((it) => (
                <div key={it.term} className="it" data-rise>
                  <dt>{it.term}</dt>
                  <dd>{it.text}</dd>
                </div>
              ))}
            </dl>
            <a className="go" href={DRIVE.more.href} {...ext(DRIVE.more.href)}>{DRIVE.more.label}<Arrow /></a>
          </div>
        </section>

        <section className="sec s-people" id="people" aria-labelledby="people-h" data-view>
          <div className="win" />
          <div className="col">
            <h2 id="people-h" className="ttl">{PEOPLE.title}</h2>
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => (
                <li key={c.name} data-rise>
                  <p className="name">{c.name}</p>
                  <p className="role">{c.role}</p>
                  <p className="bio">{c.bio}</p>
                </li>
              ))}
            </ul>
            <p className="count" data-rise>{PEOPLE.count}</p>
            <a className="go" href={PEOPLE.more.href} {...ext(PEOPLE.more.href)}>{PEOPLE.more.label}<Arrow /></a>
          </div>
        </section>

        <section className="sec s-same" aria-labelledby="same-h" data-view>
          <div className="win" />
          <div className="col">
            <h2 id="same-h" className="same"><span>Every block replaced.</span><span>Same statue?</span></h2>
            <p className="say">{MANIFESTO[1]}</p>
            {webgl && <HoldOriginal />}
          </div>
        </section>

        <section className="field" id="join" aria-labelledby="join-h">
          <div className="field-in">
            <h2 id="join-h" className="ttl">{JOIN.title}</h2>
            <p className="lead">{JOIN.lead}</p>
            <ol className="paths">
              {JOIN.paths.map((p) => (
                <li key={p.id} className="path" data-rise>
                  <h3>{p.name}</h3>
                  <a className="line" href={p.href} {...ext(p.href)}>{p.line}<Arrow /></a>
                  {p.text.map((t) => <p key={t}>{t}</p>)}
                </li>
              ))}
            </ol>
            <div className="also">
              <p>{JOIN.already.before}<a href={JOIN.already.href} {...ext(JOIN.already.href)}>{JOIN.already.label}</a>.</p>
              <p>{JOIN.coach.before}<a href={JOIN.coach.href} {...ext(JOIN.coach.href)}>{JOIN.coach.label}</a>.</p>
              <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
              <p>{JOIN.discord}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <p className="fline">{FOOTER.line}</p>
        <div className="frows">
          <ul>{FOOTER.links.map((l) => <li key={l.href}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}</ul>
          <ul>{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}</ul>
        </div>
        <p className="draft">Draft 2, version 76. Not the live site.</p>
      </footer>
    </div>
  );
}

/** The loader counts the scan in; the lights wait until the statue is really there. */
function LoaderGate({ loaded, onDone }: { loaded: boolean; onDone: () => void }) {
  const pending = useRef(false), fired = useRef(false);
  const fire = useCallback(() => { if (fired.current) return; fired.current = true; onDone(); }, [onDone]);
  useEffect(() => { if (loaded && (pending.current || still)) fire(); }, [loaded, fire]);
  if (still) return null;
  return <Loader onDone={() => { if (loaded) fire(); else pending.current = true; }} bg="#0c0c0c" ink="#eeeae1" font="400 clamp(5rem, 16vw, 13rem)/0.8 'Bodoni Moda Variable', serif" />;
}

/** Press and hold to put the original marble back, for as long as you hold. */
function HoldOriginal() {
  const [held, setHeld] = useState(false);
  const set = (v: boolean) => { rig.original = v; setHeld(v); };
  useEffect(() => () => { rig.original = false; }, []);
  return (
    <p className="press hold">
      <button
        type="button"
        aria-pressed={held}
        onPointerDown={() => set(true)}
        onPointerUp={() => set(false)}
        onPointerLeave={() => held && set(false)}
        onPointerCancel={() => set(false)}
        onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); set(true); } }}
        onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') set(false); }}
        onBlur={() => set(false)}
      >
        {held ? 'The first statue' : 'Hold to see the first one'}
      </button>
    </p>
  );
}
