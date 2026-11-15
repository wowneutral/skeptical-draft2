// Version 1's stage, as on the live site: the same photograph behind the same
// Floyd-Steinberg dither veil, the same censor over its eyes, and the same
// head redrawn in question marks. Here the scroll drives them.
import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import DitherVeil, { type DitherVeilHandle } from './site/DitherVeil';
import { createCensor, type Censor, type Eyes } from './site/censor';
import { createPortrait, type Portrait } from './site/portrait';
import { clamp, damp, smooth } from '@/lib/utils';
import { Field } from '@/components/three/Field';
import { Marks } from '@/components/three/Marks';
import { OrbitRig, view } from '@/components/three/OrbitRig';
import { stage } from '@/versions/orbit/stage';

// From the live site's subject.ts.
const SUBJECT = { src: '/head.jpg', aspect: 1400 / 1939, eyes: { x: 0.65, y: 0.243, w: 0.48, h: 0.105, angle: -10 } satisfies Eyes };
const MASK = { get x() { return view.mx; }, get y() { return view.my; } };

function layout() {
  const vw = window.innerWidth, vh = window.innerHeight;
  if (vw <= 820) {
    const height = Math.round(vh * 0.52), width = Math.round(height * SUBJECT.aspect);
    return { width, height, left: Math.round((vw - width) / 2 - width * 0.08), top: 56, stacked: true };
  }
  const height = Math.round(Math.min(vh * 0.96, (vw * 0.5) / SUBJECT.aspect)), width = Math.round(height * SUBJECT.aspect);
  return { width, height, left: Math.round(vw - width - vw * 0.03), top: Math.round(vh - height), stacked: false };
}

export default function SiteHead() {
  const veil = useRef<DitherVeilHandle>(null);
  const bar = useRef<HTMLCanvasElement>(null), tiles = useRef<HTMLCanvasElement>(null);
  const censor = useRef<Censor | null>(null), portrait = useRef<Portrait | null>(null);
  const [box, setBox] = useState(layout);
  const [gl, setGl] = useState(true);

  useEffect(() => {
    let t = 0;
    const onResize = () => { clearTimeout(t); t = window.setTimeout(() => setBox(layout()), 150); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t); };
  }, []);

  useEffect(() => {
    censor.current = createCensor(bar.current!, SUBJECT.eyes);
    portrait.current = createPortrait(tiles.current!, SUBJECT.src, SUBJECT.eyes);
    return () => { censor.current?.destroy(); portrait.current?.destroy(); censor.current = null; portrait.current = null; };
  }, [box.width, box.height]);

  useEffect(() => {
    // The head resolves when the loader leaves. While the four lines of the
    // manifesto light up, the question marks spread from the eyes over the
    // whole head, then let go again.
    let spread = 0, last = performance.now();
    const tick = () => {
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      veil.current?.setIntro(stage.reveal);
      censor.current?.setProgress(clamp((stage.reveal - 0.45) / 0.5));
      const target = stage.act === 1 ? smooth(clamp(stage.k / 0.75)) : 0;
      spread = damp(spread, target, 3.2, dt);
      portrait.current?.setSpread(spread < 0.002 ? 0 : spread);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <>
      <Canvas dpr={[1, 1.75]} camera={{ fov: 32, near: 0.1, far: 60, position: [3, 0.35, 5.6] }} gl={{ antialias: false, powerPreference: 'high-performance' }}>
        <color attach="background" args={['#050505']} />
        <Field show={stage} />
        <Marks show={stage} mask={MASK} count={70} />
        <OrbitRig />
      </Canvas>
      <div className={`site-head${box.stacked ? ' is-stacked' : ''}`} style={{ left: box.left, top: box.top, width: box.width, height: box.height }}>
        {gl
          ? <DitherVeil ref={veil} manualIntro onFail={() => setGl(false)} src={SUBJECT.src} fit="cover" pattern="floyd" pixelSize={2} inkColor="#050505" paperColor="#f0f0ec" contrast={1.15} revealRadius={120} softness={0.6} linger={1.2} />
          : <img className="still" src={SUBJECT.src} alt="" />}
        <canvas className="layer" ref={tiles} />
        <canvas className="layer" ref={bar} />
      </div>
    </>
  );
}
