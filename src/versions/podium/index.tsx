// Version 40: the podium. An empty hall, one lectern, one light. The site is
// the speech given from it, one line at a time, and the camera walks down the
// aisle as you read. At the record the house lights come up a little; at Join
// three more spots find three marks on the stage.
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './podium.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import MARKS from '@/lib/marks.json';
import { scrollToY } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { stage } from './stage';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children, onFocus, onBlur }: { href: string; className?: string; children: ReactNode; onFocus?: () => void; onBlur?: () => void }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined} onFocus={onFocus} onBlur={onBlur}>{children}</a>
);

/** A line of the speech: its words arrive one after another, as they are said. */
function Say({ text, as: Tag = 'p', className, at = 0 }: { text: string; as?: 'p' | 'h2' | 'h3' | 'span'; className?: string; at?: number }) {
  const words = text.split(' ');
  return (
    <Tag className={`say ${className ?? ''}`}>
      {words.map((w, i) => (
        <span key={i} className="w" style={{ ['--i' as string]: i + at }}>{w}{i < words.length - 1 ? ' ' : ''}</span>
      ))}
    </Tag>
  );
}

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

function Mark() {
  const m = MARKS.italic;
  return (
    <svg className="qm" viewBox="-470 -770 940 1540" aria-hidden="true">
      <path d={m.d} />
    </svg>
  );
}

// The sections, in order. Each one is a beat of the speech and a camera key in Scene.tsx.
const LINE = 'beat';

export default function Podium() {
  useVersion('podium');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [lit, setLit] = useState(still || !webgl);
  const [card, setCard] = useState(0);
  const [pick, setPick] = useState(-1);
  const [near, setNear] = useState(-1);

  useEffect(() => { stage.pick = pick; }, [pick]);
  useEffect(() => { stage.near = near; }, [near]);

  // The opening: the hall is dark until the spot strikes; then the name is said.
  useEffect(() => {
    stage.onReady = () => setTimeout(() => setLit(true), 1150);
    const t = setTimeout(() => setLit(true), 6000);
    return () => { clearTimeout(t); stage.onReady = null; };
  }, []);

  // One loop reads the scroll and tells the hall and the subtitles where the speech is.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const beats = [...el.querySelectorAll<HTMLElement>('[data-beat]')];
    let tops: number[] = [], heights: number[] = [];
    const measure = () => {
      tops = beats.map((b) => b.getBoundingClientRect().top + window.scrollY);
      heights = beats.map((b) => b.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    let raf = 0, lastCard = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const y = window.scrollY, vh = window.innerHeight;
      let i = 0;
      while (i < beats.length - 1 && y >= tops[i + 1]) i++;
      const local = clamp((y - tops[i]) / Math.max(1, heights[i]));
      stage.cam = i + local;
      // House lights: up a little while the record is spoken.
      const rec = beats.findIndex((b) => b.id === 'record');
      stage.house = clamp(1 - Math.abs(stage.cam - (rec + 0.45)) / 0.75);
      const j = beats.findIndex((b) => b.id === 'join');
      const qj = (y - tops[j]) / Math.max(1, heights[j] - vh);
      const endTop = tops[beats.length - 1];
      stage.end = clamp((y - endTop + vh * 0.6) / (vh * 0.9));
      stage.join = clamp((qj + 0.15) / 0.5) * (1 - stage.end);
      beats.forEach((b, k) => {
        const q = (y - tops[k]) / Math.max(1, heights[k] - vh);
        const on = still || (k === 0 ? q < 0.86 : k === beats.length - 1 ? y > endTop - vh * 0.5 : q > -0.04 && q < 0.88);
        if ((b.dataset.on === '1') !== on) b.dataset.on = on ? '1' : '0';
        if (b.id === 'drive') {
          const c = Math.min(DRIVE.items.length - 1, Math.max(0, Math.floor(clamp((q - 0.06) / 0.84) * DRIVE.items.length)));
          stage.card = c;
          if (c !== lastCard) { lastCard = c; setCard(c); }
        }
      });
      el.style.setProperty('--scrim', String(1 + stage.join * 0.5 + stage.house * 0.3));
    };
    tick();
    const onMove = (e: PointerEvent) => {
      if (still) return;
      stage.px = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
      stage.py = clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('pointermove', onMove); };
  }, []);

  /** Go to one of the drive's cards: scroll to its place in the section. */
  const toCard = (i: number) => {
    const el = document.getElementById('drive'); if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    const q = 0.06 + ((i + 0.5) / DRIVE.items.length) * 0.84;
    if (still) setCard(i);
    scrollToY(top + span * q);
  };

  const beat = (id: string | undefined, cls: string, children: ReactNode, label?: string) => (
    <section key={id ?? label} className={`${LINE} ${cls}`} data-beat id={id} data-on={still ? '1' : '0'} aria-label={label}>
      <div className="hold">{children}</div>
    </section>
  );

  return (
    <div ref={root} className={`v-podium ${lit ? 'is-lit' : ''} ${webgl ? '' : 'no-gl'}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="hall" aria-hidden="true">
        {webgl && <Suspense fallback={null}><Scene /></Suspense>}
        <div className="sky" />
      </div>

      <main id="main">
        {/* 0. The name, and the pitch. */}
        <section className={`${LINE} b-open`} data-beat data-on="1">
          <div className="hold">
            <h1 className="name">
              <span className="sr-only-x">{SITE.heading}</span>
              <span className="word" aria-hidden="true">Skeptical<Mark /></span>
            </h1>
            <div className="pitch">
              {HERO.pitch.map((l, i) => <Say key={l} text={l} at={6 + i * 5} />)}
            </div>
            <p className="cue" aria-hidden="true"><span>Scroll, and the speech begins</span></p>
          </div>
        </section>

        {/* 1 to 3. The statement, a line at a time. The doors after the last. */}
        {HERO.statement.map((l, i) => beat(undefined, 'b-line', (
          <>
            <Say text={l} as="h2" className="line" />
            {i === HERO.statement.length - 1 && (
              <div className="doors">
                {HERO.doors.map((d) => <A key={d.href} href={d.href} className="door">{d.label}</A>)}
              </div>
            )}
          </>
        ), l))}

        {/* 4 to 7. The manifesto. */}
        {MANIFESTO.map((l) => beat(undefined, 'b-line b-man', <Say text={l} className="line line-m" />, l.slice(0, 30)))}

        {/* 8. The record: the house lights come up. */}
        {beat('record', 'b-record', (
          <>
            <Say text={RECORD.title} as="h2" className="title" />
            <p className="rule">{RECORD.rule}</p>
            <p className="event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="results">
              {RECORD.results.map((r) => (
                <li key={r.who}>
                  <span className="what">{r.what}</span>
                  <span className="who">{r.who}</span>
                  <span className="more">{r.more}</span>
                </li>
              ))}
            </ul>
            <A href={RECORD.more.href} className="link">{RECORD.more.label}</A>
          </>
        ))}

        {/* 9. The drive: seven cards on the lectern, read one at a time. */}
        {beat('drive', `b-drive ${still ? 'is-list' : ''}`, (
          <div className="drive-in">
            <Say text={DRIVE.title} as="h2" className="title" />
            <p className="lead">{DRIVE.lead}</p>
            <ol className="cards">
              {DRIVE.items.map((it, i) => (
                <li key={it.term} className={card === i ? 'is-on' : ''}>
                  <button type="button" className="term" aria-pressed={card === i} onClick={() => toCard(i)}>{it.term}</button>
                  <p className="text">{it.text}</p>
                </li>
              ))}
            </ol>
            <A href={DRIVE.more.href} className="link">{DRIVE.more.label}</A>
          </div>
        ))}

        {/* 10 to 11. The people. */}
        {PEOPLE.coaches.map((c, i) => beat(i === 0 ? 'people' : undefined, 'b-person', (
          <>
            {i === 0 && <h2 className="kick-title">{PEOPLE.title}</h2>}
            <Say text={c.name} as="h3" className="person" />
            <p className="role">{c.role}</p>
            <p className="bio">{c.bio}</p>
            {i === 1 && (
              <p className="count">{PEOPLE.count} <A href={PEOPLE.more.href} className="link">{PEOPLE.more.label}</A></p>
            )}
          </>
        ), c.name))}

        {/* 12. Join: three spots, three marks, three ways in. */}
        {beat('join', 'b-join', (
          <>
            <div className="join-head">
              <Say text={JOIN.title} as="h2" className="title" />
              <p className="lead">{JOIN.lead}</p>
            </div>
            <ul className="paths">
              {JOIN.paths.map((p, i) => (
                <li key={p.id} className={`${pick === i ? 'is-pick' : ''} ${near === i ? 'is-near' : ''}`}>
                  <button type="button" className="path" aria-expanded={pick === i} aria-controls={`path-${p.id}`}
                    onClick={() => setPick(pick === i ? -1 : i)}
                    onPointerEnter={() => setNear(i)} onPointerLeave={() => setNear(-1)} onFocus={() => setNear(i)} onBlur={() => setNear(-1)}>
                    <span className="pname">{p.name}</span>
                    <span className="pline">{p.line}</span>
                  </button>
                  <p className="pfirst">{p.text[0]}</p>
                  <div className="prest" id={`path-${p.id}`} hidden={pick !== i && !still}>
                    {p.text.slice(1).map((t) => <p key={t}>{t}</p>)}
                    <A href={p.href} className="link">{p.line}</A>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ))}

        {/* 13. The close: the last line, then the light goes. */}
        <section className="beat b-end" data-beat data-on={still ? '1' : '0'} aria-label="Close">
          <div className="end-in">
            <div className="also">
              <p>{JOIN.already.before}<A href={JOIN.already.href} className="link">{JOIN.already.label}</A></p>
              <p>{JOIN.coach.before}<A href={JOIN.coach.href} className="link">{JOIN.coach.label}</A></p>
              <p>{JOIN.also} <A href={`mailto:${SITE.email}`} className="link">{SITE.email}</A></p>
              <p>{JOIN.discord}</p>
            </div>
            <Say text={FOOTER.line} className="last" />
            <footer className="foot">
              <ul className="links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
              <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
              <div className="fine">
                <p>Draft 2, version 40. Not the live site.</p>
                <button type="button" className="top" onClick={() => scrollToY(0)}>From the top</button>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
