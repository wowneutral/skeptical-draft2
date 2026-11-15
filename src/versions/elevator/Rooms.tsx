// The rooms you see when the doors open. Each is a real section of the page:
// in the lift they are placed beyond the doorway in 3D; without it they stack.
import type { ReactNode } from 'react';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';

const A = ({ href, className, children, label }: { href: string; className?: string; children: ReactNode; label?: string }) => (
  <a className={className} href={href} aria-label={label} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** A floor plate on the wall of each landing. */
const Plate = ({ n, children }: { n: string; children: ReactNode }) => (
  <p className="landing"><span className="n" aria-hidden="true">{n}</span><span>{children}</span></p>
);

function Room({ id, cls, label, children, bg }: { id: string; cls: string; label: string; children: ReactNode; bg?: ReactNode }) {
  return (
    <section className={`room ${cls}`} id={id} aria-label={label}>
      <div className="bg" aria-hidden="true">{bg}</div>
      <div className="win"><div className="scroll">{children}</div></div>
    </section>
  );
}

export function Lobby() {
  return (
    <Room id="lobby" cls="r-lobby" label="Lobby" bg={<><i className="lamp l1" /><i className="lamp l2" /><i className="floorline" /></>}>
      <Plate n="L">Lobby</Plate>
      <h1 className="pitch"><span>{HERO.pitch[0]}</span> <em>{HERO.pitch[1]}</em></h1>
      <div className="low">
        <p className="statement">{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
        <ul className="two" aria-label="Two ways in">
          {HERO.doors.map((d) => (
            <li key={d.href}>
              <A className="dr" href={d.href}>
                <span className="frame" aria-hidden="true"><span className="leaf"><span className="pane" /><span className="push" /></span></span>
                <span className="lbl">{d.label}</span>
              </A>
            </li>
          ))}
        </ul>
      </div>
    </Room>
  );
}

export function Line() {
  return (
    <Room id="line" cls="r-line" label="How the team works" bg={<><i className="tube t1" /><i className="tube t2" /><i className="floorline" /></>}>
      <Plate n="2">How it works</Plate>
      <ol className="lines">
        {MANIFESTO.map((m, i) => <li key={m}><span className="k" aria-hidden="true">{i + 1}</span><p>{m}</p></li>)}
      </ol>
    </Room>
  );
}

export function Record() {
  return (
    <Room id="record" cls="r-record" label={RECORD.title} bg={<><i className="cone" /><i className="floorline" /></>}>
      <Plate n="3">The record</Plate>
      <div className="plaque">
        <h2 className="title">{RECORD.title}</h2>
        <p className="rule">{RECORD.rule}</p>
        <p className="event"><b>{RECORD.when}</b><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
        <ul className="results">
          {RECORD.results.map((r) => (
            <li key={r.who}><h3>{r.what}</h3><p><b>{r.who}</b> {r.more}</p></li>
          ))}
        </ul>
      </div>
      <p className="out"><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
    </Room>
  );
}

export function People() {
  return (
    <Room id="people" cls="r-people" label={PEOPLE.title} bg={<><i className="lamp l1" /><i className="floorline" /></>}>
      <Plate n="4">The people</Plate>
      <h2 className="title">{PEOPLE.title}</h2>
      <ul className="offices">
        {PEOPLE.coaches.map((c) => (
          <li key={c.name}>
            <div className="office" aria-hidden="true"><span className="glass"><b>{c.name}</b><i>{c.role}</i></span><span className="knob" /></div>
            <h3>{c.name}</h3>
            <p><b>{c.role}.</b> {c.bio}</p>
          </li>
        ))}
      </ul>
      <p className="count">{PEOPLE.count}</p>
      <p className="out"><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
    </Room>
  );
}

export function Join({ n }: { n: number }) {
  return (
    <Room id="join" cls="r-join" label={JOIN.title} bg={<><i className="sun" /><i className="cloud c1" /><i className="cloud c2" /><i className="parapet" /></>}>
      <Plate n="5">The roof</Plate>
      <h2 className="title">{JOIN.title}</h2>
      <p className="lead">{JOIN.lead}</p>
      <ol className="ways">
        {JOIN.paths.map((p) => (
          <li key={p.id} className={`way w-${p.id}`}>
            <A className="dr" href={p.href} label={`${p.name}. ${p.line}`}>
              <span className="frame" aria-hidden="true"><span className="sky" /><span className="leaf"><span className="pane" /><span className="push" /></span></span>
              <span className="name">{p.name}</span>
              <span className="what">{p.line}</span>
            </A>
            <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
          </li>
        ))}
      </ol>
      <div className="after">
        <p>{JOIN.discord}</p>
        <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
        <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
      </div>
      <footer className="foot">
        <p className="last">{FOOTER.line}</p>
        <ul>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <ul>{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <small>Draft 2, version {n}. Not the live site.</small>
      </footer>
    </Room>
  );
}

/** The basement through a hand's width: nothing. */
export function Dark() {
  return <div className="room r-dark" aria-hidden="true"><div className="bg"><i className="bulb" /></div></div>;
}

/** The shaft between floors, seen through the letters. */
export function ShaftView() {
  return (
    <div className="shaftv" aria-hidden="true">
      <div className="strip">
        {['B', 'L', '2', '3', '4', '5'].map((l, i) => <span key={l} className="land" style={{ ['--i' as string]: i }}><b>{l}</b></span>)}
      </div>
      <i className="cable c1" /><i className="cable c2" /><i className="rail r1" /><i className="rail r2" />
    </div>
  );
}

/** The directory plate in the basement. */
export function DrivePlate({ onFocus }: { onFocus?: () => void }) {
  return (
    <section className="dplate" id="drive" aria-label={DRIVE.title} onFocus={onFocus}>
      <div className="screws" aria-hidden="true"><i /><i /><i /><i /></div>
      <p className="landing"><span className="n" aria-hidden="true">B</span><span>Basement. Key only</span></p>
      <h2 className="title">{DRIVE.title}</h2>
      <p className="lead">{DRIVE.lead}</p>
      <dl className="dir">
        {DRIVE.items.map((d) => <div key={d.term}><dt>{d.term}</dt><dd>{d.text}</dd></div>)}
      </dl>
      <p className="out"><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
    </section>
  );
}
