// Version 100: the furrow. The site cut like the oldest inscriptions, which ran the way
// an ox ploughs: one line left to right, the next right to left with every letter mirrored.
// In LD you argue both sides of the same resolution, so every display line runs both ways.
import { useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import './furrow.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { gsap, useGSAP } from '@/lib/scroll';
import { still, coarse } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Display, lay, type Block, type Dir } from './field';
import { Plough } from './plough';

function useWidth() {
  const [w, setW] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));
  useEffect(() => {
    let t = 0;
    const on = () => { clearTimeout(t); t = window.setTimeout(() => setW(window.innerWidth), 120); };
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('resize', on); clearTimeout(t); };
  }, []);
  return w;
}

const Body = ({ dir, children, cls }: { dir: Dir; children: React.ReactNode; cls?: string }) => (
  <div className={'b ' + (cls ?? '')} data-align={dir === 'ltr' ? 'left' : 'right'}>
    <div className="col">{children}</div>
  </div>
);

export default function Furrow() {
  useVersion('furrow');
  const root = useRef<HTMLDivElement>(null);
  const w = useWidth();
  const [stone, setStone] = useState(false);
  const plough = useRef<Plough | null>(null);
  const [ready, setReady] = useState(still);

  const blocks: Block[] = useMemo(() => {
    const B: Block[] = [];
    const d = (key: string, text: string, size: 't' | 'xl' | 'l' | 'm' | 'r' | 'e' | 'p' | 'q', tag: 'h1' | 'h2' | 'h3' | 'p', extra: Partial<Block> = {}) =>
      B.push({ k: 'd', key, text, size, tag, ...extra } as Block);
    const b = (key: string, body: React.ReactNode, cls?: string) => B.push({ k: 'b', key, body, cls });

    // Opening
    d('title', 'Skeptical?', 't', 'h1', { sr: SITE.heading, force: 'ltr' });
    HERO.pitch.forEach((p, i) => d('pitch' + i, p, 'p', 'p'));
    b('hint', <p className="hint">{still ? 'Every line runs both ways.' : coarse ? 'Press and hold to see the stone.' : 'Drag across a line. Hold to see the stone.'}</p>, 'hintb');
    HERO.statement.forEach((s, i) => d('st' + i, s, 'p', 'p'));
    B.push({ k: 'b', key: 'doors', cls: 'wide', body: (
      <nav className="doors" aria-label="Two ways in">
        {HERO.doors.map((x) => <a key={x.href} className="door" href={x.href}>{x.label}</a>)}
      </nav>
    ) });
    b('manifesto', (
      <div className="mani">{MANIFESTO.map((m) => <p key={m}>{m}</p>)}</div>
    ), 'big');

    // Record: two lines running in opposite directions
    d('rec', RECORD.title, 'xl', 'h2', { id: 'record' });
    b('rule', (
      <>
        <p className="lead">{RECORD.rule}</p>
        <p className="meta"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
      </>
    ));
    RECORD.results.forEach((r, i) => {
      d('res' + i, r.what, 'r', 'h3', { sr: `${r.who}. ${r.what}.` });
      b('resb' + i, <p><strong className="who">{r.who}</strong> {r.more}</p>);
    });
    b('recmore', <p><a className="more" href={RECORD.more.href}>{RECORD.more.label}</a></p>);

    // Drive: described, never linked
    d('drv', DRIVE.title, 'xl', 'h2', { id: 'drive' });
    b('drvlead', <p className="lead">{DRIVE.lead}</p>);
    DRIVE.items.forEach((it, i) => {
      d('it' + i, it.term, 'l', 'h3');
      b('itb' + i, <p>{it.text}</p>);
    });
    b('drvmore', <p><a className="more" href={DRIVE.more.href}>{DRIVE.more.label}</a></p>);

    // People
    d('ppl', PEOPLE.title, 'xl', 'h2', { id: 'people' });
    PEOPLE.coaches.forEach((c, i) => {
      d('co' + i, c.name, 'l', 'h3');
      b('cob' + i, <><p className="role">{c.role}</p><p>{c.bio}</p></>);
    });
    d('count', PEOPLE.count, 'm', 'p');
    b('pplmore', <p><a className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</a></p>);

    // Join: three lines alternating, each a way in
    d('join', JOIN.title, 'xl', 'h2', { id: 'join' });
    b('joinlead', <p className="lead">{JOIN.lead}</p>);
    JOIN.paths.forEach((p) => {
      d('p-' + p.id, p.name + '.', 'xl', 'h3', { sr: p.name });
      b('pb-' + p.id, (
        <>
          <p className="line"><a className="more" href={p.href}>{p.line}</a></p>
          {p.text.map((t) => <p key={t}>{t}</p>)}
        </>
      ));
    });
    b('joinend', (
      <div className="small">
        <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a>.</p>
        <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a>.</p>
        <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
        <p>{JOIN.discord}</p>
      </div>
    ));

    // The last line runs backwards and turns as you reach it
    d('foot', FOOTER.line, 'e', 'p', { force: 'rtl', end: true });
    // and the question it was all asking, cut backwards, turning last
    d('lastq', '?', 'q', 'p', { end: true, deco: true, force: 'rtl' });
    b('footb', (
      <footer className="foot">
        <ul aria-label="Elsewhere">{FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <ul aria-label="Pages">{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <p className="draft">Draft 2, version 100. Not the live site.</p>
      </footer>
    ), 'wide footwrap');
    return B;
  }, []);

  const laid = useMemo(() => lay(blocks, w), [blocks, w]);

  // The engine: rebuilt whenever the grid changes.
  useEffect(() => {
    if (still || !root.current) return;
    const p = new Plough(root.current);
    plough.current = p;
    p.ready = ready;
    return () => { p.destroy(); plough.current = null; };
  }, [laid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (plough.current) plough.current.ready = ready; }, [ready]);
  useEffect(() => { if (plough.current) plough.current.locked = stone; }, [stone]);

  // Press and hold anywhere: the corrections drop and the stone shows as it runs.
  useEffect(() => {
    if (still) return;
    const el = root.current!;
    const sync = () => el.classList.toggle('is-stone', !!plough.current?.stone);
    const id = window.setInterval(sync, 80);
    return () => clearInterval(id);
  }, []);

  // Opening: SKEPTICAL? cut left to right, the line turns at the edge, the pitch runs back mirrored.
  useGSAP(() => {
    if (still || !root.current) return;
    const el = root.current;
    const rows = [...el.querySelectorAll<HTMLElement>('.hero .row')];
    gsap.set(el.querySelectorAll('.hero .bend'), { clipPath: 'inset(0% 0% 100% 0%)' });
    const tl = gsap.timeline({ delay: 0.35, onComplete: () => { setReady(true); } });
    rows.forEach((row, i) => {
      const rtl = row.dataset.dir === 'rtl';
      let cells = [...row.querySelectorAll<HTMLElement>('.cell')];
      if (rtl) cells = cells.reverse();
      const rule = row.querySelector('.rule');
      const at = i === 0 ? 0 : '>-0.05';
      const bend = rows[i - 1]?.querySelector('.bend');
      if (bend) tl.fromTo(bend, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.3, ease: 'power2.inOut' }, at);
      tl.fromTo(rule, { scaleX: 0, transformOrigin: rtl ? '100% 50%' : '0% 50%' }, { scaleX: 1, duration: i === 0 ? 0.7 : 0.55, ease: 'power2.inOut' }, bend ? '>-0.05' : at);
      tl.fromTo(cells,
        { clipPath: rtl ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)', y: -6 },
        { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 0.2, ease: 'power3.out', stagger: i === 0 ? 0.075 : 0.032 },
        '<0.08');
    });
    tl.fromTo(el.querySelectorAll('.hero .hint, .stonebtn'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, '>+0.2');
  }, { scope: root, dependencies: [] });

  // Split the laid blocks into the hero (first screen) and the rest of the field.
  const heroEnd = laid.findIndex((b) => b.key === 'st0');
  const render = (b: (typeof laid)[number]) =>
    b.k === 'd'
      ? <Display key={b.key} b={b} onKey={(t) => plough.current?.toggleBlock(t)} />
      : <Body key={b.key} dir={b.dir} cls={b.cls}>{b.body}</Body>;

  return (
    <div ref={root} className="v-furrow" data-still={still ? '' : undefined}>
      <a className="skip-x" href="#main">Skip to content</a>
      {!still && (
        <button
          type="button"
          className="stonebtn"
          aria-pressed={stone}
          onClick={() => setStone((s) => !s)}
        >
          {stone ? 'Read it' : 'The stone'}
        </button>
      )}
      <main id="main">
        <section className="hero" aria-label="Skeptical">{laid.slice(0, heroEnd).map(render)}</section>
        <div className="fieldrest">{laid.slice(heroEnd).map(render)}</div>
      </main>
    </div>
  );
}

