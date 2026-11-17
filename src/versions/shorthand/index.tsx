import { useEffect, useRef, useState } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/archivo/wdth.css';
import './shorthand.css';
import { useVersion } from '@/lib/version';
import { scrollToY } from '@/lib/scroll';
import { still, isPhone } from '@/lib/utils';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { Line } from './Line';
import { state, setFlow } from './engine';
import meta from './meta';

let introAt = 0;
const heroForce = () => {
  if (!introAt) {
    if (document.fonts && document.fonts.status !== 'loaded') return 0;
    introAt = performance.now() + 1100;
  }
  return performance.now() < introAt ? 0 : null;
};

const bigMode = typeof window !== 'undefined' && isPhone() ? 'wrap' : 'fit';

/** The last line opens as you reach the end of the page. */
const atEnd = () => {
  const d = document.documentElement;
  return window.innerHeight + window.scrollY >= d.scrollHeight - 60 ? 1 : null;
};

function useFlow() {
  const [flow, setF] = useState(state.flow);
  useEffect(() => {
    const f = () => setF(state.flow);
    state.listeners.add(f);
    return () => void state.listeners.delete(f);
  }, []);
  return flow;
}

/** Hold anywhere: the whole page folds to shorthand until you let go. */
function useHold(rootRef: React.RefObject<HTMLDivElement | null>) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (still) return;
    const root = rootRef.current!;
    let timer = 0;
    let sx = 0;
    let sy = 0;
    const cancel = () => clearTimeout(timer);
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      sx = e.clientX;
      sy = e.clientY;
      state.suppress = false;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        state.hold = true;
        state.suppress = true;
        setHeld(true);
      }, 320);
    };
    const move = (e: PointerEvent) => {
      if (!state.hold && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel();
    };
    const up = () => {
      cancel();
      if (state.hold) {
        state.hold = false;
        setHeld(false);
        setTimeout(() => (state.suppress = false), 60);
      }
    };
    const click = (e: MouseEvent) => {
      if (state.suppress) {
        e.preventDefault();
        e.stopPropagation();
        state.suppress = false;
      }
    };
    const ctx = (e: Event) => state.hold && e.preventDefault();
    root.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    root.addEventListener('click', click, true);
    root.addEventListener('contextmenu', ctx);
    return () => {
      cancel();
      root.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      root.removeEventListener('click', click, true);
      root.removeEventListener('contextmenu', ctx);
    };
  }, [rootRef]);
  return held;
}

const Arrow = () => (
  <svg className="sh-go" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M6 20 H32 M21 9 L33 20 L21 31" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="square" />
  </svg>
);

function Drive() {
  const [sel, setSel] = useState(0);
  return (
    <>
      <div className="sh-row" role="group" aria-label="What is in the drive">
        {DRIVE.items.map((it, i) => (
          <button
            key={it.term}
            type="button"
            className="sh-abbr"
            aria-pressed={sel === i}
            onClick={() => setSel(i)}
            onPointerEnter={(e) => e.pointerType === 'mouse' && setSel(i)}
            onFocus={() => setSel(i)}
          >
            <Line text={it.term} as="span" size="mark" mode="fixed" press={false} force={() => (sel === i ? 1 : 0)} rate={7} />
          </button>
        ))}
      </div>
      <dl className="sh-dl">
        {DRIVE.items.map((it, i) => (
          <div key={it.term} className={sel === i ? 'on' : ''} onPointerEnter={(e) => e.pointerType === 'mouse' && setSel(i)}>
            <dt>{it.term}</dt>
            <dd>{it.text}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function Paths() {
  const [open, setOpen] = useState<number | null>(null);
  const phone = typeof window !== 'undefined' && isPhone();
  return (
    <div className="sh-paths">
      {JOIN.paths.map((p, i) => (
        <article
          key={p.id}
          className={`sh-path ${open === i || phone || still ? 'open' : ''}`}
          onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(i)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen((o) => (o === i ? null : o))}
          onFocus={() => setOpen(i)}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(null)}
        >
          <h3 className="sh-mark3">
            <button type="button" className="sh-markbtn" aria-expanded={open === i || phone} onClick={() => setOpen(open === i ? null : i)}>
              <Line text={p.name} as="span" size="mark" mode="fit" press={false} force={() => (open === i ? 1 : phone ? null : 0)} rate={5.5} />
            </button>
          </h3>
          <a className="sh-pathlink" href={p.href}>
            <Line text={p.line} as="span" size="m" press={false} force={() => (phone ? null : open === i ? 1 : 0)} rate={5} />
            <Arrow />
          </a>
          <p className="sh-first">{p.text[0]}</p>
          <div className="sh-more">
            <div>
              {p.text.slice(1).map((t) => (
                <p key={t}>{t}</p>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function Shorthand() {
  useVersion('shorthand');
  const rootRef = useRef<HTMLDivElement>(null);
  const held = useHold(rootRef);
  const flow = useFlow();

  return (
    <div className={`v-shorthand ${held || flow ? 'is-flow' : ''}`} ref={rootRef}>
      <a className="skip-x" href="#main">
        Skip to content
      </a>
      <header className="sh-top">
        <h1 className="sh-word">
          Skeptical<span className="sr-only-x">{SITE.heading.slice('Skeptical'.length)}</span>
        </h1>
        {!still && (
          <button type="button" className="sh-flowbtn" aria-pressed={flow} onClick={() => setFlow(!flow)}>
            <span className="u-red">{flow ? '=' : 'Ø'}</span> {flow ? 'Read it out' : 'Flow it'}
          </button>
        )}
      </header>

      <main id="main">
        <section className="sh-hero" aria-label="Free to join">
          <Line text={HERO.statement[0]} size="hero" mode="fit" force={heroForce} rate={2.4} className="scr hero" />
          {!still && <p className="sh-hint">Press a line to fold it. Hold anywhere to see the flow.</p>}
        </section>

        <section className="sh-sec" aria-label="Who we are">
          <Line text={HERO.pitch[0]} size="xl" className="scr" />
          <Line text={HERO.pitch[1]} size="xl" className="scr" />
          <Line text={HERO.statement[1]} size="big" mode={bigMode} className="scr" />
          <Line text={HERO.statement[2]} size="big" mode={bigMode} className="scr" />
          <div className="sh-doors">
            {HERO.doors.map((d) => (
              <a key={d.href} href={d.href} className="sh-door">
                <Line text={d.label} as="span" size="l" press={false} rate={5} />
                <Arrow />
              </a>
            ))}
          </div>
        </section>

        <section className="sh-sec sh-man" aria-label="What we are">
          {MANIFESTO.map((m) => (
            <Line key={m} text={m} size="xl" className="scr" />
          ))}
        </section>

        <section className="sh-sec" id="record" aria-labelledby="h-record">
          <h2 className="sh-h2" id="h-record">
            {RECORD.title}
          </h2>
          <Line text={RECORD.rule} size="xl" className="scr" />
          <div className="sh-event">
            <Line text={RECORD.when} size="m" />
            <Line text={RECORD.name} size="m" />
            <Line text={RECORD.where} size="m" />
          </div>
          <div className="sh-results">
            {RECORD.results.map((r) => (
              <div className="sh-res" key={r.who}>
                <p className="sh-who">{r.who}</p>
                <Line text={r.what} size="xl" />
                <Line text={r.more} size="m" />
              </div>
            ))}
          </div>
          <a className="sh-more-link" href={RECORD.more.href}>
            {RECORD.more.label} <Arrow />
          </a>
        </section>

        <section className="sh-sec" id="drive" aria-labelledby="h-drive">
          <h2 className="sh-h2" id="h-drive">
            {DRIVE.title}
          </h2>
          <Line text={DRIVE.lead} size="xl" className="scr" />
          <Drive />
          <a className="sh-more-link" href={DRIVE.more.href}>
            {DRIVE.more.label} <Arrow />
          </a>
        </section>

        <section className="sh-sec" id="people" aria-labelledby="h-people">
          <h2 className="sh-h2" id="h-people">
            {PEOPLE.title}
          </h2>
          <Line text={PEOPLE.count} size="big" mode={bigMode} className="scr" />
          <div className="sh-coaches">
            {PEOPLE.coaches.map((c) => (
              <div className="sh-coach" key={c.name}>
                <h3 className="sh-name">{c.name}</h3>
                <p className="sh-role">{c.role}</p>
                <Line text={c.bio} size="l" />
              </div>
            ))}
          </div>
          <a className="sh-more-link" href={PEOPLE.more.href}>
            {PEOPLE.more.label} <Arrow />
          </a>
        </section>

        <section className="sh-sec" id="join" aria-labelledby="h-join">
          <h2 className="sh-h2" id="h-join">
            {JOIN.title}
          </h2>
          <Line text={JOIN.lead} size="xl" className="scr" />
          <Paths />
          <div className="sh-after">
            <p>
              {JOIN.already.before}
              <a href={JOIN.already.href}>{JOIN.already.label}</a>
            </p>
            <p>
              {JOIN.coach.before}
              <a href={JOIN.coach.href}>{JOIN.coach.label}</a>
            </p>
            <p>
              {JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </p>
            <p>{JOIN.discord}</p>
          </div>
        </section>
      </main>

      <footer className="sh-foot">
        <Line text={FOOTER.line} size="big" mode={bigMode} className="sh-endline" force={atEnd} rate={3} />
        {!still && (
          <button
            type="button"
            className="sh-again"
            onClick={() => {
              setFlow(true);
              scrollToY(0);
            }}
          >
            <span className="u-red">↑</span> Flow it from the top
          </button>
        )}
        <nav className="sh-links" aria-label="Elsewhere">
          {FOOTER.links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <nav className="sh-pages" aria-label="Pages">
          {FOOTER.pages.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <p className="sh-draft">Draft 2, version {meta.n}. Not the live site.</p>
      </footer>
    </div>
  );
}
