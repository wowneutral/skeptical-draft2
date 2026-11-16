// The judge's part of the ballot (points, decision, reason, signature) on the top copy,
// and the carbon copy under it, which is Join. Signing and tearing reveals the carbon.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import { JOIN, SITE, FOOTER } from '@/content';
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { Stamp } from './parts';

const MIN = 25;
const MAX = 30;
const REASONS = ['Clean extensions.', 'Won framework.', 'Clear weighing.', 'Skep is true.', 'The prep stays private.'];

/** A ring the way a hand draws one: a little more than one turn, uneven, tilted. */
function ringPath(w: number, h: number, seed: number) {
  const r = (i: number) => { const x = Math.sin(seed * 9.13 + i * 4.7) * 43758.5453; return x - Math.floor(x); };
  const cx = w / 2, cy = h / 2, rx = w / 2 + 14, ry = h / 2 + 12;
  const turns = 1.12 + r(1) * 0.08, start = -2.2 + r(2) * 0.6, tilt = (r(3) - 0.5) * 0.12;
  const pts: string[] = [];
  const N = 46;
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = start + t * turns * Math.PI * 2;
    const wob = 1 + Math.sin(a * 3 + seed) * 0.025 + (t > 0.85 ? (t - 0.85) * 0.5 : 0);
    const x = Math.cos(a) * rx * wob, y = Math.sin(a) * ry * wob;
    const X = cx + x * Math.cos(tilt) - y * Math.sin(tilt), Y = cy + x * Math.sin(tilt) + y * Math.cos(tilt);
    pts.push(`${i ? 'L' : 'M'}${X.toFixed(1)} ${Y.toFixed(1)}`);
  }
  return pts.join(' ');
}

type Ghost = { pts?: { x: number; y: number; v: string }; ring?: { x: number; y: number; w: number; h: number; d: string }; rfd?: { x: number; y: number; w: number; t: string }; sig?: { x: number; y: number; w: number; h: number; src: string } };

export function Judge({ name, tearRef }: { name: string; tearRef: MutableRefObject<(() => void) | null> }) {
  const [pts, setPts] = useState<number | null>(null);
  const [dec, setDec] = useState<'aff' | 'neg' | null>(null);
  const [ring, setRing] = useState<{ d: string; w: number; h: number } | null>(null);
  const [rfd, setRfd] = useState('');
  const [signed, setSigned] = useState(false);
  const [torn, setTorn] = useState(false);
  const [ghost, setGhost] = useState<Ghost>({});
  const stack = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const carbon = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ringEl = useRef<SVGPathElement>(null);
  const btn = { aff: useRef<HTMLButtonElement>(null), neg: useRef<HTMLButtonElement>(null) };

  /* ---------- speaker points ---------- */
  const setFromX = useCallback((clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setPts(Math.round((MIN + t * (MAX - MIN)) * 10) / 10);
  }, []);
  const onTrackDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    track.current!.dataset.grab = '1';
    setFromX(e.clientX);
  };
  const onTrackMove = (e: React.PointerEvent) => { if (track.current!.dataset.grab === '1') setFromX(e.clientX); };
  const onTrackUp = () => { track.current!.dataset.grab = '0'; };
  const onKey = (e: React.KeyboardEvent) => {
    const v = pts ?? 28;
    const step = e.key === 'PageUp' ? 1 : e.key === 'PageDown' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 0.1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -0.1 : 0;
    if (e.key === 'Home') { setPts(MIN); e.preventDefault(); return; }
    if (e.key === 'End') { setPts(MAX); e.preventDefault(); return; }
    if (!step) return;
    e.preventDefault();
    setPts(Math.round(Math.min(MAX, Math.max(MIN, v + step)) * 10) / 10);
  };
  useEffect(() => {
    if (pts == null || still || !num.current) return;
    gsap.fromTo(num.current, { scale: 1.12, rotate: (Math.random() - 0.5) * 6 }, { scale: 1, rotate: (Math.random() - 0.5) * 3, duration: 0.5, ease: 'elastic.out(1, 0.45)', overwrite: true });
  }, [pts]);
  const tPts = pts == null ? 0.6 : (pts - MIN) / (MAX - MIN);
  const remark = pts == null ? 'Drag to give points.' : pts >= 29.6 ? 'Generous.' : pts >= 28.5 ? 'Solid.' : pts >= 27 ? 'Fair.' : 'Harsh.';

  /* ---------- decision ---------- */
  const decide = (d: 'aff' | 'neg') => {
    const b = btn[d].current!;
    const w = b.offsetWidth, h = b.offsetHeight;
    setDec(d);
    setRing({ d: ringPath(w, h, Math.random() * 10), w, h });
  };
  useLayoutEffect(() => {
    if (!ringEl.current || still) return;
    gsap.fromTo(ringEl.current, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.6, ease: 'power2.inOut' });
  }, [ring]);

  /* ---------- signature ---------- */
  const strokes = useRef<{ x: number; y: number; w: number }[][]>([]);
  const fit = useCallback(() => {
    const c = canvas.current; if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.offsetWidth * dpr; c.height = c.offsetHeight * dpr;
    const g = c.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const redraw = () => {
    const c = canvas.current; if (!c) return;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, c.width, c.height);
    g.strokeStyle = '#1f3aa6'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const s of strokes.current) for (let i = 1; i < s.length; i++) {
      g.lineWidth = s[i].w; g.beginPath(); g.moveTo(s[i - 1].x, s[i - 1].y); g.lineTo(s[i].x, s[i].y); g.stroke();
    }
  };
  useEffect(() => { fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }, [fit]);
  const drawing = useRef(false);
  const at = (e: React.PointerEvent) => { const r = canvas.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const sigDown = (e: React.PointerEvent) => {
    canvas.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    strokes.current.push([{ ...at(e), w: 2.6 }]);
  };
  const sigMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const s = strokes.current[strokes.current.length - 1];
    const p = at(e), q = s[s.length - 1];
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < 1.2) return;
    const w = Math.max(1.3, Math.min(4, 4.2 - d * 0.12));
    s.push({ ...p, w: q.w + (w - q.w) * 0.35 });
    const g = canvas.current!.getContext('2d')!;
    g.strokeStyle = '#1f3aa6'; g.lineCap = 'round'; g.lineWidth = s[s.length - 1].w;
    g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(p.x, p.y); g.stroke();
  };
  const sigUp = () => { if (drawing.current) { drawing.current = false; if (strokes.current.flat().length > 6) setSigned(true); } };
  const signName = () => {
    const c = canvas.current!; const g = c.getContext('2d')!;
    redraw();
    g.fillStyle = '#1f3aa6';
    g.font = `700 ${Math.min(72, c.offsetHeight * 0.5)}px Caveat`;
    g.save(); g.translate(28, c.offsetHeight * 0.68); g.rotate(-0.04);
    g.fillText(name.trim() || 'The judge', 0, 0); g.restore();
    strokes.current.push([]);
    setSigned(true);
  };
  const clearSig = () => { strokes.current = []; redraw(); setSigned(false); };

  /* ---------- tear ---------- */
  const tear = useCallback(() => {
    if (torn) return;
    const S = stack.current!.getBoundingClientRect();
    const rel = (el: Element | null) => { const r = el!.getBoundingClientRect(); return { x: r.left - S.left, y: r.top - S.top, w: r.width, h: r.height }; };
    const g: Ghost = {};
    if (pts != null) { const r = rel(num.current); g.pts = { x: r.x, y: r.y, v: pts.toFixed(1) }; }
    if (dec && ring) { const r = rel(btn[dec].current); g.ring = { x: r.x, y: r.y, w: ring.w, h: ring.h, d: ring.d }; }
    if (rfd.trim()) { const r = rel(top.current!.querySelector('textarea')); g.rfd = { x: r.x, y: r.y, w: r.w, t: rfd.trim() }; }
    if (signed) { const r = rel(canvas.current); g.sig = { x: r.x, y: r.y, w: r.w, h: r.h, src: canvas.current!.toDataURL() }; }
    setGhost(g);
    const done = () => { setTorn(true); };
    if (still) { done(); return; }
    const t = top.current!;
    const perf = stack.current!.parentElement!.querySelector('.bl-perf');
    const tl = gsap.timeline({ onComplete: done });
    // The perforation gives way left to right, the sheet lifts off the carbon, then it is pulled away.
    if (perf) tl.fromTo(perf, { '--rip': '0%' }, { '--rip': '100%', duration: 0.55, ease: 'power2.in' }, 0);
    tl.set(t, { clipPath: 'polygon(0% 0.9%, 3% 0.1%, 7% 0.8%, 12% 0%, 17% 0.9%, 23% 0.2%, 29% 1%, 35% 0.1%, 41% 0.8%, 47% 0%, 53% 0.9%, 59% 0.1%, 65% 1%, 71% 0.2%, 77% 0.9%, 83% 0%, 89% 0.8%, 95% 0.1%, 100% 0.9%, 100% 100%, 0% 100%)' }, 0.3)
      .to(t, { y: -8, rotate: -0.8, transformOrigin: '0% 0%', boxShadow: '0 30px 60px -10px rgba(0,0,0,0.5)', duration: 0.3, ease: 'power2.out' }, 0.3)
      .to(t, { x: '-3vw', rotate: -1.6, duration: 0.18, ease: 'power1.inOut' }, 0.6)
      .to(t, { x: '120vw', y: -260, rotate: 16, duration: 1.0, ease: 'power3.in' }, 0.78);
  }, [torn, pts, dec, ring, rfd, signed]);
  useEffect(() => { tearRef.current = tear; }, [tear, tearRef]);
  useEffect(() => {
    if (!torn || still) return;
    const st = carbon.current!.querySelector('.bl-stamp-recv');
    if (st) gsap.fromTo(st, { scale: 2.6, opacity: 0, rotate: -24 }, { scale: 1, opacity: 0.92, rotate: -8, duration: 0.42, delay: 0.25, ease: 'power4.in' });
    gsap.fromTo(carbon.current!.querySelectorAll('[data-in]'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.7, ease: 'out', delay: 0.1 });
  }, [torn]);

  const sigLabel = signed ? 'Signed.' : 'Sign here with mouse or finger.';

  return (
    <section className="bl-judge" aria-labelledby="bl-judge-h">
      <div className="bl-perf" aria-hidden="true"><span>Tear along the line</span></div>
      <div className={`bl-stack${torn ? ' is-torn' : ''}${still ? ' is-flat' : ''}`} ref={stack}>
        {!torn && (
          <div className="bl-top" ref={top}>
            <header className="bl-band">
              <span className="bl-band-k">F</span>
              <h2 id="bl-judge-h">For the judge.</h2>
              <span className="bl-band-note">That is you. Nothing here is sent anywhere.</span>
            </header>

            <div className="bl-grid bl-jgrid">
              <div className="bl-cell bl-c-pts">
                <p className="bl-lab" id="bl-pts-l">1. Speaker points for this page</p>
                <p className="bl-sub">Your opinion of this page. Not points for any debater.</p>
                <div className="bl-pts-row">
                  <span className="bl-pts-num" ref={num} data-ghost>{pts == null ? '__._' : pts.toFixed(1)}</span>
                  <span className="bl-pts-rem">{remark}</span>
                </div>
                <div className="bl-track" ref={track} role="slider" tabIndex={0} aria-labelledby="bl-pts-l" aria-valuemin={MIN} aria-valuemax={MAX} aria-valuenow={pts ?? 28} aria-valuetext={pts == null ? 'not given yet' : pts.toFixed(1)}
                  onPointerDown={onTrackDown} onPointerMove={onTrackMove} onPointerUp={onTrackUp} onPointerCancel={onTrackUp} onKeyDown={onKey}>
                  <div className="bl-ticks" aria-hidden="true">
                    {Array.from({ length: 51 }, (_, i) => {
                      const d = Math.abs(i / 50 - tPts) * 50;
                      const lift = pts == null ? 0 : Math.max(0, 1 - d / 5);
                      return <i key={i} className={i % 10 === 0 ? 'is-major' : i % 5 === 0 ? 'is-half' : ''} style={{ height: `${(i % 10 === 0 ? 34 : i % 5 === 0 ? 24 : 14) + lift * 22}px` }} />;
                    })}
                  </div>
                  <div className="bl-scale" aria-hidden="true">{[25, 26, 27, 28, 29, 30].map((n) => <span key={n}>{n}</span>)}</div>
                  <div className={`bl-knob${pts == null ? ' is-idle' : ''}`} style={{ left: `${tPts * 100}%` }} aria-hidden="true"><b /></div>
                </div>
              </div>

              <div className="bl-cell bl-c-dec">
                <p className="bl-lab" id="bl-dec-l">2. Decision. Circle one.</p>
                <p className="bl-sub">The better debating was done by the</p>
                <div className="bl-dec" role="group" aria-labelledby="bl-dec-l">
                  {(['aff', 'neg'] as const).map((k) => (
                    <button key={k} ref={btn[k]} type="button" className={`bl-side${dec === k ? ' is-on' : ''}`} aria-pressed={dec === k} onClick={() => decide(k)}>
                      <span className="bl-side-n">{k === 'aff' ? 'Affirmative' : 'Negative'}</span>
                      <span className="bl-side-s">{k === 'aff' ? SITE.name : 'Everything else'}</span>
                      {dec === k && ring && (
                        <svg className="bl-ring" viewBox={`0 0 ${ring.w} ${ring.h}`} width={ring.w} height={ring.h} aria-hidden="true"><path ref={ringEl} d={ring.d} /></svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bl-cell bl-c-rfd">
                <label className="bl-lab" htmlFor="bl-rfd">3. Reason for decision</label>
                <div className="bl-chips">
                  {REASONS.map((r) => (
                    <button key={r} type="button" className="bl-chip" onClick={() => setRfd((v) => (v.trim() ? v.trim() + ' ' : '') + r)}>+ {r}</button>
                  ))}
                </div>
                <textarea id="bl-rfd" className="bl-rfd" rows={4} value={rfd} onChange={(e) => setRfd(e.target.value)} placeholder="Write it like you would on a real ballot." />
              </div>

              <div className="bl-cell bl-c-sig">
                <p className="bl-lab" id="bl-sig-l">4. Judge’s signature</p>
                <div className="bl-sigbox">
                  <canvas ref={canvas} className="bl-sig" role="img" aria-label={`Signature box. ${sigLabel}`} onPointerDown={sigDown} onPointerMove={sigMove} onPointerUp={sigUp} onPointerCancel={sigUp} />
                  <span className="bl-sig-x" aria-hidden="true">X</span>
                  <span className="bl-sig-hint" aria-hidden="true">{signed ? '' : 'Sign here'}</span>
                </div>
                <div className="bl-sig-btns">
                  <button type="button" className="bl-btn" onClick={signName}>Sign with my name</button>
                  <button type="button" className="bl-btn" onClick={clearSig}>Clear</button>
                  <button type="button" className={`bl-btn bl-btn-tear${signed ? ' is-ready' : ''}`} onClick={tear}>{signed ? 'Tear off the top copy' : 'Skip it. Tear to Join'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bl-carbon" id="join" ref={carbon} aria-label="Carbon copy: Join" role="region">
          <div className="bl-ghosts" aria-hidden="true">
            {ghost.pts && <span className="bl-g-pts" style={{ left: ghost.pts.x, top: ghost.pts.y }}>{ghost.pts.v}</span>}
            {ghost.ring && <svg className="bl-g-ring" style={{ left: ghost.ring.x, top: ghost.ring.y }} width={ghost.ring.w} height={ghost.ring.h} viewBox={`0 0 ${ghost.ring.w} ${ghost.ring.h}`}><path d={ghost.ring.d} /></svg>}
            {ghost.rfd && <span className="bl-g-rfd" style={{ left: ghost.rfd.x, top: ghost.rfd.y, width: ghost.rfd.w }}>{ghost.rfd.t}</span>}
            {ghost.sig && <img className="bl-g-sig" alt="" src={ghost.sig.src} style={{ left: ghost.sig.x, top: ghost.sig.y, width: ghost.sig.w, height: ghost.sig.h }} />}
          </div>
          <header className="bl-cband" data-in>
            <span>Carbon copy</span><span>{name.trim() ? `Judge: ${name.trim()}` : 'Judge copy'}</span>
          </header>
          <div className="bl-join-head" data-in>
            <h2 className="bl-join-t">{JOIN.title}</h2>
            <p className="bl-join-lead">{JOIN.lead}</p>
            <Stamp className="bl-stamp-recv" text="Received" />
          </div>
          <div className="bl-paths">
            {JOIN.paths.map((p, i) => (
              <article key={p.id} className="bl-path" data-in>
                <p className="bl-path-k">{String.fromCharCode(65 + i)}</p>
                <h3 className="bl-path-n">{p.name}</h3>
                <p className="bl-path-l">{p.line}</p>
                <ul className="bl-path-x">{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                <a className="bl-path-a" href={p.href}><span className="bl-box-tick" aria-hidden="true" />{p.name}<span className="sr-only-x">: {p.line}</span> <span aria-hidden="true">→</span></a>
              </article>
            ))}
          </div>
          <div className="bl-join-foot" data-in>
            <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
            <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
            <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p>{JOIN.discord}</p>
          </div>
          <footer className="bl-foot" data-in>
            <p className="bl-foot-line">{FOOTER.line}</p>
            <ul className="bl-foot-links">{FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
            <ul className="bl-foot-pages">{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
            <p className="bl-foot-draft">Draft 2, version 19. Not the live site. Fonts: Big Shoulders Display, Courier Prime and Caveat, all under the SIL Open Font License.</p>
          </footer>
        </div>
      </div>
    </section>
  );
}
