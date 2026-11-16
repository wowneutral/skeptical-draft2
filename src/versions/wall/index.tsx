// Version 27: the wall. A sceptic checks. The site is an evidence wall made by
// someone working out whether Skeptical is what it says it is: index cards,
// brass pins and red string. The scroll travels the wall and pins each section
// with a thud; every card can be dragged and its strings follow; "connect it"
// asks the visitor to tie the claims to their evidence until the question
// mark turns over. The same content sits underneath in order as the case file.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import '@fontsource/special-elite/400.css';
import '@fontsource/permanent-marker/400.css';
import './wall.css';
import { DRIVE, FOOTER, HERO, JOIN, MANIFESTO, PEOPLE, RECORD, SITE } from '@/content';
import marks from '@/lib/marks.json';
import { clamp, coarse, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { CARDS, EXTRA, PHONE_STOPS, QUESTIONS, SHOWN, STOPS, WORLD, key, type CardDef, type Stop } from './data';
import { thud, ping, snap, setSound } from './sound';

const N = 14; // points per string
type Body = { d: CardDef; x: number; y: number; px: number; ppx: number; py: number; ang: number; av: number; rest: number; tx: number; ty: number; drag: boolean; on: boolean; el: HTMLDivElement | null; clip: SVGCircleElement | null };
type Rope = { id: string; a: string; b: string; kind: 'shown' | 'good' | 'extra' | 'bad'; sec: number; pts: Float32Array; prev: Float32Array; seg: number; show: number; born: number; free: number; path: SVGPathElement | null; shade: SVGPathElement | null; top: SVGPathElement | null };

const [HEAD, ...HEADREST] = SITE.heading.split(':');
const MARK = marks.italic;

function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-470 -770 940 1540" aria-hidden="true">
      <path d={MARK.d} />
    </svg>
  );
}

/** Words before the first full stop, then the rest. */
const splitFirst = (s: string) => {
  const i = s.indexOf('. ');
  return i < 0 ? [s, ''] : [s.slice(0, i + 1), s.slice(i + 2)];
};

export default function Wall() {
  useVersion('wall');
  const scroller = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const temp = useRef<SVGPathElement>(null);
  const lamp = useRef<HTMLDivElement>(null);
  const [ropeIds, setRopeIds] = useState<string[]>([]);
  const [connect, setConnect] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [solved, setSolved] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [toast, setToast] = useState<{ t: string; good: boolean; n: number } | null>(null);
  const [misses, setMisses] = useState(0);
  const [sound, setSoundState] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [atStart, setAtStart] = useState(true);

  const done = solved.length >= QUESTIONS.length;

  // Everything that moves lives in this ref and is read by one frame loop.
  const S = useRef({
    bodies: new Map<string, Body>(),
    ropes: [] as Rope[],
    cam: { x: STOPS[0].x, y: STOPS[0].y, z: 0.6 },
    user: { x: 0, y: 0 },
    zoom: 1,
    lastStop: 0,
    sec: -1,
    shake: 0,
    W: 1440, H: 900,
    drag: null as null | { id: string; ox: number; oy: number; sx: number; sy: number; moved: boolean; pid: number; mode: 'card' | 'link' },
    pan: null as null | { sx: number; sy: number; ux: number; uy: number; pid: number },
    ptr: { x: -999, y: -999, wx: 0, wy: 0 },
    connect: false,
    picked: null as string | null,
    end: false,
    start: true,
  });

  if (S.current.bodies.size === 0) {
    CARDS.forEach((d, i) => {
      const rest = d.kind === 'tape' ? (i % 2 ? 0.02 : -0.025) : (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.06;
      S.current.bodies.set(d.id, { d, x: d.x, y: d.y, px: d.x, ppx: d.x, py: d.y, ang: rest, av: 0, rest, tx: d.x, ty: d.y, drag: false, on: still, el: null, clip: null });
    });
  }

  const stops = useCallback(() => (S.current.W <= 820 ? PHONE_STOPS : STOPS), []);

  // ---- strings -------------------------------------------------------------
  const addRope = useCallback((a: string, b: string, kind: Rope['kind'], sec: number, instant = false) => {
    const s = S.current;
    const id = key(a, b) + (kind === 'bad' ? '#' + Math.random().toString(36).slice(2, 7) : '');
    if (kind !== 'bad' && s.ropes.some((r) => r.id === id)) return false;
    const A = s.bodies.get(a)!, B = s.bodies.get(b)!;
    const pts = new Float32Array(N * 2), prev = new Float32Array(N * 2);
    const D = Math.hypot(B.x - A.x, B.y - A.y);
    const sag = D * 0.06;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      pts[i * 2] = prev[i * 2] = A.x + (B.x - A.x) * t;
      pts[i * 2 + 1] = prev[i * 2 + 1] = A.y + (B.y - A.y) * t + Math.sin(Math.PI * t) * sag;
    }
    s.ropes.push({ id, a, b, kind, sec, pts, prev, seg: (D * 1.035) / (N - 1), show: instant || still ? 1 : 0, born: performance.now(), free: 0, path: null, shade: null, top: null });
    setRopeIds(s.ropes.map((r) => r.id));
    return true;
  }, []);

  useEffect(() => {
    if (still) SHOWN.forEach(([a, b, sec]) => addRope(a, b, 'shown', sec, true));
  }, [addRope]);

  const say = useCallback((t: string, good: boolean) => {
    setMsg(t);
    setToast((o) => ({ t, good, n: (o?.n ?? 0) + 1 }));
  }, []);

  const tryLink = useCallback((a: string, b: string) => {
    if (a === b) return;
    const k = key(a, b);
    const s = S.current;
    const la = s.bodies.get(a)!.d.label, lb = s.bodies.get(b)!.d.label;
    if (s.ropes.some((r) => r.id === k)) { say('Already strung: ' + la + ' to ' + lb, true); return; }
    const q = QUESTIONS.find((qq) => qq.pairs.some(([x, y]) => key(x, y) === k));
    if (q) {
      addRope(a, b, 'good', 9, true);
      ping(true);
      s.shake = 6;
      setSolved((o) => (o.includes(q.id) ? o : [...o, q.id]));
      setMisses(0);
      say('It holds.', true);
      return;
    }
    if (EXTRA.some(([x, y]) => key(x, y) === k)) {
      addRope(a, b, 'extra', 9, true);
      ping(false);
      say('It holds: ' + la + ' to ' + lb, true);
      return;
    }
    addRope(a, b, 'bad', 9, true);
    snap();
    setMisses((m) => m + 1);
    say('No connection. The string falls.', false);
  }, [addRope, say]);

  const solveAll = useCallback(() => {
    QUESTIONS.forEach((q, i) => {
      window.setTimeout(() => {
        const s = S.current;
        if (q.pairs.some(([x, y]) => s.ropes.some((r) => r.id === key(x, y)))) { setSolved((o) => (o.includes(q.id) ? o : [...o, q.id])); return; }
        tryLink(q.hint[0], q.hint[1]);
      }, still ? 0 : i * 380);
    });
  }, [tryLink]);

  useEffect(() => { S.current.connect = connect; if (!connect) { setPicked(null); S.current.picked = null; } }, [connect]);
  useEffect(() => { S.current.picked = picked; }, [picked]);
  useEffect(() => { setSound(sound); }, [sound]);
  useEffect(() => {
    if (!done) return;
    thud(1.4);
    const s = S.current, q = s.bodies.get('q')!, st = stops()[s.lastStop];
    // fly to the centre card so the turn is seen up close
    s.user.x = q.x - st.x; s.user.y = q.y + 390 - st.y;
    s.zoom = clamp(Math.min(s.W / 760, s.H / 1150) / Math.min(s.W / st.w, s.H / st.h), 0.45, 8);
    window.setTimeout(() => { s.shake = 14; }, still ? 0 : 900);
  }, [done, stops]);

  const pick = (v: string | null) => { S.current.picked = v; setPicked(v); };

  // ---- pointer -> world ----------------------------------------------------
  const toWorld = (cx: number, cy: number) => {
    const s = S.current, r = stage.current!.getBoundingClientRect();
    return { x: (cx - r.left - s.W / 2) / s.cam.z + s.cam.x, y: (cy - r.top - s.H / 2) / s.cam.z + s.cam.y };
  };

  const cardAt = (cx: number, cy: number) => {
    const el = document.elementFromPoint(cx, cy)?.closest('[data-card]') as HTMLElement | null;
    return el?.dataset.card ?? null;
  };

  const onDown = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('a, .w-ui, .w-face-back button')) return;
    const s = S.current;
    const cardEl = t.closest('[data-card]') as HTMLElement | null;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (cardEl) {
      const id = cardEl.dataset.card!;
      const b = s.bodies.get(id)!;
      if (!b.on) return;
      // On touch, only the pin drags; the card itself lets the page scroll.
      if (e.pointerType === 'touch' && !t.closest('.w-pin') && !s.connect) return;
      const w = toWorld(e.clientX, e.clientY);
      s.drag = { id, ox: w.x - b.x, oy: w.y - b.y, sx: e.clientX, sy: e.clientY, moved: false, pid: e.pointerId, mode: s.connect ? 'link' : 'card' };
      s.ptr.wx = w.x; s.ptr.wy = w.y;
      if (!s.connect) { b.drag = true; b.tx = b.x; b.ty = b.y; b.el?.classList.add('is-lifted'); }
      try { stage.current?.setPointerCapture(e.pointerId); } catch { /* fine */ }
      return;
    }
    if (e.pointerType === 'touch') {
      // a horizontal swipe on the cork pans; vertical stays the page scroll
      s.pan = { sx: e.clientX, sy: e.clientY, ux: s.user.x, uy: s.user.y, pid: e.pointerId };
      return;
    }
    s.pan = { sx: e.clientX, sy: e.clientY, ux: s.user.x, uy: s.user.y, pid: e.pointerId };
    stage.current?.classList.add('is-panning');
    try { stage.current?.setPointerCapture(e.pointerId); } catch { /* fine */ }
  };

  const onMove = (e: React.PointerEvent) => {
    const s = S.current;
    const r = stage.current!.getBoundingClientRect();
    s.ptr.x = e.clientX - r.left; s.ptr.y = e.clientY - r.top;
    if (s.drag && s.drag.pid === e.pointerId) {
      const w = toWorld(e.clientX, e.clientY);
      s.ptr.wx = w.x; s.ptr.wy = w.y;
      if (Math.hypot(e.clientX - s.drag.sx, e.clientY - s.drag.sy) > 6) s.drag.moved = true;
      if (s.drag.mode === 'card') {
        const b = s.bodies.get(s.drag.id)!;
        b.tx = clamp(w.x - s.drag.ox, 60, WORLD.w - 60);
        b.ty = clamp(w.y - s.drag.oy, 60, WORLD.h - 60);
      }
    } else if (s.pan && s.pan.pid === e.pointerId) {
      const dx = e.clientX - s.pan.sx, dy = e.clientY - s.pan.sy;
      if (e.pointerType === 'touch') s.user.x = s.pan.ux - dx / s.cam.z;
      else { s.user.x = s.pan.ux - dx / s.cam.z; s.user.y = s.pan.uy - dy / s.cam.z; }
    }
  };

  const onUp = (e: React.PointerEvent) => {
    const s = S.current;
    if (s.drag && s.drag.pid === e.pointerId) {
      const d = s.drag;
      s.drag = null;
      if (d.mode === 'card') {
        const b = s.bodies.get(d.id)!;
        b.drag = false;
        b.el?.classList.remove('is-lifted');
        if (d.moved) { b.el?.classList.remove('is-repin'); void b.el?.offsetWidth; b.el?.classList.add('is-repin'); thud(0.7); s.shake = 3; }
      } else {
        const over = cardAt(e.clientX, e.clientY);
        if (d.moved && over && over !== d.id) { tryLink(d.id, over); pick(null); }
        else if (!d.moved) {
          // tap, tap
          const p = s.picked;
          if (p && p !== d.id) { tryLink(p, d.id); pick(null); }
          else if (p === d.id) pick(null);
          else { pick(d.id); say('Picked: ' + s.bodies.get(d.id)!.d.label + '. Now pick what it proves.', true); }
        }
      }
    }
    if (s.pan && s.pan.pid === e.pointerId) { s.pan = null; stage.current?.classList.remove('is-panning'); }
  };

  // ---- keyboard ------------------------------------------------------------
  const onPinKey = (id: string) => (e: React.KeyboardEvent) => {
    const s = S.current, b = s.bodies.get(id)!;
    const step = e.shiftKey ? 120 : 40;
    const mv: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (mv[e.key]) {
      e.preventDefault();
      b.x = clamp(b.x + mv[e.key][0], 60, WORLD.w - 60); b.y = clamp(b.y + mv[e.key][1], 60, WORLD.h - 60);
      b.tx = b.x; b.ty = b.y;
      b.el?.classList.remove('is-repin'); void b.el?.offsetWidth; b.el?.classList.add('is-repin'); thud(0.5);
    }
  };
  const onPinClick = (id: string) => () => {
    const s = S.current;
    if (!s.connect) { const b = s.bodies.get(id)!; b.av += 0.09; thud(0.4); return; }
    const p = s.picked;
    if (p && p !== id) { tryLink(p, id); pick(null); }
    else if (p === id) pick(null);
    else { pick(id); say('Picked: ' + s.bodies.get(id)!.d.label + '. Now pick what it proves.', true); }
  };
  // Keep a focused card in view.
  const onCardFocus = (id: string) => () => {
    const s = S.current, b = s.bodies.get(id)!;
    const sx = (b.x - s.cam.x) * s.cam.z + s.W / 2, sy = (b.y + 120 - s.cam.y) * s.cam.z + s.H / 2;
    if (sx < s.W * 0.12 || sx > s.W * 0.88 || sy < s.H * 0.12 || sy > s.H * 0.85) {
      const st = stops()[s.lastStop];
      s.user.x = b.x - st.x; s.user.y = b.y + 150 - st.y;
    }
  };

  const onStageKey = (e: React.KeyboardEvent) => {
    if (e.target !== stage.current) return;
    const s = S.current, st = 90 / s.cam.z;
    const mv: Record<string, [number, number]> = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] };
    if (mv[e.key]) { e.preventDefault(); s.user.x += mv[e.key][0]; s.user.y += mv[e.key][1]; }
    if (e.key === '+' || e.key === '=') zoomBy(1.25);
    if (e.key === '-') zoomBy(0.8);
  };

  const zoomBy = (f: number) => {
    const s = S.current;
    s.zoom = clamp(s.zoom * f, 0.45, 2.6);
  };

  // ---- the frame loop ------------------------------------------------------
  useEffect(() => {
    const s = S.current;
    let raf = 0, last = performance.now();
    const measure = () => { const r = stage.current?.getBoundingClientRect(); if (r) { s.W = r.width; s.H = r.height; } };
    measure();
    window.addEventListener('resize', measure);

    const camFor = (st: Stop) => ({ x: st.x, y: st.y, z: Math.min(s.W / st.w, s.H / st.h) });
    const ease = (t: number) => t * t * (3 - 2 * t);

    const reveal = (sec: number) => {
      CARDS.forEach((d, i) => {
        if (d.sec > sec) return;
        const b = s.bodies.get(d.id)!;
        if (b.on) return;
        b.on = true;
        const delay = still ? 0 : (i % 9) * 70;
        window.setTimeout(() => { b.el?.classList.add('is-on'); window.setTimeout(() => { thud(0.35); s.shake = Math.max(s.shake, 4); }, 260); }, delay);
      });
      SHOWN.forEach(([a, b, sc]) => { if (sc <= sec) addRope(a, b, 'shown', sc); });
    };
    if (still) CARDS.forEach((d) => s.bodies.get(d.id)?.el?.classList.add('is-on'));

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(2.5, (now - last) / 16.67);
      last = now;
      const sc = scroller.current, wd = world.current;
      if (!sc || !wd) return;
      const list = stops();
      const r = sc.getBoundingClientRect();
      const span = Math.max(1, r.height - s.H);
      const p = clamp(-r.top / span, 0, 1) * (list.length - 1);
      const i = Math.min(list.length - 1, Math.floor(p)), f = p - i;
      const A = camFor(list[i]), B = camFor(list[Math.min(list.length - 1, i + 1)]);
      const t = ease(clamp((f - 0.35) / 0.65, 0, 1));
      const near = Math.round(p);
      if (near !== s.lastStop) { s.lastStop = near; s.user.x = 0; s.user.y = 0; if (s.zoom > 2.6) s.zoom = 1; }
      const sec = list[Math.min(list.length - 1, Math.floor(p + 0.25))].sec;
      if (sec > s.sec) { s.sec = sec; reveal(Math.min(5, sec)); }
      if (p > 0.5 && s.start) { s.start = false; setAtStart(false); }
      const end = p > list.length - 1.4;
      if (end !== s.end) { s.end = end; setAtEnd(end); }

      const tx = A.x + (B.x - A.x) * t + s.user.x, ty = A.y + (B.y - A.y) * t + s.user.y;
      const tz = Math.exp(Math.log(A.z) + (Math.log(B.z) - Math.log(A.z)) * t) * s.zoom;
      const k = still ? 1 : 1 - Math.pow(1 - 0.12, dt);
      s.cam.x += (tx - s.cam.x) * k; s.cam.y += (ty - s.cam.y) * k; s.cam.z += (tz - s.cam.z) * k;

      // cards: springs toward the pointer, swing from the pin
      s.bodies.forEach((b) => {
        if (b.drag) { const kk = 1 - Math.pow(1 - 0.3, dt); b.x += (b.tx - b.x) * kk; b.y += (b.ty - b.y) * kk; }
        const ax = b.x - 2 * b.px + b.ppx;
        b.ppx = b.px; b.px = b.x;
        if (!still) {
          b.av += (-(b.ang - b.rest) * 0.022 - b.av * 0.07 - ax * 0.0032) * dt;
          b.ang = clamp(b.ang + b.av * dt, -0.7, 0.7);
        }
        if (b.el) b.el.style.transform = `translate3d(${b.x - b.d.w / 2}px,${b.y - 26}px,0) rotate(${b.ang}rad)`;
        if (b.clip) { b.clip.setAttribute('cx', b.x.toFixed(1)); b.clip.setAttribute('cy', b.y.toFixed(1)); b.clip.setAttribute('r', b.on ? '64' : '0'); }
      });

      // strings: verlet with slack, taut when stretched
      let changed = false;
      for (let ri = s.ropes.length - 1; ri >= 0; ri--) {
        const rp = s.ropes[ri];
        const a = s.bodies.get(rp.a)!, b = s.bodies.get(rp.b)!;
        if (!a.on || !b.on) continue;
        const age = now - rp.born;
        if (rp.kind === 'bad' && age > 350 && !rp.free) rp.free = now;
        if (rp.free && now - rp.free > 1500) { s.ropes.splice(ri, 1); changed = true; continue; }
        if (rp.show < 1) rp.show = Math.min(1, rp.show + 0.035 * dt);
        const P = rp.pts, Q = rp.prev;
        const D = Math.hypot(b.x - a.x, b.y - a.y);
        const seg = Math.max(rp.seg, D / (N - 1));
        if (!still || rp.free) {
          const g = 0.55 * dt * dt * (rp.free ? 2.4 : 1);
          for (let j = 0; j < N; j++) {
            const ix = j * 2;
            const vx = (P[ix] - Q[ix]) * 0.975, vy = (P[ix + 1] - Q[ix + 1]) * 0.975;
            Q[ix] = P[ix]; Q[ix + 1] = P[ix + 1];
            P[ix] += vx; P[ix + 1] += vy + g;
          }
        }
        for (let it = 0; it < 8; it++) {
          if (!rp.free) { P[0] = a.x; P[1] = a.y; }
          if (!rp.free || now - rp.free < 120) { P[(N - 1) * 2] = b.x; P[(N - 1) * 2 + 1] = b.y; }
          for (let j = 0; j < N - 1; j++) {
            const ix = j * 2, jx = ix + 2;
            const dx = P[jx] - P[ix], dy = P[jx + 1] - P[ix + 1];
            const d = Math.hypot(dx, dy) || 1;
            if (d <= seg) continue;
            const diff = (d - seg) / d * 0.5;
            P[ix] += dx * diff; P[ix + 1] += dy * diff; P[jx] -= dx * diff; P[jx + 1] -= dy * diff;
          }
        }
        if (!rp.free) { P[0] = a.x; P[1] = a.y; P[(N - 1) * 2] = b.x; P[(N - 1) * 2 + 1] = b.y; }
        if (rp.path) {
          let dd = `M${P[0].toFixed(1)} ${P[1].toFixed(1)}`;
          for (let j = 1; j < N - 1; j++) {
            const mx = (P[j * 2] + P[j * 2 + 2]) / 2, my = (P[j * 2 + 1] + P[j * 2 + 3]) / 2;
            dd += `Q${P[j * 2].toFixed(1)} ${P[j * 2 + 1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
          }
          dd += `L${P[(N - 1) * 2].toFixed(1)} ${P[(N - 1) * 2 + 1].toFixed(1)}`;
          rp.path.setAttribute('d', dd);
          const dash = `${rp.show} 2`;
          rp.path.style.strokeDasharray = dash;
          rp.path.style.opacity = rp.free ? String(Math.max(0, 1 - (now - rp.free) / 1500)) : '';
          if (rp.shade) { rp.shade.setAttribute('d', dd); rp.shade.style.strokeDasharray = dash; rp.shade.style.opacity = rp.path.style.opacity; }
          if (rp.top) { rp.top.setAttribute('d', dd); rp.top.style.strokeDasharray = dash; rp.top.style.opacity = rp.path.style.opacity; }
        }
      }
      if (changed) setRopeIds(s.ropes.map((x) => x.id));

      // the string being drawn
      if (temp.current) {
        const d = s.drag;
        const from = d && d.mode === 'link' && d.moved ? s.bodies.get(d.id)! : null;
        if (from) {
          const mx = (from.x + s.ptr.wx) / 2, my = (from.y + s.ptr.wy) / 2 + Math.hypot(s.ptr.wx - from.x, s.ptr.wy - from.y) * 0.08;
          temp.current.setAttribute('d', `M${from.x} ${from.y}Q${mx} ${my} ${s.ptr.wx} ${s.ptr.wy}`);
          temp.current.style.opacity = '1';
        } else temp.current.style.opacity = '0';
      }

      // the room: shake on a thud, lamp follows the pointer
      let sx = 0, sy = 0;
      if (s.shake > 0.1 && !still) { sx = (Math.random() - 0.5) * s.shake; sy = (Math.random() - 0.5) * s.shake; s.shake *= Math.pow(0.82, dt); }
      wd.style.transform = `translate3d(${s.W / 2 - s.cam.x * s.cam.z + sx}px,${s.H / 2 - s.cam.y * s.cam.z + sy}px,0) scale(${s.cam.z})`;
      if (lamp.current) {
        const lx = s.ptr.x < -900 ? s.W * 0.7 : s.ptr.x, ly = s.ptr.x < -900 ? s.H * 0.3 : s.ptr.y;
        lamp.current.style.setProperty('--lx', lx.toFixed(0) + 'px');
        lamp.current.style.setProperty('--ly', ly.toFixed(0) + 'px');
      }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, [addRope, stops]);

  // keep each rope's path refs fresh after React renders the list
  const bindPath = (id: string, layer: 's' | 'p' | 't') => (el: SVGPathElement | null) => {
    const r = S.current.ropes.find((x) => x.id === id);
    if (r) { if (layer === 's') r.shade = el; else if (layer === 'p') r.path = el; else r.top = el; }
  };

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const ropeKind = useMemo(() => new Map(S.current.ropes.map((r) => [r.id, r.kind])), [ropeIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const pathBy = (id: string) => JOIN.paths.find((p) => p.id === id)!;

  // ---- what each card says ------------------------------------------------
  const body = (d: CardDef): ReactNode => {
    switch (d.id) {
      case 'title': return <h1 className="w-h1"><span>{HEAD}</span><span className="sr-only-x">:{HEADREST.join(':')}</span></h1>;
      case 'q': return (
        <div className={'w-flip' + (done ? ' is-flipped' : '')}>
          <div className="w-face w-face-front" inert={done}>
            <Mark className="w-q-mark" />
            <p className="w-q-ask">Is this team for real?</p>
            <svg className="w-tally" viewBox="0 0 220 110" role="img" aria-label={`${solved.length} of ${QUESTIONS.length} checked`}>
              {[0, 1, 2, 3].map((i) => <path key={i} className={solved.length > i ? 'is-on' : ''} d={`M${40 + i * 40} ${14 + (i % 2) * 4}q${i % 2 ? 4 : -3} 40 ${i % 2 ? -2 : 3} 82`} pathLength={1} />)}
              <path className={solved.length > 4 ? 'is-on' : ''} d="M18 84Q110 48 202 22" pathLength={1} />
            </svg>
          </div>
          <div className="w-face w-face-back" inert={!done}>
            <p className="w-stamp">Checks out.</p>
            <p className="w-back-title">{JOIN.title}</p>
            <p className="w-back-lead">{JOIN.lead}</p>
            <ul className="w-back-list">
              {JOIN.paths.map((p) => (
                <li key={p.id}><a href={p.href}><span>{p.name}</span><em>{p.line}</em></a></li>
              ))}
            </ul>
          </div>
        </div>
      );
      case 'p0': case 'p1': return <p className="w-pitch">{HERO.pitch[d.id === 'p0' ? 0 : 1]}</p>;
      case 's0': case 's1': case 's2': return <p className="w-state">{HERO.statement[+d.id[1]]}</p>;
      case 'd0': case 'd1': { const door = HERO.doors[+d.id[1]]; return <a className="w-door" href={door.href}><span>{door.label}</span><svg viewBox="0 0 60 24" aria-hidden="true"><path d="M2 12h52m-12-9 12 9-12 9" /></svg></a>; }
      case 'claims': return <p className="w-tape-t">The claims.</p>;
      case 'm0': { const [a, b] = splitFirst(MANIFESTO[0]); return (
        <div className="w-receipt-in">
          <p className="w-rc-head">Skeptical</p>
          <p className="w-rc-row">{a}</p>
          <p className="w-rc-big">{b}</p>
          <div className="w-barcode" aria-hidden="true" />
        </div>
      ); }
      case 'm1': case 'm2': case 'm3': return <p className="w-typed">{MANIFESTO[+d.id[1]]}</p>;
      case 'rec': return <p className="w-tape-t">{RECORD.title}</p>;
      case 'rule': return <p className="w-typed">{RECORD.rule}</p>;
      case 'prog': return (
        <div className="w-prog-in">
          <p className="w-prog-when">{RECORD.when}</p>
          <p className="w-prog-name">{RECORD.name}</p>
          <p className="w-prog-where">{RECORD.where}</p>
        </div>
      );
      case 'r0': case 'r1': { const r = RECORD.results[+d.id[1]]; return (
        <div className="w-res">
          <p className="w-res-who">{r.who}</p>
          <p className="w-res-what"><span>{r.what}</span></p>
          <p className="w-res-more">{r.more}</p>
        </div>
      ); }
      case 'rmore': return <a className="w-taglink" href={RECORD.more.href}>{RECORD.more.label}</a>;
      case 'drv': return <p className="w-tape-t">{DRIVE.title}</p>;
      case 'dlead': return <p className="w-typed">{DRIVE.lead}</p>;
      case 'dmore': return <a className="w-taglink" href={DRIVE.more.href}>{DRIVE.more.label}</a>;
      case 'ppl': return <p className="w-tape-t">{PEOPLE.title}</p>;
      case 'c0': case 'c1': { const c = PEOPLE.coaches[+d.id[1]]; return (
        <div className="w-name-in">
          <p className="w-name-role">{c.role}</p>
          <p className="w-name-name">{c.name}</p>
          <p className="w-name-bio">{c.bio}</p>
        </div>
      ); }
      case 'count': return <p className="w-typed w-typed-big">{PEOPLE.count}</p>;
      case 'pmore': return <a className="w-taglink" href={PEOPLE.more.href}>{PEOPLE.more.label}</a>;
      case 'jn': return <p className="w-tape-t">{JOIN.title}</p>;
      case 'jlead': return <p className="w-typed w-typed-big">{JOIN.lead}</p>;
      case 'j0': case 'j1': case 'j2': { const p = pathBy(['compete', 'lecture', 'coach'][+d.id[1]]); return (
        <div className="w-sticky-in">
          <a className="w-sticky-name" href={p.href}>{p.name}</a>
          <p className="w-sticky-line">{p.line}</p>
          <p className="w-sticky-text">{p.text[0]}</p>
        </div>
      ); }
      case 'jx': return (
        <div className="w-note-in">
          <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
          <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
          <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
        </div>
      );
    }
    if (d.kind === 'folder') {
      const it = DRIVE.items[+d.id[1]];
      return (
        <div className="w-folder-in">
          <span className="w-folder-tab" aria-hidden="true" />
          <p className="w-folder-term">{it.term}</p>
          <p className="w-folder-text">{it.text}</p>
          <p className="w-folder-stamp" aria-hidden="true">Private</p>
        </div>
      );
    }
    return null;
  };

  const next = QUESTIONS.find((q) => !solved.includes(q.id));
  const lbl = (id: string) => S.current.bodies.get(id)!.d.label;
  const line = toast ? toast.t
    : connect && next ? (misses >= 2 ? `Try \u201c${lbl(next.hint[0])}\u201d to \u201c${lbl(next.hint[1])}\u201d` : next.ask)
    : connect || !atStart ? '' : coarse ? 'Drag a pin. Scroll on.' : 'Drag a card. Scroll to investigate.';

  return (
    <div className={'v-wall' + (connect ? ' is-connect' : '') + (done ? ' is-done' : '')}>
      <a className="skip-x" href="#main">Skip to the case file</a>

      <div ref={scroller} className="w-scroller" style={{ height: `${(STOPS.length) * 95 + 100}vh` }}>
        <section
          ref={stage}
          className="w-stage"
          aria-label="Evidence wall. Drag cards by their pins, drag the cork to pan, arrow keys pan when the wall is focused."
          tabIndex={0}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onStageKey}
        >
          <div ref={world} className="w-world" style={{ width: WORLD.w, height: WORLD.h }}>
            <div className="w-frame" aria-hidden="true" />
            <svg className="w-strings w-strings-under" width={WORLD.w} height={WORLD.h} viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} aria-hidden="true">
              {ropeIds.map((id) => <path key={'s' + id} ref={bindPath(id, 's')} className="w-shade" pathLength={1} />)}
              {ropeIds.map((id) => <path key={id} ref={bindPath(id, 'p')} className={'w-thread t-' + (ropeKind.get(id) ?? 'shown')} pathLength={1} />)}
            </svg>
            {CARDS.map((d) => (
              <div
                key={d.id}
                data-card={d.id}
                ref={(el) => { const b = S.current.bodies.get(d.id); if (b) b.el = el; if (el && (still || b?.on)) el.classList.add('is-on'); }}
                className={`wc k-${d.kind} id-${d.id}` + (picked === d.id ? ' is-picked' : '')}
                style={{ width: d.w, transformOrigin: `${d.w / 2}px 26px` }}
                onFocusCapture={onCardFocus(d.id)}
              >
                <div className="w-paper">{body(d)}</div>
                <button
                  type="button"
                  className="w-pin"
                  aria-label={(connect ? 'Connect from or to: ' : 'Pin on ') + d.label + (connect ? '' : '. Arrow keys move it.')}
                  aria-pressed={connect ? picked === d.id : undefined}
                  onClick={onPinClick(d.id)}
                  onKeyDown={onPinKey(d.id)}
                ><span aria-hidden="true" /></button>
              </div>
            ))}
            <svg className="w-strings w-strings-top" width={WORLD.w} height={WORLD.h} viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} aria-hidden="true">
              <defs><clipPath id="w-pinclip">{CARDS.map((d) => <circle key={d.id} ref={(el) => { const b = S.current.bodies.get(d.id); if (b) b.clip = el; }} r="0" />)}</clipPath></defs>
              <g clipPath="url(#w-pinclip)">
                {ropeIds.map((id) => <path key={'t' + id} ref={bindPath(id, 't')} className={'w-thread t-' + (ropeKind.get(id) ?? 'shown')} pathLength={1} />)}
              </g>
              <path ref={temp} className="w-thread t-temp" />
            </svg>
          </div>

          <div ref={lamp} className="w-lamp" aria-hidden="true"><div className="w-dark" /><div className="w-glow" /></div>

          <div className="w-ui w-tools" role="toolbar" aria-label="Wall tools">
            <button type="button" className={'w-btn w-btn-main' + (connect ? ' is-on' : '')} aria-pressed={connect} onClick={() => setConnect((c) => !c)}>
              <svg viewBox="0 0 40 20" aria-hidden="true"><circle cx="6" cy="10" r="4" /><circle cx="34" cy="10" r="4" /><path d="M6 10 Q20 22 34 10" /></svg>
              {connect ? 'Connecting' : 'Connect it'}
            </button>
            <button type="button" className="w-btn w-btn-sq" aria-label="Zoom out" onClick={() => zoomBy(0.8)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg></button>
            <button type="button" className="w-btn w-btn-sq" aria-label="Zoom in" onClick={() => zoomBy(1.25)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg></button>
            <button type="button" className="w-btn w-btn-sq" aria-label={sound ? 'Sound off' : 'Sound on'} aria-pressed={!sound} onClick={() => setSoundState((v) => !v)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9.5h4l5-4.5v14l-5-4.5H3z" />{sound ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" /> : <path d="m16 9.5 5 5m0-5-5 5" />}</svg>
            </button>
          </div>

          {line && !atEnd && <p key={line} className={'w-line' + (toast && !toast.good ? ' is-bad' : '')} aria-hidden="true">{line}</p>}
          <div className={'w-ending' + (atEnd ? ' is-on' : '')} aria-hidden={!atEnd} inert={!atEnd}>
            {done ? (
              <>
                <p className="w-end-big">Case closed.</p>
                <a className="w-end-cta" href={HERO.doors[0].href}>{HERO.doors[0].label}</a>
              </>
            ) : (
              <>
                <p className="w-end-big">Still a question mark.</p>
                <button type="button" className="w-end-cta" onClick={() => { setConnect(true); solveAll(); }}>Connect the strings</button>
              </>
            )}
          </div>
        </section>
      </div>
      <p className="sr-only-x" aria-live="polite">{msg}</p>

      <main id="main" className="w-file">
        <div className="w-file-in">
          <header className="w-file-head">
            <p className="w-file-label">The case file</p>
            <p className="w-file-sub">Everything on the wall, in order.</p>
          </header>

          <section className="w-sheet" aria-labelledby="cf-claim">
            <h2 id="cf-claim" className="w-tab">The claim.</h2>
            <p className="w-big">{HERO.pitch[0]} {HERO.pitch[1]}</p>
            <ul className="w-lines">{HERO.statement.map((s) => <li key={s}>{s}</li>)}</ul>
            <p className="w-doors">{HERO.doors.map((d) => <a key={d.href} className="w-chip" href={d.href}>{d.label}</a>)}</p>
            <ol className="w-lines w-num">{MANIFESTO.map((m) => <li key={m}>{m}</li>)}</ol>
          </section>

          <section className="w-sheet" id="record" aria-labelledby="cf-record">
            <h2 id="cf-record" className="w-tab">{RECORD.title}</h2>
            <p>{RECORD.rule}</p>
            <p className="w-event"><span>{RECORD.when}</span> <b>{RECORD.name}</b> <span>{RECORD.where}</span></p>
            <ul className="w-results">{RECORD.results.map((r) => <li key={r.who}><b>{r.who}</b> {r.what}. <span>{r.more}</span></li>)}</ul>
            <p><a className="w-more" href={RECORD.more.href}>{RECORD.more.label}</a></p>
          </section>

          <section className="w-sheet" id="drive" aria-labelledby="cf-drive">
            <h2 id="cf-drive" className="w-tab">{DRIVE.title}</h2>
            <p>{DRIVE.lead}</p>
            <dl className="w-dl">{DRIVE.items.map((it) => <div key={it.term}><dt>{it.term}</dt><dd>{it.text}</dd></div>)}</dl>
            <p><a className="w-more" href={DRIVE.more.href}>{DRIVE.more.label}</a></p>
          </section>

          <section className="w-sheet" id="people" aria-labelledby="cf-people">
            <h2 id="cf-people" className="w-tab">{PEOPLE.title}</h2>
            <ul className="w-coaches">{PEOPLE.coaches.map((c) => <li key={c.name}><b>{c.name}</b> <span className="w-role">{c.role}</span><p>{c.bio}</p></li>)}</ul>
            <p>{PEOPLE.count}</p>
            <p><a className="w-more" href={PEOPLE.more.href}>{PEOPLE.more.label}</a></p>
          </section>

          <section className="w-sheet w-sheet-join" id="join" aria-labelledby="cf-join">
            <h2 id="cf-join" className="w-tab">{JOIN.title}</h2>
            <p className="w-big">{JOIN.lead}</p>
            <div className="w-paths">
              {JOIN.paths.map((p) => (
                <article key={p.id} className="w-path">
                  <h3><a href={p.href}>{p.name}</a></h3>
                  <p className="w-path-line">{p.line}</p>
                  <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                </article>
              ))}
            </div>
            <p>{JOIN.already.before}<a className="w-more" href={JOIN.already.href}>{JOIN.already.label}</a></p>
            <p>{JOIN.coach.before}<a className="w-more" href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
            <p>{JOIN.also} <a className="w-more" href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p>{JOIN.discord}</p>
          </section>
        </div>
      </main>

      <footer className="w-foot">
        <p className="w-foot-line">{FOOTER.line}</p>
        <ul className="w-foot-links">{FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <ul className="w-foot-pages">{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <p className="w-foot-small">Draft 2, version 27. Not the live site.</p>
      </footer>
    </div>
  );
}
