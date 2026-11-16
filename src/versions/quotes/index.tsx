// Version 45: the quotes. Every claim arrives inside enormous quotation marks,
// set in a doubtful italic. Pull the marks off and the line stands upright.
import { useEffect, useRef, type ElementType, type ReactNode } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/index.css';
import './quotes.css';
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV, SITE } from '@/content';
import { useVersion } from '@/lib/version';
import { Marks } from './engine';

type Mode = 'doubt' | 'locked' | 'final';

/** One claim: its words, a socket for each mark, and (on the last line) the full stop the marks become. */
function Claim({ as: Tag = 'p', lines, mode = 'doubt', cls = '', focus = true, stop = false, extra }: {
  as?: ElementType; lines: string[]; mode?: Mode; cls?: string; focus?: boolean; stop?: boolean; extra?: ReactNode;
}) {
  const text = lines.join(' ');
  const out: ReactNode[] = [];
  lines.forEach((line, li) => {
    const words = line.split(' ');
    words.forEach((w, wi) => {
      const lastOfAll = li === lines.length - 1 && wi === words.length - 1;
      if (lastOfAll) {
        const body = stop && w.endsWith('.') ? <>{w.slice(0, -1)}<span className="stop">.</span></> : w;
        out.push(<span className="nw" key={`${li}-${wi}`}><span className="w">{body}</span><span className="sk sk-c" aria-hidden="true" /></span>);
      } else {
        out.push(<span className="w" key={`${li}-${wi}`}>{w}</span>, ' ');
      }
    });
    if (li < lines.length - 1) out.push(<br key={`br${li}`} />);
  });
  const interactive = focus ? { role: 'button', tabIndex: 0, 'aria-label': text, 'aria-describedby': mode === 'locked' ? 'q-locked' : 'q-hint', ...(mode === 'locked' ? {} : { 'aria-pressed': false }) } : {};
  return (
    <Tag className={`q-claim ${cls}`}>
      <span className="q-line" data-claim={mode} {...interactive}>
        <span className="sk sk-o" aria-hidden="true" />
        {out}
      </span>
      {extra}
    </Tag>
  );
}

/** A content line broken after n words, for the composition only; the words are the content's. */
const cut = (s: string, n: number) => { const w = s.split(' '); return [w.slice(0, n).join(' '), w.slice(n).join(' ')]; };

const ext = { target: '_blank', rel: 'noreferrer' } as const;

export default function Quotes() {
  useVersion('quotes');
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current || !layer.current) return;
    let m: Marks | null = null;
    let alive = true;
    const start = () => { if (alive && root.current && layer.current) m = new Marks(root.current, layer.current); };
    // Sockets are measured from the type, so wait for the faces.
    const fonts = document.fonts?.ready ?? Promise.resolve();
    Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).then(start);
    return () => { alive = false; m?.destroy(); };
  }, []);

  return (
    <div className="v-quotes" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="q-top">
        <a className="q-brand" href="#top">{SITE.name}<span className="q-dot">.</span></a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="q-sec q-hero" id="top" data-sec>
          <Claim as="h1" cls="c-hero" lines={cut(HERO.pitch[0], 2)} />
          <div className="q-under">
            <p className="q-pitch2">{HERO.pitch[1]}</p>
            <p className="q-hint" id="q-hint">Pull the quotes off.</p>
            <div className="q-doors">
              {HERO.doors.map((d) => <a key={d.href} className="q-door" href={d.href}>{d.label}</a>)}
            </div>
          </div>
        </section>

        <section className="q-sec q-state" data-sec aria-label="What it is">
          <Claim cls="c-state" lines={HERO.statement} />
        </section>

        {MANIFESTO.map((line, i) => (
          <section className={`q-sec q-man q-man-${i}`} data-sec key={line}>
            <Claim cls="c-man" lines={[line]} />
          </section>
        ))}

        <section className="q-sec q-record" id="record" data-sec>
          <h2 className="q-title">{RECORD.title}</h2>
          <div className="q-rec" data-claim="refuse">
            <p className="q-rule">{RECORD.rule}</p>
            <p className="q-event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ol className="q-results">
              {RECORD.results.map((r) => (
                <li key={r.who}>
                  <span className="q-what">{r.what}</span>
                  <span className="q-who">{r.who}</span>
                  <span className="q-more">{r.more}</span>
                </li>
              ))}
            </ol>
          </div>
          <a className="q-link" href={RECORD.more.href}>{RECORD.more.label}</a>
        </section>

        <section className="q-sec q-drive" id="drive" data-sec>
          <h2 className="q-title">{DRIVE.title}</h2>
          <Claim cls="c-lead" mode="locked" lines={[DRIVE.lead]} />
          <p className="sr-only-x" id="q-locked">These quotes stay on. None of it is public.</p>
          <ul className="q-items">
            {DRIVE.items.map((it) => (
              <li key={it.term}>
                <span className="q-term">{it.term}</span>
                <Claim as="span" cls="c-item" mode="locked" focus={false} lines={[it.text]} />
              </li>
            ))}
          </ul>
          <a className="q-link" href={DRIVE.more.href}>{DRIVE.more.label}</a>
        </section>

        <section className="q-sec q-people" id="people" data-sec>
          <h2 className="q-title">{PEOPLE.title}</h2>
          <Claim cls="c-count" lines={[PEOPLE.count]} />
          <div className="q-coaches">
            {PEOPLE.coaches.map((c) => (
              <article key={c.name} className="q-coach">
                <h3>{c.name}</h3>
                <p className="q-role">{c.role}</p>
                <p className="q-bio">{c.bio}</p>
              </article>
            ))}
          </div>
          <a className="q-link" href={PEOPLE.more.href}>{PEOPLE.more.label}</a>
        </section>

        <section className="q-sec q-join" id="join" data-sec>
          <h2 className="q-title">{JOIN.title}</h2>
          <Claim cls="c-lead" lines={[JOIN.lead]} />
          <div className="q-paths">
            {JOIN.paths.map((p) => (
              <article key={p.id} className="q-path">
                <h3>{p.name}</h3>
                <Claim cls="c-path" lines={[p.line]} />
                {p.text.map((t) => <p key={t} className="q-ptext">{t}</p>)}
                <a className="q-link" href={p.href}>Apply to {p.name.toLowerCase()}</a>
              </article>
            ))}
          </div>
          <div className="q-also">
            <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
            <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
            <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>
      </main>

      <footer className="q-sec q-foot" data-sec>
        <Claim cls="c-final" mode="final" stop lines={FOOTER.line.split(/(?<=\.) /)} />
        <div className="q-flinks">
          <ul aria-label="Elsewhere">
            {FOOTER.links.map((l) => <li key={l.href}><a href={l.href} {...(l.href.startsWith('mailto') ? {} : ext)}>{l.label}</a></li>)}
          </ul>
          <ul aria-label="Pages">
            {FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
          </ul>
        </div>
        <p className="q-small">Draft 2, version 45. Not the live site.</p>
      </footer>

      <div className="q-layer" ref={layer} aria-hidden="true" />
    </div>
  );
}
