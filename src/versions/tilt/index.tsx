// Version 89, the tilt. Every course on this page is laid dead level, and none of it looks level:
// black and bone tiles, each row offset a little against the row above, thin grey mortar between.
import { useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './tilt.css';
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, SITE } from '@/content';
import { useVersion } from '@/lib/version';
import { still } from '@/lib/utils';
import { Wall, type RowSpec, type Slot } from './Wall';
import { S, MAXK, start } from './lean';

const Arrow = () => (
  <svg className="tl-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h17M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" /></svg>
);
const LINE = 'Every line on this page is level.';

function usePhone() {
  const q = '(max-width: 700px)';
  const [p, setP] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setP(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return p;
}

function Head({ id, desk, phone, label, isPhone }: { id: string; desk: string[]; phone: string[]; label: string; isPhone: boolean }) {
  const rows: RowSpec[] = useMemo(() => [null, ...(isPhone ? phone : desk), null], [isPhone, desk, phone]);
  return (
    <Wall
      as="h2" id={id} label={label} rows={rows} lay="view" align="start"
      n={isPhone ? 4 : 10} cols={isPhone ? 4.7 : 13} ratio={isPhone ? 1.12 : 1}
      className="tl-head"
    />
  );
}

/** The seven words of the drive, each a tile that turns over. */
function DriveTile({ i, dark, on, flip }: { i: number; dark: boolean; on: boolean; flip: (i: number) => void }) {
  const it = DRIVE.items[i];
  return (
    <button
      type="button"
      className={`tl-flip ${dark ? 'is-d' : 'is-b'}${on ? ' is-on' : ''}`}
      aria-pressed={on}
      onClick={() => flip(i)}
      style={{ ['--len' as string]: Math.max(it.term.length, 3) }}
    >
      <span className="tl-face tl-front" aria-hidden={on}>{it.term.toUpperCase()}</span>
      <span className="tl-face tl-back">
        <span className="tl-bt">{it.term}</span>
        <span className="tl-bx">{it.text}</span>
      </span>
    </button>
  );
}

function Path({ i, active, setActive, isPhone }: { i: number; active: boolean; setActive: (i: number | null) => void; isPhone: boolean }) {
  const p = JOIN.paths[i];
  const ref = useRef<HTMLElement>(null);
  const rows: RowSpec[] = useMemo(() => [null, p.name.toUpperCase(), null], [p.name]);
  useEffect(() => {
    if (!isPhone) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(i); }, { rootMargin: '-42% 0px -42% 0px' });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, [isPhone, i, setActive]);
  return (
    <article
      ref={ref}
      id={p.id}
      className={`tl-path${active ? ' is-level' : ''}`}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setActive(i); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(null); }}
      onFocus={() => setActive(i)}
    >
      <Wall as="h3" label={p.name} rows={rows} n={isPhone ? 7 : 8} cols={isPhone ? 7.8 : 8.6} ratio={1.12} level={active} lay="view" className="tl-pathwall" />
      <div className="tl-field tl-pathtext">
        <p className="tl-pline">{p.line}</p>
        {p.text.map((t) => <p key={t} className="tl-body">{t}</p>)}
        <a className="tl-go" href={p.href}>Apply to {p.name.toLowerCase()}<Arrow /></a>
      </div>
    </article>
  );
}

export default function Tilt() {
  useVersion('tilt');
  const isPhone = usePhone();
  const [open, setOpen] = useState<boolean[]>(() => DRIVE.items.map(() => false));
  const [active, setActive] = useState<number | null>(null);
  const [held, setHeld] = useState(false);

  useEffect(() => start(), []);

  const flip = (i: number) => setOpen((o) => o.map((v, j) => (j === i ? !v : v)));

  const heroRows: RowSpec[] = useMemo(
    () => (isPhone ? [null, null, null, 'SKE', 'PTI', 'CAL?', null, null, null] : [null, null, null, 'SKEP', 'TICAL?', null, null, null]),
    [isPhone],
  );
  const footRows: RowSpec[] = useMemo(
    () => (isPhone ? [null, 'SKE', 'PTI', 'CAL?', null] : [null, 'SKEPTICAL?', null]),
    [isPhone],
  );
  const driveRows: RowSpec[] = useMemo(() => {
    const slot = (i: number): Slot => (dark) => <DriveTile key={i} i={i} dark={dark} on={open[i]} flip={flip} />;
    const all = DRIVE.items.map((_, i) => slot(i));
    if (!isPhone) return [null, all, null];
    return [null, all.slice(0, 2), all.slice(2, 4), all.slice(4, 6), all.slice(6), null];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPhone, open]);

  // The one line is also the keyboard way in: hold Space or Enter on it to lay every wall level, arrows lean them.
  const press = (on: boolean) => { S.held = on; setHeld(on); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (!still) S.kT = Math.max(-MAXK, Math.min(MAXK, S.kT + (e.key === 'ArrowLeft' ? -0.06 : 0.06)));
    }
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(true); }
  };
  const onKeyUp = (e: React.KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') press(false); };

  return (
    <div className={`v-tilt${held ? ' is-held' : ''}`}>
      <a className="skip-x" href="#main">Skip to content</a>

      <header className="tl-hero">
        <Wall as="h1" label={`${SITE.name}?`} rows={heroRows} n={isPhone ? 4 : 6} cols={isPhone ? 4.5 : 9.6} ratio={isPhone ? 1.14 : 1.04} lay="load" className="tl-herowall" />
        <div className="tl-band">
          <button type="button" className="tl-line" onKeyDown={onKey} onKeyUp={onKeyUp} onBlur={() => press(false)} aria-pressed={held}>
            {LINE}
          </button>
        </div>
      </header>

      <main id="main">
        <section className="tl-open" aria-label="Skeptical">
          <div className="tl-pitch">
            {HERO.pitch.map((l) => <p key={l} className="tl-big">{l}</p>)}
          </div>
          <div className="tl-field tl-state">
            {HERO.statement.map((l) => <p key={l}>{l}</p>)}
          </div>
          <nav className="tl-doors" aria-label="Two doors">
            {HERO.doors.map((d, i) => (
              <a key={d.href} href={d.href} className={`tl-door ${i ? 'is-b' : 'is-d'}`}>
                <span>{d.label}</span><Arrow />
              </a>
            ))}
          </nav>
        </section>

        <section className="tl-man" aria-label="What we are">
          {MANIFESTO.map((l, i) => (
            <p key={l} className="tl-course" style={{ ['--i' as string]: i }}><span>{l}</span></p>
          ))}
        </section>

        <section className="tl-sec" aria-labelledby="record">
          <Head id="record" label={RECORD.title} desk={['THE', 'RECORD.']} phone={['THE', 'REC', 'ORD.']} isPhone={isPhone} />
          <div className="tl-wrap">
            <div className="tl-field tl-rec">
              <p className="tl-rule">{RECORD.rule}</p>
              <p className="tl-event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            </div>
            <ol className="tl-results">
              {RECORD.results.map((r, i) => (
                <li key={r.who} className={`tl-res ${i ? 'is-b' : 'is-d'}`}>
                  <span className="tl-what">{r.what}</span>
                  <span className="tl-who">{r.who}</span>
                  <span className="tl-more">{r.more}</span>
                </li>
              ))}
            </ol>
            <a className="tl-go" href={RECORD.more.href}>{RECORD.more.label}<Arrow /></a>
          </div>
        </section>

        <section className="tl-sec" aria-labelledby="drive">
          <Head id="drive" label={DRIVE.title} desk={['THE', 'DRIVE.']} phone={['THE', 'DRI', 'VE.']} isPhone={isPhone} />
          <div className="tl-wrap">
            <p className="tl-field tl-lead">{DRIVE.lead}</p>
          </div>
          <Wall rows={driveRows} n={isPhone ? 2 : 7} cols={isPhone ? 2.5 : 8.6} ratio={isPhone ? 1.12 : 1.36} plain={isPhone ? 0.62 : 0.66} lay="view" scale={isPhone ? 0.7 : 1} className="tl-drivewall" />
          <div className="tl-wrap">
            <a className="tl-go" href={DRIVE.more.href}>{DRIVE.more.label}<Arrow /></a>
          </div>
        </section>

        <section className="tl-sec" aria-labelledby="people">
          <Head id="people" label={PEOPLE.title} desk={['THE', 'PEOPLE.']} phone={['THE', 'PEO', 'PLE.']} isPhone={isPhone} />
          <div className="tl-wrap tl-coaches">
            {PEOPLE.coaches.map((c) => (
              <div key={c.name} className="tl-coach">
                <p className="tl-name">{c.name}</p>
                <p className="tl-role">{c.role}</p>
                <p className="tl-body">{c.bio}</p>
              </div>
            ))}
          </div>
          <div className="tl-wrap tl-count">
            <span className="tl-eight" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i} className={i % 2 ? 'is-b' : 'is-d'} />)}</span>
            <p className="tl-big tl-countline">{PEOPLE.count}</p>
            <a className="tl-go" href={PEOPLE.more.href}>{PEOPLE.more.label}<Arrow /></a>
          </div>
        </section>

        <section className="tl-sec" aria-labelledby="join">
          <Head id="join" label={JOIN.title} desk={['JOIN.']} phone={['JO', 'IN.']} isPhone={isPhone} />
          <div className="tl-wrap">
            <p className="tl-field tl-lead">{JOIN.lead}</p>
          </div>
          <div className="tl-paths">
            {JOIN.paths.map((p, i) => <Path key={p.id} i={i} active={active === i} setActive={setActive} isPhone={isPhone} />)}
          </div>
          <div className="tl-wrap tl-field tl-after">
            <p className="tl-body">{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a>.</p>
            <p className="tl-body">{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a>.</p>
            <p className="tl-body">{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p className="tl-body">{JOIN.discord}</p>
          </div>
        </section>
      </main>

      <footer className="tl-foot">
        <Wall rows={footRows} n={isPhone ? 4 : 10} cols={isPhone ? 4.5 : 11.4} ratio={isPhone ? 1.14 : 1} mode="level" lay="view" className="tl-footwall" />
        <div className="tl-wrap">
          <p className="tl-footline">{FOOTER.line}</p>
          <div className="tl-links">
            <ul aria-label="Elsewhere">
              {FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
            </ul>
            <ul aria-label="Pages">
              {FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
            </ul>
          </div>
          <p className="tl-draft">Draft 2, version 89. Not the live site.</p>
        </div>
      </footer>
    </div>
  );
}
