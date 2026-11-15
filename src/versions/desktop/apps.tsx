// The applications on the machine. Each one holds a part of the site and does
// something with it. `flat` is the read-it-as-a-page version: everything shown, nothing hidden.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, SITE } from '@/content';
import { gsap } from '@/lib/scroll';
import { cn, still } from '@/lib/utils';
import { Px } from './pixels';
import { useOS } from './store';
import { spin, hasWebGL } from './Mark3D';
import { lazy, Suspense } from 'react';
import MARKS from '@/lib/marks.json';

const Mark3D = lazy(() => import('./Mark3D'));

export const DRAFT = 'Draft 2, version 25. Not the live site.';

/** The brand mark as flat SVG. */
export const QMark = ({ className, dot = '#ffd84a' }: { className?: string; dot?: string }) => {
  const parts = MARKS.italic.d.split(/(?=M)/);
  return (
    <svg className={className} viewBox="-480 -740 960 1020" aria-hidden="true" focusable="false">
      <path d={parts[0]} fill="currentColor" />
      {parts.slice(1).map((p, i) => <path key={i} d={p} fill={dot} />)}
    </svg>
  );
};

const Tick = ({ on = true }: { on?: boolean }) => (
  <svg viewBox="0 0 10 10" width="20" height="20" shapeRendering="crispEdges" aria-hidden="true" className="tick">
    <rect x="0.5" y="0.5" width="9" height="9" fill="#f3f1ea" stroke="#15171d" strokeWidth="1" />
    {on && <path d="M2 5h1v1h1v1h1V6h1V5h1V4h1V3h-1v1H6v1H5v1H4V5H3V4H2z" fill="#15171d" />}
  </svg>
);

const shake = (el: Element | null) => {
  if (!el || still) return;
  gsap.fromTo(el, { x: 0 }, { x: 0, duration: 0.5, ease: 'none', keyframes: { x: [0, -14, 12, -10, 8, -5, 3, 0] } });
};

/* ------------------------------------------------------------------ read me */

export function Readme({ flat }: { flat?: boolean }) {
  const open = useOS((s) => s.open);
  return (
    <div className="app rd">
      <p className="rd-file"><span>read me first</span><span aria-hidden="true">01</span></p>
      <p className="rd-pitch">
        {HERO.pitch.map((l, i) => <span key={i} className={cn('rd-line', i === 1 && 'is-hi')}><span>{l}</span></span>)}
      </p>
      <ul className="rd-state">
        {HERO.statement.map((s) => <li key={s}><Tick />{s}</li>)}
      </ul>
      <div className="rd-doors">
        {HERO.doors.map((d, i) => <a key={d.href} className={cn('key', i === 0 && 'key--hi')} href={d.href}>{d.label}<span aria-hidden="true"> ↗</span></a>)}
      </div>
      {!flat && <button type="button" className="rd-run" onClick={(e) => open('join', e.currentTarget.getBoundingClientRect())}><Px name="join" size={32} shadow={false} />Or run the join installer</button>}
    </div>
  );
}

/* --------------------------------------------------------------- manifesto */

const CUT = ['No school, no fee.', 'both still competing.', 'it stays in the drive.', 'the name is a position.'];

export function Manifesto({ flat }: { flat?: boolean }) {
  const full = MANIFESTO.join('\n');
  const [n, setN] = useState(flat || still ? full.length : 0);
  const [mine, setMine] = useState('');
  const [hi, setHi] = useState<Set<string>>(new Set());
  const [pen, setPen] = useState(false);
  const [cut, setCut] = useState(false);
  const [col, setCol] = useState(0);
  useEffect(() => {
    if (n >= full.length) return;
    const t = setTimeout(() => setN((v) => Math.min(full.length, v + 2)), 16);
    return () => clearTimeout(t);
  }, [n, full.length]);
  const done = n >= full.length;
  let left = n;
  const lines = MANIFESTO.map((l) => { const s = l.slice(0, Math.max(0, left)); left -= l.length + 1; return s; });
  const caretLine = done ? 3 : lines.findIndex((s, i) => s.length < MANIFESTO[i].length);
  const toggle = (k: string) => setHi((h) => { const x = new Set(h); if (x.has(k)) x.delete(k); else x.add(k); return x; });
  const words = (l: string, li: number) => {
    if (!done) return l;
    // A cut card: the strongest clause of each line in highlighter, the rest left plain.
    const c = CUT[li], at = cut ? l.indexOf(c) : -1;
    return l.split(/(\s+)/).map((w, wi) => {
      if (/^\s+$/.test(w)) return w;
      const key = `${li}:${wi}`;
      const pos = l.split(/(\s+)/).slice(0, wi).join('').length;
      const auto = at >= 0 && pos >= at && pos < at + c.length;
      return <span key={wi} className={cn('mf-w', (hi.has(key) || auto) && 'is-hi')} onClick={pen ? () => toggle(key) : undefined}>{w}</span>;
    });
  };
  return (
    <div className={cn('app mf', pen && 'is-pen')}>
      <div className="tools" role="toolbar" aria-label="Editor tools">
        <button type="button" className={cn('tool', pen && 'is-on')} aria-pressed={pen} onClick={() => setPen((p) => !p)}><span className="sw sw--hi" aria-hidden="true" />Highlighter</button>
        <button type="button" className={cn('tool', cut && 'is-on')} aria-pressed={cut} onClick={() => setCut((c) => !c)}>Cut the card</button>
        <button type="button" className="tool" onClick={() => { setHi(new Set()); setCut(false); }}>Clear</button>
      </div>
      <div className="mf-doc">
        <p className="sr-only-x">{MANIFESTO.join(' ')}</p>
        <ol className="mf-lines" aria-hidden="true">
          {lines.map((l, i) => (
            <li key={i}>
              <span className="mf-n"><span>{i + 1}</span><Px name="lock" size={18} shadow={false} /></span>
              <span className="mf-t">{words(l, i)}{caretLine === i && <span className={cn('caret', done && 'is-blink')} />}</span>
            </li>
          ))}
        </ol>
        {!flat && (
          <label className="mf-mine">
            <span className="mf-n" aria-hidden="true"><span>5</span></span>
            <span className="sr-only-x">Add a line of your own</span>
            <input value={mine} placeholder="your line here" maxLength={90} onChange={(e) => { setMine(e.target.value); setCol(e.target.selectionStart ?? 0); }} onKeyUp={(e) => setCol(e.currentTarget.selectionStart ?? 0)} />
          </label>
        )}
      </div>
      {!flat && (
        <p className="statusbar">
          <span>{mine ? `Ln 5, Col ${col + 1}` : `Ln 4, Col ${MANIFESTO[3].length + 1}`}</span>
          <span>4 lines locked</span>
          <span>{mine ? 'Your line, not saved' : pen ? 'Click words to mark them' : 'Read only'}</span>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ record */

export function Record({ flat }: { flat?: boolean }) {
  const [i, setI] = useState(0);
  const show = flat ? RECORD.results : [RECORD.results[i]];
  return (
    <div className="app rc">
      <div className="rc-event">
        <p className="rc-when">{RECORD.when}</p>
        <p className="rc-name">{RECORD.name}</p>
        <p className="rc-where">{RECORD.where}</p>
      </div>
      <p className="rc-rule">{RECORD.rule}</p>
      <div className="rc-body">
        {!flat && (
          <div className="rc-list" role="tablist" aria-label="Results">
            {RECORD.results.map((r, k) => (
              <button key={r.who} type="button" role="tab" aria-selected={i === k} className={cn('rc-tab', i === k && 'is-on')} onClick={() => setI(k)}
                onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setI((v) => (v + 1) % 2); } }}>
                <Px name="record" size={32} shadow={false} /><span>{r.who}</span>
              </button>
            ))}
          </div>
        )}
        <div className="rc-show" role={flat ? undefined : 'tabpanel'}>
          {show.map((r) => (
            <div className="rc-res" key={r.who + i}>
              <p className="rc-what">{r.what}</p>
              <p className="rc-who">{r.who}</p>
              <p className="rc-more">{r.more}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="statusbar"><a className="lnk" href={RECORD.more.href}>{RECORD.more.label}</a><span>2 results</span></p>
    </div>
  );
}

/* ------------------------------------------------------------------- drive */

export function Drive({ flat }: { flat?: boolean }) {
  const [sel, setSel] = useState(0);
  const [no, setNo] = useState(false);
  const [tries, setTries] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const ok = useRef<HTMLButtonElement>(null);
  const refuse = () => {
    setNo(true); setTries((t) => t + 1);
    shake(root.current?.closest('.win, .sheet') ?? null);
    if (!still) gsap.fromTo(root.current!.querySelectorAll('.dv-tile.is-on .dv-lock'), { rotate: 0 }, { rotate: 0, duration: 0.6, keyframes: { rotate: [0, -24, 20, -12, 6, 0] } });
    requestAnimationFrame(() => ok.current?.focus());
  };
  if (flat) return (
    <div className="app dv dv--flat">
      <p className="dv-lead">{DRIVE.lead}</p>
      <dl className="dv-flat">
        {DRIVE.items.map((d) => <div key={d.term}><dt><Px name="drive" size={32} shadow={false} />{d.term}</dt><dd>{d.text}</dd></div>)}
      </dl>
      <p className="statusbar"><a className="lnk" href={DRIVE.more.href}>{DRIVE.more.label}</a><span>7 items, 7 locked</span></p>
    </div>
  );
  const it = DRIVE.items[sel];
  return (
    <div className="app dv" ref={root}>
      <div className="dv-path"><span className="dv-crumb">drive:/</span><span className="dv-priv"><Px name="lock" size={20} shadow={false} />Private</span></div>
      <p className="dv-lead">{DRIVE.lead}</p>
      <div className="dv-main">
        <div className="dv-grid" role="listbox" aria-label="Folders in the drive" aria-activedescendant={`dv-${sel}`} tabIndex={0}
          onKeyDown={(e) => {
            const k = e.key;
            if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setSel((s) => (s + 1) % 7); }
            else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setSel((s) => (s + 6) % 7); }
            else if (k === 'Enter' || k === ' ') { e.preventDefault(); refuse(); }
          }}>
          {DRIVE.items.map((d, k) => (
            <div key={d.term} id={`dv-${k}`} role="option" aria-selected={sel === k} className={cn('dv-tile', sel === k && 'is-on')}
              onClick={() => { if (sel === k) refuse(); else setSel(k); }} onDoubleClick={refuse}>
              <span className="dv-ico"><Px name="drive" size={56} /><span className="dv-lock"><Px name="lock" size={26} /></span></span>
              <span className="dv-term">{d.term}</span>
            </div>
          ))}
        </div>
        <aside className="dv-info" aria-live="polite">
          <p className="dv-k">Details</p>
          <p className="dv-name">{it.term}</p>
          <p className="dv-text">{it.text}</p>
          <p className="dv-meta"><Px name="lock" size={18} shadow={false} />Locked</p>
          <button type="button" className="key" onClick={refuse}>Open</button>
        </aside>
      </div>
      <p className="statusbar"><a className="lnk" href={DRIVE.more.href}>{DRIVE.more.label}</a><span>7 items, 7 locked</span><span>{tries ? `Refused ${tries}×` : 'Double click to open'}</span></p>
      {no && (
        <div className="alert" role="alertdialog" aria-labelledby="dv-al" onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setNo(false); } }}>
          <div className="alert-box">
            <Px name="lock" size={56} />
            <div>
              <p className="alert-t" id="dv-al">{it.term} won’t open.</p>
              <p>{DRIVE.lead}</p>
              <p><a className="lnk" href={DRIVE.more.href}>{DRIVE.more.label}</a></p>
            </div>
            <button type="button" ref={ok} className="key key--hi" onClick={() => setNo(false)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ people */

const initials = (n: string) => n.split(' ').map((p) => p[0]).join('');

export function People({ flat }: { flat?: boolean }) {
  const [i, setI] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const go = (k: number) => {
    if (k === i) return;
    if (still || !card.current) { setI(k); return; }
    gsap.timeline()
      .to(card.current, { rotateY: k > i ? -90 : 90, duration: 0.18, ease: 'power2.in' })
      .add(() => setI(k))
      .fromTo(card.current, { rotateY: k > i ? 90 : -90 }, { rotateY: 0, duration: 0.42, ease: 'back.out(1.6)' });
  };
  const Card = ({ c }: { c: (typeof PEOPLE.coaches)[number] }) => (
    <div className="pp-card">
      <div className="pp-face" aria-hidden="true"><span>{initials(c.name)}</span></div>
      <div className="pp-txt">
        <h3 className="pp-name">{c.name}</h3>
        <p className="pp-role">{c.role}</p>
        <p className="pp-bio">{c.bio}</p>
      </div>
    </div>
  );
  return (
    <div className="app pp">
      {!flat && (
        <div className="pp-list" role="tablist" aria-label="Coaches">
          {PEOPLE.coaches.map((c, k) => (
            <button key={c.name} type="button" role="tab" aria-selected={i === k} className={cn('pp-tab', i === k && 'is-on')} onClick={() => go(k)}>
              <span className="pp-mini" aria-hidden="true">{initials(c.name)}</span>{c.name}
            </button>
          ))}
        </div>
      )}
      <div className="pp-stage">
        {flat ? PEOPLE.coaches.map((c) => <Card key={c.name} c={c} />) : <div ref={card} className="pp-flip" role="tabpanel"><Card c={PEOPLE.coaches[i]} /></div>}
      </div>
      <p className="statusbar"><span>{PEOPLE.count}</span><a className="lnk" href={PEOPLE.more.href}>{PEOPLE.more.label}</a></p>
    </div>
  );
}

/* ------------------------------------------------------------------- about */

const NUMS: [number, string][] = [[8, 'debaters'], [2, 'coaches'], [7, 'in the drive'], [1, 'tournament'], [2, 'results']];

export function Footer() {
  return (
    <div className="ft">
      <p className="ft-line">{FOOTER.line}</p>
      <ul className="ft-links">{FOOTER.links.map((l) => <li key={l.href}><a className="lnk" href={l.href}>{l.label}</a></li>)}</ul>
      <ul className="ft-pages">{FOOTER.pages.map((l) => <li key={l.href}><a className="lnk" href={l.href}>{l.label}</a></li>)}</ul>
      <p className="ft-draft">{DRAFT}</p>
    </div>
  );
}

export function About({ flat }: { flat?: boolean }) {
  const [shown, setShown] = useState(flat || still);
  useEffect(() => { const t = setTimeout(() => setShown(true), 260); return () => clearTimeout(t); }, []);
  return (
    <div className="app ab">
      <div className="ab-head">
        <QMark className="ab-q" />
        <div>
          <p className="ab-word">{SITE.name}</p>
          <p className="ab-desc">{SITE.description}</p>
        </div>
      </div>
      <ul className="ab-nums">
        {NUMS.map(([n, l], k) => (
          <li key={l} style={{ ['--k' as string]: k }} className={cn(shown && 'is-on')}>
            <span className="ab-n">{n}</span>
            <span className="ab-meter" aria-hidden="true">{Array.from({ length: 8 }, (_, j) => <i key={j} className={cn(j < n && 'on')} />)}</span>
            <span className="ab-l">{l}</span>
          </li>
        ))}
      </ul>
      <p className="ab-event">{RECORD.when}. {RECORD.name}. {RECORD.where}.</p>
      {!flat && <Footer />}
    </div>
  );
}

/* -------------------------------------------------------------------- join */

type PathId = (typeof JOIN.paths)[number]['id'];
const STEPS = ['Welcome', 'Choose', 'Read', 'Install', 'Done'];

export function JoinLinks({ chosen }: { chosen: PathId[] }) {
  const paths = JOIN.paths.filter((p) => chosen.includes(p.id));
  return (
    <div className="jn-out">
      <ul className="jn-go">
        {paths.map((p) => <li key={p.id}><a className="key key--hi key--big" href={p.href}>{p.name}: {p.line}<span aria-hidden="true"> ↗</span></a></li>)}
      </ul>
      <p className="jn-small">{JOIN.already.before}<a className="lnk" href={JOIN.already.href}>{JOIN.already.label}</a></p>
      <p className="jn-small">{JOIN.coach.before}<a className="lnk" href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
      <p className="jn-small">{JOIN.also} <a className="lnk" href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
      <p className="jn-small">{JOIN.discord}</p>
    </div>
  );
}

export function Join({ flat }: { flat?: boolean }) {
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState<PathId[]>([]);
  const [pct, setPct] = useState(0);
  const set = useOS((s) => s.set);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { body.current?.querySelector<HTMLElement>('h3, [data-first]')?.focus({ preventScroll: true }); }, [step]);
  useEffect(() => {
    if (step !== 3) return;
    if (still) { setPct(100); const t = setTimeout(() => setStep(4), 400); return () => clearTimeout(t); }
    setPct(0);
    const o = { v: 0 };
    const tw = gsap.to(o, { v: 100, duration: 2.4, ease: 'steps(24)', onUpdate: () => setPct(Math.round(o.v)), onComplete: () => setTimeout(() => setStep(4), 350) });
    return () => { tw.kill(); };
  }, [step]);
  if (flat) return (
    <div className="app jn jn--flat">
      <p className="jn-lead">{JOIN.lead}</p>
      {JOIN.paths.map((p) => (
        <div key={p.id} className="jn-path">
          <h3 className="jn-name">{p.name}</h3>
          <p className="jn-line">{p.line}</p>
          <ul className="jn-text">{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
          <a className="key" href={p.href}>{p.name}: {p.line}<span aria-hidden="true"> ↗</span></a>
        </div>
      ))}
      <JoinLinks chosen={[]} />
    </div>
  );
  const toggle = (id: PathId) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const picked = JOIN.paths.filter((p) => chosen.includes(p.id));
  const log = picked.flatMap((p) => [`${p.name.toLowerCase()}: reading ${p.text.length} lines`, `${p.name.toLowerCase()}: ${p.href.replace('https://', '')}`]);
  return (
    <div className="app jn">
      <ol className="jn-rail" aria-label="Steps">
        {STEPS.map((s, k) => <li key={s} className={cn(k === step && 'is-on', k < step && 'is-done')} aria-current={k === step ? 'step' : undefined}><Tick on={k < step} />{s}</li>)}
      </ol>
      <div className="jn-body" ref={body}>
        {step === 0 && (
          <>
            <h3 className="jn-big" tabIndex={-1}>{JOIN.title}</h3>
            <p className="jn-lead">{JOIN.lead}</p>
            <p className="jn-note">{JOIN.discord}</p>
          </>
        )}
        {step === 1 && (
          <>
            <h3 className="jn-h" tabIndex={-1}>Choose what to install</h3>
            <div className="jn-opts">
              {JOIN.paths.map((p) => (
                <label key={p.id} className={cn('jn-opt', chosen.includes(p.id) && 'is-on')}>
                  <input type="checkbox" checked={chosen.includes(p.id)} onChange={() => toggle(p.id)} />
                  <Tick on={chosen.includes(p.id)} />
                  <span className="jn-opt-t"><b>{p.name}</b><span className="jn-line">{p.line}</span><span className="jn-first">{p.text[0]}</span></span>
                </label>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h3 className="jn-h" tabIndex={-1}>Read before you install</h3>
            <div className="jn-read">
              {picked.map((p) => (
                <div key={p.id} className="jn-path">
                  <p className="jn-name">{p.name}. <span className="jn-line">{p.line}</span></p>
                  <ul className="jn-text">{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
              ))}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h3 className="jn-h" tabIndex={-1}>Installing</h3>
            <div className="jn-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Install progress"><i style={{ width: `${pct}%` }} /></div>
            <ul className="jn-log" aria-hidden="true">{log.slice(0, Math.ceil((pct / 100) * log.length)).map((l) => <li key={l}>{l}</li>)}</ul>
          </>
        )}
        {step === 4 && (
          <>
            <h3 className="jn-h" tabIndex={-1}>Ready. Now apply.</h3>
            <JoinLinks chosen={chosen} />
          </>
        )}
      </div>
      <div className="jn-foot">
        <button type="button" className="key" disabled={step === 0 || step === 3} onClick={() => setStep((s) => (s === 4 ? 1 : s - 1))}>Back</button>
        {step < 2 && <button type="button" className="key key--hi" disabled={step === 1 && !chosen.length} onClick={() => setStep((s) => s + 1)}>{step === 1 && !chosen.length ? 'Pick one first' : 'Next'}</button>}
        {step === 2 && <button type="button" className="key key--hi" onClick={() => setStep(3)}>Install</button>}
        {step === 4 && <button type="button" className="key key--hi" onClick={() => set({ mode: 'off', chosen })}>Finish and shut down</button>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- flow */

const COLS = ['1AC', '1NC', '1AR', '2NR', '2AR'];
type Tool = 'auto' | 'hi' | 'erase';

export function Flow() {
  const cv = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('auto');
  const [ink, setInk] = useState(0);
  const toolRef = useRef(tool); toolRef.current = tool;
  useEffect(() => {
    const c = cv.current!, box = c.parentElement!;
    const ctx = c.getContext('2d')!;
    let dpr = Math.min(2, devicePixelRatio || 1);
    const fit = () => {
      const r = box.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const old = document.createElement('canvas'); old.width = c.width; old.height = c.height;
      if (c.width) old.getContext('2d')!.drawImage(c, 0, 0);
      dpr = Math.min(2, devicePixelRatio || 1);
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
      ctx.drawImage(old, 0, 0);
    };
    const ro = new ResizeObserver(fit); ro.observe(box); fit();
    let last: { x: number; y: number } | null = null, id = -1;
    const at = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr, w: r.width }; };
    const down = (e: PointerEvent) => { if (id >= 0) return; id = e.pointerId; c.setPointerCapture(id); last = at(e); move(e); e.stopPropagation(); };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id || !last) return;
      const p = at(e), t = toolRef.current;
      const col = Math.floor((p.x / dpr / p.w) * 5);
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (t === 'erase') { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 22 * dpr; ctx.strokeStyle = '#000'; }
      else if (t === 'hi') { ctx.globalCompositeOperation = 'multiply'; ctx.lineWidth = 16 * dpr; ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(255,216,74,0.55)'; }
      else { ctx.lineWidth = 2.6 * dpr; ctx.strokeStyle = col % 2 === 0 ? '#2f5fd0' : '#c8371f'; }
      ctx.beginPath(); ctx.moveTo(last.x, last.y);
      ctx.quadraticCurveTo(last.x, last.y, (last.x + p.x) / 2, (last.y + p.y) / 2);
      ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.restore();
      last = { x: p.x, y: p.y };
    };
    const up = (e: PointerEvent) => { if (e.pointerId !== id) return; id = -1; last = null; setInk((n) => n + 1); };
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    return () => { ro.disconnect(); c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up); };
  }, []);
  const clear = () => { const c = cv.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setInk(0); };
  const T = ({ id, children }: { id: Tool; children: ReactNode }) => <button type="button" className={cn('tool', tool === id && 'is-on')} aria-pressed={tool === id} onClick={() => setTool(id)}>{children}</button>;
  return (
    <div className="app fl">
      <div className="tools" role="toolbar" aria-label="Pens">
        <T id="auto"><span className="sw sw--aff" aria-hidden="true" /><span className="sw sw--neg" aria-hidden="true" />Pen</T>
        <T id="hi"><span className="sw sw--hi" aria-hidden="true" />Highlighter</T>
        <T id="erase"><span className="sw sw--er" aria-hidden="true" />Eraser</T>
        <button type="button" className="tool" onClick={clear}>New sheet</button>
      </div>
      <div className="fl-sheet">
        <ol className="fl-cols" aria-hidden="true">{COLS.map((c, k) => <li key={c} className={k % 2 ? 'neg' : 'aff'}>{c}</li>)}</ol>
        <div className="fl-pad"><canvas ref={cv} role="img" aria-label="A blank flow sheet you can draw on" /></div>
        {!ink && <p className="fl-hint" aria-hidden="true">Draw here. Aff columns write blue, neg columns red.</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- trash */

export function Trash() {
  const say = useOS((s) => s.say);
  const root = useRef<HTMLDivElement>(null);
  const refuse = () => { shake(root.current); document.dispatchEvent(new CustomEvent('desk:spit')); say('The question mark won’t go in the trash.', MANIFESTO[3]); };
  return (
    <div className="app tr" ref={root}>
      <Px name="trash" size={120} className="tr-bin" />
      <p className="tr-t">Nothing in here.</p>
      <p className="tr-s">One file keeps coming back out.</p>
      <div className="tr-row">
        <button type="button" className="key" onClick={refuse}>Throw the question mark away</button>
        <button type="button" className="key" onClick={() => shake(root.current)}>Empty trash</button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- note */

const NOTE_KEY = 'skep-desktop-note';
export function Note() {
  const [v, setV] = useState(() => { try { return localStorage.getItem(NOTE_KEY) ?? ''; } catch { return ''; } });
  useEffect(() => { try { localStorage.setItem(NOTE_KEY, v); } catch { /* private window */ } }, [v]);
  return (
    <label className="app nt">
      <span className="sr-only-x">Sticky note</span>
      <textarea value={v} onChange={(e) => setV(e.target.value)} placeholder={'Note to self:\nflow everything.\n\n(type here, it stays on this machine)'} spellCheck={false} />
    </label>
  );
}

/* -------------------------------------------------------------------- mark */

export function MarkViewer() {
  const say = useOS((s) => s.say);
  const gl = useMemo(hasWebGL, []);
  const pad = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pad.current; if (!el) return;
    let last = 0, lt = 0, id = -1;
    const down = (e: PointerEvent) => { id = e.pointerId; el.setPointerCapture(id); spin.drag = true; last = e.clientX; lt = performance.now(); spin.v = 0; e.stopPropagation(); };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - last, now = performance.now(), dt = Math.max(8, now - lt);
      spin.angle += dx * 0.012; spin.v = (dx * 0.012) / (dt / 1000) * 0.6; last = e.clientX; lt = now;
    };
    const up = (e: PointerEvent) => { if (e.pointerId !== id) return; id = -1; spin.drag = false; spin.v = Math.max(-14, Math.min(14, spin.v)); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
  }, []);
  return (
    <div className="app m3">
      <div className="m3-pad" ref={pad} role="img" aria-label="The Skeptical question mark as a solid object. Drag sideways to spin it.">
        {gl ? <Suspense fallback={<QMark className="m3-flat" />}><Mark3D /></Suspense> : <QMark className="m3-flat" />}
      </div>
      <div className="tools tools--foot" role="toolbar" aria-label="Object">
        <button type="button" className="tool" onClick={() => { spin.v += 16; spin.kick = 1; }}>Spin it</button>
        <button type="button" className="tool" onClick={() => { spin.v -= 16; spin.kick = 1; }}>Other way</button>
        <button type="button" className="tool" onClick={() => { spin.kick = 1.4; spin.v += 4; say('Can’t delete question.mark.', MANIFESTO[3]); }}>Delete</button>
        <span className="tools-hint">drag to turn</span>
      </div>
    </div>
  );
}
