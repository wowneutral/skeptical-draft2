import type React from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './style.css';
import { useVersion } from '@/lib/version';
import { gsap, getLenis, scrollToY } from '@/lib/scroll';
import { still, isPhone } from '@/lib/utils';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { HOOK_D, measurer, prepare, solve, type Item, type Layout, type Tok } from './layout';

const PIL: Tok = { t: '¶', c: 'p' };

function items(): Item[] {
  const run = (parts: Tok[][]): Tok[] => parts.flatMap((p, i) => (i ? [PIL, ...p] : p));
  return [
    { k: 'title', text: 'SKEPTICAL?', sec: 'top', rows: 4, h1: true },
    { k: 'p', sec: 'top', toks: run([
      [{ t: HERO.pitch.join(' ') }],
      [{ t: HERO.doors[0].label, c: 'a', href: HERO.doors[0].href }, { t: 'or' }, { t: HERO.doors[1].label, c: 'a', href: HERO.doors[1].href }],
      [{ t: HERO.statement.join(' ') }],
    ]) },
    { k: 'p', sec: 'top', fresh: false, toks: [PIL, ...run(MANIFESTO.map((m) => [{ t: m }]))] },
    { k: 'title', text: RECORD.title, sec: 'record', rows: 3 },
    { k: 'p', sec: 'record', toks: run([
      [{ t: RECORD.rule }],
      [{ t: `${RECORD.when}. ${RECORD.name}. ${RECORD.where}.` }],
      ...RECORD.results.map((r) => [{ t: r.who, c: 'n' as const }, { t: `${r.what}. ${r.more}` }]),
      [{ t: RECORD.more.label, c: 'a', href: RECORD.more.href }],
    ]) },
    { k: 'title', text: DRIVE.title, sec: 'drive', rows: 3 },
    { k: 'p', sec: 'drive', toks: [{ t: DRIVE.lead }] },
    ...DRIVE.items.map((d): Item => ({ k: 'p', sec: 'drive', fresh: true, toks: [{ t: d.term, c: 'k' }, { t: d.text }] })),
    { k: 'p', sec: 'drive', fresh: true, toks: [{ t: DRIVE.more.label, c: 'a', href: DRIVE.more.href }] },
    { k: 'title', text: PEOPLE.title, sec: 'people', rows: 3 },
    { k: 'p', sec: 'people', toks: [{ t: PEOPLE.coaches[0].name, c: 'n' }, { t: `${PEOPLE.coaches[0].role}. ${PEOPLE.coaches[0].bio}` }] },
    { k: 'p', sec: 'people', gap: true, toks: [{ t: PEOPLE.coaches[1].name, c: 'n' }, { t: `${PEOPLE.coaches[1].role}. ${PEOPLE.coaches[1].bio}` }] },
    { k: 'p', sec: 'people', gap: true, toks: [{ t: PEOPLE.count }] },
    { k: 'p', sec: 'people', gap: true, toks: [{ t: PEOPLE.more.label, c: 'a', href: PEOPLE.more.href }] },
  ];
}

const SECS = ['top', 'record', 'drive', 'people'];

function Toks({ toks }: { toks: Tok[] }) {
  return (
    <>
      {toks.map((t, i) => {
        const txt = t.t.trimEnd();
        const sp = t.t !== txt ? ' ' : '';
        let el;
        if (t.c === 'a') el = <a className="tx a" href={t.href}>{txt}</a>;
        else if (t.c === 'p') el = <span className="tx p" aria-hidden="true">{txt}</span>;
        else if (t.c) el = <span className={'tx ' + t.c}>{txt}</span>;
        else el = <>{txt}</>;
        return <span key={i} className="tk">{el}{sp}</span>;
      })}
    </>
  );
}

function Shape({ L, poster, onTitle, lit }: { L: Layout; poster?: boolean; onTitle?: (s: string) => void; lit?: string }) {
  const bySec = SECS.map((s) => ({ s, lines: L.lines.filter((l) => l.sec === s), titles: L.titles.filter((t) => t.sec === s) }));
  const sw = L.r * 2;
  return (
    <>
    {poster ? <div className="cg-h1" style={{ fontSize: L.h1 }}>SKEPTICAL?</div> : (
      <h1 id="t-top" className="cg-h1" style={{ fontSize: L.h1 }}><span aria-hidden="true">SKEPTICAL?</span><span className="sr-only-x">{SITE.heading}.</span></h1>
    )}
    <div className="cg-shape" style={{ width: L.W, height: L.H }}>
      <svg className="cg-out" aria-hidden="true" width={L.W} height={L.H} viewBox={`0 0 ${L.W / L.sx} ${L.H / L.sy}`} preserveAspectRatio="none">
        <g transform={`translate(${L.ox} ${L.oy})`}>
          <path d={HOOK_D} className="o1" strokeWidth={sw + 3 / L.sx} strokeLinejoin="round" strokeLinecap="round" />
          <path d={HOOK_D} className="o2" strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
        </g>
      </svg>
      {bySec.map(({ s, lines, titles }) => {
        const Sec = poster ? 'div' : 'section';
        return (
          <Sec key={s} className={'cg-sec' + (lit === s ? ' lit' : '')} data-sec={s} id={poster ? undefined : s === 'top' ? 'main-top' : s} aria-labelledby={poster ? undefined : `t-${s}`}>
            {titles.map((t) => {
              const style = { left: t.x, top: t.y, width: t.w, height: t.h, fontSize: t.fs };
              if (poster) return <div key={t.text} className="cg-title" style={style}>{t.text}</div>;
              if (t.h1) return null;
              return (
                <h2 key={t.text} id={`t-${s}`} className="cg-title" style={style}>
                  <button type="button" onClick={() => onTitle?.(s)} aria-label={`${t.text} Show it in the whole question.`}>{t.text}</button>
                </h2>
              );
            })}
            <div className="cg-rows">
              {lines.map((l, i) => (
                <div key={i} className={'cg-ln' + (l.last ? ' last' : '')} style={{ left: l.x, top: l.y, width: l.w, height: L.lh, wordSpacing: l.last ? undefined : l.ws, fontSize: L.fs, lineHeight: `${L.lh}px` }}>
                  {poster ? l.toks.map((t) => t.t).join(' ') : <Toks toks={l.toks} />}
                </div>
              ))}
            </div>
          </Sec>
        );
      })}
    </div>
    </>
  );
}

export default function Calligram() {
  useVersion('calligram');
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState(0);
  const [L, setL] = useState<Layout | null>(null);
  const [P, setP] = useState<Layout | null>(null);
  const [phone, setPhone] = useState(false);
  const [lit, setLit] = useState<string | undefined>();
  const [over, setOver] = useState(false);
  const [open, setOpen] = useState(still);
  const busy = useRef(false);
  const its = useMemo(items, []);

  // width, only when it changes (phone URL bars resize the height)
  useEffect(() => {
    let t = 0;
    const on = () => { clearTimeout(t); t = window.setTimeout(() => setVw((v) => (v === window.innerWidth ? v : window.innerWidth)), 150); };
    setVw(window.innerWidth);
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('resize', on); clearTimeout(t); };
  }, []);

  useEffect(() => {
    if (!vw || !root.current) return;
    let dead = false;
    const go = async () => {
      try { await Promise.all(['400 100px "Newsreader Variable"', 'italic 400 100px "Newsreader Variable"', '500 100px "Bodoni Moda Variable"'].map((f) => document.fonts.load(f))); } catch { /* fall back */ }
      if (dead || !root.current) return;
      const ph = isPhone();
      const ms = measurer(root.current);
      const prep = prepare(its, ms.m);
      ms.done();
      if (ph) {
        setL(solve(prep, vw - 32, 'hull', 16, 16, 40));
        setP(solve(prep, Math.min(vw - 40, 420), 'stroke', 1.6, 8, 70, 1.3));
      } else {
        const W = Math.min(vw - 64, 1280);
        const l = solve(prep, W, 'stroke', 17, 30, vw < 1100 ? 80 : 58);
        (window as unknown as { __cgd: unknown }).__cgd = { fs: l.fs, sy: l.sy / l.sx, H: l.H, n: l.lines.length, last: l.lines[l.lines.length - 1]?.y, h1: l.h1 };
        setL(l);
        setP(null);
      }
      setPhone(ph);
    };
    go();
    return () => { dead = true; };
  }, [vw, its]);

  // overview transform for the stage (the whole mark fits the screen)
  const overview = (sc: number) => {
    const s = stage.current!;
    let top = 0;
    for (let e: HTMLElement | null = s; e; e = e.offsetParent as HTMLElement | null) top += e.offsetTop;
    const H = s.offsetHeight, W = s.offsetWidth;
    const k = Math.min((window.innerHeight - 56) / H, (window.innerWidth - 48) / W, 1);
    return { x: (W - W * k) / 2, y: sc + 28 - top, scale: k };
  };

  // the opening: the whole question, then it eases up to reading size
  useLayoutEffect(() => {
    if (!L || phone || still || !stage.current) return;
    const s = stage.current;
    const first = !s.dataset.opened;
    if (!first) return;
    s.dataset.opened = '1';
    const lenis = getLenis();
    lenis?.stop();
    gsap.set(s, { transformOrigin: '0 0', ...overview(window.scrollY) });
    root.current?.classList.add('is-overview');
    gsap.from(s.querySelectorAll('.cg-ln, .cg-title'), { opacity: 0, duration: 0.5, ease: 'out', stagger: { amount: 0.8 } });
    const tl = gsap.timeline({ delay: 1.2, onComplete: () => { lenis?.start(); gsap.set(s, { clearProps: 'transform' }); } });
    tl.add(() => root.current?.classList.remove('is-overview'), 0.2);
    tl.to(s, { x: 0, y: 0, scale: 1, duration: 1.9, ease: 'site' }, 0);
    return () => { tl.kill(); lenis?.start(); };
  }, [L, phone]);

  // ink: rows you have read are bone, rows ahead wait in a quieter grey
  useEffect(() => {
    if (!L || still || !stage.current) return;
    const rows = Array.from(stage.current.querySelectorAll<HTMLElement>('.cg-ln'));
    const absTop = (el: HTMLElement) => { let y = 0; for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop; return y; };
    let ys: number[] = [];
    const measure = () => { ys = rows.map(absTop); };
    measure();
    let last = -1;
    const on = () => {
      const front = window.scrollY + window.innerHeight * 0.64;
      let n = 0;
      while (n < ys.length && ys[n] < front) n++;
      if (n === last) return;
      for (let i = 0; i < rows.length; i++) rows[i].classList.toggle('rd', i < n);
      last = n;
    };
    on();
    root.current?.classList.add('is-ink');
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', measure);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', measure); };
  }, [L, phone]);

  const target = (sec: string) => {
    const el = document.getElementById(`t-${sec}`);
    if (!el) return 0;
    let y = 0;
    for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop;
    return Math.max(0, y - 90);
  };

  const pull = (sec: string) => {
    if (busy.current) return;
    if (still) { scrollToY(target(sec), true); document.getElementById(`t-${sec}`)?.querySelector('button')?.focus(); return; }
    busy.current = true;
    setLit(sec);
    if (phone) {
      const y = target(sec);
      scrollToY(0);
      setOver(true);
      window.setTimeout(() => { setOver(false); scrollToY(y); window.setTimeout(() => { busy.current = false; setLit(undefined); }, 1500); }, 2100);
      return;
    }
    const s = stage.current!;
    const lenis = getLenis();
    lenis?.stop();
    // freeze where the stage sits now, then pull back
    const y2 = Math.min(target(sec), document.documentElement.scrollHeight - window.innerHeight);
    setOver(true);
    gsap.timeline({ onComplete: () => { gsap.set(s, { clearProps: 'transform' }); lenis?.start(); busy.current = false; setOver(false); setLit(undefined); s.querySelector<HTMLButtonElement>(`#t-${sec} button`)?.focus({ preventScroll: true }); } })
      .set(s, { transformOrigin: '0 0' })
      .to(s, { ...overview(window.scrollY), duration: 1.05, ease: 'site' })
      .add(() => { lenis?.scrollTo(y2, { immediate: true, force: true }); window.scrollTo(0, y2); gsap.set(s, overview(y2)); }, '+=0.9')
      .to(s, { x: 0, y: 0, scale: 1, duration: 1.25, ease: 'site' });
  };

  // press ? anywhere to see the whole question, lit where you are
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || (e.target as HTMLElement)?.closest?.('input,textarea')) return;
      let cur = 'record';
      for (const s of ['record', 'drive', 'people']) { const y = target(s); if (y <= window.scrollY + 120) cur = s; }
      pull(cur);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const toggle = () => {
    const now = !open;
    setOpen(now);
    if (now && !still) {
      requestAnimationFrame(() => {
        const p = panel.current;
        if (!p) return;
        gsap.fromTo(p, { clipPath: 'circle(0% at 50% 0%)' }, { clipPath: 'circle(150% at 50% 0%)', duration: 1.3, ease: 'site', clearProps: 'clipPath' });
        gsap.from(p.querySelectorAll('[data-in]'), { y: 40, opacity: 0, duration: 1, stagger: 0.07, ease: 'out', delay: 0.15 });
        scrollToY(p.getBoundingClientRect().top + window.scrollY - 40);
      });
    }
  };

  const dotStyle = L && !phone ? ({ left: L.dot.x - L.dot.d / 2, top: L.dot.y - L.dot.d / 2 + L.h1 * 0.86, width: L.dot.d, height: L.dot.d, '--d': L.dot.d + 'px' } as React.CSSProperties) : undefined;

  return (
    <div ref={root} className={'v-calligram' + (over ? ' is-over' : '') + (phone ? ' is-phone' : '')} data-lit={lit}>
      <a className="skip-x" href="#main">Skip to the text</a>
      <main id="main">
        {phone && P && (
          <div className="cg-poster" aria-hidden="true" ref={(el) => { if (el && !still && !el.dataset.in) { el.dataset.in = '1'; gsap.from(el.querySelectorAll('.cg-ln, .cg-title, .cg-h1, .cg-pdot'), { opacity: 0, duration: 0.45, stagger: { amount: 0.9 }, ease: 'out' }); } }}>
            <div className="cg-poster-in" style={{ width: P.W, height: P.dot.y + P.dot.d / 2 + P.h1 * 0.86 }}>
              <Shape L={P} poster lit={lit} />
              <div className="cg-pdot" style={{ left: P.dot.x - P.dot.d / 2, top: P.dot.y - P.dot.d / 2 + P.h1 * 0.86, width: P.dot.d, height: P.dot.d }} />
            </div>
          </div>
        )}
        <div ref={stage} className="cg-stage" style={L ? { width: L.W, height: (phone ? L.H : L.dot.y + L.dot.d / 2) + L.h1 * 0.86 } : { height: '100vh' }}>
          {L && <Shape L={L} onTitle={pull} lit={lit} />}
          {L && !phone && (
            <h2 className="cg-dot" style={dotStyle}>
              <button type="button" aria-expanded={open} aria-controls="join" onClick={toggle}><span>{JOIN.title}</span></button>
            </h2>
          )}
        </div>
        {L && phone && (
          <div className="cg-dotscreen">
            <h2 className="cg-dot">
              <button type="button" aria-expanded={open} aria-controls="join" onClick={toggle}><span>{JOIN.title}</span></button>
            </h2>
          </div>
        )}
        <section ref={panel} id="join" className="cg-join" hidden={!open} aria-label={JOIN.title}>
          <p className="cg-lead" data-in>{JOIN.lead}</p>
          <ol className="cg-paths">
            {JOIN.paths.map((p) => (
              <li key={p.id} className="cg-path" data-in>
                <a className="cg-pname" href={p.href}>{p.name}<span aria-hidden="true">.</span></a>
                <div className="cg-pbody">
                  <p className="cg-pline">{p.line}</p>
                  {p.text.map((t) => <p key={t}>{t}</p>)}
                </div>
              </li>
            ))}
          </ol>
          <div className="cg-also" data-in>
            <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a>. {JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a>.</p>
            <p>{JOIN.also} <a href={FOOTER.links[4].href}>{FOOTER.links[4].label}</a></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>
      </main>
      <footer className="cg-foot">
        <p className="cg-fline">{FOOTER.line}</p>
        <ul className="cg-flinks">
          {FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
        </ul>
        <ul className="cg-flinks cg-pages">
          {FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
        </ul>
        <p className="cg-draft">Draft 2, version 59. Not the live site.</p>
      </footer>
    </div>
  );
}
