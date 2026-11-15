// Version 12: no centrepiece and almost no scrolling. Everything the site
// says, as one grid of tiles, with a light that follows the pointer.
import { useRef, type ReactNode } from 'react';
import '@fontsource-variable/schibsted-grotesk';
import '@fontsource/ibm-plex-mono/400.css';
import './bento.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { gsap, useGSAP } from '@/lib/scroll';
import { coarse, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import CountUp from '@/components/bits/CountUp';

const A = ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>;

export default function Bento() {
  useVersion('bento');
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = root.current!;
    const tiles = gsap.utils.toArray<HTMLElement>('.tile', el);
    if (!still) gsap.from(tiles, { opacity: 0, y: 34, scale: 0.97, duration: 0.9, ease: 'out', stagger: { each: 0.06, from: 'start' }, delay: 0.75, clearProps: 'transform' });
    if (coarse || still) return;
    // One light for the whole grid: every tile knows where the pointer is relative to itself.
    const move = (e: PointerEvent) => {
      for (const t of tiles) {
        const r = t.getBoundingClientRect();
        t.style.setProperty('--mx', `${e.clientX - r.left}px`); t.style.setProperty('--my', `${e.clientY - r.top}px`);
      }
    };
    el.addEventListener('pointermove', move, { passive: true });
    return () => el.removeEventListener('pointermove', move);
  }, { scope: root });

  // A tile leans a few degrees toward the pointer while it is over it.
  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    if (coarse || still) return;
    const t = e.currentTarget, r = t.getBoundingClientRect();
    gsap.to(t, { rotateY: ((e.clientX - r.left) / r.width - 0.5) * 5, rotateX: -((e.clientY - r.top) / r.height - 0.5) * 5, duration: 0.5, ease: 'power2.out', transformPerspective: 900 });
  };
  const flat = (e: React.PointerEvent<HTMLElement>) => gsap.to(e.currentTarget, { rotateX: 0, rotateY: 0, duration: 0.7, ease: 'power3.out' });
  const T = ({ area, className = '', children, label }: { area: string; className?: string; children: ReactNode; label?: string }) => (
    <section className={`tile ${className}`} style={{ gridArea: area }} onPointerMove={tilt} onPointerLeave={flat} aria-label={label}>{children}</section>
  );

  return (
    <div className="vn" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top">
        <a className="mark" href="#main" aria-label="Skeptical">skeptical</a>
        <p>{FOOTER.line}</p>
      </header>
      <main id="main" className="grid">
        <T area="a" className="pitch">
          <h1 aria-label={SITE.heading}>{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</h1>
          <p className="lede">{HERO.statement.join(' ')}</p>
          <p className="doors">{HERO.doors.map((d, i) => <A key={d.href} href={d.href} className={i ? 'btn alt' : 'btn'}>{d.label}</A>)}</p>
        </T>
        <T area="b" className="num" label="Eight debaters">
          <p className="n"><CountUp to={8} from={0} duration={1.4} delay={0.9} /></p>
          <p className="cap">debaters right now</p>
        </T>
        <T area="c" className="num" label="Two coaches">
          <p className="n"><CountUp to={2} from={0} duration={1.1} delay={1.1} /></p>
          <p className="cap">coaches, both still competing</p>
        </T>
        <T area="d" className="free">
          <p className="n">Free.</p>
          <p className="cap">{MANIFESTO[0]}</p>
        </T>
        <T area="e" className="list" label={RECORD.title}>
            <h2>{RECORD.title}</h2>
            <p className="cap">{RECORD.when}. {RECORD.name}, {RECORD.where}.</p>
            <div className="pair">{RECORD.results.map((r) => <p key={r.who}><b>{r.what}</b><span>{r.who} {r.more}</span></p>)}</div>
            <A href={RECORD.more.href} className="go">{RECORD.more.label}</A>
        </T>
        <T area="f" className="drive" label={DRIVE.title}>
          <h2>{DRIVE.title}</h2>
          <p className="cap">{DRIVE.lead}</p>
          <ul>{DRIVE.items.map((d) => <li key={d.term} title={d.text}><b>{d.term}</b><span>{d.text}</span></li>)}</ul>
          <A href={DRIVE.more.href} className="go">{DRIVE.more.label}</A>
        </T>
        <T area="g" className="people" label={PEOPLE.title}>
          <h2>{PEOPLE.title}</h2>
          {PEOPLE.coaches.map((c) => <p key={c.name}><b>{c.name}</b><span>{c.role}</span></p>)}
          <A href={PEOPLE.more.href} className="go">{PEOPLE.more.label}</A>
        </T>
        <T area="h" className="join" label={JOIN.title}>
          <h2>{JOIN.title}</h2>
          <p className="cap">{JOIN.lead}</p>
          <div className="ways">{JOIN.paths.map((p) => <a key={p.id} href={p.href} rel="noopener"><b>{p.name}</b><span>{p.line}</span></a>)}</div>
        </T>
        <T area="i" className="quote">
          <p>{MANIFESTO[3]}</p>
        </T>
      </main>
      <footer>
        <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>. {JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
        <ul>{[...FOOTER.links.slice(0, 4), ...FOOTER.pages].map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <small>Draft 2, version 12. Not the live site.</small>
      </footer>
    </div>
  );
}
