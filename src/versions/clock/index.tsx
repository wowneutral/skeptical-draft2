// Version 47: the clock. The site is told against the LD speech clock (6, 3, 7, 3, 4, 6, 3).
// One fixed Bodoni countdown; scrolling a section spends that speech's time. The speech names
// and times are the generic format, used as framing only.
import { useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './clock.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { gsap, scrollToId } from '@/lib/scroll';
import { clamp, smooth, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Digits, setDigits } from './Digits';

const SPEECHES = [
  { name: 'AC', min: 6, id: 'ac' },
  { name: 'CX', min: 3, id: 'cx' },
  { name: 'NC', min: 7, id: 'record' },
  { name: 'CX', min: 3, id: 'drive' },
  { name: '1AR', min: 4, id: 'people' },
  { name: 'NR', min: 6, id: 'join' },
  { name: '2AR', min: 3, id: 'end' },
];
const PREP = 240;
const RUN_END = 0.86; // share of a section the clock takes to reach 0:00
const TIME_AT = 0.9; // where "Time." takes over
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Odometer position for a countdown: holds each second, then rolls into the next in its last fifth. */
function rollPos(t: number) {
  const n = Math.ceil(t);
  const f = n - t;
  if (f <= 0) return n;
  return f < 0.8 ? n : n - smooth((f - 0.8) / 0.2);
}

function Mark({ i }: { i: number }) {
  const s = SPEECHES[i];
  return (
    <p className="cl-mark">
      <span className="cl-mark-n">{s.name}</span>
      <span className="cl-mark-t">{fmt(s.min * 60)}</span>
    </p>
  );
}

export default function Clock() {
  useVersion('clock');
  const root = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLButtonElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const prepBox = useRef<HTMLDivElement>(null);
  const band = useRef<HTMLDivElement>(null);
  const mainD = useRef<HTMLSpanElement>(null);
  const prepD = useRef<HTMLSpanElement>(null);
  const timeW = useRef<HTMLSpanElement>(null);
  const prepTime = useRef<HTMLSpanElement>(null);
  const state = useRef({ running: false, prep: false, live: SPEECHES.map(() => 0), prepLeft: PREP, zeroAt: 0, cur: -1, w: 1, lastY: 0, disp: 360, tw: 0, ptw: 0, done: false });
  const [running, setRunning] = useState(false);
  const [prepping, setPrepping] = useState(false);
  const [cur, setCur] = useState(0);

  const toggle = () => {
    const s = state.current;
    if (s.done) return;
    s.running = !s.running;
    setRunning(s.running);
  };
  const prepOn = (on: boolean) => {
    const s = state.current;
    if (s.prep === on) return;
    s.prep = on;
    setPrepping(on);
  };

  // Space runs and stops the clock, as a debater does.
  useEffect(() => {
    if (still) return;
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      const t = e.target as HTMLElement;
      if (t.closest('a,button,input,textarea,select,[role="button"]')) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (still) return;
    const el = root.current!;
    const secs = Array.from(el.querySelectorAll<HTMLElement>('.cl-sec'));
    const says = Array.from(el.querySelectorAll<HTMLElement>('[data-say]'));
    let natW = 1, natH = 1, heroF = 100;
    const measure = () => {
      const f = face.current!;
      f.style.fontSize = '100px';
      natW = f.offsetWidth / 100;
      natH = f.offsetHeight / 100;
      const vw = window.innerWidth, vh = window.innerHeight;
      const phone = vw <= 820;
      heroF = Math.min((vw - (phone ? 28 : vw * 0.08)) / natW, (vh * (phone ? 0.34 : 0.66)) / natH);
      f.style.fontSize = `${heroF}px`;
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', measure);

    const tick = (_t: number, dms: number) => {
      const s = state.current;
      const dt = Math.min(0.1, dms / 1000);
      const vw = window.innerWidth, vh = window.innerHeight, y = window.scrollY;
      const phone = vw <= 820;
      const max = Math.max(1, document.documentElement.scrollHeight - vh);

      // Which speech, and how far through it.
      const starts = secs.map((sec, i) => (i === 0 ? 0 : Math.min(max, sec.getBoundingClientRect().top + y - vh * 0.5)));
      let i = 0;
      for (let k = 0; k < starts.length; k++) if (y >= starts[k] - 0.5) i = k;
      const end = i + 1 < starts.length ? starts[i + 1] : max;
      const p = clamp((y - starts[i]) / Math.max(1, end - starts[i]));
      const T = SPEECHES[i].min * 60;

      if (s.running && !s.prep) s.live[i] += dt;
      if (s.prep && s.prepLeft > 0) s.prepLeft = Math.max(0, s.prepLeft - dt);
      const scrollSpent = T * clamp(p / RUN_END);
      const rem = Math.max(0, T - scrollSpent - s.live[i]);
      if (rem > 0) s.zeroAt = 0;
      else if (!s.zeroAt) s.zeroAt = performance.now();
      if (rem <= 0 && s.running) { s.running = false; setRunning(false); }
      const showTime = rem <= 0 && (p >= TIME_AT || performance.now() - s.zeroAt > 900);
      const last = i === SPEECHES.length - 1 && p >= 0.999;
      if (last !== s.done) { s.done = last; el.classList.toggle('is-done', last); }

      if (i !== s.cur) { s.cur = i; setCur(i); }

      // Digits: odometer when still, continuous while the reader scrolls.
      const moving = Math.abs(y - s.lastY) > 0.5;
      s.lastY = y;
      s.w += ((moving ? 0 : 1) - s.w) * (1 - Math.exp(-dt * 8));
      let pos = rem + (rollPos(rem) - rem) * s.w;
      // A new speech: the numerals roll back up to full time instead of jumping.
      if (pos - s.disp > 4) s.disp += (pos - s.disp) * (1 - Math.exp(-dt * 7));
      else s.disp = pos;
      pos = s.disp;
      setDigits(mainD.current!, pos);
      setDigits(prepD.current!, rollPos(s.prepLeft));

      s.tw += ((showTime ? 1 : 0) - s.tw) * (1 - Math.exp(-dt * 10));
      el.style.setProperty('--tw', s.tw.toFixed(3));
      el.classList.toggle('is-zero', rem <= 0);
      el.classList.toggle('is-prepzero', s.prepLeft <= 0);
      const pz = s.prepLeft <= 0 ? 1 : 0;
      s.ptw += (pz - s.ptw) * (1 - Math.exp(-dt * 10));
      el.style.setProperty('--ptw', s.ptw.toFixed(3));

      // The opening: the clock fills the screen, then docks (left column on desktop, top band on phone).
      const h = 1 - Math.pow(1 - clamp(y / (vh * (phone ? 0.45 : 0.34))), 3);
      const f = face.current!;
      const W = natW * heroF, H = natH * heroF;
      const cx0 = vw / 2, cy0 = phone ? vh * 0.41 : vh * 0.46;
      let s1: number, cx1: number, cy1: number;
      if (phone) {
        s1 = (vw * 0.56) / W;
        cx1 = 16 + (W * s1) / 2;
        cy1 = 54 + (H * s1) / 2;
      } else {
        s1 = Math.min((vw * 0.44) / W, (vh * 0.42) / H);
        cx1 = vw * 0.28;
        cy1 = vh * 0.47;
      }
      const sc = 1 + (s1 - 1) * h;
      // Optical size follows the rendered size, so the hairlines hold up when the clock docks.
      f.style.setProperty('--opsz', (96 - 60 * h).toFixed(1));
      // Lines are spoken as the clock runs: ink once the reading line has passed them.
      for (const e of says) {
        const said = e.getBoundingClientRect().top < vh * (phone ? 0.8 : 0.74);
        if (said !== (e.dataset.say === '1')) e.dataset.say = said ? '1' : '0';
      }
      const cx = cx0 + (cx1 - cx0) * h, cy = cy0 + (cy1 - cy0) * h;
      f.style.transform = `translate(${(cx - W / 2).toFixed(2)}px, ${(cy - H / 2).toFixed(2)}px) scale(${sc.toFixed(4)})`;
      const top = cy - (H * sc) / 2, bot = cy + (H * sc) / 2;
      const r = row.current!;
      const rx = clamp(cx - r.offsetWidth / 2, phone ? 8 : 12, vw - r.offsetWidth - 8);
      r.style.transform = `translate(${rx.toFixed(1)}px, ${(phone ? Math.max(4, top - r.offsetHeight - 2) : top - r.offsetHeight - 6).toFixed(1)}px)`;
      const pb = prepBox.current!;
      if (phone) pb.style.transform = `translate(${(vw - 16 - pb.offsetWidth).toFixed(1)}px, ${(cy - pb.offsetHeight / 2).toFixed(1)}px)`;
      else pb.style.transform = `translate(${(cx - (W * sc) / 2).toFixed(1)}px, ${(bot + 18).toFixed(1)}px)`;
      const show = clamp((h - 0.55) / 0.4);
      pb.style.opacity = show.toFixed(3);
      pb.style.visibility = show < 0.02 ? 'hidden' : 'visible';
      if (band.current) {
        band.current.style.opacity = phone ? h.toFixed(3) : '0';
        band.current.style.height = `${(bot * 1 + 14).toFixed(0)}px`;
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', measure);
    };
  }, []);

  const go = (id: string) => scrollToId(id === 'ac' ? '' : id);

  return (
    <div ref={root} className={`v-clock${still ? ' is-still' : ''}${running ? ' is-running' : ''}${prepping ? ' is-prep' : ''}`}>
      <a className="skip-x" href="#main">Skip to content</a>

      {!still && (
        <div className="cl-stage">
          <div ref={band} className="cl-band" aria-hidden="true" />
          <div ref={row} className="cl-row" role="navigation" aria-label="Speeches">
            {SPEECHES.map((sp, k) => (
              <button key={k} type="button" className={`cl-sp${k === cur ? ' is-on' : ''}${k < cur ? ' is-past' : ''}`} aria-current={k === cur ? 'step' : undefined} onClick={() => go(sp.id)}>
                {sp.name}
              </button>
            ))}
          </div>
          <button
            ref={face}
            type="button"
            className="cl-face"
            aria-pressed={running}
            onClick={toggle}
          >
            <span className="sr-only-x">{`${SPEECHES[cur].name} clock, ${SPEECHES[cur].min} minutes. Press to ${running ? 'stop' : 'run'} it.`}</span>
            <Digits ref={mainD} />
            <span ref={timeW} className="cl-time" aria-hidden="true">Time.</span>
          </button>
          <div ref={prepBox} className="cl-prepbox">
            <button
              type="button"
              className="cl-prep"
              aria-pressed={prepping}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); prepOn(true); }}
              onPointerUp={() => prepOn(false)}
              onPointerCancel={() => prepOn(false)}
              onLostPointerCapture={() => prepOn(false)}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); prepOn(true); } }}
              onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); prepOn(false); } }}
              onBlur={() => prepOn(false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span className="cl-prep-l">Prep</span>
              <span className="cl-prep-c" aria-hidden="true">
                <Digits ref={prepD} small />
                <span ref={prepTime} className="cl-ptime">Time.</span>
              </span>
              <span className="sr-only-x">Hold to use prep time</span>
            </button>
            <p className="cl-hint">{running ? 'Running. Press to stop.' : prepping ? 'Prep running.' : 'Press the clock to run it.'}</p>
          </div>
        </div>
      )}

      <header className="cl-top">
        <h1 className="cl-h1"><span aria-hidden="true">{SITE.name}</span><span className="sr-only-x">{SITE.heading}</span></h1>
      </header>

      <main id="main" className="cl-col">
        <section className="cl-sec cl-ac" id="ac" style={{ ['--m' as string]: 6 }} aria-label="AC">
          <Mark i={0} />
          <div className="cl-hero">
            <p className="cl-pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            {!still && <p className="cl-hint-hero">{running ? 'Running. Press again to stop.' : 'Press the clock to run it. Or space.'}</p>}
          </div>
          <p className="cl-state">{HERO.statement.map((l) => <span key={l} data-say="0">{l}</span>)}</p>
          <nav className="cl-doors" aria-label="Start here">
            {HERO.doors.map((d) => <a key={d.label} className="cl-door" href={d.href}><span>{d.label}</span></a>)}
          </nav>
        </section>

        <section className="cl-sec cl-cx" id="cx" style={{ ['--m' as string]: 3 }} aria-label="Who we are">
          <Mark i={1} />
          <ol className="cl-man">
            {MANIFESTO.map((l) => <li key={l} data-say="0">{l}</li>)}
          </ol>
        </section>

        <section className="cl-sec" id="record" style={{ ['--m' as string]: 7 }} aria-labelledby="h-record">
          <Mark i={2} />
          <h2 id="h-record" className="cl-h2">{RECORD.title}</h2>
          <p className="cl-lead">{RECORD.rule}</p>
          <p className="cl-event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
          <ul className="cl-results">
            {RECORD.results.map((r) => (
              <li key={r.who}>
                <span className="cl-what" data-say="0">{r.what}</span>
                <span className="cl-who">{r.who}</span>
                <span className="cl-more-t">{r.more}</span>
              </li>
            ))}
          </ul>
          <a className="cl-more" href={RECORD.more.href}>{RECORD.more.label}</a>
        </section>

        <section className="cl-sec" id="drive" style={{ ['--m' as string]: 3 }} aria-labelledby="h-drive">
          <Mark i={3} />
          <h2 id="h-drive" className="cl-h2">{DRIVE.title}</h2>
          <p className="cl-lead">{DRIVE.lead}</p>
          <dl className="cl-drive">
            {DRIVE.items.map((d) => (
              <div key={d.term}>
                <dt data-say="0">{d.term}</dt>
                <dd>{d.text}</dd>
              </div>
            ))}
          </dl>
          <a className="cl-more" href={DRIVE.more.href}>{DRIVE.more.label}</a>
        </section>

        <section className="cl-sec" id="people" style={{ ['--m' as string]: 4 }} aria-labelledby="h-people">
          <Mark i={4} />
          <h2 id="h-people" className="cl-h2">{PEOPLE.title}</h2>
          <ul className="cl-coaches">
            {PEOPLE.coaches.map((c) => (
              <li key={c.name}>
                <span className="cl-cname" data-say="0">{c.name}</span>
                <span className="cl-role">{c.role}</span>
                <span className="cl-bio">{c.bio}</span>
              </li>
            ))}
          </ul>
          <p className="cl-count" data-say="0">{PEOPLE.count}</p>
          <a className="cl-more" href={PEOPLE.more.href}>{PEOPLE.more.label}</a>
        </section>

        <section className="cl-sec" id="join" style={{ ['--m' as string]: 6 }} aria-labelledby="h-join">
          <Mark i={5} />
          <h2 id="h-join" className="cl-h2">{JOIN.title}</h2>
          <p className="cl-lead">{JOIN.lead}</p>
          <ol className="cl-paths">
            {JOIN.paths.map((p) => (
              <li key={p.id}>
                <a className="cl-path" href={p.href}>
                  <span className="cl-pname" data-say="0">{p.name}</span>
                  <span className="cl-pline">{p.line}</span>
                </a>
                <ul className="cl-ptext">{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
              </li>
            ))}
          </ol>
          <p className="cl-small">{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
          <p className="cl-small">{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
          <p className="cl-small">{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
          <p className="cl-small">{JOIN.discord}</p>
        </section>

        <footer className="cl-sec cl-foot" id="end" style={{ ['--m' as string]: 3 }}>
          <Mark i={6} />
          <p className="cl-fline" data-say="0">{FOOTER.line}</p>
          <ul className="cl-links">{FOOTER.links.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}</ul>
          <ul className="cl-pages">{FOOTER.pages.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}</ul>
          <p className="cl-draft">Draft 2, version 47. Not the live site.</p>
        </footer>
      </main>
    </div>
  );
}
