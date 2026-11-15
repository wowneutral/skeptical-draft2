// Version 13: the site as a group chat. Each section is a channel; open one
// and the team account types it out, a message at a time. Nothing is put in
// anyone's mouth: every message is from the team, and is the site's own copy.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/instrument-sans';
import '@fontsource/bodoni-moda/400-italic.css';
import './server.css';
import { Hash } from 'lucide-react';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';

const A = ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>;
type Channel = { id: string; topic: string; messages: ReactNode[] };
const CHANNELS: Channel[] = [
  { id: 'welcome', topic: HERO.pitch.join(' '), messages: [
    <p className="big">{HERO.pitch[0]}<br />{HERO.pitch[1]}</p>,
    ...HERO.statement.map((s) => <p>{s}</p>),
    ...MANIFESTO.map((m) => <p>{m}</p>),
    <p className="acts">{HERO.doors.map((d) => <A key={d.href} href={d.href} className="act">{d.label}</A>)}</p>,
  ] },
  { id: 'record', topic: RECORD.rule, messages: [
    <p>{RECORD.rule}</p>,
    <p>{RECORD.when}. {RECORD.name}, {RECORD.where}.</p>,
    ...RECORD.results.map((r) => <p className="card"><b>{r.what}</b><span>{r.who} {r.more}</span></p>),
    <p><A href={RECORD.more.href}>{RECORD.more.label}</A></p>,
  ] },
  { id: 'drive', topic: DRIVE.lead, messages: [
    <p>{DRIVE.lead}</p>,
    ...DRIVE.items.map((d) => <p><b>{d.term}.</b> {d.text}</p>),
    <p><A href={DRIVE.more.href}>{DRIVE.more.label}</A></p>,
  ] },
  { id: 'people', topic: PEOPLE.count, messages: [
    ...PEOPLE.coaches.map((c) => <p className="card"><b>{c.name}</b><span>{c.role}. {c.bio}</span></p>),
    <p>{PEOPLE.count} <A href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>,
  ] },
  { id: 'join', topic: JOIN.lead, messages: [
    <p>{JOIN.lead}</p>,
    ...JOIN.paths.map((p) => <div className="card"><b>{p.name}. {p.line}</b>{p.text.map((t) => <span key={t}>{t}</span>)}<A href={p.href} className="act">The application</A></div>),
    <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>,
    <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>,
    <p>{JOIN.discord} <A href={SITE.discord}>Discord</A></p>,
  ] },
];
const Avatar = () => <span className="av" aria-hidden="true">?</span>;

export default function Server() {
  useVersion('server');
  const [at, setAt] = useState(0);
  // How many messages of each channel have arrived. A channel only types itself out the first time.
  const [seen, setSeen] = useState<number[]>(() => CHANNELS.map((c, i) => (still ? c.messages.length : i === 0 ? 0 : 0)));
  const feed = useRef<HTMLDivElement>(null);
  const ch = CHANNELS[at], shown = seen[at], typing = shown < ch.messages.length;

  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => setSeen((s) => s.map((n, i) => (i === at ? n + 1 : n))), shown === 0 ? 900 : 520 + Math.min(700, 14 * 40));
    return () => clearTimeout(t);
  }, [at, shown, typing]);
  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: still ? 'auto' : 'smooth' }); }, [shown, at]);

  return (
    <div className="vsv">
      <a className="skip-x" href="#main">Skip to content</a>
      <aside className="side">
        <a className="mark" href={SITE.discord} rel="noopener" aria-label="Skeptical on Discord">skeptical</a>
        <nav aria-label="Channels">
          {CHANNELS.map((c, i) => (
            <button type="button" key={c.id} aria-current={i === at ? 'true' : undefined} onClick={() => setAt(i)}>
              <Hash size={16} aria-hidden="true" />{c.id}{seen[i] === 0 && i !== at && <i aria-label="unread" />}
            </button>
          ))}
        </nav>
        <ul className="links">{FOOTER.links.slice(0, 4).map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <small>Draft 2, version 13. Not the live site.</small>
      </aside>

      <main id="main" className="room">
        <header>
          <h1><Hash size={20} aria-hidden="true" />{ch.id}<span className="sr-only-x">, {SITE.heading}</span></h1>
          <p>{ch.topic}</p>
        </header>
        <div className="feed" ref={feed} data-lenis-prevent role="log" aria-live="polite" aria-label={`Messages in ${ch.id}`}>
          <div className="msgs" key={ch.id}>
            {ch.messages.slice(0, shown).map((m, i) => (
              <article className={`msg${i === 0 ? ' first' : ''}`} key={i}>
                {i === 0 ? <Avatar /> : <span className="gutter" />}
                <div>{i === 0 && <p className="who">Skeptical <span>the team</span></p>}{m}</div>
              </article>
            ))}
            {typing && <p className="typing" role="status" aria-label="Skeptical is typing"><Avatar /><span><i /><i /><i /></span></p>}
          </div>
        </div>
        <footer className="reply" aria-label="Go to a channel">
          {CHANNELS.filter((_, i) => i !== at).map((c) => <button type="button" key={c.id} onClick={() => setAt(CHANNELS.indexOf(c))}><Hash size={14} aria-hidden="true" />{c.id}</button>)}
          <p>{FOOTER.line}</p>
        </footer>
      </main>
    </div>
  );
}
