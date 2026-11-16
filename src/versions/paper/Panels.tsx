// What is printed on the sheet. Every word comes from content.ts.
import { DRIVE, HERO, JOIN, MANIFESTO, PEOPLE, RECORD, SITE } from '@/content';
import MARKS from '@/lib/marks.json';

export const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

const Arrow = () => (
  <svg className="arr" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
);

/** The brand's Bodoni question mark. */
export const Mark = ({ className }: { className?: string }) => {
  const m = MARKS.italic as { d: string; w: number; h: number };
  return (
    <svg className={className} viewBox={`-480 -780 ${m.w + 20} ${m.h + 20}`} aria-hidden="true" preserveAspectRatio="xMaxYMid meet">
      <path d={m.d} />
    </svg>
  );
};

const Folio = ({ n }: { n: string }) => <span className="folio" aria-hidden="true">{n}</span>;

/** The outside of the folded leaflet: what you see before you open it. */
export function Cover() {
  return (
    <div className="pc cover">
      <p className="mast" aria-hidden="true">{SITE.name}<i>?</i></p>
      <Mark className="bigq" />
      <h1 className="pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</h1>
      <p className="statement">{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
      <p className="doors">{HERO.doors.map((d) => <A key={d.href} href={d.href}>{d.label}<Arrow /></A>)}</p>
    </div>
  );
}

/** Panel one inside: the masthead of the poster and the first two lines. */
export function Masthead() {
  return (
    <section className="pc masthead" aria-label="How the team works">
      <p className="word" aria-hidden="true">{SITE.name}<i>?</i></p>
      <p className="echo" aria-hidden="true">{HERO.pitch.join(' ')}</p>
      <ol className="mani" start={1}>
        <li>{MANIFESTO[0]}</li>
        <li>{MANIFESTO[1]}</li>
      </ol>
      <Folio n="1" />
    </section>
  );
}

export function Manifesto() {
  return (
    <section className="pc mani2" aria-label="How the prep works">
      <ol className="mani" start={3}>
        <li>{MANIFESTO[2]}</li>
        <li className="pos">{MANIFESTO[3]}</li>
      </ol>
      <Mark className="smallq" />
      <Folio n="2" />
    </section>
  );
}

export function Record() {
  return (
    <section className="pc record" aria-labelledby="pp-record">
      <h2 id="pp-record">{RECORD.title}</h2>
      <p className="rule">{RECORD.rule}</p>
      <p className="event"><b>{RECORD.when}</b><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
      <ul className="results">
        {RECORD.results.map((r) => (
          <li key={r.who}><h3>{r.what}</h3><p><b>{r.who}</b> {r.more}</p></li>
        ))}
      </ul>
      <A className="more" href={RECORD.more.href}>{RECORD.more.label}<Arrow /></A>
      <Folio n="3" />
    </section>
  );
}

export function Drive() {
  return (
    <section className="pc drive" aria-labelledby="pp-drive">
      <h2 id="pp-drive">{DRIVE.title}</h2>
      <p className="lead">{DRIVE.lead}</p>
      <dl>
        {DRIVE.items.map((it) => (
          <div key={it.term}><dt>{it.term}</dt><dd>{it.text}</dd></div>
        ))}
      </dl>
      <A className="more" href={DRIVE.more.href}>{DRIVE.more.label}<Arrow /></A>
      <Folio n="4" />
    </section>
  );
}

export function People() {
  return (
    <section className="pc people" aria-labelledby="pp-people">
      <h2 id="pp-people">{PEOPLE.title}</h2>
      <ul className="coaches">
        {PEOPLE.coaches.map((c) => (
          <li key={c.name}><h3>{c.name}</h3><p className="role">{c.role}</p><p>{c.bio}</p></li>
        ))}
      </ul>
      <p className="count">{PEOPLE.count}</p>
      <A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}<Arrow /></A>
      <Folio n="5" />
    </section>
  );
}

export function Join() {
  return (
    <section className="pc join" aria-labelledby="pp-join">
      <h2 id="pp-join">{JOIN.title}</h2>
      <p className="lead">{JOIN.lead}</p>
      <p className="disc">{JOIN.discord}</p>
      <p className="small">{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
      <p className="small">{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
      <p className="small also">{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
      <p className="down" aria-hidden="true">Three ways in, below.</p>
      <Folio n="6" />
    </section>
  );
}

export function Way({ i }: { i: number }) {
  const p = JOIN.paths[i];
  return (
    <section className={`pc way way-${p.id}`} aria-labelledby={`pp-${p.id}`}>
      <p className="num" aria-hidden="true">{['i', 'ii', 'iii'][i]}</p>
      <h3 id={`pp-${p.id}`} className="wname"><A href={p.href}>{p.name}<Arrow /></A></h3>
      <p className="wline">{p.line}</p>
      <ul className="wtext">{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
      <Folio n={String(7 + i)} />
    </section>
  );
}

/** The nine faces in the order the sheet opens. */
export const FACES = [
  () => <Masthead />, () => <Manifesto />, () => <Record />, () => <Drive />, () => <People />, () => <Join />,
  () => <Way i={0} />, () => <Way i={1} />, () => <Way i={2} />,
];
