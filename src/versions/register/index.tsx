import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './register.css';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useVersion } from '@/lib/version';
import { still } from '@/lib/utils';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { Type, Mark, Marks, Sheet } from './Type';
import { measureAll, reprint, stop } from './engine';
import meta from './meta';

function useNarrow() {
  const [n, setN] = useState(() => typeof window !== 'undefined' && window.innerWidth < 700);
  useEffect(() => {
    const on = () => setN(window.innerWidth < 700);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return n;
}

/** Sets the display word so its widest line fills the measure. */
function useFit(ref: React.RefObject<HTMLElement | null>, maxVh: number, dep: unknown) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = '100px';
      const lines = Array.from(el.querySelectorAll<HTMLElement>('.ln'));
      const widest = Math.max(1, ...lines.map((l) => l.getBoundingClientRect().width));
      const avail = el.clientWidth;
      const fs = Math.min((100 * avail) / widest, window.innerHeight * maxVh);
      el.style.fontSize = `${Math.floor(fs * 0.995)}px`;
      measureAll();
    };
    fit();
    document.fonts?.ready.then(fit);
    const t = setTimeout(fit, 700);
    window.addEventListener('resize', fit);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', fit);
    };
  }, [ref, maxVh, dep]);
}

function Arrow() {
  return (
    <svg className="arr" viewBox="0 0 24 12" aria-hidden="true" focusable="false">
      <path d="M0 6H22M17 1L22 6L17 11" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function Hero() {
  const narrow = useNarrow();
  const word = useRef<HTMLHeadingElement>(null);
  const sheet = useRef<HTMLElement>(null);
  useFit(word, narrow ? 0.3 : 0.44, narrow);
  const press = () => {
    reprint();
    const el = sheet.current;
    if (!el || still) return;
    el.classList.remove('feed');
    void el.offsetWidth;
    el.classList.add('feed');
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === '?' && !(e.target instanceof HTMLInputElement)) press();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return (
    <header className="hero" ref={sheet}>
      <div className="bar">
        <span className="inks" aria-hidden="true">
          <i className="i-k" />
          <i className="i-r" />
          <i className="i-kr" />
        </span>
        <nav aria-label="Sections">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`}>{n.label}</a>
          ))}
        </nav>
      </div>
      <Sheet mode="hero" className="wordsheet" key={narrow ? 'n' : 'w'}>
        <Marks />
        <h1 className="word" ref={word}>
          <span className="sr-only-x">{SITE.heading}</span>
          <Type
            text="SKEPTICAL"
            lines={narrow ? ['SKEP', 'TICAL'] : ['SKEPTICAL']}
            tail={
              <button type="button" className="q" onClick={press} aria-label="Run another sheet">
                <span className="u ro"><span className="r">?</span></span>
              </button>
            }
          />
        </h1>
      </Sheet>
      <p className="hint">Press the question mark.</p>
      <div className="under">
        <p className="pitch">
          {HERO.pitch.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </p>
        <p className="statement">
          {HERO.statement.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </p>
        <div className="doors">
          {HERO.doors.map((d) => (
            <a key={d.href} className="door" href={d.href}>
              <span>{d.label}</span>
              <Arrow />
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}

function Title({ text, red, id }: { text: string; red: string[]; id: string }) {
  return (
    <Sheet className="title">
      <Marks />
      <h2 id={id + '-h'} className="h2">
        <span className="sr-only-x">{text}</span>
        <Type text={text} red={red} />
      </h2>
    </Sheet>
  );
}

function Manifesto() {
  return (
    <section className="manifesto" aria-label="What we are">
      {MANIFESTO.map((l, i) => (
        <Sheet key={l} className={`mline m${i}`}>
          <Mark at="ml" />
          <p className="mtext">
            <span className="sr-only-x">{l}</span>
            <Type text={l} by="word" red={i === 3 ? ['position'] : i === 0 ? ['independent'] : []} />
          </p>
        </Sheet>
      ))}
    </section>
  );
}

function Record() {
  return (
    <section id="record" className="sec record" aria-labelledby="record-h">
      <Title text={RECORD.title} red={['record']} id="record" />
      <div className="ticket">
        <div className="t-head">
          <span>Job ticket</span>
          <span className="t-inks" aria-hidden="true"><i className="i-k" /><i className="i-r" /></span>
        </div>
        <dl className="t-fields">
          <div className="t-row t-rule">
            <dt>Rule</dt>
            <dd>{RECORD.rule}</dd>
          </div>
          <div className="t-row">
            <dt>Date</dt>
            <dd>{RECORD.when}</dd>
          </div>
          <div className="t-row">
            <dt>Event</dt>
            <dd>{RECORD.name}</dd>
          </div>
          <div className="t-row">
            <dt>Place</dt>
            <dd>{RECORD.where}</dd>
          </div>
        </dl>
        <ul className="t-results">
          {RECORD.results.map((r) => (
            <li key={r.who} className="t-res">
              <span className="t-who">{r.who}</span>
              <Sheet className="t-what">
                <h3 className="h3">
                  <span className="sr-only-x">{r.what}</span>
                  <Type text={r.what} by="word" />
                </h3>
              </Sheet>
              <span className="t-more">{r.more}</span>
            </li>
          ))}
        </ul>
        <div className="t-foot">
          <a className="lnk" href={RECORD.more.href}>
            {RECORD.more.label} <Arrow />
          </a>
        </div>
      </div>
    </section>
  );
}

function Drive() {
  return (
    <section id="drive" className="sec drive" aria-labelledby="drive-h">
      <Title text={DRIVE.title} red={[]} id="drive" />
      <p className="lead">{DRIVE.lead}</p>
      <dl className="d-list">
        {DRIVE.items.map((it) => (
          <div className="d-row" key={it.term}>
            <dt>
              <Sheet className="d-term">
                <span className="sr-only-x">{it.term}</span>
                <Type text={it.term} />
              </Sheet>
            </dt>
            <dd>{it.text}</dd>
          </div>
        ))}
      </dl>
      <a className="lnk" href={DRIVE.more.href}>
        {DRIVE.more.label} <Arrow />
      </a>
    </section>
  );
}

function People() {
  return (
    <section id="people" className="sec people" aria-labelledby="people-h">
      <Title text={PEOPLE.title} red={[]} id="people" />
      <div className="p-grid">
        {PEOPLE.coaches.map((c) => {
          const [first, ...rest] = c.name.split(' ');
          return (
            <article key={c.name} className="coach">
              <Sheet className="c-name">
                <Mark at="tl" />
                <h3 className="h3">
                  <span className="sr-only-x">{c.name}</span>
                  <Type text={c.name} lines={[first, rest.join(' ')]} />
                </h3>
              </Sheet>
              <p className="c-role">{c.role}</p>
              <p className="c-bio">{c.bio}</p>
            </article>
          );
        })}
      </div>
      <Sheet className="count">
        <p>
          <span className="sr-only-x">{PEOPLE.count}</span>
          <Type text={PEOPLE.count} by="word" red={['eight']} />
        </p>
      </Sheet>
      <a className="lnk" href={PEOPLE.more.href}>
        {PEOPLE.more.label} <Arrow />
      </a>
    </section>
  );
}

function Join() {
  return (
    <section id="join" className="sec join" aria-labelledby="join-h">
      <Title text={JOIN.title} red={['join']} id="join" />
      <p className="lead">{JOIN.lead}</p>
      <ol className="j-list">
        {JOIN.paths.map((p, i) => (
          <li key={p.id} className={`j-path j${i}`}>
            <Sheet className="j-word">
              <Marks />
              <h3 className="h3">
                <span className="sr-only-x">{p.name}</span>
                <Type text={p.name} />
              </h3>
            </Sheet>
            <div className="j-body">
              <a className="j-line" href={p.href}>
                <span>{p.line}</span>
                <Arrow />
              </a>
              <div className="j-text">
                {p.text.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="j-after">
        <p>
          {JOIN.already.before}
          <a className="lnk" href={JOIN.already.href}>{JOIN.already.label}</a>
        </p>
        <p>
          {JOIN.coach.before}
          <a className="lnk" href={JOIN.coach.href}>{JOIN.coach.label}</a>
        </p>
        <p>
          {JOIN.also}{' '}
          <a className="lnk" href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>
        <p>{JOIN.discord}</p>
      </div>
    </section>
  );
}

function Footer() {
  const word = useRef<HTMLParagraphElement>(null);
  const foot = useRef<HTMLElement>(null);
  useFit(word, 0.4, 0);
  useEffect(() => {
    const el = foot.current;
    if (!el || still) return;
    el.classList.add('wait');
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.remove('wait');
          el.classList.add('off');
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <footer className="foot" ref={foot}>
      <Sheet mode="fixed" className="f-sheet">
        <Marks />
        <p className="word f-word" ref={word}>
          <span className="sr-only-x">Skeptical?</span>
          <Type text="SKEPTICAL?" lines={['SKEPTICAL?']} />
        </p>
      </Sheet>
      <p className="f-line">{FOOTER.line}</p>
      <div className="f-cols">
        <ul aria-label="Elsewhere">
          {FOOTER.links.map((l) => (
            <li key={l.href}><a className="lnk" href={l.href}>{l.label}</a></li>
          ))}
        </ul>
        <ul aria-label="Pages">
          {FOOTER.pages.map((l) => (
            <li key={l.href}><a className="lnk" href={l.href}>{l.label}</a></li>
          ))}
        </ul>
      </div>
      <p className="f-small">Draft 2, version {meta.n}. Not the live site.</p>
    </footer>
  );
}

export default function Register() {
  useVersion('register');
  useEffect(() => () => stop(), []);
  return (
    <div className="v-register">
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main">
        <Hero />
        <Manifesto />
        <Record />
        <Drive />
        <People />
        <Join />
      </main>
      <Footer />
    </div>
  );
}
