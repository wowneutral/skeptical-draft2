import { useEffect, useRef } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import './angle.css';
import { useVersion } from '@/lib/version';
import { useRise } from '@/lib/motion';
import { still, coarse } from '@/lib/utils';
import marks from '@/lib/marks.json';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { Strip } from './Strip';
import { start, stand, view } from './engine';

const END = FOOTER.line.split(/(?<=\.)\s+/);
const Q = (marks as { roman: { d: string } }).roman.d;

function Arrow() {
  return (
    <svg className="arr" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 12h15M13 5.5 19.5 12 13 18.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
    </svg>
  );
}

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || still) return;
    // where you stand: the pointer across the whole screen, or a drag on the strip
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || view.intro) return;
      stand((e.clientX / window.innerWidth) * 2.3 - 1.15);
    };
    let x0 = 0, p0 = 0, dragging = false;
    // a phone is a lenticular card already: tilting it turns the print
    let tilt = 0, off = 0, tilting = false, asked = false;
    const orient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || view.intro || dragging) return;
      if (!tilting) { tilting = true; off = view.t; }
      tilt = Math.max(-1.3, Math.min(1.3, e.gamma / 20));
      stand(off + tilt);
    };
    const ask = () => {
      if (asked) return;
      asked = true;
      const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => 'denied');
    };
    if (coarse) window.addEventListener('deviceorientation', orient);
    const down = (e: PointerEvent) => { if (e.pointerType === 'mouse') return; ask(); dragging = true; x0 = e.clientX; p0 = view.t; view.intro = false; };
    const drag = (e: PointerEvent) => {
      if (!dragging) return;
      const t = p0 + ((e.clientX - x0) / window.innerWidth) * 3;
      stand(t);
      off = t - tilt;
    };
    const up = () => { dragging = false; };
    window.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', drag);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', drag);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('deviceorientation', orient);
    };
  }, []);
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      view.intro = false;
      stand(view.t + (e.key === 'ArrowRight' ? 0.35 : -0.35));
    }
  };
  return (
    <div className="hero" ref={ref} onKeyDown={key}>
      <Strip a={SITE.name} b="?" look="hero" hero className="s-hero" />
      <p className="hint" aria-hidden="true">{coarse ? 'Tilt it, or drag across it.' : 'Change where you stand.'}</p>
    </div>
  );
}

export default function Angle() {
  useVersion('angle');
  const root = useRef<HTMLDivElement>(null);
  useRise(root);
  useEffect(() => start(), []);

  return (
    <div className="v-angle" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top">
        <a href="#main" className="mark">
          <svg viewBox="-491 -770 982 1540" aria-hidden="true" focusable="false"><path d={Q} /></svg>
          <span>{SITE.name}</span>
        </a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="open" aria-labelledby="h1">
          <Hero />
          <div className="open-copy">
            <h1 id="h1">{SITE.heading}.</h1>
            <div className="doors">
              {HERO.doors.map((d) => (
                <a key={d.href} href={d.href} className="door">
                  <span>{d.label}</span><Arrow />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="band" aria-label="The pitch">
          <Strip a={HERO.pitch[0]} b={HERO.pitch[1]} look="plain" className="s-l" />
          <div className="plain two" data-rise>
            {HERO.pitch.map((l) => <p key={l} className="big">{l}</p>)}
          </div>
          <Strip a={HERO.statement[0]} b={HERO.statement[2]} look="plain" className="s-m narrow" />
          <div className="plain three" data-rise>
            {HERO.statement.map((l) => <p key={l} className="mid">{l}</p>)}
          </div>
        </section>

        <section className="band mani" aria-label="What we are">
          <div className="pair">
            <div>
              <Strip a={MANIFESTO[0]} b={MANIFESTO[1]} look="plain" className="s-m" />
              <div className="plain" data-rise>
                <p className="mid">{MANIFESTO[0]}</p>
                <p className="mid">{MANIFESTO[1]}</p>
              </div>
            </div>
            <div>
              <Strip a={MANIFESTO[2]} b={MANIFESTO[3]} look="plain" className="s-m" />
              <div className="plain" data-rise>
                <p className="mid">{MANIFESTO[2]}</p>
                <p className="mid">{MANIFESTO[3]}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="band" id="record" aria-labelledby="h-record">
          <Strip a={RECORD.title} b={RECORD.rule} look="plain" className="s-l" />
          <div className="plain head" data-rise>
            <h2 id="h-record" className="title">{RECORD.title}</h2>
            <p className="mid">{RECORD.rule}</p>
          </div>
          <p className="event" data-rise>
            <span>{RECORD.when}.</span> <span>{RECORD.name}.</span> <span>{RECORD.where}.</span>
          </p>
          <div className="pair">
            {RECORD.results.map((r) => (
              <div key={r.who}>
                <Strip a={r.who} b={r.what} look="plain" className="s-m" />
                <div className="plain" data-rise>
                  <p className="who">{r.who}</p>
                  <p className="mid">{r.what}.</p>
                  <p className="body">{r.more}</p>
                </div>
              </div>
            ))}
          </div>
          <a className="more" href={RECORD.more.href}><span>{RECORD.more.label}</span><Arrow /></a>
        </section>

        <section className="band" id="drive" aria-labelledby="h-drive">
          <div className="plain head" data-rise>
            <h2 id="h-drive" className="title">{DRIVE.title}</h2>
            <p className="mid">{DRIVE.lead}</p>
          </div>
          <ul className="labels">
            {DRIVE.items.map((d) => (
              <li key={d.term}>
                <Strip a={d.term} b={d.text} look="plain" className="s-s" />
                <p className="body"><strong>{d.term}.</strong> {d.text}</p>
              </li>
            ))}
          </ul>
          <a className="more" href={DRIVE.more.href}><span>{DRIVE.more.label}</span><Arrow /></a>
        </section>

        <section className="band" id="people" aria-labelledby="h-people">
          <div className="plain head" data-rise>
            <h2 id="h-people" className="title">{PEOPLE.title}</h2>
          </div>
          <div className="pair">
            {PEOPLE.coaches.map((c) => (
              <div key={c.name}>
                <Strip a={c.name} b={c.role} look="plain" className="s-t" />
                <div className="plain" data-rise>
                  <p className="who">{c.name}</p>
                  <p className="mid">{c.role}.</p>
                  <p className="body">{c.bio}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="count" data-rise>{PEOPLE.count}</p>
          <a className="more" href={PEOPLE.more.href}><span>{PEOPLE.more.label}</span><Arrow /></a>
        </section>

        <section className="band join" id="join" aria-labelledby="h-join">
          <div className="plain head" data-rise>
            <h2 id="h-join" className="title">{JOIN.title}</h2>
            <p className="mid">{JOIN.lead}</p>
          </div>
          <ol className="paths">
            {JOIN.paths.map((p) => (
              <li key={p.id} id={`path-${p.id}`}>
                <Strip a={p.name} b={p.line} look="join" className="s-j" />
                <div className="plain path" data-rise>
                  <p className="mid">{p.line}</p>
                  <div className="lines">
                    {p.text.map((t) => <p key={t} className="body">{t}</p>)}
                  </div>
                  <a className="go" href={p.href}><span>{p.name}</span><Arrow /></a>
                </div>
              </li>
            ))}
          </ol>
          <div className="after" data-rise>
            <p className="body">{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a>.</p>
            <p className="body">{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a>.</p>
            <p className="body">{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p className="body">{JOIN.discord}</p>
          </div>
        </section>
      </main>

      <footer className="foot">
        <Strip a={END[0]} b={END[1]} look="end" className="s-end" />
        <p className="endline" data-rise>{FOOTER.line}</p>
        <div className="foot-row">
          <svg className="endq" viewBox="-491 -770 982 1540" aria-hidden="true" focusable="false"><path d={Q} /></svg>
          <div className="foot-cols">
            <ul aria-label="Elsewhere">
              {FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
            </ul>
            <ul aria-label="Pages">
              {FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
            </ul>
          </div>
        </div>
        <p className="small">Draft 2, version 64. Not the live site.</p>
      </footer>
    </div>
  );
}
