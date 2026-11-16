// Version 31: the close read. One word, and the scroll does not go down, it goes in.
// Every level is real type, laid out at screen size and placed inside a measured
// letterform of the level before; the camera only ever transforms the three or
// four levels around it, so text is rasterised fresh at every depth.
import { useCallback, useEffect, useRef } from 'react';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './zoom.css';
import { gsap, getLenis } from '@/lib/scroll';
import { clamp, damp, smooth, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { counterBox } from './counter';
import { ACC, INK, LEVELS, L9, NAMES, PAPER, STOPS, TURN } from './Levels';

type M = [number, number, number, number, number, number];
const mul = (A: M, B: M): M => [
  A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
  A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5],
];
const T = (x: number, y: number): M => [1, 0, 0, 1, x, y];
const R = (a: number): M => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
const S = (s: number): M => [s, 0, 0, s, 0, 0];
const inv = (A: M): M => {
  const d = A[0] * A[3] - A[1] * A[2];
  const a = A[3] / d, b = -A[1] / d, c = -A[2] / d, e = A[0] / d;
  return [a, b, c, e, -(a * A[4] + c * A[5]), -(b * A[4] + e * A[5])];
};
const css = (m: M) => `matrix(${m.map((v) => +v.toFixed(5)).join(',')})`;

const fmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const short = (v: number) => fmt.format(v);
const SEG = 1.25; // viewport heights of scroll per level
const LAST = 9;

export default function Zoom() {
  useVersion('zoom');
  return still ? <Flat /> : <Dive />;
}

function Flat() {
  return (
    <div className="v-zoom zm-flat">
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main">
        {LEVELS.map((L, i) => <section key={i} className={`zm-lv zm-lv${i}`} style={{ background: PAPER[i] }}><L flat /></section>)}
        <section className="zm-lv zm-lv9" style={{ background: PAPER[9] }}><L9 flat /></section>
      </main>
    </div>
  );
}

function grainURL() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  if (!g) return '';
  g.fillStyle = '#0b0b0b'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, r = Math.random() * Math.random() * 3.2 + 0.3;
    const l = 22 + Math.random() * 30;
    g.fillStyle = `rgb(${l},${l - 2},${l - 6})`;
    g.beginPath(); g.ellipse(x, y, r * (1 + Math.random()), r, Math.random() * 3, 0, Math.PI * 2); g.fill();
  }
  return c.toDataURL('image/png');
}

function Dive() {
  const stage = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const lv = useRef<(HTMLDivElement | null)[]>([]);
  const spacer = useRef<HTMLDivElement>(null);
  const needle = useRef<HTMLSpanElement>(null);
  const magEl = useRef<HTMLSpanElement>(null);
  const sizeEl = useRef<HTMLSpanElement>(null);
  const stops = useRef<(HTMLButtonElement | null)[]>([]);
  const st = useRef({
    W: 1, H: 1, a: [] as [number, number][], f: [] as number[], r: TURN.map((d) => (d * Math.PI) / 180),
    panMax: 0, ready: false, z: 0, ov: null as null | { z: number }, hold: 0, hv: 0,
    px: 0, py: 0, vx: 0, vy: 0, tx: 0, ty: 0, drag: false, lx: 0, ly: 0, wfs: 200, lastActive: -1, lastMag: '', refuse: false,
  });

  const yFor = (k: number, extra = 0) => k * SEG * st.current.H + extra;

  const goTo = useCallback((k: number, extra = 0, slow = 1) => {
    const s = st.current;
    if (!s.ready) return;
    if (s.ov) gsap.killTweensOf(s.ov);
    const o = { z: s.z };
    s.ov = o;
    const dist = Math.abs(k - s.z);
    gsap.to(o, {
      z: k, duration: (0.9 + dist * 0.55) * slow, ease: 'power2.inOut',
      onComplete: () => {
        const l = getLenis();
        const y = yFor(k, extra);
        if (l) l.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
        s.z = k;
        requestAnimationFrame(() => { if (s.ov === o) s.ov = null; });
      },
    });
  }, []);
  const pullBack = useCallback(() => goTo(0, 0, 1.25), [goTo]);

  // Measure every level's target letter and place the next level inside it.
  useEffect(() => {
    const s = st.current;
    let alive = true;
    const grain = grainURL();
    stage.current?.style.setProperty('--grain', `url(${grain})`);
    const measure = async () => {
      const W = window.innerWidth, H = window.innerHeight;
      s.W = W; s.H = H; s.ready = false;
      const els = lv.current;
      els.forEach((el) => { if (el) { el.style.display = 'block'; el.style.transform = 'none'; el.style.width = W + 'px'; el.style.height = H + 'px'; } });
      try { await document.fonts.load('italic 400 100px "Bodoni Moda Variable"'); await document.fonts.ready; } catch { /* fonts are local; carry on */ }
      if (!alive) return;
      const g = document.createElement('canvas').getContext('2d');
      const aspect = W / H;
      for (let j = 0; j < LAST; j++) {
        const root = els[j]; const t = root?.querySelector<HTMLElement>('[data-t]');
        if (!root || !t) continue;
        let x = 0, y = 0; let e: HTMLElement | null = t;
        while (e && e !== root) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent as HTMLElement | null; }
        if (t.dataset.t === 'dot') {
          const D = t.offsetWidth;
          const w = (D * aspect) / Math.sqrt(1 + aspect * aspect);
          s.a[j] = [x + D / 2 - W / 2, y + t.offsetHeight / 2 - H / 2];
          s.f[j] = (w / W) * (j === LAST - 1 ? 0.995 : 0.88);
          continue;
        }
        const cs = getComputedStyle(t);
        const fs = parseFloat(cs.fontSize);
        let asc = fs * 0.9;
        if (g) { g.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`; asc = g.measureText(t.textContent || 'o').fontBoundingBoxAscent; }
        const box = counterBox(t.textContent || 'o', cs.fontFamily, cs.fontStyle, parseInt(cs.fontWeight) || 400, fs, aspect, PAPER[j + 1]);
        if (box?.hole) {
          const hb = box.hole;
          t.style.setProperty('--hx', hb.x + 'px'); t.style.setProperty('--hy', asc + hb.y + 'px');
          t.style.setProperty('--hw', hb.w + 'px'); t.style.setProperty('--hh', hb.h + 'px');
          t.style.setProperty('--hm', `url(${hb.url})`);
        }
        if (!box) { s.a[j] = [x + t.offsetWidth / 2 - W / 2, y + t.offsetHeight / 2 - H / 2]; s.f[j] = 0.05; continue; }
        s.a[j] = [x + box.x - W / 2, y + asc + box.y - H / 2];
        s.f[j] = (box.w / W) * 0.9;
      }
      const word = els[0]?.querySelector<HTMLElement>('.zm-word');
      s.wfs = word ? parseFloat(getComputedStyle(word).fontSize) : 200;
      const pan = els[LAST]?.querySelector<HTMLElement>('.zm-pan');
      s.panMax = pan ? Math.max(0, pan.scrollHeight - H + 40) : 0;
      if (spacer.current) spacer.current.style.height = `${yFor(LAST) + s.panMax + H}px`;
      s.ready = true;
      stage.current?.classList.add('is-ready');
    };
    measure();
    let to = 0; let lastW = window.innerWidth;
    const onResize = () => {
      if (Math.abs(window.innerWidth - lastW) < 2 && Math.abs(window.innerHeight - s.H) < 140) return;
      lastW = window.innerWidth;
      clearTimeout(to); to = window.setTimeout(measure, 200);
    };
    window.addEventListener('resize', onResize);
    return () => { alive = false; window.removeEventListener('resize', onResize); clearTimeout(to); };
  }, []);

  // The camera.
  useEffect(() => {
    const s = st.current;
    const tick = (_t: number, dms: number) => {
      if (!s.ready) return;
      const dt = Math.min(0.05, dms / 1000);
      const { W, H } = s;
      const y = window.scrollY;
      // hold to zoom
      s.hv = damp(s.hv, s.hold * H * 1.5, s.hold ? 2.4 : 6, dt);
      if (Math.abs(s.hv) > 2 && !s.ov) {
        const l = getLenis();
        const max = document.documentElement.scrollHeight - H;
        const ny = clamp(y + s.hv * dt, 0, max);
        if (l) l.scrollTo(ny, { immediate: true, force: true }); else window.scrollTo(0, ny);
      }
      const u = y / (SEG * H);
      let zt: number; let pan = 0; let refuse = false;
      if (u >= LAST) { zt = LAST; pan = Math.min(s.panMax, y - yFor(LAST)); }
      else {
        const k = Math.floor(u); const fr = u - k;
        if (k === 5) {
          // the drive refuses: a nudge in, a push back, then only the ink lets you through
          zt = fr < 0.52 ? 5 + 0.045 * Math.sin(Math.PI * clamp((fr - 0.1) / 0.42)) : 5 + smooth(clamp((fr - 0.52) / 0.42));
          refuse = fr > 0.12 && fr < 0.5;
        } else zt = k + smooth(clamp((fr - 0.14) / 0.72));
      }
      if (refuse !== s.refuse) { s.refuse = refuse; stage.current?.classList.toggle('is-refuse', refuse); }
      if (s.ov) s.z = s.ov.z; else s.z = damp(s.z, zt, 7, dt);
      const zc = clamp(s.z, 0, LAST);
      // drag spring with weight
      if (!s.drag) { s.tx = 0; s.ty = 0; }
      s.vx += (s.tx - s.px) * 60 * dt; s.vy += (s.ty - s.py) * 60 * dt;
      const fr2 = Math.exp(-9 * dt); s.vx *= fr2; s.vy *= fr2;
      s.px += s.vx * dt * 4; s.py += s.vy * dt * 4;

      let k = Math.floor(zc); let t = zc - k;
      if (k >= LAST) { k = LAST - 1; t = 1; }
      const f = s.f[k] || 0.05; const a = s.a[k] || [0, 0]; const r = s.r[k] || 0;
      const sc = Math.pow(1 / f, t);
      const q = (1 / sc - f) / (1 - f);
      const cx = a[0] * (1 - q), cy = a[1] * (1 - q);
      const bend = Math.sin(Math.PI * t) * Math.min(W, H) * 0.09 * (k % 2 ? 1 : -1);
      const th = -r * smooth(t);
      const Mk = mul(mul(mul(T(W / 2 + bend + s.px, H / 2 - bend * 0.35 + s.py), R(th)), S(sc)), T(-cx, -cy));
      const P = (j: number): M => mul(mul(T(s.a[j]?.[0] || 0, s.a[j]?.[1] || 0), R(s.r[j] || 0)), S(s.f[j] || 0.05));
      const mats: (M | null)[] = new Array(LAST + 1).fill(null);
      mats[k] = Mk;
      if (k + 1 <= LAST) mats[k + 1] = mul(Mk, P(k));
      if (k + 2 <= LAST) mats[k + 2] = mul(mats[k + 1]!, P(k + 1));
      if (k - 1 >= 0) mats[k - 1] = mul(Mk, inv(P(k - 1)));
      const off = T(-W / 2, -H / 2);
      for (let j = 0; j <= LAST; j++) {
        const el = lv.current[j]; if (!el) continue;
        const m = mats[j];
        const scl = m ? Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) : 0;
        const on = !!m && scl > 0.0025 && scl < 70;
        const want = on ? 'block' : 'none';
        if (el.style.display !== want) el.style.display = want;
        if (on) el.style.transform = css(mul(m!, off));
      }
      const panEl = lv.current[LAST]?.firstElementChild?.firstElementChild as HTMLElement | undefined;
      if (panEl) panEl.style.transform = `translate3d(0,${-pan}px,0)`;
      // gauge
      let mag = sc; for (let j = 0; j < k; j++) mag /= s.f[j] || 1;
      const b0 = stops.current[0], b1 = stops.current[LAST];
      if (needle.current && b0 && b1) {
        const top0 = b0.offsetTop + b0.offsetHeight / 2, top1 = b1.offsetTop + b1.offsetHeight / 2;
        needle.current.style.transform = `translate3d(0,${top0 + (top1 - top0) * (zc / LAST)}px,0)`;
      }
      const active = Math.round(zc);
      if (active !== s.lastActive) {
        s.lastActive = active;
        stops.current.forEach((b, i) => { if (b) { if (i === active) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); } });
        document.documentElement.style.background = PAPER[active];
        root.current?.style.setProperty('--g-ink', INK[active]);
        root.current?.style.setProperty('--g-acc', ACC[active]);
      }
      const cm = (s.wfs * 0.72 * mag * 2.54) / 96;
      const len = cm < 100 ? `${cm.toFixed(cm < 10 ? 1 : 0)} cm` : cm < 100000 ? `${(cm / 100).toFixed(cm < 1000 ? 1 : 0)} m` : `${short(cm / 100000)} km`;
      const ms = `×${mag < 10 ? mag.toFixed(1) : short(mag)}`;
      if (ms + len !== s.lastMag) {
        s.lastMag = ms + len;
        if (magEl.current) magEl.current.textContent = ms;
        if (sizeEl.current) sizeEl.current.textContent = len;
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  // Keys: hold Z to go in, X to come out, P to pull back.
  useEffect(() => {
    const s = st.current;
    const typing = (e: KeyboardEvent) => (e.target as HTMLElement)?.closest?.('input,textarea');
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'z' || k === '+' || k === '=') s.hold = 1;
      else if (k === 'x' || k === '-') s.hold = -1;
      else if (k === 'p' && !e.repeat) pullBack();
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['z', '+', '=', 'x', '-'].includes(k)) s.hold = 0;
    };
    const blur = () => { s.hold = 0; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, [pullBack]);

  // Drag to look around.
  useEffect(() => {
    const el = stage.current; if (!el) return;
    const s = st.current;
    const soft = (v: number, lim: number) => lim * Math.tanh(v / lim);
    let ox = 0, oy = 0;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('a,button')) return;
      s.drag = true; s.lx = e.clientX; s.ly = e.clientY; ox = 0; oy = 0;
      el.classList.add('is-drag');
    };
    const move = (e: PointerEvent) => {
      if (!s.drag) return;
      ox += e.clientX - s.lx; oy += e.clientY - s.ly; s.lx = e.clientX; s.ly = e.clientY;
      s.tx = soft(ox, s.W * 0.3);
      s.ty = e.pointerType === 'touch' ? 0 : soft(oy, s.H * 0.3);
    };
    const up = () => { s.drag = false; el.classList.remove('is-drag'); };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, []);

  // Keyboard reading: focusing a link in the plain copy flies the camera there and lights the same link on screen.
  const onFocus = (e: React.FocusEvent) => {
    const a = e.target as HTMLElement;
    const sec = a.closest<HTMLElement>('[data-lv]'); if (!sec) return;
    const k = +sec.dataset.lv!;
    let extra = 0;
    const key = a.dataset.k;
    const twin = key ? stage.current?.querySelector<HTMLElement>(`[data-k="${CSS.escape(key)}"]`) : null;
    if (k === LAST && twin) {
      let y = 0; let n: HTMLElement | null = twin;
      while (n && !n.classList.contains('zm-pan')) { y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
      extra = clamp(y - st.current.H * 0.45, 0, st.current.panMax);
    }
    if (Math.abs(st.current.z - k) > 0.01 || k === LAST) goTo(k, extra);
    stage.current?.querySelectorAll('.is-kf').forEach((n) => n.classList.remove('is-kf'));
    twin?.classList.add('is-kf');
  };
  const onBlur = () => stage.current?.querySelectorAll('.is-kf').forEach((n) => n.classList.remove('is-kf'));

  const holdOn = (d: number) => () => { st.current.hold = d; };
  const holdOff = () => { st.current.hold = 0; };

  return (
    <div className="v-zoom zm-dive" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="zm-stage" ref={stage} aria-hidden="true">
        {LEVELS.map((L, i) => (
          <div key={i} className={`zm-lv zm-lv${i}`} style={{ zIndex: i + 1 }} ref={(n) => { lv.current[i] = n; }}><L /></div>
        ))}
        <div className={`zm-lv zm-lv9`} style={{ zIndex: 10 }} ref={(n) => { lv.current[LAST] = n; }}><L9 onPull={pullBack} /></div>
      </div>

      <main id="main" className="sr-only-x zm-read" onFocus={onFocus} onBlur={onBlur}>
        {LEVELS.map((L, i) => <section key={i} data-lv={i} aria-label={NAMES[i]}><L flat /></section>)}
        <section data-lv={LAST} aria-label={NAMES[LAST]}><L9 flat /></section>
      </main>

      <nav className="zm-gauge" aria-label="Depth">
        <p className="zm-read-out"><span ref={magEl}>{'×'}1.0</span><span className="zm-sz"><span className="zm-sl">S</span> = <span ref={sizeEl}>0 cm</span></span></p>
        <ol>
          {STOPS.map((c, i) => (
            <li key={i}>
              <button type="button" ref={(n) => { stops.current[i] = n; }} onClick={() => goTo(i)} aria-label={`${NAMES[i]}, level ${i}`}>
                <span aria-hidden="true">{c}</span>
              </button>
            </li>
          ))}
        </ol>
        <span className="zm-needle" ref={needle} aria-hidden="true" />
        <div className="zm-ctrl">
          <button type="button" className="zm-hold" aria-label="Hold to look closer" title="Hold, or hold Z"
            onPointerDown={holdOn(1)} onPointerUp={holdOff} onPointerLeave={holdOff} onPointerCancel={holdOff}
            onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); st.current.hold = 1; } }}
            onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') holdOff(); }}
            onContextMenu={(e) => e.preventDefault()}>
            <b aria-hidden="true">+</b><span>Hold</span>
          </button>
          <button type="button" className="zm-back" onClick={pullBack}>Pull back</button>
        </div>
      </nav>

      <div className="zm-spacer" ref={spacer} />
    </div>
  );
}
