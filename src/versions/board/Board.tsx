// Version 8: a postings board. Split-flap tiles (React Bits SplitFlapText)
// turn over to show the pitch, the record and the three ways in.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './board.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { useRise } from '@/lib/motion';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import SplitFlapText from '@/components/bits/SplitFlapText';

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,’'-&: ";
const up = (s: string) => s.toUpperCase();
const LINES = [...HERO.pitch, ...HERO.statement, ...MANIFESTO].map(up);
const STATUS = ['FREE', 'ONE HOUR', 'VOLUNTEER'];   // from each path's own first line

/** Break a sentence into rows of at most `cols` tiles, on spaces. */
function wrap(text: string, cols: number, rows: number) {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > cols) { out.push(line); line = word; } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  while (out.length < rows) out.push('');
  return out.slice(0, Math.max(rows, out.length));
}

const flap = { charset: CHARSET, tileColor: '#191919', textColor: '#f2f2ee', tileRadius: 3, gap: 3, flipDuration: 0.34, stagger: 0.028, flipsPerChar: 3, loop: false as const };

/** A cell of tiles that stays blank until it is on screen, then flips to its text. */
function Flap({ text, pad, size = 'var(--flap)', amber }: { text: string; pad?: number; size?: string; amber?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [on, setOn] = useState(still);
  useEffect(() => {
    if (still) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, []);
  return (
    <span className="flap" ref={ref}>
      <span className="sr-only-x">{text}</span>
      <SplitFlapText aria-hidden="true" {...flap} text={on ? up(text) : ''} padTo={pad ?? text.length} fontSize={size} textColor={amber ? '#ffb000' : flap.textColor} intro={false} />
    </span>
  );
}

function Clock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 15000); return () => clearInterval(id); }, []);
  const s = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  return <span className="clock" aria-label={`Local time ${s}`}><SplitFlapText aria-hidden="true" {...flap} charset="0123456789:" text={s} padTo={5} fontSize="1.05rem" intro={false} /></span>;
}

const A = ({ href, children }: { href: string; children: ReactNode }) => <a href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>;

export default function Board() {
  useVersion('board', { anchorOffset: -64 });
  const root = useRef<HTMLDivElement>(null), hero = useRef<HTMLDivElement>(null);
  useRise(root);
  const [cols, setCols] = useState(18);
  const [at, setAt] = useState(0);
  const [live, setLive] = useState(still);

  // How many tiles fit across the big board.
  useEffect(() => {
    const measure = () => {
      const sec = hero.current!.parentElement!, cs = getComputedStyle(sec), fs = parseFloat(getComputedStyle(hero.current!).fontSize);
      const w = sec.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - fs * 0.9;
      setCols(Math.max(10, Math.min(26, Math.floor(w / (fs * 0.78 + 3)))));
    };
    measure();
    window.addEventListener('resize', measure);
    const t = setTimeout(() => setLive(true), 900);
    return () => { window.removeEventListener('resize', measure); clearTimeout(t); };
  }, []);
  // The big board turns to the next line every few seconds, and stops when the tab is hidden.
  useEffect(() => {
    if (still) return;
    const id = setInterval(() => { if (!document.hidden) setAt((n) => (n + 1) % LINES.length); }, 4600);
    return () => clearInterval(id);
  }, []);
  const rows = wrap(live ? LINES[at] : '', cols, 3);

  return (
    <div className="vbd" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top">
        <a className="mark" href="#top" aria-label="Skeptical, back to the top">SKEPTICAL</a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
        <Clock />
      </header>

      <main id="main">
        <section className="hero" id="top">
          <h1 className="sr-only-x">{SITE.heading}</h1>
          <div className="big" ref={hero} aria-hidden="true">
            {rows.map((r, i) => <SplitFlapText key={i} {...flap} text={r} padTo={cols} fontSize="1em" intro={false} stagger={0.022} />)}
          </div>
          <p className="sr-only-x">{HERO.pitch.join(' ')} {HERO.statement.join(' ')} {MANIFESTO.join(' ')}</p>
          <div className="under">
            <p className="lede" data-rise>{HERO.pitch.join(' ')} {HERO.statement.join(' ')}</p>
            <p className="doors" data-rise>{HERO.doors.map((d) => <a className="btn" key={d.href} href={d.href} rel="noopener">{d.label}</a>)}</p>
          </div>
        </section>

        <section id="record">
          <header className="head"><h2>{RECORD.title}</h2><p>{RECORD.rule}</p></header>
          <p className="where" data-rise>{RECORD.when}. {RECORD.name}, {RECORD.where}.</p>
          <div className="table" role="list">
            {RECORD.results.map((r) => (
              <div className="row r3" role="listitem" key={r.who} data-rise>
                <Flap text={r.who} pad={9} />
                <Flap text={r.what} pad={26} amber />
                <p>{r.more}</p>
              </div>
            ))}
          </div>
          <p className="more" data-rise><A href={RECORD.more.href}>{RECORD.more.label}</A></p>
        </section>

        <section id="drive">
          <header className="head"><h2>{DRIVE.title}</h2><p>{DRIVE.lead}</p></header>
          <div className="table" role="list">
            {DRIVE.items.map((d) => <div className="row r2" role="listitem" key={d.term} data-rise><Flap text={d.term} pad={10} /><p>{d.text}</p></div>)}
          </div>
          <p className="more" data-rise><A href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
        </section>

        <section id="people">
          <header className="head"><h2>{PEOPLE.title}</h2><p>{PEOPLE.count}</p></header>
          <div className="table" role="list">
            {PEOPLE.coaches.map((c) => <div className="row r3" role="listitem" key={c.name} data-rise><Flap text={c.name} pad={14} /><Flap text={c.role} pad={15} amber /><p>{c.bio}</p></div>)}
          </div>
          <p className="more" data-rise><A href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
        </section>

        <section id="join">
          <header className="head"><h2>{JOIN.title}</h2><p>{JOIN.lead}</p></header>
          <div className="table" role="list">
            {JOIN.paths.map((p, i) => (
              <a className="row r3 go" role="listitem" key={p.id} href={p.href} rel="noopener" data-rise>
                <Flap text={p.name} pad={8} />
                <Flap text={STATUS[i]} pad={9} amber />
                <p><b>{p.line}</b> {p.text[0]}</p>
              </a>
            ))}
          </div>
          <p className="more" data-rise>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>. {JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
        </section>
      </main>

      <footer>
        <p className="line">{FOOTER.line}</p>
        <ul>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <ul>{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <small>Draft 2, version 8. Not the live site.</small>
      </footer>
    </div>
  );
}
