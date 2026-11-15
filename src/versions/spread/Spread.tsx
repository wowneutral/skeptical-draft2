// Version 11: the spread. The whole site is read to you one word at a time,
// at whatever speed you can flow, and the road (React Bits Hyperspeed) keeps
// pace. The same words are underneath to read slowly.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/schibsted-grotesk';
import '@fontsource/ibm-plex-mono/400.css';
import './spread.css';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { useRise } from '@/lib/motion';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Slider } from '@/components/ui/slider';
import Hyperspeed from '@/components/bits/Hyperspeed';

const SCRIPT: { name: string; text: string }[] = [
  { name: 'Skeptical', text: [...HERO.pitch, ...HERO.statement].join(' ') },
  { name: 'How it works', text: MANIFESTO.join(' ') },
  { name: RECORD.title, text: `${RECORD.rule} ${RECORD.when}. ${RECORD.name}, ${RECORD.where}. ${RECORD.results.map((r) => `${r.who} ${r.what}. ${r.more}`).join(' ')}` },
  { name: DRIVE.title, text: `${DRIVE.lead} ${DRIVE.items.map((d) => `${d.term}. ${d.text}`).join(' ')}` },
  { name: PEOPLE.title, text: `${PEOPLE.coaches.map((c) => `${c.name}. ${c.role}. ${c.bio}`).join(' ')} ${PEOPLE.count}` },
  { name: JOIN.title, text: `${JOIN.lead} ${JOIN.paths.map((p) => `${p.name}. ${p.line} ${p.text.join(' ')}`).join(' ')}` },
];
const WORDS = SCRIPT.flatMap((s, si) => s.text.split(/\s+/).filter(Boolean).map((w) => ({ w, si })));
/** The letter the eye should land on: a little left of the middle. */
const pivot = (w: string) => { const n = w.replace(/[^\p{L}\p{N}]/gu, '').length; return Math.min(w.length - 1, n <= 1 ? 0 : n <= 5 ? 1 : n <= 9 ? 2 : n <= 13 ? 3 : 4); };
const A = ({ href, children }: { href: string; children: ReactNode }) => <a href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>;

export default function Spread() {
  useVersion('spread');
  const root = useRef<HTMLDivElement>(null);
  useRise(root);
  const [wpm, setWpm] = useState(250);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const done = i >= WORDS.length - 1;

  useEffect(() => { if (still) return; const t = setTimeout(() => setPlaying(true), 1600); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (!playing) return;
    if (done) { setPlaying(false); return; }
    // A full stop gets a breath; a comma half of one.
    const w = WORDS[i].w, beat = 60000 / wpm;
    const t = setTimeout(() => setI((n) => n + 1), beat * (/[.?!]$/.test(w) ? 2.1 : /[,:;]$/.test(w) ? 1.5 : 1));
    return () => clearTimeout(t);
  }, [playing, i, wpm, done]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.code === 'Space' && !(e.target as HTMLElement).closest('input, button, a, [role="slider"]')) { e.preventDefault(); setPlaying((p) => !p); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const { w, si } = WORDS[i], p = pivot(w);
  const left = Math.max(0, Math.round(((WORDS.length - 1 - i) / wpm) * 60));
  const speed = useMemo(() => (playing ? 0.5 + (wpm - 150) / 120 : 0.25), [playing, wpm]);
  const toggle = () => { if (done) { setI(0); setPlaying(true); } else setPlaying((x) => !x); };

  return (
    <div className="vs" ref={root}>
      <a className="skip-x" href="#read">Skip to the text</a>
      <div className="road" aria-hidden="true">
        {!still && <Hyperspeed curve="gentle" speed={speed} boosting={playing && wpm >= 340} lanes={3} density={1} glow={0.7} dust={0.4} interactive={false} background="#03040a" roadColor="#070912" lineColor="#1c2140" tailColors={['#ff3d5a', '#ff7a2e', '#ff2d92']} headColors={['#e8f0ff', '#7aa2ff', '#9be7ff']} poleColors={['#3b4680']} />}
      </div>
      <header className="top">
        <a className="mark" href="#top" aria-label="Skeptical, back to the top">skeptical</a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <section className="reader" id="top" aria-label="Speed reader">
        <h1 className="sr-only-x">{SITE.heading}</h1>
        <p className="now" aria-hidden="true">{SCRIPT[si].name}</p>
        <div className="word" aria-hidden="true">
          <span className="l">{w.slice(0, p)}</span><span className="p">{w[p]}</span><span className="r">{w.slice(p + 1)}</span>
        </div>
        <div className="ticks" aria-hidden="true">
          {SCRIPT.map((s, n) => { const from = WORDS.findIndex((x) => x.si === n), count = WORDS.filter((x) => x.si === n).length; return <i key={s.name} style={{ flexGrow: count }}><b style={{ transform: `scaleX(${Math.max(0, Math.min(1, (i - from + 1) / count))})` }} /></i>; })}
        </div>
        <div className="deck">
          <button type="button" className="play" onClick={toggle} aria-label={playing ? 'Pause' : done ? 'Read it again' : 'Play'}>{playing ? <Pause size={22} /> : done ? <RotateCcw size={22} /> : <Play size={22} />}</button>
          <div className="dial">
            <p><b>{wpm}</b> words a minute</p>
            <Slider value={[wpm]} min={150} max={450} step={10} onValueChange={(v) => setWpm(v[0])} aria-label="Reading speed in words per minute" />
          </div>
          <p className="left">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} left</p>
        </div>
        <p className="or"><a href="#read">Or read it slowly.</a></p>
      </section>

      <main id="read">
        <section>
          <h2 data-rise>{HERO.pitch.join(' ')}</h2>
          <p className="lede" data-rise>{HERO.statement.join(' ')}</p>
          <p className="doors" data-rise>{HERO.doors.map((d, n) => <a className={n ? 'btn alt' : 'btn'} key={d.href} href={d.href} rel="noopener">{d.label}</a>)}</p>
          <ol className="says">{MANIFESTO.map((m) => <li data-rise key={m}>{m}</li>)}</ol>
        </section>
        <section id="record">
          <h2 data-rise>{RECORD.title}</h2>
          <p className="lede" data-rise>{RECORD.rule}</p>
          <p className="dim" data-rise>{RECORD.when}. {RECORD.name}, {RECORD.where}.</p>
          <div className="rows">{RECORD.results.map((r) => <p data-rise key={r.who}><b>{r.what}</b><span>{r.who} {r.more}</span></p>)}</div>
          <p data-rise><A href={RECORD.more.href}>{RECORD.more.label}</A></p>
        </section>
        <section id="drive">
          <h2 data-rise>{DRIVE.title}</h2>
          <p className="lede" data-rise>{DRIVE.lead}</p>
          <div className="rows">{DRIVE.items.map((d) => <p data-rise key={d.term}><b>{d.term}</b><span>{d.text}</span></p>)}</div>
          <p data-rise><A href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
        </section>
        <section id="people">
          <h2 data-rise>{PEOPLE.title}</h2>
          <div className="rows">{PEOPLE.coaches.map((c) => <p data-rise key={c.name}><b>{c.name}</b><span>{c.role}. {c.bio}</span></p>)}</div>
          <p data-rise>{PEOPLE.count} <A href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
        </section>
        <section id="join">
          <h2 data-rise>{JOIN.title}</h2>
          <p className="lede" data-rise>{JOIN.lead}</p>
          <div className="rows">{JOIN.paths.map((p) => <p data-rise key={p.id}><b><A href={p.href}>{p.name}</A></b><span>{p.line} {p.text.join(' ')}</span></p>)}</div>
          <p data-rise>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>. {JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
        </section>
        <footer>
          <p className="line">{FOOTER.line}</p>
          <ul>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul>{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <small>Draft 2, version 11. Not the live site.</small>
        </footer>
      </main>
    </div>
  );
}
