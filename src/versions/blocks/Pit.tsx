// The seven things in the drive, as blocks you can pick up and throw.
// matter.js runs the physics; the blocks themselves are plain DOM.
import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { DRIVE } from '@/content';
import { gsap, ScrollTrigger } from '@/lib/scroll';
import { coarse, still } from '@/lib/utils';

const TONES = ['paper', 'ink', 'blue', 'paper', 'ink', 'paper', 'blue'];

export function Pit() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current!;
    if (still) { el.classList.add('is-still'); return; }
    const chips = Array.from(el.querySelectorAll<HTMLElement>('.chip'));
    const { Engine, Bodies, Body, Composite, Mouse, MouseConstraint } = Matter;
    const engine = Engine.create({ gravity: { x: 0, y: 1.1 } });
    let W = el.clientWidth, H = el.clientHeight;
    const wall = (x: number, y: number, w: number, h: number) => Bodies.rectangle(x, y, w, h, { isStatic: true });
    let walls = [wall(W / 2, H + 40, W * 2, 80), wall(-40, H / 2, 80, H * 4), wall(W + 40, H / 2, 80, H * 4)];
    Composite.add(engine.world, walls);
    const bodies = chips.map((chip, i) => {
      const w = chip.offsetWidth, h = chip.offsetHeight;
      const body = Bodies.rectangle(W * (0.12 + 0.76 * ((i * 0.37) % 1)), -h - i * (h + 30), w, h, { restitution: 0.35, friction: 0.5, frictionAir: 0.012, chamfer: { radius: 6 } });
      Body.setAngle(body, (i % 2 ? 1 : -1) * (0.15 + 0.1 * i));
      return { chip, body, w, h };
    });
    let mouse: Matter.Mouse | null = null;
    if (!coarse) {
      // Dragging is for a mouse. The wheel is left alone so the page still scrolls over the pit.
      mouse = Mouse.create(el);
      const m = mouse as unknown as { mousewheel: EventListener };
      el.removeEventListener('wheel', m.mousewheel); el.removeEventListener('mousewheel', m.mousewheel); el.removeEventListener('DOMMouseScroll', m.mousewheel);
      Composite.add(engine.world, MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.18, damping: 0.1, render: { visible: false } } }));
    }
    let running = false, dropped = false;
    const tick = (_t: number, dms: number) => {
      if (!running) return;
      Engine.update(engine, Math.min(16.6, dms));
      for (const b of bodies) b.chip.style.transform = `translate(${b.body.position.x - b.w / 2}px, ${b.body.position.y - b.h / 2}px) rotate(${b.body.angle}rad)`;
    };
    gsap.ticker.add(tick);
    const st = ScrollTrigger.create({
      trigger: el, start: 'top 85%', end: 'bottom top',
      onToggle: (self) => { running = self.isActive; if (self.isActive && !dropped) { dropped = true; Composite.add(engine.world, bodies.map((b) => b.body)); el.classList.add('is-live'); } },
    });
    const onResize = () => {
      W = el.clientWidth; H = el.clientHeight;
      Composite.remove(engine.world, walls);
      walls = [wall(W / 2, H + 40, W * 2, 80), wall(-40, H / 2, 80, H * 4), wall(W + 40, H / 2, 80, H * 4)];
      Composite.add(engine.world, walls);
    };
    window.addEventListener('resize', onResize);
    return () => { gsap.ticker.remove(tick); st.kill(); window.removeEventListener('resize', onResize); if (mouse) Mouse.clearSourceEvents(mouse); Engine.clear(engine); };
  }, []);
  return (
    <div className="pit" ref={box} aria-hidden="true">
      {DRIVE.items.map((d, i) => <span className={`chip c-${TONES[i]}`} key={d.term}>{d.term}</span>)}
    </div>
  );
}
