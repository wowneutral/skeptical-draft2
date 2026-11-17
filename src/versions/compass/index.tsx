// The compass: show your working. Every big letter is constructed in front of
// you with circles and straight lines, then inked. Drag a point and the letter
// follows; press the letter and it is rubbed out and drawn again.
import { useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { useVersion } from '@/lib/version';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { still } from '@/lib/utils';
import Plate from './Plate';
import { QMARK, R_, D_, P_, J_, STOP } from './geo';
import './compass.css';

const [WORD, REST] = SITE.heading.split(':');

function Head({ id, title, children }: { id: string; title: string; children?: React.ReactNode }) {
  return (
    <h2 className="sec-title" id={id + '-t'}>
      {children ?? title}
    </h2>
  );
}

function More({ href, label }: { href: string; label: string }) {
  return (
    <a className="more" href={href}>
      <span>{label}</span>
      <svg viewBox="0 0 48 16" aria-hidden="true" focusable="false"><path d="M0 8h45M38 1.5 45.5 8 38 14.5" /></svg>
    </a>
  );
}

function Manifesto() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (still) return;
    root.current!.querySelectorAll<HTMLElement>('.m-line').forEach((line) => {
      const rule = line.querySelector('.m-rule');
      gsap.fromTo(rule, { scaleX: 0 }, {
        scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: line, start: 'top 92%', end: 'top 55%', scrub: 0.6 },
      });
    });
  }, { scope: root });
  return (
    <section className="mani" ref={root} aria-label="What we are">
      {MANIFESTO.map((m, k) => (
        <p className="m-line" key={k}>
          <span className="m-text">{m}</span>
          <span className="m-rule" aria-hidden="true"><i /></span>
        </p>
      ))}
    </section>
  );
}

export default function Compass() {
  useVersion('compass');
  const [stop, setStop] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (still) return;
    root.current!.querySelectorAll<HTMLElement>('[data-up]').forEach((el) => {
      gsap.fromTo(el, { y: 26 }, { y: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
    ScrollTrigger.refresh();
  }, { scope: root });

  return (
    <div className="v-compass" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top">
        <a className="top-word" href="#main">{SITE.name}</a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={'#' + n.id}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="hero">
          <div className="hero-plate frame">
            <Plate g={QMARK} trigger="load" delay={0.35} label="A question mark, constructed with compass and straightedge" />
          </div>
          <div className="hero-copy">
            <h1 className="word">
              {WORD}<span className="sr-only-x">:{REST}</span>
            </h1>
            <p className="pitch">
              {HERO.pitch.map((l) => <span key={l}>{l}</span>)}
            </p>
            <p className="state">
              {HERO.statement.map((l) => <span key={l}>{l}</span>)}
            </p>
            <div className="doors">
              {HERO.doors.map((d, k) => (
                <a key={d.href} className={'door' + (k === 0 ? ' is-main' : '')} href={d.href}>{d.label}</a>
              ))}
            </div>
          </div>
        </section>

        <Manifesto />

        <section className="sec" id="record" aria-labelledby="record-t">
          <div className="sec-plate frame">
            <Plate g={R_} label="The capital R, constructed" />
          </div>
          <div className="sec-body">
            <Head id="record" title={RECORD.title} />
            <p className="rule-line" data-up>{RECORD.rule}</p>
            <p className="event" data-up>
              <span>{RECORD.when}</span>
              <strong>{RECORD.name}</strong>
              <span>{RECORD.where}</span>
            </p>
            <ol className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-up>
                  <span className="r-what">{r.what}</span>
                  <span className="r-who">{r.who}</span>
                  <span className="r-more">{r.more}</span>
                </li>
              ))}
            </ol>
            <More href={RECORD.more.href} label={RECORD.more.label} />
          </div>
        </section>

        <section className="sec is-flip" id="drive" aria-labelledby="drive-t">
          <div className="sec-plate frame">
            <Plate g={D_} outline label="The capital D, constructed in outline and left empty" />
          </div>
          <div className="sec-body">
            <Head id="drive" title={DRIVE.title} />
            <p className="lead" data-up>{DRIVE.lead}</p>
            <dl className="drive">
              {DRIVE.items.map((d) => (
                <div key={d.term} data-up>
                  <dt>{d.term}</dt>
                  <dd>{d.text}</dd>
                </div>
              ))}
            </dl>
            <More href={DRIVE.more.href} label={DRIVE.more.label} />
          </div>
        </section>

        <section className="sec" id="people" aria-labelledby="people-t">
          <div className="sec-plate frame">
            <Plate g={P_} label="The capital P, constructed" />
          </div>
          <div className="sec-body">
            <Head id="people" title={PEOPLE.title} />
            <div className="coaches">
              {PEOPLE.coaches.map((c) => (
                <article key={c.name} data-up>
                  <h3>{c.name}</h3>
                  <p className="role">{c.role}</p>
                  <p>{c.bio}</p>
                </article>
              ))}
            </div>
            <p className="count" data-up>{PEOPLE.count}</p>
            <More href={PEOPLE.more.href} label={PEOPLE.more.label} />
          </div>
        </section>

        <section className="sec is-flip is-join" id="join" aria-labelledby="join-t">
          <div className="sec-plate frame">
            <Plate g={J_} label="The capital J, constructed" onDone={() => setStop(true)} />
          </div>
          <div className="sec-body">
            <Head id="join" title={JOIN.title}>
              {JOIN.title.replace(/\.$/, '')}
              <span className="stop" aria-hidden="true">
                <Plate g={STOP} trigger="go" go={stop} interactive={false} label="" />
              </span>
              <span className="sr-only-x">.</span>
            </Head>
            <p className="lead" data-up>{JOIN.lead}</p>
            <div className="paths">
              {JOIN.paths.map((p) => (
                <article key={p.id} className="path" data-up>
                  <h3><a href={p.href}>{p.name}</a></h3>
                  <p className="p-line">{p.line}</p>
                  <ul>
                    {p.text.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </article>
              ))}
            </div>
            <div className="also" data-up>
              <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a>.</p>
              <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a>.</p>
              <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
              <p>{JOIN.discord}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <p className="f-line">
          {FOOTER.line.replace(/\.$/, '')}
          <span className="stop" aria-hidden="true">
            <Plate g={STOP} trigger="view" interactive={false} label="" />
          </span>
          <span className="sr-only-x">.</span>
        </p>
        <div className="f-cols">
          <ul>
            {FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
          </ul>
          <ul>
            {FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
          </ul>
        </div>
        <p className="small">Set in Bodoni Moda and Newsreader. Draft 2, version 91. Not the live site.</p>
      </footer>
    </div>
  );
}
