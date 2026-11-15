// A small dotted globe (cobe) with one pin. It rocks gently around the pin and
// can be dragged to spin. Used wherever a version wants to show where a
// tournament was.
import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';
import { still } from '@/lib/utils';

type RGB = [number, number, number];
export function Globe({ lat, lng, label, base = [0.3, 0.33, 0.31], marker = [0.48, 0.94, 0.77], glow = [0.08, 0.1, 0.09], dark = 1, className }: { lat: number; lng: number; label: string; base?: RGB; marker?: RGB; glow?: RGB; dark?: number; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current!;
    let globe: ReturnType<typeof createGlobe> | null = null;
    try {
      const focus = Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let size = el.offsetWidth, drag: number | null = null, offset = 0, raf = 0, t = 0;
      globe = createGlobe(el, {
        devicePixelRatio: dpr, width: size * dpr, height: size * dpr, phi: focus, theta: 0.28, dark, diffuse: 1.2,
        mapSamples: 16000, mapBrightness: 5, baseColor: base, markerColor: marker, glowColor: glow,
        markers: [{ location: [lat, lng], size: 0.09 }],
      });
      const frame = () => {
        t += 0.006;
        size = el.offsetWidth;
        globe!.update({ phi: focus + offset + (still ? 0 : Math.sin(t) * 0.35), width: size * dpr, height: size * dpr });
        raf = requestAnimationFrame(frame);
      };
      frame();
      const down = (e: PointerEvent) => { drag = e.clientX - offset * 200; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; };
      const move = (e: PointerEvent) => { if (drag !== null) offset = (e.clientX - drag) / 200; };
      const up = () => { drag = null; el.style.cursor = 'grab'; };
      el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      return () => { cancelAnimationFrame(raf); globe?.destroy(); el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
    } catch { el.style.display = 'none'; }
  }, [lat, lng, base, marker, glow, dark]);
  return <canvas ref={canvas} className={className} role="img" aria-label={label} style={{ width: '100%', aspectRatio: '1', cursor: 'grab', touchAction: 'pan-y' }} />;
}
