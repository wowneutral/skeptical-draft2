// Version 5: the site as a speech doc. The first card is cut in front of you
// as you scroll; after that the highlighter, the speed and Shrink are yours.
import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react';
import '@fontsource/carlito/400.css';
import '@fontsource/carlito/700.css';
import '@fontsource/carlito/400-italic.css';
import './cards.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';

// Card text: [n]plain[/n] [u]underlined[/u] [h]highlighted[/h] [e]emphasis[/e]. Highlighted text is always underlined too.
function cut(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[(n|u|h|e)\]([\s\S]*?)\[\/\1\]/g;
  let m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(src))) {
    const [, tag, text] = m, key = i++;
    if (tag === 'n') out.push(<span className="n" key={key}>{text}</span>);
    else if (tag === 'u') out.push(<u key={key}>{text}</u>);
    else out.push(<u key={key}><mark className={tag === 'e' ? 'em' : undefined}>{text}</mark></u>);
  }
  return out;
}
const plain = (src: string) => src.replace(/\[\/?[nuhe]\]/g, '').replace(/\s+/g, ' ').trim();

const M = MANIFESTO, ST = HERO.statement, R = RECORD.results;
const TEAM = `[n]We’re an [/n][h]independent[/h][u] entry. [/u][e]No school, no fee.[/e][n] [/n][h]Eight of us[/h][n] right now. [/n][h]Two coaches[/h][u], both [/u][h]still competing.[/h][n] We [/n][h]write the prep[/h][u], we [/u][h]frontline it[/h][u], and it [/u][e]stays in the drive.[/e][n] Yes, [/n][h]the name is a position.[/h][n] No, [/n][h]you don’t have to run it.[/h][n] [/n][e]Free to join.[/e][n] The prep stays private. [/n][h]Everyone contributes.[/h]`;
const REC = `[e]${R[0].who}[/e][n] [/n][h]${R[0].what}.[/h][n] [/n][h]3-0 in finals.[/h][u] Second speaker.[/u][n] [/n][e]${R[1].who}[/e][n] [/n][h]${R[1].what}.[/h][n] [/n][h]Top speaker[/h][u] in the division.[/u]`;
// Guard: a card may only say what the live site says.
if (plain(TEAM) !== [...M, ...ST].join(' ')) throw new Error('team card drifted from the copy');
if (plain(REC) !== R.map((r) => `${r.who} ${r.what}. ${r.more}`).join(' ')) throw new Error('record card drifted from the copy');
const COACH_HL = ['Still competes in LD.', 'Runs the K side of the room.'];

const OUTLINE = [
  { id: 'top', label: 'Skeptical', level: 1 },
  { id: 'team', label: 'Contention 1: The team', level: 2 },
  { id: 'record', label: 'Contention 2: The record', level: 2 },
  { id: 'drive', label: 'Contention 3: The drive', level: 2 },
  { id: 'people', label: 'Contention 4: The people', level: 2 },
  { id: 'join', label: 'The plan: Join', level: 2 },
  ...JOIN.paths.map((p) => ({ id: p.id, label: p.name, level: 3 })),
];
const KEYS = [
  { k: 'F7', name: 'Tag', peek: 'tag', tip: 'The claim, in your own words. Bold.' },
  { k: 'F8', name: 'Cite', peek: 'cite', tip: 'Who said it and when.' },
  { k: 'F9', name: 'Underline', peek: 'u', tip: 'The part of the card that matters.' },
  { k: 'F10', name: 'Emphasis', peek: 'em', tip: 'Boxed: the words you slow down for.' },
  { k: 'F11', name: 'Highlight', peek: 'hl', tip: 'What actually gets read aloud.' },
];
const INKS = [{ v: '#7df0ee', name: 'Turquoise' }, { v: '#9af29a', name: 'Green' }, { v: '#ffb6dd', name: 'Pink' }];
const A = ({ href, children }: { href: string; children: ReactNode }) => <a href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>;

export default function Cards() {
  useVersion('cards', { anchorOffset: -84 });
  const root = useRef<HTMLDivElement>(null);
  const [words, setWords] = useState(0);
  const [wpm, setWpm] = useState(250);
  const [shrunk, setShrunk] = useState(false);
  const [ink, setInk] = useState(INKS[0].v);
  const [peek, setPeek] = useState('');
  const [phase, setPhase] = useState('');
  const [here, setHere] = useState('top');
  const secs = Math.round((words / wpm) * 60);
  const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const team = useMemo(() => cut(TEAM), []), rec = useMemo(() => cut(REC), []);

  useGSAP(() => {
    const el = root.current!;
    const marks = gsap.utils.toArray<HTMLElement>('.card mark', el);
    const n = (m: HTMLElement) => (m.textContent ?? '').trim().split(/\s+/).filter(Boolean).length;
    let shown = -1;
    const count = () => {
      let total = 0;
      for (const m of marks) if (still || parseFloat(m.style.backgroundSize) > 60) total += n(m);
      if (total !== shown) { shown = total; setWords(total); }
    };
    // The outline keeps its place.
    const targets = OUTLINE.map((o) => document.getElementById(o.id));
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: () => { let at = 'top'; targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < window.innerHeight * 0.4) at = OUTLINE[i].id; }); setHere(at); } });
    if (still) { count(); return; }

    const sweep = (tl: gsap.core.Timeline, ms: HTMLElement[], at?: number | string) =>
      ms.forEach((m, i) => tl.fromTo(m, { backgroundSize: '0% 86%' }, { backgroundSize: '100% 86%', ease: 'none', duration: Math.max(1, n(m)) }, i === 0 ? at : undefined));

    const mm = gsap.matchMedia();
    const first = el.querySelector<HTMLElement>('.cutting')!;
    mm.add('(min-width: 901px)', () => {
      // The first card is cut in front of you: underline, emphasis, highlight, shrink.
      const card = first.querySelector<HTMLElement>('.card')!;
      const us = gsap.utils.toArray<HTMLElement>('u', card), ems = gsap.utils.toArray<HTMLElement>('.em', card), ns = gsap.utils.toArray<HTMLElement>('.n', card);
      const tl = gsap.timeline({ scrollTrigger: { trigger: first, start: 'top 96', end: '+=220%', pin: true, scrub: 0.5, anticipatePin: 1, onLeave: () => setPhase(''), onLeaveBack: () => setPhase('') }, onUpdate: count });
      tl.addLabel('u').add(() => setPhase(tl.scrollTrigger!.direction > 0 ? 'u' : ''), 0.01)
        .fromTo(us, { backgroundSize: '0% 1.5px' }, { backgroundSize: '100% 1.5px', ease: 'none', duration: 30, stagger: 30 / us.length }, 0)
        .add(() => setPhase(tl.scrollTrigger!.direction > 0 ? 'em' : 'u'))
        .fromTo(ems, { '--box': 0, fontWeight: 400 }, { '--box': 1, fontWeight: 700, duration: 14, stagger: 4 })
        .add(() => setPhase(tl.scrollTrigger!.direction > 0 ? 'hl' : 'em'));
      sweep(tl, gsap.utils.toArray<HTMLElement>('mark', card), '>');
      tl.add(() => setPhase(tl.scrollTrigger!.direction > 0 ? 'shrink' : 'hl'))
        .to(ns, { fontSize: '0.56em', color: '#77776f', duration: 22, ease: 'power1.inOut' })
        .to({}, { duration: 14 })
        .to(ns, { fontSize: '1em', color: '#111111', duration: 16, ease: 'power1.inOut', clearProps: 'fontSize,color' });
    });
    mm.add('(max-width: 900px)', () => {
      const card = first.querySelector<HTMLElement>('.card')!;
      const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 80%', end: 'bottom 42%', scrub: 0.5 }, onUpdate: count });
      sweep(tl, gsap.utils.toArray<HTMLElement>('mark', card));
    });
    // Every other card: the highlighter runs through it as it is read.
    gsap.utils.toArray<HTMLElement>('.card', el).filter((c) => !c.closest('.cutting')).forEach((card) => {
      const ms = gsap.utils.toArray<HTMLElement>('mark', card);
      if (!ms.length) return;
      const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 80%', end: 'bottom 42%', scrub: 0.5 }, onUpdate: count });
      sweep(tl, ms);
    });
    return () => mm.revert();
  }, { scope: root });

  return (
    <TooltipProvider delayDuration={150}>
      <div className={`vc${shrunk ? ' shrunk' : ''}`} ref={root} data-peek={peek || phase || undefined} style={{ '--hl': ink } as React.CSSProperties}>
        <a className="skip-x" href="#main">Skip to content</a>
        <header className="bar">
          <a className="mark" href="#top" aria-label="Skeptical 1AC, back to the top">Skeptical 1AC</a>
          <div className="keys" role="group" aria-label="What each mark in a card means">
            {KEYS.map((key) => (
              <Tooltip key={key.k}>
                <TooltipTrigger asChild>
                  <button type="button" className="key" data-on={peek === key.peek || phase === key.peek || undefined} onPointerEnter={() => setPeek(key.peek)} onPointerLeave={() => setPeek('')} onFocus={() => setPeek(key.peek)} onBlur={() => setPeek('')}>
                    <Kbd>{key.k}</Kbd>{key.name}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{key.tip}</TooltipContent>
              </Tooltip>
            ))}
          </div>
          <ToggleGroup type="single" value={ink} onValueChange={(v) => v && setInk(v)} aria-label="Highlighter colour" className="inks">
            {INKS.map((c) => <ToggleGroupItem key={c.v} value={c.v} aria-label={c.name} className="ink"><span style={{ background: c.v }} /></ToggleGroupItem>)}
          </ToggleGroup>
          <label className="shrinker"><Switch checked={shrunk} onCheckedChange={(v) => { setShrunk(v); setTimeout(() => ScrollTrigger.refresh(), 600); }} />Shrink</label>
        </header>

        <div className="wrap">
          <aside className="pane">
            <nav aria-label="Document outline">
              {OUTLINE.map((o) => <a key={o.id} className={`l${o.level}`} href={`#${o.id}`} aria-current={here === o.id ? 'true' : undefined}>{o.label}</a>)}
            </nav>
            <div className="meter">
              <p className="count"><b>{words}</b> words highlighted</p>
              <p className="count"><b>{time}</b> to read at <b>{wpm}</b> wpm</p>
              <Slider value={[wpm]} min={150} max={350} step={10} onValueChange={(v) => setWpm(v[0])} aria-label="Reading speed in words per minute" />
            </div>
          </aside>

          <main className="doc" id="main">
            <h1 className="pocket" id="top">Skeptical</h1>
            <p className="hat">1AC</p>

            <h2 className="blockh" id="team">Contention 1: The team</h2>
            <div className="cutting">
              <p className="tag">{HERO.pitch.join(' ')}</p>
              <p className="cite"><b>Skeptical 26</b> (Skeptical Independent, an independent Lincoln-Douglas debate team, skeptical.pages.dev)</p>
              <p className="card">{team}</p>
            </div>

            <h2 className="blockh" id="record">Contention 2: The record</h2>
            <p className="tag">{RECORD.rule}</p>
            <p className="cite"><b>Season Opener 26</b> ({RECORD.name}, {RECORD.where}, {RECORD.when})</p>
            <p className="card">{rec}</p>
            <p className="more"><A href={RECORD.more.href}>{RECORD.more.label}</A></p>

            <h2 className="blockh" id="drive">Contention 3: The drive</h2>
            <p className="tag">{DRIVE.lead}</p>
            <p className="cite"><b>The drive 26</b> (what is in it, described and never shown)</p>
            <p className="card">{DRIVE.items.map((d) => <Fragment key={d.term}><u><mark className="em">{d.term}.</mark></u><span className="n"> {d.text} </span></Fragment>)}</p>
            <p className="more"><A href={DRIVE.more.href}>{DRIVE.more.label}</A></p>

            <h2 className="blockh" id="people">Contention 4: The people</h2>
            <p className="tag">{PEOPLE.count}</p>
            {PEOPLE.coaches.map((c, i) => (
              <Fragment key={c.name}>
                <p className="cite"><b>{c.name.split(' ').pop()} 26</b> ({c.name}, {c.role.toLowerCase()})</p>
                <p className="card"><u><mark>{COACH_HL[i]}</mark>{c.bio.slice(COACH_HL[i].length)}</u></p>
              </Fragment>
            ))}
            <p className="more"><A href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>

            <h2 className="hat" id="join">The plan: Join</h2>
            <p className="tag">{JOIN.lead}</p>
            {JOIN.paths.map((p) => (
              <div className="plank" id={p.id} key={p.id}>
                <h3><A href={p.href}>{p.name}. {p.line}</A></h3>
                <ol>{p.text.map((t) => <li key={t}>{t}</li>)}</ol>
              </div>
            ))}
            <p className="analytic">{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>. {JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>

            <footer>
              <p className="tag">{FOOTER.line}</p>
              <ul>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
              <ul>{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
              <small>Draft 2, version 5. Not the live site.</small>
            </footer>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
