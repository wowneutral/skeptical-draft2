// The complete flow: every word of the site, laid out as a flow sheet, with the
// visitor's own round marked on it. It never depends on the game having been played.
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, SITE } from '@/content';
import { cn } from '@/lib/utils';
import { WAVES, TOTAL, type Marks } from './data';
import { A, Arrow, Folder, Mk } from './parts';

const pad = (n: number) => String(n).padStart(2, '0');

const Ctx = createContext<{ marks: Marks; played: boolean }>({ marks: {}, played: false });

function Row({ id, as: Tag = 'div', className, children }: { id: string; as?: 'div' | 'li' | 'p'; className?: string; children: ReactNode }) {
  const m = useContext(Ctx).marks[id];
  return <Tag className={cn('row', className)} data-mark={m}>{m && <Mk m={m} />}{children}</Tag>;
}

function Band({ i, id, children }: { i: number; id?: string; children: ReactNode }) {
  const { marks, played } = useContext(Ctx);
  const w = WAVES[i], got = w.items.filter((it) => marks[it.id] === 'caught').length, lost = w.items.filter((it) => marks[it.id] === 'dropped').length;
  return (
    <section className={cn('band', `band-${w.id}`)} id={id} aria-labelledby={`h-${w.id}`}>
      <div className="rail">
        <span className="num" aria-hidden="true">{pad(i + 1)}</span>
        <h3 id={`h-${w.id}`}>{w.title}</h3>
        {played && <p className="tally"><span className="t-ok">{got} of {w.items.length} extended</span>{lost > 0 && <span className="t-no">{lost} dropped</span>}</p>}
      </div>
      <div className="body">{children}</div>
    </section>
  );
}

export function FlowSheet({ marks, played, over }: { marks: Marks; played: boolean; over: boolean }) {
  const count = (m: string) => Object.values(marks).filter((v) => v === m).length;
  const caught = count('caught'), dropped = count('dropped'), unreached = count('unreached');
  const ctx = useMemo(() => ({ marks, played }), [marks, played]);

  return (
    <Ctx.Provider value={ctx}>
    <section className="sheet" id="flow" aria-labelledby="flow-h">
      <header className="sheet-head">
        <p className="k">Skeptical. The flow, complete.</p>
        <h2 id="flow-h">The whole flow.</h2>
        {played
          ? <p className="sum"><b className="t-ok">{caught} extended.</b> {dropped > 0 && <b className="t-no">{dropped} dropped. </b>}{unreached > 0 && <span>{unreached} not reached. </span>}{over ? 'All of it is here.' : `${TOTAL - caught - dropped} still to fall.`}</p>
          : <p className="sum">Unplayed. Every line is here anyway.</p>}
        {/* the round at a glance: one cell for every argument, wave by wave */}
        <div className="tape" role="img" aria-label={played ? `Your round: ${caught} extended, ${dropped} dropped, ${TOTAL - caught - dropped} not caught, out of ${TOTAL}.` : `${TOTAL} arguments in six waves. None played yet.`}>
          {WAVES.map((w, i) => (
            <div className="tape-w" key={w.id}>
              <span className="tape-n">{pad(i + 1)}</span>
              <span className="tape-c">{w.items.map((it) => <i key={it.id} data-mark={marks[it.id]} />)}</span>
            </div>
          ))}
          <ul className="tape-key">
            <li><i data-mark="caught" />Extended</li>
            <li><i data-mark="dropped" />Dropped</li>
            <li><i data-mark="unreached" />Not reached</li>
            <li><i />Not played</li>
          </ul>
        </div>
      </header>

      <Band i={0}>
        <div className="pitch">
          {HERO.pitch.map((l, i) => <Row as="p" id={`pitch-${i}`} key={l} className="huge">{l}</Row>)}
        </div>
        <ul className="stmt">
          {HERO.statement.map((l, i) => <Row as="li" id={`stmt-${i}`} key={l}><span>{l}</span></Row>)}
        </ul>
        <div className="doors">
          {HERO.doors.map((d, i) => <Row id={`door-${i}`} key={d.href}><A className="door" href={d.href}><span>{d.label}</span><Arrow /></A></Row>)}
        </div>
      </Band>

      <Band i={1}>
        <ol className="lines">
          {MANIFESTO.map((l, i) => <Row as="li" id={`line-${i}`} key={l}><span className="n" aria-hidden="true">{i + 1}.</span><span>{l}</span></Row>)}
        </ol>
      </Band>

      <Band i={2} id="record">
        <Row as="p" id="rule" className="lead">{RECORD.rule}</Row>
        <Row id="event" className="event">
          <p className="ev-name">{RECORD.name}</p>
          <p className="ev-meta"><span>{RECORD.when}</span><span>{RECORD.where}</span></p>
        </Row>
        <ul className="results">
          {RECORD.results.map((r, i) => (
            <Row as="li" id={`result-${i}`} key={r.who}>
              <p className="who">{r.who}</p>
              <p className="what">{r.what}</p>
              <p className="more">{r.more}</p>
            </Row>
          ))}
        </ul>
        <p className="out"><A className="go" href={RECORD.more.href}>{RECORD.more.label}<Arrow /></A></p>
      </Band>

      <Band i={3} id="drive">
        <Row as="p" id="drive-lead" className="lead">{DRIVE.lead}</Row>
        <ul className="folders">
          {DRIVE.items.map((d, i) => (
            <Row as="li" id={`folder-${i}`} key={d.term}>
              <Folder />
              <p className="term"><span aria-hidden="true">{pad(i + 1)}</span>{d.term}</p>
              <p className="desc">{d.text}</p>
            </Row>
          ))}
        </ul>
        <p className="out"><A className="go" href={DRIVE.more.href}>{DRIVE.more.label}<Arrow /></A></p>
      </Band>

      <Band i={4} id="people">
        <ul className="coaches">
          {PEOPLE.coaches.map((c, i) => (
            <Row as="li" id={`coach-${i}`} key={c.name}>
              <p className="who">{c.name}</p>
              <p className="what">{c.role}</p>
              <p className="more">{c.bio}</p>
            </Row>
          ))}
        </ul>
        <Row as="p" id="count" className="lead">{PEOPLE.count}</Row>
        <p className="out"><A className="go" href={PEOPLE.more.href}>{PEOPLE.more.label}<Arrow /></A></p>
      </Band>

      <Band i={5} id="join">
        <Row as="p" id="join-lead" className="lead">{JOIN.lead}</Row>
        <ol className="ways">
          {JOIN.paths.map((p, i) => (
            <li key={p.id}>
              <Row id={`path-${p.id}`} className="way-head">
                <span className="n" aria-hidden="true">{pad(i + 1)}</span>
                <A className="way" href={p.href}><span className="name">{p.name}</span><Arrow /></A>
                <p className="what">{p.line}</p>
              </Row>
              <ul>
                {p.text.map((t, k) => <Row as="li" id={`sub-${p.id}-${k}`} key={t}><span>{t}</span></Row>)}
              </ul>
            </li>
          ))}
        </ol>
        <div className="after">
          <Row as="p" id="join-discord">{JOIN.discord}</Row>
          <Row as="p" id="join-also"><span>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></span></Row>
          <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
        </div>
      </Band>
    </section>
    </Ctx.Provider>
  );
}
