import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/schibsted-grotesk/index.css';
import './hole.css';
import { useVersion } from '@/lib/version';
import { DRIVE, FOOTER, HERO, JOIN, MANIFESTO, NAV, PEOPLE, RECORD, SITE } from '@/content';
import meta from './meta';
import { Turn, type Cut } from './Turn';
import { Plate } from './Plate';

const CUTS: Record<string, Cut> = {
  q: { g: 'q', field: 'left', desk: { k: 1.36, x: 0.5, at: 'l', cy: 0.5 }, phone: { k: 0.64, x: 0.6, at: 'c', cy: 0.2 } },
  R: { g: 'R', field: 'right', desk: { k: 1.18, x: 0.55, at: 'r', cy: 0.5 }, phone: { k: 0.48, x: 0.5, at: 'c', cy: 0.27 } },
  D: { g: 'D', field: 'left', desk: { k: 1.18, x: 0.47, at: 'l', cy: 0.5 }, phone: { k: 0.48, x: 0.52, at: 'c', cy: 0.27 } },
  P: { g: 'P', field: 'right', desk: { k: 1.22, x: 0.54, at: 'r', cy: 0.47 }, phone: { k: 0.5, x: 0.5, at: 'c', cy: 0.26 } },
  J: { g: 'J', field: 'left', desk: { k: 1.16, x: 0.5, at: 'l', cy: 0.42 }, phone: { k: 0.5, x: 0.52, at: 'c', cy: 0.24 } },
  dot: { g: 'dot', field: 'left', desk: { k: 0.66, x: 0.69, at: 'c', cy: 0.5 }, phone: { k: 0.3, x: 0.58, at: 'c', cy: 0.25 } },
};

/** A title spread: the word you saw a slice of through the cut, now the whole page. */
function Title({ text, copy, vid }: { text: string; copy: boolean; vid?: string }) {
  const [a, ...b] = text.split(' ');
  const H = copy ? 'p' : 'h2';
  return (
    <div className="h-spread h-titled">
      <H className="h-title" id={copy ? undefined : vid}>
        {b.length ? <><span>{a}</span> <span>{b.join(' ')}</span></> : <span>{a}</span>}
      </H>
    </div>
  );
}

export default function Hole() {
  useVersion('hole');
  const [door1, door2] = HERO.doors;

  return (
    <div className="v-hole">
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main">
        {/* Sheet one: black, cut with the question mark. */}
        <Turn
          id="manifesto"
          first
          tone="dark"
          under="light"
          cut={CUTS.q}
          label="Turn the page"
          print={
            <>
              <nav className="h-nav" aria-label="Sections">
                {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
              </nav>
              <h1 className="h-mark">{SITE.name}<span className="sr-only-x">: an independent Lincoln-Douglas debate team</span></h1>
              <p className="h-pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
              <p className="h-state">{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>
              <div className="h-doors">
                <a href={door1.href}>{door1.label}</a>
                <a href={door2.href}>{door2.label}</a>
              </div>
              <p className="h-hint">Scroll to turn the sheet, or drag its corner.</p>
            </>
          }
          spread={(copy) => (
            <div className="h-spread h-mani">
              {copy ? <p className="h-mani-big">{MANIFESTO[0]}</p> : <><h2 className="sr-only-x">What we are</h2><p className="h-mani-big">{MANIFESTO[0]}</p></>}
            </div>
          )}
        />
        <section className="h-rest h-light h-mani-rest" aria-label="What we are, continued">
          <p className="h-m2">{MANIFESTO[1]}</p>
          <p className="h-m3">{MANIFESTO[2]}</p>
        </section>

        {/* Bone sheet cut with R: the record shows through. */}
        <Turn
          id="record"
          tone="light"
          under="dark"
          cut={CUTS.R}
          label="Turn to the record"
          print={<p className="h-leafline h-it">{MANIFESTO[3]}</p>}
          spread={(copy) => <Title text={RECORD.title} copy={copy} vid="t-record" />}
        />
        <section className="h-rest h-dark h-record" aria-labelledby="t-record">
          <p className="h-rule">{RECORD.rule}</p>
          <p className="h-event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
          <ol className="h-results">
            {RECORD.results.map((r) => (
              <li key={r.who}>
                <span className="h-who">{r.who}</span>
                <span className="h-what">{r.what}</span>
                <span className="h-more">{r.more}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Black sheet cut with D. */}
        <Turn
          id="drive"
          tone="dark"
          under="light"
          cut={CUTS.D}
          label="Turn to the drive"
          print={<a className="h-leaflink" href={RECORD.more.href}>{RECORD.more.label}</a>}
          spread={(copy) => <Title text={DRIVE.title} copy={copy} vid="t-drive" />}
        />
        <section className="h-rest h-light h-drive" aria-labelledby="t-drive">
          <p className="h-lead">{DRIVE.lead}</p>
          <dl className="h-items">
            {DRIVE.items.map((d) => (
              <div key={d.term} className="h-item">
                <dt>{d.term}</dt>
                <dd>{d.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Bone sheet cut with P. */}
        <Turn
          id="people"
          tone="light"
          under="dark"
          cut={CUTS.P}
          label="Turn to the people"
          print={<a className="h-leaflink" href={DRIVE.more.href}>{DRIVE.more.label}</a>}
          spread={(copy) => <Title text={PEOPLE.title} copy={copy} vid="t-people" />}
        />
        <section className="h-rest h-dark h-people" aria-labelledby="t-people">
          {PEOPLE.coaches.map((c) => (
            <article key={c.name} className="h-coach">
              <h3>{c.name.split(' ').map((w) => <span key={w}>{w}</span>)}</h3>
              <p className="h-role">{c.role}</p>
              <p className="h-bio">{c.bio}</p>
            </article>
          ))}
        </section>

        {/* Black sheet cut with J. */}
        <Turn
          id="join"
          tone="dark"
          under="light"
          cut={CUTS.J}
          label="Turn to join"
          print={
            <>
              <p className="h-count">{PEOPLE.count}</p>
              <a className="h-leaflink" href={PEOPLE.more.href}>{PEOPLE.more.label}</a>
            </>
          }
          spread={(copy) => <Title text={JOIN.title} copy={copy} vid="t-join" />}
        />
        <section className="h-rest h-light h-join" aria-labelledby="t-join">
          <p className="h-lead">{JOIN.lead}</p>
          <div className="h-paths">
            {JOIN.paths.map((p) => (
              <article key={p.id} className="h-path">
                <h3>{p.name}</h3>
                <p className="h-pline">{p.line}</p>
                <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                <a className="h-apply" href={p.href}>{p.name}: apply</a>
              </article>
            ))}
          </div>
          <p className="h-small">
            {JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a>
            <span className="h-gap" />
            {JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a>
          </p>
        </section>

        {/* Join's sheet is cut with its own full stop; the footer is underneath. */}
        <Turn
          id="end"
          tone="light"
          under="dark"
          cut={CUTS.dot}
          label="Turn to the last page"
          print={
            <>
              <p className="h-leafline">{JOIN.also}</p>
              <a className="h-leaflink h-mail" href={`mailto:${SITE.email}`}>{SITE.email}</a>
              <p className="h-note">{JOIN.discord}</p>
            </>
          }
          spread={() => (
            <div className="h-spread h-foot-spread">
              <p className="h-foot-line">{FOOTER.line}</p>
            </div>
          )}
        />
        <footer className="h-rest h-dark h-foot">
          <div className="h-foot-text">
          <ul className="h-links">
            {FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
          </ul>
          <ul className="h-pages">
            {FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
          </ul>
          <a className="h-again" href="#main">Back to the first sheet</a>
          <p className="h-draft">Draft 2, version {meta.n}. Not the live site. Set in Bodoni Moda and Schibsted Grotesk.</p>
          </div>
          <Plate><p className="h-plate-word">{HERO.pitch[0]}</p></Plate>
        </footer>
      </main>
    </div>
  );
}
