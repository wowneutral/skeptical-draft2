// "Your witness." The visitor asks; the witness answers out of the bank; the reporter keeps the transcript.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, useGSAP } from '@/lib/scroll';
import { clamp, cn, coarse, lerp, still } from '@/lib/utils';
import { BUTTONS, type Topic } from './bank';
import { AnswerLine, Gutter, Links, Out, heat } from './parts';
import { stand } from './stand';

const Witness = lazy(() => import('./Witness'));
const hasGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };

export type Entry = { id: number; q: string; topic: Topic | null; again: boolean };

const PLACEHOLDER = 'Ask it.';

export function Ask({ log, over, onAsk, onEnd, onReopen, input }: {
  log: Entry[]; over: boolean; onAsk: (q: string) => void; onEnd: () => void; onReopen: () => void; input: RefObject<HTMLTextAreaElement | null>;
}) {
  const root = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState('');
  const [copied, setCopied] = useState(false);
  const recall = useRef(-1);
  const asked = log.filter((e) => e.topic);
  const last = asked[asked.length - 1];
  const pressure = clamp(asked.length / 10);
  const gl = useMemo(hasGL, []);
  // A question lands: the witness on the stand is knocked round, harder as they pile up.
  useEffect(() => { stand.p = pressure; if (last && !still) stand.kick += 5 + pressure * 16; }, [last?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // The question is set as large as it can be in two lines, and shrinks as it gets longer.
  const fit = useCallback(() => {
    const el = input.current;
    if (!el) return;
    const phone = window.innerWidth <= 820;
    const max = Math.min(window.innerWidth * (phone ? 0.155 : 0.125), window.innerHeight * 0.21);
    let lo = phone ? 30 : 40, hi = max;
    const fits = (px: number) => { el.style.fontSize = `${px}px`; el.style.height = 'auto'; return el.scrollHeight <= px * 1.04 * 2 + px * 0.35; };
    if (!el.value || fits(max)) lo = max;
    else for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
    el.style.fontSize = `${lo.toFixed(1)}px`;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, lo * 1.2)}px`;
  }, [input]);

  useEffect(() => {
    fit();
    document.fonts.ready.then(fit);
    const ro = new ResizeObserver(fit);
    if (input.current?.parentElement) ro.observe(input.current.parentElement);
    return () => ro.disconnect();
  }, [fit, input]);
  useEffect(fit, [value, fit]);

  const submit = (text: string, typed = true) => {
    const q = text.trim().replace(/\s+/g, ' ');
    if (!q) { input.current?.focus(); return; }
    recall.current = -1;
    setValue(q);
    onAsk(q);
    // The question stays up at full size; the next keystroke replaces it.
    if (typed) requestAnimationFrame(() => { if (coarse) input.current?.blur(); else input.current?.select(); });
  };
  // The transcript as plain text, for sending to someone.
  const copy = async () => {
    const text = log.map((e) => [`Q. ${e.q}`, ...(e.topic ? e.topic.lines.map((l, i) => `${i ? '   ' : 'A. '}${[l.tag, l.term, l.t].filter(Boolean).join(' ')}`) : []), ...(e.topic?.links ?? []).map((l) => `   ${l.label} ${l.href}`)].join('\n')).join('\n\n');
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked: nothing to do */ }
  };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); submit(value); };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(value); return; }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const said = log.filter((x) => x.topic).map((x) => x.q);
    if (!said.length) return;
    e.preventDefault();
    const at = recall.current < 0 ? said.length : recall.current;
    recall.current = clamp(at + (e.key === 'ArrowUp' ? -1 : 1), 0, said.length - 1);
    setValue(said[recall.current]);
  };

  // Each new answer: the rule shoots across, the words land one at a time, and they land faster as the questions pile up.
  useGSAP(() => {
    const el = root.current;
    if (!el || !last) return;
    const box = scroller.current;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: still ? 'auto' : 'smooth' });
    ScrollTrigger.refresh();
    if (still) return;
    const speed = lerp(1, 0.42, pressure);
    const tl = gsap.timeline();
    tl.fromTo(el.querySelector('.stage .rule'), { scaleX: 0 }, { scaleX: 1, duration: 0.34 * speed, ease: 'expo.inOut' }, 0);
    tl.from(el.querySelector('.reply .mk'), { opacity: 0, scale: 1.8, duration: 0.2 * speed, ease: 'power4.out' }, 0.22 * speed);
    let t = 0.26 * speed;
    gsap.utils.toArray<HTMLElement>('.reply [data-a]', el).forEach((p) => {
      const words = SplitText.create(p, { type: 'words', aria: 'none' }).words;
      const step = Math.min(0.05, 0.7 / words.length) * speed;
      tl.from(words, { opacity: 0, yPercent: -38, scale: 1.3, transformOrigin: '0% 80%', duration: 0.26 * speed, ease: 'back.out(2.4)', stagger: step }, t);
      t += words.length * step + 0.05 * speed;
    });
    const rest = gsap.utils.toArray<HTMLElement>('.reply [data-land]', el);
    if (rest.length) tl.from(rest, { opacity: 0, y: 12, duration: 0.3, ease: 'power3.out', stagger: 0.05 }, t);
    const row = el.querySelector('.lines > li:last-child');
    if (row) gsap.from(row, { opacity: 0, x: 18, duration: 0.4, ease: 'power3.out' });
  }, { scope: root, dependencies: [last?.id], revertOnUpdate: true });

  const chars = last ? last.topic!.lines.reduce((n, l) => n + l.t.length + (l.term?.length ?? 0), 0) : 0;
  const size = chars <= 64 ? 'xl' : chars <= 150 ? 'lg' : 'md';

  return (
    <section className="ask" id="ask" ref={root} tabIndex={-1} style={heat(pressure)}>
      <Gutter />
      <h2 className="cap"><span>Your witness.</span></h2>
      <div className="ask-in">
        <div className="top">
        <div className="stage">
          <form className={cn('line', over && 'is-shut')} onSubmit={onSubmit}>
            <label className="mk" htmlFor="cx-q">Q.<span className="sr-only-x"> Your question</span></label>
            <span className="field">
              <textarea
                id="cx-q" ref={input} rows={1} value={value} placeholder={PLACEHOLDER} maxLength={80} disabled={over}
                autoComplete="off" autoCapitalize="sentences" spellCheck={false} enterKeyHint="send"
                onChange={(e) => { recall.current = -1; setValue(e.target.value.replace(/\n/g, ' ')); }} onKeyDown={onKey}
                onFocus={(e) => { if (coarse && last && value === last.q) e.currentTarget.select(); }}
              />
              {!value && <i className="blink" aria-hidden="true" />}
            </span>
            <button className="go" type="submit" disabled={over} aria-label="Ask the question"><span>Ask</span><CornerDownLeft aria-hidden="true" strokeWidth={2.4} /></button>
          </form>
          <span className="rule" aria-hidden="true" />
          <div className="reply say a" role="status">
            <span className="mk">A.</span>
            <div className="ab" key={last?.id ?? 0}>
              {!last && <p className="rep wait">The witness is waiting.</p>}
              {last && last.topic!.lines.map((l, i) => <AnswerLine key={i} line={l} size={size} />)}
              {last && <Links links={last.topic!.links} />}
              {last?.again && <p className="rep stamp" data-land>Asked and answered.</p>}
            </div>
          </div>

        </div>
        {gl && (
          <figure className="stand" aria-hidden="true">
            <Suspense fallback={null}><Witness /></Suspense>
            <figcaption className="rep">The witness. Drag to turn it.</figcaption>
          </figure>
        )}
        </div>

        <div className="low">
          <div className="pick">
          {over ? (
            <p className="shut">
              <span className="rep">The cross-examination is closed.</span>
              <button className="reopen" type="button" onClick={onReopen}>Reopen it</button>
            </p>
          ) : (
            <>
              <ul className="asks" aria-label="Questions you can ask">
                {BUTTONS.map((b) => {
                  const done = asked.some((e) => e.topic === b);
                  return <li key={b.id}><button type="button" className={cn(done && 'is-asked')} onClick={() => submit(b.ask!, false)}>{b.ask}{done && <span className="sr-only-x"> (asked)</span>}</button></li>;
                })}
              </ul>
              <button className="nfq" type="button" onClick={onEnd}>No further questions.</button>
            </>
          )}
          </div>

        <aside className={cn('script', !log.length && 'is-empty')} aria-label="The transcript so far">
          <p className="rep head">
            <span>Transcript</span>
            <button type="button" className="copy" onClick={copy} disabled={!log.length}>{copied ? 'Copied' : 'Copy it'}</button>
            <span className="n">{String(log.length).padStart(2, '0')}</span>
          </p>
          <div className="roll" ref={scroller} data-lenis-prevent tabIndex={0} role="region" aria-label="Transcript, scrolls">
            {!log.length && <p className="rep none">Nothing on the record yet.</p>}
            <ol className="lines">
              {log.map((e, i) => (
                <li key={e.id} style={heat(clamp(i / 10))}>
                  <p className="tq"><span className="mk">Q.</span> <span>{e.q}</span></p>
                  {e.topic && (
                    <div className="ta">
                      {e.topic.lines.map((l, k) => (
                        <p key={k}>{k === 0 && <span className="mk">A. </span>}{l.tag && <span className="rep">{l.tag} </span>}{l.term && <b>{l.term} </b>}<span>{l.t}</span></p>
                      ))}
                      {e.topic.links?.map((l) => <p key={l.href + l.label}><Out href={l.href}>{l.label}</Out></p>)}
                    </div>
                  )}
                  {e.again && <p className="rep note">Asked and answered.</p>}
                </li>
              ))}
            </ol>
          </div>
        </aside>
        </div>
      </div>
    </section>
  );
}
