// Version 39: the paper. One sheet, folded small, on a desk under a window.
// Scrolling unfolds it panel by panel. The panels are real DOM in CSS 3D,
// so the type stays type; the camera tilts down to read each one.
import { useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans';
import './paper.css';
import { FOOTER, NAV, SITE } from '@/content';
import { gsap, scrollToY } from '@/lib/scroll';
import { clamp, isPhone, lerp, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { A, Cover, FACES } from './Panels';

/** How much page scroll each step of the sheet takes, in screen heights. */
const SEG = 1.25;
/** Where each panel lies on the open sheet, and which edge it hangs from. */
const POS = [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1], [0, 2], [1, 2], [2, 2]] as const;
const DIR = ['', 'R', 'R', 'D', 'L', 'L', 'D', 'R', 'R'] as const;
/** The window: light comes from the upper left and above. */
const L = { x: -0.55, y: -0.5, z: 0.67 };
const LAST = 10;
const SECTION_STAGE: Record<string, number> = { record: 3, drive: 4, people: 5, join: 6 };

type Pose = { x: number; y: number; t: number; s: number; z: number };
const mix = (a: Pose, b: Pose, e: number): Pose => ({ x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), t: lerp(a.t, b.t, e), s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), e)), z: lerp(a.z, b.z, e) });
const io = (t: number) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

function dims(phone: boolean) { return phone ? { W: 360, H: 720 } : { W: 600, H: 800 }; }

/** Scroll position at which a stage is being read. */
const readY = (s: number, vh: number) => (s <= 0 ? 0 : (s + 0.96) * SEG * vh);

/** The stage after the one being read now. */
const nextStage = (T: number) => Math.min(LAST, (T + 0.05 < 1.96 ? 0 : Math.floor(T + 0.05 - 0.96)) + 1);

/** One hinged panel, carrying the rest of the sheet. */
function Panel({ k }: { k: number }) {
  const Face = FACES[k];
  const d = DIR[k];
  return (
    <div className={`pn d-${d || 'O'}`} data-k={k}>
      <div className="fc" data-read={k <= 7 ? k + 1 : 9}>
        <div className="ink"><Face /></div>
        <i className="crease" aria-hidden="true" />
        <i className="sh" aria-hidden="true" />
      </div>
      {k > 0 && (
        <div className="bk" data-read={0} data-k={k}>
          {k === 1 ? <div className="ink"><Cover /></div> : <i className="show" aria-hidden="true" />}
          <i className="sh" aria-hidden="true" />
        </div>
      )}
      {k < 8 && <Panel k={k + 1} />}
    </div>
  );
}

/** Reduced motion: the sheet is already open. */
function Flat() {
  return (
    <main id="main" className="flat">
      <div className="fp fcover" id="top"><Cover /></div>
      <div className="fgrid">
        {[0, 1, 2, 5, 4, 3, 6, 7, 8].map((k) => {
          const Face = FACES[k];
          const id = ({ 2: 'record', 3: 'drive', 4: 'people', 5: 'join' } as Record<number, string>)[k];
          return <div className="fp" key={k} id={id} style={{ order: [0, 1, 2, 5, 4, 3, 6, 7, 8].indexOf(k) }}><Face /></div>;
        })}
      </div>
    </main>
  );
}

export default function Paper() {
  useVersion('paper');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [vh, setVh] = useState(() => window.innerHeight);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const on = () => { setPhone(isPhone()); setVh(window.innerHeight); };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  useEffect(() => {
    if (still) return;
    const el = root.current; if (!el) return;
    const { W, H } = dims(phone);
    const world = el.querySelector<HTMLElement>('.world')!;
    const sheet = el.querySelector<HTMLElement>('.sheet')!;
    const pans = Array.from(el.querySelectorAll<HTMLElement>('.pn'));
    const faceSh = pans.map((p) => p.querySelector<HTMLElement>(':scope > .fc > .sh')!);
    const backSh = pans.map((p) => p.querySelector<HTMLElement>(':scope > .bk > .sh'));
    const backs = pans.map((p) => p.querySelector<HTMLElement>(':scope > .bk'));
    const rects = Array.from(el.querySelectorAll<SVGRectElement>('.shadow .lay'));
    const pack = el.querySelector<SVGRectElement>('.shadow .pack')!;
    const flap = el.querySelector<SVGPolygonElement>('.shadow .flap')!;
    const hint = el.querySelector<HTMLElement>('.hint');

    const st = { intro: 0, px: 0, py: 0, tx: 0, ty: 0, peek: 0, peekT: 0, lastStep: -1 };
    gsap.to(st, { intro: 1, duration: 1.9, ease: 'out', delay: 0.35 });

    const read = (i: number, vw: number, vhh: number): Pose => {
      const [c, r] = POS[i];
      const s = phone ? Math.min(1.04, (vw - 22) / W, (vhh - 76) / H) : Math.min(1, (0.86 * vhh) / H, (0.62 * vw) / W);
      return { x: (c + 0.5) * W, y: (r + 0.5) * H + (phone ? -24 : 0), t: 0, s, z: 0 };
    };
    const travel = (k: number, vw: number, vhh: number): Pose => {
      const a = POS[k - 1], b = POS[k], s = read(0, vw, vhh).s;
      return { x: ((a[0] + b[0]) / 2 + 0.5) * W, y: ((a[1] + b[1]) / 2 + 0.5) * H, t: phone ? 30 : 27, s: s * (phone ? 0.5 : 0.56), z: k % 2 ? -3.5 : 3 };
    };

    const pose = (T: number, vw: number, vhh: number): Pose => {
      const cover: Pose = { ...read(0, vw, vhh), t: phone ? 36 : 40, s: read(0, vw, vhh).s * (phone ? 0.86 : 0.9), z: -9, y: H * 0.56 };
      if (T < 1) return mix(cover, read(0, vw, vhh), io(span(T, 0.12, 0.62)));
      if (T < 9) {
        const k = Math.floor(T), u = T - k;
        const prev = read(Math.max(0, k - 2), vw, vhh), next = read(k - 1, vw, vhh), mid = travel(k, vw, vhh);
        if (u < 0.55) return mix(prev, mid, io(span(u, 0.16, 0.55)));
        return mix(mid, next, io(span(u, 0.55, 0.9)));
      }
      if (T < 10) {
        const u = T - 9, a = read(7, vw, vhh), b = read(8, vw, vhh);
        const mid = { ...mix(a, b, 0.5), t: 16, s: a.s * 0.72, z: 2 };
        return u < 0.55 ? mix(a, mid, io(span(u, 0.16, 0.55))) : mix(mid, b, io(span(u, 0.55, 0.9)));
      }
      const s = phone ? Math.min((vw - 28) / (3 * W), (vhh - 140) / (3 * H)) : Math.min((0.86 * vhh) / (3 * H), (0.8 * vw) / (3 * W));
      const end: Pose = { x: 1.5 * W, y: 1.5 * H, t: 0, s, z: 0 };
      return mix(read(8, vw, vhh), end, io(span(T - 10, 0.12, 0.7)));
    };

    let last = '';
    const tick = () => {
      const vw = window.innerWidth, vhh = window.innerHeight;
      const T = window.scrollY / (SEG * vhh);
      st.px += (st.tx - st.px) * 0.06; st.py += (st.ty - st.py) * 0.06;
      st.peek += (st.peekT - st.peek) * 0.12;

      // The hinges.
      const f = new Array(9).fill(0);
      let next = 9;
      for (let k = 1; k <= 8; k++) {
        const u = T - k;
        let v = 1 - io(span(u, 0.22, 0.7));
        if (u > 0.7 && u < 0.88) { const w = (u - 0.7) / 0.18; v = 0.035 * Math.sin(Math.PI * w) * (1 - w * 0.4); }
        f[k] = v;
        if (v >= 1 && next === 9) next = k;
      }
      if (next < 9) f[next] = 1 - 0.07 * st.peek * (still ? 0 : 1);
      // The moving hinge, if any, and how many panels lie flat.
      let open = 0; while (open < 8 && f[open + 1] === 0) open++;
      const moving = open < 8 && f[open + 1] < 1 ? open + 1 : -1;

      const shade = (nx: number, ny: number, nz: number) => {
        const d = nx * L.x + ny * L.y + nz * L.z, rel = d - L.z;
        return rel < 0 ? `rgba(24,19,12,${Math.min(0.6, -rel * 0.72).toFixed(3)})` : `rgba(255,251,240,${(rel * 0.55).toFixed(3)})`;
      };
      let movingFace = 'transparent';
      for (let k = 1; k <= 8; k++) {
        const a = Math.PI * f[k];
        const dz = f[k] > 0 ? f[k] * ((9 - k) * 1.3 + 0.6) : 0;
        let tr: string, n: [number, number, number];
        if (DIR[k] === 'R') { tr = `translateZ(${dz.toFixed(2)}px) rotateY(${(-180 * f[k]).toFixed(3)}deg)`; n = [Math.sin(-a), 0, Math.cos(a)]; }
        else if (DIR[k] === 'L') { tr = `translateZ(${dz.toFixed(2)}px) rotateY(${(180 * f[k]).toFixed(3)}deg)`; n = [Math.sin(a), 0, Math.cos(a)]; }
        else { tr = `translateZ(${dz.toFixed(2)}px) rotateX(${(180 * f[k]).toFixed(3)}deg)`; n = [0, -Math.sin(a), Math.cos(a)]; }
        pans[k].style.transform = tr;
        const fs = shade(n[0], n[1], n[2]);
        faceSh[k].style.background = fs;
        if (k === moving) movingFace = fs;
        const bs = moving > 0 && k > moving ? movingFace : shade(-n[0], -n[1], -n[2]);
        const b = backSh[k]; if (b) b.style.background = bs;
      }

      // The sheet's shadow on the desk.
      const lift = (1 - st.intro) * 320;
      for (let j = 0; j < 9; j++) {
        const on = j <= open;
        rects[j].style.opacity = on ? '0.42' : '0';
      }
      const [pc, pr] = POS[open];
      const thick = 5 + lift * 0.9;
      if (moving < 0 && open < 8) {
        pack.setAttribute('x', String(pc * W + thick * 0.8)); pack.setAttribute('y', String(pr * H + thick * 0.75));
        pack.style.opacity = String(0.5 * (1 - (1 - st.intro) * 0.6));
      } else pack.style.opacity = '0';
      if (moving > 0) {
        const fr = f[moving], a = Math.PI * fr, [mc, mr] = POS[open], d = DIR[moving];
        const kx = -L.x / L.z, ky = -L.y / L.z;
        let pts: number[][];
        if (d === 'R' || d === 'L') {
          const hx = d === 'R' ? (mc + 1) * W : mc * W, sgn = d === 'R' ? 1 : -1;
          const fx = hx + sgn * W * Math.cos(a), z = W * Math.sin(a) + 8;
          const y0 = mr * H, y1 = y0 + H;
          pts = [[hx, y0], [hx, y1], [fx + z * kx, y1 + z * ky], [fx + z * kx, y0 + z * ky]];
        } else {
          const hy = (mr + 1) * H, fy = hy + H * Math.cos(a), z = H * Math.sin(a) + 8;
          const x0 = mc * W, x1 = x0 + W;
          pts = [[x0, hy], [x1, hy], [x1 + z * kx, fy + z * ky], [x0 + z * kx, fy + z * ky]];
        }
        flap.setAttribute('points', pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' '));
        flap.style.opacity = String(0.34 - 0.12 * Math.sin(a));
      } else flap.style.opacity = '0';

      // The opening: the folded sheet is set down on the desk.
      sheet.style.transform = `translateZ(${lift.toFixed(1)}px) rotateZ(${(-(1 - st.intro) * 7).toFixed(2)}deg)`;
      el.style.setProperty('--lift', (1 - st.intro).toFixed(3));

      // The camera.
      const p = pose(T, vw, vhh);
      const t = p.t + st.py * 2.4, ry = st.px * 2.2;
      const s = `translate3d(${(vw / 2).toFixed(1)}px,${(vhh / 2 + (phone ? 14 : 8)).toFixed(1)}px,0) scale(${p.s.toFixed(4)}) rotateX(${t.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateZ(${p.z.toFixed(3)}deg) translate3d(${(-p.x).toFixed(1)}px,${(-p.y).toFixed(1)}px,0)`;
      if (s !== last) { world.style.transform = s; last = s; }

      if (hint) hint.style.opacity = String(clamp(1 - T * 4) * st.intro);
      const stp = T > LAST + 0.5 ? 11 : Math.round(T);
      if (stp !== st.lastStep) { st.lastStep = stp; setStep(stp); el.dataset.next = String(next); }
      backs.forEach((b, k) => b?.classList.toggle('top', k === next));
    };
    gsap.ticker.add(tick);

    const move = (e: PointerEvent) => { if (e.pointerType === 'mouse') { st.tx = (e.clientX / window.innerWidth) * 2 - 1; st.ty = (e.clientY / window.innerHeight) * 2 - 1; } };
    const over = (e: PointerEvent) => { const t = e.target as HTMLElement; st.peekT = t.closest('.sheet') && !t.closest('a') && el.dataset.next !== '9' ? 1 : 0; };
    // Pressing the paper opens the next fold.
    const click = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('a') || !t.closest('.stage')) return;
      const h = window.innerHeight, T = window.scrollY / (SEG * h);
      if (T > LAST - 0.1) return;
      scrollToY(readY(nextStage(T), h));
    };
    // Tabbing into a panel brings the sheet to that panel.
    const focus = (e: FocusEvent) => {
      const host = (e.target as HTMLElement).closest<HTMLElement>('[data-read]'); if (!host) return;
      const s = Number(host.dataset.read);
      scrollToY(readY(s, window.innerHeight), true);
    };
    window.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerover', over);
    el.addEventListener('click', click);
    el.addEventListener('focusin', focus);
    return () => {
      gsap.ticker.remove(tick); gsap.killTweensOf(st);
      window.removeEventListener('pointermove', move); el.removeEventListener('pointerover', over); el.removeEventListener('click', click); el.removeEventListener('focusin', focus);
    };
  }, [phone]);

  const { W, H } = dims(phone);
  const go = () => {
    const h = window.innerHeight, T = window.scrollY / (SEG * h);
    if (T > LAST + 0.4) { scrollToY(0); return; }
    scrollToY(readY(nextStage(T), h));
  };
  const end = step >= 11;

  return (
    <div className={`v-paper${phone ? ' is-phone' : ''}${still ? ' is-still' : ''}`} ref={root} style={{ '--pw': `${W}px`, '--ph': `${H}px` } as React.CSSProperties}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top">
        <a className="brand" href="#top" aria-label="Skeptical, back to the top">{SITE.name}<i>?</i></a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      {still ? <Flat /> : (
        <>
          <div className="stage" data-allow-overflow>
            <div className="world">
              <div className="window" aria-hidden="true"><i /><i /><i /><i /></div>
              <div className="sheet">
                <svg className="shadow" aria-hidden="true" viewBox={`-400 -400 ${3 * W + 800} ${3 * H + 800}`} style={{ left: -400, top: -400, width: 3 * W + 800, height: 3 * H + 800 }}>
                  <defs>
                    <filter id="pp-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" /></filter>
                    <filter id="pp-far" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16" /></filter>
                  </defs>
                  <g filter="url(#pp-soft)" fill="#3a2f22">
                    {POS.map(([c, r], j) => <rect className="lay" key={j} x={c * W + 2} y={r * H + 3} width={W} height={H} opacity={0} />)}
                  </g>
                  <rect className="pack" filter="url(#pp-far)" fill="#2d241a" x={0} y={0} width={W} height={H} opacity={0} />
                  <polygon className="flap" filter="url(#pp-far)" fill="#2d241a" points="0,0 0,0 0,0" opacity={0} />
                </svg>
                <main id="main" className="chain"><Panel k={0} /></main>
              </div>
            </div>
            <p className="hint" aria-hidden="true">{phone ? 'Scroll, or tap the paper.' : 'Scroll, or press the paper.'}</p>
          </div>
          <div className="track" style={{ height: `${(LAST + 1) * SEG * vh + vh}px` }} aria-hidden="true">
            <span className="mk" id="top" style={{ top: 0 }} />
            {Object.entries(SECTION_STAGE).map(([id, s]) => <span className="mk" key={id} id={id} style={{ top: readY(s, vh) }} />)}
          </div>
          <button type="button" className="unfold" onClick={go}>{end ? 'Fold it up' : step === 0 ? 'Unfold' : 'Next fold'}</button>
        </>
      )}

      <footer className="foot">
        <p className="fline">{FOOTER.line}</p>
        <div className="fcols">
          <ul aria-label="Elsewhere">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul aria-label="Pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        </div>
        {!still && <button type="button" className="refold" onClick={() => scrollToY(0)}>Fold it back up</button>}
        <p className="draft">Draft 2, version 39. Not the live site. Set in Bodoni Moda and Instrument Sans.</p>
      </footer>
    </div>
  );
}
