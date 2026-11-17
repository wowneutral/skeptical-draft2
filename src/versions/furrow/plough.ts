// The engine. Every mirrored row turns over letter by letter as it nears the middle of the
// screen, starting from the end where the row above finished. Each tile is a sprung card
// with the stone's mirrored letter on one face and the reading on the other.
import { gsap } from '@/lib/scroll';
import { smooth } from '@/lib/utils';

type R = {
  el: HTMLElement;
  block: HTMLElement;
  end: boolean;
  tiles: HTMLElement[];
  n: number;
  x: Float32Array;
  v: Float32Array;
  man: Int8Array; // 0 none, 1 forced read, -1 forced stone
  at: Float64Array; // when the forced state takes hold
  peek: Float32Array;
  last: Float32Array;
  on: boolean;
  read: boolean;
  turnAt: Float64Array;
};

const K = 260;
const C = 19;

export class Plough {
  rows: R[] = [];
  ready = false;
  locked = false;
  held = false;
  get stone() { return this.locked || this.held; }
  private io: IntersectionObserver;
  private tick: (t: number, dms: number) => void;
  private off: (() => void)[] = [];
  private press: { id: number; x: number; y: number; t: number; row: R | null; moved: boolean; set: 1 | -1; timer: number } | null = null;

  constructor(private root: HTMLElement) {
    const rows = [...root.querySelectorAll<HTMLElement>('.row[data-turn]')];
    this.io = new IntersectionObserver((es) => {
      for (const e of es) {
        const r = this.rows.find((x) => x.el === e.target);
        if (r) r.on = e.isIntersecting;
      }
    }, { rootMargin: '30% 0px 30% 0px' });
    this.rows = rows.map((el) => {
      const tiles = [...el.querySelectorAll<HTMLElement>('.tile')];
      const n = tiles.length;
      this.io.observe(el);
      return {
        el, block: el.closest('.d') as HTMLElement, end: !!el.closest('[data-end]'), tiles, n,
        x: new Float32Array(n), v: new Float32Array(n), man: new Int8Array(n), at: new Float64Array(n),
        peek: new Float32Array(n), last: new Float32Array(n).fill(-1), on: false, read: false, turnAt: new Float64Array(n),
      };
    });
    this.tick = (_t, dms) => this.frame(Math.min(0.05, Math.max(0.001, dms / 1000)));
    gsap.ticker.add(this.tick);
    this.bind();
  }

  /** Index of a tile in turn order: the right end turns first, where the row above finished. */
  private order(r: R, j: number) { return r.n - 1 - j; }

  private frame(dt: number) {
    const vh = window.innerHeight;
    const now = performance.now();
    const doc = document.documentElement;
    const toEnd = doc.scrollHeight - (window.scrollY + vh);
    const endT = 1 - smooth(Math.min(1, Math.max(0, toEnd / (vh * 0.35))));
    for (const r of this.rows) {
      if (!r.on) {
        // Out of sight: forget any hand-turned letters and rest as stone.
        if (r.man.some((m) => m !== 0)) r.man.fill(0);
        continue;
      }
      const rect = r.el.getBoundingClientRect();
      const d = Math.abs(rect.top + rect.height / 2 - vh * 0.5) / vh;
      // Near the middle the row commits to turning; it cascades letter by letter in time,
      // starting from the end where the row above finished, so a row at rest is never half turned.
      let want = r.read ? d < 0.2 : d < 0.155;
      if (r.end && endT > 0.6) want = true;
      if (!this.ready) want = false;
      if (want !== r.read) {
        r.read = want;
        for (let j = 0; j < r.n; j++) {
          const k = this.order(r, j);
          r.turnAt[j] = now + (want ? k * 42 : (r.n - 1 - k) * 30);
        }
      }
      for (let j = 0; j < r.n; j++) {
        let target = (now >= r.turnAt[j]) === r.read ? 1 : 0;
        if (r.man[j] !== 0 && now >= r.at[j]) target = r.man[j] > 0 ? 1 : 0;
        if (this.stone) target = 0;
        target += r.peek[j] * (target > 0.5 ? -1 : 1);
        r.peek[j] *= Math.exp(-dt * 7);
        const a = K * (target - r.x[j]) - C * r.v[j];
        r.v[j] += a * dt;
        r.x[j] += r.v[j] * dt;
        const x = r.x[j];
        if (Math.abs(x - r.last[j]) < 0.0015) continue;
        r.last[j] = x;
        const s = Math.sin(Math.min(1, Math.max(0, x)) * Math.PI);
        r.tiles[j].style.transform = `translateZ(${(s * 0.32).toFixed(3)}em) rotateY(${(x * 180).toFixed(2)}deg)`;
        r.tiles[j].style.setProperty('--sh', s.toFixed(3));
      }
    }
  }

  /** Keyboard path: Enter on a display line turns all its mirrored rows, or turns them back. */
  toggleBlock(block: HTMLElement) {
    const now = performance.now();
    for (const r of this.rows) {
      if (r.block !== block) continue;
      const read = r.x.reduce((a, b) => a + b, 0) / r.n > 0.5;
      for (let j = 0; j < r.n; j++) {
        const k = read ? j : this.order(r, j);
        r.man[j] = read ? -1 : 1;
        r.at[j] = now + k * 45;
      }
    }
  }

  private rowAt(x: number, y: number) {
    const el = document.elementFromPoint(x, y);
    const row = el?.closest<HTMLElement>('.row[data-turn]');
    if (!row) return null;
    const r = this.rows.find((q) => q.el === row) ?? null;
    if (!r) return null;
    const cell = el!.closest<HTMLElement>('.cell');
    const j = cell ? r.tiles.indexOf(cell.querySelector('.tile') as HTMLElement) : -1;
    return { r, j };
  }

  private bind() {
    const root = this.root;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('a, button')) return;
      const hit = this.rowAt(e.clientX, e.clientY);
      let set: 1 | -1 = 1;
      if (hit && hit.j >= 0) {
        set = hit.r.x[hit.j] > 0.5 ? -1 : 1;
        hit.r.man[hit.j] = set;
        hit.r.at[hit.j] = performance.now();
      }
      const timer = window.setTimeout(() => {
        if (this.press && !this.press.moved) this.held = true;
      }, 380);
      this.press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), row: hit?.r ?? null, moved: false, set, timer };
    };
    const move = (e: PointerEvent) => {
      const hit = this.rowAt(e.clientX, e.clientY);
      const p = this.press;
      if (!p || p.id !== e.pointerId) {
        // Hover with a mouse: the letter under the pointer lifts a little, inviting a drag.
        if (e.pointerType === 'mouse' && hit && hit.j >= 0) hit.r.peek[hit.j] = Math.max(hit.r.peek[hit.j], 0.16);
        return;
      }
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) { p.moved = true; clearTimeout(p.timer); }
      if (hit && hit.j >= 0 && !this.held) {
        // Dragging across a line turns each letter you pass.
        hit.r.man[hit.j] = p.set;
        hit.r.at[hit.j] = performance.now();
      }
    };
    const up = (e: PointerEvent) => {
      const p = this.press;
      if (!p || p.id !== e.pointerId) return;
      clearTimeout(p.timer);
      const wasHeld = this.held;
      this.held = false;
      // A short tap on a row turns the whole row, one letter after another.
      if (!wasHeld && !p.moved && p.row && performance.now() - p.t < 380) {
        const r = p.row;
        const now = performance.now();
        for (let j = 0; j < r.n; j++) {
          const k = p.set > 0 ? this.order(r, j) : j;
          r.man[j] = p.set;
          r.at[j] = now + k * 40;
        }
      }
      this.press = null;
    };
    const cancel = (e: PointerEvent) => {
      if (this.press && this.press.id === e.pointerId) { clearTimeout(this.press.timer); this.press = null; }
      this.held = false;
    };
    const ctx = (e: Event) => { if (this.held) e.preventDefault(); };
    root.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    root.addEventListener('contextmenu', ctx);
    this.off.push(() => {
      root.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      root.removeEventListener('contextmenu', ctx);
    });
  }

  destroy() {
    gsap.ticker.remove(this.tick);
    this.io.disconnect();
    this.off.forEach((f) => f());
  }
}
