// Version 61: the proof. The page arrives as a typed galley with an editor's red marks
// in the margins. As you read, the marks carry themselves out and the galley becomes the
// set page in enormous type. Press a mark to run or undo it; hold anywhere to see the galley.
import { useEffect, useRef } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/400-italic.css';
import './proof.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap, ScrollTrigger, useGSAP, scrollToY } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Ln, Pin, Stk, type Key } from './marks';
import meta from './meta';

const keysOf = (u: HTMLElement) => (u.dataset.keys || '').split(' ').filter(Boolean) as Key[];
const isOn = (u: HTMLElement, k: Key) => u.classList.contains('on-' + k);

function sync(u: HTMLElement) {
  u.querySelectorAll<HTMLButtonElement>('[data-note]').forEach((b) => b.setAttribute('aria-pressed', String(isOn(u, b.dataset.note as Key))));
}

let refreshT = 0;
const refreshSoon = () => { clearTimeout(refreshT); refreshT = window.setTimeout(() => ScrollTrigger.refresh(), 1100); };

/** Change a unit's setting and let every text in it travel from its old size to its new one. */
function morph(u: HTMLElement, mutate: () => void, quick = false) {
  const texts = Array.from(u.querySelectorAll<HTMLElement>('[data-fs]'));
  const from = texts.map((t) => getComputedStyle(t).fontSize);
  gsap.killTweensOf(texts);
  texts.forEach((t) => { t.style.fontSize = ''; });
  mutate();
  sync(u);
  if (still) { refreshSoon(); return; }
  const to = texts.map((t) => getComputedStyle(t).fontSize);
  texts.forEach((t, i) => {
    if (from[i] === to[i]) return;
    gsap.fromTo(t, { fontSize: from[i] }, { fontSize: to[i], duration: quick ? 0.5 : 0.95, ease: quick ? 'expo.out' : 'expo.inOut', clearProps: 'fontSize' });
  });
  const kick = u.querySelectorAll<HTMLElement>('[data-kick]');
  if (kick.length) gsap.fromTo(kick, { y: 22 }, { y: 0, duration: 0.8, ease: 'back.out(1.7)', stagger: 0.07, clearProps: 'transform' });
  refreshSoon();
}

function setMark(u: HTMLElement, k: Key, on: boolean, quick = false) {
  if (isOn(u, k) === on) return;
  morph(u, () => {
    u.classList.toggle('on-' + k, on);
    if (k === 'del' && !on) u.classList.remove('on-stet');
    u.classList.toggle('set', keysOf(u).some((x) => isOn(u, x)));
  }, quick);
  if (!still && on) {
    const n = u.querySelector<HTMLElement>(`[data-note="${k}"]`);
    if (n) gsap.fromTo(n, { scale: 1.28, x: -6 }, { scale: 1, x: 0, duration: 0.5, ease: 'back.out(3)', clearProps: 'transform' });
  }
}

const calls: gsap.core.Tween[] = [];
/** Run a unit's marks in order, each with a short beat. */
function play(u: HTMLElement, delay = 0) {
  if (u.dataset.played) return;
  u.dataset.played = '1';
  const keys = keysOf(u);
  let t = delay;
  keys.forEach((k) => {
    t += k === 'stet' ? 1.1 : 0.62;
    calls.push(gsap.delayedCall(t, () => { if (!document.documentElement.classList.contains('proof-hold')) setMark(u, k, true); }));
  });
}

const inView = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };

export default function Proof() {
  useVersion('proof');
  const root = useRef<HTMLDivElement>(null);

  // The wordmark fills the width: measure it once in the set face and keep the size as a variable.
  useEffect(() => {
    const el = root.current!;
    const fit = () => {
      const m = el.querySelector<HTMLElement>('.fitm');
      const box = el.querySelector<HTMLElement>('.hero .tx');
      if (!m || !box) return;
      const w = m.getBoundingClientRect().width;
      const W = box.clientWidth;
      if (w > 0) el.style.setProperty('--fit', `${Math.floor((W / w) * 20 * 0.995)}px`);
    };
    fit();
    document.fonts?.ready.then(fit);
    document.fonts?.load('900 100px "Bodoni Moda Variable"', 'SKEPTICAL?').then(fit).catch(() => {});
    const ts = [300, 900, 1800, 3200, 6000].map((t) => window.setTimeout(fit, t));
    const ro = new ResizeObserver(fit);
    const m = el.querySelector('.fitm'), box = el.querySelector('.hero .tx');
    if (m) ro.observe(m);
    if (box) ro.observe(box);
    window.addEventListener('resize', fit);
    return () => { ts.forEach(clearTimeout); ro.disconnect(); window.removeEventListener('resize', fit); };
  }, []);

  useGSAP(() => {
    const el = root.current!;
    const units = Array.from(el.querySelectorAll<HTMLElement>('.ln[data-keys]')).filter((u) => u.dataset.keys);

    if (still) {
      units.forEach((u) => { keysOf(u).forEach((k) => u.classList.add('on-' + k)); u.classList.add('set', 'drawn'); u.dataset.played = '1'; sync(u); });
      return;
    }

    // Opening: the first screen is marked up, then the marks run.
    const hero = units.filter((u) => u.closest('.hero'));
    hero.forEach((u, i) => gsap.delayedCall(0.25 + i * 0.12, () => u.classList.add('drawn')));
    hero.forEach((u, i) => play(u, 0.35 + i * 0.75));

    units.filter((u) => !u.closest('.hero')).forEach((u) => {
      ScrollTrigger.create({ trigger: u, start: 'top 98%', once: true, onEnter: () => u.classList.add('drawn') });
      ScrollTrigger.create({ trigger: u, start: 'top 62%', onEnter: () => play(u) });
    });

    // The ending: pull a fresh proof. Everything goes back to the galley and the opening runs again.
    const again = el.querySelector<HTMLButtonElement>('.again');
    const onAgain = () => {
      calls.splice(0).forEach((c) => c.kill());
      scrollToY(0, true);
      units.forEach((u) => {
        keysOf(u).forEach((k) => u.classList.remove('on-' + k));
        u.classList.remove('set', 'drawn');
        delete u.dataset.played;
        u.querySelectorAll<HTMLElement>('[data-fs]').forEach((t) => { t.style.fontSize = ''; });
        sync(u);
      });
      ScrollTrigger.refresh();
      hero.forEach((u, i) => gsap.delayedCall(0.35 + i * 0.12, () => u.classList.add('drawn')));
      hero.forEach((u, i) => play(u, 0.6 + i * 0.75));
      el.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
    };
    again?.addEventListener('click', onAgain);
    return () => again?.removeEventListener('click', onAgain);
  }, { scope: root });

  // Press a red mark to run it or undo it.
  useEffect(() => {
    const el = root.current!;
    const onClick = (e: MouseEvent) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-note]');
      if (!b) return;
      const u = b.closest<HTMLElement>('.ln')!;
      const k = b.dataset.note as Key;
      u.dataset.played = '1';
      u.classList.add('drawn');
      setMark(u, k, !isOn(u, k));
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, []);

  // Hold anywhere (a long press on a phone) to see the page as the galley; let go to set it.
  useEffect(() => {
    const el = root.current!;
    const html = document.documentElement;
    const btn = el.querySelector<HTMLButtonElement>('.galley-btn')!;
    let timer = 0, sx = 0, sy = 0, held: HTMLElement[] = [], pinned = false;

    const toGalley = () => {
      if (held.length) return;
      html.classList.add('proof-hold');
      held = Array.from(el.querySelectorAll<HTMLElement>('.ln[data-keys]')).filter((u) => u.dataset.keys && inView(u));
      held.forEach((u) => {
        const on = keysOf(u).filter((k) => isOn(u, k));
        u.dataset.saved = on.join(' ');
        u.classList.add('drawn');
        morph(u, () => { on.forEach((k) => u.classList.remove('on-' + k)); u.classList.remove('set'); }, true);
      });
      btn.setAttribute('aria-pressed', 'true');
    };
    const toSet = () => {
      html.classList.remove('proof-hold');
      held.forEach((u) => {
        const on = (u.dataset.saved || '').split(' ').filter(Boolean);
        morph(u, () => { on.forEach((k) => u.classList.add('on-' + k)); if (on.length) u.classList.add('set'); });
        if (!u.dataset.played) play(u);
      });
      held = [];
      btn.setAttribute('aria-pressed', 'false');
    };

    const down = (e: PointerEvent) => {
      if (pinned || e.button > 0) return;
      if ((e.target as HTMLElement).closest('a, button')) return;
      sx = e.clientX; sy = e.clientY;
      clearTimeout(timer);
      timer = window.setTimeout(toGalley, e.pointerType === 'touch' ? 420 : 260);
    };
    const move = (e: PointerEvent) => { if (!held.length && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) clearTimeout(timer); };
    const up = () => { clearTimeout(timer); if (!pinned && held.length) toSet(); };
    const menu = (e: Event) => { if (held.length) e.preventDefault(); };
    const press = () => { if (held.length) { pinned = false; toSet(); } else { pinned = true; toGalley(); } };

    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', menu);
    btn.addEventListener('click', press);
    return () => {
      clearTimeout(timer);
      html.classList.remove('proof-hold');
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('contextmenu', menu);
      btn.removeEventListener('click', press);
    };
  }, []);

  return (
    <div className="v-proof" ref={root}>
      <a className="skip-x" href="#main">Skip to the page</a>

      <header className="slug">
        <span className="slug-name">{SITE.name}</span>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
        <button type="button" className="galley-btn" aria-pressed="false">Galley</button>
      </header>

      <main id="main" className="sheet">
        <section className="hero" aria-label="Skeptical">
          <Ln keys={['disp']} cls="u-name">
            <Stk k="disp" shape="ellipse" cls="trace" />
            <h1 data-fs className="name" tabIndex={-1}>
              <span aria-hidden="true">{SITE.name}?</span>
              <span className="sr-only-x">{SITE.heading}</span>
            </h1>
            <span className="fitw" aria-hidden="true"><span className="fitm">{SITE.name}?</span></span>
          </Ln>

          <div className="hero-body">
            <Ln keys={['para', 'ital']} cls="u-pitch">
              <p className="pitch">
                <span data-fs className="p1">{HERO.pitch[0]}</span>{' '}
                <span data-fs className="p2"><Pin k="para" shape="para" /><span className="ul">{HERO.pitch[1]}<Stk k="ital" shape="under" /></span></span>
              </p>
            </Ln>

            <Ln keys={['para']} cls="u-state">
              <p className="state">
                {HERO.statement.map((s, i) => (
                  <span key={s} data-fs data-kick className="st">{i > 0 && <Pin k="para" shape="para" />}{s}{' '}</span>
                ))}
              </p>
            </Ln>

            <Ln keys={['bf']} cls="u-doors">
              <div className="doors">
                {HERO.doors.map((d) => (
                  <a key={d.href} href={d.href} data-fs data-kick className="door">
                    <span className="ul">{d.label}<Stk k="bf" shape="wave" /></span>
                    <svg className="arr" viewBox="0 0 40 20" aria-hidden="true" focusable="false"><path d="M1 10 H37 M29 2 L37 10 L29 18" /></svg>
                  </a>
                ))}
              </div>
            </Ln>
          </div>
          <p className="hint">Press a red mark. Hold for the galley.</p>
        </section>

        <section className="mani" aria-label="What we are">
          <Ln keys={['para', 'del', 'stet']} cls="u-mani">
            <p className="mtext">
              {MANIFESTO.map((m, i) => (
                <span key={m} data-fs className={`ml ml${i}`}>
                  {i > 0 && <Pin k="para" shape="para" />}
                  {i === 3 ? <span className="named">{m}<Stk k="del" shape="strike" /><Stk k="stet" shape="dots" /></span> : m}{' '}
                </span>
              ))}
            </p>
          </Ln>
        </section>

        <section id="record" className="sec" aria-labelledby="h-record">
          <Ln keys={['disp']} cls="u-title">
            <h2 id="h-record" data-fs className="title"><span className="ul">{RECORD.title}<Stk k="disp" shape="ellipse" /></span></h2>
          </Ln>
          <Ln keys={['ital']} cls="u-rule">
            <p data-fs className="rule"><span className="ul">{RECORD.rule}<Stk k="ital" shape="under" /></span></p>
          </Ln>
          <Ln keys={['bf', 'para']} cls="u-event">
            <p className="event">
              <span data-fs className="ev-when">{RECORD.when}</span>{' '}
              <span data-fs data-kick className="ev-name"><Pin k="para" shape="para" /><span className="ul">{RECORD.name}<Stk k="bf" shape="wave" /></span></span>{' '}
              <span data-fs className="ev-where"><Pin k="para" shape="para" />{RECORD.where}</span>
            </p>
          </Ln>
          <Ln keys={['bf', 'col']} cls="u-results">
            <div className="results">
              {RECORD.results.map((r, i) => (
                <div key={r.who} className="res" data-kick>
                  {i > 0 && <Pin k="col" shape="cols" />}
                  <span data-fs className="who"><span className="ul">{r.who}<Stk k="bf" shape="wave" /></span></span>{' '}
                  <span data-fs className="what">{r.what}</span>{' '}
                  <span data-fs className="more">{r.more}</span>{' '}
                </div>
              ))}
            </div>
            <a className="morelink" data-fs href={RECORD.more.href}>{RECORD.more.label}</a>
          </Ln>
        </section>

        <section id="drive" className="sec" aria-labelledby="h-drive">
          <Ln keys={['disp']} cls="u-title">
            <h2 id="h-drive" data-fs className="title"><span className="ul">{DRIVE.title}<Stk k="disp" shape="ellipse" /></span></h2>
          </Ln>
          <Ln keys={['ital']} cls="u-rule">
            <p data-fs className="rule"><span className="ul">{DRIVE.lead}<Stk k="ital" shape="under" /></span></p>
          </Ln>
          <Ln keys={['list']} cls="u-list">
            <Stk k="list" shape="bracket" cls="lbr" />
            <dl className="dlist">
              {DRIVE.items.map((d) => (
                <div key={d.term} className="di" data-kick>
                  <dt data-fs className="term">{d.term}</dt>{' '}
                  <dd data-fs className="dtext">{d.text}</dd>{' '}
                </div>
              ))}
            </dl>
            <a className="morelink" data-fs href={DRIVE.more.href}>{DRIVE.more.label}</a>
          </Ln>
        </section>

        <section id="people" className="sec" aria-labelledby="h-people">
          <Ln keys={['disp']} cls="u-title">
            <h2 id="h-people" data-fs className="title"><span className="ul">{PEOPLE.title}<Stk k="disp" shape="ellipse" /></span></h2>
          </Ln>
          <Ln keys={['bf', 'ital', 'col']} cls="u-coaches">
            <div className="coaches">
              {PEOPLE.coaches.map((c, i) => (
                <div key={c.name} className="coach" data-kick>
                  {i > 0 && <Pin k="col" shape="cols" />}
                  <h3 data-fs className="cname"><span className="ul">{c.name}<Stk k="bf" shape="wave" /></span></h3>{' '}
                  <p data-fs className="crole"><span className="ul">{c.role}<Stk k="ital" shape="under" /></span></p>{' '}
                  <p data-fs className="cbio">{c.bio}</p>
                </div>
              ))}
            </div>
          </Ln>
          <Ln keys={['disp']} cls="u-count">
            <p data-fs className="count"><span className="ul">{PEOPLE.count}<Stk k="disp" shape="ellipse" /></span></p>
            <a className="morelink" data-fs href={PEOPLE.more.href}>{PEOPLE.more.label}</a>
          </Ln>
        </section>

        <section id="join" className="sec" aria-labelledby="h-join">
          <Ln keys={['disp']} cls="u-title">
            <h2 id="h-join" data-fs className="title"><span className="ul">{JOIN.title}<Stk k="disp" shape="ellipse" /></span></h2>
          </Ln>
          <Ln keys={['ital']} cls="u-rule">
            <p data-fs className="rule"><span className="ul">{JOIN.lead}<Stk k="ital" shape="under" /></span></p>
          </Ln>
          <Ln keys={['col', 'bf']} cls="u-paths">
            <div className="paths">
              {JOIN.paths.map((p, i) => (
                <article key={p.id} className="path" data-kick aria-labelledby={`h-${p.id}`}>
                  {i > 0 && <Pin k="col" shape="cols" />}
                  <h3 id={`h-${p.id}`} data-fs className="pname"><a href={p.href}><span className="ul">{p.name}<Stk k="bf" shape="wave" /></span></a></h3>{' '}
                  <p data-fs className="pline">{p.line}</p>{' '}
                  {p.text.map((t) => <p key={t} data-fs className="ptext">{t} </p>)}{' '}
                </article>
              ))}
            </div>
          </Ln>
          <Ln keys={['para']} cls="u-also">
            <p className="also">
              <span data-fs className="al">{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></span>{' '}
              <span data-fs className="al"><Pin k="para" shape="para" />{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></span>{' '}
              <span data-fs className="al"><Pin k="para" shape="para" />{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></span>{' '}
              <span data-fs className="al"><Pin k="para" shape="para" />{JOIN.discord}</span>
            </p>
          </Ln>
        </section>
      </main>

      <footer className="foot">
        <div className="ln u-foot">
          <div className="mg" />
          <div className="tx">
            <p className="fline">{FOOTER.line}</p>
            <div className="frow">
              <ul className="flinks" aria-label="Elsewhere">
                {FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
              </ul>
              <ul className="flinks" aria-label="Pages">
                {FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
              </ul>
            </div>
            <button type="button" className="again">Pull a fresh proof</button>
            <p className="draft">Draft 2, version {meta.n}. Not the live site.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
