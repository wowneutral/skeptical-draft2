// Version 10: the site as a command line. Every section is a command; the
// keys on screen run them for anyone who would rather not type.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './terminal.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { scrollToY } from '@/lib/scroll';
import { coarse, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import FaultyTerminal from '@/components/bits/FaultyTerminal';

const A = ({ href, children }: { href: string; children: ReactNode }) => <a href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>;
const Row = ({ k, children }: { k: string; children: ReactNode }) => <p className="row"><span className="k">{k}</span><span>{children}</span></p>;

const COMMANDS: Record<string, { about: string; run: () => ReactNode }> = {
  pitch: { about: 'what this is', run: () => <>{HERO.pitch.map((l) => <p className="big" key={l}>{l}</p>)}<p>{HERO.statement.join(' ')}</p></> },
  why: { about: 'how the team works', run: () => <>{MANIFESTO.map((m, i) => <Row k={`0${i + 1}`} key={m}>{m}</Row>)}</> },
  record: { about: 'breaks and speaker awards', run: () => <><p className="dim">{RECORD.rule}</p><p className="hl">{RECORD.when}. {RECORD.name}, {RECORD.where}.</p>{RECORD.results.map((r) => <Row k={r.who} key={r.who}><b>{r.what}.</b> {r.more}</Row>)}<p><A href={RECORD.more.href}>{RECORD.more.label}</A></p></> },
  drive: { about: 'what is in the drive', run: () => <><p className="dim">{DRIVE.lead}</p>{DRIVE.items.map((d) => <Row k={`${d.term.toLowerCase()}/`} key={d.term}>{d.text}</Row>)}<p><A href={DRIVE.more.href}>{DRIVE.more.label}</A></p></> },
  people: { about: 'the coaches', run: () => <>{PEOPLE.coaches.map((c) => <Row k={c.role.toLowerCase()} key={c.name}><b>{c.name}.</b> {c.bio}</Row>)}<p>{PEOPLE.count} <A href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p></> },
  join: { about: 'three ways in', run: () => <><p className="dim">{JOIN.lead}</p>{JOIN.paths.map((p) => <Row k={p.id} key={p.id}><A href={p.href}><b>{p.line}</b></A> {p.text.join(' ')}</Row>)}<p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p><p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p></> },
  links: { about: 'where else we are', run: () => <>{FOOTER.links.map((l) => <Row k={l.label.includes('@') ? 'email' : l.label.toLowerCase()} key={l.href}><A href={l.href}>{l.href.replace(/^mailto:|^https:\/\//, '')}</A></Row>)}{FOOTER.pages.map((l) => <Row k={l.label.toLowerCase()} key={l.href}><A href={l.href}>{l.href.replace('https://', '')}</A></Row>)}</> },
};
const ORDER = ['pitch', 'why', 'record', 'drive', 'people', 'join', 'links'];
const Help = () => <>{ORDER.map((c) => <Row k={c} key={c}>{COMMANDS[c].about}</Row>)}<Row k="all">everything, in order</Row><Row k="clear">wipe the screen</Row></>;

type Entry = { id: number; cmd: string; out: ReactNode };
let nextId = 1;

export default function Terminal() {
  useVersion('terminal');
  const [log, setLog] = useState<Entry[]>([]);
  const [value, setValue] = useState('');
  const [typing, setTyping] = useState('');
  const history = useRef<string[]>([]), cursor = useRef(-1);
  const input = useRef<HTMLInputElement>(null), end = useRef<HTMLDivElement>(null);

  const run = useCallback((raw: string) => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    history.current.unshift(cmd); cursor.current = -1;
    if (cmd === 'clear') { setLog([]); return; }
    const out = cmd === 'help' ? <Help />
      : cmd === 'all' ? <>{ORDER.map((c) => <div className="block" key={c}><p className="sub">{c}</p>{COMMANDS[c].run()}</div>)}</>
      : COMMANDS[cmd] ? COMMANDS[cmd].run()
      : <p>Not a command: <b>{cmd}</b>. Try <b>help</b>.</p>;
    setLog((l) => [...l, { id: nextId++, cmd, out }]);
  }, []);

  // On arrival the terminal types its own first command.
  useEffect(() => {
    if (still) { run('pitch'); run('help'); return; }
    let i = 0, alive = true;
    const word = 'pitch';
    const step = () => {
      if (!alive) return;
      if (i <= word.length) { setTyping(word.slice(0, i++)); setTimeout(step, 110); }
      else { setTyping(''); run('pitch'); setTimeout(() => alive && run('help'), 500); }
    };
    const t = setTimeout(step, 1100);
    return () => { alive = false; clearTimeout(t); };
  }, [run]);
  // Keep the newest output in view.
  useEffect(() => {
    if (log.length < 3) return;
    const y = end.current!.getBoundingClientRect().bottom + window.scrollY - window.innerHeight + 24;
    if (y > window.scrollY) scrollToY(y);
  }, [log]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { run(value); setValue(''); }
    else if (e.key === 'Tab' && value) { const hit = [...ORDER, 'all', 'help', 'clear'].find((c) => c.startsWith(value.toLowerCase())); if (hit) { e.preventDefault(); setValue(hit); } }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      cursor.current = Math.max(-1, Math.min(history.current.length - 1, cursor.current + (e.key === 'ArrowUp' ? 1 : -1)));
      setValue(cursor.current < 0 ? '' : history.current[cursor.current]);
    }
  };

  return (
    <div className="vt">
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="bg" aria-hidden="true">
        <FaultyTerminal scale={1.7} digitSize={1.5} timeScale={0.28} pause={still} scanlineIntensity={0.35} glitchAmount={1} flickerAmount={0.5} noiseAmp={0.8} chromaticAberration={0} dither={0} curvature={0.12} tint="#39d98a" mouseReact={!coarse} mouseStrength={0.25} pageLoadAnimation={!still} brightness={0.32} />
      </div>
      <main id="main" className="win" onClick={(e) => { if (!(e.target as HTMLElement).closest('a, button') && !window.getSelection()?.toString()) input.current?.focus({ preventScroll: true }); }}>
        <header className="bar"><span className="dots" aria-hidden="true"><i /><i /><i /></span><h1>skeptical: an independent Lincoln-Douglas debate team</h1></header>
        <div className="out" role="log" aria-live="polite" aria-label="Terminal output">
          {log.map((e) => (
            <div className="entry" key={e.id}>
              <p className="cmd"><span className="ps" aria-hidden="true">skeptical ~ %</span> {e.cmd}</p>
              <div className="res">{e.out}</div>
            </div>
          ))}
        </div>
        <div className="prompt">
          <label htmlFor="cli" className="ps">skeptical ~ %</label>
          <input id="cli" ref={input} value={typing || value} onChange={(e) => setValue(e.target.value)} onKeyDown={onKey} autoComplete="off" autoCapitalize="off" spellCheck={false} aria-describedby="cli-hint" readOnly={!!typing} />
        </div>
        <p id="cli-hint" className="hint">Type a command and press Return, or use the keys. Tab completes, the up arrow repeats.</p>
        <div className="keys" role="group" aria-label="Commands">
          {[...ORDER, 'all', 'help', 'clear'].map((c) => <button type="button" key={c} onClick={() => run(c)}>{c}</button>)}
        </div>
        <div ref={end} />
      </main>
      <footer><p>{FOOTER.line} Draft 2, version 10. Not the live site.</p></footer>
    </div>
  );
}
