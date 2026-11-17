// Version 86: the trophy. One tall tournament trophy in a dark gallery. Almost every
// plate on its base is blank; two are engraved with the only two results there are.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './trophy.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Loader } from '@/components/Loader';
import { FACET, readName, saveName, T } from './store';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const ROMAN = ['I', 'II', 'III', 'IV'];

export default function Trophy() {
  useVersion('trophy');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const [opened, setOpened] = useState(still || !webgl);
  const [name, setName] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // A name engraved on an earlier visit is already there.
  useEffect(() => {
    const n = readName();
    T.plate = { text: n.toUpperCase(), start: 0, dur: 0, ver: T.plate.ver + 1 };
    setName(n); setDraft(n);
  }, []);

  // Where the camera is: each section takes over as its top climbs the screen.
  useEffect(() => {
    const els = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-shot]') ?? []);
    T.sections = els;
    const tick = () => {
      const h = window.innerHeight;
      let f = 0;
      for (let i = 1; i < els.length; i++) {
        const top = els[i].getBoundingClientRect().top;
        const w = clamp((h * 0.92 - top) / (h * 0.62));
        f += w * w * (3 - 2 * w);
      }
      T.f = f;
      const r = root.current; if (r) { const v = f < 5.5 ? '1' : '0'; if (r.dataset.scrim !== v) r.dataset.scrim = v; }
      const stop = Math.round(f);
      if (stop !== T.stop) {
        T.stop = stop;
        // Scrolling brings it back round to face the section.
        const t = T.turn; t.flick = 0; t.g = Math.round(t.g / (Math.PI * 2)) * Math.PI * 2;
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  const onOpened = useCallback(() => { T.opened = true; T.openedAt = performance.now(); setOpened(true); }, []);

  // Drag turns the trophy on its turntable.
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stage.current; if (!el || still) return;
    const t = T.turn;
    const down = (e: PointerEvent) => { t.drag = true; t.lastX = e.clientX; t.lastT = performance.now(); t.flick = 0; el.classList.add('is-drag'); };
    const move = (e: PointerEvent) => {
      if (!t.drag) return;
      const now = performance.now(), dx = e.clientX - t.lastX, dtm = Math.max(8, now - t.lastT);
      const k = 0.0085 * (phone ? 1.4 : 1);
      t.g += dx * k;
      t.flick = t.flick * 0.4 + ((dx * k) / (dtm / 1000)) * 0.6;
      t.lastX = e.clientX; t.lastT = now;
    };
    const up = () => { if (!t.drag) return; t.drag = false; if (performance.now() - t.lastT > 90) t.flick = 0; el.classList.remove('is-drag'); };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [phone]);

  const nudge = (dir: number) => { const t = T.turn; t.flick = 0; t.g = Math.round(t.g / FACET) * FACET + dir * FACET; };

  const engrave = (e: React.FormEvent) => {
    e.preventDefault();
    const v = draft.replace(/\s+/g, ' ').trim().slice(0, 22);
    if (!v || busy) return;
    saveName(v); setName(v); setDraft(v);
    const dur = still ? 0 : 420 + v.length * 260;
    T.plate = { text: v.toUpperCase(), start: performance.now(), dur, ver: T.plate.ver + 1 };
    if (dur) { setBusy(true); setTimeout(() => setBusy(false), dur + 100); }
  };
  const clear = () => { saveName(''); setName(''); setDraft(''); T.plate = { text: '', start: 0, dur: 0, ver: T.plate.ver + 1 }; };

  return (
    <div ref={root} className={`v-trophy${opened ? ' is-open' : ''}${webgl ? '' : ' is-flat'}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl && (
        <div ref={stage} className="stage" aria-hidden="true">
          <Suspense fallback={null}><Scene phone={phone} /></Suspense>
        </div>
      )}
      {webgl && !still && <Loader onDone={onOpened} bg="#0d0c0b" ink="#eee8dc" font="400 clamp(4rem, 14vw, 11rem)/0.9 'Bodoni Moda Variable', serif" />}
      {webgl && still && <OpenNow onOpen={onOpened} />}

      <header className="bar">
        <a className="brand" href="#top" aria-label="Skeptical, top of the page">Skeptical<span aria-hidden="true">?</span></a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section id="top" className="sec hero" data-shot="0" aria-labelledby="h-hero">
          <div className="col">
            <p className="eyebrow">{SITE.heading}</p>
            <h1 id="h-hero" className="pitch">
              {HERO.pitch.map((l, i) => <span key={i} className="ln"><span>{l}</span></span>)}
            </h1>
            <ul className="statement">
              {HERO.statement.map((l) => <li key={l}>{l}</li>)}
            </ul>
            <div className="doors">
              {HERO.doors.map((d, i) => <A key={d.href} className={`door${i === 0 ? ' is-main' : ''}`} href={d.href}>{d.label}</A>)}
            </div>
          </div>
          {webgl && (
            <div className="turn">
              <button type="button" onClick={() => nudge(-1)} aria-label="Turn the trophy left">Left</button>
              <span>Drag the trophy to turn it.</span>
              <button type="button" onClick={() => nudge(1)} aria-label="Turn the trophy right">Right</button>
            </div>
          )}
        </section>

        <section className="sec manifesto" data-shot="1" aria-label="What we are">
          <ol className="col">
            {MANIFESTO.map((l, i) => (
              <li key={i} data-rise><span className="num" aria-hidden="true">{ROMAN[i]}</span><span className="txt">{l}</span></li>
            ))}
          </ol>
        </section>

        <section id="record" className="sec record" data-shot="2" aria-labelledby="h-record">
          <div className="col">
            <h2 id="h-record" className="title" data-rise>{RECORD.title}</h2>
            <p className="rule" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise>{RECORD.when}. {RECORD.name}. {RECORD.where}.</p>
            <ul className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="who">{r.who}</span>
                  <span className="what">{r.what}</span>
                  <span className="more">{r.more}</span>
                </li>
              ))}
            </ul>
            <A className="more-link" href={RECORD.more.href}>{RECORD.more.label}</A>
          </div>
        </section>

        <section id="drive" className="sec drive" data-shot="3" aria-labelledby="h-drive">
          <div className="col field">
            <h2 id="h-drive" className="title" data-rise>{DRIVE.title}</h2>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((it) => (
                <div key={it.term} data-rise><dt>{it.term}</dt><dd>{it.text}</dd></div>
              ))}
            </dl>
            <A className="more-link" href={DRIVE.more.href}>{DRIVE.more.label}</A>
          </div>
        </section>

        <section id="people" className="sec people" data-shot="4" aria-labelledby="h-people">
          <div className="col field">
            <h2 id="h-people" className="title" data-rise>{PEOPLE.title}</h2>
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => (
                <li key={c.name} data-rise>
                  <span className="role">{c.role}</span>
                  <span className="cname">{c.name}</span>
                  <span className="bio">{c.bio}</span>
                </li>
              ))}
            </ul>
            <p className="count" data-rise>{PEOPLE.count}</p>
            <A className="more-link" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
          </div>
        </section>

        <section id="join" className="sec join" data-shot="5" aria-labelledby="h-join">
          <div className="col field">
            <h2 id="h-join" className="title" data-rise>{JOIN.title}</h2>
            <form className="engrave" onSubmit={engrave} data-rise>
              <label htmlFor="plate-name">There is a blank plate. Put your name on it.</label>
              <div className="row">
                <input id="plate-name" value={draft} maxLength={22} autoComplete="off" spellCheck={false}
                  onChange={(e) => setDraft(e.target.value)} placeholder="Your name" />
                <button type="submit" disabled={busy || !draft.trim()}>{busy ? 'Cutting' : 'Engrave'}</button>
              </div>
              <p className="note" aria-live="polite">
                {name ? <>Engraved: {name}. Kept on this device. <button type="button" className="clear" onClick={clear}>Clear the plate</button></> : 'Only your name. Nothing else goes on it.'}
              </p>
              {!webgl && <div className="flat-plate" aria-hidden="true"><span>{name || ' '}</span></div>}
            </form>
            <p className="lead" data-rise>{JOIN.lead}</p>
            <ol className="paths">
              {JOIN.paths.map((p, i) => (
                <li key={p.id} data-rise>
                  <A href={p.href} className="path">
                    <span className="pn" aria-hidden="true">{ROMAN[i]}</span>
                    <span className="pname">{p.name}</span>
                    <span className="pline">{p.line}</span>
                    <span className="ptext">{p.text[0]}</span>
                  </A>
                </li>
              ))}
            </ol>
            <div className="small" data-rise>
              <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>.</p>
              <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
              <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
              <p>{JOIN.discord}</p>
            </div>
          </div>
        </section>

        <footer className="sec end" data-shot="6">
          <div className="foot">
            <p className="line">{FOOTER.line}</p>
            <ul className="links">
              {FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
            </ul>
            <ul className="pages">
              {FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
            </ul>
            <p className="draft">Draft 2, version 86. Not the live site.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function OpenNow({ onOpen }: { onOpen: () => void }) {
  useEffect(() => { onOpen(); }, [onOpen]);
  return null;
}
