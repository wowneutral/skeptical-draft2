// The tables turn. The page asks one question; the three ways to join are the visitor's answers.
import { useRef } from 'react';
import { SITE, HERO, JOIN } from '@/content';
import { gsap, useGSAP } from '@/lib/scroll';
import { cn, still } from '@/lib/utils';
import { FALLBACK, type Link } from './bank';
import { Gutter, Out, Q, Rule, heat } from './parts';

const door = (id: string): Link => {
  const p = JOIN.paths.find((x) => x.id === id)!;
  return HERO.doors.find((d) => d.href === p.href) ?? { label: p.line, href: p.href };
};

export function Turn({ picked, toggle }: { picked: string[]; toggle: (id: string) => void }) {
  const chosen = JOIN.paths.filter((p) => picked.includes(p.id));
  const root = useRef<HTMLElement>(null);
  const first = useRef(true);
  // Each answer the visitor gives is entered with a thump.
  useGSAP(() => {
    if (first.current) { first.current = false; return; }
    if (still) return;
    gsap.fromTo(root.current!.querySelectorAll('.show .names, .show .outs'), { opacity: 0, scale: 1.12, y: -10 }, { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: 'back.out(2.2)', stagger: 0.07, transformOrigin: '0 80%' });
  }, { scope: root, dependencies: [picked.join()] });
  return (
    <section className="turn" id="join" tabIndex={-1} ref={root} style={heat(1)} data-beat data-h="0.8">
      <Gutter />
      <h2 className="cap"><span>{JOIN.title}</span></h2>
      <Q className="q-turn">What do you want to do?</Q>
      <Rule />
      <p className="lead" data-a>{JOIN.lead}</p>

      <ul className="ways">
        {JOIN.paths.map((p) => {
          const on = picked.includes(p.id);
          return (
            <li className={cn('way', on && 'is-on')} key={p.id} data-land>
              <button type="button" aria-pressed={on} onClick={() => toggle(p.id)}>
                <span className="mk">A.</span>
                <span className="nm">{p.name}</span>
                <span className="rep say-it">{on ? 'On the record' : 'Put it on the record'}</span>
              </button>
              <div className="wb">
                <Out href={p.href} className="wl">{p.line}</Out>
                {p.text.map((t) => <p key={t}>{t}</p>)}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="show" role="status" data-land>
        <p className="rep">Let the record show:</p>
        {chosen.length ? (
          <>
            <p className="names">{chosen.map((p) => <span key={p.id}>{p.name}</span>)}</p>
            <p className="outs">{chosen.map((p) => { const d = door(p.id); return <Out key={p.id} href={d.href}>{d.label}</Out>; })}</p>
          </>
        ) : (
          <p className="names is-none">{FALLBACK.lines[0].t}</p>
        )}
      </div>

      <div className="fine" data-land>
        <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
        <p>{JOIN.discord}</p>
        <p>{JOIN.already.before}<a href={JOIN.already.href} rel="noopener">{JOIN.already.label}</a></p>
        <p>{JOIN.coach.before}<a href={JOIN.coach.href} rel="noopener">{JOIN.coach.label}</a></p>
      </div>
    </section>
  );
}
