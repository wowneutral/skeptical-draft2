import { useRef } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/schibsted-grotesk';
import './bracket.css';
import { useVersion } from '@/lib/version';
import { useRise } from '@/lib/motion';
import { gsap, scroll } from '@/lib/scroll';
import { useGSAP } from '@gsap/react';
import { clamp, still } from '@/lib/utils';
import { DRIVE, FOOTER, HERO, JOIN, MANIFESTO, PEOPLE, RECORD, SITE } from '@/content';
import { Sheet } from './Sheet';
import { Join } from './Join';

function Tag({ children }: { children: string }) {
  return <p className="tag"><span className="tag-tick" aria-hidden="true" />{children}</p>;
}

export default function Bracket() {
  useVersion('bracket');
  const page = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  useRise(page);

  // The calm field under the bracket steps aside as the camera dives in.
  useGSAP(() => {
    if (still) return;
    const tick = () => {
      const vh = window.innerHeight;
      const t = clamp((scroll.y || window.scrollY) / (vh * 0.35));
      if (hero.current) { hero.current.style.opacity = String(1 - t); hero.current.style.transform = `translateY(${(-t * 40).toFixed(1)}px)`; }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, { scope: page });

  return (
    <div ref={page} className={`v-bracket${still ? ' is-still' : ''}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      <Sheet />
      <main id="main">
        <section className="hero" aria-labelledby="bk-h1">
          <h1 id="bk-h1" className="sr-only-x">{SITE.heading}</h1>
          <div ref={hero} className="hero-field">
            <p className="pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <p className="statement">{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>
            <nav className="doors" aria-label="Two ways in">
              {HERO.doors.map((d) => (
                <a key={d.label} className="door" href={d.href}><span>{d.label}</span><i aria-hidden="true" /></a>
              ))}
            </nav>
          </div>
        </section>

        <div className="travel t0" aria-hidden="true" />
        <section id="manifesto" className="sec sec-man" aria-label="Octafinals">
          <Tag>Octafinals</Tag>
          <div className="man">
            {MANIFESTO.map((m) => <p key={m} data-rise>{m}</p>)}
          </div>
        </section>

        <div className="travel" aria-hidden="true" />
        <section id="record" className="sec sec-rec" aria-labelledby="bk-rec">
          <Tag>Quarterfinals</Tag>
          <h2 id="bk-rec" className="title" data-rise>{RECORD.title}</h2>
          <p className="rule-line" data-rise>{RECORD.rule}</p>
          <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
          <div className="results">
            {RECORD.results.map((r) => (
              <div key={r.who} className="result" data-rise>
                <p className="res-what">{r.what}</p>
                <p className="res-who"><span className="res-rule" aria-hidden="true" />{r.who}</p>
                <p className="res-more">{r.more}</p>
              </div>
            ))}
          </div>
          <a className="more" href={RECORD.more.href} data-rise>{RECORD.more.label}</a>
        </section>

        <div className="travel" aria-hidden="true" />
        <section id="drive" className="sec sec-drive" aria-labelledby="bk-drive">
          <Tag>Semifinals</Tag>
          <h2 id="bk-drive" className="title" data-rise>{DRIVE.title}</h2>
          <p className="lead" data-rise>{DRIVE.lead}</p>
          <dl className="items">
            {DRIVE.items.map((it) => (
              <div key={it.term} className="item" data-rise>
                <dt>{it.term}</dt>
                <dd>{it.text}</dd>
              </div>
            ))}
          </dl>
          <a className="more" href={DRIVE.more.href} data-rise>{DRIVE.more.label}</a>
        </section>

        <div className="travel" aria-hidden="true" />
        <section id="people" className="sec sec-people" aria-labelledby="bk-people">
          <Tag>Finals</Tag>
          <h2 id="bk-people" className="title" data-rise>{PEOPLE.title}</h2>
          <div className="coaches">
            {PEOPLE.coaches.map((c) => (
              <div key={c.name} className="coach" data-rise>
                <p className="coach-role">{c.role}</p>
                <h3 className="coach-name">{c.name}</h3>
                <p className="coach-bio">{c.bio}</p>
              </div>
            ))}
          </div>
          <p className="count" data-rise>{PEOPLE.count}</p>
          <a className="more" href={PEOPLE.more.href} data-rise>{PEOPLE.more.label}</a>
        </section>

        <div className="travel" aria-hidden="true" />
        <section id="join" className="sec sec-join" aria-labelledby="bk-join">
          <h2 id="bk-join" className="title join-title">{JOIN.title}</h2>
          <p className="lead">{JOIN.lead}</p>
          <Join />
        </section>

        <div className="travel" aria-hidden="true" />
      </main>
      <footer id="end" className="end">
        <div className="end-field">
          <p className="end-line">{FOOTER.line}</p>
          <ul className="end-links">
            {FOOTER.links.map((l) => <li key={l.href}><a className="u" href={l.href}>{l.label}</a></li>)}
          </ul>
          <ul className="end-pages">
            {FOOTER.pages.map((l) => <li key={l.href}><a className="u" href={l.href}>{l.label}</a></li>)}
          </ul>
          <p className="draft">Draft 2, version 82. Not the live site.</p>
        </div>
      </footer>
    </div>
  );
}
