// Version 87: the perm. One hard seam down the whole page, black on the left and bone
// on the right, offering two things at a time in type that always fills its half.
// Drag the seam to take a side. Press it, or push it off the edge, and it does both.
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as RKE, type PointerEvent as RPE } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import './perm.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { clamp, isPhone, smooth, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { initMeasure, padX, sizeAt, store, update } from './fit';
import { Fields, FitRow, FitTitle, Pair, type SeamHandlers } from './parts';

const at = (s: string) => s.split(/(?<=\.)\s+/);
const rubber = (r: number) => (r < 0.25 ? 0.25 - (0.25 - r) * 0.32 : r > 0.75 ? 0.75 + (r - 0.75) * 0.32 : r);

export default function Perm() {
  useVersion('perm');
  const root = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const driveRef = useRef<HTMLElement>(null);
  const joinRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [perm, setPerm] = useState(false);
  const [endPerm, setEndPerm] = useState(false);
  const permRef = useRef(false);
  permRef.current = perm;

  const press = useCallback(() => {
    if (still) { setPerm((p) => !p); return; }
    setPerm((p) => !p);
    store.base = 0.5;
    store.v += store.s > 0.5 ? -1.6 : 1.6;
  }, []);

  const onDrag = useCallback((f: number | null, release?: boolean) => {
    if (f == null) { store.drag = null; return; }
    if (permRef.current) setPerm(false);
    if (release) {
      store.drag = null;
      if (f < 0.1 || f > 0.9) { store.base = 0.5; setPerm(true); store.v += f < 0.5 ? 2.2 : -2.2; }
      else store.base = clamp(f, 0.25, 0.75);
    } else store.drag = f;
  }, []);

  const seam: SeamHandlers = { onDrag, onPress: press, onOff: () => setPerm(false) };

  // The engine: a spring for the seam, the fitting, the drive column and the join split.
  useEffect(() => {
    const el = root.current!;
    const undo = initMeasure(el);
    const size = () => {
      store.vw = document.documentElement.clientWidth;
      store.vh = window.innerHeight;
      store.phone = isPhone();
      el.style.setProperty('--cw', Math.min(760, store.vw - 32) + 'px');
      el.style.setProperty('--third', store.vw / 3 + 'px');
      update(true);
      window.dispatchEvent(new Event('perm:size'));
    };
    size();
    let queued = 0;
    const refit = () => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; update(true); }); };
    window.addEventListener('resize', size);
    window.addEventListener('perm:refit', refit);

    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      store.ready = true;
      window.dispatchEvent(new Event('perm:size'));
      update(true);
      el.classList.add('go');
      if (still) return;
      const q = gsap.utils.selector(el);
      gsap.from(q('.hero .pane.L .fitrow'), { x: -80, autoAlpha: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out' });
      gsap.from(q('.hero .pane.R .fitrow'), { x: 80, autoAlpha: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out', delay: 0.05 });
      store.s = 0.5;
      store.v = 2.4; // the seam swings once and settles, so the type shows what it does
    };
    document.fonts.load('800 100px "Archivo Variable"', 'PERM').then(() => document.fonts.ready).then(go, go);
    const fallback = window.setTimeout(go, 2500);

    let touched = false;
    const touch = () => { touched = true; };
    window.addEventListener('pointerdown', touch, { once: true });
    let last = -1;
    let lastOpen = -1;
    let lastJ = -1;
    const tick = (_t: number, dms: number) => {
      // read
      const vh = store.vh;
      let open = 1;
      let j = 1;
      let calm = false;
      if (!still && !store.phone) {
        const d = driveRef.current!.getBoundingClientRect();
        open = smooth(clamp(Math.min((vh * 0.92 - d.top) / (vh * 0.55), d.bottom / (vh * 0.4))));
        const jr = joinRef.current!.getBoundingClientRect();
        j = smooth(clamp((vh * 0.95 - jr.top) / (vh * 0.6)));
        calm = (d.top < vh * 0.5 && d.bottom > vh * 0.5) || (jr.top < vh * 0.55 && jr.bottom > vh * 0.45);
      }
      // seam
      if (!still) {
        const dt = Math.min(dms, 40) / 1000;
        const target = store.drag != null ? rubber(store.drag) : clamp(store.base + store.lean, 0.2, 0.8);
        const k = store.drag != null ? 520 : 170;
        const c = store.drag != null ? 40 : 12;
        for (let i = 0; i < 2; i++) {
          const h = dt / 2;
          store.v += (k * (target - store.s) - c * store.v) * h;
          store.s += store.v * h;
        }
        store.s = clamp(store.s, 0.12, 0.88);
      }
      // write
      if (Math.abs(store.s - last) > 0.00005 || Math.abs(open - lastOpen) > 0.0005 || Math.abs(j - lastJ) > 0.0005) {
        el.style.setProperty('--s', store.s.toFixed(5));
        el.style.setProperty('--sx', (store.s * store.vw).toFixed(1) + 'px');
        el.style.setProperty('--colw', (open * Math.min(760, store.vw - 32)).toFixed(1) + 'px');
        el.style.setProperty('--j', j.toFixed(4));
        store.open = open;
        store.j = j;
        update(false);
        handle.current?.setAttribute('aria-valuenow', String(Math.round(store.s * 100)));
        last = store.s; lastOpen = open; lastJ = j;
      }
      handle.current?.classList.toggle('off', calm);
      handle.current?.classList.toggle('far', touched || window.scrollY > vh * 0.4);
    };
    gsap.ticker.add(tick);

    const lean = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || store.phone || still) return;
      store.lean = (0.5 - e.clientX / store.vw) * 0.16;
    };
    const unlean = () => { store.lean = 0; };
    window.addEventListener('pointermove', lean);
    document.documentElement.addEventListener('pointerleave', unlean);

    return () => {
      undo();
      window.removeEventListener('pointerdown', touch);
      window.clearTimeout(fallback);
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', size);
      window.removeEventListener('perm:refit', refit);
      window.removeEventListener('pointermove', lean);
      document.documentElement.removeEventListener('pointerleave', unlean);
      store.ready = false;
      store.s = 0.5; store.base = 0.5; store.v = 0; store.lean = 0; store.drag = null;
    };
  }, []);

  // The ending does the perm by itself.
  useGSAP(() => {
    const st = ScrollTrigger.create({
      trigger: endRef.current, start: 'center 78%',
      onEnter: () => setEndPerm(true), onLeaveBack: () => setEndPerm(false),
    });
    return () => st.kill();
  }, { scope: root });

  // The desktop seam: one handle, fixed, the full height of the window.
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const hdown = (e: RPE) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, moved: false };
  };
  const hmove = (e: RPE) => {
    if (!drag.current) return;
    if (Math.abs(e.clientX - drag.current.x) > 5) drag.current.moved = true;
    if (drag.current.moved) onDrag(e.clientX / store.vw);
  };
  const hup = (e: RPE) => {
    if (!drag.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    if (!moved) press();
    else onDrag(e.clientX / store.vw, true);
  };
  const hkey = (e: RKE) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(); }
    if (e.key === 'Escape') setPerm(false);
    if (e.key === 'ArrowLeft') { e.preventDefault(); store.base = Math.max(0.25, store.base - 0.06); }
    if (e.key === 'ArrowRight') { e.preventDefault(); store.base = Math.min(0.75, store.base + 0.06); }
    if (e.key === 'Home') { e.preventDefault(); store.base = 0.25; }
    if (e.key === 'End') { e.preventDefault(); store.base = 0.75; }
  };

  const [m0, m1, m2, m3] = MANIFESTO;
  const m1p = at(m1);
  const m3p = at(m3);
  const foot = at(FOOTER.line);

  const colName = (i: number, name: string) => (
    <FitRow
      text={name}
      hide={false}
      get={() => {
        const px = padX();
        const third = store.vw / 3;
        const s = store.s;
        const j = store.j;
        const w = store.phone ? store.vw : i === 0 ? (s + (1 / 3 - s) * j) * store.vw : i === 1 ? third * j : store.vw - (s + (1 / 3 - s) * j) * store.vw - third * j;
        return [w - 2 * px, Math.min(store.phone ? 140 : 190, sizeAt(name, third - 2 * px, 100))];
      }}
    />
  );

  return (
    <div className="v-perm" ref={root} style={{ ['--s' as string]: 0.5 }}>
      <a className="skip-x" href="#main">Skip to content</a>

      <header className="hero">
        {!still && (
          <div
            ref={handle}
            className="seam"
            role="slider"
            tabIndex={0}
            aria-label="The seam. Arrows take a side, Enter does both."
            aria-orientation="horizontal"
            aria-valuemin={25}
            aria-valuemax={75}
            aria-valuenow={50}
            onPointerDown={hdown}
            onPointerMove={hmove}
            onPointerUp={hup}
            onPointerCancel={() => { drag.current = null; onDrag(null, true); }}
            onKeyDown={hkey}
          >
            <span className="notch" />
            <span className="hint" aria-hidden="true">{perm ? 'Both' : 'Drag, or press'}</span>
          </div>
        )}

        <Fields
          className="bar"
          left={<h1 className="mark"><span>{SITE.name}</span><span className="sr-only-x">: an independent Lincoln-Douglas debate team</span></h1>}
          right={
            <nav aria-label="Sections">
              <ul>{NAV.map((n) => <li key={n.id}><a href={'#' + n.id}>{n.label}</a></li>)}</ul>
            </nav>
          }
        />
        <Pair className="pitch" left={HERO.pitch[0]} right={HERO.pitch[1]} on={perm} seam={seam} air={0.1} />
        <Pair className="doors" left={HERO.doors[0].label} right={HERO.doors[1].label} n={[1, 1]} permable={false} hrefs={[HERO.doors[0].href, HERO.doors[1].href]} seam={seam} />
      </header>

      <main id="main">
        <Fields
          className="statement"
          left={<p className="big">{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>}
          right={<p className="say">Pick a side. Or press the seam and keep both.</p>}
        />

        <section aria-label="What we are" className="manifesto">
          <Fields className="calmf" left={<p className="mid">{m0}</p>} />
          <Pair className="tall" left={m1p[0]} right={m1p[1]} n={[2, 3]} on={perm} seam={seam} />
          <Fields className="calmf" right={<p className="mid">{m2}</p>} />
          <Pair className="tall" left={m3p[0]} right={m3p[1]} n={[3, 3]} on={perm} seam={seam} />
        </section>

        <section id="record" aria-labelledby="record-h" className="record">
          <Fields
            className="head"
            left={<div id="record-h"><FitTitle text={RECORD.title} side="L" /></div>}
            right={
              <div className="rule">
                <p className="mid">{RECORD.rule}</p>
                <p className="event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
              </div>
            }
          />
          <Pair className="tall" left={RECORD.results[0].what} right={RECORD.results[1].what} n={[2, 3]} on={perm} seam={seam} tag="h3" />
          <Fields
            className="who"
            left={<p className="res"><strong>{RECORD.results[0].who}</strong> {RECORD.results[0].more}</p>}
            right={
              <>
                <p className="res"><strong>{RECORD.results[1].who}</strong> {RECORD.results[1].more}</p>
                <a className="more" href={RECORD.more.href}>{RECORD.more.label}</a>
              </>
            }
          />
        </section>

        <section id="drive" ref={driveRef} aria-labelledby="drive-h" className="drive">
          <div className="strip L" />
          <div className="col">
            <div className="colin">
              <h2 id="drive-h" className="dtitle">
                <FitRow
                  text={DRIVE.title}
                  hide={false}
                  live={false}
                  get={() => {
                    const pc = Math.max(20, Math.min(48, store.vw * 0.03));
                    const W = (store.phone ? store.vw : Math.min(760, store.vw - 32)) - 2 * (store.phone ? 16 : pc);
                    return [W, sizeAt(DRIVE.title, W, 80)];
                  }}
                />
              </h2>
              <p className="lead">{DRIVE.lead}</p>
              <dl>
                {DRIVE.items.map((it) => (
                  <div key={it.term} className="item">
                    <dt>{it.term}</dt>
                    <dd>{it.text}</dd>
                  </div>
                ))}
              </dl>
              <a className="more" href={DRIVE.more.href}>{DRIVE.more.label}</a>
            </div>
          </div>
          <div className="strip R" />
        </section>

        <section id="people" aria-labelledby="people-h" className="people">
          <Fields
            className="head"
            left={<div id="people-h"><FitTitle text={PEOPLE.title} side="L" /></div>}
            right={<p className="mid count">{PEOPLE.count}</p>}
          />
          <Pair className="tall names" left={PEOPLE.coaches[0].name} right={PEOPLE.coaches[1].name} n={[2, 2]} on={perm} seam={seam} tag="h3" />
          <Fields
            className="who"
            left={<><p className="role">{PEOPLE.coaches[0].role}</p><p className="res">{PEOPLE.coaches[0].bio}</p></>}
            right={<><p className="role">{PEOPLE.coaches[1].role}</p><p className="res">{PEOPLE.coaches[1].bio}</p><a className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</a></>}
          />
        </section>

        <section id="join" aria-labelledby="join-h" className="join">
          <Fields
            className="head"
            left={<div id="join-h"><FitTitle text={JOIN.title} side="L" /></div>}
            right={<p className="jlead"><span>{at(JOIN.lead)[0]}</span> <em>{at(JOIN.lead)[1]}</em></p>}
          />
          <div className="jcols" ref={joinRef}>
            {JOIN.paths.map((p, i) => (
              <article key={p.id} className={'jc c' + i} aria-labelledby={'jp-' + p.id}>
                <h3 id={'jp-' + p.id} className="jname">{colName(i, p.name)}</h3>
                <div className="jin">
                  <p className="jline">{p.line}</p>
                  <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                  <a className="apply" href={p.href}>Apply to {p.name.toLowerCase()}</a>
                </div>
              </article>
            ))}
          </div>
          <Fields
            className="after"
            left={
              <>
                <p className="res">{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
                <p className="res">{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
              </>
            }
            right={
              <>
                <p className="res">{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
                <p className="res">{JOIN.discord}</p>
              </>
            }
          />
        </section>
      </main>

      <footer className="foot">
        <Fields
          className="flinks"
          left={<ul aria-label="Elsewhere">{FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>}
          right={<ul aria-label="Pages">{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>}
        />
        <div ref={endRef}>
          <Pair className="tall end" left={foot[0]} right={foot[1]} n={[2, 2]} on={perm || endPerm} seam={seam} />
        </div>
        <Fields className="draft" right={<p>Draft 2, version 87. Not the live site.</p>} />
      </footer>
    </div>
  );
}
