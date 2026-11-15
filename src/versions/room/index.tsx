// Version 28: the room. The debate room drawn as a blueprint in three
// dimensions, and used as the map of the team.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import '@fontsource-variable/archivo/wdth.css';
import './room.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { useVersion } from '@/lib/version';
import { still } from '@/lib/utils';
import { st, SHEETS, type Mode, type V } from './room';
import { ui } from './ui';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children, lead }: { href: string; className?: string; children: React.ReactNode; lead?: boolean }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined} data-lead={lead ? '' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Rev = ({ n = 2 }: { n?: number }) => (
  <svg className="rev" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 1.5 L22.5 20.5 L1.5 20.5 Z" /><text x="12" y="17.5" textAnchor="middle">{n}</text></svg>
);

const Q = () => (
  <svg className="qm" viewBox={`${-MARKS.roman.w / 2} ${-MARKS.roman.h / 2} ${MARKS.roman.w} ${MARKS.roman.h}`} aria-hidden="true"><path d={MARKS.roman.d} /></svg>
);

const Head = ({ sheet, children }: { sheet: number; children: React.ReactNode }) => (
  <p className="tag"><span>Sheet A-{String(sheet).padStart(2, '0')}</span><span>{SHEETS[sheet]}</span><Rev /><span className="tag-k">{children}</span></p>
);

const PRESETS: { label: string; a: V; b: V }[] = [
  { label: 'Aff to neg', a: [-2, 0, 0.6], b: [2, 0, 0.6] },
  { label: 'Door to judge', a: [3.4, 0, 3.3], b: [0, 0, -2.2] },
  { label: 'Lectern to judge', a: [0, 0, 0.35], b: [0, 0, -2.2] },
];

export default function Room() {
  useVersion('room');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [mode, setModeS] = useState<Mode>('persp');
  const [measure, setMeasure] = useState(false);
  const [ex, setEx] = useState<Record<string, boolean>>({});
  const [locked, setLocked] = useState(-1);
  const [plot, setPlot] = useState(still ? 100 : 0);

  const setMode = (m: Mode) => { st.mode = m; setModeS(m); };
  const toggleMeasure = () => { const on = !st.measure.on; st.measure.on = on; if (!on) { st.measure.a = st.measure.b = st.measure.hover = null; } st.measure.dirty = true; setMeasure(on); };
  const preset = (p: (typeof PRESETS)[number]) => { st.measure.on = true; st.measure.a = p.a; st.measure.b = p.b; st.measure.dirty = true; setMeasure(true); };
  const explode = useCallback((id: string) => { st.explode[id] = st.explode[id] ? 0 : 1; setEx((e) => ({ ...e, [id]: !!st.explode[id] })); }, []);
  const tryDrawer = (i: number) => { st.rattle.cabinet = st.clock; setLocked(i); window.setTimeout(() => setLocked((x) => (x === i ? -1 : x)), 1400); };
  const turn = (d: number) => { st.yawOff = Math.max(-0.75, Math.min(0.75, st.yawOff + d)); };

  useEffect(() => {
    ui.root = root.current;
    const on = (e: Event) => { const id = (e as CustomEvent<string>).detail; if (id === 'cabinet') { setLocked(7); window.setTimeout(() => setLocked(-1), 1400); } else setEx((x) => ({ ...x, [id]: !!st.explode[id] })); };
    window.addEventListener('room:click', on);
    let live = true;
    const go = () => { if (live) st.ready = true; };
    document.fonts.ready.then(() => setTimeout(go, 250));
    const t = setTimeout(go, 1600);
    // the plotter's counter, until the drawing is done
    let raf = 0;
    const tick = () => { const p = Math.round(st.reveal * 100); setPlot((x) => (x === p ? x : p)); if (p < 100 && live) raf = requestAnimationFrame(tick); };
    if (!still) raf = requestAnimationFrame(tick);
    return () => { live = false; clearTimeout(t); cancelAnimationFrame(raf); window.removeEventListener('room:click', on); ui.root = null; st.ready = false; st.t0 = -1; st.explode = {}; st.mode = 'persp'; st.measure.on = false; st.measure.a = st.measure.b = st.measure.hover = null; };
  }, []);

  // where each section sits, so the camera knows when to hold and when to travel
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measureAll = () => {
      const vh = window.innerHeight, sy = window.scrollY, max = Math.max(1, document.documentElement.scrollHeight - vh);
      const secs = Array.from(el.querySelectorAll<HTMLElement>('[data-sec]'));
      st.centers = secs.map((s, i) => {
        if (i === 0) return 0;
        const r = s.getBoundingClientRect();
        const card = s.querySelector<HTMLElement>('[data-card]')?.getBoundingClientRect() ?? r;
        const c = card.top + sy + card.height / 2 - vh * (window.innerWidth < window.innerHeight ? 0.62 : 0.5);
        return Math.min(max, Math.max(0, c));
      });
      for (let i = 1; i < st.centers.length; i++) if (st.centers[i] <= st.centers[i - 1] + 40) st.centers[i] = st.centers[i - 1] + 40;
    };
    measureAll();
    const ro = new ResizeObserver(measureAll); ro.observe(el);
    window.addEventListener('resize', measureAll);
    document.fonts.ready.then(measureAll);
    return () => { ro.disconnect(); window.removeEventListener('resize', measureAll); };
  }, []);

  const ExBtn = ({ id, a, b }: { id: string; a: string; b: string }) => (
    <button type="button" className="ex" aria-pressed={!!ex[id]} onClick={() => explode(id)}><span className="ex-i" aria-hidden="true" />{ex[id] ? b : a}</button>
  );

  return (
    <div className="v-room" ref={root} data-stop="0" data-webgl={webgl ? '1' : '0'} data-plot={plot >= 100 ? 'done' : 'go'} data-measure={measure ? '1' : '0'}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="paper" aria-hidden="true" />
      {webgl && (
        <div className="stage" aria-hidden="true">
          <Suspense fallback={null}><Scene /></Suspense>
        </div>
      )}
      <svg className="leads" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <path ref={(p) => { ui.paths[i] = p; }} />
            <g ref={(g) => { ui.dots[i] = g; }} className="pin"><circle r="7" /><circle r="2.5" className="c" /><path d="M-13 0H-9M9 0H13M0 -13V-9M0 9V13" /></g>
          </g>
        ))}
      </svg>
      <div className="mlabel" ref={(e) => { ui.mlabel = e; }} aria-hidden="true" />
      <div className="flash" ref={(e) => { ui.flash = e; }} aria-hidden="true"><span>Cut</span></div>

      <header className="top">
        <a className="brand" href="#main" aria-label="Skeptical, to the top">SKEPTICAL<Q /></a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <div className="north" aria-hidden="true">
        <svg viewBox="-30 -30 60 60"><circle r="22" /><g ref={(g) => { ui.north = g; }}><path d="M0 -26 L7 6 L0 1 L-7 6 Z" className="n" /><text y="-13" textAnchor="middle">N</text></g></svg>
        <div className="scale"><i ref={(e) => { ui.bar = e; }} /><span ref={(e) => { ui.barLabel = e; }}>2 sk</span></div>
      </div>

      <div className="tools" role="region" aria-label="Drawing tools">
        <div className="views" role="group" aria-label="View">
          {(['plan', 'elev', 'persp'] as Mode[]).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}><span className="lg">{m === 'plan' ? 'Plan' : m === 'elev' ? 'Elevation' : 'Perspective'}</span><span className="sm">{m === 'plan' ? 'Plan' : m === 'elev' ? 'Elev' : '3D'}</span></button>
          ))}
        </div>
        <div className="views" role="group" aria-label="Look and measure">
          <button type="button" className="turn" aria-label="Turn left" onClick={() => turn(-0.25)}>&lt;</button>
          <button type="button" className="turn" aria-label="Turn right" onClick={() => turn(0.25)}>&gt;</button>
          <button type="button" aria-pressed={measure} onClick={toggleMeasure}>Measure</button>
        </div>
        {measure && (
          <div className="presets">
            <p>Click two points in the room, or:</p>
            {PRESETS.map((p) => <button key={p.label} type="button" onClick={() => preset(p)}>{p.label}</button>)}
          </div>
        )}
      </div>

      <div className="tblock" aria-hidden="true">
        <span className="tb-wm">SKEPTICAL<Q /></span>
        <span className="tb-c"><small>Sheet</small><b ref={(e) => { ui.sheetNo = e; }}>A-00</b></span>
        <span className="tb-c tb-name"><small>Title</small><b ref={(e) => { ui.sheetName = e; }}>{SHEETS[0]}</b></span>
        <span className="tb-c tb-d"><small>Rev</small><b><Rev /> Draft 2, version 28.</b></span>
      </div>

      <main id="main">
        <section className="sec hero" data-sec="0">
          <div className="hero-in" data-card>
            <div className="sheet">
              <div className="sheet-row">
                <span><small>Drawing</small>The room</span>
                <span><small>Sheet</small>A-00</span>
                <span><small>Scale</small>1 square, 1 sk</span>
                <span className="plot"><small>Pen</small>{plot >= 100 ? 'Plotted.' : `Plotting ${plot}`}</span>
              </div>
              <h1 className="wm"><span className="wm-w">SKEPTICAL</span><Q /><span className="sr-only-x">{SITE.heading.replace('Skeptical', '')}</span></h1>
            </div>
            <p className="pitch">{HERO.pitch.map((l, i) => <span key={i} style={{ ['--i' as string]: i }}>{l}</span>)}</p>
            <div className="doors">
              {HERO.doors.map((d) => <A key={d.label} href={d.href} className="door-btn">{d.label}</A>)}
            </div>
            <p className="hint"><span aria-hidden="true">&darr;</span> Scroll to walk the room. Drag to look. Click a desk.</p>
          </div>
        </section>

        <section className="sec plan" data-sec="1" aria-label="Free to join">
          <div className="card wide" data-card>
            <Head sheet={1}>Plan</Head>
            <p className="state">{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>
          </div>
        </section>

        <section className="sec" data-sec="2" id="door" aria-labelledby="h-door">
          <div className="card" data-card data-lead>
            <Head sheet={2}>Way in</Head>
            <h2 id="h-door" className="h2">At the door.</h2>
            <ol className="mani">{MANIFESTO.map((m, i) => <li key={i}><span className="mn">0{i + 1}</span>{m}</li>)}</ol>
            <ExBtn id="door" a="Lift the door off" b="Hang it back" />
          </div>
        </section>

        <section className="sec" data-sec="3" id="record" aria-labelledby="h-record">
          <div className="card framed" data-card data-lead>
            <Head sheet={3}>On the wall</Head>
            <h2 id="h-record" className="h2">{RECORD.title}</h2>
            <p className="rule">{RECORD.rule}</p>
            <p className="event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="results">
              {RECORD.results.map((r) => (
                <li key={r.who}><span className="who">{r.who}</span><span className="what">{r.what}</span><span className="more">{r.more}</span></li>
              ))}
            </ul>
            <div className="row"><A href={RECORD.more.href} className="link">{RECORD.more.label}</A><ExBtn id="frame" a="Take the sheet down" b="Hang it back" /></div>
          </div>
        </section>

        <section className="sec" data-sec="4" id="people" aria-labelledby="h-people">
          <div className="card" data-card data-lead>
            <Head sheet={4}>Aff side</Head>
            <h2 id="h-people" className="h2">{PEOPLE.title}</h2>
            <p className="role">{PEOPLE.coaches[0].role}</p>
            <h3 className="name">{PEOPLE.coaches[0].name}</h3>
            <p className="bio">{PEOPLE.coaches[0].bio}</p>
            <ExBtn id="aff" a="Take the desk apart" b="Put it back" />
          </div>
        </section>

        <section className="sec" data-sec="5" aria-labelledby="h-nathan">
          <div className="card" data-card data-lead>
            <Head sheet={5}>Neg side</Head>
            <p className="role">{PEOPLE.coaches[1].role}</p>
            <h3 id="h-nathan" className="name">{PEOPLE.coaches[1].name}</h3>
            <p className="bio">{PEOPLE.coaches[1].bio}</p>
            <ExBtn id="neg" a="Take the desk apart" b="Put it back" />
          </div>
        </section>

        <section className="sec" data-sec="6" aria-labelledby="h-count">
          <div className="card" data-card data-lead>
            <Head sheet={6}>Gallery</Head>
            <h3 id="h-count" className="h2">{PEOPLE.count}</h3>
            <div className="chairs" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <svg key={i} viewBox="0 0 30 34"><path d="M6 4 H24 V16 H6 Z M4 17 H26 V20 H4 Z M6 20 V33 M24 20 V33" /></svg>
              ))}
            </div>
            <div className="row"><A href={PEOPLE.more.href} className="link">{PEOPLE.more.label}</A><ExBtn id="gallery" a="Pull the chairs out" b="Push them in" /></div>
          </div>
        </section>

        <section className="sec" data-sec="7" id="drive" aria-labelledby="h-drive">
          <div className="card cab" data-card data-lead>
            <Head sheet={7}>Locked</Head>
            <h2 id="h-drive" className="h2">{DRIVE.title}</h2>
            <p className="lead">{DRIVE.lead}</p>
            <ol className="drawers">
              {DRIVE.items.map((d, i) => (
                <li key={d.term}>
                  <button type="button" className={locked === i || locked === 7 ? 'drawer shut' : 'drawer'} onClick={() => tryDrawer(i)}>
                    <span className="dn">{String(i + 1).padStart(2, '0')}</span>
                    <span className="dt">{d.term}</span>
                    <span className="dd">{d.text}</span>
                    <span className="lk" aria-hidden="true"><svg viewBox="0 0 16 18"><path d="M4 8 V5 a4 4 0 0 1 8 0 V8 M2 8 H14 V17 H2 Z M8 11 V14" /></svg></span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="locked" aria-live="polite">{locked >= 0 ? 'Locked. The drawers stay shut.' : ' '}</p>
            <A href={DRIVE.more.href} className="link">{DRIVE.more.label}</A>
          </div>
        </section>

        <section className="sec" data-sec="8" id="join" aria-labelledby="h-join">
          <div className="card wide" data-card>
            <Head sheet={8}>On the table</Head>
            <h2 id="h-join" className="h2">{JOIN.title}</h2>
            <p className="lead">{JOIN.lead}</p>
            <div className="sheets">
              {JOIN.paths.map((p, i) => (
                <article key={p.id} className="jsheet" data-lead style={{ ['--r' as string]: `${(i - 1) * 1.2}deg` }}>
                  <p className="js-n">Sheet {i + 1} of 3</p>
                  <h3>{p.name}</h3>
                  <p className="js-l">{p.line}</p>
                  <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                  <A href={p.href} className="js-a">{p.name}: {p.line}</A>
                </article>
              ))}
            </div>
            <p className="small-lines">
              <span>{JOIN.already.before}<A href={JOIN.already.href} className="link">{JOIN.already.label}</A></span>
              <span>{JOIN.coach.before}<A href={JOIN.coach.href} className="link">{JOIN.coach.label}</A></span>
            </p>
            <p className="also">{JOIN.also} <A href={`mailto:${SITE.email}`} className="link">{SITE.email}</A></p>
            <p className="also">{JOIN.discord}</p>
            <ExBtn id="judge" a="Spread the sheets" b="Stack them" />
          </div>
        </section>

        <section className="sec end" data-sec="9" aria-labelledby="h-end">
          <div className="card wide" data-card>
            <Head sheet={9}>Plan</Head>
            <h2 id="h-end" className="h2 big">Three ways in.</h2>
            <div className="ways">
              {JOIN.paths.map((p, i) => (
                <A key={p.id} href={p.href} className="way" lead>
                  <span className="wn">D{i + 1}</span><span className="wt">{p.name}</span><span className="wl">{p.line}</span>
                </A>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="notes">
          <p className="tag"><span>Notes</span><Rev n={1} /><span>Plan drawn</span><Rev /><span>Three doors added</span></p>
          <p className="fline">{FOOTER.line}</p>
          <ul className="flinks">{FOOTER.links.map((l) => <li key={l.label}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="fpages">{FOOTER.pages.map((l) => <li key={l.label}><A href={l.href}>{l.label}</A></li>)}</ul>
          <p className="draft">Draft 2, version 28. Not the live site. Units are grid squares, not metres.</p>
        </div>
      </footer>
    </div>
  );
}
